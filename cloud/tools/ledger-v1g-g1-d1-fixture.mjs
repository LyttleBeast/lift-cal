// Ledger v1 gate (g1-d1): the fixture scene's B against the main-tree reference
// B, every difference listed (no cap): are they all elements/states only B has
// (the wraps the fixture builds for ledger.css's rules), with every element both
// have identical? Also prints the vibe/dataVibe flags of the runs compared.
// Usage: node ledger-v1g-g1-d1-fixture.mjs <refB runDir> <runDir>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const H = await import('/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs');
const [refB, run] = process.argv.slice(2);
for (const d of [refB, run]) { const s = JSON.parse(readFileSync(join(d, 'summary.json'), 'utf8')); console.log(d.split('/').pop(), 'vibe', s.vibe, 'dataVibe', s.dataVibe, 'B', s.B.sha.slice(0, 7), 'harness', s.harness.sha.slice(0, 7), 'verdict', s.verdict); }
let bad = 0;
for (const w of ['390', '320']) {
  const a = H.readGz(join(refB, 'B', w, 'fixture.dump.json.gz')), b = H.readGz(join(run, 'B', w, 'fixture.dump.json.gz'));
  const r = H.compareDumps(a, b, 1e9);
  const kinds = H.DIFF_KINDS.filter(k => r[k] && r[k].count);
  const out = {};
  for (const k of kinds) {
    const all = r[k].first;
    const onlyB = all.filter(x => x.only === 'B' || (k === 'keyframeDiffs' && x.A === 'absent' && x.B === 'declared' && x.name.startsWith('ledger-')));
    out[k] = r[k].count + ' (listed ' + all.length + ', only-B ' + onlyB.length + ')';
    const rest = all.filter(x => !onlyB.includes(x));
    if (rest.length || all.length !== r[k].count) { bad++; console.log('  NOT ONLY-B', w, k, JSON.stringify(rest.slice(0, 5)).slice(0, 900)); }
  }
  // what the B-only wraps are: the class names of the elements added
  const added = r.structDiffs ? r.structDiffs.first.filter(x => x.only === 'B').map(x => x.path) : [];
  const els = new Map(b.els.map(e => [e.p, e]));
  const classes = new Set(added.map(p => els.get(p)).filter(Boolean).map(e => (e.at && (e.at.class || e.at['data-vibe'])) || e.p.split('>').pop().split(':')[0]));
  const vibeAttr = new Set(added.map(p => els.get(p)).filter(e => e && e.at && e.at['data-vibe']).map(e => e.at['data-vibe']));
  console.log(w, JSON.stringify(out), 'added elements', added.length, 'data-vibe on added', JSON.stringify([...vibeAttr]), 'distinct classes', classes.size);
}
console.log(bad ? 'FIXTURE: something besides B-only additions' : 'FIXTURE: every difference is an element, state or @keyframes only B has');
process.exit(bad ? 3 : 0);
