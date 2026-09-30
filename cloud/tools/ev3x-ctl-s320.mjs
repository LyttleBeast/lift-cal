// ev3x: web main 53600fa against itself, Oxblood, the session scene at 320
// only, N times, each started the moment harness.lock is free: does the A tree
// itself produce B's session@320 PNG (08ed6bf4…)? Stops at the first hit.
//   node ev3x-ctl-s320.mjs <N>
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const LOCK = '/Users/micahflunker/dev/vibes-night/harness.lock';
const PROVE = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/prove.mjs';
const A = '/Users/micahflunker/dev/vibes-night/wt/web-mainref';
const WANT = '08ed6bf437ef47523d69ae4458f86f213840183917d03536d7192bf3d5875ca8';
const N = +(process.argv[2] || 4);
for (let i = 1; i <= N; i++) {
  const name = 'ev3x-ctl-ox-s320-' + i;
  while (existsSync(LOCK)) await new Promise(r => setTimeout(r, 500));
  const r = spawnSync('node', [PROVE, '--a', A, '--b', A, '--expect-vibe', '200,200', '--widths', '320', '--scenes', 'session', '--vibe', 'oxblood', '--run', name],
    { cwd: '/Users/micahflunker/dev/vibes-night/wt/web-harness', encoding: 'utf8', maxBuffer: 256 << 20 });
  writeFileSync(`/Users/micahflunker/dev/vibes-night/runs/ev3x/${name}.out`, (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || ''));
  const hits = [];
  for (const side of ['A', 'B']) {
    const d = `/Users/micahflunker/dev/vibes-night/proof/${name}/${side}/320`;
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) if (f.startsWith('session') && f.endsWith('.png')) {
      const s = createHash('sha256').update(readFileSync(`${d}/${f}`)).digest('hex');
      if (s === WANT) hits.push(`${side}/320/${f}`);
    }
  }
  console.log(name, 'exit', r.status, 'hits', hits.join(' ') || 'none');
  if (hits.length) break;
}
