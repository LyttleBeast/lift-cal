// Web: a vibe switch mid-workout loses nothing (V59 §13.4, for Chalk).
// Boots a tree in headless Chrome through the btn-44 harness library (the
// fake Firebase, the frozen clock, the seed, the pinned Archivo), opens the
// seeded live session on Train, edits a set's weight, ticks a set (the rest
// timer starts), opens Coach's live sheet, then applyVibe(<vibe>) and
// applyVibe('v1') through the app's own vibe.js module instance. After each
// switch: the session in storage, every word on the page (textContent), the
// rest pill, the open sheet, the active tab. Back on v1: every element's full
// computed style is what it was before the switch. Finally +30 on the rest
// pill must move the timer by 30 s, proving the module's restEnd survived.
// Usage: node chalk-v1gate-switch.mjs <tree> <outDir> [vibe=chalk]
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const LIB = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs';
const H = await import(LIB);
const [tree, outDir, vibe = 'chalk'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const log = H.logger(join(outDir, 'switch.log'));
const NOW = Date.parse('2026-09-25T19:30:00-04:00');
const seedFile = JSON.parse(readFileSync('/Users/micahflunker/dev/vibes-night/proof/seed/seed.json', 'utf8'));
if (seedFile.now !== NOW) throw new Error('seed now mismatch');
const font = readFileSync('/Users/micahflunker/dev/vibes-night/tools/fonts/archivo/Archivo-wdth-wght.ttf');
const PORT = 8791, CDP_PORT = 9341;
await H.acquireLock({ log });
log('lock held');
await H.startServer(tree, PORT, log);
const profile = join(H.NIGHT, 'tmp', 'chalk-v1gate-switch', 'chrome');
H.onCleanup(() => { try { H.rmScratch(join(H.NIGHT, 'tmp', 'chalk-v1gate-switch')); } catch {} });
const chrome = await H.startChrome({ cdpPort: CDP_PORT, profile, log });
const c = new H.CDP(chrome.target.webSocketDebuggerUrl);
await c.open();
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Network.enable');
await c.send('Network.setBypassServiceWorker', { bypass: true });
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
await c.send('Emulation.setTimezoneOverride', { timezoneId: 'America/New_York' });
await c.send('Emulation.setLocaleOverride', { locale: 'en-US' });
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
const stats = H.intercept(c, { ports: [PORT], fakes: H.loadFakes(), font, stats: {} });
const { UID, seed, live } = seedFile;
const user = { uid: UID, email: 'm@example.test', displayName: 'Micah' };
const src = H.pageClockScript({ now: NOW }) + `
  try { localStorage.clear(); } catch {}
  try { Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.reject(new Error('no sw')), controller: null, addEventListener() {}, ready: new Promise(() => {}) }, configurable: true }); } catch {}
  window.__FAKE_USER = ${JSON.stringify(user)};
  window.__SEED = ${JSON.stringify(seed)};
  localStorage.setItem(${JSON.stringify('rack:' + UID + ':activeSession')}, ${JSON.stringify(JSON.stringify(live))});`;
await c.send('Page.addScriptToEvaluateOnNewDocument', { source: src });
const loaded = new Promise(r => c.on('Page.loadEventFired', r));
await c.send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html' });
await Promise.race([loaded, H.sleep(15000)]);
await c.ev(`(async () => { for (let i = 0; i < 200; i++) { if (document.readyState === 'complete' && document.querySelector('.dock') && document.fonts.status === 'loaded') break; await new Promise(r => setTimeout(r, 50)); } await document.fonts.ready; return true; })()`);
await c.ev(readFileSync('/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/helpers.js', 'utf8'));
await c.ev('__h.settle(1500)');

const SNAP = `(() => {
  const els = [...document.body.querySelectorAll('*')].filter(e => !e.closest('script'));
  const cs = e => { const s = getComputedStyle(e); const o = []; for (let i = 0; i < s.length; i++) { const p = s[i]; if (!p.startsWith('--')) o.push(p + ':' + s.getPropertyValue(p)); } return o.join(';'); };
  return {
    vibe: document.documentElement.getAttribute('data-vibe'),
    session: localStorage.getItem(${JSON.stringify('rack:' + UID + ':activeSession')}),
    text: document.body.textContent,
    workoutText: (document.querySelector('#view-workout') || {}).textContent,
    activeTab: (document.querySelector('.dock button.active') || {}).dataset?.view,
    restPill: !!document.getElementById('restPill'), restT: (document.getElementById('restT') || {}).textContent,
    restLine: (document.getElementById('restLine') || {}).style?.width,
    sheets: [...document.querySelectorAll('.sheet')].map(s => s.textContent),
    values: [...document.querySelectorAll('input')].map(i => i.value),
    count: els.length,
    tree: els.map(e => e.tagName + '.' + (typeof e.className === 'string' ? e.className : '') ),
    styles: els.map(cs)
  };
})()`;
const vm = `import('/vibe.js')`;
const out = { tree, vibe, steps: [] };
const fail = [];
const expect = (ok, what) => { out.steps.push((ok ? 'ok   ' : 'FAIL ') + what); log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fail.push(what); };

await c.ev(`__h.dock('workout')`);
await c.ev(`__h.until(() => document.querySelectorAll('#view-workout .set-row').length >= 5)`);
// Edit: Overhead Press, its second (empty) set, weight 100.
await c.ev(`(() => { const b = document.querySelectorAll('#view-workout .ex-block')[1]; const w = b.querySelectorAll('.set-row')[1].querySelector('input'); w.value = '100'; w.dispatchEvent(new Event('change')); return true; })()`);
await c.ev('__h.sleep(400)');
// Tick: Bench, its third set (target 185×5): starts the rest timer.
await c.ev(`(() => { const b = document.querySelectorAll('#view-workout .ex-block')[0]; b.querySelectorAll('.set-row')[2].querySelector('.set-check').click(); return true; })()`);
await c.ev('__h.sleep(1200)');
// Coach's live sheet, open over the session.
await c.ev(`__h.click('coach', document.querySelector('#view-workout'))`);
await c.ev('__h.sleep(800)');
const S0 = await c.ev(SNAP, 60000);
const sess0 = JSON.parse(S0.session || 'null');
expect(S0.vibe === null, 'starts on v1 (no data-vibe): ' + S0.vibe);
expect(S0.restPill && /\d:\d\d/.test(S0.restT || ''), 'rest timer running before the switch: ' + S0.restT);
expect(sess0 && sess0.exercises[0].sets[2].done === true && String(sess0.exercises[1].sets[1].w) === '100', 'the tick and the edit are in the stored session');
expect(S0.sheets.length >= 1, 'a sheet is open before the switch (' + S0.sheets.length + ')');

await c.ev(vm + `.then(m => m.applyVibe(${JSON.stringify(vibe)}))`);
await c.ev('__h.sleep(1200)');
const S1 = await c.ev(SNAP, 60000);
expect(S1.vibe === vibe, 'data-vibe is ' + vibe + ' after applyVibe: ' + S1.vibe);
expect(S1.session === S0.session, 'stored session byte-identical in ' + vibe);
expect(S1.text === S0.text, 'every word on the page (textContent) identical in ' + vibe);
expect(S1.activeTab === S0.activeTab, 'same tab in ' + vibe + ': ' + S1.activeTab);
expect(S1.restPill && S1.restT === S0.restT && S1.restLine === S0.restLine, 'rest pill and line unchanged in ' + vibe + ': ' + S1.restT + ' ' + S1.restLine);
expect(JSON.stringify(S1.sheets) === JSON.stringify(S0.sheets), 'the open sheet is still open, same words, in ' + vibe);
expect(JSON.stringify(S1.values) === JSON.stringify(S0.values), 'every input value identical in ' + vibe);
const styleMoved = S1.styles.filter((s, i) => s !== S0.styles[i]).length;
expect(styleMoved > 0, vibe + ' actually repainted (' + styleMoved + ' elements changed computed style)');

await c.ev(vm + `.then(m => m.applyVibe('v1'))`);
await c.ev('__h.sleep(1200)');
const S2 = await c.ev(SNAP, 60000);
expect(S2.vibe === null, 'back on v1: data-vibe removed: ' + S2.vibe);
expect(S2.session === S0.session, 'stored session byte-identical back on v1');
expect(S2.text === S0.text, 'every word identical back on v1');
expect(JSON.stringify(S2.tree) === JSON.stringify(S0.tree), 'element tree (tag.class) identical back on v1 (' + S2.count + ' vs ' + S0.count + ')');
const diffs = [];
S2.styles.forEach((s, i) => { if (s !== S0.styles[i]) { const a = S0.styles[i].split(';'), b = s.split(';'); diffs.push({ i, el: S0.tree[i], props: b.filter(x => !a.includes(x)).slice(0, 6), was: a.filter(x => !b.includes(x)).slice(0, 6) }); } });
expect(diffs.length === 0, 'every element\'s computed style identical back on v1 (' + diffs.length + ' differ)');
out.styleDiffsBack = diffs.slice(0, 40);
expect(S2.restPill && S2.restT === S0.restT, 'rest pill unchanged back on v1: ' + S2.restT);
expect(JSON.stringify(S2.sheets) === JSON.stringify(S0.sheets), 'sheet still open back on v1');
const lsKey = await c.ev(`localStorage.getItem('rack:vibe')`);
expect(lsKey === null, 'device hint rack:vibe cleared back on v1: ' + lsKey);
// restEnd survived: +30 moves the timer by 30 s.
await c.ev(`__h.closeAll()`);
await c.ev('__h.sleep(500)');
const before = await c.ev(`document.getElementById('restT').textContent`);
await c.ev(`[...document.querySelectorAll('#restPill button')].find(b => b.textContent === '+30').click()`);
await c.ev('__h.sleep(400)');
const after = await c.ev(`document.getElementById('restT').textContent`);
const secs = t => { const [m, s] = t.replace('+', '').split(':').map(Number); return m * 60 + s; };
expect(secs(after) - secs(before) === 30, 'the rest timer still runs from its own restEnd: +30 took ' + before + ' to ' + after);
const sessEnd = await c.ev(`localStorage.getItem(${JSON.stringify('rack:' + UID + ':activeSession')})`);
expect(sessEnd === S0.session, 'the session is still the one before the switches at the end');
out.stats = { offMachineFailed: stats.offMachineFailed || 0, fontCss: stats.fontCss || 0, fontFile: stats.fontFile || 0 };
out.fail = fail;
writeFileSync(join(outDir, 'switch.json'), JSON.stringify(out, null, 1));
log(fail.length ? 'FAIL ' + fail.length : 'PASS');
try { chrome.proc.kill(); } catch {}
process.exit(fail.length ? 1 : 0);
