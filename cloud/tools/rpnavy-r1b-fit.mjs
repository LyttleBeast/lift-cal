// Re-prove Navy polish r1: after the three A/B runs, one fit run of the
// polish branch wearing Navy (overflow / clipped text / small targets at 320
// and 390), compared against the night's v1 fit reference. Retries a lost
// lock race (45 min each) up to four times.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
const NIGHT = '/Users/micahflunker/dev/vibes-night';
const H = NIGHT + '/wt/web-harness';
const sleep = ms => new Promise(r => setTimeout(r, ms));
while (!existsSync(NIGHT + '/proof/rpnavy-r1b-navy.out')) await sleep(20000);
for (let i = 1; i <= 4; i++) {
  const name = 'rpnavy-r1b-fit' + (i > 1 ? '-' + i : '');
  const r = spawnSync('node', [NIGHT + '/tools/run-to.mjs', NIGHT + '/proof/' + name + '.out', H,
    'node', 'report/btn-44/prove.mjs', 'fit', '--repo', NIGHT + '/wt/web-p-navy', '--run', name, '--vibe', 'navy',
    '--compare', NIGHT + '/proof/v-navy-fitgate2-v1ref-s1/fit.json'], { encoding: 'utf8' });
  console.log('== ' + name + '\n' + (r.stdout || ''));
  const out = readFileSync(NIGHT + '/proof/' + name + '.out', 'utf8');
  if (!/lock: .* held by live pid .* for over/.test(out)) break;
}
