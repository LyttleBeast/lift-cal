// Clear sky v1 gate (round 1-d1): the two web proves in turn, base 928a65e (A)
// against vibes/clear-sky (B), every scene at 390 and 320; the second with
// --data-vibe v1; then the web switch check (oxblood-v1gate-s1-switch.mjs,
// unchanged, vibe clear-sky) into proof/v-clear-sky-v1gate-d1/web-switch. Each
// run's stdout+stderr goes to proof/<run>.out. Retries only on the harness lock
// timeout (the night's queue is long).
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const H = '/Users/micahflunker/dev/vibes-night/wt/web-harness';
const P = '/Users/micahflunker/dev/vibes-night/proof';
const T = '/Users/micahflunker/dev/vibes-night/tools';
const B = '/Users/micahflunker/dev/vibes-night/wt/web-v-clear-sky';
const base = ['report/btn-44/prove.mjs', '--a', '/Users/micahflunker/dev/vibes-night/wt/web-base',
  '--b', B, '--expect-vibe', '404,200'];
const runs = process.argv.slice(2).length ? process.argv.slice(2) : ['switch', 'absent', 'datavibe'];
const go = (name, args, cwd) => {
  for (let attempt = 1; attempt <= 30; attempt++) {
    const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 512 << 20 });
    const txt = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '') + '\nexit ' + r.status + '\n';
    writeFileSync(P + '/' + name + '.out', txt);
    console.log(new Date().toISOString() + ' ' + name + ' attempt ' + attempt + ' exit ' + r.status);
    if (r.status !== 0 && r.status !== 3 && r.status !== 4 && r.status !== 5 && /lock/i.test(txt) && /held/i.test(txt)) continue;
    break;
  }
};
for (const which of runs) {
  if (which === 'switch') {
    const out = P + '/v-clear-sky-v1gate-d1/web-switch';
    mkdirSync(out, { recursive: true });
    go('v-clear-sky-v1gate-d1-switch', [T + '/oxblood-v1gate-s1-switch.mjs', B, out, 'clear-sky'], T);
    continue;
  }
  const name = which === 'absent' ? 'v-clear-sky-v1-absent-d1' : 'v-clear-sky-v1-datavibe-d1';
  go(name, [...base, '--run', name, ...(which === 'datavibe' ? ['--data-vibe', 'v1'] : [])], H);
}
console.log('ALL DONE');
