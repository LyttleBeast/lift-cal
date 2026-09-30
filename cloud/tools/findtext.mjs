// Print lines of a text file matching a regex, with N lines of context.
// Usage: node findtext.mjs <file> <regex> [context=2] [max=40]
import { readFileSync } from 'node:fs';
const [file, pat, ctx = '2', max = '40'] = process.argv.slice(2);
const lines = readFileSync(file, 'utf8').split('\n');
const re = new RegExp(pat, 'i');
let n = 0;
for (let i = 0; i < lines.length && n < +max; i++) {
  if (re.test(lines[i])) {
    n++;
    const a = Math.max(0, i - +ctx), b = Math.min(lines.length, i + +ctx + 1);
    console.log(`--- line ${i + 1}`);
    for (let j = a; j < b; j++) console.log(lines[j]);
  }
}
console.log(`[${n} matches]`);
