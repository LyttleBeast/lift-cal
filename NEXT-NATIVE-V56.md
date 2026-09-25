# Porting rack-v56 to rack-mobile

Web shipped as `rack-v56`. The tree it mirrors is `~/dev/rack-mobile`.

v56 is **three things**:

- **A. The week, read right.** *Is my training balanced?* no longer drops push
  against pull when one group is over a quarter custom exercises: that group's
  sets are left out, the split is still said, and it says what was left out.
  Two counts are joined by a comma, never a second "and". *How's my weekly
  volume?* gives Get stronger and Powerlifting 6–15 only on the groups that
  carry the main lifts (chest, back, legs), and 10–20 everywhere else. The stall
  ladder reads the same floor.
- **B. The movement of a custom exercise.** An optional **Movement** (and
  **Angle**) in the custom exercise editor, stored on the exercise, read by the
  balance split. A custom exercise with a movement counts in the split.
- **C. v55's leftovers.** `+ Set` after a drop set copies the drop set's first
  set; Coach's "Last time" quotes say a drop set once, as a group; the routine
  editor draws drop sets grouped with **+ Drop**; "Found in your log" has **Save
  as meal**.

The build brief is `SHIP-V56-PROMPT.md`. What changed in Coach, with the before
and after, is `COACH-REPORT.md` §95–§101; what is not done is `BACKLOG.md` under
*What v56 left open*.

**`rack-mobile` was NOT read.** The run was fenced to `~/dev/ship-v56`, as the
brief ordered. Where this file would have to guess a native path, it says
**the native run maps this**. This file is the delta on top of V55, so port
V55 first.

**What is stored:**

- **`pattern` and `angle` on a custom exercise**, `exercises/custom[i]`. Both
  optional, each from a closed list. **Absent means today's meaning**, and
  nothing migrates. §5, §6.
- **`asked.bal_custom`** in `settings/coach`: an epoch-ms stamp, the same kind
  as v54's `asked.vol_neglect`. §7.
- Nothing else. `dp` (v55) is written in more places now (the routine editor's
  **+ Drop**), in the shape v55 documented.

`database.rules.json` and the OPTIONAL-LOCK file are **byte-identical to
rack-v55**. `exercises` and `settings` both carry section-level `.write`s and
validate nothing under them, so both new keys land. **Native's PROPOSED rules:
§6.**

**What is read:** nothing new. The library Coach already reads carries two
more keys on a custom exercise that has them (`coach-data.js` `libIndex`).
Nothing is read at boot or on a paint that was not read before.

---

## ⚠ THE PINS

Unchanged since rack-v55:

```
units.js           fa6f03c9b2a097821c194af2be8e9711da5f940f3a35850d17897c77da4f6da5   unchanged since rack-v41
exercises.js       74ac8a9885376b79940daa6a184dfed14bfa4e32d2226e4e367db53dfd9d9857   unchanged
blocks.js          1fd10b3b82aa89082dee1675120d5a39fe7c21e7f7232b1930b6ce233a1fbbaf   unchanged
accounts.js        f89af13550da39c24a643ea411b8f8c820202bf605aa990aab15f2d64506d471   unchanged
tdee.js            83c2e76b71cfa2f6c8260fae807182e0682af48459bcd30b7be9eb9c4d48fe3d   unchanged
coach-ready.js     a72c1309967a36f927208402242df8469f201b0c490eae3a28346ee419f1cd6a   unchanged since rack-v52
coach-fuel.js      36fdf21814d6b32d3ac6bb1411636fe664f1c58e569f8569d1f4c786d1bfd896   unchanged since rack-v53
estimate-origin.js 9707d03f432a23990ca3ee054ea4e65680df670e99ddd87a829ea0c8b9c0ce6e   unchanged since rack-v55
estimate-ask.js    d64e4b5785c44c1e55d37bfaee599e4b85ad1e79af3484f7863b719a884aa479   unchanged since rack-v55
```

**The files the port copies verbatim that changed:**

```
coach-tags.js      dd2d49bc833ceb44b06949b400afb93d4421dceebf14982bcb2cecd2aac9c79a   CHANGED — re-copy, 423 lines (v55: 8465015…, unchanged since rack-v42)
coach-goal.js      3956ca36008c1de04fca72223ebd806e1b1a873c90b6dce46136c77f8fbe96a7   CHANGED — re-copy, 319 lines (v55: 6cd88a7…, unchanged since rack-v49)
coach-volume.js    55f4b85bd93c3f2e83ec1ccc78c6afd3fdce1fca296ebdc44e66d1c1d2f6f519   CHANGED — re-copy, 546 lines (v55: 1a56027…)
coach-overlap.js   c11307f3eeca63fe5e41f61acef446e064b1c8911a2548e9c5d8948639e7d4ac   CHANGED — re-copy, 1,177 lines (v55: 1652e27…)
coach.js           e98a08f6c540b91a71362a44b17e4c846bceb34c0cc5a35a6e71d5850536cf6f   CHANGED — re-copy, 5,436 lines (v55: 4b27c43…)
coach-prog.js      8a24bd625888f70abf92d714a9f8d0040919ef5b5762f189e8a2fceed64b0ff5   CHANGED — re-copy, 1,238 lines (v55: 7e935a2…)
coach-live.js      621968c572e5e86134851249b4745f2ca2aa0a00777392ba81b02c495e5b8641   CHANGED — re-copy, 714 lines (v55: 73a50f9…)
coach-build.js     a1d204a5e52a85345cf193e8d827a91c36d13023f0b54f7acffb4e6e354c19a0   CHANGED — re-copy, 771 lines (v55: 9993643…)
analytics.js       02d2d112de893d136ed02ac92f7938c3b7408be2da3daa13b2e40ad3c754033f   CHANGED — re-copy, 1,145 lines (v55: bb95331…)
```

**Import edges that changed**, all between pure modules:

- `coach-overlap.js` takes `MAIN_LIFTS` and `mainLiftGroups` from
  `coach-goal.js`, and `EXERCISE_BY_ID` from `exercises.js`.
- `coach-volume.js` takes `MAIN_LIFTS`, `MAIN_LIFT_AIMS` and `mainLiftGroups`
  from `coach-goal.js`.
- `coach-live.js`, `coach-build.js` and `coach-prog.js` take `dropRuns` and
  `setsText` from `analytics.js`: set math, pure.
- `picker.js` (not copied verbatim) takes the movement vocabulary from
  `coach-tags.js`, which still imports nothing.

`picker.js`, `workout.js`, `routines.js`, `food.js`, `coach-data.js`,
`coach-ui.js` and `rack.css` are not copied verbatim. What each changed, and
what native must do, is below.

---

## 1. `coach-goal.js` — the main lifts, and a floor per group (re-copy)

Spec §6.2 and §8.2 give Get stronger 6–15 "on the groups carrying the main
lifts", and Powerlifting 6–15 on "the big three's groups". v54 had 6–15 on every
group, because the code had no idea which groups those were (v54's departure 3).
The code does know which lifts are the main ones. `coach-overlap.js` `bigThree()`
read them from a list of its own: squat, bench and deadlift, each as the
variants the big three are read from. That is the only list of main lifts the
code has, and Get stronger has none of its own.

- **`MAIN_LIFTS`** (`coach-goal.js:156`): that list, moved here so the goal owns
  it. `[['squat', ['back-squat-low-bar', 'back-squat-high-bar']], ['bench',
  ['barbell-bench-press', 'barbell-bench-press-paused']], ['deadlift',
  ['conventional-deadlift', 'sumo-deadlift']]]`. `coach-overlap.js:1122`
  `BIG_THREE` is now this list, unchanged.
- **`MAIN_LIFT_AIMS`** (`:162`): `strength`, `powerlifting`.
- **`mainLiftGroups(byId)`** (`:163`): each lift's primary group, read from
  the library that is handed in (`exercises.js`: **legs, chest, back**). It is
  handed in so this file still imports nothing.
- **`volumeFloor(aim, normal, main)`** (`:142`): a third argument. `main ===
  false` on a main-lift aim gives the common range's floor (`VOLUME_FLOOR.none`,
  10). Left out, it gives the aim's own floor, as before.

## 2. `coach-volume.js` — the week (re-copy)

**The range per group.** `MAIN_GROUPS` (`:127`), `bandAim` (`:130`); `volumeRead`
(`:293`) passes `volumeFloor(aim, null, MAIN_GROUPS.includes(g))` and takes the
top from `TOP[bandAim(aim, g)]`.

| Aim | Chest, back, legs | Shoulders, arms | Core |
|---|---|---|---|
| Get stronger | 6–15 | **10–20** (was 6–15) | readout only |
| Powerlifting | 6–15 | **10–20** (was 6–15) | readout only |
| Build muscle, Recomp, no aim | 10–20 | 10–20 | readout only |
| Stay consistent | 6–12 | 6–12 | readout only |
| Lose fat, keep strength | ⅔ of the pre-cut normal | the same | readout only |

- The line names the range it used. A group with no main lift, on a main-lift
  aim, says "a common range for a group with no main lift" (`whose`, `:357`):
  "Arms: 16 hard sets in the last 7 days, inside 10–20, a common range for a
  group with no main lift. About right."
- Under the first line the reason adds, on those two aims only (`mainSaid`,
  `:362`): "For strength, 6–15 is for the groups with a main lift in them
  (squat, bench and deadlift): chest, back and legs. The rest get 10–20."
- The focus raise applies as before: arms focused on Get stronger is 13–26.

**Push against pull, without a customs-heavy group.** `SPLITS` (`:438`),
`balanceRead` (`:446`):

- The movement counts are kept **per primary group** now (`PAT_KEYS` `:157`,
  `countSession` `:192`), so one group can be left out of one split.
- Push against pull is the one split read across groups. Its `sides` are:
  pushing on chest, shoulders and arms; pulling on back.
  - A group over a quarter custom exercises (`heavy`) is left out of it by its
    sets (`left`). The split is still read, and the two-to-one bar applies to
    what is counted.
  - It is skipped whole only when every group carrying one of its sides is out.
    Back out means no pulling to count, so it is skipped rather than said as
    "32 pushing sets, 0 pulling".
- The press direction, the pull direction and knee against hip are skipped
  whole when one of their groups is heavy, **as before**.
- `skipped` is now the heavy groups that did skip a split; `heavy` is all of
  them.

**The words** (`SPLIT_WORDS` `:497`, `COUNT_WORDS` `:506`, `leftSaid` `:511`):

- Two counts are joined by a comma, never a second "and":
  - "Over 8 weeks: 37 squat and lunge sets, 36 hinge and bridge sets."
  - "Over 8 weeks: 32 pushing sets, 8 pulling sets, more than two to one."
  - "…24 flat, incline or decline pressing sets, none overhead."
- With nothing lopsided, each of the two big splits is its own line (v55 put
  both on one line with a semicolon).
- A split with a group left out ends: "Your arms work isn’t in this: more than a
  quarter of it is custom exercises." (or "…of each…" for two).

**His own movement** (`:213`): `tagsFor(ex.exId, row)` for an id that is not a
built-in. A custom exercise with a movement counts in the split. It is not
among "N sets on your custom exercises aren’t in this split", and not in the
customs' share of its group. It still counts for its primary group only.

**The pointer** (`HINT_EVERY_DAYS` `:116`, `:485`, `:536`): when any group is
heavy and `asked.bal_custom` is not within 28 days, the last line is "You can
set the movement of a custom exercise in its settings, and Coach will count it."
(reason: "Coach mentions this once in four weeks."), and the answer carries
`once: 'bal_custom'`.

## 3. `coach-overlap.js` — the stall ladder reads the same floor (re-copy)

`:416`: the volume rung's floor is `volumeFloor(c.aim, normal12,
MAIN_GROUPS.includes(g))`, the same floor *How's my weekly volume?* reads for the
same group. v54 shared one floor between the two so they could never disagree,
and this keeps that. **A shipped reading moves:**

- A plateaued shoulders or arms lift on Get stronger or Powerlifting now reaches
  the volume rung under 10 sets a week, not 6: "+4 sets a week for shoulders
  would reach a common starting point of 10."
- Chest, back and legs lifts are unchanged. So are all other aims.

`coach-volume.mjs` G9 and G10 read it both ways. The `coach-overlap` battery
(24) did not move.

## 4. `coach-tags.js` — his own movement (re-copy)

The table (`TAGS`, the agreement table `PATTERN_GROUPS`) is **untouched**. New,
from `:360`:

- **`PATTERN_ANGLES`** (`:367`): the angles each pattern is tagged with in the
  table, read off its rows, never listed separately. Press has all four, fly
  has flat, incline and decline, curl has incline, extension has flat and
  overhead, crunch has decline, and everything else has none.
- **`PATTERN_LABELS`** (`:371`), **`ANGLE_LABELS`** (`:376`): the editor's words.

  | pattern | label | pattern | label | pattern | label |
  |---|---|---|---|---|---|
  | press | Press | curl | Curl | lunge | Lunge |
  | row | Row | extension | Extension | carry | Carry |
  | pulldown | Pulldown or pull-up | hinge | Hinge | bridge | Bridge or thrust |
  | fly | Fly | squat | Squat | crunch | Crunch or plank |
  | raise | Raise | rotation | Rotation | cardio | Cardio |

  Angles: Flat, Incline, Decline, Overhead.
- **`patternsOn(group)`** (`:379`): the patterns `PATTERN_GROUPS` allows on a
  group, in vocabulary order.
- **`ownMovement(row)`** (`:388`): **the one reader.** It takes `{ group,
  pattern, angle }` and returns `{ pattern, angle }`. The pattern is kept only
  when it is in `PATTERNS` and allowed on that group. The angle is kept only when
  that pattern is tagged with it, and otherwise it is `null`. With no pattern
  kept, the result is `null`. Anything else — a capital, a number, an array,
  `constructor` — is no movement.
- **`tagsFor(exId, row)`** (`:408`), **`patternOf(exId, row)`** (`:414`):
  - A built-in id reads the table, whatever the row says. **Pinned.**
  - Any other id, handed its library row, reads `ownMovement(row)` as
    `{ id, pattern, angle, load: null, side: null }`, frozen.
  - Called with the id alone, it returns what it always did: `null` for a
    custom exercise.
- The file still imports nothing, and its code never names a custom exercise,
  the library or hidden ids (`coach-tags.mjs` F).

**Who reads it tonight: `coach-volume.js`, and nothing else.** The builder,
the swaps, the variation rung and the targets all call `tagsFor(exId)` with the
id alone, so none of them suggests anything new because of a movement
(`custom-movement.mjs` D proves the builder byte for byte). Suggesting customs
by movement is its own decision.

## 5. The custom exercise editor — Movement and Angle

Web: `picker.js:443` `movementRows`, `:479` `putMovement`, `:544` (edit),
`:639`/`:686` (new), `:567` (the save), `:89` `addCustom`; `rack.css:618`–`:632`.
Native's exercise editor: **the native run maps this.**

- **New and edit, his own exercises only.** A built-in's editor has no Movement,
  because its tags are pinned.
- Under Equipment: a **Movement** label and a row of chips. First is **Not set**
  (the default), then `PATTERN_LABELS` for `patternsOn(group)`. With arms chosen,
  for example: Not set · Press · Curl · Extension · Carry.
- With a pattern that has angles, an **Angle** row: Not set, then
  `ANGLE_LABELS` for `PATTERN_ANGLES[pattern]`.
- Picking another movement clears the angle. **Changing the group** repaints the
  rows. If the new group does not take the chosen movement, it goes back to Not
  set, so a pairing the table refuses is never kept.
- A note: "Optional. Set it, and Coach counts this exercise by its movement when
  it reads your balance."
- **The chip** (`.move-opt`): a button, **min-height 44px**, padding 8px 14px,
  border 1px `--collar`, radius 8px, background `--rack`, text `--steel`, **12px
  Archivo `'wdth' 92, 'wght' 600`**, line-height 1.25, no wrap. Chosen: border
  `--p-yellow`, background `--collar`, text `--chalk`. `.move-opts` wraps whole,
  with a gap of 6px. This is the Your goal chip's type, so V55 §5's measurements
  apply.
  - At 320px every label fits its row with 3% held back: the longest,
    "Pulldown or pull-up", is 132px of 288px.
  - Every chip is at least 44px wide as a target: "Fly" is 45.5px
    (`touch-target.mjs` G).
- **What is written**: only what `ownMovement()` keeps.
  - A movement writes `pattern`, and writes `angle` only when there is one.
  - "Not set" **removes both keys**: absent, never `null` or `''`.
  - A new exercise left Not set is exactly today's shape: `{ id, name, group,
    equipment, secondary, custom }`.
- **The write is the existing whole-array write**, `exercises/custom`. Every
  other custom exercise goes out byte for byte.
- **Web now takes on the list only once `write()` resolves**. This is
  `store.js`'s documented rule, and both the edit and a new exercise follow it.
  A refusal from the database, or a guard block (a whole-array write that would
  drop another device's additions), leaves the server untouched and this device
  holding what the database holds. The editor stays open.
  - Native's store is written differently: its `write()` reports and returns
    (BACKLOG, the dead-letter note).
  - **Whichever way native does it, the list in memory must not claim a save
    that was refused.**

## 6. The PROPOSED rules — `exercises/custom/$i`

**The published rules take both keys as they are:** `exercises` carries a
section-level `.write` and validates nothing under it. **Web cannot see
native's rules.** Native's PROPOSED rules may validate `exercises/custom/$i` key
by key, or end it in `"$other": { ".validate": false }`. If so, add these two,
through `tools/rules/build.mjs`:

```json
"exercises": {
  "custom": {
    "$i": {
      "pattern": { ".validate": "newData.isString() && newData.val().matches(/^(press|row|pulldown|fly|raise|curl|extension|hinge|squat|lunge|carry|bridge|crunch|rotation|cardio)$/)" },
      "angle":   { ".validate": "newData.isString() && newData.val().matches(/^(incline|flat|decline|overhead)$/) && newData.parent().child('pattern').exists()" }
    }
  }
}
```

- **An exercise without either key must still pass.** Both are optional, and
  every custom exercise before v56 lacks them.
- The enums are `coach-tags.js`'s `PATTERNS` and `ANGLES`. If a vocabulary ever
  grows, this rule grows with it.
- The group-to-pattern agreement is **not** enforced here. The client never
  writes a pattern its group refuses, and a reader that meets one reads no
  movement, so the rule refuses only a bug and a wrong pairing costs nothing.
  Enforcing the table in a rule would be a second copy of it.
- `angle` without `pattern` is refused: the client never writes one alone.
- `exercises/custom` is written whole, so the rule validates every element on
  every write. An element that fails blocks the whole list.

**PROPOSED, not published.** Micah publishes rules; nothing here does.

## 7. `coach.js`, `coach-data.js`, `coach-ui.js`

- **`coach.js`** (re-copy):
  - `ONCE_LINES` (`:5338`) is `['vol_neglect', 'bal_custom']`, and
    `normSettings()` keeps both stamps.
  - The router (`:5227`) carries the balance answer's `once`, as it already did
    the volume answer's.
- **`coach-data.js`** `libIndex` (`:450`): a custom exercise's `pattern` and
  `angle` ride through as stored strings. Nothing there judges them;
  `ownMovement()` does. A row without them keeps the shipped three fields.
  - **Native's gatherer must carry them too**, or Coach never sees a movement.
- **`coach-ui.js`**: no behaviour changed. The sheet stamps any answer's
  `once` as it draws it (`markAsked`), so `bal_custom` needs nothing new.
  - `asked.bal_custom` is a child of `settings/coach`, like
    `asked.vol_neglect`. **If native's PROPOSED `settings/coach.asked`
    enumerates its keys, `bal_custom` joins `vol_neglect`** as a number.

## 8. v55's drop-set leftovers

**`analytics.js` `repeatOf(sets)`** (`:262`, re-copy): the set `+ Set` copies.
That is the last set, or, when the last set is in a drop set, that drop set's
**first** set (the one he changed to D). It is never the last drop.

**`+ Set`** (`workout.js:942` `addSetTo`; `routines.js:463`): copy
`repeatOf(ex.sets)` as a **normal** set, `type: 'N'`, with no `dp`. After "185 × 8
→ 135 × 6 → 95 × 5", `+ Set` gives 185 × 8 (v55 gave 95 × 5). A lone `'D'` from
before v55 is its own first set, so nothing about it changed.

**Coach's "Last time" quotes** (re-copy): `coach-live.js:324` (`lastTime`, the
in-gym "Last time on …"), `coach-build.js:274` (`setsLine`, the proposal's
line) and `coach-prog.js:609` (a target's "Last time:"):

- A drop set with drops in it is one item, through `setsText`, with each set
  said as Coach says a set everywhere ("185 lb × 8"), then ", a drop set":
  - before: "1 × 12 at 40 lb, 1 × 12 at 40 lb drop set, 1 × 9 at 25 lb drop set,
    1 × 8 at 15 lb drop set"
  - after: "1 × 12 at 40 lb, 40 lb × 12 → 25 lb × 9 → 15 lb × 8, a drop set"
- Kilos go through `units.js` like every other weight: "18.1 kg × 12 → 11.3 kg
  × 9 → 6.8 kg × 8, a drop set".
- A `'D'` with no drops reads exactly as it did.

**The routine editor** (`routines.js:409`–`:475`; native's routine editor:
**the native run maps this**):

- `dropHeads(ex.sets)`. A drop's row gets class `drop` and the badge `↳`, with
  the title "A drop in the drop set above…".
- **+ Drop** (`btn btn-ghost drop-add`, aria-label "Add a drop to this drop
  set") goes under each drop set's last set. It calls `addDrop(ex.sets, si, {
  tw: '', tr: '' })`, so the targets start **empty**, as the session's boxes do.
- The same CSS as the session screen (`rack.css:546`–`:553`) applies unchanged.
- The routine's preview line (`routines.js:195`) goes through `setsText`:
  "185×8  185×8 → 135×6 → 95×5".
- Saving and starting keep the groups (`toSession` `:243`, and v55's `dp` in
  the save map `:559`). `drop-sets.mjs` G drives it: edit → + Drop → + Set →
  save → start.

## 9. Save as meal on "Found in your log"

Web: `food.js:2328` `openRecallHit`, the button at `:2413`–`:2418`. Native's
recall sheet: **the native run maps this.**

- Under **Log it**, a ghost **Save as meal**. It is not shown while building a
  meal (`onPick`).
- It is the estimate sheet's own call: `saveAsMeal(entries, mealName(entries,
  [], null), meal)` opens **the same save-only builder** (V55 §6). The name box
  opens with the first two items ("Rice, Ground beef 85/15"), since a recall
  row carries no venue. The rows are saved as they stand, corrections included.
- A saved ingredient is what `cleanIng` keeps, with no `src: 'recall'`.
  Logging the plate from the sheet afterwards is exactly what it was:
  `src: 'recall'`, no estimate spent.

## 10. The verifiers

Counts are checks passed at rack-v56 (rack-v55 in brackets).

| | |
|---|---|
| `custom-movement.mjs` | NEW, 60. It drives the real `picker.js` against the real `store.js` over a Firebase stub. **A** the vocabulary: closed, disallowed pairings refused, built-ins pinned. **B** the editor: Not set by default, the group's patterns only, the angle row, the group change, only valid values written, today's shape for a new one left Not set. **C** the whole-array write: every other exercise byte for byte, the guard passes an edit and refuses a partial list, a refusal leaves server and memory as they were, and the rules file is byte-identical. **D** Coach: `libIndex` carries the keys, a movement moves the sets into the split, the pointer once in 28 days, the builder byte for byte. A **ports**; B and C drive web's picker and store |
| `coach-volume.mjs` | 83 → 101; battery **40 → 55**, the 40 held. G5–G10 the range per group and the ladder; L11–L15 push : pull with a group left out; M1–M4 Micah's answers, reconstructed and read by rack-v55 (staged out of git at `f2ba45e`) beside today's. Three sentence checks moved on purpose (the comma) |
| `coach-voice.mjs` | 91 → 93: O reads a customs-heavy log too, and checks that no readout joins its counts with two "and"s, with rack-v55's own sentence as the control |
| `drop-sets.mjs` | 82 → 101: C's `+ Set` check; G `repeatOf`, the three quotes before (rack-v54's engines) and after, kilos, the routine editor driven for real, the start. Its routine-import pin names the new imports |
| `save-as-meal.mjs` | 36 → 49: E, "Found in your log" |
| `touch-target.mjs` | 319 → 374: the Movement chips and the routine editor's **+ Drop** held to 44px, their widths in the snapshot; G measures every Movement and Angle label at 320 and 390 |
| `coach-tags.mjs` | 39 → 45: H, the tag read's new second argument. The table's checks are untouched |
| `coach-pure.mjs` | 209: F, G and H let `coach-build.js`, `coach-live.js` and `coach-prog.js` take `dropRuns` and `setsText` |
| `effort`, `grey-last` | stage the real `repeatOf` beside the `addSetTo` they lift |
| `frequent`, `coach-surface`, `coach-boot` | stage `picker.js`'s new `coach-tags.js` import |

The held batteries did not move: `coach-prog` 57/0/0 and 16/0/0,
`coach-overlap` 24/0/0, `coach-ready` 46/0/0, `coach-fuel` 16/0/0, `finish`
12/0/0.

## 11. What to run

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Both are clean at rack-v56 under `TZ=America/New_York`, `UTC` and
`Pacific/Auckland`: 50 verifiers, all exit 0 (49 at rack-v55).

## 12. If the port reads one thing in this file

§4. **A built-in's tags are pinned, and a custom exercise's movement is his.**
`ownMovement()` is the one reader: the editor writes only what it keeps, and
Coach reads only what it keeps. Anything else — a stored pairing the table
refuses, junk, an angle a pattern never has — is no movement at all, which is
exactly what a custom exercise was before v56. And only `coach-volume.js` hands
`tagsFor` a row, so nothing that suggests exercises reads a movement until
someone decides it should.
