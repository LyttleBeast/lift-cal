// Print matching lines (with line numbers) of one or more files. No context.
// Usage: node grepfile.mjs <regex> <file> [file...]
import { readFileSync } from 'node:fs';
const [pat, ...files] = process.argv.slice(2);
const re = new RegExp(pat, 'i');
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => { if (re.test(l)) console.log(`${f.split('/').pop()}:${i + 1}: ${l.slice(0, 240)}`); });
}
