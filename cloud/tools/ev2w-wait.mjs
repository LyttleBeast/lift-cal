// ev2w-wait.mjs <file> <regex> [maxMin=40] — poll a log until a line matches, print it, exit.
import { readFileSync, existsSync } from 'node:fs';
const [f, pat, max = '40'] = process.argv.slice(2);
const re = new RegExp(pat);
const t0 = Date.now();
for (;;) {
  if (existsSync(f)) {
    const hit = readFileSync(f, 'utf8').split('\n').filter(l => re.test(l));
    if (hit.length) { console.log(hit.join('\n').slice(0, 2000)); process.exit(0); }
  }
  if (Date.now() - t0 > +max * 60e3) { console.log('TIMEOUT waiting for ' + pat); process.exit(1); }
  await new Promise(r => setTimeout(r, 15000));
}
