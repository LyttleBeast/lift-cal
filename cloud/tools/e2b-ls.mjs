// e2b-ls.mjs <dir...> — list a directory's entries with size and mtime (no shell ls).
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
for (const d of process.argv.slice(2)) {
  console.log('== ' + d);
  for (const f of readdirSync(d).sort()) {
    try { const s = statSync(join(d, f)); console.log((s.isDirectory() ? 'd ' : '- ') + String(s.size).padStart(9) + '  ' + s.mtime.toISOString().slice(0, 19) + '  ' + f); }
    catch (e) { console.log('? ' + f + ' ' + e.message); }
  }
}
