# Rack Coach → personal trainer: the design spec

Written 23 Sep 2026 in answer to `COACH-SMART-TRAINER-THINKING-BRIEF.md`, from a
read of lift-cal at `124d33a` (**rack-v47**, live): `coach.js`, `coach-build.js`,
`coach-live.js`, `coach-data.js`, `coach-tags.js`, `analytics.js`, `units.js`,
`tdee.js`, `insights.js`, `AGENTS.md`, `BACKLOG.md`, `COACH-PROMPT.md` and the
`tools-check/` verifiers that fence Coach today.

This is a design document, not app code. It has five parts, in the order the
brief asked for:

1. **The coaching-logic spec** — §1 to §11, one engine per section.
2. **Data and model additions** — §12.
3. **The phased build plan** — §13.
4. **The Claude Code build prompt for stage one** — a separate file,
   `SHIP-V48-PROMPT.md`.
5. **Open decisions for you** — §14.

Every threshold carries a one-line reason. Where the reason is "the research
says", the source is in the appendix. Where the research is thin and the number
is a judgment call, it says **taste** and it is in §14 for you to settle.

---

## 0. READ THIS FIRST — the twelve calls everything else hangs on

These are the decisions that shape the rest. If you disagree with one, change
it here first; the sections below follow from them.

1. **Coach prescribes training. It only ever reads out food.** The progression
   engine names a weight and reps, because that is squarely coaching and the
   science behind it is solid. The fueling brain compares what you logged with
   your own normal and your own targets, and stops there. It never tells anyone
   what to eat, never suggests eating less, never names a food. That line keeps
   Coach a training feature, not a nutrition or health service.

2. **Every weight Coach names is one you've already lifted, or one of your own
   jumps away from one** (coming back from a layoff, a whole number of your own
   jumps *below* your last top set). Not a percentage. A percentage off 225 is 202.5, which
   is a plate combination your gym may not have and a number you never chose. So
   Coach learns each lift's **load step** from your own log (you always go 185 →
   195 → 205, so your bench step is 10 lb) and only ever moves by that. If it
   doesn't know the step (a new machine, a kilo dumbbell rack), it says "the next
   setting up" and prints no number. That is the wrong-number rule applied to the
   bar.

3. **Coach checks whether food matters *for you* before it says it does.** The
   research is blunt: in a fed state, carbs make little difference to strength
   work up to about 10 sets per muscle; they matter mainly when training fasted
   or doing very high volume (Henselmans 2022, 49 studies). And an energy
   deficit slows muscle gain but, on average, not strength gain (Murphy & Koehler
   2022). So a Coach that says "you're low on carbs, that's why bench felt heavy"
   would be claiming more than the science supports. Instead, the fueling brain
   reports differences from your normal, and only links food to performance when
   **your own log** shows the link, with sample sizes, the way Patterns already
   does. That is more honest, and it is the uncopyable part. Only Rack has both
   halves of the data to check it.

4. **Plateau vs expected dip is decided by strength per pound of bodyweight.**
   If your estimated max is flat but your bodyweight trend is down, divide one by
   the other. Flat or rising per pound means "that's holding strength through a
   cut — stay the course." Falling per pound faster than the cut explains means
   it's a real slide. One ratio, computable from data Rack already has, and it
   answers the signature question without guessing.

5. **"Today's a rest day" is what's left when nothing is recovered.** A real
   coach doesn't say "rest" because chest is sore; they say "train legs." So
   Coach picks a recovered group first, and only answers "rest" when every group
   you'd usually train is inside its own recovery window, or several fatigue
   signs line up. That matches what you said on 17 Sep: rest suggestions only
   when it sees the same group being hit very often.

6. **Coach learns whether you listened without writing anything down.** Every
   rule is a pure function with the clock as an argument, so Coach can replay
   its rest rule over your past log and ask: on the days it *would* have said
   rest, did you train, and how did that session go? If you trained through five
   of them and held your numbers on four, it gives you an extra day next time and
   says why. Zero writes, fully deterministic, and it keeps the house rule that
   Coach stores no history of its own output.

7. **No baseline cache.** Every personal baseline is recomputed from the log on
   each open. The log is already in memory (one whole-tree read per app open), the
   maths is a few thousand operations, and a cache is a second record of a fact
   that can go stale. The one new read cost is food timestamps for the fueling
   brain, and that is lazy, bounded and Pro-only (§4.7).

8. **The card is earned encouragement, nothing else.** This changes what shipped
   in v42–v46, where the card shows the top finding ("9 days since chest").
   Under pillar 4 that moves into the sheet. The card becomes greeting + one
   true, positive, goal-aware line + COACH ME. It is never corrective, and a
   verifier bans the corrective vocabulary from it.

9. **One house rule has to change, and you signed it off on 23 Sep.** COACH-PROMPT §5
   says Coach "only ever compares against numbers the user set, or their own
   trailing average. Never a population norm." A trainer on day one has to lean
   on *something*. This spec allows **labelled training-science defaults**
   (rep ranges, set counts, load steps, how to structure a lighter week), shown
   as "a common starting point," and only until your own numbers replace them.
   It keeps the ban on population norms for anything about the body or food: no
   healthy weight, no body fat, no calorie floors, no "you should eat". §14 #1.

10. **No targets for singles, and none for a lone heavy top set.** Without an
    effort rating, a set of 1–3 reps is too close to a max for Coach to call the
    next one. Coach will set targets for 3×3 straight sets (with a stricter
    confirmation rule), but never for a single, and never for a one-off top set
    of three or fewer. When the RIR tap arrives, this is the first thing it
    unlocks.

11. **Silence is still a first-class answer.** Everything here has a
    minimum-data gate. The battery scores **ok / miss / wrong**, and a miss (Coach
    said less than it could have) is acceptable where a wrong (Coach said
    something false or unsafe) is not. **Wrong stays 0**, the same bar as the
    food parser.

12. **Build order is set by value and by how well the science holds up.**
    Progression first: it's the thing every paid lifting app has and Rack
    doesn't, and its science is the most solid. Then the overlap (plateau vs dip,
    PR timing), then the card and goal pace, then the fueling brain (new reads,
    weakest science, highest risk of an overclaim), then in-gym targets and
    balance. §13.

---

## 1. WHAT COACH CAN AND CANNOT SEE

Every rule below reads from this table and nothing else. A sentence that implies
Coach sees something in the right-hand column is a verifier failure.

| Coach can see (logged) | Coach cannot see |
|---|---|
| Every finished session: `startedAt`, `endedAt`, `durationSec`, exercises (`exId`, group, equipment, `block`), sets (`w` as a pound string, `r`, `type` W/N/F/D, `done`) | Sleep, stress, soreness, illness, pain or injury |
| The live session on this device, including `tw`/`tr` targets and which exercise is in hand | How hard a set felt (no RIR/RPE yet). A set typed **F** is "taken to failure", which is not the same thing as a missed rep |
| The library: 231 built-ins (primary group, equipment, secondary groups), their tags (pattern, angle, compound/isolation, side), customs (group + equipment only), renames, hidden ids | Rest time between sets (the rest timer is device-only and not stored), set-by-set timestamps, tempo, range of motion |
| Routines (with `tw`/`tr` targets) | What equipment or plates your gym actually has |
| Food: `food/daySummaries` (per-day kcal/P/C/F), and `food/log/{date}` entries with `t`, `meal` and macros | When food was *eaten*. `t` is when it was *logged*, so a batch-logger's timestamps say nothing about meal timing |
| Targets: `cal`, `p`, `f` (carbs are the remainder), `maint` + `maintSrc`, `goalLb`, `auto.rateWk` | Whether an empty food day was a fast or just not logged. **Unlogged is never zero** |
| Weigh-ins (`lb`, `t`), the model's trend weight and weekly rate with its standard error, the measured maintenance estimate | Hydration (the water log exists but is out of Coach's scope until you decide otherwise, §14), caffeine, supplements not logged as food |
| Steps per day | Any training not logged in Rack (sport, runs, a second gym app) |
| The clock and the device's local day | Anything about another person. Coach never compares you to anyone |
| Coach's own settings and your answers to its questions (`settings/coach`) | What Coach said to you yesterday. It keeps no history of its own output |

Three consequences that recur in every section:

- **An empty food day is "not logged", not "didn't eat."** Any baseline built on
  food first drops partial days (§4.1).
- **`t` on a food entry is when it was logged.** Anything about meal timing is
  phrased "going by when you logged it" and stands down entirely for someone who
  logs in batches (§4.2).
- **A set typed F is ambiguous.** Some people mark a set they took to failure,
  some mark a set where they missed a rep. Coach treats F as "no reps left in the
  tank": never a heavier set after it in the same session, never more than one
  step up after it next time. It never assumes F means a missed rep unless the
  reps also fell below the range.

---

## 2. ARCHITECTURE

### 2.1 Where it lives

The four layers that exist today (FACTS → INTENTS → RESPONSES → ROUTER in
`coach.js`) stay exactly as they are. The trainer adds **pure sibling modules**,
each copied verbatim to `src/pure/` in the native tree, each with the clock as an
argument and no reads, DOM or module state:

| Module | What it decides | Stage |
|---|---|---|
| `coach-goal.js` | The goal vocabulary (answers to Coach's own questions), the **dials table**, the energy context from the weight trend, and later pace/ETA and the goal-contradiction check | S1 (dials, energy), S3 (pace, contradiction) |
| `coach-prog.js` | Per-exercise baselines (load step, rep range, scheme, e1RM series, noise, status) and `prescribe()`: the next target for one exercise | S1 |
| `coach-overlap.js` | Plateau vs expected dip, the stall ladder, the lighter-week call, PR timing | S2 |
| `coach-fuel.js` | Nutrition baselines, day coverage, logging style, the fueled read, readiness, post-session attribution | S4 |
| `coach-volume.js` | Fractional weekly volume, landmark bands, balance ratios, neglect, rest-day tolerance learning | S5 |

`coach.js` imports them the way it imports `coach-build.js` and `coach-live.js`
today: it owns the log's derivations (window, shapes, per-group facts) and hands
each module only what it needs. Nothing imports back. `coach-data.js` stays the
one impure gatherer the port rewrites.

**Why separate modules and not more of `coach.js`.** It is 2,872 lines. Each new
engine has its own battery, and a battery that stages one small pure module is
far easier to trust than one that stages the whole engine. It is also the port's
plan: five small verbatim copies with their own hashes beats one big file that
changes every ship.

### 2.2 Four kinds of sentence

Every string Coach can produce is one of these. The voice verifier tags each
template with its kind and checks the rules for that kind.

| Kind | What it is | Allowed for | Example |
|---|---|---|---|
| **T1 Readout** | A number from your log, with its denominator or count | Everything | "You've logged 40 g of carbs so far today. On training days you usually have about 120 g by 2 pm (median of 11 days)." |
| **T2 Your-data link** | A pre-registered comparison of two groups of your own days, both sides ≥ 8, descriptive only | Fuel ↔ performance, timing ↔ performance, rest ↔ performance | "On your 9 bench sessions with food logged beforehand, the top set's estimated max had a median of 262; on the other 10, 255." |
| **T3 Training default** | A common sports-science starting point, labelled as one, used only until your own number replaces it | Training structure only: rep ranges, set counts, load steps, lighter-week structure, layoff re-entry | "A common starting point for building muscle is 10 or more hard sets per muscle a week. Coach will learn yours." |
| **T4 Target** | A training prescription built from T1 (plus T3 while learning) | Weights, reps, sets, rest-or-train | "Target: 3 × 8 at 190 lb. Every set reached 12 at 185 lb last time, the top of your 8–12." |

**Never, in any kind:** a population norm about the body (healthy weight, body
fat, BMI, a "safe" rate of loss), a food or eating instruction, a supplement, a
causal claim ("because you ate…"), medical or injury advice, a comparison with
anyone else.

### 2.3 Three confidence stages

Every personal baseline carries a stage, and the stage decides both what Coach
may do and how it sounds.

| Stage | Meaning | What Coach does | How it sounds |
|---|---|---|---|
| `none` | Below the minimum sample | Uses a T3 default if the thing is training structure; otherwise says nothing | "Coach doesn't know your normal here yet." |
| `learning` | Minimum reached, not yet full | Uses your number, still shows the count | "…still learning (4 sessions so far)." |
| `yours` | Full sample | Uses your number, and the count sits in the *why* | No qualifier |

**Blending rule.** A decision may blend your number with a default (for
example, an early volume band). A **printed** number is never a blend. It is
either your number with its count, or the default with its label. A blended
number is a number nobody logged and nobody chose.

### 2.4 The shape of every answer

```
{ text,          // one sentence, the claim
  why: [ ... ],  // the facts behind it, each with its number and count
  stage,         // none | learning | yours, the weakest stage of anything it used
  unseen: [...], // what Coach could not see that bears on this answer (may be empty)
  followups }
```

`unseen` is rendered as one quiet line, "Coach can't see sleep, stress or
soreness," only on answers where those things plausibly matter: readiness,
"why did today feel off", rest days, plateau calls. It is not boilerplate on
every bubble. On the tenth repetition it would be noise, and noise is how a
disclaimer stops being read.

---

## 3. ENGINE A — PROGRESSION: "what weight and reps next?"

The core decision, per exercise: given every past exposure to this lift, the
goal's dials and the energy context, what is the target for next time? The
answer is one of eight **modes**, and every mode has a sentence and a reason.

| Mode | When | Target it sets |
|---|---|---|
| `add` | Every top set reached the top of the range (confirmed if the dials require it) | Load + your step, reps back to the bottom of the range |
| `reps` | Inside the range, not at the top | Same load, one more rep on the weakest sets |
| `hold` | First session below the range, or a top hit that still needs confirming, or back after 15–21 days | Same load, same or bottom-of-range reps |
| `reduce` | Two sessions in a row below the range at the same load | A lighter load you've logged, reps at the bottom of the range |
| `reenter` | Back after more than 21 days | A lighter load you've logged, chosen by how long you were away |
| `first` | No history on this lift | No load. Reps only, and "first session calibrates" |
| `bodyweight` | Every working set at load 0 | Reps only |
| `defer` | The sets don't carry a safe answer (shape changed, erratic, a single, a lone heavy top set) | No numbers. Last time is quoted instead |

### 3.1 Vocabulary (all computable from a session record)

- **Exposure**: one session's entry for an `exId`, after
  `mergeSessionExercises` (one entry per exId per session, sets in order).
- **Working set**: `type !== 'W'` and `r ≥ 1`. The record only keeps ticked
  sets with reps, so "done" is already true.
- **Load, in your unit**: `Lu = wOut(parseFloat(w) || 0, u)`, rounded to 0.01.
  All comparisons happen in the display unit, because that is the unit the
  plates are in. Storage stays pounds.
- **Top load `T`**: the heaviest `Lu` among working sets that are not `D`
  (for an assisted lift, the lightest: least assistance is the hardest set).
- **Top sets**: working, non-`D` sets with `Lu ≥ T − 0.01`. `k` is how many.
- **Scheme**: `straight` when `k ≥ 2`; `top` when `k = 1` (a top set with
  back-offs, or a ramp to one heavy set); `bw` when every working set has
  `Lu = 0`.
- **Drop sets (`D`)** count toward volume and never toward progression. A drop
  set is lighter by definition.
- **Unmarked warm-ups** are handled for free. A light `N` set before the top
  sets isn't a top set, so it never enters the decision.

### 3.2 Gates, in order (first match wins)

1. **Cardio** (`equipment === 'cardio'`): no target, ever.
2. **No exposure with a working set** → `first`.
3. **Bodyweight** (last exposure is `bw`, or equipment is `bodyweight` with all
   loads 0) → `bodyweight` (§3.7), which has its own layoff rule.
4. **Heavy** — checked *before* the layoff gate, so an old single can never come
   back as a target or step down into a heavy re-entry:
   - Any top set is a **single** → `defer('heavy')`. Singles never get a target.
   - Scheme is `top` and the top set is **≤ 3 reps** → `defer('heavy')`. A lone
     heavy double or triple is max-adjacent, and without an effort rating Coach
     can't call the next one. §0 #10.
5. **Time off: two clocks** (decided 23 Sep, §14 #4). The **muscle group's**
   clock decides how far back to start; the **lift's own** clock only holds it.
   `g` = days since this lift; `gg` = days since any working set of the lift's
   primary group (so `gg ≤ g`).
   - `gg > 30` → `reenter` at **≤ 80%** of the last top load.
   - `15 ≤ gg ≤ 30` → `reenter` at **≤ 90%**.
   - `g ≥ 12` (and the group has been trained more recently) → `hold` at the
     last top load, last reps. No jump the first time back on that lift, and no
     step down either, because the muscle has kept working (squat after weeks of
     leg press).
   - *Why two clocks:* strength fades when the **muscle** stops training, so the
     group decides the drop. But the specific lift's groove fades on its own, so
     a lift you haven't touched still gets one cautious session.
   - *Why these numbers:* Micah chose the cautious end. The detraining evidence
     is thin (a 2022 systematic review found too few studies for a firm
     timeline), so these lean safe on purpose.
6. **Shape**:
   - The last two exposures have different schemes (`straight` vs `top`) →
     `defer('shape')`. *Why:* a 3×8 and a top single aren't the same kind of
     session, and comparing them produces nonsense.
   - The top load moved more than **15%** from the previous exposure, with no
     layoff between them → `defer('shape')`. *Why:* that's a new programme, and
     one session of it is no basis for a target.
   - Top-set reps differ by **6 or more** (12, 5, 11) → `defer('erratic')`.
     *Why:* a spread that wide is a logging slip or a set that went badly for a
     reason Coach can't see. Either way it's no basis for a number.

**Three more guards on any number the decision below produces:**

- **Off-grid last load.** If the last top load isn't on the 0.5 grid in your
  unit (a kilo account whose last session was typed in pounds), no number is
  derived from it: "the next setting up", "same weight as last time".
- **Assisted lifts** name no number on `reduce` or `reenter` ("a little more
  assistance than last time"). Both search for a *lighter* load, which on an
  assisted lift means less help, the wrong way round.
- **A target with no number keeps last time's weight as the grey ghost.**
  Ticking a set adopts the ghost, and an empty weight box is recorded as a 0-lb
  set, which on a loaded lift would be a wrong number in the log itself.

### 3.3 The rep range

Nobody stores a rep range, so Coach infers one, and it infers it from **where
you actually move up**, not from recent reps. *Why:* a range built from recent
reps is pulled down by the very session it's meant to judge. A bad day at 6 reps
would make 6 "your range" and the miss would never be called.

**The regime.** The exposures in the last 84 days after the most recent change
in top load of more than 15% between consecutive exposures (a change of
programme; a change across a layoff of more than 21 days doesn't count),
**excluding the last exposure**, which is the one being judged.

**Increase pairs.** Consecutive exposures `(a, b)` in the regime where the top
load went up. Each pair gives two samples: `hiSample = min(R_a)` (the reps every
set reached before you moved up) and `loSample = min(R_b)` (where the new weight
started).

1. **Learned range** (≥ 2 increase pairs): `hi = round(median(hiSamples))`,
   `lo = round(median(loSamples))`. If `hi === lo`, the scheme is **fixed-rep,
   load-only** (3×5, 5×5: linear progression, progressing on load alone). Stage
   `learning` at 2–3 pairs, `yours` at 4 or more.
2. **Fixed by repetition** (fewer than 2 pairs, ≥ 3 regime exposures): in at
   least 3 of the last 4, every top set has the same rep count `R`, the same
   each time → fixed `R`. Stage `learning`.
3. **Default band** (otherwise), by aim and load type:

   | Aim | Compound | Isolation | Why |
   |---|---|---|---|
   | Get stronger | 3–6 | 8–12 | Heavier loads favour strength; accessories stay moderate |
   | Build muscle | 6–10 | 10–15 | Growth is similar across a wide range when sets are hard; these ranges keep loads practical |
   | Lose fat, keep strength | 5–8 | 10–15 | Keep a heavy stimulus through a cut |
   | Recomp / Stay consistent / no goal | 6–10 | 10–15 | Middle of the road |
   | Custom exercise (no tag) | compound low – isolation high (e.g. 6–15) | | A wide band, so the default doesn't fight what you already do |

   Used **only** if every top set of the last exposure is within `[lo, hi + 2]`.
   Otherwise → `defer('range')`.

**Coach never calls a miss against a range you didn't show it.** With a default
band, a set below `lo` means `defer('range')`, never `hold('miss')` or
`reduce`. *Why:* someone doing 3×5 with no goal set isn't "missing" a 6–10 band
they never chose, and reducing their weight for it would be a wrong number
about a choice that was theirs.

### 3.4 The load step

The most important number in the engine, because it is what makes a target
loadable.

**Observed step.** Walk the exposures oldest to newest. Collect each change in
top load `T` between consecutive exposures, keeping only loads that are **on
the grid**: within 0.01 of a multiple of 0.5 in your display unit. That keeps
out the old pound-typed loads of someone who switched to kilos (225 lb = 102.06
kg is not a kilo load anyone typed; and 0.5 rather than 0.25, because 210 lb =
95.254 kg would slip through a finer grid). The step is the **smallest positive change that occurs at least
twice**, ignoring any change larger than 15% of the current top load (that's a
change of programme, not a jump). Needs 2 occurrences, so it's never learned
from one jump.

**Default step**, when there's no observed one:

| Equipment | lb | kg | Why |
|---|---|---|---|
| Barbell, lower body (group `legs`, or pattern `squat`/`hinge`/`lunge`) | 10 | 5 | NSCA's increments for less-trained lifters: lower body 5–10 lb |
| Barbell, everything else | 5 | 2.5 | NSCA: upper body 2–5 lb; 5 lb is the smallest jump with standard 2.5-lb plates |
| Dumbbell | 5 | **none** | Pound racks go in 5s. Kilo racks go in 2 or 2.5 depending on the gym, so a guess could be a dumbbell that isn't there |
| Machine, cable, plate-loaded, kettlebell, band, custom (non-barbell) | **none** | **none** | Stacks and pins vary too much to guess |

With no step, `add` and `reduce` still happen, but the target reads **"the next
setting up"** or **"one setting lighter"** and no number is printed or put in a
box.

**Relative size.** When the range is a default band and `S / T > 10%` (5 lb on
a 20-lb raise is 25%), the top of the range moves up by 2 before a load
increase: `hi_eff = hi + 2`. *Why:* typical relative jumps are 2.5–10%. A coarse
jump on a light lift needs the extra reps banked or the next session falls off
the bottom. A **learned** range already encodes when you move up on that lift,
so it's left alone.

### 3.5 The decision

On the last exposure's top sets, reps `R₁…R_k`, with `anyF` true if any top set
is typed F:

```
hitTop  = every Rᵢ ≥ hi_eff            (for fixed-rep: every Rᵢ ≥ R)
inRange = min Rᵢ ≥ lo

if hitTop:
    need = dials.confirm                     # 1 or 2, §8
    if energy === 'deep': need = 2
    if the top set is a double or triple (straight 3×3 style): need = 2
    confirmed = need === 1
                or (previous exposure at the same T also hitTop)
    if not confirmed → hold('confirm'): same load, match last reps
    steps = 1
    if dials.maxSteps ≥ 2 and lower-body barbell and not anyF
       and every Rᵢ ≥ hi_eff + 2 and energy ∉ {deep, deficit}: steps = 2
    load  = T + direction × steps × S         (or "next setting up" if no S)
    reps  = fixed ? R : lo
    → add

elif inRange:
    load = T
    reps: start from each Rᵢ; the weakest ⌈k/2⌉ sets (lowest reps, earliest
          first on a tie) get +1, capped at hi_eff. A set typed F keeps its reps.
    → reps

else (below the range):
    if the previous exposure was at the same T and also below the range:
        load = the heaviest top load you've logged below T that is ≥ T − 2S
               (≥ 0.85·T if there is no S); failing that, T − S; failing
               that, "one setting lighter"
        reps = lo
        → reduce
    else:
        load = T, reps = lo → hold('miss')
```

**Why each branch is shaped the way it is:**

- *One confirmation by default, two in a cut or a deep deficit.* Classic double
  progression adds weight after one session at the top. NSCA's "2-for-2 rule"
  waits for two. Two costs a week and buys certainty, which is worth it exactly
  when recovery is squeezed.
- *Reps go back to the bottom after a jump.* That's what double progression
  means. The range is climbed again at the new load.
- *Only the weakest half of the sets gets +1.* +1 on every set every session is
  an ambitious 3-rep jump. +1 on the weakest keeps the jump honest and still
  closes on the top in a few sessions.
- *F keeps its reps and never gets two steps.* F means there was nothing left.
  Asking for more from that set, or a double jump after it, is exactly the push
  the brief rules out.
- *A miss gets one more chance before a reduction.* One bad session is noise
  (sleep, stress, all the things Coach can't see). Two at the same load is a
  pattern.
- *A reduction goes to a load you've logged.* Same rule as everywhere: no
  percentages, no invented plates.

**Assisted lifts** (`assisted-pull-up`, or a custom whose name matches
`/assist/i`) run with `direction = −1`: progress means *less* assistance. A
target at or below 0 becomes "unassisted", and the read switches to the
`bodyweight` path next time.

**Top-set schemes** (`k = 1`, with more than 3 reps) run the same decision on
the one top set. Back-off sets keep last time's numbers as their targets. *Why:*
the top set carries the progression; back-offs follow it. Coach doesn't
prescribe back-off percentages, for the same reason it doesn't prescribe any
percentage.

### 3.6 Re-entry after a layoff

```
reenter(f):   f = 0.90 when the group has been off 15–30 days, 0.80 past 30
  load = the heaviest top load in your history of this lift (round in your
         unit) that is ≤ f × last T
  else if S known: T − n·S for the smallest n ≤ 6 that lands ≤ f × T
  else: no number — "start lighter than last time (your last top set was X)"
  reps = lo
```

Re-entry is the one place a target may sit more than two of your steps from
your last top load, and only downward. On a re-entry or a reduction, no back-off
set's ghost may be heavier than the new top target.

*Why this and not "90% of last time":* the builder already refuses a percentage
after a layoff (v45 "the layoff step-down is a refusal, not a percentage"). This
keeps that promise and still gives a real number: a weight you've actually had
on the bar. After a re-entry, the climb back is **one jump at a time**, by the
normal rules (Micah's call, §14 #4). Strength does often come back faster than
it was first built, but he chose the cautious end, and a slower climb back is
never a wrong number.

### 3.7 Bodyweight movements

Push-ups, pull-ups, dips and the rest progress by reps, with no range needed.

- **Target**: +1 on the weakest ⌈k/2⌉ sets (lowest reps, earliest first on a
  tie), no cap.
- **A drop of 2+ reps** on any set against the same set of the previous
  exposure → `hold` at the previous exposure's reps.
- **Back after a layoff**, on the same two clocks as §3.2: lift off 12+ days →
  last reps; group off 15–30 days → each set's reps × 0.9; over 30 → × 0.8
  (rounded, at least 1). Reps are counts, not loads, so
  a fraction of them isn't an invented plate.
- **Past 30 reps a set** → a T3 line: "Past 30 a set, most people add load or
  move to a harder version." No number, no named exercise.
- **Weighted variants** (`weighted-pull-up`, or any set with `w > 0` on a
  bodyweight lift) aren't bodyweight for this purpose: they progress on the added
  load by the normal rules, with the step learned from your own jumps. With no
  step: no number.

### 3.8 How close you are to a ceiling

Coach reads your rate of progress on each lift from your own log instead of
asking for your training age.

- **e1RM series**: per exposure, the best `e1rm(w, r)` over working non-D sets
  with **r ≤ 12** (Epley, the same function the set row prints). Rep counts above
  12 are left out of the series. *Why:* rep-based max estimates get less reliable
  as reps climb, and a 20-rep set's "estimated max" is the least reliable number
  in the app.
- **Slope**: Theil–Sen median of pairwise slopes over the last 8 exposures
  within 12 weeks, restarting after any gap of more than 21 days (a layoff's
  drop isn't slow progress), as % per week. *Why Theil–Sen:* one great day or one bad day
  doesn't bend it the way a least-squares line bends.
- **Dial**: slope < **0.25%/week** over ≥ 8 exposures (slow and steady,
  intermediate-and-beyond) → `confirm = 2`. Slope ≥ **1%/week** and experience
  isn't `new` → `maxSteps` may be 2 (lower-body barbell only, with the surplus
  rule). *Why:* close to a ceiling, session noise is as big as a week's progress,
  and a confirmation filters the false "you're ready" signals.

### 3.9 Status: progressing, holding, stalled, declining

Computed in S1 (it drives the confirmation dial and the battery). **Shown** only
from S2, next to the context that interprets it (§5), because a stall readout
without context is the "stop accusing" defect v43 fixed.

- **Personal noise σ**: median absolute exposure-to-exposure % change in the
  e1RM series, over the last 10 (needs 5; default 3%).
- **Window**: the last 8 exposures within 12 weeks, restarting after any gap of
  more than 21 days. Needs ≥ 4 exposures spanning ≥ 21 days, or the status is
  `holding` (too soon to say).
- `progressing`: a new best (+1% over every earlier exposure in the window)
  within the last 3, or slope ≥ +0.25%/week.
- `declining`: median of the last 3 is below the median of the 3 before by more
  than **max(5%, 1.5σ)**.
- `stalled`: neither, and no new best in the last 4 exposures spanning ≥ 21 days.
- `holding`: everything else.

*Why both an exposure count and a time span:* someone benching three times a
week gets four exposures in nine days, and nine days is no time to call a
plateau.

*Why 5% or 1.5σ:* session-to-session e1RM moves a few percent on its own. The
threshold has to clear your own noise, not a population's.

### 3.10 Mid-session (S5, recorded here so the rules live in one place)

- Before the first working set of a lift: the session's target from §3.5.
- After a set, straight scheme only:
  - reps ≥ target + 2 at the target load, no F so far on this lift → next set
    may go **one** step up, **once** per lift per session;
  - reps < `lo` → next set same load, or one step down if that load is one
    you've logged;
  - any **F**, or a rep drop of 25%+ from the first working set at the same or a
    lighter load → **no heavier set, ever, on this lift today**. The only
    answers are "same weight" or "that's probably the set" (this reuses
    `coach-live.js`'s `REP_DROP`, not a second copy of it).
- The in-gym fence in `coach-live.mjs` ("a number to put on the bar" must be a
  quote) is **replaced, not deleted**. The new fence: every number is a quote or
  a `coach-prog.js` target, and no target follows an F.

### 3.11 Edge cases

| Case | Handling |
|---|---|
| Same lift twice in one session (duplicated block) | Merged first. One exposure, sets concatenated (the house invariant) |
| Two sessions in one day with the same lift | Two exposures, ordered by `startedAt`. The later one is "last" |
| Hand-added exercise with no history | `first` |
| A swapped-in exercise in a builder proposal | `first` if never logged, otherwise its own history |
| Hidden exercise | Still has history and still gets a target if it appears (the builder never proposes it) |
| Renamed or refiled built-in | Same id, same history. Group comes from the merged library |
| Deleted custom | Its record's own fields. Targets only appear where the lift appears |
| kg account, loads typed in lb before switching | Old loads aren't "round in kg", so they don't teach the step and aren't picked as re-entry or reduce loads |
| Unilateral dumbbell work | `w` is per hand, as logged. Nothing converts it |
| A PR set logged as F | F rules apply. It counts toward `hitTop`, never gets two steps |
| Deload weeks you took | Lighter exposures inside a detected light week (§6.4) are skipped when finding "the previous exposure at the same T" |
| Edit of a past session | Targets read the saved log. The editor never shows targets |

---

## 4. ENGINE B — FUELING AND READINESS

### 4.0 The stance

The research sets the ceiling on what this engine may claim:

- In a fed state, carbohydrate intake has little measurable effect on strength
  or resistance-training performance in sessions up to about **10 sets per
  muscle group**. Benefits show up mainly when training **fasted**, in **higher
  volume** sessions, or across **two sessions a day** (Henselmans et al. 2022,
  49 studies).
- An energy deficit impairs **lean-mass** gains (a deficit of about 500 kcal a
  day prevented them in the meta-regression) but did not significantly impair
  **strength** gains on average (Murphy & Koehler 2022).
- Slower weight loss preserves strength and lean mass better than faster loss:
  0.7% of bodyweight a week beat 1.4% in elite athletes (Garthe et al. 2011).

So the fueling brain is built as **"off your normal, and whether that has
mattered for you"**, not "you are under-fueled." It has three jobs: report how
today's and this week's logged intake differs from your own normal (T1); say
whether your own log shows that difference going with better or worse sessions
(T2, pre-registered, n ≥ 8 each side); and hand the energy context to the
progression and overlap engines, where the evidence is strongest.

It never says what to eat, never suggests eating less, never praises a low day,
and never uses the word "carb-loaded" as a physiological claim (§14 #11).

### 4.1 Which food days count

**Complete day**: `daySummaries[d].cal ≥ 50%` of the median `cal` over the last
28 days that have `cal > 0`. Needs ≥ 5 such days before completeness can be
judged. Before that the fueling brain is at stage `none` and says so.

*Why:* a half-logged day would pull every average down and make Coach call
someone under-fed when they were under-*logged*. The cost is that a real very-low
day is excluded as "partial". That trade is deliberate: Coach can't tell the two
apart, and a Coach that scorekeeps low days is a restriction tracker, which Rack
must never become.

**Today** is never "complete". It is always "so far".

### 4.2 Logging style: real-time or batch

Per complete day with ≥ 2 entries: **real-time** if the spread of entry `t`
values is ≥ 4 hours; **batch** if every entry is within 60 minutes. Account
level: if ≥ 50% of the last 12 complete days are batch → **batch logger**.

For a batch logger, every time-of-day read stands down: "so far today",
pre-session intake, hours since last meal. Day totals still work. Coach asks
**once** to confirm (`q_log_timing`: "Do you usually log food as you eat, or
later?"). The answer is durable, because it's a preference, not a daily state.

*Why:* `t` is when an entry was logged. For someone who logs dinner at 10 pm,
"nothing logged before your 5 pm session" is a false sentence.

### 4.3 The baselines this engine keeps (all recomputed per open)

| Baseline | How | Minimum (learning / yours) | Why that minimum |
|---|---|---|---|
| Daily kcal, protein, carbs, fat | Median over complete days, last 28, within the current phase (§7.3) | 7 / 21 days | A week covers weekday/weekend swing; three cover a cycle of habits |
| By-hour curve on training days | For each complete real-time training day in the last 28: cumulative kcal/carbs/protein logged by each clock hour; median per hour | 8 / 14 days | Same bar as Patterns (`PATTERN_MIN = 8`) |
| Pre-session intake | kcal and carbs logged between local midnight and `startedAt`, plus hours since the last entry before it | 8 / 14 sessions | Same |
| 48-hour carbs | Sum of carbs over the two complete days before the session day | 7 / 21 days | Carb stores refill over roughly a day or two, so 48 h is the window worth comparing |
| Coverage | Share of the last 28 days that are complete | always | It's a count |

### 4.4 "Am I fueled to train?" (pre-workout)

Needs: food logging stage ≥ `learning`, not a batch logger.

```
today_so_far = sum of today's entries with t ≤ now
usual_now    = by-hour curve at the current hour (training days)

nothing logged today      → ask q_ate_today (ephemeral, §10.3)
today_so_far < 70% of usual_now and below its 25th percentile → "lighter than usual"
today_so_far > 130% of usual_now and above its 75th percentile → "heavier than usual"
otherwise                                                  → "about usual"
```

Plus, each only if it has data:

- **Yesterday**: complete and below its 25th percentile → "yesterday was on the
  light side". Incomplete → "yesterday wasn't fully logged". Never "yesterday
  was low".
- **Energy context** (§5.1): "you're in a cut, losing about 1.2 lb a week".
- **48-hour carbs**: ±20% of your median → "lower-carb / higher-carb than your
  usual two days."
- **Your own link, if one exists** (T2, from the Patterns machinery): "On your
  sessions with 100 g or more of carbs logged beforehand, top bench had a median
  of 262 across 9; on the other 10, 255."

**Answer shape:**

> **About usual.** You've logged 1,150 kcal and 140 g of carbs so far today;
> by this time on training days you usually have about 1,200 and 130 (median of
> 12 days).
> *Why:* by-hour curve, 12 training days · yesterday complete, in your normal
> range · you're losing about 1.1 lb a week, in line with your goal.
> Coach reads what's logged, going by when you logged it.

There is **no verdict word stronger than "lighter than usual"**, and no
instruction after it. If his own log has a T2 link, that link *is* the
consequence, and Coach shows it with its counts. If there isn't one, Coach says
"your log doesn't show that lighter days go with lighter sessions — yet" once
the comparison has enough days to have been checked.

### 4.5 Readiness (pre-workout)

Not a score. A 0–100 readiness number would be fake precision assembled from
things Coach half-sees. It's a list of what's off your normal, from the
components that have data, with a plain summary.

| # | Component | Off-normal when | Needs |
|---|---|---|---|
| 1 | Days since the group you'd train | Below the 25th percentile of your own gaps for that group | `group.medianGap` (exists) |
| 2 | Consecutive training days | ≥ your 90th-percentile streak + 1 | 8 weeks of sessions |
| 3 | Hard sets in the last 7 days | ≥ 1.3× your weekly median | 4 weeks |
| 4 | Sets typed F in the last 7 days | ≥ 2× your 8-week weekly share, and ≥ 3 sets | 8 weeks |
| 5 | Last exposure of today's main lifts | Two lifts `declining`, or two below their target last time | S2 status |
| 6 | Fuel today and yesterday | §4.4 says "lighter than usual" | food stage ≥ learning |
| 7 | Energy context | `deep` (§5.1) | weight trend |
| 8 | Today's weigh-in vs trend | More than 1.5% below trend | a weigh-in today |
| 9 | Time of day | Outside your 10th–90th percentile start hour | 12 sessions |

"Off normal" for anything continuous uses a robust z-score, `(x − median) /
(1.4826 × MAD)`, flagged at **|z| ≥ 1.5**, and only when that baseline is at
least `learning`. *Why robust:* a holiday dinner or a double session shouldn't
move your normal.

**Summary**, from the number of flags among components that have data:

- 0 → "Nothing in your log is off your normal today."
- 1–2 → "Two things are different today: …" (listed, each with its number).
- 3 or more, or #2 and #4 together → "Several things in your log point to a
  lighter day," and it offers the lighter option (§5.3) without insisting.
- Fewer than 3 components with data → "Not enough in your log to say much."

Always with the unseen line: sleep, stress and soreness are the biggest
readiness factors and Coach sees none of them. Coach doesn't hide that.

Component 8 gets its own bracket: "A drop that size is usually water, which
Coach can't see." That's one T3 sentence, and the only one this engine uses.

### 4.6 "Why did today feel off?" / "Why did it go so well?" (post-workout)

One bubble, "How did today compare?", because asking only "why was it bad"
primes a story.

**Step 1 — measure the session.** For each lift with ≥ 3 prior exposures:
`delta = (today's e1RM best − median of the last 3) / median`, in units of that
lift's σ. If Coach's targets were used, also report hit or miss for each lift:
"4 of 5 targets met." Session outcome, needing ≥ 2 qualifying lifts:
**above** if most lifts are ≥ +1σ, **below** if most are ≤ −1σ, otherwise
**about usual**. With only one qualifying lift it speaks per lift.

If you felt off but the numbers were usual, it says so, kindly: "By the
numbers it was a normal day: bench and rows landed inside your usual range."

**Step 2 — list what was different about the day**, not what caused it. Every
readiness component (§4.5), computed as of `startedAt`, plus hours since the
last logged entry and session duration against your median. Rank by |z|, keep
the top 3 with |z| ≥ 1.5, **in either direction**, whether or not the direction
flatters the outcome.

*Why both directions:* reporting only the deviations that fit the result is
exactly how an attribution becomes a false causal story. If today was great
*and* you'd logged less than usual, Coach shows that too.

**Step 3 — link, only where your log has one.** If a pre-registered comparison
(n ≥ 8 each side) exists for a listed component, show it with both counts.
Otherwise, nothing.

**Step 4 — bracket and ask.** Always: "These are differences, not causes."
When the session came in **below** usual → one question: "Anything Coach can't
see?" (*Slept badly · Stressed · Sore · Didn't feel well · Nothing*). Decided 23
Sep (§14 #9): any answer but *Nothing* **marks that session** with the reason.
A marked session never counts as a miss toward a reduction, never counts toward
a `declining` status, and never drags down a baseline. Once there are 8 or more
marks of one kind, Coach can compare them with his unmarked sessions, with both
counts (T2). "Didn't feel well" also gets "Rest is always an option. Coach
doesn't do health, so it'll leave it there," and nothing more.

### 4.7 The reads this engine needs (the one real cost)

- **Today's `food/log/{today}`** — once per app open, re-read on the food
  screen's existing change hook (`noteCoachData`). Pro, fuel category on.
- **Up to 14 past training days' `food/log/{date}`** — **lazily**, the first
  time a fuel or attribution question is asked in an app open; only days whose
  summary is complete; cached in `coach-data.js` memory for that open. The same
  pattern `loadPatternFood()` uses today.
- Nothing per paint. Nothing for Basic accounts. Nothing when fuel is muted.

### 4.8 Standing down

| Situation | What the fueling brain does |
|---|---|
| Fewer than 5 food days ever | Fuel bubbles still show. The answer is "Coach reads fuel from your food log, and there isn't enough in it yet (N days)." Once. It never nags. |
| Batch logger | Day totals only. Time-of-day reads are off, and it says why once |
| Food muted in Settings | No fuel reads, no fuel lines anywhere, including in readiness and attribution |
| No targets set | Readouts compare to your own medians only. The existing `fuel_no_targets_set` guard still owns target comparisons |
| Maintenance model not ready | Energy context comes from the weight trend alone, with `learning` stage |

---

## 5. ENGINE C — THE OVERLAP (the part only Rack can do)

### 5.1 Energy context: the bridge between the two halves

One fact, computed from the weight trend Rack already measures, with intake as a
cross-check once the fueling brain exists.

```
pct = weight.rateWk / weight.latestLb × 100          (% of bodyweight per week)
needs: a finite rate over ≥ 14 days of weigh-ins

pct ≤ −0.75             → 'deep'      a hard cut
−0.75 < pct ≤ −0.25     → 'deficit'
−0.25 < pct < +0.25     → 'hold'
pct ≥ +0.25             → 'surplus'
no rate                 → null        (every rule that reads it treats null as "don't know")
```

*Why a percentage and not pounds:* 1 lb a week is aggressive for a 130-lb
lifter and gentle for a 260-lb one. *Why 0.75%:* the slow-loss group in Garthe
2011 (0.7%/week) kept and gained strength, and the fast group (1.4%) did worse.
0.75% sits at the top of the slower band. Past it, recovery is squeezed enough to
change how Coach progresses you. *Why 0.25%:* inside that, a week's trend is
mostly scale noise. **Taste**, §14 #10.

**Cross-check (S4).** When the maintenance model is `model: true` and there are
≥ 7 complete food days: `measured_deficit = maint − median intake`. If trend and
intake disagree on the sign (trend says cutting, intake says surplus), **the
weight trend wins**, because it's measured and logging gaps aren't. Coach says so
once: "Your weight is coming down even though your logged food is above
maintenance, which usually means some food isn't logged." That's a T1 readout
of two numbers, no accusation.

**Phase length**: consecutive weeks the context has held `deficit` or `deep`
(weekly, from the trend). Used by §5.3 and §8.4.

### 5.2 Fuel-aware progression: when the two halves disagree

Every conflict resolves toward the **conservative** action, and the answer names
the disagreement instead of hiding it.

| Progression says | Fuel / body says | Coach does | Says |
|---|---|---|---|
| `add` | `deep` deficit | Needs two sessions at the top before adding (`confirm = 2`); one step only | "Every set reached 8 at 225 lb. You're losing about 1.8 lb a week, so Coach wants to see 8s twice before adding weight." |
| `add` | `deficit` and aim is *lose fat* | Same: confirm twice (the aim's dial) | Same shape |
| `add` | Readiness shows 3+ flags today (S4) | Target stays; adds a fallback: "if the first set moves slow, stay at 225" | Names the flags |
| `add` | Nothing logged today, and he answered "haven't eaten" | Target stays (fasted lifting has little effect on strength in the research); no fuel claim | "Noted. Coach reads what's logged." |
| `reps` / `hold` | anything | Unchanged. Holding the target isn't made easier or harder by fuel | Fuel context shown only if asked |
| `stalled` / `declining` | `deficit` / `deep` | §5.3 decides: expected dip or real slide | — |
| PR day candidate | `deep` | No PR prompt (§5.5) | — |
| Rest day (§9.2) | Any "add" target | Rest wins; the targets wait | "Your targets will be here tomorrow." |

*Why fuel doesn't cancel a target outright:* the research says acute carbs
matter little for strength work. Letting a light lunch cancel a load increase
would be a stronger claim than the evidence allows. Energy balance over weeks is
where the evidence is, and that's where fuel changes the rule.

### 5.3 Plateau vs expected dip (the signature call)

Input, over the lift's status window `W` (§3.9, ≥ 4 exposures, ≥ 21 days):

- `status` (progressing / holding / stalled / declining)
- `ctx` = energy context over `W` (the weekly trend averaged over the window)
- **relative strength**: `rs = e1RM / trend bodyweight`. Change from the median
  of the first 2 exposures in `W` to the median of the last 2.
- **regularity**: exposures per week of this lift in `W`, against its 12-week
  normal.
- **fatigue**: F share and weekly hard sets in `W` against normal.
- the aim.

Decide, first match wins:

| # | Condition | Call | Coach says (shape) |
|---|---|---|---|
| 0 | `status` is `progressing` or `holding` | nothing to explain | (no plateau talk) |
| 1 | Regularity < 60% of normal | **Not a plateau** | "Bench is flat, and you've benched 3 times in 5 weeks against your usual 2 a week." |
| 2 | Weekly hard sets ≥ 1.3× normal, **or** F share ≥ 2× normal | **Fatigue-shaped stall** | "Flat for 4 weeks while your chest sets ran 40% over your usual." → a lighter week (§5.4) |
| 3 | `ctx ∈ {deficit, deep}` and `rs` change ≥ −1% | **Expected — holding strength through a cut** | "Your estimated max is flat, but per pound of bodyweight it's up 3%. In a cut, that's holding." |
| 4 | `ctx ∈ {deficit, deep}`, absolute drop ≤ 5%, phase ≥ 4 weeks | **Expected small slide** | "Down 3% over 6 weeks of cutting, a small slide. Coach will say if it speeds up." |
| 5 | `ctx ∈ {deficit, deep}`, absolute drop > 5% or `rs` falling > 3% | **Sliding faster than the cut explains** | Options, not orders: your rate against your own goal rate (T1), your volume against normal, a lighter week. Never "eat more" |
| 6 | `ctx ∈ {hold, surplus}` and `stalled`/`declining`, regular | **Real plateau** → ladder §5.4 | "Flat for 5 weeks at steady bodyweight, training it twice a week. That's a real plateau." |
| 7 | `ctx` is null | **Can't separate** | Status and numbers only: "Coach can't tell whether a cut is part of this without weigh-ins." |

How the aim changes the reading (from §8):

- *Lose fat*: rows 3–4 are **success**, and the tone says so ("holding is the
  win").
- *Build muscle / Get stronger / Recomp* with rows 3–5: the call is still made,
  **and** the goal-contradiction check (§8.4) gets a turn: "You set *build
  muscle*, and your weight has been coming down for 4 weeks. Did the goal
  change?"
- *Stay consistent*: rows 3, 4 and 6 read as "holding steady", which is a win
  for this aim.

*Why relative strength is the right test:* force per pound is what a cut is
supposed to protect. A lifter whose e1RM drops 2% while bodyweight drops 4% has
gained relative strength. Calling that a plateau would be a wrong number about
the most emotionally loaded thing Coach reads.

*Why −1% and 5%:* −1% sits inside session noise for relative strength; 5% is
past the noise band used in §3.9 and into "something changed". **Taste.**

### 5.4 The stall ladder and the lighter week

**Coach keeps no memory of its advice, so the ladder rung is worked out from how
long the stall has lasted**, which is in the log:

| Weeks stalled (row 6) | Rung | Suggestion |
|---|---|---|
| 3–5 | 1 · reset | If the top load was **grinding** (reps below `lo` at it in 2 of the last 3 exposures): back to a load you've logged about 10% lighter and climb again (§3.5 `reduce`). Otherwise: "keep the targets; stalls under 5 weeks often break on their own" (T3) |
| 5–8 | 2 · volume | Weekly sets for that lift's group below both your normal and the goal band's floor → "+2 sets a week for chest" (T3 band, your count). Already at or above → rung 3 early |
| 8+ | 3 · variation | A variation from **your own history** with the same pattern and a different angle or equipment (from the tags): "You've done Incline Dumbbell Press before. A block of it is a common way through a flat stretch." Never an exercise you've never logged, never a hidden one |

**The lighter week** (reactive only; Coach doesn't plan training blocks). It's
offered when **two or more** of these hold:

1. Two or more lifts `declining` at once.
2. F share over the last 14 days ≥ 2× your 8-week normal.
3. Hard sets ≥ 1.3× normal for 2 weeks running.
4. ≥ 6 weeks since your last light week **and** (1 or 2).

What it says: "A lighter week: about half your usual sets (for you, about 7 for
chest, 8 for back…), the same weights you've been using, then back to normal."
*Why that structure:* the international Delphi consensus on deloading agreed that
volume comes down, intensity can stay, a deload usually lasts about a week, it
typically comes every 4–6 weeks, and a reactive one when fatigue shows up is
legitimate (Bell et al. 2023). The set counts are **your** normals halved,
rounded down. The loads are loads you've lifted.

**A light week Coach sees in the log** (a week with sessions whose hard sets are
≤ 60% of normal, or whose top loads are ≤ 90% of the previous week's on half or
more of the lifts) is excluded from volume normals and never counts as a decline.

### 5.5 PR timing ("today's the day")

Only when asked (a pre-workout bubble on a day that qualifies: "Good day for a
record?"), never on the card, never pushed.

All must hold:

- the lift is `progressing` with ≥ 6 exposures, **or** `lift.proximity` is true
  (one more rep at a logged load beats your best e1RM — the existing fact);
- readiness (§4.5) has **zero** flags among the components with data, and the
  lift's group is outside its recovery window;
- the last exposure of that lift had no F and no 25% rep drop;
- energy context is not `deep`;
- not the first session back after a re-entry, and not in a detected light week.

**What it proposes is a rep record at a weight you've already lifted**, never a
max attempt: the heaviest load in the last 4 weeks where one more rep than your
best at that load would set a new best e1RM, with the target at **3 reps or
more**. "Good day for 6 at 225, one more rep than your best there. Everything in
your log is at or better than normal." Plus the unseen line, because how you
slept matters more here than anywhere.

*Why rep PRs only:* a 1RM attempt is the single highest-risk set in lifting, and
Coach can't see readiness, technique or a spotter. A rep PR at a known load
carries the same signal ("stronger than before") at a fraction of the risk.

---

## 6. ENGINE D — VOLUME, FREQUENCY, FATIGUE, BALANCE

### 6.1 Counting sets

- **Hard set**: working (`type !== 'W'`), `r ≥ 1`, not cardio.
- **Obvious warm-up in disguise**: an `N` set at **≤ 50%** of that exercise's
  top load in the session, placed **before** the first top set, with reps ≤ the
  top set's reps + 2. Excluded from volume counts. *Why:* people forget to mark
  warm-ups, and a 95×5 before 225s isn't a hard set. The three conditions
  together keep a genuinely light, high-rep working set (which does count for
  growth) from being thrown out. **Taste**, verifier-fenced.
- **Fractional counting** for the new volume engine: primary group **1.0**, each
  secondary group (from `exercises.js`'s fourth field) **0.5**. Custom exercises
  have no secondaries, so primary only. *Why:* in Pelland et al. 2024's
  dose-response meta-regressions, fractional counting (indirect sets as half)
  described the data better than counting only direct sets or counting everything
  equally.
- The **shipped** `group_under_weekly_normal` keeps its primary-only count
  against your own normal. That comparison is you against you, so the method
  only has to be consistent, and changing a shipped number is a separate call.
  The new landmark bands use fractional counts, because that's how the research
  counted.

### 6.2 Weekly volume bands (per group, fractional hard sets)

| Band | Sets / week | Why |
|---|---|---|
| very low | < 4 | Below the smallest doses that reliably produce growth in the meta-analyses |
| low end | 4–9 | Works, with more left on the table |
| common range | 10–20 | Most studied, and most of the benefit (Schoenfeld 2017; Pelland 2024 finds diminishing returns rather than a ceiling) |
| high | > 20 | Can still help growth; fatigue is the price |

Goal dials move the target band (§8): muscle 10–20, strength 6–15 for the
groups carrying the main lifts, cut ≥ ⅔ of the pre-cut normal, maintain 6–12.
**Core** gets readouts only, no "too little" flag. Plenty of people never train
it directly and the evidence for a core band is thin.

**Flags** (sheet only, never the card):

- **Too little**: below the goal band's floor **and** below 70% of your own
  8-week normal, for 2 weeks. Or below the floor for 4 weeks on a group you
  named as a focus. *Why both:* someone who has always done 6 sets of arms and
  is happy isn't "behind". Someone who dropped from 12 to 5 might be.
- **About right**: inside the band, or within ±30% of your normal.
- **More than usual**: ≥ 1.3× your normal **and** a fatigue marker (§6.4).
  Volume alone is never "too much" while performance is rising.

### 6.3 Frequency and neglect

- **Frequency** per group: days with ≥ 1 hard primary set, per week, 8-week
  median. The research: frequency matters little for growth once volume is
  equal, and helps strength with diminishing returns (Pelland 2024). So Coach
  mentions frequency for the *strength* aim ("bench once a week; twice is the
  more common pattern for strength", T3) and otherwise talks about volume.
- **Neglect**: a non-core group whose 4-week fractional volume is < 30% of the
  median of the other non-core groups. Or zero in 8 weeks, mentioned **once**
  every 28 days (stamped in `asked`), never on the card. *Why the ratio:* it
  adapts to how much you train overall. Someone doing 3 sessions a week and
  someone doing 6 get the same test.
- **Overdue** stays the shipped `group_overdue` (days since vs your own median
  gap).

### 6.4 Fatigue — from what the log holds

There's no RIR, so fatigue is read from four things Rack records:

| Marker | Definition | Normal is |
|---|---|---|
| F share | Sets typed F / hard sets, last 7 or 14 days | Your 8-week share |
| Rep drop | Same exercise, same or lighter load, reps down ≥ 25% from the first working set (`REP_DROP`, already in `coach-live.js`) | Your 8-week rate of such drops per session |
| Performance run | Two or more lifts `declining`, or below their target twice | — |
| Load spike | Hard sets this week ≥ 1.3× your 4-week weekly median | — |

**RIR slot.** When the effort tap arrives, it lands as an optional `rir` on a
set (0–5, absent = unknown). Every rule above has a column waiting for it:
`hitTop` becomes "hit the top with RIR ≥ 1", the F share becomes "RIR 0 share",
singles and lone heavy top sets become targetable at RIR ≥ 2, and the rep-drop
proxy steps back. The engines read `s.rir` from day one and treat absence as
unknown. Adding the field later is a data ship (a `.validate` change for sets),
not an engine rewrite.

### 6.5 Balance and weak points

From the tags, over 8 weeks of fractional hard sets:

| Ratio | Pieces | Flag when |
|---|---|---|
| Push : pull | (press + fly + extension on chest/shoulders/arms) : (row + pulldown) | Beyond 2 : 1 either way |
| Horizontal : vertical press | press with angle flat/incline/decline : angle overhead | One side is zero for 8 weeks |
| Horizontal : vertical pull | row : pulldown | One side is zero for 8 weeks |
| Knee : hip (legs) | squat + lunge : hinge + bridge | Beyond 3 : 1 either way |

Readouts only, stated as counts: "Over 8 weeks: 64 pressing sets, 30 pulling
sets." **Never** a health reason. No "for shoulder health", no posture claims.
*Why the wide bars:* there's no strong evidence for an exact ideal ratio, so only
a lopsided split is worth saying out loud.

**Custom exercises** have no pattern, so they're left out of every ratio. The
readout says so: "12 sets on your custom exercises aren't in this split, because
Coach doesn't know their movement." If customs are more than 25% of a group's
sets, that group's ratios are skipped entirely. There's too much Coach can't
classify to call it.

**Hidden exercises** still count (hiding only affects the picker). They are
never suggested.

**A focus group** ("bring up my chest", §8.3) raises that group's target band by
30% and puts its exercises first in the builder. Its readouts rank first in the
sheet.

---

## 7. ENGINE E — THE PERSONAL BASELINE MODEL

### 7.1 Every baseline, in one table

Recomputed on every open from the log already in memory. Nothing cached, nothing
written (§0 #7).

| Baseline | Statistic | Window | Minimum: learning / yours |
|---|---|---|---|
| **Per lift**: load step | Smallest jump seen ≥ 2 times | all history | 2 jumps / 4 jumps |
| Per lift: rep range | Medians of the reps before and after each load increase (§3.3) | the regime: 84 d, since the last programme change | 2 / 4 increases |
| Per lift: e1RM level, slope, noise σ | Best per exposure, Theil–Sen slope, median absolute change | last 8 exposures in 12 wk | 4 / 8 |
| Per lift: frequency | Exposures per week | 12 wk | 4 exposures |
| **Per group**: weekly hard sets (fractional), median and 90th percentile | Weekly sums, light and layoff weeks excluded | 8 wk | 4 / 8 weeks with sessions |
| Per group: median gap, 25th-pct gap | Days between training days | 12 wk | 4 days (exists) |
| **Sessions**: per week, start hour (10th–90th pct), duration median, longest-streak 90th pct | — | 12 wk | 8 / 16 sessions |
| **Fatigue**: F share, rep-drop rate | Per week / per session | 8 wk | 8 sessions |
| **Food**: daily medians, by-hour curve, pre-session intake, 48-h carbs, coverage, logging style | §4.3 | 28 d, current phase | §4.3 |
| **Body**: trend weight, rate, maintenance | The existing weight model | exists | exists |
| **Rest tolerance** | Performance on replayed rest-flag days (§9.3) | 12 wk | 4 flagged days |

### 7.2 Robustness rules (apply to every baseline)

- **Medians and MAD, never means and SD**, for anything built from daily or
  per-session values. *Why:* one 6,000-kcal holiday or one ego-lift session
  shouldn't move "your normal".
- **Outliers**: a daily or per-session value more than 3.5 MAD from the median
  is dropped from that baseline (not from the log). Noted in the *why* when it
  mattered: "one day left out as unusual."
- **Layoff weeks** (no sessions) and **light weeks** (§5.4) are excluded from
  volume normals. **Partial food days** (§4.1) are excluded from food normals.
- **Windows restart** after a gap of more than 21 days in training. The old
  normal is kept as a prior for the `learning` stage.

### 7.3 How a cut or a bulk moves the baseline

Food baselines are **phase-aware**. A phase change is detected when the weekly
energy context (§5.1) moves between {deficit/deep}, hold and surplus and stays
moved for **14 days**, or when the goal's aim changes (§8.5). From then:

- food medians use only days since the change once there are ≥ 7 complete ones
  (stage `learning`, "still learning your new normal, 9 days in");
- until then, the previous phase's medians stand, labelled as the previous
  phase's.

Training baselines are **not** reset by a phase change. Your load step and rep
range don't change because you started cutting. The *reading* changes (§5.3),
not the baseline.

### 7.4 The confidence ramp in practice

Coach uses T3 defaults only while a baseline is `none` or `learning`, and prints
the stage every time it leans on one. It moves to your number the moment your
number reaches `learning`. It never keeps printing a default once your own
figure exists. Decisions may blend (§2.3). Printed numbers never do.

How "still learning" sounds, by stage:

- `none`: "Coach doesn't know your normal here yet. A common starting point is…"
- `learning`: "…from your first 4 sessions, so Coach is still learning this."
- `yours`: no qualifier. The count sits in the *why*.

### 7.5 Cold start: day one to week eight

| When | What Coach can honestly do |
|---|---|
| **Day 0** (onboarding done, empty log) | Knows the goal and experience answers. Card: a warm generic line (no data yet, so no data line). Sheet: what it needs ("log a couple of sessions and Coach starts setting targets"), plus the goal's T3 starting points, labelled. No numbers about the user, because there are none |
| **Session 1 of a lift** | `first`: no load, reps from the default band, "first session calibrates" |
| **Session 2 of a lift** | Targets from the default band, if your reps fit it; stage `learning`. Step from defaults (barbell and lb dumbbells) or "next setting up" |
| **Week 2–3** (6–9 sessions) | Observed rep ranges on your regular lifts; weekly volume stage `learning`; card lines about consistency ("3 sessions this week") |
| **Week 3–4** | Food medians `learning` (7+ complete days); energy context once the weight trend has 14 days |
| **Week 4–6** | Status (progressing/stalled) on lifts with 4+ exposures over 21+ days; plateau vs dip becomes possible |
| **Week 6–8+** | Most baselines `yours`; fatigue normals; the by-hour food curve; your own fuel↔performance links start to appear; rest tolerance learning begins |

The retention story is true without being oversold: the sheet can say "Coach
has 23 of your sessions to work from" and mean it.

---

## 8. ENGINE F — GOALS

### 8.1 The goal set

Six aims (decided 23 Sep: the five proposed, plus Powerlifting as its own goal), one picked at onboarding and changeable in Settings → Coach:

| Aim | For | Plain label |
|---|---|---|
| `strength` | Moving more weight | **Get stronger** |
| `powerlifting` | Squat, bench and deadlift at competition-style reps | **Powerlifting** |
| `muscle` | Size | **Build muscle** |
| `cut` | Losing fat while keeping strength | **Lose fat, keep strength** |
| `recomp` | Roughly steady weight, better body | **Recomp** |
| `maintain` | Keep training, stay where you are | **Stay consistent** |

Plus, all optional:

- **Experience**: *under 6 months / 6 months to 2 years / 2+ years*. Sets the
  default step caution and `maxSteps` (NSCA's less-trained vs more-trained
  increments). Default when unanswered: the middle.
- **A lift target**: an exercise, a weight, and reps (1–20, default 1). Stored
  in pounds like every other weight.
- **A bodyweight target**: **already exists** as `food/targets.goalLb`. Coach
  reads that one and never stores a second copy.
- **A focus group**: one of the six.

*Why these six:* each aim has to change at least one dial differently from
every other, or it's a label and not a goal. Powerlifting differs from Get
stronger in its bands from day one (3–5 on compounds, 6–10 on accessories), and
from stage three in what it tracks: pace on the big three (squat, bench,
deadlift) and their total, and PR prompts on those lifts first. "General health" was left out
as a name because Coach mustn't imply health outcomes. *Stay consistent* covers
it honestly.

### 8.2 The dials each aim turns

| Dial | Get stronger | Powerlifting | Build muscle | Lose fat, keep strength | Recomp | Stay consistent |
|---|---|---|---|---|---|---|
| Progression confirm (§3.5) | 1 | 1 | 1 | **2** | 1 | 2 |
| Max steps per jump | 2 (lower-body barbell, with surplus) | 2 (same) | 1 | 1 | 1 | 1 |
| Default rep bands | 3–6 / 8–12 | **3–5 / 6–10** | 6–10 / 10–15 | 5–8 / 10–15 | 6–10 / 10–15 | 6–10 / 10–15 |
| Weekly volume target | 6–15 on main-lift groups | 6–15 on the big three's groups | 10–20 | ≥ ⅔ of pre-cut normal | 10–20 | 6–12 |
| A falling weight reads as | contradiction check if sustained | contradiction check if sustained (unless cutting to a weight class, a later option) | contradiction check | **expected** | contradiction check if > 0.5%/wk | contradiction check if > 0.5%/wk |
| A flat e1RM reads as (§5.3) | fix it | fix it, big three first | fix it (volume first) | holding = winning, if per-pound holds | fix it, slower (6-week bar) | holding = winning |
| Fuel reads emphasise | pre-session intake on heavy days | pre-session intake on heavy days | protein vs target; surplus | deficit depth; protein vs target | protein vs target | consistency of logging |
| PR prompts (§5.5) | yes | yes, big three first (rep PRs only) | yes (rep PRs) | only outside `deep` | yes | on request only |
| Card tone (§9.4) | numbers and records | the big three and the total | consistency and volume | patience: "holding is the win" | the long game | streaks and showing up |
| No aim set | confirm 1, 1 step, recomp bands, no contradiction check, no pace | | | | |

*Why "Stay consistent" confirms twice:* someone maintaining isn't chasing
numbers, and a slower, surer progression suits them. **Taste.**

### 8.3 Specific targets and pace

**Lift target** (`exId`, `lb`, `reps`):

- Target e1RM `E* = e1rm(lb, reps)`. The same function the set row prints. For
  reps = 1 it's the weight itself.
- Current `E` = the median of the last 2 exposures' best e1RM (one great day
  doesn't declare the target reached).
- **Pace** = the Theil–Sen slope of the e1RM series over the last 12 weeks (≥ 6
  exposures). With it, the 25th-percentile pairwise slope as a pessimistic pace.
- **ETA** = `(E* − E) / pace`, shown as a **range of weeks** (optimistic pace to
  pessimistic pace), never a date, and only when the pessimistic pace is > 0.
  Longer than 26 weeks → "more than 6 months at your current rate." *Why:*
  strength gains slow down, so a straight line over-promises further out, and a
  range admits that.
- Pace ≤ 0 → "Not moving toward it right now," followed by the §5.3 reading.
- Reached (`E ≥ E*`) → "Your estimated max is at your target." **Never "go test
  it."** Coach doesn't schedule max attempts (§10.2).

**Bodyweight target** reads `goalLb` and the model's rate, with the same
range-not-date treatment, and **never celebrates a rate past `RATE_BAND_LB`**
(the existing 1.5 lb/week band in `coach.js`).

**Focus group**: pace = its weekly sets against its raised band, plus the trends
of its lifts.

Example: "315 bench: your estimated max is 291. At your last 12 weeks' rate,
about 10–16 weeks. That's 12 sessions of bench on record."

### 8.4 When behaviour contradicts the goal

Four checks, each needing **21 days** of data **and** 14 days since the goal was
set or changed (behaviour needs time to follow a new goal):

| Aim | Contradiction | Test |
|---|---|---|
| Build muscle / Get stronger / Recomp | Losing weight | Weekly context `deficit` or `deep` for 3 straight weeks |
| Lose fat, keep strength | Gaining | Context `surplus` for 3 straight weeks |
| Recomp / Stay consistent | Moving fast either way | \|rate\| > 0.5%/week for 3 weeks |
| Any aim | The calorie targets point the other way | `sign(auto.rateWk)` disagrees with the aim's direction |

**How it's raised:** once, as Coach's one question (the shipped question
machinery), **in the sheet only**, framed as a question and never a verdict:

> "You set *Build muscle*, and your weight has come down about 4 lb over the
> last 3 weeks. Did the goal change?"
> *Yes, update my goal* · *No, it's temporary* · *It's on purpose*

- *Yes* opens the goal picker.
- *Temporary* snoozes that check for **28 days** (`answers` + `asked`).
- *On purpose* silences that check for that aim until the aim changes.
- Muted questions (Settings) mute this too.

*Why once and in the sheet:* pillar 4. Coach never nags, and the card is never
corrective.

### 8.5 Changing the goal

- `answers.q_goal_aim` is rewritten and its `asked` stamp becomes the moment
  the goal was set. Nothing else is touched.
- **Training baselines don't reset.** Your step, ranges and trends are facts
  about your lifting, not your goal. The new aim's default bands only apply to
  lifts without an observed range.
- **Food baselines** get the phase-change treatment (§7.3) from that stamp.
- **Contradiction checks** go quiet for 14 days.
- **Pace** keeps using history (it measures the lift, not the aim).
- The next sheet open says it once: "Goal set to *Lose fat, keep strength*.
  Coach will confirm new weight jumps twice while you're cutting."

---

## 9. ENGINE G — STATES, REST DAYS, AND THE CARD

### 9.1 The states and what each offers

Detected from data already in the input: whether a live session exists, and the
last session's `endedAt`.

```
live        a session is running on this device (live.active)
post        no live session, and the last session ended ≤ 3 hours ago
done_today  a session today (local day), ended > 3 hours ago
pre         no session yet today
```

*Why 3 hours:* long enough to cover the drive home and a meal, short enough that
"How did today compare?" still feels like the question of the moment. After
that it moves to `done_today`, where the same answer is still reachable.

| State | Bubbles offered, in order (max 4, the rest under "More") |
|---|---|
| `pre` | What should I train today? · What should I lift today? · Am I fueled? · Should I rest or go lighter? |
| `live` | What next? (shipped) · What's my target on this set? (S5) · Am I done? (shipped, the `done` answer) |
| `post` | How did today compare? · What's next time? (targets for the next session of each lift) |
| `done_today` | How did today compare? · What should I train next? |
| any (fills the remaining slots, and always under "More") | How am I tracking toward my goal? · What am I neglecting? · How's my food? · Where's my weight going? · Make me a workout |

- **Make me a workout** is in every state. In `live` it builds the *next*
  session with only **Save as routine** offered, never Start (starting would
  replace the running session, which is why the shipped builder refuses today).
- **The exercise in hand** (live), for the per-set target: the exercise holding
  the most recently ticked set. If nothing is ticked yet, the first exercise in
  list order with an unticked set. If the sheet was opened from an exercise's own
  chip, that exercise.
- The Train card's sheet leads with training bubbles and the You card's sheet
  leads with the state's first bubble (the shipped surface split stays).

### 9.2 "What should I train today?" and the rest-day answer

Coach answers with a recovered group first. **Rest** is the answer only when
nothing you usually train is ready.

```
load(g, s) = fractional hard sets for g in session s (§6.1)
normal(g)  = median load(g, s) over sessions in 12 weeks that trained g (≥ 4)
big day    = the last session for g had load ≥ 1.5 × normal(g), or ≥ 2 sets
             typed F on g's lifts, or a 25% rep drop on 2+ of g's lifts
window(g)  = your 25th-percentile gap for g (min 1 day)
             (T3 default while learning: 2 days)
             after a big day: max(window + 1, your median gap for g)
             (T3 default while learning: 3 days)
ready(g)   = days since g ≥ window(g)
usual      = the groups in your recurring shapes (the shipped §3.3 derivation)

answer =
  if the global fatigue flag is up → "lighter day or rest"   (see below)
  elif some shape has every group ready → the most overdue such shape (shipped)
  elif some usual group is ready        → that group, "a shorter day"
  else                                  → REST
```

**The global fatigue flag** (two or more of): consecutive training days ≥ your
90th-percentile streak + 1; two or more lifts `declining`; F share over the last
7 days ≥ 2× normal; hard sets this week ≥ 1.3× normal.

**Rest answer shape:**

> "Today looks like a rest day. Chest, back and legs were all trained in the
> last 2 days, and you've trained 4 days straight (your usual run is 2–3)."
> *Train anyway* → the lightest recovered option from the builder, or, if none
> is recovered, the builder with sets halved.

*Why "train anyway" is always there:* Coach advises, the lifter decides. A rest
answer with no way out is a lock, not a coach.

**How hard you trained counts, per muscle group** (Micah's addition, 23 Sep:
*"say I did a crazy leg day … 1 day later I go to hit legs again or ask for a
workout and … I choose legs, it would see I probably should take more rest and
hit something else"*). That's `big day` and `window(g)` above, and it's checked
in two places:

- **"What should I train today?"**: a group inside its window isn't offered.
- **Make me a workout**, when he *picks* a group or shape that includes one
  inside its window: a caution before the proposal, never a refusal. "Legs had a
  big day yesterday: 24 sets, about twice your usual, with 3 taken to failure.
  Coach would give them another day." → *Build legs anyway* · *Train something
  recovered* (the most overdue ready shape).

It's toggleable (a **Rest days** switch, §12.2). In the sheet it's shown **only
when asked**, and never as a notification. The one card appearance is the
positive recovery line in §9.4, decided 23 Sep.

### 9.3 The adherence loop, with no writes

Every rule is a pure function of `(log, now)`. So Coach can replay the rest rule
at each past day `d`, using the log as it stood that morning (sessions with
`startedAt` before `d`), and find the **rest-flag days** in the last 12 weeks.

For each rest-flag day: did a session happen that day? If it did, how did it go
(the §4.6 outcome measure, against the baselines of that moment)?

- **Readout** (T1, in the rest answer's *why*): "Of the 6 days your log looked
  like this, you rested on 2."
- **Learning**, once there are ≥ 4 trained-through days:
  - held or beat your usual on ≥ 75% of them → **raise your personal streak
    threshold by 1**, and say so: "You've trained through days like this 5 times
    and held your numbers 4 times, so Coach gives you an extra day before
    calling rest";
  - came in below usual on ≥ 50% → keep the threshold and cite it: "The last 3
    times you trained through a day like this, your top sets came in under your
    usual."

*What this measures honestly:* whether you trained on days the rule *would*
have flagged, not whether you saw Coach say it (Coach speaks only when asked,
and keeps no record of what it said). Decided 23 Sep (§14 #8): replay, nothing
stored. The same replay also learns each group's window: if he trains a group
inside its window 4+ times and holds his numbers on 75% of them, that group's
window shrinks by a day, and Coach says so.

### 9.4 The encouraging card

**Anatomy** (the shipped 190-px card, same slots): greeting · **one earned
line** · COACH ME. The "finding" slot becomes the earned line. The shipped
blocking states stay: log unreadable, first run, live session, locked (Basic).

**Candidate lines**, each a registered item with a gate, the facts it quotes and
the aims it suits:

| id | Gate | Example | Aims |
|---|---|---|---|
| `hype_week_best` | Sessions in the last 7 days > every one of the previous 4 weeks, and ≥ 3 | "4 sessions this week, your most in a month." | all |
| `hype_pr` | `recent_pr` within 3 days | "New best on bench: 6 at 225." | strength, muscle, recomp |
| `hype_e1rm_trend` | `progressing` with a gain ≥ 2× σ over 6 weeks | "Squat's estimated max is up 15 lb in 6 weeks." | strength, recomp |
| `hype_targets_met` | All of last session’s Coach targets met (the targets arrive in S1; the line shows from S3) | "Every target met on Tuesday." | all |
| `hype_holding_cut` | Aim `cut`, relative strength up while the weight trend is down (§5.3 row 3) | "Bench is holding through 6 lb of cut." | cut |
| `hype_goal_pace` | Weight moving in the aim's direction, within ±25% of the goal rate, **and** inside `RATE_BAND_LB` | "3 lb down, right on pace." | cut, muscle |
| `hype_target_progress` | A lift target ≥ 50% of the way from where it was set | "Halfway to a 315 bench." | strength |
| `hype_protein_streak` | Protein target met on 5+ consecutive complete days | "Protein target hit 5 days running." | muscle, cut, recomp |
| `hype_volume` | Focus group's weekly sets at their highest in 8 weeks | "Most chest sets in a week since August." | muscle (focus set) |
| `hype_back` | First session after a layoff, **after** it's logged | "Good to have you back, first session in 12 days." | all |
| `hype_recovery` | Trained today **and** 3+ days in a row (from stage 4: at or past his usual longest run), rest-day switch on | "Great session today. Three days straight, so a rest day is well earned." | all (decided 23 Sep, §14 #16) |
| `hype_milestone` | Session count crosses 10, 25, 50, 100, 150, 200… | "That's workout 50 logged." | all |
| `hype_logging` | 14+ consecutive complete food days | "Two weeks of food logged straight." | all |
| shipped generic warm lines | nothing above passes | "Good to see you." | all |

**The rules the card lives by:**

1. **True.** Every number comes from a fact, and the fact's gate passed.
2. **Never corrective.** A verifier bans the vocabulary: *overdue, behind,
   missed, under, only, still, should, try, need, haven't, didn't, low, skip,
   failed*, plus the shipped banned list.
3. **Never contradicts the sheet.** On a streak day, `hype_recovery` is the
   line, never a streak brag. Otherwise, a line whose facts are the *evidence* of an
   active caution (rest day, lighter week, sliding faster than the cut) is
   suppressed. "4 days straight" isn't hype on the day it's the reason to rest.
4. **Never celebrates weight loss past the rate band, a low-calorie day, or any
   weight change without a stated goal in that direction.** An unexplained fast
   drop isn't something to cheer.
5. **Goal-aware ordering.** Candidates for the current aim first, then evidence
   recency, then novelty.
6. **Doesn't repeat.** The shipped device-local rotation (open counter + last 3
   ids) extends to these ids. And one more rule: the same underlying fact value
   isn't shown twice within 24 hours, even under a different id.
7. **Tone**: warm, plain, one number at most, max ~9 words, no exclamation marks
   (house style), no comparisons with other people, nothing about how a body
   looks.

**Where the old findings go:** every shipped finding (`group_overdue`,
`returning_from_layoff`, `same_group_overused`, `weight_rate_vs_goal`…) keeps
working, surfaced as the **sheet's opening bubble** instead of the card. The
ranking rule that picks the card's finding today picks the sheet's opening
instead. Nothing is lost. It moves behind the tap.

---

## 10. ENGINE H — HONESTY, SAFETY, AND FAILURE MODES

### 10.1 When Coach says less

- **Signals disagree** → take the conservative action and name both signals
  (§5.2). Never average them into a middle answer.
- **Stage `none`** on the baseline a claim needs → the T3 default if it's
  training structure, otherwise silence.
- **Plateau and dip can't be separated** (no weigh-ins, §5.3 row 7) → the
  numbers, and why Coach won't call it.
- **Attribution finds nothing off** → "Nothing in your log was off your normal,"
  and the unseen question.
- **A defer** (§3.2) → quote last time and say why there's no target.

### 10.2 The never-do list

Each line is a verifier check (§11.4), not a guideline.

1. No injury, pain or medical advice, diagnosis, or "push through". Pain words
   route to the shipped `coach_not_injuries`.
2. No max-attempt suggestion, ever. No "test your max", "go for a single", "max
   out". PR prompts are rep records at a logged load with ≥ 3 reps.
3. No heavier set after an F or a 25% rep drop on that lift in the same session.
   No two-step jump after a session with an F.
4. **No invented weights.** Every printed or boxed load is a load logged on that
   exercise, or reachable from the last top load by ≤ 2 of that exercise's steps
   (observed, or a default from §3.4), or on re-entry only, up to 6 steps below
   it. Always on the 0.5 grid in the display unit, never derived from an
   off-grid load, and a no-number target never leaves an empty weight ghost.
5. No target for a single, or for a lone top set of ≤ 3 reps (until RIR).
6. No population norm about the body: healthy weight, BMI, body fat, a "safe"
   rate of loss, a calorie floor or ceiling.
7. No eating instruction: no "eat more/less", no named food, no fasting advice,
   no supplements, no "carb-load".
8. No causal words about the user's own data: *because, caused, due to, led to,
   made you, that's why*. Only "different", "in your log", "on days when… (n)".
9. No approval of a weight rate outside `RATE_BAND_LB`.
10. Nothing corrective on the card.
11. No comparison with other people ("most people" is allowed only inside a
    labelled T3 training default, never about the body).
12. No claim about something unlogged as if logged (unlogged food isn't fasting;
    no sleep claims).
13. No guilt: no "you should have", no streak-shaming, no "you missed".
14. Every printed weight goes through `units.js`. No pound threshold dressed as
    an English phrase ("the next 5 lb").
15. No "AI" in any Coach copy (the FTC note from the 17 Sep brainstorm still
    stands).

### 10.3 When Coach asks instead of guessing

At most **one** question per sheet open, and only if its answer changes what a
registered rule does (the shipped registry check).

| id | Asked when | Options | Stored? |
|---|---|---|---|
| `q_goal_aim` | No aim set; asked under a *What should I lift today?* answer, never as the sheet's opener | the five aims | **yes** → `answers` (it *is* the goal) |
| `q_experience` | Aim set, experience unset; same place | 3 bands | yes → `answers` |
| `q_focus_group` | Offered in Settings only (S3) | the six groups + none | yes → `answers` |
| `q_log_timing` | Batch-logging detected (§4.2) | As I eat · Later | yes → `answers` |
| `q_ate_today` | "Am I fueled?" asked with nothing logged today | Yes, not logged · No · Skip | **no**, applies to this answer only |
| `q_unseen` | A session came in below usual | Slept badly · Stressed · Sore · Didn't feel well · Nothing | **yes, as a mark on that session** (decided 23 Sep, §14 #9): `marks`, §12. A marked session never counts as a miss, never drags down a baseline, and later feeds his own patterns. Kept 6 months |
| `q_goal_check` | §8.4 | Update · Temporary · On purpose | yes → `answers` + `asked` |
| `q_lift_target_reps` | A lift target was entered without reps and the weight is below the current e1RM | For 1 rep · For reps (picker) | yes → `goalLift.reps` |

**What's stored and what isn't** (decided 23 Sep, §14 #9): "have you eaten" is
used once and dropped. The bad-day answer is kept, but only as a mark on the one
session it explains, and only for 6 months. That's the smallest record that lets
a bad day stop counting against him, without Coach keeping a daily diary of how
he feels.

### 10.4 Graceful degradation

| Situation | Behaviour |
|---|---|
| **Doesn't log food** | The fueling brain stands down (§4.8). Energy context from the weight trend only. Progression, plateau-vs-dip (via the trend), the card and goals all work |
| **No weigh-ins either** | Energy context null. Plateau-vs-dip gives row 7 (can't separate). Progression uses the aim's dials only |
| **Bodyweight-only trainer** | Reps-mode progression. No e1RM talk, rep PRs instead. Volume and balance work (from the tags) |
| **Metric** | Steps in kilos, loads chosen from loads round in kilos, every print through `units.js`. No number where the step is unknown |
| **Two sessions in a day** | Separate exposures. Day-level facts merge (days since group). A second-session fuel read is "since your last session." Live facts still can't see the earlier session (shipped BACKLOG item), but the progression engine reads it from the log |
| **Long layoff** | Re-entry targets (§3.6), windows restart, `hype_back` after the first session back, the shipped `returning_from_layoff` in the sheet. Never guilt |
| **Deload / light weeks** | Detected (§5.4), excluded from normals, never read as a decline |
| **Custom exercises** | Full progression from their history. Default step only if their equipment is barbell or lb dumbbell. Out of the ratios (§6.5) |
| **Chaotic logging** | `defer` on erratic sets; the warm-up-in-disguise rule; outliers dropped from baselines |
| **Offline / unreadable log** | The shipped `guard_log_unreadable` silences everything, targets included |
| **Basic tier** | Sees one real target (the way it sees one real finding today) and the lock. Nothing mid-session (shipped rule) |
| **Everything muted** | Coach says it's switched off and where to switch it on. It never overrides a switch |

---

## 11. ENGINE I — THE GUARDRAIL BATTERY

Built like the food parser's phrasing battery: synthetic but realistic
histories, each with a known-correct call, scored **ok / miss / wrong**.

- **ok**: Coach made the expected call (mode, load, reps, classification) with
  the expected numbers.
- **miss**: Coach said less than expected (deferred, stayed silent, no number
  where one was allowed). Tracked and reported, allowed.
- **wrong**: Coach said something false, unsafe, or banned: a different load, a
  heavier target where the expected was hold, a number where none is allowed, a
  never-do string. **Must be 0**, like the food battery.

Every fixture is generated from a small, seeded, deterministic generator (no
`Math.random` without a seed) that writes sessions in the **real record shape**:
string `w`/`r`, `type`, `done`, merged-exercise duplicates, `_date`, pounds
stored even for kilo accounts. *Why the real shape:* the Sept 14 lesson.
`payloads.mjs` proved 174 checks against a shape no client writes. Fixtures that
aren't the real shape prove nothing.

### 11.1 The personas

| # | Persona | Profile |
|---|---|---|
| P1 | **Novice linear** | 3×/wk full body, 8 weeks, 3×5 squat/bench/row, steady +5/+10 jumps, full food logging, maintenance |
| P2 | **The owner** | Powerlifter, ad-hoc split, 12 weeks, cutting at ~1.1 lb/wk from 212, SBD at 3–6 reps plus accessories at 8–12, a few F sets, one stalled bench |
| P3 | **Hard cutter** | −2.2 lb/wk at 180 lb (1.2%/wk), squat e1RM down 8% over 6 weeks |
| P4 | **Lean bulker** | +0.4 lb/wk, 10–20 sets per group, steady progression |
| P5 | **Trains, never logs food** | No food days at all; weigh-ins present |
| P6 | **Bodyweight only** | Push-ups, pull-ups, dips, BW squats |
| P7 | **Metric** | Kilos, 2.5 kg barbell jumps, 2 kg dumbbell jumps, a few pound-typed loads from before the switch |
| P8 | **Returning** | 12 good weeks, then gaps of 18, 30 and 60 days on different lifts |
| P9 | **Chaotic logger** | Unmarked warm-ups, erratic sets (12, 5, 11), schemes changing every session, a duplicated exercise per session |
| P10 | **Batch food logger** | Every entry stamped 21:30–22:15 |
| P11 | **Brand new** | Day 0, day 3 (2 sessions), day 10 (5 sessions) |
| P12 | **Double-sessioner** | AM lifting + PM lifting 2×/wk, sometimes the same lift twice a day |
| P13 | **Custom-heavy** | 40% of sets on custom exercises, some deleted, some refiled |
| P14 | **Fast loser, no goal** | Weight falling 2.5 lb/wk, no aim, no auto targets |
| P15 | **Strength goal with a target** | Aim strength, target 315 bench, e1RM 291 and climbing ~2 lb/wk |

### 11.2 Known-correct calls (a representative set; the build grows it)

**Progression (S1)**

| # | Persona / setup | Expected |
|---|---|---|
| A1 | Bench, 6 exposures: moved up after 12s and started the new weight at 8, twice (175→180→185); last 12/12/12 at 185 | `add` → **190 × 8** (range 8–12 learned, step 5 learned) |
| A2 | Same, last 12/11/10 | `reps` at 185 → targets **12, 12, 11** |
| A3 | Same, last 12/12/12 with the third set F | `add` → 190 × 8, one step only |
| A4 | Same, last 10/8/6 (first time below 8) | `hold` → 185 × 8 |
| A5 | Two sessions in a row below 8 at 185; step 5; 175 logged before, 180 never | `reduce` → **175 × 8** |
| A6 | Two misses at 185, nothing logged in [175, 185), step 5 | `reduce` → 180 × 8 |
| A7 | Two misses on a cable row at 125, jumps of 10 and 15 (no step), 110 logged | `reduce` → **110** (a load he's logged). With nothing logged within 15% below: no number, "one setting lighter" |
| A8 | Squat 3×5 at 270, 280, 295, 315 (no jump twice) | `add` → **325 × 5** (fixed 5; lower-body barbell default 10) |
| A9 | Same, but his log shows 5-lb squat jumps twice | `add` → **320 × 5** (observed step wins) |
| A10 | P7 bench 3×5 at 100 kg, observed 2.5 kg | `add` → **102.5 kg × 5**, stored `"225.97"`, prints `102.5` |
| A11 | P7 dumbbell press, all at top, no observed step | `add`, **no number**, "the next dumbbell up" |
| A12 | Never logged | `first`, no load |
| A13 | P8 bench, chest off 30 days, history 185/195/205/215 | `reenter` → **185** (heaviest ≤ 0.9 × 215 = 193.5) |
| A14 | P8, 60 days off, tops 200–215, step 5 | `reenter`, **no number** (nothing ≤ 172, and 215 − n·5 needs n = 9 > 6) |
| A14b | Dumbbell press, 60 days off, tops 90/95/100 | `reenter` → **80** (100 − 4·5) |
| A15 | P8 bench, chest off 18 days | `reenter` at ≤ 90% |
| A15b | Bench not done in 20 days, but chest trained 3 days ago | `hold` at last top load, last reps |
| A16 | Last session 3×8, the one before a top single + back-offs | `defer('shape')` |
| A17 | Top single at 405 | `defer('heavy')` |
| A18 | Lone top triple at 385 + back-offs | `defer('heavy')` |
| A19 | 3×3 straight, all 3s, once | `hold('confirm')` (doubles and triples need two) |
| A20 | Same, twice in a row at the same load | `add`, one step |
| A21 | Sets 12, 5, 11 | `defer('erratic')` |
| A22 | Pull-ups 8/7/6 | `bodyweight` → **8, 8, 7** |
| A23 | Pull-ups 10/10/9 after 10/10/10 | A drop of 1 isn't a miss → `bodyweight`, +1 on the weakest two (set 3, then set 1 on the tie) → **11, 10, 10** |
| A23b | Pull-ups 10/8/7 after 10/10/10 | A drop of 2 → `hold` at **10, 10, 10** |
| A24 | Assisted pull-up 3×12 at 50, step 5, range 8–12 | `add` → **45** × 8 (less assistance) |
| A25 | Aim cut, all at top once | `hold('confirm')` |
| A26 | Aim cut, all at top twice at the same load | `add`, one step |
| A27 | No aim, P3 at −1.2%/wk, all at top once | `hold('confirm')` (deep deficit forces confirm = 2) |
| A28 | Lateral raise at 15 lb, no increases yet (default 10–15), default step 5 = 33% | `reps` (the top is 17): targets 16, 16, 15 |
| A29 | Bench with an unmarked 95×5 before 3×8 at 185 | the 95 set is ignored; decision on the 185s |
| A30 | Duplicated block: bench twice in one session | merged; one exposure |
| A31 | P12: bench AM and PM today | "last" is the PM exposure |
| A32 | Custom barbell lift in legs, 3×5@200 four times | `add` → **210 × 5** (fixed by repetition; lower-body default 10) |
| A33 | P7 with an old pound-typed 195 lb (88.45 kg) in history; two misses at 90 kg | `reduce` → **87.5 kg**, never the off-grid 88.45 |

**Overlap (S2)**

| # | Setup | Expected |
|---|---|---|
| C1 | P2 bench flat 5 weeks, trend −1.1 lb/wk, e1RM/BW up 2% | row 3: **expected, holding** |
| C2 | P3 squat −8% over 6 weeks at 1.2%/wk | row 5: **sliding faster than the cut explains** |
| C3 | P4 bench flat 5 weeks at +0.4 lb/wk, regular | row 6: **real plateau**, rung by weeks stalled |
| C4 | Flat, but benched 3 times in 5 weeks vs 2/wk normal | row 1: **not a plateau** |
| C5 | Flat, chest sets 1.4× normal and F share 2.5× | row 2: fatigue → lighter week |
| C6 | P5 with no weigh-ins, flat | row 7: can't separate |
| C7 | PR candidate, zero readiness flags, not `deep` | rep-PR prompt at a logged load, reps ≥ 3 |
| C8 | Same, energy `deep` | no PR prompt |
| C9 | Proximity true but the best is a double → +1 = triple at that load | prompt allowed (3 reps); a single → +1 = double: **not** prompted |

**Fuel and readiness (S4)**

| # | Setup | Expected |
|---|---|---|
| F1 | P5 asks "Am I fueled?" | "not enough in your food log" once, no numbers |
| F2 | P10 asks | day totals only; asks `q_log_timing` once |
| F3 | 40% of usual by this hour | "lighter than usual" with both numbers and n |
| F4 | Yesterday 900 kcal on a 2,600 median | "yesterday wasn't fully logged" (partial), **not** "low" |
| F5 | Nothing logged today | asks `q_ate_today`; no fuel claim |
| F6 | A great session on a light-food day | attribution lists "less food logged than usual" as a difference; **no** "despite", no causal word |
| F7 | Session below usual, nothing off | "nothing in your log was off", asks `q_unseen` |

**Goals and card (S3)**

| # | Setup | Expected |
|---|---|---|
| G1 | P15 pace | a range in weeks ("about 10–16 weeks"), never a date |
| G2 | Target reached by e1RM | "at your target", no "test it" |
| G3 | Aim muscle, deficit 3 weeks | one `q_goal_check`, sheet only |
| G4 | Same, answered "temporary" | silent for 28 days |
| G5 | Aim set 5 days ago, deficit 3 weeks | silent (14-day grace) |
| G6 | P14 fast loss, no goal | **no** weight hype; no approval |
| G7 | Rest day flagged by a 4-day streak | `hype_week_best` suppressed |
| G8 | Card line, every candidate × both units | no corrective word, ≤ 1 number, no "!" |

### 11.3 Properties checked over thousands of generated histories

- **Deterministic**: the same input gives the same output, byte for byte, twice.
- **Pure**: no `Date.now`, no DOM, no imports from impure modules (extends
  `coach-pure.mjs`).
- **Failure never makes a target heavier**: flip any top set N→F and the target
  load never goes up and steps never go up.
- **A miss never makes a target heavier**: lower any rep count in the last
  session and the load never rises. (Lowering an earlier one can legitimately
  move the learned range.)
- **Loadability**: every numeric target is in the lift's logged loads or ≤ 2 of
  its steps from the last top load (on re-entry, up to 6 steps below it), and is
  on the 0.5 grid in the display unit; a kilo `tw` round-trips through
  `units.js` to the printed number exactly.
- **Grid**: every numeric target is on the 0.5 grid in the display unit, and a
  kilo `tw` round-trips through `units.js` to the printed number. (Not "same mode
  in both units": a pound dumbbell has a default step and a kilo one doesn't,
  and that can legitimately change a decision.)
- **Order invariance**: shuffling the sessions array changes nothing.
- **Scale invariance**: doubling every load changes no mode when every step is
  learned (default steps are fixed plate sizes, so they don't scale, and that's
  correct).
- **Food-blind invariance**: deleting all food data changes no progression mode
  except those whose *why* names the energy context from intake (S4).
- **Silence under thin data**: under every minimum in §7.1, the engine returns
  its `none` answer and nothing else.

### 11.4 The must-never-say scan

Every string every engine can produce, across every fixture, in both units, is
scanned. Any hit is **wrong**:

```
max-attempt     /\b(1\s*rm|one[- ]rep max) (test|attempt)|\bmax(ing)? out\b|\bgo for a (single|max)\b|\btest your max\b/i
causal          /\b(because (you|your)|caused|due to (your|the)|led to|made you|that'?s why)\b/i
body norms      /\b(healthy (weight|range)|bmi|body ?fat|safe rate|too (fat|thin))\b/i
eating advice   /\b(eat (more|less)|cut (your )?calories|skip (a )?meal|fast(ing)?\b|carb[- ]?load|supplement)/i
medical         /\b(injur(y|ed)|diagnos|pain\b|push through)\b/i  (outside the coach_not_injuries template)
guilt           /\b(you should have|you missed|slacking|lazy)\b/i
AI claims       /\b(ai|artificial intelligence|machine learning)\b/i
card corrective /\b(overdue|behind|missed|under|only|still|should|try|need|haven'?t|didn'?t|low|skip|failed)\b/i  (card lines only)
stray pounds    /\b\d+(\.\d+)? ?lb\b/ on a kilo account; any pound-phrase threshold ("next 5 lb")
```

Plus the structural checks: every printed load traces to a target or a logged
set; every T2 line carries both counts ≥ 8; every T3 line carries its label;
every answer on a `none`-stage baseline carries its "doesn't know yet".

---

## 12. DATA AND MODEL ADDITIONS

Kept minimal. **No new top-level node, no change to the published rules, no new
field on any logged record.**

### 12.1 What Coach stores (all under `settings/coach`, the shipped node)

**The goal is answers to Coach's own questions.** That's what the brief's
constraint 5 already allows ("its own settings and the user's answers to its
questions"), and it's what the shipped machinery already stores, validates,
stamps and shows in Settings. The aim is `answers.q_goal_aim`; the moment it was
set is `asked.q_goal_aim` (`answerQuestion()` stamps it on every answer). No new
key is needed for S1 at all.

```json
{ "v": 1,
  "mute":     { "...": true },
  "on":       { "patterns": true },
  "answers":  { "q_goal_aim": "cut", "q_experience": "years",
                "q_goal_direction": "down", "q_focus_group": "chest",
                "q_log_timing": "later", "q_goal_check_loss": "temp" },
  "asked":    { "q_goal_aim": 1790000000000, "q_experience": 1790000000000 },
  "goalLift": { "exId": "barbell-bench-press", "lb": 315, "reps": 1 },
  "marks":    { "wm3k9x2": { "r": "sleep", "d": "2026-10-02" } } }
```

| Key | New? | Shape | Written by | Stage |
|---|---|---|---|---|
| `answers.q_goal_aim` | new question | `strength` \| `muscle` \| `cut` \| `recomp` \| `maintain` | the sheet's question, Settings → Coach → Your goal, onboarding (S3) | S1 |
| `answers.q_experience` | new question | `new` \| `some` \| `years` | the question, Settings | S1 |
| `answers.q_focus_group` | new question | one of the six groups, or `none` | Settings | S3 |
| `goalLift` | new key | `{ exId, lb (pounds, like every stored weight), reps 1–20 }` | Settings | S3 |
| `marks` | new key (decided 23 Sep) | `{ sessionId: { r: 'sleep' \| 'stress' \| 'sore' \| 'unwell', d: 'YYYY-MM-DD' } }`, entries older than 182 days dropped on every write | the `q_unseen` answer | S4 |
| `answers.q_log_timing` | new question | `live` \| `later` | the question | S4 |
| `answers.q_goal_check_*` | new questions | `temp` \| `keep` | the question | S3 |
| `mute.targets` | new category | `true` or absent | Settings → Coach | S1 |
| `mute.rest` | new category | as above | as above | S4 |
| `mute.readiness` | new category | as above | as above | S4 |
| `mute.balance` | new category | as above | as above | S5 |

`goalLift` is its own key because a lift target is a structured value (an
exercise, a weight, a rep count), and the question machinery validates answers
against a fixed option list. Everything else fits that machinery as it is.

**What does not get stored, and why:**

- **Learned baselines**: recomputed (§0 #7).
- **Rest-day history**: replayed (§9.3).
- **"Have you eaten?"**: ephemeral (§10.3). The bad-day answer is the
  exception, stored as a mark on that one session (`marks`, decided 23 Sep).
  Nothing else about how he feels is kept.
- **A second bodyweight target**: `food/targets.goalLb` already is one.
- **A goal direction**: `food/targets.auto.rateWk` and the shipped
  `q_goal_direction` already hold it. The aim implies an *expectation* that the
  contradiction check compares against, not a second stored direction.
- **Per-exercise rep schemes**: inferred from the log (§3.3). A "set my range"
  control is a possible later addition, and it would be a new stored map.

### 12.2 Code changes the storage needs (and the traps)

- **S1 needs no change to `normSettings()`'s shape.** New questions are
  validated against their own option lists by the existing loop. The one trap:
  **Settings must show the goal rows even before they're answered.**
  `coachAnswerRows()` shows only answered questions today, by design. The goal
  questions carry a flag (`always: true`) that puts them in Settings from day
  one, with nothing selected until answered.
- **The registry verifier drives each question** by writing its answer and
  checking that its fact moves. So each goal question needs its **own** fact
  (`coach.aim`, `coach.experience`), not one combined `coach.goal`; a combined
  fact would read null for the experience question on an account with no aim,
  and the driven check would fail. Fact ids stay inside the ten registered
  families (`coach.*`, `weight.*`, `lift.*`), so the registry's family check
  needs no change.
- **S3, `goalLift`**: `normSettings()` learns it via a `normGoalLift()` exported
  from `coach-goal.js`, failing safe on every junk value (unknown `exId` string
  shape → absent; `lb` not a finite positive number → absent; `reps` outside
  1–20 → 1). **Without that, the first write is silently dropped on the next
  read**, because `normSettings` keeps only the keys it knows. `patchNow()`
  replaces it whole (it's one value, not a map).
- **Published rules**: no change. `settings` has a section-level `.write`, and
  the `$other` deny sits inside `units`, not on `settings`.
- **PROPOSED rules (rack-mobile `web-patches/`)**: the V43 `coach` shape ends in
  `"$other": { ".validate": false }`. If its `answers` child enumerates question
  ids, every new id must join it; if it's `$q`-generic, S1 needs nothing. S3
  must add `goalLift`, S4 `marks`. Each stage's `NEXT-NATIVE-V4x.md` names the exact change.
  Since v40 a refused write is at least visible, but it's still a switch that
  flips back.

### 12.3 What Coach newly reads

| Read | Why | When | Cost |
|---|---|---|---|
| Nothing new | S1–S3 run on data already gathered: sessions, library, weigh-ins, the weight model's rate and trend, targets, settings | — | 0 |
| A trend-weight series (daily, 84 days) | Relative strength (§5.3) needs the trend at window start and end | S2 | 0 reads: computed in `coach-data.js` from the weigh-ins already read, via `tdee.js` helpers |
| `food/log/{today}` | Time-of-day fuel reads | S4, once per open + on food change | 1 read, Pro, fuel on |
| `food/log/{date}` × ≤ 14 training days | By-hour curve, pre-session intake | S4, lazily on the first fuel/attribution ask per open | ≤ 14 reads, Pro, fuel on |

### 12.4 The placeholder for effort

Every engine reads `set.rir` (integer 0–5) if present and treats absence as
unknown (§6.4). **No field is added now.** When the effort tap ships, it adds
`rir` to set records and a `.validate` for it, and the engines start using it
with no rewrite.

---

## 13. THE PHASED BUILD PLAN

Five web ships, each a focused unit, each followed by its native port (your
standing rule: web is the guinea pig, native is the destination). Version
numbers assume nothing else ships in between; renumber if it does.

| Stage | Ship | What it adds | Depends on | What it proves |
|---|---|---|---|---|
| **S1** | **rack-v48** — *Coach knows what's next on the bar* | `coach-goal.js` (aims, experience, dials, energy context from the weight trend) · `coach-prog.js` (per-lift baselines, status, `prescribe()`) · a target line on every builder row · **Start with Coach’s targets** as the builder's main button (ghost `tw`/`tr`, ticking adopts) · a Train bubble, "What should I lift today?" · Settings → Coach → Your goal (aim + experience) and a *Weight and rep targets* switch · `q_goal_aim` in the sheet | nothing new | That Coach can name a weight that's always loadable, never invented, never a push after a failure, **wrong = 0** on the A-battery, in both units |
| **S2** | **rack-v49** — *plateau or cut?* | `coach-overlap.js`: status shown with context, the §5.3 table, the stall ladder, the lighter-week call, rep-PR timing · trend-weight series in the input · a "How's my bench moving?" answer per lift | S1 status + energy context | The signature call: C-battery rows 1–7 all right, including "holding through a cut" |
| **S3** | **rack-v50** — *the card and the goal* | The card becomes the earned line (§9.4) and findings move to the sheet's opening · state-aware bubbles (§9.1) · goal pace/ETA for lift and bodyweight targets · lift target and focus group in Settings · the goal-contradiction question · a goal step in onboarding | S1 goal, S2 status | Tone: nothing corrective on the card in either unit; the states route the right bubbles; pace is a range and never a date |
| **S4** | **rack-v51** — *am I fueled?* | `coach-fuel.js`: the two reads (§4.7), complete-day and logging-style detection, food baselines, "Am I fueled?", readiness, the rest-day answer with per-group hard-day recovery (also checked when he picks a group in the builder) and the replayed adherence loop, the recovery line on the card after 3+ days in a row, "How did today compare?" with attribution and bad-day marks, intake as a cross-check on energy context | S1–S3 | That the fueling brain stands down cleanly (F-battery), uses no causal words, and never calls a partial day low |
| **S5** | **rack-v52** — *in the gym, and the whole week* | Next-set targets mid-session (§3.10, the live fence replaced), `coach-volume.js`: fractional volume, bands, balance ratios, neglect, rest-tolerance learning · grey targets on hand-added exercises (your 23 Sep request) | S1, S4 | That a number mid-set is never heavier after an F; balance readouts carry no health claims |

**Why this order:**

- **S1 first** because progression is the biggest gap against every paid app,
  its science is the most solid (double progression, 2-for-2, fixed increments),
  and every later stage reads its baselines. It needs **no new reads, no rules
  change, and no change to any logged record.**
- **S2 before the card** because it's the differentiator, and it runs entirely
  on data Rack already has. Energy context from the weight trend is enough to
  make the call.
- **The card in S3** once there's something worth celebrating that's new
  (targets met, holding through a cut). Doing it first would move findings off
  the card before the sheet has the state-aware bubbles to catch them.
- **Fuel in S4** because it's the only stage with new reads, the weakest science,
  and the highest risk of an overclaim. It deserves to land on top of a trusted
  engine, not be the first thing people judge Coach by. If you want it sooner,
  it can swap with S3 (§14 #12).
- **In-gym targets last** because mid-set is the most sensitive place Coach
  speaks. The pre-session targets should have been lived with first.

**What stays deferred:** the effort (RIR) tap, which is its own data ship and
unlocks singles and doubles; the free-text box (still waiting on your
weird-question list); water in readiness; weekly review; Apple Watch.

**Per stage, same shape as ships one to three:** a fenced `~/dev/ship-v4x`
clone, a brief, a report (`COACH-REPORT.md` sections), `NEXT-NATIVE-V4x.md` with
the verbatim-copy hashes, your walkthrough, then the native run and rebuild.

---

## 14. DECISIONS — answered by Micah, 23 Sep 2026

These were the open judgment calls. Each was put to Micah one at a time; his
answers are below and are written into the sections they change. Nothing in this
spec is open any more.

| # | Decision | Answer | Changes |
|---|---|---|---|
| 1 | Labelled training-science defaults (T3)? | **Yes, training only.** Body and food stay own-data-only | §2.2, §3.3, §3.4 as written |
| 2 | The goal set | **The five, plus Powerlifting** as its own goal | §8.1, §8.2 (a sixth column) |
| 3 | Card encouragement-only; findings to the sheet | **Yes** | §9.4, stage 3 |
| 4 | Time off | *"An individual timer for each muscle group … I like 12 days."* The group's clock sets the drop (~90% at 15–30 days, ~80% past 30); a lift not done in 12+ days on its own gets no jump its first time back; **one jump at a time** back up | §3.2, §3.6, §3.7 |
| 5 | Confirm twice before adding weight | **As proposed:** cutting, Stay consistent, a hard cut, doubles and triples, slow progress | §3.5, §8.2 |
| 6 | No targets for singles or lone heavy top sets (until RIR) | **Yes** | §3.2 |
| 7 | General fuel science in answers | **No. Own data only** | §4, stage 4 |
| 8 | Adherence | **Replay, nothing stored**, plus per-group recovery that grows after a hard day, checked when asked and when a group is picked in the builder | §9.2, §9.3 |
| 9 | Daily answers | **A mix:** a below-usual session can be marked (slept badly, stressed, sore, didn't feel well); marks never count as misses or drag down a normal; kept 6 months. "Have you eaten?" stays use-once | §10.3, §12 |
| 10 | Cut-speed thresholds | **As proposed:** −0.75 / −0.25 / +0.25 %/wk | §5.1 |
| 11 | "Carb-loaded"? | **No.** "Am I fueled?" | §4 |
| 12 | Stage order | **As proposed** | §13 |
| 13 | Water in readiness | **Not yet**; revisit after stage 4 | §1 |
| 14 | Which Start button leads | **Coach's targets, as the main button.** *"This coach should be at the level where I can trust it … following it, I should see my data of my lifts going up. I have to be able to trust it."* | §13 S1; the bar for every stage |
| 15 | Targets Pro only? | **Pro, with one teaser in stage 3** | §10.4, stage 3 |
| 16 | When rest comes up | **When asked, plus a gentle positive card line after 3+ days in a row** (*"Great lift today! Think about a day to recover …"*, written in house style without the exclamation mark) | §9.2, §9.4 |

---

## APPENDIX — SOURCES

- Henselmans M, et al. *The Effect of Carbohydrate Intake on Strength and
  Resistance Training Performance: A Systematic Review.* Nutrients 14(4):856,
  2022. https://www.mdpi.com/2072-6643/14/4/856
- Murphy C, Koehler K. *Energy deficiency impairs resistance training gains in
  lean mass but not strength: A meta-analysis and meta-regression.* Scand J Med
  Sci Sports, 2022. https://onlinelibrary.wiley.com/doi/10.1111/sms.14075
- Garthe I, et al. *Effect of two different weight-loss rates on body composition
  and strength and power-related performance in elite athletes.* IJSNEM 21(2),
  2011. https://pubmed.ncbi.nlm.nih.gov/21558571/
- Bell L, et al. *Integrating Deloading into Strength and Physique Sports
  Training Programmes: An International Delphi Consensus Approach.* Sports Med
  Open, 2023. https://link.springer.com/article/10.1186/s40798-023-00633-0
- Pelland JC, et al. *The Resistance Training Dose Response: Meta-Regressions
  Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and
  Strength Gains.* Sports Med, 2025.
  https://link.springer.com/article/10.1007/s40279-025-02344-w
- NSCA, *Essentials of Strength Training and Conditioning*, ch. 17 (the 2-for-2
  rule; load increments by body region and training status), as summarised at
  https://www.ptpioneer.com/personal-training/certifications/nsca-cscs/cscs-chapter-17/
- *Effects of Detraining on Muscle Strength and Hypertrophy Induced by
  Resistance Training: A Systematic Review* (2022), on how thin the detraining
  timeline evidence is. https://www.mdpi.com/2813-0413/1/1/1
- Schoenfeld BJ, Ogborn D, Krieger JW. *Dose-response relationship between weekly
  resistance training volume and increases in muscle mass.* J Sports Sci, 2017.
  Cited from the literature, not re-fetched for this spec.
