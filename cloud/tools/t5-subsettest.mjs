// Track 5: does a default subset-font (hb-subset) run keep 'tnum'? And how big is a Latin woff2?
// Usage: node t5-subsettest.mjs <font> <outdir> [wghtMin wghtMax]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const subsetFont = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/subset-font');
const [src, outdir, wmin, wmax] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });
// Google Fonts' own "latin" unicode-range (from its css2 response for Archivo), plus the glyphs Rack draws.
const ranges = [[0x20, 0x7e], [0xa0, 0xff], [0x131, 0x131], [0x152, 0x153], [0x2bb, 0x2bc], [0x2c6, 0x2c6], [0x2da, 0x2da], [0x2dc, 0x2dc],
  [0x2000, 0x206f], [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193], [0x2212, 0x2212], [0x2215, 0x2215]];
let text = '';
for (const [a, b] of ranges) for (let c = a; c <= b; c++) text += String.fromCodePoint(c);
text += '→↳⋯✓✕⚙÷±×';
const buf = readFileSync(src);
const base = src.split('/').pop().replace(/\.[a-z]+$/i, '').replace(/[\[\],]/g, '_');
const opts = wmin ? { variationAxes: { wght: { min: +wmin, max: +wmax, default: +wmin } } } : {};
const sfnt = await subsetFont(buf, text, { targetFormat: 'sfnt', ...opts });
writeFileSync(`${outdir}/${base}.latin.ttf`, sfnt);
const w2 = await subsetFont(buf, text, { targetFormat: 'woff2', ...opts });
writeFileSync(`${outdir}/${base}.latin.woff2`, w2);
console.log(JSON.stringify({ src: src.split('/').pop(), sfntBytes: sfnt.length, woff2Bytes: w2.length, woff2KB: +(w2.length / 1024).toFixed(1), opts }));
