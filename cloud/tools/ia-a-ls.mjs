// Concept A (iron-age): list a directory recursively (names + sizes), depth-limited.
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
const depth = Number(process.argv[3] || 2);
function walk(d, n) {
  let ents;
  try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { console.log('ERR', d, e.code); return; }
  for (const e of ents) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { console.log(p + '/'); if (n > 1) walk(p, n - 1); }
    else console.log(p, fs.statSync(p).size);
  }
}
walk(root, depth);
