export const meta = {
  name: 'v59-e0-contract',
  description: 'V59 E0: the vibe contract (v1 defs, registry, icons) in web + byte-for-byte native copy, then 3-lens adversarial verification and fix',
  phases: [
    { title: 'Author', detail: 'one agent writes vibes/defs/v1.js, vibes/defs/index.js, vibes/icons/v1.js + verifiers, both trees' },
    { title: 'Verify', detail: 'three skeptics (web values, native values, contract integrity) try to refute v1 == today' },
    { title: 'Fix', detail: 'fix reproduced findings, re-verify (max 2 rounds)' },
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


const WEBWT = '/Users/micahflunker/dev/vibes-night/wt/web-contract'
const NATWT = '/Users/micahflunker/dev/vibes-night/wt/nat-contract'
const CODEMAP = '/Users/micahflunker/dev/vibes-night/VIBES-CODEMAP.md'
const PROMPT = '/Users/micahflunker/dev/vibes-night/VIBES-PROMPT.md'

const SPEC = `
===== THE CONTRACT (what E0 must produce) =====
Read first: ${PROMPT} §5 "E0: the contract" (lines 519-541), §6.1-6.3 (lines 651-716: what the native engine needs from the contract), §9.1 and §9.3 (lines 961-998: what Phase D will extend later), §13.1 (1127-1136). Codemap ${CODEMAP}: Web styling §0-§6 and §8-§9 (lines 17-350), Native styling §1, §3, §4, §5, §6 (lines 353-530), Screens §0 (lines 610-672), Assets "Icon inventory" (lines 1569-1582). Then read the CODE — it wins over the map.

Three pure modules in the WEB worktree ${WEBWT} (branch vibes/contract, at 928a65e). They IMPORT NOTHING (no import/export-from/require at all — not even each other; consumers import each file directly). Plain ES modules, hand-written, commented with WHY (house style: see ship-v59 CLAUDE.md).

1. vibes/defs/v1.js — default export: the complete v1 vibe. EVERY token role with its v1 value, so the web engine (E), the native engine (N) and Phase D never have to invent a role:
   - metadata: id 'v1', name 'v1', feel 'The original Rack look.', experimental false, scheme 'dark', icons 'v1', images {} (no hero images in v1), themeColor (the web <meta name="theme-color"> value today), variants: an object naming the v1 variant ('v1') for each shared building block listed in §6.9 (Card, YouCard, Section header, Eyebrow/labels, StatRow, Btn, Chip, Segmented, SettingsRow, Sheet host, SheetTitle, Dock skin, screen header, Kpi, You Hero, Coach card skin, chart styling) — D extends this list later.
   - colors: every native T.colors key (22, src/ui/theme.js at 1cb6498) with its exact value, PLUS new semantic split roles whose v1 values equal today's: accent (today pYellow's accent uses), focus, accentPressed, onAccent, page vs onPlate (the #14161a double duty), and any other double-duty value you find in either tree. The web :root tokens (rack.css:4-49, 26 tokens) must all be representable from these roles; where web and native disagree on a value today, keep both (e.g. a web: {...} / native: {...} sub-object) — never pick one.
   - alpha: native's alpha.* helpers as {name: colour role}; tint: native's 23 precomputed tints as {name: {color: role or hex, a: number}} such that native rgba(hex, a) reproduces today's exact string.
   - type: the 20 native text presets as the exact argument objects passed to type() today (size, lh, ls, wdth, wght, color role, upper, tnum, …), plus loadNum's arguments; face: family 'Archivo', the four static keys (Archivo_400/600/700/800), the weight-snapping rule (650→700, 750→800, else nearest 100 — as the code has it), width collapsed to 100, minLh 1.088, the mono face (Menlo); web: the --font and --font-mono stacks as spelled today, the Google Fonts @import URL of rack.css line 1 (for reference; it stays in rack.css).
   - radius: native radius table (r 12, sm 8, …) and the web radius values that will become tokens (e.g. pill 999px, xs 2px, sheet 18px — survey rack.css/auth.css for every border-radius value, list them with counts, and name the ones that recur).
   - web: channel tokens (--rack-rgb, --accent-rgb, --p-red-rgb, --p-blue-rgb, --p-green-rgb, --p-white-rgb, --p-yellow-rgb, --shade-rgb (black), --lift-rgb (white), …) as roles pointing at colours (the CSS text is generated later from hexToRgb); the one-off hexes (--ink #141414, --ink-plate #14161a, --ink-go #0d1a11, --accent-press #d9a90f, --on-danger #fff, --video-bg #000 — verify each in the code); shadow tokens and scrim tokens (each as structured {x,y,blur,spread,color role,a} lists — survey every box-shadow and backdrop/scrim value in rack.css and auth.css); the auth.css 4 literals; index.html's auth-mark inline hexes; you.js's --kpi-rgb channel strings; access.js marks; web workout.js PLATES — each mapped to a role.
   - data tables with EXACT strings as the code has them today (case preserved): groups = the analytics palette (lowercase) + fallback '#8d939f' (web analytics.js and native src/pure/analytics.js — compare them); groupPlates = exercises.js GROUPS[g].color (UPPERCASE); plates = PLATES[].c (web workout.js and native src/state/workout.js — compare); subjects = native you/bits.jsx SUBJECT_COLOR and C_* (and the web you.js equivalents); admin maps (native admin/sheets.jsx AI_SPLIT/PILL, you/admin.jsx FAMILIES); estimator CONF.
   - chrome (native): statusBar 'light', keyboard 'dark', blurTint 'dark', shadow (the five shadowColor '#000' sites), datePicker 'dark', camera background (scan.jsx), systemFace: null (v1 = NO fontFamily key at the 76 system-font sites).
   - signIn: a token set whose v1 values are today's off-theme hexes in app/(auth)/sign-in.jsx (all 15, incl. placeholders, error/ok, button, field bg/border, ActivityIndicator '#fff').
   - every other raw colour literal the native engine will turn into a token (§6.3 "Raw literals become tokens": the _layout banners, food/common.jsx tiles #1e1f1e/#17181a, you/verdicts.jsx and you/cards.jsx rgba, the TourOverlay gradient) and every raw colour literal on the web side outside the pinned pure files, web store.js's refusal banner and 404.html (those three are allowed exceptions and are NOT tokenised). Enumerate them with a node script (hex, rgb/rgba, named colours except 'transparent') over both trees at 928a65e / 1cb6498 and make sure each has a role; put the census (file:line → role) in your final answer.
   COLOUR FORMAT: all colours 6-digit hex (/^#[0-9a-fA-F]{6}$/), alphas are numbers. The ONLY exception: v1's exact legacy spellings that reach a host prop or an inline style verbatim today (e.g. '#fff', '#000' in sign-in, banners, shadowColor) — keep the exact string in v1.js and list every such key path in index.js LEGACY_EXACT; no other vibe may use it. (Reason: §6 demands byte-identical host props; the 6-digit rule exists for native's rgba(), which never receives those slots.) Uppercase 6-digit (GROUPS) is fine and must stay uppercase.

2. vibes/defs/index.js — the registry, importing nothing: VIBES (ordered metadata list, v1 first: id, name, feel, experimental, scheme; only v1 exists now), IDS, RESERVED ids ('defs', 'icons' — folder names under vibes/), normVibe(x) (absent / unknown / non-string / wrong case / garbage → 'v1'; valid = /^[a-z0-9][a-z0-9-]*$/, ≤ 32 chars, registered), list() (the metadata in order), hexToRgb(hex) → [r,g,b] for 6-digit hex (document what it does with anything else — no throwing inside a render path; return null), ROLES (a table: for every role in v1.js — its key path, kind (color | alpha | tint | radius | shadow | scrim | font | type | face | chrome | table | image | variant), its web custom property name if any (e.g. '--rack', '--accent', '--rack-rgb'), its native T path if any (e.g. 'colors.rack', 'tint.setDone', 'chrome.statusBar') — the single map the web generator (tools-check/vibes-css.mjs, written later) and native build() (later) both read), and LEGACY_EXACT.

3. vibes/icons/v1.js — exact copies of TODAY's icons as data on the 24×24 viewBox, with stroke widths: the dock's 5 (web index.html and native src/ui/Dock.jsx — compare them; if they differ keep web: and native: variants), ICON_PATHS (web food.js and native src/ui/food/common.jsx: plus, camera, pen, barcode, keypad, book, stack, spark), the gear variants (web: food.js, steps.js, you.js innerHTML sites; native: you/Hero.jsx, steps.jsx — record each variant exactly, with its site), the calendar (web workout.js innerHTML; native session.jsx), the Coach bubble and the lock/unlock (web coach-ui.js; native coach/Card.jsx). Each icon: { viewBox, stroke (width), fill, linecap, linejoin, els: [{tag:'path', d}, {tag:'circle', cx, cy, r}, {tag:'rect', x, y, width, height, rx}, …] } — enough for the web and native renderers to emit exactly today's markup/props; plus per-site attributes that differ (size in px/pt, stroke override). Also a glyphs map of the Unicode glyph icons that stay TEXT in v1 (‹ › ✕ ⋯ ✓ ↳ ✎ ⚙ ▴ ▾ ⚠ ↑ ↓ — survey both trees) with their sites, so a vibe can later route one through icon().

VERIFIERS you write (all must pass; each prints a count of checks):
- WEB tools-check/vibes-contract.mjs: (a) the three modules import nothing (text scan); (b) every colour is 6-digit hex except LEGACY_EXACT paths (which must exist, and only for v1); (c) every ROLES entry resolves to a value in v1; every v1 leaf value is covered by a ROLES entry or a documented table; (d) v1 == rack-v58, anchored to the base commit so it keeps meaning after the engine rewrites the files: read rack.css / auth.css / index.html / food.js / steps.js / you.js / workout.js / coach-ui.js / analytics.js / exercises.js via \`git show 928a65e:<file>\` (spawn git with execFileSync; the repo is a full clone) and check every web-mapped token value, every icon's paths/attributes, and the data tables equal v1.js; (e) normVibe cases (undefined, null, '', 'V1', ' v1', 'nope', 'defs', 42, {}, 'v1', a 33-char id) and list() order; hexToRgb cases.
- NATIVE (worktree ${NATWT}, branch vibes/contract at 1cb6498, node_modules is a symlink — never stage it): copy the three files BYTE FOR BYTE to src/pure/vibes/defs/v1.js, src/pure/vibes/defs/index.js, src/pure/vibes/icons/v1.js (use node -e "require('fs').copyFileSync(a,b)" after mkdir -p). Write tools/verify-vibes-verbatim.mjs in the house style of the existing tools/verify-*-verbatim.mjs (read two of them first): pinned sha256 constants for the three files; assert the native files match the pins; assert they import nothing; and compare against web/main via \`git show web/main:vibes/defs/v1.js\` etc. — when web/main does not have them yet (it won't until Micah pushes rack-v59), print "web/main has no vibes/ yet — pending the push" and still pass. Write tools/verify-vibes-contract.mjs: the same contract checks as web's where they apply, anchored to \`git show 1cb6498:<file>\` for native: every theme.js colors/radius/tint/alpha/type/face value, sign-in literals, raw literals, group/plate/subject/admin tables and native icons (Dock.jsx, common.jsx, Card.jsx, Hero.jsx, steps.jsx, session.jsx) equal v1.js / icons/v1.js.

RUN: web suite and native suite in all three zones via run-verifiers.mjs (outDir ~/dev/vibes-night/proof/e0-web and ~/dev/vibes-night/proof/e0-nat): web must be 45+3 syntax (the vibes/*.js are included) and 53/53; native 83/83; batteries unchanged.
COMMIT (explicit paths only; message via Write to ~/dev/vibes-night/tmp/msg-e0-*.txt; end each message with the line "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"):
- web on vibes/contract: subject "The vibe contract: v1's tokens and icons, as data" — body: what the three files are, that nothing imports them yet so no phone-loaded file changed (no sw.js bump — rack-v59's bump is its own commit at the end, per the build prompt §15.3), the verifier and its count.
- native on vibes/contract: subject "vibes: the contract — v1's tokens and icons as pure data, verbatim from web (V59 §5)" — body with the three sha256 pins.
Do NOT touch any other file (no rack.css, no theme.js — that is the engines' job). Do not merge anything.`

const AUTHOR_SCHEMA = {
  type: 'object',
  properties: {
    web_commit: { type: 'string' }, native_commit: { type: 'string' },
    pins: { type: 'object', description: 'file -> sha256' },
    roles_count: { type: 'number' },
    legacy_exact: { type: 'array', items: { type: 'string' } },
    web_native_disagreements: { type: 'array', items: { type: 'string' } },
    literal_census: { type: 'string', description: 'file:line -> role, compact' },
    verifiers: { type: 'object', description: 'per tree per zone: pass/total, batteries' },
    open_questions: { type: 'array', items: { type: 'string' } },
    refusals_or_installs: { type: 'array', items: { type: 'string' } },
  },
  required: ['web_commit', 'native_commit', 'pins', 'roles_count', 'legacy_exact', 'web_native_disagreements', 'verifiers', 'open_questions', 'refusals_or_installs'],
}
const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      where: { type: 'string', description: 'role key path or icon name in the contract' },
      contract_value: { type: 'string' },
      code_value: { type: 'string' },
      code_ref: { type: 'string', description: 'file:line @ sha' },
      repro: { type: 'string', description: 'the exact command or reading that shows it' },
      severity: { type: 'string', enum: ['wrong-value', 'missing-role', 'icon-mismatch', 'purity', 'verifier-blind', 'other'] },
    }, required: ['where', 'contract_value', 'code_value', 'code_ref', 'repro', 'severity'] } },
    checked: { type: 'number', description: 'how many values/icons you checked' },
    summary: { type: 'string' },
  },
  required: ['findings', 'checked', 'summary'],
}

const LENSES = [
  { key: 'web', text: `WEB LENS. Check every web-side value in the contract against the web code at 928a65e (read files with Read in ${'/Users/micahflunker/dev/vibes-night/wt/web-base'} — a detached worktree at 928a65e — or via \`git -C ${WEBWT} show 928a65e:<file>\`): rack.css :root tokens and every raw colour/radius/shadow/scrim/font value, auth.css, index.html (dock SVGs byte for byte, auth mark), food.js ICON_PATHS and gear, steps.js gear, you.js gear and --kpi-rgb strings, workout.js calendar and PLATES, coach-ui.js bubble/lock, access.js marks, analytics.js palette, exercises.js GROUPS. Also completeness: write a node script that lists every colour literal in the web tree's *.js, *.css and index.html (excluding the pinned pure files, store.js's refusal banner and 404.html) and show any the contract gives no role.` },
  { key: 'native', text: `NATIVE LENS. Check every native-side value in the contract against the native code at 1cb6498 (read files in /Users/micahflunker/dev/vibes-night/wt/nat-base, a detached worktree at 1cb6498): src/ui/theme.js (every colors key, alpha helper, tint string — compute rgba() yourself, text presets' type() args, face(), loadNum, radius), sign-in.jsx literals, _layout banners, food/common.jsx tiles and ICON_PATHS, verdicts/cards rgba, TourOverlay gradient, shadowColor sites, scan.jsx, Dock.jsx ICONS, coach/Card.jsx icons, you/Hero.jsx gear, steps.jsx gear, session.jsx calendar, you/bits.jsx SUBJECT_COLOR/C_*, admin/sheets.jsx, you/admin.jsx, estimator CONF, src/state/workout.js PLATES, src/pure/exercises.js GROUPS (uppercase!), src/pure/analytics.js PALETTE. Also completeness: an AST or text scan (node; @babel/parser is in /Users/micahflunker/dev/rack-mobile/node_modules) for every colour literal outside theme.js and the pinned files, and every T.colors/T.tint/T.alpha key used anywhere, showing any the contract gives no role.` },
  { key: 'contract', text: `CONTRACT-INTEGRITY LENS. (1) The three files import nothing; the native copies in ${NATWT}/src/pure/vibes/ are byte-identical to web's (sha256 both) and equal the pins in tools/verify-vibes-verbatim.mjs. (2) Colour format rule: every colour 6-digit hex except the LEGACY_EXACT paths, and each LEGACY_EXACT path really is a legacy exact spelling that reaches a host prop/inline style verbatim today (show the site). (3) ROLES covers every leaf; normVibe/list/hexToRgb behave as documented on hostile inputs (write a scratch node test under ~/dev/vibes-night/tmp/). (4) The verifiers are not blind: copy each tree's worktree files you need into a scratch dir under ~/dev/vibes-night/tmp/e0-mut-<n>/ (NOT the worktrees), mutate one contract value at a time (a colour, an icon path char, a tint alpha, a type size, an import line) and show tools-check/vibes-contract.mjs / tools/verify-vibes-contract.mjs / tools/verify-vibes-verbatim.mjs go red for each (run them with node against the scratch copy; if a verifier can only run inside its tree, use the mutation scratch worktrees /Users/micahflunker/dev/vibes-night/wt/web-mut (detached 928a65e) and /Users/micahflunker/dev/vibes-night/wt/nat-mut (detached 1cb6498, node_modules linked): check out the vibes/contract branch's files into them with \`git -C <mut> checkout vibes/contract -- <paths>\` then mutate; restore with \`git -C <mut> checkout 928a65e -- .\`/\`1cb6498\` and delete added files when done — leave them clean). A verifier that stays green on a real mutation is a finding (severity verifier-blind).` },
]

phase('Author')
const author = await agent(`${PREAMBLE}\n===== YOUR JOB: E0, the contract author =====\n${SPEC}`, { label: 'e0:author', phase: 'Author', schema: AUTHOR_SCHEMA })
if (!author) return { error: 'author agent failed' }
log(`E0 authored: web ${author.web_commit} native ${author.native_commit}, ${author.roles_count} roles`)

const verifyRound = async (round) => {
  const vs = await parallel(LENSES.map(l => () => agent(`${PREAMBLE}\n===== YOUR JOB: E0 adversarial verifier (${l.key} lens), round ${round} =====\nThe contract author claims v1.js / index.js / icons/v1.js in ${WEBWT} (branch vibes/contract) and the copies in ${NATWT} are EXACTLY today's look (rack-v58 / build 58) and complete. Try to REFUTE that. A finding counts only with a reproduction: the contract value, the code value, the file:line at the base sha, and the command/reading that shows it. Do not edit the contract files; do not commit. Read the spec the author worked from:\n${SPEC}\n\n${l.text}`,
    { label: `e0:verify-${l.key}-r${round}`, phase: 'Verify', schema: VERIFY_SCHEMA })))
  return vs.filter(Boolean)
}

let rounds = []
let verdicts = await verifyRound(1)
rounds.push(verdicts)
for (let round = 1; round <= 2; round++) {
  const findings = verdicts.flatMap(v => v.findings)
  log(`E0 verify round ${round}: ${findings.length} findings (${verdicts.map(v => v.checked).join('/')} checked)`)
  if (!findings.length) break
  phase('Fix')
  const fix = await agent(`${PREAMBLE}\n===== YOUR JOB: E0 fixer, round ${round} =====\n\nKNOWN PRE-EXISTING RED (not yours to fix; don't touch it): the rate-band verifier (native tools/verify-rate-band.mjs, web tools-check/rate-band.mjs) currently FAILS under TZ=Pacific/Auckland on the UNTOUCHED base trees (1cb6498 / 928a65e) — New Zealand's daylight saving starts 27 Sep 2026. Treat an Auckland rate-band failure as acceptable ONLY if the base tree (/Users/micahflunker/dev/vibes-night/wt/nat-base or wt/web-base) fails it the same way when run right after, in the same zone; report both results.\nRESUMING: a previous fixer for this round hit the account's usage limit mid-work and left UNCOMMITTED edits in both worktrees (web: vibes/defs/v1.js, vibes/defs/index.js, vibes/icons/v1.js, tools-check/vibes-contract.mjs; native: the three copies and tools/verify-vibes-{contract,verbatim}.mjs). Read \`git diff\` in both worktrees first, judge each edit against the findings below, keep what is right, finish the rest. COMMIT OFTEN (a usage limit can end your session without warning).\nYou continue the E0 contract work in ${WEBWT} (branch vibes/contract) and ${NATWT} (branch vibes/contract; node_modules is a symlink, never stage it). Adversarial verifiers reported these findings with reproductions. For each: reproduce it; if real, fix the contract (and the verifier if it was blind) so the verifier now catches it; if not real, say why with evidence. Keep the native copies byte-identical (re-copy with node copyFileSync) and update the sha256 pins. Re-run both suites in three zones via run-verifiers.mjs (outDirs ~/dev/vibes-night/proof/e0-fix${round}-web / -nat) — all green. Commit on each branch (new commits, not amends; web subject "The vibe contract: what review found", native "vibes: the contract — what review found (V59 §5)"; end each message with the Co-Authored-By line). The spec:\n${SPEC}\n\nFINDINGS:\n${JSON.stringify(findings, null, 1)}`,
    { label: `e0:fix-r${round}`, phase: 'Fix', schema: AUTHOR_SCHEMA })
  if (!fix) break
  verdicts = await verifyRound(round + 1)
  rounds.push(verdicts)
}
const remaining = verdicts.flatMap(v => v.findings)
return { author, rounds: rounds.map(r => r.map(v => ({ checked: v.checked, summary: v.summary, findings: v.findings }))), remaining }
