// r3-grep.mjs — track 3 research helper: print regex matches (with a little context) from a saved file.
// Usage: node r3-grep.mjs <file> <regex> [context=60] [max=40]
import { readFileSync } from 'node:fs';
const [file, pat, ctxArg, maxArg] = process.argv.slice(2);
const s = readFileSync(file, 'utf8');
const re = new RegExp(pat, 'gi');
const ctx = +(ctxArg || 60), max = +(maxArg || 40);
let n = 0; const seen = new Set();
for (const m of s.matchAll(re)) {
  const a = Math.max(0, m.index - ctx), b = Math.min(s.length, m.index + m[0].length + ctx);
  const snip = s.slice(a, b).replace(/\s+/g, ' ');
  if (seen.has(snip)) continue; seen.add(snip);
  console.log(`[${m.index}] ${snip}`);
  if (++n >= max) break;
}
console.log(`-- ${n} shown`);
