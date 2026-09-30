#!/usr/bin/env node
/* rv2-snat-grep — print lines of <file> matching <regex> (JS, flags 'i' optional via 3rd arg), with line numbers.
 * Usage: node rv2-snat-grep.mjs <file> <regex> [flags] [maxLines]
 */
import { readFileSync } from 'node:fs';
const [file, re, flags = '', max = '400'] = process.argv.slice(2);
const rx = new RegExp(re, flags);
const lines = readFileSync(file, 'utf8').split('\n');
let n = 0;
lines.forEach((l, i) => { if (rx.test(l) && n++ < +max) console.log((i + 1) + ': ' + l.slice(0, 300)); });
console.log('(' + n + ' matches of ' + lines.length + ' lines)');
