// For each line of <file> matching <regex>, print the nearest preceding selector line (a line containing '{').
import fs from 'node:fs';
const [f, re] = process.argv.slice(2);
const L = fs.readFileSync(f, 'utf8').split('\n');
const R = new RegExp(re);
L.forEach((l, i) => {
  if (!R.test(l)) return;
  let j = i; while (j >= 0 && !L[j].includes('{')) j--;
  console.log((i + 1) + ' <- ' + (j + 1) + ': ' + (L[j] || '').trim().slice(0, 110));
});
