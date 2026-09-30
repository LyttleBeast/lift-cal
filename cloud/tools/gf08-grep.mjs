// Gap-fill 08a/09 helper: search a file (or list a directory) without shell pipes.
// usage: node gf08-grep.mjs <file> <regex> [context]
//        node gf08-grep.mjs --ls <dir>
import fs from 'node:fs';
const [a, b, c] = process.argv.slice(2);
if (a === '--ls') {
  for (const e of fs.readdirSync(b, { withFileTypes: true })) {
    const p = b + '/' + e.name;
    const s = fs.statSync(p);
    console.log((e.isDirectory() ? 'd ' : 'f ') + String(s.size).padStart(12) + ' ' + e.name);
  }
  process.exit(0);
}
const re = new RegExp(b, 'i');
const ctx = Number(c || 0);
const lines = fs.readFileSync(a, 'utf8').split('\n');
lines.forEach((l, i) => {
  if (re.test(l)) {
    for (let j = Math.max(0, i - ctx); j <= Math.min(lines.length - 1, i + ctx); j++) {
      console.log(String(j + 1).padStart(5) + (j === i ? ': ' : '- ') + lines[j].slice(0, 400));
    }
    if (ctx) console.log('--');
  }
});
