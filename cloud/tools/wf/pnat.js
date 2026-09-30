export const meta = {
  name: 'v59-pnat-gate',
  description: 'V59 §7 Pnat: host-prop snapshot + theme identity (--require-build) + lints + suite ×3 zones on the native engine, then 3 adversarial reviewers with a burden of proof and ≤3 fix rounds',
  phases: [
    { title: 'Prove', detail: 'verify-vibe-v1 byte-identical, theme identity --require-build, lints, switch, suite ×3 zones' },
    { title: 'Review', detail: '3 independent reviewers try to show v1 changed (reproduction required)' },
    { title: 'Fix', detail: 'regression check, fix, re-prove (≤3 rounds)' },
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
