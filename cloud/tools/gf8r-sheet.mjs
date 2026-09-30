// gf8r-sheet.mjs — critic-round gap fill (08a/09). Tile same-height PNG study previews into one contact sheet
// (study only, never an asset). Usage: node gf8r-sheet.mjs <out.png> <cols> <in1.png> <in2.png> ...
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [out, colsA, ...ins] = process.argv.slice(2);
const cols = Number(colsA);
const imgs = ins.map(f => PNG.sync.read(readFileSync(f)));
const cw = Math.max(...imgs.map(i => i.width)), ch = Math.max(...imgs.map(i => i.height));
const rows = Math.ceil(imgs.length / cols);
const S = new PNG({ width: cw * cols, height: ch * rows });
S.data.fill(255);
imgs.forEach((im, k) => {
  const ox = (k % cols) * cw, oy = Math.floor(k / cols) * ch;
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    const s = (y * im.width + x) * 4, d = ((oy + y) * S.width + ox + x) * 4;
    S.data[d] = im.data[s]; S.data[d + 1] = im.data[s + 1]; S.data[d + 2] = im.data[s + 2]; S.data[d + 3] = 255;
  }
});
writeFileSync(out, PNG.sync.write(S));
console.log(out, S.width + 'x' + S.height);
