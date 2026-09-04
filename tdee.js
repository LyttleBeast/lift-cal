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
import { refreshModel, modelState, maintenanceFromModel,
         adjustedDays, peakOffset, trendWeight, PRIOR } from './weightmodel.js';

// Re-exported so callers only ever import from one place. weightmodel.js owns
// the normalisation; this file stays the public face of "what does the scale
// mean".
export { refreshModel, modelState, adjustedDays, peakOffset, trendWeight, PRIOR };

/* ---------- weight trend ---------- */

export function sortedEntries(entries) {
  return Object.entries(entries || {})
    .map(([id, e]) => ({ id, ...e }))
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
   old answer is fine. A confident wrong answer is not. */
export function maintenance(weightEntries, daySummaries) {
  const m = maintenanceFromModel(daySummaries);
  if (m && m.tdee != null) return { ...m, model: true };
  return { ...legacyMaintenance(weightEntries, daySummaries), model: false };
}

/* The weekly rate to show the user: the model's when it has one, because it is
   measured over 21 days with the intraday noise taken out rather than
   differenced between two 7-day means. */
export function trendRate(weightEntries) {
  const m = modelState();
  if (m && m.rateWk != null) {
    return { rateWk: m.rateWk, seWk: m.rateSeWk, days: m.trendDays, model: true };
  }
  const s = weightStats(weightEntries);
  return { rateWk: s.rateWk, seWk: null, days: null, model: false };
}

function legacyMaintenance(weightEntries, daySummaries) {
  const s = weightStats(weightEntries);
  const today = todayKey();
  const calDays = Object.entries(daySummaries || {})
    .filter(([d, v]) => d !== today && v && v.cal > 0)
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

/* ---------- goal direction ----------
   Which way is "better" for bodyweight: -1 on a cut, +1 on a bulk, 0 holding,
   null when the account has not said. The goal stated at onboarding is written
   into targets.auto.rateWk whether or not auto targets are on, so that is the
   first answer; failing that, a calorie target well below maintenance is a
   cut and one well above it is a gain. Shared here because You, Weight and
   Fuel all colour a change in weight by it, and three private copies is how
   a deliberate bulk ends up green on one tab and amber on the next. */
export function goalDir(targets, maintCal) {
  const a = targets && targets.auto;
  if (a && Number.isFinite(a.rateWk) && a.rateWk !== 0) return a.rateWk < 0 ? -1 : 1;
  if (maintCal > 0 && targets && targets.cal > 0) {
    if (targets.cal < maintCal - 100) return -1;
    if (targets.cal > maintCal + 100) return 1;
    return 0;
  }
  return null;
}

/* ---------- calorie zones ----------
   One maintenance number turns into three bands: under it you're cutting,
   within a collar of it you're holding, over it you're gaining.
   The collar is ~8% of maintenance, clamped so it never gets silly. Roughly
   200 kcal a day either way is under half a pound a week — that really is
   holding, and a narrower band would draw as a sliver you can't read. */

export function calorieZones(maint) {
  if (!maint || maint <= 0) return null;
  const band = Math.min(250, Math.max(150, Math.round(maint * 0.08 / 25) * 25));
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

export function autoTargets(goal, maint, lb) {
  if (!goal || !(maint > 0) || !(lb > 0)) return null;

  const p = Math.max(0, Math.round(lb * (goal.pPerLb || 0)));
  const f = Math.max(0, Math.round(lb * (goal.fPerLb || 0)));

  const wanted = Math.round((maint + (goal.rateWk || 0) * 500) / 10) * 10;
  const hard = Math.ceil((p * 4 + f * 9 + MIN_CARB_G * 4) / 10) * 10;
  const floor = Math.max(goal.floor > 0 ? goal.floor : 0, hard);

  const cal = Math.max(wanted, floor);
  return {
    cal, p, f,
    c: Math.max(0, Math.round((cal - p * 4 - f * 9) / 4)),
    wanted, floor, hard,
    floored: cal > wanted,
    lb: Math.round(lb * 10) / 10,
    maint
  };
}
