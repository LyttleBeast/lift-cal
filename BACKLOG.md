# Rack — backlog

Everything still open, in one place. It replaces `ROADMAP.md`, which had become
a record of eight shipped features with a handful of live items buried in it.

Two things this file is not. It is not a design document — where a shape was
already decided, the decision stays where it was written and this only points at
it. And it is not a port brief: `NEXT-NATIVE.md`, `NEXT-NATIVE-UNITS.md` and
`NEXT-NATIVE-V40.md` are the instructions for copying work into
`~/dev/rack-mobile`, and they stay. What is below is the list of things nobody
has done yet.

Read [AGENTS.md](AGENTS.md) for what exists and [CLAUDE.md](CLAUDE.md) for how
to work on it.

Native-tree claims below were checked against `~/dev/rack-mobile` at the fixed
commit `85be276`. That tree moves on its own, so verify before acting on one.

---

## Waiting on Micah, not on code

- **The PROPOSED rules need `food/targets/maintSrc`.** v40 added one optional
  key to `food/targets`: `'setup' | 'pinned'`. The published rules
  (`database.rules.json`) do not mention `food/targets` at all, so it lands
  today. `web-patches/database.rules.PROPOSED.json` in the native tree validates
  that node key by key and has no `$other` deny inside it, so an un-added
  `maintSrc` would land there too — **unvalidated**, which is the thing worth
  fixing before those rules are published. Enum of the two strings.
- **The PROPOSED rules are still missing `settings/units`** —
  `NEXT-NATIVE-UNITS.md` §12, zero occurrences at `85be276`. The first units
  write after that publish fails silently without it.
- **The stricter `.validate` rules themselves.** They were the reason v40's
  Phase 3 existed: until a refused write said so on screen and kept its payload,
  publishing them turned a too-strict rule into silent data loss. That half is
  done. Publishing is a decision, not a code change.

---

## Open features

### A kilo plate set, and a bar-weight setting

`workout.js:1162 renderPlates` computes an American rack — 45/35/25/10/5/2½ on a
45 lb bar. A gym stocked in kilos has 25/20/15/10/5/2½/1¼ on a 20 kg bar, which
is a different set and not these six relabelled: "2 × 20.4" is a number nobody
can find on a rack. So a metric account's strip says **"Per side · lb plates"**
(`workout.js:1164`) and keeps working, deliberately.

The real answer is a second plate set plus a bar-weight setting, and it is a
small ship of its own. Carried from ROADMAP §8; the same note is in
`NEXT-NATIVE-UNITS.md` §9, which tells the native tree not to "finish" it either.

### A stored bodyweight set reads "0", not "BW"

v40 made a ticked set with reps record a blank weight as the string `'0'`
(`workout.js collectFrom`). Every consumer takes it without throwing and without
claiming anything false — `tools-check/bodyweight-sets.mjs` proves that — but
nothing has been taught to *print* it yet. What a stored `w: '0'` looks like
today, all via `fmtSetW`, which returns the string `'0'`:

| Where | file:line | Prints |
|---|---|---|
| "Last ·" line on the session screen | `workout.js:1038` | `0×12` |
| Day view on the calendar | `workout.js:554` | `0×12` |
| Post-workout recap | `workout.js:1641` | `0×12` |
| "First time logged" card on the recap | `workout.js:1602` | `0 × 12` |
| The weight box when a past session is re-opened to edit | `workout.js:1110` | `0` in the box, which is honest — that is what is stored |
| Strongest-lifts leaderboard, Stats | `stats.js:192` | `0 × 12` (only if it ever tops an exercise, which needs every set of it to be bodyweight) |
| One exercise's Personal bests, Stats | `stats.js:443` | `0 × 12` |
| PR timeline detail | `analytics.js:334` `prDetail` | `0 x 12` |
| Strongest lifts, You tab | `you.js:1211` | `0 × 12` |

Making those read `BW × 12` is one change to `fmtSetW` and nothing else, and it
should be written once and copied to both trees rather than done twice. Not done
in v40 because it is a different ship from "the set is not dropped".

Related and already true, not a bug: an e1RM needs a weight on the bar, so
bodyweight work produces none, and `you.js:1203` says so on screen.

### Steps — questions never answered

From ROADMAP §1, minus the ones the world overtook:

- Is the tab worth its slot at one number a day?
- Backfill: Health holds years of step history. Worth a one-time bulk import the
  way `importer.js` does Liftoff?
- Should a training day suppress the step goal, or is that over-thinking it?

Not carried: "does the feed node start carrying steps too" — there is no feed
node any more.

Note that v40 removed the *walkthrough* that told people how to push steps in
from a phone automation, because it talked them through putting their Rack
password into a third-party app. Every reader of `src` stayed, and days already
logged that way still render (`steps.js:199`). Anyone wanting to build one can
still use Firebase's REST API; the app no longer writes the recipe down.

### Routines — two deferred ideas

From ROADMAP §3, the two that were never decided:

- Should a routine remember progression — "last time you did this routine you
  benched 225, try 230"? Real value, and a second feature.
- Folders or tags once there are more than about eight routines?

The third open question in that section is closed: targets are placeholders, not
prefilled values, and `AGENTS.md` (`routines/{routineId}`) documents why.

### The maintenance model's honest limits

From ROADMAP §5. One of the three is a to-do rather than a limitation:

- **Down-weight days whose logged intake is implausibly low.** A half-entered
  food log makes that day's adjusted weight read heavy, and the confidence
  weighting does not currently look at whether a day's intake is credible.

The other two are limits to live with, not work: 3,500 kcal/lb is a fat figure
and lies over a few days (the 21-day window is what carries that), and a sodium
swing, a new creatine dose or an illness moves water weight in ways no
food-timestamp model can see.

**And the rule that goes with all of it: this never becomes an activity model.**
Steps are deliberately not an input — the estimate is empirical, so activity is
already inside the scale trend, and a step term would count the same walking
twice. `AGENTS.md` (`steps/{date}`) says the same thing.

---

## The native port

`~/dev/rack-mobile`. Three briefs, each still partly open at `85be276`:

- **`NEXT-NATIVE-V40.md`** — this ship. Phase 1 (the maintenance model coming
  out of hiding) and Phase 4a. Confirmed open: `src/pure/tdee.js` has no
  `effectiveMaint`.
- **`NEXT-NATIVE.md`** — the Train overhaul. §1 (the merge invariant) and §3
  (lifting blocks) are in: `src/pure/analytics.js` has `mergeSessionExercises`
  and `src/pure/blocks.js` exists. **§4, the Frequent chip, is not** —
  `frequentOrder` / `frequentDefault` (`picker.js:125`, `:136`) have no native
  counterpart. §2, §5 and §6 were not verified.
- **`NEXT-NATIVE-UNITS.md`** — `src/pure/units.js` exists, so the module itself
  is across. §10's rework rows (the settings control, the setup screens, the
  render sites) were not verified.

Two notes that belong with the port rather than in it:

- The native tree has **no `tools-check/` equivalent**. `NEXT-NATIVE-UNITS.md`
  §11 asks for one — sections A–F of `tools-check/units.mjs` are pure and run
  against the native copy with the imports repointed. The same is now true of
  `maintenance.mjs`, `bodyweight-sets.mjs` and `refused-write.mjs`.
- The two dead-letter designs will differ. Web's `write()` **throws** on a
  refusal; native's `write()` at `85be276` reports and **returns**. Neither is
  wrong, but the port has to pick one on purpose. `NEXT-NATIVE-V40.md` has the
  diff.

---

## Known, accepted, not bugs

Carried from `NEXT-NATIVE.md` §7 so it survives that file. Do not "fix" these:

- An exercise whose whole history is one blocked session draws no 1RM trend line
  (`stats.js:410` needs two entries). It used to draw a line between two blocks
  of the same day — a fabricated progression on one date.
- `bestVolume` / `bestVolumeDate` on the exercise index are per-session, not
  per-occurrence, because the PR string is literally "best session volume".
- The Most-trained card and the Frequent chip are not the same number and never
  were. Most trained is range-scoped and skips an exercise logged with warm-ups
  only; the picker's list is all-time and counts it.
- Three things are left in **pounds on purpose** and labelled as pounds on
  screen, because a wrong number is worse than no number: the plate strip above,
  the workout importer (`importer.js:18` — its file is already in Rack's storage
  format, so its weights *are* pounds), and the half-a-fluid-ounce-per-pound
  water rule (`onboarding.js:135`), which has no metric form. The bodyweight that
  last one is quoted against does convert.

---

## What v40 left open in its own work

- **Not every `write()` caller was audited to the end.** v40 fixed Train, Fuel
  logging, Weight and onboarding, so that a refusal can neither leave module
  state claiming a save nor escape a click handler as an unhandled rejection.
  These were listed rather than fixed, and each has the same two questions to
  answer:

  `routines.js:41` · `picker.js:69, 454, 464, 478, 499, 505, 506` ·
  `importer.js:145, 157, 171` · `settings.js:504, 600` ·
  `steps.js:467, 479, 559` · `water.js:103, 437` ·
  `food.js:235, 1278, 1406, 1424, 1519, 1673, 2752, 3161, 3186, 3476`

  None of them is new exposure — `write()` has thrown from the destructive-write
  guard since v32 — and the food/items and food/meals sites in particular leave
  the in-memory library holding an item the database refused until the next
  read.

- **A malformed payload is still queued forever.** `isRefusal` catches
  `PERMISSION_DENIED`, which is what a rules rejection and a failed `.validate`
  both arrive as. A client-side SDK error — a `NaN` in the payload, an
  `undefined`, a path too deep — is not that, so it still goes to the queue and
  replays on every reconnect. `settings.js:375` describes the NaN case and
  guards against it by range-checking before the write; nothing generic does.

- **The dead-letter list drops the newest item when it is full of sessions.**
  `store.js` never evicts a `workouts/` payload to make room for anything else,
  which is right — a session has no second copy on the device — but the
  consequence is that 50 refused sessions mean a refused food log is reported on
  screen and not kept. Reachable only after a catastrophic rules publish.

- **Daily targets' auto preview does not read the maintenance box.**
  `food.js` wires `mi.oninput = paintAuto`, but `paintAuto` reads `maintInfo()`,
  which reads stored `targets` — so typing a maintenance number repaints the
  preview with the old one until Save. Pre-existing; v40 did not make it worse
  and did not fix it.

- **`food/daySummaries` can go stale on a refusal.** The day's log write and its
  rollup are two writes. If the log lands and the rollup is refused, the rollup
  is wrong until the next change to that day — and `AGENTS.md` warns that a
  stale summary skews the maintenance estimate for two weeks. The red bar fires;
  nothing repairs it automatically.
