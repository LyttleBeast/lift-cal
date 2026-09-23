// The v47 button measurement: boots the real app in headless Chrome against a
// fake Firebase and measures every rendered .btn in 58 scenes, at two phone
// widths. report/btn-44.md is what it found.
//
//   node report/btn-44/seed.mjs                      # an account to render
//   node report/btn-44/measure.mjs <rack.css> <out.json> [widths=390,320]
//   node report/btn-44/diff.mjs before.json after.json
//
// Everything is the real app from this repo except what the DevTools Fetch
// domain swaps in: the three Firebase SDK modules (fakes/), rack.css (the
// variant under test) and sw.js (emptied). Every other request off this
// machine is failed, Firebase's hosts explicitly, and service workers are
// bypassed and unregistrable — a worker is its own target, outside this
// page's interception, and an early run of this harness let one fetch the real
// SDK (unauthenticated: the published rules refuse every read and write it
// could have made). CHROME overrides the browser path. Not a tools-check: it
// needs Chrome and python3, and tools-check/touch-target.mjs is the verifier.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const HERE = new URL('.', import.meta.url).pathname;
const REPO = join(HERE, '..', '..');
const [cssPath, outPath, widthArg] = process.argv.slice(2);
const WIDTHS = (widthArg || '390,320').split(',').map(Number);
const CSS = readFileSync(cssPath);
const { UID, seed, live } = JSON.parse(readFileSync(join(HERE, 'seed.json'), 'utf8'));
const FAKES = Object.fromEntries(['firebase-app.js', 'firebase-auth.js', 'firebase-database.js']
  .map(f => [f, readFileSync(join(HERE, 'fakes', f))]));
const PORT = 8765, DPORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', REPO], { stdio: 'ignore' });
const prof = mkdtempSync(join(tmpdir(), 'rack-chrome-'));
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--remote-debugging-port=' + DPORT, '--user-data-dir=' + prof,
  '--no-first-run', '--no-default-browser-check', '--disable-features=ServiceWorker', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { chrome.kill(); } catch {} try { server.kill(); } catch {} try { rmSync(prof, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);

let target = null;
for (let i = 0; i < 100 && !target; i++) {
  await sleep(100);
  try { const l = await (await fetch(`http://127.0.0.1:${DPORT}/json/list`)).json(); target = l.find(t => t.type === 'page'); } catch {}
}
if (!target) { console.error('no chrome'); process.exit(2); }

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); this.handlers = {};
    this.ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id) { const p = this.pending.get(m.id); this.pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
      else (this.handlers[m.method] || []).forEach(h => h(m.params));
    };
  }
  open() { return new Promise(r => { this.ws.onopen = r; }); }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => this.pending.set(id, { res, rej })); }
  on(m, h) { (this.handlers[m] = this.handlers[m] || []).push(h); }
}
const c = new CDP(target.webSocketDebuggerUrl);
await c.open();
await c.send('Page.enable'); await c.send('Runtime.enable');
// No service worker, ever: a worker is its own target, outside this page's
// Fetch interception, so a registered one would fetch the REAL Firebase SDK.
await c.send('Network.enable');
await c.send('Network.setBypassServiceWorker', { bypass: true });
await c.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
const b64 = buf => Buffer.from(buf).toString('base64');
c.on('Fetch.requestPaused', async p => {
  const u = p.request.url;
  try {
    if (/firebaseio\.com|firebasedatabase\.app|identitytoolkit|securetoken|googleapis\.com\/(?!css)/.test(u) && !u.includes('fonts.googleapis.com'))
      return await c.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' });
    const fake = Object.keys(FAKES).find(f => u.includes('gstatic.com/firebasejs/') && u.endsWith('/' + f));
    if (fake) return await c.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, body: b64(FAKES[fake]),
      responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }] });
    if (u.startsWith(`http://127.0.0.1:${PORT}/rack.css`)) return await c.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, body: b64(CSS),
      responseHeaders: [{ name: 'Content-Type', value: 'text/css' }, { name: 'Cache-Control', value: 'no-store' }] });
    if (u.startsWith(`http://127.0.0.1:${PORT}/sw.js`)) return await c.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, body: b64('// none'),
      responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }] });
    if (u.startsWith(`http://127.0.0.1:${PORT}/`) || u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com') || u.startsWith('data:'))
      return await c.send('Fetch.continueRequest', { requestId: p.requestId });
    return await c.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'InternetDisconnected' });
  } catch (e) { /* page navigated away */ }
});

async function ev(expr, timeout = 20000) {
  const r = await Promise.race([
    c.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }),
    sleep(timeout).then(() => ({ exceptionDetails: { text: 'harness timeout' } }))]);
  if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
  return r.result.value;
}

const HELPERS = readFileSync(join(HERE, 'helpers.js'), 'utf8');
let bootScriptId = null;
const loadWaiters = [];
c.on('Page.loadEventFired', () => { while (loadWaiters.length) loadWaiters.shift()(); });
async function boot(width, cfg) {
  await c.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 3, mobile: true });
  if (bootScriptId) await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: bootScriptId });
  const user = cfg.user === undefined ? { uid: UID, email: 'm@example.test', displayName: 'Micah' } : cfg.user;
  const s = JSON.parse(JSON.stringify(seed));
  if (cfg.onboarding === false) delete s.users[UID].onboarding;
  if (cfg.approve && cfg.user) s.access.approved[cfg.user.uid] = { at: Date.now() - 60e3, via: 'invite', code: 'CDEFGHJKMN', name: cfg.user.displayName, email: cfg.user.email };
  if (cfg.tour) s.users[UID].onboarding = { done: true, tourDone: false, at: Date.now() - 864e5, version: 3 };
  const src = `try { localStorage.clear(); } catch {}
    try { Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.reject(new Error('no sw in harness')), controller: null, addEventListener() {}, ready: new Promise(() => {}) }, configurable: true }); } catch {}
    window.__FAKE_USER = ${JSON.stringify(user)};
    window.__SEED = ${JSON.stringify(s)};
    ${cfg.live ? `localStorage.setItem(${JSON.stringify('rack:' + UID + ':activeSession')}, ${JSON.stringify(JSON.stringify(live))});` : ''}`;
  bootScriptId = (await c.send('Page.addScriptToEvaluateOnNewDocument', { source: src })).identifier;
  const loaded = new Promise(r => { loadWaiters.push(r); });
  await c.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html?b=${Date.now()}` });
  await Promise.race([loaded, sleep(15000)]);
  await ev(`(async () => { for (let i = 0; i < 200; i++) { if (document.readyState === 'complete' && document.querySelector('.dock') && document.fonts.status === 'loaded') break; await new Promise(r => setTimeout(r, 50)); } await document.fonts.ready; return document.fonts.check('700 14px Archivo'); })()`);
  const where = await ev(`location.href + ' dock=' + !!document.querySelector('.dock') + ' fonts=' + document.fonts.status`);
  if (process.env.DEBUG) console.log('boot', width, where);
  if (!/dock=true/.test(where)) throw new Error('not booted: ' + where);
  await ev(HELPERS);
  await ev(`__h.settle(${cfg.wait || 1500})`);
}

const SCENES = JSON.parse(readFileSync(join(HERE, 'scenes.json'), 'utf8'));
const out = { css: cssPath, widths: WIDTHS, runs: [] };
for (const width of WIDTHS) {
  for (const g of SCENES) {
    try { await boot(width, g.cfg || {}); }
    catch (e) { out.runs.push({ width, group: g.group, error: 'boot: ' + e.message }); continue; }
    for (const s of g.scenes) {
      try {
        await ev(`(async () => { ${s.js} })()`);
        const m = await ev(`__h.measure(${JSON.stringify(s.name)})`);
        const extra = s.check ? await ev(`(async () => { ${s.check} })()`) : null;
        out.runs.push({ width, group: g.group, scene: s.name, buttons: m, extra });
      } catch (e) {
        out.runs.push({ width, group: g.group, scene: s.name, error: e.message.slice(0, 300) });
        if (s.fatal !== false) break;
      }
    }
  }
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
const errs = out.runs.filter(r => r.error);
console.log('runs', out.runs.length, 'errors', errs.length);
errs.forEach(e => console.log('  ERR', e.width, e.group, e.scene || '', e.error.slice(0, 160)));
cleanup();
process.exit(0);
