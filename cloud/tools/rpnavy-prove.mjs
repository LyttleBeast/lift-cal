// rpnavy: re-prove Navy after its giveaway pass (round 1). Three web A/B runs,
// one after another: web main a78ec39 (web-mainref) against vibes/navy-polish
// 337a093 (web-p-navy), every scene, 390 and 320. A harness lock timeout
// (exit 1 with "lock:" in the output) is retried; anything else is final.
//   node rpnavy-prove.mjs [runName …]
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PROVE = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/prove.mjs';
const A = '/Users/micahflunker/dev/vibes-night/wt/web-mainref';
const B = '/Users/micahflunker/dev/vibes-night/wt/web-p-navy';
const OUT = '/Users/micahflunker/dev/vibes-night/runs/rpnavy';
mkdirSync(OUT, { recursive: true });
const runs = [
  ['rpnavy-r1-absent', []],
  ['rpnavy-r1-dv1', ['--data-vibe', 'v1']],
  ['rpnavy-r1-navy', ['--vibe', 'navy']],
];
const only = process.argv.slice(2);
for (const [name, extra] of runs) {
  if (only.length && !only.includes(name)) continue;
  const args = [PROVE, '--a', A, '--b', B, '--expect-vibe', '200,200', '--widths', '390,320', '--run', name, ...extra];
  for (let attempt = 1; attempt <= 4; attempt++) {
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
