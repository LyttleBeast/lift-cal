// ev3x: run one script in a tree, cwd = the tree, TZ=UTC, output to a file and stdout.
//   node ev3x-run.mjs <tree> <outFile> <script> [args…]
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [tree, out, ...args] = process.argv.slice(2);
const r = spawnSync(process.execPath, args, { cwd: tree, env: { ...process.env, TZ: 'UTC' }, encoding: 'utf8', maxBuffer: 256 << 20 });
const text = (r.stdout || '') + (r.stderr || '') + '\n[exit ' + r.status + ']\n';
writeFileSync(out, text);
console.log(text.trim().split('\n').slice(-25).join('\n'));
process.exit(r.status ?? 1);
