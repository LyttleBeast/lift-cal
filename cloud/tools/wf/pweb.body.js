export const meta = {
  name: 'v59-pweb-gate',
  description: 'V59 §7 Pweb: finish the harness commit, full two-tree proof (60 scenes × 2 widths, data-vibe absent and "v1"), suite ×3 zones, then 3 adversarial reviewers with a burden of proof and ≤3 fix rounds',
  phases: [
    { title: 'Prove', detail: 'harness final commit; base vs engine, all scenes, both widths, absent + data-vibe=v1; suite; lints' },
    { title: 'Review', detail: '3 independent reviewers try to show v1 changed (reproduction required)' },
    { title: 'Fix', detail: 'regression check, fix, re-prove the affected scenes (≤3 rounds)' },
  ],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const PROMPT = `${NIGHT}/VIBES-PROMPT.md`
const ENG = `${NIGHT}/wt/web-engine`
const HAR = `${NIGHT}/wt/web-harness`
const BASE = `${NIGHT}/wt/web-base`
const HMUT = `${NIGHT}/wt/web-hmut`

const CONTEXT = `
===== PHASE P, WEB (V59 §7: Pweb is green when §7.1, §7.2, §7.5 web and §7.7 web pass) =====
Read ${PROMPT} §7 (lines 790-889) in full and §5 (543-648) for what the engine was supposed to do.
Trees: BASE ${BASE} (detached 928a65e, rack-v58, read-only). ENGINE ${ENG} (branch vibes/engine: the contract + 13 engine WIP commits; vibe.js, tokenised rack.css/auth.css, paint()/icon() call sites, the head script, vibes-css/vibes-scope/colour-literals/vibe-js verifiers, offline prefetch). HARNESS ${HAR} (branch vibes/harness: report/btn-44/prove.mjs etc. — read its header for usage; it serialises through ${NIGHT}/harness.lock; runs are long, so use Bash run_in_background writing ${NIGHT}/proof/<run>/run.log and poll with Read, or shard with --groups/--scenes/--widths; never two harness runs at once).
Evidence so far (read the summaries): control base-vs-base ${NIGHT}/proof/web-control-1 and web-control-2 (120/120 each, 0 pixel/style/rect/svg diffs; control-2 had 3 first-shot raster flips resolved by the re-boot backstop), and the engine agents' partial A/Bs ${NIGHT}/proof/e2b-ab-1, e2b-ab-3-datavibe, e2b-ab-4-final, e3-ab-1, e3-ab-2-final (all 0 diffs on the subsets they ran).
KNOWN PRE-EXISTING RED (not ours; don't touch): rate-band fails under TZ=Pacific/Auckland on the untouched base (NZ daylight saving started 27 Sep 2026). Accept an Auckland rate-band failure only if ${BASE} fails the same checks when run right after in the same zone; report both.`

const PROVE = `${CONTEXT}
===== YOUR JOB: the measured proof =====
1. Harness commit. The harness builder died three times at usage limits; its work is committed as WIP (e75ed43, fbb89d0, 835d9c8, 76e8d73) and nothing is uncommitted. Read \`git -C ${HAR} log 928a65e..HEAD\` and the diff, make sure the committed harness is complete for §7.1 (prove A/B with --data-vibe, the pinned Archivo with its double guard, the fixed clock/zone/seed, reduced motion, no caret, the tree assertion via /vibe.js, rack.css line 1 check, the two added scenes summary + session-drop, shoot and fit modes) — fix only what is missing or wrong — and add ONE final commit on vibes/harness, subject "The v1 proof harness: two trees, pixels and computed styles, a pinned Archivo", body = what it holds fixed, the control numbers (web-control-1 and -2, with the re-boot backstop's count stated plainly), how to run each mode; end with "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>". Explicit paths under report/btn-44/ only; never seed.json.
2. The proof (§7.1): with A = ${BASE} and B = ${ENG}, expected /vibe.js 404,200:
   (a) every scene at 390 and 320, data-vibe ABSENT → must be 0 pixel and 0 computed-style (and rect/svg/text/value/struct) differences;
   (b) every scene at 390 and 320 with --data-vibe v1 → must be 0 and 0.
   Record for each run: compared/expected, every difference class, pixelOnlyAtFirst / resolvedByReboot (the backstop count), seconds. If anything differs, list each differing region/element with scene, width, property, A and B — do NOT fix the engine yourself; report it.
3. Also assert rack.css line 1 is byte-identical (the harness does; quote it).
4. §7.2: the full web suite in three zones on ${ENG} via \`node ${NIGHT}/tools/run-verifiers.mjs web ${ENG} ${NIGHT}/proof/pweb-suite\` (touch-target 408/408; batteries unchanged; the Auckland rate-band rule above).
5. §7.5 web lints are in that suite (colour-literals, vibes-scope, vibes-css, vibe-js) — confirm each passed and quote its check count.
6. One more thing no scene shows: with v1, does the engine make any NEW network request at boot or change sw.js's behaviour (e.g. the offline prefetch in e1cda88)? Diff sw.js and every fetch()/cache call between base and engine; state what a v1 user's phone would request that rack-v58 didn't (should be nothing).
Write ${NIGHT}/proof/pweb/REPORT.md with every number and file path, and return them.`

const PROVE_SCHEMA = {
  type: 'object',
  properties: {
    harness_commit: { type: 'string' },
    absent: { type: 'object', description: 'totals of the data-vibe-absent run' },
    datavibe_v1: { type: 'object', description: 'totals of the data-vibe=v1 run' },
    differences: { type: 'array', items: { type: 'string' } },
    rack_css_line1: { type: 'string' },
    suite: { type: 'string' },
    lints: { type: 'string' },
    network_and_sw: { type: 'string' },
    report_file: { type: 'string' },
    green: { type: 'boolean', description: 'true only if both runs are 0/0 and the suite is green (Auckland rate-band per the rule)' },
  },
  required: ['harness_commit', 'absent', 'datavibe_v1', 'differences', 'rack_css_line1', 'suite', 'lints', 'network_and_sw', 'report_file', 'green'],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      title: { type: 'string' },
      where: { type: 'string', description: 'file:line in the engine tree' },
      before: { type: 'string', description: 'the concrete value/behaviour at 928a65e' },
      after: { type: 'string', description: 'the concrete value/behaviour on the engine' },
      reproduction: { type: 'string', description: 'a failing harness scene, a verifier case, or a code path with the concrete before/after — the exact command or steps' },
      kind: { type: 'string', enum: ['harness-scene', 'verifier-case', 'code-path'] },
    }, required: ['title', 'where', 'before', 'after', 'reproduction', 'kind'] } },
    suspicions: { type: 'array', items: { type: 'string' }, description: 'things you suspect but could NOT reproduce — they go to the report\'s "unsure" list' },
    checked: { type: 'string' },
  },
  required: ['findings', 'suspicions', 'checked'],
}

const LENSES = [
  { key: 'css', text: `CSS/TOKEN LENS. Find any declaration in the engine's rack.css / auth.css whose resolved value differs from 928a65e in ANY state — including states no scene captures: :hover/:active/:focus/:focus-visible, :disabled, the prefers-reduced-motion blocks, the (min-width: 900px) desktop rule, auth.css's (max-width: 380px) rule, ::before/::after, keyframes, and anything a var() chain or the :root split (accent vs p-yellow, well vs rack, danger vs p-red, done vs p-green, inverse vs chalk…) could have moved. The E1 agent's static equivalence tool is ${NIGHT}/tools/e1-equiv.mjs (it claims 3036 declarations, 0 differences) — do not trust it; write your own resolver or attack its assumptions (e.g. shorthands, !important, duplicate declarations, @import order, specificity changes from moved rules). touch-target's cascade rules (single-level :root literals, no border-width tokens, no shorthand tokens) are part of this lens.` },
  { key: 'js', text: `JS/DOM LENS. Find any change a v1 user could see or feel: vibe.js boot (bootVibe, applyVibe, dock swap, onVibeChange/re-render), the head script in index.html (before the stylesheet links; what it does with a garbage 'rack:vibe'), every paint()/icon()/iconHtml()/paintSvg call site vs its 928a65e markup (attributes moved into styles, SVG fill/stroke, the donut stroke, gear/calendar/coach icons, the add tiles, the auth and gate marks), the verifiers whose import lists were taught vibe.js, the offline prefetch (e1cda88) and anything that runs on a timer, touches localStorage (the new 'rack:vibe' key vs purgeDevice/lsKey), or requests the network. Also behaviour: does any tap, sheet, swipe, keyboard or the live-workout beforeunload path behave differently? Scenes the harness has: see ${HAR}/report/btn-44/scenes.json — go after what they don't cover.` },
  { key: 'harness', text: `HARNESS-SENSITIVITY LENS. The P numbers are only as good as the harness. Show it is BLIND to a real change, or that the "0/0" is weaker than it sounds. Use the scratch worktree ${HMUT} (detached 928a65e; restore it clean at the end — \`git -C ${HMUT} checkout -- .\`, delete added files, check git status; take the harness lock like every run). Plant, one at a time, small real differences and run prove.mjs A=${BASE}, B=${HMUT} on the scenes they affect: a 1-unit colour change in a :root token; a 1px padding change; one SVG path character in a dock icon; a letter-spacing .02em→.021em; a ::before colour; a :active-only change (expect the harness to MISS it — say so; that is what the CSS lens covers); a change only at 320px; a change only in the data-vibe="v1" state (e.g. add a [data-vibe="v1"] rule in a scratch copy of rack.css) run with --data-vibe v1. Then judge the re-boot backstop: can a real one-pixel difference hide behind it (a change that renders nondeterministically, or that the backstop could "resolve")? Is the pinned-Archivo guard real (block the font in a scratch copy of the harness under ${NIGHT}/tmp/)? Does the /vibe.js tree assertion really fail when a side serves the wrong tree?` },
]

phase('Prove')
const proof = await agent(`${PREAMBLE}${PROVE}`, { label: 'pweb:prove', phase: 'Prove', schema: PROVE_SCHEMA })
if (!proof) return { error: 'prove agent failed' }
log(`Pweb measured: absent ${JSON.stringify(proof.absent)} · v1 ${JSON.stringify(proof.datavibe_v1)} · green=${proof.green}`)

const review = async (round, focus) => (await parallel(LENSES.map(l => () => agent(`${PREAMBLE}${CONTEXT}
===== YOUR JOB: Pweb adversarial reviewer (${l.key} lens), round ${round} =====
Independently try to show that v1 CHANGED between rack-v58 (${BASE}, 928a65e) and the engine (${ENG}). THE BURDEN OF PROOF (§7.7): a finding counts ONLY with a reproduction — a failing harness scene, a snapshot/computed-style diff, a verifier case, or a code path with a concrete before/after value. Anything you cannot reproduce goes in "suspicions" (the report's "unsure" list), not findings. Do not edit ${ENG} or ${BASE}. The measured proof so far: ${JSON.stringify(proof)}
${focus || ''}
${l.text}`, { label: `pweb:review-${l.key}-r${round}`, phase: 'Review', schema: FINDINGS_SCHEMA })))).map((r, i) => r ? { lens: LENSES[i].key, ...r } : null).filter(Boolean)

let rounds = []
let reviews = await review(1)
rounds.push(reviews)
for (let round = 1; round <= 3; round++) {
  const findings = reviews.flatMap(r => r.findings.map(f => ({ lens: r.lens, ...f })))
  log(`Pweb review round ${round}: ${findings.length} reproduced findings, ${reviews.reduce((a, r) => a + r.suspicions.length, 0)} suspicions`)
  if (!findings.length) break
  phase('Fix')
  const fix = await agent(`${PREAMBLE}${CONTEXT}
===== YOUR JOB: Pweb fixer, round ${round} =====
Reviewers reproduced these v1 changes (or harness blind spots). For EACH: (1) reproduce it; if it does not reproduce, say so with evidence and move on; (2) add a REGRESSION CHECK first — a harness scene, a verifier case in the engine's tools-check (e.g. tools-check/vibe-js.mjs, colour-literals, vibes-css) or in the harness — that fails on the current tree; (3) fix it (engine findings in ${ENG} on vibes/engine; harness findings in ${HAR} on vibes/harness); (4) show the check now passes. Then re-run prove.mjs A=${BASE} B=${ENG} on every scene the fixes could touch at both widths, absent and --data-vibe v1 (0/0 required), and the full web suite in three zones via run-verifiers (Auckland rate-band rule applies). Commit on each branch you touched: engine "Engine (WIP): what the P review found", harness "The v1 proof harness: what the P review found"; end with the Co-Authored-By line. COMMIT OFTEN (usage limits can end your session).
FINDINGS:
${JSON.stringify(findings, null, 1)}`, { label: `pweb:fix-r${round}`, phase: 'Fix', schema: PROVE_SCHEMA })
  if (!fix) break
  reviews = await review(round + 1, `This is re-review round ${round + 1}, after a fix. Re-check these earlier findings specifically, then look for new ones:\n${JSON.stringify(findings.map(f => f.title))}\nThe fixer reported: ${JSON.stringify(fix)}`)
  rounds.push(reviews)
}
const remaining = reviews.flatMap(r => r.findings)
const suspicions = rounds.flat().flatMap(r => r.suspicions.map(s => `${r.lens}: ${s}`))
return { proof, rounds: rounds.map(rs => rs.map(r => ({ lens: r.lens, findings: r.findings, suspicions: r.suspicions, checked: r.checked }))), remaining, suspicions, green: proof.green && remaining.length === 0 }
