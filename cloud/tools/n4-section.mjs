// N4 scratch: run one verifier in a tree under a zone and print the lines from
// the first one matching <from> up to (not including) the first after it
// matching <to> — one section of its report, with no pipes.
// usage: node n4-section.mjs <tree> <zone> <verifier> <from-regex> [to-regex] [-- args]
import { spawnSync } from 'node:child_process';
const [tree, zone, file, from, to, ...rest] = process.argv.slice(2);
const dd = rest.indexOf('--');
const extra = dd >= 0 ? rest.slice(dd + 1) : [];
const r = spawnSync(process.execPath, [file, ...extra], { cwd: tree, env: { ...process.env, TZ: zone }, encoding: 'utf8', maxBuffer: 1 << 28 });
const lines = (r.stdout + '\n' + r.stderr).split('\n');
const a = lines.findIndex(l => new RegExp(from).test(l));
let b = lines.length;
if (a >= 0 && to) { const k = lines.slice(a + 1).findIndex(l => new RegExp(to).test(l)); if (k >= 0) b = a + 1 + k; }
console.log((a >= 0 ? lines.slice(a, b) : ['(no line matches ' + from + ')']).map(l => l.slice(0, 600)).join('\n'));
console.log('exit', r.status);
