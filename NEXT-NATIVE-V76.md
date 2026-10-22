# Porting rack-v76 (Coach v2 ship 6) to rack-mobile

rack-v76 is the last Coach v2 ship: starter bubbles that read the day, the drop
question (`q_drop_why`) and the gap question (`q_back_what`), and the rules
their answers feed (`SHIP-V76-SUMMARY.md` for what shipped and why). Read
`NEXT-NATIVE-V74B.md` first — v74's fallback and `q_want_next` are its, and this
ship builds on them. The build string is `rack-v76` (rack-v75, "replace
exercise", is a separate ship built in parallel; port the two independently).

**Rules: nothing published.** `database.rules.json` and
`database.rules.OPTIONAL-LOCK.json` are byte-identical to rack-v74. See §4 for
the native PROPOSED rules.

## 1. The pure files, verbatim

Four pinned files moved. Copy them byte for byte into `src/pure/` and re-pin;
the sha256 of each as committed on `ship-v74c`:

| file | sha256 | what changed |
|---|---|---|
| `coach-ask.js` | `b3656d55795f007b2888eeb06e6062298553872a593aed326ba47bdca7e91732` | `q_drop_why` and `q_back_what` in the catalog (fourteen rows); `short` on the three `open` rows (`q_goal_direction` "Which way are you going?", both goal checks "Did your goal change?"); `BACK_GAP_DAYS` (12, now declared before the catalog), `dropStamp`, `dropAskLift()`, `dropOptions()`, `idFor()`, `backAnswer()`; `pickQuestion()` reads a fact's staleness by `idFor(q, ctx)`; `debriefPlan()` takes `ctx.drop` and hands a fact question its `key`/`by` and `optionsFor(u, ctx)` chips |
| `coach-prog.js` | `b0b339fc56913948f013a50638f242e406da1a154bc9e2a785b3190663bc18c7` | `dropOf(ex, ctx)` (new export); `liftOf()` reads `ex.holdAt`, `ex.lightAt`, `ex.back`; `answeredAt()`, `heldOf()`, `lightOf()`, `learnFrom()`; `baselines()` and `nextOf()` learn range and step without a named lighter week; `decide()`: `prev` past a lighter week, the held target (`hold`/`held`) after the drop and on any session that earned the step, the re-entry at `REENTER_NEAR` with `back`, `easyAt` by `prev`'s own index; `nextOf()`: no `up` while held |
| `coach-overlap.js` | `d20bd869813102a65b7bae006b4e0042d011ef5227dedb53b215460d04afc499` | `dropFor(input, exId, now)` (new export); `lightWeeksOf()` — a lift's named lighter week is light for that lift's plateau read; `record()` skips a lift with `holdAt` or a named lighter week this week |
| `coach.js` | `d875915c9d3d62e9f32fc5f3b590a2615f53c75ebdd228c1ae3caee1101bca74` | `lifts()` puts `holdAt`/`lightAt` (knowBy.hold inside 42 d) and `back` (know.back `elsewhere` since the newest session) on each lift; `topicsFor()` is the scored pick (`QUESTION_BUBBLE`, `localHour`, the `BUBBLE_*` constants); `ask_records` in `TOPIC_BY_ID` (category `records`) and at the end of Train's `post` list; `questionUnder()` gains `dropCtx()` under the targets and `backCtx()` under `shape`/`lighter`; `ask()` maps `ask_shape` → `under:shape`, `ask_lighter` → `under:lighter` (the `question` key only when one is put); `questionView()` takes `by` from `idFor` and `optionsFor(u, ctx)`; `debriefRead()` hands `drop`; `normSettings()` keeps `asked.q_drop_why:<exId>` |

`coach-build.js` (`4a48d943…`) and `coach-live.js` (`c162045d…`) are unchanged
from rack-v74.

### What `topicsFor(surface)` returns now

```
[{ id, label, category, more?: true, question?: questionView }]
```

The engine's first picks come first and carry no `more`; the rest follow in
score order with `more: true`, and are what "More" reveals. A question bubble's
`id` starts with `QUESTION_BUBBLE` (`'q:'`), its `label` is the row's `short`,
and `question` is the opener's `questionView` exactly as `coach().question`
is. On You, Patterns stays last (with `more` when three were picked). The
input gains `recentTaps` (array of route ids, newest first, five deep).

## 2. The impure half

### `src/state/coachData.js`

1. **Tap memory** (web `coach-data.js` `rememberTap`, `LS_TAPS`): read
   `lsKey('coachTaps')` once with the open counter, keep route ids matching
   `/^[a-z_]{1,40}$/`, five deep. `rememberTap(id)` writes synchronously,
   newest first, each id once, five deep — device storage, never the database.
2. `coachInput()` adds `recentTaps: recentTaps.slice()` (the live list, so the
   next sheet sees this sheet's tap).
3. `patchNow`: prune `asked.q_drop_why:<exId>` past 56 days beside the others.

### `src/ui/coach/coach-view.js` — the sheet's bubbles

1. Draw `topicsFor(surface)` in its order. Show the items without `more`
   (fall back to `TOPICS_SHOWN` when there are none), and "More" for the rest.
2. A tap on a route bubble: `rememberTap(item.id)`, then route it as before.
3. A tap on a question bubble (`item.question`): draw that question exactly as
   the opener was drawn (stamp it on draw, `markAsked(question.stamp ||
   question.id)`), then the remaining bubbles below it. Never route it.
4. **On Pro the opener question is no longer drawn on open** — it is one of
   the bubbles (or none on a caution day). Basic, which sees no bubbles,
   draws `coach().question` as before.

### The recap (`recap-view`, web `workout.js` `debriefCard`)

The debrief question row may now be `q_drop_why` (`writes: 'knowBy'`, `key:
'hold'`, `by: <exId>`): a tap calls `learnBy(q.key, q.by, op.value)`, stamps
`q.stamp` (`q_drop_why:<exId>`), and shows the option's own `ack` when it has
one (`op.ack !== undefined ? op.ack : q.ack`) — the hold's names the lift and
the load.

### Under an answer

`ask('ask_targets').question` may be `q_drop_why` and `ask('ask_shape')` /
`ask('ask_lighter')` may carry `q_back_what` (`writes: 'know'`, `key: 'back'`):
the shipped "question under an answer" row handles both — `learnBy` for
`knowBy`, `learn` for `know` (web `coach-ui.js` `writeAnswer`).

### Verifiers to port

`tools-check/coach-bubbles.mjs` (new), `coach-ask.mjs` H, `coach-prog.mjs` M,
`coach-voice.mjs` Q (`tools/verify-coach-voice.mjs`: coach-ask.js's literals
under the voice ban, and exactly one `%` — `'% under last time. On purpose?'`
in `q_drop_why`'s text — no `%` in its chips or acks, nothing medical),
`recap.mjs` B (the drop question is the page's one `%`, and its hold chip
writes `knowBy.hold`), `coach-state.mjs` B (the set, not the order),
`coach-surface.mjs` (the first shown, the question bubble), `coach-goal.mjs`
(five routes may carry a question). The battery: `generator.mjs` (the third
fork, `knowBy.hold` on `injured_lighter`), `harness.mjs` `settingsAt` (a fact
only from its `at`), `scoring.mjs` (`T_INJURED`/`R_INJURED` without
`needsAnswer`), `README.md`.

## 3. The strings, exactly

- `q_drop_why`: `{name} came in {pct}% under last time. On purpose?` —
  `Building back up — hold it` (hold) · `Lighter week` (light) · `Just that day`
  (day); acks `Noted. I’ll hold {name} at {load} until you take it higher
  yourself.` (no load known: `Noted. I’ll hold it there until you take it
  higher yourself.`) · `Noted. I’ll read that as a lighter week, not a new
  programme.` · `Noted.`
- `q_back_what`: `Good to have you back. Training somewhere I can’t see, or time
  off?` — `Training elsewhere` (elsewhere) · `Time off` (off); acks `Noted.
  I’ll start you a little under where you were, not a lot.` · `Noted. I’ll start
  the weights lighter and work back up with you.`
- Held target why: `Holding {name} at {load} while you build back, as you
  asked.` then `That stands for six weeks from when you told me, or until you go
  heavier yourself.`; next set: `You said you’re building back on this one, so
  I’d stay here.`
- Re-entry: `… days since you last trained {group}. You said you kept training,
  so a small step back rather than a big one.` (also on a bodyweight lift's why)
- Bubbles: `Any records lately?` (ask_records); question bubbles `Which way are
  you going?`, `Did your goal change?`

## 4. Rules

Published: nothing. Native PROPOSED: the v72 `know`/`knowBy` block already
takes both facts (`v` a string ≤ 12; `$id` `/^[A-Za-z0-9_+-]{1,40}$/`; `know.$k`
`back` matches `/^[a-z][A-Za-z0-9]{0,23}$/`). If `asked` is enumerated, its
`$id` rule needs `q_drop_why:[A-Za-z0-9_-]{1,40}` as one more alternative;
`q_back_what` already matches `q_[a-z_]{1,40}`.
