// Emit each new line of a run-verifiers output file; exit when all three zones have reported.
// usage: node s-nat-fix1-wait.mjs <output file> [zones=3]
import fs from 'node:fs';
const [file, n = '3'] = process.argv.slice(2);
let seen = 0;
for (;;) {
  let lines = [];
  try { lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean); } catch {}
  for (const l of lines.slice(seen)) console.log(l);
  seen = Math.max(seen, lines.length);
  if (lines.filter(l => /^nat \S+: syntax/.test(l)).length >= +n) process.exit(0);
  await new Promise(r => setTimeout(r, 5000));
}
