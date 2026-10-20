#!/usr/bin/env node
//
// Verifier that the app's OWN Friends writes are the ones the rules allow
// (rack-v67): the real friends-data.js, staged once per account — Ann, Bob
// and Cat, each signed in as themselves — over a store whose shared verbs go
// through tools-check/lib/rules-engine.mjs running the REAL rules file.
//
//   node tools-check/friends-flow.mjs
//
// friends-rules.mjs proves what the rules refuse. This proves the other half,
// which is the one that fails silently on a phone: that every write the app
// makes in an honest flow is one the rules ALLOW — a code, a request, a
// confirm, the switches, the summaries, a routine sent and saved, a removal,
// and the tidying in between — and that what each account then sees is what
// it should. A write the rules would refuse shows up here as a refusal the
// stub records, and the verifier fails on any it did not expect.
//
//   A  the handshake: a code, looked up, requested, confirmed
//   B  what each side sees: the summaries published, the switches obeyed
//   C  a routine, sent, previewed, saved, and gone from the inbox
//   D  declined and cancelled requests, crossed requests, the tidying
//   E  removing: both sides, everything between them, and the summaries
//   F  routines.js adoptRoutine() and picker.js adoptCustom(): the write goes
//      first, whole, and a refusal leaves nothing behind in memory
//   G  no refusal anywhere that the flow did not ask for
//
// Fake timers: friends-data.js schedules its publishes; here every publish
// is called by hand, so the order is the test's and not a clock's.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDb } from './lib/rules-engine.mjs';

const ROOT = new URL('..', import.meta.url);
const src = f => readFileSync(new URL(f, ROOT), 'utf8');
const real = f => JSON.stringify(new URL(f, ROOT).href);
const RULES = JSON.parse(src('database.rules.json'));

let pass = 0, fail = 0;
const out = [];
const check = (label, cond, detail) => { if (cond) { pass++; out.push('  ✓ ' + label); } else { fail++; out.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); } };
const section = t => out.push('\n' + t);
const J = v => JSON.stringify(v);

/* ---------- the world ---------- */
const timers = [];
globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
globalThis.clearTimeout = () => {};
const cells = new Map();
globalThis.localStorage = { getItem: k => (cells.has(k) ? cells.get(k) : null), setItem: (k, v) => cells.set(k, String(v)), removeItem: k => cells.delete(k) };

const db = createDb(RULES, { now: Date.now() });
const W = globalThis.__friendsWorld = { db, watchers: [], refused: [], users: {}, adopted: {}, customs: {} };
for (const u of ['uAnn', 'uBob', 'uCat']) db.poke('access/approved/' + u, { at: 1, via: 'owner' });

// After every write that landed, every listener whose node changed hears it —
// as the SDK delivers, and only where the rules let that listener read.
W.pump = () => {
  for (const w of W.watchers) {
    const r = w.client.get(w.path);
    if (!r.ok) continue;
    const s = J(r.value);
    if (s === w.last) continue;
    w.last = s;
    try { w.cb(r.value); } catch (e) { console.error(e); }
  }
};

const keyOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const TODAY = keyOf(new Date());
const back = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };

/* One account's store: users/ reads from its own fixture; every shared verb
   is the rules engine, signed in as this account. */
const STORE = uid => `
const W = globalThis.__friendsWorld;
const me = ${J(uid)};
const client = W.db.client({ uid: me });
const ch = [];
const refuse = (what, r) => { W.refused.push({ who: me, what, why: r.why }); const e = new Error('PERMISSION_DENIED: ' + r.why); e.code = 'PERMISSION_DENIED'; throw e; };
export function uid() { return me; }
export const online = { value: true };
export function todayKey(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export async function read(path, fallback = null) {
  const u = W.users[me] || {};
  let n = u; for (const k of path.split('/')) { n = n && typeof n === 'object' ? n[k] : undefined; }
  return n === undefined ? fallback : JSON.parse(JSON.stringify(n));
}
export async function readShared(path, fallback = null) { const r = client.get(path); return r.ok && r.value !== null ? r.value : fallback; }
export async function writeShared(path, value) { const r = client.set(path, value); if (!r.ok) refuse('set ' + path, r); W.pump(); }
export async function updateShared(paths) { const r = client.update('', paths); if (!r.ok) refuse('update ' + Object.keys(paths).join(','), r); W.pump(); }
export async function removeShared(path) { const r = client.remove(path); if (!r.ok) refuse('remove ' + path, r); W.pump(); }
export function watchShared(path, cb) {
  const w = { client, path, cb, last: undefined };
  W.watchers.push(w);
  Promise.resolve().then(W.pump);
  return () => { const i = W.watchers.indexOf(w); if (i >= 0) W.watchers.splice(i, 1); };
}
export function onChange(cb) { ch.push(cb); return () => {}; }
export function serverNow() { return { '.sv': 'timestamp' }; }
export const LS = {
  get(k, f) { const v = globalThis.localStorage.getItem('rack:' + me + ':' + k); return v ? JSON.parse(v) : f; },
  set(k, v) { globalThis.localStorage.setItem('rack:' + me + ':' + k, JSON.stringify(v)); },
  del(k) { globalThis.localStorage.removeItem('rack:' + me + ':' + k); }
};
export function wu() { return 'lb'; }
`;

function stageAccount(uid) {
  const dir = mkdtempSync(join(tmpdir(), 'rack-friends-flow-'));
  writeFileSync(join(dir, 'store.mjs'), STORE(uid));
  const W_ = 'globalThis.__friendsWorld';
  writeFileSync(join(dir, 'tdee.mjs'), `export async function refreshModel() {} export function trendWeight() { return ${W_}.trend[${J(uid)}] || null; } export function trendRate() { return { rateWk: -0.5 }; }`);
  writeFileSync(join(dir, 'insights.mjs'), `export function goalDirection(t) { const r = t && t.auto && t.auto.rateWk; return typeof r === 'number' ? Math.sign(r) : null; }`);
  writeFileSync(join(dir, 'usage.mjs'), `export function bump(e) { (${W_}.bumps = ${W_}.bumps || []).push([${J(uid)}, e]); }`);
  writeFileSync(join(dir, 'picker.mjs'), `
    const lib = () => (${W_}.library[${J(uid)}] || []);
    export function allExercises() { return lib(); }
    export function libraryReady() { return true; }
    export async function adoptCustom(xs) { (${W_}.customs[${J(uid)}] = ${W_}.customs[${J(uid)}] || []).push(...xs); ${W_}.library[${J(uid)}] = [...lib(), ...xs]; return xs.length; }`);
  writeFileSync(join(dir, 'routines.mjs'), `
    export function routineList() { return JSON.parse(JSON.stringify(${W_}.routines[${J(uid)}] || [])); }
    export async function adoptRoutine(r) { (${W_}.adopted[${J(uid)}] = ${W_}.adopted[${J(uid)}] || []).push(r); return r.id; }`);
  writeFileSync(join(dir, 'analytics.mjs'), src('analytics.js')
    .replace("from './store.js'", "from './store.mjs'")
    .replace("from './exercises.js'", 'from ' + real('exercises.js'))
    .replace("from './ui.js'", 'from ' + real('ui.js'))
    .replace("from './units.js'", 'from ' + real('units.js')));
  writeFileSync(join(dir, 'friends-data.mjs'), src('friends-data.js')
    .replace("from './store.js'", "from './store.mjs'")
    .replace("from './analytics.js'", "from './analytics.mjs'")
    .replace("from './tdee.js'", "from './tdee.mjs'")
    .replace("from './insights.js'", "from './insights.mjs'")
    .replace("from './picker.js'", "from './picker.mjs'")
    .replace("from './routines.js'", "from './routines.mjs'")
    .replace("from './exercises.js'", 'from ' + real('exercises.js'))
    .replace("from './usage.js'", "from './usage.mjs'")
    .replace("from './friends-core.js'", 'from ' + real('friends-core.js'))
    .replace("from './friends-summary.js'", 'from ' + real('friends-summary.js')));
  return { dir, load: () => import(pathToFileURL(join(dir, 'friends-data.mjs')).href) };
}

W.trend = { uAnn: 168.4, uBob: 201.2 };
W.library = { uAnn: [], uBob: [{ id: 'custom-cable-fly-q1w2e', name: 'Cable Fly', group: 'chest', equipment: 'cable', custom: true }], uCat: [] };
W.routines = {
  uBob: [{ id: 'rB1', name: 'Bob Push', note: 'Heavy', lastUsed: 9, uses: 4, exercises: [
    { exId: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell', sets: [{ tw: '225', tr: '5', type: 'N' }, { tw: '185', tr: '8', type: 'D' }, { tw: '135', tr: '6', type: 'D', dp: 1 }] },
    { exId: 'custom-cable-fly-q1w2e', name: 'Cable Fly', group: 'chest', equipment: 'cable', sets: [{ tw: '30', tr: '12', type: 'N' }] }] }],
  uCat: [{ id: 'rC1', name: 'Cat Legs', exercises: [{ exId: 'barbell-squat', name: 'Barbell Squat', group: 'legs', equipment: 'barbell', sets: [{ tw: '135', tr: '5', type: 'N' }] }] }]
};
const session = (n, w, r) => {
  const d = back(n); const mk = keyOf(d).slice(0, 7), dd = keyOf(d).slice(8);
  return [mk, dd, { id: 's' + n, startedAt: d.getTime(), exercises: [{ exId: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', sets: [{ w: String(w), r: String(r), type: 'N', done: true }] }] }];
};
const tree = list => { const t = {}; for (const [mk, dd, s] of list) ((t[mk] = t[mk] || {})[dd] = t[mk][dd] || {})[s.id] = s; return t; };
W.users = {
  uAnn: {
    profile: { name: 'Ann Lee' },
    workouts: tree([session(60, 95, 5), session(9, 105, 5), session(2, 115, 5)]),
    steps: { [keyOf(back(0))]: { steps: 9000 }, [keyOf(back(1))]: { steps: 12000 }, [keyOf(back(2))]: { steps: 7000 } },
    food: { daySummaries: { [keyOf(back(1))]: { cal: 2000, p: 140 } }, targets: { cal: 2000, p: 150, goalLb: 160, auto: { rateWk: -0.5 } } },
    weight: { entries: { w1: { lb: 168.4, t: 1 } } }
  },
  uBob: { profile: { name: 'Bob Diaz' }, workouts: tree([session(30, 205, 3), session(3, 215, 3)]), steps: {} },
  uCat: { profile: { name: 'Cat' }, workouts: {}, steps: {} }
};

const sA = stageAccount('uAnn'), sB = stageAccount('uBob'), sC = stageAccount('uCat');
const ann = await sA.load(), bob = await sB.load(), cat = await sC.load();
const settle = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const expectRefused = [];
const refusedNow = () => W.refused.length;

await ann.initFriends({ displayName: 'Ann' });
await bob.initFriends({ displayName: 'Bob' });
await cat.initFriends({ displayName: 'Cat' });
await settle();

/* ================= A ================= */
section('A. the handshake: a code, looked up, requested, confirmed');
{
  check('each account has read its own node once', ann.friendsState().ready && bob.friendsState().ready && cat.friendsState().ready);
  const made = await ann.newCode();
  check('Ann makes a code', made.ok && /^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/.test(made.code), J(made));
  await settle();
  check('and sees it, with a day to run, counted from the server\'s stamp', ann.friendsState().code && ann.friendsState().code.code === made.code && ann.friendsState().code.at === db.now);
  const again = await ann.newCode();
  check('a new code replaces it — the old one is deleted in the same write', again.ok && again.code !== made.code && db.peek('social/codes/' + made.code) === null && !!db.peek('social/codes/' + again.code));
  const code = again.code;
  const typed = ' ' + code.toLowerCase().replace('-', ' ') + ' ';
  const found = await bob.lookupCode(typed);
  check('Bob types it in lower case with a space, and finds Ann', found.ok && found.uid === 'uAnn' && found.name === 'Ann Lee', J(found));
  check('Ann typing her own code is told so', !(await ann.lookupCode(code)).ok && /your own code/.test((await ann.lookupCode(code)).why));
  check('a code nobody made reads "no live code" — the same words as an expired one', /No live code/.test((await cat.lookupCode('ZZZZ-ZZZZ')).why));
  const sent = await bob.sendRequest(found);
  await settle();
  check('Bob sends the request', sent.ok, J(sent));
  check('the code is spent', db.peek('social/codes/' + code) === null);
  check('and Ann\'s own screen says so — her code is not offered as live any more', ann.friendsState().code && ann.friendsState().code.spent === true);
  check('Ann sees "Bob wants to connect" — one thing waiting', ann.friendsState().incoming.length === 1 && ann.friendsState().incoming[0].name === 'Bob Diaz' && ann.waiting() === 1);
  check('Bob sees he is waiting on Ann', bob.friendsState().outgoing.length === 1 && bob.friendsState().outgoing[0].uid === 'uAnn');
  check('Bob\'s switches for Ann are the three defaults, written as he asked', J(db.peek('social/people/uBob/share/uAnn')) === J({ pr: true, td: true, st: true }));
  check('Cat cannot use the spent code', !(await cat.lookupCode(code)).ok);
  const ok = await ann.confirm('uBob');
  await settle();
  check('Ann confirms', ok.ok, J(ok));
  check('they are friends, both sides', ann.friendsState().friends.map(f => f.uid).join() === 'uBob' && bob.friendsState().friends.map(f => f.uid).join() === 'uAnn');
  check('nothing is left waiting on either side', ann.waiting() === 0 && bob.friendsState().outgoing.length === 0 && ann.friendsState().incoming.length === 0);
  check('the confirm is counted (friendAdd)', (W.bumps || []).some(([u, e]) => u === 'uAnn' && e === 'friendAdd'));
  check('a friend\'s code can\'t start a second connection', !(await bob.lookupCode((await ann.newCode()).code)).ok);
}

/* ================= B ================= */
section('B. what each side sees: the summaries published, the switches obeyed');
{
  await ann.publish();
  await bob.publish();
  const has = (u, c) => db.peek('social/shared/' + u + '/' + c) !== null;
  check('Ann publishes what a friend has switched on — name, PRs, training days, steps — and nothing else', ['me', 'pr', 'td', 'st'].every(c => has('uAnn', c)) && !has('uAnn', 'mac') && !has('uAnn', 'wt'));
  check('her PRs are her real records, from the real prTimeline (two bench records inside five weeks)', Object.keys(db.peek('social/shared/uAnn/pr').ev || {}).length === 2, J(db.peek('social/shared/uAnn/pr')));
  check('her steps are her days', db.peek('social/shared/uAnn/st').d.split(',').slice(-3).join() === '7000,12000,9000');
  await bob.loadFriends(true);
  const d = bob.friendsState().data.uAnn;
  check('Bob reads them: her switches for him, her name, her PRs, days and steps', d && d.share.pr && d.me && d.me.n === 'Ann Lee' && !!d.pr && !!d.td && !!d.st, J(d && Object.keys(d)));
  check('and nothing she has off', d && d.wt === undefined && d.mac === undefined);
  const flip = await ann.setShare('uBob', { pr: true, td: true, st: true, wt: true, mac: true });
  await ann.publish();
  check('Ann switches weight and macros on for Bob, and publishes them', flip && has('uAnn', 'wt') && has('uAnn', 'mac'));
  check('her weight summary is the trend, the rate, the goal and its direction — no weigh-ins', J(Object.keys(db.peek('social/shared/uAnn/wt')).sort()) === J(['at', 'dir', 'goal', 'rate', 'tw']) && db.peek('social/shared/uAnn/wt').tw === 168.4);
  await bob.loadFriends(true);
  check('Bob sees them on his next read', !!bob.friendsState().data.uAnn.wt && !!bob.friendsState().data.uAnn.mac);
  await ann.setShare('uBob', { td: true });
  await ann.publish();
  await bob.loadFriends(true);
  const d2 = bob.friendsState().data.uAnn;
  check('Ann switches all but training days off: Bob reads only those', d2.td && !d2.pr && !d2.st && !d2.wt && !d2.mac, J(Object.keys(d2)));
  check('and what nobody may read any more is deleted, not kept', !has('uAnn', 'pr') && !has('uAnn', 'wt') && !has('uAnn', 'mac') && !has('uAnn', 'st') && has('uAnn', 'td'));
  check('Cat, not a friend, reads none of it', !cat.friendsState().data.uAnn);
  const pubBefore = W.refused.length;
  await ann.publish();
  check('a publish with nothing changed writes nothing (and refuses nothing)', W.refused.length === pubBefore);
  await ann.setShare('uBob', { pr: true, td: true, st: true });
  await ann.publish();
}

/* ================= C ================= */
section('C. a routine, sent, previewed, saved');
{
  const list = bob.routineList();
  check('Bob\'s routines are offered to send', list.length === 1 && list[0].name === 'Bob Push');
  const sent = await bob.sendRoutine('uAnn', list[0]);
  await settle();
  check('Bob sends one to Ann', sent.ok, J(sent));
  check('it is counted (routineSend)', (W.bumps || []).some(([u, e]) => u === 'uBob' && e === 'routineSend'));
  const slot = db.peek('social/inbox/uAnn/uBob');
  check('only the plan travelled — no use count, no last-used, no logged numbers', slot && J(Object.keys(slot.r).sort()) === J(['exercises', 'name', 'note']) && !JSON.stringify(slot).includes('"uses"'));
  check('Ann sees it waiting', ann.friendsState().inbox.length === 1 && ann.friendsState().inbox[0].title === 'Bob Push' && ann.waiting() === 1);
  check('Bob sees he has one waiting with her', (await bob.pendingTo('uAnn')) === 'Bob Push');
  const pv = ann.preview('uBob');
  check('the preview says it will add Bob\'s custom exercise to her library, which has nothing like it', pv && pv.customs.length === 1 && pv.customs[0].name === 'Cable Fly');
  const saved = await ann.acceptRoutine('uBob');
  await settle();
  check('Ann saves it', saved.ok && saved.name === 'Bob Push', J(saved));
  check('the custom exercise went in first, then the routine — through picker.js and routines.js',
    (W.customs.uAnn || []).length === 1 && (W.adopted.uAnn || []).length === 1 && W.adopted.uAnn[0].exercises[1].exId === W.customs.uAnn[0].id);
  check('the routine is hers: her id, fresh counters, the drop set intact', W.adopted.uAnn[0].id !== 'rB1' && W.adopted.uAnn[0].uses === 0 && W.adopted.uAnn[0].exercises[0].sets[2].dp === 1);
  check('and the inbox slot is gone', db.peek('social/inbox/uAnn/uBob') === null && ann.waiting() === 0);
  const mark = refusedNow();
  const no = await cat.sendRoutine('uAnn', W.routines.uCat[0]);
  check('Cat, not her friend, cannot send her one — the database refuses, and the app says so', !no.ok && refusedNow() === mark + 1);
  expectRefused.push('uCat inbox');
  await bob.sendRoutine('uAnn', list[0]);
  await settle();
  const dec = await ann.declineRoutine('uBob');
  check('a declined routine is simply deleted', dec.ok && db.peek('social/inbox/uAnn/uBob') === null && (W.adopted.uAnn || []).length === 1);
}

/* ================= D ================= */
section('D. declined, cancelled and crossed requests — and the tidying');
{
  const c1 = await ann.newCode();
  const f1 = await cat.lookupCode(c1.code);
  await cat.sendRequest(f1);
  await settle();
  check('Cat asks Ann', ann.friendsState().incoming.some(r => r.uid === 'uCat') && !!db.peek('social/people/uCat/share/uAnn'));
  const dec = await ann.decline('uCat');
  await settle();
  check('Ann declines: the request and Cat\'s note of it go', dec.ok && db.peek('social/people/uAnn/req/uCat') === null && db.peek('social/people/uCat/out/uAnn') === null);
  check('and Cat\'s own switches for Ann, left behind, are tidied away by Cat\'s app', db.peek('social/people/uCat/share/uAnn') === null);
  const c2 = await ann.newCode();
  await cat.sendRequest(await cat.lookupCode(c2.code));
  await settle();
  const can = await cat.cancel('uAnn');
  await settle();
  check('Cat asks again and cancels: nothing of it is left on either node', can.ok && db.peek('social/people/uAnn/req/uCat') === null && db.peek('social/people/uCat/out/uAnn') === null && db.peek('social/people/uCat/share/uAnn') === null);
  // Crossed: Bob and Cat ask each other at once.
  const cb = await bob.newCode(), cc = await cat.newCode();
  await cat.sendRequest(await cat.lookupCode(cb.code));
  await bob.sendRequest(await bob.lookupCode(cc.code));
  await settle();
  check('crossed: Bob and Cat each asked the other', bob.friendsState().incoming.some(r => r.uid === 'uCat') && cat.friendsState().incoming.some(r => r.uid === 'uBob'));
  const yes = await bob.confirm('uCat');
  await settle();
  check('Bob confirms Cat\'s — and his own request to her goes in the same write', yes.ok && db.peek('social/people/uCat/req/uBob') === null && db.peek('social/people/uBob/out/uCat') === null);
  check('they are friends, and Cat has nothing waiting', bob.friendsState().friends.some(f => f.uid === 'uCat') && cat.friendsState().friends.some(f => f.uid === 'uBob') && cat.waiting() === 0);
  // A stale half of an old connection: Cat's side of Ann survives, Ann's of Cat
  // does not (seeded past the rules, as a partial removal would leave it).
  db.poke('social/people/uCat/list/uAnn', { k: 'friend', n: 'Ann Lee', at: 1 });
  check('a stale half grants nothing: Ann cannot read Cat, nor Cat Ann', !db.client({ uid: 'uAnn' }).get('social/shared/uCat/me').ok && !db.client({ uid: 'uCat' }).get('social/shared/uAnn/me').ok);
  const c3 = await cat.newCode();
  const mark = refusedNow();
  const sent3 = await ann.sendRequest(await ann.lookupCode(c3.code));
  await settle();
  check('it does not block a new request: Ann\'s app clears Cat\'s stale entry about her and asks again', sent3.ok && cat.friendsState().incoming.some(r => r.uid === 'uAnn'));
  check('…at the cost of one refused first try, which it expected', refusedNow() === mark + 1);
  expectRefused.push('stale half, first try');
  const ok3 = await cat.confirm('uAnn');
  await settle();
  check('and the confirm makes both sides fresh', ok3.ok && !!db.peek('social/people/uAnn/list/uCat') && db.peek('social/people/uCat/list/uAnn').at !== 1);
  // The same half on the confirmer's side, appearing after the request.
  await ann.removeFriend('uCat');
  await settle();
  const c4 = await cat.newCode();
  await ann.sendRequest(await ann.lookupCode(c4.code));
  db.poke('social/people/uAnn/list/uCat', { k: 'friend', n: 'Cat', at: 1 });
  await settle();
  const mark2 = refusedNow();
  const ok4 = await cat.confirm('uAnn');
  await settle();
  check('and a stale half of the requester\'s, met at confirm, is cleared the same way', ok4.ok && db.peek('social/people/uAnn/list/uCat').at !== 1 && refusedNow() === mark2 + 1);
  expectRefused.push('stale half at confirm, first try');
  await ann.removeFriend('uCat');
  await settle();
}

/* ================= E ================= */
section('E. removing: both sides, everything between them, and the summaries');
{
  await bob.sendRoutine('uAnn', W.routines.uBob[0]);
  await settle();
  await bob.publish();
  await ann.loadFriends(true);
  check('before: Ann reads Bob', !!ann.friendsState().data.uBob && !!ann.friendsState().data.uBob.pr);
  const rm = await ann.removeFriend('uBob');
  await settle();
  check('Ann removes Bob', rm.ok, J(rm));
  check('neither has the other any more', !ann.friendsState().friends.length && !bob.friendsState().friends.some(f => f.uid === 'uAnn'));
  check('both sets of switches and the routine waiting are gone', db.peek('social/people/uAnn/share/uBob') === null && db.peek('social/people/uBob/share/uAnn') === null && db.peek('social/inbox/uAnn/uBob') === null);
  await ann.loadFriends(true);
  const before = refusedNow();
  const back2 = await bob.sendRoutine('uAnn', W.routines.uBob[0]);
  check('Bob can send her nothing now', !back2.ok && refusedNow() === before + 1);
  expectRefused.push('uBob inbox after removal');
  await ann.publish();
  check('with no friends left, everything Ann ever published is deleted', ['me', 'pr', 'td', 'st', 'mac', 'wt'].every(c => db.peek('social/shared/uAnn/' + c) === null));
  check('nothing under users/ was touched by any of it', db.peek('users') === null);
}

/* ================= F ================= */
section('F. routines.js adoptRoutine() and picker.js adoptCustom() — write first, whole, then memory');
{
  const { stage } = await import('./lib/stage.mjs');
  const st = stage(['routines.js', 'picker.js', 'exercises.js']);
  const F = globalThis.__rack;
  F.db.set('routines', { r1: { id: 'r1', name: 'Mine', exercises: [] } });
  F.db.set('exercises/custom', [{ id: 'custom-a-1', name: 'A', group: 'arms', equipment: 'cable', custom: true }]);
  const R = await st.load('routines.js'), P = await st.load('picker.js');
  await R.initRoutines(() => {});
  let threw = false;
  try { await P.adoptCustom([{ id: 'custom-b-2', name: 'B', group: 'legs', custom: true }]); } catch { threw = true; }
  check('adoptCustom() refuses before the library has been read (a list written from empty memory is a wipe)', threw && !F.writes.some(w => w.path === 'exercises/custom'));
  await P.initPicker({});
  await P.adoptCustom([{ id: 'custom-b-2', name: 'B', group: 'legs', custom: true }, { id: 'custom-a-1', name: 'A', group: 'arms', custom: true }]);
  const cw = F.writes.filter(w => w.path === 'exercises/custom');
  check('then it writes the whole list once — what was there plus only what is new', cw.length === 1 && J(cw[0].value.map(x => x.id)) === J(['custom-a-1', 'custom-b-2']));
  await R.adoptRoutine({ id: 'r2', name: 'From Bob', exercises: [] });
  const rw = F.writes.filter(w => w.path === 'routines');
  check('adoptRoutine() writes routines whole, the new one beside every one already there', rw.length === 1 && J(Object.keys(rw[0].value).sort()) === J(['r1', 'r2']));
  check('and the list it offers afterwards has it', R.routineList().some(r => r.id === 'r2'));
  F.refuse = true;
  let refusedThrow = false;
  try { await R.adoptRoutine({ id: 'r3', name: 'Refused', exercises: [] }); } catch { refusedThrow = true; }
  F.refuse = false;
  check('a refused save throws and leaves nothing in memory the database does not have', refusedThrow && !R.routineList().some(r => r.id === 'r3'));
  st.cleanup();
}

/* ================= G ================= */
section('G. no refusal anywhere the flow did not ask for');
{
  const unexpected = W.refused.filter(r => !(r.who === 'uCat' && /inbox\/uAnn\/uCat/.test(r.what)) && !(r.who === 'uBob' && /inbox\/uAnn\/uBob/.test(r.what)) &&
    !(r.who === 'uAnn' && /req\/uAnn/.test(r.what) && /people\/uCat\/req\/uAnn/.test(r.why)) &&
    !(r.who === 'uCat' && /list\/uAnn/.test(r.what) && /people\/uAnn\/list\/uCat/.test(r.why)));
  check('every write the app made in an honest flow was one the real rules allow (' + db.log.filter(l => l.op !== 'get').length + ' writes, ' + W.refused.length + ' refused, each on purpose)',
    unexpected.length === 0 && W.refused.length === expectRefused.length, J(unexpected));
}

for (const s of [sA, sB, sC]) rmSync(s.dir, { recursive: true, force: true });
console.log('\nFriends: the app\'s own writes, through the real rules\n');
console.log(out.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
