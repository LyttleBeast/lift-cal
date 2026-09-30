// vibe-contrast/web.mjs — V59 §13.1 on the web: boot a tree in the btn-44
// harness's conditions (its lib, seed, fakes, frozen clock, pinned Archivo,
// the same lock), run every scene of scenes.json + scenes-cover.json (the
// fixture aside) plus shoot.json's extras, and at each one read every painted
// pair with collect.js. Writes <out>/web-<label>.json.
//
//   node web.mjs --repo <tree> --label chalk --vibe chalk [--widths 390] [--out <dir>]
//   node web.mjs --repo <tree> --label v1                 (no vibe: v1)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const HL = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/';
const { NIGHT, sleep, parseArgs, list, logger, onCleanup, rmScratch, acquireLock, startServer, startChrome, CDP, pageClockScript, intercept, loadFakes, CHROME_FLAGS } = await import(HL + 'harness-lib.mjs');

const { flags } = parseArgs(process.argv.slice(2), []);
const REPO = resolve(flags.repo);
const LABEL = flags.label || 'run';
const VIBE = flags.vibe === undefined ? null : String(flags.vibe);
const OUT = resolve(flags.out || join(NIGHT, 'proof', 'vc-chalk-r1'));
const WIDTHS = (list(flags.widths) || ['390']).map(Number);
const PORT = +(flags.port || 8791), CDP_PORT = +(flags['cdp-port'] || 9341);
const NOW = Date.parse('2026-09-25T19:30:00-04:00');
const INSETS = { 390: { top: 47, right: 0, bottom: 34, left: 0 }, 320: { top: 20, right: 0, bottom: 0, left: 0 } };
mkdirSync(OUT, { recursive: true });
const log = logger(join(OUT, 'web-' + LABEL + '.log'));

const SCENES = [...JSON.parse(readFileSync(HL + 'scenes.json', 'utf8')), ...JSON.parse(readFileSync(HL + 'scenes-cover.json', 'utf8'))].filter(g => !g.proveOnly);
const SH = JSON.parse(readFileSync(HL + 'shoot.json', 'utf8'));
for (const g of SCENES) if (SH.extra[g.group]) g.scenes = [...g.scenes, ...SH.extra[g.group]];
const HELPERS = readFileSync(HL + 'helpers.js', 'utf8');
const CAPTURE = readFileSync(HL + 'capture.js', 'utf8');
const COLLECT = readFileSync(new URL('./collect.js', import.meta.url), 'utf8');
const seedFile = JSON.parse(readFileSync(join(NIGHT, 'proof', 'seed', 'seed.json'), 'utf8'));
if (seedFile.now !== NOW) throw new Error('seed is not at NOW');
const fontBytes = readFileSync(join(NIGHT, 'tools', 'fonts', 'archivo', 'Archivo-wdth-wght.ttf'));

await acquireLock({ log });
log('lock held; ' + LABEL + ' vibe=' + VIBE + ' repo=' + REPO);
await startServer(REPO, PORT, log);
const profile = join(NIGHT, 'tmp', 'vc-' + LABEL + '-' + process.pid, 'chrome');
onCleanup(() => { try { rmScratch(join(NIGHT, 'tmp', 'vc-' + LABEL + '-' + process.pid)); } catch {} });
const chrome = await startChrome({ cdpPort: CDP_PORT, profile, flags: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-default-apps'], log });
const c = new CDP(chrome.target.webSocketDebuggerUrl);
await c.open();
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Network.enable');
await c.send('Network.setBypassServiceWorker', { bypass: true });
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
await c.send('Emulation.setTimezoneOverride', { timezoneId: 'America/New_York' });
await c.send('Emulation.setLocaleOverride', { locale: 'en-US' });
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }, { name: 'prefers-color-scheme', value: 'dark' }] });
const loadWaiters = [];
c.on('Page.loadEventFired', () => { while (loadWaiters.length) loadWaiters.shift()(); });
const line1 = readFileSync(join(REPO, 'rack.css'), 'utf8').split('\n')[0];
const FONT_CSS_URL = (line1.match(/@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)/) || [])[1] || null;
const stats = intercept(c, { ports: [PORT], fakes: loadFakes(), font: fontBytes, stats: {}, fontCssUrl: () => FONT_CSS_URL });
let bootScriptId = null;

async function boot(width, cfg) {
  await c.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 3, mobile: true });
  await c.send('Emulation.setSafeAreaInsetsOverride', { insets: INSETS[width] });
  if (bootScriptId) await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: bootScriptId });
  const { UID, seed, live, liveDrop } = seedFile;
  const user = cfg.user === undefined ? { uid: UID, email: 'm@example.test', displayName: 'Micah' } : cfg.user;
  const s = JSON.parse(JSON.stringify(seed));
  if (cfg.onboarding === false) delete s.users[UID].onboarding;
  if (cfg.approve && cfg.user) s.access.approved[cfg.user.uid] = { at: NOW - 60e3, via: 'invite', code: 'CDEFGHJKMN', name: cfg.user.displayName, email: cfg.user.email, ...(cfg.approveExtra || {}) };
  if (cfg.tour) s.users[UID].onboarding = { done: true, tourDone: false, at: NOW - 864e5, version: 3 };
  const session = cfg.liveDrop ? liveDrop : cfg.live ? live : null;
  if (VIBE !== null && s.users[UID]) (s.users[UID].settings = s.users[UID].settings || {}).vibe = VIBE;
  const src = pageClockScript({ now: NOW }) + `
    try { localStorage.clear(); } catch {}
    ${VIBE !== null ? `try { localStorage.setItem('rack:vibe', ${JSON.stringify(VIBE)}); } catch {}` : ''}
    try { Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.reject(new Error('no sw in harness')), controller: null, addEventListener() {}, ready: new Promise(() => {}) }, configurable: true }); } catch {}
    window.__FAKE_USER = ${JSON.stringify(user)};
    window.__SEED = ${JSON.stringify(s)};
    ${session ? `localStorage.setItem(${JSON.stringify('rack:' + UID + ':activeSession')}, ${JSON.stringify(JSON.stringify(session))});` : ''}`;
  bootScriptId = (await c.send('Page.addScriptToEvaluateOnNewDocument', { source: src })).identifier;
  const loaded = new Promise(r => loadWaiters.push(r));
  await c.send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html' });
  await Promise.race([loaded, sleep(15000)]);
  await c.ev(`(async () => { for (let i = 0; i < 200; i++) { if (document.readyState === 'complete' && document.querySelector('.dock') && document.fonts.status === 'loaded') break; await new Promise(r => setTimeout(r, 50)); } await document.fonts.ready; return true; })()`);
  const where = await c.ev(`location.href + ' dock=' + !!document.querySelector('.dock') + ' vibe=' + document.documentElement.getAttribute('data-vibe')`);
  if (!/dock=true/.test(where)) throw new Error('not booted: ' + where);
  await c.ev(HELPERS); await c.ev(CAPTURE); await c.ev(COLLECT);
  await c.ev(`__h.settle(${cfg.wait || 1500})`);
  return where;
}

const results = [];
for (const width of WIDTHS) for (const g of SCENES) {
  let where;
  try { where = await boot(width, g.cfg || {}); }
  catch (e) { results.push({ group: g.group, width, error: 'boot: ' + e.message.slice(0, 200) }); log('BOOT FAIL ' + g.group + ' ' + e.message.slice(0, 200)); continue; }
  for (const s of g.scenes) {
    try { await c.ev(`(async () => { ${s.js} })()`, 30000); }
    catch (e) { results.push({ group: g.group, scene: s.name, width, error: e.message.slice(0, 200) }); log('  scene ' + s.name + ' ' + (s.optional ? 'skipped' : 'ERR') + ': ' + e.message.slice(0, 120)); if (s.fatal !== false && !s.optional) break; continue; }
    try {
      await c.ev('__cap.settle()', 30000);
      const vibeNow = await c.ev(`document.documentElement.getAttribute('data-vibe')`);
      const r = await c.ev(`__vc.collect(${JSON.stringify(s.name + '@' + width)})`, 120000);
      const st = await c.ev(`__vc.states(${JSON.stringify(s.name + '@' + width)})`, 120000);
      results.push({ group: g.group, scene: s.name, width, vibe: vibeNow, overlays: r.overlays, rows: r.rows, states: st });
      log('  ' + s.name + '@' + width + ' vibe=' + vibeNow + ' rows ' + r.rows.length + ' states ' + st.length + (r.overlays.length ? ' overlays ' + r.overlays.join(',') : ''));
    } catch (e) { results.push({ group: g.group, scene: s.name, width, error: 'collect: ' + e.message.slice(0, 200) }); log('  collect ERR ' + s.name + ' ' + e.message.slice(0, 200)); }
  }
}
writeFileSync(join(OUT, 'web-' + LABEL + '.json'), JSON.stringify({ label: LABEL, vibe: VIBE, repo: REPO, widths: WIDTHS, stats: { fontCss: stats.fontCss, fontFile: stats.fontFile, offMachineFailed: stats.offMachineFailed, failed: stats.failed }, results }));
log('done → ' + join(OUT, 'web-' + LABEL + '.json'));
try { chrome.proc.kill(); } catch {}
process.exit(0);
