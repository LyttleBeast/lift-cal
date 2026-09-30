// Compares the two probe dumps pweb-r1-css-probe.mjs wrote. Prints every
// difference and a summary line; exit 1 if anything differs.
//   node pweb-r1-css-compare.mjs <dir>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const DIR = process.argv[2] || '/Users/micahflunker/dev/vibes-night/proof/pweb-r1-css';
const A = JSON.parse(readFileSync(join(DIR, 'base.json'), 'utf8'));
const B = JSON.parse(readFileSync(join(DIR, 'engine.json'), 'utf8'));
const out = [], info = []; const n ={ rules: 0, styleRules: 0, decls: 0, keyframes: 0, offsets: 0, rootProps: 0, rootCustom: 0, pairs: 0, paint: 0 };
const eqObj = (a, b, where) => {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) if (JSON.stringify((a || {})[k]) !== JSON.stringify((b || {})[k])) out.push(where + ' ' + k + ': base ' + JSON.stringify((a || {})[k]) + ' | engine ' + JSON.stringify((b || {})[k]));
};
out.push('# sheets base ' + JSON.stringify(A.sheets.map(s => s.n)) + ' engine ' + JSON.stringify(B.sheets.map(s => s.n)) + '; vibe.js ' + A.vibeJs + '/' + B.vibeJs + '; longhands ' + A.names + '/' + B.names);
const diffsBefore = () => out.length;
const d0 = out.length;
if (A.rules.length !== B.rules.length) out.push('RULE COUNT base ' + A.rules.length + ' engine ' + B.rules.length);
for (let i = 0; i < Math.min(A.rules.length, B.rules.length); i++) {
  const a = A.rules[i], b = B.rules[i]; n.rules++;
  const id = `[${i}] ${a.file}${a.ctx ? ' ' + a.ctx : ''} ${a.sel || a.name || a.cond || a.href || a.type}`;
  for (const k of ['type', 'file', 'ctx', 'sel', 'cond', 'name', 'href', 'media', 'nested']) if (a[k] !== b[k]) out.push(id + ' STRUCT ' + k + ': ' + JSON.stringify(a[k]) + ' -> ' + JSON.stringify(b[k]));
  if (a.type === 'CSSStyleRule') {
    n.styleRules++; n.decls += a.props.length;
    const isRoot = a.sel === ':root' && !a.ctx;
    const fa = isRoot ? a.props : a.props, fb = isRoot ? b.props.filter(p => !p[0].startsWith('--') || a.props.some(q => q[0] === p[0])) : b.props;
    const pa = JSON.stringify(fa), pb = JSON.stringify(fb);
    if (pa !== pb) {
      const sa = JSON.stringify([...fa].sort()), sb = JSON.stringify([...fb].sort());
      if (sa === sb) info.push(id + ' ORDER-ONLY (same longhand set, CSSOM order differs)');
      else out.push(id + ' KEPT-LONGHANDS: base ' + pa + ' | engine ' + pb);
    }
    const ca = { ...a.computed }, cb = { ...b.computed };
    if (isRoot) for (const k of Object.keys(cb)) if (k.startsWith('--') && !(k in ca)) delete cb[k];
    eqObj(ca, cb, id + ' COMPUTED');
    if (a.svg || b.svg) eqObj(a.svg, b.svg, id + ' SVG');
  } else if (a.type === 'CSSKeyframesRule') {
    n.keyframes++;
    const fa = JSON.stringify(a.frames.map(f => [f.key, f.props])), fb = JSON.stringify(b.frames.map(f => [f.key, f.props]));
    if (fa !== fb) out.push(id + ' KEYFRAME-LONGHANDS: base ' + fa + ' | engine ' + fb);
    for (const off of new Set([...Object.keys(a.at), ...Object.keys(b.at)])) { n.offsets++; eqObj(a.at[off], b.at[off], id + ' @' + off + '%'); }
  } else if (a.type !== 'CSSMediaRule' && a.type !== 'CSSSupportsRule' && a.type !== 'CSSImportRule') {
    if (a.cssText !== b.cssText) out.push(id + ' OTHER cssText differs');
  }
}
for (const k of new Set([...Object.keys(A.root), ...Object.keys(B.root)])) { n.rootProps++; if (A.root[k] !== B.root[k]) out.push(':root/html ' + k + ': ' + JSON.stringify(A.root[k]) + ' -> ' + JSON.stringify(B.root[k])); }
for (const k of new Set([...Object.keys(A.body), ...Object.keys(B.body)])) if (A.body[k] !== B.body[k]) out.push('body ' + k + ': ' + JSON.stringify(A.body[k]) + ' -> ' + JSON.stringify(B.body[k]));
for (const k of Object.keys(A.rootCustom)) { n.rootCustom++; if ((A.rootCustom[k] || '').trim() !== (B.rootCustom[k] || '').trim()) out.push(':root ' + k + ': ' + JSON.stringify(A.rootCustom[k]) + ' -> ' + JSON.stringify(B.rootCustom[k])); }
const newCustom = Object.keys(B.rootCustom).filter(k => !(k in A.rootCustom));
for (const k of Object.keys(A.pairs)) { n.pairs++; const a = { ...A.pairs[k] }, b = { ...B.pairs[k] }; delete a.inline; delete b.inline; delete a.kpiRgb; delete b.kpiRgb; eqObj(a, b, 'PAIR ' + k); if ((A.pairs[k].kpiRgb || '') !== (B.pairs[k].kpiRgb || '')) out.push('(info) PAIR ' + k + ' --kpi-rgb token stream: ' + JSON.stringify(A.pairs[k].kpiRgb) + ' -> ' + JSON.stringify(B.pairs[k].kpiRgb)); }
for (const h of Object.keys(A.paint)) {
  n.paint++;
  const a = A.paint[h], b = B.paint[h];
  if (a.bg !== b.bg) out.push('PAINT ' + h + ' -> ' + b.value + ' background: ' + a.bg + ' | ' + b.bg);
  if (a.donutStroke !== b.donutStroke) out.push('PAINT ' + h + ' -> ' + b.value + ' donut stroke: ' + a.donutStroke + ' | ' + b.donutStroke);
  if (a.fillAttr !== b.fillAttr) out.push('PAINT ' + h + ' -> ' + b.value + ' as a fill ATTRIBUTE: ' + a.fillAttr + ' | ' + b.fillAttr);
}
const real = out.filter(l => !l.startsWith('#') && !l.startsWith('(info)'));
writeFileSync(join(DIR, 'compare.txt'), out.join('\n') + '\n\nINFO\n' + info.join('\n') + '\n');
console.log(out.slice(0, 60).join('\n'));
console.log('info lines: ' + info.length + ' (in ' + join(DIR, 'compare.txt') + ')');
console.log('\nnew :root custom properties on engine: ' + newCustom.length);
console.log('paint map: ' + Object.entries(B.paint).map(([h, v]) => h + '->' + v.value).join(' '));
console.log(JSON.stringify(n));
console.log(real.length + ' differences');
process.exit(real.length ? 1 : 0);
