// ev3k: list a directory (no ls allowed). Usage: node ev3k-ls.mjs <dir> [filter]
import fs from 'node:fs';
import path from 'node:path';
const [dir, filt] = process.argv.slice(2);
for (const n of fs.readdirSync(dir).sort()) {
  if (filt && !n.includes(filt)) continue;
  const st = fs.statSync(path.join(dir, n));
  console.log((st.isDirectory() ? 'd ' : 'f ') + n + (st.isDirectory() ? '' : ' ' + st.size) + ' ' + st.mtime.toISOString());
}
