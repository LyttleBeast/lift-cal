// Round-2 review (js lens): every icon site, base 928a65e's own code vs the
// engine's vibe.js, with a recording DOM stub. Prints any difference.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = '/Users/micahflunker/dev/vibes-night/wt/web-base/';
const ENG = '/Users/micahflunker/dev/vibes-night/wt/web-engine/';

class E {
  constructor(ns, tag) { this.ns = ns; this.tag = tag; this.attrs = []; this.children = []; this._html = null; this.style = {}; this.dataset = {}; }
  setAttribute(k, v) { v = String(v); const i = this.attrs.findIndex(a => a[0] === k); if (i >= 0) this.attrs[i][1] = v; else this.attrs.push([k, v]); }
  getAttribute(k) { const a = this.attrs.find(a => a[0] === k); return a ? a[1] : null; }
  appendChild(c) { this.children.push(c); return c; }
  set innerHTML(s) { this._html = s; this.children = []; }
  get innerHTML() { return this._html; }
  ser() {
    return '<' + this.tag + (this.ns ? '{' + this.ns + '}' : '') + ' ' + this.attrs.map(([k, v]) => k + '="' + v + '"').join(' ') + '>' +
      (this._html != null ? 'HTML:' + this._html : this.children.map(c => c.ser()).join('')) + '</' + this.tag + '>';
  }
}
globalThis.document = {
  createElementNS: (ns, t) => new E(ns, t),
  createElement: t => new E(null, t),
  documentElement: new E(null, 'html'),
  querySelector: () => null,
  getElementById: () => null,
};

const src = f => readFileSync(BASE + f, 'utf8');
// The expression assigned at "<name>.innerHTML =" on line `line` (1-based), up to the ';'.
function innerExpr(file, line) {
  const lines = src(file).split('\n');
  let s = '';
  for (let i = line - 1; i < lines.length; i++) { s += lines[i] + '\n'; if (/;\s*$/.test(lines[i])) break; }
  s = s.replace(/^[^=]*=/, '');
  return (0, eval)('(' + s.replace(/;\s*$/, '') + ')');
}
function fnSrc(file, name) {
  const t = src(file);
  const i = t.indexOf('function ' + name + '(');
  let depth = 0, j = t.indexOf('{', i);
  for (let k = j; k < t.length; k++) { if (t[k] === '{') depth++; else if (t[k] === '}') { depth--; if (!depth) return t.slice(i, k + 1); } }
}
function constSrc(file, name) {
  const t = src(file);
  const i = t.indexOf('const ' + name + ' =');
  let depth = 0, j = t.indexOf('{', i);
  for (let k = j; k < t.length; k++) { if (t[k] === '{') depth++; else if (t[k] === '}') { depth--; if (!depth) return t.slice(i, k + 2); } }
}

const vibe = await import(pathToFileURL(ENG + 'vibe.js').href);
let bad = 0, n = 0;
const eq = (label, a, b) => { n++; if (a !== b) { bad++; console.log('DIFF', label, '\n  base:', a, '\n  eng :', b); } else console.log('same', label); };

eq('food gear', innerExpr('food.js', 529), vibe.iconHtml('gear'));
eq('steps gear', innerExpr('steps.js', 159), vibe.iconHtml('gear'));
eq('workout calendar', innerExpr('workout.js', 1013), vibe.iconHtml('calendar'));
eq('you gear', innerExpr('you.js', 694), vibe.iconHtml('gearYou', { ariaHidden: true }));

// coach-ui bubble / lock
const coachBase = new Function(fnSrc('coach-ui.js', 'bubbleIcon') + '\n' + fnSrc('coach-ui.js', 'lockIcon') + '\nreturn { bubbleIcon, lockIcon };')();
eq('bubble', coachBase.bubbleIcon().ser(), vibe.icon('bubble', { ariaHidden: true, innerHTML: true }).ser());
eq('lock (not pro)', coachBase.lockIcon(false).ser(), vibe.icon('lock', { ariaHidden: true, innerHTML: true }).ser());
eq('lock (pro)', coachBase.lockIcon(true).ser(), vibe.icon('unlock', { ariaHidden: true, innerHTML: true }).ser());

// food.js icon(name, width)
const svgEl = (t, attrs) => { const n = document.createElementNS('http://www.w3.org/2000/svg', t); if (attrs) for (const k of Object.keys(attrs)) n.setAttribute(k, attrs[k]); return n; };
const foodBase = new Function('svgEl', constSrc('food.js', 'ICON_PATHS') + '\n' + fnSrc('food.js', 'icon') + '\nreturn icon;')(svgEl);
const engFoodIcon = (name, width) => vibe.icon(name, width ? { stroke: width } : undefined);
for (const [name, w] of [['plus', '2.6'], ['camera'], ['pen'], ['barcode'], ['keypad'], ['book'], ['stack'], ['spark', '1.6'], ['spark'], ['nosuch'], ['nosuch', '2']])
  eq('food icon ' + name + ' ' + (w || ''), foodBase(name, w).ser(), engFoodIcon(name, w).ser());

// Same element each call? (a shared node would move between parents)
const a1 = vibe.icon('bubble', { ariaHidden: true, innerHTML: true }), a2 = vibe.icon('bubble', { ariaHidden: true, innerHTML: true });
eq('fresh element per call', 'true', String(a1 !== a2));
console.log(bad ? `${bad} of ${n} differ` : `all ${n} same`);
