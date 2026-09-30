// node s-nat-fix2-wait.mjs <file> <regex> [maxSeconds=540] — polls <file> until its text matches <regex>; prints the file's tail.
import { readFileSync, existsSync } from 'node:fs';
const [file, re, max = '540'] = process.argv.slice(2);
const rx = new RegExp(re);
const t0 = Date.now();
let txt = '';
while (Date.now() - t0 < +max * 1000) {
  txt = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (rx.test(txt)) break;
  await new Promise(r => setTimeout(r, 10000));
}
console.log((rx.test(txt) ? 'MATCHED' : 'TIMED OUT') + ' after ' + Math.round((Date.now() - t0) / 1000) + 's');
console.log(txt.split('\n').slice(-12).join('\n'));
