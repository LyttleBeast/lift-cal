# Porting rack-v75 to rack-mobile

rack-v75 is "Replace exercise" on the exercise card's ⋯ (`SHIP-V75-SUMMARY.md`
has what shipped and why). The build string is `rack-v75`.
`database.rules.json` is byte-identical to rack-v74. No node, no field, and no
rules change.

## 1. Pure files

**No pinned pure file changed.** `blocks.js`, `analytics.js`, `coach*.js`,
`friends-*.js` and the others in `src/pure/` are byte-identical to rack-v74,
so nothing needs re-pinning.

The one new pure function is in `workout.js`, beside `useNext`. Copy it byte
for byte into `src/state/workout.js`, the way `nextGrey`, `tickSet` and
`useNext` are copied:

```
export function replaceExercise(exercises, exIdx, x, prevSets)
```

- `exercises` is the live session's list. `exIdx` is the card. `x` is a
  picker/library row `{ id, name, group, equipment }`. `prevSets` is the new
  exercise's "Last ·" entry's `sets` (`lastEntry(x.id)`), or `null`.
- It returns a new list and mutates nothing. It is a no-op when there is no
  card at `exIdx`, no `x` or `x.id`, or `x.id === old.exId`.
- **Nothing on the card is `done`:** `list[exIdx]` becomes `{ exId, name,
  group, equipment, block?, sets }`. `sets` has one row per old row that is not
  a drop's continuation (`continuesDrop`), with a minimum of one.
- **Anything `done`:** the old card keeps `keepSets(sets, (s, j) =>
  !unstarted(s, j))`. `unstarted` means not done, `w` and `r` both blank, and
  `dropHeads(sets)[j] == null`. The new card is spliced in at `exIdx + 1`
  with one row per unstarted row, with a minimum of one.
- Each new row is `{ w: '', r: '', type: 'N', done: false, ...(t ? { ...t, tl:
  true } : null) }` with `t = nextGrey(prevSets, rowsSoFar)`, the same rule
  as "+ Set". A warm-up row arrives as `type: 'W'`.
- It needs `dropHeads`, `continuesDrop` and `keepSets` from `analytics.js`
  (already pure in `src/pure/`) and `nextGrey`.

`workout.js` as committed on `ship-v75` has sha256
`ea8a2c521b3e4fa793bdebefaf30941a6b43053440ffbc5d0d84b33d82256c35`. It is the reference, not a
pinned file.

## 2. The impure half (session screen)

**The ⋯ on an exercise card** (web `openExerciseMenu`):

- **In a live session** it opens a sheet with:
  - a title: the exercise name
  - only if any set on the card is `done`, a note: **"Your ticked sets stay where they are. The new exercise goes in below with the sets you have left."**
  - **"Replace exercise"**, a ghost button
  - **"Remove exercise"**, a danger button. It opens the existing confirm: **"Remove {name}?"** / "It will be taken out of this workout along with its sets." / **Remove**
  - **"Cancel"**

  The accessibility label is **"More for {name}"**.
- **In an edit of a past session** nothing changes. The ⋯ opens the remove
  confirm directly, with the label **"Remove {name}"**. Replace is not offered.
- Every button is at least 44pt tall.

**Replace exercise** closes the sheet and opens the picker as a single pick:
`filter: ex.group`, `exclude: [ex.exId]`, `single: true`, title **"Replace
{name}"**. A custom exercise made from "New" is the pick. Cancel calls nothing.

**On a pick** (web `replacePicked(exId, exIdx, chosen)`):

- Take `chosen[0]`.
- Refuse in an edit, or when `session.exercises[exIdx].exId !== exId` (the card moved under the open picker).
- Set `session.exercises = replaceExercise(session.exercises, exIdx, x, lastEntry(x.id)?.sets ?? null)`.
- Persist the live session (the native equivalent of `activeSession`) and repaint.
- Write nothing to Firebase. Finish's `collectFrom` and `foldSessionIntoHistory` handle the rest unchanged.

There is no usage counter for it, deliberately, so no `usage/` key is added.

## 3. What native must not do

- Do not offer Replace in a past-session edit.
- Do not carry the old lift's typed numbers or routine `tw`/`tr` onto the new card.
- Do not move or alter a ticked set, or any row inside a drop set.
- Do not write the routine.

## 4. Verify

Port `tools-check/replace-exercise.mjs` sections A, B and H (pure) as a
native verifier against `src/state/workout.js`. They are table-driven and need
no DOM.
