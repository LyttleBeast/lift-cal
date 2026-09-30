// ev3n-ctx.mjs — print a few lines around file:line pairs (read-only).
//   node ev3n-ctx.mjs <tree> <before> <after> file:line …
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const [tree, b, a, ...pairs] = process.argv.slice(2);
for (const p of pairs) {
  const i = p.lastIndexOf(':');
  const f = p.slice(0, i), n = +p.slice(i + 1);
  const lines = readFileSync(join(tree, f), 'utf8').split('\n');
  console.log('==== ' + p);
  for (let k = Math.max(1, n - +b); k <= Math.min(lines.length, n + +a); k++) console.log(String(k).padStart(5) + (k === n ? '> ' : '  ') + lines[k - 1]);
}
