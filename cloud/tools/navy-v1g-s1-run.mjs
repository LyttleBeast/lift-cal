// Navy v1 gate (round 1-s1, the resumed night): the two web proves in turn,
// base 928a65e (A) against vibes/navy (B), every scene at 390 and 320; the
// second with --data-vibe v1. Fresh run names (v-navy-v1g-*-s1): a dead agent
// left a partial v-navy-v1-absent-s1. Each run's stdout+stderr goes to
// proof/<run>.out. Retries only on the harness lock timeout.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const H = '/Users/micahflunker/dev/vibes-night/wt/web-harness';
const P = '/Users/micahflunker/dev/vibes-night/proof';
const base = ['report/btn-44/prove.mjs', '--a', '/Users/micahflunker/dev/vibes-night/wt/web-base',
  '--b', '/Users/micahflunker/dev/vibes-night/wt/web-v-navy', '--expect-vibe', '404,200'];
const runs = process.argv.slice(2).length ? process.argv.slice(2) : ['absent', 'datavibe'];
for (const which of runs) {
  const name = which === 'absent' ? 'v-navy-v1g-absent-s1' : 'v-navy-v1g-datavibe-s1';
  const args = [...base, '--run', name, ...(which === 'datavibe' ? ['--data-vibe', 'v1'] : [])];
  for (let attempt = 1; attempt <= 6; attempt++) {
    const r = spawnSync(process.execPath, args, { cwd: H, encoding: 'utf8', maxBuffer: 512 << 20 });
    const txt = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '') + '\nexit ' + r.status + '\n';
    writeFileSync(P + '/' + name + '.out', txt);
    console.log(new Date().toISOString() + ' ' + name + ' attempt ' + attempt + ' exit ' + r.status);
    if (r.status === 1 && /lock/i.test(txt) && /held/i.test(txt)) continue;
    break;
  }
}
