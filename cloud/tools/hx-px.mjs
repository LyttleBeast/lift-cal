// hx-px: print every differing pixel of two PNGs (device px), with both RGBA values.
//   node hx-px.mjs <a.png> <b.png> [max=60]
import { readFileSync } from 'node:fs';
const { decodePNG } = await import('/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs');
const [fa, fb, maxArg] = process.argv.slice(2);
const A = decodePNG(readFileSync(fa)), B = decodePNG(readFileSync(fb));
console.log('A', A.width, A.height, 'bpp', A.bpp, ' B', B.width, B.height, 'bpp', B.bpp);
let n = 0; const max = +(maxArg || 60);
for (let y = 0; y < Math.min(A.height, B.height); y++) for (let x = 0; x < Math.min(A.width, B.width); x++) {
  const ia = (y * A.width + x) * A.bpp, ib = (y * B.width + x) * B.bpp;
  let d = false; for (let k = 0; k < A.bpp; k++) if (A.data[ia + k] !== B.data[ib + k]) d = true;
  if (!d) continue;
  if (n++ < max) console.log(x, y, '(css ' + (x / 3).toFixed(2) + ',' + (y / 3).toFixed(2) + ')', 'A', [...A.data.subarray(ia, ia + A.bpp)].join(','), 'B', [...B.data.subarray(ib, ib + B.bpp)].join(','));
}
console.log('total', n);
process.exit(0);
