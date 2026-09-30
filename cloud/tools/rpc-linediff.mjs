// Re-prove Chalk helper: lines only in file A / only in file B (multiset), in order.
//   node rpc-linediff.mjs <a> <b>
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2).map(f => readFileSync(f, 'utf8').split('\n'));
const count = l => { const m = new Map(); for (const x of l) m.set(x, (m.get(x) || 0) + 1); return m; };
const ca = count(a), cb = count(b);
const only = (l, mine, other, tag) => { const used = new Map(); for (const x of l) { const u = (used.get(x) || 0) + 1; used.set(x, u); if (u > (other.get(x) || 0)) console.log(tag + ' ' + x.slice(0, 300)); } };
only(a, ca, cb, '<');
only(b, cb, ca, '>');
