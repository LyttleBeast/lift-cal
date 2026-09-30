// oxknob-px.mjs — the toggle's knob under web main (53600fa: Oxblood's own
// `.tog:not(.on)::after { background: var(--chalk) }`) and under engine v3 with
// Oxblood on colors.knob (the working tree: --knob from the definition, the
// rule gone). For v1, Chalk, Navy and Oxblood, off and on: the ::after's
// computed background, the track's, and a 3x screenshot of the switches.
// Usage: node oxknob-px.mjs <webWorktree> <outDir>
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, openSync, closeSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const NIGHT = '/Users/micahflunker/dev/vibes-night';
const [REPO, OUT] = process.argv.slice(2);
const PORT = 8794, DPORT = 9394;
const LOCK = join(NIGHT, 'harness.lock');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const VIBES = ['v1', 'chalk', 'navy', 'oxblood'];

let lockFd;
for (let i = 0; !lockFd; i++) {
  try { lockFd = openSync(LOCK, 'wx'); writeFileSync(lockFd, String(process.pid)); }
  catch {
    const pid = existsSync(LOCK) ? +readFileSync(LOCK, 'utf8').trim() : 0;
    let alive = false; try { process.kill(pid, 0); alive = true; } catch (e) { alive = e.code === 'EPERM'; }
    if (pid && !alive) { try { unlinkSync(LOCK); } catch {} continue; }
    if (i % 200 === 0) console.log('waiting for the harness lock held by ' + pid);
    await sleep(300);
  }
}

const SITE = join(OUT, 'site');
const show = (rev, f) => execFileSync('git', ['-C', REPO, 'show', rev + ':' + f]);
for (const side of ['old', 'new']) {
  mkdirSync(join(SITE, side, 'vibes'), { recursive: true });
  const get = f => (side === 'old' ? show('53600fa', f) : readFileSync(join(REPO, f)));
  writeFileSync(join(SITE, side, 'rack.css'), get('rack.css'));
  for (const v of VIBES.slice(1)) writeFileSync(join(SITE, side, 'vibes', v + '.css'), get('vibes/' + v + '.css'));
  const row = on => `<div class="set-row-tog"><div class="set-row-l"><span>Knob</span></div><button class="tog${on ? ' on' : ''}" role="switch" aria-checked="${on}"></button></div>`;
  for (const v of VIBES) {
    writeFileSync(join(SITE, side, v + '.html'), `<!doctype html><html data-vibe="${v}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="rack.css">${VIBES.slice(1).map(x => `<link rel="stylesheet" href="vibes/${x}.css">`).join('')}
<style>*{animation:none!important;transition:none!important}</style></head>
<body><div class="screen-pad"><div class="card"><div class="set-list">${row(false)}${row(true)}</div></div></div></body></html>`);
  }
}

const prof = join(NIGHT, 'tmp', 'oxknob-prof-' + process.pid);
mkdirSync(prof, { recursive: true });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', SITE], { stdio: 'ignore' });
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--remote-debugging-port=' + DPORT, '--user-data-dir=' + prof, '--use-mock-keychain',
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { chrome.kill(); } catch {} try { server.kill(); } catch {} try { closeSync(lockFd); unlinkSync(LOCK); } catch {} };
process.on('exit', cleanup);

await sleep(800);
let target = null;
for (let i = 0; i < 100 && !target; i++) {
  await sleep(100);
  try { const l = await (await fetch(`http://127.0.0.1:${DPORT}/json/list`)).json(); target = l.find(t => t.type === 'page'); } catch {}
}
if (!target) { console.error('no chrome'); process.exit(2); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
await new Promise(r => { ws.onopen = r; });
const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((res, rej) => pending.set(i, { res, rej })); };
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 200, deviceScaleFactor: 3, mobile: true });

const res = {};
let allSame = true, allPx = true;
for (const v of VIBES) {
  res[v] = {};
  for (const side of ['old', 'new']) {
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/${side}/${v}.html` });
    await sleep(300);
    res[v][side] = await ev(`(async () => { for (let i = 0; i < 100 && document.readyState !== 'complete'; i++) await new Promise(r => setTimeout(r, 50));
      await document.fonts.ready; await new Promise(r => setTimeout(r, 300));
      const root = getComputedStyle(document.documentElement);
      const togs = [...document.querySelectorAll('.tog')].map(t => { const a = getComputedStyle(t, '::after'), s = getComputedStyle(t);
        return { cls: t.className, knob: a.backgroundColor, knobBox: [a.width, a.height, a.left, a.top, a.transform].join(' '), track: s.backgroundColor }; });
      return { knobToken: root.getPropertyValue('--knob').trim(), chalk: root.getPropertyValue('--chalk').trim(), steel: root.getPropertyValue('--steel').trim(), togs }; })()`);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const png = Buffer.from(shot.data, 'base64');
    writeFileSync(join(OUT, `knob-${v}-${side}.png`), png);
    res[v][side].png = png;
  }
  const a = PNG.sync.read(res[v].old.png), b = PNG.sync.read(res[v].new.png);
  let diff = 0; for (let i = 0; i < Math.min(a.data.length, b.data.length); i++) if (a.data[i] !== b.data[i]) diff++;
  res[v].sameComputed = JSON.stringify(res[v].old.togs) === JSON.stringify(res[v].new.togs);
  res[v].differingBytes = diff + Math.abs(a.data.length - b.data.length);
  delete res[v].old.png; delete res[v].new.png;
  allSame = allSame && res[v].sameComputed; allPx = allPx && res[v].differingBytes === 0;
}
const out = { vibes: res, allSameComputed: allSame, allPixelIdentical: allPx };
writeFileSync(join(OUT, 'result.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
cleanup();
process.exit(allSame && allPx ? 0 : 1);
