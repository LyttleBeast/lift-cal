// Iron Age v1 gate (rs10): wait up to <mins> minutes, or until every named
// background output file has changed its "done" state, then print each file's tail.
// Usage: node ia-rs10-v1-poll.mjs <mins> <file>[,<file>…] [doneRegex]
import { readFileSync, existsSync } from 'node:fs';
const [mins, files, re] = process.argv.slice(2);
const list = files.split(',');
const done = new RegExp(re || '(verdict|IDENTICAL|DIFFERENT|INCOMPLETE|DIRTY|passed, \\d+ failed|zone .* \\d+/\\d+|exit|PASS|FAIL)', 'i');
const t0 = Date.now();
const read = f => { try { return existsSync(f) ? readFileSync(f, 'utf8') : ''; } catch { return ''; } };
while (Date.now() - t0 < +mins * 60e3) {
  if (list.every(f => done.test(read(f).slice(-3000)))) break;
  await new Promise(r => setTimeout(r, 10000));
}
for (const f of list) console.log('== ' + f.split('/').pop() + '\n' + read(f).slice(-1500));
