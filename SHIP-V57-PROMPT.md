# SHIP-V57-PROMPT.md: three truths and a faster You tab (rack-v57)

Commissioned 25 Sep 2026, evening. This is the build brief for one Claude Code
run in `~/dev/ship-v57`, a fenced clone of lift-cal at `04e87cc` (**rack-v56**,
live). Nobody is watching. Micah reads your summary before he pushes.

## 0. Ground rules

- **No push, deploy or publish.** No `git push`, `wrangler`, `firebase`, `eas`,
  `gh`, `gh-pages`. Commit through the hooks, never `--no-verify`.
- `echo GUARDTEST ping` must be refused. If it runs, stop.
- **Reads and writes go through Read/Edit/Write and Grep.** Bash runs node,
  the verifiers and read-only git. No `sed`, `awk`, `cat`, `wc`, heredocs
  (commit messages go through `git commit -F` of a file you wrote with Write,
  or `-m`), `tee`, or `git clone`.
- **Never open `~/dev/rack-mobile`, `~/dev/rack-worker`, `~/dev/rack-food`,
  `~/live`, or any other `~/dev/ship-v*`.**
- `database.rules.json` is not changed by one byte.
- `~/dev/ship-v57` must be a full clone at `04e87cc`. If it isn't, stop.
- A stale lock in `.git`, or anything there you didn't make: stop. Delete
  nothing.

**Micah's rules:**

- **A wrong number is worse than no number.** A sentence that says something
  untrue is the same failure.
- **Web first, native is the destination.** Everything that changes gets a
  line in `NEXT-NATIVE-V57.md`.
- Add no gate and remove none. The paywall ship does that.

**Read first:**

- `CLAUDE.md`, `AGENTS.md`, `BACKLOG.md` (v56's section), `COACH-REPORT.md`
  §95–§101;
- the code each phase names.

**Count the verifiers** and run all of them in the three time zones before
changing anything. **Commit per phase.**

---

## A. Rear-delt flyes are pulling, not pushing

Micah walked *Is my training balanced?* on 25 Sep: "131 pushing sets, 33
pulling sets". He agrees he pushes a lot. Cowork read `coach-tags.js` and
`coach-volume.js` and found a real miscount:

- `dumbbell-rear-delt-flye`, `cable-rear-delt-flye` and `reverse-pec-deck`
  are tagged `fly` on **shoulders**.
- `coach-volume.js` (~line 219) counts every `press`, `fly` or `extension` on
  chest, shoulders or arms as **push**.

So a rear-delt fly (horizontal abduction, a pulling motion) is counted as
pushing.

**The fix:**

- Count rear-delt flyes and reverse pec deck as **pull** in push : pull, and
  in horizontal pull if that's what the spec's pieces say. Do it in the
  smallest way that keeps `coach-tags.js`'s fifteen-word vocabulary closed.
  For example, one exported, verifier-checked list of rear-delt ids that
  `coach-volume.js` reads, or a `dir` field in the sidecar. Say which you
  chose and why.
- **Go through every built-in row** and list any other exercise whose push or
  pull direction the current rule gets wrong: face pulls, upright rows,
  pullovers, shrugs, and anything else you find. Fix what's wrong, with a
  verifier row each.
- **Custom exercises:** if a custom exercise's Movement is `fly` on shoulders,
  the editor asks one more question, "Front or rear?", or offers "Rear-delt
  fly" as its own choice. Pick the simpler one for him and say which.
- The `coach-volume` battery gains rows, and every old row either holds or
  explains its move.

## B. The Fuel note says something true

Micah's Fuel tab on 25 Sep: target **3,470**, "maint 3,220 est." (measured),
and under it: *"Your target is at or below your measured maintenance, so
eating to it holds rather than bulks."* 3,470 is **250 above** 3,220, so the
sentence is false as written.

- **What the code does** (`food.js:814`): for a gain goal it fires when
  `targets.cal <= z.gainFrom`, the top of the **holding band**, not
  maintenance. So the condition is "your target sits inside the band the bar
  paints as holding", and the words say something else.
- **Fix the words** so they're true and name the numbers. For example: "Your
  target, 3,470, sits inside your holding range (3,220 ± 260), so eating to it
  holds rather than bulks." Do the same for the cut branch. The fix button
  below it stays.
- **Report the band** in `BACKLOG.md` and your summary, in plain words:
  - how `z.band` is worked out (`tdee.js` or wherever it lives);
  - its width at his maintenance;
  - what a +250 kcal/day target means against it.

  Whether the holding band is too wide for someone bulking is **Micah's
  decision**. Don't change the band. Say exactly which screens would move if
  he changed it: the Fuel bar, the Weight tab's rate colour, insights.
- **Verifier:** extend `maintenance.mjs` (or the verifier that covers the
  calorie bar) with his exact case (maintenance 3,220, target 3,470, gain
  goal) and assert the sentence it prints is true of the numbers.

## C. The movement tip names the path

v56's balance answer says "You can set the movement of a custom exercise in its
settings". Name the real path, as the app's own labels spell it (for example
"Train → Exercises → tap it → Movement"). Check the labels in `workout.js` and
`picker.js`. Don't guess.

## D. The You tab's GETs

`BACKLOG.md` (v42 onward): "The You tab issues around seven live GETs per
render … the thing worth attacking before anything else is added to that
screen."

- **Measure first:** count the GETs per You-tab render at `04e87cc` with a spy
  on `store.js`'s read, as `coach-boot.mjs` spies on reads.
- **Cut them** to what a render actually needs: read once per app open, or per
  change, the way `coach-data.js` gathers once per open. Keep every number on
  the screen identical. Prove it by rendering the You tab before and after on
  the same fixture and diffing the text.
- **A write elsewhere must still show on You** without a reload. Prove it
  with a spy.
- **Verifier:** new `tools-check/you-reads.mjs`, with the count pinned.

---

## Finish

- **`rack-v57`**, as its own commit (`sw.js`, `usage.js`).
- **The docs last:**
  - `NEXT-NATIVE-V57.md`;
  - `BACKLOG.md` (v57);
  - `COACH-REPORT.md` §102 onward, for Phase A.
- **Your summary to Micah:** plain words first, then green (counts before and
  after), new, listed-not-fixed, unsure. **The band explanation from Phase B
  goes in the summary itself**, in two or three sentences he can decide from.
- **His push command**, in Terminal tab 2 at `~/dev/ship-v57`:

      git push --no-verify origin main

- **His walkthrough** on the website, once `sw.js` says `rack-v57`:
  1. *Is my training balanced?*: the pushing count is lower and the pulling
     count higher by his rear-delt and reverse pec deck sets.
  2. Fuel: the note under the bar is true of the numbers beside it.
  3. The movement tip names the path.
  4. The You tab looks exactly the same.
