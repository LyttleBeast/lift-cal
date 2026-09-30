export const meta = {
  name: 'v59-pnat-gate',
  description: 'V59 §7 Pnat: host-prop snapshot + theme identity (--require-build) + lints + suite ×3 zones on the native engine, then 3 adversarial reviewers with a burden of proof and ≤3 fix rounds',
  phases: [
    { title: 'Prove', detail: 'verify-vibe-v1 byte-identical, theme identity --require-build, lints, switch, suite ×3 zones' },
    { title: 'Review', detail: '3 independent reviewers try to show v1 changed (reproduction required)' },
    { title: 'Fix', detail: 'regression check, fix, re-prove (≤3 rounds)' },
  ],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const PROMPT = `${NIGHT}/VIBES-PROMPT.md`
const ENG = `${NIGHT}/wt/nat-engine`
const PROOF = `${NIGHT}/wt/nat-proof`
const BASE = `${NIGHT}/wt/nat-base`
const HMUT = `${NIGHT}/wt/nat-hmut`

const CONTEXT = `
===== PHASE P, NATIVE (V59 §7: Pnat is green when §7.3, §7.4, §7.5 native, §7.6 and §7.7 native pass) =====
Read ${PROMPT} §6 (lines 651-787) and §7 (790-889).
Trees: BASE ${BASE} (detached 1cb6498 = build 58, read-only, node_modules linked). ENGINE ${ENG} (branch vibes/engine: proof + contract + the N1-N4 relay's engine(wip) commits; node_modules is a symlink — never stage it). PROOF TOOLS on branch vibes/proof (${PROOF}, tip 7180d40): tools/verify-vibe-v1.mjs (212 scenes / 25,516 hosts, baseline sha256-pinned at 1cb6498; \`--root <tree>\` judges another tree; \`--rebaseline\` writes an overlay only) and tools/verify-theme-identity.mjs (\`--root <tree> --strict --require-build\`). Their remaining blind spots are listed in ${NIGHT}/proof/natproof-fix2/ and the fix commit's message (\`git -C ${PROOF} show 7180d40\`): same-hex token choice, in-place edits with v1 values, unreachable states, pixels/real layout.
KNOWN PRE-EXISTING RED (not ours; don't touch): verify-rate-band fails under TZ=Pacific/Auckland on the untouched base (NZ daylight saving started 27 Sep 2026). Accept an Auckland rate-band failure only if ${BASE} fails the same checks when run right after in the same zone; report both.
Held batteries: coach-prog 57/0/0 + ratings 16/0/0, overlap 24/0/0, ready 46/0/0, fuel 16/0/0, finish 12/0/0, volume 72/0/0 — unchanged in all three zones.`

const PROVE = `${CONTEXT}
===== YOUR JOB: the measured proof =====
1. Make sure ${ENG} contains the final proof and contract: if \`git -C ${ENG} log --oneline vibes/engine..vibes/proof\` or \`..vibes/contract\` lists commits whose patches are not already in the branch (\`git cherry\`), make the tree clean and rebase. Report the engine tip.
2. §7.3: \`node tools/verify-vibe-v1.mjs\` in ${ENG} (the in-tree copy) AND \`node ${PROOF}/tools/verify-vibe-v1.mjs --root ${ENG}\` (the proof branch's copy judging the engine) — both byte-identical to the 1cb6498 baseline; nothing re-baselined (\`git -C ${ENG} ls-files tools/vibe-v1.rebaseline.json\` must be empty; the baseline file must equal vibes/proof's byte for byte).
3. §7.4: \`node ${PROOF}/tools/verify-theme-identity.mjs --root ${ENG} --strict --require-build\` and the in-tree copy — pass; quote the check counts.
4. §7.5 native lints: verify-no-colour-literals, verify-no-module-scope-theme, verify-no-theme-in-worklet (or whatever N2 named them) — pass; quote counts; show each goes red on one planted violation in a scratch copy under ${NIGHT}/tmp/ (not the worktree).
5. §7.6: the full native suite in three zones via \`node ${NIGHT}/tools/run-verifiers.mjs nat ${ENG} ${NIGHT}/proof/pnat-suite\` — every verifier green (Auckland rate-band rule), batteries unchanged (compare with ${NIGHT}/proof/baseline-verifiers/nat/summary.json using ${NIGHT}/tools/batteries.mjs). Count the verifiers (81 at the start + the night's new ones) and list the new ones with their check counts.
6. The engine's own switch proof: verify-vibe-switch (mid-session switch keeps the session, sets, rest timer, food day) — quote its count.
7. Package and native-build fences: \`git -C ${ENG} diff --name-only 1cb6498..HEAD\` must not include package.json, package-lock.json, app.json plugins changes, ios/, or node_modules; list any app.json change at all.
Write ${NIGHT}/proof/pnat/REPORT.md with every number and path, and return them.`

const PROVE_SCHEMA = {
  type: 'object',
  properties: {
    engine_tip: { type: 'string' },
    snapshot: { type: 'string' }, theme_identity: { type: 'string' }, lints: { type: 'string' },
    suite: { type: 'string' }, batteries: { type: 'string' }, switch: { type: 'string' },
    new_verifiers: { type: 'array', items: { type: 'string' } },
    fences: { type: 'string' },
    differences: { type: 'array', items: { type: 'string' } },
    report_file: { type: 'string' },
    green: { type: 'boolean' },
  },
  required: ['engine_tip', 'snapshot', 'theme_identity', 'lints', 'suite', 'batteries', 'switch', 'new_verifiers', 'fences', 'differences', 'report_file', 'green'],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      title: { type: 'string' }, where: { type: 'string' },
      before: { type: 'string', description: 'concrete value/prop/behaviour at 1cb6498' },
      after: { type: 'string', description: 'concrete value/prop/behaviour on the engine' },
      reproduction: { type: 'string', description: 'a snapshot diff, a verifier case, or a code path with the concrete before/after — the exact command or steps' },
      kind: { type: 'string', enum: ['snapshot-diff', 'verifier-case', 'code-path'] },
    }, required: ['title', 'where', 'before', 'after', 'reproduction', 'kind'] } },
    suspicions: { type: 'array', items: { type: 'string' } },
    checked: { type: 'string' },
  },
  required: ['findings', 'suspicions', 'checked'],
}

const LENSES = [
  { key: 'theme', text: `THEME/TOKEN LENS. theme.js build()/applyTheme() and every new slot: does build(v1) reproduce EVERY value the 1cb6498 theme produced, including function outputs at arguments the identity verifier did not sample (type() argument sets at call sites it skipped, face() pairs, layout functions at unusual insets, loadNum sizes)? Same-hex token choices the snapshot cannot see: at each call site the engine changed, is the NEW token the right semantic role (accent vs pYellow data, warn vs pYellow, well vs rack, danger vs pRed, done vs pGreen, inverse vs chalk, onPlate vs page)? Build a SENTINEL vibe in a scratch copy (every role a distinct colour), render a few screens with it, and look for any site whose colour follows the wrong role — a wrong role is a reproduced finding (it changes a future vibe, and it contradicts the web engine's sorting: compare with the web engine's decisions in ${NIGHT}/wt/web-engine's commit messages). Also T.systemFace at the system-font sites: v1 must add no fontFamily key anywhere.` },
  { key: 'runtime', text: `RUNTIME/COMPONENT LENS. What a v1 user could see or feel that host props don't show: the keyed remount of (app)'s Stack (does v1 ever remount? does boot take longer or show a frame of the splash?), usePathname() in (app)/_layout re-rendering, the root siblings' useSyncExternalStore subscriptions, the font gate (does v1 boot still gate only on Archivo's four faces, in the same order?), useFonts map identity, worklets capturing hoisted strings (same UI-thread values?), the image-slot layer (no image → the IDENTICAL host tree, no wrapper, no undefined-valued keys), T.cardSkin at the hand-rolled cards, the variant switches (v1 branch = today's JSX), StatusBar/keyboardAppearance/DateTimePicker props, and anything that changes timing, haptics, sounds, layout animation or navigation. Read the engine diff (\`git -C ${ENG} diff 1cb6498..HEAD -- app src\`) with a v1 user in mind.` },
  { key: 'coverage', text: `PROOF-COVERAGE LENS. The snapshot proves only what its scenes draw. (1) Map every hunk of the engine's diff under app/ and src/ (\`git -C ${ENG} diff 1cb6498..HEAD -- app src\`) to a snapshot scene that renders it (use the proof's --list and --dump, V8 coverage via NODE_V8_COVERAGE on a verify-vibe-v1 run, or rn-render instrumentation). List every changed line/branch NO scene executes. For each one, decide from the code whether its v1 output is byte-identical to 1cb6498's; if you can show a concrete difference, it is a finding; if you cannot decide, it is a suspicion. (2) Plant engine-like mistakes in ${HMUT} (scratch; restore clean at the end with a node script that writes originals back, or git checkout if allowed) — e.g. a changed call site using the wrong token with the SAME v1 hex (should pass: that's the theme lens's job), a changed style key order, an undefined-valued key, an extra wrapper View at an image slot — and confirm verify-vibe-v1 --root ${HMUT} catches the ones that change host props.` },
]

phase('Prove')
const proof = await agent(`${PREAMBLE}${PROVE}`, { label: 'pnat:prove', phase: 'Prove', schema: PROVE_SCHEMA })
if (!proof) return { error: 'prove agent failed' }
log(`Pnat measured: ${proof.snapshot} · theme ${proof.theme_identity} · suite ${proof.suite} · green=${proof.green}`)

const review = async (round, focus) => (await parallel(LENSES.map(l => () => agent(`${PREAMBLE}${CONTEXT}
===== YOUR JOB: Pnat adversarial reviewer (${l.key} lens), round ${round} =====
Independently try to show that v1 CHANGED between build 58 (${BASE}, 1cb6498) and the engine (${ENG}). THE BURDEN OF PROOF (§7.7): a finding counts ONLY with a reproduction — a snapshot diff, a verifier case, or a code path with a concrete before/after value. Anything you cannot reproduce goes in "suspicions". Do not edit ${ENG}, ${BASE} or ${PROOF}. The measured proof: ${JSON.stringify(proof)}
${focus || ''}
${l.text}`, { label: `pnat:review-${l.key}-r${round}`, phase: 'Review', schema: FINDINGS_SCHEMA })))).map((r, i) => r ? { lens: LENSES[i].key, ...r } : null).filter(Boolean)

let rounds = []
let reviews = await review(1)
rounds.push(reviews)
for (let round = 1; round <= 3; round++) {
  const findings = reviews.flatMap(r => r.findings.map(f => ({ lens: r.lens, ...f })))
  log(`Pnat review round ${round}: ${findings.length} reproduced findings, ${reviews.reduce((a, r) => a + r.suspicions.length, 0)} suspicions`)
  if (!findings.length) break
  phase('Fix')
  const fix = await agent(`${PREAMBLE}${CONTEXT}
===== YOUR JOB: Pnat fixer, round ${round} =====
Reviewers reproduced these. For EACH: (1) reproduce it (if it doesn't, say so with evidence); (2) add a REGRESSION CHECK first — a verifier case in the engine tree (tools/verify-theme-build.mjs, verify-vibe-switch, a lint, or a new small verifier), or a new scene in the proof on vibes/proof (${PROOF}; if you add a scene, the baseline must be re-captured FROM ${BASE} with --write-baseline, which refuses a dirty or non-1cb6498 tree, and the new pin committed) — that fails now; (3) fix it in ${ENG} on vibes/engine; (4) show the check passes, verify-vibe-v1 is byte-identical, theme identity --require-build passes, and the full native suite is green in three zones (Auckland rate-band rule). Commit on each branch you touched: engine "engine(wip): what the P review found (V59 §7.7)", proof "tools: the v1 proof — what the P review found (V59 §7.7)"; Co-Authored-By line at the end. If you changed vibes/proof, rebase vibes/engine onto it. COMMIT OFTEN.
FINDINGS:
${JSON.stringify(findings, null, 1)}`, { label: `pnat:fix-r${round}`, phase: 'Fix', schema: PROVE_SCHEMA })
  if (!fix) break
  reviews = await review(round + 1, `Re-review round ${round + 1}, after a fix. Re-check these earlier findings, then look for new ones:\n${JSON.stringify(findings.map(f => f.title))}\nThe fixer reported: ${JSON.stringify(fix)}`)
  rounds.push(reviews)
}
const remaining = reviews.flatMap(r => r.findings)
const suspicions = rounds.flat().flatMap(r => r.suspicions.map(s => `${r.lens}: ${s}`))
return { proof, rounds: rounds.map(rs => rs.map(r => ({ lens: r.lens, findings: r.findings, suspicions: r.suspicions, checked: r.checked }))), remaining, suspicions, green: proof.green && remaining.length === 0 }
