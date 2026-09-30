#!/usr/bin/env node
/* rv3-snat-probe — adversarial reviewer's probes of Phase S (native), round 3.
 * Scaffold copied from <tree>/tools/verify-vibe-setting.mjs (same stand-ins),
 * via rv2-snat-probe.mjs, then its own probes. Read-only against the tree.
 *
 * Run:  node rv3-snat-probe.mjs <tree> [probe...]
 *   r1  two picks in flight, both refused (OTHER, then back to v1)
 *   r2  two picks in flight, both refused (OTHER, then CARD)
 *   g1  approval revoked while the Vibes sheet is open; then a card is tapped
 *   g2  signed out (not from Settings) while the Vibes sheet is open; then a card is tapped
 *   gh  the account holds an id this build lists but cannot wear; v1 is tapped
 *   fl  a live sign-in (sign-in on screen): is there a commit in his vibe before setUser?
 */
import { spawnSync } from 'node:child_process';
import { join, resolve as pathResolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const SELF = fileURLToPath(import.meta.url);
const ROOT = pathResolve(process.argv[2] || '/Users/micahflunker/dev/vibes-night/wt/nat-settings');
const ONLY = process.argv.slice(3);
const want = k => !ONLY.length || ONLY.includes(k);
const SNAP = await import(pathToFileURL(join(ROOT, 'tools/lib/vibe-snap.mjs')).href);
const { ZONE, freeze, open, dump, canon } = SNAP;

if (process.env.TZ !== ZONE || process.env.RV3_SNAT_CHILD !== '1') {
  const r = spawnSync(process.execPath, [SELF, ...process.argv.slice(2)], { env: { ...process.env, TZ: ZONE, RV3_SNAT_CHILD: '1' }, stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
}

const out = [];
const log = t => { out.push(t); };
const msg = e => String((e && e.message) || e).split('\n')[0].slice(0, 300);
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const deferred = () => { let resolve, reject; const promise = new Promise((r, j) => { resolve = r; reject = j; }); return { promise, resolve, reject }; };

freeze();
const R0 = await import(pathToFileURL(join(ROOT, 'tools/lib/rn-render.mjs')).href);
const INDEX = R0.load('src/pure/vibes/defs/index.js');
const TEST = 'zz-set', OTHER = 'zz-other', BOOT = 'zz-boot', CARD = 'zz-card', GHOST = 'zz-ghost';
const EXTRA = [
  { id: TEST, name: 'Setting test', feel: 'A light test vibe.', experimental: false, scheme: 'light' },
  { id: OTHER, name: 'Other test', feel: 'A second test vibe.', experimental: false, scheme: 'dark' },
  { id: BOOT, name: 'Boot test', feel: 'Worn at sign-in.', experimental: false, scheme: 'light' },
  { id: CARD, name: 'Card test', feel: 'A dark test vibe.', experimental: false, scheme: 'dark' },
  { id: GHOST, name: 'Ghost', feel: 'Listed, with no files in this build.', experimental: false, scheme: 'dark' }
];
const IDS = EXTRA.map(v => v.id);
R0.override((request, file) => !!file && file === join(ROOT, 'src/pure/vibes/defs/index.js'), {
  ...INDEX,
  normVibe: x => (IDS.includes(x) ? x : INDEX.normVibe(x)),
  list: () => [...INDEX.list(), ...EXTRA.map(v => ({ ...v }))]
});

let H = null, T = null;
const NET = { sent: [], holds: new Map(), refuse: new Set(), getHolds: new Map(), watchers: new Map() };
const segs = p => String(p).split('/').filter(Boolean);
const srvGet = p => {
  let cur = H ? H.S.server : {};
  for (const s of segs(p)) { if (cur === null || typeof cur !== 'object') return null; cur = Object.prototype.hasOwnProperty.call(cur, s) ? cur[s] : null; }
  return cur === undefined ? null : clone(cur);
};
const srvSet = (p, v) => {
  const path = segs(p);
  let cur = H.S.server;
  path.slice(0, -1).forEach(s => { if (!cur[s] || typeof cur[s] !== 'object') cur[s] = {}; cur = cur[s]; });
  if (v === null || v === undefined) delete cur[path[path.length - 1]]; else cur[path[path.length - 1]] = clone(v);
};
const DENIED = () => Object.assign(new Error("PERMISSION_DENIED: Client doesn't have permission to access the desired data."), { code: 'PERMISSION_DENIED' });
R0.override(r => r === 'firebase/database', {
  __esModule: true,
  ref: (_db, path) => ({ path: path || '' }),
  get: async r => {
    const hold = NET.getHolds.get(r.path);
    if (hold) await hold.promise;
    const v = srvGet(r.path); return { exists: () => v !== null && v !== undefined, val: () => v };
  },
  set: async (r, v) => {
    NET.sent.push({ path: r.path, value: clone(v), wearing: T && T.id });
    const hold = NET.holds.get(v);
    if (hold) await hold.promise;
    if (NET.refuse.has(v)) throw DENIED();
    srvSet(r.path, v);
  },
  update: async () => {}, remove: async () => {},
  onValue: (r, cb) => {
    NET.watchers.set(r.path, cb);
    queueMicrotask(() => { const v = srvGet(r.path); cb({ exists: () => v !== null, val: () => v }); });
    return () => { if (NET.watchers.get(r.path) === cb) NET.watchers.delete(r.path); };
  },
  goOnline: () => {}, goOffline: () => {}
});
const deliver = p => { const f = NET.watchers.get(p); if (f) { const v = srvGet(p); f({ exists: () => v !== null, val: () => v }); } };
/* The root status bar: records the style, the vibe worn, and — through the
   AuthContext it sits inside — whether a user was set at that render. */
const BARS = [];
let AUTHCTX = null;
const reactOf = () => H && H.R && H.R.React;
R0.override(r => r === 'expo-status-bar', { __esModule: true, StatusBar: p => {
  let user = null;
  try { const ctx = AUTHCTX ? reactOf().useContext(AUTHCTX) : null; user = ctx ? (ctx.user === undefined ? 'undefined' : !!ctx.user) : 'no-ctx'; } catch { user = 'err'; }
  BARS.push({ style: p.style, id: T && T.id, user }); return null;
} });
const HIDES = [];
R0.override(r => r === 'expo-splash-screen', { __esModule: true,
  preventAutoHideAsync: () => Promise.resolve(true), setOptions() {},
  hideAsync: () => { HIDES.push(T && T.id); return Promise.resolve(true); } });

H = await open(ROOT);
const { R, S, A, ls, UID } = H;
const { h } = R;
const doc = globalThis.document;
const { createRoot } = H.req('react-dom/client');
const appReq = createRequire(join(ROOT, 'app/_layout.jsx'));
const FONT = appReq('expo-font');
const LOADS = [];
let HOLD = null;
FONT.loadAsync = map => {
  const keys = Object.keys(map).sort();
  LOADS.push({ keys, wearing: T && T.id });
  return HOLD ? HOLD.promise : Promise.resolve();
};

const MIRROR = 'mirror:settings/vibe';
const VPATH = 'users/' + UID + '/settings/vibe';
const APPROVED_REC = { at: 1, via: 'invite' };
S.server = { access: { approved: { [UID]: clone(APPROVED_REC) } }, users: { [UID]: {} } };

const THEME = R.load('src/ui/theme.js');
T = THEME.default;
const V = R.load('src/state/vibe.js');
const VA = R.load('src/state/vibeAccount.js');
const STORE = R.load('src/data/store.js');
AUTHCTX = R.load('src/state/auth.jsx').AuthContext;
const V1 = R.load('src/pure/vibes/defs/v1.js').default;
const V1T = THEME.build(V1);
const LIGHT = { statusBar: 'dark', keyboard: 'light', datePicker: 'light', blurTint: 'light' };
const INK = { rack: '#f3eee2', bar: '#fbf8f1', collar: '#d9d2c3', knurl: '#c4bba8', chalk: '#1d1b18', steel: '#5b5548',
              dim: '#8a8272', accent: '#9b2226', focus: '#9b2226', inverse: '#1d1b18', knockout: '#f3eee2', warn: '#b5651d',
              well: '#ece5d6', raised: '#e4dccb', track: '#e4dccb', grip: '#cfc6b3', faint: '#cfc6b3' };
const DARK2 = { rack: '#101820', bar: '#18242e', collar: '#22313d', chalk: '#eef3f6', steel: '#9aa9b4', accent: '#3fb6a8', focus: '#3fb6a8' };
function synth(id, family, colors = {}, chrome = {}) {
  const d = clone(V1);
  d.id = id; d.name = id; d.scheme = chrome.statusBar === 'dark' ? 'light' : 'dark';
  Object.assign(d.colors, colors);
  Object.assign(d.chrome, chrome);
  d.face = { ...d.face, family, keys: [400, 600, 700, 800].map(w => family + '_' + w), snap: {}, weights: [400, 600, 700, 800], minLh: 1.2 };
  return d;
}
const DEF = {
  [TEST]: synth(TEST, 'Setx', INK, LIGHT),
  [OTHER]: synth(OTHER, 'Otherx', DARK2),
  [BOOT]: synth(BOOT, 'Bootx', INK, LIGHT),
  [CARD]: synth(CARD, 'Cardx', DARK2)
};
const fontsOf = d => Object.fromEntries(d.face.keys.map(k => [k, 'asset:' + k + '.ttf']));
for (const id of Object.keys(DEF)) V.VIBE_DEFS[id] = { def: DEF[id], icons: V.VIBE_DEFS.v1.icons, images: {}, fonts: fontsOf(DEF[id]) };
// GHOST is listed and has NO entry in VIBE_DEFS: a vibe the web has and this build does not.

const tick = () => R.act(async () => { await new Promise(r => setTimeout(r, 0)); });
const until = async (pred, what, n = 300) => { for (let i = 0; i < n; i++) { if (pred()) return true; await tick(); } throw new Error('never reached: ' + what); };
const settle = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };
const vibeWrites = () => NET.sent.filter(s => s.path === VPATH);

const box = doc.createElement('div'); doc.body.appendChild(box);
const ERRORS = [];
const root = createRoot(box, { onCaughtError: e => ERRORS.push(msg(e)), onUncaughtError: e => ERRORS.push(msg(e)), onRecoverableError: () => {} });
const RootLayout = R.load('app/_layout.jsx').default;
const VS = R.load('src/ui/settings/vibes.jsx');
const signIn = async () => { await R.act(async () => { await A.cb({ uid: UID, email: 'dev@example.com' }); }); };
const signOut = async () => { await R.act(async () => { await A.cb(null); }); await tick(); };
const inApp = async id => {
  ls.set(MIRROR, id); S.server.users[UID].settings = { vibe: id };
  S.server.access.approved[UID] = clone(APPROVED_REC);
  await signIn();
  await until(() => BARS.length > 0 && V.vibe() === V.resolveVibe(id) && NET.watchers.has('access/approved/' + UID), 'in the app, wearing ' + id);
  await settle(3);
};
const sheetOpen = () => dump(R, box).some(e => e.t === 'Modal');
const cardFor = name => R.pressables(box, new RegExp('^' + name)).find(p => R.styleOf(p.p).minHeight === 112);
const SignIn = R.load('app/(auth)/sign-in.jsx').default;
const drawSignIn = async () => {
  const b = doc.createElement('div'); doc.body.appendChild(b);
  const r2 = createRoot(b, { onCaughtError() {}, onUncaughtError() {}, onRecoverableError() {} });
  await R.act(async () => { r2.render(h(SignIn)); });
  const d = dump(R, b);
  await R.act(async () => { r2.unmount(); });
  return d.map(canon).join('\n');
};
let freshSignIn = null;
const signInAsV1 = async () => {
  const now = await drawSignIn();
  if (freshSignIn === null) { const saved = { ...T }; THEME.applyTheme(THEME.build(V1)); freshSignIn = await drawSignIn(); Object.assign(T, saved); }
  return now === freshSignIn;
};
const cleanup = async () => {
  NET.refuse.clear(); NET.holds.clear(); HOLD = null;
  if (sheetOpen()) { const c = R.pressables(box, 'Close')[0]; if (c) await R.press(c.p); }
  await signOut();
  if (V.vibe() !== 'v1') V.resetVibe();
  S.server.access.approved[UID] = clone(APPROVED_REC);
};

try {
  STORE.watchAuth(() => {});
  await R.act(async () => { root.render(h(RootLayout)); });
  await tick();

  /* ---------- R1: tap OTHER, then back to v1; both writes refused ---------- */
  if (want('r1')) {
    log('\nR1 — the account is on v1. Tap OTHER (write held), then tap v1 (write held). The rules refuse both (e.g. OPTIONAL-LOCK and a locked account); the refusals arrive in order.');
    await inApp('v1');
    V.markFacesRegistered(DEF[OTHER].face.keys);
    const hA = deferred(), hB = deferred();
    NET.holds.set(OTHER, hA); NET.holds.set('v1', hB); NET.refuse.add(OTHER); NET.refuse.add('v1');
    const n0 = vibeWrites().length;
    const pA = VA.chooseVibe(OTHER);
    await until(() => vibeWrites().length > n0, 'OTHER written (held)');
    const pB = VA.chooseVibe('v1');
    await until(() => vibeWrites().length > n0 + 1, 'v1 written (held)');
    log('  both writes out: worn=' + T.id + ', mirror=' + JSON.stringify(ls.get(MIRROR)) + ', database=' + JSON.stringify(srvGet(VPATH)));
    NET.holds.delete(OTHER); hA.resolve();
    const rA = await pA;
    log('  OTHER refused: chooseVibe(OTHER) -> ' + rA + ', worn=' + T.id + ', mirror=' + JSON.stringify(ls.get(MIRROR)));
    NET.holds.delete('v1'); hB.resolve();
    const rB = await pB;
    await settle(3);
    log('  v1 refused:    chooseVibe(v1) -> ' + rB + ', worn=' + T.id + ', mirror=' + JSON.stringify(ls.get(MIRROR)) + ', database=' + JSON.stringify(srvGet(VPATH)) +
        ', hub row=' + JSON.stringify(VS.vibeName()));
    log('  RESULT: ' + (T.id === srvGet(VPATH) ? 'reverted to the account\'s value (' + T.id + ')' :
      'WRONG — wearing ' + T.id + ' (a pick the database refused and never held, and not his last tap); the account holds ' + srvGet(VPATH)));
    await cleanup();
  }

  /* ---------- R2: tap OTHER, then CARD; both refused ---------- */
  if (want('r2')) {
    log('\nR2 — the account is on v1. Tap OTHER, then CARD, both writes held and then refused in order.');
    await inApp('v1');
    V.markFacesRegistered(DEF[OTHER].face.keys); V.markFacesRegistered(DEF[CARD].face.keys);
    const hA = deferred(), hB = deferred();
    NET.holds.set(OTHER, hA); NET.holds.set(CARD, hB); NET.refuse.add(OTHER); NET.refuse.add(CARD);
    const n0 = vibeWrites().length;
    const pA = VA.chooseVibe(OTHER);
    await until(() => vibeWrites().length > n0, 'OTHER written (held)');
    const pB = VA.chooseVibe(CARD);
    await until(() => vibeWrites().length > n0 + 1, 'CARD written (held)');
    NET.holds.delete(OTHER); hA.resolve(); await pA;
    NET.holds.delete(CARD); hB.resolve(); await pB;
    await settle(3);
    log('  both refused: worn=' + T.id + ', mirror=' + JSON.stringify(ls.get(MIRROR)) + ', database=' + JSON.stringify(srvGet(VPATH)));
    log('  RESULT: ' + (T.id === srvGet(VPATH) ? 'reverted to the account\'s value' : 'WRONG — wearing ' + T.id + ', which the database refused; the account holds ' + srvGet(VPATH)));
    await cleanup();
  }

  /* ---------- G1: approval revoked while the Vibes sheet is open ---------- */
  if (want('g1')) {
    log('\nG1 — in the app wearing OTHER, the Vibes sheet open. Approval is revoked (the owner, from his phone). Then a card on the still-open sheet is tapped; the live rules refuse settings writes for an unapproved account.');
    await inApp(OTHER);
    V.markFacesRegistered(DEF[TEST].face.keys);
    await R.act(async () => { VS.openVibes(); });
    await settle(3);
    log('  sheet open: ' + sheetOpen() + ', worn=' + T.id);
    delete S.server.access.approved[UID];
    await R.act(async () => { deliver('access/approved/' + UID); });
    await settle(3);
    log('  revoked: the waiting gate is up; worn=' + T.id + '; sheet still open: ' + sheetOpen());
    NET.refuse.add(TEST); NET.refuse.add(OTHER); NET.refuse.add('v1');
    const b0 = BARS.length, n0 = vibeWrites().length;
    const card = cardFor('Setting test');
    log('  the ' + TEST + ' card is on screen and pressable: ' + !!card);
    if (card) await R.press(card.p);
    await settle(6);
    log('  after the tap: worn=' + T.id + ', V.vibe()=' + V.vibe() + ', writes sent=' + JSON.stringify(vibeWrites().slice(n0).map(w => w.value)) +
        ', database=' + JSON.stringify(srvGet(VPATH)) + '; root status bars since: ' + JSON.stringify(BARS.slice(b0).slice(-3)));
    log('  RESULT: ' + (T.id === 'v1' ? 'the gate stayed v1' : 'WRONG — the waiting gate now wears ' + T.id + ' (not v1)'));
    await cleanup();
  }

  /* ---------- G2: signed out, not from Settings, while the sheet is open ---------- */
  if (want('g2')) {
    log('\nG2 — in the app on v1, the Vibes sheet open. The session ends without the Settings button (a revoked refresh token: watchAuth(null)). Then a card on the still-open sheet is tapped.');
    await inApp('v1');
    V.markFacesRegistered(DEF[TEST].face.keys);
    await R.act(async () => { VS.openVibes(); });
    await settle(3);
    await signOut();
    log('  signed out: store uid=' + JSON.stringify(STORE.uid()) + ', worn=' + T.id + ', sheet still open: ' + sheetOpen());
    const b0 = BARS.length, n0 = vibeWrites().length;
    const card = cardFor('Setting test');
    if (card) await R.press(card.p);
    await settle(6);
    const asV1 = await signInAsV1();
    log('  after the tap: worn=' + T.id + ', writes sent=' + JSON.stringify(vibeWrites().slice(n0).map(w => w.value)) +
        '; root status bars since: ' + JSON.stringify(BARS.slice(b0).slice(-2)) + '; sign-in drawn as in a fresh v1: ' + asV1);
    log('  RESULT: ' + (T.id === 'v1' ? 'sign-in stayed v1' : 'WRONG — the signed-out device wears ' + T.id + ', and nothing was written (no uid), so nothing will ever put it back until the next sign-in or relaunch'));
    await cleanup();
  }

  /* ---------- GH: the account holds a vibe this build lists but cannot wear ---------- */
  if (want('gh')) {
    log('\nGH — the account holds ' + GHOST + ' (picked on the web, which has it; this build lists it and has no files). He opens Vibes and taps v1.');
    await inApp(GHOST);
    const r0 = await VA.initVibe();
    log('  worn=' + T.id + ' (initVibe -> ' + r0 + '), hub row=' + JSON.stringify(VS.vibeName()) + ', database=' + JSON.stringify(srvGet(VPATH)));
    await R.act(async () => { VS.openVibes(); });
    await settle(3);
    const v1c = cardFor('v1');
    log('  v1 card marked selected: ' + !!(v1c && v1c.p.accessibilityState && v1c.p.accessibilityState.selected));
    const n0 = vibeWrites().length;
    if (v1c) await R.press(v1c.p);
    await settle(4);
    log('  after tapping v1: writes sent=' + JSON.stringify(vibeWrites().slice(n0).map(w => w.value)) + ', database=' + JSON.stringify(srvGet(VPATH)));
    log('  RESULT: ' + (srvGet(VPATH) === 'v1' ? 'v1 written' : 'nothing written — the account still holds ' + srvGet(VPATH) + ' (his web keeps wearing it)'));
    await cleanup();
  }

  /* ---------- FL: a live sign-in, sign-in on screen ---------- */
  if (want('fl')) {
    log('\nFL — signed out, sign-in on screen (ready). The mirror holds ' + TEST + ' (faces already registered). He signs in; the callback is let run OUTSIDE act, with real scheduling.');
    await signOut();
    ls.set(MIRROR, TEST); S.server.users[UID].settings = { vibe: TEST };
    V.markFacesRegistered(DEF[TEST].face.keys);
    const b0 = BARS.length;
    const realErr = console.error; console.error = () => {};
    A.cb({ uid: UID, email: 'dev@example.com' });
    for (let i = 0; i < 60; i++) await new Promise(r => setTimeout(r, 0));
    console.error = realErr;
    const seq = BARS.slice(b0);
    const bad = seq.filter(b => b.id !== 'v1' && b.user === false);
    log('  root StatusBar renders since sign-in began (style, worn, user set?): ' + JSON.stringify(seq.slice(0, 6)));
    log('  RESULT: ' + (bad.length ? 'a render with NO user (sign-in still the active group) already wears ' + bad[0].id + ' (status bar ' + bad[0].style + ')' :
      'no render wore the vibe before setUser'));
    await settle(3);
    await cleanup();
  }
  if (ERRORS.length) log('\nerrors: ' + ERRORS.slice(0, 3).join(' | '));
} catch (e) {
  log('PROBE RUN FAILED: ' + msg(e) + '\n' + String(e && e.stack).split('\n').slice(1, 6).join('\n'));
}
console.log(out.join('\n'));
process.exit(0);
