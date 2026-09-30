// ls8b.mjs — list a directory (track 8b helper; no shell ls allowed).
// Usage: node ls8b.mjs <dir>
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const d = process.argv[2];
try {
  for (const f of readdirSync(d)) {
    const s = statSync(join(d, f));
    console.log((s.isDirectory() ? 'd ' : 'f ') + String(s.size).padStart(10) + '  ' + f);
  }
} catch (e) { console.log('ERR ' + e.message); }
