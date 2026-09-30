// hx-layers: boot the drop scene N times in one Chrome (as prove.mjs does), capture the
// way prove.mjs captures, and print the PNG hash beside the compositor's layer facts
// (LayerTree domain), to find what differs between the two raster states.
//   node hx-layers.mjs <n> [mode=plain|vis|...]
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
const LIB = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs';
const { NIGHT, sleep, sha256, acquireLock, startServer, startChrome, CDP, pageClockScript, intercept, loadFakes, onCleanup, rmScratch } = await import(LIB);
const HERE = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/';
const [nArg, mode = 'plain'] = process.argv.slice(2);
const N = +(nArg || 10);
const seedFile = JSON.parse(readFileSync(join(NIGHT, 'proof/seed/seed.json'), 'utf8'));
const font = readFileSync(join(NIGHT, 'tools/fonts/archivo/Archivo-wdth-wght.ttf'));
await acquireLock();
await startServer('/Users/micahflunker/dev/vibes-night/wt/web-base', 8765);
const run = 'hxl-' + process.pid;
onCleanup(() => { try { rmScratch(join(NIGHT, 'tmp', run)); } catch {} });
const chrome = await startChrome({ cdpPort: 9333, profile: join(NIGHT, 'tmp', run, 'chrome'), flags: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-default-apps'] });
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
let layers = [];
c.on('LayerTree.layerTreeDidChange', p => { if (p.layers) layers = p.layers; });
await c.send('LayerTree.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
const { UID, seed, liveDrop } = seedFile;
await c.send('Page.addScriptToEvaluateOnNewDocument', { source: pageClockScript({ now: seedFile.now }) + `try { localStorage.clear(); } catch {}
  try { Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.reject(new Error('no sw')), controller: null, addEventListener() {}, ready: new Promise(() => {}) }, configurable: true }); } catch {}
  window.__FAKE_USER = ${JSON.stringify({ uid: UID, email: 'm@example.test', displayName: 'Micah' })}; window.__SEED = ${JSON.stringify(seed)};
  localStorage.setItem(${JSON.stringify('rack:' + UID + ':activeSession')}, ${JSON.stringify(JSON.stringify(liveDrop))});` });
const loadWaiters = [];
c.on('Page.loadEventFired', () => { while (loadWaiters.length) loadWaiters.shift()(); });
const shot = async () => {
  const m = await c.send('Page.getLayoutMetrics');
  const cs = m.cssContentSize;
  return Buffer.from((await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: Math.ceil(cs.width), height: Math.ceil(cs.height), scale: 1 } })).data, 'base64');
};
const seen = new Map();
for (let i = 0; i < N; i++) {
  const loaded = new Promise(r => loadWaiters.push(r));
  const tNav = Date.now();
  await c.send('Page.navigate', { url: 'http://127.0.0.1:8765/index.html' });
  await Promise.race([loaded, sleep(15000)]);
  await c.ev(`(async () => { for (let i = 0; i < 200; i++) { if (document.readyState === 'complete' && document.querySelector('.dock') && document.fonts.status === 'loaded') break; await new Promise(r => setTimeout(r, 50)); } await document.fonts.ready; return true; })()`);
  await c.ev(`(async () => (await document.fonts.load('700 16px Archivo')).length)()`);
  const early = await c.ev(`JSON.stringify({ active: (document.querySelector('.dock button.active')||{}).dataset?.view, anims: document.getAnimations().length, t: (window.__realNow ? window.__realNow() : 0) })`);
  await c.ev(readFileSync(HERE + 'helpers.js', 'utf8'));
  await c.ev(readFileSync(HERE + 'capture.js', 'utf8'));
  await c.ev('__h.settle(1500)');
  const before = await c.ev(`JSON.stringify({ active: (document.querySelector('.dock button.active')||{}).dataset?.view })`);
  await c.ev(`(async () => { await __h.dock('workout'); await __h.until(() => document.querySelector('#view-workout .set-row.drop') && document.querySelector('#view-workout .drop-add')); })()`);
  const s1 = await c.ev('__cap.settle()', 30000);
  await c.ev('__cap.dump().length', 180000);
  const s2 = await c.ev('__cap.settle()', 30000);
  if (mode === 'dsf') {
    await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await c.ev('__cap.frame()'); await sleep(100);
    await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await c.ev('__cap.frame()'); await c.ev('__cap.settle()', 30000);
  }
  if (mode === 'vis') {
    await c.ev(`(async () => { const h = document.documentElement; h.style.visibility = 'hidden'; await __cap.frame(); h.style.visibility = ''; if (!h.getAttribute('style')) h.removeAttribute('style'); await __cap.frame(); })()`);
    await c.ev('__cap.settle()', 30000);
  }
  await sleep(150);
  const vv = await c.ev(`JSON.stringify({ s: visualViewport.scale, w: visualViewport.width, h: visualViewport.height, ox: visualViewport.offsetLeft, oy: visualViewport.offsetTop, pl: visualViewport.pageLeft, pt: visualViewport.pageTop, dpr: devicePixelRatio, iw: innerWidth, sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, sy: scrollY })`);
  const lm = await c.send('Page.getLayoutMetrics');
  const png = await shot();
  const h = sha256(png).slice(0, 8);
  if (!seen.has(h)) seen.set(h, 0); seen.set(h, seen.get(h) + 1);
  const dock = layers.filter(l => l.drawsContent).map(l => ({ id: l.layerId, node: l.backendNodeId, x: l.offsetX, y: l.offsetY, w: l.width, h: l.height, pc: l.paintCount, tf: l.transform ? l.transform.map(v => +v.toFixed(3)).join(',') : null }));
  console.log(i, h, 'navToCapture', Date.now() - tNav, 'ms early', early, 'before', before, 's1', JSON.stringify(s1), 's2', JSON.stringify(s2));
  console.log('   vv', vv, 'cssVisual', JSON.stringify(lm.cssVisualViewport), 'cssLayout', JSON.stringify(lm.cssLayoutViewport), 'content', JSON.stringify(lm.cssContentSize));
}
console.log('HASHES', JSON.stringify([...seen]));
try { chrome.proc.kill(); } catch {}
await sleep(1000);
process.exit(0);
