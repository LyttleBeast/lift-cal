// bbox8b.mjs — track 8b: tighten a rough crop box to the inked pixels inside it.
// Input must be a PNG (make one with: sips -s format png in.jpg --out x.png).
// Usage: node bbox8b.mjs <png> <x> <y> <w> <h> [threshold=140] [pad=12]
// Prints the tight box {x,y,w,h} in the PNG's own pixel space (same as the source JPEG).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [f, X, Y, W, H, T = 140, P = 12] = process.argv.slice(2);
const png = PNG.sync.read(readFileSync(f));
const x0 = Math.max(0, +X), y0 = Math.max(0, +Y);
const x1 = Math.min(png.width, +X + +W), y1 = Math.min(png.height, +Y + +H);
let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1, ink = 0;
// count a row/column as inked only if it has a few dark pixels (ignores specks)
const colCount = new Array(x1 - x0).fill(0), rowCount = new Array(y1 - y0).fill(0);
for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
  const i = (y * png.width + x) * 4;
  const l = 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
  if (l < +T) { colCount[x - x0]++; rowCount[y - y0]++; ink++; }
}
const minRun = 3;
colCount.forEach((c, k) => { if (c >= minRun) { minx = Math.min(minx, x0 + k); maxx = Math.max(maxx, x0 + k); } });
rowCount.forEach((c, k) => { if (c >= minRun) { miny = Math.min(miny, y0 + k); maxy = Math.max(maxy, y0 + k); } });
if (maxx < 0) { console.log('no ink'); process.exit(1); }
const p = +P;
const bx = Math.max(0, minx - p), by = Math.max(0, miny - p);
const bw = Math.min(png.width, maxx + p + 1) - bx, bh = Math.min(png.height, maxy + p + 1) - by;
console.log(JSON.stringify({ image: { w: png.width, h: png.height }, crop: { x: bx, y: by, w: bw, h: bh }, inkPixels: ink }));
