# Porting rack-v41 to rack-mobile

Web shipped as `rack-v41`. The tree it mirrors is `~/dev/rack-mobile`.

**Nothing in `rack-mobile` was touched by this ship.** It was read only, and
only through git at the fixed commit `695d996` ("version: buildNumber 40 —
native is level with rack-v40"). Every claim below about native is a claim about
that commit and nothing later. **Re-check each one before acting on it** — the
v40 handoff was out of date on two of its four phases by the time it was read.

v40 fixed what the app DOES. v41 fixes what it SAYS. Six display-level changes,
every one of them a place where the screen stated something that was not true.
**Nothing in this ship changes what is stored**, with one exception named in §5:
a weigh-in's `t` may now be a time somebody typed. Same `{ lb, t }` shape, same
key, same magnitude.

---

## ⚠ UNITS.JS CHANGED. RE-COPY IT AND MOVE THE PINNED SHA IN THE SAME COMMIT.

`tools/verify-units-verbatim.mjs` pins `src/pure/units.js` two ways: byte-for-byte
against `web/main:units.js`, and against a SHA-256 written into the verifier. §1
adds one export to that file, so **both halves trip**, which is exactly what the
pin is for.

```
PINNED (old, rack-v34)  3e550da926349cac4d8fcebd72f55afbb2fcacf305662854de03ca534cb4b1ea
PINNED (new, rack-v41)  fa6f03c9b2a097821c194af2be8e9711da5f940f3a35850d17897c77da4f6da5
```

The change is **additive only**: one new export, `fmtSetLoad`, built on top of
`fmtSetW`. Nothing that existed changed meaning, so every existing caller is
unaffected and imperial is still byte-for-byte what it was. Copy the file,
change the constant, one commit, reason in the message.

`blocks.js`, `accounts.js` and `tdee.js` were not touched at all. Their pins
hold.

---

## What is left to port

| v41 phase | Native at `695d996` | Port job |
|---|---|---|
| 1 — a bodyweight set reads BW | has none of it — `fmtSetW` at six sites, `0×12` on all of them | **All of it.** |
| 2 — a bodyweight session is not −100% | `summary.jsx:70-71` is the same arithmetic, `:169` the same `-100%` | **All of it.** |
| 3 — the estimate sheet says where the number came from | `estimator.jsx:628` is the same literal `Claude’s estimate` | **All of it.** |
| 4 — green means toward your goal | the rule is written TWICE here too, and `weight.jsx:174` has the same down-is-good colour | **All of it**, and it is a bigger job here — see §4 |
| 5 — a weigh-in can say when it happened | `state/weight.js:160` is `t: Date.now()`; the picker dependency is already installed | **All of it.** |
| 6 — the refused list | **this is web catching up to native**, except for one bug of native's | **Almost nothing** — see §6 |

---

## 1. `fmtSetLoad` — the verbatim copy, and the split that matters

| | |
|---|---|
| Web | `units.js` → `fmtSetLoad(w, u)` |
| Native | `src/pure/units.js` |
| Port | **Verbatim**, with the re-copy and the sha move above. |

```
fmtSetLoad(w, u)   ''/null -> ''      a weight that parses to exactly 0 -> 'BW'
                   anything else -> exactly what fmtSetW returns
```

v40 made a ticked set with reps and a blank weight store `w: '0'`. Nothing had
been taught to print it, so a recap read `Pull-Up  0×2`.

### The split is the whole safety property

`BACKLOG.md` said this was "one change to `fmtSetW` and nothing else". **It is
not**, and the same trap is in the native tree: `fmtSetW` also fills input
boxes. Hand a numeric input `"BW"` and the value is dropped, and on save the set
stops being recorded as a zero — the exact defect v40 closed.

So `fmtSetLoad` is built **on** `fmtSetW` rather than replacing it, and each
call site is classified. Native's sites at `695d996`:

| Native | Web twin | Which |
|---|---|---|
| `src/ui/train/DayEx.jsx:25` | `workout.js:554` **and** `:1641` | **display** |
| `app/(app)/(tabs)/workout/session.jsx:602` (the "Last ·" line) | `workout.js:1038` | **display** |
| `app/(app)/(tabs)/workout/summary.jsx:158` (first-time card) | `workout.js:1602` | **display** |
| `src/pure/analytics.js:370` `prDetail` | `analytics.js:334` | **display**, and it is the same pure function — copy it too |
| `src/ui/you/cards.jsx:546` (strongest lifts) | `you.js:1211` | **display** |
| `src/ui/train/routines.jsx:535` `<SetNumInput value=…>` | `routines.js:398`, `:402` | **BOX — leave it on `fmtSetW`** |
| `src/ui/train/routines.jsx:227` (routine preview) | `routines.js:170` | **leave it** — `tw` is a plan, not a record, and a blank one already prints as nothing |

Two notes specific to native:

- **`DayEx.jsx` is one component where web has two expressions.** Web's day view
  and its recap "What you did" list are separate lines; native's `summary.jsx`
  renders `<DayEx>`. One edit covers both.
- **Native has no Stats screen**, so web's `stats.js:192` and `:443` have no
  twin. `cards.jsx:546` is the nearest thing.
- **`SetRow.jsx:219` does not use `fmtSetW` at all** — it is `value={s.w || ''}`
  raw. That is a separate, pre-existing kilos problem in native (a stored pound
  string goes straight into the box on a metric account) and it is NOT this
  ship's. Do not "fix" it by reaching for `fmtSetLoad`; that would be the exact
  bug this section is about.

### Three things a copier must not lose

- **No unit word after BW.** "BW lb" is nonsense. None of web's eight display
  sites prints a unit next to the weight; check native's the same way.
- **BW is decided on the stored POUNDS, not on the formatted string.** A real
  0.1 lb load formats as `"0"` on kilos and is *not* bodyweight. The test is
  `Number(w) === 0`, applied to the stored value.
- **A typed 0 on a barbell lift also reads BW**, and that is correct: an
  unloaded set is an unloaded set. `units.js` cannot tell a pull-up from a bench
  press and must not grow equipment logic to try.

`tools-check/units.mjs` section I is the table plus two scans: no input value,
placeholder or defaultValue is built with `fmtSetLoad`, and every call site of
either function is counted so a new one has to be classified rather than
shipped. Both are pure and would run here with the imports repointed.

---

## 2. `sessionComparison` — the second function to copy verbatim

| | |
|---|---|
| Web | `analytics.js` → `sessionComparison(record, prior, now)` and `sessionReps(session)` |
| Native | `src/pure/analytics.js` |
| Port | **Verbatim**, `now` included as an argument. |

Native's `summary.jsx` has the identical defect, in the identical shape:

```jsx
// 695d996:app/(app)/(tabs)/workout/summary.jsx
:70  const avg = recent.length ? recent.reduce((a, x) => a + (x.volume || 0), 0) / recent.length : 0;
:71  const pct = avg ? Math.round((record.volume - avg) / avg * 100) : 0;
:169 {(pct >= 0 ? '+' : '') + pct + '%'}
```

After a set of pull-ups that reads `-100%` in `T.colors.steel` under "Against
your last 4 weeks", with "0 lb today against a 10.9k lb average across 19
sessions" beneath it. Every number is right and the sentence is false: volume is
weight × reps, so a session with no weight on the bar has no volume to compare.

```
sessionComparison(record, prior, now)
  -> { kind:'volume', n, volume, avg, pct }   volume on BOTH sides
  -> { kind:'reps',   n, reps, avg }          this session has none
  -> null                                     nothing to compare
```

Three things that are not decoration:

- **`avg > 0` as well as `vol > 0`.** Four weeks of bodyweight work behind a
  barbell day would otherwise divide by zero and print "+0%".
- **No percentage on the reps branch, and no colour on its number.**
  Green-or-steel is a verdict, and the verdict is what was wrong. Native should
  pass `undefined` for `color` the way it already does when `rate == null`.
- **`sessionReps` is one definition.** The recap's "N reps" heading and the
  comparison under it both call it, so they cannot disagree. Native's
  `summary.jsx` computes its own `totalReps` today — repoint it.

The other places a zero-volume session could embarrass a sentence were checked
in web and all of them already guard (`insights.js:265, :273, :423, :425`;
`you.js:1151`, `:1165`; the Training tile judges session COUNT). Check the
native twins — `src/pure/insights.js` and `src/ui/you/cards.jsx` — rather than
assuming, but the guards are in the pure files and so are probably across
already. A number LABELLED as volume is allowed to be zero: the `0 Volume lb`
stat tile stays, in both trees.

---

## 3. `estimate-origin.js` — a new pure module

| | |
|---|---|
| Web | `estimate-origin.js` (new) → `estimateOrigin(res)`, `originHeading(rows)`, `EDITED` |
| Native | `src/pure/estimateOrigin.js`, beside `recall.js` |
| Screen | `src/ui/food/estimator.jsx` — the heading at `:628` and the row list under it |
| Port | **Copy the module verbatim.** The screen around it is a small rework. |

A new module rather than a home in `recall.js`: recall is about what has already
been logged and matched; this is about what one reply says about itself. And a
module that imports nothing and reads nothing — no clock, no store, no
formatting helpers — is one this tree copies the way it copies `units.js`.

Typing "panda sesame chicken" gets an answer out of Panda's published row: no
model runs, $0.0000 is spent, and both clients headed it "Claude's estimate".
`food.js` already refuses the same lie in the other direction, in its own words
at the `src` expression — recording a food-db answer as an AI estimate "is the
same class of lie".

```
estimateOrigin(res) -> { heading, sub, rows: [{ origin, venue, label }] }
   rows align ONE-FOR-ONE with res.items, including items that will be dropped

   every row food-layer   "From the Panda Express menu" / "From published
                          nutrition"; two venues in one answer name neither
   every row model        "Claude's estimate"
   mixed                  "Part menu, part estimate", each row tagged
   all cache              "Claude's estimate" + sub "answered earlier, nothing
                          spent"
```

### The three rules underneath it

**ONLY `src.kind === 'curated'` may claim a published source.** ⚠ This was
wrong in the commission and wrong in this document until 17 Sep 2026, which is
the one bug v41 shipped and had to fix before pushing. The brief said a model
row carries no `src`. **It always has**, and so does every other row:

| Worker | row `src` |
|---|---|
| `src/food/lookup.js:625` `withSrc`, and `src/food/barcode.js:259` | `{ kind:'curated', venue?, from?, asOf?, stale }` |
| `src/index.js:752` (residual rows) and `:1434` (whole-order rows) | `{ kind:'ai', model, searched }` |
| `src/food/free.js:37` | `{ kind:'cache' }` — **unless the cached row kept its original `src`**, so a remembered answer can read `curated` or `ai` on the row and `cache` at the top |

So a module that tests the `src` object for PRESENCE calls the model's own guess
published nutrition. Web's did: a pure model answer was headed "From published
nutrition", and on a residual answer the estimated row read "published
nutrition" — under a Panda heading, and inheriting `res.venue` outright where
the reply carried one. The rule is kind-based and matched EXACTLY:

- `'curated'` → a food row, the only kind that may name a source
- `'ai'` → an estimate
- `'cache'`, or `res.source === 'cache'` → an estimate, "answered earlier"
- **anything else — an unknown kind, a `src` with no kind, no `src` at all —
  is an estimate.** A provenance you cannot read is one you cannot repeat.

**`res.source` speaks only for a reply where NO row carries a kind** — a Worker
from before per-item provenance. Its values are `'curated' | 'parsed' | 'cache'
| 'ai' | 'mixed' | absent`; `'mixed'` is `sourceOf`'s word for rows that
disagree (`src/index.js:591`), so it is the one top-level source that can never
speak for a row. `res.source` is the same signal `estimator.jsx` already trusts
enough to write `'food-db'` into the database.

**An answer that says nothing about itself reads as an ESTIMATE, never as a
menu.** An older Worker sends no `source` and no per-item `src`. Claiming a
published source a number does not have is a wrong number in words; saying
"estimate" over a number that really did come off a menu costs nothing but
modesty. This is the same shape as `maintSrc`'s "absent reads as pinned" — the
safe direction is the one that under-claims.

**`asOf` is parsed as TEXT.** `new Date('2026-09-01')` is UTC midnight and
prints as 31 August west of Greenwich. The module builds no `Date` at all, and
a format it does not recognise is printed through unchanged rather than guessed
at.

### WHAT IS WRITTEN DOES NOT MOVE

The stored `src` string (`'food-db' | 'ai-text' | 'ai-photo'`) is the shipped
iOS rule verbatim and both clients read it back. It did not change, and the
logged entry is byte-identical to v40's — proved in
`tools-check/estimate-origin.mjs` §E by building the entry BOTH ways from real
source text (v40's expression lifted out of `git show 9c1f0af:food.js`) across
thirteen reply shapes.

The mechanism matters for the port: **the origin is carried in a parallel array,
never on the entry.** Web's `addEntries` spreads an entry straight into the day
log (`{ id, t, ...entry }`), so a display key hung on it would be written. There
is nothing to strip because nothing is attached. Native's `estimator.jsx` builds
its entries the same way — check before choosing a React state shape, and if the
rows live in state, keep provenance in a second array or a `useMemo`, not on the
item.

**The alignment trap.** `normalizeImport` drops an item with no name;
`estimateOrigin`'s rows are one per item the Worker sent. Zip them naively and a
nameless row in the middle slides Panda's provenance onto a guess. Web keeps it
exact by normalising each item on its own — a per-item map with no state across
the list — rather than restating the filter. Do the same.

**The confidence pill is untouched**, exactly as the Worker sent it. So is the
"Found in your log" sheet, which was already honest.

### The case this change creates if you do not handle it

Every row on that sheet is editable. A row whose numbers have been corrected by
hand did not come off Panda's page any more, and the line under it would go on
saying it did — this ship's own defect, committed fresh. A corrected row becomes
`EDITED` ("edited by hand") and stops voting on the heading; correct them all
and the heading is "Your numbers".

**Now verified against the Worker's source, not against the brief.** Every
fixture in `tools-check/estimate-origin.mjs` names the `~/dev/rack-worker` line
that produces it, including the residual path (`src/index.js:752` for the
estimated rows, `sourceOf` at `:591` for the `'mixed'` top level). The earlier
note here said the mixed path was unconfirmed and that the module "fails toward
estimate when it recognises nothing" — it did not: it recognised a `src` it
should not have. A top-level `venue` also still sits on the RESPONSE, which is
why a model row must never reach `foodRow`'s `res.venue` fallback. **Port the
kind test, not the presence test.**

---

## 4. `goalDirection` — one rule where there were two, and native has both

| | |
|---|---|
| Web | `insights.js` → `goalDirection(targets, maintCal)`, `rateVerdict(rateWk, dir)`, `HOLD_RATE_LB` |
| Native | `src/pure/insights.js` |
| Port | **Copy all three verbatim**, then delete two copies and rework one colour. |

`weight.js` coloured the weekly rate green at or below zero and amber above it —
"down is good", true for a cut and wrong for everybody else. **Native has the
identical line:**

```jsx
// 695d996:app/(app)/(tabs)/weight.jsx:174
color={rate != null ? (rate <= 0 ? T.colors.good : T.colors.warn) : undefined}
```

And native has the same rule written twice, in the same two places web did:

| | Native | Web (before v41) |
|---|---|---|
| Fuel's copy | `src/state/foodTargets.js:96` `goalSign(targets, maintCal)` | `food.js:697` |
| You's copy | `src/ui/you/derive.js:116` `goalDir(targets, maint)` | `you.js:707` |

Native's is already the better-factored half — both take `targets` as an
argument rather than closing over module state, and `foodTargets.js:93` carries
a comment saying `goalDir` "disagrees on purpose". **It does not disagree on
purpose.** The difference is only that `goalSign` folds "nobody knows" into
"holding" and `goalDir` keeps them apart, which is a call-site decision, not two
rules.

```
goalDirection(targets, maintCal) -> -1 cut | 0 hold | 1 gain | null unknown
HOLD_RATE_LB = 0.5
rateVerdict(rateWk, dir)         -> 'good' | 'warn' | null
```

- **`null` is NOT zero.** Zero means holding, which is a goal with a right
  answer; null means nobody knows. The calorie bar has three bands and no
  fourth, so Fuel folds null to 0 **at its own call site**, in one line:
  `const d = goalDirection(targets, maintCal); return d == null ? 0 : d;` Keep
  that fold in `foodTargets.js`'s `goalSign`, not in the rule.
- **The Weight tab needs them apart.** An unknown direction gets **no colour at
  all**. An uncoloured number says nothing, which is the only honest thing left.
- **`HOLD_RATE_LB` is the band `derive.js` already holds by** — half a pound a
  week, between one week's mean bodyweight and the last's. Export it and have
  the You tile use the constant rather than a literal, so the two screens cannot
  drift.
- **A stated direction gets no tolerance band.** On a cut, up is up. The band is
  for "hold", where every rate is against the goal in one direction or the other
  and only the size means anything.

**Prove no sentence moves.** Web did it by lifting both v40 bodies out of
`9c1f0af` and both new adapters out of the working tree and running all four
over a 903-case grid of rate, target and maintenance (`maintenance.mjs`). Not
one answer changed. Do the same here before deleting either copy — the whole
value of unifying them is that it is invisible.

One real difference to know about: v40's Fuel copy **throws** on a null
`targets` (it reads `targets.auto` unguarded). Unreachable in web, where
`food.js`'s `targets` is an object from its first line; `goalDirection` guards
it. Native's `foodTargets.js:96` takes `targets` as a parameter, so check its
callers.

---

## 5. `weighTime` — the one thing in this ship that changes what is stored

| | |
|---|---|
| Web | `weightmodel.js` → `weighTime(typed, now)`, `WEIGH_SKEW_MS`, `WEIGH_BACK_MS` |
| Native | `src/pure/weightmodel.js` |
| Screen | the weigh-in card in `app/(app)/(tabs)/weight.jsx`; the write is `src/state/weight.js:160` |
| Port | **Copy the function and the two constants verbatim.** The control is a rework. |

`src/state/weight.js:160` is `{ lb: r1(lb), t: Date.now() }` — the same line web
had. The model in `weightmodel.js` **learns how weight moves through the day**
from that `t` (it is the whole of `bK` and `bW`), so a morning weight typed in at
9 PM teaches the fit that the body was two pounds lighter after dinner than it
was, and the error is multiplied by roughly 500 on its way into the maintenance
estimate.

```
weighTime(typed, now) -> { t, reason }
  nothing typed ('' | null | NaN | unparseable)   -> { now, 'none'   }
  more than 2 minutes ahead                       -> { now, 'future' }
  more than 14 days back, or below zero           -> { now, 'old'    }
  otherwise                                       -> { Math.round(t), '' }
```

- **REFUSED, NOT CLAMPED.** Quietly sliding a weigh-in onto the nearest time it
  is allowed to be is a wrong number with nothing on screen to catch it. The
  sheet toasts and the person fixes it.
- **`''` is nothing typed, not 1970.** `Number('')` is `0`, not `NaN`. Without
  that guard an empty box comes back as a typo'd year.
- **`t < 0` as well as the window**, so the output is inside the bound the
  PROPOSED rules put on this key for ANY clock rather than only for one set
  after 1984.
- **`now` is an argument.** Pure, copyable, and drivable by a verifier at any
  hour — which is why `tools-check/weigh-time.mjs` derives all 44 of its cases
  from one fixed epoch and is green under America/New_York, UTC and
  Pacific/Auckland.

### The control

Collapsed by default: a "Weighed earlier?" button that reveals a picker
defaulting to now. **Nothing exists until it is tapped**, so "untouched" is the
absence of a control rather than a default value that could drift — untouched,
the write is one `Date.now()` at save and byte-for-byte the write it always was.

Native already has the dependency: **`@react-native-community/datetimepicker`
`^9.1.0`** is in `package.json` at `695d996`. It hands back a `Date`, so only the
bound is shared — web's string parse (`Date.parse` of a `datetime-local` value,
which is specified to be LOCAL) stays on web's side.

**Two local-time traps.** Web's picker opens on a hand-built local stamp, not
`toISOString()`, which is UTC and would open it on yesterday evening west of
Greenwich. RN's picker takes a `Date` and avoids that one for free — but set its
`minimumDate` / `maximumDate` from `now - WEIGH_BACK_MS` and `now + WEIGH_SKEW_MS`
so the picker and the rule agree. And the entry list keeps printing the time that
was **stored**.

### The rules

The published rules put no `.validate` under `weight` at all. **The PROPOSED set
in this tree does**, and it is the tighter of the two:

```
web-patches/database.rules.PROPOSED.json  (695d996)
  users/$uid/weight/entries/$id/t  newData.isNumber() && val >= 0 && val <= 4102444800000
```

`4102444800000` is 2100-01-01Z. Every value `weighTime` can return is inside it
for any clock, and that is checked over a grid rather than argued. **No rules
change is needed for this ship**, in either set.

**Editing an existing weigh-in's time is NOT in scope** in either tree.

---

## 6. The refused list — web caught up to native, except one bug

This is the one section where the port direction is **backwards**: native was
right and web adopted native's rules word for word. `NIGHT-LOG.md`'s refused-save
diff table is what this was built from, and two of its three rows are now closed.

| | Was (web v40) | Now (web v41) | Native `695d996` |
|---|---|---|---|
| full-of-sessions eviction | `if (at === -1) at = 0` — drops the oldest SESSION | drops the INCOMING item unless it is a session too | already right |
| item identity | `at + '|' + path`, can collide | `id` = time base36 + per-load seq; the composite is still READ for old items | already right |
| workout test | `/\/workouts\//` | `/\/workouts(\/\|$)/` | already right |

Nothing to port. The rest of the table — throw vs return, `intent`, the retry
mechanism, `retryingPath` — is still two designs that need picking on purpose,
and `NEXT-NATIVE-V40.md` §3 has that argument.

### ⚠ ONE BUG IS NATIVE'S, AND IT IS NOT A PORT JOB

**`retryRefused` reports "Saved" for a retry that only went into the offline
queue.**

```js
// 695d996:src/data/store.js
export async function retryRefused(id) {
  …
  discardRefused(id);
  try { … await write(short, it.value, it.intent || undefined); return true; }
  catch (e) { appendDead({ …it, … }); return false; }
```

`write()`'s offline branch **queues the payload and resolves**. So on a phone
with no signal: `retryRefused` returns `true`, the sheet says "Saved", and the
payload is now in the **queue** — where `flushQueue` replays it automatically on
reconnect.

Nothing is lost (it is refused again and dead-lettered again), but two
properties break, and the second one is the point of the whole feature:

1. the person is told it saved when nothing saved;
2. **a payload this list exists to never replay automatically is now on the
   automatic replay path.** Replaying a rejected payload on a timer is how a
   too-strict rule becomes an infinite loop nobody can see.

Web returns `'saved' | 'refused' | 'offline' | 'gone'` and checks `online.value`
before it tries. Web is right here. **Fix native; do not port web's shape
backwards into it.** The minimum is an online check before the retry, or a
return value that can tell "queued" from "saved".

---

## What to run

Twelve verifiers in the web tree, all green under `TZ=America/New_York` and
`TZ=UTC`, all driving the real modules with Firebase stubbed and none holding a
copy of the logic it checks:

```
tools-check/units.mjs             128 checks — §I is the BW table and the two scans
tools-check/bodyweight-sets.mjs    51 checks — the record, its consumers, and §2's card
tools-check/estimate-origin.mjs    54 checks — NEW. §3, incl. the write-identity proof
tools-check/weigh-time.mjs         44 checks — NEW. §5, from one fixed epoch
tools-check/maintenance.mjs        61 checks — §4's 903-case no-sentence-moved grid
tools-check/refused-write.mjs      91 checks — §6
tools-check/destructive-write.mjs  85 checks — unchanged, and §6 lands next to it
plus blocks, accounts, frequent, merge-invariant, month-erasure, recall-matcher
```

Sections of all of them are pure and would run against this tree's own copies
with the imports repointed. `estimate-origin.mjs` and `weigh-time.mjs` are the
two easiest to bring across: both drive a module that imports nothing.

## Traps hit while building this

- **`fmtSetW` is not only a formatter.** It fills input boxes. The BACKLOG entry
  that described this ship as "one change to `fmtSetW` and nothing else" would
  have broken the edit path in both trees.
- **Two identical blocks in `food.js`.** The estimate sheet's row list and the
  recall-hit sheet's row list are byte-identical; a text edit has to disambiguate
  by the note line underneath. Likely true of `estimator.jsx` too.
- **A comment that names the thing it forbids trips a source scan.** Three
  checks here strip comments before looking for `new Date`, `toISOString` or a
  hard-coded heading, because the file explains why it does not call them.
- **v40's `goalSign` throws on a null `targets`.** Found by a grid, not by
  reading. Unreachable in web; check native's callers.
- **`weight.js` read `food/daySummaries` and `food/targets` inside the
  maintenance card.** The rate colour above it needs the same two answers, so
  they moved up into `render()` and are handed down — reading them twice is how
  two numbers on one screen come to disagree.
