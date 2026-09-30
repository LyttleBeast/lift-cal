// s-run: node s-run.mjs <logfile> [--cwd dir] [--tz zone] [--tail N] [--grep re] -- <script> [args...]
// Spawns node on <script>, writes its whole output to <logfile>, prints exit code, tail and matching lines.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const argv = process.argv.slice(2);
const log = argv.shift();
const sep = argv.indexOf('--');
const opts = argv.slice(0, sep), rest = argv.slice(sep + 1);
const o = (f, d) => { const i = opts.indexOf(f); return i >= 0 ? opts[i + 1] : d; };
const env = { ...process.env };
if (o('--tz')) env.TZ = o('--tz');
const r = spawnSync(process.execPath, rest, { cwd: o('--cwd', process.cwd()), env, encoding: 'utf8', maxBuffer: 1 << 30 });
const out = (r.stdout || '') + (r.stderr || '');
mkdirSync(dirname(log), { recursive: true });
writeFileSync(log, out);
const lines = out.split('\n');
console.log('exit ' + r.status + (r.signal ? ' signal ' + r.signal : '') + ' — ' + lines.length + ' lines in ' + log);
const g = o('--grep');
if (g) { const re = new RegExp(g); lines.filter(l => re.test(l)).slice(0, 200).forEach(l => console.log('  | ' + l)); }
const n = +o('--tail', 15);
if (n) { console.log('--- tail'); console.log(lines.slice(-n).join('\n')); }
