// S (native) fixer round 3: wait on a run-verifiers.mjs suite. Prints each zone's summary line as
// summary.json records it, and exits when the run has finished (finishedAt) or after `maxMin` minutes.
// usage: node s-nat-fix3-watch.mjs <suite outDir> [maxMin=30]
import fs from 'node:fs';
const [dir, maxArg] = process.argv.slice(2);
const until = Date.now() + (+(maxArg || 30)) * 60e3;
const seen = new Set();
for (;;) {
  let s = null;
  try { s = JSON.parse(fs.readFileSync(dir + '/summary.json', 'utf8')); } catch {}
  if (s) {
    for (const [tz, z] of Object.entries(s.zones || {})) {
      if (seen.has(tz)) continue;
      seen.add(tz);
      console.log(tz + ': verifiers ' + z.pass + '/' + z.total + ', syntax ' + (z.syntaxTotal - z.syntaxFail.length) + '/' + z.syntaxTotal +
                  (z.fail.length ? ', FAIL ' + z.fail.map(f => f.f + '=' + f.code).join(' ') : ''));
    }
    if (s.finishedAt) { console.log('suite finished ' + s.finishedAt); process.exit(0); }
  }
  if (Date.now() > until) { console.log('still running after the watch window; zones done: ' + [...seen].join(', ')); process.exit(0); }
  await new Promise(r => setTimeout(r, 15000));
}
