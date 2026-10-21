// Friends — the impure half: every read and write the connection layer makes
// (rack-v67).
//
// friends-core.js is the model and friends-summary.js the summaries; both are
// pure and are copied into the native tree verbatim. This file is the part
// the port rewrites: it watches this account's own node, makes and spends
// codes, confirms and removes, writes the switches, publishes this account's
// summaries and reads its friends', and moves routines through the inbox.
//
// THE RULES DECIDE, NOT THIS FILE. Every write below is one the published
// rules (database.rules.json, `social`) allow, and each was run through the
// real rules file in tools-check/friends-flow.mjs — so a refusal here means
// the rules are not published yet, or something really changed between the
// read and the write. Nothing here tries to be the gate: a client that skipped
// every check in this file would be refused by the database just the same.
//
// THE CONNECTION, step by step (each one ONE atomic multi-path update, since a
// half-landed step is the thing the rules exist to make impossible):
//
//   makeCode     my code + my pointer to it (+ my old code, deleted)
//   sendRequest  their req/{me} + their code, spent + my out/{them} + my
//                switches for them (the defaults, said on screen first)
//   confirm      my list/{them} + their list/{me} + the req and the out gone
//                + my switches for them
//   remove       both list entries, both sets of switches and both inbox
//                slots between us — gone at once, and with them every read
//
// Writes go through store.js's shared verbs, never read()/write(): those are
// users/{uid} only. A shared write is not queued offline by store.js — the
// SDK holds it while the page lives — so every step here says when it could
// not be sent rather than claiming it was.
//
// Imports store.js, analytics.js, tdee.js, insights.js, picker.js,
// routines.js, exercises.js, usage.js and the two pure modules. Nothing in
// them imports back.

import { uid, read, readShared, writeShared, updateShared, watchShared, LS, onChange,
         todayKey, serverNow, online } from './store.js';
import { allSessions, prTimeline } from './analytics.js';
import { refreshModel, trendWeight, trendRate } from './tdee.js';
import { goalDirection } from './insights.js';
import { allExercises, adoptCustom, libraryReady } from './picker.js';
import { routineList, adoptRoutine } from './routines.js';
import { makeCustomExercise } from './exercises.js';
import { bump } from './usage.js';
import { PATH, makeCode, normCode, liveKind, cleanName, readPeople, shareNode, defaultShare,
         normShare, wantedCats, routinePayload, receivedRoutine, SHARE_IDS, CODE_TTL_MS,
         AV_MAX, AV_PX, avatarOk, readAvatar, readNudges, nextVariant, nudgeWait, NUDGE_LINES } from './friends-core.js';
import { prPart, trainedPart, stepsPart, macroPart, weightPart } from './friends-summary.js';

const PUB_DELAY = 60000;          // after a change to my own log, publish this much later
const BOOT_DELAY = 6000;          // and once after boot, behind the tabs
const FRIEND_TTL = 5 * 60000;     // a friend's summaries are read at most this often

let me = null;
let myProfileName = '';
let myPhoto = null;               // users/{me}/profile/photo, the source of my friends' copy (v68)
let nudgeNode = {};               // social/nudge/{me} (v68)
let people = null;                // social/people/{me} as last delivered; null until it is
let inbox = {};                   // social/inbox/{me}
let codeInfo = null;              // { code, at } — my live code as read back, server time
let friendData = {};              // uid -> { share, me, pr, td, st, mac, wt }
let friendAt = 0;
let friendLoad = null;
const subs = new Set();
let stops = [];

/* ================= state ================= */

export function onFriends(cb) { subs.add(cb); return () => subs.delete(cb); }
function tell() { subs.forEach(cb => { try { cb(); } catch {} }); }

/* Everything the screen draws, as one object. `ready` is false until my own
   node has been read once, which is the difference between "no friends yet"
   and "still looking". */
export function friendsState() {
  const p = readPeople(people || {});
  return {
    ready: people !== null,
    me,
    friends: p.friends,
    incoming: p.incoming.filter(r => !r.already),
    outgoing: p.outgoing.filter(o => !o.already),
    code: codeInfo && p.code === codeInfo.code ? codeInfo : (p.code ? { code: p.code, at: 0 } : null),
    inbox: inboxList(),
    // v68: nudges to me from current friends, live ones only; whether I take
    // none at all
    nudges: readNudges(nudgeNode, people || {}, Date.now()).live,
    quiet: p.quiet,
    data: friendData,
    loadedAt: friendAt
  };
}

function inboxList() {
  const list = [];
  for (const [from, item] of Object.entries(inbox || {})) {
    if (!item || typeof item !== 'object' || !item.r) continue;
    const ex = item.r.exercises && typeof item.r.exercises === 'object' ? Object.values(item.r.exercises) : [];
    list.push({ from, name: cleanName(item.n), title: cleanName(item.r.name, 'A routine').slice(0, 60), count: ex.length, at: Number(item.at) || 0 });
  }
  return list.sort((a, b) => b.at - a.at);
}

/* How many things are waiting on me: requests to confirm and routines to
   open. The dock's dot. */
export function waiting() {
  const s = friendsState();
  return s.incoming.length + s.inbox.length + s.nudges.length;
}

export function myName() {
  return cleanName(myProfileName, 'A Rack friend');
}

/* ================= boot ================= */

export async function initFriends(user) {
  me = uid();
  if (!me) return;
  try { const p = await read('profile', null); myProfileName = (p && p.name) || (user && user.displayName) || ''; myPhoto = (p && p.photo) || null; }
  catch { myProfileName = (user && user.displayName) || ''; }

  stops.forEach(s => { try { s(); } catch {} });
  stops = [
    watchShared(PATH.people(me), v => {
      const before = JSON.stringify(readPeople(people || {}).friends.map(f => [f.uid, f.share]));
      people = v || {};
      tidy();
      const after = JSON.stringify(readPeople(people).friends.map(f => [f.uid, f.share]));
      // A new friend, a removed one, or a switch changed: what I publish moves.
      if (before !== after) { friendAt = 0; schedulePublish(1500); }
      refreshCode();
      tell();
    }),
    watchShared(PATH.inbox(me), v => { inbox = v || {}; tell(); }),
    // v68. Refused (unpublished rules) is no nudges — the watch never fires.
    watchShared(PATH.nudges(me), v => { nudgeNode = v || {}; tidyNudges(); tell(); })
  ];

  /* My own log changed: the summaries my friends read are out of date. One
     publish a minute after the last change, not one per set ticked. */
  onChange(path => {
    if (/^(workouts|steps|food\/daySummaries|food\/targets|weight\/entries|profile)(\/|$)/.test(path)) {
      if (/^profile/.test(path)) read('profile', null).then(p => { if (p && p.name) myProfileName = p.name; myPhoto = (p && p.photo) || null; }).catch(() => {});
      schedulePublish(PUB_DELAY);
    }
  });
  schedulePublish(BOOT_DELAY);
  // A publish skipped offline is owed when the signal comes back.
  try { window.addEventListener('online', () => schedulePublish(5000)); } catch {}
}

/* Leftovers a step can leave and that nobody should have to look at, cleared
   quietly and only ever by deleting:
     - a request from somebody who is already a friend (we asked each other at
       once, and one of us confirmed);
     - my outgoing request to somebody who is already a friend;
     - my switches for somebody who is neither a friend nor asked (they
       declined, or I cancelled). */
let tidying = false;
function tidy() {
  if (tidying || !me || !people) return;
  const p = readPeople(people);
  const upd = {};
  for (const r of p.incoming) if (r.already) { upd[PATH.req(me, r.uid)] = null; upd[PATH.out(r.uid, me)] = null; }
  for (const o of p.outgoing) if (o.already) { upd[PATH.out(me, o.uid)] = null; upd[PATH.req(o.uid, me)] = null; }
  for (const u of p.orphanShares) upd[PATH.share(me, u)] = null;
  // v68, its own write: under rules published before v68 the delete of a
  // nonudge entry is refused, and it must not take the deletes above with it.
  if (p.orphanNoNudge.length && online.value) {
    updateShared(Object.fromEntries(p.orphanNoNudge.map(u => [PATH.noNudge(me, u), null]))).catch(() => {});
  }
  if (!Object.keys(upd).length || !online.value) return;
  tidying = true;
  updateShared(upd).catch(() => {}).finally(() => { tidying = false; });
}

/* ================= codes ================= */

const randomByte = (() => {
  let pool = new Uint8Array(0), at = 0;
  return () => {
    if (at >= pool.length) { pool = new Uint8Array(32); crypto.getRandomValues(pool); at = 0; }
    return pool[at++];
  };
})();

/* My code as the database holds it — the owner may read his own whatever its
   age — so the time left is counted from the server's stamp, not this
   phone's clock. A pointer whose code is gone was spent: that is a code
   somebody used, and the screen says so. Read again on every delivery of my
   node, never cached: the delivery that brings a request is the moment the
   code it spent stopped being live. */
async function refreshCode() {
  const p = readPeople(people || {});
  if (!p.code) { codeInfo = null; return; }
  const c = await readShared(PATH.code(p.code), null);
  codeInfo = c && c.u === me ? { code: p.code, at: Number(c.at) || 0 } : { code: p.code, at: 0, spent: true };
  tell();
}

/* A fresh code: mine, pointed to, and the one before it deleted in the same
   write (the rules allow one code per account and refuse to move the pointer
   while the old one stands). */
export async function newCode() {
  if (!me) return { ok: false, why: 'Sign in first.' };
  if (!online.value) return { ok: false, why: 'You’re offline. A code needs the database to check it — try again with a signal.' };
  const code = makeCode(randomByte);
  const old = readPeople(people || {}).code;
  const upd = {
    [PATH.code(code)]: { u: me, n: myName(), k: 'friend', at: serverNow() },
    [PATH.myCode(me)]: code
  };
  if (old && old !== code) upd[PATH.code(old)] = null;
  try { await updateShared(upd); }
  catch { return { ok: false, why: 'That code couldn’t be saved. If this keeps happening, the Friends rules may not be published yet.' }; }
  codeInfo = null;
  await refreshCode();
  return { ok: true, code, at: codeInfo ? codeInfo.at : 0 };
}

export async function dropCode() {
  const old = readPeople(people || {}).code;
  if (!old) return;
  await updateShared({ [PATH.code(old)]: null, [PATH.myCode(me)]: null }).catch(() => {});
  codeInfo = null;
  tell();
}

/* What a typed code opens: whose it is and that it can still be used, or
   what to say. The code is read and nothing is written. */
export async function lookupCode(raw) {
  const code = normCode(raw);
  if (!code) {
    const typed = String(raw == null ? '' : raw).toUpperCase().replace(/[\s-]/g, '');
    return { ok: false, why: typed.length === 8
      ? 'Codes never use 0, O, 1, I or L — one of those is a mistyped letter or number.'
      : 'A code is eight letters and numbers, like ABCD-2345.' };
  }
  if (!online.value) return { ok: false, why: 'You’re offline. Try again with a signal.' };
  const st = friendsState();
  if (st.code && st.code.code === code) return { ok: false, why: 'That’s your own code — send it to a friend and have them type it.' };
  const c = await readShared(PATH.code(code), null);
  // Unreadable and absent read the same on purpose: an expired code is not
  // readable at all, and "no such code" is the one answer that tells a
  // guesser nothing.
  if (!c || typeof c.u !== 'string') return { ok: false, why: 'No live code like that. Codes work once and last a day — ask for a new one.' };
  if (c.u === me) return { ok: false, why: 'That’s your own code — send it to a friend and have them type it.' };
  const kind = liveKind(c.k);
  if (!kind) return { ok: false, why: 'That code is for something this version of Rack doesn’t do yet.' };
  const name = cleanName(c.n);
  if (st.friends.some(f => f.uid === c.u)) return { ok: false, why: 'You and ' + name + ' are already friends.' };
  if (st.outgoing.some(o => o.uid === c.u)) return { ok: false, why: 'You’ve already asked ' + name + ' — they just need to confirm.' };
  return { ok: true, code, uid: c.u, name, kind, at: Number(c.at) || 0 };
}

/* B's half: the request, the code spent, my note that I asked, and my
   switches for them — the defaults, which the screen has just listed. */
export async function sendRequest(found) {
  if (!me || !found || !found.ok) return { ok: false, why: 'Look the code up first.' };
  const ask = () => updateShared({
    [PATH.req(found.uid, me)]: { n: myName(), c: found.code, k: found.kind, at: serverNow() },
    [PATH.code(found.code)]: null,
    [PATH.out(me, found.uid)]: { n: found.name, at: serverNow() },
    [PATH.share(me, found.uid)]: shareNode(defaultShare())
  });
  try { await ask(); }
  catch {
    /* The rules refuse a request to somebody whose list still holds me. If
       mine does not hold them (lookupCode() said we are not friends), that
       entry is a stale half of an old connection — it grants nothing, since
       every read needs both sides — and I may delete it. Once, then the same
       request again; the code is spent only by a request that lands. */
    try { await updateShared({ [PATH.link(found.uid, me)]: null }); await ask(); }
    catch { return { ok: false, why: 'That code couldn’t be used — it may have just been used or run out. Ask ' + found.name + ' for a new one.' }; }
  }
  return { ok: true };
}

/* A's half. The kind is the one the request carries, which is the one the
   code carried — the rules hold all three to the same value. */
export async function confirm(from) {
  const r = readPeople(people || {}).incoming.find(x => x.uid === from);
  if (!r) return { ok: false, why: 'That request has gone — they may have cancelled it.' };
  const kind = liveKind((people.req[from] || {}).k);
  if (!kind) return { ok: false, why: 'That request is for something this version of Rack doesn’t do yet.' };
  const make = () => updateShared({
    [PATH.link(me, from)]: { k: kind, n: r.name, at: serverNow() },
    [PATH.link(from, me)]: { k: kind, n: myName(), at: serverNow() },
    [PATH.req(me, from)]: null,
    [PATH.out(from, me)]: null,
    // If we had asked each other, my request to them goes too.
    [PATH.req(from, me)]: null,
    [PATH.out(me, from)]: null,
    [PATH.share(me, from)]: shareNode(defaultShare())
  });
  try { await make(); }
  catch {
    /* A list entry can be created and deleted, never overwritten, so a stale
       half of an old connection — their side of me, left when only mine went
       — refuses the create. Clearing it is safe: had we really been
       connected, my side would exist and their request could never have been
       filed. Once, and only that one entry. */
    try { await updateShared({ [PATH.link(from, me)]: null }); await make(); }
    catch { return { ok: false, why: 'That couldn’t be confirmed just now. Check your connection and try again.' }; }
  }
  bump('friendAdd');
  friendAt = 0;
  schedulePublish(500);
  return { ok: true };
}

export async function decline(from) {
  try { await updateShared({ [PATH.req(me, from)]: null, [PATH.out(from, me)]: null }); return { ok: true }; }
  catch { return { ok: false, why: 'That couldn’t be done just now. Try again.' }; }
}

export async function cancel(to) {
  try { await updateShared({ [PATH.req(to, me)]: null, [PATH.out(me, to)]: null, [PATH.share(me, to)]: null }); return { ok: true }; }
  catch { return { ok: false, why: 'That couldn’t be done just now. Try again.' }; }
}

/* Either of us can end it, at any time, and it ends at once: both entries go
   in one write, and every read a friend makes needs both. Their switches for
   me go too (theirs, but deleting can only ever show less), and the routines
   either of us left in the other's inbox. Nothing under users/ is touched. */
export async function removeFriend(f) {
  try {
    await updateShared({
      [PATH.link(me, f)]: null, [PATH.link(f, me)]: null,
      [PATH.share(me, f)]: null, [PATH.share(f, me)]: null,
      [PATH.slot(me, f)]: null, [PATH.slot(f, me)]: null
    });
  } catch {
    return { ok: false, why: 'That couldn’t be done just now. Check your connection and try again.' };
  }
  delete friendData[f];
  // v68, its own write, best effort: the nudges between us and my nudge
  // switch for them. Under rules published before v68 it is refused, and the
  // removal above has already happened either way.
  updateShared({ [PATH.nudge(me, f)]: null, [PATH.nudge(f, me)]: null, [PATH.noNudge(me, f)]: null }).catch(() => {});
  schedulePublish(500);
  return { ok: true };
}

/* What I show one friend. The switch flips on screen first; this resolves
   false when the database refused, so the screen can flip it back. */
export async function setShare(f, flags) {
  try { await writeShared(PATH.share(me, f), shareNode(flags)); }
  catch { return false; }
  schedulePublish(800);
  return true;
}

/* ================= my summaries ================= */

let pubTimer = null;
let pubBusy = false;
let pubAgain = false;

export function schedulePublish(ms) {
  if (!me) return;
  clearTimeout(pubTimer);
  pubTimer = setTimeout(() => { publish().catch(() => {}); }, Math.max(0, ms | 0));
}

// What each category was last published as (without its stamp) and on which
// day, so an unchanged summary is not rewritten more than once a day. Device
// state: losing it costs one rewrite.
const PUB_KEY = 'friendsPub';

async function build(cat, today, cache) {
  const sessions = async () => (cache.s || (cache.s = await allSessions().catch(() => [])));
  const targets = async () => (cache.t !== undefined ? cache.t : (cache.t = await read('food/targets', null)));
  if (cat === 'pr') return prPart(prTimeline(await sessions()), today);
  if (cat === 'td') return trainedPart((await sessions()).map(s => s._date), today);
  if (cat === 'st') return stepsPart(await read('steps', null), today);
  if (cat === 'mac') return macroPart(await read('food/daySummaries', null), await targets(), today);
  if (cat === 'wt') {
    const entries = (await read('weight/entries', null)) || {};
    try { await refreshModel(entries); } catch {}
    const t = await targets();
    let rate = null;
    try { rate = trendRate(entries).rateWk; } catch {}
    return weightPart({ tw: trendWeight(), rateWk: rate, goalLb: t && t.goalLb, dir: goalDirection(t, null) });
  }
  return null;
}

/* Work out and write the summaries my friends may read — only the categories
   at least one friend has switched on, every other one deleted — in one
   multi-path write. With no friends, everything I ever published goes. */
export async function publish() {
  if (!me || people === null) return;
  if (pubBusy) { pubAgain = true; return; }
  if (!online.value) return;
  pubBusy = true;
  try {
    const p = readPeople(people);
    const want = p.friends.length ? wantedCats(Object.fromEntries(p.friends.map(f => [f.uid, f.share]))) : [];
    const today = todayKey();
    const last = LS.get(PUB_KEY, {}) || {};
    const next = {};
    const upd = {};
    const cache = {};
    const put = (cat, value) => {
      const fp = value === null ? null : JSON.stringify(value);
      const was = last[cat];
      if (fp === null) {
        // Deleted again once a day, not once ever: another of my phones may
        // have published it since. Unreadable either way — the switches gate
        // it — but nothing nobody may read should be kept.
        if (was && was.fp === null && was.day === today) { next[cat] = was; return; }
        upd[PATH.shared(me, cat)] = null;
      } else {
        if (was && was.fp === fp && was.day === today) { next[cat] = was; return; }
        upd[PATH.shared(me, cat)] = { ...value, at: serverNow() };
      }
      next[cat] = { fp, day: today };
    };
    put('me', p.friends.length ? { n: myName() } : null);
    for (const cat of SHARE_IDS) {
      let v = null;
      if (want.includes(cat)) { try { v = await build(cat, today, cache); } catch { v = null; } }
      put(cat, v);
    }
    if (Object.keys(upd).length) {
      await updateShared(upd);
      LS.set(PUB_KEY, next);
    }
    await publishAvatar(p.friends.length > 0, today);
  } catch {
    // Refused or dropped: the fingerprints were not saved, so the next
    // publish tries again.
  } finally {
    pubBusy = false;
    if (pubAgain) { pubAgain = false; schedulePublish(1000); }
  }
}

/* v68: my face, for my friends — its own write, never part of the one
   above. Under rules published before v68 it is refused, and a refusal must
   cost nothing but the face: the summaries above have already landed, and
   the fingerprint is kept only when this write lands, so it is tried again
   on the next publish and stops failing the moment the rules are pasted.
   With no friends, or no photo, it is deleted. */
const AV_KEY = 'friendsAv';
async function publishAvatar(any, today) {
  const was = LS.get(AV_KEY, null) || {};
  const src = any && typeof myPhoto === 'string' && myPhoto.startsWith('data:image/') ? myPhoto : null;
  const key = src ? src.length + ':' + src.slice(-48) : null;
  if (was.key === key && was.day === today) return;
  let value = null;
  if (src) {
    const p = await shrinkAvatar(src).catch(() => null);
    if (!avatarOk(p)) return;               // never written in a shape the rules refuse
    value = { p, at: serverNow() };
  }
  try { await updateShared({ [PATH.shared(me, 'av')]: value }); LS.set(AV_KEY, { key, day: today }); }
  catch { /* the rules may not be published yet: next publish, again */ }
}

/* The profile picture (144 px, up to 24,000 characters) drawn again at
   AV_PX square, quality stepping down and then the size, until it is at most
   AV_MAX characters — about 4 KB of picture. The canvas is the browser's;
   the port does the same with the platform's image API. Null if it cannot. */
function shrinkAvatar(src) {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') { resolve(null); return; }
    const img = new Image();
    img.onerror = () => resolve(null);
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      if (!(side > 0)) { resolve(null); return; }
      const sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
      for (let px = AV_PX; px >= 32; px = Math.round(px * 0.8)) {
        const cv = document.createElement('canvas');
        cv.width = px; cv.height = px;
        const ctx = cv.getContext('2d');
        if (!ctx) break;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, px, px);
        for (const q of [0.7, 0.55, 0.4]) {
          const d = cv.toDataURL('image/jpeg', q);
          if (d.length <= AV_MAX && avatarOk(d)) { resolve(d); return; }
        }
      }
      resolve(null);
    };
    img.src = src;
  });
}

/* My own numbers, built the way my friends read them, for my row on the
   boards — whether or not I show them to anybody. */
export async function mySummaries() {
  const today = todayKey();
  const cache = {};
  const out = {};
  for (const cat of ['pr', 'td', 'st']) { try { out[cat] = await build(cat, today, cache); } catch { out[cat] = null; } }
  return out;
}

/* ================= my friends' ================= */

/* Per friend: which switches they have on for me (I may read that much of
   their node), then only those categories. A read the rules refuse is null
   — the same as "not shared" — never an error on screen. */
export function loadFriends(force) {
  if (friendLoad) return friendLoad;
  if (!force && friendAt && Date.now() - friendAt < FRIEND_TTL) return Promise.resolve(friendData);
  const list = readPeople(people || {}).friends;
  friendLoad = Promise.all(list.map(async f => {
    const share = normShare(await readShared(PATH.share(f.uid, me), null));
    const d = { share, me: await readShared(PATH.shared(f.uid, 'me'), null) };
    // v68: their face, if they have one and the rules are published. A
    // refused read is no face — the letters, as before.
    d.av = readAvatar(await readShared(PATH.shared(f.uid, 'av'), null));
    await Promise.all(SHARE_IDS.filter(id => share[id]).map(async id => { d[id] = await readShared(PATH.shared(f.uid, id), null); }));
    return [f.uid, d];
  })).then(rows => {
    friendData = Object.fromEntries(rows);
    friendAt = Date.now();
    friendLoad = null;
    tell();
    return friendData;
  }).catch(() => { friendLoad = null; return friendData; });
  return friendLoad;
}

/* ================= routines ================= */

export { routineList };

/* The routine I would send, as it would go — or why it cannot. */
export function routineFor(r) { return routinePayload(r); }

/* Whether I already have one waiting in their inbox (one slot per sender:
   sending again replaces it). */
export async function pendingTo(f) {
  const v = await readShared(PATH.slot(f, me), null);
  return v && v.r ? cleanName(v.r.name, 'A routine') : null;
}

export async function sendRoutine(f, routine) {
  const p = routinePayload(routine);
  if (!p.ok) return p;
  try { await writeShared(PATH.slot(f, me), { at: serverNow(), n: myName(), r: p.r }); }
  catch { return { ok: false, why: 'That couldn’t be sent. Check your connection — and that you’re still friends.' }; }
  bump('routineSend');
  return { ok: true };
}

/* What an inbox item would become if I saved it: the routine, and the new
   custom exercises it would add to my library. Nothing is written. */
export function preview(from) {
  const item = inbox[from];
  if (!item) return null;
  return receivedRoutine(item, {
    library: allExercises(), makeCustom: makeCustomExercise,
    newId: 'r' + Date.now().toString(36), nowMs: Date.now(), fromName: item.n
  });
}

export async function acceptRoutine(from) {
  if (!libraryReady()) return { ok: false, why: 'Your exercise library is still loading. Try again in a moment.' };
  const got = preview(from);
  if (!got) return { ok: false, why: 'That routine couldn’t be read. Ask them to send it again.' };
  try {
    if (got.customs.length) await adoptCustom(got.customs);
    await adoptRoutine(got.routine);
  } catch {
    return { ok: false, why: 'That couldn’t be saved just now. It’s still in your inbox — try again.' };
  }
  await writeShared(PATH.slot(me, from), null).catch(() => {});
  return { ok: true, name: got.routine.name };
}

export async function declineRoutine(from) {
  try { await writeShared(PATH.slot(me, from), null); return { ok: true }; }
  catch { return { ok: false, why: 'That couldn’t be done just now. Try again.' }; }
}

/* ================= nudges (v68) ================= */

/* Old, junk and from-a-stranger nudges are deleted (I may delete anything
   in my nudge box). Best effort. */
function tidyNudges() {
  if (!me || !people || !online.value) return;
  const { stale } = readNudges(nudgeNode, people, Date.now());
  if (!stale.length) return;
  updateShared(Object.fromEntries(stale.map(from => [PATH.nudge(me, from), null]))).catch(() => {});
}

/* Whether I can nudge `f` now, by my own node: { ok } or { ok: false, why,
   left }. The rules are the real check — this is what the button says. */
export function canNudge(f) {
  const fr = readPeople(people || {}).friends.find(x => x.uid === f);
  if (!fr) return { ok: false, why: 'They’re not on your list any more.' };
  const left = nudgeWait(fr.nudgedAt, Date.now());
  if (left > 0) return { ok: false, left, why: 'You’ve nudged ' + cleanName(fr.name).split(' ')[0] + ' today. One a day.' };
  return { ok: true };
}

/* One nudge: the wording's number and the server's time in their nudge box,
   and my stamp beside it, in one write — the rules take neither alone. The
   wording rotates per friend (device state). */
export async function sendNudge(f) {
  const can = canNudge(f);
  if (!can.ok) return can;
  if (!online.value) return { ok: false, why: 'You’re offline. Try again with a signal.' };
  const vKey = 'nudgeV:' + f;
  const v = nextVariant(LS.get(vKey, null));
  try {
    await updateShared({ [PATH.nudge(f, me)]: { v, at: serverNow() }, [PATH.nudged(me, f)]: serverNow() });
  } catch {
    return { ok: false, why: 'That nudge didn’t go through. They may have nudges switched off — or, if this keeps happening, the Friends rules may not be published yet.' };
  }
  LS.set(vKey, v);
  bump('nudgeSend');
  return { ok: true, v };
}

/* Dismiss: the nudge is deleted from my box. */
export async function dismissNudge(from) {
  try { await updateShared({ [PATH.nudge(me, from)]: null }); return { ok: true }; }
  catch { return { ok: false, why: 'That couldn’t be done just now. Try again.' }; }
}

/* My switches: nudges from one friend (on unless I say otherwise), and from
   anybody. Turning one off deletes what that friend has already sent. Each
   resolves false when refused, so the screen can flip it back. */
export async function setNudgesFrom(f, on) {
  const upd = { [PATH.noNudge(me, f)]: on ? null : true };
  if (!on) upd[PATH.nudge(me, f)] = null;
  try { await updateShared(upd); return true; } catch { return false; }
}
export async function setQuiet(on) {
  const upd = { [PATH.quiet(me)]: on ? true : null };
  if (on) for (const from of Object.keys(nudgeNode || {})) upd[PATH.nudge(me, from)] = null;
  try { await updateShared(upd); return true; } catch { return false; }
}
export const NUDGE_COUNT = NUDGE_LINES.length;

// The rules' code lifetime, for the screen's "lasts a day".
export const CODE_HOURS = Math.round(CODE_TTL_MS / 3600000);
