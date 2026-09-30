// Iron Age contrast round 3 (rs9): every row under its threshold in a vibe
// json, whether or not v1 was as low — Iron Age changes every colour, so the
// "no worse than v1" allowance covers only pairs whose two colours are v1's.
// Grouped by kind / fg / bg (+ size class), with a count, the scenes and one
// context. --kinds a,b limits kinds; --text limits to text kinds.
//   node ia-r3-under-rs9.mjs <json> [--text] [--kinds a,b] [--ctx re]
import { readFileSync } from 'node:fs';
const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const J = JSON.parse(readFileSync(argv[0], 'utf8'));
const TEXT = new Set(['text', 'placeholder', 'svg-text', 'text-pressed']);
const K = arg('--kinds') ? new Set(arg('--kinds').split(',')) : null;
const CX = arg('--ctx') ? new RegExp(arg('--ctx')) : null;
const need = x => TEXT.has(x.kind) ? (x.large ? 3 : 4.5) : 3;
const scenes = J.scenes ? J.scenes.map(s => ({ name: s.pass + ':' + s.name, rows: s.rows, vibe: true }))
  : J.results.filter(r => !r.error).map(r => ({ name: r.scene + '@' + r.width, rows: r.rows, vibe: r.vibe }));
const g = new Map();
for (const s of scenes) {
  if (!s.vibe) continue;
  for (const x of s.rows) {
    if (x.ratio == null || x.ratio >= need(x)) continue;
    if (argv.includes('--text') && !TEXT.has(x.kind)) continue;
    if (K && !K.has(x.kind)) continue;
    if (CX && !CX.test(x.ctx + ' ' + (x.text || ''))) continue;
    const k = [x.kind, x.fg, x.bg, x.raw, x.large ? 'L' : ''].join('|');
    const G = g.get(k) || { x, n: 0, scenes: new Set(), texts: new Set(), ctxs: new Set() };
    G.n++; G.scenes.add(s.name.replace(/@\d+$/, '')); if (x.text) G.texts.add(x.text.slice(0, 40)); G.ctxs.add(String(x.ctx).slice(0, 80) + ' ' + (x.fl || []).filter(f => !/^bg-image@(body|html)$/.test(f)).join(','));
    g.set(k, G);
  }
}
for (const G of [...g.values()].sort((a, b) => a.x.ratio - b.x.ratio)) {
  const { x } = G;
  console.log(`${x.kind} ${x.ratio} ${x.fg} on ${x.bg} raw ${x.raw}${x.large ? ' LARGE' : ''} n${G.n} | ${[...G.texts].slice(0, 4).map(t => JSON.stringify(t)).join(' ')}`);
  console.log('    ' + [...G.scenes].slice(0, 4).join(', ') + ' || ' + [...G.ctxs].slice(0, 2).join(' || '));
}
console.log('groups', g.size);
