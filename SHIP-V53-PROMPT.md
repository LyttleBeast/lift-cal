# THE FINISH (web only) → rack-v53

Build brief for one Claude Code run in `~/dev/ship-v53`, a fenced clone of
lift-cal at `6f76c3b` (**rack-v52**, live, walked on Micah's phone and on the
website on 24 Sep 2026: every check passed).

Written 24 Sep 2026, the evening after Micah did a whole workout exactly as
Coach built it. His words about what came after:

> "I am expecting a lot of encouragement. After a workout the first thing I
> want to see is like 'Great workout!' … we really need to redo the page after
> you click finish … get rid of the %, like I did an amazing workout but the
> ending said -30% which was super discouraging. Showing the statistics of if
> you are down aren't bad but the main headlines should be more encouraging."

And a new screen he asked for: "1–10 how did you feel this workout energy
wise, how did you feel strength wise compared to normal (% answer with 100%+
as an option) — that will help with logging energy levels compared to how much
and what you eat before you lift and how long ago it was since you ate."

**This ship does four things, in this order:**

- **A. The five small fixes** found on 24 Sep (§3). Build and commit them
  first. They are small and they unblock nothing, but they are owed.
- **B. The finish line**: one pure decision, `finishRead()`, of what to
  celebrate after a workout. The recap, the Coach card and the Coach sheet all
  read it, so the three can never disagree (§4).
- **C. The recap page, redone**: the win first, the stats under it, and no
  percentage anywhere. The comparison is against sessions **like this one**, in
  neutral words (§5).
- **D. "How did that feel?"**: energy 1–10 and strength against normal,
  saved with the session. The bad-day mark is folded in, and three new
  Patterns tie it to food (§6).

**Not in scope:**

- stage five (mid-session targets, volume bands) and the per-set effort tap;
  both are next;
- the Your goal screen cleanup Micah asked for "later";
- the native port. A separate run will do that. Never open `~/dev/rack-mobile`.

**Before the run starts (Micah):**

- `~/dev/ship-v53` must be a **full** clone.
- It is fenced like ship-v52: the refusing pre-push hook, plus
  `.claude/settings.json` excluded in `.git/info/exclude`.
- This file sits in its root.
- `echo GUARDTEST ping` must be refused. If it runs, stop.

---

## 0. THE STANDARD

Micah, 23 Sep: "This coach should be at the level where I can trust it."
Micah, 24 Sep: "I am expecting a lot of encouragement."

These are not in tension, and this ship is where that has to be proven:

1. **The first thing after a workout is always warm, and never a number that
   stings.** No percentage, no red or grey verdict colour, no "down" in any
   headline. Down numbers may appear lower on the page, in neutral words.
2. **"Great workout." is earned, never automatic.** It appears when the log or
   his own rating backs it (§4.2). Otherwise the headline is still warm ("Good
   work.") and says something true. Praise he can't trust is praise he learns
   to skip, and then the real "Great workout." means nothing.
3. **Everything said is true.** Every line in §4 is a fact from the session,
   from his log, or from his own rating.

---

## 1. NON-NEGOTIABLES

The v48–v52 briefs' §1 stands in full:

- vanilla ES modules, no dependencies;
- **`sw.js` and `usage.js` both become `rack-v53`**;
- `node --check --input-type=module < "$f"` on every file;
- every verifier exits 0 under `TZ=America/New_York`, `UTC` and
  `Pacific/Auckland`;
- small diffs, with comments that explain why;
- never commit a key; never touch the Worker, Firebase or anything that
  deploys; **do not push**;
- keep README, AGENTS, BACKLOG and CLAUDE.md's Layout table true;
- finish with the five-line handoff.

**The house voice rules, unchanged.**

- The shipped `BANNED` list (including v49's *eat*) applies to every new Coach
  sentence.
- Chip labels are his voice, as v48 decided.
- No causal words about his own data.
- No exclamation marks. "Great workout." takes a full stop, which is house
  style (decision #16's example was written the same way).
- Every weight goes through `units.js`.

**The contracts are unchanged:**

- `coach-prog` **57/0/0**, `coach-overlap` **24/0/0**, `coach-ready` **46/0/0**,
  `coach-fuel` **16/0/0**. If a row has to move, it moves on purpose, with its
  reason in place.
- `database.rules.json` stays byte-identical. Every new stored thing lands under
  paths the published rules already grant (`workouts` has a section `.write`;
  `settings` has a section `.write`).
- The paint path: nothing new on a card paint beyond `finishRead()` in the two
  states that need it (§4.4). Measure it, as v52 did.

**Purity.** `finishRead()`, the same-kind comparison and the feel rules are pure,
with the clock as an argument, so native can copy them verbatim. `coach-data.js`
remains the only impure gatherer on the Coach side, and `workout.js` owns the
writes.

---

## 2. ARCHITECTURE

```
analytics.js    CHANGED: sameKindComparison() and normFeel() added (§5.2, §6.1); the
                recap stops calling sessionComparison(). analytics.js is a native
                pin; it moves on purpose
coach.js        finishRead() (§4), hype_finish + the 24-hour rule + WARM lines
                (§3.2, §4.4), the post-workout opening (§4.4), ask_ready (§3.3),
                three feel Patterns (§6.4), the feel category (§6.5), the feel line
                in How did today compare? (§6.3)
coach-fuel.js   the phase label names the change (§3.4)
coach-data.js   coachFinishRead(record, extras) (§4.3), noteCoachFood() (§3.5),
                rememberHype() keeps { id, key, at } (§3.2), the feel reads for
                Patterns (§6.4)
coach-ui.js     the Lift target Save check (§3.1); the finish bubble first in the
                sheet (§4.4); the feel card's mark chips reuse v52's (§6.2)
food.js         one call after the daySummaries write (§3.5)
workout.js      the recap redone (§5), the feel card and its write (§6), saveEdit
                carries `feel` (§6.1 — a trap)
rack.css        only what the recap and the feel card need, on existing tokens
```

**The staging edit** is allowed everywhere: every Coach verifier that stages the
modules stages whatever it needs.

---

## PHASE A — THE FIVE SMALL FIXES

Commit each one on its own, named for what it fixes.

### 3.1 The Lift target over 2,000 lb says "Saved" and deletes the target

**The bug.** `coach-ui.js` `liftTargetRow` Save converts with `wIn(lbs, u)` and
calls `setGoalLift()`. `normSettings()` then drops a `goalLift` whose `lb` is
over `GOAL_LB_MAX` (coach-goal.js), so the patch writes the node **without**
the old target. The write succeeds, so the toast says "Saved". Nothing is saved
and the existing target is gone.

**The fix.** Validate before writing: run `normGoalLift({ exId, lb, reps, at })`
first.

- **If it returns null:** write nothing and keep the old target. Toast the
  limit in his unit: "Coach takes lift targets up to {max}."
  - {max} comes from `units.js` **`limW([0, GOAL_LB_MAX], u)[1]`**, which rounds
    inward, with its unit label.
  - Not `labelW`, which rounds outward: it prints 907.2 kg, which is
    2,000.03 lb and itself refused.
  - Add a kg test that the number shown is accepted.
- **Otherwise:** write. After the write, check that the stored `goalLift` is
  the one sent. Only then say "Saved".

**The verifier.** Extend `coach-pace.mjs` (or the surface verifier) with:

- 2,001 lb → nothing written, old target intact, toast names the limit (both
  units);
- 2,000 lb → saved;
- a failed write → "Couldn’t save that", old target intact.

### 3.2 The card repeats the same earned line every open

**The bug.** v49 built the rotation, but not the spec's rule 6 (§9.4): "the
same underlying fact value isn't shown twice within 24 hours". With one line in
the pool, *48 days of food logged straight* showed on every open.

**The fix.**

- Every `HYPE` entry gains `key: d => string`, the fact value it quotes (e.g.
  `'logging:48'`, `'pr:<exId>:<value>'`).
- `rememberHype()` keeps `{ id, key, at }`, newest first, eight deep, in the
  same device key `coachHype`. Old string entries read as `{ id, key: id, at: 0 }`.
- `pickHype()` skips any candidate whose `key` was shown in the 24 hours before
  `input.now`.
- **When nothing is left, the card draws a `WARM` line instead of the old
  "Nothing stands out today."**
  - `WARM` is a new frozen registry of about eight generic lines.
  - Each claims nothing about his data: "A good day to get something done.",
    "Coach is here whenever you want it.", and day-aware variants like
    "Thursday. Coach is ready when you are."
  - Every line passes `CARD_BANNED`. "need" is banned there, so no "when you
    need it".
  - **Never the same sentence as a shipped greeting.** "Good to see you." and
    "Ready when you are." are greetings g_hello / g_ready (coach.js ~3297), and
    the greeting is drawn directly above. A WARM line is also never drawn when
    it would equal the greeting on screen.
  - The lines rotate on `input.opens` with the same memory as the greeting.
- "Nothing stands out today." stays only as a sheet answer, where it is a real
  answer to a question.
- The card ban (`CARD_BANNED`) applies to `WARM` too.

**Why warm lines and not silence:** Micah wants encouragement. A warm line that
claims nothing is honest, and a card saying "Nothing stands out today" on a
good day reads as a shrug.

**The verifier.** In `coach-hype.mjs`:

- a pool of one: shown once, then 24 hours of `WARM`, then shown again;
- a pool of two: each shows once in 24 h, then WARM;
- the same fact value under two ids is shown once;
- old string memory reads cleanly;
- `WARM` passes the card ban in both units.

### 3.3 The readiness list is hidden behind the lighter-week answer

When `lighter_week` answers *Should I rest or go lighter?*, the readiness list
never gets a turn.

- Add a route `ask_ready: ['readiness']`, labelled "Anything else off today?".
- Create `FOLLOWUPS_AFTER.lighter_week = ['ask_ready']`. There is no entry for
  it today; the button-level follow-ups for `ask_lighter` still come after it.
- It is offered only when readiness answers (the shipped `answerable()`
  filter).

### 3.4 "Your usual here is from before your change." doesn't say which change

`coach-fuel.js` knows why `changedAt` was set. It is either the aim
(`aimSetAt`) or the weight trend's class. Name it:

- **aim, before:** "Your usual here is from before you changed your goal, {n}
  days ago."
- **weight, before:** "Your usual here is from before your weight trend
  changed, about 2 weeks ago."
- **new phase (the learning line):** "Coach is learning your new normal since
  you changed your goal, {n} days in." / "…since your weight trend changed, {n}
  days in."

When both apply, name the later one. `coach-fuel.mjs` F10/F11 update on
purpose, with their reason in place.

### 3.5 Food logged after the first *Am I fueled?* isn't seen

`loadFuel()` re-reads today only when `summaries[today]` has changed. But
`coach-data.js`'s `summaries` only moves when the You tab repaints
(`noteCoachData` from you.js).

**The fix.**

- `coach-data.js` exports `noteCoachFood(dateKey, summary)`, which sets
  `summaries[dateKey]` and nothing else.
- `food.js` calls it straight after each `food/daySummaries/{key}` write (both
  sites, food.js:119 and :320).
- The next fuel ask then re-reads today, and only today.

**The verifier.** Extend the `coach-boot.mjs` H spy: log food after a first ask,
then ask again. That must be exactly 1 read, and the answer must carry the new
total.

**Commit Phase A**, with every verifier green in three zones, before Phase B.

---

## PHASE B — THE FINISH LINE

## 4. `finishRead()` in `coach.js`: what to celebrate

### 4.1 Its input

`finishRead(input, record, extras)` is exported, pure, with the clock as
`input.now`.

- `input` is `coachInput()`.
- `record` is the session just saved. Its sessions are `input.sessions` with
  `record` added if its `id` isn't there yet; right after Finish,
  `refreshCoachSessions()` has not landed.
- `extras` is `{ prs, firsts, milestones }`, exactly as `workout.js` already
  computes them with `detectPRs` / `sessionMilestones` against the sessions
  before it. **It is optional.** When absent (the card and the sheet, which have
  no recap in hand), `finishRead()` computes them itself with the same two
  `analytics.js` functions over the same prior sessions. The recap, the card and
  the sheet therefore reach the same answer by the same arithmetic.

With no readable log (`log !== 'readable'`), it still answers, from `record` and
`extras` alone.

**Imports.** `coach-pure.mjs` limits what `coach.js` may take from
`analytics.js` (its `PURE` list, :171–178). Add `detectPRs`,
`sessionMilestones` and `normFeel` to that list **on purpose**, each with its
reason. They are pure, and analytics.js imports nothing from coach.js, so there
is no cycle.

`prDetail` is on the IMPURE list. Don't import it. Restate its one-line PR
detail in `coach.js` through `units.js`.

### 4.2 Its answer: `{ headline, line, why, earned, evidence }`

**`headline` is one of two**:

- **"Great workout."** — `earned: true`. It needs **at least one** of these
  (the evidence), in this priority order:
  1. a PR in `extras.prs` → line "New best on {name}: {set}." (weights through
     `units.js`, and the same detail `prDetail` prints);
  2. every replayed Coach target met, with **at least two** targets that named
     a weight, the same bar `hype_targets_met` uses (coach.js:3503)
     (`targetsReplay`; **Pro and targets on only**) → "Every Coach target met:
     {k} of {k}.";
  3. a session milestone in `extras.milestones` → its own shipped label, as
     `sessionMilestones` writes it (analytics.js:280–290: "Heaviest session
     ever", "Most working sets ever", "Longest session ever"), e.g. "Most
     working sets ever.";
  4. How did today compare?'s summary is `above`, or its single row is `above`
     (`compareSession`; **Pro only**, like the compare answer itself) → "Above
     your usual on {name}.";
  5. his own rating: energy ≥ 8, or strength ≥ 110 (§6) → "You rated it {e}
     out of 10." / "Stronger than normal, by your rating.";
  6. a comeback: the first session after 12+ days away (`session.back`) → "First
     session in {n} days."
- **"Good work."** — `earned: false`. It is always available, and the line is a
  plain true fact:
  - "{Shape or group names} done: {n} sets." (e.g. "Chest and arms done: 18
    sets.");
  - or, on a **harder day**: "Good work. Showing up on a harder day counts." A
    harder day means the session is marked, or rated strength ≤ 90, or rated
    energy ≤ 3 (the same test that brings up the mark chips, §6.2). The line is
    warm and true, and it answers Micah's point that a down day still deserves
    a kind word.

**`why`** is the evidence clause, with its numbers ("Your best at 70 lb was 7
reps.").

**`evidence`** is the ids that made it, for the verifiers.

**Never:** a percentage, "down", "under", "below", "lighter", "only", "still",
a comparison with anything but his own log, an exclamation mark, or "Great"
without evidence.

### 4.3 The gatherer

`coach-data.js` exports `coachFinishRead(record, extras)`. It builds
`coachInput()`, calls `finishRead()`, and returns its answer, or a safe "Good
work." from `record` alone if anything throws. The recap calls it once, when it
draws. Nothing new is read from the database.

### 4.4 Where it appears

1. **The recap's hero** (§5.1).
2. **The Coach card**, in states `post` and `done_today`. There is a new `HYPE`
   entry, `hype_finish`, at the top of the pool in those states, for every aim.
   - text: the headline, plus the evidence when the two fit the card's shipped
     limits (`fitsCard`: 9 words, 1 number), e.g. "Great workout. New best on
     incline press." A long lift name that won't fit leaves the headline
     alone, and the evidence goes in the reason line. Never truncate a name.
   - reason: `why`.
   - key: `'finish:' + record.id`. **Keys starting `finish:` are exempt from
     the 24-hour skip (§3.2) while the state is `post` or `done_today`.** The
     finish line shows on every open on the day of the workout, then the
     skip applies as normal.
   - **Explicit order in those two states** (a new rule; the shipped
     `hypePool` sorts by suits, age and id, and `pickHype` starts at a rotated
     offset, so "top of the pool" is not enough):
     1. `hype_recovery`, when its shipped gate passes (3+ days in a row AND at
        or past his usual longest run);
     2. `hype_finish`;
     3. then the shipped rotation for everything else.

     When `hype_recovery` takes the card, the sheet still opens with the finish
     line.
3. **The sheet's first bubble**, in `post` and `done_today`. `c.opening` is the
   finish line, and the ranked finding the sheet used to open on becomes
   `c.openingNext`, drawn as the second bubble. The first thing after a workout
   is never a correction.
   - **Re-key `repeats`** (coach.js, the `withRepeat` check against
     `you.text`) and the sheet's "follow-ups hang on the opening bubble" logic
     (coach-ui.js ~379–388) to `openingNext` in those states. An answer that
     repeats the finding is marked against the finding, not the finish
     bubble.
   - `coach-ready.mjs` R15 reads `c.opening`, and its fixture has a session
     today. Point it at `openingNext` on purpose, so the row still tests what
     it was written for. The battery stays 46/0/0.

The card paint may call `finishRead()` in those two states only. Measure it.
The budget for the whole card paint is still +1 ms against v52.

---

## PHASE C — THE RECAP PAGE

## 5. `renderSummary()` in `workout.js`, redone

### 5.1 The order, top to bottom

1. **The hero.**
   - An eyebrow reading "Session complete".
   - `finishRead`'s **headline** as the big line (the `h1`). "Great workout."
     or "Good work."
   - Its **line** under it, then the session name and date, smaller.
2. **"How did that feel?"** (§6.2).
3. **Wins**, which are the shipped cards: new personal records, session
   milestones, first time logged. They move up, unchanged in content.
4. **The stat row**: duration, volume, working sets, unchanged.
5. **What you did**: the per-exercise list, unchanged.
6. **"Compared with sessions like this"** (§5.2), only when there are enough.
7. **Done / Save as routine / See statistics**, unchanged.

### 5.2 The comparison: same kind, no percentage

`analytics.js` `sessionComparison()` averaged **every** session in 28 days, so
a chest day was divided by an average that included leg days, and a good chest
day read "-30%". **The recap stops calling it.**

- Its other caller is `tools-check/bodyweight-sets.mjs` (:102, asserting at
  :342–374).
- Port those checks to `sameKindComparison()` on purpose, then delete
  `sessionComparison()`.
- If that proves messy, leave the function in place with a comment that no
  screen reads it since v53. Never leave the verifier red.

The recap uses the new `sameKindComparison(record, prior, now)`:

```
kind(s)    the groups with ≥ 2 working sets from non-cardio exercises (record ex.group)
like(s)    prior sessions in the 56 days before, whose kind differs from this one's by at
           most one group (symmetric difference ≤ 1) and shares at least one
needs      2 or more such sessions, else null (the card is not drawn)
returns    { n, volume, usualVolume: median, sets, usualSets: median, label }
           label: the kind's groups in GROUP_ORDER, joined as Coach joins them
           ("chest and arms days") — restated here, since analytics.js must not
           import coach.js
volume     compared only when BOTH today's volume and the usual are > 0 (the shipped
           guard at analytics.js:327–330 — never "against a usual 0 lb");
           otherwise working sets only
```

The card:

- **eyebrow:** "Compared with sessions like this".
- **two plain lines:**
  - "Volume: {v} {unit} today, against a usual {u} on {label} ({n} sessions)."
  - "Sets: {s} today, against a usual {m}."
- **No percentage and no big number.** No green, grey or red verdict colour;
  body text colour only.
- **It never leads the page.** It sits under What you did.

**Verifier: `tools-check/recap.mjs` (NEW)**, through the DOM shim as
`coach-surface.mjs` does:

- no `%` character anywhere on the rendered recap **outside the feel card**
  (whose chips and saved line are his own rating), in both units;
- the hero is `finishRead`'s headline;
- the comparison card appears only with 2 or more like sessions, compares a
  chest day only with chest-type days (leg days out), and uses medians;
- a bodyweight-only session compares sets;
- a session with no like sessions shows no comparison card;
- the section order is §5.1's.

---

## PHASE D — "HOW DID THAT FEEL?"

## 6. The feel check-in

### 6.1 What is stored

`workouts/{mk}/{dd}/{id}/feel = { e: 1..10, s: 80 | 90 | 100 | 110 | 120, at: ms }`

- `e` is energy, and `s` is strength against his normal, where 120 means "120%
  or more".
- Either may be absent, but not both. `at` is when it was rated.
- It is written as **one child write** to that path, after the record itself
  is saved. The record is safe first, and the rating is extra.
- The published rules take it: `workouts` carries a section `.write`.
- The month cache and `refreshCoachSessions()` are updated after the write
  resolves, never before, which is the order runFinish already uses.
  - Set `monthCache[mk][dd][id].feel` **straight after** the feel write
    resolves. Any later whole-month write (a delete, an edit, a move) PUTs the
    month from that cache. A cache without `feel` would erase the rating, and
    the container guard wouldn't count it as a dropped child.
  - Add a verifier case: rate, then delete another session that day. The
    rating survives.
- **The trap: `saveEdit()` rebuilds the record from scratch** (workout.js
  ~1692). It must carry `feel` over from the record being edited, unchanged, or
  editing a workout silently erases its rating. Add a verifier case for this.
- A pure `normFeel(v)` (in `analytics.js`, beside the record helpers, so native
  copies it verbatim) accepts only integer `e` in 1–10 and `s` in the five
  values, and fails safe to null. Everything that reads `feel` goes through it.

### 6.2 The card on the recap

- **heading:** "How did that feel?"
- **Energy:** ten chips, 1 to 10, in two rows of five, with the caption
  "Energy".
- **Strength compared to your normal:** five chips, "80% or less", "90%",
  "100%", "110%", "120%+". These are his words, as he asked. The recap's ban on
  percentages is about Coach's comparisons, not his own rating.
- **Buttons:** **Save** (enabled once either row has a pick) and **Skip**.
  - Skip collapses the card and writes nothing.
- **Once saved,** the card becomes one line: "Energy 8/10 · Strength 110%".
  Then:
  - **When strength ≤ 90 or energy ≤ 3:** under that line comes v52's mark
    question, "Anything Coach can’t see?", with the same five chips, the same
    acks word for word, and the same gates.
    - That includes the **Questions switch** that v52's `markView` honours
      (coach.js ~4689). With Questions off, no chips.
    - Call `markSession({ id: record.id, date: dateK }, r)`. The finish record
      has no `date` field, so pass runFinish's `dateK`.
    - The compare answer's mark question then sees the session as marked, and
      does not ask again.
  - The headline recomputes: a rating of 8+ energy or 110%+ strength can turn
    "Good work." into "Great workout." (§4.2 item 5). A rating under 100% with
    no other evidence turns the line into "Showing up on a harder day counts."
- **The Feel switch.** Settings → Coach gets a new switch, **"After a workout:
  how it felt"**. It is category `feel`, mutable, on by default, and sits
  directly after `live`. When it is off, the card is never drawn. The switch is
  free for every tier, because logging how you feel is not a Pro feature.
- 44 px targets on every chip. `touch-target.mjs` holds; add the new controls to
  its snapshot on purpose.

### 6.3 What Coach does with it

- **How did today compare?** gains, after the shipped rows, the line "You rated
  it: energy {e}/10, strength {s}%." (or "120%+"). The rating is his, so its
  percentage is quoted as he gave it.
  - When his rating and the numbers point different ways, both are stated with
    no verdict: "By the numbers it was your usual; you rated it 110%."
- **finishRead** reads it (§4.2).
- **Nothing else changes.** A rating never moves a target, a window or a
  baseline tonight. That is the RIR tap's job, and it is a later ship.

### 6.4 Three new Patterns (Micah's decision, 24 Sep)

v52 held Patterns at eight because a ninth is a decision. **Micah made it
today**: he wants his energy compared with how much he ate before lifting and
how long it had been since he ate. So there are three new pattern facts, on the
shipped machinery, with the same rules:

- opt-in (Patterns on);
- descriptive only;
- both sides ≥ `PATTERN_MIN` (8);
- both counts printed;
- never a causal word.

```
feel.energyFedBefore     energy on rated sessions with food logged before startedAt,
                         against rated sessions with none logged beforehand
feel.energyKcalBefore    energy at or above his median kcal logged before a session,
                         against below it (rated sessions with food logged beforehand)
feel.energySinceFood     energy when his last logged entry was at or under his median
                         hours before, against longer — REAL-TIME LOGGERS ONLY
                         (coach-fuel.js's logging style), same-date entries only
```

Sentences, each with both counts, for example: "On your 9 rated sessions with
food logged beforehand, energy had a median of 7 out of 10; on the other 8, 5."

- **Reads.** Today `loadPatternFood()` keeps only each day's FIRST entry time
  (coach-data.js ~256–259). Two of the new facts need each entry's `t` and
  `cal`.
  - For the rated-session dates, keep `[{ t, cal }]` per date (`foodDays`,
    beside `foodFirst`, which stays as it is for the shipped facts).
  - `patternFoodDays()` returns the shipped dates unchanged, **plus** the rated
    sessions' dates in the pattern window. Cap only the added dates, at 40,
    newest first, and never trim the dates `lift.fedBeforeTop` already reads.
  - The gate stays exactly as today: the Patterns switch.
- **`coach-patterns.mjs`** expects **eleven** now. Update it on purpose, with
  the decision and its date in the comment.

### 6.5 The category and the registry

- `feel` goes in `CATEGORIES` (label "After a workout: how it felt", note "The
  energy and strength check-in on the recap."), directly after `live`.
- The feel card is a surface, not an intent. `coach-registry.mjs` checks that
  every category has an intent. Give it one exemption, for `feel`, with the
  reason written in place. `PRO_ADDS` is unaffected, because `feel` is free.

### 6.6 Verifiers (Phase D)

**NEW `tools-check/feel.mjs`:**

- `normFeel` on every junk value;
- the child write path and its order (record first);
- `saveEdit` keeps `feel`;
- Skip writes nothing;
- the mark chips appear exactly at strength ≤ 90 or energy ≤ 3, and never
  with Questions off;
- a rating survives a later whole-month write the same day;
- the compare line;
- the headline recompute;
- the Feel switch hides the card.

Also changed on purpose:

- **`month-erasure.mjs` (~156–160) and `tick-targets.mjs` (~236–238).** They
  lift `runFinish`/`saveEdit` source into `new Function` with a fixed stub
  list, so every new free name in those functions (the feel write,
  `normFeel`, `coachFinishRead`…) needs a stub there. Add them, and don't
  weaken what those files assert.
- `coach-patterns.mjs`: eleven, each new fact with a true, a false and a thin
  fixture.
- `coach-registry.mjs`, `coach-rank.mjs` (category order), `coach-state.mjs`,
  and `coach-voice.mjs` (every new sentence swept, and `WARM` under the card
  ban).

**NEW `tools-check/finish.mjs`**, scored ok / miss / wrong, **wrong 0**:

| # | Setup | Expected |
|---|---|---|
| N1 | A PR on Incline Dumbbell Bench Press | "Great workout." + "New best on Incline Dumbbell Bench Press: …" |
| N2 | Every Coach target met (2 of 2); and 1 of 1 | 2 of 2 → "Great workout." + "Every Coach target met: 2 of 2."; 1 of 1 → not this evidence |
| N3 | Nothing above usual, no PR, targets 1 of 2 | "Good work." + "Chest and arms done: 18 sets." |
| N4 | N3, then rated energy 8 | "Great workout." + "You rated it 8 out of 10." |
| N5 | N3, then rated strength 90 | "Good work. Showing up on a harder day counts." + the mark chips |
| N6 | A marked session with a PR | "Great workout." (a PR is a PR) |
| N7 | First session in 20 days | "Great workout." + "First session in 20 days." |
| N8 | Basic account, every target met | not the targets line (Basic has no targets); the next evidence or "Good work." |
| N9 | Kilo account, a PR | the PR line in kg |
| N10 | Log unreadable | an answer from the record alone, never an error |
| N11 | Every fixture | no `%`, no "down", "under", "below", "only", "still", no "!" in headline or line |
| N12 | Card in post state | `hype_finish` first; on a three-day streak, `hype_recovery` first and the sheet opens on the finish line |

**Properties:**

- "Great workout." never appears without a non-empty `evidence`.
- Every headline is one of the two.
- Deterministic.

---

## 7. THINGS YOU WILL FIND. DO NOT FIX THEM.

List them in BACKLOG under *What v53 left open*:

- the Your goal screen's layout (Micah: "looks messy — a later update");
- stage five and the per-set effort tap (next);
- the rating does not move targets (the effort tap's job);
- the Stats screen's own comparisons, if any use all-session averages; note
  them, don't change them;
- anything in native.

## 8. DOCS

- **`COACH-REPORT.md` §69 onward**, in v52's shape. Include:
  - this brief's calls, recorded as decided;
  - the paint times;
  - every battery row.
- **`NEXT-NATIVE-V53.md`**, the delta on top of V52:
  - **The pins.** `analytics.js` moves: `sameKindComparison`, `normFeel`, and
    `sessionComparison` gone. `coach.js`, `coach-fuel.js`.
  - **Native's summary screen:** the hero, the feel card, the order, the
    same-kind card.
  - **The trap:** `saveEdit` must carry `feel`.
  - **The device memory shape:** `coachHype` now holds `{ id, key, at }`.
  - **`noteCoachFood()`**, called from native's food state after each summary
    write.
  - **The PROPOSED rules.** Native validates `workouts/$mk/$dd/$sid`. If it
    closes that record with `$other: false`, it must gain
    `feel: { e: integer 1–10, s: one of 80/90/100/110/120, at: number,
    $other: false }`. `settings/coach/mute/feel` passes the generic `$cat`
    rule.
- **AGENTS.md**: `feel` on the workout record, the `feel` category, and the
  Patterns reads for rated days.
- **README, BACKLOG and CLAUDE.md**, kept true. This brief, committed beside
  SHIP-V52-PROMPT.md.

## 9. DEFINITION OF DONE

- Phase A committed and green, then B, C, D. Every verifier exits 0 in three
  zones. State the count and name the new ones (`recap`, `finish`, `feel`).
- The four shipped batteries are unchanged: 57/0/0, 24/0/0, 46/0/0, 16/0/0.
- **No `%` on the recap outside the feel card** (his own strength rating chips
  and line).
- `database.rules.json` is byte-identical to rack-v52.
- `sw.js` and `usage.js` read `rack-v53`.
- The card paint is within +1 ms of v52, and measured.
- Nothing is pushed.
- **The five-line handoff**, and his walkthrough on the live site after he
  pushes (force-refresh twice first):
  1. Log a short workout (or finish a real one), then tap Finish. The first big
     line is "Great workout." or "Good work." with a true line under it. There
     is no percentage anywhere except your own strength chips.
  2. "How did that feel?": pick energy and strength → Save → one line. Rate
     strength 90% on a test session → the "Anything Coach can’t see?" chips.
  3. "Compared with sessions like this" (if shown) compares against the same
     kind of day, in plain numbers.
  4. Coach card on You: "Great workout. …" or "Good work. …". Open COACH ME:
     that is the first bubble.
  5. Close and reopen the app a few times: the food-streak line shows once,
     then warm lines. No repeats within the day.
  6. Settings → Coach → Your goal → Lift target 2,001 lb → the limit message,
     old target intact.
  7. Log a food, then ask *Am I fueled?* again: the new total is there.
  8. *Should I rest or go lighter?* on a lighter-week day → *Anything else off
     today?* chip → the readiness list.
  9. *Am I fueled?* after a goal change names the change.

## 10. IF YOU GET STUCK

- **A rule here contradicts the code:** follow the code's invariant, write the
  case in the report, and keep going.
- **A shipped battery row would move:** it doesn't. Make the new behaviour a
  miss rather than move a row, and say why.
- **The paint budget is blown by `finishRead()` on the card:** compute it once
  per app open in `coach-data.js` for the latest session and hand the card the
  result.
- **Phase D can't be finished:** ship A–C as rack-v53 with docs and leave D for
  the next run. Never ship a rating that isn't read back correctly by edit.
