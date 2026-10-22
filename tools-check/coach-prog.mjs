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
// v70: the ramp model as staged beside today's coach-prog.js, so section D can
// tell a history the ramp model reads differently from one it does not.
let rampUrl = null;
export const stagedRamp = () => import(rampUrl);
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
  // v70: coach-ramp.js, the ramp model coach-prog.js imports — staged under
  // the name it imports it by (the temp dir is made a module package so the
  // relative import resolves); an older revision without the import is unmoved.
  writeFileSync(join(dir, 'package.json'), '{ "type": "module" }');
  writeFileSync(join(dir, 'coach-ramp.js'), src('coach-ramp.js').replace("from './analytics.js'", "from './analytics.mjs'"));
  // v72: coach-ask.js, the questions and the facts — imports units.js and coach-ramp.js (the staged copy beside it).
  writeFileSync(join(dir, 'coach-ask.js'), src('coach-ask.js').replace("from './units.js'", 'from ' + real('units.js')));
  if (!rev) rampUrl = pathToFileURL(join(dir, 'coach-ramp.js')).href;
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
    // v69: the three sessions before the judged one are all at 185 for 8–10,
    // so the held-load rule (spec §6.5) reads 8–10 and the add starts at 8 —
    // until v69 this row read the default band and started at 6.
    K('A34b', bench, A34_LOG.slice(-6), { mode: 'add', load: 190, reps: [8, 8, 8], range: [8, 10, 'yours'] }),
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
  /* v70: last time's rows against a target's rows, in order. A W row the
     target has no row for (the next target row is not a W at its weight) is
     one setsFor dropped; everything else pairs up. */
  const pairRows = (all, t) => {
    const pairs = [], dropped = [];
    let j = 0;
    all.forEach(x => {
      const row = t.sets[j];
      if (x.type === 'W' && !(row && row.type === 'W' && row.tw === x.w)) { dropped.push(x); return; }
      pairs.push([x, row]); j++;
    });
    return { pairs, dropped };
  };

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
      // Never a blank ghost where a weight was logged. v70: a target's rows are
      // last time's rows less any W row heavier than a reduced top (dropped,
      // never clamped — coach-prog.js setsFor), so the two lists are walked
      // together: a W row with no row of its own in the target is a dropped
      // one, and it must be heavier than the target's load on a reduce or a
      // re-entry; every other row pairs up in order.
      const { pairs, dropped } = pairRows(last.allSets, t);
      if (t.sets.length && last) {
        pairs.forEach(([x, row], i) => {
          if (x.w !== '' && (!row || row.tw === '')) note('ghost', h, 'set ' + i + ' logged ' + x.w + ', ghost blank');
        });
        dropped.forEach(x => {
          if (!(['reduce', 'reenter'].includes(t.mode) && t.loadLb != null && dir * (lu(x.w, u) - lu(t.loadLb, u)) > 0.01)) {
            note('ghost', h, 'W row ' + x.w + ' dropped from a ' + t.mode + ' at ' + t.loadLb);
          }
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
          pairs.filter(([x, row]) => row && row.tw !== x.w).map(([, row]) => row).forEach(x => {
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

  /* v71: Coach speaks in the first person (SHIP-V71-PROMPT §3), and every
     `why` an older prescribe() wrote in the third person is read through this
     one map before the byte-for-byte comparisons below (D against v48 and v51,
     the rating section against v53) — so the promise is still "byte for
     byte", up to exactly these documented sentence pairs, and a number, a
     mode or a set that moved would still fail. The pairs are the ship's own
     rewrite table for coach-prog.js; anything the map does not cover stays a
     difference. */
  const VOICE = [
    [/Coach is learning this lift \((\d+ sessions?) so far\)\./g, 'I’m learning this lift: $1 so far.'],
    [/for Coach to call/g, 'for me to call'], [/and Coach won’t call/g, 'and I won’t call'],
    [/Coach sets targets from there/g, 'I’ll set targets from there'], [/Coach will learn yours/g, 'I’ll learn yours'],
    [/so Coach won’t work/g, 'so I won’t work'], [/Coach doesn’t have a lighter/g, 'I don’t have a lighter'],
    [/Coach needs a few more sessions of this lift to know your rep range\./g, 'A few more sessions of this lift and I’ll know your rep range.'],
    [/Coach wants to see it twice/g, 'I want to see it twice'],
    [/Coach doesn’t know (.*?) yet, so it won’t guess/g, 'I don’t know $1 yet, so I won’t guess']
  ];
  const voiced = t => (t == null ? t : JSON.parse(JSON.stringify(t), (k, v) =>
    (typeof v === 'string' ? VOICE.reduce((s, [a, b]) => s.replace(a, b), v) : v)));

  /* ================= D. v49 — WHAT BASELINES() ADDED, AND WHAT IT DID NOT MOVE ================= */
  section('D. v49 — baselines() gains its stage-two fields, and v48’s targets do not move');
  {
    /* "BEFORE", READ OUT OF GIT: rack-v48's own coach-prog.js (ca5c677),
       staged against the same stub. A copy of v48's output typed in here
       would prove only that the copy agrees with itself. */
    const P48 = await stageProg('ca5c677');
    // v52 (SHIP-V52-PROMPT §1): and rack-v51's own coach-prog.js — with no
    // mark, prescribe() AND targetFor() are its prescribe(), byte for byte.
    const P51 = await stageProg('99b49ea');
    const rows51 = [];
    const OLD = ['exposures', 'range', 'step', 'status', 'slope', 'sigma'];
    const pick = (b, keys) => (b ? Object.fromEntries(keys.map(k => [k, b[k]])) : null);
    const rowsMoved = [], basesMoved = [], inconsistent = [], unfenced = [];
    let rows = 0, swept = 0, touched = 0;

    // The two promises, over one lift: the target and the old fields are v48's
    // byte for byte, and the new fields agree with the status beside them.
    // v69 moved the engine on purpose — a heavy day teaches no range and no
    // step and gets no target (doubles too), a big barbell jump needs three
    // sightings, and three sessions at one load teach the held-load band — so
    // the promise is now: byte for byte wherever none of those applies, and
    // where the target moved, one of them must be the reason (the range or
    // the step baseline moved, a held range, or a heavy defer). v69Of() is
    // the fingerprint; `touched` counts the histories it fires on.
    const v69Of = (t, b, b48) => {
      const r = JSON.stringify(b && b.range) !== JSON.stringify(b48 && b48.range);
      const s = JSON.stringify(b && b.step) !== JSON.stringify(b48 && b48.step);
      return r || s || !!(t && t.range && t.range.held) || !!(t && t.mode === 'defer' && t.code === 'heavy');
    };
    // v70 moved it again, on purpose: a probable warm-up in any exposure (the
    // ramp model's own read, coach-ramp.js — never restated here) takes that
    // set out of the working sets every rule reads; and a W row heavier than
    // a reduced top is dropped from the target's rows rather than clamped.
    const RAMP = await stagedRamp();
    const v70Of = (t, exposures, assisted) => {
      if (exposures.some(e => RAMP.rampOf(e.allSets, { assisted }).probable > 0)) return true;
      const last = exposures[exposures.length - 1];
      return !!(t && last && t.sets.length && t.sets.length !== last.allSets.length);
    };
    /* v74: a defer carries its quote of last time as `last` too — the same
       words as its why's last row, which is what this checks — so the old
       files are compared with it taken off, and nothing else. */
    const lastOff = [];
    const v74 = t => {
      if (!t || t.mode !== 'defer') return t;
      const { last, ...rest } = t;
      if (last !== t.why[t.why.length - 1]) lastOff.push(t.exId + ': ' + last);
      return rest;
    };
    const hold = (label, meta, sessions, group, ctx) => {
      const exposures = P.exposuresFor(sessions, meta.exId);
      const ex = { ...meta, exposures, groupDaysSince: group };
      const t = P.prescribe(ex, ctx);
      const b = P.baselines(ex, ctx), b48 = P48.baselines(ex, ctx);
      const moved = v69Of(t, b, b48) || v70Of(t, exposures, assistedOf(meta));
      if (moved) touched++;
      const now = JSON.stringify(v74(t)), then = JSON.stringify(voiced(P48.prescribe(ex, ctx)));
      // Moved with a v69 reason: expected (rowsMoved). Moved without one: a
      // change this ship did not mean to make (unfenced).
      if (now !== then) (moved ? rowsMoved : unfenced).push(label);
      const v51 = JSON.stringify(voiced(P51.prescribe(ex, ctx)));
      if (!moved && (now !== v51 || JSON.stringify(v74(P.targetFor(ex, ctx, null))) !== v51)) rows51.push(label);
      if (moved && JSON.stringify(v74(P.targetFor(ex, ctx, null))) !== now) rows51.push(label + ' (targetFor differs from prescribe)');
      if (!moved && JSON.stringify(pick(b, OLD)) !== JSON.stringify(pick(b48, OLD))) basesMoved.push(label);
      if (moved && JSON.stringify(pick(b, OLD.filter(k => k !== 'range' && k !== 'step'))) !== JSON.stringify(pick(b48, OLD.filter(k => k !== 'range' && k !== 'step')))) basesMoved.push(label + ' (a field other than range/step)');
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
    check('prescribe() is byte-identical to rack-v48’s on every battery row and swept history that no v69 or v70 rule touches (' +
          (rows + swept - touched) + ' of ' + (rows + swept) + '; ' + rows + ' rows, ' + swept + ' histories)',
          rows >= 57 && !unfenced.length && rows + swept - touched > (rows + swept) * 0.5, list(unfenced));
    check('v69/v70: every target that moved from v48’s carries a reason — a range or step baseline that moved, a held range, a heavy defer, a probable warm-up in the log, or a W row dropped from a reduced target (' +
          rowsMoved.length + ' moved, ' + touched + ' touched)', rowsMoved.length > 0 && touched >= rowsMoved.length);
    check('and every field baselines() already returned is too, range and step aside where v69 moved them', !basesMoved.length, list(basesMoved));
    check('v52: prescribe() and targetFor() with no mark are rack-v51’s prescribe(), byte for byte, on every untouched row and history — and each other’s everywhere',
          rows >= 57 && !rows51.length, list(rows51));
    check('v74: every defer’s `last` is its why’s last row, word for word — the quote of last time, never new words', !lastOff.length, list(lastOff));
    check('the new fields agree with the status beside them — a best in the last three is progressing, ' +
          'a stall has none in its last four, the series is the window after the last layoff, oldest first',
          !inconsistent.length, list(inconsistent));
  }

  /* ================= E. v52 — targetFor(): A BAD DAY STOPS COUNTING AGAINST HIM ================= */
  section('E. v52 — targetFor(): a marked session never counts against him, and never for him');
  {
    const DAYS = 864e5, NOW0 = NOW;
    const set = (w, r) => ({ w: String(w), r: String(r), type: 'N', done: true });
    // Bench at 3 × 8, five pounds a session, every four days, then the tail.
    const log = tail => {
      const out = [];
      const head = [165, 170, 175, 180, 185];
      let ago = 4 * (head.length + tail.length);
      head.concat(tail.map(t => t[0])).forEach((w, k) => {
        const reps = k < head.length ? [8, 8, 8] : tail[k - head.length][1];
        out.push({ id: 'e' + k, startedAt: NOW0 - ago * DAYS, exercises: [{ exId: 'barbell-bench-press', name: 'Barbell Bench Press',
          group: 'chest', equipment: 'barbell', sets: reps.map(r => set(w, r)) }] });
        ago -= 4;
      });
      return out;
    };
    const meta = { exId: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell' };
    const ctx = { now: NOW0, u: 'lb' };
    const markOf = (sessions, idx, word) => {
      const xs = P.exposuresFor(sessions, meta.exId);
      const marked = idx.map(i => xs[i]);
      const kept = xs.filter((x, i) => !idx.includes(i));
      const lastMarked = Math.max(...marked.map(x => x.startedAt));
      const latest = lastMarked > Math.max(...kept.map(x => x.startedAt))
        ? { word, exposures: kept.filter(x => x.startedAt < lastMarked), groupDaysSince: 4, now: lastMarked } : null;
      return { ex: { ...meta, exposures: xs, groupDaysSince: 4 }, mark: { markedAt: new Set(marked.map(x => x.startedAt)), exposures: marked, latest } };
    };
    // The latest exposure marked: the target from before it, worded from today.
    const s1 = log([[185, [8, 8, 8]], [190, [6, 5, 5]]]);
    const m1 = markOf(s1, [6], 'slept badly');
    const t1 = P.targetFor(m1.ex, ctx, m1.mark);
    const was = P.prescribe({ ...meta, exposures: m1.mark.latest.exposures, groupDaysSince: 4 }, { ...ctx, now: m1.mark.latest.now });
    check('a marked latest exposure: the target from before it — mode, load and every set’s numbers',
          t1 && was && t1.mode === was.mode && t1.loadLb === was.loadLb && JSON.stringify(t1.sets) === JSON.stringify(was.sets) &&
          t1.mode === 'add' && t1.loadLb === 190, t1 && t1.line);
    check('with its whole why replaced by the two lines, worded from today',
          JSON.stringify(t1.why) === JSON.stringify(['Your last session is marked (slept badly), so this is the target from before it.',
                                                   'That session doesn’t count against your numbers.']), t1.why.join(' / '));
    check('never lighter than he was set, and never a reduce on the bad day’s numbers — which the log without the mark reads as a miss',
          P.prescribe(m1.ex, ctx).mode === 'hold' && t1.mode !== 'reduce' && t1.loadLb >= 190);
    check('`from` is still the session before, its days counted from today', t1.from && t1.from.daysAgo === 8, JSON.stringify(t1.from));
    // A layoff-style hold replayed: "last time" in its line would name the
    // marked session, so it says "before your marked session".
    const s2 = log([[185, [8, 8, 8]]]).map((x, k, a) => (k === a.length - 1 ? { ...x, startedAt: x.startedAt } : x));
    s2.push({ id: 'late', startedAt: s2[s2.length - 1].startedAt + 14 * DAYS,
              exercises: [{ ...meta, sets: [set(185, 5), set(185, 5), set(185, 4)] }] });
    const xs2 = P.exposuresFor(s2, meta.exId);
    const late = xs2[xs2.length - 1];
    const t2 = P.targetFor({ ...meta, exposures: xs2, groupDaysSince: 1 }, { now: late.startedAt + 2 * DAYS, u: 'lb' },
      { markedAt: new Set([late.startedAt]), exposures: [late], latest: { word: 'sore', exposures: xs2.slice(0, -1), groupDaysSince: 14, now: late.startedAt } });
    check('a target line that said "last time" says "before your marked session" — last time, today, IS the marked session',
          t2 && !/last time/.test(t2.line) && (/before your marked session/.test(t2.line) || t2.mode !== 'hold'), t2 && t2.line);
    // Earlier marks: left out — never a miss, never a success, never a point.
    const s3 = log([[185, [8, 8, 8]], [185, [5, 5, 5]], [185, [8, 8, 8]]]);
    const m3 = markOf(s3, [6], 'stressed');
    const t3 = P.targetFor(m3.ex, { ...ctx, aim: 'cut' }, m3.mark);
    const t3u = P.prescribe(m3.ex, { ...ctx, aim: 'cut' });
    check('a marked miss between two sessions at the top is not a miss: on a cut, the second look is had, and weight goes on',
          t3 && t3.mode === 'add' && t3u.mode === 'hold', (t3 && t3.line) + ' / unmarked ' + t3u.line);
    // Two misses around a marked good session are not "two in a row".
    const s4 = log([[185, [6, 6, 6]], [185, [8, 8, 8]], [185, [6, 6, 6]]]);
    const m4 = markOf(s4, [6], 'sore');
    const t4 = P.targetFor(m4.ex, ctx, m4.mark);
    const kept4 = P.prescribe({ ...m4.ex, exposures: m4.ex.exposures.filter((x, i) => i !== 6) }, ctx);
    check('two misses with a marked session between them are not two in a row — the mark never produces a reduce',
          kept4.mode === 'reduce' && t4 && t4.mode !== 'reduce', kept4.line + ' → ' + (t4 && t4.line));
    // A mark on the lift's only exposure: there is no target from before it.
    const s5 = log([]).slice(-1);
    const xs5 = P.exposuresFor(s5, meta.exId);
    const t5 = P.targetFor({ ...meta, exposures: xs5, groupDaysSince: 4 }, ctx,
      { markedAt: new Set([xs5[0].startedAt]), exposures: xs5, latest: { word: 'felt unwell', exposures: [], groupDaysSince: null, now: xs5[0].startedAt } });
    check('a mark on the lift’s only session: silence, never "first time on this lift"', t5 === null, JSON.stringify(t5));
    check('and with no mark it is prescribe(), the same object shape and bytes', JSON.stringify(P.targetFor(m1.ex, ctx, null)) === JSON.stringify(P.prescribe(m1.ex, ctx)));
    check('the builder and every target coach-overlap.js names go through targetFor() — prescribe() is called for a target nowhere else',
          /\btargetFor\(/.test(src('coach-build.js')) && !/\bprescribe\s*\(/.test(src('coach-build.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')) &&
          !/\bprescribe\s*\(/.test(src('coach-overlap.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  }

  /* ================= F. v54 — HIS RATING MOVES THE NEXT TARGET, AND NO FURTHER ================= */
  section('F. v54 — his effort rating (`rir`): the two rules SHIP-V54-PROMPT §5.3 turns on — ok / miss / wrong');
  {
    /* Two of spec §6.4's RIR rules, and no more. A top set rated too hard (0)
       means the session did not hit the top — the same again, never a miss.
       Every rated set at the target's load rated way too easy (4+), no set
       typed F, every set at the target's reps: it counts as hitting the top —
       through the confirm dial, one step and never two. A marked session's
       ratings leave with it. Anything but an integer 0–5 is unknown. The
       original 57 rows above are untouched and unrated; these are new, scored
       the same way, and the ok / miss / wrong count below is this section's. */
    const bench = metaOf('barbell-bench-press');
    const rate = (sets, rirs) => sets.map((s, i) => (rirs[i] == null ? s : { ...s, rir: rirs[i] }));
    // A1's log: range 8–12 learned, step 5 learned. The target before the last
    // session is 185 × 10, 10, 9 (the reps rule on 185 × 10, 9, 8).
    const A1E = (last, rirs, o) => ({ meta: bench, u: 'lb', ctx: {}, sessions: logOf(bench, A1_WITH(rate(last, rirs))), ...o });
    const KG_LOG = [[23, xN(3, kg(80), 12)], [19, xN(3, kg(82.5), 8)], [15, rs(kg(82.5), [10, 10, 9])], [11, xN(3, kg(82.5), 12)],
                    [7, rs(kg(85), [10, 9, 8])]];
    const CUT = A1_LOG.map(([a, s]) => [a + 4, s]).slice(0, -1);
    const ROWS = [
      ['R1', 'a top set rated too hard at the top: the same again — hold (hard) at 185 × 12, 12, 12',
       A1E(xN(3, 185, 12), [2, 2, 0]), { mode: 'hold', code: 'hard', load: 185, reps: [12, 12, 12], why: /^Last time 185 lb × 12 felt too hard, so it’s the same again\.$/ }],
      ['R2', 'about right at the top changes nothing: A1’s add, 190 × 8',
       A1E(xN(3, 185, 12), [2, 2, 2]), { mode: 'add', load: 190, reps: [8, 8, 8] }],
      ['R3', 'way too easy at the top: A1’s add, one step, exactly as unrated',
       A1E(xN(3, 185, 12), [4, 4, 4]), { mode: 'add', load: 190, reps: [8, 8, 8] }],
      ['R4', 'every set at its target (185 × 10, 10, 9) and rated way too easy: counts as the top — one step, 190 × 8',
       A1E(rs(185, [10, 10, 9]), [4, 4, 4]), { mode: 'add', load: 190, reps: [8, 8, 8], why: /^Last time you rated 185 lb for 10, 10, 9 way too easy\.$/ }],
      ['R5', 'one of them rated about right: not every rated set was easy — the reps rule, as unrated',
       A1E(rs(185, [10, 10, 9]), [4, 2, 4]), { mode: 'reps', load: 185, reps: [11, 10, 10] }],
      ['R6', 'rated way too easy with a set typed F: no — the reps rule',
       A1E([set(185, 10), set(185, 10), set(185, 9, 'F')], [4, 4, 4]), { mode: 'reps', load: 185 }],
      ['R7', 'rated way too easy but a set short of its target (10, 9, 9 against 10, 10, 9): no',
       A1E(rs(185, [10, 9, 9]), [4, 4, 4]), { mode: 'reps', load: 185 }],
      ['R8', 'way too easy on a cut: through the confirm dial — hold (confirm), and the why says it was his rating',
       A1E(rs(185, [10, 10, 9]), [4, 4, 4], { ctx: { aim: 'cut' } }), { mode: 'hold', code: 'confirm', load: 185, reps: [10, 10, 9], why: /^Last time you rated 185 lb for 10, 10, 9 way too easy\. You’re cutting/ }],
      ['R9', 'kilos: 85 kg × 10, 10, 9 rated way too easy — one of his 2.5 kg steps, 87.5 × 8, stored pounds',
       { meta: bench, u: 'kg', ctx: {}, sessions: logOf(bench, KG_LOG.concat([[3, rate(rs(kg(85), [10, 10, 9]), [4, 4, 4])]])) },
       { mode: 'add', load: 87.5, reps: [8, 8, 8], tw: kg(87.5), why: /^Last time you rated 85 kg for 10, 10, 9 way too easy\.$/ }],
      ['R10', 'too hard below the top changes nothing: the reps rule, as unrated',
       A1E(rs(185, [10, 10, 9]), [0, 2, 2]), { mode: 'reps', load: 185, reps: [11, 10, 10] }],
      ['R11', 'on a cut, the session before at the top but rated too hard is no first look: hold (confirm), not add',
       { meta: bench, u: 'lb', ctx: { aim: 'cut' }, sessions: logOf(bench, CUT.concat([[7, rate(xN(3, 185, 12), [2, 0, 2])], [3, xN(3, 185, 12)]])) },
       { mode: 'hold', code: 'confirm', load: 185 }],
      ['R12', 'on a cut, the session before rated way too easy at its target is the first look: add, one step',
       { meta: bench, u: 'lb', ctx: { aim: 'cut' }, sessions: logOf(bench, CUT.concat([[7, rate(rs(185, [10, 10, 9]), [4, 4, 4])], [3, xN(3, 185, 12)]])) },
       { mode: 'add', load: 190, reps: [8, 8, 8] }],
      ['R13', 'the rated session marked: its ratings leave with it — the target from before it, 185 × 10, 10, 9',
       A1E(rs(185, [10, 10, 9]), [4, 4, 4], { markLast: true }), { mode: 'reps', load: 185, reps: [10, 10, 9] }],
      ['R14', 'rated way too easy at a weight he chose over the target (190): no rating rule — the reps rule at 190',
       A1E(xN(3, 190, 8), [4, 4, 4]), { mode: 'reps', load: 190, reps: [9, 9, 8] }],
      ['R15', 'junk ratings (7, −1, 2.5) are unknown, never 0: A2’s reps, exactly',
       A1E(rs(185, [12, 11, 10]), [7, -1, 2.5]), { mode: 'reps', load: 185, reps: [12, 12, 11] }],
      ['R16', 'a string "0" is not a rating: A1’s add at the top, not the same again',
       A1E(xN(3, 185, 12), ['0', '0', '0']), { mode: 'add', load: 190, reps: [8, 8, 8] }]
    ];
    const tallyF = { ok: 0, miss: 0, wrong: 0 };
    ROWS.forEach(([id, label, c, w]) => {
      const exposures = P.exposuresFor(c.sessions, c.meta.exId);
      const last = exposures[exposures.length - 1];
      const own = last ? Math.round((new Date(NOW).setHours(12, 0, 0, 0) - new Date(last.startedAt).setHours(12, 0, 0, 0)) / DAY) : null;
      const ex = { ...c.meta, exposures, groupDaysSince: own };
      const ctx = { now: NOW, u: c.u, ...c.ctx };
      let t;
      if (c.markLast) {
        const lastAt = last.startedAt;
        t = P.targetFor(ex, ctx, { markedAt: new Set([lastAt]), exposures: [last],
          latest: { word: 'slept badly', exposures: exposures.slice(0, -1), groupDaysSince: own, now: lastAt } });
      } else t = P.targetFor(ex, ctx, null);
      const bad = [];
      if (!t) bad.push('no target');
      else {
        said.push({ u: c.u, id, text: t.line }, ...t.why.map(x => ({ u: c.u, id, text: x })));
        if (t.mode !== w.mode) bad.push('mode ' + t.mode + (t.code ? '(' + t.code + ')' : ''));
        if (w.code !== undefined && t.code !== w.code) bad.push('code ' + t.code);
        const got = t.loadLb == null ? null : r2(U.wOut(t.loadLb, c.u));
        if (!(got === w.load || (got != null && w.load != null && Math.abs(got - w.load) < 0.01))) bad.push('load ' + got);
        if (w.reps && JSON.stringify(t.sets.filter(s => s.type !== 'W').map(s => Number(s.tr))) !== JSON.stringify(w.reps))
          bad.push('reps ' + t.sets.map(s => s.tr).join(','));
        if (w.tw && !t.sets.every(s => s.tw === w.tw)) bad.push('tw ' + t.sets.map(s => s.tw).join(','));
        if (w.why && !t.why.some(x => w.why.test(x))) bad.push('why ' + JSON.stringify(t.why));
      }
      const kind = !bad.length ? 'ok' : t && t.mode === 'defer' ? 'miss' : 'wrong';
      tallyF[kind]++;
      check(id + ': ' + label, kind !== 'wrong', kind + ' — ' + bad.join('; ') + (t ? ' · ' + t.line : ''));
    });
    results.push('\n  ratings — ok: ' + tallyF.ok + '   miss: ' + tallyF.miss + '   wrong: ' + tallyF.wrong);
    check('wrong: 0 — no rating moves a target further than its rule', tallyF.wrong === 0);

    /* The sweep: the section B histories, their last session rated at random
       (all four kinds of value, and none), against the same history unrated.
       Whatever the ratings, the rated target is at most ONE of the lift's
       steps heavier than the unrated one; never heavier at all after a set
       typed F in that session or a top set rated too hard; and the same
       ratings twice are the same target. And the ratings are read nowhere but
       the last two sessions: rating an older one moves nothing. */
    const stepOf_ = t => (t && t.step ? t.step.value : null);
    const moved = { oneStep: [], afterF: [], tooHard: [], same: [], older: [] };
    let rated = 0, changed = 0;
    for (const u of ['lb', 'kg']) {
      for (let s = 1; s <= 900; s++) {
        const h = { ...history(s * 7919 + (u === 'kg' ? 13 : 0), u), seed: s };
        const r = rng(s * 31 + (u === 'kg' ? 7 : 0));
        const lastS = h.sessions[h.sessions.length - 1];
        if (!lastS) continue;
        const alt = clone(h.sessions);
        const altLast = alt[alt.length - 1];
        const VALUES = [4, 4, 4, 2, 0, null, 5, 3];
        altLast.exercises.forEach(e => e.sets.forEach(z => { const v = VALUES[Math.floor(r() * VALUES.length)]; if (v != null) z.rir = v; }));
        const t0 = drive(h, h.sessions).t, t1 = drive(h, alt).t;
        rated++;
        if (JSON.stringify(t0) !== JSON.stringify(t1)) changed++;
        const dir = assistedOf(h.meta) ? -1 : 1;
        if (JSON.stringify(t1) !== JSON.stringify(drive(h, clone(alt)).t)) note2(moved.same, h, 'two answers');
        if (!t0 || !t1 || t0.loadLb == null || t1.loadLb == null) continue;
        const L0 = r2(U.wOut(t0.loadLb, u)), L1 = r2(U.wOut(t1.loadLb, u)), S = stepOf_(t1) || stepOf_(t0);
        const up = dir * (L1 - L0);
        if (up > 0.01 && !(S != null && up <= S + 0.01)) note2(moved.oneStep, h, L0 + ' → ' + L1 + ' (step ' + S + ')');
        const mine = altLast.exercises.filter(e => e.exId === h.meta.exId).flatMap(e => e.sets);
        if (up > 0.01 && mine.some(z => z.type === 'F')) note2(moved.afterF, h, L0 + ' → ' + L1 + ' with an F');
        const exs = P.exposuresFor(alt, h.meta.exId);
        const lastX = exs[exs.length - 1];
        if (up > 0.01 && lastX && lastX.sets.some(z => z.rir === 0)) note2(moved.tooHard, h, L0 + ' → ' + L1 + ' with a set rated too hard');
        // An older session rated instead: nothing moves unless it is the one before.
        if (h.sessions.length >= 3) {
          const old = clone(h.sessions);
          old[0].exercises.forEach(e => e.sets.forEach(z => { z.rir = 0; }));
          if (JSON.stringify(drive(h, old).t) !== JSON.stringify(t0) && old.length > 2 &&
              P.exposuresFor(old, h.meta.exId).length > 2) note2(moved.older, h, 'rating the first session moved the target');
        }
      }
    }
    function note2(list, h, why) { list.push(h.u + ' ' + h.meta.exId + ' seed ' + h.seed + ': ' + why); }
    check('rated at random over ' + rated + ' swept histories (' + changed + ' targets moved by it): never more than one step heavier than unrated',
          rated > 1500 && changed > 20 && !moved.oneStep.length, list(moved.oneStep));
    check('never heavier at all when that session had a set typed F', !moved.afterF.length, list(moved.afterF));
    check('never heavier at all when a set of it was rated too hard', !moved.tooHard.length, list(moved.tooHard));
    check('the same ratings twice are the same target', !moved.same.length, list(moved.same));
    check('a rating on an old session moves nothing — only the last session, and the one before it for the confirm dial',
          !moved.older.length, list(moved.older));

    /* UNRATED IS BYTE FOR BYTE: rack-v53's own coach-prog.js (71cb16e) read
       out of git, on every row of section A and every swept history — the
       promise §5.3 makes, beside section D's against v48 and v51. */
    const P53 = await stageProg('71cb16e');
    // v69: as in section D — byte for byte wherever no v69 rule touches the
    // history; a moved target must carry a v69 reason.
    const diff = [], movedOk = [];
    let touched53 = 0;
    // v70: and the ramp model's reasons (section D's v70Of) — a probable
    // warm-up in any exposure, or a W row dropped from a reduced target's rows.
    const RAMP = await stagedRamp();
    const same53 = (label, ex, ctx) => {
      const t = P.prescribe(ex, ctx), b = P.baselines(ex, ctx), b53 = P53.baselines(ex, ctx);
      const last = ex.exposures[ex.exposures.length - 1];
      const assisted = ex.exId === 'assisted-pull-up' || /assist/i.test(ex.name || '');
      const moved = JSON.stringify(b && b.range) !== JSON.stringify(b53 && b53.range) || JSON.stringify(b && b.step) !== JSON.stringify(b53 && b53.step) ||
                    !!(t && t.range && t.range.held) || !!(t && t.mode === 'defer' && t.code === 'heavy') ||
                    ex.exposures.some(e => RAMP.rampOf(e.allSets, { assisted }).probable > 0) ||
                    !!(t && last && t.sets.length && t.sets.length !== last.allSets.length);
      if (moved) touched53++;
      // v74: a defer's `last` (its why's last row again) taken off, as in D.
      const t74 = t && t.mode === 'defer' ? (({ last, ...r }) => r)(t) : t;
      if (JSON.stringify(t74) !== JSON.stringify(voiced(P53.prescribe(ex, ctx)))) (moved ? movedOk : diff).push(label);
    };
    for (const c of cases()) {
      const { exposures } = run(P, c);
      const last = exposures[exposures.length - 1];
      const own = last ? Math.round((new Date(NOW).setHours(12, 0, 0, 0) - new Date(last.startedAt).setHours(12, 0, 0, 0)) / DAY) : null;
      const ex = { ...c.meta, exposures, groupDaysSince: c.group != null ? c.group : own };
      same53(c.id, ex, { now: NOW, u: c.u, ...c.ctx });
    }
    let sw = 0;
    for (const u of ['lb', 'kg']) for (let s = 1; s <= PER_UNIT; s++) {
      const h = history(s * 7919 + (u === 'kg' ? 13 : 0), u);
      const exposures = P.exposuresFor(h.sessions, h.meta.exId);
      const ex = { ...h.meta, exposures, groupDaysSince: h.group };
      sw++;
      same53(u + ' seed ' + s, ex, h.ctx);
    }
    check('unrated, prescribe() is rack-v53’s, byte for byte, on every row and swept history no v69 or v70 rule touches (' +
          (cases().length + sw - touched53) + ' of ' + (cases().length + sw) + '), and every move carries a v69 or v70 reason (' + movedOk.length + ')',
          !diff.length && touched53 >= movedOk.length, list(diff));
    check('and an unrated set crosses exposuresFor() as the three keys it always was',
          JSON.stringify(Object.keys(P.exposuresFor(logOf(bench, [xN(1, 185, 8)]), bench.exId)[0].sets[0])) === '["w","r","type"]');
  }

  /* ================= J. v69 — NEVER A HEAVIER SINGLE OR DOUBLE, AND THE HELD-LOAD RANGE ================= */
  section('J. v69 — a heavy day teaches nothing and gets no target; a range never bottoms at two; three sessions at one load teach their band');
  {
    const bench = metaOf('barbell-bench-press'), squat = metaOf('back-squat-high-bar');
    const ask = (meta, entries, o = {}) => {
      const c = { meta, u: o.u || 'lb', sessions: logOf(meta, entries), ctx: { aim: o.aim || null, exp: o.exp || null, energy: null, rateWk: null }, group: o.group };
      const { exposures, t } = run(P, c);
      const own = exposures.length ? Math.round((new Date(NOW).setHours(12, 0, 0, 0) - new Date(exposures[exposures.length - 1].startedAt).setHours(12, 0, 0, 0)) / DAY) : null;
      const b = P.baselines({ ...meta, exposures, groupDaysSince: c.group != null ? c.group : own }, { now: NOW, u: c.u, ...c.ctx });
      return { t, b };
    };
    const topReps = t => t.sets.filter(s => s.type !== 'W' && t.loadLb != null && Math.abs(parseFloat(s.tw) - t.loadLb) < 0.01).map(s => parseInt(s.tr, 10));

    // (a) The powerlifter's log: twelve days of 405 × 1 then 315 × 5 × 3, every
    // load rising. Until v69 the single contributed a 1 to every pair, the
    // range read 1–4, and the target was "3 × 1 at 410" — a heavier single.
    const pl = Array.from({ length: 12 }, (_, i) => [set(405 + 5 * i, 1)].concat(xN(3, 315 + 5 * i, 5)));
    const a = ask(squat, pl, { aim: 'powerlifting', exp: 'years' });
    check('(a) twelve single-plus-back-off days with rising loads: no range bottoms at two — lo ' + (a.b && a.b.range.lo),
          a.b && a.b.range.lo >= 3 && a.b.range.source === 'default', JSON.stringify(a.b && a.b.range));
    check('    and the target is defer(heavy), quoting last time', a.t.mode === 'defer' && a.t.code === 'heavy' && a.t.loadLb == null &&
          a.t.line === 'No target for heavy singles, doubles or triples on their own.' && /^Last time: /.test(a.t.why[a.t.why.length - 1]), a.t.line);
    // The same lifter on a 5s day after the singles: still never a 1–4 band.
    const pl5 = pl.concat([xN(3, 375, 5)]);
    const a5 = ask(squat, pl5, { aim: 'powerlifting', exp: 'years' });
    check('    a 3 × 5 day after them reads no range learned from the singles (source ' + (a5.b && a5.b.range.source) + ', lo ' + (a5.b && a5.b.range.lo) + ')',
          a5.b && a5.b.range.lo >= 3 && !(a5.t.mode === 'add' && topReps(a5.t).some(r => r <= 2)), a5.t.line);

    // (b) 5 × 2 at one load, four sessions running: a fixed-rep scheme until
    // v69, which then got "5 × 2 at 230" — a heavier double.
    const dbl = ask(bench, [xN(5, 225, 2), xN(5, 225, 2), xN(5, 225, 2), xN(5, 225, 2)], { aim: 'powerlifting' });
    check('(b) 5 × 2 at 225, four sessions running: defer(heavy), never 5 × 2 at 230', dbl.t.mode === 'defer' && dbl.t.code === 'heavy' && dbl.t.loadLb == null, dbl.t.line);
    const dbl3 = ask(bench, [xN(5, 225, 3), xN(5, 225, 3), xN(5, 225, 3), xN(5, 225, 3)], { aim: 'powerlifting' });
    check('    while 5 × 3 straight sets still get a target (confirmed twice, as shipped)', dbl3.t.mode === 'add' && dbl3.t.loadLb != null, dbl3.t.line);
    const lone = ask(bench, [[set(245, 3), set(205, 8), set(205, 8)], [set(250, 3), set(210, 8), set(210, 8)]]);
    check('    a lone top triple with back-offs: defer(heavy), as shipped', lone.t.mode === 'defer' && lone.t.code === 'heavy', lone.t.line);

    // (c) Every generated history, plus a sweep built to reach the fences:
    // no add target carries a top-set rep count of two or fewer at a load
    // above last time's top; a heavy last session is always a heavy defer.
    const bad = [], heavyLast = [];
    let adds = 0, heavyDays = 0;
    const judge = (label, meta, sessions, ctx, group) => {
      const exposures = P.exposuresFor(sessions, meta.exId);
      if (!exposures.length) return;
      const t = P.prescribe({ ...meta, exposures, groupDaysSince: group }, ctx);
      if (!t) return;
      const last = exposures[exposures.length - 1];
      // Stored pounds throughout: the top load and the target's loadLb are both pounds.
      const main = last.sets.filter(x => x.type !== 'D').map(x => ({ L: parseFloat(x.w) || 0, R: parseInt(x.r, 10) }));
      const dir = assistedOf(meta) ? -1 : 1;
      const T = dir < 0 ? Math.min(...main.map(x => x.L)) : Math.max(...main.map(x => x.L));
      const top = main.filter(x => Math.abs(x.L - T) < 0.01);
      const heavy = top.some(x => x.R <= 2) || (top.length === 1 && top[0].R <= 3);
      if (heavy && main.every(x => x.L > 0)) { heavyDays++; if (!(t.mode === 'defer' && t.code === 'heavy')) heavyLast.push(label + ': ' + t.mode + '(' + t.code + ') ' + t.line); }
      if (t.mode === 'add') adds++;
      if (t.loadLb != null && dir * (t.loadLb - T) > 0.01 && topReps(t).some(r => r <= 2)) bad.push(label + ': ' + t.line);
    };
    for (const u of ['lb', 'kg']) for (let s = 1; s <= PER_UNIT; s++) {
      const h = history(s * 7919 + (u === 'kg' ? 13 : 0), u);
      judge(u + ' seed ' + s, h.meta, h.sessions, h.ctx, h.group);
    }
    // The built sweep: straight 5s days with single, double and lone-triple
    // days dropped in at random, loads drifting up, both units.
    const r = rng(69);
    for (let s = 0; s < 600; s++) {
      const u = s % 2 ? 'kg' : 'lb';
      const meta = r() < 0.5 ? bench : squat;
      const store = L => (u === 'kg' ? String(U.wIn(L, 'kg')) : String(L));
      let L = u === 'kg' ? 100 : 225;
      const n = 4 + Math.floor(r() * 9);
      const entries = [];
      for (let i = 0; i < n; i++) {
        const x = r();
        const step = u === 'kg' ? 2.5 : 5;
        if (i && r() < 0.5) L += step * (1 + Math.floor(r() * 2));
        if (x < 0.25) entries.push([set(store(L * 1.25), 1 + Math.floor(r() * 2))].concat(xN(3, store(L), 5)));   // a single or double, then back-offs
        else if (x < 0.4) entries.push(xN(3 + Math.floor(r() * 3), store(L * 1.1), 2));                          // straight doubles
        else if (x < 0.5) entries.push([set(store(L * 1.15), 3), set(store(L), 5), set(store(L), 5)]);         // a lone top triple
        else entries.push(xN(3, store(L), 4 + Math.floor(r() * 3)));                                              // straight 4s to 6s
      }
      const sessions = logOf(meta, entries);
      judge('built ' + s + ' ' + u, meta, sessions, { now: NOW, u, aim: 'powerlifting', exp: 'years', energy: null, rateWk: null }, null);
    }
    check('(c) over ' + (PER_UNIT * 2) + ' generated and 600 built histories (' + adds + ' adds): no add target carries a top set of two reps or fewer above last time’s top',
          !bad.length && adds > 200, list(bad));
    check('    and every history whose last session is heavy — a single, a double, a lone triple (' + heavyDays + ' of them) — is defer(heavy)',
          !heavyLast.length && heavyDays > 150, list(heavyLast));

    // (d) The held-load range: 185 for 10, 10, 9 → 9, 8, 8 → 8, 8, 8, then a
    // judged session of 8, 7, 7. The band is 8–10, held; the judged session
    // is a miss against it, and never drags it down to 7.
    const heldLog = [rs(185, [10, 10, 9]), rs(185, [9, 8, 8]), rs(185, [8, 8, 8]), rs(185, [8, 7, 7])];
    const hd = ask(bench, heldLog);
    check('(d) 10, 10, 9 → 9, 8, 8 → 8, 8, 8 at 185: the range is 8–10, his, held for three sessions',
          hd.t.range && hd.t.range.lo === 8 && hd.t.range.hi === 10 && hd.t.range.source === 'yours' && hd.t.range.held === 3, JSON.stringify(hd.t.range));
    check('    and the judged 8, 7, 7 is hold(miss) against it — "came in under 8" — not a new 7–10',
          hd.t.mode === 'hold' && hd.t.code === 'miss' && /came in under 8 last time \(8, 7, 7\)/.test(hd.t.why[0]), hd.t.mode + '(' + hd.t.code + ') ' + hd.t.why[0]);
    const hdIn = ask(bench, heldLog.slice(0, 3).concat([rs(185, [9, 9, 8])]));
    check('    a judged 9, 9, 8 inside it: one more rep, and the why names the held load — "Inside the 8–10 you’ve held 185 lb at for three sessions"',
          hdIn.t.mode === 'reps' && hdIn.t.why[0] === 'Inside the 8–10 you’ve held 185 lb at for three sessions, and 9, 9, 8 at 185 lb last time.', hdIn.t.why[0]);
    const hdTop = ask(bench, heldLog.slice(0, 3).concat([rs(185, [10, 10, 10])]));
    check('    a judged 10, 10, 10 reached its top: add, starting at 8, "the top of the 8–10 you’ve shown there"',
          hdTop.t.mode === 'add' && hdTop.t.loadLb === 190 && JSON.stringify(topReps(hdTop.t)) === '[8,8,8]' && /the top of the 8–10 you’ve shown there\.$/.test(hdTop.t.why[0]), hdTop.t.why[0]);
    const hdTwo = ask(bench, heldLog.slice(1));
    check('    two sessions at the load plus the judged one: no held range — three are needed before the one being judged', !(hdTwo.t.range && hdTwo.t.range.held), JSON.stringify(hdTwo.t.range));
    const hdWide = ask(bench, [rs(185, [12, 12, 11]), rs(185, [9, 8, 8]), rs(185, [7, 7, 7]), rs(185, [8, 7, 7])]);
    check('    a band wider than four (7–12) is not held', !(hdWide.t.range && hdWide.t.range.held), JSON.stringify(hdWide.t.range));
    const hdLow = ask(bench, [rs(225, [3, 2, 2]), rs(225, [3, 3, 2]), rs(225, [3, 3, 3]), rs(225, [3, 3, 2])], { aim: 'powerlifting' });
    check('    sessions bottoming at two are heavy, never held, and such a day is defer(heavy)',
          !(hdLow.b.range && hdLow.b.range.held) && hdLow.t.mode === 'defer' && hdLow.t.code === 'heavy', hdLow.t.line + ' ' + JSON.stringify(hdLow.b.range));
    const hdKg = ask(bench, [rs(kg(85), [10, 10, 9]), rs(kg(85), [9, 8, 8]), rs(kg(85), [8, 8, 8]), rs(kg(85), [9, 9, 8])], { u: 'kg' });
    check('    in kilos the held load prints through units.js: "you’ve held 85 kg at"', hdKg.t.mode === 'reps' && /you’ve held 85 kg at for three sessions/.test(hdKg.t.why[0]), hdKg.t.why[0]);

    // (e) The step: 135 → 155 → 175 on a bench, 20-lb jumps twice. Twice is
    // enough for a 5- or 10-lb jump; a jump past twice the default step is a
    // programme change until seen three times, so the step stays the default.
    const st = ask(bench, [xN(3, 135, 8), xN(3, 155, 8), xN(3, 175, 8)]);
    check('(e) bench 135 → 155 → 175, 20-lb jumps twice: the step is the default 5, not 20', st.t.step && st.t.step.source === 'default' && st.t.step.value === 5, JSON.stringify(st.t.step));
    const st3 = ask(bench, [xN(3, 135, 8), xN(3, 155, 8), xN(3, 175, 8), xN(3, 195, 8)]);
    check('    seen three times, it is his: 20 lb from 3 increases', st3.t.step && st3.t.step.source === 'yours' && st3.t.step.value === 20 && st3.t.step.n === 3, JSON.stringify(st3.t.step));
    const st5 = ask(bench, [xN(3, 135, 8), xN(3, 140, 8), xN(3, 145, 8)]);
    check('    a 5-lb jump seen twice is still his, as shipped', st5.t.step && st5.t.step.source === 'yours' && st5.t.step.value === 5, JSON.stringify(st5.t.step));
    const stH = ask(bench, [xN(3, 185, 5), [set(200, 2), set(170, 5)], xN(3, 190, 5), [set(205, 2), set(175, 5)], xN(3, 195, 5)]);
    check('    a rise into a heavy day (185 → 200 × 2, 190 → 205 × 2) teaches no 15-lb step: the baselines say the default 5',
          stH.b.step && stH.b.step.source === 'default' && stH.b.step.value === 5, JSON.stringify(stH.b.step));
    const stKg = ask(bench, [xN(3, kg(60), 8), xN(3, kg(67.5), 8), xN(3, kg(75), 8)], { u: 'kg' });
    check('    in kilos, 7.5-kg jumps twice on a 2.5-kg default: the default', stKg.t.step && stKg.t.step.source === 'default' && stKg.t.step.value === 2.5, JSON.stringify(stKg.t.step));
  }

  /* ================= K. v70 — THE RAMP: targets, their rows and the next set ================= */
  section('K. v70 — the ramp model: a target never reads a ramp, its rows never clamp a warm-up, and mid-ramp the next set is the target itself');
  {
    const squat = metaOf('back-squat-high-bar');
    const RAMP = [set(45, 10), set(45, 8), set(135, 5), set(135, 5), set(225, 3)];
    // Build muscle's 6–10 band: three squat days at 3 × 10, climbing 305 → 310
    // → 315 (the top reached, the 5-lb step seen twice: an add to 320 × 6) —
    // and the same three with his untagged ramp in front of every one.
    const ctx = { aim: 'muscle', exp: 'some', energy: null, rateWk: null };
    const plain = [xN(3, 305, 10), xN(3, 310, 10), xN(3, 315, 10)];
    const ramped = plain.map(sets => RAMP.concat(sets));
    const taggedW = plain.map(sets => RAMP.map(s => ({ ...s, type: 'W' })).concat(sets));
    const T = sets => run(P, { meta: squat, u: 'lb', sessions: logOf(squat, sets), ctx }).t;
    const tP = T(plain), tR = T(ramped), tW = T(taggedW);
    check('(a) the target reads the same lift with the ramp untagged, tagged W, or absent: 3 × 6 at 320 lb, the same line and why',
          !!tP && tP.mode === 'add' && tP.loadLb === 320 && tP.line === 'Target: 3 × 6 at 320 lb.' && tR.line === tP.line && tW.line === tP.line &&
          JSON.stringify(tR.why) === JSON.stringify(tP.why) && JSON.stringify(tW.why) === JSON.stringify(tP.why) &&
          tR.loadLb === 320 && tW.loadLb === 320, [tP && tP.line, tR && tR.line, tW && tW.line].join(' | '));
    const dShape = T([RAMP.concat(xN(3, 305, 10)), RAMP.concat(xN(3, 315, 10)), RAMP.concat([set(325, 8), set(295, 8), set(295, 8)])]);
    const lastTime = dShape && dShape.why.find(w => /^Last time:/.test(w));
    check('    and "Last time:" on a defer never recites the ramp: a shape defer quotes "325 lb for 8, then 2 × 8 at 295 lb", not 45, 135 or 225',
          !!dShape && dShape.mode === 'defer' && dShape.code === 'shape' && lastTime === 'Last time: 325 lb for 8, then 2 × 8 at 295 lb.',
          JSON.stringify(dShape && dShape.why));
    check('    the untagged ramp rows ride into the target’s sets as logged — typed N, their own weights as ghosts — and the three working rows carry 320 × 6',
          tR.sets.length === 8 && tR.sets.slice(0, 5).every((s, i) => s.type === 'N' && s.tw === RAMP[i].w && s.tr === RAMP[i].r) &&
          tR.sets.slice(5).every(s => s.tw === '320' && s.tr === '6'), JSON.stringify(tR.sets));
    check('    … and typed W they ride in typed W, untouched', tW.sets.length === 8 && tW.sets.slice(0, 5).every((s, i) => s.type === 'W' && s.tw === RAMP[i].w && s.tr === RAMP[i].r));

    // (b) The next set, mid-ramp, under that 320 × 6 target. Two logs: the
    // plain one, where Coach has never seen him warm up (so an untagged bar
    // set is a reading, not a fact — nothing is said), and the ramped one,
    // where 45, 135 and 225 are his own ramp loads (rampLoads) and are sure.
    const exOf = sets => { const sessions = logOf(squat, sets); const exposures = P.exposuresFor(sessions, squat.exId); return { ...squat, exposures, groupDaysSince: 3 }; };
    const C = { now: NOW, u: 'lb', ...ctx, repDrop: 0.25 };
    const ex = exOf(plain), exR = exOf(ramped);
    const live = (w, r, type, extra) => ({ w: String(w), r: String(r), type: type || 'N', done: true, ...(extra || null) });
    const n0 = P.nextSet(ex, C, []);
    const n1 = P.nextSet(exR, C, [live(45, 8)]);
    check('(b) nothing ticked: the target. One N set of 45 × 8 ticked, 45 among his ramp loads: `warmup`, with the target’s own tw and tr, and "Warming up. The target when you get there: 320 lb × 6."',
          !!n0 && n0.kind === 'target' && n0.tw === '320' && n0.tr === '6' && !!n1 && n1.kind === 'warmup' && n1.tw === n0.tw && n1.tr === n0.tr && n1.loadLb === 320 && n1.warmup === true &&
          n1.text === 'Warming up. The target when you get there: 320 lb × 6.' && n1.why[0] === n0.why[0] && /^My target for this lift today: /.test(n1.why[0]), JSON.stringify(n1));
    check('    the same 45 × 8 on a log with no warm-up in it: UNSURE — null, never "Warming up" off the tiers alone and never "Next set: 45 lb × 8"', P.nextSet(ex, C, [live(45, 8)]) === null);
    const n3 = P.nextSet(exR, C, [live(45, 8), live(135, 5), live(225, 3)]);
    check('    45, 135, 225 ticked, his ramp: still warming up — never "Next set: 225 lb × 3"', !!n3 && n3.kind === 'warmup' && n3.loadLb === 320, JSON.stringify(n3));
    check('    … and on the plain log, null at every rung', P.nextSet(ex, C, [live(45, 8), live(135, 5), live(225, 3)]) === null && P.nextSet(ex, C, [live(45, 8), live(135, 5)]) === null);
    const nW = P.nextSet(ex, C, [live(45, 8, 'W')]);
    check('    a typed W ticked alone is sure on any log: `warmup`', !!nW && nW.kind === 'warmup' && nW.tw === n0.tw);
    check('    a typed W then an untagged 225 × 3 on the plain log: null — the W is sure, the 225 is not', P.nextSet(ex, C, [live(45, 8, 'W'), live(225, 3)]) === null);
    // What settles it under the target: the sets saying it plainly.
    check('    a third set at one load under the target (3 × 250 × 6 under 320, 78%) is plain work: `same` at 250 from the third tick, null at the first two',
          P.nextSet(ex, C, [live(250, 6)]) === null && P.nextSet(ex, C, [live(250, 6), live(250, 6)]) === null &&
          (() => { const n = P.nextSet(ex, C, [live(250, 6), live(250, 6), live(250, 6)]); return !!n && n.kind === 'same' && n.tw === '250'; })(), JSON.stringify(P.nextSet(ex, C, [live(250, 6), live(250, 6), live(250, 6)])));
    check('    a set within the heavy tier of the top for more than a triple is plain (300 × 6 under 320 is 94%: a working set he chose): `same` at 300 at once',
          (() => { const n = P.nextSet(ex, C, [live(300, 6)]); return !!n && n.kind === 'same' && n.tw === '300'; })() && P.nextSet(ex, C, [live(300, 3)]) === null);
    check('    an F under the target is plain (nobody fails a warm-up): `stop`', (() => { const n = P.nextSet(ex, C, [live(300, 4, 'F')]); return !!n && n.kind === 'stop'; })(), JSON.stringify(P.nextSet(ex, C, [live(300, 4, 'F')])));
    check('    a set rated too hard under the target is plain: `stop`', (() => { const n = P.nextSet(ex, C, [live(300, 6, 'N', { rir: 0 })]); return !!n && n.kind === 'stop'; })());
    check('    more reps than any warm-up (225 × 13) is plain: an answer, not null', P.nextSet(ex, C, [live(225, 13)]) !== null);
    // The first set at the target, when its reps say it may be a rung on the way past.
    check('    the first set AT the target with half the plan’s reps or fewer (320 × 3 under 320 × 6): null — a bad set or a rung through a stale target; the second set there settles it',
          P.nextSet(ex, C, [live(320, 3)]) === null && (() => { const n = P.nextSet(ex, C, [live(320, 3), live(320, 3)]); return !!n && n.kind === 'down'; })());
    check('    320 × 4 at the target (more than half the plan) on an add target that is his top: an answer', P.nextSet(ex, C, [live(320, 4)]) !== null);
    const nS = P.nextSet(ex, C, [live(45, 8, 'W'), live(320, 6)]);
    check('    after [W 45 × 8, N 320 × 6]: `same` at 320 — the warm-up counts for nothing, the working set does',
          !!nS && nS.kind === 'same' && nS.tw === '320' && nS.tr === '6', JSON.stringify(nS));
    const nU = P.nextSet(ex, C, [live(45, 8), live(135, 5), live(225, 3), live(320, 6)]);
    check('    after the untagged ramp and 320 × 6: `same` at 320, exactly as with the ramp typed W', !!nU && nU.kind === 'same' && nU.tw === '320' &&
          JSON.stringify(nU) === JSON.stringify(P.nextSet(ex, C, [live(45, 8, 'W'), live(135, 5, 'W'), live(225, 3, 'W'), live(320, 6)])), JSON.stringify(nU));
    const nUp = P.nextSet(ex, C, [live(45, 8), live(135, 5), live(225, 3), live(320, 8)]);
    check('    …and 320 × 8 after the ramp earns the step: `up` to 325, the ramp never "a step down"', !!nUp && nUp.kind === 'up' && nUp.tw === '325', JSON.stringify(nUp));
    const nDown = P.nextSet(ex, C, [live(320, 6), live(325, 6), live(320, 8)]);
    check('    a step down in the session (325 then 320) and 8 reps at 320, which would have earned the step: no `up` — "I don’t step up after a step down in the same session."',
          !!nDown && nDown.kind === 'same' && nDown.tw === '320' && nDown.why.some(w => /step up after a step down/.test(w)), JSON.stringify(nDown));
    const nDownW = P.nextSet(ex, C, [live(320, 6), live(325, 6), live(320, 8, 'W')]);
    check('    (a ticked W after them is not a step down — it is not a working set at all)', !!nDownW && nDownW.kind === 'same' && !nDownW.why.some(w => /step down/.test(w)), JSON.stringify(nDownW));
    const nUn = P.nextSet(ex, C, [live(320, 8, 'N', { done: false })]);
    check('    a row not ticked is not read: nothing done, nothing warmed — the target', !!nUn && nUn.kind === 'target');
    const nLight = P.nextSet(ex, C, [live(45, 8), live(305, 6)]);
    check('    a working set under the target (305 × 6 under 320, 95%) is work, not a warm-up: `same` at 305', !!nLight && nLight.kind === 'same' && nLight.tw === '305', JSON.stringify(nLight));

    // (c) A reduce target's rows never carry a W row heavier than its load:
    // his own 8–10 band (moved up at 10, started at 8, twice), then twice under
    // 8 at 315 → back to 305, a weight he has lifted here. A 310 × 3 warm-up
    // before the 315s is heavier than 305.
    const climb = [xN(3, 285, 10), xN(3, 295, 8), xN(3, 295, 10), xN(3, 305, 8)];
    const redLow = T(climb.concat([[set(285, 5, 'W'), set(315, 5), set(315, 5), set(315, 4)], [set(310, 3, 'W'), set(315, 5), set(315, 4), set(315, 4)]]));
    const red = T(climb.concat([[set(285, 5, 'W'), set(315, 5), set(315, 5), set(315, 4)], [set(285, 5, 'W'), set(315, 5), set(315, 4), set(315, 4)]]));
    check('(c) a reduce (two sessions under 8 at 315 → 305): the 310 × 3 warm-up is dropped from its rows, never clamped to 305; a 285 × 5 one stays as logged',
          !!redLow && redLow.mode === 'reduce' && redLow.loadLb === 305 && !redLow.sets.some(s => s.type === 'W') && redLow.sets.length === 3 && redLow.sets.every(s => s.tw === '305') &&
          !!red && red.mode === 'reduce' && red.loadLb === 305 && red.sets.length === 4 && red.sets[0].type === 'W' && red.sets[0].tw === '285' && red.sets[0].tr === '5',
          [redLow && redLow.line, JSON.stringify(redLow && redLow.sets), red && red.line, JSON.stringify(red && red.sets)].join(' | '));
    const sweepDrop = [];
    for (const u of ['lb', 'kg']) for (let s = 1; s <= 600; s++) {
      const h = history(s * 7919 + (u === 'kg' ? 13 : 0), u);
      const { exposures, t } = drive(h, h.sessions);
      if (!t || !t.sets.length || t.loadLb == null) continue;
      const dir = assistedOf(h.meta) ? -1 : 1;
      t.sets.forEach(x => { if (x.type === 'W' && x.tw !== '' && dir * (lu(x.tw, u) - lu(t.loadLb, u)) > 0.01 && ['reduce', 'reenter'].includes(t.mode)) sweepDrop.push(u + ' seed ' + s + ': W ' + x.tw + ' over ' + t.loadLb); });
      const last = exposures[exposures.length - 1];
      t.sets.forEach((x, i) => { if (x.type === 'W' && last && last.allSets.some(y => y.type === 'W' && y.w === x.tw) && x.tr !== last.allSets.find(y => y.type === 'W' && y.w === x.tw).r) sweepDrop.push(u + ' seed ' + s + ': W row rewritten'); });
    }
    check('    swept over 1200 histories: no reduce or re-entry carries a W row heavier than its load, and no W row is rewritten', !sweepDrop.length, list(sweepDrop));
  }

  section('L. v73 — a told step (knowBy.step → ex.stepTold): used only where the log has none seen twice, dropped when the log learns another, ignored off the grid; nextOf never `up` after a `down`');
  {
    /* A lat pulldown (cable: no default step) at 120 × 10 for four sessions —
       the top of a muscle 8–12 band reached, so an add is earned, but no step
       is learnable from a flat line. Told 10 lb, the target names 130; told
       nothing, "the next setting up". */
    const pulldown = metaOf('lat-pulldown');
    const ctx = { aim: 'muscle', exp: 'some', energy: null, rateWk: null };
    const flat = [xN(3, 120, 12), xN(3, 120, 12), xN(3, 120, 12), xN(3, 120, 12)];
    const T = (sets, extra) => run(P, { meta: { ...pulldown, ...(extra || null) }, u: 'lb', sessions: logOf(pulldown, sets), ctx }).t;
    const t0 = T(flat), t10 = T(flat, { stepTold: 10 });
    check('(a) told nothing on a cable lift at its top: an add with no number — "the next setting up"', !!t0 && t0.mode === 'add' && t0.loadLb == null && t0.step === null, JSON.stringify(t0 && [t0.mode, t0.loadLb, t0.line]));
    check('    told 10 lb: the add names 130 lb, the step reads source `told`, and the why says "You told me one step up here is 10 lb."',
          !!t10 && t10.mode === 'add' && t10.loadLb === 130 && t10.step && t10.step.source === 'told' && t10.step.value === 10 && t10.step.n === 0 &&
          t10.why.some(w => w === 'You told me one step up here is 10 lb.'), JSON.stringify(t10 && [t10.line, t10.step, t10.why]));
    const b10 = P.baselines({ ...pulldown, stepTold: 10, exposures: P.exposuresFor(logOf(pulldown, flat), pulldown.exId) }, { now: NOW, u: 'lb', ...ctx });
    check('    baselines() reads the same told step', !!b10 && b10.step && b10.step.source === 'told' && b10.step.value === 10, JSON.stringify(b10 && b10.step));
    // The log wins: the same lift with two 15-lb rises in it learns 15 and ignores the 10 he said.
    const climbed = [xN(3, 105, 12), xN(3, 120, 12), xN(3, 120, 12), xN(3, 135, 12), xN(3, 135, 12)];
    const tL = T(climbed, { stepTold: 10 });
    check('(b) a jump seen twice (15 lb) outranks the told 10: source `yours`, value 15, the target 150 — the stale fact is inert, nothing written',
          !!tL && tL.step && tL.step.source === 'yours' && tL.step.value === 15 && tL.loadLb === 150, JSON.stringify(tL && [tL.line, tL.step]));
    check('    and a jump seen once does not: the told step still stands', (() => { const t = T([xN(3, 120, 12), xN(3, 135, 12), xN(3, 135, 12), xN(3, 135, 12)], { stepTold: 10 }); return !!t && t.step && t.step.source === 'told' && t.loadLb === 145; })());
    // Off the display grid: a 2.5-lb answer read on a kilo account is 1.13 kg — ignored, not converted.
    const kgLog = logOf(pulldown, flat.map(s => s.map(x => ({ ...x, w: String(Math.round(parseFloat(x.w) / 2.2046226218 * 2) / 2 * 2.2046226218 * 100) / 100 }))));
    const tKgOff = P.prescribe({ ...pulldown, stepTold: 2.5, exposures: P.exposuresFor(kgLog, pulldown.exId), groupDaysSince: 3 }, { now: NOW, u: 'kg', ...ctx });
    const tKgOn = P.prescribe({ ...pulldown, stepTold: 5.51, exposures: P.exposuresFor(kgLog, pulldown.exId), groupDaysSince: 3 }, { now: NOW, u: 'kg', ...ctx });
    check('(c) in kilos, a told 2.5 lb (1.13 kg) is off the half-kilo grid: ignored, no number; a told 5.51 lb (2.5 kg) is on it and names the step',
          !!tKgOff && tKgOff.loadLb == null && tKgOff.step === null && !!tKgOn && tKgOn.step && tKgOn.step.source === 'told' && tKgOn.step.value === 2.5 && tKgOn.loadLb != null,
          JSON.stringify([tKgOff && [tKgOff.line, tKgOff.step], tKgOn && [tKgOn.line, tKgOn.step]]));
    check('    junk told values are ignored: 0, −10, NaN, a string', [0, -10, NaN, '10', null].every(v => { const t = T(flat, { stepTold: v }); return !!t && t.step === null && t.loadLb == null; }));
    // The next set with a told step: the heavier set after an earned up, "the step you told me"; and never `up` after a `down`.
    const exOf = (sets, told) => ({ ...pulldown, exposures: P.exposuresFor(logOf(pulldown, sets), pulldown.exId), groupDaysSince: 3, ...(told != null ? { stepTold: told } : null) });
    const C = { now: NOW, u: 'lb', ...ctx, repDrop: 0.25 };
    const live = (w, r, type, extra) => ({ w: String(w), r: String(r), type: type || 'N', done: true, ...(extra || null) });
    // Under a hold-the-reps target (120 × 12 reached once more is the same), 14 reps earns the step.
    const nUp = P.nextSet(exOf(flat, 10), C, [live(130, 14)]);
    const nNo = P.nextSet(exOf(flat), C, [live(130, 14)]);
    check('(d) nextSet with a told step: 130 × 14 under a 130 target earns `up` to 140 — "the step you told me"; told nothing, the target has no number and there is no next set at all',
          !!nUp && nUp.kind === 'up' && nUp.tw === '140' && nUp.why.some(w => /the step you told me/.test(w)) && nNo === null, JSON.stringify([nUp, nNo]));
    const nAfterDown = P.nextSet(exOf(flat, 10), C, [live(130, 12), live(120, 14)]);
    check('    a step down today (130 then 120) and 14 reps at 120: never `up` — the same at 120', !!nAfterDown && nAfterDown.kind !== 'up' && nAfterDown.tw === '120', JSON.stringify(nAfterDown));
    // Swept: no `up` after a `down` on any seeded history, told step or not.
    const upAfterDown = [];
    let downs = 0;
    for (const u of ['lb', 'kg']) for (let s = 1; s <= 300; s++) {
      const h = history(s * 104729 + (u === 'kg' ? 7 : 0), u);
      const { exposures, t } = drive(h, h.sessions);
      if (!t || t.loadLb == null) continue;
      const L = w => Math.round(lu(w, u) * 100) / 100;
      const top = t.sets.filter(x => x.type !== 'W' && !x.ramp && x.tw !== '').map(x => L(x.tw));
      if (!top.length) continue;
      const TL = Math.max(...top), S = t.step ? t.step.value : (u === 'kg' ? 2.5 : 5);
      const lower = Math.max(0.5, TL - S);
      const todayRows = [live(t.sets.find(x => x.type !== 'W' && x.tw !== '').tw, 10), live(u === 'kg' ? String(Math.round(lower * 2.2046226218 * 100) / 100) : String(lower), 20)];
      const ex = { ...h.meta, exposures, groupDaysSince: 3, stepTold: s % 2 ? (u === 'kg' ? 5.51 : 10) : undefined };
      const n = P.nextSet(ex, { now: NOW, u, aim: h.ctx && h.ctx.aim, exp: h.ctx && h.ctx.exp, energy: null, rateWk: null, repDrop: 0.25 }, todayRows);
      if (!n) continue;
      downs++;
      if (n.kind === 'up' || L(n.tw) > L(todayRows[1].w) + 0.01) upAfterDown.push(u + ' seed ' + s + ': ' + n.kind + ' ' + n.text);
    }
    check('    swept over 600 histories with a step down today and 20 reps after it: never `up`, never heavier than the set just done (' + downs + ' read)', downs > 100 && !upAfterDown.length, list(upAfterDown));
  }

  console.log('\nCoach names a weight only when it is one he can load\n');
  console.log(results.join('\n'));
  console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
}
