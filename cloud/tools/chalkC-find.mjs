// Chalk concept C: search text files for a pattern (no Grep tool in this session).
// usage: node chalkC-find.mjs <regex> <file-or-dir> [more...]
import fs from 'node:fs';
import path from 'node:path';
const [pat, ...targets] = process.argv.slice(2);
const re = new RegExp(pat, 'i');
function walk(p, out) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const f of fs.readdirSync(p)) {
      if (f === 'node_modules' || f.startsWith('.git')) continue;
      walk(path.join(p, f), out);
    }
  } else if (/\.(md|js|mjs|json|txt|css|html)$/.test(p)) out.push(p);
}
const files = [];
for (const t of targets) walk(t, files);
let n = 0;
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (re.test(l)) {
      if (n < 400) console.log(`${f}:${i + 1}: ${l.slice(0, 300)}`);
      n++;
    }
  });
}
console.log(`-- ${n} matches`);
