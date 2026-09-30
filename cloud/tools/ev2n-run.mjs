// Run one node verifier in a tree, keep its whole output under
// ~/dev/vibes-night/runs/ev2-native/, and print only its failing lines and
// its summary. Usage: node ev2n-run.mjs <tree> <script.mjs> [args...]
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
const [tree, script, ...args] = process.argv.slice(2);
const OUT = '/Users/micahflunker/dev/vibes-night/runs/ev2-native';
mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const r = spawnSync(process.execPath, [script, ...args], { cwd: tree, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, ...(process.env.RUN_TZ ? { TZ: process.env.RUN_TZ } : {}) } });
const text = (r.stdout || '') + (r.stderr || '');
const file = join(OUT, basename(script).replace(/\.mjs$/, '') + (args.length ? '-' + args.join('_').replace(/[^\w-]/g, '') : '') + '.txt');
writeFileSync(file, text);
const lines = text.split('\n');
const bad = lines.filter(l => /✗|FAIL|Error|error:|not ok|failed/i.test(l) && !/0 failed/.test(l));
console.log(bad.slice(0, Number(process.env.SHOW || 40)).join('\n'));
console.log('--- exit', r.status, 'in', ((Date.now() - t0) / 1000).toFixed(1) + 's; full output', file);
console.log(lines.filter(l => /passed|checks|✓.*\d+ passed/.test(l)).slice(-3).join('\n'));
