// Iron Age v1 gate, round reproof-rs10: the two web v1 proofs and the web
// mid-workout switch check, one after the other, each retried while the
// harness gives up waiting on the shared lock (45 min a try). Each job's
// output goes to proof/<name>.out; a line "RUN-DONE exit N" ends it.
// (A copy of ia-ar3-rs10-v1-runs.mjs + ia-ar3-rs10-switch-run.mjs with new
// run names, so nothing collides with a dead run's dir.)
// Usage: node ia-reproof-rs10-v1-runs.mjs
import { spawnSync } from 'node:child_process';
import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
const NIGHT = '/Users/micahflunker/dev/vibes-night';
const PROVE = NIGHT + '/wt/web-harness/report/btn-44/prove.mjs';
const TREE = NIGHT + '/wt/web-v-iron-age';
const base = ['--a', NIGHT + '/wt/web-base', '--b', TREE, '--expect-vibe', '404,200', '--widths', '390,320'];
const GATE = NIGHT + '/proof/v-iron-age-v1gate-reproof-rs10';
mkdirSync(GATE, { recursive: true });
const jobs = [
  ['v-iron-age-v1-absent-reproof-rs10', n => [PROVE, ...base, '--run', n]],
  ['v-iron-age-v1-datavibe-reproof-rs10', n => [PROVE, ...base, '--data-vibe', 'v1', '--run', n]],
  ['v-iron-age-v1gate-reproof-rs10-switch', () => [NIGHT + '/tools/ia-v1gate-rs10-switch.mjs', TREE, GATE + '/web-switch', 'iron-age']]
];
for (const [name, args] of jobs) {
  const out = NIGHT + '/proof/' + name + '.out';
  writeFileSync(out, '');
  for (let attempt = 1; attempt <= 14; attempt++) {
    const r = spawnSync('node', args(name + (attempt > 1 ? '-t' + attempt : '')), { encoding: 'utf8', maxBuffer: 1 << 28 });
    const text = (r.stdout || '') + (r.stderr || '');
    appendFileSync(out, '### attempt ' + attempt + ' exit ' + r.status + ' at ' + new Date().toISOString() + '\n' + text + '\n');
    if (r.status !== 0 && r.status !== 3 && /lock: .* held by live pid/.test(text)) continue;
    appendFileSync(out, 'RUN-DONE exit ' + r.status + '\n');
    break;
  }
}
