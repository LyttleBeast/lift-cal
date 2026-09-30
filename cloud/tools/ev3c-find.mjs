// ev3c-find.mjs <regex> <file>... : print file:line:text for each match (read-only).
import { readFileSync } from 'node:fs';
const [re, ...files] = process.argv.slice(2);
const rx = new RegExp(re, 'i');
for (const f of files) {
  let t; try { t = readFileSync(f, 'utf8'); } catch (e) { console.log(`${f}: unreadable`); continue; }
  t.split('\n').forEach((l, i) => { if (rx.test(l)) console.log(`${f}:${i + 1}: ${l.length > 220 ? l.slice(0, 220) + '…' : l}`); });
}
