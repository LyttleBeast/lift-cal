# COACH — what got built, what changed, and what did not

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
