// hx3-flags: boot the drop scene N times in one Chrome exactly as prove.mjs captures
// (settle, dump, settle, 150ms, full-page shot) with extra Chrome flags, and count the
// distinct PNGs — the V59 §7.1 raster-state experiment (not committed).
//   node hx3-flags.mjs <n> [flag,flag,...] [width=390] [scene=drop]
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
const LIB = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs';
const { NIGHT, sleep, sha256, acquireLock, startServer, startChrome, CDP, pageClockScript, intercept, loadFakes, onCleanup, rmScratch } = await import(LIB);
const HERE = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/';
const [nArg, extra = '', wArg = '390', scene = 'drop'] = process.argv.slice(2);
const N = +(nArg || 30), W = +wArg;
const seedFile = JSON.parse(readFileSync(join(NIGHT, 'proof/seed/seed.json'), 'utf8'));
const font = readFileSync(join(NIGHT, 'tools/fonts/archivo/Archivo-wdth-wght.ttf'));
await acquireLock();
await startServer('/Users/micahflunker/dev/vibes-night/wt/web-base', 8765);
const run = 'hx3f-' + process.pid;
onCleanup(() => { try { rmScratch(join(NIGHT, 'tmp', run)); } catch {} });
const flags = ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-default-apps', ...extra.split(',').filter(Boolean)];
const chrome = await startChrome({ cdpPort: 9333, profile: join(NIGHT, 'tmp', run, 'chrome'), flags });
console.log('flags', flags.join(' '), 'width', W, 'scene', scene);
const c = new CDP(chrome.target.webSocketDebuggerUrl);
await c.open();
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Network.enable');
await c.send('Network.setBypassServiceWorker', { bypass: true });
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
await c.send('Emulation.setTimezoneOverride', { timezoneId: 'America/New_York' });
await c.send('Emulation.setLocaleOverride', { locale: 'en-US' });
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }, { name: 'prefers-color-scheme', value: 'dark' }] });
await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
intercept(c, { ports: [8765], fakes: loadFakes(HERE + 'fakes'), font });
await c.send('Emulation.setDeviceMetricsOverride', { width: W, height: 844, deviceScaleFactor: 3, mobile: true });
const { UID, seed, liveDrop } = seedFile;
await c.send('Page.addScriptToEvaluateOnNewDocument', { source: pageClockScript({ now: seedFile.now }) + `try { localStorage.clear(); } catch {}
  try { Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.reject(new Error('no sw')), controller: null, addEventListener() {}, ready: new Promise(() => {}) }, configurable: true }); } catch {}
  window.__FAKE_USER = ${JSON.stringify({ uid: UID, email: 'm@example.test', displayName: 'Micah' })}; window.__SEED = ${JSON.stringify(seed)};
  ${scene === 'drop' ? `localStorage.setItem(${JSON.stringify('rack:' + UID + ':activeSession')}, ${JSON.stringify(JSON.stringify(liveDrop))});` : ''}` });
const loadWaiters = [];
c.on('Page.loadEventFired', () => { while (loadWaiters.length) loadWaiters.shift()(); });
const shot = async () => {
  const m = await c.send('Page.getLayoutMetrics');
  const cs = m.cssContentSize;
  return Buffer.from((await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: Math.ceil(cs.width), height: Math.ceil(cs.height), scale: 1 } })).data, 'base64');
};
const seen = new Map(), seq = [];
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const loaded = new Promise(r => loadWaiters.push(r));
  await c.send('Page.navigate', { url: 'http://127.0.0.1:8765/index.html' });
  await Promise.race([loaded, sleep(15000)]);
  await c.ev(`(async () => { for (let i = 0; i < 200; i++) { if (document.readyState === 'complete' && document.querySelector('.dock') && document.fonts.status === 'loaded') break; await new Promise(r => setTimeout(r, 50)); } await document.fonts.ready; return true; })()`);
  await c.ev(`(async () => (await document.fonts.load('700 16px Archivo')).length)()`);
  await c.ev(readFileSync(HERE + 'helpers.js', 'utf8'));
  await c.ev(readFileSync(HERE + 'capture.js', 'utf8'));
  await c.ev('__h.settle(1500)');
  if (scene === 'drop') await c.ev(`(async () => { await __h.dock('workout'); await __h.until(() => document.querySelector('#view-workout .set-row.drop') && document.querySelector('#view-workout .drop-add')); })()`);
  else await c.ev(`(async () => { await __h.dock('you'); await __h.click('admin'); })()`);
  await c.ev('__cap.settle()', 30000);
  await c.ev('__cap.dump().length', 180000);
  await c.ev('__cap.settle()', 30000);
  await sleep(150);
  const h = sha256(await shot()).slice(0, 8);
  seen.set(h, (seen.get(h) || 0) + 1); seq.push(h);
}
console.log('SEQ', seq.join(' '));
console.log('HASHES', JSON.stringify([...seen]), 'boots', N, Math.round((Date.now() - t0) / 1000) + 's');
try { chrome.proc.kill(); } catch {}
await sleep(1000);
process.exit(0);
