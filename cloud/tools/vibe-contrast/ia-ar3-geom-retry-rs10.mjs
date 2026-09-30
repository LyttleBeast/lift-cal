// Iron Age contrast, round after-revise-3-rs10: ia-r3-geom-rs9.mjs waits 45 min
// for the harness lock and gives up; the queue tonight is longer. Run it again
// until it exits 0, at most five times.
//   node ia-ar3-geom-retry-rs10.mjs <args passed through>
import { spawnSync } from 'node:child_process';
const GEOM = new URL('./ia-r3-geom-rs9.mjs', import.meta.url).pathname;
for (let i = 1; i <= 5; i++) {
  console.log('attempt ' + i + ' ' + new Date().toISOString());
  const r = spawnSync(process.execPath, [GEOM, ...process.argv.slice(2)], { stdio: 'inherit' });
  console.log('attempt ' + i + ' exit ' + r.status);
  if (r.status === 0) process.exit(0);
}
process.exit(1);
