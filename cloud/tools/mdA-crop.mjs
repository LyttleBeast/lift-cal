// Meet Day concept A: crop a PNG region and downscale by an integer box filter.
// usage: node mdA-crop.mjs <in.png> <out.png> <x> <y> <w> <h> [scale]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PNG } = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/pngjs');
const [inp, out, x0, y0, w0, h0, sc] = process.argv.slice(2);
const src = PNG.sync.read(fs.readFileSync(inp));
const X = +x0, Y = +y0, W = Math.min(+w0, src.width - X), H = Math.min(+h0, src.height - Y), S = +(sc || 1);
const ow = Math.floor(W / S), oh = Math.floor(H / S);
const dst = new PNG({ width: ow, height: oh });
for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
  const acc = [0, 0, 0, 0];
  for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
    const i = ((Y + y * S + dy) * src.width + (X + x * S + dx)) * 4;
    for (let c = 0; c < 4; c++) acc[c] += src.data[i + c];
  }
  const o = (y * ow + x) * 4;
  for (let c = 0; c < 4; c++) dst.data[o + c] = Math.round(acc[c] / (S * S));
}
fs.writeFileSync(out, PNG.sync.write(dst));
console.log(out, ow + 'x' + oh, 'from', src.width + 'x' + src.height);
