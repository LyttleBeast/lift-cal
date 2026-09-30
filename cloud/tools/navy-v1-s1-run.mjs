// Navy v1 gate (round 1-s1): run the two web proves in turn, keeping each run's
// stdout+stderr in proof/<run>.out. Retries a run only when it failed on the
// harness lock timeout (another agent held it past 45 min).
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, rmSync } from 'node:fs';
const H = '/Users/micahflunker/dev/vibes-night/wt/web-harness';
const P = '/Users/micahflunker/dev/vibes-night/proof';
const base = ['report/btn-44/prove.mjs', '--a', '/Users/micahflunker/dev/vibes-night/wt/web-base',
  '--b', '/Users/micahflunker/dev/vibes-night/wt/web-v-navy', '--expect-vibe', '404,200'];
const runs = process.argv.slice(2).length ? process.argv.slice(2) : ['absent', 'datavibe'];
for (const which of runs) {
  const name = which === 'absent' ? 'v-navy-v1-absent-s1' : 'v-navy-v1-datavibe-s1';
  const args = [...base, '--run', name, ...(which === 'datavibe' ? ['--data-vibe', 'v1'] : [])];
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = spawnSync(process.execPath, args, { cwd: H, encoding: 'utf8', maxBuffer: 512 << 20 });
    const txt = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '') + '\nexit ' + r.status + '\n';
    writeFileSync(P + '/' + name + '.out', txt);
    console.log(name + ' attempt ' + attempt + ' exit ' + r.status);
    if (r.status === 1 && /lock: .* held by live pid/.test(txt)) continue;
    break;
  }
}
