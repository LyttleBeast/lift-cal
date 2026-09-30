// Lists a directory with sizes, and PNG dimensions (judge rs9 r1).
import fs from 'node:fs'; import path from 'node:path';
const d = process.argv[2];
for (const f of fs.readdirSync(d).sort()) {
  const p = path.join(d, f); const st = fs.statSync(p);
  let dim = '';
  if (f.endsWith('.png')) { const b = fs.readFileSync(p); dim = b.readUInt32BE(16) + 'x' + b.readUInt32BE(20); }
  console.log(f, st.size, dim);
}
