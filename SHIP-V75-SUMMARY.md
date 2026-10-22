# rack-v75 — "Replace exercise"

Shipped 22 Oct 2026 on branch `ship-v75`, from `rack-v74` (`92dd00f`). Not
merged; nothing deployed.

**Micah:** "when in a workout and you have exercises, on the three little dots
add a button along with the remove exercise button to replace with another
exercise. Thats another common thing my app doesn't have."

**Nothing in the published rules moves.** `database.rules.json` and
`database.rules.OPTIONAL-LOCK.json` are byte-identical to rack-v74. No new
node, no new field. No Worker change. No Coach file changed.

## What changed

**The ⋯ on an exercise card, live session** (`workout.js` `openExerciseMenu`).
It used to open the remove confirm directly. Now it opens a sheet:

- title: the exercise's name
- only when a set on the card is ticked, a note: "Your ticked sets stay where
  they are. The new exercise goes in below with the sets you have left."
- **Replace exercise** (`btn btn-ghost btn-block`)
- **Remove exercise** (`btn btn-danger btn-block`) — opens the same confirm as
  before ("Remove {name}?" / "It will be taken out of this workout along with
  its sets." / Remove)
- **Cancel**

The ⋯'s aria-label is "More for {name}" in a live session.

**In an edit of a past session** the ⋯ is unchanged: it goes straight to the
remove confirm, aria-label "Remove {name}". Every set there is a logged set, so
a replace could only add a card and replace nothing — it is not offered.

**Replace exercise** closes the menu and opens the shipped picker
(`picker.js` `openPicker`) as one pick: `single: true`, opened on the
exercise's own muscle group chip, the exercise itself left out, titled
"Replace {name}". "New" makes a custom exercise and that is the pick. Cancel
changes nothing.

**The pick** (`replacePicked` → `replaceExercise`, pure, exported):

- **Nothing ticked on the card:** the card becomes the new exercise in the
  same place and the same lifting block, with as many set rows as it had (a
  drop set's drops count as part of their set). Each row is built the way
  "+ Set" builds one: the NEW exercise's last time in grey (`nextGrey`, its
  warm-ups first, `tl: true`), or blank with no last time. None of the old
  lift's numbers or routine targets come across. At least one row.
- **Anything ticked:** the old card keeps every ticked set exactly as it is.
  Rows he had not started (unticked, both boxes empty, outside any drop set)
  come off it, and the new exercise goes in **directly below**, same block,
  with one row per row that came off (at least one), built as above. A row he
  typed into but did not tick stays on the old card, because those are his
  numbers and Finish's warnings are about them.
- Saved like every live edit (`persistSession`, the device copy). Nothing is
  written to Firebase until Finish, and then `collectFrom` builds the record
  and `foldSessionIntoHistory` folds each exercise under its own `exId`.
- If the card moved or was removed while the picker was open (index and exId
  must both still match), nothing is replaced.
- A session started from a routine holds copies of the routine's rows
  (`toSession`), and `replaceExercise` mutates nothing, so the saved routine is
  never touched.

Plain lifts, lifting blocks, bodyweight and cardio cards all replace the same
way. Nothing is hidden except in a past-session edit.

## Verified

- `tools-check/replace-exercise.mjs` (new, 83 checks) runs the real
  workout.js / analytics.js / blocks.js staged over the fake store, plus the
  screen functions lifted verbatim. It covers the clean swap (count and position
  kept, warm-up ramp, drop rows, blocks), keep-and-insert (logged sets
  byte-identical, the record and the history index), picker cancel and empty
  pick, a card moved under the open picker, a custom exercise as the
  replacement, a bodyweight and a cardio card, a refused write at Finish
  (session, history, month cache and device copy unchanged, no recap, and the
  next Finish saves once), and a routine-started session (the frozen routine
  stays byte-identical).
- `tools-check/touch-target.mjs`: the menu's two button kinds added as sites.
  All of them are at least 44px. The snapshot gains 4 rows and no existing row
  changed.
- `tools-check/friends-structure.mjs`: the version pin moved to rack-v75.
- Every `tools-check/*.mjs` exits 0 under TZ America/New_York, UTC and
  Pacific/Auckland, and the Coach battery passes with GATE=all and 0 wrong. The
  run's results are in the handoff.

## Handoff

- **Shipped** — the exercise card's ⋯ in a live workout now offers Replace exercise beside Remove exercise: a clean swap when nothing is ticked, otherwise the new exercise goes in below and the ticked sets stay.
- **Service worker** — rack-v75 (sw.js and usage.js).
- **Before it's live** — nothing, merging is enough.
- **To check it worked** — merge, close Rack from the app switcher, open it, close and open once more. Start a workout, add Bench Press, tap its ⋯. You should see Replace exercise, Remove exercise and Cancel. Tap Replace exercise and pick Dumbbell Bench Press: the card swaps in place with the same number of rows. Tick a set, then replace again: the ticked card stays and the new one appears under it.
- **Risk** — the ⋯ trigger itself (`.ex-menu`) is still the small glyph button it always was, under 44px, and was not changed. Remove is now two taps (menu, then confirm) in a live session. If the session already holds the new exercise further down, Coach's per-card "shown" marks (keyed `exId#nth`) can shift by one card; that is harmless.
