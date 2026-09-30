// chk-ev2-grep.mjs — grep files by regex (for untracked files git grep cannot see).
// Usage: node chk-ev2-grep.mjs '<regex>' file [file…]   (prints file:line: text)
import { readFileSync } from 'node:fs';
const [pat, ...files] = process.argv.slice(2);
const re = new RegExp(pat);
for (const f of files) {
  let t; try { t = readFileSync(f, 'utf8'); } catch (e) { console.log(f + ': ' + e.message); continue; }
  t.split('\n').forEach((l, i) => { if (re.test(l)) console.log(f.replace(/.*\//, '') + ':' + (i + 1) + ': ' + l.slice(0, 220)); });
}
