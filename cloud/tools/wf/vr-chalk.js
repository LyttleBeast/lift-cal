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
const V = Object.assign({"id":"chalk","name":"Chalk","kind":"simple","spec":"/Users/micahflunker/dev/vibes-night/design/chalk.md","def":"/Users/micahflunker/dev/vibes-night/wt/web-design/vibes/defs/chalk.js","icons":null,"registry":{"id":"chalk","name":"Chalk","feel":"Chalk-white page, dark ink.","experimental":false,"scheme":"light"},"fonts_or_images":true,"notes":"===== CHALK: WHAT ENGINE v2 LEFT TO THIS VIBE (main now has engine v2: web 58ac3be, native dc05c3a) =====\n1. The definition was written BEFORE engine v2's roles. Update it in the web tree (then copy byte for byte to native): tagInk (Chalk's tint.tagW.color is 'raised', the badge ground, so the W/F/D LETTERS need their own tagInk per the spec's ask 3), colors.band #111416 (ask 1), shadow.calHead / calTarget = chalk at .9 as a 1px ring (ask 2), face.bands for the Condensed cut (ask 6, native build() reads it), tint.runway/runwayEdge in knurl (ask 5), and a `shape` object (may be {}). index.js valueOf() fills anything left out. Run tools-check/vibes-contract.mjs with chalk registered.\n2. SPARK: icons 'v1' would hand Chalk v1's four-point sparkle at the estimator notices (never-do #29). Write vibes/icons/chalk.js holding ONLY spark as the spec's two-wave ≈ mark (same shape family as Navy's/Oxblood's neutral mark), set the def's icons to 'chalk', register the set in vibe.js and native (icon() falls back to v1 for everything else). Pure module, imports nothing, copied byte for byte to native and pinned.\n3. The Coach card draws in Sofia Sans through its own advance table: regenerate it from the SHIPPED native TTFs with tools/lib/ttf-advance.mjs (the spec's draft is design/chalk/final/coach-face-sofia.json), carry it in vibe.js VIBE_DEFS (assets.fit) on native and the matching metrics on web, and prove verify-coach-surface (and the web coach-surface check) pass IN THIS VIBE at every iOS text size, 190/164 unchanged.\n4. addTile·flat: draw it on both clients (lit tiles' icon well and tag on `raised`; web: a scoped rule in vibes/chalk.css over .add-tile.lit; native: the 'flat' case at the AddTile switch).\n5. The spec's Q checks: Train h1 'September 2026' at 320 (fall back to h1 28 if it clips), Fuel h1, the dock label's natural line in the 64pt dock, 44pt buttons/chips/segmented heights.\n6. Light vibe: web keeps the dark top band (colors.band); native StatusBar dark, keyboards and date pickers light.\n7. The spec's decisions left to Micah (a light vibe at all, mulberry on a phone, ochre naming, native weights) — follow the spec, list them.\n===== RESUMING (session 2) =====\nThe assets and both builds are DONE (web 5c59366, native 0732de4). This run starts at the gates: provenance and fit passed and parity failed in the earlier run on these same commits (carried as round 1); contrast and v1 run now. All reports from the earlier run: /Users/micahflunker/dev/vibes-night/tmp/resume9/chalk-journal-results.json.","mainWeb":"58ac3be","mainNat":"dc05c3a","skip":["assets","build"],"runSuffix":"-rs9","priorAssetsFile":"/Users/micahflunker/dev/vibes-night/tmp/resume9/chalk-journal-results.json","priorBuildsFile":"/Users/micahflunker/dev/vibes-night/tmp/resume9/chalk-journal-results.json","priorGates":[{"key":"provenance","gate":"provenance (§13.7), chalk, round 1","pass":true,"must_fix":[],"numbers":"IMAGES: none to check. There are 0 image files and 0 PROVENANCE.json entries in either tree. On web (vibes/chalk/**, vibes/images/chalk) the vibe's folders hold only FONTS.json, OFL.txt and 3 woff2 files. On native, assets/vibes/chalk holds only FONTS.json, and assets/images/vibes/chalk does not exist. Both copies of defs/chalk.js say `images: {}` (\"photos are Iron Age's alone\"), native vibe.js registers chalk with `images: {}`, and chalk.css has no url() apart from its 3 font src lines. This matches spec design/chalk.md §9: \"No photos… all seven hero slots stay empty and close up\". Nothing was rejected, and no slot needs emptying.\n\nFONTS: all pass.\n- OFL.txt copies: I fetched the upstream google/fonts ofl/sofiasans/OFL.txt and ofl/sofiasanscondensed/OFL.txt tonight through tools/fetch.mjs. Both are 4393 B with sha256 3e824d50…42d1 and byte-identical. The web copy vibes/chalk/fonts/OFL.txt and the native assets/fonts/SofiaSans/OFL.txt and assets/fonts/SofiaSansCondensed/OFL.txt each match that sha256 exactly. Each reads \"SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007\", and its only copyright line is \"Copyright 2019 The Sofia Sans Project Authors (https://github.com/lettersoup/Sofia-Sans)\". None declares a Reserved Font Name, which I confirmed again from the upstream source page github.com/lettersoup/Sofia-Sans/blob/master/OFL.txt (WebFetch). That means subsetting while keeping the family name is allowed.\n- METADATA.pb, fetched tonight: both families say license: \"OFL\" and source commit 185877d082cebb40facd65143326147431863688. The METADATA sha256s (980ff427…, ed33bcaa…) match FONTS.json.\n- FONTS.json is byte-identical in both trees.\n- Shipped file sha256 and bytes all match FONTS.json:\n  - web SofiaSans-latin.woff2: 52,508 B\n  - web SofiaSansCondensed-latin.woff2: 53,416 B\n  - web SofiaSansCondensed-digits.woff2: 6,972 B\n  - native SofiaSans_400.ttf: 42,968 B\n  - native SofiaSans_600.ttf: 43,004 B\n  - native SofiaSans_800.ttf: 43,012 B\n  - native SofiaSansCondensed_800.ttf: 42,996 B\n  - Native total is 171,980 B across 4 TTFs, which is within the 4-TTF limit. Web is at most 53.4 KB per family, against 120 KB.\n- Every font's name table carries the same copyright line and Version 4.101.\n\nScript: /Users/micahflunker/dev/vibes-night/tools/gates/chalk-prov-r1.mjs. Fetched evidence: /Users/micahflunker/dev/vibes-night/gates/chalk-prov-r1/. No refusals, no installs, and I edited no worktree.","listed_not_fixed":["Neither tree has a PROVENANCE.json for chalk. Chalk ships no images, so there is nothing for it to record. §14 says one per vibe folder; if Micah wants a placeholder file ({\"images\": []}) for symmetry, that is his call, not a provenance failure.","The subset fonts' name tables have no licence fields (nameID 13 and 14 are empty); harfbuzz subset-font keeps only the default name IDs. OFL condition 2 is still met, because OFL.txt ships as a standalone file beside the fonts in both trees.","Web ships one OFL.txt covering both families under vibes/chalk/fonts/, where native ships one per family folder. The files are byte-identical upstream, so both layouts are valid.","The native TTFs come from Google's css2 or gstatic static instances of the same v4.101, not from the google/fonts repo. The spec records this as its own decision 12. The licence is the same either way, confirmed through METADATA.pb and OFL.txt."]},{"key":"fit","gate":"fit (§13.3) — chalk, round 1 (web 5c59366 on vibes/chalk, native 0732de4 on vibes/chalk)","pass":true,"must_fix":[],"numbers":"Scope: the fit gate only. Nothing in either worktree was edited.\n\nWEB. I ran `prove.mjs fit --repo wt/web-v-chalk --run v-chalk-fit-gate1 --vibe chalk --compare proof/v-chalk-fit-v1ref/fit.json` on HEAD 5c59366. It finished in about 3 min. The harness answered 200 for /vibe.js.\n- Totals: 130 scene×width (320 and 390), 0 errors, docOverflow [] (none), overflow elements 0, clipped 19, spills 1193, small targets 2544.\n- v1 reference (928a65e): 130 scenes, 0 errors, overflow 0, clipped 19, spills 76, small targets 2544 → 2614 in v1. So Chalk has 70 fewer small targets than v1.\n- I analysed the results with tools/fit-gate-chalk.mjs and tools/fit-gate-coach.mjs.\n- New horizontal overflow: 0. New clipped text: 0. Clipped text that got worse than v1: 0.\n- The 19 clipped are the same ones v1 has. 18 are `.mini-stat-v \"48.5k\"` (ellipsis, 36×14 box, in both). 1 is `.adm-uid` on admin-person-trial (ellipsis, in both).\n- Coach card: every scene at both widths is 288/358 × 190 on You and × 164 on Train (tight). Its box and content are 286×188 and 286×162 (356 at 390), exactly v1's. Nothing inside it is clipped or spills.\n- 10 new small targets, all in classes v1 already draws small, and none shorter than v1's own:\n  - `.ex-item` at 40px: these library names wrapped to two lines in v1 and now fit on one. v1's one-line `.ex-item` rows are 38px.\n  - `.set-row-nav \"Add to Home Screen\"` at 43px, the same as v1's other hub rows.\n  - `.linkish \"Sign out and erase…\"` at 24px, where v1 draws it at 22px. It shows as new only because its DOM path moved when Look → Vibes was added.\n- Buttons and chips only got taller than v1:\n  - btn-lg 49 → 52\n  - btn 46 → 47\n  - chip 26 → 29\n  - coach-chip 34 → 36\n\nNATIVE (nat-v-chalk).\n- `TZ=UTC node tools/verify-vibe-fit.mjs`: 25 passed, 0 failed.\n  - A: all 21 presets and every loadNum size (26–40) carry Chalk's own inks, and each of its 4 faces has its TTF.\n  - B: the Coach table matches the shipped SofiaSans_600/400 advance widths for all 106 CARD_FACE characters. Both cards are 190 / 164 at all 12 iOS text sizes, and the line budgets equal v1's at 24 of 24. The goal chips never break a word where v1's don't. The feel chips each hold their label at ≥44.\n  - C: button 44.0 (v1 41.2), large button 54.4 (v1 51.4), chip 28.4 (v1 26.0), segment 31.6 (v1 28.0). The dock cell is 38.2 in the 64pt bar. \"September 2026\" is 180.8pt in the 214pt Train header leaves at 320. Fuel's widest date, \"Wed, May 20\", is 138.1pt of 174.\n  - D: 94 of 104 seeded scenes are drawn in Chalk, and the other 10 are the boot and signed-out screens, which stay v1. No new errors. All 6918 words match v1 in order, with the Vibes row naming Chalk the one difference. Every control is present, and nothing is left uninked.\n  - E: the Vibes sheet, Setup, the tour, the error screen and a toast all mount inked.\n- verify-text-color: exit 0. UNCOLOURED none. The 3 UNKNOWN are pre-existing, at src/ui/coach/sheets.jsx:575/620/621.\n- verify-coach-surface: 477 passed, 0 failed (exit 0).\n- I checked the fonts' vertical metrics myself (tools/fit-gate-hhea.mjs). All 4 shipped TTFs are hhea 900/-300 on 1000 = 1.2. That matches the definition's face.minLh 1.2 and the band's minLh 1.2. The Coach slots 11/14, 15/18, 14/19 and 12/17 all clear 1.2×size.","listed_not_fixed":["Web spills (visible, not clipped): 1117 new y-axis spills of 2–4px, all on figures set at line-height 1 or a fixed line whose Sofia content area (1.2em) is taller than the line box. Counts: .stat-val 636, span 136, .kpi-val 119, .headline-v 102, .headline 68, .pr-val 50, .load-num 6. Overflow is visible, so nothing is cut off, and the digits' ink sits inside the box. Worth one glance at you@320's headline in the gallery.","Web layout drift on a simple vibe: buttons and chips are 1–3px taller than v1 (btn-lg 49→52, btn 46→47, chip and chip-row 26→29, coach-chip 34→36), so rows below them move. Coach sheet .coach-chips wrap in fewer rows (160→124). Nothing got shorter and nothing fell under 44. This is for the review round to judge against §2 SAME LAYOUT.","vibes/chalk.css:311 `.stat:first-child { padding-left: 0 }` and :280 `.vol-val { width: auto; min-width: 42px }` move geometry v1 doesn't. The fit harness finds nothing wrong with either. The review round should judge them against §2.","My fit reference is the base tree 928a65e, not a v1 run of this same tree, so paths after the Look → Vibes section shift. That is why the Settings hub's .linkish (24px here, 22px in v1) and .set-row-nav (43, the same as v1) show up as 'new' small targets. The orchestrator may want a same-tree v1 fit (`--vibe v1`) as the reference for later rounds.","Native verify-coach-surface runs in v1 only; it has no vibe mode. Chalk's Coach-card fit is proven by verify-vibe-fit B, which the builder wrote. I re-checked its font metrics independently (hhea) but did not audit the rest of its logic line by line.","Web has no iOS Dynamic Type sweep: the harness measures the default text size only. Native covers all 12 sizes.","Scratch analysis scripts I added (outside both worktrees): ~/dev/vibes-night/tools/fit-gate-chalk.mjs, fit-gate-small.mjs, fit-gate-coach.mjs, fit-gate-hhea.mjs. Run output: ~/dev/vibes-night/proof/v-chalk-fit-gate1/fit.json. No refusals and no installs."]},{"key":"parity","gate":"parity (V59 §13.5) — chalk, round 1","pass":false,"must_fix":[{"title":"field · square is not drawn at native's in-card inputs, though their web twins take it (border collar and radius.sm on native, knurl and radius.plate on web)","tree":"native","where":"Nine TextInputs in /Users/micahflunker/dev/vibes-night/wt/nat-v-chalk: src/ui/food/common.jsx:137 (Stepper, the .qty-row twin) and :527 (My foods search); app/(app)/(tabs)/food.jsx:1162 (amount) and :1324 (history search); app/(app)/(tabs)/weight.jsx:173 (the Weight log input); src/ui/steps/sheets.jsx:113 and :188; src/ui/train/stats.jsx:362 (exercise search). None of them has a variantOf('field') switch; only Field.jsx, TextBox and picker.jsx Search have one. The web applies the look to .qty-row input and .picker-search input (vocab.js field.web lists them; vibes/chalk.css:324-329) at food.js, weight.js, steps.js, water.js, settings.js, stats.js, admin.js and picker.js. The fix is a 'square' branch at each site (knurl edge, radius.plate, focus as v1), or a shared in-card input used by all of them. tools/verify-vibe-parity.mjs's field probe draws only Field, so it should also draw one in-card input.","reproduction":"Wear Chalk. On the web, the Weight tab's log input has a #767c80 edge and 2px corners. On native, weight.jsx:189-190 draws borderColor T.colors.collar (#cdd3d4) and borderRadius T.radius.sm (4). All the sites listed are the same. chalk.js says collar is 'Decorative only: never the only edge of a control (R2.2)', and on native it is these controls' only edge. Code read in both trees: web rack.css:862-864 and 755-757 with chalk.css:324-329, against the native sources listed."},{"title":"Field labels are tracked on native (1.4 to 1.6pt) but at 0 on the web; Chalk's fieldLbl has ls 0 and is sentence case","tree":"native","where":"src/ui/Field.jsx:40 (Chalk's own 'square' branch) and :75 add letterSpacing 0.14*10 on top of T.text.fieldLbl. src/ui/coach/goal.jsx:124, 226 and 252, src/ui/onboarding/Setup.jsx:397, and src/ui/settings/index.jsx:148, 171, 532 and 560 add letterSpacing 1.6. Their web twins are '.field label' elements (coach-ui.js:1000, settings.js:65/141/163/188, onboarding.js:314), which vibes/chalk.css:222-226 sets to letter-spacing 0. To fix without touching v1: in the square branch use the preset's own tracking, and at the shared sites apply the literal only while the preset is caps (T.text.fieldLbl.textTransform === 'uppercase'), which keeps v1 byte-identical. The parity verifier's field probe skips letterSpacing for the label, which hides this.","reproduction":"Run TZ=America/New_York node /Users/micahflunker/dev/vibes-night/tools/parity-chalk-field.mjs (it mounts native Field under Chalk). It prints: Field label style {\"fontFamily\":\"SofiaSans_600\",\"fontSize\":13,\"letterSpacing\":1.4000000000000001,\"color\":\"#3b4045\"}. chalk.js type.fieldLbl is { size 13, wght 600, ls 0, upper 0 }, and the web draws letter-spacing 0. The result is sentence-case labels letter-spaced on the phone only."},{"title":"card · flat misses the onboarding and tour card on native: T.cardSkin() keeps the collar edge, while web .ob-card goes to bar","tree":"native","where":"src/ui/onboarding/Setup.jsx:230 and src/ui/onboarding/TourOverlay.jsx:76 spread T.cardSkin(). theme.js:947-951 always gives borderColor C.collar and does not look at variantOf('card'). The web's vibes/chalk.css:288 puts .ob-card into card · flat, and its comment says '(native cardSkin)'. Either give these two sites the flat edge under card · flat (borderColor T.colors.bar), or drop .ob-card from the web rule. The two clients must agree either way.","reproduction":"parity-chalk-field.mjs prints T.cardSkin() under Chalk as {\"backgroundColor\":\"#f8fafa\",\"borderWidth\":1,\"borderColor\":\"#cdd3d4\",\"borderRadius\":6}. The web's .ob-card under Chalk has border-color var(--bar) (#f8fafa). Replay the tour in Chalk: the web card has no edge, the native card has a grey #cdd3d4 edge."}],"numbers":"Native tools/verify-vibe-parity.mjs (UTC; it re-pins itself to America/New_York): 30 passed, 0 failed, exit 0. Chalk's 20 probes are all green (card, youCard, coachCard, addTile and sessionChrome · flat, statRow · line, kpi · plain, field · square, calCell · open, dock · solid, and v1 for the rest), plus T token for token: 44 colour roles, 30 tints, 9 radii, 19 presets, 4 faces, tagInk, rings, chrome, and a Coach table of 106 characters. Native verify-vibes-verbatim: 24/24, with chalk.js and icons/chalk.js pinned. Git blob hashes of chalk.js, index.js, vocab.js, icons/chalk.js and v1.js match across the two worktrees. Web tools-check vibes-css, vibes-contract and vibes-scope: exit 0 (the generated block is current). Spot-check of the web block and hand rules against native build() (/Users/micahflunker/dev/vibes-night/tools/parity-chalk-spot.mjs): 20 of 20 value roles agree. They are colors.accent, bar, collar, knurl, inverse and steel; tagInk.W and F; tint.setDone .12, backdrop .4, dropRail .7 and runway; shadow.calHead against T.ring.calHead (1px, rgba(17,20,22,.9)); and radius r 6, sm 4, plate 2, chip 3, tile 6, idx 4 and mark 3. Eight presets checked by hand also agree: eyebrow, h1 (the Condensed cut at 30), dockLbl, statLbl, segBtn, btnLg, chip, and the Coach fit (title and goT 11/14, goX 15). The gaps are the three sites above, where native never reaches the look or preset: they are not wrong values in the definition or in T.","listed_not_fixed":["statRow · line differs in layout: on the web the first column's padding-left is 0 (chalk.css:311) and .stat-row's 8px grid gap stays, so the rule sits 8px after column 1. Native (Stat.jsx line) insets every cell 10pt with no gap. Colours and borders agree; the first figure sits about 10px further left on the web.","Button weight: the web draws btn and other wght-700 sites as a true variable 700, while native snaps 700 to SofiaSans_800 (face.snap). This is documented in chalk.js and is the spec's 'native weights' decision left to Micah.","The PR card: the web keeps .pr-card's accent .4 edge and wash (chalk.css:288 excludes it), while native's recap PR card (summary.jsx:280) is a plain <Card> and so draws flat. v1 already has this web/native difference; Chalk carries it.","MiniStats: the web .mini-stats is a 2-column grid and native is one row. This is v1's layout on both clients; line keeps it.","Coach goX: web .coach-go-x is 15px at line-height 1 and native's fit table is 15/18. Each keeps its own v1 relation (v1 is 16px/1 on the web and 16/18 native); the fit checks own this.","The contract asymmetry behind must-fix 1: vocab.js field.native lists only Field, TextBox and picker Search, while field.web lists the in-card inputs. vocab.js is pinned and unchanged, so this is a note for whoever next edits the contract.","No worktree was edited. Two read-only probe scripts were written: /Users/micahflunker/dev/vibes-night/tools/parity-chalk-spot.mjs and /Users/micahflunker/dev/vibes-night/tools/parity-chalk-field.mjs. No installs, and no refusals."]}],"gateNotes":"RESUMING NOTE: an earlier run's gate agents died at a usage limit. The builds are DONE and committed (web 5c59366 \"Vibe: Chalk\", native 0732de4 \"vibe: Chalk (V59 §10)\"); every agent report from that run (fonts, both builds, the finished provenance/fit/parity gates) is in /Users/micahflunker/dev/vibes-night/tmp/resume9/chalk-journal-results.json. Partial output of the dead contrast and v1 gates may sit in /Users/micahflunker/dev/vibes-night/proof/vc-chalk-r1 and proof/v-chalk-v1-* — use it only as a hint; measure afresh under the \"-rs9\" names.","reviewNotes":"The fit gate (in /Users/micahflunker/dev/vibes-night/tmp/resume9/chalk-journal-results.json) listed, for you to judge against §2 SAME LAYOUT: buttons and chips 1–3px taller than v1 (btn-lg 49→52, btn 46→47, chip 26→29, coach-chip 34→36) so rows below move; Coach sheet chips wrap into fewer rows; vibes/chalk.css ~:311 `.stat:first-child { padding-left: 0 }` and ~:280 `.vol-val { width: auto; min-width: 42px }` move geometry v1 does not; 1117 y-spills of 2–4px from Sofia's taller content area. Decide which of these break SAME LAYOUT (must-fix: make Chalk hold v1's box heights/positions, e.g. by line-height/padding compensation in chalk.css) and which are a face's honest metrics (listed)."}, args || {})
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
let fixSeq = 0
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

const nJudges = V.kind === 'simple' ? 1 : 3
const judge = async (round) => {
  const shot = `${NIGHT}/proof/v-${V.id}/judge${RS}-r${round}`
  return (await parallel(Array.from({ length: nJudges }, (_, k) => () => agent(`${PREAMBLE}
===== YOUR JOB: "did an AI make this?" judge ${k + 1} of ${nJudges}, round ${round} (V59 §13.6) =====
Be adversarial: answer "AI-made" if unsure. ${k === 0 ? `First take the screenshots: \`node ${HARNESS} shoot --repo ${WEB} --out ${shot} --vibe ${V.id}\` (it holds ${NIGHT}/harness.lock; if another agent holds it, wait) — You, Train calendar, live session with a drop set, summary, Fuel day, the add-food sheet, the Coach sheet, Weight, Steps, the Settings hub, the Vibes sheet, sign-in, at 390.` : `The screenshots are (or will shortly be) in ${shot} — wait for them (poll with Read on the directory listing via a node one-liner), do not take your own.`} Read every PNG. Look for the tells in ${NIGHT}/research/01-ai-tells.md (the one-accent-on-graphite look, uniform rounded 1px-bordered cards, tiny tracked-caps eyebrows, rows of three stat tiles, icon-in-a-circle, pills everywhere, gradients/glass, generic icons, sparkles, hero-number + small caption, the same spacing everywhere, the cream-and-clay/hairline "escape" looks). ${V.kind === 'simple' ? 'This is a SIMPLE vibe: the layout is v1\'s by definition, so judge palette and type only.' : ''} Verdict: "human-designed" or "AI-made", with the tells you saw and the concrete fixes that would remove them. You have not seen the design docs; judge only what you see.`,
    { label: `V:${V.id}:judge${k + 1}-r${round}`, phase: 'Judge', schema: JUDGE_SCHEMA_V, ...HIGH })))).filter(Boolean)
}

const reviewRounds = V.kind === 'simple' ? 1 : IRON ? 3 : 2
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
prior.forEach(g => { lastRun[g.key] = 0 })
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

// AI-made panel
phase('Judge')
let verdicts = await judge(`1${RS}`)
const judgeHistory = [verdicts]
const human = vs => vs.filter(v => v.verdict === 'human-designed').length
if (V.kind !== 'simple') {
  for (let r = 1; r <= 3 && human(verdicts) < 2; r++) {
    log(`${V.id}: AI panel ${human(verdicts)}/${nJudges} human-designed — revise round ${r}`)
    phase('Fix')
    const f = await agent(`${PREAMBLE}${PLAN}${CONTEXT}
===== YOUR JOB: revise ${V.id} after the AI-made panel, round ${r} =====
${RESUMING}
The judges (adversarial, "AI-made if unsure") said: ${JSON.stringify(verdicts)}. Change the vibe's look (its CSS, its native variant cases, its definition's values within the hard rules — contrast, CVD, fit, 44pt, same words and numbers, the layout rule) to remove the tells they named. Keep web and native in step (definition byte-identical; re-copy + re-pin). Keep v1 byte-identical. Re-run the suites in UTC and re-shoot to check. ${COMMIT_NOTE}`,
      { label: `V:${V.id}:revise-r${r}`, phase: 'Fix', schema: BUILD_SCHEMA, ...HIGH })
    if (!f) break
    fixSeq++
    const g2 = await runGates(`after-revise-${r}${RS}`, ['contrast', 'fit', 'v1'])
    gateHistory.push(g2)
    verdicts = await judge(`${r + 1}${RS}`)
    judgeHistory.push(verdicts)
  }
}
const aiPass = V.kind === 'simple' ? true : human(verdicts) >= 2

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
  gatesPass, aiPass, reviewPass, reviewFixedAfterLast,
  ai: judgeHistory.map(vs => vs.map(v => ({ verdict: v.verdict, confidence: v.confidence, tells: v.tells, fixes: v.fixes }))),
  gates: gateHistory.map(gs => gs.map(g => ({ key: g.key, gate: g.gate, pass: g.pass, numbers: g.numbers, must_fix: g.must_fix, listed: g.listed_not_fixed }))),
  reviews: reviewHistory.map(r => r && { pass: r.pass, must_fix: r.must_fix, listed: r.listed_not_fixed }),
  commitReady: gatesPass && aiPass && reviewPass,
}
