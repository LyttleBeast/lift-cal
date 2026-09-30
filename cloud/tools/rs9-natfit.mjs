// Runs the native fit-gate verifiers for one tree in UTC? No: verify-vibe-fit pins its own zone.
// Writes each verifier's full output under the out dir and prints exit + last lines.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [, , root, out, ...names] = process.argv;
mkdirSync(out, { recursive: true });
for (const n of names) {
  const t0 = Date.now();
  const r = spawnSync('node', [join(root, 'tools', n)], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, TZ: process.env.TZ || 'UTC' } });
  const txt = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '');
  writeFileSync(join(out, n + '.txt'), txt);
  const lines = txt.split('\n').filter(Boolean);
  const fails = lines.filter(l => /FAIL|✗|not ok|Error/i.test(l)).slice(0, 40);
  console.log('=== ' + n + ' exit ' + r.status + ' in ' + Math.round((Date.now() - t0) / 1000) + 's, ' + lines.length + ' lines');
  fails.forEach(l => console.log('  ! ' + l.slice(0, 400)));
  lines.slice(-8).forEach(l => console.log('  | ' + l.slice(0, 400)));
}
