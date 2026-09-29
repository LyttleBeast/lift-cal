// Meet Day: Rack as the board on the platform on competition day.
//
// A black board of square panels parted by 2px gutters, each card's head in a
// filled band, every word and figure in lamp white, figures cut from
// Archivo's own extra-condensed end. "This one" — the primary action, the
// chosen chip, today, the active tab, the set he is on — is shown by
// inverting a cell (lamp ground, board ink), never by a hue: colour is left to
// the data. A done set lights a lamp, the set badge is an attempt box, the
// plate strip is the loading chart. It is the experimental slot (V59 §2, §12):
// its composition (design/meet-day.md §8) may re-order, join, merge and split
// boxes within a screen once engine X exists; this file is only its look, and
// until X lands every screen draws in v1's order in these shapes. The spec,
// with every number's source and the checks that produced it, is
// ~/dev/vibes-night/design/meet-day.md.
//
// THE RULES THIS FILE KEEPS, and why (v1.js has the long form):
//
// - It imports nothing. It is copied byte for byte into rack-mobile
//   (src/pure/vibes/defs/meet-day.js) and pinned by sha256, like v1.js.
// - Every colour is 6-digit hex. Only v1 may hold a legacy spelling
//   (index.js LEGACY_EXACT), so no tint here carries an `exact` string:
//   rgba() builds every one from its role and alpha, on both clients.
// - It has every role v1.js has, key for key. Where v1 splits a value
//   { web, native } (colors.onDanger) the split is kept with one colour on
//   both sides, so the two clients read the same shape.
// - It is frozen all the way down, like v1: every caller shares this object.
// - A colour ROLE is named for its job. Meet Day parts roles v1 keeps equal
//   (accent from pYellow, done from pGreen, good from pGreen, warn from
//   pYellow, raised and track from collar) and keeps others equal on purpose
//   (accent = done = inverse = calMark = chalk: all "lit"; faint = dim;
//   well = knockout = rack). Lit things are told apart by SHAPE — an inverted
//   cell is current, a filled disc is done — never by colour.
// - It invents no key. The engine-v2 roles are filled from the start: tagInk,
//   inkOf, colors.band (null: a dark vibe), shadow.calHead / calTarget (the
//   board-black rings), face.bands (the two condensed statics), face.web
//   display / italic / num (vibe-prefixed families), type.meta and `shape`.
//   What the spec needs and the contract lacks — the composition, a knob
//   role, kpi · lane, the notched tick — is asked for in the spec (§15), never
//   written here as a key.

const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

export default deepFreeze({
  id: 'meet-day',
  name: 'Meet Day',
  feel: 'The platform on meet day.',   // 25 characters: one line at 320pt
  experimental: true,                  // the picker shows the plain-text tag "Experimental"
  scheme: 'dark',
  // vibes/icons/meet-day.js: v1's own drawings re-cut with square caps and
  // mitred joins (a machined board, not Feather's round pen), `spark` redrawn
  // as a plug (never a sparkle, SYNTHESIS finding 6), and the glyph-only
  // sites ✕ ⋯ ↳ ✎ ⚙ ⚠ ▾ ▴ drawn in the same grammar. ✓ stays text.
  icons: 'meet-day',
  // No photo anywhere: photos are Iron Age's alone. With no slot, every
  // images.<slot>.band resolves to its default null (no band) through
  // index.js valueOf().
  images: {},
  // The board. The installed web app's status text stays white on it.
  themeColor: '#07080a',

  /* The looks, one per block (design/VOCAB.md; every name here is one
     vocab.js accepts at the deep grade this slot may use). On the web
     vibes/meet-day.css draws each look by selector; natively each block's
     switch branches on it. */
  variants: {
    card: 'panel',          // bar ground, no border, square, 2px board gutters, head in a band
    youCard: 'panel',       // Wins / Improve: a 3pt good / warn rule under the band, never a side stripe
    sectionHeader: 'banner',// a full-width band; the hairline becomes a gutter
    eyebrow: 'v1',          // the type role does it: 13pt condensed, sentence case, steel
    statRow: 'board',       // one board strip of cells on gutters, never boxed tiles (R6.3; in a card, spec §15 E7)
    btn: 'panel',           // primary = the lit panel; plain and ghost = a raised cell
    chip: 'square',
    segmented: 'boxes',     // joined square cells, chosen inverted
    settingsRow: 'v1',      // Settings is a sheet, and a sheet stays calm
    sheetHost: 'full',      // edge to edge, square top, head rule; the grab handle stays at 3:1
    sheetTitle: 'band',
    dock: 'board',          // five cells on gutters, the active one inverted; tabs, order, place untouched
    screenHeader: 'v1',
    kpi: 'plain',           // no corner tint. The week's lanes are kpi · lane once vocab.js has it (spec §15 E3)
    youHero: 'v1',          // 'joined' once vocab.js has it: the since-line in type.meta (spec §15 E4)
    coachCard: 'panel',     // the skin only: Archivo on v1's metrics, 190 / 164, padding 14, border 1
    chart: 'board',         // square columns, hatched unfinished day, square meters; no dot fill (spec §15 E6)
    headline: 'v1',         // the figure bare, condensed: no split-flap; 'bare' re-sets its unit (spec §15 E5)
    field: 'square',
    note: 'v1',
    toast: 'square',
    listRow: 'ledger',      // drawn leaders; record rows in the keyline cell (spec §15 E8); 'board' once vocab.js has it (E13)
    setTable: 'panel',      // the exercise card as a panel, its head a band with the edge-on plate tag
    setRow: 'attempt',      // the attempt box, the current set inverted, done = a lit lamp
    plateStrip: 'loaded',   // the loading chart: renderPlates' own list, drawn edge-on
    calCell: 'edge',        // edge-on plate slivers, today an inverted tab
    fab: 'inverse',         // "Log food" as a lit square
    addTile: 'flat',        // no washes, no border; the lit tiles' icon well and tag on raised
    sessionChrome: 'slab'   // the score bug: square slabs, slots on 1pt rules, no shadow; only the rest time inverted (spec §15 E9)
  },

  /* The params a look reads (vocab.js `params`; index.js SHAPE_PARAMS). */
  shape: {
    // Every drawn rule is knurl, the control-edge grey (3.88 on a panel): a
    // rule here carries structure, so it reaches 3:1. total is the score
    // card's double rule over a total row: 1pt, 2pt of gap, 1pt.
    rule: { ink: 'knurl', hair: 1, head: [2], place: 'above', sub: [2], total: [1, 2, 1] },
    // Leader dots in knurl, not steel: decoration between a name and its
    // value, one step quieter than the words either side of it.
    leader: { ink: 'knurl', dot: 1.5, pitch: 4, min: 16 },
    // The header band: raised, one step up off the panel, holding the
    // card's own title in lamp white (13.84 on it).
    band: { fill: 'raised', ink: 'chalk', height: 30 },
    // 2px of board between panels, cells and strips. The panel sits 1.13:1 off
    // the board (4.56 dE00), so the gutter reads as a seam, not a line.
    gutter: 2,
    // The current-record cell: a 1pt lamp outline, square (15.61 on a panel).
    keyline: { ink: 'chalk', width: 1 },
    // Every card is a panel already; no lead card needs an outline of its own.
    lead: { keyline: false }
  },

  colors: {
    /* ---- native T.colors, key for key ---- */
    // Scoreboard black: the board, every gutter, the well. Research track 4's
    // checked #07080a (C8), not the tell hex #0b0b0b. Neutral (OKLCH C 0.005),
    // so R3.1 governs it, not the Tailwind guard.
    rack:   '#07080a',
    // A panel, the sheet, a field. MD-1's #111317 lifted one step, so a 2px
    // gutter between two panels reads (1.13:1, 4.56 dE00; at 1.08 it merged).
    bar:    '#16181d',
    collar: '#26292f',   // hairlines inside a panel: decorative, never a control's only edge
    // Control edges: 3.88 on a panel, 4.38 on the board, 3.44 on the band.
    knurl:  '#70767f',
    // Lamp white: every word and figure (15.61 on a panel). Warm, like a
    // lamp, and the same hex as the lit things below — it is one light.
    chalk:  '#f5f0e3',
    steel:  '#a8a295',   // secondary: 6.99 on a panel, 6.20 on the band
    dim:    '#9097a3',   // tertiary: 6.04 on a panel, 4.69 on the unlit track. Never under 4.5
    // Track 4's plates, re-toned for colour-blind men first (C6): red leans
    // vermilion, green leans bluish. Worst group pair 19.0 normal, 14.1
    // deuteranopia, 17.5 protanopia. Every one is text-safe on the panel
    // and the band, so inkOf stays the identity.
    pRed:    '#ff5a3c',  // chest, protein, gain; the 45 lb plate
    pBlue:   '#4d97ff',  // back, fat, water, training, cut, drop sets; 35 lb
    pYellow: '#ffe14d',  // legs, carbs, fuel and weight, maintain; 25 lb
    pGreen:  '#3cc4a0',  // shoulders, steps; 10 lb
    pWhite:  '#f2f2f2',  // arms, the steps subject; 5 lb
    pChrome: '#858c96',  // core; 2.5 lb
    // The green light: its own hue, apart from the shoulders plate (C21).
    good: '#4be38a',
    // Amber, because the copy calls it amber: "green when they move the way
    // your goal wants and amber the other way" (you.js:1068, index.js
    // HUE_NAMED). MD-1's warn was the legs yellow, a lemon doing three jobs;
    // this is 21 dE00 off it.
    warn: '#ffa42e',
    bad:  '#ff5a3c',
    // native text-on-colour keys (aliases build() fills from their roles).
    // Board ink cut out of a lit or plate fill: white on #ff5a3c is only 2.72.
    onYellow: '#07080a',       // = onAccent
    onGreen:  '#07080a',       // = onDone
    onPlate:  '#07080a',       // figures on a plate chip: 5.90 or better on all six
    white:    '#07080a',       // = onDanger
    pYellowPressed: '#d9d3c4', // = accentPressed
    fallback: '#a8a295',       // = groups.fallback, which follows steel

    /* ---- semantic roles ---- */
    // The accent is an inversion, not a hue (C5): lamp ground, board ink.
    // It needs the declared R2.7 exemption (Q-P5) — 2.59 dE00 from amber-50
    // — because it is the ink itself, turned over.
    accent:        '#f5f0e3',
    focus:         '#f5f0e3',
    accentPressed: '#d9d3c4',  // a pressed lit panel: board ink on it 13.42
    onAccent:      '#07080a',  // 17.61 on the lamp
    danger:        '#ff5a3c',  // a keyline and words (5.73 on a panel); the swipe panel's fill
    onDanger:      { web: '#07080a', native: '#07080a' },  // one colour; v1's split shape kept
    // Done is a lit lamp, the same light as the ink. A done set is a filled
    // disc in its box; the current set is an inverted box. Shape tells them apart.
    done:          '#f5f0e3',
    onDone:        '#07080a',
    well:          '#07080a',  // the recess inside a panel is the board: set inputs, chips, lanes
    knockout:      '#07080a',  // board ink on the lit fill: 17.61
    inverse:       '#f5f0e3',
    calMark:       '#f5f0e3',  // "the white head" (HUE_NAMED white), ringed in board (shadow.calHead)
    // The band, the attempt box, a cell button: one step up off the panel
    // (1.13:1 from it, 1.27:1 from the board).
    raised:        '#202329',
    // An unlit lamp's disc and a meter's empty part: a step above the band.
    track:         '#2a2d33',
    // The grab handle (3.88 on the sheet), a toggle's off track, an unlit
    // lamp's ring (3.88 on a panel, 3.44 on the band, 3.01 on its own track).
    // A toggle's off knob is steel today, and steel on this track is 1.80:
    // the knob needs its own role, lamp white on it 4.02 (spec §15 E1).
    grip:          '#70767f',
    faint:         '#9097a3',  // = dim on purpose: no fourth, fainter grey (never-do 5)
    onWarn:        '#07080a',  // native trial banner ink on its solid amber bar: 10.11
    shade:         '#000000',
    lift:          '#ffffff',
    // Native's flat forms of the hero and lit add-tile washes (accent .10 and
    // .05 over the well). addTile · flat draws neither; kept exact for a
    // v1-look fallback.
    tileHero:      '#1f1f20',
    tileLit:       '#131415',
    band:          null        // a dark vibe: no status strip
  },

  /* The set badge's letter on the attempt box (raised): W 12.09, F 5.08,
     D 5.39. The current set's box is inverted whatever its type, and its
     letter or figure is then knockout (setRow · attempt). */
  tagInk: { W: 'pYellow', F: 'pRed', D: 'pBlue' },
  // Every plate reaches 4.5:1 as small text on the panel (5.23 or better)
  // and on the band (4.64 or better), so each inks itself.
  inkOf: { pRed: 'pRed', pBlue: 'pBlue', pYellow: 'pYellow', pGreen: 'pGreen', pWhite: 'pWhite', pChrome: 'pChrome' },

  alpha: {
    yellow: 'pYellow', red: 'pRed', blue: 'pBlue', green: 'pGreen', ground: 'rack',
    accent: 'accent', danger: 'danger', warn: 'warn'
  },

  /* Tints: a role and an alpha, never an exact string. */
  tint: {
    setDone:   { color: 'done',    a: 0 },     // no row wash: the lamp says done
    // v1's 600ms tick flash, in lamp white at .10, not v1's .28: at .28 the
    // row's steel and dim words (the e1RM) fall to 2.98 / 2.58 at the peak. The
    // lamp lighting in the check is the feedback here; the flash only echoes it.
    setFlash:  { color: 'accent',  a: 0.1 },
    // The attempt box: the raised square itself, not a wash; the letter
    // carries the type (tagInk).
    tagW:      { color: 'raised',  a: 1 },
    tagF:      { color: 'raised',  a: 1 },
    tagD:      { color: 'raised',  a: 1 },
    dropRail:  { color: 'pBlue',   a: 1 },     // the drop set's 2px rail at full strength: 6.08 on a panel
    dropAdd:   { color: 'pBlue',   a: 0.5 },   // + Drop's edge; the button carries words
    pickSel:   { color: 'accent',  a: 0.1 },
    block:     { color: 'accent',  a: 0 },     // a lifting block is a band over its cards, not a wash
    // Coach's first-workout pulse on the set check, in warn, not in lamp
    // white: a lamp-white wash would half-light the box, and a lit box means
    // done — the "box that looks already ticked" rack.css warns against.
    // The unlit lamp's grip ring holds 3:1 at the steady .10 (Reduce Motion);
    // the peak is a moment of a pulse, reported in the spec.
    coachBase: { color: 'warn',    a: 0.1 },
    coachLow:  { color: 'warn',    a: 0.05 },
    coachHigh: { color: 'warn',    a: 0.24 },
    rowPress:  { color: 'lift',    a: 0.05 },
    // No delta pills (R6.6): a delta is bare signed text with its arrow.
    pillBase:  { color: 'lift',    a: 0 },
    pillUp:    { color: 'good',    a: 0 },
    pillDown:  { color: 'bad',     a: 0 },
    pillWarn:  { color: 'warn',    a: 0 },
    // The calorie meter keeps v1's named zone hues (HUE_NAMED): blue cut,
    // yellow hold, red gain.
    zoneCut:   { color: 'pBlue',   a: 0.16 },
    zoneHold:  { color: 'pYellow', a: 0.18 },
    zoneGain:  { color: 'pRed',    a: 0.16 },
    dockGlass:  { color: 'rack',   a: 1 },     // the dock is an opaque board strip
    wkBarGlass: { color: 'bar',    a: 1 },     // the score bug is an opaque slab
    backdrop:   { color: 'shade',  a: 0.65 },
    trajGood:     { color: 'good',   a: 0.18 },
    trajWarn:     { color: 'warn',   a: 0.18 },
    trajBad:      { color: 'bad',    a: 0.18 },
    // "Next week", the review's callout: a tinted band (R6.1's callout role)
    // with a lamp edge at .18. Lamp text on it 14.02.
    reviewBg:     { color: 'accent', a: 0.07 },
    reviewBorder: { color: 'accent', a: 0.18 },
    runway:       { color: 'rack',   a: 0.55 },
    runwayEdge:   { color: 'rack',   a: 0.7 }
  },

  /* ---- type ----
     Three widths, three jobs, and the same three cuts on both clients:
       wdth 62 · 800  every figure (native: ArchivoExtraCondensed-ExtraBold)
       wdth 75 · 700  every head, the greeting, button words, segment words
                      and the set inputs (native: ArchivoCondensed-Bold)
       wdth 100       every sentence, label and the Coach card (v1's files)
     Condensed is never a sentence (T6 §3.4). No preset is caps: the strings
     are authored in sentence case, so `upper: 0` and tracking 0 (N13-N15).
     Nothing under 11pt. tnum on every figure: the condensed statics' default
     digits are proportional. */
  type: {
    body:     { size: 15, wdth: 100, wght: 400, lh: 1.45, color: 'chalk' },
    h1:       { size: 28, wdth: 75,  wght: 700, ls: 0, color: 'chalk' },   // "September 2026" 174pt of 188 at 320
    h2:       { size: 20, wdth: 75,  wght: 700, ls: 0, color: 'chalk' },
    h3:       { size: 16, wdth: 75,  wght: 700, ls: 0, color: 'chalk' },
    // In a band a card's title takes shape.band.ink (lamp); elsewhere steel.
    eyebrow:  { size: 13, wdth: 75,  wght: 700, ls: 0, upper: 0, color: 'steel' },
    // Button words in the condensed cut, like a board's cell legends. At 15
    // they measure 12-13% narrower than v1's 14 / wdth 92 at every button
    // (spec §5.4), so no split row wraps that v1's didn't. The toast shares
    // this preset on native: a toast is a few words, never a paragraph.
    btn:      { size: 15, wdth: 75,  wght: 700, ls: 0, color: 'chalk' },
    btnLg:    { size: 17, wdth: 75,  wght: 700, ls: 0, upper: 0 },
    dockLbl:  { size: 11, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    fieldLbl: { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    note:     { size: 13, wght: 400, lh: 1.5, color: 'dim' },
    statVal:  { size: 28, wdth: 62.5, wght: 800, lh: 1, tnum: 1 },
    statLbl:  { size: 12, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    timer:    { size: 22, wdth: 62.5, wght: 800, ls: 0, tnum: 1 },
    kpiVal:   { size: 30, wdth: 62.5, wght: 800, ls: 0, lh: 1, tnum: 1 },
    headline: { size: 34, wdth: 62.5, wght: 800, ls: 0, lh: 1, tnum: 1 },
    // Both lines one colour: the name's accent is lamp white, the same as
    // the greeting, so no word of a headline stands apart (N17).
    youGreet: { size: 30, wdth: 75,  wght: 700, ls: 0, lh: 1.05 },
    chip:     { size: 12, wdth: 100, wght: 600, color: 'steel' },
    segBtn:   { size: 13, wdth: 75,  wght: 700, ls: 0, upper: 0, color: 'steel' },
    // 15, as v1: at 16 or more iOS Safari stops zooming on focus, which is
    // behaviour, not look. wdth 75 / 700 reads mid-set better than wdth 62.
    setInput: { size: 15, wdth: 75,  wght: 700, tnum: 1, color: 'chalk' },
    mono:     { size: 12, color: 'chalk' },
    meta:     { size: 12, wdth: 100, wght: 400, lh: 1.5, color: 'steel' }
  },
  // .load-num at the call sites' own sizes (26-40): the one numeral
  // treatment, tall and narrow. lh .95 is floored at 1.088 on native.
  loadNum: { wdth: 62.5, wght: 800, ls: 0, lh: 0.95, tnum: 1 },

  /* ---- the face ----
     Archivo only: v1's own family (OFL 1.1, no Reserved Font Name), pushed to
     the condensed end of its width axis. Native: v1's four package files for
     wdth 100, plus two Google css2 static instances of the same Archivo
     v2.001 the web draws, latin-subset (72,780 bytes together):
     ArchivoExtraCondensed-ExtraBold (wdth 62 · 800; the picker face) and
     ArchivoCondensed-Bold (wdth 75 · 700). Native ignores width, so the two
     bands below send exactly Meet Day's presets to those cuts: the survey of
     the native tree finds no literal wdth at or under 64 or in 74-76 (v1's
     one literal under 80 is ErrorScreen's 78, which stays in Archivo).
     Web: 'meet-day-archivo', a self-hosted latin variable woff2 of Archivo
     cut to wdth 62-100 and wght 400-800 (so nothing in this vibe can be drawn
     wider than a sentence), and 'meet-day-num', digits only, the one file
     vibe.js prefetches for the Vibes card. Vibe-prefixed, so an installed
     Archivo can never stand in, and same-origin, so the service worker keeps
     them offline. v1's Google-hosted 'Archivo' follows in every stack. The
     @import in rack.css line 1 stays byte-identical (importUrl is its
     record). The Coach card keeps Archivo on v1's metrics (CARD_FACE). */
  face: {
    family: 'Archivo',
    keys: ['Archivo_400', 'Archivo_600', 'Archivo_700', 'Archivo_800'],
    snap: { 650: 700, 750: 800 },
    step: 100,
    width: 100,
    minLh: 1.088,
    mono: { ios: 'Menlo', android: 'monospace' },
    web: {
      font: "'meet-day-archivo', 'Archivo', system-ui, -apple-system, sans-serif",
      mono: 'ui-monospace, monospace',
      importUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap',
      // Heads are the same file at wdth 75: one family, one outline.
      display: "'meet-day-archivo', 'Archivo', system-ui, -apple-system, sans-serif",
      // Meet Day sets no italic; the stack is the face's own.
      italic: "'meet-day-archivo', 'Archivo', system-ui, -apple-system, sans-serif",
      // Figures: digits from the small file (wdth 62-75, wght 700-800),
      // anything else — a comma, a colon, a minus — from the full one.
      num: "'meet-day-num', 'meet-day-archivo', 'Archivo', system-ui, -apple-system, sans-serif"
    },
    // theme.js build(): the first band whose [min, max] holds a preset's wdth
    // draws it in this family. Each band ships one weight and has its own
    // empty snap, so every request in it resolves to its one file. Both cuts'
    // hhea is 878 / -210 on 1000, as the package's, so minLh stays 1.088.
    bands: [
      { max: 64, family: 'ArchivoExtraCondensed', keys: ['ArchivoExtraCondensed_800'], snap: {}, weights: [800], minLh: 1.088 },
      { min: 74, max: 76, family: 'ArchivoCondensed', keys: ['ArchivoCondensed_700'], snap: {}, weights: [700], minLh: 1.088 }
    ]
  },

  /* ---- radius: a square board ----
     Panels, bands, cells, buttons, chips, fields, the sheet's top and the
     attempt box are square or 2. Only lamps, dots, toggle knobs and the
     avatar stay round (`round`): a round thing on this board is a light or
     a face. `pill` is 2, so nothing reachable through it stays a pill. */
  radius: {
    r: 2, sm: 2, sheet: 0, tile: 2, pill: 2, plate: 0, chip: 0, mark: 0, idx: 0,
    round: '50%', hair: 0, bubble: 0, badge: 0
  },

  /* ---- shadows ----
     None on the FAB, the toast, the rest slab or the peek bar: a lit cell
     stands off the board by value (17.61), and a board casts no shadows. No
     glow anywhere, the lamps included: a lit lamp is 12.13:1 against an unlit
     one without one. The tour card keeps v1's, for its scrim. The rings are
     outlines, and the calorie meter's are board black at full strength: a
     1px notch that parts the white head, target and ticks from any fill. */
  shadow: {
    peek:  { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    rest:  { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    toast: { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    fab:   { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    fabPressed: { web: [] },
    tourCard:   { web: [{ x: 0, y: 18, blur: 50, spread: 0, color: 'shade', a: 0.55 }],
                  native: { opacity: 0.55, radius: 25, x: 0, y: 18 } },
    calTick:    { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'rack' }] },
    flame:      { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'accent', a: 0.35, inset: true }] },
    // The KPI day lamps: unlit is a knurl bezel, lit is filled (no ring),
    // today is ringed in the well and then steel, or lamp when lit.
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
    tourLit:    { web: [{ x: 0, y: 0, blur: 0, spread: 2, color: 'accent' }] },
    // The white head and the dashed target (and their guide swatches), each
    // ringed 1px in board black (native: a 1pt border): lamp on the ring
    // 17.61, the ring on any fill 5.90 or better. Bare, the head on the
    // yellow hold fill is 1.14.
    calHead:    { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'rack' }] },
    calTarget:  { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'rack' }] }
  },

  /* ---- scrims: no glass on the board ----
     The dock and the workout bar are opaque (their filters none); the only
     blur left is the sheet backdrop's 3px. webkit stays v1's, a fixed fact
     about rack.css. The tour fogs to the board. */
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

  /* ---- native chrome: a dark board under light system text ---- */
  chrome: {
    statusBar: 'light',
    keyboard: 'dark',
    blurTint: 'dark',        // not drawn: the dock is opaque
    shadow: '#000000',       // the tour card's only shadow
    datePicker: 'dark',
    camera: '#000000',
    systemFace: null,        // as v1: no fontFamily key at the system-font sites
    // Fixed at build or install time; every vibe holds v1's.
    appearance: 'dark',
    launch: '#14161a',
    manifestTheme: '#14161a',
    webStatusBar: 'black-translucent',
    colorScheme: 'dark'      // the web's own date and select controls draw on the board
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

  // Board ink on the dev bar (pRed, 6.47) and the guard bar (pGreen, 9.15).
  banner: {
    devText:   '#07080a',
    guardText: '#07080a',
    guardNote: '#07080a'
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
    chest: '#ff5a3c', back: '#4d97ff', legs: '#ffe14d',
    shoulders: '#3cc4a0', arms: '#f2f2f2', core: '#858c96',
    fallback: '#a8a295'
  },
  groupPlates: {
    chest: '#FF5A3C', back: '#4D97FF', legs: '#FFE14D',
    shoulders: '#3CC4A0', arms: '#F2F2F2', core: '#858C96'
  },
  plates: ['#ff5a3c', '#4d97ff', '#ffe14d', '#3cc4a0', '#f2f2f2', '#858c96'],
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
    pill: {
      web:    { owner: 'on', pro: 'lit', custom: 'lit', trial: 'warn', locked: 'off', basic: '' },
      native: { owner: 'good', pro: 'pYellow', custom: 'pYellow', trial: 'warn', locked: 'bad', basic: 'dim' }
    },
    flag: { on: 'good', off: 'bad', lit: 'pBlue', warn: 'warn' }
  },
  // The estimator's confidence dot keeps its words ("a fair guess"), so warn
  // against bad under deuteranopia (9.95 dE00) never carries it alone.
  conf: { high: 'good', medium: 'warn', low: 'bad' }
});
