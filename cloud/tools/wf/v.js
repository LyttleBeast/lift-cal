export const meta = {
  name: 'v59-vibe-build',
  description: 'V59 §10-§14 one vibe: assets, web + native presentation, then the Q gates (contrast/CVD, fit, v1 still identical, parity, provenance, the AI-made panel, layout review) with fix rounds',
  phases: [
    { title: 'Assets', detail: 'fonts (all); photos, engraved icons, textures (Iron Age)' },
    { title: 'Build', detail: 'web and native presentation in parallel' },
    { title: 'Gates', detail: 'contrast/CVD, fit, v1 identical + switch, parity, provenance' },
    { title: 'Judge', detail: '"did an AI make this?" on the gallery screenshots' },
    { title: 'Review', detail: 'the layout rule and correctness, both trees' },
    { title: 'Fix', detail: 'must-fix from any gate, then re-run what failed' },
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
const V = args
const WEB = `${NIGHT}/wt/web-v-${V.id}`
const NAT = `${NIGHT}/wt/nat-v-${V.id}`
const HARNESS = `${NIGHT}/wt/web-harness/report/btn-44/prove.mjs`
const IRON = V.kind === 'iron-age'
const DEEP = V.kind === 'deep' || V.kind === 'experimental' || IRON
const HIGH = { effort: 'high' }

const PLAN = `
===== MICAH'S CHANGE OF PLAN (overrides the prompt where they differ) =====
Simple vibes: 1 review round; the AI panel is 1 judge, logged, non-blocking. Deep + experimental: ≤2 review rounds; the AI panel is 3 judges, hard gate, ≤3 revise rounds. Iron Age: full panel, full provenance, hard gate. Build/verify/review/fix agents run at high effort. On WIP branches run suites in UTC only (\`node ${NIGHT}/tools/run-verifiers.mjs <web|nat> <wt> <outDir> UTC\`); the orchestrator runs three zones at merge. No race hunts: anything new that is not a hard-rule failure goes under listed-not-fixed.
KNOWN PRE-EXISTING RED: rate-band fails under Pacific/Auckland on untouched rack-v58/build 58 (NZ DST) — irrelevant to UTC-only runs.`

const CONTEXT = `
===== PHASE V (V59 §10-§14): the vibe "${V.name}" (id ${V.id}, kind ${V.kind}) =====
Read ${PROMPT} §2 (lines 191-233: the layout rules — ${V.kind === 'simple' ? 'SAME LAYOUT' : V.kind === 'experimental' ? 'MAY REARRANGE within a screen (never the dock)' : '"same order, new shapes"'}), §10 (1001-1045), ${IRON ? '§11 (1048-1096) in full, ' : ''}${V.kind === 'experimental' ? '§12 (1099-1122) in full, ' : ''}§13 (1125-1176), §14 (1179-1247). The spec: ${V.spec}. The pure definition: ${V.def}${V.icons ? `; its icon set: ${V.icons}` : ''}. The component vocabulary: ${NIGHT}/design/VOCAB.md and vibes/defs/vocab.js (contract v2, on main). Research: ${NIGHT}/research/SYNTHESIS.md (the never-do list) and ${NIGHT}/research/01-ai-tells.md.
Worktrees: WEB ${WEB} (branch vibes/${V.id}, from web main — the engine, the contract v2, Settings → Look → Vibes are all there); NATIVE ${NAT} (branch vibes/${V.id}, from native main; node_modules is a symlink — never stage it). Base trees for the v1 proof: ${NIGHT}/wt/web-base (928a65e) and ${NIGHT}/wt/nat-base (1cb6498). The web harness: ${HARNESS} (read its header; it serialises through ${NIGHT}/harness.lock; runs are long — run_in_background + poll, or shard).
RULES OF THE ROAD: vibes change how Rack looks, never what it says or does — every number and word identical, 44pt targets, the dock's tabs/order/position never change. Web fonts are variable with a wght axis, weight only through font-variation-settings, self-hosted latin woff2 ≤120 KB/family with OFL.txt beside; @font-face family names prefixed with "${V.id}", never "Archivo". Native fonts are static TTFs, ≤4 per vibe (picker face included), under assets/fonts/<Family>/ with OFL.txt. All colours 6-digit hex. No AI imagery ever. Every selector in vibes/${V.id}.css starts with :root[data-vibe="${V.id}"] or [data-vibe="${V.id}"] (tools-check/vibes-scope.mjs); rules for the Vibes sheet's own tile must be scoped .vibe-in[data-vibe="${V.id}"] (a worn vibe's [data-vibe] rules otherwise reach every tile). Light vibes: web keeps the top safe-area band dark (the installed PWA's status text is always white); native sets StatusBar dark and keyboards/date pickers light; check the dock blur, sheet backdrop and every tint on the light ground. A deep vibe may override ONLY the inline JS sizes the prompt lists (§5.9) with !important, each commented with the JS site it beats. The Coach card keeps Archivo on v1 metrics unless the spec supplies its own advance table (generated with tools/lib/ttf-advance.mjs) and the Coach-surface checks pass in this vibe.
REGISTRATION (Micah's standing decision: the vibe's build agents add the vibe's own lines to the shared registries on this branch; the orchestrator merges vibes one at a time): web — vibes/defs/index.js VIBES entry ${JSON.stringify(V.registry)} (and native's byte-identical copy + the pins in tools/verify-vibes-verbatim.mjs), vibe.js's def/icon-set tables, index.html's static <link rel="stylesheet" href="vibes/${V.id}.css"> (after rack.css/auth.css) and the head script's theme-color map entry; native — src/state/vibe.js VIBE_DEFS entry (def, icons, images, fonts map, fit table if any). Change nothing else in those files.
${V.notes || ''}`

const BUILD_SCHEMA = { type: 'object', properties: {
  commit: { type: 'string' }, done: { type: 'array', items: { type: 'string' } }, sizes: { type: 'object' },
  suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } }, risks: { type: 'array', items: { type: 'string' } },
}, required: ['commit', 'done', 'sizes', 'suite_utc', 'left', 'risks'] }
const GATE_SCHEMA = { type: 'object', properties: {
  gate: { type: 'string' }, pass: { type: 'boolean' },
  must_fix: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, tree: { type: 'string', enum: ['web', 'native', 'both', 'assets'] }, where: { type: 'string' }, reproduction: { type: 'string' } }, required: ['title', 'tree', 'where', 'reproduction'] } },
  numbers: { type: 'string' }, listed_not_fixed: { type: 'array', items: { type: 'string' } },
}, required: ['gate', 'pass', 'must_fix', 'numbers', 'listed_not_fixed'] }
const JUDGE_SCHEMA_V = { type: 'object', properties: {
  verdict: { type: 'string', enum: ['human-designed', 'AI-made'] }, confidence: { type: 'number' },
  tells: { type: 'array', items: { type: 'string' } }, fixes: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' },
}, required: ['verdict', 'confidence', 'tells', 'fixes', 'notes'] }

const COMMIT_NOTE = `Commit WIP often on the vibe branch (message via Write under ${NIGHT}/tmp/, \`git -C <wt> commit -F <file>\`, ending "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"; explicit paths only; never node_modules or report/btn-44/seed.json). A usage limit can end your session without warning.`

// ---------- A. assets ----------
phase('Assets')
const assetJobs = [
  { key: 'fonts', text: `FONTS for ${V.name}, from the spec's font section. Fetch only with ${NIGHT}/tools/fetch.mjs (google/fonts on raw.githubusercontent.com, the family's upstream repo on github.com, or fonts.gstatic.com latin woff2 via the css2 URL). Confirm OFL 1.1 from OFL.txt and METADATA.pb and record any Reserved Font Name. Web: one self-hosted LATIN variable woff2 per family with a wght axis (subset with ${NIGHT}/tools/node_modules/subset-font if needed; record the tool + version), ≤120 KB/family, plus the picker's digit face if the spec has one; place under ${WEB}/vibes/${V.id}/fonts/ with OFL.txt and FONTS.json (family, files, version or commit, source URL, licence, copyright line, RFN, sha256). Native: ≤4 static TTFs (picker face included) under ${NAT}/assets/fonts/<Family>/ with OFL.txt, and the same FONTS.json at ${NAT}/assets/vibes/${V.id}/FONTS.json. Check tabular figures and the glyphs the app draws (’ — · – … × “ ” → ⚙ › ✕ ⋯ ✓ − ‹ ↳ ↑ ↓ ÷ ±) with opentype.js; list what falls back. Log every size.` },
]
if (IRON) assetJobs.push(
  { key: 'photos', text: `PHOTOS for Iron Age (§11, §14): real pre-1931 photos behind the HERO BOXES ONLY (the spec names which: You greeting, Start workout, summary headline, Fuel big number, Steps today, Weight log card; the Coach card only if its text stays legible at 190/164 — the spec says none). Candidates and draft provenance: ${NIGHT}/research/iron-age/{08a-photos.md, PROVENANCE.photos.draft.json, originals/}. Use Tier A only (the spec's list). Deterministic operations only, each recorded as a command with tool + version (sips first; a recorded node script with pngjs is fine): crop around the focal point for each slot's box at 390 and 320 widths, resize ≤1170px long edge, the spec's ink-on-stock tone map (never CSS sepia(), never AI anything), encode to the spec's format (4-bit PNG or JPEG q≈70), ≤150 KB each, ≤1.5 MB Iron Age imagery per client. Design each slot's code-made scrim and MEASURE text contrast ≥4.5:1 on the ACTUAL PIXELS at the actual crop for every piece of text over it (write the measuring script; keep its output). Write PROVENANCE.json (every §14 field: file, sha256, bytes, dims, title, subject, creator, creator_died, created, first_published {year, venue}, source_institution, source_url (item page), source_id, rights_statement_verbatim, pd_basis_us, pd_basis_worldwide, retrieved, original_sha256, original_dims, transforms, clothing_check, credit_line, micah_approved: false) into ${WEB}/vibes/iron-age/ and ${NAT}/assets/vibes/iron-age/ (the same file in both). Clothing rule: trunks, tights, leotards, singlets or period costume incl. bare torsos allowed; REJECT any nudity, fig leaves, drapes standing in for clothing, "classical statue" poses; no live trademarks. If no photo passes, leave the slots empty (they must render cleanly) and write ${NIGHT}/IRON-AGE-SHOPPING-LIST.md plus a node script under ${NIGHT}/tools that processes and places files once Micah saves them. RESUMING: if git status / git log in the worktrees show earlier work for THIS job (committed WIP or uncommitted files, e.g. an untracked textures/ folder), an earlier agent died at a usage limit — review it and continue from it rather than starting over.` },
  { key: 'icons', text: `ICONS for Iron Age (§11): a complete set — the dock's 5, the gears, the calendar, the Coach bubble and lock, the 8 add-food icons, the water vessel if feasible, and SVG replacements for the glyphs ‹ › ✕ ⋯ ✓ ↳ ✎ ⚙ — plus a neutral replacement for v1's 'spark' (SYNTHESIS finding 6: the spec names it, a period manicule or similar). Style: period engraving line art, one consistent stroke, path data on 24×24, exactly the icon names of vibes/icons/v1.js. Where a real pre-1931 engraving exists (dumbbell, globe barbell, Indian club, kettlebell, rings, scale — ${NIGHT}/research/iron-age/{08b-engravings.md, PROVENANCE.engravings.draft.json, originals/}), TRACE it with ${NIGHT}/tools/node_modules/imagetracerjs (deterministic), then simplify by hand; record each traced source in PROVENANCE.json (as for photos, with the crop box). Otherwise draw by hand in code to the same style guide. Render a legibility sheet at 22pt (the dock) and at the add-tile size and look at it (Read the PNG). Write the set as the pure module ${WEB}/vibes/icons/iron-age.js (imports nothing; the spec's draft is ${V.icons || 'in the spec'}); the native copy is byte-identical (the web builder copies it). RESUMING: if git status / git log in the worktrees show earlier work for THIS job (committed WIP or uncommitted files, e.g. an untracked textures/ folder), an earlier agent died at a usage limit — review it and continue from it rather than starting over.` },
  { key: 'textures', text: `TEXTURES for Iron Age (§11): paper grain, ink bleed along rules, halftone — made by code with the spec's measured recipes (grain mottle 0.30-1.41% luma; rule bleed +0.05-0.06pt per edge; the tone map) — a recorded, seeded node script under ${NIGHT}/tools/iron-age-textures/ rendering PNGs with pngjs (native cannot do SVG filters, so PNGs on both clients), small (state each size), into ${WEB}/vibes/iron-age/textures/ and ${NAT}/assets/vibes/iron-age/textures/. Record the script's sha256 and the exact command in a TEXTURES.json beside them. RESUMING: if git status / git log in the worktrees show earlier work for THIS job (committed WIP or uncommitted files, e.g. an untracked textures/ folder), an earlier agent died at a usage limit — review it and continue from it rather than starting over.` },
)
const assets = await parallel(assetJobs.map(j => () => agent(`${PREAMBLE}${PLAN}${CONTEXT}\n===== YOUR JOB: V/${j.key} =====\n${j.text}\n${COMMIT_NOTE} Commit on both branches you wrote to ("Vibe (WIP): ${V.name} — ${j.key}" / "vibe(wip): ${V.name} — ${j.key} (V59 §${IRON ? '11' : '10'})").`,
  { label: `V:${V.id}:${j.key}`, phase: 'Assets', schema: BUILD_SCHEMA, ...HIGH })))
log(`${V.id}: assets ${assets.map((a, i) => assetJobs[i].key + (a ? '✓' : '✗')).join(' ')}`)

// ---------- B. build ----------
phase('Build')
const assetReport = JSON.stringify(assets.map((a, i) => ({ job: assetJobs[i].key, report: a })))
const WEB_BUILD = `===== YOUR JOB: the web presentation of ${V.name} =====
RESUMING: if git status / git log in the worktrees show earlier work for THIS job (committed WIP or uncommitted files, e.g. an untracked textures/ folder), an earlier agent died at a usage limit — review it and continue from it rather than starting over.
1. Copy the pure definition ${V.def} to ${WEB}/vibes/defs/${V.id}.js${V.icons ? ` and the icon set ${V.icons} (or the icons agent's final vibes/icons/${V.id}.js) to ${WEB}/vibes/icons/${V.id}.js` : ''} byte for byte if not already there. Register the vibe (see REGISTRATION).
2. vibes/${V.id}.css: the generated token block (\`node tools-check/vibes-css.mjs --write\`), then hand-written component rules below it for every non-v1 look the definition names (VOCAB.md says what each look changes and what it keeps), @font-face rules for the vibe's faces (local files), images/textures by url() into vibes/${V.id}/. ${DEEP ? 'EVERY SCREEN must be covered, including the ones people forget: sign-in and the gates, onboarding (8 steps) and the tour, the Coach sheet/live chip/nudge, the add-food sheets, estimator, library and meals, water, the rest pill and peek bar, toasts, the Vibes sheet, the owner-only admin (legible).' : 'Simple: tokens + fonts + at most small shape tokens; the layout is v1\'s.'}
3. Offline: on selection vibe.js prefetches the active vibe's images and fonts; the first online launch prefetches every vibe's picker assets — make sure this vibe's assets are in those lists and within §14's budgets.
4. Verify: the web suite in UTC; \`node ${HARNESS} shoot --repo ${WEB} --out ${NIGHT}/proof/v-${V.id}/shoot --vibe ${V.id}\` (the gallery list) and Read the PNGs yourself — fix anything broken before handing over; a quick \`fit\` at 320 and 390 in this vibe.
${COMMIT_NOTE} Final commit subject: "Vibe: ${V.name}".`
const NAT_BUILD = `===== YOUR JOB: the native presentation of ${V.name} =====
RESUMING: if git status / git log in the worktrees show earlier work for THIS job (committed WIP or uncommitted files, e.g. an untracked textures/ folder), an earlier agent died at a usage limit — review it and continue from it rather than starting over.
1. Copy ${V.def} to ${NAT}/src/pure/vibes/defs/${V.id}.js${V.icons ? ` and the icon set to ${NAT}/src/pure/vibes/icons/${V.id}.js` : ''} BYTE FOR BYTE (node copyFileSync; they must equal the web's files — if the web builder changes them, re-copy), plus the updated src/pure/vibes/defs/index.js; update the pins in tools/verify-vibes-verbatim.mjs. Register in src/state/vibe.js VIBE_DEFS (def, icons, images via require(), fonts map \`'<Family>_<wght>': require('../../assets/fonts/<Family>/<file>.ttf')\`, fit table if the spec supplies one).
2. Draw every non-v1 look the definition names: add the look's case at each block's switch (src/ui/variant.js and the sites contract v2 opened; the v1 branch stays today's JSX, untouched) and make verify-vibe-seams accept it. Chrome for a light vibe (StatusBar dark, keyboards/date pickers light). The photo slots through src/ui/HeroPhoto.jsx (T.images.<slot>) with the same crops/scrims as web.
3. New verifiers (generic over every registered vibe, so later vibes reuse them): tools/verify-vibe-parity.mjs (§13.5: rn-render dumps the resolved colours, radii, borders, font family and variant of each vocabulary component in each registered vibe, and they must match that vibe's pure definition — the same values the web CSS was generated from) and tools/verify-vibe-fit.mjs (§13.3 native: rn-render mounts every screen and the Vibes sheet in each registered vibe without a crash; verify-text-color's rule holds for each vibe's presets; the Coach card fits with each vibe's metrics) — if an earlier vibe already added them, extend them instead. verify-vibe-switch: switching into ${V.id} and back mid-workout keeps the session, sets, rest timer and food day (extend it to use this real vibe).
4. verify-vibe-v1 must stay byte-identical (re-baseline nothing), theme identity --require-build; the native suite in UTC.
${COMMIT_NOTE} Final commit subject: "vibe: ${V.name} (V59 §${IRON ? '11' : V.kind === 'experimental' ? '12' : '10'})".`
const builds = await parallel([
  () => agent(`${PREAMBLE}${PLAN}${CONTEXT}\nThe asset agents reported: ${assetReport}\n${WEB_BUILD}`, { label: `V:${V.id}:web`, phase: 'Build', schema: BUILD_SCHEMA, ...HIGH }),
  () => agent(`${PREAMBLE}${PLAN}${CONTEXT}\nThe asset agents reported: ${assetReport}\n${NAT_BUILD}`, { label: `V:${V.id}:native`, phase: 'Build', schema: BUILD_SCHEMA, ...HIGH }),
])
if (!builds[0] || !builds[1]) return { assets, builds, error: 'a build agent failed — resume or re-run this vibe' }

// ---------- gates ----------
const GATES = [
  { key: 'contrast', text: `§13.1-§13.2 CONTRAST and COLOUR VISION for ${V.id}. Write (or reuse ${NIGHT}/tools/vibe-contrast.mjs if an earlier vibe wrote it) a script that walks every text role over every surface role that ACTUALLY OCCURS — derive the pairs from the code (the CSS in rack.css/auth.css/vibes/${V.id}.css resolved in this vibe; native's T.* call sites) — plus every icon, border and focus ring. Any colour this vibe changes or adds: 4.5:1 text, 3:1 large text (≥18pt, or 14pt bold) and UI graphics. Pairs inherited unchanged from v1: no worse than v1 (list those, e.g. v1's dim on bar 2.7). Text over images: measured on the real pixels at each slot's crop with its scrim. CVD: Machado 2009 deuteranopia + protanopia; the six muscle-group colours stay distinguishable (log pairwise ΔE00, gate 12 per the research) and nothing reads up/down by red vs green alone.` },
  { key: 'fit', text: `§13.3 FIT for ${V.id}. Web: \`node ${HARNESS} fit --repo ${WEB} --run v-${V.id}-fit --vibe ${V.id}\` at 320 and 390 (compare with a v1 fit run of the same tree if the harness supports --compare) — no horizontal overflow, no clipped text in fixed-height boxes (Coach card 190/164, buttons, chips), 44px targets. Native: tools/verify-vibe-fit.mjs for this vibe; verify-text-color; the Coach card fits with this vibe's metrics.` },
  { key: 'v1', text: `§13.4 V1 STILL IDENTICAL. Web: \`node ${HARNESS} --a ${NIGHT}/wt/web-base --b ${WEB} --expect-vibe 404,200 --run v-${V.id}-v1-absent\` over every scene at 390 and 320, and again with --data-vibe v1 — 0/0 everywhere EXCEPT the known v1 changes already on main (the Settings hub's Look section and the rules fixture's new rules — realign with ${NIGHT}/tools/s-web-realign.mjs and show nothing else differs). Native: verify-vibe-v1 byte-identical (baseline + the committed Settings-hub overlay only) and theme identity --require-build. Switching into ${V.id} and back mid-workout loses nothing: native verify-vibe-switch with this vibe; web: a harness or node check that a live session, its sets and the rest timer survive applyVibe('${V.id}') then applyVibe('v1'). All verifiers green in UTC in both trees.` },
  { key: 'parity', text: `§13.5 NATIVE PARITY for ${V.id}: run tools/verify-vibe-parity.mjs; every vocabulary component's resolved colours, radii, borders, font family and variant equal the pure definition (the web CSS's source). Spot-check that the web's generated block and the native build agree for 10 roles you pick.` },
]
if (IRON || V.fonts_or_images) GATES.push({ key: 'provenance', text: `§13.7 PROVENANCE (adversarial): re-verify every PROVENANCE.json entry for ${V.id} (both trees) from its SOURCE PAGE (WebFetch the item page): published before 1931; creator died before 1956 or anonymous; not a colourised or restored version; the pose passes §14's clothing rule; the file's sha256 matches. Re-verify every font's OFL.txt (OFL 1.1; Reserved Font Name). REJECT on those tests only, and reject if a test cannot be confirmed. A rejected image must be removed from both trees (its slot renders empty and clean) — say which.` })
else GATES.push({ key: 'provenance', text: `§13.7 FONT PROVENANCE: re-verify every font's OFL.txt (OFL 1.1; Reserved Font Name) and FONTS.json (sha256, source URL, copyright line) for ${V.id} in both trees. Reject on those tests only.` })

const runGates = async (round, only) => {
  const list = GATES.filter(g => !only || only.includes(g.key))
  const rs = await parallel(list.map(g => () =>
    agent(`${PREAMBLE}${PLAN}${CONTEXT}\n===== YOUR JOB: gate "${g.key}" for ${V.id}, round ${round} =====\n${g.text}\nDo not edit the worktrees (report must-fix items with a reproduction; the fixer fixes). pass=true only if nothing must be fixed.`,
      { label: `V:${V.id}:gate-${g.key}-r${round}`, phase: 'Gates', schema: GATE_SCHEMA, ...HIGH })))
  return rs.map((r, i) => r ? { ...r, key: list[i].key } : null).filter(Boolean)
}

const nJudges = V.kind === 'simple' ? 1 : 3
const judge = async (round) => {
  const shot = `${NIGHT}/proof/v-${V.id}/judge-r${round}`
  return (await parallel(Array.from({ length: nJudges }, (_, k) => () => agent(`${PREAMBLE}
===== YOUR JOB: "did an AI make this?" judge ${k + 1} of ${nJudges}, round ${round} (V59 §13.6) =====
Be adversarial: answer "AI-made" if unsure. ${k === 0 ? `First take the screenshots: \`node ${HARNESS} shoot --repo ${WEB} --out ${shot} --vibe ${V.id}\` (it holds ${NIGHT}/harness.lock; if another judge holds it, wait) — You, Train calendar, live session with a drop set, summary, Fuel day, the add-food sheet, the Coach sheet, Weight, Steps, the Settings hub, the Vibes sheet, sign-in, at 390.` : `The screenshots are (or will shortly be) in ${shot} — wait for them (poll with Read on the directory listing via a node one-liner), do not take your own.`} Read every PNG. Look for the tells in ${NIGHT}/research/01-ai-tells.md (the one-accent-on-graphite look, uniform rounded 1px-bordered cards, tiny tracked-caps eyebrows, rows of three stat tiles, icon-in-a-circle, pills everywhere, gradients/glass, generic icons, sparkles, hero-number + small caption, the same spacing everywhere, the cream-and-clay/hairline "escape" looks). ${V.kind === 'simple' ? 'This is a SIMPLE vibe: the layout is v1\'s by definition, so judge palette and type only.' : ''} Verdict: "human-designed" or "AI-made", with the tells you saw and the concrete fixes that would remove them. You have not seen the design docs; judge only what you see.`,
    { label: `V:${V.id}:judge${k + 1}-r${round}`, phase: 'Judge', schema: JUDGE_SCHEMA_V, ...HIGH })))).filter(Boolean)
}

const reviewRounds = V.kind === 'simple' ? 1 : IRON ? 3 : 2
const review = async (round) => agent(`${PREAMBLE}${PLAN}${CONTEXT}
===== YOUR JOB: layout-rule and correctness review of ${V.id}, round ${round} =====
Check both trees against §2's rule for this kind (${V.kind === 'simple' ? 'same layout' : V.kind === 'experimental' ? 'may rearrange within a screen, never the dock; per-screen fallback to same-order-new-shapes where a rearrangement cannot be proven safe' : 'same order, new shapes'}): every screen shows the same boxes${V.kind === 'experimental' ? ' (or the declared composition)' : ', in the same order'}; every control in the same place doing the same thing; nothing added or removed; every number and word identical; the dock untouched; 44pt targets. HOW, on the web: the base tree ignores 'rack:vibe' and always draws v1, so \`node ${HARNESS} --a ${NIGHT}/wt/web-base --b ${WEB} --expect-vibe 404,200 --vibe ${V.id} --run v-${V.id}-review-r${round}\` compares v1 against ${V.id} scene by scene: its TEXT and VALUE differences must be 0 and its STRUCTURE differences 0${V.kind === 'experimental' ? ' except the declared composition moves' : ''} (pixel/style/rect differences are the vibe itself and expected), apart from the Settings hub's known Look section and the rules fixture. Native: the rn-render text of every screen in v1 vs ${V.id} identical (extend verify-vibe-fit or write a scratch check). Findings need a reproduction; hard-rule failures are must-fix, everything else listed-not-fixed.`,
  { label: `V:${V.id}:review-r${round}`, phase: 'Review', schema: GATE_SCHEMA, ...HIGH })

const fix = async (round, items) => agent(`${PREAMBLE}${PLAN}${CONTEXT}
===== YOUR JOB: fix round ${round} for ${V.id} =====
Fix exactly these must-fix items, in the tree each names (web ${WEB}, native ${NAT}, or both; assets in both). For each: reproduce, fix, show the check that found it now passes. Keep the definition byte-identical across the trees (re-copy + re-pin if you change it). Re-run the suites in UTC. ${COMMIT_NOTE}
ITEMS:\n${JSON.stringify(items, null, 1)}`, { label: `V:${V.id}:fix-r${round}`, phase: 'Fix', schema: BUILD_SCHEMA, ...HIGH })

// gate loop (hard gates must pass; ≤3 rounds)
phase('Gates')
let gates = await runGates(1)
const gateHistory = [gates]
for (let r = 1; r <= 3; r++) {
  const bad = gates.filter(g => !g.pass)
  if (!bad.length) break
  log(`${V.id}: gates failing: ${bad.map(g => g.gate).join(', ')} (round ${r})`)
  phase('Fix')
  const f = await fix(`gates-${r}`, bad.flatMap(g => g.must_fix))
  if (!f) break
  gates = await runGates(r + 1, bad.map(g => g.key))
  gateHistory.push(gates)
}

// AI-made panel
phase('Judge')
let verdicts = await judge(1)
const judgeHistory = [verdicts]
const human = vs => vs.filter(v => v.verdict === 'human-designed').length
if (V.kind !== 'simple') {
  for (let r = 1; r <= 3 && human(verdicts) < 2; r++) {
    log(`${V.id}: AI panel ${human(verdicts)}/3 human-designed — revise round ${r}`)
    phase('Fix')
    const f = await agent(`${PREAMBLE}${PLAN}${CONTEXT}
===== YOUR JOB: revise ${V.id} after the AI-made panel, round ${r} =====
The judges (adversarial, "AI-made if unsure") said: ${JSON.stringify(verdicts)}. Change the vibe's look (its CSS, its native variant cases, its definition's values within the hard rules — contrast, CVD, fit, 44pt, same words and numbers, the layout rule) to remove the tells they named. Keep web and native in step (definition byte-identical; re-copy + re-pin). Re-run the suites in UTC and re-shoot to check. ${COMMIT_NOTE}`,
      { label: `V:${V.id}:revise-r${r}`, phase: 'Fix', schema: BUILD_SCHEMA, ...HIGH })
    if (!f) break
    const g2 = await runGates(`after-revise-${r}`, ['contrast', 'fit', 'v1'])
    gateHistory.push(g2)
    verdicts = await judge(r + 1)
    judgeHistory.push(verdicts)
  }
}
const aiPass = V.kind === 'simple' ? true : human(verdicts) >= 2

// layout review
phase('Review')
let rv = await review(1)
const reviewHistory = [rv]
for (let r = 1; r < reviewRounds && rv && rv.must_fix.length; r++) {
  phase('Fix')
  const f = await fix(`review-${r}`, rv.must_fix)
  if (!f) break
  rv = await review(r + 1)
  reviewHistory.push(rv)
}

const gatesPass = GATES.every(g => { const last = [...gateHistory].reverse().flat().find(x => x.key === g.key); return last && last.pass })
return {
  id: V.id, kind: V.kind, assets, builds,
  gatesPass, aiPass, reviewPass: !!rv && rv.must_fix.length === 0,
  ai: judgeHistory.map(vs => vs.map(v => ({ verdict: v.verdict, confidence: v.confidence, tells: v.tells }))),
  gates: gateHistory.map(gs => gs.map(g => ({ gate: g.gate, pass: g.pass, numbers: g.numbers, must_fix: g.must_fix, listed: g.listed_not_fixed }))),
  reviews: reviewHistory.map(r => r && { pass: r.pass, must_fix: r.must_fix, listed: r.listed_not_fixed }),
  commitReady: gatesPass && aiPass && !!rv && rv.must_fix.length === 0,
}
