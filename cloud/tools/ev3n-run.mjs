// ev3n-run.mjs — run one native verifier in a tree and print only its failures and totals.
//   node ev3n-run.mjs <tree> <tools/verify-x.mjs> [TZ=UTC] [--all] [extra args…]
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
const [tree, script, ...rest] = process.argv.slice(2);
const all = rest.includes('--all');
const tzArg = rest.find(a => a.startsWith('TZ='));
const extra = rest.filter(a => a !== '--all' && a !== tzArg);
const tz = tzArg ? tzArg.slice(3) : 'UTC';
const r = spawnSync(process.execPath, [script, ...extra], { cwd: tree, env: { ...process.env, TZ: tz }, encoding: 'utf8', maxBuffer: 1 << 28 });
const out = (r.stdout || '') + (r.stderr || '');
const dir = '/Users/micahflunker/dev/vibes-night/tmp/ev3n';
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, basename(script) + '.log'), out);
const lines = out.split('\n');
console.log(all ? out : lines.filter(x => /✗|FAIL|passed|failed|Error|error:|throw/i.test(x)).slice(0, 80).join('\n'));
console.log('exit', r.status);
