// Where else has a PNG state hash appeared in the night's proof runs? Scans
// every run.log and summary.json under proof/ (one level) for the string.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
const P = '/Users/micahflunker/dev/vibes-night/proof/';
const needle = process.argv[2];
for (const n of readdirSync(P)) {
  for (const f of ['run.log', 'summary.json']) {
    const p = P + n + '/' + f;
    if (!existsSync(p) || statSync(p).size > 64e6) continue;
    const t = readFileSync(p, 'utf8');
    let i = t.indexOf(needle), k = 0;
    while (i >= 0 && k < 3) {
      console.log(n + '/' + f + ': ' + t.slice(Math.max(0, i - 220), i + 60).replace(/\s+/g, ' '));
      i = t.indexOf(needle, i + 1); k++;
    }
  }
}
