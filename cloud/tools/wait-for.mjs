// Wait until a file contains a regex (or maxMs passes), then print its last lines.
// Usage: node wait-for.mjs <file> <regex> [maxMs=540000]
import { readFileSync } from 'node:fs';
const [f, re, max = '540000'] = process.argv.slice(2);
const t0 = Date.now(), R = new RegExp(re, 'm');
for (;;) {
  let s = '';
  try { s = readFileSync(f, 'utf8'); } catch {}
  if (R.test(s) || Date.now() - t0 > +max) { console.log((R.test(s) ? 'MATCHED' : 'TIMEOUT') + '\n' + s.split('\n').slice(-15).join('\n')); break; }
  await new Promise(r => setTimeout(r, 5000));
}
