// Wait until a file contains a pattern (or the timeout passes), then print its last lines.
// Usage: node ia-g4-rs10-wait.mjs <file> <regex> [maxMinutes=28]
import { readFileSync } from 'node:fs';
const [f, re, mins = '28'] = process.argv.slice(2);
const R = new RegExp(re), end = Date.now() + mins * 60e3;
for (;;) {
  let t = '';
  try { t = readFileSync(f, 'utf8'); } catch {}
  if (R.test(t) || Date.now() > end) { console.log((R.test(t) ? 'MATCHED ' : 'TIMEOUT ') + f); console.log(t.trimEnd().split('\n').slice(-15).join('\n')); break; }
  await new Promise(r => setTimeout(r, 20000));
}
