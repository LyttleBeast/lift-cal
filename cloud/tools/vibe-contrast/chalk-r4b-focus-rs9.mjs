// Every :focus / :focus-visible / :focus-within state the web walk read for
// one vibe, grouped, worst ring/edge/text first. node chalk-r4b-focus-rs9.mjs <json> <vibe|null>
import { readFileSync } from 'node:fs';
const J = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const V = process.argv[3] === 'null' ? null : process.argv[3];
const g = new Map();
for (const r of J.results) {
  if (r.error || !r.states || r.vibe !== V) continue;
  for (const s of r.states) {
    if (!/focus/.test(s.rule)) continue;
    const k = [s.rule, s.ring || '', s.ringRatio ?? '', s.edge || '', s.edgeRatio ?? '', s.text || '', s.textRatio ?? '', s.under].join('|');
    const x = g.get(k) || { s, n: 0, sc: new Set() };
    x.n++; x.sc.add(r.scene); g.set(k, x);
  }
}
const rows = [...g.values()].sort((a, b) => Math.min(a.s.ringRatio ?? 99, a.s.edgeRatio ?? 99) - Math.min(b.s.ringRatio ?? 99, b.s.edgeRatio ?? 99));
for (const { s, n, sc } of rows) console.log(`${s.rule.slice(0, 70)} | el ${s.el.slice(0, 50)} | under ${s.under} ring ${s.ring || '-'} ${s.ringRatio ?? ''} edge ${s.edge || '-'} ${s.edgeRatio ?? ''}${s.edgeVsFill != null ? ' vsFill ' + s.edgeVsFill : ''} text ${s.text || '-'} ${s.textRatio ?? ''} n${n} ${[...sc].slice(0, 2).join(',')}`);
console.log('groups', rows.length);
