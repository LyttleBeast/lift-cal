// rs10-fitwatch.mjs <vibe fit.json> <v1 fit.json> — compare the watched boxes (Coach card, buttons, chips) of a vibe fit run against v1's.
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2);
const A = JSON.parse(readFileSync(a, 'utf8')), B = JSON.parse(readFileSync(b, 'utf8'));
const first = Object.values(A.scenes).find(s => s.watch);
console.log('watch sample', JSON.stringify(first.watch).slice(0, 800));
// Coach card
const coach = {};
const smaller = [];
const clipAll = [];
for (const [id, s] of Object.entries(A.scenes)) {
  if (s.error) continue;
  s.clipped.filter(c => c.how === 'clipped').forEach(c => clipAll.push(id + ' ' + c.cls + ' ' + JSON.stringify(c.text)));
  const w = s.watch || [];
  const ref = (B.scenes[id] && B.scenes[id].watch) || [];
  const arr = Array.isArray(w) ? w : Object.entries(w).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map(x => ({ key: k, ...x })));
  const rarr = Array.isArray(ref) ? ref : Object.entries(ref).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map(x => ({ key: k, ...x })));
  for (const x of arr) {
    const tag = x.key || x.sel || x.cls || '';
    if (/coach/.test(JSON.stringify(x).slice(0, 200))) {
      const k = (x.cls || tag) + ' h=' + (x.h ?? x.height ?? (x.box && x.box[1])) + ' ' + JSON.stringify(x).slice(0, 160);
      coach[k] = (coach[k] || 0) + 1;
    }
    const r = rarr.find(y => y.path === x.path);
    if (r && x.h !== undefined && r.h !== undefined && x.h < r.h && x.h < 44) smaller.push(id + ' ' + tag + ' ' + x.path + ' ' + r.h + '->' + x.h);
  }
}
console.log('COACH entries:'); Object.entries(coach).slice(0, 40).forEach(([k, n]) => console.log(n, k));
console.log('SMALLER than v1 and under 44:', smaller.length); smaller.slice(0, 40).forEach(l => console.log(' ', l));
console.log('CLIPPED:', clipAll.length); clipAll.forEach(l => console.log(' ', l));
