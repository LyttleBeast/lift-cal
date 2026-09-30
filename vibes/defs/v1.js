// v1 — the original Rack look, as data.
//
// Every visual role the two clients spend, with the value it has in rack-v58
// (web 928a65e) and buildNumber 58 (native 1cb6498). Nothing imports this file
// yet: the web engine (vibe.js, rack.css's :root) and the native engine
// (src/ui/theme.js build()) are written against it next, and a new vibe is a
// file with this shape and different values. `vibes/defs/index.js` holds the
// map from each role here to the CSS custom property and the native T path it
// lands on (ROLES), and says which strings below are legacy spellings.
//
// THE RULES THIS FILE KEEPS, and why:
//
// - It imports nothing. It is copied byte for byte into rack-mobile
//   (src/pure/vibes/defs/v1.js) and pinned by sha256, like coach.js, so it
//   cannot lean on anything either tree has and the other lacks.
// - Colours are 6-digit hex, because native's rgba() is parseInt(hex.slice(1))
//   and reads nothing else. The exceptions are v1's own legacy spellings
//   ('#fff', '#000', the unspaced rgba strings) that reach something verbatim
//   today: a host prop or an inline style on native; a stylesheet declaration
//   on the web (colors.onDanger.web at .swipe-del, chrome.camera at
//   .scan-video, which scan.jsx also spends as a prop); or T itself, read by
//   nothing (tint.wkBarGlass.exact). index.js LEGACY_EXACT lists every one
//   and says where it lands, and no other vibe may use them. Proving v1 is
//   build 58 "to the prop" needs them.
// - It is frozen all the way down, like everything index.js exports: every
//   caller in a process shares this one object, and one that wrote into it
//   would change v1 for every caller after it. An engine that needs a
//   variant copies first. Every vibe definition does the same.
// - Where web and native disagree today, both are kept as { web, native } —
//   never one picked. The disagreements are listed in index.js's comments.
//   One of them (colors.onDanger) is a single colour spelled two ways, each
//   spelling reaching its own verbatim sink; the split keeps both spellings.
// - A colour ROLE is named for its job, not its hue. `pYellow` is legs, carbs,
//   the fuel and weight subject and the maintain zone; `accent` is the app's
//   own call to action. In v1 they are the same yellow; a vibe may part them.
//   The engines point each call site at the role that matches its job.
// - v1 changes nothing: every value is the one the code has today, and
//   tools-check/vibes-contract.mjs / tools/verify-vibes-contract.mjs read both
//   trees at their base commits to prove it.

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
  name: 'v1',
  feel: 'The original Rack look.',
  experimental: false,
  scheme: 'dark',
  icons: 'v1',          // vibes/icons/v1.js
  images: {},           // v1 has no photo behind any box
  themeColor: '#14161a', // index.html <meta name="theme-color">

  /* The shared building blocks that may branch per vibe (V59 §6.9). Every one
     is 'v1' here: the v1 branch is today's JSX and CSS, moved over unchanged.
     Phase D extends this list (§9.1); it never renames an entry. The looks
     each block accepts, and what a look may change, are vocab.js's; the last
     twelve are the blocks it added. */
  variants: {
    card: 'v1', youCard: 'v1', sectionHeader: 'v1', eyebrow: 'v1',
    statRow: 'v1', btn: 'v1', chip: 'v1', segmented: 'v1', settingsRow: 'v1',
    sheetHost: 'v1', sheetTitle: 'v1', dock: 'v1', screenHeader: 'v1',
    kpi: 'v1', youHero: 'v1', coachCard: 'v1', chart: 'v1',
    headline: 'v1', field: 'v1', note: 'v1', toast: 'v1', listRow: 'v1',
    setTable: 'v1', setRow: 'v1', plateStrip: 'v1', calCell: 'v1', fab: 'v1',
    addTile: 'v1', sessionChrome: 'v1'
  },
  /* The params a look reads — rules, leaders, bands, gutters, keylines, the
     lead card's keyline (vocab.js `params`, which holds the default for every
     key a definition leaves out). v1 names no look, so it reads none and holds
     none; rack.css's :root carries the defaults as the --shape-* tokens, which
     nothing in v1 spends. */
  shape: {},

  colors: {
    /* ---- native T.colors, key for key (theme.js:14-43) ---- */
    // Surfaces. `rack` IS the page: html/body, #auth, #gate, #onboard, every
    // screen's root View. Its other two jobs have their own roles below
    // (well, knockout), because a light vibe needs them apart.
    rack:   '#14161a',
    bar:    '#1c1f26',   // card, sheet, field
    // The hairline: every 1px border and divider, chart grid lines, the rule
    // after a section title. Its other two jobs (a raised fill, a meter's
    // empty track) are `raised` and `track` below.
    collar: '#262a33',
    // The border of a raised thing — the sheet's top edge, the peek bar, the
    // rest pill, a set's tick box, a pressed tile or card — and the ring
    // shadows (kpiDay, guideEaten). Its fill and ink jobs are `grip` and
    // `faint` below.
    knurl:  '#333844',
    // Ink. chalk is type()'s default colour and the web's body text; its fill
    // and calorie-bar jobs are `inverse` and `calMark` below.
    chalk:  '#f2f0eb',
    steel:  '#8d939f',
    dim:    '#5c6270',
    // The IPF plates, and the data colours they became: muscle groups, macros,
    // subjects, calorie zones. Data, never chrome.
    pRed:    '#d6252b',  // chest, protein, gain
    pBlue:   '#2e7fd9',  // back, fat, water, training, cut, drop sets
    pYellow: '#f0be1e',  // legs, carbs, fuel and weight, maintain
    pGreen:  '#2aa85c',  // shoulders, steps
    pWhite:  '#e8e5de',  // arms, the steps subject
    pChrome: '#a8aeb8',  // core
    // Verdicts. Same three hexes as the plates in v1, a different job.
    good: '#2aa85c',
    warn: '#f0be1e',
    bad:  '#d6252b',
    // Native's text-on-colour keys. Each has one main job today, and that job
    // has a semantic role below (index.js ROLES marks them `alias`):
    // onYellow -> onAccent, onGreen -> onDone, white -> onDanger,
    // pYellowPressed -> accentPressed, fallback -> groups.fallback.
    // onYellow has one more: the trial banner's ink (app/_layout.jsx:140),
    // which is onWarn — ROLES lists it under the alias's `except`.
    onYellow: '#141414',
    onGreen:  '#0d1a11',
    onPlate:  '#14161a',   // the number on a plate chip (web --ink-plate)
    white:    '#ffffff',
    pYellowPressed: '#d9a90f',
    fallback: '#8d939f',

    /* ---- semantic roles split out of double duty (V59 §5.2, §6.2) ---- */
    // pYellow's other job: primary button, focus, the dock mark, today, the
    // FAB, selected and "on" states, Coach's voice, the PR highlight. Not the
    // heat strip's trained day: the pinned analytics.js writes it
    // var(--p-yellow), so it stays pYellow on both clients (index.js
    // PINNED_PAINT).
    accent:        '#f0be1e',
    // The :focus-visible ring and the yellow :focus borders and ink (the
    // fields, set inputs, the qty and paste boxes, .wk-name). NOT
    // .wpe-row input:focus, which is --p-blue — the water subject — and stays
    // so (index.js ROLES colors.focus `except`).
    focus:         '#f0be1e',
    accentPressed: '#d9a90f',  // .fuel-fab:active (web --accent-press)
    onAccent:      '#141414',  // ink on the accent: .btn-primary, .fuel-fab, .badge (web --ink)
    // pRed's other job: the destructive and the refused — .btn-danger, the
    // swipe-to-delete panel, errors, a delete pressed, the rest timer over.
    danger:        '#d6252b',
    // web says #fff (rack.css:807 .swipe-del), native T.colors.white '#ffffff'.
    onDanger:      { web: '#fff', native: '#ffffff' },
    // pGreen's other job: a set done, its tick, the rest line running.
    done:          '#2aa85c',
    onDone:        '#0d1a11',  // the tick on .set-check.on (web --ink-go)
    // rack's other two jobs. `well` is the recessed surface INSIDE a card —
    // inputs, chips, tiles, KPI tiles, choice rows — which is the page colour
    // in v1. `knockout` is ink cut out of a bright fill in the page colour:
    // .chip.on, .seg-btn.on, the toast, the add-tile tag.
    well:          '#14161a',
    knockout:      '#14161a',
    // chalk's other two jobs. `inverse` is the bright fill behind knockout
    // ink. `calMark` is the marks on the calorie bar — the head (where you
    // are now), the zone ticks and the dashed target — and their swatches in
    // the bar guide. The copy calls the head "the white head", so index.js
    // HUE_NAMED holds calMark white in every vibe; chalk, the ink, is free to
    // go dark in a light vibe.
    inverse:       '#f2f0eb',
    calMark:       '#f2f0eb',
    // collar's other two jobs. `raised` is the fill of a control or chip that
    // sits up off the card: the secondary .btn (native Btn plain), the peek
    // bar and rest pill, set and step index badges, a selected option, the
    // Coach bubble, a pressed nav button. `track` is the empty part of a
    // meter: bar tracks, ring tracks, a chart bar's background, empty pips
    // and dots. A light vibe cannot make one value a line, a raised surface
    // and a track at once. One empty cell is not `track`: the heat strip's
    // untrained day, which the pinned analytics.js writes var(--collar) — it
    // stays collar on both clients (index.js PINNED_PAINT).
    raised:        '#262a33',
    track:         '#262a33',
    // knurl's other two jobs. `grip` is a fill one step above `raised`: the
    // sheet's grab handle, a toggle's off track, the lit add tile's icon well
    // and tag, the trajectory dots, the runway hatching, the importer's
    // unknown-group segment. `faint` is the faintest ink: an optional field's
    // label, a blank meal's kcal, link underlines, a dimmed spark line. Not
    // the spark bars' unlit bars: the pinned analytics.js writes them
    // var(--knurl), so they stay knurl on both clients (index.js
    // PINNED_PAINT).
    grip:          '#333844',
    faint:         '#333844',
    // Ink on a solid warn fill. Native only: the trial banner is a solid
    // pYellow bar (app/_layout.jsx:138-140) whose job is warn — its web twin,
    // .trial-bar, is a warn wash with warn ink — so its ink is not onAccent.
    onWarn:        '#141414',
    // The black under every shadow and scrim, and the white wash: a pressed
    // row (tint.rowPress, .set-row-nav:active) and the RESTING fill of every
    // delta pill (tint.pillBase, .delta-pill). Not the same thing as dim or
    // chalk. A light vibe that turns lift around recolours both, the press
    // and every pill at rest.
    shade:         '#000000',
    lift:          '#ffffff',
    // Native paints the web's two accent-wash tiles (.add-tile.hero / .lit,
    // a gradient over the well) as one flat colour each — common.jsx:411.
    tileHero:      '#1e1f1e',
    tileLit:       '#17181a',
    // The strip under the installed web app's status bar, whose text is
    // always white. rack-v58 draws no strip, so v1's is null — none; a light
    // vibe sets a dark one. Native ignores it (chrome.statusBar).
    band:          null,
    // Engine v3. The toggle's off knob (rack.css .tog::after, native
    // coach/settings.jsx's Switch thumbColor when off): steel. And the name in
    // the You greeting (.you-greet-name, native you/Hero.jsx): the accent. A
    // definition without either takes its own steel / accent (index.js ROLES
    // `or`), so neither moves in any vibe that does not set it.
    knob:          '#8d939f',
    greetName:     '#f0be1e'
  },

  /* native T.alpha: helper name -> the colour role it tints. The first five
     are theme.js:51-55 as they are; accent, danger and warn are new, for the
     call sites whose alpha.yellow / alpha.red is really the accent, the
     danger or a warning (food/common.jsx:946-947, AiWarn's wash around a
     warn icon — the web's .ai-warn). A new helper is named for its role. */
  alpha: {
    yellow: 'pYellow', red: 'pRed', blue: 'pBlue', green: 'pGreen', ground: 'rack',
    accent: 'accent', danger: 'danger', warn: 'warn'
  },

  /* native T.tint: { color: role, a }. rgba(colors[color], a) is today's exact
     string — except where `exact` is given, which is the legacy spelling
     today's code holds ('rgba(255,255,255,0.04)' has no spaces and rgba()
     would add them). Every `exact` reaches a host prop verbatim but
     wkBarGlass's, which nothing reads at 1cb6498; it is kept so build(v1) can
     hand back T as it is. The first 23 are theme.js:58-84; the next five are
     raw rgba strings in you/verdicts.jsx that become tokens (§6.3); the last
     two are the web's calorie runway (.cal-runway: its hatching and its right
     edge, rack.css:1894-1895 at rack-v58), which native does not draw. */
  tint: {
    setDone:   { color: 'done',    a: 0.07 },
    setFlash:  { color: 'accent',  a: 0.28 },
    tagW:      { color: 'pYellow', a: 0.16 },
    tagF:      { color: 'pRed',    a: 0.16 },
    tagD:      { color: 'pBlue',   a: 0.16 },
    dropRail:  { color: 'pBlue',   a: 0.45 },
    dropAdd:   { color: 'pBlue',   a: 0.35 },
    pickSel:   { color: 'accent',  a: 0.08 },
    block:     { color: 'accent',  a: 0.03 },
    coachBase: { color: 'accent',  a: 0.14 },
    coachLow:  { color: 'accent',  a: 0.07 },
    coachHigh: { color: 'accent',  a: 0.38 },
    rowPress:  { color: 'lift',    a: 0.04, exact: 'rgba(255,255,255,0.04)' },
    pillBase:  { color: 'lift',    a: 0.05, exact: 'rgba(255,255,255,0.05)' },
    pillUp:    { color: 'good',    a: 0.16 },
    pillDown:  { color: 'bad',     a: 0.16 },
    pillWarn:  { color: 'warn',    a: 0.16 },
    zoneCut:   { color: 'pBlue',   a: 0.16 },
    zoneHold:  { color: 'pYellow', a: 0.18 },
    zoneGain:  { color: 'pRed',    a: 0.16 },
    dockGlass:  { color: 'rack',  a: 0.82, exact: 'rgba(20,22,26,0.82)' },
    wkBarGlass: { color: 'rack',  a: 0.9,  exact: 'rgba(20,22,26,0.90)' },
    backdrop:   { color: 'shade', a: 0.6,  exact: 'rgba(0,0,0,0.60)' },
    trajGood:     { color: 'good',   a: 0.18, exact: 'rgba(42,168,92,0.18)' },
    trajWarn:     { color: 'warn',   a: 0.18, exact: 'rgba(240,190,30,0.18)' },
    trajBad:      { color: 'bad',    a: 0.18, exact: 'rgba(214,37,43,0.18)' },
    reviewBg:     { color: 'accent', a: 0.07, exact: 'rgba(240,190,30,0.07)' },
    reviewBorder: { color: 'accent', a: 0.18, exact: 'rgba(240,190,30,0.18)' },
    runway:       { color: 'rack',   a: 0.55 },
    runwayEdge:   { color: 'rack',   a: 0.7 }
  },

  /* ---- type ----
     native T.text: the argument object each preset passes to type() today
     (theme.js:305-331), with the colour as a role. A preset with no colour
     takes type()'s default, chalk — the RN no-inheritance fix, never drop it.
     `mono` is not built by type(): it is { fontFamily, fontSize, color }.
     On the web these are CSS rules, and font sizes, tracking and
     font-variation-settings stay literal there (§5.1). */
  type: {
    body:     { size: 15, wdth: 100, wght: 400, lh: 1.45, color: 'chalk' },
    h1:       { size: 26, wdth: 78,  wght: 800, ls: -0.01, color: 'chalk' },
    h2:       { size: 18, wdth: 78,  wght: 800, ls: -0.01, color: 'chalk' },
    h3:       { size: 15, wdth: 78,  wght: 800, ls: -0.01, color: 'chalk' },
    eyebrow:  { size: 10, wdth: 88,  wght: 700, ls: 0.16, upper: 1, color: 'dim' },
    btn:      { size: 14, wdth: 92,  wght: 700, ls: 0.02, color: 'chalk' },
    btnLg:    { size: 16, wdth: 92,  wght: 700, ls: 0.06, upper: 1 },
    dockLbl:  { size: 10, wdth: 88,  wght: 600, ls: 0.07, upper: 1, color: 'dim' },
    fieldLbl: { size: 10, wdth: 88,  wght: 700, ls: 0.16, upper: 1, color: 'dim' },
    note:     { size: 12, wght: 400, lh: 1.5, color: 'dim' },
    statVal:  { size: 20, wdth: 108, wght: 800, lh: 1, tnum: 1 },
    statLbl:  { size: 9,  wdth: 88,  wght: 700, ls: 0.1, upper: 1, color: 'dim' },
    timer:    { size: 22, wdth: 112, wght: 800, ls: -0.01, tnum: 1 },
    kpiVal:   { size: 22, wdth: 108, wght: 800, ls: -0.01, lh: 1, tnum: 1 },
    headline: { size: 34, wdth: 112, wght: 800, ls: -0.02, lh: 1, tnum: 1 },
    youGreet: { size: 27, wdth: 100, wght: 800, ls: -0.02, lh: 1.05 },
    chip:     { size: 11, wdth: 92,  wght: 600, color: 'steel' },
    segBtn:   { size: 11, wdth: 92,  wght: 700, ls: 0.06, upper: 1, color: 'steel' },
    setInput: { size: 15, wdth: 100, wght: 700, tnum: 1, color: 'chalk' },
    mono:     { size: 12, color: 'chalk' },  // its fontFamily is face.mono
    // The running meta (a card's "last 7 days", a date, "Member since …") as
    // one preset, for a look that sets it in one voice. No v1 site spends it —
    // v1 sets each at its own literal — so v1's is note's arguments, and a
    // vibe without one takes its own note (index.js ROLES `or`).
    meta:     { size: 12, wght: 400, lh: 1.5, color: 'dim' },
    // Engine v3. The hero figure a headline look (vocab headline · solo) sets
    // alone at a site marked hero. No v1 site spends it — v1 names no such
    // look — so v1's is headline's arguments, and a vibe without one takes its
    // own headline (index.js ROLES `or`). v1 holds no `tag` and no `pill`:
    // their roles' default is null, every site keeping its own literal.
    hero:     { size: 34, wdth: 112, wght: 800, ls: -0.02, lh: 1, tnum: 1 }
  },
  // .load-num, "wide + heavy, stamped like a plate": type({ size, ...these }).
  // A function of the size on purpose (theme.js:278-296) — no size here.
  loadNum: { wdth: 118, wght: 800, ls: -0.02, lh: 0.95, tnum: 1 },

  /* ---- the face ----
     native: face(wdth, wght) is `${family}_${snap[wght] || round(wght/step)*step}`
     and ignores wdth (the package ships the weight axis only, so width
     collapses to 100 — theme.js:168-213, do not "fix" it in v1). The keys are
     the four static TTFs app/_layout.jsx loads; they must equal what face()
     returns. minLh is Archivo's hhea ascent+descent (878+210)/1000, so it is
     per family. web: the stacks as rack.css spells them; the @import stays in
     rack.css line 1, and is here for reference only. */
  face: {
    family: 'Archivo',
    keys: ['Archivo_400', 'Archivo_600', 'Archivo_700', 'Archivo_800'],
    snap: { 650: 700, 750: 800 },
    step: 100,
    width: 100,
    minLh: 1.088,
    // Width ranges drawn in a family of their own (native build(): the first
    // band holding a preset's wdth names its family, keys, snap, weights and
    // minLh). v1 has one family, so none.
    bands: [],
    mono: { ios: 'Menlo', android: 'monospace' },
    web: {
      font: "'Archivo', system-ui, -apple-system, sans-serif",
      mono: 'ui-monospace, monospace',
      importUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap',
      // The stacks a vibe sets its heads, its italic and its numerals in
      // (num is also what vibe.js prefetches for the Vibes card). v1 sets all
      // three in the one stack above, and has no italic of its own.
      display: "'Archivo', system-ui, -apple-system, sans-serif",
      italic: "'Archivo', system-ui, -apple-system, sans-serif",
      num: "'Archivo', system-ui, -apple-system, sans-serif"
    }
  },

  /* ---- radius ----
     Numbers are px on the web and pt on native; `round` is a web percentage.
     The first nine are native T.radius (theme.js:92-100). The web census at
     928a65e, border-radius values in rack.css + auth.css (116 declarations):
       var(--r-sm) 33 (+2 inside a compound), var(--r) 11, 999px 16, 2px 15,
       50% 15, 3px 5, 4px 5, 1px 4, and once each 18px, 5px, 10px, 9px (auth
       .badge), 0, '18px 18px 0 0' (.sheet), '0 0 2px 2px' (dock mark),
       '4px 0 0 4px' (.cal-fill), '2px 2px 0 0' (.tod-col i),
       '14px 14px 14px 4px' / '14px 14px 4px 14px' (.coach-bub),
       '0 var(--r-sm) var(--r-sm) 0' (auth .ob-tip).
     Every px in that list is one of these roles. */
  radius: {
    r: 12, sm: 8, sheet: 18, tile: 10, pill: 999, plate: 2, chip: 3, mark: 4, idx: 5,
    round: '50%', hair: 1, bubble: 14, badge: 9
  },

  /* ---- shadows ----
     web: box-shadow layers { x, y, blur, spread, color, a?, inset? } — no `a`
     means the solid colour (var(--x)), and [] is `none`. Every box-shadow in
     rack.css and auth.css at 928a65e is one of these.
     native: the five shadowColor sites, each { opacity, radius, x, y,
     elevation? }; the colour is chrome.shadow. Native's radius is NOT a
     consistent function of the web blur (26 for 26px, 25 for 50px, 14 for
     28px) — which is why both are kept rather than one derived. */
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
    // rings: box-shadows that draw an outline without taking layout space
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
    // Rings round the calorie bar's head and dashed target, for a page they
    // would vanish on (native: a border, index.js ROLES). rack-v58 draws
    // neither: none.
    calHead:    { web: [] },
    calTarget:  { web: [] }
  },

  /* ---- scrims and glass ----
     `tint` names the T.tint entry the fill is; `filter` is the web
     backdrop-filter, spelled as rack.css spells it; `webkit` says whether
     rack.css also writes it as -webkit-backdrop-filter. The dock and the
     workout bar have that twin and the sheet backdrop does not, so Safari
     before 18, which reads only the prefixed property, draws today's sheet
     backdrop unblurred. It is a fact about rack.css, not a vibe's choice
     (ROLES `fixed`): an engine that adds the twin to the sheet changes v1.
     Native blurs only the dock (expo-blur, chrome.blurTint) and draws the tour
     scrim with expo-linear-gradient from three legacy strings. */
  scrim: {
    sheet: { tint: 'backdrop', filter: 'blur(3px)', webkit: false },
    dock:  { tint: 'dockGlass', filter: 'blur(18px) saturate(140%)', webkit: true, native: { intensity: 40 } },
    wkBar: { tint: 'wkBarGlass', filter: 'blur(16px)', webkit: true },
    tour:  { dir: 'to bottom',
             stops: [{ color: 'rack', a: 0.55, at: 0 }, { color: 'rack', a: 0.94, at: 0.42 }],
             native: { exact: ['rgba(20,22,26,0.55)', 'rgba(20,22,26,0.94)', 'rgba(20,22,26,0.94)'],
                       locations: [0, 0.42, 1] } }
  },

  /* ---- native chrome ---- */
  chrome: {
    statusBar: 'light',      // <StatusBar style>, app/_layout.jsx:316 and ErrorScreen.jsx:76
    keyboard: 'dark',        // keyboardAppearance, 14 TextInputs (sign-in's two set none)
    blurTint: 'dark',        // the dock's BlurView
    shadow: '#000',          // shadowColor at the five shadow sites, verbatim
    // DateTimePicker: session.jsx:463 says themeVariant="dark"; weight.jsx:225
    // says nothing and takes the app-wide dark. v1 adds no prop to the second.
    datePicker: 'dark',
    camera: '#000',          // scan.jsx:93 behind the camera; web .scan-video (--video-bg)
    // The Text sites that name no Archivo face render in SF (glyph icons,
    // small meta labels, sign-in, the banners). v1 is NO fontFamily key at all
    // there — not undefined, not 'System'.
    systemFace: null,
    // Fixed at build or install time, listed so nobody hunts for them. No
    // vibe can change any of them at runtime, so every vibe holds v1's value
    // (ROLES `fixed`), and under a light vibe the launch stays graphite.
    //   appearance     app.json userInterfaceStyle
    //   launch         app.json expo.backgroundColor and
    //                  expo.splash.backgroundColor (package.json has no
    //                  expo-system-ui, so nothing sets the window colour at
    //                  runtime), and manifest.json background_color, the
    //                  installed web app's splash
    //   manifestTheme  manifest.json theme_color, read once at install —
    //                  not themeColor, the <meta> the web can change
    //   webStatusBar   index.html's status-bar meta (iOS reads it at launch)
    appearance: 'dark',
    launch: '#14161a',
    manifestTheme: '#14161a',
    webStatusBar: 'black-translucent',
    // The web sets no color-scheme today; setting one would change v1's native
    // form controls, so v1 is none.
    colorScheme: null
  },

  /* ---- native sign-in: never moved onto the theme, so its own set ----
     app/(auth)/sign-in.jsx, all 15 literals. The page behind it is `rack`. */
  signIn: {
    title:       '#fff',     // :79
    sub:         '#8b929c',  // :80
    label:       '#8b929c',  // :133 s.label
    link:        '#8b929c',  // :125 Forgot password
    placeholder: '#5a616b',  // :94, :107
    error:       '#ff6b6b',  // :113
    ok:          '#6fcf97',  // :114
    button:      '#2aa85c',  // :117
    buttonBusy:  '#2b6b45',  // :117
    buttonText:  '#fff',     // :121
    spinner:     '#fff',     // :120 ActivityIndicator
    fieldBg:     '#1c1f25',  // :135
    fieldText:   '#fff',     // :135
    fieldBorder: '#2a2e36'   // :137
  },

  /* native root banners, app/_layout.jsx — the text on the dev / guard bars.
     Their fills are pRed / pGreen already. */
  banner: {
    devText:   '#fff',   // :72
    guardText: '#fff',   // :92
    guardNote: '#fff'    // :93
  },

  /* ---- web channel tokens ----
     CSS cannot give a var an alpha, so every rgba() literal becomes
     rgba(var(--x-rgb), a) — the pattern .kpi already uses. name -> colour
     role, and the name IS the role (--p-blue-rgb is pBlue's channels in every
     vibe); the CSS text ('240,190,30') is generated from hexToRgb().
     pGreen has no rgba() of its own at rack-v58; V59 §5 E.1 names
     --p-green-rgb among the channels, so it is here for the engine. */
  web: {
    rgb: {
      rack: 'rack', shade: 'shade', lift: 'lift', accent: 'accent',
      pYellow: 'pYellow', warn: 'warn', pRed: 'pRed', bad: 'bad', danger: 'danger',
      pBlue: 'pBlue', pGreen: 'pGreen', done: 'done', good: 'good', pWhite: 'pWhite', steel: 'steel'
    },
    /* The rest of rack.css's 26 :root tokens, as spelled there. Carried so the
       whole :root is representable from this file; they are layout and motion,
       which §5.1 keeps literal — no vibe sets them. */
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

  /* ---- data tables, exact strings as the code has them ----
     These are the tables that bake hex into a style or an SVG attribute, so a
     token swap alone cannot reach them. Each source keeps its own table and
     its own case: the pinned pure modules are never edited, and their colours
     are mapped at the call sites. The three hex tables (groups, groupPlates,
     plates) FOLLOW a colour role entry by entry (index.js ROLES `follows`):
     in every vibe each entry is its role's colour, case aside, so web paint()
     (v1 hex -> var(--role)) and native T.group() (the table) can never show
     two colours for one group. The tables after them name roles outright. */
  // analytics.js PALETTE + groupColor()'s fallback — lowercase (web :615-619,
  // native src/pure/analytics.js:651-655, the same file).
  groups: {
    chest: '#d6252b', back: '#2e7fd9', legs: '#f0be1e',
    shoulders: '#2aa85c', arms: '#e8e5de', core: '#a8aeb8',
    fallback: '#8d939f'
  },
  // exercises.js GROUPS[g].color — UPPERCASE, and it stays uppercase. The call
  // sites keep their own `|| 'var(--dim)'` / `|| T.colors.dim`.
  groupPlates: {
    chest: '#D6252B', back: '#2E7FD9', legs: '#F0BE1E',
    shoulders: '#2AA85C', arms: '#E8E5DE', core: '#A8AEB8'
  },
  // PLATES[].c, in PLATES order: 45, 35, 25, 10, 5, 2.5 lb. A different set
  // from GROUPS that happens to share values — never merge them.
  plates: ['#d6252b', '#2e7fd9', '#f0be1e', '#2aa85c', '#e8e5de', '#a8aeb8'],
  // The same six groups in importer.js's import bar (:99-105), web only: it is
  // var()-based already, so it follows the roles as they are, and an unknown
  // group falls back to --knurl — a fill, so `grip` — where groups falls back
  // to steel and the GROUPS call sites to dim.
  importGroups: {
    chest: 'pRed', back: 'pBlue', legs: 'pYellow',
    shoulders: 'pGreen', arms: 'pWhite', core: 'pChrome', fallback: 'grip'
  },
  // The six-plate mark, in draw order: index.html's .auth-mark, access.js's
  // two gate marks, native Splash and the gate screens' Mark.
  mark: ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'],
  // One hue per subject: you.js C_* and SUBJECT_COLOR (:1434, `all` is
  // var(--chalk)), native you/bits.jsx C_* and SUBJECT_COLOR. Both have `all`.
  // An unknown subject is steel on both — you.js SUBJECT_COLOR[…] ||
  // 'var(--steel)', native verdicts.jsx SUBJECT_COLOR[…] || T.colors.steel —
  // which is `fallback`, as groups has its own.
  subjects: {
    fuel: 'pYellow', weight: 'pYellow', train: 'pBlue', steps: 'pWhite', water: 'pBlue',
    prot: 'pRed', carb: 'pYellow', fat: 'pBlue', all: 'chalk', fallback: 'steel'
  },
  // The KPI tile's corner tint. web: --kpi-rgb is the colour's channels and
  // rack.css holds the .14; `default` is .kpi's own --kpi-rgb (steel), web
  // only. native: the Kpi `tint` prop — alpha.yellow/.blue(0.14), and a raw
  // string for steps — painted as a flat corner block, not a radial gradient.
  kpi: {
    default: { color: 'steel', a: 0.14 },
    fuel:    { color: 'pYellow', a: 0.14 },
    weight:  { color: 'pYellow', a: 0.14 },
    train:   { color: 'pBlue', a: 0.14 },
    steps:   { color: 'pWhite', a: 0.14, exact: 'rgba(232,229,222,0.14)' }
  },
  admin: {
    // admin.js AI_SPLIT / native admin/sheets.jsx AI_SPLIT
    aiSplit: { aiPhoto: 'pYellow', aiPhotoText: 'pRed', aiText: 'pBlue', aiRecall: 'pGreen' },
    // FAMILIES, in order: where people go, how food gets in, training and the
    // rest, the shell (admin.js:71, native you/admin.jsx:77)
    families: ['pBlue', 'pYellow', 'pGreen', 'pChrome'],
    // The account-type pill. THE TREES DISAGREE: web maps a type to an
    // .adm-flag class (admin.js:726) and .lit is BLUE; native maps it to a
    // colour (admin/sheets.jsx:82) and pro/custom are YELLOW. Both kept.
    pill: {
      web:    { owner: 'on', pro: 'lit', custom: 'lit', trial: 'warn', locked: 'off', basic: '' },
      native: { owner: 'good', pro: 'pYellow', custom: 'pYellow', trial: 'warn', locked: 'bad', basic: 'dim' }
    },
    // web .adm-flag.<class> ink; its border is the same colour at .45
    flag: { on: 'good', off: 'bad', lit: 'pBlue', warn: 'warn' }
  },
  // The estimator's confidence dot (food.js CONF, native estimator.jsx CONF)
  conf: { high: 'good', medium: 'warn', low: 'bad' },
  // The set badge's letter, a colour role each: rack.css .set-idx.t-W/F/D's
  // color and native SetRow.jsx TINT's second entry. Its wash is tint.tagW/F/D.
  tagInk: { W: 'pYellow', F: 'pRed', D: 'pBlue' },
  // Small text in a data colour (under 18pt; under 14pt when bold) is inked
  // in the role this names; graphics and large text keep the role itself.
  // Every plate inks itself today, so v1's map is the identity.
  inkOf: { pRed: 'pRed', pBlue: 'pBlue', pYellow: 'pYellow', pGreen: 'pGreen', pWhite: 'pWhite', pChrome: 'pChrome' }
});
