// gf08-localsheet.mjs — study-only contact sheet of local originals (sips -Z to PNG, pngjs tiling), plus dims.
// Usage: node gf08-localsheet.mjs <outname> <maxpx> <file> [<file> ...]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [name, max, ...files] = process.argv.slice(2);
const dir = '/Users/micahflunker/dev/vibes-night/research/scratch-gf08/sheets';
mkdirSync(dir, { recursive: true });
const tiles = [];
files.forEach((f, i) => {
  const png = `${dir}/${name}-${i}.png`;
  execFileSync('sips', ['-Z', max, '-s', 'format', 'png', f, '--out', png], { stdio: 'ignore' });
  const sp = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'bitsPerSample', '-g', 'samplesPerPixel', f], { encoding: 'utf8' });
  const g = k => (sp.match(new RegExp(k + ':\\s*(\\d+)')) || [])[1];
  console.log(i, f.split('/').pop(), `${g('pixelWidth')}x${g('pixelHeight')}`, `${g('bitsPerSample')}bit x${g('samplesPerPixel')}`);
  tiles.push(PNG.sync.read(readFileSync(png)));
});
const cols = Math.min(6, tiles.length), rows = Math.ceil(tiles.length / cols);
const tw = Math.max(...tiles.map(t => t.width)), th = Math.max(...tiles.map(t => t.height));
const sheet = new PNG({ width: cols * (tw + 6), height: rows * (th + 6) });
sheet.data.fill(128);
tiles.forEach((t, i) => {
  const ox = (i % cols) * (tw + 6), oy = Math.floor(i / cols) * (th + 6);
  for (let y = 0; y < t.height; y++) for (let x = 0; x < t.width; x++) {
    const s = (y * t.width + x) * 4, d = ((oy + y) * sheet.width + ox + x) * 4;
    for (let c = 0; c < 4; c++) sheet.data[d + c] = t.data[s + c];
  }
});
writeFileSync(`${dir}/${name}-sheet.png`, PNG.sync.write(sheet));
console.log('sheet', `${dir}/${name}-sheet.png`);
