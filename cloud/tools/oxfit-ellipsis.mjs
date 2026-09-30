// What a 36px-wide text-overflow:ellipsis box shows of a string, in a variable font at given axes with tnum.
// Usage: node oxfit-ellipsis.mjs <text> <boxPx> <sizePx> <font>:<axes json>[:<unicode-range regex>] ...
// Fonts are tried in order per character (the first whose cmap has it and whose range matches), as a @font-face stack is.
import * as fontkit from 'fontkit';
import { readFileSync } from 'node:fs';
const [text, box, size, ...specs] = process.argv.slice(2);
const fonts = specs.map(s => {
  const [path, axes, range, plain] = s.split('|');
  const base = fontkit.create(readFileSync(path));
  let f = base;
  const ax = JSON.parse(axes || '{}');
  if (Object.keys(ax).length) f = base.getVariation(ax);
  return { f, base, range: range ? new RegExp(range, 'u') : null, path, feats: plain === 'plain' ? [] : ['tnum'] };
});
const adv = ch => {
  for (const { f, base, range, path, feats } of fonts) {
    if (range && !range.test(ch)) continue;
    if (!base.hasGlyphForCodePoint(ch.codePointAt(0))) continue;
    const run = base.layout(ch, feats);
    const gid = run.glyphs[0].id;
    const w = f === base ? run.glyphs[0].advanceWidth : f.getGlyph(gid).advanceWidth;
    return { w: w * +size / base.unitsPerEm, from: path.split('/').pop() + '#' + gid };
  }
  return { w: NaN, from: 'none' };
};
const chars = [...text];
const widths = chars.map(adv);
const total = widths.reduce((a, x) => a + x.w, 0);
const ell = adv('…');
console.log('chars', chars.map((c, i) => c + '=' + widths[i].w.toFixed(2) + '(' + widths[i].from + ')').join(' '), 'total', total.toFixed(2), 'ellipsis', ell.w.toFixed(2));
if (total <= +box) { console.log('shows whole:', text); process.exit(0); }
let acc = 0, n = 0;
while (n < chars.length && acc + widths[n].w + ell.w <= +box + 1e-6) { acc += widths[n].w; n++; }
console.log('shows:', chars.slice(0, n).join('') + '…', '(' + (acc + ell.w).toFixed(2) + 'px of ' + box + ')');
