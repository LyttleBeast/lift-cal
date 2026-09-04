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

/* ---------- last sync ----------
   When this device last heard from the database: any successful read, write
   or live update. Kept for the About sheet in settings, persisted so it can
   answer after a reload, and written to localStorage at most once a minute
   because reads are constant. */
let lastSyncT = 0;
let lastSyncSaved = 0;
function markSync() {
  lastSyncT = Date.now();
  if (lastSyncT - lastSyncSaved > 60e3) { lastSyncSaved = lastSyncT; LS.set('lastSync', lastSyncT); }
}
export function lastSyncAt() { return lastSyncT || LS.get('lastSync', 0) || 0; }
export function queuedWrites() { return queue().length; }

/* ---------- write queue (survives offline) ---------- */
function queue() { return LS.get('queue', []); }
function pushQueue(path, value) {
  const q = queue();
  q.push({ path, value, at: Date.now() });
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
    try { await set(ref(db, item.path), item.value); }
    catch { remaining.push(item); }
  }
  LS.set('queue', remaining);
}

/* ---------- generic read/write, always inside users/{uid} ---------- */
function userPath(p) { return `users/${UID}/${p}`; }

export async function write(path, value) {
  // Mirroring before the sign-in check would write the value into the `anon`
  // namespace, where the next account to sign in on this device inherits it.
  if (!UID) return;
  LS.set('mirror:' + path, value);
  const full = userPath(path);
  if (!online.value) { pushQueue(full, value); return; }
  try { await set(ref(db, full), value); markSync(); }
  catch { pushQueue(full, value); }
}

export async function read(path, fallback = null) {
  if (!UID) return fallback;
  const cached = LS.get('mirror:' + path, undefined);
  if (!online.value) return cached === undefined ? fallback : cached;
  try {
    const snap = await get(ref(db, userPath(path)));
    const v = snap.exists() ? snap.val() : fallback;
    LS.set('mirror:' + path, v);
    markSync();
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
  markSync();
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
      markSync();
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

/* ---------- date helpers ---------- */
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export { syncPip };
