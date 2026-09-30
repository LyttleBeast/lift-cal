// Degenerate state: index.html painted with rack.css (and auth.css) answering
// empty and app.js empty. The auth mark's inline background is a hex on base
// and var(--p-*) on the engine; with no :root tokens the var() has nothing to
// resolve. Records each <i>'s computed background and box, on both sides.
import { writeFileSync } from 'node:fs';
import { acquireLock, startServer, startChrome, CDP, intercept, sleep, portFree } from '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs';
const TREES = { base: '/Users/micahflunker/dev/vibes-night/wt/web-base', engine: '/Users/micahflunker/dev/vibes-night/wt/web-engine' };
const PORTS = { base: 18931, engine: 18932 }, CDP_PORT = 19931;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const release = await acquireLock({ log });
const res = {};
try {
  for (const p of [...Object.values(PORTS), CDP_PORT]) if (!(await portFree(p))) throw new Error('port ' + p + ' busy');
  const sv = {}; for (const s of ['base', 'engine']) sv[s] = await startServer(TREES[s], PORTS[s], log);
  const chrome = await startChrome({ cdpPort: CDP_PORT, profile: '/Users/micahflunker/dev/vibes-night/tmp/pweb-r1-css/profile-nocss-' + Date.now(), log });
  const c = new CDP(chrome.target.webSocketDebuggerUrl); await c.open();
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Network.enable'); await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  intercept(c, { ports: Object.values(PORTS), fakes: {}, font: null, overrides: { '/rack.css': { body: '', type: 'text/css' }, '/auth.css': { body: '', type: 'text/css' }, '/app.js': { body: '', type: 'application/javascript' } } });
  await c.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (const side of ['base', 'engine']) {
    let loaded = false; c.handlers['Page.loadEventFired'] = [() => { loaded = true; }];
    await c.send('Page.navigate', { url: 'http://127.0.0.1:' + PORTS[side] + '/index.html' });
    for (let i = 0; i < 200 && !loaded; i++) await sleep(50);
    res[side] = await c.ev(`[...document.querySelectorAll('.auth-mark i')].map(i => { const cs = getComputedStyle(i), r = i.getBoundingClientRect(); return { inline: i.getAttribute('style'), bg: cs.backgroundColor, display: cs.display, w: r.width, h: r.height }; })`);
    log(side, JSON.stringify(res[side]));
  }
  chrome.stop(); for (const s of Object.values(sv)) s.stop();
} finally { release(); }
writeFileSync('/Users/micahflunker/dev/vibes-night/proof/pweb-r1-css/nocss.json', JSON.stringify(res, null, 1));
process.exit(0);
