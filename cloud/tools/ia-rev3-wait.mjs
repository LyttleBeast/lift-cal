// Waits until a file contains a pattern (or the timeout passes), then prints
// the file's tail. Read-only. Usage: node ia-rev3-wait.mjs <file> <regex> [maxSeconds]
import { readFileSync } from 'node:fs';
const [file, re, max = '600'] = process.argv.slice(2);
const rx = new RegExp(re, 'm');
const end = Date.now() + (+max) * 1000;
const read = () => { try { return readFileSync(file, 'utf8'); } catch { return ''; } };
while (Date.now() < end) {
  const s = read();
  if (rx.test(s)) { console.log(s.slice(-2500)); process.exit(0); }
  await new Promise(r => setTimeout(r, 5000));
}
console.log('TIMEOUT\n' + read().slice(-2500));
