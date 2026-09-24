// Coach's targets — what to put on the bar next time, worked out from his own
// sessions.
//
// Ship one taught Coach to read the log, ship two to build a workout from it,
// ship three to say what comes next in the gym. This is the thing every paid
// lifting app does and Rack did not: per lift, a weight and reps for next time.
// Deterministic, from the account's own history, and fenced harder than
// anything else in Coach, because it is the first time Coach names a weight to
// put on a bar.
//
// A WRONG NUMBER IS WORSE THAN NO NUMBER, at its sharpest here:
//
//   EVERY WEIGHT NAMED IS ONE HE LOGGED ON THIS LIFT, OR AT MOST TWO OF THIS
//   LIFT'S OWN STEPS FROM THE LAST TOP LOAD — or, coming back after a layoff
//   only, a whole number of steps BELOW it, because lighter is the safe way.
//   Never a percentage of anything, never a plate combination nobody chose,
//   and never a number stepped from a load that is itself off the grid.
//   WHEN THE STEP IS UNKNOWN, NO NUMBER. "The next setting up" is a complete,
//   honest target; a guessed 2.5 on a kilo dumbbell rack is a dumbbell that
//   may not exist.
//   A TARGET WITH NO NUMBER KEEPS LAST TIME'S WEIGHT AS THE GHOST. Ticking a
//   set adopts its ghost (workout.js tickSet), and an empty weight box is
//   recorded as '0' — a bodyweight set — so a blank ghost on a loaded lift
//   would put a wrong number in the log itself.
//   SILENCE IS ALWAYS AVAILABLE. A defer that quotes last time is a correct
//   answer, never a failure.
//
// THE UNITS RULE. Storage is pounds forever; every COMPARISON here happens in
// the display unit, because that is the unit the plates are in, and every
// printed weight goes through units.js. A step is learned and printed in the
// display unit, so "the next 5 lb" never appears on a kilo account.
//
// What lives where. The builder's `note` under an exercise stays a readout and
// is coach-build.js's; the prescription is a separate field, `target`, and
// this file is its only author. coach-live.js — mid-session — names no weight
// at all, and nothing here changes that.
//
// STATUS IS COMPUTED, NOT SHOWN. Each lift's progressing / holding / stalled /
// declining is worked out because the confirmation dial and the battery need
// it; no sentence prints it tonight. A stall readout with nothing beside it to
// interpret it is the defect v43 fixed, and stage two puts it next to its
// context.
//
// PURE, and copied into the native tree verbatim (src/pure/coach-prog.js). No
// reads, no DOM, no module state, and no clock: `now` is an argument. Imports
// coach-goal.js (the dials), units.js, exercises.js (group words), coach-tags.js
// (compound or isolation, and the movement pattern) and the session MATH of
// analytics.js — the merge invariant, what a working set is and the same e1rm
// the set row prints, none of which may be restated here. coach-build.js
// imports this; nothing imports back.
//
// tools-check/coach-prog.mjs is the battery: every row of the brief's table,
// scored ok / miss / wrong, and thousands of generated histories per unit
// against the properties the rules above promise.

import { e1rm, isWorking, mergeSessionExercises } from './analytics.js';
import { wOut, wIn, fmtSetLoad, unitW, labelW, labelRate } from './units.js';
import { GROUPS } from './exercises.js';
import { tagsFor } from './coach-tags.js';
import { dialsFor } from './coach-goal.js';

const DAY = 864e5;

/* ---------- the numbers, each with its reason ----------
   None of these is ever printed as a threshold. */

// The window a rep range and a slope are read over — the same twelve weeks
// every other derivation in Coach uses.
const WINDOW_DAYS = 84;
// A top load that moves more than this between two sessions is a new
// programme, not a jump: it restarts the range and is never learned as a step.
const SHAPE_JUMP = 0.15;
// A gap longer than three weeks is a layoff. A change across one is the way
// back, not a new programme, and a slope restarts after it.
const GAP_DAYS = 21;
// Top-set reps six or more apart (12, 5, 11) are a logging slip or a set that
// went badly for a reason Coach cannot see. Either way, no basis for a number.
const ERRATIC_SPREAD = 6;
// THE TWO CLOCKS (Micah, 23 Sep 2026). The muscle group's clock says how far
// back to start; the lift's own clock only holds it. Twelve days off this lift
// alone: no jump the first time back. The group off 15 to 30 days: start near
// 90% of the last top set; past 30, near 80%. The detraining evidence is thin,
// so these lean cautious on purpose.
const LIFT_HOLD_DAYS = 12;
const GROUP_NEAR_DAYS = 15;
const GROUP_FAR_DAYS = 30;
const REENTER_NEAR = 0.9;
const REENTER_FAR = 0.8;
// Coming back, at most six of his own steps below the last top set. Past
// that, no number: "lighter than last time".
const REENTER_MAX_STEPS = 6;
// With no step learned, a reduction looks for a load he has logged within 15%
// below — a plate or two, not a new programme.
const REDUCE_FLOOR = 0.85;
// A default band with a jump bigger than a tenth of the weight (5 lb on a
// 15-lb raise) banks two more reps before the jump, or the next session falls
// off the bottom of the range.
const MICRO_SHARE = 0.10;
const MICRO_REPS = 2;
// Two reps clear of the top, on a lower-body barbell lift, may earn two jumps
// when the dials allow it.
const TWO_STEP_REPS = 2;
// Estimated maxes past twelve reps are the least reliable number in the app,
// so a longer set counts as twelve: a floor under what he could do, never the
// guess a 20-rep estimate would be.
const E1RM_MAX_REPS = 12;
// The slope reads the last eight sessions; a slower one than 0.25%/wk over
// eight is close to a ceiling, and 1%/wk or more is climbing fast.
const SLOPE_POINTS = 8;
const SLOPE_SLOW = 0.25;
const SLOPE_FAST = 1.0;
// A status needs four sessions spanning three weeks: someone benching three
// times a week has four sessions in nine days, and nine days is no plateau.
const STATUS_POINTS = 4;
const STATUS_SPAN_DAYS = 21;
// A new best is 1% over every earlier point; a decline has to clear 5% or
// one and a half times his own session-to-session noise, whichever is bigger.
const NEW_BEST = 0.01;
const DECLINE_PCT = 5;
const SIGMA_POINTS = 10;
const SIGMA_MIN = 5;
const SIGMA_DEFAULT = 3;
// The grid a load has to sit on to be stepped from: half a unit. 0.5 rather
// than 0.25 because 210 lb is 95.254 kg, and 95.25 kg is not a weight anyone
// loads; 0.01 because every stored weight is rounded to two decimals.
const GRID = 0.5;
const GRID_TOL = 0.01;

/* THE DEFAULT STEPS — a labelled training starting point, used only until his
   own log shows one twice (Micah's 23 Sep answer: yes, for training only).
   NSCA's increments for less-trained lifters: lower body 5–10 lb, upper body
   2–5 lb, and 5 lb is the smallest jump standard 2.5-lb plates make. A pound
   dumbbell rack goes in fives; a kilo rack goes in 2 or 2.5 depending on the
   gym, so a guess would be a dumbbell that may not be there. Machines, cables,
   pins and bands vary too much to guess at all. */
function defaultStep(equipment, lowerBody, u) {
  if (u === 'kg') {
    if (equipment === 'barbell') return lowerBody ? 5 : 2.5;
    return null;
  }
  if (equipment === 'barbell') return lowerBody ? 10 : 5;
  if (equipment === 'dumbbell') return 5;
  return null;
}

/* ================================================================
   SMALL THINGS
   ================================================================
   A private copy of coach.js's noon-anchored day count, for the reason every
   Coach file keeps its own: this module is copied on its own and must not
   reach sideways. A clock change cannot turn a seven-day gap into six. */
function noon(ms) { const d = new Date(ms); d.setHours(12, 0, 0, 0); return d.getTime(); }
function daysBetween(fromMs, toMs) { return Math.round((noon(toMs) - noon(fromMs)) / DAY); }
function dayKey(ms) {
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/* A session's date, the way the app prints one ("Tue, Sep 16"), worked out in
   UTC from the date KEY so the day it was filed under is the day this names in
   every time zone. The same spelling coach-build.js uses. */
const DAY_NAMES = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const MONTH_NAMES = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
function dayLabel(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), dd = Number(m[3]);
  const wd = new Date(Date.UTC(y, mo - 1, dd)).getUTCDay();
  return DAY_NAMES[wd] + ', ' + MONTH_NAMES[mo - 1] + ' ' + dd;
}
// "today", "yesterday", "on Tue, Sep 16" — or nothing, rather than a wrong day.
function onDay(e) {
  if (e.daysAgo === 0) return ' today';
  if (e.daysAgo === 1) return ' yesterday';
  const l = dayLabel(e.date);
  return l ? ' on ' + l : '';
}
// Exported for coach-build.js: the builder says which session a target was
// built from, when it is not the one the proposal is.
export function sessionDay(date, daysAgo) {
  if (daysAgo === 0) return 'today’s session';
  if (daysAgo === 1) return 'yesterday’s session';
  const l = dayLabel(date);
  return l ? 'your ' + l + ' session' : 'your last session of it';
}

const r2 = x => Math.round(x * 100) / 100;
function median(xs) {
  const v = xs.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
const plural = (n, word) => n + ' ' + word + (Number(n) === 1 ? '' : 's');
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
const word = n => WORDS[n] || String(n);
const Word = n => { const w = word(n); return w.charAt(0).toUpperCase() + w.slice(1); };
const groupWord = g => (GROUPS[g] && GROUPS[g].label ? GROUPS[g].label.toLowerCase() : null);
const onGrid = L => Number.isFinite(L) && Math.abs(L - Math.round(L / GRID) * GRID) < GRID_TOL;
const repsOf = s => parseInt(s.r, 10);

/* A number in the display unit, as a sentence prints it: two decimals at most,
   trailing zeros off. Used for a STEP, which is learned in the display unit
   already, so nothing is converted here — a conversion would be the second. */
const num = x => String(r2(x)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

/* ================================================================
   1.  EXPOSURES
   ================================================================
   One per session that contains the lift, after the merge invariant — one
   entry per exId per session, sets concatenated in order — so a duplicated
   block is one exposure and not two. Two sessions on one day are two
   exposures, ordered by when they started. The input order does not matter:
   it is sorted first, with a total key, so a shuffled log is the same answer.

   `sets` are the working sets — not a warm-up, at least one rep — and `allSets`
   every set as logged, warm-ups included, because the targets for next time
   are one per set he did last time. A session with no working set of the lift
   is not an exposure to it.

   Takes session records, or coach.js's shaped sessions (which carry the
   record as `session`), so the builder hands over its whole log as it is. */
const copySet = s => ({
  w: s && s.w != null ? String(s.w) : '',
  r: s && s.r != null ? String(s.r) : '',
  type: (s && s.type) || 'N'
});

export function exposuresFor(sessions, exId) {
  if (typeof exId !== 'string' || !exId) return [];
  const out = [];
  (Array.isArray(sessions) ? sessions : []).forEach(s => {
    if (!s || typeof s !== 'object') return;
    const rec = s.session && typeof s.session === 'object' ? s.session : s;
    const at = Number.isFinite(s.startedAt) ? s.startedAt : rec.startedAt;
    if (!Number.isFinite(at)) return;
    const ex = mergeSessionExercises(rec.exercises).find(e => e && e.exId === exId);
    if (!ex) return;
    const allSets = (ex.sets || []).filter(Boolean).map(copySet);
    const sets = allSets.filter(x => isWorking(x) && repsOf(x) >= 1);
    if (!sets.length) return;
    out.push({ startedAt: at, date: String(rec._date || s.date || dayKey(at)), sets, allSets,
               key: String(rec.id || '') });
  });
  out.sort((a, b) => a.startedAt - b.startedAt || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return out.map(e => ({ startedAt: e.startedAt, date: e.date, sets: e.sets, allSets: e.allSets }));
}

/* ================================================================
   2.  ONE EXPOSURE, READ
   ================================================================
   The top load T is the heaviest load in the display unit across the working
   sets that are not drops — for an assisted lift, the LIGHTEST, because the
   least assistance is the hardest set. The top sets are the ones at T; k of
   them; R their reps. A drop set is lighter by definition and never carries
   progression. An exposure whose every working set is a drop has no top load
   and is left out of the reading altogether. */
function readExposure(e, u, assisted, now) {
  const all = (Array.isArray(e.allSets) && e.allSets.length ? e.allSets : e.sets || []).map(copySet);
  const work = [];
  all.forEach((s, i) => {
    if (!isWorking(s) || !(repsOf(s) >= 1)) return;
    work.push({ ...s, i, L: r2(wOut(parseFloat(s.w) || 0, u)), R: repsOf(s) });
  });
  const main = work.filter(s => s.type !== 'D');
  if (!main.length) return null;
  const T = assisted ? Math.min(...main.map(s => s.L)) : Math.max(...main.map(s => s.L));
  const top = main.filter(s => Math.abs(s.L - T) < GRID_TOL);
  const scheme = work.every(s => s.L === 0) ? 'bw' : top.length >= 2 ? 'straight' : 'top';
  return {
    startedAt: e.startedAt, date: e.date, daysAgo: daysBetween(e.startedAt, now),
    all, work, top, T, k: top.length, R: top.map(s => s.R), scheme, grid: onGrid(T)
  };
}

/* ================================================================
   3.  THE BASELINES — his range, his step, his rate
   ================================================================ */

/* THE REP RANGE, learned from where he MOVES UP, not from recent reps. A range
   built from recent reps is dragged down by the session it is judging: a bad
   day at 6 would make 6 "the range" and the miss would never be called.

   The regime is the last twelve weeks after the most recent change of
   programme (a top load moving more than 15% between two sessions not a
   layoff apart), excluding the session being judged. Each rise in top load
   inside it is a pair: the reps every set reached before he moved up, and the
   reps the new weight started at. */
function rangeOf(X, now, dir, band) {
  const n = X.length;
  let start = 0;
  for (let i = 1; i < n; i++) {
    const a = X[i - 1], b = X[i];
    if (Math.abs(b.T - a.T) > SHAPE_JUMP * a.T && daysBetween(a.startedAt, b.startedAt) <= GAP_DAYS) start = i;
  }
  const regime = X.slice(start, n - 1).filter(e => daysBetween(e.startedAt, now) < WINDOW_DAYS);
  const his = [], los = [];
  for (let i = 1; i < regime.length; i++) {
    const a = regime[i - 1], b = regime[i];
    if (dir * (b.T - a.T) > GRID_TOL / 2) { his.push(Math.min(...a.R)); los.push(Math.min(...b.R)); }
  }
  if (his.length >= 2) {
    const hi = Math.round(median(his)), lo = Math.round(median(los));
    // A median that puts the bottom above the top is two readings that do not
    // agree, and is treated as no reading at all.
    if (lo <= hi) {
      return { lo, hi, fixed: lo === hi, source: 'yours', pairs: his.length,
               stage: his.length >= 4 ? 'yours' : 'learning', usable: true };
    }
  }
  // The same reps on every top set, three sessions out of the last four: a
  // fixed-rep scheme (3×5, 5×5) he has shown without ever moving up.
  if (regime.length >= 3) {
    const tally = {};
    regime.slice(-4).forEach(e => {
      if (e.R.every(r => r === e.R[0])) tally[e.R[0]] = (tally[e.R[0]] || 0) + 1;
    });
    const R = Object.keys(tally).map(Number).find(r => tally[r] >= 3);
    if (R != null) return { lo: R, hi: R, fixed: true, source: 'yours', pairs: his.length, stage: 'learning', usable: true };
  }
  // The labelled starting band — and only if last time sits inside it, give or
  // take two at the top. COACH NEVER CALLS A MISS AGAINST A RANGE HE DID NOT
  // SHOW IT: somebody doing 3×5 with no goal set is not missing a 6–10 band he
  // never chose, and this check is what keeps such a set out of the miss branch.
  const [lo, hi] = band;
  const last = X[n - 1];
  const usable = !!last && last.R.every(r => r >= lo && r <= hi + 2);
  return { lo, hi, fixed: false, source: 'default', pairs: his.length, stage: 'learning', usable };
}

/* THE STEP, learned from his own jumps: every change in top load between two
   sessions whose loads are both on the grid, kept when it is a rise (for an
   assisted lift, less help) of no more than 15% — past that it is a new
   programme — rounded to the half unit. The step is the SMALLEST jump seen at
   least twice, so it is never learned from one. */
function stepOf(X, dir, equipment, lowerBody, u) {
  const seen = new Map();
  for (let i = 1; i < X.length; i++) {
    const a = X[i - 1], b = X[i];
    if (!a.grid || !b.grid || Math.abs(b.T - a.T) < GRID_TOL) continue;
    const diff = Math.round(dir * (b.T - a.T) / GRID) * GRID;
    if (!(diff > 0) || dir * (b.T - a.T) > SHAPE_JUMP * b.T + GRID_TOL) continue;
    seen.set(diff, (seen.get(diff) || 0) + 1);
  }
  const twice = [...seen.keys()].filter(v => seen.get(v) >= 2).sort((a, b) => a - b);
  if (twice.length) {
    const n = seen.get(twice[0]);
    return { value: twice[0], n, source: 'yours', stage: n >= 4 ? 'yours' : 'learning' };
  }
  const d = defaultStep(equipment, lowerBody, u);
  return d == null ? null : { value: d, n: 0, source: 'default', stage: 'learning' };
}

/* HOW FAST HE IS MOVING. Per exposure, the best estimated max over its working
   non-drop sets — analytics.js's e1rm, the figure the set row prints — with
   any set past twelve reps counted as twelve.

   COUNTED AS TWELVE, NOT LEFT OUT, and that is a deliberate departure from the
   brief (COACH-REPORT §39). Left out, a session of 13, 14 and 15 reps is no
   point at all, the slope reads slow, and Coach holds; take one rep off the
   first set and the session joins the series, the slope rises and the same
   log is told to add weight. Fewer reps must never mean a heavier target. At
   twelve the estimate is a floor, rises only with the load past there, and
   the series is monotone in every rep count.

   The slope is Theil–Sen (the median of every pairwise slope, so one
   great day or one bad day does not bend it) over the last eight sessions in
   twelve weeks, restarting after any three-week gap so that a layoff's drop
   does not read as a slow lifter. As % of the series' median, per week. */
function progressOf(X, now) {
  const pts = [];
  X.forEach(e => {
    const best = Math.max(0, ...e.work.filter(s => s.type !== 'D')
      .map(s => e1rm(e.all[s.i].w, Math.min(s.R, E1RM_MAX_REPS))));
    if (best > 0) pts.push({ day: -daysBetween(e.startedAt, now), y: best, startedAt: e.startedAt });
  });
  let win = pts.filter(p => -p.day < WINDOW_DAYS);
  let cut = 0;
  for (let i = 1; i < win.length; i++) if (win[i].day - win[i - 1].day > GAP_DAYS) cut = i;
  win = win.slice(cut).slice(-SLOPE_POINTS);

  const slopes = [];
  for (let i = 0; i < win.length; i++) {
    for (let j = i + 1; j < win.length; j++) {
      const dt = win[j].day - win[i].day;
      if (dt > 0) slopes.push((win[j].y - win[i].y) / dt);
    }
  }
  const mid = median(win.map(p => p.y));
  const perDay = slopes.length ? median(slopes) : null;
  const slope = perDay != null && mid > 0 ? perDay * 7 / mid * 100 : null;

  // His own noise: the median session-to-session change, as a percent.
  const tail = pts.slice(-SIGMA_POINTS);
  const moves = [];
  for (let i = 1; i < tail.length; i++) moves.push(Math.abs(tail[i].y - tail[i - 1].y) / tail[i - 1].y * 100);
  const sigma = moves.length >= SIGMA_MIN ? median(moves) : SIGMA_DEFAULT;

  let status = 'holding';
  const span = win.length ? win[win.length - 1].day - win[0].day : 0;
  if (win.length >= STATUS_POINTS && span >= STATUS_SPAN_DAYS) {
    const isBest = i => i > 0 && win.slice(0, i).every(p => win[i].y > p.y * (1 + NEW_BEST));
    const bestIn = m => win.some((p, i) => i >= win.length - m && isBest(i));
    const last3 = win.slice(-3).map(p => p.y), prev3 = win.slice(-6, -3).map(p => p.y);
    const bar = Math.max(DECLINE_PCT, 1.5 * sigma);
    const last4 = win.slice(-4);
    if (bestIn(3) || (slope != null && slope >= SLOPE_SLOW)) status = 'progressing';
    else if (prev3.length === 3 && median(last3) < median(prev3) * (1 - bar / 100)) status = 'declining';
    else if (!bestIn(4) && last4[last4.length - 1].day - last4[0].day >= STATUS_SPAN_DAYS) status = 'stalled';
  }
  return {
    points: win.length, slope, sigma, status,
    slow: win.length >= SLOPE_POINTS && slope != null && slope < SLOPE_SLOW,
    fast: win.length >= SLOPE_POINTS && slope != null && slope >= SLOPE_FAST,
    // What the slow-slope sentence quotes: the fitted move across the window.
    moveLb: perDay != null && win.length > 1 ? perDay * (win[win.length - 1].day - win[0].day) : null
  };
}

/* What this lift is, as the rules below need it. Assisted lifts run backwards:
   progress is less help. Lower body is the legs group, or a squat, hinge or
   lunge filed elsewhere — every deadlift lives under back. A custom exercise
   has no tag, so no load type; its default band is the widest of the two. */
function liftOf(ex, dials) {
  const exId = String(ex.exId || '');
  const tag = tagsFor(exId);
  const assisted = exId === 'assisted-pull-up' || /assist/i.test(String(ex.name || ''));
  const lowerBody = ex.group === 'legs' || !!(tag && ['squat', 'hinge', 'lunge'].includes(tag.pattern));
  const b = dials.band;
  const band = tag && tag.load === 'isolation' ? b.isolation
    : tag && tag.load === 'compound' ? b.compound
    : [b.compound[0], b.isolation[1]];
  return { exId, tag, assisted, dir: assisted ? -1 : 1, lowerBody, equipment: ex.equipment || null,
           band: band.slice(), group: ex.group || null };
}

/* Everything this file knows about one lift before it decides anything. What
   stage two reads to put a status next to the context that explains it. */
export function baselines(ex, ctx) {
  try {
    const c = ctx || {};
    const u = c.u === 'kg' ? 'kg' : 'lb';
    if (!ex || !Number.isFinite(c.now)) return null;
    const base = dialsFor({ aim: c.aim, exp: c.exp, energy: c.energy });
    const lift = liftOf(ex, base);
    const X = (Array.isArray(ex.exposures) ? ex.exposures : [])
      .map(e => readExposure(e, u, lift.assisted, c.now)).filter(Boolean);
    if (!X.length) return null;
    const prog = progressOf(X, c.now);
    return {
      exposures: X.length,
      range: rangeOf(X, c.now, lift.dir, lift.band),
      step: stepOf(X, lift.dir, lift.equipment, lift.lowerBody, u),
      status: prog.status, slope: prog.slope, sigma: prog.sigma
    };
  } catch {
    return null;
  }
}

/* ================================================================
   4.  THE PRESCRIPTION
   ================================================================
   prescribe(ex, ctx) -> null | a target.

     ex   { exId, name, group, equipment, exposures, groupDaysSince }
          groupDaysSince is coach.js's group.daysSince for the lift's primary
          group — days since ANY working set of it — or null, in which case
          the group's clock is the lift's own
     ctx  { now, u, aim, exp, energy, rateWk }

   Null for cardio, and null on anything it cannot read. Everything else gets
   one of eight modes, and every mode has a sentence and its evidence. */
export function prescribe(ex, ctx) {
  try {
    return decide(ex || {}, ctx || {});
  } catch {
    return null;
  }
}

const STAGE_RANK = { none: 0, learning: 1, yours: 2 };
const weakest = (...st) => st.filter(Boolean).sort((a, b) => STAGE_RANK[a] - STAGE_RANK[b])[0] || 'none';

function decide(ex, c) {
  const u = c.u === 'kg' ? 'kg' : 'lb';
  const now = c.now;
  if (!Number.isFinite(now)) return null;
  // 1. Cardio: no target, ever.
  if (ex.equipment === 'cardio') return null;

  const base = dialsFor({ aim: c.aim, exp: c.exp, energy: c.energy });
  const lift = liftOf(ex, base);
  const X = (Array.isArray(ex.exposures) ? ex.exposures : [])
    .map(e => readExposure(e, u, lift.assisted, now)).filter(Boolean);
  const unit = unitW(u);

  /* ---------- the words' building blocks ----------
     Every load printed is a stored string through units.js — never a
     re-rounded number — so what the sentence says and what the box would
     hold cannot disagree. */
  const shown = w => {
    const s = fmtSetLoad(w, u);
    if (s === '') return '';
    return s === 'BW' ? 'bodyweight' : s + ' ' + unit + (lift.assisted ? ' of assistance' : '');
  };
  const at = lift.assisted ? ' with ' : ' at ';
  const stepText = s => num(s.value) + ' ' + unit;

  // 2. Never logged.
  if (!X.length) {
    const [lo, hi] = lift.band;
    return out({
      mode: 'first', code: null, loadLb: null, sets: [],
      line: 'No target yet: first time on this lift.',
      why: ['Pick a weight you could do about ' + (hi + 2) + ' times and stop at ' + hi +
            '. Coach sets targets from there.'],
      stage: 'none', range: { lo, hi, fixed: false, source: 'default' }, step: null,
      status: 'holding', slope: null, from: null
    });
  }

  const last = X[X.length - 1];
  const prev = X.length >= 2 ? X[X.length - 2] : null;
  const prog = progressOf(X, now);
  const dials = dialsFor({ aim: c.aim, exp: c.exp, energy: c.energy,
                           slowSlope: prog.slow, fastSlope: prog.fast });
  const from = { date: last.date, daysAgo: last.daysAgo };
  const g = last.daysAgo;
  const groupDays = Number.isFinite(ex.groupDaysSince) ? ex.groupDaysSince : null;
  const gg = groupDays == null ? g : Math.min(g, groupDays);
  // Said of the group only when the group's own clock is the one in play.
  const gw = groupWord(lift.group);
  const sinceWhat = groupDays != null && gg === groupDays && gw ? 'you last trained ' + gw : 'you last did this lift';
  const common = { status: prog.status, slope: prog.slope, from };

  // Last time's numbers, set by set: the default for every set a target does
  // not touch, and every top set's ghost weight when the target names no number.
  const keep = last.all.map(s => ({ type: s.type, tw: s.w, tr: s.r }));
  const reps = rs => rs.join(', ');
  // Last time, said the way somebody says it: "3 × 8 at 185 lb", or "405 lb
  // for 1, then 315 lb for 5", or "185 lb for 12, 5, 11". Runs of one weight
  // and one kind of set, each through units.js.
  const quote = sets => {
    const runs = [];
    sets.forEach(s => {
      const k = s.type + '|' + s.w;
      const r = runs[runs.length - 1];
      if (r && r.k === k) { r.reps.push(s.r); return; }
      runs.push({ k, w: s.w, type: s.type, reps: [s.r] });
    });
    return runs.map(x => {
      const load = shown(x.w) || 'no weight';
      const even = x.reps.every(r => r === x.reps[0]);
      return (even && x.reps.length > 1 ? x.reps.length + ' × ' + x.reps[0] + at + load
                                        : load + ' for ' + reps(x.reps)) +
             (x.type === 'F' ? ' to failure' : x.type === 'D' ? ' as a drop set' : '');
    }).join(', then ');
  };
  const lastTime = 'Last time: ' + quote(last.work) + '.';
  const defer = (code, line, why) => out({
    mode: 'defer', code, loadLb: null, sets: [], line, why: why.concat(lastTime),
    stage: 'none', range: null, step: null, ...common
  });

  /* 3. BODYWEIGHT — every working set at load 0 (or an assisted lift done
     unassisted, which is where "unassisted" hands it). Progress is by reps,
     with no range needed. Reps are counts, not loads, so a fraction of them
     after a layoff is not an invented plate. A weighted variant with load on
     its sets is not this: it runs the loaded rules on the added load. */
  if (last.scheme === 'bw' || (lift.assisted && last.T <= 0)) {
    const tops = last.top;
    const lastR = tops.map(s => s.R);
    let target = lastR.slice(), mode = 'bodyweight', code = null, why;
    const back = gg > GROUP_FAR_DAYS ? REENTER_FAR : gg >= GROUP_NEAR_DAYS ? REENTER_NEAR : null;
    const prevR = prev && (prev.scheme === 'bw' || (lift.assisted && prev.T <= 0)) ? prev.top.map(s => s.R) : null;
    if (back) {
      target = lastR.map(r => Math.max(1, Math.round(r * back)));
      code = 'back';
      why = [gg + ' days since ' + sinceWhat + ', so a few fewer than last time (' + reps(lastR) + ').'];
    } else if (g >= LIFT_HOLD_DAYS) {
      mode = 'hold'; code = 'back';
      why = ['First time on this lift in ' + g + ' days, so no jump on the first one back.'];
      if (groupDays != null && groupDays < g && gw) why.push('Your ' + gw + ' work has kept going, so no step down either.');
    } else if (prevR && lastR.some((r, i) => i < prevR.length && r <= prevR[i] - 2)) {
      mode = 'hold'; code = 'miss';
      target = lastR.map((r, i) => (i < prevR.length ? prevR[i] : r));
      why = ['Last time’s sets came in lower (' + reps(lastR) + '), so the same as the time before.'];
    } else {
      const up = weakestHalf(tops);
      up.forEach(i => { target[i] = lastR[i] + 1; });
      why = [tops.length === 1 ? 'One more rep than last time (' + reps(lastR) + ').'
             : 'One more rep on your ' + word(up.length) + ' lowest ' + (up.length === 1 ? 'set' : 'sets') +
               ' (' + reps(lastR) + ' last time).'];
    }
    const sets = keep.slice();
    tops.forEach((s, j) => { sets[s.i] = { type: s.type, tw: last.all[s.i].w, tr: String(target[j]) }; });
    const line = 'Target: ' + (target.length === 1 ? plural(target[0], 'rep') : reps(target) + ' reps') +
      (mode === 'hold' && code === 'back' ? ', same as last time.' : '.');
    return out({ mode, code, loadLb: null, sets, line, why, stage: 'yours', range: null, step: null, ...common });
  }

  /* 4–5. HEAVY. A single, or a lone top set of three or fewer, is too close to
     all-out for Coach to call the next one without knowing how hard it was.
     BEFORE the layoff gate, so an old single never comes back as "405 for 1"
     and never steps down into a heavy re-entry. */
  if (last.R.some(r => r === 1) || (last.scheme === 'top' && last.R[0] <= 3)) {
    return defer('heavy', 'No target for heavy singles, doubles or triples on their own.',
      ['They’re too close to an all-out set for Coach to call without knowing how hard they were.']);
  }

  // The baselines, needed by every branch from here on.
  // The band is the aim's alone — the energy and the slope turn other dials.
  const range = rangeOf(X, now, lift.dir, lift.band);
  const step = stepOf(X, lift.dir, lift.equipment, lift.lowerBody, u);
  const S = step ? step.value : null;
  const stage = weakest(range.stage, step ? step.stage : 'learning');
  const learning = n => 'Coach is learning this lift (' + plural(n, 'session') + ' so far).';
  const finish = (why, loadNamed) => {
    const w = why.slice();
    if (loadNamed && step) {
      w.push(step.source === 'yours'
        ? 'Your usual jump here is ' + stepText(step) + ' (from ' + plural(step.n, 'increase') + ' in your log).'
        : stepText(step) + ' is a common starting jump for this kind of lift. Coach will learn yours.');
    }
    if (stage === 'learning') w.push(learning(X.length));
    return w;
  };
  const rangeOut = { lo: range.lo, hi: range.hi, fixed: range.fixed, source: range.source };
  const lo = range.lo;
  const offGrid = 'Last time’s weight doesn’t land on a half-' + (u === 'kg' ? 'kilo' : 'pound') +
    ' step, so Coach won’t work a new number out from it.';

  /* The sets for a target. Top sets carry it; every other set keeps last
     time's numbers — except that coming down (a reduction or a re-entry) no
     set may be heavier than the new top set. */
  const setsFor = (tw, trs, capAt) => {
    const sets = keep.slice();
    if (capAt != null) {
      last.all.forEach((s, i) => {
        if (s.w !== '' && lift.dir * (r2(wOut(parseFloat(s.w) || 0, u)) - capAt) > GRID_TOL) sets[i] = { ...sets[i], tw };
      });
    }
    last.top.forEach((s, j) => {
      sets[s.i] = { type: s.type, tw: tw != null ? tw : last.all[s.i].w, tr: String(trs[j]) };
    });
    return sets;
  };
  // A load in the display unit, as stored: pounds exactly, kilos converted once.
  const store = P => (u === 'kg' ? String(wIn(P, 'kg')) : num(P));
  const loadLine = (tw, trs, tail) => {
    const same = trs.every(r => r === trs[0]);
    return 'Target: ' + (same ? trs.length + ' × ' + trs[0] + at + shown(tw)
                              : shown(tw) + ' for ' + reps(trs)) + (tail || '') + '.';
  };
  const noLoadLine = (what, trs) => {
    const same = trs.every(r => r === trs[0]);
    return 'Target: ' + what + ', for ' + (same ? plural(trs[0], 'rep') : reps(trs) + ' reps') + '.';
  };
  const lastW = last.all[last.top[0].i].w;
  const T = last.T;

  /* 6. TIME OFF, ON TWO CLOCKS. The group's clock decides how far back to
     start; the lift's own clock only holds it — squat after weeks of leg press
     gets no jump its first time back, and no step down either. */
  const f = gg > GROUP_FAR_DAYS ? REENTER_FAR : gg >= GROUP_NEAR_DAYS ? REENTER_NEAR : null;
  if (f) {
    const repsNow = last.top.map(() => lo);
    const days = gg + ' days since ' + sinceWhat + '.';
    if (lift.assisted) {
      return out({ mode: 'reenter', code: null, loadLb: null, sets: setsFor(null, repsNow),
        line: noLoadLine('a little more assistance than last time', repsNow),
        why: finish([days], false),
        stage, range: rangeOut, step: step ? { value: step.value, n: step.n, source: step.source } : null, ...common });
    }
    let P = null, how = null;
    if (last.grid) {
      const bar = f * T + GRID_TOL;
      const logged = X.filter(e => e.grid && e.T > 0 && e.T <= bar).map(e => e.T);
      if (logged.length) { P = Math.max(...logged); how = 'logged'; }
      else if (S) {
        for (let n = 1; n <= REENTER_MAX_STEPS; n++) {
          const v = r2(T - n * S);
          if (v <= 0) break;
          if (v <= bar) { P = v; how = n; break; }
        }
      }
    }
    if (P == null) {
      return out({ mode: 'reenter', code: null, loadLb: null, sets: setsFor(null, repsNow),
        line: noLoadLine('lighter than last time (' + shown(lastW) + ')', repsNow),
        why: finish([days + (last.grid ? ' Coach doesn’t have a lighter weight of yours to point to.' : ' ' + offGrid)], false),
        stage, range: rangeOut, step: step ? { value: step.value, n: step.n, source: step.source } : null, ...common });
    }
    const tw = store(P);
    const why = how === 'logged'
      ? shown(tw) + ' is the heaviest you’ve logged at or below ' + Math.round(f * 100) + '% of your last top set (' + shown(lastW) + ').'
      : shown(tw) + ' is ' + word(how) + (step.source === 'yours' ? ' of your ' : ' ') +
        num(S) + '-' + unit + (how === 1 ? ' jump' : ' jumps') + ' below your last top set (' + shown(lastW) + ').';
    return out({ mode: 'reenter', code: null, loadLb: loadLbOf(tw), sets: setsFor(tw, repsNow, P),
      line: loadLine(tw, repsNow), why: finish([days + ' ' + why], true),
      stage, range: rangeOut, step: step ? { value: step.value, n: step.n, source: step.source } : null, ...common });
  }
  if (g >= LIFT_HOLD_DAYS) {
    const why = ['First time on this lift in ' + g + ' days, so no jump on the first one back.'];
    if (groupDays != null && groupDays < g && gw) why.push('Your ' + gw + ' work has kept going, so no step down either.');
    return out({ mode: 'hold', code: 'back', loadLb: last.grid ? loadLbOf(lastW) : null,
      sets: setsFor(null, last.R),
      line: last.grid ? loadLine(lastW, last.R, ', same as last time') : noLoadLine('same weight as last time', last.R),
      why: finish(last.grid ? why : why.concat(offGrid), last.grid),
      stage, range: rangeOut, step: step ? { value: step.value, n: step.n, source: step.source } : null, ...common });
  }

  // 7–8. A different kind of session, or a new programme.
  if (prev && (prev.scheme !== last.scheme ||
      (Math.abs(last.T - prev.T) > SHAPE_JUMP * prev.T && daysBetween(prev.startedAt, last.startedAt) <= GAP_DAYS))) {
    return defer('shape', 'No target this time.', ['Your last two sessions of this lift were set up differently.']);
  }
  // 9. Reps too far apart to carry a number.
  if (Math.max(...last.R) - Math.min(...last.R) >= ERRATIC_SPREAD) {
    return defer('erratic', 'No target this time.', ['Last session’s sets varied a lot (' + reps(last.R) + ').']);
  }
  // A starting band last time does not sit inside is a band he never chose.
  if (!range.usable) {
    return defer('range', 'No target yet.', ['Coach needs a few more sessions of this lift to know your rep range.']);
  }

  /* ---------- the decision ---------- */
  const micro = range.source === 'default' && S && (T <= 0 || S / T > MICRO_SHARE);
  const hiEff = range.hi + (micro ? MICRO_REPS : 0);
  const hitTop = last.R.every(r => r >= hiEff);
  const inRange = Math.min(...last.R) >= lo;
  const anyF = last.top.some(s => s.type === 'F');
  const triples = last.scheme === 'straight' && range.fixed && range.lo <= 3;
  const stepOut = step ? { value: step.value, n: step.n, source: step.source } : null;
  const who = last.k === 1 ? 'Your top set' : 'Every set';
  // How the range is named: his own, or the labelled starting band — and when
  // a big jump has stretched that band's top by two, said so.
  const band = range.lo + '–' + range.hi;
  const topOf = () => range.source === 'yours' ? ', the top of your ' + band + '.'
    : micro ? ', two past the top of ' + band + ' (a common starting range) before a jump this size.'
    : ', the top of ' + band + ', a common starting range.';
  const inside = () => range.source === 'yours' ? 'Inside your ' + band
    : 'Inside ' + range.lo + '–' + hiEff;
  const insideTail = () => range.source === 'yours' ? ''
    : micro ? ' That is ' + band + ', a common starting range, plus two before a jump this size.'
    : ' ' + band + ' is a common starting range.';

  if (hitTop) {
    const need = triples ? 2 : dials.confirm;
    const prevHit = !!prev && Math.abs(prev.T - T) < GRID_TOL && prev.R.every(r => r >= hiEff);
    const reached = who + ' reached ' + hiEff + at + shown(lastW);
    if (!(need === 1 || prevHit)) {
      // Wanting a second look: say which of the reasons asked for it.
      let because;
      if (triples) because = 'With sets this heavy, Coach wants to see it twice.';
      else if (c.energy === 'deep') {
        because = (Number.isFinite(c.rateWk) && c.rateWk < 0
          ? 'Your weight is coming down about ' + labelRate(-c.rateWk, u) + ' a week'
          : 'Your weight is coming down fast') + ', so Coach wants to see it twice before adding weight.';
      } else if (c.aim === 'cut') because = 'You’re cutting, so Coach wants to see it twice before adding weight.';
      else if (c.aim === 'maintain') because = 'You set Stay consistent, so Coach wants to see it twice before adding weight.';
      else {
        // The fitted move across the window, in his unit; under one unit it
        // is said as level rather than as "about 0 lb".
        const mv = prog.moveLb != null ? Math.abs(prog.moveLb) : 0;
        because = 'Your estimated max here has ' +
          (Math.round(wOut(mv, u)) === 0 ? 'held about level' : 'moved about ' + labelW(mv, u)) +
          ' over your last ' + plural(prog.points, 'session') + ', so Coach wants to see it twice.';
      }
      const trs = last.R;
      return out({ mode: 'hold', code: 'confirm', loadLb: last.grid ? loadLbOf(lastW) : null,
        sets: setsFor(null, trs),
        line: last.grid ? loadLine(lastW, trs, ' again') : noLoadLine('same weight as last time', trs),
        why: finish([reached + '. ' + because].concat(last.grid ? [] : [offGrid]), last.grid),
        stage, range: rangeOut, step: stepOut, ...common });
    }
    let steps = 1;
    if (dials.maxSteps >= 2 && lift.lowerBody && lift.equipment === 'barbell' && !anyF &&
        last.R.every(r => r >= hiEff + TWO_STEP_REPS)) steps = 2;
    const trs = last.top.map(() => lo);
    const head = steps === 2
      ? (last.k === 1 ? 'Your top set went' : 'Every set went') + ' two or more past ' + hiEff + at + shown(lastW) + ', so two jumps.'
      : reached + onDay(last) + (range.fixed ? '.' : topOf());
    if (!last.grid || !S) {
      const stepsWord = lift.equipment === 'dumbbell' ? 'the dumbbell steps where you train'
        : ['machine', 'cable', 'plate'].includes(lift.equipment) ? 'this machine’s steps' : 'the steps on this lift';
      return out({ mode: 'add', code: null, loadLb: null, sets: setsFor(null, trs),
        line: noLoadLine('the next setting up', trs),
        why: finish([head, last.grid ? 'Coach doesn’t know ' + stepsWord + ' yet, so it won’t guess a number.' : offGrid], false),
        stage, range: rangeOut, step: stepOut, ...common });
    }
    const P = r2(T + lift.dir * steps * S);
    if (P <= 0) {
      // Assistance stepped to nothing: unassisted, and no number in the box.
      return out({ mode: 'add', code: null, loadLb: null, sets: setsFor(null, trs),
        line: noLoadLine('unassisted', trs), why: finish([head], false),
        stage, range: rangeOut, step: stepOut, ...common });
    }
    const tw = store(P);
    return out({ mode: 'add', code: null, loadLb: loadLbOf(tw), sets: setsFor(tw, trs),
      line: loadLine(tw, trs), why: finish([head], true),
      stage, range: rangeOut, step: stepOut, ...common });
  }

  if (inRange) {
    // One more rep on the weakest half of the top sets, capped at the top of
    // the range. F meant nothing was left: that set keeps its reps.
    const trs = last.R.slice();
    const up = weakestHalf(last.top).filter(j => last.top[j].type !== 'F' && trs[j] < hiEff);
    up.forEach(j => { trs[j] = Math.min(hiEff, trs[j] + 1); });
    const why = [inside() + at + shown(lastW) + ' last time (' + reps(last.R) + ').' + insideTail()];
    if (up.length) {
      why.push(last.k === 1 ? 'One more rep on your top set.'
        : 'One more rep on the ' + (up.length === 1 ? 'lowest set.' : word(up.length) + ' lowest sets.'));
    }
    if (!last.grid) why.push(offGrid);
    return out({ mode: 'reps', code: null, loadLb: last.grid ? loadLbOf(lastW) : null,
      sets: setsFor(null, trs),
      line: last.grid ? loadLine(lastW, trs) : noLoadLine('same weight as last time', trs),
      why: finish(why, last.grid), stage, range: rangeOut, step: stepOut, ...common });
  }

  // Below the range. One bad session is noise; two at the same weight is a pattern.
  const trs = last.top.map(() => lo);
  const under = last.R.filter(r => r < lo).length;
  if (prev && Math.abs(prev.T - T) < GRID_TOL && Math.min(...prev.R) < lo) {
    const head = 'Two sessions in a row came in under ' + lo + at + shown(lastW) + '.';
    if (lift.assisted) {
      return out({ mode: 'reduce', code: null, loadLb: null, sets: setsFor(null, trs),
        line: noLoadLine('a little more assistance than last time', trs),
        why: finish([head], false),
        stage, range: rangeOut, step: stepOut, ...common });
    }
    let P = null, logged = false;
    if (last.grid) {
      const floor = S ? T - 2 * S : REDUCE_FLOOR * T;
      const cands = X.slice(0, -1).filter(e => e.grid && e.T > 0 && e.T < T - GRID_TOL && e.T >= floor - GRID_TOL)
        .map(e => e.T);
      if (cands.length) { P = Math.max(...cands); logged = true; }
      else if (S && T - S > 0) P = r2(T - S);
    }
    if (P == null) {
      return out({ mode: 'reduce', code: null, loadLb: null, sets: setsFor(null, trs),
        line: noLoadLine('one setting lighter', trs),
        why: finish([head + ' ' + (last.grid ? 'Coach doesn’t know the steps on this one yet, so it won’t guess a lighter number.' : offGrid)], false),
        stage, range: rangeOut, step: stepOut, ...common });
    }
    const tw = store(P);
    return out({ mode: 'reduce', code: null, loadLb: loadLbOf(tw), sets: setsFor(tw, trs, P),
      line: loadLine(tw, trs),
      why: finish([head + ' ' + shown(tw) + (logged ? ' is a weight you’ve lifted here before; climb back from there.'
        : ' is one ' + (step.source === 'yours' ? 'of your ' + num(S) + '-' + unit + ' jumps' : num(S) + '-' + unit + ' jump') +
          ' below; climb back from there.')], true),
      stage, range: rangeOut, step: stepOut, ...common });
  }
  const miss = (last.k === 1 ? 'Your top set' : under === last.k ? 'Every set' : under === 1 ? 'One set' : Word(under) + ' sets') +
    ' came in under ' + lo + ' last time (' + reps(last.R) + '). Same weight, one more go.';
  return out({ mode: 'hold', code: 'miss', loadLb: last.grid ? loadLbOf(lastW) : null, sets: setsFor(null, trs),
    line: last.grid ? loadLine(lastW, trs) : noLoadLine('same weight as last time', trs),
    why: finish([miss].concat(last.grid ? [] : [offGrid]), last.grid),
    stage, range: rangeOut, step: stepOut, ...common });

  // The target's shape, in one place. exId rides along so a list of them
  // says which lift each is.
  function out(t) { return { exId: lift.exId, ...t }; }
}

// Stored pounds as a number, from the stored string: the same figure the box
// will hold once a tick adopts the ghost.
function loadLbOf(tw) {
  const v = parseFloat(tw);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/* The weakest half of the top sets — the ⌈k/2⌉ with the fewest reps, the
   earliest first on a tie — as positions in the top-set list. +1 on every set
   every session is an ambitious three-rep jump; +1 on the weakest keeps it
   honest and still closes on the top in a few sessions. */
function weakestHalf(tops) {
  return tops.map((s, j) => ({ j, R: s.R }))
    .sort((a, b) => a.R - b.R || a.j - b.j)
    .slice(0, Math.ceil(tops.length / 2))
    .map(x => x.j);
}
