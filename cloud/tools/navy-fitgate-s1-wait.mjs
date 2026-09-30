// Wait (up to 50 min) until both gate fit.json files exist, or a run log shows an error.
import { existsSync, readFileSync } from 'node:fs';
const P = '/Users/micahflunker/dev/vibes-night/proof/';
const runs = ['v-navy-fitgate-v1ref-s1', 'v-navy-fitgate-s1'];
const t0 = Date.now();
const MIN = +(process.argv[2] || 50);
while (Date.now() - t0 < MIN * 60e3) {
  const done = runs.filter(r => existsSync(P + r + '/fit.json'));
  if (done.length === runs.length) { console.log('both done'); process.exit(0); }
  await new Promise(r => setTimeout(r, 15000));
}
console.log('timeout');
