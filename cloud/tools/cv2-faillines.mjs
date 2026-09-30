// Print the failing lines (and a little context) of the named verifier logs.
// usage: node cv2-faillines.mjs <logDir> <name.mjs> ...
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const [dir, ...names] = process.argv.slice(2);
for (const n of names) {
  const f = join(dir, n.replace(/\.mjs$/, '') + '.log');
  let t; try { t = readFileSync(f, 'utf8'); } catch { t = readFileSync(join(dir, n + '.log'), 'utf8'); }
  const L = t.split('\n');
  console.log('==== ' + n + ' (' + L.length + ' lines)');
  const hits = [];
  L.forEach((l, i) => { if (/FAIL|✗|Error|error:|failed|not ok/i.test(l)) hits.push(i); });
  for (const i of hits.slice(0, 12)) console.log(L.slice(i, i + 3).map(s => '  ' + s.slice(0, 400)).join('\n'));
  if (!hits.length) console.log(L.slice(-15).join('\n'));
}
