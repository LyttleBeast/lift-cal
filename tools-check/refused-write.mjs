#!/usr/bin/env node
//
// Verifier for what happens when the DATABASE refuses a write.
//
//   node tools-check/refused-write.mjs
//
// A refusal cannot be staged against the rules that are published today — they
// check who is writing and little else, so there is no ordinary payload a real
// account can get rejected. This file is what stands in for that: it drives the
// REAL store.js against a Firebase stub that reports PERMISSION_DENIED exactly
// the way RTDB does, including the detail that a FAILED .validate arrives as
// that same code rather than as a status of its own.
//
// The rig is destructive-write.mjs's, because the two guards live within a few
// lines of each other and a verifier that loads the file differently is testing
// a different file.
//
// What it proves:
//   - a refusal is NOT queued — the queue is for writes that could not be sent,
//     and replaying a rejected payload retries forever and never lands;
//   - the mirror goes back to what it was, in both the had-a-mirror and the
//     no-mirror case, and the partial-mirror mark goes back with it;
//   - the red bar fires and names the path, so a too-strict rule is findable;
//   - the payload is dead-lettered rather than thrown away;
//   - write() REJECTS, so no caller can carry on as though it saved;
//   - a network failure still queues and still resolves — the whole point is
//     that these two are told apart;
//   - the merge branch behaves identically to the set branch;
//   - flushQueue dead-letters a refused item and drops it from the queue, and
//     keeps a network-failed one: never both, never neither;
//   - and one account can neither see nor retry another's items.

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

const byId = new Map();
function mkEl() {
  return {
    id: '', textContent: '', style: { cssText: '' }, children: [],
    setAttribute() {},
    appendChild(c) { this.children.push(c); if (c.id) byId.set(c.id, c); return c; },
    remove() { if (this.id) byId.delete(this.id); }
  };
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
} catch { /* Node may own it; store.online.value is set explicitly below */ }

/* ---------- the fake database ----------
   `fail` is the whole point of this file: 'refuse' is what a rule rejection
   looks like on the wire, 'network' is what a dropped connection looks like,
   and store.js has to do opposite things with them. */

const server = new Map();
let setLog = [], updateLog = [];
let fail = null;                  // null | 'refuse' | 'network'
let refuseOn = null;              // when set, only this exact path is refused
let getThrows = false;            // reachable-but-failing, which is what forces
                                  // writePlan down the merge branch

function denied(kind) {
  // RTDB builds this two different ways depending on which path reported it,
  // which is why store.js checks both fields.
  if (kind === 'code') {
    const e = new Error('permission_denied at /users/u1: Client doesn’t have permission to access the desired data.');
    e.code = 'PERMISSION_DENIED';
    return e;
  }
  return new Error('PERMISSION_DENIED: Permission denied');
}

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
export function onAuthStateChanged(_a, cb) { globalThis.__fb.auth = cb; cb({ uid: 'u1' }); return () => {}; }
export function signInWithEmailAndPassword() {}
export function createUserWithEmailAndPassword() {}
export function sendPasswordResetEmail() {}
export function updateProfile() {}
export function signOut() {}
export function setPersistence() {}
export const browserLocalPersistence = {};
`;

let codeStyle = true;   // alternate between the two error shapes across the file
function maybeFail(path) {
  if (!fail) return;
  if (refuseOn && path !== refuseOn) return;
  if (fail === 'network') throw new Error('network');
  codeStyle = !codeStyle;
  throw denied(codeStyle ? 'code' : 'message');
}

globalThis.__fb = {
  get(r) {
    if (getThrows) throw new Error('network');
    const has = server.has(r.path);
    const v = server.get(r.path);
    return { exists: () => has && v !== null && v !== undefined, val: () => v };
  },
  set(r, v) { maybeFail(r.path); setLog.push(r.path); server.set(r.path, v); },
  update(r, o) {
    maybeFail(r.path);
    updateLog.push({ path: r.path, obj: o });
    const cur = { ...(server.get(r.path) || {}) };
    for (const k of Object.keys(o)) { if (o[k] === null) delete cur[k]; else cur[k] = o[k]; }
    server.set(r.path, cur);
  }
};

/* ---------- load the real store.js against the stub ---------- */

const dir = mkdtempSync(join(tmpdir(), 'rack-refused-'));
writeFileSync(join(dir, 'fb-stub.mjs'), STUB);
writeFileSync(
  join(dir, 'store.mjs'),
  readFileSync(STORE, 'utf8')
    .replace("from './units.js'", 'from UNITS_REAL')
    .replace(/(\bfrom\s+)(['"])[^'"]+\2/g, "$1'./fb-stub.mjs'")
    .replace('from UNITS_REAL',
             'from ' + JSON.stringify(pathToFileURL(join(HERE, '..', 'units.js')).href))
);
const store = await import(pathToFileURL(join(dir, 'store.mjs')).href);

store.watchAuth(() => {});
store.online.value = true;

/* ---------- harness ---------- */

let pass = 0, fail_ = 0;
const results = [];
function check(name, ok, detail) {
  if (ok) { pass++; results.push('  ok   ' + name); }
  else    { fail_++; results.push('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

let blocks = [];
store.onGuardBlock(why => blocks.push(why));
const realError = console.error;

const U = 'users/u1/';
const mirror = p => store.LS.get('mirror:' + p, undefined);
const setMirror = (p, v) => store.LS.set('mirror:' + p, v);
const delMirror = p => store.LS.del('mirror:' + p);
const queue = () => store.LS.get('queue', []);
const dead = () => store.refusedSaves();
const partial = p => !!(store.LS.get('mirrorPartial', {}) || {})[p];

function reset() {
  store_.clear();
  byId.clear();
  body.children.length = 0;
  server.clear();
  setLog = []; updateLog = [];
  fail = null; refuseOn = null; getThrows = false;
  blocks = [];
  store.online.value = true;
}

async function attempt(fn) {
  const said = [];
  console.error = (...a) => said.push(a.join(' '));
  try { await fn(); return { threw: false, said }; }
  catch (e) { return { threw: true, message: String((e && e.message) || e), said }; }
  finally { console.error = realError; }
}

const rows = n => Object.fromEntries(
  Array.from({ length: n }, (_, i) => ['f' + i, { id: 'f' + i, cal: 100 + i }])
);

/* ---------- 1. a refused PUT ---------- */

reset();
{
  const P = 'food/targets';                       // not a container: a plain PUT
  const before = { cal: 2100, p: 190, f: 70 };
  setMirror(P, before);
  server.set(U + P, before);
  fail = 'refuse';

  const r = await attempt(() => store.write(P, { cal: 9999, p: 190, f: 70 }));

  check('a refused write REJECTS', r.threw, 'write() resolved');
  check('a refused write is NOT queued', queue().length === 0, JSON.stringify(queue()));
  check('the mirror is rolled back to what it was',
    JSON.stringify(mirror(P)) === JSON.stringify(before), JSON.stringify(mirror(P)));
  check('the server is untouched',
    JSON.stringify(server.get(U + P)) === JSON.stringify(before));
  check('the red bar fires', byId.has('writeBlock') && blocks.length === 1, JSON.stringify(blocks));
  check('and names the path', /food\/targets/.test(blocks[0] || ''), blocks[0]);
  check('and says it was the database, not the guard',
    /REFUSED BY THE DATABASE/.test(blocks[0] || ''), blocks[0]);
  check('and says retrying will not help',
    /retrying cannot fix it/.test(blocks[0] || ''), blocks[0]);
  check('the message reaches the console too', r.said.length === 1);
  check('the payload is dead-lettered', dead().length === 1, JSON.stringify(dead()));
  check('dead-lettered with the full path, the value and a time',
    dead()[0].path === U + P && dead()[0].value.cal === 9999 &&
    dead()[0].merge === false && dead()[0].at > 0, JSON.stringify(dead()[0]));
  check('and with the database’s own words, so the rule is findable',
    /permission/i.test(dead()[0].detail || ''), dead()[0].detail);
  check('what write() throws is what the bar says', r.message === blocks[0]);
}

/* ---------- 2. a refused PUT over a node with NO mirror ----------
   `undefined` there means "this device has never read that node", and it is
   load-bearing: leaving the refused value behind would tell the next write it
   had a picture of the server. */

reset();
{
  const P = 'settings/steps';
  delMirror(P);
  fail = 'refuse';
  const r = await attempt(() => store.write(P, { goal: 12000 }));

  check('no-mirror case: still rejects', r.threw);
  check('no-mirror case: the mirror is REMOVED, not left holding the refusal',
    mirror(P) === undefined, JSON.stringify(mirror(P)));
  check('no-mirror case: nothing queued', queue().length === 0);
  check('no-mirror case: dead-lettered', dead().length === 1);
}

reset();
{
  // A mirrored null is a real value — "the database says this node is empty" —
  // and must not come back as "never read".
  const P = 'settings/steps';
  setMirror(P, null);
  fail = 'refuse';
  await attempt(() => store.write(P, { goal: 12000 }));
  check('a mirrored null is restored as null, not deleted',
    mirror(P) === null && store.LS.get('mirror:' + P, 'MISSING') !== 'MISSING',
    JSON.stringify(mirror(P)));
}

/* ---------- 3. the partial-mirror mark goes back with the value ---------- */

reset();
{
  // Get the path marked partial the honest way: an offline first-of-the-day
  // write over a node this device has never read goes out as a merge and marks
  // it. Then a refusal on the next write must leave that mark exactly as it was.
  const P = 'food/log/2026-09-16';
  delMirror(P);
  server.set(U + P, rows(4));
  store.online.value = false;
  await attempt(() => store.write(P, { fx: { id: 'fx' } }));
  check('setup: the path is marked partial', partial(P) === true);

  store.online.value = true;
  fail = 'refuse';
  const r = await attempt(() => store.write(P, { fx: { id: 'fx' }, fy: { id: 'fy' } }));
  check('a refusal on a partial mirror rejects', r.threw);
  check('and the partial mark is still set afterwards', partial(P) === true);
  check('and the mirror holds the value it held before the refusal',
    JSON.stringify(Object.keys(mirror(P) || {})) === JSON.stringify(['fx']),
    JSON.stringify(mirror(P)));
}

reset();
{
  // …and the other direction: a path that was NOT partial must not become so.
  const P = 'food/items';
  setMirror(P, rows(3));
  server.set(U + P, rows(3));
  fail = 'refuse';
  await attempt(() => store.write(P, rows(4)));
  check('a clean mirror is not marked partial by a refusal', partial(P) === false);
}

/* ---------- 4. a network failure is not a refusal ---------- */

reset();
{
  const P = 'food/targets';
  const before = { cal: 2100 };
  setMirror(P, before);
  server.set(U + P, before);
  fail = 'network';

  const r = await attempt(() => store.write(P, { cal: 2200 }));
  check('a network failure RESOLVES', !r.threw, r.message);
  check('a network failure is queued', queue().length === 1, JSON.stringify(queue()));
  check('a network failure is NOT dead-lettered', dead().length === 0);
  check('a network failure says nothing on screen', blocks.length === 0);
  check('and the mirror keeps the value, because the write is still coming',
    JSON.stringify(mirror(P)) === JSON.stringify({ cal: 2200 }), JSON.stringify(mirror(P)));
}

/* ---------- 5. the merge branch behaves identically ---------- */

reset();
{
  // Online, but the GET fails — the gym-basement case. There is no honest
  // measurement to make, so the write goes out as a merge instead of a PUT…
  // and then the merge is the thing the rules refuse.
  const P = 'water/log/2026-09-16';
  delMirror(P);
  server.set(U + P, { w0: { ml: 500 } });
  getThrows = true;
  fail = 'refuse';

  const r = await attempt(() => store.write(P, { wa: { ml: 250 } }));
  check('merge path: it really was a merge', updateLog.length === 0 && setLog.length === 0,
    'set ' + setLog.length + ' / update ' + updateLog.length);
  check('merge path: a refused merge rejects', r.threw, 'write() resolved');
  check('merge path: nothing queued', queue().length === 0, JSON.stringify(queue()));
  check('merge path: the mirror is back to having none',
    mirror(P) === undefined, JSON.stringify(mirror(P)));
  check('merge path: the partial mark did not survive either', partial(P) === false);
  check('merge path: the red bar fired', blocks.length === 1);
  check('merge path: dead-lettered AS a merge',
    dead().length === 1 && dead()[0].merge === true, JSON.stringify(dead()[0]));
  check('merge path: the payload kept is the merge, not the whole node',
    JSON.stringify(Object.keys(dead()[0].value)) === JSON.stringify(['wa']),
    JSON.stringify(dead()[0].value));
}

/* ---------- 6. flushQueue: dead-letter or keep, never both ---------- */

reset();
{
  const A = U + 'food/log/2026-09-16';
  const B = U + 'water/log/2026-09-16';
  store.online.value = false;
  await attempt(() => store.write('food/log/2026-09-16', { fa: { id: 'fa' } }));
  await attempt(() => store.write('water/log/2026-09-16', { wa: { ml: 250 } }));
  check('setup: two writes queued', queue().length === 2, JSON.stringify(queue()));

  store.online.value = true;
  fail = 'refuse';
  refuseOn = A;                              // one refused, one fine
  const r = await attempt(() => store.flushQueue());

  check('flushQueue does not throw on a refusal', !r.threw, r.message);
  check('the refused item LEFT the queue', queue().length === 0, JSON.stringify(queue()));
  check('the refused item is dead-lettered', dead().length === 1, JSON.stringify(dead()));
  check('the one that landed is not dead-lettered', dead()[0].path === A, dead()[0].path);
  check('and it really did land', server.has(B));
  check('the refusal is on screen', blocks.length === 1 && /water|food/.test(blocks[0]));
  check('and the refused path’s mirror is gone, not left claiming a save',
    mirror('food/log/2026-09-16') === undefined,
    JSON.stringify(mirror('food/log/2026-09-16')));
}

reset();
{
  // The other half of "never both, never neither": a network failure on replay
  // stays queued and is not dead-lettered.
  store.online.value = false;
  await attempt(() => store.write('food/targets', { cal: 2200 }));
  store.online.value = true;
  fail = 'network';
  await attempt(() => store.flushQueue());
  check('a replay that could not be sent stays queued', queue().length === 1);
  check('and is not dead-lettered', dead().length === 0);
}

/* ---------- 7. the list is bounded, and a session is not what goes ---------- */

reset();
{
  fail = 'refuse';
  // 50 refused sessions, then one more of each kind.
  for (let i = 0; i < 50; i++) {
    await attempt(() => store.write('workouts/2026-09/16/w' + i, { id: 'w' + i }));
  }
  check('the list stops at 50', dead().length === 50, String(dead().length));
  check('and they are all sessions', dead().every(x => /workouts\//.test(x.path)));

  const first = dead()[0].path;
  await attempt(() => store.write('workouts/2026-09/16/wNEW', { id: 'wNEW' }));
  check('a new session evicts the oldest session', dead().length === 50 &&
    !dead().some(x => x.path === first) &&
    dead().some(x => /wNEW/.test(x.path)), dead().length + ' ' + first);
}

reset();
{
  fail = 'refuse';
  await attempt(() => store.write('food/targets', { cal: 1 }));
  for (let i = 0; i < 49; i++) {
    await attempt(() => store.write('workouts/2026-09/16/w' + i, { id: 'w' + i }));
  }
  check('setup: one ordinary item and 49 sessions', dead().length === 50);

  await attempt(() => store.write('workouts/2026-09/16/wNEW', { id: 'wNEW' }));
  check('the ordinary item is what makes room for a session',
    !dead().some(x => x.path.endsWith('food/targets')) &&
    dead().some(x => /wNEW/.test(x.path)) &&
    dead().filter(x => /workouts\//.test(x.path)).length === 50,
    JSON.stringify(dead().map(x => x.path.slice(U.length)).slice(0, 3)));
}

/* ---------- 7b. a full list of sessions drops the INCOMING ordinary item ----
   v40's code said `if (at === -1) at = 0`, which dropped the oldest SESSION to
   make room for a water log — the exact trade the paragraph above it forbids.
   Native's branch, adopted word for word: when every item is a session and the
   incoming one is not, the incoming one is what does not fit. The red bar has
   already fired, so the payload is dropped but the refusal is not silent. */

reset();
{
  fail = 'refuse';
  for (let i = 0; i < 50; i++) {
    await attempt(() => store.write('workouts/2026-09/16/w' + i, { id: 'w' + i }));
  }
  const before = dead().map(x => x.path);
  const r = await attempt(() => store.write('water/log/2026-09-17', { wa: { ml: 250 } }));

  check('a water log cannot evict a finished session', dead().length === 50 &&
    JSON.stringify(dead().map(x => x.path)) === JSON.stringify(before),
    JSON.stringify(dead().map(x => x.path.slice(U.length)).slice(0, 2)));
  check('and the water log is not in the list either — it is the one that was dropped',
    !dead().some(x => /water\//.test(x.path)));
  check('the refusal still threw, so nothing upstream thinks it saved', r.threw);
  check('and the red bar still said so', blocks.some(b => /REFUSED BY THE DATABASE/.test(b)));
  check('every session that was there is still there, in the order it arrived',
    dead().length === 50 && dead()[0].path.endsWith('w0') && dead()[49].path.endsWith('w49'));

  // Among sessions, oldest out still applies — both directions lose one, so
  // the stated default wins.
  await attempt(() => store.write('workouts/2026-09/16/wLAST', { id: 'wLAST' }));
  check('but a session still evicts the oldest session', dead().length === 50 &&
    !dead().some(x => x.path.endsWith('w0')) && dead().some(x => /wLAST/.test(x.path)));
}

/* ---------- 7c. the workouts CONTAINER counts as a session too ---------- */

reset();
{
  fail = 'refuse';
  for (let i = 0; i < 49; i++) {
    await attempt(() => store.write('workouts/2026-09/16/w' + i, { id: 'w' + i }));
  }
  // `/\/workouts(\/|$)/`, native's spelling: a write to the container itself is
  // protected the same way a write to one month inside it is.
  await attempt(() => store.write('workouts', { '2026-09': {} }, { erase: 99 }));
  const had = dead().length;
  await attempt(() => store.write('water/log/2026-09-17', { wa: { ml: 250 } }));
  check('a write to workouts itself is a session for eviction purposes',
    had === 50 && dead().length === 50 && !dead().some(x => /water\//.test(x.path)),
    had + ' -> ' + dead().length);
}

/* ---------- 7d. two refusals of one path in one millisecond ----------
   `at + '|' + path` is not unique, and a merge and a set from the same handler
   is the ordinary way to produce two of them. With one handle between them,
   Discard removed the wrong row and Try again retried it. */

reset();
{
  fail = 'refuse';
  const P = 'food/log/2026-09-17';
  // The clock is frozen for the two writes, so `at` really does collide rather
  // than usually colliding. That is the whole case.
  const realNow = Date.now;
  Date.now = () => 1789307130123;
  await attempt(() => store.write(P, { a: 1 }));
  await attempt(() => store.write(P, { b: 2 }));
  Date.now = realNow;

  const list = dead();
  check('the two refusals really did land on the same millisecond and path',
    list.length === 2 && list[0].at === list[1].at && list[0].path === list[1].path,
    JSON.stringify(list.map(x => [x.at, x.path])));
  check('which under v40’s handle would have been one row',
    list[0].at + '|' + list[0].path === list[1].at + '|' + list[1].path);
  check('both refusals are kept', list.length === 2, JSON.stringify(list.map(x => x.key)));
  check('and they do not share a handle, even at the same millisecond and path',
    list[0].key !== list[1].key, JSON.stringify(list.map(x => x.key)));
  check('the handle is the item’s own id', list.every(x => x.key === x.id && /-/.test(x.id)),
    JSON.stringify(list.map(x => x.id)));

  const gone = list[0].key;
  check('discarding one removes exactly one', store.discardRefused(gone) && dead().length === 1);
  check('and it removes the RIGHT one', dead()[0].key === list[1].key);
}

/* ---------- 7e. an item written before ids existed stays retryable ---------- */

reset();
{
  // Exactly v40's shape: no id at all.
  const old = { path: U + 'food/targets', value: { cal: 2222 }, merge: false,
                at: 1789307130123, detail: '' };
  store.LS.set('refused', [old]);
  const list = dead();
  check('an old item is still listed', list.length === 1, JSON.stringify(list));
  check('and its handle is still the composite it has always been',
    list[0].key === old.at + '|' + old.path, list[0].key);

  fail = null;
  const r = await store.retryRefused(list[0].key);
  check('and it can still be retried by that handle', r === 'saved', String(r));
  check('after which it is gone from the list', dead().length === 0);
}

/* ---------- 8. retry and discard ---------- */

reset();
{
  const P = 'food/targets';
  fail = 'refuse';
  await attempt(() => store.write(P, { cal: 2222 }));
  const key = dead()[0].key;

  // Still refused: the item stays, because the rule may be what is wrong and
  // the payload is the only copy of what was typed.
  check('retry while still refused reports a refusal',
    await store.retryRefused(key) === 'refused');
  check('and leaves the item where it is', dead().length === 1);

  store.online.value = false;
  check('retry while offline says so rather than claiming a refusal',
    await store.retryRefused(key) === 'offline');
  check('and still leaves it', dead().length === 1);

  store.online.value = true;
  fail = null;
  check('a retry that lands reports saved', await store.retryRefused(key) === 'saved');
  check('and the item is gone', dead().length === 0);
  check('and the value really is on the server',
    JSON.stringify(server.get(U + P)) === JSON.stringify({ cal: 2222 }));
  check('and the mirror is back in step with it',
    JSON.stringify(mirror(P)) === JSON.stringify({ cal: 2222 }), JSON.stringify(mirror(P)));
  check('retrying something already gone says so',
    await store.retryRefused(key) === 'gone');
}

reset();
{
  fail = 'refuse';
  await attempt(() => store.write('food/targets', { cal: 1 }));
  await attempt(() => store.write('settings/steps', { goal: 1 }));
  const key = dead()[0].key;
  check('discard removes exactly one', store.discardRefused(key) === true && dead().length === 1);
  check('and it is the other one that is left', /settings\/steps/.test(dead()[0].path));
  check('discarding it again is a no-op', store.discardRefused(key) === false);
}

/* ---------- 9. one account never sees another's ---------- */

reset();
{
  fail = 'refuse';
  await attempt(() => store.write('food/targets', { cal: 1 }));
  check('setup: u1 has one', dead().length === 1);
  const key = dead()[0].key;

  // Forge an item addressed to another account into THIS account's list. The
  // localStorage key is namespaced, so this cannot happen by accident — which
  // is exactly why the prefix check has to be what stops it rather than luck.
  const raw = JSON.parse(store_.get('rack:u1:refused'));
  raw.push({ path: 'users/u2/food/targets', value: { cal: 9 }, merge: false, at: 1, detail: '' });
  store_.set('rack:u1:refused', JSON.stringify(raw));

  check('another account’s item is not listed', dead().length === 1, JSON.stringify(dead()));
  check('and cannot be retried', await store.retryRefused('1|users/u2/food/targets') === 'gone');
  check('retrying it drops it rather than leaving it to be found again',
    JSON.parse(store_.get('rack:u1:refused')).length === 1);
  check('u1’s own item is untouched by any of that',
    dead().length === 1 && dead()[0].key === key);
}

/* ---------- 10. erasing this device's copy takes the list with it ---------- */

reset();
{
  fail = 'refuse';
  await attempt(() => store.write('food/targets', { cal: 1 }));
  check('setup: one dead letter', dead().length === 1);
  store.purgeDevice();
  check('"erase this device’s copy" clears the refused list', dead().length === 0,
    JSON.stringify(dead()));
}

/* ---------- 11. the guard's refusal is still the guard's ---------- */

reset();
{
  // A write the destructive-write guard refuses never reaches the network, so
  // it must NOT land in the dead-letter list — there is nothing to retry, the
  // data on the server was never in danger, and the message is a different one.
  const P = 'food/log/2026-09-16';
  setMirror(P, rows(5));
  server.set(U + P, rows(5));
  const r = await attempt(() => store.write(P, {}));
  check('a guard refusal still rejects', r.threw);
  check('a guard refusal is not dead-lettered', dead().length === 0, JSON.stringify(dead()));
  check('and still says what it always said',
    /removed 5 items/.test(r.message || ''), r.message);
}

/* ---------- report ---------- */

console.log('\nrefused writes — a save the database refused says so\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail_ + ' failed\n');
process.exit(fail_ ? 1 : 0);
