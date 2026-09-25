# SHIP-V55-PROMPT.md: four fixes Micah asked for (rack-v55)

Commissioned 25 Sep 2026. This is the build brief for one Claude Code run in
`~/dev/ship-v55`, a fenced clone of lift-cal at `2e8da18` (**rack-v54**, live
this morning). Nobody is watching. Micah reads your summary before he pushes.

---

## 0. Ground rules

**You do not push, deploy or publish.**

- No `git push`, `wrangler`, `firebase`, `eas`, `gh` or `gh-pages`.
- Commit through the hooks. Never use `--no-verify`.
- `echo GUARDTEST ping` must be refused. If it runs, stop.
- Reads and writes go through Read/Edit/Write. Bash runs node, the verifiers
  and read-only git. **No `sed` (not even `sed -n`), no heredocs, no `cat`
  to read, no `tee`.**
- **Never open `~/dev/rack-mobile`, `~/dev/rack-worker`, `~/dev/rack-food`,
  `~/live`, or any other `~/dev/ship-v*`.** A native run and a Worker run are
  going now. The Worker is building its half of Phase D against the contract
  below, which is fixed.
- `database.rules.json` is not changed by one byte.
- `~/dev/ship-v55` must be a full clone at `2e8da18`. If it isn't, stop.
- A stale `.git/index.lock`, or anything in `.git` you didn't make: stop.
  Delete nothing there.

**Micah's rules:**

- **A wrong number is worse than no number.**
- **Web is the guinea pig, and native is the destination.** Pure logic goes
  where the port can copy it, every change names its file, and
  `NEXT-NATIVE-V55.md` says what native must do.
- **Pro and Basic were scrapped on 25 Sep.** Removing gates is the paywall
  ship's job. Add no new gate, lock or teaser, and remove none.

## 1. What this ship is

Four things Micah asked for, each its own phase and its own commit(s), in this
order:

- **A. The Your goal screen, tidied.** His words (24 Sep, on the phone's
  Settings → Coach → Your goal): "this UI looks messy". There's a long stack
  of full-width aim rows, seven full-width focus rows, and the experience
  control wraps "SIX MONTHS TO TWO YEARS" onto two lines.
- **B. Drop sets you can read.** His words (23 Sep): when a set is changed to
  a drop set, "a little sub-menu of sets to appear under it — the individual
  sub-sets that make up that drop set — so it's clear which sub-sets belong to
  that drop set versus another drop set stacked beneath it."
- **C. Save as meal, from the estimate screen.** His words (16 Sep): on the
  estimate result, where each row says whether it came from the database or
  the AI, "a checkbox/button to save that item (or plate) as a saved meal for
  quick re-logging later".
- **D. "Which one?"**: the client half of the contract below.

**Read first:**

- `CLAUDE.md`, `AGENTS.md`, `BACKLOG.md`, and `COACH-REPORT.md` §79–§88;
- the code each phase touches:
  - `coach-ui.js` (`coachAnswerRows`, the Your goal section around
    963–1127, `openGoalSheet`), `settings.js`, and `rack.css`;
  - `workout.js` (set types: the badge cycle around 1268, `collectFrom`,
    `tickSet`, `+ Set`, the "Last ·" line, the recap);
  - `analytics.js` (`isWorking`, and every reader of `type`);
  - `coach-prog.js`, `coach-volume.js` and `coach-live.js`: how each treats a
    `D` set;
  - `food.js` (the estimate result around 2076, saved meals: `meals`,
    `openMealsSheet`, `openMealBuilder`), `ai.js` (`/estimate`), and
    `estimate-origin.js`.

**Count the verifiers** and run all of them under `TZ=America/New_York`, `UTC`
and `Pacific/Auckland` before changing anything. Report the counts again at
the end. Commit per phase, and every phase leaves everything green.

---

## 2. Phase A: the Your goal screen

- **Same data, same writes, same rules.** This is layout and labels only.
- **The aims:** a compact grid of chips (two per row at 320 px), not a stack
  of full-width rows. The chosen one reads as chosen.
- **The experience:** one line at 320 px, with short labels that still say
  the same thing. For example "Under 6 months", "6 months–2 years", "2+
  years". Keep the stored values. Only the labels change, and the stored
  meaning must not.
- **The focus groups:** chips that wrap, not seven full-width rows.
- **The lift target:** unchanged, apart from spacing.
- **Every target is 44 px or taller.** Nothing wraps mid-word or clips at
  320 px or 390 px. Extend `touch-target.mjs` and its snapshot, and add a
  check that no label here is wider than its box at 320 px, using the same
  width reasoning `touch-target.mjs` already uses.
- **The native side:** `NEXT-NATIVE-V55.md` gives the exact layout, so
  native's `src/ui/coach/goal.jsx` can match it.

## 3. Phase B: drop sets you can read

**Find out first how a drop set works today.** The set badge cycles N → W →
F → D. Write the answers down before designing anything:

- what a `D` row is: the drop itself, or the set it drops from;
- how he'd log "185 × 8, then 135 × 6, then 95 × 5";
- how every reader counts a `D` set: `isWorking`, hard sets, `prescribe`'s
  performance log, `coach-volume`'s counts, `REP_DROP`, the e1RM and PR
  readers, and the recap and history lines.

**The decision (Micah's words set it):**

- **A drop set is a parent set with its drops listed under it, indented.**
- A **+ Drop** button under a drop set adds the next drop.
- Two drop sets stacked one after the other are **visibly two groups**.
- **The smallest stored change.**
  - Prefer none: if the order of sets plus the existing `type` can separate
    two stacked drop sets, store nothing new.
  - If it can't, add one **optional** field to a drop row (for example `dp:
    1` meaning "continues the drop above"). Absent means today's meaning, and
    no record migrates.
  - `NEXT-NATIVE-V55.md` gives its shape for native's PROPOSED rules. The set
    node there is open (no `$other`), but say what shape rule to add.
- **Every engine counts exactly what it counted before**, unless a count was
  wrong. If one was wrong, say what, show the before and after, and hold the
  batteries: `coach-prog` 57 + 16, `coach-overlap` 24, `coach-ready` 46,
  `coach-fuel` 16, `finish` 12, `coach-volume` 40, all /0/0.
- **The "Last ·" line and the recap** show a drop set as one group. For
  example "185×8 → 135×6 → 95×5".
- **Duplicating a block, saving as a routine, starting a routine, and editing
  a past session** all keep the grouping.
- **`saveEdit` round-trips it**, so open → save → open changes nothing. Prove
  it the way `effort.mjs` proves `rir`.
- **A live rating** (`rir`) on a drop row: say what the chips rate when the
  last ticked set is a drop, and keep it sensible. The chips rate working
  sets. Is a drop one? Decide from how the engines count it, and write it
  down.
- **Verifier:** new `tools-check/drop-sets.mjs`.

## 4. Phase C: save as meal from the estimate screen

- Saved meals already exist (`meals`, `openMealsSheet`, `openMealBuilder`).
  **Reuse that path. Add no new node.**
- **On the estimate result:**
  - a **Save as meal** button saves the plate as shown, after any edits he
    made to the rows;
  - each row's own menu (or a small control on the row, if there is no menu)
    offers **Save this item as a meal**;
  - both open the existing meal builder, pre-filled:
    - the name defaults to the venue plus the item ("Panda Express · Grilled
      teriyaki chicken ×3.5"), or the plate's first two items;
    - he can rename it before saving.
- **Provenance travels with a saved row** the way it does for any saved meal
  today. A row that came from the model is saved with its numbers, and
  re-logging it later is free, because it's his own saved meal.
- **Nothing is saved without his tap.** Logging the plate still works exactly
  as today.
- **Verifier:** new `tools-check/save-as-meal.mjs`:
  - the plate and a single row, each saved through the real builder path;
  - edits carried;
  - kg/lb don't apply to food;
  - the meal list shows it, and logging it gives the same macros.

## 5. Phase D: "Which one?", the client half

Build to the contract below, exactly.

- `ai.js` sends `ask: 1` on text estimates.
- `food.js` draws the question.
- The pure pieces (validating an `ask`, inserting a pick at `at`) go in a pure
  module native can copy, for example `estimate-ask.js`.
- **You can't reach the Worker.** Test against fixtures shaped exactly like
  the contract's example, plus the malformed ones:
  - no options;
  - one option;
  - an option without an `item`;
  - `at` out of range;
  - two asks.
- **Verifier:** new `tools-check/estimate-ask.mjs`.
- The chips are 44 px or taller. The question and chips hold at 320 px.
- **Copy:** the Worker writes the question. The client writes only the chip
  text (the label and the item's calories, through the same formatter the
  result rows use) and "None of these, estimate it", with a second line saying
  it uses one of today's estimates.

## THE CONTRACT: "Which one?" (this text is identical in the Worker brief and the web brief)

**Why this exists.** On 24 Sep Micah logged "Panda Express 3.5 teriyaki
chicken, side fried rice". The fried rice came off the menu. The teriyaki went
to the model, because Panda publishes two teriyaki chicken rows (Teriyaki
chicken 340, Grilled teriyaki chicken 275), and `seed/venues.json` refuses the
bare phrase as `ambiguous`.

On 25 Sep, `tools/FOOD-FIXES-PROMPT.md` job A read the saved official page. It
confirmed the 340 row is an ordinary entrée, so the refusal is right. The fix
is to **ask him which one**, instead of guessing or paying the model. The ask
is free, and the answer is exact.

### The request (text mode only)

The client adds `"ask": 1` to the `/estimate` body:

    { "mode": "text", "text": "…", "ask": 1 }

- **A request without it gets exactly today's behaviour, byte for byte.**
- Photo mode ignores it.
- An older Worker ignores the unknown key. The Worker brief confirms this.

### When the Worker asks

The Worker asks only when **all** of these hold. Otherwise it takes today's
path (the model), unchanged.

1. The free path resolved part of the order, and **every** unresolved segment
   is a phrase that venue lists as `ambiguous`.
2. Each such segment has **2 to 4 options**. An option is a published row of
   that venue that a person saying the phrase at the counter could mean.
   - A kids', family or catering variant ("- cub meal") counts **only** when
     the segment names it.
   - Each option is **proven**: the segment, rewritten with that option's own
     name, resolves free to exactly that one row, at the quantity the segment
     carried.
3. There are at most **2** such segments in one order.

### The response (HTTP 200)

This is a free answer: **no model call, no counter spent, nothing cached**.

    {
      "ok": true,
      "ask": [
        {
          "seg": "3.5 teriyaki chicken",
          "at": 0,
          "question": "Which teriyaki chicken?",
          "options": [
            { "id": "panda-express-teriyaki-chicken",
              "label": "Teriyaki chicken",
              "item": { …one row, shaped exactly like a row of items[], already at the segment's quantity… } },
            { "id": "panda-express-grilled-teriyaki-chicken",
              "label": "Grilled teriyaki chicken",
              "item": { … } }
          ]
        }
      ],
      "items": [ …the rows that did resolve, exactly as a free answer's… ],
      "confidence": "…", "note": "…", "model": "…", "mode": "text",
      "source": "…", "venue": "…",
      "usage": { "in": 0, "out": 0, "searches": 0, "usd": 0 },
      "left": { …as a free answer… }, "spend": { …as a free answer… }
    }

What each field means:

- **`at`**: where the chosen row goes. It is the index in `items` it is
  inserted **before**, with the asks applied in array order, so the plate
  reads in the order he typed it.
- **`question`**: written by the Worker as "Which <phrase>?". No "AI", no
  "Claude", no exclamation mark.
- **`label`**: the option's menu name, in sentence case.
- **`options`**: listed in the venue's published order.
- **`item`**: complete, with the macros already at the segment's quantity. **The
  client never multiplies.**
- **`confidence` and `source`**: they describe the answer **once a choice is
  made**, because every option is a menu row.

### What the client does

1. **Shows the question**, with one chip per option ("Grilled teriyaki chicken ·
   963 cal", the calories from `option.item`). Under them, **None of these,
   estimate it**.
2. **A pick:**
   - inserts `option.item` into `items` at `at`;
   - goes on to the normal result screen, where that row reads as a menu row
     like every other;
   - with two asks, shows both before the result screen.
3. **None of these:**
   - re-sends the same text **without** `ask`, which is today's model path;
   - it costs one estimate, and the chip says so in plain words ("uses one of
     today's estimates").
4. **Errors:** a malformed `ask` (no options, an option without an `item`)
   drops back to today's path as if `ask` were absent. It never draws an empty
   question.

### Deploy order

Either can ship first. An old Worker never answers with `ask`. An old client
never sends it. Native gets the client half in its v55 port.

---

## 6. The voice

- Plain, warm, and short.
- Never "AI" in anything **Coach** says.
- The estimate screen's existing source labels stay as they are. Changing them
  is a launch-copy decision, listed in native's `LAUNCH-TEXT-AUDIT.md`, and
  not this ship's.
- No exclamation marks.

## 7. The verifiers

- **New:**
  - `drop-sets.mjs`;
  - `save-as-meal.mjs`;
  - `estimate-ask.mjs`;
  - the Phase A width checks, in `touch-target.mjs`.
- **Changed on purpose**, each with its reason in place.
- **Batteries held**, as listed in Phase B.
- **Every verifier exits 0** in all three time zones. Report the count before
  and after.

## 8. Docs and the handoff

- **`NEXT-NATIVE-V55.md`**, in `NEXT-NATIVE-V54.md`'s shape:
  - the pins of every pure module changed or added;
  - every web file:line changed, and what native must do. Where you'd be
    guessing a native path, write "the native run maps this";
  - the drop-set shape and its PROPOSED rule;
  - the Your goal layout;
  - the ask contract, **copied whole**;
  - save-as-meal.
- **`BACKLOG.md`:** a v55 section, including anything found and not fixed.
- **`COACH-REPORT.md`:** only if a Coach engine's count or copy changed.
- **`README.md` / `CLAUDE.md` / `AGENTS.md`:** only what this ship made untrue.

## 9. Finish

- **`rack-v55`**, as its own commit: `sw.js` `CACHE` and `usage.js` `VERSION`.
  `version-match.mjs` is green.
- **The docs last.**
- **Your summary to Micah**, plain words first:
  - what he can now do;
  - then green (counts before and after);
  - new;
  - listed and not fixed;
  - unsure.

  If anything is red, say so at the top.
- **His push command**, in Terminal tab 2 at `~/dev/ship-v55`:

      git push --no-verify origin main

- **His walkthrough** on the website, once
  `lyttlebeast.github.io/lift-cal/sw.js` says `rack-v55`:
  1. Settings → Coach → Your goal: compact chips, and nothing wraps on the
     phone's screen.
  2. In a workout, change a set to a drop set and add two drops. They sit
     indented under it. Make a second drop set below it: two separate groups.
     Finish. The recap and the "Last ·" line show "185×8 → 135×6 → 95×5". Edit
     the workout and save it unchanged, and the groups are the same.
  3. Log food and describe a meal. On the result, **Save as meal**, rename it,
     and save. It appears in Meals, and logging it gives the same numbers.
     Save one row as a meal too.
  4. After the Worker is deployed too: "Panda Express 3.5 teriyaki chicken,
     side fried rice" asks "Which teriyaki chicken?". Pick Grilled, and the
     plate reads all menu, with the teriyaki at 963.

## 10. Not in this ship

- The paywall and tier scrap.
- The type box.
- Singles targets (decision 7).
- Water in readiness.
- Account deletion and the privacy link. They're the next launch-basics
  ship.
- Anything in native, the Worker or the published rules.
