// N3 scratch: run verifiers in a tree under a zone and show only what matters
// (failures, summaries, errors) — no pipes allowed in this session.
// usage: node n3-run.mjs <tree> <zone> <verifier.mjs> [more...] [-- args for each]
import { spawnSync } from 'node:child_process';
const [tree, zone, ...rest] = process.argv.slice(2);
const dd = rest.indexOf('--');
const files = dd >= 0 ? rest.slice(0, dd) : rest;
const extra = dd >= 0 ? rest.slice(dd + 1) : [];
let bad = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [f, ...extra], { cwd: tree, env: { ...process.env, TZ: zone }, encoding: 'utf8', maxBuffer: 1 << 28 });
  const lines = (r.stdout + '\n' + r.stderr).split('\n');
  const keep = lines.filter(l => /✗|FAIL|fail|Error|error|passed|failed|threw|✘|not ok|BAD|bad\(/.test(l) && !/^\s*✓/.test(l));
  console.log('=== ' + f + ' exit ' + r.status + (r.signal ? ' signal ' + r.signal : ''));
  keep.slice(0, 60).forEach(l => console.log('  ' + l.slice(0, 400)));
  if (keep.length > 60) console.log('  … ' + (keep.length - 60) + ' more');
  if (r.status !== 0) bad++;
}
process.exit(bad ? 1 : 0);
