// harness-smoke.mjs — V59 §3.4.3 capability check: python3 http.server + headless
// Chrome (CDP) + one scene + one screenshot. Serialised through the night's lock.
// Usage: node harness-smoke.mjs <repoDir> <outDir>
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, openSync, closeSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const NIGHT = '/Users/micahflunker/dev/vibes-night';
const [REPO, OUT] = process.argv.slice(2);
const PORT = +(process.env.PORT || 8765), DPORT = +(process.env.CDP_PORT || 9333);
const LOCK = join(NIGHT, 'harness.lock');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let lockFd;
try { lockFd = openSync(LOCK, 'wx'); writeFileSync(lockFd, String(process.pid)); }
catch { console.error('LOCKED: another harness run holds ' + LOCK + ' (' + (existsSync(LOCK) ? readFileSync(LOCK, 'utf8') : '?') + ')'); process.exit(9); }

mkdirSync(OUT, { recursive: true });
const HERE = join(REPO, 'report/btn-44');
const { UID, seed } = JSON.parse(readFileSync(join(HERE, 'seed.json'), 'utf8'));
const FAKES = Object.fromEntries(['firebase-app.js', 'firebase-auth.js', 'firebase-database.js']
  .map(f => [f, readFileSync(join(HERE, 'fakes', f))]));
const prof = join(NIGHT, 'tmp', 'smoke-' + process.pid);
mkdirSync(prof, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', REPO], { stdio: ['ignore', 'ignore', 'pipe'] });
let serverErr = '';
server.stderr.on('data', d => { serverErr += d; });
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--remote-debugging-port=' + DPORT, '--user-data-dir=' + prof, '--use-mock-keychain',
  '--no-first-run', '--no-default-browser-check', '--disable-features=ServiceWorker', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { chrome.kill(); } catch {} try { server.kill(); } catch {} try { closeSync(lockFd); unlinkSync(LOCK); } catch {} };
process.on('exit', cleanup);
console.log(JSON.stringify({ serverPid: server.pid, chromePid: chrome.pid, PORT, DPORT }));

await sleep(600);
if (/Address already in use|OSError/.test(serverErr)) { console.error('BIND ERROR: ' + serverErr); process.exit(3); }
const probe = await fetch(`http://127.0.0.1:${PORT}/index.html`).then(r => r.status).catch(e => 'ERR ' + e.message);
console.log('server /index.html →', probe);

let target = null;
for (let i = 0; i < 100 && !target; i++) {
  await sleep(100);
  try { const l = await (await fetch(`http://127.0.0.1:${DPORT}/json/list`)).json(); target = l.find(t => t.type === 'page'); } catch {}
}
if (!target) { console.error('no chrome'); process.exit(2); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const handlers = {};
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } else (handlers[m.method] || []).forEach(h => h(m.params)); };
await new Promise(r => { ws.onopen = r; });
const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((res, rej) => pending.set(i, { res, rej })); };
const on = (m, h) => { (handlers[m] = handlers[m] || []).push(h); };

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setBypassServiceWorker', { bypass: true });
await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
const b64 = buf => Buffer.from(buf).toString('base64');
const offMachine = [];
on('Fetch.requestPaused', async p => {
  const u = p.request.url;
  try {
    const fake = Object.keys(FAKES).find(f => u.includes('gstatic.com/firebasejs/') && u.endsWith('/' + f));
    if (fake) return await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, body: b64(FAKES[fake]), responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }] });
    if (u.startsWith(`http://127.0.0.1:${PORT}/sw.js`)) return await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, body: b64('// none'), responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }] });
    if (u.startsWith(`http://127.0.0.1:${PORT}/`) || u.startsWith('data:') || u.includes('fonts.googleapis.com/css2') || u.includes('fonts.gstatic.com')) return await send('Fetch.continueRequest', { requestId: p.requestId });
    offMachine.push(u.slice(0, 120));
    return await send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'InternetDisconnected' });
  } catch {}
});
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.clear(); } catch {}
  try { Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.reject(new Error('no sw')), controller: null, addEventListener() {}, ready: new Promise(() => {}) }, configurable: true }); } catch {}
  window.__FAKE_USER = ${JSON.stringify({ uid: UID, email: 'm@example.test', displayName: 'Micah' })};
  window.__SEED = ${JSON.stringify(seed)};` });
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
const booted = await ev(`(async () => { for (let i = 0; i < 200; i++) { if (document.readyState === 'complete' && document.querySelector('.dock') && document.fonts.status === 'loaded') break; await new Promise(r => setTimeout(r, 50)); } await document.fonts.ready; await new Promise(r => setTimeout(r, 1500));
  return { dock: !!document.querySelector('.dock'), archivo: [...document.fonts].some(f => f.family.replace(/["']/g,'') === 'Archivo' && f.status === 'loaded'), view: document.querySelector('.dock button.on, .dock [aria-current]')?.dataset?.view || null, title: document.title }; })()`);
console.log('booted', JSON.stringify(booted));
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
writeFileSync(join(OUT, 'smoke-you-390.png'), Buffer.from(shot.data, 'base64'));
console.log('screenshot bytes', Buffer.from(shot.data, 'base64').length, 'offMachineFailed', offMachine.length, offMachine.slice(0, 5));
cleanup();
process.exit(0);
