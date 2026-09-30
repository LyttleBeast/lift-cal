// rt2-find: print lines matching a regex in files under a directory (recursive), read-only.
//   node rt2-find.mjs <dir> <regex> [fileRegex] [maxHits]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const [dir, pat, fpat, maxS] = process.argv.slice(2);
const re = new RegExp(pat), fre = fpat ? new RegExp(fpat) : null, max = Number(maxS || 200);
let hits = 0;
const walk = d => {
  for (const n of readdirSync(d)) {
    if (hits >= max) return;
    const p = join(d, n);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { if (n === 'node_modules' && d !== dir) continue; walk(p); continue; }
    if (fre && !fre.test(p)) continue;
    if (st.size > 3e6) continue;
    const lines = readFileSync(p, 'utf8').split('\n');
    lines.forEach((l, i) => { if (hits < max && re.test(l)) { hits++; console.log(p + ':' + (i + 1) + ': ' + l.slice(0, 240)); } });
  }
};
walk(dir);
