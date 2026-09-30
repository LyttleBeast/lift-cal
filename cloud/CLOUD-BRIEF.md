# CLOUD-BRIEF.md: finish Iron Age, then Meet Day, in Claude Code cloud sessions

Written 30 Sep 2026 by Cowork for Micah. **Each cloud session does exactly ONE job below, named in its kickoff message.**

## What this is

Rack is Micah's fitness app.
- **Website:** repo `LyttleBeast/lift-cal`. GitHub Pages serves `main`, so **pushing `main` deploys**.
- **iPhone app:** private repo `LyttleBeast/rack-mobile` (React Native / Expo).

"Vibes" (visual themes) already shipped as **rack-v59 / buildNumber 59**:
- the engine;
- Settings → Look → Vibes;
- **v1** (today's look, unchanged, the reference);
- **Chalk, Navy, Oxblood.**

Left to finish: **Iron Age** (built, needs its last checks) and **Meet Day** (designed, not built).

Background, in this folder:
- `VIBES-PROMPT.md`: the original brief. §0–§2, §5–§7 and §10–§14 matter most.
- `VIBES-LOG.md`: what happened and the decisions made.
- `VIBES-CODEMAP.md`: a code map (it drifts; re-verify).
- `design/`: the specs.
- `tools/`: the night's helper scripts.

**This file overrides all of them where they differ.**

## Budget rules (the most important section)

Micah is paying with a **one-time cloud credit**, and he has almost no weekly usage left. When the credit runs out, cloud sessions **silently fall back onto his weekly plan, which he cannot afford**. So:

- **Be lean.** Work as a single agent by default.
  - If you use subagents or workflows: at most 2–3 at a time, on **Sonnet** for mechanical work (merging, running verifiers, straightforward fixes).
  - Keep your own model for design judgement only.
  - No multi-round adversarial reviews, except the panel described below.
- **Do only the job you were given.** Never start the next job.
- **Commit and push after every meaningful step**, so Micah can stop the session at any moment without losing work.
- **Finish with a 10-line summary:** the branch you pushed, its commits, what passed, what's left, and any decision left to Micah.

## Hard rules

- **Never push `main`** of either repo. Never deploy. Never run `wrangler`, `firebase`, `eas` or `gh-pages`. Work on a branch, and push only that branch.
- These stay byte-unchanged:
  - `database.rules.json` and `database.rules.OPTIONAL-LOCK.json`;
  - the pinned pure modules (`exercises.js`, `analytics.js`, `tdee.js`, `units.js`, `accounts.js`, `insights.js`, `estimate-origin.js`, `estimate-ask.js`, and the pure `coach*.js` listed in VIBES-PROMPT §0).
  - Native `src/pure/coach-view.js` is *not* pinned.
- **v1 must stay identical** (see Proof below).
- **Words on screen never change.** Vibes change how Rack looks, never what it says or does.
- **No AI-generated images of any kind, ever** (§14). Every photo keeps its `PROVENANCE.json` entry.
- Native: `package.json` and the lockfile stay untouched, and there is no iOS build here (there's no Mac). Micah builds on his Mac.
- Don't bump `sw.js` / `usage.js` or `buildNumber`. Micah does that when he ships.

## Setting up the cloud machine

**Website repo:**
1. `export HARNESS_HOME=/tmp/vibes-night`, then `mkdir -p $HARNESS_HOME/tools` and copy `cloud/tools/*` into `$HARNESS_HOME/tools/`. The harness (`report/btn-44/*.mjs`) imports `freeze-clock.mjs` from there and writes its runs there.
2. Download the pinned Archivo with node `fetch()`:
   - from `https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/Archivo%5Bwdth,wght%5D.ttf`
   - to `$HARNESS_HOME/tools/fonts/archivo/Archivo-wdth-wght.ttf`
   - its sha256 must be `0e094a7d3c7c4c25cf1310c4b30014f1dae9332220b1c2c88f4fa996f0b05053`.
3. Chrome: set `CHROME` to the machine's Chromium (look under `/opt/pw-browsers`, or wherever Playwright's Chromium lives). `python3` serves the pages.
4. Make the v1 reference tree: `git worktree add /tmp/base-web origin/main`. `main` is rack-v59, `267a2da` or later.
5. Web verifiers:
   - `for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done` must all exit 0. UTC is enough here; `rate-band` fails only under Pacific/Auckland, which is a known pre-existing issue.
   - Then `for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done`.

**iPhone repo:**
1. Run `npm ci` first, because the verifiers need node_modules.
2. The verifiers are `tools/verify-*.mjs` plus `tools/rules/prove.mjs`, `tools/rules/verify-delete-coalescing.mjs` and `tools/rules/verify-generator-level.mjs`. All must exit 0.

## Proof that v1 didn't change

**Website:** `node report/btn-44/prove.mjs` with A = `/tmp/base-web` and B = the working tree (read its header for flags).
- Run it with `data-vibe` absent and with `data-vibe="v1"`.
- Expect **0 pixel and 0 computed-style differences**, except in scenes that show the Vibes sheet, which gains the new vibe's card.
- Run the control first (A vs A = 0).

**iPhone:** `tools/verify-vibe-v1.mjs` stays byte-identical, and the theme-identity verifier stays green.

## Micah's decision on the "does it look AI-made?" panel (replaces §13.6)

The goal is **how it looks to real people**, not whether an AI detector can tell.

For Iron Age and Meet Day, run **3 judges**, each looking the way real people would:
- a lifter who uses fitness apps;
- a graphic designer;
- someone who has seen a lot of AI-made apps.

Each looks at the screenshots and answers: *"Does this look like a generic AI/template app, or like something a person designed on purpose?"*

- **Pass** = at least 2 of 3 say designed on purpose, **and** every concrete giveaway they name is fixed (or logged with a reason).
- **In the cloud: at most 2 revise rounds.** If it still doesn't pass, finish anyway and put that at the top of your summary. Micah judges on his phone.

## JOB 1: Iron Age, website (repo `lift-cal`)

Start: `git fetch origin vibes/iron-age && git checkout vibes/iron-age` (tip `d7de72d` or later).

**Where it stands:**
- Fully built.
- Earlier gates passed: fit, v1 identical, phone/web parity, and photo provenance. Contrast passed after 3 fix rounds.
- Since then, panel round 3 changes, two review fixes and one gate fix have landed.
- A contrast re-check (round 2) was interrupted.

**Do:**
1. `git merge origin/main`. Main gained Navy, Oxblood, engine v3 and rack-v59. Resolve the registry conflicts (`vibes/defs/index.js` VIBES, the tables in `vibe.js`, and `index.html`'s vibe `<link>` + theme-color entries) by **keeping every entry**, in the order v1, iron-age, chalk, navy, oxblood.
2. Gates:
   - the web verifiers;
   - v1 identical (Proof above);
   - contrast: text 4.5:1, large text and UI 3:1; text over photos is measured on the real pixels with its scrim;
   - fit at 320 and 390px, with no overflow and no clipping in the Coach card (190/164);
   - 44px touch targets.
   
   Fix anything red.
3. The panel, per Micah's decision.
4. Commit (`Vibe: Iron Age`, plus a fix commit if needed) and push the branch.
5. In the summary, list the shared pure files the iPhone app must copy byte-for-byte, with their sha256. Those are `vibes/defs/index.js`, `vibes/defs/iron-age.js`, `vibes/icons/iron-age.js`, and any `vibes/` pure file that changed.

## JOB 2: Iron Age, iPhone app (repo `rack-mobile`)

Start: `git fetch origin vibes/iron-age && git checkout vibes/iron-age`, then `npm ci`.

**Do:**
1. `git merge origin/main`. Main gained Navy, Oxblood, engine3 and buildNumber 59. Resolve the registry conflicts (`src/state/vibe.js` VIBE_DEFS, `src/pure/vibes/defs/index.js`, and the pins in `tools/verify-vibes-verbatim.mjs`) with the same order as JOB 1.
2. Copy the shared pure files **byte-for-byte** from JOB 1's pushed web branch. Fetch the public repo with `git fetch https://github.com/LyttleBeast/lift-cal <branch>` and `git show FETCH_HEAD:<file>`. Then re-pin their sha256s.
3. Gates:
   - every verifier exits 0;
   - `verify-vibe-v1` is byte-identical for v1;
   - Iron Age's parity with the web definition, fit, and text colour all pass.
4. Commit (`vibe: Iron Age (V59 §11)`) and push the branch.

## JOB 3: Meet Day, website (repo `lift-cal`)

Start from JOB 1's pushed branch, so Iron Age's registry entries are already there, and create `vibes/meet-day`.

**The design is done:**
- the spec: `cloud/design/meet-day.md`;
- the composition plan: `cloud/design/COMPOSE.md`;
- the vocabulary and roles: `cloud/design/VOCAB.md` and `ROLES.md`;
- the pure definition and icons are committed on branch **`vibes/design2`** (`22a4151`): `vibes/defs/meet-day.js` and `vibes/icons/meet-day.js`. Take them with `git show origin/vibes/design2:<path>`.

**Do:**
1. **Composition support (Phase X, VIBES-PROMPT §12):** named top-level blocks, with order and grouping taken from the vibe, on the five tab landings, the workout summary and the live session.
   - v1 = today's order, and must prove identical.
   - Commit and push as soon as this is proven.
2. **Build Meet Day** (§12):
   - It may reorder, merge or split boxes within a screen.
   - It never touches the dock's tabs, their order or its position.
   - It never removes or hides a feature.
   - If a screen's rearrangement can't be proven safe, that one screen falls back to "same order, new shapes".
   - Fonts are OFL only, with `FONTS.json` and `OFL.txt`.
3. **Open design questions:** take the spec's recommended defaults (keep the name **"Meet Day"**) and list the questions for Micah.
4. Run the gates (as in JOB 1) and the panel, then commit (`Vibe: Meet Day`) and push.

## JOB 4: Meet Day, iPhone app (repo `rack-mobile`)

Start from JOB 2's pushed branch and create `vibes/meet-day`.

**Do:**
1. Build the composition support natively, for the same screens, with v1 byte-identical (`verify-vibe-v1`).
2. Copy the shared pure files byte-for-byte from JOB 3's web branch.
3. Build the vibe to match the web: parity, fit and text colour.
4. Make sure every verifier exits 0.
5. Commit (`vibe: Meet Day (V59 §12)`) and push.

## How Micah brings it home (for reference; not a cloud job)

On his Mac, he:
1. fetches the pushed branches;
2. merges them into `main` in both repos;
3. bumps the web version to `rack-v60` and `buildNumber` to 60;
4. pushes;
5. rebuilds the phone.
