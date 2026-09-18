# COACH — what got built, what changed, and what did not

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
