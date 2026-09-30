export const meta = {
  name: 'v59-research',
  description: 'V59 Phase R: ten research tracks (Iron Age sourcing split in two), synthesis, completeness critic, one gap-fill round',
  phases: [
    { title: 'Tracks', detail: '11 parallel research agents, one file each under ~/dev/vibes-night/research/' },
    { title: 'Synthesis', detail: 'research/SYNTHESIS.md' },
    { title: 'Critic', detail: 'what was not researched, which claims are unsourced' },
    { title: 'Fill', detail: 'fill the gaps once, then update the synthesis' },
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

const RES = '/Users/micahflunker/dev/vibes-night/research'
const TRACK_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string', description: 'absolute path of the file you wrote' },
    summary: { type: 'string', description: 'under 120 words' },
    top: { type: 'array', items: { type: 'string' }, description: 'up to 8 concrete, usable findings' },
    sources_opened: { type: 'number' },
    gaps: { type: 'array', items: { type: 'string' }, description: 'what you could not establish' },
    installs_or_refusals: { type: 'array', items: { type: 'string' } },
  },
  required: ['file', 'summary', 'top', 'sources_opened', 'gaps', 'installs_or_refusals'],
}

const COMMON = `
YOUR PHASE: V59 Phase R (research). Read VIBES-PROMPT.md §4 (lines 408-516) and §14 (lines 1179-1247) first. Write ONLY your own file(s) under ${RES}/ (mkdir -p is allowed there). Research deep and parallel; use WebSearch and WebFetch generously. Every file ends with a "## Sources" list of every URL you actually opened (not search results). Output concrete, usable material — values, rules, do/don't lists with examples, tables — not essays. Mark any claim you could not source as "(unsourced)". Rack's context: dark graphite UI today (v1: page #14161a, card #1c1f26, text #f2f0eb/#8d939f/#5c6270, plate colours red #d6252b, blue #2e7fd9, yellow #f0be1e (also the accent), green #2aa85c, white #e8e5de, chrome #a8aeb8), font Archivo (variable, wdth 62–125, wght 300–900; native uses static Archivo 400/600/700/800). A screenshot of today's You tab at 390px is at /Users/micahflunker/dev/vibes-night/proof/smoke/smoke-you-390.png (very tall; Read it to see v1). The app ships to the App Store in November; the native app is what gets advertised; a friend can already tell Claude made Rack "from the art style".
`

const TRACKS = [
  { key: '01-ai-tells', file: `${RES}/01-ai-tells.md`, job: `TRACK 1 — AI-made tells. What makes an interface read as made by Claude, ChatGPT, v0, Lovable, Bolt and similar tools?
- Palettes, gradients, glassmorphism, the "one accent on dark graphite" look.
- Uniform rounded cards with 1px borders; tiny uppercase letter-spaced eyebrow labels; rows of three stat tiles.
- Symmetric stacks; icon-in-a-circle; pill badges everywhere; generic icon sets; emoji; sparkles; "hero number + small caption" tiles.
- The same spacing everywhere; no texture, no photography, no hierarchy surprises.
Find real sources (design critiques, articles, threads on "AI slop" UI, v0/Lovable galleries, designers' posts). Then AUDIT v1 against the list using the census in the codemap's Screens section 4 (VIBES-CODEMAP.md lines 842-877; also read lines 794-841 for the shared vocabulary). Rack has ~300 uppercase labels on native, 19 three-tile stat rows, and one card recipe used everywhere. Look at the v1 screenshot. Output: a NEVER-DO list and a DO-INSTEAD list for the new vibes (each item concrete and checkable, e.g. "no 1px #ffffff14 border on every card; instead ..."), plus the v1 audit table (tell → where in Rack → count/severity).` },
  { key: '02-fitness-apps', file: `${RES}/02-fitness-apps.md`, job: `TRACK 2 — Menus and layouts in the best iOS fitness apps: Strong, Hevy, MacroFactor, WHOOP, Strava, Apple Fitness, Gentler Streak, Fitbod, Alpha Progression, Boostcamp and Liftosaur. For each: information hierarchy, density, lists vs cards, how numbers are shown, sheets, settings structure, and what makes it feel designed by a person. To actually SEE layouts: a node fetch via tools/fetch.mjs may save App Store screenshots (apps.apple.com pages list image URLs on *.mzstatic.com) and the apps' own press-kit images into ${RES}/refs/<app>/ with a sources.txt beside them giving each file's source URL; then Read the images. They are study-only: never copied into either tree, the gallery or any vibe asset. Output: a per-app table + a cross-app list of patterns worth borrowing for a lifter's logbook, and patterns to avoid.` },
  { key: '03-beyond-fitness', file: `${RES}/03-beyond-fitness.md`, job: `TRACK 3 — Beyond fitness: apps and print known for distinctive, human typography and layout. Apps and product design: Flighty, Things, Apple Weather, Teenage Engineering product UI, Bloomberg-style density. Print: sports broadcast score bugs, Swiss/International style, old almanacs and sports programmes. What transfers to a phone logbook? Output concrete transferable devices (type scale ratios, rule weights, grid choices, numeral treatments, label conventions, density rules), each with where it came from and how it would land on a 390pt phone in Rack.` },
  { key: '04-colour', file: `${RES}/04-colour.md`, job: `TRACK 4 — Colour. Building palettes by role (surface, text, accent, data, status). WCAG 2.2: 4.5:1 for text, 3:1 for large text and UI. Colour-vision deficiency: about 1 in 12 men, and most of Rack's users are men; Rack's plate colours are red, blue, yellow, green, white and chrome, and red/green means up/down in places. Dark vs light grounds; how a light vibe survives the web app's always-white iPhone status bar (in the installed PWA the status bar text is white, so a light vibe must keep the top safe-area band dark). Read codemap Web styling §1 (VIBES-CODEMAP.md lines 45-140) and Native styling §1/§3 (lines 360-470) for every role Rack has. Output: candidate palettes with EVERY role filled (all v1 roles: rack/page, bar/card, collar, knurl, chalk, steel, dim, the six plate/data colours incl. chrome, accent (separate from the legs/carbs yellow), focus, good/warn/bad, on-accent/on-plate/on-green inks, tints) for: 3 SIMPLE slots (clearly different from each other; light allowed), 2 DEEP slots, Iron Age (both a light cream-stock and a dark-ink option), and the experimental gym vibe. For each palette compute and list the contrast ratios of text roles on surface roles (write a small node script under tools/ to compute them; include its output), and simulate deuteranopia/protanopia (Machado 2009 matrices) for the six group colours with pairwise ΔE (CIE76 or CIEDE2000 — say which). All colours 6-digit hex.` },
  { key: '05-typography', file: `${RES}/05-typography.md`, job: `TRACK 5 — Typography. Free, OFL-only families good for a numbers app: real tabular figures, strong numerals, and condensed or wide cuts for headings. Include period faces for Iron Age (Clarendon/slab/wood-type/engraved Didone style) and a clean reading face, faces for 2 deep slots, 3 simple slots and an experimental gym vibe. For each candidate record: licence (confirm google/fonts ofl/<name>/METADATA.pb says OFL — fetch it with tools/fetch.mjs from raw.githubusercontent.com/google/fonts/main/ofl/<name>/METADATA.pb and OFL.txt — and note any Reserved Font Name in OFL.txt); whether a VARIABLE font with a wght axis exists (web needs it; list axes and ranges); whether STATIC TTF instances exist (native needs them; where: google/fonts static/ dir, or the upstream repo's releases on github.com); glyph coverage of ’ — · – … × “ ” → ⚙ › ✕ ⋯ ✓ − ‹ ↳ ↑ ↓ ÷ ± (download the TTF under ${RES}/fonts/<name>/ and check with opentype.js from tools/node_modules; say what falls back); x-height and average advance width vs Archivo (the pinned Archivo variable TTF is /Users/micahflunker/dev/vibes-night/tools/fonts/archivo/Archivo-wdth-wght.ttf; compare at the default instance and state the method); and tabular-figure support (tnum feature present?). Output: a ranked table per slot, with a recommendation per slot and the exact file URLs to fetch.` },
  { key: '06-gym-visual', file: `${RES}/06-gym-visual.md`, job: `TRACK 6 — Gym visual language: IPF calibrated plate colours; chalk, knurling, rubber flooring; meet scoreboards and attempt cards; old gym posters; varsity lettering; the gym whiteboard; 80s and 90s hardcore-gym signage; weightlifting-federation graphics. Output: pick ONE direction for the experimental gym vibe (a different gym style from Iron Age — candidates like meet-day scoreboard, 90s hardcore gym, chalk-and-whiteboard), with reasons (fit for a lifter's logbook, distinctiveness, how far it can go while keeping every number and word, readability on a phone, buildable as colour/type/shape/texture made by code — no photos needed unless pre-1931), plus a supporting list of motifs for Iron Age. Give concrete specs for the chosen direction: palette ideas, type, shapes, how numbers/attempts look, texture ideas that code can make.` },
  { key: '07-iron-age-period', file: `${RES}/07-iron-age-period.md`, job: `TRACK 7 — Iron Age, the period. Physical culture from about 1880 to 1930: Sandow's Strength and How to Obtain It (1897), Saxon, Cyr, Hackenschmidt, Inch; Physical Culture and Health & Strength magazines; period typography (wood type, Clarendon/slab, engraved and Didone faces), ornament, rules, engraving and halftone textures, ink on cream stock. Look at real scans (Internet Archive / HathiTrust / LoC / Commons) of these books and magazines. Output: a VISUAL SPEC VOCABULARY for Iron Age: stock colours (hex, sampled from scans — say which scan and how sampled), ink colours (black, sepia, one or two period ink colours), rule styles (weights, double/thick-thin rules, how they sit), ornament usage (sparingly: where), type hierarchy (display vs reading, caps, letter-spacing, numerals like a strongman's challenge poster or a stamped scale plate), halftone/engraving texture parameters that code could generate, and a do/don't list that keeps it from reading as pastiche. Recommend light cream ground vs dark "ink" ground for a phone logbook, with reasons.` },
  { key: '08a-iron-age-photos', file: `${RES}/iron-age/08a-photos.md`, job: `TRACK 8a — Iron Age sourcing: PHOTOGRAPHS. Find at least 18 candidate real pre-1931 photographs of strongmen/physical culturists/gymnasia/lifting (Sandow, Saxon trio, Cyr, Hackenschmidt, Inch, Apollon, Sampson, women strongwomen like Katie Sandwina and Minerva, gymnasium interiors, club-swinging classes, weightlifting at the 1904/1906/1920/1924 Olympics), each passing §14: published before 1931 (US PD); creator died before 1956 or anonymous; the clothing rule (trunks, tights, leotards, singlets or period costume allowed incl. bare torsos; REJECT any nudity, fig leaves, drapes standing in for clothing, "classical statue" nude poses; no live trademarks e.g. Charles Atlas); allowed sources only (LoC P&P marked "No known restrictions"; Commons files carrying PD-US-expired AND PD-old-70/100, traced back to the original; Internet Archive / HathiTrust scans of qualifying books — cite the book; Smithsonian/Met/Rijksmuseum CC0). Forbidden: stock sites, Pinterest, wallpaper sites, social media, colourised or restored versions, "found online". Download each original (largest available, from the item page's own download link) with tools/fetch.mjs to ${RES}/iron-age/originals/<slug>.<ext>. Suitability for a hero-box background matters: a clear focal point (face/body) that survives cropping to wide boxes (about 358×120 to 358×190 pt) — note the focal point as x,y fractions. Write draft entries to ${RES}/iron-age/PROVENANCE.photos.draft.json: an array of objects with the §14 fields (file, sha256, bytes, dims, title, subject, creator, creator_died, created, first_published {year, venue}, source_institution, source_url (the item page, not a CDN link), source_id, rights_statement_verbatim, pd_basis_us, pd_basis_worldwide, retrieved (ISO date), original_sha256, original_dims, transforms: [], clothing_check (what is worn, pass/fail), credit_line, micah_approved: false) plus focal {x,y} and your confidence. Use sips -g pixelWidth -g pixelHeight for dims. If the hosts are unreachable, instead write /Users/micahflunker/dev/vibes-night/IRON-AGE-SHOPPING-LIST.md (item page URL + what to save + target file name). Your .md file summarises the candidates (table) and anything rejected and why.` },
  { key: '08b-iron-age-engravings', file: `${RES}/iron-age/08b-engravings.md`, job: `TRACK 8b — Iron Age sourcing: ENGRAVINGS and line illustrations of apparatus, for tracing into icons: dumbbells, globe barbells, Indian clubs, kettlebells, rings, chest expanders, scales (and any period line art of a bottle/flask/jug usable as a water vessel, a notebook/ledger, a calendar, a gear/cog, a padlock). Find at least 14 candidates, each passing §14 (published before 1931; creator died before 1956 or anonymous; allowed sources: Internet Archive / HathiTrust scans of qualifying books and trade catalogues (e.g. Spalding athletic goods catalogues, physical-culture manuals) — cite the book (title, author, year, publisher) and the page, not Project Gutenberg; LoC; Commons with PD-US-expired AND PD-old-70/100 traced to the original; Smithsonian/Met/Rijksmuseum CC0). Download the page image at the best resolution the source offers (Internet Archive: the /download/ or page-image IIIF URLs on archive.org) with tools/fetch.mjs to ${RES}/iron-age/originals/eng-<slug>.<ext>, and record the crop box of the object on the page (pixels). The clothing rule applies to any figures in the image. Write draft entries to ${RES}/iron-age/PROVENANCE.engravings.draft.json (same fields as the photos: file, sha256, bytes, dims, title, subject, creator, creator_died, created, first_published {year, venue}, source_institution, source_url (item page), source_id, rights_statement_verbatim, pd_basis_us, pd_basis_worldwide, retrieved, original_sha256, original_dims, transforms: [], clothing_check, credit_line, micah_approved: false) plus crop {x,y,w,h} and a "traceability" note (clean line art vs muddy halftone). If the hosts are unreachable, append to /Users/micahflunker/dev/vibes-night/IRON-AGE-SHOPPING-LIST.md instead. Your .md summarises the candidates and rejections.` },
  { key: '09-apple-rules', file: `${RES}/09-apple-rules.md`, job: `TRACK 9 — Apple and platform rules that bind a visual design: HIG on tab bars, sheets, 44pt targets, Dynamic Type and contrast (and dark/light appearance, status bar styles); App Review Guidelines 1.1.4 (nudity/overtly sexual), 2.5.2 (apps must be self-contained; vibes are data, never downloaded code), 5.2.1 (IP: third-party material, trademarks, likeness of real people — relevant to pre-1931 photos of named strongmen and to period-looking type). Quote the exact guideline text from developer.apple.com pages you opened. Output: a checklist of binding rules for the vibes, with the quote and what it means for Rack (e.g. "the dock must stay a tab bar with the same 5 tabs; skin may change"; "never imply a pictured person endorses Rack").` },
  { key: '10-menus-settings', file: `${RES}/10-menus-settings.md`, job: `TRACK 10 — Menus and settings specifically: grouped lists, row anatomy, picker sheets with live previews, how the best apps present theme choosers (Apollo, Things, Ivory, Overcast, Flighty — and any other well-regarded theme/icon choosers). Read codemap Settings and storage §4 (VIBES-CODEMAP.md lines 1096-1123) and VIBES-PROMPT.md §8.2-§8.3 (lines 928-949) for Rack's Settings hub and the Vibes sheet requirements. Output: the VIBES PICKER DESIGN: a tall sheet titled "Vibes", one card per vibe with v1 first, each card drawn in its own vibe from its tokens (its ground, a sample card with a real-looking number in its numeral face, its accent, and for image vibes a thumbnail), its name, one line on its feel, and "Experimental" where it applies; tap applies instantly, sheet stays open, current one marked; 44+ targets; works offline; readable in every vibe. Specify the anatomy with sizes in pt (card height, padding, thumbnail size, where the check mark goes, how the "current" state shows without relying on colour alone), how the list scrolls, and what the Settings row "Look → Vibes" shows. Include what the reference apps do and which choices you borrowed.` },
]

phase('Tracks')
const results = await parallel(TRACKS.map(t => () =>
  agent(`${PREAMBLE}\n===== YOUR JOB =====\n${COMMON}\nWrite your findings to ${t.file}.\n\n${t.job}`,
    { label: `track:${t.key}`, phase: 'Tracks', schema: TRACK_SCHEMA })
    .then(r => r ? { key: t.key, ...r } : { key: t.key, file: t.file, summary: 'AGENT FAILED', top: [], sources_opened: 0, gaps: ['agent returned nothing'], installs_or_refusals: [] })
))

phase('Synthesis')
const trackIndex = results.map(r => `- ${r.key}: ${r.file} (${r.sources_opened} sources) — ${r.summary}`).join('\n')
const SYN_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    slots: { type: 'object', description: 'candidate directions per slot: simple1, simple2, simple3, deep1, deep2, ironAge (incl. ground choice), experimental' },
    top_ten: { type: 'array', items: { type: 'string' } },
    never_do: { type: 'array', items: { type: 'string' } },
  },
  required: ['file', 'slots', 'top_ten', 'never_do'],
}
const synth = async (extra) => agent(`${PREAMBLE}\n===== YOUR JOB =====\nYou are the Phase R SYNTHESIS agent (VIBES-PROMPT.md §4, lines 408-516, and §2 lines 191-233 for the lineup and layout rules). Read every track file below in full, then write ${RES}/SYNTHESIS.md: (1) the rules every new vibe follows; (2) the never-do list and the do-instead list (merged, deduplicated, concrete); (3) candidate directions per slot — 3 SIMPLE (clearly different from each other and from v1; light allowed; colours and/or fonts plus at most small shape tokens), 2 DEEP (a full visual redesign that does not look AI-made; "same order, new shapes"), IRON AGE (light cream vs dark ink decision with reasons; type; ink colours; rules; texture; icons; photo slots), EXPERIMENTAL gym (track 6's pick; may rearrange boxes within a screen, never the dock) — for each give 2-3 candidates with palette (every role), fonts (with licence + variable/static availability from track 5), shape language and why; (4) the Vibes picker design (from track 10); (5) the research's TOP TEN findings; (6) open questions. Cite which track each claim comes from; keep every source URL traceable to its track file. Do not invent sources.\n\nTrack files:\n${trackIndex}\n${extra || ''}`,
  { label: 'synthesis', phase: 'Synthesis', schema: SYN_SCHEMA })
let syn = await synth('')

phase('Critic')
const CRIT_SCHEMA = {
  type: 'object',
  properties: {
    gaps: { type: 'array', items: { type: 'object', properties: {
      track: { type: 'string' }, gap: { type: 'string' }, why_it_matters: { type: 'string' }, how_to_fill: { type: 'string' } },
      required: ['track', 'gap', 'why_it_matters', 'how_to_fill'] } },
    unsourced_claims: { type: 'array', items: { type: 'string' } },
  },
  required: ['gaps', 'unsourced_claims'],
}
const crit = await agent(`${PREAMBLE}\n===== YOUR JOB =====\nYou are the Phase R COMPLETENESS CRITIC. Compare VIBES-PROMPT.md §4 (lines 408-516: ten tracks, each with required outputs), §11 (lines 1048-1096, Iron Age needs), §13 (lines 1125-1176, what the quality gates will measure) and §14 (1179-1247) against what the research actually delivered: ${RES}/SYNTHESIS.md and the track files below. Find (a) what was NOT researched that the prompt asked for (e.g. a named app not covered, a required output missing, fewer than 30 Iron Age candidates across 08a+08b, missing glyph coverage, missing contrast numbers, a slot with no candidate), and (b) claims in SYNTHESIS.md or the tracks that have no source. Be specific and adversarial; list at most 8 gaps, most important first, each with how to fill it.\n\nTrack files:\n${trackIndex}`,
  { label: 'critic', phase: 'Critic', schema: CRIT_SCHEMA })

phase('Fill')
let fills = []
if (crit && crit.gaps && crit.gaps.length) {
  const byTrack = {}
  crit.gaps.forEach(g => { (byTrack[g.track] = byTrack[g.track] || []).push(g) })
  const groups = Object.entries(byTrack).slice(0, 5)
  if (Object.keys(byTrack).length > 5) log(`critic listed gaps in ${Object.keys(byTrack).length} tracks; filling the first 5 groups only`)
  fills = await parallel(groups.map(([track, gs]) => () =>
    agent(`${PREAMBLE}\n===== YOUR JOB =====\n${COMMON}\nYou are a Phase R GAP-FILL agent for "${track}". The completeness critic found these gaps:\n${gs.map((g, i) => `${i + 1}. ${g.gap} — why: ${g.why_it_matters} — how: ${g.how_to_fill}`).join('\n')}\n\nFill them once, properly sourced. Append a section "## Gap fill (critic round)" to the relevant track file (find it in this list; if the gap spans tracks, append to the most relevant one and name the others):\n${trackIndex}\nIf a gap is Iron Age sourcing, download with tools/fetch.mjs to ${RES}/iron-age/originals/ and append entries to the matching PROVENANCE.*.draft.json (keep valid JSON).`,
      { label: `fill:${track}`, phase: 'Fill', schema: TRACK_SCHEMA })))
  syn = await synth(`\nA gap-fill round ran after the critic; the gap sections are appended to the track files ("## Gap fill (critic round)"). Rewrite SYNTHESIS.md in full taking them into account. Critic's unsourced-claims list (remove or source each):\n${(crit.unsourced_claims || []).map(c => '- ' + c).join('\n')}`)
}

return { tracks: results, synthesis: syn, critic: crit, fills: fills.filter(Boolean) }
