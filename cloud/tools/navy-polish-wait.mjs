// Waits (up to argv[3] seconds) until the file argv[2] contains the harness's final summary, then prints its tail.
import { readFileSync, existsSync } from 'node:fs';
const [file, secs = '540'] = process.argv.slice(2);
const end = Date.now() + +secs * 1000;
const done = s => /\bshot \d+|errors? \d+|\[exited with code|Error:/i.test(s);
for (;;) {
  const s = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (done(s) || Date.now() > end) { console.log(s.split('\n').filter(l => !l.startsWith('lock: waiting')).slice(-25).join('\n')); break; }
  await new Promise(r => setTimeout(r, 15000));
}
