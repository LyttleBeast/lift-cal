export const meta = {
  name: 'v59-contract-2',
  description: 'V59 §9.1 contract v2: vocab.js + the 12 new blocks as v1 in v1.js/index.js (both trees, verbatim, pinned) and native pass-through switches for them — v1 byte-identical',
  phases: [{ title: 'Build' }, { title: 'Check' }],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const WEB = `${NIGHT}/wt/web-cv2`
const NAT = `${NIGHT}/wt/nat-cv2`

const JOB = `
===== YOUR JOB: contract v2 (V59 §9.1 "extend the E0 contract with the component variant list") =====
Micah's change of plan applies: you run at high effort; on these WIP branches run suites in UTC only (\`node ${NIGHT}/tools/run-verifiers.mjs <web|nat> <wt> <outDir> UTC\`); the orchestrator runs three zones at merge. No race hunts.
Worktrees: web ${WEB} (branch vibes/contract2 from web main 64303c7), native ${NAT} (branch vibes/contract2 from native main cb47196; node_modules is a symlink — never stage it).
Inputs: Phase D's vocabulary — ${NIGHT}/design/VOCAB.md (read §1-§9) and the pure module ${NIGHT}/design/vocab.js (29 blocks: 17 the engines already switch on + 12 new: headline, field, note, toast, listRow, setTable, setRow, plateStrip, calCell, fab, addTile, sessionChrome; plus looks added to 17 existing blocks; "shape" params).
1. WEB: add vibes/defs/vocab.js (copy ${NIGHT}/design/vocab.js byte for byte with node copyFileSync; it imports nothing). In vibes/defs/v1.js add the 12 new block keys to \`variants\` with value 'v1' (all 29 present). If VOCAB §4/§8 says the shape params need a home in index.js ROLES, add them with v1's values meaning "today" (the smallest change that makes the contract complete; say exactly what). Update tools-check/vibes-contract.mjs so it (a) checks vocab.js imports nothing and is well-formed, (b) checks v1.js's variants cover every vocab block with 'v1', (c) keeps every existing check. Everything else in v1.js/index.js unchanged. tools-check/vibes-css.mjs, vibes-scope.mjs and vibe-js.mjs must stay green (update them only if they enumerate contract keys, and say why).
2. NATIVE: copy the web's vibes/defs/v1.js, vibes/defs/index.js, vibes/icons/v1.js and vibes/defs/vocab.js byte for byte to src/pure/vibes/defs/… and src/pure/vibes/icons/…; update tools/verify-vibes-verbatim.mjs's pins (and add vocab.js to it); update tools/verify-vibes-contract.mjs like web's. In src/ui/theme.js add the 12 new keys to the v1 VARIANTS table ('v1'). In src/ui/variant.js and at each new block's switch sites (VOCAB §6 lists them per block under "switches"/"add") open a switch whose v1 branch is today's JSX moved over UNCHANGED (as N4 did for 17 blocks), with its "accepts" comment listing the looks vocab.js names; update the 17 existing switches' accepts lines to vocab's added looks (no behaviour change: non-v1 falls back to v1 until a vibe draws it). Update tools/verify-vibe-seams.mjs (CONTRACT.length 17 → 29, its table regex so blocks that live only under app/ (fab, calCell) are found, and its tables for the new switches).
3. PROVE v1 unchanged: native — tools/verify-vibe-v1.mjs byte-identical (baseline + the committed Settings-hub overlay; re-baseline NOTHING), verify-theme-identity --require-build, verify-theme-build, verify-vibe-seams, the three lints, the native suite in UTC. Web — the suite in UTC, and a quick prove.mjs (${NIGHT}/wt/web-harness/report/btn-44/prove.mjs; read its header; it holds ${NIGHT}/harness.lock) A=${NIGHT}/wt/web-base B=${WEB} on 6 scenes at 390 (you, train, session, fuel, settings-hub, auth), data-vibe absent: identical except the settings-hub's known Look row.
4. COMMIT on each branch (message via Write under ${NIGHT}/tmp/, \`git -C <wt> commit -F\`, ending "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"): web "The vibe contract, v2: the component vocabulary, every block v1"; native "vibes: the contract, v2 — the component vocabulary, 29 blocks, every switch open and v1 (V59 §9.1)". Report the new sha256 pins of all four pure files (they must be equal across the trees).`

const REPORT = { type: 'object', properties: { web_commit: { type: 'string' }, native_commit: { type: 'string' }, pins: { type: 'object' }, switches_opened: { type: 'array', items: { type: 'string' } }, proof: { type: 'string' }, suites_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['web_commit', 'native_commit', 'pins', 'switches_opened', 'proof', 'suites_utc', 'left'] }

phase('Build')
const built = await agent(`${PREAMBLE}${JOB}`, { label: 'cv2:build', phase: 'Build', schema: REPORT, effort: 'high' })
if (!built) return { error: 'build failed' }
phase('Check')
const check = await agent(`${PREAMBLE}
===== YOUR JOB: check contract v2 (one round; findings need a reproduction) =====
The builder's report: ${JSON.stringify(built)}. Worktrees ${WEB} and ${NAT} (read-only for you). Confirm: the four pure files are byte-identical across the trees and match the pins; they import nothing; v1.js's variants = every vocab block with 'v1'; every new native switch's v1 branch is exactly the pre-change JSX (diff each against native main cb47196 — the element tree must be the same, not just similar); verify-vibe-v1 byte-identical with no re-baseline; the web renders unchanged. List must-fix items (with reproduction) and anything else under listed-not-fixed. High effort; UTC-only runs.`,
  { label: 'cv2:check', phase: 'Check', schema: { type: 'object', properties: { must_fix: { type: 'array', items: { type: 'string' } }, listed_not_fixed: { type: 'array', items: { type: 'string' } } }, required: ['must_fix', 'listed_not_fixed'] }, effort: 'high' })
return { built, check }
