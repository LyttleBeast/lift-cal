// Iron Age's icons — the engraved set, as data.
//
// The same shape as vibes/icons/v1.js's `icons`: every icon is { viewBox,
// stroke, fill, linecap, linejoin, els }, and els are only { tag: 'path', d },
// { tag: 'circle', cx, cy, r } and { tag: 'rect', x, y, width, height, rx } —
// exactly what vibe.js icon() and native's <Svg> know how to draw, so nothing
// here needs a renderer that does not exist. Like v1's set it imports
// nothing, is frozen all the way down (every caller shares it), and is copied
// byte for byte into rack-mobile (src/pure/vibes/icons/iron-age.js), pinned
// by sha256.
//
// THE STYLE, and why:
// - A 24-unit grid, no fill, one ink stroke, SQUARE caps and MITER joins. v1
//   is round and round (Feather's manner); a period "cut" — the engraved
//   object in a catalogue — has cut ends and sharp corners (research track
//   8b G3). This is the most visible difference between the two sets at 22pt.
// - The object in profile or frontal elevation, its silhouette plus one or
//   two defining lines (the globe's centre band, the scale's hand, the nib's
//   slit). No engraved hatching at icon size: at 22pt it turns to mud (8b G2).
// - Stroke 1.5 at the 19–22pt sites (the dock, the add tiles), 1.75 at the
//   14–17pt sites (the gears, the Coach marks, the lock, the glyphs), so a
//   line looks the same weight at every size it is drawn. Three sites fix
//   their own and win (vibe.js icon() o.stroke): the Log food button's 2.6,
//   the two estimator notices' 1.6 (spark), the dock's from the stylesheet.
// - No lettering, numerals or trade marks, ever: the calendar carries no date
//   (a date on it would be a number Rack did not print), the barcode no
//   digits, the scale no figures on its dial (R1.1, R1.3; 8b §4).
// - `spark` is never a sparkle, star, asterisk or bolt (R8.8): it is the
//   printers' fist, pointing at the sentence it marks.
//
// DRAWN BY HAND, FOR NOW. Every path below is drawn in code to its source's
// proportions (`sources`, below, names each one). Phase V traces the sourced
// forms from the period engravings in research/iron-age/originals/ with a
// deterministic tracer (imagetracerjs), simplifies each trace to this grid,
// stroke and element count, records the source in PROVENANCE.json, and may
// replace an individual path here — never the style. A hand-drawn icon with
// no period form says so and never goes in PROVENANCE.
//
// WHAT IS HERE BEYOND v1's KEYS (each needs its engine hook; the spec,
// design/iron-age.md §12 and §14 (E6, E7, E11), names them):
// - `glyphs`: drawings for the Unicode glyph sites of v1's `glyphs` (‹ › ✕ ×
//   ⋯ − + ✓ ↳ ✎ ⚙ ▾ ▴ ⚠). v1 draws them as text; no face Rack uses has ✓ ↳
//   ⚙ ✕ ⋯ ⚠ ✎ ▾ ▴, and Besley lacks the arrows too, so Iron Age draws them.
//   up / down / flat are null: ↑ ↓ → are a number's direction and stay text,
//   in Archivo, which has them. ⚙ and ⚠ inside a sentence, "tap ⋯" and
//   "a ✓ when" are copy and are never routed here (v1.js `prose`).
// - `vessel`: the water card's carafe, with its own insideBottom / insideTop,
//   because the vessel's level is a number (R1.4) — linear in the day's
//   fraction between those two lines, as v1's bottle is between 154 and 22.
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
const path = d => ({ tag: 'path', d });
const circle = (cx, cy, r) => ({ tag: 'circle', cx, cy, r });
const rect = (x, y, width, height) => ({ tag: 'rect', x, y, width, height, rx: 0 });

/* One spur gear, eight straight-flanked teeth (tip radius 9.6, root 7.2) and
   its hub: an engraver's gear from the "ready made gears" row of Grant 1893,
   not Feather's cog, so Iron Age's gear owes no MIT notice. The same drawing
   serves the Fuel and Steps gear and the You gear: v1 keeps two gears because
   they are two drawings today; here they are one. */
const GEAR = 'M10.6 4.94L10.72 2.49L13.28 2.49L13.4 4.94L16 6.01L17.82 4.37L19.63 6.18L17.99 8L19.06 10.6L21.51 10.72' +
  'L21.51 13.28L19.06 13.4L17.99 16L19.63 17.82L17.82 19.63L16 17.99L13.4 19.06L13.28 21.51L10.72 21.51L10.6 19.06L8 17.99' +
  'L6.18 19.63L4.37 17.82L6.01 16L4.94 13.4L2.49 13.28L2.49 10.72L4.94 10.6L6.01 8L4.37 6.18L6.18 4.37L8 6.01Z';
const GEAR_ELS = [path(GEAR), circle(12, 12, 2.6)];

/* A pen nib drawn point-down, then turned 45 degrees about the centre so the
   point sits lower left, as a hand holds it: shoulders, the slit from the
   point, the breather hole. Written out rather than computed at load, so a
   verifier can compare strings. */
const NIB = 'M4.93 19.07L8.46 10.73L11.58 7.62L13.7 7.47L17.23 3.94L20.06 6.77L16.53 10.3L16.38 12.42L13.27 15.54Z';
const NIB_ELS = [path(NIB), path('M4.93 19.07L10.16 13.84'), circle(11.2, 12.8, 0.35)];

/* The padlock: a heart-shaped case (Mallory, Wheeler 1871 No. 10), a keyhole,
   and the shackle — which is the only thing that moves between locked and
   unlocked, as in v1. */
const LOCK_CASE = 'M5 12.2C5 10.9 6 10 7.3 10C9.2 10 10.4 10.9 12 10.9C13.6 10.9 14.8 10 16.7 10C18 10 19 10.9 19 12.2V16C19 19 15.9 21 12 21C8.1 21 5 19 5 16Z';
const KEYHOLE = 'M12 14.2V16.6';

/* One insole, upright, its heel at the top: Sears No. 112's hair insole, the
   outline only. Two of them, the second offset up and right, as v1's steps. */
const sole = (x, y) => `M${x} ${y}c2.3 0 3.4 1.9 3.4 4.2c0 1.9-.9 3-1.1 4.5c-.1 1.1.4 1.9.4 2.8c0 1.2-1.1 1.9-2.6 1.9` +
  `s-2.5-.8-2.5-2c0-.9.5-1.6.4-2.8c-.2-1.5-1.3-2.6-1.3-4.5c0-2.3 1.2-4.2 3.3-4.2z`;

export default deepFreeze({
  id: 'iron-age',

  icons: {
    /* ---- the dock, 22pt (the stroke there comes from the vibe's stylesheet
       on the web and the site on native: 1.5) ---- */
    // A generic bust on its cut: oval head, stand collar, shoulders, the rule
    // the bust stands on. Never a likeness of anyone.
    you: icon(1.5, [path('M8.6 7.9a3.4 3.9 0 1 0 6.8 0a3.4 3.9 0 1 0-6.8 0z'),
                    path('M4.5 21v-.6c0-3.6 2.7-5.9 6-6.5M19.5 21v-.6c0-3.6-2.7-5.9-6-6.5'),
                    path('M10.3 13.8l1.7 2.2 1.7-2.2'),
                    path('M3.5 21h17')]),
    // The globe bar-bell in profile: two globes, each with its centre band
    // turned toward the bar (without the band the pair read as spectacles or
    // handcuffs at 44px), and the bar drawn as two rules, shortened to fit.
    workout: icon(1.5, [circle(5, 12, 3.6), circle(19, 12, 3.6),
                        path('M5 8.4a1.5 3.6 0 0 1 0 7.2M19 8.4a1.5 3.6 0 0 0 0 7.2'),
                        path('M8.6 11.2h6.8M8.6 12.8h6.8')]),
    // A dessert fork upright and a plain tumbler, wider at the lip, with its
    // heavy glass foot: v1's composition (fork beside a glass), period cuts.
    food: icon(1.5, [path('M4.5 3v5.2c0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5V3M7 3v5M7 10.7V21'),
                     path('M13.5 4.5h7l-1.2 16.5h-4.6z'),
                     path('M14.4 17.6h5.2')]),
    // A dial platform scale: the dial with its hand and three bare
    // graduations (no figures), the column, the platform. The beam scale was
    // tried first and read as a crane at 22pt.
    weight: icon(1.5, [circle(12, 8, 5.2),
                       path('M12 8l2.6-2.6'),
                       path('M12 3.6v1.1M7.6 8h1.1M15.3 8h1.1'),
                       path('M10.6 13.1V18M13.4 13.1V18'),
                       rect(3.5, 18, 17, 3)]),
    steps: icon(1.5, [path(sole(7, 7.6)), path(sole(17, 2.8))]),

    /* ---- the add flow, 19pt; Foods and Meals at 16 ---- */
    // A Greek cross. The Log food button draws it at its own 2.6.
    plus: icon(1.5, [path('M12 4.5v15M4.5 12h15')]),
    // A box camera, front: the box, its stiff carrying strap, the lens and
    // its rim, the finder window.
    camera: icon(1.5, [rect(3.5, 7.5, 17, 12.5), path('M9.5 7.5V5h5v2.5'),
                       circle(12, 13.8, 3.3), circle(12, 13.8, 1.1), rect(15.8, 9.3, 2.4, 1.8)]),
    pen: icon(1.5, NIB_ELS),
    // Brass rules, thick and thin, square-ended, no digits: the print shop's
    // own drawing of a barcode. A thick rule is two strokes a unit apart, so
    // it stays thick at every stroke a site may set.
    barcode: icon(1.5, [path('M3.6 5.5v13M4.6 5.5v13'), path('M7.6 5.5v13'), path('M10.4 5.5v13'),
                        path('M13.2 5.5v13M14.2 5.5v13'), path('M17.2 5.5v13'), path('M19.8 5.5v13M20.8 5.5v13')]),
    // Rimmed keys, three by two, over a space bar, in a keyline box.
    keypad: icon(1.5, [rect(3.5, 4, 17, 16),
                       circle(8, 8.6, 1.1), circle(12, 8.6, 1.1), circle(16, 8.6, 1.1),
                       circle(8, 12.4, 1.1), circle(12, 12.4, 1.1), circle(16, 12.4, 1.1),
                       path('M8 16.4h8')]),
    // An open ledger, its leaves ruled (the scrap book's portrait left out).
    book: icon(1.5, [path('M12 6.6C10 5.3 7.1 4.8 3.5 5.1v13.4c3.6-.3 6.5.2 8.5 1.5c2-1.3 4.9-1.8 8.5-1.5V5.1c-3.6-.3-6.5.2-8.5 1.5zM12 6.6V20'),
                     path('M6 9.8h3.8M6 12.8h3.8M14.2 9.8H18M14.2 12.8H18')]),
    // Three dishes stacked, seen edge-on: each a rim with its well dipping
    // under it. Three flat trapezoids read as a menu ("hamburger") at 16px.
    stack: icon(1.5, [path('M3 6.5H21M6 6.5C7.6 8.7 16.4 8.7 18 6.5'),
                      path('M3 11.5H21M6 11.5C7.6 13.7 16.4 13.7 18 11.5'),
                      path('M3 16.5H21M6 16.5C7.6 18.7 16.4 18.7 18 16.5')]),
    // The printers' fist (manicule): a plain cuff band, the back of the hand
    // running out to the pointing finger, three curled fingers under it.
    // Drawn at 16px with the notice sites' 1.6.
    spark: icon(1.6, [rect(2.5, 8, 3, 8.5),
                      path('M5.5 9.3c1.6-1 3.4-1.5 5.3-1.5h9.6a1.2 1.2 0 0 1 0 2.4H13.2'),
                      path('M13.2 10.2c1 0 1.6.5 1.6 1.2s-.6 1.2-1.6 1.2c1 0 1.6.5 1.6 1.2s-.6 1.2-1.6 1.2c.9 0 1.4.5 1.4 1.1s-.5 1.1-1.4 1.1H5.5')]),

    /* ---- the gears (16–17pt), the calendar (19), Coach's marks (14–15) ---- */
    gear: icon(1.75, GEAR_ELS),
    gearYou: icon(1.75, GEAR_ELS),
    // A desk-calendar pad on its two wire posts, a head rule across the leaf.
    // No numerals and no month; the stand's feet are dropped (with them it
    // read as a stool).
    calendar: icon(1.5, [rect(4, 5.5, 16, 15), path('M4 9.8h16'), path('M8 3v4.5M16 3v4.5')]),
    // A speech balloon with a short tail. Never the manicule: that is spark's.
    bubble: icon(1.75, [path('M12 3.8c4.8 0 8.5 3 8.5 6.7s-3.7 6.7-8.5 6.7c-1 0-1.9-.1-2.8-.4L4.5 20l1.2-4.2C4.3 14.5 3.5 12.6 3.5 10.5C3.5 6.8 7.2 3.8 12 3.8z')]),
    lock: icon(1.75, [path(LOCK_CASE), path(KEYHOLE), path('M8.2 10.2V7.4a3.8 3.8 0 0 1 7.6 0v2.8')]),
    unlock: icon(1.75, [path(LOCK_CASE), path(KEYHOLE), path('M8.2 10.2V7.4a3.8 3.8 0 0 1 7.3-1.6')])
  },

  /* The glyph keys of vibes/icons/v1.js `glyphs`, drawn at 1.75 in the site's
     own colour and size. Each replaces its character at the glyph-only sites
     v1.js lists; the character's accessible name (native NavBtn's "Previous
     day") stays the site's. */
  glyphs: {
    prev:     icon(1.75, [path('M14.5 5.5L8 12l6.5 6.5')]),
    next:     icon(1.75, [path('M9.5 5.5L16 12l-6.5 6.5')]),
    back:     icon(1.75, [path('M14.5 5.5L8 12l6.5 6.5')]),
    go:       icon(1.75, [path('M9.5 5.5L16 12l-6.5 6.5')]),
    // A saltire; the × dismiss is the same, a size smaller.
    close:    icon(1.75, [path('M6.5 6.5l11 11M17.5 6.5l-11 11')]),
    dismiss:  icon(1.75, [path('M7.5 7.5l9 9M16.5 7.5l-9 9')]),
    // A dinkus: three spaced points in a row (the copy calls them "the dots",
    // so they stay three round dots in a row).
    more:     icon(1.75, [circle(5.5, 12, 0.9), circle(12, 12, 0.9), circle(18.5, 12, 0.9)]),
    minus:    icon(1.75, [path('M5.5 12h13')]),
    plus:     icon(1.75, [path('M12 5.5v13M5.5 12h13')]),
    // A ledger tick, the clerk's check mark.
    check:    icon(1.75, [path('M5 12.8l4.2 4.2L19.5 6.5')]),
    // A hooked arrow, the drop set's ↳.
    drop:     icon(1.75, [path('M7 4.5v8c0 1.4 1.1 2.5 2.5 2.5h9.5M15.5 11.5L19 15l-3.5 3.5')]),
    edit:     icon(1.75, NIB_ELS),
    gear:     icon(1.75, GEAR_ELS),
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

  /* The water card's vessel: a carafe (Sears No. 112, p. 645), silhouette
     only — the cut-glass pattern is never drawn. v1's viewBox, so it sits in
     the same box. `d` is the outline and doubles as the clip path, as v1's
     bottle's does. The level is linear in the day's fraction between
     insideBottom (the bowl's floor) and insideTop (its shoulder): a full day
     fills the bowl and leaves the neck empty. No cap: a carafe has its lip. */
  vessel: {
    viewBox: '0 0 104 168',
    stroke: 3,
    d: 'M30 6H74L64 16V50C64 54 70 57 76 61C90 70 98 86 98 106C98 127 86 143 70 150L72 160H32L34 150C18 143 6 127 6 106C6 86 14 70 28 61C34 57 40 54 40 50V16Z',
    insideBottom: 150,
    insideTop: 58,
    cap: null
  },

  /* The tailpiece: the one ornament a long screen may end on, centred 32
     under its last box, in ink, hidden from assistive tech. One per screen,
     never inside data, keyed by where it sits. */
  ornaments: {
    you: { viewBox: '0 0 48 24', stroke: 1.5, els: [circle(8, 12, 6), circle(40, 12, 6),
           path('M4.8 10.4C5.3 8.7 6.6 7.5 8.3 7.2'), path('M36.8 10.4C37.3 8.7 38.6 7.5 40.3 7.2'),
           path('M14 12H34'), path('M17 9.5V14.5M31 9.5V14.5')] },
    workout: { viewBox: '0 0 24 48', stroke: 1.5, els: [
           path('M10.6 3.5H13.4V6.2C13.4 7.3 12.9 7.9 12.9 9.2C12.9 12.5 16.6 19 16.6 29.5C16.6 38 14.8 43 12 44.5C9.2 43 7.4 38 7.4 29.5C7.4 19 11.1 12.5 11.1 9.2C11.1 7.9 10.6 7.3 10.6 6.2Z'),
           path('M9.4 23.5H14.6')] },
    food: { viewBox: '0 0 48 24', stroke: 1.5, els: [path('M4 7V17M4 7H8M4 17H8'), path('M44 7V17M44 7H40M44 17H40'),
           path('M8 9.5C14 8.5 34 8.5 40 9.5M8 12C14 11 34 11 40 12M8 14.5C14 13.5 34 13.5 40 14.5')] },
    weight: { viewBox: '0 0 32 32', stroke: 1.5, els: [circle(16, 16, 12), circle(16, 16, 8.5)] },
    recap: { viewBox: '0 0 64 24', stroke: 1.5, els: [circle(8, 12, 6.5), circle(56, 12, 6.5),
           path('M4.6 10.2C5.1 8.4 6.5 7.1 8.3 6.8'), path('M52.6 10.2C53.1 8.4 54.5 7.1 56.3 6.8'),
           path('M14.5 10.8H49.5M14.5 13.2H49.5')] },
    steps: null
  },

  /* Where each drawing comes from. "#n" is research/iron-age's
     PROVENANCE.engravings.draft.json entry; Phase V traces that source and
     records it in vibes/iron-age/PROVENANCE.json. "hand-drawn" has no period
     form and is never in PROVENANCE. Nothing here is micah_approved. */
  sources: {
    you: 'hand-drawn: a generic bust, never a likeness',
    workout: 'no. 29, Ravenstein and Hulley 1867 p. 258, globe bar-bell (Tier A); the centre band from no. 4, Spalding c. 1891 globe bells; bar shortened',
    food: 'no. 18 dessert fork and no. 19 plain tumbler, Sears No. 112 (c. 1902) pp. 101, 645',
    weight: 'Fairbanks, Morse and Co., Fairbanks Dial Scales (1919; research track 7 item H, IA fairbanksdialsca00fair): needs its own PROVENANCE entry before a trace; fallback no. 7, Spalding c. 1891 beam scale',
    steps: 'no. 25, Sears No. 112 p. 936 hair insole, outline only',
    plus: 'hand-drawn: a Greek cross',
    camera: 'no. 22, Sears No. 112 p. 233 box camera, redrawn frontal',
    pen: 'no. 21, Sears No. 112 p. 99 gold nib, its numeral dropped, turned 45 degrees',
    barcode: 'hand-drawn: ATF 1912 brass rules, thick and thin',
    keypad: 'hand-drawn: rimmed keys over a bar',
    book: 'no. 14, Sears No. 112 p. 155 scrap book, the portrait left out, the leaves ruled',
    stack: 'hand-drawn: three dishes edge-on, rim and well',
    spark: 'nos. 26 / 27, Polhemus 1895 p. 203 printers\' fist, in outline',
    gear: 'no. 11, Grant 1893, one spur gear (backup no. 10)',
    gearYou: 'as gear',
    calendar: 'no. 23, Sears No. 112 p. 158 calendar stand and pad; numerals and feet dropped',
    bubble: 'hand-drawn: a speech balloon',
    lock: 'no. 17, Mallory, Wheeler 1871 No. 10 padlock, silhouette only (backup no. 13)',
    unlock: 'as lock; only the shackle moves',
    glyphs: 'hand-drawn: chevrons, saltires, a dinkus, a rule and a Greek cross, a ledger tick, a hooked arrow, a triangle; edit is the nib, gear the gear',
    vessel: 'no. 20, Sears No. 112 p. 645 water bottle (carafe), silhouette only',
    'ornaments.you': 'no. 4, Spalding c. 1891 p. 88 globe dumbbell (one of the crossed pair, drawn alone)',
    'ornaments.workout': 'no. 6, Spalding c. 1891 p. 90 Indian club, its knob completed by hand',
    'ornaments.food': 'no. 12, Sears No. 112 p. 325 chest exerciser: two handles, three cords',
    'ornaments.weight': 'no. 16, Dio Lewis 1866 p. 29 wooden ring',
    'ornaments.recap': 'no. 29, Ravenstein and Hulley 1867 p. 258 globe bar-bell, at its own proportion'
  }
});
