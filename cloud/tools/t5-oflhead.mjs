// Track 5: print the header (before the licence body) of each OFL.txt given, to check copyright + Reserved Font Name.
import { readFileSync } from 'node:fs';
for (const p of process.argv.slice(2)) {
  const t = readFileSync(p, 'utf8');
  const head = t.split(/This Font Software is licensed under/i)[0].replace(/\s+/g, ' ').trim();
  const rfn = /reserved\s+font\s+names?/i.test(head);
  console.log(`${p.split('/research/fonts/')[1]} | RFN: ${rfn ? 'YES' : 'none'} | ${head.slice(0, 260)}`);
}
