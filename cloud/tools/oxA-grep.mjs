// Concept A (oxblood) helper: print lines matching a regex in given files.
// usage: node oxA-grep.mjs <regex> <file...>   (case-insensitive)
import fs from 'node:fs';
const [re, ...files] = process.argv.slice(2);
const rx = new RegExp(re, 'i');
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => { if (rx.test(l)) console.log(`${f.split('/').pop()}:${i + 1}: ${l.slice(0, 300)}`); });
}
