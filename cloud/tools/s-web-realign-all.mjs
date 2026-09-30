// Run both re-alignments (hub, fixture) at both widths for one prove.mjs run dir.
// Usage: node s-web-realign-all.mjs <runDir>
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
const dir = process.argv[2];
const T = '/Users/micahflunker/dev/vibes-night/tools/';
for (const w of ['390', '320']) {
  const A = s => join(dir, 'A', w, s + '.dump.json.gz'), B = s => join(dir, 'B', w, s + '.dump.json.gz');
  const hub = spawnSync(process.execPath, [T + 's-web-realign.mjs', A('settings-hub'), B('settings-hub'), 'html:1>body:1>div:7', 'html:1>body:1>div:7>div:8'], { encoding: 'utf8' });
  const fx = spawnSync(process.execPath, [T + 's-web-fixture-realign.mjs', A('fixture'), B('fixture'), '(^| )vibes?-'], { encoding: 'utf8' });
  const pick = (s, re) => s.split('\n').filter(l => re.test(l)).join('\n');
  console.log(`== ${w}: settings-hub\n` + pick(hub.stdout + hub.stderr, /inserted subtree|after re-alignment|identical|moved only|anything else|^  >/));
  console.log(`== ${w}: fixture\n` + pick(fx.stdout + fx.stderr, /^fixture:|identical|moved only|anything else/));
}
