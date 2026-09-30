// cssrev2-grep.mjs <root> <regex> [ext,ext] [flags]
// A read-only grep over a tree (skips node_modules/.git), for the Pweb css-lens review.
import fs from 'node:fs';
import path from 'node:path';
const [root, pat, exts = 'js,css,html', flags = ''] = process.argv.slice(2);
const re = new RegExp(pat, flags);
const want = new Set(exts.split(','));
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'report') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (want.has(path.extname(e.name).slice(1))) {
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      lines.forEach((l, i) => { if (re.test(l)) console.log(`${path.relative(root, p)}:${i + 1}: ${l.length > 220 ? l.slice(0, 220) + '…' : l}`); });
    }
  }
}
walk(root);
