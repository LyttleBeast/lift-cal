// watchlog.mjs — follow a log file without tail/grep: print each new line that
// matches <show>, and exit once a line matches <end>.
//   node watchlog.mjs <file> <showRegex> [endRegex=VERDICT|FAILED] [pollMs=2000]
import { existsSync, readFileSync } from 'node:fs';
const [file, show, end = 'VERDICT|FAILED|harness FATAL', poll = '2000'] = process.argv.slice(2);
const S = new RegExp(show), E = new RegExp(end);
let seen = 0;
for (;;) {
  if (existsSync(file)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    const complete = lines.slice(0, -1);
    for (const l of complete.slice(seen)) {
      if (S.test(l) || E.test(l)) console.log(l);
      if (E.test(l)) process.exit(0);
    }
    seen = complete.length;
  }
  await new Promise(r => setTimeout(r, +poll));
}
