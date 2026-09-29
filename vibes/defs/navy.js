// Navy — "Highway at night". A simple vibe: new colours, one new face, a few
// shape tokens and shape-grade looks. v1's layout, v1's words, v1's numbers.
//
// A deep navy ground (not a stock grey) with warm-white ink, every word and
// figure outside the measured surfaces set in Overpass, the open-source cut of
// the US highway-sign alphabet ("Highway Gothic"), and one pale pistachio mark
// for the accent's one job. Spec: design/navy.md. Palette: research track 4's
// `navy-r2` [T4 GF5]; accent: the checker's proposal [C4]; research's pick
// S2-a (SYNTHESIS §5.2), adopted from design/navy/concept-A.md.
//
// THE RULES THIS FILE KEEPS, and why (v1.js's, plus what a non-v1 vibe owes):
// - It imports nothing and is frozen all the way down, so it can be copied
//   byte for byte into rack-mobile (src/pure/vibes/defs/navy.js) and pinned,
//   and no caller can change it for the next one.
// - Every leaf path v1.js has, this has — except the `exact` legacy spellings
//   (index.js LEGACY_EXACT), which only v1 may hold: without them the engines
//   build rgba(role, a) from the role and alpha, which is what a new vibe wants.
//   colors.onDanger is one value, not v1's { web, native } split, for the same
//   reason: the split exists only to keep v1's two spellings of white.
// - Every colour is 6-digit hex, because native's rgba() reads nothing else.
// - No invented keys. Research asked for a `lead` surface, a `shape.callout`
//   param and a picker tile record (`pick`); PLAN §2 rule 15 says a spec names
//   those as requests, never as keys, so they live in design/navy.md §15 as
//   asks E1, E2 and E7, and every value here is correct without them. The
//   roles engine v2 added are all set, each at what Navy means by it: the
//   W / F / D letters in their plate colours (tagInk), small text in a data
//   colour inking itself (inkOf), no status strip (colors.band: a dark page
//   under the white status text, as v1), no rings round the calorie head or
//   target (shadow.calHead / calTarget), v1's runway hatch in the navy
//   ground, the running meta as the note, no width band (face.bands: one
//   family, no condensed cut) and an empty `shape` (a simple vibe draws no
//   deep look, so it reads no look param).
// - Fixed roles (the launch colour, the manifest, the status-bar meta, the
//   layout and motion tokens, which scrims have a -webkit- twin) hold v1's
//   values: no vibe can move them at run time.
// - Colour roles the copy names by hue keep that hue (index.js HUE_NAMED):
//   pBlue blue, pYellow yellow, pRed red, calMark white, good green, bad red,
//   dim grey, warn amber. Checked in tools/navy-spec/check.mjs.

const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

// The ground and its ink-on-fill twin, named once because eight roles spend it.
const NAVY = '#0a183b';

export default deepFreeze({
  id: 'navy',
  name: 'Navy',
  feel: 'Deep navy ground, pale ink.',
  experimental: false,
  scheme: 'dark',
  // v1's icons plus a neutral `spark` (vibes/icons/navy.js): v1's four-point
  // sparkle is an AI tell, and iconIn() would hand it to any set that leaves
  // `spark` out (SYNTHESIS finding 6, R8.8). If the orchestrator makes one
  // shared set for the simple vibes (PLAN §2 rule 14), this string names it.
  icons: 'navy',
  images: {},           // photos are Iron Age's alone
  themeColor: NAVY,     // Safari's tab chrome matches the page

  /* Every block in vibes/defs/vocab.js, named. A simple vibe may name only
     'v1' or a `shape`-grade look (vocab.js `allowed.simple`). The seven shape
     looks are what make Navy more than v1 recoloured: filled blanks with no
     outline, the box-score stat line, KPI recesses with no corner glow, square
     write-in fields with a 3:1 edge, flat add tiles. Everything else is v1. */
  variants: {
    card: 'flat', youCard: 'flat', sectionHeader: 'v1', eyebrow: 'v1',
    statRow: 'line', btn: 'v1', chip: 'v1', segmented: 'v1', settingsRow: 'v1',
    sheetHost: 'v1', sheetTitle: 'v1', dock: 'v1', screenHeader: 'v1',
    kpi: 'plain', youHero: 'v1', coachCard: 'flat', chart: 'v1',
    headline: 'v1', field: 'square', note: 'v1', toast: 'v1', listRow: 'v1',
    setTable: 'v1', setRow: 'v1', plateStrip: 'v1', calCell: 'v1', fab: 'v1',
    // 'flat' puts the lit tiles' icon well and tag on raised (ask E3, landed
    // in vocab.js): steel on it 6.57, where grip left the tag at 2.09.
    addTile: 'flat', sessionChrome: 'v1'
  },
  // The look params (vocab.js `params`). Every look above is v1 or
  // `shape`-grade, and none of those reads a param, so Navy sets none.
  shape: {},

  colors: {
    // Surfaces. The page is chromatic navy (OKLCH C 0.07, hue 265), 5.19 ΔE00
    // from Tailwind's blue-950, the nearest of all 242 v3 defaults; the card
    // one step up (1.09:1, ΔE00 4.4 — more than v1's own 3.4 step), because a
    // flat card is told from the page by value, not by an outline.
    rack:   NAVY,
    bar:    '#0f223f',
    // Decorative hairlines only (1.30:1 on a card): never a control's only edge.
    collar: '#1d3463',
    // The control edge: fields, the set check, the rest pill, the peek bar, the
    // sheet's top. Periwinkle, 4.10:1 on a card, 4.48 on the page — v1's is
    // 1.3, which is why an empty field is hard to find in v1.
    knurl:  '#6a80bb',
    // Ink: a warm white, like a retroreflective legend, and two blue-greys.
    // Hierarchy comes from size and weight as much as from fading, so there is
    // no fourth grey (faint = dim, below).
    chalk:  '#f4f0e8',
    steel:  '#b3bfd6',   // every label, and secondary text
    dim:    '#8f9eb9',   // tertiary: 5.87 on a card (v1's is 2.70)
    // The plates, re-toned, not swapped: red leans vermilion and green leans
    // bluish so the six stay apart under deuteranopia and protanopia (worst
    // pair 13.2 ΔE00; v1's is 10.9) [T4 R5]. Each clears 4.5 as text on a card.
    pRed:    '#ff7452',  // chest, protein, gain
    pBlue:   '#66a6ff',  // back, fat, water, training, cut, drop sets
    pYellow: '#ffe16b',  // legs, carbs, fuel and weight, maintain — lemon, not v1's gold
    pGreen:  '#3cc4a0',  // shoulders, steps
    pWhite:  '#eee9df',  // arms, the steps subject
    pChrome: '#a9b4c6',  // core
    // Verdicts share the plates' hexes, as in v1.
    good: '#3cc4a0',
    warn: '#ffe16b',
    bad:  '#ff7452',
    // Native's legacy keys, each equal to the role it aliases (index.js ROLES).
    // Every ink on a bright fill is the navy itself: the fills are all light.
    onYellow: NAVY,          // -> onAccent
    onGreen:  NAVY,          // -> onDone
    onPlate:  NAVY,          // 6.52 (chest) to 14.38 (arms) on the six plates
    white:    NAVY,          // -> onDanger: white on this coral would be 2.6
    pYellowPressed: '#9bca8b',  // -> accentPressed
    fallback: '#b3bfd6',     // -> groups.fallback = steel

    // The accent: pistachio, pale (L* 83) and matte (OKLCH C 0.10), 27.7 ΔE00
    // from v1's yellow — a gold would sit 6.5 away and read as "v1 on blue"
    // [C4]. One job: the primary action, focus, today, the dock mark, Coach's
    // voice. Never data, never a verdict, never a done set.
    accent:        '#acdc9c',
    focus:         '#acdc9c',
    accentPressed: '#9bca8b',
    onAccent:      NAVY,     // 11.16 on the accent
    danger:        '#ff7452',
    onDanger:      NAVY,     // one 6-digit value; only v1 keeps the split spelling
    done:          '#3cc4a0',
    onDone:        NAVY,     // the ✓ on a done set, 7.95
    well:          NAVY,     // the recess in a card is the page, as in v1
    knockout:      NAVY,
    inverse:       '#f4f0e8',
    calMark:       '#f4f0e8',  // "the white head": HUE_NAMED white
    // A control up off the card (the plain button, the peek bar, the rest
    // pill, a numbered set badge, the Coach bubble), 1.30:1 off it in the
    // card's own hue. No lighter: dim on it is already 4.50, which Rack only
    // spends on large text there (the streak flame, the photo placeholder).
    raised:        '#1d3463',
    track:         '#1d3463',  // every plate fill clears 3:1 on it (worst 4.56)
    // The grab handle (4.10:1 on the sheet; v1's is 1.41, R8.5 asks 3), a
    // toggle's off track, the trajectory dots. A mid-tone by necessity: no
    // grip can be 3:1 against the sheet AND carry light text at 4.5 (steel on
    // it is 2.09, v1's 3.80). So Navy relies on ask E3, which has landed:
    // addTile · flat draws the lit tiles' icon well and tag on `raised`
    // (steel 6.57, chalk 10.71), on web and native (spec §3.3).
    grip:          '#6a80bb',
    faint:         '#8f9eb9',  // = dim: no fourth grey tier
    onWarn:        NAVY,     // the native trial banner, 13.45 on warn
    shade:         '#000000',  // shadows and the sheet backdrop: black reads as depth on navy
    lift:          '#ffffff',  // the pressed-row wash
    // Native's flat add tiles. addTile · flat draws no accent washes, so both
    // are the well.
    tileHero:      NAVY,
    tileLit:       NAVY,
    // No strip under the installed web app's status text: it is white, and
    // the navy page under it is 15+:1, as v1's graphite is (spec §8).
    band:          null
  },

  /* The set badge's letter: W / F / D stand bare on the row (tint.tag* are 0,
     below), each in its plate colour — 12.29 / 5.95 / 6.40 on a card, 10.26
     / 4.97 / 5.34 on a done row (spec C6). */
  tagInk: { W: 'pYellow', F: 'pRed', D: 'pBlue' },
  // Small text in a data colour inks itself: every plate clears 4.5:1 as text
  // on a card (worst pRed 5.95), so no site needs a darker twin.
  inkOf: { pRed: 'pRed', pBlue: 'pBlue', pYellow: 'pYellow', pGreen: 'pGreen', pWhite: 'pWhite', pChrome: 'pChrome' },

  // Every helper tints the role it is named for, as in v1.
  alpha: {
    yellow: 'pYellow', red: 'pRed', blue: 'pBlue', green: 'pGreen', ground: 'rack',
    accent: 'accent', danger: 'danger', warn: 'warn'
  },

  /* Tints: rgba(role, a), no legacy spellings. Where the alpha moves from
     v1's, the reason is beside it. */
  tint: {
    setDone:   { color: 'done',    a: 0.10 },  // v1 .07: a done row should read from the bench
    setFlash:  { color: 'accent',  a: 0.28 },
    // No tag washes. The wash REPLACES the badge's raised fill (.set-idx.t-W,
    // native SetTypeBadge), so at 0 the W / F / D letters stand bare on the
    // row — F 5.95 on a card, 4.97 on a done row — told from a numbered set by
    // the letter and its colour; the numbers keep their raised box. At v1's
    // .16, F would be 4.04 on a done row.
    tagW:      { color: 'pYellow', a: 0 },
    tagF:      { color: 'pRed',    a: 0 },
    tagD:      { color: 'pBlue',   a: 0 },
    // The drop rail and + Drop edge are real graphics, so 3:1 (3.85); v1's
    // .45 / .35 would be ~2.6 / ~2.2 on navy.
    dropRail:  { color: 'pBlue',   a: 0.70 },
    dropAdd:   { color: 'pBlue',   a: 0.70 },
    pickSel:   { color: 'accent',  a: 0.08 },
    block:     { color: 'accent',  a: 0.03 },
    coachBase: { color: 'accent',  a: 0.14 },
    coachLow:  { color: 'accent',  a: 0.07 },
    coachHigh: { color: 'accent',  a: 0.38 },
    rowPress:  { color: 'lift',    a: 0.04 },
    // No delta pills (R6.6): deltas are bare signed Overpass with their arrow.
    pillBase:  { color: 'lift',    a: 0 },
    pillUp:    { color: 'good',    a: 0 },
    pillDown:  { color: 'bad',     a: 0 },
    pillWarn:  { color: 'warn',    a: 0 },
    zoneCut:   { color: 'pBlue',   a: 0.16 },
    zoneHold:  { color: 'pYellow', a: 0.18 },
    zoneGain:  { color: 'pRed',    a: 0.16 },
    // Glass stays where v1 has it, and only there (R7.2).
    dockGlass:  { color: 'rack',  a: 0.82 },
    wkBarGlass: { color: 'rack',  a: 0.9 },
    backdrop:   { color: 'shade', a: 0.6 },
    trajGood:     { color: 'good',   a: 0.18 },
    trajWarn:     { color: 'warn',   a: 0.18 },
    trajBad:      { color: 'bad',    a: 0.18 },
    // "Next week" loses its box-in-a-box (N9). The spec wants a 2pt knurl top
    // rule instead (ask E2); until an engine can draw one side only, the
    // border is off too, because a four-sided keyline is the one thing it
    // must never become. With E2, reviewBorder becomes { color: 'knurl', a: 1 }.
    reviewBg:     { color: 'accent', a: 0 },
    reviewBorder: { color: 'knurl',  a: 0 },
    // The calorie runway's hatching and edge: v1's, in the navy ground.
    runway:       { color: 'rack',   a: 0.55 },
    runwayEdge:   { color: 'rack',   a: 0.7 }
  },

  /* Type. Overpass has no width axis, so wdth is 100 everywhere. No preset is
     caps: labels are sentence case as authored, at 12–13 and 600 (R5.1), so
     they grow in size, not in width — sentence case at 13 takes about the
     room of v1's tracked caps at 10. */
  type: {
    body:     { size: 15, wdth: 100, wght: 400, lh: 1.45, color: 'chalk' },
    // 24, not v1's 26: Overpass is 10–20% wider than v1's wdth-78 heading on
    // the web, and "September 2026" at 26 would not fit at 320.
    h1:       { size: 24, wdth: 100, wght: 800, ls: -0.01, color: 'chalk' },
    h2:       { size: 18, wdth: 100, wght: 800, ls: -0.01, color: 'chalk' },
    h3:       { size: 16, wdth: 100, wght: 800, ls: -0.01, color: 'chalk' },
    eyebrow:  { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    btn:      { size: 14, wdth: 100, wght: 700, ls: 0, color: 'chalk' },
    btnLg:    { size: 16, wdth: 100, wght: 700, ls: 0, upper: 0 },
    // 12, not the concept's 11: a dock label is a label, and labels are 12
    // and up (R5.1). "Weight" is 38px at 12, in a cell of 64 or more.
    dockLbl:  { size: 12, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'dim' },
    fieldLbl: { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    note:     { size: 13, wght: 400, lh: 1.5, color: 'dim' },
    statVal:  { size: 20, wdth: 100, wght: 800, lh: 1, tnum: 1 },
    // 12, not 13: it sits under a figure in a third of a card's width.
    statLbl:  { size: 12, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    timer:    { size: 22, wdth: 100, wght: 800, ls: 0, tnum: 1 },
    kpiVal:   { size: 22, wdth: 100, wght: 800, ls: -0.01, lh: 1, tnum: 1 },
    headline: { size: 34, wdth: 100, wght: 800, ls: -0.01, lh: 1, tnum: 1 },
    // One colour for the whole greeting once ask E4 lands (R5.4).
    youGreet: { size: 26, wdth: 100, wght: 800, ls: -0.01, lh: 1.1 },
    chip:     { size: 12, wdth: 100, wght: 600, color: 'steel' },
    // 600, not v1's 700: segment words are labels (R5.1: 500–600). The chosen
    // segment is told by its inversion, not its weight.
    segBtn:   { size: 12, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    setInput: { size: 15, wdth: 100, wght: 700, tnum: 1, color: 'chalk' },
    mono:     { size: 12, color: 'chalk' },
    // The running meta, as the note (what a definition without one takes).
    meta:     { size: 13, wght: 400, lh: 1.5, color: 'dim' }
  },
  // The one numeral treatment: Overpass ExtraBold tabular figures, the exit
  // number on a sign. About 15% narrower than v1's wdth-118 stamp, so no
  // figure can overflow where v1's fitted.
  loadNum: { wdth: 100, wght: 800, ls: 0, lh: 0.95, tnum: 1 },

  /* The face. Native: four static TTFs from Google's css2 route (Overpass
     v19, Version 4.000), latin-subset, keys as app/_layout.jsx will register
     them. minLh is Overpass's hhea (1766 + 766) / 2000. The measured surfaces
     (the Coach card, goal chips, feel chips, estimate row, movement chips)
     keep Archivo on v1's metrics — native's MEASURED_FACE, because this vibe
     hands in no `fit` table — so the Coach card's fit is v1's, proved.
     Web: one variable woff2 (wght 100–900) under vibes/navy/fonts/, declared
     by vibes/navy.css as 'navy-overpass' — named for the vibe, so an
     installed Overpass never stands in; vibes/navy.css sets the measured
     surfaces in Archivo, whose @import stays in rack.css line 1,
     byte-identical. */
  face: {
    family: 'Overpass',
    keys: ['Overpass_400', 'Overpass_600', 'Overpass_700', 'Overpass_800'],
    snap: { 650: 700, 750: 800 },
    step: 100,
    width: 100,
    minLh: 1.266,
    // One family and no condensed cut, so no width band.
    bands: [],
    mono: { ios: 'Menlo', android: 'monospace' },
    web: {
      font: "'navy-overpass', 'Archivo', system-ui, -apple-system, sans-serif",
      mono: 'ui-monospace, monospace',
      importUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap',
      // Heads and italics in the one face (the subset has no italic; an
      // italic run stays upright).
      display: "'navy-overpass', 'Archivo', system-ui, -apple-system, sans-serif",
      italic: "'navy-overpass', 'Archivo', system-ui, -apple-system, sans-serif",
      // The Vibes card's figure: Overpass ExtraBold from its digits-only file
      // (0-9, 6,516 bytes), the one Navy file vibe.js prefetches for the
      // picker; anything but a digit falls to the full face.
      num: "'navy-num', 'navy-overpass', system-ui, -apple-system, sans-serif"
    }
  },

  /* Sign blanks and write-in plates: cards a little squarer than v1, buttons
     one value, pills only where v1 taps them (chips, segments, the rest pill,
     the toast), data marks and fields at the plate radius. */
  radius: {
    r: 10, sm: 6, sheet: 18, tile: 8, pill: 999, plate: 2, chip: 3, mark: 4, idx: 4,
    round: '50%', hair: 1, bubble: 12, badge: 8
  },

  /* v1's shadows, unchanged: black under the few things that float. None is
     coloured; none glows. */
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
    tourLit:    { web: [{ x: 0, y: 0, blur: 0, spread: 2, color: 'accent' }] },
    // No rings round the calorie head or dashed target: the warm-white head
    // is 10.71 on the navy track and 6.88-8.87 over the zones on its own.
    calHead:    { web: [] },
    calTarget:  { web: [] }
  },

  /* v1's scrims. The tour's native gradient is built from the stops (theme.js
     holds the last stop to the bottom), so it needs no legacy strings. */
  scrim: {
    sheet: { tint: 'backdrop', filter: 'blur(3px)', webkit: false },
    dock:  { tint: 'dockGlass', filter: 'blur(18px) saturate(140%)', webkit: true, native: { intensity: 40 } },
    wkBar: { tint: 'wkBarGlass', filter: 'blur(16px)', webkit: true },
    tour:  { dir: 'to bottom',
             stops: [{ color: 'rack', a: 0.55, at: 0 }, { color: 'rack', a: 0.94, at: 0.42 }],
             native: { locations: [0, 0.42, 1] } }
  },

  /* A dark vibe: native chrome as v1, spelled in 6 digits. The fixed four are
     v1's by rule (a cold start shows v1's graphite launch, then navy). */
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

  /* Native sign-in: v1's own palette, in 6 digits. Native has no device key,
     so sign-in is drawn before any account's vibe is known. */
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

  /* The native root banners sit on pRed (the guard block, the owner's dev
     bar) and pGreen (the dev bar). v1's white on Navy's coral is 2.6:1 and on
     its sea green 2.2:1, so the words go navy: 6.52 and 7.95. The guard's
     note is drawn at opacity .75 (app/_layout.jsx:93), which takes navy to
     4.49 on the coral, so the note alone is black: 5.60. */
  banner: {
    devText:   NAVY,
    guardText: NAVY,
    guardNote: '#000000'
  },

  // Channel tokens name their own roles, and the :root layout and motion
  // tokens are fixed: both exactly v1's.
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

  /* The three hex tables follow their roles entry by entry (index.js ROLES
     `follows`), each in its source's case. */
  groups: {
    chest: '#ff7452', back: '#66a6ff', legs: '#ffe16b',
    shoulders: '#3cc4a0', arms: '#eee9df', core: '#a9b4c6',
    fallback: '#b3bfd6'
  },
  groupPlates: {
    chest: '#FF7452', back: '#66A6FF', legs: '#FFE16B',
    shoulders: '#3CC4A0', arms: '#EEE9DF', core: '#A9B4C6'
  },
  plates: ['#ff7452', '#66a6ff', '#ffe16b', '#3cc4a0', '#eee9df', '#a9b4c6'],
  importGroups: {
    chest: 'pRed', back: 'pBlue', legs: 'pYellow',
    shoulders: 'pGreen', arms: 'pWhite', core: 'pChrome', fallback: 'grip'
  },
  mark: ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'],
  subjects: {
    fuel: 'pYellow', weight: 'pYellow', train: 'pBlue', steps: 'pWhite', water: 'pBlue',
    prot: 'pRed', carb: 'pYellow', fat: 'pBlue', all: 'chalk', fallback: 'steel'
  },
  // kpi · plain: no corner glow on any KPI tile, by any path.
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
