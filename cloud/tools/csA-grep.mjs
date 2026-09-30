// Clear sky concept A: a tiny read-only grep. node csA-grep.mjs <regex> <file|dir>... [--ctx N] [--max N]
// Prints file:line: text for each match. Directories are walked (skipping node_modules and .git).
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
let ctx = 0, max = 400;
const rest = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--ctx') ctx = +args[++i];
  else if (args[i] === '--max') max = +args[++i];
  else rest.push(args[i]);
}
const re = new RegExp(rest.shift(), 'i');
let n = 0;
function walk(p) {
  const s = fs.statSync(p);
  if (s.isDirectory()) {
    for (const f of fs.readdirSync(p)) {
      if (f === 'node_modules' || f === '.git') continue;
      walk(path.join(p, f));
    }
    return;
  }
  if (s.size > 5e6) return;
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (n >= max) return;
    if (re.test(l)) {
      n++;
      const a = Math.max(0, i - ctx), b = Math.min(lines.length - 1, i + ctx);
      for (let j = a; j <= b; j++) console.log(`${p}:${j + 1}:${j === i ? ' ' : '-'}${lines[j].slice(0, 300)}`);
      if (ctx) console.log('--');
    }
  });
}
for (const p of rest) walk(p);
