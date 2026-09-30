// ev3x: tail the named verifier logs of a run-verifiers output.
//   node ev3x-logs.mjs <outDir/zone> <name,name…> [lines=8]
import { readFileSync, readdirSync } from 'node:fs';
const [dir, names, n = '8'] = process.argv.slice(2);
for (const f of readdirSync(dir).sort()) {
  if (!names.split(',').some(x => f.includes(x))) continue;
  const t = readFileSync(dir + '/' + f, 'utf8').trim().split('\n');
  console.log('==', f, '(' + t.length + ' lines)');
  console.log(t.slice(-+n).join('\n'));
}
