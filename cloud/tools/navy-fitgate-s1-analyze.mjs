// Summarise a fit.json against a v1 fit.json: new findings by kind, and the
// clipped / small-target / overflow details. Usage: node <this> <fit.json> <v1 fit.json>
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2);
const A = JSON.parse(readFileSync(a, 'utf8')), B = JSON.parse(readFileSync(b, 'utf8'));
const keys = (sc) => {
  const k = new Map();
  for (const [id, x] of Object.entries(sc)) {
    if (x.error) continue;
    if (x.docOverflow) k.set(id + '|docOverflow', x);
    x.overflow.forEach(y => k.set(id + '|overflow|' + y.path, y));
    x.clipped.forEach(y => k.set(id + '|' + y.how + '|' + y.path, y));
    x.small.forEach(y => k.set(id + '|small|' + y.path, y));
  }
  return k;
};
const ka = keys(A.scenes), kb = keys(B.scenes);
console.log('A', a, 'vibe', A.vibe, 'sha', A.sha, 'totals', JSON.stringify(A.totals));
console.log('B', b, 'vibe', B.vibe, 'sha', B.sha, 'totals', JSON.stringify(B.totals));
const nw = [...ka.keys()].filter(k => !kb.has(k));
const gone = [...kb.keys()].filter(k => !ka.has(k));
const byKind = {};
for (const k of nw) { const kind = k.split('|')[1]; byKind[kind] = (byKind[kind] || 0) + 1; }
console.log('new by kind', JSON.stringify(byKind), 'gone', gone.length);
const goneKind = {};
for (const k of gone) { const kind = k.split('|')[1]; goneKind[kind] = (goneKind[kind] || 0) + 1; }
console.log('gone by kind', JSON.stringify(goneKind));
const show = process.argv[4] || 'clipped,overflow,docOverflow,small';
for (const kind of show.split(',')) {
  const ks = nw.filter(k => k.split('|')[1] === kind);
  console.log('\n=== NEW ' + kind + ' (' + ks.length + ') ===');
  // group by path without scene
  const g = new Map();
  for (const k of ks) { const [id, , path] = k.split('|'); const key = path || ''; if (!g.has(key)) g.set(key, []); g.get(key).push(id); }
  const rows = [...g.entries()].sort((x, y) => y[1].length - x[1].length);
  for (const [p, ids] of rows.slice(0, +(process.env.N || 60))) {
    const ex = ka.get(ids[0] + '|' + kind + (p ? '|' + p : ''));
    console.log(ids.length + 'x ' + p + '\n    e.g. ' + ids.slice(0, 4).join(', ') + '\n    ' + JSON.stringify(ex).slice(0, 400));
  }
}
if (process.env.ALL) {
  const [id] = process.env.ALL.split('@');
  console.log(JSON.stringify(A.scenes[process.env.ALL], null, 1).slice(0, 20000));
}
