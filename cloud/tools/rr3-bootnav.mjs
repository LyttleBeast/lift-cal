#!/usr/bin/env node
/* Round-3 Pnat reviewer (runtime lens): boot the REAL app of one tree under a
 * small expo-router model (the same model tools/verify-vibe-switch.mjs uses),
 * then drive it the way a v1 user does — boot, the five tabs, a live session,
 * a set ticked, a set's type cycled, the keyboard up, a toast, the Settings
 * sheet, sign-out and sign-in again — and write down, per step, what the host
 * props cannot show on their own:
 *   - how many times the root layout and the (app) layout rendered,
 *   - every router.replace, every (app)/root navigator mount and pathname set,
 *   - every recorded native call (haptics, audio, splash, fonts,
 *     LayoutAnimation, announcements) from vibe-snap,
 *   - React's console.error noise (key warnings, updates during render …),
 *   - the full host dump, via the proof's vibe-snap.
 * Usage: node rr3-bootnav.mjs <tree> <out.json>
 * Read-only on the tree; writes only <out.json>.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, resolve as pathResolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const SELF = fileURLToPath(import.meta.url);
const argv = process.argv.slice(2);
const ROOT = pathResolve(argv[0]);
const OUT = pathResolve(argv[1]);
const ZONE = 'America/New_York';
if (process.env.TZ !== ZONE || process.env.RR3_CHILD !== '1') {
  const r = spawnSync(process.execPath, [SELF, ...argv], { env: { ...process.env, TZ: ZONE, RR3_CHILD: '1' }, stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
}

const PROOF = '/Users/micahflunker/dev/vibes-night/wt/nat-proof/tools/lib';
const SNAP = await import(pathToFileURL(join(PROOF, 'vibe-snap.mjs')).href);
const { NOW, open, dump, vhost, canon, fingerprint, takeCalls, keyboard } = SNAP;
const { seedServer } = await import(pathToFileURL(join(PROOF, 'vibe-seed.mjs')).href);

const msg = e => String((e && e.message) || e).split('\n')[0].slice(0, 300);
const H = await open(ROOT);
const { R, S, A, UID, NAVS, TOAST_REAL } = H;
const { React, h } = R;
const doc = globalThis.document;
const { createRoot } = H.req('react-dom/client');
const OWNER_UID = R.load('src/data/firebase-config.js').OWNER_UID;

/* ---- the small router, as verify-vibe-switch models expo-router ---- */
const appReq = createRequire(join(ROOT, 'app/_layout.jsx'));
const ER = appReq('expo-router');
const NAV_SUBS = new Set();
const PATHS = [];
const setPath = p => { NAVS.path = p; NAVS.focus = p.split('/')[1] || 'you'; PATHS.push(p); NAV_SUBS.forEach(f => f()); };
const usePath = () => React.useSyncExternalStore(f => { NAV_SUBS.add(f); return () => { NAV_SUBS.delete(f); }; }, () => NAVS.path);
const REPLACES = [], NAVIGATES = [];
ER.router.replace = p => { REPLACES.push(p); setPath(p); };
ER.router.navigate = p => { NAVIGATES.push(p); setPath(p); };
ER.usePathname = usePath;

const SCREEN_FILES = {
  '/you': 'app/(app)/(tabs)/you/index.jsx', '/workout': 'app/(app)/(tabs)/workout/index.jsx',
  '/workout/session': 'app/(app)/(tabs)/workout/session.jsx', '/food': 'app/(app)/(tabs)/food.jsx',
  '/weight': 'app/(app)/(tabs)/weight.jsx', '/steps': 'app/(app)/(tabs)/steps.jsx'
};
const def = rel => R.load(rel).default;
const MOUNTS = { root: 0, app: 0 };
const RENDERS = { root: 0, appLayout: 0 };
function RootCounted(p) { RENDERS.root++; return def('app/_layout.jsx')(p); }
function AppLayoutCounted(p) { RENDERS.appLayout++; return def('app/(app)/_layout.jsx')(p); }
const StackHost = vhost('Stack');
const Screen = ER.Stack.Screen, Protected = ER.Stack.Protected;
const screensOf = kids => {
  const found = [];
  React.Children.forEach(kids, c => {
    if (!c) return;
    if (c.type === Protected) React.Children.forEach(c.props.children, s => { if (s && s.type === Screen) found.push({ name: s.props.name, open: !!c.props.guard }); });
    else if (c.type === Screen) found.push({ name: c.props.name, open: true });
  });
  return found;
};
function TabsArea({ path }) {
  const file = SCREEN_FILES[path];
  return h(React.Fragment, null, h(def('app/(app)/(tabs)/_layout.jsx')), file ? h(def(file), { key: path }) : null);
}
const Static = React.memo(p => p.children, (a, b) => a.route === b.route);
function RouterStack(p) {
  const screens = screensOf(p.children);
  const open1 = n => screens.some(s => s.name === n && s.open);
  const level = screens.some(s => s.name === '(app)') ? 'root' : screens.some(s => s.name === '(tabs)') ? 'app' : 'other';
  const path = usePath();
  React.useLayoutEffect(() => {
    MOUNTS[level] = (MOUNTS[level] || 0) + 1;
    if (level === 'app') setPath('/');
  }, []);
  let screen = null;
  if (level === 'root' && open1('(app)')) screen = h(AppLayoutCounted);
  if (level === 'root' && open1('(auth)')) screen = h(def('app/(auth)/sign-in.jsx'));
  if (level === 'app') screen = path === '/' ? h(def('app/(app)/index.jsx')) : open1('(tabs)') ? h(TabsArea, { path }) : null;
  return h(StackHost, { ...p, children: undefined }, p.children,
           screen && h(Static, { route: level === 'app' ? path : level }, screen));
}
RouterStack.Screen = Screen;
RouterStack.Protected = Protected;
ER.Stack = RouterStack;

/* ---- the app ---- */
S.server = seedServer(UID, OWNER_UID, NOW);
R.load('app/_layout.jsx');
R.load('app/(app)/_layout.jsx');
const STORE = R.load('src/data/store.js');
STORE.watchAuth(() => {});
await A.cb({ uid: UID, email: 'dev@example.com' });
const W = R.load('src/state/workout.js');
const REST = R.load('src/ui/train/rest.js');
const SETTINGS = R.load('src/ui/settings/index.jsx');
let VIBE = null;
try { VIBE = R.load('src/state/vibe.js'); } catch { VIBE = null; }

const box = doc.createElement('div'); doc.body.appendChild(box);
const ERRORS = [];
const root = createRoot(box, { onCaughtError: e => ERRORS.push('caught: ' + msg(e)), onUncaughtError: e => ERRORS.push('uncaught: ' + msg(e)), onRecoverableError: () => {} });
const tick = () => R.act(async () => { await new Promise(r => setTimeout(r, 0)); });
const settle = async () => {
  let prev = null;
  for (let i = 0; i < 60; i++) { await tick(); const fp = fingerprint(box); if (fp === prev) return true; prev = fp; }
  return false;
};
const until = async (pred, what) => {
  for (let i = 0; i < 300; i++) { if (pred()) return true; await tick(); }
  throw new Error('never reached: ' + what);
};
const renumber = d => {
  const ids = new Map();
  const fix = s => s.replace(/wclipr[0-9a-v]+/g, m => { if (!ids.has(m)) ids.set(m, 'wclip$' + (ids.size + 1)); return ids.get(m); });
  const walk = v => (typeof v === 'string' ? fix(v) : Array.isArray(v) ? v.map(walk) :
    v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).map(k => [k, walk(v[k])])) : v);
  return d.map(walk);
};

const STEPS = [];
let mark = { root: 0, appLayout: 0, rep: 0, nav: 0, paths: 0, mounts: { ...MOUNTS }, errs: 0, rerrs: 0 };
function record(name, extra) {
  const d = renumber(dump(R, box));
  STEPS.push({
    name,
    renders: { root: RENDERS.root - mark.root, appLayout: RENDERS.appLayout - mark.appLayout },
    replaces: REPLACES.slice(mark.rep), navigates: NAVIGATES.slice(mark.nav), paths: PATHS.slice(mark.paths),
    mounts: { root: MOUNTS.root - mark.mounts.root, app: MOUNTS.app - mark.mounts.app },
    calls: takeCalls(),
    reactErrors: R.ERRS.slice(mark.rerrs),
    errors: ERRORS.slice(mark.errs),
    path: NAVS.path,
    vibeVersion: VIBE ? VIBE.getVersion() : null,
    hosts: d.length,
    dump: d,
    ...(extra || {})
  });
  mark = { root: RENDERS.root, appLayout: RENDERS.appLayout, rep: REPLACES.length, nav: NAVIGATES.length, paths: PATHS.length,
           mounts: { ...MOUNTS }, errs: ERRORS.length, rerrs: R.ERRS.length };
}
const step = async (name, fn, extra) => {
  try { await fn(); } catch (e) { ERRORS.push('step threw: ' + msg(e)); }
  await settle();
  record(name, extra);
};

takeCalls();
await step('boot', async () => {
  await R.act(async () => { root.render(h(RootCounted)); });
  await R.act(async () => { await A.cb({ uid: UID, email: 'dev@example.com' }); });
  await until(() => NAVS.path === '/you', 'the You tab');
});
for (const p of ['/food', '/weight', '/workout', '/steps', '/you']) {
  await step('tab ' + p, async () => { await R.act(async () => { setPath(p); }); });
}
const EX = (name, group, equipment, sets, extra) => ({ exId: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name, group, equipment, sets, ...extra });
const set = (w, r, type, done, more) => ({ w, r, type, done, ...more });
await step('session started', async () => {
  await R.act(async () => {
    W.startWorkout(W.withKeys({ name: 'Push day', exercises: [
      EX('Barbell Bench Press', 'chest', 'barbell', [set('95', '10', 'W', true), set('185', '8', 'N', true, { rir: 2 }),
        set('185', '8', 'D', true), set('135', '6', 'D', true, { dp: 1 }), set('185', '8', 'N', false)]),
      EX('Front Squat', 'legs', 'barbell', [set('225', '5', 'N', true), set('', '', 'N', false)], { block: 1 }),
      EX('Pull-Up', 'back', 'bodyweight', [set('', '8', 'N', true)], { block: 1 })
    ] }));
    ER.router.replace('/workout/session');
  });
});
await step('set ticked', async () => {
  const ps = R.pressables(box, 'Mark set complete');
  if (!ps.length) throw new Error('no incomplete set to tick');
  await R.press(ps[0].p);
}, { resting: REST.isResting() });
await step('set type cycled', async () => {
  const ps = R.pressables(box, /^Set \d|set type|Set type|Warm-up|Normal|Failure|Drop/);
  if (!ps.length) throw new Error('no set type badge found');
  await R.press(ps[ps.length - 1].p);
});
await step('keyboard up', async () => {
  await R.act(async () => { keyboard('keyboardWillShow', { endCoordinates: { height: 336, screenY: 844 - 336, width: 390, screenX: 0 } }); });
});
await step('keyboard down', async () => {
  await R.act(async () => { keyboard('keyboardWillHide', { endCoordinates: { height: 0, screenY: 844, width: 390, screenX: 0 } }); });
});
await step('toast', async () => { await R.act(async () => { TOAST_REAL.toast('Saved.'); }); });
await step('settings sheet', async () => { await R.act(async () => { SETTINGS.openSettings(() => {}); }); });
await step('back to Train', async () => { await R.act(async () => { setPath('/workout'); }); });
await step('signed out', async () => { await R.act(async () => { await A.cb(null); }); });
await step('signed in again', async () => {
  await R.act(async () => { await A.cb({ uid: UID, email: 'dev@example.com' }); });
  await until(() => MOUNTS.app >= 2, 'the (app) group again');
});

writeFileSync(OUT, JSON.stringify({ root: ROOT, totals: { ...RENDERS, replaces: REPLACES, navigates: NAVIGATES, mounts: MOUNTS }, steps: STEPS }, null, 1));
console.log('rr3-bootnav: ' + ROOT + ' -> ' + OUT);
for (const s of STEPS) {
  console.log('  ' + s.name.padEnd(18) + ' renders root ' + s.renders.root + ' app ' + s.renders.appLayout +
              ' | replaces ' + JSON.stringify(s.replaces) + ' | mounts ' + JSON.stringify(s.mounts) +
              ' | calls ' + s.calls.length + ' | reactErr ' + s.reactErrors.length + ' | err ' + s.errors.length +
              ' | path ' + s.path + ' | hosts ' + s.hosts + (s.vibeVersion != null ? ' | vibe v' + s.vibeVersion : ''));
}
process.exit(0);
