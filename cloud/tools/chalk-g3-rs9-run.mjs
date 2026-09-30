// Run one node script in a tree and keep its output in a file (no shell redirect).
// Usage: node chalk-g3-rs9-run.mjs <cwd> <outFile> <tz> <script> [args…]
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const [cwd, out, tz, ...rest] = process.argv.slice(2);
mkdirSync(dirname(out), { recursive: true });
const r = spawnSync(process.execPath, rest, { cwd, env: { ...process.env, TZ: tz }, encoding: 'utf8', maxBuffer: 256 << 20 });
writeFileSync(out, (r.stdout || '') + (r.stderr ? '\n--- stderr ---\n' + r.stderr : '') + '\nexit ' + r.status + '\n');
console.log('exit ' + r.status + '  ' + out);
process.exit(r.status ?? 1);
