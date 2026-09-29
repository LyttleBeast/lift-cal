// Meet Day's icons: v1's own drawings, re-cut for a square board.
//
// The same shape as vibes/icons/v1.js's `icons`: every icon is { viewBox,
// stroke, fill, linecap, linejoin, els }, and els are only { tag: 'path', d },
// { tag: 'circle', cx, cy, r } and { tag: 'rect', x, y, width, height, rx } —
// exactly what vibe.js icon() and native's icons.jsx know how to draw. Like v1's set it imports nothing,
// is frozen all the way down (every caller shares it), and is copied byte for
// byte into rack-mobile (src/pure/vibes/icons/meet-day.js), pinned by sha256.
//
// THE STYLE, and why:
// - v1's path data, point for point, so every icon still reads at 22pt on the
//   dock exactly as it does today. What changes is the cut: SQUARE caps and
//   MITRE joins instead of v1's round-and-round, the pen grammar of Feather
//   that research lists as a tell (track 1 A20). A stroke end on this board is
//   cut square like a panel's edge, and the keypad's dots become square LED
//   points. The two rectangles (the calendar, the lock's body) lose their 2
//   unit corner radius for the same reason.
// - v1's stroke widths, unchanged: 1.9 on the dock and the Coach marks, 1.8 on
//   the add tiles, 1.7 on the calendar, 1.6 on the gear. The sites that fix
//   their own (the Log food + at 2.6, the estimator notices at 1.6, the web
//   dock from its stylesheet) still win.
// - The dock's identity comes from its inverted cell (dock · board), not from
//   new pictograms: nothing here is redrawn that he has learned to find.
// - `spark` is never a sparkle, star, asterisk or bolt (SYNTHESIS finding 6,
//   R8.8). It is a plug: both notices it marks are about the estimator's
//   connection ("Photo and Describe are off for this account …", "… need the
//   estimator connected"), so the mark says what the sentence says.
// - The glyph-only sites (v1.js `glyphs`) are drawn in the same grammar where
//   Archivo has no glyph and the character would fall to the system face (or
//   to a colour emoji on iOS, for ⚙ and ⚠): ✕ ⋯ ↳ ✎ ⚙ ⚠ ▾ ▴. ✓ stays text:
//   the set check's lamp stands for it in setRow · attempt, and anywhere else
//   ("✓ At goal", the block check, native's food and verdict ticks) a drawn
//   disc would read as a bullet. ‹ › × − + ↑ ↓ → are null too: Archivo has
//   every one of them, so they stay type. ⚙ and ⚠ inside a sentence, "tap ⋯"
//   and "a ✓ when" are copy and are never routed here (v1.js `prose`).
// - No vessel and no ornaments: the water bottle is v1's (its level is a
//   number), and a board has no fleurons.
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

/* v1's two gears, verbatim (vibes/icons/v1.js GEAR_OUTLINE, GEAR_YOU_*). */
const GEAR_OUTLINE = 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z';
const GEAR_YOU_HUB = 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z';
const GEAR_YOU_OUTLINE = 'M19.5 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.5 1.5 0 0 0-2.6 1.1v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.5 1.5 0 0 0-2.6-1.1l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.5 1.5 0 0 0-1.1-2.6h-.2a1.9 1.9 0 1 1 0-3.8h.1a1.5 1.5 0 0 0 1.1-2.6l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.5 1.5 0 0 0 2.6-1.1v-.2a1.9 1.9 0 1 1 3.8 0v.1a1.5 1.5 0 0 0 2.6 1.1l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.5 1.5 0 0 0 1.1 2.6h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.5 1.5 0 0 0-1.4.9z';

// v1's hub, the same circle element v1 draws (both renderers draw it).
const GEAR_ELS = [{ tag: 'circle', cx: 12, cy: 12, r: 3 }, path(GEAR_OUTLINE)];

// The lock's body, square-cornered; the shackle is the only thing that moves
// between the two locks, as in v1.
const LOCK_BODY = { tag: 'rect', x: 4, y: 10.5, width: 16, height: 10, rx: 0 };

export default deepFreeze({
  id: 'meet-day',

  icons: {
    /* The dock: v1's five, re-cut. */
    you:     icon(1.9, [path('M8.4 8.2a3.6 3.6 0 1 0 7.2 0 3.6 3.6 0 1 0-7.2 0z'),
                        path('M5 20c.4-3.7 3.4-5.8 7-5.8s6.6 2.1 7 5.8')]),
    workout: icon(1.9, [path('M4 9v6M20 9v6M7 6v12M17 6v12M7 12h10')]),
    food:    icon(1.9, [path('M6 3v8a3 3 0 0 0 6 0V3M9 11v10M18 3c-1.5 2-2 4-2 6s.5 3 2 3 2-1 2-3-.5-4-2-6zM18 12v9')]),
    weight:  icon(1.9, [path('M3 17l5-6 4 3 5-7 4 5'), path('M3 21h18')]),
    steps:   icon(1.9, [path('M7 20c-1.7 0-2.7-1.2-2.4-2.9.2-1.3.9-2.3.9-3.6 0-1-.3-1.8-.3-2.8C5.2 8.5 6.5 7 8.4 7c1.8 0 2.9 1.3 2.9 3.1 0 1.4-.5 2.5-.5 3.9 0 1.1.4 1.9.4 3 0 1.9-1.2 3-2.9 3z'),
                        path('M16.4 16c1.7 0 2.7-1.2 2.4-2.9-.2-1.3-.9-2.3-.9-3.6 0-1 .3-1.8.3-2.8C18.2 4.5 16.9 3 15 3c-1.8 0-2.9 1.3-2.9 3.1 0 1.4.5 2.5.5 3.9 0 1.1-.4 1.9-.4 3 0 1.9 1.2 3 2.9 3z')]),

    /* The add tiles and the Fuel buttons (food.js ICON_PATHS), re-cut. The
       keypad's six .01 strokes become square LED points under square caps. */
    plus:    icon(1.8, [path('M12 5v14'), path('M5 12h14')]),
    camera:  icon(1.8, [path('M4 9a2 2 0 0 1 2-2h1.5l1.2-2h6.6l1.2 2H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z'),
                        path('M12 16.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z')]),
    pen:     icon(1.8, [path('M4 20h4L18.5 9.5a2.6 2.6 0 0 0-3.7-3.7L4 16.3z'), path('M13.6 7.1l3.7 3.7')]),
    barcode: icon(1.8, [path('M3 6v12'), path('M6.5 6v12'), path('M10 6v8'), path('M13.5 6v12'),
                        path('M17 6v8'), path('M20.5 6v12')]),
    keypad:  icon(1.8, [path('M4 5h16v14H4z'), path('M8 9h.01'), path('M12 9h.01'), path('M16 9h.01'),
                        path('M8 13h.01'), path('M12 13h.01'), path('M16 13h.01'), path('M8.5 17h7')]),
    book:    icon(1.8, [path('M5 5a2 2 0 0 1 2-2h12v18H7a2 2 0 0 1-2-2z'), path('M5 17h14')]),
    stack:   icon(1.8, [path('M12 3l8 4.3-8 4.3-8-4.3z'), path('M4 11.8L12 16l8-4.2'), path('M4 16.2L12 20.5l8-4.3')]),
    // The plug: two prongs 6 units apart, a flat-topped body closed by a
    // half-round, and its cord. Drawn at the notices' fixed 1.6 and 16px, in
    // warn as v1's spark is; the prongs stay distinct at that size.
    spark:   icon(1.6, [path('M9 3.5V8'), path('M15 3.5V8'), path('M6.5 8h11v3a5.5 5.5 0 0 1-11 0z'), path('M12 16.5v4')]),

    gear:     icon(1.6, GEAR_ELS),
    gearYou:  icon(1.8, [path(GEAR_YOU_HUB), path(GEAR_YOU_OUTLINE)]),
    // No date on it, ever (R1.3): a calendar icon carries no number.
    calendar: icon(1.7, [{ tag: 'rect', x: 3, y: 5, width: 18, height: 16, rx: 0 }, path('M3 10h18M8 3v4M16 3v4')]),

    /* Coach's mark and lock, re-cut. */
    bubble: icon(1.9, [path('M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-2.6-.3L3 21l1.4-4.1A8.1 8.1 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z')]),
    lock:   icon(1.9, [LOCK_BODY, path('M8 10.5V7a4 4 0 0 1 8 0v3.5')]),
    unlock: icon(1.9, [LOCK_BODY, path('M8 10.5V7a4 4 0 0 1 7.5-1.9')])
  },

  /* The glyph keys of vibes/icons/v1.js `glyphs`, drawn at 2 in the site's own
     colour and size, square caps, mitred. Each replaces its character at the
     glyph-only sites v1.js lists, keeping the accessible name the character
     gave (vibe.js glyphed; native NavBtn's label). null keeps the text. */
  glyphs: {
    prev: null, next: null, back: null, go: null,
    close:    icon(2, [path('M6 6l12 12M18 6L6 18')]),
    dismiss:  null,
    // Three square LED points on the midline.
    more:     icon(3, [path('M6 12h.01M12 12h.01M18 12h.01')]),
    minus: null, plus: null,
    check: null,
    // The drop set's hook: down, then along to the arrowhead.
    drop:     icon(2, [path('M7 5v9h10'), path('M14 11l3 3-3 3')]),
    edit:     icon(2, [path('M5 19h3.5L19 8.5 15.5 5 5 15.5z'), path('M13 7.5l3.5 3.5')]),
    // Native Fuel's ⚙ button: the gear, at the glyph's weight.
    gear:     icon(2, GEAR_ELS),
    expand:   icon(2, [path('M7 10l5 5 5-5')]),
    collapse: icon(2, [path('M7 14l5-5 5 5')]),
    // A triangle with its bar and a square point: the sentence it leads keeps its words.
    warn:     icon(2, [path('M12 4L21 20H3z'), path('M12 9.5v4'), path('M12 16.5h.01')]),
    up: null, down: null, flat: null
  }
});
