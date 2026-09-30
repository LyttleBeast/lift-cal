// The design system. PORT-BRIEF §6.
//
// Every value in this file comes from `rack.css:4-49` and the component rules
// below it. NOT from `app.css` — that file is dead (README.md:126) and it
// redeclares the same variable names with different values and one inverted
// meaning: `--steel` is a text grey here and a *surface* there (#8d939f vs
// #171A21). `--knurl`, `--p-red` and `--chalk` differ too. A grep for a token
// name hits the dead file first. §6 opens with this warning; it is repeated
// here because this is where someone will come looking.
//
// THE VIBES ENGINE (V59 §6). A vibe is a look: a definition file under
// src/pure/vibes/defs/ with every visual role in it (v1.js is this app as it
// was at buildNumber 58). `build(def)` turns one into the whole object every
// screen reads as `T` — colours, the precomputed tints and text presets, and
// the functions (alpha, face, type, loadNum, the layout insets, the data
// colours) — and `applyTheme(obj)` puts it in place. Four rules, and why:
//
// - T IS ONE OBJECT FOR THE LIFE OF THE APP. Eighty files `import T from
//   '…/theme'` and read `T.colors.x` at render. A switch reassigns T's
//   top-level properties; it never replaces T, so no import goes stale.
// - NOTHING NESTED IS EVER MUTATED. Every build hands out fresh tables, and a
//   switch swaps them whole. Reanimated freezes an object a worklet captures
//   (in dev) and caches its clone by identity (always), so a colour written
//   into T.tint in place would be dropped on the UI thread or warned about —
//   and the table the worklet holds must stay what it was.
// - EVERY FUNCTION CLOSES OVER THE DEF IT WAS BUILT FROM, never over this
//   module's tables. type()'s default colour used to be the module's
//   `colors.chalk` and the text presets were baked from it at load; a vibe
//   that swapped only `colors` would have kept v1's chalk in 158 T.type()
//   calls. tools/verify-theme-build.mjs builds a bent def and proves every
//   one of them follows it.
// - THIS FILE IMPORTS NOTHING BUT Platform. It never imports the vibe
//   definitions: verify-text-color and verify-coach-surface import a stubbed
//   copy of it from tools/ or a tmpdir, where a relative import would not
//   resolve. src/state/vibe.js owns the definitions and calls
//   applyTheme(build(def)).
//
// So v1 is written out here as well, as tables in the definition's shape
// (V1, below) — the default export is build(V1), which is how nothing changes
// at import. src/pure/vibes/defs/v1.js is the same look as pinned data, and
// tools/verify-theme-build.mjs holds the two builds equal, key for key and
// call for call. The named exports are v1 too, for the verifiers that load
// this file without a bundler; the app reads only the default export.
//
// Three more rules hold at every call site, because a switch cannot reach a
// value taken before it or outside render, and each has a lint that fails the
// suite rather than a comment that asks nicely:
// - T IS READ AT RENDER, never at import: `const BG = T.colors.rack` at the
//   top of a file is build 58's page in every vibe.
//   tools/verify-no-module-scope-theme.mjs.
// - A WORKLET CLOSES OVER STRINGS, never over T or one of its tables (see
//   the second rule above): SetRow.jsx reads `const low = T.tint.coachLow`
//   in render and the worklet captures `low`.
//   tools/verify-no-theme-in-worklet.mjs.
// - NO COLOUR IS WRITTEN OUTSIDE THIS FILE and src/pure/vibes/ — a screen
//   names a role on T, chosen for the site's job (accent, not the legs
//   yellow; well, not the page). tools/verify-no-colour-literals.mjs.

const Platform = { OS: 'ios', select: o => (o && 'ios' in o ? o.ios : o && o.default) };

/* ---------- COLOURS — rack.css:6-26, verbatim ---------- */
export const colors = {
  // surfaces: "warm graphite, gym rubber-crumb, not pure black" (rack.css:5)
  rack:   '#14161a',   // page background            rack.css:6
  bar:    '#1c1f26',   // card / sheet / field       :7
  collar: '#262a33',   // border, track, divider     :8
  knurl:  '#333844',   // raised border, grab handle :9

  chalk:  '#f2f0eb',   // primary text               :12
  steel:  '#8d939f',   // secondary text             :13
  dim:    '#5c6270',   // tertiary text, labels      :14

  // IPF calibrated plates -> muscle groups          :17-23
  pRed:    '#d6252b',  // chest      25kg
  pBlue:   '#2e7fd9',  // back       20kg
  pYellow: '#f0be1e',  // legs       15kg   <- ALSO the app accent
  pGreen:  '#2aa85c',  // shoulders  10kg
  pWhite:  '#e8e5de',  // arms        5kg
  pChrome: '#a8aeb8',  // core       1.25kg

  good: '#2aa85c', warn: '#f0be1e', bad: '#d6252b',   // :24-26, same three hexes

  // the five near-blacks used as text-on-colour; keep them distinct
  onYellow: '#141414',      // .btn-primary :196, .fuel-fab :1368, .badge auth.css:24
  onGreen:  '#0d1a11',      // .set-check.on tick :484
  onPlate:  '#14161a',      // .plate-chip :502
  white:    '#ffffff',      // .swipe-del label only :681
  pYellowPressed: '#d9a90f',// .fuel-fab:active :1381

  fallback: '#8d939f'       // analytics.js groupColor() default
};

/* The roles split out of double duty (V59 §5.2, §6.2). In v1 each is the same
   hex as the token it came out of; a vibe may part them. `pYellow` stays the
   legs / carbs / fuel data colour and `accent` is the app's own call to
   action; `rack` stays the page and `well` / `knockout` are its other two
   jobs; the five near-blacks above are filled FROM onAccent, onDone,
   onDanger and accentPressed by build(), so a vibe sets one value per job. */
const ROLE_COLORS = {
  accent:        '#f0be1e',  // pYellow's other job: primary, focus, today, the FAB, Coach
  focus:         '#f0be1e',
  accentPressed: '#d9a90f',
  onAccent:      '#141414',
  danger:        '#d6252b',  // pRed's other job: destructive, refused, over
  onDanger:      '#ffffff',
  done:          '#2aa85c',  // pGreen's other job: a set done, its tick
  onDone:        '#0d1a11',
  well:          '#14161a',  // the recessed surface inside a card
  knockout:      '#14161a',  // ink cut out of a bright fill
  inverse:       '#f2f0eb',  // the bright fill behind knockout ink
  // chalk's third job: the calorie bar's head, zone ticks and dashed target,
  // and their swatches in the bar guide. The copy calls the head "the white
  // head", so it stays white in every vibe (defs/index.js HUE_NAMED) while
  // chalk, the ink, may go dark in a light one.
  calMark:       '#f2f0eb',
  // collar's other two jobs: a fill that sits up off the card (Btn plain, the
  // peek bar, index badges, a chosen option) and a meter's empty track
  raised:        '#262a33',
  track:         '#262a33',
  // knurl's other two: a fill one step above raised (the grab handle, a
  // toggle's off track) and the faintest ink
  grip:          '#333844',
  faint:         '#333844',
  onWarn:        '#141414',  // ink on a solid warn fill: the trial banner (onYellow's other job)
  shade:         '#000000',  // under every shadow and scrim
  lift:          '#ffffff',  // the white of a pressed highlight
  tileHero:      '#1e1f1e',  // food/common.jsx:411, the flat form of .add-tile.hero
  tileLit:       '#17181a'   //                      and of .add-tile.lit
};

/* CSS could not give a var an alpha, which is why you.js:417 passes bare rgb
   channels for --kpi-rgb. RN has no such limit. */
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
/* T.alpha: each helper and the colour role it tints. */
const ALPHA = {
  yellow: 'pYellow', red: 'pRed', blue: 'pBlue', green: 'pGreen', ground: 'rack',
  accent: 'accent', danger: 'danger', warn: 'warn'
};

/* the tints that actually appear, named so they are searchable — each is
   rgba(role, a), except where `exact` is the legacy spelling that reaches a
   backgroundColor verbatim (rgba() would add spaces) */
const TINT = {
  setDone:   { color: 'done',    a: 0.07 },  // .set-row.done      :448
  setFlash:  { color: 'accent',  a: 0.28 },  // setFlash 0%        :451
  tagW:      { color: 'pYellow', a: 0.16 },  // .set-idx.t-W       :461
  tagF:      { color: 'pRed',    a: 0.16 },  // .t-F               :462
  tagD:      { color: 'pBlue',   a: 0.16 },  // .t-D               :463
  dropRail:  { color: 'pBlue',   a: 0.45 },  // .set-row.drop::before (rack-v55)
  dropAdd:   { color: 'pBlue',   a: 0.35 },  // .drop-add border       (rack-v55)
  pickSel:   { color: 'accent',  a: 0.08 },  // .ex-item.sel       :532
  block:     { color: 'accent',  a: 0.03 },  // .wk-block          :521
  /* First-workout coach mark, :499-507. THREE values because the effect is two
     layers: `coachBase` is the STEADY fill that carries the hint on its own,
     and the pulse runs between coachLow and coachHigh on top of it. Anyone who
     asked for less movement keeps the steady one — see SetRow.jsx. */
  coachBase: { color: 'accent',  a: 0.14 },
  coachLow:  { color: 'accent',  a: 0.07 },
  coachHigh: { color: 'accent',  a: 0.38 },
  rowPress:  { color: 'lift',    a: 0.04, exact: 'rgba(255,255,255,0.04)' },  // .set-row-nav:active :1250
  pillBase:  { color: 'lift',    a: 0.05, exact: 'rgba(255,255,255,0.05)' },  // .delta-pill  :1733
  pillUp:    { color: 'good',    a: 0.16 },
  pillDown:  { color: 'bad',     a: 0.16 },
  pillWarn:  { color: 'warn',    a: 0.16 },
  zoneCut:   { color: 'pBlue',   a: 0.16 },  // .cal-zone.cut      :908
  zoneHold:  { color: 'pYellow', a: 0.18 },  // .hold              :909
  zoneGain:  { color: 'pRed',    a: 0.16 },  // .gain              :910
  dockGlass:  { color: 'rack',  a: 0.82, exact: 'rgba(20,22,26,0.82)' },  // .dock          :121
  wkBarGlass: { color: 'rack',  a: 0.9,  exact: 'rgba(20,22,26,0.90)' },  // .wk-bar        :381
  backdrop:   { color: 'shade', a: 0.6,  exact: 'rgba(0,0,0,0.60)' },     // .sheet-backdrop:304
  // you/verdicts.jsx's raw rgba strings, as tokens (V59 §6.3)
  trajGood:     { color: 'good',   a: 0.18, exact: 'rgba(42,168,92,0.18)' },
  trajWarn:     { color: 'warn',   a: 0.18, exact: 'rgba(240,190,30,0.18)' },
  trajBad:      { color: 'bad',    a: 0.18, exact: 'rgba(214,37,43,0.18)' },
  reviewBg:     { color: 'accent', a: 0.07, exact: 'rgba(240,190,30,0.07)' },
  reviewBorder: { color: 'accent', a: 0.18, exact: 'rgba(240,190,30,0.18)' }
};

/* ---------- SPACING — no strict scale; a 2px grid. --pad is the only named one ---------- */
export const space = { xxs:2, xs:3, s:4, s5:5, s6:6, s7:7, m:8, m9:9, m10:10, m11:11,
                       m12:12, m13:13, m14:14, pad:16, l18:18, l20:20, l22:22,
                       l24:24, l26:26, xl30:30, empty:44 };

/* ---------- RADII — rack.css:43-44 + census ---------- */
export const radius = {
  r: 12, sm: 8,          // --r, --r-sm
  sheet: 18,             // .sheet top corners :316
  tile: 10,              // .add-tile .ic :1413
  pill: 999,             // chips, seg, toast, rest-pill, badges
  plate: 2,              // .cal-plates i, .ex-tag, .rank-tag, .auth-mark i
  chip: 3, mark: 4, idx: 5
};
/* The radius roles native draws. A definition carries four more that only the
   web spends (round, hair, bubble, badge — vibes/defs/index.js RADIUS). */
const RADIUS_KEYS = ['r', 'sm', 'sheet', 'tile', 'pill', 'plate', 'chip', 'mark', 'idx'];

/* ---------- LAYOUT — rack.css:28, 37-41, 86-92, 114-120 ----------

   The web app expressed all of this with `env(safe-area-inset-*)` inside
   `calc()`, and named the top one so it could be faked in a desktop browser.
   Its comment at rack.css:29-36 is worth carrying across in full, because it
   records a bug that already shipped once:

     "The notch / status bar. Zero in Safari, where the browser chrome already
      sits above the page — and 47-59px once the app is installed to the home
      screen, because `apple-mobile-web-app-status-bar-style: black-translucent`
      plus `viewport-fit=cover` hands us the whole screen, notch included. The
      bottom inset was handled everywhere; this one was only ever handled by
      the sync pip and the workout bar, which is why an installed Rack had its
      header cropped into the top of the screen."

   That is the same failure this port reproduced in its first Release build.
   So the rule is the web app's rule, not a number — top and bottom differ (59
   vs 34 on a Dynamic Island phone, 47 vs 34 on a notch, 20 vs 0 on an SE), and
   every one of these takes the live insets from useSafeAreaInsets().

   §6.3 lists 16 `env(safe-area-inset-*)` sites. Each maps to one function
   here, so no screen does the arithmetic itself — the same centralisation
   userPath() and lsKey() get in the data layer.

   Layout, spacing and motion are the same in every vibe (V59 §5.1 keeps them
   literal): build() copies these three tables fresh and sets nothing in them. */
export const layout = {
  dockH: 64,            // --dock-h            rack.css:28
  topGap: 10,           // --top-gap           :39-40  "nudge this one number"
  maxWidth: 560,        // #app                :86
  maxWideWidth: 720,    // above 900px         :562-567
  dockIcon: 22, dockMarkW: 26, grabW: 36, grabH: 4,
  sheetMaxPct: 0.86, exListMaxPct: 0.48,
  /* .sheet.coach-sheet rack.css:2032 — "taller than Log food, because it is a
     conversation rather than a form". 92dvh on web, never checked on a phone. */
  sheetTallPct: 0.92,
  /* The smallest tap target this app draws on purpose, in points — Apple's
     44. Web's Train pair measures 41px, a known web bug the native pair must
     not copy (PORT-V44-PROMPT §3). */
  tapMin: 44,

  // Call every one of these with the object from useSafeAreaInsets().
  appTop:     i => i.top + 10,          // --app-top          :41, applied :89
  appBottom:  i => 64 + i.bottom,       // #app padding-bottom :90 — reserves the dock
  dockHeight: i => 64 + i.bottom,       // .dock height        :119
  aboveDock:  (i, extra) => 64 + i.bottom + extra,
  //   peek-bar 10 (:348) | rest-pill 12 (:407) | toast 16 (:542) | fab 14 (:1354)
  sheetPadBottom: i => 24 + i.bottom,   // .sheet              :319
  /* .sheet max-height :315 — `calc(86dvh - var(--safe-top))`, and the coach
     sheet's 92 (:2032). The window height times the share, minus the top
     inset, so the sheet's top edge can never rise into the status bar: at its
     tallest it stops (1 - pct) of the window BELOW the inset. The home
     indicator is sheetPadBottom's, which every sheet already carries. One
     function because SheetHost is its only caller and
     tools/verify-coach-surface.mjs checks it at real device sizes.
     build() gives each built layout its own copy of this, reading its own
     table rather than this one. */
  sheetMaxH:      (h, i, tall) => h * (tall ? layout.sheetTallPct : layout.sheetMaxPct) - i.top,
  syncPipTop:     i => 8 + i.top        // .sync-pip           :553
};

/* ---------- MOTION — rack.css:46-48 ---------- */
export const motion = {
  fast: 140, med: 240,
  bezier: [0.22, 0.61, 0.36, 1],            // --ease -> Easing.bezier(...bezier)
  press: 0.97, pressHard: 0.94, pressHardest: 0.88,   // .btn :194, .cal-day :280, .set-check :485
  fill: 500,        // .vol-fill / .cal-fill / .traj-fill width
  spin: 850,        // aiSpin :1493
  pulse: 1800,      // gatePulse auth.css:102
  tourPulse: 1600   // auth.css:267
};

/* ---------- TYPOGRAPHY ----------

   rack.css drives Archivo's VARIABLE wdth+wght axes — 121 declarations, 29
   distinct combinations, wdth 78..118, wght 400..800. RN cannot set variable
   axes at all; fontVariationSettings is silently dropped. §6.1's plan was to
   ship 10 static named instances across four width families and select by
   name.

   THE WIDTH FAMILIES DO NOT EXIST IN THE PACKAGE. §6.1 says to verify the
   filenames before writing the useFonts map, and verification contradicts its
   premise: @expo-google-fonts/archivo@0.4.2 ships the WEIGHT axis only — nine
   weights 100..900 plus italics, every one of them at wdth 100. There is no
   Archivo_Condensed, no Archivo_SemiCondensed and no Archivo_SemiExpanded
   anywhere in it, and metadata.json confirms it: `variants` is a list of
   weights, and the gstatic URLs are the variable font sliced at wdth 100.

   So the fallback §6.1 counted on — "the condensed/expanded static cuts get
   most of it back" — is not available from this dependency. §6.1 also says
   losing the wdth axis is "the one genuine fidelity cost of the port" and to
   "flag it to the author as a decision, do not silently drop it". It is
   flagged, and this is the one place the decision lives.

   WHAT SHIPS TODAY: width collapses to 100 and only weight is honoured.
   Correct, consistent, and nothing renders in a fake bold — but §6.2's "width
   does the semantic work" is not being done, so headings lose their condensed
   punch and the "stamped" numerals lose their expanded feel.

   HOW TO GET IT BACK, if you decide the fidelity is worth it: the static width
   cuts DO exist on fonts.google.com — download Archivo, take the
   Archivo_Condensed / Archivo_SemiCondensed / Archivo_SemiExpanded instances,
   drop the .ttf files in assets/fonts/, register them in the useFonts map, and
   give the face below `bands` for them. Nothing else in the app moves, because
   every call site still declares the wdth it wants. v1 does not: V59 §6.5 says
   width stays collapsed in v1, on purpose.

   NEVER use fontWeight to pick a face — iOS synthesises a fake bold instead. */

/* wdth is still a required part of every preset below even though v1's face
   ignores it. That is deliberate: it keeps all 29 of rack.css's combinations
   recorded at the call sites, so restoring the width axis is a change to one
   face table rather than an archaeology exercise across the app. Do not
   "tidy" the wdth arguments away.

   THE FACE, per vibe. face(wdth, wght) is `${family}_${weight}`, and those
   names are exactly the keys app/_layout.jsx registers with useFonts.
   - `snap` first: 'wght' 650 (rack.css:935) and 750 (:1418) are the only
     non-hundreds, and they snap UP so they stay heavier than their
     neighbours. Then `weights`, when a family ships only some (the nearest,
     a tie going heavier); else the nearest `step`. The package ships 100..900
     in hundreds, so every snapped v1 value resolves to a real face.
   - `minLh` is the family's own: see MIN_LH below.
   - `bands` (a vibe with width cuts; v1 has none): [{ min?, max?, family,
     keys?, snap?, step?, weights?, minLh? }]. The first band whose [min, max]
     holds the wdth draws it; with no band, width is ignored, as in v1.
   - `mono` is text.mono's family, per platform. */
const FACE = {
  family: 'Archivo',
  keys: ['Archivo_400', 'Archivo_600', 'Archivo_700', 'Archivo_800'],
  snap: { 650: 700, 750: 800 },
  step: 100,
  width: 100,
  /* MIN_LH. The smallest line-height ratio that does not clip, read out of the
     font rather than guessed: Archivo's hhea ascent is 878 and descent -210
     per 1000 upem, so a glyph occupies 1.088 x fontSize between the two.

     CSS AND RN DISAGREE HERE, AND THAT IS THE WHOLE PROBLEM. `line-height: .95`
     in a browser makes the LINE BOX 0.95em and lets the glyph overflow it
     visibly — the element is compact and the number pokes out of it. RN clips
     to the Text bounds instead, so the same ratio chops the ascenders off. Five
     of rack.css's ratios are below 1.088 (.load-num .95; .stat-val, .kpi-val
     and .headline 1; .you-greet 1.05), and every one of them is a single-line
     number where the tight ratio was buying compactness, not line spacing.

     So sub-natural ratios are clamped rather than dropped. Dropping the
     property would also stop the clipping, but iOS and Android derive natural
     line height from different metrics, and an explicit value is the only way
     the two agree. The cost is a few points of extra height on those five —
     which is the right trade against a chopped glyph. Another family has other
     metrics, so the floor is the family's, not the app's. */
  minLh: 1.088,
  mono: { ios: 'Menlo', android: 'monospace' }
};

/* THE MEASURED FACE (V59 §6.6). A few surfaces are FITTED rather than left to
   flex: the Coach card, whose fixed box src/pure/coach-view.js fills line by
   line in Archivo's own advance widths (CARD_FACE); the goal chips and the
   recap's feel chips, laid out from the same table (goalLayout, feelGrid); and
   the estimate row and the movement chips, which verify-estimate-row and
   verify-custom-movement measure in Archivo's TTFs. Their arithmetic is
   Archivo's, so they draw in it — T.fit, below. The first three take a
   vibe's own measured table (coach-view.js CARD_METRICS) and then draw in its
   face; the estimate row and the movement chips have no such path — their
   layout is flex, and only their verifiers know the widths — so they draw in
   Archivo in EVERY vibe (T.fit.archivo). This is that face: v1's, the one
   CARD_FACE was read out of, registered at boot and so always there to draw. */
const MEASURED_FACE = { family: FACE.family, snap: FACE.snap, step: FACE.step, minLh: FACE.minLh };

/* Tabular numerals are non-negotiable — rack.css:69-73 says so in as many
   words, for .num, input[type=number], .set-row, .stat-val and .timer. In RN
   that is fontVariant: ['tabular-nums'] on each Text/TextInput, and it does
   NOT inherit from a parent View. It is baked into the presets below so it
   cannot be forgotten.

   Each preset is the argument object type() is called with, its colour a
   role; build() makes the style. A preset with no colour takes type()'s
   default, chalk — see type() inside build(). */
const TEXT = {
  body:     { size:15, wdth:100, wght:400, lh:1.45, color:'chalk' },        // :53-67
  h1:       { size:26, wdth:78,  wght:800, ls:-0.01, color:'chalk' },       // :154-155
  h2:       { size:18, wdth:78,  wght:800, ls:-0.01, color:'chalk' },       // :154,156
  h3:       { size:15, wdth:78,  wght:800, ls:-0.01, color:'chalk' },
  eyebrow:  { size:10, wdth:88,  wght:700, ls:0.16, upper:1, color:'dim' }, // :158-162
  btn:      { size:14, wdth:92,  wght:700, ls:0.02, color:'chalk' },        // :183-193
  btnLg:    { size:16, wdth:92,  wght:700, ls:0.06, upper:1 },              // :200
  dockLbl:  { size:10, wdth:88,  wght:600, ls:0.07, upper:1, color:'dim' }, // :129-141 + :1095
  fieldLbl: { size:10, wdth:88,  wght:700, ls:0.16, upper:1, color:'dim' }, // :629
  note:     { size:12, wght:400, lh:1.5, color:'dim' },                     // :622-627
  statVal:  { size:20, wdth:108, wght:800, lh:1, tnum:1 },                  // :331
  statLbl:  { size:9,  wdth:88,  wght:700, ls:0.10, upper:1, color:'dim' }, // :332-333
  timer:    { size:22, wdth:112, wght:800, ls:-0.01, tnum:1 },              // :390-394
  kpiVal:   { size:22, wdth:108, wght:800, ls:-0.01, lh:1, tnum:1 },        // :1566-1570
  headline: { size:34, wdth:112, wght:800, ls:-0.02, lh:1, tnum:1 },        // :1614-1617
  youGreet: { size:27, wdth:100, wght:800, ls:-0.02, lh:1.05 },             // :1845-1849
  chip:     { size:11, wdth:92,  wght:600, color:'steel' },                 // :515-521
  segBtn:   { size:11, wdth:92,  wght:700, ls:0.06, upper:1, color:'steel' },//:657-663
  setInput: { size:15, wdth:100, wght:700, tnum:1, color:'chalk' },         // :465-471
  /* Not built by type(), so it needs the colour spelled out — and it genuinely
     needed it: `mono ? T.text.mono : T.text.body` (food/common.jsx:860) put
     BLACK text in the notes field whenever the mono branch was taken, while
     the body branch was fine. rack.css:599 is `color: var(--chalk)`. Its
     family is FACE.mono. */
  mono:     { size:12, color:'chalk' }
};

/* .load-num — rack.css:165-170, "the signature numeral treatment: wide +
   heavy, stamped like a plate": type({ size, ...LOAD_NUM }). See loadNum()
   inside build() for why it is a function of the size. */
const LOAD_NUM = { wdth:118, wght:800, ls:-0.02, lh:0.95, tnum:1 };

/* ---------- SHADOWS — the five shadowColor sites ----------
   Native's shadowRadius is not one function of the web blur (the toast 14 for
   28px, the tour card 25 for 50px), so each is its own entry. The colour is
   chrome.shadow. */
const SHADOW = {
  peek:     { native: { opacity: 0.45, radius: 30, x: 0, y: 10, elevation: 12 } },  // PeekBar.jsx:68
  rest:     { native: { opacity: 0.45, radius: 24, x: 0, y: 6, elevation: 10 } },   // RestOverlay.jsx:129
  toast:    { native: { opacity: 0.5, radius: 14, x: 0, y: 8, elevation: 8 } },     // ToastHost.jsx:50
  fab:      { native: { opacity: 0.58, radius: 26, x: 0, y: 8, elevation: 12 } },   // food.jsx:729
  tourCard: { native: { opacity: 0.55, radius: 25, x: 0, y: 18 } }                  // TourOverlay.jsx:78
};

/* The tour's scrim — TourOverlay.jsx:66, auth.css:134 — three stops on native,
   the last holding .94 to the bottom. The sheet backdrop, the dock and the
   workout bar are tints (backdrop, dockGlass, wkBarGlass). */
const SCRIM = {
  dock: { native: { intensity: 40 } },   // Dock.jsx:45 BlurView intensity
  tour: { stops: [{ color: 'rack', a: 0.55, at: 0 }, { color: 'rack', a: 0.94, at: 0.42 }],
          native: { exact: ['rgba(20,22,26,0.55)', 'rgba(20,22,26,0.94)', 'rgba(20,22,26,0.94)'],
                    locations: [0, 0.42, 1] } }
};

/* ---------- CHROME — the system's parts of the screen ---------- */
const CHROME = {
  statusBar: 'light',      // <StatusBar style>, app/_layout.jsx:316 and ErrorScreen.jsx:76
  keyboard: 'dark',        // keyboardAppearance, 14 TextInputs (sign-in's two set none)
  blurTint: 'dark',        // the dock's BlurView
  shadow: '#000',          // shadowColor at the five shadow sites, verbatim
  datePicker: 'dark',      // DateTimePicker themeVariant (session.jsx:463)
  camera: '#000',          // scan.jsx:93 behind the camera
  /* The Text sites that name no Archivo face render in SF: glyph icons, small
     meta labels, the banners. null in v1 — and then T.systemFace is null, so
     `...T.systemFace` at those sites adds NO fontFamily key at all: not
     undefined, not 'System'. A vibe names a registered face key here. */
  systemFace: null
};

/* app.json's userInterfaceStyle, which sets the keyboard, the date pickers and
   the system alerts app-wide. It is fixed when the binary is built, so it is
   not a vibe's to change (defs/index.js chrome.appearance) — which is why it
   is a constant here and not a token build() reads. */
const APPEARANCE = 'dark';

/* Native sign-in was never moved onto the theme, so it has its own set —
   app/(auth)/sign-in.jsx, all 15 literals. The signed-out screens stay v1. */
const SIGN_IN = {
  title: '#fff', sub: '#8b929c', label: '#8b929c', link: '#8b929c', placeholder: '#5a616b',
  error: '#ff6b6b', ok: '#6fcf97', button: '#2aa85c', buttonBusy: '#2b6b45',
  buttonText: '#fff', spinner: '#fff', fieldBg: '#1c1f25', fieldText: '#fff', fieldBorder: '#2a2e36'
};

/* The text on the root layout's dev and guard bars (app/_layout.jsx:72, 92, 93).
   Their fills are pRed / pGreen already. */
const BANNER = { devText: '#fff', guardText: '#fff', guardNote: '#fff' };

/* ---------- DATA COLOUR TABLES — each source its own table, its exact strings ----------
   The pinned pure modules are never edited; their colours are mapped where
   they are drawn. */
// analytics.js PALETTE + groupColor()'s fallback — lowercase. T.group(g).
const GROUPS = {
  chest: '#d6252b', back: '#2e7fd9', legs: '#f0be1e',
  shoulders: '#2aa85c', arms: '#e8e5de', core: '#a8aeb8',
  fallback: '#8d939f'
};
// exercises.js GROUPS[g].color — UPPERCASE, and it stays uppercase. T.groupPlate(g).
const GROUP_PLATES = {
  chest: '#D6252B', back: '#2E7FD9', legs: '#F0BE1E',
  shoulders: '#2AA85C', arms: '#E8E5DE', core: '#A8AEB8'
};
// src/state/workout.js PLATES[].c, in PLATES order (45, 35, 25, 10, 5, 2.5 lb).
// A different set from GROUPS that happens to share values. T.plate(i).
const PLATES = ['#d6252b', '#2e7fd9', '#f0be1e', '#2aa85c', '#e8e5de', '#a8aeb8'];
// The six-plate mark, in draw order: Splash and the gate screens. T.mark.
const MARK = ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'];
// you/bits.jsx SUBJECT_COLOR + C_*: one hue per subject. T.subject(k).
// `fallback` is what every lookup's || draws for a subject it does not know
// (verdicts.jsx, T.subject('fallback')); T.subject(k) itself still answers
// undefined for a miss, as SUBJECT_COLOR[k] did.
const SUBJECTS = {
  fuel: 'pYellow', weight: 'pYellow', train: 'pBlue', steps: 'pWhite', water: 'pBlue',
  prot: 'pRed', carb: 'pYellow', fat: 'pBlue', all: 'chalk', fallback: 'steel'
};
// The Kpi `tint` prop (you/cards.jsx:129-163). T.kpi(k).
const KPI = {
  default: { color: 'steel', a: 0.14 },
  fuel:    { color: 'pYellow', a: 0.14 },
  weight:  { color: 'pYellow', a: 0.14 },
  train:   { color: 'pBlue', a: 0.14 },
  steps:   { color: 'pWhite', a: 0.14, exact: 'rgba(232,229,222,0.14)' }
};
// admin/sheets.jsx AI_SPLIT and PILL, you/admin.jsx FAMILIES (in order). T.admin.
const ADMIN = {
  aiSplit: { aiPhoto: 'pYellow', aiPhotoText: 'pRed', aiText: 'pBlue', aiRecall: 'pGreen' },
  families: ['pBlue', 'pYellow', 'pGreen', 'pChrome'],
  pill: { native: { owner: 'good', pro: 'pYellow', custom: 'pYellow', trial: 'warn', locked: 'bad', basic: 'dim' } },
  flag: { on: 'good', off: 'bad', lit: 'pBlue', warn: 'warn' }
};
// food/estimator.jsx CONF — the confidence dot. T.conf.
const CONF = { high: 'good', medium: 'warn', low: 'bad' };

/* The hero boxes a vibe may put a photo behind (V59 §6.7, §11) — never set
   rows, food rows, charts, stat rows or dense numbers — and where each is
   drawn (src/ui/HeroPhoto.jsx is the one layer they all use):
     youHero       the You greeting row             src/ui/you/Hero.jsx
     coachCard     the Coach card, inside its box   src/ui/coach/Card.jsx
     startWorkout  Start workout / Resume           app/(app)/(tabs)/workout/index.jsx (Btn photo)
     summaryHero   the recap's headline block       app/(app)/(tabs)/workout/summary.jsx
     fuelSummary   Fuel's big number, its top row   app/(app)/(tabs)/food.jsx
     stepsToday    Steps' today card                app/(app)/(tabs)/steps.jsx (Card photo)
     weightLog     Weight's log card                app/(app)/(tabs)/weight.jsx (Card photo)
   Each one has text on it, so each needs a scrim (build(), below). A vibe's
   other slots (the Vibes card's `thumb`, on the web) carry no such rule. */
export const HERO_SLOTS = Object.freeze(['youHero', 'coachCard', 'startWorkout', 'summaryHero', 'fuelSummary', 'stepsToday', 'weightLog']);

/* The shared building blocks that may branch per vibe (V59 §6.9). The v1
   branch of each is today's JSX, moved over unchanged. T.variant. The names
   each block accepts, and where its switch is, are src/ui/variant.js's. */
const VARIANTS = {
  card: 'v1', youCard: 'v1', sectionHeader: 'v1', eyebrow: 'v1',
  statRow: 'v1', btn: 'v1', chip: 'v1', segmented: 'v1', settingsRow: 'v1',
  sheetHost: 'v1', sheetTitle: 'v1', dock: 'v1', screenHeader: 'v1',
  kpi: 'v1', youHero: 'v1', coachCard: 'v1', chart: 'v1'
};

/* ---------- v1, in the definition's shape ---------- */
const V1 = {
  id: 'v1', scheme: 'dark', icons: 'v1', images: {}, variants: VARIANTS,
  colors: { ...colors, ...ROLE_COLORS },
  alpha: ALPHA, tint: TINT, type: TEXT, loadNum: LOAD_NUM, face: FACE, radius,
  shadow: SHADOW, scrim: SCRIM, chrome: CHROME, signIn: SIGN_IN, banner: BANNER,
  groups: GROUPS, groupPlates: GROUP_PLATES, plates: PLATES, mark: MARK,
  subjects: SUBJECTS, kpi: KPI, admin: ADMIN, conf: CONF
};

/* ---------- build ---------- */
const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
/* A role the trees spell differently holds { web, native } (colors.onDanger,
   admin.pill); this client takes the native side. Same test as
   vibes/defs/index.js sideOf(), which this file cannot import. */
const nativeOf = v => (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 &&
  Object.keys(v).every(k => k === 'web' || k === 'native')) ? v.native : v;

/* build(def[, assets]) -> a complete, fresh theme object for one vibe.
 *
 * `def` is a vibe definition (src/pure/vibes/defs/<id>.js, or V1 above).
 * `assets` is what a pure definition cannot hold, and src/state/vibe.js
 * passes from VIBE_DEFS: `images`, { slot: an image source } — the require()s
 * a vibe's photos need; and `fit`, the advance table of a vibe that measured
 * its own face for the fitted surfaces (T.fit, below). Nothing here reads a
 * module table except space, layout and motion, which no vibe sets and which
 * are copied, not shared, and MEASURED_FACE, which is Archivo on purpose.
 *
 * A colour role the def names but does not define THROWS, naming the def and
 * the path. A typo would otherwise paint type()'s chalk, or undefined, and a
 * wrong colour on screen is worse than a vibe that refuses to load —
 * src/state/vibe.js catches it and keeps the current look. */
export function build(def, assets) {
  const d = def || {};
  const who = 'vibe ' + (d.id || '?');

  /* colours */
  const C = {};
  for (const k of Object.keys(d.colors || {})) {
    const v = nativeOf(d.colors[k]);
    if (v !== undefined) C[k] = v;
  }
  // The legacy native keys whose only job is now a role (index.js ROLES `alias`).
  if (own(C, 'onAccent')) C.onYellow = C.onAccent;
  if (own(C, 'onDone')) C.onGreen = C.onDone;
  if (own(C, 'onDanger')) C.white = C.onDanger;
  if (own(C, 'accentPressed')) C.pYellowPressed = C.accentPressed;
  if (d.groups && own(d.groups, 'fallback')) C.fallback = d.groups.fallback;
  const role = (r, path) => {
    if (typeof r !== 'string' || !own(C, r)) throw new Error(who + ': ' + path + ' names colour role ' + JSON.stringify(r) + ', which it does not define');
    return C[r];
  };
  const roles = (table, path) => {
    const out = {};
    for (const k of Object.keys(table || {})) out[k] = role(table[k], path + '.' + k);
    return out;
  };

  const alpha = {};
  for (const k of Object.keys(d.alpha || {})) {
    const hex = role(d.alpha[k], 'alpha.' + k);
    alpha[k] = a => rgba(hex, a);
  }

  const tint = {};
  for (const k of Object.keys(d.tint || {})) {
    const t = d.tint[k];
    tint[k] = t.exact != null ? t.exact : rgba(role(t.color, 'tint.' + k), t.a);
  }

  /* shape */
  const R = {};
  for (const k of RADIUS_KEYS) if (d.radius && own(d.radius, k)) R[k] = d.radius[k];
  const S = { ...space };
  const M = { ...motion, bezier: [...motion.bezier] };
  const L = { ...layout };
  L.sheetMaxH = (h, i, tall) => h * (tall ? L.sheetTallPct : L.sheetMaxPct) - i.top;

  /* the face */
  const F = d.face || {};
  const bands = (F.bands || []).map(b => ({ ...b }));
  const bandOf = wdth => bands.find(b => (b.min == null || wdth >= b.min) && (b.max == null || wdth <= b.max)) || null;
  const pick = (b, k) => (b && b[k] != null ? b[k] : F[k]);
  const weightOf = (b, wght) => {
    const snap = pick(b, 'snap');
    if (snap && own(snap, wght)) return snap[wght];
    const list = pick(b, 'weights');
    if (list && list.length) {
      return list.reduce((best, w) => {
        const dw = Math.abs(w - wght), db = Math.abs(best - wght);
        return dw < db || (dw === db && w > best) ? w : best;
      }, list[0]);
    }
    const step = pick(b, 'step') || 100;
    return Math.round(wght / step) * step;
  };
  const face = (wdth = 100, wght = 400) => {
    const b = bandOf(wdth);
    return `${pick(b, 'family')}_${weightOf(b, wght)}`;
  };
  const minLhOf = wdth => pick(bandOf(wdth), 'minLh');
  /* Every face this vibe can draw: the family's, each band's, and the face
     the system-font sites take when the vibe names one (chrome.systemFace).
     src/state/vibe.js refuses to put a vibe on until each is registered. */
  const sysFace = d.chrome && d.chrome.systemFace ? [d.chrome.systemFace] : [];
  const fonts = { keys: [...new Set([...(F.keys || []), ...bands.flatMap(b => b.keys || []), ...sysFace])] };

  /* THE DEFAULT COLOUR IS CHALK, AND THAT IS THE PORT OF AN INHERITANCE RULE.
     rack.css:53-57 sets `html, body { color: var(--chalk) }`, so on the web every
     element paints chalk unless a rule overrides it — and a good many rules
     deliberately declare no colour of their own: `.you-greet` :1845,
     `.headline-v` :1614, `.kpi-val` :1566, `.stat-val` :331, `.mini-stat-v`
     :1694, `.timer` :390, `.load-num` :165, `.btn-lg` :200, `.ob-num-v`
     auth.css:217. All nine compute to chalk.

     RN does NOT inherit colour across a View boundary — only from an enclosing
     <Text> — so `...(color ? { color } : null)` emitted NO colour key for those,
     and RN's own default for Text is BLACK. On a #14161a background that is
     invisible: no error, no warning, a clean `expo export`, and a greeting you
     cannot read. It shipped exactly that way; see M7-M10-REPORT.md §14.

     Defaulting here rather than adding `color: chalk` to each preset is the
     point: it also covers the inline `T.type({...})` call sites, and it makes
     the omission unrepresentable rather than merely fixed. A style that wants
     a different colour still passes one, and a `{ color }` later in a style
     array still wins — every preset in this app is the FIRST entry of its
     array, which is what makes that safe. The default is THIS vibe's chalk:
     it closes over the def, so a vibe's ink follows into all 158 call sites.

     THE ONE TRADE: a <Text> nested inside another <Text> inherits colour in RN
     the way CSS does, and this default overrides that inheritance. There are
     currently zero nested Text elements in the tree — `tools/verify-text-color.mjs`
     counts them, and its canary proves the counter can see one. If you add a
     nested Text that must take its parent's colour, pass the colour explicitly. */
  const chalk = role('chalk', 'type()');
  // em -> points for letterSpacing, ratio -> points for lineHeight, both here.
  // One style for a face: this vibe's (type) or the measured one (fit.type).
  const typeIn = (faceOf, minLhAt) => ({ size, wdth = 100, wght = 400, ls = 0, lh,
                                         color = chalk, upper, tnum }) => ({
    fontFamily: faceOf(wdth, wght),
    fontSize: size,
    letterSpacing: ls * size,                      // CSS em -> RN points
    // The CSS ratio, but never below what the glyphs actually need. Math.round
    // alone is not enough: 28 x 1.088 is 30.46 and rounds DOWN to 30, one point
    // short, which clips just as visibly as being ten short.
    ...(lh ? { lineHeight: Math.max(Math.round(size * lh), Math.ceil(size * minLhAt(wdth))) } : null),
    ...(color ? { color } : null),
    ...(upper ? { textTransform: 'uppercase' } : null),
    ...(tnum ? { fontVariant: ['tabular-nums'] } : null)
  });
  const type = typeIn(face, minLhOf);

  /* THE MEASURED SURFACES (MEASURED_FACE, above). T.fit.face / T.fit.type draw
     them: Archivo, in this vibe's colours, unless the vibe measured its own
     face — assets.fit, { face: { chars, line, why }, pad?, border?, type? },
     generated from its vendored TTFs with tools/lib/ttf-advance.mjs (vibe.js
     VIBE_DEFS carries it; a pure definition cannot, the contract has no such
     key). Then they draw in the vibe's face, T.fit.metrics hands that table to
     coach-view.js, and the vibe must pass verify-coach-surface, verify-your-goal
     and verify-feel in itself. null in v1: every pure default holds, and
     fit.type is type().
     T.fit.archivo.face / .type: the estimate row and the movement chips, whose
     code takes no table — Archivo in every vibe, measured table or not, so
     verify-estimate-row and verify-custom-movement hold in all of them. In v1
     they too are face / type. */
  const fitIn = assets && assets.fit && typeof assets.fit === 'object' ? assets.fit : null;
  const fitMetrics = fitIn ? {
    ...(fitIn.face ? { face: { chars: fitIn.face.chars, line: [...fitIn.face.line], why: [...fitIn.face.why] } } : null),
    ...(fitIn.pad != null ? { pad: fitIn.pad } : null),
    ...(fitIn.border != null ? { border: fitIn.border } : null),
    ...(fitIn.type ? { type: Object.fromEntries(Object.keys(fitIn.type).map(k => [k, { ...fitIn.type[k] }])) } : null)
  } : null;
  const MF = MEASURED_FACE;
  const measured = (wdth = 100, wght = 400) =>
    `${MF.family}_${own(MF.snap, wght) ? MF.snap[wght] : Math.round(wght / MF.step) * MF.step}`;
  const fitFace = fitMetrics ? face : measured;
  const archivoType = typeIn(measured, () => MF.minLh);
  const fit = { metrics: fitMetrics, face: fitFace, type: fitMetrics ? typeIn(face, minLhOf) : archivoType,
                archivo: { face: measured, type: archivoType } };
  // A preset's arguments with its colour role resolved; no role, no key.
  const argsOf = (args, path) => {
    const { color, ...rest } = args || {};
    return color === undefined ? rest : { ...rest, color: role(color, path + '.color') };
  };

  /* .load-num — rack.css:165-170, "the signature numeral treatment: wide +
   * heavy, stamped like a plate".
   *
   * A FUNCTION, not an entry in `text`, because THE CSS RULE SETS NO FONT-SIZE.
   * It is a treatment applied at whatever size the call site picks —
   * weight.js:281 uses 28px and weight.js:280 uses 32px — and §6.1 invented a
   * `size: 20` purely so type() had something to multiply by.
   *
   * That invention is what put a 32pt number in a 19pt box: a preset baked at
   * size 20 carries lineHeight 19 and letterSpacing -0.4, and a call site that
   * overrides only fontSize keeps both. Taking the size as an argument makes
   * that impossible — lineHeight and the em-derived tracking are always computed
   * from the size actually being rendered.
   *
   * GENERAL TRAP, worth knowing before adding the next one: spreading any
   * fixed-size preset with a different fontSize leaves BOTH its lineHeight and
   * its letterSpacing behind at the old size. body/note/youGreet are the ones
   * with a lineHeight to go stale. If you need one at another size, give it the
   * same treatment as this. */
  const loadArgs = argsOf(d.loadNum, 'loadNum');
  const loadNum = size => type({ size, ...loadArgs });

  const text = {};
  for (const k of Object.keys(d.type || {})) {
    if (k === 'mono') continue;
    text[k] = type(argsOf(d.type[k], 'type.' + k));
  }
  if (d.type && d.type.mono) {
    const m = d.type.mono;
    if (!F.mono) throw new Error(who + ': type.mono needs face.mono, its family');
    text.mono = { fontFamily: typeof F.mono === 'string' ? F.mono : Platform.select(F.mono), fontSize: m.size,
                  color: role(m.color, 'type.mono.color') };
  }

  /* chrome */
  const ch = d.chrome || {};
  const chrome = {
    statusBar: ch.statusBar, keyboard: ch.keyboard, blurTint: ch.blurTint, shadow: ch.shadow,
    datePicker: ch.datePicker, camera: ch.camera, systemFace: ch.systemFace == null ? null : ch.systemFace,
    blurIntensity: d.scrim && d.scrim.dock && d.scrim.dock.native ? d.scrim.dock.native.intensity : undefined
  };
  // Spread at a system-font Text site: null (nothing at all) in v1.
  const systemFace = chrome.systemFace ? { fontFamily: chrome.systemFace } : null;
  /* Spread at a DateTimePicker that names no themeVariant and so takes the
     app-wide appearance (weight.jsx's; session.jsx's names chrome.datePicker
     itself). null — no key at all — while the vibe's pickers are the app's,
     as v1's are; { themeVariant } when a light vibe needs a light picker on a
     dark-appearance app (V59 §10). */
  const pickerTheme = chrome.datePicker && chrome.datePicker !== APPEARANCE ? { themeVariant: chrome.datePicker } : null;

  /* A style fragment per shadow site: shadowColor, shadowOpacity, shadowRadius,
     shadowOffset and, where the site has one, elevation. */
  const shadow = {};
  for (const k of Object.keys(d.shadow || {})) {
    const n = d.shadow[k] && d.shadow[k].native;
    if (!n) continue;
    shadow[k] = { shadowColor: chrome.shadow, shadowOpacity: n.opacity, shadowRadius: n.radius,
                  shadowOffset: { width: n.x, height: n.y },
                  ...(n.elevation != null ? { elevation: n.elevation } : null) };
  }

  /* expo-linear-gradient props for the tour's scrim. A vibe gives stops;
     native holds the last one to the bottom, as v1's three strings do. */
  const scrim = {};
  const tour = d.scrim && d.scrim.tour;
  if (tour) {
    const n = tour.native || {};
    scrim.tour = n.exact
      ? { colors: [...n.exact], locations: [...n.locations] }
      : { colors: [...tour.stops.map((s, i) => rgba(role(s.color, 'scrim.tour.stops.' + i), s.a)),
                   rgba(role(tour.stops[tour.stops.length - 1].color, 'scrim.tour.stops'), tour.stops[tour.stops.length - 1].a)],
          locations: [...tour.stops.map(s => s.at), 1] };
  }

  /* the data tables, as lookups with each source's own miss */
  /* groupColor(g) exactly, `PALETTE[g] || '#8d939f'` over a plain object — an
     inherited Object member included (a stored group named 'constructor'
     paints what build 58 painted). No own() here, unlike the lookups below:
     v1 is build 58 to the prop, and guarding it would be a behaviour change. */
  const G = { ...d.groups };
  const group = g => G[g] || G.fallback;                          // groupColor(g)
  const GP = { ...d.groupPlates };
  const groupPlate = g => (own(GP, g) ? GP[g] : undefined);       // (GROUPS[g] || {}).color
  const PL = [...(d.plates || [])];
  const plate = i => PL[i];                                       // PLATES[i].c
  const mark = (d.mark || []).map((r, i) => role(r, 'mark.' + i));
  const SU = roles(d.subjects, 'subjects');
  const subject = k => (own(SU, k) ? SU[k] : undefined);          // SUBJECT_COLOR[k], C_*
  const K = {};
  for (const k of Object.keys(d.kpi || {})) {
    const t = d.kpi[k];
    K[k] = t.exact != null ? t.exact : rgba(role(t.color, 'kpi.' + k), t.a);
  }
  const kpi = k => (own(K, k) ? K[k] : undefined);                // the Kpi tint prop
  const A = d.admin || {};
  const admin = {
    aiSplit: roles(A.aiSplit, 'admin.aiSplit'),
    families: (A.families || []).map((r, i) => role(r, 'admin.families.' + i)),
    pill: roles(nativeOf(A.pill), 'admin.pill'),
    flag: roles(A.flag, 'admin.flag')
  };
  const conf = roles(d.conf, 'conf');

  /* THE PHOTO SLOTS (V59 §6.7, §11). A slot is named by the definition —
     images.<slot> is a file name, or { file, focal: { x, y }, scrim } — and
     drawn only where this client has the file: assets.images.<slot>, the
     require()d source vibe.js's VIBE_DEFS carries (Metro resolves only a
     literal require, which a pure definition cannot hold). A slot the
     definition names that has no source here is no photo, not an error.

     T.images.<slot> / T.image(slot): { source, focal, scrim } or null.
       focal  the point of the picture that must stay in the box however it
              is cropped, as fractions of its width and height; the centre
              when not given. src/ui/HeroPhoto.jsx crops around it.
       scrim  expo-linear-gradient's { colors, locations, start, end }, from
              { dir, stops: [{ color: role, a, at }] } — the tour scrim's
              shape. Every HERO slot has text on it, so a hero photo with no
              scrim will not build: a picture nobody measured for contrast
              is a sentence nobody can read (§11, 4.5:1 on the real pixels).
     null in v1, and a box with no photo draws exactly the tree it always
     did. */
  const DIRS = { 'to bottom': [0.5, 0, 0.5, 1], 'to top': [0.5, 1, 0.5, 0],
                 'to right': [0, 0.5, 1, 0.5], 'to left': [1, 0.5, 0, 0.5] };
  const scrimOf = (sc, path) => {
    const dir = DIRS[sc.dir == null ? 'to bottom' : sc.dir];
    const stops = Array.isArray(sc.stops) ? sc.stops : [];
    if (!dir) throw new Error(who + ': ' + path + '.dir ' + JSON.stringify(sc.dir) + ' is not one of ' + Object.keys(DIRS).join(', '));
    if (!stops.length || stops.some((s, i) => !s || !(s.a >= 0 && s.a <= 1) || !(s.at >= 0 && s.at <= 1) || (i && s.at < stops[i - 1].at))) {
      throw new Error(who + ': ' + path + '.stops must be [{ color, a, at }], a and at in 0..1, at in order');
    }
    const one = stops.length === 1;
    const colors = stops.map((s, i) => rgba(role(s.color, path + '.stops.' + i + '.color'), s.a));
    return { colors: one ? [colors[0], colors[0]] : colors, locations: one ? [0, 1] : stops.map(s => s.at),
             start: { x: dir[0], y: dir[1] }, end: { x: dir[2], y: dir[3] } };
  };
  const unit = (v, d) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
  const sources = (assets && assets.images) || {};
  const images = {};
  for (const slot of Object.keys(d.images || {})) {
    if (!own(sources, slot) || !sources[slot]) continue;
    const e = d.images[slot];
    const o = e && typeof e === 'object' ? e : {};
    const scrim = o.scrim ? scrimOf(o.scrim, 'images.' + slot + '.scrim') : null;
    if (!scrim && HERO_SLOTS.includes(slot)) throw new Error(who + ': images.' + slot + ' is a hero photo, behind text, and has no scrim');
    images[slot] = { source: sources[slot], focal: { x: unit(o.focal && o.focal.x, 0.5), y: unit(o.focal && o.focal.y, 0.5) }, scrim };
  }
  const image = slot => (own(images, slot) ? images[slot] : null);

  /* The hand-rolled card Views (V59 §6.8): a card's skin without its padding
     or margins, which is why they are not <Card>. v1 is Card.jsx's exact
     background, 1pt border and radius. { radius: key or points, border: false }. */
  const cardSkin = (o = {}) => ({
    backgroundColor: C.bar,
    ...(o.border === false ? null : { borderWidth: 1, borderColor: C.collar }),
    borderRadius: typeof o.radius === 'number' ? o.radius : R[o.radius || 'r']
  });

  return {
    colors: C, alpha, tint, space: S, radius: R, layout: L, motion: M, face, type, text, loadNum, fit,
    id: d.id, scheme: d.scheme || 'dark', variant: { ...d.variants }, images, image, fonts,
    chrome, systemFace, pickerTheme, shadow, scrim, signIn: { ...d.signIn }, banner: { ...d.banner },
    group, groupPlate, plate, mark, subject, kpi, admin, conf, cardSkin
  };
}

/* The one T, built from v1 at import — exactly build 58. */
const T = build(V1);

/* applyTheme(obj) -> T, wearing obj. `obj` is a fresh build(); T's top-level
   properties are REASSIGNED to its tables, and nothing T held before is
   touched — a worklet that captured an old table keeps a table that never
   changes under it. An object missing any of T's keys is refused whole, so a
   half-applied look cannot happen. */
export function applyTheme(obj) {
  const missing = Object.keys(T).filter(k => !obj || !own(obj, k));
  if (missing.length) throw new Error('applyTheme: not a whole theme — missing ' + missing.join(', '));
  for (const k of Object.keys(obj)) T[k] = obj[k];
  return T;
}

/* v1, by name, for the verifiers that import this file directly. */
export const alpha = T.alpha;
export const tint = T.tint;
export const face = T.face;
export const type = T.type;
export const loadNum = T.loadNum;
export const text = T.text;

export default T;
