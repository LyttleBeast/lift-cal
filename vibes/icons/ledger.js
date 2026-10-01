// Ledger's icons: drawn by rule, in the record book's ruled-pen grammar.
//
// The same shape as vibes/icons/v1.js's `icons`: every icon is { viewBox,
// stroke, fill, linecap, linejoin, els }, and els are only { tag: 'path', d },
// { tag: 'circle', cx, cy, r } and { tag: 'rect', x, y, width, height, rx } —
// exactly what vibe.js icon() and native's icons.jsx know how to draw. Like
// v1's set it imports nothing, is frozen all the way down (every caller shares
// it), and is copied byte for byte into rack-mobile
// (src/pure/vibes/icons/ledger.js), pinned by sha256.
//
// THE GRAMMAR, and why:
// - One pen: SQUARE caps and MITRE joins, strokes ruled straight or turned on
//   a circle, corners square (every rect rx 0). A ledger's rules are drawn
//   with a ruling pen, not a marker; v1's round-and-round is the Feather
//   grammar research lists as a tell (track 1 A20).
// - v1's grid (24 units, live area about 3-21) and v1's stroke widths per
//   site: 1.9 the dock and the Coach marks, 1.8 the add tiles, 1.7 the
//   calendar, 1.6 the gear. The sites that fix their own (the Log food + at
//   2.6, the estimator notices at 1.6, the web dock from its stylesheet) still
//   win. Every dock drawing reads at 22pt (tools/ledger-spec/icons-sheet.mjs
//   renders the set at 16, 22 and 48 on the page green).
// - Its OWN drawings, not v1's re-capped: Meet Day already ships v1's paths
//   with square caps, and a set of its own is Ledger's answer to "the icons
//   are v1's". Where v1's form is the object (the barbell's plates would be,
//   but Train here is the kettlebell), the object is redrawn, never traced
//   from a library. v1's gear is Feather's (MIT) and its Coach balloon is
//   Feather's message-circle: both are drawn fresh here.
// - No numeral, letter or date inside any icon (R1.3): the calendar is a
//   ruled leaf with no day on it.
// - `spark` is never a sparkle, star, asterisk or bolt (SYNTHESIS finding 6,
//   R8.8). It is a slip of paper tucked in the book, corner folded, two lines
//   ruled on it: both notices it marks are notes about the estimator ("Photo
//   and Describe are off for this account …", "… need the estimator
//   connected"). Not a pilcrow (it marks a paragraph, and reads as affected)
//   and not a circled i (the stock "info" glyph).
// - Glyphs: drawn only where Manuale has no glyph and the character would
//   fall to the system face (or to a colour emoji on iOS, for ⚙ and ⚠):
//   ✕ ⋯ ✓ ↳ ✎ ⚙ ⚠ ▾ ▴. Manuale has ‹ › × − + ↑ ↓ →, so those stay type, in
//   the vibe's own face (null). ⚙ and ⚠ inside a sentence, "tap ⋯" and "a ✓
//   when" are copy and are never routed here (v1.js `prose`).
// - No vessel and no ornaments: the water bottle is v1's (its level is a
//   number, R1.4), and a record book has no fleurons.
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
const path = d => ({ tag: 'path', d });
const circle = (cx, cy, r) => ({ tag: 'circle', cx, cy, r });
const rect = (x, y, width, height) => ({ tag: 'rect', x, y, width, height, rx: 0 });

/* The gear: eight square teeth on an octagonal ring, every edge radial or
   tangent, over a hub — one drawing for Fuel's, Steps' and You's gears (v1
   draws two different Feather gears). */
const GEAR = 'M19 10.4L21.5 10.4L21.5 13.6L19 13.6L18.08 15.82L19.85 17.59L17.59 19.85L15.82 18.08L13.6 19L13.6 21.5L10.4 21.5L10.4 19L8.18 18.08L6.41 19.85L4.15 17.59L5.92 15.82L5 13.6L2.5 13.6L2.5 10.4L5 10.4L5.92 8.18L4.15 6.41L6.41 4.15L8.18 5.92L10.4 5L10.4 2.5L13.6 2.5L13.6 5L15.82 5.92L17.59 4.15L19.85 6.41L18.08 8.18Z';
const GEAR_ELS = [path(GEAR), circle(12, 12, 3)];

/* The pencil: a ruled shaft at 45 degrees, its ferrule ruled across. */
const PENCIL = [path('M5 19v-4L15 5l4 4L9 19z'), path('M12.5 7.5l4 4')];

/* The lock's body, square-cornered; its shackle squared off at 45 degrees
   like the kettlebell's handle. Only the shackle moves between the two. */
const LOCK_BODY = rect(4, 10.5, 16, 10);

export default deepFreeze({
  id: 'ledger',

  icons: {
    /* The dock. */
    // a head and squared shoulders
    you:     icon(1.9, [circle(12, 7.5, 3.5), path('M4.5 21v-3.5L8 14h8l3.5 3.5V21')]),
    // Train: a kettlebell — a round bell, the handle squared at 45 degrees and
    // meeting the bell where its legs cross the circle (y 9.38)
    workout: icon(1.9, [circle(12, 14.5, 6.5), path('M8 9.4V5.5l2-2h4l2 2v3.9')]),
    // Fuel: a three-tined fork and a knife with a 45-degree point
    food:    icon(1.9, [path('M5 3v6h4V3M7 3v6M7 9v12'), path('M16 21V3l3 3v7h-3')]),
    // Weight: a platform scale seen from above — the body, the dial window as
    // a half-disc on its rule, the needle
    weight:  icon(1.9, [rect(4, 4, 16, 16), path('M6.5 11a5.5 5.5 0 0 1 11 0z'), path('M12 11l3-3')]),
    // Steps: two soles a stride apart, each one outline — the ball turned on a
    // circle, the sides ruled in to a narrower heel. (Concept B's soles with
    // the heel ruled off, and a sole with a separate heel, both read as "00"
    // or "8" at 16px: the 1.9 stroke closes their gaps.)
    steps:   icon(1.9, [path('M4 9.5a3 3 0 0 1 6 0l-.6 9a2.2 2.2 0 0 1-4.4 0z'),
                        path('M14 5a3 3 0 0 1 6 0l-.6 9a2.2 2.2 0 0 1-4.4 0z')]),

    /* The add tiles and the Fuel buttons. */
    plus:    icon(1.8, [path('M12 5v14'), path('M5 12h14')]),
    camera:  icon(1.8, [rect(3, 7, 18, 13), path('M8 7V4.5h8V7'), circle(12, 13.5, 3.6)]),
    pen:     icon(1.8, PENCIL),
    barcode: icon(1.8, [path('M4 5v14'), path('M7.5 5v14'), path('M10.5 5v10'), path('M13.5 5v14'),
                        path('M16.5 5v10'), path('M20 5v14')]),
    // nine keys as square points under square caps
    keypad:  icon(1.8, [rect(4, 4, 16, 16), path('M8.5 8.5h.01M12 8.5h.01M15.5 8.5h.01'),
                        path('M8.5 12h.01M12 12h.01M15.5 12h.01'), path('M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01')]),
    // Foods: an open book, its gutter ruled
    book:    icon(1.8, [path('M3 5h7l2 2 2-2h7v14h-7l-2 2-2-2H3z'), path('M12 7v14')]),
    // Meals: a cloche on its tray — a half-circle dome, a knob, a rule. Never
    // three stacked lines (that is a menu icon)
    stack:   icon(1.8, [path('M3 17.5h18'), path('M5 17.5a7 7 0 0 1 14 0'), path('M12 10.5V8')]),
    // the estimator notices' mark: a slip tucked in the book (see above)
    spark:   icon(1.6, [path('M6 3h8.5L18 6.5V21H6z'), path('M14.5 3v3.5H18'), path('M9 12h6'), path('M9 16h6')]),

    gear:     icon(1.6, GEAR_ELS),
    gearYou:  icon(1.8, GEAR_ELS),
    // a calendar leaf ruled like a ledger page: header rule, two rings, two
    // ruled lines — and no date, ever
    calendar: icon(1.7, [rect(3, 5, 18, 16), path('M3 10h18M8 3v4M16 3v4'), path('M7 14h10M7 17.5h10')]),

    /* Coach's mark and lock. */
    // a square speech balloon with a 45-degree tail
    bubble: icon(1.9, [path('M3.5 4h17v12H11l-5 4.5V16H3.5z')]),
    lock:   icon(1.9, [LOCK_BODY, path('M8 10.5V6l2-2.5h4L16 6v4.5')]),
    unlock: icon(1.9, [LOCK_BODY, path('M8 10.5V6l2-2.5h4L16 6')])
  },

  /* The glyph keys of vibes/icons/v1.js `glyphs`, drawn at 2 in the site's
     own colour and size, square caps, mitred. Each replaces its character at
     the glyph-only sites v1.js lists, keeping the accessible name the
     character gave (vibe.js glyphed; native NavBtn's label). null keeps the
     text, in Manuale. */
  glyphs: {
    prev: null, next: null, back: null, go: null,
    // a saltire
    close:    icon(2, [path('M6 6l12 12M18 6L6 18')]),
    dismiss:  null,
    // three square points on the midline
    more:     icon(3, [path('M6 12h.01M12 12h.01M18 12h.01')]),
    minus: null, plus: null,
    // the ruled tick: the set check's done mark, the block check, the food
    // and verdict ticks (Manuale has no ✓; v1's falls to the system face)
    check:    icon(2, [path('M5 12.5l4.5 4.5L19 7.5')]),
    // the drop set's hook: down, then along to the arrowhead
    drop:     icon(2, [path('M7 4v9h11'), path('M15 10l3 3-3 3')]),
    edit:     icon(2, PENCIL),
    // native Fuel's ⚙ button: the gear, at the glyph's weight
    gear:     icon(2, GEAR_ELS),
    expand:   icon(2, [path('M7 10l5 5 5-5')]),
    collapse: icon(2, [path('M7 14l5-5 5 5')]),
    // a triangle with its bar and a square point: the sentence it leads keeps its words
    warn:     icon(2, [path('M12 3.5L21 20H3z'), path('M12 9.5v5'), path('M12 17.5h.01')]),
    up: null, down: null, flat: null
  }
});
