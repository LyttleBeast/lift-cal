// Delete the lines from the first one containing <start> through the first
// line after it that equals <end> (trimmed). Prints what it removed.
// Usage: node ev2n-cut.mjs <file> <start> <end>
import { readFileSync, writeFileSync } from 'node:fs';
const [file, start, end] = process.argv.slice(2);
const L = readFileSync(file, 'utf8').split('\n');
const a = L.findIndex(l => l.includes(start));
if (a < 0) { console.log('start not found'); process.exit(1); }
let b = a;
while (b < L.length && L[b].trim() !== end) b++;
if (b >= L.length) { console.log('end not found'); process.exit(1); }
console.log('removing lines ' + (a + 1) + '-' + (b + 1) + ':\n' + L.slice(a, b + 1).join('\n'));
L.splice(a, b - a + 1);
writeFileSync(file, L.join('\n'));
