// Tally a prove.mjs run: every attribute difference must be one of engine v3's
// hooks (data-lead / data-hero / data-tag, absent on A); list pixel diffs and css/file diffs.
// node ev3w-tally.mjs <runName>
import { readFileSync } from 'node:fs';
const run = process.argv[2];
const s = JSON.parse(readFileSync(`/Users/micahflunker/dev/vibes-night/proof/${run}/summary.json`, 'utf8'));
let tot = 0, shown = 0; const bad = [], trunc = [], byAttr = {}, other = {};
for (const c of Object.values(s.scenes)) {
  const a = c.attrDiffs; tot += a.count; shown += a.first.length;
  if (a.first.length < a.count) trunc.push(`${c.scene}@${c.width} ${a.count}/${a.first.length}`);
  for (const d of a.first) {
    const k = d.attr + '=' + JSON.stringify(d.B); byAttr[k] = (byAttr[k] || 0) + 1;
    if (!/^data-(lead|hero|tag)$/.test(d.attr) || d.A !== null) bad.push(c.scene + ' ' + JSON.stringify(d));
  }
  for (const kind of ['styleDiffs', 'rectDiffs', 'svgDiffs', 'textDiffs', 'valueDiffs', 'structDiffs', 'headDiffs', 'stateDiffs', 'keyframeDiffs'])
    if (c[kind] && c[kind].count) other[kind] = (other[kind] || 0) + c[kind].count;
  if (!c.pixelsEqual) console.log('PX', c.scene, c.width, c.diffPixels, JSON.stringify(c.diffRegions), JSON.stringify(c.info).slice(0, 600));
}
console.log('totals', JSON.stringify(s.totals));
console.log('attr total', tot, 'shown', shown, 'not a v3 hook', bad.length, bad.slice(0, 5));
console.log('by attr', byAttr);
console.log('truncated scenes', trunc.length, trunc.slice(0, 8));
console.log('other per-scene diffs', other);
console.log('css', JSON.stringify(s.checks.css.first.map(x => [x.file, x.rule, x.prop, x.A, x.B])));
console.log('files', JSON.stringify(s.checks.files.diffs.map(x => [x.path, x.why])));
console.log('verdict', JSON.stringify(s.verdict).slice(0, 1200));
