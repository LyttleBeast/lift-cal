#!/usr/bin/env node
/* rv2-snat-probe — adversarial reviewer's probes of Phase S (native), round 2.
 * Scaffold copied from <tree>/tools/verify-vibe-setting.mjs (same stand-ins),
 * then its own probes. Read-only against the tree; nothing is written into it.
 *
 * Run:  node rv2-snat-probe.mjs <tree> [probe...]
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

if (process.env.TZ !== ZONE || process.env.RV2_SNAT_CHILD !== '1') {
  const r = spawnSync(process.execPath, [SELF, ...process.argv.slice(2)], { env: { ...process.env, TZ: ZONE, RV2_SNAT_CHILD: '1' }, stdio: 'inherit' });
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
const BARS = [];
R0.override(r => r === 'expo-status-bar', { __esModule: true, StatusBar: p => { BARS.push({ style: p.style, id: T && T.id }); return null; } });
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

const tick = () => R.act(async () => { await new Promise(r => setTimeout(r, 0)); });
const until = async (pred, what, n = 300) => { for (let i = 0; i < n; i++) { if (pred()) return true; await tick(); } throw new Error('never reached: ' + what); };
const settle = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };
const vibeWrites = () => NET.sent.filter(s => s.path === VPATH);

const box = doc.createElement('div'); doc.body.appendChild(box);
const ERRORS = [];
const root = createRoot(box, { onCaughtError: e => ERRORS.push(msg(e)), onUncaughtError: e => ERRORS.push(msg(e)), onRecoverableError: () => {} });
const RootLayout = R.load('app/_layout.jsx').default;
const signIn = async () => { await R.act(async () => { await A.cb({ uid: UID, email: 'dev@example.com' }); }); };
const signOut = async () => { await R.act(async () => { await A.cb(null); }); await tick(); };
const toV1 = async () => { if (V.vibe() !== 'v1') await R.act(async () => { await VA.chooseVibe('v1'); }); };

try {
  STORE.watchAuth(() => {});
  await R.act(async () => { root.render(h(RootLayout)); });
  await tick();
  ls.set(MIRROR, 'v1');
  S.server.users[UID].settings = { vibe: 'v1' };
  await signIn();
  await until(() => BARS.length > 0 && V.vibe() === 'v1' && NET.watchers.has('access/approved/' + UID), 'signed in on v1, in the app');
  await settle(3);

  /* ---------- S1: a late refusal of pick A undoes pick B while B's faces load ---------- */
  if (want('s1')) {
    log('\nS1 — tap OTHER (on at once, its write held then refused), then tap CARD (faces loading); the refusal lands first');
    V.markFacesRegistered(DEF[OTHER].face.keys);      // OTHER goes on without a load
    const n0 = vibeWrites().length;
    const wHold = deferred(); NET.holds.set(OTHER, wHold); NET.refuse.add(OTHER);
    const pA = VA.chooseVibe(OTHER);
    await until(() => vibeWrites().length > n0, 'OTHER written (held)');
    log('  after tap OTHER: worn=' + T.id + ', written=' + JSON.stringify(vibeWrites().slice(n0).map(w => w.value)));
    HOLD = deferred();
    const pB = VA.chooseVibe(CARD);                     // his LAST tap
    await until(() => LOADS.some(l => l.keys.includes('Cardx_400')), 'CARD faces asked');
    log('  after tap CARD (faces loading): worn=' + T.id);
    NET.holds.delete(OTHER); wHold.resolve();           // OTHER refused now
    const rA = await pA;
    log('  OTHER refused: chooseVibe(OTHER) resolved to ' + rA + ', worn=' + T.id + ', mirror=' + JSON.stringify(ls.get(MIRROR)));
    const hd = HOLD; HOLD = null; hd.resolve();          // CARD's faces land
    const rB = await pB;
    await settle(3);
    const ws = vibeWrites().slice(n0).map(w => w.value);
    log('  CARD faces landed: chooseVibe(CARD) resolved to ' + rB + ', worn=' + T.id + ', written since=' + JSON.stringify(ws) + ', database=' + JSON.stringify(srvGet(VPATH)));
    log('  RESULT: ' + (T.id !== CARD && !ws.includes(CARD)
      ? 'his LAST tap (CARD) was dropped by the late refusal of OTHER — never worn, never written'
      : 'last tap won (CARD worn/written)'));
    NET.refuse.delete(OTHER);
    await toV1();
  }

  /* ---------- S2: sign-out while a sheet pick's faces load ---------- */
  if (want('s2')) {
    log('\nS2 — chooseVibe(TEST) (faces loading), then sign-out before they land');
    const n0 = vibeWrites().length;
    HOLD = deferred();
    const p = VA.chooseVibe(TEST);
    await until(() => LOADS.some(l => l.keys.includes('Setx_400')), 'TEST faces asked');
    await signOut();
    log('  signed out, faces still loading: worn=' + T.id + ', store uid=' + JSON.stringify(STORE.uid && STORE.uid()));
    const hd = HOLD; HOLD = null; hd.resolve();
    const r = await p;
    await settle(4);
    log('  faces landed: chooseVibe resolved to ' + r + ', worn=' + T.id + ', written since=' + JSON.stringify(vibeWrites().slice(n0).map(w => w.value)));
    // Sign-in, drawn now, against sign-in drawn in a fresh v1 T.
    const SignIn = R.load('app/(auth)/sign-in.jsx').default;
    const drawSignIn = async () => {
      const b = doc.createElement('div'); doc.body.appendChild(b);
      const r2 = createRoot(b, { onCaughtError() {}, onUncaughtError() {}, onRecoverableError() {} });
      await R.act(async () => { r2.render(h(SignIn)); });
      const d = dump(R, b);
      await R.act(async () => { r2.unmount(); });
      return d;
    };
    const now = await drawSignIn();
    const saved = { ...T };
    THEME.applyTheme(THEME.build(V1));
    const fresh = await drawSignIn();
    Object.assign(T, saved);
    const differ = now.map(canon).join('\n') !== fresh.map(canon).join('\n');
    const lastBar = BARS[BARS.length - 1];
    log('  sign-in screen: ' + now.length + ' hosts, ground ' + (now[0] && now[0].s && now[0].s.backgroundColor) + ' (v1 ' + V1T.colors.rack + ')' +
        '; last root status bar drawn: ' + JSON.stringify(lastBar) + '; differs from v1 sign-in: ' + differ);
    log('  RESULT: ' + (T.id !== 'v1' ? 'the signed-out device wears ' + T.id + ' — sign-in is not v1' : 'v1 held'));
    V.resetVibe();
    ls.set(MIRROR, 'v1');
    S.server.users[UID].settings = { vibe: 'v1' };
    await signIn();
    await until(() => NET.watchers.has('access/approved/' + UID) && V.vibe() === 'v1', 'back in on v1');
    await settle(3);
  }

  /* ---------- S3: approval revoked while initVibe's read is out ---------- */
  if (want('s3')) {
    log('\nS3 — initVibe() (the (app) boot call) with its read held; approval revoked; then the read answers ' + TEST);
    S.server.users[UID].settings = { vibe: TEST };
    const gHold = deferred(); NET.getHolds.set(VPATH, gHold);
    const p = VA.initVibe();
    await settle(2);
    delete S.server.access.approved[UID];
    await R.act(async () => { deliver('access/approved/' + UID); });
    await settle(2);
    log('  revoked (the waiting gate is up): worn=' + T.id);
    const b0 = BARS.length;
    NET.getHolds.delete(VPATH); gHold.resolve();
    const r = await p;
    await settle(4);
    log('  the read answered: initVibe resolved to ' + r + ', worn=' + T.id + '; status bars drawn since: ' + JSON.stringify(BARS.slice(b0)));
    log('  RESULT: ' + (T.id !== 'v1' ? 'the gate (approval revoked) wears ' + T.id + ' — not v1' : 'v1 held'));
    S.server.access.approved[UID] = clone(APPROVED_REC);
    V.resetVibe();
  }
  if (ERRORS.length) log('\nerrors: ' + ERRORS.slice(0, 3).join(' | '));
} catch (e) {
  log('PROBE RUN FAILED: ' + msg(e) + '\n' + String(e && e.stack).split('\n').slice(1, 6).join('\n'));
}
console.log(out.join('\n'));
process.exit(0);
