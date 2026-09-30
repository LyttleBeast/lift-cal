// pnat-failcmp.mjs — the failing (✗) check lines of two verifier logs, side by side.
//   node pnat-failcmp.mjs <engineLog> <baseLog>
import { readFileSync } from 'node:fs';
const fails = f => readFileSync(f, 'utf8').replace(/\x1b\[[0-9;]*m/g, '').split('\n')
  .filter(l => /^\s*✗/.test(l)).map(l => l.trim().replace(/\s+—\s[\s\S]*$/, ''));
const tallyOf = f => (readFileSync(f, 'utf8').replace(/\x1b\[[0-9;]*m/g, '').match(/\d+ passed, \d+ failed/g) || []).pop() || '(no tally)';
const [a, b] = process.argv.slice(2);
const A = fails(a), B = fails(b);
console.log(`engine: ${tallyOf(a)}; ${A.length} failing checks`);
A.forEach(l => console.log('  E ' + l));
console.log(`base:   ${tallyOf(b)}; ${B.length} failing checks`);
B.forEach(l => console.log('  B ' + l));
const same = A.length === B.length && A.every((l, i) => l === B[i]);
console.log(same ? 'SAME FAILING CHECKS' : 'DIFFERENT FAILING CHECKS');
