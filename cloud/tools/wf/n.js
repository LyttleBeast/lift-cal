export const meta = {
  name: 'v59-engine-native',
  description: 'V59 §6 N: the native engine on vibes/engine as a serial relay (N1 theme build + store, N2 captures/literals/lints, N3 switching + fonts, N4 metrics/images/skins/variants) — v1 identical to build 58',
  phases: [
    { title: 'N1 theme', detail: 'build()/applyTheme(), semantic slots, chrome + sign-in tokens, src/state/vibe.js' },
    { title: 'N2 reads', detail: 'module-scope captures, worklets, raw literals, group/plate tokens, static lints' },
    { title: 'N3 switch', detail: 'keyed remount, root siblings, fonts, mid-session switch verifier' },
    { title: 'N4 shapes', detail: 'coach-view metrics, image slots, cardSkin, component variants' },
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
const WT = `${NIGHT}/wt/nat-engine`
const PROMPT = `${NIGHT}/VIBES-PROMPT.md`
const CODEMAP = `${NIGHT}/VIBES-CODEMAP.md`

const COMMON = `
===== THE NATIVE ENGINE (V59 §6 N) =====
You are one engine agent in a RELAY: exactly one engine agent writes this branch at a time; the ones before you left reports (below). Worktree: ${WT} (branch vibes/engine; it contains E0's contract commit(s): src/pure/vibes/defs/v1.js, src/pure/vibes/defs/index.js, src/pure/vibes/icons/v1.js, tools/verify-vibes-verbatim.mjs, tools/verify-vibes-contract.mjs — those three pure files are copied verbatim from web and pinned; never edit them). node_modules is a symlink — NEVER stage it; stage explicit paths only; never git add -A / . / :/.
CONTRACT UNDER REVIEW: E0's contract is still under adversarial review; fixes may land on branch vibes/contract (native copies + pins). At your start and before your final commit: if \`git -C ${WT} log --oneline vibes/engine..vibes/contract\` lists commits, make your tree clean and \`git -C ${WT} rebase vibes/contract\` (git skips patches already applied).
COMMIT OFTEN: the account has a usage limit that can end your session mid-work without warning; anything uncommitted is lost to the next agent's understanding. Commit a WIP after every coherent sub-step (it may be red on this branch), with a body that says what is done and what is next. If you find an earlier relay agent's uncommitted work in the tree, read it and continue it.
PROOF TOOLS: the v1 proof lives on branch vibes/proof (a fix round is adding commits to it now — rebase onto it again before your final commit) (tools/verify-vibe-v1.mjs = host-prop snapshot vs a baseline captured at 1cb6498; tools/verify-theme-identity.mjs = theme exports / build(v1) vs baseline). FIRST THING: if \`git -C ${WT} log --oneline vibes/engine..vibes/proof\` lists commits, commit or stash nothing — make sure your tree is clean, then \`git -C ${WT} rebase vibes/proof\` so the proof tools are in your branch (report it). If vibes/proof has no commits yet, carry on with the existing verifiers and check again before you finish.
Commit WIP on vibes/engine (subject "engine(wip): <what> (V59 §6.x)"; body = what and why; end with "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"; message via Write to ${NIGHT}/tmp/msg-<name>.txt, then git -C ${WT} commit -F <file>). The orchestrator squashes the branch into one commit on main after the proof gate. Never touch main, never merge into it.
Read: ${PROMPT} §6 in full (lines 651-787), §7.3-7.6 (843-877), §8.1 native bullets (906-916: Phase S will add persistence — don't write storage now, but leave the store ready for it), §10 light-vibe bullets (1035-1041), §11 photo slots (1058-1072), §12.1 (1101-1112). Codemap ${CODEMAP}: Native styling (lines 353-605), Screens §0-§1 and §3 (606-841), Tooling §4 (1373-1393), Settings and storage §2 (989-1063). The contract files. rack-mobile's CLAUDE.md and AGENTS.md in the worktree (house style, module-store pattern).
THE BAR: with v1 active, every host element renders IDENTICAL props to buildNumber 58 (tools/verify-vibe-v1.mjs byte-identical to its baseline), build(v1) deep-equals the pre-engine theme exports (tools/verify-theme-identity.mjs), and all verifiers stay green in America/New_York, UTC and Pacific/Auckland (full suites only via \`node ${NIGHT}/tools/run-verifiers.mjs nat ${WT} ${NIGHT}/proof/<run-name>\`; single verifiers as \`TZ=UTC node tools/<x>.mjs\` from ${WT}). Held batteries unchanged: coach-prog 57+16, overlap 24, ready 46, fuel 16, finish 12, volume 72, all /0/0. No word on screen changes; no behaviour changes; no new dependency (package.json, lockfile, app.json plugins, ios/ untouched); no native build commands.
A baseline tree for reading: ${NIGHT}/wt/nat-base (detached 1cb6498). The lint baseline data (module-scope reads, colour literals, worklet captures) is at ${NIGHT}/proof/nat-lint-baseline.json if the proof agent has written it.`

const N1 = `${COMMON}
===== YOUR SHARE: N1 — theme build/applyTheme, the semantic slots, the vibe store =====
1. src/ui/theme.js stays the single module every file imports (import T from '…/theme'; 80 importers). Add build(tokens): returns a complete, FRESH object (colors, alpha, tint, space, radius, layout, motion, face, type, text, loadNum, plus the new semantic slots below). Every function closes over the tokens it was given, never over module bindings (today tint and text are precomputed and type()'s default colour closes over the module's colors). Add applyTheme(obj): reassigns T's top-level properties to fresh objects — never mutate a nested object in place (Reanimated worklets freeze captured objects in dev and cache clones by identity). theme.js never imports the vibe definitions (no relative import at all — verifiers load stubbed copies from tools/ or a tmpdir). Keep the v1 literal tables where the text-parsing verifiers expect them — verify-text-color (the exact line \`import { Platform } from 'react-native';\`), verify-coach-surface, verify-keypad-done (slices \`export const layout\`/\`export const space\`), verify-top-inset:231's appTop regex, sweep-text-metrics (report only) — or update their loaders in the same commit and say why. The default export stays T, now = build(the v1 literal tables) so nothing changes at import.
2. New semantic slots, with v1 values equal to today's, read from the contract's roles: accent split from legs (pYellow is today both the accent — ~79 uses — and the legs/carbs data colour; add colors.accent etc. = the same hex; you do not convert the 79 uses here unless trivial — N2 converts call sites); page vs onPlate split; T.group(g) → the analytics palette (LOWERCASE, '#8d939f' fallback) exactly where groupColor(g) is used today; T.groupPlate(g) → GROUPS' UPPERCASE hex exactly where GROUPS[g].color is used (the call site keeps its own || T.colors.dim); PLATES[].c, SUBJECT_COLOR and C_* the same way (one token per source, the exact string); chrome tokens statusBar 'light', keyboard 'dark', blurTint 'dark', shadow '#000', datePicker 'dark', camera, and systemFace (v1 = NO fontFamily key at all at the 76 system-font sites — so the slot's v1 value must make the call sites add nothing); a sign-in token set whose v1 values are today's off-theme hexes; T.cardSkin(opts) (a style fragment — background, border, radius — whose v1 output reproduces a hand-rolled card View's exact style; N4 applies it to the 22 sites); T.variant (block → 'v1'); T.images (slot → null in v1).
3. face(): v1 keeps exactly today's behaviour — Archivo_<wght> with width collapsed to 100, 650→700, 750→800. Make weight snapping and minLh (1.088 is Archivo's) per family, and let a vibe map wdth bands to a condensed/expanded cut when it has one — all driven by the tokens passed to build(). Don't "fix" width in v1.
4. src/state/vibe.js (new), following the house store pattern — copy src/state/units.js's shape: current, subscribe, getVersion, useVibe, initVibe (no storage yet — Phase S wires LS/Firebase; make it a no-op-safe stub that keeps v1), setVibe(id) (normVibe → build(def) → applyTheme → bump version → notify), resetVibe (in-memory back to v1). It imports src/pure/vibes/defs/index.js, the def files, icons — and theme.js's build/applyTheme. A small id→def table in vibe.js (the registry imports nothing).
5. Prove: tools/verify-theme-identity.mjs (after the rebase) passes with build(v1) as well as the default export; verify-text-color, verify-coach-surface, verify-keypad-done, verify-top-inset, verify-vibe-v1 pass; the full suite in three zones. Commit "engine(wip): theme build/applyTheme, the semantic slots and the vibe store (V59 §6.1-6.2)". Return what you did, the exact T shape (new keys), any loader you updated and why, suite results, and what N2 must do.`

const N2 = `${COMMON}
===== YOUR SHARE: N2 — every read at render time; every colour through T =====
RESUMING: a previous N2 agent hit the account's usage limit mid-work. It committed 5230772 "engine(wip): SetRow's worklets capture strings, the set tags and plates read T at render", 04508ae "engine(wip): no theme read at import, no colour literal outside the theme" and 6a52868 "engine(wip): every group colour through T.group / T.groupPlate", and left UNCOMMITTED edits in 37 files (tabs, gates, Chip, Field, Segmented, Swipe, charts, coach, food, settings, steps, train, you, …). Read those commits and \`git -C ${WT} diff\` first; judge each edit against this brief, keep what is right, commit it, then finish the rest. Don't redo finished work. Note vibes/proof moved to 7475003 (the proof's fix round: 180 scenes / 21,930 hosts, pinned baselines) — rebase onto it once your tree is clean, and use its commands (verify-vibe-v1 --root, verify-theme-identity --require-build).
1. Worklets FIRST: SetRow.jsx's interpolateColor and flash worklets must capture HOISTED PLAIN STRINGS from render scope (const low = T.tint.coachLow …), never T. Do this before anything else.
2. Module-scope captures become render-time reads. Count them yourself with an AST scan (@babel/parser is in node_modules; the proof agent's ${NIGHT}/proof/nat-lint-baseline.json may already list them). The verified list is 14 files / 76 refs: Btn.jsx BG/FG/BORDER; chart/Ring|Donut|BarChart text styles; you/bits.jsx DELTA_FG, PILL_BG, SUBJECT_COLOR, C_*; train/SetRow.jsx TINT; Splash.jsx PLATES; food/estimator.jsx CONF; admin/sheets.jsx and you/admin.jsx; app/_layout.jsx:42 BG; (auth)/sign-in.jsx BG and s; workout/index.jsx PAIR; Dock.jsx DOCK_H. Convert each into a function or render-scope read with identical output (exported constants used elsewhere become functions; update their users).
3. Raw literals become tokens (read from T): sign-in (all of it, via the sign-in token set; sign-in stays v1 always — signed-out screens never take a vibe), the _layout banners, the food/common.jsx tiles, the you/verdicts.jsx / you/cards.jsx rgba, the TourOverlay gradient, the five shadowColor '#000', scan.jsx's camera black, ActivityIndicator colours — and every other colour literal outside theme.js except 'transparent' and the pinned pure files. Group colours: groupColor(g) sites → T.group(g); GROUPS[g].color sites → T.groupPlate(g) (keep each site's || fallback); PLATES[].c → the plate token; SUBJECT_COLOR / C_* → T. src/state/workout.js is NOT pinned — its PLATES colours may move to T, keeping every non-colour field and behaviour. Where the accent (pYellow used as accent) is meant, point at T.colors.accent; where it's legs/carbs data, keep pYellow — list each decision.
4. Static lints as new verifiers (house style, each prints its count): tools/verify-no-colour-literals.mjs (no colour literal outside theme.js and src/pure/vibes/**; exceptions: 'transparent' and the pinned pure files — src/pure/{exercises,analytics,tdee,units,accounts,insights,estimate-origin,estimate-ask,coach,coach-build,coach-live,coach-prog,coach-goal,coach-overlap,coach-ready,coach-fuel,coach-volume,coach-tags}.js); tools/verify-no-module-scope-theme.mjs (AST: no T. read at module scope anywhere in app/ or src/); tools/verify-no-theme-in-worklet.mjs (AST: no T reference inside useAnimatedStyle/useDerivedValue/useAnimatedProps callbacks or 'worklet' functions). Prove each goes red on a planted violation in a scratch copy under ${NIGHT}/tmp/ (not the worktree).
5. verify-vibe-v1 stays BYTE-IDENTICAL; theme identity; full suite three zones. Commit "engine(wip): every theme read at render time, every colour through T, worklets capture strings (V59 §6.3)". Return files changed with counts, the accent/data decisions, lint counts, suite results, what's left.`

const N3 = `${COMMON}
===== YOUR SHARE: N3 — switching and fonts =====
1. Switching is a KEYED REMOUNT. app/(app)/_layout.jsx's <Stack> gets a key that includes the vibe version (from src/state/vibe.js). Before switching, capture usePathname() and feed it through the existing target/router.replace effect so he lands on the same screen. The root siblings outside that Stack subscribe with useSyncExternalStore: SheetHost (so the Vibes sheet stays open and repaints), TopBars, SyncPip, ToastHost, KeypadDoneBar, the root View's background and <StatusBar style>. The live session, food day and rest timer live in module stores and must survive.
2. StatusBar style, keyboardAppearance (every signed-in TextInput) and DateTimePicker themeVariant follow the vibe's chrome tokens — with v1 producing EXACTLY today's props: today StatusBar style="light"; keyboardAppearance="dark" on 14 inputs; sign-in's 2 inputs set none; DateTimePicker has NO themeVariant prop (it relies on app-wide dark) — so v1 must add no prop where none exists today (verify-vibe-v1 will catch any).
3. Fonts. v1 keeps exactly today's behaviour: the four Archivo TTFs from the package, face() returning Archivo_<wght>, width collapsed. A vibe's fonts will be vendored static TTFs under assets/fonts/<Family>/ with their OFL.txt, registered as <Family>_<wght> (none exist yet — build the mechanism, test it with a synthetic def in a verifier). At boot, load Archivo plus the ACTIVE vibe's faces, gating ready as today. On a switch, Font.loadAsync the new faces, THEN apply. An API for the Vibes sheet: when it opens, Font.loadAsync each vibe's one picker numeral face and resolve when loaded. Weight snapping and minLh per family (N1 made face() token-driven).
4. tools/verify-vibe-switch.mjs (new): on rn-render, with the real module stores, start a live session (sets, a running rest timer) and a food day, switch to a SYNTHETIC test vibe built in the verifier from v1 (changed colours, a fake font family registered as loaded) and back to v1 mid-session; prove the session, its sets, the rest timer and the food day are all still there; that T's top-level objects are fresh objects after each switch (identity changed) and no nested object was mutated (deep-freeze the old T before switching — nothing throws — and compare); that after switching back the host-prop dump equals v1's; that the pathname is preserved; and that SheetHost's open sheet survives the switch.
5. verify-vibe-v1 byte-identical, theme identity, full suite in three zones. Commit "engine(wip): a vibe switch is a keyed remount; fonts load before they apply (V59 §6.4-6.5)". Return what you did, the switch verifier's check count, suite results, what's left.`

const N4 = `${COMMON}
===== YOUR SHARE: N4 — metrics, image slots, card skins, component variants =====
RESUMING: a previous N4 agent hit the account's usage limit mid-work. It committed 3df34f1 "engine(wip): the Coach card's metrics per look, and T.fit for the measured surfaces (V59 §6.6)" (item 1 DONE: coach-view metrics + verify-coach-surface Z 477/477; also T.images slots + src/ui/HeroPhoto.jsx + src/ui/variant.js, wired into the Coach card only) and left UNCOMMITTED edits in ~20 files (tabs food/steps/weight/workout index/session/summary, gates paused/waiting, Btn, Card, Segmented, Stat, Setup, TourOverlay, settings Row/index, train routines/stats, you Hero/bits). Its stated next steps: the photo layer at the other six heroes, T.cardSkin at the hand-rolled cards, the variant switches, and a verify-vibe-seams verifier. Read \`git -C ${WT} show 3df34f1\` and \`git -C ${WT} diff\` first; judge each uncommitted edit against this brief (verify-vibe-v1 must stay byte-identical), commit what is right, then finish the rest. Also still open from N3: routing the ~80 system-font Text sites through \`...T.systemFace\` (candidate list: ${NIGHT}/tools/n3-sysface-scan.mjs; sign-in stays v1) — do it. Before your final commit: rebase onto vibes/proof (now 7180d40: 212 scenes / 25,516 hosts, pinned baseline) and vibes/contract (now ce4e056), and run verify-theme-identity with --require-build.
1. The Coach card's height is load-bearing. src/pure/coach-view.js (native-only, NOT pinned) holds CARD_FACE / FACE_AT / FACE_MAX (Archivo 600/400 advances used by textLines and finishFit) and CARD_PAD 14, CARD_BORDER 1, CARD_TYPE (used by cardLayout). Add an OPTIONAL metrics argument ({face, pad, border, type}) to cardLayout / textLines / finishFit, defaulting to today's constants; extend tools/verify-coach-surface.mjs to prove the default path is unchanged (same outputs for the same inputs, and a metrics object equal to the defaults gives identical results). Same optional-metrics treatment where verify-custom-movement and verify-estimate-row depend on Archivo 600 advances (only if the code path takes metrics; otherwise document that those surfaces keep Archivo in every vibe). A vibe that changes the Coach card's font/padding/border/type will supply its own advance table generated from its vendored TTF with tools/lib/ttf-advance.mjs.
2. Images behind hero boxes: Card and the hero components (You Hero greeting block — you/Hero.jsx; CoachCard — coach/Card.jsx; the Start-workout zone — workout/index.jsx; the summary hero — workout/summary.jsx; the Fuel summary card's big number — food.jsx; Steps TodayCard — steps.jsx; the Weight log card — weight.jsx) accept an image slot from the vibe (T.images.<slot>: {source, focal {x,y}, scrim {…}} or null). With NO image (every v1 box) the component renders the IDENTICAL host tree: no wrapper View, no extra key, no undefined-valued style keys (verify-vibe-v1 must stay byte-identical). With an image it renders RN core ImageBackground + an expo-linear-gradient scrim (both already linked; no new dependency). Make it one small shared helper.
3. The 22 hand-rolled card Views (backgroundColor: T.colors.bar etc.) get the shared T.cardSkin() fragment (background, border, radius) — do NOT convert them to <Card> (that changes padding and margins). Find them with an AST scan; v1 output identical at each site.
4. Component variants — FIRST read ${NIGHT}/design/VOCAB.md if it exists (Phase D's component vocabulary: the block names and the variant names each block accepts); use its names exactly, and if a block it names isn't in the list below, add it. About 20 shared building blocks branch on T.variant.<block>, and the v1 branch is today's JSX moved over UNCHANGED: Card, YouCard, Section header, Eyebrow/labels, StatRow (e.g. 3 tiles / inline ledger / 1+2), Btn, Chip, Segmented, SettingsRow, the Sheet host and SheetTitle, the Dock skin (glass / solid / rail), the screen header, Kpi, the You Hero, the Coach card (skin only), chart styling. Keep it light: a variant switch at the top of each block (v1 → today's JSX, byte-for-byte the same element tree), with the non-v1 branches left for the deep vibes to fill (a non-v1 value falls back to v1 until a vibe provides it). Record the block list and each block's accepted variant names in a comment at the switch and in your report (Phase D reads it).
5. verify-vibe-v1 BYTE-IDENTICAL, theme identity, the three lints, verify-vibe-switch, full suite in three zones. Commit "engine(wip): coach metrics, hero image slots, card skins and component variants (V59 §6.6-6.9)". Return what you did, the variant block list with names, the image-slot API, suite results, and ANYTHING in §6 that is still not done.`

const REPORT = {
  type: 'object',
  properties: {
    commit: { type: 'string' },
    rebased_onto_proof: { type: 'string' },
    done: { type: 'array', items: { type: 'string' } },
    decisions: { type: 'array', items: { type: 'string' } },
    counts: { type: 'object' },
    verifiers_added_or_touched: { type: 'array', items: { type: 'string' } },
    suite: { type: 'string', description: 'per zone pass/total + batteries + verify-vibe-v1 + theme identity' },
    left: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['commit', 'rebased_onto_proof', 'done', 'decisions', 'counts', 'verifiers_added_or_touched', 'suite', 'left', 'risks'],
}

const STEPS = [
  { key: 'N1', phase: 'N1 theme', brief: N1 },
  { key: 'N2', phase: 'N2 reads', brief: N2 },
  { key: 'N3', phase: 'N3 switch', brief: N3 },
  { key: 'N4', phase: 'N4 shapes', brief: N4 },
]
const RATE_NOTE = "\nKNOWN PRE-EXISTING RED (not yours to fix; don't touch it): the rate-band verifier (native tools/verify-rate-band.mjs, web tools-check/rate-band.mjs) currently FAILS under TZ=Pacific/Auckland on the UNTOUCHED base trees (1cb6498 / 928a65e) — New Zealand's daylight saving starts 27 Sep 2026. Treat an Auckland rate-band failure as acceptable ONLY if the base tree (/Users/micahflunker/dev/vibes-night/wt/nat-base or wt/web-base) fails it the same way when run right after, in the same zone; report both results.\n"
const reports = []
for (const s of STEPS) {
  phase(s.phase)
  const prior = reports.length ? `\n\n===== REPORTS FROM THE RELAY SO FAR =====\n${reports.map(r => `${r.key}: ${JSON.stringify(r.report, null, 1)}`).join('\n\n')}\nIf an earlier share left something in "left" that belongs to it and blocks you, finish it first and say so.` : ''
  const r = await agent(`${PREAMBLE}${s.brief}${s.key === 'N1' ? '' : RATE_NOTE}${prior}`, { label: `${s.key}`, phase: s.phase, schema: REPORT })
  if (!r) { log(`${s.key} returned nothing — relay stops here`); break }
  reports.push({ key: s.key, report: r })
  log(`${s.key}: ${r.commit} — ${r.suite}`)
}
return { reports }
