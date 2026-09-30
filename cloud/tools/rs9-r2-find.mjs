// Print "file:line: text" for lines matching a regex (arg 2) in file (arg 1).
// Scratch helper for the Iron Age panel round 2 reviser (no pipes allowed).
import fs from 'node:fs';
const [file, pat, flags = ''] = process.argv.slice(2);
const re = new RegExp(pat, flags);
const lines = fs.readFileSync(file, 'utf8').split('\n');
lines.forEach((l, i) => { if (re.test(l)) console.log(`${i + 1}: ${l.slice(0, 220)}`); });
