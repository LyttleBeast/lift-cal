// Synthesis helper: print lines of a file matching a regex (with line numbers).
// Usage: node synth-extract.mjs <file> <regex> [flags]
import { readFileSync } from 'node:fs';
const [, , file, pat, flags = ''] = process.argv;
const re = new RegExp(pat, flags);
const lines = readFileSync(file, 'utf8').split('\n');
lines.forEach((l, i) => { if (re.test(l)) console.log(String(i + 1).padStart(5) + ': ' + l); });
console.log('-- total lines: ' + lines.length);
