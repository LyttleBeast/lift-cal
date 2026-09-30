export const meta = {
  name: 'v59-engine-3-integrate',
  description: 'Engine v3 over main with Oxblood: resolve the native merge, move Oxblood onto colors.knob (same colour), regenerate tokens, re-pin; then prove v1 and all three registered vibes unchanged',
  phases: [{ title: 'Integrate' }, { title: 'Prove' }],
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
