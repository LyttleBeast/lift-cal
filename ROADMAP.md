# Rack — roadmap

Planned changes, with the reasoning behind them. Nothing in this file is built.
It exists so a design decision made once doesn't have to be rediscovered three
months later, and so any agent picking up the repo knows what's coming and why
the obvious approach was rejected.

Read [AGENTS.md](AGENTS.md) first — it's the map of what already exists.

**Status vocabulary:** `talked about` → `designed` → `building` → `shipped`.
A `designed` item has an agreed shape and no code.

| # | Change | Size | Status |
|---|---|---|---|
| 1 | [Steps — a fourth tab](#1-steps--a-fourth-tab) | medium | **shipped** |
| 2 | [Fuel — make the deficit the headline](#2-fuel--make-the-deficit-the-headline) | **small** | **shipped** |
| 3 | [Train — pre-planned routines](#3-train--pre-planned-routines) | large | **shipped** |
| 4 | [Water — goal and tracker](#4-water--goal-and-tracker) | medium | **shipped** |
| 5 | [The maintenance algorithm — overhaul](#5-the-maintenance-algorithm--overhaul) | **largest** | **shipped** |
| 6 | [Targets that follow the scale](#6-targets-that-follow-the-scale) | medium | **shipped** |
| 7 | [Account isolation](#7-account-isolation) | medium | **shipped** |

All seven built on 2026-08-23. Where the shipped version departed from the
plan, the section says so inline — §1 in particular was redesigned once the
multi-user requirement landed.

---

## 1. Steps — a fourth tab

**Status:** **shipped** 2026-08-23

### The constraint that decides the design

Rack is a web page. No browser on iOS can read Apple Health — Safari does not
expose HealthKit and there is no web equivalent. Specifically:

| Wanted | Reality on iOS |
|---|---|
| Read HealthKit from JS | Does not exist, in any browser |
| Generic Sensor API (`Accelerometer`) | Unsupported in Safari |
| `DeviceMotionEvent` | Works, needs `requestPermission()`, **foreground + screen-on only** |
| Background Sync / Periodic Sync / Background Fetch | All unsupported on iOS |

So the app can never *pull* steps, and it can never run a pedometer in the
background. An in-app accelerometer pedometer would only count while you are
looking at it — a novelty, not a step counter. **Ruled out.**

### The design: push, don't pull

The phone writes steps to the database; the app reads the node like it reads
everything else. This is already how an outside food log lands on screen —
`store.js`'s `watch()` keeps the node subscribed, so a step count written from
anywhere appears on the phone in about a second, no refresh.

Nothing about this is watch-specific. Whatever watch gets bought syncs to Apple
Health, and the Health data is what gets pushed. **Buy the watch on its merits;
the plumbing does not care.**

### What changed when a second account appeared

The design below originally had the **agent account** pushing steps into one
subtree. That was wrong the moment more than one person existed: the published
rules let the agent write to exactly one UID, so it could never have worked for
a tester, and handing out the agent password would have been worse.

The replacement is simpler and needed no rule change at all, because the rules
already said the important thing:

```
".write": "$uid === auth.uid || (…)"
```

Every account can already write its own subtree. So the automation **signs in as
that person**. Better: the sign-in response carries `localId`, which *is* their
UID — so one recipe works for every account unmodified. Nobody types an account
id, nobody shares a credential, nothing is per-person except the email and
password they already have.

Manual entry is not the fallback, it is the floor: it works on any phone with no
setup, it is the only thing an Android tester gets without installing something,
and it covers the days an automation misses. Both write the same node, so
automation is a pure upgrade with nothing to migrate.

### Two ways to push

|   | iOS Shortcuts | Health Auto Export |
|---|---|---|
| Cost | Free | ~$5 app |
| Setup | ~30 min, fiddly once | Point-and-click |
| Auth | Can do the two-call token dance from AGENTS.md — **no rule change, no new infrastructure** | Single POST with static headers only |
| Therefore needs | Nothing new | Either a world-writable capability node (rule change) or a small relay that holds the credential |
| Other metrics later | One shortcut per metric | Checkbox list — HR, sleep, active energy |
| Reliability | Manual automation tuning | Handles its own retry/catch-up |

**Leaning Shortcuts**, because it can authenticate as the existing agent account
(`agent@lift-cal.app`) exactly the way `rack.mjs` does: POST to
`identitytoolkit` for an ID token, then `PUT` the day node with `?auth=`. Two
"Get Contents of URL" actions and a "Get Dictionary Value". The agent password
lives in the Shortcut on the phone — the same trust boundary as
`RACK_AGENT_PASSWORD` in an environment. **Published security rules do not
change.** That is worth a lot.

Health Auto Export is the better answer if this grows past steps into heart
rate and sleep, because that becomes a checkbox instead of five more shortcuts.
Revisit if that happens.

### The limitation to accept up front

**Apple encrypts Health data while the phone is locked.** Nothing can read
steps on a locked phone — this bites Shortcuts and Health Auto Export equally,
it is not a workaround problem. Both catch up on the next unlock. In practice
the number lands within minutes of picking up the phone.

Rack must therefore treat today's step count as *stale by default*. Show the
`t` timestamp, or a quiet "as of 4:20 pm", rather than implying live.

### Watch-buying notes (time-sensitive — written 2026-08-23)

Do not pick a watch for its API. Direct vendor APIs are in a bad state:

- **Fitbit** — the Web API **shuts down September 2026**, i.e. next month.
  Replaced by the Google Health API, which gates every scope behind a privacy
  and security review with a queue. Existing OAuth tokens do not transfer.
  Buying a Fitbit for API access right now would be buying a dead integration.
- **Garmin** — no personal API at all. The Connect Developer Program requires
  applicants to be a legal entity and explicitly rejects individuals.
  Unofficial libraries reverse-engineer the login and break without warning
  (`garth` was deprecated March 2026). Garmin does sync to Apple Health, so the
  Health route works fine.
- **Apple Watch** — cleanest. Native to Health, nothing to integrate.
- **Whoop / Oura** — genuinely individual-friendly APIs, but subscription
  hardware, and step counting is not what either is for.

Conclusion: any of them works through Apple Health. Pick on comfort, battery
and price.

### Proposed schema

```
users/{uid}/steps/{YYYY-MM-DD} → { steps, mi, t, src }
```

```json
{
  "steps": 8421,
  "mi":    3.7,
  "t":     1756000000000,
  "src":   "shortcut"
}
```

| field | |
|---|---|
| `steps` | integer, whole-day total as of `t` |
| `mi` | optional, distance in miles |
| `t` | ms epoch — when the reading was taken, **not** when the day ended |
| `src` | `shortcut` \| `hae` \| `manual` |

`PUT` the day node — it is a whole record being replaced, and later pushes on
the same day legitimately overwrite earlier ones. **Never `PUT` the `steps`
container**, per house rule 4.

Optional companion node for the tab's goal ring:

```
users/{uid}/steps/settings → { goal: 10000 }
```

Careful: that puts a non-date key inside the date-keyed container. Better as
`users/{uid}/settings/steps` to keep `steps/` uniformly `{date: record}` — that
matters because every read will want to iterate it by date.

### App-side changes

A fourth tab is cheap here. The dock is `display: flex` with `flex: 1` buttons,
so it reflows on its own — no CSS column count to change.

| File | Change |
|---|---|
| `index.html` | `<section class="view" id="view-steps">` + a fourth dock button with an icon |
| `app.js` | `initSteps()` in the boot chain, `renderSteps()` in `switchView` |
| `steps.js` | **New.** The tab. Imports `store.js` + `ui.js` (+ `analytics.js` for chart builders) |
| `sw.js` | Add `steps.js` to the cache list, bump the cache name |
| `AGENTS.md` | Document the `steps/` node and the push recipe |
| `README.md` | Files table, feature bullet |

Import graph stays acyclic: `app.js → steps.js → analytics.js → ui.js`. Do not
let `steps.js` import `tdee.js` — see below.

### The trap: do not feed steps into TDEE

`maintenance()` in `tdee.js` is an empirical energy-balance model — average
logged intake minus scale trend × 500. **Activity is already inside that
number.** Walking more moves the scale, which moves the estimate. Adding a step
term would double-count and quietly push the cut/maintain/gain bands wrong on
the Fuel calorie bar.

Steps are *context*, not an input. The legitimate use is explanatory: "maintenance
is up 200 this week — you also averaged 4k more steps a day." That is a display
join on two independent numbers, not a change to the math.

If a step-based TDEE is ever wanted, it belongs as a clearly separate second
estimate with its own label, never merged into this one.

### Open questions

- Is the tab worth it at one number a day, or does it need to earn the slot —
  weekly chart, streaks, goal ring, walk-vs-training-day split?
- Backfill: Health holds years of step history. Worth a one-time bulk import
  like `importer.js` does for Liftoff?
- Does the feed node (`feed/wH7l…`) start carrying today's steps too?
- Should a training day suppress the step goal, or is that over-thinking it?

---

## 2. Fuel — make the deficit the headline

**Status:** **shipped** 2026-08-23 · small

### What's wrong

`renderSummary()` in `food.js` puts `targets.cal - t.cal` in a 40px number with
the eyebrow "kcal left". The number that actually matters — how far under
maintenance the day is — is buried at the bottom of the calorie meter in
`cal-status`, in body text, as `In a deficit · 633 under maintenance`.

The goal of the cut is the deficit. The target is an arbitrary number typed into
settings once. The arbitrary one is 40px and the real one is 12px.

### The swap

| | now | after |
|---|---|---|
| Hero (40px) | `893` — kcal left vs target | `633` — under maintenance |
| Hero eyebrow | `kcal left` | `under maintenance` / `over maintenance` / `within N of maintenance` |
| Hero colour | red if over target, chalk otherwise | the zone colour, same as the bar fill |
| Sub | `1,807 / 2,700` eaten vs target | `893 kcal left · 1,807 / 2,700` |
| `cal-status` line | carries the deficit sentence | drops to just `maint 2,440 est.` |

Colour comes from the same expression the bar fill already uses — `p-blue`
cutting, `p-yellow` holding, `p-red` gaining — so the headline and the bar can
never disagree.

### The edge case that decides the design

`renderCalMeter()` computes `z = mi ? calorieZones(mi.cal) : null`, and `z` is
null when there's no pinned maintenance in settings **and** `maintenance()`
can't estimate one yet — under 7 logged food days, or under two weeks of
weigh-ins. New install, or a gap in logging.

With no `z` there is no deficit to headline. **Fall back to the current layout
exactly**, and keep the existing note pointing at ⚙ Settings. So:

```
z ? deficit-hero : cal-left-hero
```

Both branches must exist. This is the whole complexity of the change.

### Files

| File | Change |
|---|---|
| `food.js` | `renderSummary()` — branch the hero on `z`; `renderCalMeter()` — drop the sentence from `cal-status`, keep the `maint` chip |
| `rack.css` | Possibly nothing. `load-num` and `eyebrow` already exist |

One file, one function, plus a deletion. Do this one first — it's an hour and it
touches nothing else.

---

## 3. Train — pre-planned routines

**Status:** **shipped** 2026-08-23

### Why this is cheaper than it looks

Two things in `workout.js` already do most of the work:

1. **`startWorkout(preset)` already takes a preset.** Line 407:
   `exercises: (preset && preset.exercises) || []`. It has only ever been called
   as `startWorkout()`. Routines are the caller it was written for.
2. **`openPicker(onPick)`** (line 1084) is a self-contained multi-select sheet —
   search, group chips, "New" for a custom exercise — that hands back
   `[{id, name, group, equipment}]`. Routine building reuses it as-is.

So the feature is mostly a place to keep the presets and a screen to edit them.

### Schema

```
users/{uid}/routines/{routineId} → one routine
```

```json
{
  "id":      "rm3k9x2",
  "name":    "Push A",
  "note":    "heavy bench, back off on incline",
  "exercises": [
    { "exId": "bench-press", "name": "Barbell Bench Press",
      "group": "chest", "equipment": "barbell",
      "sets": [ { "r": 5, "w": 225, "type": "N" },
                { "r": 5, "w": 225, "type": "N" },
                { "r": 8, "w": 185, "type": "N" } ] }
  ],
  "created":  1756000000000,
  "lastUsed": 1756400000000,
  "uses":     6,
  "order":    0
}
```

The `exercises` array is **exactly the live-session shape minus `done`**. That
is deliberate — `startWorkout(routine)` can pass it straight through, and the
only transform is stamping `done: false` onto each set.

`w` and `r` are *targets*, and both are optional. A routine that says "3 sets of
bench, figure out the weight when you're there" is a legitimate routine — leave
`w` null and the session shows the existing last-time line instead.

`groups` is **not** stored. Derive it from the exercises, the way sessions do —
a stored copy is a stored copy that goes stale.

### Where it lives in the UI

A **Routines** button under `Start workout` on the Train tab, next to
`Statistics` (`workout.js` around line 252). Not a fourth dock slot — steps is
already claiming that, and routines is a thing you touch on the way into the gym,
not a tab you live in.

Tapping it opens a sheet:

- List of routines, each showing name, exercise count, muscle-group dots (reuse
  the calendar's `GROUPS[g].color` swatches), and last used.
- Tap a routine → **Start** (calls `startWorkout(routine)` with the name) or
  **Edit**.
- The editor is the session screen with the timer and Finish stripped out —
  add exercises via `openPicker`, set target reps/weight per set, drag to
  reorder, swipe-to-delete a set (`ui.js` already has the swipe primitive).
- **Save this workout as a routine** on the post-workout recap screen
  (`renderSummary()`, line 940) — the cheapest way to get the first routine in,
  because it captures what he actually did rather than making him type it.

### The refactor this needs

`openPicker` and `openCustomExercise` are module-private to `workout.js`, and
`allExercises()` closes over `customEx`, which is also `workout.js` state.
Routines need all three, and importing `workout.js` from `routines.js` while
`workout.js` imports `routines.js` is a cycle — the README's import graph
explicitly forbids one.

**Extract `picker.js`:** it owns the exercise library (static + `exercises/custom`),
`allExercises()`, `openPicker()`, and `openCustomExercise()`. Both `workout.js`
and `routines.js` import it. Nothing imports back.

```
app.js → workout.js → routines.js → picker.js → ui.js
                    → picker.js
```

`workout.js` passes `startWorkout` into `openRoutines(onStart)` as a callback,
so `routines.js` never imports `workout.js`. One direction, no cycle.

Checked: `allExercises()` is exported from `workout.js` but **no other module
imports it** — only lines 1130 and 1210 inside `workout.js` use it. So the
extraction has exactly two call sites to update.

### Files

| File | Change |
|---|---|
| `picker.js` | **New.** Exercise library + both sheets, lifted out of `workout.js` |
| `routines.js` | **New.** List, editor, `openRoutines(onStart)` |
| `workout.js` | Import from `picker.js`; add the Routines button; pass `startWorkout` in; add "Save as routine" to the recap |
| `sw.js` | Add both new files, bump the cache name |
| `AGENTS.md` | Document `routines/` |

### Open questions

- Starting from a routine: prefill the target weights into the set rows, or
  leave them blank with the target shown as placeholder text? Prefilled is
  fewer taps; blank is honest about what was actually lifted. **Leaning
  placeholder** — a prefilled number you forgot to change is a lie in the log.
- Should a routine remember progression ("last time you did this routine you
  benched 225 — try 230")? Real value, but it's a second feature. Not v1.
- Folders or tags once there are more than about eight routines? Defer.

---

## 4. Water — goal and tracker

**Status:** **shipped** 2026-08-23

### Schema

```
users/{uid}/water/log/{YYYY-MM-DD} → { entryId: { ml, t, src } }
users/{uid}/settings/water         → { goalMl, unit, presets }
```

```json
{ "wam3k9x2": { "ml": 500, "t": 1756000000000, "src": "preset" } }
```

**Always store millilitres.** Display converts. A log that stores whatever unit
was on screen at the time is a log you cannot sum. `src` is `preset` | `manual`
| `agent`.

Deliberately **no rollup node.** `food/daySummaries` exists because the TDEE
estimate reads it instead of the raw log, and house rule 3 exists because that
rollup goes stale. A day of water is a handful of entries — sum it on read, and
the weekly chart reads seven small nodes. Don't build a second thing that can
disagree with itself.

```json
{ "goalMl": 3785, "unit": "floz",
  "presets": [ { "label": "Bottle", "ml": 500 }, { "label": "Big bottle", "ml": 946 } ] }
```

`unit` ∈ `floz` | `ml` | `L` | `cup` — display only.

### Default presets

The Walmart flat-of-40 bottle is **16.9 fl oz / 500 ml** — that's the one worth
having as the fat default button.

| Label | fl oz | ml |
|---|---|---|
| Bottle | 16.9 | 500 |
| Small cup | 8 | 237 |
| Can / cup | 12 | 355 |
| Sports cap | 20 | 591 |
| Shaker | 24 | 710 |
| Big bottle | 32 | 946 |
| Tumbler | 40 | 1183 |
| Gallon | 128 | 3785 |

Editable in settings. Default goal: **1 gallon (3785 ml)**, or derive from the
latest weigh-in at ~½ oz per lb — 210 lb → 105 oz → 3100 ml. Offer the derived
number as the placeholder so there's a sane default without a decision.

### The card

Its own **full-width card directly above Micronutrients**, not beside it.
`.micro-grid` is `grid-template-columns: repeat(3, 1fr)`; halving its width on a
phone gives cramped one-column cells with wrapped labels. The vessel graphic
also wants the width.

Contents:

- **The vessel.** An SVG bottle that fills to `total / goal`, with a sine wave
  for the waterline and a tick at the goal. This is the "different from the
  calorie bars" — a bar is a bar, a filling vessel reads instantly and is
  thematically right. Build it in `analytics.js` alongside the existing SVG
  builders so all chart code stays in one file.
- **Bottle pips** under it — one pip per default-preset bottle, filled as you go.
  Turns an abstract 2,130 ml into "four and a bit bottles", which is how you
  actually think about it.
- **The numbers** — `2,130 / 3,785 ml` and `1,655 to go`, in the display unit.
- **The controls** — the fat default-bottle `+` button, a `−` to undo the last
  entry, and `⋯` for the full sheet: every preset, a number field with a unit
  selector, and today's entries with swipe-to-delete.

Past days are viewable because the Fuel tab already has date nav — `viewDate`
and `loadDay()` — so water follows the same date and needs no navigation of its
own. Logging is disabled on a future date, same as food.

### Files

| File | Change |
|---|---|
| `water.js` | **New.** Card, sheet, unit conversion, presets |
| `food.js` | `render()` — insert `renderWater()` before `renderMicros()`; `loadDay()` — load the day's water; `openFuelSettings()` — goal, unit, presets |
| `analytics.js` | The vessel + wave SVG builder |
| `rack.css` | Vessel, pips, control row |
| `store.js` | Nothing — `read`/`write`/`watch` cover it |
| `sw.js` | Add `water.js`, bump the cache |
| `AGENTS.md` | Document `water/` and a `rack.mjs water add` command |

Import graph: `food.js → water.js → ui.js`. Water imports nothing that imports it.

### The quiet payoff

Water is measured mass, logged with a timestamp. That makes it the single
cleanest input to §5 — 500 ml of water is exactly 1.1 lb on the scale, known to
the millilitre, with none of the guesswork that food mass carries. Build this
before the algorithm and the algorithm starts better.

---

## 5. The maintenance algorithm — overhaul

**Status:** **shipped** 2026-08-23 · the big one

### What's actually broken

`tdee.js` does this:

```
dailyMeans()  →  mean of every weigh-in in a calendar day
windowAvg()   →  mean of the last 7 daily means, and the 7 before
rateWk        →  avg7 − prev7
tdee          →  avgIntake − rateWk × 500
```

Averaging raw intraday weigh-ins treats a 7am fasted reading and a 9pm
post-dinner reading as the same measurement. They differ by pounds. So the
"daily mean" depends on **what time you happened to step on the scale**, and
`rateWk` is a difference of two such means — which means a change in *weighing
habit* is indistinguishable from a change in *body weight*.

Then it's multiplied by 500. Simulated, with true weight held dead flat and a
4 lb diurnal swing:

| Scenario | apparent rate | TDEE error |
|---|---|---|
| Habit slides morning → evening across two weeks | **+3.64 lb/wk** | **+1,819 kcal/day** |
| Half the weigh-ins drift later | +1.79 lb/wk | +894 kcal/day |

Under gentler, more realistic conditions (multiple weigh-ins a day, habit
drifting slowly over ten weeks) the error still ran **+138 to +189 kcal/day** —
persistent, and in the direction that makes a real deficit look like maintenance.

This is not a precision problem. It's a bias problem, and more weigh-ins do not
fix it — they can make it worse.

### The model

Every weigh-in is the true fasted weight plus things that are not fat:

```
lb_i  =  W(d_i)  +  G_i  +  ε_i
```

| term | |
|---|---|
| `W(d)` | true fasted-morning weight on day `d` — the thing we want. Slow. |
| `G_i` | **gut load** — mass of food and drink ingested and not yet cleared |
| `ε_i` | scale, clothing, hydration, bathroom timing. Noise. Averages out. |

Gut load, with an exponential clearance kernel:

```
G_i  =  b_K · Σ_j kcal_j · e^(−Δt_j / T)   +   b_W · Σ_k ml_k · e^(−Δt_k / T_w)
```

Every meal contributes its mass, decayed by how long ago it was eaten. Dinner
thirty minutes ago is all still in you; breakfast ten hours ago mostly isn't.
`T ≈ 10 h`.

**Everything this needs is already stored.** `weight/entries` has `t` on every
weigh-in. `food/log/{date}` has `t` on every entry. No schema change for the
core model — that is why this is worth doing properly rather than approximating.

Note there's no separate clock-hour term. The diurnal curve *is* the food and
water curve; adding an hour-of-day predictor alongside it fits the same variance
twice and the two coefficients become unidentifiable.

### Why the coefficient is fitted, not assumed

The food log stores macros, not grams. `p + c + f` grams badly underestimates
food mass because food is mostly water — a 650 kcal bowl of chicken and rice
is about 450 g, but only 142 g of macronutrient.

So don't try to compute mass. **Regress**, and let `b_K` absorb whatever the
relationship is for how he actually eats and logs. Physical plausibility check:

| food | mass | implied `b_K` |
|---|---|---|
| 700 kcal | ~500 g | 0.00157 lb/kcal |
| 2,700 kcal | ~2,000 g | 0.00163 lb/kcal |
| 650 kcal | ~450 g | 0.00153 lb/kcal |

Tight around **0.0016 lb/kcal**, which predicts 4.3 lb of gut load on a 2,700
kcal day — squarely inside the 3–7 lb swing he reports. Water is exact:
946 ml = 2.09 lb, so `b_W` ≈ 0.0022 lb/ml before elimination.

### Identification — the part that took two tries

**The obvious approach fails.** Smooth the daily means into a trend, take each
weigh-in's deviation from that trend, regress deviation on gut load. Simulated,
this recovered `b_K = 0.00087` against a true 0.00160 — **45% low**. The smoother
absorbs the average gut load into the trend line, so only the deviation-from-
average survives, and the coefficient collapses toward zero. It's a fixed point,
just the wrong one.

**The fix: fit on within-day pairs.** For every day with two or more weigh-ins,
take every pair:

```
lb_late − lb_early  =  b_K · (G_late − G_early)  +  noise
```

`W(d)` is identical for both, so it **cancels exactly**. No trend estimate is
involved, so nothing can absorb the signal. This is first-differencing, and it
is the whole reason the model is identifiable.

It also means his habit of weighing several times a day — the thing causing the
bug — is precisely the data that fixes it. Simulated recovery: **0.0015 and
0.0018 against a true 0.0016**, from ~80 within-day pairs over ten weeks.

### The pipeline

1. **Fit `b_K`, `b_W`** on all within-day pairs in the last ~90 days.
   Ridge-shrink toward the priors above; clamp to `[0, 0.004]`. A negative
   coefficient is physically meaningless — clamp, don't ship it.
2. **Normalise every weigh-in:** `adj_i = lb_i − Ĝ_i`. Every reading is now on
   one fasted-morning scale and directly comparable.
3. **Daily value** = mean of that day's adjusted weigh-ins, weighted by
   confidence — a reading needing a 0.3 lb correction is trusted more than one
   needing 3 lb, because the correction carries the model's error.
4. **Trend** = weighted least-squares slope over 21 days of adjusted dailies,
   with Huber weighting so one bad reading can't tilt it. Return the slope
   **and its standard error**.
5. **TDEE** = `avgIntake − slope_lb_per_day × 3500`, with the interval carried
   through: `SE(tdee) = 3500 × SE(slope_per_day)`.

### Measured, end to end

Ten weeks of simulated weigh-ins, true rate −1.00 lb/week:

| | stable habit | habit drifting morning → evening |
|---|---|---|
| current `avg7 − prev7` | −0.72 lb/wk · **+138 kcal/day off** | −0.62 lb/wk · **+189 kcal/day off** |
| normalised + OLS-21 | −0.89 lb/wk · **+57 kcal/day off** | −0.96 lb/wk · **+19 kcal/day off** |

Two separate wins, worth keeping straight:

- **Normalisation removes the bias.** This is the big one — up to ~1,800
  kcal/day in the pathological case, ~150 kcal/day routinely.
- **Regression over 21 days instead of differencing two 7-day means cuts the
  noise 2.1×** (±161 → ±76 kcal/day at the same scale noise). Real, but second
  order. Don't oversell it.

### Report the interval

The estimate should read **≈ 2,850 ± 95 kcal** and not `2,847`. The simulated
95% interval came out ±95–105 kcal/day, and that's *only* the slope's
contribution — intake logging error sits on top of it and is not modelled,
because there's nothing honest to model it with.

A single number invites him to chase 40 kcal of noise. The interval is the
feature.

### Guard rails

Do not ship a model that fits noise:

- Need **≥ 30 within-day pairs across ≥ 14 days** before learned coefficients
  are used at all. Below that, use the priors and say so.
- Shrink learned coefficients toward the priors in proportion to sample size.
- Clamp to physically possible ranges.
- If the fit fails or the data is thin, **fall back to today's algorithm** and
  label the card accordingly. Degrading to the old answer is fine; a confident
  wrong answer is not.

### The data-access problem

`maintenance(weightEntries, daySummaries)` currently reads `food/daySummaries` —
day totals, **no timestamps**. The new model needs meal times, which live in
`food/log/{date}`. That means 21+ day nodes instead of one.

Two options:

- **A new `food/intraday/{date}` rollup** of `[[t, cal], …]` — one small read per
  day, written wherever `daySummaries` is written. But it's a second derived
  node that can go stale, and house rule 3 exists because the first one already
  does. **Not this.**
- **Read `food/log/{date}` for the window and cache in `localStorage`,** fetching
  only days not already cached. Past days never change; only today needs
  refreshing. `store.js` already mirrors reads to `localStorage` — this is that
  pattern, over a date range. **This one.**

### Files

| File | Change |
|---|---|
| `weightmodel.js` | **New.** Pair extraction, coefficient fit, normalisation, robust slope. Pure functions over raw nodes. Imports `store.js` + `ui.js` only |
| `tdee.js` | Keeps its public API (`maintenance`, `calorieZones`, `zoneOf`, `weightStats`) so callers don't churn; delegates the math. `maintenance()` gains a food-log argument |
| `food.js` | `maintInfo()` passes the food log through; the bar can show the interval |
| `weight.js` | TDEE card shows the interval + coefficient confidence; `renderTOD()` becomes the *learned* curve; chart gets a raw/adjusted toggle |
| `AGENTS.md` | Document the model and the cache |

Import graph: `weight.js → tdee.js → weightmodel.js → ui.js`. Still acyclic.

### What he gets on screen

- **Maintenance ≈ 2,850 ± 95**, and a plain sentence saying what moved it.
- **"Your scale runs +3.8 lb by 8pm"** — the learned curve, stated back to him.
  This is the observation that started the whole change; showing it is the payoff.
- **Adjusted vs raw dots** on the weight chart. The adjusted cloud should be
  visibly tighter, which is the model showing its work.
- **"6 of your last 7 days have a fasted morning weigh-in"** — the anchor count.
  Morning readings need the smallest correction, so they carry the most
  information. Worth nudging.

### Honest limits

- 3,500 kcal/lb is a fat figure. Over two-plus weeks it's reasonable; over three
  days it is mostly glycogen and water and the estimate will lie. The 21-day
  window is doing real work.
- A big sodium swing, a new creatine dose, or illness moves water weight in ways
  no food-timestamp model can see. Robust weighting limits the damage; it can't
  eliminate it.
- Garbage in: if a day's food log is half-entered, `G` is underestimated and
  that day's adjusted weight reads heavy. The confidence weighting should
  down-weight days whose logged intake is implausibly low.
- **This never becomes an activity model.** §1 explicitly keeps steps out of the
  TDEE math for the same reason — this estimator is empirical, and activity is
  already inside the scale trend.

---

## 6. Targets that follow the scale

**Status:** **shipped** 2026-08-23

### The question that produced it

"When my weight is dropping, do the calories adjust automatically?" Half of it
already did. Maintenance was live — and *empirical*, measured from real intake
against the real scale trend, so it catches metabolic adaptation and not just a
lighter body. But `targets.cal` was written in exactly one place in `food.js`,
the Save button. It sat where you put it.

Which means a cut stalls quietly: maintenance drifts down toward the target, the
deficit shrinks, and the app shows it happening without doing anything about it.

### The shape

A switch in Fuel → ⚙ → Daily targets. *Set them* is the old behaviour, unchanged
and still the default. *Follow my weight* swaps the three number fields for a goal:

| you set | it computes |
|---|---|
| goal lb/week | calories = maintenance + rate × 500 |
| protein g per lb | protein = g/lb × trend weight |
| fat g per lb | fat = g/lb × trend weight |
| floor (optional) | carbs = the remainder, as always |

**Trend weight, not the last weigh-in** — which is only usable *because* §5
exists. A raw reading swings by pounds depending on the hour, and scaling
protein off that would have macros jumping 8 g between a morning and an evening
weigh-in. The normalised trend line is smooth enough to multiply by.

### The floor is load-bearing

`carbsTarget()` clamps at zero. So calories falling below `p×4 + f×9` doesn't
produce an error — it silently produces a zero-carb target. Any auto-adjusting
target *must* floor itself at protein + fat + a real carb minimum (100 g), and
that floor overrides the requested rate rather than the other way round.

Unit-tested: a reckless −3.5 lb/week request at 215 lb resolves to 2,210 kcal
with 101 g of carbs, not 900 kcal with none, and the preview says why.

### Guard rails

- Moves **at most once every 7 days**, and **at most 100 kcal** per move, so one
  bad fortnight of weigh-ins can't yank the target.
- Only writes when the change is material (≥25 kcal, ≥4 g protein, ≥3 g fat).
- Needs both a maintenance number and a fitted trend; without them it does
  nothing and the preview says what's missing.
- Toasts when it moves. Silent target changes would be worse than no feature.

### One thing fixed on the way past

`food.js` read `weight/entries` once at boot and never again, so logging a
weigh-in on the Weight tab left Fuel drawing its cut/maintain/gain marks off a
stale maintenance number until the app was reloaded. It's a `watch()` now —
which is also what triggers the auto re-check.

---

## 7. Account isolation

**Status:** **shipped** 2026-08-23

Found while auditing for the multi-account phase. None of it mattered with one
user; all of it would have mattered with four.

### The real one: localStorage was not namespaced

Every key was `fit:<key>` with no account in it. With two accounts on one phone
— which happens the first time you sign in as a test account on your own device
— that meant:

- `mirror:food/log/…` served the **previous user's food log** any time the
  network was slow or absent, because `read()` falls back to the mirror.
- `activeSession` handed the new account the **previous user's in-progress
  workout**.
- `queue` held offline writes addressed to `users/{other uid}/…`. Absolute
  paths, so they kept resolving to a subtree this account isn't allowed to
  touch: permission denied, back in the queue, retried on **every reconnect,
  forever**.

Keys are now `rack:{uid}:{key}`. The prefix changed from `fit:` deliberately so
legacy keys are unambiguous and can be swept exactly once, migrating the cache
and any live workout across rather than dropping them.

### Sign-out now reloads

Every module holds the last account's data in module-level state — `dayLog`,
`entries`, `monthCache`, `routines`, the fitted weight model — and none of it
was torn down. `booted` distinguishes a real sign-out from the initial null
before auth resolves, so this doesn't loop on a signed-out first load.

### The feed leaked

`feed/wH7l…` is one hard-coded world-readable path belonging to one account.

- `writeFeed()` had no owner guard, so every food log, weigh-in and finished
  workout on any other account fired a write at it, earned a permission denial
  and swallowed it.
- Worse, **"Copy Claude link" in Weight → Settings was unguarded too** — a
  tester tapping it would have copied *someone else's* data URL.

Both are owner-only now.

### Verified

An 18-check browser test signs in as the owner, logs water and a weigh-in,
switches to a second account on the same device, and asserts the second account
sees none of it — not the water, not the targets, not the workout, no feed
write, no inherited session — then switches back and confirms the owner's data
survived intact.

---

## Housekeeping

- ~~`tools/rack.mjs` paths in both docs~~ — fixed, the file is at the repo root.
- ~~README saying `rack-v3` while `sw.js` said `rack-v4`~~ — both now `rack-v5`.
- `app.css` is still in the repo, still dead — the abandoned IRONLOG design,
  referenced by nothing. 19 KB served to nobody. Left alone because deleting a
  file is a decision, not a fix; say the word and it goes.

## What was measured, not assumed

The numbers in §5 come from a simulation of the model against synthetic data
with a known true rate — 40 seeds across three weighing-habit scenarios, 120
runs total:

| scenario | old MAE | new MAE | old bias | new bias |
|---|---|---|---|---|
| stable habit | 186 | **46** | +43 | −2 |
| slow drift morning → evening | 198 | **48** | −91 | +3 |
| abrupt switch inside a fortnight | 752 | **48** | −752 | +1 |

All kcal/day. Overall 378 → 47, and the normalised estimate was closer in
102 of 120 runs. The bias column is the one that matters: the old arithmetic is
not noisy, it is *wrong in a direction*, and the direction is the one that makes
a real deficit look like maintenance.
