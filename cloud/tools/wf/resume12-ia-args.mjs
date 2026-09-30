// resume12-ia-args.mjs — Iron Age under Micah's panel decision (30 Sep): after run wf_2e791c1c-045 (review rounds +
// re-proof) ends, carry every gate's LATEST result and run the 'designed' panel (≤3 revise rounds, then merge + flag),
// then ONE review round of whatever the panel changed, then the re-proof.   node resume12-ia-args.mjs <mainWeb> <mainNat>
import { readFileSync, writeFileSync } from 'node:fs';
const [mainWeb, mainNat] = process.argv.slice(2);
if (!mainWeb || !mainNat) { console.error('usage: resume12-ia-args.mjs <mainWeb> <mainNat>'); process.exit(2); }
const T = '/Users/micahflunker/dev/vibes-night/tmp/resume9/';
const J = '/Users/micahflunker/.claude/projects/-Users-micahflunker-dev-ship-v59/a17eac98-c779-495e-b9f2-54be1cf67d7a/subagents/workflows/wf_2e791c1c-045/journal.jsonl';
const lab = {}, results = [];
for (const l of readFileSync(J, 'utf8').split('\n').filter(Boolean)) {
  const x = JSON.parse(l);
  if (x.type === 'started') lab[x.key] = x.label;
  if (x.type === 'result') results.push({ label: lab[x.key], result: x.result });
}
writeFileSync(T + 'iron-age-run3-results.json', JSON.stringify(results, null, 1));
const prev = JSON.parse(readFileSync(T + 'iron-age-r3.args.json', 'utf8'));
// latest result per gate key, in journal order; keys never re-run keep the carried result from run 2
const latest = {};
for (const g of prev.priorGates) latest[g.key] = g;
for (const { label, result } of results) {
  const m = /^V:iron-age:gate-(contrast|fit|v1|parity|provenance)-/.exec(label || '');
  if (m && result && 'pass' in result) latest[m[1]] = { key: m[1], gate: result.gate, pass: result.pass, must_fix: result.must_fix, numbers: result.numbers, listed_not_fixed: result.listed_not_fixed, fresh: true, from: label };
}
const lastFixIdx = results.map(r => /:fix-|:revise-|:giveaways-/.test(r.label || '')).lastIndexOf(true);
for (const k of Object.keys(latest)) {   // a gate measured before the run's last fix is stale (the closing re-proof re-measures v1/fit/parity; the panel's gates re-measure contrast)
  const idx = results.findIndex(r => r.label === latest[k].from);
  if (idx >= 0 && idx < lastFixIdx) latest[k].fresh = false;
}
const { priorJudge, priorGates, ...rest } = prev;
const args = {
  ...rest, mainWeb, mainNat, skip: ['assets', 'build'], runSuffix: '-rs11', fixSeqStart: 1, panel: 'designed', reviewRounds: 1,
  priorBuildsFile: T + 'iron-age-run3-results.json',
  priorGates: Object.values(latest),
  notes: (prev.notes || '') + `
===== RESUMING (run 4): MICAH'S PANEL DECISION =====
Run 3 (${T}iron-age-run3-results.json) finished three AI-panel revise rounds under the OLD adversarial brief (3/3 "AI-made" 0.60-0.70 — the same brief judges v1 itself AI-made at 0.90-0.93), then three layout-review rounds and the re-proof. Micah's decision (30 Sep) replaces that panel: Iron Age must look clearly less generic than v1 to a real person, and look cool. Three judges look the way real people would (a lifter who uses fitness apps, a graphic designer, someone who has seen a lot of AI-made apps) and answer "Does this look like a generic AI/template app, or like something a person designed on purpose?" Pass when ≥2 of 3 say designed on purpose AND every concrete giveaway is fixed or logged with a reason; max 3 revise rounds; if it still doesn't pass it is merged anyway and flagged for Micah. One layout review of whatever this run changes follows.`,
};
writeFileSync(T + 'iron-age-r4.args.json', JSON.stringify(args, null, 1));
console.log(Object.values(latest).map(g => `${g.key}:${g.pass ? '✓' : '✗'}${g.fresh ? '' : '(stale)'} ${g.from || 'carried'}`).join('\n'));
