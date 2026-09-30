// Iron Age contrast round 2 (rs9): the collector reads a flat ground; the
// page wears the grain. Every text/graphic row that passes on the flat page
// colour is re-read against the grain's darkest composited pixel (#e0d8c4,
// ia-rs9-pixels.mjs), and every row on a ground within 12 of the page (a
// tint over it) is listed with the grain scaled in, so the near misses show.
//   node ia-r2-grain-rs9.mjs <json> [--rack #e6dec9] [--grain #e0d8c4]
import { readFileSync } from 'node:fs';
const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const RACK = arg('--rack', '#e6dec9'), GRAIN = arg('--grain', '#e0d8c4');
const J = JSON.parse(readFileSync(argv[0], 'utf8'));
const rows = [];
if (J.results) for (const r of J.results) if (!r.error) for (const x of r.rows) rows.push({ ...x, scene: r.scene + '@' + r.width, vibe: r.vibe });
if (J.scenes) for (const s of J.scenes) for (const x of s.rows) rows.push({ ...x, scene: s.pass + ':' + s.name });
const rgb = h => [0, 2, 4].map(i => parseInt(h.replace('#', '').slice(i, i + 2), 16));
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Y = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const CR = (a, b) => { const x = Y(a), y = Y(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
const TEXT = new Set(['text', 'placeholder', 'svg-text', 'text-pressed']);
const need = x => TEXT.has(x.kind) ? (x.large ? 3 : 4.5) : 3;
const R = rgb(RACK), G = rgb(GRAIN), k = G.map((v, i) => v / R[i]);
const g = new Map();
for (const x of rows) {
  if (x.vibe === null) continue;           // a v1 scene (vibe-reapply) inside the run
  if (x.ratio == null || !/^#[0-9a-f]{6}$/.test(x.bg || '') || !/^#[0-9a-f]{6}$/.test(x.fg || '')) continue;
  const B = rgb(x.bg), near = B.every((v, i) => Math.abs(v - R[i]) <= 12);
  if (!near) continue;
  const bg2 = B.map((v, i) => Math.min(255, v * k[i]));
  const r2 = CR(rgb(x.fg), bg2);
  if (x.ratio < need(x)) continue;         // already failing flat: compare.mjs has it
  if (r2 >= need(x)) continue;
  const key = `${x.kind} ${x.fg} on ${x.bg} flat ${x.ratio} grain ${r2} need ${need(x)} ${x.large ? 'L' : ''} fs ${x.fs ?? ''} w ${x.w ?? ''}`;
  const e = g.get(key) || { n: 0, scenes: new Set(), ctx: new Set(), text: new Set() };
  e.n++; e.scenes.add(x.scene); e.ctx.add(x.ctx); if (x.text) e.text.add(x.text);
  g.set(key, e);
}
console.log(argv[0].split('/').pop(), 'grain-darkest failures (pass flat, fail on', GRAIN + '):', g.size);
for (const [key, e] of g) {
  console.log(key, 'n' + e.n);
  console.log('   scenes: ' + [...e.scenes].slice(0, 4).join(', ') + (e.scenes.size > 4 ? ' …' + e.scenes.size : ''));
  console.log('   ctx: ' + [...e.ctx].slice(0, 2).join(' || ').slice(0, 240));
  if (e.text.size) console.log('   text: ' + [...e.text].slice(0, 4).map(t => JSON.stringify(t)).join(', '));
}
