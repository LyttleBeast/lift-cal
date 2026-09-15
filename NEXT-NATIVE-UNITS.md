# Porting lb/kg and in/cm to rack-mobile

Web shipped as `rack-v34`. The tree it mirrors is `~/dev/rack-mobile`.

**Nothing in `rack-mobile` was touched by this ship.** It is not in the shipping
clone and was deliberately out of scope.

The standing rule holds: the website is the guinea pig, the real end goal is
native, and logic is written once as a pure function the port copies verbatim
rather than re-deriving from a description. This whole feature was built to that
shape on purpose — `units.js` imports nothing, reads nothing, touches no DOM and
takes the unit as an argument on every single function, precisely so the file
can be copied across without a diff.

**The one rule to carry over with it:** everything in memory and in storage is
POUNDS and INCHES. Conversion happens only in the expression that builds a
string or reads an input. A value that has been through a converter must never
be handed to another one — a double conversion is silent, and 100 → 220 → 486
all look like a weight. `tools-check/units.mjs` section F scans every call site
in the web tree for it; the native tree wants the same scan.

---

## 1. The module itself

| | |
|---|---|
| Web | `units.js` (repo root) |
| Native | `src/pure/units.js` |
| Port | **Verbatim.** Copy the file. Change nothing. |

No imports, no state, no DOM, no `read()`. Every export takes `u` (`'lb'`/`'kg'`
or `'in'`/`'cm'`) as its last argument. It holds two constants, four conversion
pairs, the formatters, the limit converters and `normUnits`.

Two things not to "simplify" on the way across:

- `perOut` **multiplies** where `wOut` divides. Grams per POUND is a larger
  number per KILO — 1 g/lb is 2.2 g/kg — because there are more pounds in a body
  than kilos. Getting it backwards hands a metric account a 45 g protein target,
  which is the exact class of bug this ship exists to prevent. The sanity check
  is in the comment above it: 1.0 g/lb at 220 lb and 2.2046 g/kg at 100 kg are
  both 220 g.
- `compact1` inside `units.js` is a deliberate private duplicate of `ui.js`'s
  `compact()`, because a pure module cannot import from the app. If one ever
  changes, change both. Native has the same split (`src/pure/format.js`) and
  wants the same duplicate and the same comment.

`fmtSetW`'s blank guard is load-bearing, not defensive decoration: `''` coerces
to `0` in the division and `undefined` to `NaN`, so without it an unset routine
target reads as "0" on kilos — a promise of a weight where there is none.

## 2. The accessor

| | |
|---|---|
| Web | `store.js` — `initUnits()`, `units()`, `wu()`, `hu()`, `setUnits()` |
| Native | wherever the native tree's `settings` read path already caches `settings/water` and `settings/steps` |
| Port | **Rework.** Same contract, native's own storage layer. |

The contract, and it is the part that matters:

1. **Synchronous, and correct before first render.** `wu()` and `hu()` are
   called inside render functions and cannot be awaited. A screen that paints in
   pounds and then flips to kilos a moment later is a bug, not a loading state.
   Web awaits `initUnits()` at the very top of `boot()`, ahead of setup and ahead
   of all five tabs. Native has to do the equivalent before its first screen
   mounts — if that means a selector off a store that is hydrated in the root
   effect, the hydration must block the first paint, not race it.
2. **Imperial is the default from every direction.** Absent node, failed read,
   half-written offline queue, unrecognised value — all of them are pounds and
   inches, via `normUnits`. Eight live accounts have no node here.
3. **`setUnits()` sets the cache BEFORE it writes.** An offline change still
   repaints; the write can queue behind it.

Web deliberately dropped the re-read after setup for reason 3 — re-reading is
the one way to lose the choice when the write is queued. Native should do the
same.

## 3. Where the unit is chosen — two screens

| | |
|---|---|
| Web | `onboarding.js` → `unitsStep()`; `settings.js` → the `unitsRow` in the You section |
| Native | `src/state/onboarding.js` + its setup screens; the native settings screen |
| Port | **Rework — no RN equivalent of the control.** |

**`segmented()` has no React Native equivalent in the port.** Web uses
`ui.js`'s `segmented()` for both, matching "Open the app on". Native will need
whatever it already uses for a two-way choice (a `SegmentedControl`, a pair of
pressables). What must survive the substitution:

- **One control, not two.** Metric means kilos *and* centimetres together. Two
  stored fields, one question.
- **Setup asks BEFORE height and weight.** Both of those are asked in the chosen
  unit, so asking afterwards is asking somebody to re-enter what they just
  typed. Web's step array is
  `[welcome, unitsStep, aboutYou, weighIn, goalStep, activityStep, …]` — note
  that `aboutYou` holds the height question, so units must precede it, not just
  precede `weighIn`.
- **Setup's water write follows it once**: `unit: 'ml'` instead of `'floz'` for
  a metric account, and the water-goal note is quoted in ml rather than fl oz.
  Changing units later must **never** write `settings/water` — water has its own
  unit with user-chosen presets behind it and silently rewriting it breaks them.
- **Changing it re-renders what is on screen, with no reload.** Web repaints the
  screen behind the sheet via the existing `onEdit` callback and lets the tab
  router repaint the other four when they are next switched to. Native's store
  subscription gives this for free if `wu()` is read *inside* render rather than
  captured in a module constant — which is the thing to check.

## 4. The clamp, and the one RN difference

| | |
|---|---|
| Web | `ui.js` `LIMITS` + `setNum()`; `units.js` `limW`/`limRate`/`limPer`/`limH` |
| Native | `src/pure/limits.js` (or wherever `LIMITS` lives) and every numeric input |
| Port | **Copy the limit converters; rework the inputs.** |

`LIMITS.lb`, `setW`, `rateWk` and `perLb` are POUND-scale and stay that way.
They bound what gets STORED.

The order is **convert, then bound**. Bounding a typed kilo figure against a
pound limit lets somebody log 690 kg and refuses 20.

> **There is no `input.min` / `input.max` in React Native.** On web there are
> two bounds — the browser's own, set from `limW()`, and the clamp — and they
> are deliberately made to agree (the limit converters round *inward*, floor up
> and ceiling down, so every number the browser accepts is one the clamp
> accepts). In the native tree **the clamp is the only bound there is.** Every
> place web sets `min`/`max` on an input, native must rely on the clamp alone —
> so the clamp cannot be skipped anywhere, and a `keyboardType="decimal-pad"`
> is not a bound.

The four sites: the weigh-in box (`LIMITS.lb`), the set-weight box
(`LIMITS.setW`), the routine target box (`LIMITS.setW`), and the three auto-target
boxes (`LIMITS.rateWk`, `LIMITS.perLb` ×2). Plus the goal weight (`LIMITS.lb`)
and the height sanity check (36–96 in, converted with `limH`).

## 5. Set weights — the string, and the empty one

| | |
|---|---|
| Web | `workout.js` → `setW(v, u)`; `routines.js` → the `tw` `onchange` |
| Native | `src/state/workout.js` and the routine editor |
| Port | **Copy `setW()` verbatim** (it is three lines and pure); rework the routine one to match. |

`session.exercises[].sets[].w` and `routines[].sets[].tw` are **strings of
pounds**, and `''` has to survive — it is how an unfilled set is told from a
logged zero, and `collectDone` drops a set with a blank in either box.

`setW()` is `setNum` (which already keeps `''` as `''`) wrapped so the
conversion happens on the way in, and so what comes out is rounded to **two
decimals** rather than stored as `"220.46226218"`. Two decimals is not cosmetic:
it is the string form the published `.validate` rules and the native tree both
have to accept.

> **Check before shipping native:** web's published `database.rules.json` has
> **no** `.validate` on a set's `w`/`r` at all, so nothing there can refuse a
> decimal string. The hardened rules that do
> (`rack-mobile/web-patches/database.rules.PROPOSED.json` on the Mac) are
> unpublished and were not readable from this clone — confirm their `w` rule
> accepts `"220.46"` before they go live, and add `settings/units` to them while
> you are in there.

On the way out, `fmtSetW(w, u)` is **identity on pounds** — `String(w)`,
character for character — because a set row has always printed back exactly what
was typed and nothing an imperial account entered should be quietly re-rounded.
Only kilos rounds, to one decimal.

## 6. Personal records changed shape

| | |
|---|---|
| Web | `analytics.js` → `detectPRs`, `prTimeline`, and the new `prDetail(p, u)` |
| Native | `src/pure/analytics.js` |
| Port | **Copy verbatim, and update the three render sites.** |

Two changes to the objects these return:

- The e1RM record now carries **`set`** (the set object) instead of a baked
  `detail` string, and `prDetail(p, u)` turns it into text. The weight in that
  set is stored pounds like every other weight in the file, and only a screen
  knows which unit to print it in.
- The `unit: 'lb e1RM'` / `unit: 'lb'` field is **gone from all three record
  kinds**. Nothing in the web tree read it — check whether anything in native
  does before deleting it there. A field that says "lb" to a kilos account is
  exactly the kind of wrong this ship is about; if native needs a unit on the
  record, build it from `unitW(u)` at render, not at detection.

`sessionMilestones(record, prior, u)` **takes a third argument now** — it is the
only function in `analytics.js` that formats a weight into a sentence, so it is
the only one that needs the unit. `detectPRs` and `prTimeline` deliberately do
not: they return numbers and let the screen convert.

## 7. Height — one field or two

| | |
|---|---|
| Web | `onboarding.js` `aboutYou()`; `settings.js` `openProfile()` |
| Native | the setup "about you" screen and the native profile editor |
| Port | **Rework.** Two inputs become one. |

Metric replaces the **ft + in pair** with a single cm box — "5 ft 11" has no
two-part metric form. Both paths end at the same stored `profile.heightIn`.

`estimateMaintenance()` already converts inches → cm internally for Mifflin-St
Jeor. **Do not touch that maths.** Only what feeds it changed.

Keep the 36–96 in sanity check, converted with `limH`, not moved.

**One storage nuance worth reading twice:** a centimetre entry stores
**hundredths of an inch**, not whole inches, because 175 cm and 176 cm both
round to 69 in — somebody would type 176, save, reopen and be told they are 175.
A ft + in entry still stores whole inches, exactly as before. Web:
`heightIn: metric ? inches : Math.round(inches)`. The published rule on
`profile.heightIn` is `isNumber() && >= 0 && <= 120`, so a decimal already
passes; check native's own validation does too.

## 8. The sentences

| | |
|---|---|
| Web | `insights.js` — `assess`, `weeklyReview`, `trajectory`; `ctx.u` |
| Native | `src/pure/insights.js` |
| Port | **Copy verbatim.** It is pure and the unit rides in on `ctx`. |

`ctx` gains one field, `u: 'lb'|'kg'`, and `unitOf(ctx)` reads it defensively —
a ctx built before this existed is imperial.

**Every threshold stays in pounds.** "Down at least 0.3 lb a week is the bar on
a cut" is still a 0.3 lb bar for a metric account; only the printed number
converts, to 0.14 kg. Moving the bars would mean two people training identically
get different verdicts. The comparisons in the code are untouched — grep for
`rateWk <= -0.3` and friends and you will find them exactly as they were.

Two phrases have no kilo form and are branched rather than converted, because
converting them would have changed the imperial string:

- `trajectory`: *"Holding within a third of a pound a week."* → metric gets
  *"Holding within 0.14 kg a week."*
- the goal sheet's choice subtitles (`settings.js` `openGoal`, `onboarding.js`
  `GOALS`): *"about a pound a week down"* → *"about 0.45 kg a week down"*.

`fmtRate` gives metric **two** decimals where weight gets one, and that is on
purpose: a 0.3 lb/week bar is 0.14 kg, and at one decimal that becomes 0.1,
which is a different bar.

## 9. Left in pounds on purpose — do not "finish" these

Per the rule this ship was built under — **a wrong number is worse than no
number** — three places are still pounds, are labelled as pounds on screen, and
are not to be converted in the native tree either until somebody decides what
the right answer is:

- **Per-side plate math** (`workout.js` `renderPlates`). Those are the plates on
  an American rack: 45/35/25/10/5/2½ on a 45 lb bar. A gym stocked in kilos has
  25/20/15/10/5/2½/1¼ on a 20 kg bar — a different set, not these six
  relabelled, and "2 × 20.4" is a number nobody can find on a rack. The strip
  says **"Per side · lb plates"** on a metric account and keeps working. The real
  answer is a second plate set plus a bar-weight setting, and it is logged as
  still-open in ROADMAP §8.
- **The workout importer** (`importer.js`). Its file is already in Rack's
  storage format, so its `w` values *are* pounds. Reading them in the display
  unit — which is what every box a person types into does — would multiply 219
  sessions of real history by 2.2 with no way back. The screen says the file is
  read as pounds and shown in your unit. **This is a deliberate departure from
  "the importer parses in the user's display unit"**, and the reason is in the
  comment above the line.
- **The half-a-fluid-ounce-per-pound water rule** (`water.js`). An imperial rule
  of thumb with no metric form. The bodyweight it is quoted against does convert.

## 10. What to copy, at a glance

| Web | Native | Verbatim? |
|---|---|---|
| `units.js` | `src/pure/units.js` | **yes, whole file** |
| `analytics.js` `prDetail`, `sessionMilestones(…, u)`, `detectPRs`, `prTimeline` | `src/pure/analytics.js` | **yes** |
| `insights.js` `assess` / `weeklyReview` / `trajectory` | `src/pure/insights.js` | **yes** |
| `workout.js` `setW(v, u)` | `src/state/workout.js` | **yes** |
| `store.js` `initUnits` / `wu` / `hu` / `setUnits` | native settings cache | rework — same contract |
| `settings.js` units control | native settings screen | rework — no `segmented` in RN |
| `onboarding.js` `unitsStep` + height/weight steps | native setup screens | rework — no `segmented` in RN |
| every `input.min`/`max` from `limW`/`limRate`/`limPer`/`limH` | — | **drop; the clamp is the only bound in RN** |
| the render sites (weight, you, stats, workout, routines, food, importer, water) | the matching native screens | rework — same expressions, different tree |

## 11. Verify it the same way

`tools-check/units.mjs` in the web tree is 116 checks over seven properties:
round trip, imperial identity, clamp order, the empty string, stored shape, no
double conversion, and a full diff of `insights.js`'s output against the same
file at `166455c`. Sections A–F are all pure and **the native tree can run the
same assertions against its own copy** with the imports repointed. Section G
needs a baseline commit to diff against — pick the native commit before the port
and do the same thing.

The check that matters most is F, the double-conversion scan, because that is
the only failure in this whole feature that is completely silent.
