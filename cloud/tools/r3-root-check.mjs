// r3: the engine :root against touch-target's cascade assumptions:
// single-level literals, no duplicates, no !important, and every place a token
// is spent as a whole shorthand value or as a border width.
import { load } from './r3css-lib.mjs';
const ENG = '/Users/micahflunker/dev/vibes-night/wt/web-engine';
const BASE = '/Users/micahflunker/dev/vibes-night/wt/web-base';
for (const [label, T] of [['base', BASE], ['engine', ENG]]) {
  const rules = [...load(T + '/rack.css', 'rack.css'), ...load(T + '/auth.css', 'auth.css')];
  const roots = rules.filter(r => r.kind === 'style' && r.sel === ':root');
  const seen = new Map(), dup = [], multi = [], imp = [];
  for (const r of roots) for (const d of r.decls) {
    if (!d.prop || !d.prop.startsWith('--')) continue;
    if (seen.has(d.prop)) dup.push(d.prop); seen.set(d.prop, d.value);
    if (d.value.includes('var(')) multi.push(d.prop + ': ' + d.value);
    if (d.important) imp.push(d.prop);
  }
  const SH = /^(margin|padding|border|border-(top|right|bottom|left)|border-width|inset|flex|font|gap|outline|background|grid|place-\w+|border-radius|transition|animation|list-style|columns|text-decoration|overflow)$/;
  const wholeShorthand = [], borderWidthVar = [];
  for (const r of rules) for (const d of r.decls || []) {
    if (!d.prop || d.prop.startsWith('--')) continue;
    if (SH.test(d.prop) && /^var\(--[\w-]+\)$/.test(d.value.trim())) wholeShorthand.push(r.file + ' ' + r.sel + ' { ' + d.prop + ': ' + d.value + ' }');
    if (/^border(-(top|right|bottom|left))?(-width)?$/.test(d.prop)) {
      const first = d.value.trim().split(/\s+/)[0];
      if (/var\(/.test(d.prop.endsWith('width') ? d.value : first)) borderWidthVar.push(r.file + ' ' + r.sel + ' { ' + d.prop + ': ' + d.value + ' }');
    }
  }
  console.log(label, JSON.stringify({ roots: roots.length, tokens: seen.size, dup, multiLevel: multi, important: imp, wholeShorthand, borderWidthVar }, null, 1));
}
