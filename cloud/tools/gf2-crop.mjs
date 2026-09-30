// gf2-crop.mjs — 08b gap-fill resume: crop a PNG (study only, scratch-gf) with pngjs, optional integer upscale
// (nearest neighbour) so a small cut can be inspected by eye. No resampling of originals: input is a scratch PNG.
// Usage: node gf2-crop.mjs <in.png> <x> <y> <w> <h> <out.png> [upscale]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [inp, xs, ys, ws, hs, out, ks = '1'] = process.argv.slice(2);
const src = PNG.sync.read(readFileSync(inp));
const x0 = Math.max(0, +xs), y0 = Math.max(0, +ys);
const w = Math.min(+ws, src.width - x0), h = Math.min(+hs, src.height - y0), k = +ks;
const dst = new PNG({ width: w * k, height: h * k });
for (let y = 0; y < h * k; y++) for (let x = 0; x < w * k; x++) {
  const s = ((y0 + Math.floor(y / k)) * src.width + x0 + Math.floor(x / k)) * 4, d = (y * w * k + x) * 4;
  for (let c = 0; c < 4; c++) dst.data[d + c] = src.data[s + c];
}
writeFileSync(out, PNG.sync.write(dst));
console.log(out, `${w * k}x${h * k}`, `from ${src.width}x${src.height} at ${x0},${y0}`);
