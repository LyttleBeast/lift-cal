// pwr3 js-lens reviewer: run named tools-check verifiers in a tree, print each
// exit code and the last line of its output. No redirects, no shell.
// Usage: node pwr3-js-verifiers.mjs <tree> <verifier.mjs> [...]
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const [tree, ...names] = process.argv.slice(2);
for (const n of names) {
  const r = spawnSync(process.execPath, [path.join(tree, 'tools-check', n)], { cwd: tree, encoding: 'utf8', maxBuffer: 1 << 28, env: process.env });
  const lines = (r.stdout + '\n' + r.stderr).split('\n').map(s => s.trim()).filter(Boolean);
  const tail = lines.filter(l => /pass|fail|check/i.test(l)).slice(-2).join(' | ') || lines.slice(-1)[0];
  console.log(r.status, n, '::', tail);
}
