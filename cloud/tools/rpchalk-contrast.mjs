// rpchalk: web contrast collection for Chalk on vibes/chalk-polish, retried while the harness lock times out.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const OUT = '/Users/micahflunker/dev/vibes-night/proof/rpchalk-contrast';
const args = ['web.mjs', '--repo', '/Users/micahflunker/dev/vibes-night/wt/web-p-chalk', '--label', 'chalk-rpc1', '--vibe', 'chalk', '--out', OUT];
for (let attempt = 1; attempt <= 12; attempt++) {
  const r = spawnSync('node', args, { cwd: '/Users/micahflunker/dev/vibes-night/tools/vibe-contrast', encoding: 'utf8', maxBuffer: 64 << 20 });
  const text = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '');
  writeFileSync(`${OUT}/rpchalk-contrast.out`, text);
  console.log('attempt', attempt, 'exit', r.status);
  if (!/held by live pid .* for over/.test(text)) break;
}
console.log('ALL DONE');
