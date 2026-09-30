export const meta = {
  name: 'v59-s-native-fix3',
  description: 'V59 §8 native S, fix round 3: the four races review round 3 reproduced (refused picks, sheet open across a revoked approval or a sign-out, a live sign-in frame), then a targeted re-check',
  phases: [{ title: 'Fix' }, { title: 'Check' }],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const WT = `${NIGHT}/wt/nat-settings`
const RATE = `KNOWN PRE-EXISTING RED (not ours; don't touch): verify-rate-band fails under TZ=Pacific/Auckland on untouched 1cb6498 (NZ daylight saving started 27 Sep 2026). Accept it only if ${NIGHT}/wt/nat-base fails the same checks right after, same zone (${NIGHT}/tools/rateband-same.mjs nat <suite log> does this).`

const FIX = `
===== YOUR JOB: native S, fix round 3 (V59 §8) =====
Worktree ${WT} (branch vibes/settings; node_modules is a symlink — never stage it). Read ${NIGHT}/VIBES-PROMPT.md §8 (lines 893-957). The S work so far: \`git -C ${WT} log --oneline 6b1b3d5..HEAD\` (storage in src/state/vibeAccount.js / vibe.js / vibeFonts.js, the Vibes sheet src/ui/settings/vibes.jsx, the watchAuth ordering in app/_layout.jsx, the epoch that makes resetVibe drop switches in flight, tools/verify-vibe-setting.mjs 72 checks). The orchestrator's hub row (630fae3) is not yours to edit.
Review round 3 reproduced four races — read ${NIGHT}/proof/s-nat-review-r3.json in full (findings with reproductions via ${NIGHT}/tools/rv3-snat-probe.mjs, and suspicions):
1. Two refused picks in flight put back a vibe the database refused and never held, not the account's value (store.js write()'s per-call rollback restores the previous pick's optimistic mirror). Fix in vibeAccount.js without touching store.js's shared rollback semantics for other settings: a refusal must end on the account's last value that the database actually holds (e.g. remember the last confirmed value; revert to it when every in-flight pick has settled). Make AGENTS.md's sentence true.
2. Approval revoked while the Vibes sheet is open: a tap still dresses the waiting gate. 3. Session ended while the sheet is open: a tap puts a vibe on over sign-in and nothing takes it off. Fix both at the source: chooseVibe() refuses (does nothing) unless a user is signed in and approved at the moment of the tap AND at the moment it applies; and the sheet closes itself when the user signs out or loses approval (the house's own way of closing a sheet — read src/ui/sheet.js), so no card stays tappable.
4. On a LIVE sign-in (sign-in on screen, no native splash), the root commits one frame in the vibe before setUser(u). Make the vibe and the user land in the same render (e.g. batch them, or apply the vibe as part of the same state update, or hold the vibe until the (app) side mounts) — whatever keeps the cold-boot path (applied before setUser while the native splash is held) exactly as it is and adds no frame of v1-then-vibe on a cold boot.
For EACH: first add a regression check to tools/verify-vibe-setting.mjs (or its harness) that fails on the current tree (show the red), then fix, then show it green. Then: plant each fix's removal in a scratch copy (${NIGHT}/tools/s-nat-fix2-plant.mjs is the pattern) and show each goes red. verify-vibe-v1 must stay byte-identical against baseline + the committed Settings-hub rebaseline overlay (do not re-baseline anything else); verify-theme-identity --require-build; the full native suite in three zones via \`node ${NIGHT}/tools/run-verifiers.mjs nat ${WT} ${NIGHT}/proof/s-nat-fix3-suite\`. ${RATE}
Commit (new commits on vibes/settings; Write the message under ${NIGHT}/tmp/; \`git -C ${WT} commit -F\`; end with "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"): subject "settings: a pick only goes on for a signed-in, approved account, and a refusal ends on the account's value (V59 §8)". COMMIT OFTEN. No new on-screen words.`

const REPORT = { type: 'object', properties: { commit: { type: 'string' }, fixed: { type: 'array', items: { type: 'string' } }, checks: { type: 'string' }, proof: { type: 'string' }, suite: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['commit', 'fixed', 'checks', 'proof', 'suite', 'left'] }
const FINDINGS = { type: 'object', properties: { findings: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, where: { type: 'string' }, reproduction: { type: 'string' } }, required: ['title', 'where', 'reproduction'] } }, suspicions: { type: 'array', items: { type: 'string' } } }, required: ['findings', 'suspicions'] }

phase('Fix')
const fix = await agent(`${PREAMBLE}${FIX}`, { label: 'S:fix-nat-r3', phase: 'Fix', schema: REPORT })
if (!fix) return { error: 'fixer failed' }
phase('Check')
const check = await agent(`${PREAMBLE}
===== YOUR JOB: targeted re-check of native S fix round 3 =====
Worktree ${WT} (read-only for you). The fixer reports: ${JSON.stringify(fix)}
Re-run every probe in ${NIGHT}/proof/s-nat-review-r3.json (${NIGHT}/tools/rv3-snat-probe.mjs <tree> r1 r2 g1 g2 fl, and any others it names) against ${WT}, and confirm each is now held. Then try the same four classes once more with a variation each (e.g. three refused picks; revoked approval with a pick already loading faces; sign-out from another sheet with the Vibes sheet under it; a live sign-in whose stored vibe's faces fail). A finding counts only with a reproduction. Do not edit the worktree.`, { label: 'S:check-nat-r3', phase: 'Check', schema: FINDINGS })
return { fix, check }
