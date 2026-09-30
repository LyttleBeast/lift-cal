// Print line numbers of markdown headings (## and ###) in the given files, plus total line count.
import fs from 'node:fs';
for (const f of process.argv.slice(2)) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  console.log(`== ${f} (${lines.length} lines)`);
  lines.forEach((l, i) => { if (/^#{1,3} /.test(l)) console.log(`${i + 1}: ${l.slice(0, 110)}`); });
}
