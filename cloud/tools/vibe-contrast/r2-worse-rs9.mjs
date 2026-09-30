// Round 2 (rs9): every pair under its threshold in the vibe run that is ALSO
// worse than the same site in v1 (or has no v1 twin). Pairs where v1 fails too
// and the vibe is no worse are counted, not printed.
//   node r2-worse-rs9.mjs <vibe.json> <v1.json> [--exclude re]
import { readFileSync } from 'node:fs';
const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const EXC = arg('--exclude') ? new RegExp(arg('--exclude')) : null;
const load = f => {
  const J = JSON.parse(readFileSync(f, 'utf8')), rows = [];
  if (J.results) for (const r of J.results) if (!r.error) for (const x of r.rows) rows.push({ ...x, scene: r.scene, vibe: r.vibe });
  if (J.scenes) for (const s of J.scenes) for (const x of s.rows) rows.push({ ...x, scene: s.pass + ':' + s.name });
  return rows;
};
const TEXT = new Set(['text', 'placeholder', 'svg-text', 'text-pressed']);
const need = x => TEXT.has(x.kind) ? (x.large ? 3 : 4.5) : 3;
const keyOf = x => [x.scene, x.kind, x.ctx, x.text || '', x.svgCtx || ''].join('|');
const idx = rows => { const m = new Map(), out = new Map(); for (const x of rows) { const k = keyOf(x); const n = m.get(k) || 0; m.set(k, n + 1); out.set(k + '#' + n, x); } return out; };
const A = idx(load(argv[0])), B = idx(load(argv[1]));
let under = 0, noWorse = 0;
const g = new Map();
for (const [k, x] of A) {
  if (x.ratio == null || x.ratio >= need(x)) continue;
  if (x.vibe === null) continue; // a scene the vibe does not reach (gate, onboarding, the switch back)
  if (EXC && EXC.test(x.scene + ' ' + x.ctx + ' ' + (x.text || ''))) continue;
  under++;
  const y = B.get(k);
  if (y && y.ratio != null && x.ratio >= y.ratio) { noWorse++; continue; }
  const gk = [x.kind, x.fg, x.bg, x.raw, y ? y.ratio : 'nov1'].join('|');
  const G = g.get(gk) || { x, y, scenes: new Set(), n: 0 };
  G.n++; G.scenes.add(x.scene); g.set(gk, G);
}
console.log('under threshold', under, '| no worse than v1', noWorse, '| worse or unmatched groups', g.size);
for (const G of [...g.values()].sort((a, b) => a.x.ratio - b.x.ratio)) {
  const { x, y } = G;
  console.log(`${x.kind} ${x.ratio} ${x.fg} on ${x.bg} raw ${x.raw} ${x.large ? 'LARGE' : ''}${x.fs ? ' fs ' + x.fs : ''} n${G.n} | v1 ${y ? y.ratio + ' ' + y.fg + ' on ' + y.bg : 'unmatched'}`);
  console.log('   ' + [...G.scenes].slice(0, 3).join(', ') + ' | ' + String(x.ctx).slice(0, 150) + (x.text ? ' | ' + JSON.stringify(x.text) : '') + ((x.fl || []).length ? ' | ' + x.fl.join(',') : ''));
}
