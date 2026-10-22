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
//   up to 70% of the top        any reps up to 12   (the bar for ten)
//   up to 85% of the top        reps ≤ 5
//   up to 93% of the top        reps ≤ 2 (a heavy opener) — or a triple, when
//                               the top set is five reps or more: a 285 × 3 on
//                               the way to 3 × 5 at 315 is the last rung, and
//                               only a day of triples makes a triple work
//   up to 93% of the top        reps ≤ min(5, the top set's reps + 1), when the
//                               top is held for two sets or more — a feeler
//                               before straight sets
//   his own ramp loads          a load he only ever warms up with on this lift
//                               (rampLoads, from his newest sessions), at reps
//                               he has warmed up with there
//
// Why tiers and not one line: a flat 70% misses 225 before 315 (71%) — his
// own ramp; a flat 85% would swallow a 275 × 5, 295 × 5, 315 × 5 ramp-to-top
// working scheme. The rep taper is what separates the two in every source and
// in the simulator. The light tier's 70% rather than the spec's 65% is for a
// light lift whose half-weight warm-up snaps up a grid step: 10 lb before a
// 15-lb raise is 67%, and at 65% it was a working set (the battery put 150 of
// its last wrongs there). The spec wrote the middle tier's cap as min(5, the
// top set's reps); it is a flat five here, because the top set's reps are the
// one number a warm-up cannot be read against — before a heavy single, double
// or triple the warm-ups are threes and fives (135 × 3 before 315 × 1: his, and
// the simulator's), and a grinding top of four at 50 had a 45 × 5 before it
// that was the warm-up it always is. What the cap is for — 225 × 8 before
// 315 × 5 is a working set — it still does. The feeler tier is the straight-
// sets lifter's: 30 × 4 before five sets at 35 is 86% and four reps, past the
// middle tier by a grid snap, and nobody does one working set of four before
// five of seven; a feeler rehearses the top set at about its reps — one more
// at most — so 50 × 10 before two sets of 60 × 11 is a climbing working scheme
// and 320 × 5 before two doubles at 365 is the work it plainly is.
//
// What ends a run: a descent from above the light tier (a back-off after a
// top set is work; so is anything after a set he dropped to — but a bar set
// logged before a lighter plate, 45 × 8 then 35 × 8 on a curl, is two
// warm-ups, not a back-off from anything); a set typed F or D (nobody fails a
// warm-up), or RATED TOO HARD (`rir` the integer 0, coach-prog.js rirOf()'s
// one test of a zero — he said that set cost everything, and reading it as a
// warm-up would lose the one rating that stops the lift going heavier today);
// a third set at one load (he doubles the bar and the first plate, nobody
// triples them: work from that set on); and the seventh rung — six distinct
// loads at most: his 45, 45, 135, 135, 225, 315 is four, a heavy day's
// 45, 45, 95, 95, 135, 185, 225, 250 is six, and a seventh is not a ramp
// anyone logs.
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
export const RAMP_LIGHT = 0.70, RAMP_MID = 0.85, RAMP_HEAVY = 0.93, RAMP_MAX_SETS = 6;
// The same tolerance coach-prog.js compares loads with: a copy of a constant,
// not a rule — two stored weights within a hundredth of a pound are one weight.
export const GRID_TOL = 0.011;
// The light tier takes any reps up to this; past the middle tier a warm-up is
// at most a double. And when the top set is off the end of what was ticked,
// its reps are read as five — a working set of five, the commonest there is.
const LIGHT_REPS = 12;
const MID_REPS = 5;
const HEAVY_REPS = 2;
const HEAVY_TRIPLE = 3;
const TRIPLE_TOP_MIN = 5;
const TOP_REPS_UNSEEN = 5;
// Three sets at one load before the top are a working scheme, not a ramp: he
// doubles the bar and the first plate (45, 45, 135, 135), nobody triples them.
const SAME_LOAD_MAX = 2;
// HIS RAMP LOADS (rampLoads, below), over his newest exposures of a lift: the
// loads that were a warm-up in two or more of them and a working set in none
// — loads he only ever warms up with, 45, 135 and 225 on his squat. A set at
// one of them before the top is a warm-up whatever the tier says, up to the
// most reps he has warmed up with there, give or take two: a 10-lb raise
// before a 15-lb one is 67% and eight reps, and it is his warm-up. (The
// reverse — never a warm-up at a load he worked at lately — was tried and
// dropped: a lifter whose weight sees-saws has his warm-ups land on last
// month's working loads, and the battery lost more than it gained.)
export const RAMP_KNOWN_EXPOSURES = 6;
const RAMP_KNOWN_MIN = 2;
const KNOWN_REPS_SLACK = 2;

const loadOf = s => parseFloat(s && s.w) || 0;
const repsOf = s => parseInt(s && s.r, 10);
const typeOf = s => (s && s.type) || 'N';
// Rated too hard: the integer zero and nothing else (absent is unknown, "0" is junk).
const tooHard = s => !!s && s.rir === 0;
const near = (a, b) => Math.abs(a - b) < GRID_TOL;

/* rampOf(sets, opts) -> { warmIdx, workIdx, T, topReps, tagged, probable }

     sets  one exercise's sets in logged order (after mergeSessionExercises),
           each { w, r, type, done?, rir?, dp? } — read, never written
     opts  { assisted?, warm?: 'yes' | 'no' | null, T?: pounds, known?: [{ w, r }] }
           `assisted`: the load is the help, so nothing about it is a ramp;
           `warm: 'no'`: he said he logs only working sets on this lift (v72);
           `T`: the top load to read the ramp against when the sets in hand do
           not hold it yet — the live target's load, mid-ramp. The top is the
           heavier of it and what he has lifted today: a target he is already
           past is not the top of anything;
           `known`: rampLoads()'s answer for this lift — the loads he only ever
           warms up with, each with the most reps he has done there as one;
           `R`: with `T`, the target's reps for its first set; `habit`: with
           `T`, whether he ramps on this lift as a rule (rampProfile stage
           'yours'); `anchor`: with `T`, his last top load on the lift. Live
           only, the three read the ramp against the plan and the log: a set
           at a load he only ever warms up with is a warm-up even when the
           target sits there (Coach's target, not his, is what is low); a set
           under the target with fewer than half the target's reps, on a lift
           he always ramps on, is a warm-up whatever its ratio (20 × 8 on his
           way to a target of 25 × 17 is not a working set of eight); and the
           light tier is read against the heavier of the target and his last
           top — a target that came down (a re-entry, a reduction) did not
           move his warm-up, and 150 × 10 before 250 is his bar set whether
           Coach asked for 210 today or not

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
  const heaviest = main.length ? Math.max(...main.map(i => loadOf(list[i]))) : 0;
  const live = Number.isFinite(o.T) && o.T > 0;
  const T = Math.max(live ? o.T : 0, heaviest);
  const known = (Array.isArray(o.known) ? o.known : []).filter(k => k && Number.isFinite(k.w) && Number.isFinite(k.r));
  // A set at a load he only ever warms up with, at reps he has warmed up with there.
  const hisOf = s => typeOf(s) === 'N' && repsOf(s) <= LIGHT_REPS && known.some(x => near(x.w, loadOf(s)) && repsOf(s) <= x.r + KNOWN_REPS_SLACK);
  // The first set at the top, as a position in the candidate list; past the
  // end when nothing ticked has reached it yet. Live, a set at the target that
  // is one of his warm-ups is not the top: the target is low, not the set.
  let top = cand.findIndex(i => typeOf(list[i]) !== 'W' && typeOf(list[i]) !== 'D' && near(loadOf(list[i]), T) && !(live && hisOf(list[i])));
  if (top === -1) top = cand.length;
  const topReps = top < cand.length ? repsOf(list[cand[top]]) : TOP_REPS_UNSEEN;
  // Straight sets: the top held for two sets or more (readExposure's own word).
  const straight = main.filter(i => near(loadOf(list[i]), T)).length >= 2;
  // Live, the plan: the target's reps, and whether he ramps here as a rule.
  const planReps = live && Number.isFinite(o.R) && o.R >= 1 ? o.R : null;
  const habit = live && o.habit === true;
  // Live, the light tier's top: the heavier of today's top and his last one.
  const lightT = live && Number.isFinite(o.anchor) && o.anchor > T ? o.anchor : T;
  // The reps the top is read at: the ticked top set's, else the plan's.
  const topR = top < cand.length ? topReps : (planReps != null ? planReps : TOP_REPS_UNSEEN);
  const heavyCap = topR >= TRIPLE_TOP_MIN ? HEAVY_TRIPLE : HEAVY_REPS;

  const detect = !o.assisted && o.warm !== 'no' && T > 0;
  const prob = new Set();
  if (detect) {
    const rungs = new Set(), at = {};
    let prevL = -Infinity, broken = false;
    for (let j = 0; j < top; j++) {
      const i = cand[j], s = list[i], L = loadOf(s), R = repsOf(s), type = typeOf(s), k = String(L);
      if (L < prevL - GRID_TOL && prevL > RAMP_LIGHT * lightT + GRID_TOL) broken = true;   // a descent from above the light tier: the run is over
      if (type === 'W') { rungs.add(k); prevL = Math.max(prevL, L); continue; }
      if (type === 'N' && (at[k] = (at[k] || 0) + 1) > SAME_LOAD_MAX) broken = true;   // a third set at one load
      const his = hisOf(s);
      const under = L < T - GRID_TOL;
      if (!broken && type === 'N' && !tooHard(s) && (under || (live && his)) && (rungs.has(k) || rungs.size < RAMP_MAX_SETS) &&
          (his ||
           (L <= RAMP_LIGHT * lightT + GRID_TOL && R <= LIGHT_REPS) ||
           (L <= RAMP_MID * T + GRID_TOL && R <= MID_REPS) ||
           (L <= RAMP_HEAVY * T + GRID_TOL && R <= heavyCap) ||
           (straight && L <= RAMP_HEAVY * T + GRID_TOL && R <= Math.min(MID_REPS, topReps + 1)) ||
           (habit && planReps != null && R * 2 < planReps && R <= LIGHT_REPS))) {
        prob.add(i); rungs.add(k);
      } else if (type === 'F' || type === 'D' || tooHard(s)) {
        broken = true;                                      // nobody fails a warm-up, or rates one too hard
      }
      prevL = Math.max(prevL, L);
    }
  }
  prob.forEach(i => warmIdx.add(i));
  probable = prob.size;
  cand.forEach(i => { if (isWorking(list[i]) && !prob.has(i)) workIdx.add(i); });
  return { warmIdx, workIdx, T, topReps, tagged, probable };
}

/* rampLoads(setLists, opts) -> [{ w: pounds, r: reps }]

   His ramp loads on one lift: over the newest RAMP_KNOWN_EXPOSURES of its
   set lists (one per session, oldest first, as exposuresFor() orders them —
   `allSets`, warm-ups included), the loads that were a warm-up — typed W or
   read as one by the shape rule above — in RAMP_KNOWN_MIN or more of them
   and a working set in none, each with the most reps he warmed up with
   there. Handed back to rampOf() as `opts.known`. Never read from the index:
   these are the sessions themselves. An assisted lift, or one he says he logs
   no warm-ups on, knows none. */
export function rampLoads(setLists, opts) {
  const lists = (Array.isArray(setLists) ? setLists : []).filter(Array.isArray).slice(-RAMP_KNOWN_EXPOSURES);
  const o = { assisted: !!(opts && opts.assisted), warm: opts && opts.warm };
  if (o.assisted || o.warm === 'no' || lists.length < RAMP_KNOWN_MIN) return [];
  const warm = new Map(), work = [];
  lists.forEach(sets => {
    const r = rampOf(sets, o);
    const seen = new Set();
    sets.forEach((s, i) => {
      const L = loadOf(s), R = repsOf(s);
      if (r.warmIdx.has(i)) {
        const k = String(L), e = warm.get(k) || { days: 0, most: 0 };
        if (!seen.has(k)) { seen.add(k); e.days++; }
        e.most = Math.max(e.most, R); warm.set(k, e);
      } else if (r.workIdx.has(i)) work.push(L);
    });
  });
  return [...warm.entries()].filter(([k, e]) => e.days >= RAMP_KNOWN_MIN && Number(k) > 0 && !work.some(w => near(w, Number(k))))
    .map(([k, e]) => ({ w: Number(k), r: e.most })).sort((a, b) => a.w - b.w);
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
