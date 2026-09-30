// ev3x: controls — web main 53600fa (web-mainref) against itself, on the dock's
// session/drop scenes, under a vibe (or a data-vibe): which dock raster states
// does the A tree itself produce? Arguments: <runName> <vibe|dv:<v>|none> …
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PROVE = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/prove.mjs';
const A = '/Users/micahflunker/dev/vibes-night/wt/web-mainref';
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const [name, vibe] = [args[i], args[i + 1]];
  const extra = vibe === 'none' ? [] : vibe.startsWith('dv:') ? ['--data-vibe', vibe.slice(3)] : ['--vibe', vibe];
  const r = spawnSync('node', [PROVE, '--a', A, '--b', A, '--expect-vibe', '200,200', '--widths', '390,320', '--groups', 'session,drop', ...extra, '--run', name],
    { cwd: '/Users/micahflunker/dev/vibes-night/wt/web-harness', encoding: 'utf8', maxBuffer: 256 << 20 });
  writeFileSync(`/Users/micahflunker/dev/vibes-night/runs/ev3x/${name}.out`, (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || ''));
  writeFileSync(`/Users/micahflunker/dev/vibes-night/runs/ev3x/${name}.status`, JSON.stringify({ name, vibe, exit: r.status }) + '\n');
  console.log(name, vibe, 'exit', r.status);
}
