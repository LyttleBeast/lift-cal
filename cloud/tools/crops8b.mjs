// crops8b.mjs — track 8b: tighten rough boxes to ink, then write study-only crop previews (scratch).
// Reads a JSON list: [{slug, png, rough:{x,y,w,h}, thr?, pad?}] and prints the tight crop per item.
// Usage: node crops8b.mjs <list.json> <outdir>
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [listFile, outdir] = process.argv.slice(2);
const list = JSON.parse(readFileSync(listFile, 'utf8'));
const cache = {};
const res = [];
for (const it of list) {
  const png = cache[it.png] || (cache[it.png] = PNG.sync.read(readFileSync(it.png)));
  const { x, y, w, h } = it.rough, T = it.thr ?? 150, P = it.pad ?? 16;
  const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(png.width, x + w), y1 = Math.min(png.height, y + h);
  const cols = new Array(x1 - x0).fill(0), rows = new Array(y1 - y0).fill(0);
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
    const i = (yy * png.width + xx) * 4;
    const l = 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
    if (l < T) { cols[xx - x0]++; rows[yy - y0]++; }
  }
  const minRun = it.minRun ?? 3;
  let a = cols.findIndex(c => c >= minRun), b = cols.length - 1 - [...cols].reverse().findIndex(c => c >= minRun);
  let c = rows.findIndex(r => r >= minRun), d = rows.length - 1 - [...rows].reverse().findIndex(r => r >= minRun);
  if (a < 0 || c < 0) { console.log(it.slug, 'no ink'); continue; }
  const cx = Math.max(0, x0 + a - P), cy = Math.max(0, y0 + c - P);
  const cw = Math.min(png.width, x0 + b + P + 1) - cx, ch = Math.min(png.height, y0 + d + P + 1) - cy;
  const crop = { x: cx, y: cy, w: cw, h: ch };
  // preview, downscaled to <= 360px on the long side (nearest neighbour; study only)
  const s = Math.min(1, 360 / Math.max(cw, ch));
  const pw = Math.max(1, Math.round(cw * s)), ph = Math.max(1, Math.round(ch * s));
  const o = new PNG({ width: pw, height: ph });
  for (let yy = 0; yy < ph; yy++) for (let xx = 0; xx < pw; xx++) {
    const sx = cx + Math.floor(xx / s), sy = cy + Math.floor(yy / s);
    const si = (sy * png.width + sx) * 4, di = (yy * pw + xx) * 4;
    o.data[di] = png.data[si]; o.data[di + 1] = png.data[si + 1]; o.data[di + 2] = png.data[si + 2]; o.data[di + 3] = 255;
  }
  writeFileSync(`${outdir}/crop-${it.slug}.png`, PNG.sync.write(o));
  res.push({ slug: it.slug, crop, image: { w: png.width, h: png.height } });
  console.log(JSON.stringify({ slug: it.slug, crop }));
}
writeFileSync(`${outdir}/crops-result.json`, JSON.stringify(res, null, 1));
