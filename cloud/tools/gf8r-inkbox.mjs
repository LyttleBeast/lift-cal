// gf8r-inkbox.mjs — critic-round gap fill (08a/09). Measure the inked bounding box inside a rough region of a
// page scan (PNG made by sips from the untouched original). Dark = luminance < thr; a row/column counts as inked
// when it holds at least `min` dark pixels. Prints the box as fractions of the whole page and in pixels.
// Usage: node gf8r-inkbox.mjs <png> <x0> <y0> <x1> <y1> [thr=120] [min=4]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [f, ...a] = process.argv.slice(2);
const [x0f, y0f, x1f, y1f] = a.slice(0, 4).map(Number);
const thr = Number(a[4] ?? 120), min = Number(a[5] ?? 4);
const png = PNG.sync.read(readFileSync(f));
const { width: W, height: H, data } = png;
const X0 = Math.round(x0f * W), X1 = Math.round(x1f * W), Y0 = Math.round(y0f * H), Y1 = Math.round(y1f * H);
const rows = new Array(H).fill(0), cols = new Array(W).fill(0);
for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
  const i = (y * W + x) * 4;
  const L = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  if (L < thr) { rows[y]++; cols[x]++; }
}
let ry0 = -1, ry1 = -1, cx0 = -1, cx1 = -1;
for (let y = Y0; y < Y1; y++) if (rows[y] >= min) { if (ry0 < 0) ry0 = y; ry1 = y; }
for (let x = X0; x < X1; x++) if (cols[x] >= min) { if (cx0 < 0) cx0 = x; cx1 = x; }
const r = v => Math.round(v * 1000) / 1000;
console.log(JSON.stringify({ file: f, W, H, box: { x0: r(cx0 / W), y0: r(ry0 / H), x1: r((cx1 + 1) / W), y1: r((ry1 + 1) / H) }, px: `${cx1 - cx0 + 1}x${ry1 - ry0 + 1}`, at: [cx0, ry0] }));
