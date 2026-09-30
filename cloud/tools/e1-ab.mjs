// e1-ab.mjs — E1's quick two-tree A/B check (not the §7.1 proof). Serves the base
// tree and the engine tree on two ports, boots the real app in one headless
// Chrome against the fake Firebase, runs a handful of scenes from
// report/btn-44/scenes.json in each, and compares a full-page screenshot and a
// computed-style dump (every element, ::before and ::after, custom properties
// excluded) scene for scene. Clock frozen, time zone pinned, every animation
// finished (or, if infinite, paused at 0) and focus blurred before a capture.
// Serialised through the night's lock.
//   node e1-ab.mjs <baseTree> <engineTree> <outDir> [groups=you,train,fuel,...] [widths=390]
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, openSync, closeSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const NIGHT = '/Users/micahflunker/dev/vibes-night';
const [A_TREE, B_TREE, OUT, groupArg, widthArg] = process.argv.slice(2);
const GROUPS = (groupArg || 'you,train,session,fuel,weight,steps,auth,gate,onboard,tour').split(',');
const WIDTHS = (widthArg || '390').split(',').map(Number);
const PA = 8791, PB = 8792, DPORT = 9351;
const LOCK = join(NIGHT, 'harness.lock');
const NOW = Date.parse('2026-09-25T19:30:00-04:00');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sha = b => createHash('sha256').update(b).digest('hex').slice(0, 16);

let lockFd;
for (let t = 0; ; t++) {   // wait for the lock (up to WAIT_MIN minutes), never two harnesses at once
  try { lockFd = openSync(LOCK, 'wx'); writeFileSync(lockFd, String(process.pid)); break; }
  catch {
    if (t * 15 > 60 * +(process.env.WAIT_MIN || 40)) { console.error('LOCKED: ' + (existsSync(LOCK) ? readFileSync(LOCK, 'utf8') : '?')); process.exit(9); }
    if (t % 8 === 0) console.log('lock held by ' + (existsSync(LOCK) ? readFileSync(LOCK, 'utf8') : '?') + ', waiting');
    await sleep(15000);
  }
}
mkdirSync(OUT, { recursive: true });

const HERE = join(A_TREE, 'report/btn-44');
const { UID, seed, live } = JSON.parse(readFileSync(join(NIGHT, 'proof/seed/seed.json'), 'utf8'));
const FAKES = Object.fromEntries(['firebase-app.js', 'firebase-auth.js', 'firebase-database.js'].map(f => [f, readFileSync(join(HERE, 'fakes', f))]));
const HELPERS = readFileSync(join(HERE, 'helpers.js'), 'utf8');
const LIMIT = +(process.env.LIMIT || 3);   // scenes per group, from the top (later ones build on earlier ones)
const SCENES = JSON.parse(readFileSync(join(HERE, 'scenes.json'), 'utf8')).filter(g => GROUPS.includes(g.group))
  .map(g => ({ ...g, scenes: g.scenes.slice(0, LIMIT) }));
const prof = join(NIGHT, 'tmp', 'e1-ab-' + process.pid);
mkdirSync(prof, { recursive: true });

const servers = [[A_TREE, PA], [B_TREE, PB]].map(([dir, port]) => {
  const s = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', dir], { stdio: ['ignore', 'ignore', 'pipe'] });
  s.err = ''; s.stderr.on('data', d => { s.err += d; }); return s;
});
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--remote-debugging-port=' + DPORT, '--user-data-dir=' + prof, '--use-mock-keychain',
  '--no-first-run', '--no-default-browser-check', '--disable-features=ServiceWorker', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { chrome.kill(); } catch {} for (const s of servers) try { s.kill(); } catch {} try { closeSync(lockFd); unlinkSync(LOCK); } catch {} };
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));

await sleep(700);
for (const s of servers) if (/Address already in use|OSError/.test(s.err)) { console.error('BIND ERROR: ' + s.err); process.exit(3); }
// which tree is on which port
const cssA = await (await fetch(`http://127.0.0.1:${PA}/rack.css`)).text();
const cssB = await (await fetch(`http://127.0.0.1:${PB}/rack.css`)).text();
const vA = (await fetch(`http://127.0.0.1:${PA}/vibe.js`)).status, vB = (await fetch(`http://127.0.0.1:${PB}/vibe.js`)).status;
console.log(`port ${PA}: base? ${!cssA.includes('--accent-rgb')}  /vibe.js ${vA} | port ${PB}: engine? ${cssB.includes('--accent-rgb')}  /vibe.js ${vB}`);
if (!process.env.CONTROL && (cssA.includes('--accent-rgb') || !cssB.includes('--accent-rgb'))) { console.error('ports serve the wrong trees'); process.exit(4); }

let target = null;
for (let i = 0; i < 100 && !target; i++) { await sleep(100); try { const l = await (await fetch(`http://127.0.0.1:${DPORT}/json/list`)).json(); target = l.find(t => t.type === 'page'); } catch {} }
if (!target) { console.error('no chrome'); process.exit(2); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const handlers = {};
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } else (handlers[m.method] || []).forEach(h => h(m.params)); };
await new Promise(r => { ws.onopen = r; });
const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((res, rej) => pending.set(i, { res, rej })); };
const on = (m, h) => { (handlers[m] = handlers[m] || []).push(h); };
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setBypassServiceWorker', { bypass: true });
await send('Emulation.setTimezoneOverride', { timezoneId: 'America/New_York' });
await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
const b64 = buf => Buffer.from(buf).toString('base64');
const off = [];
on('Fetch.requestPaused', async p => {
  const u = p.request.url;
  try {
    const fake = Object.keys(FAKES).find(f => u.includes('gstatic.com/firebasejs/') && u.endsWith('/' + f));
    if (fake) return await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, body: b64(FAKES[fake]), responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }] });
    if (/^http:\/\/127\.0\.0\.1:\d+\/sw\.js/.test(u)) return await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, body: b64('// none'), responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }] });
    if (u.startsWith(`http://127.0.0.1:${PA}/`) || u.startsWith(`http://127.0.0.1:${PB}/`) || u.startsWith('data:') || u.includes('fonts.googleapis.com/css2') || u.includes('fonts.gstatic.com')) return await send('Fetch.continueRequest', { requestId: p.requestId });
    off.push(u.slice(0, 100));
    return await send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'InternetDisconnected' });
  } catch {}
});
async function ev(expr, timeout = 20000) {
  const r = await Promise.race([send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }), sleep(timeout).then(() => ({ exceptionDetails: { text: 'timeout' } }))]);
  if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
  return r.result.value;
}
const loadWaiters = []; on('Page.loadEventFired', () => { while (loadWaiters.length) loadWaiters.shift()(); });
let bootId = null;
const CLOCK = `(() => { const N = ${NOW}; const R = Date; function F(...a) { if (!new.target) return new R(N).toString(); return a.length ? new R(...a) : new R(N); }
  F.prototype = R.prototype; F.now = () => N; F.parse = R.parse; F.UTC = R.UTC; window.Date = F; })();`;
async function boot(port, width, cfg) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 3, mobile: true });
  if (bootId) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: bootId });
  const user = cfg.user === undefined ? { uid: UID, email: 'm@example.test', displayName: 'Micah' } : cfg.user;
  const s = JSON.parse(JSON.stringify(seed));
  if (cfg.approve && cfg.user) s.access.approved[cfg.user.uid] = { at: NOW - 60e3, via: 'invite', code: 'CDEFGHJKMN', name: cfg.user.displayName, email: cfg.user.email };
  if (cfg.tour) s.users[UID].onboarding = { done: true, tourDone: false, at: NOW - 864e5, version: 3 };
  const src = `${CLOCK} try { localStorage.clear(); } catch {}
    try { Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.reject(new Error('no sw')), controller: null, addEventListener() {}, ready: new Promise(() => {}) }, configurable: true }); } catch {}
    window.__FAKE_USER = ${JSON.stringify(user)}; window.__SEED = ${JSON.stringify(s)};
    ${cfg.live ? `localStorage.setItem(${JSON.stringify('rack:' + UID + ':activeSession')}, ${JSON.stringify(JSON.stringify(live))});` : ''}`;
  bootId = (await send('Page.addScriptToEvaluateOnNewDocument', { source: src })).identifier;
  const loaded = new Promise(r => loadWaiters.push(r));
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
  await Promise.race([loaded, sleep(15000)]);
  const fontOk = await ev(`(async () => { for (let i = 0; i < 200; i++) { if (document.readyState === 'complete' && document.querySelector('.dock') && document.fonts.status === 'loaded') break; await new Promise(r => setTimeout(r, 50)); }
    await document.fonts.ready; const l = await document.fonts.load('700 16px Archivo');
    return l.length > 0 && [...document.fonts].some(f => f.family.replace(/["']/g, '') === 'Archivo' && f.status === 'loaded'); })()`);
  if (!fontOk) throw new Error('Archivo did not load');
  await ev(HELPERS);
  await ev(`__h.settle(${cfg.wait || 1500})`);
}
const FREEZE = `(async () => { for (const a of document.getAnimations()) { try { a.finish(); } catch { try { a.pause(); a.currentTime = 0; } catch {} } }
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return true; })()`;
const DUMP = `(() => { const out = []; const els = document.querySelectorAll('*'); let i = 0;
  for (const el of els) { i++;
    for (const pe of [null, '::before', '::after']) {
      const cs = getComputedStyle(el, pe); if (pe && (cs.content === 'none' || cs.content === 'normal')) continue;
      const v = []; for (let k = 0; k < cs.length; k++) { const p = cs[k]; if (!p.startsWith('--')) v.push(p + ':' + cs.getPropertyValue(p)); }
      const r = pe ? '' : (() => { const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(n => Math.round(n * 100) / 100).join(','); })();
      const svg = el instanceof SVGElement && !pe ? [...el.attributes].map(a => a.name + '=' + a.value).join(' ') : '';
      out.push([el.tagName + (el.id ? '#' + el.id : '') + (el.className && el.className.baseVal === undefined && el.className ? '.' + String(el.className).split(' ').join('.') : '') + (pe || '') + ' @' + i, r, svg, v.join(';')]); } }
  return out; })()`;

async function capture(port, width, g, dataVibe) {
  const res = [];
  await boot(port, width, g.cfg || {});
  if (dataVibe) await ev(`document.documentElement.dataset.vibe = ${JSON.stringify(dataVibe)}; true`);
  for (const s of g.scenes) {
    try {
      await ev(`(async () => { ${s.js} })()`);
      await ev(`__h.settle(400)`);
      await ev(FREEZE);
      const shot = Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64');
      const dump = await ev(DUMP, 60000);
      res.push({ scene: s.name, shot, dump });
    } catch (e) { res.push({ scene: s.name, error: e.message.slice(0, 200) }); if (s.fatal !== false) break; }
  }
  return res;
}

let scenes = 0, pxDiff = 0, csDiff = 0, errors = 0;
const lines = [];
for (const width of WIDTHS) for (const g of SCENES) for (const dv of [null, ...(g.group === 'you' || g.group === 'session' ? ['v1'] : [])]) {
  const A = await capture(PA, width, g, null), B = await capture(PB, width, g, dv);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const a = A[i] || {}, b = B[i] || {}, name = `${width} ${g.group}/${a.scene || b.scene}${dv ? ' [data-vibe=v1 on B]' : ''}`;
    scenes++;
    if (a.error || b.error || !a.shot || !b.shot) { errors++; lines.push(`ERR  ${name}  A:${a.error || 'ok'}  B:${b.error || 'ok'}`); continue; }
    const same = a.shot.equals(b.shot);
    let csd = [];
    if (a.dump.length !== b.dump.length) csd.push(`element count ${a.dump.length} vs ${b.dump.length}`);
    else for (let k = 0; k < a.dump.length && csd.length < 6; k++) {
      const [na, ra, sa, va] = a.dump[k], [nb, rb, sb, vb] = b.dump[k];
      if (na !== nb || ra !== rb || sa !== sb || va !== vb) {
        const pa = va.split(';'), pb = vb.split(';');
        const d = pa.filter((x, j) => x !== pb[j]).slice(0, 3).map((x, j) => x + ' -> ' + pb[pa.indexOf(x)]);
        csd.push(`${na}${na !== nb ? ' vs ' + nb : ''}${ra !== rb ? ` rect ${ra} vs ${rb}` : ''}${sa !== sb ? ' svg attrs differ' : ''} ${d.join(' | ')}`);
      }
    }
    if (!same) { pxDiff++; writeFileSync(join(OUT, `${width}-${g.group}-${a.scene}${dv ? '-v1' : ''}-A.png`), a.shot); writeFileSync(join(OUT, `${width}-${g.group}-${a.scene}${dv ? '-v1' : ''}-B.png`), b.shot); }
    if (csd.length) csDiff++;
    lines.push(`${same && !csd.length ? 'SAME' : 'DIFF'} ${name}  png ${sha(a.shot)}${same ? '' : ' vs ' + sha(b.shot)}  elements ${a.dump.length}${csd.length ? '\n       ' + csd.join('\n       ') : ''}`);
  }
}
const summary = `${scenes} scene captures: ${pxDiff} with pixel differences, ${csDiff} with computed-style differences, ${errors} errors; off-machine requests failed: ${off.length}`;
lines.push('', summary);
writeFileSync(join(OUT, 'ab.log'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
cleanup();
process.exit(pxDiff || csDiff || errors ? 1 : 0);
