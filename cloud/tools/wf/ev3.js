export const meta = {
  name: 'v59-engine-3',
  description: 'V59 engine v3: the shared contract + engine asks of the deep two and the experimental specs (knob, greeting ink, tag type, stripes, hero numeral, chart·ink, lead-card hooks, new looks named), both trees, v1 byte-identical',
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
const WEB = `${NIGHT}/wt/web-ev3`
const NAT = `${NIGHT}/wt/nat-ev3`
const REF = `${NIGHT}/wt/web-mainref`
const HARNESS = `${NIGHT}/wt/web-harness/report/btn-44/prove.mjs`

const PLAN = `
MICAH'S CHANGE OF PLAN: you run at high effort; WIP branches run suites in UTC only (\`node ${NIGHT}/tools/run-verifiers.mjs <web|nat> <wt> <outDir> UTC\`); the orchestrator runs three zones at merge. No race hunts — anything new that is not a hard-rule failure goes under listed-not-fixed.
CURRENT MAINS (the session facts above are older): web main b99ec9d (engine v2 + Settings → Look → Vibes + the Chalk vibe), native main f3382d3 (the same). Other vibes are being built right now on their own branches (vibes/iron-age, vibes/navy, vibes/oxblood, both trees) — never touch those worktrees; you may READ their branches with git (\`git -C <repo> diff main...vibes/iron-age -- <path>\`) to reuse names they already chose for the same seam.
Commit WIP often (message via Write under ${NIGHT}/tmp/, \`git -C <wt> commit -F <file>\`, ending "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"; explicit paths only; never node_modules). A usage limit can end your session without warning. RESUMING: if git status / git log in the worktrees show earlier work for THIS job, an earlier agent died — review it and continue from it.`

const ASKS = `
===== ENGINE v3: THE SHARED ASKS OF THE DEEP AND EXPERIMENTAL SPECS =====
The three new specs: ${NIGHT}/design/{ledger,clear-sky,meet-day}.md, with pure definitions in ${NIGHT}/wt/web-design2/vibes/defs/{ledger,clear-sky,meet-day}.js and icon sets in ${NIGHT}/wt/web-design2/vibes/icons/<id>.js. Their collected engine asks and open items: ${NIGHT}/tmp/resume9/d4-specs.json (fields engine_asks, open). Read each spec's "Asks of the engine" section. Chalk (on main) asked some of the same in design/chalk.md; its AI judge flagged the accented greeting name.
Implement, ONCE and shared, every ask below that needs a shared file (the contract's pure files vibes/defs/{v1,index,vocab}.js + vibes/icons/v1.js; rack.css base rules/:root; auth.css; vibe.js; the web page modules only where a hook needs a class or attribute; native theme.js build(), src/ui/variant.js, the switch/call sites) — each with a v1 value that reproduces today EXACTLY, so v1 does not move by one pixel, one computed style, one DOM node or one host prop. Where a vibe branch (iron-age, navy, oxblood) already added a seam for the same thing, adopt its name and shape if it is sound (say so), so their merges reconcile.
 (a) colors.knob — the toggle's OFF knob (or: 'colors.steel' so v1 resolves steel): web .tog::after background; native src/ui/coach/settings.jsx ~139 thumbColor (off) and any other Switch site. [meet-day E1 BLOCKING, ledger R-3]
 (b) colors.greetName — the ink of the name in the You greeting (or: 'colors.accent'): web the greeting's name span (add a class if it has none, v1 styles unchanged); native youHero. [clear-sky R2, ledger R-1, Chalk's judge]
 (c) type.tag — a small-caps/tag preset (dflt null: every site keeps its v1 literal size/case/tracking) for the literal-caps and sub-11pt sites outside the blocks: the add-tile .tag (8.5px), .sync-pip, .trial-bar, .adm-flag, .conf, .ai-cost, .group-pill, auth.css's caps rules, MiniStats labels, .chart-sub/ChartSub, .you-since, the plate chip's figures, the calendar legend/day numbers; and a way for the preset sites that show lower-case strings as caps today (steps.js ~192 'to go'/'goal met', food.js ~604 'kcal left today'/'kcal over target', food.js ~3258 'kcal / day', workout.js ~1408 'bar only') to follow it. Web: the sites read var(--…) custom properties whose v1 values are today's literals; native: the sites read T.text.tag ?? today's literal. [meet-day E11, clear-sky R3+R6, ledger R-6, Chalk's request 7]
 (d) the two side stripes no block reaches — the tour tip (auth.css .ob-tip; native TourOverlay.jsx ~105) and the native Coach asking bubble (src/ui/coach/sheets.jsx ~468; web twin) — as a shape param (e.g. shape.stripe: 'side' | 'top' | 'keyline', v1 'side') so a vibe can draw a top rule or a full keyline on both clients. [clear-sky R4, ledger R-4]
 (e) shape.rule.hair may be 0 (the contract's paramOk currently demands > 0). [clear-sky R5]
 (f) the hero numeral: vocab headline gains look 'solo' (deep: the tab's one figure alone, large, in type.hero) and look 'bare' (the figure alone in its numeral type with the unit re-set in type.meta, sentence case); ROLES gains type.hero (kind type, native text.hero, or: 'type.headline'); a hero mark at the sites — web: Fuel's summary .load-num, Steps' today .load-num, the Goal's headline value (selectors/classes only; the inline JS sizes a deep vibe may beat are §5.9's); native: a hero prop at the same call sites (HeadlineV etc.), v1 identical. [clear-sky R1 — its concept depends on it; meet-day E5]
 (g) chart·ink wording + hooks: no area fill under the pinned lineChart (web: a scoped fill:none hook that a vibe's CSS can use; native: the line chart's area drawn only when the look says so), square line caps, legend keys drawable as 12×3 strokes. [clear-sky R7, ledger R-9, meet-day E6a]
 (h) card·ruled lead-card hooks on the web (Weight's log card, Steps' today card get a class/attribute marking them as the tab's lead card) and the tour card staying boxed under card·ruled on both clients. [clear-sky R8, ledger, iron-age]
 (i) kpi·word with pills kept (tint.pill* > 0): the pill's literal 11.5/10px delta type follows a role (e.g. type.pill, or: today's literal). [ledger R-11]
 (j) a native site for shape.rule.total (the web has one). [ledger R-12]
 (k) a native non-colour "chosen" cue for onboarding's choice cards (a drawn tick, as the web can do), off in v1. [ledger R-5]
 (l) NAME in vocab.js (wording only; each vibe draws its own look at the switch sites): kpi·lane, youHero·joined, statRow·board (inside a card: the strip runs to the card's edges, fallback cells on well within the padding), listRow·board (a leaderless board row, value in the numeral cut, record rows in shape.keyline), listRow·ledger's record rows (recap PR hits, Stats PR rows, Strongest lifts) taking shape.keyline and an optional leading rank numeral column, sessionChrome·slab's inverted slot as a param (v1 value = today's), setRow·attempt's coach state = warn, chart·board (rings as ten cells with board gaps, the target tick only where v1 draws a target). Confirm in the wording: sectionHeader·rule sets its title in type.h3; dock·rail's bar, segmented·tabs' underline and calCell·ruled's today keyline are drawn in accent. [meet-day E3-E10, E13; ledger R-7, R-8, R-10]
NOT in engine v3 (list them, don't build): meet-day's composition (a compose role + hooks X1-X7 = Phase X, its own branch later); meet-day E12 (the inversion exemption — Micah's policy call); the web tint.* custom properties / a bar rgb channel (clear-sky ask 9: each vibe writes its tints as hand rules for now).
Do NOT register any vibe and do NOT add any vibe's own files — that is each vibe's build. The contract's pure files stay byte-identical across the trees (copyFileSync) with updated pins.`

phase('Contract')
const contract = await agent(`${PREAMBLE}${PLAN}${ASKS}
===== YOUR JOB: the CONTRACT part of engine v3 =====
Worktrees: web ${WEB} (branch vibes/engine3 from web main b99ec9d), native ${NAT} (branch vibes/engine3 from native main f3382d3; node_modules is a symlink — never stage it). Make every contract change (vibes/defs/v1.js — new roles with today's values; vibes/defs/index.js — ROLES entries with or-fallbacks, paramOk for rule.hair ≥ 0, LEGACY_EXACT only if a new role needs an exact v1 spelling; vibes/defs/vocab.js — the new looks and wording of (f), (g), (l), the stripe param of (d); vibes/icons/v1.js only if a legend-key or tick glyph must be named) in the WEB tree; update tools-check/vibes-contract.mjs and tools-check/vibes-css.mjs if new custom properties must be generated (v1's rack.css :root then needs the same tokens with today's values — add them there, v1 unchanged); then copy the four pure files byte for byte to native src/pure/vibes/…, update native's pins (tools/verify-vibes-verbatim.mjs) and verify-vibes-contract. Make sure the registered Chalk still passes every contract check (its definition may leave the new roles out: valueOf() falls back). Run both contract verifiers and both suites in UTC. Commit on both branches ("Engine v3 (WIP): the contract" / "engine3(wip): the contract (V59 §9-§12)"). Return the new pins and the exact list of roles/looks/params added with their v1 values.`,
  { label: 'ev3:contract', phase: 'Contract', schema: { type: 'object', properties: { web_commit: { type: 'string' }, native_commit: { type: 'string' }, pins: { type: 'object' }, roles_added: { type: 'array', items: { type: 'string' } }, suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['web_commit', 'native_commit', 'pins', 'roles_added', 'suite_utc', 'left'] }, effort: 'high' })
if (!contract) return { error: 'contract agent failed' }

phase('Engines')
const REPORT = { type: 'object', properties: { commit: { type: 'string' }, done: { type: 'array', items: { type: 'string' } }, proof: { type: 'string' }, suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['commit', 'done', 'proof', 'suite_utc', 'left'] }
const WEB_PROOF = `Prove v1 unchanged, TWO ways: (1) against today's main, which is v1 and carries the same Settings hub and Chalk: \`node ${HARNESS} --a ${REF} --b ${WEB} …\` (${REF} is a clean detached checkout of web main b99ec9d; read the harness header for the --expect-vibe value when both trees serve /vibe.js) on EVERY scene at 390 and 320, data-vibe absent and --data-vibe v1 — expect 0 differences in every class (any difference is engine v3's and must be explained away or fixed); (2) touch-target 408/408 and the web suite in UTC. Also wear Chalk (--vibe chalk) A=${REF} vs B=${WEB} on every scene: 0 differences (Chalk leaves the new roles to their fallbacks, so it must not move either).`
const engines = await parallel([
  () => agent(`${PREAMBLE}${PLAN}${ASKS}\nThe contract agent reported: ${JSON.stringify(contract)}
===== YOUR JOB: the WEB engine part of engine v3 =====
Worktree ${WEB} (branch vibes/engine3; the contract commit is there). Implement every web-side ask: rack.css/auth.css base rules that SPEND the new roles through custom properties (so a vibe's generated token block moves them) with v1 values equal to today (single-level :root literals, identical spellings, the verifier-asserted lines untouched, no [data-vibe] in rack.css), the knob, the greeting-name class + rule, the tag preset at every listed literal site, the stripe param at the tour tip / Coach ask bubble, the hero mark classes (Fuel/Steps .load-num, Goal headline value), the chart·ink hooks (area fill, caps, legend keys), the lead-card marks, the pill type role. Page-module edits only add a class/attribute and never change text or order. ${WEB_PROOF} Commit "Engine v3 (WIP): the web engine".`, { label: 'ev3:web', phase: 'Engines', schema: REPORT, effort: 'high' }),
  () => agent(`${PREAMBLE}${PLAN}${ASKS}\nThe contract agent reported: ${JSON.stringify(contract)}
===== YOUR JOB: the NATIVE engine part of engine v3 =====
Worktree ${NAT} (branch vibes/engine3; the contract commit is there). Implement every native-side ask in theme.js build() (pass the new roles through; v1 values = today's) and at the sites: the Switch off-knob, youHero's name ink, T.text.tag at the literal sites (?? today's literal), the stripe param at TourOverlay/Coach ask bubble, the hero prop at HeadlineV and the Fuel/Steps figures, the line chart's area/caps/legend keys under chart·ink, a native site for shape.rule.total, the onboarding chosen tick (off in v1), the pill type role, the tour card boxed under card·ruled. Each new switch site goes in verify-vibe-seams' SITES; every v1 branch stays today's JSX. No new dependency. Prove v1 unchanged: verify-vibe-v1 byte-identical (baseline + the committed Settings-hub overlay only; re-baseline NOTHING), verify-theme-identity --require-build, verify-theme-build (extend it for each new role, red on a planted mistake), verify-vibe-seams, verify-vibe-parity + verify-vibe-fit (Chalk must still pass unchanged), the lints, the native suite in UTC. Commit "engine3(wip): the native engine (V59 §9-§12)".`, { label: 'ev3:native', phase: 'Engines', schema: REPORT, effort: 'high' }),
])
phase('Check')
const check = await agent(`${PREAMBLE}${PLAN}${ASKS}\nReports: contract ${JSON.stringify(contract)}; engines ${JSON.stringify(engines)}
===== YOUR JOB: check engine v3 (one round; findings need a reproduction) =====
Worktrees ${WEB} and ${NAT} (read-only for you). Confirm: v1 unchanged on both (re-run the proofs the builders claim: at least the native snapshot, and 12 web scenes at both widths A=${REF} B=${WEB}, absent + data-vibe v1 + --vibe chalk); the four pure files byte-identical across trees and pinned; every ask (a)-(l) implemented or explicitly listed as not (name which spec needs it and whether that vibe can ship without it); the new roles reach both clients (native build() output and the web generated block) for a scratch vibe that sets them (write it under ${NIGHT}/tmp, never register it). Classify: must-fix (v1 or Chalk moved, a proof red, an ask marked blocking missing) vs listed-not-fixed.`,
  { label: 'ev3:check', phase: 'Check', schema: { type: 'object', properties: { must_fix: { type: 'array', items: { type: 'string' } }, listed_not_fixed: { type: 'array', items: { type: 'string' } }, asks_status: { type: 'array', items: { type: 'string' } } }, required: ['must_fix', 'listed_not_fixed', 'asks_status'] }, effort: 'high' })
let fix = null, recheck = null
if (check && check.must_fix.length) {
  phase('Engines')
  fix = await agent(`${PREAMBLE}${PLAN}${ASKS}\n===== YOUR JOB: fix engine v3's must-fix items (one round) =====\nWorktrees ${WEB}, ${NAT}. Items: ${JSON.stringify(check.must_fix)}. For each: reproduce, fix, show the proof/check that found it passes; keep v1 and Chalk unchanged (native snapshot byte-identical; web prove A=${REF} 0 differences on the scenes touched, absent/data-vibe v1/--vibe chalk) and the suites green in UTC. Commit on the branch(es) touched ("Engine v3 (WIP): what the check found" / "engine3(wip): what the check found (V59 §9-§12)").`, { label: 'ev3:fix', phase: 'Engines', schema: REPORT, effort: 'high' })
  if (fix) {
    phase('Check')
    recheck = await agent(`${PREAMBLE}${PLAN}${ASKS}\n===== YOUR JOB: re-check engine v3 after its fix round =====\nThe check found: ${JSON.stringify(check.must_fix)}. The fixer reported: ${JSON.stringify(fix)}. Worktrees ${WEB}, ${NAT} (read-only). Re-run, in full: native verify-vibe-v1 + theme identity --require-build + the native suite in UTC; web prove A=${REF} B=${WEB} on EVERY scene at 390 and 320, absent and --data-vibe v1 and --vibe chalk (0 differences); the web suite in UTC. Confirm each must-fix item is fixed. Report must_fix (anything still wrong) and listed_not_fixed.`,
      { label: 'ev3:recheck', phase: 'Check', schema: { type: 'object', properties: { must_fix: { type: 'array', items: { type: 'string' } }, listed_not_fixed: { type: 'array', items: { type: 'string' } }, asks_status: { type: 'array', items: { type: 'string' } } }, required: ['must_fix', 'listed_not_fixed', 'asks_status'] }, effort: 'high' })
  }
}
return { contract, engines, check, fix, recheck }
