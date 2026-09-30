// Concept A (iron-age) helper: print the heading map (line numbers) of research files.
import fs from 'node:fs';
const files = process.argv.slice(2);
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  console.log(`== ${f} (${lines.length} lines)`);
  lines.forEach((l, i) => { if (/^#{1,4} /.test(l)) console.log(`${i + 1}: ${l.slice(0, 110)}`); });
}
