// Iron Age contrast round 3 (rs9): dump full rows (all fields) for one scene
// regex whose raw/fg matches a regex and whose ratio is under a max.
//   node ia-r3-rows-rs9.mjs <json> <sceneRe> <rawRe> [maxRatio] [limit]
import { readFileSync } from 'node:fs';
const [file, sre, rre, max = '99', lim = '8'] = process.argv.slice(2);
const J = JSON.parse(readFileSync(file, 'utf8'));
const scenes = J.scenes ? J.scenes.map(s => ({ name: s.pass + ':' + s.name, rows: s.rows }))
  : J.results.filter(r => !r.error).map(r => ({ name: r.scene + '@' + r.width, rows: r.rows }));
const S = new RegExp(sre), R = new RegExp(rre);
let n = 0;
for (const s of scenes) {
  if (!S.test(s.name)) continue;
  for (const x of s.rows) {
    if (!(R.test(String(x.raw)) || R.test(String(x.fg)) || R.test(String(x.ctx)))) continue;
    if (x.ratio == null || x.ratio >= +max) continue;
    if (n++ >= +lim) break;
    console.log(s.name, JSON.stringify(x).slice(0, 900));
  }
}
console.log('shown', Math.min(n, +lim), 'of', n);
