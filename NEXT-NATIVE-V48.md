# Porting rack-v48 to rack-mobile

Web shipped as `rack-v48`. The tree it mirrors is `~/dev/rack-mobile`.

v48 is **Coach trainer, stage one — targets.** Per lift, the weight and reps for
next time, deterministic, from the account's own history: a new pure engine
(`coach-prog.js`), a goal that is two answers to Coach's own questions and the
dials those answers turn (`coach-goal.js`), a target line under every exercise
in a builder proposal, a fifth button — **Start with Coach’s targets**, first and
primary whenever there are targets — a Train bubble, **What should I lift
today?**, and **Your goal** in Settings → Coach. The design record is
`COACH-TRAINER-SPEC.md`; the build brief is `SHIP-V48-PROMPT.md`; what was built,
and the one place it departs from the brief, is `COACH-REPORT.md` §40–§48.

**`rack-mobile` was NOT read this time.** The run was fenced to
`~/dev/ship-v48` and a read of `~/dev/rack-mobile` is refused. Every native path
below is carried from `NEXT-NATIVE-V46.md`, which carried it from V45 (read at
`13f6b80`, and `581e84a` for `coachData.js`), and is **unverified at whatever
native is now**. Check before acting.

Read `NEXT-NATIVE-V42.md`, `V43`, `V45` and `V46` first; this file is the delta.
There was no `NEXT-NATIVE-V47.md`: v47's one change to a copied file was
comments in `coach.js` (see the pins).

**What is stored:** nothing new. The goal is two new values under the existing
`settings/coach/answers` — `q_goal_aim` and `q_experience` — with their `asked`
stamps, and one new category id under `settings/coach/mute`, `targets`. No new
node, no new top-level key, and `database.rules.json` and the OPTIONAL-LOCK file
are byte-identical to rack-v47. See §6 for the PROPOSED rules.

---

## ⚠ THE PINS

```
units.js      fa6f03c9b2a097821c194af2be8e9711da5f940f3a35850d17897c77da4f6da5   unchanged since rack-v41
exercises.js  74ac8a9885376b79940daa6a184dfed14bfa4e32d2226e4e367db53dfd9d9857   unchanged
coach-tags.js 846501595feb06fddc7d85fb19ed526bc6c6cc69cecc5b7e9494eb96bd8c8a06   unchanged since rack-v42
analytics.js  f6054ad6590fe45268113b019ee78ec52462a84ee1db26246f0d37d5c3c2146a   unchanged since rack-v47
blocks.js     1fd10b3b82aa89082dee1675120d5a39fe7c21e7f7232b1930b6ce233a1fbbaf   unchanged
coach-live.js 877528f81150c0553f2d81188198d2535c9321ea74c80049e1f7ad324038e1d9   unchanged since rack-v46
accounts.js   f89af13550da39c24a643ea411b8f8c820202bf605aa990aab15f2d64506d471   unchanged
tdee.js       83c2e76b71cfa2f6c8260fae807182e0682af48459bcd30b7be9eb9c4d48fe3d   unchanged
```

`analytics.js` is the web file whose PURE half native keeps under `src/pure/`
(e1rm, isWorking, mergeSessionExercises, exerciseIndex); the pin is web's whole
file, so compare the functions, not the hash, if native's copy is the pure half
alone. None of those four functions changed in v48.

**The files the port copies verbatim that changed or arrived:**

```
coach-goal.js  2cc6950acc3ddb6cf645764e2c2d8b59aa08ca8734ce3f01f44edd7dcbdf7584   NEW — copy to src/pure/, 118 lines
coach-prog.js  e5b7e8b38a4ab75c20e86753e06f583769684b05013a148aa9677ec88e3c68ee   NEW — copy to src/pure/, 887 lines
coach.js       3114cc125160a61e0fcd38fd503bca230479af9c7026183edf0660c05199b37c   CHANGED — re-copy, 3,058 lines
coach-build.js 61099b193a2f3ef9bf1ba5082271b8a1f602c0b390148895ebcf9a3c6c49f4ab   CHANGED — re-copy, 729 lines
```

`coach.js`'s V46 pin was `6a80c98…`. rack-v47 moved it to `4668dfd…` with a
comment change only (the rate band's note); if native holds `6a80c98…`, nothing
behavioural is missing from v47, and v48's copy replaces both.

---

## 1. `coach-goal.js` — new, pure, copy verbatim to `src/pure/coach-goal.js`

Imports nothing. The six aims (`AIMS`), the three experience answers
(`EXPERIENCE`), the dials table (`DIALS`: a row per aim plus `none` — confirm
once or twice, one jump or two, the starting rep bands for compound and
isolation lifts), the energy thresholds (`ENERGY_DEEP` −0.75, `ENERGY_DEFICIT`
−0.25, `ENERGY_SURPLUS` +0.25 %/week, `ENERGY_MIN_DAYS` 14, `ENERGY_EPS`), and
two functions:

```js
energyContext({ rateWk, latestLb, rateDays }) → 'deep' | 'deficit' | 'hold' | 'surplus' | null
dialsFor({ aim, exp, energy, slowSlope, fastSlope }) → { confirm, maxSteps, band }
```

Every exported table is frozen. `tools-check/coach-goal.mjs` A–D port as they
are; E stages `coach.js` web-style (see §7).

## 2. `coach-prog.js` — new, pure, copy verbatim to `src/pure/coach-prog.js`

**Imports**, all of which native already has under `src/pure/` once §1 lands:

```
./analytics.js   e1rm, isWorking, mergeSessionExercises   (session math only)
./units.js       wOut, wIn, fmtSetLoad, unitW, labelW, labelRate
./exercises.js   GROUPS
./coach-tags.js  tagsFor
./coach-goal.js  dialsFor
```

It never imports `coach.js` or `coach-build.js` — `coach-build.js` imports IT.
No clock (`now` is on the context), no randomness, no DOM, no module state.
`tools-check/coach-pure.mjs` section H fences all of that.

```js
exposuresFor(sessions, exId) → [{ startedAt, date, sets, allSets }]   // oldest first
prescribe(ex, ctx) → null | target
  ex  = { exId, name, group, equipment, exposures, groupDaysSince }
  ctx = { now, u, aim, exp, energy, rateWk }
baselines(ex, ctx) → { exposures, range, step, status, slope, sigma } | null   // for stage two
sessionDay(date, daysAgo) → "yesterday’s session" | "your Tue, Sep 16 session" …
```

A target:

```js
{ exId, mode,          // 'add' | 'reps' | 'hold' | 'reduce' | 'reenter' | 'first' | 'bodyweight' | 'defer'
  code,                // 'confirm' | 'miss' | 'back' | 'shape' | 'heavy' | 'erratic' | 'range' | null
  loadLb,              // stored pounds (number), or null when no number is named
  sets: [{ type, tw, tr }],   // one per set of the lift's last session; [] on defer and first
  line, why: [ … ],    // one sentence; its evidence, one entry each
  stage, range, step, status, slope, from: { date, daysAgo } }
```

### 2.1 The rules a port is most likely to "improve"

- **Every weight named is a load he logged on this lift, or at most two of this
  lift's own steps from the last top load** — or, coming back after a layoff
  only, up to six steps BELOW it. Never a percentage of anything. Do not add a
  rounding to the nearest plate: an unknown step is no number, "the next setting
  up", and that is the whole answer.
- **A target with no number keeps last time's weight as its ghost.** A blank
  weight box is recorded as `'0'` — a bodyweight set — so a blank `tw` on a
  loaded lift would put a wrong number in the log the moment he ticks.
- **Every comparison is in the display unit**; storage stays pounds. `tw` is
  stored pounds as a string exactly like `w` (on kilos, the kilo target
  converted once: 102.5 kg is `"225.97"`). A kilo account whose loads were typed
  in pounds gets NO numbers from them (off the 0.5-kg grid) — that is correct.
- **The heavy gates come before the layoff gate.** A single, or a lone top set of
  three or fewer, defers — even after 18 days off, so an old single never comes
  back as "405 for 1".
- **The two layoff clocks** (Micah's 23 Sep answer): the muscle GROUP's clock
  (`groupDaysSince`, coach.js's `group.daysSince`) sets how far back to start —
  over 30 days near 80%, 15–30 near 90% — and the lift's own clock holds it: a
  lift not done in 12+ days gets no jump its first time back, even if the group
  has been trained.
- **Sets past twelve reps count as twelve in the estimated-max series.** This
  departs from the brief's §6.8 on purpose — leaving them out let one rep fewer
  turn a hold into a jump. `COACH-REPORT.md` §40. Do not "fix" it back.
- **Assisted lifts run backwards** (progress is less help) and name no number on
  a reduction or a re-entry.
- **Status is computed and never printed.** Do not surface it.

## 3. `coach-build.js` — re-copy it

It imports `coach-prog.js` now. Each proposal row gains **`target`** —
`prescribe()` over that lift's exposures across the WHOLE log (not only the base
session), with `groupDaysSince = input.groupDays[group]`; `null` when
`input.targetsOn` is false. When the target was built from a different day than
the row's numbers, its `why` gains "Worked out from …, the last time you did this
lift."

The proposal gains **`targets`** — the placeholders' shape (empty `w`/`r`,
`done: false`) with the targets as `tw`/`tr`: a row whose target has sets takes
them, a row without keeps its placeholder sets, a lift in a duplicated block is
split back across its rows only when the sets add up. `null` when no row has a
target with sets. `placeholders`, `lastNumbers` and `record` are byte-identical
to rack-v47's — `tools-check/coach-build.mjs` section M proves it against
rack-v47's own builder read out of git — and so is everything else but `target`
and `targets`.

The input gains three fields (built by `coach.js`, §4): `goal: { aim, exp }`,
`energy: { context, rateWk }`, `targetsOn`.

## 4. `coach.js` — re-copy it

- Imports `coach-goal.js` (aims, experience, `energyContext`).
- **Category `targets`** ("Weight and rep targets"), directly after `build`.
  Every later category's index moves by one and keeps its order.
- **Facts** `coach.aim`, `coach.experience` (each reads its answer; declares
  `usesAnswers`), `weight.energy`, `lift.targets` (the default proposal's
  non-null targets).
- **Questions** `q_goal_aim` (six options) and `q_experience` (three), each with
  `always: true`, `where: 'targets'` and its own `ack`; `q_goal_direction`
  gains `ack` with the shipped line. `pendingQuestion()` skips any question with
  a `where` — they are never the sheet's opener.
- **Intent `lift_targets`** (selector, Pro, sheet, category `targets`), route
  `ask_targets`, label *What should I lift today?*, third in `TRAIN_TOPICS`.
  `FOLLOWUPS.ask_targets = ['ask_build_now']`; `ask_shape` offers it after
  *Build it*.
- `c.ask('ask_targets')` — and no other route — carries **`question`**: the first
  unanswered goal question under the opener's gates (questions not muted, none
  already waiting, the week's cooldown), or null. `c.question` (the opener) now
  carries `ack` too.

## 5. The surfaces — where each web change lands on native

Native paths are V45's, unverified.

| web | native destination | what it needs |
|---|---|---|
| the target line under each proposal row (`.coach-build-target`), tap to show `why` | `src/ui/coach/sheets.jsx`, the proposal block | under the row's note, never merged into it: `e.target.line`, body colour (not dim, never yellow); a tap reveals `e.target.why` in the note's dim type, a second hides it. No new sheet |
| **Start with Coach’s targets** | same | first and PRIMARY when `p.targets` exists, and then *Start it* is second and ghost; with no `p.targets` the row is the shipped four, *Start it* primary. It starts `p.targets` — a copy, exactly as *Start it* starts `p.placeholders` |
| **the tick path** | native's set-check handler | **nothing new** — `tickSet` (V46 §3) already adopts `tw`/`tr` into empty boxes, which is how a target becomes a logged set. If native's handler predates V46 §3, it must land first, or ticking a target set drops it at Finish |
| *What should I lift today?* on Train | wherever native draws `topicsFor('train')` | nothing if it draws the engine's order; draw `a.more` after `a.text` |
| the goal question under that answer | `src/ui/coach/sheets.jsx` | when the answer carries `question`, draw it exactly as the opening question is drawn — the same bubble, chips, `markAsked` on screen, `answerQuestion` on tap — and reply with `question.ack`. Factor the drawing into one function (web's `askQuestion`) |
| the opener's reply | same | print `c.question.ack`, falling back to the shipped line |
| Settings → Coach → **Your goal** | `src/ui/coach/settings.jsx` | on Pro, the questions with `always: true` under a *Your goal* heading, answered or not, nothing selected until answered; more than three options as vertical choice rows (web reuses the onboarding `ob-choice` rows), three or fewer on the segmented control; every other question keeps the shipped rule (shown once answered) |
| the *Weight and rep targets* switch | same | if it walks `CATEGORIES`, the row appears by itself; it must read `!isMuted(settings, id)` |
| Pro panel | wherever native walks `PRO_ADDS` | nothing; it now names *Weight and rep targets* |

## 6. `settings/coach` — the PUBLISHED rules take everything; check the PROPOSED ones

The published `database.rules.json` does not mention `coach`: `settings` has a
section-level `.write`, so `answers.q_goal_aim`, `answers.q_experience`, their
`asked` stamps and `mute.targets` all land today. **No rules change, and none may
add an `$other` deny at the `settings` level.**

The PROPOSED shape in `NEXT-NATIVE-V43.md` §5 (with V46 §6's `on`) validates
`answers` as `"$q": { ".validate": "newData.isString() && newData.val().length <= 20" }`
and `mute` as `"$cat": { ".validate": "newData.isBoolean()" }` — both take v48 as
they stand: the longest answer value is `powerlifting`, twelve characters.
**But if `web-patches/database.rules.PROPOSED.json` has since been narrowed:**

- **an enumerated list of `answers` ids** must gain `q_goal_aim` and
  `q_experience` (and `asked` the same two), or setting a goal is refused
  silently and the Settings row flips back;
- **an enumerated list of `mute` categories** must gain `targets`, or switching
  the targets off is refused silently;
- **an enumerated list of answer VALUES** must take `strength`, `powerlifting`,
  `muscle`, `cut`, `recomp`, `maintain`, `new`, `some`, `years`.

## 7. The verifiers

Two new; seven changed on purpose; twelve given the staging edit.

| | |
|---|---|
| `coach-prog.mjs` | NEW, 76 checks. The brief's table, 57 rows (A1–A45, B1–B4, the A30/A31 exposure cases): **ok 57, miss 0, wrong 0**. 4,400 seeded histories, both units, against 13 properties (deterministic, order-blind, an F never heavier, one rep fewer never heavier, every number logged or within two steps / six below on re-entry, on the grid, never from an off-grid load, assisted, no blank ghost, the kilo round trip, positive, no cardio, empty sets on defer/first). The case that moved the e1RM rule, pinned. The must-never scan over 13,000+ strings. **Ports as-is**: it drives `coach-prog.js` alone. |
| `coach-goal.mjs` | NEW, 47 checks. Every energy boundary, every aim × experience × energy × slope combination against the §5 rules, the table frozen and exported. **A–D port as-is**; E drives `coach.js` end to end (normSettings, the questions' place, an answer turning a target) and ports with native's staging. |
| `coach-build.mjs` | the no-invented-number checks read `placeholders`, `lastNumbers` and `record` (their subject); + M: byte-identical to rack-v47's builder on 70 proposals, the targets view's shape and rules, switched off, kilos. M reads git; native would pin a copy. |
| `coach-surface.mjs` | the button row in both cases, driven; the layoff row with a re-entry target; + L: the target line and its evidence, the question under the answer, Your goal. **Does not port** — web's view layer. |
| `coach-voice.mjs` | the fifth button in G's list; + J: every target line and why (the battery's, imported), the targets answer, both goal questions and acks, under the shipped ban plus the brief's §9 words. Ports, except the `coach-ui.js` slice G reads. |
| `coach-pure.mjs` | coach.js may import `coach-goal.js`, coach-build.js `coach-prog.js`; + H (`coach-prog.js`'s fence, driven) and I (`coach-goal.js`'s). Ports. |
| `units.mjs` | classifies `coach-prog.js`'s one `fmtSetLoad` display site. |

The staging edit — stage `coach-goal.js` and `coach-prog.js` beside
`coach-build.js` — is in `coach-registry`, `coach-rank`, `coach-silence`,
`coach-units`, `coach-patterns`, `coach-live`, `coach-boot`, `coach-rotation`,
`coach-pure`, `coach-voice`, `coach-build` and `coach-surface`. The eight the
brief listed as "must pass unedited" differ from rack-v47 in staging lines only.

## 8. What to run

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Both clean at rack-v48: 34 verifiers, all exit 0. `coach-build.mjs` section M
and three older verifiers read old commits, so they need a full clone.

## 9. If the port reads one thing in this file

§2.1. `coach-prog.js` is copied, not rewritten — and the thing a port will be
tempted to add is exactly what it must not: a rounded percentage after a layoff,
a guessed kilo dumbbell step, a blank ghost where the target names no number.
Every one of those is a wrong number on a bar. Then §6 before anybody publishes
the PROPOSED rules.
