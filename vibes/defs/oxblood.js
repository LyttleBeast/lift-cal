// Oxblood — a warm maroon-black ground, bone ink and one ice-blue mark, set in
// Schibsted Grotesk, as data.
//
// A SIMPLE vibe (V59 §2): new colours, one new face and small shape tokens;
// v1's layout, boxes, order, words and numbers, untouched. The spec, with every
// number below measured and its source, is ~/dev/vibes-night/design/oxblood.md.
// It is research's pick for the slot, SYNTHESIS §5.3 S3-a "Oxblood × Schibsted
// Grotesk", on track 4's `oxblood` palette (accent and ground clean on all 242
// Tailwind v3 defaults). Where this file departs from S3-a, the comment says
// why; there are two colour corrections, collar and pChrome (below), each for
// a hard rule the palette as printed misses by a hair.
//
// WHY THESE COLOURS. The ground is named for a material, as R3.1 asks: oxblood
// leather — the lifting belt and the lifting shoe. It is a chromatic ground
// (not a stock grey: 5.86 ΔE00 from its nearest Tailwind default), so the page
// itself is warm; the one accent is cold and light, ice blue, which sits 50
// ΔE00 from v1's yellow and 37 from Navy's pistachio. Warm ground, cold mark:
// nothing like v1 (graphite + yellow) or Navy (cool navy + a pale green).
//
// THE RULES THIS FILE KEEPS (v1.js says why each exists):
// - It imports nothing and is frozen all the way down.
// - Every colour is 6-digit hex. No LEGACY_EXACT spelling appears: the `exact`
//   strings v1 carries for its own host props are v1's alone, so every tint
//   here is a role at an alpha and rgba() builds the rest.
// - A colour role is named for its job. The accent has one job (the primary
//   action, focus, today, Coach's voice); it never paints data or a verdict.
// - The roles the copy names by hue (index.js HUE_NAMED) stay in that hue:
//   pBlue blue, pYellow yellow, pRed red, calMark white, good green, bad red,
//   dim grey, warn amber.
// - Every `fixed` role holds v1's value (a build, an install or rack.css fact).
// - It invents no key. The engine-v2 roles it sets: the W / F / D letters
//   (tagInk, each its plate) and an empty `shape` (a simple vibe draws no deep
//   look, so it reads no param). It leaves out what it does not need — the
//   status band (a dark page, see colors), shadow.calHead / calTarget,
//   face.bands, type.meta, inkOf — and index.js valueOf() gives each its v1
//   default.

const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

export default deepFreeze({
  id: 'oxblood',
  name: 'Oxblood',
  feel: 'Oxblood and ice blue.',
  experimental: false,
  scheme: 'dark',
  // v1's icons, with ONE redrawn: `spark`. v1's four-point sparkle is an AI
  // tell (SYNTHESIS finding 4 / R8.8 / never-do 29), and iconIn() hands v1's to
  // any set that does not define its own, so a vibe that names 'v1' inherits
  // it. The set is v1's paths plus a neutral ≈ `spark` (design/oxblood.md §10);
  // its paths are the ones Navy and Chalk draw, so one shared set could serve
  // all three simple vibes later. vibe.js ICON_SETS (and native's) register
  // it; an unregistered set would fall back to v1's, sparkle included.
  icons: 'oxblood',
  images: {},              // a simple vibe has no photo anywhere (§2, §11)
  themeColor: '#1a0f11',   // the <meta> matches the page, as v1's matches its

  /* One look per building block (design/VOCAB.md). A simple vibe names 'v1' or
     a `shape`-grade look only: fill, border weight and colour, radius, shadow.
     The shape language is the printed plate — square corners on everything
     that is not tapped as a chip — which is S3-a's "lead card radius 2 (the
     plate radius), filled; groups separated by space alone; pills only on
     chips". The first seventeen are the contract's; the last twelve are D.1's
     new blocks (VOCAB §7), named here so the vibe is complete the day the
     contract gains them; until then nothing reads them. */
  variants: {
    card: 'flat',          // bar ground, no border: surfaces told apart by value (R3.2)
    youCard: 'flat',       // Wins / Improve: a 2pt top border, never a side stripe (R6.4)
    sectionHeader: 'v1', eyebrow: 'v1',   // changed through type.eyebrow alone
    statRow: 'line',       // a box-score line, never boxed tiles (R6.3)
    btn: 'square',         // plate corners; ghost and danger keylines 1.5pt
    chip: 'v1',            // chips keep their pills: the one pill in the vibe (R6.5)
    segmented: 'boxes',    // joined square cells, the chosen one inverted
    settingsRow: 'v1', sheetHost: 'v1', sheetTitle: 'v1',
    dock: 'v1',            // glass stays on the dock (SYNTHESIS D16)
    screenHeader: 'v1',
    kpi: 'plain',          // no corner tint (the kpi table's alphas are 0 too)
    youHero: 'v1',
    coachCard: 'flat',     // border in the card's own colour: 1pt, so the fit holds
    chart: 'v1',
    headline: 'v1', field: 'square', note: 'v1', toast: 'square', listRow: 'v1',
    setTable: 'v1', setRow: 'v1', plateStrip: 'v1', calCell: 'v1', fab: 'square',
    // No washes, no border; the lit tiles' icon well and tag on `raised`
    // (steel 6.75), where the 3:1 grip below would leave the tag at 2.61.
    addTile: 'flat', sessionChrome: 'v1'  // v1: glass stays on the live bar (D16)
  },
  // The look params (vocab.js `params`). Every look above is v1 or
  // `shape`-grade, and none of those reads a param, so Oxblood sets none.
  shape: {},

  colors: {
    /* ---- surfaces: track 4's `oxblood` ---- */
    rack:   '#1a0f11',   // oxblood-black. 5.86 ΔE00 from stone-900 (v3 guard ≥ 5)
    bar:    '#241518',   // card, sheet, field: 3.8 ΔE00 above the page (v1's step is 3.4)
    // Decorative hairlines only; never a control's only edge (R2.2). CORRECTED
    // from the palette's #331f23, which is 1.138:1 on the card — under v1's
    // own 1.148, a v1 pair a vibe may not make worse (§13.1). #352125 is 1.167
    // on the card, 0.6 ΔE00 from the palette's. raised and track share it, as
    // v1 makes the three one value.
    collar: '#352125',
    // The control edge, 3:1 or more on every surface (the field, the set check,
    // the rest pill, the peek bar, the sheet's top). A dusty rose-brown, so the
    // edges belong to the leather, not to a grey kit.
    knurl:  '#846368',
    /* ---- ink: bone, from the palette ---- */
    chalk:  '#f3ece2',
    steel:  '#bcaaa4',   // every label and secondary line (7.88 on a card)
    // Tertiary: 5.34 on a card (v1's dim is 2.70). A warm grey (HSL s 0.10):
    // the copy calls .delta.flat grey (HUE_NAMED).
    dim:    '#9c8a85',
    /* ---- the plates, re-toned for colour-blind men first (T4 R5):
       vermilion red, sky blue, pale yellow, bluish green, bone, cool slate ---- */
    pRed:    '#ff6b4a',  // chest, protein, gain. HSL 11°: still red (HUE_NAMED)
    pBlue:   '#62a8ff',  // back, fat, water, training, cut, drop sets
    pYellow: '#ffe07a',  // legs, carbs, fuel and weight, maintain
    pGreen:  '#3cc4a0',  // shoulders, steps. HSL 164°: inside the green family
    pWhite:  '#efe8dc',  // arms, the steps subject
    // Core, pulled cool so it stays apart from green (T4 §3.2). CORRECTED from
    // the palette's #8f99a3: that one sits 11.98 ΔE00 from shoulders under
    // deuteranopia — research printed it as "12.0", rounded up, and the gate is
    // 12 (R2.5). Two steps more blue move it 1.0 ΔE00 and lift the worst group
    // pair to 12.68 (protan, shoulders / arms); every contrast it had, it keeps.
    pChrome: '#8f99a5',
    // Verdicts share the plates' hexes, as in v1, each a separate role.
    good: '#3cc4a0',
    warn: '#ffe07a',     // HSL 46°: amber and yellow both (HUE_NAMED warn is amber)
    bad:  '#ff6b4a',
    // Native's legacy text-on-colour keys (aliases build() fills from the
    // semantic role; v1 holds both equal, so this does too).
    onYellow: '#1a0f11',
    onGreen:  '#1a0f11',
    onPlate:  '#1a0f11',   // every plate chip: 6.65 (chest) to 15.39 (arms)
    white:    '#1a0f11',   // the swipe-delete ink: oxblood on vermilion, 6.65 (white would fail)
    pYellowPressed: '#97bddc',
    fallback: '#bcaaa4',   // = steel, as groups.fallback is

    /* ---- the semantic roles split out of double duty ---- */
    // Ice blue: the app's own call to action and nothing else. 13.4 ΔE00 from
    // the data blue in normal vision, 14.1–15.6 under CVD; 5.08 from blue-200.
    // It is told from pBlue by lightness (L* 84 against 68), so it never sits
    // beside back, fat or water as its only cue (T4 §3.2) — it is always a
    // filled button with words, a ring, a mark or today's keyline.
    accent:        '#a8d8ff',
    focus:         '#a8d8ff',
    // S3-a's own option for a guarded pressed state (T4 GF7): #8fc3f0 sits 2.42
    // from blue-300, #97bddc 5.42. Taken because it costs nothing (oxblood ink
    // on it 9.48) and keeps the question off Micah's list.
    accentPressed: '#97bddc',
    onAccent:      '#1a0f11',
    danger:        '#ff6b4a',
    onDanger:      '#1a0f11',   // one 6-digit value: only v1 keeps the split spelling
    done:          '#3cc4a0',
    onDone:        '#1a0f11',
    well:          '#1a0f11',   // the recess inside a card is the page, as in v1: never the card's own fill (N9)
    knockout:      '#1a0f11',
    inverse:       '#f3ece2',
    // "The white head" (HUE_NAMED white). Not chalk: bone #f3ece2 is too warm
    // for the contract's white family (HSL s 0.41 > 0.40), so the calorie
    // bar's marks take a whiter bone, 1.9 ΔE00 from the ink.
    calMark:       '#f5f1ea',
    // raised = track = collar, as v1 makes them one value: one step above the
    // card, which the F and D set badges can carry at 4.5 (their washes are
    // off, tint.tagF / tagD).
    raised:        '#352125',
    track:         '#352125',
    // grip: the grab handle, a toggle's off track, the trajectory dots, the
    // runway hatching, the importer's unknown group. A rose-brown on knurl's
    // hue line, the darkest there that keeps the sheet's grab handle at 3:1
    // (3.01 on the sheet; R8.5, §13.1): a toggle's off track 3.21 on the page,
    // the dots 3.01 on a card. The lit add tile's tag no longer sits on it
    // (addTile · flat puts it on `raised`, steel 6.75), so grip is free to be
    // this light. A toggle's steel knob on it would be 2.61 (v1 3.80), so the
    // off knob is chalk instead, 4.97: knob, below.
    grip:          '#7c5d62',
    // knob (engine v3): the toggle's off knob, on grip. Chalk, 4.97 — steel,
    // the knob a definition without one takes, would be 2.61 there.
    knob:          '#f3ece2',
    // faint = dim: no fourth, fainter grey tier (never-do 5). v1's faint is
    // 1.41:1; an optional field's label is text and must read.
    faint:         '#9c8a85',
    onWarn:        '#1a0f11',
    shade:         '#000000',   // black under every shadow and scrim: depth, never a coloured glow
    lift:          '#ffffff',   // the pressed-row wash
    // Native's flat forms of the add tiles' accent washes. addTile · flat draws
    // no washes, so they are the well, and the Photo tile is found by its
    // ice-blue icon well alone.
    tileHero:      '#1a0f11',
    tileLit:       '#1a0f11'
    // No `band`: the installed web app's white status text already reads on
    // this dark page (18.74 on rack), as on v1's, and the strip is drawn
    // above everything at the top of the screen (z-index 400) — it would
    // hide the live session's rest line (rack.css .rest-line, fixed at top 0,
    // z-index 90) on every phone with a top inset. Left out, it is v1's null.
  },

  /* The set badge's letter (engine v2): each its plate, as v1. The badge's
     wash is off (tint.tag* 0), so the letter sits on `raised`: W 11.60,
     F 5.34, D 6.13. */
  tagInk: { W: 'pYellow', F: 'pRed', D: 'pBlue' },

  alpha: {
    yellow: 'pYellow', red: 'pRed', blue: 'pBlue', green: 'pGreen', ground: 'rack',
    accent: 'accent', danger: 'danger', warn: 'warn'
  },

  /* Each a role at an alpha; no `exact` (LEGACY_EXACT is v1's alone). Alphas
     are v1's except where a comment says why. */
  tint: {
    // .10, up from .07: a done set you can see from the bench (do-instead 11).
    setDone:   { color: 'done',    a: 0.10 },
    setFlash:  { color: 'accent',  a: 0.28 },
    // The set badges' washes are off: at .16 over `raised` the F and D letters
    // fall under 4.5 (design/oxblood.md §3). Bare letters on raised pass.
    tagW:      { color: 'pYellow', a: 0 },
    tagF:      { color: 'pRed',    a: 0 },
    tagD:      { color: 'pBlue',   a: 0 },
    // .70, up from .45: the drop rail and the + Drop edge are graphics that
    // carry structure, so they reach 3:1 on a card (v1's .45 does not).
    dropRail:  { color: 'pBlue',   a: 0.70 },
    dropAdd:   { color: 'pBlue',   a: 0.70 },
    pickSel:   { color: 'accent',  a: 0.08 },
    block:     { color: 'accent',  a: 0.03 },
    coachBase: { color: 'accent',  a: 0.14 },
    coachLow:  { color: 'accent',  a: 0.07 },
    coachHigh: { color: 'accent',  a: 0.38 },
    rowPress:  { color: 'lift',    a: 0.04 },
    // No delta pills (R6.6): a delta is bare signed text, arrow kept, in its
    // status colour. Every pill fill, the resting one included, is 0.
    pillBase:  { color: 'lift',    a: 0 },
    pillUp:    { color: 'good',    a: 0 },
    pillDown:  { color: 'bad',     a: 0 },
    pillWarn:  { color: 'warn',    a: 0 },
    zoneCut:   { color: 'pBlue',   a: 0.16 },
    zoneHold:  { color: 'pYellow', a: 0.18 },
    zoneGain:  { color: 'pRed',    a: 0.16 },
    dockGlass:  { color: 'rack',  a: 0.82 },
    wkBarGlass: { color: 'rack',  a: 0.9 },
    backdrop:   { color: 'shade', a: 0.6 },
    trajGood:     { color: 'good',   a: 0.18 },
    trajWarn:     { color: 'warn',   a: 0.18 },
    trajBad:      { color: 'bad',    a: 0.18 },
    // "Next week" (.review-take, native verdicts.jsx) stops being a box in a
    // box (N9) and becomes the vibe's callout: a flat ice-tinted band, no
    // border (the border keeps its width at 0 alpha, so nothing moves).
    reviewBg:     { color: 'accent', a: 0.10 },
    reviewBorder: { color: 'accent', a: 0 }
  },

  /* ---- type ----
     Schibsted Grotesk has one axis, wght 400–900, so every wdth is 100: the
     web ignores an axis the face lacks, and native ignores width anyway. Heads
     are Bold (700), figures ExtraBold (800): 800 on figures only. No type role
     is caps (`upper: 0`): every such string is authored in sentence case, and
     labels become information — 12–13pt, 600, steel at 4.5:1 (R5.1). Sizes
     that moved were measured (design/oxblood.md §5.3) so nothing that fits in
     v1 stops fitting. */
  type: {
    body:     { size: 15, wdth: 100, wght: 400, lh: 1.45, color: 'chalk' },
    // 24, not 26: on the web Schibsted runs 1.13x Archivo's wdth-78 heads, and
    // "September 2026" at 24/700 is 194.8px against 214 of room at 320.
    h1:       { size: 24, wdth: 100, wght: 700, ls: -0.01, color: 'chalk' },
    h2:       { size: 18, wdth: 100, wght: 700, ls: -0.01, color: 'chalk' },
    h3:       { size: 16, wdth: 100, wght: 700, ls: -0.01, color: 'chalk' },
    eyebrow:  { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    btn:      { size: 14, wdth: 100, wght: 700, ls: 0, color: 'chalk' },
    btnLg:    { size: 16, wdth: 100, wght: 700, ls: 0, upper: 0 },
    dockLbl:  { size: 11, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'dim' },
    fieldLbl: { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    note:     { size: 13, wght: 400, lh: 1.5, color: 'dim' },
    statVal:  { size: 20, wdth: 100, wght: 800, lh: 1, tnum: 1 },
    statLbl:  { size: 12, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    // 20, not 22: "1:32:05" at 20 is 88.9px, inside v1's 92.0 on the crowded live bar.
    timer:    { size: 20, wdth: 100, wght: 800, ls: 0, tnum: 1 },
    // 21, not 22: "1,950" at 21 is 66.6px, inside v1's 66.7 in the KPI tile.
    kpiVal:   { size: 21, wdth: 100, wght: 800, ls: -0.01, lh: 1, tnum: 1 },
    headline: { size: 34, wdth: 100, wght: 800, ls: -0.01, lh: 1, tnum: 1 },
    youGreet: { size: 27, wdth: 100, wght: 800, ls: -0.01, lh: 1.05 },
    chip:     { size: 12, wdth: 100, wght: 600, color: 'steel' },
    segBtn:   { size: 12, wdth: 100, wght: 700, ls: 0, upper: 0, color: 'steel' },
    setInput: { size: 15, wdth: 100, wght: 700, tnum: 1, color: 'chalk' },
    mono:     { size: 12, color: 'chalk' }
  },
  // The one numeral treatment (R6.7): Schibsted ExtraBold tabular figures, the
  // newspaper's results-table figure. Narrower than v1's wdth-118 stamp on the
  // web (1,950 at 40: 127.0 against 131.7px), so no hero figure outgrows v1's box.
  loadNum: { wdth: 100, wght: 800, ls: -0.01, lh: 0.95, tnum: 1 },

  /* ---- the face ----
     native: four upstream statics (schibsted/schibsted-grotesk d485f61),
     t5-checked tonight: unique PostScript names, tnum uniform at 1300/2048 in
     each. v1's own sites only ask 400, 600, 700 and 800 after the snap, so the
     four keys cover them. minLh is Schibsted's hhea (2000 + 528) / 2048.
     The measured surfaces (the Coach card, the goal and feel chips, the
     estimate row, the movement chips) keep Archivo on v1's metrics: this
     vibe hands in no fit table, so native's T.fit draws them in MEASURED_FACE,
     and on the web vibes/oxblood.css sets Archivo on their selectors. Two
     families in all: Schibsted Grotesk and Archivo (R4.1).
     web: 'oxblood-schibsted' is the self-hosted variable woff2's @font-face
     name (vibe-prefixed, so an installed Schibsted never stands in), and
     'oxblood-num' the Vibes card's digits-only file (0-9, 6,560 bytes), the
     one Oxblood file every device prefetches for the picker. Archivo stays
     loaded by rack.css line 1 (0 new bytes), so importUrl is v1's, unchanged,
     and it is the stack's fallback for a letter the latin subset lacks. */
  face: {
    family: 'SchibstedGrotesk',
    keys: ['SchibstedGrotesk_400', 'SchibstedGrotesk_600', 'SchibstedGrotesk_700', 'SchibstedGrotesk_800'],
    snap: { 650: 700, 750: 800 },
    step: 100,
    width: 100,
    minLh: 1.234,
    mono: { ios: 'Menlo', android: 'monospace' },
    web: {
      font: "'oxblood-schibsted', 'Archivo', system-ui, -apple-system, sans-serif",
      num: "'oxblood-num', 'oxblood-schibsted', system-ui, -apple-system, sans-serif",
      mono: 'ui-monospace, monospace',
      importUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap'
    }
  },

  /* ---- radius: the plate ----
     Cards, buttons, fields, cells and tiles at 2–3: printed plates, not app
     tiles. Two things keep their shape on purpose: the sheet keeps the
     platform radius (R6.5), and `pill` stays 999 because chips are the one
     pill (segmented, toast and FAB take square looks). */
  radius: {
    r: 2, sm: 3, sheet: 18, tile: 3, pill: 999, plate: 2, chip: 2, mark: 2, idx: 2,
    round: '50%', hair: 1, bubble: 4, badge: 3
  },

  /* ---- shadows: v1's, unchanged. Few things float, and on this ground a
     black shadow reads as depth; none is coloured. ---- */
  shadow: {
    peek:  { web: [{ x: 0, y: 10, blur: 30, spread: 0, color: 'shade', a: 0.45 }],
             native: { opacity: 0.45, radius: 30, x: 0, y: 10, elevation: 12 } },
    rest:  { web: [{ x: 0, y: 6, blur: 24, spread: 0, color: 'shade', a: 0.45 }],
             native: { opacity: 0.45, radius: 24, x: 0, y: 6, elevation: 10 } },
    toast: { web: [{ x: 0, y: 8, blur: 28, spread: 0, color: 'shade', a: 0.5 }],
             native: { opacity: 0.5, radius: 14, x: 0, y: 8, elevation: 8 } },
    fab:   { web: [{ x: 0, y: 8, blur: 26, spread: 0, color: 'shade', a: 0.58 },
                   { x: 0, y: 1, blur: 0, spread: 0, color: 'shade', a: 0.35 }],
             native: { opacity: 0.58, radius: 26, x: 0, y: 8, elevation: 12 } },
    fabPressed: { web: [{ x: 0, y: 3, blur: 10, spread: 0, color: 'shade', a: 0.5 }] },
    tourCard:   { web: [{ x: 0, y: 18, blur: 50, spread: 0, color: 'shade', a: 0.55 }],
                  native: { opacity: 0.55, radius: 25, x: 0, y: 18 } },
    calTick:    { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'rack', a: 0.55 }] },
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

  /* ---- scrims and glass: v1's. The tour's native stops are built from the
     rack role at these alphas (no legacy `exact` strings). ---- */
  scrim: {
    sheet: { tint: 'backdrop', filter: 'blur(3px)', webkit: false },
    dock:  { tint: 'dockGlass', filter: 'blur(18px) saturate(140%)', webkit: true, native: { intensity: 40 } },
    wkBar: { tint: 'wkBarGlass', filter: 'blur(16px)', webkit: true },
    tour:  { dir: 'to bottom',
             stops: [{ color: 'rack', a: 0.55, at: 0 }, { color: 'rack', a: 0.94, at: 0.42 }],
             native: { locations: [0, 0.42, 1] } }
  },

  /* ---- native chrome: a dark vibe, so v1's; the fixed roles are v1's by rule ---- */
  chrome: {
    statusBar: 'light',
    keyboard: 'dark',
    blurTint: 'dark',
    shadow: '#000000',
    datePicker: 'dark',
    camera: '#000000',
    systemFace: null,
    appearance: 'dark',
    launch: '#14161a',
    manifestTheme: '#14161a',
    webStatusBar: 'black-translucent',
    colorScheme: null
  },

  /* ---- native sign-in stays v1's (§10), in 6-digit spellings ---- */
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
  // The banners' fills are this vibe's lighter danger and good, where v1's
  // white ink falls to 2.81 (guard, owner dev bar) and 2.18 (dev bar). The page
  // ink reads 6.65 on danger and 8.56 on good. The guard's note is drawn at
  // .75 opacity (app/_layout.jsx), where the page ink would be 4.47, so it
  // takes black: 5.38.
  banner: {
    devText:   '#1a0f11',
    guardText: '#1a0f11',
    guardNote: '#000000'
  },

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

  /* ---- data tables: each hex table follows its roles entry by entry (index.js
     ROLES `follows`), in its source's own case ---- */
  groups: {
    chest: '#ff6b4a', back: '#62a8ff', legs: '#ffe07a',
    shoulders: '#3cc4a0', arms: '#efe8dc', core: '#8f99a5',
    fallback: '#bcaaa4'
  },
  groupPlates: {
    chest: '#FF6B4A', back: '#62A8FF', legs: '#FFE07A',
    shoulders: '#3CC4A0', arms: '#EFE8DC', core: '#8F99A5'
  },
  plates: ['#ff6b4a', '#62a8ff', '#ffe07a', '#3cc4a0', '#efe8dc', '#8f99a5'],
  importGroups: {
    chest: 'pRed', back: 'pBlue', legs: 'pYellow',
    shoulders: 'pGreen', arms: 'pWhite', core: 'pChrome', fallback: 'grip'
  },
  mark: ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'],
  subjects: {
    fuel: 'pYellow', weight: 'pYellow', train: 'pBlue', steps: 'pWhite', water: 'pBlue',
    prot: 'pRed', carb: 'pYellow', fat: 'pBlue', all: 'chalk', fallback: 'steel'
  },
  // kpi · plain: no corner tint on either client — every alpha 0, so no path
  // (the web's radial wash, native's flat corner block) paints one.
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
    pill: {
      web:    { owner: 'on', pro: 'lit', custom: 'lit', trial: 'warn', locked: 'off', basic: '' },
      native: { owner: 'good', pro: 'pYellow', custom: 'pYellow', trial: 'warn', locked: 'bad', basic: 'dim' }
    },
    flag: { on: 'good', off: 'bad', lit: 'pBlue', warn: 'warn' }
  },
  conf: { high: 'good', medium: 'warn', low: 'bad' }
});
