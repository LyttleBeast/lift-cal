// ev2w-tail.mjs — print the last N lines of a file (no tail allowed).
// Usage: node ev2w-tail.mjs <file> [n=40] [maxCols=400]
import { readFileSync } from 'node:fs';
const [f, n = '40', w = '400'] = process.argv.slice(2);
const lines = readFileSync(f, 'utf8').split('\n');
for (const l of lines.slice(-(+n))) console.log(l.slice(0, +w));
