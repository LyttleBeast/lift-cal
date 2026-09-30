// Clear sky v1 gate (round 1-d1, agent g1), native: runs one native verifier in
// the clear-sky worktree (TZ UTC unless set) and writes its stdout+stderr to
// proof/v-clear-sky-v1gate-g1-d1/nat/<name>.txt.
// Usage: node clear-sky-v1g-g1-d1-nat.mjs <name> <tools/verify-x.mjs> [args…]
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const W = '/Users/micahflunker/dev/vibes-night/wt/nat-v-clear-sky';
const O = '/Users/micahflunker/dev/vibes-night/proof/v-clear-sky-v1gate-g1-d1/nat';
mkdirSync(O, { recursive: true });
const [name, script, ...rest] = process.argv.slice(2);
const r = spawnSync(process.execPath, [script, ...rest], { cwd: W, encoding: 'utf8', maxBuffer: 512 << 20, env: { ...process.env, TZ: process.env.TZ || 'UTC' } });
const txt = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '') + '\nexit ' + r.status + '\n';
writeFileSync(O + '/' + name + '.txt', txt);
const lines = txt.trim().split('\n');
console.log(name + ' exit ' + r.status);
console.log(lines.filter(l => /✗|FAIL|fail|passed|re-baselined|overlay|clear-sky/i.test(l)).slice(-40).join('\n'));
