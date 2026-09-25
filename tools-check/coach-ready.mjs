#!/usr/bin/env node
//
// Verifier for stage four, the training half — coach-ready.js (v52).
//
//   node tools-check/coach-ready.mjs
//
// "This coach should be at the level where I can trust it." Stage four is
// where trust is hardest: it is the stage that says REST, and a rest that is
// wrong is a day lost, and a "go ahead" that is wrong is a day he trains a
// group Coach itself says is still recovering. So, as every Coach battery is,
// this one is scored ok / miss / wrong:
//
//   ok     Coach said what the row expects
//   miss   Coach said less than it could have — silence, allowed
//   wrong  Coach said something false or unsafe — and WRONG MUST BE 0
//
// The rows are SHIP-V52-PROMPT §7's, in its order: the rest read (R), readiness
// (D), what was different about a session (X), and the bad-day mark (M). Then
// the properties, over thousands of generated histories: determinism, order,
// cardio, food, the mark's safety, one builder default, and silence.
//
// NO COPY OF ANY RULE LIVES HERE. coach.js, coach-ready.js, coach-prog.js and
// coach-overlap.js are staged and driven for real — coach.js's readyInput()
// hands coach-ready.js exactly what the engine does — and rack-v51's own files
// are staged out of git for every "byte-identical to v51" row (a full clone is
// needed). Fixtures use the real record shape: string w and r, set types,
// done, _date, id, a lift duplicated in one session, and kilo accounts whose
// log is stored in pounds.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

/* ================= STAGING =================
   One tree for the working copy, and one per past commit that a row is held
   against, each with every Coach module and the same stubbed store. */
// v54: coach-volume.js too (coach.js imports it); a past commit without it
// stages without it, as it always has for a file that was not there yet.
const COACH_FILES = ['analytics.js', 'coach-goal.js', 'coach-prog.js', 'coach-overlap.js', 'coach-build.js',
                     'coach-live.js', 'coach-ready.js', 'coach-fuel.js', 'coach-volume.js', 'coach.js'];
async function stageTree(rev) {
  const dir = mkdtempSync(join(tmpdir(), 'rack-coach-ready-'));
  const at = f => JSON.stringify(pathToFileURL(join(dir, f)).href);
  const read = f => {
    if (!rev) { try { return src(f); } catch { return null; } }
    try { return execFileSync('git', ['show', rev + ':' + f], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
    catch { return null; }
  };
  writeFileSync(join(dir, 'store-stub.mjs'), `
export async function read(_p, fallback) { return fallback; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`);
  const staged = new Set(COACH_FILES.filter(f => read(f) != null));
  staged.forEach(f => {
    let t = read(f).replace("from './store.js'", "from './store-stub.mjs'");
    t = t.replace(/from '\.\/([\w-]+)\.js'/g, (whole, name) =>
      staged.has(name + '.js') ? 'from ' + at(name + '.mjs') : 'from ' + real(name + '.js'));
    writeFileSync(join(dir, f.replace(/\.js$/, '.mjs')), t);
  });
  const imp = f => import(JSON.parse(at(f)));
  return { dir, at, C: await imp('coach.mjs'), P: await imp('coach-prog.mjs'), O: await imp('coach-overlap.mjs'),
           R: staged.has('coach-ready.js') ? await imp('coach-ready.mjs') : null };
}
const NOWT = await stageTree(null);
const V51 = await stageTree('99b49ea');
const { C, P, O, R } = NOWT;
const { EXERCISES } = await import(JSON.parse(real('exercises.js')));
const U8 = await import(JSON.parse(real('units.js')));

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 6).join(' | ') + (xs.length > 6 ? ' … (' + xs.length + ')' : '');

/* The battery: ok / miss / wrong, one row at a time, each row saying what the
   engine said. A row that throws is a wrong: it would have been a broken
   sheet. */
const battery = [];
function row(id, fn) {
  let r;
  try { r = fn(); } catch (e) { r = { v: 'wrong', said: 'threw: ' + (e && e.stack || e) }; }
  battery.push({ id, ...r });
}
// ok when `ok`; a miss when Coach was silent where it could have spoken;
// otherwise wrong — it said something the row does not.
const grade = (ok, silent, said) => ({ v: ok ? 'ok' : silent ? 'miss' : 'wrong', said: String(said) });

/* ================= FIXTURES =================
   Real library names, a fixed epoch, sessions at a fixed local hour. */
const DAY = 864e5;
const NOW = 1789307130123;
const HOUR = new Date(NOW).getHours();
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const localAt = (ago, hour, min) => { const d = new Date(NOW - ago * DAY); d.setHours(hour, min || 0, 0, 0); return d.getTime(); };
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const BENCH = 'barbell-bench-press', ROW = 'barbell-row', OHP = 'overhead-press', SQUAT = 'back-squat-high-bar',
      LEGP = 'leg-press', LEXT = 'leg-extension', BSS = 'bulgarian-split-squat', RDL = 'romanian-deadlift',
      CURL = 'barbell-curl', PUSHD = 'triceps-pushdown-rope', CRUNCH = 'cable-crunch', PLANK = 'plank',
      TREAD = 'treadmill-walk-incline', BIKE = 'stationary-bike', LAT = 'lat-pulldown';
const set = (w, r, type) => ({ w: String(w), r: String(r), type: type || 'N', done: true });
let sid = 0;
/* One session: rows of [exId, sets, w, r, type?] (type may be an array, one
   per set). Starts at the hour asked, or HOUR — the fixed epoch's own local
   hour, so a readiness time row sees his usual hour by default. */
function sess(ago, rows, o) {
  const opt = o || {};
  const t = Number.isFinite(opt.at) ? opt.at : localAt(ago, opt.hour == null ? HOUR : opt.hour, opt.min || 0);
  const mins = opt.mins == null ? 60 : opt.mins;
  return {
    id: opt.id || ('r' + (++sid)), startedAt: t, endedAt: t + mins * 6e4, durationSec: mins * 60, _date: key(t),
    exercises: rows.map(([id, n, w, r, type]) => ({
      exId: id, name: LIB[id].name, group: LIB[id].group, equipment: LIB[id].equipment,
      sets: Array.from({ length: n }, (_, k) => set(w, Array.isArray(r) ? r[k] : r, Array.isArray(type) ? type[k] : type))
    }))
  };
}
const sortS = ss => ss.slice().sort((a, b) => a.startedAt - b.startedAt);
const input = extra => ({
  now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions: [], lib: LIB, hidden: [],
  libReady: true, routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null,
  summaries: {}, steps: { days: {} }, weighIns: [],
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
  settings: { v: 1, mute: {}, answers: {}, asked: {} },
  ...extra
});
const withSettings = (inp, s) => ({ ...inp, settings: { v: 1, mute: {}, answers: {}, asked: {}, ...s } });
// Days back, in a repeating pattern of gaps, from a first day to a last.
function every(first, gaps, until) {
  const out = [];
  let a = first, k = 0;
  while (a <= until) { out.push(a); a += gaps[k % gaps.length]; k++; }
  return out;
}
const UPPER = [[BENCH, 3, 185, 8], [ROW, 3, 155, 8], [OHP, 3, 95, 8]];
const LOWER = [[SQUAT, 3, 245, 5], [LEGP, 3, 300, 10], [LEXT, 3, 100, 12], [BSS, 3, 40, 10]];      // 12 lifting sets for legs
const LOWER_BIG = [[SQUAT, 6, 245, 5], [LEGP, 6, 300, 10], [LEXT, 6, 100, 12], [BSS, 6, 40, 10]];  // 24
const rs = inp => R.restRead(C.readyInput(inp), inp.now);
const ask = (inp, id) => C.coach(inp).ask(id);
const said = a => [a.text].concat((a.more || []).map(m => m.text)).join(' / ');
const shapeKeyOf = (inp, g) => (rs(inp) ? (C.readyInput(inp).shapes.find(sh => sh.groups.includes(g)) || {}).key : null);

/* R1's log: an upper day (chest, back, shoulders) and a lower day (legs),
   each twice a week — gaps of three and four days — for twelve weeks, and a
   legs day yesterday twice his usual size. Upper was last four days ago. */
const R1 = (bigYesterday = LOWER_BIG, extra) => input({ sessions: sortS(
  every(5, [3, 4], 82).map(a => sess(a, LOWER))
    .concat([sess(1, bigYesterday)])
    .concat(every(4, [3, 4], 81).map(a => sess(a, UPPER)))), ...(extra || {}) });

/* ================= R. THE REST READ ================= */
section('R. the rest read — recovered first, rest when nothing is, lighter when the signs line up');

row('R1', () => {
  const inp = R1();
  const r = rs(inp);
  const c = C.coach(inp);
  const a = c.ask('ask_shape');
  const p = c.build({});
  const upper = r && r.pick && r.pick.kind === 'shape' && ['chest', 'back', 'shoulders'].every(g => r.pick.groups.includes(g)) &&
                !r.pick.groups.includes('legs');
  const ok = r && r.call === 'shape' && upper && /chest, back and shoulders day has waited longest/.test(a.text) &&
             !!p && p.focus.id === 'shape:' + r.pick.key && !r.groups.legs.ready && r.groups.legs.big;
  return grade(ok, !r, (r && r.call) + ' · ' + a.text + ' · built ' + (p && p.focus.id));
});

/* R1b: the legs day is the shipped stalest shape — legs and core, core long
   untrained — but legs had its big day yesterday in a session of its own. */
const R1b = () => input({ sessions: sortS(
  every(10, [7], 80).map(a => sess(a, LOWER.concat([[CRUNCH, 3, 60, 12]]))) .concat([sess(1, LOWER_BIG)])
    .concat(every(4, [3, 4], 81).map(a => sess(a, UPPER)))) });
row('R1b', () => {
  const inp = R1b();
  const r = rs(inp);
  const c = C.coach(inp);
  const a = c.ask('ask_shape');
  const skippedOk = r && r.pick && r.pick.skipped && r.pick.skipped.groups.includes('legs') && r.pick.skipped.groups.includes('core');
  const ok = r && r.call === 'shape' && skippedOk && / has waited longest of what’s recovered/.test(a.text) &&
             (a.more || []).some(m => /^Your legs and core day has waited longer, but legs are inside their recovery time\.$/.test(m.text));
  return grade(ok, !r, (r && r.call) + ' · ' + said(a));
});

/* R2: the same, but yesterday's 24 sets were a treadmill walk and a bike. */
row('R2', () => {
  const inp = R1([[TREAD, 12, 0, 30], [BIKE, 12, 0, 20]]);
  const r = rs(inp);
  const c = C.coach(inp);
  const ship = C.coach(withSettings(inp, { mute: { rest: true } }));
  const ok = r && r.groups.legs.ready && !r.groups.legs.big && !c.buildCaution({ focus: 'group:legs' }) &&
             r.pick && r.pick.kind === 'shape' && c.ask('ask_shape').text === ship.ask('ask_shape').text;
  return grade(ok, !r, r && JSON.stringify({ legs: r.groups.legs, pick: r.pick && r.pick.key }) + ' · ' + c.ask('ask_shape').text);
});

/* R3: two days on and one off for twelve weeks — his usual run is two — and
   now four days straight, every usual group inside its window. */
const R3 = () => {
  const on = [];
  for (let a = 7; a <= 82; a += 3) on.push(a, a + 1);
  const ss = on.map((a, k) => sess(a, k % 2 ? LOWER : UPPER));
  [0, 1, 2, 3].forEach(a => ss.push(sess(a, a % 2 ? LOWER : UPPER)));
  return input({ sessions: sortS(ss) });
};
row('R3', () => {
  const inp = R3();
  const r = rs(inp);
  const c = C.coach(inp);
  const a = c.ask('ask_shape');
  const ok = r && r.call === 'rest' && r.usualRun === 2 && r.streakNow === 4 &&
             a.id === 'rest_day' && a.text === 'Today looks like a rest day. Chest, back, legs and shoulders were all trained today and yesterday, and you’ve trained 4 days straight (your usual longest run is 2).' &&
             (a.followups || []).some(f => f.id === 'ask_build_anyway' && f.label === 'Train anyway') &&
             !(a.followups || []).some(f => f.id === 'ask_build_now');
  return grade(ok, !r || a.id !== 'rest_day', (r && r.call + ' run ' + r.usualRun + ' streak ' + r.streakNow) + ' · ' + a.text +
               ' · ' + (a.followups || []).map(f => f.label).join(','));
});

/* R4: runs of three for ten weeks (upper, lower, arms and core), and now
   five days straight with bench and squat 10% down over their last three
   sessions. The arms-and-core day, last done eight days ago, is recovered. */
const ARMS = [[CURL, 3, 65, 10], [PUSHD, 3, 50, 12], [CRUNCH, 3, 60, 15]];
const R4 = (o = {}) => {
  const ss = [];
  // Runs of three, two days off: upper, lower, arms-core, from 10 days back.
  for (let a = 10; a <= 82; a += 5) {
    ss.push(sess(a + 2, UPPER), sess(a + 1, LOWER), sess(a, ARMS));
  }
  ss.push(sess(8, ARMS));
  // The five-day streak, lifts falling (or not) over the last three sessions of each.
  const fall = o.fall === false ? 1 : 0.9;
  // `small`: two sets a lift in the streak, so its week is not a big one —
  // the streak is the one sign (R5).
  const n = o.small ? 2 : 3;
  const upper = w => [[BENCH, n, Math.round(185 * w / 5) * 5, 8], [ROW, n, 155, 8], [OHP, n, 95, 8]];
  const lower = w => [[SQUAT, n, Math.round(245 * w / 5) * 5, 5], [LEGP, n, 300, 10], [LEXT, n, 100, 12], [BSS, n, 40, 10]];
  const five = o.groupPick
    ? [[4, upper(fall).concat([[CURL, 1, 65, 10]])], [3, lower(fall)], [2, upper(fall)], [1, lower(fall).concat([[CURL, 1, 65, 10]])], [0, upper(fall)]]
    : [[4, upper(fall)], [3, lower(fall)], [2, upper(fall)], [1, lower(fall)], [0, upper(fall)]];
  five.forEach(([a, rows]) => ss.push(sess(a, rows)));
  return input({ sessions: sortS(ss) });
};
row('R4', () => {
  const inp = R4();
  const r = rs(inp);
  const c = C.coach(inp);
  const a = c.ask('ask_lighter');
  const more = (a.more || []).map(m => m.text);
  const p = c.build({});
  const ok = r && r.call === 'lighter' && r.pick && r.pick.kind === 'shape' && r.pick.groups.includes('arms') &&
             a.id === 'rest_day' && a.text === 'Today looks like a lighter day, or a rest.' &&
             more.includes('5 days straight; your usual longest run is 3.') &&
             more.some(t => /^Back Squat \(High Bar\) and Barbell Bench Press are coming down lately\.$/.test(t)) &&
             more.includes('A common approach on a lighter day: the same weights, fewer sets.') &&
             more.includes('If you train, your ' + r.pick.name + ' is recovered.') &&
             (a.followups || []).some(f => f.id === 'ask_build_now') && (a.followups || []).some(f => f.id === 'ask_build_anyway') &&
             !!p && p.focus.id === 'shape:' + r.pick.key;
  return grade(ok, !r || a.id !== 'rest_day', (r && r.call) + ' · ' + said(a) + ' · ' + (a.followups || []).map(f => f.label).join(','));
});
row('R4b', () => {
  const inp = R4({ groupPick: true });
  const r = rs(inp);
  const c = C.coach(inp);
  const p = c.build({});
  const a = c.ask('ask_lighter');
  const ok = r && r.call === 'lighter' && r.pick && r.pick.kind === 'group' && r.pick.group === 'core' &&
             !!p && p.focus.id === 'group:core' && (a.followups || []).some(f => f.id === 'ask_build_now') &&
             (a.more || []).some(m => m.text === 'If you train, core is recovered.');
  return grade(ok, !r, (r && r.call + ' ' + JSON.stringify(r.pick && { kind: r.pick.kind, group: r.pick.group, key: r.pick.key })) + ' · built ' + (p && p.focus.id));
});
row('R5', () => {
  const inp = R4({ fall: false, small: true });
  const r = rs(inp);
  const ok = r && r.call === 'shape' && r.fatigue.streak && !r.fatigue.up && r.pick && r.pick.groups.includes('arms');
  return grade(ok, !r, r && JSON.stringify({ call: r.call, fatigue: r.fatigue }));
});

/* R6: the Rest switch off — every rest answer silent, and "What should I
   train today?", the builder and the targets exactly rack-v51's. */
row('R6', () => {
  const inp = withSettings(R1(), { mute: { rest: true } });
  const c = C.coach(inp), c51 = V51.C.coach(inp);
  const same = id => JSON.stringify(c.ask(id)) === JSON.stringify(c51.ask(id));
  const sameBuild = JSON.stringify(c.build({})) === JSON.stringify(c51.build({})) &&
                    JSON.stringify(c.buildMenu()) === JSON.stringify(c51.buildMenu());
  const quiet = ['ask_shape', 'ask_lighter'].every(id => !['rest_day', 'group_ready'].includes(c.ask(id).id)) &&
                !c.buildCaution({ focus: 'group:legs' });
  const ok = quiet && same('ask_shape') && same('ask_targets') && same('ask_build_now') && sameBuild;
  return grade(ok, false, 'quiet ' + quiet + ' shape ' + same('ask_shape') + ' targets ' + same('ask_targets') + ' build ' + sameBuild +
               ' · ' + c.ask('ask_targets').text + ' / ' + c51.ask('ask_targets').text);
});

/* R7: five sessions in the window — no rest read, the shipped answers. */
row('R7', () => {
  const inp = input({ sessions: sortS([1, 4, 8, 11, 15].map((a, k) => sess(a, k % 2 ? LOWER : UPPER))) });
  const r = rs(inp);
  const c = C.coach(inp), c51 = V51.C.coach(inp);
  const ok = r === null && JSON.stringify(c.ask('ask_shape')) === JSON.stringify(c51.ask('ask_shape'));
  return grade(ok, false, JSON.stringify(r) + ' · ' + c.ask('ask_shape').text);
});

/* R8: arms three times in the window, yesterday the last — a group with
   three days of training has the labelled starting window of two. */
row('R8', () => {
  const inp = input({ sessions: sortS(every(2, [3, 4], 70).map((a, k) => sess(a, k % 2 ? LOWER : UPPER))
    .concat([15, 8, 1].map(a => sess(a, [[CURL, 3, 65, 10], [PUSHD, 3, 50, 12]])))) });
  const r = rs(inp);
  const k = C.coach(inp).buildCaution({ focus: 'group:arms' });
  const ok = r && r.groups.arms.stage === 'none' && r.groups.arms.win === 2 && !r.groups.arms.ready && !!k &&
             k.text === 'Arms was trained yesterday; Coach gives them 2 days or more (a common starting point until Coach knows your gaps).';
  return grade(ok, !k, r && JSON.stringify(r.groups.arms) + ' · ' + (k && k.text));
});

/* R9: R1, then Make me a workout → Legs. */
row('R9', () => {
  const inp = R1();
  const c = C.coach(inp), r = rs(inp);
  const k = c.buildCaution({ focus: 'group:legs' });
  const anyway = k && c.build(k.anyway.opts), rec = k && k.recovered && c.build(k.recovered.opts);
  const ok = !!k && k.text === 'Legs had a big day yesterday: 24 sets against a usual 12. Coach would give them another day.' &&
             k.anyway.label === 'Build legs anyway' && JSON.stringify(k.anyway.opts) === JSON.stringify({ focus: 'group:legs' }) &&
             !!anyway && anyway.focus.id === 'group:legs' && !!k.recovered && k.recovered.label === 'Train something recovered' &&
             !!rec && rec.focus.id === 'shape:' + r.pick.key;
  return grade(ok, !k, k && (k.text + ' · ' + k.anyway.label + ' · ' + (k.recovered && k.recovered.label)));
});

/* R10: a fully recovered shape is built without a word. */
row('R10', () => {
  const inp = R1();
  const r = rs(inp);
  const k = C.coach(inp).buildCaution({ focus: 'shape:' + r.pick.key });
  return grade(k === null && r.pick.kind === 'shape', false, JSON.stringify(k));
});

/* R11: legs recovered, the upper day trained yesterday — with its core work
   — and the legs day carries core too: so no whole shape is recovered, and
   the call is a group. */
const LOWER_CORE = LOWER.concat([[CRUNCH, 3, 60, 15]]);
const R11 = () => input({ sessions: sortS(every(4, [3, 4], 81).map(a => sess(a, LOWER_CORE))
  .concat(every(1, [3, 4], 82).map(a => sess(a, a === 1 ? UPPER.concat([[CRUNCH, 3, 60, 15]]) : UPPER)))) });
row('R11', () => {
  const inp = R11();
  const r = rs(inp);
  const c = C.coach(inp);
  const a = c.ask('ask_shape');
  const p = c.build({});
  const t = c.ask('ask_targets');
  const ok = r && r.call === 'group' && r.pick.group === 'legs' && a.id === 'group_ready' &&
             a.text === 'Legs is recovered. Chest, back, shoulders and core were trained yesterday.' &&
             (a.followups || []).some(f => f.id === 'ask_build_now') && !!p && p.focus.id === 'group:legs' &&
             t.id === 'lift_targets' && t.text === 'Targets for your legs day.' &&
             (t.more || []).some(m => /^Back Squat \(High Bar\) — Target:/.test(m.text));
  return grade(ok, !r || a.id === 'ask_shape', (r && r.call) + ' · ' + a.text + ' · built ' + (p && p.focus.id) + ' · ' + t.text);
});

/* R12–R14: the replay. An upper day and a legs day on alternate days — each
   recovered every other morning — and, two days before each flagged
   morning, an upper day twice its usual size: every upper group's window
   grows a day, legs was yesterday, and that morning nothing he usually trains
   is recovered. Whatever he does that day, the next morning has something
   recovered again, so each flag is one morning. On a flagged day he rests,
   or trains at his usual weights ("held") or 15% under them ("below"). */
const UPPER_BIG = [[BENCH, 8, 185, 8], [ROW, 8, 155, 8], [OHP, 8, 95, 8]];
function replayLog(flags) {
  // flags: [{ at: an even number of days back, train: false | 'held' | 'below' }]
  const ss = [];
  for (let a = 83; a >= 1; a--) {
    const f = flags.find(x => x.at === a);
    if (f && !f.train) continue;
    const upper = a % 2 === 0;
    const big = upper && flags.some(x => x.at === a - 2);
    const w = f && f.train === 'below' ? 0.85 : 1;
    const rows = upper ? (big ? UPPER_BIG : UPPER) : LOWER;
    ss.push(sess(a, rows.map(([id, n, wt, r]) => [id, n, Math.round(wt * w / 5) * 5, r])));
  }
  return input({ sessions: sortS(ss) });
}
const RP = inp => R.replay(C.readyInput(inp), inp.now);
row('R12', () => {
  const inp = replayLog([{ at: 70, train: false }, { at: 60, train: 'held' }, { at: 50, train: false },
                         { at: 40, train: 'held' }, { at: 30, train: 'held' }, { at: 20, train: 'held' }]);
  const rp = RP(inp);
  const ok = rp && rp.flagged === 6 && rp.rested === 2 && rp.lines.some(l => l.text === 'Of the 6 days your log looked like this, you rested on 2.');
  return grade(ok, !rp || !rp.lines.length, rp && JSON.stringify({ f: rp.flagged, r: rp.rested, t: rp.through, h: rp.held, b: rp.below }) + ' · ' +
               rp.lines.map(l => l.text).join(' / '));
});
row('R13', () => {
  const inp = replayLog([{ at: 70, train: 'held' }, { at: 60, train: 'held' }, { at: 50, train: 'below' },
                         { at: 40, train: 'held' }, { at: 30, train: 'held' }]);
  const rp = RP(inp);
  const before = JSON.stringify(rs(inp));
  const noReplay = JSON.stringify(R.restRead(C.readyInput(inp), inp.now));
  const ok = rp && rp.through === 5 && rp.held === 4 &&
             rp.lines.some(l => l.text === 'You’ve trained through days like this 5 times and held your numbers on 4.') && before === noReplay;
  return grade(ok, !rp || !rp.lines.length, rp && JSON.stringify({ f: rp.flagged, t: rp.through, h: rp.held, b: rp.below }) + ' · ' +
               rp.lines.map(l => l.text).join(' / '));
});
row('R14', () => {
  const inp = replayLog([{ at: 70, train: 'below' }, { at: 60, train: 'held' }, { at: 50, train: 'below' }, { at: 40, train: 'below' }]);
  const rp = RP(inp);
  const ok = rp && rp.through === 4 && rp.below === 3 &&
             rp.lines.some(l => l.text === 'The last 4 times you trained through a day like this, your top sets came in under your usual on 3.') &&
             !rp.lines.some(l => /held your numbers/.test(l.text));
  return grade(ok, !rp || !rp.lines.length, rp && JSON.stringify({ f: rp.flagged, t: rp.through, h: rp.held, b: rp.below }) + ' · ' +
               rp.lines.map(l => l.text).join(' / '));
});

/* R15: on a group or rest call, nothing names the shipped, unrecovered shape
   as the one to train, and the targets answer names what the builder builds. */
row('R15', () => {
  const bad = [];
  [R11(), R3()].forEach((inp, n) => {
    const c = C.coach(inp), r = rs(inp);
    const ship = C.coach(withSettings(inp, { mute: { rest: true } }));
    const shipShape = ship.ask('ask_shape');
    /* v53, on purpose: this fixture has a session today, and after a
       workout the sheet opens on the finish line and draws the finding
       second (SHIP-V53-PROMPT §4.4). The row is about the finding, so it
       reads openingNext — c.opening would pass it without testing it. */
    const after = c.state === 'post' || c.state === 'done_today';
    if (after && (!c.openingNext || c.opening.id !== 'finish')) bad.push(n + ': no finish line first after a workout');
    const opening = c.openingNext || c.opening;
    if (['train_today_recommendation', 'session_shape_most_overdue'].includes(opening.id)) bad.push(n + ': opening ' + opening.text);
    const a = c.ask('ask_shape');
    if (['train_today_recommendation', 'session_shape_most_overdue'].includes(a.id)) bad.push(n + ': ask_shape ' + a.text);
    if (a.text === shipShape.text) bad.push(n + ': the shipped answer ' + a.text);
    const bf = c.build({});
    const t = c.ask('ask_targets');
    if (t.id === 'lift_targets' && bf && !t.text.includes(r.call === 'group' ? 'legs day' : bf.name.toLowerCase())) bad.push(n + ': targets ' + t.text);
  });
  return grade(!bad.length, false, bad.join(' | ') || 'clean');
});

/* R16: the recovery line at his usual run (coach-hype.mjs F holds it too). */
row('R16', () => {
  const log = cur => {
    const days = [];
    for (let r = 0; r < 5; r++) for (let d = 0; d < 4; d++) days.push(12 + 12 * r + d);
    for (let d = 0; d < cur; d++) days.push(d);
    return input({ sessions: sortS(days.map(a => sess(a, [[CURL, 3, 65, 10]]))) });
  };
  const has = inp => Array.from({ length: 12 }, (_, k) => C.coach({ ...inp, opens: k }).card.you.id).includes('hype_recovery');
  const r3 = rs(log(3)), r4 = rs(log(4));
  const ok = !has(log(3)) && has(log(4)) && r4 && r4.usualRun === 4;
  return grade(ok, false, 'three: ' + has(log(3)) + ' four: ' + has(log(4)) + ' run ' + (r4 && r4.usualRun) + '/' + (r3 && r3.usualRun));
});

/* R17: two sessions on one date are one day — in the streak and the window. */
row('R17', () => {
  const base = R1();
  const twice = input({ sessions: sortS(base.sessions.concat([sess(4, [[CURL, 3, 65, 10]], { hour: 20 })])) });
  const a = rs(base), b = rs(twice);
  const ok = a && b && a.streakNow === b.streakNow && ['chest', 'back', 'shoulders', 'legs'].every(g =>
    a.groups[g].n === b.groups[g].n && a.groups[g].win === b.groups[g].win && a.groups[g].since === b.groups[g].since) &&
    a.usualRun === b.usualRun;
  return grade(ok, false, a && b && JSON.stringify([a.streakNow, b.streakNow, a.groups.chest.n, b.groups.chest.n]));
});

/* R18: a rest call, then "What should I lift today?" — it says rest first,
   and the targets are there and are rack-v51's. */
row('R18', () => {
  const inp = R3();
  const c = C.coach(inp), c51 = V51.C.coach(inp);
  const t = c.ask('ask_targets'), t51 = c51.ask('ask_targets');
  const lines = (t.more || []).map(m => m.text), lines51 = (t51.more || []).map(m => m.text);
  const ok = t.id === 'lift_targets' && lines[0] === 'Today looks like a rest day. These targets keep until your next session.' &&
             JSON.stringify(lines.filter(x => /— Target:/.test(x))) === JSON.stringify(lines51.filter(x => /— Target:/.test(x))) &&
             lines51.some(x => /— Target:/.test(x)) && t.text === t51.text;
  return grade(ok, t.id !== 'lift_targets', t.text + ' · ' + lines.join(' / ') + ' · v51: ' + lines51.join(' / '));
});

/* R19: rest or lighter — no record day, and no week-best line on the card. */
row('R19', () => {
  const bad = [];
  [R3(), R4()].forEach((inp, n) => {
    const c = C.coach(inp);
    if (c.ask('ask_record_day').id === 'record_day') bad.push(n + ' record day');
    const cards = Array.from({ length: 12 }, (_, k) => C.coach({ ...inp, opens: k }).card.you.id);
    if (cards.includes('hype_week_best')) bad.push(n + ' week best');
    if (!['rest', 'lighter'].includes((rs(inp) || {}).call)) bad.push(n + ' call ' + (rs(inp) || {}).call);
  });
  return grade(!bad.length, false, bad.join(', ') || 'clean');
});

/* R20: three sets to failure on every leg day, every time — a normal leg day
   is not big for him. */
row('R20', () => {
  const LF = [[SQUAT, 3, 245, 5, ['N', 'N', 'F']], [LEGP, 3, 300, 10, ['N', 'N', 'F']], [LEXT, 3, 100, 12, ['N', 'N', 'F']], [BSS, 3, 40, 10]];
  const inp = input({ sessions: sortS(every(1, [3, 4], 82).map(a => sess(a, LF)).concat(every(4, [3, 4], 81).map(a => sess(a, UPPER)))) });
  const r = rs(inp);
  return grade(r && !r.groups.legs.big && r.groups.legs.win < 4, !r, r && JSON.stringify(r.groups.legs));
});

/* R21: no recurring shape — every session a different pairing — and every
   group he trains recovered. */
row('R21', () => {
  const pairs = [[BENCH, CURL], [SQUAT, OHP], [ROW, CRUNCH], [BENCH, LEGP], [ROW, OHP], [SQUAT, CURL], [BENCH, CRUNCH],
                 [LEGP, ROW], [OHP, CURL], [SQUAT, CRUNCH], [BENCH, ROW], [LEGP, OHP], [CURL, CRUNCH], [SQUAT, BENCH]];
  const ss = pairs.map((p, k) => sess(80 - 6 * k, p.map(id => [id, 3, 100, 8])));
  const inp = input({ sessions: sortS(ss) });
  const r = rs(inp);
  const rows = R.readinessRows(C.readyInput(inp), inp.now);
  const rec = rows.find(x => x.id === 'recovery');
  const ok = r && C.readyInput(inp).shapes.length === 0 && r.call === 'group' && rec && rec.has && !rec.flag;
  return grade(ok, !r, r && JSON.stringify({ call: r.call, shapes: C.readyInput(inp).shapes.length, rec }));
});

/* R22: a rest call → Make me a workout → Tell me what to train. What it
   builds is the shipped overdue shape — unrecovered — so the caution comes. */
row('R22', () => {
  const inp = R3();
  const c = C.coach(inp);
  const menu = c.buildMenu();
  const pick = menu.find(m => m.id === 'pick');
  const k = pick && c.buildCaution(pick.opts);
  return grade(!!k && /^(Chest|Back|Legs|Shoulders) was trained (today|yesterday)/.test(k.text) && !k.recovered, !k, k && k.text);
});

/* ================= D. READINESS ================= */
section('D. readiness — a list of what is off his normal today, never a score');

/* Sessions started at his usual hour: the epoch's own clock hour, give or
   take, so the time row reads "usual" unless a row asks otherwise. */
const CLOCK = [0, 30, 90];
const onClock = (ago, rows, k, o) => sess(ago, rows, { hour: HOUR, min: CLOCK[k % 3], ...(o || {}) });
const noTargets = { mute: { targets: true } };
const rows = inp => R.readinessRows(C.readyInput(inp), inp.now);
const flagged = inp => rows(inp).filter(x => x.flag).map(x => x.id);
// D1's log: R1's without the big day, at his usual hours, targets off.
const D1 = extra => withSettings(input({ sessions: sortS(every(1, [3, 4], 82).map((a, k) => onClock(a, LOWER, k))
  .concat(every(4, [3, 4], 81).map((a, k) => onClock(a, UPPER, k)))), ...(extra || {}) }), noTargets);
row('D1', () => {
  const inp = D1();
  const a = C.coach(inp).ask('ask_lighter');
  const ok = a.id === 'readiness' && a.text === 'Nothing in your log is off your normal today.' && !flagged(inp).length &&
             R.readinessHas(C.readyInput(inp), inp.now) >= 3 &&
             (a.more || []).slice(-1)[0].text === 'Coach can’t see sleep, stress or soreness, and those count most on a day like this.';
  return grade(ok, a.id !== 'readiness', a.id + ' · ' + said(a) + ' · flags ' + flagged(inp).join(','));
});

/* D2: runs of three for ten weeks, then five days straight, a big week and
   nothing recovered missing — the streak and the week's sets. */
const D2 = o => {
  const ss = [];
  let k = 0;
  for (let a = 10; a <= 82; a += 5) ss.push(onClock(a + 2, UPPER, k++), onClock(a + 1, LOWER, k++), onClock(a, ARMS, k++));
  ss.push(onClock(8, ARMS, k++));
  const f = o && o.fail ? ['N', 'F', 'F'] : null;
  const small = o && o.fail;
  [[4, UPPER], [3, LOWER], [2, UPPER], [1, LOWER], [0, UPPER]].forEach(([a, rws]) =>
    ss.push(onClock(a, rws.map(([id, n, w, r]) => [id, small ? 2 : n, w, r, f ? f.slice(0, small ? 2 : n) : undefined]), 0)));
  return withSettings(input({ sessions: sortS(ss) }), noTargets);
};
row('D2', () => {
  const inp = D2();
  const a = C.coach(inp).ask('ask_lighter');
  const f = flagged(inp);
  const more = (a.more || []).map(m => m.text);
  const ok = a.id === 'rest_day' || a.id === 'readiness';
  // "Should I rest or go lighter?" tries the rest read first; readiness is
  // asked for itself here, through its own intent's answer.
  const c = C.coach(inp);
  const ready = R.readinessAnswer(rows(inp));
  const ok2 = JSON.stringify(f) === JSON.stringify(['streak', 'load']) && ready && ready.text === 'Two things are different today:' &&
              ready.more.some(m => /^5 days straight; your usual longest run is 3\.$/.test(m.text)) &&
              ready.more.some(m => /^\d+ sets in the last 7 days; usually about \d+ a week\.$/.test(m.text));
  return grade(ok && ok2, !ready, f.join(',') + ' · ' + (ready && [ready.text].concat(ready.more.map(m => m.text)).join(' / ')));
});
row('D3', () => {
  const inp = D2({ fail: true });
  const ready = R.readinessAnswer(rows(inp));
  const f = flagged(inp);
  const ok = f.includes('streak') && f.includes('failure') && ready && ready.text === 'Several things in your log point to a lighter day.' &&
             ready.more.some(m => m.text === 'A common approach on a lighter day: the same weights, fewer sets.') &&
             ready.more.some(m => /^\d+ sets taken to failure in the last 7 days; usually (none|about [\d.]+)\.$/.test(m.text));
  return grade(ok, !ready, f.join(',') + ' · ' + (ready && [ready.text].concat(ready.more.map(m => m.text)).join(' / ')));
});
row('D4', () => {
  // Three weeks of a young log: the rest read and one lift with four
  // sessions — two rows with data.
  const inp = input({ sessions: sortS([20, 17, 13, 10, 6, 3, 1].map((a, k) => onClock(a, k % 2 ? LOWER : UPPER, k))) });
  const n = R.readinessHas(C.readyInput(inp), inp.now);
  const c = C.coach(inp);
  const ok = n === 2 && c.ask('ask_lighter').id !== 'readiness' && R.readinessAnswer(rows(inp)) === null;
  return grade(ok, false, n + ' rows · ' + c.ask('ask_lighter').id);
});
const weighedLog = (u, today) => {
  const ins = [];
  for (let a = 8; a >= 1; a--) ins.push({ lb: 200, t: localAt(a, 6) });
  ins.push({ lb: today, t: localAt(0, Math.max(0, HOUR - 1)) });
  return D1({ u, weighIns: ins });
};
row('D5', () => {
  const lb = R.readinessAnswer(rows(weighedLog('lb', 196))), kg = R.readinessAnswer(rows(weighedLog('kg', 196)));
  const line = x => x && x.more.find(m => /weigh-in/.test(m.text));
  const ok = lb && kg && line(lb) && line(kg) &&
             line(lb).text === 'This morning’s weigh-in is 4 lb under your last week. A drop that size is usually water, which Coach can’t see.' &&
             line(kg).text === 'This morning’s weigh-in is ' + U8.labelW(4, 'kg') + ' under your last week. A drop that size is usually water, which Coach can’t see.' &&
             !/\blb\b/.test(line(kg).text) && !R.readinessAnswer(rows(weighedLog('lb', 198))).more.some(m => /weigh-in/.test(m.text));
  return grade(ok, !lb, (line(lb) || {}).text + ' / ' + (line(kg) || {}).text);
});
row('D6', () => {
  const bad = [];
  [D1(), D2(), R3(), R4()].forEach((inp0, n) => {
    const inp = withSettings(inp0, { mute: { readiness: true, targets: true } });
    const a = C.coach(inp).ask('ask_lighter');
    if (!['rest_day', 'lighter_week', 'ask_lighter'].includes(a.id)) bad.push(n + ': ' + a.id);
    // Offered only when it answers (after a workout the Train list has no
    // place for it at all, which is the other way of not offering it).
    const offered = C.coach(inp).topicsFor('train').some(t => t.id === 'ask_lighter');
    if (offered && a.id === 'ask_lighter') bad.push(n + ': offered with nothing to say');
  });
  return grade(!bad.length, false, bad.join(' | ') || 'clean');
});
/* The lifts row, from Coach's own targets: two of the last session's
   replayed targets unreached. D1's log with targets on — he never adds the
   weight Coach sets — says so. */
row('D7', () => {
  const inp = withSettings(D1(), {});
  const r = rows(inp).find(x => x.id === 'lifts');
  return grade(r && r.flag && /^\d+ of your last session’s targets weren’t reached\.$/.test(r.text), r && !r.flag, r && JSON.stringify(r));
});
row('D8', () => {
  // The time row: sessions at his usual hour, and now four hours past them.
  const inp = { ...D1(), now: NOW + 4 * 36e5 };
  const r = rows(inp).find(x => x.id === 'time');
  return grade(r && r.flag && /^It’s \d{1,2}(:\d\d)? (am|pm); you usually start between \d{1,2}(:\d\d)? (am|pm) and \d{1,2}(:\d\d)? (am|pm)\.$/.test(r.text),
               r && !r.flag, r && JSON.stringify(r));
});

/* ================= X. WHAT WAS DIFFERENT ================= */
section('X. what was different about a session — in either direction, three at most, never a cause');

/* A log to compare against, with some spread in everything a robust z reads
   (a median absolute deviation of zero skips a component, rightly): an upper
   day every three, four or five days, a lower day twice a week of twelve or
   sixteen sets, at hours from four to six in the afternoon, 55 to 65
   minutes, for twelve weeks; and today's upper session, at the scale, hour
   and length given. `restDays` clears the days before it. Now is an hour
   after it ends. */
function xLog(o = {}) {
  const ss = [];
  let k = 0;
  every(3, [4, 5, 3], 82).forEach(a => { ss.push(sess(a, UPPER, { hour: 16 + (k % 3), mins: 55 + 5 * (k % 3) })); k++; });
  every(1, [3, 4], 82).forEach(a => { ss.push(sess(a, LOWER.map(([id, n, w, r]) => [id, n + (k % 2), w, r]), { hour: 16 + (k % 3), mins: 55 + 5 * (k % 3) })); k++; });
  const w = o.scale || 1;
  const t = localAt(0, o.hour == null ? 17 : o.hour);
  const keep = ss.filter(x => !o.restDays || x.startedAt < localAt(o.restDays, 0));
  keep.push(sess(0, UPPER.map(([id, n, wt, r]) => [id, o.sets || n, Math.round(wt * w / 5) * 5, r]), { at: t, mins: o.mins || 60, id: 'today' }));
  return input({ sessions: sortS(keep), now: t + ((o.mins || 60) + 60) * 6e4, ...(o.extra || {}) });
}
const diffs = inp => { const c = C.coach(inp); return { a: c.ask('ask_compare') }; };
row('X1', () => {
  // At six, an hour past his median start: his week is then his usual one
  // (at five the session seven days before falls inside it, and a week of
  // 46 against a usual 37 is a real difference).
  const { a } = diffs(xLog({ scale: 0.85, hour: 18 }));
  const more = (a.more || []).map(m => m.text);
  const ok = a.id === 'session_compare' && /^Below your usual/.test(a.text) && more.includes('Nothing in your log was off your normal.') &&
             !more.includes('These are differences, not causes.') && !!a.mark && a.mark.sessionId === 'today' &&
             a.mark.text === 'Anything Coach can’t see?' && a.mark.options.map(o => o.label).join('|') === 'Slept badly|Stressed|Sore|Didn’t feel well|Nothing';
  return grade(ok, a.id !== 'session_compare', a.text + ' / ' + more.join(' / ') + ' · mark ' + !!a.mark);
});
row('X2', () => {
  const { a } = diffs(xLog({ scale: 1.1, hour: 6 }));
  const more = (a.more || []).map(m => m.text);
  const all = [a.text].concat(more).join(' ');
  const ok = /^Above your usual/.test(a.text) && more.includes('What was different in your log:') &&
             more.some(t => /^It started at 6 am; you usually start between 4( pm|:\d\d pm) and 6(:\d\d)? pm\.$/.test(t)) &&
             more.includes('These are differences, not causes.') && !/despite|even though|because|due to/i.test(all) && !a.mark;
  return grade(ok, !more.includes('What was different in your log:'), a.text + ' / ' + more.join(' / '));
});
row('X3', () => {
  // Five components off at once: ten days of rest, so a quiet week before
  // it, at 6 am, for twenty minutes, and a weigh-in that morning 2% under
  // his week.
  const wi = [];
  for (let a = 8; a >= 1; a--) wi.push({ lb: 200, t: localAt(a, 5) });
  wi.push({ lb: 196, t: localAt(0, 5) });
  const inp = xLog({ hour: 6, mins: 20, restDays: 10, extra: { weighIns: wi } });
  const all = R.sessionRows(C.readyInput(inp), C.readyInput(inp).overlap.shaped.find(x => x.session.id === 'today'));
  const kept = all.filter(x => x.kept);
  const merged = R.mergeRows(all);
  const byZ = kept.slice().sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, 3).map(x => x.id);
  const { a } = diffs(inp);
  const listed = (a.more || []).map(m => m.text);
  const at = listed.indexOf('What was different in your log:');
  const ok = kept.length >= 5 && merged.length === 3 && JSON.stringify(merged.map(x => x.id)) === JSON.stringify(byZ) &&
             at >= 0 && listed[at + 4] === 'These are differences, not causes.';
  return grade(ok, !kept.length, kept.map(x => x.id + ':' + x.z.toFixed(1)).join(', ') + ' → ' + merged.map(x => x.id).join(','));
});
row('X4', () => {
  // Only seven earlier sessions carry a duration: the length is not measured.
  const inp = xLog({});
  let n = 0;
  inp.sessions.forEach(x => { if (x.id !== 'today') { if (n >= 7) { delete x.durationSec; delete x.endedAt; } n++; } });
  const all = R.sessionRows(C.readyInput(inp), C.readyInput(inp).overlap.shaped.find(x => x.session.id === 'today'));
  return grade(!all.some(x => x.id === 'length') && all.length > 0, false, all.map(x => x.id).join(','));
});
row('X5', () => {
  const { a } = diffs(xLog({}));
  return grade(a.id === 'session_compare' && /^About your usual/.test(a.text) && !a.mark && !a.marked, a.id !== 'session_compare', a.text + ' · mark ' + !!a.mark);
});

/* ================= M. THE BAD-DAY MARK ================= */
section('M. the mark — a bad day stops counting against him, and never counts for him');

/* A bench history: three weeks of 3 × 8, five pounds a session, then the
   sessions each row names. Upper days, so the builder has a shape. */
function mLog(tail, o = {}) {
  const ss = [];
  const head = o.head || [165, 170, 175, 180, 185];
  let a = 4 * head.length + 4 * tail.length + 2;
  head.forEach(w => { ss.push(sess(a, [[BENCH, 3, w, 8], [ROW, 3, 155, 8], [OHP, 3, 95, 8]], { id: 'h' + a })); a -= 4; });
  const ids = [];
  tail.forEach(([w, reps], k) => {
    const id = 'm' + k;
    ids.push(id);
    ss.push(sess(k === tail.length - 1 ? (o.lastAgo || 1) : a, [[BENCH, 3, w, reps], [ROW, 3, 155, 8], [OHP, 3, 95, 8]], { id }));
    a -= 4;
  });
  const marks = {};
  (o.marks || []).forEach(k => { marks[ids[k]] = { r: o.r || 'sleep', d: key(ss.find(x => x.id === ids[k]).startedAt) }; });
  return withSettings(input({ sessions: sortS(ss) }), { answers: o.aim ? { q_goal_aim: o.aim } : {}, ...(Object.keys(marks).length ? { marks } : {}) });
}
const benchTarget = inp => { const p = C.coach(inp).build({}); const e = p && p.exercises.find(x => x.exId === BENCH); return e && e.target; };
const MARK1 = 'Your last session is marked (slept badly), so this is the target from before it.';
const MARK2 = 'That session doesn’t count against your numbers.';
row('M1', () => {
  // Before the last session the target was 190 × 8; he got 6, 5, 5, and marked it.
  const before = mLog([[185, 8]], { head: [160, 165, 170, 175, 180] });
  const t0 = benchTarget(before);
  const inp = mLog([[185, 8], [190, [6, 5, 5]]], { head: [160, 165, 170, 175, 180], marks: [1] });
  const t = benchTarget(inp);
  const t1 = C.readyInput(inp).overlap.lifts.find(l => l.exId === BENCH);
  const direct = P.targetFor(t1, { now: inp.now, u: 'lb' }, t1.mark);
  const ok = t0 && t0.mode === 'add' && t0.loadLb === 190 && t && t.mode === 'add' && t.loadLb === 190 && t.line === 'Target: 3 × 8 at 190 lb.' &&
             JSON.stringify(t.sets.map(x => x.tw + 'x' + x.tr)) === JSON.stringify(t0.sets.map(x => x.tw + 'x' + x.tr)) &&
             direct && JSON.stringify(direct.why) === JSON.stringify([MARK1, MARK2]) &&
             JSON.stringify(t.why) === JSON.stringify([MARK1, MARK2, 'Worked out from before your marked session.']);
  return grade(ok, !t, (t0 && t0.line) + ' → ' + (t && t.mode + ' ' + t.line + ' · ' + t.why.join(' / ')));
});
row('M2', () => {
  const inp = mLog([[185, [6, 6, 6]], [185, [6, 6, 5]]], { head: [160, 165, 170, 175, 180], marks: [1] });
  const t = benchTarget(inp);
  const ok = t && t.mode === 'hold' && t.loadLb === 185 && JSON.stringify(t.why.slice(0, 2)) === JSON.stringify([MARK1, MARK2]);
  return grade(ok, !t, t && (t.mode + ' ' + t.line + ' · ' + t.why.join(' / ')));
});
row('M3', () => {
  const inp = mLog([[185, [6, 6, 6]], [185, [6, 6, 5]]], { head: [160, 165, 170, 175, 180] });
  const t = benchTarget(inp);
  return grade(t && t.mode === 'reduce' && t.loadLb === 180, !t, t && (t.mode + ' ' + t.line));
});
row('M4', () => {
  // Five steady sessions, one a little down, one level, and a marked one far down.
  const inp = mLog([[185, 8], [185, 8], [175, 8], [185, 8], [150, 8]], { head: [185, 185, 185], marks: [4] });
  const ri = C.readyInput(inp);
  const lift = ri.overlap.lifts.find(l => l.exId === BENCH);
  const perf = P.baselines(lift, { now: inp.now, u: 'lb' });
  const full = P.baselines({ ...lift, exposures: lift.exposures.concat(lift.mark.exposures).sort((a, b) => a.startedAt - b.startedAt) }, { now: inp.now, u: 'lb' });
  const lifted = rows(inp).find(x => x.id === 'lifts');
  const ok = full.status === 'declining' && perf.status !== 'declining' && !/Barbell Bench Press/.test((lifted && lifted.text) || '');
  return grade(ok, false, 'full ' + full.status + ' · performance ' + perf.status);
});
row('M5', () => {
  const inp = mLog([[185, 8], [190, [6, 5, 5]]], { marks: [1] });
  const r = rs(inp) || null;
  const p = C.coach(inp).build({});
  const load = rows(inp).find(x => x.id === 'load');
  const r0 = rs(mLog([[185, 8], [190, [6, 5, 5]]]));
  const ok = p && p.base.daysAgo === 1 && /^Built from yesterday’s session/.test(p.headline) &&
             p.exercises.find(e => e.exId === BENCH).line === '190 lb for… ' === false &&
             /190 lb/.test(p.exercises.find(e => e.exId === BENCH).line) &&
             JSON.stringify(r) === JSON.stringify(r0) && (!load || load.text === rows(mLog([[185, 8], [190, [6, 5, 5]]])).find(x => x.id === 'load').text);
  return grade(ok, !p, p && (p.headline + ' · ' + p.exercises.find(e => e.exId === BENCH).line));
});
row('M6', () => {
  const at = n => { const x = mLog([[185, 8], [190, [6, 5, 5]]], { marks: [1] }); x.settings.marks.m1.d = key(NOW - n * DAY); return x; };
  const t183 = benchTarget(at(183)), t182 = benchTarget(at(182));
  const plain = benchTarget(mLog([[185, 8], [190, [6, 5, 5]]]));
  const ok = t183 && plain && JSON.stringify(t183) === JSON.stringify(plain) && t182 && t182.marked === true &&
             C.normSettings(at(183).settings).marks.m1.d === key(NOW - 183 * DAY);
  return grade(ok, false, (t183 && t183.mode) + ' / ' + (t182 && t182.mode));
});
row('M7', () => {
  const bad = [];
  [R1(), R3(), R11(), mLog([[185, 8], [190, [6, 5, 5]]]), mLog([[185, [6, 6, 6]], [185, [6, 6, 5]]], { head: [170, 175, 180] })].forEach((inp0, n) => {
    // Readiness off too: its line is not a target, and it has its own switch.
    const inp = withSettings(inp0, { mute: { rest: true, readiness: true } });
    const a = C.coach(inp).build({}), b = V51.C.coach(inp).build({});
    if (JSON.stringify(a) !== JSON.stringify(b)) bad.push(n + ' build');
    if (JSON.stringify(C.coach(inp).ask('ask_targets')) !== JSON.stringify(V51.C.coach(inp).ask('ask_targets'))) bad.push(n + ' targets');
  });
  return grade(!bad.length, false, bad.join(', ') || 'identical');
});
row('M8', () => {
  const opts = C.MARK_ASK.options;
  const acks = Object.fromEntries(opts.map(o => [o.label, o.ack]));
  const ok = acks['Slept badly'] === 'Noted. That session won’t count against your numbers.' &&
             acks['Stressed'] === acks['Slept badly'] && acks['Sore'] === acks['Slept badly'] &&
             acks['Didn’t feel well'] === 'Noted. That session won’t count against your numbers. Rest is always an option. Coach doesn’t do health, so it’ll leave it there.' &&
             acks['Nothing'] === 'Noted.' && opts.find(o => o.label === 'Nothing').value === null &&
             C.MARK_ASK.clear.label === 'Clear the mark' && C.MARK_ASK.clear.ack === 'Cleared.';
  return grade(ok, false, JSON.stringify(acks));
});
row('M9', () => {
  // (a) On a cut, weight goes on after two sessions at the top: a marked miss
  // between them is not a miss. (b) Two misses around a marked good session
  // are not "two in a row" — no reduce the unmarked log would not make.
  const a = benchTarget(mLog([[185, 8], [185, [5, 5, 5]], [185, 8]], { marks: [1], aim: 'cut' }));
  const a0 = benchTarget(mLog([[185, 8], [185, [5, 5, 5]], [185, 8]], { aim: 'cut' }));
  const b = benchTarget(mLog([[185, [6, 6, 6]], [185, 8], [185, [6, 6, 6]]], { head: [170, 175, 180], marks: [1] }));
  const b0 = benchTarget(mLog([[185, [6, 6, 6]], [185, 8], [185, [6, 6, 6]]], { head: [170, 175, 180] }));
  const ok = a && a.mode === 'add' && a.loadLb === 190 && a0 && a0.mode === 'hold' && b && b.mode !== 'reduce' && b0 && b0.mode !== 'reduce';
  return grade(ok, !a || !b, 'a ' + (a && a.mode + ' ' + a.line) + ' (unmarked ' + (a0 && a0.mode) + ') · b ' + (b && b.mode + ' ' + b.line) + ' (unmarked ' + (b0 && b0.mode) + ')');
});

/* ================= M8, THE DATA HALF — coach-data.js against a stub store ================= */
section('M8. the mark is written, cleared and pruned by coach-data.js — one write each, to settings/coach');
{
  const here = f => JSON.stringify(pathToFileURL(join(NOWT.dir, f)).href);
  writeFileSync(join(NOWT.dir, 'store-data-stub.mjs'), `
export const writes = [];
export let node = null;
export function setNode(v) { node = v; }
const mem = new Map();
export const LS = { get(k, f) { return mem.has(k) ? JSON.parse(mem.get(k)) : f; }, set(k, v) { mem.set(k, JSON.stringify(v)); }, del(k) { mem.delete(k); } };
export function wu() { return 'lb'; }
export async function read(_p, f) { return f; }
export async function readExact(p) { return p === 'settings/coach' ? JSON.parse(JSON.stringify(node)) : null; }
export async function write(p, v) { writes.push([p, JSON.parse(JSON.stringify(v))]); node = v; return true; }
`);
  writeFileSync(join(NOWT.dir, 'picker-stub.mjs'), 'export function allExercises() { return []; }\nexport function hiddenIds() { return []; }\nexport function libraryReady() { return false; }\n');
  writeFileSync(join(NOWT.dir, 'tdee-stub.mjs'), 'export function maintenance() { return null; }\nexport function effectiveMaint() { return null; }\n' +
    'export function trendRate() { return { rateWk: null, days: null }; }\nexport function sortedEntries() { return []; }\n');
  writeFileSync(join(NOWT.dir, 'insights-stub.mjs'), 'export function goalDirection() { return null; }\n');
  writeFileSync(join(NOWT.dir, 'access-stub.mjs'), 'export function capabilities() { return { features: {} }; }\n');
  writeFileSync(join(NOWT.dir, 'coach-data.mjs'), src('coach-data.js')
    .replace("from './store.js'", 'from ' + here('store-data-stub.mjs'))
    .replace("from './exercises.js'", 'from ' + real('exercises.js'))
    .replace("from './picker.js'", 'from ' + here('picker-stub.mjs'))
    .replace("from './tdee.js'", 'from ' + here('tdee-stub.mjs'))
    .replace("from './insights.js'", 'from ' + here('insights-stub.mjs'))
    .replace("from './access.js'", 'from ' + here('access-stub.mjs'))
    .replace("from './coach.js'", 'from ' + here('coach.mjs')));
  const ST = await import(JSON.parse(here('store-data-stub.mjs')));
  const D = await import(JSON.parse(here('coach-data.mjs')));
  const today = key(Date.now());
  const ago = n => key(Date.now() - n * DAY);
  ST.setNode({ v: 1, mute: {}, answers: { q_goal_aim: 'strength' }, asked: {}, marks: { old: { r: 'sore', d: ago(183) }, keep: { r: 'stress', d: ago(182) } } });
  await D.markSession({ id: 's1', date: today }, 'sleep');
  let w = ST.writes[ST.writes.length - 1];
  check('a mark is one write, to settings/coach, of { r, d } under the session’s own id',
        ST.writes.length === 1 && w[0] === 'settings/coach' && JSON.stringify(w[1].marks.s1) === JSON.stringify({ r: 'sleep', d: today }), JSON.stringify(w && w[1].marks));
  check('and that write prunes every mark past six months — kept at 182 days, gone at 183 — touching nothing else',
        !('old' in w[1].marks) && 'keep' in w[1].marks && w[1].answers.q_goal_aim === 'strength', JSON.stringify(w[1].marks));
  await D.markSession({ id: 's1', date: today }, null);
  w = ST.writes[ST.writes.length - 1];
  check('Clear the mark removes the key', !('s1' in (w[1].marks || {})) && 'keep' in w[1].marks, JSON.stringify(w[1].marks));
  await D.markSession({ id: 'keep', date: ago(182) }, null);
  w = ST.writes[ST.writes.length - 1];
  check('and a node with no mark left keeps the shipped shape — no `marks` key', !('marks' in w[1]), JSON.stringify(w[1]));
  const before = ST.writes.length;
  await D.markSession({ id: '', date: today }, 'sleep');
  check('a session with no id is never marked — nothing is written', ST.writes.length === before);
  ST.setNode({ v: 1, mute: {}, answers: {}, asked: {}, marks: { stale: { r: 'sore', d: ago(200) } } });
  await D.setCategoryMuted('fuel', true);
  w = ST.writes[ST.writes.length - 1];
  check('pruned on EVERY settings/coach write, not only a mark’s (decision 18)', !('marks' in w[1]) && w[1].mute.fuel === true, JSON.stringify(w[1]));
}

/* ================= PROPERTIES =================
   Over thousands of generated histories, seeded so every run reads the same
   ones: one to three recurring shapes at their own rhythms with a little
   jitter, lifts rising, level or falling, sets to failure now and then,
   cardio sessions and cardio sets, food, weigh-ins, hours across the day,
   both units — and, for the mark's properties, marks on sessions. */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                 return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const PALETTE = [UPPER, LOWER, ARMS, [[BENCH, 3, 185, 8], [SQUAT, 3, 245, 5], [LAT, 3, 120, 10]], [[OHP, 3, 95, 8], [CURL, 3, 65, 10], [PLANK, 3, 0, 60]]];
function history(seed, o = {}) {
  const r = rng(seed);
  const pick = xs => xs[Math.floor(r() * xs.length)];
  const span = o.thin ? 4 + Math.floor(r() * 20) : 30 + Math.floor(r() * 90);
  const nShapes = 1 + Math.floor(r() * 3);
  const shapes = Array.from({ length: nShapes }, () => pick(PALETTE));
  const trend = Array.from({ length: nShapes }, () => pick([-0.004, 0, 0, 0.004]));
  const ss = [];
  let k = 0;
  shapes.forEach((sh, n) => {
    const every = 2 + Math.floor(r() * 6);
    for (let a = Math.floor(r() * every); a <= span; a += every + (r() < 0.3 ? 1 : 0)) {
      if (o.thin && ss.length >= 5) break;
      const scale = 1 + trend[n] * (span - a);
      const rows = sh.map(([id, sets, w, reps]) => [id, sets + (r() < 0.2 ? 1 : 0), Math.max(0, Math.round(w * scale / 5) * 5), reps,
        Array.from({ length: sets + 1 }, () => (r() < 0.08 ? 'F' : 'N'))]);
      if (r() < 0.15) rows.push([pick([TREAD, BIKE]), 2, 0, 20]);
      ss.push(sess(a, rows, { hour: 6 + Math.floor(r() * 14), min: Math.floor(r() * 60), mins: 30 + Math.floor(r() * 60), id: 'g' + seed + '-' + (k++) }));
    }
  });
  if (r() < 0.3) ss.push(sess(Math.floor(r() * span), [[TREAD, 3, 0, 30]], { id: 'g' + seed + '-c' }));
  const summaries = {};
  for (let a = 1; a <= span; a++) if (r() < 0.7) summaries[key(NOW - a * DAY)] = { cal: 1800 + Math.round(r() * 1200), p: 150, c: 250, f: 70 };
  const weighIns = [];
  if (r() < 0.5) for (let a = span; a >= 0; a -= 1 + Math.floor(r() * 3)) weighIns.push({ lb: 200 - a * 0.05 + r(), t: localAt(a, 6) });
  const marks = {};
  if (o.marks) ss.forEach(x => { if (r() < 0.12) marks[x.id] = { r: pick(['sleep', 'stress', 'sore', 'unwell']), d: key(x.startedAt) }; });
  return input({ sessions: sortS(ss), u: seed % 2 ? 'kg' : 'lb', summaries, weighIns,
                 settings: { v: 1, mute: {}, answers: {}, asked: {}, ...(Object.keys(marks).length ? { marks } : {}) } });
}
const shuffled = (xs, seed) => { const r = rng(seed * 7 + 1), a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// What the rest read decides, and nothing it merely carries along.
const readShot = inp => { const x = rs(inp); return x ? JSON.stringify({ call: x.call, pick: x.pick && (x.pick.key || x.pick.group), groups: x.groups, usual: x.usual, run: x.usualRun, streak: x.streakNow }) : 'null'; };
/* What recovery decides: each group's window, big day and readiness, and
   whether anything he usually trains is recovered at all (the rest call is
   "nothing is"). Not the lighter flag: its week-of-sets sign reads the
   SHIPPED sets, cardio in, which SHIP-V52-PROMPT decision 2 keeps for every
   reader but recovery — so a cardio-heavy week can move "rest" to "lighter"
   and never the other way round into or out of "nothing is recovered". */
const windowsShot = inp => { const x = rs(inp); return x ? JSON.stringify({ nothing: !x.pick, g: GROUPS_ALL.map(g => [x.groups[g].win, !!x.groups[g].big, x.groups[g].ready]) }) : 'null'; };
const GROUPS_ALL = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
const N_PROP = 2000;
section('P. properties — ' + N_PROP + ' generated histories, both units');
{
  const t0 = Date.now();
  const broke = { deterministic: [], order: [], cardio: [], food: [], builder: [], answers: [] };
  let reads = 0, calls = {};
  for (let seed = 1; seed <= N_PROP; seed++) {
    const h = history(seed);
    const a = readShot(h);
    if (a !== 'null') { reads++; const c = JSON.parse(a).call; calls[c] = (calls[c] || 0) + 1; }
    if (a !== readShot(JSON.parse(JSON.stringify(h)))) broke.deterministic.push(seed);
    if (a !== readShot({ ...h, sessions: shuffled(h.sessions, seed) })) broke.order.push(seed);
    // Cardio sets added under any group, inside sessions already there.
    const withCardio = { ...h, sessions: h.sessions.map((x, n) => n % 3 ? x : { ...x, exercises: x.exercises.concat([
      { exId: TREAD, name: LIB[TREAD].name, group: 'legs', equipment: 'cardio', sets: [set(0, 30), set(0, 30), set(0, 30), set(0, 30)] },
      { exId: 'rowing-machine', name: LIB['rowing-machine'].name, group: 'back', equipment: 'cardio', sets: [set(0, 10), set(0, 10)] }]) }) };
    if (windowsShot(h) !== windowsShot(withCardio)) broke.cardio.push(seed);
    if (a !== readShot({ ...h, summaries: {}, foodFirst: {} })) broke.food.push(seed);
    // One builder default: Build it, "Tell me what to train", the targets
    // answer and the teaser all build session.buildFocus; the shape named as
    // the one to train is that same shape, or none.
    if (seed % 4 === 0) {
      const c = C.coach(h);
      const p = c.build({});
      const menu = c.buildMenu().find(m => m.id === 'pick');
      const pm = menu ? c.build(menu.opts) : null;
      const r = rs(h);
      const t = c.ask('ask_targets');
      const basic = C.coach({ ...h, tier: { pro: false } });
      if ((p && (!pm || pm.focus.id !== p.focus.id)) || (!p && pm)) broke.builder.push(seed + ' menu');
      if (p && t.id === 'lift_targets' && !t.text.startsWith('Targets for your ')) broke.builder.push(seed + ' targets ' + t.text);
      if (p && basic.teaser && !p.exercises.some(e => e.target && basic.teaser.text.includes(e.name))) broke.builder.push(seed + ' teaser');
      if (r && r.call !== 'shape' && r.call !== 'lighter') {
        const sh = c.ask('ask_shape');
        if (['session_shape_most_overdue', 'train_today_recommendation'].includes(sh.id)) broke.builder.push(seed + ' named ' + sh.text);
      }
      if (r && r.pick && r.pick.kind === 'shape' && p && p.focus.id !== 'shape:' + r.pick.key) broke.builder.push(seed + ' pick ' + p.focus.id);
      if (r && r.pick && r.pick.kind === 'group' && p && p.focus.id !== 'group:' + r.pick.group) broke.builder.push(seed + ' group ' + p.focus.id);
      // the answers: under the voice rules, and a rest answer always leaves a way on
      ['ask_shape', 'ask_lighter', 'ask_targets'].forEach(id => {
        const x = c.ask(id);
        const words = [x.text, x.reason].concat((x.more || []).flatMap(m => [m.text, m.reason])).filter(Boolean).join(' ');
        if (/\b(hasn[’']t|haven[’']t|didn[’']t|still|only|failed|no progress|stopped moving|eat|because|caused|due to|led to|made you|that'?s why|despite|even though|should|must)\b/i.test(words) ||
            /'/.test(words) || /!/.test(words) || (h.u === 'kg' && /\d ?lb\b/.test(words))) broke.answers.push(seed + ' ' + id + ': ' + words.slice(0, 160));
        if (x.id === 'rest_day' && !(x.followups || []).some(f => f.id === 'ask_build_anyway')) broke.answers.push(seed + ' rest with no way on');
      });
    }
  }
  const ms = Date.now() - t0;
  check('the sweep reads the rest read on most of them, and every call occurs (' + reads + ' reads: ' + JSON.stringify(calls) + ', ' + ms + ' ms)',
        reads > N_PROP / 2 && ['rest', 'lighter', 'shape', 'group'].every(c => calls[c] > 0), JSON.stringify(calls));
  check('deterministic: the same history twice is the same read, byte for byte', !broke.deterministic.length, list(broke.deterministic));
  check('order: shuffling the sessions changes nothing', !broke.order.length, list(broke.order));
  check('cardio: sets of cardio added under any group move no window, no big day, no readiness, and never what is recovered', !broke.cardio.length, list(broke.cardio));
  check('food-blind: deleting all food changes nothing in the rest read', !broke.food.length, list(broke.food));
  check('one builder default: Build it, "Tell me what to train", the targets and the teaser build one focus — and nothing names an unrecovered shape as the one to train',
        !broke.builder.length, list(broke.builder));
  check('and every answer they give holds the voice rules, both units, with a way on from every rest', !broke.answers.length, list(broke.answers));
}
{
  // The rows and the replay are answer-time work: a sample of the same sweep.
  const broke = { deterministic: [], order: [], food: [], silence: [] };
  let replayMs = 0, replays = 0, rowsSeen = 0;
  for (let seed = 1; seed <= N_PROP; seed += 10) {
    const h = history(seed);
    const shot = x => { const ri = C.readyInput(x); const last = ri.overlap.shaped[ri.overlap.shaped.length - 1];
      return JSON.stringify({ rows: R.readinessRows(ri, x.now), diffs: last ? R.sessionRows(ri, last) : null }); };
    const a = shot(h);
    rowsSeen += JSON.parse(a).rows.filter(x => x.has).length;
    if (a !== shot(JSON.parse(JSON.stringify(h)))) broke.deterministic.push(seed);
    if (a !== shot({ ...h, sessions: shuffled(h.sessions, seed) })) broke.order.push(seed);
    if (a !== shot({ ...h, summaries: {}, foodFirst: {} })) broke.food.push(seed);
    const t = Date.now();
    const rp = RP(h);
    replayMs = Math.max(replayMs, Date.now() - t);
    replays++;
    if (rp && JSON.stringify(rp) !== JSON.stringify(RP({ ...h, summaries: {} }))) broke.food.push(seed + ' replay');
  }
  for (let seed = 1; seed <= 400; seed++) {
    // Silence: under every minimum, nothing — no rest read, no readiness, no row.
    const h = history(seed, { thin: true });
    const ri = C.readyInput(h);
    const last = ri.overlap.shaped[ri.overlap.shaped.length - 1];
    const n = ri.overlap.shaped.filter(x => x.startedAt <= h.now).length;
    if (n < 6 && rs(h) !== null) broke.silence.push(seed + ' rest read on ' + n);
    if (R.readinessHas(ri, h.now) < 3 && R.readinessAnswer(R.readinessRows(ri, h.now)) !== null) broke.silence.push(seed + ' readiness');
    // Every z component needs eight earlier sessions; the weigh-in is not a z
    // and needs only a week of weigh-ins before that morning (its own gate).
    const zRows = last ? R.sessionRows(ri, last).filter(x => x.id !== 'weighin') : [];
    if (n < 9 && zRows.length) broke.silence.push(seed + ' rows on ' + n + ': ' + zRows.map(x => x.id).join(','));
    const wr = last ? R.sessionRows(ri, last).find(x => x.id === 'weighin') : null;
    const ins = (h.weighIns || []).filter(w => w.t < new Date(last ? last.startedAt : 0).setHours(0, 0, 0, 0) &&
      w.t >= new Date(last ? last.startedAt : 0).setHours(0, 0, 0, 0) - 7 * DAY);
    if (wr && ins.length < 2) broke.silence.push(seed + ' weigh-in row on ' + ins.length + ' readings');
    const c = C.coach(h);
    ['ask_shape', 'ask_lighter'].forEach(id => { const x = c.ask(id); if (['rest_day', 'group_ready', 'readiness'].includes(x.id) && n < 6) broke.silence.push(seed + ' ' + x.id); });
  }
  check('the rows: deterministic, order-blind and food-blind over ' + Math.ceil(N_PROP / 10) + ' of them (' + rowsSeen + ' rows with data)',
        !broke.deterministic.length && !broke.order.length && !broke.food.length,
        list(broke.deterministic.concat(broke.order, broke.food)));
  check('silence: under every minimum, no rest read, no readiness answer and no row (400 thin histories)', !broke.silence.length, list(broke.silence));
  check('the replay stays inside its budget on every sampled history: ' + replayMs + ' ms at the slowest of ' + replays + ' (budget 150 ms)',
        replayMs < 150, String(replayMs));
}
{
  /* THE MARK'S SAFETY, over generated histories with marks on about one
     session in eight: a marked latest exposure gets exactly the target from
     before it, worded from today; no reduce ever originates from a mark. */
  const broke = { replayed: [], why: [], reduce: [] };
  let latest = 0, middle = 0;
  for (let seed = 1; seed <= N_PROP; seed++) {
    const h = history(seed, { marks: true });
    if (!h.settings.marks) continue;
    const ri = C.readyInput(h);
    const plain = C.readyInput({ ...h, settings: { v: 1, mute: {}, answers: {}, asked: {} } });
    ri.overlap.lifts.forEach(l => {
      if (!l.mark) return;
      const ctx = { now: h.now, u: h.u };
      const t = P.targetFor(l, ctx, l.mark);
      const l0 = plain.overlap.lifts.find(x => x.exId === l.exId);
      const t0 = l0 ? P.prescribe(l0, ctx) : null;
      if (l.mark.latest) {
        latest++;
        const L = l.mark.latest;
        const at = L.now;
        const before = l.exposures.filter(e => e.startedAt < at);
        const want = P.prescribe({ ...l, exposures: before, groupDaysSince: O.groupDaysAt(ri.overlap.shaped, l.group, at) }, { ...ctx, now: at });
        const same = (!want && !t) || (want && t && want.mode === t.mode && want.loadLb === t.loadLb &&
          JSON.stringify(want.sets) === JSON.stringify(t.sets));
        if (before.length && !same) broke.replayed.push(seed + ' ' + l.exId);
        if (t && (JSON.stringify(t.why) !== JSON.stringify([MARK1.replace('slept badly', L.word), MARK2]) ||
                  /yesterday|today|last time|\bon (Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/.test(t.why.join(' ') + ' ' + t.line.replace('before your marked session', '')))) {
          broke.why.push(seed + ' ' + t.why.join(' / ') + ' · ' + t.line);
        }
        if (t && t.mode === 'reduce' && !(want && want.mode === 'reduce')) broke.reduce.push(seed + ' latest ' + l.exId);
      } else {
        middle++;
        if (t && t.mode === 'reduce' && !(t0 && t0.mode === 'reduce')) broke.reduce.push(seed + ' middle ' + l.exId + ' ' + t.line + ' / ' + (t0 && t0.line));
      }
    });
  }
  check('a marked latest exposure: its mode, load and per-set targets are the target from before it (' + latest + ' lifts)',
        latest > 50 && !broke.replayed.length, list(broke.replayed));
  check('and its why is exactly the two mark lines, no relative day in them', !broke.why.length, list(broke.why));
  check('a mark never produces a reduce: every reduce under a mark is the unmarked log’s own, or the same attempt again (' + middle + ' lifts marked earlier on)',
        middle > 50 && !broke.reduce.length, list(broke.reduce));
}

/* ---------- the battery, scored ---------- */
section('the battery — ok / miss / wrong');
{
  battery.forEach(b => results.push('  ' + (b.v === 'ok' ? '✓' : b.v === 'miss' ? '·' : '✗') + ' ' + b.id + ' [' + b.v + '] ' + b.said.slice(0, 400)));
  const n = v => battery.filter(b => b.v === v).length;
  results.push('\n  ok: ' + n('ok') + '   miss: ' + n('miss') + '   wrong: ' + n('wrong'));
  check('wrong: 0 — no row says a rest, a window, a pick or a line the row does not', n('wrong') === 0,
        battery.filter(b => b.v === 'wrong').map(b => b.id).join(', '));
}

console.log('\nrest is advice, the pick is what is recovered, and nothing moves on food\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
