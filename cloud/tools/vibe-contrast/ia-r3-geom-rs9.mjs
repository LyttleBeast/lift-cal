// Iron Age contrast round 3 (rs9): two pixel questions the collector cannot
// answer from computed styles.
//  1. plateStrip · stamp: the chip keeps its plate colour in the 1px border
//     and covers the rest with `box-shadow: inset 0 0 0 20px var(--rack)`.
//     A padding box wider (or taller) than 40px leaves a strip of plate colour
//     in the middle, under the figures. Every real chip, plus one chip per
//     label renderPlates can emit for a plausible load, is measured, and the
//     pixels under the text are read off a screenshot.
//  2. Band mode: nothing but the photo inside the 80px band — every visible
//     text run and control in a band box checked for overlap with its band.
// Same boot as web.mjs (the btn-44 harness lib, lock, seed, fakes, clock).
//   node ia-r3-geom-rs9.mjs --repo <web tree> --out <dir> [--widths 320,390]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const HL = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/';
const { NIGHT, sleep, parseArgs, list, logger, onCleanup, rmScratch, acquireLock, startServer, startChrome, CDP, pageClockScript, intercept, loadFakes } = await import(HL + 'harness-lib.mjs');
const PNGM = await import('/Users/micahflunker/dev/vibes-night/tools/node_modules/pngjs/lib/png.js');
const PNG = PNGM.PNG || PNGM.default.PNG;
const { flags } = parseArgs(process.argv.slice(2), []);
const REPO = resolve(flags.repo), OUT = resolve(flags.out), VIBE = 'iron-age';
const WIDTHS = (list(flags.widths) || ['320', '390']).map(Number);
const PORT = 8796, CDP_PORT = 9346;
const NOW = Date.parse('2026-09-25T19:30:00-04:00');
const INSETS = { 390: { top: 47, right: 0, bottom: 34, left: 0 }, 320: { top: 20, right: 0, bottom: 0, left: 0 } };
mkdirSync(OUT, { recursive: true });
const log = logger(join(OUT, 'geom.log'));
const ALL = [...JSON.parse(readFileSync(HL + 'scenes.json', 'utf8')), ...JSON.parse(readFileSync(HL + 'scenes-cover.json', 'utf8'))];
const SH = JSON.parse(readFileSync(HL + 'shoot.json', 'utf8'));
for (const g of ALL) if (SH.extra[g.group]) g.scenes = [...g.scenes, ...SH.extra[g.group]];
const WANT = { you: ['you'], session: ['session'], drop: ['session-drop', 'summary'], weight: ['weight'], steps: ['steps'] };
const HELPERS = readFileSync(HL + 'helpers.js', 'utf8'), CAPTURE = readFileSync(HL + 'capture.js', 'utf8');
const seedFile = JSON.parse(readFileSync(join(NIGHT, 'proof', 'seed', 'seed.json'), 'utf8'));
const fontBytes = readFileSync(join(NIGHT, 'tools', 'fonts', 'archivo', 'Archivo-wdth-wght.ttf'));

await acquireLock({ log });
await startServer(REPO, PORT, log);
const scratch = join(NIGHT, 'tmp', 'ia-r3-geom-' + process.pid);
onCleanup(() => { try { rmScratch(scratch); } catch {} });
const chrome = await startChrome({ cdpPort: CDP_PORT, profile: join(scratch, 'chrome'), flags: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-default-apps'], log });
const c = new CDP(chrome.target.webSocketDebuggerUrl);
await c.open();
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Network.enable');
await c.send('Network.setBypassServiceWorker', { bypass: true });
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
await c.send('Emulation.setTimezoneOverride', { timezoneId: 'America/New_York' });
await c.send('Emulation.setLocaleOverride', { locale: 'en-US' });
const loadWaiters = [];
c.on('Page.loadEventFired', () => { while (loadWaiters.length) loadWaiters.shift()(); });
const line1 = readFileSync(join(REPO, 'rack.css'), 'utf8').split('\n')[0];
const FONT_CSS_URL = (line1.match(/@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)/) || [])[1] || null;
intercept(c, { ports: [PORT], fakes: loadFakes(), font: fontBytes, stats: {}, fontCssUrl: () => FONT_CSS_URL });
let bootScriptId = null;
async function boot(width, cfg) {
  await c.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 3, mobile: true });
  await c.send('Emulation.setSafeAreaInsetsOverride', { insets: INSETS[width] });
  if (bootScriptId) await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: bootScriptId });
  const { UID, seed, live, liveDrop } = seedFile;
  const s = JSON.parse(JSON.stringify(seed));
  (s.users[UID].settings = s.users[UID].settings || {}).vibe = VIBE;
  const session = cfg.liveDrop ? liveDrop : cfg.live ? live : null;
  const src = pageClockScript({ now: NOW }) + `
    try { localStorage.clear(); localStorage.setItem('rack:vibe', ${JSON.stringify(VIBE)}); } catch {}
    try { Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.reject(new Error('no sw')), controller: null, addEventListener() {}, ready: new Promise(() => {}) }, configurable: true }); } catch {}
    window.__FAKE_USER = ${JSON.stringify({ uid: UID, email: 'm@example.test', displayName: 'Micah' })};
    window.__SEED = ${JSON.stringify(s)};
    ${session ? `localStorage.setItem(${JSON.stringify('rack:' + UID + ':activeSession')}, ${JSON.stringify(JSON.stringify(session))});` : ''}`;
  bootScriptId = (await c.send('Page.addScriptToEvaluateOnNewDocument', { source: src })).identifier;
  const loaded = new Promise(r => loadWaiters.push(r));
  await c.send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html' });
  await Promise.race([loaded, sleep(15000)]);
  await c.ev(`(async () => { for (let i = 0; i < 200; i++) { if (document.readyState === 'complete' && document.querySelector('.dock') && document.fonts.status === 'loaded') break; await new Promise(r => setTimeout(r, 50)); } await document.fonts.ready; return true; })()`);
  await c.ev(HELPERS); await c.ev(CAPTURE);
  await c.ev(`__h.settle(${cfg.wait || 1500})`);
}
const PAGE = `(() => {
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0; };
  const out = { chips: [], bands: [] };
  // 1. chips, plus probes: one strip per plate colour with the widest labels
  const strip = [...document.querySelectorAll('.plate-strip')].find(vis);
  if (strip) {
    const probe = strip.cloneNode(false); probe.id = '__probe'; strip.after(probe);
    const P = [['var(--p-red)', ['1×45', '2×45', '3×45', '10×45']], ['var(--p-blue)', ['1×35']], ['var(--p-yellow)', ['1×25']], ['var(--p-green)', ['1×10']], ['var(--p-white)', ['1×5']], ['var(--p-chrome)', ['1×2.5']]];
    for (const [col, labs] of P) for (const t of labs) { const s = document.createElement('span'); s.className = 'plate-chip'; s.textContent = t; s.style.background = col; s.dataset.probe = '1'; probe.appendChild(s); }
  }
  document.querySelectorAll('.plate-chip').forEach(e => {
    if (!vis(e)) return;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    const range = document.createRange(); range.selectNodeContents(e); const tr = range.getBoundingClientRect();
    out.chips.push({ text: e.textContent, probe: !!e.dataset.probe, bg: cs.backgroundColor, shadow: cs.boxShadow, border: cs.borderTopWidth, pw: e.clientWidth, ph: e.clientHeight,
      rect: [r.left, r.top, r.width, r.height].map(v => +v.toFixed(2)), textRect: [tr.left, tr.top, tr.width, tr.height].map(v => +v.toFixed(2)) });
  });
  // 2. bands
  for (const sel of ['.you-hero', '.summary-hero', '#view-steps .cal-hd + .card', '#view-weight .cal-hd + .card']) {
    for (const box of document.querySelectorAll(sel)) {
      if (!vis(box)) continue;
      const b = getComputedStyle(box, '::before');
      if (!b.backgroundImage || b.backgroundImage === 'none') { out.bands.push({ sel, note: 'no band image', bi: b.backgroundImage }); continue; }
      const r = box.getBoundingClientRect(), bh = parseFloat(b.height), btop = r.top + parseFloat(b.top || 0);
      const band = { sel, box: [r.left, r.top, r.width, r.height].map(v => +v.toFixed(1)), bandTop: +btop.toFixed(1), bandH: bh, padTop: getComputedStyle(box).paddingTop, hits: [] };
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        let rects = [], what;
        if (n.nodeType === 3) { if (!n.textContent.trim() || !n.parentElement || !vis(n.parentElement)) continue; const rg = document.createRange(); rg.selectNodeContents(n); rects = [...rg.getClientRects()]; what = 'text ' + JSON.stringify(n.textContent.trim().slice(0, 30)); }
        else { if (!vis(n)) continue; const tag = n.tagName.toLowerCase(); if (!/^(button|input|a|svg|img|select|textarea|canvas)$/.test(tag) && !n.getAttribute('role') && getComputedStyle(n).backgroundColor === 'rgba(0, 0, 0, 0)' && !parseFloat(getComputedStyle(n).borderTopWidth)) continue; if (n === box) continue; rects = [n.getBoundingClientRect()]; what = tag + '.' + [...n.classList].join('.'); }
        for (const q of rects) { const ov = Math.min(q.bottom, btop + bh) - Math.max(q.top, btop); if (ov > 0.5 && q.width > 0) band.hits.push(what + ' overlaps ' + ov.toFixed(1) + 'px @y ' + q.top.toFixed(1)); }
      }
      out.bands.push(band);
    }
  }
  return out;
})()`;
const results = [];
for (const width of WIDTHS) for (const g of ALL) {
  if (!WANT[g.group]) continue;
  await boot(width, g.cfg || {});
  for (const s of g.scenes) {
    try { await c.ev(`(async () => { ${s.js} })()`, 30000); } catch (e) { log('scene ' + s.name + ' ERR ' + e.message.slice(0, 100)); if (!s.optional) break; continue; }
    if (!WANT[g.group].includes(s.name)) continue;
    await c.ev('__cap.settle()', 30000);
    const r = await c.ev(PAGE, 60000);
    // pixels under each chip's text: the middle row of the text box
    for (const ch of r.chips) {
      const [x, y, w, h] = ch.textRect;
      if (w <= 0) continue;
      const shot = await c.send('Page.captureScreenshot', { format: 'png', clip: { x, y: y + h * 0.5 - 0.5, width: w, height: 1, scale: 3 }, captureBeyondViewport: true });
      const png = PNG.sync.read(Buffer.from(shot.data, 'base64'));
      const cols = new Map();
      for (let i = 0; i < png.width * png.height; i++) { const k = '#' + [0, 1, 2].map(j => png.data[i * 4 + j].toString(16).padStart(2, '0')).join(''); cols.set(k, (cols.get(k) || 0) + 1); }
      ch.midRow = [...cols].sort((a, b) => b[1] - a[1]).slice(0, 5);
    }
    results.push({ scene: s.name, width, ...r });
    log(s.name + '@' + width + ' chips ' + r.chips.length + ' bands ' + r.bands.length);
  }
}
writeFileSync(join(OUT, 'geom.json'), JSON.stringify(results, null, 1));
log('done');
try { chrome.proc.kill(); } catch {}
process.exit(0);
