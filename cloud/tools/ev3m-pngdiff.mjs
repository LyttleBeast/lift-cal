// ev3m: two PNGs, pixel by pixel: how many differ, where (CSS px at dpr 3), the largest channel delta.
//   node ev3m-pngdiff.mjs <a.png> <b.png>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/package.json');
const { PNG } = require('pngjs');
const [a, b] = process.argv.slice(2).map(f => PNG.sync.read(readFileSync(f)));
if (a.width !== b.width || a.height !== b.height) { console.log('size differs', a.width, a.height, b.width, b.height); process.exit(0); }
let n = 0, max = 0; const where = [];
for (let i = 0; i < a.data.length; i += 4) {
  let d = 0;
  for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(a.data[i + c] - b.data[i + c]));
  if (d) { n++; max = Math.max(max, d); const p = i / 4; where.push(`(${(p % a.width / 3).toFixed(1)},${(Math.floor(p / a.width) / 3).toFixed(1)})±${d}`); }
}
console.log('pixels differing', n, 'max channel delta', max, where.join(' '));
