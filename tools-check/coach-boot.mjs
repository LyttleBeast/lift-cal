#!/usr/bin/env node
//
// Verifier for how long the first card on the screen waits.
//
//   node tools-check/coach-boot.mjs
//
// The app opens on You and the Coach card is the top of it. On the live site
// that card sat on its skeleton for over three seconds — read at one second and
// again at two, both times still loading — and the sentence it eventually
// showed was correct. It was only late, which on the screen the app opens to is
// most of the way to being absent.
//
// Two stacked mistakes made it, and neither was about doing too much work. Both
// were about ORDER. load() awaited four round trips one after another when not
// one of them needed an answer from the one before it; and initCoachData() was
// called from the bottom of initYou(), behind that screen's own eight-node wave
// and behind the weight model refitting, so those four did not even begin until
// two awaited stages had finished.
//
// WHY THIS MEASURES DEPTH AND NOT SECONDS. Wall-clock in Node measures nothing
// real: there is no network, no connection setup, no paint, and a machine with
// a faster disk would report a "better" number for a load that is exactly as
// deep. What cost the three seconds was depth — how many round trips deep the
// longest path through the load is — and depth is exact, reproducible and the
// same on every machine. So store.js is stubbed with reads that resolve after a
// fixed LATENCY, and the stub counts WAVES: a wave is in-flight reads going
// from zero to non-zero, which is one round trip's worth of waiting however
// many requests are packed into it. The boot load must be ONE wave. It was four.
//
// The stub models store.js's ONLINE branch and only that, deliberately. Offline,
// read() answers out of the localStorage mirror and readExact() out of the same
// (store.js:709, store.js:730) — both resolve in a microtask, four stacked
// awaits cost nothing, and the defect this file exists to fence is invisible.
// `online` is exported as true for any module that asks.
//
// What else it fences, all of it driven rather than read off the source:
//
//   - the LOG PHASE is a real phase. The tree and the settings node decide
//     whether Coach may speak at all, so logKnown flips on those two alone and
//     never later than ready, and coachLogReady() resolves rather than being a
//     promise nothing settles.
//   - a FAILED read resolves the load. Every surface paints a skeleton until
//     coachReady() flips, so a load that can hang is a card that can hang, and
//     an unreachable tree has to leave the log 'unknown' rather than 'empty'.
//   - NOTHING is read on a paint, and the rotation counter moves once per app
//     open rather than once per snapshot.
//   - and the two call sites: initCoachData() before the first await in both
//     initYou() and initWorkout(), and fired rather than awaited.
//
// picker.js is staged against the same stub and its three exercise reads would
// be counted like any other. They never fire — they live in initPicker(), which
// the boot path does not call — and section A asserts that, so picker is
// attributed rather than quietly excused.
//
// coach-pure.mjs reads load()'s source for the same property. This file drives
// it. Both are worth having: the regex catches a rewrite that looks serial, and
// this catches one that looks parallel and is not.

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

/* ---------- the fake browser ----------
   A Map behind localStorage, because the rotation counter is device state and
   section D is about it surviving the app being closed and opened again. */
const device = new Map();
globalThis.localStorage = {
  getItem: k => (device.has(k) ? device.get(k) : null),
  setItem: (k, v) => device.set(k, String(v)),
  removeItem: k => device.delete(k),
  key: i => Array.from(device.keys())[i] ?? null,
  get length() { return device.size; }
};
globalThis.window = { addEventListener() {} };
function mkEl() {
  return {
    id: '', className: '', textContent: '', innerHTML: '', style: {}, children: [],
    dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, addEventListener() {}, appendChild(c) { this.children.push(c); return c; },
    querySelector: () => null, querySelectorAll: () => [], remove() {}
  };
}
globalThis.document = {
  body: mkEl(),
  documentElement: mkEl(),
  getElementById: () => null,
  createElement: () => mkEl(),
  createElementNS: () => mkEl(),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {}
};
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true }, configurable: true, writable: true
  });
} catch { /* Node may own it; the stub states online.value itself */ }

/* ---------- the instrument ----------
   One round trip per call, and a count of the moments the device went from
   idle to busy. `*` in FAIL is every path at once — a boot with nothing
   readable at all, without this file holding a list of the nodes Coach reads. */
const STUB = `
export const online = { value: true };

const LATENCY = __LATENCY__;
const DATA    = __DATA__;
const SLOW    = new Set(__SLOW__);
const FAIL    = new Set(__FAIL__);

let inflight = 0, waves = 0;
const reads  = [];
const writes = [];
const lsGets = new Map();
const T0 = Date.now();

function fails(path) { return FAIL.has('*') || FAIL.has(path); }

function trip(path) {
  if (inflight === 0) waves++;
  inflight++;
  reads.push({ path, wave: waves, at: Date.now() - T0 });
  return new Promise((res, rej) => setTimeout(() => {
    inflight--;
    if (fails(path)) rej(new Error('unreachable: ' + path));
    else res(Object.prototype.hasOwnProperty.call(DATA, path) ? DATA[path] : undefined);
  }, SLOW.has(path) ? LATENCY * 3 : LATENCY));
}

// read() folds a failure into the fallback; readExact() is the one that throws.
export async function read(path, fallback = null) {
  let v;
  try { v = await trip(path); } catch { return fallback; }
  return v === undefined ? fallback : v;
}
export async function readExact(path) {
  const v = await trip(path);
  return v === undefined ? null : v;
}

export async function write(path, value) { writes.push({ path, value }); }
export async function readShared() { return null; }
export async function writeShared() {}
export async function removeShared() {}
export async function updateShared() {}
export function watchShared() { return () => {}; }
export async function logout() {}
export function uid() { return 'boot-test'; }
export function wu() { return 'lb'; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

export const LS = {
  get(k, fallback) {
    lsGets.set(k, (lsGets.get(k) || 0) + 1);
    try { const v = localStorage.getItem('rack:boot:' + k); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(k, v) { try { localStorage.setItem('rack:boot:' + k, JSON.stringify(v)); } catch {} },
  del(k)    { try { localStorage.removeItem('rack:boot:' + k); } catch {} }
};

export const probe = {
  latency: LATENCY,
  waves:  () => waves,
  reads:  () => reads.map(r => ({ path: r.path, wave: r.wave, at: r.at })),
  paths:  () => reads.map(r => r.path),
  writes: () => writes.length,
  lsGets: k => lsGets.get(k) || 0
};
`;

const LATENCY = 60;
const TMP = mkdtempSync(join(tmpdir(), 'rack-coach-boot-'));
let rigN = 0;

/* A whole module graph per rig, because module state is the subject: `ready`,
   `logKnown` and the rotation counter are all set once and a second import of
   the same URL would hand back the first rig's finished snapshot. */
async function rig({ data = {}, slow = [], fail = [] } = {}) {
  const dir = join(TMP, 'r' + (++rigN));
  mkdirSync(dir);
  const put  = (f, body) => { writeFileSync(join(dir, f), body); return JSON.stringify(pathToFileURL(join(dir, f)).href); };
  const swap = (s, pairs) => pairs.reduce((acc, [from, to]) => acc.replace("from '" + from + "'", 'from ' + to), s);

  const STORE = put('store-stub.mjs', STUB
    .replace('__LATENCY__', String(LATENCY))
    .replace('__DATA__', JSON.stringify(data))
    .replace('__SLOW__', JSON.stringify(slow))
    .replace('__FAIL__', JSON.stringify(fail)));

  const USAGE  = put('usage.mjs',  swap(src('usage.js'), [['./store.js', STORE]]));
  const ANALY  = put('analytics.mjs', swap(src('analytics.js'), [
    ['./store.js', STORE], ['./exercises.js', real('exercises.js')],
    ['./ui.js', real('ui.js')], ['./units.js', real('units.js')]]));
  const WMODEL = put('weightmodel.mjs', swap(src('weightmodel.js'), [
    ['./store.js', STORE], ['./ui.js', real('ui.js')]]));
  const TDEE   = put('tdee.mjs', swap(src('tdee.js'), [
    ['./store.js', STORE], ['./ui.js', real('ui.js')], ['./weightmodel.js', WMODEL]]));
  const INSI   = put('insights.mjs', swap(src('insights.js'), [
    ['./store.js', STORE], ['./ui.js', real('ui.js')],
    ['./analytics.js', ANALY], ['./units.js', real('units.js')]]));
  const PICK   = put('picker.mjs', swap(src('picker.js'), [
    ['./exercises.js', real('exercises.js')], ['./store.js', STORE],
    ['./analytics.js', ANALY], ['./usage.js', USAGE], ['./ui.js', real('ui.js')]]));
  const ACCESS = put('access.mjs', swap(src('access.js'), [
    ['./store.js', STORE], ['./firebase-config.js', real('firebase-config.js')],
    ['./accounts.js', real('accounts.js')], ['./ui.js', real('ui.js')]]));
  const BUILD  = put('coach-build.mjs', swap(src('coach-build.js'), [
    ['./exercises.js', real('exercises.js')], ['./analytics.js', ANALY],
    ['./units.js', real('units.js')], ['./blocks.js', real('blocks.js')],
    ['./coach-tags.js', real('coach-tags.js')]]));
  const COACH  = put('coach.mjs', swap(src('coach.js'), [
    ['./exercises.js', real('exercises.js')], ['./analytics.js', ANALY],
    ['./units.js', real('units.js')], ['./coach-build.js', BUILD]]));
  const DATA_  = put('coach-data.mjs', swap(src('coach-data.js'), [
    ['./store.js', STORE], ['./exercises.js', real('exercises.js')],
    ['./picker.js', PICK], ['./tdee.js', TDEE], ['./insights.js', INSI],
    ['./access.js', ACCESS], ['./coach.js', COACH]]));

  const S = await import(JSON.parse(STORE));
  const D = await import(JSON.parse(DATA_));
  return { S, D, probe: S.probe };
}

/* A promise that cannot make this file hang: a load that never settles is one
   of the things under test, so waiting on it forever would report as a timeout
   in CI rather than as a failed check. */
function withTimeout(p, ms) {
  let t;
  return Promise.race([
    Promise.resolve(p).then(v => ({ ok: true, v }), e => ({ ok: true, v: e, threw: true })),
    new Promise(res => { t = setTimeout(() => res({ ok: false }), ms); })
  ]).finally(() => clearTimeout(t));
}

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 8).join(', ') + (xs.length > 8 ? ' … (' + xs.length + ')' : '');
const xL   = ms => (ms / LATENCY).toFixed(2) + '× LATENCY';

/* A log with something in it, so 'readable' is distinguishable from the two
   other answers the tree read can give. */
const DAY = 864e5;
const NOW = Date.now();
const key = ms => {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return [d.getFullYear() + '-' + p(d.getMonth() + 1), p(d.getDate())];
};
const TREE = {};
for (let i = 1; i <= 6; i++) {
  const [mk, dd] = key(NOW - i * 3 * DAY);
  TREE[mk] = TREE[mk] || {};
  TREE[mk][dd] = { ['s' + i]: {
    id: 's' + i, startedAt: NOW - i * 3 * DAY,
    exercises: [{ exId: 'barbell-bench-press', name: 'Bench', group: 'chest', equipment: 'barbell',
                  sets: [{ w: '185', r: '5', type: 'N', done: true }] }]
  } };
}
const FULL = { workouts: TREE };

/* ================= 0. THE INSTRUMENT ITSELF ================= */
section('0. the wave counter can count past one');
{
  const { S } = await rig({});
  await S.read('a', null);
  await S.read('b', null);
  check('two reads awaited one after the other are two waves', S.probe.waves() === 2,
        String(S.probe.waves()));
  await Promise.all([S.read('c', null), S.read('d', null), S.readExact('e')]);
  check('three issued together are one more, not three', S.probe.waves() === 3, String(S.probe.waves()));
  check('and a wave really is a round trip — five reads, three waits',
        S.probe.paths().length === 5, list(S.probe.paths()));
}

/* ================= A. THE BOOT IS ONE WAVE ================= */
section('A. the boot load is one round trip deep');
let bootWaves = 0, bootMs = 0, bootReads = 0;
{
  const { D, probe } = await rig({ data: FULL });
  const t0 = Date.now();
  const done = await withTimeout(D.initCoachData(), 40 * LATENCY);
  bootMs = Date.now() - t0;
  bootWaves = probe.waves();
  bootReads = probe.paths().length;

  check('the load resolves', done.ok && !done.threw, JSON.stringify(done.v));
  check('every read Coach makes at boot goes out in ONE wave',
        bootWaves === 1, bootWaves + ' waves: ' + list(probe.reads().map(r => r.wave + ':' + r.path)));
  check('and there is more than one of them in it, so one wave is not one read',
        bootReads > 1, String(bootReads));
  const out = probe.reads();
  check('every one of them left the device before the first answer came home',
        out.every(r => r.at - out[0].at < LATENCY), list(out.map(r => r.path + '@' + r.at + 'ms')));
  check('the whole load costs one latency, not four', bootMs < 2 * LATENCY, xL(bootMs));

  // picker.js is staged against the same stub; its reads are in initPicker(),
  // which the boot path never calls. Observed, rather than excluded by hand.
  check('picker’s own three nodes are not among them — the boot path does not call initPicker()',
        !probe.paths().some(p => /^exercises\//.test(p)), list(probe.paths()));
  check('the tree is read at boot, which is the read that tells absent from unreachable',
        probe.paths().includes('workouts'), list(probe.paths()));
  check('and the boot writes nothing', probe.writes() === 0, String(probe.writes()));

  check('both flags are up when it resolves', D.coachReady() === true && D.coachLogKnown() === true);
  check('and the log it found is readable, not empty and not unknown',
        D.coachInput({}).log === 'readable', D.coachInput({}).log);

  /* Nothing on a paint. The You tab already issues around seven live GETs per
     render; a snapshot that read anything would multiply that by every repaint
     the unawaited loads trigger. */
  const after = probe.paths().length;
  const shots = [];
  for (let i = 0; i < 5; i++) shots.push(D.coachInput({}));
  check('five paints in a row read nothing at all', probe.paths().length === after, String(probe.paths().length - after));
  check('and the rotation counter is read once per open, not once per snapshot',
        probe.lsGets('coachOpens') === 1, String(probe.lsGets('coachOpens')));
  check('so the greeting cannot rotate under a reader’s thumb as the loads land',
        new Set(shots.map(s => s.opens)).size === 1, list(shots.map(s => String(s.opens))));

  const again = await withTimeout(D.initCoachData(), 40 * LATENCY);
  check('a second tab asking for the snapshot gets the same promise and issues no new reads',
        again.ok && probe.paths().length === after, String(probe.paths().length - after));
}

/* ================= B. THE LOG PHASE ================= */
section('B. the card speaks when the LOG is known, not when everything has landed');
{
  // Food, weight, steps and routines put on a long tail, so the two phases are
  // separated by something bigger than scheduling noise.
  const slow = ['food/targets', 'food/daySummaries', 'weight/entries', 'steps', 'routines'];
  const { D, probe } = await rig({ data: FULL, slow });
  const t0 = Date.now();
  const marks = {};
  const logP = D.coachLogReady().then(() => {
    marks.log = Date.now() - t0;
    marks.known = D.coachLogKnown();
    marks.ready = D.coachReady();
    marks.input = D.coachInput({});
  });
  const done = await withTimeout(D.initCoachData(), 40 * LATENCY);
  marks.done = Date.now() - t0;
  const settled = await withTimeout(logP, 10 * LATENCY);

  check('coachLogReady() resolves rather than being a promise nothing settles', settled.ok);
  check('the log phase lands strictly before the rest of the snapshot',
        marks.log < marks.done, xL(marks.log) + ' vs ' + xL(marks.done));
  check('logKnown is up at that moment', marks.known === true);
  check('and ready is not — they are two flags because they are two questions',
        marks.ready === false, String(marks.ready));
  check('the card can already say something true about training',
        marks.input && marks.input.log === 'readable' && marks.input.sessions.length > 0,
        marks.input && marks.input.log);
  check('while the fuel facts are still null rather than guessed at',
        marks.input && marks.input.targetsSet === null, marks.input && String(marks.input.targetsSet));
  check('and the two are a whole round trip apart, not a scheduling accident',
        marks.done - marks.log > LATENCY, xL(marks.done - marks.log) + ' apart');
  check('and the tail did not cost a second wave', probe.waves() === 1, String(probe.waves()));
}

/* ================= C. A READ THAT FAILS ================= */
section('C. a failed read resolves the load — a card that hangs is worse than one that is quiet');
{
  const { D, probe } = await rig({ fail: ['workouts'] });
  const done = await withTimeout(D.initCoachData(), 40 * LATENCY);
  check('an unreachable tree still resolves the load', done.ok && !done.threw,
        done.ok ? '' : 'timed out');
  check('and the log is unknown, never empty — a timeout is not a new account',
        D.coachInput({}).log === 'unknown', D.coachInput({}).log);
  check('ready still flips, so every surface stops painting a skeleton',
        D.coachReady() === true);
  check('the log phase settles too', (await withTimeout(D.coachLogReady(), 10 * LATENCY)).ok);
  check('and the failure is not retried under the card', probe.waves() === 1, String(probe.waves()));

  const nothing = await rig({ fail: ['*'] });
  const all = await withTimeout(nothing.D.initCoachData(), 40 * LATENCY);
  check('with NOTHING readable at all the load still resolves in one wave',
        all.ok && !all.threw && nothing.probe.waves() === 1, String(nothing.probe.waves()));
  check('and Coach knows it has not seen the log',
        nothing.D.coachInput({}).log === 'unknown', nothing.D.coachInput({}).log);
  check('and says out loud that the settings on screen are defaults',
        nothing.D.coachSettingsKnown() === false);
}

/* ================= D. ONCE PER OPEN ================= */
section('D. the rotation counter moves once per app open');
{
  device.clear();
  const first = await rig({ data: FULL });
  await withTimeout(first.D.initCoachData(), 40 * LATENCY);
  const a = first.D.coachInput({}).opens;

  const second = await rig({ data: FULL });
  const loading = second.D.initCoachData();
  // Read back before a single answer has come home. The counter is device
  // state, so the very first paint has the right one — a value that had to be
  // read would still be zero here and would move under the reader a moment
  // later, which is the bug the seed off the wall clock used to have.
  const early = second.D.coachInput({}).opens;
  await withTimeout(loading, 40 * LATENCY);
  const b = second.D.coachInput({}).opens;

  check('a fresh device starts the counter at one', a === 1, String(a));
  check('closing the app and opening it again moves it by exactly one', b === a + 1, a + ' then ' + b);
  check('and it is settled before the first read comes home, so the first paint has it',
        early === b, early + ' then ' + b);
}

/* ================= E. WHERE IT IS CALLED FROM ================= */
section('E. both tabs ask for it before their own first await');
{
  // Comments stripped: both of these functions explain in prose that the call
  // belongs in front of the first await, and the word `await` appears in that
  // prose. A verifier that read the documentation would pass on code that had
  // been rearranged underneath it.
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  const body = (code, sig) => (code.split(sig)[1] || '').split('\n}')[0];

  const Y = body(strip(src('you.js')), 'export async function initYou(');
  const W = body(strip(src('workout.js')), 'export async function initWorkout(');

  const where = b => ({ call: b.indexOf('initCoachData('), wait: b.search(/\bawait\b/) });
  const y = where(Y), w = where(W);

  check('initYou() has both a call and an await to compare', y.call !== -1 && y.wait !== -1,
        JSON.stringify(y));
  check('and it asks Coach for its snapshot BEFORE the first one',
        y.call !== -1 && y.call < y.wait, 'call at ' + y.call + ', first await at ' + y.wait);
  check('initWorkout() has both as well', w.call !== -1 && w.wait !== -1, JSON.stringify(w));
  check('and it asks first too — Train can be the tab the app opens on',
        w.call !== -1 && w.call < w.wait, 'call at ' + w.call + ', first await at ' + w.wait);

  /* Fired, not awaited. Awaiting it would put the whole tab behind the
     whole-tree read, which trades one card's skeleton for every card's. */
  check('neither tab awaits it — the reads start, the screen carries on',
        !/await\s+initCoachData\s*\(/.test(Y) && !/await\s+initCoachData\s*\(/.test(W));
  check('and both attach a repaint for the log phase as well as for the whole snapshot',
        /coachLogReady\(\)/.test(Y) && /coachLogReady\(\)/.test(W));
}

/* ---------- report ---------- */
console.log('\nCoach’s snapshot is one round trip deep, and it starts before anything else\n');
console.log(results.join('\n'));
console.log('\nboot: ' + bootWaves + ' wave, ' + bootReads + ' reads, ' + xL(bootMs) +
            ' (LATENCY = ' + LATENCY + 'ms)');
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
