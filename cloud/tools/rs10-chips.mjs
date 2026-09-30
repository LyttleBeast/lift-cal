// rs10-chips.mjs <vibe fit.json> <v1 fit.json> <scene> <clsRegex> — watched and small entries for a scene, side by side.
import { readFileSync } from 'node:fs';
const [a, b, scene, re] = process.argv.slice(2);
const A = JSON.parse(readFileSync(a, 'utf8')), B = JSON.parse(readFileSync(b, 'utf8'));
const R = new RegExp(re);
for (const [lbl, J] of [['VIBE', A], ['V1', B]]) {
  const s = J.scenes[scene];
  console.log('==', lbl, scene);
  (s.watch || []).filter(x => R.test(x.cls)).forEach(x => console.log(' watch', x.path.split('>').slice(-3).join('>'), x.cls, x.w + 'x' + x.h));
  (s.small || []).filter(x => R.test(x.cls || '')).forEach(x => console.log(' small', JSON.stringify(x).slice(0, 300)));
}
