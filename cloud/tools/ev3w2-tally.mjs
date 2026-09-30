// Tallies one proof run for the engine v3 web check: every attribute
// difference must be one of the three hooks, absent on A; prints the pixel
// regions, the css / file differences, and the totals.
import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync(`/Users/micahflunker/dev/vibes-night/proof/${process.argv[2]}/summary.json`, 'utf8'));
const OK = new Set(['data-hero', 'data-lead', 'data-tag']);
const cnt = {}; const bad = []; let truncated = 0;
for (const [k, s] of Object.entries(j.scenes)) {
  cnt[s.attrDiffs.count] = (cnt[s.attrDiffs.count] || 0) + 1;
  if (s.attrDiffs.first.length < s.attrDiffs.count) truncated++;
  for (const d of s.attrDiffs.first) if (!OK.has(d.attr) || d.A !== null) bad.push([k, d]);
  if (!s.pixelsEqual) console.log('PX', k, s.diffPixels, JSON.stringify(s.diffRegions.map(d => d.css)));
}
console.log('attr counts per scene', JSON.stringify(cnt), 'non-hook attr diffs', bad.length, 'scenes with a truncated list', truncated);
for (const b of bad.slice(0, 10)) console.log('BAD', JSON.stringify(b));
console.log('css', JSON.stringify(j.checks.css.first.map(c => [c.file, c.prop, c.A, c.B])));
console.log('files', JSON.stringify(j.checks.files.diffs.map(d => d.path)));
console.log('totals', JSON.stringify(j.totals), 'verdict', j.verdict, 'A', j.A.sha.slice(0, 7), 'B', j.B.sha.slice(0, 7), 'vibe', j.vibe, 'dataVibe', j.dataVibe);
