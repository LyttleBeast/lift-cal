// Runs the oxblood review prove run, again under a fresh run name whenever
// the harness gives up waiting for the lock (other agents keep taking it).
import { spawnSync } from 'node:child_process';
const H = '/Users/micahflunker/dev/vibes-night/wt/web-harness';
for (let i = 1; i < 9; i++) {
  const run = 'v-oxblood-review-s1-r1' + (i ? '-' + String.fromCharCode(97 + i) : '');
  console.log('attempt ' + run);
  const r = spawnSync(process.execPath, ['report/btn-44/prove.mjs', '--a', '/Users/micahflunker/dev/vibes-night/wt/web-base',
    '--b', '/Users/micahflunker/dev/vibes-night/wt/web-v-oxblood', '--expect-vibe', '404,200', '--vibe', 'oxblood',
    '--pixel-retries', '0', '--run', run], { cwd: H, encoding: 'utf8', maxBuffer: 1 << 28 });
  const out = (r.stdout || '') + (r.stderr || '');
  const lockFail = /lock: .* for over/.test(out);
  console.log(out.split('\n').filter(l => !/lock: waiting/.test(l)).slice(-60).join('\n'));
  console.log('exit ' + r.status + ' ' + run);
  if (!lockFail) break;
}
