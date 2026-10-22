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
//   NEVER A HEAVIER SINGLE OR DOUBLE (v69). A heavy day — a single, a double,
//   a lone top set of three or fewer — gets no target, teaches no range and
//   no step, and a range whose bottom is two is refused; a last fence in the
//   add branch holds it whatever the branches above worked out.
//
// THE UNITS RULE. Storage is pounds forever; every COMPARISON here happens in
// the display unit, because that is the unit the plates are in, and every
// printed weight goes through units.js. A step is learned and printed in the
// display unit, so "the next 5 lb" never appears on a kilo account.
//
// What lives where. The builder's `note` under an exercise stays a readout and
// is coach-build.js's; the prescription is a separate field, `target`, and
// this file is its only author. Since v54 it also writes the NEXT SET mid-
// session (nextSet, section 6: spec §3.10, with his effort rating), which
// coach.js hands the in-session read; coach-live.js still names no weight of
// its own. His rating of a set (`rir`) is read here and nowhere else.
//
// STATUS IS COMPUTED, NOT SHOWN. Each lift's progressing / holding / stalled /
// declining is worked out because the confirmation dial and the battery need
// it; no sentence here prints it. A stall readout with nothing beside it to
// interpret it is the defect v43 fixed, and stage two (v49, coach-overlap.js)
// reads baselines() to put a lift's movement next to its context — the
// bodyweight, the frequency, the sets — before anything is said about it.
//
// PURE, and copied into the native tree verbatim (src/pure/coach-prog.js). No
// reads, no DOM, no module state, and no clock: `now` is an argument. Imports
// coach-goal.js (the dials), units.js, exercises.js (group words), coach-tags.js
// (compound or isolation, and the movement pattern), coach-ramp.js (v70: which
// of a session's sets were the warm-up, tagged or not) and the session MATH of
// analytics.js — the merge invariant, what a working set is and the same e1rm
// the set row prints, none of which may be restated here. coach-build.js
// imports this; nothing imports back.
//
// v70, THE RAMP. A session's working sets are what coach-ramp.js workSetsOf()
// says they are: a set typed N at the bottom of an ascending run before the
// top, light and short the way a warm-up is, is read as one even when he never
// typed the W. So `work` here never holds a ramp, "Last time:" never recites
// one, and mid-session the first ticked bar set is not "the first working set"
// — before it there is a `warmup` next-set kind that names the target and
// nothing else. The stored type is never changed by this file: `all`, `keep`
// and the ghosts stay as logged.
//
// tools-check/coach-prog.mjs is the battery: every row of the brief's table,
// scored ok / miss / wrong, and thousands of generated histories per unit
// against the properties the rules above promise.

import { e1rm, isWorking, mergeSessionExercises, dropRuns, setsText } from './analytics.js';
import { wOut, wIn, fmtSetLoad, unitW, labelW, labelRate } from './units.js';
import { GROUPS } from './exercises.js';
import { tagsFor } from './coach-tags.js';
import { dialsFor } from './coach-goal.js';
import { rampOf, workSetsOf, rampLoads, rampProfile, RAMP_HEAVY, RAMP_LIGHT_REPS, RAMP_HEAVY_TRIPLE } from './coach-ramp.js';

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
// v74: and when he said the gap was training Coach could not see (know.back
// 'elsewhere'), the near one whatever the gap — said so, every time it is.
const KEPT_TRAINING = 'You said you kept training, so a small step back rather than a big one.';
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
// v69: HEAVY. Top sets of two reps or fewer, or a lone top set of three or
// fewer, are too close to all-out for Coach to call the next one (spec §0 #10)
// — and too close to teach a range or a step from, either. A powerlifter's
// 405 × 1 + 315 × 5 day taught a 1–4 band and the next target was a heavier
// single (the battery's T_MAX). So a heavy exposure is never a target's
// basis, never a pair in a range, never a jump in a step. A range whose
// bottom is two or under is the same thing said another way.
const HEAVY_REPS = 2;
const HEAVY_TOP_REPS = 3;
// A jump on a barbell lift bigger than twice its default step is more often a
// programme change than a step; it is learned only when seen three times.
const BIG_STEP_SEEN = 3;
// The held-load range (spec §6.5): three sessions at one load, straight
// sets, teach the band they were done in — when it is no wider than four
// reps and its bottom is three or more.
const HELD_SESSIONS = 3;
const HELD_SPREAD = 4;
const HELD_MIN_REPS = 3;

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
  type: (s && s.type) || 'N',
  // v54: his effort rating rides along when it is one — and only then, so an
  // unrated set is the same three keys it always was.
  ...(rirOf(s) != null ? { rir: rirOf(s) } : null),
  // v55: and a drop's `dp` (analytics.js), so the target's sets keep a drop
  // set as one group. Nothing here reads it: every 'D' is left out of the top
  // sets whether it is a drop or not, exactly as before.
  ...(s && s.dp === 1 ? { dp: 1 } : null)
});

/* v54: HIS RATING OF A SET — `rir`, reps he had left, an integer 0 to 5
   (spec §6.4, §12.4). The live sheet writes 4 (way too easy), 2 (about
   right) or 0 (too hard); a reader takes any integer 0–5. Anything else —
   absent above all — is UNKNOWN, never 0, and every rule treats unknown
   exactly as it did before the rating existed. */
export function rirOf(s) {
  const v = s && s.rir;
  return Number.isInteger(v) && v >= 0 && v <= 5 ? v : null;
}

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
   and is left out of the reading altogether.
   v70: `work` is coach-ramp.js's split of `all` — a probable warm-up keeps its
   stored type in `all` (so `keep` and the ghosts stay as logged) and is not in
   `work`, which is what T, the top sets, the range, the step and every quote
   are read from. */
const allOf = e => (Array.isArray(e.allSets) && e.allSets.length ? e.allSets : e.sets || []);
// v72: `warm` is his answer about warm-ups on this lift (coach-ask.js
// knowBy.warm, handed in on the lift as `ex.warm`): 'no' switches the ramp
// model's detection off, so every set he typed N is the working set he says it
// is; 'yes' and nothing said read as v70 did.
function readExposure(e, u, assisted, now, known, warm) {
  const all = allOf(e).map(copySet);
  const working = new Set(workSetsOf(all, { assisted, known, warm }));
  const work = [];
  all.forEach((s, i) => {
    if (!working.has(s)) return;
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

/* v70: every exposure of a lift, read — with his ramp loads on it (coach-ramp.js
   rampLoads: the loads he only ever warms up with, over the newest exposures)
   handed to each read, so a 10-lb set before his 15-lb raises is the warm-up
   it is in every session and not only in the ones where the tiers catch it. */
function readAll(exposures, u, assisted, now, warm) {
  const list = Array.isArray(exposures) ? exposures : [];
  const known = rampLoads(list.map(allOf), { assisted, warm });
  return list.map(e => readExposure(e, u, assisted, now, known, warm)).filter(Boolean);
}

/* v69: the heavy gate, as one test — a read exposure whose top sets hold a
   single or a double, or a lone top set of three or fewer. decide() refuses
   such a session a target; rangeOf() and stepOf() refuse to learn from it. */
const isHeavy = e => e.R.some(r => r <= HEAVY_REPS) || (e.scheme === 'top' && e.R[0] <= HEAVY_TOP_REPS);

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
   reps the new weight started at.

   v69: a heavy exposure (isHeavy — a single, a double, a lone top set of
   three or fewer) is never a member of a pair and never counted in the
   fixed-rep tally. Pairs read min(R) across the top sets, so a 405 × 1 day
   contributed a 1, a powerlifter's log taught a 1–4 band, and the next
   target was a heavier single. */
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
    if (isHeavy(a) || isHeavy(b)) continue;
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
      if (isHeavy(e)) return;
      if (e.R.every(r => r === e.R[0])) tally[e.R[0]] = (tally[e.R[0]] || 0) + 1;
    });
    const R = Object.keys(tally).map(Number).find(r => tally[r] >= 3);
    if (R != null) return { lo: R, hi: R, fixed: true, source: 'yours', pairs: his.length, stage: 'learning', usable: true };
  }
  /* v69: THE HELD-LOAD RANGE (COACH-V2-SPEC §6.5). The three newest sessions
     of the regime — never the one being judged, which the regime already
     leaves out — all straight sets at one top load, none heavy: the band
     their top sets ran over is the range he has shown. Only when it is no
     wider than four and its bottom is three or more: a band learned from
     three tired sessions is bounded, and a 2–4 is a heavy day, not a range.
     Between the fixed-rep tally and the default band, so somebody holding
     185 for 10, 10, 9 → 9, 8, 8 → 8, 8, 8 reads 8–10, and a session of
     8, 7, 7 after it is a miss against a band he showed — not a new band. */
  if (regime.length >= HELD_SESSIONS) {
    const held = regime.slice(-HELD_SESSIONS);
    const T0 = held[0].T;
    if (held.every(e => !isHeavy(e) && e.scheme === 'straight' && Math.abs(e.T - T0) < GRID_TOL)) {
      const lo = Math.min(...held.map(e => Math.min(...e.R)));
      const hi = Math.max(...held.map(e => Math.max(...e.R)));
      if (hi - lo <= HELD_SPREAD && lo >= HELD_MIN_REPS) {
        return { lo, hi, fixed: lo === hi, source: 'yours', pairs: his.length, stage: 'learning', usable: true,
                 held: HELD_SESSIONS, heldT: T0 };
      }
    }
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
   least twice, so it is never learned from one.

   v69: a rise into or out of a heavy exposure (a 315 × 5 day to a 405 × 1
   day) is not a jump and is never learned. And on a barbell lift a rise
   bigger than twice its default step — 20 lb on a bench whose plates go in
   fives — is more often a programme change under the 15% line than a step,
   so it has to be seen three times, not two (the battery's T_JUMP).

   v73: `told` — what he said one step up is on this lift, in stored POUNDS
   (coach-ask.js knowBy.step, coach.js puts it on the lift as `stepTold`), or
   null. It stands in for the default only: THE LOG WINS. A jump seen twice is
   his step whatever he said, so a told step the log has since contradicted is
   inert without anything being written on paint — the engine simply reads the
   log, and the fact is replaced the next time the question is answered on
   that lift. A told step is used only on the display unit's half grid: a
   2.5-lb answer read on a kilo account is 1.13 kg, a stack setting nobody
   has, so it is ignored rather than converted. */
function stepOf(X, dir, equipment, lowerBody, u, told) {
  const seen = new Map();
  const d = defaultStep(equipment, lowerBody, u);
  const big = equipment === 'barbell' && d != null ? 2 * d : null;
  for (let i = 1; i < X.length; i++) {
    const a = X[i - 1], b = X[i];
    if (!a.grid || !b.grid || Math.abs(b.T - a.T) < GRID_TOL) continue;
    if (isHeavy(a) || isHeavy(b)) continue;
    const diff = Math.round(dir * (b.T - a.T) / GRID) * GRID;
    if (!(diff > 0) || dir * (b.T - a.T) > SHAPE_JUMP * b.T + GRID_TOL) continue;
    seen.set(diff, (seen.get(diff) || 0) + 1);
  }
  const enough = v => seen.get(v) >= (big != null && v > big + GRID_TOL ? BIG_STEP_SEEN : 2);
  const twice = [...seen.keys()].filter(enough).sort((a, b) => a - b);
  if (twice.length) {
    const n = seen.get(twice[0]);
    return { value: twice[0], n, source: 'yours', stage: n >= 4 ? 'yours' : 'learning' };
  }
  if (Number.isFinite(told) && told > 0) {
    const v = r2(wOut(told, u));
    if (onGrid(v) && v > 0) return { value: v, n: 0, source: 'told', stage: 'learning' };
  }
  return d == null ? null : { value: d, n: 0, source: 'default', stage: 'learning' };
}

/* HOW FAST HE IS MOVING. Per exposure, the best estimated max over its working
   non-drop sets — analytics.js's e1rm, the figure the set row prints — with
   any set past twelve reps counted as twelve.

   COUNTED AS TWELVE, NOT LEFT OUT, and that is a deliberate departure from the
   brief (COACH-REPORT §40). Left out, a session of 13, 14 and 15 reps is no
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
  // Every point after the last layoff in the window, before the slope takes
  // its eight: what stage two reads the plateau-or-cut call from (v49).
  const series = win.slice(cut);
  win = series.slice(-SLOPE_POINTS);

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
  // The most recent point 1% over every earlier one in the series — the same
  // bar as a best above, over the whole series rather than the slope's eight.
  let lastBestAt = null;
  series.forEach((p, i) => {
    if (i > 0 && series.slice(0, i).every(q => p.y > q.y * (1 + NEW_BEST))) lastBestAt = p.startedAt;
  });
  return {
    series: series.map(p => ({ startedAt: p.startedAt, y: p.y })), lastBestAt,
    best: pts.length ? Math.max(...pts.map(p => p.y)) : null,
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
  // v72: his word on warm-ups here — 'yes', 'no' or nothing (coach.js lifts()).
  const warm = ex.warm === 'yes' || ex.warm === 'no' ? ex.warm : null;
  // v73: and what he said one step up is here, stored pounds (coach.js lifts()
  // from knowBy.step), or null. stepOf() reads it only where the log has no step.
  const stepTold = Number.isFinite(ex.stepTold) && ex.stepTold > 0 ? ex.stepTold : null;
  /* v74: three more things he said (coach-ask.js, coach.js lifts()), each
     already inside its TTL or absent — this file never reads a clock on them:
       wantNext  'push' | 'ease' | null  knowBy.wantNext for the shape this
                 lift was last done in, answered after that session
       hold      'hold' | 'light' | null  knowBy.hold on this lift — why it
                 came in 15% under ('day' reaches here as null: nothing changes)
       back      'elsewhere' | null       know.back, answered after this
                 lift's last exposure: the gap was training Coach cannot see */
  const wantNext = ex.wantNext === 'push' || ex.wantNext === 'ease' ? ex.wantNext : null;
  const hold = ex.hold === 'hold' || ex.hold === 'light' ? ex.hold : null;
  const back = ex.back === 'elsewhere' ? 'elsewhere' : null;
  return { exId, tag, assisted, dir: assisted ? -1 : 1, lowerBody, equipment: ex.equipment || null,
           band: band.slice(), group: ex.group || null, warm, stepTold, wantNext, hold, back };
}

/* v74: THE LIGHTER WEEK HE NAMED. With knowBy.hold 'light' on the lift, the
   exposures that WERE the lighter week — the newest run of exposures each
   15% or more under the one being judged (the shape test's own share and
   gap, SHAPE_JUMP within GAP_DAYS of the next newer) — are not a new
   programme: `prev` for the shape test is the exposure before the run, and
   the range and step are learned over the exposures with the run left out, so
   no pair across it teaches a jump. A run that reaches the start of the log
   leaves `prev` as it was (the defer stands: there is nothing to read from).
   Nothing happens when the newest exposure is itself the light one — the
   shipped defer fires once, the recap asks, and this is what answers it. */
function lightSkip(X, lift) {
  const n = X.length;
  const out = { prev: n >= 2 ? X[n - 2] : null, X };
  if (lift.hold !== 'light' || n < 2) return out;
  const last = X[n - 1];
  let k = n - 2, after = last;
  while (k >= 0 && lift.dir * (last.T - X[k].T) > SHAPE_JUMP * X[k].T &&
         daysBetween(X[k].startedAt, after.startedAt) <= GAP_DAYS) { after = X[k]; k--; }
  if (k === n - 2 || k < 0) return out;
  const skip = new Set(X.slice(k + 1, n - 1).map(e => e.startedAt));
  return { prev: X[k], X: X.filter(e => !skip.has(e.startedAt)) };
}

/* v74: THE DROP the recap asks about (coach-ask.js q_drop_why) — the lift's
   last two exposures trip the shape test with the newer one LOWER: the top
   load fell by more than SHAPE_JUMP of the earlier one, inside GAP_DAYS (a
   longer gap is a layoff, which has its own rule and its own question).
   { pct, w, prevW, at } — the share, rounded, of his own two loads; the lower
   top's stored weight and the earlier one's; when the lower session was — or
   null. The one percentage Coach ever prints, and never a body or food
   number. Read on the raw exposures the way decide() reads them. */
export function dropOf(ex, ctx) {
  try {
    const c = ctx || {};
    const u = c.u === 'kg' ? 'kg' : 'lb';
    if (!ex || !Number.isFinite(c.now) || ex.equipment === 'cardio') return null;
    const base = dialsFor({ aim: c.aim, exp: c.exp, energy: c.energy });
    const lift = liftOf(ex, base);
    const X = readAll(ex.exposures, u, lift.assisted, c.now, lift.warm);
    if (X.length < 2) return null;
    const last = X[X.length - 1], prev = X[X.length - 2];
    if (!(prev.T > 0) || last.scheme === 'bw' || prev.scheme === 'bw') return null;
    const fall = lift.dir * (prev.T - last.T);
    if (!(fall > SHAPE_JUMP * prev.T) || daysBetween(prev.startedAt, last.startedAt) > GAP_DAYS) return null;
    return { pct: Math.round(fall / prev.T * 100), w: last.all[last.top[0].i].w, prevW: prev.all[prev.top[0].i].w, at: last.startedAt };
  } catch {
    return null;
  }
}

/* Everything this file knows about one lift before it decides anything. What
   stage two reads to put a status next to the context that explains it.

   v49 ADDS, and changes nothing it already returned (coach-prog.mjs pins that
   against rack-v48's own file):
     series      every estimated-max point in the window after the last
                 layoff, oldest first — { startedAt, y }, y in stored pounds
     lastBestAt  when the most recent new best landed, or null
     moveLb      the slope's fitted move across its window, in pounds
     freq        exposures a week: the last four weeks, and the last twelve
     topReps     the last three exposures' top-set reps and top loads
                 (display unit), oldest first — the grinding test
     tops        every exposure's top load (display unit), whether it sits on
                 the grid, its stored weight string and its working sets, so
                 the record-day read never restates what a top load is
     best        the best estimated max on the whole log (reps capped at
                 twelve, as the series is), in pounds
     assisted    whether the lift runs backwards (assistance), when every
                 estimated max above means nothing */
export function baselines(ex, ctx) {
  try {
    const c = ctx || {};
    const u = c.u === 'kg' ? 'kg' : 'lb';
    if (!ex || !Number.isFinite(c.now)) return null;
    const base = dialsFor({ aim: c.aim, exp: c.exp, energy: c.energy });
    const lift = liftOf(ex, base);
    const X = readAll(ex.exposures, u, lift.assisted, c.now, lift.warm);
    if (!X.length) return null;
    const prog = progressOf(X, c.now);
    const within = n => X.filter(e => e.daysAgo >= 0 && e.daysAgo < n).length;
    // v74: the lighter week he named is left out of the range and the step.
    const XL = lightSkip(X, lift).X;
    return {
      exposures: X.length,
      range: rangeOf(XL, c.now, lift.dir, lift.band),
      step: stepOf(XL, lift.dir, lift.equipment, lift.lowerBody, u, lift.stepTold),
      status: prog.status, slope: prog.slope, sigma: prog.sigma,
      series: prog.series, lastBestAt: prog.lastBestAt, moveLb: prog.moveLb, best: prog.best,
      freq: { recent: within(28) / 4, normal: within(WINDOW_DAYS) / 12 },
      topReps: X.slice(-3).map(e => ({ reps: e.R.slice(), load: e.T })),
      tops: X.map(e => ({
        startedAt: e.startedAt, daysAgo: e.daysAgo, date: e.date, load: e.T, grid: e.grid,
        w: e.all[e.top[0].i].w,
        // v70: his rating rides along where there is one, so the record day
        // can see a best he rated too hard (coach-overlap.js record()).
        sets: e.work.map(s => ({ load: s.L, reps: s.R, type: s.type, w: s.w, ...(s.rir != null ? { rir: s.rir } : null) }))
      })),
      assisted: lift.assisted
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
  const X = readAll(ex.exposures, u, lift.assisted, now, lift.warm);
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
            '. I’ll set targets from there.'],
      stage: 'none', range: { lo, hi, fixed: false, source: 'default' }, step: null,
      status: 'holding', slope: null, from: null
    });
  }

  const last = X[X.length - 1];
  /* v74: with the lighter week he named left out — `prev` is the exposure
     before it, and the range and step below are learned without it. Every
     other reader of X (last, the quote, the series) is unchanged. */
  const skipped = lightSkip(X, lift);
  const prev = skipped.prev;
  const XL = skipped.X;
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
  // v70: a row the ramp model read as a warm-up rides in as logged, typed N,
  // and carries `ramp: true` — so a reader of the rows (nextSet) can tell his
  // 16 × 3 rung from the 16 × 6 working rows when a reduction lands on it.
  const worked = new Set(last.work.map(s => s.i));
  const keep = last.all.map((s, i) => ({ type: s.type, tw: s.w, tr: s.r, ...(s.dp === 1 ? { dp: 1 } : null),
                                         ...(s.type !== 'W' && !worked.has(i) && repsOf(s) >= 1 ? { ramp: true } : null) }));
  const reps = rs => rs.join(', ');
  // Last time, said the way somebody says it: "3 × 8 at 185 lb", or "405 lb
  // for 1, then 315 lb for 5", or "185 lb for 12, 5, 11". Runs of one weight
  // and one kind of set, each through units.js.
  const quote = sets => {
    const runs = [];
    // v56: a drop set with drops in it is said once, as a group — "185 lb × 8
    // → 135 lb × 6 → 95 lb × 5, a drop set" — through analytics.js setsText,
    // the rule every screen draws one by. A 'D' with no drops is said as it was.
    dropRuns(sets).forEach(run => {
      if (run.length > 1) { runs.push({ drop: setsText(run, s => (shown(s.w) || 'no weight') + ' × ' + s.r, '') }); return; }
      const s = run[0];
      const k = s.type + '|' + s.w;
      const r = runs[runs.length - 1];
      if (r && r.k === k) { r.reps.push(s.r); return; }
      runs.push({ k, w: s.w, type: s.type, reps: [s.r] });
    });
    return runs.map(x => {
      if (x.drop) return x.drop + ', a drop set';
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
    // v74: he said he kept training elsewhere — the near step back, whatever the gap.
    const back = gg > GROUP_FAR_DAYS && !lift.back ? REENTER_FAR : gg >= GROUP_NEAR_DAYS ? REENTER_NEAR : null;
    const prevR = prev && (prev.scheme === 'bw' || (lift.assisted && prev.T <= 0)) ? prev.top.map(s => s.R) : null;
    if (back) {
      target = lastR.map(r => Math.max(1, Math.round(r * back)));
      code = 'back';
      why = [gg + ' days since ' + sinceWhat + ', so a few fewer than last time (' + reps(lastR) + ').'];
      if (lift.back) why.push(KEPT_TRAINING);
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
             : 'One more rep on your ' + (up.length === 1 ? 'lowest set' : word(up.length) + ' lowest sets') +
               ' (' + reps(lastR) + ' last time).'];
    }
    const sets = keep.slice();
    tops.forEach((s, j) => { sets[s.i] = { type: s.type, tw: last.all[s.i].w, tr: String(target[j]) }; });
    const line = 'Target: ' + (target.length === 1 ? plural(target[0], 'rep') : reps(target) + ' reps') +
      (mode === 'hold' && code === 'back' ? ', same as last time.' : '.');
    return out({ mode, code, loadLb: null, sets, line, why, stage: 'yours', range: null, step: null, ...common });
  }

  /* 4–5. HEAVY. A single or a double, or a lone top set of three or fewer, is
     too close to all-out for Coach to call the next one without knowing how
     hard it was. BEFORE the layoff gate, so an old single never comes back as
     "405 for 1" and never steps down into a heavy re-entry. v69: doubles too
     (isHeavy) — a 5 × 2 was a fixed-rep scheme and got a heavier 5 × 2. */
  const heavyLine = 'No target for heavy singles, doubles or triples on their own.';
  if (isHeavy(last)) {
    return defer('heavy', heavyLine,
      ['They’re too close to an all-out set for me to call without knowing how hard they were.']);
  }

  // The baselines, needed by every branch from here on.
  // The band is the aim's alone — the energy and the slope turn other dials.
  const range = rangeOf(XL, now, lift.dir, lift.band);
  // v69: a range whose bottom is a double is a heavy day said another way, and
  // its "add" would be a heavier single or double. No target off it.
  if (range.lo <= HEAVY_REPS) {
    return defer('heavy', heavyLine,
      ['Your rep range here reads as singles or doubles, and I won’t call a heavier one of those.']);
  }
  const step = stepOf(XL, lift.dir, lift.equipment, lift.lowerBody, u, lift.stepTold);
  const S = step ? step.value : null;
  const stage = weakest(range.stage, step ? step.stage : 'learning');
  const learning = n => 'I’m learning this lift: ' + plural(n, 'session') + ' so far.';
  const finish = (why, loadNamed) => {
    const w = why.slice();
    if (loadNamed && step) {
      w.push(step.source === 'yours'
        ? 'Your usual jump here is ' + stepText(step) + ' (from ' + plural(step.n, 'increase') + ' in your log).'
        : step.source === 'told'
        ? 'You told me one step up here is ' + stepText(step) + '.'
        : stepText(step) + ' is a common starting jump for this kind of lift. I’ll learn yours.');
    }
    if (stage === 'learning') w.push(learning(X.length));
    return w;
  };
  const rangeOut = { lo: range.lo, hi: range.hi, fixed: range.fixed, source: range.source,
                     ...(range.held ? { held: range.held } : null) };
  const lo = range.lo;
  const offGrid = 'Last time’s weight doesn’t land on a half-' + (u === 'kg' ? 'kilo' : 'pound') +
    ' step, so I won’t work a new number out from it.';

  /* The sets for a target. Top sets carry it; every other set keeps last
     time's numbers — except that coming down (a reduction or a re-entry) no
     set may be heavier than the new top set. v70: a warm-up row (typed W) is
     never rewritten into a working weight — it is copied as logged, and one
     heavier than the new top is dropped from the list instead of clamped. */
  const setsFor = (tw, trs, capAt) => {
    const sets = keep.slice();
    const drop = new Set();
    if (capAt != null) {
      last.all.forEach((s, i) => {
        if (s.w === '' || !(lift.dir * (r2(wOut(parseFloat(s.w) || 0, u)) - capAt) > GRID_TOL)) return;
        if (s.type === 'W') drop.add(i); else sets[i] = { ...sets[i], tw };
      });
    }
    last.top.forEach((s, j) => {
      sets[s.i] = { type: s.type, tw: tw != null ? tw : last.all[s.i].w, tr: String(trs[j]) };
    });
    return drop.size ? sets.filter((s, i) => !drop.has(i)) : sets;
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
  /* v74: "Training elsewhere" (know.back, coach-ask.js q_back_what) — the
     near step back whatever the gap, never the far one: the group kept
     working where Coach could not see it. The gate itself does not move. */
  const f = gg > GROUP_FAR_DAYS && !lift.back ? REENTER_FAR : gg >= GROUP_NEAR_DAYS ? REENTER_NEAR : null;
  if (f) {
    const repsNow = last.top.map(() => lo);
    const days = gg + ' days since ' + sinceWhat + '.' + (lift.back ? ' ' + KEPT_TRAINING : '');
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
        why: finish([days + (last.grid ? ' I don’t have a lighter weight of yours to point to.' : ' ' + offGrid)], false),
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
  /* v74: a drop he said he is building back from (knowBy.hold 'hold') is not
     a new programme either — the test stands for a jump UP and for a change
     of scheme, and the decision below runs on the lower load, where the
     held add keeps it. A lighter week ('light') has already moved `prev`. */
  const jumped = !!prev && Math.abs(last.T - prev.T) > SHAPE_JUMP * prev.T && daysBetween(prev.startedAt, last.startedAt) <= GAP_DAYS;
  const heldDrop = lift.hold === 'hold' && jumped && lift.dir * (prev.T - last.T) > 0;
  if (prev && (prev.scheme !== last.scheme || (jumped && !heldDrop))) {
    return defer('shape', 'No target this time.', ['Your last two sessions of this lift were set up differently.']);
  }
  // 9. Reps too far apart to carry a number.
  if (Math.max(...last.R) - Math.min(...last.R) >= ERRATIC_SPREAD) {
    return defer('erratic', 'No target this time.', ['Last session’s sets varied a lot (' + reps(last.R) + ').']);
  }
  // A starting band last time does not sit inside is a band he never chose.
  if (!range.usable) {
    return defer('range', 'No target yet.', ['A few more sessions of this lift and I’ll know your rep range.']);
  }

  /* ---------- the decision ---------- */
  // v69: the held-load band stretches the same way — it is learned at one
  // load, so like the default band it says nothing about what a jump this
  // size does to the reps.
  const micro = (range.source === 'default' || !!range.held) && S && (T <= 0 || S / T > MICRO_SHARE);
  const hiEff = range.hi + (micro ? MICRO_REPS : 0);
  /* v54: HIS RATING, two of spec §6.4's RIR rules and no more (SHIP-V54-PROMPT
     §5.3). A top set rated too hard (rir 0) means the session did not hit the
     top, whatever its reps: not a miss, not a stall — the same again. Every
     rated set at the target's load rated way too easy (rir 4+), none typed F
     and every set at its target's reps (easyAt, below) counts as hitting it:
     through the confirm dial, and never more than one step. A session with no
     rating takes exactly the path it always took, and a replay (`c.plain`)
     reads no rating at all. */
  const rated = !c.plain;
  const tooHardAt = e => rated && e.top.some(s => rirOf(s) === 0);
  const repsHit = last.R.every(r => r >= hiEff);
  const tooHard = repsHit && tooHardAt(last);
  const easy = !repsHit && rated && easyAt(X.length - 1);
  const hitTop = (repsHit && !tooHard) || easy;
  const inRange = Math.min(...last.R) >= lo;
  const anyF = last.top.some(s => s.type === 'F');
  const triples = last.scheme === 'straight' && range.fixed && range.lo <= 3;
  const stepOut = step ? { value: step.value, n: step.n, source: step.source } : null;
  const who = last.k === 1 ? 'Your top set' : 'Every set';
  // "185 lb × 8", or "185 lb for 8, 8, 9" — the rated top sets, said once.
  const topSaid = e => shown(e.all[e.top[0].i].w) +
    (e.R.every(r => r === e.R[0]) ? ' × ' + e.R[0] : ' for ' + reps(e.R));

  /* WAY TOO EASY, AT THE TARGET: the session X[k] against the target Coach
     would have set before it — replayed with no rating read (`plain`), so a
     replay never replays. Its top load is the target's load; every rated set
     there is rated 4 or more; no set of it is typed F; and every set at that
     load or above reached the target's reps (the shipped "met" test of
     targetsReplay, and every set, not only the best of them). The replay has
     no group clock (`groupDaysSince` null), so on a lift back from time off it
     can differ from the target he saw — and a different load is no match, so
     the rule then says nothing, which is the safe way round. */
  function easyAt(k) {
    const e = X[k];
    if (!e || e.work.some(s => s.type === 'F')) return false;
    const atT = e.work.filter(s => s.type !== 'D' && Math.abs(s.L - e.T) < GRID_TOL);
    const marks = atT.map(s => rirOf(s)).filter(v => v != null);
    if (!marks.length || !marks.every(v => v >= 4)) return false;
    const before = (Array.isArray(ex.exposures) ? ex.exposures : []).filter(x => x && x.startedAt < e.startedAt);
    const t0 = before.length ? decide({ ...ex, exposures: before, groupDaysSince: null }, { ...c, now: e.startedAt, plain: true }) : null;
    if (!t0 || t0.loadLb == null) return false;
    const TL = r2(wOut(t0.loadLb, u));
    if (Math.abs(TL - e.T) >= GRID_TOL) return false;
    const want = t0.sets.filter(x => x.type !== 'W' && Math.abs(r2(wOut(parseFloat(x.tw) || 0, u)) - TL) < GRID_TOL)
      .map(x => parseInt(x.tr, 10)).filter(Number.isFinite).sort((a, b) => b - a);
    const did = e.work.filter(s => s.type !== 'D' && s.L >= TL - GRID_TOL).map(s => s.R).sort((a, b) => b - a);
    return want.length > 0 && did.length >= want.length && want.every((r, j) => did[j] >= r) &&
           did.every(r => r >= want[want.length - 1]);
  }

  // Too hard at the top: the same again — same weight, same reps.
  if (tooHard) {
    const trs = last.R;
    return out({ mode: 'hold', code: 'hard', loadLb: last.grid ? loadLbOf(lastW) : null,
      sets: setsFor(null, trs),
      line: last.grid ? loadLine(lastW, trs, ' again') : noLoadLine('same weight as last time', trs),
      why: finish(['Last time ' + topSaid(last) + ' felt too hard, so it’s the same again.'].concat(last.grid ? [] : [offGrid]), last.grid),
      stage, range: rangeOut, step: stepOut, ...common });
  }
  /* v74: "EASE OFF" (knowBy.wantNext for this lift's shape, answered after its
     last session): every target that would add weight or a rep holds last
     time's load and reps instead. A miss below the range keeps its own rule —
     easing off is not a reason to call a reduction something else. The
     builder drops a set per lift for the same answer (coach-build.js). */
  if (lift.wantNext === 'ease' && (hitTop || inRange)) {
    const trs = last.R;
    return out({ mode: 'hold', code: 'ease', loadLb: last.grid ? loadLbOf(lastW) : null,
      sets: setsFor(null, trs),
      line: last.grid ? loadLine(lastW, trs, ' again') : noLoadLine('same weight as last time', trs),
      why: finish(['Holding, as you asked after last time.'].concat(last.grid ? [] : [offGrid]), last.grid),
      stage, range: rangeOut, step: stepOut, ...common });
  }
  // How the range is named: his own, or the labelled starting band — and when
  // a big jump has stretched that band's top by two, said so.
  const band = range.lo + '–' + range.hi;
  // v69: a range held at one load for three sessions is said as what it is.
  const heldAt = range.held ? shown(store(range.heldT)) : null;
  const topOf = () => range.held ? (micro ? ', two past the top of the ' + band + ' you’ve shown there before a jump this size.'
                                          : ', the top of the ' + band + ' you’ve shown there.')
    : range.source === 'yours' ? ', the top of your ' + band + '.'
    : micro ? ', two past the top of ' + band + ' (a common starting range) before a jump this size.'
    : ', the top of ' + band + ', a common starting range.';
  const inside = () => range.held ? 'Inside the ' + band + ' you’ve held ' + heldAt + ' at for three sessions'
    : range.source === 'yours' ? 'Inside your ' + band
    : 'Inside ' + range.lo + '–' + hiEff;
  const insideTail = () => range.held ? (micro ? ' Two more past the top of it before a jump this size.' : '')
    : range.source === 'yours' ? ''
    : micro ? ' That is ' + band + ', a common starting range, plus two before a jump this size.'
    : ' ' + band + ' is a common starting range.';

  if (hitTop) {
    /* v74: "BUILDING BACK UP — HOLD IT" (knowBy.hold 'hold', inside its 42
       days): a top he reached never earns the step up; the load stays where
       he put it until he takes it higher himself. Before the confirm dial, so
       the line says why rather than asking to see it twice. */
    if (lift.hold === 'hold') {
      const trs = last.R;
      return out({ mode: 'hold', code: 'held', loadLb: last.grid ? loadLbOf(lastW) : null,
        sets: setsFor(null, trs),
        line: last.grid ? loadLine(lastW, trs, ' again') : noLoadLine('same weight as last time', trs),
        why: finish(['Holding ' + String(ex.name || lift.exId) + (last.grid ? at + shown(lastW) : '') +
                     ' while you build back, as you asked.'].concat(last.grid ? [] : [offGrid]), last.grid),
        stage, range: rangeOut, step: stepOut, ...common });
    }
    /* v74: "PUSH IT" (knowBy.wantNext 'push' for this lift's shape): one look
       is enough — unless the load is heavy (triples), he is cutting or
       holding, or the deficit is deep, which keep their own reasons for two.
       One step at most, as the rating rule says: `steps` never reads it. */
    const pushes = lift.wantNext === 'push' && !triples && c.aim !== 'cut' && c.aim !== 'maintain' && c.energy !== 'deep';
    const need = triples ? 2 : pushes ? 1 : dials.confirm;
    // v54: the session before counts by the same two rules — at the top and
    // not rated too hard there, or rated way too easy at its target.
    const prevAt = !!prev && Math.abs(prev.T - T) < GRID_TOL;
    const prevTop = prevAt && prev.R.every(r => r >= hiEff) && !tooHardAt(prev);
    const prevEasy = prevAt && !prevTop && rated && need !== 1 && easyAt(X.length - 2);
    const prevHit = prevTop || prevEasy;
    const reached = easy ? 'Last time you rated ' + topSaid(last) + ' way too easy'
                         : who + ' reached ' + hiEff + at + shown(lastW);
    if (!(need === 1 || prevHit)) {
      // Wanting a second look: say which of the reasons asked for it.
      let because;
      if (triples) because = 'With sets this heavy, I want to see it twice.';
      else if (c.energy === 'deep') {
        because = (Number.isFinite(c.rateWk) && c.rateWk < 0
          ? 'Your weight is coming down about ' + labelRate(-c.rateWk, u) + ' a week'
          : 'Your weight is coming down fast') + ', so I want to see it twice before adding weight.';
      } else if (c.aim === 'cut') because = 'You’re cutting, so I want to see it twice before adding weight.';
      else if (c.aim === 'maintain') because = 'You set Stay consistent, so I want to see it twice before adding weight.';
      else {
        // The fitted move across the window, in his unit; under one unit it
        // is said as level rather than as "about 0 lb".
        const mv = prog.moveLb != null ? Math.abs(prog.moveLb) : 0;
        because = 'Your estimated max here has ' +
          (Math.round(wOut(mv, u)) === 0 ? 'held about level' : 'moved about ' + labelW(mv, u)) +
          ' over your last ' + plural(prog.points, 'session') + ', so I want to see it twice.';
      }
      const trs = last.R;
      return out({ mode: 'hold', code: 'confirm', loadLb: last.grid ? loadLbOf(lastW) : null,
        sets: setsFor(null, trs),
        line: last.grid ? loadLine(lastW, trs, ' again') : noLoadLine('same weight as last time', trs),
        why: finish([reached + '. ' + because].concat(last.grid ? [] : [offGrid]), last.grid),
        stage, range: rangeOut, step: stepOut, ...common });
    }
    let steps = 1;
    // A rating earns one step and never two (v54) — whether it made this
    // session the top or gave the confirm dial its first look.
    if (!easy && !(need !== 1 && prevEasy) && dials.maxSteps >= 2 && lift.lowerBody && lift.equipment === 'barbell' && !anyF &&
        last.R.every(r => r >= hiEff + TWO_STEP_REPS)) steps = 2;
    const trs = last.top.map(() => lo);
    const head = (easy ? reached + '.'
      : steps === 2
      ? (last.k === 1 ? 'Your top set went' : 'Every set went') + ' two or more past ' + hiEff + at + shown(lastW) + ', so two jumps.'
      : reached + onDay(last) + (range.fixed ? '.' : topOf())) +
      (pushes ? ' You asked me to push it on this kind of day.' : '');
    if (!last.grid || !S) {
      const stepsWord = lift.equipment === 'dumbbell' ? 'the dumbbell steps where you train'
        : ['machine', 'cable', 'plate'].includes(lift.equipment) ? 'this machine’s steps' : 'the steps on this lift';
      return out({ mode: 'add', code: null, loadLb: null, sets: setsFor(null, trs),
        line: noLoadLine('the next setting up', trs),
        why: finish([head, last.grid ? 'I don’t know ' + stepsWord + ' yet, so I won’t guess a number.' : offGrid], false),
        stage, range: rangeOut, step: stepOut, ...common });
    }
    const P = r2(T + lift.dir * steps * S);
    if (P <= 0) {
      // Assistance stepped to nothing: unassisted, and no number in the box.
      return out({ mode: 'add', code: null, loadLb: null, sets: setsFor(null, trs),
        line: noLoadLine('unassisted', trs), why: finish([head], false),
        stage, range: rangeOut, step: stepOut, ...common });
    }
    /* v69: THE LAST FENCE. Never a heavier single or double, whatever the
       branches above worked out: a top set of two reps or fewer at a load
       past last time's is a max attempt in all but name. Unreachable after
       the heavy gate and the range fence; it is the line a verifier holds. */
    if (trs.some(r => r <= HEAVY_REPS) && lift.dir * (P - T) > GRID_TOL) {
      return defer('heavy', heavyLine,
        ['The next step here would be a heavier set of ' + Math.min(...trs) + ', and I won’t call one of those.']);
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
    const why = [range.held ? inside() + ', and ' + reps(last.R) + at + shown(lastW) + ' last time.' + insideTail()
                            : inside() + at + shown(lastW) + ' last time (' + reps(last.R) + ').' + insideTail()];
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
        why: finish([head + ' ' + (last.grid ? 'I don’t know the steps on this one yet, so I won’t guess a lighter number.' : offGrid)], false),
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

/* ================================================================
   5.  A MARKED SESSION (v52, Micah's decision #9)
   ================================================================
   targetFor(ex, ctx, mark) -> the target, with his bad-day marks honoured.
   ADDITIVE: with no mark it IS prescribe(), byte for byte, and every caller
   that names a target comes through here — the builder, "What's next time?",
   a target replayed before a session, the stall ladder's reset.

   A MARK STOPS A SESSION COUNTING AGAINST HIM, AND NEVER LETS IT COUNT FOR
   HIM. It says the numbers that day were not representative; it does not say
   the session did not happen. This file imports nothing new for it, so the
   caller (coach.js, the one place the two logs are built) hands everything
   over as data:

     mark = null | {
       markedAt  Set of the lift's marked exposures' startedAt
       exposures those marked exposures themselves, so the log's own target
                 can be read when an exposure list arrives with them already
                 taken out (the overlap's lifts are the performance log)
       latest    null, or — when the lift's MOST RECENT exposure is marked —
                 { word, exposures (the ones before it, other marks out),
                   groupDaysSince (the group clock as of its start), now (its
                   startedAt) }
     }

   THE LATEST EXPOSURE MARKED: the target Coach would have set BEFORE that
   session — the same attempt again. Not the target from dropping it: that
   quotes the session before as "last time" and can step lighter than he was
   already lifting. The decision and its numbers are kept (mode, load, the
   per-set targets); its whole `why` is replaced, because every line of it is
   worded from that morning ("yesterday", "last time (8, 7, 7)"), and "last
   time" in the target line itself says "before your marked session" — last
   time, today, is the marked session. A marked first-ever exposure has no
   target from before it, and the answer is silence rather than "first time on
   this lift", which would be false.

   MARKED EXPOSURES EARLIER ON are left out of what prescribe() reads: never a
   miss, never a success, never a point in the series. One rule more: two
   misses at one weight are "two sessions in a row" only when nothing sat
   between them, so a reduce read across a marked session — which the log
   without the mark would not make — gives way to the log's own target. A mark
   never produces a reduce. */
export function targetFor(ex, ctx, mark) {
  if (!mark) return prescribe(ex, ctx);
  try {
    const e = ex || {}, c = ctx || {};
    const markedAt = mark.markedAt instanceof Set ? mark.markedAt : new Set();
    const L = mark.latest;
    if (L && Array.isArray(L.exposures) && Number.isFinite(L.now)) {
      if (!L.exposures.length) return null;
      const t = prescribe({ ...e, exposures: L.exposures, groupDaysSince: L.groupDaysSince }, { ...c, now: L.now });
      if (!t) return null;
      const before = Math.max(...L.exposures.map(x => x.startedAt));
      const from = t.from && Number.isFinite(c.now) ? { ...t.from, daysAgo: daysBetween(before, c.now) } : t.from;
      return {
        ...t, from, marked: true,
        line: t.line.replace(/last time/g, 'before your marked session'),
        why: ['Your last session is marked (' + String(L.word || 'marked') + '), so this is the target from before it.',
              'That session doesn’t count against your numbers.']
      };
    }
    const all = Array.isArray(e.exposures) ? e.exposures : [];
    const kept = all.filter(x => !markedAt.has(x.startedAt));
    const t = prescribe(kept.length === all.length ? e : { ...e, exposures: kept }, c);
    if (t && t.mode === 'reduce' && kept.length >= 2) {
      const a = kept[kept.length - 2].startedAt, b = kept[kept.length - 1].startedAt;
      if ([...markedAt].some(m => m > a && m < b)) {
        const back = (Array.isArray(mark.exposures) ? mark.exposures : []).filter(x => !kept.some(k => k.startedAt === x.startedAt));
        const whole = prescribe({ ...e, exposures: kept.concat(back).sort((x, y) => x.startedAt - y.startedAt) }, c);
        if (whole && whole.mode !== 'reduce') return whole;
      }
    }
    return t;
  } catch {
    return null;
  }
}

/* ================================================================
   6.  THE NEXT SET (v54, stage five — spec §3.10, with his rating)
   ================================================================
   nextSet(ex, ctx, today) -> null | {
     kind    'target'  before the first working set today: the session's target
             'warmup'  (v70) a warm-up ticked — typed W, or read as one by
                       coach-ramp.js against the target's load — and nothing
                       working yet: "Warming up. The target when you get
                       there: …", the target's own numbers and no other
             'up'      one of this lift's own steps over the target, once a session
             'same'    the same weight again
             'down'    one step lighter, to a weight he has logged on this lift
             'stop'    after a set to failure, a set rated too hard, or reps down
                       a quarter: never heavier — the same weight, or call it there
     tw, tr  the next set's target, stored pounds as a string (the box's own
             shape) and reps; `loadLb` the same weight as a number
     text    "Next set: 185 lb × 8."    why   the reasons, each with its number
     stepped whether today's sets are already a step over the target }

     ex     prescribe()'s, with its `mark` (targetFor's third argument)
     ctx    prescribe()'s, plus `repDrop` — coach-live.js's REP_DROP, handed in
            by coach.js: this file never imports that one, and a second copy of
            the constant is how two rules drift
     today  the live session's ticked sets of this lift, in order — warm-ups
            included since v70, so a ramp can be seen for one: { w, r, type,
            done?, rir? }. A set with `done: false` is not read; a set with no
            `done` key is one the caller already filtered to the ticked

   MID-WORKOUT IS THE MOST SENSITIVE PLACE COACH SPEAKS, so this is the
   narrowest reader in the file. Straight sets only (two or more at the
   target's load), a loaded target only, and never an assisted lift. EVERY
   NUMBER IT GIVES IS THE TARGET, ONE OF THIS LIFT'S OWN STEPS ABOVE IT, A LOAD
   HE HAS LOGGED, OR A QUOTE OF THE SET HE JUST DID. No step known, no step up:
   "the same again" is always a complete answer. And once a set is typed F,
   rated too hard, or comes in a quarter under the first at the same or a
   lighter weight, nothing it says for the rest of today is heavier than the
   set he just did. About right (rir 2) moves nothing here; it is kept for the
   next session's read. Pure, no clock but ctx.now; null on anything it cannot
   read. */
const LOADED = Object.freeze(['add', 'reps', 'hold', 'reduce', 'reenter']);
const UP_REPS = 2;

export function nextSet(ex, ctx, today) {
  try {
    return nextOf(ex || {}, ctx || {}, Array.isArray(today) ? today : []);
  } catch {
    return null;
  }
}

function nextOf(ex, c, today) {
  const u = c.u === 'kg' ? 'kg' : 'lb';
  if (!Number.isFinite(c.now) || !(c.repDrop > 0 && c.repDrop < 1) || ex.equipment === 'cardio') return null;
  const t = targetFor(ex, c, ex.mark || null);
  if (!t || t.loadLb == null || !LOADED.includes(t.mode)) return null;
  const lift = liftOf(ex, dialsFor({ aim: c.aim, exp: c.exp, energy: c.energy }));
  if (lift.assisted) return null;
  const unit = unitW(u);
  const shown = w => fmtSetLoad(w, u) + ' ' + unit;
  const L = w => r2(wOut(parseFloat(w) || 0, u));

  // The target's own sets at its load: two or more is a straight scheme, and
  // their reps, in order, are the target's reps by position. A heavier set on
  // the target — a top set with back-offs — is not a straight scheme.
  const TL = L(t.loadLb);
  if (!onGrid(TL)) return null;
  const main = t.sets.filter(x => x.type !== 'W' && !x.ramp && x.tw !== '' && x.tw != null);
  const atT = main.filter(x => Math.abs(L(x.tw) - TL) < GRID_TOL);
  if (atT.length < 2 || main.some(x => L(x.tw) > TL + GRID_TOL)) return null;
  const want = atT.map(x => parseInt(x.tr, 10)).filter(n => n >= 1);
  if (want.length < 2) return null;
  const twT = atT[0].tw;
  const trAt = k => want[Math.max(0, Math.min(k, want.length - 1))];

  // His step and his range, from the same log the target read — the marked
  // sessions out, as targetFor() leaves them out.
  const m = ex.mark;
  const src = m && m.latest && Array.isArray(m.latest.exposures) ? m.latest.exposures
    : (Array.isArray(ex.exposures) ? ex.exposures : []).filter(x => !(m && m.markedAt instanceof Set && m.markedAt.has(x.startedAt)));
  const X = readAll(src, u, false, c.now, lift.warm);
  const known = rampLoads(src.map(allOf), { warm: lift.warm });
  const step = X.length ? stepOf(X, 1, lift.equipment, lift.lowerBody, u, lift.stepTold) : null;
  const S = step ? step.value : null;
  const range = X.length ? rangeOf(X, c.now, 1, lift.band) : null;
  const logged = P => X.some(e => e.work.some(s => Math.abs(s.L - P) < GRID_TOL));
  const store = P => (u === 'kg' ? String(wIn(P, 'kg')) : num(P));

  // v70: today's sets split by the ramp model, with the target's load as the
  // top and his own ramp loads from the log beside it — so half way up a
  // ramp, before anything at the target has been ticked, the bar set is a
  // warm-up and not "the first working set". A ticked row typed W, and a
  // probable warm-up, are both out of `done`.
  const ticked = today.filter(s => s && s.done !== false && parseInt(s.r, 10) >= 1);
  const habit = rampProfile(src, { warm: lift.warm }).stage === 'yours';
  // His last top load on the lift, stored pounds: what a target that came
  // down (a re-entry, a reduction) is still a step down from.
  const lastAll = X.length ? allOf(src[src.length - 1]) : [];
  const anchor = Math.max(0, ...lastAll.filter(s => s && s.type !== 'W' && s.type !== 'D' && parseInt(s.r, 10) >= 1).map(s => parseFloat(s.w) || 0));
  const ramp = rampOf(ticked, { T: t.loadLb, known, R: trAt(0), habit, anchor, warm: lift.warm });
  const split = ticked.filter((s, i) => ramp.workIdx.has(i));
  // v70: UNSURE — Coach says nothing rather than guess. The tiers read a set's
  // shape, and before anything has reached the target the same shape is both
  // things: a target that came down (a re-entry, a reduction, a hold under a
  // stale best) puts a real ramp set at 89% of it, and a deload puts a real
  // working set at 80%. Quoting the ramp set as the next working set, or
  // calling the working set a warm-up, is a wrong number; no number is the
  // honest one. So, with nothing at the target yet, a set that is not a
  // warm-up he typed or always does gets no answer — until the sets say it
  // plainly (a fail, a too-hard rating, more reps than any warm-up, a third
  // set at one load: rampOf's `plain`). And the FIRST set at the target is
  // not yet the top when its reps say it may be a rung on the way past: half
  // the plan's reps or fewer (15 × 3 on the way to 20 when the plan said 15 ×
  // 10), or short of the plan on a target under his last top (107.5 × 4 for a
  // plan of 7 after a reduction, with 125 his last top): either a bad set, or
  // a ramp through a stale target, and the second set at that load settles it.
  // A set just under the top is plain too — within the heavy tier of the
  // heavier of the target and his last top, for more than a triple: 305 × 6
  // under a 320 target is a working set he chose, and no rung sits there (a
  // heavy opener is a single or a double). The ramp rows are on the screen
  // already (v68); nothing is lost but a guess.
  const isTop = s => (s.type || 'N') !== 'W' && s.type !== 'D' && parseFloat(s.w) >= t.loadLb - GRID_TOL;
  const atTop = ticked.filter(isTop);
  const nearTop = s => (s.type || 'N') === 'N' && parseFloat(s.w) >= RAMP_HEAVY * Math.max(t.loadLb, anchor) - GRID_TOL && parseInt(s.r, 10) > RAMP_HEAVY_TRIPLE;
  const plain = ramp.plain || ticked.some(s => s.type === 'F' || s.type === 'D' || rirOf(s) === 0 || parseInt(s.r, 10) > RAMP_LIGHT_REPS);
  const topR = atTop.length === 1 ? parseInt(atTop[0].r, 10) : null;
  // The target came down: Coach's own reduce or re-entry, or a load under his last top.
  const under = atTop.length === 1 && (t.mode === 'reduce' || t.mode === 'reenter' || parseFloat(atTop[0].w) < anchor - GRID_TOL);
  const unsure = !plain && (atTop.length ? (topR != null && (topR * 2 <= trAt(0) || (under && topR < trAt(0))))
                                         : (!ticked.some(nearTop) && ticked.some((s, i) => !ramp.sureIdx.has(i))));
  if (unsure) return null;
  const W = split.map(s => ({ w: String(s.w == null ? '' : s.w), L: L(s.w), R: parseInt(s.r, 10), type: s.type || 'N', rir: rirOf(s) }));
  const done = W.filter(s => s.type !== 'D');
  const res = (kind, tw, tr, why, extra) => ({
    exId: lift.exId, kind, tw: String(tw), tr: String(tr), loadLb: loadLbOf(tw), reps: tr,
    text: 'Next set: ' + shown(tw) + ' × ' + tr + '.', why, stepped: false, ...extra
  });
  const targetLine = 'My target for this lift today: ' + t.line.replace(/^Target: /, '');

  // v70: WARMING UP — a warm-up ticked (typed W, or read as one) and nothing
  // working yet. The target is named, as the thing he is working up to, and
  // no set is called "next": the ramp rows are already on the screen (v68).
  const warmed = ticked.some(s => !split.includes(s));
  if (!done.length && warmed) {
    return res('warmup', twT, trAt(0), [targetLine],
               { warmup: true, text: 'Warming up. The target when you get there: ' + shown(twT) + ' × ' + trAt(0) + '.' });
  }
  // Before the first working set today: the session's target.
  if (!done.length) {
    return res('target', twT, trAt(0), [targetLine]);
  }
  const k = done.length;
  const last = done[k - 1];
  const stepped = done.some(s => s.L > TL + GRID_TOL);
  // v70: and no step up after a step down — a set ticked lighter than the one
  // before it today says the session is not going up, whatever its reps.
  const steppedDown = done.some((s, j) => j > 0 && s.L < done[j - 1].L - GRID_TOL);

  // STOP — any set typed F, any rated too hard, or reps down a quarter from the
  // first working set at the same or a lighter weight (REP_DROP, handed in).
  // v55: the rep drop is read between the sets that are not a drop set's
  // (`done`): a drop set's reps fall at a lighter weight by design.
  const first = done[0];
  const drop = done.slice(1).find(s => s.L <= first.L && s.R <= first.R * (1 - c.repDrop));
  const why0 = W.some(s => s.type === 'F') ? 'A set of it went to failure today.'
    : W.some(s => s.rir === 0) ? 'You rated a set of it too hard today.'
    : drop ? 'Your reps went from ' + first.R + ' to ' + drop.R + ' at the same or a lighter weight today.' : null;
  if (why0) {
    return res('stop', last.w, trAt(k), [why0, 'Nothing heavier on it for the rest of today. Stopping a set early costs nothing.'],
               { stop: true, stepped });
  }

  // UP — two reps past the target at its weight, or rated way too easy at its
  // weight and reps: one step, once a session.
  const target = trAt(k - 1);
  const wouldEarn = last.L >= TL - GRID_TOL && (last.R >= target + UP_REPS || (last.rir != null && last.rir >= 4 && last.R >= target));
  const earned = wouldEarn && !steppedDown;
  const how = last.R >= target + UP_REPS
    ? plural(last.R, 'rep') + ' at ' + shown(last.w) + ', ' + UP_REPS + ' or more past the target’s ' + target + '.'
    : 'You rated ' + shown(last.w) + ' × ' + last.R + ' way too easy.';
  if (wouldEarn && steppedDown) {
    return res('same', last.w, trAt(k), [how, 'I don’t step up after a step down in the same session.'], { stepped });
  }
  if (earned && stepped) {
    return res('same', last.w, trAt(k), [how, 'I go up one step in a session, and today’s is used.'], { stepped: true });
  }
  if (earned && S) {
    const P = r2(TL + S);
    // Every weight said mid-session is a quote or a target, so the step is
    // named by what it steps from, never as a size of its own.
    return res('up', store(P), trAt(k), [how,
      'One step over the target’s ' + shown(twT) + ', once in a session' +
      (step.source === 'yours' ? ': your usual jump on this lift.' : step.source === 'told' ? ': the step you told me.' : ': a common starting jump for this kind of lift.')]);
  }

  // DOWN — reps under the range's low end: the same weight, or one step down
  // when that lighter weight is one he has logged on this lift.
  if (range && last.R < range.lo) {
    const P = S ? r2(last.L - S) : null;
    if (P != null && P > 0 && onGrid(last.L) && logged(P)) {
      return res('down', store(P), trAt(k), [plural(last.R, 'rep') + ' at ' + shown(last.w) + ', under the ' + range.lo + ' at the bottom of your range.',
        shown(store(P)) + ' is a weight you’ve lifted here before.'], { stepped });
    }
    return res('same', last.w, trAt(k), [plural(last.R, 'rep') + ' at ' + shown(last.w) + ', under the ' + range.lo + ' at the bottom of your range.',
      'The same weight again.'], { stepped });
  }

  // Otherwise: the same weight, at the target's reps.
  return res('same', last.w, trAt(k), [earned
    ? how + ' I don’t know this lift’s steps yet, so I won’t guess a heavier number.'
    : plural(last.R, 'rep') + ' at ' + shown(last.w) + ' against the target’s ' + target + '. The same again.'], { stepped });
}
