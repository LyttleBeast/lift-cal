# rack-v77 — the Coach card's line fits at 320 points

## Why

The native port (PORT-V71-REPORT.md §5) measured the Coach card with its own
layout arithmetic and found card lines running to three lines on a 320-point
phone (iPhone SE 1st gen and the like) at every accessibility text size, where
the card draws two and iOS ends the rest with "…". At 375 points and wider
nothing was over. The words are pure and native copies them verbatim, so the
fix is web's: shorten the lines, same facts, same first person, and fence them.

## What changed

- **`coach.js`** — `export const CARD_LINE_CHARS = 44`, beside `fitsCard()`
  (unchanged), with the derivation in its comment; ten sentences shortened
  (table below). Every id, gate, pool and rotation is what it was.
- **`coach-ui.js`** — the half-loaded card line.
- **`tools-check/card-fit.mjs`** (new) — renders every card line the words fix
  through the real tables and fails on any over `CARD_LINE_CHARS`: A the
  budget, B BACK_LINES / REST_LINES / WARM over every view the card draws, C
  the six card states, D every hype line with no lift name over its numbers in
  both units, E coach-ui.js's half-loaded line, F the v77 sentences literal by
  literal, their gates unchanged, and the eleven old ones gone.
- **`tools-check/coach-hype.mjs`** — one comment quoting "most in five weeks".
- **`tools-check/friends-structure.mjs`** — its version check names rack-v77.
- **`sw.js`, `usage.js`** — `rack-v77`.

## The sentences, old → new

| id | old | new |
|---|---|---|
| `back_time_off` | Time off is part of training. The log knows that. | Time off is part of training. I know that. |
| `back_here` | Whatever the break was for, it’s over, and you’re here. | Whatever the break was for, you’re here now. |
| `back_rested` | Your groups are fully rested. A good starting point. | Your groups are fully rested. A good start. |
| `back_before` | You’ve come back from a gap before. It’s in the log. | You came back from a gap like this before. |
| `back_first` | The first session back reads as a first session. | The first one back reads as a first session. |
| `back_page` | A fresh page, and the old ones are all there. | A fresh page. The old ones are all there. |
| `rest_three` | Three days straight. A rest day is well earned. | Three in a row. A rest day is well earned. |
| `rest_asking` | Nothing in your log asks for a session today. | Nothing in your log asks for training today. |
| `hype_week_best` | {n} sessions in seven days, most in five weeks. | {n} sessions in seven days, a five-week high. |
| `hype_recovery` | {Three / n} straight days. A rest day is well earned. | {Three / n} days on. A rest day is well earned. |
| half-loaded (coach-ui.js) | Your training is in. Food and weight have not landed yet. | Training is in. Food and weight are loading. |

The five the report named are the first four BACK_LINES rows and the
half-loaded line. The rest came out of v77's own sweep: `back_first` (48),
`back_page`, `rest_asking`, `rest_three` and `hype_recovery` sat in the
overlap band (45–47 characters, fitting today but by the wrap, not by a
margin), and **`hype_week_best` ran to three lines at every count** — a line
the report's fixtures never drew. Every new sentence passes the voice fence
(`coach-voice.mjs` P) and `fitsCard()`'s nine words.

## The budget, and how it was derived

The box is the same at every accessibility size, because native caps card
text at 1.6×: 320 − 2 × (16 gutter + 14 padding + 1 border) = 258 points wide,
the line at 14 × 1.6 = 22.4 points, two lines on both cards. Every line
`card-fit.mjs` renders — 2,227 distinct strings before v77 — was put through
native's `coach-view.js` `cardLayout()` + `textLines()` (Archivo's advance
widths) on You and Train:

- the longest line that fitted two lines was 47 characters;
- the shortest that did not was 45 (`hype_week_best`; digits are wide and the
  break falls late);
- nothing of 44 or fewer ran over.

A count of characters is not a width, so the budget is the largest count with
no overlap: **44**. After v77 the same measurement over 2,228 strings finds
none over two lines at 320 or 375 points; the longest is 44 characters.
Native's port of the verifier is asked to add the Archivo width check
(NEXT-NATIVE-V77.md §4), which is the authority.

Not in the budget, on purpose: lines whose length is a lift's name (the finish
line, `hype_pr`, `hype_e1rm_trend`, `hype_holding_cut`,
`hype_target_progress`). A name is never cut; the finish line already has
`finishCard()` and native's `finishFit()`. The other four can still reach
three lines at 320 points with a long library name — a native fit rule for
them is a design call left open.

## Proof

- `node --check` over every `*.js`: clean.
- Every `tools-check/*.mjs` exits 0 in `TZ=America/New_York`, `UTC` and
  `Pacific/Auckland` (and `card-fit.mjs`, 33 checks, among them).
- Coach battery, `GATE=all` (`bash tools-check/battery/run-all.sh`):
  PASS — properties 4/4, regressions 15/15, 300 lifters × 8 cuts: 160,564
  decisions, 158,210 ok (98.5%), 2,354 miss, **0 wrong**; dead ends 0 of
  56,637 live asks and 0 of 8,171 targets. (The card's words are not
  something the battery scores; it is the gate that nothing else moved.)
- `database.rules.json` and `database.rules.OPTIONAL-LOCK.json`
  byte-identical to rack-v76.
- Pure file as committed: `coach.js`
  `adf9b791ae6fea56fdfef15fa6106d96a176f3306b235a29427e9714c133bef8`
  (rack-v76's was `d875915c…bca74`). Native's steps: `NEXT-NATIVE-V77.md`.

## Handoff

- **Shipped** — ten Coach card sentences and the half-loaded line shortened to fit two lines on a 320-point phone at the largest text sizes, same facts, and a verifier (`card-fit.mjs`) that holds every card line to 44 characters.
- **Service worker** — rack-v77.
- **Before it's live** — nothing, merging is enough.
- **To check it worked** — merge, close Rack from the app switcher, open it, close and open once more; Admin (Settings → Help) reports rack-v77 for his account, and a card that would have said "most in five weeks" now says "a five-week high".
- **Risk** — the character budget is a proxy for width; a 44-character line of unusually wide letters could still wrap to three, which native's width check (asked for in NEXT-NATIVE-V77.md) is there to catch. Hype lines carrying a long lift name are outside the budget.
