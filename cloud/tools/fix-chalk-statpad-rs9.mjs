// Fix scratch (chalk review r1): from a prove run's dumps, every `.stat` cell's
// computed padding-left and rect on side A (base, v1) and side B (Chalk), so
// the first column's padding can be seen to match v1's 10px.
import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
const run = process.argv[2];
let bad = 0;
const out = {};
for (const side of ['A', 'B']) {
  for (const w of readdirSync(join(run, side)).filter(w => /^\d+$/.test(w))) {
    for (const f of readdirSync(join(run, side, w)).filter(f => f.endsWith('.dump.json.gz'))) {
      const d = JSON.parse(gunzipSync(readFileSync(join(run, side, w, f))).toString());
      const pl = d.props.indexOf('padding-left');
      const cells = d.els.filter(e => e.at && e.at.class && e.at.class.split(/\s+/).includes('stat'));
      out[side + ' ' + w + ' ' + f] = cells.map(e => ({ first: /:1$/.test(e.p), pl: d.styles[e.s][pl], x: +e.r[0].toFixed(1), w: +e.r[2].toFixed(1) }));
    }
  }
}
for (const [k, v] of Object.entries(out)) {
  console.log(k, JSON.stringify(v));
  if (k.startsWith('B') && v.some(c => c.pl !== '10px')) { bad++; console.log('FAIL a Chalk .stat without 10px left padding'); }
  const a = out['A' + k.slice(1)];
  if (k.startsWith('B') && a && JSON.stringify(a.map(c => [c.x, c.w])) !== JSON.stringify(v.map(c => [c.x, c.w]))) { bad++; console.log('FAIL rects differ from v1'); }
}
console.log(bad ? bad + ' FAILED' : 'every .stat at 10px, rects as v1');
process.exit(bad ? 1 : 0);
