// Iron Age v1 gate, round reproof-rs10: the node-only half. The native v1
// proofs (main's own verify-vibe-v1 against the branch tree, the branch's
// verify-vibe-v1, theme identity --require-build, verify-vibe-switch), then
// both UTC suites. Each log goes to proof/v-iron-age-v1gate-reproof-rs10/.
// Usage: node ia-reproof-rs10-v1-node.mjs
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const NIGHT = '/Users/micahflunker/dev/vibes-night';
const NAT = NIGHT + '/wt/nat-v-iron-age', WEB = NIGHT + '/wt/web-v-iron-age';
const OUT = NIGHT + '/proof/v-iron-age-v1gate-reproof-rs10';
mkdirSync(OUT, { recursive: true });
const run = (name, args, cwd, env = {}) => {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, ...env }, timeout: 40 * 60e3 });
  writeFileSync(OUT + '/' + name + '.log', (r.stdout || '') + (r.stderr || '') + '\nEXIT ' + r.status + ' in ' + Math.round((Date.now() - t0) / 1000) + 's\n');
  console.log(name + ' exit ' + r.status + ' ' + Math.round((Date.now() - t0) / 1000) + 's');
};
run('nat-vibe-v1-mainscript', ['/Users/micahflunker/dev/rack-mobile/tools/verify-vibe-v1.mjs', '--root', NAT], NAT);
run('nat-vibe-v1-branch', [NAT + '/tools/verify-vibe-v1.mjs'], NAT);
run('nat-theme-identity-require-build', [NAT + '/tools/verify-theme-identity.mjs', '--require-build'], NAT, { TZ: 'UTC' });
run('nat-vibe-switch', [NAT + '/tools/verify-vibe-switch.mjs'], NAT);
run('nat-suite-run', [NIGHT + '/tools/run-verifiers.mjs', 'nat', NAT, OUT + '/nat-suite', 'UTC'], NIGHT);
run('web-suite-run', [NIGHT + '/tools/run-verifiers.mjs', 'web', WEB, OUT + '/web-suite', 'UTC'], NIGHT);
console.log('ALL-DONE');
