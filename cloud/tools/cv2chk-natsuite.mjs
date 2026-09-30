// Native verifiers in UTC for the cv2 check; logs written here, not redirected.
import { spawnSync } from 'node:child_process';
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
const N = '/Users/micahflunker/dev/vibes-night/wt/nat-cv2';
const OUT = '/Users/micahflunker/dev/vibes-night/runs/cv2/chk-nat-utc';
mkdirSync(OUT, { recursive: true });
const env = { ...process.env, TZ: 'UTC' };
const skip = new Set((process.argv[2] || '').split(',').filter(Boolean));
let n = 0; const bad = [];
for (const f of readdirSync(N + '/tools').filter(f => /^verify-.*\.mjs$/.test(f)).sort()) {
  if (skip.has(f.replace(/\.mjs$/, ''))) continue;
  const args = f === 'verify-theme-identity.mjs' ? ['--require-build'] : [];
  const r = spawnSync('node', ['tools/' + f, ...args], { cwd: N, env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 540000 });
  writeFileSync(OUT + '/' + f + '.log', (r.stdout || '') + (r.stderr || ''));
  n++; if (r.status !== 0) bad.push(f + ':' + r.status + (r.signal ? '/' + r.signal : ''));
}
console.log('native verifiers', n - bad.length + '/' + n, bad);
