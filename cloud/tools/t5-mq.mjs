// Track 5: print licence header / copyright / repo for families in _meta.json. Usage: node t5-mq.mjs name1 name2 ...
import { readFileSync } from 'node:fs';
const m = JSON.parse(readFileSync('/Users/micahflunker/dev/vibes-night/research/fonts/_meta.json', 'utf8'));
for (const n of process.argv.slice(2)) {
  const r = m[n];
  if (!r) { console.log(n, 'NOT FOUND'); continue; }
  console.log(`${n} | ${r.name} | ${r.license} | ${r.designer} | axes ${r.axes.join(',') || 'static'} | files ${r.files.join(' ')} | repo ${r.repo} @ ${r.commit}\n   OFL head: ${(r.ofl_head || '').slice(0, 400)}\n   RFN: ${r.rfn || 'none'}`);
}
