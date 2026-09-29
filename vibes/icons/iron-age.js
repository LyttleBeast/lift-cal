// Iron Age's icons — the engraved set, as data.
//
// The same shape as vibes/icons/v1.js's `icons`: every icon is { viewBox,
// stroke, fill, linecap, linejoin, els }, and els are only { tag: 'path', d },
// { tag: 'circle', cx, cy, r } and { tag: 'rect', x, y, width, height, rx } —
// exactly what vibe.js icon() and native's <Svg> know how to draw, so nothing
// here needs a renderer that does not exist. Like v1's set it imports
// nothing, is frozen all the way down (every caller shares it), and is copied
// byte for byte into rack-mobile (src/pure/vibes/icons/iron-age.js).
//
// THE STYLE, and why:
// - A 24-unit grid. Every object is a SOLID CUT (`cut`, below): the
//   silhouette filled in the site's ink, with no stroke, and the one or two
//   details the cut shows white (the scale's dial, the gear's hub, the
//   lock's keyhole, the nib's slit, the ledger's rules) cut out of it — as a
//   catalogue or a manual printed its small cuts. Until the third AI-made
//   panel the set was one even outline stroke with square caps; an outline
//   at one weight is a UI icon set's manner whatever its caps, and it read
//   as a stock set under a period costume.
// - The object in profile or frontal elevation. No engraved hatching at icon
//   size: at 22pt it turns to mud.
// - The marks of the text stay strokes, square-capped, at 1.5 on the 19–22pt
//   sites and 1.75 on the 14–17pt sites: the Greek cross, the saltire, the
//   tick, the rule, the hooked arrow, the fold chevrons, the warning
//   triangle. Two sites fix their own stroke and win (vibe.js icon()
//   o.stroke): the Log food button's 2.6 (the cross, a stroke) and the
//   estimator notices' 1.6 (spark, a cut, which then prints a hair heavier).
// - No lettering, numerals or trade marks, ever: the calendar carries no date
//   (a date on it would be a number Rack did not print), the barcode no
//   digits, the scale no figures on its dial.
// - `spark` is never a sparkle, star, asterisk or bolt: it is the printers'
//   fist, pointing at the sentence it marks.
//
// TRACED, THEN SIMPLIFIED BY HAND. Where a pre-1931 cut of the object exists
// (vibes-night research/iron-age/originals/), it was traced: the page cropped
// with sips, thresholded and traced with imagetracerjs 1.2.6 (public domain,
// deterministic), the contour fitted to this grid and thinned with
// Ramer–Douglas–Peucker (vibes-night/tools iai-crop, iai-trace, iav-fit).
// Then by hand, one of two ways: the trace's own points joined into the
// outline (iav-curve) — a symmetric outline drawn from one traced side, a
// band or a slit added where the cut has one — or, where the cut is too fine
// or too busy to hold at 22pt, its measures (spacing, taper, profile) redrawn
// in plain strokes, a narrow cut widened across. The hand step moves points,
// never the style. vibes/iron-age/icons/PROVENANCE.json records every traced
// source (the book, the page, the crop box, the commands). `sources`, below,
// says for each drawing which it is: traced, or drawn by hand to a source's
// proportions, or plain hand-drawn geometry with no period form at all.
//
// WHAT IS HERE BEYOND v1's KEYS (each has its engine hook):
// - `glyphs`: drawings for the Unicode glyph sites of v1's `glyphs` (‹ › ✕ ×
//   ⋯ − + ✓ ↳ ✎ ⚙ ▾ ▴ ⚠). v1 draws them as text; no face Rack uses has ✓ ↳
//   ⚙ ✕ ⋯ ⚠ ✎ ▾ ▴, and Besley lacks the arrows too, so Iron Age draws them.
//   up / down / flat are null: ↑ ↓ → are a number's direction and stay text,
//   in Archivo, which has them. ⚙ and ⚠ inside a sentence, "tap ⋯" and
//   "a ✓ when" are copy and are never routed here (v1.js `prose`).
// - `vessel`: the water card's carafe, with its own insideBottom / insideTop,
//   because the vessel's level is a number — linear in the day's fraction
//   between those two lines, as v1's bottle is between 154 and 22.
// - `ornaments`: the one tailpiece a long screen may end on, per tab. Never
//   inside data; none on Steps, where a ring would read as the step ring.
//
// No `sites` or `prose`: where an icon is drawn is a fact about the call
// sites, the same in every vibe, and v1's set holds it.

// Inline, not imported: this file imports nothing.
const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

const icon = (stroke, els) =>
  ({ viewBox: '0 0 24 24', stroke, fill: 'none', linecap: 'square', linejoin: 'miter', els });
/* A solid cut: the object's black printed as black, as a catalogue's and a
   manual's small cuts are — never the even outline of a UI icon set (the
   third AI-made panel: "thin, even-stroke, round-capped … a stock icon set
   under a period costume"). Every element is a closed shape, filled in the
   site's ink, with no stroke: a detail the cut shows in white (a dial, a
   hub, a keyhole, a nib's slit, a ruled leaf) is cut out of the same path,
   wound the other way, so it shows the paper through. Only the lines that
   are marks of the text — the saltire, the tick, the rule, the cross — stay
   strokes. */
const cut = els =>
  ({ viewBox: '0 0 24 24', stroke: 0, fill: 'currentColor', linecap: 'square', linejoin: 'miter', els });
const piece = (viewBox, els) =>
  ({ viewBox, stroke: 1.5, linecap: 'square', linejoin: 'miter', els });
const path = d => ({ tag: 'path', d });
const circle = (cx, cy, r) => ({ tag: 'circle', cx, cy, r });
const rect = (x, y, width, height) => ({ tag: 'rect', x, y, width, height, rx: 0 });

/* One spur gear, eight straight-flanked teeth (tip radius 9.6, root 7.2) and
   its hub: an engraver's plain spur gear, not Feather's cog. Drawn by hand as
   geometry: the one period source (Grant 1893's "ready made gears") shows its
   gears in perspective, which does not trace to an elevation. The same drawing
   serves the Fuel and Steps gear, the You gear and native's ⚙. */
const GEAR = 'M10.6 4.94L10.72 2.49L13.28 2.49L13.4 4.94L16 6.01L17.82 4.37L19.63 6.18L17.99 8L19.06 10.6L21.51 10.72' +
  'L21.51 13.28L19.06 13.4L17.99 16L19.63 17.82L17.82 19.63L16 17.99L13.4 19.06L13.28 21.51L10.72 21.51L10.6 19.06L8 17.99' +
  'L6.18 19.63L4.37 17.82L6.01 16L4.94 13.4L2.49 13.28L2.49 10.72L4.94 10.6L6.01 8L4.37 6.18L6.18 4.37L8 6.01Z';
// The gear is drawn clockwise; its hub is cut out of it, counter-clockwise,
// so the cut is solid iron round a bored hub.
const HUB = 'M14.6 12A2.6 2.6 0 0 0 9.4 12A2.6 2.6 0 0 0 14.6 12Z';
const GEAR_ELS = [path(GEAR + HUB)];

/* A pen nib drawn point-down, then turned 45 degrees about the centre so the
   point sits lower left, as a hand holds it: shoulders, the slit from the
   point, the breather hole. Drawn by hand to the gold nib of Sears No. 112
   p. 99, broadened so it holds at 19pt (the cut is a slim 1 : 5). Written out
   rather than computed at load, so a verifier can compare strings. */
const NIB = 'M4.93 19.07L8.46 10.73L11.58 7.62L13.7 7.47L17.23 3.94L20.06 6.77L16.53 10.3L16.38 12.42L13.27 15.54Z';
// The nib is drawn clockwise; the slit from the point and the breather hole
// are cut out of it.
const NIB_SLIT = 'M5.55 17.75L6.25 18.45L10.51 14.19L9.81 13.49Z';
const NIB_HOLE = 'M12 12.8A.8 .8 0 0 0 10.4 12.8A.8 .8 0 0 0 12 12.8Z';
const NIB_ELS = [path(NIB + NIB_SLIT + NIB_HOLE)];

/* The padlock: a heart-shaped case (Mallory, Wheeler 1871 No. 10), a keyhole,
   and the shackle — which is the only thing that moves between locked and
   unlocked, as in v1. The case is drawn clockwise and the keyhole cut out of
   it; the shackle is a solid band, its two edges one path. */
const LOCK_CASE = 'M5 12.2C5 10.9 6 10 7.3 10C9.2 10 10.4 10.9 12 10.9C13.6 10.9 14.8 10 16.7 10C18 10 19 10.9 19 12.2V16C19 19 15.9 21 12 21C8.1 21 5 19 5 16Z';
const KEYHOLE = 'M12.7 15.21A1.15 1.15 0 1 0 11.3 15.21V17.6H12.7Z';
const SHACKLE = 'M7.4 10.2V7.4A4.6 4.6 0 0 1 16.6 7.4V10.2H15V7.4A3 3 0 0 0 9 7.4V10.2Z';
const SHACKLE_UP = 'M7.4 10.2V7.4A4.6 4.6 0 0 1 16.18 5.49L14.73 6.15A3 3 0 0 0 9 7.4V10.2Z';

/* The printers' fist (Polhemus 1895, stock cut No. 431, traced; turned to
   point right, at the sentence): the cuff and the hand with its pointing
   finger, printed solid — ☛, the black index. The hand's outline closes on
   the cuff's edge. It marks the estimator's notices (spark) and Coach's own
   voice (bubble): a period page points at what it wants read; it has no
   speech balloons. */
const FIST = [rect(1.8, 7.6, 2.9, 9),
  path('M4.7 7.9C4.7 7.9 8.46 7.34 10.8 7.25C13.14 7.16 16.89 7.26 18.75 7.34C20.61 7.42 21.34 7.59 21.97 7.75C22.59 7.91 22.48 8.1 22.5 8.3C22.52 8.51 22.98 8.77 22.1 8.98C21.23 9.19 17.25 9.55 17.25 9.55C17.25 9.55 16.52 10.01 16.2 10.6C15.88 11.19 15.58 12.35 15.3 13.07C15.02 13.79 14.69 14.52 14.5 14.9C14.31 15.29 14.17 15.38 14.17 15.38C14.17 15.38 11.57 15.3 10.39 15.38C9.21 15.46 7.92 15.86 7.07 15.88C6.22 15.9 5.66 15.56 5.27 15.51C4.88 15.46 4.7 15.6 4.7 15.6Z')];

/* A heavy chevron, cut as a solid wedge with square ends: the printer's ‹ ›,
   not a hairline stroke. */
const PREV = 'M14.2 4.6L6.8 12L14.2 19.4L15.76 17.84L9.92 12L15.76 6.16Z';
const NEXT = 'M9.8 4.6L17.2 12L9.8 19.4L8.24 17.84L14.08 12L8.24 6.16Z';

export default deepFreeze({
  id: 'iron-age',

  icons: {
    /* ---- the dock, 22pt ---- */
    // A generic bust on its cut, printed solid: oval head, shoulders cut
    // square, the plinth it stands on. Never a likeness of anyone.
    you: cut([path('M8.7 7.6a3.3 3.8 0 1 0 6.6 0a3.3 3.8 0 1 0-6.6 0z'),
              path('M5.2 19.8V19c0-2.9 3.1-4.9 6.8-4.9s6.8 2 6.8 4.9v.8z'),
              path('M3.5 20.6H20.5V21.9H3.5Z')]),
    // The globe dumb-bell (Spalding c. 1891), solid: two iron globes and the
    // handle between them. Printed solid the pair is a dumb-bell at 22pt; the
    // band the outline needed (without it the outline read as spectacles) is
    // not wanted. The globes' spacing is the cut's, fitted off its trace.
    workout: cut([circle(4.85, 12, 3.6), circle(19.15, 12, 3.6),
                  path('M8.3 10.9H15.7V13.1H8.3Z')]),
    // A dessert fork upright (Sears No. 112 p. 101; its head widened across
    // so the tines stay apart at 22pt) — three tines, the head and shank, the
    // plain tipped handle — and a plain tumbler (p. 645), wider at the lip:
    // its glass solid, the empty top of it cut out, so it stands half full.
    food: cut([path('M4.2 3H5V7.8H4.2Z'), path('M6.1 3H6.9V7.8H6.1Z'), path('M8 3H8.8V7.8H8Z'),
               path('M4.2 7.8C4.2 9.2 5.1 10.2 6.1 10.4V15.4H6.9V10.4C7.9 10.2 8.8 9.2 8.8 7.8Z'),
               path('M6.5 15.4C7.4 16.4 7.7 18 7.6 19.6C7.5 20.6 7.1 21 6.5 21C5.9 21 5.5 20.6 5.4 19.6C5.3 18 5.6 16.4 6.5 15.4Z'),
               path('M12.5 8.5H20.5L19.75 20.5H13.25ZM13.46 9.4L13.68 13H19.32L19.54 9.4Z')]),
    // The dial scale (Fairbanks, Morse & Co., 1919): the cabinet with its
    // round dial head set to one side, solid, the dial's face cut out of it
    // with the hand and its boss on the face; the platform wider than the
    // cabinet. No figures on the dial, no lettering anywhere.
    weight: cut([path('M5.8 17.5V11.9C5.8 10.9 6.4 10.4 7.4 10.4H9.4A5.2 5.2 0 1 1 19.4 8.3V17.5Z' +
                      'M17.3 8.3A3.1 3.1 0 0 0 11.1 8.3A3.1 3.1 0 0 0 17.3 8.3Z'),
                 path('M12.4 6.2L14.5 8L13.95 8.6Z'), circle(14.2, 8.3, 0.6),
                 path('M3 18.3H21V21H3Z')]),
    // Two hair insoles (Sears No. 112 p. 936, traced), toe up, a pair: the
    // left one the right one reflected, and lower. Printed solid, a footprint.
    steps: cut([path('M7.91 6.9C7.29 6.56 6.65 6.51 6.11 7.07C5.56 7.63 4.87 9.46 4.64 10.25C4.42 11.05 4.53 11.14 4.74 11.85C4.95 12.55 5.85 13.32 5.92 14.48C5.98 15.63 5.19 17.89 5.15 18.79C5.11 19.7 5.4 19.65 5.68 19.91C5.95 20.17 6.42 20.29 6.79 20.34C7.16 20.39 7.52 20.43 7.91 20.2C8.3 19.96 8.97 19.83 9.14 18.94C9.32 18.04 8.84 15.78 8.95 14.83C9.06 13.88 9.66 14.19 9.8 13.23C9.95 12.28 10.12 10.17 9.8 9.12C9.49 8.06 8.52 7.24 7.91 6.9Z'),
                path('M16.24 2.7C16.86 2.36 17.5 2.31 18.04 2.87C18.58 3.43 19.28 5.26 19.5 6.05C19.73 6.85 19.62 6.94 19.41 7.65C19.2 8.35 18.3 9.12 18.23 10.28C18.16 11.43 18.96 13.69 19 14.59C19.04 15.5 18.75 15.45 18.47 15.71C18.2 15.97 17.73 16.09 17.36 16.14C16.98 16.19 16.63 16.23 16.24 16C15.85 15.76 15.18 15.63 15 14.74C14.83 13.84 15.31 11.58 15.2 10.63C15.09 9.68 14.49 9.99 14.34 9.03C14.2 8.08 14.03 5.97 14.34 4.92C14.66 3.86 15.62 3.04 16.24 2.7Z')]),

    /* ---- the add flow, 19pt; Foods and Meals at 16 ---- */
    // A Greek cross: a mark of the text, so a stroke. The Log food button
    // draws it at its own 2.6.
    plus: icon(1.5, [path('M12 4.5v15M4.5 12h15')]),
    // A box camera, front, solid: the box with the lens's rim and the finder
    // window cut out of it, the lens in the rim, the top housing.
    camera: cut([path('M3.5 7.5H20.5V20H3.5Z' +
                      'M15.3 13.8A3.3 3.3 0 0 0 8.7 13.8A3.3 3.3 0 0 0 15.3 13.8Z' +
                      'M15.8 9.3V11.1H18.2V9.3Z'),
                 circle(12, 13.8, 1.6), path('M9.5 7.5V5H14.5V7.5Z')]),
    pen: cut(NIB_ELS),
    // Brass rules, thick and thin, square-ended, no digits: the print shop's
    // own drawing of a barcode, each rule a solid bar.
    barcode: cut([path('M3.1 5.5H5.1V18.5H3.1Z' + 'M7.15 5.5H8.05V18.5H7.15Z' + 'M9.95 5.5H10.85V18.5H9.95Z' +
                       'M12.7 5.5H14.7V18.5H12.7Z' + 'M16.75 5.5H17.65V18.5H16.75Z' + 'M19.3 5.5H21.3V18.5H19.3Z')]),
    // Rimmed keys, three by two, over a space bar, in a frame: the frame's
    // inside cut out, the keys and the bar solid in it.
    keypad: cut([path('M3.5 4H20.5V20H3.5ZM4.9 5.4V18.6H19.1V5.4Z'),
                 circle(8, 8.6, 1.3), circle(12, 8.6, 1.3), circle(16, 8.6, 1.3),
                 circle(8, 12.4, 1.3), circle(12, 12.4, 1.3), circle(16, 12.4, 1.3),
                 path('M8 15.8H16V17H8Z')]),
    // An open ledger: its two leaves solid either side of the spine, each
    // with two ruled lines cut out of it.
    book: cut([path('M11.3 6.3C9.4 5.2 6.8 4.8 3.5 5.1V18.5C6.7 18.2 9.3 18.7 11.3 19.8Z' +
                    'M5.6 9.3H9.8V10.1H5.6Z' + 'M5.6 12.3H9.8V13.1H5.6Z'),
               path('M12.7 6.3C14.6 5.2 17.2 4.8 20.5 5.1V18.5C17.3 18.2 14.7 18.7 12.7 19.8Z' +
                    'M14.2 9.3V10.1H18.4V9.3Z' + 'M14.2 12.3V13.1H18.4V12.3Z')]),
    // Three dishes stacked, seen edge-on: each a rim with its well dipping
    // under it, solid. Three flat bars read as a menu ("hamburger") at 16px.
    stack: cut([path('M3 5.9H21V6.9H18C16.4 9.1 7.6 9.1 6 6.9H3Z'),
                path('M3 10.9H21V11.9H18C16.4 14.1 7.6 14.1 6 11.9H3Z'),
                path('M3 15.9H21V16.9H18C16.4 19.1 7.6 19.1 6 16.9H3Z')]),
    // The printers' fist, solid (FIST above).
    spark: cut(FIST),

    /* ---- the gears (16–17pt), the calendar (19), Coach's marks (14–15) ---- */
    gear: cut(GEAR_ELS),
    gearYou: cut(GEAR_ELS),
    // A desk-calendar pad on its two wire posts: the pad solid, its leaf cut
    // out below the head, so the head prints as a solid band. No numerals
    // and no month; the stand's feet are dropped (with them it read as a
    // stool).
    calendar: cut([path('M4 5.5H20V20.5H4ZM5.4 11V19.1H18.6V11Z'),
                   path('M7.2 3H8.8V7H7.2Z'), path('M15.2 3H16.8V7H15.2Z')]),
    // Coach's mark: the printers' fist (FIST above), pointing at what Coach
    // says. A speech balloon is a chat app's mark, not a page's (the third
    // AI-made panel).
    bubble: cut(FIST),
    lock: cut([path(LOCK_CASE + KEYHOLE), path(SHACKLE)]),
    unlock: cut([path(LOCK_CASE + KEYHOLE), path(SHACKLE_UP)])
  },

  /* The glyph keys of vibes/icons/v1.js `glyphs`, drawn at 1.75 in the site's
     own colour and size. Each replaces its character at the glyph-only sites
     v1.js lists; the character stays the drawing's accessible name. */
  glyphs: {
    // The printer's chevrons, solid wedges (PREV, NEXT above).
    prev:     cut([path(PREV)]),
    next:     cut([path(NEXT)]),
    back:     cut([path(PREV)]),
    go:       cut([path(NEXT)]),
    // A saltire; the × dismiss is the same, a size smaller.
    close:    icon(1.75, [path('M6.5 6.5l11 11M17.5 6.5l-11 11')]),
    dismiss:  icon(1.75, [path('M7.5 7.5l9 9M16.5 7.5l-9 9')]),
    // A dinkus: three spaced points in a row (the copy calls them "the dots",
    // so they stay three round dots in a row).
    more:     cut([circle(5.5, 12, 1.7), circle(12, 12, 1.7), circle(18.5, 12, 1.7)]),
    minus:    icon(1.75, [path('M5.5 12h13')]),
    plus:     icon(1.75, [path('M12 5.5v13M5.5 12h13')]),
    // A ledger tick, the clerk's check mark.
    check:    icon(1.75, [path('M5 12.8l4.2 4.2L19.5 6.5')]),
    // A hooked arrow, the drop set's ↳.
    drop:     icon(1.75, [path('M7 4.5v8c0 1.4 1.1 2.5 2.5 2.5h9.5M15.5 11.5L19 15l-3.5 3.5')]),
    edit:     cut(NIB_ELS),
    gear:     cut(GEAR_ELS),
    expand:   icon(1.75, [path('M6 9.5l6 6 6-6')]),
    collapse: icon(1.75, [path('M6 14.5l6-6 6 6')]),
    // A plain triangle with a rule and a point, for the sentence-leading ⚠
    // site and native's dev banner only; ⚠ inside prose stays text.
    warn:     icon(1.75, [path('M12 3.8L21.2 19.8H2.8Z'), path('M12 9.6V14.2'), circle(12, 16.9, 0.55)]),
    // A number's direction, not an icon: stays text, in Archivo.
    up: null,
    down: null,
    flat: null
  },

  /* The water card's vessel: the Perfection separable water bottle, a carafe
     (Sears No. 112 p. 645, traced; its left side kept and reflected, the
     cut-glass pattern never drawn). v1's viewBox, so it sits in the same box.
     `d` is the outline and doubles as the clip path, as v1's bottle's does.
     The level is linear in the day's fraction between insideBottom (the
     bowl's floor) and insideTop (the top of the collar where bowl meets
     neck): a full day fills the bowl and leaves the neck empty. No cap: a
     carafe has its lip. */
  vessel: {
    viewBox: '0 0 104 168',
    stroke: 3,
    d: 'M34.5 28L33.4 32C33.4 32 38.07 37.62 39.5 40.9C40.93 44.18 41.72 47.32 42 51.7C42.28 56.08 42.3 61.88 41.2 67.2C40.1 72.52 38.22 79.43 35.4 83.6C32.58 87.77 24.3 92.2 24.3 92.2L24.3 100.8C24.3 100.8 17.27 104.25 14.5 106.7C11.73 109.15 9.07 111.32 7.7 115.5C6.33 119.68 5.57 126.5 6.3 131.8C7.03 137.1 8.48 143.45 12.1 147.3C15.72 151.15 23.32 153.3 28 154.9C32.68 156.5 36.2 156.5 40.2 156.9C44.2 157.3 48.07 157.3 52 157.3C55.93 157.3 59.8 157.3 63.8 156.9C67.8 156.5 71.32 156.5 76 154.9C80.68 153.3 88.28 151.15 91.9 147.3C95.52 143.45 96.97 137.1 97.7 131.8C98.43 126.5 97.67 119.68 96.3 115.5C94.93 111.32 92.27 109.15 89.5 106.7C86.73 104.25 79.7 100.8 79.7 100.8L79.7 92.2C79.7 92.2 71.42 87.77 68.6 83.6C65.78 79.43 63.9 72.52 62.8 67.2C61.7 61.88 61.72 56.08 62 51.7C62.28 47.32 63.07 44.18 64.5 40.9C65.93 37.62 70.6 32 70.6 32L69.5 28Z',
    insideBottom: 155,
    insideTop: 92,
    cap: null
  },

  /* The tailpiece: the one ornament a long screen may end on, centred 32
     under its last box, in ink, hidden from assistive tech. One per screen,
     never inside data, keyed by where it sits. */
  ornaments: {
    // A globe dumb-bell alone (Spalding c. 1891, one of the crossed pair).
    // Its globes 3.9 radii apart, centre to centre, as the cut's are.
    you: piece('0 0 48 24', [circle(10.35, 12, 7), circle(37.65, 12, 7),
           path('M10.35 5a3 7 0 0 1 0 14M37.65 5a3 7 0 0 0 0 14'),
           path('M17.35 11H30.65M17.35 13H30.65')]),
    // The Indian club (Spalding c. 1891 p. 90, traced): the body below the
    // holder's clamp, its knob completed by hand, the band at the foot.
    workout: piece('0 0 24 48', [circle(11.91, 4.4, 1.8),
           path('M10.75 6.2V8.7C10.75 8.7 10.54 12.12 10.3 14C10.06 15.88 9.67 17.83 9.3 20C8.93 22.17 8.33 25 8.1 27C7.87 29 7.9 30.17 7.9 32C7.9 33.83 7.93 36.27 8.1 38C8.27 39.73 8.65 41.32 8.9 42.4C9.15 43.48 9.6 44.5 9.6 44.5L14.3 44.6C14.3 44.6 14.82 43.52 15.1 42.4C15.38 41.28 15.75 39.55 15.95 37.9C16.15 36.25 16.3 34.12 16.3 32.5C16.3 30.88 16.18 29.78 15.98 28.2C15.78 26.62 15.46 24.87 15.1 23C14.74 21.13 14.14 18.87 13.8 17C13.46 15.13 13.19 13.2 13.07 11.8C12.95 10.4 13.07 8.6 13.07 8.6V6.2'),
           path('M8.1 36.6H16.1')]),
    // The Common Sense Exerciser (Sears No. 112 p. 325): two stirrup handles,
    // two cords run to one ring and its screw hook, as the cut draws it.
    food: piece('0 0 48 24', [
           path('M3.2 3.1C3.2 3.1 6.93 3.49 7.97 4.2C9 4.91 9.41 6.34 9.41 7.38C9.41 8.42 9 9.82 7.97 10.46C6.93 11.1 3.2 11.2 3.2 11.2Z'),
           path('M3.2 13.16C3.2 13.16 6.93 13.48 7.97 14.12C9 14.76 9.41 16 9.41 17C9.41 18 9 19.42 7.97 20.09C6.93 20.76 3.2 21 3.2 21Z'),
           circle(10.6, 7.5, 1.1), circle(10.6, 17, 1.1),
           path('M11.7 7.7L42.2 11.7M11.7 16.8L42.2 12.8'),
           circle(43.8, 12.2, 1.6), path('M44.4 13.8L45.6 20.3')]),
    // The gymnastic ring (Dio Lewis 1866, Figure 1): its two edges, the inner
    // at the cut's .88 of the outer.
    weight: piece('0 0 32 32', [circle(16, 16, 12), circle(16, 16, 10.55)]),
    // The globe bar-bell (Ravenstein and Hulley 1867, the annexed wood-cut):
    // each ball a ring with its highlight, the bar two rules — shortened.
    recap: piece('0 0 64 24', [circle(8, 12, 6.5), circle(56, 12, 6.5),
           path('M4.6 10.2C5.1 8.4 6.5 7.1 8.3 6.8'), path('M52.6 10.2C53.1 8.4 54.5 7.1 56.3 6.8'),
           path('M14.5 10.5H49.5M14.5 13.5H49.5')]),
    steps: null
  },

  /* Where each drawing comes from. Three kinds, and each says which:
       traced      imagetracerjs traced the cut and the outline here is that
                   trace's points, thinned and joined by hand;
       traced, redrawn  the cut was traced and measured (its spacing, taper,
                   profile), then redrawn on the grid in plain strokes;
       to the proportions of  drawn by hand, measured by eye off the cut;
       hand-drawn  no period form.
     The traced ones are in vibes/iron-age/icons/PROVENANCE.json with the crop
     box and every command. Nothing here is micah_approved. */
  sources: {
    you: 'hand-drawn: a generic bust, never a likeness',
    workout: 'traced, redrawn: Spalding c. 1891 p. 88, maple wood dumb-bells (globes fitted to the trace: 3.8 and 4.0 radii apart; 3.97 here)',
    food: 'traced, redrawn: Sears No. 112 p. 101 plain tipped dessert fork (its head widened across) and p. 645 plain water tumbler (its taper)',
    weight: 'traced, redrawn: Fairbanks Dial Scales (Fairbanks, Morse and Co., 1919) p. 6, the warehouse dial scale: its profile, the dial head enlarged',
    steps: 'traced: Sears No. 112 p. 936 non-crumpling hair insole, and its reflection',
    plus: 'hand-drawn: a Greek cross',
    camera: 'hand-drawn to the proportions of Sears No. 112 p. 233, the Perfection Jr. camera, redrawn frontal',
    pen: 'hand-drawn to the proportions of Sears No. 112 p. 99, a gold pen nib, turned 45 degrees',
    barcode: 'hand-drawn: brass rules, thick and thin',
    keypad: 'hand-drawn: rimmed keys over a bar',
    book: 'hand-drawn to the proportions of Sears No. 112 p. 155, the scrap book open, its leaves ruled',
    stack: 'hand-drawn: three dishes edge-on, rim and well',
    spark: 'traced: Polhemus 1895 p. 203, index (printers\' fist) stock cut No. 431, reflected to point right',
    gear: 'hand-drawn: a plain spur gear (Grant 1893\'s gears are drawn in perspective and do not trace to an elevation)',
    gearYou: 'as gear',
    calendar: 'hand-drawn to the proportions of Sears No. 112 p. 158, calendar stand and pad; numerals and feet dropped',
    bubble: 'as spark: the same traced printers\' fist (Polhemus 1895 p. 203, stock cut No. 431), printed solid',
    lock: 'hand-drawn to the proportions of Mallory, Wheeler 1871 p. 292, padlock No. 10, silhouette only',
    unlock: 'as lock; only the shackle moves',
    glyphs: 'hand-drawn: chevrons, saltires, a dinkus, a rule and a Greek cross, a ledger tick, a hooked arrow, a triangle; edit is the nib, gear the gear',
    vessel: 'traced: Sears No. 112 p. 645, the Perfection separable water bottle, silhouette only',
    'ornaments.you': 'traced, redrawn: Spalding c. 1891 p. 88, maple wood dumb-bells, one of the crossed pair (3.9 radii apart)',
    'ornaments.workout': 'traced: Spalding c. 1891 p. 90, the Indian club in the club holder; the knob completed by hand',
    'ornaments.food': 'traced, redrawn: Sears No. 112 p. 325, the Common Sense Exerciser: two stirrup handles, two cords to a ring and screw hook',
    'ornaments.weight': 'traced, redrawn: Dio Lewis 1866 p. 29, the gymnastic ring (Figure 1): circles fitted to its two edges, the inner .88 of the outer',
    'ornaments.recap': 'hand-drawn to the proportions of Ravenstein and Hulley 1867 p. 258, the bar-bell, shortened'
  }
});
