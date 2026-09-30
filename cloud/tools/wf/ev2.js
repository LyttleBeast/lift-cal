export const meta = {
  name: 'v59-engine-2',
  description: 'V59 engine v2: the shared engine + contract asks the first four vibe specs need (band, calorie rings/hatches, letter colours, icon routing, photo band mode, shape params…), both trees, v1 byte-identical',
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
const WEB = `${NIGHT}/wt/web-ev2`
const NAT = `${NIGHT}/wt/nat-ev2`
const HARNESS = `${NIGHT}/wt/web-harness/report/btn-44/prove.mjs`

const PLAN = `
MICAH'S CHANGE OF PLAN: you run at high effort; WIP branches run suites in UTC only (\`node ${NIGHT}/tools/run-verifiers.mjs <web|nat> <wt> <outDir> UTC\`); the orchestrator runs three zones at merge. No race hunts — anything new that is not a hard-rule failure goes under listed-not-fixed.
Commit WIP often (message via Write under ${NIGHT}/tmp/, \`git -C <wt> commit -F <file>\`, ending "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"; explicit paths only; never node_modules).`

const ASKS = `
===== ENGINE v2: THE SHARED ASKS OF THE FIRST FOUR VIBE SPECS =====
The four specs (Iron Age, Chalk, Navy, Oxblood) are in ${NIGHT}/design/{iron-age,chalk,navy,oxblood}.md with their pure definitions in ${NIGHT}/wt/web-design/vibes/defs/{iron-age,chalk,navy,oxblood}.js (Iron Age's icon set: ${NIGHT}/wt/web-design/vibes/icons/iron-age.js; Navy/Oxblood each wrote a spark-only vibes/icons/<id>.js). Their collected open items: ${NIGHT}/design/SPEC-RESULTS.json. Read each spec's engine/contract-ask section (Iron Age §14 "what this vibe asks the engine for"; Chalk's "Required contract asks"; Navy §15.1; Oxblood §12) and ${NIGHT}/design/VOCAB.md §8.
Implement, ONCE and shared, every REQUIRED ask that needs a shared file (the contract's pure files, rack.css's :root/base rules, vibe.js, native theme.js/variant sites/HeroPhoto/icon routing) — each with a v1 value that reproduces today exactly, so v1 does not move by one pixel or one host prop. The known set (confirm each against the specs; add any other shared REQUIRED ask you find, and say which spec asked):
 (a) colors.band — the dark safe-area strip under the installed PWA's always-white status text for light vibes (web draws it only when a vibe sets it; native ignores it: StatusBar handles it);
 (b) a ring for the calorie head and the dashed target (e.g. shadow.calHead / shadow.calTarget; native CalMeter draws a 1pt border when set);
 (c) the W/F/D set-badge letter colours from roles (tint.tag*.color or the spec's naming; v1 = today's colours at rack.css ~584 and native SetTypeBadge);
 (d) .cal-runway's hatch and edge through a role (v1 keeps rack .55/.70);
 (e) index.js ROLES: face.bands (native build() already reads it), the VOCAB §4 shape params plus rule.sub / rule.total / lead.keyline, inkOf (small-text colour per data colour), type.meta, face.web.display / italic / num, images.<slot>.band (band mode) — so tools-check/vibes-css.mjs generates them and native build() passes them through;
 (f) photo band mode (images.<slot>.band pt): native build()/HeroPhoto draw the band instead of the scrim; the web stylesheet draws it; the declared fallback remains;
 (g) native calorie-band hatches: a CalMeter switch site drawing hatches with react-native-svg Pattern when a vibe asks (Iron Age must not ship on native without them); web can draw them in CSS — add the SVG <pattern> defs or CSS gradient approach the web needs, v1 untouched;
 (h) icon routing on native (E11): a vibe's icon set (vibes/icons/<id>.js) reaches every icon site native draws (dock, gears, calendar, Coach bubble/lock, add-food, water vessel), plus the icon contract's glyphs / vessel / ornaments (tailpiece) fields on both clients (a tailpiece is decoration drawn by the vibe at one site per tab; in v1 it draws nothing and adds no element or host);
 (i) kpi·word draws the delta pill when tint.pill* > 0 and bare text when 0;
 (j) vibe.js's picker prefetch reads face.web.num when present (else the first family of face.web.font);
 (k) vocab.js's addTile 'flat' look worded: lit tiles draw their icon well and tag on \`raised\` (the adopted "E3"); tools-check/vibes-contract.mjs (and native's twin) skip meta keys (id, name, feel, icons) when looking for colours (it reads 'navy' as a CSS colour name today).
Optional asks (literal-caps switch, chart·ink regrade, greetName…) — skip; list them.
Do NOT register any vibe and do NOT add any vibe's own files — that is each vibe's build. The contract's pure files stay byte-identical across the trees (copyFileSync) with updated pins.`

phase('Contract')
const contract = await agent(`${PREAMBLE}${PLAN}${ASKS}
===== YOUR JOB: the CONTRACT part of engine v2 =====
Worktrees: web ${WEB} (branch vibes/engine2 from web main f70dcad), native ${NAT} (branch vibes/engine2 from native main a5bc00e; node_modules is a symlink — never stage it). Make every contract change (vibes/defs/v1.js — new roles with today's values; vibes/defs/index.js — ROLES entries, LEGACY_EXACT untouched unless a new role needs an exact v1 spelling; vibes/defs/vocab.js — the addTile·flat wording and any params the asks add; vibes/icons/v1.js — the glyphs/vessel/ornaments fields with today's values, empty ornaments) in the WEB tree, update tools-check/vibes-contract.mjs (incl. the meta-key fix) and tools-check/vibes-css.mjs if it must emit new custom properties (v1's rack.css :root then needs the same tokens with today's values — add them there, v1 unchanged), then copy the four pure files byte for byte to native src/pure/vibes/…, update native's pins and verify-vibes-contract. Run both contract verifiers and the web suite in UTC. Commit on both branches ("Engine v2 (WIP): the contract" / "engine2(wip): the contract (V59 §9-§11)"). Return the new pins and the exact list of roles added with their v1 values.`,
  { label: 'ev2:contract', phase: 'Contract', schema: { type: 'object', properties: { web_commit: { type: 'string' }, native_commit: { type: 'string' }, pins: { type: 'object' }, roles_added: { type: 'array', items: { type: 'string' } }, suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['web_commit', 'native_commit', 'pins', 'roles_added', 'suite_utc', 'left'] }, effort: 'high' })
if (!contract) return { error: 'contract agent failed' }

phase('Engines')
const REPORT = { type: 'object', properties: { commit: { type: 'string' }, done: { type: 'array', items: { type: 'string' } }, proof: { type: 'string' }, suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['commit', 'done', 'proof', 'suite_utc', 'left'] }
const engines = await parallel([
  () => agent(`${PREAMBLE}${PLAN}${ASKS}\nThe contract agent reported: ${JSON.stringify(contract)}
===== YOUR JOB: the WEB engine part of engine v2 =====
Worktree ${WEB} (branch vibes/engine2; the contract commit is there). Implement every web-side ask: rack.css base rules that SPEND the new roles (so a vibe's generated token block moves them) with v1 values equal to today (single-level :root literals, identical spellings, the verifier-asserted lines untouched, no [data-vibe] in rack.css), the band strip, the calorie ring, the W/F/D letters, the runway hatch, photo band mode in the stylesheet, the SVG pattern defs if needed (hidden, added only when a vibe needs them — or none in v1), vibe.js (face.web.num for the picker prefetch; tailpiece/glyph/vessel routing through icon()), kpi·word's pill rule. Prove v1 unchanged: \`node ${HARNESS} --a ${NIGHT}/wt/web-base --b ${WEB} --expect-vibe 404,200 --run ev2-v1-absent\` on EVERY scene at 390 and 320 (0/0 except the Settings hub's known Look section and the rules fixture's new rules — realign with ${NIGHT}/tools/s-web-realign.mjs), then the same with --data-vibe v1; touch-target 408/408; the web suite in UTC. Commit "Engine v2 (WIP): the web engine".`, { label: 'ev2:web', phase: 'Engines', schema: REPORT, effort: 'high' }),
  () => agent(`${PREAMBLE}${PLAN}${ASKS}\nThe contract agent reported: ${JSON.stringify(contract)}
===== YOUR JOB: the NATIVE engine part of engine v2 =====
Worktree ${NAT} (branch vibes/engine2; the contract commit is there). Implement every native-side ask in theme.js build() (pass the new roles through; v1 values = today's), HeroPhoto (band mode), CalMeter (the hatch site with react-native-svg Pattern; the head/target ring), SetTypeBadge (letter colours from roles), icon routing (E11: a vibe icon set reaches every native icon site — dock, gears, calendar, Coach bubble/lock, add-food icons, water vessel — through one helper; glyph/vessel/ornament fields; a tailpiece site per tab that draws NOTHING and adds no host in v1), kpi·word's pill rule. No new dependency (react-native-svg is already linked). Prove v1 unchanged: verify-vibe-v1 byte-identical (baseline + the committed Settings-hub overlay only; re-baseline NOTHING), verify-theme-identity --require-build, verify-theme-build, verify-vibe-seams, the three lints, the native suite in UTC. Extend verify-theme-build / verify-vibe-seams to hold each new role/site to its rule, each red on a planted mistake. Commit "engine2(wip): the native engine (V59 §9-§11)".`, { label: 'ev2:native', phase: 'Engines', schema: REPORT, effort: 'high' }),
])
phase('Check')
const check = await agent(`${PREAMBLE}${PLAN}${ASKS}\nReports: contract ${JSON.stringify(contract)}; engines ${JSON.stringify(engines)}
===== YOUR JOB: check engine v2 (one round; findings need a reproduction) =====
Worktrees ${WEB} and ${NAT} (read-only for you). Confirm: v1 unchanged on both (re-run the proofs the builders claim, at least the native snapshot and 10 web scenes at both widths absent + data-vibe v1); the four pure files byte-identical across trees and pinned; every required ask from the four specs is implemented or explicitly listed as not (name which spec needs it and whether the vibe can ship without it); the new roles reach both clients (native build() output and the web generated block) for a scratch vibe that sets them. Classify: must-fix (v1 moved, a proof red, a required ask missing that blocks a vibe) vs listed-not-fixed.`,
  { label: 'ev2:check', phase: 'Check', schema: { type: 'object', properties: { must_fix: { type: 'array', items: { type: 'string' } }, listed_not_fixed: { type: 'array', items: { type: 'string' } }, asks_status: { type: 'array', items: { type: 'string' } } }, required: ['must_fix', 'listed_not_fixed', 'asks_status'] }, effort: 'high' })
let fix = null
if (check && check.must_fix.length) {
  phase('Engines')
  fix = await agent(`${PREAMBLE}${PLAN}${ASKS}\n===== YOUR JOB: fix engine v2's must-fix items (one round) =====\nWorktrees ${WEB}, ${NAT}. Items: ${JSON.stringify(check.must_fix)}. For each: reproduce, fix, show the proof/check that found it passes; keep v1 unchanged (native snapshot byte-identical; web prove 0/0 on the scenes touched) and the suites green in UTC. Commit on the branch(es) touched ("Engine v2 (WIP): what the check found" / "engine2(wip): what the check found (V59 §9-§11)").`, { label: 'ev2:fix', phase: 'Engines', schema: REPORT, effort: 'high' })
}
return { contract, engines, check, fix }
