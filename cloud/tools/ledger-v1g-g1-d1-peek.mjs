// Ledger v1 gate (g1-d1): print lines of a log matching a regex (no shell pipes).
// Usage: node ledger-v1g-g1-d1-peek.mjs <file> <regex> [max=80]
import { readFileSync } from 'node:fs';
const [file, re, max = '80'] = process.argv.slice(2);
const R = new RegExp(re, 'i');
const lines = readFileSync(file, 'utf8').split('\n');
const hit = lines.filter(l => R.test(l));
console.log(file + ': ' + lines.length + ' lines, ' + hit.length + ' match');
console.log(hit.slice(0, +max).join('\n'));
