#!/usr/bin/env node
/* rt2-settype-screen — Pnat runtime review, round 2.
 * The whole app, booted as a phone boots it (rt1-applayout-renders' small
 * router), with a live session parked in LS whose one exercise has a set of
 * type --type (default 'toString'). Boot restores the session and lands on
 * /workout/session. Prints whether the session screen drew (and whether the
 * set badge's word is on screen) or what threw.
 *
 *   node rt2-settype-screen.mjs --root <tree> [--type toString]
 */
import { spawnSync } from 'node:child_process';
import { join, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const PROOF = '/Users/micahflunker/dev/vibes-night/wt/nat-proof/tools/lib/';
const { ZONE, freeze, open, dump, vhost, fingerprint, NOW } = await import(PROOF + 'vibe-snap.mjs');
const { seedServer } = await import(PROOF + 'vibe-seed.mjs');
const SELF = fileURLToPath(import.meta.url);
const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] != null ? argv[i + 1] : d; };
const ROOT = pathResolve(arg('--root', '.'));
const TYPE = arg('--type', 'toString');
if (process.env.TZ !== ZONE || process.env.RT2_CHILD !== '1') {
  const r = spawnSync(process.execPath, [SELF, ...argv], { env: { ...process.env, TZ: ZONE, RT2_CHILD: '1' }, stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
}
freeze();
const H = await open(ROOT);
const { R, S, A, UID, NAVS, ls } = H;
const { React, h } = R;
const doc = globalThis.document;
const { createRoot } = H.req('react-dom/client');
const OWNER_UID = R.load('src/data/firebase-config.js').OWNER_UID;
const ER = createRequire(join(ROOT, 'app/_layout.jsx'))('expo-router');
const NAV_SUBS = new Set();
const setPath = p => { NAVS.path = p; NAVS.focus = p.split('/')[1] || 'you'; NAV_SUBS.forEach(f => f()); };
const usePath = () => React.useSyncExternalStore(f => { NAV_SUBS.add(f); return () => { NAV_SUBS.delete(f); }; }, () => NAVS.path);
ER.router.replace = p => setPath(p);
ER.router.navigate = p => setPath(p);
ER.usePathname = usePath;
const def = rel => R.load(rel).default;
const SCREENS = { '/you': 'app/(app)/(tabs)/you/index.jsx', '/workout': 'app/(app)/(tabs)/workout/index.jsx',
  '/workout/session': 'app/(app)/(tabs)/workout/session.jsx', '/food': 'app/(app)/(tabs)/food.jsx' };
const StackHost = vhost('Stack');
const Screen = ER.Stack.Screen, Protected = ER.Stack.Protected;
const screensOf = kids => { const f = []; React.Children.forEach(kids, c => { if (!c) return;
  if (c.type === Protected) React.Children.forEach(c.props.children, s => { if (s && s.type === Screen) f.push({ name: s.props.name, open: !!c.props.guard }); });
  else if (c.type === Screen) f.push({ name: c.props.name, open: true }); }); return f; };
function TabsArea({ path }) { const file = SCREENS[path]; return h(React.Fragment, null, h(def('app/(app)/(tabs)/_layout.jsx')), file ? h(def(file), { key: path }) : null); }
const Static = React.memo(p => p.children, (a, b) => a.route === b.route);
function RouterStack(p) {
  const screens = screensOf(p.children);
  const open1 = n => screens.some(s => s.name === n && s.open);
  const level = screens.some(s => s.name === '(app)') ? 'root' : screens.some(s => s.name === '(tabs)') ? 'app' : 'other';
  const path = usePath();
  React.useLayoutEffect(() => { if (level === 'app') setPath('/'); }, []);
  let screen = null;
  if (level === 'root' && open1('(app)')) screen = h(def('app/(app)/_layout.jsx'));
  if (level === 'app') screen = path === '/' ? h(def('app/(app)/index.jsx')) : open1('(tabs)') ? h(TabsArea, { path }) : null;
  return h(StackHost, { ...p, children: undefined }, p.children, screen && h(Static, { route: level === 'app' ? path : level }, screen));
}
RouterStack.Screen = Screen; RouterStack.Protected = Protected;
ER.Stack = RouterStack;

S.server = seedServer(UID, OWNER_UID, NOW);
ls.set('activeSession', { name: 'Push', startedAt: NOW - 20 * 60e3, exercises: [
  { exId: 'barbell-bench-press', name: 'Bench Press', group: 'chest', equipment: 'barbell',
    sets: [{ w: 185, r: 5, type: 'N', done: true }, { w: 185, r: 5, type: TYPE, done: false }] }] });
R.load('app/_layout.jsx'); R.load('app/(app)/_layout.jsx');
const STORE = R.load('src/data/store.js');
STORE.watchAuth(() => {});
await A.cb({ uid: UID, email: 'dev@example.com' });
const box = doc.createElement('div'); doc.body.appendChild(box);
const ERRORS = [];
const root = createRoot(box, { onCaughtError: e => ERRORS.push('caught: ' + String(e && e.message)), onUncaughtError: e => ERRORS.push('uncaught: ' + String(e && e.message)), onRecoverableError() {} });
const tick = () => R.act(async () => { await new Promise(r => setTimeout(r, 0)); });
try { await R.act(async () => { root.render(h(def('app/_layout.jsx'))); }); } catch (e) { ERRORS.push('render: ' + e.message); }
try { await R.act(async () => { await A.cb({ uid: UID, email: 'dev@example.com' }); }); } catch (e) { ERRORS.push('signin: ' + e.message); }
for (let i = 0; i < 200 && NAVS.path !== '/workout/session'; i++) await tick();
for (let i = 0; i < 40; i++) await tick();
const hosts = dump(R, box);
const texts = hosts.map(x => x.x).filter(Boolean);
console.log('rt2-settype-screen --root ' + ROOT + '  set type ' + JSON.stringify(TYPE));
console.log('  path ' + NAVS.path + ', hosts drawn ' + hosts.length + ', "Bench Press" on screen: ' + texts.includes('Bench Press') +
            ', the badge word "' + TYPE + '" on screen: ' + texts.includes(TYPE));
console.log('  errors ' + ERRORS.length + (ERRORS.length ? ': ' + ERRORS.slice(0, 2).map(s => s.slice(0, 160)).join(' | ') : ''));
try { await R.act(async () => { root.unmount(); }); } catch {}
process.exit(0);
