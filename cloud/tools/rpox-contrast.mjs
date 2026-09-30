// rpox: web contrast collection for Oxblood, main (web-mainref) and the polish
// branch (web-p-oxblood), both worn in oxblood, 390. Retried while the harness
// lock times out.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = '/Users/micahflunker/dev/vibes-night/proof/rpox-contrast';
mkdirSync(OUT, { recursive: true });
const jobs = [
  ['polish', '/Users/micahflunker/dev/vibes-night/wt/web-p-oxblood'],
  ['main', '/Users/micahflunker/dev/vibes-night/wt/web-mainref'],
];
for (const [label, repo] of jobs) {
  const args = ['web.mjs', '--repo', repo, '--label', 'ox-' + label, '--vibe', 'oxblood', '--out', OUT];
  for (let attempt = 1; attempt <= 12; attempt++) {
    const r = spawnSync('node', args, { cwd: '/Users/micahflunker/dev/vibes-night/tools/vibe-contrast', encoding: 'utf8', maxBuffer: 64 << 20 });
    const text = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '');
    writeFileSync(`${OUT}/rpox-contrast-${label}.out`, text);
    console.log(label, 'attempt', attempt, 'exit', r.status);
    if (!/held by live pid .* for over/.test(text)) break;
  }
}
console.log('ALL DONE');
