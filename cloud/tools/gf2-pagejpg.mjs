// gf2-pagejpg.mjs — 08b gap-fill resume: fetch archive.org/download/<id>/page/nN.jpg (the item's own page
// render) through tools/fetch.mjs (host-checked, V59 §14), convert to PNG with sips, and tile a contact sheet.
// Study only: everything lands in research/iron-age/scratch-gf. Works for items with no _jp2.zip (Google TIFF).
// Usage: node gf2-pagejpg.mjs <identifier> <sheetname> <cols> n1 n2 ... | from-to
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [id, name, colsS, ...spec] = process.argv.slice(2);
const DIR = '/Users/micahflunker/dev/vibes-night/research/iron-age/scratch-gf';
const ns = [];
for (const s of spec) { const m = s.match(/^(\d+)-(\d+)$/); if (m) { for (let i = +m[1]; i <= +m[2]; i++) ns.push(i); } else ns.push(+s); }
const tiles = [];
for (const n of ns) {
  const jpg = `${DIR}/p-${id}-n${n}.jpg`, png = jpg.replace(/\.jpg$/, '.png');
  if (!existsSync(png)) {
    try {
      console.log(execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', `https://archive.org/download/${id}/page/n${n}.jpg`, jpg]).toString().trim());
      execFileSync('sips', ['-s', 'format', 'png', jpg, '--out', png], { stdio: 'ignore' });
    } catch (e) { console.log('n' + n, 'FAILED'); continue; }
  }
  try { tiles.push({ n, img: PNG.sync.read(readFileSync(png)) }); } catch { console.log('n' + n, 'BADPNG'); }
}
if (!tiles.length) process.exit(1);
const cols = Math.min(+colsS, tiles.length), rows = Math.ceil(tiles.length / cols);
const tw = Math.max(...tiles.map(t => t.img.width)), th = Math.max(...tiles.map(t => t.img.height));
const sheet = new PNG({ width: cols * (tw + 6), height: rows * (th + 6) });
sheet.data.fill(128);
tiles.forEach((t, i) => {
  const ox = (i % cols) * (tw + 6), oy = Math.floor(i / cols) * (th + 6);
  for (let y = 0; y < t.img.height; y++) for (let x = 0; x < t.img.width; x++) {
    const s = (y * t.img.width + x) * 4, d = ((oy + y) * sheet.width + ox + x) * 4;
    for (let c = 0; c < 4; c++) sheet.data[d + c] = t.img.data[s + c];
  }
});
const out = `${DIR}/sheet-${name}.png`;
writeFileSync(out, PNG.sync.write(sheet));
console.log('sheet', out, `${sheet.width}x${sheet.height}`, 'pages:', tiles.map(t => 'n' + t.n + ' ' + t.img.width + 'x' + t.img.height).join(', '));
