// Oxblood v1 gate (round 2-s1, fresh): per-scene non-zero diff kinds of a
// prove run's summary.json, grouped, so the known v1 changes can be told from
// anything else. Usage: node oxblood-v1g3-s1-sum.mjs <runDir>
import { readFileSync } from 'node:fs';
const s = JSON.parse(readFileSync(process.argv[2] + '/summary.json', 'utf8'));
console.log('verdict', s.verdict, 'A', JSON.stringify(s.A).slice(0, 200), 'B', JSON.stringify(s.B).slice(0, 200));
console.log('totals', JSON.stringify(s.totals));
const scenes = s.scenes || [];
const arr = Array.isArray(scenes) ? scenes : Object.entries(scenes).map(([k, v]) => ({ key: k, ...v }));
const groups = {};
for (const sc of arr) {
  const name = (sc.name || sc.scene || sc.key) + '@' + (sc.width || sc.w || '');
  const d = sc.diffs || sc.counts || sc;
  const nz = Object.fromEntries(Object.entries(d).filter(([k, v]) => typeof v === 'number' && v && /Diffs$|pixel|diffPixels|errors/i.test(k)));
  const key = JSON.stringify(nz);
  (groups[key] ||= []).push(name);
}
for (const [k, v] of Object.entries(groups)) console.log(k, v.length, v.join(' ').slice(0, 3000));
if (process.argv[3]) { const one = arr.find(x => (x.name || x.scene || x.key) === process.argv[3]); console.log(JSON.stringify(one, null, 1).slice(0, 6000)); }
