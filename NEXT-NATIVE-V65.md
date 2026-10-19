# Porting rack-v65 to rack-mobile

Web ships as `rack-v65`, built on `rack-v64` (`f528ff5`). The tree it mirrors is
`~/dev/rack-mobile`.

v65 is **reorder exercises**: while planning a workout he can move an exercise
up or down instead of deleting everything after it and re-adding it. It is a
permutation of what is already stored. **No stored field is added or changed, no
node, no database rule, no migration** (AGENTS.md: the order of
`exercises[]` is the order on screen, and `block` is an annotation on each
exercise). Nothing in `database.rules.json` or the Worker moves.

---

## 1. The pure model, verbatim

Copy `blocks.js` across as before (it has no imports). v65 adds four exports at
the end of the file and changes nothing above them:

| export | does |
|---|---|
| `moveExercise(s, index, dir)` | `dir` is `-1` (up) or `+1` (down). Returns the next `{ exercises, blocks }`; when the move is not available it returns `{ exercises: s.exercises, blocks }` with the SAME `exercises` array, so identity tells "nothing happened". |
| `canMoveExercise(s, index, dir)` | `moveExercise(...).exercises !== s.exercises`. Drives the disabled state. |
| `moveBlock(s, n, dir)` | The same for a whole block, by its number. |
| `canMoveBlock(s, n, dir)` | Likewise. |

`s` is the usual `{ exercises, blocks? }`; a stored routine has no `blocks` and
works as it does for every other function in the file.

**The rule (port it by copying, not by describing it).** Moves are by the ROWS
`sessionLayout` draws:

- an exercise INSIDE a block moves among that block's own exercises and stops at
  the block's first / last. It never leaves its block, so a move cannot split a
  block or change which block an exercise is in;
- an UNGROUPED exercise moves one row: past the neighbouring ungrouped exercise,
  or past a WHOLE block as one piece, never into the middle of one;
- a block moves one row as a whole, past a neighbouring exercise or block;
- an empty block has no place in the array, so it has no move;
- every moved exercise is the same object it went in as (sets, `w`/`r`, `tw`/`tr`,
  `tl`, `rir`, `dp`, warm-ups, notes and anything else on it ride along), and the
  result goes through `normalizeBlocks`, so block numbers are renumbered 1..N by
  position exactly as after any other block change.

`tools-check/reorder.mjs` is the proof; port its cases as a native verifier
(`tools/verify-reorder.mjs` or wherever blocks' own verifier sits), importing the
verbatim file. Re-pin the verbatim hash of `blocks.js` in the same commit.

## 2. Where it shows, web file -> native destination

| screen | web | native |
|---|---|---|
| Live session / planned session before start / editing a past session | `workout.js` `renderExercise` (per exercise), `renderBlock` (per block); both go through `commitBlocks(moveExercise(session, exIdx, dir))` / `commitBlocks(moveBlock(session, n, dir))` | the workout screen's exercise header and block header. Same two calls into the verbatim `blocks`, then persist the session exactly as `commitBlocks` does (it writes `exercises` and `blocks` and repaints). |
| Routine editor | `routines.js` `exBlock`, `blockCard`; `commit(moveExercise(draft, xi, dir))` / `commit(moveBlock(draft, n, dir))` | the routine editor's exercise and block headers. On Save the routine is stored through the same `forStorage` as before: `exercises` in the new order with their `block` numbers, **no `blocks` array**. |

The routine preview sheet (read-only, before "Start workout") has no buttons, as
it has none for blocks; a routine is reordered in the editor, and "Start" then
starts it in the saved order.

**The control.** Two buttons, up then down, on every exercise header (before the
remove `...`) and on every block header (before the check box). Web draws plain
`▲` `▼` text, each a 44 x 44 pt target (`.mv-btn` in `rack.css`, wrapper
`.mv-btns`, built by `moveButtons()` in `ui.js`), with `accessibilityLabel`
"Move <name> up" / "Move <name> down" ("Move Block 2 up"). A button is disabled
(dimmed, not hidden) when `canMove...` is false: the first and last place, the
first / last of a block, a single exercise. A tap runs the move once and
repaints; there is no drag.

Tapping a button must not tick, expand or otherwise act on the row behind it
(web stops propagation).

## 3. Things that are NOT changed

- Not in `history/{exId}` and not in any analytics: they merge by `exId`
  (`mergeSessionExercises`), so a session's order only decides "sets
  concatenated in session order" for an exId that appears twice, which is the
  same rule as before.
- Live-session state keyed by position (`session._coach` nudge keys are
  `exId#nth`, `coachExIdx` is the first exercise with sets): a move can change
  which same-exId copy is "nth", or which exercise carries the first-tick
  coach mark. Both are cosmetic and self-heal on the next tick; if native keys
  anything by array index, key it by the exercise object or re-derive it after a
  move.
- Dragging to reorder: not done. A drag handle without a library is not
  reliable in iOS Safari (scroll vs drag, long-press menus), so web ships
  buttons only. Native may add a drag if it can make it as reliable; the model
  calls above are the only thing it would need.

## 4. The schema

None. No field, node, rule or migration. If native stores an order anywhere
beside `exercises[]` (an index map, a position field), delete it: the array
order is the order.
