// Scratch: what in Navy's fit run is worse than v1's reference run.
import { readFileSync } from 'node:fs';
const P = '/Users/micahflunker/dev/vibes-night/proof/';
const N = JSON.parse(readFileSync(P + (process.argv[2] || 'v-navy-fit-s1') + '/fit.json', 'utf8'));
const R = JSON.parse(readFileSync(P + 'v-chalk-fit-v1ref-rs9/fit.json', 'utf8'));
const hows = {}; const big = []; const notSpill = [];
for (const [sc, s] of Object.entries(N.scenes)) {
  for (const c of s.clipped || []) {
    hows[c.how] = (hows[c.how] || 0) + 1;
    const ax = c.axis === 'x' ? 0 : 1, ex = c.content[ax] - c.box[ax];
    if (c.how !== 'spills') notSpill.push([sc, c.cls, c.text.slice(0, 40), c.how, c.axis, c.box, c.content, c.overflow]);
    else if (ex > 3 || c.axis === 'x') big.push([sc, c.cls, c.text.slice(0, 40), c.axis, ex, c.overflow]);
  }
}
console.log('by how', hows);
console.log('not spills', notSpill.length); for (const x of notSpill) console.log('  ', JSON.stringify(x));
console.log('spills >3px or on x', big.length); for (const x of big.slice(0, 60)) console.log('  ', JSON.stringify(x));
// small targets: compare by scene+path against v1 ref's min size
const refSmall = new Map();
for (const [sc, s] of Object.entries(R.scenes)) for (const t of s.small || []) refSmall.set(sc + '|' + t.path, t);
const worse = [];
let sample = null;
for (const [sc, s] of Object.entries(N.scenes)) for (const t of s.small || []) {
  sample = sample || t;
  const r = refSmall.get(sc + '|' + t.path);
  const dims = x => x.box || x.rect || [x.w, x.h];
  if (!r) worse.push([sc, t.cls || t.path, t.text, JSON.stringify(dims(t)), 'not small in v1']);
  else { const a = dims(t), b = dims(r); if (Array.isArray(a) && Array.isArray(b) && (a[0] < b[0] - 0.5 || a[1] < b[1] - 0.5)) worse.push([sc, t.cls, t.text, JSON.stringify(a), 'v1 ' + JSON.stringify(b)]); }
}
console.log('sample small', JSON.stringify(sample));
console.log('small targets worse than v1', worse.length); for (const x of worse.slice(0, 60)) console.log('  ', JSON.stringify(x));
