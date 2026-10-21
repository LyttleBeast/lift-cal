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
Every `repro:` line in the report is a `repro.mjs` command. `GATE=all` runs
the stricter gate (see below). `--repo` on any script defaults to the repo
the battery sits in.

## Verdicts

- **ok** — Coach said something true and useful, or was rightly silent.
- **miss** — Coach was safe but said less than the truth allowed (a defer
  where a target was possible, a false "stop").
- **wrong** — a confident wrong number or advice that would harm (a heavier
  single, a jump past the safe limit, "one more set" after failure, a record
  day on a marked lift). **Wrong must be 0.**

Each wrong carries a `cause`: `engine` (a shipped rule), `untagged-warmup`
(a W the lifter never typed — the ramp model, rack-v70, is what fixes
those), or `needs-answer` (judged against a fact Coach has not asked for yet).
Every code is documented once in `scoring.mjs`.

## The gate (BUILD-PLAN.md)

| gate | threshold |
|---|---|
| `properties.mjs` | all four pass (deterministic, order-blind, unit-mirror, ban) |
| `regress.mjs` | every case passes by the ship that fixes its code |
| harness **wrong**, cause `engine` | **0** — from rack-v69 on (`--gate engine`) |
| harness **wrong**, cause `untagged-warmup` | reported in v69; **0** from v70 on (`--gate all`) |
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
