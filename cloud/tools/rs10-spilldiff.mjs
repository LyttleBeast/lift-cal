// rs10-spilldiff.mjs <new fit.json> <old fit.json> — clipped/spill findings the new run has that the old one lacks, grouped by class with max excess.
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2);
const A = JSON.parse(readFileSync(a, 'utf8')), B = JSON.parse(readFileSync(b, 'utf8'));
const idx = J => { const m = new Map(); for (const [id, s] of Object.entries(J.scenes)) { if (s.error) continue; s.clipped.forEach(c => m.set(id + '|' + c.how + '|' + c.path, c)); } return m; };
const MA = idx(A), MB = idx(B);
const g = {};
for (const [k, c] of MA) {
  if (MB.has(k)) continue;
  const ex = Math.max(c.content[0] - c.box[0], c.content[1] - c.box[1]);
  const key = c.how + ' ' + c.cls + ' axis=' + c.axis;
  g[key] = g[key] || { n: 0, max: 0, ex: '' };
  g[key].n++; if (ex >= g[key].max) { g[key].max = ex; g[key].ex = k.split('|')[0] + ' ' + JSON.stringify(c.text).slice(0, 60) + ' box ' + c.box + ' content ' + c.content; }
}
Object.entries(g).sort((x, y) => y[1].max - x[1].max).forEach(([k, v]) => console.log(v.n, 'max', v.max, k, '|', v.ex));
