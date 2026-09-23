// Counts every database GET the real app makes — path, and the file:line
// that asked — across a boot on You and the tab switches after it.
// report/you-gets.md is what it found.
//
//   node report/btn-44/seed.mjs
//   node report/you-gets/profile.mjs [out.json]
//
// The Phase C harness (report/btn-44), with the fake database swapped for a
// tracing copy (firebase-database.traced.js). Same rules: nothing leaves this
// machine but Google Fonts, and service workers are off.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const HERE = new URL('.', import.meta.url).pathname;
const REPO = join(HERE, '..', '..');
const BTN = join(HERE, '..', 'btn-44');
const out = process.argv[2] || join(tmpdir(), 'you-gets.json');
const { UID, seed } = JSON.parse(readFileSync(join(BTN, 'seed.json'), 'utf8'));
const FAKES = {
  'firebase-app.js': readFileSync(join(BTN, 'fakes', 'firebase-app.js')),
  'firebase-auth.js': readFileSync(join(BTN, 'fakes', 'firebase-auth.js')),
  'firebase-database.js': readFileSync(join(HERE, 'firebase-database.traced.js'))
};
const PORT = 8766, DPORT = 9334;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', REPO], { stdio: 'ignore' });
const prof = mkdtempSync(join(tmpdir(), 'rack-prof-'));
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--remote-debugging-port=' + DPORT, '--user-data-dir=' + prof, '--no-first-run',
  '--no-default-browser-check', '--disable-features=ServiceWorker', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { chrome.kill(); } catch {} try { server.kill(); } catch {} try { rmSync(prof, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);
let target = null;
for (let i = 0; i < 100 && !target; i++) { await sleep(100); try { target = (await (await fetch(`http://127.0.0.1:${DPORT}/json/list`)).json()).find(t => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); let id = 0; const pend = new Map(), on = {};
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } else (on[m.method] || []).forEach(h => h(m.params)); };
await new Promise(r => { ws.onopen = r; });
const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setBypassServiceWorker', { bypass: true });
await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
(on['Fetch.requestPaused'] = []).push(async p => {
  const u = p.request.url, b64 = x => Buffer.from(x).toString('base64');
  try {
    const f = Object.keys(FAKES).find(k => u.includes('gstatic.com/firebasejs/') && u.endsWith('/' + k));
    if (f) return await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, body: b64(FAKES[f]), responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }] });
    if (u.startsWith(`http://127.0.0.1:${PORT}/sw.js`)) return await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, body: b64('// none'), responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }] });
    if (u.startsWith(`http://127.0.0.1:${PORT}/`) || u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com')) return await send('Fetch.continueRequest', { requestId: p.requestId });
    return await send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' });
  } catch {}
});
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
// Cleared on the first load only, so the reload at the end is a WARM boot —
// the mirror and the weight model's per-day cache in place, as on a phone.
await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { if (!sessionStorage.getItem('warm')) { localStorage.clear(); sessionStorage.setItem('warm', '1'); } } catch {}
  try { Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.reject(new Error('no sw')), controller: null, addEventListener() {}, ready: new Promise(() => {}) }, configurable: true }); } catch {}
  window.__FAKE_USER = ${JSON.stringify({ uid: UID, email: 'm@example.test', displayName: 'Micah' })};
  window.__SEED = ${JSON.stringify(seed)};` });
const loaded = new Promise(r => (on['Page.loadEventFired'] = [r]));
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
await loaded;

// Each step: what was done, then every GET since the last mark.
const mark = () => ev('(window.__gets || []).length');
const since = n => ev(`(window.__gets || []).slice(${n})`);
const steps = [];
const step = async (name, js, wait, from) => { const n = from ?? await mark(); if (js) await ev(`(async () => { ${js} })()`); await sleep(wait); steps.push({ name, gets: await since(n) }); };
const dock = v => `document.querySelector('.dock button[data-view="${v}"]').click();`;
// Counted from the first GET of the page: the boot wave starts before the load event.
await step('boot, landing on You (6 s)', null, 6000, 0);
await step('switch to Train', dock('workout'), 2000);
await step('switch back to You', dock('you'), 2000);
await step('switch back to You again, straight away', dock('workout') + ' await new Promise(r => setTimeout(r, 300)); ' + dock('you'), 2000);
await step('switch to Fuel', dock('food'), 2000);
await step('switch to You from Fuel', dock('you'), 2000);
await step('open ⚙ and close it', `document.querySelector('.you-gear').click(); await new Promise(r => setTimeout(r, 600)); document.querySelector('.sheet-backdrop').click();`, 2000);
await step('idle on You for 10 s', null, 10000);
{
  const again = new Promise(r => (on['Page.loadEventFired'] = [r]));
  await send('Page.reload', {});
  await again;
  await step('WARM boot (reload, mirror and caches kept), landing on You (6 s)', null, 6000, 0);
  await step('warm: switch to Train and back to You', dock('workout') + ' await new Promise(r => setTimeout(r, 800)); ' + dock('you'), 2000);
}
writeFileSync(out, JSON.stringify(steps, null, 1));
for (const s of steps) {
  const by = {};
  s.gets.forEach(g => { const k = g.path + '  ←  ' + (g.at || []).slice(0, 5).join(' < '); by[k] = (by[k] || 0) + 1; });
  console.log(`\n${s.name}: ${s.gets.length} GETs`);
  Object.entries(by).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${String(n).padStart(3)} × ${k}`));
}
cleanup();
process.exit(0);
