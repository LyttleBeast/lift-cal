// rpchalk: print the selector (the nearest line above with '{') for each given line of a file.
//   node rpchalk-ctx.mjs <file> <line,line,…>
import { readFileSync } from 'node:fs';
const [file, lines] = process.argv.slice(2);
const L = readFileSync(file, 'utf8').split('\n');
for (const n of lines.split(',').map(Number)) {
  let i = n - 1;
  while (i >= 0 && !L[i].includes('{')) i--;
  console.log(n + ': ' + (L[i] || '').trim().slice(0, 160) + '  ||  ' + L[n - 1].trim().slice(0, 120));
}
