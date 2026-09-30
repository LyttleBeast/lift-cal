// Dump rows of a contrast json matching a scene regex and a row filter, in
// order, with a window of neighbours (to see a mark's ring / host).
//   node chalk-r4b-rows-rs9.mjs <json> <sceneRe> <rowRe> [--win n] [--limit n]
import { readFileSync } from 'node:fs';
const [file, sre, rre] = process.argv.slice(2);
const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const WIN = +arg('--win', 0), LIMIT = +arg('--limit', 20);
const J = JSON.parse(readFileSync(file, 'utf8'));
const S = J.scenes ? J.scenes.map(s => ({ name: s.pass + ':' + s.name, rows: s.rows })) : J.results.filter(r => !r.error).map(r => ({ name: r.scene + '@' + r.width, rows: r.rows }));
const SR = new RegExp(sre), RR = new RegExp(rre);
const brief = x => { const o = { ...x }; delete o.ctx; return JSON.stringify(o).slice(0, 400) + '\n        ctx ' + (x.ctx || '').slice(0, 160); };
let n = 0;
for (const s of S) {
  if (!SR.test(s.name)) continue;
  s.rows.forEach((x, i) => {
    if (n >= LIMIT) return;
    if (!RR.test(JSON.stringify(x))) return;
    n++;
    console.log('## ' + s.name + ' #' + i);
    for (let j = Math.max(0, i - WIN); j <= Math.min(s.rows.length - 1, i + WIN); j++) console.log((j === i ? ' >> ' : '    ') + j + ' ' + brief(s.rows[j]));
  });
}
console.log('matched', n);
