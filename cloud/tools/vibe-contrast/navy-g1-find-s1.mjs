// navy-g1-find-s1.mjs — list rows of a vibe-contrast JSON matching filters.
//   node navy-g1-find-s1.mjs <json> [--raw re] [--ctx re] [--text re] [--kind re] [--max r] [--scene re]
import { readFileSync } from 'node:fs';
const argv = process.argv.slice(2);
const arg = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const J = JSON.parse(readFileSync(argv[0], 'utf8'));
const rows = [];
if (J.scenes) for (const s of J.scenes) for (const x of s.rows) rows.push({ ...x, scene: s.pass + ':' + s.name });
if (J.results) for (const r of J.results) if (!r.error) for (const x of r.rows) rows.push({ ...x, scene: r.scene });
const re = k => arg(k) ? new RegExp(arg(k), 'i') : null;
const R = re('--raw'), C = re('--ctx'), T = re('--text'), K = re('--kind'), S = re('--scene');
const MAX = arg('--max') ? +arg('--max') : Infinity;
const seen = new Map();
for (const x of rows) {
  if (R && !R.test(String(x.raw))) continue;
  if (C && !C.test(x.ctx + ' ' + (x.svgCtx || ''))) continue;
  if (T && !T.test(String(x.text || ''))) continue;
  if (K && !K.test(x.kind)) continue;
  if (S && !S.test(x.scene)) continue;
  if (!(x.ratio <= MAX)) continue;
  const k = [x.kind, x.fg, x.bg, x.ratio, x.raw, x.size || x.sw || '', x.text || '', (x.fl || []).join(','), x.ctx.slice(0, 140)].join(' | ');
  const g = seen.get(k) || { n: 0, scenes: new Set() }; g.n++; g.scenes.add(x.scene); seen.set(k, g);
}
for (const [k, g] of seen) console.log(k + '  ×' + g.n + '  [' + [...g.scenes].slice(0, 3).join('; ') + (g.scenes.size > 3 ? ' …' + g.scenes.size : '') + ']');
console.log(seen.size + ' groups');
