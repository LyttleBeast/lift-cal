# Porting rack-v58 to rack-mobile

Web shipped as `rack-v58`. The tree it mirrors is `~/dev/rack-mobile`.

v58 is **four things**:

- **A. The estimate rows line up.** On an estimate's row the calorie number sat
  level with the top of the food's name while Save and ✕ sat on the row's
  centre (Micah, 25 Sep: "the ui is a little off with the calories, they are a
  little high"). The number, Save and ✕ now share one centre line, the ✕ is
  44px tall (it was 24), and a long name gets two lines before it is cut.
- **B. The holding band is ±200.** `tdee.js` caps the band at 200, not 250.
  Rack's own Bulking target (maintenance + 250) sat on the band's top edge from
  a maintenance of 2,970 up and the bar called it holding. His case,
  maintenance 3,220 and target 3,470, reads as bulking now, and the note under
  the bar does not fire. *Reading the bar* says what the yellow comes to, in
  place of "holds your weight".
- **C. The long USDA names, shown short (the client half).** The Worker gives a
  generic row a short everyday name and moves USDA's description to an optional
  `src.desc`. The fix-it sheet shows it under the name as "USDA: …".
- **D. README.** Web's docs only; nothing to port. The balance line the brief
  offered was not added (§5).

The build brief is `SHIP-V58-PROMPT.md`. What is not done, and the decisions
Micah may want back, are `BACKLOG.md` under *What v58 left open*.

**`rack-mobile` was NOT read.** The run was fenced to `~/dev/ship-v58`, as the
brief ordered. Where this file would have to guess a native path, it says
**the native run maps this**. This file is the delta on top of V57, so port
V57 first.

**What is stored:** nothing new. `src.desc` is read off the Worker's reply and
never written: not to the day log, not to `food/recall`, not to a saved meal.

`database.rules.json` and the OPTIONAL-LOCK file are **byte-identical to
rack-v57**. Native's PROPOSED rules need nothing from this ship.

---

## ⚠ THE PINS

Unchanged since rack-v57:

```
units.js           fa6f03c9b2a097821c194af2be8e9711da5f940f3a35850d17897c77da4f6da5   unchanged since rack-v41
exercises.js       74ac8a9885376b79940daa6a184dfed14bfa4e32d2226e4e367db53dfd9d9857   unchanged
blocks.js          1fd10b3b82aa89082dee1675120d5a39fe7c21e7f7232b1930b6ce233a1fbbaf   unchanged
accounts.js        f89af13550da39c24a643ea411b8f8c820202bf605aa990aab15f2d64506d471   unchanged
coach-ready.js     a72c1309967a36f927208402242df8469f201b0c490eae3a28346ee419f1cd6a   unchanged since rack-v52
coach-fuel.js      36fdf21814d6b32d3ac6bb1411636fe664f1c58e569f8569d1f4c786d1bfd896   unchanged since rack-v53
estimate-ask.js    d64e4b5785c44c1e55d37bfaee599e4b85ad1e79af3484f7863b719a884aa479   unchanged since rack-v55
coach-goal.js      3956ca36008c1de04fca72223ebd806e1b1a873c90b6dce46136c77f8fbe96a7   unchanged since rack-v56
coach-overlap.js   c11307f3eeca63fe5e41f61acef446e064b1c8911a2548e9c5d8948639e7d4ac   unchanged since rack-v56
coach.js           e98a08f6c540b91a71362a44b17e4c846bceb34c0cc5a35a6e71d5850536cf6f   unchanged since rack-v56
coach-prog.js      8a24bd625888f70abf92d714a9f8d0040919ef5b5762f189e8a2fceed64b0ff5   unchanged since rack-v56
coach-live.js      621968c572e5e86134851249b4745f2ca2aa0a00777392ba81b02c495e5b8641   unchanged since rack-v56
coach-build.js     a1d204a5e52a85345cf193e8d827a91c36d13023f0b54f7acffb4e6e354c19a0   unchanged since rack-v56
analytics.js       02d2d112de893d136ed02ac92f7938c3b7408be2da3daa13b2e40ad3c754033f   unchanged since rack-v56
coach-tags.js      4bffed387010c0d6ebcf8850bb1f3b25a8943cdd5c6b483d2413dc31d6f6ec29   unchanged since rack-v57
coach-volume.js    78f43cafad1e83f2a5585262cd21ab1d5d9ce65e6bf14a15350eaac5d588f728   unchanged since rack-v57
```

**The files the port copies verbatim that changed:**

```
tdee.js            8554ad7fdd872ccc0d81a6acdc660d3047832136d31f8679564f69f7e432b065   CHANGED — re-copy, 244 lines (v57: 83c2e76…)
estimate-origin.js b25aae921d6991197c9a5db540618ac248c94174dd3728c01b401792c52cf299   CHANGED — re-copy, 220 lines (v57: 9707d03…)
```

**Import edges:** none changed between pure modules. `estimate-origin.js` still
imports nothing, and `tdee.js` imports what it did. `food.js` (not copied)
takes `fmtRate` and `labelRate` from `units.js` beside what it took.

`food.js`, `rack.css` and `README.md` are not copied verbatim. What each
changed, and what native must do, is below.

---

## 1. `tdee.js` — the band capped at 200 (re-copy)

`calorieZones` (`:189`), one number: `Math.min(250, …)` is `Math.min(200, …)`
(`:191`). The 8% of maintenance, the rounding to 25 and the floor of 150 are
rack-v57's. `zoneOf` is untouched: under `cutTop` is cut, up to and including
`gainFrom` is hold.

- The band is 150 below a maintenance of 2,032, 175 from 2,032, and **200 from
  2,344 up**. rack-v57's went on to 225 from 2,657 and 250 from 2,969; below
  2,657 nothing moved.
- **His case**, maintenance 3,220 (8% is 257.6):

  | | rack-v57 | rack-v58 |
  |---|---|---|
  | band | ±250 | ±200 |
  | holding range | 2,970 to 3,470 | 3,020 to 3,420 |
  | his target, 3,470 (Bulking's own) | the top edge: **holding** | 50 past it: **gaining** |
  | the note under the bar | "Your target, 3,470, sits inside your holding range (maintenance 3,220 ± 250), so the calorie bar reads eating to it as holding, not bulking." | none |
  | Settings → Goal | "Your goal is bulking. " and the same sentence | "Your current goal. Pick another and the calorie target moves to match." |

- **Rack's three presets** (food.js `GOAL_RATE`: Cutting −1, Maintaining 0,
  Bulking +0.5 lb a week), at every whole maintenance from 1,500 to 4,500, each
  lands in its own colour now. The ones whose colour changed:
  - **Bulking**, holding → gaining, at 766 of them: every maintenance from
    2,969 up whose target, maintenance + 250 to the nearest ten, did not round
    past v57's edge (ones digit 0 to 4). For a measured or setup maintenance,
    always a round ten, that is **every one from 2,970 up** (154 to 4,500).
  - **Cutting and Maintaining**: none.
- **Any other target** changes colour exactly when it is more than 200 from
  maintenance and no further than v57's band, and only from holding to its own
  side. That is where a rate typed under Daily targets of about 0.4 to 0.5 lb a
  week either way lands (the target is rounded to ten, so the exact edge
  depends on the maintenance's last digit), and where the floor (protein and
  fat plus 100 g of carbs) can lift a cut. Nothing else moves.
- **What reads it.** `calorieZones` has one reader in web, `food.js`, so these
  move together: the Fuel calorie bar (its bands, ticks, where it ends, the big
  number's colour, "Holding / Gaining / In a deficit"), the note under it
  (`targetNote`), *Reading the bar*, and Settings → Goal (`goalFits`,
  `misfitNote`). Native's Fuel bar, its note, its bar key and its goal sheet:
  **the native run maps this.** Whatever native calls, if it calls
  `calorieZones`, the re-copy moves it.
- **What does not move:** the Weight tab's rate colour and the You tab's
  insights. They read `insights.js` `HOLD_RATE_LB` (0.5 lb a week) and
  `RATE_BAND_LB`, never `calorieZones`; `insights.js` is byte-identical to
  rack-v57's. Coach's energy read is its own (`coach-goal.js`), unchanged.

## 2. *Reading the bar* — what the yellow comes to (`food.js`)

Web: `food.js:744` `holdWords(z, u)` and `:751` `markWords(tcal, z, u)`, pure,
called by `openBarGuide` (`:3614`, `:3621`). `u` is the weight unit. Native's
bar key: **the native run maps this.**

Until v58 the yellow row said the scale "will not move in any direction that
matters" inside the band, and the dashed mark in the yellow said "hitting it
every day holds your weight" — at the edge of v57's 250, half a pound a week.
Now:

- **Yellow — hold:** "3,020 to 3,420 kcal: within 200 of maintenance either
  way, which Rack counts as holding. Eating at its edge every day comes to
  about 0.4 lb a week, up or down." On kilos, "about 0.18 kg a week".
- **The dashed mark**, after the unchanged "Your daily target, N. Where it falls
  tells you what eating to it does: ":
  - in the blue or the red, unchanged: "it is in the blue, so hitting it every
    day is a cut." / "it is in the red, so hitting it every day is a bulk."
  - in the yellow, at maintenance itself (the difference rounds to 0 kcal):
    "it is in the yellow, at maintenance itself, so hitting it every day holds
    your weight."
  - in the yellow, anywhere else: "it is in the yellow, 150 over maintenance,
    so Rack reads hitting it every day as holding — about 0.3 lb a week up."
    ("under" and "down" below maintenance.) When the week rounds to nothing in
    the account's unit, the sentence ends at "as holding."
- **The week** is |target − maintenance| × 7 ÷ 3,500 in pounds, through
  `labelRate`: one decimal on pounds, and on kilos two, which comes to the same
  as ÷ 7,716, the sheet's own footnote. Calories never convert.

## 3. `estimate-origin.js` — `src.desc` (re-copy), and the fix-it sheet

**The contract** (the Worker's half is `rack-worker` `tools/FOOD4-PROMPT.md`,
which this run could not see; this is the brief's, whole):

- A generic row's `name` becomes a short everyday name, like "White rice",
  "Whole wheat toast" or "Sirloin steak".
- The full USDA description moves to a new optional field, `src.desc`, for
  example "Beef, steak, sirloin, NS as to fat eaten".
- Both fields are additive. An older answer, or a cached one, has no
  `src.desc`, and its `name` is the long one.

**The module** (`foodRow`, `:91`; the new lines `:111`–`:112`): a row's origin
carries `desc`, trimmed, only when all of these hold — the row is kind
`'curated'` (the only kind that reaches `foodRow`), it has no venue, its `from`
names USDA (the FDC page URL, or "USDA"), and `desc` is a non-empty string.
Anything else carries no `desc` key at all, so a row without one is rack-v57's
row byte for byte. `EDITED` has none, so a row corrected by hand drops it with
the rest of its provenance.

**The sheet.** Web: `food.js:2272` hands the row's origin's `desc` to
`openProposedEdit` (`:2483`), which prints it inside the Name field, after the
box (`:2500`): "USDA: Beef, steak, sirloin, NS as to fat eaten", `fe-sub
pe-desc` — 11px, dim, 5px under the box, wrapping anywhere, never cut. Only
when it is there. Native's fix-it sheet: **the native run maps this.**

- The estimate screen's rows do not show it. The row says "Sirloin steak" and
  its origin line, "USDA · published Apr 2026", as before.
- A "Which one?" pick carries it: `withPicks` copies the option's row, `src`
  and all, and the result is the same screen.
- "Found in your log" has no `desc` to give — a remembered row keeps name,
  amount, numbers and micros — so its fix-it sheet shows none.
- **Nothing else changes.** What is logged is whatever `name` says;
  `normalizeImport` never reads `desc`. The entry from a reply with `src.desc`
  is key for key the entry from the same reply without it.

## 4. The estimate row — `rack.css`

Web: `rack.css:1670`–`:1684`. The row is one `food-entry pe-row`, drawn by
`openAiReview` (the estimate, and the "Which one?" result), `openRecallHit`
("Found in your log") and the meal builder's ingredients. Native's rows:
**the native run maps this.**

- **The number on the centre line.** The row stretches its items
  (`align-items: stretch`), which is right for the body and Save — each is the
  row's full height as a target, and a button centres its own words. The number
  is not a button, so stretched it sat at the top. `.pe-row .fe-cal
  { align-self: center }`.
- **The ✕ at 44.** `.pe-x` gains `min-height: 44px`; it was its 12px glyph and
  12px of padding, 24px. Its width is unchanged. Save was already 44 or the
  row's height.
- **Two lines for a name.** `.pe-row .fe-name` wraps (`white-space: normal`,
  `overflow-wrap: anywhere`) and is clamped at two lines with an ellipsis
  (`-webkit-line-clamp: 2`).
- **Nothing overlaps.** In the row's 288px at 320 wide, the number (bounded at
  four digits), Save and the ✕ take at most 166.4px with their gaps, so the
  name keeps 121.6px or more (191.6 at 390). "White rice", "Whole wheat toast"
  and "Sirloin steak" each take one line at both widths; "White rice,
  long-grain, enriched, cooked" takes two at most at 390 and can be cut after
  its second at 320. `touch-target.mjs` H has the numbers.

## 5. Two things this ship did not change

- **`recall.js` keys on more than what was typed.** The brief asked to confirm
  it keys only on the typed sentence. It keys that sentence on what was typed —
  but `addEntries` also files **every logged food under its own name**
  (`rememberEntry`). Under the long USDA name nobody typed that key; under the
  short one, "sirloin steak" typed alone finds the 8 oz last logged, exact and
  free, in "Found in your log". A quantity typed with it still has to match.
  Unchanged here (Micah's rule: add no gate, remove none); his call, in
  BACKLOG. Native's recall, if it mirrors web, behaves the same.
- **The balance line was not added.** The brief offered "Curls and other arm
  isolation aren't counted as push or pull" for *Is my training balanced?*'s
  grey reason, only if true. It is not: `coach-volume.js` counts extensions on
  arms as pushing (16 built-in triceps extensions). Curls (23) and carries
  count as neither. `coach-volume.js` is unchanged.

## 6. The verifiers

Counts are checks passed at rack-v58 (rack-v57 in brackets).

| | |
|---|---|
| `usda-desc.mjs` | NEW, 35. **A** the module: `desc` on a USDA row only, trimmed, never on a menu row, another publisher, a model or cache row, an unknown kind or a junk value; rack-v57's `estimate-origin.js` from git as the control — every reply the same rows, `desc` aside, and byte for byte where there is none. **B** the real sheet over a DOM shim: the line under the name, not on the estimate screen, kept when closed unchanged, gone when corrected, none on an older answer, a model row or a menu row, and carried by a "Which one?" pick. **C** what is logged: the name as sent, key for key the same as without `desc`, no `desc` anywhere written. **D** the real `recall.js`: the sentence keyed on what was typed, and each logged food on its own name. The pure half **ports** (A); B–D drive web's sheet and store |
| `maintenance.mjs` | 74 → 90. His case before (rack-v57's `tdee.js`, staged from git) and after; the cap alone moved; the note grid with the new edges; every preset at every maintenance from 1,500 to 4,500 and which changed; any target ±300 at every maintenance; the Weight and You tabs untouched; the band's one reader; *Reading the bar*'s two sentences held to their numbers, 944 yellow rows and 151,984 marks, pounds and kilos. `holdWords` and `markWords` are in `food.js`, which is not copied, so these drive web's; native's words should read the same |
| `touch-target.mjs` | 376 → 408: the ✕ joins A (44px) and the snapshot; **H** the estimate row at 320 and 390 — the centre line, rack-v57's stylesheet from git as the before, the two-line name, and nothing overlapping |

The held batteries did not move: every other verifier's count is rack-v57's.

## 7. What to run

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Both are clean at rack-v58 under `TZ=America/New_York`, `UTC` and
`Pacific/Auckland`: 52 verifiers, all exit 0 (51 at rack-v57).
`maintenance.mjs`, `touch-target.mjs` and `usda-desc.mjs` now read rack-v57
out of git as well, so they need a full clone.

## 8. If the port reads one thing in this file

§1. **One number, `200`, and every screen that draws the band moves with it.**
Re-copy `tdee.js` and check that native's Fuel bar, its note, its bar key and
its goal sheet all ask `calorieZones` rather than holding a band of their own —
a screen with its own copy of 250 would keep calling his bulk a hold.
