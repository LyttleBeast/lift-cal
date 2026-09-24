# Porting rack-v49 to rack-mobile

Web shipped as `rack-v49`. The tree it mirrors is `~/dev/rack-mobile`.

v49 is **Coach trainer, stages two and three.** Stage two, *plateau or cut?*: a
new pure module (`coach-overlap.js`) that reads a flat lift against the
bodyweight, the frequency and the sets beside it — a real plateau and the rung
of the stall ladder, a cut that is holding, a slide, trained too rarely to say,
or "Coach needs weigh-ins" — plus the lighter week, the record day and *How are
my lifts moving?*. Stage three, *the card and the goal*: the card becomes one
earned line from his own log while the sheet opens on the finding; the sheet
adapts to before and after a workout; *How did today compare?*, *What's next
time?*, *How am I tracking toward my goal?*; a lift target and a focus group
under Your goal; the *did your goal change?* questions; a training-goal step in
onboarding; one real target for Basic. The build brief is `SHIP-V49-PROMPT.md`;
the design record `COACH-TRAINER-SPEC.md`; what was built and every place it
departs from the brief, `COACH-REPORT.md` §49–§57.

**`rack-mobile` was NOT read this time.** The run was fenced to
`~/dev/ship-v49`, and another run was porting v48 there the same night. Every
native path below is carried from `NEXT-NATIVE-V48.md` (which carried V46's,
read at `13f6b80`), and is **unverified at whatever native is now**. This file
is the delta on top of V48: port V48 first.

**What is stored:** one new key, `settings/coach/goalLift`, three new answer ids
(`q_focus_group`, `q_goal_check_weight`, `q_goal_check_targets`) with their
`asked` stamps, and one new category id under `mute`, `rest`. All children of
the already-granted `settings/coach`: `database.rules.json` and the
OPTIONAL-LOCK file are byte-identical to rack-v48. And one new device key,
`coachHype`, beside `coachOpens` and `coachGreets`. See §4 for the PROPOSED
rules.

---

## ⚠ THE PINS

Unchanged since rack-v48:

```
units.js       fa6f03c9b2a097821c194af2be8e9711da5f940f3a35850d17897c77da4f6da5   unchanged since rack-v41
exercises.js   74ac8a9885376b79940daa6a184dfed14bfa4e32d2226e4e367db53dfd9d9857   unchanged
coach-tags.js  846501595feb06fddc7d85fb19ed526bc6c6cc69cecc5b7e9494eb96bd8c8a06   unchanged since rack-v42
analytics.js   f6054ad6590fe45268113b019ee78ec52462a84ee1db26246f0d37d5c3c2146a   unchanged since rack-v47
blocks.js      1fd10b3b82aa89082dee1675120d5a39fe7c21e7f7232b1930b6ce233a1fbbaf   unchanged
coach-live.js  877528f81150c0553f2d81188198d2535c9321ea74c80049e1f7ad324038e1d9   unchanged since rack-v46
coach-build.js 61099b193a2f3ef9bf1ba5082271b8a1f602c0b390148895ebcf9a3c6c49f4ab   unchanged since rack-v48
accounts.js    f89af13550da39c24a643ea411b8f8c820202bf605aa990aab15f2d64506d471   unchanged
tdee.js        83c2e76b71cfa2f6c8260fae807182e0682af48459bcd30b7be9eb9c4d48fe3d   unchanged
```

**The files the port copies verbatim that changed or arrived:**

```
coach-overlap.js  39a1e0fbdf90b6c57c8ee97ccf5f179b463834076135e709ca118ba4eb3d703e   NEW — copy to src/pure/, 1,096 lines
coach-goal.js     6cd88a72e932ad060fe456121372dc483525ec28ca0c5d067c3aa58f41382048   CHANGED — re-copy, 287 lines (v48: 2cc6950…)
coach-prog.js     b188e5db37601745b6ccedfc5ca4c0d9372050c9e457d0662fb2836e4bd257f6   CHANGED — re-copy, 926 lines (v48: e5b7e8b…)
coach.js          37f41bc06da46a446b0d29db546d70614866fa2eb19018dd4743440f59ab43f8   CHANGED — re-copy, 4,108 lines (v48: 3114cc1…)
```

`coach-prog.js` changed ADDITIVELY: `baselines()` returns more, and nothing it
returned before moved. `prescribe()` is byte-identical to rack-v48's on every
battery row and on 4,400 generated histories (`tools-check/coach-prog.mjs`
section D proves it against v48's own file, read out of git). A native tree
that has not taken v48's `coach-prog.js` yet can take this one instead.

---

## 1. `coach-overlap.js` — new, pure, copy verbatim to `src/pure/coach-overlap.js`

**Imports**, all of which native has under `src/pure/` once V48 lands:

```
./coach-prog.js   baselines, prescribe, exposuresFor
./coach-goal.js   bwAt, energyBand, volumeFloor, paceFor
./units.js        labelW, labelRate, wOut
./exercises.js    GROUPS, GROUP_ORDER
./coach-tags.js   tagsFor
./analytics.js    e1rm                     (session math only)
```

It never imports `coach.js`, `coach-build.js` or `coach-live.js` — `coach.js`
imports IT. No clock (`now` is an argument), no randomness, no DOM, no module
state: the one memo rides on the prepared input object as a non-enumerable
property and dies with it. `tools-check/coach-pure.mjs` section J fences it.

```js
prepare(input)                        → the input with each lift's exposures counted once
readLift(ex, ctx, input)              → { call, … , text, reason }  // or { call: 'none', because }
lighterWeek(input, now)               → { conds, declining, groups, text, reason } | null
recordDay(input, now)                 → { exId, reps, load, w, …, text, reason, unseen } | null
liftsMoving(input, now)               → [{ exId, text, reason }]   // up to five
targetsReplay(input, shapedSession)   → { n, met, lifts } | null
compareSession(input, shapedSession, now) → { summary, above, below, rows, day } | null
nextTargets(input, shapedSession, now)    → [{ exId, mode, text, reason }]
liftTrend(input, now)                 → { exId, name, gainLb, weeks, … } | null
goalLiftRead(input, goalLift, now)    → { target, logged, pace, e0, closed, read, … } | null
bigThree(input, now)                  → { lifts, total } | null
focusRead(input, group, now)          → { group, recent4, normal, lifts } | null
```

`input` is what `coach.js` builds (`overlapOf()`, exported for the verifiers as
`overlapInput()`): `{ now, u, aim, exp, energy, rateWk, goalDir, goalRateWk,
targetsOn, shaped, weighIns, lifts, hidden }`. **`shaped` is `coach.js`'s own
shaped sessions** — the per-group working-set count (`sets[g]`) and, new in
v49, the F sets (`fsets[g]`) — so "chest sets" is one number everywhere. A
native `coach.js` that is the verbatim copy produces exactly this.

`call` is one of `irregular`, `fatigue`, `holding_cut`, `small_slide`,
`sliding`, `plateau`, `unknown`, `none`. A plateau carries `rung`: `reset`,
`wait`, `volume`, `variation` or `none`.

### 1.1 The rules a port is most likely to "improve"

- **A wrong reading is worse than none.** Four sessions across three weeks in
  the six-week window, or `none` ("too soon to call"). No weigh-ins at an end of
  the window, `unknown` — never a guess at whether a cut explains it.
- **Relative strength decides a cut**, and past a 5% drop in the estimated max
  it is a slide whatever per-pound says. Do not relax either.
- **"Cut" is his word.** A falling weight reads "cut" only on aim `cut` or
  `recomp`, or food targets set to lose (`goalDir` −1). Otherwise "your weight
  has come down".
- **A normal is read over WHOLE weeks only** (§3.4's group fatigue, the ladder's
  volume, the lighter week). A week before the log began is not a zero; a week
  the log only partly covers is not a whole week. Counting them read every
  ordinary fortnight of a young log as a spike (`COACH-REPORT.md` §52).
- **A record day is a rep record at a weight he has lifted**, three reps or
  more, never a single, a double or a max attempt; never after an F; never in a
  hard cut; never on a kilo account's pound-typed (off-grid) load.
- **"Hard sets" are `shapeSession()`'s `sets[g]`**, cardio sets included — the
  shipped count, deliberately. Do not "clean" it on one side only.

## 2. `coach-goal.js` — re-copy it

Still imports nothing. New, all exported and frozen where they are tables:

```js
energyBand(pct)                   → 'deep' | 'deficit' | 'hold' | 'surplus' | null   // energyContext now reads through it
bwAt(weighIns, ms)                → median lb of the 7 days up to ms, 2 readings at least, or null
VOLUME_FLOOR, volumeFloor(aim, normal)   // 10 build/recomp/none; 6 strength/powerlifting/maintain; cut ⅔ of his normal
AIM_DIR                           // cut −1, muscle +1, recomp/maintain 0, strength/powerlifting null
normGoalLift(v)                   → { exId, lb, reps, at } | null   // fails safe on every junk value
paceFor(points, target)           → { current, reached, perWk, lowWk, weeks: [fast, slow] | null, over }
weeklyBands(weighIns, now), goalChecks({ aim, weighIns, now, goalRateWk }) → { weight, targets, weeks }
```

## 3. `coach.js` — re-copy it

- Imports `coach-overlap.js`; `coach-goal.js` adds `normGoalLift`, `goalChecks`,
  `AIM_DIR`.
- **Category `rest`** ("Rest and lighter weeks"), directly after `recency`.
  Every later category's index moves by one; relative order unchanged.
- **`stateOf(input, now)`** (exported): `live` | `post` (last session ended ≤ 3
  h ago) | `done_today` | `pre`. `c.state`.
- **`c.card = { you, train }`** — what each card shows: an earned line
  (`state: 'earned'`, `text`, `reason` = its evidence clause) from the **`HYPE`**
  registry (twelve lines, exported, frozen), or the shipped blocking and
  fall-through states. **`c.you`, `c.train` and `c.opening` are unchanged**: the
  sheet still opens on the ranked finding. The line rotates on `input.opens`
  with a device memory `input.recentHype` (last three ids), capped exactly like
  the greeting's.
- **`c.teaser`** — Basic only: `{ text: 'One of your targets: … — Target: …', reason }` or null.
- **`GREETINGS`** loses `g_since_group` and `g_away`.
- **Topics**: `STATE_TOPICS[surface][state]`, `TOPICS_SHOWN` (4), `ALL_TOPICS`;
  `topicsFor(surface)` is state-aware and stays a flat list. In `done_today`
  the `ask_shape` topic's label is *What should I train next?*. The card's lead
  question draws only from general topics the state's sheet offers.
- **Intents** `lift_status`, `record_day`, `session_compare`, `next_targets`,
  `goal_pace` (Pro selectors, sheet) and `lighter_week` (Pro finding, sheet,
  category `rest`, supersedes `recent_pr` and `pr_proximity`). Routes
  `ask_lifts`, `ask_record_day`, `ask_lighter`, `ask_compare`, `ask_next`,
  `ask_goal`. `stalled_lift` keeps its id and fact but now also needs
  `lift.stallRead` (stage two's reading of that lift) and answers with it.
- **Questions** `q_focus_group` (`always`, `where: 'goal'`, carried under
  `ask_goal` the way `ask_targets` carries the aim), `q_goal_check_weight` and
  `q_goal_check_targets` (the opener; Pro only; `text` a FUNCTION of the log;
  `stale(answer, askedAt, d)`; `settings: false`). The question machinery:
  `pendingQuestion()` counts a stale answer as unanswered, and `questionView`
  resolves a function `text` with his numbers.
- **`normSettings()`** adds `goalLift` only when `normGoalLift()` accepts it.
- `c.goalChoices()` — the lifts a target may be set on (his own, 182 days, top
  thirty by sessions).

## 4. `settings/coach` — the PUBLISHED rules take everything; the PROPOSED ones may not

The published `database.rules.json` does not mention `coach`: `settings` has a
section-level `.write`, so every v49 key lands today. **No rules change, and
none may add an `$other` deny at the `settings` level.**

If `web-patches/database.rules.PROPOSED.json` validates `settings/coach` key by
key (V43 §5's shape ends in `"$other": { ".validate": false }`), **v49 needs:**

```json
"goalLift": {
  ".validate": "newData.hasChildren(['exId', 'lb', 'reps', 'at'])",
  "exId": { ".validate": "newData.isString() && newData.val().length <= 120 && newData.val().matches(/^[a-z0-9][a-z0-9-]*$/)" },
  "lb":   { ".validate": "newData.isNumber() && newData.val() > 0 && newData.val() <= 2000" },
  "reps": { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 20" },
  "at":   { ".validate": "newData.isNumber() && newData.val() > 0" },
  "$other": { ".validate": false }
}
```

and, if `answers` / `asked` / `mute` have been narrowed to enumerated ids or
values, these join them:

- answer ids `q_focus_group`, `q_goal_check_weight`, `q_goal_check_targets`
  (and the same three under `asked`);
- answer values `chest`, `back`, `legs`, `shoulders`, `arms`, `core`, `none`,
  `update`, `temp`, `keep` (all well under V43's 20-character bound);
- the `mute` category id `rest`.

**PROPOSED, not published** — Micah publishes rules; nothing here does.

## 5. The surfaces — where each web change lands on native

Native paths are V45's, unverified.

| web | native destination | what it needs |
|---|---|---|
| **the card reads `c.card`** | `src/ui/coach/card.jsx` (the You and Train cards) | the main line is `c.card.you.text` (Train: `c.card.train`), the small line its `reason`; the greeting as before. Once per app open, write the You card's earned id to device storage `coachHype` (newest first, three deep) — MMKV, beside `coachGreets`, never `settings/coach` |
| the sheet's opening bubble | `src/ui/coach/sheets.jsx` | unchanged: `c.opening` |
| **"More"** | same | draw the first `TOPICS_SHOWN` topic chips, then a *More* chip that, tapped, removes itself and appends the rest in place — no new sheet |
| the new answers | same | draw `a.more` after `a.text`, one bubble each, as Patterns already does; `ask_goal` may carry `a.question` (the focus group), drawn like the targets answer's question |
| *Yes, update my goal* | same | answer `update`, then open Your goal (web opens a small Your goal sheet; native can route straight to the Settings section) |
| the aim, anywhere | `src/ui/coach/*`, onboarding | through **`setAim(aim)`** — one write of the aim, `asked.q_goal_aim` and `null` for both goal-change answers — never `answerQuestion('q_goal_aim', …)` |
| Settings → Coach → Your goal | `src/ui/coach/settings.jsx` | the focus question appears by itself (`always: true`, seven choice rows); the goal-change questions must NOT (`settings: false`); a **Lift target** row: a select of `c.goalChoices()`, a weight box in the display unit (stored via `wIn`), reps 1–20, Save (`setGoalLift({ exId, lb, reps, at: now })`) and Clear (`setGoalLift(null)`). **rack-v50's wording, copy it:** a line under the Lift target heading ("A lift you want to hit: the weight, and how many reps at that weight. 1 rep is a one-rep max."), a visible caption over each box ("Target weight (lb)" / "Reps at that weight"), and a line under the focus question ("Coach reports this group’s weekly sets and its main lifts when you ask how you’re tracking toward your goal.") — v49's unlabelled reps box with its 1 read as the target weight on Micah's phone |
| the *Rest and lighter weeks* switch | same | appears by itself if the list walks `CATEGORIES` |
| onboarding | native's setup flow | after the weight-goal step, *What are you training for?* — `q_goal_aim`'s six options as choice rows and *Skip for now*; on finish, `setAim(aim)` in its own try (a failure is not setup failing). Nothing into the `onboarding` node |
| the Basic teaser | `src/ui/coach/sheets.jsx` | Basic only: `c.teaser.text` as a Coach bubble above the Pro panel |
| `coachInput()` | `src/data/coachData.js` | pass `trendRate()`'s `seWk` as `weight.rateSeWk`; pass `recentHype` from MMKV. Nothing new is read from the database |

## 6. The verifiers

Three new, one new battery, several changed on purpose; every other Coach
verifier given the staging edit (stage `coach-overlap.js` beside
`coach-build.js`).

| | |
|---|---|
| `coach-overlap.mjs` | NEW. The brief's table: C1–C13 (with C1b, C3b, C3c and a C1 at two a week), P1–P5, L1–L2 — **ok 24, miss 0, wrong 0**. 2,200 generated histories with weigh-ins against the properties. The wiring end to end. Drives `coach.js`'s `overlapInput()`, so it needs the verbatim `coach.js`. **Ports.** |
| `coach-hype.mjs` | NEW. Every earned line true and false in both units, the limits, the card ban, rules 3 and 4, rotation on pools of 1/2/3/5, the targets replay against `prescribe()` by hand. **Ports.** |
| `coach-state.mjs` | NEW. `stateOf()` at its edges; the topic tables in every state. **Ports.** |
| `coach-pace.mjs` | NEW. The goal answer, `normGoalLift`, G1–G8. Section F drives web's `coach-data.js` against a stub; native re-points it at `coachData.js`. |
| `coach-prog.mjs` | + D: v49's fields consistent with status; `prescribe()` byte-identical to rack-v48's (git). Still 57/0/0. |
| `coach-pure.mjs` | + J (`coach-overlap.js`'s fence); coach.js may import it; I gains `bwAt`/`energyBand`. |
| `coach-voice.mjs` | F rewritten (the stall answer is the reading); + K (`CARD_BANNED`; the new answers). |
| `coach-rank`, `coach-rotation`, `coach-goal`, `coach-registry`, `coach-silence`, `coach-surface` | changed deliberately, each with its reason in place. `coach-surface` is web's view layer and does not port. |

## 7. What to run

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Both clean at rack-v49 under `TZ=America/New_York`, `UTC` and
`Pacific/Auckland`: 38 verifiers, all exit 0. `coach-prog.mjs` D and
`coach-build.mjs` M read old commits, so they need a full clone.

## 8. If the port reads one thing in this file

§1.1. The plateau-or-cut call is the most emotionally loaded thing Coach says,
and every rule there is a way it stays silent rather than guesses. Then §4
before anybody publishes the PROPOSED rules.
