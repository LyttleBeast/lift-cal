// Chalk: Rack printed in two inks on chalk-white stock.
//
// Graphite carries every word, rule and chosen state; one mulberry is kept for
// the thing to do next. Sofia Sans sets the words in sentence case, and its own
// Condensed ExtraBold cut carries the heads, the greeting and the one hero
// figure per screen. The look comes from type and tone, not from boxes, glows
// or tracked capitals. A simple vibe: v1's layout, its tokens, its faces and
// `shape`-grade looks only. The spec, with every number's source, is
// ~/dev/vibes-night/design/chalk.md; its checks are the .mjs scripts in
// ~/dev/vibes-night/design/chalk/final.
//
// THE RULES THIS FILE KEEPS, and why (v1.js has the long form):
//
// - It imports nothing. It is copied byte for byte into rack-mobile
//   (src/pure/vibes/defs/chalk.js) and pinned by sha256, like v1.js.
// - Every colour is 6-digit hex. Only v1 may hold a legacy spelling
//   (index.js LEGACY_EXACT), so no tint here carries an `exact` string:
//   rgba() builds every one from its role and alpha, on both clients.
// - It has every role v1.js has, key for key. Where v1 splits a value
//   { web, native } (colors.onDanger) Chalk keeps the split with one colour on
//   both sides, so the two clients read the same shape.
// - It is frozen all the way down, like v1: every caller shares this object.
// - A colour ROLE is named for its job. Chalk parts roles v1 keeps equal
//   (accent and warn from pYellow, raised and track from collar, inverse
//   from chalk) and keeps others equal on purpose (well = rack, faint = dim);
//   the engines point each call site at the role of its job.
// - It invents no key. The roles the spec asked for and engine v2 added are
//   set here: the dark status `band`, the rings round the calorie head and
//   dashed target (shadow.calHead / calTarget), the W badge's letter in `warn`
//   (tagInk), the runway hatch and edge in `knurl` (tint.runway /
//   runwayEdge), face.bands (native theme.js build() gives a width range its
//   own family) and an empty `shape` (a simple vibe draws no deep look, so it
//   reads no look param). The greeting's name in ink is still a request in
//   the spec, not a key: the contract has no role for it.

const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

export default deepFreeze({
  id: 'chalk',
  name: 'Chalk',
  feel: 'Chalk-white page, dark ink.',   // 27 characters: one line at 375pt
  experimental: false,
  scheme: 'light',
  // vibes/icons/chalk.js: v1's set but for `spark`, which v1 draws as a
  // four-point sparkle at the two estimator notices (never-do #29). Chalk draws
  // the two-wave ≈ there instead, Rack's own "≈" estimate mark; every other
  // icon falls back to v1's drawing (vibe.js icon(), native icon()).
  icons: 'chalk',
  images: {},             // photos are Iron Age's alone; every hero slot closes up
  // Left as v1's on purpose (SYNTHESIS R3.3): the <meta> is already dark, and
  // the installed PWA's status text is white whatever it says.
  themeColor: '#14161a',

  /* The looks, one per block (design/VOCAB.md). A simple vibe names 'v1' or a
     `shape`-grade look only: fill, border, radius, shadow — no drawn device,
     nothing re-arranged. On the web vibes/chalk.css draws each non-v1 look
     by selector; natively each block's switch branches on it. */
  variants: {
    card: 'flat',          // white on the grey page, no edge: told apart by value (R3.2)
    youCard: 'flat',       // Wins / Improve colour moves to a 2pt top border (no side stripe)
    sectionHeader: 'v1', eyebrow: 'v1',   // the type role does the work: 13/600 steel, sentence case
    statRow: 'line',       // a box-score line, never boxed tiles (R6.3)
    btn: 'v1', chip: 'v1', segmented: 'v1', settingsRow: 'v1',
    sheetHost: 'v1', sheetTitle: 'v1',
    dock: 'solid',         // opaque bar, no glass on a light page
    screenHeader: 'v1',
    kpi: 'plain',          // no corner glow; the delta pill's fill is tint.pill* at 0
    youHero: 'v1',
    coachCard: 'flat',     // the 1pt border in the card's own colour; fit via its own table
    chart: 'v1',           // `ink` is graded deep; the regrade is a request in the spec
    headline: 'v1', field: 'square', note: 'v1', toast: 'v1', listRow: 'v1',
    setTable: 'v1', setRow: 'v1', plateStrip: 'v1',
    calCell: 'open',       // no cell grounds, like a printed calendar; today by keyline and 800
    fab: 'v1',
    addTile: 'flat',       // no washes, no border; the lit tag and icon well on `raised`
    sessionChrome: 'flat'  // no glass, no shadows
  },
  // The look params (vocab.js `params`). Every look above is v1 or
  // `shape`-grade, and none of those reads a param, so Chalk sets none.
  shape: {},

  colors: {
    /* ---- native T.colors, key for key ---- */
    // The page: chalk-dust grey-white, cool (R-B = -3, outside the AI-cream
    // band R3.5) and neutral (OKLCH C < 0.015, so R3.1 governs it). 85.7
    // dE00 from v1's ground.
    rack:   '#e8ebeb',
    bar:    '#f8fafa',   // card, sheet, field: 1.14:1 off the page, by value not outline
    // Hairlines. Darker than chalk-r2's #d2d7d7 so the solid white dock's top
    // rule still shows when a white card scrolls under it (1.45 on bar).
    // Decorative only: never the only edge of a control (R2.2).
    collar: '#cdd3d4',
    knurl:  '#767c80',   // control edges: 4.04 on bar, 3.53 on the page (R2.2's 3:1)
    chalk:  '#111416',   // the ink: 17.65 on bar. Graphite, never #000000
    // Darkened from chalk-r2's #41464b so the toggle's steel knob clears 3:1 on
    // its grip track (3.16) while the grab handle keeps 3:1 on bar (3.17).
    steel:  '#3b4045',
    dim:    '#555a60',   // tertiary: 6.64 on bar, 5.28 on raised. Never under 4.5
    // The plates as print-dark inks: a light page forces L* <= 49 (T4 R3).
    // Worst group pair 21.1 normal / 13.7 deuteranopia / 16.0 protanopia.
    pRed:    '#8f1117',  // chest, protein, gain
    pBlue:   '#1c4aa8',  // back, fat, water, training, cut, drop sets (cobalt, still blue)
    pYellow: '#8a6b00',  // legs, carbs, fuel and weight, maintain (ochre, hue 46.5)
    pGreen:  '#056a50',  // shoulders, steps (a bluish green)
    pWhite:  '#25272b',  // arms, the steps subject: ink, as no white can reach 3:1 here
    pChrome: '#6c727c',  // core: slate
    good: '#056a50',     // HUE_NAMED green
    // Parted from pYellow: a darker amber than chalk-r2's #735400, so warn
    // against bad under deuteranopia is 7.22 dE00, not 5.00.
    warn: '#7a5a00',
    bad:  '#8f1117',
    // native text-on-colour keys (aliases build() fills from their roles)
    onYellow: '#ffffff',       // = onAccent
    onGreen:  '#ffffff',       // = onDone
    onPlate:  '#f8fafa',       // figures on a plate chip: 4.62 or better on all six
    white:    '#ffffff',       // = onDanger
    pYellowPressed: '#5d224a', // = accentPressed
    fallback: '#3b4045',       // = groups.fallback, which follows steel

    /* ---- semantic roles ---- */
    // Mulberry, one job: primary, focus, today, the dock mark, Coach's voice,
    // chosen and on states. HSL 320 (25 clear of the banned violet band),
    // 9.56 dE00 from pink-900, its nearest Tailwind v3 default; 23.3 from
    // its nearest data colour. Never data, never status.
    accent:        '#6c3058',
    focus:         '#6c3058',
    accentPressed: '#5d224a',
    onAccent:      '#ffffff',  // 9.54 on the accent
    danger:        '#8f1117',  // a keyline and words, never a fill that could pass for the primary
    onDanger:      { web: '#ffffff', native: '#ffffff' },  // one colour; v1's split shape kept
    done:          '#056a50',
    onDone:        '#ffffff',  // the check on a done set: 6.60
    well:          '#e8ebeb',  // the recess inside a card equals the page, as in v1 (never same-fill nesting)
    knockout:      '#f8fafa',  // ink cut out of the inked-in chosen fill: 17.65
    // Chosen states are inked in, like a filled-in box on a form.
    inverse:       '#111416',
    // White, because the copy calls the head "the white head" (HUE_NAMED). On
    // a light track it needs an ink ring (requested in the spec); the ticks
    // already have one, shadow.calTick below.
    calMark:       '#ffffff',
    raised:        '#dde1e2',  // a control up off the card is a step darker on a light page
    track:         '#dce0e1',  // every data fill clears 3:1 on it (core, the weakest, 3.64)
    // One step darker, where three jobs pull against each other: the grab
    // handle (3.17 on bar), the toggle's off track under a steel knob (3.16),
    // the trajectory dots. The add tile's lit tag leaves it (addTile · flat).
    grip:          '#898e8f',
    faint:         '#555a60',  // = dim on purpose: no fourth, fainter grey (never-do 5)
    onWarn:        '#ffffff',  // native trial banner ink on its solid warn bar: 6.38
    // On a light page the shadow and the press are graphite, not black and
    // white: a pressed row darkens, and a black shadow would read as dirt.
    shade:         '#111416',
    lift:          '#111416',
    // Native's flat forms of the hero and lit add-tile washes (accent .10 and
    // .05 over the well). addTile · flat draws neither; kept for a v1-look fallback.
    tileHero:      '#dcd8dc',
    tileLit:       '#e2e2e4',
    // The strip under the installed web app's status bar, whose text is
    // always white (V59 §10): graphite, 18.49 under it. Native ignores it; its
    // status text is chrome.statusBar's dark.
    band:          '#111416'
  },

  /* The set badge's letter (engine v2). The W / F / D badges keep the plain
     badge's raised ground (tint.tag* below) and the letter carries the type.
     Ochre pYellow is 3.81 on raised, so W is inked in warn (4.85); F and D
     keep their plate colours (7.05, 6.15). */
  tagInk: { W: 'warn', F: 'pRed', D: 'pBlue' },

  alpha: {
    yellow: 'pYellow', red: 'pRed', blue: 'pBlue', green: 'pGreen', ground: 'rack',
    accent: 'accent', danger: 'danger', warn: 'warn'
  },

  /* Tints: a role and an alpha, never an exact string. Light grounds take
     lower alphas than dark ones, except where a light page needs more to be
     seen at all (the done row, the drop rail). */
  tint: {
    setDone:   { color: 'done',    a: 0.12 },  // up from .07: a done row you can see from the bench
    setFlash:  { color: 'accent',  a: 0.28 },
    // The W / F / D badges keep the plain badge's raised ground, and the
    // letter carries the type: W in warn (4.85), F in pRed (7.05), D in pBlue
    // (6.15), whatever the row under it is doing. A tinted square over a done
    // row left the W at 4.48-4.71.
    tagW:      { color: 'raised',  a: 1 },
    tagF:      { color: 'raised',  a: 1 },
    tagD:      { color: 'raised',  a: 1 },
    dropRail:  { color: 'pBlue',   a: 0.7 },   // up from .45: the rail is a 3:1 graphic on white (3.80)
    dropAdd:   { color: 'pBlue',   a: 0.45 },  // + Drop's border; the button carries words
    pickSel:   { color: 'accent',  a: 0.08 },
    block:     { color: 'accent',  a: 0.04 },
    coachBase: { color: 'accent',  a: 0.14 },
    coachLow:  { color: 'accent',  a: 0.07 },
    coachHigh: { color: 'accent',  a: 0.38 },
    rowPress:  { color: 'lift',    a: 0.05 },  // ink at .05: a light page presses darker
    // No delta pills (R6.6): a delta is bare signed text with its arrow.
    pillBase:  { color: 'lift',    a: 0 },
    pillUp:    { color: 'good',    a: 0 },
    pillDown:  { color: 'bad',     a: 0 },
    pillWarn:  { color: 'warn',    a: 0 },
    zoneCut:   { color: 'pBlue',   a: 0.16 },
    zoneHold:  { color: 'pYellow', a: 0.18 },
    zoneGain:  { color: 'pRed',    a: 0.16 },
    // dock · solid and sessionChrome · flat draw both bars opaque; these are
    // what a v1-look fallback would draw.
    dockGlass:  { color: 'rack',  a: 0.82 },
    wkBarGlass: { color: 'rack',  a: 0.9 },
    backdrop:   { color: 'shade', a: 0.4 },    // graphite .40: light grounds dim at .40-.45 (R3.3)
    trajGood:     { color: 'good',   a: 0.18 },
    trajWarn:     { color: 'warn',   a: 0.18 },
    trajBad:      { color: 'bad',    a: 0.18 },
    reviewBg:     { color: 'accent', a: 0.07 },
    reviewBorder: { color: 'accent', a: 0.24 }, // up from .18 so the border shows on white; decorative
    // The calorie runway's hatching and right edge (web .cal-runway). v1's
    // rack at .55 is 1.06 on a light track and vanishes; knurl is 3.18.
    runway:       { color: 'knurl',  a: 1 },
    runwayEdge:   { color: 'knurl',  a: 1 }
  },

  /* ---- type ----
     No preset is caps: the strings are authored in sentence case, so
     `upper: 0` lowers them and tracking goes to 0 with it (N13-N14). Labels
     are 12-13pt at 600 in steel (R5.1). Nothing under 11pt.
     wdth is not an axis in Sofia Sans. Natively it only picks the face:
     face.bands sends wdth <= 80 to Sofia Sans Condensed ExtraBold, which is
     h1-h3 (78, as in v1), and the three set to 75 below — the greeting, the
     headline and loadNum. On the web vibes/chalk.css names the Condensed
     family on the same selectors. */
  type: {
    body:     { size: 15, wdth: 100, wght: 400, lh: 1.45, color: 'chalk' },
    h1:       { size: 30, wdth: 78,  wght: 800, ls: 0, color: 'chalk' },
    h2:       { size: 21, wdth: 78,  wght: 800, ls: 0, color: 'chalk' },
    h3:       { size: 17, wdth: 78,  wght: 800, ls: 0, color: 'chalk' },
    eyebrow:  { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    btn:      { size: 15, wdth: 100, wght: 700, ls: 0, color: 'chalk' },
    btnLg:    { size: 17, wdth: 100, wght: 800, ls: 0, upper: 0 },
    dockLbl:  { size: 11, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'dim' },
    fieldLbl: { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    note:     { size: 13, wght: 400, lh: 1.5, color: 'dim' },
    statVal:  { size: 22, wdth: 100, wght: 800, lh: 1, tnum: 1 },
    statLbl:  { size: 12, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    timer:    { size: 22, wdth: 100, wght: 800, ls: 0, tnum: 1 },
    kpiVal:   { size: 24, wdth: 100, wght: 800, ls: 0, lh: 1, tnum: 1 },
    // The one numeral treatment: v1's wide stamped plate figure turned on
    // end — Condensed ExtraBold, tall and narrow, tabular (526 per digit).
    headline: { size: 40, wdth: 75,  wght: 800, ls: -0.01, lh: 1, tnum: 1 },
    youGreet: { size: 30, wdth: 75,  wght: 800, ls: 0, lh: 1.1 },
    chip:     { size: 12, wdth: 100, wght: 600, color: 'steel' },
    segBtn:   { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    setInput: { size: 15, wdth: 100, wght: 700, tnum: 1, color: 'chalk' },  // 15: iOS Safari's zoom-on-focus stays as it is
    mono:     { size: 12, color: 'chalk' }
  },
  // .load-num at the call sites' own sizes (26-40), in the Condensed band.
  // lh 1: native floors it at the face's 1.2 anyway.
  loadNum: { wdth: 75, wght: 800, ls: 0, lh: 1, tnum: 1 },

  /* ---- the face ----
     Sofia Sans v4.101 (Lettersoup; OFL 1.1, no Reserved Font Name). Native:
     four static TTFs, Google's own css2 instances of the same v4.101 the web
     subsets, latin-subset: Regular, SemiBold, ExtraBold and Condensed
     ExtraBold (the picker face) — 168 KiB together. A 600 site draws true
     SemiBold on both clients. 700 has no file: it snaps UP to 800 so buttons,
     names and set inputs stay heavier than the 600 labels (a device
     screenshot may move it). hhea 900 / -300 on 1000, so minLh 1.2 for both
     widths. Web: 'chalk-sofia' and 'chalk-sofia-cond', vibe-prefixed so an
     installed Sofia Sans can never stand in; the files are self-hosted
     variable woff2 (wght 1-1000), @font-face in vibes/chalk.css. rack.css
     line 1's Archivo @import stays byte-identical (importUrl is its record);
     Chalk's own rules never name Archivo. */
  face: {
    family: 'SofiaSans',
    keys: ['SofiaSans_400', 'SofiaSans_600', 'SofiaSans_800', 'SofiaSansCondensed_800'],
    snap: { 500: 600, 650: 800, 700: 800, 750: 800, 900: 800 },
    step: 100,
    width: 100,
    minLh: 1.2,
    mono: { ios: 'Menlo', android: 'monospace' },
    web: {
      font: "'chalk-sofia', system-ui, -apple-system, sans-serif",
      // The Condensed cut, on the selectors native's band catches (h1-h3,
      // the greeting, the headline, .load-num): vibes/chalk.css spends it.
      display: "'chalk-sofia-cond', 'chalk-sofia', system-ui, -apple-system, sans-serif",
      italic: "'chalk-sofia', system-ui, -apple-system, sans-serif",
      // The Vibes card's figure: Condensed ExtraBold, from its digits-only
      // file (0-9, 6,972 bytes), the one file vibe.js prefetches for the
      // picker; anything but a digit falls to the full Condensed cut.
      num: "'chalk-sofia-num', 'chalk-sofia-cond', system-ui, -apple-system, sans-serif",
      mono: 'ui-monospace, monospace',
      importUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap'
    },
    // theme.js build(): the first band whose [min, max] holds a preset's wdth
    // draws it in this family. Only h1-h3, ErrorScreen's title (78) and the
    // three 75s above fall in it; no body text does (surveyed in the spec).
    // Its own empty snap, so the face's 500 -> 600 never asks the band for a
    // 600 it does not ship: every weight in it resolves to its one file.
    bands: [{ max: 80, family: 'SofiaSansCondensed', keys: ['SofiaSansCondensed_800'], snap: {}, weights: [800], minLh: 1.2 }]
  },

  /* ---- radius: small, soft, never zero (Sofia's own softened corners) ---- */
  radius: {
    r: 6, sm: 4, sheet: 18, tile: 6, pill: 999, plate: 2, chip: 3, mark: 3, idx: 4,
    round: '50%', hair: 1, bubble: 10, badge: 8
  },

  /* ---- shadows ----
     None on the FAB, the toast, the rest pill or the peek bar: on a white
     page surfaces part by value, and the mulberry FAB (7.96 on the page)
     lifts itself. The tour card keeps one, in graphite. Rings are outlines. */
  shadow: {
    peek:  { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    rest:  { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    toast: { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    fab:   { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    fabPressed: { web: [] },
    tourCard:   { web: [{ x: 0, y: 14, blur: 36, spread: 0, color: 'shade', a: 0.28 }],
                  native: { opacity: 0.28, radius: 24, x: 0, y: 14 } },
    // The calorie ticks: white lines with an ink edge, 5.3 against the zones.
    calTick:    { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'chalk', a: 0.7 }] },
    // The white head and the dashed target, and their guide swatches, ringed
    // in ink at .9 (native: a 1pt border): 8.70-9.30 against the zones, 11.16
    // on the bare track, where the white alone is 1.33-1.76.
    calHead:    { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'chalk', a: 0.9 }] },
    calTarget:  { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'chalk', a: 0.9 }] },
    flame:      { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'accent', a: 0.35, inset: true }] },
    kpiDay:     { web: [{ x: 0, y: 0, blur: 0, spread: 1.2, color: 'knurl', inset: true }] },
    kpiDayOn:   { web: [] },
    kpiToday:   { web: [{ x: 0, y: 0, blur: 0, spread: 1.5, color: 'well' },
                        { x: 0, y: 0, blur: 0, spread: 2.5, color: 'steel' }] },
    kpiTodayOn: { web: [{ x: 0, y: 0, blur: 0, spread: 1.5, color: 'well' },
                        { x: 0, y: 0, blur: 0, spread: 2.5, color: 'chalk' }] },
    guideEaten: { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'knurl', inset: true }] },
    trajGood:   { web: [{ x: 0, y: 0, blur: 0, spread: 4, color: 'good', a: 0.18 }] },
    trajWarn:   { web: [{ x: 0, y: 0, blur: 0, spread: 4, color: 'warn', a: 0.18 }] },
    trajBad:    { web: [{ x: 0, y: 0, blur: 0, spread: 4, color: 'bad',  a: 0.18 }] },
    tourLit:    { web: [{ x: 0, y: 0, blur: 0, spread: 2, color: 'accent' }] }
  },

  /* ---- scrims and glass ----
     The only blur left is the sheet backdrop's 3px (R7.2); webkit stays
     v1's, a fixed fact about rack.css. The tour fogs chalk-white. */
  scrim: {
    sheet: { tint: 'backdrop', filter: 'blur(3px)', webkit: false },
    dock:  { tint: 'dockGlass', filter: 'none', webkit: true, native: { intensity: 40 } },
    wkBar: { tint: 'wkBarGlass', filter: 'none', webkit: true },
    tour:  { dir: 'to bottom',
             stops: [{ color: 'rack', a: 0.55, at: 0 }, { color: 'rack', a: 0.94, at: 0.42 }],
             // No exact strings: build() makes native's three stops from these
             // two and holds the last to the bottom, at these locations.
             native: { locations: [0, 0.42, 1] } }
  },

  /* ---- native chrome: a light page under dark system text ---- */
  chrome: {
    statusBar: 'dark',
    keyboard: 'light',
    blurTint: 'light',       // not drawn: the dock is solid
    shadow: '#111416',       // the tour card's only shadow, in graphite
    datePicker: 'light',
    camera: '#000000',       // the camera stays black
    systemFace: null,        // as v1: no fontFamily key at the system-font sites
    // Fixed at build or install time; every vibe holds v1's. Launch stays
    // graphite and turns light once the account's vibe is read.
    appearance: 'dark',
    launch: '#14161a',
    manifestTheme: '#14161a',
    webStatusBar: 'black-translucent',
    colorScheme: 'light'     // the web's own form controls, light like the page
  },

  /* Native sign-in only ever draws under v1 (the vibe is per account; native
     keeps no device key), so these are v1's, spelled 6-digit. */
  signIn: {
    title:       '#ffffff',
    sub:         '#8b929c',
    label:       '#8b929c',
    link:        '#8b929c',
    placeholder: '#5a616b',
    error:       '#ff6b6b',
    ok:          '#6fcf97',
    button:      '#2aa85c',
    buttonBusy:  '#2b6b45',
    buttonText:  '#ffffff',
    spinner:     '#ffffff',
    fieldBg:     '#1c1f25',
    fieldText:   '#ffffff',
    fieldBorder: '#2a2e36'
  },

  // White on the pRed / pGreen banner fills: 9.29 / 6.60.
  banner: {
    devText:   '#ffffff',
    guardText: '#ffffff',
    guardNote: '#ffffff'
  },

  /* ---- web: v1's channel names and v1's fixed layout and motion ---- */
  web: {
    rgb: {
      rack: 'rack', shade: 'shade', lift: 'lift', accent: 'accent',
      pYellow: 'pYellow', warn: 'warn', pRed: 'pRed', bad: 'bad', danger: 'danger',
      pBlue: 'pBlue', pGreen: 'pGreen', done: 'done', good: 'good', pWhite: 'pWhite', steel: 'steel'
    },
    root: {
      dockH: '64px',
      safeTop: 'env(safe-area-inset-top, 0px)',
      topGap: '10px',
      appTop: 'calc(var(--safe-top) + var(--top-gap))',
      pad: '16px',
      ease: 'cubic-bezier(.22,.61,.36,1)',
      fast: '140ms',
      med: '240ms'
    }
  },

  /* ---- data tables: each entry is its role's colour, case kept per source ---- */
  groups: {
    chest: '#8f1117', back: '#1c4aa8', legs: '#8a6b00',
    shoulders: '#056a50', arms: '#25272b', core: '#6c727c',
    fallback: '#3b4045'
  },
  groupPlates: {
    chest: '#8F1117', back: '#1C4AA8', legs: '#8A6B00',
    shoulders: '#056A50', arms: '#25272B', core: '#6C727C'
  },
  plates: ['#8f1117', '#1c4aa8', '#8a6b00', '#056a50', '#25272b', '#6c727c'],
  importGroups: {
    chest: 'pRed', back: 'pBlue', legs: 'pYellow',
    shoulders: 'pGreen', arms: 'pWhite', core: 'pChrome', fallback: 'grip'
  },
  mark: ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'],
  subjects: {
    fuel: 'pYellow', weight: 'pYellow', train: 'pBlue', steps: 'pWhite', water: 'pBlue',
    prot: 'pRed', carb: 'pYellow', fat: 'pBlue', all: 'chalk', fallback: 'steel'
  },
  // kpi · plain draws no corner tint; the alphas are 0 so a v1-look path paints none either.
  kpi: {
    default: { color: 'steel', a: 0 },
    fuel:    { color: 'pYellow', a: 0 },
    weight:  { color: 'pYellow', a: 0 },
    train:   { color: 'pBlue', a: 0 },
    steps:   { color: 'pWhite', a: 0 }
  },
  admin: {
    aiSplit: { aiPhoto: 'pYellow', aiPhotoText: 'pRed', aiText: 'pBlue', aiRecall: 'pGreen' },
    families: ['pBlue', 'pYellow', 'pGreen', 'pChrome'],
    /* Native's Pro and Custom pills in the web's `lit` (pBlue): ochre words at
       9pt are 4.19 on the page and 3.79 pressed, and warn is the trial's.
       Cobalt is 6.75 and 6.10. */
    pill: {
      web:    { owner: 'on', pro: 'lit', custom: 'lit', trial: 'warn', locked: 'off', basic: '' },
      native: { owner: 'good', pro: 'pBlue', custom: 'pBlue', trial: 'warn', locked: 'bad', basic: 'dim' }
    },
    flag: { on: 'good', off: 'bad', lit: 'pBlue', warn: 'warn' }
  },
  conf: { high: 'good', medium: 'warn', low: 'bad' }
});
