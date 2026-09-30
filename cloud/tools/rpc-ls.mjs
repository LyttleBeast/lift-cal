// Re-prove Chalk helper: list a directory (names, sizes, mtimes), optional filter substring.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const [dir, filt] = process.argv.slice(2);
const rows = readdirSync(dir).filter(n => !filt || n.includes(filt)).map(n => {
  const s = statSync(join(dir, n));
  return [s.mtime.toISOString(), s.isDirectory() ? 'd' : String(s.size), n];
}).sort((a, b) => a[0] < b[0] ? -1 : 1);
for (const r of rows) console.log(r.join('\t'));
