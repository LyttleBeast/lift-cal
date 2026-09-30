# VIBES-PROMPT.md: Vibes: the engine, v1, and seven new looks (rack-v59 · buildNumber 59)

Commissioned 25 Sep 2026, late night. This is the build brief for **one Claude
Code session running all night in ultracode**: one terminal, many agents,
orchestrated with workflows. It works in **two trees**:

- **Web:** `~/dev/ship-v59`, a full, fenced clone of lift-cal at `928a65e`
  (**rack-v58**, live; that commit is v58's docs). This is the session's home
  folder.
- **Native:** `~/dev/rack-mobile` at `1cb6498` (**buildNumber 58**, level with
  rack-v58, pushed).

It also uses one scratch folder, `~/dev/vibes-night/`. It is not a repo, and it
already holds `research/ tools/ wt/ proof/ gallery/`.

Nobody is watching. Micah reads `VIBES-REPORT.md` and walks the gallery in the
morning, before he pushes anything.

**Companion file: `VIBES-CODEMAP.md`** (in `~/dev/vibes-night/`, and copied
beside this file). It is Cowork's read-only map of both trees, made tonight:
styling, screens, settings, storage, verifiers, fences and assets, with
file:line references.
- It is ~150 KB. **As orchestrator, read its header and section headings, then
  give each agent the sections its job needs.**
- **Line numbers drift, so re-verify before you edit. The code beats the map.
  This prompt beats the map** (see the superseded-advice list in §3.3).

---

## 0. Ground rules (the fence)

- **No push, deploy or publish.** No `git push`, `wrangler`, `firebase`, `eas`,
  `gh`, `gh-pages`. Commit through the hooks, never `--no-verify`.
- **Three canaries at the start, and again on every resume. Log all three
  results. If any one runs, stop.**
  - `echo GUARDTEST ping` must be refused (deny list).
  - `echo GUARDTEST-MOBILE ping` must be refused (deny list).
  - `echo hookcheck wrangler` must come back **"BLOCKED by deny-compound"**.
    This proves the PreToolUse hook is live and not failing open.
- **The hook (`~/dev/deny-compound.mjs`)** blocks any Bash command whose *text*
  contains a fenced word anywhere, even inside a path, a grep pattern or a
  commit message. The words are `firebase`, `wrangler`, `eas`, `curl`, `wget`,
  `sed -i`, `git push`, `--no-verify`, a whitespace-led `-…n` flag inside
  `git commit`, and redirects into `.claude/`. So:
  - search with the **Grep tool**, never with Bash;
  - **always commit with `git commit -F <file>`**, the message written with
    Write (the hook can't see file contents);
  - stage by directory when a file name contains a fenced word (e.g.
    `git add report/btn-44/fakes`);
  - write outputs under `~/dev/vibes-night`, never by redirecting.
- **If a required action is refused** (by the deny list, the hook, or auto
  mode), **don't retry it in other words.** Log it, take the documented
  fallback, and move on.
- **Where any CLAUDE.md or AGENTS.md says "stop and ask"**, nobody is here to
  answer. Log the question under "decisions left to Micah" and skip that one
  item.
- **Files go through Read, Edit, Write and Grep.**
  - Bash runs only these:
    - `node`, including the verifiers under `TZ=…`;
    - `python3 -m http.server --bind 127.0.0.1`, and headless Chrome, both
      through the harness;
    - `sips`;
    - git: read-only commands, plus `git add` **with explicit paths**,
      `commit -F`, `merge`, `rebase`, `branch`, `worktree`, and `fetch web`
      (in rack-mobile);
    - `ln -s` and `rm` of a worktree's `node_modules` symlink (§3.2);
    - `mkdir` under `~/dev/vibes-night`;
    - `kill` / `pgrep` for this night's own harness processes.
  - No `sed`, `awk`, `cat`, `wc`, heredocs, `tee`, or pipes into
    `grep`/`head`/`tail`.
- **Network, and nothing else:**
  - WebSearch/WebFetch for research;
  - a `node` script using `fetch()`, to the hosts in §14 only;
  - `npm --prefix ~/dev/vibes-night/tools install <pkg>` for dev tools;
  - `git -C ~/dev/rack-mobile fetch web`;
  - the harness's Chrome loading fonts (§7.1 pins Archivo locally anyway).
- **No npm install into either app.**
  - Web has no `package.json` and must not get one.
  - Native gets **no new dependency**: `package.json`, the lockfile, `app.json`
    plugins and `ios/` stay untouched.
  - Dev tools (an image tracer, a font subsetter, a PNG encoder, Chrome for
    Testing) go only in `~/dev/vibes-night/tools`, with the reason logged.
  - macOS `sips` is the first choice for image work.
- **No native builds:** no `npx expo run:ios`, `expo prebuild`, `pod install` or
  `xcodebuild`. Micah rebuilds in the morning.
- **Never open** `~/dev/rack-worker`, `~/dev/rack-food`, `~/live`, or any
  `~/dev/ship-v*` other than `ship-v59`. Native reads web through the
  `ship-v59` files in this same session, or through
  `git -C ~/dev/rack-mobile show web/main:<file>`.
- **Unchanged by one byte** (the fence also denies edits to them, in the main
  trees and in `~/dev/vibes-night/wt/**`):
  - web `database.rules.json` and `database.rules.OPTIONAL-LOCK.json`;
  - **the pinned pure modules, in both trees:** `exercises.js`,
    `analytics.js`, `tdee.js`, `units.js`, `accounts.js`, `insights.js`,
    `estimate-origin.js`, `estimate-ask.js`, `coach.js`, `coach-build.js`,
    `coach-live.js`, `coach-prog.js`, `coach-goal.js`, `coach-overlap.js`,
    `coach-ready.js`, `coach-fuel.js`, `coach-volume.js`, `coach-tags.js`.
    Their colours are mapped **at the call sites** (§5, §6).
  - **Not pinned** (native-only view modules): `src/pure/coach-view.js` and
    `src/pure/recap-view.js`. `coach-view.js` may gain an optional metrics
    argument (§6.6).
- **Delete nothing** except your own scratch under `~/dev/vibes-night/`, your
  own worktrees, and worktree `node_modules` symlinks.

**Micah's rules:**

- A wrong number, or an untrue sentence, is worse than none.
- Web is the guinea pig and native is the destination. Judge every visual
  decision by how it lands **on the phone**.
- Logic and data shared by both clients live in **pure modules copied
  verbatim** into native, sha256-pinned, with a `verify-*-verbatim.mjs`.
- Add no gate and remove none. Every vibe is for everyone.
- **Vibes change how Rack looks, never what it says or does.** No copy changes,
  no feature changes, no data changes (except the one new setting in §8).

**Precedent you must not repeat:** on 3–4 Sep an unattended "improvement pass"
re-tokenised the colours and deployed per phase. Micah had it **reverted in
full**. Tonight is different on purpose: nothing deploys, v1 is **proven**
identical before anything else lands, and every phase is its own commit, so
any single piece can be reverted without touching the others.

---

## 1. The situation: what Micah wants, in his words

> "I want tonight to be like a all night run … lots and lots of research into
> optimal layouts for menus and colors and designs and layouts. Then I want you
> to build the engine for how all of this is going to run off of so after the
> engine is built I could open the app and it would look like absolutely
> nothing changed. No layouts changed, no colors, fonts or anything is changed.
> Then I want you to save how the app currently looks as the vibe and it being
> named 'v1'. The menu for changing vibes will be in the settings."

> "… make 5 other vibes, 3 of them simply being either different colors and or
> fonts but it still looks like the same layout kinda but a different theme.
> And the other 2 go really deep into designing a layout that doesn't look ai
> made … these should look good but like when someone looks at them you cant
> tell claude or chatgpt or anything made them."

> "I also really like the Iron Age, add that, put a lot of effort into that vibe
> specifically also. It would be really cool if there were like cool icons made
> with that. There should never ever be any ai generated photos. … This is
> going to be the thing that adds polish to the app."

On Sept 25 he named the feature **Vibes** in Settings, not "themes". He also
said a friend can already tell Claude made Rack "from the art style". Rack
goes to the App Store in November, and his content (videos of the app) starts
Oct 2. **The native app is what gets advertised.**

### His decisions tonight (made with Cowork; don't reopen them)

1. **Eight vibes in all.** See §2.
2. **"Same order, new shapes"** is the rule for the deep vibes and Iron Age.
3. **One experimental gym vibe may rearrange boxes.** It may never rearrange
   the bottom tab bar (the dock).
4. **Both apps get Vibes in this run**, from one shared definition.
5. **Light vibes are allowed.**
6. **Research picks** the three simple vibes' themes.
7. **The experimental gym vibe gets its own gym style,** not a remix of Iron
   Age.
8. **Allowed art:**
   - real photos published before 1931;
   - icons traced from real pre-1931 engravings;
   - vector icons drawn in code;
   - textures made by code.
   
   **AI-generated images are banned, no exceptions** (§14).

### Decisions Cowork made on his standing instruction ("make the call when it can't break anything"). His to reverse.

- **v1 stays the default for every account.** Nobody sees a change until they
  pick a vibe.
- **The choice is saved per account** at `users/{uid}/settings/vibe`; the web
  keeps a device hint for its first frame (§8). No live rules change is
  needed.
- **The picker lives in Settings,** in a new section **"Look"** with one row,
  **"Vibes"**, showing the current vibe's name.
- **A "Licences" row** goes in Settings → App, as **its own commit in Phase F**
  (§15). Rack already owes one: its gear icon is Feather's (MIT), and Archivo
  is OFL. Neither notice ships today. It is **mandatory** if any new font or
  photo is committed.
- **Out of scope:**
  - per-vibe app icons (they need a new native module);
  - the native launch screen and the PWA manifest colours (fixed at build or
    install time);
  - any change to words on screen. The "·" separators are a copy tell; list
    them for later.

---

## 2. The lineup: eight vibes

| # | id (final ids: lowercase, `^[a-z0-9][a-z0-9-]*$`, ≤ 32 chars) | Kind | Layout rule | Priority |
|---|---|---|---|---|
| 1 | `v1` | Today's look, exactly. Label **"v1"**, described as "The original Rack look." | unchanged | engine gate |
| 2 | `iron-age` | **Deep + art.** Iron Age: old-time physical culture, about 1880–1930. Real pre-1931 photos behind the hero boxes, icons traced from period engravings, period type, paper and ink made by code. **Most effort of the night.** | same order, new shapes | 1st |
| 3–5 | chosen by research | **Simple.** New colours and/or fonts (plus at most small shape tokens such as radius or border weight). Same layout. Three clearly different themes. Light is allowed; research decides. | same layout | 2nd |
| 6–7 | chosen by research | **Deep.** A full visual redesign that does not look AI-made. | same order, new shapes | 3rd |
| 8 | chosen by research | **Experimental gym.** A different gym style from Iron Age (research picks, e.g. meet-day scoreboard, 90s hardcore gym, chalk-and-whiteboard). Shown in the picker with an **"Experimental"** tag. | **may rearrange** | 4th (its engine part starts early, §12) |

**"Same order, new shapes"** means:

- **Allowed to change:**
  - how every box looks: surface, border, corners, shadow, padding, spacing
    density;
  - fonts, sizes, case, letter-spacing, number styling;
  - header treatments, dividers, icons;
  - component variants, e.g. a three-stat row drawn as tiles, as a ledger
    line, or as a scoreboard;
  - images and textures behind hero boxes.
- **Must stay the same:**
  - every screen shows the same boxes, **in the same order**;
  - every control stays in the same place and does the same thing;
  - nothing is added or removed.

**"May rearrange"** (experimental only) means:

- **Allowed:** within a screen, reorder, merge or split boxes, and use its own
  component variants.
- **Not allowed:**
  - removing or adding a feature;
  - changing navigation, or hiding a control;
  - **touching the dock's tabs, their order, or its position.** The dock's
    *skin* may change; its structure never does.

**Every vibe must:**

- keep every number and word identical;
- keep touch targets at 44 or taller;
- keep text readable (§13);
- keep the Coach card's text fitting correct (§6.6);
- work offline.

---

## 3. The shape of the night (how to run it)

**Use workflows for everything substantive.** You are the orchestrator.

- Fan out research, design panels, per-vibe builds and every verification to
  agents, and pipeline where stages don't need each other.
- Use a barrier only where a stage truly needs every earlier result.
- Put adversarial verification on the claims that matter, with the burden of
  proof in §7.7.

```
Preflight + capability check (§3.4)
   │
   ├─ R  Research (≈10 agents) ─────────────────────────────┐
   │                                                         │
   └─ E0 Contract: v1 defs + icons + registry (one agent) ───┤
          ├─ E  Engine, web    (one engine agent, branch) ── Pweb ──┐
          └─ N  Engine, native (one engine agent, branch) ── Pnat ──┤
                                                                     │
      D  Design specs (needs R + E0; runs while E/N/P finish) ───────┤
      X  Composition extension for the experimental vibe (after Pweb/Pnat, own branch)
                                                                     ▼
      S  Settings → Look → Vibes (per tree, after that tree's P)
      V  Build: iron-age → simple ×3 → deep ×2 → experimental  (pipelined, per vibe)
            each vibe → Q gates → commit                   (as each finishes)
                                                                     ▼
      F  Licences (own commit) · docs · report · gallery
```

- **Gate per tree.**
  - The web engine lands on web `main` when **Pweb** is green. Native's lands
    when **Pnat** is green.
  - Web vibes, the pure defs and the gallery proceed once Pweb is green.
  - Each vibe's native presentation lands once Pnat is green. If Pnat never
    goes green, the report lists every vibe as **"native pending"**, and
    nothing visual lands on native.
- **Priority when time runs short**, most important first:
  1. P green on a tree
  2. S
  3. Iron Age
  4. the three simple vibes
  5. the two deep vibes
  6. the experimental vibe
  7. Licences

  Licences is mandatory whenever a new font or photo was committed.
- **A vibe that can't meet §13's bar is not committed.** Leave it on its
  branch, write down what's missing, log it as **abandoned**, and keep going.
- **Long commands:** a Bash call is capped at 10 minutes. Run the full
  verifier suites and harness passes in the background, writing to
  `~/dev/vibes-night/proof/<run>/*.log`, and poll the logs. Or shard them
  (one time zone, or one scene batch, per call).
- **Verifier counts at the start:** web **52** (`tools-check/*.mjs`) plus the
  `node --check --input-type=module` loop; native **81** (78
  `tools/verify-*.mjs` + `rules/prove`, `rules/verify-delete-coalescing`,
  `rules/verify-generator-level`).
  - Count them yourself. Run all of them in `America/New_York`, `UTC` and
    `Pacific/Auckland` before touching anything, and log the baseline.
  - The held batteries stay unchanged, all `/0/0`: coach-prog 57+16,
    overlap 24, ready 46, fuel 16, finish 12, volume 72.
  - **Every commit on `main` leaves every verifier green in all three
    zones.** Work-in-progress commits on branches may be red.

### 3.1 Memory and resuming

Keep `~/dev/vibes-night/VIBES-LOG.md` current after every sub-step. It
records:
- each tree's `main` HEAD sha, and every live branch and worktree path;
- the last green sub-step, and what's in flight;
- harness PIDs and ports;
- the baseline file paths in `proof/`;
- every decision you made, with a one-line reason;
- every verifier count, and every refused action with the fallback taken.

After any context compaction, re-read `VIBES-LOG.md` and the current phase's
section of this prompt before acting.

**If `VIBES-LOG.md` already exists when you start, you are resuming:**
- **Don't** require `928a65e` / `1cb6498`. Instead, require each tree's HEAD
  to equal the last `main` sha the log recorded, and to descend from
  `928a65e` / `1cb6498`.
- Re-run the three canaries.
- Free ports 8765 and 9333: kill the harness PIDs the log recorded. Never
  kill anything else.
- If a `.git/index.lock` exists and `pgrep -x git` is empty, log it and
  **stop**: Micah removes it in the morning.
- Then continue from the last green sub-step.

### 3.2 Parallel writers and worktrees

- **Don't use a workflow's `isolation: 'worktree'`.** It places worktrees
  under `.claude/`, where the fence and hook get in the way, and it may branch
  from `origin/main` rather than your HEAD.
- **You create every worktree yourself, from the current HEAD:**
  - `git -C ~/dev/ship-v59 worktree add ~/dev/vibes-night/wt/web-<name> -b vibes/<name>`
  - `git -C ~/dev/rack-mobile worktree add ~/dev/vibes-night/wt/nat-<name> -b vibes/<name>`
  
  Give each agent the **absolute path** of its worktree.
- **rack-mobile worktrees need `node_modules`.**
  - Link it in:
    `ln -s ~/dev/rack-mobile/node_modules ~/dev/vibes-night/wt/nat-<name>/node_modules`.
    The symlink is **untracked**; `.gitignore`'s `node_modules/` only
    matches directories.
  - **Never** use `git add -A`, `git add .` or `git add :/` in any worktree.
    Stage explicit paths only.
  - Before every merge, run `git -C ~/dev/rack-mobile diff --name-only main...vibes/<name>`
    and refuse the merge if `node_modules` appears.
  - To retire the worktree, `rm ~/dev/vibes-night/wt/nat-<name>/node_modules`
    (the link only, no trailing slash), then `git worktree remove` with no
    `--force`.
  - Apply all of this to the `1cb6498` baseline worktree (§7.3) too.
- **Who edits what.**
  - During E and N, exactly **one engine agent per tree**, on its own
    branch/worktree, owns `theme.js` / `rack.css` and the engine files.
  - From P onward, **only you** edit the shared files: `theme.js`,
    `rack.css`'s `:root`, `index.html`'s `<link>` lines, the vibe registries
    and the Settings hubs. Only you merge into `main`.
  - Vibe agents write only their own vibe's files.
  - Keep history linear, and never force anything.

### 3.3 Every agent brief starts the same way

Workflow agents never see this file. Every agent brief **starts with §0
verbatim, then Micah's rules, then this superseded-advice list, then the
staging rule from §3.2**, and only then the job plus the codemap sections it
needs.

**Codemap advice that this prompt supersedes:**
1. "Make the vibe device-local" / "add a `rack:device:` prefix to ls.js."
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

### 3.4 Preflight and capability check (minute one)

1. **Trees.**
   - `ship-v59` HEAD is `928a65e`, it is a full (non-shallow) clone, and there
     is no `.git/index.lock`.
   - `rack-mobile` HEAD is `1cb6498`, `app.json` buildNumber is `"58"`, and
     there is no `.git/index.lock`.
   - `git -C ~/dev/rack-mobile fetch web`, then `web/main` is `928a65e`.
   
   **Stop if any fails**, unless you are resuming (§3.1).
2. **Canaries:** all three (§0).
3. **Each required action, once, on a throwaway worktree:**
   - `worktree add`, `ln -s`, `rm` of the link, `worktree remove`;
   - one `npm --prefix ~/dev/vibes-night/tools install`;
   - one node `fetch()` from `raw.githubusercontent.com`;
   - one `sips`;
   - one harness smoke run (server + Chrome + one scene);
   - one WebSearch;
   - one Write in each tree and in `vibes-night`.
   
   Log what was refused and pick each fallback now.
4. **Chrome.** Is `/Applications/Google Chrome.app` present? If not, install
   Chrome for Testing into `~/dev/vibes-night/tools` with
   `@puppeteer/browsers` (run its CLI with node; host
   `storage.googleapis.com`), and set `CHROME=`.
   - Launch Chrome with `--use-mock-keychain`.
   - If no Chrome can be had at all, Pweb cannot go green: log it, run
     everything native, and say so at the top of the report.

---

## 4. Phase R: research (deep, parallel, sourced)

Write everything to `~/dev/vibes-night/research/`, one file per track, with
**every source you actually opened** listed as a URL. Search snippets are not
sources. Use WebSearch and WebFetch generously. Each track returns concrete,
usable output (values, rules, do/don't lists with examples), not essays.

**Reference screenshots.** WebFetch returns text, not images. To actually
*see* a reference layout:
- a node `fetch()` script may save App Store screenshots
  (`apps.apple.com`, `*.mzstatic.com`) and the named apps' own press-kit
  images into `~/dev/vibes-night/research/refs/`, with the source URL beside
  each file;
- agents look at them with Read.

They are **study-only**: never copied into either tree, the gallery or any
vibe asset, and never committed.

1. **AI-made tells.** What makes an interface read as made by Claude,
   ChatGPT, v0, Lovable, Bolt and similar tools?
   - Palettes, gradients, glassmorphism, the "one accent on dark graphite"
     look.
   - Uniform rounded cards with 1px borders; tiny uppercase letter-spaced
     eyebrow labels; rows of three stat tiles.
   - Symmetric stacks; icon-in-a-circle; pill badges everywhere; generic
     icon sets; emoji; sparkles; "hero number + small caption" tiles.
   - The same spacing everywhere; no texture, no photography, no hierarchy
     surprises.
   - Then **audit v1 against the list** using the census in the codemap's
     Screens section 4. Rack has ~300 uppercase labels on native, 19
     three-tile stat rows, and one card recipe used everywhere.
   - Output: a **never-do list** and a **do-instead list** for the new vibes.
2. **Menus and layouts in the best iOS fitness apps:** Strong, Hevy,
   MacroFactor, WHOOP, Strava, Apple Fitness, Gentler Streak, Fitbod, Alpha
   Progression, Boostcamp and Liftosaur. For each: information hierarchy,
   density, lists vs cards, how numbers are shown, sheets, settings structure,
   and what makes it feel designed by a person.
3. **Beyond fitness:** apps and print known for distinctive, human
   typography and layout.
   - Apps and product design: Flighty, Things, Apple Weather, Teenage
     Engineering product UI, Bloomberg-style density.
   - Print: sports broadcast score bugs, Swiss/International style, old
     almanacs and sports programmes.
   - What transfers to a phone logbook?
4. **Colour.**
   - Building palettes by role (surface, text, accent, data, status).
   - WCAG 2.2: 4.5:1 for text, 3:1 for large text and UI.
   - Colour-vision deficiency: about 1 in 12 men, and most of Rack's users
     are men. Rack's plate colours are red, blue, yellow, green, white and
     chrome, and red/green means up/down in places.
   - Dark vs light grounds; how a light vibe survives the web app's
     always-white iPhone status bar (§10).
   - Output: candidate palettes, with every role filled, for the simple and
     deep slots.
5. **Typography.**
   - **Free, OFL-only** families good for a numbers app: real tabular
     figures, strong numerals, and condensed or wide cuts for headings.
   - For each candidate, record:
     - licence (confirm `google/fonts/ofl/<name>/METADATA.pb` says OFL, and
       note any Reserved Font Name);
     - whether a **variable font with a `wght` axis** exists (web needs it);
     - whether **static TTF instances** exist (native needs them);
     - glyph coverage of `’ — · – … × “ ” → ⚙ › ✕ ⋯ ✓ − ‹ ↳ ↑ ↓ ÷ ±` (or what
       falls back);
     - x-height and width versus Archivo.
6. **Gym visual language:**
   - IPF calibrated plate colours;
   - chalk, knurling, rubber flooring;
   - meet scoreboards and attempt cards;
   - old gym posters;
   - varsity lettering;
   - the gym whiteboard;
   - 80s and 90s hardcore-gym signage;
   - weightlifting-federation graphics.
   
   Output: pick **one direction** for the experimental gym vibe, with
   reasons, plus a supporting list for Iron Age.
7. **Iron Age, the period.** Physical culture from about 1880 to 1930:
   - Sandow's *Strength and How to Obtain It* (1897), Saxon, Cyr,
     Hackenschmidt, Inch;
   - *Physical Culture* and *Health & Strength*;
   - period typography (wood type, Clarendon/slab, engraved and Didone
     faces), ornament, rules, engraving and halftone textures, ink on cream
     stock.
   
   Output: a visual spec vocabulary for Iron Age.
8. **Iron Age sourcing.** Find **at least 30 candidate images**: photos, plus
   engravings of dumbbells, globe barbells, Indian clubs, kettlebells, rings,
   chest expanders and scales. Each must pass §14, recorded in draft
   `PROVENANCE.json` form.
   - Download with a node `fetch()` script to `research/iron-age/originals/`.
   - **If the hosts are unreachable,** write
     `~/dev/vibes-night/IRON-AGE-SHOPPING-LIST.md` (item page URL + what to
     save + target file name) and carry on. Iron Age still ships on textures
     and icons, with its photo slots empty and clean (§11).
9. **Apple and platform rules** that bind a visual design:
   - HIG on tab bars, sheets, 44pt targets, Dynamic Type and contrast;
   - App Review 1.1.4 (nudity), 2.5.2 (vibes are data, never downloaded
     code) and 5.2.1 (IP).
10. **Menus and settings specifically:** grouped lists, row anatomy, picker
    sheets with live previews, how the best apps present theme choosers
    (Apollo, Things, Ivory, Overcast, Flighty). Output: the Vibes picker
    design (§8.3).

Then run a **synthesis agent** to write `research/SYNTHESIS.md`: the rules
every new vibe follows, the never-do list, and the candidate directions per
slot. Follow it with a **completeness critic**: what wasn't researched, which
claims are unsourced. Fill the gaps once, then move on.

---

## 5. Phase E0 + E: the contract, then the web engine (`ship-v59`)

### E0: the contract (one agent, before E and N fan out)

In `ship-v59`, write three pure modules. **They import nothing.** All colours
are 6-digit hex, and alphas are numbers.
- `vibes/defs/v1.js`: **every token role with its v1 value.** That means
  every native `colors` / `tint` / `alpha` / `type` / `face` / `radius` / chrome
  slot, plus the web channel and one-off tokens. Derive it from both
  codemaps' styling sections and the code.
- `vibes/defs/index.js`: the registry, `normVibe()`, `list()` and
  `hexToRgb()`.
- `vibes/icons/v1.js`: **exact copies** of today's icons as path data on the
  24×24 viewBox, with stroke widths:
  - the dock's 5 (`index.html` / `Dock.jsx`);
  - `ICON_PATHS` (`food.js` / `food/common.jsx`);
  - the three gear variants and the calendar;
  - the Coach bubble and lock.

Commit E0 on a branch. Then copy the three files **byte for byte** to
rack-mobile `src/pure/vibes/`, with `tools/verify-vibes-verbatim.mjs`
checking the pinned sha256s. After Micah pushes web, it also compares against
`web/main`. E and N both build against this contract; D only extends it.

### E: the web engine

**Goal:** every visual value on the website flows through a vibe, and with
`v1` active the site renders **pixel-identical and computed-style-identical**
to rack-v58. The codemap's Web-styling section 9 is the detailed plan.

1. **`rack.css` `:root`: tokenise with identical spellings.**
   - Add channel tokens (`--rack-rgb`, `--accent-rgb`, `--p-red-rgb`,
     `--p-blue-rgb`, `--p-green-rgb`, `--p-white-rgb`, `--shade-rgb`,
     `--lift-rgb`) and rewrite the ~79 raw `rgba()` literals as
     `rgba(var(--x-rgb), a)`, the pattern `.kpi` already uses.
   - Name the one-off hexes (`--ink`, `--ink-plate`, `--ink-go`,
     `--accent-press`, `--on-danger`, `--video-bg`).
   - Radius, shadow, scrim, `--font` and `--font-mono` tokens.
   - **Don't tokenise** `font-variation-settings`, spacing, sizes, padding,
     border widths or motion. They stay literal, and deep vibes override them
     per component in their own files. A new variable font honours the same
     `'wght'` settings, and a missing axis is ignored.
2. **Split `--p-yellow`.** It is today both the **accent** and a **data**
   colour (legs, carbs, fuel/weight, maintain).
   - Add `--accent` and `--focus` as literal copies. Point every accent use
     at them: btn-primary, focus ring, dock mark, today, input focus, FAB,
     accent-color, and the accent tints.
   - `--p-yellow` stays the data colour. Do the same for any other
     double-duty value, e.g. `#14161a` as page and as ink-on-plate.
3. **`touch-target.mjs`'s cascade is strict.** It resolves `var()` only from
   `:root`, one level deep, reads only `rack.css` and `auth.css`, and expands
   shorthands *before* resolving. So:
   - tokens are **single-level literals in `:root`**, spelled exactly as
     before;
   - a token holds **one value**, never a multi-value shorthand;
   - no border width is written as a token;
   - **don't regenerate `touch-target.snapshot.json`** in the engine commit.
   
   **Leave these verifier-asserted lines textually intact:**
   - `.set-row.drop .set-idx { margin-left: 10px; }`
   - `.qty-row .btn { flex: 0 0 54px; padding: 0; }`
   - `.ask-opt` min-height 44px, and `.ask-opt .ob-choice-t` overflow-wrap
   - `.coach-nudge-t` nowrap/ellipsis
   - `auth.css` `.ob-choice` `width: 100%`
   - `index.html`'s Train dock button markup
4. **Hex baked into JS goes through one helper, without touching the pinned
   files.**
   - A new `vibe.js` (it imports only the pure `vibes/defs` and
     `vibes/icons` modules) holds `paint(c)`, which maps the plate hexes
     (**any case**; `exercises.js` uses uppercase) and `#8d939f` to
     `var(--…)` tokens.
   - Wrap every call site that bakes `GROUPS[g].color` / `groupColor(g)` /
     `PLATES` into a style or SVG attribute: access.js, workout.js,
     picker.js, routines.js, coach-ui.js, stats.js and you.js.
   - you.js's RGB channel strings for `--kpi-rgb` become `var(--…-rgb)`.
   - `index.html`'s auth-mark inline hexes become `var(--p-…)`.
   - **Several verifiers copy modules to a tmpdir and rewrite a named list of
     imports** (e.g. drop-sets, coach-surface). Adding `./vibe.js` (and the
     `vibes/` modules) to those lists is expected, in the same commit. List
     each verifier you touch.
5. **Vibe files.** Each non-v1 vibe is:
   - `vibes/<id>.css`;
   - `vibes/<id>/`: fonts, images, icons.
   
   The rules for them:
   - **One source of truth for tokens.** The vibe's
     `:root[data-vibe="<id>"] {…}` block is **generated** from its pure
     definition by a new `tools-check/vibes-css.mjs`. In check mode it fails
     if the committed CSS differs, like the rules generator and
     `verify-generator-level`. It is not a runtime build step. Hand-written
     component rules sit below the generated block.
   - **Scoping lint (new verifier):** every selector in `vibes/<id>.css`
     starts with `:root[data-vibe="<id>"]` or `[data-vibe="<id>"]`. Every
     `@font-face` family name is prefixed with the vibe id; **never reuse
     "Archivo"**. `rack.css` and `auth.css` contain no `[data-vibe]` rule.
   - Watch the **`.set-row` / `.set-row-nav` name clash**; scope accordingly.
   - Link every vibe stylesheet statically from `index.html`, so it is cached
     while online. Only you edit those `<link>` lines.
   - A vibe's fonts are `@font-face` rules in its own file, so they download
     only when used.
   - **Offline:** on selection, prefetch the active vibe's images and fonts.
     On the first online launch after rack-v59, also prefetch **every** vibe's
     picker assets (thumbnail + preview font), within the budgets in §14.
6. **First paint, no flash.** A classic inline `<script>` in `<head>`,
   **before** the stylesheet links (a script after a pending stylesheet waits
   for it). It reads `localStorage['rack:vibe']` inside a try/catch, sets
   `document.documentElement.dataset.vibe` (not for `v1`), and sets the
   `theme-color` meta. Follow the `rack:migrated` precedent for a key outside
   the per-account namespace.
7. **Icons.** `vibe.js` `icon(name)` reads the current vibe's set, falling back
   to v1's.
   - Swap the dock SVGs via JS only when the vibe's set isn't v1. **Leave the
     dock markup in `index.html` byte-identical.**
   - Glyph icons (‹ › ✕ ⋯ ✓ ↳ ✎ ⚙) stay text in v1. A vibe may restyle them
     by class, or route individual sites through `icon()`.
8. **Re-render on switch.** `switchView(current)` re-renders from scratch; open
   sheets repaint through CSS variables. **Never use `location.reload()`**: it
   trips the live-workout `beforeunload` prompt.
9. **Inline sizes.** Since v58 some sizes are inline, e.g. `fontSize` at
   food.js 591/3272, steps 192, water 152 and weight 336/396, and there are
   ~180 inline `marginTop`s. The engine leaves them alone. A deep vibe file
   may override **only those inline values** with `!important`, commented with
   the JS site it beats.
10. **No `element.style.height`, `minHeight` or `maxHeight`** in `index.html`
    or the JS files `touch-target.mjs` section D scans, even for the new
    Settings pieces. Size things with CSS classes.

**Commit (web, on `main` after Pweb):** "The engine: every colour, font and
icon through one vibe; v1 is today, to the pixel".

---

## 6. Phase N: the engine, native (`rack-mobile`)

**Goal:** same as web. With v1 active, every host element renders **identical
props** to buildNumber 58. The codemap's Native-styling section is the
detailed plan.

1. **`src/ui/theme.js` stays the single module every file imports**
   (`import T from '…/theme'`, 80 importers).
   - Add `build(tokens)`: it returns a complete, fresh object (`colors`,
     `alpha`, `tint`, `space`, `radius`, `layout`, `motion`, `face`, `type`,
     `text`, `loadNum`, plus the new semantic slots). **Every function closes
     over the tokens it was given**, never over module bindings. (`tint` and
     `text` are precomputed today, and `type()`'s default colour closes over
     the module's `colors`.)
   - Add `applyTheme(obj)`: it **reassigns `T`'s top-level properties to fresh
     objects**. Never mutate a nested object in place: Reanimated worklets
     freeze captured objects in dev and cache clones by identity.
   - **`theme.js` never imports the vibe definitions.** No relative import at
     all: the stubbed copies used by verifiers live in `tools/` or a tmpdir.
     The new `src/state/vibe.js` imports `src/pure/vibes/…` and calls
     `applyTheme(build(def))`.
   - Keep the v1 literal tables where the text-parsing verifiers expect them,
     or update their loaders in the same commit and say why:
     `verify-text-color` (the exact `import { Platform } from 'react-native';`
     line), `verify-coach-surface`, `verify-keypad-done` (slices
     `export const layout/space`), `verify-top-inset:231`'s `appTop` regex,
     and `sweep-text-metrics` (report only).
2. **New semantic slots, with v1 values equal to today's:**
   - **Split accent from legs:** `pYellow` is today both the accent (79 uses)
     and the legs/carbs data colour.
   - **Split page from onPlate.**
   - **Group colours reproduce each call site's exact string.**
     - `T.group(g)` returns the analytics palette (**lowercase**, `'#8d939f'`
       fallback) where `groupColor(g)` is used today.
     - `T.groupPlate(g)` returns `GROUPS`' **uppercase** hex where
       `GROUPS[g].color` is used today. The call site keeps its own
       `|| T.colors.dim`.
     - `PLATES[].c`, `SUBJECT_COLOR` and `C_*` work the same way: one token per
       source, with the exact string.
   - **Chrome tokens:** `statusBar` ('light'), `keyboard` ('dark'),
     `blurTint` ('dark'), `shadow` ('#000'), `datePicker` ('dark'), and
     `systemFace` (v1 = **no `fontFamily` key at all** at the 76 system-font
     sites).
   - **A sign-in token set** whose v1 values are today's off-theme hexes.
3. **Module-scope captures become render-time reads.** Count them with an AST
   scan (`@babel/parser` is in node_modules). The verified list is 14 files /
   76 refs:
   - `Btn.jsx` BG/FG/BORDER
   - `chart/Ring|Donut|BarChart` text styles
   - `you/bits.jsx` DELTA_FG, PILL_BG, SUBJECT_COLOR, C_*
   - `train/SetRow.jsx` TINT
   - `Splash.jsx` PLATES
   - `food/estimator.jsx` CONF
   - `admin/sheets.jsx` and `you/admin.jsx`
   - `app/_layout.jsx:42` BG
   - `(auth)/sign-in.jsx` BG and `s`
   - `workout/index.jsx` PAIR
   - `Dock.jsx` DOCK_H
   
   Also:
   - **Worklets first:** `SetRow.jsx`'s `interpolateColor` and flash worklets
     capture **hoisted plain strings** from render scope, never `T`. Do this
     **before** any switch path exists.
   - **Raw literals become tokens:** sign-in, the `_layout` banners, the
     `food/common.jsx` tiles, the `you/verdicts.jsx` / `you/cards.jsx` rgba,
     the TourOverlay gradient, and the five `shadowColor '#000'`.
4. **Switching: a keyed remount.**
   - `src/state/vibe.js` follows the house store pattern (copy
     `src/state/units.js`: `current`, `subscribe`, `getVersion`, `useVibe`,
     `initVibe`, `setVibe`).
   - `app/(app)/_layout.jsx`'s `<Stack>` gets a key that includes the vibe
     version. Before switching, capture `usePathname()` and feed it through
     the existing `target`/`router.replace` effect, so he lands on the same
     screen.
   - The root siblings outside that Stack subscribe with
     `useSyncExternalStore`: `SheetHost` (so the Vibes sheet stays open and
     repaints), `TopBars`, `SyncPip`, `ToastHost`, `KeypadDoneBar`, the root
     View's background, and `<StatusBar style>`.
   - The live session, food day and rest timer live in module stores and
     survive. **Prove it** with a verifier that switches vibe mid-session.
5. **Fonts.**
   - v1 keeps exactly today's behaviour: the four Archivo TTFs from the
     package, `face()` returning `Archivo_<wght>` with **width collapsed to
     100**. Don't "fix" width in v1.
   - A vibe's fonts are **vendored static TTFs** under
     `assets/fonts/<Family>/` with their `OFL.txt`, registered as
     `<Family>_<wght>`.
   - At boot, load Archivo plus the **active** vibe's faces, gating `ready` as
     today. On a switch, `Font.loadAsync` the new faces, *then* apply.
   - When the Vibes sheet opens, `Font.loadAsync` each vibe's **one picker
     numeral face** and draw the cards once they resolve.
   - Weight snapping is per family, and so is `minLh` (1.088 is Archivo's).
     Width is emulated by mapping wdth bands to a condensed or expanded cut
     where the vibe has one.
6. **The Coach card's height is load-bearing.**
   - Native `src/pure/coach-view.js` (native-only, **not pinned**) holds
     `CARD_FACE` / `FACE_AT` / `FACE_MAX` (Archivo 600/400 advances, used by
     `textLines` and `finishFit`) and `CARD_PAD 14`, `CARD_BORDER 1` and
     `CARD_TYPE` (used by `cardLayout`). The card is 190/164 at the live
     Dynamic Type size. Web's `.coach-card` is fixed at 190/164px.
   - **The engine may add an optional `metrics` argument** (`{face, pad,
     border, type}`) to `cardLayout` / `textLines` / `finishFit`, defaulting
     to today's constants. `verify-coach-surface` must prove the default path
     is unchanged.
   - A vibe that changes the Coach card's font, padding, border or type
     supplies its own advance table, generated from its vendored TTF with
     `tools/lib/ttf-advance.mjs`, and passes the Coach-surface checks **in
     that vibe**. Otherwise the Coach card keeps Archivo and v1 metrics in
     that vibe.
   - Same rule for `verify-custom-movement` and `verify-estimate-row`, which
     use Archivo 600 advances.
7. **Images behind hero boxes.**
   - `Card`, and the hero components in the codemap's summary table, accept
     an image slot from the vibe.
   - With no image (every v1 box), the component renders the **identical host
     tree**: no wrapper View, no extra key, no `undefined`-valued style keys.
   - With an image, it renders `ImageBackground` (RN core) + an
     `expo-linear-gradient` scrim. Both are already linked; add no new
     dependency.
8. **The 22 hand-rolled card Views** (`backgroundColor: T.colors.bar`) get a
   shared **`T.cardSkin()`** fragment (background, border, radius). **Don't
   convert them to `<Card>`**: that changes their padding and margins.
9. **Component variants.** About 20 shared building blocks branch on
   `T.variant.<block>`, and the **v1 branch is today's JSX moved over
   unchanged**. The blocks:
   - Card, YouCard, Section header, Eyebrow/labels;
   - StatRow (e.g. 3 tiles / inline ledger / 1+2);
   - Btn, Chip, Segmented, SettingsRow;
   - the Sheet host and SheetTitle;
   - the Dock skin (glass / solid / rail);
   - the screen header, Kpi, the You Hero;
   - the Coach card (skin only);
   - chart styling.

**Commit (native, on `main` after Pnat):** `engine: vibes — every colour,
font and icon through one vibe; v1 is build 58, to the prop (V59 §6)`.

---

## 7. Phase P: the proof gates (Pweb, Pnat: v1 did not change)

Take **baselines before any edit**. Commit the verifiers. Keep the large dumps
in `~/dev/vibes-night/proof/` (never in `report/`, which Pages publishes).

1. **Web: pixels + computed styles.**
   - **Parametrise `report/btn-44/measure.mjs`:** `REPO`, `PORT`,
     `CDP_PORT`, and a per-run `--user-data-dir` under
     `~/dev/vibes-night/tmp/<run>`.
     - Fail loudly on a bind error.
     - **Never run two instances at once**; serialise every harness run
       through a lock file in `~/dev/vibes-night`.
     - Before measuring, assert which tree each port serves (`/vibe.js` is a
       404 on base and a 200 on engine).
   - **The base tree** is a worktree of `928a65e` under `wt/`. Generate
     `seed.json` **once** and use it for both trees.
   - **Hold these fixed on both sides:**
     - Inject a fixed `Date` / `Date.now` / `performance.now` via
       `Page.addScriptToEvaluateOnNewDocument` (or
       `Emulation.setVirtualTimePolicy`), and pin the time zone.
     - Stop animations: `Animation.setPlaybackRate({playbackRate: 0})` after
       boot, or emulate `prefers-reduced-motion` on both sides.
     - Blur the active element, so there is no caret.
   - **Fonts: pin Archivo locally.**
     - In the harness's Fetch interception, answer the
       `fonts.googleapis.com/css2?family=Archivo…` request with a local
       `@font-face` (weight 300 900, stretch 62% 125%). Point it at one
       pinned `Archivo[wdth,wght].ttf`, fetched once from
       `raw.githubusercontent.com/google/fonts/main/ofl/archivo/`, with its
       sha256 logged. Serve it identically to both sides.
     - Guard with both
       `(await document.fonts.load('700 16px Archivo')).length > 0` **and**
       `[...document.fonts].some(f => f.family.replace(/["']/g,'') === 'Archivo' && f.status === 'loaded')`.
       (`fonts.check()` alone passes when nothing loaded.)
     - Say in the report that the proof used this pinned file.
   - **Scenes:** the existing 58 at 390 and 320px. Add only the missing
     **summary** and **live session with a drop set** scenes.
   - **Capture per scene and width:**
     - `Page.captureScreenshot` with `captureBeyondViewport: true`;
     - a `getComputedStyle` dump of every element and its
       `::before`/`::after` (excluding `--*`), plus bounding rects and SVG
       attributes.
   - **Control first:** base served on both ports must give **0 pixel and 0
     computed-style differences**. That proves the harness is noise-free.
   - **Then base vs engine: 0 and 0**, both with `data-vibe` absent and with
     `data-vibe="v1"`.
     - Compare screenshot bytes first. If they differ, decode with a small
       node PNG reader (zlib, no npm) and list every differing region.
     - Also assert `rack.css` line 1 (the Archivo `@import`) is
       byte-identical.
2. **Web: verifiers.** All 52 `tools-check` verifiers plus the `node --check`
   loop, in three zones. `touch-target` stays **408/408** against its v1
   snapshot.
3. **Native: host-prop snapshot.** Build `tools/verify-vibe-v1.mjs` on
   `tools/lib/rn-render.mjs`, over `verify-top-inset.mjs`'s 12 screens, plus:
   - the Dock and Tabs layout, SheetHost with the Settings hub, the Coach
     sheet, a live session, the Setup steps, and sign-in;
   - `BlurView`, `LinearGradient`, `StatusBar`, `DateTimePicker` and
     `ImageBackground` as prop-recording stubs.
   
   How to run it:
   - Freeze the clock and any seed inside rn-render.
   - **Control first:** the `1cb6498` baseline worktree compared with itself
     must be identical.
   - Dump each host's type, flattened style and colour/SVG props (`fill`,
     `stroke`, `stopColor`, `placeholderTextColor`, `trackColor`,
     `thumbColor`, `keyboardAppearance`, `tint`).
   - Store the baseline JSON with the sha it was captured at; the engine must
     then be **byte-identical**.
   - Only later phases may re-baseline, and only the specific scenes they
     change (§8.5, §12), with the diff shown in the log and in the commit
     message.
4. **Native: theme identity.** `build(v1)` deep-equals the pre-engine exports:
   - every table;
   - `alpha.*` sampled on a grid of values;
   - `layout` functions on a grid of safe-area insets;
   - all 20 text presets;
   - `face()` for all 31 wdth×wght pairs;
   - `type()` for every argument set found at the 155 call sites (AST);
   - `loadNum` for each size used.
5. **Static lints (new verifiers, both trees):**
   - no colour literal outside the theme/vibe files. The only exceptions:
     `'transparent'`, the pinned pure files, web `store.js`'s refusal banner,
     and `404.html`;
   - no module-scope `T.` read (AST);
   - no `T` captured inside a worklet;
   - web: no `[data-vibe]` in `rack.css` / `auth.css`.
6. **Native: all 81 verifiers** in three zones, batteries unchanged.
7. **Adversarial review, with a burden of proof.**
   - Three independent reviewers per tree each try to show v1 changed.
   - **A finding counts only with a reproduction:** a failing harness scene,
     a snapshot diff, a verifier case, or a code path with a concrete
     before/after value.
   - Each accepted finding gets a regression check, then the fix.
   - **Cap: 3 rounds.** Unreproduced suspicions go in the report's "unsure"
     list, and P proceeds on the measured proofs.

**Pweb is green when 1, 2, 5 (web) and 7 (web) pass. Pnat is green when 3, 4,
5 (native), 6 and 7 (native) pass.** Merge that tree's engine branch to
`main`, and log the numbers.

---

## 8. Phase S: Settings → Look → Vibes, and storage (per tree, after its P)

1. **Storage.** `users/{uid}/settings/vibe` holds a **plain string id**.
   - A pure `normVibe()` turns anything absent, unknown or garbage into `v1`,
     so every existing account stays v1 without a byte written. It is a plain
     `write()`, not a container.
   - **Web:** `initVibe` / `vibe()` / `setVibe()` in `store.js`, modelled on
     `initUnits` / `setUnits`.
     - In `watchAuth`, reconcile to `LS.get('mirror:settings/vibe')` before
       `#auth` hides.
     - `await initVibe()` beside `await initUnits()`.
     - `setVibe` applies instantly and updates the device key, then writes.
       On a refusal it reverts.
   - **Native:** there is **no device key**. The signed-out screens (sign-in,
     the gates) and the JS splash stay v1.
     - Apply the vibe inside root `_layout.jsx`'s `watchAuth` callback,
       after `hydrate`, reading `LS.get('mirror:settings/vibe')` **before
       `setUser(u)`**, while the native splash is still held.
     - `initVibe` beside `initUnits` in `(app)/_layout.jsx`.
     - `resetVibe` in `resetAll` sets the in-memory vibe to v1; the account
       value stays in the database.
     - `StatusBar`, `keyboardAppearance` (every signed-in TextInput) and
       `DateTimePicker` `themeVariant` follow the vibe.
   - **Precedence:** the account value wins. On web the device key is only a
     first-frame hint. The default is `v1`.
   - **Rules:** the live rules need no change (`settings` has its own
     `.write`, and the only `$other:false` is inside `units`). In
     rack-mobile, add this to `tools/rules/build.mjs`'s `settings:` block,
     regenerate the three PROPOSED files with the generator, and keep
     `verify-generator-level` green:
     ```js
     vibe: { '.validate': `newData.isString() && newData.val().length <= 32 && newData.val().matches(/^[a-z0-9][a-z0-9-]*$/)` }
     ```
     Don't use an enum; a new vibe must never need a republish.
   - Document `settings/vibe` in both `AGENTS.md`s.
2. **The Settings row.**
   - A new section **"Look"** with one row, **"Vibes"**, whose value is the
     current vibe's name.
   - It goes before **App** on both clients (web: after Steps; native: after
     Coach).
   - Use the existing helpers (web `section()` + `navRow`; native `Sec` +
     `SettingsRow`, minding `first`).
   - Sheets never nest: the row closes the hub and opens the Vibes sheet.
3. **The Vibes sheet** (design from research track 10):
   - A tall sheet titled **"Vibes"**, with one card per vibe, **v1 first**.
   - Each card is drawn **in its own vibe** from its tokens (no app-wide
     switch): its ground, a sample card with a real-looking number in its
     numeral face, its accent, and for image vibes a thumbnail. Add its name,
     one line on its feel, and "Experimental" where it applies.
   - Tap = apply **instantly**. The sheet stays open, and the current one is
     marked.
   - Works offline (§5.5, §6.5). 44+ targets.
   - The sheet re-renders in the chosen vibe and must be readable in every
     vibe.
   - Size it with classes/styles, never `element.style.height`.
4. **Before any real vibe exists**, the sheet lists v1 alone. Each vibe's card
   appears in the same commit as that vibe.
5. **The visible change to v1 after this phase is exactly one row** (Look →
   Vibes). Re-run P:
   - web: every scene still 0/0 except the Settings hub scene;
   - native: re-baseline **only** the Settings-hub scene, with the diff (one
     added section, one row) shown in the log and the commit message.

**Commits:** web "Settings: Look → Vibes"; native `settings: Look → Vibes
(V59 §8)`.

---

## 9. Phase D: design (from research to seven specs)

Starts when R is done and E0 exists. It runs while E, N and P finish.

1. **The vocabulary.**
   - Extend the E0 contract with the **component variant list**, i.e. what
     may vary per vibe for each shared component: card, card head/eyebrow,
     section header, screen header, sheet + title, stat row, KPI, headline
     number, chip, segmented, the primary/ghost/danger/large buttons, field,
     note, toast, settings row, list rows, set row, set table, plate strip,
     calendar cell, charts, dock skin, FAB, add tiles, rest pill / peek bar /
     live chip, and the Coach card.
   - This, plus the token roles, is the contract every vibe fills.
2. **The design panel, per slot** (the simple ×3, the deep ×2, iron-age,
   experimental).
   - **Three independent concept agents** each propose a complete spec: name,
     the idea in two sentences, every token role, fonts (from research track
     5), shape language, per-component treatments, image slots and scrims,
     icon style, and a list of what it **never** does.
   - **Three judges** score each concept on:
     1. distinct from v1 and from the other vibes;
     2. **"could an AI tool have made this?"** (lower is better);
     3. readability and contrast;
     4. fits Rack: plates, chalk, numbers, a lifter's logbook;
     5. buildable on the engine without breaking its layout rule.
   - Pick a winner and graft the best of the runners-up. Keep the losing
     concepts in the report so Micah can swap one in.
   - The three simple vibes must differ clearly from each other.
3. **Outputs:**
   - `VIBES-DESIGN.md` in `ship-v59`: the rules, the never-do list, and one
     section per vibe;
   - each vibe's **pure definition** `vibes/defs/<id>.js` and icon set
     `vibes/icons/<set>.js`.
   
   These are copied byte for byte to native `src/pure/vibes/` and pinned. All
   colours are **6-digit hex**, because native's `rgba()` helper parses only
   that.

---

## 10. Phase V: build the vibes (pipelined, per vibe)

For each vibe, in priority order (§3), a small team in its own worktrees
works:

1. the **pure definition** (shared);
2. the **web presentation**: the generated token block plus component rules
   in `vibes/<id>.css`, plus assets;
3. the **native presentation**: variant config plus assets, reading the same
   definition.

Then the vibe goes straight into Q (§13). **Pipeline:** vibe A can be in Q
while vibe B is being built.

- **Simple vibes:** tokens plus fonts plus at most small shape tokens.
- **Deep vibes:** tokens, fonts and component variants across the whole
  vocabulary. **Every screen must be covered**, including the ones people
  forget:
  - sign-in and the gates (web only; on native they stay v1);
  - onboarding (8 steps) and the tour;
  - the Coach sheet, live chip and nudge;
  - the add-food sheets, estimator, library and meals;
  - water;
  - the rest pill and peek bar;
  - toasts;
  - the Vibes sheet;
  - the owner-only admin (legible, not necessarily beautiful).
- **Fonts on web** must be **variable with a `wght` axis**: weight is set only
  through `font-variation-settings`, and there are zero `font-weight` rules.
  - Use **self-hosted latin woff2**, with the OFL beside it.
  - Get it from the latin woff2 URL that `fonts.googleapis.com/css2` returns,
    or subset the OFL TTF with a tool in `vibes-night/tools` (e.g.
    `subset-font`), with its version recorded.
- **Fonts on native** are **static TTFs per weight used.**
- **Light vibes:**
  - on web, the installed PWA's status bar text is always white, so keep the
    top safe-area band **dark**;
  - on native, set `StatusBar` to dark, and set keyboards and date pickers to
    light (system alerts stay dark);
  - check the dock blur, the sheet backdrop and every tint on the light
    ground.

**Commits:** one per vibe per tree on `main`, e.g. web "Vibe: Iron Age",
native `vibe: Iron Age (V59 §11)`.

---

## 11. Iron Age (the deepest vibe; Micah singled it out)

- **Feel:** a turn-of-the-century physical-culture manual and gymnasium.
  - Cream or newsprint stock, black and sepia ink, one or two period ink
    colours.
  - Engraved rules and ornament used sparingly.
  - Wood-type / Clarendon / slab or engraved Didone display faces with a
    clean reading face (OFL only).
  - Numbers like a strongman's challenge poster or a stamped scale plate.
  - Research decides light cream vs a dark "ink" ground.
- **Photos:** real pre-1931 photos behind the **hero boxes only**:
  - the You greeting;
  - the Coach card (only if the text stays legible at 190/164);
  - Start workout;
  - the summary headline;
  - the Fuel big number;
  - Steps today;
  - the Weight log card.
  
  **Never** behind set rows, food rows, charts, stat rows or any dense
  numbers. Each photo needs:
  - a **focal point**, so faces and bodies aren't cropped at any box size;
  - a code-made **scrim** that keeps every piece of text at 4.5:1,
    **measured on the actual pixels at the actual crop**;
  - a sepia/duotone treatment done with deterministic operations only.
- **Icons: a complete set.**
  - The 5 dock icons; the gears; the calendar; the Coach bubble and lock;
    the 8 add-food icons; the water vessel if feasible.
  - SVG replacements for the glyphs ‹ › ✕ ⋯ ✓ ↳ ✎ ⚙.
  - Style: period engraving line art with a consistent stroke, as path data
    on 24×24.
  - Where a real pre-1931 engraving exists (dumbbell, globe barbell, Indian
    club, kettlebell, rings, scale), **trace it**: a deterministic tracer
    (e.g. `imagetracerjs`, public domain, in `vibes-night/tools`), then hand
    simplification. Record the source in `PROVENANCE.json`.
  - Otherwise, draw it by hand in code to the same style guide.
  - Every icon must read clearly at 22pt on the dock.
- **Textures made by code:** paper grain, ink bleed along rules, halftone.
  Write a recorded node script and render to PNG, through headless Chrome
  (canvas) or a tool in `vibes-night/tools`, keeping it small. Native can't do
  SVG filters, so textures are PNGs on both clients.
- **If no photos could be downloaded,** Iron Age still ships complete on
  texture, type and icons. Its photo slots stay empty and render cleanly.
  `IRON-AGE-SHOPPING-LIST.md` tells Micah exactly what to save, and a node
  script in `vibes-night/tools` processes and places those files once he
  has.
- **Budget:** photos JPEG q≈70, ≤ 1170px on the long edge, ≤ 150 KB each; Iron
  Age imagery ≤ 1.5 MB total per client.

---

## 12. The experimental gym vibe (may rearrange)

1. **Composition extension (X).** It starts **as soon as that tree's P is
   green**, on its own branch/worktree. It needs only v1's order and the §7
   proofs.
   - Give a **composition list** to each of these screens:
     - the five tab landings (You, Train calendar, Fuel day, Weight, Steps);
     - the workout summary;
     - **the live workout session**: the top-bar zone, the position of the
       exercise-card stack, and where the plate strip sits.
   - Each screen's top-level blocks get names. Render order and grouping come
     from the vibe; `v1` is today's order with no grouping.
   - Prove v1 identical for these screens (§7). Re-baseline nothing.
   - Merge X once each of Iron Age, the simple three and the deep two is
     **committed or logged as abandoned**.
2. **The vibe:** its own gym style (research track 6 picks the direction).
   - It reorders, merges or splits blocks, and uses its own component
     variants.
   - It never removes a feature, never hides a control, never touches the
     dock's structure, and passes every functional verifier.
3. **Fallback is per screen, never for the whole vibe.** Any screen whose
   rearrangement can't be proven safe renders in "same order, new shapes".
   Say which screens at the top of the report.

---

## 13. Phase Q: quality gates (every vibe, both trees, before its commit)

1. **Contrast.** A script walks every text role over every surface role that
   actually occurs (derive the pairs from the code), plus every icon, border
   and focus ring.
   - **Any colour a vibe changes or adds** must meet 4.5:1 for text, and 3:1
     for large text (≥ 18pt, or 14pt bold) and for UI graphics.
   - **Pairs a vibe inherits unchanged from v1** must be no worse than v1.
     (v1's `--dim` #5c6270 is 2.7:1 on `--bar`; list such pairs in the
     report.)
   - Text over images is measured on real pixels at each slot's crop, with
     its scrim.
2. **Colour-vision deficiency.** Simulate deuteranopia and protanopia (Machado
   2009 matrices). The six muscle-group colours must stay distinguishable
   (log the pairwise ΔE), and nothing reads up/down by red vs green alone.
3. **Fit.**
   - Web: the harness at 320 and 390px in this vibe finds no horizontal
     overflow, no clipped text in fixed-height boxes (Coach card 190/164,
     buttons, chips), and 44px targets.
   - Native: `rn-render` mounts every screen and the Vibes sheet in this vibe
     without a crash; `verify-text-color`'s rule holds for this vibe's
     presets; the Coach card fits with this vibe's metrics.
4. **v1 still identical.**
   - **Before each vibe's web commit, re-run the §7.1 v1 harness** (every
     scene, both widths) against the `928a65e` baseline: still 0/0.
   - Native: `verify-vibe-v1` stays green.
   - All verifiers are green with v1 active. Switching into this vibe and
     back mid-workout loses nothing.
5. **Native parity.** A per-vibe verifier: rn-render dumps the resolved
   colours, radii, borders, font family and variant of each vocabulary
   component, and they must match the vibe's pure definition (the same values
   the web CSS was generated from).
6. **The "did an AI make this?" panel.** Render this vibe's gallery
   screenshots (§15). **Three fresh judges**, told to be adversarial and to
   answer "AI-made" if unsure, look for the tells from research track 1.
   - **Hard gate for Iron Age, the two deep vibes and the experimental
     vibe:** two of three must say human-designed. Revise and re-judge, up to
     three rounds. A vibe that never passes is not committed (§3).
   - **For the three simple vibes** the layout is v1's by definition, so the
     judges assess only palette and type. Their verdicts are logged and
     reported, **never blocking**.
7. **Provenance.** An adversarial checker re-verifies every image's
   `PROVENANCE.json` entry from its source page:
   - published before 1931;
   - creator died before 1956, or anonymous;
   - not a colourised or restored version;
   - **the pose passes §14's clothing rule.**
   
   It also re-verifies every font's `OFL.txt` (checking for a Reserved Font
   Name). It rejects on those tests only, and rejects if a test can't be
   confirmed.

---

## 14. Art, fonts and provenance (non-negotiable)

- **No AI-generated imagery of any kind, ever.** That means no image
  generators and no AI upscaling, "enhance", inpainting, colourisation,
  background removal, style transfer or "restoration" services.
  - Allowed operations are deterministic and recorded as commands: crop,
    resize, levels/curves, grayscale, duotone/sepia, grain, halftone, and
    JPEG/PNG/WebP encode.
  - `sips` comes first; a recorded node script is fine.
- **Photos and engravings must pass both tests:**
  1. **published before 1931** (US public domain as of 2026);
  2. the creator **died before 1956, or is anonymous** (the App Store is
     worldwide, and the EU/UK use life+70).
  
  The subject's death date doesn't matter for copyright. Still, never name a
  person anywhere as endorsing Rack.
- **Clothing rule.**
  - **Allowed:** athletes in trunks, tights, leotards, singlets or period
    costume, **bare torsos included**.
  - **Rejected:** any nudity, fig leaves, cloth or drape standing in for
    clothing, and "classical statue" nude poses (App Review 1.1.4).
  - No live trademarks (e.g. Charles Atlas).
- **Allowed sources:**
  - Library of Congress Prints & Photographs, marked "No known restrictions";
  - Commons files carrying PD-US-expired **and** PD-old-70/100, traced back
    to their original;
  - Internet Archive / HathiTrust scans of qualifying books. Cite the book,
    not Project Gutenberg;
  - Smithsonian, Met or Rijksmuseum **CC0**.
- **Forbidden:** stock sites, Pinterest, wallpaper sites, social media,
  colourised or restored versions, anything whose only claim is "found
  online", SF Symbols, and any icon library whose licence we don't ship.
- **Download hosts for node `fetch()`.** Subdomains of a listed host are
  covered (e.g. `www.loc.gov`, `ia*.us.archive.org`).
  - **Assets:**
    - `loc.gov`, `tile.loc.gov`;
    - `commons.wikimedia.org`, `upload.wikimedia.org`;
    - `archive.org`, `babel.hathitrust.org`;
    - `images.metmuseum.org`, `collectionapi.metmuseum.org`;
    - `api.si.edu`, `ids.si.edu`;
    - `rijksmuseum.nl`, plus the image host its API returns;
    - `github.com`, `raw.githubusercontent.com` (the `google/fonts` repo);
    - `fonts.googleapis.com` (css2 only), `fonts.gstatic.com`.
  - **Tools:** `registry.npmjs.org` (only for `vibes-night/tools`);
    `storage.googleapis.com` (only for Chrome for Testing).
  - **Research refs only:** `apps.apple.com`, `*.mzstatic.com`, and each named
    app's own website / press kit (§4).
- **`PROVENANCE.json`, one per vibe folder, mirrored in both trees.** Each
  entry has:
  - `file`, `sha256`, `bytes`, `dims`;
  - `title`, `subject`, `creator`, `creator_died`, `created`,
    `first_published` (year + venue);
  - `source_institution`, `source_url` (the item page, not a CDN link),
    `source_id`;
  - `rights_statement_verbatim`, `pd_basis_us`, `pd_basis_worldwide`;
  - `retrieved`, `original_sha256`, `original_dims`;
  - `transforms` (each command with tool + version), `clothing_check`;
  - `credit_line`, and `micah_approved: false`.
- **Fonts.** OFL 1.1 only, confirmed from the family's `OFL.txt` and
  `METADATA.pb`. Keep a `FONTS.json` per vibe: family, files, version or
  commit, source URL, licence, copyright line, RFN, and sha256. Put the OFL
  text beside the files. Latin subsets only.
- **Budgets:**
  - a vibe's web fonts ≤ 120 KB per family;
  - native fonts ≤ 4 static TTFs per vibe (the picker face included);
  - **the whole native asset addition ≤ 6 MB** (today ~517 KB).
  
  Log the actual sizes.

---

## 15. Finish (Phase F)

1. **Licences, its own commit on each tree** (mandatory if any new font or
   photo was committed): Settings → App → **Licences**, a row that opens a
   sheet. It lists:
   - every bundled font with its copyright line and full OFL 1.1 text
     (Archivo included);
   - Feather's MIT notice for the gear icon;
   - every image's credit line from the PROVENANCE files.
   
   Re-baseline only the Settings-hub scene, with the diff shown. Commits: web
   "Settings: Licences", native `settings: Licences (V59 §15)`.
2. **The gallery** for Micah's morning:
   `~/dev/vibes-night/gallery/index.html`, a local file he opens in Chrome.
   - For every vibe, harness screenshots at 390px of: You, Train calendar,
     live session (with a drop set), summary, Fuel day, the add-food sheet,
     the Coach sheet, Weight, Steps, the Settings hub, the Vibes sheet, and
     sign-in.
   - Each vibe sits side by side with v1, followed by the runner-up concepts
     and each image with its credit line.
3. **Web (`ship-v59`):**
   - the phase commits on `main`;
   - then `rack-v59` **as its own commit** (`sw.js` `CACHE` + `usage.js`
     `VERSION`, with `version-match` green);
   - `README.md`, `CLAUDE.md` (the layout table: `vibe.js`, `vibes/`) and
     `AGENTS.md` (`settings/vibe`), only where they became untrue;
   - **docs last:** `NEXT-NATIVE-V59.md` in v58's shape (pins included),
     `BACKLOG.md` "What v59 left open", `VIBES-DESIGN.md`, `VIBES-REPORT.md`,
     and this prompt plus `VIBES-CODEMAP.md`.
4. **Native (`rack-mobile`):**
   - the code commits (`area: … (V59 §x)`);
   - `docs: NIGHT-LOG for rack-v59 — Vibes, and the prompt`, with the
     NIGHT-LOG entry prepended in its full shape (Nothing is red / canaries /
     start HEAD / commits / verifiers before→after in three zones / new
     verifiers with check counts / batteries / WHAT ONLY MICAH CAN DO / what
     was ported verbatim with sha256 / what was written and why / decisions
     left to him);
   - then `version: buildNumber 59 — native is level with rack-v59` **alone
     and last**.
   
   If Pnat never went green, native gets only the docs commit, and no
   buildNumber bump.
5. **`VIBES-REPORT.md`** (in `ship-v59`, and summarised in chat). Plain words
   first. **If anything is red, say it at the top.** Also at the top: "Native
   visuals were not seen by any judge; check them first in the morning
   walkthrough." Then:
   - what each vibe is, in one line, and whether it passed every gate
     (committed / abandoned / native pending);
   - the P numbers: control 0/0; base vs engine 0 px and 0 computed-style
     diffs across N scenes × 2 widths; native snapshot identical across N
     screens; the pinned Archivo sha;
   - green counts before → after, on both trees;
   - new verifiers;
   - the experimental vibe's per-screen fallbacks, if any;
   - listed-not-fixed, and "unsure" (including unreproduced review
     suspicions);
   - the research's top ten findings;
   - the copy tells left for later (the "·" separators, the uppercase copy);
   - sizes added;
   - photos awaiting his approval (`micah_approved: false`);
   - every refused action and the fallback taken.
6. **His commands:**
   - **Terminal tab 2, at `~/dev/ship-v59`:** `git push --no-verify origin main`
   - **Terminal tab 1, at `~/dev/rack-mobile`:**
     `git push origin main`,
     then `npx expo prebuild --platform ios --no-clean --no-install`,
     then `npx expo run:ios --device --configuration Release`
7. **His walkthrough.** On the website once `sw.js` says `rack-v59` (close from
   the app switcher, open, close, open again), and on the phone after a
   force-quit and relaunch twice:
   1. Nothing looks different: every tab, a live workout, the Coach card,
      the add-food sheet.
   2. Settings has **Look → Vibes** and **App → Licences**, and nothing else
      moved.
   3. Vibes: tap each one. The app changes instantly, he stays on the same
      screen, and the sheet stays open.
   4. Mid-workout: switch vibe and back. The session, sets and rest timer are
      all still there.
   5. Iron Age on the You tab, the Fuel day and the dock icons; the photos
      are behind the big boxes only, and every word is readable.
   6. Pick a vibe on the phone and open the website. It's the same vibe.
   7. Airplane mode: the chosen vibe still looks right.
   8. Back to v1.

End with CLAUDE.md's five handoff lines (Shipped / Service worker / Before
it's live / To check it worked / Risk) and native's (What changed / What it
touched / Which account it was tested on (none) / What you wanted to run and
didn't / Risk).
