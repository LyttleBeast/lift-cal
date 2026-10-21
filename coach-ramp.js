// Coach's ramp model — which of a lift's logged sets were the warm-up.
//
// Micah tags his warm-ups W (squat: 45, 45, 135, 135, 225, sometimes 315), and
// until v70 that tag was the whole of Coach's knowledge: "W is not a working
// set", and every set typed N was work. A ramp logged untagged — his, or any
// lifter's who never bothers with the W — was read as working sets, and every
// reader paid for it: the live read quoted "Next set: 45 lb × 8" half way up a
// ramp, the volume read counted the bar as a hard set, and the rep-drop test
// measured the top set against the bar set, so a real drop at the top was
// invisible (the battery's N_WARMUP, V_OVER, L_ANOTHER_DROP, N_STOPPED — some
// five thousand wrongs, every one of them a W the lifter never typed).
//
// This file gives the ENGINE what v68 gave the grey rows: a model of the ramp
// from the shape of the sets alone. It asks no question and stores nothing
// (the confirmation on the recap is rack-v72); it is recomputed on every read
// like every other baseline, and the record is never retyped by it.
//
// WHAT A PROBABLE WARM-UP IS (COACH-V2-SPEC.md §2.2). Before the first set at
// the top load, in an ascending run, a set typed N is a warm-up when its load
// and reps taper the way a warm-up does and a working set does not:
//
//   up to 65% of the top        any reps up to 12   (the bar for ten)
//   up to 85% of the top        reps ≤ min(5, the top set's reps)
//   up to 93% of the top        reps ≤ 2             (a heavy opener)
//
// Why tiers and not one line: a flat 70% misses 225 before 315 (71%) — his
// own ramp; a flat 85% would swallow a 275 × 5, 295 × 5, 315 × 5 ramp-to-top
// working scheme. The rep taper is what separates the two in every source and
// in the simulator. The 65% floor rather than 50% or 60% is for a light lift
// whose 60% warm-up snaps up a grid step. A descent before the top ends the
// run (a back-off after a top set is work; so is anything after a set he
// dropped to); a set typed F or D before the top makes the rest of the run
// work (nobody fails a warm-up); and the run is at most six sets — his
// 45, 45, 135, 135, 225, 315 is six, and a seventh is not a ramp anyone logs.
//
// THE KNOWN EDGE, accepted on purpose: a ramp-to-top working scheme at five
// reps or fewer whose lower sets sit at or under 85% (135 × 5, 185 × 5, 225 × 5)
// reads its lower sets as warm-ups. The only count that moves is volume, and
// it moves down — the safe direction; the recap question of v72 is the
// correction, and `warm: 'no'` on a lift switches detection off for it.
//
// EVERY LOAD HERE IS A STORED POUND, compared to a stored pound. Nothing is
// printed, nothing is converted, so a kilo account's '99.79' behaves exactly
// as a pound account's '220': the rule is a ratio and a rep count.
//
// PURE, and copied into the native tree verbatim (src/pure/coach-ramp.js). No
// reads, no DOM, no clock, no module state. Imports analytics.js's one word for
// a working set and nothing else — it says nothing coach.js says, and every
// Coach reader imports IT (coach-prog.js, coach-live.js, coach-volume.js,
// coach.js, coach-build.js); analytics.js itself is untouched: stats, records
// and the index say what the log says, and tools-check/warmup-leaks.mjs holds
// that. tools-check/coach-ramp.mjs is its verifier.

import { isWorking } from './analytics.js';

/* The tiers, as ratios of the top load, and the longest run a ramp can be. */
export const RAMP_LIGHT = 0.65, RAMP_MID = 0.85, RAMP_HEAVY = 0.93, RAMP_MAX_SETS = 6;
// The same tolerance coach-prog.js compares loads with: a copy of a constant,
// not a rule — two stored weights within a hundredth of a pound are one weight.
export const GRID_TOL = 0.011;
// The light tier takes any reps up to this; past the middle tier a warm-up is
// at most a double. And when the top set is off the end of what was ticked,
// its reps are read as five — a working set of five, the commonest there is.
const LIGHT_REPS = 12;
const MID_REPS = 5;
const HEAVY_REPS = 2;
const TOP_REPS_UNSEEN = 5;

const loadOf = s => parseFloat(s && s.w) || 0;
const repsOf = s => parseInt(s && s.r, 10);
const typeOf = s => (s && s.type) || 'N';

/* rampOf(sets, opts) -> { warmIdx, workIdx, T, topReps, tagged, probable }

     sets  one exercise's sets in logged order (after mergeSessionExercises),
           each { w, r, type, done?, rir?, dp? } — read, never written
     opts  { assisted?, warm?: 'yes' | 'no' | null, T?: pounds }
           `assisted`: the load is the help, so nothing about it is a ramp;
           `warm: 'no'`: he said he logs only working sets on this lift (v72);
           `T`: the top load to read the ramp against when the sets in hand do
           not hold it yet — the live target's load, mid-ramp

   warmIdx / workIdx are indexes into `sets`. A set typed W is a warm-up
   wherever it is and whatever its load; a set with no reps is neither. */
export function rampOf(sets, opts) {
  const list = Array.isArray(sets) ? sets : [];
  const o = opts || {};
  const warmIdx = new Set(), workIdx = new Set();
  let tagged = 0, probable = 0;
  const cand = [];
  list.forEach((s, i) => {
    if (!(s && repsOf(s) >= 1)) return;
    cand.push(i);
    if (typeOf(s) === 'W') { warmIdx.add(i); tagged++; }
  });
  const main = cand.filter(i => typeOf(list[i]) !== 'W' && typeOf(list[i]) !== 'D');
  const T = Number.isFinite(o.T) && o.T > 0 ? o.T : (main.length ? Math.max(...main.map(i => loadOf(list[i]))) : 0);
  // The first set at the top, as a position in the candidate list; past the
  // end when nothing ticked has reached it yet.
  let top = cand.findIndex(i => typeOf(list[i]) !== 'W' && typeOf(list[i]) !== 'D' && Math.abs(loadOf(list[i]) - T) < GRID_TOL);
  if (top === -1) top = cand.length;
  const topReps = top < cand.length ? repsOf(list[cand[top]]) : TOP_REPS_UNSEEN;

  const detect = !o.assisted && o.warm !== 'no' && T > 0;
  const prob = new Set();
  if (detect) {
    let prevL = -Infinity, broken = false, run = 0;
    for (let j = 0; j < top; j++) {
      const i = cand[j], s = list[i], L = loadOf(s), R = repsOf(s), type = typeOf(s);
      if (L < prevL - GRID_TOL) broken = true;             // a descent: the run is over
      if (type === 'W') { run++; prevL = Math.max(prevL, L); continue; }
      if (!broken && type === 'N' && L < T - GRID_TOL && run < RAMP_MAX_SETS &&
          ((L <= RAMP_LIGHT * T + GRID_TOL && R <= LIGHT_REPS) ||
           (L <= RAMP_MID * T + GRID_TOL && R <= Math.min(MID_REPS, topReps)) ||
           (L <= RAMP_HEAVY * T + GRID_TOL && R <= HEAVY_REPS))) {
        prob.add(i); run++;
      } else if (type === 'F' || type === 'D') {
        broken = true;                                      // nobody fails a warm-up
      }
      prevL = Math.max(prevL, L);
    }
  }
  prob.forEach(i => warmIdx.add(i));
  probable = prob.size;
  cand.forEach(i => { if (isWorking(list[i]) && !prob.has(i)) workIdx.add(i); });
  return { warmIdx, workIdx, T, topReps, tagged, probable };
}

/* The one function every engine reader calls instead of filter(isWorking):
   the sets whose index is in workIdx, in order, the very same objects. */
export function workSetsOf(sets, opts) {
  const list = Array.isArray(sets) ? sets : [];
  const r = rampOf(list, opts);
  return list.filter((s, i) => r.workIdx.has(i));
}

/* rampProfile(exposures, opts) -> { stage, n, lastRamp }

   Over coach-prog.js exposuresFor()'s output (`allSets` carries the W rows):
   `n` exposures with at least one warm-up, tagged or probable; `stage` none
   under one, learning at one or two, yours at three — the three-session rule
   coach-live.js calls a habit by (MIN_SESSIONS, not imported: a count, not a
   rule). `lastRamp` is the newest exposure's warm-up rows as logged — strings,
   stored pounds, in order — the only ramp numbers Coach may ever show, because
   every one of them is a weight he chose (spec §2.4: no generated ramp). The
   input order does not matter: exposures are read by when they started. */
export function rampProfile(exposures, opts) {
  const X = (Array.isArray(exposures) ? exposures : [])
    .filter(e => e && Number.isFinite(e.startedAt))
    .slice().sort((a, b) => a.startedAt - b.startedAt);
  let n = 0, lastRamp = [];
  X.forEach(e => {
    const sets = Array.isArray(e.allSets) && e.allSets.length ? e.allSets : (Array.isArray(e.sets) ? e.sets : []);
    const r = rampOf(sets, opts);
    if (!r.warmIdx.size) return;
    n++;
    lastRamp = sets.filter((s, i) => r.warmIdx.has(i)).map(s => ({ w: String(s.w == null ? '' : s.w), r: String(s.r == null ? '' : s.r) }));
  });
  return { stage: n >= 3 ? 'yours' : n >= 1 ? 'learning' : 'none', n, lastRamp };
}
