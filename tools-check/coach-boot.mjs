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
  lsGets: k => lsGets.get(k) || 0,
  // v53: a node changed after boot — food logged — as the database now holds it.
  put:    (path, v) => { DATA[path] = v; }
};
`;

const LATENCY = 60;
const TMP = mkdtempSync(join(tmpdir(), 'rack-coach-boot-'));
let rigN = 0;

/* A whole module graph per rig, because module state is the subject: `ready`,
   `logKnown` and the rotation counter are all set once and a second import of
   the same URL would hand back the first rig's finished snapshot. */
async function rig({ data = {}, slow = [], fail = [], pro = false } = {}) {
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
  // v56: picker.js takes the movement vocabulary from coach-tags.js (pure, imports nothing).
  const PICK   = put('picker.mjs', swap(src('picker.js'), [
    ['./exercises.js', real('exercises.js')], ['./store.js', STORE],
    ['./analytics.js', ANALY], ['./usage.js', USAGE], ['./ui.js', real('ui.js')],
    ['./coach-tags.js', real('coach-tags.js')]]));
  /* v52: a Pro rig for the loadFuel spy (section H) — access.js's
     capabilities() answering Pro, and nothing else about the graph moved. */
  const ACCESS = pro ? put('access-pro.mjs', 'export function capabilities() { return { features: { advanced: true } }; }\n')
                     : put('access.mjs', swap(src('access.js'), [
    ['./store.js', STORE], ['./firebase-config.js', real('firebase-config.js')],
    ['./accounts.js', real('accounts.js')], ['./ui.js', real('ui.js')]]));
  // v48's targets: coach-build.js imports coach-prog.js, which takes the same
  // session math, and coach-goal.js imports nothing.
  const PROG   = put('coach-prog.mjs', swap(src('coach-prog.js'), [
    ['./analytics.js', ANALY], ['./units.js', real('units.js')], ['./exercises.js', real('exercises.js')],
    ['./coach-tags.js', real('coach-tags.js')], ['./coach-goal.js', real('coach-goal.js')]]));
  const BUILD  = put('coach-build.mjs', swap(src('coach-build.js'), [
    ['./exercises.js', real('exercises.js')], ['./analytics.js', ANALY],
    ['./units.js', real('units.js')], ['./blocks.js', real('blocks.js')],
    ['./coach-tags.js', real('coach-tags.js')], ['./coach-prog.js', PROG]]));
  const LIVE   = put('coach-live.mjs', swap(src('coach-live.js'), [
    ['./exercises.js', real('exercises.js')], ['./analytics.js', ANALY],
    ['./units.js', real('units.js')]]));
  // v49's stage two: coach.js imports coach-overlap.js, which reads
  // coach-prog.js's baselines and the same session math.
  const OVER   = put('coach-overlap.mjs', swap(src('coach-overlap.js'), [
    ['./coach-prog.js', PROG], ['./coach-goal.js', real('coach-goal.js')], ['./units.js', real('units.js')],
    ['./exercises.js', real('exercises.js')], ['./coach-tags.js', real('coach-tags.js')], ['./analytics.js', ANALY]]));
  // v52: coach-ready.js, staged the same way (the staging edit the brief allows everywhere).
  const READY  = put('coach-ready.mjs', swap(src('coach-ready.js'), [
    ['./coach-prog.js', PROG], ['./coach-overlap.js', OVER], ['./coach-goal.js', real('coach-goal.js')],
    ['./coach-live.js', LIVE], ['./units.js', real('units.js')], ['./exercises.js', real('exercises.js')]]));
  const FUEL   = put('coach-fuel.mjs', swap(src('coach-fuel.js'), [
    ['./coach-goal.js', real('coach-goal.js')], ['./units.js', real('units.js')]]));
  // v54: coach-volume.js, the whole week, staged the same way.
  const VOL    = put('coach-volume.mjs', swap(src('coach-volume.js'), [
    ['./exercises.js', real('exercises.js')], ['./coach-tags.js', real('coach-tags.js')],
    ['./coach-goal.js', real('coach-goal.js')], ['./analytics.js', ANALY]]));
  const COACH  = put('coach.mjs', swap(src('coach.js'), [
    ['./exercises.js', real('exercises.js')], ['./analytics.js', ANALY],
    ['./units.js', real('units.js')], ['./coach-build.js', BUILD], ['./coach-live.js', LIVE],
    ['./coach-goal.js', real('coach-goal.js')], ['./coach-prog.js', PROG], ['./coach-overlap.js', OVER],
    ['./coach-ready.js', READY], ['./coach-fuel.js', FUEL], ['./coach-volume.js', VOL]]));
  const DATA_  = put('coach-data.mjs', swap(src('coach-data.js'), [
    ['./store.js', STORE], ['./exercises.js', real('exercises.js')],
    ['./picker.js', PICK], ['./tdee.js', TDEE], ['./insights.js', INSI],
    ['./access.js', ACCESS], ['./coach.js', COACH]]));

  const S = await import(JSON.parse(STORE));
  const D = await import(JSON.parse(DATA_));
  // v53: the engine the rig staged, so an answer can be read off coachInput().
  const C = await import(JSON.parse(COACH));
  return { S, D, C, probe: S.probe };
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

/* ================= F. THE DIRECTION, FROM THE CALORIES ================= */
section('F. a calorie target under maintenance reads as a goal pointing down');
{
  /* goalDirection(targets, maintCal) takes the maintenance NUMBER, and
     coachInput() used to hand it effectiveMaint()'s whole { cal, source, auto }
     object. `object > 0` is false, so every account without targets.auto — a
     goal set as a plain calorie target — read goalDir null: no direction for
     weight_rate_vs_goal, no deficit reading for the stall, and a question put
     to somebody whose own targets already answered it. Driven through the real
     coach-data.js, tdee.js and insights.js: a PINNED maintenance of 2,600
     (effectiveMaint answers it whatever the weight model says, so this does not
     depend on a single weigh-in) and a 2,300 target, with no auto block. */
  const { D } = await rig({ data: { workouts: TREE,
    'food/targets': { cal: 2300, p: 180, f: 70, maint: 2600 } } });
  await withTimeout(D.initCoachData(), 40 * LATENCY);
  const w = D.coachInput({}).weight;
  check('no targets.auto, a target 300 kcal under maintenance: goalDir is -1',
        w.goalDir === -1, 'goalDir ' + JSON.stringify(w.goalDir));
}

/* ================= G. A ROUTINE SAVED SINCE THE APP OPENED ================= */
section('G. a routine saved from the builder is his routine at once, and costs no read');
{
  /* Coach reads `routines` once, in the boot wave, and v45 had nothing that
     told it about one written afterwards — so "Save as routine" from the
     builder left the next proposal for that shape saying nothing about it
     until the app was reopened. routines.js now hands its list on whenever it
     changes; workout.js passes it to noteCoachData. Driven through the real
     coach-data.js, and counted: the whole point is that it reads nothing. */
  const { D, probe } = await rig({ data: FULL });
  await withTimeout(D.initCoachData(), 40 * LATENCY);
  check('the boot read found no routines on this account', D.coachInput({}).routines.length === 0,
        JSON.stringify(D.coachInput({}).routines));
  const before = probe.paths().length;
  const PUSH = { name: 'Push A', exercises: [{ exId: 'barbell-bench-press', group: 'chest', sets: [] }] };
  D.noteCoachData({ routines: { r9: PUSH } });
  const now = D.coachInput({}).routines;
  check('handed the node, Coach has the routine at once — keyed id carried onto the list, as the boot read does it',
        now.length === 1 && now[0].id === 'r9' && now[0].name === 'Push A' &&
        JSON.stringify(now[0].exercises) === JSON.stringify(PUSH.exercises), JSON.stringify(now));
  check('and not one read was issued to learn it', probe.paths().length === before,
        list(probe.paths().slice(before)));
  D.noteCoachData({ entries: {} });
  check('a patch that does not mention routines leaves them alone', D.coachInput({}).routines.length === 1);
  D.noteCoachData({ routines: {} });
  check('and an empty node is a real answer — his last routine deleted — not a failed one',
        D.coachInput({}).routines.length === 0);

  /* The two ends of the wire, from the files that do it. routines.js's
     persist() and tell() are lifted and run: a write that lands hands the list
     on, and one the database refuses hands nothing on — Coach must not name a
     routine that was never saved. */
  const R = src('routines.js');
  const liftR = name => {
    const m = new RegExp('^function ' + name + '\\(', 'm').exec(R);
    return m ? R.slice(m.index, R.indexOf('\n}\n', m.index) + 3) : null;
  };
  const tellSrc = liftR('tell');
  const persistSrc = (R.match(/^function persist\(\)[^\n]*\n/m) || [''])[0];
  check('routines.js has a tell() and a one-line persist() to drive', !!tellSrc && !!persistSrc, persistSrc.trim());
  const heard = [];
  const make = w => new Function('write', 'routines', 'onChanged', tellSrc + persistSrc + 'return persist;')(
    w, { r1: { name: 'Legs' } }, list => heard.push(Object.keys(list)));
  await make(async () => {})();
  check('a write that lands hands the list on', heard.length === 1 && heard[0][0] === 'r1', JSON.stringify(heard));
  let refused = false;
  try { await make(async () => { throw new Error('PERMISSION_DENIED'); })(); } catch { refused = true; }
  check('a write the database refuses hands nothing on, and still rejects to its caller',
        refused && heard.length === 1, JSON.stringify(heard));
  check('the watch hands on what it delivers from anywhere else — another device, or the write coming back',
        /watch\('routines', val => \{ routines = val \|\| \{\}; tell\(\); \}\);/.test(R));
  check('and routines.js imports nothing of Coach’s — the callback is handed in',
        !/coach/.test((R.match(/^import[^;]*;/gm) || []).join('\n')));
  check('workout.js is what wires the two together',
        /await initRoutines\(list => noteCoachData\(\{ routines: list \}\)\);/.test(src('workout.js')));
}

/* ================= H. v52 — THE FOOD LOG IS READ ON AN ASK, NEVER AT BOOT ================= */
section('H. v52 — "Am I fueled?" reads the food log on an ask: none at boot or on a paint, fifteen at most, one after a change');
{
  /* The spy is the store stub's own log of paths, filtered to the food log:
     loadPatternFood() reads the same nodes, but only for Patterns, which is
     off here — so every food/log read below is loadFuel()'s. */
  const dk = ms => key(ms).join('-');
  const tree = {}, sums = {}, logs = {};
  for (let i = 1; i <= 26; i++) {
    const t = NOW - i * DAY;
    sums[dk(t)] = { cal: 2400 + (i % 5) * 50, p: 150, c: 260, f: 70 };
    if (i % 2) {
      const [mk, dd] = key(t);
      tree[mk] = tree[mk] || {};
      tree[mk][dd] = { ['q' + i]: { id: 'q' + i, startedAt: t, exercises: [{ exId: 'barbell-bench-press', name: 'Bench', group: 'chest',
        equipment: 'barbell', sets: [{ w: '185', r: '5', type: 'N', done: true }] }] } };
      logs['food/log/' + dk(t)] = { e1: { id: 'e1', t: t - 5 * 3600e3, cal: 800, p: 40, c: 90 }, e2: { id: 'e2', t: t - 3600e3, cal: 700, p: 40, c: 80 } };
    }
  }
  sums[dk(NOW)] = { cal: 600, p: 30, c: 70, f: 20 };
  logs['food/log/' + dk(NOW)] = { e1: { id: 'e1', t: NOW - 3600e3, cal: 600, p: 30, c: 70 } };
  const data = settingsNode => ({ workouts: tree, 'food/daySummaries': sums, 'settings/coach': settingsNode, ...logs });
  const food = probe => probe.paths().filter(p => p.startsWith('food/log/'));
  const { D, probe } = await rig({ data: data({ v: 1, mute: {}, answers: {}, asked: {} }), pro: true });
  await withTimeout(D.initCoachData(), 20 * LATENCY);
  const atBoot = food(probe).length;
  for (let k = 0; k < 5; k++) D.coachInput({});
  check('none at boot, and none on five paints after it', atBoot === 0 && food(probe).length === 0, list(food(probe)));
  check('and the sheet knows there is something to read before it asks', D.fuelNeedsRead() === true);
  await withTimeout(D.loadFuel(), 20 * LATENCY);
  const first = food(probe).length;
  check('the first "Am I fueled?" of the open reads at most fifteen days — today, the latest session, the latest complete training days (' + first + ')',
        first > 2 && first <= 15, list(food(probe)));
  check('in one wave: every one of them went out together', new Set(probe.reads().filter(r => r.path.startsWith('food/log/')).map(r => r.wave)).size === 1);
  const inp = D.coachInput({});
  check('and coachInput() hands over what it read, and only that', Object.keys(inp.foodLog).length === first &&
        Array.isArray(inp.foodLog[dk(NOW)]) && inp.foodLog[dk(NOW)][0].cal === 600, JSON.stringify(Object.keys(inp.foodLog)));
  await withTimeout(D.loadFuel(), 20 * LATENCY);
  check('a second ask with nothing changed reads nothing', food(probe).length === first && D.fuelNeedsRead() === false, String(food(probe).length - first));
  D.noteCoachData({ summaries: { ...sums, [dk(NOW)]: { cal: 1100, p: 60, c: 130, f: 40 } } });
  check('today’s summary moves (a food logged), and there is one thing to read', D.fuelNeedsRead() === true);
  await withTimeout(D.loadFuel(), 20 * LATENCY);
  check('one read — today again — and nothing else', food(probe).length === first + 1 && food(probe)[first] === 'food/log/' + dk(NOW),
        list(food(probe).slice(first)));

  // food.js: both daySummaries writes tell Coach, straight after.
  const FOOD = src('food.js');
  const sites = FOOD.split("write('food/daySummaries/' + key, sum)").length - 1;
  const told = (FOOD.match(/quiet\(write\('food\/daySummaries\/' \+ key, sum\)\);\n(?:\s*\/\/.*\n)?\s*noteCoachFood\(key, sum\);/g) || []).length;
  check('food.js writes the day summary in two places, and both tell Coach straight after',
        sites === 2 && told === 2 && !/write\('food\/daySummaries\/' \+ key, \{/.test(FOOD), sites + ' sites, ' + told + ' told');
  /* v53 (SHIP-V53-PROMPT §3.5): food logged on the Fuel tab AFTER an ask,
     the way food.js does it — the log written, the day's summary written,
     and Coach told the summary straight after (noteCoachFood), with no You
     repaint in between. A log of its own, at fixed local hours — entries at
     8:00 and 12:30, sessions at 17:00, today's in the last minute — so the
     answer is a by-hour read, which states today's total, in every zone at
     any hour. */
  {
    const localAt = (ago, h, m) => { const x = new Date(NOW - ago * DAY); x.setHours(h, m || 0, 0, 0); return x.getTime(); };
    const t2 = {}, s2 = {}, l2 = {};
    for (let i = 1; i <= 26; i++) {
      s2[dk(NOW - i * DAY)] = { cal: 1500, p: 80, c: 170, f: 50 };
      if (i % 2) {
        const at = localAt(i, 17), [mk, dd] = key(at);
        t2[mk] = t2[mk] || {};
        t2[mk][dd] = { ['v' + i]: { id: 'v' + i, startedAt: at, exercises: [{ exId: 'barbell-bench-press', name: 'Bench', group: 'chest',
          equipment: 'barbell', sets: [{ w: '185', r: '5', type: 'N', done: true }] }] } };
        l2['food/log/' + dk(at)] = { e1: { id: 'e1', t: localAt(i, 8), cal: 800, p: 40, c: 90 }, e2: { id: 'e2', t: localAt(i, 12, 30), cal: 700, p: 40, c: 80 } };
      }
    }
    s2[dk(NOW)] = { cal: 600, p: 30, c: 70, f: 20 };
    l2['food/log/' + dk(NOW)] = { e1: { id: 'e1', t: NOW - 40e3, cal: 600, p: 30, c: 70 } };
    const v = await rig({ data: { workouts: t2, 'food/daySummaries': s2, 'settings/coach': { v: 1, mute: {}, answers: {}, asked: {} }, ...l2 }, pro: true });
    await withTimeout(v.D.initCoachData(), 20 * LATENCY);
    await withTimeout(v.D.loadFuel(), 20 * LATENCY);
    const said = () => { const a = v.C.coach(v.D.coachInput({})).ask('ask_fueled'); return [a.text].concat((a.more || []).map(m => m.text)).join(' / '); };
    const before = said();
    const n0 = food(v.probe).length;
    v.probe.put('food/log/' + dk(NOW), { ...l2['food/log/' + dk(NOW)],
      e2: { id: 'e2', t: NOW - 30e3, cal: 900, p: 50, c: 110 }, e3: { id: 'e3', t: NOW - 20e3, cal: 250, p: 10, c: 30 } });
    v.D.noteCoachFood(dk(NOW), { cal: 1750, p: 90, c: 210, f: 50 });
    check('v53: food logged after a first ask — noteCoachFood() tells Coach, and today is to be read again',
          /You’ve logged 600 kcal/.test(before) && v.D.fuelNeedsRead() === true, before);
    await withTimeout(v.D.loadFuel(), 20 * LATENCY);
    check('asked again: exactly one read — today — and nothing else', food(v.probe).length === n0 + 1 && food(v.probe)[n0] === 'food/log/' + dk(NOW),
          list(food(v.probe).slice(n0)));
    const after = said();
    check('and the answer carries the new total, 1,750 kcal', /You’ve logged 1,750 kcal/.test(after), after);
    await withTimeout(v.D.loadFuel(), 20 * LATENCY);
    check('a third ask with nothing changed since reads nothing', food(v.probe).length === n0 + 1);
  }
  // Basic, and Food switched off: nothing, at all.
  const basic = await rig({ data: data({ v: 1, mute: {}, answers: {}, asked: {} }) });
  await withTimeout(basic.D.initCoachData(), 20 * LATENCY);
  await withTimeout(basic.D.loadFuel(), 20 * LATENCY);
  check('a Basic account reads no food log', food(basic.probe).length === 0 && basic.D.fuelNeedsRead() === false, list(food(basic.probe)));
  const muted = await rig({ data: data({ v: 1, mute: { fuel: true }, answers: {}, asked: {} }), pro: true });
  await withTimeout(muted.D.initCoachData(), 20 * LATENCY);
  await withTimeout(muted.D.loadFuel(), 20 * LATENCY);
  check('and with Food switched off, none either', food(muted.probe).length === 0 && muted.D.fuelNeedsRead() === false, list(food(muted.probe)));
  const unread = await rig({ data: { ...data({ v: 1, mute: {}, answers: {}, asked: {} }) }, fail: ['workouts'], pro: true });
  await withTimeout(unread.D.initCoachData(), 20 * LATENCY);
  await withTimeout(unread.D.loadFuel(), 20 * LATENCY);
  check('nor on a log that could not be read', food(unread.probe).length === 0, list(food(unread.probe)));
}

/* ---------- report ---------- */
console.log('\nCoach’s snapshot is one round trip deep, and it starts before anything else\n');
console.log(results.join('\n'));
console.log('\nboot: ' + bootWaves + ' wave, ' + bootReads + ' reads, ' + xL(bootMs) +
            ' (LATENCY = ' + LATENCY + 'ms)');
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
