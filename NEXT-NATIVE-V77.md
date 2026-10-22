# Porting rack-v77 (the card line fits at 320 points) to rack-mobile

rack-v77 is a words-only ship. PORT-V71-REPORT.md §5 found card lines that
run to three lines on a 320-point phone at an accessibility text size, where
the card allows two and iOS ends them with "…". v77 shortens every card line
the words fix to a character budget that, in native's own arithmetic, always
fits, and adds a verifier that holds the words to it. Nothing in the engine's
behaviour changed: every id, gate, pool, rotation and fact is what it was. The
build string is `rack-v77`. `SHIP-V77-SUMMARY.md` has the why.

**Rules: nothing published.** `database.rules.json` and
`database.rules.OPTIONAL-LOCK.json` are byte-identical to rack-v76.

## 1. The pure file, verbatim

One pinned file moved. Copy it byte for byte into `src/pure/` and move its pin:

| file | sha256 | what changed |
|---|---|---|
| `coach.js` | `adf9b791ae6fea56fdfef15fa6106d96a176f3306b235a29427e9714c133bef8` | `CARD_LINE_CHARS = 44` (new export, beside `fitsCard()`, which is unchanged); ten sentences shortened (§3) |

Every other pure file is unchanged from rack-v76.

## 2. The budget, and where it came from

The box: native caps card text at 1.6× (`CARD_MAX_SCALE`), so every
accessibility size draws the card line in the same box — 320 − 2 × (16 + 14 +
1) = **258 points wide, 14 × 1.6 = 22.4 points**, two lines (`cardLayout()`'s
`lines.line` on both You and Train).

The measurement: every line `tools-check/card-fit.mjs` renders — 2,228
distinct strings: every BACK_LINES row over 12–400 days away, before and after
the session back, with and without an earlier gap; every REST_LINES row, rest
and lighter, runs of 0–30; WARM on all seven weekdays; the six card states over
0–50 sessions and 1–50 locked findings; every hype line with no lift name over
its numbers in both units; and coach-ui.js's half-loaded line — through
`coach-view.js` `cardLayout()` + `textLines()` (Archivo's advances,
`FIT_SLACK`), You and Train, at 320 and 375 points.

Before v77:

- longest line that fitted two lines: **47** characters ("Three days
  straight. A rest day is well earned.");
- shortest line that did not: **45** ("3 sessions in seven days, most in five
  weeks." — `hype_week_best`, which the v71 report's sweep never drew: digits
  are wide in Archivo and the break falls after "five");
- nothing of **44** characters or fewer ran over.

A character count is not a width, so 45–47 is an overlap and the budget is the
largest count below it: **44**. After v77 the same sweep finds 0 lines over two
lines at 320 or 375, and the longest is 44 characters.

## 3. The sentences, old → new

| id | where | old | new |
|---|---|---|---|
| `back_time_off` | BACK_LINES | Time off is part of training. The log knows that. | Time off is part of training. I know that. |
| `back_here` | BACK_LINES | Whatever the break was for, it’s over, and you’re here. | Whatever the break was for, you’re here now. |
| `back_rested` | BACK_LINES | Your groups are fully rested. A good starting point. | Your groups are fully rested. A good start. |
| `back_before` | BACK_LINES | You’ve come back from a gap before. It’s in the log. | You came back from a gap like this before. |
| `back_first` | BACK_LINES | The first session back reads as a first session. | The first one back reads as a first session. |
| `back_page` | BACK_LINES | A fresh page, and the old ones are all there. | A fresh page. The old ones are all there. |
| `rest_three` | REST_LINES | Three days straight. A rest day is well earned. | Three in a row. A rest day is well earned. |
| `rest_asking` | REST_LINES | Nothing in your log asks for a session today. | Nothing in your log asks for training today. |
| `hype_week_best` | HYPE | {n} sessions in seven days, most in five weeks. | {n} sessions in seven days, a five-week high. |
| `hype_recovery` | HYPE | {Three…Ten / n} straight days. A rest day is well earned. | {Three…Ten / n} days on. A rest day is well earned. |
| half-loaded line | web `coach-ui.js` (native `coach-view.js` `halfLine`) | Your training is in. Food and weight have not landed yet. | Training is in. Food and weight are loading. |

`back_before`'s "like this" is the gate's own fact (`priorGapOf()`: an earlier
gap of twelve days or more). `hype_recovery` keeps decision #16's sentence, "A
rest day is well earned."; only the count in front of it is shorter.
`hype_week_best`'s "a five-week high" is `session.weekBest`'s own gate — more
than each of the four seven-day blocks before, five weeks in all.

## 4. What native must do

1. **Copy `coach.js` byte for byte** into `src/pure/coach.js` and move its pin
   (`tools/verify-*-verbatim.mjs`) to the sha256 in §1.
2. **`src/pure/coach-view.js` `halfLine`** (line ~82): `'Training is in. Food
   and weight are loading.'` — web's coach-ui.js string, which native keeps in
   its own view file. The reason line beside it is unchanged.
3. **Port `tools-check/card-fit.mjs`** as `tools/verify-card-fit.mjs`, staged
   through `tools/lib/load-pure.mjs`: sections A–D and F read the pure
   `coach.js` exactly as web's do; E reads `coach-view.js`'s `halfLine` in
   place of coach-ui.js's source. **Add the width check web cannot make**:
   run every line it renders through `cardLayout()` + `textLines()` at
   `CARD_NARROWEST` and 3.571× (You and Train) and fail on any that needs more
   than `lines.line`. The character budget is the fence for the words; Archivo
   is the authority, and that check is what catches a 44-character line of
   wide letters.
4. **Update the string snapshots that quote a changed line**:
   - `tools/verify-coach-hype.mjs` ~458, the comment "most in five weeks" →
     "a five-week high" (web's `coach-hype.mjs` changed the same comment). Its
     check at ~356 names "A rest day is well earned", which is unchanged.
   - `tools/verify-coach-surface.mjs` ~372, the comment quoting "most in five
     weeks" → "a five-week high".
   - Any coach-view render snapshot that drew the half-loaded line or one of
     the rows above (grep for the old strings in §3; at rack-v76's tree only
     the three files named here quote them).
5. **The build string** — `rack-v77`; bump `ios.buildNumber` and Admin's
   `rack-v10NN` the way every port does.

## 5. Not changed, on purpose

- `fitsCard()` (nine words, one number, no "!") is untouched; the budget is not
  an engine rule. A line whose length is a lift's name — the finish line,
  `hype_pr`, `hype_e1rm_trend`, `hype_holding_cut`, `hype_target_progress` —
  cannot be held to a count, and a name is never cut: the finish line keeps
  `finishCard()` here and native's `finishFit()`. Those four other hype lines
  can still reach three lines with a long library name at 320 points; a native
  fit rule for them (`finishFit()`'s, or drop to the next line) is a design
  choice, not a port.
- The greeting slot (one line) is not in this budget.
