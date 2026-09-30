// Iron Age contrast round 4 (rs9): what changed between two runs of the same
// collector — every under-threshold group (kind|fg|bg|raw|size class) that is
// only in A, only in B, or in both with a different count. Rows the vibe does
// not reach (web vibe null) are dropped.
//   node ia-r4-diff-rs9.mjs <before.json> <after.json>
import { readFileSync } from 'node:fs';
const load = f => {
  const J = JSON.parse(readFileSync(f, 'utf8')), rows = [];
  if (J.results) for (const r of J.results) if (!r.error && r.vibe !== null) for (const x of r.rows) rows.push({ ...x, scene: r.scene });
  if (J.scenes) for (const s of J.scenes) for (const x of s.rows) rows.push({ ...x, scene: s.pass + ':' + s.name });
  return rows;
};
const TEXT = new Set(['text', 'placeholder', 'svg-text', 'text-pressed']);
const need = x => TEXT.has(x.kind) ? (x.large ? 3 : 4.5) : 3;
const group = rows => {
  const m = new Map();
  for (const x of rows) {
    if (x.ratio == null || x.ratio >= need(x)) continue;
    const k = [x.kind, x.fg, x.bg, x.raw, x.large ? 'L' : ''].join('|');
    const g = m.get(k) || { n: 0, ratio: x.ratio, scenes: new Set(), ctx: x.ctx, text: x.text };
    g.n++; g.scenes.add(x.scene); m.set(k, g);
  }
  return m;
};
const [a, b] = process.argv.slice(2).map(f => group(load(f)));
const show = (tag, k, g) => console.log(tag, g.ratio, k, 'n' + g.n, '|', [...g.scenes].slice(0, 2).join(', '), '|', String(g.ctx).slice(0, 110), g.text ? JSON.stringify(g.text) : '');
let same = 0;
for (const [k, g] of a) { if (!b.has(k)) show('GONE ', k, g); else if (b.get(k).n !== g.n) show('COUNT ' + g.n + '->' + b.get(k).n, k, g); else same++; }
for (const [k, g] of b) if (!a.has(k)) show('NEW  ', k, g);
console.log('groups before', a.size, 'after', b.size, 'unchanged', same);
