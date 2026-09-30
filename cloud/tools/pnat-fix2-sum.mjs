// pnat-fix2-sum.mjs — a run-verifiers summary: per zone pass/total, failures' tails, the batteries' lines;
// and whether two rate-band logs fail the same checks.
//   node pnat-fix2-sum.mjs <runDir> [rateBandLogA rateBandLogB]
import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
const [dir, a, b] = process.argv.slice(2);
const s = JSON.parse(readFileSync(join(dir, 'summary.json'), 'utf8'));
for (const [z, v] of Object.entries(s.zones)) {
  console.log(`${z}: syntax ${v.syntaxTotal - v.syntaxFail.length}/${v.syntaxTotal}, verifiers ${v.pass}/${v.total}`);
  for (const f of v.fail) console.log('  FAIL ' + f.f + ' exit ' + f.code + '\n    ' + f.tail.split('\n').join('\n    '));
  for (const [f, lines] of Object.entries(v.batteries)) console.log('  battery ' + basename(f) + ': ' + lines.slice(-2).join(' / '));
}
if (a && b) {
  const fails = p => readFileSync(p, 'utf8').split('\n').filter(l => /^\s*✗/.test(l)).map(l => l.trim());
  const fa = fails(a), fb = fails(b);
  console.log('\nrate-band ✗ lines: ' + fa.length + ' in ' + a + ', ' + fb.length + ' in ' + b +
              '; identical: ' + (JSON.stringify(fa) === JSON.stringify(fb)));
}
