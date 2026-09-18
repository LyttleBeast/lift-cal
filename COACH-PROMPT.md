# COACH — ship one (web only)

Build brief for a single overnight Claude Code run in `~/dev/ship-v42` (a fenced clone
of lift-cal at 05c7d03 = rack-v41). Written 17 Sep 2026 from a full read of the live
source plus an adversarial review of the draft intent catalog.

You are building the first of three ships. Ship two is the workout builder. Ship three
is the mid-session read and the free-text box. **Neither is in scope tonight.** The
native port is a separate run and is **not** in scope tonight.

---

## 0. THE ONE-PARAGRAPH VERSION

Rack is going to get a Pro feature called **Coach**: a deterministic engine that reads
the user's own training, food and weight data and tells them something true about it.
No AI, no model call, no network, no per-use cost — it is arithmetic over the log with
its reasoning attached to every sentence. Tonight you build the engine, the exercise
tag sidecar it will later need, the You-tab card, the Train-tab rearrangement, the
COACH ME sheet with read-only answers, and the Settings section that lets the user
switch categories off. Coach **reads everything and writes almost nothing**.

---

## 1. NON-NEGOTIABLES

These come from CLAUDE.md, AGENTS.md and DEPLOY.md in this repo. They are not
suggestions and a run that breaks one has failed regardless of what else it built.

1. **Vanilla ES modules.** No dependencies, no package.json, no npm, no bundler, no
   build step, no linter, no test runner, no CI. Do not add any of them.
2. **Bump the service worker — in TWO files.** `sw.js` line 1 `const CACHE='rack-v41'`
   and `usage.js:45 const VERSION = 'rack-v41'` both become `'rack-v42'`. They must
   match. Bumping only sw.js makes the Admin panel lie; bumping only usage.js ships
   nothing to any phone.
3. **Syntax check with the redirect form only.** `node --check file.js` silently passes
   a broken ES module. Use `node --check --input-type=module < "$f"`.
4. **Every verifier under `tools-check/` must exit 0** before you finish, plus the ones
   you add. Run both loops from CLAUDE.md:114.
5. **Match the surrounding file.** Small diffs. Read narrowly. Comments explain *why*,
   in the voice of the file you are in.
6. **Never commit a key.** There are none in this repo and there must remain none.
7. **Do not touch the Worker** (it is not in this tree), Firebase dashboards, or
   anything that deploys.
8. **Finish with the five-line handoff** from CLAUDE.md:124 — Shipped / Service worker /
   Before it's live / To check it worked / Risk. Nothing in it that isn't true.
9. **Do not push.** The pre-push hook refuses. Commit only. Micah pushes.
10. **Keep README.md, AGENTS.md and BACKLOG.md true.** Also fix CLAUDE.md's Layout table
    (CLAUDE.md:36-53), which a new module makes wrong.

### The wrong-number rule
> *A wrong number is worse than no number.*

This is the house law and it governs every line of Coach. A rule whose data is thin
**stays silent**. A fact that cannot be computed honestly is **absent**, not guessed.
Silence is always an available answer and is never a bug.

### The units rule
Pounds and inches are the single stored unit, forever. `units.js` converts only at the
display/input edge. **Every Coach sentence that prints a weight must route through
units.js.** This is the single most likely defect in this build: a draft of the intent
catalog had roughly 25 sentences printing converted weights with no units call.

There is a trap here that `insights.js:598-603` already hit: an English phrase can
secretly be a pounds threshold. "Rounded down to the nearest 5" and "the next 5 lb is
230" are *false sentences on a metric account*, because 5 lb is 2.27 kg. If a sentence
names a rounding or a step size, it needs a metric-specific phrasing, not a conversion.

---

## 2. ARCHITECTURE — FOUR LAYERS

Everything Coach does lives in **one new pure module, `coach.js`**, written in the style
of `units.js` and `accounts.js` so the native port can copy it **verbatim** later. Pure
means: no imports from `store.js`, no `analytics.js` module state, no DOM, no
`Date.now()` inside — the clock is passed in.

```
FACTS      → named values, each carrying a short "because" string
RULES      → registered objects: facts needed, min-data gate, condition,
             priority, severity, category, kind, supersedes, response id
RESPONSES  → templates keyed by id, slots filled from fact bindings
ROUTER     → (button | intent id) → intent → rules → response
```

**Why the layers are separate.** Adding to Coach must mean adding a fact, a rule, a
template or a phrasing — never editing a growing function. The response layer is split
from the rules so the same finding can render on a card, in a bubble or (later) in a
weekly review without duplicating a condition. The router exists now, with only buttons
feeding it, so ship three can add text matching in front of it and change nothing else.

**`analytics.js` is NOT pure** — it holds `allCache`/`flatCache` module state
(analytics.js:20). So `coach.js` must **take sessions as an argument**, never call
`analytics.js` itself. The caller (the UI layer) does the loading. `coach.js` may import
pure helpers from analytics (`e1rm`, `isWorking`, `setVolume`, `mergeSessionExercises`,
`exerciseIndex`) — those are pure — but never `loadAll`/`allSessions`.

Create a thin **`coach-data.js`** (impure, web-only, NOT ported verbatim) that gathers
inputs from store/analytics/food/weight and hands `coach.js` a plain object. The port
rewrites that one file and copies `coach.js` byte-for-byte.

---

## 3. RESOLVED DECISIONS

The draft catalog contained contradictions. **These are the rulings. Do not re-litigate
them, and do not invent a second definition of anything named here.**

### 3.1 Coach's settings live at `settings/coach`, NOT a new top-level node

This is the most important structural decision in the brief.

`users/{uid}/coach` **has no grant in the published rules** (verified: the writable
sections under `users/$uid` are exactly food, weight, workouts, history, water, steps,
routines, exercises, settings, profile, onboarding). A write to an ungranted section
**fails silently** — no error, no red bar.

But `users/{uid}/settings/coach` **works today with no rules change at all**: `settings`
has a section-level `.write`, and the `$other: {".validate": false}` deny is nested
*inside* `units`, not on `settings` itself. So any other child of `settings` lands.

Therefore:
- Coach's stored state is **`settings/coach`**.
- **No change to `database.rules.json` is required or permitted tonight.** This removes
  the entire class of "Micah must paste rules before the feature works", and removes the
  first-run latch where a failed write leaves an account permanently unable to be asked
  a question.
- Add `settings/coach` to the **PROPOSED** rules file only if this repo carries one; it
  does not — `web-patches/` lives in rack-mobile. So: note it in the handoff as a
  follow-up for the native repo, and do nothing here.
- Do **not** add `settings/coach` to `store.js` CONTAINERS. It is a small object written
  whole. Never PUT it from stale module state — read, merge, write, and assign module
  state only *after* `write()` resolves (store.js:641-651).
- Never write it through `mergeUpdate()` — that swallows every error including
  PERMISSION_DENIED (store.js:762).

**Shape:**
```js
settings/coach = {
  v: 1,
  mute:   { <categoryId>: true, ... },   // absent = on
  answers:{ <questionId>: <value>, ... },
  asked:  { <questionId>: <epochMs> },
  lastGreet: '<greetingId>'
}
```

### 3.2 ONE log-confidence fact, three-valued

The draft had three names (`log.hasHistory`, `log.readable`, `builder.log_confidence`),
three shapes and one inverted polarity — which made one intent unable to ever fire.

There is exactly one fact: **`log.confidence`**, with values `'readable' | 'empty' |
'unknown'`.

This matters because `analytics.allSessions()` **resolves `[]` when the read fails**
(it falls back), so an unreadable log is indistinguishable from an empty one through
that path. `store.readExact()` (store.js:728) is the only read that distinguishes "the
database said nothing" from "could not reach it".

```
unknown  → readExact on 'workouts' rejected. Coach says nothing but
           guard_log_unreadable. No other rule may evaluate.
empty    → readExact resolved null/{} AND history index empty. New account.
readable → anything else.
```

`coach-data.js` computes this via `readExact` and passes it in. `coach.js` never reads.

### 3.3 ONE recurring-shape derivation

The draft defined this three times with different windows and merge rules. It is the
headline feature, so it gets one definition:

```
WINDOW          the last 84 days (12 weeks), by session startedAt
SIGNATURE       the set of primary groups in a session with >= 2 working sets,
                after mergeSessionExercises, excluding equipment === 'cardio'
MERGE           two signatures merge when their symmetric difference is <= 1 group
RECURRENCE BAR  a merged cluster is a "shape" at >= 3 sessions in the window
ORDER           count desc, then most-recent date desc, then signature key asc
NAMING          descriptive only, from the group labels in GROUPS, e.g.
                "chest and arms". NEVER program jargon ("Push A", "PPL").
                If the user has saved a matching routine, use THEIR routine name.
```

Use **primary group only** (`exercises.js` RAW field 2). Do not use secondary groups for
the signature — they make nearly every session look like every other one.

**Resolve equipment from the merged effective library**, and when an exId no longer
resolves (a deleted custom exercise — picker.js:488 deletes the row outright), treat it
as non-cardio rather than dropping the session.

### 3.4 Muscle groups are SIX, and that is a hard ceiling

`exercises.js:5 GROUPS` = `chest, back, legs, shoulders, arms, core`. That is the entire
vocabulary; there is no biceps/triceps split, no quads/hamstrings split.

So "you're behind on chest" is computable and "you never train hamstrings" is not.
**Do not invent finer groups.** Every volume, recency and balance fact is at six-group
granularity. This is also why the tag sidecar in §4 matters: movement pattern is the
only finer signal that will ever exist.

### 3.5 ONE fact registry, unique ids

Every fact is registered once, in one table in `coach.js`, with:
`id` (dot.namespaced), `compute`, `unit`, `because` (the short string it contributes),
`requires` (other fact ids). **A verifier must fail on a duplicate id.** The draft had
three definitions of `group.daysSinceLastTrained` alone.

Naming: `log.*`, `session.*`, `group.*`, `lift.*`, `fuel.*`, `weight.*`, `steps.*`,
`live.*`, `meta.*`, `coach.*`.

### 3.6 The intent schema carries ranking fields

Every registered intent has: `id`, `kind` (`guard|state|finding|selector`), `surfaces`,
`category`, `tier` (`free|pro`), `priorityBand` (2-5; band 1 is reserved, see §6),
`severity` (0-99), `supersedes` (array of intent ids), `minData`, `factsNeeded`,
`response`.

### 3.7 Categories map to a DECLARED toggle table

The draft used 35 category strings against 8 toggles. There is **one exported table**
mapping every category to exactly one toggle, and a verifier fails on a category with no
toggle. Ship-one toggles:

```
core          (NOT mutable — the card's state machine)
safety        (NOT mutable)
volume        balance and weekly-volume findings
recency       overdue groups, layoffs, missing days
progression   stalls, PRs, proximity
fuel          macro and target readouts
weight        rate and weigh-in findings
steps         step readouts
questions     whether Coach may ask anything at all
```

---

## 4. THE EXERCISE TAG SIDECAR

A **new pure module `coach-tags.js`**, not an edit to `exercises.js`.

`exercises.js` is copied verbatim into the native tree; editing it in place means
re-copying and re-verifying a file both clients depend on, and a tagging mistake could
reach the picker. A sidecar keyed by exercise id cannot break anything but Coach.

Tag all **built-in** exercises on five closed dimensions:

```
pattern    press | row | pulldown | fly | raise | curl | extension | hinge |
           squat | lunge | carry | bridge | crunch | rotation | cardio
angle      incline | flat | decline | overhead | null
load       compound | isolation
side       bilateral | unilateral
equipment  carried from exercises.js — do NOT re-derive it
```

Rules:
- Closed vocabulary. A value outside it is a verifier failure.
- **Custom exercises get no tags.** They are classified by the primary group the user
  already assigned, with `pattern: null`. They must remain fully usable everywhere.
  Never exclude a user's own exercise from anything.
- Keyed by the same id `exercises.js` uses, so the sidecar and the library cannot drift.

**Verifier `tools-check/coach-tags.mjs`:**
- every built-in has a complete tag set
- every value is in the vocabulary
- every tag agrees with the exercise's declared primary group — anything tagged `squat`,
  `hinge` or `lunge` whose group is not `legs`, anything tagged `press`/`fly` whose group
  is not `chest`/`shoulders`, etc. Print disagreements as failures, not warnings.
- the sidecar's id set exactly equals the library's id set

Tags are inert tonight beyond the verifier — ship two is what consumes them. Building
them now is what lets ship two start without a prep run.

---

## 5. WHAT COACH MAY SAY — THE HEALTH AND HONESTY RULES

Coach is a fitness app feature, not a health service. These are hard limits.

1. **Only ever compare against numbers the user set, or their own trailing average.**
   Never a population norm, never a "healthy range", never a guideline.
2. **Readout, not instruction.** "Fat is 38% of your calories this week, against the 30%
   your targets work out to" — not "eat less fat".
3. **Never** suggest eating less, cutting calories, a max attempt, or anything in
   response to pain or injury. If a question is about pain, Coach says it doesn't do
   injuries and offers what it can see instead.
4. **Every sentence carries its number.** If a finding can't be backed by a number, it
   isn't a finding.
5. Keep the existing not-medical-advice framing; do not weaken it.

### 5.1 A magnitude guard you must ADD

`insights.js:95 rateVerdict(rateWk, dir)` returns `'good'` for **any** rate in the
stated goal direction, unbounded — and `LIMITS.rateWk` allows ±5 lb/week. So an account
losing weight very fast currently gets a green number and an approving sentence.

**Coach must not reproduce that.** Coach's weight-rate finding gets a magnitude band:
beyond a sane weekly rate in either direction, Coach reports the number plainly and
**does not call it good**. Do not edit `insights.js` tonight — that is a separate,
deliberate change Micah will make. Just don't inherit the bug.

### 5.2 Two existing sentences you must not copy

- `insights.js:283` ("past about 1.5 lb a week more of it is muscle") is a physiological
  generalisation, not a comparison to the user's own data. Coach does not say things
  like it.
- `insights.js:541-551` weekly-review takeaways are openly prescriptive ("Get protein to
  N g...", "Bring the daily average back under N"). Coach does not phrase this way.
  **Do not change the shipped copy** — just don't extend the pattern.

---

## 6. THE RANKING RULE

The You card has **three slots**: greeting line, finding, lead question. Only the finding
slot is contested.

**Step 0 — blocking states, mutually exclusive, evaluated first. Nothing else may
occupy band 1.**
```
log.confidence === 'unknown'        → guard_log_unreadable, stop
log.confidence === 'empty'          → card_first_run, stop
a live session is running           → card_live_session, stop
```

**Step 1 — filter candidates** (`kind === 'finding'` only; guards never render, they only
suppress):
drop muted categories · drop `pro` when the account lacks it, and count them for
card_state_locked · drop failed min-data gates · drop any id named in a surviving
candidate's `supersedes`.

**Step 2 — sort by this tuple**, every key total and deterministic:
```
1  priorityBand ASC        (content starts at 2; band 1 belongs to Step 0)
2  severity DESC
3  evidenceRecencyDays ASC (age of the newest fact the finding quotes)
4  categoryIndex ASC       (position in the §3.7 toggle table)
5  intent id ASC           (unique — ties are impossible, two devices agree)
```

**Step 3** — head fills the slot. If the survivor set is empty, fall through
`card_state_thin` → `card_state_clear`.

**The stopping bias**: findings that counsel rest or caution get the top severities and
name the "do more" findings in their `supersedes`.

**Dedupe across surfaces**: a finding claimed by the You card does not also render on the
Train card in the same paint. The You card claims first.

---

## 7. SHIP-ONE INTENT SET

Build exactly these. Not the full catalog — the rest lands in ships two and three.

**Guards and states (`core`, not mutable)**
```
guard_log_unreadable     log.confidence==='unknown'. "Can't read your training log
                         right now." No other rule evaluates.
card_first_run           log.confidence==='empty'. States what it needs. No advice,
                         no placeholder numbers.
card_live_session        a session is running. Points at Train.
card_state_thin          readable but every gate failed for want of data. Says how
                         many sessions it has and what it's waiting for.
card_state_clear         gates evaluated, nothing notable. Names what it checked.
card_state_locked        free account: one real finding + what Pro adds.
```

**Recency and volume (`recency`, `volume`)**
```
group_overdue                a group's days-since exceeds its own median gap in the
                             84-day window. Six groups only (§3.4).
group_under_weekly_normal    sets this week for a group vs that group's own trailing
                             normal. Denominator stated explicitly.
weekly_sessions_vs_trailing  sessions in the last 7 days vs the user's own trailing
                             average. State your own denominator — do NOT adopt
                             insights.js:309's fixed bar of 3.
session_shape_most_overdue   the derived shape (§3.3) whose groups are stalest.
train_today_recommendation   the headline. Names the shape and why. Soft framing —
                             "chest is your stalest group", never "today is chest day".
returning_from_layoff        gap exceeds the user's own normal by a clear multiple.
                             Welcoming and practical. Never guilt.
same_group_overused          the rest-day finding. Fires only when one group is being
                             trained far above the user's OWN normal frequency.
                             Category `recency`, toggleable, low frequency.
```

**Progression (`progression`)**
```
stalled_lift        best e1rm flat or down across the last N sessions of that lift.
recent_pr           a PR inside 7 days, from detectPRs' existing kinds.
pr_proximity        one more rep at the current weight would beat the best e1rm.
                    Compute with analytics.e1rm — never invent an inverse.
```

**Fuel (`fuel`)**
```
fuel_no_targets_set          GUARD, and it must come first in this family.
                             Onboarding is skippable (onboarding.js:344) and
                             food.js:54 then leaves a MODULE DEFAULT of 2,700 kcal
                             in place. Coach must never report a finding against a
                             target nobody set. Detect the absent node and say so.
fuel_calories_left_today     readout against the user's own target.
fuel_macro_share_vs_targets  the macro split vs what their targets work out to.
fuel_protein_vs_trailing     protein against their own target, trailing.
```

**Weight and steps (`weight`, `steps`)**
```
weight_rate_vs_goal      with the §5.1 magnitude guard. Direction from their own
                         stated goal; silent when direction is unknown.
weight_no_recent_weighin readout of days since last entry.
steps_today_vs_trailing  today vs their own trailing average. No bubble (§8) —
                         reachable as an answer only.
```

**Meta (`core`, `questions`)**
```
greet_select          picks the rotating line (§9).
card_lead_question    builds the lead question from ONLY the topics that have data.
coach_ask_question    Coach's one question. Gate: at most one unanswered question
                      live; only a question whose answer changes a registered
                      rule's behaviour; never more than one per session.
                      A verifier must fail on a question id no rule references.
```

---

## 8. THE SURFACES

### 8.1 The You-tab card
Insert at **`you.js:513`**, immediately after `wrap.appendChild(hero());` and above
`wrap.appendChild(sinceLine());`.

The greeting already exists at `you.js:618-620` and has **four** buckets, not three:
`Good night` (00:00-04:59), `Good morning`, `Good afternoon`, `Good evening`. Coach's
rotating line sits *below* that, it does not replace it.

Card anatomy, fixed **190px** height, `box-sizing: border-box`:
- header: speech-bubble icon + `COACH` label, both `var(--p-yellow)`; a lock in the top
  right — grey open (`--steel`) on Pro, yellow shut on free
- the rotating line
- the finding, clamped to two lines
- the reason line, clamped to two lines
- a bottom row: **COACH ME**, yellow, with a chevron

The fixed height is load-bearing: the card's content changes daily and the Train card
sits directly above Start workout. If it grows, the primary button moves under the
user's thumb. **Clamp and truncate; never let the card resize.**

Do not add a `pro` wordmark — the corner lock carries the tier on its own.

### 8.2 The Train-tab landing
- **Routines and Exercises become half-width, side by side.** Reuse the existing
  `.add-row` / `.btn-split` pattern from rack.css — do not invent a new component.
- **Statistics stays full width** below them, dropped to a ghost button.
- **The Coach card goes above Start workout**, same component as the You card in a
  tighter form.

### 8.3 The COACH ME sheet
Opens as a **bottom sheet, like Log food** — not a route like Start workout. Taller than
the Log food sheet. Reuse the existing `sheet()` helper (`settings.js:118` shows the
pattern).

Contents, top to bottom:
- Coach's opening bubble: the top-ranked real finding, already on screen when it opens
- preset bubbles, **one per tab**: Train, Fuel, Weight. **Steps gets no bubble** but must
  answer if reached as a follow-up.
- tapping a bubble answers **immediately** — never a submenu — and renders two or three
  follow-up bubbles generated from that answer
- a not-medical-advice line at the bottom

**No text input tonight.** The router exists and is exercised by the buttons; ship three
puts a box in front of it.

**Nothing in the sheet persists.** It rebuilds on every open. Coach keeps no history of
its own output — the user's data is the only state.

### 8.4 Settings → Coach
A new section in `openSettings()` (settings.js:118, five sections in fixed order: You,
Fuel, Train, Steps, App). Add **Coach** after Train. One toggle per §3.7 category,
excluding `core` and `safety`, which are not mutable. Writes to `settings/coach.mute`
per §3.1.

---

## 9. THE ROTATING LINE

A pool of short lines, **max five words**, no exclamation marks, that rotates on each
app open.

Two kinds in one pool: generic warm ones, and data-aware ones ("Nine days since chest.",
"Three in a row.", "Bench is moving."). **A data-aware line that passes its gate always
beats a generic one.** Never the same line twice running — `settings/coach.lastGreet`
holds the last id.

The line must never contradict the finding below it. If the finding is a caution, the
greeting does not cheer.

---

## 10. VERIFIERS YOU MUST ADD

Under `tools-check/`, in the existing style — drive the real modules against a stubbed
Firebase, no copy of any rule inside them, exit 0 on pass.

Note the local conventions: `refused-write.mjs:166` names its counter `fail_` to avoid a
collision; `month-erasure.mjs` deliberately contains a section that must FAIL. Don't
"fix" either into a common shape.

```
coach-tags.mjs      §4: vocabulary, completeness, group agreement, id-set equality
coach-registry.mjs  no duplicate fact id; every intent's factsNeeded resolves; every
                    category maps to exactly one toggle; every question id is
                    referenced by at least one rule; no two intents share a response
coach-rank.mjs      the §6 ranking rule: band 1 is unreachable by findings, ties are
                    impossible, supersedes is honoured, muted categories vanish,
                    free-tier filtering counts correctly
coach-pure.mjs      coach.js imports nothing impure, contains no Date.now(), no DOM,
                    no store/analytics-state import — the verbatim-port guarantee
coach-units.mjs     THE IMPORTANT ONE. Every response template that prints a weight
                    routes through units.js, and no template hardcodes a pounds
                    threshold in an English phrase (§1)
coach-silence.mjs   every rule stays silent when its min-data gate fails; a thin
                    account produces card_state_thin and nothing else
```

---

## 11. THINGS YOU WILL FIND. DO NOT FIX THEM.

Log each in BACKLOG.md and name them in the handoff. They are out of scope and a run
that wanders into them has scope-crept.

- `rateVerdict` has no magnitude guard (§5.1). Micah's call, separate change.
- `insights.js:283` population claim; `insights.js:541-551` prescriptive takeaways.
- `store.js:706 read()` folds "absent" and "unreachable" into one fallback.
- `store.js:762 mergeUpdate()` swallows PERMISSION_DENIED silently.
- `analytics.js:166` — an exercise logged with warm-ups only yields an index entry with
  `sessions: 0` and every best at 0. Coach must skip these; don't change analytics.
- `record.groups` is built from `collectFrom` output filtered on `s.done && s.r !== ''`
  (workout.js:1298), **not** on `isWorking` — so it counts warm-ups. **Derive groups
  fresh in Coach; never trust `record.groups`.**
- A second session on the same day is invisible to live-session facts. Out of scope
  tonight (ship three), but note it.
- The You tab already issues ~7 live GETs per render. **Coach must not add per-render
  reads.** Compute from what's already loaded; if you need more, load once and cache in
  `coach-data.js`, never per paint.
- Water is an entire domain Coach does not cover (its own node, its own units, its own
  You card). Deliberate — out of scope for all three ships until asked.

---

## 12. DEFINITION OF DONE

1. Both syntax loops clean.
2. Every pre-existing `tools-check/*.mjs` still exits 0, plus the six new ones.
3. `sw.js` and `usage.js` both read `rack-v42`.
4. `database.rules.json` **unchanged** (§3.1).
5. `coach.js` passes `coach-pure.mjs` — it is copy-verbatim ready.
6. Commits are small and each one builds. Do not push.
7. `NEXT-NATIVE-V42.md` written: file-by-file, what the native port must copy verbatim,
   what it must rewrite, and the `settings/coach` PROPOSED-rules follow-up.
8. `COACH-REPORT.md` written: what got built, what you changed your mind about and why,
   every assumption you made, and anything in this brief that turned out to be wrong
   about the code. **This file is the most valuable thing you produce after the code
   itself.** Be specific and be honest about what you did not finish.
9. The five-line handoff.

## 13. IF YOU GET STUCK

Do not guess and do not silently narrow scope. Build what you can verify, and put
anything you could not finish at the top of `COACH-REPORT.md` with the reason. A run
that finishes 70% and says so precisely is worth far more than one that claims 100%.

Priority order if you run short: **coach.js + the registry + verifiers** first, **the
You card** second, **the Train layout** third, **the sheet** fourth, **Settings**
fifth, **the tag sidecar** last (it's inert until ship two).
