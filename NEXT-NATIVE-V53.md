# Porting rack-v53 to rack-mobile

Web shipped as `rack-v53`. The tree it mirrors is `~/dev/rack-mobile`.

v53 is **the finish**. After a workout the first thing Micah reads is warm,
and never a number that stings:

- **Five small fixes**: the Lift target over 2,000 lb, the card repeating one
  line every open, the readiness list hidden behind the lighter week, "your
  change" naming which change, and food logged after a first *Am I fueled?*.
- **The finish line**: one pure decision, `finishRead()` in `coach.js`, of what
  to celebrate. The recap, the Coach card and the sheet all read it.
- **The recap, redone**: the win first, no percentage anywhere, and a
  comparison only with sessions like this one.
- **"How did that feel?"**: energy 1–10 and strength against normal, saved with
  the session. The bad-day mark is folded in, and three new Patterns set his
  energy beside his food.

The build brief is `SHIP-V53-PROMPT.md`. What was built, and every place it
departs from the brief, is in `COACH-REPORT.md` §69–§78.

**`rack-mobile` was NOT read this time.** The run was fenced to
`~/dev/ship-v53`, as the brief ordered. Every native path below is carried
from `NEXT-NATIVE-V52.md`, and is **unverified at whatever native is now**.
This file is the delta on top of V52, so port V52 first.

**What is stored:**

- one new child of a workout record, `workouts/{mk}/{dd}/{id}/feel = { e, s, at }`;
- one new category id under `settings/coach/mute`, `feel`;
- a new shape for the device key `coachHype` (§4.1).

`database.rules.json` and the OPTIONAL-LOCK file are byte-identical to
rack-v52: `workouts` and `settings` both carry section-level `.write`s. **But
native's PROPOSED rules close the workout record — see §8.**

**What is read:** with Patterns on, the rated sessions' own food days, at boot,
beside the days Patterns already read (§4.3). Nothing new on a paint.

---

## ⚠ THE PINS

Unchanged since rack-v52:

```
units.js          fa6f03c9b2a097821c194af2be8e9711da5f940f3a35850d17897c77da4f6da5   unchanged since rack-v41
exercises.js      74ac8a9885376b79940daa6a184dfed14bfa4e32d2226e4e367db53dfd9d9857   unchanged
coach-tags.js     846501595feb06fddc7d85fb19ed526bc6c6cc69cecc5b7e9494eb96bd8c8a06   unchanged since rack-v42
blocks.js         1fd10b3b82aa89082dee1675120d5a39fe7c21e7f7232b1930b6ce233a1fbbaf   unchanged
coach-live.js     877528f81150c0553f2d81188198d2535c9321ea74c80049e1f7ad324038e1d9   unchanged since rack-v46
coach-goal.js     6cd88a72e932ad060fe456121372dc483525ec28ca0c5d067c3aa58f41382048   unchanged since rack-v49
accounts.js       f89af13550da39c24a643ea411b8f8c820202bf605aa990aab15f2d64506d471   unchanged
tdee.js           83c2e76b71cfa2f6c8260fae807182e0682af48459bcd30b7be9eb9c4d48fe3d   unchanged
coach-ready.js    a72c1309967a36f927208402242df8469f201b0c490eae3a28346ee419f1cd6a   unchanged since rack-v52
coach-prog.js     211d31ae8d107d15807338dcc8cf56b8d7c60042796451614c270e1f192f490f   unchanged since rack-v52
coach-overlap.js  d81b1b59579552aac999ff22d708dbf72b375f1e1289cfc9dda9457f93c1fd8e   unchanged since rack-v52
coach-build.js    1257d46bec95a62a1a4466ef23bc5b7751c2e26b3072970b6d1d6684700d7c8c   unchanged since rack-v52
```

**The files the port copies verbatim that changed:**

```
analytics.js      6ba64c5a57ffe28ca27f6556a03ba058f97fc840ef83cece7013253858473129   CHANGED — re-copy, 1,014 lines (v52: f6054ad…, unchanged since rack-v47)
coach.js          a93c7d8251dc608faf1a8857e58e9038b03604735ff796189223681f46cba59c   CHANGED — re-copy, 5,266 lines (v52: 276de12…)
coach-fuel.js     36fdf21814d6b32d3ac6bb1411636fe664f1c58e569f8569d1f4c786d1bfd896   CHANGED — re-copy, 479 lines (v52: 5be93f1…)
```

`analytics.js` moves for the first time since rack-v47, on purpose:

- **added** `sameKindComparison(record, prior, now)` (§5.2);
- **added** `normFeel(v)` and `FEEL_STRENGTH` (§6);
- **deleted** `sessionComparison()`. **Native's summary screen must stop
  calling it**, or the import fails at load.

---

## 1. `coach.js` — re-copy it

Everything below is additive to the engine's tables, except the card's order
after a workout and the sheet's opening, which native's view layer reads (§7).

- **`finishRead(input, record, extras)`**, exported and pure. `input` is
  `coachInput()`. `record` is the session just saved, added to the sessions
  when its id is not there yet, and put in place of the stored one when it is
  (a rating the re-read predates). `extras` is `{ prs, firsts, milestones }` as
  the summary screen worked them out, or absent. Absent, it works them out with
  `analytics.js`'s own `detectPRs()` and `sessionMilestones()` over the same
  prior sessions. It returns `{ headline, line, why, earned, evidence, short,
  id }` and never throws.
  - `headline` is **"Great workout."** only with evidence, in this order: a
    record; every Coach target met (two or more, Pro, targets on); a session
    milestone; above his usual (Pro); his own rating (energy 8+, strength
    110%+); a comeback after 12+ days. Otherwise **"Good work."**, with a plain
    true fact ("Chest and arms done: 18 sets."), or on a harder day (marked,
    strength 90% or less, energy 3 or less) "Showing up on a harder day
    counts."
  - `short` is the card's shorter form of the line.
- **The fact `session.finish`**: `finishRead()` for the latest session. It
  requires `session.latest`, so it is computed only in `post` and
  `done_today`.
- **The card:**
  - `hype_finish`, first in `HYPE`, category `core`.
  - Every HYPE line gains `key`, the fact value it quotes.
  - `pickHype()` skips a key shown in the last 24 hours (`finish:` keys are
    exempt in `post`/`done_today`).
  - In those two states the order is explicit: `hype_recovery` when its gate
    passes and it was not shown in the last day, then `hype_finish`, then the
    rotation.
  - **`WARM`**, eight frozen lines, replace "Nothing stands out today." on the
    card (state `'warm'`). It stays as a sheet answer. A warm line is never the
    greeting's sentence, and on Train never You's line.
- **The sheet:** in `post`/`done_today`, unless a blocking state holds,
  `c.opening` is the finish bubble (`id: 'finish'`) and `c.openingNext` is the
  finding the sheet used to open on. `repeats` stays keyed to the finding.
- **Routes:** `ask_ready: ['readiness']`, labelled "Anything else off today?",
  follows a `lighter_week` answer (`FOLLOWUPS_AFTER`). `FUEL_ROUTES` gains
  `ask_ready`.
- **The category `feel`**: "After a workout: how it felt", directly after
  `live`, mutable, on by default. It has no intent (it is the summary screen's
  check-in).
- **The rating's words and gates**, exported for the summary screen:
  `FEEL_S_WORDS`, `feelHarder(feel)` and `canMark(settings, sessionId)`.
  `canMark()` applies v52's `markView()` gates: a markable id, Questions on,
  not marked already.
- ***How did today compare?*** gains his rating after the lift rows, quoted as
  he gave it. When the numbers disagree, "By the numbers it was your usual; you
  rated it 110%."
- **Patterns, eleven** (Micah's decision, 24 Sep 2026): `feel.energyFedBefore`,
  `feel.energyKcalBefore` and `feel.energySinceFood`. `patternFoodDays()` adds
  the rated sessions' dates (§4.3). The third is real-time loggers only,
  through `coach-fuel.js`'s `logStyle()`.
- `coach.js` imports `detectPRs`, `sessionMilestones` and `normFeel` from
  `analytics.js`, `fmtSetLoad` and `labelVol` from `units.js`, and `logStyle`
  from `coach-fuel.js`.

## 2. `coach-fuel.js` — re-copy it

- `readAll()` keeps `changedBy` (`'aim'` or `'weight'`, the later of the two,
  the aim on a tie) and `changedDays`.
- The phase lines name the change: "…before you changed your goal, 3 days
  ago", "…before your weight trend changed, about 2 weeks ago", "Coach is
  learning your new normal since you changed your goal, 9 days in".
- **New export `logStyle(input, now)`**: `readAll()`'s own logging style, for
  the one pattern that reads the hour food went in.

## 3. `analytics.js` — re-copy it (see THE PINS)

## 4. Native's `coachData.js` — what the gatherer gains

### 4.1 The device memory shape (`coachHype`)

The key is `rack:{uid}:coachHype`. It is now `[{ id, key, at }]`, newest first,
eight deep, one entry per fact value.

- **A v49 entry, a bare string id, reads as `{ id, key: id, at: 0 }`.** The
  engine's `coach.recentHype` fact normalises it too.
- **The engine reads the memory as it stood at app open, all open long.** Do
  NOT hand it the list `rememberHype()` just updated. With the 24-hour rule,
  that would take the line off the card on the very next repaint.
- **`rememberHype(id, key)` writes this open's one entry, replaced while the
  open lasts:** the last line drawn, `at` the moment it was first drawn. It
  writes `[entry].concat(atOpen.filter(x => x.key !== key)).slice(0, 8)`.
- Warm lines are never written to it.

### 4.2 Two new exports

- **`coachFinishRead(record, extras)`** calls `finishRead(coachInput({}),
  record, extras)`, and on any throw returns "Good work." built from the
  record alone. The summary screen calls it when it first draws, and again
  after a rating is saved.
- **`noteCoachFood(dateKey, summary)`** sets that one day's summary, as a copy,
  and nothing else. **Call it from native's food state straight after each
  `food/daySummaries/{date}` write.** Without it, food logged after a first
  *Am I fueled?* is never re-read (web's `loadFuel()` re-reads today only when
  its summary has moved).

### 4.3 The Patterns read

`loadPatternFood()` still reads `food/log/{date}` for the days
`patternFoodDays()` names, at boot, with Patterns on.

- That list now ends with the rated sessions' dates that are not already on
  it: newest first, 40 at most, never trimming the shipped ones.
- Each day read is also kept whole as `foodDays[date] = [{ t, cal }]`, beside
  `foodFirst`, whose computation is unchanged.
- `coachInput()` hands over `foodDays`.

### 4.4 The Lift target Save (Your goal)

- Validate before writing: over `GOAL_LB_MAX` (converted in with `wIn`), write
  nothing. Toast "Coach takes lift targets up to {max}." with `limW([0,
  GOAL_LB_MAX], u)[1]` and its unit, never `labelW` (907.2 kg is refused).
- A value `normGoalLift()` refuses for any other reason: "Couldn’t save that".
- After the write, compare the stored `goalLift` with the one sent. Say
  "Saved" only when they match.

## 5. Native's summary screen

### 5.1 The order, top to bottom

1. **The hero**: the eyebrow "Session complete"; `finishRead`'s `headline` as
   the big line; its `line` under it; then the session's name and date,
   smaller.
2. **"How did that feel?"** (§6), unless the `feel` category is muted.
3. **The wins**: personal records, session milestones, first time logged.
   Their content is unchanged; they moved up.
4. **The stat row**: duration, volume, working sets.
5. **What you did.**
6. **"Compared with sessions like this"**, only when `sameKindComparison()`
   answers.
7. **Done / Save as routine / See statistics.**

**No percentage anywhere on the screen**, outside the check-in's own strength
chips and saved line.

### 5.2 The same-kind card

`sameKindComparison(record, prior, now)` compares only with prior sessions in
the 56 days before `now` whose kind differs by at most one group. A session's
kind is its groups with 2+ non-cardio working sets, by the stored `ex.group`.
It needs two or more, by median, and returns `{ n, volume, usualVolume, sets,
usualSets, label }`. `volume` and `usualVolume` are null unless both are above
zero.

Draw two plain lines in body text, with no big number and no verdict colour:

- "Volume: {v} {unit} today, against a usual {u} on {label} ({n} sessions)."
- "Sets: {s} today, against a usual {m}."

With no volume, draw one line: "Sets: {s} today, against a usual {m} on
{label} ({n} sessions)."

## 6. The check-in, its write, and THE TRAP

- **Energy**: 1–10, two rows of five, captioned "Energy". **Strength**: the
  five `FEEL_S_WORDS`, captioned "Strength compared to your normal". Then
  **Save** (enabled once either has a pick) and **Skip** (collapses the card,
  writes nothing). Every chip is a 44px target.
- **Save** writes `normFeel({ e?, s?, at: now })` as **one child write** to
  `workouts/{mk}/{dd}/{id}/feel`, after the record itself is saved.
  - `mk`/`dd` come from the date the record is filed under (web keeps
    `dateK`).
  - **Straight after that write resolves**, and not before: set the month
    cache's record `.feel`, re-read Coach's sessions, recompute
    `coachFinishRead()` and redraw.
  - A refused write changes nothing and leaves Save live.
- **Saved**: one line, "Energy 8/10 · Strength 110%", parts as given.
  - When `feelHarder(feel)` and `canMark(settings, id)` are both true, draw
    v52's mark question under it: "Anything Coach can’t see?", the same five
    chips and acks. A chip calls `markSession({ id, date: dateK }, value)`.
    "Nothing" writes nothing.
  - With Questions off there are no chips.
- **THE TRAP.** Any code that rebuilds a workout record from scratch (web's
  `saveEdit()`) must carry `feel` over from the record being edited,
  unchanged. Otherwise **editing a workout silently erases its rating**. Every
  whole-month write is built from the month cache, which is why the cache
  must hold `feel` the moment it is written.

## 7. The surfaces — where each web change lands on native

Native paths are V45's, unverified.

| web | native destination | what it needs |
|---|---|---|
| the card after a workout | `src/ui/coach/card.jsx` | nothing if it draws `c.card.you`. `hype_finish` arrives by itself. Pass `view.key` to `rememberHype(id, key)` |
| warm lines | same | `c.card.you.state === 'warm'` is drawn like an earned line (reason may be empty). The half-loaded substitution ("Your training is in. Food and weight have not landed yet.") applies to `warm` as it does to `card_state_clear` |
| the sheet after a workout | `src/ui/coach/sheets.jsx` | when `c.openingNext` is set, draw `c.opening` first, then `c.openingNext`. An answer marked `repeats` hangs its follow-ups on the `openingNext` bubble |
| *Anything else off today?* | same | nothing: it is a follow-up chip, and `FUEL_ROUTES` covers its read |
| the Feel switch | `src/ui/coach/settings.jsx` | appears by itself if the list walks `CATEGORIES` |
| the summary screen | the post-workout screen | §5 and §6 |
| `coachInput()` | `src/data/coachData.js` | `foodDays` (§4.3), and the memory rule (§4.1) |
| the food state | wherever native writes `food/daySummaries` | `noteCoachFood(date, summary)` after each write |

## 8. The PROPOSED rules — the workout record

The published rules take everything: `workouts` and `settings` carry
section-level `.write`s.

If native's `web-patches/database.rules.PROPOSED.json` validates
`workouts/$mk/$dd/$sid` and closes the record with `"$other": { ".validate":
false }`, **every rating is refused** until it gains:

```json
"feel": {
  ".validate": "newData.hasChild('at') && (newData.hasChild('e') || newData.hasChild('s'))",
  "e":  { ".validate": "newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= 1 && newData.val() <= 10" },
  "s":  { ".validate": "newData.isNumber() && (newData.val() === 80 || newData.val() === 90 || newData.val() === 100 || newData.val() === 110 || newData.val() === 120)" },
  "at": { ".validate": "newData.isNumber()" },
  "$other": { ".validate": false }
}
```

- The whole-month writes carry `feel` inside each record, so the same rule
  validates it there.
- `settings/coach/mute/feel` passes V43's generic `$cat` rule as it stands.
  If that rule has since been narrowed to enumerated ids, add `feel`.

**PROPOSED, not published.** Micah publishes rules; nothing here does.

## 9. The verifiers

Three new ones, and several changed on purpose, each with its reason in place.

| | |
|---|---|
| `finish.mjs` | NEW. N1–N12: **ok 12, miss 0, wrong 0**, plus the agreement of recap, card and sheet, a paint spy (records worked out on a paint in `post`/`done_today` only), and 400 generated histories. **Ports** |
| `recap.mjs` | NEW. `renderSummary()` lifted out of `workout.js` into a DOM shim: the hero, no "%" in either unit, chest days against chest days by median, §5.1's order, the switch. Web's view layer: **re-point it at native's summary screen** |
| `feel.mjs` | NEW, 44 checks. `normFeel` junk, the child write after the record, the cache after the write, Skip, the mark chips' gates, the rating surviving a whole-month write, **`saveEdit` keeping `feel`**, the compare line, the headline recompute, the switch. The engine checks port; the write checks drive web's `workout.js` and need re-pointing |
| `coach-hype.mjs` | + G: the 24-hour rule and `WARM`. Fixtures a day earlier where a session today now leads with the finish line |
| `coach-patterns.mjs` | eleven; + I: each energy pattern true, false and thin, with a second reading of every number |
| `coach-fuel.mjs` | F10 and F11 name the change (still 16/0/0); + F+ |
| `coach-ready.mjs` | R15 reads `openingNext` after a workout (still 46/0/0) |
| `coach-overlap.mjs` | + the `ask_ready` chip (the battery is still 24/0/0) |
| `coach-boot.mjs` | + H: `noteCoachFood()`, one re-read, the new total. Web's gatherer: re-point it |
| `coach-surface.mjs` | + the Lift target Save; the sheet's first two bubbles |
| `coach-pure`, `coach-registry`, `coach-rank`, `coach-voice`, `coach-rotation`, `units`, `blocks`, `touch-target`, `bodyweight-sets` | changed deliberately, each with its reason in place |

## 10. What to run

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Both are clean at rack-v53 under `TZ=America/New_York`, `UTC` and
`Pacific/Auckland`: 43 verifiers, all exit 0. `coach-rank.mjs` K reads
rack-v52 out of git, so it needs a full clone, like the files V52 names.

## 11. If the port reads one thing in this file

§6's trap. A workout record is rebuilt whole and written with its whole month,
so **any field the rebuild does not carry is erased**, and `feel` is the first
field a screen other than the session writes to that record. Carry it in the
edit, and give the month cache the rating the moment its child write lands.
