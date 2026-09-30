// resume10-ia-args.mjs — Iron Age continuation after run wf_d23cd1bc-903 lost revise-r2 / review / reproof to a usage
// limit. Carries: builds (done), gates measured after revise-1 (contrast, fit, v1: fresh), parity + provenance r1
// (parity stale → re-proved at the end), the round-2 AI panel (3 verdicts) → next revise round 2.
import { readFileSync, writeFileSync } from 'node:fs';
const T = '/Users/micahflunker/dev/vibes-night/tmp/resume9/';
const J = '/Users/micahflunker/.claude/projects/-Users-micahflunker-dev-ship-v59/a17eac98-c779-495e-b9f2-54be1cf67d7a/subagents/workflows/wf_d23cd1bc-903/journal.jsonl';
const lab = {}, res = {};
for (const l of readFileSync(J, 'utf8').split('\n').filter(Boolean)) {
  const x = JSON.parse(l);
  if (x.type === 'started') lab[x.key] = x.label;
  if (x.type === 'result') res[lab[x.key]] = x.result;
}
writeFileSync(T + 'iron-age-run2-results.json', JSON.stringify(Object.entries(res).map(([label, result]) => ({ label, result })), null, 1));
const g = (key, label, fresh = true) => { const r = res[label]; if (!r) throw new Error('missing ' + label); return { key, gate: r.gate, pass: r.pass, must_fix: r.must_fix, numbers: r.numbers, listed_not_fixed: r.listed_not_fixed, fresh }; };
const base = JSON.parse(readFileSync(T + 'iron-age.args.json', 'utf8'));
const args = {
  ...base,
  mainWeb: '10fe73b', mainNat: 'd2af836',
  skip: ['assets', 'build'], runSuffix: '-rs10', fixSeqStart: 1,
  priorBuildsFile: T + 'iron-age-run2-results.json',
  priorGates: [
    g('contrast', 'V:iron-age:gate-contrast-rafter-revise-1-rs9'),
    g('fit', 'V:iron-age:gate-fit-rafter-revise-1-rs9'),
    g('v1', 'V:iron-age:gate-v1-rafter-revise-1-rs9'),
    g('parity', 'V:iron-age:gate-parity-r1-rs9', false),
    g('provenance', 'V:iron-age:gate-provenance-r1-rs9'),
  ],
  priorJudge: { nextRevise: 2, verdicts: ['V:iron-age:judge1-r2-rs9', 'V:iron-age:judge2-r2-rs9', 'V:iron-age:judge3-r2-rs9'].map(l => { if (!res[l]) throw new Error('missing ' + l); return res[l]; }) },
  notes: (base.notes || '') + `
===== RESUMING (session 2, run 3) =====
The builds are DONE (web 6a4c1b6 "Vibe: Iron Age", native 45edfa7) and so are gate fix rounds 1-3 and AI-panel revise round 1; every agent report of that run is in ${T}iron-age-run2-results.json. The round-2 panel said AI-made 3/3 (0.62-0.70); revise round 2 was cut off by a usage limit AFTER committing web b897928/7ac19be/fdfce3d and native 26079a0/aeef061/5239f43 — the next revise agent reviews those and finishes the round. Mains moved: Chalk (b99ec9d/f3382d3) and Navy (10fe73b/d2af836) are merged; the orchestrator reconciles Iron Age's registry lines and verifier edits with them at merge — do not rebase. Provenance was verified on the current photo and engraving files: do not add, swap or re-crop an image or engraving without saying so explicitly in your report (it would need the provenance gate again).`,
};
writeFileSync(T + 'iron-age-r3.args.json', JSON.stringify(args, null, 1));
console.log('priorGates', args.priorGates.map(x => x.key + ':' + x.pass + (x.fresh ? '' : '(stale)')).join(' '), '| panel', args.priorJudge.verdicts.map(v => v.verdict + ' ' + v.confidence).join(', '));
