# Iron Age, concept B: "The Measurement Form"

V59 Phase D, design panel, slot `iron-age` (id `iron-age`, name **Iron Age**, feel line "Ink on cream, circa 1900."). One of three independent concepts for the slot; this one takes the angle **THE MEASUREMENT FORM**. Written 2026-09-27.

**How to read this.**
- Research keys are the synthesis's: `[T7 §4]`, `[T8a H.2]`, `SYNTHESIS C13`, `R2.5` and so on.
- **(computed)** marks a number this concept's own scripts produced tonight. They are read-only and re-runnable:
  - `node ~/dev/vibes-night/tools/iaB/palette.mjs` (every colour number here; output saved at `design/iron-age/scratch-B/palette-report.txt`);
  - `node ~/dev/vibes-night/tools/iaB/plates-opt2.mjs 4.5 120000 1904` (the plate search);
  - `node ~/dev/vibes-night/tools/iaB/measure.mjs` (text widths and glyph coverage, harfbuzz);
  - `node ~/dev/vibes-night/tools/iaB/render-icons.mjs design/iron-age/scratch-B/icons-B.mjs <out.png>` (the icon review sheet);
  - `node ~/dev/vibes-night/tools/t5-check.mjs <font>` (track 5's checker, re-run on the three font files named below).
- **(proposed)** marks something the contract does not have yet. Each one is listed again in §12.
- Nothing here is approved. Every image and trace named is `micah_approved: false`.

---

## 1. The name and the idea

**Name:** Iron Age, drawn as *The Measurement Form*.

**The idea, in two sentences.** Rack is drawn as the ruled record a gymnasium kept around 1900: the 1898 *Measurement Form*'s dotted leaders wherever a name meets a value, a double rule over every total, ATF brass rules instead of cards, and Fairbanks-style stamped nameplates for the numbers you read at a glance. It prints in two inks on scan-derived cream stock, one warm black and one madder red, with three real pre-1931 halftone plates tipped into the three roomiest boxes and engraved cuts from period catalogues for its icons.

**Why this angle fits Rack.** The *Measurement Form* is the nearest period ancestor of a lifting log [T7 §0.5, §8]. It is a page for writing numbers against names, which is what Rack's screens are. The form keeps every word where it is. It changes only how each name, value and total is drawn.

---

## 2. Ground, stock and inks (decisions this concept makes)

- **Stock: the `r2g` cream `#e6dec9`** [T4 GF3], not `#ede3cc`.
  - It clears the full 242-entry Tailwind guard (5.62 from `orange-100`), and the old stock does not (4.30). SYNTHESIS leaves this to Micah (Q-P3); this concept takes r2g.
  - It sits outside the AI-cream band R3.5: lowest channel `0xC9`, R−B 29. It is 4.83–9.33 ΔE00 from the five named AI creams (computed).
  - Its hue and chroma come from the calibrated LoC Trocadero capture [T7 §2.1, T4 GF3].
  - It is 81.3 ΔE00 from v1's ground (computed).
- **Grain: preset `fresh`** (σ 0.30 % luma, from *Physical Culture* 1908's blank leaf) [T7 G.2.2].
  - A specimen book or a printed form sits on that clean stock family (ATF 1912 measured 0.34 %), not on book stock [T7 G.2.1].
  - It costs text only ×1.019 of its contrast, so r2g stays safe. With `book` on r2g the accent's margin would be 0.02 (SYNTHESIS §5.6).
  - The darkest `fresh` pixel on r2g is **`#e3dcc7`** (computed, by scaling 07 G.2.3's measured darkest pixel per channel, the method `synth-grain-r2g.mjs` uses). The rendered tile must be re-measured.
- **Two inks and nothing louder.** Warm black `#1c1712` for all type, rules and keylines [T7 §3.1]. Madder carmine `#a1374f` is the one red [T4 GF2, SYNTHESIS C12], and it has one job (§3.3).
- **Plates re-built for text** (§3.4). Every group colour here reaches 4.5:1 as text on every ground, grain included. The research palette's ochre and pewter did not (4.18 and 4.10 on flat stock [T7 G.6]).

---

## 3. Every token role

All colours are 6-digit hex. Ratios are WCAG 2.x (computed). "Grain" means the darkest `fresh` pixel `#e3dcc7`.

### 3.1 Meta

| Role | Value | Note |
|---|---|---|
| `id`, `name` | `iron-age`, `Iron Age` | |
| `feel` | "Ink on cream, circa 1900." | 25 characters, one line on 375 pt [T10 §4.10] |
| `experimental` | `false` | |
| `scheme` | `light` | |
| `icons` | `iron-age` | `vibes/icons/iron-age.js`, §8 |
| `images` | `stepsToday`, `weightLog`, `summaryHero` | §7 |
| `themeColor` | `#14161a` | v1's. R3.3: leave the meta tags alone |
| `variants` | 29 blocks, §5 | |

### 3.2 Surfaces and lines

| Role | Hex | Job in this vibe | Measured |
|---|---|---|---|
| `rack` | `#e6dec9` | the stock; carries the `fresh` grain tile | ink 13.26 (12.98 on grain) |
| `bar` | `#ebe4ce` | sheets, inputs, the one lead box per tab; flat, no grain | 1.06 vs rack; ink 13.99 |
| `well` | `#e8ddd1` | KPI cells and in-card insets (the r2g `stock-2`) | ink 13.29, dim 5.52 |
| `raised` | `#dad4bf` | plain buttons, the Coach bubble, set/step badges where v1 draws one, chosen option rows. Ink 8 % over bar | ink 11.99, steel 6.91, dim 4.98 |
| `grip` | `#7b6c52` | the sheet grab handle, a toggle's off track | 4.02 vs bar (R8.5 needs 3:1) |
| `track` | `#d3c9b2` | the empty part of a meter | fills on it: 3.83–11.12 |
| `tileHero`, `tileLit` | `#ebe4ce`, `#ebe4ce` | native flat add-tile washes; the `ruled` add tiles draw no wash | |
| `collar` | `#bfb293` | decorative hairlines left in v1 geometry, chart grids, the heat strip's untrained day | 1.65 on bar (decorative, R2.2) |
| `knurl` | `#7b6c52` | control edges, ring shadows, unlit spark bars | 3.81 rack, 4.02 bar |

### 3.3 Ink, accent and state

| Role | Hex | Job | Measured |
|---|---|---|---|
| `chalk` | `#1c1712` | all primary type, every drawn rule and keyline | 12.98–15.60 on every surface |
| `steel` | `#4a3f31` | labels, meta, units | 7.49 grain, 6.91 raised |
| `dim` | `#5a554d` | placeholders, notes, leader dots, sub-lines. A near-neutral grey (OKLCH C 0.014), so "grey = flat" copy stays true (HUE_NAMED) | 5.39 grain, 4.98 raised |
| `faint` | `#5a554d` | = dim. Its sites are text (an optional field's label, a blank meal's kcal), so it may not go fainter | 5.39 grain |
| `inverse` | `#1c1712` | the ink fill behind knockout words: chosen chip and segment, toast, primary button, FAB | |
| `knockout` | `#ebe4ce` | words cut out of ink | 13.99 on ink |
| `calMark` | `#fffcf2` | "the white head": paper-white, always edged by a 1 pt ink keyline (`shadow.calTick`), as a period white plate had to be drawn [T7 §3.2] | keyline 17.33 |
| `accent` | `#a1374f` | **one job: the red rubric.** Coach's voice (mark, COACH, COACH ME, chevron), today's calendar numeral, focus, a record, the Photo add tile's icon. Never a button fill | 4.83 grain, 5.20 bar |
| `accentPressed` | `#8e3548` | v1 spends it only on the FAB's `:active` fill. `fab · inverse` draws the FAB in ink, so here it is kept for completeness [T4 GF2] | onAccent on it 6.59 |
| `onAccent` | `#f4eedf` | ink on an accent fill (v1's `.badge`) | 5.71 |
| `focus` | `#a1374f` | focus ring, and a focused field's 2 pt rule | 4.83 grain |
| `danger` | `#772020` | the destructive: danger keyline and words, swipe to delete, errors, rest over | 7.62 grain, 8.21 bar |
| `onDanger` | `#f4eedf` | words on the swipe-delete panel | 9.02 |
| `done` | `#1c1712` | **a done set is inked in**: the tick box filled black; the rest line while it runs | 13.99 vs bar |
| `onDone` | `#ebe4ce` | the tick cut out of the inked box | 13.99 |
| `good` | `#016d50` | verdicts: goal met, the delta that moves the right way | 4.64 grain, 4.75 well |
| `warn` | `#6e4d08` | the caution line, the notice mark, the trial bar | 5.62 grain |
| `bad` | `#772020` | the delta the wrong way | 7.62 grain |
| `onWarn` | `#f4eedf` | native trial bar's ink on solid warn | 6.65 |
| `shade` | `#1c1712` | under every scrim; there are no drop shadows | |
| `lift` | `#1c1712` | the pressed-row wash (at .05) | |
| `band` **(proposed)** | `#1c1712` | the web's fixed strip at `top: 0`, height `var(--safe-top)` (R3.3) | white 17.79 |

Native legacy aliases follow their roles: `onYellow` = onAccent `#f4eedf` (the trial banner takes `onWarn`), `onGreen` = onDone `#ebe4ce`, `white` = onDanger `#f4eedf`, `pYellowPressed` = accentPressed `#8e3548`, `fallback` = steel `#4a3f31`.

### 3.4 The plates (data colours)

Built tonight by a seeded search (`plates-opt2.mjs`, seed 1904, then hand-nudged): each plate stays in its hue family, and each reaches ≥ 4.5:1 as text on rack, the grain's darkest pixel, bar and well. Then the worst pairwise ΔE00 under normal vision, deuteranopia and protanopia is maximised.

| Role | Hex | OKLCH L C h | Reads as | On grain / bar | Deutan | Protan |
|---|---|---|---|---|---|---|
| `pRed` chest, protein, gain | `#772020` | 0.384 0.121 24.9 | Indian red | 7.62 / 8.21 | `#4e461d` | `#39341f` |
| `pBlue` back, fat, water, cut | `#2b6189` | 0.475 0.086 243.5 | Prussian blue | 4.83 / 5.21 | `#425988` | `#4f628b` |
| `pYellow` legs, carbs, fuel and weight subject | `#785c00` | 0.490 0.100 87.9 | ochre / mustard | 4.60 / 4.96 | `#706308` | `#695b00` |
| `pGreen` shoulders, steps | `#016d50` | 0.475 0.097 166.7 | viridian | 4.64 / 5.00 | `#5f5c52` | `#6a644e` |
| `pWhite` arms, the steps subject | `#181412` | 0.195 0.008 48.3 | ink: the white plate drawn in ink [T7 §3.2] | 13.36 / 14.40 | `#161512` | `#151412` |
| `pChrome` core | `#3a4450` | 0.382 0.024 253.1 | iron | 7.22 / 7.78 | `#3d4250` | `#404451` |
| `onPlate` | `#f4eedf` | | figures on a filled plate | 5.45–15.81 on all six | | |

- **Minimum pairwise ΔE00 (computed): normal 14.0, deuteranopia 12.9 (chest/legs), protanopia 13.8 (chest/arms).** That clears R2.5's 12. Research IA cream is 12.6; v1 is 10.9.
- **Good against bad (computed):** 53.2 normal, 13.7 deuteranopia (ΔL\* 9.4), 16.4 protanopia (ΔL\* 20.7). Every delta keeps its arrow (R2.6).
- **Accent to its nearest data or status colour (computed):** 13.4 normal (chest), so R2.4's 10 holds. Under CVD it is 6.9 deuteranopia (shoulders) and 8.1 protanopia (core). Today and the Coach voice also carry a keyline or words, so no meaning rides on that pair.
- **As graphics on track (computed):** 3.83 (pYellow) to 11.12. The meter fills clear 3:1.
- **Tables follow the roles** (index.js `follows`):
  - `groups`: chest `#772020`, back `#2b6189`, legs `#785c00`, shoulders `#016d50`, arms `#181412`, core `#3a4450`, fallback `#4a3f31`;
  - `groupPlates`: the same, uppercase: `#772020 #2B6189 #785C00 #016D50 #181412 #3A4450`;
  - `plates` (45, 35, 25, 10, 5, 2.5 lb): pRed, pBlue, pYellow, pGreen, pWhite, pChrome;
  - `importGroups` and `mark` name the same roles, and the importer's fallback is `grip`;
  - `subjects`, `kpi`, `admin`, `conf` name v1's roles unchanged.

**The honest cost.** A text-safe yellow on cream has to be dark, so pYellow reads as mustard, and warn `#6e4d08` reads as a dark amber. Two shipped sentences name these hues ("The yellow line…", you.js:1067; "amber the other way"). Whether mustard still reads as "yellow" is a judgement for Micah (§13). The alternative is research's `#90620b`. It is brighter, but it is graphics-only (4.18 as text on flat stock), and every text site would then need re-mapping.

### 3.5 Alpha helpers and tints

- **`alpha`:** v1's map unchanged (yellow→pYellow, red→pRed, blue→pBlue, green→pGreen, ground→rack, accent, danger, warn).
- **The 28 tints** (role, alpha; "flattened" means over bar and over rack, computed):

| Tint | Role, α | Flattened | Why |
|---|---|---|---|
| `setDone` | calMark .50 | `#f5f0e0` / `#f3edde` | **a done row becomes a clean paper strip**, not a green wash. A green wash dropped the W badge's ochre to 4.30; on the strip it reads 5.40 |
| `setFlash` | accent .28 | `#d6b4aa` | ink on it 9.29 |
| `tagW` / `tagF` / `tagD` | pYellow .14 / pRed .12 / pBlue .12 | | only where a v1 badge ground survives |
| `dropRail` | pBlue 1.0 | `#2b6189` | a solid 2 pt Prussian rail, 4.83 on grain |
| `dropAdd` | pBlue .60 | `#7895a5` | the + Drop keyline (it has words, so no 3:1 is needed) |
| `pickSel` | accent .05 | `#e3d6c3` | accent on it 4.62 |
| `block` | accent .04 | | a lifting block's ground |
| `coachBase` / `coachLow` / `coachHigh` | accent .14 / .07 / .38 | high `#cfa29e` | ink on the pulse peak 7.89 |
| `rowPress` | lift (ink) .05 | `#e1dac5` | ink 12.74 |
| `pillBase`, `pillUp`, `pillDown`, `pillWarn` | 0 | | **no delta pills** (R6.6): bare signed text with its arrow |
| `zoneCut` / `zoneHold` / `zoneGain` | pBlue .14 / pYellow .16 / pRed .14 | | the blue / yellow / red zones stay in their hues (HUE_NAMED) |
| `dockGlass` | rack 1.0 | | an opaque dock |
| `wkBarGlass` | bar 1.0 | | an opaque workout bar |
| `backdrop` | shade .45 | `#8b8477` | an ink wash under sheets (R3.3: .40–.45) |
| `trajGood` / `trajWarn` / `trajBad` | good / warn / bad .16 | | |
| `reviewBg` / `reviewBorder` | accent .07 / .35 | | ink on reviewBg 12.70 |

### 3.6 Radius, shadows, scrims

- **`radius`:** `r` 0, `sm` 0, `sheet` 0, `tile` 0, `plate` 0, `chip` 0, `mark` 0, `idx` 0, `hair` 0, `bubble` 0, `badge` 0, `round` '50%', `pill` 999.
  - Every box is square [T7 §9].
  - `round` stays for the avatar cameo and the day dots.
  - `pill` stays only where no look re-draws the shape: the toggle's slot. The looks square chips, segmented controls, the toast, the FAB and the rest pill.
- **`shadow`:** every elevation is `[]` on web and `{ opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 }` on native: peek, rest, toast, fab, fabPressed, tourCard. Print has no drop shadows; floating surfaces take a 1 pt ink keyline instead.
  - Rings: `calTick` chalk spread 1 (the white head's keyline); `flame` accent .35 inset 1; `kpiDay` knurl inset 1; `kpiDayOn` []; `kpiToday` well 1.5 + chalk 2.5; `kpiTodayOn` the same; `guideEaten` knurl inset 1; `trajGood` / `trajWarn` / `trajBad` 4 at .16; `tourLit` accent 2.
- **`scrim`:**
  - `sheet`: backdrop, `filter: 'none'`;
  - `dock`: dockGlass, `filter: 'none'`, native intensity 0;
  - `wkBar`: wkBarGlass, `filter: 'none'`;
  - the `webkit` flags keep v1's values (fixed roles);
  - `tour`: to bottom, rack .70 at 0 → rack .94 at .42. It is a cream fog; the tour card is keylined.
  - No blur anywhere (R7.2).

### 3.7 Native chrome, sign-in, banners

- **`chrome`:** `statusBar` 'dark', `keyboard` 'light', `datePicker` 'light', `blurTint` 'light', `shadow` '#1c1712', `camera` '#000000', `systemFace` null, `colorScheme` 'light' (web form controls).
  - Fixed, v1's values: `appearance` 'dark', `launch` '#14161a', `manifestTheme` '#14161a', `webStatusBar` 'black-translucent'.
- **`signIn`:** v1's values in 6-digit spelling (`#ffffff`, `#8b929c`, `#5a616b`, `#ff6b6b`, `#6fcf97`, `#2aa85c`, `#2b6b45`, `#1c1f25`, `#2a2e36`).
  - Native sign-in draws before any account, so before any vibe, is known. It is always v1's (§10).
- **`banner`:** `#ffffff` ×3. It sits on this vibe's pRed and pGreen fills: 10.44 and 6.35 (computed).
- **`web.rgb`** names v1's 15 channels unchanged. **`web.root`** is fixed.

### 3.8 Type

**Faces:**
- **Archivo** (v1's) for body, labels, values, units, every delta and arrowed string, buttons, chips, and the Coach card.
- **Besley v4** (upstream) for heads: h1–h3, eyebrows, the greeting, exercise names, set-table column heads, and the picker numeral.
- **Archivo Condensed** (`wdth` 75) for the one stamped figure: `headline`, `loadNum`, and the timer.

Weight is set only through `font-variation-settings`. Every string is in its authored case: **this vibe has no caps role and no tracking**. The one exception is inherited: the Coach card keeps v1's type (VOCAB `coachCard` keeps), so COACH stays as v1 draws it. 'COACH ME' is authored in capitals.

| Preset | Face | Size | wdth / wght | Other | Ink |
|---|---|---|---|---|---|
| `body` | Archivo | 15 | 100 / 400 | lh 1.45 | chalk |
| `h1` | Besley | 24 | 100 / 800 | lh 1.1 (web); native floors at Besley's minLh | chalk |
| `h2` | Besley | 19 | 100 / 700 | lh 1.15 | chalk |
| `h3` | Besley | 17 | 100 / 700 | lh 1.2 | chalk |
| `eyebrow` | Besley | 14 | 100 / 600 | upper 0, ls 0 | steel |
| `fieldLbl` | Archivo | 13 | 100 / 600 | upper 0, ls 0 | steel |
| `statLbl` | Archivo | 13 | 100 / 500 | upper 0, ls 0 | steel |
| `dockLbl` | Archivo | 11 | 100 / 600 (active 800) | upper 0, ls 0 | dim; active chalk |
| `segBtn` | Archivo | 12 | 92 / 600 | upper 0, ls 0 | steel; chosen knockout |
| `chip` | Archivo | 13 | 92 / 600 | | steel; chosen knockout |
| `note` | Archivo | 13 | 100 / 400 | lh 1.5 | dim |
| `btn` | Archivo | 15 | 92 / 700 | ls .01 | chalk |
| `btnLg` | Archivo | 16 | 92 / 700 | upper 0, ls .02 | the kind's |
| `statVal` | Archivo | 17 | 100 / 700 | lh 1, tnum | the caller's, or chalk |
| `kpiVal` | Archivo | 22 | 100 / 800 | lh 1, tnum | chalk |
| `timer` | Archivo Condensed | 22 | 75 / 800 | tnum | chalk |
| `headline` | Archivo Condensed | 30 | 75 / 800 | ls 0, lh 1, tnum | chalk (the caller's colour kept) |
| `youGreet` | Besley | 26 | 100 / 800 | lh 1.1 | chalk; the name is **not** accented (R5.4) |
| `setInput` | Archivo | 16 | 100 / 700 | tnum | chalk |
| `mono` | v1's | 12 | | | chalk |
| `loadNum` | Archivo Condensed | (the site's 26–40) | 75 / 800 | ls 0, lh .95, tnum | the site's |

Literal sites (settings row, list rows, chart text, day cells, the badge, e1RM, plate chips) keep v1's sizes, with three changes:
- **nothing under 11 pt:** 9 and 10 pt labels go to 12, and chart axis text goes to 11;
- **no caps transform anywhere;**
- **Archivo carries every one.**

**Units** follow the number on its baseline at 0.45× the figure, in Archivo 600 steel, in their authored lowercase: "lb", "kcal / day" (R5.3, T7 §6.3).

**Why no small caps, though the angle offered them.** The column heads include the unit ("lb"), and R5.2 forbids uppercasing a unit. Native `small-caps` is unverified (Q-D3). And the parity check compares each component's resolved family on both clients (§13.5), so a web-only Besley small-caps head would fail it. Sentence-case Besley over a 1 pt rule gives the form's column head without any of those risks.

### 3.9 Shape params (VOCAB §4)

| Param | Value | Read by |
|---|---|---|
| `shape.rule.ink` | `chalk` | every drawn rule: 12.98 on grain |
| `shape.rule.hair` | 0.5 | row and cell hairlines (the PC 1908 folio hairline) [T7 §4.3] |
| `shape.rule.head` | **[2, 1.5, 1]** | the thick-thin **2–1** (ATF 1314) [T7 §4.1]: 4.5 pt, lighter than research's Oxford 3/2/1. Across a dozen cards on You, a 6 pt rule would turn the page into a broadsheet (N12) |
| `shape.rule.place` | `above` | the head **hangs from** the rule, as a form's part heading hangs from its box rule |
| `shape.rule.total` **(proposed)** | [1, 2, 1] | the double rule (PC 1908, 0.74 / 1.3 / 0.74 × 1.8) [T7 §4.2] **above every total**: opens `statRow · ledger` and any totals line (§5) |
| `shape.leader` | `{ ink: 'dim', dot: 1.5, pitch: 4.5, min: 16 }` | round dots at 0.3 em on the baseline [T7 §4.3]. The 1898 form's "NAME……" (5.39 on grain) |
| `shape.keyline` | `{ ink: 'chalk', width: 1 }` | stamped nameplates: chips, plates, the stamped figure, the live plates |
| `shape.lead` **(proposed)** | `{ keyline: true }` | `card · ruled` draws its one lead box with `shape.keyline` round it. Without it the lead box is bar on rack at 1.06:1 and all but vanishes |
| `shape.band`, `shape.gutter` | defaults | no look here reads them |

---

## 4. Fonts

| | Besley v4 (heads) | Archivo (body, Coach card) | Archivo Condensed (the stamped figure) |
|---|---|---|---|
| **Licence** | OFL 1.1, no RFN. Upstream `OFL.txt` read tonight: "Copyright 2022 The Besley Project Authors (https://github.com/indestructibletype/Besley)" | OFL 1.1, no RFN. `OFL.txt` read: "Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo)". Already owed in the Licences row | same family and licence |
| **Web** | upstream `Besley[wdth,wght].ttf` v4.000 (sha `12d70d6287c9a939…`), latin subset woff2 **66,056 B** (measured file `research/fonts/_subset/`). Axes `wght` 400–900 and `wdth` 75–100; set at `wdth` 100 so web matches native widths. Pinning `wdth` can only shrink the file. **≤ 120 KB** | v1's @import, 0 bytes | v1's variable Archivo at `'wdth' 75`, 0 bytes |
| **Native** (≤ 4, picker included) | **Besley-SemiBold** (600–700); **Besley-ExtraBold** (≥ 750; the picker face) | the app's four package files (not this vibe's) | **ArchivoCondensed-ExtraBold**, the Google css2 static |
| **Checked tonight** (`t5-check.mjs`) | ExtraBold: PS name `Besley-ExtraBold`, `tnum` uniform (1320/2000), GSUB `c2sc calt liga onum smcp ss01 tnum`, cap 0.75, x 0.52, hhea **1.675**. **SemiBold never downloaded or checked: it must pass `t5-check.mjs` before it ships (R4.3)** | | local copy `research/fonts/_gf/archivo-gstatic-w75-800.ttf`: 111,424 B, sha `4b8356f958ae9964`, v2.001, PS name `ArchivoCondensed-ExtraBold` (unique; not one of the four package names), `tnum` uniform (497), GSUB keeps `tnum` (drops `case`, `lnum`, `onum`, `zero`, none of which this vibe uses) |
| **Missing glyphs** (computed on the files) | → ↑ ↓ ⚙ ✕ ⋯ ✓ ↳ ⅓ (and ⚠ ✎ ▾ ▴ [SYNTHESIS §0.5]). **It has − ≈ + % × · ’ ½** | ⚙ ✕ ⋯ ✓ ↳ ⅓ | as Archivo |

**Native count: 3 of 4.** Besley-SemiBold, Besley-ExtraBold and ArchivoCondensed-ExtraBold, with the picker face included. Latin subsets are about 0.22 MB [T5 §6].

**Glyph rules:**
- Besley sets only heads, names and the picker numeral. It never sets a delta, a value, a unit or any string that can carry an arrow (R4.6).
- The web stack is `'IA Besley', 'Archivo', system-ui, …`, so a custom exercise name with an arrow falls to Archivo first.
- ⚙ and ⚠ inside prose stay text. ⋯ ✕ ✓ ↳ ✎ ‹ › × − + ▾ ▴ are drawn through the icon contract's glyph keys (§8).

**The Coach card keeps Archivo on v1's metrics** (padding 14, border 1, `CARD_TYPE`). No advance table is needed.

**Line metrics:** Besley's hhea is 1.675. Native heads floor there: h1 at 24 pt sets a 40 pt line, not v1's 28. Headers grow about 12 pt, and a device screenshot must confirm before any tighter clamp (Q-D4). The web sets explicit line-heights (1.1–1.25).

**Fit** (computed, harfbuzz):
- "September 2026" in Besley-ExtraBold at 24 pt is **215.5 pt**; native v1 at 26 pt is 213.9, so the Train header fits as v1's does. At 26 pt Besley would need 233.5 and wrap at 320, hence 24.
- The stamped figure is 30–40 pt at `wdth` 75. "12,480" at 40 pt is 109.3 pt, against v1's 161.2 at `wdth` 118, so every figure is narrower than v1's.

---

## 5. Shape language and the 29 blocks, in VOCAB order

**The grammar in one line.** Rules and leaders structure everything; boxes are stamped keylines around what you glance at; ink fills mean "chosen" or "done"; paper tint means "pressed" or "entered"; red is a rubric, never a button.

**Container roles (R6.1):**
- **lead:** one keylined paper box per tab: You's greeting, Fuel's summary, Steps' today, Weight's log.
- **group:** ruled sections on the stock.
- **callout:** a 2 pt ink rule above, no fill (the "Next week" callout, notices).
- **stamp:** keylined plates for chips, figures and live plates.
- **sheet:** an edge-to-edge paper sheet under the 2–1 rule.

| Block | Look | What it draws here |
|---|---|---|
| `card` | **ruled** | no ground, border or radius. The 2–1 head rule full width; the card title (eyebrow type) hangs 6 pt under it, with meta and ⋯ right. Cards part by 24 pt of stock. **The tab's lead card** (Fuel summary, Weight log, Steps today) keeps a box: bar paper, square, 1 pt ink keyline (`shape.lead`), padding 14 |
| `youCard` | **ruled** | as card. Wins and Improve ink their head rule in `good` / `warn` instead of v1's 3 pt side stripe (R6.4); the words still say which is which |
| `eyebrow` | **v1** (type only) | Besley 600 14 steel, sentence case. No dot, no trailing line, no tracking |
| `sectionHeader` | **plain** | the title alone in h3 (Besley 700 17, ink), 28 above and 8 below. It sits right on top of the next card's 2–1 rule, so the part title reads as standing on the rule and the card title as hanging under it. No trailing hairline (A19) |
| `screenHeader` | **masthead** | the eyebrow (Besley 600 14 steel) over the h1 (Besley 800 **24**; the look's "larger" is held at 24 for fit, §4), then the 2–1 rule across the full width. The nav buttons keep their place and size (34) as 1 pt ink keylined squares with drawn chevrons |
| `sheetHost` | **full** | edge to edge on bar paper, square top corners, the 2–1 rule along the top edge. The 36 × 4 grab bar stays, in grip (4.02). Ink .45 backdrop, no blur. Heights 86 / 92 kept |
| `sheetTitle` | **rule** | h2 (Besley 700 19) over a 0.5 ink hairline at the full content width; its eyebrow above |
| `statRow` | **ledger** | the double rule (`shape.rule.total`) above, then one line per stat on a 44 pt pitch: label left (Archivo 500 13 steel, in its authored sentence case: "Trend today", "lb swing"), dotted leader, value right (Archivo 700 17, tabular, the caller's colour kept). A 0.5 hairline closes the block. MiniStats does the same |
| `kpi` | **plain** | four square cells on `well` with a 1 px collar outline (1.57, decorative: the cells are not controls): the form's tally. No corner tint. Label Archivo 13 steel; the delta as **bare signed text with its arrow** at 800 in its status colour (4.75 on well); value 22; "last week …"; a 2 pt sparkline with a square end mark; seven day dots, today ringed in ink |
| `headline` | **stamp** | **the stamped nameplate:** the figure in Archivo Condensed 800 inside a 1 pt ink keyline, square, 6 / 10 padding. Its unit sits on the same baseline inside the plate at 0.45× in Archivo 600 steel. The figure keeps its role colour (Fuel's zone; Weight's pYellow), since every plate colour is ≥ 4.5 on the stock. Deltas stay outside the plate in Archivo with their arrows |
| `chip` | **stamp** | no ground, 1 pt ink keyline, square. Chosen = inked in (ink fill, knockout words). 44 tall where v1 is 44 |
| `segmented` | **boxes** | joined square cells in a 1 pt ink keyline, 1 pt rules between them. The chosen cell is inked in. At least v1's height |
| `btn` | **inverse** | **primary:** ink fill, knockout words, square: the reversed-out block of Saxon's 1908 cover [T7 §8]. **plain:** raised paper, square, ink words. **ghost:** no box, the words underlined 1 pt in steel, 44 hit area by padding. **danger:** square 1.5 pt danger keyline, danger words (8.21). Large: 16 pt, sentence case ("Start workout"). Press scale .97; disabled .4 |
| `field` | **underline** | **the form's blank:** label above (Archivo 600 13 steel); the value on a 1 pt ink rule; placeholder dim (5.81 on bar); **focus = the rule thickens to 2 pt in madder** (thickness is the cue). Error line kept. Two amendments: a multi-line box (the paste box) draws the 1 pt rule on all four sides, a ruled writing box; and a field **inside a photo slot** keeps a bar-paper ground, so its placeholder is measured on flat paper, never on the photo |
| `note` | **rule** | a 16 pt, 0.5 ink hairline above the note: a footnote. Archivo 13 dim |
| `toast` | **square** | an ink strip, square, knockout words (13.99), no shadow, 16 above the dock |
| `settingsRow` | **ledger** | label (Archivo 600 15 ink), dotted leader, value (Archivo 13 steel, tabular), drawn chevron in dim. No rules between rows; one hairline under the group; full-width 44 tap target; ink .05 press |
| `listRow` | **ledger** | name … value rows (PR, PB, rank, session, food entry, recent steps): name Archivo 600 14, leader, value Archivo 700 15, with bold only on the ranked column (T3 D5). Sub-lines Archivo 12 dim. Other rows draw as `plain`. Swipe to delete reveals the danger panel (onDanger 9.02) |
| `setTable` | **ruled** | the exercise under the 2–1 rule: a filled 10 × 14 group tab in the group colour (data), the name in Besley 700 17, ⋯ as the drawn dinkus. "Last · …" in Archivo 13 dim. **Column heads "Set  lb  Reps  e1RM" in Besley 600 13 steel over a 1 pt ink rule** (v1's widths 30 / 1fr / 1fr / 42 / 38). A lifting block is framed by a 0.5 hairline box with its title in madder |
| `setRow` | **ruled** | rows on a 44 pt pitch, parted by 0.5 hairlines. The badge is a bare figure (W / F / D in their plate colours, 4.60–7.62). The two inputs set their value centred on a 1 pt ink rule. e1RM Archivo 13 dim. **The check is a 30 × 30 box in a 1 pt ink keyline; done = inked solid with a knockout ledger tick**, and the row becomes a clean paper strip (setDone). Drops hang on a solid 2 pt Prussian rail, with ↳ drawn |
| `plateStrip` | **stamp** | "Per side" (Archivo 13 steel), then each plate a stamped keyline in its plate colour, no ground, figures in ink (Archivo Condensed 800 13, tabular). The 5 lb "white" plate is keylined in ink, which is how an engraving draws white |
| `calCell` | **ruled** | **the printed calendar:** 0.5 hairlines between cells, no grounds. Day numbers Archivo 600 13 (dim; ink 700 when trained). Up to four 3 pt square-ended plate bars under the number. **Today: a 2 pt ink keyline box and the numeral in madder at 800** |
| `chart` | **print** | 2 pt lines, square caps, no area wash, no glow. Square-topped bars and square-ended meters on `track`. Hairline grids in collar; dashed targets in ink. **The day that isn't over is drawn in outline only**, as an unprinted bar (a shape cue with no SVG pattern needed). Axis text Archivo 11 steel. The calorie meter's head, ticks and dashed target are paper-white edged by a 1 pt ink keyline. Zones keep their blue / yellow / red washes |
| `dock` | **rail** | opaque stock (no grain, no blur) under a 2 pt ink rule. Engraved icons at 22 pt, 1.5 stroke, in dim. **The active tab carries a 3 pt ink bar its full width along the rule, and its label is ink at 800**: the cue is shape and weight, not colour |
| `fab` | **inverse** | a square ink plate centred 14 above the dock: the Greek cross (2.6) and "Log food" as authored, Archivo 800 14, knockout. No shadow; pressed = scale .955 |
| `addTile` | **ruled** | no tiles: a two-column grid parted by 0.5 hairlines, each cell an engraved cut at 19 pt without a well, the title in Archivo 700 15, the dim line. The "ai" tag is a tiny stamped keyline, in its authored lowercase. **The Photo cell's cut is printed in madder**, so the eye finds it first |
| `sessionChrome` | **plate** | stamped plates on bar paper with 1 pt ink keylines, no shadow. **Top bar:** an ink safe-area band, then a bar-paper strip with a 1 pt ink rule under it; session name; the clock (Archivo Condensed 800 22, tabular) in a keylined plate; the Coach live chip (38) as a keylined plate with the balloon and "Coach" in madder; the calendar button (38) keylined; Finish as the ink primary. **Rest line:** 3 pt, ink while it runs, danger when over. **Rest pill:** a square keylined plate with the time, +30 (plain) and Skip (ghost). **Peek bar:** a plate with name, clock and Resume (ink) |
| `youHero` | **banner** (no photo in this concept) | the greeting in the You tab's lead box: bar paper, 1 pt ink keyline. The avatar is a round cameo with a 1 pt ink ring; the greeting in Besley 800 26, **all ink**; the gear top right as a 36 keylined square with the engraved gear. Sub-line Archivo 13 steel, "member since …" dim. The slot stays open for a graft (§7) |
| `coachCard` | **ruled** | no ground; only the top and bottom 1 pt border, in ink; square. **190 / 164, padding 14, border 1 and Archivo `CARD_TYPE` all kept.** The balloon mark, COACH, COACH ME and › in madder: the screen's rubric. The caution line in warn (5.62 on grain). The lock drawn |

**What this concept leaves out on purpose:**
- no ornament (A's dinkus tailpiece is available as a graft);
- no italic (it would cost a native file and a web family);
- no rule-frame;
- no hatching;
- no condensed type outside the one figure.

---

## 6. Screen by screen (every screen, incl. the forgotten ones)

Same boxes, same order, everywhere; only the drawing changes. "Web-CSS" means the vibe stylesheet reaches it with no native switch; "native: tokens" means that native gets the colours and faces, but no shape change until a switch is opened.

- **Web sign-in and gates** (web only; native stays v1):
  - `#auth` on the stock with the web band. The six-plate mark in this vibe's plates, the 5 lb plate inked.
  - Title in Besley 800; fields underlined; "Sign in" as the ink primary; links as steel underlined words.
  - Invite code, waiting and paused screens take the masthead, an underlined code field and the ink primary.
- **Onboarding** (8 steps):
  - the step kicker as eyebrow, titles in h1 Besley, number steps as underlined fields, progress dots as ink rings, filled when done;
  - **`.ob-choice` (chosen by border colour alone in v1)**: a 1 pt ink keyline box, and chosen = inked in with knockout words. That is a non-colour cue, via web-CSS; native Setup needs a switch or keeps tokens;
  - the "Next" ink primary.
- **The tour:**
  - the scrim is the cream fog (rack .70 → .94);
  - the tour card is bar paper in a 1 pt ink keyline, no shadow. It must **not** take `card · ruled`'s no-ground (§12);
  - the lit dock tab is ringed 2 in madder.
- **You:** described in full in §10.
- **Coach card, sheet, live chip, nudge:**
  - the card as above;
  - the Coach sheet is `sheetHost · full` at 92 %;
  - coach bubbles are square boxes on `raised` (ink 11.99). The asking bubble's 3 pt yellow side stripe becomes a 2 pt madder rule above it (web-CSS; native `coach/sheets.jsx:468` needs a switch);
  - goal and feel chips are stamps; ▾ ▴ are drawn chevrons;
  - the nudge is a note-strip with a 16 pt hairline above and the drawn saltire for × (`dismiss`);
  - the live chip is a stamped plate.
- **Train calendar:**
  - masthead "Training log" / "September 2026", with the ‹ › squares;
  - the weekday row (S M T W T F S as authored) in Archivo 12 steel over a 0.5 hairline, then the ruled calendar;
  - the Coach card at 164;
  - Start workout as the large ink primary (no photo here);
  - the week-volume card ruled, with square bars and the partial week in outline;
  - the stat ledger under a double rule.
- **Day sheet:** sheet full; exercise lines as ledger rows.
- **Live session and edit:** §10.
- **Summary (the recap):**
  - the photo plate `summaryHero` (§7) behind the masthead block: eyebrow, h1, the summary line and the date, **all ink** (R9.6);
  - the Wins card with a good-green head rule;
  - PB rows as ledger rows (the record value in madder, the "PR" word kept);
  - the session totals as the stat ledger **under the double rule: the form's totals line**;
  - "How did that feel?" feel chips as stamps, 44 tall.
- **Stats overview and exercise detail:**
  - `PageHead` as masthead with a keylined ‹ Back;
  - the 3 × 3 stat rows as ledgers; rank rows as ledger rows, bold on the ranked column;
  - charts in `print`.
- **Picker, manager, custom:**
  - search field underlined; filter and Movement chips as stamps;
  - exercise rows plain; a chosen row carries pickSel (.05) and an inked tick.
- **Routines:** ledger rows. The editor's set tables use the ruled table, and drop sets show "+ Drop" grouped (native `routines.jsx` EditorExercise switch).
- **Fuel day:** §10.
- **Add food, estimator, library, meals, barcode:**
  - the add sheet is `full`, with the ruled add grid (§5);
  - the Foods and Meals buttons are ghost (underlined words) with the ledger-book and three-plates cuts;
  - **the estimator notices:** `spark` is the printers' fist pointing at the sentence, in warn, inside a 1 pt ink keyline box. The yellow-tinted box goes, and **no sparkle anywhere** (R8.8);
  - the estimator's phases sit on sheet paper; the camera ground stays `#000000`;
  - the confidence dot plus its word (good / warn / bad);
  - proposed rows as ledger rows, and **the estimate's total under the double rule**;
  - the portion stepper's − and + drawn as rules;
  - library rows as ledgers with the nib (✎) and saltire (✕) drawn;
  - meals as ledgers, and the meal builder's tiles as the ruled grid;
  - barcode: the camera is black, with the sheet's chrome on paper.
- **Water:**
  - the carafe outline (§8) in 3 pt ink with the pBlue level. It needs the vessel field (Q-E4); **until then v1's bottle outline is drawn in ink with the same fill**, so the level stays true;
  - the presets list as ledger rows; the remove button as the drawn saltire;
  - the water sheet `full`.
- **Weight:**
  - masthead;
  - the log card is the lead box with its photo plate (§7): "Weighed earlier?" and the note all ink, the underlined field on its paper ground, Log as ink;
  - the maintenance figure stamped;
  - the 3-stat headline row as a ledger;
  - the trend chart in print, with the dashed ink trend;
  - time-of-day and recent rows as ledgers; the date picker light.
- **Steps:**
  - masthead with the gear (drawn) and chevrons;
  - **Today is the lead box with its photo plate** (§7). The ring sits on a bar-paper roundel with a 1 pt ink keyline, so its viridian arc reads 5.00:1 on flat paper, never on the photo;
  - the big number is stamped, in ink over the photo (it drops `good`; "goal met" stays in words);
  - +500 / +1k / +2.5k as underlined ghosts; Set total as ink;
  - trend and weekday bars in print; the 2 × 3 stats as ledgers; heat strip cells square (pYellow trained, collar untrained, both pinned); recent rows as ledgers;
  - the HealthKit guide (native) on sheet paper.
- **Settings hub, profile and goal:**
  - section titles plain; rows ledger; toggles in their slot (off grip, on accent, and the knob's side is the cue);
  - **Look → Vibes** is one ledger row, "Vibes …… Iron Age ›";
  - the profile avatar preview as the cameo.
- **The Vibes sheet:**
  - `full` at 92 %, eyebrow "Look", h2 "Vibes" over its hairline;
  - the tiles as specified by track 10: radius 14 for every tile, per T10, so this vibe does not square them;
  - the current ring 2 pt in ink with 3 pt of bar clear; the drawn check.
  - Iron Age's own tile is in §9.
- **Toasts:** square ink strips.
- **Sync pip, trial bar, swipe panel:** tokens only.
  - The native trial bar is solid warn with onWarn (6.65). The web `.trial-bar` is a warn wash with warn ink.
- **Install card and guide:** a ruled card; the × drawn.
- **Admin** (legible, owner only):
  - youCard ruled; stat ledgers; account rows as ledgers;
  - the `.adm-flag` pills as stamped keylines in their flag colours (on good, off bad, lit pBlue, warn warn);
  - AI-split and family bars in plate colours on track; charts in print.
- **Import history:** a stat ledger preview; the importer's group bar in the plate colours.

---

## 7. Images, scrims and textures

**The rule of this angle: photos only in the fewest, roomiest slots.** Three slots, each the lead box of its screen:

| Slot | Box (web 390) | Photo (Tier A, unnamed or no people) | Focal | Scrim | Text on it |
|---|---|---|---|---|---|
| `stepsToday` | 356 × 224 | `gym-naval-academy` (LoC 2016804446; Detroit Publishing, *Catalogue J* 1901; no people) | .45, .60 | **hard-stop bands**: stock α **.54** behind every text row, α .30 in the free rows. The bands are re-derived on this vibe's own geometry with `r2-zones.mjs` [T8a H.5]; the ring sits on its own paper roundel | all ink |
| `weightLog` | 356 × 180 | `anderson-pulleys-man-spread-1897` (Anderson's *Physical Education*, 1897; unnamed model, rear view, so no face can be cut) | .51, .27 | hard-stop bands: .30 over the free top third, .54 under the text rows; the input keeps its paper ground | all ink |
| `summaryHero` | 358 × 123 | `sargent-1904-leaf0205-teamsters-warning` (Sargent, *Health, Strength & Power*, 1904; unnamed model, arms level across a 3:1 band) | .433, .095 | uniform stock α **.54** (no free band ≥ 0.096) [T8a H.5] | all ink |

- **Why .54** (computed on r2g): the scrimmed darkest pixel (solid ink under the scrim) becomes `#898275`. Ink text on it reads 4.67:1 and the photo keeps 2.84:1.
  - Baked, 0.526 is the threshold (4.53).
  - Chrome's runtime layer loses about 0.01 α [T8a H.6], so the runtime value is 0.54.
  - The free bands at .30 keep the photo at 5.68:1 and carry no text.
  - Hard stops, not ramps, so the bands are flat fills (C22). They read as caption strips pasted over the plate.
- **Named subjects: none.** All three are App Store-safe [T8a G3, T9 C4].
- **Before any ships:**
  - `sargent-…-teamsters` and `anderson-…-spread` have **not yet been run through the `coverAt()` face rule** (Q-Q2);
  - Sargent's `box_358x190` is `null`, because every taller box takes in a "Fig." label [T8a G2]. At native xxxLarge text the recap box reaches 2.52:1, so the crop may take a label. **Fallback for either: `gym-naval-academy`**, which fits every slot.
- **Not used:** `youHero`, `coachCard` (dropped per C27), `startWorkout` and `fuelSummary`. They close up (C14). No frame, no placeholder.
- **Treatment** (deterministic, recorded in PROVENANCE `transforms` [T8a H.9]):
  1. sips crop inside the tightened `crop_hint`, then `coverAt()` at the slot's box and focal;
  2. `-Z ≤ 1170`;
  3. the ink-on-stock tone map [T7 G.4.2] **re-rendered on `#e6dec9`**: Rec. 709 Y (linear) → L\* → levels at P0.5 / P99.5 → coverage a ∈ [0.04, 1.00], mixed in linear light between ink and stock;
  4. halftone at a 3.0 pt pitch, 45°, dot area = a, no gain curve;
  5. **4-bit indexed PNG** (C25; not JPEG, whose ringing drops the worst run to 3.5).
  - No `sepia()`, no colourising, no upscaling.
- **Textures, all by recorded script** [T7 G.2–G.3]:
  - **grain:** `texproto.mjs grain fresh`, seed 1908, a 72 pt periodic tile baked into `#e6dec9` with its mean unchanged: @2x 144 px ≈ 8.3 KB, @3x 216 px ≈ 16.5 KB [T7 G.2.3].
    - On `rack` only: never on sheets, bar, the dock or the band. Gated: every text role passes on its darkest pixel (§3).
    - Web: `background: var(--rack) image-set(…) repeat` at 72 px. Native: an RN `Image` with `resizeMode="repeat"` behind the scroll content.
  - **ink bleed:** `texproto.mjs rules`, seed 1912, RGBA strips for the four rules this vibe draws: hair 0.5; rule 1 (printed 1.2); total 1/2/1; head 2/1.5/1, with its thin line gained to 1.2. Wander is 0.03 pt rms (0.015 on lines ≥ 1.5), with no halo, pooling or bite. About 10–14 KB @3x.
    - Vector rules at the same printed widths are the fallback, and the look is identical (Q-I3).
  - **halftone:** photos only, above.
- **Budget:** 3 plates at ≤ 96 KB each (H.6 measured 24.7–95.9 per slot), a picker thumb ≤ 30 KB, grain about 25 KB and strips about 14 KB. That is **≈ 0.35 MB per client, against 1.5 MB**.

---

## 8. The engraved icon set

**Style:**
- a 24-unit grid;
- **one stroke: 1.5 at 19–22 pt, 1.75 at 14–17 pt** [T8b G3];
- `linecap: 'square'`, `linejoin: 'miter'`, `fill: 'none'`;
- `path` / `circle` / `rect` only (the contract's shape);
- no hatching at icon size (it muds [T8b G2]);
- the silhouette plus one or two defining lines [T8b §4].

The FAB's plus (2.6) and the two `spark` sites (1.6) keep their sites' fixed strokes. Every key below is defined, so nothing falls back to v1, and above all not the sparkle (R8.8).

**Review renders, made by code** (no browser; §0), at 66, 57, 48 and 22 px:
- `design/iron-age/scratch-B/icons-sheet-final.png`;
- `icons-dock2.png`: the barbell, scale, calendar and lock, re-drawn after the first render.

Every icon reads at 22 pt. The first barbell (rings) read as handcuffs; it now carries the globe's centre band. The first beam scale read as a crane at 22 pt and was replaced by a dial.

| Key | Stroke | Form | Path data (24 × 24) | Source |
|---|---|---|---|---|
| `you` | 1.5 | a generic bust with a stand collar, on the bust's cut | `M8.6 7.9a3.4 3.9 0 1 0 6.8 0a3.4 3.9 0 1 0-6.8 0z` · `M4.5 21v-.6c0-3.6 2.7-5.9 6-6.5M19.5 21v-.6c0-3.6-2.7-5.9-6-6.5` · `M10.3 13.8l1.7 2.2 1.7-2.2` · `M3.5 21h17` | hand-drawn; never a likeness |
| `workout` | 1.5 | globe barbell: two globes, each with its centre band turned to the bar, and a double-ruled bar | circle(5, 12, 3.6) · circle(19, 12, 3.6) · `M5 8.4a1.5 3.6 0 0 1 0 7.2M19 8.4a1.5 3.6 0 0 0 0 7.2` · `M8.6 11.2h6.8M8.6 12.8h6.8` | **#29** Ravenstein and Hulley 1867 p. 258 (Tier A) for the form and ruled bar; the band from #4 Spalding c. 1891. The bar is shortened and the globes enlarged (a redraw, said so in the module) |
| `food` | 1.5 | fork upright, tumbler wider at the lip with its thick foot | `M4.5 3v5.2c0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5V3M7 3v5M7 10.7V21` · `M13.5 4.5h7l-1.2 16.5h-4.6z` · `M14.4 17.6h5.2` | **#18** fork, **#19** tumbler, Sears No. 112 |
| `weight` | 1.5 | a dial platform scale: dial, hand, three bare graduations, column, platform | circle(12, 8, 5.2) · `M12 8l2.6-2.6` · `M12 3.6v1.1M7.6 8h1.1M15.3 8h1.1` · `M10.6 13.1V18M13.4 13.1V18` · rect(3.5, 18, 17, 3) | **deviation, for Micah:** drawn to *Fairbanks Dial Scales* (Fairbanks, Morse & Co., 1919; T7 item H, IA `fairbanksdialsca00fair`), which is this angle's own model. It needs its own PROVENANCE entry before a trace. **Fallback: #7** Spalding beam scale, which read as a crane at 22 pt in tonight's render |
| `steps` | 1.5 | two insoles, one offset | `M7 7.6c2.3 0 3.4 1.9 3.4 4.2 0 1.9-.9 3-1.1 4.5-.1 1.1.4 1.9.4 2.8 0 1.2-1.1 1.9-2.6 1.9s-2.5-.8-2.5-2c0-.9.5-1.6.4-2.8-.2-1.5-1.3-2.6-1.3-4.5 0-2.3 1.2-4.2 3.3-4.2z` and the same from `M17 2.8` | **#25** Sears p. 936, outline only |
| `gear`, `gearYou` | 1.75 | one 8-tooth spur gear and its hub | `M10.6 4.94L10.72 2.49L13.28 2.49L13.4 4.94L16 6.01L17.82 4.37L19.63 6.18L17.99 8L19.06 10.6L21.51 10.72L21.51 13.28L19.06 13.4L17.99 16L19.63 17.82L17.82 19.63L16 17.99L13.4 19.06L13.28 21.51L10.72 21.51L10.6 19.06L8 17.99L6.18 19.63L4.37 17.82L6.01 16L4.94 13.4L2.49 13.28L2.49 10.72L4.94 10.6L6.01 8L4.37 6.18L6.18 4.37L8 6.01z` · circle(12, 12, 2.6) | **#11** Grant 1893 (backup #10). A public-domain source, so it owes no MIT notice |
| `calendar` | 1.75 | a desk pad on its wire posts, no numerals and no month | rect(4, 5.5, 16, 15) · `M4 9.8h16` · `M8 3v4.5M16 3v4.5` | **#23** Sears p. 158; the feet dropped at icon size (with them it read as a stool) |
| `bubble` | 1.75 | a speech balloon with a short tail | `M12 3.8c4.8 0 8.5 3 8.5 6.7s-3.7 6.7-8.5 6.7c-1 0-1.9-.1-2.8-.4L4.5 20l1.2-4.2C4.3 14.5 3.5 12.6 3.5 10.5 3.5 6.8 7.2 3.8 12 3.8z` | hand-drawn; never the manicule |
| `lock` / `unlock` | 1.75 | the heart-cased padlock; only the shackle moves | case `M5 12.2c0-1.3 1-2.2 2.3-2.2 1.9 0 3.1.9 4.7.9s2.8-.9 4.7-.9c1.3 0 2.3.9 2.3 2.2V16c0 3-3.1 5-7 5s-7-2-7-5z` · keyhole `M12 14.2v2.4` · shut `M8.2 10.2V7.4a3.8 3.8 0 0 1 7.6 0v2.8` / open `M8.2 10.2V7.4a3.8 3.8 0 0 1 7.3-1.6` | **#17** Mallory, Wheeler 1871 No. 10, silhouette only |
| `plus` | 1.5 (FAB 2.6) | Greek cross | `M12 4.5v15M4.5 12h15` | hand-drawn |
| `camera` | 1.5 | box camera, front: box, stiff strap, lens and rim, finder | rect(3.5, 7.5, 17, 12.5) · `M9.5 7.5V5h5v2.5` · circle(12, 13.8, 3.3) · circle(12, 13.8, 1.1) · rect(15.8, 9.3, 2.4, 1.8) | **#22** Sears p. 233, redrawn frontal |
| `pen`, `edit` (✎) | 1.5 | a nib at 45°: shoulders, slit, vent | `M4.93 19.07L8.46 10.73L11.58 7.62L13.70 7.47L17.23 3.94L20.06 6.77L16.53 10.30L16.38 12.42L13.27 15.54Z` · `M4.93 19.07L10.16 13.84` · `M11.22 12.78L11.15 12.85` | **#21** Sears p. 99, the "6" dropped |
| `barcode` | 1.5 | six brass rules; the thick ones are paired strokes | `M3.6 5.5v13M4.6 5.5v13` · `M7.6 5.5v13` · `M10.4 5.5v13` · `M13.2 5.5v13M14.2 5.5v13` · `M17.2 5.5v13` · `M19.8 5.5v13M20.8 5.5v13` | hand-drawn: ATF brass rule; no digits |
| `keypad` | 1.5 | rimmed keys 3 × 2 over a bar | rect(3.5, 4, 17, 16) · circles r 1.1 at (8 / 12 / 16, 8.6) and (8 / 12 / 16, 12.4) · `M8 16.4h8` | hand-drawn |
| `book` | 1.5 | an open ledger with ruled pages | `M12 6.6C10 5.3 7.1 4.8 3.5 5.1v13.4c3.6-.3 6.5.2 8.5 1.5 2-1.3 4.9-1.8 8.5-1.5V5.1c-3.6-.3-6.5.2-8.5 1.5zM12 6.6V20` · `M6 9.8h3.8M6 12.8h3.8M14.2 9.8H18M14.2 12.8H18` | **#14** Sears p. 155, the portrait left out |
| `stack` | 1.5 | three dinner plates, edge-on | `M3.5 6.5h17l-2.6 2.6H6.1z` · `M3.5 11.2h17l-2.6 2.6H6.1z` · `M3.5 15.9h17l-2.6 2.6H6.1z` | hand-drawn |
| **`spark`** | 1.6 (site) | **the printers' fist** pointing at the sentence: cuff band, back of hand to index finger, three curled fingers | rect(2.5, 8, 3, 8.5) · `M5.5 9.3c1.6-1 3.4-1.5 5.3-1.5h9.6a1.2 1.2 0 0 1 0 2.4H13.2` · `M13.2 10.2c1 0 1.6.5 1.6 1.2s-.6 1.2-1.6 1.2c1 0 1.6.5 1.6 1.2s-.6 1.2-1.6 1.2c.9 0 1.4.5 1.4 1.1s-.5 1.1-1.4 1.1H5.5` | **#26 / #27** Polhemus 1895 p. 203, in outline |
| glyph `prev`, `back` (‹) / `next`, `go` (›) | 1.75 | open chevrons | `M14.5 5.5L8 12l6.5 6.5` / `M9.5 5.5L16 12l-6.5 6.5` | hand-drawn. Native NavBtn keeps its accessible label |
| `close` (✕) / `dismiss` (×) | 1.75 | saltire / the same, smaller | `M6.5 6.5l11 11M17.5 6.5l-11 11` / `M7.5 7.5l9 9M16.5 7.5l-9 9` | hand-drawn |
| `more` (⋯) | 1.75 | a dinkus of three points | circles r 0.9 at (5.5, 12), (12, 12), (18.5, 12) | hand-drawn [T7 §5] |
| `check` (✓) | 1.75 | a ledger tick | `M5 12.8l4.2 4.2L19.5 6.5` | hand-drawn |
| `drop` (↳) | 1.75 | a hooked arrow | `M7 4.5v8c0 1.4 1.1 2.5 2.5 2.5h9.5M15.5 11.5L19 15l-3.5 3.5` | hand-drawn |
| `minus` (−) / `plus` glyph (+) | 2.2 | one rule / the Greek cross | `M5.5 12h13` / `M12 5.5v13M5.5 12h13` | hand-drawn |
| `expand` (▾) / `collapse` (▴) | 1.75 | chevrons | `M6 9.5l6 6 6-6` / `M6 14.5l6-6 6 6` | hand-drawn |
| `gear` glyph (⚙, native Fuel) | 1.75 | the gear above | | #11 |
| `warn` (⚠), `up` / `down` / `flat` (↑ ↓ →) | — | **stay text**: ⚠ leads a sentence; the arrows are a number's direction. Both stay in Archivo, which carries the arrows | | |

- **Water vessel (proposed field, Q-E4):** viewBox `0 0 104 168` (v1's box), and the outline doubles as the clip path.
  - Path: `M35 5h34l-4.5 11c-2 4.5-3.5 8.5-3.5 14v27c0 5 3.5 8.5 11.5 11.5 16.5 6 27.5 21 27.5 40 0 27-21 49-48 49S4 135.5 4 108.5c0-19 11-34 27.5-40C39.5 65.5 43 62 43 57V30c0-5.5-1.5-9.5-3.5-14z`.
  - **`insideBottom` 155, `insideTop` 72:** a full day fills the bowl to the shoulder, and the neck stays empty. The level stays linear in the day's fraction (R1.4).
  - Source: **#20** Sears p. 645 carafe, silhouette only; the cut-glass pattern is never drawn.
- **Tracing** (Phase V): every sourced form is traced from its JP2 with `imagetracerjs` after a sips threshold (ink < luminance 150), then hand-simplified to the paths above. Each step is recorded in the module's comment and in PROVENANCE [T8b §4]. The paths here are the target drawing; a trace may move a point, never the silhouette.

---

## 9. The picker tile

`{ id: 'iron-age', name: 'Iron Age', feel: 'Ink on cream, circa 1900.', experimental: false, pick: { ground: '#e6dec9', card: '#ebe4ce', edge: '#1c1712', edgeW: 1, radius: 0, text: '#1c1712', soft: '#4a3f31', num: '#1c1712', accent: '#a1374f', numFace: { web: "'IA Besley Digits'", wdth: 100, wght: 800, native: 'Besley-ExtraBold' }, numPt: 32, thumb: 'vibes/iron-age/img/pick.png', scrim: { color: 'rack', a: 0.54 } } }`

- `numPt` 32 gives a 24 pt cap height (Besley cap 0.75). "315" is then 57.2 pt wide, inside 92 (computed).
- The thumb is 336 × 264 of `gym-naval-academy`, halftoned on r2g under stock .54, as a 4-bit PNG of 30 KB or less. "315" in ink reads 4.67 against its worst pixel.
- The 4 × 44 bar is madder.
- The name reads 13.26 on the tile ground and the feel line 7.65.

---

## 10. Three screens in words

The You figures and labels are the ones in the v1 smoke screenshot (`proof/smoke/smoke-you-390.png`). The live-session and Fuel figures are illustrative only.

### You (390 pt, top to bottom)

- **The band.** A flat warm-black strip the height of the status bar, with the clock in white. Under it the page is cream stock with a mottle you only notice when you look for it.
- **The greeting.** A square box of slightly lighter paper, edged all round by one fine black line: the tab's single boxed thing.
  - The initial sits in a round cameo ringed in ink.
  - "Good evening, Micah" is a heavy Clarendon, all black; the name is not picked out.
  - The gear is a small black-edged square holding an engraved spur gear.
  - Below it, the sub-line in brown-grey, and "Member since Aug 21, 2025 · 400 days" in grey.
- **The Coach card**, exactly 190 tall. It has no box, only a hairline above and below. The speech balloon and "COACH" are the red of the page, the only red on screen; the sentences are black in the same Archivo as today. "COACH ME ›" sits in red over the bottom rule.
- **Goal.**
  - A thick-and-thin brass rule across the full width. Under it hangs "Goal" in a small serif, "cutting" and a three-dot dinkus at the right.
  - The status dot, then **0.9** in a tall condensed figure, stamped inside a black keyline like a scale's nameplate, with "lb / week down" in small grey type on its baseline, lowercase.
  - "On pace: 0.9 lb a week against 1 planned." in plain black.
  - Then the double rule. Then three form lines: "Trend now ········· 190.7", "Goal lb ········· 182", "At this pace ········· Nov 30". Labels grey at left, dotted leaders, black tabular values flush right.
  - The progress meter: a square-ended mustard bar on a pale track, with "196.3 lb · Aug 16", "39% there" and "182 lb" in grey under it.
- **This week.** "This week" in a bold serif stands on the next brass rule; "Against last week" hangs under it.
  - The four KPI cells are four ruled boxes, square, a shade darker than the stock.
  - In each: "Calories" in grey, the delta at the top right as bare text in its own colour, "→ 0" in grey or "↓ 0.9" in green, with no pill. Then 1,950 heavy, "kcal / day" small, "last week 1,950", a 2 pt line with a square end, and seven dots with today ringed in black.
- **Rack noticed.** The section title on its rule; the card title under it. The three findings as rows parted by space, their coloured bullets kept, one hairline closing the group.
- **Trends: Body weight.**
  - The rule and the head; the stamped **191.2 lb**; "↓ 0.9 lb / week ✓" and "↓ 4.1 lb 30 days" in bold green with their arrows.
  - A 2 pt mustard line over hairline gridlines with no fill beneath, the dashed black trend, and axis labels in grey.
  - The legend, then the double rule and "Trend today ········· 190.7", "7-day avg ········· 191.8", "lb swing ········· 5.2".
- **Against your targets.** A stamped **1,950 kcal / day** and "↓ 350 under target". Square stacked bars in Indian red, mustard and Prussian; today's bar unfinished, drawn in outline only. The macro meters as square bars with "142 / 200 g" and a bold "71%". The note with a short hairline above it, like a footnote.
- **Training.** Its ledger under the double rule. The volume bars square, with the week in progress outlined.
- **The dock.** Opaque cream under a 2 pt black rule: a bust, a globe barbell, fork and tumbler, a dial scale, two insoles, all fine engraved lines in grey. "You" has a 3 pt black bar along the rule over it and its label in heavy black.

### The live session

- **The top.** The status band runs straight into the session's top: a black strip, then a paper bar ruled underneath.
  - At left, the session name.
  - Right of it, the clock "42:17" in a tall condensed figure, stamped in a black keyline like a scale's reading window.
  - The Coach chip is a keylined plate with the balloon and "Coach" in red; the calendar button is a keylined square with the engraved desk pad.
  - "Finish" is a solid black block with cream words.
- **The rest line.** While a rest runs, a 3 pt black line crosses the top edge. It turns Indian red when the rest runs over; the time says so too.
- **An exercise.**
  - The brass rule. A small filled tab in the muscle's colour, "Barbell Back Squat" in the serif, the dinkus at right.
  - "Last · Sep 23   185×8  185×8  185×7" in grey.
  - Column heads "Set  lb  Reps  e1RM" in the small serif, standing on a 1 pt black rule.
  - Each set is a 44 pt ruled line. The set number, or a W in mustard. Two blanks with the numbers written on their underlines (grey targets until typed). The e1RM in grey. At the right, a 30 pt square box drawn in black.
  - **Tap it and the box inks in solid black with a cream tick, and the whole line turns to clean paper**, visible from the bench.
  - A drop set hangs indented from a solid Prussian rail, with the hooked arrow drawn. "+ Set" is underlined words.
- **The plate strip.** "Per side", then "1×45", "1×25", "1×5", each stamped in a keyline of its plate's colour: Indian red, mustard, and black for the white 5 lb.
- **The rest pill.** A square keylined plate on paper: the time in the condensed figure, "+30" on a darker paper block, "Skip" underlined. No shadow; it sits flat like a label.
- **The peek bar.** The same plate, with the name, the clock and a black "Resume".
- **The dock** is as on You, with Train's bar lit.

### The Fuel day

- **The header.** The band, then "Fuel" in the small serif over **"Today"** in the heavy serif.
  - At right, three keylined squares: the engraved gear, ‹ and ›.
  - The brass rule across the width.
- **The summary.** The tab's one box: paper, keylined in black.
  - **1,240** in the condensed figure, stamped, in the Prussian blue of the cut zone.
  - "kcal left today" in grey, and "1,060 eaten · 2,300 target" under it.
  - The dinkus for the bar guide.
  - The calorie meter: a square bar over three flat zone tints (blue, mustard, red). The fill has a paper-white head outlined in black, the "white head" the guide describes, with white ticks and a dashed white target, each edged in black.
  - Three macro rows as square meters, their percentages bold in green or amber where the day warrants it.
- **The meals.** Breakfast, Lunch, Dinner and Snacks, each hanging under its brass rule with its kcal at right.
  - Each food is a form line: "Greek yogurt, 200 g ········· 180".
  - A meal with nothing logged stays one line.
- **Water.** The carafe drawn in black line (v1's bottle outline until the vessel field lands). The Prussian water level sits in the bowl, then the presets.
- **Micros.** A grid of hairline-ruled cells.
- **Log food.** Above the dock, a square black plate with the Greek cross and "Log food" in cream.
- **The add sheet.** Tapping it raises an edge-to-edge paper sheet with the brass rule along its top edge and a brown grab bar. "Log food" in the serif sits over a hairline. Below it, a two-column grid ruled in hairlines:
  - the box camera printed in red (Photo), then the nib, the brass-rule barcode and the keypad;
  - the tiny "ai" stamps;
  - when the estimator is off, a small keylined box holding a pointing fist in amber and the sentence it points at;
  - "Foods" and "Meals" as underlined words beside a ledger and a stack of plates.

---

## 11. What this concept never does

Most of these come from track 1's tells, with the key after each.
1. Never a card recipe. The one box per tab is keylined paper; everything else is ruled on the stock (N8, A7).
2. Never a box inside a box of the same fill (N9).
3. **Never tiles for stats.** A stat is a form line with a drawn leader (N21, A9).
4. **Never typed leaders or rules.** Every dot and rule is drawn, and a pseudo-element never carries a character (VOCAB §3.3; T3 D4).
5. **Never caps or tracking.** Zero caps roles, zero letter-spacing, and a unit is never uppercased (N13–N15, A2, A4).
6. Never text under 11 pt, or under 4.5:1 on the darkest grain pixel. Tonight's worst listed pair is 4.25, pYellow on `raised`, a pair no look produces (N7, N16).
7. Never an accented word in a headline: the greeting is one ink (N17, A15).
8. **Never red as a button, a fill or an alarm.** Madder is a rubric: Coach, today, focus, a record (R2.4, R2.8).
9. Never a delta pill. Deltas are signed text with their arrow (R6.6, A14).
10. Never a coloured side stripe. Wins, Improve and the asking bubble move their colour into a rule (N10, A11).
11. Never a gradient, wash, glow, drop shadow or blur. The only non-flat fill is a hard-stop scrim band (N4–N6, C22).
12. **Never the AI cream cluster:** no stock inside R3.5's band, no clay accent, no high-contrast Didone display (Besley is a Clarendon slab), no serif italic (N3, C13).
13. **Never faked age:** no `sepia()`, stains, foxing, torn edges, vignettes, fibres, specks, bite shadows, pooled or broken rules, or wander past the measured amplitude (never-do #30; T7 G.3.6).
14. Never an AI-touched image. Never a photo behind a set row, food row, chart, stat line or dense number. Never grey or coloured text over a photo. Never a halftone as JPEG (N26, R9).
15. Never a named subject in a hero, and never a name next to Rack's (R9.4).
16. Never lettering from an engraving or plate: no "Fig.", SPALDING, TRADE MARK, numerals or captions (R1.1, T8b §4).
17. **Never a sparkle, star, asterisk or bolt.** `spark` is the printers' fist (R8.8, A25).
18. Never icon-in-a-tinted-circle, emoji or a stock icon set (N22).
19. Never a date on the calendar icon, and never a vessel outline without its own inside-bottom and inside-top (R1.3, R1.4).
20. **Never broadsheet cosplay** (N12). Rows keep a 44 pt pitch, not dense columns. Each tab has one keylined box and stamped plates. Photos sit in the roomiest boxes, and primary actions are solid ink blocks.
21. Never period copy habits: no "lbs.", no full stops on heads, no drop caps, no centred data (T7 §9).
22. Never Victorian face-mixing, wood type, ribbons, crossed dumbbells, "EST." badges or wreaths (T7 §9).
23. Never a third family, a monospace face for numbers, or a Besley string that can carry an arrow (N18–N19, R4.1, R4.6).
24. Never new motion: no entrance, count-up or overshoot. v1's 140 / 240 ms stays (N25).
25. Never touch the dock's tabs, order, height or labels. Never make colour alone mark the active tab, today, done, chosen or the current vibe (R8.4).

---

## 12. What the engine and contract need for this concept (proposed, not assumed)

1. **`band` colour role** and the web's fixed safe-area strip (R3.3; ROLES "not in v1.js").
2. **A second and third face** (Q-E3): `faces.head` (Besley; web family plus native keys `Besley_600` / `Besley_800`; minLh 1.675) and `faces.figure` (Archivo Condensed; native `ArchivoCondensed_800`; web Archivo at `wdth` 75). Type presets would gain a `face` field. Today's contract has one `face`.
3. **`shape.rule.total`** (the double rule over totals), read by `statRow · ledger`. Also the estimator total and the recap totals, which are statRows or rows.
4. **`shape.lead.keyline`** for `card · ruled`'s lead box, plus the lead hooks VOCAB §8.2 already lists (web has none for Steps' today and Weight's log; native Fuel needs a marker).
5. **Floating surfaces must not take `card · ruled`.** The tour card spends `T.cardSkin()` (VOCAB §8.5, §8.12). It must keep a ground and take the keyline.
6. **Glyph routing** for ‹ › ✕ × ⋯ ✓ ↳ ✎ − + ▾ ▴ ⚙ through `icon()` on both clients. Native routes no icon through the vibe yet [T8b G6.2].
7. **The vessel field** with `insideBottom` / `insideTop` (Q-E4).
8. **A ground-texture hook:** the grain tile on `rack` only (web background, native repeat `Image`), and optional rule strips.
9. **Switch sites** VOCAB §7 lists for 12 new blocks; this concept names a non-v1 look on all 29. Two sites outside the vocabulary also need switches: the Steps ring roundel inside the photo slot, and the CalMeter's keylined white marks.
10. **Tints may name `calMark`** (the done strip). ROLES allows any colour role; this just confirms it.

---

## 13. Risks and decisions left to Micah (this concept only)

- **Q-P3, taken here:** r2g stock `#e6dec9`. If he prefers `#ede3cc`, every surface ratio rises slightly. The guard then fails (4.30), and the scrim's .54 and the grain's darkest pixel must be recomputed.
- **Q-I1, taken here:** grain `fresh`. It is honest to §11 and nearly invisible. `book` is visible but thins the accent to 4.52 on r2g.
- **Q-I3:** rule PNG strips (§11 to the letter) or vector rules at the same printed widths. They look the same.
- **Hue names in copy:** a text-safe "yellow" on cream is mustard (`#785c00`), and warn is dark amber. If "the yellow line" must read bright yellow, the alternative is research's `#90620b`, graphics-only, with every text site re-mapped to warn.
- **The weight icon** deviates from track 8b's pick: a Fairbanks dial rather than the Spalding beam scale. It needs a PROVENANCE entry and a trace; the fallback is #7.
- **The stamped figure is condensed Archivo,** which is Meet Day's world too. They differ in width (75 here, 62 there), file (`ArchivoCondensed-ExtraBold` here, `ArchivoExtraCondensed-ExtraBold` there), weight and setting (a black keyline on cream, against lamps on black). If the judges find the two figures too alike, **the graft is Besley-ExtraBold in the stamp**. It has tabular figures (1320), and ≈ − + % were checked present. The native count stays at 3, and the `figure` face disappears.
- **Height:** stat ledgers (3 × 44 plus the double rule) lengthen You by roughly 300 pt against v1's 70 pt tile rows (estimated from the four 3-up and two 2-up rows on You). A form is long; `statRow · folio` is the compact graft.
- **Besley's hhea 1.675** makes native heads about 12 pt taller until a device check (Q-D4). **Besley-SemiBold is unchecked** (R4.3).
- **Photos:** Sargent and Anderson have not yet passed the `coverAt()` face rule (Q-Q2). Sargent's taller crop may take a label; the fallback is naval, which fits every slot.
- **Grafts from the other angles** that fit without breaking this one: A's dinkus tailpiece as the one ornament, at a long scroll's end; C's ruled catalogue grid is already `addTile · ruled`. A photo on You (`youHero · banner` with `gym-naval-academy` at .54) adds identity for App Store video; this angle leaves it out on purpose.

---

## 14. Files behind this spec

- `design/iron-age/scratch-B/icons-B.mjs`: the icon set in the contract's shape, for review only.
- `design/iron-age/scratch-B/icons-sheet-final.png`, `icons-dock.png`, `icons-dock2.png`: code-made review renders.
- `design/iron-age/scratch-B/palette-report.txt`: the full output of `palette.mjs`.
- `design/iron-age/scratch-B/you-0..5.png`: sips crops of `proof/smoke/smoke-you-390.png`, study only.
- `tools/iaB/palette.mjs`, `plates-opt.mjs`, `plates-opt2.mjs`, `measure.mjs`, `prov.mjs`, `render-icons.mjs`: read-only helpers.

**Session notes, for the orchestrator's log:**
- **Installs:** none. **Downloads:** none. **Refusals:** none.
- **One fence slip:** `palette-report.txt` was written by redirecting `node palette.mjs` stdout into `design/iron-age/scratch-B/`. That is inside `~/dev/vibes-night`, but §0 says outputs are never written by redirecting. The file is scratch only, and it was not repeated.
- **No tree touched:** neither main tree nor any worktree was edited, staged or committed. Git was used read-only (`git grep`, `git show HEAD:`).
