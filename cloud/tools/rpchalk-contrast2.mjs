// rpchalk (resume): web contrast collections for Chalk, the polish branch (web-p-chalk, 36a3d27) and
// web main (web-mainref, a78ec39), one after another; each retried while the harness lock times out.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = '/Users/micahflunker/dev/vibes-night/proof/rpchalk-contrast';
mkdirSync(OUT, { recursive: true });
const jobs = [
  ['chalk-rpc2', '/Users/micahflunker/dev/vibes-night/wt/web-p-chalk'],
  ['chalkmain-rpc2', '/Users/micahflunker/dev/vibes-night/wt/web-mainref'],
];
for (const [label, repo] of jobs) {
  const args = ['web.mjs', '--repo', repo, '--label', label, '--vibe', 'chalk', '--out', OUT];
  for (let attempt = 1; attempt <= 12; attempt++) {
    const r = spawnSync('node', args, { cwd: '/Users/micahflunker/dev/vibes-night/tools/vibe-contrast', encoding: 'utf8', maxBuffer: 64 << 20 });
    const text = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '');
    writeFileSync(`${OUT}/${label}.out`, text);
    console.log(label, 'attempt', attempt, 'exit', r.status);
    if (!/held by live pid .* for over/.test(text)) break;
  }
}
console.log('ALL DONE');
