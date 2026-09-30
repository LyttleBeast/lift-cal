// N3 scratch: wait for a run-verifiers summary.json to finish, printing each zone as it lands.
// usage: node n3-wait.mjs <outDir>
import fs from 'node:fs';
const f = process.argv[2] + '/summary.json';
const seen = new Set();
for (;;) {
  let s = null;
  try { s = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
  if (s) {
    for (const [z, v] of Object.entries(s.zones || {})) {
      if (seen.has(z)) continue; seen.add(z);
      const failed = Object.entries(v.results || v).filter(([, r]) => r && typeof r === 'object' && (r.code !== 0 && r.exit !== 0 && r.status !== 0)).map(([k]) => k);
      console.log(z + ': ' + JSON.stringify({ pass: v.pass, fail: v.fail, total: v.total }) + (failed.length ? ' failed: ' + failed.join(', ') : ''));
    }
    if (s.finishedAt) { console.log('finished ' + s.finishedAt); process.exit(0); }
  }
  await new Promise(r => setTimeout(r, 15000));
}
