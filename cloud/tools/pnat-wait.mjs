// pnat-wait.mjs — print each zone of a run-verifiers summary as it lands; exit when finished.
//   node pnat-wait.mjs <runDir> [maxMinutes=40]
import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
const [dir, maxArg] = process.argv.slice(2);
const until = Date.now() + (+(maxArg || 40)) * 60e3;
const seen = new Set();
for (;;) {
  const f = join(dir, 'summary.json');
  if (existsSync(f)) {
    let s = null;
    try { s = JSON.parse(readFileSync(f, 'utf8')); } catch {}
    if (s && s.startedAt && s.startedAt >= '2026-09-26T19:') {
      for (const [z, v] of Object.entries(s.zones || {})) {
        if (seen.has(z)) continue;
        seen.add(z);
        console.log(`${z}: ${v.pass}/${v.total}` + (v.fail.length ? ' FAIL ' + v.fail.map(x => basename(x.f) + '=' + x.code).join(' ') : ''));
      }
      if (s.finishedAt) { console.log('FINISHED ' + s.finishedAt); process.exit(0); }
    }
  }
  if (Date.now() > until) { console.log('GAVE UP WAITING'); process.exit(1); }
  await new Promise(r => setTimeout(r, 5000));
}
