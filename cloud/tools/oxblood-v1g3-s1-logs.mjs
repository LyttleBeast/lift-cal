// Oxblood v1 gate (round 2-s1, fresh): print lines of verifier logs matching a
// regex (plus the pass/fail tail). Usage: node oxblood-v1g3-s1-logs.mjs <dir> <regex> <file>[,<file>…]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const [dir, re, files] = process.argv.slice(2);
const R = new RegExp(re);
for (const f of (files || readdirSync(dir).join(',')).split(',')) {
  let t; try { t = readFileSync(join(dir, f), 'utf8'); } catch (e) { console.log('== ' + f + ' ' + e.code); continue; }
  const L = t.split('\n');
  console.log('== ' + f + ' (' + L.length + ' lines)');
  for (const l of L) if (R.test(l)) console.log(l);
  console.log(L.filter(l => /passed|failed|exit|✗|FAIL/i.test(l)).slice(-4).join('\n'));
}
