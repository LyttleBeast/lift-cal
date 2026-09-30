// rpchalk: pair-by-pair diff of two vibe-contrast collections (native or web): rows matched by
// scene + kind + ctx + text + order; prints every row whose fg/bg/ratio changed, and rows on one side only.
//   node rpchalk-rowdiff.mjs <old.json> <new.json> [--min 4.5]
import { readFileSync } from 'node:fs';
const [fa, fb, ...rest] = process.argv.slice(2);
const MIN = rest[0] === '--min' ? +rest[1] : 0;
const load = f => {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const m = new Map();
  for (const s of j.scenes) {
    const seen = new Map();
    for (const r of s.rows || []) {
      const base = [s.pass || '', s.name, s.width || '', r.kind, r.ctx, r.text || '', r.fs || '', r.w || ''].join(' | ');
      const n = (seen.get(base) || 0) + 1; seen.set(base, n);
      m.set(base + ' #' + n, r);
    }
  }
  return m;
};
const A = load(fa), B = load(fb);
const groups = new Map();
const add = (k, line) => { if (!groups.has(k)) groups.set(k, { n: 0, line, keys: [] }); const g = groups.get(k); g.n++; if (g.keys.length < 3) g.keys.push(line); };
for (const [k, b] of B) {
  const a = A.get(k);
  const sig = k.split(' | ').slice(3, 8).join(' | ').replace(/ #\d+$/, '');
  if (!a) { add('ONLY NEW ' + sig + ` fg ${b.fg} bg ${b.bg} ${b.ratio}`, k); continue; }
  if (a.fg !== b.fg || a.bg !== b.bg || a.ratio !== b.ratio) {
    if (MIN && b.ratio >= MIN && a.ratio >= MIN) { add(`changed (both ≥${MIN}) ${sig.split(' | ')[0]}`, k); continue; }
    add(`CHANGED ${sig} :: ${a.fg} on ${a.bg} ${a.ratio} → ${b.fg} on ${b.bg} ${b.ratio}`, k);
  }
}
for (const [k, a] of A) if (!B.has(k)) add('ONLY OLD ' + k.split(' | ').slice(3, 8).join(' | ').replace(/ #\d+$/, '') + ` fg ${a.fg} bg ${a.bg} ${a.ratio}`, k);
for (const [g, v] of [...groups].sort((x, y) => y[1].n - x[1].n)) {
  console.log(v.n + '\t' + g.slice(0, 400));
  for (const k of v.keys) console.log('\t\t' + k.split(' | ').slice(0, 3).join(' | ').slice(0, 160));
}
console.log('rows old', A.size, 'new', B.size, 'groups', groups.size);
