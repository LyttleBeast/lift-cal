// Scratch (N1): the battery tallies of the held batteries, per zone — every
// line that holds "ok" with numbers, or the line after "the battery" header.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2];
const names = ['verify-coach-prog', 'verify-coach-overlap', 'verify-coach-ready', 'verify-coach-fuel', 'verify-finish', 'verify-coach-volume'];
for (const z of readdirSync(dir).filter(d => !d.endsWith('.json'))) {
  console.log('== ' + z);
  for (const n of names) {
    const f = join(dir, z, n + '.mjs.log');
    if (!existsSync(f)) { console.log('  ' + n + ': (no log)'); continue; }
    const L = readFileSync(f, 'utf8').split('\n');
    const hits = [];
    L.forEach((l, i) => {
      if (/(^|\s)ok\s*[:=]?\s*\d+|\d+\s+ok\b|\bok\s+\d+|miss\s*[:=]?\s*\d+|wrong\s*[:=]?\s*\d+|tally|totals?:/i.test(l)) hits.push(l.trim());
      if (/the battery — ok \/ miss \/ wrong/.test(l)) for (let k = 1; k <= 3 && L[i + k] !== undefined; k++) hits.push('> ' + L[i + k].trim());
    });
    console.log('  ' + n + ': ' + hits.slice(0, 6).map(s => s.slice(0, 120)).join(' | '));
  }
}
