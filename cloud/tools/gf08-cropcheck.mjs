// gf08-cropcheck.mjs — study-only check of a provenance entry's hero crops: renders both boxes from a
// 1200 px preview of the original into research/scratch-gf08/sheets/crop-<name>.png (never an asset).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const arr = JSON.parse(readFileSync('/Users/micahflunker/dev/vibes-night/research/iron-age/PROVENANCE.photos.draft.json', 'utf8'));
const outs = [];
for (const name of process.argv.slice(2)) {
  const e = arr.find(x => x.file.endsWith('/' + name));
  const tmp = `/Users/micahflunker/dev/vibes-night/research/scratch-gf08/cc-tmp.png`;
  execFileSync('sips', ['-Z', '1200', '-s', 'format', 'png', '/Users/micahflunker/dev/vibes-night/' + e.file, '--out', tmp], { stdio: 'ignore' });
  const im = PNG.sync.read(readFileSync(tmp));
  const boxes = [e.hero_crops.box_358x120, e.hero_crops.box_358x190];
  const W = 600;
  const parts = boxes.map(b => {
    const x0 = Math.round(b.x0 * im.width), x1 = Math.round(b.x1 * im.width), y0 = Math.round(b.y0 * im.height), y1 = Math.round(b.y1 * im.height);
    const cw = x1 - x0, ch = y1 - y0, H = Math.round(W * ch / cw);
    const p = new PNG({ width: W, height: H });
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sx = x0 + Math.floor(x * cw / W), sy = y0 + Math.floor(y * ch / H);
      const s = (sy * im.width + sx) * 4, d = (y * W + x) * 4;
      for (let c = 0; c < 4; c++) p.data[d + c] = im.data[s + c];
    }
    return p;
  });
  const H = parts.reduce((a, p) => a + p.height + 8, 0);
  const sheet = new PNG({ width: W, height: H }); sheet.data.fill(200);
  let oy = 0;
  for (const p of parts) { for (let y = 0; y < p.height; y++) p.data.copy(sheet.data, (oy + y) * W * 4, y * W * 4, (y + 1) * W * 4); oy += p.height + 8; }
  const out = `/Users/micahflunker/dev/vibes-night/research/scratch-gf08/sheets/crop-${name.replace(/\.\w+$/, '')}.png`;
  writeFileSync(out, PNG.sync.write(sheet)); outs.push(out);
}
console.log(outs.join('\n'));
