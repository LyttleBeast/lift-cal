# Porting rack-v46 to rack-mobile

Web shipped as `rack-v46`. The tree it mirrors is `~/dev/rack-mobile`.

v46 is **Coach ship three, part one — Coach in the gym.** During a live workout
Coach can say what usually comes next, that one more set is in line, that a
group has had its usual — or that he is probably done for the day. It answers
when he taps a chip in the session's header row, or once, as one quiet line,
when a tick finishes an exercise. Plus **Patterns in your data**, off until
switched on: eight pre-registered comparisons between two groups of his own days.
And three fixes Micah found on his phone walking v45 (Phase 0), plus a second
round from walking v46's builder before it was pushed: "What should I train
today?" leads Train's sheet, "Make me a workout" asks what to train before it
builds, a switch for the in-gym read, the block check box ticking through the
0a rule, and Steps' and Water's buttons given their room. And a third: an
answer that would repeat the sheet's opening bubble is not printed twice, and
"Swap one" ends with "Something else…", which opens the exercise picker.

**`rack-mobile` was NOT read this time.** The run was fenced to `~/dev/ship-v46`
and a read of `~/dev/rack-mobile` was refused. Every native file path below is
taken from `NEXT-NATIVE-V45.md`, which read that tree at `13f6b80` (and
`581e84a` for `coachData.js`), and is **unverified at whatever native is now**.
Every "native needs" is a statement about what the feature requires. Check
before acting.

Read `NEXT-NATIVE-V42.md`, `NEXT-NATIVE-V43.md` and `NEXT-NATIVE-V45.md` first;
this file is the delta.

**What is stored:** two new keys under `settings/coach`, and nothing else —
`on.patterns` (the Patterns switch, absent = OFF) and `mute.live` (the "In the
gym" switch, absent = ON). See §6: the PUBLISHED rules take both as they are;
the PROPOSED ones in `web-patches/` must learn `on`, and must not be narrowed
in a way that refuses `mute.live`.

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

**NO PINNED FILE MOVED.** The files the port copies verbatim that did change
or arrive:

```
coach.js       6a80c986368da29b3a5f2114c56d36fb38f59808cdb6ff3d44df5b5b38349628   CHANGED — re-copy, 2,870 lines
coach-build.js ec6e5b6b15ff43ac78a1b1582da01ffab4ac267c400f780f770564eb93fe0d0a   CHANGED — re-copy, 649 lines (buildMenu, swapTo)
coach-live.js  877528f81150c0553f2d81188198d2535c9321ea74c80049e1f7ad324038e1d9   NEW — copy to src/pure/, 517 lines
```

`database.rules.json` and the OPTIONAL-LOCK file are byte-identical to rack-v45.

---

## 1. `coach-live.js` — new, pure, copy verbatim to `src/pure/coach-live.js`

`liveRead(input)` → one answer of four kinds, or `null`. Null is always allowed,
and it is the answer before a single working set is ticked.

**Imports**, all of which native already has under `src/pure/`:

```
./exercises.js   GROUPS, GROUP_ORDER
./analytics.js   isWorking, mergeSessionExercises      (session math only)
./units.js       fmtSetLoad, unitW
```

It never imports `coach.js` — `coach.js` imports IT. No clock, no randomness, no
DOM, no module state, and it never writes to the session it is handed.
`tools-check/coach-pure.mjs` section G fences all of that.

**Nobody calls it but `coach.js`.** `liveInput(d, session, current)` in `coach.js`
assembles its input from facts `coach.js` already owns — the twelve-week window
(`sessions`, never `window`: in a module that name shadows the global) and the
recurring shapes with their `members` — so §3.3's shape has one definition in
the tree. The caller hands `c.live(session, { current })` the LIVE session and,
when it knows it, the index of the exercise in hand. `c.live` returns null unless
the log is `readable`, the account is Pro, and the session is not an edit.

The answer:

```js
{ kind: 'done' | 'switch' | 'another' | 'next',
  exId,              // the exercise it is about, or null (done)
  group,             // switch only: the group it names
  text,              // the sheet's answer
  short,             // the one-line nudge
  why: [ … ],        // the reasons, one line each
  add: { id, name, group, equipment } | null }   // the library row, as the picker hands it
```

### 1.1 The rules a port is most likely to "improve"

- **The order is `LIVE_KINDS`: done, switch, another, next — and DONE FIRST is
  the whole design.** When the signals disagree DONE wins. Do not reorder for a
  "more useful" answer.
- **DONE-by-length counts only sessions of the same shape.** The first draft
  fell back to every session in the window and told somebody half way through a
  chest day "7 working sets against a usual 5.5" because leg days are short.
  With no shape of its own, only the fatigue route can say stop.
- **"Usually" is a strict majority** (`USUALLY = 0.5`, compared with `>`). Five
  of ten is a coin, not a habit. For "another" that is also never weaker than the
  brief's median.
- **Fatigue is a set typed F, or reps down a quarter at the same or a LIGHTER
  weight** from the session's first working set of that exercise. Fewer reps at a
  heavier weight is not fatigue. Warm-ups are never working sets. Any F on the
  exercise blocks "another" on it, not only an F on the last set.
- **No weight, ever.** The only figure it prints is a quote of the suggested
  exercise's last logged sets, through `fmtSetLoad`. Do not add a "try N".
- **"Next" never names an exercise already on the list or one not pickable**
  (hidden, or not in the library). A session whose next exercise is already
  planned votes for nothing, so in a routine- or builder-started session "next"
  is rare — the plan is on screen.

---

## 1b. `coach-build.js` — re-copy it

One addition: `buildMenu(input)` → `[{ id, label, opts }]`, the choices under
"What do you want to train?", and the two words `BUILD_ASK` and `BUILD_PICK`.
Order: Coach's pick (`id: 'pick'`, `opts: {}` — the default focus, the same
shape the answer to "What should I train today?" names), then each recurring
shape (`cap(name)`, the existing naming rule), then the six groups in
`GROUP_ORDER` by label — each only if `build()` answers it. Nothing is merged
away. Empty when a session is live, the library is unread or the log thin, the
same silences as `propose()`. `coach.js` feeds it `builderInput(d)` and
memoises it; the view draws exactly what it returns.

And a second: **`swapTo(input, opts, from, to)` → `{ opts, why }`**, what a lift
picked from the picker means for the proposal. It gives EXACTLY the opts a
listed alternative gives (verified against every listed one), or `opts: null`
with a reason from `SWAP_WHY` — not in the library (hidden included: native's
library keeps hidden ones, so this check is the one that keeps them out there),
already on the workout, or across the cardio line. Picking the slot's own lift
takes the swap off. Every proposal exercise now carries `other: { group,
exclude }` — the group the picker opens on, and the ids it must leave out (the
workout's own lifts and every hidden one).

---

## 2. `coach.js` — re-copy it

What changed inside, all of it additive:

- imports `liveRead` and `LIVE_NONE` from `./coach-live.js`, and re-exports
  `LIVE_NONE` (the sheet's words for "nothing to add"); imports `buildMenu` and
  `BUILD_ASK` from `./coach-build.js`
- `liveInput(d, session, current)`; `coach()` returns `live(session, opts)`,
  which is null while `mute.live` is set
- **The builder, after walking it:**
  - `TRAIN_TOPICS` order: `ask_shape` ("What should I train today?") FIRST,
    `ask_build` ("Make me a workout") second
  - `ask_build` now routes to a new selector, `build_menu`, whose answer is the
    question — `BUILD_ASK`, "What do you want to train?" — and whose choices are
    `c.buildMenu()` (§1b). `ask_build_now` ("Build it") routes to
    `build_workout` and answers with the proposal's headline, no question
  - `ask_shape`'s follow-ups and `FOLLOWUPS_AFTER.train_today_recommendation`
    offer `ask_build_now`, and a follow-up now carries `stands: 'ask_build'`
    (`STANDS_FOR`) so the view does not draw "Make me a workout" beside
    "Build it"
- **An answer that repeats the opening:** `coach().ask(id)` marks an answer
  `repeats: true` when its text is the opening bubble's word for word
  (`opening` is the You card's finding, on both sheets). The view prints
  neither the question nor the answer and hangs the answer's follow-ups under
  the opening bubble
- `coach()` returns `swapTo(opts, from, to)` (§1b), silent on an unreadable log
- **The in-gym switch:** category `live` — "In the gym", mutable, after `build` —
  and a registered selector `live_read` (never answered through the router;
  it gives the category its intent and puts it in `PRO_ADDS`)
- **Patterns:**
  - category `patterns` — "Patterns in your data" — LAST in `CATEGORIES`, with
    `optIn: true`. It moves no other category's rank index
  - `normSettings()` returns an `on` map beside `mute`: `on` holds opt-in
    categories switched ON, and **absent means OFF**. A `mute` on an opt-in
    category is dropped
  - `isMuted()` reads either way round, and `rank()` now goes through it instead
    of reading `mute` directly
  - constants `PATTERN_DAYS` (182), `PATTERN_MIN` (8), and four unexported ones
  - `derive()` gains `pDays`, `pSessions`, `trainedDays`, `pLift`
  - eight facts, `PATTERN_FACTS` in order: `lift.fedBeforeTop`,
    `session.setsAfterProtein`, `fuel.trainingDayCalories`,
    `weight.rateBySessions`, `lift.morningTop`, `lift.restGapTop`,
    `steps.trainingDays`, `lift.caloriesBeforeTop`
  - intent `patterns_in_data` — finding, `surfaces: ['sheet']`, tier `pro`,
    gated on the category being ON
  - response `resp_patterns` with `lines` / `text` / `reason` / `more`, and
    `renderIntent` passes a response's `more` through on the answer
  - route `ask_patterns`; `PATTERN_TOPIC` appended to the You surface's topics
    when answerable (never Train's, never the lead question)
  - `patternFoodDays(input)` — the days whose food log the first pattern needs

---

## 3. The tick-targets rule, and its native twin — READ THIS

**Web had a silent data loss, and native has the same one** — the brief says so
(SHIP-V46-PROMPT, FINISH); this run could not read native to confirm it, and the
mechanism below is web's. A set started from
a routine or the builder's "Start it" shows its target as grey placeholder text
over an EMPTY box. The set-check handler flipped `done` and nothing else, so
ticking without typing left `w` and `r` as `''` — and `collectFrom`, which keeps a
ticked set only when it has reps, dropped it at Finish without a word. The set
was green on screen and absent from the log.

Micah's rule, now `tickSet(s)` in `workout.js`, beside `collectFrom`, pure and
exported:

```
Ticking a set says "I did what it says". A box left empty on a set that
carries a target (tw / tr) is filled from that target as the set is ticked.
A box he typed into is never overwritten. Unticking clears nothing. A weight
target of '' leaves the weight empty, which collectFrom records as '0'.
```

`tw`/`tr` are stored pounds-as-strings exactly as `w`/`r` are, so the copy is
direct — **no units call**. The handler does `Object.assign(s, tickSet(s))`.

**Native's handler needs the same.** Its set-check lives where native's live set
row is (V45 named `src/state/workout.js` for the session state; the row itself
is native's session screen). Copy `tickSet` rather than restating it; it has no
imports.

The other half: **`unsavedTicks(exercises)`** counts ticked sets with no reps —
`collectFrom`'s own test turned over. `runFinish` counts them first; when there
are any it puts the existing confirm sheet up — body *"2 ticked sets have no
reps and won't be saved."*, buttons **Save anyway** / **Go back** — and Save
anyway re-enters Finish past the check. Zero such sets is the old path exactly.
When every ticked set is reps-less, the "No completed sets" sheet names the
count before it offers Discard. Web's `confirmSheet` gained an optional
`cancelLabel` for "Go back".

**The block check box goes through the same rule.** A set is fillable by the
block box when it has reps OR a rep target, and `setBlockDone` sends each row
through `tickSet` — so a block of grey target sets fills in exactly like single
ticks, and a row already where the box is sending it is left alone (tickSet is
a toggle). A set with neither reps nor a rep target is still not tickable by the
box. Native's block box, if it has one, needs the same.

---

## 4. `src/state/coachData.js` — what the input gains

```js
{
  …everything from NEXT-NATIVE-V45 §3,
  weighIns:  [{ lb, t }, …],     // NEW — every weigh-in, sorted; Patterns' weekly rate
  foodFirst: { [date]: ms | null } // NEW — see below; {} until read
}
```

- **`foodFirst`** is when the first food entry of a day was logged, for the days
  `coach.patternFoodDays(input)` names — the session days of his most-logged lift
  whose summary shows food. Web reads `food/log/{date}` for exactly those, after
  the boot wave, only when Patterns is on (and again at once when it is switched
  on), through `read()`: a failed read and an empty day are both null and both
  mean "leave that day out". Nothing waits on it.
- **`coachPro()`** — web exposes the Pro answer cheaply for the chip, which must
  decide whether to draw itself on every paint of the session without building a
  snapshot.
- **`noteCoachData({ routines })`** now takes the routines node and converts it
  exactly as the boot read does. Web's `routines.js` hands its list over after
  each of its own writes lands and whenever its watch delivers; `workout.js`
  wires it (`initRoutines(list => noteCoachData({ routines: list }))`). This
  closes BACKLOG v45's "a routine saved from the builder is not named until the
  next app open". Native's routines state needs the same hand-off.
- **`setCategoryMuted(id, muted)`** writes an opt-in category under `on`
  (`{ patterns: !muted }`) and everything else under `mute` as before.

---

## 5. The surfaces — where each web change lands on native

Native paths are V45's, unverified.

| web | native destination | what it needs |
|---|---|---|
| `coach-ui.js` `liveChip` in `workout.js`'s session header row, beside the calendar button | native's live session screen header | a chip, **Pro only** (nothing at all for Basic — not a lock, not a teaser), **never during an edit**. Tap opens the compact sheet |
| `openLiveSheet` — "What should I do next?", answered at once; **Why?**; **Add it** for next/switch | a new compact sheet in `src/ui/coach/` | the answer is `c.live(session, { current })`; null → `LIVE_NONE`; log not known yet → a waiting line. Why? reveals `why[]`; Add it closes the sheet and hands `[a.add]` to the add path below |
| **Add it** → `addPicked(chosen)`, the same function "+ Add exercise" hands `openPicker` | native's session add-exercise path | the SAME function the picker's add uses, never a parallel one. End of the session, outside any block, one empty set |
| `noteLiveTick` in the set-check handler, after `tickSet` | native's set-check handler | only on a tick ON, never in an edit. The line appears when the tick is the exercise's LAST set, the engine answers, and that exercise (`exId#occurrence`) has not had a line this session; any other tick clears it |
| `nudgeLine` in the swipe hint's slot | native's exercise card, where its hint line is | same slot, one line clipped, so no row moves and nothing covers the rest timer; tap opens the sheet, × dismisses. State rides on the live session (`_coach`) — device storage, never the record |
| Settings → Coach — a Patterns switch, OFF by default, and an "In the gym" switch, ON by default | `src/ui/coach/settings.jsx` | if it walks `CATEGORIES`, both rows appear by themselves — but the switch must read `!isMuted(settings, id)`, not `!settings.mute[id]`, or it shows Patterns ON. "In the gym" off: no chip and no line, and `c.live()` answers null |
| Train's sheet: "What should I train today?" first, "Make me a workout" second | wherever native draws `topicsFor('train')` | nothing if it draws the engine's order |
| "Make me a workout" asks "What do you want to train?" | `src/ui/coach/sheets.jsx` | when the answer's id is `build_menu`, draw `c.buildMenu()` as chips in place of the topic row; a pick says its label, then draws `c.build(item.opts)` exactly as a proposal is drawn now, and the topics come back. Write none of the words — they are the engine's |
| "Build it" goes straight to the proposal | same | answer id `build_workout`: draw `c.build({})`, with no question. Do not draw a topic that a follow-up `stands` for |
| an answer marked `repeats` | same | print nothing; draw its follow-ups (filtered as any follow-up row is) under the opening bubble; the bottom row keeps the remaining topics, never one already offered |
| "Something else…" at the end of every Swap one row | same, and native's exercise picker | offered only when the Train card hands in a picker, and then for every lift (a lift with no listed alternative included). Open the ordinary picker on `e.other.group`, leaving out `e.other.exclude`, ONE tap to pick; pass the pick to `c.swapTo(currentOpts, e.from, id)` and redraw from its `opts` exactly as a listed swap does, or say "Coach can't swap that one in." with its `why`. Native's picker needs web's four options — `filter`, `exclude`, `single`, `title` — or an equivalent |
| the sheet's **Patterns** bubble, and one bubble per pattern | `src/ui/coach/sheets.jsx` | `topicsFor('you')` offers it; draw `a.more` after `a.text` |
| Pro panel | wherever native walks `PRO_ADDS` | nothing; it now names Patterns |
| Weight → Log's width | `weight.jsx` | nothing — V45 recorded native's Log as `flex: 0, minWidth: 54` already |
| Steps' Save and Water's Add | native's step and water entry rows | web's were squashed by the same inline style as Log; native's were not read — check them |

---

## 6. `settings/coach.on` and `mute.live` — the PUBLISHED rules take both; the PROPOSED ones must learn `on`

The published `database.rules.json` does not mention `coach`: `settings` has a
section-level `.write` and its only `$other` deny is inside `units`. So
`settings/coach/on` lands today. **No rules change, and none may add an
`$other` deny at the `settings` level.**

But the PROPOSED shape in `NEXT-NATIVE-V43.md` §5 ends `coach` with
`"$other": { ".validate": false }` — and has no `on`. **Publish that as it stands
and every settings/coach write from an account with Patterns on is refused**,
silently: the switch flips back and nothing says why. Add:

```json
"on": { "$cat": { ".validate": "newData.isBoolean()" } },
```

`normSettings` writes `on` only when something is in it (an empty object is
dropped by RTDB), so an account that never touched Patterns sends no `on` at all.

**The new switch's key is `settings/coach/mute/live`** (`true` when "In the gym"
is switched off; absent means on). The V43 shape validates `mute` as
`"$cat": { ".validate": "newData.isBoolean()" }`, which accepts it as it stands.
If native's PROPOSED file has since narrowed `mute` to an enumerated list of
categories, `live` must be on it — or switching the in-gym read off is refused
silently and the switch flips back.

---

## 7. The verifiers

Three new files; eleven changed.

| | |
|---|---|
| `tick-targets.mjs` | 62 checks. The real `tickSet`, `unsavedTicks` and `collectFrom`, and the real `runFinish` lifted by text: fill on w, r and both; typed values untouched; untick keeps values; the BW target; edit mode; the old bare flip shown dropping a routine's sets; the Finish sheet counting exactly the reps-less ticks, Save anyway and Go back; the block box's three pieces run with the real `tickSet`; the three `.qty-row` buttons. **The rule ports**; the harness is web-shaped. |
| `coach-live.mjs` | 52 checks. Each answer from a derived fixture with its exact sentence; DONE over another and over next; F never yielding another, across 400 generated sessions; thin history, the three-session boundary, a 5/5 split, planned and hidden exercises, every gate; every figure with a unit a logged load in the account's unit; determinism. **Ports.** |
| `coach-patterns.mjs` | 59 checks. Eight and only eight; off by default; every number of every sentence against a second reading of the definitions; both gates at their boundary; each check silent without its data; no causal word in both units; where it may appear; the extra read. **Ports**, except section G (reads `coach-data.js`). |
| `coach-pure.mjs` | + section G: `coach-live.js`'s purity. Ports. |
| `coach-units.mjs` | + H: every live line imperial and metric. + I: the four patterns that print a weight. Ports. |
| `coach-voice.mjs` | + H: the live lines under the card's ban (the nudge is unprompted). + I: the causal-word list over Patterns. Ports, except the `coach-ui.js` slice H reads. |
| `coach-silence.mjs` | + the Patterns case. Ports. |
| `coach-boot.mjs` | + G: the routines hand-off costs no read. Web-shaped. |
| `coach-surface.mjs` | + G (the chip, the sheet, Add it, the line's appear-once rule, Basic and edit see nothing), H (the Patterns switch and bubble), I (the builder's order, its question and choices, Build it straight through, the In the gym switch), J (an answer that repeats the opening, and "Something else…" end to end) and K (the real picker.js in single mode); E and F follow the question-first flow. 170 checks. **Does not port** — native wants its own, and G found an engine bug no engine verifier did. |
| `coach-build.mjs` | + K: `buildMenu` in the pure layer — the pick first and equal to the default, shapes then groups, only what builds, silent where the builder is, the two doors. + L: `swapTo` — equal to every listed alternative's opts, each refusal with its reason, the picker spec on every lift. 125 checks. Ports. |
| `coach-rank.mjs` | the builder's checks state the new order and the two doors; + I: `repeats` set exactly when the answer's text is the opening's. 83 checks. Ports. |
| `month-erasure.mjs` `merge-invariant.mjs` | Follow `runFinish`'s new collaborator and `finishWorkout(anyway)`'s signature. Web-shaped. |
| `units.mjs` | classifies `coach-live.js`'s one `fmtSetLoad` display site. |

Ten web verifiers stage `coach-live.js` beside `coach-build.js`, because
`coach.js` imports it.

---

## 8. What to run

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Both clean at rack-v46, under `TZ=America/New_York` and `TZ=UTC`: 28 verifiers,
all exit 0.

---

## 9. If the port reads one thing in this file

§3. The rest of this ship is new behaviour a port can take its time over. The
silent drop is not: on native today, a routine's set ticked without typing is a
set he did that never reaches the log. `tickSet` is ten lines with no imports.
Copy it into native's set-check handler first — and then §6, before anybody
publishes the PROPOSED rules.
