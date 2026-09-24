# COACH TRAINER, stage four (web only) → rack-v52

This is the build brief for a single overnight Claude Code run in
`~/dev/ship-v52`. That folder is a fenced clone of lift-cal at `99b49ea`
(**rack-v51**), which is live. Micah walked it on his phone on 24 Sep, and the
two things he found on the goal screens are the v50 and v51 fixes.

It was written 24 Sep 2026 from a read of the shipped v49–v51 code, their report
(`COACH-REPORT.md` §49–§58) and `COACH-TRAINER-SPEC.md`, which is already in the
repo. It was checked against the code afterwards by a second reader.

**Where this brief and the spec differ, this brief wins.** Read the spec's §0,
§1, §4, §6.4, §9.2, §9.3, §10.3 and §12 before you start. This brief makes their
rules exact, and §3 lists every place it departs from them, with the reason.

This run does **stage four in two phases**, in strict order.

**Phase A: rest, recovery and the bad day.** It uses training data only and
makes no new database reads. It adds:

- per-muscle-group recovery windows that grow after a hard day;
- "What should I train today?" learning to say *rest* or *go lighter*;
- a caution when he picks an unrecovered group in *Make me a workout*;
- the replayed "did you listen" loop;
- readiness ("Should I rest or go lighter?");
- *How did today compare?* listing what was different about the day;
- the **bad-day mark**, which is the one new stored thing.

**Build, verify and commit all of Phase A before you start Phase B.**

**Phase B: "Am I fueled?"** It adds:

- the fueling brain, a new pure `coach-fuel.js`;
- the first food-log reads Coach makes outside Patterns (lazy, Pro only);
- food rows in readiness and in *How did today compare?*.

**Not in scope tonight:**

- stage five: mid-session targets, weekly volume bands and balance, and grey
  last-time numbers on hand-added exercises;
- the effort (RIR) tap;
- the free-text box;
- water;
- the native port. A separate run is porting v49–v51 in `~/dev/rack-mobile`
  tonight. **Never open that tree.**

**Before the run starts (Micah):**

- `~/dev/ship-v52` must be a **full** clone, because several verifiers read old
  commits.
- It is fenced like ship-v49: the refusing pre-push hook, and the
  `.claude/settings.json` deny list, excluded from git in `.git/info/exclude`.
- This file is in its root.
- `echo GUARDTEST ping` must be refused. If it runs, stop.

---

## 0. THE STANDARD

Micah, 23 Sep 2026:

> "This coach should be at the level where I can trust it. Once this is built, I
> should be able to only ever use my app for my workout and in following it, I
> should see my data of my lifts going up. I have to be able to trust it."

This stage is where trust is hardest to earn. It is the only one that reads
food, it has the weakest science, and it carries the highest risk of saying more
than the data supports. Four consequences follow:

1. **Coach reads out food and never prescribes it.** It compares what he logged
   with his own normal and stops there.
   - It never says what or how much to eat.
   - It never names a food.
   - It never says "fasted" as advice.
   - It never says "carb-loaded" (Micah's decision #11).
   - Its answers use his own data only (decision #7).
2. **Differences, never causes.** When a session came in above or below his
   usual, Coach lists what was *different* about the day.
   - It lists differences in both directions, whether or not they fit the
     result.
   - It says "These are differences, not causes."
   - It never uses a causal word about his own data.
3. **Rest is advice, never a lock.** Every rest or caution answer leaves a way
   on (*Train anyway*, *Build legs anyway*). Coach advises, and he decides.
4. **Unlogged is never zero, and a wrong reading is worse than none.**
   - A half-logged day is "not fully logged", never "low".
   - A day Coach couldn't read is left out, never guessed.
   - Silence is always a correct answer.

---

## 1. NON-NEGOTIABLES

The v48 and v49 briefs' §1 stands in full:

- vanilla ES modules, no dependencies;
- **`sw.js` and `usage.js` both become `rack-v52`**;
- syntax check with `node --check --input-type=module < "$f"`;
- every verifier exits 0 under `TZ=America/New_York`, `UTC` and
  `Pacific/Auckland`;
- small diffs, with comments that explain why;
- never commit a key;
- never touch the Worker, Firebase or anything that deploys;
- **do not push**;
- keep README, AGENTS, BACKLOG and CLAUDE.md's Layout table true;
- finish with the five-line handoff.

**The house voice rules are unchanged.**

- The shipped `BANNED` list in `coach-voice.mjs` applies to **every new Coach
  sentence**: *hasn't, haven't, didn't, still, only, failed, no progress,
  stopped moving*, plus v49's sweep of new answers, which adds *eat*.
- Chip labels are his voice, as v48 decided (e.g. "Didn’t feel well", "I
  haven’t eaten"). Every sentence Coach says obeys the list, and you reword
  rather than exempt.
- No causal words about his own data (*because you, caused, due to, led to,
  made you, that's why*).
- No max attempt, no eating instruction, no body norm, no "AI".
- Every weight goes through `units.js`.
- Typographic apostrophes, and no exclamation marks.
- The card stays encouragement only, and its ban list is unchanged.

**The purity rules are unchanged.** Every new decision lives in a pure module
with the clock as an argument, so it can be copied verbatim to native later.
`coach-data.js` remains the only impure gatherer.

**The contracts:**

- `coach-prog.mjs` stays **ok 57, miss 0, wrong 0**.
- `coach-overlap.mjs` stays **ok 24, miss 0, wrong 0**.
- With no marks stored, `prescribe()` stays byte-identical to rack-v51's.
  Section D already proves this against old commits; extend it to v51.

**The paint path.** Every card paint runs `coach()`. `rank()` evaluates every
*finding*, whatever its surfaces. `leadQuestion()` runs `topicsFor('you')` and
`answerable()`, and the Basic teaser runs `d.build({})`. v49 already made a card
paint slower (report §55). So this is the rule:

- **Allowed on a paint:** `restRead()` and `usualRun()` (§4.3, §4.4). They are
  per-group arithmetic over the 84-day window, and the card needs them (the
  recovery line, the rest-day suppression, the builder's default). `restRead()`
  never reads the replay: the replay reports, and it adjusts nothing tonight
  (decision 17). So the card, the builder default and the sheet always read the
  same call and the same pick.
- **Never on a paint, and never in any intent's `when`:** the replay (§4.5),
  readiness flags (§4.6), the session rows (§4.7), `targetsReplay()`, or
  anything in `coach-fuel.js`. They run only while an answer is rendered.
- Therefore every new intent is a **selector**, never a finding (§6.4), and no
  new id joins the **You** topic lists (§6.4).
- **Measure** a card paint on the year-long, 200-session fixture in node, at
  v51 and at v52, and write both numbers in the report. **The budget is +1 ms.**
- **Prove the rule with a spy in `coach-hype.mjs`**: a card paint calls nothing
  in `coach-ready.js` but `restRead`/`usualRun`, and nothing in `coach-fuel.js`.

**No database reads for Basic, for a muted Food switch, or on a paint.** The
Phase B food reads happen on ask, for Pro, with Food on. There are at most
fifteen on the first ask of an app open, then one more only when today's
summary has changed (§9).

---

## 2. ARCHITECTURE

```
coach-ready.js   NEW, pure. Recovery windows and the big day, the fatigue flag,
                 the rest read, the replayed adherence loop, readiness (training
                 rows), what was different about a session (training rows).
                 Imports coach-prog.js, coach-overlap.js (quantile, blocksOf,
                 lightOf, compareSession), coach-goal.js, coach-live.js
                 (REP_DROP only), units.js, exercises.js, analytics.js (the pure
                 half). NEVER imports coach-fuel.js: Phase A is food-blind by
                 construction.
coach-fuel.js    NEW, pure (Phase B). Complete days, logging style, the food
                 phase, food baselines, the fueled read, the food rows for
                 readiness and for a session. Imports coach-goal.js and units.js
                 only.
coach-overlap.js CHANGED, exports only: quantile, blocksOf, lightOf and
                 groupDaysAt become exported. Their bodies stay byte for byte.
coach-prog.js    CHANGED, additive only: targetFor() — the marked-session rule
                 (§5.2). Without marks, prescribe() output is byte-identical.
coach.js         shapeSession() gains lsets/lfsets/ldrop (§4.1); the rest-aware
                 pick (§6.2); new facts, selectors, routes, topics; one question;
                 one category; the two logs (§5.2); the rows merged (§6.5)
coach-build.js   CHANGED: its default focus follows the builder default (§6.3);
                 it asks targetFor() instead of prescribe() (§5.2)
coach-data.js    markSession(); normSettings keeps `marks`; loadFuel() (Phase B)
coach-ui.js      the builder caution, the mark chips, the fuel chips, awaiting
                 loadFuel() before a fuel-reading answer
```

**Imports.** `coach.js` imports `coach-ready.js` and `coach-fuel.js`, which
import `coach-prog.js`, `coach-goal.js` and the rest. Nothing imports back.
`coach-ready.js` and `coach-fuel.js` never import each other; `coach.js` merges
their rows (§6.5).

**The staging edit.** Every verifier that stages the Coach modules must stage
`coach-ready.js` and `coach-fuel.js` too. That edit is allowed everywhere and is
not a change to any check.

---

## 3. DECIDED IN THIS BRIEF: where it departs from the spec, and why

Record each of these in the report as decided, not open.

1. **Two modules, not one.**
   - The spec puts everything in `coach-fuel.js`. Here the training side
     (`coach-ready.js`) never imports the food side.
   - That makes "food changes no rest call, no target and no lift reading" true
     by construction, not just by test.
   - It also keeps each verbatim native copy small, with its own battery.
2. **Recovery counts whole lifting sets.**
   - The shipped `sets[g]` counts cardio, and eight of the nine cardio
     exercises are filed under legs. A treadmill walk would read as "legs
     trained yesterday".
   - Recovery reads a new additive count, `lsets[g]` (§4.1): whole primary-group
     sets, not the spec's fractional sets. Fractional volume is stage five's
     `coach-volume.js`.
   - **Every shipped reader keeps `sets[g]`**, including v49's fatigue and
     lighter-week reads and this stage's fatigue flag. Only the recovery
     windows and the big day read `lsets`.
3. **A big day is big against HIS normal**, with the spec's floors kept (§4.2).
   Otherwise someone who always takes three sets to failure would have every
   day read as "big".
4. **A mark stops a session counting against him, and never lets it count for
   him.**
   - After a marked session, the lift's target is the one Coach would have set
     *before* that session (§5.2). He gets the same attempt again.
   - It is not the target from dropping the session. That can quote the wrong
     "last time", or go lighter than he was already lifting.
5. **"Train anyway" opens the builder's menu.** The spec's "builder with sets
   halved" would be a new builder option with no battery. The menu, with the
   caution on unrecovered picks, offers the same choice without inventing a
   workout.
6. **Your-data links (T2) come only from the eight registered Patterns, and
   only when Patterns is switched on.**
   - Patterns is opt-in by Micah's decision.
   - A ninth comparison is a decision, not a line of code:
     `coach-patterns.mjs` fails on anything but eight. That includes the spec's
     "marked vs unmarked sessions once there are 8 marks", which waits.
7. **There is no intake-vs-trend cross-check** (spec §5.1).
   - A *measured* maintenance is worked out from the logged food and the weight
     trend, so the two cannot disagree in sign.
   - A pinned or setup maintenance is a number Coach did not measure.
   - Energy context stays the weight trend, as shipped.
8. **"Your log doesn't show that lighter days go with lighter sessions — yet"
   is dropped.** It claims an absence, and no registered test backs it.
9. **Readiness component 1 becomes "recovery"** (§4.6), read off the rest read.
   Readiness is asked before he has picked what to train, so "days since the
   group you'd train" has no group to read.
10. **"Should I go lighter?" becomes "Should I rest or go lighter?"**
    - It keeps the same route id, `ask_lighter`, so native's text matcher and
      the Train table keep one id.
    - Its route becomes `rest_day` → `lighter_week` → `readiness`.
11. **"Have you eaten?" is two follow-up chips, not a question.** The question
    machinery stores every answer, and this one must not be stored (decision
    #9). Nothing is written, so there is nothing to validate.
12. **A new `readiness` switch** (spec §12.1). The rest answers ride the shipped
    `rest` switch, *Rest and lighter weeks*.
13. **Readiness with fewer than three rows of data is silent**, and its bubble is
    not offered. The spec's "Not enough in your log to say much" would be a
    bubble that answers nothing, and the shipped rule offers a bubble only when
    it answers.
14. **Logging style is judged from the dates Coach has read** (at least 6), not
    from "the last 12 complete days". Only read dates carry entry times.
15. **Today's food log is read on ask**, not once per app open. The spec's own
    §4.7 makes the past days lazy; today is the same bargain.
16. **The replay uses today's recurring shapes for every past morning** (§4.5).
    Shapes are clustered inside `coach.js`'s `derive()`, and re-clustering 84
    past logs is both slow and a second copy of the clustering. Windows and
    fatigue are recomputed per morning. Only "which groups are usual" is held
    fixed.
17. **The replay reports; it does not adjust anything tonight.** The spec
    lets it raise his streak threshold and shrink a group's window. But those
    learned values would have to reach the card, the builder default and the
    sheet identically. That needs a per-open cache in `coach-data.js`, and
    without one the three can disagree (the card on one call, *Build it* on
    another). So tonight the replay is a T1 readout in the rest answers, with
    its counts: how often he rested on days like this, and how the sessions
    went when he didn't. The learning goes to BACKLOG with this reason.
18. **Old marks are pruned on every `settings/coach` write** (spec §12.1), in
    `patchNow()`, which has the clock. They are not pruned only when a mark is
    written.

---

## PHASE A: REST, RECOVERY AND THE BAD DAY

## 4. `coach-ready.js`

This module is pure:

- `now` is an argument;
- no DOM, no `Date.now()`, no module state;
- a memo may ride on the input as a non-enumerable property, exactly as
  `coach-overlap.js`'s `prepare()` does;
- every weight goes through `units.js`.

It is handed what `coach.js` owns: the shaped sessions (all of them), today's
recurring shapes, the performance lifts (§5.2), and the goal and energy context.
It never clusters shapes and never counts exposures of its own.

### 4.1 Lifting sets: `shapeSession()` gains three additive fields

```
lsets[g]   working sets (isWorking) for g from exercises whose equipment is not 'cardio'
lfsets[g]  the sets typed F among them
ldrop[g]   how many of g's non-cardio exercises (merged by exId, as the session already
           merges them) show a rep drop: a working set at the same or a lighter load than
           the first working set, with reps down by REP_DROP (coach-live.js — imported,
           never restated) or more. The test coach-live.js's fatigueIn() applies mid-session.
```

`sets`, `fsets`, `groups` and `signature` do not change, and no shipped reader
moves to the new fields. The comment says why they exist (decision 2).

### 4.2 Recovery windows and the big day

For each group `g`, over the shaped sessions in the 84-day window with
`startedAt ≤ now`, count a session for `g` only when `lsets[g] ≥ 1`:

```
dates(g)     the distinct local dates, oldest first (two sessions on one date are one day, sets added)
gaps(g)      whole days between consecutive dates, noon to noon (coach.js groupGap()'s arithmetic)
stage(g)     'none' under 4 dates, 'learning' 4–7, 'yours' 8 or more
q25(g)       25th percentile of gaps(g), by coach-overlap.js's quantile()
med(g)       median of gaps(g)
normal(g)    median lsets[g] over those days (needs 4)
fNormal(g)   median lfsets[g] over those days (needs 4)
dNormal(g)   median ldrop[g] over those days (needs 4)

last(g)      the most recent of those days
big(g)       last(g) was a big day for g when ANY of:
               sets   normal(g) known, lsets ≥ 1.5 × normal(g) AND lsets ≥ normal(g) + 4
               fail   lfsets ≥ 2 AND lfsets ≥ 2 × max(1, fNormal(g))      (unknown → the floor of 2 alone)
               drop   ldrop ≥ 2 AND ldrop ≥ 2 × max(1, dNormal(g))
window(g)    base:         stage 'none' → 2  (T3: "a common starting point")
                           otherwise      max(1, ceil(q25(g)))
             after big(g): stage 'none' → 3  (T3)
                           otherwise      max(base + 1, ceil(med(g)))
since(g)     whole days from last(g) to today (0 = today)
ready(g)     since(g) is null, or since(g) ≥ window(g)
```

The `+ 4` on the sets rule stops 3 sets against a usual 2 from reading as a big
day. Why the rule is relative to his normal: decision 3.

### 4.3 Streaks and the fatigue flag

```
trained dates   dates with any session — the shipped trainedDays() rule (a cardio
                session is a session, so the streak stays the card's streak)
runs            maximal runs of consecutive trained dates in the 84-day window
streakNow       the run ending today; if nothing today, the run ending yesterday; else 0
usualRun        the 90th percentile of the run lengths, rounded UP to a whole day; needs
                ≥ 5 runs and a first session ≥ 56 days ago; else null. EXPORTED — the
                card's recovery line reads it (§6.2)
```

The **fatigue flag** is up when **two or more** of these signs hold. Each sign
counts only when its data exists.

```
streak     usualRun known and streakNow ≥ usualRun + 1
declining  two or more lifts exposed in the last 28 days whose coach-prog status is
           'declining' (the performance log, §5.2)
failure    8 whole weeks known; F sets in the last 7 days ≥ 3, and the F share of hard
           sets in the last 7 days ≥ 2 × the share over the 8 whole weeks before
load       4 whole weeks known; hard sets in the last 7 days ≥ 1.3 × the median weekly
           hard sets of the 4 whole weeks before
```

"Hard sets" and "F sets" here are the SHIPPED `sets[g]` / `fsets[g]`, summed.
That is v49's fatigue and lighter-week count, so "sets this week" is one number
on every screen.

Weeks come from `coach-overlap.js`'s `blocksOf()` and `lightOf()`. **Never write
a second weeks rule.** A week before the log began is not a zero, and a partly
covered week is not a whole week (v49 §52, and the comment on `blocksOf()`).

### 4.4 The rest read: `restRead(input, now)`

```
null     fewer than 6 sessions in the 84-day window, or no usual groups
usual    the groups of his recurring shapes; with no shape, the groups with ≥ 4 dates(g)

pick     1. recurring shapes whose every group is ready → the most overdue of them by the
            SHIPPED stalest-ratio rule (session.shapeOverdue's: the group furthest past its own
            median gap, ties by key). The pick carries that same `.stalest`, and `.skipped`:
            the shipped stalest shape when it is not the pick (it was left out as unrecovered)
         2. else ready usual groups → the most overdue (since / med, ties in GROUP_ORDER)
         3. else null

call     'lighter'  the fatigue flag is up
         'shape'    pick is a shape
         'group'    pick is a group
         'rest'     pick is null         (notReady: every usual group, with since, window, big)
```

`pick` is computed whatever the call, so on a lighter day Coach can still say
what is recovered if he trains anyway.

### 4.5 The adherence replay: `replay(input, now)`

The replay runs ONLY when an answer quotes it (§4.8), never on a paint.

- **Budget:** under 150 ms on the year-long, 200-session fixture in node.
  Memoise per date if you need to. Write the measured time in the report.
- **Shapes:** it uses **today's** recurring shapes for every past morning
  (decision 16). Everything else is recomputed as of that morning.

```
for each date D in the 84 days before today:
  the log that morning = sessions with startedAt before D's local midnight
  flagged(D) = restRead at D's local noon on that log, with today's shapes
               → call 'rest' or 'lighter'
  trained(D) = a session dated D exists
  outcome(D) = for a trained, UNMARKED session: compareSession() on that log
               → its summary; with one qualifying lift, that row's verdict
               'above' or 'usual' = held, 'below' = below; no row → not counted
```

**It reports; it adjusts nothing** (decision 17). There are two T1 lines, each
with its counts:

- **Rested** (when N ≥ 3 days were flagged): "Of the N days your log looked like
  this, you rested on K."
- **Trained through** (when 4 or more flagged days were trained with an
  outcome, H held and B below):
  - H ≥ 75% of them: "You’ve trained through days like this N times and held
    your numbers on H."
  - B ≥ 50%: "The last N times you trained through a day like this, your top
    sets came in under your usual on B."
  - Otherwise: nothing.

Neither line changes a window, a sign or a call. Both are printed only inside
the `rest` and `lighter` answers (§4.8).

### 4.6 Readiness, the training rows: `readinessRows(input, now)`

Readiness is a list of rows, not a score. Each row is `{ id, has, flag, text }`.

```
recovery  has: restRead non-null     flag: the call is 'rest', or he has recurring shapes and
                                           the pick is not a shape (for a lifter with no shapes,
                                           only 'rest' flags)
streak    has: usualRun              flag: streakNow ≥ usualRun + 1
load      has: 4 whole weeks         flag: the fatigue sign 'load'
failure   has: 8 whole weeks         flag: the fatigue sign 'failure'
lifts     has: a lift with 4+ exposures in the last 42 days (a count — no baselines)
                                     flag: two or more 'declining', or two or more of the last
                                           session's replayed targets not reached (targets on)
energy    has: energy non-null       flag: 'deep'
weighin   has: a weigh-in dated today and bwAt(weighIns, today's midnight − 1) non-null
                                     flag: today's lowest reading < 98.5% of it
time      has: ≥ 12 sessions         flag: now's local hour (fractional) outside his
                                           10th–90th percentile start hours
(fuel     Phase B — coach-fuel.js, §8.6)
```

**Export `readinessHas(input, now)` too.** It counts the rows that have data,
using only the `has` tests: no flag, no status, no `targetsReplay()`. The
`readiness` selector's `when` calls it, and the full rows are built only while
the answer renders (§1).

**The summary** is built from the rows that have data. It needs 3 of them, or
readiness is silent (decision 13).

- **0 flags:** "Nothing in your log is off your normal today."
- **1–2 flags:** "One thing is different today:" / "Two things are different
  today:", then each flagged row as its own bubble.
- **3 or more flags, or `streak` and `failure` together:** "Several things in
  your log point to a lighter day." Then each flagged row, then the T3 line: "A
  common approach on a lighter day: the same weights, fewer sets."
- **Always last:** "Coach can’t see sleep, stress or soreness, and those count
  most on a day like this."

**Row sentences.** Numbers go through `int`/`one`, and weights through
`units.js`.

```
recovery  "None of your usual sessions is fully recovered today."
streak    "{k} days straight; your usual longest run is {n}."
load      "{n} sets in the last 7 days; usually about {m} a week."
failure   "{n} sets taken to failure in the last 7 days; usually about {m}."
lifts     "{A} and {B} are coming down lately."          (names; never a status word)
          or "{n} of your last session’s targets weren’t reached."
energy    "Your weight is coming down about {labelRate} a week."
weighin   "This morning’s weigh-in is {labelW} under your last week. A drop that size is
           usually water, which Coach can’t see."        ← the one T3 in this list
time      "It’s {h}; you usually start between {a} and {b}."
```

**The cut wording rule stands everywhere in this stage.** A falling weight reads
"cut" only on aim `cut` or `recomp`, or with food targets set to lose.
Otherwise it is "your weight is coming down".

### 4.7 What was different about a session: `sessionRows(input, session)`

Each component is measured two ways:

- for this session, as of its `startedAt`;
- for each of his earlier sessions in the 84 days before it (the reference
  set).

Use a robust z: `(x − median) / (1.4826 × MAD)` over the reference set. A
component needs 8 or more reference values and MAD > 0, or it is skipped. Keep
`|z| ≥ 1.5`, **in either direction**.

```
rest      per signature group of the session: days since that group before it (lsets);
          z against that group's own earlier values; keep the group with the largest |z|
streak    x = consecutive trained days ending the day before it
week      hard sets (shipped sets[]) in the 7 days before its startedAt
start     local start hour (fractional)
length    its duration in minutes (durationSec, else endedAt − startedAt)
weighin   not z: that morning's weigh-in against bwAt() up to the day before; listed beyond
          ±1.5%, counted as |z| = 1.5 for ordering
```

The sentences use his usual, which is the median:

```
rest     "Chest had 1 day of rest before it; you usually give it 3."
streak   x > 0: "It came after {x} days straight of training; usually after {m}."
         x = 0: "It came after a day off; usually after {m} days straight of training."
         (m = 0 reads "usually after a day off")
week     "58 sets in the 7 days before it; usually about 40."
start    "It started at 6:10 am; you usually start between 3 pm and 7 pm."
length   "It ran 35 minutes; usually about 70."
weighin  "That morning’s weigh-in was {labelW} under your week."  /  "… over your week."
```

`coach.js` merges these with Phase B's food rows (§6.5), sorts by `|z|`
(descending, ties in the order listed), and keeps **three**.

**Never "despite", never "even though", never "because".** The rows say what was
different, and the closing line says so.

### 4.8 The rest answers' sentences

**`rest`**

- **text:** "Today looks like a rest day. {Groups} {was/were} all trained
  {today | yesterday | in the last {n} days}{, and you’ve trained {k} days
  straight (your usual longest run is {u})}."
  - n is the largest `since` among the not-ready groups.
  - The streak clause appears only when streakNow ≥ 2 and usualRun is known.
- **more:**
  - each not-ready group with `big(g)`: its big-day line (below);
  - the replay's two lines, when they exist;
  - "Coach can’t see sleep, stress or soreness."
- **reason:** "Each group against its own recovery time: the quick end of your
  gaps between training it, and longer after a big day."
- **follow-up:** *Train anyway* only (§6.4). **No *Build it***: there is no
  recovered pick to build.

**`lighter`**

- **text:** "Today looks like a lighter day, or a rest."
- **more:**
  - each fatigue sign, as its readiness row sentence;
  - the T3 line;
  - when `pick` exists: "If you train, {name} is recovered.";
  - the replay's two lines;
  - the unseen line.
- **follow-ups:** *Build it* (which builds `pick`) **only when `pick` exists**,
  and *Train anyway*.

**`group`**

- **text:** "{Group} is recovered. {Other usual groups} {was/were} trained
  {today | yesterday | in the last {n} days}."
- **follow-up:** *Build it*, which builds that group (§6.3).

**`shape`** is answered by the shipped two intents, which now read the pick
(§6.2). When the pick has `.skipped`:

- "has waited longest" in their text reads "has waited longest of what’s
  recovered".
- A `more` line reads: "{Skipped name} has waited longer, but {group} {is/are}
  inside {its/their} recovery time."
- The same goes for `coach-build.js`'s reason line (`overdueWhy`).
- Every "waited longest" claim must stay true.

**The big-day line**, which is also the builder caution's headline (§6.3):

- "{Group} had a big day {today | yesterday | {n} days ago}: {s} sets against a
  usual {m}{, {k} of them taken to failure}{, with reps down a quarter or more on
  {d} of its lifts}. Coach would give {it/them} another day."
- Include only the clauses that made it big.
- Pronouns: chest, back and core take *it*; legs, shoulders and arms take
  *them*.

**Inside the window, not big:** "{Group} was trained {today | yesterday | {n}
days ago}; you usually give {it/them} {w} days or more."

- In stage `none` (the T3 window of 2), add: "(a common starting point until
  Coach knows your gaps)".
- In `learning` and `yours` the window is his own, and no label is added.

---

## 5. The bad-day mark (Micah's decision #9)

### 5.1 Storage

```
settings/coach/marks/{sessionId} = { r: 'sleep' | 'stress' | 'sore' | 'unwell', d: 'YYYY-MM-DD' }
```

- **`sessionId` is the record's own `id`.** `workouts/{mk}/{dd}/{id}` records
  carry `id`. A session with no `id` is never offered a mark.
- **`normSettings()`** keeps a mark entry only when:
  - its key matches `/^[A-Za-z0-9_-]{1,40}$/`;
  - `r` is one of the four values;
  - `d` is `YYYY-MM-DD`.

  It adds `marks` only when at least one entry survives, so a node without marks
  keeps the shipped shape.
- **`patchNow()`** merges `marks` the way it merges `answers`: a key set to
  `null` is deleted.
- **`coach-data.js` `markSession({ id, date }, r)`** writes `{ r, d: date }` under
  `id`, or `null` to clear.
- **`patchNow()` prunes on every write** (decision 18). Any stored mark whose
  `d` is more than 182 days before today is set to `null`. That is the six
  months Micah decided.
- **The engine ignores** a mark whose `d` is more than 182 days before `now`.
  That check uses the clock argument, so it stays pure.
- **The published rules take marks as they are.** `settings` has a
  section-level `.write`, so `database.rules.json` does not change.
  - `NEXT-NATIVE-V52.md` must give native's PROPOSED rules the `marks` shape.
    That file ends `settings/coach` in `"$other": { ".validate": false }`.

### 5.2 What a mark does

A mark says the numbers that day weren't representative. It does not say the
training didn't happen. So `coach.js` keeps **two logs**, built in one place and
handed out from there. **Nothing else restates the filter.**

**The full log (every session)** is read by everything about *when* and *how
much*:

- days since a group or a session, layoffs and streaks;
- sets, F sets, the fatigue flag and the lighter week's volume;
- recovery windows and big days;
- shapes, and the builder's base session;
- session counts and milestones;
- every "last time", "same as last time", "first time in N days" and "worked out
  from {day}" in any sentence.

**The performance log (marked sessions left out)** is read by everything about
*how strong*:

- every `coach-overlap.js` reading of a lift: status, the plateau-or-cut call,
  declining, the record day, lifts moving and goal pace;
- `compareSession()`'s "usual";
- readiness `lifts`;
- the replay's outcomes.

Check every `coach-overlap.js` template that prints a date or says "last". Any
that would now name a different session reads that fact from the full log.

**The next target** is decided by **`targetFor(ex, ctx, mark)`**, a new
additive export of `coach-prog.js`. `coach-prog.js` imports nothing new, so
**the caller hands it everything as data**:

```
mark = null                                     → no marked exposure of this lift
mark = { markedAt: Set<startedAt>,               // the lift's marked exposures
         latest: null | {                         // set when the lift's MOST RECENT exposure is marked
           word,                                  // 'slept badly' | 'stressed' | 'sore' | 'felt unwell'
           exposures,                             // the exposures before it, other marks left out
           groupDaysSince,                        // the group clock as of that session's start
           now } }                                // that session's startedAt
```

**`coach.js` builds `mark` in one helper and hands it out from there.**

- It exports `groupDaysAt()` from `coach-overlap.js` (additive export, body
  byte for byte) for the group clock.
- `overlapOf()` passes `mark` for each lift.
- `builderInput()` passes a map `exId → mark`.
- `coach-build.js` passes that to `targetFor()` where it builds its own `ex`
  (around coach-build.js:575–600).
- **Nothing calls `prescribe()` for a target directly any more.**

What `targetFor()` returns:

- **`mark` null:** `prescribe(ex, ctx)`, byte for byte.
- **Marked exposures, none of them the latest:** it leaves them out of the
  exposures `prescribe()`/`baselines()` read. A marked exposure is never a
  miss, never a success, and never a point in the series. The later, unmarked
  sessions carry every "last time" sentence, so nothing false is printed.
- **The latest exposure marked:** it returns the target Coach would have set
  *before* that session: `prescribe({ ...ex, exposures: latest.exposures,
  groupDaysSince: latest.groupDaysSince }, { ...ctx, now: latest.now })`.
  - Keep its **decision and its numbers**: mode, load, the per-set `tw`/`tr`,
    and the target line.
  - **Replace its whole `why`** with two lines worded from today:
    "Your last session is marked ({word}), so this is the target from before
    it." and "That session doesn’t count against your numbers."
  - The replay's own why lines are relative to *that* morning ("yesterday",
    "last time (8, 7, 7)"), so none of them is printed.
  - The same goes for the builder's "Worked out from {day}, the last time you
    did this lift" (coach-build.js:591). For such a lift it reads: "Worked out
    from before your marked session."
  - The result is the same attempt again. It is never heavier than he was
    already set, and never lighter because of the bad day.

**The words for a reason** in every Coach sentence are *slept badly*,
*stressed*, *sore* and *felt unwell*. The chip labels stay as §5.3 gives them.
"Didn’t" is his voice on a chip and is never Coach's in a sentence.

The session itself is still what *How did today compare?* reads when it is the
latest one, because it is what he asked about.

### 5.3 The question under *How did today compare?*

The answer carries a mark question when **all** of these hold:

- the compared session came in **below** (summary `below`, or a single row
  `below`);
- it has an `id`;
- it is not marked;
- the Questions switch is on.

```
a.mark = { sessionId, date,          // date: the session's own YYYY-MM-DD
           text: 'Anything Coach can’t see?',
           options: [ { value: 'sleep',  label: 'Slept badly' },
                      { value: 'stress', label: 'Stressed' },
                      { value: 'sore',   label: 'Sore' },
                      { value: 'unwell', label: 'Didn’t feel well' },
                      { value: null,     label: 'Nothing' } ] }
```

The acknowledgements, word for word:

- **sleep, stress, sore:** "Noted. That session won’t count against your
  numbers."
- **unwell:** "Noted. That session won’t count against your numbers. Rest is
  always an option. Coach doesn’t do health, so it’ll leave it there."
- **Nothing:** "Noted." Nothing is written.

**Already marked.** The answer instead carries
`a.marked = { sessionId, date, r }` and a `more` line: "You marked this session:
{word}. It doesn’t count against your numbers." Here {word} is §5.2's word
(*felt unwell*, never the chip's "didn’t feel well"). A chip, *Clear the mark*,
calls `markSession({ id, date }, null)` and acks "Cleared."

---

## 6. Wiring Phase A

### 6.1 One category

`{ id: 'readiness', label: 'Readiness', mutable: true, note: 'Before a workout:
what in your log is different from your normal today.' }`

- It goes directly after `rest`.
- Every later category moves down one and keeps its relative order.
- No finding's rank moves, because nothing in it competes for a card.

### 6.2 Facts, and the pick

- **`session.rest`** is `restRead()`, or null when `rest` is muted.
- **`session.shapeOverdue`**, which names a shape to the reader (the shipped
  training answers, the opening bubble):
  - **`session.rest` null:** the shipped computation, byte for byte (rest muted,
    or a thin log).
  - **The pick is a shape:** that pick, carrying `.stalest` (so every `because`
    that reads it still works) and `.skipped`.
  - **The pick is a group, or there is no pick:** **null.** On a rest or group
    call, no answer or opening may name the shipped, unrecovered shape as "the
    one to train".
- **`session.buildFocus`**, which says what the builder builds by default (§6.3):
  - **`session.rest` null:** the shipped overdue shape.
  - **A pick exists:** the pick, shape or group.
  - **No pick** (a rest call): the shipped overdue shape. Keep the shipped
    computation as one private helper that both facts call, never two copies.
    This is how the targets and the Basic teaser still exist on a rest day.
- **`session.readiness`**: the merged rows (§6.5), or null when `readiness` is
  muted. Sheet only.
- **`session.diffs`**: the latest session's merged rows. Sheet only.
- **`session.replay`**: lazy, and resolved only by the rest answers.
- **`session.usualRun`**: `usualRun()`.
- **`hype_recovery`'s gate** becomes
  `streak ≥ 3 && (usualRun == null || streak ≥ usualRun)`, which means at or past
  his usual longest run (spec §9.4).
- **`hypePool()`** gains the stopping bias for rest. While `session.rest` says
  `rest` or `lighter`, it drops `hype_week_best` and every `volume` line, the way
  it drops them for a lighter week today. `hype_recovery` stays, per card rule 3
  and the spec's G7.
- **`record_day` does not fire** while `session.rest` says `rest` or `lighter`.
  A record day on a rest day is the contradiction the stopping bias exists to
  prevent.

### 6.3 The builder

**The builder default is `session.buildFocus`, and nothing else.** *Build it*,
"Tell me what to train", *What should I lift today?* and the Basic teaser all
build from it:

- `builderInput()` passes `overdue` = `buildFocus` when it is a shape (else
  null), and a new `defaultGroup` = `buildFocus` when it is a group (else null).
- `overdueWhy` is `buildFocus`'s own `because`.
- `focusOf(i, null)` in `coach-build.js` uses `overdue`, then
  `'group:' + defaultGroup`, then null. With only one of them ever set, the
  order cannot disagree.
- `resp_lift_targets` ("Targets for your {name}", coach.js ~2700) reads
  `buildFocus`'s name, never `shapeOverdue`'s.

**The shipped invariant stays true:** *Build it*, after any answer to *What
should I train today?*, builds exactly what that answer named.

- After a `shape`, `group` or `lighter` answer, it builds the pick.
- After a `rest` answer there is no *Build it* (§4.8), only *Train anyway*.

**The caution.** `c.buildCaution(opts)` returns null, or:

```
{ text, reason,
  anyway:    { label: 'Build {name} anyway', opts },               // the same opts
  recovered: { label: 'Train something recovered', opts } | null } // the pick as a focus; null if none or the same
```

- It fires when the focus of `opts` contains a group that is not ready. That
  covers any focus: a menu chip, "Tell me what to train" on a rest day, "Train
  something else", and any other focus the sheet builds.
- It needs Pro, the `rest` switch on, and `session.rest` non-null.
- Its text is §4.8's big-day line or inside-the-window line, for the first
  not-ready group in `GROUP_ORDER`.

**The targets answer** (*What should I lift today?*) gains, as its first `more`
line:

- **When the rest read says `rest`:** "Today looks like a rest day. These
  targets keep until your next session."
- **When readiness counts three or more flags among its TRAINING rows** (or
  `streak` and `failure` together), with readiness on: "Several things in your
  log are off your normal today. If the first set moves slowly, staying at last
  time’s weight is a common approach."
  - It reads training rows only, so food never changes a training answer.

These lines do not alter a single target number.

### 6.4 Selectors, routes, topics

Every new intent is a **selector** (§1, the paint path).

```
rest_day      selector, category 'rest', Pro, surfaces ['sheet'], fires on call 'rest' or 'lighter'
group_ready   selector, category 'rest', Pro, sheet, fires on call 'group'
readiness     selector, category 'readiness', Pro, sheet, fires when ≥ 3 rows have data

ROUTES   ask_shape:        ['rest_day', 'group_ready', 'session_shape_most_overdue', 'train_today_recommendation']
         ask_lighter:      ['rest_day', 'lighter_week', 'readiness']
         ask_build_anyway: ['build_menu']
LABELS   ask_lighter       'Should I rest or go lighter?'   (TRAIN_TOPICS and ASK_LABELS both)
         ask_build_anyway  'Train anyway'
FOLLOWUPS_AFTER
         rest_day:    ['ask_build_now', 'ask_build_anyway']   — ask_build_now ONLY when the rest read has a
                      pick. On a rest call buildFocus is the shipped shape and would build, so this
                      is an explicit condition in followupsFor() for rest_day, not the answerable() filter
         group_ready: ['ask_build_now']
         readiness:   ['ask_shape', 'ask_build']
TRAIN pre   ask_shape, ask_build, ask_targets, ask_lighter, ask_record_day, ask_lifts, ask_overdue, ask_volume
TRAIN live  EXACTLY rack-v51's list, written out — no longer derived from TRAIN_TOPICS
YOU         every state's list unchanged (leadQuestion evaluates the You list on every paint)
```

Micah's decided first three on Train keep their places. *Should I rest or go
lighter?* moves ahead of *Good day for a record?*, because it is the question
you ask before training.

### 6.5 Merging rows

`coach-ready.js` exports `mergeRows(...lists)`:

- it concatenates the lists;
- it sorts by `|z|` descending, with ties in each module's listed order and
  training before food;
- it cuts the result: readiness keeps its flagged rows, and a session keeps
  three.

`coach-fuel.js` rows use the same shape. `coach.js` calls `mergeRows`, and the
two modules never see each other.

### 6.6 *How did today compare?*

`resp_compare`'s `more` becomes, in this order:

1. the shipped rows;
2. the shipped targets-met line;
3. "What was different in your log:" plus up to three row bubbles, or "Nothing in
   your log was off your normal." when no row cleared its bar;
4. "These are differences, not causes." (only when rows were listed);
5. a T2 line (Phase B, Patterns on, §10);
6. the shipped unseen line;
7. the mark's line, when the session is marked.

`a.mark` or `a.marked` rides along as §5.3 says.

### 6.7 `coach-ui.js`

- **The caution** is drawn before a proposal. `pick(item)` asks
  `c.buildCaution(item.opts)` first.
  - If it returns a caution, draw it as a Coach bubble with its chips.
  - *Build … anyway* proceeds exactly as today.
  - *Train something recovered* builds from its opts.
- **`a.mark`** is drawn like a question: a bubble and one chip per option. The
  answer is written through `markSession()` and acknowledged as in §5.3.
  **`a.marked`** draws its chip.
- No new sheet, and no new CSS class unless a chip really needs one.
  `touch-target.mjs` must hold unedited.

## 7. Phase A verifiers

**NEW `tools-check/coach-ready.mjs`**, scored ok / miss / wrong. **Wrong must
be 0.** Fixtures use the real record shape: string `w`/`r`, `type`, `done`,
`_date`, `id`, merged duplicates, and pounds stored on kilo accounts.

| # | Setup | Expected |
|---|---|---|
| R1 | Legs big day yesterday (24 lifting sets, normal 12); a recurring upper shape last trained 4 days ago | `shape` = the upper shape; ask_shape names it; Build it builds it |
| R1b | R1 where legs day is the shipped stalest shape | the upper shape, "waited longest of what’s recovered", and the skipped line for legs |
| R2 | R1, but the 24 leg sets were treadmill and bike (cardio) | legs ready; no caution; the shipped pick |
| R3 | Every usual group inside its window, 4 days straight, usualRun 2 | `rest`, groups named, the streak clause; Train anyway present |
| R4 | streakNow 5, usualRun 3, two lifts declining | `lighter`; both signs with numbers; T3 line; Build it builds the pick |
| R4b | R4 where the pick is a group | Build it builds that group |
| R5 | The streak sign alone | not `lighter`; the normal pick |
| R6 | `rest` muted | every Phase A answer silent; ask_shape, the builder and the targets byte-identical to rack-v51 |
| R7 | 5 sessions in the window | restRead null; shipped answers |
| R8 | A group with 3 dates | window 2, with the common-starting-point label when printed |
| R9 | R1, then Make me a workout → Legs | caution: "Legs had a big day yesterday: 24 sets against a usual 12. Coach would give them another day."; both chips; *anyway* builds legs |
| R10 | Pick a fully recovered shape | no caution |
| R11 | Call `group` (legs ready, upper not) | the answer names legs; Build it builds `group:legs`; *What should I lift today?* shows legs targets |
| R12 | 6 flagged days in 12 weeks, rested on 2 | the rested line, word for word |
| R13 | 5 trained-through flagged days, 4 held | the held line with 5 and 4; the call, windows and pick unchanged from the same log without the replay |
| R14 | 4 trained-through, 3 below | the "came in under your usual on 3" line; nothing else moves |
| R15 | Call `group` or `rest` | `session.shapeOverdue` null; no opening or answer names the shipped unrecovered shape as the one to train; the targets answer names `buildFocus` |
| R16 | streak 3 and usualRun 4; then streak 4 | no recovery line; then the line |
| R17 | Two sessions on one date | one day in every streak and window |
| R18 | Call `rest`, then *What should I lift today?* | the first line says rest; the targets exist and equal rack-v51's |
| R19 | `rest` or `lighter` | *Good day for a record?* silent; `hype_week_best` not on the card |
| R20 | Always-to-failure lifter (3 F per leg day, every time) | a normal leg day is NOT big |
| R21 | Lifter with no recurring shapes, every group ready | recovery row not flagged; call `group` |
| R22 | Call `rest` → Make me a workout → Tell me what to train | the caution (its focus is the shipped, unrecovered shape) |

| # | Readiness | Expected |
|---|---|---|
| D1 | Nothing off | "Nothing in your log is off your normal today." |
| D2 | Streak and load | "Two things are different today:" with both numbers |
| D3 | Streak and failure | "Several things…" and the T3 line |
| D4 | 2 rows with data | readiness silent, bubble not offered |
| D5 | Weigh-in 2% under | the water line; on kilos, in kg |
| D6 | `readiness` muted, `rest` on | ask_lighter answers with `rest_day`/`lighter_week` only, or is not offered |

| # | What was different | Expected |
|---|---|---|
| X1 | Below usual, nothing off | "Nothing in your log was off your normal." and `a.mark` |
| X2 | Above usual, started at 6 am (usually 3–7 pm) | the start row listed; no "despite" |
| X3 | Five rows over the bar | three kept, by \|z\| |
| X4 | A component with 7 reference values | skipped |
| X5 | Usual session | no `a.mark` |

| # | Marks | Expected |
|---|---|---|
| M1 | Before the session his target was `add` → 190 × 8; he got 190 × 6/5/5 and marked it sleep | 190 × 8 again (the target from before); the why is exactly the two mark lines; never 185, never a reduce; in the builder, "Worked out from before your marked session." |
| M2 | Two misses at 185; the second marked | the target from before the second (a hold at 185), not a reduce |
| M3 | Two unmarked misses | `reduce`, as A5 |
| M4 | A lift reading 'declining' only because of a marked session | not declining |
| M5 | A marked session | still counts for days since, streaks, sets this week and windows; "last time" sentences name it truthfully |
| M6 | A mark 183 days old | ignored |
| M7 | No marks anywhere | `prescribe()` byte-identical to rack-v51 on every row and generated history; coach-prog 57/0/0, coach-overlap 24/0/0 |
| M8 | Each ack | exact text; Nothing writes nothing; Clear the mark removes the key |
| M9 | A marked session in the middle, unmarked ones after | the target from the later sessions; the marked one is neither a miss nor a success |

**Properties** over 2,000 or more generated histories:

- **deterministic**, byte for byte;
- **pure** (`coach-pure.mjs` fences the module);
- **order invariance**: shuffling the sessions changes nothing;
- **cardio invariance**: adding cardio sets under any group changes no window,
  big day or rest call;
- **food-blind**: deleting all food changes no Phase A output;
- **mark safety**:
  - when a lift's latest exposure is marked, its mode, load and per-set
    targets equal the replayed target from before that session;
  - its why is exactly the two mark lines, with no relative day in them;
  - a mark never produces a reduce the same log without the mark wouldn't;
- **one builder default**: for every generated history, *Build it*, the
  targets answer, the teaser and "Tell me what to train" build the same focus
  (`buildFocus`), and `shapeOverdue` is either that shape or null;
- **silence**: under every minimum, `restRead`, readiness and the diffs return
  their null or silent answer, and nothing else.

**Changed on purpose**, each with its reason written in place:

- `coach-state`: the topic tables. Also prove Train `live` equals v51's list.
- `coach-registry`: the new selectors; `a.mark` is not a question.
- `coach-voice`: every new string swept, and the card ban unchanged.
- `coach-rank`: category order.
- `coach-hype`: the recovery gate, the rest suppression, and **the paint spy
  (§1)**.
- `coach-build`, `coach-rotation`: only where the rest-aware pick moves a
  fixture's pick. Name each fixture and why.
- `coach-surface`, new section N: the caution before a proposal, the mark
  chips, and the relabelled bubble.
- `coach-prog`:
  - a section E for `targetFor()`;
  - D extended to rack-v51.
- `coach-pure`:
  - fences for `coach-ready.js`;
  - `quantile`/`blocksOf`/`lightOf`/`groupDaysAt` exported, with their bodies checked byte
    for byte against v51's.

**Commit Phase A** before starting Phase B. Every verifier must be green in all
three time zones. Name the commits after what they do, the way v49's are named.

---

## PHASE B: "AM I FUELED?"

## 8. `coach-fuel.js`

`coach-fuel.js` is pure. It imports `coach-goal.js` (`bwAt`, `energyBand`) and
`units.js`, and nothing else.

Its input, from `coach.js`:

- `now`, `u`;
- `summaries` (`food/daySummaries`, already in memory);
- `foodLog` (§9): the dates read so far, `{ date: [{ t, cal, p, c }] | null }`.
  Null means read and unreadable. A date that is absent was not read.
- `sessions`: shaped, with `startedAt`, `date` and `session.id`;
- `weighIns`, `aim`, `aimSetAt` (`asked.q_goal_aim`), `logTiming`
  (`answers.q_log_timing`), `goalDir`, `rateWk`, `energy`;
- `patterns`: the four pattern facts §10 names, already resolved by `coach.js`,
  or null.

Food numbers are kcal and grams and are never converted. Every weight goes
through `units.js`.

**`t` is when an entry was LOGGED** (`food.js` stamps `Date.now()`), not when it
was eaten. So every time-of-day read uses only entries whose `t` falls on the
log's own local date. That covers the curve, "so far today", pre-session intake,
hours since, and the style check. A back-filled entry, logged the next morning,
still counts in the day's summary total and is left out of every time read.

### 8.1 Complete days

```
recent       the dates in the 28 before today with summaries[d].cal > 0
bar          50% of the median cal over recent; needs ≥ 5 recent dates — else stage 'none'
complete(d)  d is not today, and summaries[d].cal ≥ bar
partial(d)   0 < summaries[d].cal < bar
```

Today is never complete. It is always "so far".

### 8.2 The food phase (spec §7.3)

```
weekly class   for weeks k = 0..3 back from today: the % change from bwAt() at the week's
               start to bwAt() at its end, through energyBand() — loss (deep | deficit),
               hold, gain (surplus), or null
changedAt      the two latest weeks share a class, and the two before share a DIFFERENT
               non-null class → 14 days ago
               aimSetAt within the last 28 days → the later of that and changedAt
phase days     the complete days after changedAt. With ≥ 7 of them, the day medians read
               only those ("learning your new normal, N days in" until 21); with fewer, the
               28-day medians stand, labelled "from before your change"
```

### 8.3 Baselines

```
day medians   kcal, protein and carbs over the phase's complete days (≤ 28); kcal q25 and q75 too
              stage 'none' < 7 days, 'learning' 7–20, 'yours' 21+
curve         over READ training dates that are complete and real-time (§8.4): for each, the
              kcal and carbs logged at a local time of day ≤ now's → median, q25, q75
              stage 'none' < 8 days, 'learning' 8–13, 'yours' 14+
pre-session   per read training date: kcal and carbs logged on that date before its startedAt,
              and hours since the latest entry before it (that date's entries only)
carbs48(D)    the carbs of D−1 and D−2 when both are complete; its median over the training
              dates in the 28 that have one (needs 7)
```

### 8.4 Logging style

```
per read date that is complete with ≥ 2 same-date entries:
  real-time  max(t) − min(t) ≥ 4 h
  batch      max(t) − min(t) ≤ 60 min
  (otherwise neither)
account    answers.q_log_timing 'live' → real-time; 'later' → batch
           unanswered: ≥ 6 read dates with 2 or more entries → batch when half or more are
           batch, real-time otherwise; fewer → unknown
```

**Time-of-day reads run only for real-time loggers.** That covers the curve, so
far today, pre-session, and hours since. For batch or unknown, they stand down
and day totals still work. Why: for someone who logs dinner at 10 pm, "nothing
logged before your 5 pm session" is a false sentence.

### 8.5 The fueled read: `fueledRead(input, now)`

First match wins, in this order:

```
'thin'    fewer than 5 recent dates
'empty'   summaries[today] shows no cal, AND today's log is either not read, unreadable, or
          holds no same-date entry with t ≤ now
'unread'  summaries[today].cal > 0, AND today's log is not read, unreadable, or holds no
          same-date entry (a mirror can be older than the summary)
          — never "nothing logged" while the summary says something was
'day'     style batch or unknown, OR curve stage 'none'
'read'    so far = today's same-date entries with t ≤ now; usual = the curve at now's time of day
            lighter   so-far kcal < 70% of usual AND < q25
            heavier   so-far kcal > 130% of usual AND > q75
            about usual otherwise
```

**Sentences.** They are chosen so that none trips `BANNED` or `\beat\b`.

- **`thin`:** "Coach reads fuel from your food log, and there isn’t enough in it
  yet ({n} {day/days})."
- **`unread`:** "Coach couldn’t read today’s food log just now." Then the day
  lines.
- **`empty`:** "Nothing logged today yet." Then the two chips (§10). No fuel
  claim.
- **`day`:** "Coach reads your food by the day, not the hour." Then the day
  lines, then one reason line:
  - batch: "Most of your entries go in together, later, so the hours they were
    logged say nothing about the day’s timing."
  - learning: "Coach is learning when you usually log food on training days
    ({n} of 8 days so far)."
- **`read`:** "{About usual | Lighter than usual | Heavier than usual} so far
  today. You’ve logged {k} kcal and {c} g of carbs; by now on a training day you
  usually have about {uk} and {uc} ({n} days)." Then the day lines.

**The day lines**, each only when it has data:

- **yesterday:**
  - complete and below q25: "Yesterday was on the light side for you: {k} kcal
    against a usual {m}."
  - partial: "Yesterday wasn’t fully logged."
  - complete otherwise: "Yesterday was in your usual range."
  - with nothing logged: nothing.
  - Never "low", and never a claim about eating.
- **48 hours**, when carbs48 and its median are known and differ by 20% or more:
  "The last two days were lower-carb than your usual: {x} g against about {m} g."
  Or higher-carb.
- **energy**, when energy is non-null:
  - "Your weight is coming down about {labelRate} a week." / "Your weight is
    going up about {labelRate} a week." / "Your weight is holding steady."
  - "Cut" only on aim cut or recomp, or goalDir −1.
- **stage:** when the day medians are learning: "Coach is learning your normal
  ({n} days so far)." In a new phase, use the §8.2 label.
- **T2**, with Patterns on: the first non-null of `lift.fedBeforeTop` and
  `lift.caloriesBeforeTop`, worded exactly as Patterns words it.

**reason**, on every state but `thin`: "Going by when you logged it. Coach reads
what’s logged, and food advice isn’t part of what it does."

**Never, anywhere in this module:**

- *low* about food;
- *under-fueled*;
- *carb-load(ed)*;
- *fast(ed/ing)*;
- *eat*;
- *should*;
- a named food;
- *despite*;
- a causal word.

§11's scan enforces all of these.

### 8.6 The food rows

**Readiness row `fuel`**

- **has:** state `read`, or state `day` with a complete yesterday.
- **flag:** the verdict is `lighter`, or yesterday was complete and below q25.
- **text:** "Less food logged by now than usual: {k} kcal against about {m}." or
  the yesterday line.
- It is a readiness row only. §6.3's targets line reads training rows and never
  this one.

**Session rows**, as of the session's `startedAt`. Each uses a robust z against
the same measure at his earlier read training dates (8 or more values,
MAD > 0):

```
before     kcal logged before it                       (real-time only)
carbs      carbs logged before it                      (real-time only)
since      hours since his last logged entry           (real-time only)
yesterday  the day before's kcal, complete only        (z against complete days)
carbs48    carbs48 of its date
```

- **before:** "You’d logged about {k} kcal before it; usually about {m}."
- **carbs:** "About {c} g of carbs logged before it; usually about {m} g."
- **since:** "About {h} hours since your last logged entry; usually about {m}."
- **yesterday:** "The day before came to {k} kcal; usually about {m}."
- **carbs48:** "The two days before had {x} g of carbs; usually about {m} g."

They are listed in either direction and merged with the training rows (§6.5),
keeping three overall.

### 8.7 Standing down (spec §4.8)

| Situation | Behaviour |
|---|---|
| Food muted | no reads (§9), no fuel bubble, no fuel row in readiness or a session |
| Basic | no reads, no bubble; *Readiness* and *Food* are in the Pro panel |
| No targets | nothing changes: every comparison here is against his own medians |
| Batch logger | day totals only; `q_log_timing` asked once, under the answer |
| A day unreadable | left out of every baseline; today unreadable → `unread` or `empty` by the summary |

## 9. The reads (`coach-data.js`)

- **`fuelDays(input)`** is exported from `coach.js` and is pure, like
  `patternFoodDays`.
  - It returns `[]` unless the account is Pro, Food is on, and the log is
    readable.
  - Otherwise it lists, newest first: today, the latest session's date, then the
    most recent complete training dates in the 28 before today. Fifteen dates at
    most.
- **`loadFuel()`** reads every date in that list not yet read this app open,
  with `read('food/log/' + d, null)`.
  - A value becomes an entries array (`[]` for an empty object). A null becomes
    null.
  - Today is re-read only when `summaries[today]` differs from the summary seen
    at its last read.
  - The reads go out together, and the call is coalesced like
    `refreshCoachSessions()`.
  - It never runs on a paint or at boot, and never for Basic, with Food muted,
    or on an unreadable log.
  - It is separate from `loadPatternFood()` (Patterns' own boot read, unchanged)
    and shares nothing with it but `read()`.
- **`coachInput()`** passes `foodLog` (only what `loadFuel()` has read). There
  is no maintenance figure, because there is no cross-check (decision 7).
- **`coach-ui.js`**, before it renders an answer for a route in the exported
  `FUEL_ROUTES` (`ask_fueled`, `ask_fed_unlogged`, `ask_fed_none`,
  `ask_lighter`, `ask_compare`):
  - It awaits `loadFuel()` with a **4-second timeout**.
  - The sheet has no typing state today, so it shows one quiet Coach bubble,
    "Reading your food log…", and replaces it with the answer. It skips the
    bubble when nothing needs reading.
  - Then it re-evaluates `coach(coachInput())` and asks.
  - On a timeout, it answers with what it has.

**The spy** wraps `loadFuel()`'s reads (not `read()` as a whole, because
Patterns reads at boot). It must count:

- 0 at boot and on paints;
- ≤ 15 on the first fuel ask;
- 0 on a second ask with nothing changed;
- 1 after today's summary changes;
- 0 for Basic and for Food muted.

## 10. Wiring Phase B

```
fuel_empty         selector, 'fuel', Pro, sheet — fueledRead state 'empty'
fuel_fueled        selector, 'fuel', Pro, sheet — every other state
fuel_fed_unlogged  selector, 'fuel', Pro, sheet — state 'empty' only
fuel_fed_none      selector, 'fuel', Pro, sheet — state 'empty' only

ROUTES   ask_fueled:       ['fuel_empty', 'fuel_fueled']
         ask_fed_unlogged: ['fuel_fed_unlogged']
         ask_fed_none:     ['fuel_fed_none']
LABELS   ask_fueled 'Am I fueled?' · ask_fed_unlogged 'I ate, it’s not logged' · ask_fed_none 'I haven’t eaten'
FOLLOWUPS_AFTER  fuel_empty:  ['ask_fed_unlogged', 'ask_fed_none']
                 fuel_fueled: ['ask_lighter', 'ask_shape']
TRAIN pre   ask_shape, ask_build, ask_targets, ask_fueled, ask_lighter, ask_record_day, ask_lifts, ask_overdue, ask_volume
TRAIN live  unchanged (v51's)
YOU         unchanged
```

**`fuel_fueled` and `fuel_empty` gates:** Pro, Food on, and a readable log.
**Their `when` must not compute `fueledRead()`**. The sheet's topic filter asks
it on open, before `loadFuel()` has run. They split on two things already in
memory:

- `fuel_empty` fires only when there are **5 or more recent dates** (§8.1,
  summaries only) **and** today's summary shows no cal.
- Everything else, `thin` included, is `fuel_fueled`. So F1 gets the thin
  line, never "Nothing logged today yet".

**`fuel_fed_unlogged`:** "Then today isn’t in your log yet, so Coach can’t read
it." Then the day lines.

**`fuel_fed_none`:** "Noted. That’s for this answer; nothing is saved." Then
the energy line. Then, with Patterns on, the `lift.fedBeforeTop` comparison as
Patterns words it. Nothing is stored (decision 11).

**`q_log_timing`** is a QUESTIONS entry:

- text: "Do you usually log food as you go, or later in the day?"
- options: `live` "As I go", `later` "Later".
- `changes: ['fuel_fueled']`, and `fact: 'coach.logTiming'`, its own fact, so
  the registry can drive it.
- `where: 'fuel'`.
- It is asked when the detected style is batch and it is unanswered.
- ack: "Noted. Coach reads your food by the hour when you log as you go, and by
  the day when you log later."
- `ask()` carries it under `fuel_fueled`, the way it carries the goal questions.

**Readiness** gains the `fuel` row when Food is on.

**Compare** gains the food rows. With Patterns on, it also gains **one** T2
line: the first non-null of `lift.fedBeforeTop`, `lift.caloriesBeforeTop`,
`lift.morningTop` or `lift.restGapTop`. Two conditions apply:

- Only one whose listed row appears for that session: food before → the first
  two; start → morning; rest → rest gap.
- Only when the session trained that pattern's lift.

The Pro panel lists *Readiness*. It is auto-derived; confirm it.

## 11. Phase B verifiers

**NEW `tools-check/coach-fuel.mjs`**, scored ok / miss / wrong. **Wrong must be
0.**

| # | Setup | Expected |
|---|---|---|
| F1 | No food days | the thin line, no numbers |
| F2 | Batch logger (every entry 21:30–22:15) | day lines only; `q_log_timing` under the answer, once; answered "As I go" → time-of-day reads on |
| F3 | 40% of usual by this hour, below q25 | "Lighter than usual so far today." with both numbers and n |
| F4 | Yesterday 900 kcal on a 2,600 median | "Yesterday wasn’t fully logged." Never "low" |
| F5 | Nothing logged today | `fuel_empty`, the two chips, no fuel claim |
| F6 | A session above usual on a light-food day | the food row listed; no "despite", no causal word |
| F7 | A session below, nothing off, food included | "Nothing in your log was off your normal." and `a.mark` |
| F8 | Food muted | 0 reads; no fuel line anywhere, readiness and compare included |
| F9 | Basic | 0 reads; no bubble; the Pro panel lists it |
| F10 | Three weeks of loss after three of gain | medians from the new phase; "learning your new normal, N days in" |
| F11 | Aim changed 10 days ago | the same restriction |
| F12 | 150% of usual, above q75 | "Heavier than usual so far today." |
| F13 | Today's summary shows food; today's read failed, or came back empty from a stale mirror | `unread`; never "Nothing logged today" |
| F14 | A back-filled entry (yesterday's dinner, logged this morning) | counts in yesterday's total; in no time read, and not in today's "so far" |
| F15 | Kilo account | food numbers identical to pounds; every weight in kg |
| F16 | Low-food morning, readiness shows 3 flags only with the fuel row | the targets answer carries NO "Several things" line |

**Properties** over generated food and session histories:

- deterministic;
- pure;
- **order invariance**: shuffling entries and days changes nothing;
- **partial days never lower a median**: adding a partial day moves no day
  median;
- **no read, no time sentence**: with every log absent, no "so far" or "by now"
  string appears;
- **food never changes training**: deleting all food changes no target, no
  rest call, no lift reading, and no line of the targets answer.

**The must-never scan (spec §11.4)** covers every string both new modules and
every new response can produce, across every fixture, in both units:

```
max-attempt   /\b(1\s*rm|one[- ]rep max) (test|attempt)|\bmax(ing)? out\b|\bgo for a (single|max)\b|\btest your max\b/i
causal        /\b(because (you|your)|caused|due to (your|the)|led to|made you|that'?s why|despite|even though)\b/i
body norms    /\b(healthy (weight|range)|bmi|body ?fat|safe rate|too (fat|thin))\b/i
eating        /\beat\b|\b(cut (your )?calories|skip (a )?meal|fast(ed|ing)?\b|carb[- ]?load(ed|ing)?|supplement|under-?fuel)/i
low food      /\blow\b/i   (in any fuel sentence)
medical       /\b(injur(y|ed)|diagnos|pain\b|push through)\b/i
guilt         /\b(you should have|you missed|slacking|lazy)\b/i
AI claims     /\b(ai|artificial intelligence|machine learning)\b/i
banned        the shipped BANNED list, on every Coach sentence (chip labels exempt, as v48 decided)
stray pounds  /\b\d+(\.\d+)? ?lb\b/ on a kilo account
```

The scan covers the new modules and the new responses. The shipped weight
templates use "faster", and a hit there is not this ship's failure.

**Changed on purpose:**

- `coach-registry`: `q_log_timing` and its fact.
- `coach-state`: the final topic tables.
- `coach-voice`: the new strings.
- `coach-surface` N: the fuel chips, the "Reading your food log…" bubble
  replaced by the answer, and the question under the answer.
- `coach-boot`: the `loadFuel` spy.
- `coach-patterns`: still eight. Prove it.

---

## 12. THINGS YOU WILL FIND. DO NOT FIX THEM.

List these in BACKLOG under *What v52 left open* and move on:

- **The card's paint cost** (report §55): 8 ms against v48's 2–3. This ship
  measures its own addition. The fix, a per-open cache, is its own change.
- **"Hard sets" still include cardio** everywhere except recovery (decision 2).
  The fix belongs in `shapeSession()` for every reader at once, and it would
  move shipped numbers.
- **The greeting can echo the card's line.**
- **Goal pace sits in "Stalls and records".**
- **A second session on the same day is invisible to the live-session facts.**
- **Stage five:** mid-session targets, `coach-volume.js`, grey last-time
  targets on a hand-added exercise, and the focus group's builder effects.
- **Micah's drop-set request** (a sub-list of the sets that make up a drop set)
  is a Train UI change, not a Coach one.
- **Water in readiness**: decided "not yet", to be revisited after this stage.
- **The marked-vs-unmarked comparison** waits for a ninth-pattern decision.
- **The replay's learning** (an extra day on the streak sign, a day off a
  group's window) waits for a per-open cache that the card, the builder default
  and the sheet all read (decision 17).
- **Anything in native.** Say what the port needs in `NEXT-NATIVE-V52.md`.

## 13. DOCS

**`COACH-REPORT.md` §59 onward**, in v49's shape:

- read this first;
- what got built, per phase;
- every battery row as the engine says it;
- what you corrected, and the case behind each;
- where this brief was wrong about the code;
- every assumption;
- what is not done, and what nobody has seen;
- Micah's decisions carried forward (7, 8, 9, 11, 13 and 16, with what landed);
- this brief's §3, recorded as decided;
- the paint times (v51 and v52) and the replay's time;
- if the next run reads one thing.

**`NEXT-NATIVE-V52.md`**, the delta on top of V49:

- **The pins:** the two new modules; `coach.js`, `coach-prog.js` (`targetFor`),
  `coach-overlap.js` (exports only), and `coach-build.js` moved.
- **The rules a port is most likely to "improve":**
  - the two logs;
  - a marked latest session replays the target from before it, with its why
    replaced;
  - one builder default (`buildFocus`), and `shapeOverdue` null on a rest or
    group call;
  - the replay reports and adjusts nothing;
  - cardio out of recovery only;
  - time reads only for real-time loggers, and only same-date entries;
  - unlogged is never zero;
  - nothing new on the paint path.
- **Native's `coachData.js` changes:** `markSession`, `loadFuel` against its own
  store, `fuelDays`, and the spy counts.
- **The surfaces table.**
- **The PROPOSED rules:** `marks` under `settings/coach`,
  `"$sid": { r: one of four, d: YYYY-MM-DD, "$other": false }`.
  - Native's `settings/coach` ends in `"$other": { ".validate": false }`, so
    without this every mark is refused once they are published.
  - `readiness` and `q_log_timing` pass the generic `$cat` / `$q` rules.

**AGENTS.md** (`settings/coach`):

- `marks`, `q_log_timing` and `mute.readiness`;
- the food reads: when, how many, and for whom.

**README, BACKLOG and CLAUDE.md's Layout table**, kept true.

**This brief**, committed beside `SHIP-V49-PROMPT.md`.

## 14. DEFINITION OF DONE

- Phase A is committed and green before any Phase B commit. Phase B is committed
  and green.
- Every verifier exits 0 under `TZ=America/New_York`, `UTC` and
  `Pacific/Auckland`. State the count, and name the new ones.
- `coach-prog` **57 / 0 / 0** and `coach-overlap` **24 / 0 / 0**.
  `coach-ready` and `coach-fuel` show **wrong 0**; state their ok and miss
  counts.
- With no marks stored, `prescribe()` and `targetFor()` are byte-identical to
  rack-v51's `prescribe()` on every row and every generated history.
- A card paint on the year-long fixture is within **+1 ms** of v51, and the
  paint spy is green.
- `database.rules.json` is byte-identical to rack-v51.
- `sw.js` and `usage.js` read `rack-v52`.
- The §9 spy counts hold, and the replay time is measured and written down.
- Nothing is pushed.

**The five-line handoff:** what shipped, what's green, what nobody has seen,
what Micah decides next, and his walkthrough. He walks it on the live site after
he pushes, with two force-refreshes first:

1. Train → COACH ME → *What should I train today?* → a recovered session or
   group, or a rest or lighter answer with numbers. If it says rest: *Train
   anyway*.
2. *Make me a workout* → a group he trained hard yesterday → the caution with its
   numbers.
   - *Build … anyway* builds that group.
   - *Train something recovered* builds the other.
3. *Should I rest or go lighter?* → a list with numbers, or "Nothing in your log
   is off your normal today."
4. *Am I fueled?* → a verdict with two numbers and a day count, or a day-level
   answer saying why. Then Settings → Coach → Food off: the bubble is gone. Turn
   it back on.
5. After a workout: *How did today compare?* → "What was different in your log",
   with up to three rows, then "These are differences, not causes."
   - If it was below: *Anything Coach can’t see?* → Slept badly → "Noted…".
   - Reopen: "You marked this session…" → *Clear the mark*.
6. The Readiness switch exists under Settings → Coach.
7. The friend's Basic account shows none of the above, and the Pro panel lists
   *Readiness*.

## 15. IF YOU GET STUCK

- **A rule here contradicts the code:** follow the code's invariant, write the
  case in the report, and keep going.
- **A battery row can't be made right without breaking the 57 or the 24:** keep
  the 57 and the 24, make the new row a miss, and say why.
- **The replay blows its budget:** memoise by date. If it still does, drop the
  trained-through line, keep the rested line, and say so.
- **The paint budget is blown:** move whatever did it off the paint path. Never
  raise the budget.
- **Phase B can't be finished:** ship Phase A alone as rack-v52 with its docs,
  and leave Phase B for the next run. Never ship half a fueling brain.
