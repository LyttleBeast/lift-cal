// list a directory (names, sizes, mtimes), optionally filtered by a substring
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const [dir, filt] = process.argv.slice(2);
for (const n of readdirSync(dir).sort()) {
  if (filt && !n.includes(filt)) continue;
  const s = statSync(join(dir, n));
  console.log((s.isDirectory() ? 'd ' : 'f ') + n + ' ' + s.size + ' ' + s.mtime.toISOString());
}
