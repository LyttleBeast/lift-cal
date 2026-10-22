# rack-v74 (ship v74b) — "Coach never answers with nothing"

Shipped 22 Oct 2026 on branch `ship-v74b`, from `rack-v73` (`ea6b878`). Not
merged; nothing deployed. The earlier, unfinished `ship-v74` branch (the three
recap questions) was read for ideas and not merged.

**Micah, from his phone:** on the live workout screen he ticked a barbell
bench's typed-W warm-ups — 45 × 2, 135 × 10, 135 × 5, 185 × 5 — with last time
225 × 4 and 225 × 2 in the log, opened Coach, tapped *What should I do next?*,
and got only "Nothing I can add from your log right now." and a Why? chip.
"Imagine paying a personal coach and they just tell you idk." The answer to "I
don't have a number" is never "I have nothing".

**Why it happened.** The bench's target defers (`coach-prog.js`, code
`heavy`: a top set of four and a double are "too close to an all-out set to
call"), so `nextSet()` has no target to read the warm-ups against and says
nothing; `anotherSetRead()` returned null because no working set was ticked
(all four typed W) and there was nothing to quote; the habit read had nothing
either — and the sheet drew `LIVE_NONE`.

**Nothing in the published rules moves.** `database.rules.json` and
`database.rules.OPTIONAL-LOCK.json` are byte-identical to rack-v73. Everything
stored is a child of the already granted `settings/coach`. No Worker change.
Coach still never runs on the network.

## What changed

**The ladder** (`coach-live.js`, new `fallbackRead(input, exId)`, and the
defer branch of `anotherSetRead()`), run only where the engine is silent:

1. *(a)* the engine's sure number — `anotherSetRead()`, `nextSet()`, the
   target — untouched.
2. *(b)* what I do know: his last logged session of the lift, **quoted** — his
   own working sets through the ramp split every reader uses, in his unit, a
   drop set's strips left out, runs grouped ("3 sets of 185 lb × 8"), from the
   twelve-week window or, failing that, the newest older session (`coach.js`
   `liveInput.older`). Said as a record, never a plan.
3. *(c)* one question row so he can steer: `q_want_next` — "What are you going
   for on Barbell Bench Press today?" *Go for more* · *Match last time* · *Ease
   off* — on a lift with history; `q_rough_weight` — "Roughly what do you work
   at on Barbell Bench Press?", a number box in his unit, *Save* · *I'll log a
   set first* — on a lift the log has never seen. "I don't have a number for
   this one yet" appears only inside a sentence that carries (b) or (c).

Micah's sheet now reads: **"Warm-ups on Barbell Bench Press so far. Last time
you worked at 225 lb × 4, then 225 lb × 2. I don't have a number for today yet,
so tell me what you're going for."** with the question row under it.

After he answers, the answer is read again and says it back: *Match last time*
→ "… You said match last time, so last time's sets are the plan." with one chip,
*Last time's set 1, 225 lb × 4* (a quote of last time, through the shipped
`useNext` path); *Ease off* → "… nothing heavier than that today." and the same
quote chip; *Go for more* → "You said you're going for more. Put on what you're
going for and rate the set — I'll read the rest of today from there." and **no
number** (I won't pick a heavier number than the log backs). No quote chip at
all after a set typed F, rated too hard, a drop set or a step down today.

The other kinds `fallbackRead` answers: `idle` (nothing ticked on the lift:
"Next up, Barbell Bench Press. Last time you worked at …"), `first` (the log has
never seen it: "This is the first time I've seen Barbell Bench Press in your
log. Log a first set at a weight you could do a couple more times with, and
I'll set targets from it — or tell me roughly what you work at."; with a rough
weight told: "You told me you work at about 135 lb on Barbell Bench Press. Start
around there, and I'll set targets from what you log."), `cardio` ("I don't set
numbers for cardio. Log it as you go, and I'll read the lifting around it."),
`empty` ("Add an exercise and I'll read it against your log."). It runs on an
empty log too (a first session ever), not on an unreadable one.

The v73 defer — a set ticked under his last top with no target — used to end
"I'll name a weight once you're at your working weight."; it now ends "Last time
you worked at … I don't have a number for this one yet — what are you going
for?" with the question. `LIVE_NONE`, the sheet's last resort under all of
this, is now "Tick a set and I'll read it against your log."

**Why?** explains in plain first-person words what I am missing and what
answering changes: "I have no number for Barbell Bench Press today. Heavy sets
like last time's are too close to an all-out set for me to call without knowing
how hard they were." / "What I do have is your last session of it, quoted the
way you logged it — a record, not a plan." / "Tell me what you're going for and
I'll answer from it: match last time and I'll line up last time's sets; ease off
and I won't name anything heavier than last time today; go for more and one
good session at the top is enough for me to step it up, where your goal allows
it. Your answer counts for this lift until you next log it." The reason row is
the target's own (`coach-prog.js` why), so a shape, erratic or range defer says
its own reason.

**What his answer changes in the engine** (spec §3.4 q_want_next, and only
that): `coach.js` `lifts()` puts `wantNext` on the lift while unconsumed;
`coach-prog.js` — `ease`: a target that would step up holds at last time's
weight (mode `hold`, code `ease`, "You said ease off on this one, so the same
weight as last time.") and `nextSet()` never says `up`; `push`: where the
goal's confirm dial wants two sessions at the top (Stay consistent, a slow
slope), one is enough ("You said you're going for more, so once at the top is
enough this time."), never on a cut, a hard cut or heavy triples, never two
steps; `same`: nothing. A rough weight seeds the first-time target's line ("No
target yet: you told me you work at about 135 lb here.") with `loadLb` null —
no box is filled — until the first session is logged (the log wins).

**The targets sheet** ("What should I lift today?") draws a defer with last
time beside it — `coach-prog.js` `targetSaid(t)`: "Barbell Bench Press — No
target for heavy singles, doubles or triples on their own. Last time: 225 lb for
4, 2." Defer targets carry the quote as `last` (the why's last row, word for
word).

**Storage** (AGENTS.md, settings/coach v74): `knowBy.wantNext.<exId>`
(`same`|`push`|`ease`, 14 d, keyed by the lift — see decision 1),
`knowBy.rough.<exId>` (pounds 1–2000, 90 d), `asked.q_want_next:<exId>`,
`asked.q_rough_weight:<exId>` (kept by `normSettings()`, pruned at 56 d by
`patchNow()`). Written through the existing `learnBy()`.

**The surface** (`coach-ui.js` `openLiveSheet`): where `another`, the habit
read and the next set are all silent the fallback is the answer bubble, its why
behind Why?, its chips in the chip row; one question row a sheet — the step
question when it is put, else the answer's own; a tap writes through
`writeAnswer()` → `learnBy()`, says the ack, then re-reads the answer. The
rough-weight row draws a number box (`type=number`, his unit as placeholder);
Save with nothing valid stores nothing.

**`sw.js` → `rack-v74`, `usage.js` → `rack-v74`** (in step; the branch is
v74b, the build string is v74 — the next number).

## The dead-end rate (the battery, 300 lifters × 8 cuts)

The harness now opens the sheet at every moment he could — before the first set
of each exercise and after every tick, warm-ups included — and scores what
would be drawn (`scoring.mjs` `deadEndOf`, `deadTarget`).

| | rack-v73 | rack-v74 |
|---|---|---|
| live sheet, all asks | **11,528 of 56,637 = 20.35%** | **0 of 56,637 = 0%** |
| … before the first set | 3,012 of 8,501 | 0 |
| … after a warm-up | 6,979 of 17,121 (40.8%) | 0 |
| … after a working set | 1,537 of 31,015 | 0 |
| targets drawn with nothing usable | 1,911 of 8,171 = 23.39% | 0 |

Under `GATE=all` a dead end in the live sheet now fails the run.

## Decisions for Micah

1. **`wantNext` is keyed by the lift, not the shape.** The spec put it at
   `knowBy.wantNext.<shapeKey>` as a recap question ("Next time on legs…"). You
   asked for it in the gym about the lift under the bar, and a session's shape
   is not known until it is finished, so it is `knowBy.wantNext.<exId>`; a
   v72-shaped key still normalises. It is consumed by your next logged session
   of the lift (one that started after the answer, or in the six hours before
   it — the session you answered in), or in 14 days.
2. **The two questions are budget C (uncounted), not D.** You said *always*
   one question row. Counted against the two-a-day budget, your third lift with
   no number would have had nothing to ask. They are put on every ask that has
   no number until you answer for that lift; the questions switch silences both
   (the quote stands alone then). The step question (v73), when it is put, goes
   first — one row a sheet.
3. **"Push it" is labelled *Go for more*.** "push" is a word the in-gym copy is
   fenced against (`coach-voice.mjs`, the targets' word list). The stored value
   is the spec's `push`.
4. **"Confirmed once before any step"** is read as the spec's dial: going for
   more makes one session at the top enough instead of two. Mid-session, with
   no number in hand, I still name no heavier number — the jump is yours.
5. **A rough weight is not a target.** It is said back as your own number, the
   first-time line names it, and `loadLb` stays null so no box is pre-filled
   with a weight I have never seen you lift. Say if you want it to fill the box.
6. **The quiet line is unchanged.** The fallback is never raised as the line
   under a finished exercise: a line after a warm-up would spend the
   once-per-exercise line before the work starts.
7. **The builder's target line is unchanged** — its why already shows last
   time on a tap; the targets *sheet* is where the bare defer was.

## The gate

- `node --check` clean on every module; every verifier exits 0 in
  `America/New_York`, `UTC` and `Pacific/Auckland`, `coach-ready.mjs`'s 150 ms
  timing check included (it did not flake this time).
- New checks: `coach-live.mjs` M (Micah's scenario exactly, at one and four
  sessions, in pounds and kilos; each answer read back; consumption and expiry;
  questions off; idle, first-time with and without a told weight, an empty log,
  cardio, an empty list, the gate, junk; the engine's ease and push; a 600-ask
  sweep with no dead end), `coach-surface.mjs` O (the sheet for Micah's bench,
  the stamp on draw, Why?, *Match last time* → learnBy → the re-read and its
  chip through useNext; the first-time sheet, the number box, an empty Save, 135
  lb and 60 kg stored as pounds), `coach-state.mjs` E (the two stamps and facts
  round-trip, junk dropped), `coach-ask.mjs` A (twelve rows), `coach-prog.mjs`
  D (every defer's `last` is its why's last row). Old snapshots that quoted the
  dead line were updated literal by literal (`coach-live.mjs` K's defer).
- The battery at `GATE=all`: **wrong 0** (engine 0, untagged-warmup 0,
  needs-answer 0), 15 regressions pass, properties pass. 300 lifters, 25,179
  sessions, 2,400 cut-offs. Target, nextSet, volume, record and plateau counts
  are byte-identical to rack-v73 (target 8,389 / 1,556 miss; nextSet 38,245 /
  326; plateau 21,152 / 184); live decisions 87,978 (up from 76,490: the
  answered-question probes, 11,488, with 6,979 quote chips of last time scored —
  `F_QUOTE` 0, `F_AFTER_STOP` 0). Dead ends: 0 of 56,637 live asks, 0 of 8,171
  targets.
- Pure files as committed (sha256): see `NEXT-NATIVE-V74B.md` §1.
