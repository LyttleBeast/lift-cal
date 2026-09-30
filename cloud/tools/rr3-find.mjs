// Round-3 reviewer's read-only search: node rr3-find.mjs <file-or-dir> <regex> [maxHits] [extRegex]
// Prints path:line: text for each line matching regex. Reads only.
import fs from 'node:fs';
import path from 'node:path';

const [root, pat, maxArg, extArg] = process.argv.slice(2);
const re = new RegExp(pat);
const max = Number(maxArg) || 200;
const ext = extArg ? new RegExp(extArg) : /\.(m?js|jsx|cjs|ts|tsx|json)$/;
let hits = 0;

function walk(p) {
  if (hits >= max) return;
  let st;
  try { st = fs.statSync(p); } catch { return; }
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(p)) {
      if (e === '.git') continue;
      walk(path.join(p, e));
      if (hits >= max) return;
    }
    return;
  }
  if (!ext.test(p)) return;
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (hits < max && re.test(l)) { hits++; console.log(p + ':' + (i + 1) + ': ' + l.slice(0, 240)); }
  });
}
walk(root);
console.log('-- ' + hits + ' hit(s)');
