# Porting the Train overhaul to rack-mobile

Web shipped as `rack-v33`. The tree it mirrors is `~/dev/rack-mobile`; the
reference copy read while writing this is `/home/claude/native-ref`.

The standing rule for this ship was that logic is written once and copied, never
re-derived from a description — two implementations of one invariant is exactly
how `finishWorkout` and `rebuildHistoryFromLog` came to disagree about the same
data. So for every row below: **copy the named function body across.** Where a
row says "copy verbatim", the web function is pure and takes everything it reads
as arguments precisely so that it can be.

---

## 1. The merge invariant

| | |
|---|---|
| Web | `analytics.js` → `mergeSessionExercises()` (end of section 2) |
| Native | `src/pure/analytics.js` |

Copy the function verbatim and call it from `exerciseIndex()`, `detectPRs()` and
`prTimeline()` — the three places that walk a session's exercises and count
sessions. Native's `exerciseIndex` (src/pure/analytics.js:115) has the same
per-occurrence bug web had: it says in its own comment that `entries` is one row
per session, and increments `sessions` once per occurrence.

Three things the port must not lose:

- The merge keys on a **Map**, not an object literal, so an `exId` of
  `constructor` or `__proto__` cannot collide with a prototype member.
- An exercise with **no `exId`** passes through unmerged rather than collapsing
  every id-less block into one entry.
- The first occurrence's metadata stands for the merged entry, **with anything it
  is missing filled in from a later occurrence**. Dropping that last clause is a
  real regression: a library rename between two picker adds inside one session
  leaves the merged entry nameless and the group pill reads "undefined".

Leave alone, and do not "fix": `exerciseVolume` / `bestSet` / `topWeight` /
`setVolume` / `e1rm` take a single exercise block and have nothing to merge;
`weeklyVolume` and `groupSplit` already count sessions correctly and sum sets,
which is invariant under concatenation. Merging them would double-count.

**Not portable as-is:** nothing here. It is one pure function with no imports.

## 2. Both history writers through one fold

| | |
|---|---|
| Web | `workout.js` → `historyRows()`, `foldSessionIntoHistory()`, `trimHistory()` |
| Native | `src/state/workout.js` — `finishWorkout()` :550-562 and `rebuildHistoryFromLog()` :292 |

Native has the same two disagreeing implementations web had. Replace both with
the three helpers, copied across. All three are non-mutating (`{ ...h }`,
`.slice()`), which is why they drop straight into native's immutable style.

The rule is **one history entry per exId per DATE, sets concatenated in session
order** — not per session. A second session on the same day extends that day's
entry rather than replacing it.

Two consequences Micah should see stated, because the cost lands on him:

- For a 2×/day lifter the "Last ·" line now prints the whole day's sets
  concatenated, not the most recent session's. Per-date is the decisions file's
  literal wording for the history call; a per-session key with a `startedAt`
  sort would also have worked. It was a spec reading, not a forced consequence.
- `trimHistory` rewrites the **whole** history object on every finish (re-sorts,
  re-caps to 20, re-projects every entry). An account whose legacy index holds
  more than 20 rows for some exercise loses the surplus on the next finish of an
  unrelated workout. History is derived and `rebuildHistoryFromLog` reconstructs
  it, so this is recoverable, but it is an unrequested write.

**Does not port as-is:** native's `write('history', history, { removes: 0 })`
(src/state/workout.js:562) is now wrong. The fold can legitimately drop a key —
`trimHistory` omits an exercise whose rows are all unreadable — so the finish
write needs the same `derived: 'workouts'` declaration `rebuildHistoryFromLog`
already uses at :312, not a `removes: 0` promise it can break.

**`historyRows` is not cosmetic.** RTDB hands an array back as an object as soon
as its keys stop being contiguous from zero, and `history` is read straight off
the wire. Without it a bare `.slice()` throws inside `finishWorkout` — after the
session has been written to the log and before the live session is cleared,
which leaves a saved workout on screen as though it were still in progress.

**Idempotency is a property of the call site, not of the fold.** The fold
concatenates, so running one session's finish twice doubles that session's sets
on the "Last ·" line. The fold cannot tell a re-run from a genuine second session
that day and must not try. Web guards it two ways and native needs both:

- a re-entrancy flag on `finishWorkout` (the Finish button awaits the network
  twice and stays live the whole time), released in a `finally`;
- `LS.del('activeSession')` moved to **immediately after the record write**, so a
  relaunch after a kill cannot replay the finish.

## 3. Lifting blocks

| | |
|---|---|
| Web | `workout.js` — `blockOrder` … `commitBlocks`, `collectDone`, `editWorkout`, `renderSession` |
| Native | `src/state/workout.js` + `src/ui/train/*` |

Storage is an **annotation and nothing else**: `block: 1` on the exercise objects
already in `session.exercises`. No new nesting level, no new node, no rules
change. `AGENTS.md` now documents the field.

Copy verbatim, they are pure and take plain objects: `blockOrder`,
`sessionBlocks`, `normalizeBlocks`, `blockEnd`, `addBlock`, `addToBlock`,
`duplicateBlock`, `deleteBlock`, `blockHasLogged`, `sessionLayout`,
`newExercise`. Only `commitBlocks` touches state; native drives the same
functions from its own store.

Two points the port will get wrong if it only reads the UI:

- **`collectDone` renumbers the surviving blocks 1..N on the way IN.** A block
  whose exercises all went unlogged never reaches the record, so without this the
  record can store `block: 2` as the only block in a session that showed one
  block on screen. Native will label blocks straight off the stored number, so
  renumbering on the write side is what stops the two clients disagreeing — and
  what stops a no-op re-edit rewriting stored data.
- `session.blocks` is the one piece of state that is **not** in the record. It
  exists only because an empty block has no exercise to annotate. It rides on the
  live session in local storage and must never reach the database; an empty block
  correctly vanishes at finish.

**Open question for Micah, not a defect:** `duplicateBlock(s, n, editing)` sets
`done: !!editing`, so Duplicate pressed on the *edit* screen writes a whole block
of never-performed sets into the record with real weights and reps. It follows
the house precedent that `+ Set` already sets in edit mode (`collectDone` keeps
only ticked sets, so an unticked copy would silently vanish on save), but Q3 says
the copy lands "unchecked" and that answer was about the live workout. If the
answer changes, it changes in both trees at once.

## 4. Frequent chip

| | |
|---|---|
| Web | `picker.js` — `sessionCounts`, `historyCounts`, `frequentOrder`, `frequentDefault`, `PICKER_FILTERS`, `frequentEmptyNote` |
| Native | `src/state/picker.js`, `src/ui/train/picker.jsx` (:73 `useState('all')`, :91 chip row) |

Copy the six exports verbatim. Ordering is by **distinct sessions an exId was
logged in**, descending, all time, counted off `allSessions()` — never
`history/{exId}`, which caps at 20 and ties every staple at the top of the list
the feature exists to order. The dedupe goes through `mergeSessionExercises`, so
the picker cannot disagree with itself about a duplicated block.

Four rules a copier cannot read off the ordering functions alone:

- **An empty `sessions` array is ignored.** `allSessions()` resolves `[]` rather
  than rejecting when the read falls back, so an unreadable log is
  indistinguishable from an empty one. Adopting it replaces a populated cold-start
  stand-in with nothing and tells a 219-session account that Frequent fills in as
  it logs workouts.
- **`touched`.** Once a chip has been tapped, the late counts never move the
  chip again.
- **Repaint only when the rendered order changes.** On a cold read this lands
  with the sheet open and a finger already moving.
- **Search on the Frequent chip falls through to the whole library**, and
  anything currently selected stays on the list at a count of zero. Both exist
  because the two flows that reach for an exercise you have *never* done are the
  two the default chip was hiding.

**Does not port as-is:** web seeds the cold start from `history`, which
`workout.js` reads once at boot and hands to `initPicker(history)` — that shape
exists to avoid a second GET and a circular import on web. Native's picker store
can read whatever it already has.

## 5. First-workout coach mark

| | |
|---|---|
| Web | `workout.js` — `refreshCoachMark`, `showCoach`, `coachExIdx`; `rack.css` `.set-check.coach` |
| Native | `src/ui/train/SetRow.jsx` + wherever the session screen owns its state |

**There is no flag anywhere.** The condition is derived from data: show it when
the account has no finished sessions, nothing in this session is ticked, and no
check has been tapped this app run. Both clients already load the same history,
so the condition evaluates identically without either knowing the other exists.
Do not add a key under `onboarding` — the live rules publish
`"$other": { ".validate": false }` there and a stray key breaks `markTourDone()`
silently.

Copy `showCoach(s, none, tapped)` and `coachExIdx(s)` verbatim. The anchor is the
first exercise that actually **has a set row**, not index 0: an exercise whose
only set was swiped away renders no row and no hint line, and index 0 would take
the mark off the screen with the lesson still not landed.

`refreshCoachMark` is never awaited by a render, `null` means "not looked yet",
and only `true` draws anything — so a read that fails degrades to no hint rather
than to a blocked screen. It reads **both** the log and the per-exercise index
and needs both empty: `allSessions()` resolves `[]` rather than rejecting when
the read falls back, so on the log alone an established account whose log was
unreachable gets taught how to complete a set.

**Does not port as-is, and is the one thing most likely to be dropped:** the CSS
carries a steady yellow border *and* fill under the pulse, plus its own
`@media (prefers-reduced-motion: reduce) { animation: none }`. The global
reduced-motion rule shortens animations but never stops a repeating one, and an
animation in effect beats the plain background below it — without the explicit
block the steady fill never paints and the box strobes for exactly the people who
asked for less movement. Whatever native's animation primitive is, it needs the
same two layers and the same reduced-motion opt-out.

## 6. Tour card line

| | |
|---|---|
| Web | `onboarding.js` — the `workout` card's `body` in `TOUR` |
| Native | `src/state/onboarding.js:227` |

Copy the string. It now reads: *"Fill in the weight and reps, then tap the check
box at the end of the row — that is what logs the set."*

The same rule is on the coach mark's hint line (`workout.js`, "Fill in the weight
and reps, then tap the box on the right to log the set"). **The two strings teach
one rule and must move together in both trees.**

They say both halves on purpose. `collectDone` filters
`s.done && s.w !== '' && s.r !== ''`, so a ticked, green, reps-filled set with a
blank weight is silently dropped — which is the normal case for the 43 bodyweight
exercises in `exercises.js`, and a bodyweight-only session lands on "No completed
sets — Discard this workout?". **That is a real pre-existing defect in both
trees and it is not fixed here.** Typing `0` works and nothing says so. It wants
its own ship: either the check button refuses a tick with an empty `w`, or a
bodyweight exercise defaults `w` to `0`. Do not "simplify" either copy string
back to "tap the check box" until that is done.

## 7. Known, accepted, not bugs

- An exercise whose whole history is one blocked session no longer draws a 1RM
  trend line (`stats.js:408` needs two entries). It used to draw a line between
  two blocks of the same day — a fabricated progression on one date. Correct now,
  but for the beta account (1 session, every lift 4×) several charts visibly
  disappear and will be reported as a bug.
- `bestVolume` / `bestVolumeDate` on the index are now per-session rather than
  per-occurrence. The PR string is literally "best session volume", so leaving
  them per-occurrence while `entries` is per-session would make one object
  contradict itself.
- The Most-trained card and the Frequent chip are **not** the same number and
  never were: Most trained is range-scoped and skips an exercise logged with
  warm-ups only, the picker's list is all-time and counts it. Do not "reconcile"
  them by changing either.
