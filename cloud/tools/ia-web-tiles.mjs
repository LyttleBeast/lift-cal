// Cut a tall full-page screenshot into readable tiles (V59 Iron Age web
// build, for looking only). node ia-web-tiles.mjs <in.png> <outDir> [tileH=1800] [down=2]
// Each tile is tileH source px tall, box-downsampled by `down`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const [inp, out, th = '1800', dn = '2'] = process.argv.slice(2);
const TH = +th, D = +dn;
const src = PNG.sync.read(readFileSync(inp));
mkdirSync(out, { recursive: true });
const name = basename(inp, '.png');
let n = 0;
for (let y0 = 0; y0 < src.height; y0 += TH) {
  const h = Math.min(TH, src.height - y0);
  const W = Math.floor(src.width / D), H = Math.floor(h / D);
  const dst = new PNG({ width: W, height: H });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const acc = [0, 0, 0, 0];
    for (let dy = 0; dy < D; dy++) for (let dx = 0; dx < D; dx++) {
      const i = ((y0 + y * D + dy) * src.width + (x * D + dx)) * 4;
      for (let c = 0; c < 4; c++) acc[c] += src.data[i + c];
    }
    const o = (y * W + x) * 4;
    for (let c = 0; c < 4; c++) dst.data[o + c] = Math.round(acc[c] / (D * D));
  }
  const f = join(out, `${name}-${String(n++).padStart(2, '0')}.png`);
  writeFileSync(f, PNG.sync.write(dst));
  console.log(f, W, H);
}
