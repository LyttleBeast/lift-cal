// Re-prove Navy polish r1, the rest: wait for rpnavy-r1b-drive.mjs to finish;
// if its navy run lost the lock race (45 min), run it again (up to 4 tries);
// then the web fit run of the polish branch wearing Navy against the night's
// v1 fit reference (up to 4 tries). Each try writes proof/<name>.out.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
const NIGHT = '/Users/micahflunker/dev/vibes-night';
const H = NIGHT + '/wt/web-harness';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const lost = n => /lock: .* held by live pid .* for over/.test(readFileSync(NIGHT + '/proof/' + n + '.out', 'utf8'));
while (!existsSync(NIGHT + '/proof/rpnavy-r1b-navy.out')) await sleep(20000);
const run = (name, args) => {
  const r = spawnSync('node', [NIGHT + '/tools/run-to.mjs', NIGHT + '/proof/' + name + '.out', H, 'node', 'report/btn-44/prove.mjs', ...args], { encoding: 'utf8' });
  console.log('== ' + name + '\n' + (r.stdout || '').split('\n').slice(-3).join('\n'));
};
if (lost('rpnavy-r1b-navy')) {
  for (let i = 2; i <= 5; i++) {
    const name = 'rpnavy-r1b-navy-' + i;
    run(name, ['--a', NIGHT + '/wt/web-mainref', '--b', NIGHT + '/wt/web-p-navy', '--expect-vibe', '200,200', '--widths', '390,320', '--run', name, '--vibe', 'navy']);
    if (!lost(name)) break;
  }
}
for (let i = 1; i <= 4; i++) {
  const name = 'rpnavy-r1b-fit' + (i > 1 ? '-' + i : '');
  run(name, ['fit', '--repo', NIGHT + '/wt/web-p-navy', '--run', name, '--vibe', 'navy', '--compare', NIGHT + '/proof/v-navy-fitgate2-v1ref-s1/fit.json']);
  if (!lost(name)) break;
}
console.log('DONE');
