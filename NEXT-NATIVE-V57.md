# Porting rack-v57 to rack-mobile

Web shipped as `rack-v57`. The tree it mirrors is `~/dev/rack-mobile`.

v57 is **four things**:

- **A. Rear-delt flyes are pulling.** *Is my training balanced?* counted every
  fly on chest or shoulders as pushing. The dumbbell and cable rear-delt flyes,
  the reverse pec deck and the band pull-apart take the arms apart, and now
  count as pulling. His own fly filed under shoulders reads "Rear-delt fly" in
  its editor and counts the same way.
- **B. The Fuel note says something true.** The note under the calorie bar
  said "at or below your maintenance" of a target 250 above it. It now says
  where the target sits against the holding band, with the band's numbers.
  Settings → Goal says the same sentence.
- **C. The movement tip names the path**: "Train → Exercises → tap it →
  Movement".
- **D. The You tab reads once per open, then only what changed.** It re-read
  seven nodes on every render (seven live GETs); now none on a render with
  nothing changed, and one node when one changed.

The build brief is `SHIP-V57-PROMPT.md`. What changed in Coach is
`COACH-REPORT.md` §102–§108; the band, the reads and what is not done are
`BACKLOG.md` under *What v57 left open*.

**`rack-mobile` was NOT read.** The run was fenced to `~/dev/ship-v57`, as the
brief ordered. Where this file would have to guess a native path, it says
**the native run maps this**. This file is the delta on top of V56, so port
V56 first.

**What is stored:** nothing new. The rear-delt fly on a custom exercise is
`pattern: 'fly'` on a shoulders exercise, exactly as v56 stores it.

`database.rules.json` and the OPTIONAL-LOCK file are **byte-identical to
rack-v56**. Native's PROPOSED rules need nothing from this ship.

**What is read:** less, and nothing new. §5.

---

## ⚠ THE PINS

Unchanged since rack-v56:

```
units.js           fa6f03c9b2a097821c194af2be8e9711da5f940f3a35850d17897c77da4f6da5   unchanged since rack-v41
exercises.js       74ac8a9885376b79940daa6a184dfed14bfa4e32d2226e4e367db53dfd9d9857   unchanged
blocks.js          1fd10b3b82aa89082dee1675120d5a39fe7c21e7f7232b1930b6ce233a1fbbaf   unchanged
accounts.js        f89af13550da39c24a643ea411b8f8c820202bf605aa990aab15f2d64506d471   unchanged
tdee.js            83c2e76b71cfa2f6c8260fae807182e0682af48459bcd30b7be9eb9c4d48fe3d   unchanged — the band is not moved (§3)
coach-ready.js     a72c1309967a36f927208402242df8469f201b0c490eae3a28346ee419f1cd6a   unchanged since rack-v52
coach-fuel.js      36fdf21814d6b32d3ac6bb1411636fe664f1c58e569f8569d1f4c786d1bfd896   unchanged since rack-v53
estimate-origin.js 9707d03f432a23990ca3ee054ea4e65680df670e99ddd87a829ea0c8b9c0ce6e   unchanged since rack-v55
estimate-ask.js    d64e4b5785c44c1e55d37bfaee599e4b85ad1e79af3484f7863b719a884aa479   unchanged since rack-v55
coach-goal.js      3956ca36008c1de04fca72223ebd806e1b1a873c90b6dce46136c77f8fbe96a7   unchanged since rack-v56
coach-overlap.js   c11307f3eeca63fe5e41f61acef446e064b1c8911a2548e9c5d8948639e7d4ac   unchanged since rack-v56
coach.js           e98a08f6c540b91a71362a44b17e4c846bceb34c0cc5a35a6e71d5850536cf6f   unchanged since rack-v56
coach-prog.js      8a24bd625888f70abf92d714a9f8d0040919ef5b5762f189e8a2fceed64b0ff5   unchanged since rack-v56
coach-live.js      621968c572e5e86134851249b4745f2ca2aa0a00777392ba81b02c495e5b8641   unchanged since rack-v56
coach-build.js     a1d204a5e52a85345cf193e8d827a91c36d13023f0b54f7acffb4e6e354c19a0   unchanged since rack-v56
analytics.js       02d2d112de893d136ed02ac92f7938c3b7408be2da3daa13b2e40ad3c754033f   unchanged since rack-v56
```

**The files the port copies verbatim that changed:**

```
coach-tags.js      4bffed387010c0d6ebcf8850bb1f3b25a8943cdd5c6b483d2413dc31d6f6ec29   CHANGED — re-copy, 455 lines (v56: dd2d49b…)
coach-volume.js    78f43cafad1e83f2a5585262cd21ab1d5d9ce65e6bf14a15350eaac5d588f728   CHANGED — re-copy, 559 lines (v56: 55f4b85…)
```

**Import edges that changed**, all between pure modules:

- `coach-volume.js` takes `flyPulls` from `coach-tags.js` beside `tagsFor`.
- `picker.js` (not copied verbatim) takes `movementLabel` from `coach-tags.js`
  in place of `PATTERN_LABELS`. `coach-tags.js` still imports nothing.
- `you.js` (not copied verbatim) takes `onChange` from `store.js`.

`picker.js`, `food.js`, `settings.js`, `store.js` and `you.js` are not copied
verbatim. What each changed, and what native must do, is below.

---

## 1. `coach-tags.js` — the flyes that pull (re-copy)

The table (`TAGS`, 231 rows) and the agreement table are **untouched**, and the
vocabulary is still fifteen words. New:

- **`PULL_FLYES`** (`:371`): `['dumbbell-rear-delt-flye', 'cable-rear-delt-flye',
  'reverse-pec-deck', 'band-pull-apart']`. The flyes that take the arms apart —
  pulling, where a chest fly is pushing. It is every fly `exercises.js` files
  under shoulders, and `coach-tags.mjs` I fails the day a fly is filed there
  that is not on it.
- **`PULL_FLY_GROUP`** (`:375`): `'shoulders'`.
- **`movementLabel(pattern, group)`** (`:402`): the editor's word.
  `PATTERN_LABELS[pattern]`, except a fly on shoulders, which is **"Rear-delt
  fly"**.
- **`flyPulls(exId, row)`** (`:445`): a built-in by `PULL_FLYES`, **whatever
  group it is filed under** (an override can refile it); any other id, handed
  its library row, when `ownMovement(row)` is a fly and the row's group is
  shoulders.

## 2. `coach-volume.js` — pulling, not pushing (re-copy)

`countSession` (`:228`): a fly that `flyPulls()` counts as **pulling**, and never
as pushing. It is **not a row**: the pull split (rows against pulldowns) does
not count it, because its words are "rowing sets" and "no rows". Nothing else
moved, for any exercise (`coach-volume.mjs` reads all 231 before and after).

The pointer line (`:550`) names the path: "You can set the movement of a custom
exercise in Train → Exercises → tap it → Movement, and Coach will count it."
**Native's labels:** the native run maps this. `coach-volume.js` is copied
verbatim, so the sentence is web's labels on native too. If native's tab, its
button or its editor row is called something else, the sentence is wrong there
until they match.

## 3. The Fuel note — `food.js`, `settings.js`

Web: `food.js:726` `targetNote(tcal, z, g)`, pure; `renderCalMeter` calls it;
`food.js:3700` `misfitNote(id)` for the goal sheet; `settings.js:666`. Native's
Fuel bar and goal sheet: **the native run maps this.**

- **When:** exactly as before — a gain whose target is at or under the band's top
  (`calorieZones().gainFrom`), or a cut at or over its bottom (`cutTop`).
- **The words**, by where the target sits (`zoneOf`):
  - inside: "Your target, 3,470, sits inside your holding range (maintenance
    3,220 ± 250), so the calorie bar reads eating to it as holding, not
    bulking."
  - below (a gain): "…sits below your holding range (…), so the calorie bar
    reads eating to it as cutting, not bulking."
  - above (a cut): "…sits above your holding range (…), so the calorie bar
    reads eating to it as bulking, not cutting."
- Numbers are `Math.round(v).toLocaleString()`, as every calorie on the card.
  Calories do not convert, on a kilo account or not.
- **The fix button is unchanged.**
- **Settings → Goal** (the "What are you doing right now?" sheet): with the goal
  unchanged and a cut or a gain that does not fit, the note is "Your goal is
  bulking. " + the same sentence, and " Save to move it to N a day." **only when
  saving would move it** (`previewGoal().changed`). v56 said "sits at or below
  your maintenance of 3,220. Save to move it to 3,470 a day." of a target of
  3,470. A hold keeps its own words.
- **The band is not moved.** `tdee.js` is byte for byte rack-v56's. Whether it is
  too wide for a bulk is Micah's decision (BACKLOG v57).

## 4. The custom exercise editor — "Rear-delt fly"

Web: `picker.js:464` `movementRows`. Native's exercise editor: **the native run
maps this.**

- The Movement chips' words come from `movementLabel(p, group)` instead of
  `PATTERN_LABELS[p]`. On shoulders: Not set · Press · Row · **Rear-delt fly** ·
  Raise. On chest: Not set · Press · Fly.
- **Nothing new is stored.** "Rear-delt fly" is `pattern: 'fly'` on a shoulders
  exercise, the shape v56 writes. A v56 custom set to Fly on shoulders needs no
  migration: it reads as a rear-delt fly now.
- Refiled from shoulders to chest, the same stored `fly` reads "Fly" and counts
  as pushing.
- "Rear-delt fly" at the chip's type is 94.1px with 3% held back, in a 288px row
  at 320 wide (`touch-target.mjs` G).

## 5. The You tab — reads once per open, then only what changed

Web: `store.js:655` `onChange`, `:656` `changed`, called from `write()` (`:694`),
`watch()` (`:774`, with the value), `mergeUpdate()` (`:785`), `flushQueue()`
(`:359`, `:375`) and `retryRefused()` (`:325`); `you.js:272`–`:318`
(`LIVE_NODES`, the `onChange` subscription, `take`, `refreshLogged`). Native's
You screen and store: **the native run maps this.**

**What it cost, measured** (`you-reads.mjs`: the whole app, rack-v56 and
rack-v57, over a Firebase stub that counts every get()). These are You's own
reads of its seven nodes; the weight model's read of a new weigh-in day's food
and water is the same in both builds.

| | rack-v56 | rack-v57 |
|---|---|---|
| each switch to You, nothing changed | 7 | **0** |
| a weigh-in on Weight (its listener delivers the node) | 14 | **0** |
| a weigh-in from another device, through that listener | 14 | **0** |
| a day's food on Fuel | 14 | **1** (`food/daySummaries`) |
| the targets moved | 14 | **1** (`food/targets`) |
| Your details saved from the gear | the sheet's 1 + 7, and the name never shown | the sheet's 1 + 1, and shown |
| the boot, the seven | each twice | each once |

**The mechanism, for native to mirror:**

- The store names the path of every write the device makes and every node a live
  listener delivers. A listener's delivery carries the node; a write does not,
  because it can still be refused.
- The You screen keeps two marks per node of its seven: **stale** (a write
  touched it, at, under or over its path: read it on the next render) and
  **fresh** (a listener delivered it whole: take it, no read). A render with
  nothing marked reads nothing.
- What it takes is put on screen exactly as the boot read puts it, and the
  screen repaints only when one of the seven actually moved.
- **The screen is the same.** `you-reads.mjs` renders one fixture in both
  builds and compares every line of text: at boot, after three switches, and
  after each change. The one line that differs is the name after Your details,
  which rack-v56 never showed.

**Two things that changed on purpose:**

- The settings callbacks (gear, avatar, the targets button, the goal buttons)
  repaint now. Until v57 each emptied a fingerprint first, which made its own
  refresh look like the boot's and be thrown away, so a name saved from the
  gear did not reach You until another node changed. For the same reason a
  unit switch now repaints You at once (read from the code, not driven by a
  verifier).
- **A change from another device** to targets, profile, the step or water goal,
  or a past day's food reaches You at the next app open, not the next switch.
  Weigh-ins and steps arrive through the listeners the Weight and Steps tabs
  keep open, and the day Fuel shows through Fuel's own listener, which rewrites
  that day's summary.

Nothing new is stored, and nothing is read that was not read before.

## 6. The verifiers

Counts are checks passed at rack-v57 (rack-v56 in brackets).

| | |
|---|---|
| `you-reads.mjs` | NEW, 26. The whole app, rack-v56 (staged out of git at `04e87cc`) and rack-v57, each in its own process over a Firebase stub holding a real tree. **A** the count: rack-v56 measured (7 a switch, 14 a change, the seven twice at boot), rack-v57 pinned (0, one node, once). **B** the screen: the You tab's text line for line, both builds, one fixture, a frozen clock. **C** a write elsewhere shows: a weigh-in, a day's food, the targets, a remote weigh-in through a listener, Your details from the gear. **D** the mechanism in the source. It drives web's store and screen; the counts are what native's should match |
| `coach-volume.mjs` | 101 → 121; battery **55 → 72**, the 55 held. R0–R16 the flyes that pull and every other exercise's direction, rack-v56 staged out of git as the before; every built-in read before and after; a 300-history sweep. L12's pointer sentence moved on purpose |
| `maintenance.mjs` | 62 → 74: his case (3,220, 3,470, a gain), the v56 sentence as a control, a grid of 10,116 targets with every sentence held to its numbers, the Bulking edge from 1,500 to 4,500, and both screens through one function. `targetNote` is in `food.js`, which is not copied, so these drive web's; native's words should read the same |
| `coach-tags.mjs` | 45 → 53: I, the flyes that pull, `flyPulls()` and `movementLabel()`. The table's checks are untouched. **Ports** |
| `custom-movement.mjs` | 60 → 68: B the "Rear-delt fly" chip, stored as `fly`; D Coach counts it as pulling, and the pointer's path read from the app's own labels |
| `touch-target.mjs` | 374 → 376: G measures "Rear-delt fly" |

The held batteries did not move: `coach-prog` 57/0/0 and 16/0/0,
`coach-overlap` 24/0/0, `coach-ready` 46/0/0, `coach-fuel` 16/0/0, `finish`
12/0/0.

## 7. What to run

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Both are clean at rack-v57 under `TZ=America/New_York`, `UTC` and
`Pacific/Auckland`: 51 verifiers, all exit 0 (50 at rack-v56).
`coach-volume.mjs` and `you-reads.mjs` stage rack-v56 out of git, so they need
a full clone.

## 8. If the port reads one thing in this file

§5. **Read once, then only what changed — and prove the screen did not move.**
Web's You tab asked the database the same seven questions on every paint because
nothing told it when an answer had changed. The store knows: every write goes
through it, and every live listener delivers through it. So the store says, and
the screen reads only what it names. The proof that nothing on the screen moved
is the same fixture rendered by both builds, compared line by line.
