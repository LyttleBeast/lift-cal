# COACH TRAINER — stage one: targets (web only) → rack-v48

Build brief for a single overnight Claude Code run in `~/dev/ship-v48`, a fenced
clone of lift-cal at `124d33a` = **rack-v47**. Written 23 Sep 2026 from a read of
the live source and from `COACH-TRAINER-SPEC.md`, which sits beside this file in
the clone root. **Where the two differ, this file wins.** The spec is the design
record: read §0, §3 and §8 before you start and commit it with the docs.

**Micah answered every open decision on 23 Sep 2026. His answers are in §15 and
are already written into the rules below; where §15 and the spec differ, §15
wins.**

**Before the run starts (Micah):** the clone must be a **full** clone, not a
shallow one: `estimate-origin.mjs`, `maintenance.mjs` and `units.mjs` read old
commits (9c1f0af, 166455c) and fail on a shallow history. Copy this file and
`COACH-TRAINER-SPEC.md` into the clone root first.

This is the first of five stages. The overlap engine (plateau vs dip), the card
rework, the fueling brain and in-gym targets are stages two to five. **None of
them is in scope tonight.** The native port is a separate run and is **not** in
scope tonight.

---

## 0. THE ONE-PARAGRAPH VERSION

Coach can read the log (ship one), build a workout from it (ship two) and say
what comes next in the gym (ship three). What it has never done is the thing
every paid lifting app does: **say what weight and reps to do next time.**
Tonight it learns to, deterministically, from the account's own history. You
build two pure modules: `coach-goal.js` (the goal as answers to two new Coach
questions, the dials each goal turns, and an energy context read off the weight
trend) and `coach-prog.js` (per-lift baselines and `prescribe()`). Then you
wire them into the builder: a target line under every exercise, a new main
button, **Start with Coach’s targets**, that starts the workout with the targets
as grey ghost text (ticking a set adopts them, the v46 rule), a Train bubble, **What
should I lift today?**, and a **Your goal** block in Settings → Coach. No new
reads, no new database node, no rules change, no change to any logged record.

---

## 1. NON-NEGOTIABLES

From CLAUDE.md, AGENTS.md and DEPLOY.md. A run that breaks one has failed,
whatever else it built.

1. **Vanilla ES modules.** No dependencies, no package.json, no npm, no bundler,
   no build step. Do not add any.
2. **Bump the service worker in TWO files.** `sw.js` `const CACHE='rack-v47'`
   and `usage.js` `const VERSION = 'rack-v47'` both become `'rack-v48'`. They
   must match (`tools-check/version-match.mjs`).
3. **Syntax check with the redirect form only**:
   `node --check --input-type=module < "$f"`. Plain `node --check file.js`
   silently passes a broken ES module.
4. **Every verifier under `tools-check/` exits 0** before you finish, the ones
   you add included. Both loops from CLAUDE.md.
5. **Match the surrounding file.** Small diffs. Read narrowly (`coach.js` is
   2,872 lines; grep for the symbol and read the range). Comments explain *why*,
   in the voice of the file you're in.
6. **Never commit a key.** Do not touch the Worker, Firebase, or anything that
   deploys.
7. **Do not push.** The pre-push hook refuses. Commit only. Micah pushes.
8. **Keep README.md, AGENTS.md, BACKLOG.md and CLAUDE.md's Layout table true.**
9. **Finish with the five-line handoff** from CLAUDE.md.
10. **Do not read outside this clone.** `~/dev/rack-mobile` is fenced off and a
    read of it is refused. That's expected.

### The wrong-number rule

> *A wrong number is worse than no number.*

Tonight it has its sharpest edge yet, because tonight Coach names a weight to
put on a bar. So:

- **Every weight Coach names is a load logged on that exercise, or reachable
  from the last top load by at most two of that exercise's own steps** (or, on
  re-entry after a layoff only, up to six steps *below* it, because lighter is
  the safe direction). Never a percentage. Never a plate combination nobody
  chose. Never a number stepped from a load that is itself off the grid.
- **A target with no number never turns into a 0-lb set.** Ticking adopts
  ghost text, and an empty weight box is recorded as `'0'`, which is a
  bodyweight set (`collectFrom`, `workout.js`). So wherever a target names no
  number, the weight ghost stays last time's weight.
- **When Coach doesn't know an exercise's step, it prints no number.** "The next
  setting up" is a complete, honest target.
- **Silence is always available.** A `defer` with last time quoted is a correct
  answer, not a failure.

### The units rule

Pounds are the single stored unit forever. **Every comparison in `coach-prog.js`
happens in the display unit**, because that's the unit the plates are in. Every
printed weight goes through `units.js`. `tw` is stored pounds as a string,
exactly like `w`. A pound threshold dressed as English ("the next 5 lb") is a
false sentence on a kilo account. The step is printed through `labelW`-style
conversion of the step itself, or not at all.

---

## 2. WHAT THIS SHIP REVERSES, DELIBERATELY

Two shipped comments say Coach never names a next weight:

- `coach-build.js` `nudge()`: *"PROGRESSION IS A NUDGE, NEVER BAKED IN … no next
  weight, no step, no 'try'."*
- `coach-live.js`: *"NO WEIGHT, EVER. Nothing here says heavier, lighter, or a
  number to put on the bar."*

**Tonight reverses the first, in one fenced place, and leaves the second
exactly as it is.**

- The builder's `note` (the nudge) **stays a readout**. Its voice check stays.
  The prescription is a **separate field**, `target`, produced only by
  `coach-prog.js`, under its own verifier.
- Nothing is ever pre-filled into `w`/`r`. Targets travel as `tw`/`tr` ghost
  text, and only a tick turns one into a logged set (the v46 rule, `tickSet` in
  `workout.js`).
- **`coach-live.js` is untouched.** Mid-session stays weight-free tonight. Its
  verifier's "a number to put on the bar must be a quote" check must still pass
  unchanged.

Rewrite the `nudge()` comment, **and the file's header comment**
(`coach-build.js` lines 9–15: "THE BUILDER NEVER INVENTS A WEIGHT … the layoff
step-down is a refusal"), so both are true: the nudge is still a readout; the
builder still never invents a number itself; the prescription lives in
`coach-prog.js`, and on re-entry it names a load he has logged or a whole number
of his own steps below his last top set, never a percentage.

---

## 3. ARCHITECTURE

```
coach-goal.js   NEW, pure   aims, experience, the dials table, energyContext()
coach-prog.js   NEW, pure   exposuresFor(), baselines, status, prescribe()
coach.js        facts coach.aim, coach.experience, weight.energy, lift.targets;
                questions q_goal_aim, q_experience; category `targets`;
                intent lift_targets; route ask_targets; builderInput passes
                the goal and the energy context
coach-build.js  attaches `target` to each proposal row and builds the
                `targets` view
coach-ui.js     the target line, the fifth button, the Your goal rows
settings.js     nothing new beyond what coach-ui.js's rows draw
rack.css        one small rule for the target line
```

**Purity**, exactly as for `coach.js`: no DOM, no reads, no module state, no
`Date.now()` (the clock is an argument). `coach-goal.js` imports nothing, or
only `units.js`. `coach-prog.js` may import `coach-goal.js`, `units.js`, `exercises.js`,
`coach-tags.js`, and the **pure** half of `analytics.js` (`e1rm`, `isWorking`,
`mergeSessionExercises`). Never `loadAll`/`allSessions`. Both are copied
verbatim to `src/pure/` in the native tree.

**Import direction:** `coach.js` → `coach-build.js` → `coach-prog.js` →
`coach-goal.js`. `coach.js` may import both new modules. Nothing imports back.
Update `tools-check/coach-pure.mjs`'s ALLOWED lists deliberately (§10).

---

## 4. RESOLVED DECISIONS — do not re-litigate

### 4.1 The goal is answers to Coach's own questions

No new key under `settings/coach`. Two new entries in `QUESTIONS`:

```js
{ id: 'q_goal_aim',
  text: 'What are you training for right now?',
  options: [ { value: 'strength',     label: 'Get stronger' },
             { value: 'powerlifting', label: 'Powerlifting' },
             { value: 'muscle',   label: 'Build muscle' },
             { value: 'cut',      label: 'Lose fat, keep strength' },
             { value: 'recomp',   label: 'Recomp' },
             { value: 'maintain', label: 'Stay consistent' } ],
  changes: ['lift_targets'],
  fact: 'coach.aim',
  always: true,                 // shown in Settings before it is answered
  where: 'targets',             // asked under a targets answer, never as the sheet's opener
  ack: 'Noted. Coach sets your targets with that in mind.',
  when: d => d.f('coach.aim') == null }

{ id: 'q_experience',
  text: 'How long have you been lifting consistently?',
  options: [ { value: 'new',   label: 'Under 6 months' },
             { value: 'some',  label: '6 months to 2 years' },
             { value: 'years', label: '2 years or more' } ],
  changes: ['lift_targets'],
  fact: 'coach.experience',
  always: true,
  where: 'targets',
  ack: 'Noted. That sets how big a jump Coach will suggest.',
  when: d => d.f('coach.aim') != null && d.f('coach.experience') == null }
```

- **Where they're asked.** Not as the sheet's opening question. The shipped
  `pendingQuestion()` skips any question that carries a `where`, so every
  existing fixture, every Basic account and every account with targets switched
  off is never asked. Instead, the `lift_targets` answer (§7.1) carries the
  first unanswered goal question, and the sheet draws it under that answer with
  the same chips and the same `answerQuestion()`. *Why:* that's the moment the
  answer changes something he can see, and it's behind the Pro gate and the
  `targets` switch by construction.
- **The acknowledgement.** The sheet's reply after an answer is hard-coded
  today ("Noted. That changes how Coach reads your weight.", `coach-ui.js`
  ~line 519), which would be false for these two. Each question gains an `ack`
  line; the sheet prints `q.ack`, falling back to today's line, and
  `q_goal_direction` gets today's line as its `ack` so nothing it says changes.
- **Order in `QUESTIONS`**: the shipped `q_goal_direction` stays first; the two
  new ones follow.
- `normSettings()` already validates answers against each question's options,
  so **its shape does not change**. Confirm that by test, not by reading.
- `asked.q_goal_aim` (stamped by `answerQuestion()` on every answer) is when the
  goal was set. Nothing reads it tonight. Stage three does.
- **Settings shows questions with `always: true` even unanswered**, under a
  heading **Your goal**, with nothing selected until answered. Every other
  question keeps the shipped rule (shown only once answered). Six options don't
  fit the segmented control on a phone: for more than three options, draw a
  vertical list of choice rows. Look for the closest existing pattern in
  `settings.js`/`ui.js` before writing one.
- **Why not a `goal` key:** the registry verifier drives every question by
  writing its answer and checking its fact moves. Answers are the machinery that
  already exists, validates, stamps and shows in Settings. A `goal` object would
  be a second record of the same fact.

### 4.2 Fact ids stay in the ten families

`coach.aim`, `coach.experience` (each reads its own answer and declares
`usesAnswers` back), `weight.energy` (from `d.input.weight` via
`energyContext()`), `lift.targets` (the default proposal's targets). The
registry's family check and "exactly family.name" check must pass **without
being edited**.

### 4.3 One new category, `targets`

```js
{ id: 'targets', label: 'Weight and rep targets', mutable: true,
  note: 'What to put on the bar next time, worked out from your own sessions.' }
```

Inserted **directly after `build`** in `CATEGORIES`. That shifts every later
category's index by one and keeps their relative order, so no ranking changes
(the category index is only the fourth tie-break key, and `targets` has no
ranked finding). `coach-rank.mjs` must pass unchanged. Muted, there's no target
line, no fifth button and no bubble. Absent means on, like every other switch.

### 4.4 Tier

The builder is Pro, so targets are Pro. `lift_targets` is `tier: 'pro'`.
`PRO_ADDS` picks the new category up by itself. Basic sees no change except that
line in the Pro panel.

### 4.5 Not tonight

- **No mid-session targets.** `coach-live.js` is untouched.
- **No card change.** The You and Train cards are exactly as they are.
- **Status is computed, not shown.** `coach-prog.js` computes each lift's
  status (progressing/holding/stalled/declining) because the confirmation dial
  and the battery need it. **No sentence prints it tonight.** Stage two puts it
  next to the context that interprets it; a stall readout without context is the
  defect v43 fixed.
- **Energy context comes from the weight trend only.** No food reads.
- **No lift target, no focus group, no onboarding step.** Stage three.

---

## 5. `coach-goal.js`

```js
export const AIMS = ['strength', 'powerlifting', 'muscle', 'cut', 'recomp', 'maintain'];
export const EXPERIENCE = ['new', 'some', 'years'];

/* The dials. One row per aim, plus `none` for an account with no aim. */
export const DIALS = {
  strength: { confirm: 1, maxSteps: 2, band: { compound: [3, 6],  isolation: [8, 12]  } },
  // Micah's 23 Sep answer: its own goal, not a label on Get stronger. Tonight it
  // differs in its bands (competition-style 3–5, heavier accessories 6–10);
  // later stages give it the big three (pace on squat, bench and deadlift).
  powerlifting: { confirm: 1, maxSteps: 2, band: { compound: [3, 5], isolation: [6, 10] } },
  muscle:   { confirm: 1, maxSteps: 1, band: { compound: [6, 10], isolation: [10, 15] } },
  cut:      { confirm: 2, maxSteps: 1, band: { compound: [5, 8],  isolation: [10, 15] } },
  recomp:   { confirm: 1, maxSteps: 1, band: { compound: [6, 10], isolation: [10, 15] } },
  maintain: { confirm: 2, maxSteps: 1, band: { compound: [6, 10], isolation: [10, 15] } },
  none:     { confirm: 1, maxSteps: 1, band: { compound: [6, 10], isolation: [10, 15] } }
};

/* % of bodyweight per week, from the weight trend. */
export const ENERGY_DEEP = -0.75;     // Garthe 2011: 0.7%/wk kept strength, 1.4% did worse
export const ENERGY_DEFICIT = -0.25;  // inside ±0.25, a week's trend is mostly scale noise
export const ENERGY_SURPLUS = 0.25;
export const ENERGY_MIN_DAYS = 14;

export function energyContext({ rateWk, latestLb, rateDays }) → 'deep' | 'deficit' | 'hold' | 'surplus' | null
  // null unless rateWk is finite, latestLb > 0, and (rateDays == null || rateDays >= 14)
  // pct = rateWk / latestLb * 100; pct <= -0.75 deep; <= -0.25 deficit; >= +0.25 surplus; else hold

export function dialsFor({ aim, exp, energy, slowSlope, fastSlope }) → { confirm, maxSteps, band }
  // start from DIALS[aim] || DIALS.none
  // energy === 'deep'              → confirm = 2, maxSteps = 1
  // energy === 'deficit'           → maxSteps = 1
  // slowSlope (§6.8)               → confirm = 2
  // fastSlope && exp !== 'new'     → maxSteps = max(maxSteps, 2), unless energy is deep or deficit
  // exp === 'new'                  → maxSteps = 1
```

Each constant carries its one-line *why* in a comment. `DIALS` and the thresholds
are exported so the verifier checks against them rather than a copy.

---

## 6. `coach-prog.js` — THE ALGORITHM

This section is the contract. The battery in §10 is built from it. If you find a
case where following it literally produces an unsafe or silly target, **stop,
write the case at the top of COACH-REPORT.md, and choose the more conservative
answer**. Don't quietly invent a new rule.

### 6.1 Exposures

```
exposuresFor(sessions, exId) → [ { startedAt, date, sets } ] oldest → newest
```

One per session that contains `exId`, after `mergeSessionExercises` (one entry
per exId per session, sets concatenated, the house invariant). `sets` = working
sets only: `type !== 'W'` and `parseInt(r) >= 1`; `allSets` = every set as
logged, warm-ups included, for the ghost targets (§6.9). Sessions with no
working set are skipped. Two sessions on one day are two exposures, ordered by
`startedAt`. The input order of `sessions` must not matter: sort first.

### 6.2 Vocabulary

- `Lu(set) = round2(wOut(parseFloat(set.w) || 0, u))`, the load in the display
  unit.
- `onGrid(Lu)`: `|Lu − round(Lu × 2) / 2| < 0.01`, a multiple of 0.5 in the
  display unit. On pounds nearly every typed load is. On kilos this keeps out
  the old pound-typed loads of someone who switched (225 lb = 102.06 kg; and
  0.5 rather than 0.25, because 210 lb = 95.254 kg would pass a 0.25 grid and
  95.25 kg is not a weight anyone loads).
- **Top load `T`** = max `Lu` over the exposure's non-`D` sets (for an
  assisted lift, the **min**: the least assistance is the hardest set).
  **Top sets** = non-`D` sets within 0.01 of `T`. `k` = their count. `R` =
  their reps.
- **Scheme**: `bw` if every set's `Lu === 0`; else `straight` if `k ≥ 2`; else
  `top`.
- **Assisted**: `exId === 'assisted-pull-up'`, or the name matches `/assist/i`.
  `dir = assisted ? −1 : +1`. Progress means `dir` × a step.
- **Off-grid last load**: if `T` of the last exposure is not `onGrid`, no mode
  may print a load derived from it (§6.6). The target keeps its reps and its
  mode, names no number, and the weight ghost is last time's.
- **Lower body**: group `legs`, or tag pattern `squat` | `hinge` | `lunge`.
- **Load type**: the tag's `load` (`compound`|`isolation`); a custom exercise
  has none.

### 6.3 Gates, first match wins

```
1  equipment === 'cardio'                         → return null
2  no exposures                                   → FIRST
3  last scheme is bw, or (equipment === 'bodyweight' and every set's Lu === 0)
                                                  → BODYWEIGHT (it has its own layoff rule)
4  any top set has R === 1                        → DEFER('heavy')
5  scheme === 'top' and R ≤ 3                     → DEFER('heavy')
   (4 and 5 come BEFORE the layoff gate: a single from 18 days ago must never
    come back as "405 for 1", nor step down into a heavy re-entry)
6  TWO CLOCKS (Micah's 23 Sep answer: the muscle group sets how far back to
   start; the lift's own clock only holds it):
     g  = daysBetween(last.startedAt, now)        this lift   (noon-anchored)
     gg = min(g, ex.groupDaysSince)               this lift's primary group:
                                                  days since ANY working set of it
     gg > 30          → REENTER(0.80)
     15 ≤ gg ≤ 30     → REENTER(0.90)
     g ≥ 12           → HOLD('back'): load T, reps = last R  (no jump the
                        first time back on this lift, even if the group has
                        been trained, e.g. squat after weeks of leg press)
7  ≥ 2 exposures and scheme(prev) !== scheme(last) → DEFER('shape')
8  |T_last − T_prev| > 0.15 × T_prev, and no gap > 21 days between them
                                                  → DEFER('shape')   (a new programme)
9  max(R) − min(R) ≥ 6                            → DEFER('erratic')
```

### 6.4 The rep range — learned from where he moves up

A range built from recent reps is dragged down by the session it's judging (a
bad day at 6 would make 6 "the range" and the miss would never be called). So
the range is learned from **load increases**.

```
regime:   exposures in the last 84 days, after the most recent top-load change
          of more than 15% between consecutive exposures not separated by a
          gap > 21 days, EXCLUDING the last exposure (the one being judged)
pairs:    consecutive exposures (a, b) in the regime with dir·(T_b − T_a) > 0
          hiSample = min(R_a)   loSample = min(R_b)

learned:  ≥ 2 pairs → hi = Math.round(median(hiSamples)),
                      lo = Math.round(median(loSamples));
          hi === lo → fixed-rep (lo = hi = R); lo > hi → treat as no pairs
          source 'yours'; stage 'learning' at 2–3 pairs, 'yours' at ≥ 4
repeated: < 2 pairs, ≥ 3 regime exposures, and in ≥ 3 of the last 4 every top
          set has the same R, the same each time → fixed R; source 'yours',
          stage 'learning'
default:  otherwise: the DIALS band for the load type (a custom exercise gets
          [band.compound[0], band.isolation[1]]); source 'default', stage
          'learning'; usable ONLY if every TOP-SET R of the last exposure is
          within [lo, hi + 2], else → DEFER('range')
```

**Coach never calls a miss against a range he didn't show it.** With a default
band a set below `lo` can't reach the miss branch, because the usability check
above has already deferred. Keep it that way.

### 6.5 The step

```
observed: for consecutive exposures i−1 → i where both T are onGrid and
          T changed: diff = dir × (T_i − T_{i−1}); keep 0 < diff ≤ 0.15 × T_i;
          round diff to the nearest 0.5; the step is the SMALLEST diff seen
          at least twice. Stage: yours at ≥ 4 occurrences, learning at 2–3.
default (no observed):
          pounds: barbell & lower body → 10; barbell other → 5; dumbbell → 5;
                  everything else → null
          kilos:  barbell & lower body → 5;  barbell other → 2.5;
                  everything else → null
          (custom exercises use their own `equipment` field the same way)
micro:    if the range source is 'default' and S and S / T > 0.10
          → hi_eff = hi + 2; else hi_eff = hi. A learned range already says
          when he moves up on this lift, so it is left alone.
```

### 6.6 The decision (straight or top scheme)

```
hitTop  = every top R ≥ hi_eff
inRange = min(R) ≥ lo
anyF    = some top set has type 'F'
triples = scheme straight and fixed-rep and R ≤ 3    (3×3, 5×2 …)

if hitTop:
    need = dials.confirm; if triples: need = 2
    confirmed = need === 1 or (prev exposure has |T_prev − T| < 0.01 and was hitTop)
    if !confirmed → HOLD('confirm'): load T, each set's target = its last R
    steps = 1        (after a re-entry, back up ONE jump at a time: Micah's 23 Sep answer)
    if dials.maxSteps ≥ 2 and lowerBody and equipment barbell
         and !anyF and every R ≥ hi_eff + 2                       → steps = 2
    load = S ? T + dir·steps·S : null       → ADD   (reps target = lo, which is R for a fixed-rep scheme)

elif inRange:
    load = T; targets start at each set's last R; the ⌈k/2⌉ sets with the
    lowest R (earliest first on a tie) get +1, capped at hi_eff; a set typed
    F keeps its R                                                 → REPS

else:
    if prev exposure has |T_prev − T| < 0.01 and min(R_prev) < lo:
        load = the heaviest onGrid T from any earlier exposure with
               T − 2S ≤ load < T   (S null: 0.85·T ≤ load < T);
               else S ? T − dir·S : null                           → REDUCE (reps lo)
    else load = T, reps lo                                         → HOLD('miss')
```

For a `top` scheme, the decision above applies to the one top set. **Back-off
and drop sets keep last time's numbers as their targets.**

`load` must be > 0. For an assisted lift a target ≤ 0 becomes the text
"unassisted" with no number.

**Assisted lifts name no number on REDUCE or REENTER tonight.** Both searches
above look for a *lighter* load, which on an assisted lift is *less* help, the
wrong way. Rather than mirror them, the target reads "a little more assistance
than last time" with no number, and the weight ghost is last time's.

**Off-grid `T`** (§6.2): ADD → "the next setting up"; REPS / HOLD → "same
weight as last time"; REDUCE → "one setting lighter". No number in any of
them.

### 6.7 REENTER, BODYWEIGHT, FIRST, DEFER

```
REENTER(f):  load = the heaviest onGrid top load in any exposure with load ≤ f·T_last;
             else if S: T_last − n·S for the smallest n ≤ 6 with result ≤ f·T_last and > 0;
             else null ("lighter than last time").   reps = lo of the range (default band if none)
             This is the one place a target may sit more than two steps from
             the last top load, and only downward.
BODYWEIGHT:  no range. Layoff first, on the same two clocks as gate 6: gg > 30 →
             each set's reps × 0.8, rounded, min 1; 15–30 → × 0.9; g ≥ 12 →
             HOLD('back') at last reps (reps are counts, not loads, so a
             fraction of them is not an invented plate).
             If any set's reps fell ≥ 2 below the previous exposure's
             same-position set → HOLD('miss') at the previous exposure's reps.
             Else +1 on the ⌈k/2⌉ lowest sets (earliest first on a tie), no cap.
             A weighted bodyweight exercise with Lu > 0 on its sets is NOT bw: it
             runs §6.6 on the added load.
FIRST:       no load; the default band's reps; the line in §9.
DEFER(code): no load, no reps; last exposure quoted through fmtSetLoad.
```

### 6.8 Status and slope (computed, not printed tonight)

- e1RM series: per exposure, max `e1rm(w, r)` over non-`D` sets with
  `1 ≤ r ≤ 12`. Exposures with none are skipped.
- `slope` = Theil–Sen median of pairwise slopes over the last 8 exposures within
  84 days **and after the most recent gap of more than 21 days**, as a % of the
  series median per week. (Without the restart, a layoff's drop reads as a slow
  lifter and slows the climb back.)
- `slowSlope` = ≥ 8 points and slope < 0.25. `fastSlope` = ≥ 8 points and
  slope ≥ 1.0.
- `sigma` = median |exposure-to-exposure % change| over the last 10 (≥ 5), else 3.
- `status` over the last 8 exposures within 84 days, restarting after any gap >
  21 days, needing ≥ 4 points spanning ≥ 21 days (else `holding`):
  `progressing` if a new best (+1% over every earlier point) is in the last 3,
  or slope ≥ 0.25; `declining` if median(last 3) < median(the 3 before) by more
  than max(5, 1.5·sigma) %; `stalled` if neither and no new best in the last 4
  spanning ≥ 21 days; else `holding`.

### 6.9 Output

```js
prescribe(ex, ctx) → null | {
  exId, mode,            // 'add' | 'reps' | 'hold' | 'reduce' | 'reenter' | 'first' | 'bodyweight' | 'defer'
  code,                  // 'confirm' | 'miss' | 'back' | 'shape' | 'heavy' | 'erratic' | 'range' | null
  loadLb,                // the target in stored pounds (number), or null when no number is named
  sets: [ { type, tw, tr } ],   // one per set in the last exposure's allSets: top sets carry the
                                //   target; warm-ups, back-offs and drops carry last time's numbers,
                                //   except that on REDUCE and REENTER no set's tw may exceed the
                                //   new top target (cap each at the lower of the two, both on the grid).
                                //   Wherever the target names no number, top sets' tw is last time's.
                                //   On DEFER and FIRST, sets is [] and the targets view uses the
                                //   row's placeholder sets.
  line,                  // one sentence, §9
  why: [ ... ],          // the evidence, each with its number and count, §9
  stage,                 // 'none' | 'learning' | 'yours', the weakest of range and step
  range: { lo, hi, fixed, source },     // source 'yours' | 'default'
  step:  { value, n, source } | null,   // value in the DISPLAY unit
  status, slope, from: { date, daysAgo } // the exposure it was built from
}
ex  = { exId, name, group, equipment, exposures, groupDaysSince }
      // groupDaysSince: coach.js's group.daysSince for this lift's primary group
      // (builderInput already hands the builder `groupDays`); null if unknown,
      // in which case gg = g
ctx = { now, u, aim, exp, energy, rateWk }
```

- `tw` is stored pounds as a string. Pounds: the display value, trailing `.0`
  dropped (`"187.5"`, `"190"`). Kilos: `String(wIn(P, 'kg'))`. **Every kilo
  `tw` must round-trip through `fmtSetW(tw, 'kg')` to the printed number
  exactly** (100 → `"220.46"` → `100`; 102.5 → `"225.97"` → `102.5`).
- `tr` is a string. **`tw` is never `''` on a set that had a weight last time.**
  Where `loadLb` is null, `tw` is last time's weight (see §1: an empty weight box
  is recorded as a 0-lb set).
- **Which sets win in the builder.** A row's `target.sets` come from the lift's
  last exposure, which may be a different session from the proposal's base.
  The targets view uses `target.sets` when it has any, and the row's
  placeholder sets otherwise. When the two sessions differ, `why` says which
  day the target was built from.

---

## 7. INTEGRATION

### 7.1 `coach.js`

- Facts `coach.aim`, `coach.experience`, `weight.energy`, `lift.targets`, each
  with a `because`, a unit (`null`), and `usesAnswers` where it reads one.
- `lift.targets` = the default proposal's rows' `target`s that are non-null.
  **`d.build({})` is memoised**, so this costs no second proposal.
- Intent `lift_targets`: `kind: 'selector'`, `category: 'targets'`,
  `tier: 'pro'`, `surfaces: ['sheet']`, `minData: !isMuted(targets)`,
  `when: lift.targets has at least one entry`, `response: 'resp_lift_targets'`.
- `resp_lift_targets`: text "Targets for your {proposal name}." and `more` = one
  bubble per row with a target (max 6): "{Exercise} — {line}", reason = its
  `why[0]`. The answer also carries `question`: the first goal question (§4.1)
  whose `when` passes, or null. `ask()` returns it alongside `followups` for
  this route only.
- Route `ask_targets: ['lift_targets']`. `ASK_LABELS.ask_targets = 'What should
  I lift today?'`. Insert it into `TRAIN_TOPICS` **third**, after *What should I
  train today?* and *Make me a workout* (his decided order stays first and
  second). `FOLLOWUPS.ask_targets = ['ask_build_now']`. Add `'ask_targets'` to
  `FOLLOWUPS.ask_shape` after `'ask_build_now'`.
- `builderInput()` gains `goal: { aim, exp }` from the two facts,
  `energy: { context: weight.energy, rateWk }`, and
  `targetsOn: !isMuted(d.input.settings, 'targets')`.

### 7.2 `coach-build.js`

- Each proposal row gains `target`: `prescribe()` over that exercise's
  exposures from `i.log` (the whole log, not only the base session), with
  `groupDaysSince = i.groupDays[group]`, or `null` when `targetsOn` is false.
- The proposal gains a view **`targets`**, the same shape as `placeholders`:
  empty `w`/`r`, `done: false`, and `tw`/`tr` from each row's `target.sets`
  (§6.9) when it has any; otherwise that row's placeholder sets, unchanged.
  `null` if no row has a target with sets. **No set in it has `tw === ''` where
  the matching logged set had a weight** (§1).
- `placeholders`, `lastNumbers` and `record` must be **byte-identical** to
  today's for every existing `coach-build.mjs` fixture. Assert it.
- The `note` (nudge) is unchanged.

### 7.3 `coach-ui.js`

- In `proposalBlock()`, under each row's `note`: the target line (class
  `coach-build-target`), `target.line`. Tapping the row's target line toggles
  `target.why` under it. No new sheet.
- A fifth button, **Start with Coach’s targets**, shown only when `p.targets`
  exists, and when it does it is the **primary** (yellow, `btn-primary`) button,
  **first** in the row. *Start it* moves to second and becomes `btn-ghost`.
  With no `p.targets` (muted, Basic, or nothing to target) the row is exactly
  today's, *Start it* primary. It calls `on.start(p.targets)`. Update the
  "exactly four buttons" comment and say why: Micah's 23 Sep answer, "this coach
  should be at the level where I can trust it … following it, I should see my
  lifts going up." The targets are the main way to start a workout, which is
  exactly why wrong must stay 0.
- `coachAnswerRows()`: questions with `always: true` render under a **Your goal**
  label whether answered or not; the rest keep today's rule.
- Under the `ask_targets` answer, when it carries a `question`, draw it the way
  the sheet draws its opening question today (the same bubble, chips,
  `markAsked`, `answerQuestion`), and reply with `q.ack`. Factor the shared
  drawing into one function rather than copying it. Check that six options wrap
  cleanly on a 375-px-wide screen (the DOM shim won't tell you; reason it from
  the CSS and say so in the report).

### 7.4 `rack.css`

One rule for `.coach-build-target`, beside `.coach-build-w`: the same size, the
body colour rather than `--dim`, so it reads as the actionable line. No yellow;
yellow is for buttons.

---

## 8. THE GOAL QUESTIONS

With no aim, targets still work: they use `DIALS.none`. The aim only turns the
dials. So the questions are a refinement, never a gate, and **targets never wait
for them**. They're asked under the *What should I lift today?* answer (§4.1),
one at a time, with the shipped cooldown, and they're always there to change in
Settings → Coach → Your goal.

---

## 9. THE WORDS

Every string below is a template filled from the prescription. Numbers through
`units.js`. The ban below applies to **Coach's own sentences** (`line`, `why`,
answers, acks), not to the user's bubble labels, which speak in his voice ("What
should I lift today?" sits beside the shipped "What should I train today?").
**Banned in Coach's sentences in this ship:** the shipped `BANNED`
list in `coach-voice.mjs` (*hasn't, haven't, didn't, still, only, failed, no
progress, stopped moving*) plus *try, should, push, beat, go for, aim for, easy,
must*, and anything the max-attempt pattern in §10.1 matches. Use "Target:",
"for", "at". Apostrophes are the typographic ’ the Coach files already use
("Coach’s", "doesn’t"), including in the button label.

| Mode / code | `line` | `why` (first entry, then the step line) |
|---|---|---|
| add, number | `Target: 3 × 8 at 190 lb.` | `Every set reached 12 at 185 lb on {day}, the top of your 8–12.` |
| add, two steps | `Target: 3 × 5 at 335 lb.` | `Every set went two or more past 5 at 315 lb, so two jumps.` |
| add, no number | `Target: the next setting up, for 8 reps.` | `Every set reached 12 at 50 lb. Coach doesn’t know this machine’s steps yet, so it won’t guess a number.` |
| add, unassisted | `Target: unassisted, for 8 reps.` | `Every set reached 12 with 5 lb of assistance.` |
| reps, equal | `Target: 3 × 12 at 185 lb.` | `Inside your 8–12 at 185 lb last time (12, 11, 10).` |
| reps, unequal | `Target: 185 lb for 12, 12, 11.` | same, plus `One more rep on the two lighter sets.` |
| hold confirm (energy) | `Target: 3 × 12 at 185 lb again.` | `Every set reached 12. Your weight is coming down about 1.8 lb a week, so Coach wants to see it twice before adding weight.` |
| hold confirm (aim) | same | `…You’re cutting, so…` / `…You set Stay consistent, so…` + `Coach wants to see it twice before adding weight.` |
| hold confirm (triples) | same | `…With sets this heavy, Coach wants to see it twice.` |
| hold confirm (slow) | same | `…Your estimated max here has moved about {x} lb over your last {n} sessions, so Coach wants to see it twice.` |
| hold miss | `Target: 3 × 8 at 185 lb.` | `One set came in under 8 last time (10, 8, 6). Same weight, one more go.` |
| hold back | `Target: 3 × 8 at 185 lb, same as last time.` | `First time on this lift in 20 days, so no jump on the first one back.` (and, when the group was trained in between: `Your chest work has kept going, so no step down either.`) |
| off-grid | `Target: same weight as last time, for 8 reps.` | `Last time’s weight was entered in pounds, so Coach won’t turn it into a kilo number nobody loads.` |
| reduce | `Target: 3 × 8 at 175 lb.` | `Two sessions in a row came in under 8 at 185 lb. 175 lb is a weight you’ve lifted here before; climb back from there.` |
| reduce, no number | `Target: one setting lighter, for 8 reps.` | same shape |
| reenter | `Target: 3 × 8 at 185 lb.` | `30 days since you last trained chest. 185 lb is the heaviest you’ve logged at or below 90% of your last top set (215 lb).` |
| reenter, stepped | `Target: 3 × 8 at 80 lb.` | `60 days since you last trained chest. 80 lb is four of your 5-lb jumps below your last top set (100 lb).` |
| reenter, no number | `Target: lighter than last time (215 lb), for 8 reps.` | `…Coach doesn’t have a lighter weight of yours to point to.` |
| assisted reduce / reenter | `Target: a little more assistance than last time, for 8 reps.` | the reduce or reenter reason, without a number |
| bodyweight | `Target: 8, 8, 7 reps.` | `One more rep on your two lighter sets (8, 7, 6 last time).` |
| bodyweight miss | `Target: 10, 10, 10 reps.` | `Last time’s sets came in lower (10, 8, 7), so the same as the time before.` |
| bodyweight back | `Target: 8, 8, 7 reps.` | `30 days since you last trained back, so a few fewer than last time (9, 9, 8).` |
| first | `No target yet: first time on this lift.` | `Pick a weight you could do about 12 times and stop at 10. Coach sets targets from there.` (the band's hi + 2 and hi) |
| defer shape | `No target this time.` | `Your last two sessions of this lift were set up differently. Last time: {quote}.` |
| defer heavy | `No target for heavy singles, doubles or triples on their own.` | `They’re too close to an all-out set for Coach to call without knowing how hard they were. Last time: {quote}.` |
| defer erratic | `No target this time.` | `Last session’s sets varied a lot ({reps}). Last time: {quote}.` |
| defer range | `No target yet.` | `Coach needs a few more sessions of this lift to know your rep range.` |

**Step lines** (second `why` entry on any target with a number):
`Your usual jump here is 5 lb (from 4 increases in your log).` ·
`5 lb is a common starting jump for this kind of lift. Coach will learn yours.`
(the second is the labelled training default the spec calls T3). Print the step
through `units.js`: on kilos, `2.5 kg`. Every apostrophe is the typographic ’.

**Stage** `learning` adds, once, at the end of `why`: `Coach is learning this
lift ({n} sessions so far).` (Not "still learning": "still" is on the shipped
ban list.)

---

## 10. VERIFIERS

Under `tools-check/`, in the existing style: drive the real modules, no copy of
any rule inside them, exit 0 on pass. Keep the local conventions you find
(`refused-write.mjs`'s `fail_` counter, `month-erasure.mjs`'s section that must
FAIL). Don't "fix" them into a common shape.

### 10.1 NEW `coach-prog.mjs` — the battery

Fixtures are generated by a small **seeded** generator (no unseeded
`Math.random`) in the **real record shape**: string `w`/`r`, `type`, `done`,
`_date`, duplicated exercises merged, **pounds stored even for kilo accounts**.
Scored **ok / miss / wrong**, printed as three totals. **Exit non-zero on any
wrong.** A miss (Coach deferred where the case expects a target) is reported,
not fatal.

Unless a case is about the slope dial, fixtures use **≤ 7 exposures**, so the
≥ 8-point slope dial can't interfere. Dates are relative to a fixed `now`; "d"
below is days ago. `3×12 @185` means three N sets of 12 at 185. Unless a row
says otherwise, the lift is the only one of its group in the fixture, so
`groupDaysSince` equals the lift's own days since. Every expected
value in this table was worked through §6 by hand **and** checked against a
throwaway model of §6 before this brief was written. If your implementation
disagrees with a row, **re-read §6 before you change either**, and list any
row you correct in the report.

| # | Setup (lb account, no aim, no weight data unless stated) | Expected |
|---|---|---|
| A1 | Bench: 23d 3×12@175 · 19d 3×8@180 · 15d 10,10,9@180 · 11d 3×12@180 · 7d 10,9,8@185 · 3d 3×12@185 | `add` **190 × 8**. Range 8–12 learned (2 pairs), step 5 (2 jumps), stage `learning` |
| A2 | A1, last 12,11,10 | `reps` @185 → **12, 12, 11** |
| A3 | A1, last set typed F | `add` 190 × 8, one step |
| A4 | 3×12@170 · 3×8@175 · 3×12@175 · 3×8@180 · 3×12@180 · last 10,8,6@185 | `hold('miss')` 185 × 8 |
| A5 | 3×12@165 · 3×8@170 · 3×12@170 · 3×8@175 · 3×12@175 · 10,8,7@185 · last 9,7,6@185 | `reduce` **175 × 8** (step 5; candidates in [175, 185)) |
| A6 | 3×12@160 · 3×8@165 · 3×12@165 · 3×8@170 · 3×12@170 · 10,8,7@185 · last 9,7,6@185 | `reduce` **180 × 8** (nothing logged in [175, 185), so T − S) |
| A7 | `seated-cable-row` 3×12@100 · 3×8@115 · 3×12@115 · 3×8@130 · 3×12@130 · 10,8,7@130 · last 9,7,6@130 | `reduce` **115** (step 15 learned) |
| A7b | Same shape at 100 → 110 → 125 (jumps 10 and 15, so no step) | `reduce` **110** (the heaviest logged load in [0.85·125, 125)) |
| A8 | `back-squat-low-bar` 3×5 at 270, 280, 295, 315 (jumps 10, 15, 20) | `add` **325 × 5** (fixed 5; no jump twice, so default 10) |
| A9 | 3×5 at 300, 305, 310, 315 | `add` **320 × 5** (step 5 learned) |
| A10 | Kilo account, bench 3×5 at 92.5, 95, 97.5, 100 kg | `add` **102.5 kg × 5**; `loadLb` 225.97; `tw` "225.97" prints "102.5" |
| A10b | Kilo account, the same with only 95, 97.5, 100 | `defer('range')`: one pair isn't a learned range, and 5 is below the default 6–10 |
| A11 | Kilo account, `dumbbell-bench-press` 30 kg: 3×8 · 3×10 · 3×12 | `add`, `loadLb` null, "the next setting up", reps 6 |
| A12 | Never logged | `first` |
| A13 | Bench 3×8 at 185 (70d), 195 (62d), 205 (54d), 215 (46d), 215 (30d); chest last trained 30d ago | `reenter` **185** (group clock 30 → 0.9; heaviest logged ≤ 193.5) |
| A14 | Bench 3×8 at 200, 205, 210, 215, 215 (last 60d); chest last 60d | `reenter`, `loadLb` **null** (0.8: nothing ≤ 172; 215 − n·5 needs n = 9 > 6) |
| A14b | `dumbbell-bench-press` 3×8 at 90, 95, 100, 100 (last 60d) | `reenter` **80** (100 − 4·5) |
| A15 | Bench 3×12@180 · 3×8@185 · last 10,9,9@185 18d ago; chest last 18d | `reenter` **165** (group clock 18 → 0.9; nothing logged ≤ 166.5; default step 5 → 185 − 4·5) |
| A15b | The same bench log, last 20d ago, but chest trained 3d ago (dumbbell press) | `hold('back')` **185** for 10, 9, 9 (lift clock ≥ 12: no jump; group trained: no step down) |
| A15c | Last bench 13d ago; chest last 13d | `hold('back')` 185 for 10, 9, 9 |
| A15d | Last bench 11d ago; chest last 11d | normal: `reps` @185 → 10, 10, 10 |
| A16 | 205×5 then 2×8@175 · last 3×8@185 | `defer('shape')` |
| A17 | Squat: 405×1 + 315×5, twice | `defer('heavy')` |
| A18 | Squat: 385×3 + 315×5, twice | `defer('heavy')` |
| A19 | Squat 3×3 at 285, 295, 305, 315 | `hold('confirm')` (triples need two) |
| A20 | A19 plus another 3×3@315 | `add` **325** × 3, one step |
| A21 | 3×10@185 · last 12, 5, 11 @185 | `defer('erratic')` |
| A22 | `pull-up` 7,7,6 · last 8,7,6 | `bodyweight` → **8, 8, 7** |
| A23 | `pull-up` 10,10,10 · last 10,10,9 | `bodyweight` → **11, 10, 10** |
| A23b | `pull-up` 10,10,10 · last 10,8,7 | `hold('miss')` → **10, 10, 10** |
| A24 | `assisted-pull-up` 3×12@60 · 3×8@55 · 3×12@55 · 3×8@50 · 10,10,9@50 · 3×12@50 | `add` **45 × 8** |
| A25 | A1's log, aim `cut` | `hold('confirm')` |
| A26 | A1's log plus one more 3×12@185, aim `cut` | `add` 190 × 8 |
| A27 | A1's log, `energy: 'deep'` (e.g. 180 lb, −2.2 lb/wk over 21 days) | `hold('confirm')` |
| A28 | `dumbbell-lateral-raise` at 15: 12,12,11 · 13,13,12 · 15,15,14 · last 3×15 | `reps` → **16, 16, 15** (default 10–15, step 5 is 33%, so the top is 17) |
| A29 | Bench: 95×5 then 3×8@185 · 95×5 then 10,9,9@185 | `reps` @185 → 10, 10, 10 (the 95 set never enters it) |
| A30 | Bench twice in one session (2×10 and 1×9 @185, a row between them) | one exposure of 3 sets |
| A31 | Bench 3×8@185 8d · 3×9 yesterday morning · 3×10 yesterday evening | built from the evening exposure: `add` 190 × 6 |
| A32 | Custom `{ group: 'legs', equipment: 'barbell' }`, 3×5@200 four times | `add` **210 × 5** (fixed by repetition; default lower-body step 10) |
| A33 | Kilo account. Pound-typed 3×8 at "195" lb (60d), then 3×12@85 · 3×8@87.5 · 3×12@87.5 · 10,8,7@90 · last 9,7,6@90 kg | `reduce` **87.5 kg** (the pound-typed 88.45 kg is off the grid, so it can't be chosen) |
| A34 | Bench @185, 11 exposures a week apart, reps between 8 and 10 (e1RM flat), second-to-last 10,9,9, last 3×10 | `hold('confirm')` (slow slope) |
| A34b | A34's last 6 exposures only | `add` 190 × 6 (no slope dial under 8 points) |
| A35 | Squat, aim `strength`, exp `years`: 3×5 at 225 → 305 in 10-lb jumps every 4 days, last 3×7@315 | `add` **335 × 5** (two steps) |
| A36 | Bench 3×12@205 · 3×8@215 · 3×12@215 · 3×8@225 · 3×12@225 (all 64–80d) · 56-day gap · 3×10@185 (8d) · 3×12@185 (4d); chest last 4d | `add` **195 × 8**: one jump of the learned 10 at a time on the way back |
| A37 | A35's log, exp `new` | `add` 325 × 5 (one step) |
| A38 | 3×10@185 · 3×10@185 · last 3×5@225 | `defer('shape')` (+22%: a new programme) |
| A39 | 3×5@225 twice, no aim | `defer('range')` (never a miss against a default band) |
| A39b | Same, aim `strength` | `reps` @225 → 6, 6, 5 (default 3–6) |
| A40 | Squat: 405×1 + 315×5 at 40d, and again 18d ago | `defer('heavy')`, not `hold('back')` at 405 × 1 (the heavy gates run before the layoff gate) |
| A41 | Kilo account, bench 3×5 at 90, 92.5, 95 kg, then last 3×5 typed as "225" lb (102.06 kg) | `add`, **no number** ("the next setting up"); `tw` is "225" |
| A42 | `assisted-pull-up`: A24's climb to 50, then 7,6,6 and 6,6,5 at 50 | `reduce`, **no number** ("a little more assistance than last time") |
| A44 | Bench 3×5@225 twice, aim `powerlifting` | `add` **230 × 3** (default 3–5: 5 is the top) — compare A39b |
| A45 | A35's log, aim `powerlifting` | `add` **335 × 5**, two steps (same dials as Get stronger here) |

**Properties**, over ≥ 2,000 generated histories per unit:

- deterministic (same input, same output, twice);
- turning any top set of the **last** exposure N→F never makes the target
  heavier (for an assisted lift, never less assisted) and never adds a step;
- lowering any rep count in the **last** exposure never makes the target
  heavier (lowering an earlier one can legitimately move the learned range);
- every numeric target is a logged top load on that exercise, or within 2 steps
  of the last top load, or (REENTER only) up to 6 steps below it; and it is
  `onGrid` in the display unit;
- no numeric target is derived from an off-grid last top load;
- on an assisted lift, no REDUCE or REENTER target names a number;
- no set in the `targets` view has `tw === ''` where the logged set had a weight;
- every kilo `tw` round-trips through `fmtSetW` to the printed number;
- shuffling the `sessions` array changes nothing;
- no `loadLb` ≤ 0; no target on a cardio exercise;
- when the mode is `defer` or `first`, `target.sets` is empty (the targets
  view falls back to the placeholder sets).

(There's deliberately **no** "same mode in pounds and kilos" property: a
default step exists for a pound dumbbell and not for a kilo one, and that can
move the micro-load rule. The model checked 4,000 generated histories, half in
kilos, against the first seven properties with zero failures. Yours should
match.)

**Must-never scan** over every `line` and `why` string produced, both units:
the shipped `BANNED` list, the words in §9's ban, and
`/\b(1\s*rm|one[- ]rep max) (test|attempt)|\bmax(ing)? out\b|\bgo for a (single|max)\b|\btest your max\b/i`,
`/\b(because (you|your)|caused|due to (your|the)|that'?s why)\b/i`, and on a
kilo account any `\d ?lb\b`.

### 10.2 NEW `coach-goal.mjs`

`energyContext()` at every boundary (−0.75, −0.25, +0.25 exactly; `rateDays`
13 vs 14; null inputs) · `dialsFor()` for every aim × experience × energy ×
slope combination, checked against the rules in §5 · `DIALS` has a row for
every `AIMS` entry plus `none` · every constant is exported.

### 10.3 UPDATE, deliberately

**First, the staging edit, which every Coach verifier needs.** Twelve verifiers
copy the Coach modules into a temp folder and repoint only the imports they
already know (`coach-registry`, `coach-rank`, `coach-silence`, `coach-units`,
`coach-patterns`, `coach-live`, `coach-boot`, `coach-rotation`, `coach-pure`,
`coach-voice`, `coach-build`, `coach-surface`). The moment `coach.js` or
`coach-build.js` imports a new module, all twelve die with
`ERR_MODULE_NOT_FOUND`. In each, stage `coach-goal.js` and `coach-prog.js` the
same way and repoint their imports. **That staging edit is allowed everywhere.**
Below, "unedited" means *no check, fixture or expected value changed*.

- `coach-pure.mjs`: the new modules pass every purity check `coach.js` passes;
  the ALLOWED import lists grow by exactly the edges in §3 and no others.
- `coach-voice.mjs` section G: the button list includes *Start with Coach's
  targets*; a **new section** reads every `target.line` and `target.why` the
  A-battery produces and applies §9's ban. The existing nudge check (no push
  word in a "last time" note) stays exactly as it is.
- `coach-build.mjs`: its `strangers()` helper walks every `w`/`r`/`tw`/`tr` in
  the whole proposal, so the new targets trip the "no invented number" and
  "nothing stepped down" checks by design. Scope those checks to
  `placeholders`, `lastNumbers` and `record` (their subject), and add new ones:
  those three byte-identical to before on every existing fixture; `targets` has
  empty `w`/`r` and `done: false` everywhere, and no `tw === ''` where the
  logged set had a weight.
- `units.mjs` classifies every `fmtSetLoad`/`fmtSetW` call site by file
  (~line 655). Add `coach-prog.js` to the DISPLAY table with its real count (its
  quotes are sentences, never boxes) and correct the total in the check's name.
- `coach-surface.mjs`, the layoff proposal (~line 739): after a layoff it
  expects three buttons. With a re-entry target there are four: *Start with
  Coach’s targets* first, when the proposal has `targets`.
- `coach-surface.mjs`: its "then EXACTLY four buttons, in order" check (and
  the repeat of it after an adjustment) becomes: the four shipped buttons in
  their shipped order, with *Start with Coach’s targets* **first and primary**
  and *Start it* second and ghost **when the proposal has `targets`**, and
  exactly the shipped four (Start it primary) when the `targets` category is
  muted. Both cases driven, not asserted.
- `coach-registry.mjs`, `coach-rank.mjs`, `coach-live.mjs`, `coach-silence.mjs`,
  `coach-units.mjs`, `coach-patterns.mjs` (which also checks that `patterns` is
  the last category, which is why `targets` goes after `build` and not at the
  end), `coach-boot.mjs`, `coach-rotation.mjs`: **must pass unedited** (the
  staging edit aside). The goal questions never reach `pendingQuestion()` (§4.1),
  which is what keeps the rank, silence and surface question checks true. If
  one can't pass, stop and write down why before touching it.

---

## 11. THINGS YOU WILL FIND. DO NOT FIX THEM.

Log each in BACKLOG.md and name them in the handoff.

- `lift.stalled` (shipped) and the new status disagree on what "stalled" means.
  Stage two reconciles them. Don't change the shipped fact.
- `coach-live.js` never names a weight. Stage five changes that, under a
  replaced fence.
- Micah's 23 Sep request, grey last-time numbers on hand-added exercises. Stage
  five, via `coach-prog.js`.
- A second session on the same day is invisible to live facts (shipped BACKLOG).
- `record.groups` counts warm-ups (shipped BACKLOG).
- Basic accounts see no target at all; the "one real target" idea is stage three.

---

## 12. DOCS

- **AGENTS.md** `settings/coach`: the two new question ids, that the goal *is*
  their answers, the `always` flag, and that `asked.q_goal_aim` is when the goal
  was set. The mute id `targets`.
- **CLAUDE.md** Layout: add `coach-goal.js` and `coach-prog.js` to the Coach row
  (pure, copied verbatim).
- **BACKLOG.md**: §11's items.
- **COACH-REPORT.md**: a new section for v48. What you built, every row of the
  battery you corrected and why, every assumption, anything in this brief or the
  spec that turned out wrong about the code, and what you didn't finish, at the
  top. **This is the most valuable thing you produce after the code.**
- **NEXT-NATIVE-V48.md**: file by file. The verbatim copies with their sha256
  (`coach-goal.js` and `coach-prog.js` NEW → `src/pure/`; `coach.js` and
  `coach-build.js` CHANGED; pins for `units.js`, `exercises.js`,
  `coach-tags.js`, `analytics.js` if unchanged). What native must rewrite (the
  proposal UI's target line and fifth button, the Settings goal rows, the tick
  path already adopts `tw`/`tr`). And the PROPOSED-rules check: if
  `web-patches/database.rules.PROPOSED.json` enumerates `settings/coach/answers`
  ids, `q_goal_aim` and `q_experience` must join it, and `targets` must join any
  enumerated mute list.
- **COACH-TRAINER-SPEC.md**: commit it as it is, in the docs commit.
- **COACH-REPORT.md** also carries §15's decisions table forward, so the next
  stage's brief starts from it.

---

## 13. DEFINITION OF DONE

1. Both syntax loops clean.
2. Every pre-existing verifier exits 0, the listed ones **unedited**; the new
   ones exit 0; the A-battery prints **wrong: 0**.
3. `sw.js` and `usage.js` both read `rack-v48`.
4. `database.rules.json` unchanged.
5. `coach-goal.js` and `coach-prog.js` pass `coach-pure.mjs`.
6. Small commits, each of which builds. Suggested order: `coach-goal.js` +
   verifier → `coach-prog.js` + battery → `coach.js` wiring → `coach-build.js`
   → UI + CSS → version bump → docs. **Do not push.**
7. `NEXT-NATIVE-V48.md` and the COACH-REPORT section written.
8. The five-line handoff. **To check it worked** should walk: Train → COACH ME →
   *What should I lift today?*; *Make me a workout* → a target line under each
   exercise → *Start with Coach’s targets* → grey targets in the boxes → tick
   one and see it adopt; Settings → Coach → *Your goal* and the *Weight and rep
   targets* switch; the same on a kilo account.

## 14. IF YOU GET STUCK

Don't guess and don't silently narrow scope. Build what you can verify, and put
anything unfinished at the top of COACH-REPORT.md with the reason. A run that
finishes 70% and says so precisely beats one that claims 100%.

Priority if you run short: **`coach-prog.js` + the battery** first,
**`coach-goal.js` + its verifier** second, **the builder rows and `targets`
view** third, **the fifth button** fourth, **the Train bubble** fifth, **the
Settings goal rows and the two questions** last (targets work without an aim).

---

## 15. DECISIONS LOG — Micah's answers, 23 Sep 2026

Every open question in `COACH-TRAINER-SPEC.md` §14 was put to Micah one at a
time. His answers are below, **in his words where he gave his own**. Rows marked
**TONIGHT** are already written into the sections above; rows marked for a later
stage are recorded here so the next brief starts from them. **Do not build the
later-stage rows tonight.**

| # | Question | Answer | Where it lands |
|---|---|---|---|
| 1 | Labelled training-science starting points before Coach knows you? | **Yes, training only.** Food and body stay own-data only | TONIGHT: default bands and default steps (§6.4, §6.5), always labelled |
| 2 | The goal set | **The five, plus Powerlifting** as its own goal | TONIGHT: six aims in `q_goal_aim` and `DIALS` (§4.1, §5). Powerlifting differs by its bands tonight; later stages give it the big three |
| 3 | Card becomes encouragement only? | **Yes.** Findings move to the sheet's opening | Stage 3 (v50) |
| 4 | Coming back after time off | *"I like the more cautious holding but not from any workout, it should be an individual timer for each muscle group … I like 12 days for a timer."* Then: **the muscle group's clock sets how far back to start; a lift not done in 12+ days on its own still gets no jump its first time back.** Hold from 12 days, ~90% at 15–30 days, ~80% past 30, **one jump at a time** back up | TONIGHT: gate 6 (§6.3), BODYWEIGHT (§6.7), no two-step catch-up (§6.6); rows A13–A15d, A36 |
| 5 | When to want two sessions at the top before adding weight | **As proposed:** twice when cutting or Stay consistent, in a hard cut, on doubles and triples, or when progress has been slow; once otherwise | TONIGHT: `DIALS`, `dialsFor()`, §6.6 |
| 6 | No targets for singles or lone heavy top sets (until RIR) | **Yes** | TONIGHT: gates 4–5 (§6.3) |
| 7 | General nutrition science in fuel answers? | **No. Own data only** | Stage 4 (v51) |
| 8 | Learning whether rest advice was taken | *"Pick whats best"* → **replay, save nothing.** Plus his addition: *"I want the recommendation for a rest day, to also take into account how hard you've been training … a rest from a certain muscle group, like say I did a crazy leg day … 1 day later I go to hit legs again or ask for a workout and … I choose legs, it would see I probably should take more rest and hit something else."* → a per-group recovery window that grows after a hard day for that group, checked when he asks what to train **and** when he picks a group in *Make me a workout* (a caution with *Build it anyway* / *Train something recovered*, never a refusal) | Stage 4 (v51). Spec §9.2 |
| 9 | Save answers about how you feel? | *"A mix of both. It saves your progress but if it was a bad day it marks by it like you said you slept bad or didn't feel well."* Confirmed: a session that came in below usual can be **marked** with Slept badly / Stressed / Sore / Didn't feel well; a marked session never counts as a miss and never drags down his normal; later, his own patterns from the marks. Marks live in `settings/coach`, keyed by session, cleared after 6 months. "Have you eaten?" stays use-once | Stage 4 (v51). Spec §10.3, §12. Tonight's `prescribe()` needs nothing for it yet |
| 10 | Cut-speed thresholds | **As proposed:** hard cut ≤ −0.75 %/wk, cut ≤ −0.25 %/wk, surplus ≥ +0.25 %/wk | TONIGHT: `ENERGY_*` (§5) |
| 11 | Say "carb-loaded"? | **No.** The bubble is "Am I fueled?" | Stage 4 (v51) |
| 12 | Stage order | **As proposed:** targets → plateau/cut → card & goals → fuel & rest → in-gym & volume | The plan |
| 13 | Coach reads the water log? | **Not yet, decide later** | Revisit after stage 4 |
| 14 | Which Start button leads the builder | *"I like the targets as the main button, because this coach should be at the level where I can trust it. Once this is built, I should be able to only ever use my app for my workout and in following it, I should see my data of my lifts going up. I have to be able to trust it."* | TONIGHT: *Start with Coach’s targets* is first and primary whenever there are targets (§7.3, §10.3). **This quote is the bar for the whole ship** |
| 15 | Targets Pro only? | **Pro, with one teaser later** (Basic sees one real target plus the lock in stage 3) | TONIGHT: `tier: 'pro'`. Teaser: stage 3 |
| 16 | When rest comes up | *"I like both, specifically when asking, but also maybe if I've been lifting back to back to back, possibly a line could show up on the coach card like 'Great lift today! Think about a day to recover and build that muscle back up' or something like that."* → rest is answered when asked **and** a gentle, positive card line appears after three or more training days in a row (house style: no exclamation mark, no body claim, e.g. "Three days straight. A rest day is well earned."), switchable with the rest-day setting | Stage 4 (v51); card line in the stage-3 pool, gated by stage 4's streak rule |
