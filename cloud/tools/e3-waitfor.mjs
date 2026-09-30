// e3-waitfor.mjs <file> <substring> [timeoutSec] — print the file when it contains <substring> (or on timeout), then exit.
import { existsSync, readFileSync } from 'node:fs';
const [file, needle, t = '580'] = process.argv.slice(2);
const end = Date.now() + (+t) * 1000;
const tick = () => {
  const s = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (s.includes(needle)) { console.log(s); process.exit(0); }
  if (Date.now() > end) { console.log('TIMEOUT; so far:\n' + s); process.exit(1); }
  setTimeout(tick, 5000);
};
tick();
