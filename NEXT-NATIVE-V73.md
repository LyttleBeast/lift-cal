# Porting rack-v73 to rack-mobile

rack-v73 is Coach v2 ship 5: "another set, and at what weight?" in the gym
(`COACH-V2-SPEC.md` §5; `SHIP-V73-SUMMARY.md` for what shipped and why). Read
`NEXT-NATIVE-V72.md` first — the store, the question machinery and the recap
are v72's and this ship builds on them. Nothing here is published to the
database rules: `database.rules.json` is byte-identical to rack-v72.

## 1. The pure files, verbatim

Five of the files `tools/verify-*-verbatim.mjs` pins moved. Copy them byte for
byte into `src/pure/` and re-pin; the sha256 of each as merged on `ship-v73`:

| file | sha256 | what changed |
|---|---|---|
| `coach-live.js` | `ba02e1215fcf437a6f35a966c6ececf7059f62ae48dcded5ebc00083d1e7bef7` | `anotherSetRead(input, exId)` (new export), `countsOf`, `plainWork`, `dropFromAny`; imports `RAMP_HEAVY`, `RAMP_LIGHT_REPS`, `GRID_TOL` from `coach-ramp.js` |
| `coach-prog.js` | `0299ae7094a9822c662855c48eba7f9dd96a7549dee02c97f1c92dc57c83b1ac` | `stepOf(X, dir, equipment, lowerBody, u, told)` — `source: 'told'`; `liftOf()` reads `ex.stepTold`; the told-step why lines |
| `coach.js` | `867de74e9a5599940fea1be144fa9e0be7669a66ef470e980d9ff6d53e3f6294` | `lifts()` puts `stepTold` on a lift from `knowOf(settings, 'step', exId)`; `liveInput` gains `lastRamp(exId)`; `coach()` gains `another(session, opts)` and `liveQuestion(session, opts)`; `questionUnder()` returns `{ q, ctx }`; `questionView()` carries `writes`/`key`/`by`/`stamp` and `optionsFor(u)` for a fact question; `stepCtx()`, `liveQuestionOf()`; `normSettings()` keeps `asked.q_equipment_step:<exId>` |
| `coach-ask.js` | `280d39d735bded3a64af31252dd271ddcb972713f47b67fec6e8ff364778565e` | `q_equipment_step` in the catalog; `stepAskLift()`, `stepOptions()`, `stepStamp`, `STEP_ASK_DAYS`, `STEP_ASK_MIN_EXPOSURES`, `STEP_EQUIPMENT`; `valueOk` takes a two-decimal number for a ranged fact (was integer); imports `wIn` |
| `coach-overlap.js` | `72cbd40f8922378c9d96997df97e3178a9530f035d0a74b5ac0cdc671b435fbb` | `stepFor(input, exId, now)` — a lift's step in use, for the question's gate |

### What `anotherSetRead` returns, so the native sheet knows what to draw

```
null | { answer: 'no' | 'stop' | 'warmup' | 'yes' | 'probably',
         text, short, why: [],
         tw, tr, loadLb,            // nextSet()'s number, or null
         usual: { n, more, of } | null,
         chips: [{ id, label, tw?, tr? }] }
```

Chip ids: `yes` · `heavier` (only on nextSet `up`) · `lighter` (only on `down`)
· `same` (a quote of the last ticked working set — only when plainly work, or
when nextSet itself said stop at it) · `next_warmup` (a row of his own last
ramp, from `input.lastRamp(exId)`) · `to_work` (the target mid-ramp) · `last`
· `done`. A chip with `tw`/`tr` is a pre-fill; `last` and `done` are not.

`input.lastRamp` is a function `exId → [{ w, r }]` of stored strings; coach.js
builds it from `rampProfile(lift.exposures, { warm }).lastRamp` over the
overlap's lifts. Hand it in the same way (the exposures are already counted in
`src/state/coach*.js`'s overlap input).

## 2. The impure half

### `src/ui/coach/live.jsx` — the sheet

Order, top to bottom (web `openLiveSheet`, `tools-check/coach-surface.mjs` O):

1. his bubble ("What should I do next?");
2. Coach's `another.text` — and, when the habit read (`live`) is a `switch` or
   a `next`, its text as a second bubble with **Add it** (a `done` or
   `another` habit read is not drawn: `another` says it);
3. **Why?** — `another.why` then the habit read's;
4. the effort row (shipped `rateAsk` / `EFFORT`) for the last unrated set;
5. the chip row from `another.chips`: a chip with `tw/tr` → the native
   `useNext` equivalent with `{ exIdx, setIdx }` of the rated set (or the last
   ticked row of the exercise in hand, `setIdx` −1 when none) and `{ tw, tr }`,
   then close; `last` → close and mark the exercise shown; `done` → close,
   mark every exercise shown, scroll the Finish button into view;
6. the live lane's question (`coach().liveQuestion(session, { current })`),
   stamped `markAsked(question.stamp)` when drawn; a tap writes
   `learnBy(question.key, question.by, op.value)` (null → nothing) and says
   `op.ack !== undefined ? op.ack : question.ack`.

After an effort tap: the shipped `rateAnswer` line, then `another` is read
again and the bubble text and chip row redraw (a *Too hard* removes the heavier
chip and turns the answer into the stop). The shipped "Use it for my next set"
button is drawn only when `another` is null (nothing ticked yet, or a log not
read yet), beside the shipped next-set bubble.

The tally: `learnTally({ extraOffered: 1 })` once per sheet open when a
`yes`/`probably` with a `yes` chip is drawn; `learnTally({ extraTaken: 1 })`
when the `yes` chip is tapped. Never from the quiet line.

### The quiet line

`noteLiveTick` now reads `coach().another(session, { current: exIdx }).short`
instead of `.live(...).short`, keeps the once-per-exercise `shown` rule and the
dismiss, and stores `kind: a.answer`. Two new pure helpers in `coach-ui.js` —
`markNudgeShown(session, exIdx)` and `markAllShown(session)` — are what the
`last` and `done` chips assign to `session._coach`; `workout.js` hands the sheet
`shown` and `done` callbacks beside `rate` and `useNext`, and the Finish button
carries `id="wkFinish"` for the scroll.

### `coachData.js`

`learnTally` and `learnBy` exist since PORT-V72; `patchNow()`'s stamp prune
gains `q_equipment_step:` beside `warm:` and `q_pr_how:`. Nothing else.

### The question under the targets

`coach().ask('ask_targets').question` may now be `q_equipment_step` about a
lift on the plan; its view carries `writes: 'knowBy'`, `key: 'step'`,
`by: <exId>`, `stamp: 'q_equipment_step:<exId>'` and `options` in the account's
unit. The native targets screen's question row writes it the same way as the
sheet above (one `writeAnswer`).

## 3. Verifier cases to port

- `tools-check/coach-live.mjs` K — the whole section: the order, the stop
  texts, the warm-up chips with and without a last ramp, the counts' three
  wordings, same/up/down chips, no heavier after a step down, the quote gated
  by `plainWork`, the stricter drop, the gates, determinism, and the 500-session
  sweep (every chip's tw ∈ ticked w's ∪ nextSet tw).
- `tools-check/coach-prog.mjs` L — the told step: used only without a jump
  seen twice, dropped when the log learns one, ignored off the kilo grid, junk
  ignored; nextSet `up` with "the step you told me"; never `up` after a `down`
  (600-history sweep).
- `tools-check/coach-ask.mjs` G — the row, the chips from `wIn`, `normKnow`
  on a 2.5, `stepAskLift` lift by lift, `liveQuestion` through the engine.
- `tools-check/coach-surface.mjs` G and O, `effort.mjs` E, `tick-targets.mjs`
  J — the sheet's thread and chip row, the tally on draw and Yes only, never on
  paint, a chip tap pre-filling exactly one row.
- `tools-check/coach-state.mjs` E — the new stamp and a 2.5-lb step round-trip.
- The battery: `scoring.mjs` `scoreChips` and the `answer` reading in
  `scoreLive`; `harness.mjs` calls `another` after each tick; `generator.mjs`
  gives `bodybuilder_volume` lifters `knowBy.step` on one to three stack lifts.

## 4. Rules

None. `knowBy.step`, `tally` and the per-item `asked` stamps are v72's block
(`NEXT-NATIVE-V72.md` §5); a `v` of 2.5 passes its `isNumber() … <= 100000`.
If native's `asked` rule is enumerated, add `q_equipment_step:[A-Za-z0-9_-]{1,40}`
to the `$id` alternatives (AGENTS.md).
