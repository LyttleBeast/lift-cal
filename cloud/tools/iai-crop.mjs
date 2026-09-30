// V/icons (Iron Age, V59 §11): step 1 of the trace. Crops each traced source out of its original page
// with macOS sips (the recorded command is printed and written to icons-ia/crops.json), then lays the
// crops out on one contact sheet so they can be looked at. Deterministic; reads only research/iron-age/originals.
//   node tools/iai-crop.mjs [id ...]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from '/Users/micahflunker/dev/vibes-night/tools/node_modules/pngjs/lib/png.js';
import { SOURCES } from './iai-sources.mjs';

const OUT = '/Users/micahflunker/dev/vibes-night/icons-ia/src';
const ORIG = '/Users/micahflunker/dev/vibes-night/research/iron-age/';
const only = process.argv.slice(2);
const rec = {};
const tiles = [];
for (const s of SOURCES) {
  if (only.length && !only.includes(s.id)) continue;
  const inF = ORIG + s.file, out = `${OUT}/${s.id}.png`;
  const { x, y, w, h } = s.crop;
  const args = ['-s', 'format', 'png', '-c', String(h), String(w), '--cropOffset', String(y), String(x), inF, '--out', out];
  execFileSync('sips', args, { stdio: 'ignore' });
  const buf = readFileSync(out), im = PNG.sync.read(buf);
  rec[s.id] = { file: s.file, crop: s.crop, command: 'sips ' + args.map(a => a.startsWith('/') ? a.replace(/^.*vibes-night\//, '') : a).join(' '),
                out_dims: `${im.width}x${im.height}`, out_sha256: createHash('sha256').update(buf).digest('hex') };
  tiles.push([s.id, im]);
  console.log(s.id, im.width + 'x' + im.height);
}
writeFileSync('/Users/micahflunker/dev/vibes-night/icons-ia/crops.json', JSON.stringify(rec, null, 1));
// contact sheet: each crop scaled (nearest) to fit a 220 box
const B = 220, COLS = 6, sheet = new PNG({ width: COLS * B, height: Math.ceil(tiles.length / COLS) * (B + 4) });
sheet.data.fill(255);
tiles.forEach(([id, im], n) => {
  const k = Math.min((B - 4) / im.width, (B - 4) / im.height), ox = (n % COLS) * B, oy = Math.floor(n / COLS) * (B + 4);
  for (let j = 0; j < im.height * k; j++) for (let i = 0; i < im.width * k; i++) {
    const s = (Math.floor(j / k) * im.width + Math.floor(i / k)) * 4, t = ((oy + j) * sheet.width + ox + i) * 4;
    sheet.data[t] = im.data[s]; sheet.data[t + 1] = im.data[s + 1]; sheet.data[t + 2] = im.data[s + 2];
  }
  for (let i = 0; i < B; i++) { const t = ((oy + B) * sheet.width + ox + i) * 4; sheet.data[t] = 0; sheet.data[t + 1] = 0; sheet.data[t + 2] = 200; }
});
writeFileSync('/Users/micahflunker/dev/vibes-night/icons-ia/sheets/crops.png', PNG.sync.write(sheet));
console.log('order:', tiles.map(t => t[0]).join(' '));
