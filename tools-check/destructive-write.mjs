#!/usr/bin/env node
//
// Verifier for the destructive-write guard in store.js.
//
//   node tools-check/destructive-write.mjs
//
// There is no test runner in this repo and no bundler, and store.js imports the
// Firebase SDK straight off gstatic, so it cannot simply be imported under
// Node. This loads the REAL store.js — no copy of the logic lives here, which
// is the only way a verifier stays true when the file changes — by rewriting
// its import specifiers to a local stub and giving it the four browser globals
// it touches at load: navigator, window, localStorage and document.
//
// What it proves, in the words of the requirement:
//   - an empty PUT and an explicit null over a populated node are REFUSED;
//   - the queue-coalescing case is NOT refused, which is the counterexample
//     that made the equivalent server rule unpublishable;
//   - the exercises/hidden shrink the live site really produces — duplicate ids
//     appended, both removed by one unhide tap — is NOT refused;
//   - a refusal is visible rather than silent;
//   - a refusal never leaves the mirror, the queue or the server claiming a
//     save happened.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE  = fileURLToPath(new URL('.', import.meta.url));
const STORE = join(HERE, '..', 'store.js');

/* ---------- the fake browser ---------- */

const store_ = new Map();
globalThis.localStorage = {
  getItem: k => (store_.has(k) ? store_.get(k) : null),
  setItem: (k, v) => store_.set(k, String(v)),
  removeItem: k => store_.delete(k),
  key: i => Array.from(store_.keys())[i] ?? null,
  get length() { return store_.size; }
};

globalThis.window = { addEventListener() {} };

// Only the handful of DOM calls store.js makes: syncPip() looks up one element,
// and the refusal banner builds one.
const byId = new Map();
function mkEl() {
  const el = {
    id: '', textContent: '', style: { cssText: '' }, children: [],
    setAttribute() {},
    appendChild(c) { this.children.push(c); if (c.id) byId.set(c.id, c); return c; },
    remove() { if (this.id) byId.delete(this.id); }
  };
  return el;
}
const body = mkEl();
globalThis.document = {
  body,
  getElementById: id => byId.get(id) || null,
  createElement: () => mkEl()
};

try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true }, configurable: true, writable: true
  });
} catch { /* Node may own it; store.online.value is set explicitly below anyway */ }

/* ---------- the fake database ---------- */

const server = new Map();          // full path -> value
let setLog = [];                   // every set() that reached the "database"
let updateLog = [];                // every update() that reached it, with its object
let setThrows = false;
let getThrows = false;             // reachable-but-failing, the flaky-signal case

const STUB = `
export const firebaseConfig = {};
export const OWNER_UID = 'owner-uid';
export function initializeApp() { return {}; }
export function getAuth() { return { currentUser: null }; }
export function getDatabase() { return {}; }
export function ref(_db, path) { return { path }; }
export async function get(r)  { return globalThis.__fb.get(r); }
export async function set(r, v) { return globalThis.__fb.set(r, v); }
export async function update(r, o) { return globalThis.__fb.update(r, o); }
export async function remove() {}
export function onValue() { return () => {}; }
export function onAuthStateChanged(_a, cb) { cb({ uid: 'u1' }); return () => {}; }
export function signInWithEmailAndPassword() {}
export function createUserWithEmailAndPassword() {}
export function sendPasswordResetEmail() {}
export function updateProfile() {}
export function signOut() {}
export function setPersistence() {}
export const browserLocalPersistence = {};
`;

globalThis.__fb = {
  get(r) {
    if (getThrows) throw new Error('network');
    const has = server.has(r.path);
    const v = server.get(r.path);
    return { exists: () => has && v !== null && v !== undefined, val: () => v };
  },
  set(r, v) {
    if (setThrows) throw new Error('network');
    setLog.push(r.path);
    server.set(r.path, v);
  },
  // RTDB's update(): the named children and nothing else, with null deleting.
  update(r, o) {
    if (setThrows) throw new Error('network');
    updateLog.push({ path: r.path, obj: o });
    const cur = { ...(server.get(r.path) || {}) };
    for (const k of Object.keys(o)) {
      if (o[k] === null) delete cur[k]; else cur[k] = o[k];
    }
    server.set(r.path, cur);
  }
};

/* ---------- load the real store.js against the stub ---------- */

const dir = mkdtempSync(join(tmpdir(), 'rack-guard-'));
writeFileSync(join(dir, 'fb-stub.mjs'), STUB);
writeFileSync(
  join(dir, 'store.mjs'),
  readFileSync(STORE, 'utf8').replace(/(\bfrom\s+)(['"])[^'"]+\2/g, "$1'./fb-stub.mjs'")
);
const store = await import(pathToFileURL(join(dir, 'store.mjs')).href);

store.watchAuth(() => {});         // sets UID to 'u1'
store.online.value = true;

/* ---------- harness ---------- */

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail) {
  if (ok) { pass++; results.push('  ok   ' + name); }
  else    { fail++; results.push('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

let blocks = [];
store.onGuardBlock(why => blocks.push(why));
const realError = console.error;

const U = 'users/u1/';
const mirror = p => store.LS.get('mirror:' + p, undefined);
const setMirror = (p, v) => store.LS.set('mirror:' + p, v);
const delMirror = p => store.LS.del('mirror:' + p);
const queue = () => store.LS.get('queue', []);

function reset() {
  store_.clear();
  byId.clear();
  body.children.length = 0;
  server.clear();
  setLog = [];
  updateLog = [];
  setThrows = false;
  getThrows = false;
  blocks = [];
  store.online.value = true;
}

// Every refusal is expected to shout on the console; swallow that so the
// verifier's own output is readable, and hand back what it said.
async function attempt(fn) {
  const said = [];
  console.error = (...a) => said.push(a.join(' '));
  try {
    await fn();
    return { threw: false, said };
  } catch (e) {
    return { threw: true, message: String(e && e.message || e), said };
  } finally {
    console.error = realError;
  }
}

const rows = n => Object.fromEntries(
  Array.from({ length: n }, (_, i) => ['f' + i, { id: 'f' + i, cal: 100 + i }])
);

/* ---------- 1. which paths are whole-container PUTs ---------- */

for (const p of ['weight/entries', 'food/items', 'food/meals', 'food/log/2026-09-14',
                 'water/log/2026-09-14', 'routines', 'workouts/2026-09', 'history',
                 'exercises/custom', 'exercises/overrides', 'exercises/hidden']) {
  check('container: ' + p, store.isContainer(p) === true);
}
for (const p of ['profile', 'onboarding', 'settings/water', 'settings/steps',
                 'food/targets', 'steps/2026-09-14', 'food/daySummaries/2026-09-14',
                 'workouts/2026-09/14/wm3k9x2', 'food/recall']) {
  check('not a container: ' + p, store.isContainer(p) === false);
}

/* ---------- 2. an empty PUT over a populated node ---------- */

reset();
{
  const P = 'food/log/2026-09-14';
  setMirror(P, rows(5));
  server.set(U + P, rows(5));
  const r = await attempt(() => store.write(P, {}));

  check('empty PUT refuses', r.threw, 'write() resolved');
  check('empty PUT: server untouched',
    Object.keys(server.get(U + P) || {}).length === 5 && setLog.length === 0);
  check('empty PUT: mirror still holds the five rows',
    Object.keys(mirror(P) || {}).length === 5,
    'mirror is ' + JSON.stringify(mirror(P)));
  check('empty PUT: nothing queued', queue().length === 0);
  check('empty PUT: says how many it would have removed',
    /removed 5 items/.test(r.message || ''), r.message);
  check('empty PUT: surfaced on screen', byId.has('writeBlock'));
  check('empty PUT: surfaced to a listener', blocks.length === 1);
  check('empty PUT: surfaced on the console', r.said.length === 1);
}

/* ---------- 3. an explicit null over a populated node ---------- */

reset();
{
  const P = 'weight/entries';
  const before = { wt1: { lb: 208, t: 1 }, wt2: { lb: 207, t: 2 }, wt3: { lb: 206, t: 3 } };
  setMirror(P, before);
  server.set(U + P, before);
  const r = await attempt(() => store.write(P, null));

  check('null PUT refuses', r.threw, 'write() resolved');
  check('null PUT: server untouched', setLog.length === 0);
  check('null PUT: mirror still holds the three weigh-ins',
    Object.keys(mirror(P) || {}).length === 3);
  check('null PUT: nothing queued', queue().length === 0);
  check('null PUT: surfaced', byId.has('writeBlock') && blocks.length === 1);
}

/* ---------- 4. the ordinary case still goes through ---------- */

reset();
{
  const P = 'weight/entries';
  const before = { wt1: {}, wt2: {}, wt3: {}, wt4: {}, wt5: {} };
  const after = { wt1: {}, wt2: {}, wt3: {}, wt4: {} };
  setMirror(P, before);
  server.set(U + P, before);
  const r = await attempt(() => store.write(P, after));

  check('deleting one weigh-in is allowed', !r.threw, r.message);
  check('deleting one weigh-in: server has four', Object.keys(server.get(U + P)).length === 4);
  check('deleting one weigh-in: nothing surfaced', blocks.length === 0 && !byId.has('writeBlock'));
}

reset();
{
  // A write that drops two rows and adds three has a higher child count and is
  // still a two-row deletion. It must be counted as one.
  const P = 'food/items';
  setMirror(P, { a: 1, b: 2, c: 3 });
  server.set(U + P, { a: 1, b: 2, c: 3 });
  const r = await attempt(() => store.write(P, { a: 1, d: 4, e: 5, f: 6, g: 7 }));
  check('a grow that also drops two rows is refused', r.threw, 'write() resolved');
  check('a grow that also drops two rows: nothing saved', setLog.length === 0);
}

/* ---------- 5. the queue-coalescing case ---------- */

reset();
{
  // Three deletions, one at a time, offline. This is the exact shape that made
  // the server-side numChildren() rule unpublishable: the replay reaches the
  // database as one PUT dropping three children. It passes here because the
  // measurement happens per write() CALL and the mirror steps down with each
  // one, so each call measures 1 — and because flushQueue() never goes back
  // through write() at all.
  const P = 'food/log/2026-09-14';
  setMirror(P, rows(5));
  server.set(U + P, rows(5));
  store.online.value = false;

  const seq = [4, 3, 2].map(n => rows(n));
  const r = await attempt(async () => { for (const v of seq) await store.write(P, v); });

  check('three offline deletes are allowed', !r.threw, r.message);
  check('three offline deletes: nothing surfaced', blocks.length === 0);
  check('three offline deletes: mirror stepped down to two rows',
    Object.keys(mirror(P) || {}).length === 2);
  check('three offline deletes: all three queued', queue().length === 3);

  store.online.value = true;
  const f = await attempt(() => store.flushQueue());
  check('the replay is not refused', !f.threw && blocks.length === 0, f.message);
  check('the replay lands the last value', Object.keys(server.get(U + P)).length === 2);
  check('the replay empties the queue', queue().length === 0);
}

/* ---------- 6. the known-legitimate exercises/hidden shrink ---------- */

reset();
{
  // picker.js does `hidden = [...hidden, id]` with no duplicate check, so a live
  // account really does hold the same id twice. One tap of "put it back in the
  // picker" filters out both copies, and RTDB stores the array keyed by index,
  // so two keys vanish for one thing the user did.
  const P = 'exercises/hidden';
  const before = ['barbell-bench-press', 'lat-pulldown', 'lat-pulldown', 'leg-press', 'crunch'];
  const after  = ['barbell-bench-press', 'leg-press', 'crunch'];
  setMirror(P, before);
  server.set(U + P, before);

  check('the duplicate unhide counts as one id, not two keys',
    store.droppedChildren(before, after) === 1,
    'counted ' + store.droppedChildren(before, after) + ' by id, expected 1');

  const r = await attempt(() => store.write(P, after));
  check('the duplicate unhide is allowed', !r.threw, r.message);
  check('the duplicate unhide: nothing surfaced', blocks.length === 0);
  check('the duplicate unhide: server updated', server.get(U + P).length === 3);
}

reset();
{
  // The same node still refuses a real wipe: four distinct ids gone, not one.
  const P = 'exercises/hidden';
  const before = ['a', 'b', 'b', 'c', 'd'];
  setMirror(P, before);
  server.set(U + P, before);
  const r = await attempt(() => store.write(P, []));
  check('wiping exercises/hidden is refused', r.threw, 'write() resolved');
  check('wiping exercises/hidden: mirror intact', (mirror(P) || []).length === 5);
  check('wiping exercises/hidden: server untouched', setLog.length === 0);
}

reset();
{
  // Unhiding the last hidden exercise legitimately empties the node.
  const P = 'exercises/hidden';
  setMirror(P, ['a', 'a']);
  server.set(U + P, ['a', 'a']);
  const r = await attempt(() => store.write(P, []));
  check('emptying exercises/hidden by unhiding its only id is allowed', !r.threw, r.message);
}

/* ---------- 7. nothing mirrored yet ---------- */

reset();
{
  // The disaster in its purest form: this device has never read the node, so a
  // half-loaded list is about to go over a full one. The guard reads the node
  // rather than guessing.
  const P = 'food/items';
  server.set(U + P, rows(9));
  delMirror(P);
  const r = await attempt(() => store.write(P, { f0: { id: 'f0' } }));

  check('unmirrored wipe is refused after reading the server', r.threw, 'write() resolved');
  check('unmirrored wipe: server untouched', setLog.length === 0);
  check('unmirrored wipe: the peek left no mirror behind', mirror(P) === undefined,
    'mirror is ' + JSON.stringify(mirror(P)));
}

reset();
{
  const P = 'food/items';
  server.set(U + P, rows(9));
  delMirror(P);
  const r = await attempt(() => store.write(P, { ...rows(9), fx: { id: 'fx' } }));
  check('unmirrored additive write is allowed', !r.threw, r.message);
}

/* ---------- 7b. unmirrored and unreachable: merge, don't refuse ----------

   This is not the rare case it looks like. food/log/{date} and water/log/{date}
   get a new key at every midnight, so the first entry of any day begun without
   a signal finds a mirror that does not exist yet. Refusing there would lose a
   whole day of logging on the one path the offline queue exists for. */

reset();
{
  const P = 'food/log/2026-09-15';          // a fresh day, never read here
  delMirror(P);
  server.set(U + P, rows(4));               // and the server already holds rows
  store.online.value = false;

  const r = await attempt(() => store.write(P, { fx: { id: 'fx', cal: 9 } }));
  check('offline first-of-the-day write is not refused', !r.threw, r.message);
  check('offline first-of-the-day: nothing surfaced', blocks.length === 0,
    JSON.stringify(blocks));
  check('offline first-of-the-day: queued as a merge',
    queue().length === 1 && queue()[0].merge === true && queue()[0].path === U + P,
    JSON.stringify(queue()));
  check('offline first-of-the-day: the merge carries only the new row',
    JSON.stringify(Object.keys(queue()[0].value)) === JSON.stringify(['fx']),
    JSON.stringify(queue()[0].value));
  check('offline first-of-the-day: the day is on screen again after a reload',
    mirror(P) !== undefined);

  // …and when the signal comes back the four rows that were already there
  // survive, which is the whole reason it went out as a merge.
  store.online.value = true;
  await store.flushQueue();
  const after = server.get(U + P);
  check('the queued merge lands without erasing the rows it never saw',
    Object.keys(after).length === 5 && after.fx && after.f0,
    JSON.stringify(Object.keys(after || {})));
  check('the queued merge left the queue empty', queue().length === 0);
}

reset();
{
  // The mirror that write left behind is this device's own belief, not a
  // picture of the server, and it must not license a PUT afterwards.
  const P = 'food/log/2026-09-15';
  delMirror(P);
  server.set(U + P, rows(4));
  store.online.value = false;
  await attempt(() => store.write(P, { fx: { id: 'fx' } }));

  store.online.value = true;
  const r = await attempt(() => store.write(P, { fx: { id: 'fx' } }));
  check('a partial mirror does not license a PUT: the server is read again',
    r.threw, 'write() resolved');
  check('a partial mirror: the four unseen rows are what it refuses over',
    /removed 4 items/.test(r.message || ''), r.message);
}

reset();
{
  // A row this device added itself and then removed is a deletion it CAN
  // account for, so the merge carries it as an explicit null.
  const P = 'water/log/2026-09-15';
  delMirror(P);
  server.set(U + P, { w0: { ml: 500 } });
  store.online.value = false;
  await attempt(() => store.write(P, { a: { ml: 250 }, b: { ml: 250 } }));
  const r = await attempt(() => store.write(P, { a: { ml: 250 } }));
  check('undoing an offline entry is allowed', !r.threw, r.message);
  const last = queue()[queue().length - 1];
  check('undoing an offline entry: the merge deletes exactly that row',
    last.merge === true && last.value.b === null && last.value.a,
    JSON.stringify(last.value));

  store.online.value = true;
  await store.flushQueue();
  const after = server.get(U + P);
  check('undoing an offline entry: the row the device never saw is still there',
    after.w0 && after.a && after.b === undefined,
    JSON.stringify(Object.keys(after || {})));
}

reset();
{
  // Online, but the GET fails — the gym-basement case, where navigator.onLine
  // is true and nothing gets through. Before there was a merge to fall back on
  // this was a hard refusal; write()'s own catch used to queue it.
  const P = 'food/log/2026-09-15';
  delMirror(P);
  getThrows = true;
  const r = await attempt(() => store.write(P, { fx: { id: 'fx' } }));
  check('a failed GET does not refuse the write', !r.threw, r.message);
  check('a failed GET: it went out as a merge',
    updateLog.length === 1 && updateLog[0].path === U + P,
    JSON.stringify(updateLog));
}

reset();
{
  // What is still refused: a write that can only be said as a PUT. An array is
  // keyed by index, so merging it would overwrite whichever rows happen to
  // share a position rather than the ones meant.
  const P = 'exercises/hidden';
  delMirror(P);
  store.online.value = false;
  const r = await attempt(() => store.write(P, ['a', 'b']));
  check('an unmeasurable array write still refuses', r.threw, 'write() resolved');
  check('an unmeasurable array write: says to try again online',
    /Try again once you are online/.test(r.message || ''), r.message);
  check('an unmeasurable array write: nothing queued', queue().length === 0);
  check('an unmeasurable array write: no mirror written', mirror(P) === undefined);
}

reset();
{
  // And an empty PUT, which is pure deletion and the one thing that must never
  // go out unmeasured.
  const P = 'food/log/2026-09-15';
  delMirror(P);
  store.online.value = false;
  const r = await attempt(() => store.write(P, {}));
  check('an unmeasurable empty PUT still refuses', r.threw, 'write() resolved');
  check('an unmeasurable empty PUT: nothing queued', queue().length === 0);
}

/* ---------- 8. history is rebuilt, not edited ---------- */

reset();
{
  const P = 'history';
  const before = Object.fromEntries('abcdefgh'.split('').map(k => [k, []]));
  setMirror(P, before);
  server.set(U + P, before);
  const r = await attempt(() => store.write(P, { a: [], b: [] }));
  check('history may shrink freely', !r.threw, r.message);
  check('history shrink: nothing surfaced', blocks.length === 0);
}

/* ---------- 9. a caller that declares its own budget ---------- */

reset();
{
  const P = 'food/meals';
  const before = { m1: {}, m2: {}, m3: {}, m4: {}, m5: {} };
  setMirror(P, before);
  server.set(U + P, before);

  const a = await attempt(() => store.write(P, { m1: {} }));
  check('an undeclared four-row deletion is refused', a.threw, 'write() resolved');

  blocks = [];
  const b = await attempt(() => store.write(P, { m1: {} }, { removes: 4 }));
  check('the same deletion declared as four is allowed', !b.threw, b.message);

  setMirror(P, before);
  const c = await attempt(() => store.write(P, { m1: {} }, { derived: true }));
  check('a derived node is exempt', !c.threw, c.message);
}

/* ---------- 10. a descendant write cannot erase a sibling ---------- */

reset();
{
  const P = 'workouts/2026-09/14/wm3k9x2';
  delMirror(P);
  server.set(U + 'workouts/2026-09', { 14: { other: {} } });
  const r = await attempt(() => store.write(P, { id: 'wm3k9x2' }));
  check('a single-session write is not guarded', !r.threw, r.message);
  check('a single-session write: saved', setLog.includes(U + P));
}

/* ---------- 11. a refused write is not a queued write ---------- */

reset();
{
  // A network failure still queues, exactly as before the guard existed —
  // the guard must not have turned every failure into a refusal.
  const P = 'water/log/2026-09-14';
  setMirror(P, { w1: {}, w2: {} });
  server.set(U + P, { w1: {}, w2: {} });
  setThrows = true;
  const r = await attempt(() => store.write(P, { w1: {}, w2: {}, w3: {} }));
  check('a network failure still queues', !r.threw && queue().length === 1, r.message);
}

/* ---------- report ---------- */

console.log('\ndestructive-write guard\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
