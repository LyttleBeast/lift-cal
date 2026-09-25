# Porting rack-v54 to rack-mobile

Web shipped as `rack-v54`. The tree it mirrors is `~/dev/rack-mobile`.

v54 is **Coach stage five, "in the gym"**:

- **Grey last-time numbers** on an exercise added by hand to a live session,
  and on `+ Set` after a blank set.
- **The next set, and the effort tap.** The live Coach sheet says the next
  set. He can rate the set he just did (**Way too easy**, **About right**,
  **Too hard**), stored as `rir` on that set, and Coach answers with *Use it
  for my next set*. Next session, `prescribe()` reads two of the ratings.
- **Today is a day.** A second session in a day sees what the first one
  trained.
- **The whole week.** *How's my weekly volume?* and *Is my training
  balanced?* on Train's sheet (`coach-volume.js`, new), and the focus group's
  exercises first in the builder.

The build brief is `SHIP-V54-PROMPT.md`. What was built, and every place it
departs from the brief, is in `COACH-REPORT.md` §79–§88.

**`rack-mobile` was NOT read this time.** The run was fenced to
`~/dev/ship-v54`, as the brief ordered. Where this file would have to guess a
native path, it says **the native run maps this**. The native paths it does
name are carried from `NEXT-NATIVE-V53.md` and are unverified. This file is the
delta on top of V53, so port V53 first.

**What is stored:**

- **`rir` on a set**: an integer 0–5 inside
  `workouts/{mk}/{dd}/{id}/exercises/{i}/sets/{j}`, in the one whole record
  written at Finish. It has no child write and no node of its own. The sheet
  writes 4, 2 or 0. Absent means unknown.
- **`settings/coach/asked/vol_neglect`**: epoch ms, when the neglected-group
  line was last said.
- **`tl: true` on a live set**: the grey numbers are last time's. It is live
  session state only. `collectFrom` strips it with `tw`/`tr`, so no record
  ever holds it.

`database.rules.json` and the OPTIONAL-LOCK file are byte-identical to
rack-v53: `workouts` and `settings` both carry section-level `.write`s. **But
native's PROPOSED rules may close the set node. See §10.**

**What is read:** nothing new. The same-day read uses the twelve-week window
`coach.js` already gathers, and the volume answers use the sessions it already
holds. There is nothing new at boot and nothing on a paint.

---

## ⚠ THE PINS

Unchanged since rack-v53:

```
units.js          fa6f03c9b2a097821c194af2be8e9711da5f940f3a35850d17897c77da4f6da5   unchanged since rack-v41
exercises.js      74ac8a9885376b79940daa6a184dfed14bfa4e32d2226e4e367db53dfd9d9857   unchanged
coach-tags.js     846501595feb06fddc7d85fb19ed526bc6c6cc69cecc5b7e9494eb96bd8c8a06   unchanged since rack-v42
blocks.js         1fd10b3b82aa89082dee1675120d5a39fe7c21e7f7232b1930b6ce233a1fbbaf   unchanged
coach-goal.js     6cd88a72e932ad060fe456121372dc483525ec28ca0c5d067c3aa58f41382048   unchanged since rack-v49
accounts.js       f89af13550da39c24a643ea411b8f8c820202bf605aa990aab15f2d64506d471   unchanged
tdee.js           83c2e76b71cfa2f6c8260fae807182e0682af48459bcd30b7be9eb9c4d48fe3d   unchanged
coach-ready.js    a72c1309967a36f927208402242df8469f201b0c490eae3a28346ee419f1cd6a   unchanged since rack-v52
analytics.js      6ba64c5a57ffe28ca27f6556a03ba058f97fc840ef83cece7013253858473129   unchanged since rack-v53
coach-fuel.js     36fdf21814d6b32d3ac6bb1411636fe664f1c58e569f8569d1f4c786d1bfd896   unchanged since rack-v53
```

**The files the port copies verbatim that changed, or are new:**

```
coach.js          32d64387791dcdde72fcaeb2536ea20ef7636d12a5ae056308803d09a0cade5d   CHANGED — re-copy, 5,430 lines (v53: d724f11…)
coach-prog.js     1593b84477e862253661c41aee3766ef42411c39e115378b26df5f2c0afaf0f8   CHANGED — re-copy, 1,226 lines (v53: 211d31a…, unchanged since rack-v52)
coach-live.js     6187b34678192bfa87e894f06225f3f6d6cc48a4a10cb3bec22152709972ea1e   CHANGED — re-copy, 699 lines (v53: 877528f…, unchanged since rack-v46)
coach-overlap.js  1d0d94c32d632b2fa0dd08f4e9bec4c7f83dbddbf0a2bd81743ca0dfd8a642b5   CHANGED — re-copy, 1,172 lines (v53: d81b1b5…)
coach-build.js    e13483354cba03f087d0f700f37c1c8a275ef0fa8aa81794b5d970a4ed5e93e1   CHANGED — re-copy, 758 lines (v53: 1257d46…)
coach-volume.js   077b5062e47b1adf0a060a84c2cf0962d3cb57d1123ffe0c0dda51164cc6747c   NEW — copy, 462 lines
```

`coach-volume.js` imports `exercises.js`, `analytics.js` (`isWorking`,
`mergeSessionExercises`), `coach-tags.js` and `coach-goal.js`, all already
pinned. `coach.js` imports it, and nothing imports it back.

`workout.js` is not copied verbatim, but four of its functions are pure and
belong wherever native keeps `tickSet`: `lastTargets`, `rateSet`, `useNext`,
and `tickSet` itself, which changed. The native run maps this (§6, §7).

---

## 1. `coach.js` — re-copy it

- **`liveInput()`** gains two keys (`coach.js:4750`):
  - `day`, the live session's own date key (`coach-live.js` constructs no
    Date);
  - `nextSet`, a function `(exId, sets) => …`, or `null` when targets are
    off or the log could not be read. It is lazy: the tick pays for it only
    when it is asked (§3).
- **`c.liveSet(session, { current })`** (`:5190`) returns `{ rated, next }`
  for the live sheet: the set the chips rate, and the next set. It is `null`
  for Basic, with *In the gym* off, or in an edit.
- **Re-exported:** `EFFORT`, `rateAsk`, `rateAnswer` (`:2773`), for the
  sheet.
- **The whole week:**
  - facts `group.volume` and `group.balance` (`:942`, `:948`);
  - intents `week_volume` and `balance_read` (`:2660`, `:2668`): selectors,
    category `volume`, `tier: 'pro'`, surface `sheet`;
  - responses `resp_week_volume` and `resp_balance` (`:3123`, `:3128`);
  - topics `ask_week_volume` ("How’s my weekly volume?") and `ask_balance`
    ("Is my training balanced?"), on **Train's** `pre` and `done_today`
    lists only (`WEEK_TOPICS`, `:4189`), each following up to the other.
- **`ONCE_LINES = ['vol_neglect']`** (`:5332`). `normSettings()` keeps
  `asked.vol_neglect` beside the questions' stamps (`:5357`).
- **`ask('ask_week_volume')` carries `once: 'vol_neglect'`** (`:5223`) when
  the neglect line is in the answer. The view stamps it (§8).
- `q_focus_group` now `changes` `goal_pace`, `week_volume` and
  `build_workout` (`:2113`). `builderInput()` hands the builder `focusGroup`
  (`:4740`).
- **New export `volumeInput(input)`** (`:4687`), for the battery.

## 2. `coach-prog.js` — re-copy it

- **`rir` is read and carried.** `copySet` (`:228`) keeps a valid `rir`, and
  `rirOf(s)` (`:242`) is the one reader. An integer 0–5 is a rating; anything
  else, including the string `"0"`, is unknown.
- **`decide()` reads two ratings** (`:787`):
  - a top set rated too hard at the top gives `hold`, code `hard`: the same
    again;
  - a session whose every rated set at the target is rated way too easy, with
    no F and every target rep reached, counts as the top, through the confirm
    dial, never more than one step (`easyAt`, `:819`).
  - The why says so: "Last time you rated 185 lb × 8 way too easy." / "Last
    time 185 lb × 12 felt too hard, so it’s the same again."
  - **Unrated logs get rack-v53's answer, byte for byte.**
- **Section 6, `nextSet(ex, ctx, today)`** (`:1119`), spec §3.10:
  - kinds `target`, `same`, `up`, `down`, `stop`;
  - straight sets and a loaded target only, never an assisted lift;
  - every number is the target, one of the lift's own steps above it, a load
    he has logged, or a quote of the set he just did.

## 3. `coach-live.js` — re-copy it

- The header's "NO WEIGHT, EVER" paragraph is rewritten to the new rule.
- **`dayOf()`** (`:285`): the sessions he finished earlier on the live
  session's day, read out of the window.
  - Their groups count as trained today for `switch` and `next`.
  - The same shape across two visits counts its sets together for `done`.
- **`setRead(input)`** (`:613`) is what `c.liveSet()` returns. `liveRead()`'s
  answers and short line are unchanged, so **the one quiet line under a
  finished exercise still prints no number**.
- **`EFFORT`** (`:665`): `[{ rir: 4, label: 'Way too easy' }, { rir: 2,
  label: 'About right' }, { rir: 0, label: 'Too hard' }]`, frozen.
  `rateAsk(rated, u)` (`:679`) gives "Set 3 · 185 lb × 8. How was it?", or
  "bodyweight × 10". `rateAnswer(rir, next, u)` (`:689`) gives the answer after
  a tap:
  - "Strong set.", "Good." or "Noted.", then the next set;
  - "Cleared." when the chip was tapped off;
  - "… Saved with the set." when there is no next set.
- `anotherRead` (`:473`) never says "one more set" on a lift whose next set is
  stopped. It asks for the next set last, so a tick that won't say it pays
  nothing.

## 4. `coach-overlap.js` — re-copy it

`nextSetFor(input, exId, sets, repDrop)` (`:1040`) gives the lift's next set
from the overlap's performance log and marks. `coach.js` may not import
`coach-prog.js` directly.

## 5. `coach-build.js` and `coach-volume.js`

- **`coach-build.js`** (`:565`, `:714`): with `focusGroup` set, the
  proposal's exercises of that group come first, and each side keeps his
  order.
  - Nothing is added, dropped or re-set.
  - A session with lifting blocks keeps his order whole.
  - When anything moved, the reason adds "Your focus, chest, comes first."
- **`coach-volume.js`** (new): `hardSets`, `volumeRead`, `volumeAnswer`,
  `balanceRead`, `balanceAnswer`. All are pure, and their clock is `now`. Copy
  it beside `coach.js`.

## 6. The session screen: the grey fill

Web: `workout.js:897` `newExercise`, `:906` `lastEntry`, `:917` `greyFor`,
`:929` `addSetTo` (`+ Set`), `:1486` `collectFrom`, `:1557` `lastTargets`. The
native session screen's counterparts: **the native run maps this.**

- **`lastTargets(prevSets, n)`** is pure. It takes last time's **working**
  sets (`isWorking`, reps ≥ 1) by position, and past the end last time's final
  working set again. It returns `{ tw, tr }` as stored pound strings, with no
  units call. A bodyweight `'0'` gives `tw: ''`, so the box stays blank and
  never shows "0". No working set gives `null`.
- **Last time** is the one session the "Last ·" line quotes. Web made that one
  lookup (`lastEntry`) that both read, so the two cannot disagree. Do the same.
- **Where it applies:** a hand-added exercise in a **live** session gets its
  first set's grey numbers. That covers the add button, a block's add button,
  and Coach's *Add it*, which all go through one function. `+ Set`, when the
  previous set's boxes are both blank, gives the grey numbers for its position,
  counted in non-warm-up sets.
- **Where it doesn't:** an edit of a past session; an exercise with no last
  time; an exercise already carrying a routine's or the builder's `tw`/`tr`.
  The grey sets carry `tl: true` to tell them apart: a set with `tw`/`tr` and no
  `tl` is a routine's or the builder's, and `greyFor` leaves that exercise
  alone.
- **`collectFrom` strips `tw`, `tr` and `tl`.** A tick adopts the grey numbers
  by the shipped `tickSet` rule, and a typed box is never overwritten.
- **In kilos** the placeholder prints converted (185 lb shows 83.9), and the
  set still holds `'185'`: one conversion, at the box.

## 7. The rating: the data, and THE TRAP

Web: `workout.js:1526` `tickSet`, `:1581` `rateSet`, `:1594` `useNext`, `:771`
`editWorkout`, `:952` `rateLive`, `:960` `useNextLive`, `:966` `liveOpts`.

- **`rateSet(s, rir)`**: an integer 0–5 sets `rir`, and anything else
  **deletes the key**, never writing null.
- **`tickSet`: unticking deletes `rir`** (`:1530`). A rating is of a set that
  was done.
- **`useNext(exercises, at, t)`** writes `tw`/`tr` on the next unticked set of
  that exercise after the rated one, skipping warm-ups and drop sets. That
  includes a later copy in a duplicated block. It removes `tl`. With none left,
  it appends `{ w: '', r: '', type: 'N', done: false, tw, tr }`. **It never
  writes `w` or `r`.**
- **Native's `saveEdit` must carry `rir` through unchanged.** Web's
  `editWorkout` copies it onto the edit's sets, and `collectFrom` spreads it to
  the rebuilt record. **Without that, editing a workout silently erases its
  ratings**, the same trap v53's `feel` had. Prove open → save → open, as
  `effort.mjs` B does.
- **Every native site that builds a set from another set must build it
  fresh**, with no `rir`. Web's list, each checked in `effort.mjs` C:
  - `dupSet` (duplicating a block);
  - `+ Set`;
  - starting a routine, which builds `{ w, r, type, done, tw, tr }`;
  - saving a session as a routine and the routine editor, which build
    `{ tw, tr, type }`;
  - the builder's ghost sets.

  Native's own list of these sites: **the native run maps this.**
- **The history index stays `{ w, r, type }`.** `rir`'s one reader is
  `prescribe()`, and it reads the record.
- **Old records have no `rir`**, nothing migrates, and absent is never 0.

## 8. The live sheet

Web: `coach-ui.js:1195` `openLiveSheet`, with the rows at `:1214`–`:1284`;
`rack.css:2136`–`:2140`. Native's live sheet: **the native run maps this.**

Top to bottom:

1. His question, and `c.live()`'s answer, as before, "done" first. **When
   there is no habit answer and there is a next set, the next set is the
   answer**, never "Nothing Coach can add…" above a number.
2. **The next set** (`c.liveSet().next.text`, e.g. "Next set: 190 lb × 8."),
   when there is one. Its `why` follows the answer's behind the same *Why?*
   chip. When Why? opens, the rating rows move back below the reasons.
3. **`rateAsk(rated, u)`** and three chips from `EFFORT`, when
   `c.liveSet().rated` is set (the exercise in hand has a ticked working set).
   - The chosen chip reads as chosen (`aria-pressed`).
   - Every chip is **44px or taller**.
   - A tap calls the screen's `rate({ exIdx, setIdx }, rir)`; the chosen chip
     tapped again calls it with `null`.
4. **After a tap:** read `c.liveSet()` again and show `rateAnswer(rir, next,
   u)`. When there is a next set, also show one button, **Use it for my next
   set**, which closes the sheet and calls `useNext(at, { tw: next.tw, tr:
   next.tr })`.
5. *Add it* and *Close*, as before.

- Coach never writes the session itself. `rate` and `useNext` are callbacks
  the session screen hands in, the way it hands in *Add it*, for a **live**
  session only. The screen repaints after each.
- Nothing pops up. There is no prompt after a tick, and nothing on the set
  row.
- With targets off there is no next set and the chips still rate. An edit
  gets no chip. Basic gets no chip.

## 9. The COACH ME sheet and the gatherer

- **A `once` answer is stamped as it is drawn.** Web's `coach-ui.js:382`:
  `if (a && a.once) markAsked(a.once)`. `markAsked(id)` patches
  `settings/coach/asked/{id}` with `Date.now()`, the same writer the questions
  use. Native's topic-tap handler: **the native run maps this.**
- The two new topics appear on Train's sheet by themselves if native's sheet
  walks `topicsFor('train')`. Their answers are `text`, `reason` and `more[]`
  like every other, and can be seven bubbles long.
- **Nothing new in `coachInput()`.** No new reads.

## 10. The PROPOSED rules

The published rules take everything: `workouts` and `settings` carry
section-level `.write`s.

**Web cannot see native's rules.** If native's
`web-patches/database.rules.PROPOSED.json` validates the set node under
`workouts/$mk/$dd/$sid/exercises/$i/sets/$j` and closes it with `"$other": {
".validate": false }`, **every rated set is refused**, and with it the whole
record at Finish. Add `rir` through `tools/rules/build.mjs` and prove it:

```json
"rir": { ".validate": "newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= 0 && newData.val() <= 5" }
```

- **A set without `rir` must still pass.** It is optional, and every record
  before v54 lacks it.
- The whole-month writes (`saveEdit`) carry `rir` inside each record, so the
  same rule validates it there.
- `settings/coach/asked/vol_neglect` is a number. If native's `asked` rule
  enumerates the question ids rather than taking any `$q`, add
  `vol_neglect`.
- `tl` never reaches the database.

**PROPOSED, not published.** Micah publishes rules; nothing here does.

## 11. The verifiers

Three new ones, and several changed on purpose, each with its reason in
place. Counts are checks passed at rack-v54.

| | |
|---|---|
| `coach-volume.mjs` | NEW, 83 checks. Battery **ok 40, miss 0, wrong 0**: bands, flags, the disguise rule's three conditions each alone, fractional counting, customs and the 25% skip, core, neglect and its stamp, the focus raise, a cut, balance, a thin log. Also the sheet-only checks, the builder's focus rows, a 300-history sweep, and the must-never-say scan in lb and kg. **Ports**, re-pointed at native's pure copies |
| `effort.mjs` | NEW, 48 checks. The data path, `saveEdit` keeping `rir`, untick, the copy sites, *Use it*, and the chips' gates. The engine checks port; the write checks drive web's `workout.js` and need re-pointing |
| `grey-last.mjs` | NEW, 36 checks. `lastTargets`, `newExercise`, `+ Set`, edit mode, the tick, kilos. Web's session screen: **re-point it** |
| `coach-prog.mjs` | + F: ratings **16/0/0** and a sweep. The 57 rows are unchanged, and unrated answers are byte for byte v53's. **Ports** |
| `coach-live.mjs` | E: the fence replaced (a quote or a target, nothing heavier after a stop, one step a session, both units). + H, the next set rule by rule; + I, two sessions in a day. **Ports** |
| `coach-surface.mjs` | + O, the live sheet's order; + P, the week's answers on Train and the stamp; G on a targets-off account |
| `coach-voice.mjs` | + N, every in-gym sentence; + O, every volume and balance sentence |
| `tick-targets.mjs` | + I: an untick deletes `rir` |
| `touch-target.mjs` | the three chips, 44px at 390 and 320 wide |
| `coach-pure`, `coach-rank`, `coach-state`, `units`, `blocks`, and every verifier that stages `coach.js` | changed deliberately, each with its reason in place |

The held batteries did not move: `coach-overlap` 24/0/0, `coach-ready`
46/0/0, `coach-fuel` 16/0/0, `finish` 12/0/0, `coach-prog`'s original 57/0/0.

## 12. What to run

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Both are clean at rack-v54 under `TZ=America/New_York`, `UTC` and
`Pacific/Auckland`: 46 verifiers, all exit 0 (43 at rack-v53).

## 13. If the port reads one thing in this file

§7. **A rating belongs to the set that was done.** Copy a set and the copy
must not carry it. Rebuild a record and the rebuild must carry it. And if the
PROPOSED rules close the set node, `rir` must be added before the effort tap
ships, or the first rated workout's Finish is refused whole.
