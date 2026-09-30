#!/usr/bin/env node
/* rv-snat-probe — adversarial reviewer's probes of Phase S (native), round 1.
 * Scaffold copied from <tree>/tools/verify-vibe-setting.mjs (same stand-ins),
 * then four probes. Read-only against the tree; nothing is written into it.
 *
 * Run:  node rv-snat-probe.mjs <tree>
 */
import { spawnSync } from 'node:child_process';
import { join, resolve as pathResolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const SELF = fileURLToPath(import.meta.url);
const ROOT = pathResolve(process.argv[2] || '/Users/micahflunker/dev/vibes-night/wt/nat-settings');
const SNAP = await import(pathToFileURL(join(ROOT, 'tools/lib/vibe-snap.mjs')).href);
const { ZONE, freeze, open, dump, canon } = SNAP;

if (process.env.TZ !== ZONE || process.env.RV_SNAT_CHILD !== '1') {
  const r = spawnSync(process.execPath, [SELF, ...process.argv.slice(2)], { env: { ...process.env, TZ: ZONE, RV_SNAT_CHILD: '1' }, stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
}

const out = [];
const log = t => out.push(t);
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
  { id: CARD, name: 'Card test', feel: 'Its numeral face will fail to load.', experimental: false, scheme: 'dark' }
];
const IDS = EXTRA.map(v => v.id);
R0.override((request, file) => !!file && file === join(ROOT, 'src/pure/vibes/defs/index.js'), {
  ...INDEX,
  normVibe: x => (IDS.includes(x) ? x : INDEX.normVibe(x)),
  list: () => [...INDEX.list(), ...EXTRA.map(v => ({ ...v }))]
});

let H = null, T = null;
const NET = { sent: [], watchers: new Map() };
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
R0.override(r => r === 'firebase/database', {
  __esModule: true,
  ref: (_db, path) => ({ path: path || '' }),
  get: async r => { const v = srvGet(r.path); return { exists: () => v !== null && v !== undefined, val: () => v }; },
  set: async (r, v) => { NET.sent.push({ path: r.path, value: clone(v), wearing: T && T.id }); srvSet(r.path, v); },
  update: async () => {}, remove: async () => {},
  onValue: (r, cb) => {
    NET.watchers.set(r.path, cb);
    queueMicrotask(() => { const v = srvGet(r.path); cb({ exists: () => v !== null, val: () => v }); });
    return () => { if (NET.watchers.get(r.path) === cb) NET.watchers.delete(r.path); };
  },
  goOnline: () => {}, goOffline: () => {}
});
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
let FAIL_KEY = null;          // a face key whose load rejects
FONT.loadAsync = map => {
  const keys = Object.keys(map).sort();
  LOADS.push({ keys, wearing: T && T.id });
  if (FAIL_KEY && keys.includes(FAIL_KEY)) return Promise.reject(new Error('probe: ' + FAIL_KEY + ' failed to load'));
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
const TT = Object.fromEntries(Object.keys(DEF).map(id => [id, THEME.build(DEF[id], { images: {} })]));
TT.v1 = V1T;

const tick = () => R.act(async () => { await new Promise(r => setTimeout(r, 0)); });
const until = async (pred, what, n = 300) => { for (let i = 0; i < n; i++) { if (pred()) return true; await tick(); } throw new Error('never reached: ' + what); };
const vibeWrites = () => NET.sent.filter(s => s.path === VPATH);

const box = doc.createElement('div'); doc.body.appendChild(box);
const ERRORS = [];
const root = createRoot(box, { onCaughtError: e => ERRORS.push(msg(e)), onUncaughtError: e => ERRORS.push(msg(e)), onRecoverableError: () => {} });
const RootLayout = R.load('app/_layout.jsx').default;
const signIn = async () => { await R.act(async () => { await A.cb({ uid: UID, email: 'dev@example.com' }); }); };
const signOut = async () => { await R.act(async () => { await A.cb(null); }); await tick(); };
const renderAlone = async Comp => {
  const b = doc.createElement('div'); doc.body.appendChild(b);
  const r = createRoot(b, { onCaughtError() {}, onUncaughtError() {}, onRecoverableError() {} });
  await R.act(async () => { r.render(h(Comp)); });
  const d = dump(R, b);
  await R.act(async () => { r.unmount(); });
  return d;
};

try {
  STORE.watchAuth(() => {});
  await R.act(async () => { root.render(h(RootLayout)); });
  await tick();

  /* ---------- PROBE 1: the JS splash (src/ui/Splash.jsx) after watchAuth ---------- */
  log('\nPROBE 1 — the JS splash (src/ui/Splash.jsx, drawn by (app)/_layout while phase is checking/booting)');
  {
    ls.set(MIRROR, BOOT);
    S.server.users[UID].settings = { vibe: BOOT };
    await signIn();
    await until(() => HIDES.length > 0, 'splash handed over');
    await tick();
    const Splash = R.load('src/ui/Splash.jsx').default;
    const d = await renderAlone(Splash);
    const ground = d[0] && d[0].s && d[0].s.backgroundColor;
    const plates = d.filter(e => e.t === 'View' && e.s && e.s.width === 7 && e.s.height === 40).map(e => e.s.backgroundColor);
    log('  worn after watchAuth, before any (app) boot: ' + T.id);
    log('  Splash ground: ' + ground + '   (v1 ' + V1T.colors.rack + ', ' + BOOT + ' ' + TT[BOOT].colors.rack + ')');
    log('  Splash plates: ' + JSON.stringify(plates) + '   (v1 mark ' + JSON.stringify(V1T.mark) + ')');
    log('  RESULT: JS splash is ' + (ground === V1T.colors.rack ? 'v1' : 'NOT v1 (wears ' + T.id + ')'));
    await signOut();
  }

  /* ---------- PROBE 2: a card numeral face that fails to load ---------- */
  log('\nPROBE 2 — the Vibes sheet when one vibe\'s card numeral face fails to load');
  {
    ls.set(MIRROR, 'v1');
    S.server.users[UID].settings = { vibe: 'v1' };
    await signIn();
    await until(() => BARS.length > 0 && V.vibe() === 'v1', 'signed in on v1');
    const VS = R.load('src/ui/settings/vibes.jsx');
    FAIL_KEY = 'Cardx_800';
    LOADS.length = 0;
    await R.act(async () => { VS.openVibes(); });
    const sheetNums = () => dump(R, box).filter(e => e.t === 'Text' && e.x === '315');
    await until(() => { const n = sheetNums(); return n.length === 5 && n.every(x => x.s.opacity === 1); }, 'numerals shown');
    const nums = sheetNums();
    log('  picker-face loads asked: ' + JSON.stringify(LOADS.map(l => l.keys)));
    nums.forEach((n, i) => log('  card ' + i + ' numeral: fontFamily=' + n.s.fontFamily + ' opacity=' + n.s.opacity + ' color=' + n.s.color));
    const cardNum = nums[4];
    log('  ' + CARD + ' own face would be ' + TT[CARD].loadNum(35).fontFamily + '; drawn in ' + cardNum.s.fontFamily + ' at opacity ' + cardNum.s.opacity);
    log('  RESULT: ' + (cardNum.s.opacity === 1 && cardNum.s.fontFamily !== TT[CARD].loadNum(35).fontFamily
      ? 'the failed card\'s "315" is DRAWN, visible, in another vibe\'s face (' + cardNum.s.fontFamily + ')'
      : 'numeral hidden or in its own face'));
    FAIL_KEY = null;

    /* ---------- PROBE 3: rapid taps — pick A, then tap the (still-marked) current card ---------- */
    log('\nPROBE 3 — rapid taps: tap "Setting test", then tap v1 (still ringed) while its faces load');
    const n0 = vibeWrites().length;
    HOLD = deferred();
    const cardFor = re => R.pressables(box, re).find(p => R.styleOf(p.p).minHeight === 112);
    await R.press(cardFor(/^Setting test/).p);
    await until(() => LOADS.some(l => l.keys.includes('Setx_400')), 'Setx faces asked');
    const v1Card = cardFor(/^v1/);
    log('  while loading: worn=' + T.id + ', v1 card selected=' + !!(v1Card.p.accessibilityState && v1Card.p.accessibilityState.selected));
    await R.press(v1Card.p);                     // his last tap: v1
    const direct = await VA.chooseVibe('v1');    // and the same through the API
    log('  chooseVibe(\'v1\') during the load resolved at once to: ' + direct);
    const hd = HOLD; HOLD = null; hd.resolve();
    await until(() => T.id === TEST || vibeWrites().length > n0, 'settle', 50).catch(() => {});
    for (let i = 0; i < 5; i++) await tick();
    const ws = vibeWrites().slice(n0).map(w => w.value);
    log('  after the faces land: worn=' + T.id + ', written since=' + JSON.stringify(ws) + ', database=' + JSON.stringify(srvGet(VPATH)));
    log('  RESULT: ' + (T.id === TEST ? 'the EARLIER tap won — his last tap (v1) was dropped; ' + TEST + ' is worn and written' : 'last tap won'));
    await R.act(async () => { await VA.chooseVibe('v1'); });
    await signOut();
  }

  /* ---------- PROBE 4: sign-out while watchAuth waits on the stored vibe's faces ---------- */
  log('\nPROBE 4 — auth goes null while watchAuth awaits the stored vibe\'s faces');
  {
    ls.set(MIRROR, OTHER);
    S.server.users[UID].settings = { vibe: OTHER };
    BARS.length = 0;
    HOLD = deferred();
    const pIn = R.act(async () => { A.cb({ uid: UID, email: 'dev@example.com' }); });
    await pIn;
    await until(() => LOADS.some(l => l.keys.includes('Otherx_400')), 'Otherx faces asked');
    await signOut();
    log('  after sign-out, before the faces land: worn=' + T.id);
    const hd = HOLD; HOLD = null; hd.resolve();
    for (let i = 0; i < 8; i++) await tick();
    log('  after the faces land: worn=' + T.id + ' (store UID=' + JSON.stringify(STORE.uid()) + ')');
    log('  RESULT: ' + (T.id !== 'v1' ? 'a signed-out device now wears ' + T.id + ' (the stale callback also calls setUser(u) — pre-existing race at accessState)' : 'v1 held'));
  }
  if (ERRORS.length) log('\nerrors: ' + ERRORS.slice(0, 3).join(' | '));
} catch (e) {
  log('PROBE RUN FAILED: ' + msg(e) + '\n' + String(e && e.stack).split('\n').slice(1, 6).join('\n'));
}
console.log(out.join('\n'));
process.exit(0);
