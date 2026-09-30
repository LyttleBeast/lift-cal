// ia-rs10-fitloop.mjs <logFile> <prove args...> — runs prove.mjs from the web
// harness tree, and runs it again (up to 4 tries) only when it gave up waiting
// for the harness lock. Every try's output is appended to logFile.
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const [log, ...args] = process.argv.slice(2);
mkdirSync(dirname(log), { recursive: true });
const cwd = '/Users/micahflunker/dev/vibes-night/wt/web-harness';
for (let i = 1; i <= 4; i++) {
  appendFileSync(log, '=== try ' + i + ' ' + new Date().toISOString() + '\n');
  const r = spawnSync('node', ['report/btn-44/prove.mjs', ...args], { cwd, encoding: 'utf8', maxBuffer: 1 << 28 });
  const out = (r.stdout || '') + (r.stderr || '');
  appendFileSync(log, out + '\n=== exit ' + r.status + '\n');
  if (!(r.status === 1 && /lock: .* held by live pid .* for over/.test(out))) { console.log('DONE exit', r.status); process.exit(r.status || 0); }
}
console.log('GAVE UP after 4 lock timeouts');
process.exit(1);
