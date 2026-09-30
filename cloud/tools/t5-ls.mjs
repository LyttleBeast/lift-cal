// Track 5 helper: list a directory (non-recursive, or recursive with -r), with sizes.
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const rec = args[0] === '-r';
const dir = rec ? args[1] : args[0];
function walk(d, depth) {
  let ents;
  try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { console.log('ERR', d, e.code); return; }
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(d, e.name);
    const st = fs.lstatSync(p);
    console.log('  '.repeat(depth) + (e.isDirectory() ? e.name + '/' : e.name + '  ' + st.size));
    if (rec && e.isDirectory() && e.name !== 'node_modules' && depth < 4) walk(p, depth + 1);
  }
}
walk(dir, 0);
