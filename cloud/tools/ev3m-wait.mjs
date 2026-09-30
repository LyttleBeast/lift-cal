// Waits (at most 570 s) until every named file exists; prints what is there.
import { existsSync } from 'node:fs';
const want = process.argv.slice(2);
const t0 = Date.now();
while (Date.now() - t0 < 570e3 && !want.every(f => existsSync(f))) await new Promise(r => setTimeout(r, 10000));
for (const f of want) console.log(existsSync(f) ? 'HAVE' : 'MISSING', f);
