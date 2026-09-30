// raster-stress.mjs — V59 §7.1 determinism experiment (not committed).
// Boots the base tree once, then flips the dock between Train and You N times,
// settling and taking a full-page capture after each flip, and counts captures
// of the same state that differ from the first capture of that state.
//   node raster-stress.mjs <repo> <n> [extra chrome flags, comma-separated]
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
const LIB = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs';
const { NIGHT, sleep, sha256, acquireLock, startServer, startChrome, CDP, pageClockScript, intercept, loadFakes, onCleanup, rmScratch, diffPNG, CHROME_FLAGS } = await import(LIB);
const [repo, nArg, extra] = process.argv.slice(2);
const N = +(nArg || 20);
const HERE = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/';
const seedFile = JSON.parse(readFileSync(join(NIGHT, 'proof/seed/seed.json'), 'utf8'));
const font = readFileSync(join(NIGHT, 'tools/fonts/archivo/Archivo-wdth-wght.ttf'));
await acquireLock();
await startServer(repo, 8765); await startServer(repo, 8766);
const run = 'stress-' + process.pid;
onCleanup(() => { try { rmScratch(join(NIGHT, 'tmp', run)); } catch {} });
const flags = ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-default-apps', ...(extra ? extra.split(',') : [])];
const chrome = await startChrome({ cdpPort: 9333, profile: join(NIGHT, 'tmp', run, 'chrome'), flags });
console.log('flags', [...CHROME_FLAGS, ...flags].join(' '));
const c = new CDP(chrome.target.webSocketDebuggerUrl);
await c.open();
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Network.enable');
await c.send('Network.setBypassServiceWorker', { bypass: true });
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
await c.send('Emulation.setTimezoneOverride', { timezoneId: 'America/New_York' });
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }, { name: 'prefers-color-scheme', value: 'dark' }] });
await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
intercept(c, { ports: [8765, 8766], fakes: loadFakes(HERE + 'fakes'), font });
const width = +(process.env.W || 390);
await c.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 3, mobile: true });
const { UID, seed } = seedFile;
await c.send('Page.addScriptToEvaluateOnNewDocument', { source: pageClockScript({ now: seedFile.now }) + `try { localStorage.clear(); } catch {}
  try { Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.reject(new Error('no sw')), controller: null, addEventListener() {}, ready: new Promise(() => {}) }, configurable: true }); } catch {}
  window.__FAKE_USER = ${JSON.stringify({ uid: UID, email: 'm@example.test', displayName: 'Micah' })}; window.__SEED = ${JSON.stringify(seed)};` });
const shot = async () => {
  const m = await c.send('Page.getLayoutMetrics');
  const cs = m.cssContentSize;
  return Buffer.from((await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: Math.ceil(cs.width), height: Math.ceil(cs.height), scale: 1 } })).data, 'base64');
};
const loadWaiters = [];
c.on('Page.loadEventFired', () => { while (loadWaiters.length) loadWaiters.shift()(); });
async function boot(port = 8765) {
  const loaded = new Promise(r => loadWaiters.push(r));
  await c.send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/index.html' });
  await Promise.race([loaded, sleep(15000)]);
  await c.ev(`(async () => { for (let i = 0; i < 200; i++) { if (document.readyState === 'complete' && document.querySelector('.dock') && document.fonts.status === 'loaded') break; await new Promise(r => setTimeout(r, 50)); } await document.fonts.ready; return true; })()`);
  await c.ev(`(async () => (await document.fonts.load('700 16px Archivo')).length)()`);
  await c.ev(readFileSync(HERE + 'helpers.js', 'utf8'));
  await c.ev(readFileSync(HERE + 'capture.js', 'utf8'));
  await c.ev('__h.settle(1500)');
}
if (process.env.REBOOT) {
  const firstR = {}; let badR = 0; const pxR = [];
  for (let i = 0; i < N; i++) {
    await boot(process.env.ALT ? (i % 2 ? 8766 : 8765) : 8765);
    await c.ev(process.env.JS || `__h.dock('workout')`);
    await c.ev('__cap.settle()');
    if (process.env.ANIMS) console.log('before dump', await c.ev(`JSON.stringify(document.getAnimations().map(a => (a.animationName || a.transitionProperty) + ':' + a.playState + ':' + (a.effect && a.effect.target && (a.effect.target.className || a.effect.target.localName)) + (a.effect && a.effect.pseudoElement || '')))`));
    if (process.env.DUMP) await c.ev('__cap.dump().length', 120000);
    if (process.env.PRE) await c.ev(process.env.PRE, 120000);
    if (process.env.ANIMS) console.log('after dump', await c.ev(`JSON.stringify(document.getAnimations().map(a => (a.animationName || a.transitionProperty) + ':' + a.playState + ':' + (a.effect && a.effect.target && (a.effect.target.className || a.effect.target.localName)) + (a.effect && a.effect.pseudoElement || '')))`));
    if (process.env.SLEEP) await sleep(+process.env.SLEEP);
    if (process.env.RESETTLE) await c.ev('__cap.settle()');
    const p = await shot();
    const h = sha256(p);
    if (!firstR.h) { Object.assign(firstR, { h, p }); continue; }
    if (h !== firstR.h) { badR++; const d = diffPNG(firstR.p, p, 3); pxR.push('#' + i + ' ' + d.diffPixels + 'px ' + JSON.stringify(d.regions.slice(0, 3).map(r => r.css))); }
  }
  console.log('reboots', N, 'mismatches', badR);
  pxR.slice(0, 12).forEach(l => console.log('  ' + l));
  try { chrome.proc.kill(); } catch {}
  await sleep(1500);
  process.exit(0);
}
await boot();
const first = {}, bad = { workout: 0, you: 0 }, px = [];
for (let i = 0; i < N; i++) {
  for (const v of ['workout', 'you']) {
    await c.ev(`__h.dock('${v}')`);
    await c.ev('__cap.settle()');
    const p = await shot();
    const h = sha256(p);
    if (!first[v]) { first[v] = { h, p }; continue; }
    if (h !== first[v].h) { bad[v]++; const d = diffPNG(first[v].p, p, 3); px.push(v + ' #' + i + ' ' + d.diffPixels + 'px ' + JSON.stringify(d.regions.slice(0, 3).map(r => r.css))); }
  }
}
console.log('iterations', N, 'mismatches', JSON.stringify(bad));
px.slice(0, 12).forEach(l => console.log('  ' + l));
try { chrome.proc.kill(); } catch {}
await sleep(1500);
process.exit(0);
