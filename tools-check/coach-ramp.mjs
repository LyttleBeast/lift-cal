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
check('RAMP_LIGHT .65, RAMP_MID .85, RAMP_HEAVY .93, RAMP_MAX_SETS 6, GRID_TOL .011',
  R.RAMP_LIGHT === 0.65 && R.RAMP_MID === 0.85 && R.RAMP_HEAVY === 0.93 && R.RAMP_MAX_SETS === 6 && R.GRID_TOL === 0.011);

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
  check('225 × 5 before 315 × 3: more reps than the top set — work', midTop3.warm === '[0]' && midTop3.work === '[1,2]', J(midTop3));
  const noTop = of([S(45, 10), S(135, 5), S(225, 5), S(225, 5), S(225, 5)], {});
  check('45, 135 before 3 × 5 at 225: two warm-ups, three working sets', noTop.warm === '[0,1]' && noTop.work === '[2,3,4]', J(noTop));
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
  check('a working set over the target is work', over.work === '[1]');
  check('T ≤ 0 handed in falls back to the sets’ own top', of(DAY, { T: 0 }).T === 315 && of(DAY, { T: -5 }).T === 315);
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
  check('exports exactly rampOf, workSetsOf, rampProfile and the five constants',
    J(Object.keys(R).sort()) === J(['GRID_TOL', 'RAMP_HEAVY', 'RAMP_LIGHT', 'RAMP_MAX_SETS', 'RAMP_MID', 'rampOf', 'rampProfile', 'workSetsOf']), J(Object.keys(R).sort()));
}

done(st.cleanup);
