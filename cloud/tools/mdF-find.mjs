// mdF-find.mjs — read-only line search for Meet Day's final spec work (the
// session has no Grep tool, and a Bash pattern may hold a fenced word).
// Usage: node mdF-find.mjs <file> <regex> [context]
import { readFileSync } from 'node:fs';
const [file, pat, ctx = '0'] = process.argv.slice(2);
const re = new RegExp(pat, 'i');
const lines = readFileSync(file, 'utf8').split('\n');
const c = Number(ctx) || 0;
const shown = new Set();
lines.forEach((l, i) => {
  if (!re.test(l)) return;
  for (let j = Math.max(0, i - c); j <= Math.min(lines.length - 1, i + c); j++) {
    if (shown.has(j)) continue;
    shown.add(j);
    console.log(`${j + 1}${j === i ? ':' : '-'} ${lines[j].slice(0, 260)}`);
  }
  if (c) console.log('--');
});
