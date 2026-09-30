// headings.mjs — print a markdown file's headings with line numbers (no grep/sed allowed).
// Usage: node headings.mjs <file> [maxLevel=4]
import { readFileSync } from 'node:fs';
const [file, max = '4'] = process.argv.slice(2);
const lines = readFileSync(file, 'utf8').split('\n');
let inFence = false;
lines.forEach((l, i) => {
  if (/^```/.test(l)) inFence = !inFence;
  if (inFence) return;
  const m = /^(#{1,6})\s/.exec(l);
  if (m && m[1].length <= +max) console.log(`${i + 1}\t${l}`);
});
console.log(`-- ${lines.length} lines`);
