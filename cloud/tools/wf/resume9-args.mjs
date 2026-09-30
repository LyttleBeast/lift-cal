// resume9-args.mjs — resume #9: build the baked args for Chalk (gates onward) and Iron Age (build onward)
// from the old session's V args and the surviving journal results.
import { readFileSync, writeFileSync } from 'node:fs';
const T = '/Users/micahflunker/dev/vibes-night/tmp/resume9/';
const old = JSON.parse(readFileSync(T + 'v-args.json', 'utf8'));
const pick = id => old.filter(x => x.args.id === id).pop().args;
const MAINS = { mainWeb: '58ac3be', mainNat: 'dc05c3a' };

// ---- Chalk: builds done (web 5c59366, native 0732de4); gates r1 provenance ✓ fit ✓ parity ✗ (carried); contrast + v1 died
const chalkRes = JSON.parse(readFileSync(T + 'chalk-journal-results.json', 'utf8'));
const gate = lbl => chalkRes.find(x => x.label === lbl).result;
const carry = (key, lbl) => { const g = gate(lbl); return { key, gate: g.gate, pass: g.pass, must_fix: g.must_fix, numbers: g.numbers, listed_not_fixed: g.listed_not_fixed }; };
const chalk = {
  ...pick('chalk'), ...MAINS,
  skip: ['assets', 'build'], runSuffix: '-rs9',
  priorAssetsFile: T + 'chalk-journal-results.json',
  priorBuildsFile: T + 'chalk-journal-results.json',
  priorGates: [carry('provenance', 'V:chalk:gate-provenance-r1'), carry('fit', 'V:chalk:gate-fit-r1'), carry('parity', 'V:chalk:gate-parity-r1')],
  gateNotes: `RESUMING NOTE: an earlier run's gate agents died at a usage limit. The builds are DONE and committed (web 5c59366 "Vibe: Chalk", native 0732de4 "vibe: Chalk (V59 §10)"); every agent report from that run (fonts, both builds, the finished provenance/fit/parity gates) is in ${T}chalk-journal-results.json. Partial output of the dead contrast and v1 gates may sit in ${'/Users/micahflunker/dev/vibes-night/proof/'}vc-chalk-r1 and proof/v-chalk-v1-* — use it only as a hint; measure afresh under the "-rs9" names.`,
  reviewNotes: `The fit gate (in ${T}chalk-journal-results.json) listed, for you to judge against §2 SAME LAYOUT: buttons and chips 1–3px taller than v1 (btn-lg 49→52, btn 46→47, chip 26→29, coach-chip 34→36) so rows below move; Coach sheet chips wrap into fewer rows; vibes/chalk.css ~:311 \`.stat:first-child { padding-left: 0 }\` and ~:280 \`.vol-val { width: auto; min-width: 42px }\` move geometry v1 does not; 1117 y-spills of 2–4px from Sofia's taller content area. Decide which of these break SAME LAYOUT (must-fix: make Chalk hold v1's box heights/positions, e.g. by line-height/padding compensation in chalk.css) and which are a face's honest metrics (listed).`,
};
chalk.notes = (chalk.notes || '').replace(/^===== RESUMING =====[\s\S]*?(?======)/, '') +
  `\n===== RESUMING (session 2) =====\nThe assets and both builds are DONE (web 5c59366, native 0732de4). This run starts at the gates: provenance and fit passed and parity failed in the earlier run on these same commits (carried as round 1); contrast and v1 run now. All reports from the earlier run: ${T}chalk-journal-results.json.`;

// ---- Iron Age: assets done (fonts, textures, photos, icons); builds died at web d7f39e4 / native 87aba32
const ia = {
  ...pick('iron-age'), ...MAINS,
  skip: ['assets'], runSuffix: '-rs9', buildRelay: 3,
  priorAssetsFile: T + 'iron-age-journal-results.json',
  buildNotes: {
    web: `YOUR PREDECESSOR (dead at a usage limit) committed on vibes/iron-age: 8b649e4 "definition, registry, tokens" and d7f39e4 "the stylesheet, first pass" (after the asset commits 8245ae9 fonts, f4ad6b5 textures, f6af340 photos, 24c36ee icons). Read \`git -C <WEB> log -p 58ac3be..HEAD -- vibes/iron-age.css vibes/defs\` selectively and continue: the stylesheet is a FIRST PASS — finish every screen (step 2's list), the offline lists (step 3), the verification (step 4), then the final commit. The fonts agent's report says the def's face.web.* names must carry the id prefix ('iron-age Besley' / 'iron-age Besley Italic' / 'iron-age Besley Digits', tools-check/vibes-scope) and Besley's figures are proportional by default, so apply tnum wherever Besley sets a figure — check both are done.`,
    native: `YOUR PREDECESSOR (dead at a usage limit) committed on vibes/iron-age: cf52723 "registered", 4113820 "the first looks drawn", a29cee7 "the set table, rows, chrome and figures", 87aba32 "chart · print" (after the asset commits 9487110 fonts, 7c4c65a textures, d896345 photos, 97e2154 icons). Read \`git -C <NAT> log --stat 1cb6498..HEAD\` and continue from there (engine v2's leftovers in the notes above: per-band calorie hatches, the GuideSwatch switch, photo face-rule fallbacks, tailpieces, the kpi·word branch …). GENERIC VERIFIERS: the Chalk vibe (native branch vibes/chalk, 0732de4; it merges to main BEFORE Iron Age) already wrote tools/verify-vibe-parity.mjs and tools/verify-vibe-fit.mjs, generic over registered vibes, plus extensions to verify-vibe-switch/-seams/-setting/-verbatim and tools/lib/vibe-seed.mjs. Do NOT write rivals: read them with \`git -C /Users/micahflunker/dev/rack-mobile show vibes/chalk:tools/verify-vibe-parity.mjs\` (and …fit.mjs), Write them onto your branch unchanged, then extend them for Iron Age in small, additive hunks (the orchestrator reconciles with Chalk's final copies at merge).`,
  },
};

writeFileSync(T + 'chalk.args.json', JSON.stringify(chalk, null, 1));
writeFileSync(T + 'iron-age.args.json', JSON.stringify(ia, null, 1));
console.log('chalk', JSON.stringify(chalk).length, 'priorGates', chalk.priorGates.map(g => g.key + ':' + g.pass).join(','), '| iron-age', JSON.stringify(ia).length);
console.log('chalk notes head:', chalk.notes.slice(0, 120).replace(/\n/g, ' / '));
