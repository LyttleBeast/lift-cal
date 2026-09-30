// twosent-px.mjs — Chalk's calendar under the old chalk.css (engine3 HEAD) and
// the new one (shape.cue.ink: accent, and the today keyline reading it):
// computed styles and a 3x screenshot of the same calendar, compared.
// Usage: node twosent-px.mjs <webWorktree> <outDir>
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, openSync, closeSync, unlinkSync, existsSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const NIGHT = '/Users/micahflunker/dev/vibes-night';
const [REPO, OUT] = process.argv.slice(2);
const PORT = 8793, DPORT = 9393;
const LOCK = join(NIGHT, 'harness.lock');
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
mkdirSync(join(SITE, 'vibes'), { recursive: true });
writeFileSync(join(SITE, 'rack.css'), readFileSync(join(REPO, 'rack.css')));
writeFileSync(join(SITE, 'vibes/chalk-new.css'), readFileSync(join(REPO, 'vibes/chalk.css')));
// the old side is engine3 before this change (87009ff), whatever HEAD is now
writeFileSync(join(SITE, 'vibes/chalk-old.css'), execFileSync('git', ['-C', REPO, 'show', '87009ff:vibes/chalk.css']));
cpSync(join(REPO, 'vibes/chalk'), join(SITE, 'vibes/chalk'), { recursive: true });
const cells = [
  ['cal-day empty', 1], ['cal-day has-work', 2, ['var(--p-red)', 'var(--p-blue)']], ['cal-day empty today', 3],
  ['cal-day has-work today', 4, ['var(--p-yellow)']], ['cal-day empty', 5], ['cal-day has-work', 6, ['var(--p-green)']], ['cal-day empty', 7]
].map(([c, d, p]) => `<button class="${c}"><div class="cal-daynum">${d}</div>` +
  (p ? `<div class="cal-plates">${p.map(x => `<i style="background:${x};animation:none"></i>`).join('')}</div>` : '') + '</button>').join('');
for (const v of ['old', 'new']) {
  writeFileSync(join(SITE, v + '.html'), `<!doctype html><html data-vibe="chalk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="rack.css"><link rel="stylesheet" href="vibes/chalk-${v}.css">
<style>*{animation:none!important;transition:none!important}</style></head>
<body><div class="screen-pad"><div class="card"><div class="cal-dow"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
<div class="cal-grid">${cells}</div></div></div></body></html>`);
}

const prof = join(NIGHT, 'tmp', 'twosent-prof-' + process.pid);
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
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 300, deviceScaleFactor: 3, mobile: true });

const res = {};
for (const v of ['old', 'new']) {
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/${v}.html` });
  await sleep(300);
  res[v] = await ev(`(async () => { for (let i = 0; i < 100 && document.readyState !== 'complete'; i++) await new Promise(r => setTimeout(r, 50));
    await document.fonts.ready; await new Promise(r => setTimeout(r, 400));
    const root = getComputedStyle(document.documentElement);
    const cs = [...document.querySelectorAll('.cal-day')].map(b => { const s = getComputedStyle(b), n = getComputedStyle(b.querySelector('.cal-daynum'));
      return [b.className, s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor, s.borderTopWidth, s.backgroundColor, n.color, n.fontVariationSettings].join(' | '); });
    return { accent: root.getPropertyValue('--accent').trim(), cue: root.getPropertyValue('--shape-cue-ink').trim(), cells: cs }; })()`);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  res[v].png = Buffer.from(shot.data, 'base64');
  writeFileSync(join(OUT, 'chalk-cal-' + v + '.png'), res[v].png);
}
const a = PNG.sync.read(res.old.png), b = PNG.sync.read(res.new.png);
let diff = 0; for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) diff++;
const out = {
  old: { accent: res.old.accent, cue: res.old.cue, cells: res.old.cells },
  new: { accent: res.new.accent, cue: res.new.cue, cells: res.new.cells },
  sameComputed: JSON.stringify(res.old.cells) === JSON.stringify(res.new.cells),
  size: [a.width, a.height, b.width, b.height], differingBytes: diff, pngIdentical: res.old.png.equals(res.new.png)
};
writeFileSync(join(OUT, 'result.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
cleanup();
process.exit(out.sameComputed && diff === 0 ? 0 : 1);
