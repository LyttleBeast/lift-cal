// mdF-ls.mjs — list a directory (names, sizes) without shelling out to ls.
// Usage: node mdF-ls.mjs <dir> [<dir> …]   (read-only)
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
for (const d of process.argv.slice(2)) {
  console.log('== ' + d);
  let names = [];
  try { names = readdirSync(d); } catch (e) { console.log('  (' + e.code + ')'); continue; }
  for (const n of names.sort()) {
    let s; try { s = statSync(join(d, n)); } catch { s = null; }
    console.log('  ' + (s && s.isDirectory() ? n + '/' : n) + (s && !s.isDirectory() ? '  ' + s.size : ''));
  }
}
