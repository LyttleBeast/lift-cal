// rpnavy: failing contrast pairs in a vibe walk that the reference walk did not
// fail (or did not have), grouped. Also every row whose text matches --grep.
//   node rpnavy-cr.mjs <new.json> <ref.json> [--grep re]
import { readFileSync } from 'node:fs';
const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const load = f => {
  const J = JSON.parse(readFileSync(f, 'utf8')), rows = [];
  if (J.results) for (const r of J.results) if (!r.error) for (const x of r.rows) rows.push({ ...x, scene: r.scene });
  if (J.scenes) for (const s of J.scenes) for (const x of s.rows) rows.push({ ...x, scene: s.pass + ':' + s.name });
  return rows;
};
const TEXT = new Set(['text', 'placeholder', 'svg-text', 'text-pressed']);
const need = x => TEXT.has(x.kind) ? (x.large ? 3 : 4.5) : 3;
const fails = x => x.ratio != null && x.ratio < need(x);
const keyOf = x => [x.scene, x.kind, x.ctx, x.text || '', x.svgCtx || ''].join('|');
const idx = rows => { const m = new Map(), out = []; for (const x of rows) { const k = keyOf(x); const n = m.get(k) || 0; m.set(k, n + 1); out.push([k + '#' + n, x]); } return new Map(out); };
const N = idx(load(argv[0])), R = idx(load(argv[1]));
let nf = 0, rf = 0; for (const x of N.values()) if (fails(x)) nf++; for (const x of R.values()) if (fails(x)) rf++;
console.log('rows new', N.size, 'ref', R.size, '; failing new', nf, 'ref', rf);
const groups = new Map();
for (const [k, x] of N) {
  if (!fails(x)) continue;
  const y = R.get(k);
  if (y && fails(y) && y.fg === x.fg && y.bg === x.bg) continue;
  const g = [x.kind, x.fg, x.bg, x.large ? 'L' : '', y ? (fails(y) ? 'refFailedOther ' + y.fg + '/' + y.bg + '=' + y.ratio : 'refPassed ' + y.fg + '/' + y.bg + '=' + y.ratio) : 'noRef'].join('|');
  const G = groups.get(g) || { x, n: 0, scenes: new Set(), texts: new Set(), ctx: new Set() };
  G.n++; G.scenes.add(x.scene); if (x.text) G.texts.add(x.text); G.ctx.add(x.ctx);
  groups.set(g, G);
}
console.log('new-or-changed failing groups', groups.size);
for (const [g, G] of [...groups].sort((a, b) => a[1].x.ratio - b[1].x.ratio)) {
  console.log(`${G.x.ratio} ${g} fs ${G.x.fs ?? ''} n${G.n}`);
  console.log('   scenes: ' + [...G.scenes].slice(0, 3).join(', ') + (G.scenes.size > 3 ? ' …' + G.scenes.size : ''));
  console.log('   ctx: ' + [...G.ctx].slice(0, 2).join(' || ').slice(0, 240));
  if (G.texts.size) console.log('   text: ' + [...G.texts].slice(0, 4).map(t => JSON.stringify(t)).join(', '));
}
const GREP = arg('--grep') ? new RegExp(arg('--grep')) : null;
if (GREP) {
  const seen = new Map();
  for (const x of N.values()) if (GREP.test((x.text || '') + ' ' + x.ctx + ' ' + x.fg)) { const s = [x.kind, x.fg, x.bg, x.ratio, JSON.stringify(x.text || '')].join(' '); seen.set(s, (seen.get(s) || 0) + 1); }
  console.log('grep rows', seen.size);
  for (const [s, n] of [...seen].slice(0, 40)) console.log('  ' + s + ' ×' + n);
}
