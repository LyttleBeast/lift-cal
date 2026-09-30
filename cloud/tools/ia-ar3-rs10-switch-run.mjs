// Iron Age v1 gate, round after-revise-3 (rs10): the web mid-workout switch
// check (ia-v1gate-rs10-switch.mjs, unchanged), retried while it gives up
// waiting on the shared harness lock. Output to <outDir>/run.out.
// Usage: node ia-ar3-rs10-switch-run.mjs <tree> <outDir>
import { spawnSync } from 'node:child_process';
import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
const [tree, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const out = outDir + '/run.out';
writeFileSync(out, '');
for (let attempt = 1; attempt <= 10; attempt++) {
  const r = spawnSync('node', ['/Users/micahflunker/dev/vibes-night/tools/ia-v1gate-rs10-switch.mjs', tree, outDir, 'iron-age'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const text = (r.stdout || '') + (r.stderr || '');
  appendFileSync(out, '### attempt ' + attempt + ' exit ' + r.status + '\n' + text + '\n');
  if (r.status !== 0 && /lock: .* held by live pid/.test(text)) continue;
  appendFileSync(out, 'RUN-DONE exit ' + r.status + '\n');
  break;
}
