// Data layer: Firebase RTDB + localStorage mirror + public feed snapshot.
import { firebaseConfig, FEED_TOKEN } from './firebase-config.js';

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
  return onAuthStateChanged(auth, u => { UID = u ? u.uid : null; cb(u); });
}
export function uid() { return UID; }

/* ---------- local mirror ---------- */
const LS = {
  get(k, fallback) {
    try { const v = localStorage.getItem('fit:' + k); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(k, v) { try { localStorage.setItem('fit:' + k, JSON.stringify(v)); } catch {} },
  del(k)    { try { localStorage.removeItem('fit:' + k); } catch {} }
};
export { LS };

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
  if (!UID || !online.value) return;
  try {
    await update(ref(db, `feed/${FEED_TOKEN}`), {
      ...patch,
      updatedAt: new Date().toISOString()
    });
  } catch {}
}

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
