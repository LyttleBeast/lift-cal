// Print the distinct sites (host type, label, prop path) of one base value -> role pair
// from analysis.json, scene names folded away. Usage: node pnat-rev-query.mjs '<base>' '<role>' [section]
import { readFileSync } from 'node:fs';
const A = JSON.parse(readFileSync('/Users/micahflunker/dev/vibes-night/tmp/pnat-rev-theme/analysis.json', 'utf8'));
const [base, role, section] = process.argv.slice(2);
let sites;
if (section) sites = (A[section][base] || {}).sample || A[section] || [];
else sites = ((A.pairs[base] || {})[role] || {}).sites || [];
const sig = s => s.replace(/^\[[^\]]*? #\d+ /, '[').replace(/\s+/g, ' ');
const m = new Map();
for (const s of sites) { const k = sig(s); if (!m.has(k)) m.set(k, { n: 0, ex: s }); m.get(k).n++; }
for (const [k, v] of [...m.entries()].sort()) console.log(v.n + '\t' + k + '\t<< ' + v.ex.slice(0, 90));
