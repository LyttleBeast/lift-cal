// rpox: the §13.1 floor — pairs that fail their need AND sit below the same
// pair in v1, in polish and in main, and which of them polish made worse or new.
//   node rpox-v1floor.mjs <polish.json> <main.json> <v1.json>
import { readFileSync } from 'node:fs';
const [P, M, V] = process.argv.slice(2);
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
const IP = idx(load(P)), IM = idx(load(M)), IV = idx(load(V));
const below = (x, v) => x && x.ratio != null && x.ratio < need(x) && v && v.ratio != null && x.ratio < v.ratio - 0.005;
let p = 0, m = 0, vUnmatched = 0;
const G = new Map();
for (const [k, x] of IP) {
  const v = IV.get(k); if (!v) { vUnmatched++; continue; }
  const y = IM.get(k);
  const bp = below(x, v), bm = below(y, v);
  if (bp) p++; if (bm) m++;
  if (bp && (!bm || x.ratio < y.ratio - 0.005)) {
    const g = [bm ? 'WORSE' : 'NEW', x.kind, x.fg, x.bg, x.ratio, y && y.ratio, v.ratio].join('|');
    const e = G.get(g) || { tag: bm ? 'WORSE' : 'NEW', x, y, v, n: 0, scenes: new Set() };
    e.n++; e.scenes.add(x.scene); G.set(g, e);
  }
}
console.log('below-v1 failing pairs: polish', p, 'main', m, '(pairs with no v1 match skipped:', vUnmatched + ')');
for (const e of [...G.values()].sort((a, b) => a.x.ratio - b.x.ratio)) {
  console.log(`${e.tag} ${e.x.kind} polish ${e.x.ratio} (${e.x.fg} on ${e.x.bg}) main ${e.y ? e.y.ratio : '-'} v1 ${e.v.ratio} (${e.v.fg} on ${e.v.bg}) n${e.n}${e.x.control ? ' CONTROL' : ''}${e.x.text ? ' ' + JSON.stringify(e.x.text) : ''}`);
  console.log('   ' + [...e.scenes].slice(0, 3).join(', ') + '   ctx ' + String(e.x.ctx).slice(0, 160));
}
