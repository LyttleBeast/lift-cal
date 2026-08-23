// Data layer: Firebase RTDB + localStorage mirror + public feed snapshot.
import { firebaseConfig, FEED_TOKEN, OWNER_UID } from './firebase-config.js';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getDatabase, ref, get, set, update, onValue, serverTimestamp
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
export function logout() { return signOut(auth); }
export function watchAuth(cb) {
  return onAuthStateChanged(auth, u => {
    UID = u ? u.uid : null;
    if (UID) migrateLegacyKeys();
    cb(u);
  });
}
export function uid() { return UID; }

/* ---------- local mirror ----------
   Every key is namespaced by account. It used to be a flat `fit:` prefix, which
   is fine with one account and quietly wrong with two: sign out, sign in as
   somebody else on the same phone, and the mirror serves the previous user's
   food log whenever the network is slow or absent, initWorkout() hands them the
   previous user's in-progress workout, and the offline queue still holds writes
   addressed to a subtree this account isn't allowed to touch — which then fail
   permission and retry on every single reconnect, forever.

   The prefix changed from `fit:` to `rack:` deliberately, so legacy keys are
   unambiguous and can be swept exactly once. */
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

// Runs once per device, for whoever signs in first after this update — which on
// every existing install is the account that wrote those keys. Carries the cache
// and any in-progress workout across the rename instead of dropping them.
function migrateLegacyKeys() {
  try {
    if (!UID || localStorage.getItem('rack:migrated')) return;
    const old = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fit:')) old.push(k);
    }
    old.forEach(k => {
      const v = localStorage.getItem(k);
      if (v != null) localStorage.setItem('rack:' + UID + ':' + k.slice(4), v);
    });
    old.forEach(k => localStorage.removeItem(k));
    localStorage.setItem('rack:migrated', '1');
  } catch {}
}

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
  const remaining = [];
  for (const item of q) {
    try { await set(ref(db, item.path), item.value); }
    catch { remaining.push(item); }
  }
  LS.set('queue', remaining);
}

/* ---------- generic read/write ---------- */
function userPath(p) { return `users/${UID}/${p}`; }

export async function write(path, value) {
  LS.set('mirror:' + path, value);
  if (!UID) return;
  const full = userPath(path);
  if (!online.value) { pushQueue(full, value); return; }
  try { await set(ref(db, full), value); }
  catch { pushQueue(full, value); }
}

export async function read(path, fallback = null) {
  const cached = LS.get('mirror:' + path, undefined);
  if (!UID || !online.value) return cached === undefined ? fallback : cached;
  try {
    const snap = await get(ref(db, userPath(path)));
    const v = snap.exists() ? snap.val() : fallback;
    LS.set('mirror:' + path, v);
    return v;
  } catch {
    return cached === undefined ? fallback : cached;
  }
}

/* ---------- live listener ----------
   read() is a one-shot snapshot, which is fine when the app is the only thing
   writing. It isn't any more — the database is reachable over REST, so an
   agent can log a food or a weigh-in while the app sits open. watch() keeps a
   node subscribed so those edits land on screen without a refresh.
   Returns an unsubscribe function. */
export function watch(path, cb) {
  if (!UID) return () => {};
  try {
    return onValue(ref(db, userPath(path)), snap => {
      const v = snap.exists() ? snap.val() : null;
      LS.set('mirror:' + path, v);
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

/* ---------- public feed ----------
   Written to /feed/{token}. World-readable, owner-write-only.
   Carries a summary only — never the full history. */
export async function writeFeed(patch) {
  // One node, one hard-coded token, owner-write-only in the rules. Every other
  // account writing to it just earns a permission denial three times a session.
  // More to the point, the feed is a public summary of ONE person — a second
  // account must never publish into it.
  if (UID !== OWNER_UID) return;
  if (!UID || !online.value) return;
  try {
    await update(ref(db, `feed/${FEED_TOKEN}`), {
      ...patch,
      updatedAt: new Date().toISOString()
    });
  } catch {}
}

export function isOwner() { return UID === OWNER_UID; }

export function feedUrl() {
  const host = (firebaseConfig.databaseURL || '').replace(/\/$/, '');
  return `${host}/feed/${FEED_TOKEN}.json`;
}

/* ---------- date helpers ---------- */
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export { syncPip };
