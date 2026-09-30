// wait-log.mjs <file> <regex> [maxSeconds=580] — poll a log until it matches; print its tail.
import { readFileSync } from 'node:fs';
const [f, re, max = '580'] = process.argv.slice(2);
const rx = new RegExp(re, 'm');
const t0 = Date.now();
for (;;) {
  let s = '';
  try { s = readFileSync(f, 'utf8'); } catch {}
  if (rx.test(s) || Date.now() - t0 > +max * 1000) { console.log((rx.test(s) ? 'MATCH' : 'TIMEOUT') + '\n' + s.slice(-1500)); break; }
  await new Promise(r => setTimeout(r, 10000));
}
