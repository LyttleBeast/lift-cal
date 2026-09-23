/* Proof that a month this device never read is never written back.
 *
 *   node tools-check/month-erasure.mjs
 *
 * Dev-only. Nothing in index.html loads it and nothing in the app imports it;
 * it is here because the bug it covers is invisible from the outside. RTDB
 * stores `{}` as a DELETE, and .validate is not evaluated for a delete, so no
 * rule on the server can see a whole-month wipe happen — it has to be caught
 * on the client, which means the client is also the only place it can be
 * proved.
 *
 * The bug, in full: finishWorkout files a session under the day it STARTED, so
 * its month is not always the month on screen. It used to synthesize
 * `monthCache[mk] = monthCache[mk] || {}` for that month — a one-day object
 * claiming to be the whole month — and loadMonth's early return was on the
 * cache alone, so the month could never correct itself afterwards. The next
 * Delete emptied that cache and PUT `{}` over `workouts/{YYYY-MM}`, taking
 * every stored day with it.
 *
 * WHAT THIS RUNS. Not a paraphrase: it lifts loadMonth, watchMonth, saveMonth,
 * hydrateForWrite, deleteSession, finishWorkout and saveEdit verbatim out of
 * ../workout.js and evaluates them against a model of store.js and of RTDB's
 * set() semantics. Everything they reach for that renders, times or estimates
 * is stubbed; everything that touches data is not. Then it runs the same
 * scenarios against the pre-fix code, kept below as LEGACY, and fails if that
 * one DOESN'T erase the month — a verifier that cannot go red on the bug it
 * covers is decoration.
 *
 * Scenario 4 is the one that matters most on a live app: it asserts the guard
 * still lets an ordinary delete through. A guard that blocks a legitimate
 * write is a bug, not caution.
 *
 * The store modelled here is a BARE PUT — deliberately. store.js has a
 * destructive-write guard of its own in front of set(), and modelling it too
 * would let this file pass on writes that workout.js should never have
 * attempted. Nothing below relies on a second line of defence: the assertion
 * is that the erasing write is never sent, not that something downstream
 * catches it.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC  = readFileSync(join(HERE, '..', 'workout.js'), 'utf8');
const ASRC = readFileSync(join(HERE, '..', 'analytics.js'), 'utf8');

const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/* ---------- lifting the real functions out of workout.js ----------
   Top-level functions in this file close with a `}` in column one, which is
   the whole grammar needed here. If that ever stops being true the slice stops
   parsing and this file throws rather than quietly testing nothing. */
function liftFrom(src, where, name) {
  const re = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm');
  const m = re.exec(src);
  if (!m) throw new Error(`month-erasure: ${name}() is gone from ${where} — the fix or this check is stale`);
  const end = src.indexOf('\n}\n', m.index);
  if (end < 0) throw new Error(`month-erasure: could not find the end of ${name}()`);
  // The regex already tolerates `export function`, but the SLICE would carry
  // the keyword into new Function(), which cannot compile a declaration that
  // exports. A function gaining an export for a verifier to import must not
  // break the verifiers that lift it by text.
  return src.slice(m.index, end + 3).replace(/^export /, '');
}
const lift = name => liftFrom(SRC, 'workout.js', name);

/* finishWorkout now folds the finished session onto the per-exercise index
   through mergeSessionExercises, which lives in analytics.js. It is lifted out
   of the REAL file rather than stubbed with something convenient: this harness
   exists to run the shipped finishWorkout against a model of RTDB, and a fake
   merge inside it would let the file print "all good" while exercising a fold
   the app never runs. The function has no dependencies of its own, so it
   evaluates on its own; if it ever grows one this throws rather than passing. */
const mergeSessionExercises = new Function(
  liftFrom(ASRC, 'analytics.js', 'mergeSessionExercises').replace(/^export /, '') +
  '\nreturn mergeSessionExercises;')();

/* ---------- RTDB + store.js, modelled ----------
   set() replaces a node outright, and storing `{}` or null is a DELETE — that
   is the sharp edge the whole fix exists for, so it is modelled rather than
   assumed. */
function makeDb(seed) {
  let tree = clone(seed);

  const getAt = path => path.split('/').reduce((o, k) => (o == null ? undefined : o[k]), tree);

  function setAt(path, value) {
    const keys = path.split('/');
    const dead = value == null || (typeof value === 'object' && !Object.keys(value).length);
    const walk = (node, i) => {
      const k = keys[i];
      if (i === keys.length - 1) {
        if (dead) delete node[k];
        else node[k] = clone(value);
      } else {
        if (node[k] == null || typeof node[k] !== 'object') { if (dead) return; node[k] = {}; }
        walk(node[k], i + 1);
        // RTDB keeps no empty containers.
        if (node[k] && typeof node[k] === 'object' && !Object.keys(node[k]).length) delete node[k];
      }
    };
    walk(tree, 0);
  }

  return { snapshot: () => clone(tree), getAt, setAt };
}

/* store.js as workout.js sees it. `reachable:false` is the case that matters:
   read() hands back a fallback and looks exactly like an empty node, while
   readExact() rejects — which is the entire reason loadMonth uses readExact. */
function makeStore(db, { reachable = true } = {}) {
  const mirror = new Map();
  const writes = [];
  const net = { up: reachable };
  return {
    writes,
    net,
    async read(path, fallback = null) {
      if (!net.up) { const c = mirror.get(path); return c === undefined ? fallback : c; }
      const v = db.getAt(path);
      const out = v === undefined ? fallback : clone(v);
      mirror.set(path, out);
      return out;
    },
    async readExact(path) {
      if (!net.up) {
        const c = mirror.get(path);
        if (c === undefined) throw new Error('offline');
        return c;
      }
      const v = db.getAt(path);
      const out = v === undefined ? null : clone(v);
      mirror.set(path, out);
      return out;
    },
    async write(path, value) {
      writes.push({ path, value: clone(value) });
      db.setAt(path, value);
    },
    watch() { return () => {}; }
  };
}

/* ---------- the module under test ---------- */
const DECLS = `
let monthCache = {};
let hydrated = new Set();
let session = null, summary = null, peek = false, history = {};
let unwatchMonth = null, watchedMk = null;
let finishing = false;
`;

const STUBS = [
  'read', 'readExact', 'write', 'watch', 'invalidate', 'toast', 'todayKey', 'LS',
  'bump', 'isWorking', 'mergeSessionExercises', 'allSessions', 'detectPRs', 'sessionMilestones',
  'computeVolume', 'collectDone', 'confirmSheet', 'releaseWakeLock', 'clearRest',
  'render', 'rebuildHistoryFromLog',
  // v42. saveMonth and finishWorkout tell Coach the training log moved, because
  // Coach's snapshot is gathered once per app open and its card sits directly
  // above the button that just changed it. Stubbed here for the same reason
  // `invalidate` and `render` are: this file is about month erasure, and what a
  // card does afterwards is somebody else's verifier.
  'refreshCoachSessions'
];

function build(body, store, held) {
  const toasts = [];
  const stubs = {
    read: store.read, readExact: store.readExact, write: store.write, watch: store.watch,
    invalidate: () => {},
    toast: m => toasts.push(String(m)),
    todayKey: (d = new Date()) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    LS: { get: (k, f) => f, set: () => {}, del: () => {} },
    bump: () => {},
    isWorking: s => s && s.type !== 'W',
    mergeSessionExercises,
    allSessions: async () => [],
    detectPRs: () => ({ prs: [], firsts: [] }),
    sessionMilestones: () => [],
    computeVolume: () => 0,
    collectDone: () => clone(held.done),
    confirmSheet: () => {},
    releaseWakeLock: () => {},
    clearRest: () => {},
    render: () => {},
    rebuildHistoryFromLog: async () => {},
    refreshCoachSessions: async () => true
  };
  const src = DECLS + body + `
return {
  loadMonth, saveMonth, deleteSession, finishWorkout, saveEdit,
  cache: () => monthCache,
  hydrated: () => hydrated,
  setSession: s => { session = s; }
};`;
  const api = new Function(...STUBS, src)(...STUBS.map(k => stubs[k]));
  api.toasts = toasts;
  return api;
}

const CURRENT = () =>
  [lift('loadMonth'), lift('watchMonth'), lift('saveMonth'), lift('refuseUnread'),
   lift('hydrateForWrite'), lift('deleteSession'),
   // The history fold finishWorkout now goes through. Lifted, not stubbed, for
   // the same reason as everything else here: the write being asserted about is
   // the one the app makes.
   lift('historyRows'), lift('foldSessionIntoHistory'), lift('trimHistory'),
   // v46. runFinish counts the ticked sets collectFrom would leave out before
   // it saves anything. Lifted rather than stubbed: it is pure, and on every
   // session below it answers 0, which is what keeps these the same scenarios
   // they were — tools-check/tick-targets.mjs is where the other answers live.
   lift('unsavedTicks'),
   // v47. Both record builders take their groups from recordGroups, which is
   // pure and reads isWorking — lifted for the same reason unsavedTicks is.
   lift('recordGroups'),
   lift('finishWorkout'), lift('runFinish'), lift('saveEdit')].join('\n');

/* The code as it stood before the fix, kept verbatim so the scenarios below
   can be shown to go red on it. Do not "improve" it — its bugs are the point. */
const LEGACY = `
async function loadMonth(mk) {
  if (monthCache[mk]) { watchMonth(mk); return monthCache[mk]; }
  const data = (await read(\`workouts/\${mk}\`, null)) || {};
  monthCache[mk] = data;
  watchMonth(mk);
  return data;
}
function watchMonth(mk) {
  if (watchedMk === mk) return;
  if (unwatchMonth) unwatchMonth();
  watchedMk = mk;
  unwatchMonth = watch(\`workouts/\${mk}\`, val => {
    const next = val || {};
    if (JSON.stringify(next) === JSON.stringify(monthCache[mk] || {})) return;
    monthCache[mk] = next;
    invalidate();
    if (!session && !summary) render();
  });
}
async function saveMonth(mk) {
  await write(\`workouts/\${mk}\`, monthCache[mk] || {});
  invalidate();
}
async function deleteSession(mk, dd, id) {
  delete monthCache[mk][dd][id];
  if (!Object.keys(monthCache[mk][dd]).length) delete monthCache[mk][dd];
  await saveMonth(mk);
  await rebuildHistoryFromLog();
  return true;
}
async function finishWorkout() {
  const done = collectDone();
  if (!done.length) return;
  const dateK = todayKey(new Date(session.startedAt));
  const mk = dateK.slice(0, 7), dd = dateK.slice(8, 10);
  const record = { id: session.id, name: session.name, startedAt: session.startedAt,
                   endedAt: Date.now(), durationSec: 1, volume: 0, groups: [], exercises: done };
  await write(\`workouts/\${mk}/\${dd}/\${session.id}\`, record);
  monthCache[mk] = monthCache[mk] || {};
  monthCache[mk][dd] = monthCache[mk][dd] || {};
  monthCache[mk][dd][session.id] = record;
  session = null;
}
async function saveEdit() {
  const meta = session._edit;
  const done = collectDone();
  if (!done.length) return;
  const oldMk = meta.mk, oldDd = meta.dd;
  let dateK = meta.dateKey;
  if (meta.newDateKey && meta.newDateKey !== meta.dateKey) dateK = meta.newDateKey;
  const mk = dateK.slice(0, 7), dd = dateK.slice(8, 10);
  const record = { id: session.id, name: session.name || 'Workout', startedAt: session.startedAt,
                   endedAt: session.startedAt, durationSec: 0, volume: 0, groups: [], exercises: done };
  if (monthCache[oldMk] && monthCache[oldMk][oldDd]) {
    delete monthCache[oldMk][oldDd][session.id];
    if (!Object.keys(monthCache[oldMk][oldDd]).length) delete monthCache[oldMk][oldDd];
  }
  await loadMonth(mk);
  monthCache[mk] = monthCache[mk] || {};
  monthCache[mk][dd] = monthCache[mk][dd] || {};
  monthCache[mk][dd][record.id] = record;
  await saveMonth(oldMk);
  if (mk !== oldMk) await saveMonth(mk);
  await rebuildHistoryFromLog();
  session = null;
}
`;

/* ---------- the fixture ----------
   Twelve stored days in a month the client has no reason to have opened, plus
   the month it is actually looking at. Twelve is the number the original
   verifier lost. */
const JUL = '2026-07';
const AUG = '2026-08';
const SEP = '2026-09';
function stored(mk, mi, n) {
  const days = {};
  for (let i = 1; i <= n; i++) {
    const dd = String(i).padStart(2, '0');
    const id = 'w-' + mk + '-' + dd;
    days[dd] = { [id]: { id, name: 'Stored ' + dd, startedAt: Date.UTC(2026, mi, i, 12), volume: 1000, durationSec: 3600, exercises: [] } };
  }
  return days;
}
function seed() {
  return { users: {}, workouts: {
    [JUL]: stored(JUL, 6, 5),
    [AUG]: stored(AUG, 7, 12),
    [SEP]: stored(SEP, 8, 1)
  } };
}
const daysIn = (tree, mk) => Object.keys((tree.workouts || {})[mk] || {}).length;
const augDays = tree => daysIn(tree, AUG);
const findSession = (tree, id) =>
  Object.values(tree.workouts || {}).some(m => Object.values(m).some(d => !!d[id]));

const DONE = [{ exId: 'barbell-bench-press', name: 'Bench', group: 'chest', equipment: 'barbell',
                sets: [{ w: '225', r: '5', type: 'N', done: true }] }];

// A session begun on the last evening of August. Whichever month the calendar
// is on, this one lands in August.
const lateAugust = () => ({ id: 'w-late', name: 'Evening session', startedAt: new Date(2026, 7, 31, 22, 40).getTime(), exercises: clone(DONE) });

/* ---------- scenarios ----------
   Each returns { ok, detail }. Run against the shipped code they must all be
   ok; run against LEGACY, the first three must not be. */

// 1. Finish into a month never read, then delete it again.
async function sFinishThenDelete(make) {
  const db = makeDb(seed());
  const store = makeStore(db);
  const held = { done: clone(DONE) };
  const m = make(store, held);
  await m.loadMonth(SEP);                       // the calendar is on September
  m.setSession(lateAugust());
  await m.finishWorkout();
  // The cache must be the real month by now, not a one-day stand-in: the
  // calendar renders straight out of it, so a synthesized month is also a
  // month that looks empty on screen until something re-reads it.
  const cached = Object.keys(m.cache()[AUG] || {}).length;
  const marked = m.hydrated().has(AUG);
  await m.deleteSession(AUG, '31', 'w-late');
  const n = augDays(db.snapshot());
  return { ok: n === 12 && cached === 13 && marked,
           detail: `${AUG} holds ${n} days (expected 12); cache held ${cached} days after finishing (expected 13), ${marked ? 'marked read' : 'NOT marked read'}` };
}

// 2. Same, but the session is edited rather than deleted. saveEdit used to
//    call loadMonth for exactly this reason, and the call did nothing.
async function sFinishThenEdit(make) {
  const db = makeDb(seed());
  const store = makeStore(db);
  const held = { done: clone(DONE) };
  const m = make(store, held);
  await m.loadMonth(SEP);
  m.setSession(lateAugust());
  await m.finishWorkout();
  m.setSession({ id: 'w-late', name: 'Renamed', startedAt: new Date(2026, 7, 31, 22, 40).getTime(),
                 exercises: clone(DONE),
                 _edit: { mk: AUG, dd: '31', dateKey: '2026-08-31', endedAt: Date.now(), durationSec: 3600 } });
  await m.saveEdit();
  const tree = db.snapshot();
  const n = augDays(tree);
  const kept = !!((tree.workouts[AUG] || {})['31'] || {})['w-late'];
  return { ok: n === 13 && kept, detail: `${AUG} holds ${n} days (expected 13), edited session ${kept ? 'kept' : 'LOST'}` };
}

// 3. The database is unreachable, so nothing can be hydrated. The delete must
//    be refused outright rather than guessing at the month's contents.
async function sUnreachable(make) {
  const db = makeDb(seed());
  const store = makeStore(db, { reachable: false });
  const held = { done: clone(DONE) };
  const m = make(store, held);
  m.setSession(lateAugust());
  await m.finishWorkout();
  let threw = false;
  try { await m.deleteSession(AUG, '31', 'w-late'); } catch { threw = true; }
  const n = augDays(db.snapshot());
  // The finish itself is a per-session write and lands whatever else happens —
  // it cannot erase anything — so August legitimately gains the 31st here. The
  // twelve stored days are what must survive, and no whole-month PUT may go.
  const put = store.writes.some(w => w.path === `workouts/${AUG}`);
  return { ok: n === 13 && !put, detail: `${AUG} holds ${n} days (expected 13), whole-month PUT ${put ? 'HAPPENED' : 'refused'}${threw ? ' (threw)' : ''}` };
}

// 4. The ordinary case, and the one that would make this fix worse than the
//    bug if it broke: a month that WAS read deletes a session normally.
async function sOrdinaryDelete(make) {
  const db = makeDb(seed());
  const store = makeStore(db);
  const held = { done: clone(DONE) };
  const m = make(store, held);
  await m.loadMonth(AUG);
  const ok = await m.deleteSession(AUG, '05', 'w-' + AUG + '-05');
  const tree = db.snapshot();
  const n = augDays(tree);
  return { ok: ok === true && n === 11 && !tree.workouts[AUG]['05'],
           detail: `delete returned ${ok}, ${AUG} holds ${n} days (expected 11)` };
}

// 5. The month failed to load once. When the network comes back the client has
//    to correct itself — that is what the `hydrated` half of loadMonth's early
//    return buys. Without it a cache written while offline is returned forever,
//    the month is never hydrated, and saveMonth refuses every delete in it from
//    then until a relaunch: no data lost, but the button silently stops working.
async function sRecoversAfterOutage(make) {
  const db = makeDb(seed());
  const store = makeStore(db, { reachable: false });
  const held = { done: clone(DONE) };
  const m = make(store, held);
  m.setSession(lateAugust());
  await m.finishWorkout();                      // offline: the month cannot be read
  store.net.up = true;                          // back on the network
  const ok = await m.deleteSession(AUG, '31', 'w-late');
  const n = augDays(db.snapshot());
  return { ok: ok === true && n === 12, detail: `delete returned ${ok}, ${AUG} holds ${n} days (expected 12)` };
}

// 6. Moving a workout into a month that cannot be read. Both months have to be
//    hydrated BEFORE either cache is touched, because saveEdit writes the old
//    month first: hydrate only the destination, as the old code did, and a
//    refusal lands after the session has already been taken out of the source.
//    The workout is then in neither month — the one failure mode worse than
//    the erasure, because it looks like a successful edit.
async function sMoveIntoUnreadableMonth(make) {
  const db = makeDb(seed());
  const store = makeStore(db);
  const held = { done: clone(DONE) };
  const m = make(store, held);
  await m.loadMonth(AUG);
  store.net.up = false;                         // the network goes down mid-edit
  m.setSession({ id: 'w-2026-08-05', name: 'Moved', startedAt: new Date(2026, 7, 5, 12).getTime(),
                 exercises: clone(DONE),
                 _edit: { mk: AUG, dd: '05', dateKey: '2026-08-05', newDateKey: '2026-07-20',
                          endedAt: Date.now(), durationSec: 3600 } });
  try { await m.saveEdit(); } catch {}
  const tree = db.snapshot();
  const alive = findSession(tree, 'w-2026-08-05');
  const j = daysIn(tree, JUL);
  return { ok: alive && j === 5,
           detail: `the workout is ${alive ? 'still in the log' : 'GONE FROM THE LOG'}, ${JUL} holds ${j} days (expected 5)` };
}

const SCENARIOS = [
  ['finish into an unread month, then delete it', sFinishThenDelete, true],
  ['finish into an unread month, then edit it', sFinishThenEdit, true],
  ['database unreachable — the delete is refused', sUnreachable, true],
  ['ordinary delete from a month that was read', sOrdinaryDelete, false],
  ['the month re-reads itself once the network is back', sRecoversAfterOutage, true],
  ['moving a workout into a month that cannot be read', sMoveIntoUnreadableMonth, true]
];

/* ---------- a structural check the scenarios cannot make ----------
   "loadMonth is the only thing that can populate monthCache" is a rule about
   the source, not about one run of it. The watch counts as a read of the
   database and so may hydrate too; nothing else may. */
function structural() {
  const fails = [];
  const hits = [...SRC.matchAll(/hydrated\.add\(/g)].map(m => m.index);
  const inside = (name) => {
    const body = lift(name);
    const at = SRC.indexOf(body);
    return i => i >= at && i < at + body.length;
  };
  const inLoad = inside('loadMonth'), inWatch = inside('watchMonth');
  if (!hits.length) fails.push('nothing ever adds to `hydrated`');
  hits.forEach(i => {
    if (!inLoad(i) && !inWatch(i)) fails.push(`hydrated.add() at offset ${i} is outside loadMonth/watchMonth`);
  });
  if (!/hydrated\.has\(mk\)/.test(lift('saveMonth'))) fails.push('saveMonth does not check `hydrated`');
  if (!/readExact\(/.test(lift('loadMonth'))) fails.push('loadMonth does not read through readExact()');
  return fails;
}

/* ---------- run ---------- */
let bad = 0;
const line = (ok, text) => { console.log(`${ok ? '  ok  ' : ' FAIL '} ${text}`); if (!ok) bad++; };

console.log('\nworkout.js — month erasure\n');

console.log('shipped code');
const makeCurrent = (store, held) => build(CURRENT(), store, held);
for (const [name, fn] of SCENARIOS) {
  // A scenario that throws is a failure, not a crash: saveMonth's refusal is a
  // backstop, and a backstop that fires means a caller skipped its hydrate.
  const r = await fn(makeCurrent).catch(e => ({ ok: false, detail: 'threw: ' + e.message }));
  line(r.ok, `${name} — ${r.detail}`);
}

console.log('\nsource rules');
for (const f of structural()) line(false, f);
if (!structural().length) line(true, 'loadMonth and the watch are the only hydrators; saveMonth refuses an unread month');

console.log('\npre-fix code (these three must go red, or this check proves nothing)');
const makeLegacy = (store, held) => build(LEGACY, store, held);
for (const [name, fn, mustFail] of SCENARIOS) {
  if (!mustFail) continue;
  let r;
  try { r = await fn(makeLegacy); } catch (e) { r = { ok: false, detail: 'threw: ' + e.message }; }
  line(!r.ok, `${name} — ${r.ok ? 'PASSED, so this scenario does not cover the bug' : 'erased as expected (' + r.detail + ')'}`);
}

console.log(bad ? `\n${bad} failure${bad === 1 ? '' : 's'}\n` : '\nall good\n');
process.exit(bad ? 1 : 0);
