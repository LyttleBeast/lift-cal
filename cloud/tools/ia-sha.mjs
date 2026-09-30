// Print sha256 + size for the given files (iron-age native builder helper).
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, statSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  if (!existsSync(f)) { console.log('MISSING', f); continue; }
  const b = readFileSync(f);
  console.log(createHash('sha256').update(b).digest('hex').slice(0, 16), String(b.length).padStart(7), f, new Date(statSync(f).mtimeMs).toISOString());
}
