// Iron Age contrast round 2 (rs9): show matched vibe/v1 row pairs (compare.mjs's
// key) for one vibe fg, where v1's fg was something else — to see what a
// low-contrast row in the vibe was drawing in v1.
//   node ia-r2-match-rs9.mjs <vibe.json> <v1.json> <vibeFg> <v1FgNotRe>
import { readFileSync } from 'node:fs';
const [fa, fb, FG, NOT] = process.argv.slice(2);
const load = f => {
  const J = JSON.parse(readFileSync(f, 'utf8')), rows = [];
  if (J.results) for (const r of J.results) if (!r.error) for (const x of r.rows) rows.push({ ...x, scene: r.scene });
  if (J.scenes) for (const s of J.scenes) for (const x of s.rows) rows.push({ ...x, scene: s.pass + ':' + s.name });
  return rows;
};
const keyOf = x => [x.scene, x.kind, x.ctx, x.text || '', x.svgCtx || ''].join('|');
const idx = rows => { const m = new Map(), out = []; for (const x of rows) { const k = keyOf(x); const n = m.get(k) || 0; m.set(k, n + 1); out.push([k + '#' + n, x]); } return new Map(out); };
const A = idx(load(fa)), B = idx(load(fb));
const notRe = new RegExp(NOT, 'i');
const g = new Map();
for (const [k, x] of A) {
  if (x.fg !== FG) continue;
  const y = B.get(k); if (!y || notRe.test(y.fg)) continue;
  const kk = `${x.kind} ${x.scene} | ${x.ctx} | vibe ${x.fg}/${x.bg} ${x.ratio} ${x.size || ''} | v1 ${y.fg}/${y.bg} ${y.ratio} ${y.size || ''} ${x.svgCtx ? '| ' + x.svgCtx.slice(0, 120) : ''}`;
  g.set(kk, (g.get(kk) || 0) + 1);
}
for (const [k, n] of g) console.log('×' + n, k);
