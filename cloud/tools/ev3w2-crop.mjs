// Crops a CSS-px box out of a DPR-3 proof PNG, scaled up 4x, into
// ~/dev/vibes-night/tmp/ev3w2/, so the raster flake's region can be looked at.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [src, out, x, y, w, h] = process.argv.slice(2);
const img = PNG.sync.read(readFileSync(src));
const D = 3, S = 4, X = +x * D, Y = +y * D, W = +w * D, H = +h * D;
const o = new PNG({ width: W * S, height: H * S });
for (let j = 0; j < H * S; j++) for (let i = 0; i < W * S; i++) {
  const si = ((Y + Math.floor(j / S)) * img.width + X + Math.floor(i / S)) * 4, di = (j * W * S + i) * 4;
  for (let c = 0; c < 4; c++) o.data[di + c] = img.data[si + c];
}
writeFileSync('/Users/micahflunker/dev/vibes-night/tmp/ev3w2/' + out, PNG.sync.write(o));
console.log('wrote', out, W * S, 'x', H * S, 'of', img.width, 'x', img.height);
