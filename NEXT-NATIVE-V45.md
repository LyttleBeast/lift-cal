# Porting rack-v45 to rack-mobile

Web shipped as `rack-v45`. The tree it mirrors is `~/dev/rack-mobile`.

v45 is **Coach ship two — the workout builder.** "What should I train today"
becomes a workout he can start in one tap, made out of his own log: the most
recent session of the shape that has waited longest, its exercises in order,
its blocks as recorded, and the numbers he actually lifted. Plus four small
fixes from BACKLOG.md.

**`rack-mobile` was read this time — read-only, at `13f6b80`, and only these
files:** `app/(app)/(tabs)/weight.jsx`, `app/(app)/(tabs)/workout/summary.jsx`,
`app/(app)/(tabs)/workout/index.jsx`, `src/state/workout.js`,
`src/state/routines.js`, `src/state/coachData.js`, `src/ui/coach/sheets.jsx`,
`src/ui/coach/Card.jsx`, `src/ui/train/routines.jsx`. Every claim below about
what native HAS is about those files at that commit and nothing else. Every
"native needs" elsewhere is a statement about what the feature requires. Check
before acting.

Read `NEXT-NATIVE-V42.md` and `NEXT-NATIVE-V43.md` first; they are still the
port documents for Coach. This file is the delta.

**Nothing new is stored.** The builder composes into two paths that already
exist — `startWorkout(preset)` and `saveSessionAsRoutine(record)` — and writes
no node, no key and no shape of its own. The one stored thing that can change
is `settings/coach.mute`, which may now hold `build: true`. See §6.

---

## ⚠ THE PINS

```
units.js      fa6f03c9b2a097821c194af2be8e9711da5f940f3a35850d17897c77da4f6da5   unchanged since rack-v41
exercises.js  74ac8a9885376b79940daa6a184dfed14bfa4e32d2226e4e367db53dfd9d9857   unchanged
coach-tags.js 846501595feb06fddc7d85fb19ed526bc6c6cc69cecc5b7e9494eb96bd8c8a06   unchanged since rack-v42
blocks.js     1fd10b3b82aa89082dee1675120d5a39fe7c21e7f7232b1930b6ce233a1fbbaf   unchanged
accounts.js   f89af13550da39c24a643ea411b8f8c820202bf605aa990aab15f2d64506d471   unchanged
tdee.js       83c2e76b71cfa2f6c8260fae807182e0682af48459bcd30b7be9eb9c4d48fe3d   unchanged
```

**NO PINNED FILE MOVED.** `coach-tags.js` did not change either — the builder
READS it (pattern for "Swap one", load for "Fewer exercises") and no tag was
found to be wrong, so it is the rack-v42 file byte for byte.

Two files the port copies verbatim DID change or arrive:

```
coach.js        e2c211dfd8a89a4f6fe1e893b3db08d3a98d5abd031147b1322a820027a17bd4   CHANGED — re-copy, 2,390 lines
coach-build.js  a378c274a5eb07ac3acc11a11bf13fb78505bf444a7bf1c0408b83cb28036379   NEW — copy to src/pure/, 564 lines
```

`database.rules.json` and the OPTIONAL-LOCK file are byte-identical to rack-v44.

---

## 1. `coach-build.js` — new, pure, copy verbatim to `src/pure/coach-build.js`

`propose(input, opts)` → a proposal or `null`. Null is always allowed: a live
session, a library not yet read, a log below `train_today_recommendation`'s own
gate, a focus with nothing behind it, a base session whose every exercise has
left the library.

**Imports**, all of which native already has under `src/pure/`:

```
./exercises.js   GROUPS, GROUP_ORDER
./analytics.js   isWorking, mergeSessionExercises      (session math only)
./units.js       fmtSetLoad, unitW
./blocks.js      normalizeBlocks, blockOrder
./coach-tags.js  tagsFor
```

It never imports `coach.js` — `coach.js` imports IT. No clock, no randomness,
no DOM, no module state. `tools-check/coach-pure.mjs` section F fences all of
that and ports with the imports repointed.

**It derives nothing about the log itself.** The recurring shapes, the window,
the default focus, the gate and the layoff are `coach.js`'s facts, assembled by
`builderInput(d)` in `coach.js` and handed over — so native writes nothing to
feed it. The proposal it returns:

```js
{
  key,                        // stable: focus + base session + drops + swaps
  focus: { kind, id, groups, label },
  name,                       // the session name, and Save as routine's default
  base: { id, date, daysAgo, startedAt },
  routine,                    // { id, name } — his routine for this shape, or null
  headline, reason,           // "Built from your Tue, Sep 16 session — …", [lines]
  routineLine, layoffLine, leftOutLine,       // null when there is nothing to say
  layoff, leftOut,
  exercises: [{ slot, exId, from, name, group, block, swapped,
                line,           // "warm-up 1 × 10 at 95 lb, 3 × 8 at 185 lb"
                note,           // what the log shows, or null
                swaps: [{ exId, name, opts }] }],   // max 5
  placeholders,               // EXACTLY toSession()'s shape: w/r '', tw/tr logged, done false
  lastNumbers,                // same sets, w/r filled, done false — NULL after a layoff
  record,                     // what saveSessionAsRoutine(record) takes
  fewer,                      // the next opts, or null
  focuses: [{ label, opts }]  // "Train something else" — only those that build
}
```

Every adjustment is **new opts and a fresh call**, never an edit to the object
on screen: `{ focus?: 'shape:<key>'|'group:<id>', drop?: [slot…], swap?: { fromExId: toExId } }`.
Drops are base-session POSITIONS, not a count, so a swap after a drop cannot
change which lift was dropped. Swaps are keyed by exId, so a duplicated block
swaps as one thing.

### 1.1 The four rules a port is most likely to "improve"

1. **The builder never invents a weight.** Every number in `placeholders`,
   `lastNumbers` and `record` is copied from a logged set, exactly as stored — a
   bodyweight set stays `w: '0'`. A swapped-in exercise brings ITS OWN last
   numbers from the last session it was in, and says which; never logged, it
   brings the replaced lift's set count and types and no numbers at all.
2. **The layoff step-down is a refusal, not a percentage.** When
   `returning_from_layoff` fires, `lastNumbers` is `null` and the proposal says
   how long it has been. Do not compute a reduced weight: a percentage off,
   rounded, is a number he never lifted, and on a metric account it is a
   rounding rule nobody chose.
3. **Progression is a nudge, never baked in.** A note may say what the base
   session shows ("Every working set reached 8 reps last time.", "One set was
   taken to failure last time.") and nothing about the next weight. It is under
   the voice ban even though it is sheet-only — see §7.
4. **Hidden wins, and a custom exercise that still exists is always kept.**
   Hidden or unresolvable exercises are left out and NAMED ("Left out: Cable
   Crossover — hidden in your library"). An id the library cannot resolve is
   said to be "not in your library", which is true whether it was deleted or
   the device could not read the library — so do not reword it to "deleted".

---

## 2. `coach.js` — re-copy it

What changed inside, all of it additive:

- imports `propose` and `liveRefusal` from `./coach-build.js`
- a shaped session carries `session` (its raw record); a shape carries
  `routine` (`shapeRoutine`, split out of `shapeName` so the routine that names
  a shape and the routine the builder offers are one test)
- `builderInput(d)` and `d.build(opts)`, memoised per opts
- category `build` — "Workout builder", mutable — after the training rows; no
  existing finding changes rank order
- intent `build_workout`: selector, `surfaces: ['sheet']`, tier `pro`, offered
  only when a proposal exists and the category is not muted
- route `ask_build`; `TRAIN_TOPICS` gains `{ id: 'ask_build', label: 'Make me a
  workout' }` FIRST; `ask_shape`'s follow-ups gain `ask_build`, labelled
  "Build it"; `FOLLOWUPS_AFTER` gives `train_today_recommendation` "Build it"
  whichever route reached it (`followupsFor` takes the answering intent now)
- `PRO_ADDS` counts selectors as well as findings — it counted findings only,
  which would have left the builder off the list of what Pro adds
- `coach()` returns `build(opts)` and `buildLive()` — both functions, so a card
  paint pays for neither
- five sentences changed words (Phase 4a, §5)

---

## 3. `src/state/coachData.js` — three additions to the input

```js
{
  …everything from NEXT-NATIVE-V43 §3.1,
  lib: { [exId]: { name, group, equipment } },   // NAME is new
  hidden: [exId, …],                             // NEW — the picker's hidden list
  libReady: true | false                         // NEW
}
```

- **`name`**: the name the picker shows today, overrides applied. The proposal
  carries it, the way an exercise added from the picker would.
- **`hidden`**: native's `libIndex()` uses `everyExercise()`, so hidden
  exercises ARE in native's `lib` (web's are not). That is fine — the builder
  checks `hidden` before it checks `lib`, so either convention works — but only
  if `hidden` is passed. Without it a hidden lift is proposed.
- **`libReady`**: `true` only once the picker's three nodes have been read.
  Before that the library is the built-ins alone, a custom exercise is
  indistinguishable from a deleted one, and the builder would drop his lift and
  call it gone. Absent is treated as `false`, so the builder is silent rather
  than wrong. Web added `libraryReady()` and `hiddenIds()` to `picker.js`.

No read is added for any of it: all three come from the picker's memory.

Native already does `goalDir` right: at `581e84a`, `src/state/coachData.js:292` passes `goalDirection(targets, maint && maint.cal)`, which is what web's `coach-data.js` was fixed to in rack-v45 (it passed the whole `effectiveMaint` object, so an account with no `targets.auto` read no direction).

---

## 4. The surfaces — where each web change lands on native

| web | native destination | what it needs |
|---|---|---|
| `coach-ui.js` `openCoachSheet` — builder offered only when `opts.start` exists | `src/ui/coach/sheets.jsx` `openCoachSheet({ surface, live })` / `CoachSheet` | take `start` and `save`; filter `ask_build` out of topics AND follow-ups when there is no `start`; draw no builder chip otherwise |
| chip dedupe by id | `CoachSheet` (and `src/pure/coach-view.js`, if that is where native builds the chip list) | a topic already offered as a follow-up is not drawn twice — "Build it" IS "Make me a workout" |
| `proposalBlock()` — the list, the notes, EXACTLY four buttons | `src/ui/coach/sheets.jsx`, a new view | Start it · Start with my last numbers (absent when `lastNumbers` is null) · Save as routine · Change something (absent when there are no changes). Recap rows for the list; block label for blocks |
| "Change something" follow-ups | same | Train something else → `p.focuses`; Fewer exercises → `p.fewer`; Swap one → exercise → `e.swaps`. Each tap: `c.build(next)`, replace the proposal, never stack a second |
| the live line | same, under the opening bubble | on the Train sheet, on Pro, with `c.buildLive()` non-null: one bubble, nothing else |
| `workout.js` Train card passes `start` and `save` | `app/(app)/(tabs)/workout/index.jsx:243` `<CoachCard tight live={live} />`, and `src/ui/coach/Card.jsx:115` which opens the sheet | pass both through to `openCoachSheet` — see §4.1 |
| You card passes neither | `app/(app)/(tabs)/you/index.jsx:132` | nothing: no `start`, no builder on the You sheet |
| Settings → Coach | `src/ui/coach/settings.jsx` | a "Workout builder" switch, if it walks `CATEGORIES` — check it does |
| Pro panel | wherever native walks `PRO_ADDS` | nothing if it walks the export; it now includes the builder |

### 4.1 `startWorkout` and `saveSessionAsRoutine` on native — READ THIS

**Native's `startWorkout(preset)` (`src/state/workout.js:466`) uses
`preset.exercises` exactly as it is handed them, and it mints no React keys.**
`toSession()` (`src/state/routines.js:164`) mints `_k` on every exercise and
every set for a routine start; `withKeys()` (`workout.js:179`, module-private)
mints them only on the restore path. The builder's `placeholders` and
`lastNumbers` carry **no `_k`**, and `coach-build.js` must not grow one: a key
from a sequence or `Math.random()` is exactly what makes the same log stop
building the same workout byte for byte, and the purity fence refuses it.

**So key them on the way in.** Route both presets through `withKeys` (export it,
or give `startWorkout` an option to key what it is handed), in the Train card's
`start` callback. Without it every exercise card in a builder-started session
renders `key={undefined}`, and removing an exercise remounts every card below
it and drops whatever was half-typed — the defect `toSession`'s own comment
describes.

The rest is the same contract as web:

- **Copy the preset.** Web hands `startWorkout` `JSON.parse(JSON.stringify(p))`
  — the live session is edited in place, set by set, and must share nothing
  with a proposal the engine still holds.
- **Refuse to start over a running session.** Web's `start` callback checks
  `hasActiveSession()` and toasts "Finish your workout first". The builder
  never proposes during a live session; this covers the race.
- **Starting closes the sheet** and lands on the live session.
- **Saving leaves the sheet** where it is; the routine sheet opens over it and
  shows its own "Saved <name>". Native's `saveSessionAsRoutine(record)`
  (`src/ui/train/routines.jsx:573`) maps `tw: s.w || ''` through
  `routineFromRecord` and suggests the name by the same
  Morning/Afternoon/Evening rule — `p.record` works on it unchanged.

**Why web passes these as callbacks**: `workout.js` imports `coach-ui.js`, so
`coach-ui.js` importing `workout.js` would close a ring. Native's graph may not
have that ring (`src/state/workout.js` imports `coachData.js`, not the UI). The
callback is still the recommendation: it is what makes "the card that can start
a workout is the only one that offers to build one" a property of the wiring
rather than of a surface check somebody has to remember.

---

## 5. Phase 4 on native

- **a. The rolling-window words** travel with `coach.js`: `g_in_a_row` now says
  "N sessions in seven days." (five words, the pool's cap), and the fuel
  sentences say "the last seven full days" instead of "this week", "last week"
  and "the last complete week". Nothing to do beyond the re-copy.
- **b. `version-match.mjs`** is a web verifier (sw.js against usage.js). The
  rule ports: if native carries its build string in more than one place, fence
  them against each other the same way — two reads and a compare, no rule
  copied. I did not look for native's version constants.
- **c. The Weighed-at box** — web CSS only. Native's control is an inline
  `DateTimePicker` in its own `View` below the log row (`weight.jsx:196-226`),
  and its Log button is `flex: 0, minWidth: 54` in the row above
  (`weight.jsx:184`). The web mechanism — WebKit sizing an HTML
  `datetime-local` input to its formatted value — does not exist there, and the
  picker is not in Log's row, so it cannot squash it. Whether the inline iOS
  picker fits a narrow card is a device question I could not answer by reading.
- **d. The recap gap** — native does not have it: `summary.jsx:97` gives the
  `StatRow` `marginBottom: T.space.m14`. Web now uses 12 px (the gap between
  its recap cards); the two differ by two points, which is a matter of each
  client's own card spacing rather than a defect.

---

## 6. `settings/coach` — no rules change

`mute` may now hold `build: true`. `normSettings` keeps only `=== true`, so an
absent key is ON: every account that predates the category has the builder
without a byte written. The PROPOSED shape in `NEXT-NATIVE-V43.md` §5 validates
`mute.$cat` as any boolean, so it already accepts it. Nothing to add.

---

## 7. The verifiers

Two new files; five changed.

| | |
|---|---|
| `coach-build.mjs` | 94 checks. Drives the real engine: the base is the most recent session in the shape's own cluster, order and blocks preserved; hidden and deleted exercises dropped AND named, his customs kept; `placeholders` round-trips through routines.js `toSession()` — LIFTED verbatim — and through `saveSessionAsRoutine()` into a routine that starts as the same workout; `lastNumbers` all unticked; layoff → `lastNumbers === null` and no number differs from a logged one; live, thin and unreadable → null; his routine offered by his name; swaps, fewer, focuses; determinism byte for byte. Eight mutations of `coach-build.js` each turn it red. **Ports**, with one change: native's `toSession` mints `_k`, so the round-trip comparison must strip `_k` before comparing. |
| `version-match.mjs` | sw.js `CACHE` against usage.js `VERSION`. Web-shaped; the rule ports (§5b). |
| `coach-pure.mjs` | + section F: `coach-build.js`'s purity, and that it never imports `coach.js`. Ports. |
| `coach-units.mjs` | + section G: every builder line rendered imperial and metric, the stored numbers identical in both, no unit word, rounding, step, plate, percentage or typed number in the builder's copy. + section C: no calendar word over a rolling window. Ports. |
| `coach-voice.mjs` | + section G: the builder is under the ban **although it is sheet-only**, with no exemption list — a proposal is the most prescription-shaped thing in Coach. Ports, except the slice of `coach-ui.js` it reads. |
| `coach-rank.mjs` | ship one's "no builder chip" guard became the builder's own rules: first on Train, offered only with a proposal, never on You, off when muted, "Build it" after both answers. Ports. |
| `coach-surface.mjs` | + sections E and F: the bubble enumerated on the drawn sheet, the four buttons and what each hands over, every adjustment, the layoff, the live line, and the wiring read from `workout.js` and `you.js`. **Does not port** — web view layer. Native wants its own, and §4.1's keys are the first thing it should check. |

---

## 8. What to run

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Both clean at rack-v45, under `TZ=America/New_York` and `TZ=UTC`: 25 verifiers,
all exit 0.

---

## 9. If the port reads one thing in this file

§4.1. The builder's presets carry no React keys, native's `startWorkout` mints
none, and the fix belongs in the Train card's `start` callback — never in
`coach-build.js`, whose whole value is that the same log builds the same
workout on both clients, byte for byte.
