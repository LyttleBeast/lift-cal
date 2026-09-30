// Summarise a prove.mjs run: totals, then every scene×width with any difference,
// the kinds and counts, and (with --detail) the first entries of each kind.
// Usage: node s-web-proofsum.mjs <runDir> [--detail] [--scene name@w]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const [dir, ...rest] = process.argv.slice(2);
const detail = rest.includes('--detail');
const only = rest.includes('--scene') ? rest[rest.indexOf('--scene') + 1] : null;
const s = JSON.parse(readFileSync(join(dir, 'summary.json'), 'utf8'));
console.log('verdict:', JSON.stringify(s.verdict));
console.log('dataVibe:', s.dataVibe, 'vibe:', s.vibe);
const t = s.totals;
console.log('totals:', Object.entries(t).filter(([, v]) => v).map(([k, v]) => k + '=' + v).join(' '));
const KINDS = ['styleDiffs', 'rectDiffs', 'svgDiffs', 'textDiffs', 'valueDiffs', 'structDiffs', 'attrDiffs', 'headDiffs', 'stateDiffs', 'keyframeDiffs'];
let same = 0;
for (const [k, v] of Object.entries(s.scenes)) {
  if (only && k !== only) continue;
  const kinds = KINDS.filter(x => v[x] && v[x].count);
  const px = v.pixelsEqual === false || v.diffPixels;
  if (!kinds.length && !px && !v.error) { same++; continue; }
  console.log(`\n${k}: pixels ${v.pixelsEqual ? 'equal' : 'DIFFER ' + v.diffPixels}${v.error ? ' ERROR ' + v.error : ''} elements ${JSON.stringify(v.elements)} ` +
    kinds.map(x => x + '=' + v[x].count).join(' '));
  if (v.diffRegions && v.diffRegions.length) console.log('  regions: ' + JSON.stringify(v.diffRegions).slice(0, 400));
  if (detail) for (const x of kinds) for (const e of (v[x].first || []).slice(0, 12)) console.log('  ' + x + ': ' + JSON.stringify(e).slice(0, 400));
}
console.log(`\n${same} scene×widths identical`);
if (s.checks) {
  for (const [k, v] of Object.entries(s.checks)) console.log('check ' + k + ': ' + JSON.stringify(v).slice(0, detail ? 3000 : 400));
}
if (s.requests) console.log('requests: ' + JSON.stringify(s.requests).slice(0, 1200));
