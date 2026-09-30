export const meta = {
  name: 'v59-simple-polish',
  description: 'Micah\'s panel decision for the simple vibes on main (Chalk, Navy, Oxblood): fix the judges\' cheap and safe giveaways, log the rest; then re-prove v1, contrast, fit and parity per vibe',
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
const HARNESS = `${NIGHT}/wt/web-harness/report/btn-44/prove.mjs`
const REF = `${NIGHT}/wt/web-mainref`
const JUDGES = `${NIGHT}/tmp/resume9/simple-judges.json`
const IDS = [{ id: 'chalk', name: 'Chalk' }, { id: 'navy', name: 'Navy' }, { id: 'oxblood', name: 'Oxblood' }]
const CTX = `
MICAH'S DECISION ON THE PANEL (30 Sep): "The goal is how it looks to real people, not whether an AI detector can tell." For Chalk, Navy and Oxblood the panel is ADVISORY: fix the concrete giveaways the judges list where it's CHEAP and SAFE, and log the rest. It never blocks a merge. Micah is the final judge from the gallery.
MICAH'S CHANGE OF PLAN: high effort; UTC-only suites on branches (\`node ${NIGHT}/tools/run-verifiers.mjs <web|nat> <wt> <outDir> UTC\`). No race hunts.
CURRENT MAINS (the session facts are older): web main a78ec39, native main ba4a447 — engine v2 + v3, Settings → Look → Vibes, Chalk, Navy, Oxblood. Engine v3 gave roles that answer several giveaways cheaply: colors.greetName (the greeting name's ink — a HEX role), type.tag (the small literal-caps sites: sync pip, section heads outside presets, legends, add-tile tag…; web --type-tag-* tokens), colors.knob, shape.stripe, chart·ink (web: a vibe CSS rule path[fill^="url(#"] { fill: none } drops the pinned charts' area wash). Read vibes/defs/vocab.js and index.js ROLES on main for exact names. ${REF} is a clean detached checkout of web main a78ec39. Other vibes are being built on vibes/iron-age, vibes/ledger, vibes/clear-sky — never touch their worktrees; the Chalk/Navy/Oxblood polish branches below are separate worktrees and each job touches only its own.
Commit via Write under ${NIGHT}/tmp/ + \`git -C <wt> commit -F <file>\`, ending "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"; explicit paths; never node_modules. RESUMING: if the worktrees show earlier work for this job, continue from it.`
const HARD = v => `the hard rules — contrast and colour vision (every colour ${v} changes: 4.5:1 text, 3:1 large text and graphics, no worse than v1 where v1 itself fails; the six group colours ΔE00 ≥ 12 under deutan/protan), fit and 44pt targets, every word and number identical, SAME LAYOUT (a simple vibe: colours, faces and small shape tokens only), the dock untouched, v1 byte-identical (every change in ${v}'s own stylesheet, its own definition, or its own branch of a native look switch — no shared file), web and native in step (definition byte-identical across the trees; re-copy + re-pin in native tools/verify-vibes-verbatim.mjs; native parity)`
const GIVE_SCHEMA = { type: 'object', properties: {
  web_commit: { type: 'string' }, native_commit: { type: 'string' }, fixed: { type: 'array', items: { type: 'string' } },
  logged: { type: 'array', items: { type: 'object', properties: { giveaway: { type: 'string' }, reason: { type: 'string' } }, required: ['giveaway', 'reason'] } },
  suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } },
}, required: ['web_commit', 'native_commit', 'fixed', 'logged', 'suite_utc', 'left'] }
const PROOF_SCHEMA = { type: 'object', properties: { must_fix: { type: 'array', items: { type: 'string' } }, numbers: { type: 'string' }, listed_not_fixed: { type: 'array', items: { type: 'string' } } }, required: ['must_fix', 'numbers', 'listed_not_fixed'] }

const prove = (v, web, nat, fx, round) => agent(`${PREAMBLE}${CTX}
===== YOUR JOB: re-prove ${v.name} after its giveaway pass (round ${round}; read-only on the worktrees; independent of the fixer) =====
Worktrees: web ${web} (branch vibes/${v.id}-polish), native ${nat}. The fixer reported: ${JSON.stringify(fx)}
1. v1 UNCHANGED (web): \`node ${HARNESS} --a ${REF} --b ${web} …\` on EVERY scene at 390 and 320, data-vibe absent and --data-vibe v1 (read the harness header for the flags; both trees serve /vibe.js): 0 in every class except the vibe's own stylesheet/definition text (cssDiffs/fileDiffs) and the rules fixture's chains for rules the vibe added or removed (realign with ${NIGHT}/tools/ev3x-fixture-realign.mjs) and the known dock raster flake (a PNG the A tree produces). Native: verify-vibe-v1 byte-identical, theme identity --require-build.
2. ${v.name} STILL SAME LAYOUT and the same words: the same A/B with --vibe ${v.id}: TEXT and VALUE differences 0 and STRUCTURE 0 against A=${REF} worn in ${v.id} (\`--vibe\` applies to both) apart from the fixture — style/rect/pixel differences are the polish itself. Native: verify-vibe-fit (words and controls equal v1's).
3. CONTRAST/CVD for every colour the pass changed (reuse ${NIGHT}/tools/vibe-contrast/: web.mjs / native.mjs / compare.mjs / cvd.mjs), native verify-vibe-parity, verify-vibes-verbatim, both UTC suites.
Report must_fix (with a reproduction) and listed_not_fixed.`, { label: `SP:${v.id}:prove-r${round}`, phase: 'Prove', schema: PROOF_SCHEMA, effort: 'high' })

const results = await pipeline(IDS,
  v => agent(`${PREAMBLE}${CTX}
===== YOUR JOB: ${v.name}'s giveaway pass =====
Worktrees: web ${NIGHT}/wt/web-p-${v.id} (branch vibes/${v.id}-polish, from web main a78ec39), native ${NIGHT}/wt/nat-p-${v.id} (branch vibes/${v.id}-polish, from native main ba4a447; node_modules is a symlink — never stage it). ${v.name}'s spec: ${NIGHT}/design/${v.id}.md. Its judge (the old adversarial brief) listed these tells and fixes — the entry "${v.id}" in ${JUDGES} (Read it). Go through EVERY tell: fix it where it is cheap and safe (a value in vibes/defs/${v.id}.js, a rule in vibes/${v.id}.css, ${v.name}'s own native look branch), true to the spec; LOG the rest with a concrete reason (it is v1's own layout, which a simple vibe keeps; it needs a shared file; it would break a hard rule — e.g. a light vibe's dark status band is required on the web; or you disagree and why). Stay within ${HARD(v.name)}. Re-run both UTC suites, regenerate the token block if the definition changed (\`node tools-check/vibes-css.mjs --write\`), re-shoot the gallery (\`node ${HARNESS} shoot --repo <web wt> --out ${NIGHT}/proof/sp-${v.id}/shoot --vibe ${v.id}\`) and Read the PNGs. Commit on both branches ("Vibe: ${v.name} — the judges' giveaways" / "vibe: ${v.name} — the judges' giveaways (V59 §10)").`,
    { label: `SP:${v.id}:fix`, phase: 'Fix', schema: GIVE_SCHEMA, effort: 'high' }),
  async (fx, v) => {
    if (!fx) return { id: v.id, error: 'fix agent died' }
    const web = `${NIGHT}/wt/web-p-${v.id}`, nat = `${NIGHT}/wt/nat-p-${v.id}`
    let p = await prove(v, web, nat, fx, 1)
    let fix2 = null
    if (p && p.must_fix.length) {
      fix2 = await agent(`${PREAMBLE}${CTX}
===== YOUR JOB: fix what ${v.name}'s re-proof found =====
Worktrees: web ${web}, native ${nat}. Items: ${JSON.stringify(p.must_fix)}. For each: reproduce, fix (or revert the polish change that caused it), show the check passes. Stay within ${HARD(v.name)}. Both UTC suites. Commit ("Vibe: ${v.name} — what the re-proof found" / "vibe: ${v.name} — what the re-proof found (V59 §10)").`,
        { label: `SP:${v.id}:fix2`, phase: 'Fix', schema: GIVE_SCHEMA, effort: 'high' })
      if (fix2) p = await prove(v, web, nat, fix2, 2)
    }
    return { id: v.id, fix: fx, fix2, proof: p, ready: !!p && p.must_fix.length === 0 }
  })
return { results }
