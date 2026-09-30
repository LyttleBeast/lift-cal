#!/usr/bin/env node
/* fx-snat-grep — print lines matching a regex in given files, with numbers.
   node fx-snat-grep.mjs '<regex>' file... [--ctx N] */
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2);
let ctx = 0;
const ci = args.indexOf('--ctx');
if (ci >= 0) { ctx = +args[ci + 1]; args.splice(ci, 2); }
const re = new RegExp(args[0]);
for (const f of args.slice(1)) {
  const lines = readFileSync(f, 'utf8').split('\n');
  const show = new Set();
  lines.forEach((l, i) => { if (re.test(l)) for (let k = i - ctx; k <= i + ctx; k++) if (k >= 0 && k < lines.length) show.add(k); });
  [...show].sort((a, b) => a - b).forEach(k => console.log(f.split('/').pop() + ':' + (k + 1) + ': ' + lines[k]));
}
