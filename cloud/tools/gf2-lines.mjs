// Print line ranges from files, read-only. Usage: node gf2-lines.mjs <root> <file:from-to> ...
// Written for the 08b gap-fill resume (critic round), to check code sites cited in G3.
import fs from 'node:fs';
import path from 'node:path';
const [root, ...specs] = process.argv.slice(2);
for (const s of specs) {
  const m = s.match(/^(.*):(\d+)-(\d+)$/);
  if (!m) { console.log('bad spec', s); continue; }
  const [, f, a, b] = m;
  let lines;
  try { lines = fs.readFileSync(path.join(root, f), 'utf8').split('\n'); }
  catch (e) { console.log('== ' + f + ' ERR ' + e.message); continue; }
  console.log('== ' + f + ' (' + lines.length + ' lines)');
  for (let i = +a; i <= +b && i <= lines.length; i++) console.log(i + ': ' + lines[i - 1].slice(0, 170));
}
