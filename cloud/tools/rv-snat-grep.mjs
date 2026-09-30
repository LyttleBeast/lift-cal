// rv-snat-grep: node rv-snat-grep.mjs '<regex source>' <file|dir>... [--ctx N] [--max N]
// Reviewer's read-only search helper. Prints file:line: text. Skips node_modules and .git.
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const argv = process.argv.slice(2);
const opt = (f, d) => { const i = argv.indexOf(f); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return Number(v); };
const ctx = opt('--ctx', 0), max = opt('--max', 400);
const re = new RegExp(argv[0], 'i');
let n = 0;
const walk = (p, top) => {
  const st = statSync(p);
  if (st.isDirectory()) { for (const e of readdirSync(p)) { if (e === 'node_modules' || e === '.git' || e === 'ios' || e === 'android') continue; walk(join(p, e), false); } return; }
  if (!top && !/\.(m?js|jsx|json|md|txt)$/.test(p)) return;
  const L = readFileSync(p, 'utf8').split('\n');
  L.forEach((l, i) => {
    if (n >= max || !re.test(l)) return;
    n++;
    for (let j = Math.max(0, i - ctx); j <= Math.min(L.length - 1, i + ctx); j++) console.log(p + ':' + (j + 1) + (j === i ? ': ' : '- ') + L[j].slice(0, 240));
    if (ctx) console.log('--');
  });
};
for (const p of argv.slice(1)) walk(p, true);
