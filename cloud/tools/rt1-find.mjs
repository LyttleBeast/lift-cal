// rt1-find: search files under a directory for a regex (read-only). Usage:
//   node rt1-find.mjs <dir> <regex> [extRegex] [maxHits]
import fs from 'node:fs';
import path from 'node:path';
const [dir, re, ext = '\\.(js|jsx|ts|tsx|mjs|cjs)$', max = '80'] = process.argv.slice(2);
const R = new RegExp(re), E = new RegExp(ext);
let hits = 0;
function walk(d) {
  let ents;
  try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (hits >= +max) return;
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name === '.git') continue; walk(p); }
    else if (E.test(e.name)) {
      let s; try { s = fs.readFileSync(p, 'utf8'); } catch { continue; }
      const lines = s.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (R.test(lines[i])) { console.log(p + ':' + (i + 1) + ': ' + lines[i].slice(0, 220)); if (++hits >= +max) return; }
      }
    }
  }
}
walk(dir);
console.log('hits', hits);
