// navy-g1-states-s1.mjs — the :focus / :active rows web.mjs's states() reads,
// which compare.mjs does not look at. Every state pair under its threshold in
// the vibe, beside the same rule and element in v1.
//   node navy-g1-states-s1.mjs <vibe web json> <v1 web json>
import { readFileSync } from 'node:fs';
const [AF, BF] = process.argv.slice(2);
const load = f => { const J = JSON.parse(readFileSync(f, 'utf8')); const out = []; for (const r of J.results) if (!r.error && r.states) for (const s of r.states) out.push({ ...s, vibe: r.vibe }); return out; };
const A = load(AF), B = load(BF);
const key = s => [s.scene, s.rule, s.el].join('|');
const IB = new Map(); for (const s of B) { const k = key(s); if (!IB.has(k)) IB.set(k, s); }
const checks = [['textRatio', s => (s.fs >= 24 || (s.fs >= 18.66 && s.w >= 700)) ? 3 : 4.5], ['edgeRatio', () => 3], ['ringRatio', () => 3]];
const groups = new Map();
let total = 0;
for (const s of A) {
  total++;
  for (const [f, need] of checks) {
    if (s[f] == null || s[f] >= need(s)) continue;
    const v = IB.get(key(s));
    const g = [f, s.rule, s[f], s.text || s.edge || s.ring, s.bgState, s.under, s.vibe].join('|');
    const G = groups.get(g) || { s, f, v1: v ? v[f] : 'unmatched', v1c: v ? (v.text || v.edge || v.ring) + ' on ' + (f === 'textRatio' ? v.bgState : v.under) : '', scenes: new Set(), els: new Set() };
    G.scenes.add(s.scene); G.els.add(s.el); groups.set(g, G);
  }
}
console.log('state rows', total, 'groups under threshold', groups.size);
for (const G of [...groups.values()].sort((a, b) => a.s[a.f] - b.s[b.f])) {
  const s = G.s;
  console.log(`${G.f} ${s[G.f]} (v1 ${G.v1} ${G.v1c}) vibe=${s.vibe} rule "${s.rule}" ${G.f === 'textRatio' ? s.text + ' on ' + s.bgState + ' fs ' + s.fs + ' w ' + s.w : (s.edge || s.ring) + ' on ' + s.under} decl ${JSON.stringify(s.decl).slice(0, 160)}`);
  console.log('   scenes ' + [...G.scenes].slice(0, 5).join(', ') + '  els ' + [...G.els].slice(0, 2).join(' || ').slice(0, 200));
}
