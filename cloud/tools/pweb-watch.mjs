// pweb-watch.mjs <file> <eventRegex> <endRegex> — print each new line of <file>
// matching eventRegex (one event per line); exit when a line matches endRegex.
// Polls once a second; tolerates the file not existing yet.
import { readFileSync, existsSync } from 'node:fs';
const [file, ev, end] = process.argv.slice(2);
const E = new RegExp(ev), X = new RegExp(end);
let seen = 0;
for (;;) {
  if (existsSync(file)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    const done = lines.length - 1;   // the last piece may be a partial line
    for (let i = seen; i < done; i++) {
      const l = lines[i];
      if (E.test(l) || X.test(l)) console.log(l.slice(0, 600));
      if (X.test(l)) process.exit(0);
    }
    seen = Math.max(seen, done);
  }
  await new Promise(r => setTimeout(r, 1000));
}
