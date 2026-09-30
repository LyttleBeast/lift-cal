// Run verify-rate-band in base and engine under one zone, back to back, and
// compare their failing lines.  node pnat-fix1-rateband.mjs [zone]
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const zone = process.argv[2] || 'Pacific/Auckland';
const OUT = '/Users/micahflunker/dev/vibes-night/proof/pnat-fix1/rateband';
mkdirSync(OUT, { recursive: true });
const trees = { base: '/Users/micahflunker/dev/vibes-night/wt/nat-base', engine: '/Users/micahflunker/dev/vibes-night/wt/nat-engine' };
const res = {};
for (const [k, root] of Object.entries(trees)) {
  const r = spawnSync(process.execPath, ['tools/verify-rate-band.mjs'], { cwd: root, env: { ...process.env, TZ: zone }, encoding: 'utf8' });
  const text = (r.stdout || '') + (r.stderr || '');
  writeFileSync(OUT + '/' + k + '-' + zone.replace(/\//g, '_') + '.log', text);
  const bad = text.split('\n').filter(l => /✗|FAIL|not ok|fail:/i.test(l) && !/0 fail/i.test(l));
  const tail = text.trim().split('\n').slice(-2).join(' | ');
  res[k] = { code: r.status, bad, tail };
  console.log(k + ' exit ' + r.status + ', ' + bad.length + ' failing lines; ' + tail);
}
const same = JSON.stringify(res.base.bad) === JSON.stringify(res.engine.bad);
console.log('same failing lines in base and engine: ' + same);
if (!same) { console.log('base:\n' + res.base.bad.join('\n') + '\nengine:\n' + res.engine.bad.join('\n')); }
else console.log(res.base.bad.join('\n'));
