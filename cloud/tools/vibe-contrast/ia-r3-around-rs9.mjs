// Iron Age contrast round 3 (rs9): print a scene's rows in order around each
// row matching a regex (over raw/fg/ctx), with the nearby text rows, so a
// low pair can be placed on the screen it belongs to.
//   node ia-r3-around-rs9.mjs <json> <sceneRe> <rowRe> [before] [after] [maxHits]
import { readFileSync } from 'node:fs';
const [file, sre, rre, b = '6', a = '4', mh = '3'] = process.argv.slice(2);
const J = JSON.parse(readFileSync(file, 'utf8'));
const scenes = J.scenes ? J.scenes.map(s => ({ name: s.pass + ':' + s.name, rows: s.rows }))
  : J.results.filter(r => !r.error).map(r => ({ name: r.scene + '@' + r.width, rows: r.rows }));
const S = new RegExp(sre), R = new RegExp(rre);
const fmt = x => `${x.kind} ${x.ratio} ${x.fg} on ${x.bg} raw ${x.raw}${x.text ? ' ' + JSON.stringify(x.text).slice(0, 60) : ''} | ${String(x.ctx).slice(0, 90)} ${(x.fl || []).join(',')}`;
let hits = 0;
for (const s of scenes) {
  if (!S.test(s.name)) continue;
  let last = -99;
  s.rows.forEach((x, i) => {
    if (hits >= +mh) return;
    const line = [x.kind, x.raw, x.fg, x.ctx, x.ratio].join(' ');
    if (!R.test(line) || i - last < +a) return;
    hits++; last = i;
    console.log('--- ' + s.name + ' row ' + i);
    for (let j = Math.max(0, i - +b); j <= Math.min(s.rows.length - 1, i + +a); j++) console.log((j === i ? '>> ' : '   ') + fmt(s.rows[j]));
  });
}
