// Clear sky: a pale sky page with one number standing in it.
//
// Each tab is a flat sky-blue page. The one white slip on it holds the thing
// you touch (the Coach card, Fuel's summary, Weight's log, Steps' today);
// everything else lies on the sky with no box around it, its head sitting on a
// single 1pt line, its rows parted by space. Words are in the case they were
// written in, at 13 to 17, titles and secondary figures are Archivo Regular at
// 26, figures in rows
// are SemiBold at 22, and one prussian blue does one job: the thing to do next.
// The concept's signature — one huge Archivo Light figure on the tabs whose
// figure carries engine v3's hero mark (You's Goal pace, Fuel's summary,
// Steps' today) — is headline · solo and type.hero (request R1 in the spec,
// answered by engine v3). The spec, with every number's source, is
// ~/dev/vibes-night/design/clear-sky.md; its checks are the .mjs scripts in
// ~/dev/vibes-night/tools/clear-sky-final/.
//
// THE RULES THIS FILE KEEPS, and why (v1.js has the long form):
//
// - It imports nothing. It is copied byte for byte into rack-mobile
//   (src/pure/vibes/defs/clear-sky.js) and pinned by sha256, like v1.js.
// - Every colour is 6-digit hex. Only v1 may hold a legacy spelling
//   (index.js LEGACY_EXACT), so no tint here carries an `exact` string:
//   rgba() builds every one from its role and alpha, on both clients.
// - It has every role v1.js has, key for key, and fills the roles engine v2
//   added (band, tagInk, inkOf, shadow.calHead / calTarget, face.bands,
//   face.web.display / italic / num, type.meta, `shape`); the seven photo
//   bands take their own null default, as a vibe with no photo should.
//   Where v1 splits a value { web, native } (colors.onDanger) it keeps the
//   split with one colour on both sides.
// - It is frozen all the way down, like v1: every caller shares this object.
// - It invents no key. What the design needs and the contract cannot say yet
//   is a request in the spec, never a key here.
// - A colour ROLE is named for its job. Clear sky parts roles v1 keeps equal
//   (accent from pYellow; raised, track and collar; inverse from calMark) and
//   keeps others equal on purpose (well = rack, faint = dim, raised = track,
//   lift = bar).
//
// Every ratio quoted below is WCAG 2.x, floored to two places, from
// tools/clear-sky-final/contrast.mjs (track 4's colour library).

const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

export default deepFreeze({
  id: 'clear-sky',
  name: 'Clear sky',
  feel: 'Pale sky, open and calm.',   // 24 characters: one line at 375pt
  experimental: false,
  scheme: 'light',
  // vibes/icons/clear-sky.js: v1's hand-drawn set but for `spark` (v1's
  // four-point sparkle is the generic AI badge, SYNTHESIS finding 6), drawn as
  // a ± — "give or take", which is what an estimate is — and three glyphs
  // Archivo lacks (⚙ on native Fuel, ⚠, ✎) drawn in v1's own line.
  icons: 'clear-sky',
  images: {},             // photos are Iron Age's alone; every hero slot closes up
  // v1's on purpose (SYNTHESIS R3.3): the <meta> is already dark, and the
  // installed web app's status text is white whatever it says; `band` below
  // paints the dark strip under it.
  themeColor: '#14161a',

  /* The looks, one per block (design/VOCAB.md, vibes/defs/vocab.js). On the
     web vibes/clear-sky.css draws each non-v1 look by selector; natively each
     block's switch branches on it. */
  variants: {
    card: 'ruled',          // no box: the head sits on its 1pt line; the tab's lead card keeps a white slip
    youCard: 'ruled',       // Wins / Improve colour their line (good / warn), never a side stripe
    sectionHeader: 'plain', // the title as a real head (type.h3), no hairline
    eyebrow: 'v1',          // the type role does the work: 13/600 steel, sentence case
    statRow: 'line',        // a box-score line on the sky, never tiles (R6.3)
    btn: 'v1',              // prussian primary, 4pt corners (radius.sm)
    chip: 'tag',            // square raised tags; chosen is inked in
    segmented: 'tabs',      // words, the chosen one in ink over a 2pt underline
    settingsRow: 'v1',
    sheetHost: 'v1', sheetTitle: 'v1',
    dock: 'solid',          // opaque white, no glass on a light page
    screenHeader: 'v1',
    kpi: 'word',            // no tiles; word-sized sparklines; deltas bare (tint.pill* are 0)
    youHero: 'stacked',     // the avatar above the greeting, so the greeting reads as You's title
    coachCard: 'flat',      // the white slip: its 1pt border drawn in its own ground
    chart: 'ink',           // single-ink strokes, no area wash, no glow, square bars
    // The hero figure (engine v3, the spec's R1): at a figure with the hero
    // mark, the figure alone on its line in type.hero; every headline unit on
    // the figure's baseline at text size in steel, in type.tag where it is
    // authored in lower case.
    headline: 'solo',
    field: 'square',        // a 1pt knurl box, 3:1 on sky and white (R2.2)
    note: 'v1', toast: 'v1',
    listRow: 'plain',       // rows on a 44pt pitch with no rule between them (T3 D2)
    setTable: 'ruled',      // no card: the exercise name on its line, column heads over a rule
    setRow: 'ruled',        // inputs on a 1pt underline, the badge a bare letter
    plateStrip: 'v1',       // filled plate chips in the plate colours
    calCell: 'ruled',       // a printed calendar; at rule.hair 0 no lines, cells parted by space
    fab: 'square',          // a prussian slab, 4pt corners, no shadow
    addTile: 'flat',        // no washes, no border; the Photo tile marked by its prussian well
    sessionChrome: 'flat'   // no glass, no shadows
  },

  /* The params a look reads (vocab.js `params`). One rule, one weight: every
     structural line is 1pt knurl (3.70 on the sky, 5.79 on white). */
  shape: {
    rule: {
      ink: 'knurl',
      // 0: no hairline anywhere (engine v3, the spec's R5). Set rows are
      // parted by space alone — their inputs already sit on 1pt underlines —
      // and calCell · ruled draws its printed calendar with no lines.
      hair: 0,
      head: [1],
      // 'below': a head sits on its line, and its rows lie under it on the sky.
      place: 'below',
      sub: [1],
      total: [1]
    },
    // Read by no look Clear sky names; set to vocab.js's defaults so the web
    // tokens say so outright.
    leader: { ink: 'steel', dot: 1.5, pitch: 4, min: 16 },
    band: { fill: 'raised', ink: 'chalk', height: 30 },
    gutter: 2,
    keyline: { ink: 'chalk', width: 1 },
    // The lead slip is white on the sky (1.56:1 off it) and needs no outline.
    lead: { keyline: false },
    /* Engine v3. */
    // The tour tip and the Coach sheet's asking bubble: a 1pt prussian
    // outline all round, never a coloured side stripe (the spec's R4).
    stripe: 'keyline',
    // The segmented tabs' underline and the calendar's today keyline are ink:
    // the accent never marks "chosen" (chosen is inked in).
    cue: { ink: 'chalk' },
    // Onboarding's chosen card is told by its 2pt ink keyline and weight.
    chosen: { tick: false },
    rank: { column: false }
  },

  colors: {
    /* ---- native T.colors, key for key ---- */
    // The page: a clear morning sky (track 4's deep2-sky, GF6). OKLCH 0.840 /
    // 0.045 / 240, 5.83 dE00 from blue-200, its nearest Tailwind v3 default;
    // cool (R-B = -52), far from the AI-cream band (R3.5); 70.6 dE00 from
    // v1's ground and 13.2 from Chalk's. One flat hex: no gradient, no cloud.
    rack:   '#b1cfe5',
    // The lead slip, sheets, fields, the dock, the session bar. Neutral
    // (OKLCH C 0.003), 1.56:1 off the sky, so it stands off it by value.
    bar:    '#f9fbfc',
    // Decorative hairlines only: the stat line's column rules, settings-row
    // dividers, chart grids, the dock's top rule, the heat strip's empty day
    // (pinned paint). 1.27 on the sky, 1.99 on white. Never the only edge of
    // a control.
    collar: '#9bb8cf',
    // Structure and control edges: the 1pt head line, input underlines,
    // field borders, the set check's edge, the rest pill and peek bar edges.
    // Darker than research's #5c6f82 (concept B's value) so a lifter reading
    // in glare gets 3.70 on the sky and 4.56 on a done row, not 3.19 / 3.94.
    knurl:  '#526578',
    chalk:  '#0f1a24',   // the ink, blue-black, never #000000: 10.82 on the sky, 16.95 on white
    steel:  '#2c3b48',   // labels, units, secondary lines: 7.07 on the sky
    // Tertiary: notes, placeholders, e1RM, the dock at rest. Concept B's
    // darker grey: 5.31 on the sky, 6.56 on a done row, 8.32 on white (A's
    // #475563 gave 4.70 on the sky, the margin a lifter reads in glare).
    // Never under 4.5 on anything it sits on.
    dim:    '#404d5b',
    // The plates as print-dark inks: a light page forces them dark (T4 R3).
    // Worst group pair 18.13 normal / 15.42 deuteranopia / 15.84 protanopia
    // (Machado 2009), the best in the lineup.
    pRed:    '#6e0005',  // chest, protein, gain: 7.76 on the sky
    pBlue:   '#02507b',  // back, fat, water, training, cut, drop sets: 5.30 on the sky
    // Legs, carbs, fuel and weight, maintain. The copy calls it yellow
    // ("Yellow — hold", "The yellow line is the daily average"), so it is a
    // dark mustard at HSL 45 (OKLCH h 85.5), not research's #966103, which
    // reads orange (OKLCH h 72). A graphic on the sky (3.12); small text inks
    // as warn (inkOf); as text on white 4.89.
    pYellow: '#8c6900',
    pGreen:  '#045d42',  // shoulders, steps: 4.87 on the sky
    pWhite:  '#25272b',  // arms, the steps subject: ink, as no white can reach 3:1 here
    pChrome: '#676d77',  // core: slate, a graphic on the sky (3.20); small text inks as dim
    good: '#03553c',     // HUE_NAMED green, bluish: 5.45 on the sky
    warn: '#634800',     // HUE_NAMED amber, darker than pYellow so "amber the other way" stays true: 5.25
    bad:  '#6e0005',     // = pRed; good against bad survives CVD (15.31 deut / 14.34 prot)
    // native text-on-colour keys (aliases build() fills from their roles)
    onYellow: '#ffffff',       // = onAccent
    onGreen:  '#ffffff',       // = onDone
    onPlate:  '#f9fbfc',       // figures on a filled plate chip: 4.89 or better on all six
    white:    '#ffffff',       // = onDanger
    pYellowPressed: '#00203e', // = accentPressed
    fallback: '#2c3b48',       // = groups.fallback, which follows steel

    /* ---- semantic roles ---- */
    // Prussian, one job: the primary action, the FAB, focus, today, the dock
    // mark, Coach's voice, links, the PR highlight, a toggle's on-track.
    // Never data, never status, never "chosen" (chosen is inked in). HSL 213,
    // outside the banned 240-295 band; 6.08 dE00 from blue-900; 10.85 from
    // the data blue, from which it parts mainly by lightness (L* 21 vs 32), so
    // it never sits beside back, fat or water as the only cue.
    accent:        '#083366',
    focus:         '#083366',
    accentPressed: '#00203e',  // the FAB pressed; white on it 16.45
    onAccent:      '#ffffff',  // 12.53 on the accent
    danger:        '#6e0005',  // a keyline and words; a fill only on the swipe-to-delete panel
    onDanger:      { web: '#ffffff', native: '#ffffff' },  // one colour; v1's split shape kept
    done:          '#045d42',  // the filled set check, the rest line while it runs
    onDone:        '#ffffff',  // the check's mark: 7.92
    // The recess inside a white surface is the sky, as v1's well is its page:
    // the Weight log's input in the white slip, the add tiles on the white
    // sheet. A window back to the page, never a box of the slip's own fill.
    well:          '#b1cfe5',
    knockout:      '#f9fbfc',  // words cut out of the ink fill: 16.95
    // Chosen chips, your answers in the Coach sheet and the toast are inked in.
    inverse:       '#0f1a24',
    // White, because the copy says "the white head" (HUE_NAMED). On the light
    // track each mark carries a 1pt ink ring (shadow.calTick / calHead /
    // calTarget below), 6.64-7.60 against the zone washes.
    calMark:       '#ffffff',
    // A control up off its ground: plain buttons, tags, the rest pill and
    // peek bar, the Coach bubble, a chosen option, a pressed row. Neutral
    // (OKLCH C 0.014, concept B's value) and lighter than the sky (1.24),
    // darker than white (1.25), so it reads on both. dim on it 6.63.
    raised:        '#d9e3ea',
    // The empty part of a meter: = raised on purpose. Every plate clears 3:1
    // on it as a fill (the weakest, pYellow 3.89). Also the heat strip's
    // untrained day, where the vibe's stylesheet and native T.chart re-draw
    // the pinned collar (spec §8, chart).
    track:         '#d9e3ea',
    // The sheet's grab handle (3.38 on white, R8.5), a toggle's off track
    // under a steel knob (3.26), the trajectory dot with no verdict (2.16 on
    // the sky, where v1's is 1.40 on its card; the sentence beside it carries
    // the state).
    grip:          '#768ba0',
    faint:         '#404d5b',  // = dim on purpose: no fourth, fainter grey (never-do 5)
    onWarn:        '#ffffff',  // native trial banner ink on its solid warn bar: 8.54
    // Every shadow and scrim is the ink, never black.
    shade:         '#0f1a24',
    // The white wash, as in v1 (#ffffff there): here the white of the slip,
    // so the washes built on it are exactly "bar at a". It is what clears a
    // done row, flashes a ticked set and pales the callout (tint.setDone,
    // setFlash, reviewBg), and it is the one near-white the web can put an
    // alpha on: --lift-rgb is a channel token, and bar has none (web.rgb).
    lift:          '#f9fbfc',
    // Native's flat forms of the hero and lit add-tile washes. addTile · flat
    // draws no wash, so both are the well itself: even a v1-look fallback then
    // draws none, and its dim line keeps 5.31 (accent .10 over the well would
    // have left it at exactly 4.50).
    tileHero:      '#b1cfe5',
    tileLit:       '#b1cfe5',
    // The strip under the installed web app's always-white status text
    // (V59 §10): the ink, 17.59 under white. Native ignores it; its status
    // text is chrome.statusBar's dark.
    band:          '#0f1a24',
    // Engine v3. A toggle's off knob: steel on the grip track (3.26).
    knob:          '#2c3b48',
    // The greeting's name in the greeting's own ink (the spec's R2): one ink
    // for You's title, never the accent as decoration.
    greetName:     '#0f1a24'
  },

  /* The set badge's letter (setRow · ruled draws it bare, no wash). W in
     warn, since pYellow is a graphic-only ink here: 6.48 on a done row, 5.25
     on the sky. F and D keep their plate colours (9.57 / 6.54 on a done row). */
  tagInk: { W: 'warn', F: 'pRed', D: 'pBlue' },
  // Small text in a data colour. pYellow and pChrome are graphics-only on
  // the sky (3.12 / 3.20), so their small text inks as warn and dim (5.25 /
  // 5.31); the other four ink themselves (4.87 or better on the sky).
  inkOf: { pRed: 'pRed', pBlue: 'pBlue', pYellow: 'warn', pGreen: 'pGreen', pWhite: 'pWhite', pChrome: 'dim' },

  alpha: {
    yellow: 'pYellow', red: 'pRed', blue: 'pBlue', green: 'pGreen', ground: 'rack',
    accent: 'accent', danger: 'danger', warn: 'warn'
  },

  /* Tints: a role and an alpha, never an exact string. On a sky page every
     darkening wash pulled dim under 4.5 (concept A's first pass), so the
     done row, its flash and a pressed row lighten instead. */
  tint: {
    // A done row CLEARS: it lightens toward white (#d1e3ef over the sky)
    // rather than washing green. The filled green check carries "done"
    // (6.01 against the cleared row), so colour is never the only cue. dim
    // 6.56, W 6.48, D 6.54, the knurl underline 4.56 on it.
    setDone:   { color: 'lift',    a: 0.45 },
    // The 600ms flash when a set is ticked: a white flash that settles into
    // the cleared row. Every ink a set row carries stays at 7.91 or better at
    // its peak (v1's kind of flash, accent .20, left dim at 3.80 and W at
    // 3.76 for those 600ms).
    setFlash:  { color: 'lift',    a: 0.9 },
    // setRow · ruled draws W / F / D as bare letters (tagInk); no wash.
    tagW:      { color: 'raised',  a: 0 },
    tagF:      { color: 'raised',  a: 0 },
    tagD:      { color: 'raised',  a: 0 },
    dropRail:  { color: 'pBlue',   a: 0.85 },  // a 3:1 graphic: 4.03 on the sky, 4.76 on a done row
    dropAdd:   { color: 'pBlue',   a: 0.45 },  // + Drop's border; the button carries words
    pickSel:   { color: 'accent',  a: 0.08 },  // a chosen picker row on white: dim 7.20; its check carries the state
    // A lifting block is a rule-framed group (setTable · ruled) with no wash
    // box: 0 is transparent, so every ink keeps its sky ratio (dim 5.31).
    block:     { color: 'accent',  a: 0 },
    coachBase: { color: 'accent',  a: 0.14 },  // v1's pulse on the set check, which holds no text at rest
    coachLow:  { color: 'accent',  a: 0.07 },
    coachHigh: { color: 'accent',  a: 0.38 },
    // A pressed row lifts to the raised tone: lighter on the sky, darker on
    // white, visible on both; dim on it 6.63.
    rowPress:  { color: 'raised',  a: 1 },
    // No delta pills (R6.6): kpi · word draws each delta as bare signed text
    // in its status colour, with its arrow.
    pillBase:  { color: 'lift',    a: 0 },
    pillUp:    { color: 'good',    a: 0 },
    pillDown:  { color: 'bad',     a: 0 },
    pillWarn:  { color: 'warn',    a: 0 },
    // The calorie bands over the track: pale blue, khaki and rose, each
    // 1.46-1.71 off the track. The copy's blue / yellow / red hold.
    zoneCut:   { color: 'pBlue',   a: 0.24 },
    zoneHold:  { color: 'pYellow', a: 0.4 },
    zoneGain:  { color: 'pRed',    a: 0.26 },
    // dock · solid and sessionChrome · flat draw both bars opaque; these are
    // what a v1-look fallback would draw.
    dockGlass:  { color: 'rack',  a: 0.82 },
    wkBarGlass: { color: 'rack',  a: 0.9 },
    backdrop:   { color: 'shade', a: 0.4 },   // ink .40: light grounds dim at .40-.45 (R3.3); the sheet 3.60 off it
    trajGood:     { color: 'good',   a: 0.18 },
    trajWarn:     { color: 'warn',   a: 0.18 },
    trajBad:      { color: 'bad',    a: 0.18 },
    // The callout: the Weekly review's "Next week" is a paler band of sky
    // (#d9e7f2), with no border — no container role here has both a fill and
    // an edge. dim 6.85, steel 9.12 on it.
    reviewBg:     { color: 'lift',   a: 0.55 },
    reviewBorder: { color: 'lift',   a: 0 },
    // The calorie runway's hatch (decorative, 1.82 on the track) and its
    // right edge, a mark at 4.61. v1's rack hatch would vanish on white.
    runway:       { color: 'knurl',  a: 0.45 },
    runwayEdge:   { color: 'knurl',  a: 1 }
  },

  /* ---- type ----
     No preset is caps and none is tracked: the strings they carry are
     authored in sentence case, so `upper: 0` lowers them (T3 C1). The few
     authored all in lower case ('to go', 'kcal left today' …) keep v1's
     capitals at their own sites, as the spec's caps tag (§5.5, request R6):
     VOCAB rule 2 lowers only what was written in sentence case. Three
     weights, one job each: 400 text, titles and secondary figures; 600
     labels, heads, names, buttons and figures in rows; 300 is the hero's
     alone (request R1). Words at 13, 14 (buttons, v1's size), 15 and 17;
     figures in rows at 22; titles and secondary figures at 26, the size at
     which "September 2026" fits beside the month buttons on a 320 web screen
     (192.9 of 200pt, tools/clear-sky-final/widths.mjs). Nothing under 11pt;
     weight 400 or more at 15pt and under (R4.2). */
  type: {
    body:     { size: 15, wdth: 100, wght: 400, lh: 1.45, color: 'chalk' },
    h1:       { size: 26, wdth: 100, wght: 400, ls: -0.01, color: 'chalk' },   // the title in Regular: quiet beside the hero
    h2:       { size: 17, wdth: 100, wght: 600, ls: 0, color: 'chalk' },       // sheet titles: the text size, one weight up
    h3:       { size: 17, wdth: 100, wght: 600, ls: 0, color: 'chalk' },       // section heads (sectionHeader · plain)
    eyebrow:  { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    // v1's size, one weight lighter and untracked: every label measured is
    // narrower than v1 native's 14/700 ("Finish" 39.5 against 42.2pt), so no
    // button, the session bar's Finish included, is wider than it is today.
    btn:      { size: 14, wdth: 100, wght: 600, ls: 0, color: 'chalk' },
    btnLg:    { size: 17, wdth: 100, wght: 600, ls: 0, upper: 0 },             // "Start workout", not "START WORKOUT"
    dockLbl:  { size: 11, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'dim' },  // the platform's tab-label size: 8.32 on white
    fieldLbl: { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    note:     { size: 13, wght: 400, lh: 1.45, color: 'dim' },
    statVal:  { size: 22, wdth: 100, wght: 600, lh: 1, tnum: 1 },               // "112.2k" 69.5pt in a 75pt third at 320
    statLbl:  { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    timer:    { size: 22, wdth: 100, wght: 600, ls: 0, tnum: 1 },
    kpiVal:   { size: 22, wdth: 100, wght: 600, ls: 0, lh: 1, tnum: 1 },
    headline: { size: 26, wdth: 100, wght: 400, ls: -0.01, lh: 1, tnum: 1 },   // You's figures ("191.2 lb") at the title size
    youGreet: { size: 26, wdth: 100, wght: 400, ls: -0.01, lh: 1.1 },           // You's title; the name in one ink (colors.greetName)
    chip:     { size: 13, wdth: 100, wght: 600, color: 'steel' },
    segBtn:   { size: 13, wdth: 100, wght: 600, ls: 0, upper: 0, color: 'steel' },
    setInput: { size: 15, wdth: 100, wght: 600, tnum: 1, color: 'chalk' },     // 15: iOS Safari's zoom-on-focus stays as it is
    mono:     { size: 13, color: 'chalk' },                                      // the paste box only
    meta:     { size: 13, wght: 400, lh: 1.45, color: 'steel' },                 // the running meta: "last 7 days", a date
    // Engine v3. The hero (headline · solo, the spec's R1): one thin tall
    // figure at the hero-marked sites, 2.92x the 26 title. Light 300 only here.
    hero:     { size: 76, wdth: 100, wght: 300, ls: -0.02, lh: 1, tnum: 1 },
    // The caps tag (the spec's R6): strings authored in lower case that v1
    // shows in capitals keep them, at 11 / 600 tracked .06em; and the literal
    // small caps outside the blocks reach 11 (R3's floor).
    tag:      { size: 11, wdth: 100, wght: 600, ls: 0.06, upper: 1 }
  },
  // .load-num at the call sites' own sizes (26-40) in Regular, tabular: the
  // wide 800 stamped-plate figure is v1's. Native floors lh at minLh anyway.
  loadNum: { wdth: 100, wght: 400, ls: -0.01, lh: 1, tnum: 1 },

  /* ---- the face ----
     Archivo only, v1's family (OFL 1.1; the package's LICENSE_FONT carries
     no Reserved Font Name). Native: v1's four statics, already registered at
     boot, plus one new file for the hero, Archivo_300 (Archivo_300Light.ttf,
     119,592 B, from @expo-google-fonts/archivo 0.4.2). Web: rack.css line 1's
     variable Archivo (wdth 62-125, wght 300-900), 0 extra bytes; Clear sky
     declares no @font-face, so no family of its own needs the vibe-id prefix.
     The Coach card keeps Archivo on v1 metrics (no advance table). */
  face: {
    family: 'Archivo',
    keys: ['Archivo_300', 'Archivo_400', 'Archivo_600', 'Archivo_700', 'Archivo_800'],
    snap: { 650: 700, 750: 800 },
    step: 100,
    width: 100,
    minLh: 1.088,           // hhea (878 + 210) / 1000, the Light file's too
    bands: [],              // one family, one width: nothing condensed
    mono: { ios: 'Menlo', android: 'monospace' },
    web: {
      font: "'Archivo', system-ui, -apple-system, sans-serif",
      display: "'Archivo', system-ui, -apple-system, sans-serif",
      italic: "'Archivo', system-ui, -apple-system, sans-serif",
      num: "'Archivo', system-ui, -apple-system, sans-serif",
      mono: 'ui-monospace, monospace',
      importUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap'
    }
  },

  /* ---- radius: 4 nearly everywhere, so the white slip reads as a sheet of
     paper laid on the sky, not a Weather module; the platform sheet keeps its
     shoulder; pills only on the toast and the rest pill. ---- */
  radius: {
    r: 4, sm: 4, sheet: 18, tile: 4, pill: 999, plate: 4, chip: 4, mark: 2, idx: 4,
    round: '50%', hair: 1, bubble: 12, badge: 4
  },

  /* ---- shadows ----
     Flat: none on the FAB, the toast, the rest pill or the peek bar. The
     tour card keeps the vibe's one shadow, in the ink. Rings are outlines. */
  shadow: {
    peek:  { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    rest:  { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    toast: { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    fab:   { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    fabPressed: { web: [] },
    tourCard:   { web: [{ x: 0, y: 12, blur: 32, spread: 0, color: 'shade', a: 0.22 }],
                  native: { opacity: 0.22, radius: 16, x: 0, y: 12 } },
    // The calorie ticks, head and dashed target: white marks with a 1pt ink
    // ring (native: a 1pt border), 6.64-7.60 against the zone washes.
    calTick:    { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'chalk', a: 0.9 }] },
    calHead:    { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'chalk', a: 0.9 }] },
    calTarget:  { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'chalk', a: 0.9 }] },
    flame:      { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'accent', a: 0.35, inset: true }] },
    kpiDay:     { web: [{ x: 0, y: 0, blur: 0, spread: 1.2, color: 'knurl', inset: true }] },
    kpiDayOn:   { web: [] },
    // Today's day dot, ringed; the inner ring is the well, which is the sky
    // the dots sit on under kpi · word.
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
     v1's, a fixed fact about rack.css. The tour fogs to sky. */
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
    shadow: '#0f1a24',       // the tour card's only shadow, in the ink
    datePicker: 'light',
    camera: '#000000',       // the camera stays black
    systemFace: null,        // as v1: no fontFamily key at the system-font sites
    // Fixed at build or install time; every vibe holds v1's. The launch is
    // graphite and turns sky once the account's vibe is read.
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

  // White on the pRed / pGreen banner fills: 12.61 / 7.93.
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
    chest: '#6e0005', back: '#02507b', legs: '#8c6900',
    shoulders: '#045d42', arms: '#25272b', core: '#676d77',
    fallback: '#2c3b48'
  },
  groupPlates: {
    chest: '#6E0005', back: '#02507B', legs: '#8C6900',
    shoulders: '#045D42', arms: '#25272B', core: '#676D77'
  },
  plates: ['#6e0005', '#02507b', '#8c6900', '#045d42', '#25272b', '#676d77'],
  importGroups: {
    chest: 'pRed', back: 'pBlue', legs: 'pYellow',
    shoulders: 'pGreen', arms: 'pWhite', core: 'pChrome', fallback: 'grip'
  },
  mark: ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'],
  subjects: {
    fuel: 'pYellow', weight: 'pYellow', train: 'pBlue', steps: 'pWhite', water: 'pBlue',
    prot: 'pRed', carb: 'pYellow', fat: 'pBlue', all: 'chalk', fallback: 'steel'
  },
  // kpi · word draws no tile, so no corner tint: every alpha is 0.
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
    /* Native's Pro and Custom pills in the web's `lit` (pBlue): mustard words
       at 9pt would be 3.12 on the sky; the data blue is 5.30. */
    pill: {
      web:    { owner: 'on', pro: 'lit', custom: 'lit', trial: 'warn', locked: 'off', basic: '' },
      native: { owner: 'good', pro: 'pBlue', custom: 'pBlue', trial: 'warn', locked: 'bad', basic: 'dim' }
    },
    flag: { on: 'good', off: 'bad', lit: 'pBlue', warn: 'warn' }
  },
  conf: { high: 'good', medium: 'warn', low: 'bad' }
});
