// List a directory's entries (name, size), optionally filtered by a substring. Read-only.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const [dir, filt] = process.argv.slice(2);
for (const n of readdirSync(dir).sort()) {
  if (filt && !n.includes(filt)) continue;
  let s = '';
  try { const st = statSync(join(dir, n)); s = st.isDirectory() ? '/' : ' ' + st.size; } catch { s = ' ?'; }
  console.log(n + s);
}
