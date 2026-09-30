export const meta = {
  name: 'v59-engine-3-fix',
  description: 'Engine v3: make two contract sentences true (Chalk cue.ink, native hero props), then re-prove the branch (with Navy merged in) against main: v1, Chalk and Navy unchanged',
  phases: [{ title: 'Fix' }, { title: 'Prove' }],
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
const WEB = `${NIGHT}/wt/web-ev3`
const NAT = `${NIGHT}/wt/nat-ev3`
const REF = `${NIGHT}/wt/web-mainref`
const HARNESS = `${NIGHT}/wt/web-harness/report/btn-44/prove.mjs`
const CTX = `
MICAH'S CHANGE OF PLAN: high effort; UTC-only suites on branches (\`node ${NIGHT}/tools/run-verifiers.mjs <web|nat> <wt> <outDir> UTC\`). No race hunts.
CURRENT MAINS (the session facts are older): web main 10fe73b, native main d2af836 — engine v2, Settings → Look → Vibes, Chalk and Navy. Engine v3 is on branch vibes/engine3: web ${WEB} (HEAD 87009ff: the contract 39d0605, the web engine up to c8a66c5, main merged in a80df3f, Navy's regenerated tokens 87009ff), native ${NAT} (HEAD 1eb0232: contract ee932af, engine up to 2c90055, main merged in with the pin table resolved). ${REF} is a clean detached checkout of web main 10fe73b (v1 + Chalk + Navy, no engine v3). Engine v3's full report and its check: the journal of run wf_2575fb3f-ed1 (~/.claude/projects/-Users-micahflunker-dev-ship-v59/a17eac98-c779-495e-b9f2-54be1cf67d7a/subagents/workflows/wf_2575fb3f-ed1/journal.jsonl; labels ev3:contract, ev3:web, ev3:native, ev3:check). Other vibes are being built on vibes/oxblood and vibes/iron-age — never touch their worktrees.
Commit via Write under ${NIGHT}/tmp/ + \`git -C <wt> commit -F <file>\`, ending "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"; explicit paths; never node_modules. RESUMING: if the worktrees show earlier work for this job, continue from it.`

phase('Fix')
const fix = await agent(`${PREAMBLE}${CTX}
===== YOUR JOB: make two sentences of the pinned contract (vibes/defs/vocab.js) TRUE — "an untrue sentence is worse than none" =====
1. vocab.js ~651, calCell · open: "today by its keyline (in shape.cue.ink)". Chalk (registered, calCell 'open') sets no cue.ink, so build(chalk).shape.cue.ink is chalk #111416 and chalk.css's --shape-cue-ink is #111416, while Chalk actually draws today's keyline in its accent #6c3058 (chalk.css ~338; chalk.js ~127 "Mulberry, one job: … today"). FIX: set shape.cue.ink 'accent' in Chalk's definition (web vibes/defs/chalk.js; copy byte for byte to native src/pure/vibes/defs/chalk.js; re-pin in native tools/verify-vibes-verbatim.mjs), regenerate the token blocks (\`node tools-check/vibes-css.mjs --write\` in ${WEB}). Show that no pixel of Chalk moves (the literal in chalk.css already draws the accent; if a site now reads --shape-cue-ink under Chalk, it must resolve to the same colour it drew before). Check Navy the same way if Navy uses a look that reads cue.ink.
2. vocab.js ~374, headline's native list: "the \`hero\` prop … at the same three: food.jsx's summary figure, steps.jsx's today figure, HeadlineV". Only HeadlineV has it. FIX: add the \`hero\` prop at native food.jsx's Fuel summary figure and steps.jsx's today figure, exactly as HeadlineV does (inert unless a vibe's headline look is 'solo'/'bare' — v1, Chalk and Navy draw byte-identical hosts), and add both sites to verify-vibe-seams' SITES if the others are there. If for a reason you find the prop cannot be inert, reword the sentence to what is true instead and say why.
Then: web UTC suite, native UTC suite, native verify-vibe-v1 byte-identical (re-baseline NOTHING), theme identity --require-build, verify-vibe-parity + verify-vibe-fit (Chalk and Navy registered), contract verifiers both trees, pure files byte-identical across trees. Commit on both branches ("Engine v3 (WIP): two contract sentences made true" / "engine3(wip): two contract sentences made true (V59 §9-§12)").`,
  { label: 'ev3f:fix', phase: 'Fix', schema: { type: 'object', properties: { web_commit: { type: 'string' }, native_commit: { type: 'string' }, done: { type: 'array', items: { type: 'string' } }, pins: { type: 'object' }, suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['web_commit', 'native_commit', 'done', 'pins', 'suite_utc', 'left'] }, effort: 'high' })
if (!fix) return { error: 'fix agent died' }

phase('Prove')
const proof = await agent(`${PREAMBLE}${CTX}
===== YOUR JOB: the merge-readiness proof of engine v3 (read-only on the worktrees; you are independent of the builders) =====
The fixer reported: ${JSON.stringify(fix)}
Prove on the CURRENT heads of vibes/engine3 (both trees):
1. WEB v1 and the registered vibes unchanged: \`node ${HARNESS} --a ${REF} --b ${WEB} …\` on EVERY scene at 390 and 320 — (a) data-vibe absent, (b) --data-vibe v1, (c) --vibe chalk, (d) --vibe navy. Read the harness header for the flags (both trees serve /vibe.js). Expected: 0 in every class except (i) attrDiffs that are only engine v3's own data-* hooks (data-hero, data-lead, data-tag) absent on A, (ii) cssDiffs/fileDiffs that are only the regenerated token text in chalk.css/navy.css and the pure files, (iii) the known dock raster flake (a PNG that the A tree itself produces). Account for EVERY difference; anything else is a must-fix. Under (c), Chalk's today keyline must still be #6c3058.
2. NATIVE: verify-vibe-v1 byte-identical (213 scenes / 25,586 hosts vs the 1cb6498 baseline + the committed Settings-hub overlay only), theme identity --require-build, verify-vibe-parity and verify-vibe-fit with Chalk and Navy, verify-vibe-switch, verify-vibes-verbatim (pins = the actual sha256 of each pure file; web and native copies identical), the full native suite in UTC.
3. The web suite in UTC; touch-target 408/408.
4. The two contract sentences (vocab.js calCell · open, headline's native list) are now true in the code.
Report must_fix (with a reproduction) and listed_not_fixed.`,
  { label: 'ev3f:prove', phase: 'Prove', schema: { type: 'object', properties: { must_fix: { type: 'array', items: { type: 'string' } }, numbers: { type: 'string' }, listed_not_fixed: { type: 'array', items: { type: 'string' } } }, required: ['must_fix', 'numbers', 'listed_not_fixed'] }, effort: 'high' })
return { fix, proof }
