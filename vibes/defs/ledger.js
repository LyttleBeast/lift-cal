// Ledger — the club's record book: ruled columns on bottle green, as data.
//
// A DEEP vibe (V59 §2, "same order, new shapes"): every box, word and number
// is v1's, in v1's order; what changes is how each box is drawn. The spec,
// with every number measured and where it came from, is
// ~/dev/vibes-night/design/ledger.md.
//
// THE IDEA. Rack set like a sports club's record book (Spalding's Official
// Base Ball Record, 1910): cream ink on bottle-green book cloth; a sturdy text
// serif for every word and every figure; condensed gothic heads hanging from
// rules instead of sitting in boxes; drawn leaders from a name to its figure,
// and only the ranked column bold. One box per tab (the lead) keeps a ground.
// One pink ribbon marks "here, now": today, the tab you are on, the field in
// focus, the chosen tab of a control, and the Coach. It never fills a button;
// the thing to do is a cream slab with green words.
//
// THE RULES THIS FILE KEEPS (v1.js says why each exists):
// - It imports nothing and is frozen all the way down.
// - Every colour is 6-digit hex; no LEGACY_EXACT spelling (those are v1's).
// - Roles are named for their job. The accent never paints data or a verdict.
// - The roles the copy names by hue stay in that hue (index.js HUE_NAMED):
//   pBlue blue, pYellow yellow, pRed and bad red, calMark white, good green,
//   dim grey, warn amber.
// - Every `fixed` role holds v1's value.
// - It names only looks vocab.js v2 accepts, each one a deep vibe may name.
// - Every text colour it sets reaches 4.5:1 on every surface it lands on, and
//   every control edge and mark 3:1 (tools/ledger-spec/contrast.mjs).
//
// THE TWO FAMILIES (R4.1, counting Archivo because the Coach card keeps it):
//   Manuale (Omnibus-Type; OFL 1.1, no Reserved Font Name): every sentence,
//     label, button and figure. Its default figures are tabular lining.
//   Archivo (v1's own; OFL 1.1, no RFN): the heads, at wdth 75 / 700 — native
//     ArchivoCondensed-Bold, the same file and key Meet Day ships — and the
//     Coach card, on v1's metrics, as v1 draws it.
// Source Serif 4, research's pick, carries the Reserved Font Name "Source"
// (upstream LICENSE.md, name ID 0 in every file), and a Latin subset is a
// Modified Version: PLAN rule 6 bars it. Manuale keeps the record book's
// serif without that question (spec §4.6 keeps the renamed route for Micah).

const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

export default deepFreeze({
  id: 'ledger',
  name: 'Ledger',
  feel: 'Ruled columns on club green.',
  experimental: false,
  scheme: 'dark',
  icons: 'ledger',          // vibes/icons/ledger.js: drawn by rule, square caps; spark a tucked slip
  images: {},               // no photo anywhere (photos are Iron Age's alone): every slot closes up
  themeColor: '#0e1813',    // the <meta> follows the page, as v1's does

  /* The looks (vocab.js v2). The record book's devices land on the blocks
     that print a name against a figure (settings rows, list rows), on the
     rules that open sections, cards and exercises, and on the printed month.
     Two looks are chosen because a shipped sentence names a shape:
     field · square ("in this box … Clear the box", food.js:3320) and kpi ·
     word with its pills kept by tint.pill* above 0 ("The pill is the
     difference between the two weeks", you.js:802). */
  variants: {
    card: 'ruled',          // no box: each card hangs from a 1pt knurl rule; the tab's lead keeps a box
    youCard: 'ruled',       // Wins / Improve ink their head rule good / warn, never a side stripe
    sectionHeader: 'rule',  // a 2pt knurl rule at full width, the head hanging from it (type.h3)
    eyebrow: 'v1',          // changed through type.eyebrow only: 13 / 600, sentence case, steel
    statRow: 'line',        // a box-score line: values on one baseline, labels under; no tiles.
                            // Not 'ledger': three 44pt lines per row would push You down ~300pt
    btn: 'inverse',         // the primary is the cream slab; the pink never fills a button
    chip: 'tag',            // square tags on raised; chosen = inverted
    segmented: 'tabs',      // words on the page; chosen = chalk over a 2pt pink underline
    settingsRow: 'ledger',  // label … drawn leader … value, one hairline under the group
    sheetHost: 'v1',        // the platform sheet: bar, 18 top corners, the grab handle at 3.69
    sheetTitle: 'rule',     // the title over a hairline at the sheet's content width
    dock: 'rail',           // opaque on the page green, under a 2pt knurl rule; the active cell's 3pt pink bar
    screenHeader: 'masthead', // the kicker, the condensed title, a 2pt rule under both
    kpi: 'word',            // no tiles; word-sized sparklines; the delta keeps its pill (the copy names it)
    youHero: 'v1',          // avatar | greeting | gear, as v1 places them; the greeting in the condensed head
    coachCard: 'flat',      // THE lead box on You and Train: bar ground, border in the ground's colour
    chart: 'ink',           // single-ink strokes, no area wash, no glow, square-topped bars
    headline: 'v1',         // the figure alone, re-set by type.headline and loadNum (Manuale Bold)
    field: 'square',        // a box, because the copy says "this box": radius 2, a knurl edge
    note: 'v1',             // a footnote is smaller type: 13 dim, no device
    toast: 'strip',         // a cream slip the content's width, square, the words flush left
    listRow: 'ledger',      // name … drawn leader … value, the value alone bold (the ranked column)
    setTable: 'ruled',      // no card: the exercise hangs from its rule; column heads over a 1pt rule
    setRow: 'ruled',        // rows on hairlines; inputs on a 1pt rule; the badge a bare letter or figure
    plateStrip: 'v1',       // plates as flat fields with page-green figures: colour as identifier
    calCell: 'ruled',       // a printed month: hairlines between cells; today boxed by a 2pt pink keyline
    fab: 'inverse',         // the cream slab, square; the pink stays off it
    addTile: 'ruled',       // no tiles: a two-column grid parted by hairlines; Photo's camera in pink
    sessionChrome: 'flat'   // opaque, no glass, no shadows; the top bar on bar
  },

  /* The params the named looks read (vocab.js params). One rule ink, knurl
     (4.67 on the page, 3.69 on bar): the rules carry structure, so they reach
     3:1, and they stay a muted green-grey so the page reads as a ruled ledger
     and not a cream-ruled broadsheet (N12). Two weights: 2pt opens a chapter
     (a section, the masthead, the dock), 1pt opens an article (a card, an
     exercise). A head HANGS from its rule (place 'above', T3 C3). Never a
     double, thick-thin or Oxford rule: those are Iron Age's. */
  shape: {
    rule: { ink: 'knurl', hair: 1, head: [2], place: 'above', sub: [1], total: [1] },
    // D4's leader: 1pt dots on a 4pt pitch, at least 16pt long, in the rule ink
    leader: { ink: 'knurl', dot: 1, pitch: 4, min: 16 },
    // unused by every look named here; the vocab's defaults, written out
    band: { fill: 'raised', ink: 'chalk', height: 30 },
    gutter: 2,
    // the add grid's "ai" tag: a 1pt steel keyline (9.39 on the page)
    keyline: { ink: 'steel', width: 1 },
    // the lead box is told by value (bar is a 1.26 step off the page), not by outline
    lead: { keyline: false }
  },

  colors: {
    /* ---- surfaces ---- */
    rack:   '#0e1813',   // the page: bottle-green book cloth. Tailwind v3 nearest neutral-900 at 6.89, v4 olive-900 5.75
    bar:    '#1c2e23',   // the lead box, the Coach card, sheets: 1.26:1 off the page (Club's #15231b was 1.07 and vanished, C17)
    collar: '#2a3f33',   // decorative lines only (chart grids, the Coach go row, the heat strip's empty day): never a control's only edge
    knurl:  '#6b8876',   // every drawn rule, leader and control edge: 4.67 page, 3.69 bar, 3.28 raised
    /* ---- ink ---- */
    chalk:  '#f1ead8',   // cream: 15.10 page, 11.95 bar
    steel:  '#b8bda7',   // labels, secondary lines: 9.39 / 7.43
    dim:    '#9ca38d',   // tertiary (notes, meta, dock labels): 6.94 / 5.49 / 4.87 on raised; 4.54 on a chosen row in a sheet. HSL s .11: grey
    /* ---- the plates (data, never chrome) ---- */
    pRed:    '#ff7856',  // chest, protein, gain. Club's #ff6b4a lifted so red text holds 4.5 on a chosen row in a sheet (4.56)
    pBlue:   '#6aaaf8',  // back, fat, water, training, cut, drop sets
    pYellow: '#ffe07a',  // legs, carbs, fuel and weight, maintain
    pGreen:  '#36bf9c',  // shoulders, steps: a bluish green, for deuteranopes (T4 R5)
    pWhite:  '#efe9dc',  // arms, the steps subject
    pChrome: '#7f878e',  // core. Graphics and large text; small core-coloured text inks steel (inkOf)
    good: '#36bf9c',     // green, as the copy names it
    warn: '#ffe07a',     // amber (HSL 46)
    bad:  '#ff7856',     // red (HSL 12)
    /* ---- native legacy keys: each equals the role that now has its job ---- */
    onYellow: '#0e1813',       // = onAccent
    onGreen:  '#0e1813',       // = onDone
    onPlate:  '#0e1813',       // a figure on a plate chip: 4.97 (core) to 14.98 (arms)
    white:    '#0e1813',       // = onDanger: page green on the red swipe panel, 6.97 (white would be 2.6)
    pYellowPressed: '#f09ab2', // = accentPressed
    fallback: '#b8bda7',       // = steel, as groups.fallback follows it
    /* ---- semantic roles ---- */
    accent:        '#ffb3c8', // the pink ribbon: here and now. v3 rose-300 5.58, v4 6.12; 23.9 ΔE00 from chest, its nearest data colour
    focus:         '#ffb3c8', // the focus ring and a focused field's edge: 10.82 page, 8.56 bar
    accentPressed: '#f09ab2', // onAccent on it 8.60
    onAccent:      '#0e1813', // 10.82 on the accent
    danger:        '#ff7856', // a keyline and words; the swipe panel's fill
    onDanger:      '#0e1813', // one colour on both clients (v1's split is only a spelling)
    done:          '#36bf9c', // the set check's fill, the running rest line
    onDone:        '#0e1813', // the drawn tick on the check: 7.84
    well:          '#0e1813', // a recess inside a sheet is the page (never a same-fill recess, N9)
    knockout:      '#0e1813', // green words cut from the cream slab: 15.10
    inverse:       '#f1ead8', // the primary slab, the FAB, the toast, a chosen tag
    calMark:       '#fcfcfa', // "the white head", ticks and dashed target: HSL s .25 l .98, white. 12.41 on the track
    raised:        '#22372b', // tags, plain buttons, the rest pill, the peek bar, Coach bubbles: 1.42 page, 1.13 bar
    track:         '#2d3431', // empty meters: near-neutral, so the calorie zones keep the hues the guide names (spec §3.5)
    grip:          '#6b8876', // = knurl: the grab handle 3.69 on the sheet (decision c), the toggle's off track
    faint:         '#9ca38d', // = dim: no fourth, fainter grey
    onWarn:        '#0e1813', // native's solid trial bar: 13.98
    shade:         '#000000', // under the sheet backdrop and the tour card only
    lift:          '#ffffff', // the pressed-row wash and the resting pill
    tileHero:      '#1c2e23', // addTile · ruled draws no tile and no wash: the sheet itself
    tileLit:       '#1c2e23',
    band:          null       // a dark vibe: no strip under the status bar
  },

  alpha: {
    yellow: 'pYellow', red: 'pRed', blue: 'pBlue', green: 'pGreen', ground: 'rack',
    accent: 'accent', danger: 'danger', warn: 'warn'
  },

  tint: {
    setDone:   { color: 'done',    a: 0.10 },  // a done row you can see from the bench: 1.18 off the page (v1's .07 is 1.10)
    setFlash:  { color: 'accent',  a: 0.16 },  // down from .28: dim holds 4.92 and red 4.94 at the flash's peak
    tagW:      { color: 'pYellow', a: 0 },     // setRow · ruled: the letter is the badge, no tinted square
    tagF:      { color: 'pRed',    a: 0 },
    tagD:      { color: 'pBlue',   a: 0 },
    dropRail:  { color: 'pBlue',   a: 0.70 },  // the drop rail is structure: 4.28 on the page (v1's .45 gives 2.51)
    dropAdd:   { color: 'pBlue',   a: 0.45 },  // + Drop's edge; its words carry the control
    pickSel:   { color: 'chalk',   a: 0.07 },  // a chosen row is a lighter leaf, never a pink wash: dim 4.54 on it in a sheet
    block:     { color: 'accent',  a: 0 },     // a lifting block is framed by rules, not washed
    coachBase: { color: 'accent',  a: 0.14 },  // v1's: the Coach pulse round a set check is the Coach's pink
    coachLow:  { color: 'accent',  a: 0.07 },
    coachHigh: { color: 'accent',  a: 0.38 },
    rowPress:  { color: 'lift',    a: 0.05 },  // a touch more than v1's .04 on the green
    pillBase:  { color: 'lift',    a: 0.06 },  // the delta pill stays (you.js:802 names it)
    pillUp:    { color: 'good',    a: 0.16 },
    pillDown:  { color: 'bad',     a: 0.16 },
    pillWarn:  { color: 'warn',    a: 0.16 },
    zoneCut:   { color: 'pBlue',   a: 0.32 },  // over the neutral track: hue 209 (v1's wash 214) — "Blue — cut"
    zoneHold:  { color: 'pYellow', a: 0.32 },  // hue 53 (v1's 47) — "Yellow — hold"
    zoneGain:  { color: 'pRed',    a: 0.32 },  // hue 15 (v1's 339) — "Red — gain"
    dockGlass:  { color: 'rack',  a: 1 },      // dock · rail is opaque, on the page's own green
    wkBarGlass: { color: 'bar',   a: 1 },      // the live session's top bar on bar, as native draws it: its own header
    backdrop:   { color: 'shade', a: 0.6 },
    trajGood:     { color: 'good',   a: 0.18 },
    trajWarn:     { color: 'warn',   a: 0.18 },
    trajBad:      { color: 'bad',    a: 0.18 },
    reviewBg:     { color: 'chalk',  a: 0.06 }, // "Next week" is the callout: a faint cream band, no border, no pink wash
    reviewBorder: { color: 'chalk',  a: 0 },
    runway:       { color: 'rack',   a: 0.55 }, // v1's (a dark vibe)
    runwayEdge:   { color: 'rack',   a: 0.7 }
  },

  /* ---- type ----
     Manuale for everything but the heads; the heads are Archivo at wdth 75 /
     700 (face.bands on native, 'ledger-heads' on the web). Weights have one
     job each: 400 running text, 600 labels and names, 700 figures, buttons
     and heads. Nothing under 11 (the dock label is the one 11). No caps role:
     every label is shown as authored (upper: 0 wherever v1 had caps). Sizes
     follow Manuale's metrics: its x-height is 0.93× Archivo's and its lining
     figures 0.63 em tall, so running text sits at 16 (= v1's 15 in x-height)
     and figures are set a step up where v1's wide 800 figures were. */
  type: {
    body:     { size: 16, wdth: 100, wght: 400, lh: 1.45, color: 'chalk' },
    h1:       { size: 34, wdth: 75,  wght: 700, ls: 0, lh: 1.1, color: 'chalk' },  // "September 2026" 211.1 in the 214 its header leaves at 320
    h2:       { size: 26, wdth: 75,  wght: 700, ls: 0, color: 'chalk' },           // sheet titles
    h3:       { size: 22, wdth: 75,  wght: 700, ls: 0, color: 'chalk' },           // section heads (sectionHeader · rule)
    eyebrow:  { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' }, // a label, not a head: "kcal left today" and the weekday row are eyebrows too
    btn:      { size: 16, wdth: 100, wght: 600, ls: 0, color: 'chalk' },
    btnLg:    { size: 17, wdth: 100, wght: 700, ls: 0, upper: 0 },                 // "Start workout", as authored; ink is the kind's
    dockLbl:  { size: 11, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'dim' },
    fieldLbl: { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    note:     { size: 13, wght: 400, lh: 1.5, color: 'dim' },
    statVal:  { size: 22, wdth: 100, wght: 700, lh: 1, tnum: 1 },                  // "12,480" 60.6 against v1's 68.9
    statLbl:  { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    timer:    { size: 22, wdth: 100, wght: 700, ls: 0, tnum: 1 },                  // "1:32:05" 66.1 against v1's 82.1
    kpiVal:   { size: 22, wdth: 100, wght: 700, ls: 0, lh: 1, tnum: 1 },
    headline: { size: 32, wdth: 100, wght: 700, ls: -0.01, lh: 1, tnum: 1 },       // You prints three: none at hero size (R6.7)
    youGreet: { size: 34, wdth: 75,  wght: 700, ls: 0, lh: 1.1 },                  // "Good afternoon," 208.4 against v1's 212.0
    chip:     { size: 13, wdth: 100, wght: 600, color: 'steel' },
    segBtn:   { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    setInput: { size: 17, wdth: 100, wght: 700, tnum: 1, color: 'chalk' },         // one step up, to read between sets; 17 >= the web's 16, so no zoom
    mono:     { size: 12, color: 'chalk' },                                        // face.mono, the paste box only
    meta:     { size: 13, wdth: 100, wght: 400, lh: 1.45, color: 'dim' }           // "Member since …", "last 7 days": roman, never italic
  },
  // .load-num at the call sites' own sizes (26-40): the record book's figure,
  // Manuale Bold, tabular by default. Narrower than v1's plate figure at every
  // site ("1,950" at 40 is 88.3 against 109.5), so no box outgrows v1's.
  loadNum: { wdth: 100, wght: 700, ls: -0.01, lh: 1, tnum: 1 },

  /* ---- the face ----
     Native: Manuale 400 / 600 / 700, Google css2's static instances of
     Manuale v1.002 (fonts.gstatic.com/s/manuale/v31), latin-subset (33.0,
     33.6, 33.5 KB), PostScript names Manuale-Regular / -SemiBold / -Bold;
     digits tabular at 502 / 507 / 510. v1's 800 sites snap to Bold. hhea
     980 / -236 on 1000: minLh 1.216. The band sends exactly the presets set
     at wdth 75 (h1, h2, h3, youGreet) to ArchivoCondensed_700 — the css2
     static Meet Day ships under the same key (37.7 KB, hhea 878 / -210, so
     1.088); no native literal site passes a width in 74-76 (Meet Day's
     survey). Four TTFs with the band, the picker face (Manuale_700) included.
     Web: 'ledger-manuale', Manuale[wght] from google/fonts cut to latin + → ≈
     at wght 400-800 (38.9 KB); 'ledger-heads', Archivo[wdth,wght] cut to
     latin at wdth 75, wght 600-800 (25.4 KB); 'ledger-num', Manuale Bold
     digits (3.2 KB), the one file vibe.js prefetches for the Vibes card.
     Vibe-prefixed so an installed face can never stand in, same-origin so
     the service worker keeps them offline. rack.css line 1's @import stays
     byte-identical (importUrl is its record). The Coach card keeps Archivo
     on v1's metrics (T.fit null): nothing about its text changes. */
  face: {
    family: 'Manuale',
    keys: ['Manuale_400', 'Manuale_600', 'Manuale_700'],
    snap: { 300: 400, 500: 600, 650: 700, 750: 700, 800: 700, 900: 700 },
    step: 100,
    width: 100,
    minLh: 1.216,
    mono: { ios: 'Menlo', android: 'monospace' },
    web: {
      font: "'ledger-manuale', ui-serif, Georgia, serif",
      mono: 'ui-monospace, monospace',
      importUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap',
      // the heads: h1-h3, the greeting, on the selectors native's band catches
      display: "'ledger-heads', 'Archivo', system-ui, -apple-system, sans-serif",
      // Ledger sets no italic anywhere; the stack is the text face's own
      italic: "'ledger-manuale', ui-serif, Georgia, serif",
      // the Vibes card's figure: digits from the small file, anything else from the text file
      num: "'ledger-num', 'ledger-manuale', ui-serif, Georgia, serif"
    },
    bands: [{ min: 74, max: 76, family: 'ArchivoCondensed', keys: ['ArchivoCondensed_700'], snap: {}, weights: [700], minLh: 1.088 }]
  },

  /* ---- radius by role ----
     4 is the lead box's corner: soft enough that the one kept box is not
     broadsheet cosplay (N12), square enough to be a book's. Everything tapped
     as a control is 2. The sheet keeps the platform's 18 (R6.5). pill stays
     999 only where a round thing is round: the delta pill the copy names, the
     rest pill, the toggle's track, the day dots. */
  radius: {
    r: 4, sm: 2, sheet: 18, tile: 2, pill: 999, plate: 2, chip: 2, mark: 2, idx: 2,
    round: '50%', hair: 1, bubble: 2, badge: 2
  },

  /* ---- shadows ----
     Surfaces part by value and rule; nothing floats on a shadow but the tour
     card, which lifts off the tour's veil as v1's does (black, on a dark
     ground). The rings are v1's, in this vibe's colours. The white head and
     the dashed target stand at 12.41 on the track and need no ring. */
  shadow: {
    peek:  { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    rest:  { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    toast: { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    fab:   { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    fabPressed: { web: [] },
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
    tourLit:    { web: [{ x: 0, y: 0, blur: 0, spread: 2, color: 'accent' }] },
    calHead:    { web: [] },
    calTarget:  { web: [] }
  },

  /* ---- scrims: blur only behind a sheet (v1's 3px); the dock and the live
     bar opaque; the tour a flat veil, one value at every stop (no gradient
     wash, N4) ---- */
  scrim: {
    sheet: { tint: 'backdrop', filter: 'blur(3px)', webkit: false },
    dock:  { tint: 'dockGlass', filter: 'none', webkit: true, native: { intensity: 0 } },
    wkBar: { tint: 'wkBarGlass', filter: 'none', webkit: true },
    tour:  { dir: 'to bottom',
             stops: [{ color: 'rack', a: 0.92, at: 0 }, { color: 'rack', a: 0.92, at: 0.42 }],
             native: { locations: [0, 0.42, 1] } }
  },

  /* ---- native chrome: a dark vibe, so v1's, spelled in 6 digits. The fixed
     roles hold v1's values. ---- */
  chrome: {
    statusBar: 'light',
    keyboard: 'dark',
    blurTint: 'dark',        // not drawn: the dock is opaque
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

  /* native sign-in draws before any vibe is known (§10): v1's, in 6 digits */
  signIn: {
    title: '#ffffff', sub: '#8b929c', label: '#8b929c', link: '#8b929c', placeholder: '#5a616b',
    error: '#ff6b6b', ok: '#6fcf97', button: '#2aa85c', buttonBusy: '#2b6b45', buttonText: '#ffffff',
    spinner: '#ffffff', fieldBg: '#1c1f25', fieldText: '#ffffff', fieldBorder: '#2a2e36'
  },
  /* the dev and guard bars' words on this vibe's pRed / pGreen fills: white
     would be 2.60 / 2.31; the page's green reads 6.97 / 7.84 */
  banner: { devText: '#0e1813', guardText: '#0e1813', guardNote: '#0e1813' },

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

  /* ---- data tables: each hex table follows its colour role, entry for entry ---- */
  groups: {
    chest: '#ff7856', back: '#6aaaf8', legs: '#ffe07a',
    shoulders: '#36bf9c', arms: '#efe9dc', core: '#7f878e',
    fallback: '#b8bda7'
  },
  groupPlates: {
    chest: '#FF7856', back: '#6AAAF8', legs: '#FFE07A',
    shoulders: '#36BF9C', arms: '#EFE9DC', core: '#7F878E'
  },
  plates: ['#ff7856', '#6aaaf8', '#ffe07a', '#36bf9c', '#efe9dc', '#7f878e'],
  importGroups: {
    chest: 'pRed', back: 'pBlue', legs: 'pYellow',
    shoulders: 'pGreen', arms: 'pWhite', core: 'pChrome', fallback: 'grip'
  },
  mark: ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'],
  subjects: {
    fuel: 'pYellow', weight: 'pYellow', train: 'pBlue', steps: 'pWhite', water: 'pBlue',
    prot: 'pRed', carb: 'pYellow', fat: 'pBlue', all: 'chalk', fallback: 'steel'
  },
  // kpi · word draws no tile, so no corner tint on either client
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
  conf: { high: 'good', medium: 'warn', low: 'bad' },
  // bare letters on the page (setRow · ruled): W 13.98, F 6.97, D 7.52
  tagInk: { W: 'pYellow', F: 'pRed', D: 'pBlue' },
  // core as small text is 3.93 on bar: it inks steel there; every other plate inks itself
  inkOf: { pRed: 'pRed', pBlue: 'pBlue', pYellow: 'pYellow', pGreen: 'pGreen', pWhite: 'pWhite', pChrome: 'steel' }
});
