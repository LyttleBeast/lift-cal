// ev3m: account for every difference in a prove.mjs summary.
//   node ev3m-analyze.mjs <runName>
import { readFileSync } from 'node:fs';
const run = process.argv[2];
const s = JSON.parse(readFileSync(`/Users/micahflunker/dev/vibes-night/proof/${run}/summary.json`, 'utf8'));
console.log('RUN', run, 'verdict', s.verdict, 'A', s.A.sha.slice(0, 7), s.A.dirty, 'B', s.B.sha.slice(0, 7), s.B.dirty, 'vibe', s.vibe, 'dataVibe', s.dataVibe, 'widths', s.widths, 'provenance clean', s.provenance && s.provenance.clean);
console.log('harness', s.harness && s.harness.sha.slice(0, 7), 'dirty', s.harness && s.harness.dirty);
console.log('TOTALS', JSON.stringify(s.totals));
const kinds = ['styleDiffs', 'rectDiffs', 'svgDiffs', 'textDiffs', 'valueDiffs', 'structDiffs', 'attrDiffs'];
const attrSig = new Map();
const unexpected = [];
let scenes = 0, truncated = 0;
for (const [k, r] of Object.entries(s.scenes)) {
  scenes++;
  if (r.error || r.skipped) unexpected.push(k + ' ' + (r.error || 'skipped ' + r.skipped));
  if (!r.pixelsEqual) unexpected.push(k + ' pixels differ ' + r.diffPixels + ' ' + JSON.stringify(r.backstop || '') + JSON.stringify(r.rasterStates || ''));
  for (const kind of kinds) {
    const d = r[kind];
    if (!d || !d.count) continue;
    if (d.first.length < d.count) truncated++;
    if (kind !== 'attrDiffs') { unexpected.push(k + ' ' + kind + ' ' + d.count + ' ' + JSON.stringify(d.first.slice(0, 3))); continue; }
    for (const a of d.first) {
      const sig = a.attr + ' A=' + JSON.stringify(a.A) + ' B=' + JSON.stringify(a.B);
      attrSig.set(sig, (attrSig.get(sig) || 0) + 1);
      const ok = ['data-hero', 'data-lead', 'data-tag'].includes(a.attr) && a.A === null;
      if (!ok) unexpected.push(k + ' attr ' + JSON.stringify(a));
    }
  }
  for (const x of ['headDiffs', 'stateDiffs', 'keyframeDiffs', 'requestDiffs']) if (r[x] && r[x].count) unexpected.push(k + ' ' + x + ' ' + JSON.stringify(r[x]).slice(0, 300));
  if (r.dumpDiffs && r.dumpDiffs.length) unexpected.push(k + ' dumpDiffs ' + JSON.stringify(r.dumpDiffs).slice(0, 300));
}
console.log('scene×width entries', scenes, 'truncated lists', truncated);
console.log('attr signatures:');
for (const [sig, n] of attrSig) console.log('  ', n, sig);
console.log('css', JSON.stringify({ count: s.checks.css.count, files: s.checks.css.files, onlyA: s.checks.css.onlyA, onlyB: s.checks.css.onlyB, tokensOnlyB: s.checks.css.tokensOnlyB, rulesDifferingInText: s.checks.css.rulesDifferingInText }));
for (const c of s.checks.css.first) console.log('  CSS', JSON.stringify(c));
console.log('files', JSON.stringify({ compared: s.checks.files.compared, measured: s.checks.files.measuredByCaptures, onlyB: s.checks.files.onlyB, onlyA: s.checks.files.onlyA }));
for (const f of s.checks.files.diffs) console.log('  FILE', JSON.stringify(f));
console.log('requests onlyA/onlyB', JSON.stringify(s.requests && { onlyA: s.requests.onlyA, onlyB: s.requests.onlyB }).slice(0, 400));
console.log('coverage', JSON.stringify({ rulesDifferingInText: s.coverage.rulesDifferingInText, inScenes: s.coverage.inScenes, onlyFixture: s.coverage.onlyFixture, textOnly: s.coverage.textOnly, textOnlyRules: s.coverage.textOnlyRules, droppedByChrome: s.coverage.droppedByChrome }));
for (const r of s.coverage.rules) console.log('  RULE', r.measured, r.scenes, r.rule);
console.log('UNEXPECTED', unexpected.length);
for (const u of unexpected) console.log('  !', u);
