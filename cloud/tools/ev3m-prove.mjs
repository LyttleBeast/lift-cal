// Merge-readiness proof of engine v3: four web A/B runs, one after another,
// mainref (web main 10fe73b) against web-ev3 (vibes/engine3 HEAD).
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PROVE = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/prove.mjs';
const A = '/Users/micahflunker/dev/vibes-night/wt/web-mainref';
const B = '/Users/micahflunker/dev/vibes-night/wt/web-ev3';
const OUT = '/Users/micahflunker/dev/vibes-night/runs/ev3m';
mkdirSync(OUT, { recursive: true });
const runs = [
  ['ev3m-absent', []],
  ['ev3m-dv1', ['--data-vibe', 'v1']],
  ['ev3m-chalk', ['--vibe', 'chalk']],
  ['ev3m-navy', ['--vibe', 'navy']],
];
const only = process.argv.slice(2);
for (const [name, extra] of runs) {
  if (only.length && !only.includes(name)) continue;
  const args = [PROVE, '--a', A, '--b', B, '--expect-vibe', '200,200', '--widths', '390,320', '--run', name, ...extra];
  const t0 = Date.now();
  const r = spawnSync('node', args, { cwd: '/Users/micahflunker/dev/vibes-night/wt/web-harness', encoding: 'utf8', maxBuffer: 256 << 20 });
  writeFileSync(`${OUT}/${name}.out`, (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || ''));
  writeFileSync(`${OUT}/${name}.status`, JSON.stringify({ name, args, exit: r.status, signal: r.signal, seconds: Math.round((Date.now() - t0) / 1000) }) + '\n');
  console.log(name, 'exit', r.status);
}
