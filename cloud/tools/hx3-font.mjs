// hx3-font: the raster-state experiment, round two (V59 §7.1, not committed).
// Boots one scene N times in one Chrome exactly as prove.mjs captures, and prints
// each boot's PNG hash beside when Archivo finished loading relative to the first
// frame — to see whether the dock icons' raster state follows the font's timing.
// FONTINJECT=1 installs the pinned Archivo with document.fonts.add() before any
// of the app's code runs, so the font is there for the first layout.
//   node hx3-font.mjs <n> [flag,flag,...] [width=390] [scene=you|admin|drop]
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
const LIB = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs';
const { NIGHT, sleep, sha256, acquireLock, startServer, startChrome, CDP, pageClockScript, intercept, loadFakes, onCleanup, rmScratch } = await import(LIB);
const HERE = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/';
const [nArg, extra = '', wArg = '390', scene = 'you'] = process.argv.slice(2);
const N = +(nArg || 30), W = +wArg;
const seedFile = JSON.parse(readFileSync(join(NIGHT, 'proof/seed/seed.json'), 'utf8'));
const font = readFileSync(join(NIGHT, 'tools/fonts/archivo/Archivo-wdth-wght.ttf'));
await acquireLock();
await startServer('/Users/micahflunker/dev/vibes-night/wt/web-base', 8765);
const run = 'hx3o-' + process.pid;
onCleanup(() => { try { rmScratch(join(NIGHT, 'tmp', run)); } catch {} });
const flags = ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-default-apps', ...extra.split(',').filter(Boolean)];
const chrome = await startChrome({ cdpPort: 9333, profile: join(NIGHT, 'tmp', run, 'chrome'), flags });
console.log('flags', flags.join(' '), 'width', W, 'scene', scene, 'fontinject', !!process.env.FONTINJECT);
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
const inject = process.env.FONTINJECT ? `
  (() => { const s = atob(${JSON.stringify(font.toString('base64'))}); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    const f = new FontFace('Archivo', b.buffer, { weight: '300 900', stretch: '62% 125%', style: 'normal' }); document.fonts.add(f); window.__injected = f.status; })();` : '';
const probe = `
  (() => { const rn = window.__realNow, t0 = rn(); window.__t = { firstFrame: null, fontDone: null };
    requestAnimationFrame(() => { window.__t.firstFrame = rn() - t0; });
    document.fonts.addEventListener('loadingdone', () => { if (window.__t.fontDone == null) window.__t.fontDone = rn() - t0; }); })();`;
await c.send('Page.addScriptToEvaluateOnNewDocument', { source: pageClockScript({ now: seedFile.now }) + inject + probe + `try { localStorage.clear(); } catch {}
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
const seen = new Map(), rows = [];
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
  else if (scene === 'admin') await c.ev(`(async () => { await __h.dock('you'); await __h.click('admin'); })()`);
  else await c.ev(`__h.dock('you')`);
  await c.ev('__cap.settle()', 30000);
  await c.ev('__cap.dump().length', 180000);
  await c.ev('__cap.settle()', 30000);
  if (process.env.RECREATE) {
    // Take the dock out of the render tree and put it back: its composited layer
    // and tilings are made again, rastered from the final display list.
    await c.ev(`(async () => { const s = document.createElement('style'); s.textContent = '.dock{display:none!important}'; document.head.appendChild(s);
      await __cap.frame(); await __cap.sleep(50); s.remove(); await __cap.frame(); await __cap.sleep(50); })()`);
    await c.ev('__cap.settle()', 30000);
  }
  await sleep(150);
  const h = sha256(await shot()).slice(0, 8);
  const t = await c.ev(`JSON.stringify({ ...window.__t, faces: [...document.fonts].filter(f => f.family.replace(/["']/g, '') === 'Archivo').length, injected: window.__injected || null })`);
  seen.set(h, (seen.get(h) || 0) + 1); rows.push(h + ' ' + t);
}
rows.forEach((r, i) => console.log(i, r));
console.log('HASHES', JSON.stringify([...seen]), 'boots', N, Math.round((Date.now() - t0) / 1000) + 's');
try { chrome.proc.kill(); } catch {}
await sleep(1000);
process.exit(0);
