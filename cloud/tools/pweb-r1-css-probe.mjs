// Pweb adversarial review, round 1, css lens. Ground truth from Chrome itself,
// not from a hand resolver: each tree's rack.css + auth.css are loaded into a
// bare page on that tree's origin (no app code), and then
//   1. the CSSOM is walked: every rule's type, selector / media / keyframe key,
//      and the longhands Chrome KEPT after parsing, with their priority;
//   2. every style rule's declaration block (as Chrome kept it, var() and all)
//      is applied inline to a fresh probe element and ALL computed longhands
//      are read — so :hover/:active/:focus/:disabled rules, ::before/::after,
//      the reduced-motion blocks and the 900px / 380px media blocks are all
//      evaluated whatever state or width a scene happens to capture;
//   3. every @keyframes is sampled at each of its keyframe offsets (a paused
//      animation with a negative delay), so var() inside keyframes resolves as
//      Chrome resolves it;
//   4. <html> and <body> computed styles, and base's :root custom properties;
//   5. the JS-inline values the engine changed (paint() of every baked hex,
//      the auth mark, importer / steps / water / you.js kpi) on both sides.
// Writes <out>/<side>.json; the comparison is pweb-r1-css-compare.mjs.
//   node pweb-r1-css-probe.mjs <out-dir>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { acquireLock, startServer, startChrome, CDP, intercept, sleep, portFree } from '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs';

const OUT = process.argv[2] || '/Users/micahflunker/dev/vibes-night/proof/pweb-r1-css';
mkdirSync(OUT, { recursive: true });
// ENGINE_TREE: a canary copy of the engine with planted changes, to prove the probe sees them.
const TREES = { base: '/Users/micahflunker/dev/vibes-night/wt/web-base', engine: process.env.ENGINE_TREE || '/Users/micahflunker/dev/vibes-night/wt/web-engine' };
const PORTS = { base: 18931, engine: 18932 };
const CDP_PORT = 19931;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// Every hex literal the pinned modules bake (base files; the engine's are byte-identical).
const hexes = new Set(['#8d939f']);
for (const f of ['analytics.js', 'exercises.js']) for (const m of readFileSync(join(TREES.base, f), 'utf8').matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)) hexes.add(m[0]);
const HEXES = [...hexes];

const PROBE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="stylesheet" href="rack.css"><link rel="stylesheet" href="auth.css"><title>probe</title></head>
<body><div id="probe-host" style="position:relative;width:390px;height:800px;overflow:hidden"></div></body></html>`;

// The JS-inline pairs: [label, kind, tag-or-class, prop, baseValue, engineValue].
// kind 'style' = el.style.setProperty; 'attr' = SVG presentation attribute;
// 'kpi' = a .kpi tile with --kpi-rgb set inline (you.js kpi()).
const PAIRS = [
  ['importer seg fallback', 'style', 'div', 'background', 'var(--knurl)', 'var(--grip)'],
  ['steps ring track', 'attr', 'circle', 'stroke', 'var(--collar)', 'var(--track)'],
  ['water vessel body', 'attr', 'path', 'fill', 'var(--rack)', 'var(--well)'],
  ['water vessel cap', 'attr', 'rect', 'fill', 'var(--knurl)', 'var(--grip)'],
  ['auth mark 1', 'style', 'i', 'background', '#d6252b', 'var(--p-red)'],
  ['auth mark 2', 'style', 'i', 'background', '#2e7fd9', 'var(--p-blue)'],
  ['auth mark 3', 'style', 'i', 'background', '#f0be1e', 'var(--p-yellow)'],
  ['auth mark 4', 'style', 'i', 'background', '#2aa85c', 'var(--p-green)'],
  ['auth mark 5', 'style', 'i', 'background', '#e8e5de', 'var(--p-white)'],
  ['auth mark 6', 'style', 'i', 'background', '#a8aeb8', 'var(--p-chrome)'],
  ['kpi fuel/weight', 'kpi', 'kpi', '--kpi-rgb', '240,190,30', 'var(--p-yellow-rgb)'],
  ['kpi training', 'kpi', 'kpi', '--kpi-rgb', '46,127,217', 'var(--p-blue-rgb)'],
  ['kpi steps', 'kpi', 'kpi', '--kpi-rgb', '232,229,222', 'var(--p-white-rgb)'],
  ['kpi none (class default)', 'kpi', 'kpi', null, null, null],
];

const PAGE_FN = (side, pairs, hexes) => `(async () => {
  const side = ${JSON.stringify(side)}, PAIRS = ${JSON.stringify(pairs)}, HEXES = ${JSON.stringify(hexes)};
  const host = document.getElementById('probe-host');
  const out = { side, sheets: [], rules: [], root: {}, body: {}, rootCustom: {}, pairs: {}, paint: {} };
  const blank = document.createElement('div'); host.appendChild(blank);
  const csb = getComputedStyle(blank);
  const NAMES = [...csb].filter(n => !n.startsWith('--')).sort();
  const B = {}; for (const n of NAMES) B[n] = csb.getPropertyValue(n);
  out.names = NAMES.length;
  const diff = (el, extra = []) => { const cs = getComputedStyle(el); const o = {}; for (const n of NAMES) { const v = cs.getPropertyValue(n); if (v !== B[n]) o[n] = v; } for (const n of extra) o[n] = cs.getPropertyValue(n).trim(); return o; };
  const decls = st => { const a = []; for (let i = 0; i < st.length; i++) a.push([st[i], st.getPropertyPriority(st[i])]); return a; };
  for (const s of document.styleSheets) out.sheets.push({ href: s.href, n: s.cssRules.length });
  let idx = 0;
  const walk = (list, ctx, file) => {
    for (const r of list) {
      const rec = { i: idx++, file, ctx, type: r.constructor.name };
      if (r instanceof CSSImportRule) { rec.href = r.href; rec.media = r.media.mediaText; out.rules.push(rec); }
      else if (r instanceof CSSMediaRule) { rec.cond = r.media.mediaText; out.rules.push(rec); walk(r.cssRules, ctx + ' @media ' + r.media.mediaText, file); }
      else if (r instanceof CSSSupportsRule) { rec.cond = r.conditionText; out.rules.push(rec); walk(r.cssRules, ctx + ' @supports ' + r.conditionText, file); }
      else if (r instanceof CSSKeyframesRule) {
        rec.name = r.name; rec.frames = [...r.cssRules].map(k => ({ key: k.keyText, props: decls(k.style), cssText: k.style.cssText }));
        const offs = new Set(); for (const f of rec.frames) for (const k of f.key.split(',')) offs.add(parseFloat(k));
        rec.at = {};
        for (const off of [...offs].sort((a, b) => a - b)) {
          const el = document.createElement('div');
          el.style.cssText = 'animation: ' + r.name + ' 1000s linear ' + (-off * 10) + 's 1 normal both paused';
          host.appendChild(el); rec.at[off] = diff(el); el.remove();
        }
        out.rules.push(rec);
      }
      else if (r instanceof CSSStyleRule) {
        rec.sel = r.selectorText; rec.props = decls(r.style); rec.cssText = r.style.cssText;
        if (r.cssRules && r.cssRules.length) rec.nested = r.cssRules.length;
        const el = document.createElement('div'); el.style.cssText = r.style.cssText; host.appendChild(el);
        rec.computed = diff(el, rec.props.filter(p => p[0].startsWith('--')).map(p => p[0]));
        // the same block on an SVG <path> inside an <svg>, for fill/stroke-type values
        if (/fill|stroke|stop-color/.test(r.style.cssText)) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          p.setAttribute('style', r.style.cssText); svg.appendChild(p); host.appendChild(svg);
          const cs = getComputedStyle(p); rec.svg = { fill: cs.fill, stroke: cs.stroke, 'stop-color': cs.stopColor, opacity: cs.opacity, 'stroke-width': cs.strokeWidth };
          svg.remove();
        }
        el.remove(); out.rules.push(rec);
      }
      else { rec.cssText = r.cssText; out.rules.push(rec); }
    }
  };
  for (const s of document.styleSheets) walk(s.cssRules, '', (s.href || '').split('/').pop());
  const csr = getComputedStyle(document.documentElement);
  for (const n of [...csr]) if (!n.startsWith('--')) out.root[n] = csr.getPropertyValue(n);
  for (const n of [...csr]) if (n.startsWith('--')) out.rootCustom[n] = csr.getPropertyValue(n);
  const csB = getComputedStyle(document.body);
  for (const n of [...csB]) if (!n.startsWith('--')) out.body[n] = csB.getPropertyValue(n);
  // JS-inline pairs
  for (const [label, kind, tag, prop, bv, ev] of PAIRS) {
    const v = side === 'base' ? bv : ev;
    if (kind === 'style') { const el = document.createElement(tag); el.style.display = 'block'; el.style.setProperty(prop, v); host.appendChild(el); out.pairs[label] = { inline: el.style.getPropertyValue(prop), computed: diff(el) }; el.remove(); }
    else if (kind === 'attr') { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const el = document.createElementNS('http://www.w3.org/2000/svg', tag); el.setAttribute(prop, v); svg.appendChild(el); host.appendChild(svg); const cs = getComputedStyle(el); out.pairs[label] = { fill: cs.fill, stroke: cs.stroke }; svg.remove(); }
    else if (kind === 'kpi') { const el = document.createElement('div'); el.className = 'kpi'; if (prop) el.style.setProperty(prop, v); host.appendChild(el); const cs = getComputedStyle(el); out.pairs[label] = { backgroundImage: cs.backgroundImage, backgroundColor: cs.backgroundColor, kpiRgb: cs.getPropertyValue('--kpi-rgb').trim() }; el.remove(); }
  }
  // paint(): every baked hex, as background, as an inline SVG stroke (paintSvg), and as a presentation attribute
  let paint = h => h, paintSvg = null;
  if (side === 'engine') { const m = await import('/vibe.js'); paint = m.paint; paintSvg = m.paintSvg; }
  for (const h of HEXES) {
    const pv = paint(h);
    const d = document.createElement('div'); d.style.background = pv; host.appendChild(d);
    const bg = getComputedStyle(d).backgroundColor; d.remove();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('stroke', pv); p.setAttribute('class', 'donut-seg'); svg.setAttribute('class', 'chart chart-donut'); svg.appendChild(p);
    if (paintSvg) paintSvg(svg);
    host.appendChild(svg); const st = getComputedStyle(p).stroke; const attrLeft = p.getAttribute('stroke'); const inl = p.style.getPropertyValue('stroke'); svg.remove();
    const svg2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p2.setAttribute('fill', pv); svg2.appendChild(p2); host.appendChild(svg2); const fa = getComputedStyle(p2).fill; svg2.remove();
    out.paint[h] = { value: pv, bg, donutStroke: st, donutAttr: attrLeft, donutInline: inl, fillAttr: fa };
  }
  return out;
})()`;

const release = await acquireLock({ log });
log('lock held');
try {
  for (const p of [...Object.values(PORTS), CDP_PORT]) if (!(await portFree(p))) throw new Error('port ' + p + ' busy');
  const servers = {};
  for (const side of ['base', 'engine']) servers[side] = await startServer(TREES[side], PORTS[side], log);
  // A fresh profile per run and the cache off: the same port serves a canary
  // on another run, and a cached rack.css would hide it.
  const chrome = await startChrome({ cdpPort: CDP_PORT, profile: '/Users/micahflunker/dev/vibes-night/tmp/pweb-r1-css/profile-' + Date.now(), log });
  const c = new CDP(chrome.target.webSocketDebuggerUrl); await c.open();
  await c.send('Page.enable'); await c.send('Runtime.enable');
  await c.send('Network.enable'); await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  const stats = intercept(c, { ports: Object.values(PORTS), fakes: {}, font: null, overrides: { '/__probe.html': { body: PROBE_HTML, type: 'text/html; charset=utf-8' } } });
  await c.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (const side of ['base', 'engine']) {
    let loaded = false; c.handlers['Page.loadEventFired'] = [() => { loaded = true; }];
    await c.send('Page.navigate', { url: 'http://127.0.0.1:' + PORTS[side] + '/__probe.html' });
    for (let i = 0; i < 200 && !loaded; i++) await sleep(50);
    if (!loaded) throw new Error(side + ': no load event');
    const vibeStatus = await c.ev(`fetch('/vibe.js').then(r => r.status)`);
    // which rack.css this page actually holds: its bytes' length as served now, and the sheet's rule count
    const served = await c.ev(`fetch('/rack.css', { cache: 'no-store' }).then(r => r.text()).then(t => t.length)`);
    log(side, 'rack.css served length', served);
    const res = await c.ev(PAGE_FN(side, PAIRS, HEXES), 120000);
    res.vibeJs = vibeStatus; res.url = 'http://127.0.0.1:' + PORTS[side] + '/__probe.html'; res.tree = TREES[side];
    writeFileSync(join(OUT, side + '.json'), JSON.stringify(res));
    log(side, 'vibe.js', vibeStatus, 'rules', res.rules.length, 'sheets', JSON.stringify(res.sheets), 'names', res.names);
  }
  log('fetch stats', JSON.stringify(stats));
  chrome.stop(); for (const s of Object.values(servers)) s.stop();
} finally { release(); log('lock released'); }
process.exit(0);
