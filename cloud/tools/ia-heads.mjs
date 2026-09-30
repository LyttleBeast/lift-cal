// Print markdown headings (with line numbers) of a file, or lines matching a regex.
// usage: node ia-heads.mjs <file> [regex]
import { readFileSync } from 'node:fs';
const [f, re] = process.argv.slice(2);
const rx = re ? new RegExp(re, 'i') : /^#{1,4} /;
readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (rx.test(l)) console.log(String(i + 1).padStart(5), l.slice(0, 200)); });
