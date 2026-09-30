// E1 inventory: print lines of a CSS file matching a regex, with the enclosing selector.
// usage: node e1-inv.mjs <file> <regex> [flags]
import { readFileSync } from 'node:fs';
const [file, pat, flags = ''] = process.argv.slice(2);
const re = new RegExp(pat, flags);
const lines = readFileSync(file, 'utf8').split('\n');
let sel = '';
lines.forEach((l, i) => {
  if (/\{\s*$/.test(l) || /\{/.test(l)) { const s = l.split('{')[0].trim(); if (s) sel = s; }
  if (re.test(l)) console.log(String(i + 1).padStart(5) + '  [' + sel.slice(0, 60) + ']  ' + l.trim().slice(0, 200));
});
