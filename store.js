// Data layer: Firebase RTDB + a per-account localStorage mirror.
//
// Two things live here and nowhere else:
//
//   1. Every path the app touches under users/{uid}/ is built by userPath(),
//      so there is exactly one place where an account's data gets addressed.
//      No module builds a path with a uid in it. That is what makes "can one
//      account see another's data" a question with one answer instead of
//      nineteen.
//
//   2. Every localStorage key is namespaced by uid by lsKey(). Same reason:
//      the offline mirror is as much a place data lives as the database is.
//
// The public feed that used to live here is gone. It was one world-readable
// node holding a summary of one person, and there is no version of it that
// stays sane once a second account exists. Nothing outside the app reads this
// database any more.

import { firebaseConfig, OWNER_UID } from './firebase-config.js';
import { normUnits } from './units.js';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile, signOut, onAuthStateChanged,
  setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getDatabase, ref, get, set, update, remove, onValue
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db   = getDatabase(app);

let UID = null;
export const online = { value: navigator.onLine };

window.addEventListener('online',  () => { online.value = true;  syncPip(); flushQueue(); });
window.addEventListener('offline', () => { online.value = false; syncPip(); });

function syncPip() {
  const el = document.getElementById('syncPip');
  if (!el) return;
  el.classList.toggle('off', !online.value);
  el.querySelector('span').textContent = online.value ? 'synced' : 'offline';
}

/* ---------- auth ---------- */
export async function login(email, password) {
  await setPersistence(auth, browserLocalPersistence);
  return signInWithEmailAndPassword(auth, email, password);
}

// Creating the Firebase Auth account is deliberately NOT the thing that grants
// access. Anyone who can read this repo can call Google's signUp endpoint with
// the public API key and get an account — that is true of every client-side
// Firebase app and no amount of JavaScript here changes it. What decides
// whether an account can touch any data is one node in the database,
// access/approved/{uid}, which only the owner can write. See access.js.
export async function signup(email, password, displayName) {
  await setPersistence(auth, browserLocalPersistence);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    try { await updateProfile(cred.user, { displayName: displayName.slice(0, 60) }); } catch {}
  }
  return cred;
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export function logout() { return signOut(auth); }

export function watchAuth(cb) {
  return onAuthStateChanged(auth, u => {
    UID = u ? u.uid : null;
    if (UID) migrateLegacyKeys();
    cb(u);
  });
}
export function uid() { return UID; }
export function isOwner() { return UID === OWNER_UID; }
export function currentEmail() { const u = auth.currentUser; return u && u.email ? u.email : ''; }

/* ---------- ID token ----------
   A short-lived, Google-signed proof that this browser really is signed in as
   this uid. It is what the AI proxy checks before it will spend a cent of the
   Anthropic balance. Firebase refreshes it on its own when it is close to
   expiring, so ask for a fresh one on every call rather than caching it. */
export async function idToken() {
  const u = auth.currentUser;
  if (!u) return null;
  try { return await u.getIdToken(); } catch { return null; }
}

/* ---------- local mirror ----------
   Every key is namespaced by account. A flat prefix is fine with one account
   and quietly wrong with two: sign out, sign in as somebody else on the same
   phone, and the mirror serves the previous user's food log whenever the
   network is slow, initWorkout() hands them the previous user's in-progress
   workout, and the offline queue still holds writes addressed to a subtree
   this account isn't allowed to touch — which then fail permission and retry
   on every reconnect, forever. */
function lsKey(k) { return 'rack:' + (UID || 'anon') + ':' + k; }

const LS = {
  get(k, fallback) {
    try { const v = localStorage.getItem(lsKey(k)); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(k, v) { try { localStorage.setItem(lsKey(k), JSON.stringify(v)); } catch {} },
  del(k)    { try { localStorage.removeItem(lsKey(k)); } catch {} }
};
export { LS };

// The `fit:` prefix predates per-account namespacing, so those keys belong to
// whoever used this device before the rename — which on every real install is
// the owner. Carrying them into a second account's namespace would hand that
// account the owner's cached food log, so anyone else just gets them swept.
function migrateLegacyKeys() {
  try {
    if (!UID) return;
    const old = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fit:')) old.push(k);
    }
    if (!old.length) return;
    const keep = UID === OWNER_UID && !localStorage.getItem('rack:migrated');
    if (keep) {
      old.forEach(k => {
        const v = localStorage.getItem(k);
        if (v != null) localStorage.setItem('rack:' + UID + ':' + k.slice(4), v);
      });
      localStorage.setItem('rack:migrated', '1');
    }
    old.forEach(k => localStorage.removeItem(k));
  } catch {}
}

/* Wipe this device's copy of the signed-in account's data. The mirror is
   namespaced, so another account can never read it through the app — but on a
   borrowed or shared phone "unreachable through the app" is not the same as
   "gone", and this is the button that makes it gone. */
export function purgeDevice(forUid) {
  const target = forUid || UID;
  if (!target) return 0;
  const pre = 'rack:' + target + ':';
  const doomed = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(pre)) doomed.push(k);
    }
    doomed.forEach(k => localStorage.removeItem(k));
  } catch {}
  return doomed.length;
}

/* ---------- a refusal is not a dropped connection ----------

   The queue exists for one thing: a write that did not land because the phone
   could not reach the database. Retrying that is exactly right, and it is what
   flushQueue() has always done.

   Server-side .validate rules change what a refusal means. It stops being "not
   now" and becomes THIS PAYLOAD IS MALFORMED, which no amount of retrying
   fixes. Queued anyway, such a write:

     - retries forever, on every reconnect, for the life of the install;
     - leaves the mirror holding a value the database rejected, so the app shows
       it as saved and a later read makes it vanish with nothing on screen ever
       having said why;
     - and is completely silent, which is the one thing a validation rule must
       not be. A rule that is too strict has to be findable.

   Today that is nearly unreachable — the published rules check who is writing
   and little else. The day the stricter rules are published it is routine,
   which is why those rules are waiting on this.

   RTDB spells it `error.code === 'PERMISSION_DENIED'` and starts the message
   with the same token. A FAILED .validate ARRIVES AS THAT SAME CODE — there is
   no separate "invalid data" status on the wire — which is what lets one test
   cover both. Both fields are checked because the SDK builds the error two
   different ways depending on which path reported it.

   Ported from the native tree (src/data/store.js, 14 Sep) so the two clients
   cannot drift on what counts as a refusal. */
function isRefusal(e) {
  const s = String((e && (e.code || e.message)) || '');
  return s.toUpperCase().indexOf('PERMISSION_DENIED') !== -1;
}

function refused(path, e) {
  const detail = String((e && e.message) || '').slice(0, 160);
  const why =
    'REFUSED BY THE DATABASE — ' + path + '\n' +
    'The security rules rejected this write, so it was not saved and not ' +
    'queued: retrying cannot fix it. If this is ordinary data, a validation ' +
    'rule is too strict and that is the bug.' + (detail ? '\n' + detail : '');
  return reportBlock(why);
}

/* ---------- the dead-letter list ----------

   A refused write is neither queued nor thrown away. Queuing it is the bug
   above; throwing it away means losing something somebody typed on the word of
   a rule that may itself be what is wrong. So it is kept here, and it is never
   replayed automatically — that is the whole difference between this list and
   the queue. It leaves only by being retried or discarded from Settings, which
   is the recovery path for the morning after a rules publish goes wrong.

   Bounded, because a permanently refused write must not be able to fill the
   device. What goes when it is full is not simply the oldest: a workouts/
   payload is the only thing in here that cannot be reconstructed from anything
   else on the phone, because runFinish deletes the live session the moment the
   record write resolves. So the oldest ORDINARY item goes first, and a session
   is only ever dropped to make room for another session. When the list is
   nothing but sessions and something else is refused, the new item is the one
   that does not fit — the red bar still fires, so the refusal is not silent
   even though the payload is not kept.

   The path stored is the full `users/{uid}/…`, the same as the queue's, so the
   same prefix check keeps one account from seeing or retrying another's. The
   localStorage key is already namespaced by uid; this is the second lock on
   the same door, and the first one has been picked before.

   Each item carries an `id` — the time in base 36 and a counter that restarts
   with the page. Two refusals of one path in one millisecond — a merge and a
   set from the same handler is the ordinary way it happens — used to share a
   handle, and then Discard removed the wrong row and Try again retried it. The
   composite is still read, because items written before this exist on devices
   and have to stay retryable. This is native's rule
   (src/data/store.js `deadId`), adopted here.

   Every eviction rule here is native's too, and was already what the paragraph
   above claimed while the code did something else: `if (at === -1) at = 0`
   dropped the oldest SESSION so that a water log could be kept, which is the
   exact trade this list exists to forbid. */
const REFUSED_MAX = 50;

function refusedItems() { return LS.get('refused', []); }
// `(\/|$)` and not `\/`, so that a write to the workouts container itself is
// protected the same way a write to one month inside it is. Native's spelling.
function isSessionPath(p) { return /\/workouts(\/|$)/.test(String(p || '')); }
function refusedKey(x) { return (x && x.id) || ((x && x.at) + '|' + (x && x.path)); }

let refusedSeq = 0;
const refusedId = () => Date.now().toString(36) + '-' + (++refusedSeq).toString(36);

function pushRefused(path, value, merge, detail) {
  const item = { id: refusedId(), path, value, merge: !!merge, at: Date.now(),
                 detail: String(detail || '').slice(0, 160) };
  const list = refusedItems();
  list.push(item);
  while (list.length > REFUSED_MAX) {
    let at = list.findIndex(x => !isSessionPath(x && x.path));
    if (at === -1) {
      // Every item in a full list is a session. The INCOMING item is the one
      // that does not fit — unless it is a session too, in which case oldest
      // out applies among them: both directions lose a session, so the stated
      // default wins. The red bar has already fired either way, so a dropped
      // payload is not a silent one.
      if (!isSessionPath(item.path)) { const me = list.lastIndexOf(item); list.splice(me, 1); break; }
      at = 0;
    }
    list.splice(at, 1);
  }
  LS.set('refused', list);
}

/* What Settings shows. Filtered the way flushQueue filters the queue, so an
   item left by another account — a bug, or a shared device — is invisible and
   unretryable rather than merely unlikely to be reached. `key` is a handle for
   the two buttons: the item's own id now, and for anything written before this
   existed, the composite it has always been. */
export function refusedSaves() {
  if (!UID) return [];
  const mine = 'users/' + UID + '/';
  return refusedItems()
    .filter(x => x && typeof x.path === 'string' && x.path.startsWith(mine))
    .map(x => ({ ...x, key: refusedKey(x), short: x.path.slice(mine.length) }));
}

export function discardRefused(key) {
  const list = refusedItems();
  const at = list.findIndex(x => refusedKey(x) === key);
  if (at === -1) return false;
  list.splice(at, 1);
  LS.set('refused', list);
  return true;
}

/* 'saved' | 'refused' | 'offline' | 'gone'. A refusal LEAVES the item where it
   is — the rule may still be the thing that is wrong, and the point of keeping
   the payload is that it is still there when the rule is fixed. A network
   failure is not a second refusal and must not be reported as one. */
export async function retryRefused(key) {
  if (!UID) return 'gone';
  const mine = 'users/' + UID + '/';
  const list = refusedItems();
  const at = list.findIndex(x => refusedKey(x) === key);
  if (at === -1) return 'gone';
  const item = list[at];
  if (!item.path || !item.path.startsWith(mine)) {
    list.splice(at, 1); LS.set('refused', list);
    return 'gone';
  }
  if (!online.value) return 'offline';
  try {
    if (item.merge) await update(ref(db, item.path), item.value);
    else            await set(ref(db, item.path), item.value);
  } catch (e) {
    return isRefusal(e) ? 'refused' : 'offline';
  }
  // A PUT is the whole node, so the mirror can be put back with confidence. A
  // merge is not, and the next read is what settles that one.
  if (!item.merge) {
    const short = item.path.slice(mine.length);
    LS.set('mirror:' + short, item.value);
    clearPartial(short);
  }
  // Re-read rather than reusing `list`: a retry awaits the network, and
  // anything could have been added or discarded while it did.
  const after = refusedItems();
  const j = after.findIndex(x => refusedKey(x) === key);
  if (j !== -1) { after.splice(j, 1); LS.set('refused', after); }
  return 'saved';
}

/* ---------- write queue (survives offline) ---------- */
function queue() { return LS.get('queue', []); }
// A queued item is a PUT unless it is marked as a merge, which is what the
// guard falls back to when it cannot tell whether a PUT would erase anything.
// An old queue holds no `merge` key and replays as it always did.
function pushQueue(path, value, merge) {
  const q = queue();
  q.push(merge ? { path, value, merge: true, at: Date.now() } : { path, value, at: Date.now() });
  LS.set('queue', q);
}

export async function flushQueue() {
  if (!UID || !online.value) return;
  const q = queue();
  if (!q.length) return;
  const mine = 'users/' + UID + '/';
  const remaining = [];
  for (const item of q) {
    // A queued write addressed to somebody else's subtree can only be junk left
    // by a bug or a shared device. It would be refused by the rules anyway;
    // dropping it here stops it retrying on every reconnect forever.
    if (!item.path || !item.path.startsWith(mine)) continue;
    try {
      if (item.merge) await update(ref(db, item.path), item.value);
      else            await set(ref(db, item.path), item.value);
    }
    catch (e) {
      /* Dead-lettered, not kept. This one was queued while offline, so nothing
         has ever told anybody it failed — and keeping it means replaying a
         write the rules will refuse identically on every reconnect for the life
         of the install. The mirror goes with it: there is no prior value to put
         back here the way write() has one, and a mirror the database has
         rejected must not go on being served as though it were the node. A read
         while online replaces it with the truth. */
      if (isRefusal(e)) {
        const short = item.path.slice(mine.length);
        LS.del('mirror:' + short);
        clearPartial(short);
        pushRefused(item.path, item.value, item.merge, (e && e.message) || '');
        refused(short, e);
        continue;
      }
      remaining.push(item);
    }
  }
  LS.set('queue', remaining);
}

/* ---------- the destructive-write guard ----------

   A validation rule stops a MALFORMED write. Nothing on the server stops a
   WELL-FORMED one that erases everything it does not carry: a half-loaded
   container PUT over a full node is perfectly good data, and `{}` and `null`
   are not validated at all, because `.validate` is not evaluated for a delete.

   The rule that would catch it — a `numChildren()` floor — was written and
   proved and then deliberately not published, because it also refuses
   legitimate offline work. flushQueue() replays a node's queued PUTs and only
   the last one survives, so N deletions made one at a time over an afternoon
   land on the server as a single net drop of N children, which is exactly what
   a wipe looks like. No threshold fixes that; somebody can always delete one
   more row than the threshold allows.

   The distinction the client has and the rule does not is INTENT, and the only
   place it still exists is here, at the moment write() is called: one call, one
   thing the user did. By the time the queue replays it is gone.

   So the check is per CALL, measured against the mirror — this device's own
   belief about what the server holds, which write() steps down on every call
   INCLUDING one that only got queued. That is what makes three offline deletes
   measure 1, 1 and 1 rather than 3: the coalesced replay never passes through
   here at all, so the case that sank the server rule passes by construction
   rather than by tuning a number.

   Refusal is the last resort, not the first. When the mirror is silent and the
   database cannot be reached there is no measurement to make, and a guard that
   answered that by throwing the write away would take the offline log — the
   thing the queue exists for — with it. So that case goes out as a merge
   instead: an update() cannot erase a child it does not name, which makes it
   safe without knowing what is there. What is left to refuse is a write that
   can only be said as a PUT and cannot be measured, and a write that was
   measured and really does drop more than one user action's worth. */

/* The nodes this app PUTs WHOLE, and how many children ONE user action may
   remove from each. The numbers come from tracing every write() call site in
   the repo: each of them adds a row, edits a row, or deletes exactly one. A
   caller that means to remove more says so with write()'s third argument, which
   is what a deliberate bulk delete would have to do.

   NOT listed, each for a reason: profile, onboarding, settings/*, food/targets,
   steps/$day and food/daySummaries/$day are fixed-key records rather than lists
   of rows; workouts/$month/$dd/$id is a descendant write and cannot erase a
   sibling; food/recall goes through mergeUpdate(), one child per key.

   `history` is listed but unbounded, because rebuildHistoryFromLog() rebuilds
   the whole node from the log — deleting a session that was the only appearance
   of five exercises legitimately drops five children — and it is the one
   container whose loss is recoverable, since that same function reconstructs it
   from `workouts`, which is what the rest of this guard exists to protect. */
const CONTAINERS = [
  [/^weight\/entries$/,                      1],
  [/^food\/items$/,                          1],
  [/^food\/meals$/,                          1],
  [/^food\/log\/[^/]+$/,                     1],
  [/^water\/log\/[^/]+$/,                    1],
  [/^routines$/,                             1],
  [/^workouts\/[^/]+$/,                      1],
  [/^exercises\/(custom|overrides|hidden)$/, 1],
  [/^history$/,                       Infinity]
];

function budgetFor(path) {
  for (const [re, n] of CONTAINERS) if (re.test(path)) return n;
  return null;
}
export function isContainer(path) { return budgetFor(path) !== null; }

// A list of plain ids rather than of records. exercises/hidden is the only one.
function isIdList(v) {
  return Array.isArray(v) && v.length > 0 &&
         v.every(x => x !== null && typeof x !== 'object');
}

/* What the write DROPS, counted BY KEY — not a child count, because a write
   that removes two rows and adds three has a HIGHER count and still dropped
   two. Counting keys is also what makes the array-shaped containers come out
   right: RTDB stores an array keyed '0','1','2' and a removal renumbers it, so
   the keys that disappear are the tail.

   An array of plain ids is counted by id instead, and today that means
   exercises/hidden alone. picker.js appends without checking for a duplicate,
   so a live account can hold the same id twice over, and one tap of "put it
   back in the picker" filters out both copies — two keys gone for one thing the
   user did. Counting ids makes that pass by construction rather than by raising
   a number, and a real wipe still drops every id there is. */
export function droppedChildren(prior, value) {
  if (prior === null || typeof prior !== 'object') return 0;
  const after = (value !== null && typeof value === 'object') ? value : {};
  if (isIdList(prior)) {
    const kept = new Set(Array.isArray(after) ? after : Object.values(after));
    let n = 0;
    for (const id of new Set(prior)) if (!kept.has(id)) n++;
    return n;
  }
  const before = Object.keys(prior);
  if (!before.length) return 0;
  let n = 0;
  for (const k of before) {
    // undefined and null both mean "not there after this write": the SDK drops
    // an undefined, and RTDB stores a null as a delete.
    const v = after[k];
    if (v === undefined || v === null) n++;
  }
  return n;
}

/* A guard that refuses quietly is worse than no guard, because the app carries
   on looking as though it saved. There is no one place to hand a listener to —
   mergeUpdate() swallows its errors and half the write() call sites are
   fire-and-forget — so the banner goes up from here, the same way syncPip()
   reaches for its own element. It does not fade, because the whole point is
   that it is still there when somebody finally looks at the screen. */
let onBlock = null;
export function onGuardBlock(fn) {
  onBlock = fn;
  return () => { if (onBlock === fn) onBlock = null; };
}

export function reportBlock(why) {
  try { if (onBlock) onBlock(why); } catch {}   // never masks the thing it reports
  try { console.error('[store] ' + why); } catch {}
  try { showBlockBanner(why); } catch {}
  return why;
}

function showBlockBanner(why) {
  if (typeof document === 'undefined' || !document.body) return;
  const old = document.getElementById('writeBlock');
  if (old) old.remove();
  const box = document.createElement('div');
  box.id = 'writeBlock';
  box.setAttribute('role', 'alert');
  box.style.cssText =
    'position:fixed;left:10px;right:10px;bottom:10px;z-index:9999;' +
    'background:#7f1d1d;color:#fff;padding:12px 14px;border-radius:12px;' +
    'font:13px/1.45 system-ui,-apple-system,sans-serif;white-space:pre-wrap;' +
    'box-shadow:0 8px 28px rgba(0,0,0,.45)';
  const msg = document.createElement('div');
  msg.textContent = why;
  const x = document.createElement('button');
  x.textContent = 'Dismiss';
  x.style.cssText =
    'margin-top:10px;background:#fff;color:#7f1d1d;border:0;border-radius:8px;' +
    'padding:6px 12px;font:inherit;font-weight:600';
  x.onclick = () => box.remove();
  box.appendChild(msg);
  box.appendChild(x);
  document.body.appendChild(box);
}

/* readExact()'s decision logic — it throws when it could not reach the database
   and resolves null only when the database itself said "nothing" — without
   readExact's side effect of writing the mirror. A guard must not leave a trace
   in the very place write()'s own reasoning starts from: `undefined` there has
   to keep meaning "this device has never read that node". */
async function peekServer(path) {
  // No mirror fallback, deliberately. This is only ever called because the
  // mirror is not to be believed — absent, or written by this device over a
  // node it has never read — so handing it back here would answer the question
  // with the very thing that prompted it.
  if (!online.value) throw new Error('offline');
  const snap = await get(ref(db, userPath(path)));
  return snap.exists() ? snap.val() : null;
}

/* A mirror written by a read is a picture of the server. A mirror written by
   write() is only this device's own belief, and for a node this device has
   never read those are not the same thing — the server may hold rows nobody
   here has ever seen. Those paths are remembered, because the difference is
   exactly whether a later write may safely be a PUT. A read while online
   replaces the mirror with the real node and the mark goes with it. */
function partialMirrors() { return LS.get('mirrorPartial', {}); }
function isPartial(path)  { return !!partialMirrors()[path]; }
function markPartial(path) {
  const m = partialMirrors();
  if (!m[path]) { m[path] = 1; LS.set('mirrorPartial', m); }
}
function clearPartial(path) {
  const m = partialMirrors();
  if (m[path]) { delete m[path]; LS.set('mirrorPartial', m); }
}

/* The same write expressed as an update() instead of a set(): every key the
   value carries, plus an explicit null for each key this device put in the
   mirror itself and has now removed. An update() cannot touch a child it does
   not name, so this lands the user's work without risking rows the device has
   never seen — and the deletions it does carry are ones this device can account
   for, so they still measure against the budget.

   Returns null when the write cannot honestly be said that way. An array is the
   main case: RTDB keys one by index, so merging would overwrite whichever rows
   happen to share a position rather than the ones meant. `null` and `{}` are
   the other: there is nothing to merge and the whole intent is deletion, which
   is the one thing that must never go out unmeasured. */
function mergeFor(local, value, budget) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const obj = { ...value };
  if (!Object.keys(obj).length) return null;
  if (local !== null && typeof local === 'object' && !Array.isArray(local)) {
    for (const k of Object.keys(local)) if (!(k in obj)) obj[k] = null;
  }
  let gone = 0;
  for (const k of Object.keys(obj)) if (obj[k] === null) gone++;
  return gone <= budget ? obj : null;
}

// What write() should do: { put: true }, { merge: obj }, or { why: reason }.
async function writePlan(path, value, intent) {
  const listed = budgetFor(path);
  if (listed === null) return { put: true };    // not a whole-container PUT
  if (intent && intent.derived) return { put: true };
  const budget = intent && typeof intent.removes === 'number' && intent.removes >= 0
    ? intent.removes : listed;
  if (budget === Infinity) return { put: true };

  const local = LS.get('mirror:' + path, undefined);
  let prior = local;
  if (local === undefined || isPartial(path)) {
    /* Never read on this device, or mirrored only from this device's own
       offline writes, which is not evidence about the server. Guessing here is
       the exact shape of the disaster — a failed boot read yields an empty list
       which is then PUT over a full node — so go and look instead. One GET per
       node per device until a read settles it.

       If the look fails there is still no honest measurement, but that is a
       reason not to PUT rather than a reason to throw the user's work away.
       This is the ordinary first-of-the-month and first-of-the-day case:
       food/log/{date} and water/log/{date} get a new key every midnight, so
       any day begun without a signal starts with a mirror that does not exist
       yet, and refusing there would lose a whole day's logging — the path the
       offline queue exists for. So the write goes out as a merge, which cannot
       erase, and the node stays marked partial so the next write reasons the
       same way until a real read settles it. */
    try { prior = await peekServer(path); }
    catch {
      const obj = mergeFor(local, value, budget);
      if (obj) return { merge: obj };
      return { why: 'Not saved — ' + path + '\n' +
        'This device has never read that list from the database and cannot ' +
        'reach it now, so there is no way to tell whether this write would ' +
        'erase it. Nothing was saved. Try again once you are online.' };
    }
  }

  const dropped = droppedChildren(prior, value);
  if (dropped <= budget) return { put: true };
  return { why: 'Not saved — ' + path + '\n' +
    'This write would have removed ' + dropped + ' item' + (dropped === 1 ? '' : 's') +
    ' at once, from a list where one thing you do removes at most ' + budget + '.\n' +
    'Nothing was saved and nothing was queued — the data on the server is ' +
    'untouched. This usually means this device loaded only part of that node. ' +
    'Reopen the tab while online and try again.' };
}

/* ---------- generic read/write, always inside users/{uid} ---------- */
function userPath(p) { return `users/${UID}/${p}`; }

/**
 * @param {string} path   under users/{uid}
 * @param {*}      value  the whole node — write() is a set(), a PUT, except on
 *                        a container this device has never read and cannot
 *                        reach, where it goes out as the equivalent merge
 * @param {object} intent optional, and only read for the container paths above:
 *                          { removes: N }   at most N children may vanish
 *                          { derived: true} this node is rebuilt from another,
 *                                           so a shrink carries no information
 * @throws if the write is refused — by the guard above, or by the database
 *         itself — so that a caller cannot carry on as though it saved. Assign
 *         module state AFTER this resolves, not before. A write that could not
 *         be SENT is not a refusal: it is queued and this resolves.
 */
export async function write(path, value, intent) {
  // Mirroring before the sign-in check would write the value into the `anon`
  // namespace, where the next account to sign in on this device inherits it.
  if (!UID) return;
  // Before the mirror is touched, so a refusal leaves nothing behind claiming
  // the write happened.
  const plan = await writePlan(path, value, intent);
  if (plan.why) throw new Error(reportBlock(plan.why));
  /* Captured BEFORE the mirror is overwritten, so a refusal from the database
     can put it back. The `undefined` sentinel is the one LS.get turns on: it
     means "no mirror at all", which is a different thing from a mirrored null.
     The partial mark is part of what the mirror MEANS, so it is captured and
     restored with it — rolling the value back and leaving the mark would tell
     the next write that a node this device has read properly is unread. */
  const mk = 'mirror:' + path;
  const priorMirror = LS.get(mk, undefined);
  const wasPartial = isPartial(path);
  LS.set(mk, value);
  // A mirror this write put there over a node nobody here has read is still not
  // a picture of the server, and saying so is what keeps the next write from
  // treating it as one.
  if (plan.merge) markPartial(path); else clearPartial(path);
  const full = userPath(path);
  if (plan.merge) {
    if (!online.value) { pushQueue(full, plan.merge, true); return; }
    try { await update(ref(db, full), plan.merge); }
    catch (e) {
      if (isRefusal(e)) throw new Error(rollBack(path, priorMirror, wasPartial, full, plan.merge, true, e));
      pushQueue(full, plan.merge, true);
    }
    return;
  }
  if (!online.value) { pushQueue(full, value); return; }
  try { await set(ref(db, full), value); }
  catch (e) {
    if (isRefusal(e)) throw new Error(rollBack(path, priorMirror, wasPartial, full, value, false, e));
    pushQueue(full, value);
  }
}

/* The four things a refusal owes: put the mirror back, keep the payload, say so
   on screen, and hand the caller a message to throw. In one place because doing
   three of the four is worse than doing none — a rolled-back mirror with no red
   bar is a value that silently disappears. */
function rollBack(path, priorMirror, wasPartial, full, value, merge, e) {
  const mk = 'mirror:' + path;
  if (priorMirror === undefined) LS.del(mk); else LS.set(mk, priorMirror);
  if (wasPartial) markPartial(path); else clearPartial(path);
  pushRefused(full, value, merge, (e && e.message) || '');
  return refused(path, e);
}

export async function read(path, fallback = null) {
  if (!UID) return fallback;
  const cached = LS.get('mirror:' + path, undefined);
  if (!online.value) return cached === undefined ? fallback : cached;
  try {
    const snap = await get(ref(db, userPath(path)));
    const v = snap.exists() ? snap.val() : fallback;
    LS.set('mirror:' + path, v);
    clearPartial(path);
    return v;
  } catch {
    return cached === undefined ? fallback : cached;
  }
}

/* read() folds "the node isn't there" and "the node couldn't be reached" into
   one fallback, which is right for every screen that just wants a number to
   show. The profile editor is the one caller that has to tell them apart: it
   merges on top of what it read, so a failed read must stop it, while a node
   that genuinely does not exist yet — every account that predates onboarding,
   the owner's included — has to let it through to create one. Rejects on a
   failed read; resolves null only when the database itself said "nothing". */
export async function readExact(path) {
  if (!UID) throw new Error('signed out');
  if (!online.value) {
    const cached = LS.get('mirror:' + path, undefined);
    if (cached === undefined) throw new Error('offline');
    return cached;
  }
  const snap = await get(ref(db, userPath(path)));
  const v = snap.exists() ? snap.val() : null;
  LS.set('mirror:' + path, v);
  clearPartial(path);
  return v;
}

/* Live listener on a node inside this account. Returns an unsubscribe. */
export function watch(path, cb) {
  if (!UID) return () => {};
  const owner = UID;
  try {
    return onValue(ref(db, userPath(path)), snap => {
      // Auth can change between subscribing and the callback firing. Without
      // this guard a listener opened by the previous account can deliver one
      // last payload into the new account's screen.
      if (UID !== owner) return;
      const v = snap.exists() ? snap.val() : null;
      LS.set('mirror:' + path, v);
      clearPartial(path);
      cb(v);
    }, () => {});
  } catch {
    return () => {};
  }
}

export async function mergeUpdate(path, obj) {
  if (!UID) return;
  try { await update(ref(db, userPath(path)), obj); } catch {}
}

/* ---------- shared nodes, outside users/ ----------
   Only access/* and aiAllow/* live out here, and the rules decide who may
   touch them. These are deliberately separate functions from read()/write()
   so that no ordinary feature can address a path outside its own account by
   accident — you have to reach for a different verb to leave the sandbox. */
export async function readShared(path, fallback = null) {
  try {
    const snap = await get(ref(db, path));
    return snap.exists() ? snap.val() : fallback;
  } catch { return fallback; }
}

export function writeShared(path, value)  { return set(ref(db, path), value); }
export function removeShared(path)        { return remove(ref(db, path)); }
export function updateShared(paths)       { return update(ref(db), paths); }

export function watchShared(path, cb) {
  try {
    return onValue(ref(db, path), snap => cb(snap.exists() ? snap.val() : null), () => {});
  } catch { return () => {}; }
}

/* ---------- units ----------
   Pounds or kilos, inches or centimetres. The accessor lives here rather than
   in units.js because units.js is pure — it takes the unit as an argument and
   reads nothing — and because every module in the app already imports this one,
   so there is no new edge in the dependency graph and no chance of a cycle.

   `wu()` and `hu()` must answer SYNCHRONOUSLY and correctly before the first
   paint. A screen that renders in pounds and then flips to kilos a moment later
   is a bug, not a loading state, so initUnits() is awaited at the very top of
   boot — ahead of setup and ahead of all five tabs — and again after setup,
   which is where a new account picks its unit.

   The default is imperial and it is the default everywhere: an absent node, a
   failed read, a half-written offline queue and a value nobody recognises all
   come back as pounds and inches. Eight live accounts have no units node and
   this ship has to be invisible to every one of them. */
let UNITS = normUnits(null);

export async function initUnits() {
  try { UNITS = normUnits(await read('settings/units', null)); }
  catch { UNITS = normUnits(null); }
  return UNITS;
}

export function units() { return UNITS; }
export function wu() { return UNITS.weight; }
export function hu() { return UNITS.height; }

// Sets the cache first and writes second, so the re-render the caller fires on
// the next line paints the unit that was just chosen even if the write is
// queued offline.
export async function setUnits(next) {
  UNITS = normUnits(next);
  await write('settings/units', UNITS);
  return UNITS;
}

/* ---------- date helpers ---------- */
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export { syncPip };
