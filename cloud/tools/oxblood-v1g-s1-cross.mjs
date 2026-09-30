// Oxblood v1 gate (round 1-s1): run chalk-v1gate-crossrun.mjs (this run's
// dumps against a reference run's, A with A and B with B) and keep its output
// in a file under the gate's proof dir. The reference B served 0af4b19, whose
// tree is byte for byte web main b99ec9d.
// Usage: node oxblood-v1g-s1-cross.mjs <refRunDir> <runDir> <outFile>
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [ref, run, out] = process.argv.slice(2);
const r = spawnSync(process.execPath, ['/Users/micahflunker/dev/vibes-night/tools/chalk-v1gate-crossrun.mjs', ref, run], { encoding: 'utf8', maxBuffer: 256 << 20 });
writeFileSync(out, (r.stdout || '') + (r.stderr ? '\n--- stderr ---\n' + r.stderr : '') + '\nexit ' + r.status + '\n');
const lines = (r.stdout || '').split('\n').filter(l => !l.startsWith('    '));
console.log(lines.join('\n').slice(0, 6000));
console.log('exit', r.status);
