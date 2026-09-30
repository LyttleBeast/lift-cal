// Track 5: Latin woff2 size with axes limited/pinned. Usage: node t5-trim.mjs <font> '<json variationAxes>'
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const subsetFont = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/subset-font');
const ranges = [[0x20, 0x7e], [0xa0, 0xff], [0x131, 0x131], [0x152, 0x153], [0x2bb, 0x2bc], [0x2c6, 0x2c6], [0x2da, 0x2da], [0x2dc, 0x2dc],
  [0x2000, 0x206f], [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193], [0x2212, 0x2212], [0x2215, 0x2215]];
let text = '';
for (const [a, b] of ranges) for (let c = a; c <= b; c++) text += String.fromCodePoint(c);
text += '→↳⋯✓✕⚙÷±×';
const [src, axesJson] = process.argv.slice(2);
const variationAxes = JSON.parse(axesJson);
const w2 = await subsetFont(readFileSync(src), text, { targetFormat: 'woff2', variationAxes });
console.log(src.split('/').pop(), axesJson, (w2.length / 1024).toFixed(1) + 'KB');
