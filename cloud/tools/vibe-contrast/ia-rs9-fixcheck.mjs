// Iron Age fix round gates-1-rs9: the rows each must-fix item named, in a
// re-collected native json, before (rs9) and after (fix1).
import { readFileSync } from 'node:fs';
const load = f => {
  const J = JSON.parse(readFileSync(f, 'utf8')), rows = [];
  if (J.results) for (const r of J.results) if (!r.error) for (const x of r.rows) rows.push({ ...x, scene: r.scene + '@' + r.width });
  if (J.scenes) for (const s of J.scenes) for (const x of s.rows) rows.push({ ...x, scene: s.pass + ':' + s.name });
  return rows;
};
const [file, ...qs] = process.argv.slice(2);
const rows = load(file);
// each query: sceneRe::kind::ctxRe::fgOrRawRe
for (const q of qs) {
  const [sc, kind, ctx, col] = q.split('::');
  const S = new RegExp(sc), C = new RegExp(ctx || '.'), K = new RegExp(col || '.', 'i');
  const hit = rows.filter(x => S.test(x.scene) && (!kind || x.kind === kind) && C.test(x.ctx) && (K.test(String(x.raw)) || K.test(x.fg)));
  const g = new Map();
  for (const x of hit) { const k = `${x.kind} ${x.ctx} | ${x.fg} on ${x.bg} ${x.ratio} raw ${x.raw}${x.text ? ' "' + x.text + '"' : ''}${x.size ? ' ' + x.size : ''}`; g.set(k, (g.get(k) || 0) + 1); }
  console.log(`\n# ${q}: ${hit.length} rows, min ${hit.length ? Math.min(...hit.map(x => x.ratio)) : '-'}`);
  for (const [k, n] of [...g].slice(0, 14)) console.log('  ×' + n + ' ' + k);
}
