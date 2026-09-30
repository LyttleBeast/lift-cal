// rpox: every painted pair, polish against main (both worn in oxblood), and
// against v1: which pairs fail their need in polish, and whether each one got
// worse than main and worse than v1.
//   node rpox-cmp.mjs <polish.json> <main.json> <v1.json> [--all]
import { readFileSync } from 'node:fs';
const [P, M, V] = process.argv.slice(2);
const ALL = process.argv.includes('--all');
const load = f => {
  const J = JSON.parse(readFileSync(f, 'utf8')), rows = [];
  if (J.results) for (const r of J.results) if (!r.error) for (const x of r.rows) rows.push({ ...x, scene: r.scene + '@' + r.width });
  if (J.scenes) for (const s of J.scenes) for (const x of s.rows) rows.push({ ...x, scene: s.pass + ':' + s.name });
  return rows;
};
const TEXT = new Set(['text', 'placeholder', 'svg-text', 'text-pressed']);
const need = x => TEXT.has(x.kind) ? (x.large ? 3 : 4.5) : 3;
const keyOf = x => [x.scene, x.kind, x.ctx, x.text || '', x.svgCtx || ''].join('|');
const idx = rows => { const m = new Map(), out = []; for (const x of rows) { const k = keyOf(x); const n = m.get(k) || 0; m.set(k, n + 1); out.push([k + '#' + n, x]); } return new Map(out); };
const IP = idx(load(P)), IM = idx(load(M)), IV = V ? idx(load(V)) : new Map();
let n = 0, fail = 0, unmatched = 0;
const groups = new Map();
for (const [k, x] of IP) {
  if (x.ratio == null) continue;
  n++;
  const m = IM.get(k); if (!m) unmatched++;
  const v = IV.get(k);
  const f = x.ratio < need(x);
  if (f) fail++;
  const worseThanMain = m && m.ratio != null && x.ratio < m.ratio - 0.005;
  const newFail = f && m && m.ratio != null && m.ratio >= need(m);
  if (!(newFail || (f && worseThanMain) || (ALL && worseThanMain && x.ratio - need(x) < 0.5))) continue;
  const tag = newFail ? 'NEWFAIL' : f ? 'FAIL-WORSE' : 'NEAR-WORSE';
  const g = [tag, x.kind, x.fg, x.bg, m && m.fg, m && m.bg, x.ratio, m && m.ratio, v ? v.ratio : '-'].join('|');
  const G = groups.get(g) || { tag, x, m, v, n: 0, scenes: new Set(), ctx: new Set(), texts: new Set() };
  G.n++; G.scenes.add(x.scene); G.ctx.add(x.ctx); if (x.text) G.texts.add(x.text);
  groups.set(g, G);
}
console.log('pairs', n, 'failing', fail, 'unmatched in main', unmatched, 'groups', groups.size);
for (const G of [...groups.values()].sort((a, b) => a.x.ratio - b.x.ratio)) {
  const { x, m, v } = G;
  console.log(`${G.tag} ${x.kind} need ${need(x)} polish ${x.ratio} (${x.fg} on ${x.bg}) main ${m ? m.ratio + ' (' + m.fg + ' on ' + m.bg + ')' : '-'} v1 ${v ? v.ratio : '-'} n${G.n}${x.control ? ' CONTROL' : ''}`);
  console.log('   scenes: ' + [...G.scenes].slice(0, 4).join(', ') + (G.scenes.size > 4 ? ' …' + G.scenes.size : ''));
  console.log('   ctx: ' + [...G.ctx].slice(0, 2).join('  ||  ').slice(0, 260));
  if (G.texts.size) console.log('   text: ' + [...G.texts].slice(0, 4).map(t => JSON.stringify(t)).join(', '));
}
