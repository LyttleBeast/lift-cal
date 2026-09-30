// e2-run.mjs <repo> <outDir> <name...> — run named tools-check verifiers (TZ from env,
// default UTC) with cwd = repo, write each one's output to <outDir>/<name>.out, print
// "<exit> <name>". No shell, no redirects.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const [repo, out, ...names] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
for (const n of names) {
  const f = n.endsWith('.mjs') ? n : n + '.mjs';
  const r = spawnSync(process.execPath, ['tools-check/' + f], { cwd: repo, encoding: 'utf8', maxBuffer: 1 << 28,
    env: { ...process.env, TZ: process.env.TZ || 'UTC' }, timeout: 9 * 60e3 });
  writeFileSync(join(out, f.replace(/\.mjs$/, '.out')), (r.stdout || '') + (r.stderr || ''));
  console.log(r.status + ' ' + f);
}
