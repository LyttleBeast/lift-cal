// gap-fill helper: print lines of FILE matching REGEX (case-insensitive), with line numbers.
// usage: node gf-find.mjs <file> <regex> [maxHits] [context]
import { readFileSync } from 'node:fs';
const [,, file, pat, maxS, ctxS] = process.argv;
const max = +(maxS || 200), ctx = +(ctxS || 0);
const re = new RegExp(pat, 'i');
const lines = readFileSync(file, 'utf8').split('\n');
let hits = 0;
for (let i = 0; i < lines.length && hits < max; i++) {
  if (re.test(lines[i])) {
    hits++;
    for (let j = Math.max(0, i - ctx); j <= Math.min(lines.length - 1, i + ctx); j++) {
      const s = lines[j];
      console.log(`${j + 1}${j === i ? ':' : '-'} ${s.length > 400 ? s.slice(0, 400) + ' …' : s}`);
    }
    if (ctx) console.log('--');
  }
}
console.log(`[${hits} hits]`);
