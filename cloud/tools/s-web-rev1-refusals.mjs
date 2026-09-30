#!/usr/bin/env node
// Adversarial review of S (web), round 1: refusal paths OUTSIDE setVibe's own
// await. Stages the REAL store.js / vibe.js / vibes-sheet.js / ui.js from the
// worktree (read only) exactly as tools-check/vibe-setting.mjs does, with one
// staged vibe 'tst', over a Firebase stub, on a stand-in DOM.
//
//   R1  an offline pick, queued, then refused when flushQueue replays it
//   R2  "Try again" on the refused-saves list, after a refused pick
//   R3  purgeDevice (Sign out and erase) and the device key
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const WT = process.argv[2] || '/Users/micahflunker/dev/vibes-night/wt/web-settings';
const read = f => readFileSync(join(WT, f), 'utf8');
const J = JSON.stringify;

/* ---- stand-in DOM (vibe-setting.mjs's, trimmed) ---- */
const kebab = k => k.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
class El {
  constructor(tag, ns) {
    this.tag = tag; this.ns = ns || null; this.attrs = new Map(); this.children = []; this.parentNode = null; this._text = '';
    const props = new Map();
    this.style = { props, setProperty: (k, v) => { props.set(k, String(v)); }, getPropertyValue: k => props.get(k) || '', removeProperty: k => { props.delete(k); }, cssText: '' };
    const self = this;
    this.dataset = new Proxy({}, {
      get: (_t, k) => (typeof k === 'string' && self.attrs.has('data-' + kebab(k)) ? self.attrs.get('data-' + kebab(k)) : undefined),
      set: (_t, k, v) => { self.attrs.set('data-' + kebab(k), String(v)); return true; },
      deleteProperty: (_t, k) => { self.attrs.delete('data-' + kebab(k)); return true; }
    });
    this.classList = {
      list: () => (self.attrs.get('class') || '').split(/\s+/).filter(Boolean),
      contains: c => self.classList.list().includes(c),
      add: (...cs) => { const l = self.classList.list(); cs.forEach(c => { if (!l.includes(c)) l.push(c); }); self.attrs.set('class', l.join(' ')); },
      remove: (...cs) => { self.attrs.set('class', self.classList.list().filter(c => !cs.includes(c)).join(' ')); },
      toggle: (c, on) => { const has = self.classList.contains(c); const want = on === undefined ? !has : !!on; if (want && !has) self.classList.add(c); if (!want && has) self.classList.remove(c); return want; }
    };
  }
  get className() { return this.attrs.get('class') || ''; }
  set className(v) { this.attrs.set('class', String(v)); }
  get id() { return this.attrs.get('id') || ''; }
  set id(v) { this.attrs.set('id', String(v)); }
  setAttribute(k, v) { this.attrs.set(k, String(v)); }
  getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
  hasAttribute(k) { return this.attrs.has(k); }
  removeAttribute(k) { this.attrs.delete(k); }
  appendChild(c) { if (c.parentNode) c.remove(); c.parentNode = this; this.children.push(c); return c; }
  append(...cs) { cs.forEach(c => this.appendChild(c)); }
  prepend(...cs) { cs.forEach(c => this.appendChild(c)); }
  insertBefore(c) { return this.appendChild(c); }
  remove() { if (this.parentNode) { const p = this.parentNode.children; p.splice(p.indexOf(this), 1); this.parentNode = null; } }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this._text = String(v); this.children = []; }
  getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
  addEventListener() {}
  matches(sel) {
    if (sel === '*') return true;
    const m = /^([a-z][\w-]*)?((?:\.[\w-]+)*)((?:\[[\w-]+(?:="[^"]*")?\])*)$/.exec(sel.trim());
    if (!m) return false;
    if (m[1] && this.tag !== m[1]) return false;
    for (const c of (m[2] || '').split('.').filter(Boolean)) if (!this.classList.contains(c)) return false;
    for (const a of (m[3] || '').match(/\[[^\]]+\]/g) || []) {
      const [, k, v] = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(a);
      if (!this.attrs.has(k) || (v !== undefined && this.attrs.get(k) !== v)) return false;
    }
    return true;
  }
  querySelectorAll(sel) { const out = []; const walk = n => n.children.forEach(c => { if (c.matches(sel)) out.push(c); walk(c); }); walk(this); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}
const html = new El('html'), body = new El('body'), meta = new El('meta');
meta.setAttribute('name', 'theme-color'); meta.setAttribute('content', '#14161a');
html.appendChild(body);
globalThis.document = {
  documentElement: html, body, baseURI: 'https://rack.test/app/', styleSheets: [], fonts: undefined,
  createElement: t => new El(t), createElementNS: (ns, t) => new El(t, ns),
  getElementById: id => html.querySelectorAll('*').find(n => n.id === id) || null,
  querySelector: sel => (sel === 'meta[name="theme-color"]' ? meta : html.querySelector(sel))
};
const lsMap = new Map();
globalThis.localStorage = { getItem: k => (lsMap.has(k) ? lsMap.get(k) : null), setItem: (k, v) => lsMap.set(k, String(v)), removeItem: k => lsMap.delete(k), key: i => [...lsMap.keys()][i] ?? null, get length() { return lsMap.size; } };
globalThis.window = { addEventListener() {} };
globalThis.requestAnimationFrame = fn => setTimeout(fn, 0);
try { Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true }); } catch {}

/* ---- the database ---- */
const server = new Map();
let refuse = null;
const denied = () => { const e = new Error('permission_denied at /users/u1/settings/vibe: Client doesn’t have permission'); e.code = 'PERMISSION_DENIED'; return e; };
globalThis.__fb = {
  get(r) { const has = server.has(r.path), v = server.get(r.path); return { exists: () => has && v != null, val: () => v }; },
  set(r, v) { if (refuse && r.path === refuse) throw denied(); server.set(r.path, v); },
  update() {}
};

/* ---- staging (vibe-setting.mjs's recipe) ---- */
mkdirSync('/Users/micahflunker/dev/vibes-night/tmp', { recursive: true });
const STAGE = mkdtempSync('/Users/micahflunker/dev/vibes-night/tmp/s-web-rev1-stage-');
const stageFile = (f, text) => { mkdirSync(dirname(join(STAGE, f)), { recursive: true }); writeFileSync(join(STAGE, f), text); };
writeFileSync(join(STAGE, 'package.json'), '{ "type": "module" }\n');
for (const f of ['units.js', 'ui.js', 'vibes-sheet.js', 'vibes/defs/v1.js', 'vibes/icons/v1.js']) stageFile(f, read(f));
const STORE_SRC = read('store.js');
{
  const names = new Set();
  for (const m of STORE_SRC.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(https:[^']+|\.\/firebase-config\.js)'/g)) m[1].split(',').map(s => s.trim()).filter(Boolean).forEach(n => names.add(n));
  const impl = {
    firebaseConfig: 'export const firebaseConfig = {};', OWNER_UID: "export const OWNER_UID = 'owner-uid';",
    browserLocalPersistence: 'export const browserLocalPersistence = {};',
    initializeApp: 'export function initializeApp() { return {}; }', getAuth: 'export function getAuth() { return { currentUser: null }; }',
    getDatabase: 'export function getDatabase() { return {}; }', ref: 'export function ref(_d, path) { return { path }; }',
    get: 'export async function get(r) { return globalThis.__fb.get(r); }', set: 'export async function set(r, v) { return globalThis.__fb.set(r, v); }',
    update: 'export async function update(r, o) { return globalThis.__fb.update(r, o); }',
    onValue: 'export function onValue() { return () => {}; }',
    onAuthStateChanged: "export function onAuthStateChanged(_a, cb) { cb({ uid: 'u1' }); return () => {}; }"
  };
  stageFile('fb-stub.js', [...names].map(n => impl[n] || `export function ${n}() {}`).join('\n') + '\n');
  stageFile('store.js', STORE_SRC.replace(/from\s*'(https:[^']+|\.\/firebase-config\.js)'/g, "from './fb-stub.js'"));
}
const IDX_SRC = read('vibes/defs/index.js'), VJ_SRC = read('vibe.js');
const A_V1 = "  { id: 'v1', name: 'v1', feel: 'The original Rack look.', experimental: false, scheme: 'dark' }";
const A_DEFS = 'const DEFS = { v1: V1 };', A_IMPORT = "import V1 from './vibes/defs/v1.js';\n";
if (!IDX_SRC.includes(A_V1) || !VJ_SRC.includes(A_DEFS) || !VJ_SRC.includes(A_IMPORT)) throw new Error('staging anchors moved');
stageFile('vibes/defs/index.js', IDX_SRC.replace(A_V1, A_V1 + ",\n  { id: 'tst', name: 'Test', feel: 'A staged vibe.', experimental: false, scheme: 'dark' }"));
stageFile('vibes/defs/tst.js', `import V1 from './v1.js';\nexport default { ...V1, id: 'tst', name: 'Test', feel: 'A staged vibe.', colors: { ...V1.colors, rack: '#0a0b0c', accent: '#e05a00' } };\n`);
stageFile('vibe.js', VJ_SRC.replace(A_IMPORT, A_IMPORT + "import TST from './vibes/defs/tst.js';\n").replace(A_DEFS, 'const DEFS = { v1: V1, tst: TST };'));

const url = f => pathToFileURL(join(STAGE, f)).href;
const store = await import(url('store.js'));
const VB = await import(url('vibe.js'));
const VS = await import(url('vibes-sheet.js'));
store.watchAuth(() => {});
const PATH = 'users/u1/settings/vibe', MIRROR = 'mirror:settings/vibe';
const quiet = async fn => { const e = console.error, w = console.warn; console.error = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.error = e; console.warn = w; } };
const state = () => ({ attr: html.dataset.vibe ?? '(none)', deviceKey: localStorage.getItem('rack:vibe') ?? '(none)', vibe: store.vibe(), rowValue: VS.vibeName(),
  mirror: store.LS.get(MIRROR, '(none)'), database: server.has(PATH) ? server.get(PATH) : '(absent)' });
async function reset() {
  lsMap.clear(); server.clear(); refuse = null; store.online.value = true;
  delete html.dataset.vibe; store.reconcileVibe(); lsMap.clear();
}
let fails = 0;
const report = (label, want, got) => {
  const ok = J(want) === J(got);
  if (!ok) fails++;
  console.log((ok ? 'as expected  ' : 'DIFFERS      ') + label + '\n    want ' + J(want) + '\n    got  ' + J(got));
};

/* R1: offline pick, queued, refused on the replay */
{
  await reset();
  await store.initVibe();                              // an account that never chose: v1
  store.online.value = false;
  const r = await store.setVibe('tst');                // resolves: the write is queued
  console.log('\nR1  offline pick -> queued: setVibe resolved ' + J(r) + '; queue ' + J(store.LS.get('queue', []).map(q => [q.path, q.value])));
  store.online.value = true; refuse = PATH;
  await quiet(() => store.flushQueue());               // what the 'online' event runs
  const refusedList = store.refusedSaves().map(x => [x.short, x.value]);
  report('R1  after flushQueue\'s refusal the pick should be undone (V59 §8.1 "On a refusal it reverts")',
    { attr: '(none)', deviceKey: '(none)', vibe: 'v1', rowValue: 'v1', mirror: '(none)', database: '(absent)' }, state());
  console.log('    dead-letter list: ' + J(refusedList));
  // The next launch on this device: the head script paints the device key,
  // then watchAuth's reconcile reads the (deleted) mirror.
  const first = localStorage.getItem('rack:vibe');
  if (first) html.dataset.vibe = first;
  const firstFrame = html.dataset.vibe ?? 'v1';
  store.reconcileVibe();
  const afterReconcile = html.dataset.vibe ?? 'v1';
  await store.initVibe();
  const afterBoot = html.dataset.vibe ?? 'v1';
  report('R1b the next launch: first frame / after reconcile / after initVibe', ['v1', 'v1', 'v1'], [firstFrame, afterReconcile, afterBoot]);
}

/* R2: a refused pick, then "Try again" from Settings -> Refused saves succeeds */
{
  await reset();
  await store.initVibe();
  refuse = PATH;
  await quiet(async () => { try { await store.setVibe('tst'); } catch {} });
  const afterRefusal = state();
  refuse = null;
  const key = store.refusedSaves()[0] && store.refusedSaves()[0].key;
  const res = await quiet(() => store.retryRefused(key));
  console.log('\nR2  refused pick, then Try again -> ' + J(res) + '  (state right after the refusal: ' + J(afterRefusal) + ')');
  report('R2  after a successful Try again, the screen should agree with the account',
    { attr: 'tst', deviceKey: 'tst', vibe: 'tst', rowValue: 'Test', mirror: 'tst', database: 'tst' }, state());
  // He now wants v1 back: the sheet marks v1 as worn, so he taps v1.
  await store.setVibe('v1');
  report('R2b tapping v1 (marked current) to get v1 back should leave the account on v1', { database: 'v1' }, { database: server.get(PATH) });
  // The next launch on this device.
  const first = localStorage.getItem('rack:vibe'); if (first) html.dataset.vibe = first; else delete html.dataset.vibe;
  const firstFrame = html.dataset.vibe ?? 'v1';
  store.reconcileVibe(); const afterReconcile = html.dataset.vibe ?? 'v1';
  await store.initVibe(); const afterBoot = html.dataset.vibe ?? 'v1';
  report('R2c the next launch: first frame / after reconcile / after initVibe (he last saw v1)', ['v1', 'v1', 'v1'], [firstFrame, afterReconcile, afterBoot]);
}

/* R3: Sign out and erase this device's copy */
{
  await reset();
  await store.initVibe();
  await store.setVibe('tst');
  const n = store.purgeDevice('u1');
  console.log('\nR3  purgeDevice removed ' + n + ' key(s); rack:vibe after it: ' + J(localStorage.getItem('rack:vibe')) +
    ' — the next page load (sign-in screen) paints data-vibe=' + J(localStorage.getItem('rack:vibe')));
  // The same account signs in again on this device (the database still says tst).
  const first = localStorage.getItem('rack:vibe'); if (first) html.dataset.vibe = first; else delete html.dataset.vibe;
  const signIn = html.dataset.vibe ?? 'v1';
  store.reconcileVibe(); const appFirstFrame = html.dataset.vibe ?? 'v1';
  await store.initVibe(); const afterBoot = html.dataset.vibe ?? 'v1';
  report('R3b erase, then the same tst account signs in: sign-in screen / app\'s first frame (before #auth hides) / after initVibe',
    ['tst', 'tst', 'tst'], [signIn, appFirstFrame, afterBoot]);
}

console.log('\n' + (fails ? fails + ' scenario(s) differ from the expected behaviour.' : 'All scenarios as expected.'));
