// S (native) fixer round 3: run one verifier and print its section headings, every ✗ line
// and the totals (all lines with --all). With --out <file>, the whole output is also saved there.
// No pipes needed.
// usage: node s-nat-fix3-run.mjs <verifier.mjs> [--all] [--out <file>] [args passed through...]
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [file, ...rest] = process.argv.slice(2);
const all = rest.includes('--all');
const oi = rest.indexOf('--out');
const outFile = oi >= 0 ? rest[oi + 1] : null;
const args = rest.filter((a, i) => a !== '--all' && i !== oi && i !== oi + 1);
const r = spawnSync(process.execPath, [file, ...args], { encoding: 'utf8', maxBuffer: 1 << 26,
  env: { ...process.env, NODE_PATH: '/Users/micahflunker/dev/rack-mobile/node_modules' } });
const text = r.stdout + '\n' + r.stderr;
if (outFile) writeFileSync(outFile, text + '\nexit ' + r.status + '\n');
for (const l of text.split('\n')) if (all || /✗|passed, |^[A-K]\. /.test(l)) console.log(l.slice(0, 900));
console.log('exit ' + r.status);
