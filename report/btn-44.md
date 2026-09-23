# `.btn` and the 44px touch target — v47, Phase C

**Shipped.** `.btn` has `min-height: 44px` (`rack.css`, the `.btn` rule), and the
parked-workout bar's reserved space went from 58px to 65px because that bar grew
with its Resume button. Nothing else in the stylesheet changed.

## What was wrong

A `<button>` does not inherit `line-height`. The UA stylesheet's `font` shorthand
resets it to `normal`, so `.btn` got its height from padding, border and
Archivo's own line box. Archivo's metrics, read from the font file Google Fonts
serves: 1000 units per em, ascender 878, descender −210, line gap 0. At 14px that
line box is 15px, which makes a primary `.btn` 39px and a ghost or danger one 41px
(it has a 1px border). v43 measured the Train pair and Statistics at 41. The
compact variants were lower still: the block header's Duplicate was 26px.

## Why `min-height` and not padding

With `box-sizing: border-box` on everything (`* { … }` at the top of
`rack.css`), `min-height: 44px` means exactly 44px of box, whatever the padding,
border, type size or font metrics. That includes the system font Rack falls
back to if Archivo has not loaded. The property only ever adds height. It cannot move
a width, a padding or a line break, and a button that was already taller is left
alone: `.btn-lg` (49/51), the qty-row buttons and the water buttons (46).
Changing the padding instead would have meant a different number for every
variant, and it would still depend on font metrics.

## How it was checked

**Measured on the real app.** `report/btn-44/measure.mjs` boots this repo's real
`index.html` and module graph in headless Chrome, with the three Firebase SDK
modules replaced by an in-memory fake seeded with a realistic account: eight weeks
of training, a food log, weigh-ins, routines with a lifting block, a live session,
and people in the admin panel. It walks **58 scenes**: every tab, the settings hub
and each of its sheets, the admin panel and two account sheets, the Coach sheet
and the workout builder, routines and the routine editor, the exercise library,
the picker, a day, Statistics, a live session with a block, the parked bar, a
confirm sheet, sign-in, the access gate, onboarding and the tour. It measures
every rendered `.btn`, at **390 and 320 pixels wide**, once with v46's `rack.css`
and once with v47's.

That is **566 button instances at 43 distinct class-and-container sites**. The
result:

| check, v46 → v47 | count |
|---|---|
| a button's width changed | **0** |
| a button moved sideways inside its row | **0** |
| a label wrapped onto another line | **0** |
| a button clipped by an `overflow: hidden` ancestor | **0** |
| a button spilling out of a fixed-height container | **0** |
| text overflowing its button | **0** |
| a button pushed off screen | **0** |
| a sheet that fit on screen now has to scroll | **0** (10 that already scrolled got 3–68px longer) |
| a button under 44px | **0** (422 of the 566 were, at v46) |

**Checked from the source.** Every rule in both stylesheets that can reach a
button was swept for a height, max-height or min-height of its own. There is one
besides the new minimum, `.cal-nav button { height: 34px }`. Every `.cal-nav` in
the app holds only the classless ‹ › arrows and the gear, never a `.btn`. The
only `overflow: hidden` container that holds a `.btn` is the onboarding card, and
its body scrolls. The Coach card's fixed 190/164px box holds no `.btn`: its row
is `.coach-go`. Swipe-to-delete's button is `.swipe-del`, not `.btn`.

**Fenced by a verifier.** `tools-check/touch-target.mjs` has no browser. It
carries a small CSS cascade over the real `rack.css` and `auth.css` and resolves
a representative button from every screen at both widths. It asserts that each
one is at least 44px and why. It asserts that, with the minimum removed, the
model reproduces **every** height Chrome measured at v46, including the three
stretch rows and the icon-sized Foods and Meals, so the model is proven before
anything is concluded from it. It asserts that nothing a width depends on differs
from the v46 snapshot (`tools-check/touch-target.snapshot.json`, produced by the
same resolver from `12b3a9d`'s stylesheets). It checks the source sweep above and
the parked bar's arithmetic. Each of these mutations turns it red: v46's
stylesheet, the old 58px reservation, a padding change on `.btn`, and a compact
override that undoes the minimum.

## What Micah will see move

Every standard button is 3–5px taller; that is the fix. The large buttons and
the ones already over 44 did not move. These moved most, where the change is
visible rather than subtle:

| before → after | what | where |
|---|---|---|
| 26 → 44 | **Duplicate**, in each lifting block's header (the block's ✓ box beside it stays 26px; it is not a `.btn`) | a live session, the routine editor |
| 31 → 44 | **Resume**, on the parked-workout bar. The bar goes 57 → 64px, and its reserved space follows it (58 → 65px) | Train with a session parked |
| 32 → 44 | **Approve, Decline, Copy, Turn off, Clear, ±7 days** (`.btn-sm`) | Admin (owner only) |
| 32 → 44 | **Choose photo, Remove** | You → ⚙ → Your details |
| 34 → 44 | **+ Set**, under every exercise | a live session, the routine editor |
| 34 → 44 | **+ Add exercise**, inside a block | a live session, the routine editor |
| 36 → 44 | **Edit, Delete** on a day | Train → a day on the calendar |
| 36 → 44 | **+500, +1k, +2.5k, Set total** | Steps |
| 39 → 44 | every plain primary button: Save, Finish, Start it, Unlock Rack… | everywhere |
| 40 → 44 | **Add exercise / Add lifting block** | a live session |
| 41 → 44 | every ghost and danger button: Routines, Exercises, Statistics, Close, Cancel… | everywhere |

The page that grows most is **a live session: +65px** for the three-exercise,
one-block session in the harness: roughly 10px per exercise and 28px per block,
plus a few pixels for the session's own buttons. A six-exercise session is about
100px longer, so there's more scrolling in the gym. The routine editor grows 68px. Every other screen moves by 0–20px.

If one of the compact sites reads wrong on the phone, putting it back is one line
scoped to that site, for example `.ex-actions .btn { min-height: 0 }`. That puts
that site back under 44px and the verifier will say so, which is the honest
state for it to be in.

## What this could not check

- **It is Blink, not WebKit.** Chrome on this Mac, not Safari on an iPhone. The
  box model is the same. `line-height: normal` can differ by under a pixel
  between engines (Blink rounds ascent and descent separately, WebKit rounds
  their sum), and the minimum makes that irrelevant to the result. It is
  still not a phone.
- **No safe-area insets.** Chrome reports them as zero. The parked bar and the
  reserved space both add the bottom inset, so their relationship holds, but it
  was not seen on a notched screen.
- **Controls that are not `.btn` were neither measured nor touched.** Some
  are under 44px by their own rules: the set row's ✓ box (`.set-check`, 30px),
  the block's ✓ box (26px), and the calendar arrows and gear (`.cal-nav button`,
  34px). The Coach chips, segmented controls and dock were not measured. All of
  them are a separate question.
