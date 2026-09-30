// rpnavy: web fit of Navy on the polish branch and on web main, each against
// the v1 reference fit, retried on a harness lock timeout.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PROVE = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/prove.mjs';
const OUT = '/Users/micahflunker/dev/vibes-night/runs/rpnavy';
const V1REF = '/Users/micahflunker/dev/vibes-night/proof/v-navy-fitgate2-v1ref-s1/fit.json';
mkdirSync(OUT, { recursive: true });
const runs = [
  ['rpnavy-r1-fit-polish2', '/Users/micahflunker/dev/vibes-night/wt/web-p-navy'],
  ['rpnavy-r1-fit-mainref2', '/Users/micahflunker/dev/vibes-night/wt/web-mainref'],
];
for (const [name, repo] of runs) {
  const args = [PROVE, 'fit', '--repo', repo, '--run', name, '--vibe', 'navy', '--compare', V1REF];
  for (let attempt = 1; attempt <= 6; attempt++) {
    const t0 = Date.now();
    const r = spawnSync('node', args, { cwd: '/Users/micahflunker/dev/vibes-night/wt/web-harness', encoding: 'utf8', maxBuffer: 256 << 20 });
    const text = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '');
    writeFileSync(`${OUT}/${name}.out`, text);
    console.log(name, 'attempt', attempt, 'exit', r.status, Math.round((Date.now() - t0) / 1000) + 's');
    if (!(r.status === 1 && /lock: .* held by live pid/.test(text))) break;
  }
}
console.log('FITS DONE');
