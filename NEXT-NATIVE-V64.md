# Porting rack-v64 to rack-mobile

Web ships as `rack-v64`. The tree it mirrors is `~/dev/rack-mobile`.

**The number.** The P5 build brief (`FIX-PROMPT.md`, run `P5-20261002-0129`)
called this ship `rack-v63` and was written against `590db05` (rack-v62). Live
web `main` had moved to `93b3292` (**rack-v63**, the estimator fixes) before it
was built, so this ship is **rack-v64**, built on `93b3292`, and every comment
and doc line says so. Wherever `FIX-PROMPT-NATIVE.md` says "rack-v63" for this
work, read "rack-v64". v63's own port note (`NEXT-NATIVE-V63.md`) is separate
and still applies; nothing here touches the estimator, food memory, the
600-character refusal, `estimate-limits.js`, `ai.js` or `recall.js`.

v64 is **the maintenance number earns its place, and no target goes under a
safety floor**: a quality gate on the measured maintenance, a stale rule, an
outlier screen, the safety floors and the minors' rule, honest labels and
notes, a weigh-in question, and two one-time cards (each its own
`DECISION ...:` commit Micah may drop before pushing).

---

## 1. The pure files, verbatim

Copy these four byte for byte from web `main` into `src/pure/` (bar the
import lines, as before). Their sha256 at rack-v64:

| web file | native destination | sha256 (rack-v64) |
|---|---|---|
| `tdee.js` | `src/pure/tdee.js` | `d0de276a4ec2eb68a87070a42e987b34cdc2aaaebdf6cf6a5a49fb0abdd843c0` |
| `weightmodel.js` | `src/pure/weightmodel.js` | `d04cd6aae0d2f3d775af37b53965f5a96af8750b5d2032a2e58c416bb5027379` |
| `insights.js` | `src/pure/insights.js` | `9a130057f97760f8ec04add18a0e2faaf82678d65dfbe36ee7ee9efe23fb1245` |
| `coach-goal.js` | `src/pure/coach-goal.js` | `139e04b0750c884e803e553ebda9931dc8ccdf8400b581b8919f50decfaff411` |

Re-pin `tools/verify-tdee-verbatim.mjs`, `verify-insights-verbatim.mjs` and
`verify-coach-goal-verbatim.mjs` in the same commit (intended; CMB2 §7B).

New exports in them (all pure, all named so Micah can move a constant later):

- `tdee.js`: `MEASURED_MIN_SPAN` 14, `MEASURED_MIN_POINTS` 4,
  `MEASURED_MIN_LOGGED` 7, `MEASURED_RANGE` [1000, 6000], `measuredNeeds(m)`,
  `SAFE_MIN_KCAL` 800, `SEX_MIN_KCAL` {f 1200, x 1200, m 1500}, `ADULT_AGE` 18,
  `safeFloor(who)`, `whoOf(profile, year)`, `plannedRate(cal, maint)`;
  `autoTargets(goal, maint, lb, who)` now takes `who` and returns `safe`,
  `safeHeld`, `userHeld`, `minor`, `minorHeld`; `trendRate()` returns
  `spanDays`, `ageDays`; `sortedEntries` coerces and filters `lb`.
- `weightmodel.js`: `STALE_DAYS` 4, `keyDaysBetween(a, b)`, `needsConfirm(typed,
  trend, last)`; private `screenOutliers`, `MIN_PAIR_GAP` (30 min), `fitGen`;
  the model carries `trendSpan`, `trendLastX`, `trendLastKey`,
  `trendRawLastKey`, `trendSpanDays`; `maintenanceFromModel` returns
  `trendSpan`, `trendAge`, `trendRawAge`, and (A6) a model short of logged
  days returns its fields with `tdee: null` instead of `null`.
- `insights.js`: a stated `rateWk` of 0 is 0 (hold) in `goalDirection`;
  `trajectory` measures progress from `ctx.adjDays[0]` when the model is in
  use; "Past about " + `labelRate`; "on target".
- `coach-goal.js`: `ENERGY_MIN_POINTS` 8, `ENERGY_MAX_AGE_DAYS` 4;
  `energyContext` reads `rateSpanDays` / `rateAgeDays` when passed.

**`resetModel()` (native-only lines in `src/pure/weightmodel.js`) must also
bump `fitGen`** (A8). Otherwise a fit started before a reset can land after
it.

---

## 2. Every item, web file -> native destination

### Phase A: the measured maintenance number

| item | web | native |
|---|---|---|
| A1 gate (span 14, 4 points, 7 logged, [1000, 6000]; held answers `{ tdee: null, held, need }`) | `tdee.js` | `src/pure/tdee.js` (verbatim) |
| A2 stale rule in whole date-key days; trendLb clamp; `trendRate().ageDays` | `weightmodel.js`, `tdee.js` | `src/pure/weightmodel.js`, `src/pure/tdee.js` |
| A3 outlier screen before the slope; span / newest point off the screened points | `weightmodel.js` | `src/pure/weightmodel.js` |
| A4 pairs under 30 min do not train bK / bW | `weightmodel.js` | `src/pure/weightmodel.js` |
| A5 finished days only (`d < today`); plain mean, NO cap (D-F12) | `weightmodel.js`, `tdee.js` | the same pure files |
| A6 the need comes from the path that answered; legacy answers meet the range | `weightmodel.js`, `tdee.js` | the same pure files; **correct the comment at `weight.jsx:604-608`** ("only legacyMaintenance builds the need array" is now false: the model's held answer carries `need`) |
| A7 the stale sentence off the newest RAW reading | `weightmodel.js`, `tdee.js` | the same pure files |
| A8 refit on a new day / an edited weigh-in; `fitGen` | `weightmodel.js` | `src/pure/weightmodel.js` + `resetModel()` bumps `fitGen` |
| A9 legacy `lb` coerced and filtered | `tdee.js` | `src/pure/tdee.js` |
| A10 Coach energy read: span and age | `coach-goal.js`, `tdee.js`, `coach-data.js` | `src/pure/coach-goal.js`, `src/pure/tdee.js`, **`src/state/coachData.js`**: pass `rateSpanDays` (0 when `!rate.model`, F44) and `rateAgeDays`. `tools/verify-coach-boot.mjs` "weight carries its seven fields" -> nine (intended) |

### Phase B: no computed target under a safety floor

| item | web | native |
|---|---|---|
| B1 safety floor, `who` | `tdee.js`; `food.js` (`who` from `whoOf(profile)`, a `profile` watch, `autoPlan(..., who)`, `goalNext`, the sheet's preview and Save); `onboarding.js` numbers | `src/pure/tdee.js`; `src/state/food.js` (`who`, `whoNow()`, re-read on a profile change); `src/state/foodTargets.js` (`autoPlan`, `goalNext`, `previewGoal`); `src/state/onboarding.js startingTargets` |
| B2 minors; birth year `<= thisYear - 14` with the new words; Settings applies it only to a CHANGED year | `tdee.js`; `onboarding.js` (`birthYearProblem`, `profileYearProblem`, `TOO_YOUNG`); `settings.js` | `src/pure/tdee.js`; `src/ui/onboarding/Setup.jsx:217`; `src/ui/settings/index.jsx:485-511` (copy the two pure rules; they import nothing) |
| B3 (DECISION D-e) floor first in `autoPlan`; `held`; `Number.isFinite(targets.cal)` guard; `maintInfo().held`; applyAuto writes `lastAdj` only when the plan has one | `food.js` | `src/state/foodTargets.js` (`maintInfo`, `autoPlan`); `src/state/food.js applyAuto` |
| B4 `autoToast(plan)` | `food.js` | `src/state/foodTargets.js autoToast` (verbatim bar `fmtInt`); `src/state/food.js applyAuto` |
| B5 (DECISION floorOk) `floorCard`, `answerFloorCard`, over the shared `askCardEl` / `rewriteTargets` | `food.js` (drawn under the calorie bar) | `app/(app)/(tabs)/food.jsx` bar ~530 (native brief C2); `src/state/foodTargets.js floorCard` |

### Phase C: targets computed, labelled and read honestly

| item | web | native |
|---|---|---|
| C1 `AUTO_MAX_GRAMS` 10; ±100; LIMITS.cal; **floors bind at once** (`max(safe, user floor, ceil10(p'*4+f'*9+400), target+step)`); `lifted` 'minor' / 'safe' / 'user' / 'macro'; the two new toasts; the sheet's promise | `food.js` | `src/state/foodTargets.js` (`autoPlan`, `goalNext`); UI `food.jsx:1730-1766`, `:1895` |
| C2 `plannedRate`; `floorNote` (no doctor wording); `previewGoal` gains `minorHeld`, `autoOn`, `floored`; Settings goal sentence | `tdee.js`, `food.js`, `onboarding.js`, `settings.js` | `src/pure/tdee.js`; `src/state/foodTargets.js` (`floorNote`, `goalNext`, `previewGoal`); `Setup.jsx:541-544`; `settings/index.jsx:671-675`; `food.jsx:1887-1891`, `:513` |
| C3 read side: stated 0 is hold | `insights.js`, `food.js goalId` | `src/pure/insights.js`; `src/state/foodTargets.js goalId` |
| C3 (DECISION D-VEb) `holdKept`, `holdCard`, `answerHoldCard`; the manual Save drops a stated 0 when a typed target leaves the hold plan | `food.js` | `src/state/foodTargets.js` (`holdKept`, `holdCard`); `food.jsx` Save ~1761 and the bar ~530 |
| C4 `needsConfirm`; one confirm before the write | `weightmodel.js`, `weight.js` | `src/pure/weightmodel.js`; `app/(app)/(tabs)/weight.jsx log()` |
| C5 Setup recomputes until edited; boxes store what they hold; out-of-range setup maintenance is null | `onboarding.js` (`setupNumbers`, `applySetupNumbers`, `boxNumber`) | `src/ui/onboarding/Setup.jsx:194-201`; `src/state/onboarding.js startingTargets` |
| C6 "as you log it" | `weight.js`, `you.js` | `weight.jsx:646-647`; `src/ui/you/verdicts.jsx:97` area |

### Phase D

| item | web | native |
|---|---|---|
| D1 Fuel watches `food/daySummaries` | `food.js loadMaintInputs` | `src/state/food.js loadMaintInputs` (with an unwatch handle) |
| D2 goal progress from one series | `insights.js trajectory`, `you.js safeAssess` (`adjDays`) | `src/pure/insights.js`; `src/ui/you/derive.js safeAssess` |
| D3 write, then assign | `food.js` (setGoal, both Saves; `maintInfo(t = targets)`) | web only (native already writes first) |
| D4 a malformed targets node is no targets | `food.js initFood` | `src/state/food.js initFood` (do not spread a malformed node over `DEFAULT_TARGETS`) |
| D5 two sentences | `insights.js` | `src/pure/insights.js` |
| D6 protein + fat over the calories asks once | `food.js` manual Save | `food.jsx` manual Save |

---

## 3. The schema

- **`food/targets.floorOk`** (number, optional) — only if web `main` keeps the
  `DECISION floorOk:` commit. Web's published `database.rules.json` is
  **byte-identical to rack-v63**: `food` has only a `.write` rule, so the key
  needs nothing to publish. PROPOSED for native's own rules model only: add
  `floorOk: { '.validate': num(0, 100000) }` beside `goalLb` under `targets` in
  `tools/rules/build.mjs`, in the same DECISION commit, and re-run its
  self-test and rules verifiers. Do not touch any live rules file.
- **`food/targets.auto.rateWk` absent** after a manual off-plan Save means
  "no stated rate" (the Save writes `null`; RTDB stores that as absent).
  Only if web keeps `DECISION D-VEb:`.

---

## 4. Traps hit while building it

- **Import repointing must match statements, not strings.** A verifier rig
  that rewrites `from '...'` anywhere broke on insights.js's sentence "up from
  ' + n + ' last week". `tools-check/lib/stage.mjs` anchors on `import` /
  `export` statements. Native's `tools/lib/load-pure.mjs` should too.
- **Before noon, today's day-point is outside `windowAvg`'s window** (day
  points sit at local noon). A fixture timed at 09:00 sees one day fewer.
- **`maintenance()`'s held answers carry `need` and the model's fields with
  `tdee: null`.** Every screen already branches on `tdee == null` and prints
  `need`; check native's do too (weight.jsx, food.jsx sheet, You).
- **The overlay's safety-floor note said "Going under it is something to do
  with a doctor, not a setting."** Not built: the copy rules hold all doctor /
  pregnancy / eating-disorder wording for Micah's own words (F16). Copy web's
  `floorNote`, not the overlay's.
- **The overlay's Settings goal sentence** added ", as low as your protein,
  fat and the safety floor let it go" whenever a cut's gap was under 250. That
  is untrue for an unfloored quarter-pound cut. Web keys it on
  `previewGoal().floored` and says ", the lowest the floors allow".
- **One card at a time, and each DECISION revertable alone.** `holdCard`
  does not ask about a target under the safety floor (that is the floor
  card's question), so the two never show together, and neither card's code
  refers to the other: their shared write path (`askCardEl`,
  `rewriteTargets`) is its own commit, so `git revert` of either DECISION
  commit is clean. Keep that shape in native.
- **The floor card needs an `auto` node with `on === false`** (the brief's
  condition). An account whose targets have no `auto` node at all is not
  asked. Listed for Micah.
- **`autoPlan`'s `lifted` is only set for a move UP past the step.** A cut that a
  floor merely stopped short (1,250 -> 1,200) is toasted with the trend
  sentence, never "Raised to ...".
- **`setGoal` now rejects before assigning** when the write is refused; its
  callers are unchanged (they awaited it before too).
- **B2's Settings bound applies only to a changed year.** An unchanged stored
  year keeps the old check (1920 .. this year - 12), so existing accounts born
  in 2013 can still save a name.

---

## 5. Not built (needs Micah, or listed-not-fixed)

DECISIONS SKIPPED by the brief: the va-abc setup blend (#13), T28 (#14), the
± width (#15), the 0.3 bar wording (#16), hysteresis (#17), vb-a-imp2 (#18),
F24, the %BW approval bars (#8), the cut cap (#7), the rate-box warning and
cap (#6), the typed-target "refuse under 800 / warn under the floor" rule
(#1's sub-choice), the food-entry confirm and the intake cap (#10), the F16
doctor / pregnancy line (#21), blocking existing under-13 accounts (#3).
Listed, not fixed: F21, F42, F49, F51, F33, F34 (D21), F35, CMB2 OPEN 6-9.
