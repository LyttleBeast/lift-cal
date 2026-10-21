#!/usr/bin/env node
//
// Verifier for v68's two Friends additions — a friend's face and the nudge —
// driven through the REAL friends-data.js over the REAL rules, twice:
//
//   node tools-check/friends-v68.mjs
//
//   1. under database.rules.json as it is in this tree (v68): the face is
//      published, shrunk and read by friends only; a nudge goes, once a day,
//      is seen, dismissed, switched off and muted; removing a friend takes it
//      all; nothing the honest flow does is refused.
//   2. under the rules as PUBLISHED TODAY — rack-v67's file, read from git —
//      because Micah pastes rules by hand and the app ships first. Every v68
//      write is refused there, and the property is that a refusal costs only
//      the v68 thing: the code, the request, the confirm, the summaries, a
//      routine and a removal all still work, the face falls back to the
//      letters, and a nudge says it did not go.
//
// Fake timers, a fake canvas: friends-data.js schedules publishes (here they
// are called by hand), and shrinkAvatar() draws on a canvas, which node has
// not — the fake returns a JPEG data string of a size the test chooses.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDb } from './lib/rules-engine.mjs';

const ROOT = new URL('..', import.meta.url);
const src = f => readFileSync(new URL(f, ROOT), 'utf8');
const real = f => JSON.stringify(new URL(f, ROOT).href);
const RULES = JSON.parse(src('database.rules.json'));
const V67 = JSON.parse(execFileSync('git', ['show', '82fd37d:database.rules.json'], { cwd: new URL('.', ROOT).pathname, encoding: 'utf8' }));

let pass = 0, fail = 0;
const out = [];
const check = (label, cond, detail) => { if (cond) { pass++; out.push('  ✓ ' + label); } else { fail++; out.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); } };
const section = t => out.push('\n' + t);
const J = v => JSON.stringify(v);

/* ---------- one clock, for the app and the database ---------- */
let CLOCK = 1790000000000;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(CLOCK); } static now() { return CLOCK; } };
const advance = (W, ms) => { CLOCK += ms; W.db.setNow(CLOCK); };

/* ---------- the browser bits friends-data.js touches ---------- */
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};
const cells = new Map();
globalThis.localStorage = { getItem: k => (cells.has(k) ? cells.get(k) : null), setItem: (k, v) => cells.set(k, String(v)), removeItem: k => cells.delete(k) };
globalThis.window = { addEventListener() {} };
const JPEG = n => 'data:image/jpeg;base64,' + '/9j/'.repeat(Math.ceil(n / 4)).slice(0, n);
let canvasSize = 3800;            // what the fake canvas's toDataURL returns, in base64 characters
const drawn = [];
globalThis.Image = class { set src(v) { this._s = v; this.naturalWidth = 144; this.naturalHeight = 144; Promise.resolve().then(() => this.onload && this.onload()); } get src() { return this._s; } };
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: (...a) => drawn.push(a.slice(-2)) }), toDataURL: (t, q) => JPEG(Math.round(canvasSize * (q || 1))) }) };

function world(rules) {
  const db = createDb(rules, { now: CLOCK });
  const W = { db, watchers: [], refused: [], users: {} };
  for (const u of ['uAnn', 'uBob', 'uCat']) db.poke('access/approved/' + u, { at: 1, via: 'owner' });
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
  return W;
}

const STORE = (uid, wk) => `
const W = globalThis[${J(wk)}];
const me = ${J(uid)};
const client = W.db.client({ uid: me });
const refuse = (what, r) => { W.refused.push({ who: me, what, why: r.why }); throw new Error('PERMISSION_DENIED'); };
export function uid() { return me; }
export const online = { value: true };
export function todayKey(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export async function read(path, fallback = null) {
  let n = W.users[me] || {}; for (const k of path.split('/')) { n = n && typeof n === 'object' ? n[k] : undefined; }
  return n === undefined ? fallback : JSON.parse(JSON.stringify(n));
}
export async function readShared(path, fallback = null) { const r = client.get(path); return r.ok && r.value !== null ? r.value : fallback; }
export async function writeShared(path, value) { const r = client.set(path, value); if (!r.ok) refuse('set ' + path, r); W.pump(); }
export async function updateShared(paths) { const r = client.update('', paths); if (!r.ok) refuse('update ' + Object.keys(paths).join(','), r); W.pump(); }
export function watchShared(path, cb) { const w = { client, path, cb, last: undefined }; W.watchers.push(w); Promise.resolve().then(W.pump); return () => {}; }
export function onChange() { return () => {}; }
export function serverNow() { return { '.sv': 'timestamp' }; }
export const LS = {
  get(k, f) { const v = globalThis.localStorage.getItem(${J(wk)} + me + ':' + k); return v ? JSON.parse(v) : f; },
  set(k, v) { globalThis.localStorage.setItem(${J(wk)} + me + ':' + k, JSON.stringify(v)); },
  del(k) { globalThis.localStorage.removeItem(${J(wk)} + me + ':' + k); }
};
`;
const dirs = [];
async function account(uid, wk) {
  const dir = mkdtempSync(join(tmpdir(), 'rack-friends-v68-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'store.mjs'), STORE(uid, wk));
  writeFileSync(join(dir, 'tdee.mjs'), 'export async function refreshModel() {} export function trendWeight() { return null; } export function trendRate() { return { rateWk: 0 }; }');
  writeFileSync(join(dir, 'insights.mjs'), 'export function goalDirection() { return null; }');
  writeFileSync(join(dir, 'usage.mjs'), `export function bump(e) { (globalThis[${J(wk)}].bumps = globalThis[${J(wk)}].bumps || []).push([${J(uid)}, e]); }`);
  writeFileSync(join(dir, 'picker.mjs'), 'export function allExercises() { return []; } export function libraryReady() { return true; } export async function adoptCustom() {}');
  writeFileSync(join(dir, 'routines.mjs'), `export function routineList() { return [{ id: 'r1', name: 'Push', exercises: [{ exId: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell', sets: [{ tw: '135', tr: '5', type: 'N' }] }] }]; } export async function adoptRoutine(r) { return r.id; }`);
  writeFileSync(join(dir, 'analytics.mjs'), 'export async function allSessions() { return []; } export function prTimeline() { return []; }');
  writeFileSync(join(dir, 'friends-data.mjs'), src('friends-data.js')
    .replace("from './store.js'", "from './store.mjs'").replace("from './analytics.js'", "from './analytics.mjs'")
    .replace("from './tdee.js'", "from './tdee.mjs'").replace("from './insights.js'", "from './insights.mjs'")
    .replace("from './picker.js'", "from './picker.mjs'").replace("from './routines.js'", "from './routines.mjs'")
    .replace("from './exercises.js'", 'from ' + real('exercises.js')).replace("from './usage.js'", "from './usage.mjs'")
    .replace("from './friends-core.js'", 'from ' + real('friends-core.js'))
    .replace("from './friends-summary.js'", 'from ' + real('friends-summary.js')));
  return import(pathToFileURL(join(dir, 'friends-data.mjs')).href + '?' + wk);
}
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

async function connected(rules, wk) {
  const W = globalThis[wk] = world(rules);
  W.users = { uAnn: { profile: { name: 'Ann Lee', photo: JPEG(18000) } }, uBob: { profile: { name: 'Bob Diaz' } }, uCat: { profile: { name: 'Cat' } } };
  const ann = await account('uAnn', wk), bob = await account('uBob', wk), cat = await account('uCat', wk);
  for (const a of [ann, bob, cat]) await a.initFriends({});
  await settle();
  const c = await ann.newCode();
  const s1 = await bob.sendRequest(await bob.lookupCode(c.code));
  await settle();
  const s2 = await ann.confirm('uBob');
  await settle();
  return { W, ann, bob, cat, ok: c.ok && s1.ok && s2.ok };
}

/* ================= 0. the pure half agrees with the rules ================= */
section('0. friends-core.js: the bounds it builds to are the rules\' own');
{
  const C = await import(new URL('../friends-core.js', import.meta.url).href);
  const S = RULES.rules.social;
  const avp = S.shared.$uid.av.p['.validate'];
  check('AV_MAX is the rules\' cap on a face (' + C.AV_MAX + ')', avp.includes('length <= ' + C.AV_MAX));
  check('AV_RE is the rules\' pattern, character for character', avp.includes('matches(' + C.AV_RE.toString() + ')'), avp);
  check('a face is read only exactly as `me` is: both sides of the connection', S.shared.$uid.av['.read'] === S.shared.$uid.me['.read']);
  check('avatarOk refuses a PNG, an SVG, a URL, markup, and one character too many',
    !C.avatarOk('data:image/png;base64,AAAA') && !C.avatarOk('data:image/svg+xml;base64,AAAA') && !C.avatarOk('https://x/y.jpg') &&
    !C.avatarOk('data:image/jpeg;base64,AA"><img>') && !C.avatarOk('data:image/jpeg;base64,' + 'A'.repeat(C.AV_MAX - 22)) && C.avatarOk('data:image/jpeg;base64,' + 'A'.repeat(C.AV_MAX - 23)));
  check('readAvatar hands back the picture or null — never anything else', C.readAvatar({ p: JPEG(100), at: 1 }) === JPEG(100) && C.readAvatar({ p: 'x' }) === null && C.readAvatar(null) === null);
  const nv = S.nudge.$to.$from.v['.validate'];
  check('three wordings, and the rules take exactly 0, 1 and 2', C.NUDGE_LINES.length === 3 && [0, 1, 2].every(i => nv.includes('=== ' + i)) && !nv.includes('=== 3'));
  check('every wording names the sender and says nothing else of them', C.NUDGE_LINES.every(l => l.startsWith('{n} ') && (l.match(/\{n\}/g) || []).length === 1));
  check('"<Name> says you are slacking off. Get in there." is the first', C.nudgeText(0, 'Micah Flunker') === 'Micah says you are slacking off. Get in there.');
  check('the wording rotates 0, 1, 2, 0', J([null, 0, 1, 2].map(C.nextVariant)) === J([0, 1, 2, 0]));
  check('NUDGE_GAP is the rules\' day', S.people.$uid.nudged.$to['.write'].includes('now - ' + C.NUDGE_GAP) && C.NUDGE_GAP === 86400000);
  check('a nudge is shown for a week', C.NUDGE_TTL === 7 * 86400000);
  const r = C.readNudges({ uA: { v: 1, at: 100 }, uX: { v: 0, at: 100 }, uB: { v: 9, at: 100 } },
    { list: { uA: { k: 'friend', n: 'Ann Lee' }, uB: { k: 'friend', n: 'B' } } }, 100 + 1000);
  check('readNudges: from a friend, a known wording, under a week old — named from MY list; the rest to delete',
    r.live.length === 1 && r.live[0].from === 'uA' && r.live[0].text === C.nudgeText(1, 'Ann Lee') && J(r.stale.sort()) === J(['uB', 'uX']) );
  const r2 = C.readNudges({ uC: { v: 0, at: 1 } }, { list: { uC: { k: 'friend', n: 'C' } } }, 1 + C.NUDGE_TTL);
  check('and one exactly a week old is stale', r2.live.length === 0 && r2.stale[0] === 'uC');
  check('nudgeWait counts down from the stamp, and is 0 once a day has passed or with no stamp',
    C.nudgeWait(1000, 1000 + 5) === C.NUDGE_GAP - 5 && C.nudgeWait(1000, 1000 + C.NUDGE_GAP) === 0 && C.nudgeWait(NaN, 5) === 0);
  check('friends-core.js is still pure (no Date.now, no DOM)', !/Date\.now\(\)|new Date\(\)|document|window/.test(src('friends-core.js').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')));
}

/* ================= 1. under the v68 rules ================= */
section('1a. v68 rules — a friend\'s face');
{
  const { W, ann, bob, cat, ok } = await connected(RULES, '__v68a');
  check('Ann and Bob connect', ok);
  await ann.publish(); await settle();
  const av = W.db.peek('social/shared/uAnn/av');
  check('Ann\'s face is published at social/shared/uAnn/av, shrunk to a small JPEG (' + (av && av.p.length) + ' characters, cap 6,000)',
    !!av && av.p.startsWith('data:image/jpeg;base64,') && av.p.length <= 6000 && av.at === W.db.now);
  check('drawn at 72 px square from her 144 px picture', drawn.length > 0 && J(drawn[0]) === J([72, 72]), J(drawn[0]));
  await bob.loadFriends(true);
  check('Bob reads it with her other summaries', bob.friendsState().data.uAnn.av === av.p);
  check('Bob, with no photo, publishes no face', W.db.peek('social/shared/uBob/av') === null);
  await ann.loadFriends(true);
  check('so Ann gets null for him — the letters', ann.friendsState().data.uBob.av === null);
  check('Cat, not a friend, cannot read Ann\'s face', !W.db.client({ uid: 'uCat' }).get('social/shared/uAnn/av').ok);
  const before = W.refused.length;
  canvasSize = 20000; drawn.length = 0;
  W.users.uAnn.profile.photo = JPEG(20000);
  cells.clear();
  await ann.publish(); await settle();
  check('a picture that cannot be shrunk under the cap is never sent (no refused write, the old face kept)', W.refused.length === before && W.db.peek('social/shared/uAnn/av').p === av.p);
  canvasSize = 3800;
  await ann.removeFriend('uBob'); await settle();
  await ann.publish(); await settle();
  check('with no friends left, the face is deleted with the rest', W.db.peek('social/shared/uAnn/av') === null);
  check('nothing the honest flow did was refused', W.refused.length === 0, J(W.refused));
}

section('1b. v68 rules — the nudge');
{
  const { W, ann, bob, cat } = await connected(RULES, '__v68b');
  const C = await import(new URL('../friends-core.js', import.meta.url).href);
  check('Bob may nudge Ann', bob.canNudge('uAnn').ok);
  const r1 = await bob.sendNudge('uAnn'); await settle();
  const nd = W.db.peek('social/nudge/uAnn/uBob') || {};
  check('Bob nudges Ann: one { v, at } in her box and his stamp beside it', r1.ok && J(Object.keys(nd).sort()) === J(['at', 'v']) && nd.v === 0 && nd.at === W.db.now && W.db.peek('social/people/uBob/nudged/uAnn') === W.db.now, J(nd));
  check('counted (nudgeSend)', (W.bumps || []).some(([u, e]) => u === 'uBob' && e === 'nudgeSend'));
  const st = ann.friendsState();
  check('Ann sees it, in the fixed words, with Bob\'s name from her own list: "' + (st.nudges[0] || {}).text + '"',
    st.nudges.length === 1 && st.nudges[0].text === 'Bob says you are slacking off. Get in there.' && ann.waiting() === 1);
  check('Bob\'s button now says he has used today\'s', !bob.canNudge('uAnn').ok && /One a day/.test(bob.canNudge('uAnn').why));
  const r2 = await bob.sendNudge('uAnn');
  check('a second tap the same day is stopped by the app before the rules', !r2.ok && W.refused.length === 0);
  const d = await ann.dismissNudge('uBob'); await settle();
  check('Ann dismisses it: gone from her box', d.ok && W.db.peek('social/nudge/uAnn/uBob') === null && ann.waiting() === 0);
  advance(W, 86400000);
  // the app's own stamp is read from its node: a day later the button is live again
  check('a day later Bob may again', bob.canNudge('uAnn').ok);
  const r3 = await bob.sendNudge('uAnn'); await settle();
  check('and the wording rotates: the second is the second line', r3.ok && W.db.peek('social/nudge/uAnn/uBob').v === 1 &&
    ann.friendsState().nudges[0].text === C.nudgeText(1, 'Bob Diaz'));
  const off = await ann.setNudgesFrom('uBob', false); await settle();
  check('Ann switches off nudges from Bob: the switch is stored and what he sent is deleted', off && W.db.peek('social/people/uAnn/nonudge/uBob') === true && W.db.peek('social/nudge/uAnn/uBob') === null);
  check('her friend list says so', ann.friendsState().friends[0].nudges === false);
  advance(W, 86400000);
  const r4 = await bob.sendNudge('uAnn');
  check('Bob\'s next nudge is refused by the rules, and the app says so in words', !r4.ok && /switched off/.test(r4.why));
  const mark = W.refused.length;
  await ann.setNudgesFrom('uBob', true);
  await ann.setQuiet(true); await settle();
  check('Ann allows Bob again but mutes everybody', W.db.peek('social/people/uAnn/nonudge/uBob') === null && W.db.peek('social/people/uAnn/quiet') === true && ann.friendsState().quiet);
  const r5 = await bob.sendNudge('uAnn');
  check('and muted, nothing gets through', !r5.ok && W.refused.length === mark + 1);
  await ann.setQuiet(false); await settle();
  const r6 = await bob.sendNudge('uAnn'); await settle();
  check('unmuted, it does', r6.ok && ann.friendsState().nudges.length === 1);
  // A week old: shown no more, and tidied.
  advance(W, 7 * 86400000 + 1);
  W.db.poke('social/nudge/uAnn/uBob', { v: 2, at: W.db.now - 7 * 86400000 - 5 });
  W.pump(); await settle();
  check('a nudge over a week old is not shown, and Ann\'s app deletes it', ann.friendsState().nudges.length === 0 && W.db.peek('social/nudge/uAnn/uBob') === null);
  const n1 = await cat.sendNudge('uAnn');
  check('Cat, not a friend, has no button to press: the app refuses before trying', !n1.ok && /not on your list/.test(n1.why));
  const r7 = await bob.sendNudge('uAnn'); await settle();
  await ann.removeFriend('uBob'); await settle();
  check('removing a friend takes the nudges between them and the switch with it', r7.ok && W.db.peek('social/nudge/uAnn/uBob') === null && W.db.peek('social/people/uAnn/nonudge/uBob') === null);
  const exp = ['uBob refused while switched off', 'uBob refused while muted'];
  check('the only refusals were the two the receiver asked for', W.refused.length === exp.length, J(W.refused.map(r => r.what)));
}

/* ================= 2. under the rules published today ================= */
section('2. rack-v67\'s rules (what is live until Micah pastes v68\'s): every v68 write is refused, and costs nothing else');
{
  const { W, ann, bob, cat, ok } = await connected(V67, '__v67');
  check('the v67 file really has no v68 nodes', !V67.rules.social.nudge && !V67.rules.social.shared.$uid.av && !V67.rules.social.people.$uid.nonudge);
  check('the code, the request and the confirm all work', ok);
  await ann.publish(); await bob.publish(); await settle();
  check('Ann\'s summaries are published although her face is refused', !!W.db.peek('social/shared/uAnn/me') && !!W.db.peek('social/shared/uAnn/td') && W.db.peek('social/shared/uAnn/av') === null);
  check('the face was tried and refused on its own (one write, nothing else in it)', W.refused.some(r => r.who === 'uAnn' && r.what === 'update social/shared/uAnn/av'));
  await ann.publish(); await settle();
  check('and is tried again on the next publish, without stopping it', W.refused.filter(r => r.what === 'update social/shared/uAnn/av').length === 2);
  await bob.loadFriends(true);
  check('Bob reads Ann\'s summaries; her face reads as none — the letters', !!bob.friendsState().data.uAnn.td && bob.friendsState().data.uAnn.av === null);
  const n = await bob.sendNudge('uAnn');
  check('a nudge says it did not go, and mentions the rules', !n.ok && /rules may not be published/.test(n.why));
  check('Bob\'s button is not spent by a nudge that never landed', bob.canNudge('uAnn').ok);
  check('Ann sees no nudges, and nothing is waiting', ann.friendsState().nudges.length === 0 && ann.waiting() === 0);
  const off = await ann.setNudgesFrom('uBob', false);
  check('a nudge switch says it did not save (the screen flips it back)', off === false);
  const sent = await bob.sendRoutine('uAnn', bob.routineList()[0]); await settle();
  check('a routine still goes', sent.ok && !!W.db.peek('social/inbox/uAnn/uBob'));
  const rm = await ann.removeFriend('uBob'); await settle();
  check('and removing a friend still works — the nudge cleanup is its own write', rm.ok && !ann.friendsState().friends.length && W.db.peek('social/inbox/uAnn/uBob') === null);
  const allowedFails = W.refused.filter(r => !/\/av$|nudge|nonudge|quiet/.test(r.what));
  check('every refusal was a v68 node — nothing that worked in v67 was refused', allowedFails.length === 0, J(allowedFails));
}

for (const d of dirs) rmSync(d, { recursive: true, force: true });
console.log('\nFriends v68: faces and nudges, under the new rules and the published ones\n');
console.log(out.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
