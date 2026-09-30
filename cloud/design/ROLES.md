# Vibes: every token role, with v1's value

V59 Phase D.1 — 2026-09-27. For the concept agents.

- **Source:** `vibes/defs/v1.js` and `vibes/defs/index.js` (`ROLES`) at web `64303c7`. These are the same bytes as native `src/pure/vibes/defs/`.
- **A vibe fills every role below with its own value.** Colours are 6-digit hex.
- **Where a role lands:** the web custom property is given where it helps. `index.js` ROLES holds the full map, web and native.
- **The component looks** are in `design/VOCAB.md`.
- **Ratios** are WCAG 2.x contrast, computed for this page (`tools/d1-contrast.mjs`).

## Meta

| Role | v1 | Note |
|---|---|---|
| `id`, `name` | `v1`, `v1` | an id matches `^[a-z0-9][a-z0-9-]*$` and is at most 32 characters |
| `feel` | "The original Rack look." | |
| `experimental` | `false` | |
| `scheme` | `dark` | a vibe may be `light` (§10) |
| `icons` | `v1` | the set: `vibes/icons/<set>.js` |
| `images` | `{}` | no photo anywhere |
| `themeColor` | `#14161a` | the web's `<meta name="theme-color">` |
| `variants` | the 17 blocks, each `'v1'` | the names each block accepts are in VOCAB.md, which adds 12 blocks |

## Colours (43 keys in `colors`)

**Surfaces**

| Role | v1 | Web | Its job |
|---|---|---|---|
| `rack` | `#14161a` | `--rack` | the page: html and body, `#auth`, `#gate`, `#onboard`, every screen's root |
| `bar` | `#1c1f26` | `--bar` | card, sheet, field |
| `well` | `#14161a` | `--well` | the recessed surface inside a card: inputs, chips, KPI tiles, choice rows |
| `raised` | `#262a33` | `--raised` | a control up off the card: the plain button, the peek bar, the rest pill, set and step badges, a chosen option, the Coach bubble |
| `grip` | `#333844` | `--grip` | a fill one step above raised: the grab handle, a toggle's off track, the lit add tile's icon well and tag, trajectory dots, runway hatching |
| `track` | `#262a33` | `--track` | the empty part of a meter: bar, ring and chart-bar tracks, empty pips |
| `tileHero`, `tileLit` | `#1e1f1e`, `#17181a` | native only | the add tiles' accent washes, flattened |

**Lines**

| Role | v1 | Web | Its job |
|---|---|---|---|
| `collar` | `#262a33` | `--collar` | every 1px border and divider, chart grids, the rule after a section title. 1.15:1 on bar |
| `knurl` | `#333844` | `--knurl` | the edge of a raised thing (the sheet's top, the peek bar, the rest pill, the set check, a pressed tile) and the ring shadows. 1.41:1 on bar |

**Ink**

| Role | v1 | Web | Its job |
|---|---|---|---|
| `chalk` | `#f2f0eb` | `--chalk` | body text, and every native preset with no colour of its own. 14.48:1 on bar |
| `steel` | `#8d939f` | `--steel` | secondary text. 5.35:1 on bar |
| `dim` | `#5c6270` | `--dim` | labels, eyebrows, placeholders. **2.70:1 on bar**: fails 4.5 |
| `faint` | `#333844` | `--faint` | the faintest: an optional field's label, a blank meal's kcal, link underlines, a dimmed spark line |
| `inverse` | `#f2f0eb` | `--inverse` | the bright fill behind knockout ink: a chosen chip or segment, the toast |
| `knockout` | `#14161a` | `--knockout` | ink cut out of `inverse` |
| `calMark` | `#f2f0eb` | `--cal-mark` | the calorie bar's head, zone ticks and dashed target, and their guide swatches. Held white: "the white head" |

**Accent and state**

| Role | v1 | Web | Its job |
|---|---|---|---|
| `accent` | `#f0be1e` | `--accent` | the primary button, the dock mark, today, the FAB, chosen and on states, Coach's voice, the PR highlight. 9.49:1 on bar |
| `accentPressed` | `#d9a90f` | `--accent-press` | the FAB pressed |
| `onAccent` | `#141414` | `--ink` | ink on the accent |
| `focus` | `#f0be1e` | `--focus` | the focus ring and focus borders. The water preset row's focus border stays `pBlue` |
| `danger` | `#d6252b` | `--danger` | the destructive and the refused: the danger button, swipe to delete, errors, a rest run over |
| `onDanger` | web `#fff`, native `#ffffff` | `--on-danger` | a legacy split: v1 keeps both spellings |
| `done` | `#2aa85c` | `--done` | a set done, its tick, the rest line running |
| `onDone` | `#0d1a11` | `--ink-go` | the tick on a done check |
| `good`, `warn`, `bad` | `#2aa85c`, `#f0be1e`, `#d6252b` | `--good`, `--warn`, `--bad` | verdicts: deltas, goal met, the confidence dot |
| `onWarn` | `#141414` | native only | ink on the trial banner's solid warn bar |

**Data: the plates**

These are data colours, never chrome.

| Role | v1 | Web | Meaning |
|---|---|---|---|
| `pRed` | `#d6252b` | `--p-red` | chest, protein, gain. 3.27:1 on bar |
| `pBlue` | `#2e7fd9` | `--p-blue` | back, fat, water, training, cut, drop sets |
| `pYellow` | `#f0be1e` | `--p-yellow` | legs, carbs, the Fuel and Weight subject, maintain, the heat strip's trained day |
| `pGreen` | `#2aa85c` | `--p-green` | shoulders, steps |
| `pWhite` | `#e8e5de` | `--p-white` | arms, the Steps subject |
| `pChrome` | `#a8aeb8` | `--p-chrome` | core |
| `onPlate` | `#14161a` | `--ink-plate` | the number on a plate chip |

**Shade and lift**
- `shade` `#000000` sits under every shadow and scrim. On the web it is spent only through `--shade-rgb`.
- `lift` `#ffffff` is the white wash: a pressed row (`tint.rowPress`) and a delta pill at rest (`tint.pillBase`). On the web it is spent only through `--lift-rgb`.

**Native legacy keys**

These are aliases. A vibe sets the semantic role, and `build()` fills the key from it.

| Legacy key | v1 | Filled from | Exception |
|---|---|---|---|
| `onYellow` | `#141414` | `onAccent` | the trial banner's ink takes `onWarn` |
| `onGreen` | `#0d1a11` | `onDone` | |
| `white` | `#ffffff` | `onDanger` | |
| `pYellowPressed` | `#d9a90f` | `accentPressed` | |
| `fallback` | `#8d939f` | `groups.fallback` | |

## Alpha helpers (native `T.alpha`)

Each helper tints one colour role: `yellow` → pYellow, `red` → pRed, `blue` → pBlue, `green` → pGreen, `ground` → rack, `accent`, `danger`, `warn`.

AiWarn's two `alpha.yellow` sites are doing warn's job (`common.jsx:946-947`).

## Tints (28): a role at an alpha

- **Sets:** `setDone` done .07 · `setFlash` accent .28 · `tagW` pYellow .16 · `tagF` pRed .16 · `tagD` pBlue .16 · `dropRail` pBlue .45 · `dropAdd` pBlue .35.
- **Accent washes:** `pickSel` accent .08 · `block` accent .03 · `coachBase` accent .14 · `coachLow` accent .07 · `coachHigh` accent .38 · `reviewBg`\* accent .07 · `reviewBorder`\* accent .18.
- **Pressed and delta pills:** `rowPress`\* lift .04 · `pillBase`\* lift .05 · `pillUp` good .16 · `pillDown` bad .16 · `pillWarn` warn .16.
- **Calorie zones:** `zoneCut` pBlue .16 · `zoneHold` pYellow .18 · `zoneGain` pRed .16.
- **Glass and scrim:** `dockGlass`\* rack .82 · `wkBarGlass`\* rack .90 · `backdrop`\* shade .60.
- **Trajectory:** `trajGood`\* good .18 · `trajWarn`\* warn .18 · `trajBad`\* bad .18.

\* v1 also holds the legacy exact rgba string. Every other vibe gives the role and the alpha only.

## Type

On native these are `T.text` presets. On the web they are literal CSS rules.

"caps" is `upper: 1`, and every such string is authored in sentence case. A preset with no ink takes `chalk`.

| Preset | Size | wdth / wght | Other | Ink |
|---|---|---|---|---|
| `body` | 15 | 100 / 400 | lh 1.45 | chalk |
| `h1` / `h2` / `h3` | 26 / 18 / 15 | 78 / 800 | ls −.01 | chalk |
| `eyebrow` | 10 | 88 / 700 | caps, ls .16 | dim |
| `fieldLbl` | 10 | 88 / 700 | caps, ls .16 | dim |
| `statLbl` | 9 | 88 / 700 | caps, ls .10 | dim |
| `dockLbl` | 10 | 88 / 600 | caps, ls .07 | dim |
| `segBtn` | 11 | 92 / 700 | caps, ls .06 | steel |
| `chip` | 11 | 92 / 600 | | steel |
| `note` | 12 | — / 400 | lh 1.5 | dim |
| `btn` | 14 | 92 / 700 | ls .02 | chalk |
| `btnLg` | 16 | 92 / 700 | caps, ls .06 | the button kind's |
| `statVal` | 20 | 108 / 800 | lh 1, tnum | the caller's, or chalk |
| `kpiVal` | 22 | 108 / 800 | ls −.01, lh 1, tnum | chalk |
| `timer` | 22 | 112 / 800 | ls −.01, tnum | chalk |
| `headline` | 34 | 112 / 800 | ls −.02, lh 1, tnum | chalk |
| `youGreet` | 27 | 100 / 800 | ls −.02, lh 1.05 | chalk |
| `setInput` | 15 | 100 / 700 | tnum | chalk |
| `mono` | 12 | `face.mono` | | chalk |

`loadNum` is Rack's "stamped plate" numeral: wdth 118 / 800, ls −.02, lh .95, tnum. It is a function of size, and its sites pass 26–40.

## Face

- **Native:** family `Archivo`.
  - It loads four static files, `Archivo_400/600/700/800`.
  - Weights snap `{650 → 700, 750 → 800}`, in steps of 100.
  - `width` is 100: **native ignores wdth**.
  - `minLh` is 1.088, Archivo's hhea. A vibe's face brings its own.
  - The mono face is Menlo on iOS, `monospace` on Android.
- **Web:**
  - `--font` is `'Archivo', system-ui, -apple-system, sans-serif`.
  - `--font-mono` is `ui-monospace, monospace`.
  - The Archivo `@import` on rack.css line 1 stays.
  - A vibe's web face is variable with a `wght` axis, self-hosted latin woff2, at most 120 KB per family.
- **A vibe's native faces:** at most 4 static TTFs, the picker face included (§14).

## Radius

- **Both clients:** `r` 12, `sm` 8, `sheet` 18, `tile` 10, `pill` 999, `plate` 2, `chip` 3, `mark` 4, `idx` 5.
- **Web only:** `round` 50%, `hair` 1, `bubble` 14, `badge` 9.

## Shadows

Each is `x y blur` in `shade` at an alpha. On the web it becomes `--shadow-*`.

| Shadow | Web | Native |
|---|---|---|
| `peek` | 0 10 30 at .45 | elevation 12 |
| `rest` | 0 6 24 at .45 | elevation 10 |
| `toast` | 0 8 28 at .5 | radius 14, elevation 8 |
| `fab` | 0 8 26 at .58, plus 0 1 0 at .35 | the first layer only, elevation 12 |
| `fabPressed` | 0 3 10 at .5 | web only |
| `tourCard` | 0 18 50 at .55 | radius 25 |

**Rings, web only:**
- `calTick` rack .55 at 1px;
- `flame` accent .35, inset 1;
- `kpiDay` knurl, inset 1.2;
- `kpiDayOn` none;
- `kpiToday` well 1.5, plus steel 2.5;
- `kpiTodayOn` well 1.5, plus chalk 2.5;
- `guideEaten` knurl, inset 1;
- `trajGood` / `trajWarn` / `trajBad` 4px at .18;
- `tourLit` accent 2.

## Scrims and glass

| Surface | Web | Native |
|---|---|---|
| Sheet backdrop | `backdrop` plus `blur(3px)`. There is no `-webkit-` twin (fixed) | the tint only |
| Dock | `dockGlass` plus `blur(18px) saturate(140%)` | BlurView at intensity 40 |
| Workout bar | `wkBarGlass` plus `blur(16px)` | not blurred |
| Tour scrim | rack .55 → .94 at 42% | three stops |

## Native chrome

| Role | v1 | Note |
|---|---|---|
| `statusBar` | `light` | a light vibe sets `dark` |
| `keyboard` | `dark` | a light vibe sets `light` |
| `datePicker` | `dark` | a light vibe sets `light` |
| `blurTint` | `dark` | |
| `shadow` | `#000` | |
| `camera` | `#000` | also the web's `--video-bg` |
| `systemFace` | `null` | no `fontFamily` key at the system-font sites |

**Fixed:** every vibe holds v1's value.
- `appearance` `dark`;
- `launch` `#14161a`;
- `manifestTheme` `#14161a`;
- `webStatusBar` `black-translucent`.

The web's `colorScheme` is `null`.

## Native sign-in and banners (native only; they stay v1, §10)

- **signIn:** title `#fff`, sub, label and link `#8b929c`, placeholder `#5a616b`, error `#ff6b6b`, ok `#6fcf97`, button `#2aa85c`, buttonBusy `#2b6b45`, buttonText and spinner `#fff`, fieldBg `#1c1f25`, fieldText `#fff`, fieldBorder `#2a2e36`.
- **banner:** devText, guardText and guardNote, each `#fff`.

## Web-only tokens

- **Channels (15),** each generated from its colour: `--rack-rgb`, `--shade-rgb`, `--lift-rgb`, `--accent-rgb`, `--p-yellow-rgb`, `--warn-rgb`, `--p-red-rgb`, `--bad-rgb`, `--danger-rgb`, `--p-blue-rgb`, `--p-green-rgb`, `--done-rgb`, `--good-rgb`, `--p-white-rgb`, `--steel-rgb`.
- **Layout and motion (fixed):**
  - `--dock-h` 64px;
  - `--safe-top` (the safe-area inset);
  - `--top-gap` 10px;
  - `--app-top`;
  - `--pad` 16px;
  - `--ease` `cubic-bezier(.22,.61,.36,1)`;
  - `--fast` 140ms, `--med` 240ms.

## Tables

- **`groups`** is analytics.js's palette, lowercase. Each entry follows its role:
  - chest `#d6252b` (pRed), back `#2e7fd9` (pBlue), legs `#f0be1e` (pYellow), shoulders `#2aa85c` (pGreen), arms `#e8e5de` (pWhite), core `#a8aeb8` (pChrome);
  - the fallback `#8d939f` follows steel.
- **`groupPlates`** is exercises.js's GROUPS, the same six in UPPERCASE.
- **`plates`** holds the six plate colours in PLATES order, 45 / 35 / 25 / 10 / 5 / 2.5 lb: pRed, pBlue, pYellow, pGreen, pWhite, pChrome.
- **`importGroups`** (web only) names the same roles. Its fallback is `grip`.
- **`mark`,** the six-plate mark, is drawn in plate order.
- **`subjects`:**
  - fuel and weight → pYellow;
  - train and water → pBlue;
  - steps → pWhite;
  - protein → pRed, carbs → pYellow, fat → pBlue;
  - all → chalk; the fallback → steel.
- **`kpi`** corner tints are fuel and weight pYellow, train pBlue, steps pWhite, each at .14. The web also has a default, steel .14.
- **`admin`:**
  - the AI split is aiPhoto pYellow, aiPhotoText pRed, aiText pBlue, aiRecall pGreen;
  - the families are pBlue, pYellow, pGreen, pChrome;
  - the account pill's `web` side holds class names and its `native` side colours, because **the trees disagree**;
  - the flags are on → good, off → bad, lit → pBlue, warn → warn.
- **`conf`,** the estimator's confidence dot: high good, medium warn, low bad.

## What binds a vibe's values

- **Copy names these hues** (`HUE_NAMED`). A vibe keeps each role in its hue family, or a sentence turns false:
  - pBlue blue, pYellow yellow, pRed red;
  - calMark white;
  - good green, bad red;
  - dim grey;
  - warn amber.
- **The pinned analytics.js paints these,** on both clients, whatever a split role says (`PINNED_PAINT`):
  - the heat strip's trained day is pYellow and its untrained day collar;
  - the unlit spark bars are knurl;
  - a line's second series defaults to chalk;
  - a line, a ring and a sparkline default to pYellow;
  - a bar defaults to pBlue.
- **Only v1 may hold a legacy spelling** (`LEGACY_EXACT`: `#fff`, `#000`, the unspaced rgba strings).
- **Fixed roles** hold v1's value in every vibe: layout and motion, launch, manifest theme, the web status-bar meta, the appearance, the `-webkit-` twins.
- **v1 pairs a vibe may not make worse** (§13.1):
  - dim on bar, 2.70:1;
  - collar on bar, 1.15:1 (decorative);
  - the grab handle (grip) on bar, 1.41:1;
  - pRed as text on bar, 3.27:1.

  Any colour a vibe changes or adds must reach 4.5:1 for text and 3:1 for graphics.
- **Research asked for more roles than E0 added.** These are **not in v1.js**; a concept that needs one says so rather than inventing it:
  - `lead`, a surface for the one boxed card per tab (SYNTHESIS C17);
  - `band`, the dark web status strip for light vibes (R3.3);
  - `caution`, split from `accent` (C7);
  - a figure face (Q-E3).
- **D.1 proposes one addition:** the `shape` params for the looks (VOCAB.md §4).
