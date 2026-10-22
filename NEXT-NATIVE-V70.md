# Porting rack-v70 to rack-mobile

Web ships as `rack-v70`, built on `rack-v69` (`b98e904`). The tree it mirrors is
`~/dev/rack-mobile`.

v70 is **the ramp model** — Coach v2 ship 2 (`COACH-V2-SPEC.md` §2, §5.3,
`BUILD-PLAN.md` ship 2). One new pure module and six pure files change; one
line of one screen changes. **No stored field is added or changed, no node, no
database rule, no migration.** Nothing in `database.rules.json` or the Worker
moves. Every word Coach says stays in the third person (the voice is rack-v71).
Nothing is asked and nothing is stored about the ramp (the confirmation is
rack-v72): the model is recomputed on every read, like every other baseline.

---

## 1. The pure files, verbatim

Copy the seven across byte for byte and re-pin their hashes in
`tools/verify-coach-*-verbatim.mjs` in the same commit. `coach-ramp.js` is new
in `src/pure/`; it imports `./analytics.js` (`isWorking`) and nothing else, so
the stub list is unchanged.

| file | sha256 (web, rack-v70) |
|---|---|
| `coach-ramp.js` (new) | `49c04c6ba8de79ac35ca3f809dc93938d5ad3a9db2f275c8dbff0a5e7703d3cc` |
| `coach-prog.js` | `74f2395ce69c0dad7e7703b61e30b01913d4389f30e635facd7a3f8b5ac5991e` |
| `coach-live.js` | `11bdac94a6ea458ec02d6a99200ebd06cbfe486505e3c42e6d70b757092ce856` |
| `coach-volume.js` | `5f6c6fcd7303f9bf761366c48d58624094f1f1aa2076a458a235caff5abfcd02` |
| `coach.js` | `1076430a355030b401784fa54c69b3d1bd9b9ac9764570b05d8590ed1ccf6480` |
| `coach-build.js` | `e05fe571514085d8c6c4d583564ff861c1d2eefae2876729e299f33a8c1db5af` |
| `coach-overlap.js` | `8c19bf0da4f94455667e9066da171250a7bc69c41bf3bd191b07b0fd6399106b` |

(`node -e` over `createHash('sha256')` on the file bytes.) New imports, all of
them `./coach-ramp.js`: `coach-prog.js` (`workSetsOf, rampLoads, rampProfile`),
`coach-live.js` (`workSetsOf, rampLoads`), `coach-volume.js` (`workSetsOf,
rampLoads`; its `isWorking` import from analytics.js is gone), `coach.js`
(`workSetsOf, rampLoads`), `coach-build.js` (`workSetsOf, rampLoads`; its
`isWorking` import is gone). `coach-overlap.js` imports nothing new.
`coach-goal.js`, `coach-tags.js`, `coach-ready.js`, `coach-fuel.js`,
`analytics.js` are untouched — stats, records and the index say what the log
says, and `tools-check/warmup-leaks.mjs` holds that.

What changed, so the port's own verifiers know what to hold:

### `coach-ramp.js` — which of a lift's sets were the warm-up

`rampOf(sets, opts)`, `workSetsOf(sets, opts)`, `rampLoads(setLists, opts)`,
`rampProfile(exposures, opts)`; constants `RAMP_LIGHT 0.70`, `RAMP_MID 0.85`,
`RAMP_HEAVY 0.93`, `RAMP_MAX_SETS 6`, `GRID_TOL 0.011`, `RAMP_KNOWN_EXPOSURES
6`. The module header has every rule and why; in one breath: before the first
set at the top load, in an ascending run, a set typed N is a probable warm-up
when it is light and short the way a warm-up is (any reps to 70% of the top;
five or fewer to 85%; a double, or a triple before a top of five or more, to
93%; a feeler of about the top's reps to 93% when the top is held for two sets
or more; or a load he only ever warms up with on the lift — `rampLoads` over
his newest six exposures), at most six rungs, the run ended by a descent from
above the light tier, a set typed F or D, a set rated too hard (`rir === 0`),
or a third set at one load. Typed W stays W. `assisted`, `warm: 'no'` and a
bodyweight scheme switch detection off. Loads are compared as stored pounds.

### `coach-prog.js` — the split in every target read, and the `warmup` next set

- `readExposure()` builds `work` from `workSetsOf(all, { assisted, known })`
  with the sets' original indices; `all`, `keep` and the ghosts keep the
  stored type. `readAll()` reads every exposure with `rampLoads` over them.
- `setsFor()` never rewrites a W row: one heavier than a reduced or re-entered
  top is dropped from the target's rows (so `sets.length` can be shorter than
  last time's; the builder's duplicated-block split falls back to placeholders).
- `nextOf()`: today's ticked sets (warm-ups included — `today` now carries
  them; a set with `done: false` is not read) are split with the target's
  load as the top (`T: t.loadLb`), his ramp loads (`known`), the target's
  first-set reps (`R`), whether he ramps as a rule (`habit`, `rampProfile`
  stage `yours`) and his last top load (`anchor`). New first kind **`warmup`**
  before the first working set when a warm-up was ticked: `{ kind: 'warmup',
  tw, tr, loadLb (the target's), text: 'Warming up. The target when you get
  there: 320 lb × 6.', why: ['Coach’s target for this lift today: …'],
  warmup: true }`. No `up` after a step down in the same session ("Coach
  doesn’t step up after a step down in the same session.").
- `baselines().tops[].sets` carry `rir` when a set has one.

### `coach-live.js` — the first working set is the first set at work

`todayOf()` and `historyOf()` read working sets through `workSetsOf` with
`rampLoads` over the window's sessions; each live entry also carries `ticked`
(every ticked set with reps), which is what `nextSet` is asked over.
`fatigueIn`'s first set, `anotherRead`'s counts and `doneRead` follow.
`ratedOf()` never offers the chips on a probable warm-up. `rateAnswer()` on a
`warmup` next says the opener and the warmup text ("Good. Warming up. The
target when you get there: …").

### `coach-volume.js` — the hard sets are the split

`hardSets(sets, assisted, known)` is `workSetsOf`; `DISGUISE_SHARE` and
`DISGUISE_REPS` are gone; `dropped()` reads the same split; `weeksOf` computes
`rampLoads` per lift once.

### `coach.js` — every working-set count

`shapeSession()` (`sets`, `fsets`, `lsets`, `lfsets`, `ldrop`, the signature),
`workingSets()` (Patterns) and `workingSetsOf()` (the finish line's "n sets")
count through `workSetsOf` with `rampLoads` per lift over the whole log
(`derive().knownOf`). `assistedOf(ex, lib)` is coach-prog.js `liftOf`'s test.

### `coach-build.js` — the nudge, and W rows as logged

`nudge(sets, assisted, exposures)` reads the working sets through the split;
the three views copy W rows as logged; a target's rows never clamp one.

### `coach-overlap.js` — one fence

`record()` skips a load whose best set there was rated too hard (`rir === 0`).

## 2. The verifier cases to port

| native verifier | cases (from the web file of the same name) |
|---|---|
| `tools/verify-coach-ramp.mjs` (new) | all of `tools-check/coach-ramp.mjs`: his squat day tagged and untagged; the shapes that stay work; the triple, the feeler, the third set at one load, the rungs, the light descent, rir 0; `rampLoads`; the switches; the live plan (`T`, `R`, `habit`, `anchor`); determinism, key order, a kilo-stored load; `rampProfile` over the v68 warmup-leaks log; the import/export fence |
| `tools/verify-coach-pure.mjs` | ALLOWED lists gain `./coach-ramp.js` for coach.js, coach-build.js, coach-live.js, coach-prog.js, coach-volume.js (its "exactly four imports" is five); a section for coach-ramp.js: imports only analytics.js's `isWorking`, no `Date`, no `Math.random`, no module-level `let`, never a Coach module |
| `tools/verify-coach-prog.mjs` | section K: the same target with the ramp untagged, tagged or absent; "Last time:" never recites a ramp; the untagged ramp rows ride into the target's sets typed N; `nextSet` on `[N 45×8]` under a 320 × 6 target is `warmup` with the target's tw/tr, on `[W 45×8, N 320×6]` `same` at 320, `up` after 320 × 8, no `up` after a step down, a row not ticked is not read; a reduce drops a W row heavier than its load and keeps a lighter one; the byte-identity checks against older engines allow a v70 reason (a probable warm-up in any exposure, or a dropped W row) |
| `tools/verify-coach-live.mjs` | section J: the drop 5 → 3 at 315 behind an untagged 45, 135, 225 reads as fatigue; the same word for word with the ramp typed W or absent; `anotherRead` counts 2 working sets; the chips rate the 315, not the 225; a log of untagged ramps teaches the same usual; a light set rated too hard is never "one more set". Section H's warm-up case: a typed W ticked alone is `warmup`, not `target` |
| `tools/verify-coach-volume.mjs` | section D cases D1–D7 against the tier rule (the disguise cases are gone); the sweeps use one load per exercise |
| `tools/verify-drop-sets.mjs` (the v54 identity sweep) | one load per exercise per session; logs the ramp model reads differently are left out |
| the version pin | `rack-v70` |

Every staging verifier that writes Coach's modules into a temp dir must stage
`coach-ramp.js` too (web: a `package.json` `{ "type": "module" }` and the file
under its own name, or `coach-ramp` in the FILES list).

## 3. The battery

`tools-check/battery/` as before, with: `stage.mjs` staging `coach-ramp.js`;
`scoring.mjs` — `N_WARMUP_WORK` (a working set read as a warm-up: the `warmup`
kind after a true working set), the `warmup` kind otherwise ok and judged on
nothing else, `N_WARMUP` not fired when the quoted load is the day's own
target load (`st.targetLb`, from the harness), `T_GHOST` walked row by row
with a dropped W never a ghost; `harness.mjs` hands `targetLb` in and no
longer puts a `shape` defer down to the ramp; `run-all.sh` defaults
`GATE=all`; two regression cases added (`powerlifter_ramp-3125032963-s47-
overhead-press`, `…-s91-incline-barbell-bench-press`: ramp-to-top working sets
are work). On the web at this ship: **35 wrongs of 110,901** (23 `N_WARMUP`,
12 `N_WARMUP_WORK`, every one on the live next set's first one or two ticks —
`SHIP-V70-SUMMARY.md` says why), volume, live, record, target and plateau at
0; `GATE=all` fails on those 35. Native should expect the same numbers from
the same files.

## 4. The impure seams

- **`src/ui/coach/live.jsx`** (web: `coach-ui.js` `openLiveSheet`): a
  `next.kind === 'warmup'` is drawn like any next (its `text` already says
  it); the "Use it for my next set" button is **not** offered for a `warmup`
  kind — the row he wants next is a warm-up v68 already greyed in. One `&&
  n2.kind !== 'warmup'` on the button.
- `coach-data.js` / `src/state/coachData.js`: untouched. The live session is
  handed in whole as before; `coach-live.js` now reads its warm-up rows too.
- The native Coach screens draw the same fields as before; `next.warmup` is
  new and read by nothing on a screen.

## 5. The schema

None. No field, node, rule or migration. `web-patches/database.rules.PROPOSED.json`
does not change for this ship.
