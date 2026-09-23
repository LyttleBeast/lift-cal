// Fake Realtime Database: one in-memory tree seeded from window.__SEED.
const tree = JSON.parse(JSON.stringify(window.__SEED || {}));
const listeners = [];
const parts = p => String(p || '').split('/').filter(Boolean);
const clone = v => (v === undefined || v === null) ? null : JSON.parse(JSON.stringify(v));
function getAt(p) { let n = tree; for (const k of parts(p)) { if (n == null || typeof n !== 'object') return null; n = n[k]; } return n === undefined ? null : n; }
function setAt(p, v) {
  const ks = parts(p); if (!ks.length) return;
  let n = tree; for (const k of ks.slice(0, -1)) { if (n[k] == null || typeof n[k] !== 'object') n[k] = {}; n = n[k]; }
  const last = ks[ks.length - 1];
  if (v === null || v === undefined) delete n[last]; else n[last] = clone(v);
}
const snap = v => ({ exists: () => v !== null && v !== undefined, val: () => clone(v) });
function fire() { listeners.forEach(l => setTimeout(() => l.cb(snap(getAt(l.path))), 0)); }
export function getDatabase() { return {}; }
export function ref(db, path) { return { path: path || '' }; }
export async function get(r) {
  // Traced: every GET, its path and who asked, for report/you-gets.md.
  const at = (new Error().stack || "").split("\n").slice(2).map(l => (l.match(/\/([\w-]+\.js):(\d+)/) || []).slice(1, 3).join(":")).filter(x => x && !/^firebase-/.test(x));
  (window.__gets = window.__gets || []).push({ path: r.path.replace(/^users\/[^/]+\//, ""), t: performance.now(), at });
  return snap(getAt(r.path));
}
export async function set(r, v) { setAt(r.path, v); fire(); }
export async function update(r, obj) { for (const k of Object.keys(obj || {})) setAt(parts(r.path).concat(parts(k)).join('/'), obj[k]); fire(); }
export async function remove(r) { setAt(r.path, null); fire(); }
export function onValue(r, cb) { const l = { path: r.path, cb }; listeners.push(l); setTimeout(() => cb(snap(getAt(r.path))), 0); return () => { const i = listeners.indexOf(l); if (i > -1) listeners.splice(i, 1); }; }
window.__fakeTree = tree;
