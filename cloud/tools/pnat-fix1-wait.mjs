// Wait on a run-verifiers output dir: print each zone's line as it lands, exit
// when summary.json has finishedAt (or after the deadline).  node pnat-fix1-wait.mjs <outDir> [minutes]
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [dir, mins] = process.argv.slice(2);
const end = Date.now() + (+(mins || 28)) * 60e3;
const seen = new Set();
for (;;) {
  const f = join(dir, 'summary.json');
  if (existsSync(f)) {
    let s = null; try { s = JSON.parse(readFileSync(f, 'utf8')); } catch {}
    if (s) {
      for (const [tz, z] of Object.entries(s.zones || {})) {
        if (seen.has(tz)) continue; seen.add(tz);
        console.log(tz + ': ' + z.pass + '/' + z.total + (z.fail.length ? ' FAIL ' + z.fail.map(x => x.f + '=' + x.code).join(' ') : ''));
      }
      if (s.finishedAt) { console.log('finished ' + s.finishedAt); process.exit(0); }
    }
  }
  if (Date.now() > end) { console.log('still running at the deadline'); process.exit(2); }
  await new Promise(r => setTimeout(r, 10000));
}
