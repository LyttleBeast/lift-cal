// v1's icons — today's, exactly, as data.
//
// Rack has no icon system: every icon is an inline SVG written out at its call
// site, on a 24x24 viewBox, unfilled, stroked with round caps and joins (in
// currentColor on the web, in a named T colour on native). This file is those SVGs copied out verbatim — path strings, circle
// and rect geometry, stroke widths — so a vibe can swap an icon by name and v1
// can be drawn from here with nothing on screen moving. Like the vibe
// definitions it imports nothing, is frozen all the way down (every caller
// shares it), and is copied byte for byte into rack-mobile
// (src/pure/vibes/icons/v1.js), pinned by sha256.
//
// An icon: { viewBox, stroke, fill, linecap, linejoin, els } where els are
// { tag: 'path', d } | { tag: 'circle', cx, cy, r } | { tag: 'rect', x, y,
// width, height, rx }. `stroke` is the width a site draws it at unless the
// site says otherwise (sites, below).
//
// The trees agree on every path string: tools-check/vibes-contract.mjs holds
// the web's sources at rack-v58 to this file, and
// tools/verify-vibes-contract.mjs holds native's at build 58 to it. Where they
// do not agree is WHICH sites draw an icon: native draws the Fuel gear as the
// ⚙ glyph, and draws no icon on the Foods / Meals buttons (both draw the book
// on the ingredient sheet's hero add tile), and the water preset's remove
// button is '×' on the web and '✕' on native.

const icon = (stroke, els) =>
  ({ viewBox: '0 0 24 24', stroke, fill: 'none', linecap: 'round', linejoin: 'round', els });
const path = d => ({ tag: 'path', d });

/* The gear on Fuel and Steps (food.js:529, steps.js:159, native steps.jsx:113):
   a hub circle and one long outline. */
const GEAR_OUTLINE = 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z';

/* The gear on You (you.js:694, native you/Hero.jsx:40) is a DIFFERENT drawing:
   a path hub, a smaller-toothed outline, stroke 1.8. It is the only way into
   Settings, so it is kept as its own icon rather than folded into `gear`. */
const GEAR_YOU_HUB = 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z';
const GEAR_YOU_OUTLINE = 'M19.5 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.5 1.5 0 0 0-2.6 1.1v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.5 1.5 0 0 0-2.6-1.1l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.5 1.5 0 0 0-1.1-2.6h-.2a1.9 1.9 0 1 1 0-3.8h.1a1.5 1.5 0 0 0 1.1-2.6l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.5 1.5 0 0 0 2.6-1.1v-.2a1.9 1.9 0 1 1 3.8 0v.1a1.5 1.5 0 0 0 2.6 1.1l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.5 1.5 0 0 0 1.1 2.6h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.5 1.5 0 0 0-1.4.9z';

const LOCK_BODY = { tag: 'rect', x: 4, y: 10.5, width: 16, height: 10, rx: 2 };

// Inline, not imported: this file imports nothing.
const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

export default deepFreeze({
  id: 'v1',

  icons: {
    /* The dock, index.html:98-128 and native Dock.jsx:23 (copied from it). */
    you:     icon(1.9, [path('M8.4 8.2a3.6 3.6 0 1 0 7.2 0 3.6 3.6 0 1 0-7.2 0z'),
                        path('M5 20c.4-3.7 3.4-5.8 7-5.8s6.6 2.1 7 5.8')]),
    workout: icon(1.9, [path('M4 9v6M20 9v6M7 6v12M17 6v12M7 12h10')]),
    food:    icon(1.9, [path('M6 3v8a3 3 0 0 0 6 0V3M9 11v10M18 3c-1.5 2-2 4-2 6s.5 3 2 3 2-1 2-3-.5-4-2-6zM18 12v9')]),
    weight:  icon(1.9, [path('M3 17l5-6 4 3 5-7 4 5'), path('M3 21h18')]),
    steps:   icon(1.9, [path('M7 20c-1.7 0-2.7-1.2-2.4-2.9.2-1.3.9-2.3.9-3.6 0-1-.3-1.8-.3-2.8C5.2 8.5 6.5 7 8.4 7c1.8 0 2.9 1.3 2.9 3.1 0 1.4-.5 2.5-.5 3.9 0 1.1.4 1.9.4 3 0 1.9-1.2 3-2.9 3z'),
                        path('M16.4 16c1.7 0 2.7-1.2 2.4-2.9-.2-1.3-.9-2.3-.9-3.6 0-1 .3-1.8.3-2.8C18.2 4.5 16.9 3 15 3c-1.8 0-2.9 1.3-2.9 3.1 0 1.4.5 2.5.5 3.9 0 1.1-.4 1.9-.4 3 0 1.9 1.2 3 2.9 3z')]),

    /* food.js ICON_PATHS + icon(name, width) (:1158-1177); native
       food/common.jsx ICON_PATHS + FoodIcon. 1.8 is icon()'s default width. */
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
    spark:   icon(1.8, [path('M12 3.5l1.7 4.6 4.6 1.7-4.6 1.7L12 16.1l-1.7-4.6L5.7 9.8l4.6-1.7z')]),

    gear:     icon(1.6, [{ tag: 'circle', cx: 12, cy: 12, r: 3 }, path(GEAR_OUTLINE)]),
    gearYou:  icon(1.8, [path(GEAR_YOU_HUB), path(GEAR_YOU_OUTLINE)]),
    // workout.js:1013, native workout/session.jsx:320
    calendar: icon(1.7, [{ tag: 'rect', x: 3, y: 5, width: 18, height: 16, rx: 2 }, path('M3 10h18M8 3v4M16 3v4')]),

    /* coach-ui.js bubbleIcon() / lockIcon(pro), native coach/Card.jsx Mark /
       Lock. The shackle is the only thing that moves between the two locks. */
    bubble: icon(1.9, [path('M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-2.6-.3L3 21l1.4-4.1A8.1 8.1 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z')]),
    lock:   icon(1.9, [LOCK_BODY, path('M8 10.5V7a4 4 0 0 1 8 0v3.5')]),
    unlock: icon(1.9, [LOCK_BODY, path('M8 10.5V7a4 4 0 0 1 7.5-1.9')])
  },

  /* Where each icon is drawn today, and how, so a renderer reproduces the
     markup and the host props exactly. `at` is file:line at the base commits
     (web 928a65e, native 1cb6498); null means that client draws no icon there.
     The list is complete — every inline <svg>, icon(), bubbleIcon() and
     lockIcon() on the web and every <Svg>, <FoodIcon>, <Mark> and <Lock> on
     native is a site here or, in the verifiers, named as something else (a
     chart, the plate mark) — and every icon above is drawn at one.
       web.size   px, from the CSS rule `css` (no site sets width/height)
       web.stroke the stroke-width attribute; strokeFrom 'css' means the
                  markup has none and the rule sets it (the dock only)
       web.ariaHidden  the svg carries aria-hidden="true"
       native.size    Svg width = height, pt
       native.props   where fill / stroke / strokeWidth / caps sit:
                      'svg'   all on <Svg>, the children bare;
                      'path'  Svg has only size + viewBox, each Path has all
                              five (fill included) — the dock;
                      'mixed' Svg has fill="none", each Path the other four
                              — FoodIcon
       native.attr    circle/rect numbers passed as 'number' or 'string'
       native.color   the colour role(s) the site strokes it in
     The dock's native `at` is the one <Svg> every tab button draws, from
     Dock.jsx's ICONS[route.name]. */
  sites: {
    dockYou:     { icon: 'you',     web: { at: 'index.html:98',  css: '.dock button svg', size: 22, strokeFrom: 'css', stroke: 1.9 },
                   native: { at: 'src/ui/Dock.jsx:105', size: 22, stroke: 1.9, props: 'path',
                             color: { rest: 'dim', active: 'chalk', lit: 'accent' } } },
    dockWorkout: { icon: 'workout', web: { at: 'index.html:105', css: '.dock button svg', size: 22, strokeFrom: 'css', stroke: 1.9 },
                   native: { at: 'src/ui/Dock.jsx:105', size: 22, stroke: 1.9, props: 'path',
                             color: { rest: 'dim', active: 'chalk', lit: 'accent' } } },
    dockFood:    { icon: 'food',    web: { at: 'index.html:111', css: '.dock button svg', size: 22, strokeFrom: 'css', stroke: 1.9 },
                   native: { at: 'src/ui/Dock.jsx:105', size: 22, stroke: 1.9, props: 'path',
                             color: { rest: 'dim', active: 'chalk', lit: 'accent' } } },
    dockWeight:  { icon: 'weight',  web: { at: 'index.html:117', css: '.dock button svg', size: 22, strokeFrom: 'css', stroke: 1.9 },
                   native: { at: 'src/ui/Dock.jsx:105', size: 22, stroke: 1.9, props: 'path',
                             color: { rest: 'dim', active: 'chalk', lit: 'accent' } } },
    dockSteps:   { icon: 'steps',   web: { at: 'index.html:123', css: '.dock button svg', size: 22, strokeFrom: 'css', stroke: 1.9 },
                   native: { at: 'src/ui/Dock.jsx:105', size: 22, stroke: 1.9, props: 'path',
                             color: { rest: 'dim', active: 'chalk', lit: 'accent' } } },

    fab:        { icon: 'plus', web: { at: 'food.js:568', css: '.fuel-fab svg', size: 19, stroke: 2.6 },
                  native: { at: 'app/(app)/(tabs)/food.jsx:733', size: 19, stroke: 2.6, props: 'mixed', color: 'onAccent' } },
    // The add tiles. The add sheet draws camera (hero), pen (lit), barcode and
    // keypad; the ingredient sheet ("What went in?") draws book (hero), pen
    // (lit), barcode and keypad — web food.js:1796, native meals.jsx:323. The
    // hero tile's icon is onAccent whichever icon it is.
    addTile:    { icon: ['camera', 'pen', 'barcode', 'keypad', 'book'],
                  web: { at: ['food.js:1215', 'food.js:1789'], css: '.add-tile .ic svg', size: 19, stroke: 1.8 },
                  native: { at: 'src/ui/food/common.jsx:422', size: 19, stroke: 1.8, props: 'mixed',
                            color: { hero: 'onAccent', rest: 'chalk' } } },
    aiWarn:     { icon: 'spark', web: { at: ['food.js:1234', 'food.js:1239'], css: '.ai-warn svg', size: 16, stroke: 1.6 },
                  native: { at: 'src/ui/food/common.jsx:948', size: 16, stroke: 1.6, props: 'mixed', color: 'warn' } },
    // The add sheet's Foods and Meals buttons. Native's carry no icon; its
    // only book is the add tile's (above), and it draws no stack at all.
    foods:      { icon: 'book',  web: { at: 'food.js:1250', css: '.add-secondary .btn svg', size: 16, stroke: 1.8 }, native: null },
    meals:      { icon: 'stack', web: { at: 'food.js:1254', css: '.add-secondary .btn svg', size: 16, stroke: 1.8 }, native: null },

    gearFuel:   { icon: 'gear', web: { at: 'food.js:529', css: '.cal-nav .gear-btn svg', size: 16, stroke: 1.6 },
                  native: null },   // native draws glyphs.gear here
    gearSteps:  { icon: 'gear', web: { at: 'steps.js:159', css: '.cal-nav .gear-btn svg', size: 16, stroke: 1.6 },
                  native: { at: 'app/(app)/(tabs)/steps.jsx:113', size: 16, stroke: 1.6, props: 'svg', attr: 'number', color: 'steel' } },
    gearYou:    { icon: 'gearYou', web: { at: 'you.js:694', css: '.you-gear svg', size: 17, stroke: 1.8, ariaHidden: true },
                  native: { at: 'src/ui/you/Hero.jsx:40', size: 17, stroke: 1.8, props: 'svg', color: 'steel' } },
    calendar:   { icon: 'calendar', web: { at: 'workout.js:1013', css: '.wk-cal-btn svg', size: 19, stroke: 1.7 },
                  native: { at: 'app/(app)/(tabs)/workout/session.jsx:320', size: 19, stroke: 1.7, props: 'svg', attr: 'number', color: 'steel' } },

    coachMark:  { icon: 'bubble', web: { at: 'coach-ui.js:229', css: '.coach-mark svg', size: 15, stroke: 1.9, ariaHidden: true },
                  native: { at: 'src/ui/coach/Card.jsx:64', size: 15, stroke: 1.9, props: 'svg', color: 'accent' } },
    liveMark:   { icon: 'bubble', web: { at: 'coach-ui.js:1197', css: '.wk-coach .coach-mark svg', size: 14, stroke: 1.9, ariaHidden: true },
                  native: { at: 'src/ui/coach/live.jsx:65', size: 14, stroke: 1.9, props: 'svg', color: 'accent' } },
    coachLock:  { icon: ['lock', 'unlock'], web: { at: 'coach-ui.js:234', css: '.coach-lock svg', size: 14, stroke: 1.9, ariaHidden: true },
                  native: { at: 'src/ui/coach/Card.jsx:73', size: 14, stroke: 1.9, props: 'svg', attr: 'string',
                            color: { lock: 'accent', unlock: 'steel' } } }
  },

  /* Glyph icons: Unicode, drawn as TEXT in v1 (styled by class on the web, a
     <Text> on native, in SF there). A vibe may restyle them, or route one
     site through icon() — never both at once on one client. Sites are
     file:line at the base commits, and they are complete: every line of
     code text (strings, templates, JSX text; not comments, not the pinned
     pure modules) holding one of these characters is listed here or under
     `prose` — both verifiers survey the trees to hold that. '+' is ASCII,
     and a sign and an operator too, so only the glyph-only '+' buttons are
     surveyed for it.
     Native NavBtn names its button from the glyph it shows
     (app/(app)/(tabs)/food.jsx:136-137: label === '‹' ? 'Previous day' …),
     so those two lines are listed with prev / next: routing prev / next /
     gear through icon() there must keep that label. */
  glyphs: {
    prev:     { char: '‹', web: ['food.js:537', 'workout.js:398'],
                native: ['app/(app)/(tabs)/food.jsx:136', 'app/(app)/(tabs)/food.jsx:1629', 'app/(app)/(tabs)/workout/index.jsx:179'] },
    next:     { char: '›', web: ['food.js:538', 'workout.js:399'],
                native: ['app/(app)/(tabs)/food.jsx:137', 'app/(app)/(tabs)/food.jsx:1632', 'app/(app)/(tabs)/workout/index.jsx:183'] },
    // "‹ Back": web writes it as &#8249; inside innerHTML
    back:     { char: '‹', web: ['admin.js:1562', 'stats.js:62'],
                native: ['app/(app)/(tabs)/you/admin.jsx:154', 'src/ui/train/stats.jsx:62'] },
    // the row chevron: settings rows, list rows, the Coach card's go row
    go:       { char: '›', web: ['admin.js:719', 'coach-ui.js:244', 'food.js:1552', 'picker.js:408', 'routines.js:148',
                                 'settings.js:55', 'you.js:1705'],
                native: ['app/(app)/(tabs)/you/admin.jsx:560', 'src/pure/coach-view.js:77', 'src/ui/food/meals.jsx:150',
                         'src/ui/settings/Row.jsx:41', 'src/ui/train/picker.jsx:630', 'src/ui/train/routines.jsx:152'] },
    close:    { char: '✕', web: ['food.js:1321', 'food.js:1562', 'food.js:1653', 'food.js:2288', 'food.js:2414', 'food.js:3127',
                                 'routines.js:350', 'weight.js:525', 'workout.js:1168'],
                native: ['app/(app)/(tabs)/food.jsx:1111', 'app/(app)/(tabs)/food.jsx:1271', 'app/(app)/(tabs)/weight.jsx:728',
                         'app/(app)/(tabs)/workout/session.jsx:565', 'src/ui/food/common.jsx:564', 'src/ui/food/common.jsx:858',
                         'src/ui/food/meals.jsx:157', 'src/ui/food/waterSettings.jsx:197', 'src/ui/train/routines.jsx:475'] },
    // The multiplication sign as a dismiss / remove button: the Coach nudge,
    // a water preset, the install card. A different character from close's
    // ✕. The water preset's remove is '×' on the web (water.js:391) and '✕'
    // on native (waterSettings.jsx:197, under close) — the trees disagree.
    // Native's is coach-view.js's `dismiss` string, drawn at
    // src/ui/coach/live.jsx:169.
    dismiss:  { char: '×', web: ['coach-ui.js:1393', 'water.js:391', 'you.js:1681'],
                native: ['src/pure/coach-view.js:156'] },
    more:     { char: '⋯', web: ['food.js:580', 'food.js:900', 'routines.js:388', 'water.js:190', 'workout.js:1207', 'you.js:377'],
                native: ['app/(app)/(tabs)/food.jsx:435', 'app/(app)/(tabs)/food.jsx:939', 'app/(app)/(tabs)/food.jsx:1664',
                         'app/(app)/(tabs)/workout/session.jsx:654', 'src/ui/train/routines.jsx:528', 'src/ui/you/bits.jsx:90'] },
    // The stepper and the water undo, glyph-only buttons: U+2212 (web
    // food.js:1127 spells it as a Unicode escape) and ASCII '+'.
    minus:    { char: '−', web: ['food.js:1127', 'food.js:2617', 'water.js:182'],
                native: ['app/(app)/(tabs)/food.jsx:933', 'src/ui/food/common.jsx:135'] },
    plus:     { char: '+', web: ['food.js:1130', 'food.js:2619'], native: ['src/ui/food/common.jsx:149'] },
    check:    { char: '✓', web: ['workout.js:1143', 'workout.js:1347', 'you.js:1552'],
                native: ['app/(app)/(tabs)/workout/session.jsx:551', 'src/ui/train/SetRow.jsx:292', 'src/ui/food/common.jsx:733',
                         'src/ui/you/verdicts.jsx:157'] },
    drop:     { char: '↳', web: ['routines.js:414', 'workout.js:1307'], native: ['src/ui/train/SetRow.jsx:106'] },
    edit:     { char: '✎', web: ['food.js:1312'], native: ['src/ui/food/common.jsx:547'] },
    // web draws the SVG gear at this button (sites.gearFuel)
    gear:     { char: '⚙', web: [], native: ['app/(app)/(tabs)/food.jsx:1628'] },
    expand:   { char: '▾', web: [], native: ['src/ui/coach/goal.jsx:258'] },
    collapse: { char: '▴', web: [], native: ['src/ui/coach/goal.jsx:258'] },
    // leads a sentence (and native's dev banner)
    warn:     { char: '⚠', web: ['food.js:3293'], native: ['app/(app)/(tabs)/food.jsx:1520', 'app/_layout.jsx:73'] },
    // the delta arrow; a flat week is →
    up:       { char: '↑', web: ['you.js:442'], native: ['src/ui/you/bits.jsx:154'] },
    down:     { char: '↓', web: ['you.js:442'], native: ['src/ui/you/bits.jsx:154'] },
    flat:     { char: '→', web: ['you.js:442'], native: ['src/ui/you/bits.jsx:154'] }
  },
  /* The same characters as words or typography: inside a sentence, as a
     number's sign, as the × between weight and reps or on a ×2 portion
     button, in coach-view.js's text-metrics table. Not icons: a vibe never
     reroutes them, and a sentence that says "tap ⋯" or "a ✓ when" stays true
     only if they are left as they are. Listed so the survey is complete and
     nobody mistakes them for the sites above. */
  prose: {
    '⚙': { web: ['ai.js:42', 'ai.js:120', 'food.js:879', 'food.js:1045', 'food.js:3602', 'food.js:3629', 'food.js:3633',
                 'onboarding.js:359', 'steps.js:276', 'you.js:914', 'you.js:1499', 'you.js:1523'],
           native: ['app/(app)/(tabs)/steps.jsx:221', 'app/(app)/(tabs)/steps.jsx:379', 'src/ui/food/barGuide.jsx:67',
                    'src/ui/food/barGuide.jsx:102', 'src/ui/food/barGuide.jsx:107', 'src/ui/onboarding/Setup.jsx:367',
                    'src/ui/you/cards.jsx:185', 'src/ui/you/verdicts.jsx:100', 'src/ui/you/verdicts.jsx:134'] },
    '›': { web: ['admin.js:265', 'ai.js:42', 'food.js:1045', 'food.js:3451'],
           native: ['app/(app)/(tabs)/food.jsx:624', 'src/data/ai.js:72', 'src/state/admin.js:128', 'src/ui/food/paste.jsx:50'] },
    '⋯': { web: ['food.js:1537'], native: ['src/ui/food/meals.jsx:98'] },
    '✓': { web: ['weight.js:211', 'you.js:1067', 'you.js:1113'],
           native: ['app/(app)/(tabs)/weight.jsx:289', 'src/ui/you/cards.jsx:324', 'src/ui/you/cards.jsx:432'] },
    '×': { web: ['food.js:283', 'food.js:448', 'food.js:984', 'food.js:1137', 'food.js:1832', 'food.js:3118',
                 'routines.js:195', 'stats.js:192', 'stats.js:196', 'stats.js:355', 'stats.js:443',
                 'workout.js:637', 'workout.js:1225', 'workout.js:1406', 'workout.js:2129', 'workout.js:2163',
                 'you.js:1199', 'you.js:1200', 'you.js:1235', 'you.js:1279'],
           native: ['app/(app)/(tabs)/food.jsx:559', 'app/(app)/(tabs)/food.jsx:1264', 'app/(app)/(tabs)/workout/session.jsx:666',
                    'app/(app)/(tabs)/workout/stats/[exId].jsx:196', 'app/(app)/(tabs)/workout/stats/index.jsx:133',
                    'app/(app)/(tabs)/workout/stats/index.jsx:182', 'app/(app)/(tabs)/workout/stats/index.jsx:261',
                    'src/pure/coach-view.js:1488', 'src/pure/recap-view.js:141', 'src/pure/stats.js:78',
                    'src/state/food.js:384', 'src/state/food.js:562', 'src/ui/food/common.jsx:123', 'src/ui/food/meals.jsx:384',
                    'src/ui/train/DayEx.jsx:35', 'src/ui/train/SetRow.jsx:349', 'src/ui/train/routines.jsx:236',
                    'src/ui/you/cards.jsx:477', 'src/ui/you/cards.jsx:478', 'src/ui/you/cards.jsx:525', 'src/ui/you/cards.jsx:567'] },
    '−': { web: ['admin.js:1345', 'onboarding.js:530'],
           native: ['src/ui/admin/sheets.jsx:585', 'src/ui/onboarding/Setup.jsx:515'] },
    '→': { web: ['admin.js:446', 'coach-ui.js:675', 'food.js:3204', 'onboarding.js:179', 'onboarding.js:474'],
           native: ['app/(app)/(tabs)/food.jsx:1457', 'app/(app)/(tabs)/steps.jsx:221', 'app/(app)/(tabs)/steps.jsx:253',
                    'app/(app)/(tabs)/steps.jsx:254', 'app/(app)/(tabs)/you/admin.jsx:254', 'src/pure/coach-view.js:95',
                    'src/ui/onboarding/Setup.jsx:478', 'src/ui/steps/sheets.jsx:322', 'src/ui/steps/sheets.jsx:323',
                    'src/ui/steps/sheets.jsx:332'] }
  }
});
