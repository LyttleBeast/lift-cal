// The watched boxes (.coach-card, .btn, chips) in a fit.json: coach-card heights,
// and any watched box whose content exceeds its box; compared with a v1 fit.json.
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2);
const A = JSON.parse(readFileSync(a, 'utf8')), B = JSON.parse(readFileSync(b, 'utf8'));
const coach = new Map(), over = [];
const bw = new Map();
for (const [id, x] of Object.entries(B.scenes)) if (!x.error) for (const w of x.watch) bw.set(id + '|' + w.path, w);
let n = 0, hdiff = [];
for (const [id, x] of Object.entries(A.scenes)) {
  if (x.error) { console.log('ERROR', id, x.error); continue; }
  for (const w of x.watch) {
    n++;
    if (/coach-card/.test(w.cls)) { const k = w.h; coach.set(k, (coach.get(k) || 0) + 1); }
    const v = bw.get(id + '|' + w.path);
    if (w.content[0] > w.box[0] + 1 || w.content[1] > w.box[1] + 1) over.push(id + ' ' + w.cls + ' box ' + w.box + ' content ' + w.content + (v ? ' (v1 box ' + v.box + ' content ' + v.content + ')' : ' (not in v1)'));
    if (v && Math.abs(v.h - w.h) > 0.01) hdiff.push(id + ' ' + w.cls + ' h ' + w.h + ' v1 ' + v.h);
  }
}
console.log('watched', n, 'coach-card heights', JSON.stringify([...coach]));
console.log('content over box (' + over.length + '):'); over.slice(0, 60).forEach(l => console.log('  ' + l));
const hs = {}; hdiff.forEach(l => { const k = l.split(' ').slice(1).join(' '); hs[k] = (hs[k] || 0) + 1; });
console.log('height differs from v1 (' + hdiff.length + '):'); Object.entries(hs).sort((x, y) => y[1] - x[1]).slice(0, 40).forEach(([k, c]) => console.log('  ' + c + 'x ' + k));
// the clipped ones in A, all
for (const [id, x] of Object.entries(A.scenes)) if (!x.error) x.clipped.filter(y => y.how === 'clipped').forEach(y => console.log('CLIPPED', id, y.cls, JSON.stringify(y.text), 'box', y.box, 'content', y.content, y.overflow, 'ell', y.ellipsis));
