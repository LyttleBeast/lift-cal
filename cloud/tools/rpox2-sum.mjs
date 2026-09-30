// rpox2: per-scene nonzero difference counts for a prove run, plus totals and
// the cssDiffs / fileDiffs detail.   node rpox2-sum.mjs <runName> [--kinds a,b]
import { readFileSync } from 'node:fs';
const run = process.argv[2];
const s = JSON.parse(readFileSync(`/Users/micahflunker/dev/vibes-night/proof/${run}/summary.json`, 'utf8'));
const K = ['styleDiffs', 'rectDiffs', 'svgDiffs', 'textDiffs', 'valueDiffs', 'structDiffs', 'attrDiffs', 'headDiffs', 'stateDiffs', 'keyframeDiffs'];
const n = v => (v && typeof v === 'object' ? v.count : v) || 0;
console.log(run, s.verdict, 'A', s.A && (s.A.head || s.A.repo || JSON.stringify(s.A).slice(0, 120)), 'B', s.B && (s.B.head || s.B.repo || JSON.stringify(s.B).slice(0, 120)));
console.log('vibe', s.vibe, 'dataVibe', s.dataVibe);
console.log(JSON.stringify(s.totals));
const agg = {};
for (const x of (Array.isArray(s.scenes) ? s.scenes : Object.values(s.scenes))) {
  const nz = K.filter(k => n(x[k]));
  if (!x.pixelsEqual) nz.push('PIXELS');
  if (x.errors && x.errors.length) nz.push('ERRORS');
  if (!nz.length) continue;
  console.log(x.scene, x.width, nz.map(k => k === 'PIXELS' ? 'px=' + x.diffPixels : k === 'ERRORS' ? 'err' : k + '=' + n(x[k])).join(' '));
}
const c = s.checks || {};
for (const k of Object.keys(c)) {
  const v = c[k];
  const str = JSON.stringify(v);
  console.log('check', k, str.length > 3000 ? str.slice(0, 3000) + '…' : str);
}
