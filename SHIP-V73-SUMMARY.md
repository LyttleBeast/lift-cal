# rack-v73 — "Another set, and at what weight?"

Shipped 22 Oct 2026 on branch `ship-v73`, from `rack-v72` (`90a965e`). Coach v2
ship 5 of six (`COACH-V2-SPEC.md` §5; `BUILD-PLAN.md` ship 5;
`/home/claude/coach-v2/SHIP-V73-PROMPT.md`). Micah, 21 Oct 2026: in the gym
Coach should answer the literal question — should I do another set, and at
what weight? The pieces were all there (the done read, the fatigue rule, the
counts, `nextSet()`); this ship composes them into one answer with chips that
act on it, and teaches Coach the one number a stack never tells the log: what a
step up is on a machine.

**Nothing in the published rules moves.** `database.rules.json` and
`database.rules.OPTIONAL-LOCK.json` are byte-identical to rack-v72. Everything
stored is a child of the already granted `settings/coach`: `knowBy.step`
(declared in v72, written for the first time), `tally` (v72's shape, written
for the first time) and one more per-lift `asked` stamp. No Worker change.

## What changed

**Phase A — `coach-live.js` `anotherSetRead(input, exId)`.** Pure, new export,
composed from the shipped reads in the stopping-bias order:

1. `doneRead` → `answer: 'no'`, the done read's words, one chip (*Done for
   today*), no number.
2. Fatigue on the lift today → `'stop'`: "That’s probably the set. Stay at
   190 lb or call it there." — *Same weight, 190 lb* (a quote) and *That’s the
   last one*; never a heavier chip. Fatigue here is `fatigueIn()` (F, rir 0, the
   rep drop against the first working set) **plus a stricter drop read against
   any earlier set at the same or a heavier load** (`dropFromAny`: 65 × 5, 75 ×
   3, 75 × 3, 75 × 1 is a drop at the top whatever the 65 was) and `nextSet()`'s
   own stop.
3. Mid-ramp (`nextSet` kind `warmup`) → `'warmup'`: the target he is working up
   to, with *Go to the working set, 190 lb × 8* and — when his last logged ramp
   has a row after the ones ticked (`input.lastRamp`, coach.js from
   `rampProfile`) — *Next warm-up, 95 lb × 8*, a quote of his own ramp.
4. The counts (`countsOf`, the helper `anotherRead` now shares): a strict
   majority past today's count → `'yes'` with the shipped sentence; three or
   more sessions otherwise → `'probably'`, "You usually stop about here: 3 sets
   in 8 of 8."; under three → `'yes'` with "One more is fine by the log; I
   don’t know your usual on this one yet." and `usual: null`.
5. The number: `nextSet` `same` → *Yes, 190 lb × 8*; `up` → *Yes* stays at the
   set he did and *Heavier, 195 lb × 8* carries the step; `down` → *Yes* at the
   set he did and *Lighter, 185 lb × 8*; then *That’s the last one* and *Done
   for today*. No `nextSet` → *Same again, 190 lb × 8*, a quote of the last
   ticked working set — **only when that set is plainly work** (`plainWork`:
   F, rir 0, more reps than any warm-up, at or near his last top on the lift,
   or a lift with no top in the log; never a load he only ever warms up with).
   Otherwise no number at all: "I’ll name a weight once you’re at your working
   weight." (see decision 4).

`text`/`short` as the brief words them ("Another set? 190 lb × 8." / "Another
set, same weight?" / "That’s probably the set."); `why` the counts, the fatigue
rule and `nextSet`'s reasons. `null` exactly where nothing is ticked, or the
exercise in hand is cardio.

**Phase B — `coach-prog.js`.** `stepOf(X, dir, equipment, lowerBody, u, told)`:
a told step (pounds, `ex.stepTold`) stands in for the default only — a jump
seen twice is his step whatever he said, so a stale fact is inert with nothing
written on paint; used only on the display unit's half grid (a 2.5-lb answer
read on a kilo account is 1.13 kg and is ignored). `{ source: 'told', n: 0,
stage: 'learning' }`; the target's why says "You told me one step up here is
10 lb." and the next set's "the step you told me." Threaded through
`liftOf()` → `baselines()`, `decide()`, `nextOf()`. `nextOf` already never says
`up` after a `down` today (v70); `coach-prog.mjs` L now asserts it over 600
histories.

**Phase C — `coach.js`, `coach-ask.js`, `coach-overlap.js`, `coach-data.js`.**
`lifts()` puts `stepTold` on a lift from `knowOf(settings, 'step', exId)`
inside its TTL (decision 1). `liveInput` gains `lastRamp(exId)`. `coach()`
gains `another(session, opts)` on exactly the `live` gate and
`liveQuestion(session, opts)`, the 'live' lane's one question about the lift
in hand. `coach-ask.js`: `q_equipment_step` — moments `['live',
'under:targets']`, "On Lat Pulldown, what’s one step up?", chips 2.5 · 5 · 10 ·
15 lb (kg: 1 · 2.5 · 5, values through `wIn`, labels through `labelW`) and
*Not sure*; `writes: 'knowBy'`, `key: 'step'`, `changes: ['lift_targets',
'live_read']`, cooldown 28 per lift under `asked.q_equipment_step:<exId>`,
budget D, ack "Noted. I’ll use that as the step here until your log shows me
another."; its gate is `stepAskLift()` — a machine, cable or plate lift (or a
dumbbell on a kilo account) with three or more exposures, no step the log has
seen twice, no told step inside its year, not asked inside 28 days. Under the
targets the candidates are the plan's lifts (`lift.targets`), in the live sheet
the lift in hand; `coach-overlap.js` `stepFor()` gives the gate a lift's step in
use (coach.js reaches coach-prog.js only through that file). `KNOW_KEYS.step`
takes a two-decimal number, not an integer (decision 3). `questionView` carries
`writes`/`key`/`by`/`stamp` and the unit's `optionsFor(u)` for a fact question;
the seven that store an answer are handed exactly what they were.
`normSettings()` keeps the new stamp, `patchNow()` prunes it at 56 days.

**Phase D — the surface.** `coach-ui.js` `openLiveSheet`: his bubble, Coach's
`another.text`, Why?, the effort row, the chip row (`coach-another`), the live
question (`coach-live-ask`). A chip with a number goes through the shipped
`opts.useNext` with the rated set's position (or the last ticked row of the
exercise, −1 when none) — one row, tw/tr, never ticked; *That’s the last one*
→ `opts.shown(exIdx)`; *Done for today* → `opts.done()`. After an effort tap
the answer and chips redraw from a fresh `another`, the shipped `rateAnswer`
line stays; the shipped next-set bubble and "Use it for my next set" stand only
when `another` is null. The habit read's `switch`/`next` keep their bubble and
*Add it* under the answer (decision 6). `learnTally({ extraOffered: 1 })` once
per open when a numbered yes/probably is drawn, `{ extraTaken: 1 }` on the Yes
chip, never on paint. One shared `writeAnswer()` for every question put (the
opener, under an answer, the live sheet). `noteLiveTick` reads `another`'s
`short`; `markNudgeShown`/`markAllShown` are the two chips' state. `workout.js`:
`shownLive`, `doneLive` (marks all shown, scrolls `#wkFinish` into view),
`liveOpts` hands both in. `rack.css`: the two hosts and the 44px chip.

**Phase E — verifiers and the battery.** `coach-live.mjs` K (36 checks),
`coach-prog.mjs` L (12), `coach-ask.mjs` G (22), `coach-surface.mjs` G and O
rewritten for the new thread (the step question drawn and answered, the tally
on draw and Yes only, nothing on paint), `effort.mjs` E, `tick-targets.mjs` J,
`coach-state.mjs` E, `coach-goal.mjs` (the step question under the targets),
`friends-structure.mjs` (`rack-v73`). Battery: `harness.mjs` calls
`coachLive.another()` after every tick beside `.live()` and checks it is
deterministic; `scoring.mjs` `scoreLive` reads `answer` beside `kind`
(`L_ANOTHER_F`/`L_ANOTHER_DROP` on a yes/probably over fatigue) and the new
`scoreChips` scores every numbered chip through `scoreNextSet` as the kind it
is (heavier → up, lighter → down, the warm-up chips as `warmup`, the rest as
`same`), with a heavier chip after a step down today → `N_STOPPED`;
`generator.mjs` gives `bodybuilder_volume` lifters `knowBy.step` on one to
three stack lifts from a second `R.fork()`. `sw.js` → `rack-v73`, `usage.js`
→ `rack-v73`.

## Decisions for Micah

1. **`stepTold` is set in `lifts()` (coach.js), not `liftsOf()`.** The brief
   named `liftsOf`, which only wraps `lifts()` for marks; putting it one level
   down is what lets the builder's target name "130 lb" on the pulldown after
   he answers *10* — the acceptance's last step needs the targets to read it,
   not only the live sheet.
2. **The step question is not re-asked while a told step stands.** The brief's
   gate was `step.source !== 'yours'` with a 28-day stamp, which would ask again
   every four weeks on a lift he has already answered. `stepAskLift()` also
   skips a lift with an unexpired told step; past the fact's year it asks once
   more. `changes` names `live_read` (an intent id, as v72's decision 1 settled)
   rather than the brief's `resp_live_session`, which is a response.
3. **`KNOW_KEYS.step` is a two-decimal number, not an integer.** v72 declared it
   `integer 0.5–100000`, which no 2.5-lb or kilo step passes (1 kg stores as
   2.2). AGENTS.md says so now; the native rules block already takes it.
4. **A quote is offered only when the set is plainly work.** The brief has the
   quote chip whenever `nextSet` is silent. The battery's first run put 199
   `N_WARMUP` wrongs on it: with no target, the live split calls the heaviest
   set so far the working set (harmless until v73 because no number came of
   it), and a bar set quoted as "Same again, 45 lb × 10" is exactly the wrong
   number this ship must never say. `plainWork` is the gate (coach-live.js);
   with it, and the stricter drop, the battery is at 0. The cost: on a defer
   with a set under his last top, the chips are *That’s the last one* / *Done
   for today* and the text says why.
5. **The sheet keeps the habit read's switch and next.** The brief did not say
   what becomes of "Chest has had its usual — Arms is untouched" and "you
   usually go to Cable Crossover" with *Add it*; dropping them would lose the
   only way Coach puts an exercise in front of him. They are drawn as a second
   bubble under the another answer; the habit read's `done` and `another` are
   not drawn twice.
6. **The scorer reads a quote as a quote.** `scoreChips` exempts a `same` chip
   from `N_REPS` and `N_GRID` (its reps and load are the set he just did — a
   kilo account's 65-lb set is still his set) and from `N_WARMUP` when it sits
   at 93% or more of his last top on the lift; a heavier chip after a drop
   set's strips is not "after a step down" (coach-prog.js reads `done` without
   them, and so does the harness now).
7. **Under the targets, the step question can outrank an aim question that was
   asked and left.** The picker's repeat penalty (−1 inside 28 days) puts a
   left aim at 3 against the step question's 4; on a fresh lane the aim still
   comes first (tie, catalog order). `coach-goal.mjs` reflects it. Say if you
   want the two profile questions always first — one line in `pickQuestion`.
8. **The quiet line now appears after every finished exercise**, thin log
   included ("Another set, same weight?" / "Another set?"), because
   `anotherSetRead` always has an answer once a set is ticked. The once-per-
   exercise rule and the dismiss are unchanged.
9. **`T_NONUM` and `N_NOSTEP` did not fall.** The brief expected them to with
   `knowBy.step` on machine lifts; `T_NONUM` counts barbell and dumbbell lifts
   only and `N_NOSTEP` was already 0 at the v72 baseline. The told steps are in
   the battery and cost nothing (wrong 0); the counts are honest.
10. **`coach-overlap.js` moved** (one new export, `stepFor`) beside the four
    pure files the brief listed; NEXT-NATIVE-V73.md names five.
11. **The `GUARDTEST` canary echoed** in this session, as in v71 and v72 — the
    deny rules live in the mobile and worker repos, not a fresh lift-cal clone.
    Nothing here needed `wrangler`, `firebase`, `eas`, `gh` or a push to
    `main`, and none was run; the branch is `ship-v73` and only it was pushed.
    Two edits were made with short `node` scripts (moving a block within a
    file) rather than the Edit tool — the brief asks for Edit; noted.
12. **Not built, by the brief:** the builder's set-count rule from
    `tally` (03 §2.2 #14), the per-lift `declined` counter (03 §3.5), the tone
    lines after a rating (03 §3.4 — `rateAnswer` is unchanged), the recap's
    `q_stop_ok` after *Done for today* (silent, OPEN-QUESTIONS #7 default).

## The gate

- `node --check` clean on every module; the verifiers — 103 files — exit 0 in
  `UTC`, `Pacific/Auckland` and `America/New_York` (`coach-ready.mjs`'s 150 ms
  timing check included); `coach-voice.mjs` P reports zero offences.
- The battery at `GATE=all`: **wrong 0** (engine 0, untagged-warmup 0,
  needs-answer 0), 15 regressions pass, properties pass. 300 lifters, 25,179
  sessions, 2,400 cut-offs; live decisions 76,490 (doubled: `another` is asked
  after every tick beside `live`), nextSet + live miss 614 of 114,735 = 0.5%
  (≤ 1%). Every other surface's counts are byte-identical to the v72 baseline
  (target 8,389 / 1,556 miss; nextSet 38,245 / 326; plateau 21,152 / 184).
- Pure files as committed on `ship-v73` (sha256):
  `coach-live.js` `ba02e1215fcf437a6f35a966c6ececf7059f62ae48dcded5ebc00083d1e7bef7`,
  `coach-prog.js` `0299ae7094a9822c662855c48eba7f9dd96a7549dee02c97f1c92dc57c83b1ac`,
  `coach.js` `867de74e9a5599940fea1be144fa9e0be7669a66ef470e980d9ff6d53e3f6294`,
  `coach-ask.js` `280d39d735bded3a64af31252dd271ddcb972713f47b67fec6e8ff364778565e`,
  `coach-overlap.js` `72cbd40f8922378c9d96997df97e3178a9530f035d0a74b5ac0cdc671b435fbb`.

## Handoff

- **Shipped** — Coach answers the literal question in the gym: tick the last
  planned set and the line reads "Another set? 185 lb × 8."; the sheet says
  why, rates the set, and offers *Yes, 185 lb × 8* / *Heavier* (only when
  `nextSet` earns it) / *That’s the last one* / *Done for today*, every number
  a target or a quote, never heavier after a fail, a too-hard rating, a rep
  drop or a step down; and on a machine with no learned step it asks once
  "On Lat Pulldown, what’s one step up?" and uses the answer until the log
  shows another.
- **Service worker** — `rack-v73` (`sw.js` and `usage.js` together).
- **Before it's live** — nothing: merging `ship-v73` is enough.
  `database.rules.json` is unchanged by one byte; no Worker change.
- **To check it worked** — after merging, close Rack from the app switcher,
  open it, close and open once more. Tick the last planned set of bench: the
  line under it reads "Another set? 185 lb × 8." (your target's number). Tap
  it: the sentence ("Another set of Barbell Bench Press is in line with what
  you usually do: … I’d stay at 185 lb."), **Why?**, the effort chips, then
  *Yes, 185 lb × 8* / *That’s the last one* / *Done for today*. Rate it *Way
  too easy*: *Heavier, 190 lb × 8* appears beside *Yes*. Rate it *Too hard*:
  the heavier chip goes, the sentence reads "That’s probably the set. Stay at
  185 lb or call it there." with *Same weight, 185 lb* / *That’s the last one*.
  Tap *Yes*: the sheet closes and a new row carries grey 185 × 8. On a lat
  pulldown (or any cable/machine lift with three sessions and no learned step)
  the sheet ends with "On Lat Pulldown, what’s one step up?" and 2.5 · 5 · 10 ·
  15 lb · Not sure, once; after *10*, "What should I lift today?" names ten
  more on it and the live sheet's *Heavier* chip exists there.
- **Risk** — the chip row's one-tap write of a row: the shipped `useNext` path
  (one unticked N row gets tw/tr, nothing ticked, `tick-targets.mjs` J,
  `effort.mjs` D/E), and a tap closes the sheet before it writes, so a double
  tap cannot write twice. The quiet line is now raised after every finished
  exercise, so a thin log says "Another set, same weight?" where it used to say
  nothing — true by the log, but more often on screen; the × and the once rule
  stand.
