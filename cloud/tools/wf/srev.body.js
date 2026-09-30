export const meta = {
  name: 'v59-s-web-review',
  description: 'V59 §8 web S: one review with triage (must-fix vs listed-not-fixed), then one fix only for must-fix items',
  phases: [{ title: 'Review' }, { title: 'Fix' }],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const WT = `${NIGHT}/wt/web-settings`

const TRIAGE = `
TRIAGE (Micah's change of plan: no more race hunts). Classify every finding:
- MUST-FIX: it changes v1 anywhere outside the Settings hub's one added section; it loses or corrupts data (a wrong value written to settings/vibe, a write that is not a plain string, a read that writes); it breaks an explicit §8 requirement (per-account storage; normVibe on every read; the account value wins over the device hint; the device hint gives the first frame; a refused write reverts; v1 first; the current vibe marked not by colour alone; 44pt targets; tap applies at once and the sheet stays open; no element.style.height/minHeight/maxHeight; no on-screen words beyond §8's and the flagged "Close"); or a verifier/proof is red.
- LISTED-NOT-FIXED: timing races and edge cases that need a second vibe, a sign-out mid-flight or similar to show, and anything else. Each still needs a reproduction or goes under suspicions.`

const FINDINGS = { type: 'object', properties: {
  must_fix: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, where: { type: 'string' }, reproduction: { type: 'string' }, requirement: { type: 'string' } }, required: ['title', 'where', 'reproduction', 'requirement'] } },
  listed_not_fixed: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, where: { type: 'string' }, reproduction: { type: 'string' } }, required: ['title', 'where', 'reproduction'] } },
  suspicions: { type: 'array', items: { type: 'string' } },
}, required: ['must_fix', 'listed_not_fixed', 'suspicions'] }
const REPORT = { type: 'object', properties: { commit: { type: 'string' }, fixed: { type: 'array', items: { type: 'string' } }, proof: { type: 'string' }, suite: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['commit', 'fixed', 'proof', 'suite', 'left'] }

phase('Review')
const rev = await agent(`${PREAMBLE}
===== YOUR JOB: review web S (V59 §8), one round =====
Read ${NIGHT}/VIBES-PROMPT.md §8 (lines 893-957). The work: ${WT} (branch vibes/settings; \`git -C ${WT} log --oneline 64303c7..HEAD\`: fa08d50 the orchestrator's hub row, a3d362e store/app/sheet/styles, d578afc tools-check/vibe-setting.mjs, 92745cf docs, 77d6e6e boot fix, a8b597f proof). The builder's proof: prove.mjs A=${NIGHT}/wt/web-base B=${WT}, 132/132; only settings-hub@390/320 and the rules fixture differ, re-aligned to exactly the Look section + one row (runs ${NIGHT}/proof/s-web-ab-absent-2, s-web-ab-datavibe-v1-2; realigner ${NIGHT}/tools/s-web-realign.mjs). Check the claims and the code against §8 with a v1 user and a future second vibe in mind. A finding counts only with a reproduction (a verifier case, a harness diff, or a code path with a concrete before/after). Do not edit the worktree. Run single verifiers in UTC only (full suites are the orchestrator's, at merge).
${TRIAGE}`, { label: 'S:review-web', phase: 'Review', schema: FINDINGS, effort: 'high' })
if (!rev) return { error: 'review failed' }
log(`web S review: ${rev.must_fix.length} must-fix, ${rev.listed_not_fixed.length} listed-not-fixed, ${rev.suspicions.length} suspicions`)
let fix = null
if (rev.must_fix.length) {
  phase('Fix')
  fix = await agent(`${PREAMBLE}
===== YOUR JOB: fix web S's must-fix findings (one round) =====
Worktree ${WT} (branch vibes/settings). Do NOT edit settings.js's hub row (the orchestrator's). For each finding below: reproduce it, add a regression check to tools-check/vibe-setting.mjs that fails first, fix it, show it green. Then re-run prove.mjs (${NIGHT}/wt/web-harness/report/btn-44/prove.mjs; read its header; it holds ${NIGHT}/harness.lock) A=${NIGHT}/wt/web-base B=${WT} on the scenes the fix could touch, both absent and --data-vibe v1 (only the Settings hub may differ, as before), and the web suite in UTC only (\`node ${NIGHT}/tools/run-verifiers.mjs web ${WT} ${NIGHT}/proof/s-web-fix-utc UTC\`). Commit (message via Write under ${NIGHT}/tmp/, \`git -C ${WT} commit -F\`, ending "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"): subject "Settings: what the review found". Fix nothing else.
MUST-FIX:
${JSON.stringify(rev.must_fix, null, 1)}`, { label: 'S:fix-web', phase: 'Fix', schema: REPORT, effort: 'high' })
}
return { rev, fix }
