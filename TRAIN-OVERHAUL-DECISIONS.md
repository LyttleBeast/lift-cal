# Train tab overhaul — decisions log
Started 14 Sep 2026. Baseline: e2b90f9 (rack-v31), clone ~/dev/ship-v32.

Each entry is a question asked and the answer Micah gave. This is the input to
the build prompt; nothing gets built from an unanswered question.

## Scope as stated
0. Port the safety fixes to web (month-erasure, destructive-write guard,
   provenance patch, two matcher bugs).
1. lb/kg weight unit — set at account setup, changeable in Settings.
2. Onboarding: teach that a set is completed by tapping the check box.
3. "Add Lifting Block" beside a halved "Add exercise" button.
4. Exercise picker: "Frequently performed" chip, default; "All" moved to the back.

## Noted for later, NOT this ship
- The native app has no Statistics button. Web's Train landing has four stacked
  buttons (Start workout / Routines / Exercises / Statistics, workout.js:278 ->
  stats.js openStats); the port never got the fourth. Separate job.

## Calls made without asking (reversible, no data impact)
- STORAGE UNIT: lb stays the single stored unit forever; lb/kg is a
  display-and-input conversion only (`settings/units`). Reason: 219 existing
  sessions carry no unit tag, volume/PR/milestone maths runs across all of
  history, the new .validate bounds assume lb ranges, and the native port has to
  agree byte-for-byte. Mixed-unit storage would make every consumer unit-aware
  and the mixing permanent.
- FREQUENT LIST LENGTH: show everything ever logged, ordered — no arbitrary cap.
  The list is scrollable and searchable already.
- FREQUENT EMPTY STATE: an account with no history falls through to All
  automatically, so the default chip is never a dead screen.
- ROUTINES + BLOCKS: routines cannot save a block in v1. Deferred.

## Answers

### Q1 — How far does the lb/kg setting reach?
**Answer: OUT OF THIS SHIP.** It is much bigger than it looked — `lb` is an
app-wide assumption, not a Train one. Logged as ROADMAP.md §8 ("Weight units —
lb or kg", large, *talked about*) with the file/line survey and the
convert-at-the-edges decision recorded so it does not have to be rediscovered.
It becomes its own update. Nothing about units is built today.

### Q2 — How does checking off work inside a block?
**Answer: a block is a CONTAINER, not a new set model.**
- "Add Lifting Block" sits beside a halved "Add exercise" and adds an EMPTY box,
  laid out like an exercise card.
- Inside the block is its own "Add exercise" button. Exercises go in and behave
  exactly as they do today — normal set rows, normal weight/reps inputs, normal
  per-set check button. No round concept, no round-level check.
- A **duplicate block** button is the point of the feature: this training style
  repeats whole blocks rather than repeating sets, so you duplicate the
  container instead of adding a 4th set to one exercise.
- Micah's framing: this is a targeted feature for a specific training style, not
  a change everyone experiences.

Storage consequence: a block is a grouping ANNOTATION on the existing
`session.exercises[]` (e.g. `block: 1`). The stored record shape does not
change, so detectPRs / computeVolume / sessionMilestones / history / analytics /
stats / the .validate rules / the native port all keep working untouched, and
the 219 existing sessions stay valid (no annotation = ungrouped).

### Finding forced by the duplicate button — duplicate exIds in one session
Duplicating a block puts the SAME exId in `session.exercises` more than once.
Two code paths disagree about that today, and it is already reachable by adding
an exercise twice by hand:

- `workout.js:870` (finishWorkout) — `history[exId] = [entry, ...filter(h =>
  h.date !== dateK)]`. Each occurrence prepends and filters out the same-date
  entry the PREVIOUS occurrence just wrote, so **the last block wins and the
  earlier ones are silently discarded** from the "last time" line.
- `workout.js:110` (rebuildHistoryFromLog) — PUSHES each occurrence instead, so
  after any edit or delete the same exercise gets **three separate entries on
  the same date**.

So the "last time" line changes depending on whether you have edited the session
since. **Call made (no data risk, fixes an existing bug):** merge occurrences —
one history entry per exId per date, sets concatenated in session order — and
make both paths produce identical output, with a check pinning it.

### Q3 — What carries into a duplicated block?
**Answer: exercises + weights and reps, unchecked.** The copy lands with the
same numbers filled in and nothing ticked; you adjust what changed and check.
Consistent with `workout.js:644`, where adding a set already prefills from the
previous set.

### Further calls made on blocks (small, reversible)
- The duplicate is inserted immediately after the block it came from, and blocks
  are auto-numbered (Block 1, Block 2...). No user-supplied block names in v1.
- Blocks and ungrouped exercises coexist freely in one session — an exercise
  with no block annotation renders exactly as it does today.
- No block-level rest timer. Micah's model keeps normal set rows and normal
  per-set checks, so rest keeps firing per set exactly as it does now; there is
  no round boundary for it to attach to.
- Deleting a block that contains logged sets asks for confirmation first
  (confirmSheet), the same as discarding a workout.

### Q4 — How is "Frequently performed" ordered?
**Answer: by how many times the exercise has been LOGGED — sessions it appears
in, not sets — descending, all time.** Bench and deadlift at the top for Micah.

Source resolved: NOT `history/{exId}`. History caps at 20 entries per exercise,
so his most-performed lifts would all saturate at 20 and tie at exactly the top
of the list the feature exists to order. The right source is `allSessions()`
(analytics.js:33), which is cached in `flatCache` and already called by
finishWorkout for PR detection, so the count is a cheap pass over data that is
usually in memory.

**Calls made (implementation, no user-visible choice):**
- Count DISTINCT sessions an exId appears in. A duplicated block that puts the
  same exercise in one session three times counts as ONE, not three — otherwise
  the block feature would inflate its own ordering.
- Cold start: if `flatCache` is empty when the picker opens (new session, straight
  into Add exercise), warm it in the background and fall back to ordering by the
  already-loaded `history` until it lands. No spinner in front of the picker.
- Chip label is "Frequent" — "Frequently performed" does not fit a chip row next
  to the muscle groups. The full phrase is used in the empty state.

### Q5 — Where does the "tap the box to complete a set" lesson live?
**Answer: both.** A line added to the existing Train tour card, AND a one-time
coach mark on the first set row of the person's first workout — the check button
pulses/points, it dismisses on first tap, and a flag in the onboarding node stops
it ever returning. The tour line is nearly free; the coach mark is the one that
actually lands, because it fires at the moment of confusion rather than five
screens earlier on a screen with no sets on it.

Note the existing hazard: `onboarding` already has `"$other": false` published in
the live rules and round-trips DB data, so the new flag must be added to the
rules or `markTourDone()` starts failing silently. AGENTS.md rule 5 says the same.

### Trap found while specifying Q5 — do not flag the coach mark under `onboarding`
Verified against the LIVE published rules (`database.rules.json`):

    users/$uid/onboarding  ->  "$other": { ".validate": false }
    users/$uid/settings    ->  .write only, no $other restriction

So adding `coachSetDone` under `onboarding` is REFUSED by the live database
today, and because `onboarding` is round-tripped as a whole container, a stray
key there is what breaks `markTourDone()` silently. The new .validate rules are
not published yet, so this is live behaviour, not a future risk.

**Call made:** the coach-mark flag lives in **localStorage**, exactly like the
Train section's `restDefault` (settings.js:153), which is already a device-local
preference in this very part of the app. No rules dependency, nothing new
written to a restricted node. The cost — it can show once more on a new device —
is acceptable for a one-time hint, and matches how rest default already behaves.
If it ever needs to be account-wide, `settings/*` is the node that accepts new
children; `onboarding` is not.

### Q6 — Ship order
**Answer: two pushes.** `rack-v32` = the safety fixes only (month-erasure,
destructive-write guard, provenance patch, the two matcher bugs), verified live.
`rack-v33` = the Train overhaul. Reason: a Pages rollback is a revert-and-push,
and bundling them means a block or picker bug drags the data-loss fix back out
of production with it.

### Finding — blocks break `exerciseIndex`'s stated contract (WRONG NUMBERS)
`analytics.js:93` says in its own comment: "`entries` is one row per session the
exercise appeared in", and it keeps an `e.sessions` counter incremented per
occurrence. A duplicated block puts the same exId in ONE session several times,
so both go wrong.

Where it shows: `stats.js:194` — the **"Most trained"** card ranks by
`e.sessions` and prints `e.sessions + '×'` and `e.sessions + ' sessions'`. A
lifter using blocks would read "Bench — 87 sessions" having trained it in 40.
That is a wrong number on screen, not a cosmetic issue.

**The single invariant this and the history findings share:**

> An exercise appearing more than once in one session is ONE logical entry for
> that session, with its sets concatenated in session order.

Three places must implement it identically, and a check must pin all three:
1. `workout.js:870` — the history write in `finishWorkout` (currently: last
   occurrence wins, earlier ones discarded)
2. `workout.js:110` — `rebuildHistoryFromLog` (currently: one entry per
   occurrence, so the same date appears N times)
3. `analytics.js:94` — `exerciseIndex` (currently: `entries` and `sessions`
   both count occurrences, breaking the documented contract)

Note this bug class is ALREADY reachable on the live site by adding the same
exercise twice by hand. Blocks make it routine rather than rare.

### Q7 — Where does the coach mark remember itself?
**Answer: nowhere. It stores no flag at all.**
Show it when the account has **no finished sessions**. Both options originally
offered (localStorage / `settings/*`) were solving it for the web in isolation.
Deriving it from data instead means: no flag, no rules dependency, no
`onboarding` `$other` trap, and nothing to port — both clients already load the
same history, so the condition evaluates identically without either knowing the
other exists. It also fails in the right direction: a person who has completed
sets never sees it, a person who somehow has not keeps being taught, which is
the exact failure this feature exists to fix.

### THE STANDING RULE for this and every web update (Micah, 14 Sep)
> The website is the guinea pig — real people, real data, real feedback, which is
> why changes land here first. But the real end goal is the problem being fixed
> **in native**. Every decision is judged by how it lands there, not by what is
> convenient on web.

Consequences adopted:
- **Logic is written once, in a form the port copies verbatim.** `exerciseIndex`
  already exists in both trees (`analytics.js` on web, `src/pure/analytics.js` on
  native), so the merge invariant is ONE pure function copied across — never two
  implementations written from the same prose. Two implementations of one
  invariant is precisely how `finishWorkout` and `rebuildHistoryFromLog` came to
  disagree about the same data.
- **Validates the block-as-annotation call.** A new nesting level in the record
  would have been a data migration on two clients; `block: 1` on the existing
  array is a UI change on the second.
- **Every change is specified with BOTH destinations** so the native pass is
  mechanical:

  | Change | Web | Native |
  |---|---|---|
  | Safety fixes | `workout.js`, `store.js` | already fixed — this is the REVERSE port |
  | Merge invariant | `analytics.js`, `workout.js` | `src/pure/analytics.js`, `src/state/workout.js` |
  | Blocks | `workout.js` | `src/state/workout.js` + `src/ui/train/*` |
  | Frequent chip | `picker.js` | `src/state/picker.js`, `src/ui/train/picker.jsx` |
  | Coach mark | `workout.js` | `src/ui/train/*` |
  | Tour line | `onboarding.js` | `src/state/onboarding.js` |

### Q8 — Confirmed: fix the "Most trained" counts on existing data
Measured against the real export rather than argued in the abstract:
- Micah's account (219 sessions): only 3 sessions contain a repeated exercise.
  Three numbers move by one — dumbbell lateral raise 28->27, incline dumbbell
  bench 14->13, cable curl 10->9. Bench (43) and deadlift (40) untouched; no
  ranking reorders.
- Beta account `hvlIJwAL…` (1 session): EVERY exercise reads 4 when the truth is
  1 — squat, bench, deadlift, overhead press, barbell row all 4x reality on the
  Most-trained card, in production today. That person is already hand-rolling the
  block pattern by re-adding the exercise instead of adding a set to it, which is
  both evidence the feature has a real user and possibly the same confusion the
  coach mark addresses.
So this is not "changing history" — it is making the number match what the code
already documents it to be, and it takes a live wrong number out of a real
account.
