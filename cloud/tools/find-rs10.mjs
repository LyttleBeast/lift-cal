// print context around every match of a regex in a text file
// usage: node find-rs10.mjs <file> <regex> [ctxChars=300] [max=20]
import { readFileSync } from 'node:fs';
const [file, re, ctx = '300', max = '20'] = process.argv.slice(2);
const s = readFileSync(file, 'utf8');
const rx = new RegExp(re, 'g');
let m, n = 0;
while ((m = rx.exec(s)) && n < +max) {
  n++;
  console.log('--- @' + m.index + '\n' + s.slice(Math.max(0, m.index - +ctx), m.index + +ctx).replace(/\\n/g, '\n'));
}
console.log('matches shown: ' + n);
