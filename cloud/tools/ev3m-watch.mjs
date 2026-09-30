// Prints one line when each ev3m artefact appears; exits when all named ones exist.
import { existsSync, readFileSync } from 'node:fs';
const want = process.argv.slice(2);
const seen = new Set();
for (;;) {
  for (const f of want) if (!seen.has(f) && existsSync(f)) {
    seen.add(f);
    let t = '';
    try { t = readFileSync(f, 'utf8').slice(0, 300).replace(/\n/g, ' '); } catch {}
    console.log('READY ' + f + ' ' + t);
  }
  if (seen.size === want.length) process.exit(0);
  await new Promise(r => setTimeout(r, 15000));
}
