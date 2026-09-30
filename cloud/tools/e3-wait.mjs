// e3-wait.mjs <file> [timeoutSec] — print one line when <file> exists (or on timeout), then exit.
import { existsSync } from 'node:fs';
const [file, t = '1700'] = process.argv.slice(2);
const end = Date.now() + (+t) * 1000;
const tick = () => {
  if (existsSync(file)) { console.log('READY ' + file); process.exit(0); }
  if (Date.now() > end) { console.log('TIMEOUT waiting for ' + file); process.exit(1); }
  setTimeout(tick, 5000);
};
tick();
