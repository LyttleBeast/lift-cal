// Iron Age v1 gate, round after-revise-3 (rs10): the two web v1 proofs, one
// after the other, each retried while prove.mjs gives up waiting on the
// harness lock (it waits 45 min; the machine is shared). Output of each run
// goes to proof/<run>.out beside its run dir.
// Usage: node ia-ar3-rs10-v1-runs.mjs
import { spawnSync } from 'node:child_process';
import { writeFileSync, appendFileSync } from 'node:fs';
const NIGHT = '/Users/micahflunker/dev/vibes-night';
const PROVE = NIGHT + '/wt/web-harness/report/btn-44/prove.mjs';
const base = ['--a', NIGHT + '/wt/web-base', '--b', NIGHT + '/wt/web-v-iron-age', '--expect-vibe', '404,200', '--widths', '390,320'];
const runs = [
  ['v-iron-age-v1-absent-ar3-rs10', []],
  ['v-iron-age-v1-datavibe-ar3-rs10', ['--data-vibe', 'v1']]
];
for (const [name, extra] of runs) {
  const out = NIGHT + '/proof/' + name + '.out';
  writeFileSync(out, '');
  for (let attempt = 1; attempt <= 8; attempt++) {
    const r = spawnSync('node', [PROVE, ...base, ...extra, '--run', name + (attempt > 1 ? '-t' + attempt : '')], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const text = (r.stdout || '') + (r.stderr || '');
    appendFileSync(out, '### attempt ' + attempt + ' exit ' + r.status + '\n' + text + '\n');
    if (r.status === 1 && /lock: .* held by live pid/.test(text)) continue;
    appendFileSync(out, 'RUN-DONE exit ' + r.status + '\n');
    break;
  }
}
