// ev3x: account for every difference in a prove.mjs summary, compactly.
// The fixture scene is left to ev3x-fixture-realign.mjs (listed, not judged
// here); every other scene's difference that is not an engine v3 data-* hook
// absent on A is printed as UNEXPECTED.
//   node ev3x-analyze.mjs <runName>
import { readFileSync } from 'node:fs';
const run = process.argv[2];
const s = JSON.parse(readFileSync(`/Users/micahflunker/dev/vibes-night/proof/${run}/summary.json`, 'utf8'));
console.log('RUN', run, 'verdict', s.verdict, 'A', s.A.sha.slice(0, 7), 'dirty', s.A.dirty, 'B', s.B.sha.slice(0, 7), 'dirty', s.B.dirty, 'vibe', s.vibe, 'dataVibe', s.dataVibe, 'widths', s.widths, 'provenance clean', s.provenance && s.provenance.clean, 'harness', s.harness && s.harness.sha.slice(0, 7), 'dirty', s.harness && s.harness.dirty);
console.log('TOTALS', JSON.stringify(s.totals));
const kinds = ['styleDiffs', 'rectDiffs', 'svgDiffs', 'textDiffs', 'valueDiffs', 'structDiffs', 'attrDiffs'];
const attrSig = new Map(), unexpected = [], pixels = [];
let scenes = 0;
for (const [k, r] of Object.entries(s.scenes)) {
  scenes++;
  if (r.error || r.skipped) unexpected.push(k + ' ' + (r.error || 'skipped ' + r.skipped));
  if (!r.pixelsEqual) pixels.push(k + ' ' + r.diffPixels + 'px ' + JSON.stringify((r.diffRegions || []).map(g => g.css)));
  const fixture = k.startsWith('fixture@');
  for (const kind of kinds) {
    const d = r[kind];
    if (!d || !d.count) continue;
    if (fixture) continue;
    if (kind !== 'attrDiffs') { unexpected.push(k + ' ' + kind + ' ' + d.count + ' ' + JSON.stringify(d.first.slice(0, 3))); continue; }
    if (d.first.length < d.count) unexpected.push(k + ' attr list truncated ' + d.first.length + '/' + d.count);
    for (const a of d.first) {
      const sig = a.attr + ' A=' + JSON.stringify(a.A) + ' B=' + JSON.stringify(a.B);
      attrSig.set(sig, (attrSig.get(sig) || 0) + 1);
      if (!(['data-hero', 'data-lead', 'data-tag'].includes(a.attr) && a.A === null)) unexpected.push(k + ' attr ' + JSON.stringify(a));
    }
  }
  for (const x of ['headDiffs', 'stateDiffs', 'keyframeDiffs', 'requestDiffs']) if (!fixture && r[x] && r[x].count) unexpected.push(k + ' ' + x + ' ' + JSON.stringify(r[x]).slice(0, 300));
  if (r.dumpDiffs && r.dumpDiffs.length) unexpected.push(k + ' dumpDiffs ' + JSON.stringify(r.dumpDiffs).slice(0, 300));
}
console.log('scene×width entries', scenes);
console.log('attr signatures (non-fixture):');
for (const [sig, n] of attrSig) console.log('  ', n, sig);
const c = s.checks.css;
console.log('css count', c.count, 'onlyA', JSON.stringify(c.onlyA), 'onlyB', JSON.stringify(c.onlyB), 'tokensOnlyB', c.tokensOnlyB, 'rulesDifferingInText', c.rulesDifferingInText);
for (const [f, v] of Object.entries(c.files)) console.log('  ', f, JSON.stringify(v));
for (const x of c.first) console.log('  CSS', x.rule, x.prop, 'A', x.A, 'B', x.B);
console.log('files compared', s.checks.files.compared, 'onlyA', JSON.stringify(s.checks.files.onlyA), 'onlyB', JSON.stringify(s.checks.files.onlyB));
for (const f of s.checks.files.diffs) console.log('  FILE', f.path, f.why);
console.log('requests onlyA/onlyB', JSON.stringify(s.requests && { onlyA: s.requests.onlyA, onlyB: s.requests.onlyB }));
console.log('coverage', JSON.stringify({ inScenes: s.coverage.inScenes, onlyFixture: s.coverage.onlyFixture, textOnly: s.coverage.textOnly, droppedByChrome: s.coverage.droppedByChrome }));
console.log('PIXELS', pixels.length);
for (const p of pixels) console.log('  ~', p);
console.log('UNEXPECTED (non-fixture)', unexpected.length);
for (const u of unexpected) console.log('  !', u);
