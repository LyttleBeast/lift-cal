// Print the gist of a prove.mjs summary.json: verdict, trees/heads, totals, and each differing capture.
import { readFileSync } from 'node:fs';
const d = process.argv[2];
const j = JSON.parse(readFileSync(d + '/summary.json', 'utf8'));
const top = {};
for (const [k, v] of Object.entries(j)) {
  if (typeof v !== 'object' || v === null) top[k] = v;
}
console.log('TOP', JSON.stringify(top));
for (const k of ['a', 'b', 'trees', 'heads', 'totals', 'args', 'flags', 'dirty', 'served']) if (j[k] !== undefined) console.log(k.toUpperCase(), JSON.stringify(j[k]).slice(0, 1500));
console.log('KEYS', Object.keys(j).join(','));
const caps = j.captures || j.scenes || j.results || [];
const arr = Array.isArray(caps) ? caps : Object.entries(caps).map(([k, v]) => ({ key: k, ...v }));
let n = 0;
for (const c of arr) {
  const s = JSON.stringify(c);
  if (/"(verdict|status)":"(IDENTICAL|same|ok)"/.test(s)) continue;
  n++;
  if (n <= (+process.argv[3] || 60)) console.log('CAP', s.slice(0, 600));
}
console.log('non-identical captures:', n, 'of', arr.length);
