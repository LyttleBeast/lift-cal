// Web suite in UTC for the cv2 check: syntax of every *.js, then every tools-check/*.mjs.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-cv2';
const OUT = '/Users/micahflunker/dev/vibes-night/runs/cv2/chk-web-utc';
mkdirSync(OUT, { recursive: true });
const env = { ...process.env, TZ: 'UTC' };
let syn = 0, synBad = [];
for (const f of readdirSync(W).filter(f => f.endsWith('.js'))) {
  const r = spawnSync('node', ['--check', '--input-type=module'], { input: readFileSync(W + '/' + f), env });
  syn++; if (r.status !== 0) synBad.push(f);
}
console.log('syntax', syn - synBad.length + '/' + syn, synBad);
const only = process.argv[2];
let n = 0, bad = [];
for (const f of readdirSync(W + '/tools-check').filter(f => f.endsWith('.mjs') && (!only || f.includes(only))).sort()) {
  const r = spawnSync('node', ['tools-check/' + f], { cwd: W, env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 300000 });
  writeFileSync(OUT + '/' + f + '.log', (r.stdout || '') + (r.stderr || ''));
  n++; if (r.status !== 0) bad.push(f + ':' + r.status);
}
console.log('verifiers', n - bad.length + '/' + n, bad);
