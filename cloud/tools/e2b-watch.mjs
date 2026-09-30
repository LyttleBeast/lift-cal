// e2b-watch.mjs <file> <showRegex> <endRegex> [maxMinutes=30] — poll a log file every 5s,
// print each new line matching showRegex, exit 0 when a line matches endRegex (or 3 on timeout).
import { readFileSync, existsSync } from 'node:fs';
const [file, show, end, maxMin = '30'] = process.argv.slice(2);
const S = new RegExp(show), E = new RegExp(end);
let seen = 0;
const t0 = Date.now();
for (;;) {
  if (existsSync(file)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    const done = lines.length - 1;
    for (let i = seen; i < done; i++) {
      if (S.test(lines[i])) console.log(lines[i]);
      if (E.test(lines[i])) process.exit(0);
    }
    seen = Math.max(seen, done);
  }
  if (Date.now() - t0 > +maxMin * 60e3) { console.log('watch timeout'); process.exit(3); }
  await new Promise(r => setTimeout(r, 5000));
}
