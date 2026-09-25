# SHIP-V56-PROMPT.md: the week, read right, and custom exercises that count (rack-v56)

Commissioned 25 Sep 2026. This is the build brief for one Claude Code run in
`~/dev/ship-v56`, a fenced clone of lift-cal at `f2ba45e` (**rack-v55**,
live). Nobody is watching. Micah reads your summary before he pushes.

---

## 0. Ground rules

**You do not push, deploy or publish.**

- No `git push`, `wrangler`, `firebase`, `eas`, `gh` or `gh-pages`.
- Commit through the hooks. Never use `--no-verify`.
- `echo GUARDTEST ping` must be refused. If it runs, stop.
- Reads and writes go through Read/Edit/Write. Bash runs node, the verifiers
  and read-only git. **No `sed` (not even `sed -n`), no `cat`, no heredocs, no
  `tee`, no `wc`/`ls` loops to read files.** Every run so far has slipped on
  one of these. Use Read and Grep.
- **Never open `~/dev/rack-mobile`, `~/dev/rack-worker`, `~/dev/rack-food`,
  `~/live`, or any other `~/dev/ship-v*`.** A native run and a Worker run are
  going now.
- `database.rules.json` is not changed by one byte.
- `~/dev/ship-v56` must be a full clone at `f2ba45e`. If it isn't, stop.
- A stale lock in `.git`, or anything there you didn't make: stop. Delete
  nothing.

**Micah's rules:**

- **A wrong number is worse than no number.**
- **Web is the guinea pig, native is the destination.** Pure logic goes where
  the port copies it, and `NEXT-NATIVE-V56.md` says what native must do.
- **Pro and Basic are scrapped.** Add no gate and remove none. The paywall
  ship does that.
- **No health reasons, ever**, in any volume or balance sentence.

## 1. What this ship is

On 25 Sep, Micah walked v54's week answers on his phone
(`rack-v1054`). Cowork read them against his log. Both are right, but they
read weaker than they should:

- **"Is my training balanced?" says nothing about push vs pull.** More than a
  quarter of his arm work is custom exercises, so §6.5's "skip that group's
  ratios" skipped arms. That took push : pull down with it, because push
  includes arm extensions. What he saw: "Nothing lopsided in the last 8
  weeks", a knee : hip line, "33 sets on your custom exercises aren't in this
  split", and "Your arms work is more than a quarter custom exercises, so
  Coach leaves its split out."
- **The wording:** "Over 8 weeks: 37 squat and lunge and 36 hinge and bridge
  sets." has two "and"s.
- **"How's my weekly volume?"** uses the strength band 6–15 for **every**
  group. That was v54's departure 3, because `coach-goal.js`'s floor didn't
  know which groups carry the main lifts. So Back 21.5 and Arms 16 read
  "above 6–15, a common range for strength". The spec (§6.2) says 6–15 "for
  the groups carrying the main lifts".

v55's own leftovers (`BACKLOG.md`, "What v55 left open"):

- `+ Set` after a drop set copies the last drop's numbers (95×5);
- Coach's "Last time…" quotes say "drop set" on every row of one;
- the routine editor draws drop sets flat and has no `+ Drop`;
- "Found in your log" has no Save as meal.

**Read first:**

- `CLAUDE.md`, `AGENTS.md`, `BACKLOG.md`, `COACH-REPORT.md` §79–§94, and
  `COACH-TRAINER-SPEC.md` §6 and §8.2;
- the code: `coach-volume.js`, `coach-tags.js`, `coach-goal.js` (the dials and
  the main lifts), `picker.js` (custom exercises: `exercises/custom`, `{ id,
  name, group, equipment }`), `routines.js`, `workout.js` (`+ Set`, the drop
  functions), `analytics.js` (`setsText`, `dropHeads`), `coach-live.js` and
  `coach.js` (the "Last time" quote), and `food.js` (the "Found in your log"
  sheet, and `saveAsMeal`).

**Count the verifiers** and run all of them in New York, UTC and Auckland
before changing anything. **Commit per phase.** Every phase leaves everything
green.

---

## 2. Phase A: the week, read right

1. **Push : pull without the arms, when the arms are skipped.**
   - When a group is skipped for customs, leave **that group's sets** out of a
     cross-group ratio. Don't drop the whole ratio.
   - Push : pull is still stated from chest, shoulders and back, and the
     readout says what was left out: "Over 8 weeks: 64 pressing sets, 30
     pulling sets. Arms aren't in this, because a quarter of them are custom
     exercises."
   - The 2 : 1 bar applies to what's counted.
   - Horizontal : vertical press and pull are unchanged.
2. **The wording:** "Over 8 weeks: 37 squat and lunge sets, 36 hinge and
   bridge sets." Apply the same fix to every readout that joins two pattern
   families. `coach-voice` gets a check that no readout has two "and"s joining
   its counts.
3. **The strength band, per group.**
   - Find the groups that carry the main lifts from the code, not by guessing:
     the lifts `coach-goal.js` or `coach-prog.js` treat as the aim's main
     lifts, mapped through `exercises.js` to their primary groups.
   - Those groups get 6–15 under Get stronger and Powerlifting.
   - Every other group gets the common range, 10–20 (spec §6.2's middle row).
   - The answer names the band it used, as it does now.
   - List which groups got which band for each aim in `COACH-REPORT.md`, and
     say whether Micah's Back reading changes.
   - The `coach-volume` battery gains rows for it, and the old 40 rows stay
     40/0/0 or explain every move.

## 3. Phase B: set the movement of a custom exercise

`coach-tags.js` says custom exercises get no tags, "and that is not an
omission". Micah has 33 sets a fortnight on customs, so the balance readout
can't see a real share of his training. **Let him tell Coach the movement.**
This is optional, and a custom exercise without it behaves exactly as today.

- **In the custom exercise's editor** (new and edit, in `picker.js`), add an
  optional **Movement** picker:
  - "Not set" (the default);
  - plain labels for `coach-tags.js`'s `PATTERNS`, limited to the patterns
    `coach-tags.js` allows on that exercise's primary group (its
    group-to-pattern table);
  - and an **angle** where that pattern has one (flat, incline, decline,
    overhead).
  - 44px chips, holding at 320px.
- **Stored on the custom exercise itself:** `exercises/custom[i].pattern` and
  `.angle`, both optional and each from the closed vocabularies. Absent means
  today's meaning. No migration. The write goes through the existing
  `exercises/custom` whole-array write, so check the write guard and the
  refused-write path, as `destructive-write.mjs` and `refused-write.mjs` do.
- **`patternOf()` / the tag read** returns a custom exercise's own pattern and
  angle when set. **Built-in tags are untouched** and stay pinned.
- **What reads it:** `coach-volume.js`'s balance ratios and the custom share.
  A custom exercise with a movement **counts in the split** and **not** in "N
  sets on your custom exercises aren't in this split".
  - **The builder and the picker don't change** what they suggest because of
    it tonight. Say so. Suggesting customs by movement is its own decision.
- **The balance answer points him at it,** once, when customs are what's
  hiding a split: "You can set the movement of a custom exercise in its
  settings, and Coach will count it." Stamp it in `asked` like `vol_neglect`,
  so it's said once per 28 days.
- **Verifier:** new `tools-check/custom-movement.mjs`:
  - the editor writes only valid values;
  - a pattern disallowed on the group is refused;
  - absent is today's behaviour;
  - a custom exercise with a pattern moves from "not in this split" into the
    ratio;
  - the whole-array write keeps every other custom exercise byte-identical.
- **`NEXT-NATIVE-V56.md`:** give the shape for native's PROPOSED rules on
  `exercises/custom/$i` (optional `pattern` and `angle`, each an enum).

## 4. Phase C: v55's leftovers

1. **`+ Set` after a drop set** copies **the drop set's first set** (the one
   he changed to D) as a **normal** set (`type: 'N'`, no `dp`). It never copies
   the last drop.
2. **Coach's "Last time…" quotes** print a drop set once, as a group: "185×8
   → 135×6 → 95×5, a drop set". Go through `setsText`, so there's one rule.
3. **The routine editor** draws drop sets grouped, the same `↳` rows as the
   session screen, with **+ Drop**. Starting the routine keeps the groups.
4. **"Found in your log"** gets **Save as meal**, through the same
   `saveAsMeal` path and the same save-only builder.

Each gets checks in the matching verifier (`drop-sets.mjs`,
`save-as-meal.mjs`).

---

## 5. The voice

- Plain and warm.
- Never "AI" in Coach.
- No health or posture words.
- No exclamation marks.
- Counts, not verdicts, in balance readouts.

## 6. The verifiers

- **New:** `custom-movement.mjs`.
- **Changed on purpose, each with its reason in place:**
  - `coach-volume` (Phase A rows);
  - `coach-voice`;
  - `drop-sets`;
  - `save-as-meal`;
  - `touch-target` (the Movement chips);
  - `coach-tags`, only if the tag read's signature changed, and never the
    pinned built-in table.
- **Batteries held:**
  - `coach-prog` 57 + 16;
  - `coach-overlap` 24;
  - `coach-ready` 46;
  - `coach-fuel` 16;
  - `finish` 12;

  all /0/0. `coach-volume` is 40 + the new rows, and every old row either
  unchanged or explained.
- **Every verifier exits 0** in all three time zones. Report the count before
  and after.

## 7. Docs and the handoff

- **`NEXT-NATIVE-V56.md`**, in V55's shape:
  - the pins of every pure module changed;
  - every web file:line changed, and what native must do. Where you'd be
    guessing a native path, write "the native run maps this";
  - the custom-exercise shape and its rule.
- **`COACH-REPORT.md` §95 onward**, with the band table and the before and
  after of Micah's two answers, if you can reconstruct them from the shapes
  in `coach-volume.mjs`'s personas.
- **`BACKLOG.md`:** a v56 section.

## 8. Finish

- **`rack-v56`**, as its own commit: `sw.js` and `usage.js`.
- **The docs last.**
- **Your summary to Micah**, plain words first:
  - what he'll see;
  - then green (counts before and after);
  - new;
  - listed and not fixed;
  - unsure.

  If anything is red, say so at the top.
- **His push command**, in Terminal tab 2 at `~/dev/ship-v56`:

      git push --no-verify origin main

- **His walkthrough** on the website, once `sw.js` says `rack-v56`:
  1. Train → COACH ME → More → *Is my training balanced?*: a push vs pull line
     from chest, shoulders and back, and the note that arms aren't in it. The
     knee : hip line reads "37 squat and lunge sets, 36 hinge and bridge
     sets".
  2. *How's my weekly volume?*: arms (and any group without a main lift) is
     measured against 10–20.
  3. Open one of his custom exercises, and set its Movement. Ask *Is my
     training balanced?* again, and its sets now count.
  4. In a workout: a drop set, then `+ Set`, gives a normal set at the drop
     set's first numbers.
  5. Routines → edit one → a drop set shows grouped with `+ Drop`.
  6. Log food with a sentence he's logged before → "Found in your log" →
     *Save as meal* is there. Cancel.

## 9. Not in this ship

- The paywall.
- Account deletion. It's its own careful ship, next.
- The type box.
- Singles targets.
- Anything in native, the Worker or the published rules.
