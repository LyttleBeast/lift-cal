export const meta = {
  name: 'v59-engine-2',
  description: 'V59 engine v2: the shared engine + contract asks the first four vibe specs need (band, calorie rings/hatches, letter colours, icon routing, photo band mode, shape params…), both trees, v1 byte-identical',
  phases: [{ title: 'Contract' }, { title: 'Engines' }, { title: 'Check' }],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const WEB = `${NIGHT}/wt/web-ev2`
const NAT = `${NIGHT}/wt/nat-ev2`
const HARNESS = `${NIGHT}/wt/web-harness/report/btn-44/prove.mjs`

const PLAN = `
MICAH'S CHANGE OF PLAN: you run at high effort; WIP branches run suites in UTC only (\`node ${NIGHT}/tools/run-verifiers.mjs <web|nat> <wt> <outDir> UTC\`); the orchestrator runs three zones at merge. No race hunts — anything new that is not a hard-rule failure goes under listed-not-fixed.
Commit WIP often (message via Write under ${NIGHT}/tmp/, \`git -C <wt> commit -F <file>\`, ending "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"; explicit paths only; never node_modules).`

const ASKS = `
===== ENGINE v2: THE SHARED ASKS OF THE FIRST FOUR VIBE SPECS =====
The four specs (Iron Age, Chalk, Navy, Oxblood) are in ${NIGHT}/design/{iron-age,chalk,navy,oxblood}.md with their pure definitions in ${NIGHT}/wt/web-design/vibes/defs/{iron-age,chalk,navy,oxblood}.js (Iron Age's icon set: ${NIGHT}/wt/web-design/vibes/icons/iron-age.js; Navy/Oxblood each wrote a spark-only vibes/icons/<id>.js). Their collected open items: ${NIGHT}/design/SPEC-RESULTS.json. Read each spec's engine/contract-ask section (Iron Age §14 "what this vibe asks the engine for"; Chalk's "Required contract asks"; Navy §15.1; Oxblood §12) and ${NIGHT}/design/VOCAB.md §8.
Implement, ONCE and shared, every REQUIRED ask that needs a shared file (the contract's pure files, rack.css's :root/base rules, vibe.js, native theme.js/variant sites/HeroPhoto/icon routing) — each with a v1 value that reproduces today exactly, so v1 does not move by one pixel or one host prop. The known set (confirm each against the specs; add any other shared REQUIRED ask you find, and say which spec asked):
 (a) colors.band — the dark safe-area strip under the installed PWA's always-white status text for light vibes (web draws it only when a vibe sets it; native ignores it: StatusBar handles it);
 (b) a ring for the calorie head and the dashed target (e.g. shadow.calHead / shadow.calTarget; native CalMeter draws a 1pt border when set);
 (c) the W/F/D set-badge letter colours from roles (tint.tag*.color or the spec's naming; v1 = today's colours at rack.css ~584 and native SetTypeBadge);
 (d) .cal-runway's hatch and edge through a role (v1 keeps rack .55/.70);
 (e) index.js ROLES: face.bands (native build() already reads it), the VOCAB §4 shape params plus rule.sub / rule.total / lead.keyline, inkOf (small-text colour per data colour), type.meta, face.web.display / italic / num, images.<slot>.band (band mode) — so tools-check/vibes-css.mjs generates them and native build() passes them through;
 (f) photo band mode (images.<slot>.band pt): native build()/HeroPhoto draw the band instead of the scrim; the web stylesheet draws it; the declared fallback remains;
 (g) native calorie-band hatches: a CalMeter switch site drawing hatches with react-native-svg Pattern when a vibe asks (Iron Age must not ship on native without them); web can draw them in CSS — add the SVG <pattern> defs or CSS gradient approach the web needs, v1 untouched;
 (h) icon routing on native (E11): a vibe's icon set (vibes/icons/<id>.js) reaches every icon site native draws (dock, gears, calendar, Coach bubble/lock, add-food, water vessel), plus the icon contract's glyphs / vessel / ornaments (tailpiece) fields on both clients (a tailpiece is decoration drawn by the vibe at one site per tab; in v1 it draws nothing and adds no element or host);
 (i) kpi·word draws the delta pill when tint.pill* > 0 and bare text when 0;
 (j) vibe.js's picker prefetch reads face.web.num when present (else the first family of face.web.font);
 (k) vocab.js's addTile 'flat' look worded: lit tiles draw their icon well and tag on \`raised\` (the adopted "E3"); tools-check/vibes-contract.mjs (and native's twin) skip meta keys (id, name, feel, icons) when looking for colours (it reads 'navy' as a CSS colour name today).
Optional asks (literal-caps switch, chart·ink regrade, greetName…) — skip; list them.
Do NOT register any vibe and do NOT add any vibe's own files — that is each vibe's build. The contract's pure files stay byte-identical across the trees (copyFileSync) with updated pins.`

phase('Contract')
const contract = await agent(`${PREAMBLE}${PLAN}${ASKS}
===== YOUR JOB: the CONTRACT part of engine v2 =====
Worktrees: web ${WEB} (branch vibes/engine2 from web main f70dcad), native ${NAT} (branch vibes/engine2 from native main a5bc00e; node_modules is a symlink — never stage it). Make every contract change (vibes/defs/v1.js — new roles with today's values; vibes/defs/index.js — ROLES entries, LEGACY_EXACT untouched unless a new role needs an exact v1 spelling; vibes/defs/vocab.js — the addTile·flat wording and any params the asks add; vibes/icons/v1.js — the glyphs/vessel/ornaments fields with today's values, empty ornaments) in the WEB tree, update tools-check/vibes-contract.mjs (incl. the meta-key fix) and tools-check/vibes-css.mjs if it must emit new custom properties (v1's rack.css :root then needs the same tokens with today's values — add them there, v1 unchanged), then copy the four pure files byte for byte to native src/pure/vibes/…, update native's pins and verify-vibes-contract. Run both contract verifiers and the web suite in UTC. Commit on both branches ("Engine v2 (WIP): the contract" / "engine2(wip): the contract (V59 §9-§11)"). Return the new pins and the exact list of roles added with their v1 values.`,
  { label: 'ev2:contract', phase: 'Contract', schema: { type: 'object', properties: { web_commit: { type: 'string' }, native_commit: { type: 'string' }, pins: { type: 'object' }, roles_added: { type: 'array', items: { type: 'string' } }, suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['web_commit', 'native_commit', 'pins', 'roles_added', 'suite_utc', 'left'] }, effort: 'high' })
if (!contract) return { error: 'contract agent failed' }

phase('Engines')
const REPORT = { type: 'object', properties: { commit: { type: 'string' }, done: { type: 'array', items: { type: 'string' } }, proof: { type: 'string' }, suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['commit', 'done', 'proof', 'suite_utc', 'left'] }
const engines = await parallel([
  () => agent(`${PREAMBLE}${PLAN}${ASKS}\nThe contract agent reported: ${JSON.stringify(contract)}
===== YOUR JOB: the WEB engine part of engine v2 =====
Worktree ${WEB} (branch vibes/engine2; the contract commit is there). Implement every web-side ask: rack.css base rules that SPEND the new roles (so a vibe's generated token block moves them) with v1 values equal to today (single-level :root literals, identical spellings, the verifier-asserted lines untouched, no [data-vibe] in rack.css), the band strip, the calorie ring, the W/F/D letters, the runway hatch, photo band mode in the stylesheet, the SVG pattern defs if needed (hidden, added only when a vibe needs them — or none in v1), vibe.js (face.web.num for the picker prefetch; tailpiece/glyph/vessel routing through icon()), kpi·word's pill rule. Prove v1 unchanged: \`node ${HARNESS} --a ${NIGHT}/wt/web-base --b ${WEB} --expect-vibe 404,200 --run ev2-v1-absent\` on EVERY scene at 390 and 320 (0/0 except the Settings hub's known Look section and the rules fixture's new rules — realign with ${NIGHT}/tools/s-web-realign.mjs), then the same with --data-vibe v1; touch-target 408/408; the web suite in UTC. Commit "Engine v2 (WIP): the web engine".`, { label: 'ev2:web', phase: 'Engines', schema: REPORT, effort: 'high' }),
  () => agent(`${PREAMBLE}${PLAN}${ASKS}\nThe contract agent reported: ${JSON.stringify(contract)}
===== YOUR JOB: the NATIVE engine part of engine v2 =====
Worktree ${NAT} (branch vibes/engine2; the contract commit is there). Implement every native-side ask in theme.js build() (pass the new roles through; v1 values = today's), HeroPhoto (band mode), CalMeter (the hatch site with react-native-svg Pattern; the head/target ring), SetTypeBadge (letter colours from roles), icon routing (E11: a vibe icon set reaches every native icon site — dock, gears, calendar, Coach bubble/lock, add-food icons, water vessel — through one helper; glyph/vessel/ornament fields; a tailpiece site per tab that draws NOTHING and adds no host in v1), kpi·word's pill rule. No new dependency (react-native-svg is already linked). Prove v1 unchanged: verify-vibe-v1 byte-identical (baseline + the committed Settings-hub overlay only; re-baseline NOTHING), verify-theme-identity --require-build, verify-theme-build, verify-vibe-seams, the three lints, the native suite in UTC. Extend verify-theme-build / verify-vibe-seams to hold each new role/site to its rule, each red on a planted mistake. Commit "engine2(wip): the native engine (V59 §9-§11)".`, { label: 'ev2:native', phase: 'Engines', schema: REPORT, effort: 'high' }),
])
phase('Check')
const check = await agent(`${PREAMBLE}${PLAN}${ASKS}\nReports: contract ${JSON.stringify(contract)}; engines ${JSON.stringify(engines)}
===== YOUR JOB: check engine v2 (one round; findings need a reproduction) =====
Worktrees ${WEB} and ${NAT} (read-only for you). Confirm: v1 unchanged on both (re-run the proofs the builders claim, at least the native snapshot and 10 web scenes at both widths absent + data-vibe v1); the four pure files byte-identical across trees and pinned; every required ask from the four specs is implemented or explicitly listed as not (name which spec needs it and whether the vibe can ship without it); the new roles reach both clients (native build() output and the web generated block) for a scratch vibe that sets them. Classify: must-fix (v1 moved, a proof red, a required ask missing that blocks a vibe) vs listed-not-fixed.`,
  { label: 'ev2:check', phase: 'Check', schema: { type: 'object', properties: { must_fix: { type: 'array', items: { type: 'string' } }, listed_not_fixed: { type: 'array', items: { type: 'string' } }, asks_status: { type: 'array', items: { type: 'string' } } }, required: ['must_fix', 'listed_not_fixed', 'asks_status'] }, effort: 'high' })
let fix = null
if (check && check.must_fix.length) {
  phase('Engines')
  fix = await agent(`${PREAMBLE}${PLAN}${ASKS}\n===== YOUR JOB: fix engine v2's must-fix items (one round) =====\nWorktrees ${WEB}, ${NAT}. Items: ${JSON.stringify(check.must_fix)}. For each: reproduce, fix, show the proof/check that found it passes; keep v1 unchanged (native snapshot byte-identical; web prove 0/0 on the scenes touched) and the suites green in UTC. Commit on the branch(es) touched ("Engine v2 (WIP): what the check found" / "engine2(wip): what the check found (V59 §9-§11)").`, { label: 'ev2:fix', phase: 'Engines', schema: REPORT, effort: 'high' })
}
return { contract, engines, check, fix }
