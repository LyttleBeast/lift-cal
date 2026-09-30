// fgrep8b.mjs — track 8b: regex search in a local text file with context (no shell grep allowed).
// Usage: node fgrep8b.mjs <file> '<regex>' [context chars=80] [max=40]
import { readFileSync } from 'node:fs';
const [f, re, ctx = 80, max = 40] = process.argv.slice(2);
const t = readFileSync(f, 'utf8');
const rx = new RegExp(re, 'gi');
let m, n = 0;
while ((m = rx.exec(t)) && n < +max) {
  n++;
  const s = Math.max(0, m.index - +ctx), e = Math.min(t.length, m.index + m[0].length + +ctx);
  console.log(`@${m.index}: ${t.slice(s, e).replace(/\s+/g, ' ')}`);
}
console.log(`-- ${n} shown`);
