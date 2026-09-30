// pwr3 js-lens reviewer: rebuild every icon site's DOM the way rack-v58 wrote
// it and the way the engine writes it, with a recording DOM stub, and compare
// attribute lists (in order), children and innerHTML. Also check paint() on
// every baked hex against the engine's :root.
// Usage: node pwr3-js-icons.mjs <engineTree> <baseTree>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [E, B] = process.argv.slice(2);

// ---- a recording DOM stub ----
class Node {
  constructor(tag) { this.tag = tag; this.attrs = []; this.children = []; this._html = null; this.style = { setProperty() {} }; }
  setAttribute(k, v) {
    const i = this.attrs.findIndex(a => a[0] === k);
    if (i >= 0) this.attrs[i][1] = String(v); else this.attrs.push([k, String(v)]);
  }
  getAttribute(k) { const a = this.attrs.find(a => a[0] === k); return a ? a[1] : null; }
  appendChild(c) { this.children.push(c); return c; }
  set innerHTML(h) { this._html = h; this.children = parseMarkup(h); }
  get innerHTML() { return this._html; }
  querySelectorAll() { return []; }
}
// Parse the tiny self-closing SVG markup these sites write into nodes, so a
// site that builds by element and a site that writes markup compare as DOM.
function parseMarkup(h) {
  const out = [];
  const re = /<(\w+)((?:\s+[\w:-]+="[^"]*")*)\s*\/>/g;
  let m, last = 0;
  while ((m = re.exec(h))) {
    if (m.index !== last) throw new Error('unparsed markup at ' + last + ': ' + h.slice(last, m.index));
    last = re.lastIndex;
    const n = new Node(m[1]);
    const ar = /([\w:-]+)="([^"]*)"/g; let a;
    while ((a = ar.exec(m[2]))) n.setAttribute(a[1], a[2].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&'));
    out.push(n);
  }
  if (last !== h.length) throw new Error('trailing markup: ' + h.slice(last));
  return out;
}
function svgFromMarkup(h) {
  const m = /^<svg((?:\s+[\w:-]+="[^"]*")*)>([\s\S]*)<\/svg>$/.exec(h);
  if (!m) throw new Error('not an svg: ' + h.slice(0, 80));
  const n = new Node('svg');
  const ar = /([\w:-]+)="([^"]*)"/g; let a;
  while ((a = ar.exec(m[1]))) n.setAttribute(a[1], a[2]);
  n.innerHTML = m[2];
  return n;
}
const dump = n => ({ tag: n.tag, attrs: n.attrs, kids: n.children.map(dump) });
globalThis.document = {
  createElementNS: (ns, t) => new Node(t),
  documentElement: { dataset: {} },
  querySelector: () => null, getElementById: () => null, styleSheets: [], baseURI: 'http://x/'
};

const vibe = await import(pathToFileURL(path.join(E, 'vibe.js')).href);
const results = [];
const same = (name, a, b) => {
  const ja = JSON.stringify(dump(a)), jb = JSON.stringify(dump(b));
  results.push({ name, identical: ja === jb, ...(ja === jb ? {} : { base: ja, engine: jb }) });
};

// ---- the base sites, reproduced from 928a65e's source text ----
const src = f => fs.readFileSync(path.join(B, f), 'utf8');
// Extract a JS string-concatenation expression 'a' + 'b' ... that follows `lead` and ends at ';'
function strExpr(file, lead) {
  const s = src(file);
  const i = s.indexOf(lead);
  if (i < 0) throw new Error('lead not found in ' + file + ': ' + lead);
  const j = s.indexOf(';', i + lead.length);
  const expr = s.slice(i + lead.length, j);
  return Function('return (' + expr.trim() + ')')();
}
const gearFood = strExpr('food.js', "gear.setAttribute('aria-label', 'Fuel settings');\n  gear.innerHTML =");
const gearSteps = strExpr('steps.js', "gear.setAttribute('aria-label', 'Step settings');\n  gear.innerHTML =");
const gearYou = strExpr('you.js', "gear.setAttribute('aria-label', 'Settings');\n  gear.innerHTML =");
const cal = strExpr('workout.js', "cal.title = 'Calendar';\n    cal.innerHTML =");
results.push({ name: 'raw gear food', identical: gearFood === vibe.iconHtml('gear'), base: gearFood, engine: vibe.iconHtml('gear') });
results.push({ name: 'raw gear steps', identical: gearSteps === vibe.iconHtml('gear'), base: gearSteps, engine: vibe.iconHtml('gear') });
results.push({ name: 'raw gear you', identical: gearYou === vibe.iconHtml('gearYou', { ariaHidden: true }), base: gearYou, engine: vibe.iconHtml('gearYou', { ariaHidden: true }) });
results.push({ name: 'raw calendar', identical: cal === vibe.iconHtml('calendar'), base: cal, engine: vibe.iconHtml('calendar') });
same('dom gear food', svgFromMarkup(gearFood), svgFromMarkup(vibe.iconHtml('gear')));
same('dom gear steps', svgFromMarkup(gearSteps), svgFromMarkup(vibe.iconHtml('gear')));
same('dom gear you', svgFromMarkup(gearYou), svgFromMarkup(vibe.iconHtml('gearYou', { ariaHidden: true })));
same('dom calendar', svgFromMarkup(cal), svgFromMarkup(vibe.iconHtml('calendar')));

// coach-ui marks, base: evaluate the base functions' bodies with the stub.
{
  const s = src('coach-ui.js');
  const grab = name => {
    const i = s.indexOf('function ' + name + '(');
    let depth = 0, j = s.indexOf('{', i);
    for (let k = j; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (!depth) return s.slice(i, k + 1); } }
  };
  const bubble = Function(grab('bubbleIcon') + '; return bubbleIcon;')();
  const lock = Function(grab('lockIcon') + '; return lockIcon;')();
  same('bubble', bubble(), vibe.icon('bubble', { ariaHidden: true, innerHTML: true }));
  same('lock (not pro)', lock(false), vibe.icon('lock', { ariaHidden: true, innerHTML: true }));
  same('unlock (pro)', lock(true), vibe.icon('unlock', { ariaHidden: true, innerHTML: true }));
  results.push({ name: 'bubble innerHTML string', identical: bubble().innerHTML === vibe.icon('bubble', { ariaHidden: true, innerHTML: true }).innerHTML });
  results.push({ name: 'lock innerHTML string', identical: lock(false).innerHTML === vibe.icon('lock', { ariaHidden: true, innerHTML: true }).innerHTML });
  results.push({ name: 'unlock innerHTML string', identical: lock(true).innerHTML === vibe.icon('unlock', { ariaHidden: true, innerHTML: true }).innerHTML });
}

// food.js add-flow icons, base: ICON_PATHS + icon() with svgEl.
{
  const s = src('food.js');
  const i = s.indexOf('const ICON_PATHS = {');
  const j = s.indexOf('};', i);
  const ICON_PATHS = Function('return ' + s.slice(i + 'const ICON_PATHS = '.length, j + 1))();
  const svgEl = (t, attrs) => { const n = document.createElementNS('', t); if (attrs) for (const k of Object.keys(attrs)) n.setAttribute(k, attrs[k]); return n; };
  const baseIcon = (name, width) => {
    const svg = svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': width || '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    (ICON_PATHS[name] || []).forEach(d => svg.appendChild(svgEl('path', { d })));
    return svg;
  };
  const engIcon = (name, width) => vibe.icon(name, width ? { stroke: width } : undefined);
  for (const [n, w] of [['plus', '2.6'], ['spark', '1.6'], ['book'], ['stack'], ['camera'], ['pen'], ['barcode'], ['keypad'], ['plus'], ['spark']])
    same('food icon ' + n + (w ? ' @' + w : ''), baseIcon(n, w), engIcon(n, w));
  results.push({ name: 'food icon names', base: Object.keys(ICON_PATHS) });
}

// paint(): every baked hex against the engine's :root
{
  const rootVars = {};
  const css = fs.readFileSync(path.join(E, 'rack.css'), 'utf8');
  const m = /(^|\n):root\s*\{([^}]*)\}/.exec(css);
  for (const d of m[2].replace(/\/\*[\s\S]*?\*\//g, '').split(';')) { const x = /^\s*(--[\w-]+)\s*:\s*([\s\S]*?)\s*$/.exec(d); if (x) rootVars[x[1]] = x[2]; }
  const hexes = ['#D6252B', '#2E7FD9', '#F0BE1E', '#2AA85C', '#E8E5DE', '#A8AEB8', '#d6252b', '#2e7fd9', '#f0be1e', '#2aa85c', '#e8e5de', '#a8aeb8', '#8d939f', 'var(--dim)', undefined, 'var(--p-red)'];
  const rows = hexes.map(h => {
    const p = vibe.paint(h);
    const t = /^var\((--[\w-]+)\)$/.exec(p || '');
    return { in: h, out: p, token: t && t[1], value: t && rootVars[t[1]], ok: h === undefined || !/^#/.test(h) ? p === h : !!(t && rootVars[t[1]] && rootVars[t[1]].toLowerCase() === h.toLowerCase()) };
  });
  results.push({ name: 'paint', identical: rows.every(r => r.ok), rows });
}
console.log(JSON.stringify(results, null, 1));
console.log('ALL IDENTICAL:', results.filter(r => 'identical' in r).every(r => r.identical));
