// Concept A helper: recursive listing of files matching a regex under a dir.
// usage: node oxA-ls.mjs <dir> [regex] [maxDepth]
import fs from 'node:fs';
import path from 'node:path';
const [dir, re = '.', maxD = '4'] = process.argv.slice(2);
const rx = new RegExp(re, 'i');
const walk = (d, depth) => {
  let ents = [];
  try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (depth < +maxD) walk(p, depth + 1); }
    else if (rx.test(p)) { const s = fs.statSync(p); console.log(s.size, p); }
  }
};
walk(dir, 0);
