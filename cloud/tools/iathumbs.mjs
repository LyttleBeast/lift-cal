// iathumbs.mjs — fetch small IIIF thumbnails of IA pages via fetch.mjs, then tile them into one contact sheet PNG.
// Usage: node iathumbs.mjs <identifier> <outname> <width> n1 n2 ...   (pages as leaf indices, 0-based)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [id, name, w, ...pages] = process.argv.slice(2);
const dir = '/Users/micahflunker/dev/vibes-night/research/iron-age-period/thumbs';
mkdirSync(dir, { recursive: true });
const tiles = [];
for (const p of pages) {
  const n = p.replace(/^n/, '');
  const jpg = `${dir}/${name}-${n}.jpg`, png = `${dir}/${name}-${n}.png`;
  try {
    execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', `https://iiif.archive.org/iiif/${id}$${n}/full/${w},/0/default.jpg`, jpg], { stdio: 'ignore' });
    execFileSync('sips', ['-s', 'format', 'png', jpg, '--out', png], { stdio: 'ignore' });
    tiles.push({ n, img: PNG.sync.read(readFileSync(png)) });
  } catch (e) { console.log(n, 'FAILED'); }
}
if (!tiles.length) process.exit(1);
const cols = Math.min(6, tiles.length), rows = Math.ceil(tiles.length / cols);
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
writeFileSync(`${dir}/${name}-sheet.png`, PNG.sync.write(sheet));
console.log('sheet', `${dir}/${name}-sheet.png`, tiles.map(t => t.n).join(','));
