// rpchalk: re-prove Chalk after its giveaway pass (round 1). Three web A/B runs,
// one after another: web main a78ec39 (web-mainref) against vibes/chalk-polish
// 36a3d27 (web-p-chalk), every scene, 390 and 320. A harness lock timeout
// (exit 1 with "lock: … held by live pid") is retried; anything else is final.
//   node rpchalk-prove.mjs [runName …]
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PROVE = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/prove.mjs';
const A = '/Users/micahflunker/dev/vibes-night/wt/web-mainref';
const B = '/Users/micahflunker/dev/vibes-night/wt/web-p-chalk';
const OUT = '/Users/micahflunker/dev/vibes-night/runs/rpchalk';
mkdirSync(OUT, { recursive: true });
const runs = [
  ['rpchalk-r1-absent', []],
  ['rpchalk-r1-dv1', ['--data-vibe', 'v1']],
  ['rpchalk-r1-chalk', ['--vibe', 'chalk']],
];
const only = process.argv.slice(2);
for (const [name, extra] of runs) {
  if (only.length && !only.includes(name)) continue;
  const args = [PROVE, '--a', A, '--b', B, '--expect-vibe', '200,200', '--widths', '390,320', '--run', name, ...extra];
  for (let attempt = 1; attempt <= 20; attempt++) {
    const t0 = Date.now();
    const r = spawnSync('node', args, { cwd: '/Users/micahflunker/dev/vibes-night/wt/web-harness', encoding: 'utf8', maxBuffer: 256 << 20 });
    const text = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '');
    writeFileSync(`${OUT}/${name}.out`, text);
    writeFileSync(`${OUT}/${name}.status`, JSON.stringify({ name, args, attempt, exit: r.status, signal: r.signal, seconds: Math.round((Date.now() - t0) / 1000) }) + '\n');
    console.log(name, 'attempt', attempt, 'exit', r.status, Math.round((Date.now() - t0) / 1000) + 's');
    if (!(r.status === 1 && /lock: .* held by live pid/.test(text))) break;
  }
}
console.log('ALL DONE');
