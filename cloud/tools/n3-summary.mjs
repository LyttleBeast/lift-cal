// N3 scratch: the per-zone picture from a run-verifiers outDir — totals,
// batteries, and the last summary line of named verifiers' logs.
import fs from 'node:fs';
const d = process.argv[2];
const names = process.argv.slice(3);
const s = JSON.parse(fs.readFileSync(d + '/summary.json', 'utf8'));
for (const [z, v] of Object.entries(s.zones)) {
  console.log('== ' + z + ': ' + v.pass + '/' + v.total + (v.fail.length ? ' FAIL ' + v.fail.map(f => f.f).join(', ') : '') + (v.syntaxFail ? ' syntax ' + JSON.stringify(v.syntaxFail) : ''));
  console.log('   batteries ' + JSON.stringify(v.batteries));
  const dir = d + '/' + z.replace(/\//g, '_');
  for (const n of names) {
    let log = '';
    try { log = fs.readFileSync(dir + '/' + n + '.log', 'utf8'); } catch { log = '(no log ' + n + ')'; }
    const last = log.trim().split('\n').filter(l => /passed|failed|checks|All checks/.test(l)).pop() || log.trim().split('\n').pop();
    console.log('   ' + n + ': ' + last);
  }
}
