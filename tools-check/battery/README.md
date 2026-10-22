# The Coach battery

A simulator of lifters, and a scorer for what Coach says to each of them. The
generator (`generator.mjs`, seeded, `rng.mjs`) writes 300 synthetic lifters
across 22 archetypes — novices, powerlifters, bodybuilders, a layoff, an
injury, a plateau, kilo accounts, people who never tag a warm-up — each as
Rack-format `workouts` records with the **truth** beside them (the true
working load, which sets were warm-ups, the lift's real step and grid, the
day's capacity). The harness (`harness.mjs`) stages Coach's real pure modules
from this repo (`stage.mjs`, no copy of any rule here), cuts each log at eight
points, and at every cut asks Coach for the target, the next set after every
ticked set, the live read, the weekly volume, the record day and the plateau
read, then scores every decision (`scoring.mjs`) against the truth.

It lives in the repo since rack-v69 so every Coach ship runs it.

## The three commands

```bash
bash tools-check/battery/run-all.sh                     # the gate: properties, regressions, 300 × 8 battery
node tools-check/battery/harness.mjs --n 60 --cuts 4    # the inner loop while fixing something (seconds)
node tools-check/battery/repro.mjs --archetype X --seed N --session K --ex id   # one flagged decision, in full
```

`run-all.sh` writes `out/battery.txt` and `out/report.json` (ignored by git).
Every `repro:` line in the report is a `repro.mjs` command. Since rack-v70 the
gate is `all` — every wrong fails the run; `GATE=engine` runs rack-v69's
engine-only gate (see below). `--repo` on any script defaults to the repo the
battery sits in.

## Verdicts

- **ok** — Coach said something true and useful, or was rightly silent.
- **miss** — Coach was safe but said less than the truth allowed (a defer
  where a target was possible, a false "stop").
- **wrong** — a confident wrong number or advice that would harm (a heavier
  single, a jump past the safe limit, "one more set" after failure, a record
  day on a marked lift). **Wrong must be 0.**

Each wrong carries a `cause`: `engine` (a shipped rule), `untagged-warmup`
(a W the lifter never typed, on a lifter who does not tag them — the ramp
model of rack-v70 is what reads those), or `needs-answer` (judged against a
fact Coach has not asked for yet). Every code is documented once in
`scoring.mjs`.

### The ramp, scored (rack-v70)

The live next set has a `warmup` kind since v70 — "Warming up. The target when
you get there: …" — and `scoreNextSet` judges it on one thing: was the set
just ticked really a warm-up? On a true ramp set it is ok; on a true working
set it is `N_WARMUP_WORK`, a working set read as a warm-up. `N_WARMUP` (a
warm-up quoted as the next working set) is unchanged, except that a quoted
load equal to the day's own target is Coach repeating its plan, not reciting
the ramp — the same sentence the `target` kind says before anything is ticked.
The live read's `workDone` already counts the truth's `workIdx` only. A target
whose rows dropped a W row heavier than a reduced top is walked row by row
against last time's (`T_GHOST`), a dropped W never a ghost. A null next set is
`N_NULL` (a miss) only after a true working set on a straight-sets lift with a
numeric target — so Coach saying nothing on a ramp set costs nothing, and
saying nothing on a working set it cannot tell from one costs a miss, never a
wrong. Each next-set row in the report carries the day's `target` (pounds),
its `mode` and `today` (the ticks so far), for reading a report by hand.

### Dead ends (rack-v74)

Micah's bench, 22 Oct 2026: four typed warm-ups ticked, last time 225 × 4 and
225 × 2, and the sheet said "Nothing I can add from your log right now." The
harness now opens the sheet as he would at every moment — before the first set
of each exercise, after every tick, warm-ups included — and reads what
`coach-ui.js` would draw (another, the habit read, the next set, and since v74
the fallback where all three are silent). `scoring.mjs` `deadEndOf()` calls it
a dead end when nothing is drawn, a shipped dead line is drawn, or a yes has no
number, no quote and no question; `deadTarget()` when a target is a defer drawn
without last time beside it. Both are printed as rates (`dead ends (v74):`),
and under `--gate all` a dead end in the live sheet fails the run
(`--no-dead-gate` measures an older build). The fallback's answers are scored
too: the harness answers "what are you going for?" on every lift of the cut
(same / ease / more, rotated), and every quote chip it brings must be a set of
the lift's last logged session (`F_QUOTE`) and never stand after a stop today
(`F_AFTER_STOP`). rack-v73 measured 20.35% of live asks (40.8% after a warm-up)
and 23.39% of targets; rack-v74 measures 0.

### What he said (rack-v72)

Since v72 a lifter can carry `settings.knowBy.warm` — what he told Coach about
warm-ups on a lift. The generator draws it from a fork at the very end of a
lifter (so every seed keeps its lifter): a `tags_everything` lifter has said
`yes` on one or two lifts; a bodybuilder-based lifter has said `no` on one
loaded lift, and the truth is made true of it — that lift's warm-up sets are
taken out of its sessions and truth rows (`truth.exercises[id].warmNo`). A
target that still reads a ramp into such a lift (a row marked `ramp`, or
fewer rows than last time's sets) is `T_CONTRADICT`, a wrong.

**`scoreRamp` — not yet.** When a later ship proposes a ramp (the recap's
"Were 45, 135 and 225 your warm-ups?", rack-v72, and whatever draws his ramp
rows), the thing to score is the proposal itself: every load it names must be
a load the lifter has warmed up with on that lift (the truth's `ramp` rows),
never a generated one, and a lift the truth says he never warms up on gets no
proposal. Nothing in v70 proposes, so there is nothing to score yet; the hook
is `scoring.mjs`, beside `scoreNextSet`.

## The gate (BUILD-PLAN.md)

| gate | threshold |
|---|---|
| `properties.mjs` | all four pass (deterministic, order-blind, unit-mirror, ban) |
| `regress.mjs` | every case passes by the ship that fixes its code |
| harness **wrong**, cause `engine` | **0** — from rack-v69 on (`--gate engine`) |
| harness **wrong**, cause `untagged-warmup` | reported in v69; **0** from v70 on (`--gate all`, the default since v70). rack-v70 shipped at 0: where the live next set cannot tell a warm-up from a working set (a set under a target that came down; a deload's first sets) it says nothing, and the cost is `N_NULL` misses (320 of 38,280 at v70), inside the nextSet + live bar; see SHIP-V70-SUMMARY.md |
| harness **wrong**, `needsAnswer` | 0 once the question exists (v74); reported until then |
| harness **miss**, target surface | ≤ 10% of target decisions, and `T_DEFER` on `intermediate_double` ≤ 3% — from v70 on |
| harness **miss**, nextSet + live | ≤ 1% |
| `P_MISS` on the `plateau` archetype | ≤ 20% of its plateau reads (reported) |
| run time | < 2 min for 300 × 8 |

A wrong bar is never moved. A miss bar may be moved with a sentence here
saying why.

## Regression cases

`regress/*.json` is one file per bug the battery found, re-run forever. Every
bug a ship fixes gets a case from the harness's `repro:` line:

```bash
node tools-check/battery/regress.mjs --add "--archetype X --seed N --session K --ex id" --forbid CODE --note "what went wrong"
```

## The one rule of the generator

**A generator draw order is never changed in place.** Every lifter is its
seed, and every regression case names a seed: insert a draw into an existing
branch and every lifter after it is a different person, and every case points
at a session that no longer exists. A new behaviour that needs randomness
draws from `R.fork()` instead, so the existing draws keep their order.
