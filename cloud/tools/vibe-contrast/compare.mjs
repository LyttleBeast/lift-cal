// vibe-contrast/compare.mjs — each failing pair in a vibe beside the same
// site in v1 (matched by scene, kind, context, text and order).
// node compare.mjs <vibe.json> <v1.json> [--kinds a,b] [--grep re] [--exclude re] [--limit n]
import { readFileSync } from 'node:fs';
const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const load = f => {
  const J = JSON.parse(readFileSync(f, 'utf8')), rows = [];
  if (J.results) for (const r of J.results) if (!r.error) for (const x of r.rows) rows.push({ ...x, scene: r.scene });
  if (J.scenes) for (const s of J.scenes) for (const x of s.rows) rows.push({ ...x, scene: s.pass + ':' + s.name });
  return rows;
};
const A = load(argv[0]), B = load(argv[1]);
const kinds = arg('--kinds') ? arg('--kinds').split(',') : null;
const GREP = arg('--grep') ? new RegExp(arg('--grep')) : null;
const EXC = arg('--exclude') ? new RegExp(arg('--exclude')) : null;
const TEXT = new Set(['text', 'placeholder', 'svg-text', 'text-pressed']);
const need = x => TEXT.has(x.kind) ? (x.large ? 3 : 4.5) : 3;
const keyOf = x => [x.scene, x.kind, x.ctx, x.text || '', x.svgCtx || ''].join('|');
const idx = rows => { const m = new Map(), out = []; for (const x of rows) { const k = keyOf(x); const n = m.get(k) || 0; m.set(k, n + 1); out.push([k + '#' + n, x]); } return new Map(out); };
const IA = idx(A), IB = idx(B);
const groups = new Map();
for (const [k, x] of IA) {
  if (x.ratio == null) continue;
  if (kinds && !kinds.includes(x.kind)) continue;
  if (GREP && !GREP.test(x.scene + ' ' + x.ctx + ' ' + (x.text || ''))) continue;
  if (EXC && EXC.test(x.scene + ' ' + x.ctx + ' ' + (x.text || ''))) continue;
  if (x.ratio >= need(x)) continue;
  const y = IB.get(k);
  const g = [x.kind, x.fg, x.bg, x.raw, x.large ? 'L' : ''].join('|');
  const G = groups.get(g) || { x, v1: new Map(), scenes: new Set(), ctx: new Set(), texts: new Set(), n: 0, unmatched: 0 };
  G.n++; G.scenes.add(x.scene); G.ctx.add(x.ctx); if (x.text) G.texts.add(x.text);
  if (y) { const vk = y.fg + ' on ' + y.bg + ' = ' + y.ratio + ' (raw ' + y.raw + ')'; G.v1.set(vk, (G.v1.get(vk) || 0) + 1); } else G.unmatched++;
  groups.set(g, G);
}
const list = [...groups.values()].sort((a, b) => a.x.ratio - b.x.ratio).slice(0, +arg('--limit', 80));
console.log('groups', groups.size);
for (const G of list) {
  const x = G.x;
  console.log(`${x.kind} ${x.ratio} ${x.fg} on ${x.bg} raw ${x.raw} ${x.large ? 'LARGE' : ''} fs ${x.fs ?? ''} w ${x.w ?? ''} ${x.size || x.sw || x.bw || ''} n${G.n}${x.control ? ' CONTROL' : ''}${x.inner ? ' inner ' + x.inner + ' vsInner ' + x.vsInner + ' fillVsOuter ' + x.fillVsOuter : ''}`);
  console.log('   v1: ' + ([...G.v1].map(([k, n]) => k + ' ×' + n).join('; ') || '-') + (G.unmatched ? '  (unmatched ' + G.unmatched + ')' : ''));
  console.log('   scenes: ' + [...G.scenes].slice(0, 4).join(', ') + (G.scenes.size > 4 ? ' …' + G.scenes.size : ''));
  console.log('   ctx: ' + [...G.ctx].slice(0, 2).join('  ||  ').slice(0, 300));
  if (G.texts.size) console.log('   text: ' + [...G.texts].slice(0, 4).map(t => JSON.stringify(t)).join(', '));
  if ((x.fl || []).length) console.log('   flags: ' + x.fl.join(', '));
}
