# Porting rack-v52 to rack-mobile

Web shipped as `rack-v52`. The tree it mirrors is `~/dev/rack-mobile`.

v52 is **Coach trainer, stage four.**

- **Phase A, rest, recovery and the bad day.** A new pure module,
  `coach-ready.js`, adds:
  - a recovery window for each muscle group, read off his own gaps and longer
    after a day that was big against his own normal;
  - *What should I train today?* learning to say rest, or go lighter, and
    otherwise picking what is recovered;
  - a caution when *Make me a workout* would build a group that is not
    recovered;
  - the replayed "did you listen" readout;
  - readiness (*Should I rest or go lighter?*);
  - *How did today compare?* listing what was different about the day;
  - the **bad-day mark**, the one new stored thing.
- **Phase B, "Am I fueled?"** A new pure module, `coach-fuel.js`, reads his
  food against his own normal and never prescribes it. It brings the first food
  reads Coach makes outside Patterns (lazy, Pro only), and food rows in
  readiness and in *How did today compare?*.

The build brief is `SHIP-V52-PROMPT.md` and the design record is
`COACH-TRAINER-SPEC.md`. What was built, and every place it departs from the
brief, is in `COACH-REPORT.md` §59–§68.

**`rack-mobile` was NOT read this time.** The run was fenced to
`~/dev/ship-v52`, and another run was porting v49–v51 there the same night.
Every native path below is carried from `NEXT-NATIVE-V49.md`, and is
**unverified at whatever native is now**. This file is the delta on top of V49,
so port V49 first, rack-v50 and rack-v51 included.

**What is stored:**

- one new key, `settings/coach/marks`;
- one new answer id, `q_log_timing` (`live` | `later`), with its `asked` stamp;
- one new category id under `mute`, `readiness`.

All three are children of the already-granted `settings/coach`, so
`database.rules.json` and the OPTIONAL-LOCK file are byte-identical to
rack-v51. **But native's PROPOSED rules refuse `marks` until §8 is pasted into
them.** There are no new device keys.

**What is read:** `food/log/{date}`, on an ask, for Pro, with Food on. It is
never read at boot or on a paint (§7).

---

## ⚠ THE PINS

Unchanged since rack-v51:

```
units.js       fa6f03c9b2a097821c194af2be8e9711da5f940f3a35850d17897c77da4f6da5   unchanged since rack-v41
exercises.js   74ac8a9885376b79940daa6a184dfed14bfa4e32d2226e4e367db53dfd9d9857   unchanged
coach-tags.js  846501595feb06fddc7d85fb19ed526bc6c6cc69cecc5b7e9494eb96bd8c8a06   unchanged since rack-v42
analytics.js   f6054ad6590fe45268113b019ee78ec52462a84ee1db26246f0d37d5c3c2146a   unchanged since rack-v47
blocks.js      1fd10b3b82aa89082dee1675120d5a39fe7c21e7f7232b1930b6ce233a1fbbaf   unchanged
coach-live.js  877528f81150c0553f2d81188198d2535c9321ea74c80049e1f7ad324038e1d9   unchanged since rack-v46
coach-goal.js  6cd88a72e932ad060fe456121372dc483525ec28ca0c5d067c3aa58f41382048   unchanged since rack-v49
accounts.js    f89af13550da39c24a643ea411b8f8c820202bf605aa990aab15f2d64506d471   unchanged
tdee.js        83c2e76b71cfa2f6c8260fae807182e0682af48459bcd30b7be9eb9c4d48fe3d   unchanged
```

**The files the port copies verbatim that changed or arrived:**

```
coach-ready.js    a72c1309967a36f927208402242df8469f201b0c490eae3a28346ee419f1cd6a   NEW — copy to src/pure/, 899 lines
coach-fuel.js     5be93f103a6b191c62137ef16b4bfbba2d2bf78dad0ef256c01e6507cf9e0c83   NEW — copy to src/pure/, 453 lines
coach.js          276de12a01080bd0b4fb283ff805fe9de3df2ea63e47fb9cd69f4f7da8731a87   CHANGED — re-copy, 4,787 lines (v51: 74fc944…)
coach-prog.js     211d31ae8d107d15807338dcc8cf56b8d7c60042796451614c270e1f192f490f   CHANGED — re-copy, 1,004 lines (v51: b188e5d…)
coach-overlap.js  d81b1b59579552aac999ff22d708dbf72b375f1e1289cfc9dda9457f93c1fd8e   CHANGED — re-copy, 1,155 lines (v51: 6dd8638…)
coach-build.js    1257d46bec95a62a1a4466ef23bc5b7751c2e26b3072970b6d1d6684700d7c8c   CHANGED — re-copy, 743 lines (v51: 61099b1…)
```

`coach-prog.js` changed ADDITIVELY: one new export, `targetFor()`.
`prescribe()` is untouched. With no marks, `targetFor()` returns exactly what
`prescribe()` does, and both are byte-identical to rack-v51's `prescribe()`
on every battery row and on 4,400 generated histories (`coach-prog.mjs` D,
against v51's own file read out of git).

`coach-overlap.js` exports four more functions (`quantile`, `blocksOf`,
`lightOf`, `groupDaysAt`) with their bodies byte for byte. Three of its other
bodies now name targets through `targetFor()` (§4).

---

## 1. `coach-ready.js` — new, pure, copy verbatim to `src/pure/coach-ready.js`

**Imports**, all of which native has under `src/pure/` once V49 lands:

```
./coach-prog.js     baselines
./coach-overlap.js  quantile, blocksOf, lightOf, compareSession, targetsReplay
./coach-goal.js     bwAt
./coach-live.js     REP_DROP
./units.js          labelW, labelRate
./exercises.js      GROUPS, GROUP_ORDER
```

**It never imports `coach-fuel.js`, and `coach-fuel.js` never imports it.** That
is how "food moves no rest call, no window, no target and no lift reading" is
true by construction. `coach.js` imports both and merges their rows. The module
has:

- no clock (`now` is an argument);
- no randomness, no DOM and no module state;
- one memo, which rides on the input object as a non-enumerable `_ready`.

`tools-check/coach-pure.mjs` section K fences it.

```js
usualRun(input, now)            → his usual longest run of training days, or null
restRead(input, now)            → { call: 'rest'|'lighter'|'group'|'shape', pick, groups, usual, notReady,
                                    streakNow, usualRun, fatigue, … } | null
replay(input, now)              → { flagged, rested, through, held, below, lines } — reports, adjusts nothing
groupLine(read, g)              → the big-day or inside-the-window sentence for one group, or null
REST_REASON                     → the evidence line under every rest sentence
restAnswer(read, rp), lighterAnswer(input, now, read, rp), groupAnswer(read)
readinessHas(input, now)        → how many readiness rows the log can read (the `has` tests only)
readinessRows(input, now)       → [{ id, has, flag, text }]  — recovery, streak, load, failure, lifts,
                                                                energy, weighin, time
readinessAnswer(rows), readinessHeavy(rows)
sessionRows(input, session)     → what was different about a session: [{ id, z, kept, text }]
mergeRows(...lists)             → training rows then food rows, cut the way each list is cut
```

`input` is what `coach.js` builds (`readyInput()`, exported for the
verifiers): `{ now, u, overlap, shapes, overdue, marked }`. `overlap` is
`coach-overlap.js`'s prepared input, whose `lifts` are the **performance log**
(§6.1).

**A group's read carries `win`, never `window`.** In a browser a local named
`window` shadows the global, and `coach-pure.mjs` fences the name. A port
that renames the field to `window` breaks the web verifier's fence on
re-import.

## 2. `coach-fuel.js` — new, pure, copy verbatim to `src/pure/coach-fuel.js`

**Imports:** `./coach-goal.js` (`bwAt`, `energyBand`) and `./units.js`
(`labelRate`). **Nothing else, ever**; `coach-pure.mjs` M holds it to those
two.

```js
fueledRead(input, now)      → { state: 'thin'|'empty'|'unread'|'day'|'read', n, a, verdict?, k?, c? } | null
                              // a: the day's reading — bar, dayMed, phase, style, detected, curve, …
dayLines(input, read)       → yesterday (usual, on the light side, or "not fully logged"), two days' carbs,
                              the weight line, the phase line, and at most one Patterns line
fuelAnswer(input, read), fedUnloggedAnswer(input, read), fedNoneAnswer(input, read)
FUEL_DATES_MAX              → 15
fuelDates(input, now)       → the dates to read, newest first: today, the latest session's date, then
                              the most recent complete training dates in the 28 before today
fuelRow(input, now)         → readiness's food row
sessionFoodRows(input, session, now) → a session's food rows (food before it), for "How did today compare?"
```

`input` is `coach.js`'s `fuelInput()`: `{ now, u, summaries, foodLog,
sessions, weighIns, aim, aimSetAt, logTiming, goalDir, rateWk, energy,
patterns }`. **`foodLog` is only the dates the gatherer has read**:

- a date that is absent was not read;
- `null` was read and was unreadable;
- `[]` was read and is empty.

The three mean different things (§6.1, "unlogged is never zero").

## 3. `coach-prog.js` — re-copy it

One new export:

```js
targetFor(ex, ctx, mark)   // mark: null | { markedAt: Set<startedAt>, exposures, latest, byAt }
```

- **`mark` null:** `prescribe(ex, ctx)`, byte for byte.
- **The latest exposure marked** (`mark.latest = { word, exposures, groupDaysSince, now }`):
  - It returns the target Coach would have set **before** that session: its
    mode, load and per-set targets.
  - `line` has "last time" replaced by "before your marked session".
  - `from.daysAgo` is recounted from today.
  - `why` is exactly two lines: "Your last session is marked ({word}), so this
    is the target from before it." and "That session doesn’t count against
    your numbers."
  - When the marked session was the lift's only one, it returns `null`.
- **Earlier exposures marked:** they are left out. If that leaves a reduce
  whose two misses have a mark between them, it returns the whole log's target
  instead, whenever that is not a reduce.

`coach.js` builds every `mark` in one helper and hands it down as data.
`coach-prog.js` imports nothing new.

## 4. `coach-overlap.js` — re-copy it

- `quantile`, `blocksOf`, `lightOf` and `groupDaysAt` are exported, with
  bodies byte for byte rack-v51's (`coach-pure.mjs` L).
- It imports `targetFor` from `coach-prog.js` beside `baselines` and
  `exposuresFor`.
- `rungOf()`, `nextTargets()` and `targetsReplay()` name targets through
  `targetFor()`. The replays use `markBefore(lift, at)`, the mark as it stood
  that morning.
- The brief said "exports only". §5.2 of the same brief says "nothing calls
  `prescribe()` for a target directly any more", and that is the rule that won
  (`COACH-REPORT.md` §63.1).

## 5. `coach.js` — re-copy it

- **Imports** `coach-ready.js` and `coach-fuel.js`.
- **`shapeSession()`** gains `lsets`, `lfsets` and `ldrop`: lifting sets (no
  cardio), their F sets and their rep-drop lifts, per group. It is additive,
  and `sets` is unchanged.
- **The marks.** `MARK_WORDS` and `MARK_ASK` are exported. `derive()` gains
  `marks`, `markOf`, `idOf` and `perf`: the two logs, built in one place.
- **New facts:**
  - `session.rest`, `session.usualRun`, `session.buildFocus`;
  - `session.readiness`, `session.diffs`, `session.replay`;
  - `coach.logTiming`, `fuel.read`.

  `session.shapeOverdue` is now the rest read's pick, and null on a rest or
  group call.
- **Category `readiness`** ("Readiness") comes directly after `rest`. Every
  later category's index moves by one, and the relative order is unchanged.
- **Intents**, all **selectors**:
  - `rest_day`, `group_ready`, `readiness`;
  - `fuel_empty`, `fuel_fueled`, `fuel_fed_unlogged`, `fuel_fed_none`.

  There are no new findings, and nothing new joins You's topic lists.
- **Question** `q_log_timing` (`where: 'fuel'`), asked once, only when his
  entries look batch-logged.
- **Routes:**
  - `ask_shape` → `rest_day`, `group_ready`, then the shipped two;
  - `ask_lighter` → `rest_day`, `lighter_week`, `readiness`;
  - `ask_build_anyway` → `build_menu`;
  - `ask_fueled` → `fuel_empty`, `fuel_fueled`;
  - `ask_fed_unlogged` and `ask_fed_none`.
- **Labels:**
  - `ask_lighter` is now *Should I rest or go lighter?* (**same id**, so the
    text matcher keeps one);
  - *Train anyway*, *Am I fueled?*, *I ate, it’s not logged*, *I haven’t
    eaten*.
- **Train's `pre` topics:**
  - `ask_shape`, `ask_build`, `ask_targets`, `ask_fueled`, `ask_lighter`;
  - then `ask_record_day`, `ask_lifts`, `ask_overdue`, `ask_volume`.

  Train `live` is rack-v51's list, written out.
- **`c.buildCaution(opts)`** → `{ text, reason, anyway: { label, opts },
  recovered: { label, opts } | null }` or null. It is non-null when the
  proposal those opts would build holds a group inside its recovery window.
- **`ask()`** may carry `a.mark` (the question under a below-usual compare),
  `a.marked` (already marked: offer *Clear the mark*) and `a.question`
  (`q_log_timing`).
- **`normSettings()`** keeps valid `marks`.
- **New exports:** `readyInput`, `fuelInput`, `FUEL_ROUTES`, `fuelDays`.

## 6. `coach-build.js` — re-copy it

It imports `targetFor`. Its focus falls back to `builderInput()`'s
`defaultGroup`, the rest read's pick. It passes each lift's mark. It adds two
reason lines: "Worked out from before your marked session." and "It has waited
longest of what’s recovered: …".

### 6.1 The rules a port is most likely to "improve"

- **Two logs.** The full log (every session) answers *when* and *how much*:
  - days since, streaks, sets, windows and big days;
  - shapes and the builder's base session;
  - every "last time" sentence.

  The performance log (marked sessions out) answers *how strong*:
  - every lift reading, compare's "usual" and readiness's `lifts`;
  - the replay's outcomes.

  **Nothing outside `coach.js`'s `derive()` restates the filter.**
- **A marked latest session replays the target from before it, with its `why`
  replaced.** It is the same attempt again. It is never the target from
  dropping the session, which can name the wrong "last time" or go lighter
  than he was already lifting. It is never a reduce the unmarked log would not
  have made.
- **One builder default.**
  - *Build it*, *Tell me what to train*, the targets and the Basic teaser all
    build `session.buildFocus`.
  - `session.shapeOverdue` is null on a rest or group call, so nothing names
    an unrecovered shape as the one to train.
  - Two defaults would disagree.
- **The replay reports and adjusts nothing.** It never shrinks a window or
  raises a threshold: the card, the builder and the sheet must read the same
  call. It runs only inside an answer, at about 55 ms on a year-long log.
- **Cardio is out of recovery only.** Windows and big days read `lsets`.
  Everything else that says "sets" reads the shipped `sets`, cardio in, so
  "sets this week" is one number on every screen.
- **Time-of-day food reads are only for real-time loggers, and only for
  same-date entries.** `t` is when an entry was LOGGED. A dinner logged the
  next morning counts in its day's total and in no time read. A batch logger
  gets day lines only.
- **Unlogged is never zero.**
  - A day under half his median is "not fully logged", never low.
  - A day that could not be read is left out.
  - While today's summary shows food, nothing says nothing was logged (state
    `unread`).
- **Nothing new on the paint path.** On a card paint, only `restRead()` and
  `usualRun()` may run. Nothing in `coach-fuel.js` runs there, and neither do
  the replay, readiness rows, session rows or `targetsReplay()`. Every new
  intent is a selector for that reason.

## 7. Native's `coachData.js` — what the gatherer gains

Web's `coach-data.js` diff, to be rewritten against native's own store:

- **`markSession(session, r)`** makes one `patch()` of `{ marks: { [id]: { r,
  d: session.date } } }`, or `null` to clear. A session with no id writes
  nothing. Only the mark question writes it. *Nothing* writes nothing at all.
- **`patchNow()`** merges `marks` the way it merges `answers`. **On every
  write** it sets to `null` any stored mark whose `d` is more than 182 days
  before today, counted noon to noon. `normSettings()` drops the nulls.
- **`loadFuel()`** reads `food/log/{d}` for every date in
  `fuelDays(coachInput())` not yet read this app open.
  - It re-reads today only when `summaries[today]` has changed since its last
    read.
  - The reads go out together, and two calls in flight share one wave.
  - A value becomes entries `{ t, cal, p, c }` (`[]` for an empty object). A
    failed read becomes `null`.
  - **It never runs at boot or on a paint, and never for Basic, with Food
    muted, or on an unreadable log.** `fuelDays()` returns `[]` in each of
    those cases.
  - It shares nothing with Patterns' own boot read except `read()`.
- **`fuelNeedsRead()`** tells the sheet whether an ask will read anything.
- **`coachInput()`** passes `foodLog`, and only what `loadFuel()` has read.

**The spy counts** (`coach-boot.mjs` H, on web's stub store) should hold on
native:

| When | Reads |
|---|---|
| At boot, and on paints | 0 |
| The first fuel ask of an open | at most 15, in one wave |
| A second ask, nothing changed | 0 |
| After today's summary changes | exactly 1 |
| Basic, Food muted, or an unreadable log | 0 |

## 8. `settings/coach` — the PUBLISHED rules take everything; the PROPOSED ones do not

The published `database.rules.json` does not mention `coach`. `settings` has a
section-level `.write`, so every v52 key lands today. **No rules change, and
none may add an `$other` deny at the `settings` level.**

`web-patches/database.rules.PROPOSED.json` validates `settings/coach` key by
key (V43 §5's shape) and ends in `"$other": { ".validate": false }`. **Without
this, every mark is refused once those rules are published:**

```json
"marks": {
  "$sid": {
    ".validate": "$sid.matches(/^[A-Za-z0-9_-]{1,40}$/) && newData.hasChildren(['r', 'd'])",
    "r": { ".validate": "newData.isString() && newData.val().matches(/^(sleep|stress|sore|unwell)$/)" },
    "d": { ".validate": "newData.isString() && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)" },
    "$other": { ".validate": false }
  }
}
```

A mark cleared is a key written to `null`. That is a delete, and it passes
without a `.validate`.

- `readiness` under `mute` and `q_log_timing` under `answers` and `asked`
  pass V43's generic `$cat` and `$q` rules as they stand. `live` and `later`
  are well under its 20-character bound.
- If those rules have since been narrowed to enumerated ids, add:
  - the category `readiness`;
  - the question `q_log_timing`, with the values `live` and `later`.

**PROPOSED, not published.** Micah publishes rules; nothing here does.

## 9. The surfaces — where each web change lands on native

Native paths are V45's, unverified.

| web | native destination | what it needs |
|---|---|---|
| Train's topics | `src/ui/coach/sheets.jsx` | nothing if it draws `topicsFor('train')`. *Should I rest or go lighter?* and *Am I fueled?* appear by themselves |
| **the builder caution** | same | before drawing a proposal (the menu's choice, *Build it*, a refocus), call `c.buildCaution(opts)`. If it is non-null, draw `text` as a Coach bubble (its `reason` as the evidence) with two chips inside it. `anyway.label` builds with `anyway.opts`, exactly as it would have. `recovered.label`, when present, builds with `recovered.opts` and draws that proposal's headline. Advice, never a lock |
| *Train anyway* | same | `ask_build_anyway` is a builder route, like `ask_build`: it opens the menu |
| **the mark question** | same | when `a.mark` is present, a question bubble `a.mark.text` with one chip per option. A chip with a value calls `markSession({ id: a.mark.sessionId, date: a.mark.date }, value)` and draws its `ack`. *Nothing* draws "Noted." and writes nothing |
| *Clear the mark* | same | when `a.marked` is present, one chip `MARK_ASK.clear.label` → `markSession(…, null)`, then "Cleared." |
| **the fuel wait** | same | for a route in `FUEL_ROUTES`, on Pro, when `fuelNeedsRead()`: draw "Reading your food log…", race `loadFuel()` against 4 s, rebuild `coach(coachInput())`, then answer. On a timeout, answer with what it has. With nothing to read there is no bubble and no wait |
| the fed chips, *Build it* after rest | same | nothing: `followupsFor()` already gates them |
| `q_log_timing` | same | `a.question` under the fuel answer, drawn like the targets answer's question |
| answers that repeat the opening | same | draw `a.more` there too (web's repeats branch now does) |
| the Readiness switch | `src/ui/coach/settings.jsx` | appears by itself if the list walks `CATEGORIES`. The Pro panel lists it the same way |
| `coachInput()` | `src/data/coachData.js` | `foodLog` (§7) |

## 10. The verifiers

There are two new ones. Seventeen have the staging edit (stage
`coach-ready.js` and `coach-fuel.js` beside `coach-overlap.js`), and several
changed on purpose.

| | |
|---|---|
| `coach-ready.mjs` | NEW. R1–R22, D1–D8, X1–X5, M1–M9: **ok 46, miss 0, wrong 0**. Properties over 2,000 generated histories. Drives `coach.js`'s `readyInput()`. **Ports**, except M8's data half, which drives web's `coach-data.js` against a stub and needs re-pointing at `coachData.js` |
| `coach-fuel.mjs` | NEW. F1–F16: **ok 16, miss 0, wrong 0**. Properties over 1,500 generated months. The must-never scan runs over 6,183 strings and over every sentence in `coach-fuel.js`. **Ports** |
| `coach-prog.mjs` | + E (`targetFor()`); D against rack-v51's `prescribe()` (git). Still 57/0/0 |
| `coach-pure.mjs` | + K (`coach-ready.js`), L (the four overlap bodies against v51), M (`coach-fuel.js`, two imports) |
| `coach-hype.mjs` | + F: the recovery line at his usual run, the rest bias, and **the paint spy**. 200 paints call nothing in `coach-ready.js` but `restRead`/`usualRun`, and nothing in `coach-fuel.js` |
| `coach-boot.mjs` | + H: the `loadFuel` spy. Web's gatherer: re-point it |
| `coach-state`, `coach-registry`, `coach-rank`, `coach-voice`, `coach-patterns`, `coach-overlap`, `coach-silence`, `coach-goal` | changed deliberately, each with its reason in place. `coach-surface` N is web's view layer and does not port |

## 11. What to run

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Both are clean at rack-v52 under `TZ=America/New_York`, `UTC` and
`Pacific/Auckland`: 40 verifiers, all exit 0. `coach-prog.mjs` D,
`coach-pure.mjs` L, `coach-state.mjs` D, `coach-registry.mjs` J and
`coach-build.mjs` M read old commits, so they need a full clone.

## 12. If the port reads one thing in this file

§6.1, the two logs and the mark. A bad day that is marked must never count
against him, and must never quietly count for him either. Every "improvement"
that filters marked sessions in a second place, or drops a marked session
instead of replaying the target from before it, breaks one of those two.
Then read §8 before anybody publishes the PROPOSED rules.
