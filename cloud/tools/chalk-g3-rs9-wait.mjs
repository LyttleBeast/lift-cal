// Wait until a file contains a string (or a timeout), then exit. No shell loop.
// Usage: node chalk-g3-rs9-wait.mjs <file> <needle> [timeoutSec=1800]
import { readFileSync } from 'node:fs';
const [f, needle, t = '1800'] = process.argv.slice(2);
const end = Date.now() + +t * 1000;
for (;;) {
  let s = ''; try { s = readFileSync(f, 'utf8'); } catch {}
  if (s.includes(needle)) { console.log('found: ' + s.split('\n').filter(l => l.includes(needle)).join(' | ')); process.exit(0); }
  if (Date.now() > end) { console.log('timeout'); process.exit(1); }
  await new Promise(r => setTimeout(r, 10000));
}
