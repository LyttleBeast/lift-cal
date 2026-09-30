export const meta = {
  name: 'v59-engine-3-integrate',
  description: 'Engine v3 over main with Oxblood: resolve the native merge, move Oxblood onto colors.knob (same colour), regenerate tokens, re-pin; then prove v1 and all three registered vibes unchanged',
  phases: [{ title: 'Integrate' }, { title: 'Prove' }],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const WEB = `${NIGHT}/wt/web-ev3`
const NAT = `${NIGHT}/wt/nat-ev3`
const REF = `${NIGHT}/wt/web-mainref`
const HARNESS = `${NIGHT}/wt/web-harness/report/btn-44/prove.mjs`
const CTX = `
MICAH'S CHANGE OF PLAN: high effort; UTC-only suites on branches (\`node ${NIGHT}/tools/run-verifiers.mjs <web|nat> <wt> <outDir> UTC\`). No race hunts.
CURRENT MAINS (the session facts are older): web main 53600fa, native main 9446f76 — engine v2, Settings → Look → Vibes, Chalk, Navy and Oxblood. Engine v3 is on vibes/engine3, proven merge-ready against the Navy-era main (run wf_bef83992-f51; its prover's tools include ${NIGHT}/tools/ev3m-fixture-realign.mjs, which realigns the rules fixture when a vibe stylesheet gains a rule). The orchestrator has now merged main (with Oxblood) into vibes/engine3: WEB ${WEB} merged cleanly (HEAD is the merge commit); NATIVE ${NAT} is MID-MERGE with three conflicts: src/ui/coach/settings.jsx, tools/verify-vibe-parity.mjs, tools/verify-vibes-verbatim.mjs. ${REF} is a clean detached checkout of web main 53600fa (v1 + Chalk + Navy + Oxblood, no engine v3). Iron Age is being built on vibes/iron-age — never touch its worktrees.
Commit via Write under ${NIGHT}/tmp/ + \`git -C <wt> commit -F <file>\`, ending "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"; explicit paths; never node_modules. RESUMING: if the worktrees show earlier work for this job, continue from it.`

phase('Integrate')
const integ = await agent(`${PREAMBLE}${CTX}
===== YOUR JOB: finish the merge and move Oxblood onto engine v3's knob =====
Oxblood solved its toggle's OFF knob with its own seam before engine v3 existed: web \`[data-vibe="oxblood"] .tog:not(.on)::after { background: var(--chalk); }\` in vibes/oxblood.css; native \`toggle: { off: 'chalk' }\` in VIBE_DEFS.oxblood (src/state/vibe.js) read by offKnob() in src/ui/coach/settings.jsx ToggleRow. Engine v3 added the shared role colors.knob (or: colors.steel; web .tog::after background: var(--knob); native settings.jsx thumbColor off = T.colors.knob).
1. NATIVE: resolve the three conflicts — settings.jsx takes engine v3's T.colors.knob (drop offKnob()); verify-vibe-parity.mjs keeps both sides' checks (engine v3's and Oxblood's probes), adapted so Oxblood's knob is checked through colors.knob; verify-vibes-verbatim.mjs pins every pure file at its real sha256 after step 2. Remove VIBE_DEFS.oxblood.toggle and its comment's reference to offKnob.
2. OXBLOOD'S DEFINITION: set colors.knob to Oxblood's chalk hex (the exact colour its off knob draws today) in web vibes/defs/oxblood.js; copy byte for byte to native src/pure/vibes/defs/oxblood.js. Remove the now-redundant .tog rule from vibes/oxblood.css (keep a comment only if it says something true). Regenerate the token blocks: \`node tools-check/vibes-css.mjs --write\` in ${WEB} (oxblood.css gains engine v3's tokens; chalk.css/navy.css must not change further).
3. Prove Oxblood's knob did not move: the off knob's computed background under Oxblood is the same colour as before (web; a small headless check under ${NIGHT}/harness.lock, as ${NIGHT}/tools/twosent-px.mjs did) and native T.colors.knob under Oxblood = the chalk hex, steel for v1/Chalk/Navy.
4. Web UTC suite, native UTC suite, verify-vibe-v1 byte-identical (re-baseline NOTHING), theme identity --require-build, verify-vibe-parity + verify-vibe-fit with Chalk, Navy and Oxblood, contract verifiers, pure files byte-identical across the trees.
Commit the native merge (message "engine3(wip): bring main (Oxblood) in; Oxblood on colors.knob (V59 §9-§12)") and the web follow-up ("Engine v3 (WIP): Oxblood on colors.knob; its generated tokens").`,
  { label: 'ev3i:integrate', phase: 'Integrate', schema: { type: 'object', properties: { web_commit: { type: 'string' }, native_commit: { type: 'string' }, done: { type: 'array', items: { type: 'string' } }, suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['web_commit', 'native_commit', 'done', 'suite_utc', 'left'] }, effort: 'high' })
if (!integ) return { error: 'integrate agent died' }

phase('Prove')
const proof = await agent(`${PREAMBLE}${CTX}
===== YOUR JOB: the merge-readiness proof of engine v3 over the current main (read-only on the worktrees; independent of the builders) =====
The integrator reported: ${JSON.stringify(integ)}
On the CURRENT heads of vibes/engine3 (both trees):
1. WEB: \`node ${HARNESS} --a ${REF} --b ${WEB} …\` on EVERY scene at 390 and 320 — (a) data-vibe absent, (b) --data-vibe v1, (c) --vibe chalk, (d) --vibe navy, (e) --vibe oxblood. Expected after realigning the rules fixture (${NIGHT}/tools/ev3m-fixture-realign.mjs or your own): 0 in every class except engine v3's own data-* hooks (data-hero, data-lead, data-tag) absent on A, the regenerated token text / the one added chalk.css rule / the removed oxblood.css .tog rule and the pure files as cssDiffs/fileDiffs, and the known dock raster flake (a PNG the A tree itself produces). Under (e) the toggle's off knob must be the same colour as on A. Account for EVERY difference; anything else is must-fix.
2. NATIVE: verify-vibe-v1 byte-identical (213 scenes / 25,586 hosts vs 1cb6498 + the committed Settings-hub overlay only), theme identity --require-build, verify-vibe-parity / -fit / -switch / -seams with Chalk, Navy and Oxblood, verify-vibes-verbatim (pins = real sha256; web and native copies identical), the full native suite in UTC.
3. The web suite in UTC; touch-target 408/408.
Report must_fix (with a reproduction) and listed_not_fixed.`,
  { label: 'ev3i:prove', phase: 'Prove', schema: { type: 'object', properties: { must_fix: { type: 'array', items: { type: 'string' } }, numbers: { type: 'string' }, listed_not_fixed: { type: 'array', items: { type: 'string' } } }, required: ['must_fix', 'numbers', 'listed_not_fixed'] }, effort: 'high' })
return { integ, proof }
