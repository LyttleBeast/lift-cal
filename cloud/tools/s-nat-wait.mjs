// s-nat-wait: node s-nat-wait.mjs <summary.json> <zones count>
// Prints one line per finished zone of a run-verifiers summary, exits when all are done (or after 40 min).
import { readFileSync, existsSync } from 'node:fs';
const [file, n] = process.argv.slice(2);
const seen = new Set();
const t0 = Date.now();
const tick = () => {
  if (existsSync(file)) {
    try {
      const s = JSON.parse(readFileSync(file, 'utf8'));
      for (const [z, v] of Object.entries(s.zones || {})) {
        if (seen.has(z)) continue;
        seen.add(z);
        console.log(z + ': ' + v.pass + '/' + v.total + (v.fail.length ? ' FAIL ' + v.fail.map(f => f.f.split('/').pop() + '=' + f.code).join(' ') : ''));
      }
      if (seen.size >= +n || s.finishedAt) { console.log('done'); process.exit(0); }
    } catch {}
  }
  if (Date.now() - t0 > 40 * 60e3) { console.log('gave up waiting'); process.exit(1); }
  setTimeout(tick, 15000);
};
tick();
