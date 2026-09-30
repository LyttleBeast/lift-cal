import { readFileSync } from 'node:fs';
const [file, ...pats] = process.argv.slice(2);
const lines = readFileSync(file, 'utf8').split('\n');
lines.forEach((l, i) => { if (pats.some(p => new RegExp(p, 'i').test(l))) console.log(i + 1 + ': ' + l.slice(0, 220)); });
