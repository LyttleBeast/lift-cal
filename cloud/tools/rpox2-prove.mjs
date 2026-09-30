// rpox2: re-prove Oxblood after its giveaway pass (round 1), second attempt —
// the first (rpox-prove.mjs) never got the harness lock. Three web A/B runs,
// one after another: web main a78ec39 (web-mainref) against
// vibes/oxblood-polish 831880d (web-p-oxblood), every scene, 390 and 320.
// A harness lock timeout (exit 1, "lock: … held by live pid") is retried.
//   node rpox2-prove.mjs [runName …]
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PROVE = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/prove.mjs';
const A = '/Users/micahflunker/dev/vibes-night/wt/web-mainref';
const B = '/Users/micahflunker/dev/vibes-night/wt/web-p-oxblood';
const OUT = '/Users/micahflunker/dev/vibes-night/runs/rpox2';
mkdirSync(OUT, { recursive: true });
const runs = [
  ['rpox2-r1-absent', []],
  ['rpox2-r1-dv1', ['--data-vibe', 'v1']],
  ['rpox2-r1-oxblood', ['--vibe', 'oxblood']],
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
    console.log(new Date().toISOString(), name, 'attempt', attempt, 'exit', r.status, Math.round((Date.now() - t0) / 1000) + 's');
    if (!(r.status === 1 && /lock: .* held by live pid/.test(text))) break;
  }
}
console.log('ALL DONE');
