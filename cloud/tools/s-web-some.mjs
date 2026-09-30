// Run some tools-check verifiers in one tree, one at a time, each log under <outDir>.
// Usage: node s-web-some.mjs <repo> <outDir> [--tz Zone] name.mjs [name.mjs...]
// Prints: exit code, name, the last line of its output.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const args = process.argv.slice(2);
const repo = args.shift(), out = args.shift();
let tz = process.env.TZ;
const ti = args.indexOf('--tz');
if (ti >= 0) { tz = args[ti + 1]; args.splice(ti, 2); }
mkdirSync(out, { recursive: true });
let bad = 0;
for (const n of args) {
  const r = spawnSync(process.execPath, ['tools-check/' + n], { cwd: repo, env: { ...process.env, TZ: tz }, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 540000 });
  const text = (r.stdout || '') + (r.stderr || '');
  writeFileSync(join(out, n + '.log'), text);
  const last = text.trim().split('\n').slice(-1)[0] || '';
  if (r.status !== 0) bad++;
  console.log(r.status + '  ' + n + '  | ' + last.slice(0, 200));
}
console.log(bad ? bad + ' failed' : 'all passed');
