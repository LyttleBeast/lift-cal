#!/usr/bin/env node
//
// Verifier for the account's vibe — users/{uid}/settings/vibe — and the Vibes
// sheet that picks it (V59 §8).
//
//   node tools-check/vibe-setting.mjs
//
// This drives the REAL store.js (over a Firebase stub, refused-write.mjs's rig),
// the real vibe.js and vibes-sheet.js and ui.js, on a stand-in DOM. They are
// staged in a tmpdir with the only edits a real vibe makes when it lands: two
// test vibes registered (vibes/defs/index.js VIBES, vibe.js DEFS) — 'tst' ahead
// of v1 in the registry, 'tsu' after it — and a third, 'tsx', listed with no
// definition. No copy of any rule lives here: the tokens a tile carries are
// held to tools-check/vibes-css.mjs's own generator, lifted out of that file.
//
//   A  normVibe on every read: an absent node, '', 'V1', 'garbage', 42, an
//      object, a padded id, a reserved name and an unregistered id all read as
//      v1 — at boot (initVibe, online, offline, a failed read) and from the
//      mirror (reconcileVibe) — and nothing is written on a read.
//   B  setVibe writes a plain string with a plain set() — never an object,
//      never a merge — after the look has gone on; settings/vibe is no
//      container, and the destructive-write guard and write() are rack-v58's,
//      byte for byte. The vibe worn is never written again. Offline, it
//      queues and the look stays.
//   C  a refused write puts the look, the device key, the mirror and vibe()
//      back, and the red bar and the dead-letter list say so. With picks in
//      flight the run ends on the account's value: a late refusal never undoes
//      a newer pick that landed, and two refused picks end where it started.
//   D  app.js: watchAuth reconciles to the mirror before #auth hides and
//      before anything awaits; initVibe is read before setup and the tabs. The
//      account's value beats the device key (the mirror over the key, the
//      database over the mirror), neither boot step repaints, and a page
//      already painting the account's vibe — data-vibe="v1" forced, as the P
//      gate forces it — is left exactly as it is.
//   E  openVibes: "Look" over "Vibes", v1 first whatever the registry order,
//      a listed vibe with no definition left off, every tile's tokens those
//      vibes-css.mjs generates for its vibe, the worn one ringed
//      (aria-current) and checked and no other, the registry's words verbatim
//      and no other words but "Experimental", the sample and Close; the number
//      drawn only in its own face; a tap restyles in place and a refusal
//      moves the mark back.
//   F  no inline height anywhere this touches (touch-target D), and rack.css's
//      rules for the sheet name only its own classes.
//   G  canaries: eight planted mistakes, each in a scratch copy, each read by
//      this file run on that copy — every one must turn it red, on its check.

import { readFileSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const REPO = join(dirname(SELF), '..');
const ri = process.argv.indexOf('--root');
const ROOT = ri > 0 ? process.argv[ri + 1] : REPO;          // a planted copy, for G
const PLANTED = ROOT !== REPO;
const BASE = '928a65e';                                      // rack-v58
const read = f => readFileSync(join(ROOT, f), 'utf8');
const J = JSON.stringify;

let checks = 0; const fails = [];
const ok = m => { checks++; if (process.env.VERBOSE) console.log('  ✓ ' + m); };
const bad = m => { checks++; fails.push(m); console.log('  ✗ ' + m); };
const expect = (c, m) => (c ? ok(m) : bad(m));
const section = t => console.log('\n' + t);

/* ================= a stand-in DOM =================
   Enough for ui.js (el, svgEl, sheet), vibe.js (the attribute, the meta, the
   device key) and vibes-sheet.js: elements with attributes, classes, a
   dataset, a style that keeps its custom properties in order, text, and a
   one-compound querySelector. */
const kebab = k => k.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
class El {
  constructor(tag, ns) {
    this.tag = tag; this.ns = ns || null; this.attrs = new Map(); this.children = []; this.parentNode = null; this._text = '';
    const props = new Map();
    this.style = { props, setProperty: (k, v) => { props.set(k, String(v)); }, getPropertyValue: k => props.get(k) || '',
      removeProperty: k => { props.delete(k); }, cssText: '' };
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
  remove() { if (this.parentNode) { const p = this.parentNode.children; p.splice(p.indexOf(this), 1); this.parentNode = null; } }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this._text = String(v); this.children = []; }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === DOC.documentElement; }
  getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
  matches(sel) {
    const m = /^([a-z][\w-]*)?((?:\.[\w-]+)*)((?:\[[\w-]+(?:="[^"]*")?\])*)$/.exec(sel.trim());
    if (!m) throw new Error('stand-in DOM: selector ' + sel);
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
const DOC = {};
function freshDoc() {
  const html = new El('html'), body = new El('body'), meta = new El('meta');
  meta.setAttribute('name', 'theme-color'); meta.setAttribute('content', '#14161a');
  html.appendChild(body);
  Object.assign(DOC, {
    documentElement: html, body, meta, baseURI: 'https://rack.test/app/', styleSheets: [], fonts: undefined,
    createElement: t => new El(t),
    createElementNS: (ns, t) => new El(t, ns),
    getElementById: id => html.querySelectorAll('*').find(n => n.id === id) || null,
    querySelector: sel => (sel === 'meta[name="theme-color"]' ? meta : html.querySelector(sel))
  });
  // matches('*') for getElementById
  return DOC;
}
El.prototype.matches = (orig => function (sel) { return sel === '*' ? true : orig.call(this, sel); })(El.prototype.matches);
globalThis.document = DOC;
freshDoc();
const lsMap = new Map();
globalThis.localStorage = {
  getItem: k => (lsMap.has(k) ? lsMap.get(k) : null),
  setItem: (k, v) => lsMap.set(k, String(v)),
  removeItem: k => lsMap.delete(k),
  key: i => [...lsMap.keys()][i] ?? null,
  get length() { return lsMap.size; }
};
globalThis.window = { addEventListener() {} };
globalThis.requestAnimationFrame = fn => setTimeout(fn, 0);
try { Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true }); } catch {}

/* ================= the database ================= */
const server = new Map();
let setLog = [], updateLog = [], getThrows = false;
let refuse = null;              // null, or a path set() refuses
let deferred = null;            // null, or [] of held set() calls: { path, value, go(), deny() }
const denied = () => { const e = new Error('permission_denied at /users/u1/settings/vibe: Client doesn’t have permission'); e.code = 'PERMISSION_DENIED'; return e; };
globalThis.__fb = {
  get(r) {
    if (getThrows) throw new Error('network');
    const has = server.has(r.path), v = server.get(r.path);
    return { exists: () => has && v !== null && v !== undefined, val: () => v };
  },
  set(r, v) {
    const land = () => { setLog.push([r.path, v]); server.set(r.path, v); };
    if (deferred) return new Promise((res, rej) => deferred.push({ path: r.path, value: v, go: () => { land(); res(); }, deny: () => rej(denied()) }));
    if (refuse && r.path === refuse) throw denied();
    land();
  },
  update(r, o) { updateLog.push([r.path, o]); }
};

/* ================= staging =================
   The real files, and the registry entries three test vibes would add. */
const STAGE = mkdtempSync(join(tmpdir(), 'rack-vibe-setting-'));
const stageFile = (f, text) => { mkdirSync(dirname(join(STAGE, f)), { recursive: true }); writeFileSync(join(STAGE, f), text); };
writeFileSync(join(STAGE, 'package.json'), '{ "type": "module" }\n');
for (const f of ['units.js', 'ui.js', 'vibes-sheet.js', 'vibes/defs/v1.js', 'vibes/icons/v1.js']) stageFile(f, read(f));
// every registered vibe's own definition and icon set, which vibe.js imports
for (const d of ['vibes/defs', 'vibes/icons']) {
  for (const f of readdirSync(join(ROOT, d))) if (f.endsWith('.js') && f !== 'index.js' && f !== 'v1.js') stageFile(d + '/' + f, read(d + '/' + f));
}
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
/* The sheet is tested on a registry of v1 and the three test vibes alone, so
   what it lists is known here whatever real vibes the build registers: the
   staged index.js keeps VIBES' v1 entry and drops the real ones after it, and
   the staged vibe.js registers v1's definition alone before the test vibes'
   go in. (The real vibes' own files are staged all the same, since vibe.js
   imports them.) */
const A_VIBES = 'export const VIBES = deepFreeze([\n', A_V1 = "  { id: 'v1', name: 'v1', feel: 'The original Rack look.', experimental: false, scheme: 'dark' }";
const A_DEFS = 'const DEFS = { v1: V1 };', A_IMPORT = "import V1 from './vibes/defs/v1.js';\n";
const IDX_REAL = read('vibes/defs/index.js'), VJ_REAL = read('vibe.js');
const V1_ENTRY = IDX_REAL.indexOf(A_V1), VIBES_END = IDX_REAL.indexOf('\n]);', V1_ENTRY);
const IDX_SRC = V1_ENTRY > 0 && VIBES_END > 0 ? IDX_REAL.slice(0, V1_ENTRY + A_V1.length) + IDX_REAL.slice(VIBES_END) : IDX_REAL;
// A registered id with a hyphen is a quoted key: 'iron-age': IRON_AGE.
const VJ_SRC = VJ_REAL.replace(/const DEFS = \{ v1: V1(, (?:[a-z0-9]+|'[a-z0-9][a-z0-9-]*'): [A-Z0-9_]+)* \};/, A_DEFS);
const anchors = IDX_SRC.includes(A_VIBES) && IDX_SRC.includes(A_V1) && VJ_SRC.includes(A_DEFS) && VJ_SRC.includes(A_IMPORT);
stageFile('vibes/defs/index.js', IDX_SRC
  .replace(A_VIBES, A_VIBES + "  { id: 'tst', name: 'Test', feel: 'A staged vibe.', experimental: true, scheme: 'dark' },\n")
  .replace(A_V1, A_V1 + ",\n  { id: 'tsu', name: 'Test two', feel: 'Another.', experimental: false, scheme: 'light' },\n" +
    "  { id: 'tsx', name: 'Listed only', feel: 'No files yet.', experimental: false, scheme: 'dark' }"));
stageFile('vibes/defs/tst.js', `import V1 from './v1.js';
export default { ...V1, id: 'tst', name: 'Test', feel: 'A staged vibe.', experimental: true, themeColor: '#0a0b0c',
  images: { thumb: 'thumb.jpg' },
  colors: { ...V1.colors, rack: '#0a0b0c', bar: '#101214', accent: '#e05a00', chalk: '#fafafa', onDanger: '#ffffff' },
  face: { ...V1.face, web: { ...V1.face.web, font: "'tst-Text', Georgia, serif", num: "'tst-Figures', Georgia, serif" } },
  radius: { ...V1.radius, r: 20 },
  chrome: { ...V1.chrome, colorScheme: 'dark' } };
`);
// tsu names no display, italic or numeral face: each is its text face (index.js valueOf()).
stageFile('vibes/defs/tsu.js', `import V1 from './v1.js';
export default { ...V1, id: 'tsu', name: 'Test two', feel: 'Another.', scheme: 'light', themeColor: '#f4f1ea',
  colors: { ...V1.colors, rack: '#f4f1ea', bar: '#ffffff', chalk: '#1a1a1a', steel: '#55575c', onDanger: '#ffffff' },
  face: { ...V1.face, web: { font: "'tsu-Grot', system-ui, sans-serif", mono: V1.face.web.mono, importUrl: V1.face.web.importUrl } } };
`);
stageFile('vibe.js', VJ_SRC
  .replace(A_IMPORT, A_IMPORT + "import TST from './vibes/defs/tst.js';\nimport TSU from './vibes/defs/tsu.js';\n")
  .replace(A_DEFS, 'const DEFS = { v1: V1, tst: TST, tsu: TSU };'));

const url = f => pathToFileURL(join(STAGE, f)).href;
const store = await import(url('store.js'));
const VB = await import(url('vibe.js'));
const VS = await import(url('vibes-sheet.js'));
const IDX = await import(url('vibes/defs/index.js'));
const DEF = { v1: (await import(url('vibes/defs/v1.js'))).default, tst: (await import(url('vibes/defs/tst.js'))).default, tsu: (await import(url('vibes/defs/tsu.js'))).default };
store.watchAuth(() => {});               // UID = u1
const PATH = 'users/u1/settings/vibe';
const MIRROR = 'mirror:settings/vibe';
const mirror = () => store.LS.get(MIRROR, undefined);
const attr = () => DOC.documentElement.dataset.vibe;
const key = () => localStorage.getItem('rack:vibe');
let blocks = [];
store.onGuardBlock(why => blocks.push(why));
let renders = 0;
VB.setRenderer(() => { renders++; });
const tick = () => new Promise(r => setTimeout(r, 0));

/* Everything back to a signed-in account on v1 that never chose. */
async function reset() {
  lsMap.clear(); server.clear(); setLog = []; updateLog = []; getThrows = false; refuse = null; deferred = null; blocks = []; renders = 0;
  store.online.value = true;
  delete DOC.documentElement.dataset.vibe;
  store.reconcileVibe();
  lsMap.clear(); renders = 0;
}
const quiet = async fn => { const e = console.error; console.error = () => {}; try { return await fn(); } finally { console.error = e; } };
const settle = async p => { try { return { v: await p }; } catch (e) { return { err: e }; } };

expect(anchors, 'the staging anchors are where a new vibe registers (VIBES in vibes/defs/index.js, its import and DEFS in vibe.js)');

/* ================= A ================= */
section('A  normVibe on every read — anything but a registered id is v1, and a read writes nothing');
{
  const ABSENT = Symbol('absent');
  const cases = [['absent', ABSENT, 'v1'], ['null', null, 'v1'], ["''", '', 'v1'], ["'V1'", 'V1', 'v1'], ["'garbage'", 'garbage', 'v1'],
    ['42', 42, 'v1'], ['{ id: tst }', { id: 'tst' }, 'v1'], ["' tst'", ' tst', 'v1'], ["'tst '", 'tst ', 'v1'], ["'TST'", 'TST', 'v1'],
    ["'defs' (reserved)", 'defs', 'v1'], ["'iron-age' (well formed, not registered)", 'iron-age', 'v1'], ["'v1'", 'v1', 'v1'], ["'tst'", 'tst', 'tst']];
  const wrongBoot = [], wrongMirror = [];
  for (const [label, value, want] of cases) {
    await reset();
    if (value !== ABSENT) server.set(PATH, value);
    const r = await store.initVibe();
    if (!(r === want && store.vibe() === want && attr() === (want === 'v1' ? undefined : want) && key() === (want === 'v1' ? null : want)))
      wrongBoot.push(`${label} → ${r} / vibe() ${store.vibe()} / attr ${attr()} / key ${key()}`);
    if (setLog.length || updateLog.length) wrongBoot.push(`${label} wrote ${J(setLog)} ${J(updateLog)}`);
    await reset();
    if (value !== ABSENT) store.LS.set(MIRROR, value);
    const m = store.reconcileVibe();
    if (!(m === want && store.vibe() === want && attr() === (want === 'v1' ? undefined : want))) wrongMirror.push(`${label} → ${m}`);
    if (setLog.length || updateLog.length) wrongMirror.push(`${label} wrote`);
  }
  expect(!wrongBoot.length, `initVibe(): the database's ${cases.length} values read as ${cases.map(c => c[2]).join(', ')} — only a registered id is honoured, and nothing is written` + (wrongBoot.length ? ' — ' + wrongBoot.join('; ') : ''));
  expect(!wrongMirror.length, `reconcileVibe(): the mirror's same ${cases.length} values read the same` + (wrongMirror.length ? ' — ' + wrongMirror.join('; ') : ''));
  await reset(); store.LS.set(MIRROR, 'tst'); store.online.value = false;
  const off = await store.initVibe();
  await reset(); store.LS.set(MIRROR, 'tst'); getThrows = true;
  const failed = await store.initVibe();
  await reset(); store.online.value = false;
  const none = await store.initVibe();
  expect(off === 'tst' && failed === 'tst' && none === 'v1', `offline, and on a failed read, boot falls back to the mirror (${off}, ${failed}), and with no mirror to v1 (${none})`);
}

/* ================= B ================= */
section('B  setVibe writes a plain string, after the look has gone on');
{
  await reset();
  deferred = [];
  const p = store.setVibe('tst');
  const before = { attr: attr(), key: key(), vibe: store.vibe(), renders };
  for (let i = 0; i < 20 && !deferred.length; i++) await tick();
  const held = deferred[0];
  expect(before.attr === 'tst' && before.key === 'tst' && before.vibe === 'tst' && before.renders === 1 && held && !setLog.length,
    'the pick is on at once — attribute, device key, vibe(), one repaint — before the write has landed' + ' — ' + J(before));
  expect(held && held.path === PATH && typeof held.value === 'string' && held.value === 'tst',
    `and the write is one set() of a bare string to ${PATH} — ${held ? J([held.path, held.value]) : 'no set() at all'}`);
  expect(mirror() === 'tst', 'the mirror holds the string while it is on the wire');
  held.go(); deferred = null;
  const r = await settle(p);
  expect(r.v === 'tst' && J(setLog) === J([[PATH, 'tst']]) && server.get(PATH) === 'tst' && !updateLog.length && mirror() === 'tst',
    'it resolves to the vibe worn; the database holds the string; no merge anywhere' + ' — ' + J({ r, setLog, updateLog }));
  const again = await store.setVibe('tst');
  expect(again === 'tst' && setLog.length === 1 && renders === 1, 'picking the vibe worn writes nothing and repaints nothing');
  const g = await store.setVibe('Nonsense!');
  expect(g === 'v1' && J(setLog[1]) === J([PATH, 'v1']) && attr() === undefined && key() === null,
    'a pick of garbage is v1, written as the string \'v1\'');
  expect(store.isContainer('settings/vibe') === false && store.isContainer('settings') === false, 'settings/vibe is not a container: no removes budget, no guard');
  const base = execFileSync('git', ['-C', REPO, 'show', `${BASE}:store.js`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const cut = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); return i < 0 || j < 0 ? null : s.slice(i, j); };
  // From the guard's own heading to the units': CONTAINERS, the guard, the
  // banner, writePlan(), write(), rollBack(), read(), readExact(), watch().
  const a0 = '/* ---------- the destructive-write guard', a1 = '/* ---------- units ----------';
  const now = cut(STORE_SRC, a0, a1), then = cut(base, a0, a1);
  expect(now !== null && now === then && now.includes('const CONTAINERS = [') && now.includes('export async function write('),
    `the destructive-write guard and write() are rack-v58's, byte for byte (store.js from the guard's heading to the units', ${now ? now.split('\n').length : 0} lines)`);
  await reset(); store.online.value = false;
  const q = await settle(store.setVibe('tst'));
  const queued = store.LS.get('queue', []);
  expect(q.v === 'tst' && attr() === 'tst' && !setLog.length && queued.length === 1 && queued[0].path === PATH && queued[0].value === 'tst' && !queued[0].merge,
    'offline: the look stays, the write queues as a plain PUT of the string, and it resolves' + ' — ' + J(queued));
}

/* ================= C ================= */
section('C  a refused write goes back to the account\'s value — the look, the device key, the mirror');
{
  await reset(); refuse = PATH;
  const r = await quiet(() => settle(store.setVibe('tst')));
  const dead = store.refusedSaves();
  expect(r.err && attr() === undefined && key() === null && store.vibe() === 'v1' && mirror() === undefined,
    'a refused pick rejects, and the attribute, the device key, vibe() and the mirror are back to v1 (no mirror, as before)' + ' — ' + J({ attr: attr(), key: key(), vibe: store.vibe(), mirror: mirror() }));
  expect(blocks.length === 1 && blocks[0].includes(PATH) && dead.length === 1 && dead[0].path === PATH && dead[0].value === 'tst' && !store.LS.get('queue', []).length,
    'the red bar names the path, the payload is dead-lettered, nothing is queued' + ' — ' + J({ blocks: blocks.length, dead: dead.length }));
  expect(renders === 2, 'and the screen repaints twice: into the pick, and back');
  await reset(); server.set(PATH, 'tst'); await store.initVibe(); refuse = PATH;
  await quiet(() => settle(store.setVibe('tsu')));
  expect(attr() === 'tst' && key() === 'tst' && store.vibe() === 'tst' && mirror() === 'tst', 'from a chosen vibe, a refused pick goes back to it — the mirror\'s \'tst\' too');

  // Two picks on the wire, P -> A -> B, settled in each order.
  async function race(label, order, want) {
    await reset(); deferred = [];
    const pa = settle(store.setVibe('tst'));
    for (let i = 0; i < 20 && deferred.length < 1; i++) await tick();
    const pb = settle(store.setVibe('tsu'));
    for (let i = 0; i < 20 && deferred.length < 2; i++) await tick();
    const [A, B] = deferred;
    await quiet(async () => {
      for (const step of order) { const w = step[0] === 'A' ? A : B; if (step[1] === '+') w.go(); else w.deny(); await tick(); await tick(); }
      await pa; await pb;
    });
    deferred = null;
    const got = { attr: attr() === undefined ? 'v1' : attr(), key: key() || 'v1', vibe: store.vibe(), mirror: mirror() === undefined ? '(none)' : mirror() };
    expect(J(got) === J(want), `${label}: ends ${J(want)} — got ${J(got)}`);
  }
  await race('A refused, then B lands', ['A-', 'B+'], { attr: 'tsu', key: 'tsu', vibe: 'tsu', mirror: 'tsu' });
  await race('A lands, then B refused', ['A+', 'B-'], { attr: 'tst', key: 'tst', vibe: 'tst', mirror: 'tst' });
  await race('B refused, then A lands', ['B-', 'A+'], { attr: 'tst', key: 'tst', vibe: 'tst', mirror: 'tst' });
  await race('B refused, then A refused — both, back where it started', ['B-', 'A-'], { attr: 'v1', key: 'v1', vibe: 'v1', mirror: '(none)' });
  await race('A refused, then B refused', ['A-', 'B-'], { attr: 'v1', key: 'v1', vibe: 'v1', mirror: '(none)' });
}

/* ================= D ================= */
section('D  sign-in and boot: the account\'s value, before anything shows');
{
  const APP = read('app.js');
  const cb = APP.indexOf('watchAuth(async user => {');
  const hide = APP.indexOf("authEl.classList.add('hidden')", cb);
  const rec = APP.indexOf('reconcileVibe()', cb);
  const firstAwait = APP.indexOf('await ', cb);
  expect(cb > 0 && rec > cb && rec < hide && (firstAwait < 0 || rec < firstAwait),
    'app.js: watchAuth\'s callback reconciles to the mirror (reconcileVibe()) before #auth hides and before its first await');
  expect(/import\s*\{[^}]*\breconcileVibe\b[^}]*\binitVibe\b[^}]*\}\s*from\s*'\.\/store\.js'/.test(APP) ||
    /import\s*\{[^}]*\binitVibe\b[^}]*\breconcileVibe\b[^}]*\}\s*from\s*'\.\/store\.js'/.test(APP), 'both come from store.js');
  const boot = APP.indexOf('async function boot(');
  const flush = APP.indexOf('await flushQueue()', boot), units = APP.indexOf('await initUnits();', boot);
  const call = /(?:const|let)\s+(\w+)\s*=\s*initVibe\(\);|await initVibe\(\);/g; call.lastIndex = boot;
  const m = call.exec(APP);
  const waited = m && (m[1] ? APP.indexOf('await ' + m[1] + ';', m.index) : m.index);
  const later = ['runSetup(user)', 'initYou({', 'await initWorkout()'].map(s => APP.indexOf(s, boot));
  expect(m && m.index > flush && flush > boot && Math.abs(m.index - units) < 400 && waited > 0 && later.every(i => i > waited),
    'boot(): initVibe() beside initUnits(), after the queue flushes, and awaited before setup and every tab' + (m ? ` (${m[0].trim()})` : ' — not found'));

  await reset(); localStorage.setItem('rack:vibe', 'tst'); DOC.documentElement.dataset.vibe = 'tst';
  const a = store.reconcileVibe();
  expect(a === 'v1' && attr() === undefined && key() === null, 'a device key of \'tst\' with no mirror: the account\'s value (none, so v1) wins, and the key goes');
  await reset(); store.LS.set(MIRROR, 'tst');
  const b = store.reconcileVibe();
  expect(b === 'tst' && attr() === 'tst' && key() === 'tst', 'a mirror of \'tst\' on a device keyed v1: \'tst\', and the key follows it');
  await reset(); store.LS.set(MIRROR, 'tst'); store.reconcileVibe(); server.set(PATH, 'tsu'); renders = 0;
  const c = await store.initVibe();
  expect(c === 'tsu' && attr() === 'tsu' && key() === 'tsu' && mirror() === 'tsu', 'at boot the database\'s \'tsu\' beats the mirror\'s \'tst\' — the look, the key and the mirror follow it');
  expect(renders === 0, 'and neither boot step repaints: nothing of the app is drawn yet');
  // A page that already paints the account's vibe is left alone — vibe.js
  // bootVibe()'s rule. The P gate forces data-vibe="v1" on <html> to prove
  // the attribute changes nothing; a v1 account's sign-in and boot must not
  // take it off either.
  await reset(); DOC.documentElement.dataset.vibe = 'v1';
  const r1 = store.reconcileVibe(); const r2 = await store.initVibe();
  expect(r1 === 'v1' && r2 === 'v1' && attr() === 'v1' && key() === null && renders === 0,
    'with data-vibe="v1" already on <html>, a v1 account\'s reconcile and boot leave it where it is (attr ' + attr() + ')');
}

/* ================= E ================= */
section('E  the Vibes sheet');
{
  // The generator itself, lifted out of tools-check/vibes-css.mjs: a tile must
  // carry exactly the block that file writes for its vibe's :root.
  const CSSV = readFileSync(join(REPO, 'tools-check/vibes-css.mjs'), 'utf8');
  const g0 = CSSV.indexOf('/* ================= the generator ================= */'), g1 = CSSV.indexOf('/* ================= reading CSS ================= */');
  const GEN = new Function('ROLES', 'at', 'sideOf', 'hexToRgb', 'valueOf', CSSV.slice(g0, g1) + '\nreturn { block };')(IDX.ROLES, IDX.at, IDX.sideOf, IDX.hexToRgb, IDX.valueOf);
  const blockPairs = (id, d) => GEN.block(id, d).text.split('\n').map(l => /^ {2}([\w-]+): (.*);$/.exec(l)).filter(Boolean).map(x => [x[1], x[2]]);
  expect(g0 > 0 && g1 > g0 && blockPairs('v1', DEF.v1).length > 80, `vibes-css.mjs's generator was read: v1's block would set ${blockPairs('v1', DEF.v1).length} properties`);

  await reset();
  let asked = [];
  DOC.fonts = { load: async (q, text) => { asked.push([q, text]); return [{ family: q }]; } };
  VS.openVibes(() => {});
  await tick();
  const sh = DOC.body.children.find(n => n.classList.contains('sheet'));
  expect(!!sh && sh.classList.contains('vibes-sheet') && DOC.body.children.some(n => n.classList.contains('sheet-backdrop')), 'it opens one sheet, classed vibes-sheet (the tall size is rack.css\'s)');
  const tiles = sh.querySelectorAll('.vibe-tile');
  const ids = tiles.map(t => t.querySelector('.vibe-in').dataset.vibe);
  expect(J(IDX.list().map(v => v.id)) === J(['tst', 'v1', 'tsu', 'tsx']) && J(ids) === J(['v1', 'tst', 'tsu']),
    `v1 first though the registry lists 'tst' ahead of it, the rest in registry order, and 'tsx' (listed, no definition) left off: ${ids.join(', ')}`);
  const wrongTokens = [];
  for (const t of tiles) {
    const id = t.querySelector('.vibe-in').dataset.vibe;
    const got = [...t.querySelector('.vibe-in').style.props], want = blockPairs(id, DEF[id]);
    if (J(got) !== J(want)) wrongTokens.push(`${id}: ${got.length} set, ${want.length} generated; first difference ${J(got.find((p, i) => J(p) !== J(want[i])))}`);
  }
  expect(!wrongTokens.length, 'every tile carries, on its own .vibe-in, exactly the properties vibes-css.mjs generates for its vibe — in order, color-scheme included' + (wrongTokens.length ? ' — ' + wrongTokens.join('; ') : ''));
  const v1in = tiles[0].querySelector('.vibe-in').style;
  expect(v1in.getPropertyValue('--rack') === '#14161a' && v1in.getPropertyValue('--accent') === '#f0be1e' && tiles[1].querySelector('.vibe-in').style.getPropertyValue('--accent') === '#e05a00',
    'so v1\'s tile is painted in v1\'s own colours and tst\'s in tst\'s, whichever is worn');
  const current = () => tiles.filter(t => t.getAttribute('aria-current') === 'true').map(t => t.querySelector('.vibe-in').dataset.vibe);
  const checks_ = () => tiles.filter(t => t.querySelector('.vibe-check')).map(t => t.querySelector('.vibe-in').dataset.vibe);
  expect(J(current()) === J(['v1']) && J(checks_()) === J(['v1']), 'the vibe worn is marked twice — aria-current and a drawn check — and no other tile is');
  const ck = tiles[0].querySelector('.vibe-check');
  expect(ck && ck.ns && ck.getAttribute('aria-hidden') === 'true' && ck.getAttribute('viewBox') === '0 0 20 20' && ck.querySelector('path').getAttribute('d') === 'M4 10.5 L8.5 15 L16 5.5',
    'the check is a drawn path, hidden from screen readers — not a glyph');
  const words = n => n.children.length ? n.children.flatMap(words) : (n._text ? [n._text] : []);
  const said = words(sh);
  const reg = Object.fromEntries(IDX.list().map(v => [v.id, v]));
  const wantWords = ['Look', 'Vibes', ...ids.flatMap(id => ['315', reg[id].name, reg[id].feel, ...(reg[id].experimental ? ['Experimental'] : [])]), 'Close'];
  expect(J(said) === J(wantWords), 'its words: "Look", "Vibes", each tile\'s registered name and feel verbatim, "Experimental" only where set, the sample 315 and Close — nothing else' + ' — ' + J(said));
  expect(tiles.every(t => t.querySelector('.vibe-sample').getAttribute('aria-hidden') === 'true') && sh.querySelector('h2').id && sh.querySelector('.vibe-list').getAttribute('aria-labelledby') === sh.querySelector('h2').id,
    'every sample card is hidden from screen readers (VoiceOver never reads 315), and the list is labelled by the title');
  const img = tiles[1].querySelector('.vibe-thumb');
  expect(img && img.src === 'https://rack.test/app/vibes/tst/thumb.jpg' && img.alt === '' && !tiles[0].querySelector('.vibe-thumb') && !tiles[2].querySelector('.vibe-thumb'),
    'a vibe with a thumbnail shows it on its sample card (vibes/<id>/, local); one without shows none');
  const nums = tiles.map(t => t.querySelector('.vibe-num'));
  expect(nums.every(n => !n.classList.contains('wait')) && asked.length === 3 && asked.every(([q, s]) => /^800 35px /.test(q) && s === '315') &&
    asked[0][0] === "800 35px 'Archivo'" && asked[1][0] === "800 35px 'tst-Figures'" && asked[2][0] === "800 35px 'tsu-Grot'",
    'each number is drawn once its own face — the first family of its numeral stack (face.web.num; its text face where it names none) — has loaded for 315: ' + asked.map(a => a[0]).join(' · '));
  const numTok = tiles.map(t => t.querySelector('.vibe-in').style.getPropertyValue('--font-num'));
  expect(numTok[1] === "'tst-Figures', Georgia, serif" && numTok[2] === "'tsu-Grot', system-ui, sans-serif",
    'and each tile carries the --font-num its card figure is set in (rack.css .vibe-num): ' + numTok.join(' · '));
  const close = sh.querySelector('.vibes-close');
  expect(close && close.classList.contains('btn') && close.classList.contains('btn-ghost') && close.classList.contains('btn-block'), 'Close is the house ghost button');
  expect(VS.vibeName() === 'v1', 'the Settings row reads the worn vibe\'s registered name: v1');

  // A tap: restyle in place.
  const before = tiles.map(t => [t, [...t.querySelector('.vibe-in').style.props]]);
  tiles[1].onclick();
  expect(attr() === 'tst' && J(current()) === J(['tst']) && J(checks_()) === J(['tst']), 'a tap puts the vibe on at once and moves the ring and the check to it');
  expect(sh.isConnected && J(sh.querySelectorAll('.vibe-tile').map(t => tiles.indexOf(t))) === J([0, 1, 2]) &&
    before.every(([t, p]) => J([...t.querySelector('.vibe-in').style.props]) === J(p)), 'the sheet stays open, its tiles are the same nodes, and no tile\'s tokens moved');
  await tick(); await tick();
  expect(J(setLog) === J([[PATH, 'tst']]) && VS.vibeName() === 'Test', 'the pick is written, and the row now reads "Test"');
  tiles[1].onclick(); await tick();
  expect(setLog.length === 1, 'tapping the vibe worn does nothing');
  refuse = PATH;
  await quiet(async () => { tiles[2].onclick(); for (let i = 0; i < 6; i++) await tick(); });
  expect(attr() === 'tst' && J(current()) === J(['tst']) && J(checks_()) === J(['tst']), 'a refused pick puts the mark back on the vibe the account holds');
  refuse = null;
  close.onclick();
  expect(!sh.isConnected, 'Close closes it');
  VB.applyVibe('v1');
  expect(J(current()) === J(['tst']), 'and once closed it no longer listens');

  // The face, not ready.
  const numbersWhen = async fonts => { await reset(); DOC.fonts = fonts; VS.openVibes(() => {}); for (let i = 0; i < 4; i++) await tick();
    const s = DOC.body.children.filter(n => n.classList.contains('vibes-sheet')).pop();
    const r = s.querySelectorAll('.vibe-num').map(n => !n.classList.contains('wait'));
    s.querySelector('.vibes-close').onclick(); return r; };
  const never = await numbersWhen({ load: () => new Promise(() => {}) });
  const empty = await numbersWhen({ load: async () => [] });
  const broken = await numbersWhen({ load: async () => { throw new Error('network'); } });
  const noApi = await numbersWhen(undefined);
  expect(J(never) === J([false, false, false]) && J(empty) === J([false, false, false]) && J(broken) === J([false, false, false]) && J(noApi) === J([true, true, true]),
    'a number whose face has not loaded — still loading, no face for it, a failed load — is not drawn; with no font API to ask, it is');
  DOC.fonts = undefined;
}

/* ================= F ================= */
section('F  no inline heights; the sheet\'s rules name only its own classes');
{
  const files = ['vibes-sheet.js', 'store.js', 'app.js', 'settings.js', 'ui.js'];
  const inline = files.filter(f => /\.style\.(height|minHeight|maxHeight|blockSize)\s*=|style\.setProperty\(\s*['"`](min-|max-)?height/.test(read(f)));
  expect(!inline.length, `no element.style.height / minHeight / maxHeight in ${files.join(', ')}` + (inline.length ? ' — ' + inline.join(', ') : ''));
  const css = read('rack.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const sels = [...css.matchAll(/(^|})\s*([^{}@]+)\{/g)].map(m => m[2].trim()).filter(s => /vibes?-/.test(s)).flatMap(s => s.split(',').map(x => x.trim()));
  const foreign = sels.filter(s => {
    const classes = [...s.matchAll(/\.([\w-]+)/g)].map(m => m[1]);
    const bare = s.replace(/\.[\w-]+|\[aria-current="true"\]|:active|:focus-visible|\s+/g, '');
    return bare !== '' || !classes.every(c => /^vibes?-/.test(c) || c === 'wait' || (c === 'sheet' && s.startsWith('.sheet.vibes-sheet')));
  });
  expect(sels.length >= 10 && !foreign.length, `rack.css's ${sels.length} selectors for the sheet are built from its own classes alone` + (foreign.length ? ' — ' + foreign.join(' | ') : ''));
  const tall = /\.sheet\.vibes-sheet\s*\{\s*max-height:\s*calc\(92dvh - var\(--safe-top\)\);\s*\}/.test(css) && /\.vibe-in\s*\{[^}]*min-height:\s*112px/.test(css);
  expect(tall, 'the sheet is the Coach sheet\'s tall size and every tile at least 112px, both by class');
}

/* ================= G ================= */
if (!PLANTED) {
  section('G  canaries — each planted mistake, in a scratch copy, turns this file red on its check');
  // the pure contract whole: every registered vibe's definition and icon set too, which vibe.js imports
  const FILES = ['store.js', 'app.js', 'vibe.js', 'ui.js', 'units.js', 'vibes-sheet.js', 'settings.js', 'rack.css',
    ...['vibes/defs', 'vibes/icons'].flatMap(d => readdirSync(join(REPO, d)).filter(f => f.endsWith('.js')).map(f => d + '/' + f))];
  const plants = [
    ['setVibe writes an object', 'store.js', "await write('settings/vibe', next);", "await write('settings/vibe', { id: next });", /bare string/],
    ['initVibe keeps what it read', 'store.js', 'VIBE = wearVibe(normVibe(v), { render: false });', "applyVibe(v, { render: false }); VIBE = v === null ? 'v1' : v;", /initVibe\(\): the database/],
    ['a refusal forgets the look', 'store.js', 'VIBE = wearVibe(normVibe(run.held));', 'VIBE = normVibe(run.held);', /refused pick rejects/],
    ['boot re-applies the vibe the page already paints', 'store.js', 'return id === vibeOnPage() ? id : applyVibe(id, opts);', 'return applyVibe(id, opts);', /data-vibe="v1" already on <html>/],
    ['reconcile after #auth hides', 'app.js', "if (!booted) reconcileVibe();\n    authEl.classList.add('hidden');", "authEl.classList.add('hidden');\n    if (!booted) reconcileVibe();", /before #auth hides/],
    ['the registry\'s order, v1 not first', 'vibes-sheet.js', 'return [...shown.filter(m => m.id === DEFAULT), ...shown.filter(m => m.id !== DEFAULT)];', 'return shown;', /v1 first/],
    ['the mark by the ring alone, no check', 'vibes-sheet.js', 'if (on && !c) t.inner.appendChild(checkMark());', '', /marked twice/],
    ['an inline height', 'vibes-sheet.js', 'function checkMark() {', "function tall(n) { n.style.minHeight = '112px'; }\nfunction checkMark() {", /no element\.style\.height/]
  ];
  for (const [label, file, from, to, want] of plants) {
    const dir = mkdtempSync(join(tmpdir(), 'rack-vibe-setting-plant-'));
    for (const f of FILES) { mkdirSync(dirname(join(dir, f)), { recursive: true }); cpSync(join(REPO, f), join(dir, f)); }
    const src = readFileSync(join(dir, file), 'utf8');
    if (!src.includes(from)) { bad(`${label}: the plant's anchor is gone from ${file} — update the canary`); continue; }
    writeFileSync(join(dir, file), src.replace(from, to));
    const r = spawnSync(process.execPath, [SELF, '--root', dir], { encoding: 'utf8', maxBuffer: 1 << 26, timeout: 120000 });
    const red = (r.stdout || '').split('\n').filter(l => l.startsWith('  ✗ '));
    expect(r.status === 1 && red.some(l => want.test(l)), `${label} (${file}): red on ${want} — exit ${r.status}, ${red.length} red` + (red.length ? ': ' + red.map(l => l.slice(4, 70)).join(' | ') : ''));
  }
}

console.log('\n' + (fails.length ? `${fails.length} of ${checks} checks failed.` : `All checks passed. ${checks} checks.`));
process.exit(fails.length ? 1 : 0);
