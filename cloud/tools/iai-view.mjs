// V/icons: look at the traces. Each tile: the binary image that was traced (grey) and every traced
// contour (outer red, holes blue), scaled to fit. node tools/iai-view.mjs <out.png> [id ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from '/Users/micahflunker/dev/vibes-night/tools/node_modules/pngjs/lib/png.js';
import { SOURCES } from './iai-sources.mjs';
const [out, ...only] = process.argv.slice(2);
const ids = SOURCES.map(s => s.id).filter(id => !only.length || only.includes(id));
const B = only.length && only.length < 3 ? 600 : 300, COLS = Math.min(ids.length, only.length && only.length < 3 ? 2 : 5);
const sheet = new PNG({ width: COLS * B, height: Math.ceil(ids.length / COLS) * B }); sheet.data.fill(255);
const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= sheet.width || y >= sheet.height) return; const t = (y * sheet.width + x) * 4; sheet.data[t] = c[0]; sheet.data[t + 1] = c[1]; sheet.data[t + 2] = c[2]; };
ids.forEach((id, n) => {
  const tr = JSON.parse(readFileSync(`/Users/micahflunker/dev/vibes-night/icons-ia/trace/${id}.json`));
  const bin = PNG.sync.read(readFileSync(`/Users/micahflunker/dev/vibes-night/icons-ia/trace/${id}-bin.png`));
  const k = Math.min((B - 8) / tr.W, (B - 8) / tr.H), ox = (n % COLS) * B + 4, oy = Math.floor(n / COLS) * B + 4;
  for (let j = 0; j < tr.H * k; j++) for (let i = 0; i < tr.W * k; i++) if (bin.data[(Math.floor(j / k) * tr.W + Math.floor(i / k)) * 4] < 128) put(ox + i, oy + j, [205, 205, 205]);
  for (const p of tr.paths) { const c = p.hole ? [0, 0, 220] : [220, 0, 0];
    for (let q = 0; q + 1 < p.pts.length; q++) { const [a, b] = [p.pts[q], p.pts[q + 1]], L = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]) * k);
      for (let t = 0; t <= L; t++) put(ox + (a[0] + (b[0] - a[0]) * t / L) * k, oy + (a[1] + (b[1] - a[1]) * t / L) * k, c); } }
  for (let i = 0; i < B; i++) { put((n % COLS) * B + i, Math.floor(n / COLS) * B, [0, 0, 0]); put((n % COLS) * B, Math.floor(n / COLS) * B + i, [0, 0, 0]); }
});
writeFileSync(out, PNG.sync.write(sheet));
console.log(ids.join(' '));
