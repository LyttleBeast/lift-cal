// Runs native verifiers in one tree and prints only their failing lines (and
// a few lines of context), so no pipe into grep is needed.
// node ia-rs10-fails.mjs <tree> <verifier>...
import { spawnSync } from 'node:child_process';
const [tree, ...vs] = process.argv.slice(2);
for (const v of vs) {
  const r = spawnSync(process.execPath, [v], { cwd: tree, env: { ...process.env, TZ: 'UTC' }, encoding: 'utf8', maxBuffer: 64 << 20 });
  const lines = (r.stdout + '\n' + r.stderr).split('\n');
  console.log('== ' + v + ' exit ' + r.status);
  lines.forEach((l, i) => {
    if (/✗|FAIL|not ok|Error|✘|×/.test(l)) console.log(lines.slice(Math.max(0, i - 1), i + 4).join('\n') + '\n--');
  });
}
