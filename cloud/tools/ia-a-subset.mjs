// Iron Age A: web budget for Besley (roman + italic), latin woff2 with hb-subset (subset-font),
// every layout feature kept, with and without trimming the axes. Study output only.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const subsetFont = require('subset-font');
const OUT = '/Users/micahflunker/dev/vibes-night/design/iron-age/scratch-a/fonts';
// Google Fonts' "latin" unicode-range, plus the Rack extras track 5 adds (→ ↳ ⋯ ✓ ✕ ⚙ ÷ ± ×) and ≈
const ranges = [[0x0000, 0x00FF], [0x0131, 0x0131], [0x0152, 0x0153], [0x02BB, 0x02BC], [0x02C6, 0x02C6], [0x02DA, 0x02DA], [0x02DC, 0x02DC],
  [0x0304, 0x0304], [0x0308, 0x0308], [0x0329, 0x0329], [0x2000, 0x206F], [0x20AC, 0x20AC], [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193],
  [0x2212, 0x2212], [0x2215, 0x2215], [0xFEFF, 0xFEFF], [0xFFFD, 0xFFFD], [0x2248, 0x2248]];
let text = ''; for (const [a, b] of ranges) for (let c = a; c <= b; c++) text += String.fromCodePoint(c);
const jobs = [
  ['Besley roman, full axes', '/Users/micahflunker/dev/vibes-night/research/fonts/besley/upstream/Besley[wdth,wght].ttf', null, 'besley-roman-full.woff2'],
  ['Besley roman, wght 600-800, wdth 85-100', '/Users/micahflunker/dev/vibes-night/research/fonts/besley/upstream/Besley[wdth,wght].ttf', { wght: { min: 600, max: 800 }, wdth: { min: 85, max: 100 } }, 'besley-roman-600-800.woff2'],
  ['Besley italic, full axes', `${OUT}/Besley-Italic[wdth,wght].ttf`, null, 'besley-italic-full.woff2'],
  ['Besley italic, wght 400-500, wdth 100 pinned', `${OUT}/Besley-Italic[wdth,wght].ttf`, { wght: { min: 400, max: 500 }, wdth: 100 }, 'besley-italic-400-500.woff2'],
];
for (const [label, src, axes, out] of jobs) {
  try {
    const buf = fs.readFileSync(src);
    const opts = { targetFormat: 'woff2' }; if (axes) opts.variationAxes = axes;
    const r = await subsetFont(buf, text, opts);
    fs.writeFileSync(`${OUT}/${out}`, r);
    console.log(`${label}: ${r.length} B (${(r.length / 1024).toFixed(1)} KB) sha256 ${createHash('sha256').update(r).digest('hex').slice(0, 16)} -> ${out}`);
  } catch (e) { console.log(`${label}: ERROR ${e.message}`); }
}
