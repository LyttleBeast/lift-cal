// N3 scratch: print lines matching a regex in a file, with line numbers (no grep in this session).
// usage: node n3-find.mjs <file> <regex> [context]
import fs from 'node:fs';
const [file, re, ctx = '0'] = process.argv.slice(2);
const rx = new RegExp(re);
const lines = fs.readFileSync(file, 'utf8').split('\n');
const c = +ctx;
const shown = new Set();
lines.forEach((l, i) => {
  if (!rx.test(l)) return;
  for (let j = Math.max(0, i - c); j <= Math.min(lines.length - 1, i + c); j++) {
    if (shown.has(j)) continue; shown.add(j);
    console.log((j + 1) + (j === i ? ': ' : '- ') + lines[j].slice(0, 220));
  }
  if (c) console.log('--');
});
