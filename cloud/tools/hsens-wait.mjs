// Wait until a file contains a line matching a regex (checked every 2s), print
// the lines after `--from` that match `--show`, exit 0; exit 1 on timeout.
//   node hsens-wait.mjs <file> <regex> [--timeout 600] [--from <line no>] [--show <regex>]
import { readFileSync, existsSync } from 'node:fs';
const [file, re, ...rest] = process.argv.slice(2);
const opt = k => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : null; };
const timeout = +(opt('timeout') || 600) * 1000, from = +(opt('from') || 0);
const show = new RegExp(opt('show') || '.');
const R = new RegExp(re);
const t0 = Date.now();
const tick = () => {
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n').slice(from) : [];
  if (lines.some(l => R.test(l))) { console.log(lines.filter(l => show.test(l)).join('\n')); process.exit(0); }
  if (Date.now() - t0 > timeout) { console.log('timeout; last: ' + lines.slice(-3).join(' | ')); process.exit(1); }
  setTimeout(tick, 2000);
};
tick();
