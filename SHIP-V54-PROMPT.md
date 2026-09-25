# SHIP-V54-PROMPT.md: Coach stage five, "in the gym" (rack-v54)

Commissioned 25 Sep 2026, just after midnight. This is the build brief for one
Claude Code run in `~/dev/ship-v54`, a fenced clone of lift-cal at `71cb16e`
(**rack-v53**, live). Micah checked it on the website last night: the You card
and COACH ME opened on "Great workout. New best on Machine Pec Fly." Nobody
will be watching this run. It goes overnight, and Micah reads your summary in
the morning before he pushes anything.

---

## 0. Ground rules. These are not negotiable.

**You do not push, deploy or publish.**

- No `git push`, `wrangler`, `firebase`, `eas`, `gh` or `gh-pages`.
- Commit through the hooks. Never use `--no-verify`.
- `echo GUARDTEST ping` must be refused. If it runs, stop and say so.
- Reads and writes go through Read/Edit/Write. Bash runs things (node, the
  verifiers, read-only git). It never writes a file with `sed -i`, a heredoc,
  `tee`, `cat >`, or a compound command that does any of those.
- Never open, read or write `~/dev/rack-mobile`, `~/dev/rack-worker`,
  `~/dev/rack-food`, `~/live`, or any other `~/dev/ship-v*` tree. A native run
  is working in `rack-mobile` tonight. Web's handoff to native is a document
  (§10), never an edit.
- `database.rules.json` (the published rules) is not changed by one byte.
- `~/dev/ship-v54` must be a **full** clone at `71cb16e`. If `git log --oneline
  -1` says anything else, stop and say what it says.
- If you hit a stale `.git/index.lock`, or anything else in `.git` you did not
  make, stop and say so. Delete nothing in `.git`.

**Micah's rules for this app, which every brief carries:**

- **A wrong number is worse than no number.** Silence is always an answer.
- **Web is the guinea pig. Native is the destination.** Logic goes in a pure
  module the native port copies verbatim. Every change names its web file, and
  the handoff (§10) names what native must do.
- **Mid-workout is the most sensitive place Coach speaks.** He is under a bar.
  Nothing pops up. When the signals disagree, "done" wins.

---

## 1. The situation

**On 25 Sep 2026 the app went onto a launch timeline.** It goes to Apple on
6 Nov. The first window, Sep 25 to Oct 4, is "finish Coach, and the known
bugs". This ship is the biggest piece of that window: Coach **stage five**
(COACH-TRAINER-SPEC.md §13, S5), plus the per-set effort tap Micah asked for
after doing a Coach-built workout on 24 Sep. His words:

> "We definitely should add some sort of effort per set function, I think
> that's called RIR. Like imagine I do a set it told me to and it was way too
> easy, I could click on the in-lift Coach button and there's a button like,
> that set was way too easy, and it could try to adjust accordingly."

**Pro and Basic were scrapped on 25 Sep.** Launch is one plan: a free trial,
then a paywall, and paying users get everything. So Coach is no longer
Pro-only. **Removing the gates is the paywall ship's job (Oct 5–14), not
yours.** For this ship:

- A new intent takes the `tier` its siblings have (`'pro'`).
- A new surface sits behind the gate the surface it lives on already has. For
  example, the effort chips live in the live sheet, and that sheet opens from
  the Pro-gated live chip.
- Add no new kind of gate, lock or teaser. Remove none.

That way the paywall ship flips one thing, everywhere, once.

**What is already fixed, so you don't redo it:**

- `record.groups` counting warm-ups was fixed in `884ddd9` (23 Sep).
  `BACKLOG.md`'s v52 section still lists it. Correct the doc and change no
  code for it.
- The ZXing offline cache (`dc86c79`) and the 44px buttons (`1ea2a4b`) are also
  fixed.

---

## 2. Read these IN FULL before you write a line

1. `CLAUDE.md` and `AGENTS.md`: the house rules, the verifier conventions, and
   how a ship is versioned.
2. `COACH-TRAINER-SPEC.md`. Read the whole thing once. Then read these again:
   - §3 (progression): §3.2 gates, §3.4 the load step, §3.5 the decision, and
     **§3.10 mid-session**;
   - **§6 (volume, frequency, fatigue, balance)**, all of it;
   - **§12.4 (the placeholder for effort)**;
   - §13 (the S5 row);
   - §14 (his 16 decisions, especially 4, 5, 6 and 14).
3. `COACH-REPORT.md`: §69–§78 (v53), then §59–§68 (v52) for how a stage was
   written up.
4. `BACKLOG.md`: the v53 and v52 sections, and "v42 — found while building
   Coach".
5. `SHIP-V53-PROMPT.md`: for the conventions this brief assumes (phases, the
   voice rules, how verifiers are changed on purpose).
6. The code this ship touches:
   - `coach-live.js` (the whole header comment);
   - `coach-prog.js` (`prescribe`, `targetFor`, the load step);
   - `coach.js` (`c.live`, `liveInput`, `CATEGORIES`, the registry, `ask`, the
     topics);
   - `coach-ui.js` ("IN THE GYM": `liveChip`, `openLiveSheet`, `noteLiveTick`);
   - `workout.js`: `collectFrom`, `tickSet`, `dupSet`, `newExercise`, the
     `+ Set` handler, the "Last ·" line, `runFinish`, `saveEdit`, and what
     "Add it" is handed;
   - `blocks.js` `duplicateBlock`;
   - `routines.js` (every place a set is built);
   - `analytics.js` `isWorking`;
   - `tools-check/coach-live.mjs` (the in-gym fence) and
     `tools-check/tick-targets.mjs`.

Count the verifiers in `tools-check/` and run every one under
`TZ=America/New_York`, `TZ=UTC` and `TZ=Pacific/Auckland` **before** you
change anything. Write the counts down. You will report them again at the end.

---

## 3. Micah's decisions for this ship

These are decided. Build to them. If the code makes one impossible, say so in
the report. Don't quietly pick another.

1. **Where the effort tap lives.** It lives in the live Coach sheet (the chip
   in a live workout's header row), as he described it. Nothing on the set
   row. Nothing pops up. No prompt after a tick.
2. **What it says.** Three chips: **Way too easy**, **About right**, **Too
   hard**. They sit under a line that names the set being rated, for example
   "Set 3 · 135 lb × 8. How was it?"
3. **What it rates.** The **last ticked working set** (`isWorking`) of the
   exercise in hand. If the exercise in hand has no ticked working set, there
   are no chips.
4. **What it stores.** `rir` on that set: an integer. Way too easy = `4`,
   About right = `2`, Too hard = `0`.
   - Readers accept any integer 0–5, as §6.4 and §12.4 define it.
   - Absent means unknown, and every rule treats unknown exactly as today.
   - Tapping another chip replaces the rating. Tapping the chosen chip again
     clears it (the key is deleted, not set to null).
   - **Unticking a set deletes its `rir`**, because a rating is of a set that
     was done. This is a change to `tickSet`, so extend
     `tools-check/tick-targets.mjs`.
5. **In the gym, a rating changes the next set** (§5.2 below). After a
   rating, Coach answers with the next set and one button: **Use it for my
   next set**.
   - The button writes `tw`/`tr` (the grey targets) on the next unticked set
     of that exercise, or adds one set carrying them if none is left.
   - It never writes `w` or `r`, and a box he typed into keeps what he typed.
   - Nothing is applied without the tap.
6. **At the next session, a rating changes the target** (§5.3 below). One step
   at most, never after an F, and never from a marked session.
7. **Singles and lone heavy top sets stay untargeted.** That is decision 6
   from 23 Sep. The spec says the tap unlocks them at RIR ≥ 2, but that is a
   new call for Micah. Log it in `BACKLOG.md` as the next decision. Don't
   build it.
8. **Grey last-time numbers on hand-added exercises** (his 23 Sep request, §4):
   - applies to a **live** session only, never an edit;
   - comes from the same session the "Last ·" line quotes, so the two can't
     disagree;
   - maps last time's **working** sets onto the new sets **by position**;
   - past the end of last time's sets, repeats last time's final working set.
9. **Coach's targets are not the grey numbers on a hand-added exercise.** He
   asked for his last numbers there. Coach's number for the next set is in the
   live sheet, and *Use it for my next set* is how it reaches a row.
10. **Today is a day, not a session** (§6, the same-day fix). A group or
    exercise he trained in a session he already finished today counts as
    trained today.
11. **Volume and balance are sheet answers only.** Never the card, never the
    live sheet. Build them as spec §6 says, with its numbers.
12. **No health reasons, ever**, in any balance or volume sentence. No "for
    shoulder health", no posture, no injury. Counts only (§6.5).

---

## 4. Phase A: grey last-time numbers on a hand-added exercise

Do this first. It is the smallest piece and the most self-contained.

**Today:**

- `newExercise` gives a hand-added exercise one blank set.
- `+ Set` copies the previous set's typed `w`/`r` (`workout.js` ~1197), or
  gives blanks.
- The "Last ·" line quotes `history[exId]`'s newest entry that isn't the date
  being edited (`workout.js` ~1150).

**Build:**

- A **pure** function beside `tickSet` in `workout.js` (the port copies it
  from the same place), for example `lastTargets(prevSets, n)`. It returns the
  `{ tw, tr }` for set number `n`:
  - taken from last time's **working** sets by position;
  - once past their end, from last time's final working set;
  - when last time's weight was a bodyweight `'0'`, `tw` is `''`, so the box
    stays blank and a tick records `'0'` exactly as collectFrom does today.
    Never print "0" as a target;
  - `tw` and `tr` are stored pounds-as-strings, like `w` and `r`, copied with
    no units call. A conversion here would be the second one.
- **Where it applies:**
  - `newExercise` in a live session gives the first set its grey numbers.
    This covers every hand-added path: the `+ Add exercise` button, the block's
    `+ Add exercise`, and Coach's *Add it*, because they all hand in the same
    function.
  - `+ Set`, when the previous set's boxes are blank, gives the new set the
    grey numbers for its position.
  - When the previous set has typed values, `+ Set` behaves exactly as today.
- **Where it doesn't:**
  - an edit of a past session (`session._edit`);
  - an exercise with no "Last ·" session;
  - an exercise that already carries `tw`/`tr` from a routine or the builder.
- **Ticking adopts the grey numbers** by the existing `tickSet` rule. A box he
  typed into is never overwritten.
- **Verifier:** new `tools-check/grey-last.mjs`, driving the real functions:
  - positions, repeat-past-the-end, bodyweight, warm-ups skipped, and no last
    time;
  - edit mode gets nothing;
  - a typed box survives a tick;
  - a routine target is untouched;
  - in kg, the placeholder is printed converted and the stored value is still
    pounds.

---

## 5. Phase B: next-set targets and the effort tap

### 5.1 The data

- `rir` rides on a set object in the live session (`persistSession` already
  stores the whole session).
- `collectFrom` already spreads every other key through, so `rir` reaches the
  record. **Prove it**, don't assume it.
- **Every place a set is built from another set** must be checked:
  - `dupSet` builds fresh, so no `rir`. Confirm it.
  - `+ Set` builds fresh. Confirm it.
  - `routines.js` builds `{ tw, tr, type }`. Confirm it.
  - The builder's ghost sets. Confirm them.
  - Anything else you find.

  **A copied set never carries a rating.** A rating belongs to the set that
  was done.
- **`saveEdit` must carry `rir` through unchanged.** Otherwise editing a
  workout silently erases its ratings. This is the same trap v53 had with
  `feel`. Prove open → save → open keeps every `rir` by driving the real
  `saveEdit`, the way `tools-check/feel.mjs` does.
- **The stored shape is a number** (integer 0–5) on the set in
  `workouts/{mk}/{dd}/{id}`. No child write, no new node. The record is written
  whole at Finish, as today, and the month cache is the same record.
- **Find where sets are copied into `history`**, or into anything else built
  from a record, and decide whether `rir` belongs there. Say which, and why.
- **Old records have no `rir`.** Nothing migrates, and nothing may treat
  absent as 0.

### 5.2 The next set: the rules (spec §3.10, with the rating)

The rules go in `coach-prog.js`, where §3.10 says they live. Write one pure
function (for example `nextSet(ex, ctx, today)`). `coach.js` hands it to
`liveRead` through `liveInput`, the way the twelve-week window already travels.
`coach-live.js` still orders the answers, and **"done" is still tried first**.

For the exercise in hand, straight scheme only, and only when a Coach target
exists for it (the targets switch is on, and `targetFor` gives one):

- **Before its first working set today:** the session's target.
- **STOP.** If any of these holds, the lift gets no heavier set for the rest
  of today:
  - any set typed F today on this lift;
  - any set rated **Too hard** (`rir` 0) today on this lift;
  - a rep drop of 25% or more from the first working set at the same or a
    lighter load. Use `REP_DROP` from `coach-live.js`. Never write a second
    copy of it.

  The only answers after a STOP are "same weight" or "that's probably the
  set".
- **UP**, one load step, **once per lift per session**, when:
  - reps ≥ the target's reps + 2 at a load ≥ the target's load (§3.10 as
    written), **or** the set was rated **Way too easy** (`rir` ≥ 4) at a load
    ≥ the target's load with reps ≥ the target's reps;
  - **and** there is no STOP.

  Use the load step `prescribe` uses for this lift. It must be loadable in his
  unit. Never invent a step.
- **DOWN.** When reps < the range's low end: the same load, or one step down
  if that lower load is one he has logged for this lift.
- **Otherwise:** the same load, at the target's reps.
- **About right** (`rir` 2) changes nothing. It is stored for the next
  session's read.
- **With no target** (targets off, or the lift can't be targeted): no number.
  The chips still show and still store, and the live answer is exactly
  today's.
- **When `liveRead` answers "done"**, no next-set number is shown.

**The fence is replaced, not deleted.** `tools-check/coach-live.mjs` today
proves "a number to put on the bar must be a quote". The new fence:

- every number the live sheet prints is either a quote of a logged set or a
  `coach-prog.js` target;
- no target is heavier after a STOP;
- no second step up on a lift in one session;
- all of it in lb **and** kg.

Rewrite the `coach-live.js` header's "NO WEIGHT, EVER" paragraph to state the
new rule, and cite §3.10. Leave nothing in the header that is no longer true.

### 5.3 The next session: `prescribe` reads the rating

The spec's RIR columns (§6.4) are the design. This ship turns on **two** of
them and no more:

- **A set rated Too hard (`rir` 0) at the target's load means `hitTop` is
  false for that session**, even if the reps reached the top. The target
  holds. It is not a miss and not a stall. It is "the same again".
- **When every rated working set at the target's load was rated Way too easy
  (`rir` ≥ 4), no set was typed F, and every working set reached the target's
  reps, that session counts as `hitTop`.**
  - It still goes through the confirm dial (decision 5: two sessions at the
    top for a cut, Stay consistent, doubles and triples).
  - It never gives more than one step.
- **A marked session** (v52's bad-day mark) is out of the performance log as
  today, and its ratings with it.
- **The target's why says when a rating moved it or held it.** For example:
  "Last time you rated 135 × 8 way too easy." or "Last time 135 × 10 felt too
  hard, so it's the same again." Follow the voice rules (§8).
- **Unrated sessions: `prescribe` gives byte-for-byte today's answers.** The
  `coach-prog` battery's 57 rows stay 57/0/0. Add a new section of rows for
  ratings, and report its count.

### 5.4 The live sheet (`coach-ui.js`), top to bottom

1. His question and Coach's answer, as today (`liveRead`, done first).
2. **The next set**, when §5.2 gives one. For example: "Next set: 135 lb ×
   8." with its why behind the existing *Why?* chip.
3. **"Set 3 · 135 lb × 8. How was it?"** and the three chips, when the
   exercise in hand has a ticked working set.
   - The chosen chip reads as chosen.
   - All chips are 44px or taller (extend `touch-target.mjs`).
4. **After a tap:** Coach's short answer, and ***Use it for my next set***
   when there is a next set to use.
   - The answer is warm first, then the number. For example:
     - Way too easy, with a step allowed: "Strong set. Next one: 145 lb ×
       8."
     - Way too easy, with the step already used: "Good. Stay at 145 lb for
       the next one."
     - About right: "Good. Same again: 135 lb × 8."
     - Too hard: "Noted. Stay at 135 lb, or call that the last set of this
       one."
   - These give the sense. Word them to the voice rules and the banned list.
5. *Add it* and *Close*, as today.

**What stays the same:**

- The one quiet line under a finished exercise is unchanged. It prints no
  number.
- An edit of a past session gets no chips and no numbers.
- The *In the gym* switch off means no chip at all, as today.
- The *Weight and rep targets* switch off means no next-set numbers, while the
  chips still work.

**Saving a rating** is an edit to the live session, made through a callback
`workout.js` hands the sheet, the way it hands *Add it* today. Coach never
writes the session itself. After a rating, the workout screen re-renders the
way it does after *Add it*.

---

## 6. Phase C: a second session on the same day

**Today** (BACKLOG, v42 and v52): the live facts see only the active session.
A session he finished this morning is in the log as a session of its own, and
nothing adds its sets to today's. So an evening session's Coach can:

- suggest a group he already trained this morning;
- call a group untouched today when it isn't;
- misjudge "done".

**Decision 10 is the principle: today is a day.**

- **`switch` and `next`:** a group or exercise with working sets in a session
  he finished earlier today counts as trained today. Coach never suggests it
  as "nothing in it yet today".
- **`done`:**
  - when the earlier session today has the **same shape** as this one (a
    workout split across two visits), their working sets count together
    against his usual for that shape;
  - when the shape is different, `done` stays per session. Two different
    workouts are two workouts.
- **After the second session is finished:**
  - `finishRead` and *How did today compare?* speak of the session just
    finished;
  - the card's "trained today" state holds for both;
  - check every place that picks "today's session" as a single one (the post
    and done_today states, the recovery and big-day reads, the readiness
    compare) and make each one right for two;
  - list what you checked.
- **The earlier sessions come from what `coach.js` already gathers**
  (`inWindow`, with its dates). Add no new read.
- **Verifier:** extend `tools-check/coach-live.mjs` with a day of two
  sessions:
  - one pair of the same shape;
  - one pair of different shapes;
  - an evening session after a morning chest day, which must never suggest
    chest;
  - and the post-finish states after the second session.

Fix `coach-live.js`'s header paragraph about this ("in BACKLOG.md rather than
solved here") to say what is true now.

---

## 7. Phase D: `coach-volume.js`, weekly volume and balance

This is a new **pure** module that native copies verbatim. Build it to spec
§6.1–§6.5 exactly. Where the spec and the code disagree, the code wins and
the report says where.

- **Counting (§6.1):**
  - a hard set is working (`isWorking`), `r ≥ 1`, and not cardio;
  - the **warm-up in disguise** rule (≤ 50% of the session's top load for that
    exercise, before the first top set, reps ≤ top reps + 2) applies to these
    counts only;
  - fractional: primary group 1.0, each secondary group 0.5, from
    `exercises.js`'s fourth field;
  - custom exercises count as primary only;
  - **the shipped `group_under_weekly_normal` keeps its primary-only count,
    unchanged.**
- **Bands (§6.2):**
  - very low < 4, low end 4–9, common range 10–20, high > 20 sets a week;
  - the goal dials move the band: muscle 10–20, strength 6–15 for the groups
    carrying the main lifts, a cut ≥ ⅔ of the pre-cut normal, maintain 6–12;
  - **core** gets readouts only, never "too little".
- **Flags (sheet only):**
  - *too little*: below the floor **and** below 70% of his 8-week normal for
    2 weeks, or below the floor for 4 weeks on his focus group;
  - *about right*;
  - *more than usual*: ≥ 1.3× normal **and** a fatigue marker (§6.4). Volume
    alone is never "too much" while performance is rising.
- **Neglect (§6.3):**
  - a non-core group under 30% of the median of the other non-core groups
    over 4 weeks, or zero for 8 weeks;
  - said **once per 28 days**, stamped in `asked` the way other once-only
    lines are, and never on the card.
- **Balance (§6.5):**
  - push : pull beyond 2 : 1 either way;
  - horizontal : vertical press, and horizontal : vertical pull, when one side
    is zero for 8 weeks;
  - knee : hip beyond 3 : 1;
  - from the tags, over 8 weeks of fractional hard sets;
  - readouts are counts ("Over 8 weeks: 64 pressing sets, 30 pulling sets.");
  - custom exercises are left out and the readout says so;
  - if customs are more than 25% of a group's sets, that group's ratios are
    skipped;
  - hidden exercises still count and are never suggested.
- **The focus group** (§6.5's last paragraph):
  - its band goes up 30%, and its readouts rank first;
  - in the builder, its exercises come first (`coach-build.js`). Say exactly
    what moved in the builder, with a verifier row.
- **The answers.** Two new sheet answers, in the existing `volume` category
  with `tier: 'pro'` like their siblings:
  - **How's my weekly volume?** Each group's hard sets this week, its band,
    and its flag, in plain numbers.
  - **Is my training balanced?** The ratios that have something to say, or
    "Nothing lopsided in the last 8 weeks." with the counts.

  They are offered through the topic registry, where its ranking puts them.
  Not on the card. Not in the live sheet.
- **Minimum data.** Under three weeks of log, each answer says so honestly
  and guesses nothing.
- **Rest-tolerance learning** (named in §13 S5) is deferred. Log it.
- **Verifier:** new `tools-check/coach-volume.mjs`, a battery in the house
  style (`ok / miss / wrong`):
  - one row per band and flag;
  - the disguise rule's three conditions each alone;
  - fractional counting;
  - the custom-exercise exclusion and the 25% skip;
  - core never "too little";
  - neglect once per 28 days;
  - the focus group's +30%;
  - a **must-never-say scan** for health and posture words across every
    sentence the module can build, in lb and kg.

---

## 8. The voice (every sentence this ship adds)

- **Warm first.** He asked for encouragement. A number that stings never
  leads.
- **Never the word "AI"** in anything Coach says.
- **No causal words** about food or the body. Differences, not causes.
- **No eating advice.**
- **Nothing on `coach.js`'s banned list**, and no exclamation marks.
- **Numbers go through `units.js`**, in his unit.
- **A target is always a loadable number.**
- Run `tools-check/coach-voice.mjs` over every new sentence. It has to see
  them, so extend it if it doesn't.

---

## 9. The verifiers

**New:**

- `grey-last.mjs` (§4);
- `effort.mjs`:
  - the data path: tick, rate, Finish, and the record has `rir`;
  - `saveEdit` keeps it;
  - untick deletes it;
  - dup, `+ Set`, routines and the builder never copy it;
  - old records are untouched;
  - the chips appear only in a live session with a ticked working set, on the
    live chip's gate;
  - *Use it for my next set* writes `tw`/`tr` only;
- `coach-volume.mjs` (§7).

**Changed on purpose, each with its reason written in place:**

- `coach-live.mjs`: the fence (§5.2) and the same-day day (§6);
- `coach-prog.mjs`: a new ratings section, with the old rows unchanged;
- `tick-targets.mjs`: untick deletes `rir`;
- `touch-target.mjs`: the new chips;
- `coach-surface.mjs`: the new answers and the live sheet's order;
- `coach-voice.mjs`;
- `coach-registry.mjs`;
- `coach-rank.mjs`;
- anything else, with its reason.

**Batteries that must not move:**

- `coach-overlap` **24/0/0**;
- `coach-ready` **46/0/0**;
- `coach-fuel` **16/0/0**;
- `finish` **12/0/0**;
- `coach-prog`'s original **57/0/0**.

If one moves, you broke something. Find out what before going on.

**Every verifier exits 0** under all three time zones. Report the count
before and after.

**Commit per phase.** Each phase leaves every verifier green, so if the night
runs out, what is committed is shippable. **If Phase D can't be finished to
this standard, stop after Phase C,** leave D uncommitted or unstarted, and
say so. Half a volume engine is worse than none.

---

## 10. Docs and the handoff to native

- **`COACH-REPORT.md` §79 onward**, in v53's shape:
  - read this first;
  - what got built;
  - the batteries, every row;
  - what you corrected;
  - where this brief was wrong about the code;
  - every assumption;
  - what is not done and what nobody has seen;
  - the paint;
  - Micah's decisions (§3 here);
  - if the next run reads one thing.
- **`NEXT-NATIVE-V54.md`**, in `NEXT-NATIVE-V53.md`'s shape:
  - the sha256 of every pure module this ship changed or added, at the final
    commit;
  - every web file:line that changed, and what native must do;
  - **the `rir` shape for native's PROPOSED rules**: an integer 0–5 on a set.
    Web can't see native's rules. Say that if native's set node is closed
    (`$other: false`), `rir` must be added through `tools/rules/build.mjs` and
    proven, and that a record without `rir` must still pass;
  - native's `saveEdit` and its set-copy sites: the same checks as §5.1;
  - the live sheet's new rows and *Use it for my next set*;
  - the grey fill in native's session screen.

  **You cannot read native.** Where you would be guessing a native path, say
  "the native run maps this" instead of guessing.
- **`BACKLOG.md`:**
  - a v54 section;
  - the stale v52 `record.groups` entry corrected (fixed in `884ddd9`);
  - the same-day entries updated to what is true now;
  - decision 7's open question (singles at RIR ≥ 2);
  - rest-tolerance learning deferred;
  - anything you found and didn't fix.
- **`README.md` / `CLAUDE.md` / `AGENTS.md`:** only what this ship made untrue.

---

## 11. Finish

- **`rack-v54`, as its own commit:** `sw.js` `CACHE` and `usage.js` `VERSION`
  both go to `'rack-v54'`. `tools-check/version-match.mjs` is green.
- **The docs** as the last commit.
- **Your summary to Micah**, plain words first:
  - what he can now do in the gym;
  - then what is green (counts before and after, in all three time zones);
  - what is new;
  - what is listed and not fixed;
  - what you're unsure of.

  If anything is red, say so at the top.
- **His push command**, in Terminal tab 2 at `~/dev/ship-v54`:

      git push --no-verify origin main

- **His walkthrough** on the website after the push. Wait a couple of minutes
  for GitHub Pages first, and confirm
  `lyttlebeast.github.io/lift-cal/sw.js` says `rack-v54`.
  1. Start a workout and add, by hand, an exercise he has done before. The set
     shows last time's numbers in grey. `+ Set` shows the next set of last
     time's in grey. Tick one without typing, and it takes the grey numbers.
  2. Do a working set of a lift Coach has a target for, then tap the Coach
     chip. The sheet shows "Next set: …", and "Set 1 · … How was it?" with
     three chips.
  3. Tap **Way too easy**. Coach goes up one step and offers *Use it for my
     next set*. Tap it: the next set's grey numbers change. Rate the next set
     Way too easy as well: no second step.
  4. On another lift, rate a set **Too hard**. No heavier number for the rest
     of that lift today.
  5. Finish. Tomorrow's target for the lift he rated Way too easy is one step
     up, and its why says it was rated way too easy.
  6. Edit that workout and save it without changing anything. The target and
     its why are unchanged, so the ratings survived.
  7. COACH ME. Try *How's my weekly volume?* and *Is my training balanced?*:
     his numbers, and no health words.
  8. If he trains twice in one day, the second session's Coach never offers a
     group he already did that morning.

---

## 12. Not in this ship (so you don't wander)

- The paywall and the tier scrap (removing locks, teasers, "targets are Pro").
- Singles and doubles targets at RIR ≥ 2 (decision 7).
- The type box. It waits on his list of weird questions.
- The Your goal screen cleanup, the drop-set sub-list, save-as-meal, and water
  in readiness.
- Anything in native, the Worker, or the published rules.
- The You tab's ~7 GETs per render. Leave it. It's its own change.
