# Compose — the block names and the contract (Phase X, V59 §12.1)

The first half of Phase X: every top-level block of the seven screens the
experimental vibe may re-arrange has one name, the same on both clients, and
the contract has a `compose` role and its grammar. Nothing draws from it yet;
the engines (X2, X3, X6) are the second half. v1 is unmoved: its compose is
`{}`, and `arrange()` hands `{}` back as today's order.

- Web: branch `vibes/compose`, worktree `wt/web-compose`, commit
  "Compose (WIP): the names and the contract".
- Native: branch `vibes/compose`, worktree `wt/nat-compose`, commit
  "compose(wip): the names and the contract (V59 §12)".

The table below is generated from `vibes/defs/vocab.js` `compose.screens`
(tmp/compose/write-compose-md.mjs), so it is the vocabulary, not a copy of it.

## The grammar (vocab.js `compose.grammar`)

compose is {} (every screen in v1's order, no group) or names every screen here, each { fallback: true } (that screen in v1's order, no group: same order, new shapes) or { fallback: false, order, groups }: order names every block of the screen exactly once; groups, if given, is a list of runs, each two or more blocks adjacent in order and in no other run, drawn together as one board. No other key. Only a vibe with experimental: true holds anything but {}. A block not drawn in a render is skipped where it stands; an entry index.js arrange() cannot read draws v1's order.

A screen entry is `{ fallback: true }` or `{ fallback: false, order, groups }`,
and nothing else. The rules the verifiers hold it to (section G of
`tools-check/vibes-contract.mjs` and `tools/verify-vibes-contract.mjs`):

- Nothing added, removed or hidden: an order names every block of its screen once, and each block keeps everything it holds, in its own order. A block's inside is never composed.
- The dock is no screen and no block here: its tabs, their order and its place never move (§2). Nor does anything floating over a screen (Fuel's Log food button, the peek bar, the rest pill), nor a screen's tailpiece, which stays last.
- A block in a screen's `first` keeps its place at the top, in that order: the screen heads hold the navigation (the month and day arrows, the gears, the You gear) and the exercise card's head its name and ⋯, which no composition moves.
- Every pair in a screen's `before` holds in every order: a control stays above what it controls, and nothing that appears mid-entry (Coach's line or the hint, the plate strip) lands above the set rows under the thumb.
- A group draws its blocks as one board and hides nothing: every member keeps its own head, words and controls, whole; nothing is merged. A block in `alone` is never in a group: the Coach card's box is fixed (190 / 164) and proven alone.
- The order is the drawn order: the web moves the DOM nodes and native the element list, never CSS order, so reading and focus order follow what is seen. A data list (exercises, sets, meals, entries) keeps its data order inside its block.
- With {} every screen is today's tree: the same nodes, order, attributes, styles and props, and no wrapper. The only addition either engine may make is the web's data-block="<name>" hook on a block's node.
- Fallback is per screen, never the whole vibe: a screen whose re-arrangement is not proven safe is written { fallback: true }, and the report names it (§12.3).
- Switching vibes re-renders into the new order and loses nothing: a live session, its sets, the rest timer, an open sheet, text half typed.

Checked per definition, with a canary per rule (eighteen, each refused):
only an experimental vibe composes; the dock is no screen; every screen is
named with its fallback flag; an order names every block of its screen once
(nothing removed, added or twice); no key outside the grammar (`merge`,
`split`, `within` are refused); a fallback screen holds nothing else; the
`first` blocks lead; every `before` pair holds; a group is a run of two or
more, adjacent and written in order, in no other group, and never holds an
`alone` block. Three mutation runs through `VIBES_CONTRACT_DEFS` (v1
composing, a block renamed in the vocabulary, `arrange()` reversing) each
fail both verifiers.

## `arrange(compose, screen, names)` (vibes/defs/index.js)

The one reading both engines share, so one vibe can never draw a screen in two
orders. `names` is the blocks drawn in this render, in v1's order;
it returns `{ order, groups }`. `{}`, a fallback screen, or an entry it
cannot read (an order that leaves out a drawn block or names one twice) is
`names` as given with no group. A block not drawn now is skipped where it
stands. A group with fewer than two drawn members, not adjacent, or sharing a
block with an earlier group is dropped. It never throws and returns fresh
arrays. Native `build()` hands the definition's compose on as `T.compose`
(`{}` in v1); the web engine reads it from the definition.

## The names

Ten screens: the five tab landings and the recap (named as their tailpieces
are), and the live session as four zones, because its three composable parts
(the top bar, the stack's position, the plate strip) sit under three different
parents. Each zone is one parent's children: the web moves those DOM nodes, and
native orders that element list.

### `you` — You (the tab landing)

Web: you.js build(): the children of #view-you .screen-pad, before tail().  
Native: app/(app)/(tabs)/you/index.jsx You: Hero's fragment (src/ui/you/Hero.jsx: its row, then children, then the since line), then each Section in YouBoundary, before Tailpiece.  
leads: `hero` · never grouped: `coach`.

| # | name | web | native | drawn |
|---|---|---|---|---|
| 1 | `hero` | hero(): .you-hero (avatar, greeting, date, gear) | src/ui/you/Hero.jsx Hero: the avatar \| greeting \| gear row | always |
| 2 | `coach` | coach-ui.js coachCard({ go }): .coach-card | src/ui/coach/Card.jsx CoachCard, handed to Hero as its children | always |
| 3 | `since` | sinceLine(): .you-since | src/ui/you/Hero.jsx Hero: the since Text after children | always |
| 4 | `doing` | section('How you’re doing'): .you-sec with assessCard() wins and improve | Section "How you’re doing" with its two AssessCards | always |
| 5 | `goal` | section('Goal'): .you-sec with trajectoryCard() | Section "Goal" with TrajectoryCard | always |
| 6 | `week` | section('This week'): .you-sec with weekCard() | Section "This week" with WeekCard | always |
| 7 | `noticed` | section('Rack noticed'): .you-sec with insightsCard() | Section "Rack noticed" with InsightsCard | Rack noticed something (found.insights is not empty) |
| 8 | `trends` | section('Trends'): .you-sec with weightCard(), fuelCard(), trainingCard() and .you-pair (stepsCard \| waterCard) | Section "Trends": WeightCard, FuelCard, TrainingCard and the StepsCard \| WaterCard row | always |
| 9 | `review` | section('Weekly review'): .you-sec with reviewCard() | Section "Weekly review" with ReviewCard | always |
| 10 | `app` | section('App'): .you-sec with installCard() and the owner's adminRow() | Section "App" with the owner's Admin row | the owner is signed in; on the web also while the app is not installed and the install card not dismissed |

### `workout` — Train (the calendar)

Web: workout.js renderCalendar(): the children of #view-workout .screen-pad, before tail().  
Native: app/(app)/(tabs)/workout/index.jsx Train: the ScrollView's children, before Tailpiece.  
leads: `head` · never grouped: `coach`.

| # | name | web | native | drawn |
|---|---|---|---|---|
| 1 | `head` | .cal-hd: the eyebrow and month over .cal-nav (‹ ›) | the row View: ScreenTitle and the two NavBtns | always |
| 2 | `dow` | .cal-dow (S M T W T F S) | the day-of-week row View | always |
| 3 | `grid` | .cal-grid (.cal-day cells) | the weeks View of DayCell rows | always |
| 4 | `legend` | .cal-legend | the legend View (GROUP_ORDER) | always |
| 5 | `monthStats` | renderMonthStats(): the div holding .stat-row (Sessions, Volume, Minutes) | StatRow (Sessions, Volume, Minutes) | always |
| 6 | `weekVolume` | renderWeekVolume(): .card "Last 7 days — working sets" | Card "Last 7 days — working sets" | always |
| 7 | `coach` | coach-ui.js coachCard({ tight: true, … }): .coach-card.tight | CoachCard tight | always |
| 8 | `start` | .btn-primary.btn-lg "Start workout" | Btn primary large block: "Start workout", or "Resume …" while a session is parked | web: no session parked; native: always |
| 9 | `split` | .btn-split (Routines \| Exercises) | the row View (Routines \| Exercises) | always (Routines is left out while a session is parked) |
| 10 | `statistics` | .btn-ghost.btn-block "Statistics" | Btn ghost block "Statistics" | always |

### `food` — Fuel (the day)

Web: food.js render(): the children of #view-food .screen-pad, before tail(). The Log food button (renderFab()) follows it, floats, and is no block.  
Native: app/(app)/(tabs)/food.jsx Fuel: the ScrollView's children, before Tailpiece. Fab sits outside the ScrollView and is no block.  
leads: `head`.

| # | name | web | native | drawn |
|---|---|---|---|---|
| 1 | `head` | .cal-hd: the eyebrow and day over .cal-nav (gear, ‹ ›) | the row View: ScreenTitle, the gear and the two NavBtns | always |
| 2 | `summary` | renderSummary(): .card.fuel-sum | Card lead (the summary) | always |
| 3 | `meals` | renderMeal() for each of MEALS, in its order: four cards, one run | MEALS.map(MealCard): four cards, one run | always |
| 4 | `water` | water.js renderWater() | WaterCard | always |
| 5 | `micros` | renderMicros() | MicroCard | always |

### `weight` — Weight

Web: weight.js render(): the children of #view-weight .screen-pad, before tail().  
Native: app/(app)/(tabs)/weight.jsx Weight: the ScrollView's children, before Tailpiece.  
leads: `head`.

| # | name | web | native | drawn |
|---|---|---|---|---|
| 1 | `head` | .cal-hd (Body weight / Weight) | ScreenTitle | always |
| 2 | `log` | .card[data-lead=weightLog]: the input, Log, "Weighed earlier?", the note | Card photo="weightLog" | always |
| 3 | `stats` | .stat-row: Latest, 7-day avg, the rate | Headline (StatRow) | a weigh-in exists (s.latest) |
| 4 | `chart` | renderChart() | TrendCard | always |
| 5 | `tod` | renderTOD() | TimeOfDayCard | always |
| 6 | `tdee` | renderTDEE() | MaintenanceCard | always |
| 7 | `recent` | renderRecent() | RecentCard | always |

### `steps` — Steps

Web: steps.js render(): the children of #view-steps .screen-pad, before tail().  
Native: app/(app)/(tabs)/steps.jsx Steps: the ScrollView's children, before Tailpiece.  
leads: `head` · holds: `trend` above `stats`.

| # | name | web | native | drawn |
|---|---|---|---|---|
| 1 | `head` | .cal-hd: the eyebrow and title over .cal-nav (gear) | the row View: ScreenTitle and GearBtn | always |
| 2 | `today` | renderToday() | TodayCard | always |
| 3 | `trend` | renderTrend(): the chart and its range chips | TrendCard (its range chips set StatsCard's range) | always |
| 4 | `stats` | renderStats() | StatsCard | always |
| 5 | `streaks` | renderStreaks() | StreakCard | always |
| 6 | `consistency` | renderConsistency() | ConsistencyCard | always |
| 7 | `weekdays` | renderWeekdays() | WeekdaysCard | always |
| 8 | `recent` | renderRecent() | RecentCard | always |

### `recap` — The workout summary (the recap)

Web: workout.js renderSummary(): the children of .summary-page, before tail().  
Native: app/(app)/(tabs)/workout/summary.jsx Summary: draw[k]() for each k of recapView().order (src/pure/recap-view.js RECAP_ORDER, whose names these are), before Tailpiece.  
no pins.

| # | name | web | native | drawn |
|---|---|---|---|---|
| 1 | `hero` | .summary-hero | draw.hero | always |
| 2 | `feel` | feelCard() | draw.feel: FeelCard | not skipped, and "After a workout: how it felt" is on |
| 3 | `wins` | the PR card (.pr-card), "Session milestones" and "First time logged", each drawn when it has rows: one run | draw.wins: Wins (the same three) | always (it may draw nothing) |
| 4 | `stats` | .summary-page > .stat-row (Duration, Volume, Working sets) | draw.stats: StatRow total | always |
| 5 | `did` | .card "What you did" | draw.did | always |
| 6 | `like` | .card.summary-like "Compared with sessions like this" | draw.like | two or more sessions of this kind |
| 7 | `buttons` | Done, Save as routine, See statistics: three buttons, one run | draw.buttons: the View holding the three Btns | always |

### `session` — The live session: the page under the top bar

Web: workout.js renderSession(): the children of its .screen-pad body (the top bar, .wk-bar, is sessionBar).  
Native: app/(app)/(tabs)/workout/session.jsx Session: the ScrollView's children (TopBar, outside it, is sessionBar).  
no pins.

| # | name | web | native | drawn |
|---|---|---|---|---|
| 1 | `editMeta` | renderEditMeta(): .card "Editing a past workout" | EditMeta | editing a past workout |
| 2 | `empty` | .empty-state | the Card "Empty session" / "No exercises left" | web: no exercise and no lifting block; native: no exercise |
| 3 | `stack` | sessionLayout(): .ex-block and .wk-block in session order, one run | sessionLayout().map: ExerciseBlock and LiftingBlock in session order, one run | always (it may draw nothing) |
| 4 | `add` | .add-row (+ Add exercise, + Add Lifting Block) | the row View of the two ghost Btns | always |
| 5 | `discard` | .btn-danger.btn-block (Discard workout / Cancel editing) | Btn danger block | always |

### `sessionBar` — The live session: the top bar

Web: workout.js renderSession(): the children of .wk-bar.  
Native: app/(app)/(tabs)/workout/session.jsx TopBar: the children of its row View.  
no pins.

| # | name | web | native | drawn |
|---|---|---|---|---|
| 1 | `title` | .wk-bar-left: the name and the clock (sessionTitle) | the flex-1 View: the name and the clock (sessionTitle) | always |
| 2 | `coachChip` | coach-ui.js liveChip(): .wk-coach | src/ui/coach/live.jsx LiveChip | Pro, "In the gym" on, never in an edit |
| 3 | `calendar` | .wk-cal-btn | the calendar Pressable | never in an edit |
| 4 | `finish` | .btn.btn-primary Finish (Save in an edit) | Btn primary Finish (Save in an edit) | always |

### `sessionTitle` — The live session: the top bar's left column

Web: workout.js renderSession(): the children of .wk-bar-left.  
Native: app/(app)/(tabs)/workout/session.jsx TopBar: the children of the flex-1 View.  
no pins.

| # | name | web | native | drawn |
|---|---|---|---|---|
| 1 | `name` | .wk-name (the session's name) | the name TextInput | always |
| 2 | `clock` | .timer#wkClock, or in an edit the date · duration .timer | LiveChrome.Clock, or in an edit the date · duration Text | always |

### `exercise` — The live session: each exercise card, in a lifting block or not

Web: workout.js renderExercise(): the children of .ex-block.  
Native: app/(app)/(tabs)/workout/session.jsx ExerciseBlock: the children of its card View.  
leads: `head` · holds: `columns` above `rows`, `rows` above `hint`, `rows` above `plates`, `rows` above `actions`.

| # | name | web | native | drawn |
|---|---|---|---|---|
| 1 | `head` | .ex-hd: the group tag, the name, ⋯ | the head row View | always |
| 2 | `prev` | .ex-prev ("Last · …" / "No previous record") | the prev Text | always |
| 3 | `columns` | .set-hd (Set, the unit, Reps, e1RM) | SetTable | always |
| 4 | `rows` | renderSet() for each set, and dropAddRow() after a drop set's last: one run in set order | the keyed Fragments: Swipe > SetRow, and DropAdd after a drop set's last | always (it may draw nothing) |
| 5 | `hint` | coach-ui.js nudgeLine(), or .swipe-hint in its slot | NudgeLine (SwipeHint its fallback) | web: a nudge, or a set exists; native: always mounted |
| 6 | `plates` | renderPlates(): .plate-strip | PlateStrip | a barbell at 45 lb or more |
| 7 | `actions` | .ex-actions (+ Set) | the + Set row View | always |

## Notes for the engine half

- **Runs.** `meals`, `wins`, `buttons` (web), `stack` and `rows` are
  several sibling nodes that move together, in their data order. `wins` may
  draw nothing, and so may `stack` and `rows`: an empty run is skipped.
- **Where the clients differ today** (each is v1 and stays so): Train's
  `start` is absent on the web while a session is parked and is "Resume …"
  on native; the session's `empty` shows on the web only when there is no
  exercise and no lifting block, on native when there is no exercise;
  `hint` is always mounted on native (NudgeLine may draw nothing); the
  recap's `buttons` is one View on native and three buttons on the web;
  You's `hero`, `coach` and `since` are Hero's fragment on native (the
  coach is its `children`), so re-ordering them means Hero handing out its
  row and its since line as two pieces — with `{}` its tree must stay the same.
- **Never composed:** the dock; anything floating (Fuel's Log food button,
  which the web appends after the screen and native draws outside the
  ScrollView; the peek bar; the rest pill); each screen's tailpiece, which
  `tail()` appends last on the web and `<Tailpiece>` draws last on native —
  compose before it.
- **Order-dependent code** stays true under any legal order: the session's
  done flash finds its card as `document.querySelectorAll('.ex-block')[exIdx]`
  (workout.js), and no zone re-orders exercise cards; the tour targets the
  dock, which is never composed. You's scroll restore (you.js render()) keeps a
  y offset, not a node, so it holds for any fixed order.
- **The web hook:** a block's node may carry `data-block="<name>"` (as engine
  v3's data-* hooks did); nothing else is added with `{}`.

## The experimental spec's composition, in this grammar

design/meet-day.md §8.1 wrote its data before this grammar existed. Read into
it (and held valid by section G, which uses exactly this object as its good
case):

```js
compose: {
  you:          { fallback: false, order: ['hero', 'since', 'coach', 'doing', 'goal', 'week', 'noticed', 'trends', 'review', 'app'],
                  groups: [['hero', 'since']] },
  workout:      { fallback: false, order: ['head', 'dow', 'grid', 'monthStats', 'legend', 'weekVolume', 'coach', 'start', 'split', 'statistics'],
                  groups: [['dow', 'grid', 'monthStats']] },
  food:         { fallback: true },
  weight:       { fallback: true },
  steps:        { fallback: false, order: ['head', 'today', 'streaks', 'trend', 'stats', 'consistency', 'weekdays', 'recent'],
                  groups: [['today', 'streaks']] },
  recap:        { fallback: false, order: ['hero', 'feel', 'wins', 'did', 'stats', 'like', 'buttons'], groups: [['did', 'stats']] },
  session:      { fallback: true },
  sessionBar:   { fallback: true },
  sessionTitle: { fallback: false, order: ['clock', 'name'] },
  exercise:     { fallback: false, order: ['head', 'prev', 'columns', 'rows', 'plates', 'hint', 'actions'] }
}
```

Renamed from §8.1: the recap's `prs`, `milestones`, `firsts` are one run,
`wins`, and `done`, `saveRoutine`, `seeStats` one run, `buttons` (native's
recap-view.js RECAP_ORDER already draws them so, and neither move re-orders
them); the recap's totals strip is `stats` and its comparison `like`
(RECAP_ORDER's names); the session's bar is two zones, `sessionBar` (v1's
order) and `sessionTitle` (clock over name). §8.1's `fab` is no block: it
floats. `join` is `groups`.

**Not expressible, and why (listed, not built):**

| §8.1 move | Why no compose reaches it | What draws instead |
|---|---|---|
| `merge` Goal, Rack noticed, Weekly review (section band = card band) | It hides one copy of a head string; the contract keeps every block's head whole. It is also inside one block (a section and its card) | Meet Day's own fallback: both bands drawn (Q-Q1) |
| `split` Fuel's summary into count and macros | Inside the `summary` block (X4) | Fuel as a fallback screen: one summary panel, v1's order |
| `within` You's Body weight card (strip above chart) | Inside the `trends` block (X4) | v1's order inside the card |
| `within` the Steps / Water pair, rings as bars | A drawing swap inside `trends` (X5): a look's (`chart · board`), not an order | ten-cell segmented rings, by the look |
| This week as lanes | A look (`kpi · lane`), E3 | `kpi · plain` |
| X7, the current set | Not composition: `setRow · attempt`'s caller passes it | — |

## Hooks X1–X7, where this half leaves them

| # | State after this half |
|---|---|
| X1 the `compose` role | **Built**: ROLES compose, vocab.js compose (names and grammar), both verifiers' section G, pinned |
| X2 `compose(screen, blocks)` | The pure core is built (`arrange()`); the per-client helper that moves nodes (web) / elements (native) is the engine half |
| X3 call sites hand over named blocks | Engine half; the sites are the table above |
| X4 within-block order | Not composition (above) |
| X5 rings to bars | Not composition (above) |
| X6 the session | Engine half: `sessionTitle` and `exercise` are the zones |
| X7 the current set | Not composition (above) |
