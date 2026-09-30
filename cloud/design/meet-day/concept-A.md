# Meet Day, concept A: "The board"

V59 Phase D, experimental slot (`meet-day`), concept A, the research pick. Written 2026-09-29 by the concept-A agent. Nothing here is approved: it is a proposal for the two judges and for Micah.

**Screens that fall back to "same order, new shapes" (V59 §12.3, said first):** none of the seven that §12 composes. Every one of them has a rearrangement below with a proof it has to pass (§7.9). If any proof fails in Q, **that screen alone** falls back to same order, new shapes, and the others keep theirs. Every screen outside the seven is same order, new shapes by design: all sheets, Stats, Settings, the day sheet, the picker and routines, onboarding and the tour, water, the add-food sheets and the estimator, sign-in and the gates, and admin.

How to read this:
- **(computed)** means a script in `~/dev/vibes-night/tools/` worked the number out. §18 lists the commands. Colour numbers use track 4's library, `tools/colour/colour-lib.mjs`.
- **(request)** means the engine or the contract does not have it yet. Each request names its fallback, so the vibe still builds without it (§13).
- **(judgement)** means a design call no source makes for me.
- Research keys are SYNTHESIS's: C1–C30, R0–R10, and the track keys `[T1]`–`[T10]`.

---

## 1. Name and idea

- **Name:** Meet Day. **Feel line:** "The platform on meet day." (25 characters). **Tag:** "Experimental" (V59 §2).
- **The idea, in two sentences.** Rack becomes the scoreboard: a black board of square cells with 2px gutters and filled header bands, lamp-white condensed figures, and "current" shown by inverting a cell, never by a hue. Every motif restyles something already on screen: the set badge is an attempt box, done is a lit lamp, the plate strip is the loading chart, stat rows are board strips, records sit in the board's current-record cell, and the board re-groups each screen the way a scoreboard groups a lifter's numbers [T6 §2, §3.9].

This is angle 1 of PLAN §3.7. The board leads, and it rearranges the most:
- every card is a panel under a header band;
- all five of track 6's rearrangements are here;
- the session is one board grid;
- the dock is a board strip with the active cell inverted.

It is Iron Age's opposite pole, not a remix of it. Nothing here comes from a period: no serif, no photo, no ornament, no paper [T6 §2, §4].

---

## 2. Every token role (the v2 contract, in full)

This is the proposed body of `vibes/defs/meet-day.js`. It has every role `v1.js` has, key for key, plus every engine-v2 role (`index.js` ROLES). It invents no key: what the contract lacks is in §13 as a request.
- Every colour is 6-digit hex, and no tint carries an `exact` string.
- Where v1 splits `{ web, native }` (`colors.onDanger`), the split is kept with one colour on both sides.
- The contrast behind each colour is in §3.

```js
export default deepFreeze({
  id: 'meet-day',
  name: 'Meet Day',
  feel: 'The platform on meet day.',
  experimental: true,
  scheme: 'dark',
  icons: 'meet-day',          // vibes/icons/meet-day.js (§9)
  images: {},                 // no photo anywhere: photos are Iron Age's alone
  themeColor: '#07080a',      // the board; the web status text stays white (dark vibe)

  variants: {
    card: 'panel', youCard: 'panel', sectionHeader: 'banner', eyebrow: 'v1',
    statRow: 'board', btn: 'panel', chip: 'square', segmented: 'boxes', settingsRow: 'v1',
    sheetHost: 'full', sheetTitle: 'band', dock: 'board', screenHeader: 'v1',
    kpi: 'plain',             // 'board' once vocab grows it (request R4)
    youHero: 'v1', coachCard: 'panel', chart: 'board',
    headline: 'flap', field: 'square', note: 'v1', toast: 'square', listRow: 'ledger',
    setTable: 'panel', setRow: 'attempt', plateStrip: 'loaded', calCell: 'edge', fab: 'inverse',
    addTile: 'flat', sessionChrome: 'slab'
  },
  shape: {
    rule:    { ink: 'knurl', hair: 1, head: [2], place: 'above', sub: [2], total: [1, 2, 1] },  // total: the score card's double rule
    leader:  { ink: 'knurl', dot: 1.5, pitch: 4, min: 16 },
    band:    { fill: 'raised', ink: 'chalk', height: 30 },
    gutter:  2,
    keyline: { ink: 'chalk', width: 1 },     // the current-record cell
    lead:    { keyline: false }
  },

  colors: {
    rack:   '#07080a',  // scoreboard black: the board and every gutter (MD-1, C8)
    bar:    '#16181d',  // a panel / cell, the sheet, a field. MD-1's #111317 lifted: 1.13:1 off the board, so a 2px gutter reads
    collar: '#26292f',  // hairlines inside a panel; decorative only
    knurl:  '#70767f',  // control edges: 3.88 on bar, 4.38 on rack, 3.44 on raised
    chalk:  '#f5f0e3',  // lamp white: every word and figure (15.61 on bar)
    steel:  '#a8a295',  // secondary (6.99 on bar, 6.20 on the band)
    dim:    '#9097a3',  // tertiary (6.04 on bar); never under 4.5 anywhere it sits
    pRed:    '#ff5a3c', // chest, protein, gain; 45 lb   (track 4 MD plates, C6)
    pBlue:   '#4d97ff', // back, fat, water, training, cut, drop sets; 35 lb
    pYellow: '#ffe14d', // legs, carbs, fuel and weight, maintain; 25 lb
    pGreen:  '#3cc4a0', // shoulders, steps; 10 lb (a bluish green)
    pWhite:  '#f2f2f2', // arms, the steps subject; 5 lb
    pChrome: '#858c96', // core; 2.5 lb
    good: '#4be38a',    // the "green light": its own hue, apart from pGreen (C21)
    warn: '#ffe14d',
    bad:  '#ff5a3c',
    onYellow: '#07080a', onGreen: '#07080a', onPlate: '#07080a', white: '#07080a',
    pYellowPressed: '#d9d3c4', fallback: '#a8a295',
    // The accent is an inversion, never a hue (C5): lamp ground, board ink.
    accent: '#f5f0e3', focus: '#f5f0e3', accentPressed: '#d9d3c4', onAccent: '#07080a',
    danger: '#ff5a3c', onDanger: { web: '#07080a', native: '#07080a' },
    done: '#f5f0e3',    // a lit lamp
    onDone: '#07080a',
    well: '#07080a',    // the recess inside a panel: set inputs, chips, KPI wells
    knockout: '#07080a', inverse: '#f5f0e3',
    calMark: '#f5f0e3', // "the white head" (HUE_NAMED)
    raised: '#202329',  // the header band, the attempt box, a cell button (1.27 off the board)
    track: '#2a2d33',   // an unlit lamp, the empty part of a meter, the flap's top half
    grip: '#70767f',    // the grab handle (3.88 on the sheet), a toggle's off track, the unlit lamp's ring
    faint: '#9097a3',   // = dim: no fourth grey (never-do 5)
    onWarn: '#07080a',
    shade: '#000000', lift: '#ffffff',
    tileHero: '#202329', tileLit: '#1b1d22',   // native flat forms; addTile · flat draws neither
    band: null          // dark vibe: no status strip
  },

  tagInk: { W: 'pYellow', F: 'pRed', D: 'pBlue' },   // on the attempt box (raised): 12.09 / 5.08 / 5.39
  inkOf:  { pRed: 'pRed', pBlue: 'pBlue', pYellow: 'pYellow', pGreen: 'pGreen', pWhite: 'pWhite', pChrome: 'pChrome' },

  alpha: { yellow: 'pYellow', red: 'pRed', blue: 'pBlue', green: 'pGreen', ground: 'rack',
           accent: 'accent', danger: 'danger', warn: 'warn' },

  tint: {
    setDone:   { color: 'done',    a: 0 },     // no row wash: the lamp says done
    setFlash:  { color: 'accent',  a: 0.28 },  // v1's 600ms flash, in lamp white
    tagW:      { color: 'raised',  a: 1 },     // the attempt box ground; the letter carries the type
    tagF:      { color: 'raised',  a: 1 },
    tagD:      { color: 'raised',  a: 1 },
    dropRail:  { color: 'pBlue',   a: 1 },     // the drop set's 2px rail at full strength (6.08 on bar)
    dropAdd:   { color: 'pBlue',   a: 0.5 },
    pickSel:   { color: 'accent',  a: 0.10 },
    block:     { color: 'accent',  a: 0 },     // a lifting block is a band, not a wash
    coachBase: { color: 'accent',  a: 0.14 },
    coachLow:  { color: 'accent',  a: 0.07 },
    coachHigh: { color: 'accent',  a: 0.38 },
    rowPress:  { color: 'lift',    a: 0.05 },
    pillBase:  { color: 'lift',    a: 0 },     // no delta pills (R6.6)
    pillUp:    { color: 'good',    a: 0 },
    pillDown:  { color: 'bad',     a: 0 },
    pillWarn:  { color: 'warn',    a: 0 },
    zoneCut:   { color: 'pBlue',   a: 0.16 },
    zoneHold:  { color: 'pYellow', a: 0.18 },
    zoneGain:  { color: 'pRed',    a: 0.16 },
    dockGlass:  { color: 'rack',   a: 1 },     // the dock is an opaque board strip
    wkBarGlass: { color: 'rack',   a: 1 },     // the score bug is opaque
    backdrop:   { color: 'shade',  a: 0.65 },
    trajGood:   { color: 'good',   a: 0.18 },
    trajWarn:   { color: 'warn',   a: 0.18 },
    trajBad:    { color: 'bad',    a: 0.18 },
    reviewBg:     { color: 'accent', a: 0 },   // the PR card is a plain panel; its figure is the record cell
    reviewBorder: { color: 'accent', a: 0 },
    runway:       { color: 'rack',   a: 0.55 },
    runwayEdge:   { color: 'rack',   a: 0.7 }
  },

  type: {
    body:     { size: 15, wdth: 100, wght: 400, lh: 1.45, color: 'chalk' },
    h1:       { size: 30, wdth: 75,  wght: 700, ls: 0, color: 'chalk' },
    h2:       { size: 20, wdth: 75,  wght: 700, ls: 0, color: 'chalk' },
    h3:       { size: 16, wdth: 75,  wght: 700, ls: 0, color: 'chalk' },
    eyebrow:  { size: 13, wdth: 75,  wght: 700, ls: 0, upper: 0, color: 'steel' },  // in a band it takes shape.band.ink
    btn:      { size: 15, wdth: 88,  wght: 700, ls: 0, color: 'chalk' },
    btnLg:    { size: 17, wdth: 75,  wght: 700, ls: 0, upper: 0 },
    dockLbl:  { size: 11, wdth: 88,  wght: 600, ls: 0, upper: 0, color: 'steel' },
    fieldLbl: { size: 13, wdth: 88,  wght: 600, ls: 0, upper: 0, color: 'steel' },
    note:     { size: 13, wght: 400, lh: 1.5, color: 'dim' },
    statVal:  { size: 28, wdth: 62,  wght: 800, lh: 1, tnum: 1 },
    statLbl:  { size: 12, wdth: 88,  wght: 600, ls: 0, upper: 0, color: 'steel' },
    timer:    { size: 22, wdth: 62,  wght: 800, ls: 0, tnum: 1 },
    kpiVal:   { size: 30, wdth: 62,  wght: 800, ls: 0, lh: 1, tnum: 1 },
    headline: { size: 30, wdth: 62,  wght: 800, ls: 0, lh: 1, tnum: 1 },  // under 32: You's card figures take no flap
    youGreet: { size: 30, wdth: 75,  wght: 700, ls: 0, lh: 1.05 },
    chip:     { size: 12, wdth: 88,  wght: 600, color: 'steel' },
    segBtn:   { size: 13, wdth: 88,  wght: 700, ls: 0, upper: 0, color: 'steel' },
    setInput: { size: 15, wdth: 75,  wght: 700, tnum: 1, color: 'chalk' },    // 15 keeps v1's iOS zoom-on-focus
    mono:     { size: 12, color: 'chalk' },
    meta:     { size: 12, wdth: 100, wght: 400, lh: 1.5, color: 'steel' }
  },
  loadNum: { wdth: 62, wght: 800, ls: 0, lh: 0.95, tnum: 1 },

  face: {
    family: 'Archivo',
    keys: ['Archivo_400', 'Archivo_600', 'Archivo_700', 'Archivo_800'],
    snap: { 650: 700, 750: 800 },
    step: 100,
    width: 100,
    minLh: 1.088,
    mono: { ios: 'Menlo', android: 'monospace' },
    web: {
      font:    "'Archivo', system-ui, -apple-system, sans-serif",
      mono:    'ui-monospace, monospace',
      importUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap',
      display: "'Archivo', system-ui, -apple-system, sans-serif",   // v1's own variable Archivo at wdth 75
      italic:  "'Archivo', system-ui, -apple-system, sans-serif",
      num:     "'Archivo', system-ui, -apple-system, sans-serif"    // at wdth 62 / 800: 0 extra bytes
    },
    // Native has no width axis (theme.js:307): two of Archivo's own static cuts stand in.
    bands: [
      { max: 68, family: 'ArchivoExtraCondensed', keys: ['ArchivoExtraCondensed_800'], snap: {}, weights: [800], minLh: 1.088 },
      { min: 69, max: 80, family: 'ArchivoCondensed', keys: ['ArchivoCondensed_700'], snap: {}, weights: [700], minLh: 1.088 }
    ]
  },

  radius: { r: 2, sm: 2, sheet: 0, tile: 2, pill: 2, plate: 0, chip: 0, mark: 0, idx: 0,
            round: '50%', hair: 0, bubble: 0, badge: 0 },   // square board; only lamps, dots and the avatar stay round

  shadow: {
    peek:  { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    rest:  { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    toast: { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    fab:   { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 } },
    fabPressed: { web: [] },
    tourCard:   { web: [], native: { opacity: 0, radius: 0, x: 0, y: 0 } },
    calTick:    { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'rack', a: 0.55 }] },
    flame:      { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'accent', a: 0.35, inset: true }] },
    kpiDay:     { web: [{ x: 0, y: 0, blur: 0, spread: 1.2, color: 'knurl', inset: true }] },
    kpiDayOn:   { web: [] },
    kpiToday:   { web: [{ x: 0, y: 0, blur: 0, spread: 1.5, color: 'well' }, { x: 0, y: 0, blur: 0, spread: 2.5, color: 'steel' }] },
    kpiTodayOn: { web: [{ x: 0, y: 0, blur: 0, spread: 1.5, color: 'well' }, { x: 0, y: 0, blur: 0, spread: 2.5, color: 'chalk' }] },
    guideEaten: { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'knurl', inset: true }] },
    trajGood:   { web: [{ x: 0, y: 0, blur: 0, spread: 4, color: 'good', a: 0.18 }] },
    trajWarn:   { web: [{ x: 0, y: 0, blur: 0, spread: 4, color: 'warn', a: 0.18 }] },
    trajBad:    { web: [{ x: 0, y: 0, blur: 0, spread: 4, color: 'bad',  a: 0.18 }] },
    tourLit:    { web: [{ x: 0, y: 0, blur: 0, spread: 2, color: 'accent' }] },
    calHead:    { web: [] },     // the white head needs no ring on a dark track (9.50 / 7.50 / 9.99 on the zones)
    calTarget:  { web: [] }
  },

  scrim: {
    sheet: { tint: 'backdrop', filter: 'blur(3px)', webkit: false },
    dock:  { tint: 'dockGlass', filter: 'none', webkit: true, native: { intensity: 40 } },
    wkBar: { tint: 'wkBarGlass', filter: 'none', webkit: true },
    tour:  { dir: 'to bottom', stops: [{ color: 'rack', a: 0.55, at: 0 }, { color: 'rack', a: 0.94, at: 0.42 }],
             native: { locations: [0, 0.42, 1] } }
  },

  chrome: {
    statusBar: 'light', keyboard: 'dark', blurTint: 'dark', shadow: '#000000', datePicker: 'dark',
    camera: '#000000', systemFace: null,
    appearance: 'dark', launch: '#14161a', manifestTheme: '#14161a', webStatusBar: 'black-translucent',   // fixed: v1's
    colorScheme: 'dark'    // the web's own date and select controls go dark, like the board
  },

  signIn: {   // native sign-in only ever draws under v1 (the vibe is per account); v1's values, 6-digit
    title: '#ffffff', sub: '#8b929c', label: '#8b929c', link: '#8b929c', placeholder: '#5a616b',
    error: '#ff6b6b', ok: '#6fcf97', button: '#2aa85c', buttonBusy: '#2b6b45', buttonText: '#ffffff',
    spinner: '#ffffff', fieldBg: '#1c1f25', fieldText: '#ffffff', fieldBorder: '#2a2e36'
  },
  banner: { devText: '#07080a', guardText: '#07080a', guardNote: '#07080a' },  // on pRed 6.47, on pGreen 9.15

  web: {
    rgb: { rack: 'rack', shade: 'shade', lift: 'lift', accent: 'accent', pYellow: 'pYellow', warn: 'warn',
           pRed: 'pRed', bad: 'bad', danger: 'danger', pBlue: 'pBlue', pGreen: 'pGreen', done: 'done',
           good: 'good', pWhite: 'pWhite', steel: 'steel' },
    root: { dockH: '64px', safeTop: 'env(safe-area-inset-top, 0px)', topGap: '10px',
            appTop: 'calc(var(--safe-top) + var(--top-gap))', pad: '16px',
            ease: 'cubic-bezier(.22,.61,.36,1)', fast: '140ms', med: '240ms' }
  },

  groups:      { chest: '#ff5a3c', back: '#4d97ff', legs: '#ffe14d', shoulders: '#3cc4a0', arms: '#f2f2f2', core: '#858c96', fallback: '#a8a295' },
  groupPlates: { chest: '#FF5A3C', back: '#4D97FF', legs: '#FFE14D', shoulders: '#3CC4A0', arms: '#F2F2F2', core: '#858C96' },
  plates: ['#ff5a3c', '#4d97ff', '#ffe14d', '#3cc4a0', '#f2f2f2', '#858c96'],
  importGroups: { chest: 'pRed', back: 'pBlue', legs: 'pYellow', shoulders: 'pGreen', arms: 'pWhite', core: 'pChrome', fallback: 'grip' },
  mark: ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'],
  subjects: { fuel: 'pYellow', weight: 'pYellow', train: 'pBlue', steps: 'pWhite', water: 'pBlue',
              prot: 'pRed', carb: 'pYellow', fat: 'pBlue', all: 'chalk', fallback: 'steel' },
  kpi: { default: { color: 'steel', a: 0 }, fuel: { color: 'pYellow', a: 0 }, weight: { color: 'pYellow', a: 0 },
         train: { color: 'pBlue', a: 0 }, steps: { color: 'pWhite', a: 0 } },     // no corner glow
  admin: {
    aiSplit: { aiPhoto: 'pYellow', aiPhotoText: 'pRed', aiText: 'pBlue', aiRecall: 'pGreen' },
    families: ['pBlue', 'pYellow', 'pGreen', 'pChrome'],
    pill: { web:    { owner: 'on', pro: 'lit', custom: 'lit', trial: 'warn', locked: 'off', basic: '' },
            native: { owner: 'good', pro: 'pYellow', custom: 'pYellow', trial: 'warn', locked: 'bad', basic: 'dim' } },
    flag: { on: 'good', off: 'bad', lit: 'pBlue', warn: 'warn' }
  },
  conf: { high: 'good', medium: 'warn', low: 'bad' }
});
```

Where these values come from, and what changed from research:
- **MD-1, taken as research left it** [SYNTHESIS §5.7, §5.8; T4 GF-B]:
  - the board `#07080a`, lamp white, `steel`, `dim` and `good`;
  - track 4's plates;
  - `accentPressed` `#d9d3c4`.
- **Changed by this concept, and re-checked** (§3):
  - **`bar` `#111317` → `#16181d`.** At 1.08:1 off the board, a 2px gutter between two panels is ΔE00 2.9, and at arm's length the panels merge into one black field. At 1.13:1 the gutter is ΔE00 4.6, a little more than v1's own card step of 1.10. Every text ink still clears it (the lowest is `dim` at 6.04).
  - **`raised` and `track` are split from `collar`.** The header band sits a step above the panel, at 1.27:1 off the board. The unlit lamp sits one step above the band.
  - **`knurl` `#666c77` → `#70767f`,** so a control edge clears 3:1 on the band too (3.44). `grip` takes the same value, for the grab handle (decision c).
- **Kept equal on purpose:**
  - `warn` = `pYellow`, as in v1 and MD-1;
  - `done` = `accent` = `chalk` = lamp. Done and current are both "lit". Done is a lamp's shape and current is an inverted cell, so neither ever rests on colour.

---

## 3. Contrast and colour vision (computed, `mdA-colour.mjs`)

The script walks every text ink over every surface a look puts it on:
- the board, a panel, the band and attempt box, the unlit track;
- the inverted cell, and every fill that carries words;
- the flash and pulse washes;
- the flap's two halves.

It also walks every graphic that has to reach 3:1.

**Totals: 114 pairs checked, 0 failures.** The full table is in `design/meet-day/scratch-A/colour-report.md`, generated by the script.

### 3.1 Text (4.5:1)

| Ink | board `#07080a` | panel `#16181d` | band / attempt box `#202329` | unlit / flap top `#2a2d33` |
|---|---|---|---|---|
| chalk (lamp) `#f5f0e3` | 17.61 | 15.61 | 13.84 | 12.13 |
| steel `#a8a295` | 7.89 | 6.99 | 6.20 | 5.43 |
| dim / faint `#9097a3` | 6.81 | 6.04 | 5.35 | 4.69 |
| good `#4be38a` | 12.07 | 10.70 | 9.49 | — |
| bad / danger `#ff5a3c` | 6.47 | 5.73 | 5.08 | — |
| warn / pYellow `#ffe14d` | 15.39 | 13.64 | 12.09 | — |
| pBlue `#4d97ff` | 6.86 | 6.08 | 5.39 | — |
| pGreen `#3cc4a0` | 9.15 | 8.11 | 7.19 | — |
| pWhite `#f2f2f2` | 17.90 | 15.86 | 14.06 | — |
| pChrome `#858c96` | 5.90 | 5.23 | **4.64** (the lowest data pair) | — |

Ink on its own fill:
- board ink on the inverted lamp cell: **17.61**. This covers the chosen chip and segment, the dock's active tab, the primary button, the FAB, the current attempt box and the toast.
- on the pressed lamp `#d9d3c4`: 13.42;
- on `danger` (the swipe-to-delete panel): 6.47;
- on `warn` (native's trial banner): 15.39;
- on the six plate chips: 5.90–17.90.

Over the washes:
- lamp over the set flash's peak (lamp .28 on a panel): 6.66;
- over the coach pulse's peak (.38): **4.75**, the lowest text pair in the vibe;
- over the picker selection (.10): 11.97;
- over a pressed row (.05): 13.66.

Hero figures on the flap (large text, 3:1), in lamp or in their own zone colour: 4.46–13.84. The lowest is pRed on the top half.

### 3.2 Graphics (3:1)

- **Control edges:** `knurl` 3.88 on a panel, 4.38 on the board, 3.44 on the band.
- **Grab handle:** `grip` 3.88 on the sheet (decision c).
- **Focus, primary and the dock's inverted cell:** 15.61–17.61.
- **Lamps:**
  - a lit lamp is 17.61 against the well it sits in, and 12.13 against an unlit one, so the state is carried by brightness;
  - the unlit lamp's ring is 3.88 against the row.
- **Every plate and status colour as a mark:** 5.23–17.90 on a panel. As a meter fill against its empty track, the lowest is pChrome at 4.07.
- **The white head** on the cut, hold and gain zones: 9.50, 7.50 and 9.99.
- **Information only (structure, not signal):**
  - gutter against a panel, 1.13;
  - band against its panel, 1.13.

  The words and the figures carry every meaning. A gutter never does.

### 3.3 Colour vision (Machado 2009, severity 1, linear RGB; CIEDE2000)

| Group | Role | Normal | L* | Deuteranopia | Protanopia |
|---|---|---|---|---|---|
| chest | pRed | `#ff5a3c` | 60.7 | `#b2a036` | `#897b37` |
| back | pBlue | `#4d97ff` | 62.4 | `#488ffd` | `#66a0ff` |
| legs | pYellow | `#ffe14d` | 89.7 | `#ffe656` | `#f7dc37` |
| shoulders | pGreen | `#3cc4a0` | 71.5 | `#acaaa2` | `#beb79e` |
| arms | pWhite | `#f2f2f2` | 95.5 | `#f2f2f2` | `#f2f2f2` |
| core | pChrome | `#858c96` | 58.0 | `#878b96` | `#898c97` |

- **Minimum pairwise ΔE00:**
  - normal 19.01 (back/core);
  - **deuteranopia 14.09** (shoulders/core);
  - **protanopia 17.46** (shoulders/arms);
  - tritanopia 11.73 (back/shoulders; information only).

  All sit above the ≥ 12 bar, and match track 4's MD-1 figure of 14.1 [T4 GF-B].
- **Good against bad:** 71.77 normal, **13.86** deuteranopia, 25.63 protanopia. Warn against bad: 18.31 and 30.06. A lit lamp against bad: 28.47 and 35.68.
- **Nothing reads up or down by colour alone.** Every delta keeps its ↑ ↓ → and its sign (R2.6). A lamp is never red (§11).

### 3.4 The guard and the lineup

- **Neutral grounds** (OKLCH C < 0.015), so R3.1 governs them and the Tailwind guard does not:
  - board: C 0.005, zinc-950 at 0.45;
  - panel: 0.010, zinc-900 at 1.64;
  - band: 0.012, zinc-800 at 2.70;
  - track: 0.012, zinc-800 at 2.85.
- **The accent is the lamp, `#f5f0e3`** (C 0.018, amber-50 at 2.59). It passes R2.7 **only under the declared inversion exemption** (Q-P5). It is also only 6.0 ΔE00 from arms `#f2f2f2`, under R2.4's 10.
  - Both are the exemption's own point: the lamp is never read as a hue. "Current" is an inverted cell, and the data white is always labelled or placed.
  - The pressed lamp `#d9d3c4` is 5.90 from stone-300, so it clears the guard anyway.
- **Distance from the rest of the lineup** (ΔE00; ground / panel / accent):

  | Vibe | Ground | Panel | Accent |
  |---|---|---|---|
  | v1 | 3.65 | 2.47 | 26.39 |
  | Oxblood | 7.05 | 10.29 | 24.15 |
  | Ledger | 7.75 | 12.32 | 27.37 |
  | Navy | 16.74 | 11.63 | 20.79 |
  | every light vibe | 72 or more | | |

  **v1 sits closest.** So identity has to come from structure: gutters, bands, inversion, condensed figures, lamps and the regrouping. §15 is the silhouette argument.

---

## 4. Fonts

**One family: Archivo, v1's own face, pushed to the narrow end of its width axis** [T6 §3.4; C20].

| | Web | Native |
|---|---|---|
| Body, buttons, labels, the Coach card | v1's variable Archivo at wdth 88–100 | v1's four package files, `Archivo_400/600/700/800` |
| Heads, the greeting, set inputs (wdth 75, 700) | the same file at wdth 75 | **`ArchivoCondensed-Bold`**, face band 69–80 |
| Figures (wdth 62, 800) | the same file at wdth 62 | **`ArchivoExtraCondensed-ExtraBold`**, face band ≤ 68, also the picker face |
| Bytes added | **0** (v1 already requests `wdth 62..125`) | **2 TTFs, 72.8 KB** after subsetting |

### 4.1 The two native files (computed: `mdA-fontprobe.mjs`, `mdA-subset.mjs`, `t5-check.mjs`)

| File | Source (Google Fonts css2 instance of Archivo v25) | Original | Latin subset | PostScript | tnum |
|---|---|---|---|---|---|
| ArchivoExtraCondensed-ExtraBold | `https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q-EsJaRE-NWIDdgffTTtDRp8A.ttf` (css2 `wdth 62, wght 800`) | 111,172 B, sha256 `85847cc7…9bfa54e46` | **36,400 B**, sha256 `784467070b729bda1a15e87487a2dcfc9e2125083a04d28a4fa2b21b097cafb9` | `ArchivoExtraCondensed-ExtraBold` | every digit 432 |
| ArchivoCondensed-Bold | `https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q9osJaRE-NWIDdgffTT0zRp8A.ttf` (css2 `wdth 75, wght 700`) | 111,532 B, sha256 `02c3400e…f87c82d1d` | **36,380 B**, sha256 `69416d482f54068e037c512a0a15ec32817868abb59ae911013e6c2ef90dcfae` | `ArchivoCondensed-Bold` | every digit 482 |

- **Why Google's instances and not the Omnibus-Type upstream statics** (judgement):
  - they are cut from the same Archivo v25 the web draws, so web and native figures share one outline (the parity check, §13.5);
  - the upstream Condensed "Bold" is `usWeightClass` 680, not 700 (computed);
  - their PostScript names are unique, and never the package's `Archivo-ExtraBold` / `Archivo-Bold` (R4.5).
- **The subset:**
  - Google's css2 "latin" range;
  - plus U+2190–2193, because → is not in that range and the flat delta uses it;
  - plus U+2248 ≈, which Weight's maintenance figure carries, and U+2264–2265.
  - After subsetting, − → ↑ ↓ ≈ ± × · … are all present, and `tnum` survives.
- **Default digits are proportional** in both cuts ('1' is 365 against '0' at 429). So `tnum` is on at every figure: `fontVariant: ['tabular-nums']`, which native `type()` already bakes into every `tnum: 1` preset (theme.js:750).
- **Licence:**
  - OFL 1.1, "Copyright 2020 The Archivo Project Authors";
  - **no Reserved Font Name**: `tools/fonts/archivo/OFL.txt` line 1 names none;
  - google/fonts `METADATA.pb` says `license: "OFL"`.
  - `FONTS.json` records the css2 URL, the version ("Version 2.001"), both hashes and the OFL, per §14.
- **Glyph gaps:** ↳ ✓ ✕ ⋯ ⚙ ⚠ ✎ ▾ ▴ are missing from every cut, exactly as in v1's Archivo. The icon set draws ✕ ⋯ ✓ ↳ ✎ ⚙ ⚠ ▾ ▴ through the glyph keys (§9). × ‹ › − + ↑ ↓ → stay text, because Archivo has them. ⚠ and ⚙ inside prose stay text: that is copy.
- **Two families at most (R4.1):** one family.
- **Not on the AI-default or Claude-steered lists (R4.10).**
- **No monospace for figures (N19).**

### 4.2 Where each width lands on native

Native ignores `wdth` (theme.js:307). `face.bands` sends each preset to a cut:
- **≤ 68 → ExtraCondensed 800:** statVal, timer, kpiVal, headline, loadNum.
- **69–80 → Condensed 700:** h1–h3, eyebrow, btnLg, youGreet, setInput. v1's only literal wdth under 80 is 78, the ErrorScreen title (the Chalk survey), so ErrorScreen's title turns condensed too. That is harmless.
- **Everything else stays on v1's files at its own weight.** The web sets the same widths through `font-variation-settings`, so the two clients draw the same cut at every role. Every weight on the web goes through `font-variation-settings`, with **zero `font-weight` rules**.

### 4.3 The Coach card keeps Archivo on v1 metrics (decision d)

`coachCard · panel` changes only:
- the card's ground;
- its border, drawn in the ground's own colour so no edge shows;
- square corners;
- a band behind the header row that takes no layout.

It keeps the face, CARD_TYPE, padding 14, border 1, and 190 / 164. The goal and feel chips stay on T.fit as well.

### 4.4 Fit (computed: `mdA-fit.mjs`, harfbuzz with `tnum`, on the shipped subsets)

| Where | Size | Room at 320 / 390 | Widest real string |
|---|---|---|---|
| Stat strip cell (3 across a panel) | 28 | 75 / 98 | "1h 00m" 69.0 |
| KPI cell (2 × 2) | 30 | 123 / 158 | "12,480" 71.2 |
| Fuel's hero figure | 40 | 117 / 149 | "12,350" 94.9 |
| Steps' hero figure | 48 | 130 / 165 | "24,000" 113.9 |
| Top-bar clock slot | 22 | hugs its figure | "1:02:33" 57.3 |
| Set input (a 1fr column) | 15 | 55 / 90 | "1025.5" 39.8 |
| h1 | 30 | 188 / 258 | "September 2026" 186.5 |

- Every figure is narrower than v1's at its own site: wdth 62 is 0.55× the width of v1's 118.
- A band head that runs long **wraps, and the band grows**. It never clips or ellipsises. "Compared with sessions like this" is 159 in a 150 room at 320 only when a card has meta beside it, and that card has none.
- "Good afternoon," at 30 condensed (183.9) is still narrower than v1's 27 / wdth 100 greeting at 320, so it wraps no more often than v1's does.

---

## 5. Shape language

- **Square.**
  - Panels, bands, buttons, chips, segments, fields, the sheet top, the FAB, the toast and the attempt box: radius 0–2.
  - **Only lamps, dots and the avatar are round.** A round thing on this board is a light or a face.
- **Gutters, not borders.** Panels in a section butt together on 2px of board. A board strip divides a panel into cells with 2px board gutters that run to the panel's edges (§6, statRow). Nothing has a 1px card border [T6 §3.10].
- **The header band.**
  - Every card's head row is a 30px `raised` band: the title left, meta and ⋯ right.
  - A section's title is a 34px band in `h3`.
  - A section is **one board**: its band, then its panels 2px apart. Sections are 24 apart on the bare board.
- **Condensed tabular figures, lamp white.**
  - One numeral treatment: wdth 62 / 800, `tnum`.
  - At 32px and up the figure sits in a **split-flap cell**: two flat halves, `track` over `raised`, meeting at 50% with a 1px board seam across the figure's waist. It is a hard stop with no blend (C22).
  - Under 32 the figure stands bare.
- **Inversion is the only emphasis.** Primary, chosen, current, today, the active tab: lamp ground, board ink. No hue ever says "this one" [C5].
- **The lamp.** A 12px disc:
  - lit in `done` with a 6px glow, the vibe's only glow (R7.1);
  - unlit in `track` with a 1px `grip` ring.

  One lamp per done thing. Never red, never three in a row as one unit [T6 §3.1].
- **Rhythm.** Three vertical steps by relationship: **2** (cells within a board), **12** (inside a panel), **24** (between boards). Panel padding 14, the same as v1, so no content reflows.
- **Motion.** None added. v1's 140 / 240 ms ease-out, the set flash and the coach pulse stay. The flap, the lamps and the segments are static.

---

## 6. Every block in the vocabulary (VOCAB order, all 29)

| Block | Look | What Meet Day draws |
|---|---|---|
| card | `panel` | `bar` ground, no border, square, 2px board gutters between panels; the head row a 30px band (`raised`, `chalk` words in `eyebrow` type, meta in `meta` type in steel, ⋯ right). **Fuel's empty meal card is only its band**: one line, as v1 keeps it. |
| youCard | `panel` | As card. Wins / Improve: a **3pt rule under the band** in `good` / `warn` replaces v1's 3pt left stripe (R6.4). "Doing well" / "Could improve" stay in the band's words. |
| eyebrow | `v1` | The type role does the work: 13pt, wdth 75 / 700, **sentence case as authored**, `steel`; in a band, `chalk`. **No caps anywhere in the vibe**, so "kcal left today" is never uppercased (N15) and no Q-Q1 caps exception is needed. |
| sectionHeader | `banner` | A full-width 34px band with the title in `h3` (16, 75 / 700, chalk), left. v1's hairline becomes the band. The board below starts 2px under it. |
| screenHeader | `v1` | The eyebrow (13 condensed, steel) over the h1 (30, wdth 75 / 700). The nav buttons keep their 34 / 38 and their place: square cells on `raised`, glyphs in chalk. |
| sheetHost | `full` | Edge to edge, square top corners, a 2pt `knurl` head rule along the top edge. The grab handle is 36 × 4 in `grip` with the knurl hatch drawn in lighter lines only, so every pixel stays ≥ 3:1 (decision c). Backdrop: shade .65 plus v1's 3px blur. Heights, dismissal and the keyboard behave as in v1. |
| sheetTitle | `band` | The h2 (20, condensed bold) inside a band drawn to the sheet's edges; its eyebrow stays above it, floating, in steel. |
| statRow | `board` | One board strip. **Inside a panel it runs to the panel's edges and cuts the panel into cells with 2px board gutters** (request R6). On the page (Train, Weight, the recap) it spans the content width. Value 28 condensed tabular in its own colour where the caller gives one; label 12 sentence case steel under it. No cell has a border (R6.3's board strip). Mini stats are the same, smaller (statVal at the site's size). |
| kpi | `plain` → `board` (R4) | Asked for: the 2 × 2 tiles as four board cells running to the card's edges, no corner tint, the delta as bare signed text with its arrow in good / bad / warn (the pill tints are 0). Value 30 condensed; "last week …" in 12 steel; a 2pt sparkline with no area and no glow; seven round day dots, today ringed. Until R4 lands: `plain`, the tile without its corner tint. That tile keeps v1's 1px `collar` edge (`#26292f`, decorative), the one 1px border left in the vibe, and R4 removes it. |
| headline | `flap` | At 32pt and up, the flap cell described in §5; the figure keeps its colour role (Fuel's zone colour, the water blue). Under 32 it stands bare. **Flaps, by where they fall:** Fuel's summary (40), the water total (34), Weight's maintenance (32), Steps' hero (48). You's card headlines are 30, so none. |
| chip | `square` | Square, on the well, a `collar` edge (decorative: the chip has words). Chosen = inverted. The 44-tall chips stay 44. |
| segmented | `boxes` | Joined square cells on `raised`, 1pt board rules between; chosen = inverted. Sentence case 13. |
| btn | `panel` | Primary = **the lit panel**: lamp ground, board words, square, with no glow. Plain and ghost = a `raised` cell with chalk words and no border. Danger = a square 1.5pt danger keyline with danger words. Large: 17 condensed bold, sentence case. Press scale .97; disabled .4. |
| field | `square` | Square, a `knurl` border (3.88), the well inside cards and the panel in sheets; focus turns the border lamp. Labels 13 sentence case steel. |
| note | `v1` | 13pt `dim` (6.04 on a panel), line-height 1.5. |
| toast | `square` | An inverted strip piece: lamp ground, board words, square, no shadow, 16 above the dock. |
| settingsRow | `v1` | v1's rows in Meet Day's tokens: `collar` rules between rows, label 14 chalk, value 12 steel, the › chevron in steel. Settings is a sheet, and a sheet stays calm. |
| listRow | `ledger` | Name … value rows get a drawn `knurl` leader, and the value alone at 800. **Record rows** (the recap's PR hits, Stats' PR rows, You's Strongest lifts) draw that value in **the current-record cell**: a 1px lamp keyline, `shape.keyline` (request R7). Other rows draw as plain. |
| setTable | `panel` | The exercise card as a panel. Its head is a 34pt band holding the 4 × 30 group tag (data colour), the name (16, wdth 75 / 700) and ⋯. Then the "Last …" line in steel. Then the column heads (Set · lb · Reps · e1RM, 12 sentence case steel) on a `raised` sub-band. A lifting block is a band ("Block N", its check, Duplicate, ✕) over its cards, closed by `shape.rule.total`. **It does not inset its cards**, so the grid stays aligned (§7.7). |
| setRow | `attempt` | Rows parted by 2px board gutters. **The attempt box:** 28 × 28, `raised`, the figure or W / F / D in `tagInk`. **The current set** (the session's first set not done, derived and never stored) is the **inverted box**: lamp ground, the letter or number in board ink whatever its type. The button keeps v1's 30-wide cell as its hit area. Inputs: square wells with a 2px lamp focus outline. e1RM at 11 (v1's 10 raised to the floor). **The check:** v1's 30 × 30 box with its 1.5pt knurl edge, holding an unlit lamp; done lights it (the `check` glyph, §9) with the 6px glow, in place of v1's green fill and row wash. Drops keep v1's indent (the box shifted 10) and a 2px pBlue rail. The flash and the coach pulse are v1's. |
| plateStrip | `loaded` | **The loading chart.** Beside the same "Per side" and `n×w` chips (on their plate colours, onPlate figures), the plates are drawn edge-on: a 6px chrome sleeve stub, then heaviest innermost, each plate drawn once per count. Heights are Ø/450 × 36 (45 → 36, 35 → 32, 25 → 26, 10 → 18, 5 → 15, 2.5 → 13), widths are max(5, thickness/3), with 1px board gaps. The 5 and 2.5 are edged in `grip`, and there is **no collar**. It is exactly `renderPlates`' list, never a second calculation [T6 §3.5]. |
| calCell | `edge` | Seven columns on 2px gutters. A trained day is `raised`, an untrained day a panel, and pad cells have no ground. Plates are edge-on slivers, 3 × 10 side by side, at most four. **Today is its day number in an inverted box**: an 18 × 16 lamp tab with a board figure at 800. That is inversion plus weight, never colour alone. |
| chart | `board` | Square-topped columns 2 apart. The unfinished day is **hatched** in the knurl pattern (engine v2 already puts `vibe-hatch-*` in the page for `board`), a shape cue. Lines are 2pt in their own colour ("the yellow line" stays yellow) over an **LED dot fill** under the line only (R5; fallback: no area). There is no end glow. Meters are square-ended 6px on `track`, with a 2px lamp tick at the target. **Rings become 10-cell segmented bars** (R5). The heat strip is square cells on 2px gutters, and donuts get square caps. The calorie meter keeps v1's zone washes, lamp head, ticks and dashed target, and its named hues. |
| dock | `board` | Five `bar` cells on 2px board gutters, opaque. **The active cell is inverted**: lamp ground, board icon and label. The rest have steel icons and 11pt labels. v1's 26 × 2 mark goes, because the inversion is the cue. Height, order, words and tour ring are v1's. |
| fab | `inverse` | "Log food" as a lit square: lamp ground, board + and words (15 condensed bold, sentence case), no shadow, at v1's place and size. Pressed shows `accentPressed` and scale .955. |
| addTile | `flat` | No washes and no border: tiles on the well. The Photo tile is marked by its lamp icon well with a board icon. Lit tiles draw their icon well and "ai" tag on `raised` (the tag's steel is 6.20). The tag keeps v1's 8.5pt literal (§16). |
| sessionChrome | `slab` | **The score bug** (§7.7). Square slabs on `bar`, slots parted by 1pt board rules. The running clock is the inverted slot (lamp ground, board figures, timer 22 condensed). The rest pill is a slab: [time inverted] [+30] [Skip]. The peek bar is [name] [clock] [Resume as the lit panel]. The rest line keeps 3pt, in `done` (lamp) or `danger` when over. There are no shadows. |
| youHero | `v1` | The avatar stays round (52, `raised`, initial in chalk). "Good evening," / "Micah" is 30 condensed bold, **both lines lamp**: the accent is lamp, so the name can no longer be a different colour (N17 fixed for free). The gear is a 36 square `raised` cell. The since-line joins the hero (§7.1). |
| coachCard | `panel` | See §4.3. The band holds the bubble, COACH and the lock in lamp. The caution line stays in `warn`, and COACH ME stays authored caps. |

---

## 7. The composition: what the board rearranges

Engine X (§12.1) gives each screen's top-level blocks names. The vibe supplies an order and a grouping, and v1 is today's order with no grouping. Everything below is that data for Meet Day. The contract has no `compose` field yet (request R1), so it is written here as the object X would read.

**Rules the composition keeps on every screen:**
- **Nothing is added, removed or hidden.**
- **Every control keeps its handler, accessible name and state.**
- **The dock is never touched.**
- **Merges happen only where two strings are identical,** tested by string equality at render and never by id.
- **Fixed boxes stay fixed:** the Coach card, the dock, the set columns.
- **Lists that are data keep their data order:** exercises, meals, entries, rows.

```js
compose: {
  you:     { order: ['hero', 'since', 'coach', 'doing', 'goal', 'week', 'noticed', 'trends', 'review', 'app'],
             join:  [['hero', 'since']],
             merge: ['goal', 'noticed', 'review'],          // a section band with its only card's head, strings equal
             within: { 'trends.weight': ['headline', 'stats', 'chart', 'legend'] } },
  workout: { order: ['header', 'dow', 'grid', 'monthStats', 'legend', 'weekVolume', 'coach', 'start', 'split', 'statistics'],
             join:  [['dow', 'grid', 'monthStats']] },
  food:    { order: ['header', 'summary.count', 'summary.macros', 'meals', 'water', 'micros', 'fab'],
             split: { summary: ['count', 'macros'] }, join: [['summary.count', 'summary.macros']] },
  weight:  { order: ['header', 'stats', 'log', 'chart', 'tod', 'tdee', 'recent'], join: [['stats', 'log']] },
  steps:   { order: ['header', 'today', 'streak', 'trend', 'stats', 'consistency', 'weekdays', 'recent'],
             join:  [['today', 'streak']], within: { today: ['figures', 'bar', 'controls'] } },
  recap:   { order: ['hero', 'feel', 'prs', 'milestones', 'firsts', 'whatYouDid', 'totals', 'compared', 'done', 'saveRoutine', 'seeStats'],
             join:  [['whatYouDid', 'totals']] },
  session: { bar: ['clock', 'name', 'coachChip', 'calendar', 'finish'],   // v1: [name over clock] …
             exercise: ['head', 'prev', 'columns', 'rows', 'plates', 'hint', 'actions'],  // v1: … rows, hint, plates …
             grid: true }                                     // cards butt; blocks do not inset
}
```

### 7.1 You

| v1 order | Meet Day | Why |
|---|---|---|
| hero | **hero + since-line** (joined) | The lifter's name card is one board row: name, date, member since. The Coach card then sits straight above the first board. On native the since-line is already inside `Hero`, after `children` (the Coach card, `Hero.jsx:46`), so only the order of those two changes. |
| coach | coach | Unchanged: the lead, fixed at 190. |
| since | (in the hero) | |
| How you're doing (section) + Doing well + Could improve | one board: band, panel, panel | The titles differ, so there is no merge. |
| Goal (section) + card "Goal" | **one band "Goal"**, then its panel | **Identical strings** (`you.js:599` and `:1517`), so they merge. The band carries the card's meta ("losing") and its ⋯. |
| This week + "Against last week" | board: band, panel | The titles differ. KPI cells as §6. |
| Rack noticed (section) + card "Rack noticed" | **one band** | Identical (`:608`, `:1595`). |
| Trends: Body weight, Against your targets, Training, Steps \| Water | one board | **Within Body weight**, the stat strip (trend today · 7-day avg · lb swing) moves up from the card's foot to sit under the headline. The figures come first and the chart after, as on a board. **Within Training**, Strongest lifts becomes a scoresheet: name and "310 × 5 · Sep 23" left, the best figure right in the record cell, a 6px square meter under the name. **The Steps and Water pair**: each ring becomes a 10-cell bar (§7.8). |
| Weekly review (section) + card "Weekly review" | **one band** | Identical (`:623`, `:1611`). The "Next week" callout becomes a 2px lamp top rule with no box: the callout container role. |
| App | App | |

### 7.2 Train (the calendar)

v1 order: header · dow · grid · legend · month stats · Last 7 days — working sets · Coach (tight) · Start workout · Routines | Exercises · Statistics (`workout.js:391-545`).

Meet Day moves **the month stats (Sessions · Volume lb · Minutes) from after the legend to directly under the grid**, joined on a 2px gutter. The weekday strip, the day cells and the totals row become one board, a scoresheet with its total row. The legend follows the board. Everything else keeps its order, so Coach stays directly above Start workout, as the code intends (`:473-481`).

### 7.3 Fuel (the day)

v1 order: header · summary · Breakfast · Lunch · Dinner · Snacks · water · micros · FAB (`food.js:512-551`).

Meet Day **splits the summary into two panels on a 2px gutter**:
1. **The count:** the ⋯ (the bar guide), the 350 flap, "kcal left today", "1,950 eaten · target 2,300", the calorie meter and its line.
2. **The macros:** Protein, Carbs and Fat as a three-cell board strip. Each cell has the name (12 steel), "142/200" (20 condensed), and a square 6px meter with a lamp tick at its target, in the macro's plate colour.

The meals, the water, the micros and the FAB keep their order.

### 7.4 Weight

v1 order: header · log (input, Log, Weighed earlier?, note) · headline strip (Latest lb · 7-day avg · lb / week ✓) · chart · time of day · maintenance · recent (`weight.js:71-222`).

Meet Day **swaps the log and the strip, and joins them**. The reading comes first (the board's "BD/WT" row), and 2px under it the log panel where he enters the next one. With no weigh-ins yet the strip does not exist, and the log panel leads as in v1. The Log input stays in the first viewport at 320 × 568: it is about 180pt down. **This is the one rearrangement that moves a primary input.** It is Micah's to veto (§14), and vetoing it drops only this swap.

### 7.5 Steps

v1 order: header · today · trend · stats · streak · consistency · by day of week · recent (`steps.js:148-177`).

Meet Day:
- **Within today**, the ring's two words leave the ring:
  - the day's figure (6,000) becomes the panel's hero, 48 condensed in its flap cell;
  - "to go / 2,000 / steps / entered by hand" sit beside it as in v1;
  - the ring becomes a 10-cell bar across the panel, with "75% of 8k" at its right end, unchanged;
  - +500 · +1k · +2.5k · Set total follow as before.
- **The streak card moves up** to join today on a 2px gutter. The run it reports is today's run.
- The trend's range chips stay directly above the stats card they control.

### 7.6 The workout summary (the recap)

v1 order: hero · How did that feel? · PRs · milestones · first time · totals strip (Duration · Volume lb · Working sets) · What you did · Compared with sessions like this · Done · Save as routine · See statistics (`workout.js:2052-2217`).

Meet Day **swaps the totals strip and "What you did", and joins them**. The exercise list reads as the score card's lift rows, then `shape.rule.total` (the double rule), then the totals strip as its total row. The feel card stays second, where the code puts it on purpose (`:2071-2073`). PR figures sit in the record cell.

### 7.7 The live session

- **The top-bar zone.** It is the same bar, sticky at the top, with the same controls left to right. **Its left column swaps:** v1 draws the name input over the clock. Meet Day draws **the clock first, as the inverted slot**, with the name input under it in 13 steel. The clock is what you glance at, and a score bug leads with it. The Coach chip (38), the calendar cell (38) and Finish (the lit panel) follow unchanged. In an edit, the date · duration line takes the clock's slot, not inverted, because nothing is running.
- **The exercise-card stack stays in order, directly under the bar.** Exercises are never reordered: the done-flash finds its row by DOM index (`document.querySelectorAll('.ex-block')[exIdx]`, `workout.js:1372`), and the order is the workout's data. What changes is that **the stack becomes one board grid**:
  - cards butt on 2px gutters instead of 12;
  - every card has the same side padding;
  - a lifting block draws a band over its cards instead of insetting them in a keyline.

  So the Set · lb · Reps · e1RM · ✓ columns (30 / 1fr / 1fr / 42 / 38) fall at the same x from the first set to the last. Each card keeps its own column-head row: the words stay.
- **The plate strip moves up one place:** from after the hint line to directly under the last set row, as the grid's loading row. When it appears (a barbell at 45 lb or more), it pushes down only the hint and + Set, as v1's pushes down + Set. Nothing above the row being edited moves. **It never moves above the rows**: appearing mid-entry, it would shift the inputs under the thumb.

### 7.8 Rings into segmented bars (You's pair, Steps' today)

- **Ten square cells** on 2px gutters, in the ring's own colour, and `good` at or past the goal:
  - on You, the steps subject's white (pWhite) and the water blue (pBlue);
  - on Steps, pGreen.
- **The fill is exact, never rounded.** The lit length is the fraction the ring drew: the same clamp, `min(1, frac)`. The cell the fraction ends in is lit to its fraction by a hard stop, so 87% shows 8 whole cells and the ninth at 70%.
- **Steps' over-goal second arc** (pYellow, `min(1, frac − 1)`) draws as a second layer over the first, exactly as the ring overlays it.
- **The words are the ring's own:** "87%" and "of goal", and "75% of 8k". They sit above the bar's right end.
- **On the web the pinned ring's SVG is restyled, never rewritten.** Its text elements stay the words shown, its arcs hide, and the cells are drawn from a `--frac` custom property the call site sets (request R5). v1 reads no such property.

### 7.9 What each screen must prove before its rearrangement ships (for Q)

For each of the seven, rendered in v1 and in Meet Day from the same fixture:
1. **Controls:** the same multiset of controls, by role, accessible name and handler.
2. **Text:** the same multiset of text, except that each merged pair loses exactly one copy of a string equal to the one kept. In a merge, the band is the card's heading for assistive tech.
3. **Reach:** no control under the dock or the FAB at 320 and 390.
4. **Order-dependent code paths untouched:**
   - the session flash's DOM index;
   - You's scroll restore;
   - the tour's targets, which are the dock;
   - native Hero's children.
5. **v1 stays identical to the pixel** (§7.1 harness, 0 / 0).
6. **A round trip holds:** switching into Meet Day and back mid-workout loses nothing.

A screen that fails any of these renders same order, new shapes, and only that screen.

**Risk, lowest first:**
- Train's swap;
- the recap's swap;
- the session grid and plate row;
- the since-line;
- Steps' streak;
- Fuel's split;
- the Body weight strip;
- the three merges (Q-Q1);
- Weight's swap (§14).

---

## 8. Every other screen (same order, new shapes)

Everything below draws in the §6 looks. Deep vibes must cover the screens people forget, and each is listed with what it does here:
- **Sign-in and the gates (web only; native stays v1).** The auth box is a panel under a band, and fields are `square`. The six-plate mark keeps the plates in Meet Day's hues.
- **Onboarding (8 steps) and the tour.**
  - Choice cards (`.ob-choice`) are chosen by **inversion** as well as by v1's border, which fixes their colour-only cue.
  - Step kickers are the eyebrow and titles the h1.
  - The tour card is a panel (`T.cardSkin()`), and the tour ring is the lamp.
- **The Coach sheet, the live chip and the nudge.**
  - The Coach sheet is `full` with `band` titles.
  - The live chip is a slab slot.
  - The nudge (Coach's quiet line in the exercise card) is **the callout**: a 2px lamp top rule with no box, at the hint line's exact height.
- **The add-food sheets, the estimator, the library, meals and the barcode.** Add tiles are `flat`. Library and meal rows are `ledger`. The estimator's AiWarn box carries the neutral `spark` (§9) in `warn`. The estimate total sits over `shape.rule.total`.
- **Water.** The vessel is v1's bottle. The level stays linear in the day's fraction (R1.4). The total is 34 in its flap. The presets are `raised` cells.
- **The rest pill and the peek bar:** slabs (§6).
- **Toasts:** `square`.
- **The Vibes sheet.** The tile rules are scoped `.vibe-in[data-vibe="meet-day"]` (decision e). The sample card is a flap cell with "315" (§17).
- **Stats:** its 3 × 3 strips as board strips, rank and PR rows as `ledger` with record cells, charts as `board`.
- **Settings:** `full` / `band` sheets and `banner` sections. Rows stay v1's.
- **The owner-only admin:** legible in the same tokens, borrowing `#view-you`.

---

## 9. Icons: `vibes/icons/meet-day.js`

**The style: v1's own geometry, re-cut for a square board** (judgement).
- Every one of v1's 18 icons keeps its path data. The cut goes to **`linecap: 'square'` and `linejoin: 'miter'`**, the dock's stroke goes to **2.0** (from 1.9), and other sites keep the stroke they fix.
- It is Rack's own hand-drawn set in a machined grammar, not an imported library (D15). It moves the set off the Feather-like round-cap grammar (A20) without redrawing what already reads at 22pt.
- The dock's identity comes from the inverted cell, not from new pictograms.

**`spark`, the neutral mark (R8.8, decision a).** The unlit lamp:
- `circle cx 12 cy 10 r 5.5` + `path M12 15.5V19` + `path M8.5 20h7`, at stroke 1.6;
- it reads as a bulb symbol at 16px.
- It sits beside "Photo and Describe are off…" and "…need the estimator connected". An unlit lamp is "off", so it says what the sentence says.
- It is not a star, sparkle, asterisk or bolt.

**Glyphs** (drawn through `glyphs.<name>` at every site the contract lists; stroke 2.0, square caps, mitred):

| Key | Char | Drawing |
|---|---|---|
| `check` | ✓ | **the lit lamp**: `circle cx 12 cy 12 r 4.5` at stroke 9, a solid 18-unit disc (12px in a 16px glyph). It stays stroke-only, so both renderers draw it without a fill. Sites: the set check, the block check, "✓ At goal", native's food and verdict ticks. The accessible name stays "✓" (`vibe.js glyphed`). |
| `close` | ✕ | `M6 6l12 12M18 6L6 18` |
| `more` | ⋯ | three LED squares: `M5.5 12h1M11.5 12h1M17.5 12h1` at stroke 3 |
| `drop` | ↳ | `M7 5v9h10`, with its head `M14 11l3 3-3 3` |
| `edit` | ✎ | `M5 19h3.5L19 8.5 15.5 5 5 15.5z`, `M13 7.5l3.5 3.5` |
| `gear` | ⚙ | = `icons.gear` re-cut (native Fuel's ⚙ button) |
| `warn` | ⚠ | `M12 4L21 20H3z`, `M12 10v4`, `M12 16.5v1` |
| `expand` / `collapse` | ▾ / ▴ | `M7 10l5 5 5-5` / `M7 14l5-5 5 5` |
| `prev` `next` `back` `go` `dismiss` `minus` `plus` `up` `down` `flat` | ‹ › ‹ › × − + ↑ ↓ → | `null`: they stay text, because Archivo has every one of them |

- **The vessel:** v1's.
- **Ornaments / tailpieces:** none. A board has no fleurons.

---

## 10. Textures (code only; each earns its place, or it is out)

| Texture | Where | Recipe |
|---|---|---|
| Split-flap seam | hero figures at 32pt and up only | Two flat halves (`track`, `raised`) and a 1px `rack` seam at 50%. Hard stops, no blend (C22). Native: two Views and a 1px View. It is under the figure, never under body text. |
| Knurl hatch | the unfinished day's column; the grab handle | The engine-v2 `vibe-hatch-<token>` patterns (45°, pitch 2.75, line 1) on the web; react-native-svg `<Pattern>` on native. On the handle, lighter lines only (see §6 sheetHost). |
| LED dot matrix | under line charts, clipped to the area under the line | 1px dots on a 4px pitch in the line's own colour at .22 (request R5). |
| Lamp glow | lit lamps only (not the primary, not the FAB) | 6px, `done` at .45 (request R3). The only glow in the vibe (R7.1). |

- **Rejected:**
  - **the rubber-floor fleck** [T6 §3.7d]: the dock's cells cover it and only 2px gutters would show it, so it doesn't earn its bytes;
  - **paper tooth:** Meet Day A has no paper sheet.
- **No PNG ships.** No image of any kind.

---

## 11. What Meet Day never does

From track 1's tells, track 6 §3.10 and the slot's "must differ" list:
1. **No hue accent.** "Current" is an inverted cell, and no amber, orange or sodium lamp says "this one" (C5, N1–N2).
2. **No red lamp, no three lamps as a unit, nothing that implies judging, a referee or failure.** In Rack, `F` means to failure [T6 §3.1].
3. **No federation, gym or equipment names or logos:** IPF, IWF, USAPL, Eleiko, Rogue, Gold's, York. This holds in the picker too.
4. **No hazard stripes, stencils, slogans, chalk dust, handprints, red-and-black walls or photos.** That is the other gym [T6 §3.10].
5. **No period devices:** no serif, engraving, ornament, cream paper or halftone. That is Iron Age.
6. **No tracked caps anywhere.** No caps role at all. A unit is never uppercased (N13–N15). Only COACH ME, authored in capitals, and the Coach card's own v1 type keep theirs.
7. **No pills, no 1px card borders, no 12px radii, no delta pills, no corner glows, no gradient washes or area fills.** The one glow is the 6px lamp.
8. **No boxed stat tiles floating apart.** A stat row is a strip of cells on gutters, one object.
9. **No condensed sentences.** Condensed is for figures and heads of up to three or four words. Body text, the Coach card and every sentence stay at wdth 100.
10. **No proportional digits in any figure.** `tnum` is always on.
11. **No plate drawn anywhere `renderPlates` doesn't run, and no collar.**
12. **No texture behind body text.**
13. **No new motion:** no count-up, flip animation, draw-in or entrance. The flap is still.
14. **No rings, and nothing like Activity rings** (R8.6). Rings become segmented bars.
15. **No sparkle.** `spark` is the unlit lamp.
16. **No word, number or control added, removed or hidden.** No rearrangement touches the dock. No merge happens unless the two strings are equal.
17. **No monospace, and no face but Archivo.**
18. **Nothing fetched at run time;** 0 web font bytes added.

---

## 12. Three screens, in words (390pt, v1's own data)

### 12.1 You

- **The page is scoreboard black.**
- **The hero.** At the top left is the round avatar, a `raised` disc with "M" in lamp. Beside it, "Good evening," over "Micah", both lines 30pt condensed bold in lamp white: one colour, no yellow name. The square gear cell sits top right. Under the greeting are "Friday, September 25" and, moved up, "Member since Aug 21, 2025 · 400 days", both in steel, sentence case.
- **The Coach card:** 190 tall, square, a panel on the board. A slightly lighter band sits behind its header row: the bubble, COACH and the lock in lamp. The lines are in v1's Archivo, and COACH ME sits over its hairline.
- **24pt of bare black, then the first board.**
  - A 34pt band reads "How you're doing". 2px under it, the "Doing well" panel: its 30pt band with ⋯ at the right, a 3pt green-light rule under the band, and three findings. Each finding is led by a thin vertical sliver in its subject's colour instead of a dot.
  - 2px of black, then "Could improve" with its 3pt yellow rule.
- **The Goal board** is one band, not two: "Goal", "losing" and ⋯.
  - "0.9" sits in 30pt condensed lamp with "lb / week down" in steel.
  - Then the reason, then a strip that cuts the panel edge to edge into three cells on black gutters: **190.7** Trend now · **182** Goal lb · **Nov 30** At this pace.
  - Then a square-ended 6px meter with a lamp tick at the goal.
- **This week:** the 2 × 2 KPI cells run to the panel's edges.
  - Calories 1,950 kcal / day with "→ 0" as bare text;
  - Weight 191.8 lb "↓ 0.9" in the green light;
  - Training 2 sessions "↓ 1" in red;
  - Steps 6,930 / day "↓ 2,170" in red.

  Each cell has a thin 2pt sparkline and seven round day dots, today ringed.
- **Rack noticed** is one band.
- **Trends.**
  - **Body weight:** "191.2 lb" with "↓ 0.9 lb / week ✓" and "↓ 4.1 lb 30 days". Directly under it, the three-cell strip: 190.7 · 191.8 · 5.2. Then the chart: the yellow line at 2pt over a field of small yellow LED dots, and the dashed trend in lamp.
  - **Against your targets:** square-topped stacked columns, today's column hatched.
  - **Training:** the strip 12 · 58.3k · 1h 00m, blue columns with today's hatched, the muscle bar, then the scoresheet. "Conventional Deadlift / 310 × 5 · Sep 23" sits on the left with a 6px blue meter, and **362 lb** on the right inside a 1px lamp-framed record cell.
  - **The pair:** Steps and Water shoulder to shoulder.
    - Steps: "87%" of goal over a ten-cell bar, eight cells lit in the steps white and the ninth lit to 70%, then "6,930 a day".
    - Water: "28%" over a blue bar, two cells lit and the third lit to 80%.
- **Weekly review** is one band. "Next week" hangs from a 2px lamp rule.
- **The dock:** five dark cells on black gutters. You's cell is lit, a lamp-white square with a black icon and "You".

### 12.2 The live session

- **The score bug across the top, opaque.**
  - At the left is the slot with **25:00**: black condensed figures on a lamp-white slab. Under it, "Push day" in steel, which is the name field.
  - Then the Coach slot (38, `raised`, the lamp bubble and the word), the calendar cell (38) and **Finish**, lit.
  - A 3pt lamp line across the top counts a rest.
- **Barbell Bench Press.**
  - A 34pt band: a 4 × 30 red tag, the name in condensed bold, ⋯.
  - Under it in steel: "Last · Sep 21   220×5  220×5  220×5".
  - A `raised` row of column heads: Set · lb · Reps · e1RM.
- **The rows, each parted by 2px of black.**
  - **W:** a 28pt square box with a yellow W; 95 and 8 in black wells; no e1RM; the check box's lamp lit, with a soft 6px glow.
  - **2:** 185 · 5 · 216 · lamp lit.
  - **3 is the current set:** its box inverted, a lamp-white square with a black "3". The wells hold 185 and 5 as grey placeholders. The lamp is unlit, a dark disc with a grey ring.
- **The loading row:** "Per side", a short chrome sleeve, one full-height red plate and one yellow plate at 0.72 height, with "1×45" and "1×25" on their plate colours.
- **The last lines:** "Swipe a set left to delete it", and a full-width "+ Set" cell.
- **Barbell Curl** follows, 2px below. Its columns fall at exactly the same x as Bench's, so the whole screen reads as one scoresheet. A drop row sits 10 in under a 2px blue rail, its badge a drawn ↳.
- **At the foot:** "+ Add exercise | + Add Lifting Block" as two cells, and "Discard workout" in a red keyline.
- **When a rest runs,** a square slab sits above the dock: **1:30** inverted · +30 · Skip.

### 12.3 The Fuel day

- **The header.** "Fuel" in 13 condensed steel over "Today" in 30 condensed bold. At the right, three square cells: the gear, ‹ and ›.
- **The count panel.**
  - At the left, the flap cell with **350** at 40pt in the cut blue. The top half is a shade lighter than the bottom, and a hairline of black crosses the figures at their waist.
  - Beside it, "kcal left today" and "1,950 eaten · target 2,300" in steel, with ⋯ at the top right.
  - The calorie bar, square-ended, with the blue, yellow and red zone washes, the white head, the ticks and the dashed target. Then "In a deficit · 750 under maintenance" and "maint 2,700".
- **The macro strip,** 2px below: three cells on black gutters.
  - Protein · **142/200** · a red 6px meter with a lamp tick at 200;
  - Carbs · **208/218** · yellow;
  - Fat · **53/70** · blue.
- **The meals.**
  - **Breakfast:** its band reads "Breakfast", "520 kcal" and ⋯. "Oats with whey" runs along a dotted leader to **520**, with "1 bowl · P 42 C 60 F 11" in steel under the name.
  - Lunch the same.
  - An empty Dinner is just its band.
- **Water:** the bottle, and **34** fl oz in its flap.
- **The micros strip.**
- **Above the dock,** "+ Log food" is a lamp-white square with black words, with no shadow and no glow.

---

## 13. What this concept asks of the engine and the contract (each with its fallback)

| # | Request | Fallback if not granted |
|---|---|---|
| R1 | A `compose` field (§7) that engine X reads per screen: order, join, merge, split, within. v1 is `{}`. | Every screen draws same order, new shapes. The vibe still ships complete. |
| R2 | `shape.flap: { top, bottom, seam }` naming colour roles (`track`, `raised`, `rack`), so the flap's halves come from the definition and not from the engine's choice. | The look's own default halves, or `headline · v1` (bare condensed figures). |
| R3 | `shadow.lamp`: web `[{x0,y0,blur6,spread0,color:'done',a:.45}]`; native `{ opacity .45, radius 3, x 0, y 0 }`. | Lit lamps without a glow. They are still lit by brightness (12.13:1 against unlit). |
| R4 | `kpi · board` (the text is in §6). | `kpi · plain`, as the definition names now. |
| R5 | `chart · board` grows two things. **(a)** Rings draw as a 10-cell segmented bar, exact to the fraction (§7.8), with the call site passing `--frac` on the web and the fraction as a prop on native. **(b)** A `vibe-dots-<token>` LED pattern beside engine v2's hatches. | (a) Rings stay, with square caps. (b) Lines with no area fill. |
| R6 | `statRow · board`'s wording: "inside a card the strip runs to the card's edges, its gutters in the page ground". Without it, bar cells in a bar card have invisible gutters, which is same-fill nesting. | Inside a card, cells drawn on `raised` within the padding, with board gutters. |
| R7 | `listRow · ledger` names its record rows (the recap's PR hits, Stats' PR rows, You's Strongest lifts), whose value takes `shape.keyline`. | No record cell. The value is at 800 with its leader. |
| R8 | The inversion exemption from R2.7 and R2.4 for an accent that is the ink inverted (Q-P5). | This is policy, not code. Without it Meet Day cannot exist as specified. |

---

## 14. Decisions left to Micah

1. **Q-P5, the inversion exemption.** The "accent" is lamp white inverted. It is 2.59 from amber-50 and 6.0 from the arms plate.
2. **Q-Q1, the three merges on You.** Goal, Rack noticed and Weekly review each have a section title equal to its card's title. A merge draws the words once. If he says no, each draws both: a band, then the card's band.
3. **Weight: the reading above the Log input** (§7.4). Vetoing it drops only that swap.
4. **No caps at all.** This concept keeps even the header bands in sentence case, so no C10 caps exception is needed. The alternative is caps band heads at 13pt, +0.08em, which a scoreboard would use.
5. **Set inputs at 15pt**, keeping the web's iOS zoom-on-focus exactly as v1 has it, **or at 20pt** for bigger board figures. That stops the zoom on the web: a behaviour change.
6. **The panel lifted from `#111317` to `#16181d`,** so the 2px gutter reads.
7. **Dark sheets** (this concept) against concept B's paper attempt cards (Q-E3).
8. **The name:** "Meet Day", or "Platform" [T6 §5 item 5].

---

## 15. The two tests

**(a) The generic-prompt test** [T1 D18a]. Ask for "a dark fitness tracker" and you get:
- a near-black page with one neon or orange accent;
- rounded soft-shadow cards and ring gauges;
- gradient area charts;
- tracked-caps labels, pill badges, and big numbers in a geometric sans.

Meet Day has none of these:
- no hue accent at all;
- square panels on 2px black gutters under filled header bands;
- figures cut from Archivo's own extra-condensed width;
- lamps for done, and an inverted cell for current;
- segmented bars instead of rings, and LED dots instead of gradients;
- a drawn loading chart;
- zero caps.

Every one of those comes from a physical object on a platform, and each restyles something Rack already draws.

**(b) The silhouette test** (the experimental vibe only) [T1 D18b]. Shrink You to 200px-wide black blocks.

**v1** is:
- a round avatar and a square gear flanking two text lines;
- one tall rounded box, then a thin text line;
- **about eleven separate rounded boxes** with 12px gaps, each section announced by a small label and a trailing hairline;
- boxes with coloured left stripes, a 2 × 2 of inset tiles, three-tile rows of inset boxes, two rings in a mirrored pair.

**Meet Day** is:
- the hero, with a third line under the greeting;
- the Coach box directly under it, with no line between them;
- then **seven continuous slabs**, each opening with a full-width filled band and cut inside by thin full-width gutters (panels, strips and the KPI grid all run edge to edge);
- no rounded corners, no side stripes, no rings;
- three sections whose band and card-head are one strip.

The block count, the block sizes, the edge treatment and the position of the since-line all differ. v1's silhouette cannot be laid over it.

---

## 16. Risks and what is unverified

- **The composition is only as safe as its proofs** (§7.9). **Fuel's split** and **Weight's swap** are the two most likely to need a fallback.
- **The segmented bar on the web** depends on a `--frac` set by the non-pinned call site (you.js, steps.js), and on the pinned SVG being restyled by CSS alone. That is untried.
- **Square SVG bars** depend on CSS `rx: 0` reaching the pinned module's `rx` attribute (SVG2 geometry properties). Safari's support is unverified. The residual is v1's bar radius.
- **Q's literal checks.**
  - N21 ("`.stat` has no fill") will flag the board strip, which R6.3 and the vocabulary sanction.
  - D2's lead step heuristic of 1.25 is not met. Panels are 1.13 off the board and bands 1.27.
  - R6.5 (the sheet keeps the platform radius) is traded for `sheetHost · full`, which the vocabulary lists for Meet Day.
- **Until R4 lands, `kpi · plain` keeps v1's 1px collar edge** on the four KPI tiles. That is the one 1px border track 6 says Meet Day never draws.
- **The drop rail** is a 2px coloured vertical line on a set row. It is a data mark (the drop set's grouping, D = blue), not decoration on a card, but a naive N10 scan will flag it.
- **The add tile's 8.5pt "ai" tag** is v1's literal under a `shape`-grade look. It stays under R4.2's 11pt floor unless the look may re-set it.
- **The lamp glow on Android** is not coloured (elevation). iOS only draws the `shadowColor`.
- **Device checks nobody can run tonight:**
  - ArchivoCondensed on native at h1–h3 with `minLh` 1.088;
  - the flap seam at @3x;
  - whether the 2px gutter reads outdoors in a bright gym.
- **Carried from the synthesis:** v1's lb plate colours run one step off the loose lb convention (Q-M3). Meet Day draws plates prominently, so it makes that more visible. It is not a vibe change.

---

## 17. Registry entry and picker data

```js
{ id: 'meet-day', name: 'Meet Day', feel: 'The platform on meet day.', experimental: true, scheme: 'dark',
  pick: { ground: '#07080a', card: '#16181d', edge: null, edgeW: 0, radius: 0,
          text: '#f5f0e3', soft: '#a8a295', num: '#f5f0e3', accent: '#f5f0e3',   // the 4 × 44 bar in lamp
          numFace: { web: "'Archivo', system-ui, -apple-system, sans-serif", wdth: 62, wght: 800,
                     native: 'ArchivoExtraCondensed_800' },
          numPt: 35,          // cap height 686 / 1000: 24pt cap = 35pt; "315" is 45pt wide, well inside 92
          thumb: null, scrim: null } }
```

- **The sample card** is a flap cell, `track` over `raised` with a 1px `rack` seam, holding "315". It measures 12.13 and 13.84 on the two halves.
- **The name and feel line** are 15.61 and 6.99 on the tile's ground, in the current UI face.
- **"Experimental"** is plain 12pt 600 text.
- **Web:** `.vibe-in[data-vibe="meet-day"]` only. The face is v1's already-loaded Archivo, so nothing is prefetched and the figure is never hidden waiting for a file.

---

## 18. Reproduce (read-only on both trees)

| Command | What it establishes |
|---|---|
| `node ~/dev/vibes-night/tools/mdA-roles.mjs` | Evaluates §2's block and walks all 298 `index.js` ROLES with `valueOf()`: 0 missing, 0 non-hex colours, all 29 looks accepted by `vocab.js`, no `v1.js` key absent (legacy `exact` strings excluded) |
| `node ~/dev/vibes-night/tools/mdA-colour.mjs` | §3 in full: 114 pairs with 0 failures; CVD; the guard; the lineup. Writes `design/meet-day/scratch-A/colour-report.md` |
| `node ~/dev/vibes-night/tools/mdA-scout.mjs [hex…]` | The panel and band step search behind `bar` / `raised` / `track` |
| `node ~/dev/vibes-night/tools/mdA-fontprobe.mjs <ttf…>` | Names, PostScript, metrics, default and `tnum` digits, GSUB and glyph gaps (§4.1) |
| `node ~/dev/vibes-night/tools/mdA-subset.mjs` | The two latin subsets and their hashes |
| `node ~/dev/vibes-night/tools/t5-check.mjs <ttf>` | Track 5's `tnum` check on each subset: 432 and 482 |
| `node ~/dev/vibes-night/tools/mdA-fit.mjs` | §4.4 |
| `node ~/dev/vibes-night/tools/mdA-crop.mjs …` | The v1 and Chalk crops in `scratch-A` used for scale (an earlier, interrupted run of this job) |

The code facts cited are from the design worktree `wt/web-design2` (58ac3be) and `rack-mobile` HEAD, read with `git grep` and Read only:
- `you.js:524-637`, `:655-726`, `:1266-1294`, `:1318-1358`;
- `workout.js:338-547`, `:988-1419`, `:2052-2217`;
- `food.js:512-630`; `weight.js:71-226`; `steps.js:148-261`;
- `rack.css:595-704`; `vibe.js:122-333`;
- native `you/index.jsx:128-199`, `Hero.jsx:46`, `session.jsx:270-339`, `theme.js:300-418`.
