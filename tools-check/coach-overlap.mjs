#!/usr/bin/env node
//
// The battery for stage two — coach-overlap.js: plateau or cut?
//
//   node tools-check/coach-overlap.mjs
//
// The plateau-vs-cut call is the most emotionally loaded thing Coach says, and
// the house law is at its sharpest here: A WRONG READING IS WORSE THAN NO
// READING. So every row of the brief's table (SHIP-V49-PROMPT.md §3.11) is
// scored three ways:
//
//   ok     the call the row expects (and the words it pins, where it pins any)
//   miss   Coach said less than it could — `none` or `unknown` where the row
//          expects a reading. Reported, never fatal
//   wrong  anything else: a different reading, a record day where the row
//          wants none, a lighter week where it wants none. FATAL. Wrong stays 0
//
// and then generates thousands of histories — lifts at one to three sessions a
// week, rising, level and falling, with weigh-ins that fall, hold and climb,
// and sometimes none — and holds every one of them to the properties the
// rules promise: deterministic, order-blind, weigh-ins that move bodyweight
// DOWN near the end never turn a cut's reading into a plateau, no weigh-ins
// never yield a call that needs them, a record day never under three reps,
// never at a load not logged in four weeks, never after an F — and no sentence
// carrying a banned word, a causal word or "eat".
//
// NO COPY OF ANY RULE LIVES HERE. coach.js, coach-prog.js and coach-overlap.js
// are staged and driven for real against a stubbed store, and the overlap is
// handed exactly what coach.js hands it (coach.js's overlapInput()), shaped
// sessions and all. Each fixture is built to the row's stated FACTS — the
// sessions, the weigh-ins, the aim — and the expected call is what must come
// out of them.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

/* ================= STAGING ================= */
const dir = mkdtempSync(join(tmpdir(), 'rack-coach-overlap-'));
const at = f => JSON.stringify(pathToFileURL(join(dir, f)).href);
writeFileSync(join(dir, 'store-stub.mjs'), `
export async function read(_p, fallback) { return fallback; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`);
writeFileSync(join(dir, 'analytics.mjs'), src('analytics.js')
  .replace("from './store.js'", "from './store-stub.mjs'")
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './ui.js'", 'from ' + real('ui.js'))
  .replace("from './units.js'", 'from ' + real('units.js')));
writeFileSync(join(dir, 'coach-prog.mjs'), src('coach-prog.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
writeFileSync(join(dir, 'coach-overlap.mjs'), src('coach-overlap.js')
  .replace("from './coach-prog.js'", 'from ' + at('coach-prog.mjs'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
writeFileSync(join(dir, 'coach-build.mjs'), src('coach-build.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './blocks.js'", 'from ' + real('blocks.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-prog.js'", 'from ' + at('coach-prog.mjs'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
writeFileSync(join(dir, 'coach-live.mjs'), src('coach-live.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-build.js'", 'from ' + at('coach-build.mjs'))
  .replace("from './coach-live.js'", 'from ' + at('coach-live.mjs'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './coach-overlap.js'", 'from ' + at('coach-overlap.mjs'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);
const O = await import(pathToFileURL(join(dir, 'coach-overlap.mjs')).href);
const { EXERCISES } = await import(pathToFileURL(join(ROOT, 'exercises.js')).href);
const U = await import(pathToFileURL(join(ROOT, 'units.js')).href);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 6).join('\n         ') + (xs.length > 6 ? '\n         … (' + xs.length + ')' : '');

/* ================= THE FIXTURES =================
   A fixed epoch and every session an offset from it, at a fixed hour, so this
   file answers the same at 2 AM in Auckland as at noon in New York. */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};
const localAt = (ago, hour) => { const d = new Date(NOW - ago * DAY); d.setHours(hour, 0, 0, 0); return d.getTime(); };
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });

const BENCH = 'barbell-bench-press', SQUAT = 'back-squat-high-bar', ROW = 'barbell-row', FLY = 'dumbbell-flye',
      RDL = 'romanian-deadlift', INCLINE = 'incline-dumbbell-bench-press', OHP = 'overhead-press', CURL = 'barbell-curl';

// A set as a finished session stores it: strings, ticked.
const set = (w, r, type) => ({ w: String(w), r: String(r), type: type || 'N', done: true });
const xN = (n, w, r, type) => Array.from({ length: n }, () => set(w, r, type));
let sid = 0;
// rows: [exId, sets]
const sess = (ago, rows, hour) => {
  const t = localAt(ago, hour == null ? 18 : hour);
  return { id: 's' + (++sid), name: 'Session', startedAt: t, _date: key(t),
           exercises: rows.map(([id, sets]) => ({ exId: id, name: LIB[id].name, group: LIB[id].group,
                                                  equipment: LIB[id].equipment, sets })) };
};
const sortS = ss => ss.slice().sort((a, b) => a.startedAt - b.startedAt);
// Weigh-ins every other day from `fromAgo` to `toAgo`, straight from a to b.
const weighIns = (fromAgo, toAgo, a, b, every = 1) => {
  const out = [];
  for (let ago = fromAgo; ago >= toAgo; ago -= every) {
    const f = (fromAgo - ago) / (fromAgo - toAgo || 1);
    out.push({ lb: Math.round((a + (b - a) * f) * 10) / 10, t: localAt(ago, 7) });
  }
  return out;
};
const input = extra => ({
  now: NOW, opens: 0, recentGreets: [], u: 'lb', log: 'readable', sessions: [], lib: LIB, hidden: [],
  libReady: true, routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null,
  summaries: {}, steps: { days: {} }, weighIns: [],
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
  settings: { v: 1, mute: {}, answers: {}, asked: {} },
  ...extra
});
const aim = a => ({ settings: { v: 1, mute: {}, answers: a ? { q_goal_aim: a } : {}, asked: {} } });
const ctxOf = i => ({ now: i.now, u: i.u, aim: i.aim, exp: i.exp, energy: i.energy, rateWk: i.rateWk });
const readOf = (inp, exId) => {
  const oi = C.overlapInput(inp);
  const ex = oi.lifts.find(l => l.exId === exId);
  return ex ? O.readLift(ex, ctxOf(oi), oi) : { call: 'none', because: 'absent' };
};

/* Session days: `perWeek` sessions a week over `weeks` weeks ending `endAgo`
   days back, oldest first. 1 → every 7 days, 2 → 3 and 4 days apart, 3 → 2,
   2 and 3. */
function daysFor(perWeek, weeks, endAgo) {
  const gaps = perWeek === 1 ? [7] : perWeek === 2 ? [3, 4] : [2, 2, 3];
  const out = [];
  let ago = endAgo, g = 0;
  while (ago <= endAgo + weeks * 7 - 1) { out.push(ago); ago += gaps[g++ % gaps.length]; }
  return out.reverse();
}
/* A level top set, ±1% on the estimated max: 225×5 (263), 230×4 (261),
   220×6 (264), round and round. No point 1% over every earlier one. */
const LEVEL = [[225, 5], [230, 4], [220, 6]];
const levelSets = (k, n = 3) => { const [w, r] = LEVEL[k % 3]; return xN(n, w, r); };
// A steady back-and-legs week beside the bench, so dropping a chest exercise
// never makes a whole week look light.
const others = (days, extra) => days.flatMap((ago, k) => [
  sess(ago + 1, [[SQUAT, xN(4, 245, 5)], [RDL, xN(3, 185, 8)]], 9),
  ...(k % 2 ? [] : [sess(ago, [[ROW, xN(3, 155, 8)]], 20)])
]).concat(extra || []);

/* ---------- C1: holding through a cut ---------- */
function C1(perWeek = 2, o = {}) {
  const days = daysFor(perWeek, 6, 3);
  const bench = days.map((ago, k) => sess(ago, [[BENCH, levelSets(k)]]));
  return input({
    sessions: sortS(bench.concat(o.others || [])),
    weighIns: weighIns(49, 0, 212.5, 204.5),
    weight: { latestLb: 204.5, latestAt: localAt(0, 7), rateWk: -1.15, rateDays: 42, goalDir: o.goalDir ?? null, goalRateWk: null },
    ...aim(o.aim)
  });
}
// 10 exposures over six weeks, one a week and then two — the row's own count.
function C1_ten(o = {}) {
  const days = [45, 38, 31, 27, 24, 20, 17, 13, 10, 3];
  const bench = days.map((ago, k) => sess(ago, [[BENCH, levelSets(k)]]));
  return input({
    sessions: sortS(bench),
    weighIns: weighIns(49, 0, 212.5, 204.5),
    weight: { latestLb: 204.5, latestAt: localAt(0, 7), rateWk: -1.15, rateDays: 42, goalDir: o.goalDir ?? null, goalRateWk: null },
    ...aim(o.aim)
  });
}

/* ---------- C2: sliding through a hard cut ---------- */
function C2() {
  const days = [44, 38, 32, 26, 20, 14, 8, 2];
  const loads = [285, 283, 280, 276, 271, 266.5, 263, 260];     // 333 → 303 estimated
  return input({
    sessions: sortS(days.map((ago, k) => sess(ago, [[SQUAT, xN(3, loads[k], 5)]]))),
    weighIns: weighIns(50, 0, 180.6, 166.4),
    weight: { latestLb: 166.4, latestAt: localAt(0, 7), rateWk: -2.2, rateDays: 42, goalDir: -1, goalRateWk: -1 }
  });
}

/* ---------- C3: a real plateau, and its rungs ----------
   Bench twice a week for twelve weeks: climbing 2.5 lb a session to 225×5,
   then level. Flyes beside it until four weeks ago, and then not — so his
   chest sets are under both his own normal and ten. */
function C3(o = {}) {
  const perWeek = o.perWeek || 2;
  const flatDays = o.flatDays || 38;
  const days = daysFor(perWeek, 12, 2);
  const rows = [];
  let w = 225 - 2.5 * days.filter(a => a > flatDays).length;
  days.forEach((ago, k) => {
    let bench;
    if (ago > flatDays) { w += 2.5; bench = xN(3, w, 5); }
    else if (o.grind && ago <= 10) bench = o.grind[days.filter(a => a <= 10).indexOf(ago)];
    else bench = levelSets(k);
    const ex = [[BENCH, bench]];
    if (ago >= 28) ex.push([FLY, xN(3, 35, 12)]);
    rows.push(sess(ago, ex));
  });
  const extra = (o.incline || []).map(ago => sess(ago, [[INCLINE, xN(3, 70, 10)]]));
  return input({
    sessions: sortS(rows.concat(others(days.filter((a, k) => k % perWeek === 0)), extra)),
    weighIns: weighIns(90, 0, 190, 191.6, 2),
    weight: { latestLb: 191.6, latestAt: localAt(0, 7), rateWk: 0.13, rateDays: 90, goalDir: null, goalRateWk: null },
    ...aim(o.aim)
  });
}

/* ---------- C4: irregular ----------
   Bench twice a week for eight weeks, then three times in the last four —
   the rest of his week carrying on as it was, so it is bench he did less of,
   not training. */
function C4() {
  const early = daysFor(2, 8, 29);                    // twice a week, weeks 5 to 12
  const late = [24, 14, 3];                           // three in the last four weeks
  const days = early.concat(late);
  return input({
    sessions: sortS(days.map((ago, k) => sess(ago, [[BENCH, levelSets(k)]])).concat(others(daysFor(1, 12, 2)))),
    weighIns: weighIns(90, 0, 190, 190.4, 2),
    weight: { latestLb: 190.4, latestAt: localAt(0, 7), rateWk: 0.03, rateDays: 90, goalDir: null, goalRateWk: null }
  });
}

/* ---------- C5: fatigue ---------- */
function C5() {
  const days = daysFor(2, 12, 2);
  return input({
    sessions: sortS(days.map((ago, k) => sess(ago, [[BENCH, levelSets(k)], [FLY, xN(ago < 14 ? 4 : 2, 35, 12)]]))
      .concat(others(days.filter((a, k) => k % 2 === 0)))),
    weighIns: weighIns(90, 0, 190, 190.4, 2),
    weight: { latestLb: 190.4, latestAt: localAt(0, 7), rateWk: 0.03, rateDays: 90, goalDir: null, goalRateWk: null }
  });
}

/* ---------- C6, C8: no weigh-ins; three sessions ---------- */
function C6() {
  const days = daysFor(2, 8, 2);
  return input({ sessions: sortS(days.map((ago, k) => sess(ago, [[BENCH, levelSets(k)]]))) });
}
function C8() {
  return input({ sessions: sortS([20, 12, 3].map((ago, k) => sess(ago, [[BENCH, levelSets(k)]]))),
                 weighIns: weighIns(30, 0, 190, 190.2, 2),
                 weight: { latestLb: 190.2, latestAt: localAt(0, 7), rateWk: 0, rateDays: 30, goalDir: null, goalRateWk: null } });
}

/* ---------- C7: progressing ---------- */
function C7() {
  const days = daysFor(2, 8, 2);
  return input({ sessions: sortS(days.map((ago, k) => sess(ago, [[BENCH, xN(3, 185 + 2.5 * k, 5)]]))),
                 weighIns: weighIns(60, 0, 190, 190.2, 2),
                 weight: { latestLb: 190.2, latestAt: localAt(0, 7), rateWk: 0, rateDays: 60, goalDir: null, goalRateWk: null } });
}

/* ---------- C11: a new best two weeks ago, level since ---------- */
function C11() {
  const days = daysFor(2, 8, 2);
  return input({
    sessions: sortS(days.map((ago, k) => sess(ago, [[BENCH, ago > 14 ? levelSets(k) : ago === 14 ? xN(3, 235, 5) : xN(3, 232.5, 5)]]))),
    weighIns: weighIns(60, 0, 190, 190.2, 2),
    weight: { latestLb: 190.2, latestAt: localAt(0, 7), rateWk: 0, rateDays: 60, goalDir: null, goalRateWk: null }
  });
}

/* ---------- C12: Micah's case — down 7% over five weeks while gaining ---------- */
function C12() {
  const days = [36, 32, 29, 25, 22, 18, 15, 11, 8, 4, 1];
  const loads = [283, 281, 279, 277, 275, 272, 270, 268, 265, 262, 260];   // 329 → 304.5, 7.4% down
  return input({
    sessions: sortS(days.map((ago, k) => sess(ago, [[SQUAT, xN(3, loads[k], 5)]]))),
    weighIns: weighIns(42, 0, 180, 183, 1),
    weight: { latestLb: 183, latestAt: localAt(0, 7), rateWk: 0.5, rateDays: 42, goalDir: null, goalRateWk: null },
    ...aim('muscle')
  });
}

/* ---------- P: record days ----------
   Bench twice a week, climbing to 3×5 at 225 (best estimated max 263), last
   done three days ago. */
function P1(o = {}) {
  const days = daysFor(2, 6, o.lastAgo ?? 3);
  const loads = days.map((a, k) => 225 - 2.5 * (days.length - 1 - k));
  const rows = days.map((ago, k) => {
    let sets = xN(3, loads[k], 5);
    if (k === days.length - 1 && o.single) sets = [set(315, 1)].concat(xN(3, 225, 5));
    if (k === days.length - 1 && o.fail) sets = [set(225, 5), set(225, 5), set(225, 5, 'F')];
    return sess(ago, [[BENCH, sets]]);
  });
  return input({
    sessions: sortS(rows),
    weighIns: weighIns(45, 0, 185, 185, 2),
    weight: o.deep
      ? { latestLb: 180, latestAt: localAt(0, 7), rateWk: -2.2, rateDays: 21, goalDir: -1, goalRateWk: -1 }
      : { latestLb: 185, latestAt: localAt(0, 7), rateWk: 0, rateDays: 45, goalDir: null, goalRateWk: null }
  });
}

/* ---------- L: the lighter week ---------- */
function L(o = {}) {
  // Weekly: bench and squat level for eight weeks, then falling — two lifts
  // declining. Back and arms beside them, steady.
  const days = daysFor(1, 12, 2);
  const rows = [];
  days.forEach((ago, k) => {
    const falling = k >= days.length - 3 && o.decline !== false;
    const fall = falling ? 0.9 : 1;
    const f = !!o.failure && ago < 14;
    const benchSets = [set(Math.round(225 * fall), 5), set(Math.round(225 * fall), 5), set(Math.round(225 * fall), 5, f ? 'F' : 'N')];
    const squatSets = [set(Math.round(275 * fall), 5), set(Math.round(275 * fall), 5, f ? 'F' : 'N'), set(Math.round(275 * fall), 5)];
    const back = xN(o.volume && ago < 14 ? 7 : 4, 155, 8, 'N');
    if (f) { back[0].type = 'F'; back[1].type = 'F'; }
    if (o.failure && !f && k % 3 === 0) back[3].type = 'F';           // his usual share: about 4%
    rows.push(sess(ago, [[BENCH, benchSets], [SQUAT, squatSets]]));
    rows.push(sess(ago + 2, [[ROW, back], [CURL, xN(o.volume && ago < 14 ? 7 : 4, 65, 10)]]));
    if (o.lightAgo != null && ago === o.lightAgo) rows.splice(rows.length - 2, 2, sess(ago, [[BENCH, xN(1, 185, 5)]]));
  });
  return input({ sessions: sortS(rows) });
}

/* THE TABLE. `want` is the row: the call, and any words it pins. */
const ROWS = [
  { id: 'C1', inp: C1_ten(), ex: BENCH, want: { call: 'holding_cut' } },
  { id: 'C1b', inp: C1_ten({ aim: 'cut' }), ex: BENCH, want: { call: 'holding_cut', says: [/that’s the win/] } },
  { id: 'C2', inp: C2(), ex: SQUAT, want: { call: 'sliding' } },
  { id: 'C3', inp: C3(), ex: BENCH, want: { call: 'plateau', rung: 'volume' } },
  { id: 'C3b', inp: C3({ flatDays: 64, incline: [150, 146, 143] }), ex: BENCH,
    want: { call: 'plateau', rung: 'variation', says: [/Incline Dumbbell Bench Press/] } },
  { id: 'C3c', inp: C3({ flatDays: 30, grind: [xN(3, 225, 4), xN(3, 225, 5), xN(3, 225, 4)] }), ex: BENCH,
    want: { call: 'plateau', rung: 'reset' } },
  { id: 'C4', inp: C4(), ex: BENCH, want: { call: 'irregular' } },
  { id: 'C5', inp: C5(), ex: BENCH, want: { call: 'fatigue' } },
  { id: 'C6', inp: C6(), ex: BENCH, want: { call: 'unknown' } },
  { id: 'C7', inp: C7(), ex: BENCH, want: { call: 'none' } },
  { id: 'C8', inp: C8(), ex: BENCH, want: { call: 'none' } },
  { id: 'C9', inp: C3({ perWeek: 3 }), ex: BENCH, want: { call: 'plateau' } },
  { id: 'C10', inp: C1(3), ex: BENCH, want: { call: 'holding_cut' } },
  { id: 'C1@2', inp: C1(2), ex: BENCH, want: { call: 'holding_cut' } },
  { id: 'C11', inp: C11(), ex: BENCH, want: { call: 'none' } },
  { id: 'C12', inp: C12(), ex: SQUAT,
    want: { call: 'plateau', says: [/down 7%/, /your weight has gone up/], never: [/\blevel\b/i, /\bsteady\b/i] } },
  { id: 'C13', inp: C1_ten({ aim: 'muscle' }), ex: BENCH, want: { call: 'holding_cut', never: [/\bcut/i] } }
];

/* ================= A. THE TABLE ================= */
section('A. the brief’s table, row by row — ok / miss / wrong');
const tally = { ok: 0, miss: 0, wrong: 0 };
const said = [];
{
  ROWS.forEach(row => {
    const r = readOf(row.inp, row.ex);
    if (r.text) said.push({ u: 'lb', id: row.id, text: r.text }, { u: 'lb', id: row.id, text: r.reason });
    const w = row.want, bad = [];
    if (r.call !== w.call) bad.push('call ' + r.call + (r.because ? '(' + r.because + ')' : '') + ', want ' + w.call);
    if (w.rung && r.rung !== w.rung) bad.push('rung ' + r.rung + ', want ' + w.rung);
    (w.says || []).forEach(re => { if (!re.test(r.text || '')) bad.push('does not say ' + re); });
    (w.never || []).forEach(re => { if (re.test((r.text || '') + ' ' + (r.reason || ''))) bad.push('says ' + re); });
    const kind = !bad.length ? 'ok' : (r.call === 'none' || r.call === 'unknown') && w.call !== 'none' ? 'miss' : 'wrong';
    tally[kind]++;
    check(row.id + ' → ' + r.call + (r.rung ? ' / ' + r.rung : '') + (r.text ? ': ' + r.text : ''), kind !== 'wrong',
          kind + ' — ' + bad.join('; '));
  });

  // C7 again, end to end: no stall sentence anywhere on the sheet.
  const c7 = C.coach(C7());
  const stallish = C.ROUTE_IDS.map(id => c7.ask(id)).filter(a => /plateau|stall|\bflat\b|\blevel\b/i.test(a.text + ' ' + a.reason));
  check('C7 end to end: a progressing lift gets no stall sentence anywhere on the sheet',
        !stallish.length, list(stallish.map(a => a.id + ': ' + a.text)));
  // C13 and C1 against C1b: "cut" only under the rule.
  const c1 = readOf(C1_ten(), BENCH), c1dir = readOf(C1_ten({ goalDir: -1 }), BENCH);
  check('C1 with no aim and no direction never says "cut"; with his food targets set to lose, it may',
        !/\bcut/i.test(c1.text) && /\bcut\b/.test(c1dir.text), c1.text + ' // ' + c1dir.text);

  // The P rows: a record day, and the four ways there is none.
  const rec = inp => { const oi = C.overlapInput(inp); return O.recordDay(oi, NOW); };
  const P = [
    ['P1', rec(P1()), p => !!p && p.exId === BENCH && p.reps === 6 && Math.abs(p.load - 225) < 0.01 && /Good day for 6 at 225 lb on Barbell Bench Press/.test(p.text), 'recordDay → 6 at 225'],
    ['P2', rec(P1({ deep: true })), p => p === null, 'energy deep: no candidate'],
    ['P3', rec(P1({ single: true })), p => p === null, 'best set a single, one more rep a double: no candidate'],
    ['P4', rec(P1({ fail: true })), p => p === null, 'an F in the last session: no candidate'],
    ['P5', rec(P1({ lastAgo: 14 })), p => p === null, 'last done 14 days ago: no candidate']
  ];
  P.forEach(([id, p, ok, want]) => {
    const good = ok(p);
    if (p && p.text) said.push({ u: 'lb', id, text: p.text }, { u: 'lb', id, text: p.reason }, { u: 'lb', id, text: p.unseen });
    tally[good ? 'ok' : 'wrong']++;
    check(id + ' — ' + want + (p ? ': ' + p.text : ': none'), good, 'wrong — got ' + (p ? p.text : 'none'));
  });

  // The L rows.
  const lw = inp => { const oi = C.overlapInput(inp); return O.lighterWeek(oi, NOW); };
  const l1 = lw(L({ failure: true }));
  const l1ok = !!l1 && l1.conds.declining && l1.conds.failure && l1.groups.length > 0 &&
    /about half your usual sets \(for you, about \d+ for chest/.test(l1.text);
  tally[l1ok ? 'ok' : 'wrong']++;
  check('L1 — two lifts declining and F share well over his usual: a lighter week, with his own halves' + (l1 ? ': ' + l1.text : ''),
        l1ok, 'wrong — ' + JSON.stringify(l1 && l1.conds));
  if (l1) said.push({ u: 'lb', id: 'L1', text: l1.text }, { u: 'lb', id: 'L1', text: l1.reason });
  const l2a = lw(L({ decline: false, volume: true }));
  const l2b = lw(L({ lightAgo: 23 }));
  const l2ok = l2a === null && l2b === null;
  tally[l2ok ? 'ok' : 'wrong']++;
  check('L2 — one condition alone is no lighter week: a big fortnight on its own, and two lifts declining three weeks after a light week',
        l2ok, 'wrong — ' + JSON.stringify([l2a && l2a.conds, l2b && l2b.conds]));
  // And L2b really is the one condition it says it is: the same log without
  // its light week is offered one — two lifts declining, and more than six
  // weeks since a light week — so the light week is what stops it.
  const noLight = lw(L({}));
  check('L2b holds two declining lifts: without its light week the same log IS offered one — the light week is what stops it',
        !!noLight && noLight.conds.declining && noLight.conds.sinceLight && !noLight.conds.failure,
        JSON.stringify(noLight && noLight.conds));

  results.push('\n  ok: ' + tally.ok + '   miss: ' + tally.miss + '   wrong: ' + tally.wrong);
  check('wrong: 0 — no row reads a plateau, a cut, a record or a lighter week the row does not', tally.wrong === 0);
}

/* ================= B. THE PROPERTIES ================= */
section('B. seeded histories with weigh-ins — the properties the rules promise');
const rng = seed => () => {
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const POOL = [
  [BENCH, 185, 5], [SQUAT, 245, 10], ['conventional-deadlift', 315, 10], [OHP, 115, 5], [ROW, 155, 5],
  [INCLINE, 60, 5], ['dumbbell-bench-press', 70, 5], [FLY, 30, 5], [CURL, 65, 5], ['leg-press', 360, 20],
  ['pull-up', 0, 0], ['assisted-pull-up', 50, -5], ['treadmill-run', 0, 0]
];
function history(seed, u) {
  const r = rng(seed);
  const pick = xs => xs[Math.floor(r() * xs.length)];
  const nLifts = 1 + Math.floor(r() * 4);
  const lifts = [];
  while (lifts.length < nLifts) { const l = pick(POOL); if (!lifts.includes(l)) lifts.push(l); }
  const weeks = 3 + Math.floor(r() * 12);
  const sessions = [];
  lifts.forEach(([id, base, step]) => {
    const perWeek = 1 + Math.floor(r() * 3);
    const trend = pick([-1, 0, 0, 1, 1]);
    let days = daysFor(perWeek, weeks, Math.floor(r() * 5));
    // Now and then, a lift he has been doing far less of lately.
    if (r() < 0.12) days = days.filter(ago => ago >= 28 || r() < 0.3);
    let L = base, reps = 3 + Math.floor(r() * 9);
    days.forEach((ago, k) => {
      if (r() < 0.06) return;                                  // a missed session
      if (k && r() < 0.4) L = Math.max(0, L + trend * step);
      if (k && r() < 0.3) reps = Math.max(1, Math.min(15, reps + Math.floor(r() * 3) - 1));
      const w = u === 'kg' && L > 0 && r() < 0.1 ? String(Math.round(L / 5) * 5) : String(L);
      const n = 2 + Math.floor(r() * 3);
      const sets = Array.from({ length: n }, (_, j) => set(w, Math.max(1, reps - (j && r() < 0.3 ? 1 + Math.floor(r() * 3) : 0)),
        r() < 0.08 ? 'F' : 'N'));
      if (r() < 0.2) sets.unshift(set(String(Math.max(0, L - 2 * Math.abs(step))), 8, 'W'));
      if (r() < 0.05) sets.unshift(set(String(L + Math.abs(step) * 4), 1));
      sessions.push(sess(ago, [[id, sets]], 6 + Math.floor(r() * 14)));
    });
  });
  const wi = [];
  if (r() > 0.15) {
    const start = 60 + Math.floor(r() * 50), bw = 150 + r() * 80, pctWk = (r() * 2.2 - 1.5) / 100;
    const every = 1 + Math.floor(r() * 3);
    for (let ago = start; ago >= 0; ago -= every) {
      if (r() < 0.1) continue;
      wi.push({ lb: Math.round((bw * (1 + pctWk * (start - ago) / 7) + (r() - 0.5) * 2) * 10) / 10, t: localAt(ago, 7) });
    }
  }
  const rate = wi.length > 4 ? (wi[wi.length - 1].lb - wi[0].lb) / ((wi[wi.length - 1].t - wi[0].t) / DAY / 7) : null;
  const aimV = pick([null, 'strength', 'powerlifting', 'muscle', 'cut', 'recomp', 'maintain']);
  return input({
    u, sessions: sortS(sessions), weighIns: wi,
    weight: { latestLb: wi.length ? wi[wi.length - 1].lb : null, latestAt: wi.length ? wi[wi.length - 1].t : null,
              rateWk: rate, rateDays: wi.length ? 60 : null, goalDir: pick([null, null, -1, 0, 1]),
              goalRateWk: pick([null, -0.5, -1, -1.5, 0.5]) },
    ...aim(aimV)
  });
}

const OFFENCES = (() => {
  const V = src('tools-check/coach-voice.mjs');
  const m = /const BANNED = \[([\s\S]*?)\];/.exec(V);
  const c = /const CAUSAL = \[([\s\S]*?)\];/.exec(V);
  if (!m || !c) throw new Error('coach-overlap: the BANNED or CAUSAL list moved out of coach-voice.mjs — this check is stale');
  return new Function('return [' + m[1] + '].concat([' + c[1] + ']);')().concat([
    /\beat\b/i, /\beating\b/i, /\bshould\b/i, /\btry\b/i, /\bmust\b/i, /\bthat'?s why\b/i, /\bcaused\b/i,
    /\b(1\s*rm|one[- ]rep max) (test|attempt)|\bmax(ing)? out\b|\btest your max\b/i
  ]);
})();
const offences = (text, u) => {
  const out = OFFENCES.filter(re => re.test(text)).map(re => (text.match(re) || [''])[0]);
  if (u === 'kg' && /\d ?lb\b/.test(text)) out.push('lb on a kilo account');
  if (u === 'lb' && /\d ?kg\b/.test(text)) out.push('kg on a pound account');
  if (/'/.test(text)) out.push('a straight apostrophe');
  if (/undefined|NaN|null|Infinity/.test(text)) out.push('a broken number');
  return out;
};

{
  const PER_UNIT = 1100;
  const broke = {};
  const note = (k, why) => { (broke[k] = broke[k] || []).push(why); };
  const calls = {};
  let reads = 0, records = 0, lighters = 0;
  const NEED_WEIGHT = ['holding_cut', 'small_slide', 'sliding', 'plateau'];
  for (const u of ['lb', 'kg']) {
    for (let s = 1; s <= PER_UNIT; s++) {
      const h = history(s * 7919 + (u === 'kg' ? 17 : 0), u);
      const tag = u + ' seed ' + s;
      const oi = C.overlapInput(h);
      const ctx = ctxOf(oi);
      oi.lifts.forEach(ex => {
        const r = O.readLift(ex, ctx, oi);
        reads++;
        calls[r.call] = (calls[r.call] || 0) + 1;
        if (r.text) said.push({ u, id: tag, text: r.text }, { u, id: tag, text: r.reason });
        // Deterministic, and order-blind (sessions and weigh-ins shuffled).
        const again = O.readLift(ex, ctx, C.overlapInput(JSON.parse(JSON.stringify(h))));
        if (JSON.stringify(again) !== JSON.stringify(r)) note('deterministic', tag + ' ' + ex.exId);
        const shuffled = { ...h, sessions: h.sessions.slice().reverse(), weighIns: h.weighIns.slice().reverse() };
        const oiS = C.overlapInput(shuffled);
        const rS = O.readLift(oiS.lifts.find(l => l.exId === ex.exId), ctxOf(oiS), oiS);
        if (JSON.stringify(rS) !== JSON.stringify(r)) note('shuffle', tag + ' ' + ex.exId);
        // No weigh-ins: never a call that needs them.
        const noW = C.overlapInput({ ...h, weighIns: [] });
        const rN = O.readLift(noW.lifts.find(l => l.exId === ex.exId), ctxOf(noW), noW);
        if (NEED_WEIGHT.includes(rN.call)) note('noweigh', tag + ' ' + ex.exId + ' → ' + rN.call);
        // Weigh-ins that move bodyweight DOWN at the end never make a cut's reading a plateau.
        if ((r.call === 'holding_cut' || r.call === 'small_slide') && Number.isFinite(r.end) && r.bwE) {
          const lower = [1, 2, 3].map(k => ({ lb: Math.round((r.bwE - 4) * 10) / 10, t: r.end - k * 36e5 }));
          const oiD = C.overlapInput({ ...h, weighIns: h.weighIns.concat(lower) });
          const rD = O.readLift(oiD.lifts.find(l => l.exId === ex.exId), ctxOf(oiD), oiD);
          if (rD.call === 'plateau') note('down', tag + ' ' + ex.exId + ' ' + r.call + ' → plateau');
        }
      });
      // A record day, if any: three reps or more, a top load logged in four
      // weeks, and never after an F.
      const p = O.recordDay(oi, NOW);
      if (p) {
        records++;
        said.push({ u, id: tag, text: p.text }, { u, id: tag, text: p.reason }, { u, id: tag, text: p.unseen });
        if (!(p.reps >= 3)) note('reps', tag + ' ' + p.reps);
        const ex = oi.lifts.find(l => l.exId === p.exId);
        const recent = ex.exposures.filter(e => (NOW - e.startedAt) / DAY < 28.5);
        if (!recent.some(e => e.sets.some(x => x.w === p.w))) note('load', tag + ' ' + p.w + ' not logged in four weeks');
        const lastE = ex.exposures[ex.exposures.length - 1];
        if (lastE.allSets.some(x => x.type === 'F')) note('failure', tag + ' after an F');
      }
      const l = O.lighterWeek(oi, NOW);
      if (l) { lighters++; said.push({ u, id: tag, text: l.text }, { u, id: tag, text: l.reason }); }
    }
  }
  const PROPS = [
    ['deterministic', 'the same history twice is the same reading'],
    ['shuffle', 'shuffling sessions and weigh-ins changes nothing'],
    ['down', 'weigh-ins that move bodyweight down at the end never turn holding_cut or small_slide into plateau'],
    ['noweigh', 'with no weigh-ins, never a call that needs them (holding_cut, small_slide, sliding, plateau)'],
    ['reps', 'a record day never proposes under three reps'],
    ['load', 'never a load he has not logged in the last four weeks'],
    ['failure', 'and never after an F']
  ];
  PROPS.forEach(([k, label]) => check(label, !broke[k], list(broke[k] || [])));
  // `node tools-check/coach-overlap.mjs --show` prints one reading of each
  // call, in each unit, for a person to read.
  if (process.argv.includes('--show')) {
    const shown = new Set();
    said.forEach(x => {
      const k = x.u + ' ' + (x.text.match(/^(Good day|A lighter week|Your estimated max|[^,]+? (is|has been) (level|down))/) || [x.text.slice(0, 12)])[0].replace(/.* (is|has been) /, '');
      if (!shown.has(k) && x.id.includes('seed')) { shown.add(k); console.log('[' + x.u + '] ' + x.text); }
    });
  }
  const every = ['irregular', 'fatigue', 'holding_cut', 'small_slide', 'sliding', 'plateau', 'unknown', 'none'];
  check('the sweep is wide enough to mean something: ' + (PER_UNIT * 2) + ' histories, ' + reads + ' readings, ' +
        records + ' record days, ' + lighters + ' lighter weeks, every call',
        every.every(k => calls[k] > 0) && records > 20, JSON.stringify(calls));
}

/* ================= C. THE WORDS ================= */
section('C. the must-never scan — every sentence and its evidence');
{
  const bad = said.map(x => ({ ...x, hits: offences(String(x.text), x.u) })).filter(x => x.hits.length);
  check('no banned word, no causal word, no "eat", no max attempt, no crossed unit, no straight apostrophe (' + said.length + ' strings)',
        said.length > 500 && !bad.length, list(bad.map(x => x.id + ' [' + x.u + '] ' + x.hits.join('/') + ' in: ' + x.text)));
  check('and every sentence ends as a sentence', said.every(x => /[.)]$/.test(String(x.text))),
        list(said.filter(x => !/[.)]$/.test(String(x.text))).map(x => x.text)));
  check('both units were read', said.filter(x => x.u === 'kg').length > 100);
  check('"stalled" appears in no reading but a plateau, and never beside a cut that is holding',
        !said.some(x => /\bstalled\b/i.test(x.text)));
}

/* ================= D. THE WIRING — through coach.js, end to end ================= */
section('D. the wiring — the routes, the topics, the stall reconciled, the switches');
{
  const c = inp => C.coach(inp);
  // How are my lifts moving?
  const moving = c(C7()).ask('ask_lifts');
  check('"How are my lifts moving?" answers, and a climbing lift says by how much, on its estimated max',
        moving.id === 'lift_status' && /^Barbell Bench Press: up about [\d.]+ lb on your estimated max over \d+ weeks\.$/.test(moving.text),
        moving.id + ': ' + moving.text);
  const thin = c(C8()).ask('ask_lifts');
  check('"too soon to call" only when the window is too thin to read — three sessions', /too soon to call \(3 sessions\)/.test(thin.text), thin.text);
  const recent = c(C11()).ask('ask_lifts');
  check('a new best inside three weeks is never a reading — it is how much it moved, or level since the best',
        /: up about [\d.]+ lb|level lately, after a new best on /.test(recent.text) && !/plateau|slide|\bcut\b/.test(recent.text), recent.text);
  const held = c(C1_ten({ aim: 'cut' })).ask('ask_lifts');
  check('a flat lift is its reading — here, holding through his cut', /that’s the win/.test(held.text), held.text);
  const many = input({ sessions: sortS(daysFor(2, 8, 2).map((ago, k) => sess(ago, [
    [BENCH, xN(3, 185 + k, 5)], [SQUAT, xN(3, 245 + k, 5)], [ROW, xN(3, 155, 8)], [OHP, xN(3, 95, 8)],
    [CURL, xN(2, 65, 10)], [RDL, xN(3, 185, 8)], [FLY, xN(2, 30, 12)]]))) });
  const m = c(many).ask('ask_lifts');
  check('five lifts at most: the answer, then one bubble for each of the rest',
        m.id === 'lift_status' && (m.more || []).length === 4, (m.more || []).length + ' more');
  check('never an assisted, a bodyweight or a cardio lift in it',
        !/Assisted|Pull-Up|Treadmill/.test([m.text].concat((m.more || []).map(x => x.text)).join(' ')));

  // Good day for a record?
  const rd = c(P1()).ask('ask_record_day');
  check('"Good day for a record?" answers with the rep record, and the unseen line follows it',
        rd.id === 'record_day' && /Good day for 6 at 225 lb/.test(rd.text) && /can’t see how you slept/.test((rd.more || [])[0].text),
        rd.text);
  check('and says nothing on a day that does not qualify', c(P1({ deep: true })).ask('ask_record_day').id !== 'record_day');
  // A kilo account's log, typed in kilos and stored in pounds, climbing to 3×5
  // at 100 kg. One typed in pounds lands off the half-kilo grid and, rightly,
  // names no record at all.
  const kgLog = { ...P1(), u: 'kg', sessions: P1().sessions.map((x, k, all) => ({ ...x, exercises: x.exercises.map(e =>
    ({ ...e, sets: e.sets.map(z => ({ ...z, w: String(U.wIn(100 - 2.5 * (all.length - 1 - k), 'kg')) })) })) })) };
  const kgRec = c(kgLog).ask('ask_record_day');
  check('on kilos, the same record in kilos, at a weight he typed', /^Good day for 6 at 100 kg on Barbell Bench Press/.test(kgRec.text), kgRec.text);
  check('and a kilo account whose log sits off the half-kilo grid is never handed a record to chase',
        c({ ...P1(), u: 'kg' }).ask('ask_record_day').id !== 'record_day');

  // Should I go lighter?
  const lw = c(L({ failure: true })).ask('ask_lighter');
  check('"Should I go lighter?" answers when two signs line up', lw.id === 'lighter_week' && /lighter week/.test(lw.text), lw.id);
  check('and not when one does', c(L({ decline: false, volume: true })).ask('ask_lighter').id !== 'lighter_week');
  check('lighter_week is sheet-only, and supersedes the record and near-record findings',
        (() => { const it = C.INTENTS.find(i => i.id === 'lighter_week');
                 return JSON.stringify(it.surfaces) === '["sheet"]' && it.supersedes.includes('recent_pr') && it.supersedes.includes('pr_proximity'); })());

  // The Train topics.
  const tp = x => c(x).topicsFor('train').map(t => t.id);
  check('Train offers "Good day for a record?" only on a day that has one',
        tp(P1()).includes('ask_record_day') && !tp(P1({ deep: true })).includes('ask_record_day'), tp(P1()).join(','));
  check('and "Should I go lighter?" only when it would answer',
        tp(L({ failure: true })).includes('ask_lighter') && !tp(L({ decline: false, volume: true })).includes('ask_lighter'));
  check('and "How are my lifts moving?" once a lift has a reading of any kind', tp(C7()).includes('ask_lifts'));

  // Anything stalled? — the reconciled stalled_lift.
  const st = c(C1_ten({ aim: 'cut' })).ask('ask_stall');
  check('"Anything stalled?" on a cut that is holding answers with the holding reading, never a stall',
        st.id === 'stalled_lift' && /that’s the win/.test(st.text) && !/stall/i.test(st.text), st.id + ': ' + st.text);
  check('and on a climbing lift it is not the stall rule that answers', c(C7()).ask('ask_stall').id !== 'stalled_lift');

  // The switches.
  const ids = C.CATEGORY_IDS;
  check('category rest sits directly after recency, and patterns is still last',
        ids.indexOf('rest') === ids.indexOf('recency') + 1 && ids[ids.length - 1] === 'patterns', ids.join(','));
  const mute = (x, k) => ({ ...x, settings: { ...x.settings, mute: { [k]: true } } });
  check('Rest and lighter weeks switched off: no lighter week', c(mute(L({ failure: true }), 'rest')).ask('ask_lighter').id !== 'lighter_week');
  check('Stalls and records switched off: no lift readings and no record day',
        c(mute(C7(), 'progression')).ask('ask_lifts').id !== 'lift_status' && c(mute(P1(), 'progression')).ask('ask_record_day').id !== 'record_day');
}

console.log('\nCoach tells a plateau from a cut, or says it can’t\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
