// Pweb fixer round 2: follow a log file, print each new line that matches
// a pattern, exit when a line matches the end pattern (or the file's writer is
// gone and nothing new came for a while).
//   node pwr2-watch.mjs <file> <matchRegex> <endRegex> [pidToWatch]
import { readFileSync, existsSync } from 'node:fs';
const [file, match, end, pid] = process.argv.slice(2);
const M = new RegExp(match), E = new RegExp(end);
let seen = 0, idle = 0;
const alive = p => { try { process.kill(+p, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
for (;;) {
  const txt = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const lines = txt.split('\n');
  const full = txt.endsWith('\n') ? lines.length - 1 : lines.length - 1;
  let got = false;
  for (let i = seen; i < full; i++) {
    const l = lines[i];
    if (M.test(l) || E.test(l)) console.log(l);
    if (E.test(l)) process.exit(0);
    got = true;
  }
  seen = Math.max(seen, full);
  idle = got ? 0 : idle + 1;
  if (pid && !alive(pid) && idle > 5) { console.log('writer ' + pid + ' is gone'); process.exit(1); }
  await new Promise(r => setTimeout(r, 2000));
}
