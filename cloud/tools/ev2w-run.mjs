// ev2w-run.mjs — run one or more verifiers in a tree and print only their
// failing lines and last line, with the exit code (no pipes allowed).
// Usage: node ev2w-run.mjs <tree> <script> [script...]
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
const [tree, ...scripts] = process.argv.slice(2);
let worst = 0;
for (const s of scripts) {
  const r = spawnSync('node', [join(tree, s)], { cwd: tree, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, TZ: process.env.TZ || 'UTC' } });
  const out = (r.stdout || '') + (r.stderr || '');
  const lines = out.split('\n').filter(Boolean);
  console.log(`== ${s}: exit ${r.status}`);
  for (const l of lines.filter(l => /✗|Error|error:|FAIL/.test(l)).slice(0, 40)) console.log('   ' + l.slice(0, 600));
  console.log('   ' + (lines[lines.length - 1] || '').slice(0, 300));
  if (r.status) worst = r.status;
}
process.exit(worst);
