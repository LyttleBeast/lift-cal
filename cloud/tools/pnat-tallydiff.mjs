// pnat-tallydiff.mjs — for every verifier in both run dirs (one zone), its last tally line, and where they differ.
//   node pnat-tallydiff.mjs <baseRunDir> <runDir> <zoneSlug>
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [baseDir, runDir, zone] = process.argv.slice(2);
const strip = s => s.replace(/\x1b\[[0-9;]*m/g, '');
const tally = f => {
  const ls = strip(readFileSync(f, 'utf8')).split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = ls.length - 1; i >= 0; i--) {
    const l = ls[i];
    if (/\d+\s+passed,\s+\d+\s+failed/i.test(l) || /\b\d+\s+checks?\b/i.test(l) || /\d+\s*\/\s*\d+/.test(l) || /\bok:?\s*\d+/i.test(l)) return l.slice(0, 160);
  }
  return '(last) ' + (ls.pop() || '').slice(0, 160);
};
const logs = readdirSync(join(runDir, zone)).filter(f => f.endsWith('.log')).sort();
let same = 0, diff = 0;
for (const f of logs) {
  const b = join(baseDir, zone, f);
  if (!existsSync(b)) continue;
  const tb = tally(b), tr = tally(join(runDir, zone, f));
  if (tb === tr) same++;
  else { diff++; console.log(`${f}\n   base:   ${tb}\n   engine: ${tr}`); }
}
console.log(`${same} verifiers with the same tally line, ${diff} different (of those in both)`);
