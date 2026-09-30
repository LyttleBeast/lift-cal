// ev3k: grep a file or dir (non-recursive into node_modules). Usage: node ev3k-grep.mjs <regex> <path...> [--max N]
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
let max = 200;
const mi = args.indexOf('--max');
if (mi >= 0) { max = +args[mi + 1]; args.splice(mi, 2); }
const re = new RegExp(args[0]);
let n = 0;
function walk(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const c of fs.readdirSync(p)) { if (c === 'node_modules' || c === '.git') continue; walk(path.join(p, c)); }
    return;
  }
  if (st.size > 5e6) return;
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  lines.forEach((l, i) => { if (n < max && re.test(l)) { n++; console.log(p + ':' + (i + 1) + ': ' + l.slice(0, 400)); } });
}
for (const p of args.slice(1)) walk(p);
