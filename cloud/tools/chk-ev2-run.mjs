// chk-ev2-run.mjs — the engine-v2 checker's runner: run verifiers in a tree,
// each given as one string "script [args…]", write full logs under outDir,
// print exit code, the failing lines and the last line.
// Usage: node chk-ev2-run.mjs <tree> <outDir> "<script args>" ["<script args>"…]
import { spawnSync } from 'node:child_process';
import { join, basename } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
const [tree, outDir, ...specs] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
let worst = 0;
for (const spec of specs) {
  const [s, ...args] = spec.split(' ').filter(Boolean);
  const t0 = Date.now();
  const r = spawnSync('node', [join(tree, s), ...args], { cwd: tree, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, TZ: process.env.TZ || 'UTC' } });
  const out = (r.stdout || '') + (r.stderr || '');
  writeFileSync(join(outDir, basename(s) + (args.length ? '_' + args.join('_').replace(/[^\w.-]/g, '') : '') + '.txt'), out);
  const lines = out.split('\n').filter(Boolean);
  console.log(`== ${spec}: exit ${r.status} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  for (const l of lines.filter(l => /✗|Error|error:|FAIL/.test(l)).slice(0, 30)) console.log('   ' + l.slice(0, 500));
  console.log('   ' + (lines[lines.length - 1] || '').slice(0, 300));
  if (r.status) worst = r.status;
}
process.exit(worst);
