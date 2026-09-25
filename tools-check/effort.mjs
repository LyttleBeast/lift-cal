#!/usr/bin/env node
//
// Verifier for the effort tap — his rating of a set, `rir` (v54).
//
//   node tools-check/effort.mjs
//
// Micah, 24 Sep 2026: "imagine I do a set it told me to and it was way too
// easy, I could click on the in-lift Coach button and there's a button like,
// that set was way too easy, and it could try to adjust accordingly." Decided
// 25 Sep (SHIP-V54-PROMPT §3.1–§3.5). What has to hold:
//
//   IT IS STORED, AND IT SURVIVES.  `rir` is an integer on the set — way too
//        easy 4, about right 2, too hard 0 — in the live session, and in the
//        record Finish writes WHOLE: no child write, no new node. An edit
//        carries it (the trap v53 met with `feel`: saveEdit rebuilds the
//        record, and editWorkout builds the sets it rebuilds from), so open →
//        save → open keeps every one, moved to another day or not. The "last
//        time" index does not carry it — nothing that reads the index reads a
//        rating.
//   IT IS OF A SET THAT WAS DONE.  Unticking deletes it. A copied set never
//        carries one: a duplicated block, "+ Set", a routine and the builder
//        all build theirs fresh. An old record has none and gains none.
//   IT LIVES IN THE LIVE SHEET, ON THE LIVE CHIP'S GATE.  Three chips under
//        "Set 3 · 185 lb × 8. How was it?", only in a live session and only
//        when the exercise in hand has a ticked working set; Pro and "In the
//        gym" on, never an edit. A tap is an edit to the live session through
//        the callback workout.js hands the sheet; the chosen chip reads as
//        chosen; tapped again it clears. Nothing pops up.
//   "USE IT FOR MY NEXT SET" WRITES THE GREY TARGETS AND NOTHING ELSE.  tw/tr
//        on the next unticked set of that exercise, or one new set carrying
//        them — never `w` or `r`, so a box he typed into keeps what he typed.
//
// WHAT THIS RUNS. runFinish(), saveEdit(), editWorkout(), the month
// functions, tickSet(), rateSet(), useNext(), the two live callbacks,
// dupSet() and "+ Set" are lifted verbatim out of ../workout.js — as feel.mjs
// lifts them — against a model of RTDB's set(); routines.js's toSession() the
// same way; the builder through the real coach.js; and coach-ui.js's live
// sheet against a DOM shim, with the real engine behind it.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/* ================= THE FAKE DOCUMENT ================= */
function mkEl(tag) {
  const n = {
    tag, className: '', textContent: '', innerHTML: '', value: '', placeholder: '',
    children: [], parent: null, attrs: {}, style: {}, dataset: {}, disabled: false, onclick: null, scrollTop: 0, scrollHeight: 0,
    classList: {
      add(...cs) { cs.forEach(c => { if (!n.classList.contains(c)) n.className = (n.className + ' ' + c).trim(); }); },
      remove(...cs) { n.className = n.className.split(' ').filter(x => x && !cs.includes(x)).join(' '); },
      toggle(c, on) { (on === undefined ? !n.classList.contains(c) : on) ? n.classList.add(c) : n.classList.remove(c); },
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
   The Coach stack against a stubbed store (feel.mjs's staging), then
   coach-ui.js on top of it and on a generated coach-data stub, whose export
   list is read out of coach-ui.js's own import line (coach-surface.mjs's). */
const dir = mkdtempSync(join(tmpdir(), 'rack-effort-'));
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
const COACH_DEPS = ['coach-prog', 'coach-overlap', 'coach-fuel', 'coach-ready', 'coach-build', 'coach-live'];
COACH_DEPS.concat(['coach']).forEach(name => writeFileSync(join(dir, name + '.mjs'), src(name + '.js')
  .replace(/from '\.\/([\w-]+)\.js'/g, (w, n) => 'from ' + (n === 'analytics' || COACH_DEPS.includes(n) || n === 'coach'
    ? at(n + '.mjs') : real(n + '.js')))));
const UI_SRC = src('coach-ui.js');
const IMPORTED = (UI_SRC.match(/import\s*\{([^}]*)\}\s*from\s*'\.\/coach-data\.js'/) || [, ''])[1]
  .split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
writeFileSync(join(dir, 'coach-data-stub.mjs'),
  IMPORTED.map(n => `export function ${n}(...a) { return globalThis.__coachData('${n}', a); }`).join('\n') + '\n');
writeFileSync(join(dir, 'coach-ui.mjs'), UI_SRC
  .replace(/from '\.\/([\w-]+)\.js'/g, (w, n) => 'from ' + (n === 'coach' ? at('coach.mjs') : n === 'coach-data' ? at('coach-data-stub.mjs') : real(n + '.js'))));

const A = await import(JSON.parse(at('analytics.mjs')));
const C = await import(JSON.parse(at('coach.mjs')));
const B = await import(JSON.parse(real('blocks.js')));
const UI = await import(JSON.parse(real('ui.js')));
const U = await import(JSON.parse(real('units.js')));
const { EXERCISES } = await import(JSON.parse(real('exercises.js')));

/* ---------- lifting the real functions out of workout.js ---------- */
const WSRC = src('workout.js');
function liftFrom(SRC, file, name) {
  const m = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm').exec(SRC);
  if (!m) throw new Error('effort: ' + name + '() is gone from ' + file + ' — the effort tap or this check is stale');
  return SRC.slice(m.index, SRC.indexOf('\n}\n', m.index) + 2).replace(/^export /, '');
}
const lift = name => liftFrom(WSRC, 'workout.js', name);
const LIFTED = ['collectFrom', 'computeVolume', 'recordGroups', 'unsavedTicks', 'historyRows', 'foldSessionIntoHistory', 'trimHistory',
  'loadMonth', 'watchMonth', 'saveMonth', 'refuseUnread', 'hydrateForWrite', 'deleteSession', 'finishWorkout', 'runFinish', 'saveEdit',
  'editWorkout', 'tickSet', 'rateSet', 'useNext', 'rateLive', 'useNextLive', 'dupSet', 'addSetTo', 'greyFor', 'lastEntry', 'lastTargets'];

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
  const S = { writes: [], toasts: [], renders: 0 };
  const stubs = {
    read: async (p, f = null) => { const v = db.getAt(p); return v === undefined ? f : clone(v); },
    readExact: async p => { const v = db.getAt(p); return v === undefined ? null : clone(v); },
    write: async (p, v) => { S.writes.push({ p, v: clone(v) }); db.setAt(p, v); },
    watch: () => () => {}, toast: m => S.toasts.push(String(m)),
    todayKey: (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
    LS: { get: (k, f) => f, set: () => {}, del: () => {} },
    bump: () => {}, confirmSheet: () => {}, releaseWakeLock: () => {}, clearRest: () => {},
    render: () => { S.renders++; }, invalidate: () => {}, rebuildHistoryFromLog: async () => {},
    refreshCoachSessions: async () => true, allSessions: async () => [],
    detectPRs: A.detectPRs, sessionMilestones: A.sessionMilestones, isWorking: A.isWorking, mergeSessionExercises: A.mergeSessionExercises,
    normalizeBlocks: B.normalizeBlocks, blockOrder: B.blockOrder, wu: () => 'lb'
  };
  const NAMES = Object.keys(stubs);
  const api = new Function(...NAMES, `
let monthCache = {}, hydrated = new Set(), session = null, summary = null, peek = false, history = {};
let unwatchMonth = null, watchedMk = null, finishing = false;
function collectDone() { return collectFrom(session.exercises); }
function persistSession() {}
${LIFTED.map(lift).join('\n')}
return {
  start: s => { session = s; }, get: () => session,
  finish: () => finishWorkout(), edit: () => saveEdit(), open: (rec, mk, dd) => editWorkout(rec, mk, dd),
  rate: (at, v) => rateLive(at, v), useNext: (at, t) => useNextLive(at, t),
  fold: (h, k, e) => foldSessionIntoHistory(h, k, e),
  addSet: ex => addSetTo(ex), dup: e => dupSet(e), cache: () => monthCache, setHistory: h => { history = h; }
};`)(...NAMES.map(k => stubs[k]));
  return { api, db, S };
}
const W = harness();   // for the pure ones
const pure = new Function('isWorking', [lift('tickSet'), lift('rateSet'), lift('useNext')].join('\n') +
  '\nreturn { tickSet, rateSet, useNext };')(A.isWorking);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const J = v => JSON.stringify(v);
const flush = () => new Promise(r => setTimeout(r, 0));
const find = (n, cls) => walk(n).filter(x => x.classList.contains(cls));
const buttonsIn = n => walk(n).filter(x => x.tag === 'button');
const list = xs => xs.slice(0, 6).join(' | ') + (xs.length > 6 ? ' … (' + xs.length + ')' : '');

/* ================= FIXTURES ================= */
const DAY = 864e5;
const NOW = Date.now();
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const exOf = (exId, sets, extra) => ({ exId, name: LIB[exId].name, group: LIB[exId].group, equipment: LIB[exId].equipment, sets, ...(extra || null) });
const S_ = (w, r, extra) => ({ w: String(w), r: String(r), type: 'N', done: true, ...(extra || null) });

/* ================= A. THE DATA PATH ================= */
section('A. tick, rate, Finish: the record carries `rir` — an integer on the set, in the one whole write');
let stored, mk, dd, h;
{
  h = harness();
  const startedAt = NOW - 50 * 60e3;
  h.api.start({ id: 'wr1', name: 'Push', startedAt, exercises: [
    exOf('barbell-bench-press', [S_(185, 8), S_(185, 8), { w: '', r: '', type: 'N', done: false }]),
    exOf('triceps-pushdown-rope', [S_(50, 12), S_(50, 12)])] });
  // Rate the second bench set way too easy, and the first pushdown set too hard.
  const r1 = h.api.rate({ exIdx: 0, setIdx: 1 }, 4);
  const r2 = h.api.rate({ exIdx: 1, setIdx: 0 }, 0);
  const s = h.api.get();
  check('a tap stores the integer on that set — 4 and 0 — and says it landed', r1 === true && r2 === true &&
        s.exercises[0].sets[1].rir === 4 && s.exercises[1].sets[0].rir === 0 && !('rir' in s.exercises[0].sets[0]), J(s.exercises.map(e => e.sets)));
  check('an unticked set cannot be rated — the callback refuses, and nothing is written on it',
        h.api.rate({ exIdx: 0, setIdx: 2 }, 4) === false && !('rir' in s.exercises[0].sets[2]));
  check('another chip replaces it; the same chip again deletes the key (never a null)',
        (h.api.rate({ exIdx: 0, setIdx: 1 }, 2), s.exercises[0].sets[1].rir === 2) &&
        (h.api.rate({ exIdx: 0, setIdx: 1 }, null), !('rir' in s.exercises[0].sets[1])) &&
        (h.api.rate({ exIdx: 0, setIdx: 1 }, 4), s.exercises[0].sets[1].rir === 4));
  await h.api.finish();
  const dateK = key(startedAt);
  mk = dateK.slice(0, 7); dd = dateK.slice(8, 10);
  stored = h.db.getAt(`workouts/${mk}/${dd}/wr1`);
  check('Finish writes the record whole, with each rating on its set as a number',
        !!stored && stored.exercises[0].sets[1].rir === 4 && typeof stored.exercises[0].sets[1].rir === 'number' &&
        stored.exercises[1].sets[0].rir === 0 && !('rir' in stored.exercises[0].sets[0]) && !('rir' in stored.exercises[1].sets[1]), J(stored && stored.exercises));
  check('one write for the record — no child write for a rating, and no new node',
        h.S.writes.filter(w => w.p.startsWith('workouts/')).length === 1 && !h.S.writes.some(w => /\/rir$|\/sets\//.test(w.p)),
        J(h.S.writes.map(w => w.p)));
  check('and the month cache holds the very record written', J(h.api.cache()[mk][dd].wr1) === J(stored));
  check('the unticked set never reached the record', stored.exercises[0].sets.length === 2);
}

section('B. an edit carries every rating: open → save → open keeps them, moved to another day or not');
{
  // The screen's own open: editWorkout() from the stored record.
  h.api.open(clone(stored), mk, dd);
  const opened = h.api.get();
  check('opening a past session carries each rating onto its set, exactly as stored',
        opened.exercises[0].sets[1].rir === 4 && opened.exercises[1].sets[0].rir === 0 && !('rir' in opened.exercises[0].sets[0]),
        J(opened.exercises.map(e => e.sets)));
  await h.api.edit();
  const saved = h.db.getAt(`workouts/${mk}/${dd}/wr1`);
  check('saved unchanged: every rating survives the rebuilt record and the whole-month PUT',
        J(saved.exercises.map(e => e.sets.map(z => z.rir ?? null))) === J(stored.exercises.map(e => e.sets.map(z => z.rir ?? null))) &&
        h.S.writes.some(w => w.p === `workouts/${mk}`), J(saved.exercises.map(e => e.sets)));
  h.api.open(clone(saved), mk, dd);
  const again = h.api.get();
  check('and opened again, they are there: open → save → open is a no-op for a rating',
        J(again.exercises.map(e => e.sets.map(z => z.rir ?? null))) === J(opened.exercises.map(e => e.sets.map(z => z.rir ?? null))));
  // Moved to another day.
  const dk = key(NOW - 2 * DAY);
  again._edit.newDateKey = dk;
  await h.api.edit();
  const moved = h.db.getAt(`workouts/${dk.slice(0, 7)}/${dk.slice(8, 10)}/wr1`);
  check('moved to another day, the ratings go with it', !!moved && moved.exercises[0].sets[1].rir === 4 && moved.exercises[1].sets[0].rir === 0,
        J(moved && moved.exercises));
  // Unticked during the edit: that set leaves the record, and its rating with it.
  h.api.open(clone(moved), dk.slice(0, 7), dk.slice(8, 10));
  const ed = h.api.get();
  ed.exercises[0].sets[1] = pure.tickSet(ed.exercises[0].sets[1]);
  check('an untick in an edit deletes the rating from the set', !('rir' in ed.exercises[0].sets[1]));
  await h.api.edit();
  const after = h.db.getAt(`workouts/${dk.slice(0, 7)}/${dk.slice(8, 10)}/wr1`);
  check('and saved, the set and its rating are gone — the others kept', after.exercises[0].sets.length === 1 && after.exercises[1].sets[0].rir === 0,
        J(after.exercises));
  // An old record: no rating, and none gained.
  const old = { id: 'wold', name: 'Old', startedAt: NOW - 9 * DAY, endedAt: NOW - 9 * DAY + 3600e3, durationSec: 3600, volume: 1, groups: ['chest'],
                exercises: [exOf('barbell-bench-press', [{ w: '185', r: '5', type: 'N' }, { w: '185', r: '5', type: 'N' }])] };
  const ok = key(old.startedAt);
  const h2 = harness({ seed: { workouts: { [ok.slice(0, 7)]: { [ok.slice(8, 10)]: { wold: old } } } } });
  await h2.api.open(clone(old), ok.slice(0, 7), ok.slice(8, 10));
  await h2.api.edit();
  const back = h2.db.getAt(`workouts/${ok.slice(0, 7)}/${ok.slice(8, 10)}/wold`);
  check('an old record with no rating: opened and saved, it gains no `rir` key anywhere — nothing migrates, absent is not 0',
        !!back && back.exercises.every(e => e.sets.every(z => !('rir' in z))), J(back && back.exercises));
  check('and the "last time" index is folded with w, r and type only: a rating stays on the record, where its reader is',
        J(h.api.fold({}, '2026-09-24', stored.exercises)['barbell-bench-press'][0].sets) ===
        J([{ w: '185', r: '8', type: 'N' }, { w: '185', r: '8', type: 'N' }]));
}

/* ================= C. A COPIED SET NEVER CARRIES ONE ================= */
section('C. a copied set never carries a rating: a duplicated block, "+ Set", a routine and the builder all build fresh');
{
  const rated = S_(185, 8, { rir: 4 });
  const dupped = h.api.dup(false)(rated);
  check('dupSet (a duplicated block): a fresh { w, r, type, done } — no rir', J(dupped) === J({ w: '185', r: '8', type: 'N', done: false }));
  const blk = B.duplicateBlock({ exercises: [{ ...exOf('barbell-bench-press', [rated]), block: 1 }], blocks: [1] }, 1, { copySet: h.api.dup(false) });
  check('and through blocks.js duplicateBlock with the screen’s copySet', blk.exercises[1].sets.every(z => !('rir' in z)), J(blk.exercises[1]));
  h.api.start({ id: 'wx', name: 'X', startedAt: NOW, exercises: [] });
  const ex = exOf('barbell-bench-press', [rated]);
  h.api.addSet(ex);
  check('"+ Set" after a rated set: the typed numbers, never the rating', J(ex.sets[1]) === J({ w: '185', r: '8', type: 'N', done: false }), J(ex.sets[1]));
  const RSRC = src('routines.js');
  const toSession = new Function(liftFrom(RSRC, 'routines.js', 'toSession') + '\nreturn toSession;')();
  const started = toSession({ name: 'R', exercises: [{ ...exOf('barbell-bench-press', [{ tw: '185', tr: '8', type: 'N', rir: 4 }]) }] });
  check('a routine started: { w, r, type, done, tw, tr } built fresh — a stray rir on a routine row does not cross',
        J(Object.keys(started.exercises[0].sets[0])) === J(['w', 'r', 'type', 'done', 'tw', 'tr']));
  check('a session saved as a routine, and a routine row added or grown in the editor, are built { tw, tr, type } fresh',
        RSRC.includes("sets: (ex.sets || []).map(s => ({ tw: s.w || '', tr: s.r || '', type: s.type || 'N' }))") &&
        RSRC.includes("ex.sets.push({ tw: last.tw || '', tr: last.tr || '', type: 'N' });") &&
        RSRC.includes("sets: [{ tw: '', tr: '', type: 'N' }]"));
  // The builder: every view of a proposal, built from a log whose sets are rated.
  const sess = (id, ago, w) => ({ id, startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY), exercises: [
    exOf('barbell-bench-press', [S_(w, 8, { rir: 4 }), S_(w, 8, { rir: 2 }), S_(w, 8, { rir: 0 })]),
    exOf('triceps-pushdown-rope', [S_(50, 12, { rir: 4 }), S_(50, 12)])] });
  const log = [];
  for (let k = 0; k < 8; k++) log.push(sess('b' + k, 3 + 7 * (7 - k), 165 + 5 * k));
  const inp = { now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions: log, lib: LIB, hidden: [], libReady: true,
    routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null, summaries: {}, steps: { days: {} }, weighIns: [],
    weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
    settings: { v: 1, mute: {}, answers: {}, asked: {} } };
  const p = C.coach(inp).build({});
  const views = p ? ['placeholders', 'lastNumbers', 'targets', 'record'].filter(v => p[v]) : [];
  const leaks = views.filter(v => J(p[v]).includes('"rir"'));
  check('the builder’s proposal — ' + views.join(', ') + ' — carries no rating in any view, from a log whose every set is rated',
        views.length >= 3 && !leaks.length, list(leaks) || String(views.length));
}

/* ================= D. USE IT FOR MY NEXT SET ================= */
section('D. "Use it for my next set" writes tw/tr only — the next unticked set of that exercise, or one new set');
{
  const T = { tw: '195', tr: '8' };
  const base = () => [exOf('barbell-bench-press', [S_(190, 8, { rir: 4 }), { w: '', r: '', type: 'N', done: false, tw: '190', tr: '8', tl: true },
                                                     { w: '', r: '', type: 'N', done: false }])];
  const a = pure.useNext(base(), { exIdx: 0, setIdx: 0 }, T);
  check('the next unticked set gets 195 × 8 as its grey targets, and the `tl` mark goes — Coach’s number, not last time’s',
        J(a[0].sets[1]) === J({ w: '', r: '', type: 'N', done: false, tw: '195', tr: '8' }) && J(a[0].sets[2]) === J(base()[0].sets[2]), J(a[0].sets));
  const typed = base(); typed[0].sets[1].w = '200';
  const b = pure.useNext(typed, { exIdx: 0, setIdx: 0 }, T);
  check('a box he typed into keeps what he typed — `w` is never written', b[0].sets[1].w === '200' && b[0].sets[1].tw === '195');
  check('and the reps box is never written either: tr only', b[0].sets[1].r === '');
  const full = [exOf('barbell-bench-press', [S_(190, 8), S_(190, 8)])];
  const c = pure.useNext(full, { exIdx: 0, setIdx: 1 }, T);
  check('every set ticked: one set is added, carrying them', c[0].sets.length === 3 && J(c[0].sets[2]) === J({ w: '', r: '', type: 'N', done: false, tw: '195', tr: '8' }));
  const warm = [exOf('barbell-bench-press', [S_(190, 8), { w: '', r: '', type: 'W', done: false }, { w: '', r: '', type: 'D', done: false },
                                            { w: '', r: '', type: 'N', done: false }])];
  const d = pure.useNext(warm, { exIdx: 0, setIdx: 0 }, T);
  check('a warm-up and a drop set are passed over: the next working set gets it', d[0].sets[3].tw === '195' && !('tw' in d[0].sets[1]) && !('tw' in d[0].sets[2]));
  const dup = [exOf('barbell-bench-press', [S_(190, 8)]), exOf('barbell-row', [{ w: '', r: '', type: 'N', done: false }]),
               exOf('barbell-bench-press', [{ w: '', r: '', type: 'N', done: false }])];
  const e = pure.useNext(dup, { exIdx: 0, setIdx: 0 }, T);
  check('in a duplicated block, the later copy’s set — never another lift’s', e[2].sets[0].tw === '195' && !('tw' in e[1].sets[0]));
  check('nothing to place, nothing moves: junk in, the exercises as they were',
        J(pure.useNext(full, { exIdx: 5, setIdx: 0 }, T)) === J(full) && J(pure.useNext(full, { exIdx: 0, setIdx: 0 }, null)) === J(full));
  check('and the live callback puts it on the live session, never an edit', (() => {
    h.api.start({ id: 'wl', name: 'L', startedAt: NOW, exercises: base() });
    h.api.useNext({ exIdx: 0, setIdx: 0 }, T);
    const ok1 = h.api.get().exercises[0].sets[1].tw === '195';
    h.api.start({ id: 'we', name: 'E', startedAt: NOW, exercises: base(), _edit: { mk: '2026-09', dd: '01', dateKey: '2026-09-01' } });
    h.api.useNext({ exIdx: 0, setIdx: 0 }, T);
    return ok1 && h.api.get().exercises[0].sets[1].tw === '190' && h.api.rate({ exIdx: 0, setIdx: 0 }, 4) === false;
  })());
}

/* ================= E. THE CHIPS, IN THE LIVE SHEET ================= */
section('E. the chips: in the live sheet only, over a ticked working set, on the live chip’s gate — and a tap rates, reads as chosen, and clears');
{
  // An account with a log that gives bench a target: 185 twice at the top of a fixed 8.
  const log = [];
  [170, 175, 175, 180, 180, 185, 185, 185].forEach((w, k) => log.push({ id: 'e' + k, startedAt: NOW - (3 + 7 * (7 - k)) * DAY,
    _date: key(NOW - (3 + 7 * (7 - k)) * DAY), exercises: [exOf('barbell-bench-press', [S_(w, 8), S_(w, 8), S_(w, 8)])] }));
  const INPUT = { now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions: log, lib: LIB, hidden: [], libReady: true,
    routines: [], live: { active: true }, tier: { pro: true }, targets: null, targetsSet: null, summaries: {}, steps: { days: {} }, weighIns: [],
    weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
    settings: { v: 1, mute: {}, answers: {}, asked: {} } };
  const st = { pro: true, input: INPUT, known: true };
  globalThis.__coachData = (name, args) => ({
    coachLogKnown: () => st.known, coachReady: () => true, coachSettingsKnown: () => true,
    coachSettings: () => st.input.settings, coachPro: () => st.pro,
    coachInput: extra => ({ ...st.input, live: { active: !!(extra && extra.live) }, tier: { pro: st.pro } })
  }[name] || (() => Promise.resolve(true)))(...args);
  const CUI = await import(JSON.parse(at('coach-ui.mjs')));
  const sheetIn = () => body.children.find(x => x.classList.contains('sheet')) || null;
  const live = sets => ({ id: 'wlive', name: 'Live', startedAt: NOW - 1800e3, exercises: [exOf('barbell-bench-press', sets)] });
  const calls = [];
  const optsFor = s => ({ session: s, add: () => {}, current: 0,
    rate: (at_, v) => { calls.push(['rate', at_, v]); const ex = s.exercises[at_.exIdx]; ex.sets[at_.setIdx] = pure.rateSet(ex.sets[at_.setIdx], v); return true; },
    useNext: (at_, t) => { calls.push(['useNext', at_, t]); s.exercises = pure.useNext(s.exercises, at_, t); } });
  const openOn = s => { body.children.length = 0; const chip = CUI.liveChip(optsFor(s)); if (chip) chip.onclick(); return { chip, sh: sheetIn() }; };
  const chipsOf = sh => (sh ? buttonsIn(sh).filter(b => b.classList.contains('coach-effort')) : []);

  const S1 = live([S_(190, 8), { w: '', r: '', type: 'N', done: false }]);
  let { chip, sh } = openOn(S1);
  const bubs = sh ? find(sh, 'coach-bub-t').map(x => x.textContent) : [];
  check('a live session with a ticked working set: the sheet asks "Set 1 · 190 lb × 8. How was it?" over three chips',
        !!chip && (find(sh, 'coach-rate-q')[0] || {}).textContent === 'Set 1 · 190 lb × 8. How was it?' &&
        J(chipsOf(sh).map(b => b.textContent)) === J(['Way too easy', 'About right', 'Too hard']), J(bubs));
  check('and the next set above them: "Next set: 190 lb × 8."', bubs.includes('Next set: 190 lb × 8.'), J(bubs));
  check('nothing chosen yet', chipsOf(sh).every(b => !b.classList.contains('on') && b.getAttribute('aria-pressed') === 'false'));
  chipsOf(sh)[0].onclick();
  check('a tap on "Way too easy" rates that set through the callback workout.js hands in — 4, on set 1',
        J(calls.pop()) === J(['rate', { exIdx: 0, setIdx: 0 }, 4]) && S1.exercises[0].sets[0].rir === 4);
  const after = find(sh, 'coach-rate-after')[0];
  check('Coach answers warm first, then the number: "Strong set. Next one: 195 lb × 8."',
        (find(after, 'coach-bub-t')[0] || {}).textContent === 'Strong set. Next one: 195 lb × 8.', after && find(after, 'coach-bub-t').map(x => x.textContent).join(' / '));
  check('and the chosen chip reads as chosen', chipsOf(sh)[0].classList.contains('on') && chipsOf(sh)[0].getAttribute('aria-pressed') === 'true' &&
        !chipsOf(sh)[1].classList.contains('on'));
  const use = buttonsIn(after).find(b => b.textContent === 'Use it for my next set');
  check('with one button: "Use it for my next set"', !!use);
  use.onclick();
  check('which hands workout.js the target — tw/tr only — and closes the sheet',
        J(calls.pop()) === J(['useNext', { exIdx: 0, setIdx: 0 }, { tw: '195', tr: '8' }]) && !sheetIn() &&
        J(S1.exercises[0].sets[1]) === J({ w: '', r: '', type: 'N', done: false, tw: '195', tr: '8' }), J(S1.exercises[0].sets[1]));
  ({ sh } = openOn(S1));
  chipsOf(sh)[0].onclick();
  check('the chosen chip tapped again clears it: rate(…, null), the key deleted, "Cleared.", and no button',
        J(calls.pop()) === J(['rate', { exIdx: 0, setIdx: 0 }, null]) && !('rir' in S1.exercises[0].sets[0]) &&
        (find(find(sh, 'coach-rate-after')[0], 'coach-bub-t')[0] || {}).textContent === 'Cleared.' &&
        !buttonsIn(find(sh, 'coach-rate-after')[0]).length);
  chipsOf(sh)[2].onclick();
  check('"Too hard": "Noted. Stay at 190 lb, or call that the last set of this one."',
        (find(find(sh, 'coach-rate-after')[0], 'coach-bub-t')[0] || {}).textContent === 'Noted. Stay at 190 lb, or call that the last set of this one.');

  // Where the chips never are.
  ({ sh } = openOn(live([{ w: '', r: '', type: 'N', done: false }, { w: '', r: '', type: 'N', done: false }])));
  check('nothing ticked on the exercise in hand: no chips — and the session’s target, "Next set: 190 lb × 8."',
        !!sh && !chipsOf(sh).length && !find(sh, 'coach-rate-q').length && find(sh, 'coach-bub-t').some(x => x.textContent === 'Next set: 190 lb × 8.'));
  ({ sh } = openOn(live([S_(95, 10, { type: 'W' }), { w: '', r: '', type: 'N', done: false }])));
  check('a warm-up ticked is not a working set: no chips', !!sh && !chipsOf(sh).length);
  check('an edit of a past session: no chip, so no sheet and no chips',
        CUI.liveChip(optsFor({ ...live([S_(190, 8)]), _edit: { mk: '2026-09', dd: '01' } })) === null);
  st.pro = false;
  check('Basic: no chip — the chips live behind the live chip’s own gate', CUI.liveChip(optsFor(live([S_(190, 8)]))) === null);
  st.pro = true;
  st.input = { ...INPUT, settings: { v: 1, mute: { live: true }, answers: {}, asked: {} } };
  check('"In the gym" off: no chip', CUI.liveChip(optsFor(live([S_(190, 8)]))) === null);
  st.input = { ...INPUT, settings: { v: 1, mute: { targets: true }, answers: {}, asked: {} } };
  ({ sh } = openOn(live([S_(190, 8)])));
  check('"Weight and rep targets" off: the chips are there and a tap still stores — and no next-set number anywhere',
        chipsOf(sh).length === 3 && !find(sh, 'coach-bub-t').some(x => /Next set/.test(x.textContent)) &&
        (chipsOf(sh)[1].onclick(), find(find(sh, 'coach-rate-after')[0], 'coach-bub-t')[0].textContent === 'Good. Saved with the set.') &&
        !buttonsIn(find(sh, 'coach-rate-after')[0]).length);
  st.input = INPUT;
  const noRate = { ...optsFor(live([S_(190, 8)])) };
  delete noRate.rate;
  body.children.length = 0; CUI.openLiveSheet(noRate);
  check('a caller that hands no rating callback gets no chips — Coach never writes the session itself', !chipsOf(sheetIn()).length);
  check('nothing pops up: every chip, answer and button is drawn inside the one sheet the chip opened',
        !/\btoast\(/.test((UI_SRC.split('export function openLiveSheet')[1] || '').split('\nfunction nudgeKey')[0]));
  check('and the screen hands the sheet both callbacks, for a live session only',
        /const liveOpts = current => \(\{ session, add: addPicked, rate: rateLive, useNext: useNextLive, current \}\);/.test(WSRC) &&
        /function rateLive\(at, rir\) \{\n  const ex = session && !session\._edit/.test(WSRC) && /function useNextLive\(at, t\) \{\n  if \(!session \|\| session\._edit\) return;/.test(WSRC));
}

console.log('\nhis rating of a set: stored on the set, kept through an edit, and heard mid-session\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
