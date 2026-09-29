// Iron Age — ink on cream, circa 1900, as data.
//
// A physical-culture manual printed about 1904: warm ink on a matte book
// stock, each tab opening on a masthead over a thick-and-thin rule, its
// figures set as a manual's table of measurements, and two pages carrying a
// real halftone plate of a man at exercise from a manual of the period.
// Nothing is boxed except what a page would box, and the one colour that is
// not data is the rubric red that marks Coach's voice. The spec, with every
// number below measured, is ~/dev/vibes-night/design/iron-age.md.
//
// THE RULES THIS FILE KEEPS (v1.js's, and why they hold here too):
// - It imports nothing, and is frozen all the way down. It is copied byte for
//   byte into rack-mobile (src/pure/vibes/defs/iron-age.js), pinned by sha256,
//   and shared by every caller.
// - Every colour is 6-digit hex (native's rgba() reads nothing else), and no
//   value is one of v1's legacy spellings (index.js LEGACY_EXACT): only v1
//   may hold those. So there are no `exact` strings, onDanger is one colour
//   rather than v1's two spellings, and the sign-in and banner whites are
//   '#ffffff'.
// - A role is named for its job. The engines point each call site at the role
//   that matches its job, so this file never says where a colour goes, only
//   what each job looks like in Iron Age.
// - Vibes change how Rack looks, never what it says or does. Every choice
//   below that could have made a shipped sentence untrue was made the other
//   way: the white head stays white, the blue / yellow / red bands stay
//   those hues (and are hatched, not washed, because a wash on cream turns
//   grey), the delta keeps its pill ("The pill is the difference…",
//   you.js:802), grey stays grey, fields stay boxes ("Clear the box",
//   food.js:3320).
//
// WHAT IS HERE THAT v1.js DOES NOT HAVE. Each was named in the spec (§14)
// and engine v2 took it as a role (index.js ROLES): `shape` (VOCAB §4's
// params, plus rule.sub, rule.total and lead), `inkOf`, `tagInk`,
// `colors.band`, `type.meta`, `face.bands` (native build()), `face.web.display
// / italic / num`, the rings round the calorie head and target
// (`shadow.calHead / calTarget`), and the image slots' `band`.

// Inline, not imported: this file imports nothing.
const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

/* The stock scrim every photo slot declares: stock at .54 over the halftone.
   Measured on the worst case, a solid ink dot (#1c1712) under it: that pixel
   becomes #898275 and ink text on it reads 4.67:1 (4.5 needs .526 baked, and
   Chrome's run-time layer loses about .01, research track 8a H.6). Under band
   mode (below) no word sits on a photo and this scrim is not drawn; it is
   what the slot falls back to if the engine does not draw bands, and the
   look then sets every word over the photo in ink. */
const STOCK_SCRIM = { dir: 'to bottom', stops: [{ color: 'rack', a: 0.54, at: 0 }] };

/* Web font stacks. A face that lacks a character falls to the next, so a
   stray arrow in a Besley run (a custom exercise's name) is drawn by Archivo,
   never as a missing glyph. */
const WEB_TEXT = "'Archivo', system-ui, -apple-system, sans-serif";

export default deepFreeze({
  id: 'iron-age',
  name: 'Iron Age',
  feel: 'Ink on cream, circa 1900.',
  experimental: false,
  scheme: 'light',
  icons: 'iron-age',        // vibes/icons/iron-age.js
  /* The photo slots. Two hero boxes carry a plate, each a man at exercise
     (Sargent's 1904 model over the greeting, Anderson's 1897 athlete at the
     pulley weights over the finished session), and each set differently:
     You's is a loose plate on the page over the greeting, the recap's is cut
     into its lead box. Five never do:
       coachCard     its caution, loading and accent lines would need a scrim
                     so heavy the photo keeps 1.07–1.22:1 (research C27);
       startWorkout  an ink plate behind the knocked-out label measures
                     4.42:1 at the baked .60 it was specced at: the action
                     stays a clean ink block;
       fuelSummary   "its colour is the band you are in right now"
                     (food.js:3582): one ink over a photo would make it untrue;
       stepsToday,   dropped after the first AI-made panel (V59 §13.6): a
       weightLog     gymnasium roof over Steps and a vaulting horse over Weight
                     say nothing about either tab, and a photo-capped box on
                     four screens read as one template. Their files stay in
                     the folder, and in PROVENANCE.json, unused.
     BAND MODE (`band`, points): the plate is drawn in a strip that tall
     across the top of its box, and the box's own padding grows by the same,
     so no word, control or colour sits on the photo. The photo keeps its full
     ink-on-stock tone (13.26:1) instead of about 2.8:1 under a scrim, and the
     greeting's name, the Steps ring and every role colour keep their jobs.
     Every file is a 4-bit indexed PNG, halftoned ink on this stock, already
     cut to its band around its subject in Phase V, so the focal point is the
     file's centre. A slot whose file is missing closes up: no band, no frame.
     `thumb` is the Vibes card's (vibe.js THUMB): 336 x 264, `315` in ink
     over it at 4.67:1 against its worst pixel. */
  images: {
    youHero:     { file: 'img/you.png',    focal: { x: 0.5, y: 0.5 }, band: 80, scrim: STOCK_SCRIM },
    summaryHero: { file: 'img/recap.png',  focal: { x: 0.5, y: 0.5 }, band: 80, scrim: STOCK_SCRIM },
    thumb:      { file: 'img/pick.png',   focal: { x: 0.5, y: 0.5 }, scrim: STOCK_SCRIM }
  },
  // v1's: a light vibe leaves the theme-color meta alone (research R3.3) —
  // the browser's bar stays as dark as the status band under it.
  themeColor: '#14161a',

  /* One look per block, in vocab.js's order. Each is a name vocab.js
     accepts; what each draws in Iron Age is the spec's §7. */
  /* After the first AI-made panel (V59 §13.6) the vibe stopped drawing one
     keyline box round every control and one Oxford rule under every head:
     the Oxford rule is the masthead's alone (one a tab) and a sheet's top
     edge; a section head is a plain head on space (sectionHeader · plain); a
     sheet's title and a footnote carry no device (v1); the three-stat rows
     are ledger lines (statRow · ledger, the leader Settings already drew);
     chips are raised tags (chip · tag) and the range pickers words on an
     underline (segmented · tabs). The keyline is kept for the tab's one lead
     box and the stamps that are objects (plates, the callout). */
  variants: {
    card: 'ruled', youCard: 'ruled', eyebrow: 'v1', sectionHeader: 'plain', screenHeader: 'masthead',
    sheetHost: 'full', sheetTitle: 'v1', statRow: 'ledger', kpi: 'word', headline: 'rule',
    chip: 'tag', segmented: 'tabs', btn: 'inverse', field: 'square', note: 'v1', toast: 'square',
    settingsRow: 'ledger', listRow: 'plain', setTable: 'ruled', setRow: 'ruled', plateStrip: 'stamp',
    calCell: 'ruled', chart: 'print', dock: 'rail', fab: 'inverse', addTile: 'ruled',
    sessionChrome: 'plate', youHero: 'banner', coachCard: 'ruled'
  },

  /* The params the looks above read (VOCAB §4). Numbers are pt on
     native and px on the web; colours name roles. */
  shape: {
    rule: {
      // Every drawn rule is ink: period rules were the text's own ink, and
      // weight is what made them light (research track 7 §4.3).
      ink: 'chalk',
      // A measured print hairline (Physical Culture 1908's folio rule).
      hair: 0.5,
      // The Oxford rule, read from the head outward: a 3pt line, a 2pt gap, a
      // 1.2pt line (1 nominal, +0.1 per edge of ink gain). The masthead's
      // alone — one a tab — and a sheet's top edge; section heads draw none
      // (sectionHeader · plain).
      head: [3, 2, 1.2],
      // The head SITS on its rule, as a chapter head does on a manual page.
      place: 'below',
      // The single rule articles sit on — card heads, an exercise's
      // name, the challenge figure. Without the split every card on You would
      // stack a thick-and-thin rule under a thick-and-thin rule.
      sub: [1.2],
      // The double rule a form draws over a total — the recap's
      // session totals and the estimator's total, nowhere else.
      total: [1, 2, 1]
    },
    // Drawn round dots on the baseline, about .3em apart, in the grey ink:
    // the Settings rows and the stat rows' ledger lines (a manual's table of
    // measurements: "Chest ........ 42"), nowhere else.
    leader: { ink: 'dim', dot: 1.5, pitch: 4.5, min: 16 },
    band: { fill: 'raised', ink: 'chalk', height: 30 },   // VOCAB's default; no look here reads it
    gutter: 2,                                              // VOCAB's default; no look here reads it
    // Stamps: chips, plate chips, the live session's plates, the callout.
    keyline: { ink: 'chalk', width: 1 },
    // The tab's one boxed card (Fuel's summary, Weight's log,
    // Steps' today, the recap's head) is a plate: bar paper inside a 1pt ink
    // keyline. Bar on the stock alone is 1.06:1 and all but vanishes. It is
    // the only thing in the vibe with both a fill and a border. You's
    // greeting is not boxed: it stands on the page under its loose plate.
    lead: { keyline: true }
  },

  colors: {
    /* ---- the page ---- */
    // Book stock, the r2g cream: its hue and chroma from the calibrated LoC
    // Trocadero capture, 1.51 ΔE00 darker than the scan so it clears every
    // Tailwind default by 5+ (orange-100 at 5.62) and sits outside the AI
    // cream band (its lowest channel is 0xC9). The page carries the `manual`
    // grain tile (measured off Sandow's 1897 pages), whose darkest pixel,
    // #e0d8c4, is what every text colour below is checked against.
    rack:   '#e6dec9',
    // Paper one step lighter: sheets, fields, the lead plates, the dock, the
    // workout bar. Never grained.
    bar:    '#ebe4ce',
    // Decorative only: the 1px lines no look re-draws, chart grids, the heat
    // strip's untrained day (analytics.js paints it --collar). 1.48:1 on the
    // page: never the only edge of a control. Drawn rules are ink.
    collar: '#c4b79b',
    // A control's edge — the set check, a field's keyline, the ring shadows,
    // the unlit spark bars (analytics.js paints them --knurl): 3.52:1 on the
    // page, 3.33 on its darkest grain pixel, 3.72 on bar. A grey, not a
    // brown: the ochre bar lit beside an unlit one is only 1.11:1 apart in
    // luminance, so the pair is told apart by hue, 20.9 ΔE00 (20.0 under
    // deuteranopia) where a brown knurl gave 14.2.
    knurl:  '#77736a',
    // Ink: a warm near-black, not brown and not sepia (track 7 §3.1).
    chalk:  '#1c1712',
    steel:  '#4a3f31',
    // The grey the copy promises ("grey when the move is too small",
    // you.js:802, is .delta.flat's dim): OKLCH chroma .007, a true grey. Text,
    // so 4.5:1 or better everywhere it sits — 5.32 on the grain's darkest
    // pixel, 4.63 on `raised`.
    dim:    '#565450',
    /* ---- the plates: data, never chrome ---- */
    // Indian red, Prussian, ochre, viridian, ink-black, pewter: track 4's
    // CVD-built set, with the ochre moved yellower (OKLCH h 84, was 76)
    // because the copy says "the yellow line" and "Yellow — hold". Worst
    // group pair 12.6 ΔE00 under deuteranopia, 13.3 under protanopia.
    pRed:    '#82180c',  // chest, protein, gain
    pBlue:   '#1f4a72',  // back, fat, water, training, cut, drop sets
    // legs, carbs, the Fuel and Weight subject, maintain. 3.92:1 on the
    // page: a graphic and large-text colour only. Small text in this job is
    // inked through inkOf (below) as warn.
    pYellow: '#8b6600',
    pGreen:  '#0e5f40',  // shoulders, steps
    // arms, the Steps subject. A light page cannot carry a white data colour
    // at 3:1, so the white plate is drawn the way an engraving draws white:
    // in ink.
    pWhite:  '#2a241d',
    // core. 3.90:1: graphics only; small text through inkOf as steel.
    pChrome: '#6a6d6c',
    /* ---- verdicts: green, amber, red, as the copy names them ---- */
    good: '#0e5f40',
    warn: '#6e4d08',
    bad:  '#82180c',
    /* ---- native's legacy keys: each follows the role that now has its job
       (index.js ROLES `alias`); build() fills them from those roles ---- */
    onYellow: '#f6efdd',        // = onAccent
    onGreen:  '#f6efdd',        // = onDone
    onPlate:  '#f6efdd',        // a figure on a filled plate: 4.56–13.38 on all six
    white:    '#f6efdd',        // = onDanger
    pYellowPressed: '#8e3548',  // = accentPressed
    fallback: '#4a3f31',        // = groups.fallback = steel
    /* ---- the jobs split out of double duty ---- */
    // Madder carmine, the rubric: Rack's own voice (the Coach mark, its
    // labels and chevron, the live chip), focus, a toggle's on state, the PR
    // highlight, the tour's lit ring — once a screen. Never a button fill,
    // never a wash behind words, never text on `raised`, a done row or a pill
    // (4.05, 4.46, and 4.14 or less there). 4.93:1 on the page, 4.66 on its darkest
    // grain pixel; 17.3 ΔE00 from its nearest data colour; 26.9 from
    // Claude's clay.
    accent:        '#a1374f',
    focus:         '#a1374f',
    accentPressed: '#8e3548',
    onAccent:      '#f6efdd',   // 5.77:1 on accent, 6.65 pressed
    // Indian red again, for the destructive and the refused.
    danger:        '#82180c',
    onDanger:      '#f6efdd',   // 8.78:1: one colour for both clients
    // Viridian: a set done, its tick, the rest line running.
    done:          '#0e5f40',
    onDone:        '#f6efdd',   // the knocked-out tick, 6.71:1
    // The recessed surface inside a card is the page itself: its sites draw
    // as keylines on the stock.
    well:          '#e6dec9',
    // Words cut out of ink: a chosen chip or cell, the toast, the primary
    // button, the FAB. 13.99:1 on inverse.
    knockout:      '#ebe4ce',
    inverse:       '#1c1712',
    // "The white head": white, always drawn with a 1pt ink edge (shadow.
    // calTick), because paper-white on cream is 1.3:1 and a period printer
    // drew white by outlining it.
    calMark:       '#ffffff',
    // Ink at 10% over the stock: the plain button, set and step badges, a
    // chosen option, Coach's chat blocks. 1.22:1 on the page; its text is
    // ink (10.90), steel (6.29) or dim (4.63).
    raised:        '#d2cab7',
    // The empty part of a meter, ring or chart bar. Every plate as a fill on
    // it clears 3:1 (pChrome 3.16 and pYellow 3.17 the least).
    track:         '#d6c8a8',
    // The grab handle (4.02:1 on bar, where v1's is 1.41), a toggle's off
    // track, trajectory dots.
    grip:          '#7b6c52',
    // v1's faintest ink is text (an optional field's label, a blank meal's
    // kcal) at 1.41:1. A changed colour must reach 4.5, so faint is dim.
    faint:         '#565450',
    onWarn:        '#f6efdd',   // native's solid trial bar: 6.71:1
    // Under every shadow and scrim, and the pressed wash: ink, because a
    // light page darkens when pressed (research R3.3).
    shade:         '#1c1712',
    lift:          '#1c1712',
    // The add tiles draw no wash in Iron Age (addTile · ruled), so the flat
    // native forms of v1's accent washes are the page.
    tileHero:      '#e6dec9',
    tileLit:       '#e6dec9',
    // The web's fixed strip under the
    // status bar. The installed PWA's status text is always white, so a
    // light vibe keeps that band dark: white on it is 17.79:1.
    band:          '#1c1712'
  },

  alpha: {
    yellow: 'pYellow', red: 'pRed', blue: 'pBlue', green: 'pGreen', ground: 'rack',
    accent: 'accent', danger: 'danger', warn: 'warn'
  },

  /* Tints: a role at an alpha. Light-page alphas: a wash is ink or a status
     colour at about .10 (R3.3). None of these carries an `exact`: only v1 may. */
  tint: {
    setDone:   { color: 'done',    a: 0.07 },   // the done row, visible from the bench; ink 11.99 on it
    setFlash:  { color: 'accent',  a: 0.14 },   // the tick flash; dim still 4.6+ at its peak
    // The W / F / D washes. The setRow · ruled badge is a bare letter, inked
    // by tagInk (below): W in warn, because ochre text is 3.92.
    tagW:      { color: 'warn',    a: 0.10 },
    tagF:      { color: 'pRed',    a: 0.10 },
    tagD:      { color: 'pBlue',   a: 0.10 },
    dropRail:  { color: 'pBlue',   a: 0.75 },   // the drop rail, 3.93:1 on the page (at .45 it would be 2.1)
    dropAdd:   { color: 'pBlue',   a: 0.75 },
    // A chosen row is a darker leaf, never a pink one: accent text on a
    // madder wash drops under 4.5 on the grain.
    pickSel:   { color: 'chalk',   a: 0.06 },
    block:     { color: 'accent',  a: 0 },      // a lifting block is framed by rules, not washed
    coachBase: { color: 'accent',  a: 0.14 },   // the pulse around the set check: a graphic, no word on it
    coachLow:  { color: 'accent',  a: 0.07 },
    coachHigh: { color: 'accent',  a: 0.30 },
    rowPress:  { color: 'lift',    a: 0.04 },
    // THE PILL IS KEPT. "The pill is the difference between the two weeks.
    // Green means …, red the other way, grey when …" (you.js:802): the delta
    // stays in its pill, the one rounded, tinted thing in the vibe. Its
    // words, on each pill over the grain's darkest pixel: good 4.71, bad
    // 6.00, warn 4.73, grey (dim, on pillBase) 4.73.
    pillBase:  { color: 'lift',    a: 0.06 },
    pillUp:    { color: 'good',    a: 0.10 },
    pillDown:  { color: 'bad',     a: 0.10 },
    pillWarn:  { color: 'warn',    a: 0.10 },
    // Fallbacks only: chart · print draws the calorie bands as hatches of the
    // full-strength ink. A wash on cream loses its hue — zoneCut over the
    // track is OKLCH h 97, C .027, a greige — and "Blue — cut" would stop
    // being blue. The hatches are required, not a flourish (spec §14, E15).
    zoneCut:   { color: 'pBlue',   a: 0.18 },
    zoneHold:  { color: 'pYellow', a: 0.20 },
    zoneGain:  { color: 'pRed',    a: 0.16 },
    // Paper, not glass: the dock and the workout bar are opaque.
    dockGlass:  { color: 'bar',    a: 1 },
    wkBarGlass: { color: 'bar',    a: 1 },
    backdrop:   { color: 'shade',  a: 0.45 },   // ink behind a sheet (R3.3: .40–.45)
    trajGood:   { color: 'good',   a: 0.15 },
    trajWarn:   { color: 'warn',   a: 0.15 },
    trajBad:    { color: 'bad',    a: 0.15 },
    // "Next week" is the period's boxed note: a 1pt ink keyline and no fill,
    // so the lead plate stays the one thing with both.
    reviewBg:     { color: 'chalk', a: 0 },
    reviewBorder: { color: 'chalk', a: 1 }
  },

  /* ---- type ----
     Two families. Archivo (v1's) sets the body, every label, every table
     value, every delta and arrowed string, every button, chip and dock label,
     and the Coach card, on v1's own metrics. Besley v4 (upstream,
     indestructible-type) sets the heads, the card heads, the greeting, the
     challenge figure and the running meta. Besley has no ↑ ↓ →, so it never
     sets a string that can carry one.
     HOW NATIVE PICKS THE FACE: face.bands (below), by wdth. Native's
     Archivo package ships the weight axis only, so v1 ignores wdth; a band
     claims a wdth no Archivo site passes (the native tree passes 78, 88, 90,
     92, 94, 96, 100, 104, 108, 110, 112, 118 and nothing else). 101 is
     Besley roman and 99 Besley italic. On the web Besley's own width axis
     stops at 100, so 101 draws exactly the width the native statics draw —
     no parity gap — and the web stylesheet names the family by selector.
     DO NOT "tidy" 101 or 99 to 100: that silently sets these presets in
     Archivo on native.
     No caps anywhere: every string shows in the case it was written in, and
     no unit is ever uppercased. Nothing new is under 11pt. */
  type: {
    body:     { size: 15, wdth: 100, wght: 400, lh: 1.45, color: 'chalk' },
    // Besley ExtraBold. 24, not v1's 26: "September 2026" is 216.9pt at 24,
    // no wider than v1's native header, so the Train masthead fits beside
    // its two month buttons.
    h1:       { size: 24, wdth: 101, wght: 800, ls: 0, lh: 1.1, color: 'chalk' },
    h2:       { size: 18, wdth: 101, wght: 800, ls: 0, lh: 1.15, color: 'chalk' },
    // The chapter head: sectionHeader · rule sets its title here, sentence
    // case, sitting on the Oxford rule.
    h3:       { size: 18, wdth: 101, wght: 800, ls: 0, lh: 1.2, color: 'chalk' },
    // The article head (card heads, sheet eyebrows): Besley SemiBold 15,
    // sentence case, ink. v1's is 10pt tracked caps in a grey that reads
    // 2.70:1.
    // (`upper: 0` on the six presets v1 sets in caps: those strings are
    // authored in sentence case and show as written.)
    eyebrow:  { size: 15, wdth: 101, wght: 600, ls: 0, lh: 1.2, upper: 0, color: 'chalk' },
    btn:      { size: 14, wdth: 100, wght: 700, ls: 0.01, color: 'chalk' },
    btnLg:    { size: 16, wdth: 100, wght: 700, ls: 0.01, upper: 0 },
    dockLbl:  { size: 11, wdth: 100, wght: 600, ls: 0.01, upper: 0, color: 'dim' },
    fieldLbl: { size: 12, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    note:     { size: 13, wght: 400, lh: 1.5, color: 'dim' },
    statVal:  { size: 20, wdth: 100, wght: 800, lh: 1, tnum: 1 },
    // 600, not 500: native registers Archivo at 400 / 600 / 700 / 800 only.
    // Also the masthead's running head ("Training log", "Fuel") and a
    // sheet's kicker: a page's running head is small roman, not a display.
    statLbl: { size: 12, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    timer:    { size: 22, wdth: 100, wght: 700, ls: 0, tnum: 1 },
    kpiVal:   { size: 22, wdth: 100, wght: 800, ls: 0, lh: 1, tnum: 1 },
    // The challenge figure (research track 7 §6.3: "4,300 LBS." on the Cyr
    // poster): Besley ExtraBold, tabular lining figures, its unit on the same
    // baseline in Archivo. One hero figure a screen.
    headline: { size: 28, wdth: 101, wght: 800, ls: 0, lh: 1, tnum: 1 },
    // "Good afternoon," at 25 is 226.5pt, inside the 231 a 375 phone gives
    // it. All one ink: the name is not picked out (R5.4).
    youGreet: { size: 25, wdth: 101, wght: 800, ls: 0, lh: 1.08 },
    chip:     { size: 12, wdth: 100, wght: 600, color: 'chalk' },
    segBtn:   { size: 12, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    setInput: { size: 15, wdth: 100, wght: 700, tnum: 1, color: 'chalk' },
    mono:     { size: 12, color: 'chalk' },
    // The running meta — a card's "last 7 days", the greeting's
    // date, "Member since …", the recap's date — in Besley Italic, the
    // period's voice for a date line. Never over a head: the masthead's
    // running head is a small roman label (statLbl), so no screen stacks an
    // italic kicker over its title. Lining figures: old-style figures on
    // native are unverified on a device.
    meta:     { size: 14, wdth: 99, wght: 400, lh: 1.3, color: 'steel' }
  },
  // The stamped numeral, now a challenge figure: Besley ExtraBold at the
  // site's own size (26–40). The Vibes card's `315` is drawn in it, so the
  // picker face is Besley-ExtraBold (native pickerFace reads loadNum(40)).
  loadNum: { wdth: 101, wght: 800, ls: 0, lh: 1, tnum: 1 },

  face: {
    // Archivo, as v1: the four package files the app registers at boot.
    family: 'Archivo',
    keys: ['Archivo_400', 'Archivo_600', 'Archivo_700', 'Archivo_800'],
    snap: { 650: 700, 750: 800 },
    step: 100,
    width: 100,
    minLh: 1.088,
    mono: { ios: 'Menlo', android: 'monospace' },
    /* Besley, native: three upstream v4 statics (the ≤ 4 a vibe may add, the
       picker face included), each with a unique PostScript name and uniform
       tabular figures (t5-check). Each band has its own empty snap, so
       Archivo's {650: 700, 750: 800} can never send it to a weight it does
       not ship; `weights` picks the nearest, a tie going heavier.
       minLh is Besley's hhea, (2500 + 850) / 2000: taller head lines on
       native until a device screenshot proves a tighter clamp (its ink
       extent is 1.104). Nothing it sets is in a fixed-height box. */
    bands: [
      { min: 100.5, max: 101.5, family: 'Besley', keys: ['Besley_600', 'Besley_800'],
        snap: {}, weights: [600, 800], minLh: 1.675 },
      { min: 98.5, max: 99.5, family: 'BesleyItalic', keys: ['BesleyItalic_400'],
        snap: {}, weights: [400], minLh: 1.675 }
    ],
    web: {
      font: WEB_TEXT,
      mono: 'ui-monospace, monospace',
      importUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap',
      // The stacks vibes/iron-age.css declares, here so the web and native
      // parity check read one source. Self-hosted latin woff2, each keeping a
      // wght axis, width pinned at 100. A vibe's @font-face families are
      // named for the vibe (tools-check/vibes-scope.mjs), so 'iron-age …'.
      display: "'iron-age Besley', " + WEB_TEXT,
      italic: "'iron-age Besley Italic', " + WEB_TEXT,
      // The Vibes card's `315` only: a digits subset of the display face.
      num: "'iron-age Besley Digits'"
    }
  },

  /* Cut square. Round survives only where the copy or the object is round:
     the KPI's delta pill (the copy names it), the day dots ("this week's
     seven days"), the Steps ring and the chart's peak ring, legend and
     status dots, the avatar, the toggles. */
  radius: {
    r: 0, sm: 0, sheet: 0, tile: 0, pill: 999, plate: 0, chip: 0, mark: 0, idx: 0,
    round: '50%', hair: 0, bubble: 0, badge: 0
  },

  /* Print has no shadows. Each surface that floated on one (the peek bar,
     the rest pill, the toast, the FAB, the tour card) carries a 1pt ink
     keyline instead, drawn by its look. */
  shadow: {
    peek:  { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    rest:  { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    toast: { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    fab:   { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    fabPressed: { web: [] },
    tourCard:   { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0 } },
    // rings
    calTick:    { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'chalk' }] },   // the white marks' ink edge
    // "the white head" and the dashed target: white on cream is 1.3:1, so
    // each carries the same 1pt ink edge as the ticks (native CalMeter draws
    // it as a border of that width and colour).
    calHead:    { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'chalk' }] },
    calTarget:  { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'chalk' }] },
    flame:      { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'accent', a: 0.35, inset: true }] },
    kpiDay:     { web: [{ x: 0, y: 0, blur: 0, spread: 1.2, color: 'knurl', inset: true }] },
    kpiDayOn:   { web: [] },
    // Today is ringed in ink, whether trained or not.
    kpiToday:   { web: [{ x: 0, y: 0, blur: 0, spread: 1.5, color: 'well' },
                        { x: 0, y: 0, blur: 0, spread: 2.5, color: 'chalk' }] },
    kpiTodayOn: { web: [{ x: 0, y: 0, blur: 0, spread: 1.5, color: 'well' },
                        { x: 0, y: 0, blur: 0, spread: 2.5, color: 'chalk' }] },
    guideEaten: { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'knurl', inset: true }] },
    trajGood:   { web: [{ x: 0, y: 0, blur: 0, spread: 4, color: 'good', a: 0.15 }] },
    trajWarn:   { web: [{ x: 0, y: 0, blur: 0, spread: 4, color: 'warn', a: 0.15 }] },
    trajBad:    { web: [{ x: 0, y: 0, blur: 0, spread: 4, color: 'bad',  a: 0.15 }] },
    tourLit:    { web: [{ x: 0, y: 0, blur: 0, spread: 2, color: 'accent' }] }   // 5.20:1 on the dock's paper
  },

  /* No glass and no blur: a page does not blur. The webkit twins are facts
     about rack.css and stay v1's (ROLES `fixed`). */
  scrim: {
    sheet: { tint: 'backdrop', filter: 'none', webkit: false },
    dock:  { tint: 'dockGlass', filter: 'none', webkit: true, native: { intensity: 0 } },
    wkBar: { tint: 'wkBarGlass', filter: 'none', webkit: true },
    // A flat veil of ink at .80, not a gradient (both stops the same): the
    // tour card, bar paper with an ink keyline, reads 8.2:1 against it.
    tour:  { dir: 'to bottom',
             stops: [{ color: 'shade', a: 0.8, at: 0 }, { color: 'shade', a: 0.8, at: 0.42 }],
             native: { locations: [0, 0.42, 1] } }
  },

  chrome: {
    statusBar: 'dark',       // dark status text on the cream page
    keyboard: 'light',
    blurTint: 'light',       // the dock does not blur (intensity 0), but the prop stays valid
    shadow: '#1c1712',
    datePicker: 'light',
    camera: '#000000',       // the camera's letterbox stays black
    systemFace: null,
    // fixed: every vibe holds v1's (ROLES `fixed`); the launch stays graphite
    appearance: 'dark',
    launch: '#14161a',
    manifestTheme: '#14161a',
    webStatusBar: 'black-translucent',
    // None, as v1: an unset color-scheme already draws light form controls.
    colorScheme: null
  },

  /* Native sign-in and the root banners are drawn before any account's vibe
     is known, so they stay v1's — in 6-digit spelling, which is all a
     non-v1 file may hold. */
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
  // White on this vibe's pRed and pGreen fills: 10.07:1 and 7.69:1.
  banner: {
    devText:   '#ffffff',
    guardText: '#ffffff',
    guardNote: '#ffffff'
  },

  web: {
    rgb: {
      rack: 'rack', shade: 'shade', lift: 'lift', accent: 'accent',
      pYellow: 'pYellow', warn: 'warn', pRed: 'pRed', bad: 'bad', danger: 'danger',
      pBlue: 'pBlue', pGreen: 'pGreen', done: 'done', good: 'good', pWhite: 'pWhite', steel: 'steel'
    },
    // fixed: layout and motion are v1's in every vibe (§5.1)
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

  /* ---- the data tables: each hex entry is its role's colour ---- */
  groups: {
    chest: '#82180c', back: '#1f4a72', legs: '#8b6600',
    shoulders: '#0e5f40', arms: '#2a241d', core: '#6a6d6c',
    fallback: '#4a3f31'
  },
  groupPlates: {
    chest: '#82180C', back: '#1F4A72', legs: '#8B6600',
    shoulders: '#0E5F40', arms: '#2A241D', core: '#6A6D6C'
  },
  plates: ['#82180c', '#1f4a72', '#8b6600', '#0e5f40', '#2a241d', '#6a6d6c'],
  importGroups: {
    chest: 'pRed', back: 'pBlue', legs: 'pYellow',
    shoulders: 'pGreen', arms: 'pWhite', core: 'pChrome', fallback: 'grip'
  },
  // The six-plate mark in plate inks on the stock.
  mark: ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'],
  subjects: {
    fuel: 'pYellow', weight: 'pYellow', train: 'pBlue', steps: 'pWhite', water: 'pBlue',
    prot: 'pRed', carb: 'pYellow', fat: 'pBlue', all: 'chalk', fallback: 'steel'
  },
  // kpi · word draws no tile, so no corner tint.
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
    // The trees still disagree (index.js); a vibe changes neither side. But
    // native's pill sets its word at 9pt in its colour, and ochre is 3.92:1
    // there, so pro and custom take ochre's ink (inkOf): warn, 5.74.
    pill: {
      web:    { owner: 'on', pro: 'lit', custom: 'lit', trial: 'warn', locked: 'off', basic: '' },
      native: { owner: 'good', pro: 'warn', custom: 'warn', trial: 'warn', locked: 'bad', basic: 'dim' }
    },
    flag: { on: 'good', off: 'bad', lit: 'pBlue', warn: 'warn' }
  },
  // The confidence dot keeps its colour and also shows its level by shape —
  // filled, half, ring — drawn by chart · print's site, beside its word.
  conf: { high: 'good', medium: 'warn', low: 'bad' },

  // The set badge's bare letter (setRow · ruled): W in warn, because the
  // ochre plate is 3.92:1 as 12pt text; F and D in their own plates, which
  // read 7.09 and 6.48 on the grain. Without this W would be pYellow.
  tagInk: { W: 'warn', F: 'pRed', D: 'pBlue' },

  /* (A graft from concept C.) The text ink for a data role whose own
     colour is a graphic colour only. A site that sets SMALL text in a group
     or subject colour (a carbs label, a legs tag's letter, a Weight subject
     line under 18pt) resolves the role through this map. Graphics and large
     text keep the role itself. */
  inkOf: { pYellow: 'warn', pChrome: 'steel' }
});
