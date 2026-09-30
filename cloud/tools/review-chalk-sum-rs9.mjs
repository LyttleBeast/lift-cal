// Review scratch: per scene, which captures carry text / value / struct
// differences in a prove run's summary.json; and a sample of the settings-hub's.
import { readFileSync } from 'node:fs';
const run = process.argv[2];
const s = JSON.parse(readFileSync(`/Users/micahflunker/dev/vibes-night/proof/${run}/summary.json`, 'utf8'));
const keys = Object.keys(s);
console.log('keys', keys.join(' '));
const walk = (o, path, out) => {
  if (!o || typeof o !== 'object') return;
  if (('text' in o || 'textDiffs' in o) && ('struct' in o || 'structDiffs' in o)) out.push([path, o]);
  for (const [k, v] of Object.entries(o)) walk(v, path + '/' + k, out);
};
const out = [];
walk(s, '', out);
let t = 0, st = 0, va = 0;
for (const [p, o] of out) {
  const tx = o.text ?? o.textDiffs ?? 0, sx = o.struct ?? o.structDiffs ?? 0, vx = o.value ?? o.valueDiffs ?? 0;
  if (p.includes('totals')) continue;
  t += +tx || 0; st += +sx || 0; va += +vx || 0;
  if (tx || sx || vx) console.log(p, 'text', JSON.stringify(tx), 'struct', JSON.stringify(sx), 'value', JSON.stringify(vx));
}
console.log('sum text', t, 'struct', st, 'value', va, 'entries', out.length);
