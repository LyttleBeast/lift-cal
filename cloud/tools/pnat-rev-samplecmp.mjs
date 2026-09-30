// Compare two pnat-rev-sample outputs entry by entry; print every difference.
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2).map(f => JSON.parse(readFileSync(f, 'utf8')));
let diffs = 0, n = 0;
for (const k of Object.keys(a)) {
  const x = a[k], y = b[k];
  if (Array.isArray(x)) {
    for (let i = 0; i < Math.max(x.length, y.length); i++) { n++; if (x[i] !== y[i]) { diffs++; if (diffs <= 40) console.log(k + '[' + i + ']:\n  base  ' + x[i] + '\n  other ' + y[i]); } }
  } else { n++; if (x !== y) { diffs++; if (diffs <= 40) console.log(k + ':\n  base  ' + String(x).slice(0, 600) + '\n  other ' + String(y).slice(0, 600)); } }
}
console.log('compared', n, 'differences', diffs);
