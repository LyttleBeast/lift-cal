// ev3c-run.mjs <cwd> <script> [args...] : run `node <script>` in <cwd> (TZ=UTC), print failing lines and the summary.
import { spawnSync } from 'node:child_process';
const [cwd, script, ...args] = process.argv.slice(2);
const r = spawnSync('node', [script, ...args], { cwd, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, TZ: 'UTC' } });
const out = (r.stdout || '') + (r.stderr || '');
const lines = out.split('\n');
const hits = lines.filter(l => /✗|FAIL|Error|error|failed|passed|checks\b|^\s+at /.test(l));
console.log(hits.slice(0, 80).join('\n'));
console.log(`exit ${r.status}`);
