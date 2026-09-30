// hx-detail: every style/svg/rect/struct diff path of a prove.mjs summary, per scene.
//   node hx-detail.mjs <summary.json>
import { readFileSync } from 'node:fs';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
console.log('verdict', s.verdict, JSON.stringify(s.totals), 'checks', JSON.stringify({ vibeA: s.checks.vibeA, vibeB: s.checks.vibeB }));
for (const [k, x] of Object.entries(s.scenes)) {
  console.log('==', k, 'errors', JSON.stringify(x.errors), 'pixelsEqual', x.pixelsEqual, 'diffPixels', x.diffPixels, 'shots', JSON.stringify(x.shots));
  (x.diffRegions || []).forEach(r => console.log('   region css', JSON.stringify(r.css), 'px', r.pixels));
  for (const b of ['styleDiffs', 'svgDiffs', 'rectDiffs', 'structDiffs', 'textDiffs']) {
    if (!x[b] || !x[b].count) continue;
    console.log('  ', b, x[b].count);
    x[b].first.forEach(d => console.log('     ', JSON.stringify(d).slice(0, 400)));
  }
}
