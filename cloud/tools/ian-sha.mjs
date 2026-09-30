// sha256 + bytes of files: node ian-sha.mjs <abs paths...>
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
for (const p of process.argv.slice(2)) {
  try { const b = readFileSync(p); console.log(createHash('sha256').update(b).digest('hex'), String(b.length).padStart(7), p); }
  catch { console.log('MISSING', p); }
}
