// What measure.mjs and prove.mjs share: the night's lock, the two servers,
// Chrome over raw CDP, the Fetch interception (fake Firebase, a pinned Archivo,
// nothing else off this machine), a frozen clock for the page, a small PNG
// reader, and the comparison of two dumps. No npm: node's own zlib and crypto.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, openSync, closeSync, unlinkSync, existsSync, statSync, appendFileSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import net from 'node:net';
import zlib from 'node:zlib';

export const HERE = new URL('.', import.meta.url).pathname;
// The night's working directory: the lock, per-run Chrome profiles and every
// proof output live under it, never under report/ (Pages publishes report/).
export const NIGHT = process.env.HARNESS_HOME || join(homedir(), 'dev', 'vibes-night');
export const LOCK = join(NIGHT, 'harness.lock');
export const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const sha256 = b => createHash('sha256').update(b).digest('hex');
const sha1 = s => createHash('sha1').update(s).digest('hex');

/* ---------- arguments ---------- */
export function parseArgs(argv, booleans = []) {
  const pos = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const eq = a.indexOf('=');
    if (eq > 0) { flags[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const k = a.slice(2);
    if (booleans.includes(k)) flags[k] = true;
    else { if (i + 1 >= argv.length) throw new Error('flag --' + k + ' needs a value'); flags[k] = argv[++i]; }
  }
  return { pos, flags };
}
export const list = v => (v == null || v === true ? null : String(v).split(',').map(s => s.trim()).filter(Boolean));

/* ---------- logging ---------- */
export function logger(file) {
  if (file) mkdirSync(join(file, '..'), { recursive: true });
  return (...a) => {
    const line = a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
    console.log(line);
    if (file) try { appendFileSync(file, new Date().toISOString().slice(11, 19) + ' ' + line + '\n'); } catch {}
  };
}

/* ---------- cleanup: on exit, on a signal, on a crash ---------- */
const cleanups = [];
export const onCleanup = fn => { cleanups.push(fn); };
function runCleanups() { while (cleanups.length) { const f = cleanups.pop(); try { f(); } catch {} } }
process.on('exit', runCleanups);
for (const [sig, code] of [['SIGINT', 130], ['SIGTERM', 143], ['SIGHUP', 129]]) process.on(sig, () => { console.error('harness: ' + sig); runCleanups(); process.exit(code); });
process.on('uncaughtException', e => { console.error('harness FATAL:', e && e.stack || e); runCleanups(); process.exit(1); });
process.on('unhandledRejection', e => { console.error('harness FATAL (rejection):', e && e.stack || e); runCleanups(); process.exit(1); });

/* Remove a scratch directory, but only one under NIGHT/tmp/. */
export function rmScratch(p) {
  const r = resolve(p), root = resolve(NIGHT, 'tmp') + sep;
  if (!r.startsWith(root)) throw new Error('refusing to remove ' + r + ' (not under ' + root + ')');
  rmSync(r, { recursive: true, force: true });
}
/* Output must never land in a repo's report/ (Pages publishes it) or inside a tree under test. */
export function assertOutside(out, trees) {
  const r = resolve(out) + sep;
  if (r.includes(sep + 'report' + sep)) throw new Error('refusing to write proof output under a report/ directory: ' + r);
  for (const t of trees.filter(Boolean)) if (r.startsWith(resolve(t) + sep)) throw new Error('refusing to write proof output inside ' + t);
}

/* ---------- the night's lock: one harness at a time, machine-wide ----------
   Created with O_EXCL, holding our pid. A lock whose pid is dead is reclaimed;
   a live one is waited for (up to waitMs). Released on exit, signal or crash. */
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
export async function acquireLock({ waitMs = 45 * 60e3, log = console.log } = {}) {
  mkdirSync(NIGHT, { recursive: true });
  const t0 = Date.now();
  let said = 0;
  for (;;) {
    try {
      const fd = openSync(LOCK, 'wx');
      writeFileSync(fd, String(process.pid));
      closeSync(fd);
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let txt;
      try { txt = readFileSync(LOCK, 'utf8').trim(); } catch { continue; }
      const pid = parseInt(txt, 10);
      let stale;
      if (pid > 0) stale = !alive(pid);
      else { try { stale = Date.now() - statSync(LOCK).mtimeMs > 30e3; } catch { continue; } }
      if (stale) {
        let again = null;
        try { again = readFileSync(LOCK, 'utf8').trim(); } catch {}
        if (again === txt) { log('lock: reclaiming ' + LOCK + ' from dead pid ' + (txt || '(empty)')); try { unlinkSync(LOCK); } catch {} }
        continue;
      }
      if (Date.now() - t0 > waitMs) throw new Error('lock: ' + LOCK + ' held by live pid ' + pid + ' for over ' + Math.round(waitMs / 1000) + 's');
      if (Date.now() - said > 60e3) { log('lock: waiting — ' + LOCK + ' is held by live pid ' + pid); said = Date.now(); }
      await sleep(2000);
    }
  }
  const release = () => { try { if (readFileSync(LOCK, 'utf8').trim() === String(process.pid)) unlinkSync(LOCK); } catch {} };
  onCleanup(release);
  return release;
}

/* ---------- servers ---------- */
export function portFree(port) {
  return new Promise(res => {
    const s = net.connect({ port, host: '127.0.0.1' });
    s.once('connect', () => { s.destroy(); res(false); });
    s.once('error', () => res(true));
  });
}

// python3 -m http.server, bound to 127.0.0.1. Fails loudly if the port is
// taken (checked before and after: python prints "Address already in use"),
// and proves the port serves THIS tree by comparing index.html's bytes.
export async function startServer(repo, port, log = () => {}) {
  repo = resolve(repo);
  if (!existsSync(join(repo, 'index.html'))) throw new Error('no index.html in ' + repo);
  if (!(await portFree(port))) throw new Error('BIND ERROR: 127.0.0.1:' + port + ' is already in use — something else is listening; refusing to serve ' + repo);
  const proc = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', repo], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '', exited = null;
  // python logs every request to stderr: keep draining it, keep only the tail.
  proc.stderr.on('data', d => { err += d; if (err.length > 16000) err = err.slice(-8000); });
  proc.on('exit', c => { exited = c; });
  onCleanup(() => { try { proc.kill(); } catch {} });
  const want = readFileSync(join(repo, 'index.html'));
  for (let i = 0; i < 100; i++) {
    await sleep(100);
    if (/Address already in use|OSError/.test(err) || exited !== null)
      throw new Error('BIND ERROR: python http.server on 127.0.0.1:' + port + ' failed: ' + (err.trim().split('\n').pop() || 'exit ' + exited));
    let r;
    try { r = await fetch('http://127.0.0.1:' + port + '/index.html'); } catch { continue; }
    const body = Buffer.from(await r.arrayBuffer());
    if (r.status !== 200) throw new Error('port ' + port + ' answered ' + r.status + ' for /index.html');
    if (!body.equals(want)) throw new Error('port ' + port + ' serves an index.html that is not ' + repo + '\'s');
    log('server ' + port + ' → ' + repo + ' (pid ' + proc.pid + ')');
    return { proc, port, repo, stop: () => { try { proc.kill(); } catch {} } };
  }
  throw new Error('python http.server on ' + port + ' never answered');
}

export const CHROME_FLAGS = ['--no-first-run', '--no-default-browser-check', '--disable-features=ServiceWorker', '--disable-gpu', '--hide-scrollbars', '--use-mock-keychain'];

// Headless Chrome with its own profile. Refuses a CDP port something already
// answers on (it would be driving somebody else's browser), and then confirms
// that the browser answering on the port is the process it spawned
// (SystemInfo.getProcessInfo names the browser process's pid).
export async function startChrome({ cdpPort, profile, flags = [], log = () => {} }) {
  if (!(await portFree(cdpPort))) throw new Error('BIND ERROR: CDP port ' + cdpPort + ' is already in use — another Chrome? refusing to drive it');
  mkdirSync(profile, { recursive: true });
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + cdpPort, '--user-data-dir=' + profile, ...CHROME_FLAGS, ...flags, 'about:blank'], { stdio: 'ignore' });
  let exited = null;
  proc.on('exit', c => { exited = c; });
  onCleanup(() => { try { proc.kill(); } catch {} });
  let target = null, version = null;
  for (let i = 0; i < 200 && !target; i++) {
    if (exited !== null) throw new Error('chrome exited (' + exited + ') before answering on ' + cdpPort);
    try {
      version = version || await (await fetch('http://127.0.0.1:' + cdpPort + '/json/version')).json();
      const l = await (await fetch('http://127.0.0.1:' + cdpPort + '/json/list')).json();
      target = l.find(t => t.type === 'page');
    } catch {}
    if (!target) await sleep(100);
  }
  if (!target) throw new Error('no page target on ' + cdpPort);
  const b = new CDP(version.webSocketDebuggerUrl);
  await b.open();
  const info = await b.send('SystemInfo.getProcessInfo');
  b.ws.close();
  const bp = (info.processInfo || []).find(p => p.type === 'browser');
  if (!bp || bp.id !== proc.pid) throw new Error('the browser on ' + cdpPort + ' is pid ' + (bp && bp.id) + ', not the Chrome this harness spawned (' + proc.pid + ') — refusing to drive it');
  log('chrome ' + (version && version.Browser) + ' on ' + cdpPort + ' (pid ' + proc.pid + ', profile ' + profile + ')');
  return { proc, target, version, stop: () => { try { proc.kill(); } catch {} } };
}

/* ---------- CDP ---------- */
export class CDP {
  constructor(url) {
    this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); this.handlers = {};
    this.ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id) { const p = this.pending.get(m.id); if (!p) return; this.pending.delete(m.id); m.error ? p.rej(new Error(p.method + ': ' + JSON.stringify(m.error))) : p.res(m.result); }
      else (this.handlers[m.method] || []).forEach(h => h(m.params));
    };
    this.ws.onclose = () => { for (const p of this.pending.values()) p.rej(new Error('CDP socket closed')); this.pending.clear(); };
  }
  open() { return new Promise((r, j) => { this.ws.onopen = r; this.ws.onerror = j; }); }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => this.pending.set(id, { res, rej, method })); }
  on(m, h) { (this.handlers[m] = this.handlers[m] || []).push(h); }
  // Runtime.evaluate with a wall-clock timeout, returning the value.
  async ev(expr, timeout = 20000) {
    const r = await Promise.race([
      this.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }),
      sleep(timeout).then(() => ({ exceptionDetails: { text: 'harness timeout after ' + timeout + 'ms' } }))]);
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
    return r.result.value;
  }
}

/* ---------- the page's clock and dice ----------
   Injected before any of the app's code, on both sides alike. Date.now() and
   `new Date()` return NOW, frozen: timers still fire (setTimeout is wall time),
   but every date, elapsed time and rotation the app derives from the clock is
   the same on every run. performance.now() is frozen too, Intl formatting with
   no date gets NOW, Math.random is a seeded mulberry32, and
   crypto.getRandomValues / randomUUID draw from it. window.__realNow keeps the
   wall clock for the harness's own waits (helpers.js). */
export function pageClockScript({ now, perfNow = 10000, seed = 0x5eed59 }) {
  return `(() => {
  const NOW = ${Number(now)}, PERF = ${Number(perfNow)};
  const RD = Date, realNow = RD.now.bind(RD);
  try { Object.defineProperty(window, '__realNow', { value: realNow, configurable: true }); } catch {}
  const FrozenDate = function (...a) { if (!new.target) return new RD(NOW).toString(); return a.length ? new RD(...a) : new RD(NOW); };
  Object.defineProperty(FrozenDate, 'name', { value: 'Date' });
  FrozenDate.prototype = RD.prototype; FrozenDate.now = () => NOW; FrozenDate.parse = RD.parse; FrozenDate.UTC = RD.UTC;
  window.Date = FrozenDate;
  try { performance.now = () => PERF; } catch {}
  try {
    const DTF = Intl.DateTimeFormat.prototype, fd = Object.getOwnPropertyDescriptor(DTF, 'format');
    if (fd && fd.get) Object.defineProperty(DTF, 'format', { configurable: true, get() { const f = fd.get.call(this); return d => f(d === undefined ? NOW : d); } });
    const ftp = DTF.formatToParts; DTF.formatToParts = function (d) { return ftp.call(this, d === undefined ? NOW : d); };
  } catch {}
  let s = ${Number(seed)} >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Math.random = rnd;
  try { crypto.getRandomValues = arr => { const b = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength); for (let i = 0; i < b.length; i++) b[i] = (rnd() * 256) | 0; return arr; }; } catch {}
  try { crypto.randomUUID = () => { const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const h = [...b].map(x => x.toString(16).padStart(2, '0')).join(''); return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20); }; } catch {}
})();`;
}

/* ---------- Fetch interception ----------
   The three Firebase SDK modules → fakes/; sw.js → empty; the Archivo css2
   request → a local @font-face whose src is a URL this also answers, with the
   pinned TTF's bytes; the local servers pass; everything else off this machine
   fails (Firebase's hosts explicitly). `stats` counts what was answered, and
   `onRequest`, if given, hears every URL the page asked for, before any of it.
   `fontCssUrl`, if given (a function returning the URL rack.css line 1 asks
   for), narrows the pinned answer to that one URL, byte for byte: any other
   css2 request fails and is counted (fontCssUnexpected), so a changed or extra
   font request is not quietly handed the same face. */
export const PINNED_FONT_URL = 'https://fonts.gstatic.com/pinned/archivo/Archivo-wdth-wght.ttf';
export const PINNED_FONT_CSS = `/* pinned by report/btn-44/harness-lib.mjs: one local variable Archivo, identical for both trees */
@font-face {
  font-family: 'Archivo';
  font-style: normal;
  font-weight: 300 900;
  font-stretch: 62% 125%;
  font-display: swap;
  src: url(${PINNED_FONT_URL}) format('truetype');
}
`;
export function loadFakes(dir = join(HERE, 'fakes')) {
  return Object.fromEntries(['firebase-app.js', 'firebase-auth.js', 'firebase-database.js'].map(f => [f, readFileSync(join(dir, f))]));
}
export function intercept(c, { ports, fakes, font = null, overrides = {}, passFonts = false, stats = {}, onRequest = null, fontCssUrl = null }) {
  const b64 = buf => Buffer.from(buf).toString('base64');
  const local = u => ports.some(p => u.startsWith('http://127.0.0.1:' + p + '/'));
  const bump = k => { stats[k] = (stats[k] || 0) + 1; };
  const fulfil = (p, body, type, extra = []) => c.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, body: b64(body),
    responseHeaders: [{ name: 'Content-Type', value: type }, { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Cache-Control', value: 'no-store' }, ...extra] });
  c.on('Fetch.requestPaused', async p => {
    const u = p.request.url;
    if (onRequest) try { onRequest(u, p.request.method); } catch {}
    try {
      if (/firebaseio\.com|firebasedatabase\.app|identitytoolkit|securetoken|googleapis\.com\/(?!css)/.test(u) && !u.includes('fonts.googleapis.com')) {
        bump('blockedFirebase');
        return await c.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' });
      }
      const fake = Object.keys(fakes).find(f => u.includes('gstatic.com/firebasejs/') && u.endsWith('/' + f));
      if (fake) { bump('fake:' + fake); return await fulfil(p, fakes[fake], 'application/javascript'); }
      if (font) {
        const want = fontCssUrl ? fontCssUrl() : null;
        if (want ? u === want : /^https:\/\/fonts\.googleapis\.com\/css2\?family=Archivo[:&]/.test(u)) { bump('fontCss'); return await fulfil(p, PINNED_FONT_CSS, 'text/css; charset=utf-8'); }
        if (want && /^https:\/\/fonts\.googleapis\.com\//.test(u)) {
          bump('fontCssUnexpected');
          (stats.fontCssUnexpectedUrls = stats.fontCssUnexpectedUrls || []).length < 20 && stats.fontCssUnexpectedUrls.push(u.slice(0, 300));
          return await c.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'InternetDisconnected' });
        }
        if (u === PINNED_FONT_URL) { bump('fontFile'); return await fulfil(p, font, 'font/ttf'); }
      }
      for (const [path, v] of Object.entries(overrides)) {
        if (ports.some(port => u.startsWith('http://127.0.0.1:' + port + path))) { bump('override:' + path); return await fulfil(p, v.body, v.type); }
      }
      if (ports.some(port => u.startsWith('http://127.0.0.1:' + port + '/sw.js'))) { bump('swEmptied'); return await fulfil(p, '// none', 'application/javascript'); }
      if (local(u) || u.startsWith('data:') || u.startsWith('blob:')) return await c.send('Fetch.continueRequest', { requestId: p.requestId });
      if (passFonts && (u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com'))) { bump('fontsPassed'); return await c.send('Fetch.continueRequest', { requestId: p.requestId }); }
      bump('offMachineFailed');
      (stats.failed = stats.failed || []).length < 50 && stats.failed.push(u.slice(0, 160));
      return await c.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'InternetDisconnected' });
    } catch (e) { /* the page navigated away */ }
  });
  return stats;
}

/* ---------- PNG: a reader (zlib only) and a region diff ---------- */
export function decodePNG(buf) {
  const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');
  let o = 8, w = 0, h = 0, depth = 0, ctype = 0, inter = 0;
  const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8), data = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; inter = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    o += 12 + len;
  }
  const bpp = { 2: 3, 6: 4, 0: 1, 4: 2 }[ctype];
  if (depth !== 8 || !bpp || inter) throw new Error('unsupported PNG (depth ' + depth + ', colour type ' + ctype + ', interlace ' + inter + ')');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride, up = dst - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0, b = y ? out[up + x] : 0, cc = y && x >= bpp ? out[up + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - cc, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - cc); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : cc; }
      out[dst + x] = v & 255;
    }
  }
  return { width: w, height: h, bpp, data: out };
}

// Every differing pixel, clustered: 16px tiles that hold a difference are
// joined 8-way into regions; each region reports its tight box and pixel count,
// in device pixels and in CSS pixels (÷ dpr).
export function diffPNG(bufA, bufB, dpr = 1, maxRegions = 100) {
  const A = decodePNG(bufA), B = decodePNG(bufB);
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const T = 16, tw = Math.ceil(w / T), th = Math.ceil(h / T);
  const cnt = new Uint32Array(tw * th), x0 = new Int32Array(tw * th).fill(1e9), y0 = new Int32Array(tw * th).fill(1e9), x1 = new Int32Array(tw * th).fill(-1), y1 = new Int32Array(tw * th).fill(-1);
  let total = 0, maxDelta = 0;
  const px = (I, x, y) => { const i = (y * I.width + x) * I.bpp; return I.bpp === 4 ? I.data.readUInt32BE(i) : I.bpp === 3 ? (I.data[i] << 16 | I.data[i + 1] << 8 | I.data[i + 2]) : I.bpp === 2 ? I.data.readUInt16BE(i) : I.data[i]; };
  const same = A.bpp === B.bpp;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let d;
    // maxDelta: the largest difference in any one channel, 0–255 (255 when the
    // two PNGs do not share a colour type) — the re-boot backstop's signature.
    if (same) { const ia = (y * A.width + x) * A.bpp, ib = (y * B.width + x) * B.bpp; d = false; for (let k = 0; k < A.bpp; k++) { const q = Math.abs(A.data[ia + k] - B.data[ib + k]); if (q) { d = true; if (q > maxDelta) maxDelta = q; } } }
    else { d = px(A, x, y) !== px(B, x, y); if (d) maxDelta = 255; }
    if (!d) continue;
    total++;
    const t = ((y / T) | 0) * tw + ((x / T) | 0);
    cnt[t]++; if (x < x0[t]) x0[t] = x; if (y < y0[t]) y0[t] = y; if (x > x1[t]) x1[t] = x; if (y > y1[t]) y1[t] = y;
  }
  const regions = [], seen = new Uint8Array(tw * th);
  for (let t = 0; t < tw * th; t++) {
    if (!cnt[t] || seen[t]) continue;
    const r = { x0: 1e9, y0: 1e9, x1: -1, y1: -1, pixels: 0 }, stack = [t];
    seen[t] = 1;
    while (stack.length) {
      const q = stack.pop(), qx = q % tw, qy = (q / tw) | 0;
      r.pixels += cnt[q]; r.x0 = Math.min(r.x0, x0[q]); r.y0 = Math.min(r.y0, y0[q]); r.x1 = Math.max(r.x1, x1[q]); r.y1 = Math.max(r.y1, y1[q]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = qx + dx, ny = qy + dy;
        if (nx < 0 || ny < 0 || nx >= tw || ny >= th) continue;
        const n = ny * tw + nx;
        if (cnt[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
      }
    }
    regions.push(r);
  }
  regions.sort((p, q) => q.pixels - p.pixels);
  const fmt = r => ({ x: r.x0, y: r.y0, w: r.x1 - r.x0 + 1, h: r.y1 - r.y0 + 1, pixels: r.pixels,
    css: { x: +(r.x0 / dpr).toFixed(1), y: +(r.y0 / dpr).toFixed(1), w: +((r.x1 - r.x0 + 1) / dpr).toFixed(1), h: +((r.y1 - r.y0 + 1) / dpr).toFixed(1) } });
  const sizeMismatch = A.width !== B.width || A.height !== B.height;
  return { sizeA: [A.width, A.height], sizeB: [B.width, B.height], sizeMismatch, diffPixels: total, maxDelta, regionCount: regions.length, regions: regions.slice(0, maxRegions).map(fmt), allRegions: regions.map(r => [r.x0, r.y0, r.x1, r.y1]) };
}

// The dock icons' raster states, as a signature (prove.mjs's backstop): a
// difference (diffPNG) of at most sig.maxPixels pixels, at most sig.maxDelta
// levels in any channel, every differing region inside the box of one of the
// dock's icons (its <svg>s, 2 device px of margin). `dock` is capture.js
// dockBox(), in CSS pixels. A full-page capture (captureBeyondViewport) draws
// the fixed dock where it sits in the viewport, offset by the scroll — on
// record, at page y 780–844 of a 1355px-tall page, not at its bottom.
// The icons, not the whole dock: every flip on record sits in an icon (You,
// Steps, Weight), and the dock's box also holds its labels and its ground,
// where a first-load change of a few pixels (a 1px underline 3 levels off the
// ground under TRAIN's I: 30 px, 1 level) was forgiven. A dock with no icons
// read forgives nothing.
export function isDockRasterNoise(d, dock, dpr, sig) {
  if (!dock || d.sizeMismatch || !Array.isArray(dock.icons) || !dock.icons.length) return false;
  if (d.diffPixels > sig.maxPixels || d.maxDelta > sig.maxDelta) return false;
  const sy = dock.scrollY || 0, sx = dock.scrollX || 0;
  const boxes = dock.icons.map(b => [(b.left + sx) * dpr - 2, (b.top + sy) * dpr - 2, (b.right + sx) * dpr + 2, (b.bottom + sy) * dpr + 2]);
  return d.allRegions.every(([rx0, ry0, rx1, ry1]) => boxes.some(([x0, y0, x1, y1]) => rx0 >= x0 && rx1 <= x1 && ry0 >= y0 && ry1 <= y1));
}

// The backstop's decision, given every distinct PNG each side produced for a
// scene (A, B: Map sha -> whatever `load` turns into the PNG's bytes). Forgiven
// only if the sides share a PNG, every PNG B produced is one A produced or one
// in `known` (a Set or Map of shas: the base tree produced it on record,
// knownBaseStates), every other PNG either side produced differs from the
// shared one only as the dock icons' raster states do, and no re-boot dump
// differed. The old rule — any PNG in common — forgave a change that shows on
// some loads only, the moment one re-boot came up clean; the signature alone
// forgave one inside an icon's box (the P review, round 3: a first-load shadow
// cast into the Train icon, 37 px, 1 level). A's own states need no record.
export function backstopDecide({ A, B, load, dock, dpr, sig, rebootDiffs = 0, known = null }) {
  const shared = [...B.keys()].filter(k => A.has(k));
  if (!shared.length) return { forgiven: false, shared, why: 'no PNG in common' };
  if (rebootDiffs) return { forgiven: false, shared, why: 're-boot dumps differ from A\'s first' };
  const ref = load(A.get(shared[0]));
  const unknown = [...B.keys()].filter(k => !A.has(k) && !(known && known.has(k)));
  if (unknown.length) return { forgiven: false, shared, unknown, worst: diffPNG(load(B.get(unknown[0])), ref, dpr), why: 'B state ' + unknown.map(k => String(k).slice(0, 16)).join(', ') + ' is not one A produced in this run, nor one the base tree produced on record' };
  for (const [side, m] of [['A', A], ['B', B]]) for (const [sha, f] of m) {
    if (shared.includes(sha)) continue;
    const d = diffPNG(load(f), ref, dpr);
    if (!isDockRasterNoise(d, dock, dpr, sig)) return { forgiven: false, shared, worst: d, why: side + ' state ' + String(sha).slice(0, 16) + ' differs from the shared one outside the dock-raster signature (' + d.diffPixels + ' px, up to ' + d.maxDelta + ' levels, ' + d.regionCount + ' region(s))' };
  }
  return { forgiven: true, shared };
}

/* ---------- the raster states the base tree produced, on record ----------
   A PNG B produced that A did not produce in the same run is forgiven only if
   the base tree produced those very bytes before (backstopDecide's `known`):
   for the same scene at the same width, on a side of an earlier prove run that
   was a clean tree at the base's sha (not dirty; every file it served at its
   HEAD), under the same conditions (renderConditions), measured by a clean
   harness this one descends from. And, since a scene's steps can change from
   one harness commit to the next, only from a run whose base side(s) also
   produced one of this run's A PNGs for that scene: the same page, in another
   of its raster states. A plant's side (dirty, or not a git tree), an engine's
   side, and a run under another safe area, scheme or data-vibe never count. */
export function renderConditions(S, width) {
  return JSON.stringify([S.nowMs ?? null, S.tz ?? null, S.locale ?? null, S.colorScheme ?? null, S.dpr ?? null, S.height ?? null, (S.safeArea || {})[width] || null,
    (S.seed && S.seed.sha256) || null, (S.font && S.font.sha256) || null, S.chrome || null, (S.chromeFlags || []).join(' '), S.relayer ?? null, S.vibe ?? null, S.dataVibe ?? null]);
}
// Every prove run under a root (a directory holding summary.json and A/, at
// most three levels down), each summary kept only for what knownBaseStates
// reads. Walked once per root per process.
const runsCache = new Map();
function runsUnder(root) {
  const key = resolve(root);
  if (runsCache.has(key)) return runsCache.get(key);
  const out = [];
  const walk = (d, depth) => {
    let names = [];
    try { names = readdirSync(d); } catch { return; }
    for (const f of names) {
      const p = join(d, f);
      let st; try { st = statSync(p); } catch { continue; }
      if (!st.isDirectory()) continue;
      if (existsSync(join(p, 'summary.json')) && existsSync(join(p, 'A'))) {
        let S; try { S = JSON.parse(readFileSync(join(p, 'summary.json'), 'utf8')); } catch { continue; }
        const side = x => (S[x] ? { sha: S[x].sha || null, dirty: S[x].dirty } : null);
        const pv = S.provenance ? { dirty: S.provenance.dirty || null, A: S.provenance.A ? { notAtHead: S.provenance.A.notAtHead } : null, B: S.provenance.B ? { notAtHead: S.provenance.B.notAtHead } : null } : null;
        out.push({ dir: p, S: { mode: S.mode, harness: S.harness || null, A: side('A'), B: side('B'), provenance: pv,
          nowMs: S.nowMs, tz: S.tz, locale: S.locale, colorScheme: S.colorScheme, dpr: S.dpr, height: S.height, safeArea: S.safeArea, seed: S.seed, font: S.font,
          chrome: S.chrome, chromeFlags: S.chromeFlags, relayer: S.relayer, vibe: S.vibe, dataVibe: S.dataVibe,
          scenes: Object.fromEntries(Object.entries(S.scenes || {}).map(([k, x]) => [k, { pngSha: x.pngSha || null }])) } });
      } else if (depth < 2) walk(p, depth + 1);
    }
  };
  walk(key, 0);
  runsCache.set(key, out);
  return out;
}
const fileShas = new Map();
const fileSha = p => { if (!fileShas.has(p)) fileShas.set(p, sha256(readFileSync(p))); return fileShas.get(p); };
// Does the harness at `sha` come before this one (an ancestor of its HEAD)?
const descends = new Map();
export function harnessDescends(sha) {
  if (!sha) return false;
  if (!descends.has(sha)) descends.set(sha, spawnSync('git', ['-C', resolve(HERE, '..', '..'), 'merge-base', '--is-ancestor', sha, 'HEAD']).status === 0);
  return descends.get(sha);
}
// The base tree's own PNGs of one scene at one width, on record (see above).
// sha: the base's commit; cond: renderConditions of this run at this width;
// witnesses: every PNG this run's A produced for the scene. Returns known (sha
// -> where it was found), and how many runs were read and how many counted.
export function knownBaseStates({ roots, skip = [], sha, cond, width, scene, witnesses, harnessOk = harnessDescends }) {
  const known = new Map();
  let runs = 0, admissible = 0;
  if (!sha) return { known, runs, admissible };
  const skipped = new Set(skip.map(p => resolve(p)));
  for (const root of roots) for (const { dir, S } of runsUnder(root)) {
    if (skipped.has(resolve(dir))) continue;
    runs++;
    if (renderConditions(S, width) !== cond) continue;
    if (!S.harness || !S.harness.sha || S.harness.dirty !== false || !harnessOk(S.harness.sha)) continue;
    const pv = S.provenance, sc = S.scenes[scene + '@' + width];
    const states = new Map();
    ['A', 'B'].forEach((x, i) => {
      const t = S[x];
      // Clean when the run began (t.dirty) and when it ended (pv.dirty, which
      // a harness before the P review's round 2 did not record), and every
      // file it served at its HEAD.
      if (!t || t.sha !== sha || t.dirty !== false) return;
      if (!pv || (pv.dirty && pv.dirty[x] !== false) || !pv[x] || !Array.isArray(pv[x].notAtHead) || pv[x].notAtHead.length) return;
      if (sc && Array.isArray(sc.pngSha) && sc.pngSha[i] && !states.has(sc.pngSha[i])) states.set(sc.pngSha[i], dir + ' ' + x + ' first attempt');
      const d = join(dir, x, String(width));
      let files = [];
      try { files = readdirSync(d); } catch {}
      for (const f of files.sort()) {
        if (f !== scene + '.png' && !(f.startsWith(scene + '.') && new RegExp('^\\.' + x + '-r\\d+\\.png$').test(f.slice(scene.length)))) continue;
        const h = fileSha(join(d, f));
        if (!states.has(h)) states.set(h, dir + ' ' + x + '/' + width + '/' + f);
      }
    });
    if (![...states.keys()].some(h => witnesses.has(h))) continue;
    admissible++;
    for (const [h, from] of states) if (!known.has(h)) known.set(h, from);
  }
  return { known, runs, admissible };
}

// A PNG from raw RGBA (8-bit, filter 0): for the self-test's synthetic states.
export function encodePNG(w, h, rgba) {
  const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = buf => { let c = -1; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- dumps ----------
   A dump (capture.js) interns style tuples. hashDump adds each tuple's hash and
   each element's hash over everything compared: its path, the tuples of the
   element and its pseudos (and any other pseudo-element a rule styles, under
   x), its rect, its attributes (every one but style; on SVG, paint is compared
   computed, under svg), its own text and its value. Two elements with equal
   hashes are identical in all of them. DUMP_FORMAT names this shape: a baseline
   of another format cannot be compared with (prove.mjs --against refuses it). */
export const DUMP_FORMAT = 2;
const sortedObj = o => (o ? Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : null);
export function hashDump(d) {
  const sh = d.styles.map(v => sha1(v.join('\u0001')));
  d.styleHash = sh;
  const H = k => (k === undefined ? null : sh[k]);
  for (const e of d.els) {
    const x = e.x ? Object.keys(e.x).sort().map(k => [k, H(e.x[k])]) : null;
    e.h = sha1(JSON.stringify([e.p, H(e.s), H(e.b), H(e.a), H(e.ph), H(e.mk), x, e.r, sortedObj(e.at), e.svg || null, e.t || null, e.v === undefined ? null : e.v]));
  }
  return d;
}

// The <head> entries that count as a multiset: everything but scripts and the
// stylesheet and preload links (the engine adds a head script by design). A
// meta, the title, the manifest and icon links, a <base> — anything the phone
// reads from the head — has to match.
const headCounts = h => !/^script\b/.test(h) && !/^link\b.*\brel=(stylesheet|preload|modulepreload|prefetch)\b/.test(h);
// The stylesheet links, each whole (the P review, round 3). A link's media,
// disabled, title or rel is a condition on its entire sheet, and a capture
// sees only the condition it runs under: rack.css linked with
// media="(prefers-color-scheme: dark)" styles every capture here and nothing
// on a Light Mode iPhone. So every sheet both sides link is compared with
// every attribute it carries (capture.js writes them all), and in its order
// among them, which is the cascade's. A sheet only B links is a vibe's: not a
// head difference (css-static checks its rules are scoped to its vibe).
const sheetLink = h => /^link\b.*\brel=stylesheet\b/.test(h);
const hrefOf = h => { const m = h.match(/\shref=(\S*)/); return m ? m[1] : ''; };
const sheetKeys = list => { const n = new Map(); return list.map(h => { const k = hrefOf(h), i = n.get(k) || 0; n.set(k, i + 1); return i ? k + ' #' + i : k; }); };
export const writeGz = (file, obj) => writeFileSync(file, zlib.gzipSync(JSON.stringify(obj), { level: 6 }));
export const readGz = file => JSON.parse(zlib.gunzipSync(readFileSync(file)).toString('utf8'));

const PSEUDO = { s: '', b: '::before', a: '::after', ph: '::placeholder', mk: '::marker' };
const bucket = () => ({ count: 0, first: [] });
export const DIFF_KINDS = ['styleDiffs', 'rectDiffs', 'svgDiffs', 'textDiffs', 'valueDiffs', 'structDiffs', 'attrDiffs', 'headDiffs', 'stateDiffs', 'keyframeDiffs'];
export function compareDumps(A, B, first = 20) {
  const res = { elements: [A.els.length, B.els.length], structDiffs: bucket(), styleDiffs: { count: 0, elements: 0, first: [] },
    rectDiffs: bucket(), svgDiffs: bucket(), textDiffs: bucket(), valueDiffs: bucket(),
    attrDiffs: bucket(), headDiffs: bucket(), stateDiffs: bucket(), keyframeDiffs: bucket(), info: {} };
  const push = (bucket, item) => { bucket.count++; if (bucket.first.length < first) bucket.first.push(item); };
  const sameProps = A.props.length === B.props.length && A.props.every((p, i) => p === B.props[i]);
  let bIdx = null;
  if (!sameProps) { res.info.propsDiffer = { onlyA: A.props.filter(p => !B.props.includes(p)), onlyB: B.props.filter(p => !A.props.includes(p)) }; bIdx = new Map(B.props.map((p, i) => [p, i])); }
  const mapB = new Map(B.els.map(e => [e.p, e]));
  const common = new Set();
  for (const ea of A.els) {
    const eb = mapB.get(ea.p);
    if (!eb) { push(res.structDiffs, { path: ea.p, only: 'A' }); continue; }
    common.add(ea.p);
    if (ea.h === eb.h) continue;
    let styled = false;
    for (const k of Object.keys(PSEUDO)) {
      if (ea[k] === undefined && eb[k] === undefined) continue;
      const va = ea[k] === undefined ? null : A.styles[ea[k]], vb = eb[k] === undefined ? null : B.styles[eb[k]];
      if (va && vb && A.styleHash[ea[k]] === B.styleHash[eb[k]] && sameProps) continue;
      if (!va || !vb) { styled = true; push(res.styleDiffs, { path: ea.p, pseudo: PSEUDO[k], prop: '*', A: va ? 'present' : 'absent', B: vb ? 'present' : 'absent' }); continue; }
      A.props.forEach((p, i) => {
        const j = sameProps ? i : bIdx.get(p);
        const b = j === undefined ? undefined : vb[j];
        if (va[i] !== b) { styled = true; push(res.styleDiffs, { path: ea.p, pseudo: PSEUDO[k], prop: p, A: va[i], B: b }); }
      });
    }
    // Any other pseudo-element a rule styles (::first-letter, ::first-line, …).
    for (const k of new Set([...Object.keys(ea.x || {}), ...Object.keys(eb.x || {})])) {
      const ia = ea.x && ea.x[k], ib = eb.x && eb.x[k];
      if (ia !== undefined && ib !== undefined && A.styleHash[ia] === B.styleHash[ib] && sameProps) continue;
      if (ia === undefined || ib === undefined) { styled = true; push(res.styleDiffs, { path: ea.p, pseudo: k, prop: '*', A: ia === undefined ? 'absent' : 'present', B: ib === undefined ? 'absent' : 'present' }); continue; }
      const va = A.styles[ia], vb = B.styles[ib];
      A.props.forEach((p, i) => { const j = sameProps ? i : bIdx.get(p); const b = j === undefined ? undefined : vb[j]; if (va[i] !== b) { styled = true; push(res.styleDiffs, { path: ea.p, pseudo: k, prop: p, A: va[i], B: b }); } });
    }
    if (styled) res.styleDiffs.elements++;
    if (ea.r.some((v, i) => v !== eb.r[i])) push(res.rectDiffs, { path: ea.p, A: ea.r, B: eb.r });
    if (JSON.stringify(ea.svg || null) !== JSON.stringify(eb.svg || null)) push(res.svgDiffs, { path: ea.p, A: ea.svg || null, B: eb.svg || null });
    if ((ea.t || null) !== (eb.t || null)) push(res.textDiffs, { path: ea.p, A: ea.t || null, B: eb.t || null });
    if (ea.v !== eb.v) push(res.valueDiffs, { path: ea.p, A: ea.v, B: eb.v });
    // Every attribute but style: aria-label, title, alt, placeholder, href,
    // role, data-*, class, id… (what VoiceOver reads is part of what Rack says).
    const aa = ea.at || {}, ab = eb.at || {};
    for (const k of new Set([...Object.keys(aa), ...Object.keys(ab)])) if (aa[k] !== ab[k]) push(res.attrDiffs, { path: ea.p, attr: k, A: aa[k] === undefined ? null : aa[k], B: ab[k] === undefined ? null : ab[k] });
  }
  for (const eb of B.els) if (!common.has(eb.p)) push(res.structDiffs, { path: eb.p, only: 'B' });
  // The head: counted apart from scripts, preloads and stylesheet links
  // (headCounts); the stylesheet links below, each whole (sheetLink).
  const ha = (A.head || []).filter(headCounts), hb = (B.head || []).filter(headCounts);
  const left = [...hb];
  for (const h of ha) { const i = left.indexOf(h); if (i >= 0) left.splice(i, 1); else push(res.headDiffs, { entry: h, only: 'A' }); }
  for (const h of left) push(res.headDiffs, { entry: h, only: 'B' });
  // The same entries in another order still count once.
  if (!res.headDiffs.count && ha.some((h, i) => h !== hb[i])) push(res.headDiffs, { entry: '(order)', A: ha, B: hb });
  // The stylesheet links (sheetLink): each one A links, by href, the same
  // entry in B, attributes and all; the ones both link, in the same order.
  const la = (A.head || []).filter(sheetLink), lb = (B.head || []).filter(sheetLink);
  const ka = sheetKeys(la), kb = sheetKeys(lb);
  const byB = new Map(kb.map((k, i) => [k, lb[i]]));
  ka.forEach((k, i) => {
    if (!byB.has(k)) push(res.headDiffs, { entry: la[i], only: 'A' });
    else if (byB.get(k) !== la[i]) push(res.headDiffs, { entry: 'stylesheet ' + k, A: la[i], B: byB.get(k) });
  });
  const inA = new Set(ka), bothA = ka.filter(k => byB.has(k)), bothB = kb.filter(k => inA.has(k));
  if (bothA.some((k, i) => k !== bothB[i])) push(res.headDiffs, { entry: '(stylesheet order)', A: bothA, B: bothB });
  if (kb.some(k => !inA.has(k))) res.info.headSheetsOnlyB = lb.filter((h, i) => !inA.has(kb[i]));
  if ((A.doc && A.doc.title) !== (B.doc && B.doc.title)) push(res.headDiffs, { entry: 'document.title', A: A.doc && A.doc.title, B: B.doc && B.doc.title });
  if (JSON.stringify(A.head) !== JSON.stringify(B.head)) res.info.head = { A: A.head, B: B.head };
  if (JSON.stringify(A.htmlAttrs) !== JSON.stringify(B.htmlAttrs)) res.info.htmlAttrs = { A: A.htmlAttrs, B: B.htmlAttrs };
  if (JSON.stringify(A.doc) !== JSON.stringify(B.doc)) res.info.doc = { A: A.doc, B: B.doc };
  compareStates(A.states, B.states, res.stateDiffs, push, first);
  compareKeyframes(A.kf, B.kf, res.keyframeDiffs, push);
  if (A.fixture || B.fixture) res.info.fixture = { A: A.fixture && { built: A.fixture.built, skipped: A.fixture.skippedCount }, B: B.fixture && { built: B.fixture.built, skipped: B.fixture.skippedCount } };
  return res;
}

// The forced-state pass (capture.js stateDump): per state, the same elements
// (by selector and index) at the same paths, with the same computed styles.
function compareStates(SA, SB, out, push) {
  if (!SA && !SB) return;
  if (!SA || !SB) { push(out, { state: '*', A: SA ? 'measured' : 'absent', B: SB ? 'measured' : 'absent' }); return; }
  for (const kind of new Set([...Object.keys(SA), ...Object.keys(SB)])) {
    const a = SA[kind], b = SB[kind];
    if (!a || !b) { push(out, { state: kind, A: a ? a.els.length + ' elements' : 'absent', B: b ? b.els.length + ' elements' : 'absent' }); continue; }
    const mb = new Map(b.els.map(e => [e.k, e]));
    for (const ea of a.els) {
      const eb = mb.get(ea.k);
      if (!eb) { push(out, { state: kind, key: ea.k, path: ea.p, only: 'A' }); continue; }
      mb.delete(ea.k);
      if (ea.p !== eb.p) { push(out, { state: kind, key: ea.k, A: ea.p, B: eb.p }); continue; }
      for (const k of ['s', 'b', 'a', 'ph']) {
        if (ea[k] === undefined && eb[k] === undefined) continue;
        const va = ea[k] === undefined ? null : a.styles[ea[k]], vb = eb[k] === undefined ? null : b.styles[eb[k]];
        if (!va || !vb) { push(out, { state: kind, path: ea.p, pseudo: PSEUDO[k], prop: '*', A: va ? 'present' : 'absent', B: vb ? 'present' : 'absent' }); continue; }
        a.props.forEach((p, i) => { const j = b.props[i] === p ? i : b.props.indexOf(p); const w = j < 0 ? undefined : vb[j]; if (va[i] !== w) push(out, { state: kind, path: ea.p, pseudo: PSEUDO[k], prop: p, A: va[i], B: w }); });
      }
    }
    for (const eb of mb.values()) push(out, { state: kind, key: eb.k, path: eb.p, only: 'B' });
  }
}
// The keyframe probes (capture.js keyframes): every @keyframes, sampled at
// each keyframe's offset and halfway between, the same values on both sides.
function compareKeyframes(KA, KB, out, push) {
  if (!KA && !KB) return;
  if (!KA || !KB) { push(out, { name: '*', A: KA ? 'measured' : 'absent', B: KB ? 'measured' : 'absent' }); return; }
  for (const n of new Set([...Object.keys(KA), ...Object.keys(KB)])) {
    const a = KA[n], b = KB[n];
    if (!a || !b) { push(out, { name: n, A: a ? 'declared' : 'absent', B: b ? 'declared' : 'absent' }); continue; }
    if (JSON.stringify(a.offsets) !== JSON.stringify(b.offsets) || JSON.stringify(a.props) !== JSON.stringify(b.props)) { push(out, { name: n, A: { offsets: a.offsets, props: a.props }, B: { offsets: b.offsets, props: b.props } }); continue; }
    a.values.forEach((row, i) => row.forEach((v, j) => { if (v !== b.values[i][j]) push(out, { name: n, offset: a.offsets[i], prop: a.props[j], A: v, B: b.values[i][j] }); }));
  }
}

/* ---------- provenance ----------
   gitHead: the commit a tree is at, whether a tracked file is modified (dirty),
   and how many untracked files it has (information: an untracked file matters
   only if the page asks for it — servedCheck). */
export function gitHead(repo) {
  const r = spawnSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const s = spawnSync('git', ['-C', repo, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
  const u = spawnSync('git', ['-C', repo, 'ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' });
  const untracked = (u.stdout || '').split('\n').filter(Boolean).length;
  return { sha: (r.stdout || '').trim() || null, dirty: !!(s.stdout || '').trim(), untracked };
}

// Every blob at HEAD, path -> git's blob sha. Null when the tree is not a git tree.
export function headBlobs(repo) {
  const r = spawnSync('git', ['-C', repo, 'ls-tree', '-r', '-z', 'HEAD'], { encoding: 'utf8', maxBuffer: 64e6 });
  if (r.status !== 0) return null;
  const m = new Map();
  for (const line of r.stdout.split('\0')) { const t = line.indexOf('\t'); if (t < 0) continue; const [, type, sha] = line.slice(0, t).split(' '); if (type === 'blob') m.set(line.slice(t + 1), sha); }
  return m;
}
export const blobSha = buf => createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex');

// The URL path a static server maps to a file under the tree ('/' → index.html).
export function servedFile(pathname) {
  let p = pathname.split('?')[0].split('#')[0];
  try { p = decodeURIComponent(p); } catch {}
  p = p.replace(/^\/+/, '');
  if (p === '' || p.endsWith('/')) p += 'index.html';
  return p;
}

// Did this tree serve exactly the commit it claims? For each local path the
// page asked for: the file on disk against the blob at HEAD. A file HEAD does
// not have (untracked, ignored) that was served, a modified one, or one HEAD
// has that the disk lacks, all break the claim "the proof measured <sha>".
export function servedCheck(repo, paths) {
  const blobs = headBlobs(repo);
  if (!blobs) return { git: false, checked: 0, notAtHead: [{ path: '*', why: 'not a git tree: what it served cannot be tied to a commit' }] };
  const notAtHead = [];
  let checked = 0;
  for (const u of [...new Set(paths.map(servedFile))].sort()) {
    const f = join(repo, u);
    let onDisk = false;
    try { onDisk = statSync(f).isFile(); } catch {}
    const head = blobs.get(u);
    checked++;
    if (onDisk && head) { if (blobSha(readFileSync(f)) !== head) notAtHead.push({ path: u, why: 'modified' }); }
    else if (onDisk) notAtHead.push({ path: u, why: 'untracked (or ignored), and served' });
    else if (head) notAtHead.push({ path: u, why: 'at HEAD but missing on disk' });
  }
  return { git: true, checked, notAtHead };
}
