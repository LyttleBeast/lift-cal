// Coach's goal — what he is training for, how long he has been at it, and the
// dials those two answers turn when coach-prog.js works out a target.
//
// THE GOAL IS TWO ANSWERS TO COACH'S OWN QUESTIONS (q_goal_aim, q_experience
// in coach.js), not a record of its own. Answers already validate against
// their options, stamp when they were given and show in Settings → Coach; a
// `goal` object beside them would be a second record of the same fact, and
// the second record is always the one that goes stale.
//
// WITH NO AIM, TARGETS STILL WORK. The `none` row is a real row: the aim only
// turns the dials, so the questions are a refinement and never a gate.
//
// Every dial is a small integer or a pair of rep counts. None of them is ever
// printed as a threshold; each carries its one-line why beside it, and
// tools-check/coach-goal.mjs checks dialsFor() against THIS table rather than a
// copy of it.
//
// PURE, and copied into the native tree verbatim (src/pure/coach-goal.js).
// Imports nothing, reads nothing, keeps no state, and has no clock: v49's
// bodyweight-at-a-moment takes its moment as an argument.

/* The six aims, in the order the question offers them. Powerlifting is its own
   aim rather than a label on Get stronger (Micah, 23 Sep 2026): tonight it
   differs in its bands, and later stages give it the big three. */
export const AIMS = Object.freeze(['strength', 'powerlifting', 'muscle', 'cut', 'recomp', 'maintain']);

/* Under 6 months, 6 months to 2 years, 2 years or more. Unanswered reads as
   the middle: nothing below treats a missing answer as `new`. */
export const EXPERIENCE = Object.freeze(['new', 'some', 'years']);

/* THE DIALS. One row per aim, plus `none` for an account with no aim.

     confirm   how many sessions at the top of the range before weight goes on.
               One is classic double progression; two is NSCA's 2-for-2 rule,
               worth its week exactly when recovery is squeezed
     maxSteps  the most jumps one session may add. Two only ever applies to a
               lower-body barbell lift that cleared the top by two reps
     band      the default rep range, before his own log shows where he moves
               up — compound lifts and isolation lifts. Always labelled as a
               starting point where it is used */
const row = (confirm, maxSteps, compound, isolation) => Object.freeze({
  confirm, maxSteps,
  band: Object.freeze({ compound: Object.freeze(compound), isolation: Object.freeze(isolation) })
});
export const DIALS = Object.freeze({
  // Heavier loads favour strength; accessories stay moderate.
  strength:     row(1, 2, [3, 6],  [8, 12]),
  // Micah's 23 Sep answer: its own goal, not a label on Get stronger. Tonight it
  // differs in its bands (competition-style 3–5, heavier accessories 6–10);
  // later stages give it the big three (pace on squat, bench and deadlift).
  powerlifting: row(1, 2, [3, 5],  [6, 10]),
  // Growth is similar across a wide range when sets are hard; these keep loads practical.
  muscle:       row(1, 1, [6, 10], [10, 15]),
  // A heavy stimulus through a cut, and two sessions at the top before a jump.
  cut:          row(2, 1, [5, 8],  [10, 15]),
  // The middle of the road.
  recomp:       row(1, 1, [6, 10], [10, 15]),
  // Someone maintaining is not chasing numbers: slower and surer suits them.
  maintain:     row(2, 1, [6, 10], [10, 15]),
  // No aim set: confirm once, one jump, the middle band.
  none:         row(1, 1, [6, 10], [10, 15])
});

/* THE ENERGY CONTEXT, in % of bodyweight per week off the weight trend. */
// Garthe 2011: 0.7%/wk kept strength, 1.4% did worse — past this is a hard cut.
export const ENERGY_DEEP = -0.75;
// Inside ±0.25, a week's trend is mostly scale noise.
export const ENERGY_DEFICIT = -0.25;
export const ENERGY_SURPLUS = 0.25;
// Two weeks of weigh-ins before a trend is read as a phase rather than a blip.
export const ENERGY_MIN_DAYS = 14;

/* Float noise must not move a rate that sits exactly on a bar to the wrong side
   of it: −1.35 lb a week on 180 lb is −0.75%, and in binary it comes out a hair
   past it. Far below anything a scale can resolve. */
export const ENERGY_EPS = 1e-9;

/* 'deep' | 'deficit' | 'hold' | 'surplus', or null when the trend cannot carry
   a reading: no rate, no bodyweight to scale it by, or fewer than two weeks of
   weigh-ins behind it. `rateDays` null is the two-weekly-averages fallback,
   which by construction spans two weeks already. */
export function energyContext(w) {
  const o = w && typeof w === 'object' ? w : {};
  const { rateWk, latestLb, rateDays } = o;
  if (!Number.isFinite(rateWk)) return null;
  if (!Number.isFinite(latestLb) || latestLb <= 0) return null;
  if (rateDays != null && !(Number.isFinite(rateDays) && rateDays >= ENERGY_MIN_DAYS)) return null;
  return energyBand(rateWk / latestLb * 100);
}

/* The four words for a weekly change in % of bodyweight — the one place the
   bars above are compared against. energyContext() reads the whole trend
   through it, and v49's plateau-or-cut call (coach-overlap.js) and the
   goal-change question (coach.js) read a stretch of weigh-ins through it, so
   the three can never disagree about where a cut starts. */
export function energyBand(pct) {
  if (!Number.isFinite(pct)) return null;
  if (pct <= ENERGY_DEEP + ENERGY_EPS) return 'deep';
  if (pct <= ENERGY_DEFICIT + ENERGY_EPS) return 'deficit';
  if (pct >= ENERGY_SURPLUS - ENERGY_EPS) return 'surplus';
  return 'hold';
}

/* BODYWEIGHT AT A MOMENT (v49): the median of the weigh-ins in the seven days
   up to and including `ms`, or null with fewer than two. A median, because one
   heavy morning is a scale reading and not a bodyweight; two, because one
   reading is exactly that morning. The only bodyweight function the plateau
   call and the goal-change question use — here rather than in either of them
   so this file can keep importing nothing. Pounds in, pounds out. */
export const BW_WINDOW_DAYS = 7;
export const BW_MIN_READINGS = 2;
export function bwAt(weighIns, ms) {
  if (!Array.isArray(weighIns) || !Number.isFinite(ms)) return null;
  const from = ms - BW_WINDOW_DAYS * 864e5;
  const v = weighIns
    .filter(w => w && Number.isFinite(w.lb) && w.lb > 0 && Number.isFinite(w.t) && w.t > from && w.t <= ms)
    .map(w => w.lb).sort((a, b) => a - b);
  if (v.length < BW_MIN_READINGS) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/* WEEKLY HARD SETS FOR A LIFT'S GROUP, the floor under which "more sets" is a
   rung of the stall ladder (v49). A labelled training starting point, always
   printed as "a common starting point": ten or more a week per muscle is the
   most studied range for growth (Schoenfeld 2017; Pelland 2024 finds
   diminishing returns, not a ceiling), and strength needs less volume and more
   practice with the lift. A cut aims to KEEP what he has, so its floor is his
   own normal — two thirds of it — and that row lives in volumeFloor(). */
export const VOLUME_FLOOR = Object.freeze({
  muscle: 10, recomp: 10, none: 10,
  strength: 6, powerlifting: 6, maintain: 6
});
// Lose fat, keep strength: two thirds of his own twelve-week normal.
export const VOLUME_CUT_SHARE = 2 / 3;
/* v56: `main` is whether the group carries one of MAIN_LIFTS below. Get
   stronger's and Powerlifting's 6 is "for the groups carrying the main lifts"
   (spec §6.2, §8.2), so a group that carries none — `main` false — gets the
   common range's floor instead. Left out, it is the aim's own floor, as
   before: the weekly volume answer and the stall ladder both pass it, so the
   two still read one floor per group and can never disagree. */
export function volumeFloor(aim, normal, main) {
  if (aim === 'cut') return Number.isFinite(normal) && normal > 0 ? Math.floor(normal * VOLUME_CUT_SHARE) : null;
  const a = AIMS.includes(aim) ? aim : 'none';
  return VOLUME_FLOOR[main === false && MAIN_LIFT_AIMS.includes(a) ? 'none' : a];
}

/* THE MAIN LIFTS (v56): squat, bench and deadlift, each as the variants the
   big three are read from — coach-overlap.js bigThree() reads this list, and
   it is the only list of main lifts the code has. Get stronger has none of its
   own, so it is this one too. The groups carrying them — each lift's primary
   group in exercises.js: legs, chest and back — are where Get stronger's and
   Powerlifting's 6–15 applies; every other group gets the common range.
   Ids only, since this file imports nothing: mainLiftGroups() is handed the
   library to read the groups from. */
export const MAIN_LIFTS = Object.freeze([
  Object.freeze(['squat', Object.freeze(['back-squat-low-bar', 'back-squat-high-bar'])]),
  Object.freeze(['bench', Object.freeze(['barbell-bench-press', 'barbell-bench-press-paused'])]),
  Object.freeze(['deadlift', Object.freeze(['conventional-deadlift', 'sumo-deadlift'])])
]);
// The aims whose floor is for the main lifts' groups alone.
export const MAIN_LIFT_AIMS = Object.freeze(['strength', 'powerlifting']);
export function mainLiftGroups(byId) {
  const lib = byId && typeof byId === 'object' ? byId : {};
  const out = [];
  MAIN_LIFTS.forEach(([, ids]) => ids.forEach(id => {
    const g = lib[id] && lib[id].group;
    if (g && !out.includes(g)) out.push(g);
  }));
  return Object.freeze(out);
}

/* ================================================================
   STAGE THREE (v49): the goal made useful
   ================================================================ */

/* Which way each aim wants his bodyweight to go: down, up, steady, or no
   opinion. Get stronger and Powerlifting have none — a weight class is a
   later option — so a weight line never celebrates either direction on them. */
export const AIM_DIR = Object.freeze({
  strength: null, powerlifting: null, muscle: 1, cut: -1, recomp: 0, maintain: 0
});

/* THE LIFT TARGET — settings/coach.goalLift = { exId, lb, reps, at }. Stored
   in pounds like every other weight, reps 1 to 20 (a target at one rep is the
   weight itself), `at` the moment it was set. FAILS SAFE on every junk value:
   an id that is not an exercise id's shape, a weight that is not a positive
   number, or a moment that is not one, and there is no target at all; reps out
   of range read as one. Null means absent, and absent is never written. */
export const GOAL_REPS_MAX = 20;
export const GOAL_LB_MAX = 2000;
export function normGoalLift(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const exId = typeof v.exId === 'string' && /^[a-z0-9][a-z0-9-]{0,119}$/.test(v.exId) ? v.exId : null;
  const lb = typeof v.lb === 'number' && Number.isFinite(v.lb) && v.lb > 0 && v.lb <= GOAL_LB_MAX
    ? Math.round(v.lb * 100) / 100 : null;
  const reps = Number.isInteger(v.reps) && v.reps >= 1 && v.reps <= GOAL_REPS_MAX ? v.reps : 1;
  const at = typeof v.at === 'number' && Number.isFinite(v.at) && v.at > 0 ? v.at : null;
  if (!exId || lb == null || at == null) return null;
  return { exId, lb, reps, at };
}

/* PACE toward a lift target, in pounds a week. The Theil–Sen slope of his
   estimated-max points (the median of every pairwise slope, so one great day
   or one bad one does not bend it) and, as the pessimistic pace, the 25th
   percentile of the same slopes: strength gains slow down, so a straight line
   over-promises further out and a range admits it. Six points at least.
     points  [{ t, y }] — y an estimated max in pounds, t epoch ms
     target  the target's estimated max in pounds
   Returns { current, reached, perWk, lowWk, weeks: [fast, slow] | null, over }
   — `weeks` only when the pessimistic pace is above zero, in whole weeks
   rounded up; `over` when the slow end passes six months. Never a date. */
export const PACE_MIN_POINTS = 6;
export const PACE_MAX_WEEKS = 26;
export const PACE_Q = 0.25;
export function paceFor(points, target) {
  const pts = (Array.isArray(points) ? points : [])
    .filter(p => p && Number.isFinite(p.t) && Number.isFinite(p.y) && p.y > 0).slice().sort((a, b) => a.t - b.t);
  if (!pts.length || !(target > 0)) return null;
  const last2 = pts.slice(-2).map(p => p.y);
  const current = last2.length === 2 ? (last2[0] + last2[1]) / 2 : last2[0];
  const reached = current >= target;
  if (pts.length < PACE_MIN_POINTS) return { current, reached, perWk: null, lowWk: null, weeks: null, over: false };
  const slopes = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const days = (pts[j].t - pts[i].t) / 864e5;
      if (days >= 0.5) slopes.push((pts[j].y - pts[i].y) / days * 7);
    }
  }
  if (!slopes.length) return { current, reached, perWk: null, lowWk: null, weeks: null, over: false };
  slopes.sort((a, b) => a - b);
  const at = q => { const pos = (slopes.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
                    return slopes[lo] + (slopes[hi] - slopes[lo]) * (pos - lo); };
  const perWk = at(0.5), lowWk = at(PACE_Q);
  let weeks = null, over = false;
  if (!reached && lowWk > 0) {
    const gap = target - current;
    const fast = Math.max(1, Math.ceil(gap / perWk - 1e-9));
    const slow = Math.max(fast, Math.ceil(gap / lowWk - 1e-9));
    weeks = [fast, slow];
    over = slow > PACE_MAX_WEEKS;
  }
  return { current, reached, perWk, lowWk, weeks, over };
}

/* THE GOAL-CHANGE CHECK on the scale: the last three seven-day blocks back
   from `now`, each block's change in % of bodyweight read at its two ends by
   bwAt() and banded by energyBand() — the same bars as everything else.
   Null when any end has too few weigh-ins to read. */
export const CHECK_WEEKS = 3;
export const CHECK_FAST_PCT = 0.5;
export function weeklyBands(weighIns, now) {
  if (!Number.isFinite(now)) return null;
  const out = [];
  for (let k = 0; k < CHECK_WEEKS; k++) {
    const end = now - k * 7 * 864e5, start = end - 7 * 864e5;
    const a = bwAt(weighIns, start), b = bwAt(weighIns, end);
    if (a == null || b == null) return null;
    const pct = (b - a) / a * 100;
    out.push({ start, end, from: a, to: b, pct, band: energyBand(pct) });
  }
  return out.reverse();
}

/* Does what he is doing contradict what he said he is training for? Two
   checks, each a question and never a verdict (coach.js asks them):
     weight   three weeks running of the scale going the wrong way for the
              aim — a deficit on a building aim, a surplus on a cut, or more
              than half a percent a week either way on Recomp or Stay
              consistent
     targets  his own food targets pointing the other way: set to lose on
              Build muscle, set to gain on a cut
   Needs three weeks of weigh-ins; the fourteen days since the aim was set
   are the question's to count. */
export function goalChecks(o) {
  const x = o && typeof o === 'object' ? o : {};
  const aim = AIMS.includes(x.aim) ? x.aim : null;
  if (!aim) return { weight: false, targets: false, weeks: null };
  const ins = (Array.isArray(x.weighIns) ? x.weighIns : []).filter(w => w && Number.isFinite(w.t) && Number.isFinite(w.lb));
  const ts = ins.map(w => w.t);
  const enough = ts.length >= 2 && Math.max(...ts) - Math.min(...ts) >= 21 * 864e5;
  const weeks = enough ? weeklyBands(ins, x.now) : null;
  const all = f => !!weeks && weeks.every(f);
  const down = w => w.band === 'deficit' || w.band === 'deep';
  const weight = !!weeks && (
    (['muscle', 'strength', 'powerlifting', 'recomp'].includes(aim) && all(down)) ||
    (aim === 'cut' && all(w => w.band === 'surplus')) ||
    (['recomp', 'maintain'].includes(aim) && all(w => Math.abs(w.pct) > CHECK_FAST_PCT)));
  const g = x.goalRateWk;
  const targets = Number.isFinite(g) && ((aim === 'muscle' && g < 0) || (aim === 'cut' && g > 0));
  return { weight, targets, weeks };
}

/* The dials for one account right now: the aim's row, then what the energy
   context and the lift's own rate of progress do to it. A fresh object every
   call, so no caller can edit the table through what it was handed. */
export function dialsFor(o) {
  const x = o && typeof o === 'object' ? o : {};
  const base = AIMS.includes(x.aim) ? DIALS[x.aim] : DIALS.none;
  let confirm = base.confirm;
  let maxSteps = base.maxSteps;
  // A hard cut squeezes recovery hardest: confirm twice, one jump at a time.
  if (x.energy === 'deep') { confirm = 2; maxSteps = 1; }
  // Any deficit: one jump at a time.
  if (x.energy === 'deficit') maxSteps = 1;
  // Close to a ceiling, a session's noise is as big as a week's progress.
  if (x.slowSlope === true) confirm = 2;
  // Moving fast and past the first months: two jumps may be earned — never in a deficit.
  if (x.fastSlope === true && x.exp !== 'new' && x.energy !== 'deep' && x.energy !== 'deficit') {
    maxSteps = Math.max(maxSteps, 2);
  }
  // Under six months of lifting: one jump at a time, whatever else is true.
  if (x.exp === 'new') maxSteps = 1;
  return {
    confirm, maxSteps,
    band: { compound: base.band.compound.slice(), isolation: base.band.isolation.slice() }
  };
}
