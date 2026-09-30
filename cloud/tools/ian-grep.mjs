// Regex search over files/dirs: node ian-grep.mjs <root> <regex> [flags] -- <rel paths...>
// Prints rel:line: text. Dirs are walked (skips node_modules, .git).
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
const args = process.argv.slice(2);
const root = args[0];
const re = new RegExp(args[1], args[2] && args[2] !== '--' ? args[2] : '');
const dd = args.indexOf('--');
const rels = dd >= 0 ? args.slice(dd + 1) : ['.'];
const max = +(process.env.MAX || 400);
let n = 0;
function walk(p, top) {
  let st; try { st = statSync(p); } catch { return; }
  if (st.isDirectory()) {
    for (const f of readdirSync(p)) { if (f === 'node_modules' || f === '.git') continue; walk(join(p, f)); }
    return;
  }
  if (!top && !/\.(m?js|jsx|json|css|html|md|ts|tsx)$/.test(p)) return;
  const lines = readFileSync(p, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (re.test(l) && n++ < max) console.log(relative(root, p) + ':' + (i + 1) + ': ' + (l.length > 240 ? l.slice(0, 240) + '…' : l));
  });
}
for (const r of rels) walk(join(root, r), true);
if (n > max) console.log(`… ${n - max} more`);
