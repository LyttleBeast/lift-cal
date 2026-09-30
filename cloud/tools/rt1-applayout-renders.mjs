#!/usr/bin/env node
/* rt1-applayout-renders — Pnat adversarial review, runtime lens, round 1.
 *
 * Counts how many times app/(app)/_layout.jsx's AppLayout renders (its own
 * function body runs) while the user moves between routes after boot, and how
 * many times the (app) Stack host is rendered, in the tree given by --root.
 *
 * The router is verify-vibe-switch's small router (a subscribing usePathname,
 * router.replace moving the path, each screen behind a static container), so
 * a component that calls usePathname() re-renders when the path moves, as it
 * does under expo-router's useRouteInfo (useSyncExternalStore on the global
 * route store). vibe-snap and vibe-seed are taken from the proof branch, so
 * the same stand-ins draw both trees.
 *
 * Run:  node rt1-applayout-renders.mjs --root <tree>
 */
import { spawnSync } from 'node:child_process';
import { join, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const PROOF = '/Users/micahflunker/dev/vibes-night/wt/nat-proof/tools/lib/';
const { ZONE, freeze, open, dump, vhost, fingerprint, canon, NOW } = await import(PROOF + 'vibe-snap.mjs');
const { seedServer } = await import(PROOF + 'vibe-seed.mjs');

const SELF = fileURLToPath(import.meta.url);
const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] != null ? argv[i + 1] : d; };
const ROOT = pathResolve(arg('--root', '.'));
if (process.env.TZ !== ZONE || process.env.RT1_CHILD !== '1') {
  const r = spawnSync(process.execPath, [SELF, ...argv], { env: { ...process.env, TZ: ZONE, RT1_CHILD: '1' }, stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
}

freeze();
const H = await open(ROOT);
const { R, S, A, UID, NAVS } = H;
const { React, h } = R;
const doc = globalThis.document;
const { createRoot } = H.req('react-dom/client');
const OWNER_UID = R.load('src/data/firebase-config.js').OWNER_UID;

const appReq = createRequire(join(ROOT, 'app/_layout.jsx'));
const ER = appReq('expo-router');
const NAV_SUBS = new Set();
const PATHS = [];
const setPath = p => { NAVS.path = p; NAVS.focus = p.split('/')[1] || 'you'; PATHS.push(p); NAV_SUBS.forEach(f => f()); };
const usePath = () => React.useSyncExternalStore(f => { NAV_SUBS.add(f); return () => { NAV_SUBS.delete(f); }; }, () => NAVS.path);
const REPLACES = [];
ER.router.replace = p => { REPLACES.push(p); setPath(p); };
ER.router.navigate = p => { setPath(p); };
ER.usePathname = usePath;

const SCREEN_FILES = {
  '/you': 'app/(app)/(tabs)/you/index.jsx', '/workout': 'app/(app)/(tabs)/workout/index.jsx',
  '/workout/session': 'app/(app)/(tabs)/workout/session.jsx', '/food': 'app/(app)/(tabs)/food.jsx',
  '/weight': 'app/(app)/(tabs)/weight.jsx', '/steps': 'app/(app)/(tabs)/steps.jsx'
};
const def = rel => R.load(rel).default;

/* The counters: AppLayout's own renders, the (app) Stack host's renders
   (each render of a recording host mints a new id), and the (tabs) layout's
   and each screen's renders. */
const COUNT = { appLayout: 0, appStack: 0, rootStack: 0, tabsLayout: 0, screen: 0 };
const AppLayoutReal = def('app/(app)/_layout.jsx');
function AppLayoutCounted(p) { COUNT.appLayout++; return AppLayoutReal(p); }
const TabsReal = def('app/(app)/(tabs)/_layout.jsx');
function TabsCounted(p) { COUNT.tabsLayout++; return TabsReal(p); }
const screenCounted = {};
const screenOf = path => {
  if (!screenCounted[path]) { const Real = def(SCREEN_FILES[path]); screenCounted[path] = function ScreenCounted(p) { COUNT.screen++; return Real(p); }; }
  return screenCounted[path];
};

const MOUNTS = { root: 0, app: 0 };
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
  return h(React.Fragment, null, h(TabsCounted), file ? h(screenOf(path), { key: path }) : null);
}
const Static = React.memo(p => p.children, (a, b) => a.route === b.route);
function RouterStack(p) {
  const screens = screensOf(p.children);
  const open1 = n => screens.some(s => s.name === n && s.open);
  const level = screens.some(s => s.name === '(app)') ? 'root' : screens.some(s => s.name === '(tabs)') ? 'app' : 'other';
  if (level === 'app') COUNT.appStack++;
  if (level === 'root') COUNT.rootStack++;
  const path = usePath();
  React.useLayoutEffect(() => {
    MOUNTS[level] = (MOUNTS[level] || 0) + 1;
    if (level === 'app') setPath('/');
  }, []);
  let screen = null;
  if (level === 'root' && open1('(app)')) screen = h(AppLayoutCounted);
  if (level === 'app') screen = path === '/' ? h(def('app/(app)/index.jsx')) : open1('(tabs)') ? h(TabsArea, { path }) : null;
  return h(StackHost, { ...p, children: undefined }, p.children,
           screen && h(Static, { route: level === 'app' ? path : level }, screen));
}
RouterStack.Screen = Screen;
RouterStack.Protected = Protected;
ER.Stack = RouterStack;

S.server = seedServer(UID, OWNER_UID, NOW);
R.load('app/_layout.jsx');
R.load('app/(app)/_layout.jsx');
const STORE = R.load('src/data/store.js');
STORE.watchAuth(() => {});
await A.cb({ uid: UID, email: 'dev@example.com' });

const box = doc.createElement('div'); doc.body.appendChild(box);
const ERRORS = [];
const root = createRoot(box, { onCaughtError: e => ERRORS.push(String(e && e.message)), onUncaughtError: e => ERRORS.push(String(e && e.message)), onRecoverableError: () => {} });
const tick = () => R.act(async () => { await new Promise(r => setTimeout(r, 0)); });
const settle = async () => { let prev = null; for (let i = 0; i < 60; i++) { await tick(); const fp = fingerprint(box); if (fp === prev) return true; prev = fp; } return false; };
const until = async (pred, what) => { for (let i = 0; i < 300; i++) { if (pred()) return true; await tick(); } throw new Error('never reached: ' + what); };

const out = [];
const snapCount = () => ({ ...COUNT });
const delta = (a, b) => Object.fromEntries(Object.keys(b).map(k => [k, b[k] - a[k]]));

await R.act(async () => { root.render(h(def('app/_layout.jsx'))); });
await R.act(async () => { await A.cb({ uid: UID, email: 'dev@example.com' }); });
await until(() => NAVS.path === '/you', 'the You tab, booted');
await settle();
const boot = snapCount();
out.push('boot: ' + JSON.stringify(boot) + '  paths ' + PATHS.join(' > ') + '  replaces ' + REPLACES.join(','));
const hostsAtYou = dump(R, box).map(canon).join('\n');
const STEPS = [{ step: 'boot /you', hosts: hostsAtYou }];

for (const p of ['/food', '/weight', '/workout', '/steps', '/workout/session', '/you']) {
  const before = snapCount(), rep = REPLACES.length;
  await R.act(async () => { ER.router.navigate(p); });
  await settle();
  out.push('navigate ' + p + ': ' + JSON.stringify(delta(before, snapCount())) + '  replaces added ' + (REPLACES.length - rep));
  STEPS.push({ step: 'navigate ' + p, hosts: dump(R, box).map(canon).join('\n') });
}
const hostsBackAtYou = STEPS[STEPS.length - 1].hosts;
out.push('You tab hosts identical before and after the round trip: ' + (hostsAtYou === hostsBackAtYou));
/* Every step's full host dump, for a cross-tree comparison. */
const { createHash } = await import('node:crypto');
const { mkdirSync, writeFileSync } = await import('node:fs');
const OUT = arg('--out', null);
if (OUT) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'steps.json'), JSON.stringify(STEPS.map(s => ({ step: s.step, hosts: s.hosts.split('\n') })), null, 0));
}
STEPS.forEach(s => out.push('  ' + s.step + ': ' + s.hosts.split('\n').length + ' hosts, sha256 ' + createHash('sha256').update(s.hosts).digest('hex').slice(0, 16)));
out.push('mounts ' + JSON.stringify(MOUNTS) + '  errors ' + ERRORS.length + (ERRORS.length ? ' ' + ERRORS.slice(0, 3).join(' | ') : ''));
console.log('rt1-applayout-renders --root ' + ROOT);
console.log(out.join('\n'));
await R.act(async () => { root.unmount(); });
process.exit(0);
