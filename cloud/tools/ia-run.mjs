// Run a node verifier in a tree, save its full output, print the failures and the tail.
// usage: node ia-run.mjs <cwd> <outfile> <script> [args...]
// env passes through (set TZ outside if wanted).
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const [cwd, out, ...cmd] = process.argv.slice(2);
const t0 = Date.now();
const r = spawnSync(process.execPath, cmd, { cwd, env: process.env, encoding: 'utf8', maxBuffer: 1 << 28 });
const all = (r.stdout || '') + (r.stderr || '');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, all);
const lines = all.split('\n');
const bad = lines.filter(l => /✗|FAIL|Error|error:|threw/.test(l));
console.log(bad.slice(0, 60).map(l => l.slice(0, 900)).join('\n'));
console.log('--- tail');
console.log(lines.slice(-4).join('\n'));
console.log('exit', r.status, 'in', Math.round((Date.now() - t0) / 1000) + 's', '->', out);
