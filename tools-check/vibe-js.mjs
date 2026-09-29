#!/usr/bin/env node
//
// Verifier that vibe.js, and every place the app now spends it, draws v1
// exactly as rack-v58 did — and that the switch does what it says.
//
//   node tools-check/vibe-js.mjs
//
// The engine moved every colour the JS baked as hex onto a token, and every
// icon onto vibe.js. Pixels cannot be checked here (that is the two-tree
// Chrome proof), but everything that decides them can, against rack-v58
// itself, read at 928a65e with git show:
//
//   A  paint(): each hex the pinned modules bake (exercises.js GROUPS in upper
//      case, analytics.js groupColor() in lower, its #8d939f fallback) becomes
//      a token whose rack.css :root value is that hex, the token of the role
//      the contract says that entry `follows`; anything else passes through.
//      paintSvg() moves a painted colour out of an SVG presentation attribute
//      into the style. The tables the engine wrote as tokens directly — workout.js
//      PLATES, access.js's two gate marks, index.html's auth mark, you.js's
//      --kpi-rgb channels — resolve through :root to rack-v58's literals.
//   B  icons: every site's markup is rack-v58's, character for character —
//      the four innerHTML sites, food.js's icon() at every name and width,
//      and Coach's two marks — built on a stand-in DOM from the real code of
//      both builds, and the calls at each site are the same calls.
//   C  index.html: the head script sits above the stylesheets, is classic,
//      and sets data-vibe only for a well-formed id that is not v1; its
//      theme-color map is each registered vibe's own. vibe.js registers the
//      same vibes, each with its definition and icon set, and every
//      vibes/<id>.css is linked once, after auth.css. Apart from that script,
//      the auth mark's tokens and vibe <link>s, the file is rack-v58's; the
//      dock markup is byte for byte.
//   D  the switch: with v1, boot writes nothing (no attribute, no key, no
//      meta, no dock); an unknown id normalises to v1 and is cleaned up; a
//      staged second vibe switches in and back — attribute, key, meta, one
//      repaint, the listeners, and the dock's own <svg> nodes put back.
//   E  the call sites: every GROUPS colour or groupColor() that reaches the
//      page goes through vibePaint(); paint is imported under that name
//      everywhere (it is a local repaint's name in five files — a bare call
//      there recursed); the donut drawn in group colours is wrapped in
//      paintSvg(); vibe.js imports only vibes/ and never reloads.
//   F  canaries.
//   G  offline: after boot, the active vibe's photos and faces and every
//      vibe's picker files (its thumbnail, its number's face — face.web.num)
//      are fetched into the service worker's cache where it lacks them —
//      only online, only under a worker, each once, retried after a failure —
//      and with v1 alone nothing is touched at all.
//   H  engine v2, the icon contract's other fields: every glyph site the
//      contract lists at rack-v58 goes through glyphed(), which in v1 leaves
//      the element exactly as built and under a set that draws the glyph
//      puts the drawing in its place (named by its character); water.js
//      draws rack-v58's bottle, attribute for attribute, from vessel(), and a
//      set's own bottle when it has one; every tab and the recap end in
//      tail(), which adds nothing in v1 and the set's ornament where it has
//      one; and a chart look that hatches puts the hatch <pattern>s in the
//      page, which v1 never does.

import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '928a65e';   // rack-v58
const read = f => readFileSync(join(ROOT, f), 'utf8');
// Every file of the pure contract (vibes/defs/*.js, vibes/icons/*.js): what a
// staged copy of vibe.js imports — v1's, and every registered vibe's.
const CONTRACT = ['vibes/defs', 'vibes/icons'].flatMap(d => readdirSync(join(ROOT, d)).filter(f => f.endsWith('.js')).map(f => d + '/' + f));
// Where a staged test vibe is registered in vibe.js: right after v1, ahead of
// whatever real vibes follow it, so the rest of each literal stands.
const A_DEFS = 'const DEFS = { v1: V1', A_SETS = 'const ICON_SETS = { v1: V1_ICONS';
const shown = new Map();
const base = f => {
  if (!shown.has(f)) shown.set(f, execFileSync('git', ['-C', ROOT, 'show', `${BASE}:${f}`], { encoding: 'utf8', maxBuffer: 1 << 26 }));
  return shown.get(f);
};
const url = f => pathToFileURL(join(ROOT, f)).href;
const PINNED = ['exercises.js', 'analytics.js', 'tdee.js', 'units.js', 'accounts.js', 'insights.js',
  'estimate-origin.js', 'estimate-ask.js', 'coach.js', 'coach-build.js', 'coach-live.js', 'coach-prog.js',
  'coach-goal.js', 'coach-overlap.js', 'coach-ready.js', 'coach-fuel.js', 'coach-volume.js', 'coach-tags.js'];

let checks = 0; const fails = [];
const ok = m => { checks++; if (process.env.VERBOSE) console.log('  ✓ ' + m); };
const bad = m => { checks++; fails.push(m); console.log('  ✗ ' + m); };
const expect = (c, m) => (c ? ok(m) : bad(m));
const section = t => console.log('\n' + t);
const J = JSON.stringify;

/* ---------- a stand-in DOM: enough for vibe.js, ui.js svgEl and the icon sites ---------- */
// A text node (engine v2: a glyph site's character, and the text a glyph
// leads).
class Text_ {
  constructor(data) { this.nodeType = 3; this.data = String(data); this.parent = null; }
  get textContent() { return this.data; }
}
class Node_ {
  constructor(tag) {
    this.tag = tag; this.attrs = []; this.children = []; this.html = null; this.parent = null; this.nodeType = 1;
    const props = {};
    this.style = { props, setProperty: (k, v) => { props[k] = String(v); } };
  }
  setAttribute(k, v) { const a = this.attrs.find(x => x[0] === k); if (a) a[1] = String(v); else this.attrs.push([k, String(v)]); DOC.log.push(['setAttribute', this.tag, k, String(v)]); }
  getAttribute(k) { const a = this.attrs.find(x => x[0] === k); return a ? a[1] : null; }
  removeAttribute(k) { this.attrs = this.attrs.filter(x => x[0] !== k); }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  insertBefore(n, ref) { const i = this.children.indexOf(ref); n.parent = this; if (i < 0) this.children.push(n); else this.children.splice(i, 0, n); return n; }
  replaceChild(n, o) { const i = this.children.indexOf(o); if (i >= 0) { this.children[i] = n; n.parent = this; o.parent = null; } DOC.log.push(['replaceChild', this.tag]); return o; }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter(c => c !== this); this.parent = null; } }
  get isConnected() { let n = this; while (n.parent) n = n.parent; return !!DOC && n === DOC.body; }
  get firstChild() { return this.children[0] || null; }
  get lastChild() { return this.children[this.children.length - 1] || null; }
  get textContent() { return this.html != null ? this.html : this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this.html = null; this.children = []; const s = String(v); if (s !== '') this.appendChild(new Text_(s)); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const out = [], walk = n => (n.children || []).forEach(c => { if (c.nodeType === 1 && match(c, sel)) out.push(c); if (c.nodeType === 1) walk(c); });
    walk(this); return out;
  }
  set innerHTML(s) { this.html = String(s); this.children = []; }
  get innerHTML() { return this.html != null ? this.html : this.children.map(ser).join(''); }
}
function match(n, sel) {
  if (sel === '*') return true;
  if (sel === 'svg') return n.tag === 'svg';
  const m = /^(\w+)\[([\w-]+)(?:="?([^"\]]*)"?)?\]$/.exec(sel);
  return !!m && n.tag === m[1] && (m[3] === undefined ? n.getAttribute(m[2]) !== null : n.getAttribute(m[2]) === m[3]);
}
const ser = n => n.nodeType === 3 ? n.data : '<' + n.tag + n.attrs.map(([k, v]) => ` ${k}="${v}"`).join('') +
  (n.html == null && !n.children.length && n.tag !== 'svg' ? '/>' : '>' + (n.html != null ? n.html : n.children.map(ser).join('')) + '</' + n.tag + '>');
let DOC;
function freshDoc() {
  const log = [];
  const dataset = new Proxy({}, {
    set(t, k, v) { log.push(['dataset.set', k, String(v)]); t[k] = String(v); return true; },
    deleteProperty(t, k) { log.push(['dataset.delete', k]); delete t[k]; return true; }
  });
  const meta = new Node_('meta'); meta.attrs.push(['name', 'theme-color'], ['content', '#14161a']);
  const dock = new Node_('nav');
  const views = ['you', 'workout', 'food', 'weight', 'steps'];
  for (const v of views) { const b = new Node_('button'); b.attrs.push(['data-view', v]); b.dataset = { view: v }; const s = new Node_('svg'); s.attrs.push(['id', 'orig-' + v]); b.appendChild(s); dock.appendChild(b); }
  DOC = {
    log, meta, dock,
    documentElement: { dataset },
    createElementNS: (_ns, t) => new Node_(t),
    createElement: t => new Node_(t),
    querySelector: sel => (sel === 'meta[name="theme-color"]' ? meta : null),
    getElementById: id => { log.push(['getElementById', id]); return id === 'dock' ? dock : null; }
  };
  globalThis.document = DOC;
  return DOC;
}
const store = new Map(), lsLog = [];
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { lsLog.push(['setItem', k, String(v)]); store.set(k, String(v)); },
  removeItem: k => { lsLog.push(['removeItem', k]); store.delete(k); }
};
freshDoc();

const VB = await import(url('vibe.js'));
const UI = await import(url('ui.js'));
const IDX = await import(url('vibes/defs/index.js'));
const V1 = (await import(url('vibes/defs/v1.js'))).default;

/* rack.css :root, name -> value, and var() resolved one level. */
const RACK = read('rack.css');
const rootBlock = /(^|\n):root\s*\{([^}]*)\}/.exec(RACK)[2].replace(/\/\*[\s\S]*?\*\//g, '');
const ROOTV = Object.fromEntries([...rootBlock.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
const resolve = v => { const m = /^var\((--[\w-]+)\)$/.exec(String(v).trim()); return m ? ROOTV[m[1]] : v; };
const lc = s => String(s).toLowerCase();

/* ================= A ================= */
section('A  paint() and the tables written as tokens resolve to rack-v58\'s colours');
{
  const hexes = [...Object.values(V1.groups), ...Object.values(V1.groupPlates), ...V1.plates];
  const wrong = [];
  for (const h of new Set([...hexes, ...hexes.map(x => x.toUpperCase()), ...hexes.map(x => x.toLowerCase())])) {
    const p = VB.paint(h);
    if (!/^var\(--[\w-]+\)$/.test(p) || lc(resolve(p)) !== lc(h)) wrong.push(`${h} -> ${p} (${resolve(p)})`);
  }
  expect(!wrong.length, `paint() turns each of the ${new Set(hexes.map(lc)).size} baked hexes, in either case, into a token whose :root value is that hex` + (wrong.length ? ' — ' + wrong.join('; ') : ''));
  // The real tables, not the contract's copy of them. analytics.js reads
  // store.js, which loads Firebase over https, so it is staged beside a stub
  // store the way coach-build.mjs stages it — its own text otherwise.
  const adir = mkdtempSync(join(tmpdir(), 'rack-vibe-js-analytics-'));
  writeFileSync(join(adir, 'store-stub.mjs'), 'export async function read(_p, f) { return f; }\nexport function todayKey() { return \'2026-09-26\'; }\n');
  writeFileSync(join(adir, 'analytics.mjs'), read('analytics.js')
    .replace("from './store.js'", "from './store-stub.mjs'")
    .replace("from './exercises.js'", 'from ' + J(url('exercises.js')))
    .replace("from './ui.js'", 'from ' + J(url('ui.js')))
    .replace("from './units.js'", 'from ' + J(url('units.js'))));
  const X = await import(url('exercises.js')), A = await import(pathToFileURL(join(adir, 'analytics.mjs')).href);
  const live = [...Object.values(X.GROUPS).map(g => g.color), ...Object.keys(X.GROUPS).map(g => A.groupColor(g)), A.groupColor('no-such-group')];
  const miss = live.filter(h => lc(resolve(VB.paint(h))) !== lc(h) || VB.paint(h) === h);
  expect(!miss.length, `and so do exercises.js GROUPS and analytics.js groupColor() themselves, fallback included (${live.length} values)` + (miss.length ? ' — ' + miss.join(', ') : ''));
  const through = ['var(--dim)', 'var(--p-red)', '#123456', '', 'red', undefined, null, 7];
  expect(through.every(x => VB.paint(x) === x), 'anything else comes back exactly as it went in: ' + through.map(x => J(x) === undefined ? 'undefined' : J(x)).join(', '));
  expect(VB.paint('constructor') === 'constructor' && VB.paint('toString') === 'toString', 'a name on Object.prototype passes through too (the map has no prototype)');
  // paint() is the contract's `follows`: each entry's v1 hex becomes var(<the token of the role it follows>).
  const tok = Object.fromEntries(IDX.ROLES.filter(r => r.path.startsWith('colors.') && typeof r.web === 'string' && r.web.startsWith('--')).map(r => [r.path.slice(7), r.web]));
  const tables = IDX.ROLES.filter(r => r.kind === 'table' && r.web === 'paint()');
  const offF = [];
  for (const r of tables) for (const [k, role] of Object.entries(r.follows || {})) {
    const hex = V1[r.path][k];
    if (VB.paint(hex) !== 'var(' + tok[role] + ')') offF.push(`${r.path}.${k} ${hex} -> ${VB.paint(hex)}, not var(${tok[role]})`);
  }
  expect(tables.length === 3 && !offF.length, `paint() is the contract's \`follows\`: every entry of ${tables.map(r => r.path).join(', ')} becomes var(<the token of the role it follows>)` + (offF.length ? ' — ' + offF.join('; ') : ''));
  // paintSvg(): a painted colour in a presentation attribute moves into the style.
  {
    const svg = new Node_('svg'), a = new Node_('path'), b = new Node_('path'), c = new Node_('circle'), d = new Node_('stop');
    a.attrs.push(['d', 'M0 0'], ['stroke', 'var(--p-red)'], ['fill', 'none']);
    b.attrs.push(['stroke', '#2E7FD9']);
    c.attrs.push(['fill', 'currentColor'], ['stroke', '#123456']);
    d.attrs.push(['stop-color', ' #a8aeb8 ']);
    [a, b, c, d].forEach(n => svg.appendChild(n));
    const back = VB.paintSvg(svg);
    expect(back === svg && a.style.props.stroke === 'var(--p-red)' && a.getAttribute('stroke') === null && a.getAttribute('fill') === 'none' && a.getAttribute('d') === 'M0 0' &&
      b.style.props.stroke === 'var(--p-blue)' && b.getAttribute('stroke') === null &&
      c.getAttribute('fill') === 'currentColor' && c.getAttribute('stroke') === '#123456' && !Object.keys(c.style.props).length &&
      d.style.props['stop-color'] === 'var(--p-chrome)' && d.getAttribute('stop-color') === null,
      'paintSvg() moves a token, or a baked hex as its token, from fill / stroke / stop-color into the style; none, currentColor, an unknown hex and every other attribute stay');
    expect(VB.paintSvg(null) === null && VB.paintSvg(undefined) === undefined, 'and hands back what it cannot walk');
  }

  // workout.js PLATES
  const plateSrc = s => /const PLATES = \[([\s\S]*?)\];/.exec(s)[1];
  const plates = s => [...plateSrc(s).matchAll(/\{\s*w:\s*([\d.]+),\s*c:\s*'([^']+)'\s*\}/g)].map(m => [m[1], m[2]]);
  const pb = plates(base('workout.js')), pe = plates(read('workout.js'));
  expect(pb.length === 6 && J(pe.map(p => p[0])) === J(pb.map(p => p[0])) && pe.every((p, i) => /^var\(--p-[\w-]+\)$/.test(p[1]) && lc(resolve(p[1])) === lc(pb[i][1])),
    'workout.js PLATES: the same six weights in the same order, each colour a --p-* token resolving to rack-v58\'s hex' + (pe.length ? '' : ' — PLATES not found'));
  // access.js's two gate marks
  const markB = [...base('access.js').matchAll(/\[('#[0-9a-f]{6}'(?:, '#[0-9a-f]{6}')+)\]\.forEach/g)].map(m => m[1].split(', ').map(s => s.slice(1, -1)));
  const MARK = (/const MARK = \[([^\]]*)\];/.exec(read('access.js')) || [])[1];
  const markE = MARK ? MARK.split(',').map(s => s.trim().slice(1, -1)) : [];
  expect(markB.length === 2 && J(markB[0]) === J(markB[1]) && markE.length === 6 && markE.every((t, i) => lc(resolve(t)) === lc(markB[0][i])) &&
    (read('access.js').match(/MARK\.forEach\(\(c, i\) => \{/g) || []).length === 2,
    'access.js: both gate marks draw MARK, whose six tokens resolve to rack-v58\'s six hexes in order');
  // index.html's auth mark
  const am = s => [...s.matchAll(/<i style="background:([^;]+);animation-delay:(\d+)ms"><\/i>/g)].map(m => [m[1], m[2]]);
  const ab = am(base('index.html')), ae = am(read('index.html'));
  expect(ab.length === 6 && ae.length === 6 && ae.every((x, i) => /^var\(--p-[\w-]+\)$/.test(x[0]) && lc(resolve(x[0])) === lc(ab[i][0]) && x[1] === ab[i][1]),
    'index.html\'s auth mark: six plates, each a --p-* token resolving to rack-v58\'s hex, the same delays');
  // you.js --kpi-rgb
  const rgbOf = s => Object.fromEntries([...s.matchAll(/color: (C_\w+), rgb: '([^']+)'/g)].map(m => [m[1], m[2]]));
  const rb = rgbOf(base('you.js')), re = rgbOf(read('you.js'));
  const keys = Object.keys(rb);
  expect(keys.length === 4 && J(Object.keys(re)) === J(keys) && keys.every(k => /^var\(--[\w-]+-rgb\)$/.test(re[k]) && resolve(re[k]).replace(/\s/g, '') === rb[k].replace(/\s/g, '')),
    'you.js: the four KPI tiles\' --kpi-rgb are channel tokens resolving to rack-v58\'s channels — ' + keys.map(k => `${k} ${re[k]}`).join(', '));
  expect(/t\.style\.setProperty\('--kpi-rgb', rgb\)/.test(read('you.js')), 'and kpi() still hands them to --kpi-rgb unchanged');
}

/* ================= B ================= */
section('B  every icon site draws rack-v58\'s markup');
const innerAt = (text, lhs) => {
  const i = text.indexOf(lhs + '.innerHTML =');
  if (i < 0) return null;
  return text.slice(i + (lhs + '.innerHTML =').length, text.indexOf(';\n', i)).trim();
};
{
  for (const [file, lhs] of [['food.js', 'gear'], ['steps.js', 'gear'], ['you.js', 'gear'], ['workout.js', 'cal']]) {
    const was = Function('return (' + innerAt(base(file), lhs) + ')')();
    const expr = innerAt(read(file), lhs);
    const now = expr && /^iconHtml\(/.test(expr) ? Function('iconHtml', 'return (' + expr + ')')(VB.iconHtml) : null;
    expect(now === was, `${file}: ${lhs}.innerHTML = ${expr} writes rack-v58's markup` + (now === was ? '' : `\n      now  ${now}\n      was  ${was}`));
  }
  // food.js icon(): both builds' own function, on the stand-in DOM.
  const lift = (text, head) => { const i = text.indexOf(head); if (i < 0) return null; return text.slice(i, text.indexOf('\n}\n', i) + 2); };
  const fb = base('food.js'), fe = read('food.js');
  const baseIcon = Function('svgEl', lift(fb, 'const ICON_PATHS = {').replace(/\n\};\n[\s\S]*$/, '\n};\n') + lift(fb, 'function icon(name, width) {') + 'return icon;')(UI.svgEl);
  const engIcon = Function('vibeIcon', lift(fe, 'function icon(name, width) {') + 'return icon;')(VB.icon);
  const names = Object.keys(Function(lift(fb, 'const ICON_PATHS = {').replace(/\n\};\n[\s\S]*$/, '\n};\n') + 'return ICON_PATHS;')());
  const diff = [];
  for (const n of names) for (const w of [undefined, '1.6', '2.6']) { const a = ser(baseIcon(n, w)), b = ser(engIcon(n, w)); if (a !== b) diff.push(`${n}/${w}: ${b} vs ${a}`); }
  expect(names.length === 8 && !diff.length, `food.js icon(): all ${names.length} names at the default, 1.6 and 2.6, the same <svg> as rack-v58's` + (diff.length ? ' — ' + diff.slice(0, 2).join(' | ') : ''));
  const calls = t => [...t.matchAll(/(?<![\w.])icon\([^()]*\)/g)].map(m => m[0]).filter(c => c !== 'icon(name, width)').sort();
  expect(J(calls(fe)) === J(calls(fb)), 'and every site calls it exactly as it did: ' + [...new Set(calls(fe))].join(', '));
  // coach-ui.js's two marks
  const cb = base('coach-ui.js'), ce = read('coach-ui.js');
  const marks = (text, deps) => Function(...Object.keys(deps), lift(text, 'function bubbleIcon() {') + lift(text, 'function lockIcon(pro) {') + 'return [bubbleIcon, lockIcon];')(...Object.values(deps));
  const [bb, lb] = marks(cb, {}), [be, le] = marks(ce, { icon: VB.icon });
  const same = [[ser(bb()), ser(be())], [ser(lb(true)), ser(le(true))], [ser(lb(false)), ser(le(false))]];
  expect(same.every(([a, b]) => a === b), 'coach-ui.js: the bubble, the open lock and the shut lock are rack-v58\'s <svg>s' + (same.every(([a, b]) => a === b) ? '' : ' — ' + same.filter(([a, b]) => a !== b).map(([a, b]) => b + ' vs ' + a).join(' | ')));
  expect(be().html !== null && le(true).html !== null, 'and are built as they were: the <svg> in script, its drawing written in as markup');
}

/* ================= C ================= */
section('C  index.html: the head script, and nothing else moved');
const INDEX = read('index.html');
const HEAD_RE = /<script>([\s\S]*?)<\/script>\n/;
{
  const head = INDEX.slice(0, INDEX.indexOf('</head>'));
  const m = HEAD_RE.exec(head);
  const at = m ? m.index : -1, sheet = head.indexOf('<link rel="stylesheet"'), meta = head.indexOf('<meta name="theme-color"');
  expect(!!m && at > meta && at < sheet, 'a classic inline <script> in <head>, after the theme-color meta and before the first stylesheet');
  const run = (stored, opts = {}) => {
    const ds = {}; let content = '#14161a';
    const ctx = {
      localStorage: { getItem: k => { if (opts.throws) throw new Error('blocked'); return k === 'rack:vibe' ? stored : null; } },
      document: { documentElement: { dataset: ds }, querySelector: s => (s === 'meta[name="theme-color"]' ? { setAttribute: (k, v) => { if (k === 'content') content = v; } } : null) }
    };
    vm.runInNewContext(opts.src || m[1], ctx);
    return { vibe: ds.vibe, content };
  };
  const cases = [[null, undefined], ['v1', undefined], ['iron-age', 'iron-age'], ['a'.repeat(32), 'a'.repeat(32)], ['a'.repeat(33), undefined],
    ['Iron', undefined], [' iron', undefined], ['-x', undefined], ['x_y', undefined], ['', undefined], ['9lives', '9lives']];
  const got = cases.map(([s]) => run(s).vibe);
  expect(cases.every(([, w], i) => got[i] === w), 'it sets data-vibe for a well-formed id that is not v1 and for nothing else: ' + cases.map(([s], i) => `${J(s)}→${got[i] === undefined ? '-' : got[i]}`).join(' '));
  expect(run('constructor').content === '#14161a' && run('toString').content === '#14161a', 'an id that is an Object.prototype name leaves the theme-color alone (own keys only)');
  let threw = false; try { run(null, { throws: true }); } catch { threw = true; }
  expect(!threw, 'a localStorage that throws (a private window) is swallowed');
  // Its theme-color map is each registered vibe's own.
  const map = Function('return (' + (/var THEME = (\{[^}]*\});/.exec(m[1]) || [, 'null'])[1] + ')')();
  const others = IDX.IDS.filter(i => i !== 'v1');
  const defs = {};
  for (const i of others) defs[i] = (await import(url(`vibes/defs/${i}.js`))).default;
  expect(map && J(Object.keys(map).sort()) === J(others.slice().sort()) && others.every(i => map[i] === defs[i].themeColor),
    `its theme-color map holds exactly the registered vibes other than v1, each at its definition's themeColor (${others.length})`);
  expect(others.every(i => run(i).content === defs[i].themeColor) && run('v1').content === '#14161a', 'and applies it: a vibe\'s own colour, v1 untouched');
  // vibe.js knows every registered vibe: its definition (def() falls back to
  // v1's without a word) and the icon set it names (so does icon()).
  const vjs = read('vibe.js');
  const keysOf = name => { const m = new RegExp('const ' + name + ' = \\{([^}]*)\\};').exec(vjs); return m ? [...m[1].matchAll(/(['"]?)([a-z0-9][a-z0-9-]*)\1\s*:/g)].map(x => x[2]) : null; };
  const defKeys = keysOf('DEFS'), setKeys = keysOf('ICON_SETS');
  const unknownDef = IDX.IDS.filter(i => VB.def(i).id !== i), unknownSet = IDX.IDS.filter(i => !(setKeys || []).includes(VB.def(i).icons || 'v1'));
  expect(defKeys && J(defKeys.slice().sort()) === J(IDX.IDS.slice().sort()) && !unknownDef.length && setKeys && !unknownSet.length,
    `vibe.js registers exactly the vibes the contract does, each with its own definition and the icon set it names (${IDX.IDS.join(', ')})` +
    (unknownDef.length || unknownSet.length ? ' — missing: ' + [...unknownDef.map(i => 'DEFS.' + i), ...unknownSet.map(i => 'ICON_SETS.' + VB.def(i).icons)].join(', ') : ''));
  // Every vibe stylesheet is linked, once, after rack.css and auth.css — so
  // every launch caches it (§5.5) — and every link is to a stylesheet that exists.
  const sheetsOnDisk = existsSync(join(ROOT, 'vibes')) ? readdirSync(join(ROOT, 'vibes')).filter(f => /^[a-z0-9][a-z0-9-]*\.css$/.test(f)).sort() : [];
  const links = [...head.matchAll(/<link rel="stylesheet" href="vibes\/([^"]+)">/g)].map(x => x[1]);
  const afterAuth = [...head.matchAll(/<link rel="stylesheet" href="vibes\//g)].every(x => x.index > head.indexOf('<link rel="stylesheet" href="auth.css">'));
  expect(J(links.slice().sort()) === J(sheetsOnDisk) && new Set(links).size === links.length && afterAuth,
    `index.html links each vibes/<id>.css once, after auth.css, and nothing else under vibes/ (${sheetsOnDisk.length} on disk)` +
    (J(links.slice().sort()) === J(sheetsOnDisk) ? '' : ` — linked ${J(links)}, on disk ${J(sheetsOnDisk)}`));
  // Everything else is rack-v58's.
  const dockOf = s => s.slice(s.indexOf('<nav class="dock" id="dock">'), s.indexOf('</nav>') + 6);
  expect(dockOf(INDEX) === dockOf(base('index.html')) && dockOf(INDEX).length > 100, 'the dock markup is byte for byte rack-v58\'s');
  const norm = INDEX.replace(HEAD_RE, '').replace(/<link rel="stylesheet" href="vibes\/[a-z0-9-]+\.css">\n/g, '')
    .replace(/<i style="background:(var\(--[\w-]+\));/g, (w, v) => `<i style="background:${lc(resolve(v))};`);
  expect(norm === base('index.html'), 'and without the head script, the vibe <link>s and the auth mark\'s tokens resolved, index.html is rack-v58\'s byte for byte');
}

/* ================= D ================= */
section('D  the switch');
{
  // v1 at boot: nothing written anywhere.
  let d = freshDoc(); lsLog.length = 0; store.clear();
  const r0 = VB.bootVibe();
  expect(r0 === 'v1' && !d.log.length && !lsLog.length, 'with v1 (no attribute) bootVibe() writes nothing: no attribute, no key, no meta, and the dock is never looked up' + (d.log.length || lsLog.length ? ' — ' + J([...d.log, ...lsLog]) : ''));
  expect(VB.current() === 'v1', 'current() is v1');
  // data-vibe="v1" put there from outside (the P gate forces it): left as it is.
  d = freshDoc(); lsLog.length = 0; store.clear(); d.documentElement.dataset.vibe = 'v1'; d.log.length = 0;
  const rv = VB.bootVibe();
  expect(rv === 'v1' && d.documentElement.dataset.vibe === 'v1' && !d.log.length && !lsLog.length,
    'with data-vibe="v1" already on <html>, bootVibe() writes nothing either and leaves the attribute where it is' + (d.log.length || lsLog.length ? ' — ' + J([...d.log, ...lsLog]) : ''));
  // An id this build does not know.
  d = freshDoc(); lsLog.length = 0; store.set('rack:vibe', 'zzz'); d.documentElement.dataset.vibe = 'zzz'; d.log.length = 0;
  let renders = 0, heard = [];
  VB.setRenderer(() => { renders++; });
  const off = VB.onVibeChange((v, was) => heard.push([v, was]));
  expect(VB.current() === 'v1', 'an unknown id on <html> reads as v1 (nothing matches it)');
  const r1 = VB.bootVibe();
  expect(r1 === 'v1' && d.documentElement.dataset.vibe === undefined && !store.has('rack:vibe') && d.meta.getAttribute('content') === '#14161a',
    'bootVibe() normalises it: the attribute and the key are removed and the theme-color is v1\'s');
  expect(renders === 0 && !heard.length && !d.log.some(e => e[0] === 'getElementById' || e[0] === 'replaceChild'), 'without a repaint, a listener call or a touch of the dock — the page was already painting v1');
  expect(VB.applyVibe('Nope!') === 'v1' && VB.applyVibe(undefined) === 'v1' && renders === 0, 'applyVibe() of garbage is v1, and v1 to v1 repaints nothing');
  off();
  VB.setRenderer(null);
  // Without a document at all (a verifier's stand-in, a worker): v1.
  const saved = globalThis.document; delete globalThis.document;
  let cur; try { cur = VB.current(); } catch { cur = 'threw'; }
  globalThis.document = saved;
  expect(cur === 'v1', 'current() with no document is v1, not a throw');

  // A second vibe, staged: the real vibe.js and contract in a tmpdir, one test
  // vibe registered with its own icon set — the only edits are the registry
  // entries a real vibe would add.
  const dir = mkdtempSync(join(tmpdir(), 'rack-vibe-js-'));
  for (const f of CONTRACT) { mkdirSync(join(dir, dirname(f)), { recursive: true }); writeFileSync(join(dir, f), read(f)); }
  const idx = read('vibes/defs/index.js');
  const anchorV = 'export const VIBES = deepFreeze([\n';
  writeFileSync(join(dir, 'vibes/defs/index.js'), idx.replace(anchorV, anchorV + "  { id: 'tst', name: 'tst', feel: '', experimental: false, scheme: 'dark' },\n"));
  const vj = read('vibe.js');
  const aD = A_DEFS, aI = A_SETS;
  writeFileSync(join(dir, 'vibe.js'), vj
    .replace(aD, "const DEFS = { v1: V1, tst: { ...V1, id: 'tst', icons: 'tst', themeColor: '#0a0b0c' }")
    .replace(aI, "const ICON_SETS = { v1: V1_ICONS, tst: { id: 'tst', icons: { you: { viewBox: '0 0 24 24', stroke: 2, fill: 'none', linecap: 'square', linejoin: 'miter', els: [{ tag: 'circle', cx: 12, cy: 12, r: 9 }] } } }"));
  expect(idx.includes(anchorV) && vj.includes(aD) && vj.includes(aI), 'the staging anchors are where a new vibe is registered (VIBES, DEFS, ICON_SETS)');
  d = freshDoc(); lsLog.length = 0; store.clear();
  const T = await import(pathToFileURL(join(dir, 'vibe.js')).href);
  const origs = d.dock.children.map(b => b.children[0]);
  renders = 0; heard = [];
  T.setRenderer(v => { renders++; heard.push(['render', v]); });
  T.onVibeChange((v, was) => heard.push([v, was]));
  const r2 = T.applyVibe('tst');
  const svgs = d.dock.children.map(b => b.children[0]);
  expect(r2 === 'tst' && d.documentElement.dataset.vibe === 'tst' && store.get('rack:vibe') === 'tst' && d.meta.getAttribute('content') === '#0a0b0c',
    'applyVibe(a vibe): data-vibe, the device key and the theme-color are that vibe\'s');
  expect(renders === 1 && J(heard) === J([['render', 'tst'], ['tst', 'v1']]), 'the screen repaints once, then the listeners hear (id, was)');
  expect(ser(svgs[0]) === '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="miter"><circle cx="12" cy="12" r="9"/></svg>' &&
    ser(svgs[1]) === ser(T.icon('workout', { cssStroke: true })) && svgs.every((s, i) => s !== origs[i]),
    'the dock draws the vibe\'s icons, falling back to v1\'s drawing where the set has none, with no stroke-width (the stylesheet\'s)');
  expect(T.iconHtml('gear') === VB.iconHtml('gear') && T.iconHtml('you').includes('<circle cx="12" cy="12" r="9"/>'), 'icon() reads the active vibe\'s set, and v1\'s for a name the set lacks');
  expect(T.applyVibe('tst') === 'tst' && renders === 1, 'the same vibe again repaints nothing');
  const r3 = T.applyVibe('v1');
  const back = d.dock.children.map(b => b.children[0]);
  expect(r3 === 'v1' && d.documentElement.dataset.vibe === undefined && !store.has('rack:vibe') && d.meta.getAttribute('content') === '#14161a' && renders === 2,
    'back to v1: the attribute and the key are gone, the theme-color is v1\'s, one more repaint');
  expect(back.every((s, i) => s === origs[i]), 'and the dock holds index.html\'s own <svg> nodes again — the same nodes, not copies');
  expect(!/location\.reload/.test(vj.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'vibe.js never calls location.reload() (a live workout\'s beforeunload would ask to leave)');
}

/* ================= E ================= */
section('E  the call sites');
function lintSite(file, text) {
  const probs = [];
  const code = text.replace(/\/\*[\s\S]*?\*\//g, s => s.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const imp = /import\s*\{([^}]*)\}\s*from\s*'\.\/vibe\.js'/.exec(code);
  const names = imp ? imp[1].split(',').map(s => s.trim()).filter(Boolean) : [];
  if (names.some(n => /^paint$/.test(n))) probs.push(`${file} imports paint without renaming it — import { paint as vibePaint }: paint is a local repaint's name in five files`);
  code.split('\n').forEach((line, i) => {
    if (/^\s*import\b/.test(line)) return;
    for (const m of line.matchAll(/groupColor\(|\bGROUPS\[[^\]]+\]\s*\.color|\(GROUPS\[[^\]]+\]\s*\|\|\s*\{\}\)\.color/g)) {
      const before = line.slice(0, m.index);
      if (!/vibePaint\(/.test(before)) probs.push(`${file}:${i + 1} spends a group colour without vibePaint(): ${line.trim().slice(0, 100)}`);
    }
    if (/(?<![\w.])paint\(\s*\(?\s*(GROUPS|groupColor)/.test(line)) probs.push(`${file}:${i + 1} calls a bare paint() on a group colour`);
  });
  return probs;
}
{
  const files = readdirSync(ROOT).filter(f => f.endsWith('.js') && !PINNED.includes(f) && f !== 'vibe.js');
  const probs = files.flatMap(f => lintSite(f, read(f)));
  for (const p of probs) bad(p);
  if (!probs.length) ok(`every GROUPS colour and groupColor() in the ${files.length} unpinned modules reaches the page through vibePaint()`);
  // A group colour that reaches an SVG presentation attribute is moved into a
  // style: stats.js hands the donut its painted colours, and donut() (pinned)
  // writes them as stroke="…".
  const st = read('stats.js');
  const donuts = [...st.matchAll(/(\w*)\(donut\(/g)].map(m => m[1]);
  expect(donuts.length === 1 && donuts.every(w => w === 'paintSvg'), 'stats.js: the muscle-group donut, the one donut drawn in group colours, is wrapped in paintSvg() (' + donuts.join(', ') + ')');
  const users = files.filter(f => /from '\.\/vibe\.js'/.test(read(f)));
  expect(users.length >= 9, `vibe.js is imported by ${users.length} modules: ${users.join(', ')}`);
  const vj = read('vibe.js');
  const imports = [...vj.matchAll(/^import[^;]*from\s*'([^']+)'/gm)].map(m => m[1]);
  expect(imports.length && imports.every(p => p.startsWith('./vibes/')), 'vibe.js imports only the pure contract under vibes/: ' + imports.join(', '));
  expect(!/\.style\.(height|minHeight|maxHeight|blockSize)\s*=/.test(vj), 'and sets no inline height (touch-target D)');
}

/* ================= F ================= */
section('F  canaries');
{
  const sample = `import { paint } from './vibe.js';\nx.style.background = paint(groupColor(g));\ny.style.background = GROUPS[g].color;\nz.style.background = vibePaint((GROUPS[g] || {}).color || 'var(--dim)');\n`;
  const p = lintSite('sample.js', sample);
  expect(p.some(x => /without renaming/.test(x)) && p.some(x => /bare paint/.test(x)) && p.some(x => /:3 spends a group colour/.test(x)) && !p.some(x => /:4 /.test(x)),
    'the call-site lint catches an un-renamed import, a bare paint() and an unpainted GROUPS colour, and passes a painted one');
  expect(VB.iconHtml('gear', { stroke: 1.7 }) !== Function('return (' + innerAt(base('food.js'), 'gear') + ')')(), 'a gear drawn at another stroke width is not rack-v58\'s');
  const loose = `(function(){ try { var v = localStorage.getItem('rack:vibe'); if (v) document.documentElement.dataset.vibe = v; } catch (e) {} })();`;
  const ds = {}; vm.runInNewContext(loose, { localStorage: { getItem: () => 'Bad!' }, document: { documentElement: { dataset: ds } } });
  expect(ds.vibe === 'Bad!', 'a head script without the id check would have set "Bad!" — which C refuses');
  expect(lc(resolve('var(--p-red)')) === '#d6252b' && resolve('var(--no-such)') === undefined, 'the :root resolver reads rack.css (--p-red is #d6252b) and finds nothing for an unknown token');
}

/* ================= G ================= */
section('G  offline: the vibes\' photos and faces into the worker\'s cache');
{
  // A world to count in: the network, Cache Storage, the worker, timers and
  // the stylesheets, each a stand-in that records what was asked of it.
  const W = { fetched: [], matched: [], timers: 0, sheetsRead: 0, online: true, controller: true, cached: new Set(), failOnce: new Set() };
  const saved = { setTimeout: globalThis.setTimeout, fetch: globalThis.fetch, caches: globalThis.caches, nav: Object.getOwnPropertyDescriptor(globalThis, 'navigator') };
  globalThis.setTimeout = (fn, _ms) => { W.timers++; return saved.setTimeout(fn, 0); };
  globalThis.fetch = async u => { u = String(u); if (W.failOnce.delete(u)) throw new TypeError('network'); W.fetched.push(u); return { ok: true, status: 200 }; };
  globalThis.caches = { match: async u => { W.matched.push(String(u)); return W.cached.has(String(u)) ? {} : undefined; } };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, get: () => ({ onLine: W.online, serviceWorker: W.controller ? { controller: {} } : { controller: null } }) });
  const reset = () => { W.fetched = []; W.matched = []; W.timers = 0; W.sheetsRead = 0; };
  const face = (family, src) => ({ type: 5, style: { getPropertyValue: p => (p === 'font-family' ? family : p === 'src' ? src : '') } });
  const B = 'https://rack.test/app/';
  const SHEETS = [
    { href: B + 'rack.css', cssRules: [face('Archivo', 'url(nope.woff2)')] },          // not a vibe's: never read for fonts
    { href: B + 'vibes/tst.css', cssRules: [
      { type: 1, style: { getPropertyValue: () => '' } },                                  // a style rule
      face('"tst Grot"', 'url("tst/grot.woff2") format("woff2"), url("tst/grot.ttf") format("truetype")'),
      face('tst Slab', 'local("Slab"), url(tst/slab.woff2) format("woff2")'),
      face('tst Inline', 'url(data:font/woff2;base64,AAAA) format("woff2")')] },
    { href: null, cssRules: [] }                                                            // an inline <style>
  ];
  const world = () => { const d = freshDoc(); d.baseURI = B; Object.defineProperty(d, 'styleSheets', { configurable: true, get: () => { W.sheetsRead++; return SHEETS; } }); return d; };

  // v1 alone: nothing at all. With other vibes registered, a launch in v1
  // still reads the stylesheets for their picker faces — but in this world no
  // vibes/<id>.css of theirs is linked, so they have nothing to fetch, and
  // nothing else is touched.
  world(); reset();
  await VB.prefetchVibes();
  VB.applyVibe('v1');
  await VB.prefetchVibes();
  const aloneV1 = IDX.IDS.length === 1;
  expect(!W.timers && !W.fetched.length && !W.matched.length && (!aloneV1 || !W.sheetsRead),
    (aloneV1 ? 'with v1 the only vibe, prefetchVibes() and applyVibe() touch no timer, no stylesheet, no Cache Storage and no network'
      : 'in v1, with no registered vibe\'s stylesheet in the page, prefetchVibes() and applyVibe() touch no timer, no Cache Storage and no network') +
    (W.timers || W.fetched.length || W.matched.length || (aloneV1 && W.sheetsRead) ? ' — ' + J(W) : ''));

  // A staged vibe with photos and faces: the real vibe.js and contract, only
  // the registry entries a real vibe adds.
  const dir = mkdtempSync(join(tmpdir(), 'rack-vibe-js-offline-'));
  for (const f of CONTRACT) { mkdirSync(join(dir, dirname(f)), { recursive: true }); writeFileSync(join(dir, f), read(f)); }
  const anchorV = 'export const VIBES = deepFreeze([\n', aD = A_DEFS;
  writeFileSync(join(dir, 'vibes/defs/index.js'), read('vibes/defs/index.js').replace(anchorV, anchorV + "  { id: 'tst', name: 'tst', feel: '', experimental: false, scheme: 'dark' },\n"));
  writeFileSync(join(dir, 'vibe.js'), read('vibe.js').replace(aD, "const DEFS = { v1: V1, tst: { ...V1, id: 'tst', themeColor: '#0a0b0c', " +
    "images: { thumb: 'thumb.webp', hero: 'hero.jpg', odd: 42, card: { file: 'card.jpg' } }, " +
    // its numerals in its text face: face.web.num left out, so valueOf() gives face.web.font
    "face: { ...V1.face, web: { font: \"'TST grot', system-ui, sans-serif\", mono: V1.face.web.mono, importUrl: V1.face.web.importUrl } } }"));   // case differs from the @font-face: CSS matches families regardless
  const fresh = async tag => import(pathToFileURL(join(dir, 'vibe.js')).href + '?' + tag);
  const U = f => B + 'vibes/tst/' + f;

  // Launch in v1: the picker files only — the thumbnail and the number's face.
  world(); reset(); W.cached = new Set([U('hero.jpg')]);
  const T1 = await fresh('a');
  expect(T1.imageUrl('tst', 'thumb') === U('thumb.webp') && T1.imageUrl('tst', 'card') === U('card.jpg') && T1.imageUrl('tst', 'odd') === null &&
    T1.imageUrl('tst', 'constructor') === null && T1.imageUrl('v1', 'thumb') === null && T1.imageUrl('nope', 'thumb') === null,
    'imageUrl(): a slot\'s file under vibes/<id>/, absolute; a { file } slot too; null for a slot that is not a file, a prototype name, v1 and an unknown vibe');
  await T1.prefetchVibes();
  expect(J(W.fetched) === J([U('thumb.webp'), U('grot.woff2')]) && J(W.matched) === J(W.fetched) && W.timers === 1,
    'launching in v1 fetches every vibe\'s picker files — its images.thumb and the first url() of the face its face.web.font names — once each, after one pause: ' + J(W.fetched));
  // Switch to it: the rest of its files, the cache asked first.
  reset();
  T1.applyVibe('tst');
  await T1.prefetchVibes();
  expect(J(W.fetched) === J([U('card.jpg'), U('slab.woff2')]) && W.matched.includes(U('hero.jpg')) && !W.fetched.includes(U('hero.jpg')),
    'choosing it fetches the rest of its files: every image slot and every @font-face — skipping what Cache Storage holds (hero.jpg), what this launch already asked for, a data: face and a src\'s fallback formats: ' + J(W.fetched));
  expect(!W.fetched.some(u => /nope|\.ttf|^data:/.test(u)), 'nothing from rack.css, no .ttf fallback, no data: URL');

  // A vibe whose card figure is not in its text face names its numeral face.
  writeFileSync(join(dir, 'vibe-num.js'), read('vibe.js').replace(aD, "const DEFS = { v1: V1, tst: { ...V1, id: 'tst', images: { thumb: 'thumb.webp' }, " +
    "face: { ...V1.face, web: { ...V1.face.web, font: \"'TST grot', system-ui, sans-serif\", num: \"'tst Slab', Georgia, serif\" } } }"));
  world(); reset(); W.cached = new Set();
  const TN = await import(pathToFileURL(join(dir, 'vibe-num.js')).href);
  await TN.prefetchVibes();
  expect(J(W.fetched) === J([U('thumb.webp'), U('slab.woff2')]),
    'a vibe whose numerals are not its text face (Iron Age\'s Besley figures) fetches its face.web.num for the card, not its face.web.font: ' + J(W.fetched));

  // Offline, then online: nothing, then everything it could not do.
  world(); reset(); W.cached = new Set(); W.online = false;
  const T2 = await fresh('b');
  await T2.prefetchVibes();
  const offline = !W.fetched.length && !W.matched.length;
  W.online = true; reset();
  await T2.prefetchVibes();
  expect(offline && J(W.fetched) === J([U('thumb.webp'), U('grot.woff2')]),
    'offline it fetches nothing and asks the cache nothing, and forgets it tried, so the next call fetches them');
  // No worker controlling the page: nothing would keep a file, so nothing is fetched.
  world(); reset(); W.controller = false;
  const T3 = await fresh('c');
  await T3.prefetchVibes();
  expect(!W.fetched.length && !W.matched.length, 'with no service worker controlling the page it fetches nothing');
  W.controller = true;
  // A fetch that fails is tried again by the next call; one that worked is not.
  world(); reset(); W.failOnce = new Set([U('thumb.webp')]);
  const T4 = await fresh('d');
  await T4.prefetchVibes();
  const first = W.fetched.slice();
  reset();
  await T4.prefetchVibes();
  expect(J(first) === J([U('grot.woff2')]) && J(W.fetched) === J([U('thumb.webp')]), 'a fetch the network drops is tried again by the next call, and only that one');

  globalThis.setTimeout = saved.setTimeout; globalThis.fetch = saved.fetch;
  if (saved.caches === undefined) delete globalThis.caches; else globalThis.caches = saved.caches;
  if (saved.nav) Object.defineProperty(globalThis, 'navigator', saved.nav);

  // app.js asks for it once boot has put the screen up, and does not wait for it.
  const app = read('app.js');
  const bootBody = app.slice(app.indexOf('async function boot('), app.indexOf('\n}\n', app.indexOf('async function boot(')));
  const iRestore = bootBody.indexOf('restoreView();'), iPre = bootBody.indexOf('prefetchVibes()');
  expect(iRestore > 0 && iPre > iRestore && !/await\s+prefetchVibes/.test(app) && (app.match(/prefetchVibes\(\)/g) || []).length === 1,
    'app.js calls prefetchVibes() once, in boot() after restoreView(), unawaited');
}

/* ================= H ================= */
section('H  engine v2: glyphs, the vessel, tailpieces and hatch patterns');
{
  const IC1 = (await import(url('vibes/icons/v1.js'))).default;
  const NAMES_G = Object.keys(IC1.glyphs);
  // A call's text from `glyphed(` to its matching ')', and its arguments after
  // the first, split at the top level: the glyph names it can draw.
  const callsIn = text => {
    const out = [];
    const code = text.replace(/\/\*[\s\S]*?\*\//g, s => s.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
    for (let i = code.indexOf('glyphed('); i >= 0; i = code.indexOf('glyphed(', i + 1)) {
      if (/[\w.]/.test(code[i - 1] || '')) continue;
      let d = 0, j = i + 7, q = null;
      const args = []; let cur = '';
      for (; j < code.length; j++) {
        const c = code[j];
        if (q) { cur += c; if (c === '\\') { cur += code[++j]; continue; } if (c === q) q = null; continue; }
        if (c === "'" || c === '"' || c === '`') { q = c; cur += c; continue; }
        if (c === '(' || c === '[' || c === '{') { d++; if (d === 1 && c === '(') continue; }
        if (c === ')' || c === ']' || c === '}') { d--; if (d === 0) { args.push(cur); break; } }
        if (c === ',' && d === 1) { args.push(cur); cur = ''; continue; }
        cur += c;
      }
      if (/^\s*import\b/.test(code.slice(code.lastIndexOf('\n', i) + 1, i))) continue;
      const names = args.slice(1).flatMap(a => [...a.matchAll(/'(\w+)'/g)].map(m => m[1])).filter(n => NAMES_G.includes(n));
      out.push({ at: code.slice(0, i).split('\n').length, names });
    }
    return out;
  };
  // The contract's web sites (file:line at rack-v58), per file and glyph.
  const want = {};
  for (const [name, g] of Object.entries(IC1.glyphs)) for (const s of g.web) { const f = s.split(':')[0]; (want[f] = want[f] || {})[name] = (want[f][name] || 0) + 1; }
  const got = {}, stray = [];
  for (const f of readdirSync(ROOT).filter(x => x.endsWith('.js') && !PINNED.includes(x) && x !== 'vibe.js')) {
    for (const c of callsIn(read(f))) {
      if (!c.names.length) stray.push(`${f}:${c.at} names no glyph the contract lists`);
      for (const n of c.names) (got[f] = got[f] || {})[n] = (got[f][n] || 0) + 1;
    }
  }
  const off = [];
  for (const f of new Set([...Object.keys(want), ...Object.keys(got)])) for (const n of new Set([...Object.keys(want[f] || {}), ...Object.keys(got[f] || {})])) {
    const w = (want[f] || {})[n] || 0, g = (got[f] || {})[n] || 0;
    if (w !== g) off.push(`${f} ${n}: the contract lists ${w} site${w === 1 ? '' : 's'}, glyphed() is called for ${g}`);
  }
  const total = Object.values(want).reduce((k, o) => k + Object.values(o).reduce((a, b) => a + b, 0), 0);
  {
    const c = callsIn("const a = el('b', null, '‹'); glyphed(a, 'prev');\nrow.appendChild(glyphed(el('span', 'more', '›'), 'go'));\n" +
      "glyphed(x, d > 0 ? 'up' : d < 0 ? 'down' : 'flat');\nglyphed(n, 'warn', { lead: true });\n// glyphed(c, 'close')\nglyphed(z, 'nope');");
    expect(J(c.map(x => x.names)) === J([['prev'], ['go'], ['up', 'down', 'flat'], ['warn'], []]),
      'the survey reads a call\'s glyph names from its arguments after the element (a class called "more" is not one), skips comments, and finds a call naming none: ' + J(c.map(x => x.names)));
  }
  expect(!off.length && !stray.length && total >= 40,
    `every glyph site the contract lists at rack-v58 (${total} in ${Object.keys(want).length} files) goes through glyphed(), once, by its name, and no call names anything else` +
    (off.length || stray.length ? ' — ' + [...off, ...stray].join('; ') : ''));

  // v1: every glyph site is left as it was built.
  freshDoc(); DOC.log.length = 0;
  const same = [];
  for (const [name, g] of Object.entries(IC1.glyphs)) {
    for (const make of [() => UI.el('button', 'x', g.char), () => UI.noteEl(g.char + ' leads a sentence')]) {
      const n = make(), before = ser(n);
      const back = VB.glyphed(n, name, { lead: true }), back2 = VB.glyphed(n, name);
      if (back !== n || back2 !== n || ser(n) !== before) same.push(`${name}: ${before} -> ${ser(n)}`);
    }
  }
  expect(!same.length && !DOC.log.some(e => e[0] === 'setAttribute'), `with v1, glyphed() hands every one of the ${NAMES_G.length} glyphs' elements back exactly as built, and touches no attribute` + (same.length ? ' — ' + same.join('; ') : ''));
  expect(VB.glyphed(null, 'prev') === null && VB.tailpiece('you') === null && VB.vessel() === IC1.vessel,
    'glyphed(null) is null; with v1 there is no tailpiece, and the vessel is v1\'s');
  {
    const p = UI.el('div', 'screen-pad'); p.appendChild(UI.el('div', 'card'));
    const before = ser(p);
    expect(VB.tail(p, 'you') === p && ser(p) === before && VB.tail(null, 'you') === null, 'tail() adds nothing to a screen in v1');
  }
  // Each screen, and the recap, ends in tail() by its own name.
  const TAILS = [['you.js', 'you'], ['workout.js', 'workout'], ['workout.js', 'recap'], ['food.js', 'food'], ['weight.js', 'weight'], ['steps.js', 'steps']];
  const noTail = TAILS.filter(([f, s]) => !new RegExp("tail\\([^;]*, '" + s + "'\\)").test(read(f)));
  expect(!noTail.length && IDX && true, 'every tab and the recap hand their screen to tail() under their own name: ' + TAILS.map(([f, s]) => f + ' ' + s).join(', ') + (noTail.length ? ' — missing: ' + noTail.map(x => x.join(' ')).join(', ') : ''));

  // water.js: rack-v58's vessel(), and today's reading vibe.js vessel().
  const liftW = (text, head) => { const i = text.indexOf(head); if (i < 0) return null; return text.slice(i, text.indexOf('\n}\n', i) + 2); };
  const wb = base('water.js'), we = read('water.js');
  const vb = Function('svgEl', 'let clipSeq = 0;\n' + liftW(wb, 'function vessel(frac) {') + liftW(wb, 'function wave(') + 'return vessel;')(UI.svgEl);
  const ve = Function('svgEl', 'vesselShape', 'let clipSeq = 0;\n' + liftW(we, 'function vessel(frac) {') + liftW(we, 'function wave(') + 'return vessel;')(UI.svgEl, VB.vessel);
  // Tokens resolved through rack.css :root: the engine had already moved the
  // bottle's inside onto --well (rack-v58's --rack) and its cap onto --grip
  // (--knurl), the same colours in v1.
  const tok = s => s.replace(/var\((--[\w-]+)\)/g, (w, k) => (ROOTV[k] !== undefined ? lc(ROOTV[k]) : w));
  const fr = [0, 0.0005, 0.002, 0.25, 0.5, 0.999, 1];
  const vd = fr.filter(x => tok(ser(vb(x))) !== tok(ser(ve(x))));
  expect(!vd.length && /vesselShape\(\)/.test(we) && !/'M 40 10 L 64 10/.test(we),
    `water.js draws rack-v58's bottle from vessel(), attribute for attribute (its colours resolved through :root), empty to full (${fr.join(', ')}) — and no longer holds its own copy of the outline` +
    (vd.length ? ' — differs at ' + vd.join(', ') + `\n      now ${ser(ve(vd[0]))}\n      was ${ser(vb(vd[0]))}` : ''));

  // A staged set that draws: the real vibe.js and contract, one vibe with its
  // own icon set (glyphs, a vessel, ornaments) and a chart look that hatches.
  const dir = mkdtempSync(join(tmpdir(), 'rack-vibe-js-v2-'));
  for (const f of CONTRACT) { mkdirSync(join(dir, dirname(f)), { recursive: true }); writeFileSync(join(dir, f), read(f)); }
  const anchorV = 'export const VIBES = deepFreeze([\n';
  writeFileSync(join(dir, 'vibes/defs/index.js'), read('vibes/defs/index.js').replace(anchorV, anchorV + "  { id: 'tst', name: 'tst', feel: '', experimental: false, scheme: 'dark' },\n"));
  const G =(d) => `{ viewBox: '0 0 24 24', stroke: 1.75, fill: 'none', linecap: 'square', linejoin: 'miter', els: [{ tag: 'path', d: '${d}' }] }`;
  const SET = `{ id: 'tst', icons: {}, glyphs: { prev: ${G('M14 6l-6 6 6 6')}, drop: ${G('M6 4v10h12')}, warn: ${G('M12 3l9 18H3z')}, up: null }, ` +
    "vessel: { viewBox: '0 0 104 168', stroke: 3, d: 'M30 6H74V160H30Z', insideBottom: 150, insideTop: 58, cap: null }, " +
    "ornaments: { you: { viewBox: '0 0 48 24', stroke: 1.5, els: [{ tag: 'circle', cx: 8, cy: 12, r: 6 }] }, steps: null } }";
  writeFileSync(join(dir, 'vibe.js'), read('vibe.js')
    .replace(A_DEFS, "const DEFS = { v1: V1, tst: { ...V1, id: 'tst', icons: 'tst', themeColor: '#0a0b0c', variants: { ...V1.variants, chart: 'print' } }")
    .replace(A_SETS, 'const ICON_SETS = { v1: V1_ICONS, tst: ' + SET));
  const d = freshDoc();
  d.body = new Node_('body');
  const T = await import(pathToFileURL(join(dir, 'vibe.js')).href);
  T.applyVibe('v1');
  expect(!d.body.children.length, 'with v1 applied, the page gets no pattern defs');
  T.applyVibe('tst');
  const b1 = T.glyphed(UI.el('button', null, '‹'), 'prev');
  const sv = b1.children[0];
  expect(b1.children.length === 1 && sv.tag === 'svg' && sv.getAttribute('class') === 'glyph glyph-prev' && sv.getAttribute('role') === 'img' &&
    sv.getAttribute('aria-label') === '‹' && sv.getAttribute('width') === '1em' && sv.getAttribute('height') === '1em' &&
    sv.getAttribute('stroke') === 'currentColor' && sv.getAttribute('stroke-linecap') === 'square' && ser(sv).includes('<path d="M14 6l-6 6 6 6"/>'),
    'under a set that draws it, a glyph site holds the drawing in place of its character — 1em square, in the text colour, named by the character: ' + ser(b1));
  const one = T.glyphed(UI.el('button', 'set-idx', '1'), 'drop'), up = T.glyphed(UI.el('span', 'delta-a', '↑'), 'up'), nx = T.glyphed(UI.el('button', null, '›'), 'next');
  expect(ser(one) === '<button>1</button>' && ser(up) === '<span>↑</span>' && ser(nx) === '<button>›</button>',
    'and only there: a badge whose text is not ↳, a glyph the set leaves null (↑, a number\'s direction) and one it leaves out stay text');
  const note = T.glyphed(UI.noteEl('⚠ That rate would put you at 1,200'), 'warn', { lead: true });
  expect(note.children.length === 2 && note.children[0].tag === 'svg' && note.children[0].getAttribute('aria-label') === '⚠' && note.children[1].data === ' That rate would put you at 1,200',
    'a leading glyph (the ⚠ that opens a sentence) is replaced on its own, and the sentence after it is left word for word');
  const tp = T.tailpiece('you');
  expect(tp && tp.tag === 'svg' && tp.getAttribute('aria-hidden') === 'true' && tp.getAttribute('class') === 'tailpiece tailpiece-you' &&
    tp.getAttribute('width') === '48' && tp.getAttribute('height') === '24' && tp.getAttribute('viewBox') === '0 0 48 24' && tp.getAttribute('fill') === 'none' &&
    tp.style.margin === '32px auto 0' && T.tailpiece('steps') === null && T.tailpiece('food') === null,
    'a tailpiece is the set\'s ornament for that screen, at its own size, hidden from assistive tech, centred 32 under the last box; a screen the set leaves null or out gets none');
  const pad = UI.el('div', 'screen-pad');
  T.tail(pad, 'you'); T.tail(pad, 'steps');
  expect(pad.children.length === 1 && pad.children[0].getAttribute('class') === 'tailpiece tailpiece-you', 'tail() appends it to the screen, once, and nothing for a screen without one');
  const V = T.vessel();
  const vt = Function('svgEl', 'vesselShape', 'let clipSeq = 0;\n' + liftW(we, 'function vessel(frac) {') + liftW(we, 'function wave(') + 'return vessel;')(UI.svgEl, T.vessel);
  const full = vt(1), empty = vt(0);
  const outline = full.children.filter(c => c.tag === 'path' && c.getAttribute('d') === 'M30 6H74V160H30Z');
  const waveY = s => { const g = s.children.find(c => c.tag === 'g'); const p = g && g.children[1]; return p ? +/^M \S+ (\S+)/.exec(p.getAttribute('d'))[1] : null; };
  expect(V.d === 'M30 6H74V160H30Z' && outline.length === 2 && outline[1].getAttribute('stroke-width') === '3' && !full.children.some(c => c.tag === 'rect') &&
    waveY(full) === 58 && waveY(vt(0.5)) === 104 && !empty.children.find(c => c.tag === 'g').children.length,
    'a set\'s own bottle is drawn from its outline and stroke, with no cap where it has none, and filled from its insideBottom to its insideTop — linear in the day (58 full, 104 at half)');
  const defsSvg = d.body.children.find(c => c.getAttribute && c.getAttribute('id') === 'vibe-patterns');
  const pats = defsSvg ? defsSvg.querySelectorAll('*').filter(n => n.tag === 'pattern') : [];
  const blue = pats.find(p => p.getAttribute('id') === 'vibe-hatch-p-blue');
  expect(!!defsSvg && defsSvg.getAttribute('aria-hidden') === 'true' && defsSvg.getAttribute('width') === '0' && pats.length >= 30 && !!blue &&
    blue.getAttribute('patternUnits') === 'userSpaceOnUse' && blue.getAttribute('width') === '2.75' && blue.getAttribute('patternTransform') === 'rotate(45)' &&
    blue.children[0].style.props.stroke === 'var(--p-blue)' && blue.children[0].getAttribute('stroke-width') === '1',
    `a vibe whose chart look hatches (chart · print) gets one hidden <svg id="vibe-patterns">: a hatch per colour role (${pats.length}), each stroked in its own token — vibe-hatch-p-blue in var(--p-blue)`);
  T.applyVibe('tst');
  expect(d.body.children.filter(c => c.getAttribute && c.getAttribute('id') === 'vibe-patterns').length === 1, 'applied again, it is not added twice');
  T.applyVibe('v1');
  expect(!d.body.children.length, 'and switching back to v1 takes it out of the page');
  expect(T.glyphed(UI.el('button', null, '‹'), 'prev').children[0].nodeType === 3 && T.tailpiece('you') === null && J(T.vessel()) === J(IC1.vessel),
    'back in v1 the glyphs are text again, the tailpiece is gone and the bottle is v1\'s');
}

console.log('\n' + (fails.length ? `${fails.length} of ${checks} checks failed.` : `All checks passed. ${checks} checks.`));
process.exit(fails.length ? 1 : 0);
