#!/usr/bin/env node
/* Compare two rr3-bootnav outputs step by step: renders, navigation, mounts,
 * recorded native calls, React errors, and every host in the dump, byte for
 * byte (canonical JSON). The vibe version field is ignored (base has none).
 * Usage: node rr3-bootnav-cmp.mjs <base.json> <engine.json> */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [a, b] = process.argv.slice(2).map(f => JSON.parse(readFileSync(f, 'utf8')));
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map(k2 => [k2, x[k2]])) : x));
const sha = s => createHash('sha256').update(s).digest('hex').slice(0, 16);
let diffs = 0;
if (a.steps.length !== b.steps.length) { console.log('step count differs: ' + a.steps.length + ' vs ' + b.steps.length); diffs++; }
for (let i = 0; i < Math.min(a.steps.length, b.steps.length); i++) {
  const x = a.steps[i], y = b.steps[i];
  const fields = ['name', 'renders', 'replaces', 'navigates', 'paths', 'mounts', 'calls', 'reactErrors', 'errors', 'path', 'hosts', 'resting'];
  const bad = fields.filter(f => canon(x[f]) !== canon(y[f]));
  const dx = canon(x.dump), dy = canon(y.dump);
  let hostDiff = [];
  if (dx !== dy) {
    const n = Math.max(x.dump.length, y.dump.length);
    for (let j = 0; j < n && hostDiff.length < 5; j++) {
      if (canon(x.dump[j]) !== canon(y.dump[j])) hostDiff.push('#' + j + ' base ' + canon(x.dump[j]).slice(0, 220) + '\n        engine ' + canon(y.dump[j]).slice(0, 220));
    }
  }
  const ok = !bad.length && dx === dy;
  if (!ok) diffs++;
  console.log((ok ? '  = ' : '  ≠ ') + x.name.padEnd(18) + ' hosts ' + x.dump.length + '/' + y.dump.length +
              ' dump ' + sha(dx) + (dx === dy ? '' : ' vs ' + sha(dy)) + ' calls ' + sha(canon(x.calls)) +
              (bad.length ? '  differing: ' + bad.join(', ') : ''));
  for (const f of bad) console.log('      ' + f + ': ' + canon(x[f]).slice(0, 300) + '  vs  ' + canon(y[f]).slice(0, 300));
  for (const l of hostDiff) console.log('      ' + l);
}
console.log('totals base ' + canon(a.totals) + '\n       eng  ' + canon(b.totals));
if (canon(a.totals) !== canon(b.totals)) diffs++;
console.log(diffs ? diffs + ' step(s) differ' : 'identical: every step, every host, every call');
process.exit(diffs ? 1 : 0);
