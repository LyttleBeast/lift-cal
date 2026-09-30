// ev3k: independent tally of one proof run. Prints each distinct attribute
// difference (attr, A, B, element path tail), whether any list is truncated,
// pixel regions, css/file diffs, totals.
import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync(`/Users/micahflunker/dev/vibes-night/proof/${process.argv[2]}/summary.json`, 'utf8'));
const distinct = new Map(); let truncated = 0, n = 0;
const sample = Object.values(j.scenes)[0].attrDiffs.first[0];
console.log('diff shape:', JSON.stringify(sample).slice(0, 300));
for (const [k, s] of Object.entries(j.scenes)) {
  const ad = s.attrDiffs || { count: 0, first: [] };
  if (ad.first.length < ad.count) truncated++;
  for (const d of ad.first) {
    n++;
    const path = String(d.path || d.el || d.sel || '').split(/\s*>\s*/).slice(-2).join(' > ');
    const key = [d.attr, JSON.stringify(d.A), JSON.stringify(d.B), path].join(' | ');
    distinct.set(key, (distinct.get(key) || 0) + 1);
  }
  if (!s.pixelsEqual) console.log('PX', k, s.diffPixels, JSON.stringify((s.diffRegions || []).map(d => d.css)));
}
console.log('attr diffs listed', n, 'truncated scenes', truncated);
for (const [k, c] of [...distinct].sort()) console.log('  ' + c + 'x ' + k);
console.log('css', JSON.stringify(j.checks.css.first.map(c => [c.file, c.prop, c.A, c.B])));
console.log('files', JSON.stringify(j.checks.files.diffs.map(d => d.path)));
console.log('totals', JSON.stringify(j.totals), 'verdict', j.verdict, 'A', j.A.sha.slice(0, 7), 'B', j.B.sha.slice(0, 7), 'vibe', j.vibe, 'dataVibe', j.dataVibe, 'widths', j.widths, 'provenance clean', j.provenance && j.provenance.clean);
