// Summarise a run-verifiers outDir: node ian-suite.mjs <outDir> [zone]
// Prints summary.json's zone lines if present, else scans logs for FAIL lines.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [dir, zone = 'UTC'] = process.argv.slice(2);
const sj = join(dir, 'summary.json');
if (existsSync(sj)) {
  const s = JSON.parse(readFileSync(sj, 'utf8'));
  for (const [z, v] of Object.entries(s.zones)) {
    console.log(z, 'syntax', (v.syntaxTotal - v.syntaxFail.length) + '/' + v.syntaxTotal, 'verifiers', v.pass + '/' + v.total, s.finishedAt ? 'done' : 'running');
    for (const f of v.fail) console.log('  FAIL', f.f, f.code, '\n    ' + f.tail.split('\n').join('\n    '));
  }
}
const zd = join(dir, zone);
if (existsSync(zd)) {
  const logs = readdirSync(zd);
  console.log(logs.length, 'logs in', zone);
  if (process.argv.includes('--scan')) for (const f of logs) {
    const t = readFileSync(join(zd, f), 'utf8');
    const bad = t.split('\n').filter(l => /FAIL|Error|error:|TIMEOUT/.test(l)).slice(0, 4);
    if (bad.length) console.log('--', f, '\n   ' + bad.join('\n   '));
  }
}
