// Iron Age contrast, round after-revise-1 (rs9): every under-threshold row in
// the AFTER run whose site (scene + kind + ctx + text + colours) did not fail
// in the BEFORE run — catches a new site hidden inside an old colour group.
// Web rows the vibe does not reach (vibe null) are dropped.
//   node ia-ar1-newsites-rs9.mjs <before.json> <after.json> [--kinds a,b]
import { readFileSync } from 'node:fs';
const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const K = arg('--kinds') ? new Set(arg('--kinds').split(',')) : null;
const load = f => {
  const J = JSON.parse(readFileSync(f, 'utf8')), rows = [];
  if (J.results) for (const r of J.results) if (!r.error && r.vibe !== null) for (const x of r.rows) rows.push({ ...x, scene: r.scene + '@' + r.width });
  if (J.scenes) for (const s of J.scenes) for (const x of s.rows) rows.push({ ...x, scene: s.pass + ':' + s.name });
  return rows;
};
const TEXT = new Set(['text', 'placeholder', 'svg-text', 'text-pressed']);
const need = x => TEXT.has(x.kind) ? (x.large ? 3 : 4.5) : 3;
const siteKey = x => [x.scene, x.kind, x.ctx, x.text || '', x.svgCtx || '', x.fg, x.bg].join('|');
const fails = rows => rows.filter(x => x.ratio != null && x.ratio < need(x) && (!K || K.has(x.kind)));
const before = new Set(fails(load(argv[0])).map(siteKey));
const g = new Map();
for (const x of fails(load(argv[1]))) {
  if (before.has(siteKey(x))) continue;
  const k = [x.kind, x.fg, x.bg, x.ratio, x.ctx, x.text || '', x.svgCtx || ''].join('|');
  const G = g.get(k) || { x, scenes: new Set(), n: 0 };
  G.n++; G.scenes.add(x.scene); g.set(k, G);
}
for (const G of [...g.values()].sort((a, b) => a.x.ratio - b.x.ratio)) {
  const x = G.x;
  console.log(`${x.kind} ${x.ratio} ${x.fg} on ${x.bg} raw ${x.raw}${x.fs ? ' fs ' + x.fs + ' w ' + x.w : ''}${x.control ? ' CONTROL' : ''}${x.bw ? ' bw ' + x.bw : ''}${x.sw ? ' sw ' + x.sw : ''} n${G.n} | ${[...G.scenes].slice(0, 3).join(', ')}`);
  console.log('    ' + String(x.ctx).slice(0, 160) + (x.text ? ' | ' + JSON.stringify(x.text) : '') + (x.svgCtx ? ' | svg ' + String(x.svgCtx).slice(0, 80) : '') + ((x.fl || []).length ? ' | ' + x.fl.join(',') : ''));
}
console.log('new failing sites', g.size);
