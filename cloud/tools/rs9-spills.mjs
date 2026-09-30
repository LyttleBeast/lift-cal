// Lists new spills (not in the v1 ref) on the x axis, and y spills by size.
import { readFileSync } from 'node:fs';
const [, , refPath, vibePath] = process.argv;
const ref = JSON.parse(readFileSync(refPath, 'utf8')), vib = JSON.parse(readFileSync(vibePath, 'utf8'));
const xs = {}, ys = {};
for (const [id, x] of Object.entries(vib.scenes)) {
  if (x.error) continue;
  const rs = new Map(ref.scenes[id].clipped.map(y => [y.path, y]));
  for (const y of x.clipped) {
    if (y.how !== 'spills') continue;
    const o = rs.get(y.path);
    if (o && o.axis === y.axis && o.content[0] - o.box[0] >= y.content[0] - y.box[0] && o.content[1] - o.box[1] >= y.content[1] - y.box[1]) continue;
    const dx = y.content[0] - y.box[0], dy = y.content[1] - y.box[1];
    if (y.axis.includes('x')) { const k = y.cls + ' "' + y.text.slice(0, 30) + '"'; (xs[k] ||= []).push(id + ' +' + dx + 'px box ' + y.box + ' ov ' + y.overflow + ' ell ' + y.ellipsis); }
    if (y.axis.includes('y')) { const k = y.cls + ' dy' + dy; (ys[k] ||= []).push(id + ' "' + y.text.slice(0, 24) + '" box ' + y.box + ' h ' + y.height); }
  }
}
console.log('X SPILLS:'); for (const [k, v] of Object.entries(xs)) console.log('  ' + k + ' x' + v.length + ': ' + v.slice(0, 4).join(' ; '));
console.log('Y SPILLS dy>=5:'); for (const [k, v] of Object.entries(ys).sort()) { const dy = +k.split(' dy')[1]; if (dy >= 5) console.log('  ' + k + ' x' + v.length + ': ' + v.slice(0, 3).join(' ; ')); }
const small = Object.entries(ys).filter(([k]) => +k.split(' dy')[1] < 5).reduce((n, [, v]) => n + v.length, 0);
console.log('Y spills dy<5:', small);
