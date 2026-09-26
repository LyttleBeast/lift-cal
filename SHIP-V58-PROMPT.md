# SHIP-V58-PROMPT.md: the rows line up, the bulk reads as a bulk (rack-v58)

Commissioned 25 Sep 2026, evening. This is the build brief for one Claude Code
run in `~/dev/ship-v58`, a fenced clone of lift-cal at `a043699` (**rack-v57**,
live). Nobody is watching. Micah reads your summary before he pushes.

## 0. Ground rules

- **No push, deploy or publish.** No `git push`, `wrangler`, `firebase`, `eas`,
  `gh`, `gh-pages`. Commit through the hooks, never `--no-verify`.
- `echo GUARDTEST ping` must be refused. If it runs, stop.
- Reads and writes go through Read/Edit/Write/Grep. Bash runs node, the
  verifiers and read-only git. **No `sed`, `awk`, `cat`, `wc`, pipes into
  `grep`/`head`/`tail`, heredocs, `tee`, or `git clone`.** Commit messages go
  through `-m`, or `-F` with a file you wrote with Write.
- Never open `~/dev/rack-mobile`, `~/dev/rack-worker`, `~/dev/rack-food`,
  `~/live`, or any other `~/dev/ship-v*`.
- `database.rules.json` is unchanged by one byte.
- The clone must be at `a043699`, or stop. A stale lock in `.git`: stop.
  Delete nothing.

**Micah's rules:**

- A wrong number, or an untrue sentence, is worse than none.
- Web first. Everything that changes gets a line in `NEXT-NATIVE-V58.md`.
- Add no gate and remove none.

Read `CLAUDE.md`, `AGENTS.md`, `BACKLOG.md` (v57's section), and the code
each phase names. **Count the verifiers** and run all of them in the three
time zones first. **Commit per phase.**

---

## A. The estimate rows line up

Micah, on 25 Sep, looking at the estimate result on his phone: "the ui is a
little off with the calories, they are a little high".

- **What's happening:** on each row, the calorie number (for example "270")
  lines up with the **top** of the food's name, while **Save** and **×** are
  **centred** on the whole row. So the number sits visibly above the row's two
  controls.
- **The fix:** the calorie number, Save and × sit on **one centre line**,
  centred on the row. Apply it to every place the same row is drawn:
  - the estimate result;
  - "Found in your log";
  - the "Which one?" result;
  - the meal builder's rows, if they share the layout.
- **Long names:** "White rice, long-grain, enriched, coo…" is cut after one
  line. Let the name wrap to **two lines** before it ellipsizes, and keep the
  number and the controls centred.
- Nothing may overlap at 320 px or 390 px. Extend `touch-target.mjs` (Save and
  × stay 44 px or taller) and its snapshot.

## B. The holding band: ±200, so a bulk reads as a bulk

v57's summary explained it. The holding band is 8% of maintenance, rounded to
25 and **capped at 250**. Rack's own **Bulking** target is maintenance +250,
so for anyone whose maintenance is 2,970 or more, the app's own bulk target
lands on the band's edge and the bar calls it **holding**. Micah is bulking
(maintenance 3,220, target 3,470) and saw exactly that.

**His decision (made by Cowork on his standing instruction, and his to
reverse):** cap the band at **200**.

- Change the cap in `tdee.js` (pinned, and native copies it verbatim), so the
  Bulking and Cutting targets always land in their own colour. Keep the 8% and
  the rounding.
- **Every screen that reads the band moves together**, as v57 listed:
  - the Fuel bar;
  - the note under it;
  - the "Reading the bar" sheet (it still says the yellow band "holds your
    weight". Make that sentence true and plain);
  - Settings → Goal.
- The Weight tab's rate colour and insights use their own 0.5 lb/week
  threshold, and don't move. Confirm it.
- **Micah's case:** maintenance 3,220 and target 3,470 reads as **bulking**,
  and the note doesn't fire. Pin it in `maintenance.mjs` or the calorie-bar
  verifier, with the before and after, and list any other maintenance where a
  preset target's colour changes.

## C. The long USDA names, shown short

The Worker is getting a change in parallel (`rack-worker`
`tools/FOOD4-PROMPT.md`). **You can't see it. This is the contract:**

- A generic row's `name` becomes a short everyday name, like "White rice",
  "Whole wheat toast" or "Sirloin steak".
- The full USDA description moves to a new optional field, `src.desc`, for
  example "Beef, steak, sirloin, NS as to fat eaten".
- Both fields are additive. An older answer, or a cached one, has no
  `src.desc`, and its `name` is the long one.

**The client half:**

- **Show `src.desc`** where a person would look for "which USDA row is this?":
  in the row's tap-to-edit sheet, as a small line under the name ("USDA:
  <desc>"). Only when it's present.
- **Nothing else changes**: the logged entry's name is whatever `name` says.
  `recall.js` keys on what was typed, not on names. Confirm it.
- **Test against fixtures** with and without `src.desc`.

## D. Small leftovers from v57

- `README.md`'s "the big number is the deficit" is out of date. Make it
  true.
- Curls count as neither push nor pull, while triceps extensions count as
  pushing. That's the spec's rule, and it stays. Add one line to *Is my
  training balanced?*'s grey reason: "Curls and other arm isolation aren't
  counted as push or pull." Only if it's true of the code.

---

## Finish

- **`rack-v58`**, as its own commit.
- **The docs last:** `NEXT-NATIVE-V58.md` (with `tdee.js`'s new pin), and
  `BACKLOG.md` (v58).
- **Your summary to Micah:** plain words first, then green (counts before and
  after), new, listed-not-fixed, unsure. If anything is red, say so at the
  top.
- **His push command**, in Terminal tab 2 at `~/dev/ship-v58`:

      git push --no-verify origin main

- **His walkthrough** on the website, once `sw.js` says `rack-v58`:
  1. Log food and describe something. On the result, each row's calorie
     number is level with Save and ×, and a long name gets two lines.
  2. Fuel: his target, 3,470, sits in the **gain** colour, and the note under
     the bar is gone.
  3. The "Reading the bar" sheet's sentences are true.
  4. After the Worker's change is live: "8 oz steak" → Sirloin reads "Sirloin
     steak", and tapping the row shows the USDA name.
