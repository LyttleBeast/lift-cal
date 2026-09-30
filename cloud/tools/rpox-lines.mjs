// rpox: print lines around given line numbers of a file.
//   node rpox-lines.mjs <file> <before> <after> <n> [<n> …]
import { readFileSync } from 'node:fs';
const [file, before, after, ...ns] = process.argv.slice(2);
const L = readFileSync(file, 'utf8').split('\n');
for (const n of ns.map(Number)) {
  console.log('--- ' + n);
  for (let i = Math.max(1, n - +before); i <= Math.min(L.length, n + +after); i++) console.log(i + ': ' + L[i - 1]);
}
