#!/usr/bin/env node
/* s-nat-recheck3-probe — the targeted re-check of native S fix round 3.
 * Scaffold from rv3-snat-probe.mjs (itself from <tree>/tools/verify-vibe-setting.mjs's
 * stand-ins: the real store.js, vibe.js, vibeFonts.js, vibeAccount.js, RootLayout,
 * SheetHost and the Vibes sheet). inApp plays the (app) layout's part — appOpened(),
 * then initVibe() — as verify-vibe-setting's appOpens() does. Read-only against the tree.
 *
 * Run:  node s-nat-recheck3-probe.mjs <tree> [probe...]
 *   Class 1, refusals in a run
 *   r3   three picks in flight, all refused, settled in order
 *   r3x  three picks in flight, all refused, settled out of order
 *   ra   OTHER taken, then CARD and TEST refused
 *   rb   OTHER refused, CARD taken, TEST refused
 *   rc   OTHER refused, CARD taken; CARD's answer arrives first
 *   rd   account on OTHER: CARD refused, then back to OTHER refused
 *   re   OTHER refused while CARD loads its faces; CARD's faces then fail
 *   rf   account never chose (no mirror, no node): OTHER and CARD refused
 *   rg   approval revoked while two picks' writes are out; both then refused
 *   rg1  control for rg: one pick out when approval is revoked, then refused
 *   Class 2, revoked approval
 *   g1a  revoked while a pick loads its faces (sheet open)
 *   g1b  revoked, then a pick, initVibe and openVibes asked for directly
 *   g1c  revoked while the Vibes sheet is under another sheet
 *   g1d  revoked, then approved again: the (app) layout opens the app again
 *   Class 3, session ended elsewhere
 *   g2a  signed out (watchAuth(null)) with the Vibes sheet under another sheet
 *   g2b  signed out while a pick loads its faces
 *   g2c  signed out while a pick's write is out; the write is then refused
 *   g2d  signed out while a pick loads its faces, signed straight back in, app open, then the faces land
 *   Class 4, live sign-in
 *   fl2  a live sign-in whose stored vibe's faces fail
 *   fl3  a live sign-in; the (app) layout's initVibe loads faces; signed out before they land
 *   fl4  a cold launch whose stored vibe's faces fail
 *   fl5  a live sign-in into an account that is not approved (waiting gate), mirror holding a vibe
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

if (process.env.TZ !== ZONE || process.env.RC3_SNAT_CHILD !== '1') {
  const r = spawnSync(process.execPath, [SELF, ...process.argv.slice(2)], { env: { ...process.env, TZ: ZONE, RC3_SNAT_CHILD: '1' }, stdio: 'inherit' });
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
const TEST = 'zz-set', OTHER = 'zz-other', BOOT = 'zz-boot', CARD = 'zz-card';
const EXTRA = [
  { id: TEST, name: 'Setting test', feel: 'A light test vibe.', experimental: false, scheme: 'light' },
  { id: OTHER, name: 'Other test', feel: 'A second test vibe.', experimental: false, scheme: 'dark' },
  { id: BOOT, name: 'Boot test', feel: 'Worn at sign-in.', experimental: false, scheme: 'light' },
  { id: CARD, name: 'Card test', feel: 'A dark test vibe.', experimental: false, scheme: 'dark' }
];
/* Wearable, never listed: each is asked for once, so its faces are unregistered when it is. */
const HIDDEN = ['zz-l1', 'zz-l2', 'zz-l3', 'zz-l4', 'zz-l5', 'zz-f1', 'zz-f2', 'zz-f3'];
const IDS = [...EXTRA.map(v => v.id), ...HIDDEN];
R0.override((request, file) => !!file && file === join(ROOT, 'src/pure/vibes/defs/index.js'), {
  ...INDEX,
  normVibe: x => (IDS.includes(x) ? x : INDEX.normVibe(x)),
  list: () => [...INDEX.list(), ...EXTRA.map(v => ({ ...v }))]
});

let H = null, T = null;
const NET = { sent: [], holds: new Map(), refuse: new Set(), getFail: new Set(), watchers: new Map() };
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
    if (NET.getFail.has(r.path)) throw new Error('stood in: the read did not reach the database');
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
const FHOLD = new Map();      // face family -> deferred: its load waits on it
const FAIL = new Set();       // face families whose load is refused
FONT.loadAsync = map => {
  const keys = Object.keys(map).sort();
  LOADS.push({ keys, wearing: T && T.id });
  const fams = keys.map(k => k.split('_')[0]);
  if (fams.some(f => FAIL.has(f))) return Promise.reject(new Error('stood in: ' + keys.join(', ') + ' did not load'));
  for (const f of fams) if (FHOLD.has(f)) return FHOLD.get(f).promise;
  return Promise.resolve();
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
const SH = R.load('src/ui/sheet.js');
AUTHCTX = R.load('src/state/auth.jsx').AuthContext;
const V1 = R.load('src/pure/vibes/defs/v1.js').default;
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
const FAM = { [TEST]: 'Setx', [OTHER]: 'Otherx', [BOOT]: 'Bootx', [CARD]: 'Cardx',
              'zz-l1': 'Loada', 'zz-l2': 'Loadb', 'zz-l3': 'Loadc', 'zz-l4': 'Loadd', 'zz-l5': 'Loade',
              'zz-f1': 'Faila', 'zz-f2': 'Failb', 'zz-f3': 'Failc' };
const DEF = {};
for (const id of Object.keys(FAM)) DEF[id] = synth(id, FAM[id], id === TEST || id === BOOT || id === 'zz-l1' ? INK : DARK2, id === TEST || id === BOOT || id === 'zz-l1' ? LIGHT : {});
const fontsOf = d => Object.fromEntries(d.face.keys.map(k => [k, 'asset:' + k + '.ttf']));
for (const id of Object.keys(DEF)) V.VIBE_DEFS[id] = { def: DEF[id], icons: V.VIBE_DEFS.v1.icons, images: {}, fonts: fontsOf(DEF[id]) };

const tick = () => R.act(async () => { await new Promise(r => setTimeout(r, 0)); });
const until = async (pred, what, n = 300) => { for (let i = 0; i < n; i++) { if (pred()) return true; await tick(); } throw new Error('never reached: ' + what); };
const settle = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };
const vibeWrites = () => NET.sent.filter(s => s.path === VPATH);
const J = v => JSON.stringify(v);

let box = doc.createElement('div'); doc.body.appendChild(box);
const ERRORS = [];
const mkRoot = b => createRoot(b, { onCaughtError: e => ERRORS.push(msg(e)), onUncaughtError: e => ERRORS.push(msg(e)), onRecoverableError: () => {} });
let root = mkRoot(box);
const RootLayout = R.load('app/_layout.jsx').default;
const VS = R.load('src/ui/settings/vibes.jsx');
const signIn = async () => { await R.act(async () => { await A.cb({ uid: UID, email: 'dev@example.com' }); }); };
const signOut = async () => { await R.act(async () => { await A.cb(null); }); await tick(); };
/* The (app) layout's part: appOpened() as it mounts, then initVibe() beside initUnits. */
const appOpens = async () => { await R.act(async () => { VA.appOpened(); await VA.initVibe(); }); };
const inApp = async id => {
  if (id === undefined) { ls.delete(MIRROR); delete S.server.users[UID].settings; }
  else { ls.set(MIRROR, id); S.server.users[UID].settings = { vibe: id }; }
  S.server.access.approved[UID] = clone(APPROVED_REC);
  await signIn();
  await appOpens();
  const want = id === undefined ? 'v1' : V.resolveVibe(id);
  await until(() => BARS.length > 0 && V.vibe() === want && NET.watchers.has('access/approved/' + UID), 'in the app, wearing ' + want);
  await settle(3);
};
const coldRoot = async () => {
  await R.act(async () => { root.unmount(); });
  box = doc.createElement('div'); doc.body.appendChild(box);
  root = mkRoot(box);
  await R.act(async () => { root.render(h(RootLayout)); });
  await tick();
};
const modals = () => dump(R, box).filter(e => e.t === 'Modal').length;
const sheetOpen = () => modals() > 0;
const cardFor = name => R.pressables(box, new RegExp('^' + name)).find(p => R.styleOf(p.p).minHeight === 112);
const anyCard = () => R.pressables(box).some(p => R.styleOf(p.p).minHeight === 112);
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
const state = () => 'worn=' + T.id + ', mirror=' + J(ls.get(MIRROR)) + ', database=' + J(srvGet(VPATH)) + ', hub row=' + J(VS.vibeName());
const closeAllSheets = async () => {
  for (let i = 0; i < 5 && sheetOpen(); i++) {
    const c = R.pressables(box, 'Close')[0] || R.pressables(box, 'Cancel')[0];
    if (!c) break;
    await R.press(c.p);
  }
};
const cleanup = async () => {
  NET.refuse.clear(); NET.holds.clear(); NET.getFail.clear(); FHOLD.clear(); FAIL.clear();
  STORE.online.value = true;
  await closeAllSheets();
  await signOut();
  if (V.vibe() !== 'v1') V.resetVibe();
  S.server.access.approved[UID] = clone(APPROVED_REC);
};
const revoke = async () => {
  delete S.server.access.approved[UID];
  await R.act(async () => { deliver('access/approved/' + UID); });
  await settle(3);
};
/* Picks, each write held, all sent before any answer. */
const sendHeld = async ids => {
  const holds = ids.map(() => deferred());
  ids.forEach((id, i) => NET.holds.set(id, holds[i]));
  const ps = [];
  for (const id of ids) {
    const n0 = vibeWrites().length;
    ps.push(VA.chooseVibe(id));
    await until(() => vibeWrites().length > n0, id + ' written (held)');
  }
  return { holds, ps };
};
const release = async (ids, holds, ps, order) => {
  for (const i of order) { NET.holds.delete(ids[i]); holds[i].resolve(); await settle(2); }
  await Promise.all(ps);
  await settle(3);
};

try {
  STORE.watchAuth(() => {});
  await R.act(async () => { root.render(h(RootLayout)); });
  await tick();
  [OTHER, CARD, TEST].forEach(id => V.markFacesRegistered(DEF[id].face.keys));

  /* ================= Class 1: refusals in a run ================= */
  if (want('r3') || want('r3x')) {
    for (const [k, order, label] of [['r3', [0, 1, 2], 'in order'], ['r3x', [2, 0, 1], 'out of order (TEST, OTHER, CARD)']]) {
      if (!want(k)) continue;
      log('\n' + k.toUpperCase() + ' — account on v1. Tap OTHER, CARD, TEST, writes held; all refused, settled ' + label + '.');
      await inApp('v1');
      const ids = [OTHER, CARD, TEST];
      NET.refuse.add(OTHER); NET.refuse.add(CARD); NET.refuse.add(TEST);
      const { holds, ps } = await sendHeld(ids);
      log('  all three out: ' + state());
      await release(ids, holds, ps, order);
      log('  settled: ' + state());
      log('  RESULT: ' + (T.id === 'v1' && ls.get(MIRROR) === 'v1' && VS.vibeName() === 'v1' ? 'HELD — look, mirror and hub row back on the account\'s v1' : 'WRONG'));
      await cleanup();
    }
  }

  if (want('ra')) {
    log('\nRA — account on v1. Tap OTHER (taken), CARD (refused), TEST (refused), settled in order. The database ends on OTHER.');
    await inApp('v1');
    const ids = [OTHER, CARD, TEST];
    NET.refuse.add(CARD); NET.refuse.add(TEST);
    const { holds, ps } = await sendHeld(ids);
    await release(ids, holds, ps, [0, 1, 2]);
    log('  settled: ' + state());
    log('  RESULT: ' + (T.id === OTHER && ls.get(MIRROR) === OTHER && srvGet(VPATH) === OTHER ? 'HELD — on OTHER, what the database holds' : 'WRONG'));
    await cleanup();
  }

  if (want('rb')) {
    log('\nRB — account on v1. Tap OTHER (refused), CARD (taken), TEST (refused), settled in order. The database ends on CARD.');
    await inApp('v1');
    const ids = [OTHER, CARD, TEST];
    NET.refuse.add(OTHER); NET.refuse.add(TEST);
    const { holds, ps } = await sendHeld(ids);
    await release(ids, holds, ps, [0, 1, 2]);
    log('  settled: ' + state());
    log('  RESULT: ' + (T.id === CARD && ls.get(MIRROR) === CARD && srvGet(VPATH) === CARD ? 'HELD — on CARD, what the database holds' : 'WRONG'));
    await cleanup();
  }

  if (want('rc')) {
    log('\nRC — account on v1. Tap OTHER (refused), CARD (taken); CARD\'s answer arrives first. The database ends on CARD.');
    await inApp('v1');
    const ids = [OTHER, CARD];
    NET.refuse.add(OTHER);
    const { holds, ps } = await sendHeld(ids);
    await release(ids, holds, ps, [1, 0]);
    log('  settled: ' + state());
    log('  RESULT: ' + (T.id === CARD && ls.get(MIRROR) === CARD && srvGet(VPATH) === CARD ? 'HELD — on CARD' : 'WRONG'));
    await cleanup();
  }

  if (want('rd')) {
    log('\nRD — account on OTHER. Tap CARD (refused), then back to OTHER (refused).');
    await inApp(OTHER);
    const ids = [CARD, OTHER];
    NET.refuse.add(CARD); NET.refuse.add(OTHER);
    const { holds, ps } = await sendHeld(ids);
    await release(ids, holds, ps, [0, 1]);
    log('  settled: ' + state());
    log('  RESULT: ' + (T.id === OTHER && ls.get(MIRROR) === OTHER && srvGet(VPATH) === OTHER ? 'HELD — back on OTHER, the account\'s value' : 'WRONG'));
    await cleanup();
  }

  if (want('re')) {
    log('\nRE — account on v1. Tap OTHER (write held, refused). Tap zz-l1 (faces held). OTHER\'s refusal lands. zz-l1\'s faces then fail.');
    await inApp('v1');
    NET.refuse.add(OTHER);
    const { holds, ps } = await sendHeld([OTHER]);
    const fh = deferred(); FHOLD.set(FAM['zz-l1'], fh);
    const n0 = vibeWrites().length;
    const pL = VA.chooseVibe('zz-l1');
    await settle(3);
    NET.holds.delete(OTHER); holds[0].resolve(); await ps[0]; await settle(3);
    log('  OTHER refused, zz-l1 still loading: ' + state());
    FHOLD.delete(FAM['zz-l1']); fh.reject(new Error('stood in: faces did not load'));
    await pL; await settle(4);
    log('  zz-l1 failed: ' + state() + ', writes since=' + J(vibeWrites().slice(n0).map(w => w.value)));
    log('  RESULT: ' + (T.id === 'v1' && ls.get(MIRROR) === 'v1' && vibeWrites().length === n0 ? 'HELD — back on v1, nothing more written' : 'WRONG'));
    await cleanup();
  }

  if (want('rf')) {
    log('\nRF — account never chose (no mirror, no node). Tap OTHER, CARD, both refused.');
    await inApp(undefined);
    log('  before: mirror present=' + ls.has(MIRROR) + ' (' + J(ls.get(MIRROR)) + ')');
    const m0 = ls.has(MIRROR) ? ls.get(MIRROR) : '(absent)';
    const ids = [OTHER, CARD];
    NET.refuse.add(OTHER); NET.refuse.add(CARD);
    const { holds, ps } = await sendHeld(ids);
    await release(ids, holds, ps, [0, 1]);
    const m1 = ls.has(MIRROR) ? ls.get(MIRROR) : '(absent)';
    log('  settled: ' + state() + ', mirror before=' + J(m0) + ' after=' + J(m1));
    log('  RESULT: ' + (T.id === 'v1' && J(m0) === J(m1) ? 'HELD — v1, mirror as it was' : 'WRONG'));
    await cleanup();
  }

  if (want('rg') || want('rg1')) {
    for (const k of ['rg1', 'rg']) {
      if (!want(k)) continue;
      const ids = k === 'rg' ? [OTHER, CARD] : [OTHER];
      log('\n' + k.toUpperCase() + ' — account on v1, in the app. Tap ' + ids.join(', ') + ' (writes held). Approval is revoked (the waiting gate comes up); then the rules refuse ' + (ids.length > 1 ? 'both' : 'it') + '.');
      await inApp('v1');
      ids.forEach(id => NET.refuse.add(id));
      const { holds, ps } = await sendHeld(ids);
      log('  out: ' + state());
      await revoke();
      log('  revoked: worn=' + T.id + ', app open=' + VA.appIsOpen());
      await release(ids, holds, ps, ids.map((_, i) => i));
      log('  refused: ' + state() + ', storedVibe()=' + VA.storedVibe());
      const mirrorOk = ls.get(MIRROR) === 'v1';
      /* What the mirror is for: the next launch. Approval restored; a cold launch;
         settings/vibe's read does not reach the database this once (read() falls back to the mirror). */
      S.server.access.approved[UID] = clone(APPROVED_REC);
      await signOut(); if (V.vibe() !== 'v1') V.resetVibe();
      await coldRoot();
      const b0 = BARS.length;
      NET.getFail.add(VPATH);
      await signIn();
      await settle(3);
      const atLaunch = T.id;
      await appOpens();
      await settle(3);
      log('  next launch: worn under the native splash handover=' + atLaunch + ', first root status bars=' + J(BARS.slice(b0, b0 + 2)) +
          '; after initVibe (its read fell back to the mirror): ' + state());
      log('  RESULT: ' + (mirrorOk && T.id === 'v1' ? 'HELD — the mirror ended on the account\'s v1' :
        'WRONG — the mirror ended on ' + J(ls.get(MIRROR)) + ', a pick the database refused and never held; the next launch put it on (' + atLaunch + ') and, with that read failing, he wears ' + T.id + ' while the account holds ' + J(srvGet(VPATH))));
      await cleanup();
    }
  }

  /* ================= Class 2: revoked approval ================= */
  if (want('g1a')) {
    log('\nG1A — in the app on v1, the Vibes sheet open; tap zz-l2 via its call (faces held). Approval revoked. The faces then land.');
    await inApp('v1');
    await R.act(async () => { VS.openVibes(); }); await settle(3);
    const fh = deferred(); FHOLD.set(FAM['zz-l2'], fh);
    const n0 = vibeWrites().length, b0 = BARS.length;
    const p = VA.chooseVibe('zz-l2');
    await settle(3);
    await revoke();
    log('  revoked: worn=' + T.id + ', sheet open=' + sheetOpen());
    FHOLD.delete(FAM['zz-l2']); fh.resolve(); await p; await settle(4);
    log('  faces landed: worn=' + T.id + ', writes since=' + J(vibeWrites().slice(n0).map(w => w.value)) + ', root bars since=' + J(BARS.slice(b0).filter(b => b.id !== 'v1')));
    log('  RESULT: ' + (T.id === 'v1' && vibeWrites().length === n0 && !sheetOpen() && BARS.slice(b0).every(b => b.id === 'v1') ? 'HELD — the gate stayed v1, nothing written' : 'WRONG'));
    await cleanup();
  }

  if (want('g1b')) {
    log('\nG1B — in the app wearing OTHER. Approval revoked. Then chooseVibe(TEST), initVibe() and openVibes() asked for directly (a tap that got through; a late hub row).');
    await inApp(OTHER);
    await revoke();
    const n0 = vibeWrites().length, b0 = BARS.length;
    const r1 = await VA.chooseVibe(TEST); await settle(3);
    const r2 = await VA.initVibe(); await settle(3);
    await R.act(async () => { VS.openVibes(); }); await settle(3);
    log('  chooseVibe -> ' + r1 + ', initVibe -> ' + r2 + ', worn=' + T.id + ', sheet open=' + sheetOpen() + ', writes since=' + J(vibeWrites().slice(n0).map(w => w.value)) + ', non-v1 bars since=' + J(BARS.slice(b0).filter(b => b.id !== 'v1')));
    log('  RESULT: ' + (T.id === 'v1' && !sheetOpen() && vibeWrites().length === n0 ? 'HELD' : 'WRONG'));
    await cleanup();
  }

  if (want('g1c')) {
    log('\nG1C — in the app wearing OTHER; the Vibes sheet open, another sheet pushed over it. Approval revoked. The top sheet is then closed.');
    await inApp(OTHER);
    await R.act(async () => { VS.openVibes(); }); await settle(3);
    await R.act(async () => { SH.confirmSheet({ title: 'Probe sheet', body: 'On top of Vibes.', onConfirm() {} }); }); await settle(3);
    log('  before: top is the probe sheet=' + (R.pressables(box, 'Cancel').length > 0) + ', a card on screen=' + anyCard());
    await revoke();
    log('  revoked: worn=' + T.id + ', a sheet on screen=' + sheetOpen());
    const c = R.pressables(box, 'Cancel')[0]; if (c) await R.press(c.p);
    await settle(3);
    log('  top closed: a sheet on screen=' + sheetOpen() + ', a Vibes card on screen=' + anyCard() + ', worn=' + T.id);
    const card = cardFor('Setting test'); if (card) await R.press(card.p); await settle(3);
    log('  RESULT: ' + (!anyCard() && !sheetOpen() && T.id === 'v1' ? 'HELD — the Vibes sheet under it had closed itself' : 'WRONG — worn=' + T.id + ', sheet=' + sheetOpen()));
    await cleanup();
  }

  if (want('g1d')) {
    log('\nG1D — in the app wearing OTHER. Approval revoked, then granted again; the (app) layout mounts and opens the app. Then Vibes, tap TEST.');
    await inApp(OTHER);
    await revoke();
    const closedNow = VA.appIsOpen();
    S.server.access.approved[UID] = clone(APPROVED_REC);
    await appOpens(); await settle(3);
    log('  reopened: app open=' + VA.appIsOpen() + ' (was ' + closedNow + '), worn=' + T.id);
    await R.act(async () => { VS.openVibes(); }); await settle(3);
    const card = cardFor('Setting test'); if (card) await R.press(card.p); await settle(4);
    log('  after tap: ' + state());
    log('  RESULT: ' + (T.id === TEST && srvGet(VPATH) === TEST && !closedNow ? 'HELD — the door reopens with the layout' : 'WRONG'));
    await cleanup();
  }

  /* ================= Class 3: session ended elsewhere ================= */
  if (want('g2a')) {
    log('\nG2A — in the app wearing OTHER; the Vibes sheet open, another sheet pushed over it. The session ends (watchAuth(null)). The top sheet is then closed.');
    await inApp(OTHER);
    await R.act(async () => { VS.openVibes(); }); await settle(3);
    await R.act(async () => { SH.confirmSheet({ title: 'Probe sheet', body: 'On top of Vibes.', onConfirm() {} }); }); await settle(3);
    await signOut();
    log('  signed out: uid=' + J(STORE.uid()) + ', worn=' + T.id + ', a sheet on screen=' + sheetOpen());
    const c = R.pressables(box, 'Cancel')[0]; if (c) await R.press(c.p);
    await settle(3);
    const b0 = BARS.length, n0 = vibeWrites().length;
    const card = cardFor('Setting test'); if (card) await R.press(card.p); await settle(3);
    const asV1 = await signInAsV1();
    log('  top closed: a sheet on screen=' + sheetOpen() + ', a Vibes card=' + !!card + ', worn=' + T.id + ', non-v1 bars since=' + J(BARS.slice(b0).filter(b => b.id !== 'v1')) + ', sign-in as fresh v1=' + asV1);
    log('  RESULT: ' + (!card && !sheetOpen() && T.id === 'v1' && asV1 && vibeWrites().length === n0 ? 'HELD' : 'WRONG'));
    await cleanup();
  }

  if (want('g2b')) {
    log('\nG2B — in the app on v1, the Vibes sheet open; a pick of zz-l3 (faces held). The session ends. The faces then land.');
    await inApp('v1');
    await R.act(async () => { VS.openVibes(); }); await settle(3);
    const fh = deferred(); FHOLD.set(FAM['zz-l3'], fh);
    const n0 = vibeWrites().length;
    const p = VA.chooseVibe('zz-l3'); await settle(3);
    await signOut();
    const b0 = BARS.length;
    FHOLD.delete(FAM['zz-l3']); fh.resolve(); await p; await settle(4);
    const asV1 = await signInAsV1();
    log('  faces landed: worn=' + T.id + ', sheet open=' + sheetOpen() + ', writes since=' + J(vibeWrites().slice(n0).map(w => w.value)) + ', non-v1 bars=' + J(BARS.slice(b0).filter(b => b.id !== 'v1')) + ', sign-in as fresh v1=' + asV1);
    log('  RESULT: ' + (T.id === 'v1' && !sheetOpen() && asV1 && vibeWrites().length === n0 ? 'HELD' : 'WRONG'));
    await cleanup();
  }

  if (want('g2c')) {
    log('\nG2C — in the app on v1. Tap OTHER (write held). The session ends. The write is then refused.');
    await inApp('v1');
    NET.refuse.add(OTHER);
    const { holds, ps } = await sendHeld([OTHER]);
    await signOut();
    const b0 = BARS.length;
    NET.holds.delete(OTHER); holds[0].resolve(); await ps[0]; await settle(4);
    const asV1 = await signInAsV1();
    log('  refused after sign-out: worn=' + T.id + ', non-v1 bars=' + J(BARS.slice(b0).filter(b => b.id !== 'v1')) + ', sign-in as fresh v1=' + asV1);
    log('  RESULT: ' + (T.id === 'v1' && asV1 ? 'HELD' : 'WRONG'));
    await cleanup();
  }

  if (want('g2d')) {
    log('\nG2D — in the app on v1. A pick of zz-l4 (faces held). Signed out, then straight back in (live) and the app opens on v1. Then the faces land.');
    await inApp('v1');
    const fh = deferred(); FHOLD.set(FAM['zz-l4'], fh);
    const n0 = vibeWrites().length;
    const p = VA.chooseVibe('zz-l4'); await settle(3);
    await signOut();
    await signIn(); await appOpens(); await settle(3);
    log('  back in: worn=' + T.id + ', app open=' + VA.appIsOpen());
    FHOLD.delete(FAM['zz-l4']); fh.resolve(); await p; await settle(4);
    log('  faces landed: ' + state() + ', writes since=' + J(vibeWrites().slice(n0).map(w => w.value)));
    log('  RESULT: ' + (T.id === 'v1' && vibeWrites().length === n0 ? 'HELD — the old session\'s pick neither went on nor was written' : 'WRONG'));
    await cleanup();
  }

  /* ================= Class 4: live sign-in ================= */
  if (want('fl2')) {
    log('\nFL2 — signed out, sign-in on screen. Mirror and database hold zz-f1, whose faces fail. A live sign-in (real scheduling), then the (app) layout\'s part.');
    await signOut();
    ls.set(MIRROR, 'zz-f1'); S.server.users[UID].settings = { vibe: 'zz-f1' };
    FAIL.add(FAM['zz-f1']);
    const b0 = BARS.length, e0 = ERRORS.length;
    const realErr = console.error; console.error = () => {};
    A.cb({ uid: UID, email: 'dev@example.com' });
    for (let i = 0; i < 60; i++) await new Promise(r => setTimeout(r, 0));
    console.error = realErr;
    await appOpens(); await settle(4);
    const seq = BARS.slice(b0);
    log('  root bars since sign-in: ' + J(seq.slice(0, 4)) + ' … ' + seq.length + ' in all; non-v1=' + J(seq.filter(b => b.id !== 'v1')) + '; worn=' + T.id + ', errors=' + J(ERRORS.slice(e0)));
    log('  RESULT: ' + (T.id === 'v1' && seq.every(b => b.id === 'v1') && ERRORS.length === e0 ? 'HELD — v1 throughout, nothing thrown' : 'WRONG'));
    await cleanup();
  }

  if (want('fl3')) {
    log('\nFL3 — signed out, sign-in on screen. Mirror and database hold zz-l5 (faces held). A live sign-in; the (app) layout asks initVibe; signed out before the faces land.');
    await signOut();
    ls.set(MIRROR, 'zz-l5'); S.server.users[UID].settings = { vibe: 'zz-l5' };
    const fh = deferred(); FHOLD.set(FAM['zz-l5'], fh);
    const b0 = BARS.length;
    await signIn(); await settle(3);
    VA.appOpened(); const pi = VA.initVibe(); await settle(3);
    log('  signed in, faces loading: worn=' + T.id);
    await signOut();
    FHOLD.delete(FAM['zz-l5']); fh.resolve(); await pi; await settle(4);
    const asV1 = await signInAsV1();
    log('  faces landed after sign-out: worn=' + T.id + ', non-v1 bars=' + J(BARS.slice(b0).filter(b => b.id !== 'v1')) + ', sign-in as fresh v1=' + asV1);
    log('  RESULT: ' + (T.id === 'v1' && asV1 && BARS.slice(b0).every(b => b.id === 'v1') ? 'HELD' : 'WRONG'));
    await cleanup();
  }

  if (want('fl4')) {
    log('\nFL4 — a cold launch (native splash held): mirror and database hold zz-f2, whose faces fail.');
    await signOut(); if (V.vibe() !== 'v1') V.resetVibe();
    ls.set(MIRROR, 'zz-f2'); S.server.users[UID].settings = { vibe: 'zz-f2' };
    FAIL.add(FAM['zz-f2']);
    await coldRoot();
    const h0 = HIDES.length, e0 = ERRORS.length, b0 = BARS.length;
    await signIn(); await settle(4);
    log('  launched: splash handed over=' + (HIDES.length > h0) + ' (in ' + J(HIDES.slice(h0)) + '), worn=' + T.id + ', user set=' + J(BARS.slice(b0).map(b => b.user)));
    await appOpens(); await settle(4);
    log('  after initVibe: worn=' + T.id + ', errors=' + J(ERRORS.slice(e0)));
    log('  RESULT: ' + (HIDES.length > h0 && T.id === 'v1' && ERRORS.length === e0 ? 'HELD — the launch finished in v1' : 'WRONG'));
    await cleanup();
  }

  if (want('fl5')) {
    log('\nFL5 — signed out, sign-in on screen. The account is NOT approved; its mirror holds TEST. A live sign-in (real scheduling) lands on the waiting gate.');
    await signOut();
    delete S.server.access.approved[UID];
    ls.set(MIRROR, TEST); S.server.users[UID].settings = { vibe: TEST };
    const b0 = BARS.length;
    const realErr = console.error; console.error = () => {};
    A.cb({ uid: UID, email: 'dev@example.com' });
    for (let i = 0; i < 60; i++) await new Promise(r => setTimeout(r, 0));
    console.error = realErr;
    await settle(3);
    const seq = BARS.slice(b0);
    log('  root bars since sign-in: ' + seq.length + ', non-v1=' + J(seq.filter(b => b.id !== 'v1')) + ', worn=' + T.id + ', app open=' + VA.appIsOpen());
    log('  RESULT: ' + (T.id === 'v1' && seq.every(b => b.id === 'v1') && !VA.appIsOpen() ? 'HELD — the gate is v1' : 'WRONG'));
    await cleanup();
  }
  if (ERRORS.length) log('\nerrors: ' + ERRORS.slice(0, 3).join(' | '));
} catch (e) {
  log('PROBE RUN FAILED: ' + msg(e) + '\n' + String(e && e.stack).split('\n').slice(1, 6).join('\n'));
}
console.log(out.join('\n'));
process.exit(0);
