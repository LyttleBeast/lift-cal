// pnat-run.mjs — run one node script, keep its whole output in a log, print its tail.
// No shell, no redirect: the log is written here.
//
//   node pnat-run.mjs <cwd> <logFile> <tailLines> [TZ=Zone] -- <node args...>
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
if (sep < 3) { console.error('usage: pnat-run.mjs <cwd> <logFile> <tailLines> [TZ=Zone] -- <node args...>'); process.exit(2); }
const [cwd, logFile, tailArg, ...opts] = argv.slice(0, sep);
const args = argv.slice(sep + 1);
const env = { ...process.env };
for (const o of opts) { const m = /^TZ=(.+)$/.exec(o); if (m) env.TZ = m[1]; }
mkdirSync(dirname(logFile), { recursive: true });
const t0 = Date.now();
const p = spawn(process.execPath, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
let out = '';
p.stdout.on('data', d => { out += d; });
p.stderr.on('data', d => { out += d; });
p.on('close', code => {
  const ms = Date.now() - t0;
  const head = `# cwd ${cwd}\n# node ${args.join(' ')}\n# TZ ${env.TZ || '(inherited)'}\n# exit ${code} in ${ms} ms\n`;
  writeFileSync(logFile, head + out);
  const lines = out.replace(/\s+$/, '').split('\n');
  const n = +tailArg;
  console.log(`[${lines.length} lines, exit ${code}, ${ms} ms, log ${logFile}]`);
  console.log((n > 0 ? lines.slice(-n) : lines).join('\n'));
  process.exit(code ?? 1);
});
