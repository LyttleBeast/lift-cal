// rs10-fitwatch2.mjs <vibe fit.json> <v1 fit.json> — every watched box: content over box, Coach card heights, any box smaller than v1's.
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2);
const A = JSON.parse(readFileSync(a, 'utf8')), B = JSON.parse(readFileSync(b, 'utf8'));
const cards = {}, over = [], smaller = [], missing = [];
let n = 0;
for (const [id, s] of Object.entries(A.scenes)) {
  if (s.error) continue;
  const ref = (B.scenes[id] && B.scenes[id].watch) || [];
  for (const x of s.watch || []) {
    n++;
    if (/^\.coach-card/.test(x.cls)) { const k = x.cls + ' ' + x.w + 'x' + x.h + ' box ' + x.box + ' content ' + x.content; cards[k] = (cards[k] || 0) + 1; }
    if (x.content[0] > x.box[0] + 0.5 || x.content[1] > x.box[1] + 0.5) over.push(id + ' ' + x.cls + ' box ' + x.box + ' content ' + x.content);
    const r = ref.find(y => y.path === x.path);
    if (!r) missing.push(id + ' ' + x.cls);
    else if (x.h < r.h - 0.5 || x.w < r.w - 0.5 && x.w < 44) smaller.push(id + ' ' + x.cls + ' ' + r.w + 'x' + r.h + ' -> ' + x.w + 'x' + x.h);
  }
}
console.log('watched', n);
console.log('COACH CARDS'); Object.entries(cards).forEach(([k, c]) => console.log(' ', c, k));
console.log('CONTENT OVER BOX', over.length); over.slice(0, 50).forEach(l => console.log(' ', l));
console.log('SMALLER THAN V1', smaller.length); smaller.slice(0, 50).forEach(l => console.log(' ', l));
console.log('NOT IN V1 WATCH', missing.length); missing.slice(0, 20).forEach(l => console.log(' ', l));
