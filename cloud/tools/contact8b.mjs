// contact8b.mjs — track 8b: build a labelled-by-order contact sheet from small PNGs (study only, scratch).
// Usage: node contact8b.mjs <out.png> <cols> <a.png> <b.png> ...
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [out, colsArg, ...files] = process.argv.slice(2);
const cols = +colsArg;
const imgs = files.map(f => PNG.sync.read(readFileSync(f)));
const cw = Math.max(...imgs.map(i => i.width)), ch = Math.max(...imgs.map(i => i.height));
const rows = Math.ceil(imgs.length / cols), gap = 8;
const W = cols * (cw + gap), H = rows * (ch + gap);
const o = new PNG({ width: W, height: H });
o.data.fill(90);
imgs.forEach((im, k) => {
  const ox = (k % cols) * (cw + gap), oy = Math.floor(k / cols) * (ch + gap);
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    const s = (y * im.width + x) * 4, d = ((oy + y) * W + ox + x) * 4;
    o.data[d] = im.data[s]; o.data[d + 1] = im.data[s + 1]; o.data[d + 2] = im.data[s + 2]; o.data[d + 3] = 255;
  }
});
writeFileSync(out, PNG.sync.write(o));
console.log(`${out} ${W}x${H} (${imgs.length} tiles, order = argument order)`);
