// New spills in a fit.json against a v1 fit.json, grouped by class, with the
// worst excess (content - box) per axis. Usage: node <this> <fit.json> <v1 fit.json> [clsFilter]
import { readFileSync } from 'node:fs';
const [a, b, filt] = process.argv.slice(2);
const A = JSON.parse(readFileSync(a, 'utf8')), B = JSON.parse(readFileSync(b, 'utf8'));
const idx = sc => { const m = new Map(); for (const [id, x] of Object.entries(sc)) if (!x.error) x.clipped.forEach(y => m.set(id + '|' + y.how + '|' + y.path, { id, ...y })); return m; };
const ia = idx(A.scenes), ib = idx(B.scenes);
const g = new Map();
for (const [k, y] of ia) {
  if (ib.has(k)) continue;
  if (filt && !y.cls.includes(filt)) continue;
  const key = y.how + ' ' + y.cls + ' axis=' + y.axis;
  if (!g.has(key)) g.set(key, { n: 0, maxY: 0, maxX: 0, ex: null, exMax: null, scenes: new Set() });
  const r = g.get(key);
  r.n++; r.scenes.add(y.id);
  const dy = y.content[1] - y.box[1], dx = y.content[0] - y.box[0];
  if (dy > r.maxY || dx > r.maxX) r.exMax = y;
  r.maxY = Math.max(r.maxY, dy); r.maxX = Math.max(r.maxX, dx);
  if (!r.ex) r.ex = y;
}
const rows = [...g.entries()].sort((x, y) => Math.max(y[1].maxX, y[1].maxY) - Math.max(x[1].maxX, x[1].maxY));
for (const [k, r] of rows.slice(0, +(process.env.N || 80))) {
  const e = r.exMax || r.ex;
  console.log(r.n + 'x ' + k + '  maxDx=' + r.maxX + ' maxDy=' + r.maxY + '  scenes=' + r.scenes.size +
    '\n    worst: ' + e.id + ' ' + e.path + ' text=' + JSON.stringify(e.text) + ' box=' + e.box + ' content=' + e.content + ' h=' + e.height + ' ov=' + e.overflow + ' ell=' + e.ellipsis);
}
console.log('groups', rows.length);
