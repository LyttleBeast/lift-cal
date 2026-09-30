// rpox2: web contrast collection for Oxblood, the polish branch (web-p-oxblood)
// and main (web-mainref), both worn in oxblood, 390. Second attempt — the first
// (rpox-contrast.mjs) never got the harness lock. Retried while the lock times out.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = '/Users/micahflunker/dev/vibes-night/proof/rpox2-contrast';
mkdirSync(OUT, { recursive: true });
const jobs = [
  ['polish', '/Users/micahflunker/dev/vibes-night/wt/web-p-oxblood'],
  ['main', '/Users/micahflunker/dev/vibes-night/wt/web-mainref'],
];
for (const [label, repo] of jobs) {
  const args = ['web.mjs', '--repo', repo, '--label', 'ox-' + label, '--vibe', 'oxblood', '--out', OUT];
  for (let attempt = 1; attempt <= 12; attempt++) {
    const t0 = Date.now();
    const r = spawnSync('node', args, { cwd: '/Users/micahflunker/dev/vibes-night/tools/vibe-contrast', encoding: 'utf8', maxBuffer: 64 << 20 });
    const text = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '');
    writeFileSync(`${OUT}/rpox2-contrast-${label}.out`, text);
    console.log(new Date().toISOString(), label, 'attempt', attempt, 'exit', r.status, Math.round((Date.now() - t0) / 1000) + 's');
    if (!/held by live pid .* for over/.test(text)) break;
  }
}
console.log('ALL DONE');
