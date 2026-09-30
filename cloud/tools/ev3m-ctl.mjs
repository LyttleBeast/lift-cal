// ev3m: controls — the base tree (web main 10fe73b) against itself, on the
// dock's session/drop scenes, under a vibe: which dock raster states does the
// A tree itself produce? One run per argument pair <runName> <vibe>.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PROVE = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/prove.mjs';
const A = '/Users/micahflunker/dev/vibes-night/wt/web-mainref';
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const [name, vibe] = [args[i], args[i + 1]];
  const r = spawnSync('node', [PROVE, '--a', A, '--b', A, '--expect-vibe', '200,200', '--widths', '390,320', '--groups', 'session,drop', '--vibe', vibe, '--run', name],
    { cwd: '/Users/micahflunker/dev/vibes-night/wt/web-harness', encoding: 'utf8', maxBuffer: 256 << 20 });
  writeFileSync(`/Users/micahflunker/dev/vibes-night/runs/ev3m/${name}.out`, (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || ''));
  writeFileSync(`/Users/micahflunker/dev/vibes-night/runs/ev3m/${name}.status`, JSON.stringify({ name, vibe, exit: r.status }) + '\n');
  console.log(name, vibe, 'exit', r.status);
}
