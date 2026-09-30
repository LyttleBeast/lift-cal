// Waits (at most argv[3] seconds) for a line containing argv[4] in file argv[2]; prints the file's tail.
import { existsSync, readFileSync } from 'node:fs';
const [f, secs, needle] = process.argv.slice(2);
const t0 = Date.now();
for (;;) {
  const t = existsSync(f) ? readFileSync(f, 'utf8') : '';
  if (t.includes(needle) || Date.now() - t0 > secs * 1000) { console.log(t.trimEnd().split('\n').slice(-12).join('\n') || '(empty)'); break; }
  await new Promise(r => setTimeout(r, 15000));
}
