// ia-fit-sum.mjs <fit.json> [ref fit.json] — the clipped and small findings
// this run has that the reference does not, with their text and sizes.
import { readFileSync } from 'node:fs';
const [f, r] = process.argv.slice(2);
const A = JSON.parse(readFileSync(f, 'utf8'));
const R = r ? JSON.parse(readFileSync(r, 'utf8')) : { scenes: {} };
const key = (id, y, how) => id + '|' + how + '|' + y.path;
const ref = new Set();
for (const [id, x] of Object.entries(R.scenes)) if (!x.error) {
  x.clipped.forEach(y => ref.add(key(id, y, y.how)));
  x.small.forEach(y => ref.add(key(id, y, 'small')));
}
const out = { clipped: [], small: [], spillKinds: {} };
for (const [id, x] of Object.entries(A.scenes)) if (!x.error) {
  x.clipped.forEach(y => {
    if (ref.has(key(id, y, y.how))) return;
    if (y.how === 'clipped') out.clipped.push([id, y]);
    else { const k = (y.cls || y.tag || '') + ''; out.spillKinds[k] = (out.spillKinds[k] || 0) + 1; }
  });
  x.small.forEach(y => { if (!ref.has(key(id, y, 'small'))) out.small.push([id, y]); });
}
console.log('NEW clipped', out.clipped.length);
for (const [id, y] of out.clipped) console.log(' ', id, JSON.stringify(y).slice(0, 260));
console.log('NEW small', out.small.length);
for (const [id, y] of out.small.slice(0, 60)) console.log(' ', id, JSON.stringify(y).slice(0, 220));
console.log('NEW spill kinds', JSON.stringify(out.spillKinds).slice(0, 3000));
const one = Object.values(A.scenes).find(x => !x.error && x.clipped.length);
if (one) console.log('sample finding shape', JSON.stringify(one.clipped[0]).slice(0, 400));
