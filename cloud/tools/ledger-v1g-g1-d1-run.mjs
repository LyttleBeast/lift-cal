// Ledger v1 gate (round 1-d1, fresh session): the two web proves in turn, base
// 928a65e (A) against vibes/ledger 694837b (B), every scene at 390 and 320; the
// second with --data-vibe v1; then the web switch check (oxblood-v1gate-s1-switch.mjs,
// unchanged, vibe ledger). New run names (-g1-d1): the dead session's
// v-ledger-v1-absent-d1 is a lock-timeout partial and is left alone.
// Each run's stdout+stderr goes to proof/<run>.out. Retries only on the lock timeout.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const H = '/Users/micahflunker/dev/vibes-night/wt/web-harness';
const P = '/Users/micahflunker/dev/vibes-night/proof';
const T = '/Users/micahflunker/dev/vibes-night/tools';
const base = ['report/btn-44/prove.mjs', '--a', '/Users/micahflunker/dev/vibes-night/wt/web-base',
  '--b', '/Users/micahflunker/dev/vibes-night/wt/web-v-ledger', '--expect-vibe', '404,200'];
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
    const out = P + '/v-ledger-v1gate-g1-d1/web-switch';
    mkdirSync(out, { recursive: true });
    go('v-ledger-v1gate-g1-d1-switch', [T + '/oxblood-v1gate-s1-switch.mjs', '/Users/micahflunker/dev/vibes-night/wt/web-v-ledger', out, 'ledger'], T);
    continue;
  }
  const name = which === 'absent' ? 'v-ledger-v1-absent-g1-d1' : 'v-ledger-v1-datavibe-g1-d1';
  go(name, [...base, '--run', name, ...(which === 'datavibe' ? ['--data-vibe', 'v1'] : [])], H);
}
console.log('ALL DONE');
