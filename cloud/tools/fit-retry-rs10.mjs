// Run the harness's fit for Iron Age (v1 reference first, then the vibe with
// --compare), retrying a run only when it failed waiting for harness.lock.
// usage: node fit-retry-rs10.mjs <runPrefix>   (runs <prefix>-v1ref-rs10 and <prefix>-rs10)
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const P = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/prove.mjs';
const REPO = '/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age';
const PROOF = '/Users/micahflunker/dev/vibes-night/proof/';
const pre = process.argv[2];
const runs = [
  [pre + '-v1ref-rs10', []],
  [pre + '-rs10', ['--vibe', 'iron-age', '--compare', PROOF + pre + '-v1ref-rs10/fit.json']],
];
for (const [name, extra] of runs) {
  for (let i = 1; ; i++) {
    const run = name + (i > 1 ? '' : '');
    if (existsSync(PROOF + run + '/fit.json')) { console.log('have ' + run); break; }
    const r = spawnSync(process.execPath, [P, 'fit', '--repo', REPO, '--run', run, ...extra], { encoding: 'utf8', maxBuffer: 64 << 20 });
    const out = (r.stdout || '') + (r.stderr || '');
    console.log('attempt ' + i + ' ' + run + ' exit ' + r.status + '\n' + out.split('\n').filter(l => !l.startsWith('lock: waiting')).join('\n'));
    if (r.status === 0) break;
    if (!/lock: .* held by live pid/.test(out) || i >= 6) process.exit(1);
  }
}
