// Shared body-weight trend + maintenance math.
//
// This used to live entirely inside weight.js. Fuel needs the same maintenance
// number to draw the cut / maintain / gain zones on the calorie bar, and two
// copies of the same arithmetic is exactly how two screens start disagreeing
// with each other. So it lives here, as pure functions over the raw nodes.
//
// Imports store.js (date keys), ui.js (number helpers) and weightmodel.js (the
// normalisation), none of which import back, so it can never create a cycle.

import { todayKey } from './store.js';
import { parseKey } from './ui.js';
import { refreshModel, modelState, maintenanceFromModel, STALE_DAYS,
         adjustedDays, peakOffset, trendWeight, PRIOR,
         keyDaysBetween } from './weightmodel.js';

// Re-exported so callers only ever import from one place. weightmodel.js owns
// the normalisation; this file stays the public face of "what does the scale
// mean".
export { refreshModel, modelState, adjustedDays, peakOffset, trendWeight, PRIOR };

/* ---------- weight trend ---------- */

// lb is coerced and a reading that is not a finite number above 0 is left
// out: a string "200" used to concatenate into a daily mean of 90,090.5, and a
// 0 or a -5 dragged avg7 to 154 (P5 A9, F39). No writer makes one today; an
// importer one day might. Stored entries are untouched.
export function sortedEntries(entries) {
  return Object.entries(entries || {})
    .map(([id, e]) => ({ id, ...e, lb: Number(e && e.lb) }))
    .filter(e => Number.isFinite(e.lb) && e.lb > 0)
    .sort((a, b) => a.t - b.t);
}

// mean weight per calendar day
export function dailyMeans(entries) {
  const by = {};
  sortedEntries(entries).forEach(e => {
    const k = todayKey(new Date(e.t));
    (by[k] = by[k] || []).push(e.lb);
  });
  return Object.entries(by)
    .map(([d, lbs]) => ({ d, lb: lbs.reduce((s, x) => s + x, 0) / lbs.length }))
    .sort((a, b) => a.d < b.d ? -1 : 1);
}

// trailing 7-day moving average at each day
export function movingAvg(days) {
  return days.map((pt, i) => {
    const t0 = parseKey(pt.d).getTime() - 6.5 * 864e5;
    const win = days.filter((q, j) => j <= i && parseKey(q.d).getTime() >= t0);
    return { d: pt.d, lb: win.reduce((s, x) => s + x.lb, 0) / win.length };
  });
}

export function windowAvg(days, fromAgo, toAgo) {
  const now = Date.now();
  const win = days.filter(p => {
    const t = parseKey(p.d).getTime();
    return t <= now - toAgo * 864e5 && t > now - fromAgo * 864e5;
  });
  if (win.length < 3) return null;
  return win.reduce((s, x) => s + x.lb, 0) / win.length;
}

export function weightStats(entries) {
  const list = sortedEntries(entries);
  const days = dailyMeans(entries);
  const latest = list[list.length - 1] || null;
  const avg7 = windowAvg(days, 7, 0);
  const prev7 = windowAvg(days, 14, 7);
  const rateWk = avg7 != null && prev7 != null ? avg7 - prev7 : null;
  const d30 = days.filter(p => parseKey(p.d).getTime() > Date.now() - 30 * 864e5);
  const change30 = d30.length >= 2 ? d30[d30.length - 1].lb - d30[0].lb : null;
  return { latest, avg7, rateWk, change30, days };
}

/* ---------- maintenance (TDEE) ----------
   Average logged intake, corrected by which way the scale is moving.
   ~3500 kcal per pound, so a pound a week is ~500 kcal/day.
   Today is excluded — a half-logged day drags the average down. */

export const TDEE_MIN_DAYS = 7;

/* The normalised model is preferred whenever it has enough to say something.
   It removes the composition bias — the one where logging more evening
   weigh-ins one week than the last reads as weight gained — which is worth
   ~150 kcal/day routinely and far more when the habit really shifts.

   When it can't answer (too few weigh-ins, no food logged, a cold start) this
   falls back to the original arithmetic rather than refusing. Degrading to the
   old answer is fine. A confident wrong answer is not.

   rack-v64 (P5 A1): a model answer that has not earned its place yet is held
   back, not shown: { ...m, tdee: null, held: <the number>, need: [...] }.
   Every screen prints `need` as "Needs …" and effectiveMaint keeps setup (or
   nothing) in force. A held model answer never falls back to the legacy
   arithmetic, which has no gate at all. */
export function maintenance(weightEntries, daySummaries) {
  const m = maintenanceFromModel(daySummaries);
  // Any model answer, with a number or without one (short of logged days),
  // says what it needs in its own words (P5 A6).
  if (m) {
    const need = measuredNeeds(m);
    // A slope whose newest point is days old is being read off the line past
    // the data, against an intake average that kept moving. When weighing
    // stops the number is "not yet" again (P5 A2).
    // When the newest RAW reading is recent and only the screened trend is
    // old, the weigh-ins exist and sit far off the line (after a trip, say):
    // "N days ago" would be untrue, so it says what is actually missing (A7).
    if (m.trendAge != null && m.trendAge > STALE_DAYS) {
      need.unshift(m.trendRawAge != null && m.trendRawAge <= STALE_DAYS
        ? 'a few more weigh-ins (the latest ones are far off the trend)'
        : 'a weigh-in (the last one was ' + m.trendAge + ' days ago)');
    }
    // `held` is the number the gate kept back, or null when there was none.
    return need.length ? { ...m, tdee: null, held: m.tdee != null ? m.tdee : null, need, model: true } : { ...m, model: true };
  }
  // The legacy arithmetic is still reached before the first fit. It meets the
  // same range check: a 450 or a 9,000 from it is no more a maintenance
  // number than one from the model.
  const l = legacyMaintenance(weightEntries, daySummaries);
  if (l.tdee != null && !(l.tdee >= MEASURED_RANGE[0] && l.tdee <= MEASURED_RANGE[1])) {
    return { ...l, tdee: null, held: l.tdee, need: ['a look at recent weigh-ins and food entries'], model: false };
  }
  return { ...l, model: false };
}

/* ---------- when a measured number has earned its place ----------
   The model can answer from 4 day-points and 7 logged days. Simulated (P5 VA),
   that first answer lands on day 7 and is worse than the setup guess for about
   four people in five: a week's slope times 3,500 carries the glycogen water a
   diet starts with, the first un-normalised weigh-in and plain scale noise.
   One sentence above says it: a confident wrong answer is not fine. So the
   measured number waits until the points cover two weeks and the value is
   one a living adult can have. The point and logged-day counts stay at the
   model's own 4 and 7: higher bars hid numbers from every-5th-day weighers
   and 3-4-day-a-week loggers that were as accurate as the ones kept, and
   made them blink (P5 XR R3/R4). No SE bound: the slope SE swings across any
   threshold from one morning to the next (P5 VA: an SE<=250 gate blinked a
   mature number off and on ~5 times per REALISTIC person), and a number that
   comes and goes is its own kind of wrong. The 1,000 lower bound is P5
   DECISION D-c's default (DECISIONS-FOR-MICAH #9); each constant is a named
   export so it can move later. Pure: reads only the estimate it is handed. */
export const MEASURED_MIN_SPAN   = 14;    // days between the oldest and newest day-point in the fit
export const MEASURED_MIN_POINTS = 4;     // day-points in the fit (the model's own minimum; P5 XR R4)
export const MEASURED_MIN_LOGGED = 7;     // logged days under the intake average (the model's own minimum; P5 XR R3)
export const MEASURED_RANGE      = [1000, 6000];

export function measuredNeeds(m) {
  const need = [];
  // Rounded: day-points sit at local noon, so a DST week is 13.96 or 14.04 days.
  const span = Math.round(Number(m.trendSpan) || 0);
  if (span < MEASURED_MIN_SPAN) {
    const n = Math.ceil(MEASURED_MIN_SPAN - span);
    need.push(n + ' more day' + (n === 1 ? '' : 's') + ' of weigh-ins');
  } else if ((Number(m.trendDays) || 0) < MEASURED_MIN_POINTS) {
    need.push('a few more weigh-ins');
  }
  if ((Number(m.days) || 0) < MEASURED_MIN_LOGGED) {
    const n = MEASURED_MIN_LOGGED - (Number(m.days) || 0);
    need.push(n + ' more day' + (n === 1 ? '' : 's') + ' of food logging');
  }
  if (!need.length && !(m.tdee >= MEASURED_RANGE[0] && m.tdee <= MEASURED_RANGE[1])) {
    need.push('a look at recent weigh-ins and food entries');
  }
  return need;
}

/* The weekly rate to show the user: the model's when it has one, because it is
   measured over 21 days with the intraday noise taken out rather than
   differenced between two 7-day means. */
export function trendRate(weightEntries) {
  const m = modelState();
  if (m && m.rateWk != null) {
    return { rateWk: m.rateWk, seWk: m.rateSeWk, days: m.trendDays, spanDays: m.trendSpanDays,
             // Whole days since the newest day-point in the fit, today's key minus
             // its key (as maintenanceFromModel's trendAge). Coach's energy read uses it.
             ageDays: m.trendLastKey ? keyDaysBetween(m.trendLastKey, todayKey()) : null, model: true };
  }
  const s = weightStats(weightEntries);
  return { rateWk: s.rateWk, seWk: null, days: null, model: false };
}

function legacyMaintenance(weightEntries, daySummaries) {
  const s = weightStats(weightEntries);
  const today = todayKey();
  // finished days only: see weightmodel.js maintenanceFromModel
  const calDays = Object.entries(daySummaries || {})
    .filter(([d, v]) => d < today && v && v.cal > 0)
    .filter(([d]) => parseKey(d).getTime() > Date.now() - 15 * 864e5);

  const out = {
    tdee: null,
    avgIntake: null,
    days: calDays.length,
    rateWk: s.rateWk,
    need: []
  };

  if (calDays.length < TDEE_MIN_DAYS) {
    const n = TDEE_MIN_DAYS - calDays.length;
    out.need.push(n + ' more day' + (n === 1 ? '' : 's') + ' of food logging');
  }
  if (s.rateWk == null) out.need.push('two weeks of weigh-ins');
  if (out.need.length) return out;

  out.avgIntake = calDays.reduce((sum, [, v]) => sum + v.cal, 0) / calDays.length;
  out.tdee = Math.round((out.avgIntake - s.rateWk * 500) / 10) * 10;
  out.se = null;
  return out;
}

/* ---------- which maintenance number is in force ----------

   Three screens quote a maintenance number and all three used to hand-copy the
   precedence, which is how Fuel, You and Weight end up disagreeing about the
   single number the whole app is built on. This is that precedence, once.

   The change it carries is that a number SETUP guessed and a number the person
   TYPED stop meaning the same thing. Both live in food/targets.maint; what
   tells them apart is the optional `maintSrc`:

     'pinned'  a number the person chose. It always wins, forever.
     'setup'   the Mifflin-St Jeor guess onboarding wrote so day one was not a
               blank. It is a placeholder, and it steps aside the moment the
               model can answer from the person's own data.
     absent    every account that predates this key. Treated as PINNED, so no
               existing account's number moves on its own — the app cannot tell
               a stored guess from a stored choice, and guessing wrong would
               move a number somebody is eating to. They are asked instead.

   A setup number EXPIRES rather than being rewritten: nothing is deleted from
   the database when the estimate arrives, the read side simply stops preferring
   it. So if the model later loses its estimate — a fortnight without logging —
   the setup number is what shows again, which is better than showing nothing.

   `est` is maintenance()'s return, or null. A tdee of 0 is not a maintenance
   number and never was: both readers this replaces tested it for truthiness,
   and `> 0` is what keeps that true. Pure — no I/O, no clock, no imports. */
export function effectiveMaint(targets, est) {
  const t = targets || {};
  const maint = Number(t.maint);
  const stored = Number.isFinite(maint) && maint > 0;

  if (stored && t.maintSrc !== 'setup') {
    return { cal: Math.round(maint), source: 'pinned', auto: false };
  }
  const tdee = est ? Number(est.tdee) : NaN;
  if (Number.isFinite(tdee) && tdee > 0) {
    return { cal: Math.round(tdee), source: 'measured', auto: true };
  }
  if (stored) return { cal: Math.round(maint), source: 'setup', auto: false };
  return null;
}

/* ---------- calorie zones ----------
   One maintenance number turns into three bands: under it you're cutting,
   within a collar of it you're holding, over it you're gaining.
   The collar is ~8% of maintenance, rounded to 25 and held between 150 and
   200. At 200 a day, the edge eaten every day is 0.4 lb a week, and a
   narrower band would draw as a sliver you can't read.

   The cap was 250 until v58 (Micah's decision, 25 Sep). Rack's own Bulking
   target is maintenance + 250, so from a maintenance of 2,970 up it landed on
   the band's top edge and the bar called a bulk holding. At 200, Bulking
   (+250) and Cutting (−500) land in their own colours at every maintenance,
   unless the floor (protein and fat plus 100 g of carbs) lifts a cut. */

export function calorieZones(maint) {
  if (!maint || maint <= 0) return null;
  const band = Math.min(200, Math.max(150, Math.round(maint * 0.08 / 25) * 25));
  return {
    maint,
    band,
    cutTop: maint - band,      // first tick: top of the deficit
    gainFrom: maint + band     // second tick: gaining past here
  };
}

export function zoneOf(cal, z) {
  if (!z) return null;
  if (cal < z.cutTop) return 'cut';
  if (cal <= z.gainFrom) return 'maintain';
  return 'gain';
}


/* ---------- auto targets ----------
   Macros that follow the scale instead of sitting where you last typed them.

   Protein and fat are grams per pound of bodyweight, so they track the trend
   weight — not the latest weigh-in, which swings by pounds depending on what
   time of day it was taken. Calories are maintenance shifted by the goal rate
   (3500 kcal per pound, so a pound a week is 500 a day). Carbs stay what they
   have always been: the remainder.

   The floor is not decoration. Because carbs are the remainder, calories
   falling below protein×4 + fat×9 doesn't produce a warning — it silently
   produces zero carbs, because carbsTarget() clamps at 0. So the floor is
   whichever is higher: the number he set, or protein and fat plus enough
   carbohydrate to train on. */

export const MIN_CARB_G = 100;

/* ---------- safety floors ----------
   The floor above keeps the macros possible. It says nothing about whether a
   number is safe to eat, and with the per-pound boxes at 0 it was 400 kcal,
   which Rack wrote and toasted. Below 800 a day is a very-low-calorie diet,
   which NIDDK, AHA/ACC/TOS 2013 and the NHS all put under medical supervision,
   so nothing Rack computes goes under it, whatever the boxes say.

   `who` is { sex, age } off the profile (whoOf, below), or null for an
   account that never wrote one (a skipped setup, or one older than
   onboarding). Unknown reads as the lower floor: a floor set too high costs a
   slower cut, one set too low is not a call to make for somebody who did not
   say. A target somebody TYPES is theirs and is not floored here. */
export const SAFE_MIN_KCAL = 800;
/* Above 800, the usual line for dieting without supervision is 1,200 a day for
   women and 1,500 for men (AHA/ACC/TOS 2013 typical prescriptions, not
   physiological minimums). 'x' takes the lower one. The men's 1,500 is P5
   DECISION XR-D1's default (DECISIONS-FOR-MICAH #1); it is a named export so
   it can move. */
export const SEX_MIN_KCAL = { f: 1200, x: 1200, m: 1500 };
/* Under 18 nothing here plans a deficit. A teenager is still growing, the
   adult equations underestimate what one burns (setup already clamps age at
   14 for that reason), and a "cut" for a 14-year-old girl landed at 1,190
   against the 1,800 the Dietary Guidelines give a sedentary girl that age
   (DGA 2010 Appendix 6: girls 1,600 at 12-13, 1,800 at 14-17; boys 1,800 /
   2,000; 'x' takes the girls' row). So the goal rate cannot go below zero and
   the floor is that number. P5 DECISION XR-D2's default (DECISIONS #2). */
export const ADULT_AGE = 18;
const DGA_MIN_KCAL = { f: [1600, 1800], x: [1600, 1800], m: [1800, 2000] };   // [12-13, 14-17]

export function safeFloor(who) {
  const sex = who && (who.sex === 'f' || who.sex === 'm') ? who.sex : 'x';
  const age = who && Number.isFinite(who.age) ? who.age : null;
  let kcal = SEX_MIN_KCAL[sex];
  const minor = age != null && age < ADULT_AGE;
  if (minor) kcal = Math.max(kcal, DGA_MIN_KCAL[sex][age <= 13 ? 0 : 1]);
  return { kcal: Math.max(SAFE_MIN_KCAL, kcal), minor };
}

/* The one rule for building `who` off the profile node, so every screen (and
   native) reads sex and age the same way: age is this calendar year minus the
   birth year, the way setup's estimate takes it. No profile is null. */
export function whoOf(profile, year) {
  return profile ? { sex: profile.sex, age: profile.birthYear > 0 ? year - profile.birthYear : null } : null;
}

export function autoTargets(goal, maint, lb, who) {
  if (!goal || !(maint > 0) || !(lb > 0)) return null;
  const safe = safeFloor(who);

  const p = Math.max(0, Math.round(lb * (goal.pPerLb || 0)));
  const f = Math.max(0, Math.round(lb * (goal.fPerLb || 0)));

  let rate = goal.rateWk || 0;
  if (safe.minor) rate = Math.max(0, rate);
  const wanted = Math.round((maint + rate * 500) / 10) * 10;
  const hard = Math.ceil((p * 4 + f * 9 + MIN_CARB_G * 4) / 10) * 10;
  const floor = Math.max(goal.floor > 0 ? goal.floor : 0, hard, safe.kcal);

  const cal = Math.max(wanted, floor);
  return {
    cal, p, f,
    c: Math.max(0, Math.round((cal - p * 4 - f * 9) / 4)),
    wanted, floor, hard,
    floored: cal > wanted,
    // Which floor held it, so the note can say which: the safety one is never
    // something to work around.
    safe: safe.kcal,
    safeHeld: cal > wanted && cal === safe.kcal && safe.kcal > hard,
    // The person's own "Never go below" number held it, not the maths (P5 XC X3).
    userHeld: cal > wanted && goal.floor > 0 && cal === goal.floor && goal.floor > Math.max(hard, safe.kcal),
    minor: safe.minor,
    // A minor asked for a cut and got maintenance (or more): the deficit was
    // dropped whether or not the Dietary Guidelines line also held it (XC X7).
    minorHeld: safe.minor && (goal.rateWk || 0) < 0,
    lb: Math.round(lb * 10) / 10,
    maint
  };
}

/* ---------- the rate a target plans ----------
   Every label used to quote the GOAL rate ("−1 lb/wk") whatever was written,
   so a floored cut read −1 lb/wk while the number planned −0.2, or a gain.
   This reads it back off the two numbers on screen instead (3,500 kcal a
   pound, so 500 a day is a pound a week), to the nearest 0.05 lb. Within a
   twentieth of a pound either way it is maintenance (P5 C2). */
export function plannedRate(cal, maint) {
  if (!(cal > 0) || !(maint > 0)) return null;
  const r = Math.round((cal - maint) / 500 * 20) / 20;
  return r === 0 ? 0 : r;    // no "−0"
}
