// ia-ph-view.mjs — a study view (never an asset): cut a window out of a work PNG,
// scale it by nearest sampling, and draw a coordinate grid in SOURCE pixels, so
// face boxes can be read by eye. Red lines every <step> px, blue every 5 steps.
//   node ia-ph-view.mjs <in.png> <out.png> <x0> <y0> <x1> <y1> <scale> <step>
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/package.json');
const { PNG } = require('pngjs');
const [inp, out, ...nums] = process.argv.slice(2);
const [x0, y0, x1, y1, scale, step] = nums.map(Number);
const src = PNG.sync.read(readFileSync(inp));
const W = Math.round((x1 - x0) * scale), H = Math.round((y1 - y0) * scale);
const o = new PNG({ width: W, height: H });
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const sx = Math.min(src.width - 1, Math.floor(x0 + x / scale)), sy = Math.min(src.height - 1, Math.floor(y0 + y / scale));
  const i = (sy * src.width + sx) * 4, j = (y * W + x) * 4;
  let r = src.data[i], g = src.data[i + 1], b = src.data[i + 2];
  const onX = Math.floor(x0 + x / scale) % step === 0 && Math.floor(x0 + (x - 1) / scale) % step !== 0;
  const onY = Math.floor(y0 + y / scale) % step === 0 && Math.floor(y0 + (y - 1) / scale) % step !== 0;
  if (onX || onY) {
    const big = (onX && Math.floor(x0 + x / scale) % (step * 5) === 0) || (onY && Math.floor(y0 + y / scale) % (step * 5) === 0);
    if (big) { r = 0; g = 90; b = 255; } else { r = 255; g = 0; b = 0; }
  }
  o.data[j] = r; o.data[j + 1] = g; o.data[j + 2] = b; o.data[j + 3] = 255;
}
writeFileSync(out, PNG.sync.write(o));
console.log(out, W + 'x' + H);
