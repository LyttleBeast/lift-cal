# COACH TRAINER — stages two and three (web only) → rack-v49

Build brief for a single overnight Claude Code run in `~/dev/ship-v49`, a fenced
clone of lift-cal at `ca5c677` (**rack-v48**, live, walked on Micah's phone on
23 Sep: all good). Written 24 Sep 2026 from a read of the shipped v48 code, its
report (`COACH-REPORT.md` §40–§48) and `COACH-TRAINER-SPEC.md`, which is already
in the repo.

**Where this brief and the spec differ, this brief wins.** Read the spec's §0,
§5, §8 and §9 before you start; this brief makes their rules exact.

This run does **two stages in one ship**, in strict order:

- **Phase A — stage two, "plateau or cut?"**: a new pure `coach-overlap.js` that
  tells a real plateau from an expected dip, the stall ladder, the lighter-week
  call, rep-record timing, and a "How are my lifts moving?" answer. The
  differentiator. **Build and verify all of Phase A before starting Phase B.**
- **Phase B — stage three, "the card and the goal"**: the Coach card becomes
  encouragement only (findings move to the sheet's opening), a sheet that
  adapts to before and after a workout, "How did today compare?", "What's next
  time?", goal pace, a lift target and focus group in Settings, the one-time
  "did your goal change?" question, a goal step in onboarding, and the Basic
  teaser.

**Not in scope tonight:** the fueling brain, readiness, rest-day answers and
bad-day marks (stage four); mid-session targets and weekly volume bands (stage
five); the native port (a separate run is porting v48 in `~/dev/rack-mobile`
tonight — **never open that tree**).

**Before the run starts (Micah):** `~/dev/ship-v49` must be a **full** clone
(several verifiers read old commits), fenced like ship-v48 (the pre-push hook
and `.claude/settings.json` deny list), with this file in its root.

---

## 0. THE STANDARD

Micah, 23 Sep 2026, on making *Start with Coach’s targets* the main button:

> "This coach should be at the level where I can trust it. Once this is built, I
> should be able to only ever use my app for my workout and in following it, I
> should see my data of my lifts going up. I have to be able to trust it."

Everything tonight is judged by that. Two consequences:

1. **A wrong reading is worse than no reading.** The plateau-vs-cut call is the
   most emotionally loaded thing Coach says. When it can't separate the causes,
   it says so and stops. Silence is always a correct answer.
2. **The card only ever encourages, and every encouragement is true.** An earned
   line is a fact from his log. It never flatters, never exaggerates, and never
   celebrates anything unsafe (a rate past the band, a low day).

---

## 1. NON-NEGOTIABLES

The v48 brief's §1 stands in full: vanilla ES modules, no dependencies;
**`sw.js` and `usage.js` both become `rack-v49`**; syntax check with
`node --check --input-type=module < "$f"`; every verifier exits 0 (under
`TZ=America/New_York`, `UTC` and `Pacific/Auckland`); small diffs; comments
explain why; never commit a key; never touch the Worker, Firebase or anything
that deploys; **do not push**; keep README, AGENTS, BACKLOG and CLAUDE.md's
Layout table true; finish with the five-line handoff.

**The house voice rules, unchanged:** the shipped `BANNED` list in
`coach-voice.mjs` (*hasn't, haven't, didn't, still, only, failed, no progress,
stopped moving*), no causal words about his own data (*because you, caused, due
to, that's why*), no max attempt, no eating instruction, no body norm, no "AI",
every weight through `units.js`, typographic apostrophes, no exclamation marks.

**The purity rules, unchanged:** every new decision lives in a pure module
with the clock as an argument, copied verbatim to native later. `coach-data.js`
remains the only impure gatherer.

**`coach-prog.mjs` is the contract.** Its 57-row battery must stay **ok 57,
miss 0, wrong 0** after every change you make. Read `COACH-REPORT.md` §48 before
touching `coach-prog.js`.

**Decided, not open:** the §40a trade (sets past twelve reps count as twelve in
the estimated-max series) is **accepted by Micah**. Record it in the report as
decided. And **Your goal stays Pro-only** in Settings (the onboarding step
below asks everyone, because tier can change and setup is where goals belong).

---

## 2. ARCHITECTURE

```
coach-prog.js     CHANGED, additive only: baselines() also returns the status
                  window's points, the date of the last new best, and per-lift
                  frequency (§3.1). Nothing it already returns may change.
coach-overlap.js  NEW, pure: readLift() (the plateau-vs-cut call and the ladder
                  rung), lighterWeek(), recordDay(), and the sentences for each
coach-goal.js     CHANGED: bwAt() and energyBand() (§3.2, §3.3), normGoalLift(),
                  goal pace (paceFor), the contradiction checks (goalChecks), aim
                  directions and volume floors. Still imports nothing.
coach.js          new intents, routes, facts, questions, categories (§5, §7);
                  the HYPE registry and the card view (§6); state-aware topics
coach-build.js    unchanged unless a fact it reads moves (it should not)
coach-data.js     passes `goalLift` through (it is in settings) and trendRate's
                  `seWk` as `weight.rateSeWk`; gains `setAim()` (§7.4); nothing
                  new read from the database
coach-ui.js       the card's earned line, the sheet's opening, "More", the new
                  answers, Settings → Lift target and Focus, the Basic teaser
onboarding.js     one new step (§7.6)
```

Imports: `coach.js` → `coach-overlap.js` → `coach-prog.js` → `coach-goal.js`.
`coach-overlap.js` may also import `coach-goal.js`, `units.js`, `exercises.js`,
`coach-tags.js` and the pure half of `analytics.js`. Nothing imports back.

**The staging edit** (v48 report §43.4): every verifier that stages the Coach
modules must stage `coach-overlap.js` too. That edit is allowed everywhere and
is not a change to any check.

---

## PHASE A — STAGE TWO

## 3. `coach-overlap.js`

### 3.1 What `coach-prog.js` must additionally expose

`baselines(ex, ctx)` gains, without changing any existing field:

```
series:     EVERY point in the 84-day window after the last 3-week gap, oldest
            first: [{ startedAt, y }] (y = the capped e1RM progressOf already
            computes). Not only the eight the slope reads.
lastBestAt: startedAt of the most recent point that set a new best (+1% over
            every earlier point in the whole series), or null
moveLb:     progressOf's fitted move across its window (it computes it already)
freq:       { recent: exposures in the last 28 days / 4,
              normal: exposures in the last 84 days / 12 }
topReps:    the last three exposures' top-set reps and top loads (display unit),
            oldest first, for the grinding test
```

Re-run `coach-prog.mjs`: still 57 / 0 / 0. Add checks that the new fields are
consistent with `status`, and that `prescribe()` output is byte-identical to
v48's on every battery row.

**Why `readLift` cannot use `status` alone (checked against the v48 code on
23 Sep):** `status` is `stalled` only when the last four sessions span 21 days,
so a lift trained twice a week or more is **never** `stalled` in v48: flat for
eight weeks at 2×/week reads `holding`. Stage two built on `status` would be
silent for most lifters. Do not change `status` (the battery pins it); §3.3
works out its own flat test from `series` and `lastBestAt`.

### 3.2 Bodyweight at a moment

```
bwAt(weighIns, ms) = median lb of weigh-ins with t in (ms − 7 days, ms],
                     needing at least 2; else null
```
From `input.weighIns` (already gathered). **It lives in `coach-goal.js`**, beside
`energyBand`, because `goalChecks` (§7.4) needs it too and `coach-goal.js` must
keep importing nothing (`coach-goal.mjs` and `coach-pure.mjs` check that);
`coach-overlap.js` imports it from there. The only bodyweight function either
file uses.

### 3.3 `readLift(ex, ctx, input)` — the call

```
b = baselines(ex, ctx)
if !b or b.status = progressing                      → { call: 'none' }
end    = b.series[last].startedAt
W      = the points of b.series with startedAt ≥ end − 42 days   // the read window
if W has < 4 points or spans < 21 days               → { call: 'none' }
flat   = b.status ∈ {stalled, declining}
         or lastBestAt is null or more than 21 days before now
if !flat                                             → { call: 'none' }
start  = W[0].startedAt
weeks  = (end − start) / 7 days                      // always 3 to 6
e1F    = median(y of W[0], W[1]);  e1L = median(y of the last two points)
abs    = e1L / e1F − 1
bwS    = bwAt(start);  bwE = bwAt(end)
ctxW   = (bwS && bwE && weeks ≥ 3)
           ? energyBand(((bwE − bwS) / bwS) / weeks × 100)   // coach-goal thresholds
           : null
rs     = (bwS && bwE) ? (e1L / bwE) / (e1F / bwS) − 1 : null
irregular = b.freq.normal ≥ 1 and b.freq.recent < 0.6 × b.freq.normal
fatigued  = group fatigue (§3.4)

first match:
 1  irregular                                          → 'irregular'
 2  fatigued                                           → 'fatigue'
 3  ctxW ∈ {deficit, deep} and rs ≥ −0.01
      and abs ≥ −0.05                                  → 'holding_cut'
 4  ctxW ∈ {deficit, deep} and abs ≥ −0.05              → 'small_slide'
 5  ctxW ∈ {deficit, deep}                             → 'sliding'
 6  ctxW ∈ {hold, surplus}                             → 'plateau'  (+ rung, §3.5)
 7  otherwise (not enough weigh-ins at start or end)   → 'unknown'
```

*Checked before this brief was written:* a model of exactly this gate and window
against the real v48 `baselines()`, for a lift trained 1, 2 and 3 times a week,
gives C1 `holding_cut`, C2 `sliding`, C3 `plateau`, C6 `unknown` and C7 `none`
at every frequency. Gating on `status` instead gave `none` at 2× and 3× a week.
Keep a C-row at 2×/week and one at 3×/week in the battery for that reason.

**Row 3 needs `abs ≥ −0.05` as well.** Relative strength alone would call an 8%
drop in the estimated max "holding" whenever bodyweight fell 7%, and that is not
something to tell anyone as good news. Past a 5% drop it is `sliding`, whatever
per-bodyweight says.

**"Cut" is his word, not Coach's.** Rows 3–5 fire whenever weight is falling.
Their sentences say "cut" only when the aim is `cut` or `recomp`, or
`weight.goalDir` is −1 (his food targets are set to lose). Otherwise they say
"while your weight has come down about 6 lb", and the goal-change question
(§7.4) is where Coach asks whether that was meant.

`energyBand(pct)`: the same thresholds as `coach-goal.js` `energyContext`
(≤ −0.75 deep, ≤ −0.25 deficit, ≥ +0.25 surplus, else hold). Export one helper
from `coach-goal.js` and use it in both places; never restate the numbers.

*Why relative strength:* force per pound is what a cut protects. An estimated
max down 2% while bodyweight is down 4% is relative strength gained, and calling
that a plateau would be a wrong reading about the most sensitive thing Coach
looks at.

### 3.4 Group fatigue

For the lift's primary group, hard sets = **the shipped count**: `coach.js`
`shapeSession()`'s `sets[g]` (working sets by the exercise's primary group,
warm-ups out). Use that same function, so "chest sets" is the same number in
every answer on the sheet. `coach-overlap.js` can't import `coach.js` (that
would be a cycle, and `shapeSession` is nested inside it), so `coach.js` hands
the shaped sessions to `readLift`, `lighterWeek` and `recordDay` as an argument
and the count is computed in one place. Everywhere this brief says "hard sets",
it means this count:

```
recent  = hard sets in the last 14 days / 2        normal = hard sets in days 14–70 / 8
F share = F sets / hard sets, same two windows
fatigued = (normal ≥ 4 and recent ≥ 1.3 × normal)
        or (F sets in the last 14 days ≥ 3 and F share recent ≥ 2 × max(F share normal, 0.02))
```

### 3.5 The ladder (call `plateau` only)

Coach keeps no memory of its advice, so the rung is worked out from how long
the lift has been flat, which is in the log:

```
weeksFlat = (now − max(lastBestAt, b.series[0].startedAt)) / 7 days
            (never counted from before a layoff: a comeback starts the clock)
< 5  → 'reset' if grinding (the top load's reps below the range's lo in 2 of
        the last 3 exposures), else 'wait'
5–8  → 'volume' if the group's weekly hard sets over the last 4 weeks are below
        BOTH his 12-week normal (weeks 4–12) AND the aim's volume floor (§3.6);
        else fall through to 8+
≥ 8  → 'variation' if a candidate exists (below), else 'volume' if eligible,
        else 'none'
```

**Variation candidate:** a lift from **his own log** in the last 182 days, same
primary group, same tag pattern, a different angle or different equipment, not
hidden, not this lift. The most recently logged wins; ties by exId. Never a
lift he has never logged. A custom exercise has no pattern, so it neither
offers nor receives a variation.

### 3.6 Volume floors (T3, labelled), exported from `coach-goal.js`

| Aim | Weekly hard sets floor for the lift's group |
|---|---|
| Build muscle, Recomp, no aim | 10 |
| Get stronger, Powerlifting, Stay consistent | 6 |
| Lose fat, keep strength | ⅔ of his 12-week normal, rounded down |

*Why:* 10+ sets a week per muscle is the most studied range for growth
(Schoenfeld 2017; Pelland 2024 finds diminishing returns, not a ceiling).
Strength needs less volume and more practice with the lift. A cut aims to
**keep** what he has, so its floor is his own normal. Printed as "a common
starting point" wherever a sentence uses it.

### 3.7 `lighterWeek(input, now)` — account-wide, reactive only

Offered when **two or more** hold:

1. Two or more lifts with status `declining` (among lifts with baselines, last
   84 days).
2. Account F share over the last 14 days ≥ 2× the share over days 14–70, with
   ≥ 3 F sets in the last 14.
3. Each of the last two 7-day blocks (days 0–6 and 7–13) has hard sets ≥ 1.3×
   the median weekly hard sets of blocks 2–9 (blocks with at least one session).
4. It's been ≥ 42 days since the last **light week** (a 7-day block with ≥ 1
   session and hard sets ≤ 60% of that median), **and** 1 or 2 holds.

What it says: "A lighter week: about half your usual sets (for you, about 7 for
chest, 8 for back…), the same weights you’ve been using, then back to normal."
The per-group counts are **his** 12-week weekly normals halved, rounded down,
for groups with a normal of 2 or more. *Why:* the international Delphi consensus
on deloading (Bell et al. 2023): volume comes down, intensity can stay, about a
week, reactive when fatigue shows. Labelled a common approach (T3).

A detected light week is excluded from the fatigue normals above and never
counts as a decline in `readLift` (drop its points from `W` before the call).

### 3.8 `recordDay(input, now)` — "Good day for a record?"

A candidate lift must pass **all**:

- ≥ 6 exposures, status not `declining`, and `readLift` not `sliding`,
  `small_slide` or `fatigue`;
- **the target**: the heaviest on-grid top load `L` from the last 28 days where
  one more rep than his best reps at `L` gives an e1RM (reps capped at 12, as in
  `coach-prog.js`) above his best e1RM on this lift, **and** that rep count is
  **3 or more**. Never a single, never a double;
- the last exposure of this lift had **no F** and no rep drop of 25% or more
  from its first working set at the same or a lighter load;
- days since the lift's group ≥ max(2, his 25th-percentile gap for that group
  over 84 days, which needs 4 training days; else 2);
- the current `weight.energy` is not `deep`;
- days since this lift < 12, and no gap of more than 21 days among its last 3
  exposures (not a comeback session);
- the current 7-day block is not a detected light week.

Among candidates, the one with the most exposures in 84 days wins; ties by
exId. What it says: "Good day for 6 at 225 lb on Barbell Bench Press, one more
rep than your best there." Plus its evidence, and the unseen line: "Coach can’t
see how you slept or how you feel, and those matter most on a record day."
**A rep record at a weight he has already lifted, never a max attempt.**

### 3.9 The sentences

Every call has a sentence and its evidence, through `units.js`, no banned word.
Shapes (the run writes the final words; these are the facts each must carry):

| Call | Carries | Example |
|---|---|---|
| `irregular` | recent vs normal frequency | "Bench is flat, and you’ve benched 3 times in 4 weeks against your usual 2 a week." |
| `fatigue` | the group's recent vs normal sets, or F sets | "Bench has been flat for 4 weeks while your chest sets ran 40% over your usual." + the lighter-week offer |
| `holding_cut` | rs as a %, the bodyweight change | "Your estimated max on bench is level, and for your bodyweight it’s up 3% while you’ve lost 6 lb. In a cut, that’s holding." (aim `cut`: "…that’s the win."; "cut" only under §3.3's rule, else "while your weight has come down") |
| `small_slide` | abs %, weeks, the cut | "Down 3% over 6 weeks of losing weight, a small slide. Coach will say if it speeds up." |
| `sliding` | abs %, his weekly loss, his goal rate if set, **both through `labelRate`** so they're in the same unit | "Down 8% over 6 weeks while you’ve lost about 2 lb a week, faster than the 1 lb a week you set." + options: his rate vs his own goal rate (T1), volume vs normal, a lighter week. **Never "eat more".** |
| `plateau` | the change, weeks, the bodyweight direction, frequency, the rung | "Level for 5 weeks at steady bodyweight, training it twice a week. That’s a real plateau." + the rung's line |
| `unknown` | weeks flat | "Bench has been level for 5 weeks. Coach needs a couple of weigh-ins near the start and the end of that stretch to tell whether your weight is part of it." |

**Say what actually happened (review, 23 Sep).** `flat` includes a declining
lift, so "level" is only for |abs| < max(2%, σ); past that the sentence says
"down 7%". "At steady bodyweight" only when `ctxW` is `hold`; in a surplus it's
"while your weight has gone up". "A real plateau" only when `weeksFlat` ≥ 5.
The same rules hold for `unknown`'s "level".

Rung lines: `reset` → describe what `prescribe()` returns for that lift right
now, never more: mode `reduce` → "Coach’s target steps the weight back, and you
build from there."; mode `hold` → "Coach’s target keeps the weight until your
reps are back in range." (no "so you": it's in `coach-voice.mjs`'s CAUSAL list) `wait` → "Stalls under five weeks often break on their own, so the targets stay." (T3) `volume` → "+2 sets a week for chest would bring it to a common starting point of 10." `variation` → "You’ve done Incline Dumbbell Press before. A few weeks of it is a common way through a flat stretch."

"Flat" and "level" are allowed. "Stalled" is allowed only inside the `plateau`
row. **No call ever says a lift is stalled while the lifter is cutting and
holding** (rows 3–4).

### 3.10 Wiring (Phase A)

- **Category `rest`** ("Rest and lighter weeks"; note: "When Coach suggests a
  lighter week or a rest.") inserted after `recency`. Relative order of every
  other category unchanged; `patterns` stays last.
- **Intent `lift_status`**, selector, Pro, sheet, category `progression`, route
  **`ask_lifts`** "How are my lifts moving?": up to 5 lifts with the most
  exposures in 84 days (non-cardio, with baselines). One line each:
  `progressing` → "Bench: up about 12 lb on your estimated max over 6 weeks."
  (`moveLb`; if it rounds to 0 or below, which `bestIn(3)` allows, "Bench: a new
  best on Tuesday." instead); otherwise, when `readLift` isn't `none`, its
  sentence; "Bench: too soon to call (3 sessions)." **only** when `readLift`'s
  window has fewer than 4 points or spans under 21 days (a lift trained twice a
  week reads `holding` for months in v48, so `holding` alone is no reason to say
  "too soon"); any other lift, "Bench: level lately." `more` bubbles, one per
  lift.
- **Intent `record_day`**, selector, Pro, sheet, category `progression`, route
  **`ask_record_day`** "Good day for a record?", answerable only when
  `recordDay` has a candidate.
- **Intent `lighter_week`**, finding, Pro, sheet only, category `rest`, route
  **`ask_lighter`** "Should I go lighter?". It fires when `lighterWeek` says so.
  As a finding, it supersedes `recent_pr` and `pr_proximity` in the ranking
  (the stopping bias).
- **Reconcile `stalled_lift`.** Keep the id and the fact. Its `when` also needs
  `readLift` on the same lift to return a call other than `none`, and its
  response renders that call's sentence instead of the old figure-and-date. A
  cut that's holding is never called a stall. The shipped `ask_stall`
  ("Anything stalled?") route and its follow-ups stay and reach the reconciled
  `stalled_lift`; *How are my lifts moving?* takes its place in the topic
  tables.
- Train topics after Phase A (pre-workout state, §7.1): *What should I train
  today?*, *Make me a workout*, *What should I lift today?*, *Good day for a
  record?* (when answerable), *Should I go lighter?* (when answerable), *How are
  my lifts moving?*.

### 3.11 NEW `tools-check/coach-overlap.mjs` — Phase A's battery

Seeded fixtures in the real record shape, with weigh-ins (`{ lb, t }`) where a
row needs them, scored **ok / miss / wrong**, **wrong: 0 fatal**. Build each
fixture to the stated facts; the expected call is what must come out.

| # | Facts | Expected |
|---|---|---|
| C1 | Bench, 10 exposures over 6 weeks, e1RM level (±1%), no new best in the last 4; weigh-ins 212 → 205 across the window (≈ −0.55 %/wk) | `holding_cut` |
| C1b | C1 with aim `cut` | `holding_cut`, the "that’s the win" wording |
| C2 | Squat declining ≈ 8% over 6 weeks; weigh-ins 180 → 167 (≈ −1.2 %/wk). Per bodyweight that's about −1%, so this row pins row 3's `abs ≥ −0.05` | `sliding` |
| C3 | Bench level 5 weeks, 2×/week regular, weigh-ins steady (≈ +0.1 %/wk), chest sets below his normal and below 10 | `plateau`, rung `volume` |
| C3b | C3 but level 9 weeks, and he has logged Incline Dumbbell Bench Press in the last 182 days | `plateau`, rung `variation` naming it |
| C3c | C3 but level 4 weeks, top load's reps below lo in 2 of the last 3 | `plateau`, rung `reset` |
| C4 | Level, and benched 3 times in the last 4 weeks against 2/week over 12 | `irregular` |
| C5 | Level, chest sets over the last 14 days 1.4× the normal | `fatigue` |
| C6 | Level, no weigh-ins | `unknown` |
| C7 | Progressing lift | `none`, and no stall sentence anywhere |
| C8 | Level with only 3 exposures | `none` |
| C9 | C3 trained **3×/week** (v48's `status` reads `holding` here) | `plateau` |
| C10 | C1 trained 3×/week | `holding_cut` |
| C11 | New best 2 weeks ago, level since, 2×/week | `none` |
| C12 | Squat down 7% over 5 weeks, weight **rising** 0.5 lb/week, aim `muscle` (Micah's case) | `plateau`; the sentence says "down 7%" and "your weight has gone up", never "level" or "steady" |
| C13 | C1 with aim `muscle` and no food-target direction | `holding_cut`; the sentence never says "cut" |
| P1 | Bench progressing, last 3×5 at 225 (best e1RM 263), chest last trained 3 days ago, energy `hold` | `recordDay` → **6 at 225** |
| P2 | P1 with energy `deep` | no candidate |
| P3 | Best set a single; one more rep = a double | no candidate |
| P4 | P1 but the last exposure has an F set | no candidate |
| P5 | P1 but bench last done 14 days ago | no candidate |
| L1 | Two lifts declining, and F share 2.5× normal with 5 F sets | `lighterWeek` offered, per-group halves of his normals |
| L2 | Only one of the four conditions | not offered |

**Properties** over ≥ 2,000 generated histories with weigh-ins: deterministic;
order-blind; adding weigh-ins in (end − 7 days, end] that move bodyweight **down** never turns
`holding_cut`/`small_slide` into `plateau`; removing all weigh-ins never yields
a call that needs them (`holding_cut`, `small_slide`, `sliding`, `plateau`); `recordDay` never proposes
reps < 3, never a load not logged in 28 days, never after an F; no sentence
carries a banned word, a causal word, or "eat".

---

## PHASE B — STAGE THREE

## 4. States

```
live        a live session is running on this device (input.live.active)
post        no live session, and the last session ended ≤ 3 hours ago
            (endedAt, else startedAt + durationSec)
done_today  a session today (local day key), ended more than 3 hours ago
pre         otherwise
```
A pure `stateOf(input, now)` in `coach.js`. **Live** keeps the shipped
behaviour exactly (the chip, the builder's live line).

## 5. The card: encouragement only (Micah's decision #3)

- **The engine's views don't move.** `c.you`, `c.train` and `c.opening` stay
  exactly as v48 computes them (the ranked findings; `opening` is already `you`,
  and `withRepeat` already compares with it). Several shipped verifiers pin
  them (`coach-units.mjs` on `c.you.tone`, `coach-pure.mjs` on its state), so
  changing them would break checks this brief doesn't list.
- **What's new is `c.card = { you, train }`**: what each card shows. One earned
  line (§5.1) when one qualifies; otherwise the shipped blocking states as they
  are (log unreadable, first run, live session, Basic's locked state), and
  otherwise the shipped `card_state_thin` / `card_state_clear` text, which is
  neutral ("Nothing stands out today."). **`coach-ui.js`'s cards read `c.card`;
  the sheet still opens on `c.opening`.** So the card encourages, the sheet
  opens on the finding, and they no longer show the same line.
- **Greetings:** `g_since_group` and `g_away` leave the card's pool (they read
  as "you haven't"). Every remaining greeting passes the card ban below; drop
  any that doesn't and name it in the report. Keep `pickGreeting`'s pool of at
  least two (its cap depends on it).
- **The card ban** (a new check in `coach-voice.mjs`, applied to every string the
  card can draw, both units): the shipped `BANNED` list plus *overdue, behind,
  missed, under, should, try, need, skip, low, less, only, still*.

### 5.1 The earned lines (a `HYPE` registry in `coach.js`, like `GREETINGS`)

Each entry: `id`, `category` (muted category → excluded), `aims` (the aims it
suits; `null` = all), `gate(d)`, `text(d, u)` (≤ 9 words, at most one number,
no "!"), `why(d, u)` (one short evidence clause for the card's small line),
`facts` (the ids it quotes, for the suppression rule).

**The word and number limits are checked on the rendered string, as part of the
gate.** Library names are long ("Barbell Bench Press", "Back Squat (High
Bar)") and there are no short names, so a line that renders past nine words or
with a second number simply doesn't qualify that day. Extra numbers go in
`why()`. `g_moving` (`coach.js`) gates on name length for the same reason.

| id | category | Gate | Example |
|---|---|---|---|
| `hype_week_best` | volume | sessions in the last 7 days (`session.last7`, rolling) > every one of the previous four 7-day blocks, and ≥ 3 | "4 sessions in seven days, your most in five weeks." (rolling words: never "this week", the defect v43 fixed in `g_in_a_row`) |
| `hype_pr` | progression | `lift.recentPr` within 3 days, kind `e1rm` or `weight` (it carries no reps) | "New best on Barbell Bench Press." · why: "heaviest set, 225 lb" or "estimated max, 263 lb" |
| `hype_e1rm_trend` | progression | a lift `progressing` whose `series` spans ≥ 42 days and whose gain, median of the last two points minus median of the first two, is ≥ 2 × `sigma`% of the series' median (well past his own session-to-session swing). Not `spanDays`: the slope window reaches six weeks only for a lift trained about once a week | "Barbell Bench Press is up about 15 lb." · why: "estimated max, over 6 weeks" |
| `hype_targets_met` | targets | the last session (≤ 3 days ago) had ≥ 2 lifts with a numeric target **as `prescribe()` would have set it before that session** (replay: that lift's exposures before it, `now` = its `startedAt`, **its group's days-since as of that session** (`groupDaysSince` changes the target after a layoff: miss it and a comeback replays as `reenter` while the builder showed `hold`), today's aim, experience and energy context; targets are stripped from the record, so a replay is the only way, and three days is too short for the context to move), and every such lift's top sets reached the target load and reps | "Every Coach target met on Tuesday." |
| `hype_holding_cut` | progression | a lift whose `readLift` call is `holding_cut`, **and** aim `cut` or `recomp` or `weight.goalDir` −1 (weight he didn't mean to lose is never "a cut") | "Barbell Bench Press is holding through your cut." · why: "6 lb down, estimated max level" |
| `hype_goal_pace` | weight | weight moving in the aim's direction (aim `cut`: down; aim `muscle`: up), `weight.rateWk` within ±25% of `weight.goalRateWk` (which is `food/targets.auto.rateWk`; absent → no line), **and** `|rateWk| ≤ RATE_BAND_LB` | "Up 3 lb in four weeks, right on pace." |
| `hype_target_progress` | progression | a `goalLift` whose e1RM gap has closed by ≥ 50% since `goalLift.at` (target e1RM with reps capped at 12, as in §7.3) | "Halfway to a 315 bench." |
| `hype_protein_streak` | fuel | protein ≥ target on the last 5+ consecutive days with food logged (`daySummaries` cal > 0, today excluded) | "Protein target hit 5 days running." |
| `hype_back` | recency | the latest session came after a gap of ≥ 12 days, and is ≤ 2 days old | "Good to have you back." |
| `hype_milestone` | volume | the session count passed 10, 25, 50, 100, 150, 200 or 250 within the last 3 days | "That’s workout 50 logged." |
| `hype_logging` | fuel | 14+ consecutive days with food logged, ending yesterday | "Two weeks of food logged straight." |
| `hype_recovery` | rest | trained today **and** on each of the 2 days before (3+ in a row) | "Three straight days. A rest day is well earned." (Micah's decision #16, in house style and inside the nine words; "great session" is left out because Coach can't know it was) |

**Rules:**
1. **True.** Every number comes from a fact whose gate passed.
2. **Never corrective** (the card ban).
3. **Never contradicts the sheet.** If `lighter_week` fires, no volume or streak
   line shows; `hype_recovery` shows **only if its own gate passes** (otherwise
   the card falls back as §5 says). A line whose `facts` are the evidence
   of the sheet's opening caution is suppressed.
4. **Never celebrates** a weight rate past `RATE_BAND_LB`, a weight change with
   no stated aim in that direction, or a low-calorie day. There's deliberately
   no weight-loss line without an aim of `cut`.
5. **Goal-aware order**: candidates whose `aims` include the current aim first;
   then the most recent evidence; then id.
6. **Doesn't repeat**: rotate by the shipped device-local open counter across
   the qualifying lines, and skip any id in a device list of the last lines
   shown (a sibling of `recentGreets`, `coachHype`, same namespace and the same
   write-once-per-open rule). Copy `pickGreeting`'s cap exactly: the memory
   blocks at most `min(3, pool − 1)` ids, so a pool of two or three always has
   a free line and the one just shown never shows twice in a row.
7. **Pro and Basic both get earned lines.** Encouragement isn't a Pro feature.

### 5.2 The Basic teaser (Micah's decision #15)

For a Basic account, the sheet's opening, above the shipped Pro panel, shows
**one real target**: the first numeric target from the default proposal —
"One of your targets: Bench — Target: 3 × 8 at 190 lb." — computed by the same
engine (the builder is Pro at the surface, not in the engine). Nothing else
about targets reaches Basic.

## 6. The sheet adapts to the moment (spec §9.1)

`topicsFor(surface)` becomes state-aware and **stays a flat array**; the view
splits it: **four bubbles show, the rest sit under a "More" chip** that reveals
them in place (no new sheet). Only answerable ids appear (the shipped filter).
**`ask_patterns` stays last in every You list** when it's answerable
(`coach-patterns.mjs` pins that), so with Patterns on it sits under More.

| State | Train sheet (in this order) | You sheet (in this order) |
|---|---|---|
| `pre` | What should I train today? · Make me a workout · What should I lift today? · Good day for a record? · Should I go lighter? · How are my lifts moving? · What’s waited longest? · How’s my week going? (the shipped two stay, under More) | How’s my training? · How’s my food? · Where’s my weight going? · How am I tracking toward my goal? · How are my lifts moving? |
| `post` | How did today compare? · What’s next time? · How are my lifts moving? · Make me a workout | How did today compare? · How’s my food? · Where’s my weight going? · How am I tracking toward my goal? |
| `done_today` | How did today compare? · What should I train next? (the `ask_shape` route, relabelled) · Make me a workout · How are my lifts moving? | as `pre`, with How did today compare? first |
| `live` | the shipped behaviour | the shipped behaviour |

His decided order holds: in `pre`, *What should I train today?* first and *Make
me a workout* second. The shipped `coach-rank.mjs` checks on the Train order and
on "You gets the general three" are updated **deliberately** to these tables,
with the reason.

### 6.1 "How did today compare?" (`ask_compare`, training only tonight)

For the latest session (today, or the `post` session): each lift with ≥ 3 prior
exposures: `delta = (session's capped e1RM − median of its last 3 before) /
that median`, in units of the lift's σ. Per-lift readout: above (≥ +1σ), usual,
below (≤ −1σ). Session summary when ≥ 2 lifts qualify: most above → "Above your
usual"; most below → "Below your usual"; else "About your usual". Plus targets
met (the replay from `hype_targets_met`): "4 of 5 Coach targets met." Plus the
unseen line: "Coach can’t see sleep, stress or soreness." **No attribution
tonight** (stage four adds the differences and the bad-day mark). If he felt
off but the numbers were usual, the answer says the numbers were usual.

### 6.2 "What’s next time?" (`ask_next`)

For each lift in the latest session: `prescribe()` now, as the builder would.
"Next time on bench: 3 × 8 at 195 lb." with the target's first `why`. Pro.

## 7. The goal, made useful (spec §8)

### 7.1 Lift target (`goalLift`) — the one new key

`settings/coach.goalLift = { exId, lb, reps, at }`: `lb` stored pounds (via
`wIn`), `reps` 1–20 (default 1), `at` epoch ms when set. `normGoalLift()` in
`coach-goal.js`, used by `normSettings()`, fails safe on every junk value
(bad exId shape, non-finite or ≤ 0 lb → absent; reps out of range → 1; bad `at`
→ absent). `patchNow()` replaces it whole; clearing writes `null`. Settings →
Coach → Your goal (Pro): **Lift target**: an exercise select of the lifts he
has logged in 182 days (top 30 by exposures), a weight input in the display
unit, reps (1–20), Save / Clear. The PROPOSED-rules note for native goes in
`NEXT-NATIVE-V49.md`.

### 7.2 Focus group (`q_focus_group`)

A question like the goal's: `always: true`, `where: 'goal'` (never the opener),
options the six groups plus `none` ("No focus"), its own fact `coach.focus`,
`changes: ['goal_pace']`. Tonight it appears in pace (§7.3). Its volume and
builder effects are stage five. **`ask_goal` carries it** as the question under
its answer, the way `ask_targets` carries the goal's; that moves
`coach-goal.mjs`'s "no other route carries a question" check, deliberately, to
"no route but `ask_targets` and `ask_goal`". Being `always`, it also shows in
Settings → Coach → Your goal for Pro, like the aim.

### 7.3 "How am I tracking toward my goal?" (`ask_goal`, intent `goal_pace`)

**Pro** (Your goal is Pro-only, so this answer is too; Basic never sees the
bubble). Answers, in order, whichever apply (no aim → "Set a goal in Settings →
Coach → Your goal and Coach will track it." once, and nothing else):

- **The aim**: "You set Build muscle."
- **Lift target**: `E* = e1rm(lb, min(reps, 12))` (the weight itself at 1
  rep), capped at twelve like every estimated max Coach reads (§40a): a
  225 × 15 target uncapped would sit above what 225 × 15 ever scores, and Coach
  would tell someone who hit it that they're not moving toward it. `E` =
  median of the last 2 exposures' capped e1RM. Pace = Theil–Sen slope of the
  series over 12 weeks (≥ 6 points) in lb/week; pessimistic pace = the 25th
  percentile of the pairwise slopes. If `E ≥ E*`: "Your estimated max is at your
  target." (**never "test it"**, never a max attempt). If the pessimistic pace is
  > 0: "about X–Y weeks at your last 12 weeks’ rate" (optimistic to pessimistic,
  rounded up; past 26 weeks, "more than 6 months at your current rate").
  Otherwise: "Not moving toward it right now." + that lift's `readLift` sentence.
  **Always a range in weeks, never a date.**
- **Bodyweight target** (`food/targets.goalLb`, read, never copied): the rate
  Coach already uses, `weight.rateWk` from `tdee.js` `trendRate()`. That call
  also returns `seWk`, which `coachInput()` drops today: pass it through as
  `weight.rateSeWk` (the one new field the gatherer hands over). A range from
  `rateWk ± rateSeWk` (±25% when it's null), only when moving toward the
  target. **No approving word past `RATE_BAND_LB`**: the figure alone.
- **Powerlifting**: the big three and the total, estimated: squat = the
  most-exposed of `back-squat-low-bar`, `back-squat-high-bar`; bench =
  `barbell-bench-press`, `barbell-bench-press-paused`; deadlift =
  `conventional-deadlift`, `sumo-deadlift`. Each lift's e1RM and status, and the
  sum when all three exist.
- **Focus group**: its weekly hard sets over the last 4 weeks against his
  12-week normal, and its two most-exposed lifts' statuses.

### 7.4 "Did your goal change?" (Micah's decision, spec §8.4)

Two questions, asked as the sheet's opener (the shipped machinery, no `where`),
each with its own fact and three options: *Yes, update my goal* (`update`),
*No, it’s temporary* (`temp`), *It’s on purpose* (`keep`). **Pro only**:
`update` opens Your goal, which is Pro-only, and the opener is drawn before the
Pro gate for Basic (`coach-ui.js` ~508), so gate both questions on tier in
their `when`.

- **`q_goal_check_weight`**: in each of the last three 7-day blocks, the weekly
  change `(bwAt(end) − bwAt(start)) / bwAt(start) × 100`, banded with
  `energyBand`. Fires when: aim ∈ {muscle, strength, powerlifting, recomp} and
  all three are `deficit`/`deep`; or aim `cut` and all three are `surplus`; or
  aim ∈ {recomp, maintain} and all three have |change| > 0.5.
- **`q_goal_check_targets`**: aim `muscle` with `weight.goalRateWk < 0`, or aim
  `cut` with `weight.goalRateWk > 0` (his food targets point the other way).
- Both need ≥ 21 days of weigh-ins **and** ≥ 14 days since `asked.q_goal_aim`.
- `update` opens Settings → Coach → Your goal, then behaves like `temp`. `temp`
  keeps it quiet for **28 days** (from its `asked` stamp). `keep` keeps it quiet
  until the aim changes. **Changing the aim clears both answers** (write them
  `null` in the same patch). Today the aim is saved through `answerQuestion()`,
  which patches one answer; add a `setAim(aim)` beside it in `coach-data.js`
  that writes the aim, its `asked` stamp and both nulls in one patch, and have
  Settings and onboarding call it.
- Words: "You set Build muscle, and your weight has come down about 4 lb over
  the last 3 weeks. Did the goal change?" Numbers through `units.js`, never
  judgmental. Questions muted → never asked.
- Micah's own case must stay silent: aim `muscle`, weight going **up**.
- **The shipped question machinery needs three small changes, made
  deliberately** (review, 23 Sep):
  1. `pendingQuestion()` skips every answered question (`coach.js` ~2807), so
     `temp`/`update` could never be asked again. Give a question an optional
     `stale(answer, askedAt, d)`; an answered question whose `stale` returns
     true counts as unanswered. For these two: `temp`/`update` stale after 28
     days; `keep` never (the aim change clears it).
  2. `q.text` is a static string (`questionView`, and `coach-ui.js` draws it).
     Allow `text(d, u)` as a function, resolved in `questionView`, so the
     question can carry live numbers through `units.js`.
  3. Keep both check questions out of `coachAnswerRows()`'s `given` list
     (`coach-ui.js` ~819), or Settings would draw them as three-way switches.
     Mark them (e.g. `settings: false`) rather than listing ids in the UI.

### 7.5 `ASK_LABELS` for the new routes

`ask_lifts` "How are my lifts moving?" · `ask_record_day` "Good day for a
record?" · `ask_lighter` "Should I go lighter?" · `ask_compare` "How did today
compare?" · `ask_next` "What’s next time?" · `ask_goal` "How am I tracking
toward my goal?". The user's bubble labels may use "should"; Coach's sentences
may not.

### 7.6 Onboarding: a training-goal step

After the existing weight-goal step, a step **"What are you training for?"**
with the six aims as `ob-choice` rows and a *Skip for now*. It writes nothing to
the `onboarding` node (which ends in `$other: false`). When onboarding finishes,
if an aim was chosen, call `setAim(aim)` from `coach-data.js` (§7.4). A
failure there is non-fatal: Coach asks later.

## 8. NEW VERIFIERS (Phase B)

- **`coach-hype.mjs`**: every entry's gate and text driven true and false, both
  units; the card ban over every string the card can draw; rule 3 (a
  `lighter_week` day shows no streak line, and `hype_recovery` only when its
  own gate passes); rule 4 (a fast loss with no aim, a loss past the band, a cut
  aim with a gain: no weight line; `hype_holding_cut` silent for aim `muscle`);
  every rendered line ≤ 9 words and ≤ 1 number with real library names, both
  units; rotation follows `pickGreeting`'s cap (pools of 1, 2, 3, 5); the
  `hype_targets_met` replay matches `prescribe()` called by hand, including a
  comeback lift whose group kept training.
- **`coach-state.mjs`**: the four states at their boundaries (2:59 and 3:01
  hours after `endedAt`; across local midnight; a live session); the topic
  tables per state and surface; "More" holds the rest.
- **`coach-pace.mjs`**: lift target range, reached, not moving, >26 weeks;
  bodyweight range; no approval past the band; never a date; powerlifting total;
  focus readout; the goal-change questions: G1 muscle + 3 deficit weeks + 21 days
  data + aim set 20 days ago → asked; G2 aim set 5 days ago → silent; G3 `temp`
  answered 10 days ago → silent, 30 days ago → asked; G4 cut + 3 surplus weeks →
  asked; G5 **muscle + gaining (Micah) → silent**; G6 aim changed → answers
  cleared; G7 a Basic account → never asked; G8 neither check question appears
  in Settings' answer rows; a 225 × 15 lift target is "at your target" once
  225 × 15 is logged; `normGoalLift` fails safe on junk, and `normSettings`
  adds `goalLift` **only when it's valid** (so `coach-goal.mjs`'s key-shape
  check on an input without one still passes).
- **Update deliberately, with reasons:** `coach-pure.mjs` (`coach.js`'s allowed
  imports gain `./coach-overlap.js`; a new purity section for `coach-overlap.js`
  to the shape of F–I; `coach-goal.js` still imports nothing, now with
  `bwAt`/`energyBand` in it), `coach-goal.mjs` (only the "no other route carries
  a question" check, §7.2), `coach-rank.mjs` (the cards read `c.card`, not the
  ranked finding; the sheet's opening still does; topic tables),
  `coach-voice.mjs` (the card ban, the new answers), `coach-surface.mjs` (the
  card reading `c.card`, the opening, "More", the new answers, Lift target and Focus in
  Settings, the Basic teaser), `coach-registry.mjs` (new categories, intents,
  questions), `coach-rotation.mjs` (the greeting pool minus two; the hype
  rotation), `coach-silence.mjs` (a thin account's card is thin; every new
  intent is silent under its gate). Every other verifier: **the staging edit
  only**.

## 9. THINGS YOU WILL FIND. DO NOT FIX THEM.

Log in BACKLOG.md and name them in the handoff: anything in the fueling or rest
stage (stage four), weekly volume bands and neglect (stage five), the second
same-day session invisible to live facts, `record.groups` history, and anything
in native.

## 10. DOCS

AGENTS.md (`settings/coach`: `goalLift`, `q_focus_group`, the two check
questions, the `rest` category; the device-local `coachHype` list), CLAUDE.md's
Layout (`coach-overlap.js`), BACKLOG, **COACH-REPORT.md** (a new section: what
got built per phase, every battery row, anything you corrected and why, every
assumption, where this brief was wrong about the code, what isn't done; Micah's
decisions table carried forward with #3, #15, #16's card line and the §40a
acceptance marked built), and **NEXT-NATIVE-V49.md** (verbatim files with
sha256, surfaces, and the PROPOSED rules: `goalLift`, the new question ids and
values, the `rest` mute id).

## 11. DEFINITION OF DONE

1. Both syntax loops clean. Every verifier exits 0 in all three time zones.
2. `coach-prog.mjs` **57 / 0 / 0**, `coach-overlap.mjs` **wrong: 0**.
3. `sw.js` and `usage.js` read `rack-v49`. `database.rules.json` unchanged.
4. Small commits, each builds: Phase A (coach-prog additions → coach-overlap +
   battery → wiring) **before** Phase B (states → card + hype → sheet topics →
   compare/next → goal pace + goalLift + focus → goal checks → onboarding →
   teaser) → version bump → docs. **Do not push.**
5. The five-line handoff. **To check it worked** walks, on the phone:
   Train → COACH ME → *How are my lifts moving?*; *Good day for a record?* if it
   shows; the You card shows an earned line and the sheet opens on a finding;
   after a workout, *How did today compare?* and *What’s next time?*; Settings →
   Coach → Your goal → a Lift target → *How am I tracking toward my goal?*; a
   new account's onboarding asks what it's training for; a Basic account sees
   one target in the sheet.

## 12. IF YOU GET STUCK

Build what you can verify; put anything unfinished at the top of the report
with the reason. **Priority: all of Phase A first** (coach-overlap + its battery,
then `ask_lifts`, `stalled_lift` reconciled, `record_day`, `lighter_week`).
Then Phase B in this order: the card (encouragement + opening), states and
topics, *How did today compare?* / *What’s next time?*, goal pace + Lift target,
the goal-change questions, focus, onboarding, the teaser. A run that finishes
Phase A cleanly and says exactly where Phase B stopped is a good night.
