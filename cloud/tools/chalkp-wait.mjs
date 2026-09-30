// Wait until the shoot's output file shows a terminal line, then print it.
import fs from 'node:fs';
const f = process.argv[2];
const re = /shot \d+|error|Error|FAIL|exited|done/;
for (;;) {
  let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch {}
  const l = t.split('\n').filter(x => re.test(x));
  if (l.length) { console.log(l.slice(-3).join(' | ')); process.exit(0); }
  await new Promise(r => setTimeout(r, 15000));
}
