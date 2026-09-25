#!/usr/bin/env node
//
// Verifier for drop sets you can read (v55).
//
//   node tools-check/drop-sets.mjs
//
// Micah, 23 Sep 2026: when a set is changed to a drop set, "a little sub-menu
// of sets to appear under it — the individual sub-sets that make up that drop
// set — so it's clear which sub-sets belong to that drop set versus another
// drop set stacked beneath it." Decided in SHIP-V55-PROMPT §3. What has to
// hold:
//
//   ONE OPTIONAL FIELD, AND NOTHING MIGRATES.  A drop set is the set he
//        changed to a drop set (type 'D') and the drops under it; a drop is a
//        'D' carrying `dp: 1`, "continues the drop set above". A 'D' with no
//        `dp` — every one logged before v55 — is a drop set of its own, which
//        is what it always was. Order and type alone cannot separate two
//        stacked drop sets, because every set of both is a 'D' (A).
//   EVERY EDIT KEEPS THEM APART.  A set changed to a drop set starts its own;
//        "+ Drop" puts the next drop after its drop set's last; a swipe or a
//        type change never stitches one drop set to another (B).
//   ON SCREEN.  Drops sit indented under the set he changed, "+ Drop" under
//        the last, two stacked drop sets are two groups, and the "Last ·"
//        line reads "185×8 → 135×6 → 95×5" (C).
//   IT SURVIVES.  Finish writes it on the set, in the one whole record; the
//        "last time" index carries it; open → save → open changes nothing; an
//        old record gains nothing (D). Duplicating a block, a routine saved
//        and started, the routine editor, and the builder's proposal all keep
//        the grouping (E).
//   EVERY ENGINE COUNTS WHAT IT COUNTED — except the one read that was wrong.
//        A 'D' is a working set for every count, with `dp` or without it (F1).
//        The rep-drop reads counted a drop set's falling reps as fatigue; they
//        no longer read a 'D' at all. rack-v54's engines, staged out of git at
//        2e8da18, are run beside today's on the same log to show the before
//        and the after, and that a log with no drop set reads the same in
//        both (F2). The live chips rate a drop set on the set it starts from,
//        never on a drop (F3).
//
// NO COPY OF ANY RULE LIVES HERE. analytics.js and the Coach modules are
// staged and driven for real; workout.js's functions are lifted verbatim, as
// effort.mjs lifts them, against a DOM shim and a model of RTDB's set();
// routines.js's toSession() and its save map the same way.

import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
// rack-v54, the build before this one: the "before" of every before-and-after below.
const BEFORE = '2e8da18';

/* ================= THE FAKE DOCUMENT ================= */
function mkEl(tag) {
  const n = {
    tag, className: '', textContent: '', innerHTML: '', value: '', placeholder: '', title: '', type: '',
    children: [], parent: null, attrs: {}, style: {}, dataset: {}, disabled: false, onclick: null, onchange: null,
    classList: {
      add(...cs) { cs.forEach(c => { if (!n.classList.contains(c)) n.className = (n.className + ' ' + c).trim(); }); },
      remove(...cs) { n.className = n.className.split(' ').filter(x => x && !cs.includes(x)).join(' '); },
      contains: c => n.className.split(' ').includes(c)
    },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    getAttribute(k) { return k in n.attrs ? n.attrs[k] : null; },
    appendChild(c) { c.parent = n; n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => n.appendChild(c)); },
    remove() { if (n.parent) n.parent.children = n.parent.children.filter(x => x !== n); n.parent = null; },
    querySelectorAll(sel) { return walk(n).filter(x => x.classList.contains(sel.replace(/^\./, ''))); }
  };
  return n;
}
function walk(n, out = []) { n.children.forEach(c => { out.push(c); walk(c, out); }); return out; }
const body = mkEl('body');
globalThis.document = {
  body, createElement: t => mkEl(t), createElementNS: (_ns, t) => mkEl(t),
  querySelector: sel => walk(body).find(x => x.classList.contains(sel.replace(/^\./, ''))) || null,
  querySelectorAll: () => [], getElementById: () => null
};
globalThis.window = { addEventListener() {} };

/* ================= STAGING =================
   Two Coach stacks against a stubbed store: today's files, and rack-v54's out
   of git. The same generic import rewrite coach-volume.mjs uses. */
const STORE = `
export async function read(_p, fallback) { return fallback; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`;
const FILES = ['analytics.js', 'coach-goal.js', 'coach-prog.js', 'coach-overlap.js', 'coach-build.js', 'coach-live.js',
               'coach-ready.js', 'coach-fuel.js', 'coach-volume.js', 'coach.js'];
async function stage(tag, read) {
  const dir = mkdtempSync(join(tmpdir(), 'rack-drops-' + tag + '-'));
  const at = f => JSON.stringify(pathToFileURL(join(dir, f)).href);
  writeFileSync(join(dir, 'store-stub.mjs'), STORE);
  FILES.forEach(f => writeFileSync(join(dir, f.replace(/\.js$/, '.mjs')), read(f)
    .replace("from './store.js'", "from './store-stub.mjs'")
    .replace(/from '\.\/([\w-]+)\.js'/g, (w, n) => 'from ' + (FILES.includes(n + '.js') ? at(n + '.mjs') : real(n + '.js')))));
  const get = f => import(JSON.parse(at(f)));
  return { A: await get('analytics.mjs'), C: await get('coach.mjs'), P: await get('coach-prog.mjs'), L: await get('coach-live.mjs'),
           V: await get('coach-volume.mjs'), O: await get('coach-overlap.mjs') };
}
const NEW = await stage('now', src);
const OLD = await stage('v54', f => execFileSync('git', ['show', BEFORE + ':' + f], { cwd: ROOT, encoding: 'utf8' }));
const A = NEW.A;
const UI = await import(JSON.parse(real('ui.js')));
const U = await import(JSON.parse(real('units.js')));
const B = await import(JSON.parse(real('blocks.js')));
const { EXERCISES, GROUPS } = await import(JSON.parse(real('exercises.js')));

/* ---------- lifting the real functions out of workout.js and routines.js ---------- */
const WSRC = src('workout.js'), RSRC = src('routines.js');
function liftFrom(SRC, file, name) {
  const m = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm').exec(SRC);
  if (!m) throw new Error('drop-sets: ' + name + '() is gone from ' + file + ' — drop sets or this check are stale');
  return SRC.slice(m.index, SRC.indexOf('\n}\n', m.index) + 2).replace(/^export /, '');
}
const LIFTED = ['collectFrom', 'computeVolume', 'recordGroups', 'unsavedTicks', 'historyRows', 'foldSessionIntoHistory', 'trimHistory',
  'loadMonth', 'watchMonth', 'saveMonth', 'refuseUnread', 'hydrateForWrite', 'finishWorkout', 'runFinish', 'saveEdit',
  'editWorkout', 'tickSet', 'dupSet', 'addSetTo', 'greyFor', 'lastEntry', 'lastTargets',
  'renderExercise', 'renderSet', 'dropAddRow', 'setW', 'e1rm', 'coachExIdx', 'showCoach'];

function makeDb(seed) {
  const tree = clone(seed || {});
  const getAt = p => p.split('/').reduce((o, k) => (o == null ? undefined : o[k]), tree);
  const setAt = (p, value) => {
    const keys = p.split('/');
    const dead = value == null || (typeof value === 'object' && !Object.keys(value).length);
    let node = tree;
    keys.slice(0, -1).forEach(k => { if (node[k] == null || typeof node[k] !== 'object') node[k] = {}; node = node[k]; });
    if (dead) delete node[keys[keys.length - 1]]; else node[keys[keys.length - 1]] = clone(value);
  };
  return { tree: () => clone(tree), getAt, setAt };
}
function harness(o = {}) {
  const db = makeDb(o.seed);
  const S = { writes: [], toasts: [], renders: 0, deletes: [] };
  const stubs = {
    read: async (p, f = null) => { const v = db.getAt(p); return v === undefined ? f : clone(v); },
    readExact: async p => { const v = db.getAt(p); return v === undefined ? null : clone(v); },
    write: async (p, v) => { S.writes.push({ p, v: clone(v) }); db.setAt(p, v); },
    watch: () => () => {}, toast: m => S.toasts.push(String(m)),
    todayKey: (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
    LS: { get: (k, f) => f, set: () => {}, del: () => {} },
    bump: () => {}, confirmSheet: () => {}, releaseWakeLock: () => {}, clearRest: () => {},
    render: () => { S.renders++; }, invalidate: () => {},
    // Rebuilt from the log, the way the real one does: every record folded, oldest first.
    rebuildHistoryFromLog: null,
    refreshCoachSessions: async () => true, allSessions: async () => [],
    detectPRs: A.detectPRs, sessionMilestones: A.sessionMilestones, isWorking: A.isWorking, mergeSessionExercises: A.mergeSessionExercises,
    normalizeBlocks: B.normalizeBlocks, blockOrder: B.blockOrder, wu: () => 'lb',
    keepSets: A.keepSets, setsText: A.setsText, dropHeads: A.dropHeads, retypeSet: A.retypeSet, removeSet: A.removeSet, addDrop: A.addDrop,
    el: UI.el, LIMITS: UI.LIMITS, setNum: UI.setNum, fmtDate: UI.fmtDate, GROUPS,
    fmtSetLoad: U.fmtSetLoad, fmtSetW: U.fmtSetW, unitW: U.unitW, limW: U.limW, wOut: U.wOut, wIn: U.wIn,
    nudgeLine: () => null, openLiveSheet: () => {}, dismissNudge: x => x, noteLiveTick: () => null, startRest: () => {},
    renderPlates: () => UI.el('div', 'plate-strip'),
    // The row, with its swipe's delete kept where a test can reach it.
    swipeToDelete: (row, opts) => { row._delete = opts.onDelete; return row; }
  };
  const NAMES = Object.keys(stubs).filter(k => k !== 'rebuildHistoryFromLog');
  const api = new Function(...NAMES, `
let monthCache = {}, hydrated = new Set(), session = null, summary = null, peek = false, history = {};
let unwatchMonth = null, watchedMk = null, finishing = false, coachNone = null, coachTapped = false;
function collectDone() { return collectFrom(session.exercises); }
function persistSession() {}
function liveOpts() { return {}; }
async function rebuildHistoryFromLog() {
  let h = {};
  Object.keys(monthCache).sort().forEach(mk => Object.keys(monthCache[mk]).sort().forEach(dd =>
    Object.values(monthCache[mk][dd]).sort((a, b) => a.startedAt - b.startedAt)
      .forEach(s => { h = foldSessionIntoHistory(h, mk + '-' + dd, s.exercises); })));
  history = trimHistory(h);
  await write('history', history);
}
${LIFTED.map(n => liftFrom(WSRC, 'workout.js', n)).join('\n')}
return {
  start: s => { session = s; }, get: () => session,
  finish: () => finishWorkout(), edit: () => saveEdit(), open: (rec, mk, dd) => editWorkout(rec, mk, dd),
  draw: i => renderExercise(session.exercises[i], i),
  history: () => history, setHistory: h => { history = h; }, summary: () => summary,
  fold: (h, k, e) => foldSessionIntoHistory(h, k, e), collect: e => collectFrom(e),
  addSet: ex => addSetTo(ex), dup: e => dupSet(e), cache: () => monthCache
};`)(...NAMES.map(k => stubs[k]));
  return { api, db, S };
}

/* The save map out of routines.js — the one statement saveSessionAsRoutine
   builds a routine's exercises with — read by its parentheses and run. */
function routineMap() {
  const head = 'r.exercises = (record.exercises || []).map(';
  const at = RSRC.indexOf(head);
  if (at === -1) throw new Error('drop-sets: routines.js no longer builds r.exercises from record.exercises');
  let depth = 0, j = at + head.length - 1;
  for (; j < RSRC.length; j++) { if (RSRC[j] === '(') depth++; else if (RSRC[j] === ')' && --depth === 0) break; }
  const expr = RSRC.slice(at + 'r.exercises = '.length, j + 1);
  return new Function('record', 'return ' + expr + ';');
}

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const J = v => JSON.stringify(v);
const find = (n, cls) => walk(n).filter(x => x.classList.contains(cls));
const buttonsIn = n => walk(n).filter(x => x.tag === 'button');

/* ================= FIXTURES ================= */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const BENCH = 'barbell-bench-press', FLY = 'dumbbell-flye', PEC = 'pec-deck', CROSS = 'cable-crossover';
const exOf = (exId, sets, extra) => ({ exId, name: LIB[exId].name, group: LIB[exId].group, equipment: LIB[exId].equipment, sets, ...(extra || null) });
// A set as a finished session stores it; `D` a drop set's first set; `P` a drop.
const S_ = (w, r, extra) => ({ w: String(w), r: String(r), type: 'N', done: true, ...(extra || null) });
const D_ = (w, r, extra) => S_(w, r, { type: 'D', ...(extra || null) });
const P_ = (w, r, extra) => S_(w, r, { type: 'D', dp: 1, ...(extra || null) });
const TYPES = sets => sets.map(s => (s.type === 'D' ? (s.dp === 1 ? 'd' : 'D') : s.type)).join('');
// The recap's and the day sheet's own words for one set (workout.js).
const recapOne = (s, inRun) => `${U.fmtSetLoad(s.w, 'lb')}×${s.r}${!inRun && s.type !== 'N' ? s.type : ''}`;
const lastOne = s => `${U.fmtSetLoad(s.w, 'lb')}×${s.r}`;

/* ================= A. WHAT A DROP SET IS ================= */
section('A. what a drop set is — one optional field, and nothing logged before it changes meaning');
{
  const old = [S_(185, 8), D_(135, 6), D_(95, 5)];
  check('a record from before v55 (N, D, D — no dp): each D is a drop set of its own, exactly as it was',
        J(A.dropHeads(old)) === J([null, 1, 2]) && A.dropRuns(old).length === 3 && !A.continuesDrop(old, 2));
  check('and it reads on a line exactly as it did: "185×8   135×6D   95×5D"',
        A.setsText(old, recapOne, '   ') === '185×8   135×6D   95×5D', A.setsText(old, recapOne, '   '));
  const one = [D_(185, 8), P_(135, 6), P_(95, 5)];
  check('the set he changed to a drop set, and two drops under it: one drop set', J(A.dropHeads(one)) === J([0, 0, 0]) &&
        A.dropRuns(one).length === 1 && A.continuesDrop(one, 1) && A.continuesDrop(one, 2) && !A.continuesDrop(one, 0));
  check('which reads as one group: "185×8 → 135×6 → 95×5"', A.setsText(one, recapOne, '   ') === '185×8 → 135×6 → 95×5');
  const two = [D_(185, 8), P_(135, 6), P_(95, 5), D_(185, 7), P_(135, 5)];
  check('two drop sets stacked one after the other: two groups — the second one’s first set carries no dp',
        J(A.dropHeads(two)) === J([0, 0, 0, 3, 3]) && A.dropRuns(two).map(r => r.length).join() === '3,2');
  check('and two groups on a line: "185×8 → 135×6 → 95×5   185×7 → 135×5"',
        A.setsText(two, recapOne, '   ') === '185×8 → 135×6 → 95×5   185×7 → 135×5', A.setsText(two, recapOne, '   '));
  check('the same sets with no dp anywhere cannot be told apart by order and type — every one is a D (why the field exists)',
        J(two.map(s => s.type)) === J(['D', 'D', 'D', 'D', 'D']) && A.dropRuns(two.map(({ dp, ...s }) => s)).length === 5);
  const junk = [S_(185, 8, { dp: 1 }), D_(135, 6, { dp: true }), D_(95, 5, { dp: '1' }), D_(90, 5, { dp: 2 }),
                S_(80, 5, { type: 'W' }), D_(70, 5, { dp: 1 })];
  check('dp read as absent anywhere else: on an N, as true, as "1", as 2, and under a warm-up — no drop at all',
        [1, 2, 3, 5].every(j => !A.continuesDrop(junk, j)) && J(A.dropHeads(junk)) === J([null, 1, 2, 3, null, 5]));
  const first = [D_(135, 6, { dp: 1 }), P_(95, 5)];
  check('a first set carrying dp has nothing above it to continue: it is where its drop set starts',
        J(A.dropHeads(first)) === J([0, 0]));
  const mixed = [S_(185, 8), S_(185, 8), D_(185, 8), P_(135, 6), P_(95, 5), S_(185, 6, { type: 'F' })];
  check('straight sets, a drop set, and a set after it: "185×8  185×8  185×8 → 135×6 → 95×5  185×6F"',
        A.setsText(mixed, recapOne, '  ') === '185×8  185×8  185×8 → 135×6 → 95×5  185×6F', A.setsText(mixed, recapOne, '  '));
  check('junk in, nothing thrown: no list, an empty one', A.dropRuns(null).length === 0 && A.setsText([], recapOne, ' ') === '' &&
        J(A.dropHeads(undefined)) === '[]');
}

/* ================= B. THE EDITS ================= */
section('B. every edit keeps drop sets apart — a type change, "+ Drop", a swipe, and what Finish keeps');
{
  const blank = { w: '', r: '', done: false };
  let s = [S_(185, 8, { done: false })];
  ['W', 'F', 'D'].forEach(t => { s = A.retypeSet(s, 0, t); });
  check('the badge cycled N → W → F → D: the set is a drop set of one, and nothing else changed',
        TYPES(s) === 'D' && s[0].w === '185' && s[0].r === '8' && !('dp' in s[0]));
  s = A.addDrop(s, 0, blank);
  s = A.addDrop(s, 1, blank);
  check('"+ Drop" twice: two drops under it, each dp 1, each with empty boxes', TYPES(s) === 'Ddd' &&
        J(s[1]) === J({ w: '', r: '', done: false, type: 'D', dp: 1 }) && J(A.dropHeads(s)) === J([0, 0, 0]));
  s = s.concat([S_(95, 5, { done: false })]);
  ['W', 'F', 'D'].forEach(t => { s = A.retypeSet(s, 3, t); });
  check('a set right under a drop set, changed to a drop set, starts its own — never joins the one above',
        TYPES(s) === 'DddD' && J(A.dropHeads(s)) === J([0, 0, 0, 3]));
  s = A.addDrop(s, 3, blank);
  s = A.addDrop(s, 0, blank);
  check('"+ Drop" on the first drop set puts the drop after ITS last set, before the second drop set starts',
        TYPES(s) === 'DdddDd' && J(A.dropHeads(s)) === J([0, 0, 0, 0, 4, 4]));
  const gone = A.removeSet(s, 4);
  check('the second drop set’s first set swiped away: its drop becomes a drop set of its own — not stitched to the first',
        TYPES(gone) === 'DdddD' && J(A.dropHeads(gone)) === J([0, 0, 0, 0, 4]) && !('dp' in gone[4]));
  const mid = A.removeSet(s, 2);
  check('a middle drop swiped away: the rest of its drop set is still one', TYPES(mid) === 'DddDd' && J(A.dropHeads(mid)) === J([0, 0, 0, 3, 3]));
  const off = A.retypeSet(s, 0, 'N');
  check('the first drop set’s first set cycled on to N: its drops go on as a drop set of their own',
        TYPES(off) === 'NDddDd' && J(A.dropHeads(off)) === J([null, 1, 1, 1, 4, 4]));
  const split = A.retypeSet(s, 2, 'N');
  check('a middle drop cycled on to N: it leaves, and the drops under it go on as a drop set of their own',
        TYPES(split) === 'DdNDDd' && J(A.dropHeads(split)) === J([0, 0, null, 3, 4, 4]));
  check('the same type again changes nothing, and a set in no drop set gets no drop', A.retypeSet(s, 0, 'D') !== s &&
        J(A.retypeSet(s, 0, 'D')) === J(s) && J(A.addDrop([S_(185, 8)], 0, blank)) === J([S_(185, 8)]));
  const before = clone(s);
  A.retypeSet(s, 0, 'N'); A.removeSet(s, 4); A.addDrop(s, 0, blank); A.keepSets(s, () => false);
  check('nothing is changed in place — each edit hands back a new list', J(s) === J(before));
  const same = A.keepSets(s, () => true);
  check('and a set whose dp is already right is the same object', same.every((x, k) => x === s[k]));

  // What Finish keeps (collectFrom's test) and what the "last time" index keeps (working sets).
  const live = [D_(185, 8), P_(135, 6), P_(95, 5), D_(185, 7, { r: '' }), P_(135, 5), P_(95, 4)];
  const kept = A.keepSets(live, x => x.done && x.r !== '');
  check('the second drop set’s first set left unlogged: what is kept of it is a drop set of its own, not the first one’s',
        TYPES(kept) === 'DddDd' && J(A.dropHeads(kept)) === J([0, 0, 0, 3, 3]) && kept[3].r === '5' && !('dp' in kept[3]));
  const holed = A.keepSets([D_(185, 8), P_(135, 6, { r: '' }), P_(95, 5)], x => x.r !== '');
  check('a middle drop left unlogged: the drop set is still one', TYPES(holed) === 'Dd');
  const warm = A.keepSets([D_(185, 8), S_(95, 10, { type: 'W' }), P_(135, 6)], A.isWorking);
  check('a warm-up between (read as its end) taken out: the drop after it is not stitched back on', TYPES(warm) === 'DD');
}

/* ================= C. ON SCREEN ================= */
section('C. the session screen — drops indented under the set he changed, "+ Drop" under the last, two drop sets two groups');
{
  const h = harness();
  h.api.start({ id: 'wlive', name: 'Push', startedAt: NOW - 1800e3, exercises: [exOf(BENCH, [S_(185, 8, { done: false })])] });
  let blk = h.api.draw(0);
  const rows = () => find(blk, 'set-row');
  const tapBadge = j => { find(rows()[j], 'set-idx')[0].onclick(); blk = h.api.draw(0); };
  const drops = () => buttonsIn(blk).filter(b => b.classList.contains('drop-add'));
  check('an ordinary set: no indent, no "+ Drop"', rows().length === 1 && !rows()[0].classList.contains('drop') && !drops().length);
  tapBadge(0); tapBadge(0); tapBadge(0);
  check('changed to a drop set with three taps: its badge reads D, and "+ Drop" appears under it',
        find(rows()[0], 'set-idx')[0].textContent === 'D' && drops().length === 1 && drops()[0].textContent === '+ Drop' &&
        drops()[0].getAttribute('aria-label') === 'Add a drop to this drop set');
  drops()[0].onclick(); blk = h.api.draw(0);
  drops()[0].onclick(); blk = h.api.draw(0);
  const ex = () => h.api.get().exercises[0];
  check('"+ Drop" twice: two drops, indented under it on their own rows, each with the arrow for a badge and empty boxes',
        rows().length === 3 && !rows()[0].classList.contains('drop') && rows()[1].classList.contains('drop') && rows()[2].classList.contains('drop') &&
        find(rows()[1], 'set-idx')[0].textContent === '↳' && TYPES(ex().sets) === 'Ddd' && ex().sets[1].w === '' && ex().sets[1].r === '');
  check('and one "+ Drop", after the last of them', drops().length === 1 && blk.children.indexOf(drops()[0].parent) > blk.children.indexOf(rows()[2]));
  Object.assign(ex().sets[1], { w: '135', r: '6' }); Object.assign(ex().sets[2], { w: '95', r: '5' });
  h.api.addSet(ex()); blk = h.api.draw(0);
  tapBadge(3); tapBadge(3); tapBadge(3);
  drops()[1].onclick(); blk = h.api.draw(0);
  Object.assign(ex().sets[3], { w: '185', r: '7' }); Object.assign(ex().sets[4], { w: '135', r: '5' });
  blk = h.api.draw(0);
  check('a second drop set made below it: two groups — the second starts back at the left, with its own "+ Drop"',
        TYPES(ex().sets) === 'DddDd' && rows().map(r => r.classList.contains('drop') ? 'i' : '|').join('') === '|ii|i' && drops().length === 2);
  drops()[0].onclick(); blk = h.api.draw(0);
  check('the first drop set’s "+ Drop" adds to IT, above the second', TYPES(ex().sets) === 'DdddDd');
  rows()[3]._delete(); blk = h.api.draw(0);
  check('and the empty drop swiped away: the two groups as they were', TYPES(ex().sets) === 'DddDd');

  // The "Last ·" line, off the "last time" index.
  h.api.setHistory({ [BENCH]: [{ date: '2026-09-20', sets: [D_(185, 8), P_(135, 6), P_(95, 5), D_(185, 7), P_(135, 5)].map(({ done, ...x }) => x) }] });
  blk = h.api.draw(0);
  const prev = (find(blk, 'ex-prev')[0] || {}).textContent;
  check('the "Last ·" line reads a drop set as one group: "185×8 → 135×6 → 95×5  185×7 → 135×5"',
        prev === 'Last · ' + UI.fmtDate('2026-09-20') + '   185×8 → 135×6 → 95×5  185×7 → 135×5', prev);
  h.api.setHistory({ [BENCH]: [{ date: '2026-09-20', sets: [{ w: '185', r: '8', type: 'N' }, { w: '135', r: '6', type: 'D' }] }] });
  blk = h.api.draw(0);
  check('an index entry from before v55 reads exactly as it did: "185×8  135×6"',
        (find(blk, 'ex-prev')[0] || {}).textContent === 'Last · ' + UI.fmtDate('2026-09-20') + '   185×8  135×6');
  check('the recap and the day sheet draw their sets through the same setsText, with the type letter outside a group',
        (WSRC.match(/setsText\(ex\.sets, \(s, inRun\) => `\$\{fmtSetLoad\(s\.w, u\)\}×\$\{s\.r\}\$\{!inRun && s\.type !== 'N' \? s\.type : ''\}`, '   '\)/g) || []).length === 1 &&
        /setsText\(keepSets\(ex\.sets, s => s\.done !== false\),\n\s+\(s, inRun\) => `\$\{fmtSetLoad\(s\.w \|\| 0, wu\(\)\)\}×\$\{s\.r \|\| 0\}\$\{!inRun && s\.type !== 'N' \? s\.type : ''\}`, '   '\)/.test(WSRC));
  const css = src('rack.css');
  check('rack.css draws the indent, the rail and "+ Drop" — the indent moves the badge only, so no box is narrower',
        /\.set-row\.drop \.set-idx \{ margin-left: 10px; \}/.test(css) && !/\.set-row\.drop \{[^}]*padding/.test(css) &&
        /\.set-row\.drop::before \{/.test(css) && /\.drop-add-row \{/.test(css) && /\.drop-add \{/.test(css));
}

/* ================= D. FINISH, AND AN EDIT ================= */
section('D. it survives — Finish writes dp on the set, the index carries it, open → save → open changes nothing');
let stored, mk, dd;
{
  const h = harness();
  const startedAt = NOW - 3 * 3600e3;
  h.api.start({ id: 'wd1', name: 'Push', startedAt, exercises: [
    exOf(BENCH, [S_(185, 8), S_(185, 8), D_(185, 8), P_(135, 6), P_(95, 5), D_(185, 7), P_(135, 5)]),
    exOf(FLY, [S_(40, 12), D_(40, 12), P_(25, 9)])] });
  await h.api.finish();
  const dateK = key(startedAt);
  mk = dateK.slice(0, 7); dd = dateK.slice(8, 10);
  stored = h.db.getAt(`workouts/${mk}/${dd}/wd1`);
  check('Finish writes each drop’s dp: 1 on its set, the first set of each drop set without one',
        !!stored && TYPES(stored.exercises[0].sets) === 'NNDddDd' && TYPES(stored.exercises[1].sets) === 'NDd' &&
        stored.exercises[0].sets[3].dp === 1 && typeof stored.exercises[0].sets[3].dp === 'number', J(stored && stored.exercises));
  check('in the one whole write — no child write, no new node',
        h.S.writes.filter(w => w.p.startsWith('workouts/')).length === 1 && !h.S.writes.some(w => /\/dp$|\/sets\//.test(w.p)));
  const idx = (h.db.getAt('history') || {})[BENCH];
  check('the "last time" index carries dp, so the next "Last ·" line can draw the groups',
        !!idx && TYPES(idx[0].sets) === 'NNDddDd' && A.setsText(idx[0].sets, lastOne, '  ') === '185×8  185×8  185×8 → 135×6 → 95×5  185×7 → 135×5',
        J(idx));
  check('and the index is w, r, type and dp only — a rating stays on the record', idx[0].sets.every(x => Object.keys(x).every(k => ['w', 'r', 'type', 'dp'].includes(k))));
  h.api.open(clone(stored), mk, dd);
  const opened = h.api.get();
  check('opening it for an edit carries each dp onto its set, exactly as stored',
        J(opened.exercises.map(e => TYPES(e.sets))) === J(['NNDddDd', 'NDd']));
  await h.api.edit();
  const saved = h.db.getAt(`workouts/${mk}/${dd}/wd1`);
  check('saved unchanged: every set, every dp, the record’s sets byte for byte',
        J(saved.exercises.map(e => e.sets)) === J(stored.exercises.map(e => e.sets)), J(saved.exercises.map(e => e.sets)));
  h.api.open(clone(saved), mk, dd);
  check('and opened again: the same — open → save → open is a no-op for a drop set',
        J(h.api.get().exercises.map(e => e.sets)) === J(opened.exercises.map(e => e.sets)));
  check('the index rebuilt from the log after the edit still reads the groups',
        A.setsText(h.api.history()[BENCH][0].sets, lastOne, '  ') === '185×8  185×8  185×8 → 135×6 → 95×5  185×7 → 135×5');
  // An old record: D rows, no dp. Opened and saved, it gains none.
  const old = { id: 'wold', name: 'Old', startedAt: NOW - 9 * DAY, endedAt: NOW - 9 * DAY + 3600e3, durationSec: 3600, volume: 1, groups: ['chest'],
                exercises: [exOf(BENCH, [{ w: '185', r: '8', type: 'N' }, { w: '135', r: '6', type: 'D' }, { w: '95', r: '5', type: 'D' }])] };
  const ok = key(old.startedAt);
  const h2 = harness({ seed: { workouts: { [ok.slice(0, 7)]: { [ok.slice(8, 10)]: { wold: old } } } } });
  await h2.api.open(clone(old), ok.slice(0, 7), ok.slice(8, 10));
  await h2.api.edit();
  const back = h2.db.getAt(`workouts/${ok.slice(0, 7)}/${ok.slice(8, 10)}/wold`);
  check('a record from before v55, opened and saved: no dp anywhere — nothing migrates, and each D is still its own',
        !!back && back.exercises[0].sets.every(z => !('dp' in z)) && TYPES(back.exercises[0].sets) === 'NDD', J(back && back.exercises));
  // Finish with a drop set's first set left unlogged.
  const h3 = harness();
  h3.api.start({ id: 'wd3', name: 'Push', startedAt, exercises: [exOf(BENCH, [D_(185, 8), P_(135, 6), D_(185, 7, { done: false }), P_(135, 5), P_(95, 4)])] });
  await h3.api.finish();
  const r3 = h3.db.getAt(`workouts/${mk}/${dd}/wd3`);
  check('Finish with the second drop set’s first set unticked: its drops are saved as a drop set of their own, not the first one’s',
        !!r3 && TYPES(r3.exercises[0].sets) === 'DdDd' && J(A.dropHeads(r3.exercises[0].sets)) === J([0, 0, 2, 2]), J(r3 && r3.exercises));
}

/* ================= E. THE COPIES ================= */
section('E. every copy keeps the grouping — a duplicated block, a routine saved and started, the routine editor, the builder');
{
  const h = harness();
  const sets = [S_(185, 8), D_(185, 8), P_(135, 6, { rir: 0 }), P_(95, 5)];
  const d = h.api.dup(false);
  check('dupSet: a drop’s dp comes across — what the set is — and never its rating',
        J(sets.map(d)) === J([{ w: '185', r: '8', type: 'N', done: false }, { w: '185', r: '8', type: 'D', done: false },
                              { w: '135', r: '6', type: 'D', done: false, dp: 1 }, { w: '95', r: '5', type: 'D', done: false, dp: 1 }]));
  const blk = B.duplicateBlock({ exercises: [{ ...exOf(BENCH, sets), block: 1 }], blocks: [1] }, 1, { copySet: d });
  check('a block duplicated on the workout screen: the copy is one drop set, like the original', TYPES(blk.exercises[1].sets) === 'NDdd');
  const rblk = B.duplicateBlock({ exercises: [{ ...exOf(BENCH, [{ tw: '185', tr: '8', type: 'D' }, { tw: '135', tr: '6', type: 'D', dp: 1 }]), block: 1 }], blocks: [1] }, 1);
  check('and in the routine editor, which copies a set whole', TYPES(rblk.exercises[1].sets) === 'Dd');
  const record = { name: 'Push', exercises: [exOf(BENCH, [S_(185, 8), D_(185, 8), P_(135, 6), P_(95, 5)].map(({ done, ...x }) => x))] };
  const saved = routineMap()(record);
  check('saved as a routine: { tw, tr, type } and a drop’s dp — the drop set kept whole',
        J(saved[0].sets) === J([{ tw: '185', tr: '8', type: 'N' }, { tw: '185', tr: '8', type: 'D' },
                                { tw: '135', tr: '6', type: 'D', dp: 1 }, { tw: '95', tr: '5', type: 'D', dp: 1 }]));
  const toSession = new Function(liftFrom(RSRC, 'routines.js', 'toSession') + '\nreturn toSession;')();
  const started = toSession({ name: 'Push', exercises: saved.map(e => ({ ...e })) });
  check('and started: the same grouping in the live session, grey targets and all',
        TYPES(started.exercises[0].sets) === 'NDdd' && started.exercises[0].sets[2].tw === '135' && started.exercises[0].sets[2].w === '');
  check('the routine editor’s badge and swipe go through the same edits as the workout screen’s',
        /ex\.sets = retypeSet\(ex\.sets, si, order\[/.test(RSRC) && /onDelete: \(\) => \{ ex\.sets = removeSet\(ex\.sets, si\); paint\(\); \}/.test(RSRC) &&
        /import \{ retypeSet, removeSet \} from '\.\/analytics\.js';/.test(RSRC));
  // The builder, from a log whose last push day had a drop set at its end.
  const sess = (id, ago, w) => ({ id, startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY), exercises: [
    exOf(BENCH, [S_(w, 8), S_(w, 8), S_(w, 8), D_(w, 8), P_(w - 50, 6), P_(w - 90, 5)]),
    exOf('triceps-pushdown-rope', [S_(50, 12), S_(50, 12)])] });
  const log = [];
  for (let k = 0; k < 8; k++) log.push(sess('b' + k, 3 + 7 * (7 - k), 165 + 5 * k));
  const inp = { now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions: log, lib: LIB, hidden: [], libReady: true,
    routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null, summaries: {}, steps: { days: {} }, weighIns: [],
    weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
    settings: { v: 1, mute: {}, answers: {}, asked: {} } };
  const p = NEW.C.coach(inp).build({});
  const views = p ? ['placeholders', 'lastNumbers', 'targets', 'record'].filter(v => p[v]) : [];
  const benchOf = v => p[v].exercises.find(e => e.exId === BENCH);
  check('the builder’s proposal — ' + views.join(', ') + ' — keeps the drop set as he did it, in every view',
        views.length === 4 && views.every(v => TYPES(benchOf(v).sets) === 'NNNDdd'), views.map(v => v + ' ' + TYPES(benchOf(v).sets)).join(', '));
}

/* ================= F. WHAT THE ENGINES COUNT ================= */
section('F1. a D counts for exactly what it did — with dp or without it, every count is the same');
{
  const withDp = [S_(185, 8), S_(185, 8), D_(185, 8), P_(135, 6), P_(95, 5)];
  const noDp = withDp.map(({ dp, ...s }) => s);
  const ex = sets => exOf(BENCH, sets);
  check('working sets, volume and the best set (analytics.js): the same', withDp.filter(A.isWorking).length === 5 &&
        A.exerciseVolume(ex(withDp)) === A.exerciseVolume(ex(noDp)) && J(A.bestSet(ex(withDp))) === J(A.bestSet(ex(noDp))) &&
        A.exerciseVolume(ex(withDp)) === 185 * 8 * 3 + 135 * 6 + 95 * 5);
  check('hard sets (coach-volume.js): the same — five, a D is a hard set', NEW.V.hardSets(withDp).length === 5 && NEW.V.hardSets(noDp).length === 5);
  const log = (dp) => Array.from({ length: 8 }, (_, k) => ({ id: 'p' + k, startedAt: NOW - (3 + 7 * (7 - k)) * DAY, _date: key(NOW - (3 + 7 * (7 - k)) * DAY),
    exercises: [ex([S_(165 + 5 * k, 8), S_(165 + 5 * k, 8), D_(165 + 5 * k, 8), P_(115 + 5 * k, 6), P_(75 + 5 * k, 5)].map(s => (dp ? s : (({ dp: _, ...x }) => x)(s))))] }));
  const lift = sessions => ({ exId: BENCH, name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell', exposures: NEW.P.exposuresFor(sessions, BENCH) });
  const t1 = NEW.P.targetFor(lift(log(true)), { now: NOW, u: 'lb' }, null), t0 = NEW.P.targetFor(lift(log(false)), { now: NOW, u: 'lb' }, null);
  const strip = t => ({ ...t, sets: (t.sets || []).map(({ dp, ...s }) => s) });
  check('Coach’s target (coach-prog.js): the same line, mode and load — the drops never carry the load',
        !!t1 && t1.line === t0.line && t1.mode === t0.mode && t1.loadLb === t0.loadLb && J(strip(t1)) === J(strip(t0)), t1 && t1.line);
  check('and the target’s own sets keep the drop set whole for the builder: dp on the two drops', !!t1 && TYPES(t1.sets) === 'NNDdd');
  const inp = sessions => ({ now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions, lib: LIB, hidden: [], libReady: true,
    routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null, summaries: {}, steps: { days: {} }, weighIns: [],
    weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null }, settings: { v: 1, mute: {}, answers: {}, asked: {} } });
  const shaped = sessions => NEW.C.overlapInput(inp(sessions)).shaped.map(s => ({ sets: s.sets, lsets: s.lsets, lfsets: s.lfsets, ldrop: s.ldrop }));
  check('the shaped sessions every Coach read is handed (coach.js): the same sets, lifting sets, failures and rep drops',
        J(shaped(log(true))) === J(shaped(log(false))));
  check('the weekly volume read (coach-volume.js): the same, row for row',
        J(NEW.V.volumeRead(NEW.C.volumeInput(inp(log(true))))) === J(NEW.V.volumeRead(NEW.C.volumeInput(inp(log(false))))));
}

section('F2. the one read that was wrong: a drop set’s falling reps read as fatigue — rack-v54 (before) beside today (after)');
{
  // The live read, mid-session: two exercises each ending in a drop set.
  const liveIn = sessionEx => ({ session: { id: 'wl', startedAt: NOW - 1800e3, exercises: sessionEx }, lib: LIB, sessions: [], shapes: [],
                                 hidden: [], u: 'lb', day: key(NOW), current: null });
  const dropDay = [exOf(BENCH, [S_(185, 8), D_(185, 8), P_(135, 6)]), exOf(FLY, [S_(40, 12), D_(40, 12), P_(25, 9)])];
  const was = OLD.L.liveRead(liveIn(dropDay)), now = NEW.L.liveRead(liveIn(dropDay));
  check('the live read after two drop sets — before: "' + (was && was.text) + '"',
        !!was && was.kind === 'done' && was.text === 'You’re probably good for today — Barbell Bench Press, reps from 8 to 6 at the same or a lighter weight; Dumbbell Flye, reps from 12 to 9 at the same or a lighter weight.',
        J(was));
  check('after: nothing — a drop set is not a sign he is done', now === null, J(now));
  const tiredDay = [exOf(BENCH, [S_(185, 8), S_(185, 6)]), exOf(FLY, [S_(40, 12), S_(40, 9)])];
  check('reps that really fell on straight sets: the same answer before and after, "You’re probably good for today — …"',
        J(OLD.L.liveRead(liveIn(tiredDay))) === J(NEW.L.liveRead(liveIn(tiredDay))) && NEW.L.liveRead(liveIn(tiredDay)).kind === 'done');
  const mixDay = [exOf(BENCH, [S_(185, 8), D_(185, 8), P_(135, 6), S_(185, 6)]), exOf(FLY, [S_(40, 12), S_(40, 9)])];
  check('and a straight set after a drop set that fell a quarter is still read — the drop set is left out, not the day',
        !!NEW.L.liveRead(liveIn(mixDay)) && NEW.L.liveRead(liveIn(mixDay)).kind === 'done' && /Barbell Bench Press, reps from 8 to 6/.test(NEW.L.liveRead(liveIn(mixDay)).text));

  // The next set (coach-prog.js nextSet): bench on a target of 190 × 8.
  const blog = [170, 175, 175, 180, 180, 185, 185, 185].map((w, k) => ({ id: 'e' + k, startedAt: NOW - (3 + 7 * (7 - k)) * DAY,
    _date: key(NOW - (3 + 7 * (7 - k)) * DAY), exercises: [exOf(BENCH, [S_(w, 8), S_(w, 8), S_(w, 8)])] }));
  const nx = (E, today) => E.P.nextSet({ exId: BENCH, name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell', exposures: E.P.exposuresFor(blog, BENCH) },
                                       { now: NOW, u: 'lb', repDrop: E.L.REP_DROP }, today);
  const dropNext = [S_(190, 8), D_(190, 8), P_(140, 6)];
  const nb = nx(OLD, dropNext), na = nx(NEW, dropNext);
  check('the next set after a drop set — before: "' + (nb && nb.kind) + '", "' + (nb && nb.why[0]) + '"',
        !!nb && nb.kind === 'stop' && nb.why[0] === 'Your reps went from 8 to 6 at the same or a lighter weight today.', J(nb));
  check('after: "' + (na && na.text) + '" — read off the straight sets, as the target is', !!na && na.kind === 'same' && na.text === 'Next set: 190 lb × 8.', J(na));
  const realNext = [S_(190, 8), S_(190, 6)];
  check('reps that really fell: "stop" before and after, the same words', J(nx(OLD, realNext)) === J(nx(NEW, realNext)) && nx(NEW, realNext).kind === 'stop');

  // The weekly volume read (coach-volume.js): 14 chest sets against 10, the only sign two drop sets.
  const S2 = (w, r, type, dp) => ({ w: String(w), r: String(r), type: type || 'N', done: true, ...(dp ? { dp: 1 } : null) });
  const wk = f => Array.from({ length: 9 }, (_, k) => ({ id: 'v' + k, startedAt: NOW - (7 * k + 2) * DAY, _date: key(NOW - (7 * k + 2) * DAY), exercises: f(k) }));
  const vin = sessions => ({ now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions, lib: LIB, hidden: [], libReady: true,
    routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null, summaries: {}, steps: { days: {} }, weighIns: [],
    weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null }, settings: { v: 1, mute: {}, answers: {}, asked: {} } });
  const ten = () => [exOf(PEC, Array.from({ length: 10 }, () => S2(100, 10)))];
  const dropWeek = wk(k => (k === 0
    ? [exOf(BENCH, [S2(185, 10), S2(185, 10, 'D'), S2(135, 7, 'D', true), S2(185, 10)]), exOf(PEC, [S2(100, 10), S2(100, 10, 'D'), S2(70, 7, 'D', true), S2(100, 10)]),
       exOf(CROSS, Array.from({ length: 6 }, () => S2(40, 12)))]
    : ten()));
  const chest = (E, s) => (E.V.volumeRead(E.C.volumeInput(vin(s))).groups || []).find(g => g.group === 'chest');
  const vb = chest(OLD, dropWeek), va = chest(NEW, dropWeek);
  check('the weekly volume read with two drop sets in it — before: 14 hard sets, "' + (vb && vb.flag) + '", ' + J(vb && vb.why),
        !!vb && vb.sets === 14 && vb.flag === 'more' && J(vb.why) === J({ drops: 2 }), J(vb));
  check('after: 14 hard sets — the same count — and "' + (va && va.flag) + '": volume alone is never too much',
        !!va && va.sets === 14 && va.flag === 'right', J(va));
  const f6 = wk(k => (k === 0
    ? [exOf(BENCH, [S2(185, 10), S2(185, 7), S2(185, 10), S2(185, 10)]), exOf(PEC, [S2(100, 10), S2(100, 7), S2(100, 10), S2(100, 10)]),
       exOf(CROSS, Array.from({ length: 6 }, () => S2(40, 12)))]
    : ten()));
  check('coach-volume.mjs’s own F6 — reps that really fell on 2 lifts: the same read before and after, "more"',
        J(chest(OLD, f6)) === J(chest(NEW, f6)) && chest(NEW, f6).flag === 'more');

  // The shaped sessions' rep drops (coach.js) — what the recovery windows read for a big day.
  const ld = (E, s) => E.C.overlapInput(vin(s)).shaped.map(x => x.ldrop.chest || 0);
  check('the rep drops a session is shaped with (coach.js) — before: the drop set week counts ' + ld(OLD, dropWeek)[ld(OLD, dropWeek).length - 1] +
        ' lifts, after: ' + ld(NEW, dropWeek)[ld(NEW, dropWeek).length - 1],
        ld(OLD, dropWeek)[ld(OLD, dropWeek).length - 1] === 2 && ld(NEW, dropWeek)[ld(NEW, dropWeek).length - 1] === 0);
  check('and every other count on them the same: sets, lifting sets and failures, session by session',
        J(OLD.C.overlapInput(vin(dropWeek)).shaped.map(x => [x.sets, x.lsets, x.lfsets])) ===
        J(NEW.C.overlapInput(vin(dropWeek)).shaped.map(x => [x.sets, x.lsets, x.lfsets])));
  check('coach-volume.mjs’s F6 shaped the same before and after', J(ld(OLD, f6)) === J(ld(NEW, f6)));

  // A record day (coach-overlap.js): bench climbing to 3×5 at 225, the last session ending in a drop set.
  const days = []; for (let ago = 3, g = 0; ago <= 3 + 6 * 7 - 1; ago += [3, 4][g++ % 2]) days.push(ago);
  days.reverse();
  const rec = (tail) => vin(days.map((ago, k) => {
    const w = 225 - 2.5 * (days.length - 1 - k);
    const t = new Date(NOW - ago * DAY); t.setHours(18, 0, 0, 0);
    const sets = [S2(w, 5), S2(w, 5), S2(w, 5)].concat(k === days.length - 1 ? tail : []);
    return { id: 'r' + k, startedAt: t.getTime(), _date: key(t.getTime()), exercises: [exOf(BENCH, sets)] };
  }));
  const day = (E, i) => E.O.recordDay(E.C.overlapInput(i), NOW);
  const dropTail = rec([S2(225, 5, 'D'), S2(165, 3, 'D', true)]);
  const rb = day(OLD, dropTail), ra = day(NEW, dropTail);
  check('"Good day for a record?" after a session ending in a drop set — before: nothing (' + J(rb) + ')', rb === null);
  check('after: "' + (ra && ra.text) + '"', !!ra && /^Good day for 6 at 225 lb on Barbell Bench Press/.test(ra.text));
  const realTail = rec([S2(225, 3)]);
  check('a straight set that fell a quarter: nothing, before and after', day(OLD, realTail) === null && day(NEW, realTail) === null);
  check('no drop set, no tail: the same record day before and after', J(day(OLD, rec([]))) === J(day(NEW, rec([]))) && !!day(NEW, rec([])));

  // A sweep: logs with no drop set in them read the same in both, every read above.
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  let same = 0, diff = [];
  for (let n = 0; n < 60; n++) {
    const sessions = Array.from({ length: 6 + Math.floor(rnd() * 8) }, (_, k) => {
      const ago = 2 + k * (2 + Math.floor(rnd() * 4));
      const t = new Date(NOW - ago * DAY); t.setHours(18, 0, 0, 0);
      const mk = id => exOf(id, Array.from({ length: 2 + Math.floor(rnd() * 4) }, (_, j) =>
        S2(Math.round((100 + rnd() * 100) / 5) * 5, 3 + Math.floor(rnd() * 10), j === 0 && rnd() < 0.2 ? 'W' : rnd() < 0.15 ? 'F' : 'N')));
      return { id: 'x' + n + '_' + k, startedAt: t.getTime(), _date: key(t.getTime()), exercises: [mk(BENCH), mk(PEC)].slice(0, 1 + Math.floor(rnd() * 2)) };
    });
    const i = vin(sessions);
    const a = J([OLD.V.volumeRead(OLD.C.volumeInput(i)), OLD.C.overlapInput(i).shaped.map(x => x.ldrop), day(OLD, i)]);
    const b = J([NEW.V.volumeRead(NEW.C.volumeInput(i)), NEW.C.overlapInput(i).shaped.map(x => x.ldrop), day(NEW, i)]);
    if (a === b) same++; else diff.push(n);
  }
  check('60 generated logs with no drop set: the volume read, the rep drops and the record day are rack-v54’s exactly (' + same + ' of 60)',
        same === 60, diff.join(', '));
}

section('F3. the live chips rate a drop set on the set he changed, never on a drop');
{
  const log = [170, 175, 175, 180, 180, 185, 185, 185].map((w, k) => ({ id: 'e' + k, startedAt: NOW - (3 + 7 * (7 - k)) * DAY,
    _date: key(NOW - (3 + 7 * (7 - k)) * DAY), exercises: [exOf(BENCH, [S_(w, 8), S_(w, 8), S_(w, 8)])] }));
  const INPUT = { now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions: log, lib: LIB, hidden: [], libReady: true,
    routines: [], live: { active: true }, tier: { pro: true }, targets: null, targetsSet: null, summaries: {}, steps: { days: {} }, weighIns: [],
    weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
    settings: { v: 1, mute: {}, answers: {}, asked: {} } };
  const live = sets => ({ id: 'wlive', name: 'Live', startedAt: NOW - 1800e3, exercises: [exOf(BENCH, sets)] });
  const ask = (E, s) => { const r = E.C.coach(INPUT).liveSet(s, { current: 0 }); return r && r.rated ? E.C.rateAsk(r.rated, 'lb') : null; };
  const sd = live([S_(190, 8), D_(190, 8), P_(140, 6), P_(100, 5)]);
  check('the last ticked set a drop — before, the chips asked of the drop: "' + ask(OLD, sd) + '"', ask(OLD, sd) === 'Set 4 · 100 lb × 5. How was it?');
  check('after, of the drop set, on the set he changed: "' + ask(NEW, sd) + '"', ask(NEW, sd) === 'Set 2 · 190 lb × 8. How was it?');
  const plain = live([S_(190, 8), S_(190, 8)]);
  check('no drop set: the same set asked about, before and after', ask(OLD, plain) === ask(NEW, plain) && ask(NEW, plain) === 'Set 2 · 190 lb × 8. How was it?');
  const oldD = live([S_(190, 8), D_(140, 6)]);
  check('a D with no dp (every one before v55) is a drop set of its own: rated as it always was', ask(OLD, oldD) === ask(NEW, oldD) &&
        ask(NEW, oldD) === 'Set 2 · 140 lb × 6. How was it?');
  const r = NEW.C.coach(INPUT).liveSet(live([S_(190, 8), D_(190, 8), P_(140, 6)]), { current: 0 });
  check('the rating lands on the drop set’s first set — a working set, and one every reader of a rating can find',
        !!r && r.rated.setIdx === 1 && r.rated.exIdx === 0);
}

console.log('\ndrop sets you can read: one optional field, kept apart by every edit, and counted as they were\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
