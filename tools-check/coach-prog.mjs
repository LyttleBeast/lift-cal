#!/usr/bin/env node
//
// The battery for Coach's targets — coach-prog.js.
//
//   node tools-check/coach-prog.mjs
//
// Tonight Coach names a weight to put on a bar, and the house law has its
// sharpest edge yet: A WRONG NUMBER IS WORSE THAN NO NUMBER. So this file
// scores every row of the brief's table (SHIP-V48-PROMPT.md §10.1) three ways:
//
//   ok     the target the row expects, number for number
//   miss   Coach deferred where the row expects a target. Said less than it
//          could have. Reported, never fatal
//   wrong  anything else — a different mode, a different number, a number
//          where the row expects none. FATAL. Wrong stays 0
//
// and then generates thousands of histories per unit from a SEEDED generator —
// the real record shape, string w/r, pounds stored even on a kilo account,
// duplicated exercises merged, warm-ups, drops, failures, layoffs, pound-typed
// loads on kilo accounts — and holds every one of them to the properties the
// rules promise: deterministic, order-blind, an F never heavier, fewer reps
// never heavier, every number a logged load or within two steps (six below,
// coming back), on the grid, never from an off-grid load, never a blank ghost
// where a weight was logged, every kilo ghost printing back as the number the
// sentence says. And every sentence it produced goes through the ban.
//
// NO COPY OF ANY RULE LIVES HERE. coach-prog.js is staged and driven for real,
// against a stubbed store underneath analytics.js the way every Coach verifier
// stages it. The expected values are the brief's, worked by hand through §6;
// the properties are stated about what comes out, never re-derived from the
// algorithm. The one piece of vocabulary restated is the top load of the last
// session, which the "within two steps" property is measured from.
//
// The rows and the staging are exported, so coach-voice.mjs reads the very
// lines this battery produces rather than a second battery of its own. Run as a
// script, it runs; imported, it only hands them over.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

const U = await import(pathToFileURL(join(ROOT, 'units.js')).href);
const G = await import(pathToFileURL(join(ROOT, 'coach-goal.js')).href);
const { EXERCISE_BY_ID } = await import(pathToFileURL(join(ROOT, 'exercises.js')).href);

/* ================= STAGING =================
   coach-prog.js against a stubbed store, through analytics.js's session math,
   exactly as coach-build.js is staged everywhere else. */
export async function stageProg(rev) {
  const dir = mkdtempSync(join(tmpdir(), 'rack-coach-prog-'));
  // `rev` stages a past commit's coach-prog.js instead (section D: v49 must
  // leave v48's targets byte for byte where they were). Needs a full clone.
  const prog = rev ? execFileSync('git', ['show', rev + ':coach-prog.js'], { cwd: ROOT, encoding: 'utf8' })
                   : src('coach-prog.js');
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
  writeFileSync(join(dir, 'coach-prog.mjs'), prog
    .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href))
    .replace("from './units.js'", 'from ' + real('units.js'))
    .replace("from './exercises.js'", 'from ' + real('exercises.js'))
    .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
    .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js')));
  return import(pathToFileURL(join(dir, 'coach-prog.mjs')).href);
}

/* ================= THE FIXTURES =================
   A fixed epoch, every session an offset from it in days, so this file answers
   the same at 2 AM in Auckland as at noon in New York. */
const DAY = 864e5;
export const NOW = 1789307130123;
const key = ms => {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};
const localAt = (ago, hour) => { const d = new Date(NOW - ago * DAY); d.setHours(hour, 0, 0, 0); return d.getTime(); };

// One set as a finished session stores it: strings, ticked.
const set = (w, r, type) => ({ w: String(w), r: String(r), type: type || 'N', done: true });
const xN = (n, w, r, type) => Array.from({ length: n }, () => set(w, r, type));
const rs = (w, reps, type) => reps.map(r => set(w, r, type));
// A kilo load as a kilo account stores it: pounds, converted once.
const kg = v => String(U.wIn(v, 'kg'));

const CUSTOM_LEGS = { exId: 'custom-safety-bar-squat-x1y2z', name: 'Safety Bar Squat', group: 'legs', equipment: 'barbell' };
const metaOf = ex => (typeof ex === 'object' ? ex
  : { exId: ex, name: EXERCISE_BY_ID[ex].name, group: EXERCISE_BY_ID[ex].group, equipment: EXERCISE_BY_ID[ex].equipment });

let sid = 0;
function sessionOf(meta, startedAt, sets, extra) {
  return { id: 's' + (++sid), name: 'Evening session', startedAt, _date: key(startedAt),
           exercises: [{ exId: meta.exId, name: meta.name, group: meta.group, equipment: meta.equipment, sets }]
             .concat(extra || []) };
}
// [ago, sets] pairs, or bare sets spaced four days apart ending three days ago.
function logOf(meta, entries) {
  const n = entries.length;
  return entries.map((e, i) => Array.isArray(e) && typeof e[0] === 'number'
    ? sessionOf(meta, NOW - e[0] * DAY, e[1])
    : sessionOf(meta, NOW - (3 + 4 * (n - 1 - i)) * DAY, e));
}

const A1_LOG = [
  [23, xN(3, 175, 12)], [19, xN(3, 180, 8)], [15, rs(180, [10, 10, 9])],
  [11, xN(3, 180, 12)], [7, rs(185, [10, 9, 8])], [3, xN(3, 185, 12)]
];
const A1_WITH = last => A1_LOG.slice(0, -1).concat([[3, last]]);
const A19 = [285, 295, 305, 315].map(w => xN(3, w, 3));
const A24_CLIMB = [xN(3, 60, 12), xN(3, 55, 8), xN(3, 55, 12), xN(3, 50, 8), rs(50, [10, 10, 9])];
const A33_LOG = [[60, xN(3, 195, 8)], [19, xN(3, kg(85), 12)], [15, xN(3, kg(87.5), 8)], [11, xN(3, kg(87.5), 12)],
                 [7, rs(kg(90), [10, 8, 7])], [3, rs(kg(90), [9, 7, 6])]];
const A34_REPS = [[9, 8, 8], [10, 9, 8], [8, 8, 8], [9, 9, 8], [10, 8, 8], [9, 8, 8], [8, 8, 8], [10, 9, 8],
                  [9, 9, 8], [10, 9, 9], [10, 10, 10]];
const A34_LOG = A34_REPS.map((r, i) => [3 + 7 * (A34_REPS.length - 1 - i), rs(185, r)]);
const A35_LOG = [225, 235, 245, 255, 265, 275, 285, 295, 305].map(w => xN(3, w, 5)).concat([xN(3, 315, 7)]);
const A36_LOG = [[80, xN(3, 205, 12)], [76, xN(3, 215, 8)], [72, xN(3, 215, 12)], [68, xN(3, 225, 8)],
                 [64, xN(3, 225, 12)], [8, xN(3, 185, 10)], [4, xN(3, 185, 12)]];

/* THE TABLE. `want` is the brief's row: the mode (and code), the target in
   the display unit (null: no number), and the reps every set that is not a
   warm-up carries. `group` is days since the lift's primary group, when the
   row says so; otherwise it is the lift's own days since. Rows B1–B4 are not
   the brief's: they exist so the sweep reaches the unassisted target, a
   bodyweight re-entry, an off-grid reps target and a stepped kilo re-entry. */
export function cases() {
  sid = 0;
  const K = (id, ex, log, want, o = {}) => ({ id, meta: metaOf(ex), u: o.u || 'lb', sessions: logOf(metaOf(ex), log),
    ctx: { aim: o.aim || null, exp: o.exp || null, energy: o.energy || null, rateWk: o.rateWk ?? null },
    group: o.group, want });
  const bench = 'barbell-bench-press', squat = 'back-squat-high-bar', low = 'back-squat-low-bar';
  const list = [
    K('A1', bench, A1_LOG, { mode: 'add', load: 190, reps: [8, 8, 8], range: [8, 12, 'yours'], step: [5, 2, 'yours'], stage: 'learning' }),
    K('A2', bench, A1_WITH(rs(185, [12, 11, 10])), { mode: 'reps', load: 185, reps: [12, 12, 11] }),
    K('A3', bench, A1_WITH([set(185, 12), set(185, 12), set(185, 12, 'F')]), { mode: 'add', load: 190, reps: [8, 8, 8] }),
    K('A4', bench, [xN(3, 170, 12), xN(3, 175, 8), xN(3, 175, 12), xN(3, 180, 8), xN(3, 180, 12), rs(185, [10, 8, 6])],
      { mode: 'hold', code: 'miss', load: 185, reps: [8, 8, 8] }),
    K('A5', bench, [xN(3, 165, 12), xN(3, 170, 8), xN(3, 170, 12), xN(3, 175, 8), xN(3, 175, 12), rs(185, [10, 8, 7]), rs(185, [9, 7, 6])],
      { mode: 'reduce', load: 175, reps: [8, 8, 8], step: [5, 2, 'yours'] }),
    K('A6', bench, [xN(3, 160, 12), xN(3, 165, 8), xN(3, 165, 12), xN(3, 170, 8), xN(3, 170, 12), rs(185, [10, 8, 7]), rs(185, [9, 7, 6])],
      { mode: 'reduce', load: 180, reps: [8, 8, 8] }),
    K('A7', 'seated-cable-row', [xN(3, 100, 12), xN(3, 115, 8), xN(3, 115, 12), xN(3, 130, 8), xN(3, 130, 12), rs(130, [10, 8, 7]), rs(130, [9, 7, 6])],
      { mode: 'reduce', load: 115, step: [15, 2, 'yours'] }),
    K('A7b', 'seated-cable-row', [xN(3, 100, 12), xN(3, 110, 8), xN(3, 110, 12), xN(3, 125, 8), xN(3, 125, 12), rs(125, [10, 8, 7]), rs(125, [9, 7, 6])],
      { mode: 'reduce', load: 110, step: null }),
    K('A8', low, [270, 280, 295, 315].map(w => xN(3, w, 5)),
      { mode: 'add', load: 325, reps: [5, 5, 5], range: [5, 5, 'yours'], step: [10, 0, 'default'] }),
    K('A9', low, [300, 305, 310, 315].map(w => xN(3, w, 5)), { mode: 'add', load: 320, reps: [5, 5, 5], step: [5, 3, 'yours'] }),
    K('A10', bench, [92.5, 95, 97.5, 100].map(w => xN(3, kg(w), 5)),
      { mode: 'add', load: 102.5, reps: [5, 5, 5], loadLb: 225.97, tw: '225.97' }, { u: 'kg' }),
    K('A10b', bench, [95, 97.5, 100].map(w => xN(3, kg(w), 5)), { mode: 'defer', code: 'range' }, { u: 'kg' }),
    K('A11', 'dumbbell-bench-press', [xN(3, kg(30), 8), xN(3, kg(30), 10), xN(3, kg(30), 12)],
      { mode: 'add', load: null, reps: [6, 6, 6], line: /the next setting up/ }, { u: 'kg' }),
    K('A12', bench, [], { mode: 'first' }),
    K('A13', bench, [[70, xN(3, 185, 8)], [62, xN(3, 195, 8)], [54, xN(3, 205, 8)], [46, xN(3, 215, 8)], [30, xN(3, 215, 8)]],
      { mode: 'reenter', load: 185, reps: [8, 8, 8] }, { group: 30 }),
    K('A14', bench, [[76, xN(3, 200, 8)], [72, xN(3, 205, 8)], [68, xN(3, 210, 8)], [64, xN(3, 215, 8)], [60, xN(3, 215, 8)]],
      { mode: 'reenter', load: null, reps: [8, 8, 8] }, { group: 60 }),
    K('A14b', 'dumbbell-bench-press', [[72, xN(3, 90, 8)], [68, xN(3, 95, 8)], [64, xN(3, 100, 8)], [60, xN(3, 100, 8)]],
      { mode: 'reenter', load: 80, reps: [8, 8, 8] }, { group: 60 }),
    K('A15', bench, [[26, xN(3, 180, 12)], [22, xN(3, 185, 8)], [18, rs(185, [10, 9, 9])]],
      { mode: 'reenter', load: 165 }, { group: 18 }),
    K('A15b', bench, [[28, xN(3, 180, 12)], [24, xN(3, 185, 8)], [20, rs(185, [10, 9, 9])]],
      { mode: 'hold', code: 'back', load: 185, reps: [10, 9, 9] }, { group: 3 }),
    K('A15c', bench, [[21, xN(3, 180, 12)], [17, xN(3, 185, 8)], [13, rs(185, [10, 9, 9])]],
      { mode: 'hold', code: 'back', load: 185, reps: [10, 9, 9] }, { group: 13 }),
    K('A15d', bench, [[19, xN(3, 180, 12)], [15, xN(3, 185, 8)], [11, rs(185, [10, 9, 9])]],
      { mode: 'reps', load: 185, reps: [10, 10, 10] }, { group: 11 }),
    K('A16', bench, [[set(205, 5), set(175, 8), set(175, 8)], xN(3, 185, 8)], { mode: 'defer', code: 'shape' }),
    K('A17', squat, [[set(405, 1), set(315, 5)], [set(405, 1), set(315, 5)]], { mode: 'defer', code: 'heavy' }),
    K('A18', squat, [[set(385, 3), set(315, 5)], [set(385, 3), set(315, 5)]], { mode: 'defer', code: 'heavy' }),
    K('A19', squat, A19, { mode: 'hold', code: 'confirm', load: 315, reps: [3, 3, 3] }),
    K('A20', squat, A19.concat([xN(3, 315, 3)]), { mode: 'add', load: 325, reps: [3, 3, 3] }),
    K('A21', bench, [xN(3, 185, 10), rs(185, [12, 5, 11])], { mode: 'defer', code: 'erratic' }),
    K('A22', 'pull-up', [rs(0, [7, 7, 6]), rs(0, [8, 7, 6])], { mode: 'bodyweight', load: null, reps: [8, 8, 7] }),
    K('A23', 'pull-up', [rs(0, [10, 10, 10]), rs(0, [10, 10, 9])], { mode: 'bodyweight', load: null, reps: [11, 10, 10] }),
    K('A23b', 'pull-up', [rs(0, [10, 10, 10]), rs(0, [10, 8, 7])], { mode: 'hold', code: 'miss', load: null, reps: [10, 10, 10] }),
    K('A24', 'assisted-pull-up', A24_CLIMB.concat([xN(3, 50, 12)]), { mode: 'add', load: 45, reps: [8, 8, 8] }),
    K('A25', bench, A1_LOG, { mode: 'hold', code: 'confirm', load: 185, reps: [12, 12, 12] }, { aim: 'cut' }),
    K('A26', bench, A1_LOG.map(([a, s]) => [a + 4, s]).concat([[3, xN(3, 185, 12)]]), { mode: 'add', load: 190, reps: [8, 8, 8] }, { aim: 'cut' }),
    K('A27', bench, A1_LOG, { mode: 'hold', code: 'confirm', load: 185 }, { energy: 'deep', rateWk: -2.2 }),
    K('A28', 'dumbbell-lateral-raise', [rs(15, [12, 12, 11]), rs(15, [13, 13, 12]), rs(15, [15, 15, 14]), xN(3, 15, 15)],
      { mode: 'reps', load: 15, reps: [16, 16, 15] }),
    K('A29', bench, [[set(95, 5)].concat(xN(3, 185, 8)), [set(95, 5)].concat(rs(185, [10, 9, 9]))],
      { mode: 'reps', load: 185, reps: [5, 10, 10, 10], tws: ['95', '185', '185', '185'] }),
    K('A32', CUSTOM_LEGS, [xN(3, 200, 5), xN(3, 200, 5), xN(3, 200, 5), xN(3, 200, 5)], { mode: 'add', load: 210, reps: [5, 5, 5] }),
    K('A33', bench, A33_LOG, { mode: 'reduce', load: 87.5, reps: [8, 8, 8] }, { u: 'kg' }),
    K('A34', bench, A34_LOG, { mode: 'hold', code: 'confirm', load: 185 }),
    K('A34b', bench, A34_LOG.slice(-6), { mode: 'add', load: 190, reps: [6, 6, 6] }),
    K('A35', squat, A35_LOG, { mode: 'add', load: 335, reps: [5, 5, 5] }, { aim: 'strength', exp: 'years' }),
    K('A36', bench, A36_LOG, { mode: 'add', load: 195, reps: [8, 8, 8] }, { group: 4 }),
    K('A37', squat, A35_LOG, { mode: 'add', load: 325, reps: [5, 5, 5] }, { aim: 'strength', exp: 'new' }),
    K('A38', bench, [xN(3, 185, 10), xN(3, 185, 10), xN(3, 225, 5)], { mode: 'defer', code: 'shape' }),
    K('A39', bench, [xN(3, 225, 5), xN(3, 225, 5)], { mode: 'defer', code: 'range' }),
    K('A39b', bench, [xN(3, 225, 5), xN(3, 225, 5)], { mode: 'reps', load: 225, reps: [6, 6, 5] }, { aim: 'strength' }),
    K('A40', squat, [[40, [set(405, 1), set(315, 5)]], [18, [set(405, 1), set(315, 5)]]], { mode: 'defer', code: 'heavy' }, { group: 18 }),
    K('A41', bench, [xN(3, kg(90), 5), xN(3, kg(92.5), 5), xN(3, kg(95), 5), xN(3, '225', 5)],
      { mode: 'add', load: null, reps: [5, 5, 5], tw: '225', line: /the next setting up/ }, { u: 'kg' }),
    K('A42', 'assisted-pull-up', A24_CLIMB.concat([rs(50, [7, 6, 6]), rs(50, [6, 6, 5])]),
      { mode: 'reduce', load: null, reps: [8, 8, 8], line: /a little more assistance than last time/ }),
    K('A44', bench, [xN(3, 225, 5), xN(3, 225, 5)], { mode: 'add', load: 230, reps: [3, 3, 3] }, { aim: 'powerlifting' }),
    K('A45', squat, A35_LOG, { mode: 'add', load: 335, reps: [5, 5, 5] }, { aim: 'powerlifting' }),
    // Not the brief's rows — see above.
    K('B1', 'assisted-pull-up', [[27, xN(3, 60, 8)], [23, xN(3, 55, 8)], [19, xN(3, 55, 12)], [15, xN(3, 50, 8)],
                                 [11, xN(3, 50, 12)], [7, xN(3, 5, 8)], [3, xN(3, 5, 12)]],
      { mode: 'add', load: null, reps: [6, 6, 6], line: /unassisted/ }),
    K('B2', 'pull-up', [[34, rs(0, [9, 9, 8])], [30, rs(0, [9, 9, 8])]], { mode: 'bodyweight', code: 'back', load: null, reps: [8, 8, 7] }, { group: 30 }),
    K('B3', bench, [xN(3, '225', 8), rs('225', [10, 9, 9])], { mode: 'reps', load: null, reps: [10, 10, 10], line: /same weight as last time/ }, { u: 'kg' }),
    K('B4', bench, [[32, xN(3, kg(90), 8)], [28, xN(3, kg(92.5), 8)], [24, xN(3, kg(95), 8)], [20, xN(3, kg(97.5), 8)]],
      { mode: 'reenter', load: 87.5, reps: [8, 8, 8] }, { u: 'kg', group: 20 })
  ];
  /* A30 and A31 are about the exposures themselves: one session with the
     same lift twice, and two sessions on one day. */
  const b = metaOf(bench);
  const row = { exId: 'barbell-row', name: 'Barbell Row', group: 'back', equipment: 'barbell', sets: xN(3, 155, 8) };
  const a30 = { id: 'x30', startedAt: NOW - 3 * DAY, _date: key(NOW - 3 * DAY), exercises: [
    { exId: b.exId, name: b.name, group: b.group, equipment: b.equipment, sets: xN(2, 185, 10) }, row,
    { exId: b.exId, name: b.name, group: b.group, equipment: b.equipment, sets: xN(1, 185, 9) }] };
  list.push({ id: 'A30', meta: b, u: 'lb', sessions: [a30], ctx: {}, want: { exposures: 1, sets: 3 } });
  list.push({ id: 'A31', meta: b, u: 'lb', ctx: {}, sessions: [
    sessionOf(b, NOW - 8 * DAY, xN(3, 185, 8)),
    sessionOf(b, localAt(1, 18), xN(3, 185, 10)),
    sessionOf(b, localAt(1, 8), xN(3, 185, 9))
  ], want: { mode: 'add', load: 190, reps: [6, 6, 6] } });
  return list;
}

// One row, driven: the exposures, then the prescription.
export function run(P, c) {
  const exposures = P.exposuresFor(c.sessions, c.meta.exId);
  const last = exposures[exposures.length - 1];
  const own = last ? Math.round((new Date(NOW).setHours(12, 0, 0, 0) - new Date(last.startedAt).setHours(12, 0, 0, 0)) / DAY) : null;
  const ex = { ...c.meta, exposures, groupDaysSince: c.group != null ? c.group : own };
  return { exposures, t: P.prescribe(ex, { now: NOW, u: c.u, ...c.ctx }) };
}

/* ---------- the ban, for every sentence a target says ----------
   The shipped list is READ out of coach-voice.mjs rather than typed again
   here, so the two cannot drift; §9's additions and the two patterns the brief
   names ride on top. */
function shippedBan() {
  const V = src('tools-check/coach-voice.mjs');
  const m = /const BANNED = \[([\s\S]*?)\];/.exec(V);
  if (!m) throw new Error('coach-prog: the BANNED list moved out of coach-voice.mjs — this check is stale');
  return new Function('return [' + m[1] + '];')();
}
export function banOf() {
  return shippedBan().concat([
    /\btry\b/i, /\bshould\b/i, /\bpush\b/i, /\bbeat\b/i, /\bgo for\b/i, /\baim for\b/i, /\beasy\b/i, /\bmust\b/i,
    /\b(1\s*rm|one[- ]rep max) (test|attempt)|\bmax(ing)? out\b|\bgo for a (single|max)\b|\btest your max\b/i,
    /\b(because (you|your)|caused|due to (your|the)|that'?s why)\b/i
  ]);
}
export function offences(text, u) {
  const out = banOf().filter(re => re.test(text)).map(re => (text.match(re) || [''])[0]);
  if (u === 'kg' && /\d ?lb\b/.test(text)) out.push('lb on a kilo account');
  if (/'/.test(text)) out.push('a straight apostrophe');
  return out;
}

/* ================= RUN AS A SCRIPT ================= */
const MAIN = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (MAIN) {
  const P = await stageProg();

  let pass = 0, fail = 0;
  const results = [];
  const check = (label, ok, detail) => {
    if (ok) { pass++; results.push('  ✓ ' + label); }
    else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
  };
  const section = t => results.push('\n' + t);
  const list = xs => xs.slice(0, 6).join('\n         ') + (xs.length > 6 ? '\n         … (' + xs.length + ')' : '');
  const r2 = x => Math.round(x * 100) / 100;
  const said = [];   // every line and why, with its unit, for the ban

  /* ================= A. THE TABLE ================= */
  section('A. the brief’s table, row by row — ok / miss / wrong');
  const tally = { ok: 0, miss: 0, wrong: 0 };
  const verdicts = [];
  for (const c of cases()) {
    const { exposures, t } = run(P, c);
    const w = c.want;
    const bad = [];
    if (w.exposures != null) {
      if (exposures.length !== w.exposures) bad.push(exposures.length + ' exposures');
      if (exposures[0] && exposures[0].sets.length !== w.sets) bad.push(exposures[0].sets.length + ' sets');
    } else if (!t) {
      bad.push('no target at all');
    } else {
      said.push({ u: c.u, id: c.id, text: t.line }, ...t.why.map(x => ({ u: c.u, id: c.id, text: x })));
      if (t.mode !== w.mode) bad.push('mode ' + t.mode + (t.code ? '(' + t.code + ')' : '') + ', want ' + w.mode);
      if (w.code !== undefined && t.code !== w.code) bad.push('code ' + t.code + ', want ' + w.code);
      if ('load' in w) {
        const got = t.loadLb == null ? null : r2(U.wOut(t.loadLb, c.u));
        if (!(got === w.load || (got != null && w.load != null && Math.abs(got - w.load) < 0.01))) bad.push('load ' + got + ', want ' + w.load);
      }
      if (w.reps) {
        const got = t.sets.filter(s => s.type !== 'W').map(s => Number(s.tr));
        if (JSON.stringify(got) !== JSON.stringify(w.reps)) bad.push('reps ' + got.join(',') + ', want ' + w.reps.join(','));
      }
      if (w.loadLb != null && t.loadLb !== w.loadLb) bad.push('loadLb ' + t.loadLb + ', want ' + w.loadLb);
      if (w.tw != null && !t.sets.filter(s => s.type !== 'W').every(s => s.tw === w.tw)) bad.push('tw ' + t.sets.map(s => s.tw).join(',') + ', want ' + w.tw);
      if (w.tws && JSON.stringify(t.sets.map(s => s.tw)) !== JSON.stringify(w.tws)) bad.push('tw ' + t.sets.map(s => s.tw).join(','));
      if (w.line && !w.line.test(t.line)) bad.push('line “' + t.line + '”');
      if (w.range && JSON.stringify([t.range.lo, t.range.hi, t.range.source]) !== JSON.stringify(w.range)) bad.push('range ' + JSON.stringify(t.range));
      if (w.step !== undefined) {
        const got = t.step ? [t.step.value, t.step.n, t.step.source] : null;
        if (JSON.stringify(got) !== JSON.stringify(w.step)) bad.push('step ' + JSON.stringify(got));
      }
      if (w.stage && t.stage !== w.stage) bad.push('stage ' + t.stage);
    }
    const kind = !bad.length ? 'ok'
      : t && t.mode === 'defer' && w.mode && w.mode !== 'defer' && w.mode !== 'first' ? 'miss' : 'wrong';
    tally[kind]++;
    verdicts.push({ id: c.id, kind, bad, t });
  }
  verdicts.forEach(v => check(v.id + (v.t ? ': ' + v.t.line : ''), v.kind !== 'wrong',
    v.kind + ' — ' + v.bad.join('; ')));
  results.push('\n  ok: ' + tally.ok + '   miss: ' + tally.miss + '   wrong: ' + tally.wrong);
  check('wrong: 0 — no row names a number, a mode or a rep count the brief does not', tally.wrong === 0);

  /* ================= B. THE PROPERTIES ================= */
  section('B. seeded histories, both units — the properties the rules promise');

  // mulberry32: a seeded generator, so a failure is a history anyone can re-run.
  const rng = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const POOL = [
    { id: 'barbell-bench-press', lb: [135, 5], kg: [60, 2.5] },
    { id: 'back-squat-high-bar', lb: [225, 10], kg: [100, 5] },
    { id: 'romanian-deadlift',   lb: [185, 10], kg: [80, 5] },
    { id: 'dumbbell-bench-press', lb: [60, 5], kg: [26, 2] },
    { id: 'dumbbell-lateral-raise', lb: [20, 5], kg: [8, 2] },
    { id: 'seated-cable-row',    lb: [120, 15], kg: [55, 5] },
    { id: 'leg-extension',       lb: [100, 10], kg: [45, 5] },
    { id: 'pull-up',             lb: [0, 0], kg: [0, 0] },
    { id: 'weighted-pull-up',    lb: [25, 5], kg: [10, 2.5] },
    { id: 'assisted-pull-up',    lb: [60, -5], kg: [27.5, -2.5] },
    { meta: CUSTOM_LEGS,         lb: [200, 10], kg: [90, 5] },
    { meta: { exId: 'custom-cable-press-q1w2e', name: 'Cable Press', group: 'chest', equipment: 'cable' }, lb: [70, 7.5], kg: [30, 2.5] },
    { meta: { exId: 'custom-band-assist-dip-z9y8x', name: 'Band Assisted Dip', group: 'arms', equipment: 'band' }, lb: [40, -5], kg: [18, -2] },
    { id: 'treadmill-run',       lb: [0, 0], kg: [0, 0] }
  ];
  const AIMS = [null].concat(G.AIMS), EXPS = [null].concat(G.EXPERIENCE);
  const ENERGIES = [null, 'deep', 'deficit', 'hold', 'surplus'];

  function history(seed, u) {
    const r = rng(seed);
    const pick = xs => xs[Math.floor(r() * xs.length)];
    const spec = pick(POOL);
    const meta = spec.meta || metaOf(spec.id);
    const [base, jump] = spec[u];
    const store = L => {
      if (L <= 0) return '0';
      if (u === 'kg' && r() < 0.12) return String(Math.round(L * U.LB_PER_KG / 5) * 5);   // typed in pounds
      return u === 'kg' ? String(U.wIn(L, 'kg')) : String(L);
    };
    // Now and then a lift he has never done: the log holds another lift only.
    const never = r() < 0.03;
    const n = 1 + Math.floor(r() * 12);
    let L = Math.max(0, base + jump * Math.floor(r() * 4));
    let ago = Math.floor(r() * 6) + (r() < 0.15 ? Math.floor(r() * 45) : 0);
    const agos = [];
    for (let i = 0; i < n; i++) { agos.unshift(ago); ago += 2 + Math.floor(r() * 7) + (r() < 0.08 ? 12 + Math.floor(r() * 35) : 0); }
    const sessions = [];
    let repBase = 3 + Math.floor(r() * 12);
    agos.forEach((a, i) => {
      if (i) {
        const x = r();
        if (x < 0.35) L += jump; else if (x < 0.43) L -= jump; else if (x < 0.47) L += 3 * jump;
        L = Math.max(0, Math.round(L * 2) / 2);
        repBase = Math.max(1, Math.min(20, repBase + Math.floor(r() * 5) - 2));
      }
      const sets = [];
      if (L > 0 && r() < 0.3) sets.push(set(store(Math.max(0, L - 2 * Math.abs(jump))), 8 + Math.floor(r() * 5), 'W'));
      const shape = r();
      if (shape < 0.75) {
        const k = 2 + Math.floor(r() * 4);
        for (let j = 0; j < k; j++) sets.push(set(store(L), Math.max(1, repBase - Math.floor(r() * 3) + (r() < 0.1 ? 3 : 0))));
      } else if (shape < 0.9) {
        sets.push(set(store(L), Math.max(1, Math.floor(r() * 8))));
        const b = 1 + Math.floor(r() * 3);
        for (let j = 0; j < b; j++) sets.push(set(store(Math.max(0, L - 2 * Math.abs(jump))), repBase));
      } else {
        sets.push(set(store(L), repBase), set(store(L), Math.max(1, repBase - 6 - Math.floor(r() * 3))));
      }
      if (r() < 0.15) sets[sets.length - 1].type = 'F';
      if (r() < 0.07) sets.push(set(store(Math.max(0, L - 3 * Math.abs(jump))), repBase + 2, 'D'));
      if (r() < 0.02) sets[sets.length - 1].w = '';
      const s = sessionOf(never ? metaOf('barbell-row') : meta, NOW - a * DAY, sets);
      // Now and then, the same lift twice in one session: the merge is the house invariant.
      if (r() < 0.05) s.exercises.push({ ...s.exercises[0], sets: [set(store(L), repBase)] });
      sessions.push(s);
    });
    const own = agos[agos.length - 1];
    const gx = r();
    const group = gx < 0.6 ? own : gx < 0.85 ? Math.floor(r() * (own + 1)) : null;
    const ctx = { now: NOW, u, aim: pick(AIMS), exp: pick(EXPS), energy: pick(ENERGIES),
                  rateWk: r() < 0.5 ? -(r() * 3) : r() * 1.5 };
    return { meta, sessions, group, ctx, u };
  }

  const assistedOf = m => m.exId === 'assisted-pull-up' || /assist/i.test(m.name);
  const lu = (w, u) => r2(U.wOut(parseFloat(w) || 0, u));
  const onGrid = L => Math.abs(L - Math.round(L * 2) / 2) < 0.01;
  const drive = (h, sessions) => {
    const exposures = P.exposuresFor(sessions, h.meta.exId);
    return { exposures, t: P.prescribe({ ...h.meta, exposures, groupDaysSince: h.group }, h.ctx) };
  };
  const heavier = (a, b, dir) => a != null && b != null && dir * (b - a) > 0.001;
  const clone = v => JSON.parse(JSON.stringify(v));

  const PER_UNIT = 2200;
  const broke = {};
  const note = (prop, h, why) => { (broke[prop] = broke[prop] || []).push(h.u + ' ' + h.meta.exId + ' seed ' + h.seed + ': ' + why); };
  let numeric = 0, modes = {};
  for (const u of ['lb', 'kg']) {
    for (let s = 1; s <= PER_UNIT; s++) {
      const h = { ...history(s * 7919 + (u === 'kg' ? 13 : 0), u), seed: s };
      const { exposures, t } = drive(h, h.sessions);
      const dir = assistedOf(h.meta) ? -1 : 1;
      modes[t ? t.mode : 'null'] = (modes[t ? t.mode : 'null'] || 0) + 1;
      if (t) said.push({ u, id: 'gen ' + s, text: t.line }, ...t.why.map(x => ({ u, id: 'gen ' + s, text: x })));

      // Same input, same output.
      if (JSON.stringify(t) !== JSON.stringify(drive(h, clone(h.sessions)).t)) note('deterministic', h, 'two answers');
      // Order-blind.
      const shuffled = h.sessions.slice().sort((a, b) => ((a.startedAt * 7) % 13) - ((b.startedAt * 7) % 13) || b.startedAt - a.startedAt);
      if (JSON.stringify(t) !== JSON.stringify(drive(h, shuffled).t)) note('shuffle', h, 'order changed the answer');
      // Cardio never; no number at or below zero.
      if (h.meta.equipment === 'cardio' && t) note('cardio', h, 'a target on cardio');
      if (!t) continue;
      if (t.loadLb != null && !(t.loadLb > 0)) note('positive', h, 'loadLb ' + t.loadLb);
      if ((t.mode === 'defer' || t.mode === 'first') && t.sets.length) note('empty', h, t.mode + ' carries sets');
      if (dir < 0 && (t.mode === 'reduce' || t.mode === 'reenter') && t.loadLb != null) note('assisted', h, t.mode + ' at ' + t.loadLb);

      const last = exposures[exposures.length - 1];
      if (!last) continue;          // never logged: a first, and nothing to vary
      // Never a blank ghost where a weight was logged.
      if (t.sets.length && last) {
        last.allSets.forEach((x, i) => {
          if (x.w !== '' && (!t.sets[i] || t.sets[i].tw === '')) note('ghost', h, 'set ' + i + ' logged ' + x.w + ', ghost blank');
        });
      }
      if (t.loadLb != null) {
        numeric++;
        const P_ = r2(U.wOut(t.loadLb, u));
        const main = last.sets.filter(x => x.type !== 'D').map(x => lu(x.w, u));
        const T = dir < 0 ? Math.min(...main) : Math.max(...main);
        const logged = new Set(exposures.flatMap(e => e.sets.map(x => lu(x.w, u))));
        const S = t.step ? t.step.value : null;
        const near = S != null && Math.abs(P_ - T) <= 2 * S + 0.01;
        const back = t.mode === 'reenter' && S != null && dir * (T - P_) > 0 && dir * (T - P_) <= 6 * S + 0.01;
        if (![...logged].some(x => Math.abs(x - P_) < 0.01) && !near && !back) note('reach', h, P_ + ' from ' + T + ' step ' + S + ' (' + t.mode + ')');
        if (!onGrid(P_)) note('grid', h, P_ + ' is off the grid');
        if (!onGrid(T)) note('offgrid', h, P_ + ' from an off-grid ' + T);
        if (u === 'kg') {
          t.sets.filter((x, i) => x.tw !== last.allSets[i].w).forEach(x => {
            const shown = U.fmtSetW(x.tw, 'kg');
            if (!onGrid(Number(shown)) || Math.abs(Number(shown) - P_) > 0.05 || !t.line.includes(shown + ' kg')) {
              note('kilo', h, x.tw + ' prints ' + shown + ' against ' + P_ + ' in “' + t.line + '”');
            }
          });
        }
      }

      // Every top set N→F, one at a time: never heavier, never a number from none.
      last.allSets.forEach((x, i) => {
        if (x.type !== 'N') return;
        const alt = clone(h.sessions);
        const e = alt.find(z => z.startedAt === last.startedAt);
        const all = e.exercises.filter(z => z.exId === h.meta.exId).flatMap(z => z.sets);
        all[i].type = 'F';
        const t2 = drive(h, alt).t;
        if (!t2) return;
        if (heavier(t.loadLb, t2.loadLb, dir)) note('failure', h, 'F on set ' + i + ': ' + t.loadLb + ' → ' + t2.loadLb);
        if (t.loadLb == null && t2.loadLb != null && t.mode !== 'defer') note('failure', h, 'F on set ' + i + ' named a number');
      });
      // Every rep count in the last session, one lower: never heavier.
      last.allSets.forEach((x, i) => {
        if (!(parseInt(x.r, 10) >= 2)) return;
        const alt = clone(h.sessions);
        const e = alt.find(z => z.startedAt === last.startedAt);
        const all = e.exercises.filter(z => z.exId === h.meta.exId).flatMap(z => z.sets);
        all[i].r = String(parseInt(all[i].r, 10) - 1);
        const t2 = drive(h, alt).t;
        if (t2 && heavier(t.loadLb, t2.loadLb, dir)) note('fewer', h, 'set ' + i + ' one rep lower: ' + t.loadLb + ' → ' + t2.loadLb);
      });
    }
  }
  /* THE CASE THAT MOVED A RULE (COACH-REPORT §40), kept by name — the history
     the sweep first found, written out. A kilo squat (a few loads typed in
     pounds, as the generator types them) whose last session was 13, 14 and
     15 reps at 130 kg. Read literally, §6.8 left that session out of the
     estimated-max series (past twelve reps), the slope read slow and Coach
     held; one rep off the first set let the session in, and the hold became a
     jump. Sets past twelve count as twelve now, so the two must agree. */
  {
    const sq = metaOf('back-squat-high-bar');
    const K = v => (typeof v === 'string' ? v : String(U.wIn(v, 'kg')));
    const S_ = (ago, rows) => sessionOf(sq, NOW - ago * DAY, rows.map(([w, r, t]) => set(K(w), r, t)));
    const log = [
      S_(55, [[115, 11], ['255', 13], [115, 11], [115, 13], ['255', 12]]),
      S_(49, [[120, 14], ['265', 11], [120, 12], [120, 11]]),
      S_(45, [[120, 13], [120, 11], [120, 12]]),
      S_(41, [[115, 8, 'W'], [125, 10], [125, 13], [125, 10], [125, 11]]),
      S_(33, [[120, 10, 'W'], [130, 14], [130, 11], [130, 12], [130, 10], [130, 11, 'F']]),
      S_(29, [[125, 1], [115, 12]]),
      S_(25, [[125, 12], [125, 15], ['275', 14], [125, 13]]),
      S_(20, [[125, 2], [115, 14], [115, 14], ['255', 14]]),
      S_(15, [[125, 14], ['275', 12], [125, 13, 'F']]),
      S_(10, [[130, 15], [130, 8], [115, 17, 'D']]),
      S_(3, [[125, 14], [125, 13], [125, 15]]),
      S_(0, [[130, 13], [130, 14], [130, 15]])
    ];
    const h = { meta: sq, sessions: log, group: 0, u: 'kg',
                ctx: { now: NOW, u: 'kg', aim: 'muscle', exp: 'some', energy: 'hold', rateWk: 1.1 } };
    const t = drive(h, log).t;
    const alt = clone(log);
    alt[alt.length - 1].exercises[0].sets[0].r = '12';
    const t2 = drive(h, alt).t;
    check('the case that moved a rule: 13, 14, 15 and then 12, 14, 15 at 130 kg name the same target',
          !!t && !!t2 && t.mode === t2.mode && t.loadLb === t2.loadLb && t.code === t2.code,
          (t && t.line) + ' / ' + (t2 && t2.line));
  }
  const PROPS = [
    ['deterministic', 'the same history twice is the same target'],
    ['shuffle', 'shuffling the sessions changes nothing'],
    ['failure', 'turning any set of the last session N → F never makes the target heavier (less assisted), never adds a number'],
    ['fewer', 'one rep fewer on any set of the last session never makes the target heavier'],
    ['reach', 'every number is a logged load, within two steps of the last top load, or (coming back) up to six below it'],
    ['grid', 'and on the grid in the display unit'],
    ['offgrid', 'no number is derived from an off-grid last top load'],
    ['assisted', 'on an assisted lift, no reduction or re-entry names a number'],
    ['ghost', 'no ghost is blank where the logged set had a weight'],
    ['kilo', 'every new kilo ghost prints back, through fmtSetW, as the number the sentence says'],
    ['positive', 'no target at or below zero'],
    ['cardio', 'no target on cardio'],
    ['empty', 'a defer or a first carries no sets — the view falls back to the placeholders']
  ];
  PROPS.forEach(([k, label]) => check(label, !broke[k], list(broke[k] || [])));
  check('the sweep is wide enough to mean something: ' + (PER_UNIT * 2) + ' histories, ' + numeric + ' numeric targets, every mode',
        numeric > 800 && ['add', 'reps', 'hold', 'reduce', 'reenter', 'first', 'bodyweight', 'defer'].every(m => modes[m] > 0) && modes.null > 0,
        JSON.stringify(modes));

  /* ================= C. THE WORDS ================= */
  section('C. the must-never scan — every line and every why, both units');
  {
    const bad = said.map(x => ({ ...x, hits: offences(x.text, x.u) })).filter(x => x.hits.length);
    check('no banned word, no max attempt, no cause, no pound on a kilo account, no straight apostrophe (' + said.length + ' strings)',
          said.length > 5000 && !bad.length, list(bad.map(x => x.id + ' [' + x.u + '] ' + x.hits.join('/') + ' in: ' + x.text)));
    check('and every sentence ends as a sentence', said.every(x => /[.)]$/.test(x.text)),
          list(said.filter(x => !/[.)]$/.test(x.text)).map(x => x.text)));
    const kgSaid = said.filter(x => x.u === 'kg').length;
    check('both units were read (' + kgSaid + ' kilo strings)', kgSaid > 2000);
  }

  /* ================= D. v49 — WHAT BASELINES() ADDED, AND WHAT IT DID NOT MOVE ================= */
  section('D. v49 — baselines() gains its stage-two fields, and v48’s targets do not move');
  {
    /* "BEFORE", READ OUT OF GIT: rack-v48's own coach-prog.js (ca5c677),
       staged against the same stub. A copy of v48's output typed in here
       would prove only that the copy agrees with itself. */
    const P48 = await stageProg('ca5c677');
    const OLD = ['exposures', 'range', 'step', 'status', 'slope', 'sigma'];
    const pick = (b, keys) => (b ? Object.fromEntries(keys.map(k => [k, b[k]])) : null);
    const rowsMoved = [], basesMoved = [], inconsistent = [];
    let rows = 0, swept = 0;

    // The two promises, over one lift: the target and the old fields are v48's
    // byte for byte, and the new fields agree with the status beside them.
    const hold = (label, meta, sessions, group, ctx) => {
      const exposures = P.exposuresFor(sessions, meta.exId);
      const ex = { ...meta, exposures, groupDaysSince: group };
      const now = JSON.stringify(P.prescribe(ex, ctx)), then = JSON.stringify(P48.prescribe(ex, ctx));
      if (now !== then) rowsMoved.push(label);
      const b = P.baselines(ex, ctx), b48 = P48.baselines(ex, ctx);
      if (JSON.stringify(pick(b, OLD)) !== JSON.stringify(pick(b48, OLD))) basesMoved.push(label);
      if (!b) return;
      const bad = [];
      const S = b.series;
      const dayOf = ms => Math.round((new Date(ctx.now).setHours(12, 0, 0, 0) - new Date(ms).setHours(12, 0, 0, 0)) / DAY);
      if (!S.every((p, i) => i === 0 || p.startedAt >= S[i - 1].startedAt)) bad.push('series out of order');
      if (!S.every(p => dayOf(p.startedAt) < 84)) bad.push('a point older than twelve weeks');
      if (!S.every((p, i) => i === 0 || dayOf(S[i - 1].startedAt) - dayOf(p.startedAt) <= 21)) bad.push('a layoff inside the series');
      const lastIdx = b.lastBestAt == null ? -1 : S.map(p => p.startedAt).lastIndexOf(b.lastBestAt);
      if (b.lastBestAt != null && lastIdx < 1) bad.push('lastBestAt is not a later point of the series');
      const win = S.slice(-8);
      const gateOk = win.length >= 4 && dayOf(win[0].startedAt) - dayOf(win[win.length - 1].startedAt) >= 21;
      if (lastIdx >= S.length - 3 && lastIdx >= 1 && gateOk && b.status !== 'progressing') bad.push('a best in the last three, and status ' + b.status);
      if ((b.status === 'stalled' || b.status === 'declining') && lastIdx >= S.length - 3 && lastIdx >= 1) bad.push(b.status + ' with a best in the last three');
      if (b.status === 'stalled' && lastIdx >= S.length - 4 && lastIdx >= Math.max(1, S.length - win.length)) bad.push('stalled with a best in the last four');
      if (!(b.freq.recent * 4 <= b.freq.normal * 12 + 1e-9 && b.freq.normal * 12 <= b.exposures + 1e-9)) bad.push('freq ' + JSON.stringify(b.freq));
      if (b.topReps.length !== Math.min(3, b.exposures)) bad.push('topReps ' + b.topReps.length);
      if (b.tops.length !== b.exposures) bad.push('tops ' + b.tops.length);
      if (b.moveLb != null && b.slope != null && b.moveLb !== 0 && Math.sign(b.moveLb) !== Math.sign(b.slope)) bad.push('moveLb and slope disagree');
      if (S.length && !(b.best >= Math.max(...S.map(p => p.y)))) bad.push('best below a point of the series');
      if (bad.length) inconsistent.push(label + ': ' + bad.join('; '));
    };

    for (const c of cases()) {
      rows++;
      const exposures = P.exposuresFor(c.sessions, c.meta.exId);
      const last = exposures[exposures.length - 1];
      const own = last ? Math.round((new Date(NOW).setHours(12, 0, 0, 0) - new Date(last.startedAt).setHours(12, 0, 0, 0)) / DAY) : null;
      hold(c.id, c.meta, c.sessions, c.group != null ? c.group : own, { now: NOW, u: c.u, ...c.ctx });
    }
    for (const u of ['lb', 'kg']) {
      for (let s = 1; s <= PER_UNIT; s++) {
        const h = history(s * 7919 + (u === 'kg' ? 13 : 0), u);
        swept++;
        hold(u + ' seed ' + s, h.meta, h.sessions, h.group, h.ctx);
      }
    }
    check('prescribe() is byte-identical to rack-v48’s on every battery row (' + rows + ') and every swept history (' + swept + ')',
          rows >= 57 && !rowsMoved.length, list(rowsMoved));
    check('and every field baselines() already returned is too', !basesMoved.length, list(basesMoved));
    check('the new fields agree with the status beside them — a best in the last three is progressing, ' +
          'a stall has none in its last four, the series is the window after the last layoff, oldest first',
          !inconsistent.length, list(inconsistent));
  }

  console.log('\nCoach names a weight only when it is one he can load\n');
  console.log(results.join('\n'));
  console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
}
