// Tiny grep for the Oxblood web agent: node oxw-grep.mjs <regex> <file...>
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const [re, ...files] = process.argv.slice(2);
const R = new RegExp(re);
const walk = p => statSync(p).isDirectory() ? readdirSync(p).flatMap(f => walk(join(p, f))) : [p];
for (const f of files.flatMap(walk)) {
  let lines;
  try { lines = readFileSync(f, 'utf8').split('\n'); } catch { continue; }
  lines.forEach((l, i) => { if (R.test(l)) console.log(`${f}:${i + 1}: ${l.length > 300 ? l.slice(0, 300) + '…' : l}`); });
}
