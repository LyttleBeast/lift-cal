export const meta = {
  name: 'v59-vibe-resume',
  description: 'V59 §10-§14 one vibe, resumable: skips finished stages (assets/build) and carries finished gate results, then Q gates, AI panel, layout review, a closing v1 re-proof',
  phases: [
    { title: 'Assets', detail: 'fonts (all); photos, engraved icons, textures (Iron Age) — skipped when done' },
    { title: 'Build', detail: 'web and native presentation in parallel, as a relay per tree' },
    { title: 'Gates', detail: 'contrast/CVD, fit, v1 identical + switch, parity, provenance' },
    { title: 'Judge', detail: '"did an AI make this?" on the gallery screenshots' },
    { title: 'Review', detail: 'the layout rule and correctness, both trees' },
    { title: 'Fix', detail: 'must-fix from any gate, then re-run what failed' },
    { title: 'Re-proof', detail: 'v1/fit/parity again if a fix landed after they last ran' },
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
const V = Object.assign({"id":"ledger","name":"Ledger","kind":"deep","mainWeb":"a78ec39","mainNat":"ba4a447","spec":"/Users/micahflunker/dev/vibes-night/design/ledger.md","def":"/Users/micahflunker/dev/vibes-night/wt/web-design2/vibes/defs/ledger.js","icons":"/Users/micahflunker/dev/vibes-night/wt/web-design2/vibes/icons/ledger.js","registry":{"id":"ledger","name":"Ledger","feel":"Ruled columns on club green.","experimental":false,"scheme":"dark"},"fonts_or_images":true,"runSuffix":"-d1","buildRelay":3,"notes":"\n===== ENGINE v3 IS ON MAIN (web a78ec39, native ba4a447) — use its roles instead of the residuals the spec lists =====\nThe design (/Users/micahflunker/dev/vibes-night/wt/web-design2/vibes/defs/<id>.js, committed on vibes/design2 22a4151) was written on contract v2. Bring the definition up to v3 in the web tree (then copy byte for byte to native and pin): colors.knob (a toggle's off knob — a HEX, falls back to steel), colors.greetName (the greeting name's ink — a HEX role, not a colour name), type.tag (the literal-caps/sub-11pt sites; v1 sets none), type.hero + headline 'solo'/'bare', type.pill (web: no token — write .delta-pill .delta-v/.delta-a in your own CSS), shape.stripe ('side'|'top'|'keyline' for the tour tip and the Coach ask bubble), shape.cue.ink (default chalk; set 'accent' if your today keyline / dock rail / tab underline are accent), shape.chosen.tick (native draws it; on the web draw the tick in your own CSS off --shape-chosen-tick), shape.rank.column, rule.hair may be 0. Read vibes/defs/vocab.js (v3) for each look's exact wording and sites; /Users/micahflunker/dev/vibes-night/tmp/resume9/d4-specs.json has your spec's engine_asks and open items — every ask v3 answered is no longer a residual; say which remain. The web has no tint.* custom properties: write the vibe's tints as hand rules in its CSS (Chalk/Navy/Oxblood did). Chalk, Navy, Oxblood are on main: reuse their generic native verifiers (verify-vibe-parity/-fit/-switch/-seams) and /Users/micahflunker/dev/vibes-night/tools/vibe-contrast/ scripts; register the vibe in each. Iron Age (the other ruled vibe) is still on its own branch — card·ruled's wording is Iron Age's, adopted by the contract; do not copy Iron Age's files. Web fonts: @font-face family names start with the vibe id. The native \"≤4 static TTFs per vibe\" counts the vibe's OWN new files (v1's boot faces are already in the app; a face another vibe already ships, e.g. ArchivoCondensed_700, is shared, not re-added).\n===== LEDGER =====\nFonts per the spec: Manuale (OFL, no RFN) for text and figures + Archivo condensed (wdth 75 / 700) for heads; the Coach card stays Archivo on v1 metrics. The design stage prepared and measured the files: /Users/micahflunker/dev/vibes-night/design/ledger/final/fonts/out/ (web ledger-manuale.woff2 38,936 B, ledger-num.woff2 3,192 B, ledger-heads.woff2 25,404 B; native Manuale_400/600/700) and /Users/micahflunker/dev/vibes-night/tools/ledgerB/ArchivoCondensed_700.latin.ttf — the fonts agent may use them only after re-verifying source, licence, sha256 and glyph coverage (record FONTS.json). Manuale's hhea lineGap is 221/1000: every native preset sets an explicit lineHeight ≥ minLh 1.216 — check glyphs sit centred. The spec's decisions for Micah stand as specced (Manuale; Archivo Coach card; pink accent Q-P4; the kettlebell and scale dock icons)."}, args || {})
const WEB = `${NIGHT}/wt/web-v-${V.id}`
const NAT = `${NIGHT}/wt/nat-v-${V.id}`
const HARNESS = `${NIGHT}/wt/web-harness/report/btn-44/prove.mjs`
const IRON = V.kind === 'iron-age'
const DEEP = V.kind === 'deep' || V.kind === 'experimental' || IRON
const HIGH = { effort: 'high' }
const RS = V.runSuffix || ''
const SKIP = V.skip || []
const RELAY = V.buildRelay || 1

const PLAN = `
===== MICAH'S CHANGE OF PLAN (overrides the prompt where they differ) =====
Simple vibes: 1 review round; the AI panel is 1 judge, logged, non-blocking. Deep + experimental: ≤2 review rounds; the AI panel is 3 judges, hard gate, ≤3 revise rounds. Iron Age: full panel, full provenance, hard gate. Build/verify/review/fix agents run at high effort. On WIP branches run suites in UTC only (\`node ${NIGHT}/tools/run-verifiers.mjs <web|nat> <wt> <outDir> UTC\`); the orchestrator runs three zones at merge. No race hunts: anything new that is not a hard-rule failure goes under listed-not-fixed.
KNOWN PRE-EXISTING RED: rate-band fails under Pacific/Auckland on untouched rack-v58/build 58 (NZ DST) — irrelevant to UTC-only runs.
CURRENT MAINS (the session facts above are older): web main ${V.mainWeb}, native main ${V.mainNat}. This orchestrator session is a fresh one resuming the night; the previous session's agents are all dead — any half-finished work in a worktree or under ${NIGHT}/proof is theirs, never another live agent's.`

const CONTEXT = `
===== PHASE V (V59 §10-§14): the vibe "${V.name}" (id ${V.id}, kind ${V.kind}) =====
Read ${PROMPT} §2 (lines 191-233: the layout rules — ${V.kind === 'simple' ? 'SAME LAYOUT' : V.kind === 'experimental' ? 'MAY REARRANGE within a screen (never the dock)' : '"same order, new shapes"'}), §10 (1001-1045), ${IRON ? '§11 (1048-1096) in full, ' : ''}${V.kind === 'experimental' ? '§12 (1099-1122) in full, ' : ''}§13 (1125-1176), §14 (1179-1247). The spec: ${V.spec}. The pure definition: ${V.def}${V.icons ? `; its icon set: ${V.icons}` : ''}. The component vocabulary: ${NIGHT}/design/VOCAB.md and vibes/defs/vocab.js (contract v2, on main). Research: ${NIGHT}/research/SYNTHESIS.md (the never-do list) and ${NIGHT}/research/01-ai-tells.md.
Worktrees: WEB ${WEB} (branch vibes/${V.id}, from web main — the engine, the contract v2, Settings → Look → Vibes are all there); NATIVE ${NAT} (branch vibes/${V.id}, from native main; node_modules is a symlink — never stage it). Base trees for the v1 proof: ${NIGHT}/wt/web-base (928a65e) and ${NIGHT}/wt/nat-base (1cb6498). The web harness: ${HARNESS} (read its header; it serialises through ${NIGHT}/harness.lock; runs are long — run_in_background + poll, or shard). Name every run/output dir you create with the suffix "${RS}" (e.g. v-${V.id}-fit${RS}) so it never collides with a dead run's partial dir.
RULES OF THE ROAD: vibes change how Rack looks, never what it says or does — every number and word identical, 44pt targets, the dock's tabs/order/position never change. Web fonts are variable with a wght axis, weight only through font-variation-settings, self-hosted latin woff2 ≤120 KB/family with OFL.txt beside; @font-face family names prefixed with "${V.id}", never "Archivo". Native fonts are static TTFs, ≤4 per vibe (picker face included), under assets/fonts/<Family>/ with OFL.txt. All colours 6-digit hex. No AI imagery ever. Every selector in vibes/${V.id}.css starts with :root[data-vibe="${V.id}"] or [data-vibe="${V.id}"] (tools-check/vibes-scope.mjs); rules for the Vibes sheet's own tile must be scoped .vibe-in[data-vibe="${V.id}"] (a worn vibe's [data-vibe] rules otherwise reach every tile). Light vibes: web keeps the top safe-area band dark (the installed PWA's status text is always white); native sets StatusBar dark and keyboards/date pickers light; check the dock blur, sheet backdrop and every tint on the light ground. A deep vibe may override ONLY the inline JS sizes the prompt lists (§5.9) with !important, each commented with the JS site it beats. The Coach card keeps Archivo on v1 metrics unless the spec supplies its own advance table (generated with tools/lib/ttf-advance.mjs) and the Coach-surface checks pass in this vibe.
REGISTRATION (Micah's standing decision: the vibe's build agents add the vibe's own lines to the shared registries on this branch; the orchestrator merges vibes one at a time): web — vibes/defs/index.js VIBES entry ${JSON.stringify(V.registry)} (and native's byte-identical copy + the pins in tools/verify-vibes-verbatim.mjs), vibe.js's def/icon-set tables, index.html's static <link rel="stylesheet" href="vibes/${V.id}.css"> (after rack.css/auth.css) and the head script's theme-color map entry; native — src/state/vibe.js VIBE_DEFS entry (def, icons, images, fonts map, fit table if any). Change nothing else in those files.
${V.notes || ''}`

const BUILD_SCHEMA = { type: 'object', properties: {
  commit: { type: 'string' }, done: { type: 'array', items: { type: 'string' } }, sizes: { type: 'object' },
  suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } }, risks: { type: 'array', items: { type: 'string' } },
}, required: ['commit', 'done', 'sizes', 'suite_utc', 'left', 'risks'] }
const BUILD_SCHEMA_R = { ...BUILD_SCHEMA, properties: { ...BUILD_SCHEMA.properties, complete: { type: 'boolean' } }, required: [...BUILD_SCHEMA.required, 'complete'] }
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
const RESUMING = `RESUMING: if git status / git log in the worktrees show earlier work for THIS job (committed WIP or uncommitted files), an earlier agent died at a usage limit — review it and continue from it rather than starting over.`

// ---------- A. assets ----------
phase('Assets')
const assetJobs = [
  { key: 'fonts', text: `FONTS for ${V.name}, from the spec's font section. Fetch only with ${NIGHT}/tools/fetch.mjs (google/fonts on raw.githubusercontent.com, the family's upstream repo on github.com, or fonts.gstatic.com latin woff2 via the css2 URL). Confirm OFL 1.1 from OFL.txt and METADATA.pb and record any Reserved Font Name. Web: one self-hosted LATIN variable woff2 per family with a wght axis (subset with ${NIGHT}/tools/node_modules/subset-font if needed; record the tool + version), ≤120 KB/family, plus the picker's digit face if the spec has one; place under ${WEB}/vibes/${V.id}/fonts/ with OFL.txt and FONTS.json (family, files, version or commit, source URL, licence, copyright line, RFN, sha256). Native: ≤4 static TTFs (picker face included) under ${NAT}/assets/fonts/<Family>/ with OFL.txt, and the same FONTS.json at ${NAT}/assets/vibes/${V.id}/FONTS.json. Check tabular figures and the glyphs the app draws (’ — · – … × “ ” → ⚙ › ✕ ⋯ ✓ − ‹ ↳ ↑ ↓ ÷ ±) with opentype.js; list what falls back. Log every size. ${RESUMING}` },
]
let assetReport
if (SKIP.includes('assets')) {
  assetReport = `The asset agents FINISHED in an earlier run; their full reports are in ${V.priorAssetsFile} (Read it: the files they made, sizes, provenance, and what they left for the builders).`
  log(`${V.id}: assets skipped (done earlier)`)
} else {
  const assets = await parallel(assetJobs.map(j => () => agent(`${PREAMBLE}${PLAN}${CONTEXT}\n===== YOUR JOB: V/${j.key} =====\n${j.text}\n${COMMIT_NOTE} Commit on both branches you wrote to ("Vibe (WIP): ${V.name} — ${j.key}" / "vibe(wip): ${V.name} — ${j.key} (V59 §${IRON ? '11' : '10'})").`,
    { label: `V:${V.id}:${j.key}`, phase: 'Assets', schema: BUILD_SCHEMA, ...HIGH })))
  log(`${V.id}: assets ${assets.map((a, i) => assetJobs[i].key + (a ? '✓' : '✗')).join(' ')}`)
  assetReport = `The asset agents reported: ${JSON.stringify(assets.map((a, i) => ({ job: assetJobs[i].key, report: a })))}`
}

// ---------- B. build (a relay per tree) ----------
phase('Build')
const WEB_BUILD = `===== YOUR JOB: the web presentation of ${V.name} =====
${RESUMING}
1. Copy the pure definition ${V.def} to ${WEB}/vibes/defs/${V.id}.js${V.icons ? ` and the icon set ${V.icons} (or the icons agent's final vibes/icons/${V.id}.js) to ${WEB}/vibes/icons/${V.id}.js` : ''} byte for byte if not already there. Register the vibe (see REGISTRATION).
2. vibes/${V.id}.css: the generated token block (\`node tools-check/vibes-css.mjs --write\`), then hand-written component rules below it for every non-v1 look the definition names (VOCAB.md says what each look changes and what it keeps), @font-face rules for the vibe's faces (local files), images/textures by url() into vibes/${V.id}/. ${DEEP ? 'EVERY SCREEN must be covered, including the ones people forget: sign-in and the gates, onboarding (8 steps) and the tour, the Coach sheet/live chip/nudge, the add-food sheets, estimator, library and meals, water, the rest pill and peek bar, toasts, the Vibes sheet, the owner-only admin (legible).' : 'Simple: tokens + fonts + at most small shape tokens; the layout is v1\'s.'}
3. Offline: on selection vibe.js prefetches the active vibe's images and fonts; the first online launch prefetches every vibe's picker assets — make sure this vibe's assets are in those lists and within §14's budgets.
4. Verify: the web suite in UTC; \`node ${HARNESS} shoot --repo ${WEB} --out ${NIGHT}/proof/v-${V.id}/shoot${RS} --vibe ${V.id}\` (the gallery list) and Read the PNGs yourself — fix anything broken before handing over; a quick \`fit\` at 320 and 390 in this vibe.
${COMMIT_NOTE} Final commit subject: "Vibe: ${V.name}".`
const NAT_BUILD = `===== YOUR JOB: the native presentation of ${V.name} =====
${RESUMING}
1. Copy ${V.def} to ${NAT}/src/pure/vibes/defs/${V.id}.js${V.icons ? ` and the icon set to ${NAT}/src/pure/vibes/icons/${V.id}.js` : ''} BYTE FOR BYTE (node copyFileSync; they must equal the web's files — if the web builder changes them, re-copy), plus the updated src/pure/vibes/defs/index.js; update the pins in tools/verify-vibes-verbatim.mjs. Register in src/state/vibe.js VIBE_DEFS (def, icons, images via require(), fonts map \`'<Family>_<wght>': require('../../assets/fonts/<Family>/<file>.ttf')\`, fit table if the spec supplies one).
2. Draw every non-v1 look the definition names: add the look's case at each block's switch (src/ui/variant.js and the sites contract v2 opened; the v1 branch stays today's JSX, untouched) and make verify-vibe-seams accept it. Chrome for a light vibe (StatusBar dark, keyboards/date pickers light). The photo slots through src/ui/HeroPhoto.jsx (T.images.<slot>) with the same crops/scrims as web.
3. New verifiers (generic over every registered vibe, so later vibes reuse them): tools/verify-vibe-parity.mjs (§13.5: rn-render dumps the resolved colours, radii, borders, font family and variant of each vocabulary component in each registered vibe, and they must match that vibe's pure definition — the same values the web CSS was generated from) and tools/verify-vibe-fit.mjs (§13.3 native: rn-render mounts every screen and the Vibes sheet in each registered vibe without a crash; verify-text-color's rule holds for each vibe's presets; the Coach card fits with each vibe's metrics) — if an earlier vibe already added them (look on this branch AND on the other vibes/* branches: \`git -C ~/dev/rack-mobile log --all --oneline -- tools/verify-vibe-parity.mjs\`), extend them instead of writing rivals. verify-vibe-switch: switching into ${V.id} and back mid-workout keeps the session, sets, rest timer and food day (extend it to use this real vibe).
4. verify-vibe-v1 must stay byte-identical (re-baseline nothing), theme identity --require-build; the native suite in UTC.
${COMMIT_NOTE} Final commit subject: "vibe: ${V.name} (V59 §${IRON ? '11' : V.kind === 'experimental' ? '12' : '10'})".`

const relay = async (tree, brief) => {
  const reports = []
  for (let k = 1; k <= RELAY; k++) {
    const prev = reports.length ? `\n===== THE PREVIOUS ${tree.toUpperCase()} BUILDER IN THIS RELAY HANDED OVER =====\n${JSON.stringify(reports[reports.length - 1])}\nContinue from its last commit; do not redo committed steps.` : ''
    const r = await agent(`${PREAMBLE}${PLAN}${CONTEXT}\n${assetReport}${V.buildNotes && V.buildNotes[tree] ? '\n' + V.buildNotes[tree] : ''}${prev}\n${brief}\nSet complete=true only when every numbered step of YOUR JOB is done, verified and committed (the final commit subject made). Otherwise commit WIP, list exactly what is left in 'left', and set complete=false — another agent continues from your commit.`,
      { label: `V:${V.id}:${tree}${k > 1 ? '-' + k : ''}`, phase: 'Build', schema: BUILD_SCHEMA_R, ...HIGH })
    if (!r) break
    reports.push(r)
    if (r.complete) break
  }
  return reports
}
let builds
if (SKIP.includes('build')) {
  builds = [[{ prior: V.priorBuildsFile, complete: true }], [{ prior: V.priorBuildsFile, complete: true }]]
  log(`${V.id}: builds skipped (done earlier)`)
} else {
  builds = await parallel([() => relay('web', WEB_BUILD), () => relay('native', NAT_BUILD)])
  const ok = b => b && b.length && b[b.length - 1].complete
  log(`${V.id}: build web ${ok(builds[0]) ? '✓' : '✗'} native ${ok(builds[1]) ? '✓' : '✗'}`)
  if (!ok(builds[0]) || !ok(builds[1])) return { id: V.id, builds, error: 'a build relay did not finish — continue this vibe from its branch commits' }
}

// ---------- gates ----------
const GATES = [
  { key: 'contrast', text: `§13.1-§13.2 CONTRAST and COLOUR VISION for ${V.id}. Write (or reuse ${NIGHT}/tools/vibe-contrast.mjs if an earlier vibe wrote it) a script that walks every text role over every surface role that ACTUALLY OCCURS — derive the pairs from the code (the CSS in rack.css/auth.css/vibes/${V.id}.css resolved in this vibe; native's T.* call sites) — plus every icon, border and focus ring. Any colour this vibe changes or adds: 4.5:1 text, 3:1 large text (≥18pt, or 14pt bold) and UI graphics. Pairs inherited unchanged from v1: no worse than v1 (list those, e.g. v1's dim on bar 2.7). Text over images: measured on the real pixels at each slot's crop with its scrim. CVD: Machado 2009 deuteranopia + protanopia; the six muscle-group colours stay distinguishable (log pairwise ΔE00, gate 12 per the research) and nothing reads up/down by red vs green alone.` },
  { key: 'fit', text: `§13.3 FIT for ${V.id}. Web: \`node ${HARNESS} fit --repo ${WEB} --run v-${V.id}-fit${RS} --vibe ${V.id}\` at 320 and 390 (compare with a v1 fit run of the same tree if the harness supports --compare) — no horizontal overflow, no clipped text in fixed-height boxes (Coach card 190/164, buttons, chips), 44px targets. Native: tools/verify-vibe-fit.mjs for this vibe; verify-text-color; the Coach card fits with this vibe's metrics.` },
  { key: 'v1', text: `§13.4 V1 STILL IDENTICAL. Web: \`node ${HARNESS} --a ${NIGHT}/wt/web-base --b ${WEB} --expect-vibe 404,200 --run v-${V.id}-v1-absent${RS}\` over every scene at 390 and 320, and again with --data-vibe v1 (run v-${V.id}-v1-datavibe${RS}) — 0/0 everywhere EXCEPT the known v1 changes already on main (the Settings hub's Look section and the rules fixture's new rules — realign with ${NIGHT}/tools/s-web-realign.mjs and show nothing else differs). Native: verify-vibe-v1 byte-identical (baseline + the committed Settings-hub overlay only) and theme identity --require-build. Switching into ${V.id} and back mid-workout loses nothing: native verify-vibe-switch with this vibe; web: a harness or node check that a live session, its sets and the rest timer survive applyVibe('${V.id}') then applyVibe('v1'). All verifiers green in UTC in both trees.` },
  { key: 'parity', text: `§13.5 NATIVE PARITY for ${V.id}: run tools/verify-vibe-parity.mjs; every vocabulary component's resolved colours, radii, borders, font family and variant equal the pure definition (the web CSS's source). Spot-check that the web's generated block and the native build agree for 10 roles you pick.` },
]
if (IRON || V.fonts_or_images) GATES.push({ key: 'provenance', text: `§13.7 PROVENANCE (adversarial): re-verify every PROVENANCE.json entry for ${V.id} (both trees) from its SOURCE PAGE (WebFetch the item page): published before 1931; creator died before 1956 or anonymous; not a colourised or restored version; the pose passes §14's clothing rule; the file's sha256 matches. Re-verify every font's OFL.txt (OFL 1.1; Reserved Font Name). REJECT on those tests only, and reject if a test cannot be confirmed. A rejected image must be removed from both trees (its slot renders empty and clean) — say which.` })
else GATES.push({ key: 'provenance', text: `§13.7 FONT PROVENANCE: re-verify every font's OFL.txt (OFL 1.1; Reserved Font Name) and FONTS.json (sha256, source URL, copyright line) for ${V.id} in both trees. Reject on those tests only.` })

// fixSeq counts fixes that landed; lastRun[key] is the fixSeq a gate's latest result was measured at
let fixSeq = V.fixSeqStart || 0
const lastRun = {}
const runGates = async (round, only) => {
  const list = GATES.filter(g => !only || only.includes(g.key))
  const at = fixSeq
  const rs = await parallel(list.map(g => () =>
    agent(`${PREAMBLE}${PLAN}${CONTEXT}\n===== YOUR JOB: gate "${g.key}" for ${V.id}, round ${round} =====\n${g.text}\n${V.gateNotes ? V.gateNotes + '\n' : ''}Do not edit the worktrees (report must-fix items with a reproduction; the fixer fixes). pass=true only if nothing must be fixed.`,
      { label: `V:${V.id}:gate-${g.key}-r${round}`, phase: 'Gates', schema: GATE_SCHEMA, ...HIGH })))
  // a gate agent that died (null) gets one retry; if that dies too it counts as NOT passed, never as
  // "no news" — otherwise latest() would fall back to an older pass measured before a fix
  const out = []
  for (let i = 0; i < list.length; i++) {
    let r = rs[i]
    if (!r) r = await agent(`${PREAMBLE}${PLAN}${CONTEXT}\n===== YOUR JOB: gate "${list[i].key}" for ${V.id}, round ${round} (retry: the first agent died) =====\n${list[i].text}\n${V.gateNotes ? V.gateNotes + '\n' : ''}Do not edit the worktrees (report must-fix items with a reproduction; the fixer fixes). pass=true only if nothing must be fixed.`,
      { label: `V:${V.id}:gate-${list[i].key}-r${round}-retry`, phase: 'Gates', schema: GATE_SCHEMA, ...HIGH })
    out.push(r ? { ...r, key: list[i].key } : { key: list[i].key, gate: list[i].key, pass: false, died: true, must_fix: [], numbers: 'the gate agent died twice; not measured', listed_not_fixed: [] })
  }
  out.forEach(r => { lastRun[r.key] = at })
  return out
}

// MICAH'S DECISION ON THE PANEL (30 Sep; overrides §13.6): judges look the way real people would. Iron Age and the
// experimental vibe: 'designed' (pass = ≥2 of 3 say designed on purpose AND every concrete giveaway fixed or logged;
// ≤3 revise rounds; never passing → merge anyway and flag). Every other vibe: 'advisory' (one pass fixing the cheap,
// safe giveaways; the rest logged; never blocks). v1 is not judged.
const PANEL = V.panel || (IRON || V.kind === 'experimental' ? 'designed' : 'advisory')
const PERSONAS = [
  'a lifter who trains four or five days a week and has used a lot of fitness apps (Strong, Hevy, Fitbod, Apple Fitness, MyFitnessPal)',
  'a graphic designer — editorial, brand and app work — who notices type, colour, spacing and whether each choice was made on purpose',
  'someone who has seen a great many AI-made and template apps (v0, Lovable, Bolt, shadcn dashboards, Dribbble clones) and knows their look',
]
const nJudges = V.kind === 'simple' ? 1 : 3
const V1_SHOTS = `${NIGHT}/proof/cal-v1/judge-r1`
const JUDGE_SCHEMA_P = { type: 'object', properties: {
  verdict: { type: 'string', enum: ['designed-on-purpose', 'generic-template'] }, confidence: { type: 'number' },
  giveaways: { type: 'array', items: { type: 'string' }, description: 'concrete and fixable: "<screen> — <element> — what makes it look generic"' },
  less_generic_than_v1: { type: 'boolean' }, looks_cool: { type: 'boolean' }, what_works: { type: 'string' }, notes: { type: 'string' },
}, required: ['verdict', 'confidence', 'giveaways', 'less_generic_than_v1', 'looks_cool', 'what_works', 'notes'] }
const judge = async (round) => {
  const shot = `${NIGHT}/proof/v-${V.id}/judge${RS}-r${round}`
  return (await parallel(Array.from({ length: nJudges }, (_, k) => () => agent(`${PREAMBLE}
===== YOUR JOB: judge ${k + 1} of ${nJudges}, round ${round} — how "${V.name}" looks to a real person =====
You are ${PERSONAS[k]}. Look at this app the way that person would — on a phone, at arm's length and up close — not as a detector hunting for proof. ${k === 0 ? `First take the screenshots: \`node ${HARNESS} shoot --repo ${WEB} --out ${shot} --vibe ${V.id}\` (it holds ${NIGHT}/harness.lock; if another agent holds it, wait) — You, Train calendar, live session with a drop set, summary, Fuel day, the add-food sheet, the Coach sheet, Weight, Steps, the Settings hub, the Vibes sheet, sign-in, at 390.` : `The screenshots are (or will shortly be) in ${shot} — wait for them (poll with Read on the directory listing via a node one-liner), do not take your own.`} Read every PNG. For comparison, today's look (v1) is in ${V1_SHOTS} — read a few of those too.
Answer the one question: "Does this look like a generic AI/template app, or like something a person designed on purpose?" (verdict "generic-template" or "designed-on-purpose", with your confidence). Then: is it clearly less generic than v1 (less_generic_than_v1), and does it look cool (looks_cool)? List every concrete GIVEAWAY that makes it look generic — each one specific and fixable ("<screen> — <element> — what gives it away"), not a general impression; ${NIGHT}/research/01-ai-tells.md names common ones. Say what works. ${V.kind === 'simple' ? 'This is a SIMPLE vibe: the layout is v1\'s by definition, so judge palette and type only.' : ''} You have not seen the design docs; judge only what you see.`,
    { label: `V:${V.id}:judge${k + 1}-r${round}`, phase: 'Judge', schema: JUDGE_SCHEMA_P, ...HIGH })))).filter(Boolean)
}

const reviewRounds = V.reviewRounds || (V.kind === 'simple' ? 1 : IRON ? 3 : 2)
const review = async (round) => agent(`${PREAMBLE}${PLAN}${CONTEXT}
===== YOUR JOB: layout-rule and correctness review of ${V.id}, round ${round} =====
Check both trees against §2's rule for this kind (${V.kind === 'simple' ? 'same layout' : V.kind === 'experimental' ? 'may rearrange within a screen, never the dock; per-screen fallback to same-order-new-shapes where a rearrangement cannot be proven safe' : 'same order, new shapes'}): every screen shows the same boxes${V.kind === 'experimental' ? ' (or the declared composition)' : ', in the same order'}; every control in the same place doing the same thing; nothing added or removed; every number and word identical; the dock untouched; 44pt targets. HOW, on the web: the base tree ignores 'rack:vibe' and always draws v1, so \`node ${HARNESS} --a ${NIGHT}/wt/web-base --b ${WEB} --expect-vibe 404,200 --vibe ${V.id} --run v-${V.id}-review${RS}-r${round}\` compares v1 against ${V.id} scene by scene: its TEXT and VALUE differences must be 0 and its STRUCTURE differences 0${V.kind === 'experimental' ? ' except the declared composition moves' : ''} (pixel/style/rect differences are the vibe itself and expected), apart from the Settings hub's known Look section and the rules fixture. Native: the rn-render text of every screen in v1 vs ${V.id} identical (extend verify-vibe-fit or write a scratch check). ${V.reviewNotes || ''} Findings need a reproduction; hard-rule failures are must-fix, everything else listed-not-fixed.`,
  { label: `V:${V.id}:review-r${round}`, phase: 'Review', schema: GATE_SCHEMA, ...HIGH })

const fix = async (round, items) => {
  const f = await agent(`${PREAMBLE}${PLAN}${CONTEXT}
===== YOUR JOB: fix round ${round} for ${V.id} =====
${RESUMING}
Fix exactly these must-fix items, in the tree each names (web ${WEB}, native ${NAT}, or both; assets in both). For each: reproduce, fix, show the check that found it now passes. Keep the definition byte-identical across the trees (re-copy + re-pin if you change it). Keep v1 byte-identical (every change sits in ${V.id}'s own branch of a switch, its own CSS, or its own definition). Re-run the suites in UTC. ${COMMIT_NOTE}
ITEMS:\n${JSON.stringify(items, null, 1)}`, { label: `V:${V.id}:fix-r${round}`, phase: 'Fix', schema: BUILD_SCHEMA, ...HIGH })
  if (f) fixSeq++
  return f
}

// gate loop (hard gates must pass; ≤3 fix rounds). Prior results (from a dead run, on unchanged commits) count as round 1.
phase('Gates')
const prior = (V.priorGates || []).map(g => ({ ...g }))
// a carried gate is fresh (measured after the last fix) unless it says fresh:false — then the re-proof re-measures it
prior.forEach(g => { lastRun[g.key] = g.fresh === false ? -1 : fixSeq })
if (prior.length) log(`${V.id}: carried from the earlier run: ${prior.map(g => g.key + (g.pass ? '✓' : '✗')).join(' ')}`)
let gates = [...prior, ...(await runGates(`1${RS}`, GATES.map(g => g.key).filter(k => !prior.some(p => p.key === k))))]
const gateHistory = [gates]
for (let r = 1; r <= 3; r++) {
  const bad = gates.filter(g => !g.pass)
  if (!bad.length) break
  log(`${V.id}: gates failing: ${bad.map(g => g.key + (g.died ? '(died)' : '')).join(', ')} (round ${r})`)
  const items = bad.flatMap(g => g.must_fix.map(m => ({ gate: g.key, ...m })))
  if (!items.length) break
  phase('Fix')
  const f = await fix(`gates-${r}${RS}`, items)
  if (!f) break
  gates = await runGates(`${r + 1}${RS}`, bad.map(g => g.key))
  gateHistory.push(gates)
}

// the panel (Micah's decision, 30 Sep) — see PANEL above
phase('Judge')
const GIVE_SCHEMA = { ...BUILD_SCHEMA, properties: { ...BUILD_SCHEMA.properties, fixed: { type: 'array', items: { type: 'string' } },
  logged: { type: 'array', items: { type: 'object', properties: { giveaway: { type: 'string' }, reason: { type: 'string' } }, required: ['giveaway', 'reason'] } } },
  required: [...BUILD_SCHEMA.required, 'fixed', 'logged'] }
const HARD = `the hard rules — contrast and colour vision (§13.1-§13.2), fit and 44pt targets, every word and number identical, the layout rule for this kind (§2), the dock untouched, v1 byte-identical (every change in ${V.id}'s own CSS, its own branch of a switch, or its own definition); keep web and native in step (definition byte-identical across the trees; re-copy + re-pin)`
// after any change to the look: contrast/fit/v1 again, one fix if a hard gate broke
const gatesAfter = async (tag) => {
  const g2 = await runGates(`${tag}${RS}`, ['contrast', 'fit', 'v1'])
  gateHistory.push(g2)
  const bad2 = g2.filter(g => !g.pass), items2 = bad2.flatMap(g => g.must_fix.map(m => ({ gate: g.key, ...m })))
  if (items2.length && await fix(`${tag}${RS}`, items2)) gateHistory.push(await runGates(`${tag}-fix${RS}`, bad2.map(g => g.key)))
}
const giveawayFix = async (tag, vs, mode) => {
  const f = await agent(`${PREAMBLE}${PLAN}${CONTEXT}
===== YOUR JOB: the judges' concrete giveaways for ${V.id} (${tag}) =====
${RESUMING}
Three people (a lifter, a graphic designer, someone who has seen many AI-made apps) looked at ${V.name} and listed what makes it look generic: ${JSON.stringify(vs.map(v => ({ verdict: v.verdict, giveaways: v.giveaways, what_works: v.what_works })))}.
${mode === 'advisory' ? 'Fix each giveaway where it is CHEAP and SAFE — a value in the definition, a rule in the vibe\'s own stylesheet, the vibe\'s own native look branch — and LOG the rest with a concrete reason (too costly, needs a shared file, would break a hard rule, is v1\'s own layout, or you disagree and why).' : 'Fix EVERY giveaway you can; LOG each one you cannot with a concrete reason (would break a hard rule, needs a shared file, or you disagree and why). Keep what the judges said works.'} Stay within ${HARD}. Re-run the suites in UTC and re-shoot the gallery to check. Return fixed (one line each) and logged ({giveaway, reason}). ${COMMIT_NOTE}`,
    { label: `V:${V.id}:giveaways-${tag}`, phase: 'Fix', schema: GIVE_SCHEMA, ...HIGH })
  if (f) fixSeq++
  return f
}
const designed = vs => vs.filter(v => v.verdict === 'designed-on-purpose').length
let verdicts = await judge(`1${RS}`)
const judgeHistory = [verdicts]
const giveawayHistory = []
let panelPassed = PANEL === 'advisory', panelFlagged = false
if (PANEL === 'advisory') {
  log(`${V.id}: panel (advisory) ${designed(verdicts)}/${verdicts.length} designed on purpose`)
  phase('Fix')
  const gf = await giveawayFix('advisory', verdicts, 'advisory')
  giveawayHistory.push(gf)
  if (gf) await gatesAfter('after-giveaways')
} else {
  for (let r = 1; ; r++) {
    log(`${V.id}: panel round ${r}: ${designed(verdicts)}/${verdicts.length} designed on purpose`)
    phase('Fix')
    if (designed(verdicts) >= 2) {
      // pass needs every concrete giveaway fixed or logged with a reason
      const gf = await giveawayFix(`round-${r}`, verdicts, 'designed')
      giveawayHistory.push(gf)
      if (gf) { await gatesAfter(`after-giveaways-${r}`); panelPassed = true }
      break
    }
    if (r > 3) { panelFlagged = true; break }   // three revise rounds spent: merge anyway, flagged for Micah
    const f = await agent(`${PREAMBLE}${PLAN}${CONTEXT}
===== YOUR JOB: revise ${V.id} after the panel, round ${r} of at most 3 =====
${RESUMING}
Micah's bar: ${V.name} must look clearly less generic than v1 to a real person, and look cool — like something a person designed on purpose. Three people (a lifter who uses fitness apps, a graphic designer, someone who has seen a lot of AI-made apps) said: ${JSON.stringify(verdicts)}. Change the vibe's look — its CSS, its native look branches, its definition's values — to fix every giveaway they named and to strengthen what they said works, true to the spec (${V.spec}). Stay within ${HARD}. Re-run the suites in UTC and re-shoot to check. ${COMMIT_NOTE}`,
      { label: `V:${V.id}:revise-r${r}`, phase: 'Fix', schema: BUILD_SCHEMA, ...HIGH })
    if (!f) { panelFlagged = true; break }
    fixSeq++
    await gatesAfter(`after-revise-${r}`)
    verdicts = await judge(`${r + 1}${RS}`)
    judgeHistory.push(verdicts)
  }
}

// layout review; a must-fix from the last round still gets its fix (the re-proof below re-measures)
phase('Review')
let rv = await review(1)
const reviewHistory = [rv]
let reviewFixedAfterLast = false
for (let r = 1; r <= reviewRounds && rv && rv.must_fix.length; r++) {
  phase('Fix')
  const f = await fix(`review-${r}${RS}`, rv.must_fix)
  if (!f) break
  if (r === reviewRounds) { reviewFixedAfterLast = true; break }
  rv = await review(r + 1)
  reviewHistory.push(rv)
}

// closing re-proof: any of v1/fit/parity measured before the last fix is measured again
phase('Re-proof')
const latest = key => { for (let i = gateHistory.length - 1; i >= 0; i--) { const g = gateHistory[i].find(x => x.key === key); if (g) return g } return null }
let stale = ['v1', 'fit', 'parity'].filter(k => lastRun[k] !== fixSeq)
if (stale.length) {
  log(`${V.id}: re-proof after the last fix: ${stale.join(', ')}`)
  let g3 = await runGates(`reproof${RS}`, stale)
  gateHistory.push(g3)
  const bad = g3.filter(g => !g.pass)
  const items = bad.flatMap(g => g.must_fix.map(m => ({ gate: g.key, ...m })))
  if (items.length) {
    const f = await fix(`reproof${RS}`, items)
    if (f) {
      g3 = await runGates(`reproof-2${RS}`, [...new Set([...bad.map(g => g.key), 'v1'])])
      gateHistory.push(g3)
    }
  }
}

const gatesPass = GATES.every(g => { const l = latest(g.key); return l && l.pass })
const reviewPass = !!rv && (rv.must_fix.length === 0 || reviewFixedAfterLast)
return {
  id: V.id, kind: V.kind, builds,
  gatesPass, reviewPass, reviewFixedAfterLast,
  panel: { mode: PANEL, passed: panelPassed, flagged: panelFlagged, rounds: judgeHistory.length },
  judges: judgeHistory.map(vs => vs.map(v => ({ verdict: v.verdict, confidence: v.confidence, less_generic_than_v1: v.less_generic_than_v1, looks_cool: v.looks_cool, giveaways: v.giveaways, what_works: v.what_works }))),
  giveaways: giveawayHistory.map(g => g && { fixed: g.fixed, logged: g.logged, commit: g.commit }),
  gates: gateHistory.map(gs => gs.map(g => ({ key: g.key, gate: g.gate, pass: g.pass, numbers: g.numbers, must_fix: g.must_fix, listed: g.listed_not_fixed }))),
  reviews: reviewHistory.map(r => r && { pass: r.pass, must_fix: r.must_fix, listed: r.listed_not_fixed }),
  // the panel never blocks a merge (Micah, 30 Sep); a flagged 'designed' vibe merges and goes at the top of the report
  commitReady: gatesPass && reviewPass,
}
