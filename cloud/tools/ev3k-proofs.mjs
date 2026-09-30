// ev3k: the engine-v3 checker's web proofs, run one after another (the harness
// serialises through harness.lock anyway). 12 scenes at 390 and 320,
// A = web-mainref (b99ec9d), B = web-ev3. Three runs: absent, --data-vibe v1, --vibe chalk.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const H = '/Users/micahflunker/dev/vibes-night/wt/web-harness';
const OUT = '/Users/micahflunker/dev/vibes-night/tmp/ev3k';
mkdirSync(OUT, { recursive: true });
const SCENES = 'you,you-coach-sheet,settings-targets,settings-goal,fuel,weight,steps,onboard-2,tour-1,stats,admin,fixture';
const base = ['report/btn-44/prove.mjs', '--a', '/Users/micahflunker/dev/vibes-night/wt/web-mainref',
  '--b', '/Users/micahflunker/dev/vibes-night/wt/web-ev3', '--expect-vibe', '200,200',
  '--widths', '390,320', '--scenes', SCENES];
const runs = [
  ['ev3k-absent', []],
  ['ev3k-dv1', ['--data-vibe', 'v1']],
  ['ev3k-chalk', ['--vibe', 'chalk']],
];
const only = process.argv[2];
for (const [name, extra] of runs) {
  if (only && !only.split(',').includes(name)) continue;
  const t = Date.now();
  const r = spawnSync('node', [...base, '--run', name, ...extra], { cwd: H, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, TZ: 'America/New_York' } });
  writeFileSync(`${OUT}/${name}.out`, (r.stdout || '') + (r.stderr || ''));
  console.log(name, 'exit', r.status, Math.round((Date.now() - t) / 1000) + 's');
}
