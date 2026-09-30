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
const V = Object.assign({"id":"iron-age","name":"Iron Age","kind":"iron-age","spec":"/Users/micahflunker/dev/vibes-night/design/iron-age.md","def":"/Users/micahflunker/dev/vibes-night/wt/web-design/vibes/defs/iron-age.js","icons":"/Users/micahflunker/dev/vibes-night/wt/web-design/vibes/icons/iron-age.js","registry":{"id":"iron-age","name":"Iron Age","feel":"Ink on cream, circa 1900.","experimental":false,"scheme":"light"},"fonts_or_images":true,"notes":"===== IRON AGE: WHAT ENGINE v2 LEFT TO THIS VIBE (main now has engine v2: web 58ac3be, native dc05c3a) =====\n1. The definition was written BEFORE engine v2's roles. Update it (in the web tree, then copy byte for byte to native): set tagInk (its W/F/D letter colours currently sit in tint.tag*.color; without tagInk they resolve to pYellow #8b6600 on both clients), and the new roles its spec asks for — colors.band #1c1712 (the dark strip under the web status text), shadow.calHead / calTarget if the spec rings them, inkOf per spec §14 (E12), type.meta (E14), face.web.display / italic / num ('IA Besley', 'IA Besley Italic', 'IA Besley Digits'), images.<slot>.band 80 for the band slots, and the shape params incl. rule.sub [1.2], rule.total [1,2,1], lead.keyline. index.js's valueOf() fills anything left out from fallback roles/defaults. Every definition must carry a `shape` object. Run tools-check/vibes-contract.mjs with iron-age registered.\n2. Native calorie hatches: engine v2's CalMeter chart·print case draws ONE 45° pattern for every band; the spec (§7 chart·print, §9.3) wants cut = 45° hatch, hold = an ochre dot screen, gain = 135° hatch — draw the three in Iron Age's case. The bar guide's swatches (src/ui/food/barGuide.jsx GuideSwatch ~172-174) still draw .45 washes under print, beside the words 'Blue — cut' — open a switch there (variant.js + verify-vibe-seams SITES) and draw the same three patterns. The web draws its bands in vibes/iron-age.css (SVG <pattern> defs exist only under print/board).\n3. Web band mode: the engine only generates --photo-band-<slot> (80px). Draw the strip and grow the box's padding in vibes/iron-age.css with the selectors listed in vibe.js above imageUrl: youHero .you-hero, summaryHero .summary-hero, fuelSummary .card.fuel-sum, stepsToday '#view-steps .cal-hd + .card', weightLog '#view-weight .cal-hd + .card'. The spec puts no photo on the Coach card, Start workout or Fuel; follow the spec's slot list exactly.\n4. kpi·word: engine v2 put the rule in place (native pillShown(); web by selector) — draw Iron Age's branch.\n5. Tailpieces (one traced object per tab per the spec: globe dumbbell You, Indian club Train, chest expander Fuel, wooden ring Weight, globe bar-bell recap, none on Steps): the sites exist on both clients (icon set ornaments); fill Iron Age's ornaments.\n6. Native .cal-tick has no ring (pre-existing v1 behaviour); the spec's 'ticks white with a 1pt ink edge' shows on web only — list it, don't change v1.\n7. Photos (Q-Q2): three of the four band plates (Sargent 0205, Anderson lunge, Anderson woman) still need the face rule on every band box (widths 288/343/358/398, 80pt tall); gym-naval-academy is each one's verified fallback. Apply §14's clothing rule strictly; anything unconfirmed falls back.\n8. The spec's decisions left to Micah (band mode vs scrimmed plate, the r2g stock, the grain, bleed as PNG vs vector rules, the tone map, no photo on Fuel/Start workout/Coach, the dropped caps exception, the dial scale for 'weight', pYellow #8b6600) — follow the spec's choices, list them; don't block.\n9. The web builder and the native builder both need the final def: the WEB builder owns the def + icon set edits; the native builder copies them byte for byte at the end (re-copy if the web side changes them later) and re-pins.\n===== RESUMING (session 2, run 3) =====\nThe builds are DONE (web 6a4c1b6 \"Vibe: Iron Age\", native 45edfa7) and so are gate fix rounds 1-3 and AI-panel revise round 1; every agent report of that run is in /Users/micahflunker/dev/vibes-night/tmp/resume9/iron-age-run2-results.json. The round-2 panel said AI-made 3/3 (0.62-0.70); revise round 2 was cut off by a usage limit AFTER committing web b897928/7ac19be/fdfce3d and native 26079a0/aeef061/5239f43 — the next revise agent reviews those and finishes the round. Mains moved: Chalk (b99ec9d/f3382d3) and Navy (10fe73b/d2af836) are merged; the orchestrator reconciles Iron Age's registry lines and verifier edits with them at merge — do not rebase. Provenance was verified on the current photo and engraving files: do not add, swap or re-crop an image or engraving without saying so explicitly in your report (it would need the provenance gate again).\n===== RESUMING (run 4): MICAH'S PANEL DECISION =====\nRun 3 (/Users/micahflunker/dev/vibes-night/tmp/resume9/iron-age-run3-results.json) finished three AI-panel revise rounds under the OLD adversarial brief (3/3 \"AI-made\" 0.60-0.70 — the same brief judges v1 itself AI-made at 0.90-0.93), then three layout-review rounds and the re-proof. Micah's decision (30 Sep) replaces that panel: Iron Age must look clearly less generic than v1 to a real person, and look cool. Three judges look the way real people would (a lifter who uses fitness apps, a graphic designer, someone who has seen a lot of AI-made apps) and answer \"Does this look like a generic AI/template app, or like something a person designed on purpose?\" Pass when ≥2 of 3 say designed on purpose AND every concrete giveaway is fixed or logged with a reason; max 3 revise rounds; if it still doesn't pass it is merged anyway and flagged for Micah. One layout review of whatever this run changes follows.","mainWeb":"a78ec39","mainNat":"ba4a447","skip":["assets","build"],"runSuffix":"-rs11","buildRelay":3,"priorAssetsFile":"/Users/micahflunker/dev/vibes-night/tmp/resume9/iron-age-journal-results.json","buildNotes":{"web":"YOUR PREDECESSOR (dead at a usage limit) committed on vibes/iron-age: 8b649e4 \"definition, registry, tokens\" and d7f39e4 \"the stylesheet, first pass\" (after the asset commits 8245ae9 fonts, f4ad6b5 textures, f6af340 photos, 24c36ee icons). Read `git -C <WEB> log -p 58ac3be..HEAD -- vibes/iron-age.css vibes/defs` selectively and continue: the stylesheet is a FIRST PASS — finish every screen (step 2's list), the offline lists (step 3), the verification (step 4), then the final commit. The fonts agent's report says the def's face.web.* names must carry the id prefix ('iron-age Besley' / 'iron-age Besley Italic' / 'iron-age Besley Digits', tools-check/vibes-scope) and Besley's figures are proportional by default, so apply tnum wherever Besley sets a figure — check both are done.","native":"YOUR PREDECESSOR (dead at a usage limit) committed on vibes/iron-age: cf52723 \"registered\", 4113820 \"the first looks drawn\", a29cee7 \"the set table, rows, chrome and figures\", 87aba32 \"chart · print\" (after the asset commits 9487110 fonts, 7c4c65a textures, d896345 photos, 97e2154 icons). Read `git -C <NAT> log --stat 1cb6498..HEAD` and continue from there (engine v2's leftovers in the notes above: per-band calorie hatches, the GuideSwatch switch, photo face-rule fallbacks, tailpieces, the kpi·word branch …). GENERIC VERIFIERS: the Chalk vibe (native branch vibes/chalk, 0732de4; it merges to main BEFORE Iron Age) already wrote tools/verify-vibe-parity.mjs and tools/verify-vibe-fit.mjs, generic over registered vibes, plus extensions to verify-vibe-switch/-seams/-setting/-verbatim and tools/lib/vibe-seed.mjs. Do NOT write rivals: read them with `git -C /Users/micahflunker/dev/rack-mobile show vibes/chalk:tools/verify-vibe-parity.mjs` (and …fit.mjs), Write them onto your branch unchanged, then extend them for Iron Age in small, additive hunks (the orchestrator reconciles with Chalk's final copies at merge)."},"fixSeqStart":1,"priorBuildsFile":"/Users/micahflunker/dev/vibes-night/tmp/resume9/iron-age-run3-results.json","panel":"designed","reviewRounds":1,"priorGates":[{"key":"contrast","gate":"Contrast and colour vision (V59 §13.1–§13.2) for iron-age, round after-revise-3-rs10. Web vibes/iron-age at 1649815, native vibes/iron-age at 36838fc; both worktrees clean apart from native's untracked node_modules link. Everything was collected fresh this round, nothing reused. Outputs are in /Users/micahflunker/dev/vibes-night/proof/vc-iron-age-ar3-rs10/: web-iron-age-ar3-rs10.json (66 scenes at 390, 0 errors, 16/16 fonts), nat-iron-age-ar3-rs10.json and nat-v1-ar3-rs10.json (80 seeded + 24 small scenes each, same tree, the second with no vibe), and geom-rs10/geom.json (the plate-chip pixels and the band overlap, at 320 and 390). I reused the existing tools in tools/vibe-contrast (web-rs10, native, analyze, compare, cvd, states-rs9, ia-r4-diff-rs9, ia-r3-geom-rs9). I added two scripts: tools/vibe-contrast/ia-ar3-steps-rs10.mjs, which measures the new Steps met/short colours and the CVD distance between them, and tools/vibe-contrast/ia-ar3-geom-retry-rs10.mjs, which re-runs the geometry check because its 45-minute lock wait timed out once in tonight's queue. I edited no worktree, installed nothing, and nothing was refused. Web v1 reference: proof/vc-iron-age-rs9/web-v1-rs9.json. It fails, because panel rounds 2 and 3 made one new failing pair on both clients (below).","pass":false,"must_fix":[{"title":"statRow · runin puts a value in pYellow (#8b6600) at 18/700, which is small text, so it is 3.92:1 on the page and 3.70 on the grain where 4.5 is needed. It is the 'Best e1RM' figure on a lift's Statistics page. Under ledger it was 20/800, large text, so 3:1 applied.","tree":"both","where":"WEB: vibes/iron-age.css:663 sets `.stat-val { font-size: 18px; 'wght' 700 }`, and the caller is stats.js:396 (`'Best e1RM', 'var(--p-yellow)'`, an inline style.color). NATIVE: src/ui/Stat.jsx:92-104 (the runin branch sets the value with T.text.statVal in the caller's colour), and the caller is app/(app)/(tabs)/workout/stats/[exId].jsx:147 (`color={T.colors.pYellow}`). Both come from type.statVal { size: 18, wght: 700 } in vibes/defs/iron-age.js:402, which is byte-identical in src/pure/vibes/defs/iron-age.js:402. The two ways to fix it: ink a small value through the definition's inkOf (pYellow→warn 5.74 / 5.42 on grain, pChrome→steel), or make statVal large (≥18.66px at 700; 19/700 puts 3.92 flat and 3.70 on grain over 3:1). On the web the value's colour is an inline style, so the size route needs no !important.","reproduction":"WEB: node /Users/micahflunker/dev/vibes-night/tools/vibe-contrast/web-rs10.mjs --repo /Users/micahflunker/dev/vibes-night/wt/web-v-iron-age --label x --vibe iron-age --widths 390 --out <dir> ; node /Users/micahflunker/dev/vibes-night/tools/vibe-contrast/analyze.mjs <dir>/web-x.json --grep stat-val  → 'text 3.92 fg #8b6600 bg #e6dec9 fs 18 w 700 n1, scenes: stats-detail, ctx div.stat-val.num < div.stat < div.stat-row, text \"303\"' (v1 draws the same site at #f0be1e on #1c1f26 = 9.49). NATIVE: node /Users/micahflunker/dev/vibes-night/tools/vibe-contrast/native.mjs --root /Users/micahflunker/dev/vibes-night/wt/nat-v-iron-age --label x --vibe iron-age --out <dir> ; node /Users/micahflunker/dev/vibes-night/tools/vibe-contrast/ia-r4-diff-rs9.mjs /Users/micahflunker/dev/vibes-night/proof/vc-iron-age-ar1x-rs9/nat-iron-age-ar1x-rs9.json <dir>/nat-x.json  → 'NEW 3.92 text|#8b6600|#e6dec9|#8b6600| n2 | seeded · Statistics — one lift, seeded · Statistics — one lift with no weight on the bar (Plank)', texts \"251\" and \"–\", fs 18 w 700. Both results are already saved in /Users/micahflunker/dev/vibes-night/proof/vc-iron-age-ar3-rs10/."}],"numbers":"WEB: 2059 pairs over 66 scenes. 27 groups fall under threshold; the last passing round (ar1x) had 25. Diffed against ar1x with ia-r4-diff-rs9:\n- 1 new real failure: the pYellow stat value above.\n- 2 groups are gone. The Train calendar button's 1.28 fill went because it is now a bare cut. The disabled Fuel 'next' chevron at 1.89 moved from svg-stroke to svg-fill, because the icons are now solid cuts. It is still 1.89 and still exempt, being disabled at .3.\n- The rest are artefacts or unchanged:\n  - find-mark 'ring' rows (1.0 / 1.16 / 1.93): the collector reads the inset shadow against the inline subject ground. `box-shadow: inset 0 0 0 2px` on a 12×3 mark covers every pixel, so the mark shows as ink on the page at 13.26.\n  - Tour-dot and picker-search groups changed count only; both classes were accepted before.\n- Pressed and focus states (states-rs9): one new row, `.chip:active` on a chosen chip at 1.28. The tool applies an :active rule on its own, without the cascade. The real cascade has `[data-vibe] .chip.on` at the same specificity later in the file (iron-age.css:735 after :732), so a pressed chosen chip stays knockout on inverse at 13.99. An unchosen pressed chip is chalk on raised, 10.90. Every other state row matches ar1x.\n- Changed looks, measured:\n  - Stamp chips and boxed segments: chalk keyline on the page, 13.26 (13.99 on bar); chosen cells knockout on inverse, 13.99.\n  - Coach sheet: Rack's lines are now on bar paper, not raised.\n  - Rule inks: sync-pip off square in warn 5.74 (5.42 on grain); find-mark ink.\n  - Steps: the 'to go' figure at 17/700 is chalk or good (≥5.74).\n  - Other coloured stat values: good or warn at 5.74 (5.42 on grain).\n\nNATIVE: 13,275 pairs. 25 under-threshold groups against ar1x's 24; the other 24 are identical, counts included, and every one is the accepted set, no worse than v1:\n- tracks and rules at 1.07–1.56;\n- the target line and head ink border at 10.75;\n- the water wave at 2.13 (v1 1.83);\n- weight dots at 2.05 (v1 2.03);\n- disabled Add and Save at 2.44 / 2.47;\n- the harness-only Sign-in scene.\nThe one new group is the pYellow stat value above.\n\nIMAGES AND GEOMETRY (geom-rs10, both widths):\n- Plate chips: 24 real at each width (4 scenes × 6 at 320 and at 390), padding boxes 35–50×21. The middle row under every figure is #e6dec9 / #1c1712 plus anti-aliasing only; no plate colour sits under a figure (13.26).\n- Band mode: only .summary-hero carries a band now (80px band, 100px padding-top, 0 text or control hits). You, Weight and Steps have no band, as the definition says.\n- The image files (recap.png, pick.png) and the scrim are unchanged since a627ed9, so ar1x's measurement holds: the Vibes tile's '315' is 4.69 at the worst pixel, 0 of 88,704 pixels under 4.5.\n\nCVD (Machado 2009, severity 1.0; cross-checked against colour-lib, largest ΔE disagreement 0.0000). The palette is unchanged since ar1x.\n- Six muscle groups, minimum pairwise ΔE00: normal 21.71 (back/core), deuteranopia 12.64 (shoulders/core), protanopia 13.31 (chest/shoulders). All clear the gate of 12. v1's are 16.40 / 10.90 / 15.18.\n- Calorie zones (normal / deut / protan): cut/gain 39.8 / 42.3 / 36.9, hold/gain 30.8 / 14.3 / 19.5, hold/cut 44.5 / 48.6 / 44.6, and the zones are also told apart by pattern.\n- New this round, Steps met (good #0e5f40) against short (pWhite #2a241d): ΔE00 28.40 / 14.19 / 18.20, luminance 1.99:1. Short days are 11.44 on the page. The Steps heat strip's faintest cell, pWhite at .70, is 3.34 on the page and 3.24 on bar against an untrained cell (ΔE00 33.1). The short arc against the knurl ticks is 3.25.\n- Up and down never rest on red versus green alone: the delta pills keep their arrows and signed figures (good/bad under deuteranopia 14.48, L* 34.0 / 31.3).","listed_not_fixed":["Native: the calorie meter's two zone ticks (white at .85) are 1.54:1 on the cream track with no ring. v1 has no ring there either (food.jsx), so this is pre-existing v1 behaviour; the brief says list it and leave v1 alone. The web draws the ink ring (10.75).","Web and native: the disabled primary button ('Add' in the exercise picker, 'Save' on the recap's feel card) at opacity .4 is 2.44 / 2.47:1 (v1 2.76). Disabled controls are exempt, but this is slightly under v1.","Native, harness only: the Sign-in scene drawn with VIBE_SEED_VIBE forced shows v1's fixed sign-in ink ('Rack' white at 1.34, #8b929c at 2.34) on the cream ground. It cannot happen in the app, because resetVibe() runs on sign-out and on revoke.","CVD: warn #6e4d08 against bad #82180c is ΔE00 4.20 under deuteranopia (v1 24.61). Wherever they appear together they also carry words, W/F/D letters or arrows. Listed for Micah because it is well below v1.","Web: the Fuel day-nav 'next' chevron, disabled on today at .3, is 1.89. It is now drawn as a solid-cut fill instead of a stroke. It is inactive and exempt, under the same opacity rule as v1.","Status-pill halo rings: rgba(good, .15) at 1.24 (v1 1.3) and bad at 1.30 (v1 1.13). They are decorative; the pills' own fills are 5.74 / 7.51 against the page.","Collector artefacts, not defects: (1) find-mark 'ring' rows at 1.0 / 1.16 / 1.93. The inset 2px ink shadow covers the whole 12×3 mark, so it shows as ink at 13.26. (2) states-rs9 reports `.chip:active` on a chosen chip at 1.28. The later `.chip.on` rule at the same specificity wins, so it is really 13.99. (3) The existing :active rows for .set-row-nav, .coach-card, .coach-chip and .add-tile are read without their alpha; they are unchanged since ar1x.","The sheet backdrop (ink at .45 over cream) is 2.75 against the page (v1 1.1). It is a scrim and has no minimum.","The spec's open decision, as told: pYellow #8b6600 is 3.70 on the grain (3.92 flat). Apart from the must-fix stat value, it appears only as graphics and fills at 3:1 or better.","Not a contrast item, for the parity and copy reviewers: in v1, good and pGreen are the same #2aa85c, so v1's Steps charts draw a day short of the goal and a day at the goal in the same green. Iron Age now draws short days in pWhite, so they differ (ΔE00 28.4 / 14.2 / 18.2). It is a visible change from v1's look, made so that the footnote 'green = goal met' matches what the chart shows.","img/you.png (dropped from youHero in panel round 2), img/steps.png and img/weight.png still ship on both trees with PROVENANCE entries, but nothing reads them. This is for Phase F.","tools/vibe-contrast/cvd.mjs still prints the old .28 heat-strip model (1.11:1). The real post-remap numbers come from ia-rs9-heatcvd.mjs (warn .70 is 2.10:1 against collar) and from this round's ia-ar3-steps-rs10.mjs (pWhite .70 is 3.34 / 3.24)."],"fresh":false,"from":"V:iron-age:gate-contrast-rafter-revise-3-rs10"},{"key":"fit","gate":"fit (V59 §13.3) for iron-age, round reproof-rs10. Web: vibes/iron-age 57b0f1d, clean tree. Ran prove.mjs fit at 320 and 390 (installed-iPhone safe areas, harness fd610e2) with --compare against the v1 fit reference /Users/micahflunker/dev/vibes-night/proof/v-iron-age-fitgate-v1ref-rs9/fit.json. That reference is the same tree at 6a4c1b6 with no vibe, measured by the same harness; the only files changed since are vibes/defs/iron-age.js, vibes/defs/vocab.js, vibes/icons/iron-age.js and vibes/iron-age.css, so v1's path is unchanged. Web output: /Users/micahflunker/dev/vibes-night/proof/v-iron-age-fit-rs10/fit.json, with the log in /Users/micahflunker/dev/vibes-night/proof/v-iron-age-fit-rs10.out. Native: nat-v-iron-age aaf0664, the only untracked entry is the node_modules symlink, run under TZ=UTC. Native outputs: /Users/micahflunker/dev/vibes-night/proof/nat-iron-age-fit-rs10/ (verify-vibe-fit.txt, verify-text-color.txt, verify-coach-surface.txt).","pass":true,"must_fix":[],"numbers":"WEB, iron-age at 320 and 390: 130 scene×width captures, 0 errors.\n- Horizontal overflow: docOverflow [] and overflowEls 0, the same as v1.\n- Clipped text: 2, against v1's 19, and 0 new. Both are also in v1, both ellipsised: .adm-uid in admin-person-trial@320, and .mini-stat-v.num \"48.5k\" in vibe-reapply@320.\n- Small targets: 1576, against v1's 2616, and 0 new.\n- Against v1 there are 2281 new findings, and every one is a spill (text over a box with overflow visible, nothing hidden). 1081 of v1's findings are gone.\n- Watched boxes (1050: the Coach card, buttons, chips): content exceeds the box in 0.\n- Coach card: 190 on You (18 appearances at each width) and 164 .tight on Train (11 at each width), at 288 and 358 wide. Content is 286×188 inside a box of 286×188, and 286×162 inside 286×162, in every appearance, the same as v1.\n- No watched control's height dropped below 44 where v1's was 44 or more. The water buttons go from 46 to 44, still 44.\n\nNATIVE, all under TZ=UTC:\n- verify-vibe-fit: exit 0, 24 passed, 0 failed.\n  - A: 21 presets and loadNum at every size are inked; the 6 faces are registered, each with its file.\n  - B: the Coach card stays 190/164 at all 12 iOS text sizes. Iron Age measures no face of its own, so the card uses Archivo on v1's table, with v1's budgets at 24 of 24. The goal chips and the feel chips hold.\n  - C: button 41.2 against v1's 41.2, large button 51.4 against 51.4, chip 27.1 against 26.0, segment 35.1 against 28.0. The dock cell is 37.0 inside 64.\n  - D: 96 of 104 scenes are drawn in the vibe, every scene mounts with no new error, the words are identical (6347), and roles, labels and handlers are identical.\n  - E: the Vibes sheet, Setup, the tour, the error screen and the toast all pass.\n- verify-text-color: exit 0. 0 presets without a colour, 0 UNCOLOURED sites out of 563 Text sites, and 3 UNKNOWN.\n- verify-coach-surface: exit 0, 477 passed, 0 failed, including Z: without metrics, the card gives build 58's answers.","listed_not_fixed":["Web coach chips get narrower, though no shorter. In the Coach sheet's question chips (you-coach-sheet, settings-ask, coach-build, at 320 and 390), each chip stays 34 tall, v1's own sub-44 height, but loses about 8 to 13px of width. 'More' goes from 57.25 to 44.63, 'Legs' from 55.89 to 43.42 and 'Core' from 55.59 to 43.03, so two chips' widths fall under 44 where v1's were over. §2's rule is '44 or taller', and the chips' height is v1's, so this is not a hard failure. It was already present at the previous gate's commit (proof/v-iron-age-fit-rev1-rs9 has the same widths). The chips' container also gets shorter at 320 (160 to 118) because the chips now wrap onto fewer lines. Reproduce: node /Users/micahflunker/dev/vibes-night/tools/rs10-chips.mjs /Users/micahflunker/dev/vibes-night/proof/v-iron-age-fit-rs10/fit.json /Users/micahflunker/dev/vibes-night/proof/v-iron-age-fitgate-v1ref-rs9/fit.json coach-build@390 coach-chip","Web spills: 2333 in total (v1 has 76), all y-axis ink over a line box with overflow visible, none clipped. The largest: .load-num.num +10 (settings-targets@320 '2,200', box 30); .headline-v.num +9 (102 appearances); .you-greet +8; h1, .review-verdict, .ob-title, .auth-title and the .cal-hd header blocks +7; .you-sec-t and sheet h2 +4; .eyebrow, .chart-sub and .card-hd +3. Compared with the previous gate's run (v-iron-age-fit-rev1-rs9), the new spill findings are .cal-hd on stats-detail@390 +7 (66), h1 'Great workout.' on summary@390 +7 (2), .auth-title@390 +7 (2), .card-hd@390 +3 (272), and .card.meal-blank@390 +2 (24). All of these are spills; whether the ink touches a neighbour is for the screenshot and panel pass.","Web x-axis spill at 320 on Fuel: .vol-val.num '142/200' has content 44 in a 42px box, and its .vol-row 248 in 246 (48 appearances). The 2px runs into the card's padding. Nothing clips and the document does not overflow. v1 does not have this.","Web: the only 2 clipped texts (.adm-uid on admin-person-trial@320, and .mini-stat-v '48.5k' on vibe-reapply@320) are also in v1's reference. They are v1 behaviour.","Native C: at 320 on the default text size, Train's 'September 2026' in Besley_800 at 24 is 217.0pt against the 214 its header leaves, and Fuel's 'Wed, May 20' is 176.2 against 174. Both fit only because the header shrinks the text (minimumFontScale 0.5, about 98 to 99%). This is by design, and it is Micah's decision on shrinking versus wrapping.","Native verify-text-color: 3 UNKNOWN sites, src/ui/coach/sheets.jsx:657 {note(true)} and :702/:703 {note(false)}. They are already on native main (577/622/623 there), so this branch did not add them.","Native .cal-tick has no ring. That is v1 behaviour from before Iron Age, so the spec's 1pt ink edge shows on the web only. Listed per the brief.","Procedural: I made no worktree edits, no npm installs, and nothing was refused. I once piped `git ls-files` into `node` to filter a list of files, and used `cd` in one command; both were read-only. I added scratch scripts /Users/micahflunker/dev/vibes-night/tools/rs10-fitwatch.mjs, rs10-fitwatch2.mjs, rs10-chips.mjs and rs10-spilldiff.mjs. The harness lock was free, and the run released it when it finished."],"fresh":true,"from":"V:iron-age:gate-fit-rreproof-rs10"},{"key":"v1","gate":"v1 (§13.4 v1 still identical) for iron-age, round reproof-rs10. Web B = vibes/iron-age 57b0f1d, native = vibes/iron-age aaf0664. Neither worktree was edited.","pass":true,"must_fix":[],"numbers":"WEB PROOF, prove.mjs: A = web-base 928a65e, B = web-v-iron-age 57b0f1d, harness fd610e2. --expect-vibe 404,200 held. Both trees were clean with provenance clean. Every scene was compared at 390 and 320 (132/132 scene×width), with 0 errors.\n\nAbsent run (proof/v-iron-age-v1-absent-g4-rs10-t3; attempts 1 and 2 timed out waiting for the shared lock and produced no measurement):\n- Verdict DIFFERENT, exit 3.\n- style 9391, rect 310, text 43, attr 193, css 22. These equal main's own engine-v2 reference run ev2-v1-absent (B 2645c53 = main 58ac3be).\n- head 0, files 0, off-machine requests 0, reboot 0, svg 0, value 0.\n- struct 3926 (reference 158), state 114 (reference 26), keyframe 132 (reference 0).\n- pixel-different 1: peek@390, 11 px. Not forgiven 0. B's PNG 7ec1b5cb0d36 is one the base tree 928a65e produced in 30 earlier captures.\n\nData-vibe run (--data-vibe v1, proof/v-iron-age-v1-datavibe-g4-rs10):\n- Same totals as the absent run, with pixel-different 0.\n\nPer scene, in both runs, only settings-hub@390/320 and fixture@390/320 carry any style, rect, text, struct, attr or state difference. Every other scene differs only by 1 keyframe.\n\nCross-run, iron-age's B dumps against main's reference B dumps (264 pairs per run):\n- 130 app scenes differ from main only by one keyframe declaration, `@keyframes iron-age-set-flash`. It is declared and applied to nothing in v1.\n- The fixture, aligned wrap by wrap at both widths:\n  - All of main's 757 (390) and 758 (320) wraps are matched and identical. 0 exist only in main.\n  - The 539 extra wraps all carry data-vibe=\"iron-age\": they are the harness's coverage of iron-age.css.\n  - The page outside the fixture is 1650 elements against 1650, with 0 differing.\n  - The one other difference is a `<select>` at 22 → 18 px, which also appears A-against-A (harness noise).\n\nRealign against the base (s-web-realign):\n- settings-hub, both widths, both runs: the inserted subtree is exactly Look → Vibes (7 elements: \"Look\", \"Vibes\", \"v1\", \"›\"). After re-alignment, 1844 elements are identical, 12 moved only in y (by 93.5 px) and 0 differ in anything else.\n- fixture: besides the 23 new vibes-rule wraps (52 elements), everything is identical or moved only in y (513.078 px, 155 at 390 and 158 at 320). The single other element is the `<select>` noise.\n\nWEB SWITCH (tools/ia-v1gate-rs10-switch.mjs, run twice, PASS both times: proof/v-iron-age-v1gate-g4-rs10/web-switch-early and web-switch). Starting on a live session with a set edited, a set ticked, the rest timer running and Coach's sheet open, applyVibe('iron-age') and then applyVibe('v1'):\n- The stored session stays byte-identical.\n- The rest pill still shows 2:30 at 100%, and +30 still moves it from 2:30 to 3:00, so restEnd survived.\n- The sheet stays open, every input value is identical and the tab stays the same.\n- All 20 swipe Deletes are present.\n- Back on v1, the element tree is identical (1637 elements), all computed styles are identical (0 differ) and the rack:vibe hint is cleared.\n\nNATIVE (nat-v-iron-age aaf0664, TZ=UTC):\n- verify-vibe-v1: 7/7. 213 scenes, 25586 hosts, byte for byte against the 1cb6498 baseline plus only the committed Settings-hub overlay (c9b0928, 6 Sheet—Settings scenes). The baseline, rebaseline and rn-render.mjs are identical to native main's.\n- verify-theme-identity --require-build: 22/22.\n- verify-vibe-switch: 63/63. D2 for iron-age covers the session, sets, rest timer, food day, every word and every control. Back on v1 the session screen is byte for byte what it was.\n\nSUITES, UTC:\n- Web: syntax 53/53 and tools-check 58/58 (proof/v-iron-age-v1gate-g4-rs10/web-suite).\n- Native: 95/95 (proof/v-iron-age-v1gate-g4-rs10/nat-suite).\n\nOutputs are in /Users/micahflunker/dev/vibes-night/proof/v-iron-age-v1gate-g4-rs10/: analyse-absent.txt, analyse-datavibe.txt, the *-crossrun.txt files, analyse-prior-absent.txt, the nat-*.log files, web-switch*/ and the suites.","listed_not_fixed":["vibes/iron-age.css declares a global @keyframes iron-age-set-flash. It is one keyframeDiff in every scene (132 in total) and is applied to nothing in v1. It is inert, but it is the one thing iron-age adds to v1's page beyond main. The prefix is the vibe id, as vibes-scope allows.","In v1, B requests /vibes/iron-age.css, the iron-age def and icon modules, vibes-sheet.js and v1's def and icon modules. That is the engine's static link and imports. It also requests /vibes/iron-age/img/recap.png and textures/grain-manual@3x.png, but only B's fixture dumps name those, from the harness's forced data-vibe=\"iron-age\" wraps. No app scene's computed style differs from main's, so no v1 screen paints them. requestDiffs (off-machine) is 0.","On a real phone with a service worker, vibe.js prefetchVibes() fetches iron-age's picker thumb and its numeral face for every account, v1 included, 1.5 s after boot. This is engine behaviour by design, not a v1 visual change.","peek@390 has an 11 px pixel-only difference in the absent run. It was forgiven because B's PNG is one the base tree produced in 30 earlier captures. The data-vibe run has 0.","The fixture's <select> is 22 → 18 px in width. It shows up A-against-A across runs of the unchanged base tree, so it is harness noise.","Web switch, for information only: in iron-age, innerText differs from v1 by letter case (v1's uppercase text-transform is not applied, e.g. SYNCED → synced) and by 10 drawn glyphs (⋯ ✓ × ✕) that replace their characters. The whitespace-insensitive check, with each glyph read as its accessible name, passes, and every glyph is role img with its character as its label. A reviewer may want to confirm that the case change is a look decision in the spec and not a copy change.","Native branch-side verifier edits, compared with merge base dc05c3a. verify-vibe-v1.mjs widens the water ⋯ press finder with an OR for a drawn ⋯, which never matches in v1. vibe-snap.mjs adds an SVG Pattern stub. verify-vibe-switch.mjs adds D2 (real vibes) with unglyph for routed glyph characters. verify-units and verify-coach-surface raise their call-site counts. The diff against native main d2af836 also shows main's later verify-theme-build checks (T.chart, calTick) missing on this branch. That is main moving ahead, and the orchestrator reconciles it at merge.","Lock contention: the absent proof's attempts 1 and 2 each gave up after 45 minutes waiting for harness.lock, which other agents' runs held. They left partial dirs proof/v-iron-age-v1-absent-g4-rs10 and -t2 with no measurement. The measurement is -t3.","Scratch this gate created: tools/ia-g4-rs10-v1-runs.mjs (a copy of ia-reproof-rs10-v1-runs.mjs with new run names), tools/ia-g4-rs10-wait.mjs, and proof dirs v-iron-age-v1-absent-g4-rs10{,-t2,-t3}, v-iron-age-v1-datavibe-g4-rs10 and v-iron-age-v1gate-g4-rs10/. The dead reproof agent's finished runs on the same commits (v-iron-age-v1-*-reproof-rs10) gave identical totals and were used only as a cross-check. No installs and no refusals."],"fresh":true,"from":"V:iron-age:gate-v1-rreproof-rs10"},{"key":"parity","gate":"parity (V59 §13.5 native parity) for iron-age, round reproof-rs10. Web worktree /Users/micahflunker/dev/vibes-night/wt/web-v-iron-age at 57b0f1d, native worktree /Users/micahflunker/dev/vibes-night/wt/nat-v-iron-age at aaf0664.","pass":true,"must_fix":[],"numbers":"Native tools/verify-vibe-parity.mjs exits 0 with 30 passed and 0 failed. For v1, 30 of 30 blocks match. For iron-age, 30 of 30 blocks match under their named looks: card·ruled, youCard·ruled, screenHeader·masthead, statRow·runin, kpi·word, field·square, btn·inverse, chip·stamp, segmented·boxes, dock·rail, addTile·ruled, setRow·ruled, plateStrip·stamp, headline·rule, coachCard·ruled, calCell·ruled, sessionChrome·plate, sectionHeader·rule, settingsRow·ledger, sheetHost·full, youHero·banner, chart·print, toast·square, listRow·plain, setTable·ruled, fab·inverse, plus sheetTitle, note, eyebrow and the lead card. T matches the definition token for token: 44 colour roles, 28 tints, 9 radii and 20 type presets. The faces are Archivo 400/600/700/800 plus Besley 600/800, each with a file. The tagInk letter colours (W warn, F pRed, D pBlue), the calHead/calTarget rings (1pt #1c1712) and the chrome settings (statusBar dark, keyboard, blur and datePicker light) all match. The Coach card measures on v1's Archivo table, and the verifier's self-test canary fails as it should. The def and icon files are byte-identical across the two trees: defs/iron-age.js sha 60ab30bb96bf55c3, icons/iron-age.js 9681025274a5d443, index.js 9c7bd4b1f7af91ed and vocab.js 3a767ae6a28b7c05. verify-vibes-verbatim passes 24 checks. Web vibes-css.mjs passes 26 checks, so the generated block is current. Web vibes-contract.mjs and native verify-vibes-contract.mjs both exit 0 under UTC. I compared 30 roles between the web's generated block in vibes/iron-age.css and native build(). All 30 agree except tint.runway, and that one is by design. The roles checked: colors chalk, bar, rack, collar, accent, inverse, knockout, raised, warn and pYellow; tagInk W, F and D; inkOf pYellow and pChrome; radius r, plate and chip; shape rule.ink, rule.hair, rule.head [2,1.5,0.75], rule.sub[0] .75, keyline.ink, keyline.width, leader.ink and leader.dot; ring.calHead (web 0 0 0 1px #1c1712, native borderWidth 1 #1c1712); images.summaryHero.band 80; and chrome.shadow. Logs are in /Users/micahflunker/dev/vibes-night/proof/v-iron-age-parity-rs10/ (parity.txt, web-contract.txt, nat-contract.txt). The spot-check script is /Users/micahflunker/dev/vibes-night/tools/parity-spot-rs10.mjs.","listed_not_fixed":["tint.runway and runwayEdge are web-only by contract: index.js ROLES gives them no native var, and native draws no calorie runway. Web has rgba(230,222,201,.55) and native T.tint.runway is undefined. This is by design, not a parity failure.","Only one photo slot is left in the def: summaryHero, band 80 (plus thumb). The web block emits only --photo-band-summary-hero. The earlier brief named five band slots (youHero, summaryHero, fuelSummary, stepsToday, weightLog). The panel rounds cut these down, and that is consistent across both trees. The morning review should confirm this matches the spec's intended slot list.","--font-italic is Archivo in the web block. The def comment says the Besley italic went with the second AI-made panel, and its woff2 is still in vibes/iron-age/fonts unused. Native registers no italic face. The trees agree.","Native .cal-tick has no ring. This is pre-existing v1 behaviour and was already listed in the brief (item 6). The web draws --shadow-cal-tick 0 0 0 1px #1c1712.","Process note: I captured the verifier output with shell redirects (>) into ~/dev/vibes-night/proof/v-iron-age-parity-rs10/, and once piped output into node for filtering. Nothing was refused. No installs, no worktree edits, no commits."],"fresh":true,"from":"V:iron-age:gate-parity-rreproof-rs10"},{"key":"provenance","gate":"provenance (§13.7) for iron-age, round 1-rs9","pass":true,"must_fix":[],"numbers":"I checked web vibes/iron-age at 6a4c1b6 and native assets/vibes/iron-age plus assets/fonts/Besley at 45edfa7. Nothing is rejected, so no image has to come out of either tree.\n\nMIRRORS: the web and native copies are byte-identical for PROVENANCE.json, icons/PROVENANCE.json, FONTS.json, TEXTURES.json, OFL.txt, defs/iron-age.js and icons/iron-age.js (7 of 7).\n\nPHOTOS (5 files: you, recap, steps, weight, pick): the shipped sha256 matches the record in both trees (10 of 10). I downloaded each original again from its source:\n- Sargent leaf 0205 matches (e532ac53…).\n- Anderson _0100 matches (20f49dde…).\n- The LoC master TIFF 4a15039u.tif matches (84830ed7…, 20.8 MB).\n\nSource pages, opened with WebFetch:\n- IA healthstrengthpo1904sarg: creator \"Sargent, Dudley Allen, 1849-1924\", date 1904, publisher H. M. Caldwell. No rights field. The photographer is not named. Passes both tests on either reading.\n- IA andersonsphysica00andeiala: \"Anderson, William Gilbert, 1860-1947\", 1897, NOT_IN_COPYRIGHT, copyright-evidence \"visible notice of copyright; stated date is 1897\". Anderson died in 1947, before 1956.\n- LoC item 2016804446 (?fo=json): Detroit Publishing Co., publisher; dated [between 1890 and 1901], \"Title and date from Detroit, Catalogue J (1901)\". Rights: \"No known restrictions on publication.\" A glass negative, not described as coloured or restored.\n\nClothing (§14): I looked at the full source plates, not only the crops.\n- Sargent Figs. 21/22: knitted tights to the ankle, a belt, shoes, bare torso. Passes.\n- Anderson: loose trunks, bare torso, shoes. Passes.\n- Naval gym: no people. I looked at the steps, weight and pick crops: no people.\n- There is no nudity, drape or statue pose, and no lettering or trademark in any crop.\n- All the originals are raw IA or LoC scans, not colourised or restored versions.\n\nICONS (10 entries, 9 unique originals): the traced-crop sha256 matches for 10 of 10. All 9 originals, downloaded again, match their recorded original_sha256 (9 of 9). IA metadata I opened:\n- Spalding: date \"ncd\", LoC \"unaware of any copyright restrictions\". The full text carries testimonials dated July 1891.\n- Sears No. 112: dated \"190-\", Winterthur.\n- Fairbanks: 1919, LoC unaware of restrictions.\n- Polhemus: 1895, Getty.\n- Dio Lewis: 1866, \"Lewis, Dio, 1823-1886\", Public Domain Mark.\n\nEvery one is before 1931, and each engraver or photographer is anonymous or a corporation. All crops are objects only.\n\nFONTS: all 6 shipped files match FONTS.json (3 web woff2 at 44,296 + 42,772 + 5,896 = 92,964 B, under 120 KB; 3 native static TTFs, 234,080 B, 3 of the 4 allowed). OFL.txt matches the upstream file I downloaded again at commit 99d5b97 (9276de39…). It is the SIL OFL 1.1 text, and its header is \"Copyright 2022 The Besley Project Authors\" with no Reserved Font Name. Supporting evidence:\n- google/fonts METADATA.pb (4246965c…) says license \"OFL\", repo indestructible-type/Besley.\n- Besley-SemiBold.ttf downloaded again matches its recorded source sha (3e9ef08c…).\n- The native TTF name tables carry the OFL 1.1 licence string, Version 4.000.\n\nTEXTURES (10 PNGs): the hashes match TEXTURES.json in both trees. They are generated by a seeded script and come from no source image, so no provenance test applies.\n\nScratch output is in /Users/micahflunker/dev/vibes-night/proof/prov-rs9/ (downloads again plus viewing PNGs). Two check scripts: /Users/micahflunker/dev/vibes-night/tools/prov-check-rs9.mjs and /Users/micahflunker/dev/vibes-night/tools/prov-refetch-rs9.mjs. There were no refusals, no installs, and I edited nothing in either worktree.","listed_not_fixed":["Spalding gymnasium catalogue (icons.workout, ornaments.you, ornaments.workout) is undated on IA ('ncd'). I confirmed it was published before 1931 from the dated July 1891 testimonials in its own text, and from the LoC 'from old catalog' record. It is not a printed imprint date.","Sears Catalogue No. 112 (fork, tumbler, insole, vessel, exerciser) is dated only '190-' on IA, which is still clearly before 1931. IA has no rights field on it, or on the Sargent and Polhemus items. For those three, the public-domain case rests on the publication date and the anonymous or corporate creator, not on a rights statement.","Naval-gym plate (steps, weight, pick): the LoC object is a glass negative. It counts as published in 1901 because it was offered in Detroit Publishing's Catalogue J (1901), per the LoC notes. The LoC rights advisory 'No known restrictions on publication' is on file, and §14 names that marking as an allowed source.","Several icons are hand-drawn to the proportions of period cuts and carry no PROVENANCE entry: camera, pen, book and calendar (Sears No. 112), lock (Mallory, Wheeler 1871) and ornaments.recap (Ravenstein and Hulley 1867). No pixels were traced, and every named source is from before 1931. The module's sources map says which ones these are.","The same naval-gym plate appears three times (Steps, Weight and the Vibes card). This is because the Anderson woman plate failed the face rule and weightLog fell back to the naval gym. It is a design matter already in the log's decisions left to Micah, not a provenance failure.","micah_approved is false on every entry, as §14 requires. Micah has not yet approved any of these images."],"fresh":true}]}, args || {})
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
