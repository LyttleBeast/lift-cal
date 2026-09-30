// gf-thumbs.mjs — gap-fill (critic round, 08b): fetch reduced page images of an Internet Archive book through
// fetch.mjs (host-checked, archive.org only) and tile them into one contact sheet (study only, scratch-gf).
// Pages are addressed by JP2 leaf number (the _NNNN in the jp2.zip), which equals the OCR "page" index.
// Usage: node gf-thumbs.mjs <identifier> <sheetname> <scale> <cols> leaf1 leaf2 ... | from-to
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [id, name, scale, colsS, ...spec] = process.argv.slice(2);
const DIR = '/Users/micahflunker/dev/vibes-night/research/iron-age/scratch-gf';
mkdirSync(DIR, { recursive: true });
const meta = JSON.parse(execFileSync('node', ['-e', `fetch('https://archive.org/metadata/${id}').then(r=>r.text()).then(t=>process.stdout.write(t))`], { maxBuffer: 64e6 }).toString());
const zipf = (meta.files || []).find(f => /_jp2\.zip$/.test(f.name));
const base = zipf.name.replace(/_jp2\.zip$/, '');
const leaves = [];
for (const s of spec) { const m = s.match(/^(\d+)-(\d+)$/); if (m) { for (let i = +m[1]; i <= +m[2]; i++) leaves.push(i); } else leaves.push(+s); }
const tiles = [];
for (const L of leaves) {
  const leaf = String(L).padStart(4, '0');
  const jpg = `${DIR}/t-${id}-${leaf}-s${scale}.jpg`, png = jpg.replace(/\.jpg$/, '.png');
  if (!existsSync(png)) {
    const u = `https://${meta.server}/BookReader/BookReaderImages.php?zip=${encodeURIComponent(meta.dir + '/' + zipf.name)}&file=${encodeURIComponent(base + '_jp2/' + base + '_' + leaf + '.jp2')}&id=${id}&scale=${scale}&rotate=0`;
    try {
      execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', u, jpg], { stdio: 'ignore' });
      execFileSync('sips', ['-s', 'format', 'png', jpg, '--out', png], { stdio: 'ignore' });
    } catch (e) { console.log(leaf, 'FAILED'); continue; }
  }
  try { tiles.push({ leaf, img: PNG.sync.read(readFileSync(png)) }); } catch { console.log(leaf, 'BADPNG'); }
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
console.log('sheet', out, `${sheet.width}x${sheet.height}`, 'leaves(row-major):', tiles.map(t => t.leaf).join(','));
