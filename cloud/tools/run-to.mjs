// run-to.mjs <outFile> <cwd> <cmd> [args...] — run a command, write its stdout+stderr to outFile, print exit code and tail.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const [out, cwd, cmd, ...args] = process.argv.slice(2);
const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env } });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, (r.stdout || '') + (r.stderr || ''));
const lines = ((r.stdout || '') + (r.stderr || '')).trimEnd().split('\n');
console.log('EXIT', r.status, 'lines', lines.length);
console.log(lines.slice(-40).join('\n'));
