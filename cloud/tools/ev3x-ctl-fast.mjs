// ev3x: start each control the moment harness.lock is free (polling every
// 500 ms), so a chain of other runs does not starve it past acquireLock's 45
// minutes. Arguments as ev3x-ctl.mjs: <runName> <vibe|dv:<v>|none> …
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const LOCK = '/Users/micahflunker/dev/vibes-night/harness.lock';
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const t0 = Date.now();
  while (existsSync(LOCK) && Date.now() - t0 < 3 * 3600e3) await new Promise(r => setTimeout(r, 500));
  const r = spawnSync('node', ['/Users/micahflunker/dev/vibes-night/tools/ev3x-ctl.mjs', args[i], args[i + 1]], { encoding: 'utf8' });
  console.log((r.stdout || '').trim(), 'waited', Math.round((Date.now() - t0) / 1000) + 's');
}
