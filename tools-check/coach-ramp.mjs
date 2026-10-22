#!/usr/bin/env node
//
// Verifier for coach-ramp.js — the ramp model (rack-v70, COACH-V2-SPEC.md §2).
//
//   node tools-check/coach-ramp.mjs
//
// The tier rule on Micah's own squat day, tagged and untagged; the shapes that
// must NOT read as a ramp (a ramp-to-top working scheme, a back-off after the
// top, a descent, a set to failure in the run, a seventh set); the switches
// that turn detection off (assisted, warm: 'no', bodyweight); the live case
// (the target's load handed in as T with only the bar ticked); the accepted
// edge, written down as the edge it is; determinism, key order, a kilo-stored
// load; and rampProfile over the v68 warmup-leaks log.

import { stage, harness, J } from './lib/stage.mjs';

const { check, section, done } = harness('coach-ramp.js — the ramp model (v70)');
const st = stage(['analytics.js', 'exercises.js', 'ui.js', 'units.js', 'coach-tags.js', 'coach-goal.js', 'coach-prog.js', 'coach-ramp.js']);
const R = await st.load('coach-ramp.js');
const P = await st.load('coach-prog.js');

const S = (w, r, type = 'N', extra) => ({ w: String(w), r: String(r), type, done: true, ...(extra || null) });
const idx = set => J([...set].sort((a, b) => a - b));
const of = (sets, opts) => { const r = R.rampOf(sets, opts); return { ...r, warm: idx(r.warmIdx), work: idx(r.workIdx) }; };

/* ================= A. THE CONSTANTS ================= */
section('A. the constants are the spec’s');
check('RAMP_LIGHT .70 (the spec’s .65, raised for the grid snap on light lifts — see the module header), RAMP_MID .85, RAMP_HEAVY .93, RAMP_MAX_SETS 6, GRID_TOL .011, RAMP_KNOWN_EXPOSURES 6',
  R.RAMP_LIGHT === 0.70 && R.RAMP_MID === 0.85 && R.RAMP_HEAVY === 0.93 && R.RAMP_MAX_SETS === 6 && R.GRID_TOL === 0.011 && R.RAMP_KNOWN_EXPOSURES === 6);

/* ================= B. MICAH'S SQUAT DAY ================= */
section('B. his squat day: 45, 45, 135, 135, 225 up to 3 × 5 at 315');
const DAY = [S(45, 10), S(45, 8), S(135, 5), S(135, 5), S(225, 3), S(315, 5), S(315, 5), S(315, 5)];
{
  const r = of(DAY, {});
  check('untagged: five probable warm-ups, three working sets, T 315', r.probable === 5 && r.tagged === 0 && r.work === '[5,6,7]' && r.T === 315 && r.topReps === 5, J(r));
  check('workSetsOf hands back the three 315s, the very same objects', J(R.workSetsOf(DAY, {}).map(s => s.w)) === J(['315', '315', '315']) && R.workSetsOf(DAY, {})[0] === DAY[5]);
  const tagged = DAY.map((s, i) => (i < 5 ? { ...s, type: 'W' } : s));
  const t = of(tagged, {});
  check('every ramp set typed W: tagged 5, probable 0, the same work', t.tagged === 5 && t.probable === 0 && t.work === '[5,6,7]' && t.warm === r.warm, J(t));
  check('225 × 3 before 315 × 5 is a warm-up (71% is past the old 50% rule)', r.warmIdx.has(4));
  const half = DAY.map((s, i) => (i === 1 || i === 3 ? { ...s, type: 'W' } : s));
  check('half the ramp tagged, half not: the same five warm-ups and the same work', of(half, {}).warm === r.warm && of(half, {}).work === r.work && of(half, {}).tagged === 2 && of(half, {}).probable === 3);
}

/* ================= C. WHAT IS NOT A RAMP ================= */
section('C. the shapes that stay work');
{
  const r = of([S(275, 5), S(295, 5), S(315, 5)], {});
  check('a ramp-to-top working scheme 275 × 5, 295 × 5, 315 × 5: all three work (275 is 87% at 5 reps; 295 is 93.6%)', r.probable === 0 && r.work === '[0,1,2]', J(r));
  const b = of([S(315, 5), S(225, 8)], {});
  check('a back-off after the top: both work', b.probable === 0 && b.work === '[0,1]', J(b));
  const d = of([S(135, 5), S(225, 3), S(185, 5), S(315, 5)], {});
  check('a descent before the top: 135 and 225 warm-ups, 185 work', d.warm === '[0,1]' && d.work === '[2,3]', J(d));
  const f = of([S(45, 10), S(135, 5, 'F'), S(225, 3), S(315, 5)], {});
  check('an F at 135 before a 315 top: 135 and everything after it before the top is work', f.warm === '[0]' && f.work === '[1,2,3]', J(f));
  const dd = of([S(45, 10), S(135, 5, 'D'), S(225, 3), S(315, 5)], {});
  check('a D in the run the same: work from that set on', dd.warm === '[0]' && dd.work === '[1,2,3]', J(dd));
  const seven = [S(45, 10), S(95, 8), S(135, 5), S(185, 5), S(225, 3), S(255, 2), S(275, 2), S(315, 5), S(315, 5)];
  const s7 = of(seven, {});
  check('seven ascending N sets before the top: the first six are warm-ups, the seventh is work', s7.warm === '[0,1,2,3,4,5]' && s7.work === '[6,7,8]', J(s7));
  const sevenW = seven.map((s, i) => (i < 2 ? { ...s, type: 'W' } : s));
  check('… and typed W rows count toward the six', of(sevenW, {}).warm === '[0,1,2,3,4,5]' && of(sevenW, {}).work === '[6,7,8]');
  const heavy = of([S(45, 8), S(135, 5), S(225, 3), S(275, 2), S(285, 1), S(315, 3)], {});
  check('a heavy opener (275 × 2, 285 × 1 — the 90% single — before 315 × 3) is a warm-up', heavy.warm === '[0,1,2,3,4]' && heavy.work === '[5]', J(heavy));
  const past = of([S(45, 8), S(295, 1), S(315, 3)], {});
  check('295 × 1 before 315 is 93.6%: past the heavy tier, so work', past.warm === '[0]' && past.work === '[1,2]', J(past));
  const mid = of([S(45, 8), S(225, 5), S(315, 5)], {});
  check('225 × 5 before 315 × 5: 71% at 5 reps ≤ min(5, 5) — a warm-up', mid.warm === '[0,1]', J(mid));
  const midTop3 = of([S(45, 8), S(225, 5), S(315, 3)], {});
  check('225 × 5 before 315 × 3: a warm-up still — the middle tier’s cap is a flat five, not the top set’s reps (a heavy top has fives before it)', midTop3.warm === '[0,1]' && midTop3.work === '[2]', J(midTop3));
  const midTop8 = of([S(45, 8), S(225, 8), S(315, 5)], {});
  check('225 × 8 before 315 × 5: eight is past the cap — work', midTop8.warm === '[0]' && midTop8.work === '[1,2]', J(midTop8));
  const noTop = of([S(45, 10), S(135, 5), S(225, 5), S(225, 5), S(225, 5)], {});
  check('45, 135 before 3 × 5 at 225: two warm-ups, three working sets', noTop.warm === '[0,1]' && noTop.work === '[2,3,4]', J(noTop));

  // The triple before a top of five or more, and the feeler before straight sets.
  const triple = of([S(45, 8), S(135, 5), S(225, 3), S(285, 3), S(315, 5), S(315, 5), S(315, 5)], {});
  check('285 × 3 (90%) on the way to 3 × 5 at 315 is the last rung — a triple before a top of five or more', triple.warm === '[0,1,2,3]' && triple.work === '[4,5,6]', J(triple));
  const tripleHeavyTop = of([S(45, 8), S(135, 5), S(225, 3), S(285, 3), S(315, 3)], {});
  check('… but 285 × 3 before 315 × 3 is work: only a day of triples makes a triple work', tripleHeavyTop.warm === '[0,1,2]' && tripleHeavyTop.work === '[3,4]', J(tripleHeavyTop));
  const feeler = of([S(20, 8), S(25, 3), S(30, 4), S(35, 7), S(35, 5), S(35, 4), S(35, 2), S(35, 2)], {});
  check('30 × 4 (86%) before five sets at 35: a feeler before straight sets — three warm-ups, five working', feeler.warm === '[0,1,2]' && feeler.work === '[3,4,5,6,7]', J(feeler));
  const feelerOne = of([S(20, 8), S(25, 3), S(30, 4), S(35, 7)], {});
  check('… the same with one set at the top: 30 × 4 at 86% with four reps is work (a ramp-to-top ends in one top set)', feelerOne.warm === '[0,1]' && feelerOne.work === '[2,3]', J(feelerOne));
  const feelerReps = of([S(45, 8), S(50, 10), S(55, 11), S(55, 11), S(60, 11), S(60, 11)], {});
  check('45 × 8, 50 × 10, 55 × 11, 55 × 11 before two sets of 60 × 11: a climbing working scheme, not feelers (a feeler has the top’s reps, one more at most, five at most) — and 45 × 8 at 75% is eight reps, work too', feelerReps.warm === '[]' && feelerReps.work === '[0,1,2,3,4,5]', J(feelerReps));
  const fiveBeforeDoubles = of([S(320, 5), S(365, 2), S(365, 2)], {});
  check('320 × 5 before two doubles at 365: work — five is more than one past two', fiveBeforeDoubles.warm === '[]' && fiveBeforeDoubles.work === '[0,1,2]', J(fiveBeforeDoubles));
  const thirdSame = of([S(50, 5), S(50, 5), S(50, 5), S(60, 5), S(60, 5)], {});
  check('a third set at one load before the top (50 × 5 three times under 60): work from that set on', thirdSame.warm === '[0,1]' && thirdSame.work === '[2,3,4]', J(thirdSame));
  const doubled = of([S(45, 10), S(45, 8), S(135, 5), S(135, 5), S(225, 3), S(315, 5)], {});
  check('… his doubled bar and first plate are still four warm-ups of five', doubled.probable === 5);
  const rungs = of([S(45, 10), S(45, 8), S(95, 4), S(95, 4), S(135, 3), S(185, 2), S(225, 1), S(250, 1), S(315, 3), S(265, 8), S(265, 8)], {});
  check('a heavy day’s eight-set ramp (45, 45, 95, 95, 135, 185, 225, 250 — six rungs) before 315 × 3: all eight warm-ups, the back-offs work', rungs.warm === '[0,1,2,3,4,5,6,7]' && rungs.work === '[8,9,10]', J(rungs));
  const lightDescent = of([S(45, 8), S(35, 8), S(55, 5), S(70, 10), S(70, 10)], {});
  check('a descent between two light sets (45 × 8 then 35 × 8 on a 70-lb curl) does not end the run: three warm-ups', lightDescent.warm === '[0,1,2]' && lightDescent.work === '[3,4]', J(lightDescent));
  const hard = of([S(45, 10), S(135, 5, 'N', { rir: 0 }), S(225, 3), S(315, 5)], {});
  check('a set he rated too hard (rir 0) is never a warm-up, and ends the run: 135 and everything after it is work', hard.warm === '[0]' && hard.work === '[1,2,3]', J(hard));
  check('… rir 2 or 4 on a ramp set changes nothing', of([S(45, 10), S(135, 5, 'N', { rir: 2 }), S(225, 3), S(315, 5)], {}).warm === '[0,1,2]' && of([S(45, 10), S(135, 5, 'N', { rir: 4 }), S(225, 3), S(315, 5)], {}).warm === '[0,1,2]');
}

/* ================= C2. HIS OWN RAMP LOADS ================= */
section('C2. rampLoads — the loads he only ever warms up with, and what they do');
{
  // Six raises days: 10 × 7–10 before 3 × 13 at 15, with 10 never a working load.
  const days = [7, 9, 8, 10, 6, 8].map(r => [S(10, r), S(15, 13), S(15, 13), S(15, 12)]);
  const known = R.rampLoads(days, {});
  check('rampLoads over six days of 10 × n before 15: one load, 10, at the most reps he warmed up with there (10)', J(known) === J([{ w: 10, r: 10 }]), J(known));
  check('10 × 8 before 15 × 13 is 67% and eight reps — past the light tier’s 70%? No: 67% is light, so a warm-up on its own', of([S(10, 8), S(15, 13), S(15, 13)], {}).warm === '[0]');
  check('20 × 8 before 25 × 13 is 80% and eight reps — work by the tiers, a warm-up with 20 among his ramp loads', of([S(20, 8), S(25, 13), S(25, 13)], {}).warm === '[]' &&
        of([S(20, 8), S(25, 13), S(25, 13)], { known: [{ w: 20, r: 8 }] }).warm === '[0]');
  check('… up to the reps he has warmed up with there, give or take two: 20 × 10 yes, 20 × 11 no', of([S(20, 10), S(25, 13), S(25, 13)], { known: [{ w: 20, r: 8 }] }).warm === '[0]' &&
        of([S(20, 11), S(25, 13), S(25, 13)], { known: [{ w: 20, r: 8 }] }).warm === '[]');
  const mixed = R.rampLoads([[S(10, 8), S(15, 13), S(15, 13)], [S(10, 13), S(10, 13), S(10, 13)], [S(10, 7), S(15, 13), S(15, 13)]], {});
  check('a load he worked at in one of the newest sessions (3 × 13 at 10) is not one of his ramp loads', J(mixed) === J([]), J(mixed));
  check('one day is no habit: nothing known from a single session', J(R.rampLoads([[S(10, 8), S(15, 13), S(15, 13)]], {})) === '[]');
  check('assisted, or warm: no — nothing known', J(R.rampLoads(days, { assisted: true })) === '[]' && J(R.rampLoads(days, { warm: 'no' })) === '[]');
  check('only the newest six sessions are read: a working load seven sessions ago does not block the load', J(R.rampLoads([[S(10, 13), S(10, 13)]].concat(days), {})) === J([{ w: 10, r: 10 }]));
  check('junk: nothing, no throw', J(R.rampLoads(null, null)) === '[]' && J(R.rampLoads([null, 3, []], {})) === '[]');
}

/* ================= D. THE ACCEPTED EDGE ================= */
section('D. the known false positive, written down (spec §10 #1)');
{
  const r = of([S(135, 5), S(185, 5), S(225, 5)], { T: 225 });
  check('135 × 5, 185 × 5, 225 × 5 with T 225: 135 and 185 ARE probable warm-ups (185 is 82% at 5 ≤ min(5, 5)) — the edge v72’s question corrects',
    r.warm === '[0,1]' && r.work === '[2]', J(r));
  check('the same without T handed in reads the same', of([S(135, 5), S(185, 5), S(225, 5)], {}).warm === '[0,1]');
  check('the battery’s ramp-to-top shape (85%, 92.5%, 100% at hi+2 reps: 190, 210, 225 × 7) is three working sets', of([S(190, 7), S(210, 7), S(225, 7)], {}).warm === '[]');
  check('… and at five reps the 85% set is the edge (190 × 5 under 225 × 5 reads as a warm-up), the 92.5% set never is', of([S(190, 5), S(210, 5), S(225, 5)], {}).warm === '[0]');
}

/* ================= E. THE SWITCHES ================= */
section('E. assisted, warm: no, bodyweight');
{
  const a = of(DAY, { assisted: true });
  check('assisted: nothing probable, every N set works', a.probable === 0 && a.work === '[0,1,2,3,4,5,6,7]', J(a));
  const aW = of(DAY.map((s, i) => (i === 0 ? { ...s, type: 'W' } : s)), { assisted: true });
  check('… a typed W stays W on an assisted lift', aW.tagged === 1 && aW.warm === '[0]' && aW.work === '[1,2,3,4,5,6,7]');
  const n = of(DAY, { warm: 'no' });
  check('warm: no — nothing probable', n.probable === 0 && n.work === '[0,1,2,3,4,5,6,7]', J(n));
  const nW = of(DAY.map((s, i) => (i === 0 ? { ...s, type: 'W' } : s)), { warm: 'no' });
  check('… a typed W stays W under warm: no', nW.tagged === 1 && nW.warm === '[0]');
  check('warm: yes and null read the same as nothing said', of(DAY, { warm: 'yes' }).warm === of(DAY, {}).warm && of(DAY, { warm: null }).warm === of(DAY, {}).warm);
  const bw = of([S(0, 12), S(0, 10), S(0, 8)], {});
  check('bodyweight (w 0 everywhere): nothing probable, T 0', bw.probable === 0 && bw.T === 0 && bw.work === '[0,1,2]', J(bw));
  const none = of([S(135, 0), S(225, ''), { w: '315', r: '5', type: 'N' }], {});
  check('a set with no reps is neither a warm-up nor work', none.warm === '[]' && none.work === '[2]', J(none));
  check('empty and junk input: nothing, no throw', of([], {}).work === '[]' && of(null, null).work === '[]' && of([null, undefined], {}).work === '[]');
}

/* ================= F. THE LIVE CASE ================= */
section('F. the target’s load as T, mid-ramp');
{
  const one = of([S(45, 10)], { T: 315 });
  check('T 315 with only 45 × 10 ticked: probable 1, nothing working, topReps read as 5', one.probable === 1 && one.work === '[]' && one.topReps === 5, J(one));
  const three = of([S(45, 10), S(135, 5), S(225, 3)], { T: 315 });
  check('45, 135, 225 ticked under a 315 target: all three probable', three.probable === 3 && three.work === '[]', J(three));
  const at = of([S(45, 10), S(135, 5), S(225, 3), S(315, 5)], { T: 315 });
  check('… then 315 × 5: the top, and work', at.work === '[3]' && at.topReps === 5, J(at));
  const lighter = of([S(45, 10), S(305, 5)], { T: 315 });
  check('a working set under the target (305 × 5 under 315) is work: 97% is past every tier', lighter.work === '[1]', J(lighter));
  const over = of([S(45, 10), S(325, 5)], { T: 315 });
  check('a working set over the target is work, and the top moves to it: T 325', over.work === '[1]' && over.T === 325);
  check('the top is the heavier of the target and what he has lifted: 45, 135, 225 under a 200 target he is past read against 315 once 315 is ticked',
        of([S(45, 10), S(135, 5), S(225, 3), S(315, 5)], { T: 200 }).warm === '[0,1,2]' && of([S(45, 10), S(135, 5), S(225, 3), S(315, 5)], { T: 200 }).T === 315);
  check('T ≤ 0 handed in falls back to the sets’ own top', of(DAY, { T: 0 }).T === 315 && of(DAY, { T: -5 }).T === 315);
  // The plan and the log, live only.
  const K = [{ w: 10, r: 8 }];
  const atTarget = of([S(10, 6)], { T: 10, known: K });
  check('a set AT the target that is one of his ramp loads (10 × 6, target 10, 10 among his ramp loads): a warm-up — the target is low, not the set', atTarget.warm === '[0]' && atTarget.work === '[]', J(atTarget));
  check('… not in a logged session (no T handed in): there 10 is the session’s top and work', of([S(10, 6)], { known: K }).work === '[0]');
  check('… and not at reps past what he has warmed up with there: 10 × 12 at the target is work', of([S(10, 12)], { T: 10, known: K }).work === '[0]');
  const half = of([S(20, 8)], { T: 25, R: 17, habit: true });
  check('under the target with fewer than half the target’s reps, on a lift he always ramps on (20 × 8 under 25 × 17): a warm-up', half.warm === '[0]', J(half));
  check('… not without the habit, and not at half or more of the reps (20 × 9 under 17)', of([S(20, 8)], { T: 25, R: 17 }).work === '[0]' && of([S(20, 9)], { T: 25, R: 17, habit: true }).work === '[0]');
  check('… never at the target: 315 × 2 under a 315 × 5 target is a grinding double, not a warm-up', of([S(315, 2)], { T: 315, R: 5, habit: true }).work === '[0]');
  const anchor = of([S(150, 10)], { T: 210, anchor: 250 });
  check('the light tier reads against his last top when the target came down: 150 × 10 under a 210 re-entry (71%) is his bar set for 250 (60%)', anchor.warm === '[0]', J(anchor));
  check('… 210 × 5 under that target is the top and work: the anchor moves only the light tier', of([S(150, 10), S(210, 5)], { T: 210, anchor: 250 }).work === '[1]');
  check('… and an anchor under the target changes nothing', of([S(150, 10)], { T: 210, anchor: 100 }).warm === '[]');
  check('a triple at 90% before a five-rep plan is the last rung, live: 285 × 3 under a 315 × 5 target', of([S(285, 3)], { T: 315, R: 5 }).warm === '[0]' && of([S(285, 3)], { T: 315, R: 3 }).work === '[0]');
}

/* ================= G. DETERMINISM, KEY ORDER, KILOS ================= */
section('G. deterministic, order of keys irrelevant, a kilo-stored load the same');
{
  check('the same input twice is the same answer', J(of(DAY, {})) === J(of(DAY, {})));
  const shuffled = DAY.map(s => ({ done: s.done, type: s.type, r: s.r, w: s.w }));
  check('key order on the set objects changes nothing', J(of(shuffled, {})) === J(of(DAY, {})));
  // 99.79 lb is 45.26 kg stored; 20 kg is 44.09 lb — the rule is a ratio of
  // stored pounds, so a kilo account's ramp reads exactly as a pound account's.
  const kg = [S('44.09', 10), S('44.09', 8), S('132.28', 5), S('132.28', 5), S('220.46', 3), S('308.65', 5), S('308.65', 5), S('308.65', 5)];
  const k = of(kg, {});
  check('a kilo-stored squat day (20, 20, 60, 60, 100 → 3 × 5 at 140 kg): the same five and three', k.probable === 5 && k.work === '[5,6,7]', J(k));
  check('a load stored to two decimals (99.79) reads as its ratio, not its spelling', of([S('99.79', 8), S('220.46', 5), S('220.46', 5)], {}).warm === '[0]');
  check('rampOf never writes to a set', (() => { const copy = J(DAY); R.rampOf(DAY, {}); R.workSetsOf(DAY, { T: 315 }); return J(DAY) === copy; })());
}

/* ================= H. rampProfile ================= */
section('H. rampProfile over the v68 warmup-leaks log');
{
  // The same log tools-check/warmup-leaks.mjs builds: twelve squat days, each
  // with his six-row ramp typed W, 315-and-up working sets after it.
  const NOW = 1789307130123, D = 864e5;
  const RAMP = [[45, 10], [45, 8], [135, 5], [135, 3], [225, 2], [900, 12]];
  const sessions = [];
  for (let k = 0; k < 12; k++) {
    const at = NOW - (k * 7 + 2) * D;
    sessions.push({ id: 'a' + k, startedAt: at, exercises: [{ exId: 'back-squat-low-bar', name: 'Back Squat (Low Bar)', group: 'legs', equipment: 'barbell',
      sets: RAMP.map(([w, r]) => S(w, r, 'W')).concat([S(315 + 5 * (11 - k), 5), S(365, 2), S(365, 2)]) }] });
  }
  const X = P.exposuresFor(sessions, 'back-squat-low-bar');
  const prof = R.rampProfile(X, {});
  check('stage yours, n 12', prof.stage === 'yours' && prof.n === 12, J(prof));
  check('lastRamp is the newest day’s six rows, in order, as logged strings',
    J(prof.lastRamp) === J(RAMP.map(([w, r]) => ({ w: String(w), r: String(r) }))), J(prof.lastRamp));
  check('order-blind: the exposures reversed give the same profile', J(R.rampProfile(X.slice().reverse(), {})) === J(prof));
  const two = R.rampProfile(X.slice(0, 2), {});
  check('two exposures: learning', two.stage === 'learning' && two.n === 2);
  const plain = P.exposuresFor(sessions.map(s => ({ ...s, exercises: s.exercises.map(e => ({ ...e, sets: e.sets.filter(x => x.type !== 'W') })) })), 'back-squat-low-bar');
  check('no ramp anywhere: none, n 0, no rows', J(R.rampProfile(plain, {})) === J({ stage: 'none', n: 0, lastRamp: [] }));
  const untagged = P.exposuresFor(sessions.slice(0, 3).map(s => ({ ...s, exercises: s.exercises.map(e => ({ ...e, sets: e.sets.map(x => (x.type === 'W' && x.w !== '900' ? { ...x, type: 'N' } : x)) })) })), 'back-squat-low-bar');
  check('a probable (untagged) ramp counts toward the profile too', R.rampProfile(untagged, {}).n === 3 && R.rampProfile(untagged, {}).stage === 'yours');
  check('warm: no leaves only the typed rows', R.rampProfile(untagged, { warm: 'no' }).lastRamp.length === 1);
  check('junk: nothing, no throw', J(R.rampProfile(null, null)) === J({ stage: 'none', n: 0, lastRamp: [] }));
}

/* ================= I. THE FILE ITSELF ================= */
section('I. the module is pure and reaches only analytics.js');
{
  const { readFileSync } = await import('node:fs');
  const RAW = readFileSync(new URL('../coach-ramp.js', import.meta.url), 'utf8');
  const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  const imports = [...RAW.matchAll(/^import\s+(?:([^;]*?)\s+from\s+)?['"]([^'"]+)['"];?$/gm)].map(m => ({ names: (m[1] || '').trim(), from: m[2] }));
  check('one import, analytics.js, naming only isWorking', imports.length === 1 && imports[0].from === './analytics.js' && imports[0].names.replace(/[{}\s]/g, '') === 'isWorking', J(imports));
  check('no Date, no Math.random, no module-level let', !/\bDate\b/.test(CODE) && !/Math\s*\.\s*random/.test(CODE) && !CODE.split('\n').some(l => /^(export\s+)?(let|var)\s/.test(l)));
  check('exports exactly rampOf, workSetsOf, rampProfile, rampLoads and the six constants',
    J(Object.keys(R).sort()) === J(['GRID_TOL', 'RAMP_HEAVY', 'RAMP_KNOWN_EXPOSURES', 'RAMP_LIGHT', 'RAMP_MAX_SETS', 'RAMP_MID', 'rampLoads', 'rampOf', 'rampProfile', 'workSetsOf']), J(Object.keys(R).sort()));
}

done(st.cleanup);
