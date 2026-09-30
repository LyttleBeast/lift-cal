// Print a scene's stateDiffs (and the head/css/request/file checks) from a prove.mjs summary, in full.
// Usage: node s-web-statediffs.mjs <runDir> <scene@w>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const [dir, key] = process.argv.slice(2);
const s = JSON.parse(readFileSync(join(dir, 'summary.json'), 'utf8'));
const v = s.scenes[key];
console.log(key + ' stateDiffs ' + v.stateDiffs.count);
for (const e of v.stateDiffs.first) console.log('  ' + JSON.stringify(e).slice(0, 300));
console.log('requests only B: ' + JSON.stringify((s.requests || {}).onlyB || (s.requests || {}).diff || null));
console.log('headDiffs total ' + s.totals.headDiffs + ', fileDiffs ' + s.totals.fileDiffs + ', requestDiffs ' + s.totals.requestDiffs + ', keyframeDiffs ' + s.totals.keyframeDiffs);
const r = s.requests || {};
const A = new Set(r.A || []), B = new Set(r.B || []);
console.log('asked by B only: ' + [...B].filter(x => !A.has(x)).join(', '));
console.log('asked by A only: ' + [...A].filter(x => !B.has(x)).join(', '));
