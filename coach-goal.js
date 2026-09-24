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
// Imports nothing, reads nothing, keeps no state, and has no clock.

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
  const pct = rateWk / latestLb * 100;
  if (pct <= ENERGY_DEEP + ENERGY_EPS) return 'deep';
  if (pct <= ENERGY_DEFICIT + ENERGY_EPS) return 'deficit';
  if (pct >= ENERGY_SURPLUS - ENERGY_EPS) return 'surplus';
  return 'hold';
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
