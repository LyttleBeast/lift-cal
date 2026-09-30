// gf2-crops.mjs — copy of gf-crops.mjs for the 08b gap-fill RESUME; writes strip-22pt-r2.png / crops-result-r2.json so the first run's evidence is kept.
// gf-crops.mjs — gap-fill (critic round, 08b): tighten rough boxes to ink (same rule as crops8b.mjs: luminance
// < thr, >= minRun inked px per row/column, pad px), write a study-only preview, and a 22 pt legibility test:
// the thresholded crop, letterboxed to a square and box-filtered down to 66 px (22 pt @3x) and 22 px (@1x).
// Study only (scratch-gf); nothing here is a transform of record — tracing happens in Phase D/V.
// Usage: node gf-crops.mjs <list.json>
//   list: [{slug, png, rough:{x,y,w,h}, thr?, pad?, minRun?, mask?:[{x,y,w,h}]}]   (mask = paint paper over text)
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const OUT = '/Users/micahflunker/dev/vibes-night/research/iron-age/scratch-gf';
const list = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const cache = {};
const res = [];
const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
const tiles = [];
for (const it of list) {
  const png = cache[it.png] || (cache[it.png] = PNG.sync.read(readFileSync(it.png)));
  const T = it.thr ?? 150, P = it.pad ?? 12, minRun = it.minRun ?? 3;
  const inMask = (xx, yy) => (it.mask || []).some(m => xx >= m.x && xx < m.x + m.w && yy >= m.y && yy < m.y + m.h);
  const ink = (xx, yy) => !inMask(xx, yy) && lum(png.data, (yy * png.width + xx) * 4) < T;
  const { x, y, w, h } = it.rough;
  const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(png.width, x + w), y1 = Math.min(png.height, y + h);
  const cols = new Array(x1 - x0).fill(0), rows = new Array(y1 - y0).fill(0);
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) if (ink(xx, yy)) { cols[xx - x0]++; rows[yy - y0]++; }
  const a = cols.findIndex(c => c >= minRun), b = cols.length - 1 - [...cols].reverse().findIndex(c => c >= minRun);
  const c = rows.findIndex(r => r >= minRun), d = rows.length - 1 - [...rows].reverse().findIndex(r => r >= minRun);
  if (a < 0 || c < 0) { console.log(it.slug, 'no ink'); continue; }
  const cx = Math.max(0, x0 + a - P), cy = Math.max(0, y0 + c - P);
  const cw = Math.min(png.width, x0 + b + P + 1) - cx, ch = Math.min(png.height, y0 + d + P + 1) - cy;
  const crop = { x: cx, y: cy, w: cw, h: ch };
  // preview <= 360 px long side (nearest neighbour), masked areas shown as paper
  const s = Math.min(1, 360 / Math.max(cw, ch));
  const pw = Math.max(1, Math.round(cw * s)), ph = Math.max(1, Math.round(ch * s));
  const o = new PNG({ width: pw, height: ph });
  for (let yy = 0; yy < ph; yy++) for (let xx = 0; xx < pw; xx++) {
    const sx = cx + Math.floor(xx / s), sy = cy + Math.floor(yy / s);
    const si = (sy * png.width + sx) * 4, di = (yy * pw + xx) * 4;
    const m = inMask(sx, sy);
    o.data[di] = m ? 235 : png.data[si]; o.data[di + 1] = m ? 225 : png.data[si + 1]; o.data[di + 2] = m ? 205 : png.data[si + 2]; o.data[di + 3] = 255;
  }
  writeFileSync(`${OUT}/crop-${it.slug}.png`, PNG.sync.write(o));
  // 22 pt tests: square letterbox of side S, inked = 1, box filter to N px
  const S = Math.max(cw, ch), ox = Math.floor((S - cw) / 2), oy = Math.floor((S - ch) / 2);
  const test = N => {
    const t = new PNG({ width: N, height: N });
    const f = S / N;
    for (let ty = 0; ty < N; ty++) for (let tx = 0; tx < N; tx++) {
      let sum = 0, cnt = 0;
      const ax = Math.floor(tx * f), bx = Math.floor((tx + 1) * f), ay = Math.floor(ty * f), by = Math.floor((ty + 1) * f);
      for (let yy = ay; yy < by; yy++) for (let xx = ax; xx < bx; xx++) {
        cnt++;
        const px = cx + xx - ox, py = cy + yy - oy;
        if (px >= cx && px < cx + cw && py >= cy && py < cy + ch && ink(px, py)) sum++;
      }
      const v = Math.round(255 - 255 * (cnt ? sum / cnt : 0));
      const di = (ty * N + tx) * 4; t.data[di] = t.data[di + 1] = t.data[di + 2] = v; t.data[di + 3] = 255;
    }
    return t;
  };
  const t66 = test(66), t22 = test(22);
  writeFileSync(`${OUT}/t66-${it.slug}.png`, PNG.sync.write(t66));
  writeFileSync(`${OUT}/t22-${it.slug}.png`, PNG.sync.write(t22));
  tiles.push(t66, t22);
  res.push({ slug: it.slug, png: it.png, crop, mask: it.mask || [], image: { w: png.width, h: png.height } });
  console.log(JSON.stringify({ slug: it.slug, crop }));
}
// strip: each pair (66 px, then 22 px) side by side, one row
const W = tiles.reduce((s, t) => s + t.width + 10, 10), H = 86;
const sheet = new PNG({ width: W, height: H }); sheet.data.fill(255);
let px = 10;
for (const t of tiles) {
  for (let yy = 0; yy < t.height; yy++) for (let xx = 0; xx < t.width; xx++) {
    const s2 = (yy * t.width + xx) * 4, d2 = ((10 + yy) * W + px + xx) * 4;
    for (let k = 0; k < 4; k++) sheet.data[d2 + k] = t.data[s2 + k];
  }
  px += t.width + 10;
}
writeFileSync(`${OUT}/strip-22pt-r2.png`, PNG.sync.write(sheet));
writeFileSync(`${OUT}/crops-result-r2.json`, JSON.stringify(res, null, 1));
