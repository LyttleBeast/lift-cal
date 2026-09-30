// ia-rs10-fitdelta.mjs <old fit.json> <new fit.json> — findings in new that old lacks, grouped by kind+cls, with a sample; plus x-axis spills in new.
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2).map(p => JSON.parse(readFileSync(p, 'utf8')));
const items = (j) => {
  const m = new Map();
  for (const [id, x] of Object.entries(j.scenes)) {
    if (x.error) continue;
    x.clipped.forEach(y => m.set(id + '|' + y.how + '|' + y.path, { id, kind: y.how, ...y }));
    x.small.forEach(y => m.set(id + '|small|' + y.path, { id, kind: 'small', ...y }));
    x.overflow.forEach(y => m.set(id + '|overflow|' + y.path, { id, kind: 'overflow', ...y }));
  }
  return m;
};
const A = items(a), B = items(b);
const g = {};
for (const [k, y] of B) if (!A.has(k)) { const key = y.kind + ' ' + y.cls + ' axis=' + y.axis; (g[key] ||= []).push(y); }
for (const [k, v] of Object.entries(g).sort((p, q) => q[1].length - p[1].length)) {
  const s = v[0];
  console.log('NEW', v.length, k, '|', s.id, JSON.stringify(s.text), 'box', s.box, 'content', s.content, 'h', s.height, '| scenes', [...new Set(v.map(y => y.id))].slice(0, 8).join(','));
}
console.log('--- x-axis spills/clips in new ---');
const xs = {};
for (const y of B.values()) if (y.axis === 'x' || (y.box && y.content && y.content[0] > y.box[0] + 0.5)) { const key = y.kind + ' ' + y.cls; (xs[key] ||= []).push(y); }
for (const [k, v] of Object.entries(xs)) console.log(v.length, k, '|', [...new Set(v.map(y => y.id))].join(','), '| e.g.', JSON.stringify(v[0].text), v[0].box, v[0].content, 'ov', v[0].overflow, 'ell', v[0].ellipsis, v[0].path);
