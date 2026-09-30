// gf2-tile.mjs — 08b gap-fill resume: tile PNGs left to right on grey, for looking at crops by eye (study only).
// Usage: node gf2-tile.mjs <out.png> <in1.png> <in2.png> ...
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [out, ...ins] = process.argv.slice(2);
const imgs = ins.map(f => PNG.sync.read(readFileSync(f)));
const W = imgs.reduce((s, i) => s + i.width + 10, 10), H = Math.max(...imgs.map(i => i.height)) + 20;
const sh = new PNG({ width: W, height: H }); sh.data.fill(150);
let x = 10;
for (const im of imgs) {
  for (let y = 0; y < im.height; y++) for (let xx = 0; xx < im.width; xx++) {
    const s = (y * im.width + xx) * 4, d = ((10 + y) * W + x + xx) * 4;
    for (let c = 0; c < 4; c++) sh.data[d + c] = im.data[s + c];
  }
  x += im.width + 10;
}
writeFileSync(out, PNG.sync.write(sh));
console.log(out, W + 'x' + H);
