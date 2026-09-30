// Ledger v1 gate (g1-d1), native: runs one native verifier in the ledger
// worktree (TZ UTC unless set) and writes stdout+stderr to
// proof/v-ledger-v1gate-g1-d1/nat/<name>.txt.
// Usage: node ledger-v1g-g1-d1-nat.mjs <name> <tools/verify-x.mjs> [args…]
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const W = '/Users/micahflunker/dev/vibes-night/wt/nat-v-ledger';
const O = '/Users/micahflunker/dev/vibes-night/proof/v-ledger-v1gate-g1-d1/nat';
mkdirSync(O, { recursive: true });
const [name, script, ...rest] = process.argv.slice(2);
const r = spawnSync(process.execPath, [script, ...rest], { cwd: W, encoding: 'utf8', maxBuffer: 512 << 20, env: { ...process.env, TZ: process.env.TZ || 'UTC' } });
const txt = (r.stdout || '') + '\n--- stderr ---\n' + (r.stderr || '') + '\nexit ' + r.status + '\n';
writeFileSync(O + '/' + name + '.txt', txt);
console.log(name + ' exit ' + r.status);
console.log(txt.trim().split('\n').filter(l => /✗|FAIL|passed|require/i.test(l)).slice(-15).join('\n'));
