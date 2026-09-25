# COACH — what got built, what changed, and what did not

> **rack-v53 (the finish — what to celebrate after a workout, the recap
> redone, "How did that feel?"): read §69 first.** All four phases are built
> and verified in three time zones; nothing has been seen on a screen. §73
> lists where the code overruled the brief, and §78 is the one thing to carry
> forward: a field on a workout record survives an edit only if the edit
> carries it. The v53 section is at the end.
>
> **rack-v49 (Coach trainer, stages two and three — plateau or cut, the card
> and the goal): read §49 first.** Both phases are built and verified; nothing
> has been seen on a screen. §52 lists the rules the build corrected on the
> way, each with the case that forced it. The v49 section is at the end.
>
> **rack-v48 (Coach trainer, stage one — targets): read §40 first.** It is the
> one place that run changed a rule of the brief's algorithm — sets past twelve
> reps count as twelve in the estimated-max series, because leaving them out let
> one rep fewer turn a hold into a jump — and what it did not finish. The v48
> section is at the end of this file.

Written at the end of the ship-one run in `~/dev/ship-v42`, against
`COACH-PROMPT.md`. Shipped as `rack-v42`.

Read §1 first. It is the honest summary of what is not finished.

---

## 1. WHAT IS NOT DONE

Everything in §13's priority order got built. Nothing in the ship-one scope was
dropped. What follows is the list of places where what was built is **narrower
than the brief asked for**, or where I made a call the brief did not authorise.
Each one is argued below and each one is in BACKLOG.md.

1. **`log.confidence === 'empty'` does not cross-check the `history` index.**
   §3.2 asks for `readExact` resolving null/`{}` **AND** an empty history index.
   Only the first half is implemented. The second costs a whole extra node read
   (`history` is up to 20 rows per exercise) and cannot change an outcome: with
   no sessions, every rule downstream is gated silent either way, and the only
   difference is which of two silent states gets named. If the cross-check was
   there to catch a corrupt account — `workouts` wiped but `history` intact —
   it would change the wording of a card and nothing else.

2. **`coach-data.js` reads the `workouts` tree a second time at boot**, and
   again whenever a session is written, edited or deleted. The You tab already
   reads it through `analytics.allSessions()`; Coach reads it with `readExact()`
   because that is the only read that tells "absent" from "unreachable". One
   extra whole-tree GET per app open plus one per training-log write, and none
   per paint — every other way Coach stays current takes what a caller has
   already read (§3.9). The
   honest fix is a seam on `analytics.loadAll()` that accepts an
   already-read tree, and that is an edit to the file every training screen
   depends on — out of scope for a run that was told not to wander.

3. **`coach-tags.js` is inert.** 231 exercises, four closed dimensions, fully
   verified, and nothing reads it. That is what §4 asked for, and it is said
   here because "built and unread" reads like an oversight in a list of
   deliverables. Ship two consumes it.

4. **The brief's agreement rule for `hinge` was not implementable and I changed
   it.** See §4.1.

5. **No text input**, which §8.3 explicitly scopes out. The router is keyed on
   ids, every button in the sheet exercises it, and `ROUTE_IDS` is exported so
   ship three's matcher has one list to map a sentence onto. The injury refusal
   (`coach_not_injuries`) is registered and reachable by id, unreachable by any
   button, and waiting for the box — building the seam now is what stops the
   first thing anybody types falling through to a training answer.

6. **I could not run the app in a browser, and the CSS has not been seen.**
   Everything else was executed: the engine under Node against fixtures, the
   card and the sheet against a minimal DOM shim (they build, they answer, they
   tap through, and nothing in them throws), and 19 verifiers. What is left
   unverified is entirely visual — the 190 px budget under Archivo's real
   metrics, `-webkit-line-clamp`, the half-width labels, the sheet height and
   the switch. §6 is the full list. It is the largest single risk in this ship
   and it is repeated in the handoff.

---

## 2. WHAT GOT BUILT

Four new modules, six new verifiers, four edited files, one version bump.

```
coach.js        2,053 lines   PURE. Facts, intents, responses, router.
coach-tags.js     369 lines   PURE. The sidecar. Inert until ship two.
coach-data.js     333 lines   IMPURE, web-only. The gatherer the port rewrites.
coach-ui.js       380 lines   The card, the sheet, the Settings switches.

tools-check/coach-tags.mjs      39 checks
tools-check/coach-registry.mjs  51 checks
tools-check/coach-rank.mjs      58 checks
tools-check/coach-pure.mjs      49 checks
tools-check/coach-units.mjs     47 checks
tools-check/coach-silence.mjs   90 checks

you.js       the card, under the hero, above the since-line
workout.js   the card above Start workout; Routines/Exercises as a half-width pair
settings.js  a Coach section after Train
rack.css     the card, the sheet, the switch, one word added to .btn-split
sw.js        rack-v41 -> rack-v42
usage.js     rack-v41 -> rack-v42
```

`database.rules.json` is byte-identical to rack-v41 and needs no change. That
was §3.1's whole point and it held: `settings` carries a section-level `.write`
and the `$other` deny is nested inside `units`, not on `settings` itself.

Every intent in §7 is registered and every one of them is DRIVEN to fire in
`coach-silence.mjs` — empty, thin, and enough — so there is no rule in the
registry that nobody has proved can speak.

### coach-ui.js is a fourth module the brief did not name

§2 names three. The card is drawn on two tabs and the sheet is opened from
three places (both cards, and a Settings row), so the alternative was the same
380 lines in `you.js` and `workout.js` twice over. It is DOM only; it holds the
contract in §4 of NEXT-NATIVE-V42.md and nothing else.

---

## 3. WHAT I CHANGED MY MIND ABOUT

### 3.1 The reason line takes ONE clause, not two

§2 says facts carry a `because` and the card has a reason line, and the obvious
build is to join the becauses of every fact the finding quoted. I built that,
drove it, and it stuttered:

```
finding   1,400 kcal left today against your 2,300 target.
reason    900 kcal logged against a 2,300 target; your daily target is 2,300 kcal.
```

The second clause is almost always the denominator the sentence above has
already named. So the composed reason is now the FIRST resolved `because` and
nothing else, `factsNeeded` is ordered so the first entry is the one that
becomes the reason, and an intent that genuinely wants two writes its own
`reason` and says exactly which two. Five do.

### 3.2 The greeting drops a data line whose topic matches the finding

§9 says the greeting must never contradict the finding. It does not say
anything about repeating it, and the first build happily printed:

```
greeting  16 days since chest.
finding   16 days since your last working set for chest.
```

Not a contradiction; a stutter, and worse than either line alone. A greeting now
carries a `topic` and one whose topic matches the finding's category is dropped
with the warm ones. The cost is that the most apt data lines are suppressed
exactly when they would be most apt, so the pool gained five more in other
topics — a trend direction, food logged, steps ahead — to keep a data line
winning often.

### 3.3 `train_today_recommendation` carries its number in the headline

It read *"If you train today, your chest and shoulders day has waited longest"*
with the days in the reason underneath. `coach-silence.mjs`'s "every finding
carries its number" check failed it, and §5.4 is unambiguous — **every sentence
carries its number** — so the number moved into the headline and the reason now
carries the median and the recurrence count instead. The check was right and the
sentence is better.

### 3.4 An unresolved exId falls back to the RECORD, not straight to non-cardio

§3.3 says: resolve equipment from the merged effective library, and when an exId
no longer resolves, treat it as non-cardio rather than dropping the session. I
resolve from the library first and, when the id does not resolve, fall back to
what the session record itself stored (`ex.group`, `ex.equipment`) before
treating it as non-cardio.

The reasoning: those fields are what the app wrote at the time, they are right
there, and using them means a deleted custom CARDIO exercise is still correctly
excluded from a session signature rather than silently counted as lifting. The
brief's fallback was there to stop a deleted exercise erasing the session it was
in; this does that and one thing more. Same for `group`.

### 3.5 `card_state_locked` is a state, and the count rides in the lead row

§7 describes it as "free account: one real finding + what Pro adds", which is
two things in one card slot and the card has one. So:

- If a free finding survives the ranking, it renders normally and the **lead
  question row** becomes "N more with Pro". The lock in the corner already says
  there is something there; that row is the only place with room to say how
  much.
- `card_state_locked` fires as a STATE only when no free finding survives and
  Pro findings were dropped. Then it is the whole card.

`lockedCount` is exposed either way, and `coach-rank.mjs` checks that muting a
category reduces it — somebody who switched a category off is not being sold it
back.

### 3.6 An unreadable log silences the ROUTER as well as the card

§3.2 says "Coach says nothing but `guard_log_unreadable`. No other rule may
evaluate." I nearly scoped that to the card, on the grounds that a failed
`workouts` read does not make the weight data wrong.

It does, indirectly, and that is why the brief is right. When
`readExact('workouts')` rejects, the device is offline or has lost access — and
everything else `coach-data.js` gathered came back through `read()`, which
answers from a possibly stale localStorage mirror. Quoting a calorie total off a
mirror while saying in the same sheet that the log cannot be read is a mixture
of confidences with a wrong one in it. Every route returns the guard.

### 3.7 Coach's question is stamped when it is SHOWN, and expires

§7's gate is "at most one unanswered question live". Built literally, `asked`
was only ever written alongside an answer, which made the gate inert and left
`markAsked()` dead. Now the sheet stamps `asked` the moment the question is on
screen, and `coach.openQuestion` only counts a stamp inside a seven-day window.

Somebody who opened the sheet looking for something else and closed it has not
refused the question. Asking again next week is right; asking again tomorrow is
nagging. The whole difference is in that constant.

### 3.8 A new switch component, which house style would rather I did not add

The brief says reuse the existing components, and for the Train pair I did —
`.btn-split`, the same one Fuel uses. For Settings there was nothing to reuse:
the app's only binary control is `segmented()`, and seven segmented pairs
stacked in a sheet is a wall rather than a settings screen. `.tog` is 18 lines
of CSS. It is the one new component in this ship.

### 3.9 The snapshot needed a way to stay current, and §11 gave it one

§11 says: *Coach must not add per-render reads. Compute from what's already
loaded.* I read that as "gather once at boot" and built exactly that — and then
realised the app outlives a great deal. Finish a workout and the card above
Start workout still says *16 days since chest*. Log a weigh-in and it still says
*9 days since your last weigh-in*. That is a wrong number on the screen the app
opens on, which is the one thing nothing in Coach may be.

The second half of §11's sentence is the answer. Three hooks:

- **`noteCoachSessions(list)`** — `you.js`'s `refreshSessions()` already asks
  analytics for the sessions again on every return to the tab and only repaints
  when the fingerprint moved. Handing that list over costs nothing.
- **`noteCoachData({ entries, targets, summaries, stepDays })`** — the same
  bargain for the four small nodes `refreshLogged()` has just re-read. Zero
  extra requests, and Coach's numbers end up exactly as fresh as the ones drawn
  underneath them rather than being a second opinion about the same nodes.
- **`refreshCoachSessions()`** — the one that does cost a read, at the two
  moments worth paying for: a session landing, and a session being edited,
  moved or deleted. Coalesced, because moving a session between months writes
  two whole months.

Two details that are the whole point:

- **`noteCoachSessions` refuses an empty list.** `allSessions()` resolves `[]`
  on a FAILED read as well as on an empty log, so accepting one would let Coach
  learn "empty" through the exact path that cannot tell it from "unreachable" —
  undoing `log.confidence` from the inside. The cost is that a log emptied to
  zero inside one app open keeps its last snapshot until the next; deleting
  every session you have ever logged is rare, and a stale finding is a much
  smaller wrong than card_first_run in front of somebody with a year of
  training.
- **A failed REFRESH keeps the last good snapshot** rather than flipping to
  `unknown`. At init a failed read means Coach has never seen the log and must
  say so; on a refresh it has seen it, successfully, this session, and replacing
  a real finding with "can't read your training log" over one flaky request is
  the worse answer.

This is also the one place I had to touch a pre-existing verifier.
`month-erasure.mjs` builds `saveMonth` and `finishWorkout` out of lifted source
against an explicit stub list, so a new collaborator inside them is an undefined
identifier. `refreshCoachSessions` was added to that list, beside `invalidate`
and `render`, for the same reason they are there: that file is about month
erasure, and what a card does afterwards is somebody else's verifier.

### 3.10 `you.js` does NOT import `workout.js`

I wired `hasActiveSession()` in, and then found the README's stated invariant —
*"`you.js` imports none of the four tab modules… nothing on the screen the app
opens on depends on another tab's module state, or on the order the four of them
initialised in"* — and realised the import was not merely against style, it was
a **bug**. `session` is `workout.js` module state, filled by `initWorkout()`,
and `app.js` starts `initYou()` BEFORE it. The first paint of the opening screen
would have read "no session running" with one parked on the device.

The You card asks the DEVICE (`activeSession` in localStorage, where a live
session lives until it is saved; `persistSession()` never writes an edit session
there). The Train card passes `workout.js`'s own answer in, because there that
module is the authority. It is its own commit.

---

## 4. WHERE THE BRIEF WAS WRONG ABOUT THE CODE

Four places. Everything else in it checked out against the source, including
every line reference I used.

### 4.1 §4's group-agreement rule fails seventeen correct rows

> *anything tagged `squat`, `hinge` or `lunge` whose group is not `legs` … Print
> disagreements as failures, not warnings.*

`exercises.js` files **every deadlift, Romanian deadlift, good morning, back
extension, reverse hyperextension and glute-ham raise under `back`**, not legs.
They are hip hinges. A verifier written to that sentence fails seventeen
correctly tagged rows.

The agreement table in `coach-tags.js` is explicit and exported, and it allows
`hinge` on back as well as legs. `squat` and `lunge` really are legs-only and
the verifier enforces that exactly as written. `press`/`fly` is `chest,
shoulders, arms` rather than `chest, shoulders`, because `JM Press` and
`Diamond Push-Up` are filed under arms — both are tagged `extension` in the end,
but `Close-Grip Bench Press` (chest) and the arms-filed dips needed the room.

### 4.2 §5.5's "keep the existing not-medical-advice framing" — there isn't one

Grepped for it. There is no not-medical-advice line anywhere in the app: not in
`you.js`, not in `insights.js`, not in onboarding. The nearest thing is
`food.js`'s explanation that a setup maintenance figure is "a formula, not a
measurement".

So there was nothing to keep and nothing to weaken. §8.3's line is new, at the
foot of the COACH ME sheet, and it says what Coach reads and what it is not.
`coach-silence.mjs` scans every sentence the engine can produce, in both units,
against a list of things it may never say — an instruction about eating, a
population norm, a healthy range, a max attempt, medicine, and the specific
generalisation at `insights.js:284`.

### 4.3 §8.1's card anatomy has four content slots, not three

§6 says three slots — greeting, finding, lead question. §8.1's anatomy lists
the rotating line, the finding, **the reason line**, and the COACH ME row. The
reason line is a fourth thing and the brief never says where the lead question
goes.

It rides in the COACH ME row: `COACH ME · what should I train? ›`. That is the
only place in a 190-pixel box with room for it, and it makes the row say what
tapping the card does rather than merely that it does something.

### 4.4 §7's `weekly_sessions_vs_trailing` note about `insights.js:309`

> *do NOT adopt insights.js:309's fixed bar of 3.*

`insights.js:309` is `if (thisWk.sessions != null) {`. The fixed bar of 3 is
further down in that block. The instruction is right and is followed — Coach's
denominator is the account's own trailing four weeks and the sentence names it
out loud — but the line number points at the wrapper, not the bar.

---

## 5. EVERY ASSUMPTION I MADE

Listed because an assumption nobody wrote down is a decision nobody can review.

1. **Pro is `capabilities().features.advanced === true`.** `accounts.js`
   `FEATURES` has exactly one entry and `pro`, `trial`, `custom` and `owner` all
   get it. Coach reads it through `access.js`'s cached answer, which fails open
   to basic — so a record that could not be read gets the readouts and not the
   comparisons, never a locked-out card.

2. **Which findings are free.** The brief does not say. I split it as *readouts
   are free, comparisons against your own history are Pro*:
   free — `weekly_sessions_vs_trailing`, `recent_pr`, `returning_from_layoff`,
   `fuel_calories_left_today`, `weight_no_recent_weighin`,
   `steps_today_vs_trailing`; Pro — everything else.
   `returning_from_layoff` is free deliberately: it is a welcome, and an account
   coming back after a month should not be met with a lock.

3. **The thresholds.** Every number below is a judgement, none is printed, and
   all of them are in one place at the top of `coach.js`:
   - `WINDOW_DAYS = 84` — §3.3's, stated.
   - `RATE_BAND_LB = 1.5` — §5.1 says "beyond a sane weekly rate" and does not
     name one. Pounds, and it stays pounds: a bar that moved when somebody
     switched to kilos would give two accounts changing at the same speed
     different readings.
   - `OVERDUE_MARGIN_DAYS = 2` and `OVERDUE_RATIO = 1.4` — §7 says a group is
     overdue when days-since "exceeds its own median gap". Strictly, nine days
     against a median of eight qualifies, and that is noise that would crowd a
     real finding out of the band. Both halves are needed: the ratio alone makes
     a group trained every other day overdue at three, the margin alone makes a
     group trained monthly overdue every month.
   - `ASK_COOLDOWN_DAYS = 7` — §3.7 above.
   - Under-volume fires below 60% of the trailing normal, with at least three
     sets a week of history behind it. Over-use fires at twice the expected
     frequency and at least five days in a fortnight. A stall is three sessions
     with nothing beating the best, out of at least four, the last inside six
     weeks.

4. **Signature clustering merges against the cluster's REPRESENTATIVE.** §3.3
   says "two signatures merge when their symmetric difference is <= 1" and does
   not say against what. Merging against any MEMBER chains: A merges with B, B
   with C, and A and C are two groups apart. Three hops and every session in the
   window is one blob called "a whole-body day". The representative is the most
   common signature in the cluster, which is also what names it.

5. **Session-level `startedAt` orders everything; `_date` counts days.** Whole-day
   distances are measured between NOON anchors, the way `ui.js parseKey()`
   anchors a date key, so a clock change cannot turn a seven-day gap into six
   and three quarters.

6. **A group counts as trained at ONE working set for recency, and TWO for a
   session signature.** §3.3 specifies two for the signature. Recency is mine: a
   group you touched three days ago is not a group you have not trained.

7. **`recent_pr` is derived from `exerciseIndex` rather than by running
   `detectPRs` per session.** The index already holds the same three bests
   `detectPRs` compares against, keyed the same way, and walking it once is the
   difference between one pass and one per session. The kinds are `detectPRs`'
   kinds.

8. **The rotation seed is the app open, captured once in `coach-data.js`.** Not
   the clock — the You tab repaints four or five times as its loads land.

9. **`lastGreet` is written once per app open, from the You card only.** Both
   cards rotating would burn two lines per open and make the pool feel half the
   size it is.

10. **Settings writes are serialised and read-merge-write.** Two quick taps in
    the sheet cannot interleave one's read with the other's write. A node this
    device has never read cleanly is never overwritten whole — the write is
    refused and the switch flips back.

11. **The card is the whole tap target**, not just the COACH ME row. A
    190-pixel box with one live corner is a box most people never tap.

12. **Steps has no preset bubble** (§8.3) and is reachable as a follow-up off
    Weight. `topic_steps` exists in the router and is not in `TOPICS`.

---

## 6. WHAT I DROVE, AND WHAT I DID NOT

**Driven under Node, against the real modules with `store.js` stubbed:** every
fact, every intent, every response, the router, the ranking tuple, the greeting
pool, the question gate, the settings normaliser, and the tag sidecar. 334
checks across six new verifiers, plus the 13 pre-existing ones. Every sentence
the engine can produce is rendered twice, once imperial and once metric, and
compared.

**Driven against a minimal DOM shim**, which is the first time `coach-ui.js`
had ever been executed: the skeleton card, the loaded You card, the tight Train
card, the live-session card and its tap into Train, the whole COACH ME sheet
tapped through six bubbles deep, the seven Settings switches, a brand-new
account, and a metric account checked for the word `lb`. Four things came out of
it and all four are fixed — the skeleton was drawing an OPEN padlock before it
knew the tier, the Train card was offering the You card's lead question ("How's
my food?" beside Start workout), a brand-new account was being invited to ask a
question Coach could only answer with "nothing yet", and the tight card needed
its own bottom row.

**Not driven, because there is no browser here — all of it visual:**

- The card's 190 px budget. The arithmetic says 183 px of content at the stated
  font sizes and line heights, with `margin-top: auto` pinning the bottom row
  and `overflow: hidden` on a fixed height making a reflow impossible — but the
  Archivo variable font's real metrics are not in that sum.
- `-webkit-line-clamp` on the finding and reason lines. It is what the app uses
  nowhere else; every other clamp in `rack.css` is a single-line ellipsis.
- The Train pair's labels at half width. `Routines` and `Exercises` in the
  standard `.btn` size (14px, not `btn-lg`), with `min-width: 0` added to
  `.btn-split > .btn` so a long label ellipses inside its half rather than
  pushing its neighbour off the edge. That one word also affects Fuel's
  Copy JSON / Log on today pair, which is strictly an improvement there.
- The sheet at `92dvh`, one step taller than the standard `86dvh`.
- The switch, and its 18 px thumb travel.

---

## 7. THE THINGS I FOUND AND DID NOT FIX

All nine of §11's, plus what this ship added, are written up in BACKLOG.md under
*What v42 left open in its own work*. The short version:

- `insights.js` `rateVerdict()` has no magnitude guard. Coach does not inherit
  it; fixing it is a separate change because both the You and Weight tabs colour
  numbers from it.
- `insights.js:284`'s population claim and `insights.js:541-551`'s prescriptive
  takeaways: shipped copy untouched, pattern not extended.
- `store.js` `read()` folds absent into unreachable; `mergeUpdate()` swallows
  PERMISSION_DENIED. Coach routes around both.
- `exerciseIndex` gives a warm-ups-only exercise `sessions: 0` and every best at
  0. Coach skips those.
- `record.groups` counts warm-ups. Coach never reads it.
- A second session in one day is invisible to the live-session facts. Ship three.
- The You tab's ~7 live GETs per render. Coach adds none per paint and does not
  improve the number.
- Water is a whole domain Coach does not cover. Deliberate.

---

## 8. THE SIX TRAPS THIS RUN ACTUALLY HIT

Every one of these is a thing the native port will meet.

1. **`window` is a legal identifier in a module and shadows the global.** A
   private derivation was called `window()` and worked. It is `inWindow()` now
   and `coach-pure.mjs` refuses the word outright.
2. **A `because` string can leak stored pounds into a reason line.** Two did.
   The reason line is as visible as the finding above it and it was the one
   place the units discipline had no habit behind it. `coach-units.mjs` now
   checks fact bodies, not just response templates.
3. **`plural(n, word)` on a pre-formatted string always pluralises.** `one(1)`
   returns the STRING `'1'` and `'1' === 1` is false, so a median gap of one day
   read "1 days".
4. **A verifier can assert something false to look stricter.** "Every pulldown
   is compound" failed on the Straight-Arm Pulldown, which is shoulder extension
   with a locked elbow and genuinely IS isolation. The tag was right and the
   check was wrong. The exception is named in the verifier now, so a later pass
   that tidies it has to argue with a line rather than with a silent rule.
5. **A verifier that flags its own subject's comments teaches people to delete
   the comments.** Three checks in `coach-pure.mjs` failed on `coach.js`'s
   header explaining why it does NOT import `store.js`.
6. **`markAsked()` was dead and the gate it fed was inert.** Building §7's
   question gate literally produced a fact that was always null. §3.7.

---

## 9. IF THE NEXT RUN READS ONE THING

`NEXT-NATIVE-V42.md` §3, the two three-valued fields. `log` and `targetsSet` are
`true | false | null`, and the `null` is the whole point of both of them. Fold
either into `false` and Coach starts telling people with two hundred sessions
that their log is empty, or telling people with a year of targets that they have
none. Everything else in this ship is arithmetic; those two are the judgement.

---
---

# COACH — the fix run (rack-v43)

A second, short run in `~/dev/ship-v42`, against `COACH-FIX-PROMPT.md`, with
`COACH-PROMPT.md` still governing the house rules. Everything above this line is
the ship-one report and is unchanged; this is appended to it rather than
replacing it, because several things it says turned out to be wrong and the
record of having believed them is the useful part.

Coach had been live for nine accounts. **Every defect below was found on the
real deployment**, most of them by driving the live site. None of it was
speculative, and none of it was found by a verifier — which is the first thing
worth writing down.

---

## 10. WHAT IS NOT DONE

Everything in the fix brief's priority order got built: §1 and §3 first, then
§5, then §2, §4 and §6. Nothing in scope was dropped. What is narrower than
asked, or decided differently:

1. **§2 did not get a "render what is available as soon as it is available"
   staging that actually pays for itself.** It got built and it is correct, but
   see §11.1 — in the ordinary case it buys nothing, and saying otherwise would
   be exactly the kind of claimed win this report exists to refuse.
2. **The card's geometry is still not fenced by anything that runs.** The new
   DOM shim can drive `coach-ui.js`, but it never loads `rack.css` and has no
   box model, so the fixed 190px, the 164px tight form and the centring are
   verified by arithmetic and by eye. A regression that made the card resize
   would ship green. In BACKLOG.md.
3. **`resp_group_overused` still has "you" as its grammatical subject** —
   *"You've trained chest on 7 days in the last two weeks."* Under the strictest
   reading of "Coach describes the numbers, never the person" it is the closest
   remaining sibling of the stall. I left it. It is a count of logged sets with
   no verdict attached, second person is the voice of the whole app, and
   rewriting every "you" in the response table would be a reformat rather than a
   fix. Named here so the next run can disagree with a line rather than with a
   silent decision.
4. **`coachToggleRows` still waits for the whole snapshot** before drawing the
   Settings → Coach switches, when its own node lands in the first wave. It is a
   one-line change and I did not make it: that sheet is opened by a tap, long
   after boot, so the wait is already over by the time anybody sees it.

---

## 11. WHERE THE FIX BRIEF WAS WRONG ABOUT THE CODE

The brief was written from the live site and from a read of the source, and it
was right about every defect. Four things in it were wrong about the mechanism.

### 11.1 §2's diagnosis was half right, and the half that was wrong is the half that mattered

> *"`coachReady()` currently gates on everything, including the whole-tree
> `readExact` that `log.confidence` needs. Render what is available as soon as it
> is available."*

The first sentence is true. The second cannot help, and it is worth being
precise about why: **the whole-tree read is the slowest of the seven and it is
the one that gates every sentence Coach has.** Staging around it means waiting
for it anyway. `logKnown` and `ready` flip in the same tick on any normal
connection.

The three seconds were two other things, and neither is in the brief:

1. **Four awaited round trips in a row inside `load()`**, none of which needed an
   answer from the one before it.
2. **`initCoachData()` was called from `loadHeavy()`, at the *end* of
   `initYou()`** — after that screen's own eight-node wave *and* after
   `await refreshModel(entries)`. Coach's reads did not leave the device until
   two awaited stages had already finished.

The staged readiness got built anyway and is kept, because it is cheap, correct,
and is the right shape for the tail case where a small node stalls behind the
tree — and because native's store may well have the opposite cost profile. But
it is a guard, not the fix.

### 11.2 §4 said the surface "never travels into the sheet". It travels; it was never read

`coachCard` passes its whole `opts` object into `openCoachSheet(opts)` and
`opts.tight` was sitting in it the entire time. The wiring existed and nothing
read it. Cheaper fix than the brief expected, and worth knowing because it means
the same latent shape may exist elsewhere.

### 11.3 §5's third part, taken literally, would have broken a shipped verifier

> *"On a deficit it stays quiet, or says something different."*

Taking the first option — gating `when` on `weight.goalDir` — breaks
`tools-check/coach-silence.mjs`, whose rich fixture carries `goalDir: -1` and
asserts that `stalled_lift` **does** fire once there is enough data. I took the
second option, branching inside the template. It touches no verifier, and it is
the better answer anyway: somebody who tapped "Anything stalled?" has asked a
direct question and is owed an answer rather than a silence.

### 11.4 The stall's reason line was a second accusation and the brief does not mention it

`resp_stalled`'s composed reason came from `lift.stalled.because`, which read
*"across the last 3 sessions of it, no working set has beaten that"*. Rewording
only the headline would have left that sentence rendering directly underneath
the new neutral one. It is a readout now.

---

## 12. THE SIX DEFECTS, AND WHAT EACH ONE ACTUALLY WAS

### §1 The rotation was a hash of the wall clock

`rotate(seed, n)` was `Math.abs(Math.floor(seed / 1000)) % n` on `openMs`. That
is the second somebody happened to open the app, modulo the pool size. A hash
repeats; a rotation does not. Three consecutive reloads on the live site gave an
identical greeting *and* an identical lead question.

It is a per-device open counter now, arriving on `d.input.opens` exactly as
`now` does, so `coach.js` stays byte-copyable. `coach-pure.mjs` refuses the
identifier `openMs` outright and refuses `seed / 1000`, so no caller can hand a
clock back.

**The pool collapse was the more interesting half.** `pickGreeting` narrowed
with `const from = data.length ? data : pool;` — so an open where exactly one
data-aware line passed its gate had a pool of one, and `n % 1` is always 0. That
card said the same thing every open forever, and no amount of fixing the seed
would have moved it. Data lines are ordered first and generics after, and the
counter walks the whole ordered pool.

**`lastGreet` moved to device storage and became three ids.** The argument in
the brief is right and is worth restating because it generalises: the write
happens as the app opens, and the app is very often closed a second or two
later, so an async database write fired at that moment dies with the page —
which is precisely the usage pattern the value exists to serve. It costs a
repeated greeting when it is wrong, never a wrong number, which is what makes it
allowed to be device-local at all.

Three rather than one because the eligible pool changes size between opens as
gates start and stop passing, and a counter modulo a pool that shrank can land
back on the line before it. The counter is the rotation; the list is the guard
the counter cannot be.

### §2 The card was blank because its reads had not started

Covered in §11.1. What shipped: all seven reads go out in one wave, and
`initCoachData()` is called before the first await in both `initYou()` and
`initWorkout()`.

**Round-trip depth, which is the honest measurement** — wall-clock seconds in a
Node harness would measure nothing real, since there is no network, no Firebase
connection setup and no paint:

```
                                            before   after
serial round trips inside load()               4        1
elapsed, as a multiple of one read's latency   4.10x    1.05x
awaited stages in front of load()              2        0
serial round trips, app boot -> Coach ready    7        3
```

The first three rows are **measured**, by `tools-check/coach-boot.mjs` against a
store stub with a fixed per-read latency, counting waves — a wave being a
transition of in-flight reads from none to some. Wall-clock seconds in a Node
harness would measure nothing real (no network, no Firebase connection setup, no
paint), so depth is the honest instrument and it is machine-independent. The
before figures come from running the same harness against a copy of v42's
`load()`, which also served as the mutation proof; it fails nine checks and
prints `4 waves: 1:workouts, 2:food/targets, 3:settings/coach, 4:...`.

The last row is arithmetic over the boot path rather than a measurement. Its two
leading round trips are `initUnits()` and `onboardingState()` in `app.js`, which
Coach cannot and should not avoid. **What Coach controls went from 5 to 1.**

The observed 1s and 2s live readings were taken on a phone against a real
database and this report cannot reproduce them. Nothing here should be read as
"the card now appears in 250ms" — it should be read as "Coach's boot cost four
round trips and now costs one, and it starts two stages earlier than it did".

### §3 The tier gate was cosmetic

`openCoachSheet` never read `c.pro`. The lock rendered correctly and the sheet
behind it ignored it, so a basic account tapped the card and got everything.

A basic account now gets the one free finding — the opening bubble, which is
already tier-filtered by `rank()` — and a panel in place of the topic chips.
**The panel's list is derived from the intent table's own tiers** (`PRO_ADDS`)
rather than written out beside it, because a hand-written list of what somebody
is not getting is the kind of sentence that goes quietly untrue the first time
an intent changes tier, and an untrue sentence about what is behind a lock is
worse than no lock.

**No purchase flow, and I want to be clear this was a decision and not an
omission.** Rack has no payment path. An Upgrade button would go nowhere, and a
button that does nothing turns a clear boundary into a broken feature. The panel
says what Pro adds and that it is not on sale while the app is invite-only, and
there is one marked seam where the real flow drops in.

It remains a display gate, defeatable by reading the bundle. That is said
plainly in the source rather than dressed up.

### §4 The sheet did not know which card opened it

Train gets `TRAIN_TOPICS`: what to train today, what has waited longest, how the
week is going. Every id in it is one the router already answered — these are
promotions, not new routes, so a bubble that cannot be answered is not
constructible. Each is offered only when its own route actually fires, and the
set falls back to the general three when none of them does, because a sheet with
no way to ask anything is worse than a broader question.

`coach().topics` became `coach().topicsFor(surface)`. No placeholder for the
builder, and none for anything else.

### §5 The stall read as an accusation

Three things wrong and all three fixed: the surface (`['sheet']`), the sentence
(a figure and when it was last matched), and the reading (it says something
different when the account's own goal direction is down and the weight has
actually been falling — a flat estimated max through a deficit is a lift held).

**And it became a rule.** At the head of `RESPONSES`:

> An unprompted finding is neutral or actionable, never a judgement.
> Coach describes the numbers, never the person.

`tools-check/coach-voice.mjs` enforces it over every template and every
`because` string a card can reach, in source text and in rendered output.

**The ban carries no exemption list, deliberately.** The sweep found five
sentences using a banned word in honest temporal or scoping work — "Everything
else in the app still works", "working sets only", and so on. Every one of them
was rewritten rather than exempted. A rule with five exceptions is a rule nobody
keeps true, and the rewrites cost nothing.

Siblings the sweep caught, none of which the brief named:
- `resp_state_clear`'s reason said *"lifts that have stopped moving"* — the same
  construction, on the most-seen card state in the app.
- `lift.stalled.because` — §11.4.
- `group.underWeekly.because` and `group.setsThisWeek.because` both said
  "working sets only".
- `resp_log_unreadable`'s reason used "failed" and "still".
- Two strings in `coach-ui.js` itself, which no template sweep would have seen.

### §6 The short-finding gap

`.coach-card` is a flex column and `.coach-go` carried `margin-top: auto`, which
absorbs **all** the positive free space into one lump. With a one-line finding
and a one-line reason that is 41px by arithmetic and 44px as measured — a void
above a pinned tap target, which reads as a render that failed.

The fix is one declaration: `margin-bottom: auto` on `.coach-hd`. Flexbox splits
free space equally between every auto margin on the main axis, so two of them
put half the slack above the greeting and half above the row. The card's height
is not touched and cannot be: that guarantee is the whole point of the box.

I built a wrapper `<div>` for this first and threw it away when the arithmetic
showed a one-line CSS change did the same job. `justify-content: center` would
have been a silent no-op — auto margins consume free space before
`justify-content` is consulted.

---

## 13. WHAT THE AUDIT CAUGHT THAT I HAD GOT WRONG

Three real bugs in my own first pass at §2, none of which any verifier would
have caught:

1. **Nothing repainted at the `logKnown` boundary.** Both tabs hung one repaint
   off the full load, so the earlier readiness was a flag nothing read. There is
   a promise for it now and both tabs attach to it.
2. **The greeting could change under the reader's thumb.** Four greeting lines
   gate on weigh-ins, food or steps, which arrive after the log, so the eligible
   pool genuinely grows between the two paints and the counter lands elsewhere.
   Worse: `rememberGreeting()` fires on the first paint, so it recorded the line
   that flashed rather than the one the reader read — and the *next* open then
   avoided the wrong id, which is precisely what §1 exists to fix. The first
   line chosen is now pinned for the app open, in the view layer, which keeps
   `coach.js` pure.
3. **"N more with Pro" could go up while somebody was reading it.** Three of the
   ten Pro findings read food and weight, so at the log phase the count is
   genuinely "at least N". It waits for the full snapshot now.

---

## 14. THINGS THAT WERE FINE AND WERE LEFT ALONE

Checked, confirmed, untouched, per §7 of the fix brief: the lead question never
truncates, the card holds 190px with no overflow, the Train pair is correct, the
switches persist and filter, and the locks render the right way round.

---

## 14b. THE FOUR NEW VERIFIERS, AND WHAT EACH ONE COST TO BUILD

23 files under `tools-check/` now, all exiting 0.

| | |
|---|---|
| `coach-rotation.mjs` | 57 checks. The brief's property on four pool sizes, and from a counter mid-life rather than only from zero. Drives `coach-data.js` across real module instances, which is what closing the app and opening it again actually is. |
| `coach-voice.mjs` | 42 checks. Source text and rendered output, both units, plus the card copy written in `coach-ui.js` rather than in a template. |
| `coach-surface.mjs` | 35 checks. The first thing in this repo that drives a view layer at all. |
| `coach-boot.mjs` | 42 checks, including three that verify its own wave counter can count past one. |

Two things about them worth keeping:

**`coach-rotation.mjs`'s first draft passed vacuously and that is instructive.**
It discovered each fixture's pool by asking the engine what it offered — which
is circular, because a broken rotation shrinks the pool it is then asked to
cover. Under the old clock arithmetic the "pool" became the four lines the
broken rotation happened to visit, and a check that "4 opens give 4 distinct
lines" went green. The pool is now the union of what the engine offered and a
floor derived from the real `GREETINGS` table: a line with no gate cannot fail
one, so it is eligible on any log. **A verifier that derives its expectation
from the thing under test proves nothing**, and this is the second time this
repo has hit that — the v42 report's trap 4 is the same shape.

**`coach-surface.mjs` is the one that would have caught §3 and §4.** Nothing
else could have: both bugs were a correct engine wired to a screen that did not
ask it the question. Reverting the tier branch takes six of its checks red;
making `topicsFor` ignore its argument takes the surface section red. It cannot
see layout — `rack.css` is never loaded and there is no box model — so §6 is
still verified by arithmetic and by eye, and that is in BACKLOG.md.

---

## 15. IF THE NEXT RUN READS ONE THING

Not the rotation — that is fixed and fenced. Read §11.1.

Every one of these six defects was live for nine accounts, and the verifier
suite was green the entire time. Nineteen verifiers, none of which could see a
greeting that repeated, a sheet that ignored a tier, or a card that sat on a
skeleton — because all nineteen tested the engine, and every one of these bugs
was in the wiring around it or in the time it took. The three new ones that
matter (`coach-rotation`, `coach-voice`, `coach-surface`) exist because of that,
and `coach-surface` is the important one: it is the first thing in this repo
that drives a view layer at all.

A pure engine is easy to fence and is not where the bugs were.

---
---

# COACH — the cache run (rack-v44)

A third run in `~/dev/ship-v42`, against `COACH-FIX2-PROMPT.md`, with
`COACH-PROMPT.md` §1 still governing the house rules. Everything above this line
is unchanged, including the parts of it this section contradicts — §19 is where
those are named rather than edited.

Two items, both shipped. One of them **cannot be proven by anything in this
repo** and is not pretended otherwise.

---

## 16. THE DEPLOY THAT DID NOT REACH A BROWSER

### 16.1 What it was

`sw.js`'s fetch handler was network-first: `fetch(e.request)`, cache only
through the `.catch()`. That `fetch` is itself answered out of the browser's own
HTTP cache, and GitHub Pages holds these assets for roughly ten minutes. So for
the first minutes after every ship the service worker faithfully fetched, served
and **re-cached the previous build**.

The version number stayed honest the whole time and that is what made it
invisible. Browsers deliberately bypass the HTTP cache when checking `sw.js`
itself, so the one file that carries the build string updated promptly while
every module behind it stayed stale. rack-v43 was observed reporting
`rack-v43` on an account executing rack-v42's `coach-data.js`.

The fix is one clause:

```js
const fresh = u.origin === self.location.origin && e.request.mode !== 'navigate';
e.respondWith((fresh ? fetch(e.request, { cache: 'no-cache' }) : fetch(e.request)).then(…
```

`no-cache` and not `reload`: a conditional request and a 304 is one cheap round
trip, where `reload` re-downloads every asset on every request. Same-origin
only, because four cross-origin hosts reach this handler — `www.gstatic.com`,
`fonts.gstatic.com`, `cdn.jsdelivr.net` (the ZXing barcode fallback) and
`world.openfoodfacts.org` — and the existing early return covers none of them.
It only knocks out Firebase, googleapis and `workers.dev`.

Three of the four are stored by it. The ZXing script is not, and that is worth
writing down because README.md had claimed otherwise since before this ship:
`food.js` loads it with a `<script>` tag, which is a no-cors request, so the
response is opaque with `status === 0` and the handler's `r.status===200` guard
never writes it. Barcode scanning on an iPhone has never worked offline.
Corrected in the README and logged in BACKLOG.md; not otherwise touched, because
it is not this ship.

`sw.js` also gained a header comment, the first it has carried since the v25–v28
revert. It is a minified one-liner and now three decisions live in it that
nothing else in the tree explains.

### 16.2 The offline fallback is unchanged, and here is the argument

The brief asks for this to be argued rather than asserted, so: the `.catch()` is
attached to the whole chain, not to the `then`. What changed is one argument to
`fetch`, inside the same expression, and a revalidating request fails exactly
the way a plain one does when there is no network — `fetch` rejects, the
`.catch()` fires, `caches.match(e.request)` answers, and a navigation that
misses still falls through to `caches.match('./index.html')`. The cache write is
still keyed on `e.request`, so nothing about what is stored or what answers
offline moved.

One real difference, and the review caught it after I had already written that
there wasn't one. A revalidating request needs the network by definition, so it
cannot be answered out of the HTTP cache the way a plain one can — and the
launch right after a bump is exactly when Cache Storage is empty, because
`activate` has just deleted the only cache there was. Offline in that window,
v43 served every module from the HTTP cache and repopulated the new cache off
the back of it; v44, as first written, served nothing. A blank app in a
basement, where the old one worked.

So the network leg retries plainly before it gives up:

```js
const net = fresh ? fetch(e.request, { cache: 'no-cache' }).catch(() => fetch(e.request))
                  : fetch(e.request);
```

Online the first leg answers and the retry never runs. Offline it costs one
rejected promise and restores exactly the fallback that was about to be lost.
There is no precache in this worker — `install` is `skipWaiting()` and nothing
else — so Cache Storage holds only what a successful fetch put there, which is
why the cold-cache window is real rather than theoretical.

### 16.3 What I did not do, and what it costs

**Navigations are excluded.** Handing `fetch()` any init at all makes it rebuild
the Request. The Fetch spec's Request constructor downgrades a navigate-mode
request to `same-origin` rather than throwing — but engines have thrown there
historically, and `fetch()` turns a constructor throw into a *rejected promise*,
which lands in the `.catch()`, which on the first launch after a version bump
finds a cache the `activate` handler has just emptied. That is a blank screen
rather than a stale file, on the one launch every ship has.

I could not test that in this environment: Node refuses to construct a
navigate-mode Request at all, so there is nothing local to check the downgrade
against. Weighing a spec recitation against a brickable app on nine phones, the
navigation now executes byte-identical code to rack-v43 and the question stops
mattering.

The cost is real and is in BACKLOG.md: **`index.html` is still served from the
HTTP cache for up to ten minutes after a ship.** Every module it loads is
revalidated, so this only bites on a ship where `index.html` itself changed.

### 16.4 What could not be measured here

Nothing. No verifier was written for this and none should be — it is observable
only against a real deploy, and a test that drove a stubbed `fetch` would be
fencing the stub. The live check is in DEPLOY.md now: fetch an app file twice,
once with a cache-busting query and once without, and confirm the two come back
identical. They did not, for ten minutes after every ship before this one.

---

## 17. THE GREETING, AND THE HOLE IN THE BRIEF'S OWN REASONING

### 17.1 The rule

Two or more data-aware lines passing their gates and the counter rotates inside
them; fewer than two and it falls through to the whole ordered pool, data first
and generics after. Two is the threshold because two is the smallest pool a
counter can rotate without repeating, and one data line is better read as an
account with nothing much to say yet than as a line to say twice.

That is the brief's suggested shape and it is two lines of code. It is also not
sufficient, which is the interesting half.

### 17.2 The brief's justification has a hole, and it is the old bug

> *rotate within the data lines alone — the counter still guarantees no repeat,
> because the pool has two or more members.*

That holds only while the pool does not change. The data-aware walk is two or
three lines wide on an ordinary log, against a `recentGreets` memory of three.
So **every candidate is recent**, the walk finds nowhere forward to step, and it
falls back on the counter's own index — which is exactly the index that collides
when the pool changed size between two opens. A day rolls over and takes the
food line; a third session drops *"Two sessions in already."*; the counter's
index on the new pool has no relationship to the one it used on the old.

Driven against the fixtures — every ordered pair of logs, 24 counters, one to
four warm-up opens carrying the real history:

| | repeats on consecutive opens |
|---|---|
| rack-v43 as shipped | 0 of 4,704 |
| the brief's shape as written | **26 of 4,704** |
| what shipped | 0 of 4,704 |

The first one found is `FULL → TWO` at opens 3/4: `g_trend_down`, then
`g_trend_down` again. Which is the defect rack-v43 existed to fix, reintroduced
by a different route.

### 17.3 The memory is read one line short of the pool

```js
const memory = recent.slice(0, Math.max(1, ordered.length - 1));
```

This is the load-bearing line of the two changes and it is not in the brief.
With it, the no-repeat property stops being a sample and becomes arithmetic: at
most one fewer than the pool is ever blocked, so a free candidate always exists
and the fall-through is unreachable; and the line just shown is `recent[0]`,
which is always inside the cap. **Nothing can follow itself**, on any pool of two
or more, whether or not the pool changed underneath it.

On a fall-through pool of seven or eight the cap is six or seven and the memory
is three, so it changes nothing there. rack-v43's behaviour on a thin log is
preserved exactly.

### 17.4 Before and after

Share of 60 consecutive opens that greeted with a real number, on the rotation
verifier's fixtures:

| the log | qualifying data lines | rack-v43 | rack-v44 |
|---|---|---|---|
| a brand-new account | 0 | 0% | 0% |
| a weight trend only | 1 | 13% | 13% |
| a trend and a day of food | 2 | 23% | 100% |
| a full log | 3 | 30% | 100% |
| the same, card muted | 3 | 30% | 100% |
| a caution card | 2 | 33% | 100% |
| a heavy day, steps up | 5 | 42% | 100% |

Longest run of consecutive generic lines went to 0 on every one of those except
the first two — from 7, or from 4 on the caution card, where three of the seven
generics are warm and withheld anyway. The live symptom was five in a row.

### 17.5 What this does not fix

**An account with one qualifying data line is unchanged**: roughly seven opens
in eight still open with a generic. One line cannot rotate against itself, and
making it try is exactly the rack-v42 collapse. If Micah's account is that
account, he will see no difference, and the honest way to find out is to open
the card and look at what the lines are about rather than at how often they
change. In BACKLOG.md.

**A walk of exactly two alternates.** *"The trend is pointing down."* then
*"Food already logged today."* then back. It never repeats and both lines say
something true, but a reader who opens the app four times in a minute sees a
cycle of two. The gates move day to day, which is what keeps it from being a
cycle of two for long, and the alternative — padding the walk with a generic to
widen it — spends a third of the opens on the thing the brief asked me to stop
spending them on.

### 17.6 The card pins its line before half the gates can pass, and that is
what Micah will actually see

The clearest thing the audit found, and it is a limit on the whole fix.

`coach-ui.js` pins the greeting at the first paint that has one, and that paint
is `logKnown` — `coach-data.js` sets it after `Promise.all([pLog, pSettings])`,
which is before `pRest` brings back food, weight and steps. Four of the ten
data-aware lines gate on exactly those late reads. So the line the card pins is
chosen from a smaller set than the one every measurement in §17.4 was taken
against, and the new threshold is tested against a set that may not have two in
it yet.

Driven at that paint rather than at the full snapshot:

| the log | at the pin (v43 → v44) | at the full snapshot |
|---|---|---|
| a trend and a day of food | 0% → 0% | 100% |
| a full log | 13% → 13% | 100% |
| the same, card muted | 27% → **100%** | 100% |
| a caution card | 20% → 20% | 100% |
| a heavy day, steps up | 27% → **100%** | 100% |

It comes down to which lines qualify. Six of the ten gate on the training log
alone — the overdue group, the streak, the PR, trained-today, the layoff, two
sessions in — and those are live at the pin. The other four are not. **Two of
the six must qualify for the card to show the fix at all.**

I did not change it. The pin is there because a card that rewrites its own top
line half a second after somebody starts reading it is worse than a generic
line, and the boot path is on the brief's do-not-touch list. But it means the
honest statement of what shipped is narrower than §17.4: the ENGINE now opens
with a number whenever two data lines qualify, and the CARD does when two of the
six log-gated ones do. In BACKLOG.md, with the two ways out — pin later, or give
the late-gated lines a cheap log-only sibling — neither of them this ship's.

---

## 18. WHERE THE BRIEF WAS WRONG ABOUT THE CODE

Two things, and the first is the one that mattered.

### 18.1 §2's no-repeat guarantee does not follow from the pool size

Covered in §17.2. The brief's reasoning was sound for a pool that holds still
and the pool does not hold still — its membership is a function of the day's
data and of the finding on the card, both of which move between two opens on an
unchanged log. A mute toggled in Settings does it too.

### 18.2 §2 says "Add to `tools-check/coach-rotation.mjs`". It was not an addition

Eight checks in that file went red the moment the engine changed, and they were
right to. Five of them asserted, in one form or another, that the walk covers
the whole eligible pool — which is precisely what the change stops being true.
One failed by becoming *vacuous* rather than by going red on a real property:
its shrinking-pool pair was `TWO → QUIET`, and under the new rule those two logs
share no lines at all, so `would.length > 0` collapsed to zero and the check
proved nothing while still looking like a check.

The file is rewritten rather than appended to, and §20 is what it now holds.

---

## 19. WHAT rack-v43'S OWN REPORT SAID THAT IS NO LONGER TRUE

The report is append-only by its own rule, so these are named here rather than
edited above.

1. **§12, "the counter walks the whole ordered pool."** True of rack-v43,
   deliberately untrue now. It walks the data-aware lines whenever two of them
   qualify.
2. **§15, "Not the rotation — that is fixed and fenced."** It was neither. It
   needed a second fix within hours of shipping, and the fence — a 57-check
   verifier written specifically for it — was green the entire time the card was
   opening with five generic lines in a row. That is §15's own lesson about the
   nineteen verifiers, one ship later, about the file that was supposed to have
   learned it. **A verifier fences the property you thought to write down**, and
   *"no two consecutive opens match"* is not the same property as *"the line is
   worth reading"*.
3. **§14b, "`coach-rotation.mjs` — 57 checks."** 85 now.

---

## 20. THE VERIFIER, AND WHETHER IT FENCES ANYTHING

`coach-rotation.mjs` now asserts both halves on the same run: no two consecutive
opens match, **and** at least two thirds of a 30-open run are data-aware where
several lines qualify, **and** never five generic lines running — the live
symptom itself, because a ratio can hide a run of five inside a long enough
sample. Neither half is worth much alone: walking the whole pool passes the
first and fails the second, a pool of one passes the second and fails the first.

The file's floor concept had to change with it. It used to reason that a line
with no gate has nothing to fail, so it is eligible on any log — which is how it
avoided deriving its expectations from the thing under test. That is now
conditional: where two data lines qualify the generics are withheld *on purpose*,
and a floor built from them would be asserting the bug. So the file asserts
which case each fixture is in, in both directions, before anything else leans on
it. A rotation that had quietly collapsed to one line cannot pass itself off as
one that was correctly confined.

Four mutations, each run against the real file:

| what was reverted | checks red |
|---|---|
| rack-v43's whole-pool walk | 13 |
| the brief's shape without the memory cap | 2 |
| rack-v42's collapse to the data lines whenever any qualify | 7 |
| the threshold moved from two to three | 3 |

The second row is the one worth keeping. Before the shrinking-pool check was
given the memory a real device carries — three ids, which on a walk of two is
the whole pool — the uncapped engine failed only **one** check in the file. The
original check handed the engine a memory of one, which a pool of two always has
a step out of. A check can test the right property against the wrong state and
look like coverage.

---

## 21. WHAT IS NOT DONE

1. **The service-worker change is unverified.** It cannot be otherwise from
   here. It needs the live check in DEPLOY.md, and until that is run, "shipped"
   means "committed", not "working".
2. **`index.html` still comes from the HTTP cache** for up to ten minutes after
   a ship. §16.3, and BACKLOG.md.
3. **Nothing fences `CACHE` against `VERSION`.** CLAUDE.md makes matching them a
   hard rule and it is checked by hand every ship. It is a two-line verifier
   that reads both files and copies no rule into itself. Not built — the brief
   said nothing else was in scope, and I agree with it. In BACKLOG.md.
4. **Everything §3 of the brief listed as working was left alone**, and the Pro
   panel and the sheet's `dvh` height are still unverified for want of a real
   account and a real phone.

---

## 22. IF THE NEXT RUN READS ONE THING

The greeting was fenced by 57 checks and went wrong anyway, because all 57
fenced the property that was easy to state. The card's only moving part is
supposed to move *and* to be worth reading, and only one of those two is
arithmetic. Both are in the file now, and they pull against each other on
purpose: satisfy either one alone and you have shipped one of the two bugs this
line has already had.

The other thing is smaller and worse. **Every ship before this one had a
ten-minute window after the deploy in which the app could be executing the
previous build while reporting the new one**, and a walkthrough is what somebody
does in the first ten minutes after a deploy. Anything in the reports above that
was "confirmed live" shortly after one was confirmed against an unknown build.
An hour later and it was fine. Nobody wrote down which.

---
---

# COACH — ship two, the workout builder (rack-v45)

A fourth run, in `~/dev/ship-v45` (a fenced clone at rack-v44, `8a61c02`),
against `~/dev/SHIP-V45-PROMPT.md`, with `COACH-PROMPT.md` §1, §2, §3, §5 and §6
still binding. Everything above this line is unchanged; where this section
contradicts it, it says so rather than editing it.

Ship one taught Coach to read. This ship teaches it to build: *"what should I
train today"* becomes a workout he can start in one tap, made out of his own
log. Phases 1–4 shipped. Nothing in scope was dropped.

Verifiers at the start: **23**, all exit 0 under both `TZ=America/New_York` and
`TZ=UTC`. At the end: **25**, all exit 0 under both.

---

## 23. WHAT IS NOT DONE, AND WHAT NOBODY HAS SEEN

1. **No layout in this ship has been seen on a screen.** Not the proposal block,
   not the Weighed-at box (4c), not the recap gap (4d). §15's lesson stands:
   the verifiers drive `coach-ui.js` through a DOM shim with no box model and
   `rack.css` never loaded, so every one of them can prove what is ON the sheet
   and none can prove how it LOOKS. 4c in particular is a mechanism I reasoned
   my way to (§26.2) and could not reproduce. All three are first on the
   walkthrough for that reason.
2. **A routine saved from the builder is not offered by name until the next
   app open.** Coach reads `routines` once per open (`coach-data.js`), and
   nothing tells it about a routine written later. The next proposal for that
   shape still works; it just does not yet say "You have a routine for this". In
   BACKLOG.md.
3. **The builder is on Train and nowhere else**, by decision — §25.9.
4. **Nothing counts builder use.** A usage event would be a new stored key, and
   this ship was told to add none. `workoutStart` still counts every start,
   builder or not, so the admin panel can see starts and not where they came
   from. In BACKLOG.md.

---

## 24. WHAT GOT BUILT

```
coach-build.js    564 lines   NEW, PURE. propose(input, opts) and liveRefusal(input).
                              Native: src/pure/coach-build.js, verbatim.
coach.js        2,390 lines   was 2,254. builderInput(), d.build(), shapeRoutine(),
                              the `build` category, build_workout, ask_build,
                              FOLLOWUPS_AFTER, PRO_ADDS counting selectors, five
                              sentences reworded (4a)
coach-ui.js                   the builder offered only with a `start` callback,
                              chip dedupe, proposalBlock() and its glue, the live line
coach-data.js                 lib gains `name`; input gains `hidden` and `libReady`
picker.js                     hiddenIds(), libraryReady()
workout.js                    the Train card hands in start and save
rack.css                      the proposal (six rules), 4c, 4d
```

| verifier | at `8a61c02` | at rack-v45 | |
|---|---|---|---|
| `coach-build.mjs` | — | 94 | new |
| `version-match.mjs` | — | 1 | new (4b) |
| `coach-surface.mjs` | 35 | 82 | sections E and F |
| `coach-units.mjs` | 47 | 69 | section G, and C's calendar-word check |
| `coach-pure.mjs` | 57 | 74 | section F |
| `coach-rank.mjs` | 65 | 77 | G2's builder rules |
| `coach-voice.mjs` | 42 | 49 | section G |
| `units.mjs` | 128 | 128 | one check reworded: nine display sites |

Every verifier that stages `coach.js` now stages `coach-build.js` too — nine
files, a few lines each — because `coach.js` imports it and a staged copy in a
temp directory cannot resolve `./coach-build.js` otherwise.

`database.rules.json` is byte-identical to rack-v44. No pinned file moved
(`NEXT-NATIVE-V45.md` has the hashes). `coach-tags.js` was not touched: the
builder reads it and no tag turned out to be wrong.

---

## 25. THE DECISIONS THE BRIEF LEFT TO ME, AND WHAT I DID

The brief made the big ones and said not to re-litigate them; none was. These
are the ones it did not make.

1. **What "merges into the focus shape" means.** The shape's own cluster —
   `members`, the signature keys `coach.js` merged into it — rather than
   re-running the symmetric-difference test in the builder. Re-running it
   would be a second definition of §3.3, and a session one group away from two
   representatives would be claimed by whichever copy ran.
2. **The default focus is `session.shapeOverdue` whatever its ratio.** The
   headline finding needs a ratio of 1.4 to fire; the builder does not wait for
   anything to be overdue. It needs the headline's min-data gate — called as
   `train_today_recommendation.minData`, not restated — and a shape.
3. **A group focus builds the whole base session**, not just that group's
   exercises. The brief names the session; filtering it would put a session he
   never did in front of him. The reason line says which session and why, and
   "Swap one" and "Fewer exercises" are one tap away. If "Legs" reading as a
   whole-body day turns out wrong in use, filtering is a small change; it is in
   BACKLOG.md.
4. **The headline is not the brief's example sentence.** *"the last time you
   trained chest and arms"* can be false: a later session outside the cluster —
   a whole-body day, say — can have trained both. It reads *"your most recent
   chest and arms day"*, which is true by construction. For a group: *"the most
   recent with two or more working sets for legs"*, which states the rule it
   was chosen by rather than claiming "the last time you trained legs" over a
   one-set session that came later.
5. **Dates read "Tue, Sep 16", not "Tue 16 Sep".** The app prints a session's
   date with `fmtDateFull` everywhere else; the brief's example did not. The
   builder spells the names out rather than asking `Intl`, and works the
   weekday out in UTC from the date key, so it names the day the session was
   filed under in every zone — checked against `fmtDateFull` itself in both.
6. **Drops are positions; swaps are exIds.** A drop recorded as a count would
   be re-derived after a swap and could remove a different lift from the one he
   watched go: compound A, isolation B, compound C — "Fewer" drops B; swap C for
   an isolation lift, and a count re-derived from scratch drops the new lift and
   brings B back. A position cannot move. A swap keyed by exId swaps a
   duplicated block's repeats as one thing. `coach-build.mjs` H checks a swap
   after a drop keeps exactly the drop that was made.
7. **A swapped-in lift brings its own numbers or none.** Its last session's
   sets, with a note naming that session; never logged, the replaced lift's set
   count and types and nothing in them. Carrying the replaced lift's numbers
   across would be a weight he lifted on something else.
8. **Swaps never cross the cardio line.** The pattern tag separates a lift from
   cardio for built-ins, but a custom exercise has no tag and swaps "within its
   group", and legs holds both squats and a treadmill.
9. **The builder is Train-only.** It needs a way to start what it builds, and
   the You card has none: `you.js` must not import `workout.js` (the README's
   invariant, and §3.10's bug when it was broken). So the sheet offers the
   builder only when the card that opened it hands in a `start` — which makes
   "on Train, not on You" a property of the wiring. The follow-up "Build it"
   is filtered the same way on the You sheet, where the engine would otherwise
   offer it after "How's my training?".
10. **"You have a routine for this: Push A." is a line, not a button.** The brief
    fixed the buttons at exactly four. It is the first thing in the proposal.
11. **The live-session line** — *"A workout is running. Coach builds the next one
    once it is saved or discarded."* — sits under the Train sheet's opening
    bubble, only on Pro, only when a proposal would otherwise exist, and not
    when the builder is switched off.
12. **`lastNumbers` carries `tw`/`tr` as well as `w`/`r`.** Clear a box and his
    last number is still there as ghost text. `collectFrom` strips both.
13. **`libReady`.** Not in the brief, and the most important refusal in the
    module after the layoff. Before the picker has read its three nodes the
    library is the built-ins alone and his custom exercise looks exactly like a
    deleted one — the builder would drop it and say it was gone. So there is no
    proposal until the library has been read. On web the Train card is only
    drawn after `initPicker()`, so this never bites there; the You tab starts
    earlier, and native's boot order is its own.
14. **The left-out wording is "not in your library"**, never "deleted": true
    whether the exercise was deleted or this device could not read the custom
    list, which `read()` cannot tell apart.

---

## 26. WHERE THE BRIEF WAS WRONG ABOUT THE CODE

### 26.1 `PRO_ADDS` would not have picked the builder up by itself

> *the "what Pro adds" panel picks the new category up by itself because
> PRO_ADDS is derived from the intent table — prove it does rather than editing
> the panel.*

It did not. `PRO_ADDS` filtered on `i.kind === 'finding'`, and the brief itself
made the builder a `selector`. Built as specified, the largest thing Pro adds
would have been missing from the list of what Pro adds. The panel is untouched;
the derivation in `coach.js` now counts selectors as well, and
`coach-surface.mjs` proves the drawn panel names "Workout builder" — and goes red
when the derivation is put back.

### 26.2 4c: the Weighed-at box is not in a flex row with Log

> *a `datetime-local` input in a flex row needs `min-width: 0` and a width it can
> shrink to*

`weight.js` puts the box in its own `.field` block under the `.qty-row` that
holds the weight box and Log; the Log button's inline `flex: 0 0 auto` already
stops flexbox shrinking it. No flex rule can squash Log from there. What fits
the symptom is WebKit sizing a date-and-time control from its formatted value
and ignoring `width`: the box overflows the card, and iOS shrinks the whole page
to fit the overflow — which squashes everything, Log included. The rule added
(`.field input[type=datetime-local]`) gives the box `min-width: 0`, a
`max-width` and `appearance: none`, which is what makes iOS honour the width;
nothing about Log changed. **I could not see it**, and if the walkthrough shows
the box still past the edge, the mechanism above is the thing to doubt first.

### 26.3 "in the last seven days" is seven words in a five-word pool

4a's decision was the words *"in the last seven days"*. `g_in_a_row` is a
greeting, and greetings are capped at five words (`COACH-PROMPT.md` §9, fenced
by `coach-units.mjs` E). It reads *"3 sessions in seven days."* — the same fact,
counted and named the same way, in five.

### 26.4 "The answers to … `train_today_recommendation` gain a follow-up"

Follow-ups were keyed by the BUTTON pressed, not by the intent that answered.
`train_today_recommendation` answers `topic_train` as well as `ask_shape`, and
adding "Build it" to `topic_train`'s list would have put it after every training
answer. `FOLLOWUPS_AFTER` is keyed on the answering intent, so "Build it"
follows that one answer whichever button reached it, and nothing else.

### 26.5 `toSession` is not exported

"Round-trips through routines.js `toSession`'s shape" could not import it.
`coach-build.mjs` lifts `toSession`, `blankRoutine` and `saveSessionAsRoutine`
out of `routines.js` by text, the way `month-erasure.mjs` lifts `workout.js`,
and runs them — so the round trip is tested against the function the app
calls, and "Save as routine, then start it" is proved to be "Start it".

### 26.6 `coach-data.js`'s own comment was wrong

It said a hidden exercise "is deliberately still in here". It never was —
`allExercises()` filters hidden ones — and native's port had already noticed
("Web's code cannot do what its comment says"). The comment is corrected; the
behaviour did not change, and the builder takes the hidden list separately.

---

## 27. WHAT CAUGHT THE VERIFIERS

Every new check was mutation-tested: the thing it fences was broken by hand and
the file run.

| phase | mutations | turned red |
|---|---|---|
| 1 — `coach-build.js` | base = oldest session; layoff discounted; sets arrive ticked; hidden ignored; libReady ignored; fewer always drops the last; swaps ignore pattern; left-out unnamed | 8 of 8 |
| 2 — engine and gate | no `FOLLOWUPS_AFTER`; `PRO_ADDS` findings-only; mute ignored; offered without a proposal; no `start` gate; no chip dedupe | 6 of 6 |
| 3 — the proposal on screen | Start does not close; preset uncopied; last-numbers button always drawn; both removals gone; Start hands over lastNumbers; live line everywhere; Train card not handed save | 7 of 7, after two fixes below |
| 4a | the old copy, run against the new checks | 2 of 2 |
| 4b | `usage.js` set one version ahead | red |

Three things the mutations and the new sections found in the fences themselves,
which is the part of this worth keeping:

1. **`coach-surface.mjs`'s stub had never modelled a live session.** It spread
   the card's `{ live: true }` straight into the snapshot, and the engine reads
   `live.active` — so every "live" sheet it ever drew was a sheet with no session.
   Nothing noticed because no check opened one until the builder needed to. The
   stub mirrors `coach-data.js`'s contract now.
2. **My first "the preset is a copy" check was vacuous.** It compared the
   object handed to `start` against a proposal from a DIFFERENT engine instance,
   which can never be the same object — so it passed with the copy removed. It
   now scribbles on the handed-over preset and starts again from the same drawn
   proposal; the mutation goes red on `SCRIBBLE`.
3. **One mutation was of a doubled guard** — `adjust()` and `drawProposal()`
   both remove the old proposal — so removing one changed nothing. Removing both
   turns four checks red. Not a blind check; noted so nobody "fixes" the double.

And two fixture bugs in my own first draft of `coach-build.mjs`, both mine and
neither the engine's: a "thin" log that held seven sessions (the gate is six),
and a numbers floor of "more than twenty" on a layoff proposal whose base was a
pull day carrying exactly twenty.

One pre-existing defect went with the dedupe. After "What should I train
today?" on Train, "What's overdue?" (a follow-up) and "What's waited longest?"
(a topic) were the SAME route drawn as two chips. The builder would have added
a third pair — "Build it" beside "Make me a workout" — so the sheet no longer
draws a topic that is already offered as a follow-up.

---

## 28. `rack-mobile` WAS READ THIS TIME

v42 to v44 were fenced and read nothing of the native tree. This ship read it,
read-only, at `13f6b80`, for three reasons the brief gave it: 4c and 4d's
native halves, and the native destination of every surface change. What it
found that a port would otherwise meet blind:

- **Native's `startWorkout(preset)` mints no React keys.** `toSession()` mints
  `_k` on routine starts and `withKeys()` only on restore, so a builder preset
  handed straight in renders every exercise card `key={undefined}`. The fix
  belongs in native's Train card, never in `coach-build.js`. It is
  `NEXT-NATIVE-V45.md` §4.1 and its "one thing".
- Native's `libIndex()` includes hidden exercises (web's does not). The builder
  checks the hidden list first, so both conventions work — provided `hidden` is
  passed.
- 4c does not exist on native (an inline `DateTimePicker`, not in Log's row);
  4d does not either (`StatRow` already has `marginBottom: m14`).

---

## 29. IF THE NEXT RUN READS ONE THING

The builder's arithmetic is the easy half. What makes it safe is three
refusals, and each one exists because the natural implementation gives a
confident wrong answer:

- **the layoff** — the natural thing is a percentage off, which is a weight he
  never lifted;
- **`libReady`** — the natural thing is to trust the library you have, which
  before the picker loads calls his own exercise deleted;
- **the live session** — the natural thing is to start what was asked for,
  which replaces the workout he is in the middle of.

Keep all three when the builder grows. And before trusting anything in this
section about how the proposal looks: nobody has seen it yet.

---
---

# COACH — ship three, part one: in the gym (rack-v46)

A fifth run, in `~/dev/ship-v46` (a fenced clone at rack-v45, `f976fd0`),
against `~/dev/SHIP-V46-PROMPT.md`, with `COACH-PROMPT.md` §1, §2, §3, §5 and §6
still binding. Everything above this line is unchanged; where this section
contradicts it, it says so rather than editing it.

Ship one taught Coach to read and ship two to build. This one puts it in the gym:
during a live workout it can say what usually comes next, or that he is done
for the day — when he asks, or once, quietly, when a set has just finished an
exercise. Plus Patterns in your data, off until he asks for it. Phase 0's three
fixes came first, from Micah's own phone. All five phases shipped; nothing in
scope was dropped. The free-text box (part two) and the native port were out of
scope and were not touched.

Verifiers at the start: **25**, all exit 0 under both `TZ=America/New_York` and
`TZ=UTC`. At the end: **28**, all exit 0 under both.

---

## 30. WHAT IS NOT DONE, AND WHAT NOBODY HAS SEEN

1. **No layout in this ship has been seen on a screen.** The chip in the
   session's header row, the nudge in the swipe hint's slot, the compact sheet,
   the Patterns bubbles, Weight's Log at 54px. §15's lesson stands — the DOM shim
   has no box model and never loads `rack.css` — and it bites hardest on the
   nudge, whose whole promise ("no row moves") is a CSS claim: the line keeps the
   hint's box because it is the hint's class, 10px type, one clipped line, and a
   × whose larger target is padding handed back as negative margin. That is
   arithmetic. The first thing on the walkthrough that could prove it wrong is
   item 4.
2. **A second session on the same day is still invisible** to the live read, by
   instruction. §35.
3. **There is no switch for the in-session read.** The brief allowed one new
   stored key and gave it to Patterns; the read is ask-only plus one dismissible
   line per exercise. In BACKLOG.md.
4. **Native was not read.** The run was fenced and a read of `~/dev/rack-mobile`
   was refused, so `NEXT-NATIVE-V46.md` takes every native path from V45's read
   and says so on every one.

---

## 31. WHAT GOT BUILT

```
coach-live.js   517 lines   NEW, PURE. liveRead(input). Native: src/pure/coach-live.js, verbatim.
coach.js      2,787 lines   was 2,390. liveInput(), c.live(), LIVE_NONE; the patterns category
                            (optIn), normSettings `on`, isMuted either way round, eight
                            facts, PATTERN_FACTS, patterns_in_data, resp_patterns with
                            `more`, ask_patterns, PATTERN_TOPIC, patternFoodDays()
coach-ui.js                 liveChip, openLiveSheet, noteLiveTick, nudgeLine, dismissNudge;
                            the toggle reads isMuted; the sheet draws an answer's `more`
coach-data.js               coachPro(); weighIns and foodFirst on the snapshot; the
                            Patterns food read; noteCoachData takes routines; the `on` write
workout.js                  tickSet, unsavedTicks, the Finish warning (0a); addPicked, the
                            chip, the nudge, noteLiveTick in the set handler (2); routines
                            handed to Coach (0c)
routines.js                 tell(): its list to a callback after every write and watch (0c)
weight.js                   the inline flex on Log removed (0b)
ui.js                       confirmSheet takes a cancelLabel (0a)
rack.css                    the chip and the nudge (2)
```

| verifier | at `f976fd0` | at rack-v46 | |
|---|---|---|---|
| `tick-targets.mjs` | — | 48 | new (0a) |
| `coach-live.mjs` | — | 51 | new (1) |
| `coach-patterns.mjs` | — | 59 | new (3) |
| `coach-surface.mjs` | 82 | 131 | sections G and H |
| `coach-pure.mjs` | 74 | 92 | section G |
| `coach-units.mjs` | 69 | 85 | sections H and I |
| `coach-voice.mjs` | 49 | 60 | sections H and I, the causal-word list |
| `coach-boot.mjs` | 43 | 54 | section G (0c) |
| `coach-silence.mjs` | 90 | 93 | the Patterns case |
| `units.mjs` | 128 | 128 | one more display site classified |
| `month-erasure.mjs`, `merge-invariant.mjs` | | | follow `runFinish`'s new collaborator and signature |

Ten verifiers stage `coach-live.js` beside `coach-build.js`. `database.rules.json`
is byte-identical to rack-v45 and no pinned file moved (`NEXT-NATIVE-V46.md`
has the hashes); `coach-build.js` did not change either.

---

## 32. PHASE 0 — what Micah found on his phone

**0a, and where the rule lives.** `tickSet(s)` is in `workout.js`, beside
`collectFrom`, exported and pure. Not in `blocks.js` — pinned, and about grouping
rather than sets — and not in a new module: it is the other half of
`collectFrom`'s rule (what a tick means, beside what a tick records), the port
already copies `collectFrom` from this file, and `bodyweight-sets.mjs`'s rig
imports both for real. The Finish half is `unsavedTicks()`, collectFrom's own
test turned over, so the sheet and the record cannot disagree about which sets
they mean. Two things the brief did not say and I decided: the "No completed
sets" sheet names the count when every ticked set is reps-less (Discard is
otherwise a surprise), and `confirmSheet` grew a `cancelLabel` because it had a
hard-coded "Cancel" and the brief asked for "Go back". The block check box was
left alone — it can only tick sets with reps, so it never makes a set Finish
drops (BACKLOG).

**0b** is one line. `weight.js`'s inline `flex: 0 0 auto` beat `.qty-row .btn`'s
54px and the rule's `padding: 0` still applied, so Log was exactly as wide as the
word. 54px holds "Log" at 14px Archivo with room; Fuel's `.qty-row` buttons set
no inline flex and did not change. Steps' Save and Water's Add carry the same
line and are listed, not changed.

**0c took the whole class, not just the builder's case.** The cheap mechanism
BACKLOG named is `noteCoachData()`. The obvious build passes the builder's save
a callback; but a routine written from the routine editor, or the recap's Save as
routine, had exactly the same staleness, and one hand-off at the source covers
all three for the same lines. `routines.js` calls `tell()` after its own writes
land (offline writes never reach the watch) and from its watch; `workout.js`
hands it `noteCoachData`, so `routines.js` still imports nothing of Coach's. A
Coach sheet already open keeps the proposal it drew; the next one names the
routine.

---

## 33. THE DECISIONS THE BRIEF LEFT TO ME, AND WHAT I DID

1. **The order the four are tried in: done, switch, another, next.** The brief
   fixed DONE first. Switch before another is the same bias one step down: a
   group already at its usual volume is never pushed one more set of it.
2. **"Usually" is a strict majority,** for "another" and for "next". The brief
   says another fires when the median exceeds today's count; I fire when MORE
   THAN HALF his sessions of it went past today's count, which implies the
   median does and excludes the five-and-five case. Printing counts ("4 or more
   in 6 of your 9 sessions of it") rather than a median of 3.5 is what made the
   sentence true by construction.
3. **Which shape a live session is.** Today's signature does not exist until it
   is finished, so: the shape whose members include exactly the groups on the
   list; else the most-trained shape that contains them all; else the one that
   contains the groups actually worked. Membership is the cluster's own
   `members`, the builder's test — no second definition of §3.3.
4. **"Next" is the exercise straight after the last of the ones done so far,**
   in each of his sessions of that shape containing all of them. If that
   exercise is already on today's list, or not pickable, the session votes for
   nothing. So a builder-started session rarely hears "next": its plan is on
   screen already.
5. **DONE-by-length counts only sessions of the same shape** — §36 is how I
   learned that the obvious fallback is wrong.
6. **Add it goes to the end of the session, outside any block.** The brief
   offered "into the current block if one is open". I chose the end because
   appending moves no row he is looking at, it is exactly where the picker's own
   "+ Add exercise" puts one, and a block is his to build.
7. **The nudge takes the swipe hint's slot.** "Never moves a row" rules out an
   added line; the hint is on every exercise with sets and is the right height.
   Its state (`_coach`: which exercises have had a line, and the line up now)
   rides on the live session in localStorage and never reaches the record.
8. **Patterns' window is 26 weeks, and "the lift" is his most-logged one.** Twelve
   weeks cannot hold eight busy and eight quiet weeks. Checks 1, 5, 6 and 8 need
   a single lift for an estimated max to mean anything; the brief named "his most
   trained lift" for 5 and I used it for all four.
9. **Check 1 needs a read.** daySummaries has no times, so coach-data reads
   `food/log/{date}` for exactly the days `patternFoodDays()` names, after the
   boot wave, only when Patterns is on.
10. **Every check that clears its sample gate is said** — no bar on the size of a
    difference. A bar would be a search by another name.

---

## 34. WHERE THE BRIEF, OR THE CODE, WAS NOT WHAT IT SEEMED

1. **The PROPOSED rules would refuse the new key.** `settings/coach.on` lands on
   the published rules (they never mention `coach`) — but the proposed `coach`
   shape in `NEXT-NATIVE-V43.md` §5 ends in an `$other` deny. Publishing it as it
   stands would make the Patterns switch flip back silently for anybody who used
   it. In BACKLOG's "Waiting on Micah" and `NEXT-NATIVE-V46.md` §6.
2. **`merge-invariant.mjs` pinned `finishWorkout()` with no parameters.** The
   property it fences — the re-entry guard is the first thing the function does —
   holds; the pin now allows a parameter list, and says why.
3. **"coach-units.mjs and coach-voice.mjs must render each one"** — done for the
   live lines (H) and for Patterns (I). The voice ban is applied to the live
   lines although nothing in `coach-live.js` is a card template, because the
   nudge arrives unasked, which is what the ban is about.

---

## 35. A SECOND SESSION ON THE SAME DAY

Said, as the brief asked, and not solved. The live read sees the active session
and nothing else. A session finished and saved this morning is in the log as a
session of its own: it counts toward his usual, like any other, and not toward
today's. So an evening session after a morning one reads its own sets alone
against "your usual" — it can say "one more set" where the day's total already
passed his usual, and it will not say "done" on the strength of the morning. The
way in is `live.*` facts that add today's saved sessions to the live one; the
question to answer first is whether a double day is one session to him or two.

---

## 36. WHAT CAUGHT THE VERIFIERS — AND WHAT THEY CAUGHT IN ME

Every new check was mutation-tested: what it fences was broken by hand in a
scratch copy and the file run.

| phase | mutations | red |
|---|---|---|
| 0a `tick-targets.mjs` | typed values overwritten; the bare flip back; no warning; a click event read as "anyway"; untick clears; a wrong count | 6 of 6 |
| 0c `coach-boot.mjs` G | no routines in noteCoachData; tell before the write; no tell in the watch | 3 of 3 |
| 1 `coach-live.mjs` | no fatigue gate; another before done; next at exactly half; next ignores pickable; next ignores the list; a nudged weight in the quote; no tier gate; no edit gate; warm-ups count toward fatigue; min sessions 2 and 4; a drop at a heavier weight; the window fallback for DONE | 13 of 13 |
| 1 units, voice H | a banned word; a unit word by hand | 2 of 2 |
| 2 `coach-surface.mjs` G/H | chip ignores Pro; ignores an edit; shown twice; silence spends the once; Add it not in an array; drawn in an edit; any set raises it; a parallel add path; the line adds a row; its CSS positioned; the toggle reads the mute map; `more` not drawn | 12 of 12 |
| 3 `coach-patterns.mjs` | on by default; a minimum of 7; the quarter by ceil; four days counted close; counted rested; the median day counted below; today counted; the protein split moved; a causal word; on a card; read while off; the rate's sign flipped; morning's hour moved | 13 of 13 |

What the fences caught in my own first drafts, which is the part worth keeping:

1. **The DOM shim found an engine bug.** coach-surface's thin-history check
   expected silence and got *"You're probably good for today — 7 working sets
   against a usual 5.5"*: with no shape of its own, DONE-by-length had fallen
   back to every session in the window and pooled short leg days with long chest
   days. No engine verifier had a fixture shaped to see it. §15 said the bugs are
   in the wiring; this time the wiring's verifier was the one that saw the
   engine.
2. **`window`, again.** v42's trap 1 — an input field named `window` in a module.
   `coach-pure.mjs` refused it in both files the moment they were written. It is
   `sessions` now, the name builderInput already used.
3. **A sweep that looked like coverage.** coach-live's 400-session sweep used an
   LCG's low bits, which cycle; 85% of its sessions carried an F, and when I added
   the check that "one more set" does occur on the rest, it occurred once. The
   high bits fixed it: 171 with an F, 108 answered "one more set".
4. **Two checks passed by throwing.** The first hidden-exercise check removed the
   exercise from the library as well, so the read threw and fell back to silence
   — which is what the check wanted, for the wrong reason. It now keeps the
   exercise in the library and hides it (native's convention), and the mutation
   goes red. And one of my mutations was not a faithful revert: it crashed the
   same way, so it looked like the check was blind when it was not.
5. **A boundary that did not move.** Dropping a quiet week's session from the
   Patterns fixture was meant to take the rest-gap check from eight rested
   sessions to seven. It made the next session the rested one: eight again. The
   boundary is now a four-day gap made on purpose.

---

## 37. IF THE NEXT RUN READS ONE THING

The engine got two new modules and both are fenced, but the lesson of this ship
is the same as §15's in a new place: **the thing that found the worst bug was
the verifier of the screen.** A thin log is not a hypothetical in the gym — it is
every new account's first month — and the answer to it was a confident wrong
number, found only because a view test asked what the chip says to somebody with
four sessions.

And before trusting anything about how the chip, the line or the Patterns
bubbles look: nobody has seen them yet.

---

## 38. AFTER WALKING THE BUILDER, BEFORE THE PUSH

Micah walked v46's builder on his phone before pushing it and asked for seven
changes, from that walk and from §30–§37's own BACKLOG. All seven shipped, in
three commits after `rack-v46`, which stays the version: nothing here has
reached a phone yet, so one number still names one build.

1. **Train's sheet leads with "What should I train today?"**; "Make me a
   workout" is second. `TRAIN_TOPICS` order.
2. **"Make me a workout" asks "What do you want to train?" first.** The choices
   are `coach-build.js`'s `buildMenu()` — pure, verbatim for native — handed on
   by `c.buildMenu()`, and the sheet only draws them: **Tell me what to train**
   (Coach's pick, the default focus — the shape the answer to "What should I
   train today?" names), then his recurring shapes by the existing naming rule,
   then the six groups, each only if `propose()` answers it. Nothing is merged:
   Coach's pick and the shape it picked can build the same workout under two
   labels, and each is still the answer to its own question (BACKLOG). The
   question is only ever asked when the default builds — the gate on "Make me a
   workout" did not move — so a thin log is never asked a question with nothing
   behind it, even where a group alone would build.
3. **"Build it" goes straight through.** It needed its own route for that:
   `ask_build` is now "Make me a workout" → `build_menu` (a new selector, the
   question), and `ask_build_now` is "Build it" → `build_workout` (the
   proposal). Two routes would have drawn two builder chips side by side after
   "What should I train today?", which the sheet has never done, so a follow-up
   now carries `stands` — "Build it" stands for "Make me a workout" — and the
   topic is not drawn beside it.
4. **The pure layer decides the list** — every choice, its order, its label and
   whether it is offered. `coach-ui.js` writes none of the words.
5. **"In the gym" in Settings → Coach**: the chip and the line, on by default,
   `mute.live` (absent = on). A category needs an intent, so there is a
   registered selector, `live_read`, never answered through the router — the
   live read needs the session, which only the caller has — and that also puts
   "In the gym" in `PRO_ADDS`. `c.live()` reads the switch in the engine; the
   chip and the line read it in the view, so a line left up goes with it.
6. **Steps' Save and Water's Add** lost the inline `flex: 0 0 auto` 0b took off
   Log.
7. **The block check box ticks through `tickSet`.** A set is fillable when it
   has reps or a rep target, and each row goes through the single-tick rule, so
   a block of grey targets fills in exactly as ticking them one by one would. A
   row already where the box is sending it is left alone — `tickSet` is a
   toggle, and without that guard ticking a half-ticked block would have
   UNticked the half already done.

**What §30–§37 said that is no longer true.** §30.3 ("there is no switch for
the in-session read") — there is. §32 ("the block check box was left alone";
"Steps' Save and Water's Add … are listed, not changed") — both are changed.
§33.6 (Add it) and everything else there stands. `NEXT-NATIVE-V46.md`'s pins
said `coach-build.js` had not moved; it has now (`buildMenu`), and the file is
corrected.

**The verifiers.** `coach-surface.mjs` 131 → 148 (E and F follow the
question-first flow; I proves each item on the drawn sheet), `coach-build.mjs`
94 → 110 (K: the menu in the pure layer), `tick-targets.mjs` 48 → 62 (G: the
block box's three pieces run with the real `tickSet`; H: the three buttons),
`coach-rank.mjs` 77 → 79 (the builder's checks restated for the new design),
`coach-live.mjs` 51 → 52 (the switch in the engine). Fifteen mutations — the
old order, no question, "Build it" asking, the menu written in the view, no
`stands` dedupe, the switch ignored by the chip and by the engine, the menu's
filter removed, the pick moved, shapes labelled by key, the block box's bare
`done`, its reps-only test, its toggle guard, a squashed Save — each red.

What the fences caught in me this round: my own find-and-replace rewrote the
one deliberate "Make me a workout" tap in section F into the two-tap helper, so
the question-first check was tapping past the question; a check I wrote in
section I asserted that "What should I train today?" was absent after a pick,
when it was unasked and rightly back; and section F, written in v45, died on
the first missing proposal rather than failing its checks, so a broken flow read
as a crash — it has a stand-in box now and fails with reasons.

Still unseen: the menu on a phone. On the fixture it is eight chips; on a log
with four recurring shapes and all six groups it is eleven.

---

## 39. TWO MORE FROM THE PHONE

Two more before the push, committed as one (`Not twice, and something else`),
`rack-v46` unchanged.

**8. Not twice.** The sheet opens on the You card's finding — on Train as well,
since v43 — and on Train "What should I train today?" is often answered by that
same finding. The thread then held the same sentence twice, one above the other.
The engine now marks an answer `repeats` when its text is the opening bubble's,
word for word; the sheet prints neither the question nor the answer and hangs
the answer's follow-ups — "Build it" first — under the opening bubble, keeping
the rest of the questions in the bottom row and nothing offered twice. The mark
is about the sheet, not the answer: move the opening (mute its category) and
the same answer stops being a repeat, and `coach-rank.mjs` I proves both ways.
One decision: a repeating answer with no follow-ups prints nothing at all. The
sentence it would have said is already at the top.

**9. Something else.** "Swap one" listed five alternatives at most, and the one
he wanted was not always there. Every row now ends with "Something else…",
which opens the ordinary picker on that lift's group with the workout's own
lifts and the hidden ones left out, one tap to pick. Both halves of the
decision are pure: each proposal exercise carries `other` (what the picker
opens on and leaves out), and `swapTo()` says what the pick means — the SAME
opts a listed alternative gives, checked against all 35 listed ones in the
fixture, or a refusal with its reason. A lift with no listed alternative is
now on Swap one's list, because the picker is always somewhere to go. The
picker opens on the group and is not locked to it; the engine refuses only what
cannot stand in (BACKLOG). When he makes a new exercise from inside the picker,
the sheet asks the engine afresh, because the library it opened with did not
have it.

`coach-surface.mjs` K is the first check in the tree that drives picker.js's
sheet itself — its store stubbed to answer one hidden id — and the fourteen
mutations of this round (the mark, the printing, where the follow-ups hang, the
button, the swap bypassing `swapTo`, the picker's filter, exclude and single
tap, the list of swappable lifts, and `swapTo`'s own refusals and opts shape)
each turn a verifier red. `frequent.mjs`'s pins on the picker's `touched` guard
still hold: a picker opened on a group counts as a chip already tapped, so the
late Frequent counts never move it.

---

# COACH TRAINER — stage one: targets (rack-v48)

A sixth run, in `~/dev/ship-v48` (a fenced, full clone at rack-v47, `124d33a`),
against `SHIP-V48-PROMPT.md` (the build brief) and `COACH-TRAINER-SPEC.md` (the
design record, §0, §3 and §8 read first as instructed). Both are committed with
the docs. Everything above this line is unchanged; where this section
contradicts it, it says so rather than editing it.

Coach could read the log, build a workout from it and say what comes next in
the gym. Tonight it learned the thing every paid lifting app does: **what weight
and reps to do next time**, per lift, from the account's own history. Two pure
modules (`coach-prog.js`, `coach-goal.js`), wired into the builder: a target line
under every exercise, **Start with Coach’s targets** as the main button, **What
should I lift today?** on Train, and **Your goal** in Settings → Coach. No new
read, no new database node, no rules change, no change to any logged record.

Every priority in the brief's §14 got built. Nothing in scope was dropped.
Verifiers at the start: **32**, all exit 0. At the end: **34**, all exit 0 under
`TZ=America/New_York`, `TZ=UTC` and `TZ=Pacific/Auckland`. The battery prints
**ok 57, miss 0, wrong 0**.

---

## 40. READ THIS FIRST — the one rule I changed, and what is not done

### 40a. The case that moved a rule

The brief (§6): *"If you find a case where following it literally produces an
unsafe or silly target, stop, write the case at the top of COACH-REPORT.md, and
choose the more conservative answer."* One such case turned up, and it is here
first.

**The case.** The property sweep in `tools-check/coach-prog.mjs` found a kilo
back squat, twelve sessions, learned range 10–12, whose last session was
**13, 14 and 15 reps at 130 kg**. Following §6.8 literally, Coach said *"Target:
130 kg for 13, 14, 15 again"* — hold, confirm. Take **one rep off the first
set** — 12, 14, 15 — and the same log said *"Target: 3 × 10 at 135 kg"*. Fewer
reps, heavier target: exactly what the brief's own property ("lowering any rep
count in the last exposure never makes the target heavier") forbids.

**Why.** §6.8 builds the estimated-max series from sets of **1 to 12 reps** and
skips an exposure with none. A session of 13, 14 and 15 therefore contributes no
point at all; the slope is read over the sessions before it, comes out under
0.25%/wk, and the slow-slope dial asks to see the top twice. Drop one set to 12
and the session joins the series with a high estimate, the slope clears the
bar, the dial lets go, and the target jumps. The session he did best on was
invisible to the dial precisely because it was good.

**What I did.** A set past twelve reps now **counts as twelve** in that series
(`coach-prog.js` `progressOf`, commented in place). Twelve reps at a weight is a
floor under what a 15-rep set shows he can do, so the estimate stays
conservative — the spec's reason for the twelve-rep cap ("a 20-rep set's
estimated max is the least reliable number in the app") is kept, because a
twenty-rep set now contributes its twelve-rep floor, never its own estimate.
With it, the series is monotone in every rep count, and the property holds
across the whole sweep. The case is pinned by name in the battery; against the
literal rule it fails, with the clamp it passes (checked both ways).

**Was it the more conservative answer?** Honestly: not in that one case. With
the clamp the case reads ADD in both variants, because the session now counts —
a jump of one 5-kg step after three sets above the top of his own range, which
is ordinary double progression and not an unsafe target. The alternative I
tried keeps the session being judged out of its own dial (the way the rep range
already excludes it), which makes the case HOLD in both variants. I built it
and ran the battery: **it turns A34 from hold into add** — the slow lifter the
dial exists for loses his second look, because the slope is then read over a
different eight sessions (the ones before the last) and on A34's log those
climb just fast enough to clear the bar. It also needs nine sessions before the
dial works at all, and it makes the dial blind to the most recent session in
every case. Neither fix is more conservative everywhere; the clamp
changes the least (one line of the estimate, every row of the brief's table
unchanged) and closes the hole completely. If you would rather have the other
trade — the case holds, A34-shaped logs jump — it is a two-line change, and
`coach-prog.mjs` will say which rows move.

### 40b. Smaller departures, each on purpose

1. **The experience answers are spelled out** — *Under six months*, *Six months
   to two years*, *Two years or more* — not "6 months" and "2 years".
   `coach-units.mjs`, which must pass unedited, refuses any typed digit in
   `coach.js` copy other than a count of days or weeks ("every figure is
   computed"). The values stored are unchanged: `new`, `some`, `years`.
2. **Your goal shows on Pro only.** §4.1 says Settings shows the goal questions
   unanswered; §4.4 says a basic account sees no change except the Pro panel's
   new line. The goal turns nothing but the Pro targets, so for Basic it would be
   a survey. The *Weight and rep targets* switch does appear for Basic — every
   mutable category's switch always has (Workout builder and In the gym do too).
3. **The off-grid sentence no longer says "entered in pounds."** A kilo account
   can type 101.3 kg as easily as a switched account's old 225 lb shows up as
   102.06; both are off the half-kilo grid and only one was typed in pounds. It
   reads: *"Last time’s weight doesn’t land on a half-kilo step, so Coach won’t
   work a new number out from it."* (and *half-pound* on pounds).
4. **"the two lighter sets" reads "the two lowest sets".** Every set in a
   reps target is at the same weight; "lighter" suggested the wrong thing.
5. **A default range is named, not just used**: *"Inside 6–10 at 185 lb last
   time (10, 9, 9). 6–10 is a common starting range."* — the spec's T3 label.
   When a big jump stretches the top by two (§6.5 micro), it says so.
6. **A deferral's quote reads the way somebody says it**: *"405 lb for 1, then
   315 lb for 5"*, *"185 lb for 12, 5, 11"*, *"3 × 8 at 185 lb"*. §6.7 asks only
   that it goes through `fmtSetLoad`; every range deferral quotes too.
7. **An assisted lift says what its number is**: *"Target: 3 × 8 with 45 lb of
   assistance."* The set row stores assistance as the weight; "at 45 lb" on an
   assisted pull-up is ambiguous.
8. **The targets answer names each lift once** — a lift in a duplicated block is
   one lift with one target — so its bubbles are per lift, not per row. Six at
   most, as the brief says.

### 40c. What is not done, and what nobody has seen

1. **Nothing in this ship has been seen on a screen.** The target line, its
   evidence opening and closing, the five-button row, the six aim chips under
   the targets answer, the Your goal rows. `coach-surface.mjs` drives every one
   through the DOM shim — which has no box model and never loads `rack.css` — so
   what it proves is what is drawn, never how it looks. §45 has the arithmetic.
2. **No mid-session targets, no card change, no status sentence, no lift target,
   no focus group, no onboarding step** — the brief's §4.5, all by instruction.
   `coach-live.js` is byte-identical to rack-v47, and `coach-live.mjs`'s "a
   number to put on the bar must be a quote" passes unchanged.
3. **Native was not read** — the run was fenced — so `NEXT-NATIVE-V48.md` carries
   its native paths from V46, and says so.

---

## 41. WHAT GOT BUILT

```
coach-goal.js    118 lines   NEW, PURE. AIMS, EXPERIENCE, DIALS, the energy thresholds,
                             energyContext(), dialsFor(). Imports nothing.
coach-prog.js    887 lines   NEW, PURE. exposuresFor(), baselines(), prescribe(),
                             sessionDay(). The gates, the learned range and step, the
                             decision, status and slope, and every sentence a target says.
coach.js       3,058 lines   was 2,872. Category `targets`; facts coach.aim,
                             coach.experience, weight.energy, lift.targets; questions
                             q_goal_aim, q_experience (always, where, ack) and an ack on
                             q_goal_direction; pendingQuestion() skips a `where`;
                             questionUnder(); intent lift_targets, resp_lift_targets,
                             route ask_targets (third on Train), its follow-ups;
                             builderInput gains goal, energy, targetsOn.
coach-build.js   729 lines   was 649. A `target` on every row, the `targets` view, the
                             header and nudge() comments rewritten (§2 of the brief).
coach-ui.js                  The target line and its evidence; Start with Coach’s targets;
                             askQuestion() shared by the opener and the goal question;
                             each question's own ack; Your goal in coachAnswerRows().
rack.css                     One rule: .coach-build-target.
sw.js, usage.js              rack-v48.
```

Commits, each of which passes every verifier: `coach-goal.js` + its verifier →
`coach-prog.js` + the battery → `coach.js` wiring (with the staging edit and the
purity fences) → `coach-build.js` → UI + CSS → the goal end to end → the pinned
case → `rack-v48` → docs.

**The algorithm is §6 of the brief**, section for section, with the one change in
§40a. Where §6 left a choice open, §44 says what I chose.

**What the dials do, on the brief's own rows**: no aim — confirm once, one jump,
6–10 / 10–15; *Lose fat, keep strength* and *Stay consistent* confirm twice
(A25, A26); a hard cut on the trend confirms twice and caps one jump (A27);
Get stronger and Powerlifting may earn two jumps on a lower-body barbell lift
two reps clear of the top, climbing fast and past six months (A35, A45; A37 is
the new lifter who does not); Powerlifting's 3–5 band makes 3×5 the top where Get
stronger's 3–6 does not (A44 against A39b).

---

## 42. THE BATTERY — every row, and the rows I corrected

**No row was corrected.** All 57 rows scored **ok** on the first run of the
finished engine, and have since: `A1`–`A45` (A43 does not exist in the brief),
`A7b`, `A10b`, `A14b`, `A15b`–`A15d`, `A23b`, `A34b`, `A39b`, plus four of mine,
**B1–B4**, which the brief's table does not have and which exist so the sweep
reaches the words the table never makes: the *unassisted* target (B1), a
bodyweight re-entry (B2), an off-grid reps target (B3) and a stepped kilo
re-entry (B4).

Where a row left a detail open, the fixture chose it, and these are the choices:

- **Dates.** A row with no dates is spaced four days apart, ending three days
  ago, so no layoff clock can fire. A1, A13–A15d, A36 and A40 use the row's own.
- **A26** is A1's log four days older, with the extra 3×12@185 three days ago.
- **A31**'s two sessions are yesterday at 08:00 and 18:00 local, built in the
  verifier's own time zone.
- **A34**'s reps (`[9,8,8] … [10,9,9], [10,10,10]`, weekly) keep the estimated max
  flat and never repeat one rep count three times in four, so the range is the
  default band, as the row implies.
- **A42** reads "A24's climb to 50" as A24 without its final 3×12@50, so the
  fixture stays at seven sessions.
- **A15**'s re-entry reps are 6 — the default band's bottom, because two
  sessions are one pair and no learned range (the row names no reps).

**The properties** (§10.1), over 4,400 seeded histories — 2,200 per unit, a
mulberry32 generator, the real record shape, pounds stored on kilo accounts and
about one load in eight typed in pounds on them — all hold: deterministic;
order-blind; an F never heavier and never a number from none; one rep fewer
never heavier; every number logged or within two steps (six below on re-entry)
and on the grid; never from an off-grid load; no number on an assisted
reduction or re-entry; no blank ghost where a weight was logged; every new kilo
ghost printing back through `fmtSetW` as the number in the line; nothing at or
below zero; nothing on cardio; no sets on a defer or a first. The generator is
deliberately messy, so the sweep's answers are mostly careful: of 4,400, 2,384
defer, 351 hold, 532 reps, 273 re-enter, 192 add, 186 bodyweight, 128 first, 31
reduce and 323 null (cardio, and the lift never logged); 1,045 name a number.
The must-never scan read 13,377 strings, 6,581 of them in kilos: no banned word,
no max attempt, no cause, no pound on a kilo account, no straight apostrophe.

**`wrong: 0` is fatal-on-change**, not a snapshot: the battery exits non-zero on
any wrong, and a miss (Coach deferring where a row expects a target) is reported
but not fatal.

---

## 43. WHERE THE BRIEF, OR THE SPEC, WAS WRONG ABOUT THE CODE

1. **"The shipped `pendingQuestion()` skips any question that carries a
   `where`."** It did not — nothing had a `where` until tonight. I added the
   skip (one line, commented). Without it the goal questions would have opened
   the sheet on every account and broken the rank, silence and surface checks
   the brief says they keep true.
2. **The experience labels as written fail `coach-units.mjs`**, which must pass
   unedited (§40b.1).
3. **The spec's §8.1 says each aim changes at least one dial differently from
   every other**, "or it's a label and not a goal." Tonight's `DIALS` (the
   brief's own table) gives *Build muscle*, *Recomp* and no aim the same row —
   what tells them apart (volume targets, the contradiction checks) is stage
   three's. `coach-goal.mjs` holds apart the pair Micah decided on (Powerlifting
   and Get stronger) instead.
4. **"Twelve verifiers … all twelve die with ERR_MODULE_NOT_FOUND"** was true to
   the letter, and one of them, `coach-boot.mjs`, stages through its own
   `swap()` helper rather than `.replace` chains, so its edit looks different.
   The eight the brief said must pass unedited differ from rack-v47 in staging
   lines only — checked by diff, line by line.
5. **The DOM shim `coach-surface.mjs` drives has no `.after()`**, so the target's
   evidence is appended inside a small wrapper around the line rather than
   inserted after it. Same on screen; the shim can see it.
6. **§10.3 asks `coach-voice.mjs` to read "every target.line and target.why the
   A-battery produces."** The battery lives in `coach-prog.mjs`, a script that
   exits. It now exports its rows and staging and runs its checks only when
   invoked directly, so `coach-voice.mjs` imports the very same targets instead
   of building a second battery — and `coach-prog.mjs` reads the shipped BANNED
   list out of `coach-voice.mjs`'s source rather than keeping a copy.
7. **"Byte-identical to today's for every existing fixture"** needed a "today" to
   compare against. `coach-build.mjs` section M stages rack-v47's own `coach.js`
   and `coach-build.js` out of git (`124d33a`) and compares 70 proposals: the
   three views byte for byte, and the whole proposal bar `target` and `targets`.
   It needs a full clone, like `estimate-origin.mjs`.
8. Confirmed true, for the next brief: `d.build({})` is memoised; `normSettings()`
   needed no change (driven in `coach-goal.mjs` E); `units.mjs`'s classification
   was at the line the brief said; the tick path (`tickSet`) adopts `tw`/`tr` with
   no change.

---

## 44. EVERY ASSUMPTION I MADE

**The engine**

- An exposure whose every working set is a drop set has no top load and is left
  out of the reading.
- Two sessions with the same `startedAt` are ordered by session id, so a shuffled
  log is the same answer.
- "The last 84 days" is `daysAgo < 84`, the window every other Coach derivation
  uses. "A gap of more than 21 days" is noon-anchored whole days.
- An assisted lift whose last top load is 0 (unassisted) takes the bodyweight
  path — the spec's §3.5 ("the read switches to the bodyweight path").
- A weighted bodyweight lift with some sets at 0: the loaded sets are the top;
  the 0-load sets are back-offs and keep last time's numbers.
- A bodyweight target's stage is `yours` (it is his reps and nothing else); a
  defer's and a first's is `none`; a range or step that is a labelled default,
  or a step that is unknown, is `learning`.
- **Reps target**: the weakest half is chosen first, and a set typed F among them
  keeps its reps without passing its +1 to another set. If nothing can rise, no
  "one more rep" sentence is printed.
- **Hold (miss)**: every top set targets the bottom of the range.
- **The slope** is Theil–Sen over noon-anchored day numbers; two sessions on one
  day are zero days apart, and that pair is skipped. The slow-slope
  sentence prints the fitted move across the window, and "held about level" when
  it rounds to under one unit.
- **σ** is taken over the last ten points of the whole series and needs five
  changes; a decline needs six points in the window.
- **"Since you last trained chest"** is said only when the group's clock is the
  one in play (`groupDaysSince` known and the smaller); otherwise *"since you last
  did this lift"*. *"Your chest work has kept going"* only when the group was
  trained after the lift.

**The wiring**

- `lift.targets` is non-null with at least one target of any mode, so *What should
  I lift today?* answers even when every lift defers — the brief's "at least one
  entry", literally. BACKLOG has it.
- The goal question under the answer uses the opener's gates, including
  `coach.openQuestion` — so an unanswered goal question holds every question for
  the week, and an unanswered direction question holds the goal's. One at a time.
- The step line rides on every target that names a number (§9's "any target with
  a number"), reps and holds included.
- The builder computes targets on every `build()` — the menu's and "Train
  something else"'s checks included — with each lift's exposures read once per
  build. A whole `coach()` on a twelve-week, 33-session log answered in tens of
  milliseconds in node.
- "Built from a different day" compares dates; two sessions on one day with the
  same lift get no note (the target's own why names the day).
- In the targets view, a lift in a duplicated block whose last session had a
  different number of sets keeps its placeholder sets — the merged sets cannot
  be split back without guessing whose set is whose.

---

## 45. THE 375-PIXEL CHECK — reasoned from `rack.css`, not measured

The brief asks that six options wrap cleanly on a 375-pixel screen, and says the
shim will not tell me. It will not; this is arithmetic from the stylesheet.

**The six aim chips, under the targets answer.** The sheet is full width with
`--pad` 16px each side: 343px. A Coach bubble is `max-width: 90%` (308.7px) with
13px padding each side: **≈ 283px** for its chip row. `.coach-chips` is
`flex-wrap: wrap` with an 8px gap, and a chip is 13px Archivo (wdth 94, wght 600)
with 13px padding and a 1px border each side — about 6.8px a character plus
28px. So roughly: *Get stronger* 110, *Powerlifting* ≈ 105, *Build muscle* 110,
*Lose fat, keep strength* ≈ 184, *Recomp* ≈ 69, *Stay consistent* ≈ 130. They
wrap as whole chips onto **four rows** (2, 1, 2, 1), the widest is two thirds of
the row, and nothing truncates or runs out of the bubble. Each chip is one line.

**Your goal, in Settings.** The six aims are the onboarding choice rows —
full-width, 13px × 14px padding, 15px titles — which fit at any phone width. The
three experience answers keep the segmented control (the brief: more than three
options become rows). At 375 each segment is ≈ 110px, ≈ 101px of text after
padding, and the labels are 11px uppercase with .06em tracking (≈ 7.3px a
character): **each wraps to two lines** — *UNDER SIX / MONTHS*, *SIX MONTHS TO /
TWO YEARS*, *TWO YEARS / OR MORE*. Legible, and uniform, but the pills grow to
two lines. It is the one thing I would look at first on the phone; drawing that
question as choice rows too is a one-condition change in `coachAnswerRows`.

**The target line** is the note's own size (11px, 1.4) in the body colour, and
wraps like the note does. The five-button column is the four's column with one
more `.btn`, each a 44px minimum (`touch-target.mjs` resolves every class list
a `.btn` is built with, the new one included).

---

## 46. THINGS I FOUND AND DID NOT FIX

The brief's §11, all in BACKLOG.md under *What v48 left open*:

- `lift.stalled` and the new per-lift status disagree about "stalled" — stage two.
- `coach-live.js` never names a weight — stage five, under a replaced fence.
- Grey last-time numbers on hand-added exercises (Micah's 23 Sep request) —
  stage five, through `coach-prog.js`.
- A second session on the same day is invisible to the live facts; `record.groups`
  counts warm-ups — both already in BACKLOG (v42), both untouched.
- Basic sees no target at all — the one-real-target teaser is stage three.

And mine, also in BACKLOG: assisted lifts near unassisted are mostly silent (the
15% rules are relative, and 10 → 5 lb of help is 50%); an assisted lift's
estimated max runs backwards (the weight is assistance), which reads its slope
as slow and confirms twice — conservative, and its status is meaningless; the
step line under same-weight targets is noise; kilo and pound accounts can get
different targets from one log, by design.

---

## 47. MICAH'S DECISIONS, 23 SEP 2026 — carried forward

The brief's §15, so the next stage's brief starts from it. Rows marked TONIGHT
are built; the rest are recorded, not built.

| # | Question | Answer | Where it lands |
|---|---|---|---|
| 1 | Labelled training-science starting points before Coach knows you? | **Yes, training only.** Food and body stay own-data only | TONIGHT: default bands and default steps, always labelled |
| 2 | The goal set | **The five, plus Powerlifting** as its own goal | TONIGHT: six aims in `q_goal_aim` and `DIALS`. Powerlifting differs by its bands tonight; later stages give it the big three |
| 3 | Card becomes encouragement only? | **Yes.** Findings move to the sheet's opening | Stage 3 (v50) |
| 4 | Coming back after time off | *"I like the more cautious holding but not from any workout, it should be an individual timer for each muscle group … I like 12 days for a timer."* Then: the muscle group's clock sets how far back to start; a lift not done in 12+ days on its own still gets no jump its first time back. Hold from 12 days, ~90% at 15–30 days, ~80% past 30, **one jump at a time** back up | TONIGHT: gate 6, BODYWEIGHT, no two-step catch-up; rows A13–A15d, A36 |
| 5 | When to want two sessions at the top before adding weight | **As proposed:** twice when cutting or Stay consistent, in a hard cut, on doubles and triples, or when progress has been slow; once otherwise | TONIGHT: `DIALS`, `dialsFor()`, the decision |
| 6 | No targets for singles or lone heavy top sets (until RIR) | **Yes** | TONIGHT: gates 4–5 |
| 7 | General nutrition science in fuel answers? | **No. Own data only** | Stage 4 (v51) |
| 8 | Learning whether rest advice was taken | *"Pick whats best"* → **replay, save nothing.** Plus: a per-group recovery window that grows after a hard day for that group, checked when he asks what to train **and** when he picks a group in *Make me a workout* (a caution with *Build it anyway* / *Train something recovered*, never a refusal) | Stage 4 (v51). Spec §9.2 |
| 9 | Save answers about how you feel? | *"A mix of both."* A session that came in below usual can be **marked** (Slept badly / Stressed / Sore / Didn't feel well); a marked session never counts as a miss and never drags down his normal. Marks live in `settings/coach`, keyed by session, cleared after 6 months. "Have you eaten?" stays use-once | Stage 4 (v51). Spec §10.3, §12. `prescribe()` needs nothing for it yet |
| 10 | Cut-speed thresholds | **As proposed:** hard cut ≤ −0.75 %/wk, cut ≤ −0.25 %/wk, surplus ≥ +0.25 %/wk | TONIGHT: `ENERGY_*` |
| 11 | Say "carb-loaded"? | **No.** The bubble is "Am I fueled?" | Stage 4 (v51) |
| 12 | Stage order | **As proposed:** targets → plateau/cut → card & goals → fuel & rest → in-gym & volume | The plan |
| 13 | Coach reads the water log? | **Not yet, decide later** | Revisit after stage 4 |
| 14 | Which Start button leads the builder | *"I like the targets as the main button, because this coach should be at the level where I can trust it. Once this is built, I should be able to only ever use my app for my workout and in following it, I should see my data of my lifts going up. I have to be able to trust it."* | TONIGHT: *Start with Coach’s targets* is first and primary whenever there are targets. **The bar for the whole ship** |
| 15 | Targets Pro only? | **Pro, with one teaser later** (Basic sees one real target plus the lock in stage 3) | TONIGHT: `tier: 'pro'`. Teaser: stage 3 |
| 16 | When rest comes up | Rest is answered when asked **and** a gentle, positive card line appears after three or more training days in a row (house style: no exclamation mark, no body claim), switchable with the rest-day setting | Stage 4 (v51); the card line in the stage-3 pool |

Two things tonight's build adds for the next brief to decide: whether the
**§40a trade** is the right one, and whether **Your goal** should reach Basic
once the stage-three teaser gives Basic a target to turn.

---

## 48. IF THE NEXT RUN READS ONE THING

`tools-check/coach-prog.mjs` is the contract now, more than §6 of any brief. It
found the one real hole in tonight's algorithm by generating histories nobody
wrote down, and it will find the next one the same way. Stage two changes what
the targets *mean* (the plateau-vs-dip call, the stall ladder) — run the battery
after every rule you touch, keep `wrong: 0`, and when a property fails, read
§40a before you reach for the rule the failure points at: the obvious fix and
the conservative one were not the same fix.

---

## 49. READ THIS FIRST — rack-v49, and what is not done

Written at the end of an unattended overnight run in `~/dev/ship-v49`, against
`SHIP-V49-PROMPT.md`, with `COACH-TRAINER-SPEC.md` §0, §5, §8 and §9 read first
as the brief asked. Shipped as `rack-v49`. **Not pushed.**

**Both phases are built, in the brief's order: all of Phase A was built,
verified and committed before Phase B began.** Every verifier exits 0 under
`TZ=America/New_York`, `UTC` and `Pacific/Auckland` — 38 of them, four new.
`coach-prog.mjs` is **57 / 0 / 0**; `coach-overlap.mjs` is **ok 24, miss 0,
wrong 0**. `database.rules.json` is byte-identical to rack-v48. `sw.js` and
`usage.js` read `rack-v49`.

**What nobody has seen.** Nothing in this ship has been on a phone or in a
browser. The card's earned line, the "More" chip, the three new answers after a
workout, *How am I tracking toward my goal?* with the focus chips under it, the
Focus rows and the Lift target row in Settings, the *did your goal change?*
question and the Your goal sheet it opens, the onboarding step and the Basic
teaser were all driven through `coach-surface.mjs`'s DOM shim, which has no box
model and never loads `rack.css`. No new CSS was written: the Lift target row
reuses `.field`, `.row-split` and the existing `.btn` class lists (so
`touch-target.mjs` holds unedited), and "More" is an ordinary `.coach-chip`.

**Four things the build changed about the brief's rules**, each forced by a
case, each in §52 with the case:

1. **A normal is read over whole weeks only.** The brief's "sets in days 14–70
   / 8" counts the weeks before a young log began as zero-set weeks, and on
   C6's eight-week log that read an ordinary fortnight as a 33% spike — a
   fatigue call on a lift that was simply level.
2. **A lift moving up past its own noise is not "flat"**, whatever
   coach-prog.js's status says: `readLift` returns `none` (`because: 'rising'`)
   rather than read a plateau into a climb.
3. **The brief's own weekly line was ten words** under its own nine-word limit,
   so it was silently never shown. It reads "4 sessions in seven days, most in
   five weeks." now.
4. **"How are my lifts moving?" waits for the card's thin bar** (three
   sessions, three in the window). On two sessions it said "too soon to call
   (1 session)", true and exactly the thin-account talk the silence verifier
   exists to stop.

**What is not done**, all of it in BACKLOG.md under *What v49 left open*: the
stage-four and stage-five work the brief fenced off; the performance cost of the
card (§55); and the handful of small calls listed in §54.

---

## 50. WHAT GOT BUILT

```
coach-prog.js     926 lines  was 887. ADDITIVE: baselines() also returns series, lastBestAt,
                             moveLb, freq, topReps, tops, best and assisted. Nothing it
                             returned before moved; prescribe() is byte-identical to v48's.
coach-overlap.js 1,096 lines NEW, PURE. prepare(), readLift() (the call and the ladder),
                             lighterWeek(), recordDay(), liftsMoving(), and the stage-three
                             reads that need coach-prog.js: targetsReplay(),
                             compareSession(), nextTargets(), liftTrend(), goalLiftRead(),
                             bigThree(), focusRead(). Every sentence of stage two.
coach-goal.js     287 lines  was 118. energyBand() (energyContext reads through it), bwAt(),
                             the volume floors, AIM_DIR, normGoalLift(), paceFor(),
                             weeklyBands(), goalChecks(). Still imports nothing.
coach.js        4,108 lines  was 3,058. Category rest; fsets on the shaped session; the
                             overlap input; facts, intents, routes and responses for both
                             stages; stateOf(); the HYPE registry and c.card; state-aware
                             topics; the three new questions and the machinery they need
                             (stale, text as a function, settings: false); normSettings
                             adds goalLift; the Basic teaser; goalChoices().
coach-data.js                rateSeWk passed through; recentHype and rememberHype()
                             (device storage, coachHype); setAim(); setGoalLift().
coach-ui.js                  the cards read c.card; "More"; the teaser; the aim through
                             setAim(); "Yes, update my goal" opens Your goal;
                             Your goal gains Focus (automatically, `always`) and a
                             Lift target row; openGoalSheet().
onboarding.js                "What are you training for?" after the weight-goal step.
sw.js, usage.js              rack-v49.
```

Commits, each passing every verifier in three time zones:

```
ed26a0b  coach-prog.js additions (+ coach-goal.js's bwAt, energyBand, volume floors)
4a495da  coach-overlap.js + its battery (+ the staging edit everywhere; coach-pure J)
89e82c4  Phase A wiring: ask_lifts, ask_record_day, ask_lighter, stalled_lift reconciled
3e732f5  Phase B: states, card + hype, topics, compare/next, goal pace + goalLift + focus,
         goal checks, onboarding, teaser
119205b  Phase B verifiers: coach-hype, coach-state, coach-pace, the card ban
8e07907  coach-overlap.js memoised on its input (performance, §55)
c1cd0ba  rack-v49
         docs
```

**Phase A — stage two.** `readLift()` is §3.3 of the brief, row for row: the
read window is the last six weeks of the lift's series (light weeks out), four
points across three weeks or `none`; "flat" is status stalled or declining, or
no new best in three weeks — which is what makes a lift trained twice a week
readable at all, since v48's status can never call it stalled. Relative
strength decides a cut, and past a 5% drop it is a slide. The ladder is §3.5,
the lighter week §3.7, the record day §3.8, the sentences §3.9 with the review's
rules ("level" only inside his noise, "at steady bodyweight" only when it held,
"a real plateau" only past five weeks, "cut" only under the rule).
`stalled_lift` keeps its id and its fact and now also needs a reading of the
same lift, which it answers with; *Anything stalled?* reaches it as before.

**Phase B — stage three.** `c.you`, `c.train` and `c.opening` are exactly what
v48 computed; the cards read the new `c.card`. The twelve earned lines are the
brief's table. The sheet's topics are the brief's §6 table per state. *How did
today compare?* and *What's next time?* read the latest session in `post` or
`done_today`. The goal answer is §7.3's five parts. `goalLift`, `q_focus_group`
and the two goal-change questions are §7.1, §7.2 and §7.4.

---

## 51. THE BATTERIES — every row

### 51.1 `tools-check/coach-overlap.mjs` — stage two

**No row's expectation was changed; two fixtures were, each because it did not
state the row's facts** (below). Every row's reading, as the engine says it:

| # | call | the reading |
|---|---|---|
| C1 | holding_cut | Your estimated max on Barbell Bench Press is level at 264 lb, and for your bodyweight it’s up 4% while your weight has come down about 6.7 lb. Per pound of bodyweight, that’s holding. |
| C1b | holding_cut | … while you’ve lost 6.7 lb. In a cut, that’s the win. |
| C2 | sliding | Back Squat (High Bar) is down 8% over 6 weeks while you’ve lost about 2 lb a week, faster than the 1 lb a week you set. (evidence: per pound it is only 1% down — row 3's `abs ≥ −0.05` is what makes it a slide) |
| C3 | plateau / volume | Barbell Bench Press has been level at about 263 lb for 5 weeks at steady bodyweight, training it about twice a week. That’s a real plateau. +4 sets a week for chest would reach a common starting point of 10. |
| C3b | plateau / variation | … for 9 weeks … You’ve done Incline Dumbbell Bench Press before. A few weeks of it is a common way through a flat stretch. |
| C3c | plateau / reset | … level at about 259 lb for 4 weeks … Coach’s target keeps the weight until your reps are back in range. (prescribe() says hold; no "a real plateau" under five weeks) |
| C4 | irregular | Barbell Bench Press is level, and you’ve done it 3 times in the last 4 weeks against your usual 1.6 times a week. |
| C5 | fatigue | Barbell Bench Press has been level for 11 weeks while your chest sets ran 40% over your usual. A lighter week is a common way through: about 5 chest sets instead of your usual 10, the same weights, then back to normal. |
| C6 | unknown | Your estimated max on Barbell Bench Press has been level at about 264 lb for 7 weeks. Coach needs a couple of weigh-ins near the start and the end of that stretch to tell whether your weight is part of it. |
| C7 | none | and, end to end, no stall, plateau, flat or level word anywhere on the sheet |
| C8 | none | (three sessions: "too soon to call (3 sessions)" under *How are my lifts moving?*) |
| C9 | plateau | the C3 log at three a week (v48's status reads `holding` there) |
| C10 | holding_cut | C1 at three a week |
| C1@2 | holding_cut | C1 at two a week — the brief asks for a C row at 2× and one at 3× |
| C11 | none | a best two weeks ago |
| C12 | plateau | Back Squat (High Bar) is down 7% over 5 weeks while your weight has gone up about 2.5 lb, training it about twice a week. That’s a real plateau. — Micah's case: never "level", never "steady" |
| C13 | holding_cut | C1 on Build muscle with no food direction: never "cut" |
| P1 | record | Good day for 6 at 225 lb on Barbell Bench Press, one more rep than your best there. |
| P2–P5 | none | a hard cut; a best set that was a single (one more is a double); an F last time; last done 14 days ago |
| L1 | lighter week | A lighter week is a common approach here: about half your usual sets (for you, about 1 for chest, 2 for back, 1 for legs and 2 for arms), the same weights you’ve been using, then back to normal. |
| L2 | none | a big fortnight alone; and two lifts declining three weeks after a light week (without that light week the same log IS offered one) |

**Fixture choices where a row left a detail open.** Dates are offsets from a
fixed epoch at a fixed local hour. C1's ten exposures are one a week, then two
(45, 38, 31, 27, 24, 20, 17, 13, 10, 3 days back), each top set one of 225×5,
230×4, 220×6 (estimated maxes 263, 261, 264 — no point 1% over any earlier
one). Weigh-ins are daily, straight lines between the row's two numbers. C3's
bench climbs 2.5 lb a session to 225×5, then holds; flyes beside it stop four
weeks ago (so chest sets fall under both his normal and ten), and a steady back
and legs week runs alongside so that dropping the flyes never makes a whole
week "light". C12's loads fall 329 → 304.5 estimated (7.4%) over five weeks
while weigh-ins climb 180 → 183.

**The two fixtures I corrected**, neither of them a rule: C4's first version
stopped all his other training too, which made those weeks genuinely light by
the brief's rule (the row is about bench); C12's first loads fell 6.4%, not the
row's 7%. In the other new verifiers, three fixtures of mine were wrong the
same way and were fixed the same way: a lift-target log that closed 44% of the
gap where the row wanted over half (`coach-hype.mjs`), a perfectly straight
climb with no spread to make a range of (`coach-pace.mjs`), and a "More"
fixture in the post-workout state, where You has only four topics
(`coach-surface.mjs` M).

**The properties**, over 2,200 generated histories (1,100 per unit; one to four
lifts at one to three sessions a week, rising, level and falling, weigh-ins
falling, holding and climbing and sometimes absent, a lift done far less lately
now and then): deterministic; order-blind (sessions and weigh-ins reversed);
weigh-ins moving bodyweight down in the week before the window's end never
turn `holding_cut` or `small_slide` into `plateau`; no weigh-ins never yields a
call that needs them; a record day never under three reps, never at a load not
logged in four weeks, never after an F; and no sentence with a banned word, a
causal word, "eat", a crossed unit or a straight apostrophe (4,000+ strings,
both units). Every call occurs in the sweep. Section D drives the wiring end to
end through `coach()`.

### 51.2 The other new verifiers

- **`coach-hype.mjs`** (89 checks): each of the twelve lines earned on a log
  built to its gate and not on the nearest one that should not, both units,
  real library names; nine words, one number, no "!"; the card ban (read from
  `coach-voice.mjs`); a name too long to fit is not said; the targets replay
  against `prescribe()` by hand, with a squat done twenty days earlier whose
  group (leg press) trained three days before — so its target is a hold, not a
  re-entry; rule 3 and rule 4; rotation on pools of one, two, three and five.
- **`coach-state.mjs`** (39): `stateOf()` at 2:59, 3:00 and 3:01, across local
  midnight, with and without `endedAt`, a future end, live; the topics in every
  state on both surfaces against `STATE_TOPICS` filtered by what answers.
- **`coach-pace.mjs`** (52): a lift target's range, reached, not moving, past
  six months, a 225 × 15 target reached once 225 × 15 is logged, a target on an
  unlogged lift, kilos; the bodyweight range from the trend's own error (±25%
  without one), the figure alone past the band, moving away, reached, absent;
  never a date; the big three and their total; the focus readout; no aim;
  `normGoalLift` on 21 junk values; G1–G8, with G6 driven through the real
  `coach-data.js` against a stub store.
- **`coach-prog.mjs` D**: the new fields consistent with status on every row
  and every swept history; `prescribe()` and every old `baselines()` field
  byte-identical to rack-v48's own file read out of git.

---

## 52. WHAT I CORRECTED, AND WHY

In the order they were found.

1. **Whole weeks only, in every normal** (`coach-overlap.js` `blocksOf`). The
   brief's §3.4 normal is "hard sets in days 14–70 / 8". On C6 — bench twice a
   week for eight weeks, nothing else changed — two of those eight weeks are
   before his first session, so the normal came out 4.5 a week against a real
   6, and the last fortnight (6 a week) read 33% over it: a `fatigue` call on a
   lift that was simply level. C10 did the same at three a week. A week the log
   does not fully cover is now neither counted into a normal nor ever called a
   light week. The same fix stopped C12's first week, which the log only half
   covered, from being called light and dropped.
2. **Frequency in the plateau sentence is read over the window** ("training it
   about twice a week"). §3.9 names no source; `freq.normal` is over twelve
   weeks, and C12's squat — five weeks old, twice a week — read "about once a
   week".
3. **A lift climbing past its own noise is not flat** (`because: 'rising'`).
   `flat` includes "no new best in three weeks", and a lift can clear that and
   still be up 3% over the window. The sentence would have said "up" beside "a
   real plateau". *How are my lifts moving?* says how much it is up instead.
4. **Estimated maxes print as whole pounds.** A median of two points can land
   on a half, and `coach-units.mjs` (which must pass unedited) failed on "221.5
   lb" because its rate-band check is a substring test for "1.5". Every e1RM
   the app prints is already whole (analytics rounds them); 263.5 was a
   precision the estimate never had.
5. **The record day's load prints through `labelW`, not `fmtSetLoad`.**
   `units.mjs` requires every `fmtSetLoad` site to be classified, and the brief
   allows only the staging edit there. A record-day load is on the half-unit
   grid by construction, where the two print identically in both units.
6. **The weekly line**, ten words under a nine-word rule (§49). "4 sessions in
   seven days, most in five weeks."
7. **"What's next time?" has a header**, with the targets as its bubbles — the
   shape *What should I lift today?* has. `coach-units.mjs` renders every route
   in both units and requires a weight in one to be a weight in the other; a
   pound-typed log is, by the targets' own grid rule, targeted differently on
   kilos, so no weight may ride in the headline.
8. **The card's lead question comes from topics the state's sheet offers.**
   After a workout the You sheet drops *How's my training?* for *How did today
   compare?*, and the card was still prompting the one the sheet no longer had.
9. **"How are my lifts moving?" waits for three sessions** (§49).
10. **The engine got 3× slower on a card paint**, and was brought back to
    about 3× v48's instead of 10× (§55).

---

## 53. WHERE THE BRIEF WAS WRONG ABOUT THE CODE

1. **"How are my lifts moving? takes [ask_stall's] place in the topic
   tables."** `ask_stall` was never in a topic table — only in two `FOLLOWUPS`
   lists (after *How's my training?* and *Any records lately?*). It stays
   there, reaching the reconciled `stalled_lift`; *How are my lifts moving?*
   went into the Train table where §3.10 lists it, and into You's.
2. **`coach-units.mjs` pins the stall answer to a weight figure.** It must pass
   unedited, and it reads `ask_stall`'s text for an "N lb" matching `labelW`,
   and requires every response quoting `lift.stalled` (a pound fact) to call a
   formatter. The brief replaces the figure-and-date with the reading's
   sentence. Both hold: the readings name the estimated max through `labelW`
   ("down 11% over 5 weeks, to 233 lb"), and the standing best rides in the
   evidence ("Your best estimated max on it is 263 lb.").
3. **`coach-voice.mjs` section F pinned the old stall sentence** — the
   figure, "last matched", and a clause when the goal pointed down. It is
   rewritten (the brief lists coach-voice for "the new answers"), with the
   reason at its head.
4. **"`update` opens Settings → Coach → Your goal."** `settings.js` imports
   `coach-ui.js`, so the sheet cannot reach into Settings without a ring. It
   opens a Your goal sheet drawn by `coach-ui.js` — the same rows, the same
   writers. Settings still draws them inline.
5. **§7.3's "more than 6 months".** `coach-units.mjs` refuses any typed digit
   in `coach.js` copy that is not a count of days or weeks. "More than six
   months at your last 12 weeks’ rate."
6. **§5.1's examples meet short names the library does not have.** "Halfway to
   a 315 bench" became "Past halfway to your Barbell Bench Press target." (the
   figures in its evidence); "Up 3 lb in four weeks, right on pace." became the
   weekly rate the fact actually is: "Up 0.5 lb a week, right on pace."
7. **"Hard sets" include cardio sets** — the shipped count files a treadmill
   under legs. The brief is explicit that the shipped count is the one to use,
   so it is; BACKLOG has it.
8. **The brief lists no home for the stage-three reads that need a target
   replayed or a lift's series** (compare, next, the targets met, pace).
   `coach.js` may import only `coach-overlap.js` among the new files, so they
   live there, in their own labelled section.
9. **`coach-rotation.mjs` could not keep its "dropped line comes back" check
   on the full log**: the only recency greeting that log earned was
   `g_since_group`, which left the pool. The check moved to the log with plenty
   to say, where "Logged already today." does the same job.
10. Confirmed true, for the next brief: v48's status is never `stalled` at two
    sessions a week (checked: C9 reads `holding` there); `trendRate()` already
    returned `seWk`; `pendingQuestion()` skipped every answered question
    (§7.4.1); `q.text` was a static string drawn by `coach-ui.js` (§7.4.2);
    `coachAnswerRows()` drew every answered non-`always` question (§7.4.3).

---

## 54. EVERY ASSUMPTION I MADE

**Stage two**

- The read window and its end are taken after light-week points are dropped, so
  its last two points are always real sessions.
- A light week needs four whole weeks with a session among weeks three to ten
  before there is a "usual week" to be light against.
- "Weeks 4–12" in the volume rung is weeks five to twelve (blocks 4–11): the
  four before are its "last 4 weeks". The lighter week's per-group normals are
  weeks three to twelve (the spike is the last two).
- The lighter week's F-share test uses the same 2% floor the group-fatigue test
  does. Its "usual week" for condition 3 leaves light weeks out, so a deload
  cannot make an ordinary week look big.
- "Since the last light week", with none in the log: satisfied only when the log
  itself reaches back six weeks.
- Grinding is judged at the last session's top load; a reset is offered only
  when `prescribe()` really says hold or reduce, and otherwise the rung reads
  "wait". With the targets switched off, "wait" drops "so the targets stay".
- A variation candidate's equipment is the library's; the lift being read must
  itself carry a pattern (a custom exercise does not).
- Assisted, bodyweight and cardio lifts are never read, never a record, never
  on *How are my lifts moving?* — an assisted lift's estimated max runs
  backwards, a bodyweight lift has none.
- The record day's "best reps at L" is over every non-drop working set at L in
  the whole log; its 25th-percentile rest is rounded up (the cautious way).
- `readLift`'s "cut" wording counts `weight.goalDir` −1 whether it came from his
  food targets or from his answer to *Which way are you trying to go?*.

**Stage three**

- The latest session is the one that ended last. `post` includes an end later
  than now (a clock skew reads as just finished).
- A card shows an earned line before Basic's locked state (encouragement is
  both tiers'); the Train card takes a training line the You card is not
  showing, and fuel and weight lines are the You card's only, as their findings
  always were.
- "Within three days" is up to three days back, inclusive, for the record, the
  targets met and the milestone; "≤ 2 days old" for the comeback line.
- `hype_targets_met` is Pro only: a Basic account never saw the targets it
  would be congratulated on meeting — the one exception to rule 7.
- The greeting still steps around the ranked finding, not the card's line —
  which can echo ("… is moving." over "New best on …"), and leaves every
  greeting rule `coach-rotation.mjs` pins exactly as it was.
- A pace with no spread (a perfectly straight log) is a one-number range:
  "about 5 weeks".
- The bodyweight range is `rate ± rateSeWk` (±25% without one), rounded up;
  with the slow end at or under zero, "at least N weeks".
- The goal-change checks read three fixed seven-day blocks back from now; a
  block end with fewer than two weigh-ins in its week is no reading and no
  question. "Twenty-one days of weigh-ins" is the span from the first to the
  last. An aim with no `asked` stamp (none written since v48) counts as old.
- A stale "temporary" that is asked again and ignored goes quiet for another
  28 days (its stamp moves when it is shown), not the week an unanswered
  question gets.
- The answers he gave to a goal-change question are said back under *How am I
  tracking toward my goal?* — "and you told Coach that’s on purpose" — which is
  what makes `changes: ['goal_pace']` true.
- `goal_pace` needs a readable log, and lives in the "Stalls and records"
  category.
- The Lift target select lists thirty lifts at most, most-logged first; a
  target on a lift older than six months still shows, by its id.

---

## 55. WHAT IS NOT DONE, AND WHAT NOBODY HAS SEEN

1. **Nothing has been seen on a screen** (§49). The one layout I would look at
   first is the Lift target row — a select, then weight and reps side by side
   (`.row-split`), then Save and Clear — at 375 px, and the seven focus rows
   under the aim's six in Settings, which make Your goal long.
2. **The card costs more.** On a year-long, 200-session log in node, v48 paints
   a card in about 2–3 ms; v49 in about 8 ms after the memo (24 ms before it).
   The earned lines read every lift — its baselines, its reading — on every
   paint, and v48's `baselines()` date arithmetic is most of what remains. A
   per-open cache in `coach-data.js`, or building the card's pool only when a
   card is drawn, would win most of it back.
3. **Stage four and five** are untouched, as the brief says.
4. **Native was not read.**

---

## 56. MICAH'S DECISIONS, 23 SEP 2026 — carried forward

Rows marked BUILT landed in v48 or tonight; the rest are recorded, not built.

| # | Question | Answer | Where it lands |
|---|---|---|---|
| 1 | Labelled training-science starting points? | **Yes, training only** | BUILT (v48): default bands and steps. v49 adds the volume floors and the lighter week, each labelled "a common starting point" / "a common approach" |
| 2 | The goal set | **The five, plus Powerlifting** | BUILT (v48). v49: Powerlifting's big three and total in goal pace |
| 3 | Card becomes encouragement only? | **Yes.** Findings move to the sheet's opening | **BUILT (v49)**: `c.card`, the HYPE registry, the card ban; `c.opening` unchanged |
| 4 | Coming back after time off | the group's clock, 12 days | BUILT (v48); v49's targets replay reads the group's clock as of that session |
| 5 | Two sessions at the top before adding weight | As proposed | BUILT (v48) |
| 6 | No targets for singles or lone heavy top sets | Yes | BUILT (v48); v49's record day never proposes a single or a double |
| 7 | General nutrition science in fuel answers? | No, own data only | Stage 4 |
| 8 | Learning whether rest advice was taken | replay, save nothing; a per-group recovery window | Stage 4 |
| 9 | Save answers about how you feel? | a mark on a bad session | Stage 4 — *How did today compare?* says the numbers and what Coach cannot see |
| 10 | Cut-speed thresholds | As proposed | BUILT (v48); v49's `energyBand()` is the one place they are compared |
| 11 | Say "carb-loaded"? | No | Stage 4 |
| 12 | Stage order | As proposed | stages two and three tonight |
| 13 | Coach reads the water log? | Not yet | — |
| 14 | Which Start button leads | *Start with Coach’s targets* | BUILT (v48) |
| 15 | Targets Pro only? | **Pro, with one teaser** | **BUILT (v49)**: Basic sees one real target above the Pro panel |
| 16 | When rest comes up | answered when asked, and a gentle card line after three days running | **Card line BUILT (v49)**: "Three straight days. A rest day is well earned." — "Great session" left out, because Coach cannot know it was. The rest answer itself is stage 4 |

**Decided in the brief, recorded here:** the **§40a trade** (sets past twelve
reps count as twelve in the estimated-max series) is **accepted by Micah** —
decided, not open. **Your goal stays Pro-only** in Settings; the onboarding step
asks every account, because tier can change and setup is where goals belong.

---

## 57. IF THE NEXT RUN READS ONE THING

`tools-check/coach-overlap.mjs`, and the rule it found: **a normal is only as
honest as the weeks it is read over.** The first fatigue false-positive tonight
came from dividing an eight-week log by eight weeks of "normal" that included
two weeks before the account existed — and it would have told a lifter who was
simply level that he was overdoing it. Stage four's readiness and stage five's
volume bands are built out of exactly these normals. Read `blocksOf()`'s
comment before writing another one, and keep `wrong: 0` fatal.

## 58. AFTER THE WALK, 24 SEP 2026 — rack-v50 and rack-v51

Micah walked rack-v49 on his phone the morning after. Two things read wrong,
both on the goal screens, and both are fixed.

- **rack-v50, the Lift target row.** The reps box sat unlabelled beside the
  weight with a 1 already in it; he read the 1 as the target weight, and "1 to
  20" as a weight limit. The row now opens with a line saying what it is, each
  box has a caption ("Target weight (lb)", "Reps at that weight"), and the
  focus question says what Coach does with it. `coach-ui.js` only.
- **rack-v51, a raw status word.** "How am I tracking toward my goal?" printed
  coach-prog.js's status beside each focus-group lift and each of the big
  three: his bench, trained twice a week, read "Barbell Bench Press is
  holding". `holding` is the status for "too few sessions spread wide enough to
  call" — and §3.1 of the v49 brief already said a twice-a-week lift reads it
  for months — so a reader takes it as "keeping its strength" when it may be
  flat or falling. v48's rule is that a status is never printed; the v49 brief
  asked for "statuses" there, which was the brief's error. `coach-overlap.js`
  gains `wordOf()`, which says in a word what "How are my lifts moving?" says in
  a line (climbing, level, level lately, coming down, holding steady, too soon
  to call), and the focus line counts whole sets ("9.8 sets a week" read as a
  typo). `coach-pace.mjs` section C is updated deliberately and pins both.

---

# COACH TRAINER — stage four: rest, recovery and fuel (rack-v52)

## 59. READ THIS FIRST — rack-v52, and what is not done

Written at the end of an unattended run in `~/dev/ship-v52` (a fenced, full
clone at rack-v51, `99b49ea`), against `SHIP-V52-PROMPT.md`, with
`COACH-TRAINER-SPEC.md` §0, §1, §4, §6.4, §9.2, §9.3, §10.3 and §12 read first
as the brief asked. The fence was proved before anything else: `echo GUARDTEST
ping` was refused. Shipped as `rack-v52`. **Not pushed.**

**Both phases are built, in the brief's order.** Phase A (with its groundwork,
`targetFor()`) was built, verified in three time zones and committed before a
line of Phase B was written. Every verifier exits 0 under
`TZ=America/New_York`, `UTC` and `Pacific/Auckland`: **40 of them, two new**
(`coach-ready.mjs`, `coach-fuel.mjs`).

- `coach-prog.mjs` **57 / 0 / 0**; `coach-overlap.mjs` **24 / 0 / 0**.
- `coach-ready.mjs` **ok 46, miss 0, wrong 0**; `coach-fuel.mjs` **ok 16, miss
  0, wrong 0**.
- With no marks stored, `prescribe()` and `targetFor()` are byte-identical to
  rack-v51's `prescribe()` on all 57 rows and on 4,400 generated histories
  (`coach-prog.mjs` D, against v51's own file read out of git).
- A card paint on the year-long, 200-session fixture: v51 **3.6 ms** Pro /
  **9.9 ms** Basic, v52 **3.9 ms** / **10.4 ms** — +0.3 and +0.5 ms against a
  +1 ms budget. The paint spy is green (§66).
- The replay, which runs only inside an answer: **about 55 ms** median on the
  same log, against the brief's 150.
- `database.rules.json` is byte-identical to rack-v51. `sw.js` and `usage.js`
  read `rack-v52`.
- The §9 spy counts hold (§61.3).

**What nobody has seen.** Nothing in this ship has been on a phone or in a
browser. The caution bubble and its two chips, the rest and lighter answers,
the readiness list, the mark chips and *Clear the mark*, the "Reading your food
log…" bubble giving way to the answer, and the two fed chips were driven
through `coach-surface.mjs`'s DOM shim (section N), which has no box model and
never loads `rack.css`. The food reads ran against a stubbed store
(`coach-boot.mjs` H), never against Firebase. No CSS was written: every new
thing is an existing `.coach-chip`, `.coach-chips` or bubble.

**Four places where I departed from the brief's rules.** Each one was forced by
a case, and §62 has the case:

1. **`coach-overlap.js` is not "exports only".** The brief says so in §2, and
   §5.2 says "nothing calls `prescribe()` for a target directly any more".
   Three bodies in that file called it, so they now call `targetFor()`. The
   four newly exported functions are byte for byte.
2. **A reduce may not span a mark.** Dropping a marked session in the middle
   of a lift's log can join two misses on either side of it into "two misses
   in a row". That would make the mark count against him.
3. **The stage-`none` window sentence** read "you usually give them 2 days",
   which is a habit Coach has not seen. It now reads "Coach gives them 2 days
   or more (a common starting point until Coach knows your gaps)."
4. **A marked target's line** says "before your marked session" where it said
   "last time". On a lift whose only session is marked there is no target
   before it, so none is given.

**What is not done**, all of it in BACKLOG.md under *What v52 left open*: the
brief's §12 list, the replay's learning (decision 17), and the small calls in
§64.

---

## 60. WHAT GOT BUILT

```
coach-ready.js     899 lines  NEW, PURE. Recovery windows and the big day (lifting sets only),
                              streaks and the usual run, the fatigue flag, the rest read and its
                              pick, the replay, readiness's training rows, what was different
                              about a session, every rest sentence. Never imports coach-fuel.js.
coach-fuel.js      453 lines  NEW, PURE. Complete days, the food phase, day and by-hour
                              baselines, logging style, the fueled read and its five states, the
                              food rows for readiness and a session, fuelDates(). Imports
                              coach-goal.js and units.js only.
coach-prog.js    1,004 lines  was 926. ADDITIVE: targetFor(ex, ctx, mark). prescribe() untouched.
coach-overlap.js 1,155 lines  was 1,122. quantile, blocksOf, lightOf, groupDaysAt exported (bodies
                              byte for byte); rungOf, nextTargets and targetsReplay name targets
                              through targetFor(), with markBefore() for a replayed morning.
coach.js         4,787 lines  was 4,111. The marks and the two logs; lsets/lfsets/ldrop on the
                              shaped session; the readiness category; seven selectors, one
                              question, routes, topics, follow-ups; the rest-aware pick and
                              buildFocus; c.buildCaution; the mark on the compare answer; the
                              fuel input and fuelDays(); normSettings() keeps marks.
coach-build.js     743 lines  was 729. Focus falls back to the rest read's default; targets
                              through targetFor(); two reason lines.
coach-data.js      699 lines  was 617. markSession(); patchNow() merges and prunes marks;
                              loadFuel(), fuelNeedsRead(), foodLog into coachInput().
coach-ui.js      1,276 lines  was 1,171. The caution before a proposal; the mark chips; the fuel
                              wait; an answer's `more` drawn after repeats too.
sw.js, usage.js               rack-v52.
report/coach-paint/bench.mjs  NEW. The paint benchmark, v51 against the tree; not a verifier.
```

Commits, each passing every verifier in three time zones:

```
a585805  coach-prog.js: targetFor() — a marked session never counts against him;
         coach-overlap.js names every target through it
1afc978  Stage four, Phase A: coach-ready.js — rest, recovery, readiness, what was
         different, and the bad-day mark
0e9e705  Stage four, Phase B: coach-fuel.js — "Am I fueled?", and the food rows beside
         readiness and a session
ed2b45b  rack-v52
         docs
```

**Phase A: rest, recovery and the bad day.** `restRead()` is §4.4 row for row.
A group's window is the 25th percentile of his gaps between training it
(rounded up). After a day that was big against his own normal, the window is
one more than that, or his median gap if longer. Until a group has four
training dates, the window is the labelled starting point of 2 days (3 after a
big day). The call is one of four:

- `rest`: nothing he usually trains is recovered.
- `lighter`: two fatigue signs.
- `group`: none of his shapes is recovered but a group is.
- `shape`: the shipped pick among the recovered shapes, with `.skipped` when
  the stalest one is not recovered.

`session.shapeOverdue` is that pick, or null on a rest or group call, so no
answer names an unrecovered shape as the one to train. `buildFocus` is the one
builder default. *Build it*, *Tell me what to train*, the targets and the
teaser all read it.

The replay walks the last 84 mornings. It reports what he did on the flagged
ones and moves nothing. Readiness is the §4.6 list, and it stays silent under
three rows with data.

A mark is `settings/coach/marks/{id} = { r, d }`. `coach.js` builds two logs
from the marks in one place: the full log (when, how much) and the performance
log (how strong). `targetFor()` reads the mark, and the compare answer asks for
one when a session came in below his usual.

**Phase B: "Am I fueled?"** `fueledRead()` answers in one of five states:

- `thin`: under five recent days of food;
- `empty`: nothing logged today;
- `unread`: today's summary shows food but the read failed or came back empty;
- `day`: batch logger, or no usable by-hour read;
- `read`: today so far against his by-hour curve on training days.

Its day lines say which days were complete, and which were "not fully logged".
It never says a day was low. The food rows join readiness (the `fuel` row) and
*How did today compare?* (up to two food rows among the three kept). With
Patterns on, the compare answer adds one T2 line from the eight registered
comparisons.

The reads are lazy (§61.3). "I ate, it’s not logged" and "I haven’t eaten" are
chips that store nothing. `q_log_timing` is asked once, and only of an account
whose entries look batch-logged.

---

## 61. THE BATTERIES — every row

### 61.1 `tools-check/coach-ready.mjs` — Phase A

**No row's expectation was changed.** Five fixtures were, each because it did
not state the row's facts (§62). Every row's reading, as the engine says it:

| # | the reading |
|---|---|
| R1 | Of the 2 session shapes that recur for you, chest, back and shoulders day has waited longest. *Build it* builds that shape |
| R1b | … chest, back and shoulders day has waited longest of what’s recovered. / Your legs and core day has waited longer, but legs are inside their recovery time. |
| R2 | the 24 leg sets were treadmill and bike: legs ready (window 3, since 5), no caution, the shipped pick |
| R3 | Today looks like a rest day. Chest, back, legs and shoulders were all trained today and yesterday, and you’ve trained 4 days straight (your usual longest run is 2). Chips: *Train anyway*, *What should I lift today?*, and no *Build it* |
| R4 | Today looks like a lighter day, or a rest. / 5 days straight; your usual longest run is 3. / Back Squat (High Bar) and Barbell Bench Press are coming down lately. / 51 sets in the last 7 days; usually about 39 a week. / A common approach on a lighter day: the same weights, fewer sets. / If you train, your arms and core day is recovered. / Of the 24 days your log looked like this, you rested on 23. / Coach can’t see sleep, stress or soreness. |
| R4b | the pick is a group: *Build it* builds `group:core` |
| R5 | the streak sign alone: call `shape`, the normal pick |
| R6 | `rest` muted: every Phase A answer silent; ask_shape, the builder and the targets identical to v51's |
| R7 | five sessions: `restRead` null; "Nothing to say about your training yet." |
| R8 | Arms was trained yesterday; Coach gives them 2 days or more (a common starting point until Coach knows your gaps). |
| R9 | Legs had a big day yesterday: 24 sets against a usual 12. Coach would give them another day. Chips *Build legs anyway* and *Train something recovered* |
| R10 | a recovered pick: no caution |
| R11 | Legs is recovered. Chest, back, shoulders and core were trained yesterday. *Build it* builds `group:legs`; the targets answer reads "Targets for your legs day." |
| R12 | Of the 6 days your log looked like this, you rested on 2. / You’ve trained through days like this 4 times and held your numbers on 4. |
| R13 | … you rested on 0. / You’ve trained through days like this 5 times and held your numbers on 4. The call, windows and pick equal the same log without the replay |
| R14 | The last 4 times you trained through a day like this, your top sets came in under your usual on 3. |
| R15 | on `group` and `rest`, `session.shapeOverdue` is null and nothing names the unrecovered shape |
| R16 | streak 3 against a usual run of 4: no recovery line on the card; at 4, the line |
| R17 | two sessions on one date are one day in every streak and window |
| R18 | Targets for your legs day. · Today looks like a rest day. These targets keep until your next session. / Several things in your log are off your normal today. If the first set moves slowly, staying at last time’s weight is a common approach. / (the four targets, each identical to v51's) |
| R19 | on `rest`/`lighter`, *Good day for a record?* is silent and `hype_week_best` is off the card |
| R20 | always to failure (three F sets every leg day): a normal leg day is not big (window 3) |
| R21 | no recurring shapes, every group ready: the recovery row reads "None of your usual sessions is fully recovered today." unflagged; call `group` |
| R22 | Legs was trained yesterday; you usually give them 3 days or more. (the caution, when *Tell me what to train* builds the shipped, unrecovered shape) |
| D1 | Nothing in your log is off your normal today. / Coach can’t see sleep, stress or soreness, and those count most on a day like this. |
| D2 | Two things are different today: / 5 days straight; your usual longest run is 3. / 51 sets in the last 7 days; usually about 39 a week. / (the unseen line) |
| D3 | Several things in your log point to a lighter day. / 5 days straight; your usual longest run is 3. / 17 sets taken to failure in the last 7 days; usually none. / A common approach on a lighter day: the same weights, fewer sets. / (the unseen line) |
| D4 | two rows with data: readiness silent, *Should I rest or go lighter?* not offered |
| D5 | This morning’s weigh-in is 4 lb under your last week. A drop that size is usually water, which Coach can’t see. (kilos: 1.8 kg) |
| D6 | `readiness` muted, `rest` on: *Should I rest or go lighter?* answers with the rest answers only |
| D7 | 2 of your last session’s targets weren’t reached. |
| D8 | It’s 1:45 pm; you usually start between 9 am and 10:30 am. |
| X1 | Below your usual today, across 3 lifts: 3 of them. / (three lift rows) / 0 of 3 Coach targets met. / Nothing in your log was off your normal. / Coach can’t see sleep, stress or soreness. + `a.mark` |
| X2 | Above your usual today … / What was different in your log: / It started at 6 am; you usually start between 4 pm and 6 pm. / 46 sets in the 7 days before it; usually about 37. / These are differences, not causes. / Coach can’t see sleep, stress or soreness. |
| X3 | five components past the bar (rest 5.4, week −8.3, start −7.4, length −5.4, weigh-in −1.5): the three kept are week, start, rest, by \|z\| |
| X4 | a component with seven reference values is skipped |
| X5 | About your usual today, across 3 lifts. — no `a.mark` |
| M1 | the target from before: add, 3 × 8 at 190 lb, never 185 and never a reduce. Why: "Your last session is marked (slept badly), so this is the target from before it." / "That session doesn’t count against your numbers." Builder: "Worked out from before your marked session." |
| M2 | two misses at 185, the second marked: hold, 3 × 8 at 185 lb, with the two mark lines |
| M3 | two unmarked misses: reduce, 3 × 8 at 180 lb (A5) |
| M4 | declining on the full log; holding on the performance log |
| M5 | the marked session still counts for days since, streaks, sets and windows: "Built from yesterday’s session — your most recent chest, back and shoulders day." |
| M6 | a mark 183 days old: ignored (hold / add) |
| M7 | no marks: identical |
| M8 | each ack word for word; *Nothing* writes nothing; one write of `{ r, d }` per mark to `settings/coach`; *Clear the mark* removes the key; every write prunes past 182 days |
| M9 | a marked session in the middle: the target from the later sessions (add at 190, hold at 185), the marked one neither a miss nor a success |

**The properties**, over 2,000 generated histories across both units:

- Every call occurs: 1,071 rest, 81 lighter, 168 group and 673 shape reads.
- Deterministic.
- Order-blind.
- Cardio: adding cardio sets under any group moves no window, no big day and no
  readiness row, and never what is recovered.
- Food-blind.
- One builder default, with every answer in voice and a way on from every rest.
- Silence: 400 thin histories give no rest read, no readiness and no row.
- Mark safety: the rule holds on 1,736 lifts marked latest, and no reduce
  appears on 8,597 lifts marked earlier on.
- Performance: the replay stays under its budget on every sampled history.

### 61.2 `tools-check/coach-fuel.mjs` — Phase B

| # | the reading |
|---|---|
| F1 | Coach reads fuel from your food log, and there isn’t enough in it yet (0 days). |
| F2 | Coach reads your food by the day, not the hour. / Yesterday was in your usual range. / Most of your entries go in together, later, so the hours they were logged say nothing about the day’s timing. — `q_log_timing` under it, once; *As I go* turns the by-hour read on |
| F3 | Lighter than usual so far today. You’ve logged 560 kcal and 60 g of carbs; by now on a training day you usually have about 1,400 and 150 (14 days). |
| F4 | About usual so far today. … / Yesterday wasn’t fully logged. |
| F5 | Nothing logged today yet. — chips *I ate, it’s not logged* and *I haven’t eaten* |
| F6 | Above your usual today … / What was different in your log: / You’d logged about 540 kcal before it; usually about 1,800. / About 60 g of carbs logged before it; usually about 200 g. / These are differences, not causes. / Coach can’t see sleep, stress or soreness. |
| F7 | Below your usual today … / Nothing in your log was off your normal. — and `a.mark` |
| F8 | Food muted: 0 dates, 0 reads, no fuel line in readiness or compare |
| F9 | Basic: 0 reads, no bubble; the Pro panel lists every category, `readiness` among them |
| F10 | … by now on a training day you usually have about 1,232 and 132 (14 days). / Yesterday was in your usual range. / Coach is learning your new normal, 13 days in. |
| F11 | … / The last two days were lower-carb than your usual: 492 g against about 628 g. / Coach is learning your new normal, 9 days in. |
| F12 | Heavier than usual so far today. You’ve logged 2,100 kcal and 225 g of carbs; by now on a training day you usually have about 1,400 and 150 (14 days). |
| F13 | Coach couldn’t read today’s food log just now. (a failed read, an empty read against a summary with food, and a stale mirror) |
| F14 | the back-filled dinner: yesterday's total 3,400 (was 2,500); today's curve and "so far" unmoved at 1,400 |
| F15 | the same food numbers on kilos; "Your weight is coming down about 0.45 kg a week." |
| F16 | three flags only with the fuel row: readiness says "Several things…", and the targets answer carries no "Several things" line |

**The properties**, over 1,500 generated months:

- Every state occurs: 231 thin, 307 empty, 534 read, 331 day and 97 unread.
- Deterministic.
- Order-blind (entries, days and sessions).
- A part-logged day moves no day median.
- With no log read, not one "so far", "by now" or before-a-session sentence.
- Food never changes training: with every day of food gone, the targets, the
  rest read, the lifts and the targets answer are identical.

**The must-never scan** read 6,183 strings in both units and found none of the
brief's ten patterns. It also read every sentence written into
`coach-fuel.js`, whether a fixture reached it or not. `coach-fuel.js` never
reads an entry's name.

### 61.3 The spy counts (`coach-boot.mjs` H)

| When | Reads by `loadFuel()` |
|---|---|
| At boot, and on five paints | 0 |
| The first *Am I fueled?* of an open | more than 2 and at most 15, in one wave |
| A second ask, nothing changed | 0 |
| After today's summary changes | exactly 1 |
| Basic, Food muted, or an unreadable log | 0 |

### 61.4 Changed on purpose, each with its reason in place

| Verifier | What changed |
|---|---|
| `coach-prog` | E (`targetFor()`); D extended to rack-v51 |
| `coach-pure` | K (`coach-ready.js`, which never reads food), L (the four overlap bodies byte for byte against v51), M (`coach-fuel.js`, which imports two files only) |
| `coach-hype` | F: the recovery gate, the rest bias, the paint spy over both new modules |
| `coach-state` | D: the final topic tables, and Train `live` equal to v51's list, read out of git |
| `coach-registry` | J and K: the selectors, `q_log_timing` and its fact, `a.mark` not a question; v51's finding count read out of git |
| `coach-rank` | J: category order |
| `coach-voice` | L: every new string, both units; the card ban unchanged |
| `coach-surface` | N: the caution, the mark chips, the fuel wait and chips, the relabelled bubble |
| `coach-boot` | H: the `loadFuel` spy |
| `coach-patterns` | H: still eight |
| `coach-overlap`, `coach-silence`, `coach-goal` | route and fixture updates, each explained |

The staging edit went into seventeen verifiers. `coach-build` and
`coach-rotation` needed no fixture change: the rest-aware pick moved none of
their picks.

---

## 62. WHAT I CORRECTED, AND WHY

In the order they were found.

1. **`targetFor()` everywhere a target is named, `coach-overlap.js` included.**
   `rungOf()` (the stall ladder's "Coach’s target keeps the weight"),
   `nextTargets()` and `targetsReplay()` each called `prescribe()` directly.
   Left alone, a marked bad day would still read as a miss in *What’s next
   time?* and in the targets met on the card. For a replay, `markBefore(l, at)`
   builds the mark as it stood that morning.
2. **A reduce may not span a mark.** The property "a mark never produces a
   reduce the unmarked log would not" failed on generated histories of this
   shape: a miss, the marked session, then another miss. Leaving the marked
   one out made the two misses consecutive, which is a reduce the real log
   never had. When the kept log's reduce is made of two exposures with a mark
   between them, `targetFor()` returns the whole log's target if that is not
   a reduce. 8,597 marked-earlier lifts now pass.
3. **A marked target's line.** §5.2 keeps the replayed target's line, but a
   hold's line can end "same as last time", and a lighter one "lighter than
   last time (…)". Both are relative to the morning before the marked
   session. `line` replaces "last time" with "before your marked session".
   `from.daysAgo` is recounted from today.
4. **A mark on a lift's only session gives no target** (`null`). There is no
   "before" to replay, and the brief's rule would otherwise be read over an
   empty log.
5. **The stage-`none` sentence** (§59). R8's group has three dates, and "you
   usually give them 2 days" claims a habit the log has not shown.
6. **"were both".** "Legs and chest were all trained yesterday" is not English
   for two groups.
7. **"today and yesterday".** When the unrecovered groups were trained across
   both days, the brief's `{today | yesterday | in the last n days}` offers
   "yesterday" (false of the group trained today) or "in the last 1 days".
8. **A session's weigh-in week ends at that day's midnight.** Mine first ended
   at the session's start, so a morning weigh-in before an evening session was
   read as its own baseline.
9. **The group read's field is `win`, never `window`.** In a browser a local
   named `window` shadows the global, and `coach-pure.mjs` fences the name.
10. **Date keys are counted, not parsed** (`dnum()`). A card paint reads a
    few hundred of them, and a `Date` parsed per key was most of what the rest
    read cost. The runs are memoised on the input (`runsNow`), so `usualRun()`
    and `restRead()` share one count on a paint.
11. **Five fixtures of mine did not state their rows.**
    - X3's weigh-ins sat outside the week `bwAt()` reads.
    - X1's "week" component read high against its reference.
    - F2's entry times needed the batch spread.
    - F6 and F7 had no spread for a z to read.
    - F10 needed a steeper turn (§63.4).

    No expectation moved.

---

## 63. WHERE THE BRIEF WAS WRONG ABOUT THE CODE

1. **§2's "`coach-overlap.js` CHANGED, exports only … bodies byte for byte"**
   contradicts §5.2's "nothing calls `prescribe()` for a target directly any
   more". Three `coach-overlap.js` bodies did (§62.1). I followed §5.2 and
   §15's first rule, since §5.2 is the invariant. The four newly exported
   functions are byte for byte, and `coach-pure.mjs` L proves it against v51.
2. **§2 lists "normSettings keeps `marks`" under `coach-data.js`.**
   `normSettings()` lives in `coach.js`, where it now keeps them.
   `coach-data.js` merges and prunes in `patchNow()`.
3. **§2's import list for `coach-ready.js`** names `analytics.js` and not
   `targetsReplay`. It needs no analytics (every e1RM it reads comes through
   `baselines()` and `compareSession()`), and it does need `targetsReplay()`
   for readiness's `lifts` row and for the replay's outcomes.
4. **F10: "three weeks of loss after three of gain"** is a turn §8.2 cannot
   see. The rule compares the last two weekly bands with the two before them.
   A turn three weeks back puts the third week in the loss band too, so no
   turn is read. Through `bwAt()`'s seven-day median, about 18 days is the
   furthest back a turn can be and still be seen. The fixture turns there, and
   the row is ok on the brief's expectations. The limit this leaves is in
   BACKLOG.
5. **§7's cardio property** says adding cardio "changes no … rest call". It
   can, because a cardio session is a trained day. It lengthens the streak,
   which is the shipped `trainedDays()` rule and the card's streak, and it adds
   to the shipped `sets` the load sign reads (decision 2 keeps those), so a
   cardio-heavy week can move `rest` to `lighter`. The property is therefore:
   no group's window, big day or readiness moves, and never whether anything
   is recovered. That is what §3.2 is about.
6. **§11's "partial days never lower a median"** holds as stated only when the
   day added leaves the completeness bar where it was. The bar is half of his
   median day, so a partial day can move which other days count as complete.
   The property adds a day under the bar and, wherever the bar did not move,
   asserts that no day median moved.
7. **"`readiness` … never in any intent's `when`."** The readiness selector's
   gate needs three rows with data. It counts them with `readinessHas()`, the
   `has` tests alone, with no flag, no status and no replayed target. It never
   runs on a paint, because `ask_lighter` is not in You's topic lists; the
   paint spy confirms it. The count is training rows only, because the fuel
   row needs a read that is not allowed in a `when`.
8. **§5.2's "coach-build.js:591"** is the "Worked out from" line, which is at
   594 in rack-v51.
9. Confirmed true, for the next brief:
   - `workouts` records carry `id`.
   - `refreshCoachSessions()` coalesces, and `loadFuel()` does the same.
   - The Pro panel is derived from `CATEGORIES`, so *Readiness* appeared by
     itself.

---

## 64. EVERY ASSUMPTION I MADE

**Rest and recovery**

- A group's training date is a date with at least one lifting set of it as the
  primary group. Two sessions on one date are one day, with their sets added.
- The window's quick end is `ceil(q25)` of his gaps, never under 1. After a big
  day it is the larger of that plus one and `ceil(median gap)`.
- A trained date for the streak is any session with a working set, cardio
  included. That is the shipped rule, so the card's streak is one number.
- `usualRun` is `ceil(q90)` of his runs in 84 days. It needs five runs and 56
  days of log, and is null before that.
- The fatigue flag's load sign is the shipped `sets` over the last seven days
  against his usual whole week (four whole weeks). The failure sign is his F
  share over eight whole weeks. Two lifts declining over 28 days is a sign.
  The run sign is a streak past his usual run.
- His usual groups are those of his recurring shapes. With no shapes, they
  are the groups with four or more training days in the window. The rest read
  is null under six sessions in the window or with no usual groups.
- In the replay, a day he trained through "held" when that session compared
  about or above his usual, and was "under" when it compared below. The held
  line needs 75% of those days held, and the under line needs half of them
  under. The rested line needs three flagged days, and each of the other two
  needs four days trained through. A marked session is not counted as
  trained through.
- The time row needs twelve sessions, and reads his 10th to 90th percentile
  start, printed to five minutes rounded outward.

**The mark**

- The engine ignores a mark by its own clock argument at 183 days. The
  gatherer prunes at the same count, noon to noon.
- A mark on a session whose id does not match `/^[A-Za-z0-9_-]{1,40}$/` is
  never offered.
- The "below" that asks for a mark is `compareSession()`'s summary, or its one
  row when it has no summary.
- `readLift`'s irregular and frequency counts come from the performance log
  like the rest of it. A marked session therefore does not count toward "done
  3 times in 4 weeks". That is rare and in BACKLOG.
- A record day's "best" is over the performance log, so it could quote a best
  that a marked session exceeded. A mark says the numbers were not
  representative, in either direction.

**Food**

- A complete day is at least 50% of his median day over the last 28 days,
  among days with food. Five such dates are needed before there is a median.
- The phase rule is §8.2 read literally: weeks 0–3 back, two against two, from
  seven-day medians. An aim changed inside 28 days starts a phase at its
  `asked` stamp.
- Logging style is judged over the dates read (at least six). A day's entries
  spread over four hours or more is real-time, and all within the hour is
  batch.
- `unread` is today's summary showing food while the read failed or came back
  empty. It never says "nothing logged".
- `fuelDates()` lists today, the latest session's date, then the most recent
  complete training dates in the 28 before today: fifteen at most.

---

## 65. WHAT IS NOT DONE, AND WHAT NOBODY HAS SEEN

1. **Nothing has been seen on a screen** (§59). Look at these first:
   - the caution bubble with two chips inside it, at 375 px;
   - R4's lighter answer, which is eight bubbles long;
   - the mark question's five chips.
2. **The replay's learning** (decision 17): the extra day on the streak sign
   and a day off a group's window. Both wait for a per-open cache that the
   card, the builder default and the sheet all read.
3. **The brief's §12 list**, in BACKLOG as the brief asked.
4. **Native was not read**, as the brief ordered. `NEXT-NATIVE-V52.md` is the
   delta.

---

## 66. THE PAINT, AND THE REPLAY

`node report/coach-paint/bench.mjs` times a card paint: one `coach()` call and
everything it works out for the two cards, the greeting, the lead question and
Basic's teaser. The log is a 200-session year with food and weigh-ins, and the
number is the median of many warm paints.

```
rack-v51 (99b49ea)   Pro 3.62 ms (p90 5.29)   Basic  9.93 ms (p90 10.83)
rack-v52             Pro 3.90 ms (p90 5.63)   Basic 10.44 ms (p90 11.29)
the replay (an answer, not a paint): 54.6 ms median, 57.6 ms slowest of 20
```

Across repeated runs Pro moved +0.3 to +0.4 ms. Basic read +1.0 ms once. Timed
side by side, the same paint came in +0.4 to +0.5 ms, and at v51's own time with
Rest muted. The whole addition is the rest read, which is the one thing the
brief allows on a paint. The spy in
`coach-hype.mjs` F shows that 200 paints call nothing in `coach-ready.js` but
`restRead` and `usualRun`, and nothing in `coach-fuel.js`.

---

## 67. MICAH'S DECISIONS, 23 SEP 2026 — carried forward

| # | Question | Answer | What landed tonight |
|---|---|---|---|
| 7 | General nutrition science in fuel answers? | No, own data only | **BUILT**: `coach-fuel.js` compares his logged days with his own medians and nothing else. The must-never scan fences it |
| 8 | Learning whether rest advice was taken | Replay, save nothing; a per-group recovery window | **BUILT**: per-group windows from his own gaps; the replay as a readout with its counts. **Not built**: the replay adjusting anything (decision 17, BACKLOG) |
| 9 | Save answers about how you feel? | A mark on a bad session | **BUILT**: `settings/coach/marks`, six months; the two logs; `targetFor()`; the question under *How did today compare?* and *Clear the mark* |
| 11 | Say "carb-loaded"? | No | **BUILT**: no sentence says it; the scan's eating pattern refuses it in every food string |
| 13 | Coach reads the water log? | Not yet | Nothing reads water. BACKLOG: revisit after this stage |
| 16 | When rest comes up | Answered when asked, and a gentle card line after three days running | **BUILT**: the rest and lighter answers under *What should I train today?* and *Should I rest or go lighter?*. The v49 card line now also waits for his own usual run when the log knows one (R16) |

**This brief's §3, recorded as decided and not open:**

1. There are two modules, and the training side never imports the food side.
2. Recovery counts whole lifting sets (`lsets`). Every other reader keeps
   `sets`.
3. A big day is big against his own normal, with floors.
4. A mark stops a session counting against him, and never lets it count for
   him. A marked latest session gives the target from before it.
5. *Train anyway* opens the builder's menu, and unrecovered choices carry the
   caution.
6. Your-data links come only from the eight registered Patterns, and only with
   Patterns on.
7. There is no intake-against-trend cross-check.
8. "Your log doesn't show that lighter days go with lighter sessions — yet" is
   dropped.
9. Readiness's first component is recovery.
10. *Should I rest or go lighter?* keeps the route id `ask_lighter`.
11. "Have you eaten?" is two chips that store nothing.
12. There is a new `readiness` switch, and the rest answers ride `rest`.
13. Readiness under three rows with data is silent.
14. Logging style is judged from the dates read, at least six.
15. Today's food log is read on ask.
16. The replay uses today's recurring shapes for every past morning.
17. The replay reports and adjusts nothing.
18. Old marks are pruned on every `settings/coach` write.

---

## 68. IF THE NEXT RUN READS ONE THING

`targetFor()` in `coach-prog.js`, and the property that found its second rule:
**leaving a session out is not neutral.** A mark was meant to make one bad day
not count against him. Removing it from the log joined the misses on either
side into a streak that never happened, and that would have taken weight off
his bar because he told Coach he slept badly. The two logs in `coach.js`
(`perf`, `markOf`) are the only place the filter is written. Any future reader
of "how strong" should take the performance log from there, and should check
whether a gap it creates says something the full log does not.

---

## 69. READ THIS FIRST — rack-v53, and what is not done

Written at the end of an unattended run in `~/dev/ship-v53` (a fenced, full
clone at rack-v52, `6f76c3b`), against `SHIP-V53-PROMPT.md`, with §59–§68 of
this report and `COACH-TRAINER-SPEC.md` §9.4 read first, as the brief asked.
The fence was proved before anything else: `echo GUARDTEST ping` was refused.
The pre-push hook refuses, and `.claude/` is excluded. Shipped as `rack-v53`.
**Not pushed.**

**All four phases are built, in the brief's order, each committed and green
before the next began.** Phase A is five commits, one per fix. Phases B, C and
D are one each. Then come the version bump and the docs. Every commit passes
every verifier under `TZ=America/New_York`, `UTC` and `Pacific/Auckland`. At
the end there are **43 verifiers, three of them new**: `finish.mjs`,
`recap.mjs` and `feel.mjs`.

- The four shipped batteries are unchanged: `coach-prog` **57 / 0 / 0**,
  `coach-overlap` **24 / 0 / 0**, `coach-ready` **46 / 0 / 0** and
  `coach-fuel` **16 / 0 / 0**. The new `finish.mjs` is **ok 12, miss 0,
  wrong 0**.
- **No `%` on the recap outside the check-in**, in either unit
  (`recap.mjs` B).
- `database.rules.json` is byte-identical to rack-v52. `sw.js` and
  `usage.js` read `rack-v53`.
- **The card paint**, interleaved paint for paint against rack-v52 on the
  200-session year:
  - after a workout, **+0.43 ms Pro and +0.20 ms Basic**; five hours after,
    +0.37 and +0.19;
  - on any other day, ±0.
  - The budget was +1 ms (§76).

**What nobody has seen.** Nothing in this ship has been on a phone or in a
browser. The recap's hero, the check-in and its chips, the warm lines, and the
card and sheet after a workout were driven through DOM shims, which have no box
model and never load `rack.css`. The check-in's 44px targets are reasoned from
`rack.css` by `touch-target.mjs`, never measured.

**Five places where I departed from the brief, each forced by the code** (§73):

1. **The card's memory is read as it stood at open.** Without that, the
   24-hour rule would take the line off the card on the next repaint.
2. **Warm lines are not written to the memory.** They rotate on the open
   counter alone.
3. **The finish line's category is `core`.** A HYPE line needs one, and the
   thing said after every session should not be a switch. The Train card
   shows it too, after a workout, by a named exception Micah asked for before
   the push (§73.4).
4. **A weight or volume record's line carries its number.** `prDetail`
   prints only a phrase for those ("heaviest ever").
5. **The check-in's mark chips are drawn in `workout.js`**, not `coach-ui.js`.
   The recap lives there. The words and the gates are `coach.js`'s, so they
   are v52's exactly.

**What is not done** is in BACKLOG.md under *What v53 left open*: the brief's
§7 list and the small calls in §74.

---

## 70. WHAT GOT BUILT

```
coach.js        5,279 lines  was 4,787. finishRead() and section 7c; session.finish; hype_finish
                             and a key on every HYPE line; the 24-hour rule and WARM; the card's order
                             after a workout, and TRAIN_ALSO (the finish line on Train too);
                             c.opening / c.openingNext; ask_ready; the feel category,
                             FEEL_S_WORDS, feelHarder(), canMark(), feelLine(); three feel Patterns and
                             patternFoodDays()'s rated dates; replayOf(), one targets replay a paint.
coach-data.js     757 lines  was 699. The memory read at open, rememberHype(id, key) replaced per open;
                             coachFinishRead(); noteCoachFood(); foodDays beside foodFirst.
coach-ui.js     1,302 lines  was 1,276. The Lift target Save validates first and checks what landed;
                             the finish bubble first, the finding second; rememberHype's key.
coach-fuel.js     479 lines  was 453. changedBy / changedDays, the lines that name the change;
                             logStyle().
analytics.js    1,014 lines  was 973. normFeel(), FEEL_STRENGTH, sameKindComparison();
                             sessionComparison() deleted.
workout.js      2,038 lines  was 1,897. The recap redone; feelCard() and saveFeel(); runFinish keeps
                             dateK; saveEdit carries feel.
food.js         3,555 lines  was 3,548. noteCoachFood() after both daySummaries writes.
rack.css        2,220 lines  was 2,197. .summary-line, .summary-like-row, the check-in's rules.
sw.js, usage.js              rack-v53.
report/coach-paint/bench.mjs the three moments, and AB=1 for v52 against the tree, interleaved.
```

Commits, each passing every verifier in three time zones:

```
a9aef61  Lift target over 2,000 lb no longer says "Saved" and deletes the target
9f7a059  The card no longer repeats the same earned line every open
93c5b60  The readiness list is no longer hidden behind the lighter-week answer
b25af85  "Your usual here is from before your change" now says which change
6a3d936  Food logged after the first "Am I fueled?" is now seen by the next ask
0a1a463  The finish line: finishRead() decides what to celebrate after a workout
a0d628f  The recap, redone: the win first, the stats under it, no percentage
b634056  "How did that feel?": energy and strength, saved with the session, heard by Coach
da13007  rack-v53
ff2852a  docs
         The Train card shows the finish line too after a workout (TRAIN_ALSO)
```

**Phase A: the five fixes.**

1. **The Lift target.** Save converts the box with `wIn()`. Over `GOAL_LB_MAX`
   it writes nothing and toasts "Coach takes lift targets up to 2,000 lb." (or
   "907.18 kg", from `limW()`, rounded inward so the number shown is one the
   check accepts). Any other value `normGoalLift()` refuses is "Couldn’t save
   that". After the write, "Saved" appears only when `coachSettings().goalLift`
   is the target that was sent.
2. **The 24-hour rule.** Every HYPE line carries `key: d => string`. The device
   memory is `{ id, key, at }`, eight deep. `pickHype(pool, recent, opens,
   now, keep)` drops any line whose key was shown in the day before `now`. When
   the pool empties, the card draws a `WARM` line. The rotation's own memory
   still reads the last three ids.
3. **`ask_ready`**, "Anything else off today?", after a lighter-week answer
   and only when readiness answers.
4. **The phase lines name the change**: the goal, with its days, or the weight
   trend, "about 2 weeks ago". The later of the two when both apply.
5. **`noteCoachFood()`** sets one day's summary and nothing else. `food.js`
   calls it after both of its summary writes.

**Phase B: the finish line.** `finishRead(input, record, extras)` works out
the evidence in the brief's order:

1. a record;
2. every Coach target met, 2+, Pro and targets on;
3. a milestone;
4. above his usual, Pro;
5. his rating;
6. a comeback of 12+ days.

"Great workout." appears only when that list is not empty. Otherwise it is
"Good work." with the groups and working sets, or "Showing up on a harder day
counts." Its three surfaces:

- **the recap**, through `coachFinishRead()`, which hands in the records
  `runFinish()` already has;
- **the card**, as `hype_finish`, with the headline and the short evidence
  when both fit nine words and one number. Otherwise the headline stands alone
  and the evidence goes in the reason line, whole;
- **the sheet**, as the first bubble, with the finding second.

**Phase C: the recap.** Top to bottom:

- the hero: "Session complete", the finish line's headline and line, then the
  session's name and date;
- the check-in;
- the wins;
- the stat row;
- what you did;
- "Compared with sessions like this", from `sameKindComparison()`: two plain
  lines, only with two or more like sessions;
- the three buttons.

**Phase D: the check-in.**

- Energy 1–10 and strength in his five steps, saved as one child write after
  the record.
- The cache takes it the moment that write lands.
- `saveEdit()` carries it.
- A low rating asks v52's mark question.
- The headline recomputes.
- *How did today compare?* quotes it.
- The switch *After a workout: how it felt* hides it.
- Patterns are eleven.

---

## 71. THE BATTERIES — every row

### 71.1 `tools-check/finish.mjs` — ok 12, miss 0, wrong 0

| # | the reading |
|---|---|
| N1 | Great workout. New best on Incline Dumbbell Bench Press: 70 x 8. (Your best at 70 lb was 7 reps.) [pr, milestone] |
| N2 | Great workout. Every Coach target met: 2 of 2. (2 lifts, each at its target weight and reps.) [targets, milestone] · 1 of 1: Good work. Back done: 3 sets. — not the targets evidence · the compare answer's own "2 of 2 Coach targets met." |
| N3 | Good work. Chest and arms done: 18 sets. (Every working set in the session, warm-ups out.) [] |
| N4 | Great workout. You rated it 8 out of 10. [rating] |
| N5 | Good work. Showing up on a harder day counts. (By your own rating, straight after it.) — and at energy 3 the same; the mark chips' gates (`feelHarder`, `canMark`) say yes, and no with Questions off. The chips themselves are `feel.mjs` D |
| N6 | a marked session with a record: Great workout. New best on Incline Dumbbell Bench Press: 70 x 8. |
| N7 | Great workout. First session in 20 days. (The session before it was 20 days earlier.) [back] |
| N8 | Basic, every target met: Great workout. Most working sets ever. [milestone] — never the targets or compare evidence |
| N9 | kilos: Great workout. New best on Incline Dumbbell Bench Press: 32.5 x 8. (Your best at 32.5 kg was 7 reps.) |
| N10 | log unreadable: with the recap's records, Great workout. New best on …: 70 x 8. (Your best estimated max before was 86 lb.); with none, Good work. Chest and arms done: 6 sets.; junk record, input and extras: always one of the two headlines |
| N11 | 13 answers read: no `%`, "down", "under", "below", "lighter", "only", "still" or "!" in a headline or line |
| N12 | both cards in `post`: `hype_finish` on every open, the Train card's word for word the You card's (both tiers), still exempt when shown an hour ago; three days running, `hype_recovery` takes the You card, the Train card leads with the finish line and the sheet opens on it; the recovery line shown in the last day, the finish line is next on both; five hours on it is still first; the next day it is gone from both |

**Beside the rows:**

- *The agreement* (A): on five logs, `finishRead()` handed the recap's
  records and `finishRead()` working them out itself say the same thing.
  The sheet's first bubble is its headline and line, and the card leads with
  its headline.
- *The card's form* (A): "Great workout. New best on Incline Dumbbell Bench
  Press." fits, and a 12-word name leaves "Great workout." alone, with the
  whole line as the reason.
- *`repeats` after a workout* (A) is keyed to `openingNext`. No answer equals
  the finish bubble.
- *The paint spy* (S): 20 paints. After a workout, `detectPRs` and
  `sessionMilestones` run once. In `pre`, the next day or mid-session, never.
- *Properties* (P), over 400 generated histories in both units and tiers:
  354 "Great workout.", 46 "Good work." (23 on a harder day), and every kind
  of evidence (pr 304, back 229, milestone 179, rating 32, targets 22,
  compare 15).
  - "Great workout." always has evidence, and "Good work." never does.
  - Every headline is one of the two.
  - The same history gives the same answer.
  - None of the banned words appear.
  - The recap's records and the engine's own agree.

### 71.2 The shipped batteries, unchanged

`coach-prog` 57/0/0, `coach-overlap` 24/0/0, `coach-ready` 46/0/0 and
`coach-fuel` 16/0/0, in all three zones. Three rows moved on purpose:

| row | what changed, and why |
|---|---|
| `coach-fuel` F10 | now "Coach is learning your new normal **since your weight trend changed**, 13 days in." — §3.4 names the change |
| `coach-fuel` F11 | now "… **since you changed your goal**, 9 days in." — the same |
| `coach-ready` R15 | reads `c.openingNext` when the fixture is after a workout. It asserts the finish line is first then, so the row still tests the finding it was written for. Before, `c.opening` would have passed it without testing it |

### 71.3 The other verifiers, changed on purpose

| Verifier | What changed |
|---|---|
| `recap` | NEW: the hero, no `%` in either unit, like with like by median, the bodyweight day's sets, the order, the switch, and his own `%` left in the check-in |
| `feel` | NEW, 44 checks: normFeel; the write and its order; the cache only after it lands; a refused write; Skip; the mark chips at exactly s ≤ 90 or e ≤ 3, never with Questions off; the rating through a later whole-month write; `saveEdit` keeping it, moved or not; the compare line; the headline recompute; the switch |
| `coach-surface` | the Lift target at 2,001 lb, 908 kg, 907.18 kg and 2,000 lb, a failed write, and a write that lands without the key; the sheet's two first bubbles |
| `coach-hype` | G: a pool of one and two through a day, one value under two ids, old memory, WARM under the ban; fixtures a day earlier, since a session today now leads with the finish line; the pool of five became four. H: the finish line on the Train card too, a named exception of one line; across every log, Train draws a training line or the finish line after a workout and shares no other line with You |
| `coach-rotation` | J's RICH and CAUTION read the day before, for the same reason |
| `coach-voice` | WARM under the card ban; EARN the day before; M: every finish sentence, source and rendered, and the rating line and three energy patterns |
| `coach-overlap` | the `ask_ready` chip on a lighter-week log, and none with readiness muted (outside the table) |
| `coach-fuel` | F+: the four phase sentences and the later change |
| `coach-boot` | H: food logged after an ask, one read, "1,750 kcal"; both `food.js` sites |
| `coach-patterns` | eleven; I: each energy pattern true, false and thin, a second reading of every number, real-time only, the added days capped at 40 |
| `coach-registry` | the `feel` fact family; `feel` a surface category, exempt from "used by an intent"; `FUEL_ROUTES` gains `ask_ready` |
| `coach-rank` | `warm` a card state; K: `feel` after `live`, v52's order kept |
| `coach-pure` | the PURE list gains `detectPRs`, `sessionMilestones`, `normFeel` |
| `units` | `coach.js`'s one `fmtSetLoad` display site |
| `bodyweight-sets` | its comparison checks ported to `sameKindComparison()` |
| `blocks` | the one new write, a child of a record |
| `touch-target` | the check-in's five controls: 44px at 390 and 320 wide, widths in the snapshot. Never measured in Chrome at v46, so B names them and skips them |

`month-erasure` and `tick-targets` needed no stub. `runFinish()` and
`saveEdit()` gained no free name (§73.7).

---

## 72. WHAT I CORRECTED, AND WHY

In the order they were found.

1. **The limit toast is for an over-limit weight only.** `normGoalLift()` also
   refuses an id of the wrong shape. Telling him the limit then would have
   been false, so that case says "Couldn’t save that".
2. **A card fixture with a session today now walks no rotation.** The finish
   line leads the card all day, so six fixtures moved a day earlier, each with
   its reason in place. Coverage is the same or better: RICH 2 lines, CAUTION
   1 where it was 0, and voice K reads 7 of 13.
3. **The paint.** The first build cost +1.18 ms Pro after a workout, over
   budget. Two changes brought it to +0.4 ms:
   - `detectPRs()` is handed only the prior sessions that hold one of the
     record's lifts. It reads only those lifts' index entries, and a lift's
     entry is built only from sessions holding it, so the answer is the same.
     The agreement check proves it on every history.
   - One targets replay a paint (`replayOf()`), shared with
     `hype_targets_met`, which replays the same session after a workout.
4. **The finish line's `why` is a sentence**, as the brief's example is. So
   `coach-hype.mjs` B's "every clause is not a sentence" exempts
   `hype_finish`, with the reason.
5. **`feelLine()` moved out of the finish line's section.** It says "below your
   usual", quoting `compareSession()`, and the finish line's own ban is right
   to fence that section.
6. **Junk `exercises` could make the safe answer throw.** Both `finishSafe()`
   and `coach-data.js`'s fallback guard with `Array.isArray`.
7. **`host.children.forEach`** works in the shim and not in a browser, where
   `children` is an HTMLCollection. It is spread first.
8. **The `noteCoachFood` check needed its own log at fixed local hours.** On
   the shared fixture the answer came back in the `day` state at some hours of
   the day, and that state never states today's total. It is green in eight
   zones.
9. **"Said only when…"**: "only" is on the shipped ban list, so the reason
   line now reads "Left out when your food goes in all at once, later."

---

## 73. WHERE THE BRIEF WAS WRONG ABOUT THE CODE

1. **§3.2's memory.** In v49 the card's line is not pinned per open (the
   greeting is), and `coachInput()` handed the engine the memory
   `rememberHype()` had just updated. With a 24-hour skip on top, the second
   paint of an open would have dropped the line for a warm one. So:
   - the engine reads the memory as it stood at open;
   - `rememberHype(id, key)` replaces this open's one entry, so the line
     remembered is the last one drawn;
   - the stored list is never what the engine reads mid-open.
2. **§3.2's "the lines rotate on `input.opens` with the same memory as the
   greeting".**
   - Written to the eight-deep memory, eight warm lines in a day would push a
     fact value out of it inside its 24 hours, and "no repeats within the day"
     would fail.
   - Warm lines rotate on the counter alone, which never repeats one on
     consecutive opens.
   - The "memory" they share with the greeting is the rule that a warm line
     is never the greeting on screen.
3. **§4.2's "the same detail `prDetail` prints".** For a weight or volume
   record, `prDetail` prints a phrase with no number ("heaviest ever"). The
   line is "New best on Bench: heaviest ever, 225 lb.", the phrase and its
   number through `units.js`.
4. **§4.4's `hype_finish`.**
   - A HYPE line needs a category, and the brief named none.
   - `core` is the one that cannot be switched off, and the thing said after
     every session should not be a switch.
   - `TRAIN_HYPE` walks training categories only, which would keep the
     finish line off the Train card.
   - **The follow-up, before the push.** Micah asked for the Train card to
     show the finish line too: it sits above Start workout, and it is the
     first thing after Done on the recap. `TRAIN_ALSO = ['hype_finish']`
     names the one line that crosses both the training-only rule and the You
     card's claim. Nothing else crosses (`coach-hype.mjs` H).
   - The recovery line keeps both rules. So on a streak day's first open You
     leads with it and Train with the finish line (`finish.mjs` N12).
5. **§4.4.3's re-key.** `withRepeat` compares an answer with `you.text`, and
   `you` is `openingNext` after a workout, so the engine was already keyed to
   the finding. The sheet's "follow-ups hang on the opening bubble" is what
   moved: they hang on the finding's bubble now.
6. **§2 puts "the feel card's mark chips reuse v52's" under `coach-ui.js`.**
   The recap lives in `workout.js`. So the chips are drawn there with
   `coach.js`'s `MARK_ASK` and `canMark()`: the same question, labels, acks
   and gates as v52's, and one write path (`markSession()`).
7. **§6.6's stubs for `month-erasure` and `tick-targets`.** The brief expected
   `runFinish()` or `saveEdit()` to gain the feel write, `normFeel` and
   `coachFinishRead`. None of them did. The write is its own function
   (`saveFeel()`), the headline is worked out when the recap draws, and
   `saveEdit()` carries `feel` with no new name. Nothing was stubbed, and
   nothing those files assert moved.
8. **§4.1's "added if its id isn't there yet".** A rating saved after
   `refreshCoachSessions()` has landed would then be judged on the stored
   record, which does not have it. The record handed in replaces the stored
   one with the same id.
9. **§6.2 "touch-target.mjs holds".** Its section B checks each control
   against the height Chrome measured at v46, and the check-in did not exist
   then. It holds: A (44px at both widths) and C (the widths snapshot) cover
   the new controls, and B names them and skips them rather than inventing a
   measurement. `.coach-chip` is about 36px, so the card sets
   `.feel-card .coach-chip { min-height: 44px }`.
10. Confirmed true, for the next brief:
    - `food.js:119` and `:320` are the two summary writes.
    - `bodyweight-sets.mjs` was `sessionComparison()`'s only other caller.
    - `hype_targets_met`'s bar is `n >= 2 && met === n`.
    - `normSettings()` drops a refused `goalLift`.

---

## 74. EVERY ASSUMPTION I MADE

**The finish line**

- A record's pick is the strongest kind (estimated max, then heaviest, then
  volume), then the order he did them in.
- An estimated-max record's `why` names his best reps at that same weight
  before. With no set at that weight, it names his best estimated max before.
- Above-usual names up to two lifts, and otherwise counts them ("3 lifts").
  It needs the Progression switch too, like the answer it quotes.
- With both parts of the rating high, energy is said first.
- The comeback's gap is counted in dates, as `session.back` counts it.
- "Good work."'s names:
  - his own routine's, when a saved routine covers exactly the session's
    groups (the builder's test);
  - otherwise the groups with two or more lifting sets;
  - five or more is "Whole body";
  - nothing is "Session".
- The count is every working set, the stat row's number.
- With no readable log: no records without the recap's, and no targets,
  compare or comeback.
- A blocking state (an unreadable log, a live session) keeps the sheet's
  opening; the finish line never displaces it.

**The card**

- The recovery line is still under the 24-hour rule in `post` and
  `done_today`. So it takes the first open of the day and the finish line
  every open after.
- A memory entry whose `at` is in the future is not "shown in the last 24
  hours".
- The memory keeps one entry per key, and the rotation still reads the last
  three ids.
- A warm line has an empty reason line.
- The half-loaded substitution ("Your training is in. Food and weight have not
  landed yet.") covers a warm line as it covered "Nothing stands out today.".

**The recap and the comparison**

- A session's kind is read from the group the record stored, not the library,
  since `analytics.js` does not read it.
- A group counts toward the kind with two or more working sets across the
  session.
- The window is the 56 days before `now`.
- The sets compared are all working sets, the stat row's number.
- A usual sets figure prints to one decimal.
- The headline is worked out when the recap first draws, and again after a
  rating.

**The check-in**

- `normFeel()` keeps `at` when it is a moment and drops it otherwise.
- `saveEdit()` carries the stored `feel` as it is whenever it is present.
- Skip holds for this recap only. A recap is drawn once per session.
- The mark's `d` is `runFinish()`'s date key.
- For the compare line, strength 110+ points above, 90 or less below, and 100
  usual. Energy points nowhere.

**The energy patterns**

- A rated session is one whose rating has an energy.
- An entry belongs to a session's day when its time falls on that date.
- The first of the three counts only days with food logged, as the shipped
  first pattern does.
- The calorie split is at or above his median against below it. The hours
  split is at or under against longer.
- Real-time is `logStyle()` over the rated days read, with the summaries for
  the complete-day bar.
- The added dates are days whose summary shows food.
- Every day read is kept whole, a superset of the rated dates.

**The small fixes**

- "Changed your goal" wins a tie with the weight turn.
- A goal set today reads "today".
- The weight turn is always "about 2 weeks ago", because the rule reads it
  two weeks each way.
- `ask_ready` has no follow-ups of its own: the readiness answer's two are
  enough.

---

## 75. WHAT IS NOT DONE, AND WHAT NOBODY HAS SEEN

1. **Nothing has been seen on a screen** (§69). Look at these first:
   - the check-in at 320 px: ten chips in two rows of five, and the five
     strength steps wrapping;
   - the recap's hero with a long line under it ("New best on Incline
     Dumbbell Bench Press: 70 x 8.");
   - a warm line on the card after a week of opens.
2. **The brief's §7 list**, in BACKLOG as the brief asked:
   - Your goal's layout;
   - stage five and the effort tap;
   - the rating moving nothing;
   - the You tab's weekly volume percentage;
   - native.
3. **The energy patterns read food days at boot**, so a session rated in this
   open is read at the next one.
4. **Native was not read**, as the brief ordered. `NEXT-NATIVE-V53.md` is the
   delta, with the PROPOSED `feel` rule.

---

## 76. THE PAINT

`report/coach-paint/bench.mjs` now times three moments on the 200-session year:

- `pre`: no session today;
- `post`: a session that ended an hour ago;
- `done_today`: one that ended five hours ago.

`AB=1` runs rack-v52 and the tree interleaved, paint for paint, 1,500 each,
which cancels the drift two back-to-back runs show on Basic's 9 ms paint:

```
                  rack-v52     rack-v53
pre        Pro    3.09 ms      3.13 ms    +0.04
pre        Basic  8.59 ms      8.51 ms    -0.08
post       Pro    3.66 ms      4.10 ms    +0.43
post       Basic  9.11 ms      9.31 ms    +0.20
done_today Pro    3.59 ms      3.97 ms    +0.37
done_today Basic  9.21 ms      9.40 ms    +0.19
```

Re-measured after the follow-up that puts the finish line on the Train card
too (the same pool, no new work): two interleaved runs gave Pro +0.40 / +0.36
and +0.40 / +0.38 ms (post / done_today), and Basic +0.17 / +0.43 and +0.20 /
+0.23 ms. The +0.43 did not repeat, so it was noise.

Sequential runs put Pro at +0.34 to +0.50 ms, and Basic anywhere from +0.03 to
+0.98 ms. That spread is drift between the two runs: interleaved, it is +0.2.
The whole addition is `finishRead()` in the two moments the brief allows it
(`finish.mjs` S spies on it). Its first build was +1.18 ms Pro, over budget,
and §72.3 is what brought it down. The replay, an answer and not a paint, is
unchanged at about 31 ms.

---

## 77. MICAH'S DECISIONS — this brief's calls, recorded as decided

| # | The call | What landed |
|---|---|---|
| 1 | The first thing after a workout is warm, never a number that stings | **BUILT**: the recap's hero, the card and the sheet all lead with "Great workout." or "Good work."; no `%`, no red or grey verdict, no "down" in a headline |
| 2 | "Great workout." is earned, never automatic | **BUILT**: six kinds of evidence in a fixed order; `finish.mjs` P proves it never appears without one |
| 3 | Everything said is true | **BUILT**: every line is a fact from the session, his log, or his own rating |
| 4 | One decision, three surfaces | **BUILT**: `finishRead()`, read by the recap, the card (`hype_finish`) and the sheet's first bubble |
| 5 | Compare only with sessions like this one, by median, in neutral words, never at the top | **BUILT**: `sameKindComparison()`; `sessionComparison()` deleted |
| 6 | Energy 1–10 and strength against normal, "120%+" his words | **BUILT**: the check-in, stored as `feel` on the record |
| 7 | The bad-day mark folded into a low rating | **BUILT**: v52's question, chips, acks and gates under a strength ≤ 90 or energy ≤ 3 rating |
| 8 | A rating moves nothing tonight | **KEPT**: no target, window or baseline reads it (`feel.mjs` E) |
| 9 | Three more Patterns: energy beside food (24 Sep) | **BUILT**: eleven, with the shipped rules |
| 10 | The check-in is free, and switchable | **BUILT**: *After a workout: how it felt*, after *In the gym*, on by default |
| 11 | A fact value once a day on the card, warm lines otherwise | **BUILT**: the 24-hour rule and `WARM` |
| 12 | After a workout, the recovery line then the finish line | **BUILT**: the explicit order in `post` and `done_today` |

---

## 78. IF THE NEXT RUN READS ONE THING

`saveEdit()` and the month cache.

- A workout record is rebuilt from scratch when it is edited, and written
  back with its whole month from `monthCache`.
- **Any field the rebuild does not carry is erased, and so is any field the
  cache does not hold.** Nothing on the server can notice, because the
  whole-month write is a valid write of a smaller record.
- `feel` is the first field a screen other than the live session writes onto
  a record. So `saveEdit()` carries it, and the cache takes it the moment its
  child write lands (`feel.mjs` F).
- The next thing stored on a record — the effort tap's per-set rating, say —
  needs the same two lines, or the first edit takes it away.
