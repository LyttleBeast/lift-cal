// pnat-suite-sum.mjs — a run-verifiers output dir against the night's baseline dir:
// the count per zone, what failed, which verifiers are new, and each new one's tally.
//   node pnat-suite-sum.mjs <baselineDir> <runDir>
import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const [baseDir, runDir] = process.argv.slice(2);
const B = JSON.parse(readFileSync(join(baseDir, 'summary.json'), 'utf8'));
const S = JSON.parse(readFileSync(join(runDir, 'summary.json'), 'utf8'));
const tally = txt => {
  const ls = txt.split('\n');
  for (let i = ls.length - 1; i >= 0; i--) {
    const l = ls[i].replace(/\x1b\[[0-9;]*m/g, '').trim();
    let m;
    if ((m = /(\d+)\s+passed,\s+(\d+)\s+failed/i.exec(l))) return `${m[1]} passed, ${m[2]} failed`;
    if ((m = /(\d+)\s*\/\s*(\d+)\s+(checks|passed|ok)/i.exec(l))) return l;
    if ((m = /\b(\d+)\s+checks?\b/i.exec(l))) return l;
  }
  return '(no tally line) last: ' + (ls.filter(Boolean).slice(-1)[0] || '').slice(0, 120);
};
console.log(`run ${S.repo}  ${S.startedAt} -> ${S.finishedAt}`);
console.log(`base ${B.repo}  ${B.startedAt} -> ${B.finishedAt}`);
for (const [z, v] of Object.entries(S.zones)) {
  const slug = z.replace(/\//g, '_');
  const bz = B.zones[z];
  const runNames = Object.keys(v.ms).sort();
  const baseNames = bz ? Object.keys(bz.ms).sort() : [];
  const added = runNames.filter(n => !baseNames.includes(n));
  const gone = baseNames.filter(n => !runNames.includes(n));
  console.log(`\n== ${z}: ${v.pass}/${v.total} pass; fail ${JSON.stringify(v.fail.map(f => basename(f.f) + '=' + f.code))}; baseline ${bz ? bz.pass + '/' + bz.total : 'n/a'}`);
  console.log(`   new (${added.length}): ${added.map(n => basename(n)).join(', ')}`);
  console.log(`   gone (${gone.length}): ${gone.map(n => basename(n)).join(', ')}`);
  for (const n of added) {
    const lf = join(runDir, slug, basename(n) + '.log');
    console.log(`     ${basename(n)}: ${existsSync(lf) ? tally(readFileSync(lf, 'utf8')) : '(no log)'}`);
  }
  for (const f of v.fail) console.log(`   FAIL ${f.f} exit ${f.code}\n${f.tail.split('\n').map(l => '      | ' + l).join('\n')}`);
}
