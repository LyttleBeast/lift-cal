// batteries.mjs — pull the held batteries' ok/miss/wrong totals out of a run-verifiers output dir.
// Usage: node batteries.mjs <outDir>   (reads <outDir>/<zone>/*.log)
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2];
const want = ['coach-prog', 'coach-overlap', 'coach-ready', 'coach-fuel', 'finish', 'coach-volume'];
const res = {};
for (const zone of readdirSync(dir).filter(z => !z.endsWith('.json'))) {
  res[zone] = {};
  for (const w of want) {
    const f = [join(dir, zone, w + '.mjs.log'), join(dir, zone, 'verify-' + w + '.mjs.log')].find(existsSync);
    if (!f) continue;
    const lines = readFileSync(f, 'utf8').split('\n');
    const tallies = lines.filter(l => /\bok:?\s*\d+[\s,]+miss:?\s*\d+[\s,]+wrong:?\s*\d+/i.test(l)).map(l => l.trim().replace(/\s+/g, ' '));
    res[zone][w] = tallies;
  }
}
console.log(JSON.stringify(res, null, 1));
