# Porting rack-v55 to rack-mobile

Web shipped as `rack-v55`. The tree it mirrors is `~/dev/rack-mobile`.

v55 is **four things Micah asked for**:

- **A. The Your goal screen, tidied.** Every answer is a 44px chip: the aims
  two to a row, a question of three answers or fewer on one line, the focus
  groups wrapping. Experience reads "Under 6 months", "6 months–2 years",
  "2+ years" in Settings.
- **B. Drop sets you can read.** A drop set's drops sit indented under the set
  he changed to a drop set, **+ Drop** adds the next, and two stacked drop
  sets are two groups. One optional field on a set, `dp: 1`.
- **C. Save as meal, from the estimate screen** — the plate, or one row,
  through the meal builder that already exists.
- **D. "Which one?"** — the client half of the estimator's ask. The contract
  is in §7, copied whole.

The build brief is `SHIP-V55-PROMPT.md`. What changed in Coach's engines, and
why, is `COACH-REPORT.md` §89–§94; what is not done is `BACKLOG.md` under
*What v55 left open*.

**`rack-mobile` was NOT read.** The run was fenced to `~/dev/ship-v55`, as the
brief ordered. Where this file would have to guess a native path, it says
**the native run maps this**. This file is the delta on top of V54, so port
V54 first.

**What is stored:**

- **`dp: 1` on a set** whose `type` is `'D'`: "continues the drop set above".
  It lives inside the set object wherever a set lives — the live session, a
  workout record (`workouts/{mk}/{dd}/{id}/exercises/{i}/sets/{j}`), a routine's
  sets, and the "last time" index (`history/{exId}/{k}/sets/{j}`). Optional:
  **absent means today's meaning**, and no record migrates. §2.
- **Nothing new under `food/`.** A meal saved off the estimate sheet is a
  saved meal like any other, at `food/meals/{mealId}`, in the shipped shape.
- **The request, not the database:** a text estimate's body carries `"ask": 1`.

`database.rules.json` and the OPTIONAL-LOCK file are byte-identical to
rack-v54: `workouts`, `routines`, `history` and `food` all carry section-level
`.write`s. **Native's PROPOSED rules need `dp` wherever they validate a set:
§4.**

**What is read:** nothing new, at boot or on a paint.

---

## ⚠ THE PINS

Unchanged since rack-v54:

```
units.js          fa6f03c9b2a097821c194af2be8e9711da5f940f3a35850d17897c77da4f6da5   unchanged since rack-v41
exercises.js      74ac8a9885376b79940daa6a184dfed14bfa4e32d2226e4e367db53dfd9d9857   unchanged
coach-tags.js     846501595feb06fddc7d85fb19ed526bc6c6cc69cecc5b7e9494eb96bd8c8a06   unchanged since rack-v42
blocks.js         1fd10b3b82aa89082dee1675120d5a39fe7c21e7f7232b1930b6ce233a1fbbaf   unchanged
coach-goal.js     6cd88a72e932ad060fe456121372dc483525ec28ca0c5d067c3aa58f41382048   unchanged since rack-v49
accounts.js       f89af13550da39c24a643ea411b8f8c820202bf605aa990aab15f2d64506d471   unchanged
tdee.js           83c2e76b71cfa2f6c8260fae807182e0682af48459bcd30b7be9eb9c4d48fe3d   unchanged
coach-ready.js    a72c1309967a36f927208402242df8469f201b0c490eae3a28346ee419f1cd6a   unchanged since rack-v52
coach-fuel.js     36fdf21814d6b32d3ac6bb1411636fe664f1c58e569f8569d1f4c786d1bfd896   unchanged since rack-v53
```

**The files the port copies verbatim that changed, or are new:**

```
analytics.js       bb9533165aa40da3e956522e604791eb1b8191ec69004ea76bef433a41420cd5   CHANGED — re-copy, 1,132 lines (v54: 6ba64c5…, unchanged since rack-v53)
coach.js           4b27c4373d02d2edef906fcbc1990a341e5ba387129eaf34bf601ea8a05cbc29   CHANGED — re-copy, 5,431 lines (v54: 32d6438…)
coach-prog.js      7e935a27a9187b04de424e0b546f741844f13515271bd5c2a3f7468b8c2fc849   CHANGED — re-copy, 1,232 lines (v54: 1593b84…)
coach-live.js      73a50f9e5165426ab78eaf87bfe58865ea484a15818938796ef376ac7bb42f69   CHANGED — re-copy, 708 lines (v54: 6187b34…)
coach-overlap.js   1652e27fe55c414ec71f2d51117634c02b8c8bbd6b23c29e58bb4d1b04494ca4   CHANGED — re-copy, 1,175 lines (v54: 1d0d94c…)
coach-build.js     9993643019d526d0ea9512425d034b805cd952217b48c17bf3eade7d895f79ff   CHANGED — re-copy, 762 lines (v54: e134833…)
coach-volume.js    1a56027bba65a9e97210dc06fc888f3cefecbd7b3685a5f2b4bccc801ad70f89   CHANGED — re-copy, 463 lines (v54: 077b506…)
estimate-origin.js 9707d03f432a23990ca3ee054ea4e65680df670e99ddd87a829ea0c8b9c0ce6e   CHANGED — re-copy, 210 lines (v54: e0e47b0…, native's src/pure/ copy)
estimate-ask.js    d64e4b5785c44c1e55d37bfaee599e4b85ad1e79af3484f7863b719a884aa479   NEW — copy, 110 lines
```

`estimate-ask.js` imports nothing. `coach-live.js` now takes `continuesDrop`
from `analytics.js` beside what it already took; nothing else gained an
import edge.

`workout.js`, `routines.js`, `food.js`, `ai.js` and `coach-ui.js` are not
copied verbatim. What each changed, and what native must do, is below.

---

## 1. `analytics.js` — the drop-set rule (re-copy it)

Web: `analytics.js:138`–`:254`, beside `isWorking` and
`mergeSessionExercises`, because every file that reads a set already imports
this one.

- **`continuesDrop(sets, j)`** (`:160`): set `j` is a drop — `type === 'D'`,
  `dp === 1`, and the set directly above it is a `'D'`. **The one rule.**
  `dp` anywhere else, or of any other value (`true`, `"1"`, `2`), is read as
  absent.
- **`dropHeads(sets)`** (`:167`): for each set, the index of the set its drop
  set starts from, or `null`.
- **`dropRuns(sets)`** (`:176`), **`setsText(sets, one, sep)`** (`:188`): a
  line of sets with each drop set joined by `" → "` — "185×8 → 135×6 → 95×5".
- **The four edits**, each returning a new list and never changing one in
  place. Each tags every set with its drop set, makes the change, and then
  `relinked()` (`:198`) gives a `'D'` its `dp` only when the set now above it
  is a `'D'` of the same drop set:
  - `keepSets(sets, keep)` (`:212`): the sets a filter keeps, each drop set
    still its own. A drop whose drop set's first set was left out becomes the
    first of what is left.
  - `retypeSet(sets, j, type)` (`:222`): the badge. A set that becomes a
    `'D'` starts a drop set of its own; one that stops being one leaves, and
    the drops under it go on as their own.
  - `removeSet(sets, j)` (`:234`): the swipe. A drop set's first set going
    leaves its drops as their own, never stitched to the one above.
  - `addDrop(sets, j, fresh)` (`:244`): **+ Drop**, after the last set of the
    drop set `j` is in.

## 2. Drop sets: the data, and the session screen

**What a `D` row was, and is.** Every engine has always read a `'D'` as "part
of a drop set, never carrying progression" — out of the top sets, out of the
e1RM series — and counted it as a working set (`isWorking`). Micah's words set
the model: the set he **changes to a drop set** is its first set, and the
drops sit under it. So a drop set of three is three `'D'` sets, and two
stacked drop sets are six: order and type alone cannot separate them. Hence
one optional field.

**How he logs "185 × 8, then 135 × 6, then 95 × 5":**

```json
{ "w": "185", "r": "8", "type": "D", "done": true },
{ "w": "135", "r": "6", "type": "D", "dp": 1, "done": true },
{ "w": "95",  "r": "5", "type": "D", "dp": 1, "done": true }
```

A `'D'` with no `dp` — every one before v55 — is a drop set of its own, as it
always was.

**Web, and what native's session screen must do** (`workout.js`; native's
counterparts: **the native run maps this**):

- `:1237` `renderExercise`: `dropHeads(ex.sets)`. A drop's row gets class
  `drop` and the badge `↳`; a drop set's first set keeps `D`. After each drop
  set's last set, **+ Drop** (`:1287` `dropAddRow`, `btn btn-ghost drop-add`,
  aria-label "Add a drop to this drop set"). It calls `addDrop(ex.sets, i, {
  w: '', r: '', done: editing })` — **empty boxes**: a drop is lighter by
  definition, and copying the set above would put a weight he did not lift in
  the box.
- `:1299` `renderSet`: the badge's cycle N → W → F → D goes through
  `retypeSet`, and the swipe (`:1378`) through `removeSet`.
- The indent moves **only the badge** (`rack.css:546`–`:553`: `.set-row.drop
  .set-idx { margin-left: 10px }`, a 2px rail at `left: 15px` in
  `rgba(46,127,217,.45)`, `.drop-add-row` padded 22px on the left). The weight
  and reps boxes stay as wide as every other row's, so a drop in a lifting
  block at 320px has the same room as a set.
- `:1520` `collectFrom`: `keepSets(ex.sets, s => s.done && s.r !== '')`, so a
  drop whose drop set's first set was never ticked is not stitched to the drop
  set above. `dp` is spread through with every other key.
- `:282` `foldSessionIntoHistory`: the "last time" index keeps `dp` —
  `{ w, r, type, dp? }` — through `keepSets(sets, isWorking)`.
- **The lines:** the "Last ·" line (`:1223`), the recap's *What you did*
  (`:2161`) and the day sheet (`:636`) all go through `setsText`. Inside a
  drop set no type letter is printed; outside one, exactly as before
  ("135×6D" for an old lone D).
- **Every copy carries `dp`** (it is what the set is, unlike `rir`, which
  never crosses): `editWorkout` (`:765`), `dupSet` (`:898`), `routines.js`
  `toSession` (`:238`) and the save-as-routine map (`:531`), and the builder
  (`coach-build.js` `dpOf`, `:239`, in every view) and Coach's target sets
  (`coach-prog.js` `copySet` `:228`, `keep` `:599`).
- **The routine editor** (`routines.js:409`, `:438`): the badge and the swipe
  go through `retypeSet` and `removeSet`. It draws a drop set's rows flat, as
  before, and has no **+ Drop** (BACKLOG).
- **`saveEdit` round-trips it.** Open → save → open changes nothing
  (`drop-sets.mjs` D). Prove the same on native.

**The live chips** (`coach-live.js:659` `ratedOf`): they rate the last ticked
working set **that is not a drop**. A drop set is rated whole, on the set he
changed to a drop set: a drop is a working set for every count, but no reader
of a rating reads one, and "How was it?" of the last strip of a drop set asks
about a part of it. After a drop set of three, the chips ask "Set 2 · 190 lb ×
8. How was it?", not "Set 4 · 100 lb × 5". A lone `'D'` with no `dp` is rated
as it always was.

## 3. The engines: a drop set's falling reps are not fatigue (re-copy)

Every count is what it was, with `dp` or without it (`drop-sets.mjs` F1). The
one read that was wrong: the **rep-drop** tests counted a drop set's reps —
which fall at a lighter weight by design — as fatigue. They now leave every
`'D'` out:

| Web | Before (rack-v54) | After |
|---|---|---|
| `coach-live.js:346` `fatigueIn` | after two drop sets: "You’re probably good for today — Barbell Bench Press, reps from 8 to 6…" | nothing |
| `coach-prog.js:1187` `nextSet` | stop: "Your reps went from 8 to 6…" | "Next set: 190 lb × 8." |
| `coach-volume.js:158` `dropped` | 14 hard sets, "more than usual", `{ drops: 2 }` | 14 hard sets, "about right" |
| `coach.js:682` `repDrop` (the shaped `ldrop`, read by `coach-ready.js` for a big day) | 2 lifts | 0 |
| `coach-overlap.js:807` the record day's last-session check | no record day | "Good day for 6 at 225 lb…" |

Straight sets whose reps really fell read the same before and after, and 60
generated logs with no drop set are rack-v54's exactly. The batteries did not
move. `COACH-REPORT.md` §90 has every row.

## 4. The PROPOSED rules — `dp`

The published rules take everything. **Web cannot see native's rules.** The
brief says native's PROPOSED set node under
`workouts/$mk/$dd/$sid/exercises/$i/sets/$j` is open (no `$other`), so a set
with `dp` lands. If it is ever closed, or if the PROPOSED `routines` or
`history` sets are validated key by key, add through `tools/rules/build.mjs`:

```json
"dp": { ".validate": "newData.val() === 1 && newData.parent().child('type').val() === 'D'" }
```

- **A set without `dp` must still pass** — it is optional, and every record
  before v55 lacks it.
- The whole-month writes (`saveEdit`) and the whole-node `history` write carry
  `dp` inside each set, so the same rule validates them.
- The client never writes `dp` on anything but a `'D'` whose set above is a
  `'D'` (`relinked`), so the second clause refuses only a bug.

**PROPOSED, not published.** Micah publishes rules; nothing here does.

## 5. Your goal — the layout

Web: `coach-ui.js:972`–`:1044` (`SHORT_LABELS` `:989`, `goalLayout` `:992`,
the chips `:1018`); `rack.css:2255`–`:2276`. Native's `src/ui/coach/goal.jsx`
should match this exactly. **Same data, same writes, same rules**: only layout
and labels changed.

Every answer on the screen (the goal questions, and the answered questions
drawn above them) is **one kind of chip**:

- a button, **min-height 44px**, border 1px `--collar`, radius 8px, background
  `--rack`, text `--steel`, **12px Archivo, `'wdth' 92, 'wght' 600`**,
  line-height 1.25, **no wrap**; padding 8px 14px;
- **chosen**: border `--p-yellow`, background `--collar`, text `--chalk`, and
  `aria-pressed="true"` (every chip carries `aria-pressed`); the group is
  `role="group"` labelled with the question;
- gap 6px between chips, 6px under the question's label.

Three layouts, by question:

| Question | Layout |
|---|---|
| `q_goal_aim` (six aims) | **grid**, two equal columns (`repeat(2, minmax(0, 1fr))`), chip padding 8px 6px, text centred |
| three answers or fewer (`q_experience`, `q_goal_direction`, `q_log_timing`) | **one row**, no wrap, each chip `flex: 1 1 auto` (as wide as its label, sharing what is left), padding 8px 6px |
| `q_focus_group` (seven) | chips that **wrap whole**, content-width, padding 8px 14px |

- **Experience, in Settings only:** "Under 6 months" (`new`), "6 months–2
  years" (`some`), "2+ years" (`years`). The stored values and what they mean
  are unchanged. `coach.js` keeps its spelled-out labels, because its copy
  spells every figure out (`coach-units.mjs`), and the Coach sheet still asks
  in those words.
- The focus group's note and the lift target are unchanged.
- **Measured, not guessed:** `touch-target.mjs` F measures every label in
  Archivo's own advance widths (read from the variable font Google serves,
  checked against four static instances to the unit) against its chip at 320
  and 390 wide, with 3% held back for kerning. At 320 the longest aim, "Lose
  fat, keep strength", is 117.2px in a 127px box, and the experience row is
  276.9px of 288px. Nothing wraps or clips. If native's type differs, measure
  again.

## 6. Save as meal

Web: `food.js:2237` (a row's **Save**), `:2292` (**Save as meal**), `:1731`
`saveAsMeal`, `:1556` `openMealBuilder(draft, mealId, { saveOnly })`,
`:1622` the save-only form; `estimate-origin.js:161` `mealName`;
`rack.css:1655` `.pe-save`. Native's estimate sheet and meal builder: **the
native run maps this.**

- **On the estimate result**, not when it was opened to add an ingredient to a
  meal:
  - under **Log it**, a ghost **Save as meal**: the plate as it stands, his
    corrections included;
  - on each row, after the calories, a small **Save** (44×44 or more; label
    "Save <name> as a meal"): that row alone.
- **Both open the existing meal builder** with copies of the rows, in a
  save-only form: the name box, the readout, the ingredient rows (editable,
  removable), **+ Add ingredient**, the line "It keeps these numbers, so
  logging it again from My meals is free.", a primary **Save meal**, and
  Cancel. No meal slot, no "Log it as", no Log meal.
  - **Save meal** needs a name ("Give it a name first"), then the existing
    `persistMeal` → `food/meals`, toast "Saved to my meals", and the builder
    closes onto the estimate sheet, which is as it was.
  - Nothing is written until he taps Save meal. Logging the plate is exactly
    what it was.
- **The name box opens with** `mealName(rows, origins, res)`: the venue and the
  item, "Panda Express · Grilled teriyaki chicken ×3.5", or the plate's first
  two items, "Panda Express · Grilled teriyaki chicken, Fried rice". The venue
  is the rows' own when they agree, else the reply's. A count only when the
  row's amount starts with one ("3.5 × entrée", "3.5 servings"); never worked
  out.
- **Provenance** travels as it does for any saved meal: `cleanIng` keeps name,
  amount, the numbers and the micros. A row the model priced is saved with its
  numbers; re-logging from My meals writes `src: 'meal'` and spends nothing.
- No units: food carries no kg or lb.

## 7. "Which one?" — THE CONTRACT, copied whole

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

### The client half, as web built it

Web: `ai.js:153` `estimateText(text, opts)`; `food.js:1989` `runEstimate`,
`:2019` `plainEstimate`, `:2029` `openWhichOne`; `estimate-ask.js`;
`rack.css:1665` `.ask-opt`. Native's estimator: **the native run maps this.**

- **The request.** `ask: 1` on every text estimate — the describe flow, the
  food memory's "ask again", "Not this — ask Claude" — and never on a photo.
  `{ ask: false }` is "None of these": today's body byte for byte
  (`estimate-ask.mjs` C holds it against rack-v54's `ai.js`).
- **`readAsk(res)`** (pure) answers `none`, `ask` or `bad`. An ask is drawn
  only when **every** part reads: 1–2 asks; a question with words; 2–4
  options, each with a label and a row that has a name and calories; `at` a
  whole number from 0 to `items.length + k` for the k-th ask.
- **`bad` — the brief's "drops back to today's path as if `ask` were
  absent".** Web reads that as **re-sending the sentence without `ask`**, not
  as drawing the reply's `items` alone: those are only the rows around the
  question, and a plate missing its teriyaki is a wrong number. It costs the
  estimate today's path always cost. Nothing is drawn first, so an empty
  question never is. **If Micah meant the other reading, this is the one line
  to change** (`runEstimate`'s `bad` branch).
- **The question sheet.** No eyebrow and no words of the client's but the
  chips: the Worker's `question` as the heading; one full-width row per option,
  "Grilled teriyaki chicken · 963 cal" (`optionText`), the calories through
  the result rows' own formatter (`normalizeImport`, so the chip and the row
  say the same number — 962.5 → 963); last, **None of these, estimate it**
  with **Uses one of today’s estimates** under it; Cancel. Each row is
  onboarding's `ob-choice` held to **44px** by `.ask-opt`, and a long label
  wraps inside it (`overflow-wrap: anywhere`), so it holds at 320px.
- **A pick** with a second ask repaints the same sheet with it; after the last,
  `withPicks(res, asks, picks)` puts each row in at its `at` and takes `ask`
  off, and the result screen draws it like any free answer — headed "From the
  Panda Express menu", every row with its menu line, `$0.0000`.
- **None of these** re-sends without `ask` (`noAsk`, so it can never loop).
- Logging a picked plate remembers the sentence in the food memory, so the
  same words next time are answered from his own log.

## 8. The verifiers

Counts are checks passed at rack-v55.

| | |
|---|---|
| `drop-sets.mjs` | NEW, 82. The rule, the four edits, the session screen (the real `renderExercise` against a DOM shim), Finish and open → save → open, every copy site, and the engines: F1 every count the same with `dp` or without; F2 rack-v54's engines staged out of git beside today's; F3 the chips. The pure sections **port**; the screen sections drive web's `workout.js` and need re-pointing |
| `save-as-meal.mjs` | NEW, 36. `mealName`, the sheet's two controls, the save-only builder, nothing without a tap, the list and the re-log, kilos. `mealName` **ports**; the rest drives web's `food.js` |
| `estimate-ask.mjs` | NEW, 55. `readAsk` on the contract's example and every malformed shape the brief names (no options, one option, an option without an item, `at` out of range) and two asks; `withPicks`; the request against rack-v54's `ai.js`; the sheet. A and B **port** |
| `touch-target.mjs` | + F: every Your goal label measured against its chip at 320 and 390; the Your goal chips, **+ Drop**, a row's **Save** and the ask rows held to 44px; the snapshot gains them |
| `recap.mjs` | + E: *What you did* draws a drop set as one group |
| `coach-surface.mjs` | L follows the Your goal chips on purpose; the class check names the two v55 classes |
| `coach-pure.mjs` | G lets `coach-live.js` take `continuesDrop` |
| `blocks`, `effort`, `feel`, `grey-last`, `merge-invariant`, `month-erasure` | stage the real `keepSets` / `setsText` / `retypeSet` / `removeSet` beside the functions they lift, each with its reason; `effort` pins the save-as-routine map with `dp` |

The held batteries did not move: `coach-prog` 57/0/0 and 16/0/0,
`coach-overlap` 24/0/0, `coach-ready` 46/0/0, `coach-fuel` 16/0/0, `finish`
12/0/0, `coach-volume` 40/0/0.

## 9. What to run

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Both are clean at rack-v55 under `TZ=America/New_York`, `UTC` and
`Pacific/Auckland`: 49 verifiers, all exit 0 (46 at rack-v54).

## 10. If the port reads one thing in this file

§2. **A drop belongs to the drop set above it, and every edit has to keep
that true.** `dp` is what a set is, so every copy carries it — the opposite of
`rir`. And every change to a list of sets (a type change, a swipe, a filter at
Finish, the "last time" fold) goes through the four edits, or a swipe on one
drop set's first set quietly stitches its drops onto the drop set above.
