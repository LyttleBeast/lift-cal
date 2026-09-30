export const meta = {
  name: 'v59-compose-X',
  description: 'V59 §12.1 Phase X: the composition extension — named top-level blocks per screen, a compose role (v1 = today\'s order, no grouping), render order from the vibe on both clients; v1 proven identical',
  phases: [{ title: 'Contract' }, { title: 'Engines' }, { title: 'Check' }],
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
const WEB = `${NIGHT}/wt/web-compose`
const NAT = `${NIGHT}/wt/nat-compose`
const REF = `${NIGHT}/wt/web-mainref`
const HARNESS = `${NIGHT}/wt/web-harness/report/btn-44/prove.mjs`
const CTX = `
MICAH'S CHANGE OF PLAN: high effort; UTC-only suites on branches (\`node ${NIGHT}/tools/run-verifiers.mjs <web|nat> <wt> <outDir> UTC\`). No race hunts.
CURRENT MAINS (the session facts are older): web main a78ec39, native main ba4a447 — engine v2 + v3, Settings → Look → Vibes, Chalk, Navy, Oxblood registered. ${REF} is a clean detached checkout of web main a78ec39 (the v1 reference). Other vibes are being built on vibes/iron-age, vibes/ledger, vibes/clear-sky and polished on vibes/{chalk,navy,oxblood}-polish — never touch those worktrees. Phase X is its OWN branch (vibes/compose): web ${WEB}, native ${NAT} (node_modules is a symlink — never stage it). It merges only after the other vibes land; later vibes will merge over it, so keep the change small and additive.
Commit via Write under ${NIGHT}/tmp/ + \`git -C <wt> commit -F <file>\`, ending "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"; explicit paths; never node_modules. A usage limit can end your session: commit WIP often. RESUMING: if the worktrees show earlier work for this job, continue from it.`
const X = `
===== PHASE X (V59 §12.1): THE COMPOSITION EXTENSION =====
Read ${NIGHT}/VIBES-PROMPT.md §12 (lines 1099-1122) and §2 (191-233: the layout rules — the experimental vibe MAY rearrange within a screen, NEVER the dock; per-screen fallback to "same order, new shapes"). The one vibe that will use it is Meet Day: its spec ${NIGHT}/design/meet-day.md — §8.1 (its compose data, per screen) and §9 (the hooks it needs, X1-X7) — and its asks in ${NIGHT}/tmp/resume9/d4-specs.json (meet-day, engine_asks E2).
Build:
 (1) NAMES: each top-level block of these screens gets a stable name, the same on both clients: the five tab landings (You, Train calendar, Fuel day, Weight, Steps), the workout summary, and the live workout session (its top-bar zone, the position of the exercise-card stack, where the plate strip sits). Only top-level blocks; a block's inside is untouched.
 (2) CONTRACT: a \`compose\` role (dflt {}; v1 = {} = today's order, no grouping) in vibes/defs/{v1,index,vocab}.js — per screen: an ordered list of block names, optional groups (blocks drawn together under one head where the vibe merges them), and an explicit fallback flag per screen. A compose entry must name every block of its screen exactly once (nothing removed, nothing added, nothing hidden), may not touch the dock, and may only group blocks whose own heads/controls all survive. The contract verifiers (web tools-check/vibes-contract.mjs, native tools/verify-vibes-contract.mjs) enforce the grammar, each with a canary that fails. Pure files copied byte for byte to native src/pure/vibes/ and pinned.
 (3) ENGINES: render order (and grouping) comes from the active vibe's compose; with {} every screen renders exactly as today — the same DOM/host tree, order, attributes (a data-block="<name>" hook on the web is fine, as engine v3's data-* hooks were), styles, props. Reorder the DOM (web) / the element list (native), not CSS order, so reading order and focus order follow what is seen. Switching vibes re-renders into the new order without losing state (a live session, its sets, the rest timer, an open sheet).
 (4) Implement ONLY the hooks X1-X7 Meet Day needs if they are cheap and safe; the rest as listed-not-built with the reason.`
const REPORT = { type: 'object', properties: { commit: { type: 'string' }, done: { type: 'array', items: { type: 'string' } }, proof: { type: 'string' }, suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['commit', 'done', 'proof', 'suite_utc', 'left'] }
const CHECK = { type: 'object', properties: { must_fix: { type: 'array', items: { type: 'string' } }, listed_not_fixed: { type: 'array', items: { type: 'string' } }, numbers: { type: 'string' } }, required: ['must_fix', 'listed_not_fixed', 'numbers'] }
const PROOF = `Prove v1 unchanged: \`node ${HARNESS} --a ${REF} --b ${WEB} …\` on EVERY scene at 390 and 320 — data-vibe absent, --data-vibe v1, and --vibe chalk / navy / oxblood: 0 differences in every class except the data-block hooks (attrDiffs absent on A) and the pure files; native verify-vibe-v1 byte-identical (re-baseline NOTHING), theme identity --require-build, verify-vibe-parity/-fit/-switch/-seams; both UTC suites. Then prove the engine works: a SCRATCH vibe under ${NIGHT}/tmp (never registered) whose compose reverses/groups blocks on each screen renders every block and every control once (web: the harness's text/struct in that scratch order; native: verify-vibe-fit's words and controls), the dock unchanged, and switching into it and back mid-session loses nothing.`

phase('Contract')
const contract = await agent(`${PREAMBLE}${CTX}${X}
===== YOUR JOB: the NAMES and the CONTRACT part of Phase X =====
Survey both clients' seven screens and fix the block names (one table, written into vocab.js's compose wording and into ${NIGHT}/design/COMPOSE.md with each name's web selector/function and native component/site). Then the contract change (2) in the web tree, copied byte for byte to native and pinned; both contract verifiers green with their new canaries; both UTC suites. Commit ("Compose (WIP): the names and the contract" / "compose(wip): the names and the contract (V59 §12)").`,
  { label: 'X:contract', phase: 'Contract', schema: REPORT, effort: 'high' })
if (!contract) return { error: 'contract agent died' }

phase('Engines')
const engines = await parallel([
  () => agent(`${PREAMBLE}${CTX}${X}\nThe contract agent reported: ${JSON.stringify(contract)}\n===== YOUR JOB: the WEB engine part of Phase X =====\nWorktree ${WEB}. Implement (3) on the web (the page modules draw each screen's top-level blocks through one small helper that orders/groups them by the active vibe's compose; v1 = today's code path and output) and the cheap, safe hooks of (4). ${PROOF} Commit "Compose (WIP): the web engine".`, { label: 'X:web', phase: 'Engines', schema: REPORT, effort: 'high' }),
  () => agent(`${PREAMBLE}${CTX}${X}\nThe contract agent reported: ${JSON.stringify(contract)}\n===== YOUR JOB: the NATIVE engine part of Phase X =====\nWorktree ${NAT}. Implement (3) natively (each screen's top-level elements go through one small helper ordering/grouping them by T's compose; v1 = today's JSX output, host for host) and the cheap, safe hooks of (4); every new switch site in verify-vibe-seams. ${PROOF} Commit "compose(wip): the native engine (V59 §12)".`, { label: 'X:native', phase: 'Engines', schema: REPORT, effort: 'high' }),
])
phase('Check')
const check = await agent(`${PREAMBLE}${CTX}${X}\nReports: contract ${JSON.stringify(contract)}; engines ${JSON.stringify(engines)}\n===== YOUR JOB: check Phase X (read-only; findings need a reproduction) =====\nRe-run the proofs the builders claim (at least the native snapshot and 14 web scenes — the seven screens at both widths — absent + --data-vibe v1 + --vibe chalk), the scratch-vibe reorder proof, and the grammar canaries. Confirm the block names are the same on both clients and cover every top-level block of the seven screens. Classify must-fix (v1 or a registered vibe moved, a block or control lost under a reorder, a proof red) vs listed-not-fixed.`,
  { label: 'X:check', phase: 'Check', schema: CHECK, effort: 'high' })
let fix = null, recheck = null
if (check && check.must_fix.length) {
  fix = await agent(`${PREAMBLE}${CTX}${X}\n===== YOUR JOB: fix Phase X's must-fix items =====\nItems: ${JSON.stringify(check.must_fix)}. Reproduce, fix, show the check passes; keep v1 and the registered vibes unchanged. Commit on the branch(es) touched.`, { label: 'X:fix', phase: 'Engines', schema: REPORT, effort: 'high' })
  if (fix) recheck = await agent(`${PREAMBLE}${CTX}${X}\n===== YOUR JOB: re-check Phase X after its fix =====\nThe check found ${JSON.stringify(check.must_fix)}; the fixer reported ${JSON.stringify(fix)}. Re-run in full: native verify-vibe-v1 + theme identity + suite; web prove A=${REF} B=${WEB} on EVERY scene at both widths, absent / --data-vibe v1 / --vibe chalk / navy / oxblood; the scratch reorder proof. Report must_fix and listed_not_fixed.`, { label: 'X:recheck', phase: 'Check', schema: CHECK, effort: 'high' })
}
return { contract, engines, check, fix, recheck }
