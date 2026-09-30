export const meta = {
  name: 'v59-settings-look-vibes',
  description: 'V59 §8 S: storage (settings/vibe), the Vibes sheet and Settings → Look → Vibes on both clients; P re-run (only the Settings hub scene may change); one reviewer per tree',
  phases: [
    { title: 'Build', detail: 'web and native in parallel, each in its own S worktree (the orchestrator already committed the hub row)' },
    { title: 'Review', detail: 'one adversarial reviewer per tree: storage semantics, first paint, the one-row diff' },
    { title: 'Fix', detail: 'fix reproduced findings (≤2 rounds)' },
  ],
}

const PREAMBLE = `You are one agent in an unattended overnight build of "Vibes" for Rack (a phone-first training, nutrition and bodyweight log; web PWA + native iOS app). Nobody is watching until morning. The orchestrator gives you this brief; it begins with the build prompt's §0 verbatim, then Micah's rules, then the superseded-advice list, then the staging rule, then session facts, then your job.

===== §0 (verbatim) =====
## 0. Ground rules (the fence)

- **No push, deploy or publish.** No \`git push\`, \`wrangler\`, \`firebase\`, \`eas\`,
  \`gh\`, \`gh-pages\`. Commit through the hooks, never \`--no-verify\`.
- **Three canaries at the start, and again on every resume. Log all three
  results. If any one runs, stop.**
  - \`echo GUARDTEST ping\` must be refused (deny list).
  - \`echo GUARDTEST-MOBILE ping\` must be refused (deny list).
  - \`echo hookcheck wrangler\` must come back **"BLOCKED by deny-compound"**.
    This proves the PreToolUse hook is live and not failing open.
- **The hook (\`~/dev/deny-compound.mjs\`)** blocks any Bash command whose *text*
  contains a fenced word anywhere, even inside a path, a grep pattern or a
  commit message. The words are \`firebase\`, \`wrangler\`, \`eas\`, \`curl\`, \`wget\`,
  \`sed -i\`, \`git push\`, \`--no-verify\`, a whitespace-led \`-…n\` flag inside
  \`git commit\`, and redirects into \`.claude/\`. So:
  - search with the **Grep tool**, never with Bash;
  - **always commit with \`git commit -F <file>\`**, the message written with
    Write (the hook can't see file contents);
  - stage by directory when a file name contains a fenced word (e.g.
    \`git add report/btn-44/fakes\`);
  - write outputs under \`~/dev/vibes-night\`, never by redirecting.
- **If a required action is refused** (by the deny list, the hook, or auto
  mode), **don't retry it in other words.** Log it, take the documented
  fallback, and move on.
- **Where any CLAUDE.md or AGENTS.md says "stop and ask"**, nobody is here to
  answer. Log the question under "decisions left to Micah" and skip that one
  item.
- **Files go through Read, Edit, Write and Grep.**
  - Bash runs only these:
    - \`node\`, including the verifiers under \`TZ=…\`;
    - \`python3 -m http.server --bind 127.0.0.1\`, and headless Chrome, both
      through the harness;
    - \`sips\`;
    - git: read-only commands, plus \`git add\` **with explicit paths**,
      \`commit -F\`, \`merge\`, \`rebase\`, \`branch\`, \`worktree\`, and \`fetch web\`
      (in rack-mobile);
    - \`ln -s\` and \`rm\` of a worktree's \`node_modules\` symlink (§3.2);
    - \`mkdir\` under \`~/dev/vibes-night\`;
    - \`kill\` / \`pgrep\` for this night's own harness processes.
  - No \`sed\`, \`awk\`, \`cat\`, \`wc\`, heredocs, \`tee\`, or pipes into
    \`grep\`/\`head\`/\`tail\`.
- **Network, and nothing else:**
  - WebSearch/WebFetch for research;
  - a \`node\` script using \`fetch()\`, to the hosts in §14 only;
  - \`npm --prefix ~/dev/vibes-night/tools install <pkg>\` for dev tools;
  - \`git -C ~/dev/rack-mobile fetch web\`;
  - the harness's Chrome loading fonts (§7.1 pins Archivo locally anyway).
- **No npm install into either app.**
  - Web has no \`package.json\` and must not get one.
  - Native gets **no new dependency**: \`package.json\`, the lockfile, \`app.json\`
    plugins and \`ios/\` stay untouched.
  - Dev tools (an image tracer, a font subsetter, a PNG encoder, Chrome for
    Testing) go only in \`~/dev/vibes-night/tools\`, with the reason logged.
  - macOS \`sips\` is the first choice for image work.
- **No native builds:** no \`npx expo run:ios\`, \`expo prebuild\`, \`pod install\` or
  \`xcodebuild\`. Micah rebuilds in the morning.
- **Never open** \`~/dev/rack-worker\`, \`~/dev/rack-food\`, \`~/live\`, or any
  \`~/dev/ship-v*\` other than \`ship-v59\`. Native reads web through the
  \`ship-v59\` files in this same session, or through
  \`git -C ~/dev/rack-mobile show web/main:<file>\`.
- **Unchanged by one byte** (the fence also denies edits to them, in the main
  trees and in \`~/dev/vibes-night/wt/**\`):
  - web \`database.rules.json\` and \`database.rules.OPTIONAL-LOCK.json\`;
  - **the pinned pure modules, in both trees:** \`exercises.js\`,
    \`analytics.js\`, \`tdee.js\`, \`units.js\`, \`accounts.js\`, \`insights.js\`,
    \`estimate-origin.js\`, \`estimate-ask.js\`, \`coach.js\`, \`coach-build.js\`,
    \`coach-live.js\`, \`coach-prog.js\`, \`coach-goal.js\`, \`coach-overlap.js\`,
    \`coach-ready.js\`, \`coach-fuel.js\`, \`coach-volume.js\`, \`coach-tags.js\`.
    Their colours are mapped **at the call sites** (§5, §6).
  - **Not pinned** (native-only view modules): \`src/pure/coach-view.js\` and
    \`src/pure/recap-view.js\`. \`coach-view.js\` may gain an optional metrics
    argument (§6.6).
- **Delete nothing** except your own scratch under \`~/dev/vibes-night/\`, your
  own worktrees, and worktree \`node_modules\` symlinks.

**Micah's rules:**

- A wrong number, or an untrue sentence, is worse than none.
- Web is the guinea pig and native is the destination. Judge every visual
  decision by how it lands **on the phone**.
- Logic and data shared by both clients live in **pure modules copied
  verbatim** into native, sha256-pinned, with a \`verify-*-verbatim.mjs\`.
- Add no gate and remove none. Every vibe is for everyone.
- **Vibes change how Rack looks, never what it says or does.** No copy changes,
  no feature changes, no data changes (except the one new setting in §8).

**Precedent you must not repeat:** on 3–4 Sep an unattended "improvement pass"
re-tokenised the colours and deployed per phase. Micah had it **reverted in
full**. Tonight is different on purpose: nothing deploys, v1 is **proven**
identical before anything else lands, and every phase is its own commit, so
any single piece can be reverted without touching the others.

===== Codemap advice that this prompt supersedes (§3.3, verbatim) =====
1. "Make the vibe device-local" / "add a \`rack:device:\` prefix to ls.js."
   **No:** the vibe is saved per account; only the *web* keeps a device hint;
   native has no device key.
2. "All vibes stay dark-ground" / "dark tops only." **No:** light vibes are
   allowed (§10).
3. The web head script goes "after the stylesheet links." **No: before** them
   (§5.6).
4. "The harness fails all off-machine requests." **No:** it lets Google Fonts
   through. §7.1 pins Archivo locally instead.
5. "A 'Vibe' row under App." **No:** a new section, **Look → Vibes** (§8.2).
6. "The proposed-rules addition is optional." **No:** it's required (§8.1).
7. "Defer the experimental rearranging vibe." **No:** it's in scope (§12).

===== The staging rule (§3.2, verbatim) =====
- **Don't use a workflow's \`isolation: 'worktree'\`.** It places worktrees
  under \`.claude/\`, where the fence and hook get in the way, and it may branch
  from \`origin/main\` rather than your HEAD.
- **You create every worktree yourself, from the current HEAD:**
  - \`git -C ~/dev/ship-v59 worktree add ~/dev/vibes-night/wt/web-<name> -b vibes/<name>\`
  - \`git -C ~/dev/rack-mobile worktree add ~/dev/vibes-night/wt/nat-<name> -b vibes/<name>\`
  
  Give each agent the **absolute path** of its worktree.
- **rack-mobile worktrees need \`node_modules\`.**
  - Link it in:
    \`ln -s ~/dev/rack-mobile/node_modules ~/dev/vibes-night/wt/nat-<name>/node_modules\`.
    The symlink is **untracked**; \`.gitignore\`'s \`node_modules/\` only
    matches directories.
  - **Never** use \`git add -A\`, \`git add .\` or \`git add :/\` in any worktree.
    Stage explicit paths only.
  - Before every merge, run \`git -C ~/dev/rack-mobile diff --name-only main...vibes/<name>\`
    and refuse the merge if \`node_modules\` appears.
  - To retire the worktree, \`rm ~/dev/vibes-night/wt/nat-<name>/node_modules\`
    (the link only, no trailing slash), then \`git worktree remove\` with no
    \`--force\`.
  - Apply all of this to the \`1cb6498\` baseline worktree (§7.3) too.
- **Who edits what.**
  - During E and N, exactly **one engine agent per tree**, on its own
    branch/worktree, owns \`theme.js\` / \`rack.css\` and the engine files.
  - From P onward, **only you** edit the shared files: \`theme.js\`,
    \`rack.css\`'s \`:root\`, \`index.html\`'s \`<link>\` lines, the vibe registries
    and the Settings hubs. Only you merge into \`main\`.
  - Vibe agents write only their own vibe's files.
  - Keep history linear, and never force anything.
("You" in the staging rule is the orchestrator. The orchestrator creates worktrees and merges; you work only where your job says.)

===== Session facts (from the orchestrator) =====
- Web main tree: /Users/micahflunker/dev/ship-v59 (HEAD 928a65e = rack-v58). Native main tree: /Users/micahflunker/dev/rack-mobile (HEAD 1cb6498 = buildNumber 58). Never edit, stage or commit in either main tree; never merge into main. Work only where your job says.
- The orchestrator ran all three canaries at the start and on resume; all held. You need not run them.
- There is NO Grep tool and NO Glob tool in this session. Search tracked files with read-only git: \`git -C <tree> grep -n -e <pattern> -- <paths>\`. For anything else, or any pattern containing a fenced word, write a small node script under /Users/micahflunker/dev/vibes-night/tools/ and run it with node (the hook reads only the command text, not file contents). Never pipe; no cat/sed/awk/wc/head/tail/ls.
- Downloads: only \`node /Users/micahflunker/dev/vibes-night/tools/fetch.mjs <url> <outfile under ~/dev/vibes-night>\` (enforces §14's hosts, follows redirects only to allowed hosts, prints bytes + sha256). WebSearch and WebFetch are fine for reading pages. Search snippets are not sources: list only URLs you actually opened.
- Dev tools already installed in /Users/micahflunker/dev/vibes-night/tools/node_modules: imagetracerjs, opentype.js, subset-font, pngjs. If you need another, \`npm --prefix /Users/micahflunker/dev/vibes-night/tools install <pkg>\` and state the reason in your final answer.
- This is an 8 GB M1 shared by ~9 agents: keep local work light. Headless Chrome only inside a harness holding /Users/micahflunker/dev/vibes-night/harness.lock.
- Don't edit /Users/micahflunker/dev/vibes-night/VIBES-LOG.md (the orchestrator's log). Report refusals, installs and decisions in your final answer.
- The codemap: /Users/micahflunker/dev/vibes-night/VIBES-CODEMAP.md (line numbers drift; the code wins; the prompt beats the map). The build prompt: /Users/micahflunker/dev/vibes-night/VIBES-PROMPT.md — read only the sections your job names.
`


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
