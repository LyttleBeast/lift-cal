// Re-prove Navy after its giveaway pass (round 1): three A/B runs, one after
// another (they serialise on harness.lock anyway). A = web main a78ec39
// (wt/web-mainref), B = vibes/navy-polish 337a093 (wt/web-p-navy).
import { spawnSync } from 'node:child_process';
const NIGHT = '/Users/micahflunker/dev/vibes-night';
const H = NIGHT + '/wt/web-harness';
const A = NIGHT + '/wt/web-mainref', B = NIGHT + '/wt/web-p-navy';
const runs = [
  ['rpnavy-r1b-absent', []],
  ['rpnavy-r1b-dv1', ['--data-vibe', 'v1']],
  ['rpnavy-r1b-navy', ['--vibe', 'navy']]
];
for (const [name, extra] of runs) {
  const r = spawnSync('node', [NIGHT + '/tools/run-to.mjs', NIGHT + '/proof/' + name + '.out', H,
    'node', 'report/btn-44/prove.mjs', '--a', A, '--b', B, '--expect-vibe', '200,200',
    '--widths', '390,320', '--run', name, ...extra], { encoding: 'utf8' });
  console.log('== ' + name + '\n' + (r.stdout || '') + (r.stderr || ''));
}
