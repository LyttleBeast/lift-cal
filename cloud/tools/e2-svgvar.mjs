// e2-svgvar.mjs — does Chrome resolve var() inside an SVG presentation
// attribute (fill="var(--x)")? One headless Chrome, a data: page, the night's lock.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, openSync, closeSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const NIGHT = '/Users/micahflunker/dev/vibes-night';
const LOCK = join(NIGHT, 'harness.lock');
const DPORT = 9361;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let lockFd;
for (let t = 0; ; t++) {
  try { lockFd = openSync(LOCK, 'wx'); writeFileSync(lockFd, String(process.pid)); break; }
  catch { if (t > 160) { console.error('LOCKED'); process.exit(9); } if (t % 8 === 0) console.log('lock held by ' + (existsSync(LOCK) ? readFileSync(LOCK, 'utf8') : '?')); await sleep(15000); }
}
const prof = join(NIGHT, 'tmp', 'e2-svgvar-' + process.pid); mkdirSync(prof, { recursive: true });
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=' + DPORT,
  '--user-data-dir=' + prof, '--use-mock-keychain', '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { chrome.kill(); } catch {} try { closeSync(lockFd); unlinkSync(LOCK); } catch {} };
process.on('exit', cleanup);
let target = null;
for (let i = 0; i < 100 && !target; i++) { await sleep(100); try { const l = await (await fetch(`http://127.0.0.1:${DPORT}/json/list`)).json(); target = l.find(t => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { pending.get(m.id)(m); pending.delete(m.id); } };
await new Promise(r => { ws.onopen = r; });
const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise(r => pending.set(i, r)); };
const html = `<style>:root{--p-red:#d6252b}</style><svg id=s width=50 height=50>
<circle id=a cx=10 cy=10 r=5 stroke="#d6252b" fill="#d6252b"/>
<circle id=b cx=10 cy=10 r=5 stroke="var(--p-red)" fill="var(--p-red)"/>
<circle id=c cx=10 cy=10 r=5 style="stroke:var(--p-red);fill:var(--p-red)"/>
<stop id=d stop-color="var(--p-red)"/><stop id=e stop-color="#d6252b"/></svg>`;
await send('Page.navigate', { url: 'data:text/html,' + encodeURIComponent(html) });
await sleep(800);
const r = await send('Runtime.evaluate', { returnByValue: true, expression: `['a','b','c','d','e'].map(i => { const cs = getComputedStyle(document.getElementById(i)); return i + ' stroke=' + cs.stroke + ' fill=' + cs.fill + ' stop-color=' + cs.stopColor; }).join('\\n')` });
console.log(r.result.result.value);
cleanup(); process.exit(0);
