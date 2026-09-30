// What small targets of a class the reference has, and its clipped list. Usage: node fit-gate-small.mjs <fit.json> <cls-regex> [scene-regex]
import { readFileSync } from 'node:fs';
const [f, re, sre] = process.argv.slice(2);
const J = JSON.parse(readFileSync(f, 'utf8'));
const r = new RegExp(re), s = sre ? new RegExp(sre) : /./;
for (const [id, x] of Object.entries(J.scenes)) {
  if (x.error || !s.test(id)) continue;
  const sm = x.small.filter(z => r.test(z.cls));
  if (sm.length) console.log(id, 'small', sm.length, sm.slice(0, 4).map(z => z.cls + ' ' + JSON.stringify(z.text) + ' ' + z.w + 'x' + z.h).join(' | '));
  const cl = x.clipped.filter(z => r.test(z.cls));
  if (cl.length) console.log(id, 'clipped/spills', cl.slice(0, 6).map(z => z.how + ' ' + z.cls + ' ' + JSON.stringify(z.text).slice(0, 40) + ' ' + JSON.stringify(z.box) + '→' + JSON.stringify(z.content) + ' clamp ' + z.clamp).join(' | '));
  const w = (x.watch || []).filter(z => r.test(z.cls));
  if (w.length && process.argv[5] === 'watch') console.log(id, 'watch', w.slice(0, 6).map(z => z.cls + ' ' + z.w + 'x' + z.h + ' box ' + JSON.stringify(z.box) + ' content ' + JSON.stringify(z.content)).join(' | '));
}
