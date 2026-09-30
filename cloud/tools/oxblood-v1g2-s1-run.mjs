// Oxblood v1 gate (round 2-s1): the two web proves in turn, base 928a65e (A)
// against vibes/oxblood (B), every scene at 390 and 320; the second with
// --data-vibe v1; then the web switch check (oxblood-v1gate-s1-switch.mjs,
// unchanged) into proof/v-oxblood-v1gate-r2-s1/web-switch. New run names
// (-r2-s1) so round 1's dirs stay as they were. Each run's stdout+stderr goes
// to proof/<run>.out. Retries only on the harness lock timeout.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const H = '/Users/micahflunker/dev/vibes-night/wt/web-harness';
const P = '/Users/micahflunker/dev/vibes-night/proof';
const T = '/Users/micahflunker/dev/vibes-night/tools';
const base = ['report/btn-44/prove.mjs', '--a', '/Users/micahflunker/dev/vibes-night/wt/web-base',
  '--b', '/Users/micahflunker/dev/vibes-night/wt/web-v-oxblood', '--expect-vibe', '404,200'];
const runs = process.argv.slice(2).length ? process.argv.slice(2) : ['absent', 'datavibe', 'switch'];
const go = (name, args, cwd) => {
  for (let attempt = 1; attempt <= 10; attempt++) {
    const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 512 << 20 });
    const txt = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '') + '\nexit ' + r.status + '\n';
    writeFileSync(P + '/' + name + '.out', txt);
    console.log(new Date().toISOString() + ' ' + name + ' attempt ' + attempt + ' exit ' + r.status);
    if (r.status === 1 && /lock/i.test(txt) && /held/i.test(txt)) continue;
    break;
  }
};
for (const which of runs) {
  if (which === 'switch') {
    const out = P + '/v-oxblood-v1gate-r2-s1/web-switch';
    mkdirSync(out, { recursive: true });
    go('v-oxblood-v1gate-r2-s1-switch', [T + '/oxblood-v1gate-s1-switch.mjs', '/Users/micahflunker/dev/vibes-night/wt/web-v-oxblood', out, 'oxblood'], T);
    continue;
  }
  const name = which === 'absent' ? 'v-oxblood-v1-absent-r2-s1' : 'v-oxblood-v1-datavibe-r2-s1';
  go(name, [...base, '--run', name, ...(which === 'datavibe' ? ['--data-vibe', 'v1'] : [])], H);
}
console.log('ALL DONE');
