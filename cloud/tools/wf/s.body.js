export const meta = {
  name: 'v59-settings-look-vibes',
  description: 'V59 §8 S: storage (settings/vibe), the Vibes sheet and Settings → Look → Vibes on both clients; P re-run (only the Settings hub scene may change); one reviewer per tree',
  phases: [
    { title: 'Build', detail: 'web and native in parallel, each in its own S worktree (the orchestrator already committed the hub row)' },
    { title: 'Review', detail: 'one adversarial reviewer per tree: storage semantics, first paint, the one-row diff' },
    { title: 'Fix', detail: 'fix reproduced findings (≤2 rounds)' },
  ],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const PROMPT = `${NIGHT}/VIBES-PROMPT.md`
const CODEMAP = `${NIGHT}/VIBES-CODEMAP.md`
const RATE = `KNOWN PRE-EXISTING RED (not ours; don't touch): rate-band fails under TZ=Pacific/Auckland on the untouched base trees (NZ daylight saving started 27 Sep 2026). Accept an Auckland rate-band failure only if the base tree (${NIGHT}/wt/web-base or wt/nat-base) fails the same checks when run right after in the same zone; report both.`

const COMMON = `
===== PHASE S (V59 §8): Settings → Look → Vibes, and storage =====
Read ${PROMPT} §8 in full (lines 893-957) and §5.6-§5.8 (web first paint/icons/re-render) or §6.4-§6.5 (native switching/fonts). Codemap ${CODEMAP} "Settings and storage" (lines 922-1190) — but the prompt beats the map: the vibe is saved PER ACCOUNT at users/{uid}/settings/vibe (a plain string id, a plain write(), not a container); only the WEB keeps a device hint (localStorage 'rack:vibe', first frame only); native has NO device key; the account value wins; the default is v1; normVibe() turns anything absent/unknown/garbage into v1, so every existing account stays v1 without a byte written. The Vibes picker design: research/10-menus-settings.md (${NIGHT}/research/10-menus-settings.md, "VIBES PICKER DESIGN") and research/SYNTHESIS.md's picker section.
THE ORCHESTRATOR has already committed the Settings hub row in your worktree (a WIP commit "…hub row…"): a new section "Look" with one row "Vibes" whose value is the current vibe's name, placed as §8.2 says, importing openVibes and vibeName from a module YOU write. Do not edit the hub file (it is a shared file only the orchestrator edits) — if the row needs to change, say so in your report.
The Vibes sheet (§8.3): a tall sheet titled "Vibes", one card per vibe, v1 first (only v1 is registered tonight; each later vibe's card appears in the commit that adds that vibe); each card drawn IN ITS OWN VIBE from its tokens (no app-wide switch) — its ground, a sample card with a real-looking number in its numeral face, its accent, and for image vibes a thumbnail — plus its name, its one-line feel, and "Experimental" where it applies. Tap = apply instantly; the sheet stays open; the current one is marked in a way that does not rely on colour alone. Works offline. 44+ targets. The sheet re-renders in the chosen vibe and must be readable in every vibe. Size with classes/styles, never element.style.height. Words: the card shows the vibe's registered name and feel verbatim; add no other copy beyond what §8 names ("Vibes", "Look", "Experimental", and a marker for the current one — keep it minimal and say exactly what text you added).
${RATE}
COMMIT OFTEN (a usage limit can end your session without warning). Messages via Write under ${NIGHT}/tmp/, \`git -C <wt> commit -F <file>\`, ending with "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>". Explicit paths only; never node_modules or report/btn-44/seed.json.`

const WEB = `${COMMON}
===== YOUR JOB: S on the web =====
Worktree: ${NIGHT}/wt/web-settings (branch vibes/settings, from web main after the engine merge; vibe.js, vibes/defs, the tokenised CSS are there). Base for the proof: ${NIGHT}/wt/web-base (928a65e). Harness: ${NIGHT}/wt/web-harness/report/btn-44/prove.mjs (read its header; it holds ${NIGHT}/harness.lock).
1. store.js: initVibe() / vibe() / setVibe(id), modelled on initUnits / setUnits (store.js ~826-846): normVibe on every read; setVibe applies instantly (vibe.js applyVibe), updates the device key, then awaits write('settings/vibe', id); on a refusal it reverts (apply + device key) and lets the existing refusal UI show. In app.js's watchAuth callback, reconcile to LS.get('mirror:settings/vibe') (normVibe) BEFORE #auth hides; \`await initVibe()\` beside \`await initUnits()\`. Read vibe.js first — the engine already exposes applyVibe/current/onVibeChange, the picker-asset prefetch and the head script; reuse, don't duplicate.
2. vibes-sheet.js (new module): export openVibes(onEdit) and vibeName(). Each card's own-vibe drawing: set the card's CSS custom properties inline from the def through the contract's ROLES map (the same values vibes-css.mjs would generate) so the card does not depend on the active vibe; its numeral face comes from the vibe's picker face (prefetched; offline). No colour literal in the source (tools-check/colour-literals.mjs must pass). Style it in rack.css with plain classes (rack.css is otherwise frozen for v1 — you may ADD new rules for the new sheet's own classes only; say so; never change an existing rule).
3. tools-check/vibe-setting.mjs (new verifier, house style): normVibe on read (absent, '', 'V1', 'garbage', 42, an unregistered id → v1); setVibe writes a plain string to settings/vibe (not a container; destructive-write guard untouched); a refused write reverts the applied vibe and the device key; watchAuth reconciles to the mirror before #auth hides; the account value beats the device key; openVibes lists v1 first and marks the current one; no element.style.height/minHeight/maxHeight. Prove it goes red on a planted mistake in a scratch copy.
4. Docs: AGENTS.md — document settings/vibe (a plain string id, normVibe, per account, no rules change needed live: settings has its own .write and the only $other:false is inside units). README.md / CLAUDE.md only where they became untrue (CLAUDE.md's layout table gets vibe.js / vibes/ / vibes-sheet.js).
5. P re-run (§8.5): prove.mjs A=${NIGHT}/wt/web-base B=${NIGHT}/wt/web-settings, every scene, both widths, data-vibe absent AND --data-vibe v1: every scene 0/0 EXCEPT the Settings hub scene(s); for those, show the diff is exactly the one added section and row (and whatever the section's position moves below it — list it). Full web suite in three zones (the new verifier included; touch-target 408/408 — if the new row changes touch-target's measured set, explain; never regenerate its snapshot without saying exactly why).
6. Commit on vibes/settings: "Settings: Look → Vibes" (WIP commits before it are fine; the orchestrator squashes). Return the proof numbers, the suite, every copy string you added, and what's left.`

const NAT = `${COMMON}
===== YOUR JOB: S on native =====
Worktree: ${NIGHT}/wt/nat-settings (branch vibes/settings, from native main after the engine merge; node_modules is a symlink — never stage it). Base: ${NIGHT}/wt/nat-base (1cb6498). Proof: tools/verify-vibe-v1.mjs (212 scenes; baseline sha256-pinned; \`--rebaseline '<scene substring>'\` writes tools/vibe-v1.rebaseline.json as an overlay and refuses if any other scene moved).
1. src/state/vibe.js (the engine's store): add storage — initVibe() reads settings/vibe (normVibe) and applies via switchVibe (faces load, then apply); setVibe/switchVibe from the sheet writes the plain string with the store's write(); a refusal reverts. In app/_layout.jsx's watchAuth callback: after hydrate, BEFORE setUser(u), read LS.get('mirror:settings/vibe') and \`await switchVibe(…)\` while the native splash is still held. initVibe beside initUnits in app/(app)/_layout.jsx. resetVibe in resetAll (src/state/reset.js): the in-memory vibe goes back to v1; the account value stays in the database. The signed-out screens (sign-in, the gates) and the JS splash stay v1. StatusBar / keyboardAppearance / DateTimePicker themeVariant already follow the vibe (N3) — confirm with the new real path.
2. src/ui/settings/vibes.jsx (new): export openVibes() and vibeName(). The sheet per §8.3; call the engine's loadPickerFaces() when it opens and draw each card's numeral in the face it returns (null = the current face); pick with switchVibe(id); the sheet lives in SheetHost, so it survives the remount and repaints. Each card is drawn from ITS def's tokens (build the def's theme with theme.js build() for the card, or read the def's roles directly) — not from T. No colour literal in source (the lints must pass).
3. Rules: add to tools/rules/build.mjs's settings: block exactly this entry (the validate string is a JS template literal in build.mjs, as the prompt writes it): vibe: { '.validate': newData.isString() && newData.val().length <= 32 && newData.val().matches(/^[a-z0-9][a-z0-9-]*$/) } — see ${PROMPT} lines 923-926 for the exact text (no enum — a new vibe must never need a republish), regenerate the three PROPOSED files WITH THE GENERATOR (read how the rules tools are run; verify-generator-level must stay green; tools/rules/prove too). Say in your report that editing these files publishes nothing — Micah pastes rules — and that the LIVE rules need no change.
4. A verifier (tools/verify-vibe-setting.mjs): normVibe on read; the plain-string write; refusal revert; the watchAuth ordering (apply before setUser); resetVibe; signed-out screens stay v1; the sheet lists v1 first and marks the current one. Prove it goes red on a planted mistake in a scratch copy.
5. Docs: AGENTS.md — settings/vibe; the proposed-rules entry.
6. Re-baseline ONLY the Settings-hub scene(s) (§8.5): \`node tools/verify-vibe-v1.mjs --rebaseline 'Settings'\` (or the exact scene names) — show the diff (one added section, one row, and anything below it that moved) in your report and in the commit message; every other scene byte-identical. Theme identity --require-build; the full native suite in three zones.
7. Commit on vibes/settings: "settings: Look → Vibes (V59 §8)". Return the numbers, the re-baselined scenes with their diff, every copy string you added, and what's left.`

const REPORT = {
  type: 'object',
  properties: {
    commit: { type: 'string' }, done: { type: 'array', items: { type: 'string' } },
    copy_added: { type: 'array', items: { type: 'string' } },
    proof: { type: 'string' }, suite: { type: 'string' },
    left: { type: 'array', items: { type: 'string' } }, risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['commit', 'done', 'copy_added', 'proof', 'suite', 'left', 'risks'],
}
const FINDINGS = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      title: { type: 'string' }, where: { type: 'string' }, expected: { type: 'string' }, actual: { type: 'string' }, reproduction: { type: 'string' } },
      required: ['title', 'where', 'expected', 'actual', 'reproduction'] } },
    suspicions: { type: 'array', items: { type: 'string' } },
  },
  required: ['findings', 'suspicions'],
}

const TREES = [
  { key: 'web', job: WEB, wt: `${NIGHT}/wt/web-settings` },
  { key: 'nat', job: NAT, wt: `${NIGHT}/wt/nat-settings` },
].filter(t => !(args && args.trees) || args.trees.includes(t.key))
log(`S for: ${TREES.map(t => t.key).join(', ')}`)

const out = await pipeline(TREES,
  t => agent(`${PREAMBLE}${t.job}`, { label: `S:${t.key}`, phase: 'Build', schema: REPORT }),
  async (built, t) => {
    if (!built) return { key: t.key, built: null }
    const rev = async (round) => agent(`${PREAMBLE}${COMMON}
===== YOUR JOB: adversarial reviewer of S (${t.key}), round ${round} =====
The builder's worktree: ${t.wt}. Its report: ${JSON.stringify(built)}
Try to break it, with a reproduction for every finding (a verifier case, a harness/snapshot diff, or a code path with concrete before/after): an existing account (no settings/vibe) must stay v1 with no write; garbage in settings/vibe must read as v1; the account value must win over the device hint (web); a refused write must revert; the first paint must be the right vibe (web: no v1 flash for a non-v1 account on this device; native: applied before setUser while the splash is held); sign-out/resetVibe; the sheet: v1 first, current marked without colour alone, 44pt targets, stays open, readable, no copy beyond what §8 names; the ONLY visible change to v1 is the one row (every other scene 0/0 / byte-identical); rules: exactly the validate expression given, generator-made, verify-generator-level green; no new dependency; no element.style.height. Do not edit the worktree.`,
      { label: `S:review-${t.key}-r${round}`, phase: 'Review', schema: FINDINGS })
    let r = await rev(1)
    const hist = [r]
    for (let round = 1; round <= 2 && r && r.findings.length; round++) {
      const fixed = await agent(`${PREAMBLE}${t.job}\n\n===== YOU ARE THE FIXER (round ${round}) =====\nThe S work is committed in ${t.wt}. A reviewer reproduced these; for each: reproduce, add a regression check, fix, re-run the proof and the suite, commit (new commit, same branch). FINDINGS:\n${JSON.stringify(r.findings, null, 1)}`, { label: `S:fix-${t.key}-r${round}`, phase: 'Fix', schema: REPORT })
      if (!fixed) break
      built = fixed
      r = await rev(round + 1)
      hist.push(r)
    }
    return { key: t.key, built, reviews: hist }
  })
return out
