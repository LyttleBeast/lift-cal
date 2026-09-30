# Iron Age — the final spec

V59 Phase D, slot `iron-age`. Written 2026-09-27 from the three concepts in `design/iron-age/` and the three judges' scores. Nothing here is approved: every photo, trace and icon is `micah_approved: false`.

**The files this spec is:**
- the pure definition: `wt/web-design/vibes/defs/iron-age.js`;
- the icon set: `wt/web-design/vibes/icons/iron-age.js`;
- the checks: `tools/ia-final-check.mjs` (99 checks, all pass), `tools/ia-final-fonts.mjs`, `tools/ia-final-subset2.mjs`, `tools/ia-final-raster.mjs`, `tools/ia-final-native-build.mjs`, `tools/ia-final-probe.mjs` (§18).

"(computed)" marks a number a script in §18 produced tonight. Research numbers carry their track key.

---

## 0. The pick

**Scoring.** Each judge's five marks, with "could an AI have made this?" inverted (10 − score) and counted twice:

| Concept | Judge 1 | Judge 2 | Judge 3 | Total |
|---|---|---|---|---|
| **A · The Manual Page** | 40 | 40 | 46 | **126** |
| B · The Measurement Form | 38 | 40 | 39 | 117 |
| C · The Apparatus Catalogue | 37 | 37 | 38 | 112 |

**A wins, with no tie.** All three judges picked it. It is the only concept that holds every hard rule, and the only one that checked the copy before changing a shape.

**What was grafted onto A**, each because at least two judges asked for it and it makes A stronger without blurring it:

| # | Graft | From | Why |
|---|---|---|---|
| 1 | **Band mode** for the photos: the plate sits in an 80pt band at the top of its hero box, and no word touches it | C | The photo keeps its full ink-on-stock tone (13.26:1) instead of about 2.8:1 under a pale scrim. It removes the "hero image + white overlay" look, the iOS compositing question and the Steps-ring problem |
| 2 | **No Start-workout photo** | B, C | A's baked ink plate measures 4.42:1 against a pure-stock halftone pixel (judges 1 and 3). The action stays a clean ink block |
| 3 | **`kpi · word`**: no tile and no coloured top band. **The delta pill is kept** | C, judge 2 | Removes the "four stat cards with a ± delta" tell. The pill stays because `you.js:802` says "The pill is the difference…" |
| 4 | **Per-tab traced tailpieces** in place of A's dinkus: globe dumbbell (You), Indian club (Train), chest expander (Fuel), wooden ring (Weight), globe bar-bell (recap), none on Steps | C | Micah asked for "cool icons". Still one ornament per screen, never inside data |
| 5 | **`inkOf`**: small text in ochre is inked warn, in pewter steel | C | Ochre is 3.92:1 and pewter 3.90:1 on the stock |
| 6 | **The Photo add tile's camera printed in madder**, with no filled ink square | B, C | A's ink square was icon-in-a-square (N22) |
| 7 | **`shape.rule.total`**: a double rule over the recap's session totals and the estimator's total | B | The period form's totals line |
| 8 | **No caps anywhere, and no small caps** | B | Native `small-caps` is unverified, no unit is ever uppercased, and two judges named A's tracked caps heads a stock "vintage" tell. A's declared caps exception is dropped |
| 9 | **A true grey for `dim`** (`#565450`, OKLCH C .007) | B, judges 2 and 3 | "Grey when the move is too small" (`you.js:802`) is `.delta.flat`, which is dim. A's dim and steel were browns |
| 10 | **Icon fixes**: the globe bar-bell's centre band and double-ruled bar, the Fairbanks dial scale, the feetless calendar, the rim-and-well dishes | B, C | A's bar-bell read as spectacles at 44px, its beam scale as a crane, its calendar as a stool, and three flat plates as a menu icon |
| 11 | **The confidence dot drawn as a shape too** (filled, half, ring) and **hatched macro fills** | C, judge 2 | The last two colour-only encodings |
| 12 | **Web heads at the native statics' width** (wdth 100) | B, judge 3 | A set the web h1 at wdth 80, which the native statics can't draw: a parity gap |
| 13 | **List rows plain, leaders in Settings only** | C | Leaders on every name-and-value row are the Ledger vibe's device set |

**Not grafted:**
- B's plates and underlined fields, and C's underlined fields and removed pill: they make shipped sentences untrue.
- B's mustard (6.25 ΔE00 from warn, while the copy names yellow and amber in one guide).
- B's condensed-Archivo figure (Meet Day's world).
- C's Old Standard TT (static, so it breaks the variable-web-font rule, and the Coach card would drop a reason in 2 of 640 cases).
- C's themeColor change.
- C's Triat engraving as a hero image: engravings are allowed as traced icons, not as hero art (§1 of the prompt). It stays Micah's option (§15).

---

## 1. The name and the idea

**Iron Age.** Feel line: "Ink on cream, circa 1900." (25 characters, one line at 375.)

Rack becomes a physical-culture manual printed about 1904: warm ink on a matte book stock, each chapter opening on a head that stands on a thick-and-thin rule, each figure set like a manual's challenge line, and the roomiest boxes carrying a real halftone plate from a manual or a gymnasium of the period. Nothing is boxed except what a page would box, and the one colour that isn't data is the rubric red that marks Coach's voice.

**What a judge should picture:**
- **The page:** cream stock `#e6dec9` with a faint measured mottle, ink `#1c1712`, no cards. Chapters open on Besley over an Oxford rule; articles open on Besley over a single rule. Tables are ruled.
- **One red:** madder carmine `#a1374f`, once a screen, and only for Coach's voice (and the Photo cut in the add sheet, which is its own screen). The primary button is solid ink.
- **The plates:** halftone photographs from 1890–1904, ink on the same stock, in a band across the top of four hero boxes, with no word on them.
- **The figures:** one numeral voice, Besley ExtraBold with tabular figures, its unit on the baseline in small Archivo.
- **The icons:** an engraved set with square caps. Its signature pieces are a globe bar-bell, a dial platform scale, a heart-shaped padlock and a printers' fist in place of the AI sparkle.

---

## 2. Every token role

Roles are `design/ROLES.md`'s. Every colour is 6-digit hex; no value is a legacy spelling. The definition's comments say why each value is what it is. Ratios are WCAG 2.x (computed).

### 2.1 Meta

| Role | Value | Note |
|---|---|---|
| `id` / `name` | `iron-age` / `Iron Age` | |
| `feel` | "Ink on cream, circa 1900." | |
| `experimental` | `false` | |
| `scheme` | `light` | |
| `icons` | `iron-age` | §12 |
| `images` | `youHero`, `summaryHero`, `stepsToday`, `weightLog` (band mode), `thumb` | §10. `coachCard`, `startWorkout` and `fuelSummary` carry none |
| `themeColor` | `#14161a` | v1's: a light vibe leaves the meta alone (R3.3) |
| `variants` | all 29 blocks | §7 |

### 2.2 Colours (the 43 keys, plus one proposed)

**Surfaces**

| Role | Hex | Job | Numbers |
|---|---|---|---|
| `rack` | `#e6dec9` | the stock (r2g), carrying the `manual` grain tile | ink 13.26 flat, 12.53 on the grain's darkest pixel `#e0d8c4`. Tailwind orange-100 5.62; 81.3 ΔE00 from v1's ground |
| `bar` | `#ebe4ce` | sheets, fields, the lead plates, the dock, the workout bar; never grained | 1.06 against rack; ink 13.99 |
| `well` | `#e6dec9` | = rack: in-card insets draw as keylines on the page | |
| `raised` | `#d2cab7` | ink at 10% over the stock: plain buttons, set and step badges, a chosen option, Coach's chat blocks | ink 10.90, steel 6.29, dim 4.63 |
| `grip` | `#7b6c52` | the grab handle, a toggle's off track, trajectory dots | 4.02 on bar (v1's is 1.41) |
| `track` | `#d6c8a8` | the empty part of a meter | every plate as a fill on it ≥ 3.16 |
| `tileHero`, `tileLit` | `#e6dec9` | native's flat add-tile washes: none are drawn | |

**Lines**

| Role | Hex | Job | Numbers |
|---|---|---|---|
| `collar` | `#c4b79b` | decorative only: the 1px lines no look re-draws, chart grids, the heat strip's untrained day (pinned) | 1.48 on rack |
| `knurl` | `#77736a` | control edges, ring shadows, the unlit spark bars (pinned) | 3.52 rack, 3.33 grain, 3.72 bar. **Changed from A's brown `#7b6c52`**: the lit ochre bar and an unlit one are 1.11:1 apart in luminance, so hue must part them: 20.9 ΔE00 (20.0 deutan, 20.2 protan) against A's 14.2 |

Every drawn rule and keyline is **ink** (`shape.rule.ink`), not collar or knurl: period rules were the text's own ink, and weight made them light [T7 §4.3].

**Ink**

| Role | Hex | Job | Numbers |
|---|---|---|---|
| `chalk` | `#1c1712` | ink: warm near-black, not brown, not sepia (OKLCH L .209 C .012) | 12.53–13.99 |
| `steel` | `#4a3f31` | secondary | 7.23 on grain, 6.29 on raised |
| `dim` | `#565450` | tertiary and "grey" (OKLCH C .007) | 5.32 grain, 4.63 raised |
| `faint` | `#565450` | = dim: its sites are text | |
| `inverse` | `#1c1712` | the ink fill behind knocked-out words | |
| `knockout` | `#ebe4ce` | words cut out of ink | 13.99 |
| `calMark` | `#ffffff` | "the white head", always with a 1pt ink edge (`shadow.calTick`) | 1.34 against the page, so the edge is required. Pure white: vibes-contract's hue family "white" rejects a tinted paper-white like `#fffaf2` (HSL s 1.0) |

**Accent and state**

| Role | Hex | Job | Numbers |
|---|---|---|---|
| `accent` / `focus` | `#a1374f` | madder carmine, the rubric: Rack's voice, focus, a toggle on, the PR highlight, the tour's lit ring | 4.93 rack, 4.66 grain, 5.20 bar. 17.3 ΔE00 from its nearest data colour; 26.9 from Claude's clay; rose-800 5.97 |
| `accentPressed` | `#8e3548` | | rose-900 5.86 |
| `onAccent` | `#f6efdd` | | 5.77 / 6.65 |
| `danger` | `#82180c` | Indian red: the danger keyline and words, swipe to delete, errors, a rest run over | 7.09 grain |
| `onDanger` | `#f6efdd` | one value (only v1 keeps the split) | 8.78 |
| `done` | `#0e5f40` | viridian: a set done, its tick, the rest line | |
| `onDone` | `#f6efdd` | the knocked-out tick | 6.71 |
| `good` / `warn` / `bad` | `#0e5f40` / `#6e4d08` / `#82180c` | green, amber, red, as the copy names them | 5.42 / 5.42 / 7.09 on grain |
| `onWarn` | `#f6efdd` | native's solid trial bar | 6.71 |

**The plates (data, never chrome)**

| Role | Hex | Meaning | On rack / grain |
|---|---|---|---|
| `pRed` | `#82180c` | chest, protein, gain | 7.51 / 7.09 |
| `pBlue` | `#1f4a72` | back, fat, water, training, cut, drops | 6.86 / 6.48 |
| `pYellow` | `#8b6600` | legs, carbs, Fuel and Weight, hold. Moved yellower than research's `#90620b` (OKLCH h 84 against 76), because the copy says "the yellow line" | 3.92 / 3.70: **graphics and large text only**; small text through `inkOf` |
| `pGreen` | `#0e5f40` | shoulders, steps | 5.74 / 5.42 |
| `pWhite` | `#2a241d` | arms, the Steps subject: the white plate drawn in ink, as an engraving draws white | 11.44 / 10.81 |
| `pChrome` | `#6a6d6c` | core (pewter) | 3.90 / 3.68: graphics only; small text through `inkOf` |
| `onPlate` | `#f6efdd` | a figure on a filled plate | 4.56–13.38 on all six |

**Shade and lift:** `shade` and `lift` are both ink `#1c1712`: the sheet backdrop is ink at .45 and a pressed row darkens (R3.3).

**Native legacy keys**, each equal to the role that now has its job: `onYellow` = `onGreen` = `white` = `#f6efdd`, `pYellowPressed` `#8e3548`, `fallback` `#4a3f31` (steel).

**Proposed, not in v1.js:** `band` `#1c1712`, the web's fixed strip under the status bar. White on it 17.79.

### 2.3 Alpha helpers

v1's map unchanged: yellow → pYellow, red → pRed, blue → pBlue, green → pGreen, ground → rack, accent, danger, warn.

### 2.4 Tints (all 28)

| Tint | Role, α | Why |
|---|---|---|
| `setDone` | done .07 | the done row, visible from the bench; ink 11.99, dim 5.09 on it |
| `setFlash` | accent .14 | the tick flash; dim 4.64 at its peak |
| `tagW` / `tagF` / `tagD` | **warn** / pRed / pBlue, .10 | the bare W / F / D letters take these colours (E4). W is warn because ochre text fails |
| `dropRail` / `dropAdd` | pBlue .75 / .75 | the rail 3.93:1 on the page |
| `pickSel` | **chalk** .06 | a chosen row is a darker leaf, never a pink one |
| `block` | accent 0 | a lifting block is framed by rules, not washed |
| `coachBase` / `coachLow` / `coachHigh` | accent .14 / .07 / .30 | the pulse round the set check: a graphic |
| `rowPress` | lift .04 | |
| `pillBase` / `pillUp` / `pillDown` / `pillWarn` | lift .06 / good .10 / bad .10 / warn .10 | **the one pill** (§3). Its words over the grain: dim 4.73, good 4.71, bad 6.00, warn 4.73 |
| `zoneCut` / `zoneHold` / `zoneGain` | pBlue .18 / pYellow .20 / pRed .16 | **fallbacks only.** A wash on cream loses its hue: zoneCut over the track is OKLCH h 97, C .027, a greige. `chart · print` hatches the bands (§8) |
| `dockGlass` / `wkBarGlass` | bar 1 / bar 1 | opaque paper, no glass |
| `backdrop` | shade .45 | ink behind a sheet |
| `trajGood` / `trajWarn` / `trajBad` | .15 each | |
| `reviewBg` / `reviewBorder` | chalk 0 / chalk 1 | "Next week" is a keyline box with no fill, so the lead plate stays the only thing with both a fill and a border (R6.1) |

### 2.5 Type

**Two families.** Archivo (v1's) sets the body, every label, value, delta, arrowed string, button, chip and dock label, and the Coach card on v1's own metrics. **Besley v4** sets the heads, the card heads, the greeting, the challenge figure and the running meta.

Besley has no ↑ ↓ →, so it never sets a string that can carry one; the web stack falls to Archivo for any stray arrow.

**How native picks Besley: `face.bands`, by wdth.** Native's `build()` already reads `face.bands` (`theme.js:323`). A band claims a wdth that no Archivo site passes. The native tree passes 78, 88, 90, 92, 94, 96, 100, 104, 108, 110, 112 and 118 and nothing else (counted), so:
- **101 is Besley roman.** On the web Besley's width axis stops at 100, so 101 draws exactly the width the native statics draw. There is no parity gap.
- **99 is Besley italic.**
- Nobody may "tidy" 101 or 99 to 100: that silently sets those presets in Archivo on native. The definition says so.

Checked by building the definition with native's own `build()` (§18): every preset resolves to a registered key.

| Preset | Face | Size | wdth / wght | Case, ls | lh (native, floored at minLh) | Ink |
|---|---|---|---|---|---|---|
| `body` | Archivo | 15 | 100 / 400 | as written | 1.45 (22) | chalk |
| `h1` | Besley ExtraBold | 24 | 101 / 800 | 0 | 1.1 (41) | chalk |
| `h2` | Besley ExtraBold | 18 | 101 / 800 | 0 | 1.15 (31) | chalk |
| `h3` (the chapter head) | Besley ExtraBold | 18 | 101 / 800 | 0 | 1.2 (31) | chalk |
| `eyebrow` (article head) | Besley SemiBold | 15 | 101 / 600 | upper 0, 0 | 1.2 (26) | chalk |
| `btn` | Archivo | 14 | 100 / 700 | .01 | — | chalk |
| `btnLg` | Archivo | 16 | 100 / 700 | upper 0, .01 | — | the kind's |
| `dockLbl` | Archivo | 11 | 100 / 600 (active 700) | upper 0, .01 | — | dim |
| `fieldLbl` | Archivo | 12 | 100 / 600 | upper 0 | — | steel |
| `note` | Archivo | 13 | — / 400 | | 1.5 (20) | dim |
| `statVal` | Archivo | 20 | 100 / 800 | tnum | 1 (22) | the caller's |
| `statLbl` | Archivo | 12 | 100 / 600 | upper 0 | — | steel |
| `timer` | Archivo | 22 | 100 / 700 | tnum | — | chalk |
| `kpiVal` | Archivo | 22 | 100 / 800 | tnum | 1 (24) | chalk |
| `headline` | Besley ExtraBold | 28 | 101 / 800 | tnum | 1 (47) | the caller's |
| `youGreet` | Besley ExtraBold | 25 | 101 / 800 | 0 | 1.08 (42) | chalk, all one ink |
| `chip` | Archivo | 12 | 100 / 600 | | — | chalk |
| `segBtn` | Archivo | 12 | 100 / 600 | upper 0 | — | steel |
| `setInput` | Archivo | 15 | 100 / 700 | tnum | — | chalk |
| `mono` | Menlo / monospace | 12 | | | | chalk |
| `meta` (**proposed**) | Besley Italic | 14 | 99 / 400 | | 1.3 (24) | steel |
| `loadNum` | Besley ExtraBold | the site's 26–40 | 101 / 800 | tnum | 1 (67 at 40) | the site's |

- **No caps role at all.** Six presets carry `upper: 0`: those strings are written in sentence case and show as written. 'COACH ME' is written in capitals and stays so. The Coach card's own "COACH" keeps v1's frozen type (an inherited v1 pair, §5.3).
- **Nothing new is under 11pt.** Chart text is raised to 11 by `chart · print`.
- **Literal sites** keep v1's sizes; deep looks re-set a few (§8): the exercise name Besley SemiBold 16, the set-table column heads Archivo 12/600 steel, the settings label Archivo 14/600.
- **Widths** (computed on the native statics at wdth 100): "September 2026" at 24 is 216.9pt, no wider than v1's native header. "Good afternoon," at 25 is 226.5, inside the 231 a 375 phone gives it. "Where this comes from" at 18 is 235.7, inside 256 at 320. `12,480` at 40 is 139.4. "Member since Aug 21, 2025 · 400 days" in italic 14 is 260.6: it wraps at 320, as v1's line can.
- **The native cost:** Besley's hhea is 1.675, so its line heights are floored there until a device screenshot proves a tighter clamp (ink extent 1.104; E10). Heads and figures get taller, and the page gets longer. **No Besley text sits in a fixed-height box.** The Vibes card's `315` (loadNum 35, line 59) sits clear of the accent bar in its 88pt swatch.

### 2.6 Face

| | Iron Age |
|---|---|
| Text face (native `face.family`) | Archivo, v1's four package files, snap {650 → 700, 750 → 800}, `minLh` 1.088 |
| Display faces (native `face.bands`) | `Besley` {600, 800} for wdth 100.5–101.5; `BesleyItalic` {400} for wdth 98.5–99.5; each band with its own empty `snap` so Archivo's snap can't send it to a weight it doesn't ship; `minLh` 1.675 |
| Native keys the vibe adds | `Besley_600`, `Besley_800`, `BesleyItalic_400`: **3 of the 4 allowed**, the picker face included |
| Picker face | `Besley_800`: native `pickerFace()` reads `loadNum(40)` (checked) |
| Web text stack | `'Archivo', system-ui, -apple-system, sans-serif` (v1's; `--font` unchanged) |
| Web display / italic / digits (**proposed** `face.web.display`, `.italic`, `.num`) | `'IA Besley', …`, `'IA Besley Italic', …`, `'IA Besley Digits'` |
| Mono | v1's |
| Coach card | **Archivo on v1's metrics.** No advance table: `T.fit.metrics` stays null (checked) |

### 2.7 Radius

`r` 0, `sm` 0, `sheet` 0, `tile` 0, `plate` 0, `chip` 0, `mark` 0, `idx` 0, `hair` 0, `bubble` 0, `badge` 0, `round` '50%', **`pill` 999**.

Round survives only where the copy or the object is round:
- the KPI delta pill (the copy names it);
- the day dots ("this week's seven days", `you.js:803`);
- the Steps ring and the chart's peak ring ("The ring marks your peak");
- legend and status dots;
- the avatar;
- the toggles.

### 2.8 Shadows, rings, scrims

- **No shadows.** `peek`, `rest`, `toast`, `fab`, `fabPressed` and `tourCard` are web `[]` and native `{ opacity 0, radius 0, x 0, y 0 (, elevation 0) }`. Each surface that floated on one carries a 1pt ink keyline instead.
- **Rings (web):**
  - `calTick`: chalk, spread 1, solid (the white marks' ink edge);
  - `flame`: accent .35, inset 1;
  - `kpiDay`: knurl, inset 1.2;
  - `kpiDayOn`: none;
  - `kpiToday` and `kpiTodayOn`: well 1.5 + **chalk** 2.5 (today ringed in ink);
  - `guideEaten`: knurl, inset 1;
  - `traj*`: 4 at .15;
  - `tourLit`: accent 2 (5.20 on the dock's paper).
- **Scrims:**
  - `sheet`: backdrop, `filter: 'none'` (no blur);
  - `dock`: dockGlass, `none`, native intensity 0;
  - `wkBar`: wkBarGlass, `none`;
  - the `webkit` twins keep v1's values (fixed);
  - `tour`: a flat veil of ink at .80 (both stops the same, so no gradient). The tour card, bar paper with an ink keyline, reads 8.21:1 against it. Native gets `[.8, .8, .8]` at `[0, .42, 1]` (checked).

### 2.9 Native chrome

| Role | Value |
|---|---|
| `statusBar` | `dark` |
| `keyboard`, `datePicker` | `light` (native `pickerTheme` becomes `{ themeVariant: 'light' }`, checked) |
| `blurTint` | `light` (unused: intensity 0) |
| `shadow` | `#1c1712` |
| `camera` | `#000000` |
| `systemFace` | `null` |
| fixed | `appearance` dark, `launch` `#14161a`, `manifestTheme` `#14161a`, `webStatusBar` black-translucent (v1's) |
| `colorScheme` | `null` (an unset color-scheme already draws light form controls) |

- **`signIn` and `banner`:** v1's values in 6-digit spelling. Native sign-in draws before any vibe is known.
- **Banner white** on this vibe's pRed and pGreen fills reads 10.07 and 7.69.

### 2.10 Tables

| Table | Value |
|---|---|
| `groups` | chest `#82180c`, back `#1f4a72`, legs `#8b6600`, shoulders `#0e5f40`, arms `#2a241d`, core `#6a6d6c`, fallback `#4a3f31` |
| `groupPlates` | the same six in UPPERCASE |
| `plates` | 45 / 35 / 25 / 10 / 5 / 2.5 lb: pRed, pBlue, pYellow, pGreen, pWhite, pChrome |
| `importGroups`, `mark`, `subjects`, `admin`, `conf` | v1's roles (the admin pill's web / native split unchanged) |
| `kpi` | v1's roles, every `a` 0: `kpi · word` draws no tile |

### 2.11 `shape` (proposed; VOCAB §4)

| Param | Value | Why |
|---|---|---|
| `rule.ink` | `chalk` | every rule is ink |
| `rule.hair` | 0.5 | *Physical Culture* 1908's folio hairline |
| `rule.head` | [3, 2, 1.2] | **the Oxford rule, read from the head outward:** 3pt, 2pt gap, 1.2pt (1 nominal, +0.1 per edge of gain). Chapters only: section heads, the masthead, a sheet's top edge |
| `rule.place` | `below` | the head sits on its rule |
| `rule.sub` (**proposed**) | [1.2] | the single rule articles sit on: card heads, the exercise name, the challenge figure. Without it every card on You stacks one Oxford rule under another |
| `rule.total` (**proposed**) | [1, 2, 1] | the double rule over a total: the recap's totals line and the estimator's total, nowhere else |
| `leader` | dim, dot 1.5, pitch 4.5, min 16 | Settings rows only |
| `band`, `gutter` | VOCAB's defaults | no look here reads them |
| `keyline` | chalk, 1 | stamps: chips, plate chips, the session plates, the callout |
| `lead.keyline` (**proposed**) | true | the tab's one boxed card is a plate: bar paper in a 1pt ink keyline. Bar alone is 1.06:1 on the stock |

### 2.12 `inkOf` (proposed)

`{ pYellow: 'warn', pChrome: 'steel' }`.

A site that sets **small** text in a group or subject colour resolves the role through this map: a carbs label, a legs tag's letter, a Weight or Fuel subject line under 18pt. Graphics and large text keep the role itself: Fuel's 40pt hold-zone figure stays ochre (3.92, large text), and so does the weight line.

---

## 3. The copy guards (why the shapes are what they are)

Every one of these was checked in the tree by the concepts and the judges. Each shape stays because a shipped sentence names it.

| Sentence | Where | What it holds |
|---|---|---|
| "The pill is the difference between the two weeks. Green means … red the other way, grey when …" | `you.js:802` | the KPI delta stays a pill; good green, bad red, dim grey |
| "The dots are this week's seven days" | `you.js:803` | round day dots |
| "in this box … Clear the box" | `food.js:3320` | fields stay boxes (`field · square`) |
| "tap the box on the right to log the set" | `workout.js:1270` | the set check stays a square box |
| "The big number … its colour is the band you are in right now" | `food.js:3582` | Fuel keeps its zone colour, so it carries no photo |
| "Blue — cut", "Yellow — hold", "Red — gain", "the white head" | `food.js:3596-3617` | the bands are hatched in full-strength ink; the head is white with an ink edge |
| "the yellow line", "amber the other way" | `you.js:1066-1067` | pYellow yellower; warn stays amber |
| "green = goal met" | `steps.js:306` | good = viridian |
| "The ring marks your peak" | `stats.js:422` | the peak ring stays round |

**Logged exception (R6.6):** research says "no delta pills". The copy wins.

---

## 4. Shape language

- **Cut square.** Radius 0 except what §2.7 lists.
- **Rules carry structure; weight makes them light.** Four weights, all in ink:
  - the 0.5 hairline (rows, cells, columns);
  - the 1.2 rule (articles, table heads);
  - the 1 / 2 / 1 double rule (totals only);
  - the 3 / 2 / 1.2 Oxford rule (chapters only).
- **Container roles (R6.1):**
  - **lead**: one plate per tab (Fuel's summary, Weight's log, Steps' today, You's greeting): bar paper in a 1pt ink keyline. The only role with both a fill and a border.
  - **group**: everything else sits on the page under its rule.
  - **callout**: the boxed note ("Next week", the estimator notices): a 1pt ink keyline, no fill.
  - **stamp**: square 1pt ink keylines for chips, plate chips, the live session's plates.
  - **sheet**: an edge-to-edge leaf with the Oxford rule along its top.
- **Spacing rhythm:** 4–8 inside a group, 20 between articles, 36 before a chapter head. Lead padding 20. List rows on a 44 pitch.
- **One surprise per tab (R6.9):** the lead plate with its photo band (You, Steps, Weight, recap); Fuel's 40pt challenge figure; Train's printed calendar.
- **One ornament per screen:** the tab's traced tailpiece, 32 under the last box of a long scroll. Never inside data, none on Steps.
- **Stamped, never embossed:** keylines are flat ink. No bevel, no "bite".

---

## 5. Contrast and colour vision (computed, `ia-final-check.mjs`)

### 5.1 Text on every surface (needs 4.5)

The grain column is the `manual` tile's darkest pixel `#e0d8c4`; the pill columns are each pill over that pixel.

| Text | rack | grain | bar | raised | pressed | done row | done row, grain | chosen | flash peak | pill base | pill up | pill down | pill warn | ai-warn box |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| chalk | 13.26 | 12.53 | 13.99 | 10.90 | 12.28 | 11.99 | 11.39 | 12.49 | 10.93 | 11.13 | 10.89 | 10.60 | 10.94 | 12.17 |
| steel | 7.65 | 7.23 | 8.07 | 6.29 | 7.09 | 6.92 | 6.57 | 7.21 | 6.31 | 6.42 | 6.28 | 6.12 | 6.31 | 7.02 |
| dim / faint | 5.63 | 5.32 | 5.94 | 4.63 | 5.22 | 5.09 | 4.84 | 5.31 | 4.64 | 4.73 | 4.63 | 4.50 | 4.65 | 5.17 |
| accent | 4.93 | 4.66 | 5.20 | *4.05* | 4.57 | *4.46* | *4.24* | 4.65 | *4.06* | *4.14* | *4.05* | *3.94* | *4.07* | 4.52 |
| good / pGreen | 5.74 | 5.42 | 6.05 | 4.72 | 5.31 | 5.19 | 4.93 | 5.40 | 4.73 | 4.81 | 4.71 | 4.59 | 4.73 | 5.26 |
| warn | 5.74 | 5.42 | 6.06 | 4.72 | 5.32 | 5.19 | 4.93 | 5.41 | 4.73 | 4.82 | 4.71 | 4.59 | 4.73 | 5.27 |
| bad / danger / pRed | 7.51 | 7.09 | 7.92 | 6.17 | 6.96 | 6.79 | 6.45 | 7.07 | 6.19 | 6.30 | 6.17 | 6.00 | 6.19 | 6.89 |
| pBlue | 6.86 | 6.48 | 7.24 | 5.64 | 6.36 | 6.21 | 5.90 | 6.47 | 5.66 | 5.76 | 5.64 | 5.49 | 5.66 | 6.30 |
| pWhite | 11.44 | 10.81 | 12.07 | 9.41 | 10.60 | 10.35 | 9.83 | 10.78 | 9.43 | 9.60 | 9.40 | 9.15 | 9.44 | 10.50 |
| pYellow | *3.92* | *3.70* | *4.13* | *3.22* | … | | | | | | | | | |
| pChrome | *3.90* | *3.68* | *4.11* | *3.20* | … | | | | | | | | | |

**Every pair under 4.5 (italic above) is one this vibe does not produce, and each is policed by a rule:**
- **accent** on raised, a done row, a flash, any pill, the trial bar: madder is never set as text on a wash or on `raised`. Where v1 puts accent text on one of those, the Iron Age site inks it chalk and keeps a non-colour cue.
- **pYellow / pChrome** as small text anywhere: `inkOf` sends them to warn (5.42 on grain) and steel (7.23).
- **Anything but ink over a photo** (steel 2.69, dim 1.98, accent 1.74 against the scrimmed worst pixel `#898275`): no word sits on a photo in band mode. In the fallback every word over the photo is ink (4.67).

**The lowest produced text pairs:**
- onPlate on pChrome 4.56 and on pYellow 4.58;
- dim on raised 4.63, and on the flash peak 4.64;
- accent on a chosen row 4.65, and on the grain 4.66;
- ink over the fallback scrim 4.67.

**Ink on fills:**
- knockout on inverse 13.99;
- onAccent 5.77 (6.65 pressed);
- onDanger 8.78;
- onDone 6.71;
- onWarn 6.71;
- onPlate 8.78 / 8.03 / 4.58 / 6.71 / 13.38 / 4.56;
- white on the band 17.79;
- chalk on calMark 17.79;
- the tour card against its veil 8.21.

**Large text only (3:1):** pYellow 3.92 on rack, 3.70 on grain, 4.13 on the lead plate. Fuel's hold figure is 40pt and Weight's figures are 28–32pt, so all pass.

### 5.2 Graphics (need 3:1)

| Graphic | Ratio |
|---|---|
| knurl control edge on rack / grain / bar | 3.52 / 3.33 / 3.72 |
| grab handle (grip) on bar | 4.02 |
| focus on rack / bar | 4.93 / 5.20 |
| dock icon at rest (dim) / active (ink) on bar | 5.94 / 13.99 |
| tour's lit ring on the dock | 5.20 |
| drop rail | 3.93 |
| plates as marks on rack | 7.51, 6.86, 3.92, 5.74, 11.44, 3.90 |
| plates as fills on the track | 6.08, 5.56, 3.17, 4.65, 9.27, 3.16 |
| Steps ring arc on plate paper | 6.05 |
| done check fill | 5.74 |
| the white marks' ink edge on the track | 10.75 |

**Not 3:1 pairs, by design:**
- The heat strip's trained (pYellow) against untrained (collar) cell is 2.65. The trained cell against the page is 3.92, and the untrained cell is an empty cell painted by the pinned `analytics.js` in collar.
- The coach pulse (1.54) is decoration around a check whose own edge is 3.52.

**Decorative:** collar 1.48, track 1.23, raised 1.22, bar 1.06 on the page.

### 5.3 v1 pairs inherited unchanged

- The Coach card's 10pt caps "COACH" and "COACH ME": their type is frozen by the card's metrics. Their colour is now madder at 4.66 (grain) to 4.93 (flat stock), no worse than v1.
- Any chart text Q finds under 11pt that cannot be raised without clipping.

### 5.4 Colour vision (Machado 2009, severity 1; CIEDE2000)

| | Worst group pairs | Min | Good vs bad | Accent's nearest |
|---|---|---|---|---|
| Normal | back/core 21.71, shoulders/core 22.80, legs/core 24.72 | **21.71** | 51.91 | chest 17.32 |
| Deuteranopia | shoulders/core 12.64, shoulders/arms 14.19, chest/legs 14.31 | **12.64** | 14.48 | shoulders 8.52 |
| Protanopia | chest/shoulders 13.31, chest/arms 13.41, shoulders/core 13.75 | **13.31** | 13.31 | core 10.90 |

- **Worst group ΔE00 across all three: 12.64** (≥ 12, R2.5).
- Lit against unlit spark bars: 20.9 / 20.0 / 20.2.
- Every up/down keeps its arrow or sign.
- The calorie bands add pattern, the macros add hatches, and the confidence dot adds shape.
- Chosen, current, done and today never rest on colour alone: inversion, ink keylines, weight 800, filled ticks.
- The accent's CVD distance to shoulders (8.52) carries no meaning: Coach's voice also carries its mark and its words.

### 5.5 Guards

- **Tailwind v3 (R2.7):** rack orange-100 5.62, bar amber-50 5.34, accent rose-800 5.97, accentPressed rose-900 5.86.
- **Not gated (OKLCH C < .015):** dim (stone-600 1.21, C .007) and knurl (stone-500 3.25, C .014). Both are neutral greys.
- **The AI cream band (R3.5):** rack's lowest channel is 0xC9, so it is outside the band. Madder is 26.87 ΔE00 from Claude's clay. The display face is a Clarendon, not a Didone.

---

## 6. Fonts

| | Besley v4 (upstream, indestructible-type) | Archivo (v1's) |
|---|---|---|
| **Licence** | OFL 1.1. `OFL.txt` first line: "Copyright 2022 The Besley Project Authors (https://github.com/indestructibletype/Besley)". **No Reserved Font Name**: the file carries the OFL body's definition of the term but no "with Reserved Font Name" declaration (computed). OFL.txt sha256 `9276de391a2e4fc667adb36766a265ec77af43a92df2938c52a62bd7e2beea15` | OFL 1.1, no RFN. Already owed in the Licences row |
| **Commit** | `99d5b97fcb863c4a667571ac8f86f745c345d3ab` (paths confirmed from the repo tree at that commit) | unchanged |
| **Web sources** | `https://raw.githubusercontent.com/indestructible-type/Besley/99d5b97fcb863c4a667571ac8f86f745c345d3ab/fonts/variable/Besley%5Bwdth,wght%5D.ttf` (sha256 `12d70d6287c9a93975afef302bf7e41187fe3c88fac55a20a467e76ceeb70dd9`, 277,196 B) and `…/fonts/variable/Besley-Italic%5Bwdth,wght%5D.ttf` (`304fb2bb39263d6bf395f8540f3d33d415fd30c38385c9cb37004cac0c1f595d`, 305,732 B) | v1's @import, 0 bytes |
| **Web files** (subset-font, Google's latin range + ≈, all layout features, **each keeping a wght axis, wdth pinned at 100**) | `IA Besley` wght 600–800: **44,296 B**; `IA Besley Italic` wght 400–500: **42,772 B**; `IA Besley Digits` (0–9 , . ≈) wght 600–800: **5,896 B**. **Family total 92,964 B (90.8 KiB) ≤ 120 KB** (computed) | |
| **Native statics** (`…/fonts/ttf/`) | `Besley-SemiBold.ttf` (155,648 B, `3e9ef08c657fd1fd4af8a6754115cb5021466d923e8426f30fa0597937347334`) → `Besley_600`; `Besley-ExtraBold.ttf` (167,244 B, `11304ee2f5e3e3998a0fc84baa51f1c8ff7b37b85d41e384bbf450fd09f76306`) → `Besley_800`, **the picker face**; `Besley-Italic.ttf` (163,512 B, `8300f5f6346d4d8312623accb0c5bb30c2b47df1bd28d0e6492bd46c2ea1f2ac`) → `BesleyItalic_400`. **3 of 4.** About 0.49 MB in full; latin subsets that keep names and features are smaller | the app's four package files |
| **t5-check** (re-run tonight) | all three: uniform tnum digits (1190 / 1320 / 1100), GSUB `c2sc calt liga onum smcp ss01 tnum`, unique PostScript names `Besley-SemiBold` / `Besley-ExtraBold` / `Besley-Italic`, none equal to an Archivo package name | |
| **Metrics** | UPM 2000, hhea 2500 / −850 → 1.675 (all three), cap .750, x .520 | 1.088 |
| **Coverage** | nothing missing from the set Besley may set (digits, − ≈ × % ’ “ ” — – … and the latin letters). It lacks → ↑ ↓ ⚙ ✕ ⋯ ✓ ↳, which Besley never sets: the glyphs are drawn (§12) | ⚙ ✕ ⋯ ✓ ↳ ⚠ ✎ ▾ ▴ missing, as v1 |

- **Fetch note:** the `github.com/…/raw/` form redirects to `raw.githubusercontent.com`. §14 lists that host "(the google/fonts repo)". If that is read strictly, fetch from a GitHub release instead (Q-Q3).
- **FONTS.json and OFL.txt** go beside the files in both trees (§14).
- **Where Besley goes:**
  - h1, h2, h3;
  - card and sheet heads;
  - the exercise name;
  - the greeting;
  - the challenge figure (`headline`, `loadNum`);
  - the running meta (italic);
  - the picker's `315`.
- **Where it never goes:** body, labels, table values, deltas, any string with an arrow, the Coach card, buttons, chips, the dock, the timer.

---

## 7. What each block does (VOCAB order, all 29)

| Block | Look | Iron Age |
|---|---|---|
| `card` | `ruled` | No ground, no box. The head row (title in `eyebrow`, Besley SemiBold 15; italic steel meta; the drawn ⋯ dinkus at the right) sits on the single 1.2 rule (`rule.sub`) at full width; the content runs to the rule's width; cards part by 20. **The lead card** (Fuel's summary, Weight's log, Steps' today) is the plate: bar paper, square, 1pt ink keyline, padding 20. Steps' and Weight's plates carry their photo band at the top (§10). Fuel's empty meal stays one line |
| `youCard` | `ruled` | As card. "Doing well" sits on a viridian (good) rule and "Could improve" on an amber (warn) rule, in place of v1's 3pt side stripes (R6.4). Which is which stays in the title words |
| `eyebrow` | `v1` | v1's geometry; the type role changes: Besley SemiBold 15, sentence case, ink, no tracking, no device. `.chart-sub` sub-heads take it too |
| `sectionHeader` | `rule` | The chapter head: `h3` (Besley ExtraBold 18, sentence case, ink) **sitting on the full-width Oxford rule**, 36 above and 12 below. No trailing hairline. **No caps** |
| `screenHeader` | `masthead` | The eyebrow becomes the running head in italic `meta` (Besley Italic 14, steel: "Training log", "Fuel"). Under it the h1 (Besley ExtraBold 24), then the Oxford rule across the full measure. The nav buttons keep their place and 34pt size as square keyline plates with the drawn chevrons. The recap's hero is this masthead inside its lead plate, under the photo band |
| `sheetHost` | `full` | Edge to edge, square top corners, the Oxford rule along the top edge. The 36 × 4 grab handle stays, in grip (4.02). Ink .45 backdrop, no blur. Heights 86 / 92 kept |
| `sheetTitle` | `rule` | The h2 (Besley ExtraBold 18) over a 0.5 ink hairline at the sheet's full content width; the eyebrow above it |
| `statRow` | `folio` | The period folio line: a 0.5 hairline above and below; three columns on one baseline, parted by 0.5 ink verticals; values Archivo 20/800 tabular, left-aligned, in the caller's colour; labels under them Archivo 12/600 steel, sentence case. No fill, no box. MiniStats the same at 16 |
| `kpi` | `word` | No tile, no corner tint, no top band. The label (Archivo 12/600 steel) with **the delta in its pill** at the right: radius.pill, `tint.pill*` at .10, signed Archivo 800 text with its arrow in good / bad / dim. The 22pt value with its unit; "last week …" in steel; a word-sized sparkline (72 × 20, 2pt, a 3.5pt square end mark; this week in its subject colour, the unlit bars knurl); seven round day dots, today ringed in ink. The 2 × 2 grid and its order kept. **Engine note:** `word` must draw the pill when the vibe's pill tints are above 0 (Iron Age) and bare text when they are 0 (Clear sky). §15 E13 |
| `headline` | `rule` | **The challenge line.** The figure in Besley ExtraBold, tabular, its unit on the same baseline in Archivo 13 steel as written ("lb / week down", "kcal / day"), the way "4,300 LBS." sits on the Cyr poster [T7 §6.3]. Under it the single rule (`rule.sub`; the Oxford rule if refused). Deltas beside it stay Archivo with their arrows. The figure keeps its colour role: Fuel's zone colour, Weight's pYellow (large text). At most one figure of 32pt or more per screen: Fuel's 40, Weight's maintenance 32, water's 34 in its sheet |
| `chip` | `stamp` | Square, a 1pt ink keyline, no ground, Archivo 12/600 ink. **Chosen = filled ink with knocked-out words.** Chips that are 44 tall stay 44 |
| `segmented` | `boxes` | Joined square cells, 1pt ink rules between them and round the outside; the chosen cell inverted; Archivo 12/600, sentence case |
| `btn` | `inverse` | **Primary** = a solid ink block, knocked-out words, square (Saxon's 1908 cover, "the solid ink block with stock text knocked out" [T7 §8]). **Plain** = raised paper, square, ink words. **Ghost** = no box: steel words underlined 1pt, the 44 hit area kept by padding. **Danger** = a square 1.5pt Indian-red keyline and Indian-red words. Large: 16/700, sentence case. **Start workout is a clean ink block, no photo.** Press .97; disabled .4 |
| `field` | `square` | Bar ground, square, a 1pt knurl keyline (3.72 on bar), padding 12; focus turns the keyline madder (5.20). Label above in Archivo 12/600 steel. It stays a box because the copy says "this box" |
| `note` | `rule` | A footnote: a 16pt ink hairline (0.5) above, then Archivo 13 dim, lh 1.5 |
| `toast` | `square` | An ink strip, square, no shadow, knocked-out words; its place above the dock kept |
| `settingsRow` | `ledger` | Label (Archivo 14/600 ink) … drawn leader dots (dim) … value (Archivo 12 steel, tabular) and the drawn › in dim. No rules between rows; one 0.5 hairline under the group. Pressed = ink .04. Toggles in their slot: off grip, on madder, plus the knob's side |
| `listRow` | `plain` | No rules between rows, separators between groups only, a 44 pitch. Name Archivo 14/600; value right, Archivo 15/800 tabular (only the ranked column bold on rank rows); sub-lines Archivo 12 dim. Chosen = the ink .06 leaf plus the drawn tick. A PR's value in madder beside the word "PR". Swipe to delete reveals the Indian-red panel (onDanger 8.78). **No leaders**: they are Settings' only |
| `setTable` | `ruled` | No box. The group tag (4 × 30 in the group's colour; it is data), the exercise name in Besley SemiBold 16 and the drawn ⋯, on the single rule. "Last …" in Archivo 13 steel. Column heads (Archivo 12/600 steel, sentence case as written: "Set", "lb", "Reps", "e1RM") over a 1.2 ink rule. Widths v1's (30 / 1fr / 1fr / 42 / 38; the editor's 30 / 1fr / 1fr / 38). **A lifting block** is framed by the double rule above and below its exercises, under its title in Besley SemiBold 15, ink (the accent stays on the live chip) |
| `setRow` | `ruled` | Rows parted by 0.5 ink hairlines. The badge is a bare figure: the set number in steel, W in warn, F in Indian red, D in Prussian (from `tint.tag*.color`, E4). The inputs lose their ground and sit on a 1pt ink rule, Archivo 15/700 tabular, with last time's numbers in dim as placeholders. The e1RM Archivo 12 dim. The check: 30 × 30, a 1.5pt knurl edge; **done = viridian fill with the drawn ledger tick knocked out**, plus the .07 row wash. The flash, the coach pulse and the drop's Prussian rail (.75) behind the drawn hooked arrow as tokens say |
| `plateStrip` | `stamp` | "Per side" (Archivo 12 steel), then each plate as a stamped square: a 1pt keyline in that plate's ink, no fill, the figures Archivo 12/800 ink, tabular ("2×45"). "bar only" and "+x left over" word for word |
| `calCell` | `ruled` | A printed calendar: 0.5 ink hairlines between cells, no grounds. The day number Archivo 12: dim untrained, ink 700 trained, with up to four 3pt plate bars. **Today: a 2pt ink keyline and weight 800**, not madder (on Train the Coach card is the rubric). Weekday heads Archivo 11/600 steel as written |
| `chart` | `print` | 2pt lines with square caps, no area wash and no glow; square-topped bars; dashed and dotted targets kept, in ink; collar grid; rings with square caps; donuts flat; axis text ≥ 11. **The day that isn't over** is hatched at 45° in its own colour (E9). **The calorie meter:** a square tan track; **the bands as full-strength hatches**, pitch 2.75pt: cut a 45° Prussian hatch, hold an ochre dot screen, gain a 135° Indian-red hatch (web `repeating-linear-gradient`, native react-native-svg `<Pattern>`). The eaten fill solid. The head, ticks and dashed mark white with a 1pt ink edge. **Macros:** protein solid, carbs a 45° hatch, fat a dot screen, with matching legend swatches. **The confidence dot:** filled (high), half (medium), ring (low), in good / warn / bad beside its word. **The Steps ring** sits on plate paper (band mode keeps the photo off it): pGreen 6.05 |
| `dock` | `rail` | Opaque bar paper under a 2pt ink rule. Five cells, the engraved icons at 22pt (stroke 1.5) over Archivo 11/600 labels in dim. **Active:** a 3pt ink bar across the cell's full width along the rule; icon and label in ink, the label 700. No blur. Height 64. Tabs, order and place never change |
| `fab` | `inverse` | A square ink block centred 14 above the dock: the Greek cross (2.6, square caps) and "Log food" as written, Archivo 14/700, knocked out. No shadow; pressed scale .955 |
| `addTile` | `ruled` | No tiles: a two-column grid parted by 0.5 ink hairlines. The engraved cuts at 22pt with no wells. Title Archivo 15/700, the line Archivo 13 dim, the "ai" tag a stamped keyline in steel, Archivo 11/600, as written. **The Photo tile is found first because its box camera is printed in madder**, the sheet's one red, with no square behind it. An off tile stays visible at .4 |
| `sessionChrome` | `plate` | **Top bar:** on the web the status band is ink; below it bar paper under a 1pt ink rule. The session name (Archivo 15/700), the clock (`timer`, steel), **the live chip** (38, a square keyline plate, the madder balloon and "Coach": the screen's one red), the calendar button (38, square plate, the engraved pad), Finish (ink primary). **The rest line** runs 3pt across the top in viridian, Indian red when over. **The rest pill:** a square plate with a keyline and no shadow, the time Archivo 800/22 tabular, +30 as a plain button and Skip as underlined words. **The peek bar:** the same plate, name, clock and Resume (ink primary). Every target at least v1's |
| `youHero` | `banner` | The greeting in You's lead plate (bar, 1pt ink keyline) with its photo band across the top (§10). Below the band, in v1's order: the avatar (52, round, raised, a 1pt ink ring), "Good evening," and the name in Besley ExtraBold 25, **all one ink**, the gear (36, a square bar plate with a knurl edge and the engraved gear). The date in italic `meta`. "Member since …" in italic steel under the plate. With no photo the band closes up and the rest is unchanged |
| `coachCard` | `ruled` | No ground: only the top and bottom of the 1pt border, in ink; square; 190 / 164, padding 14, border 1, **Archivo and v1's metrics, lines and `numberOfLines` unchanged.** The madder balloon, "COACH", "COACH ME" and the chevron are the rubric; the caution line warn (5.42 on grain); the lock drawn, in madder or steel as v1. No photo |

**Outside the vocabulary** (tokens or the web stylesheet):
- the sync pip (tokens);
- the trial bar (web: a warn .12 wash with warn words, 4.87);
- the swipe panel;
- onboarding's choice cards: a square ink keyline, and **chosen = a 2pt ink keyline plus a drawn tick** (web `::after`, content ''). Native keeps v1's colour-only cue until a hook exists (logged);
- the tour card: bar paper, a 1pt ink keyline, the Oxford rule on top, on the ink veil. It must not take `card · ruled`'s no-ground.

---

## 8. Every screen

- **Web sign-in and gates** (native stays v1):
  - the stock with the ink status band;
  - the six-plate mark in plate inks, each a square with an ink keyline;
  - "Rack" as a Besley ExtraBold masthead over the Oxford rule;
  - square keyline fields, the ink primary, links as underlined steel words;
  - the invite, waiting and paused gates are the same page;
  - errors in Indian red and success in viridian, each with its words.
- **Onboarding (8 steps):**
  - the step kicker is the italic running head, the title Besley ExtraBold;
  - choice cards as in §7, with the drawn tick;
  - the numbers step in square fields;
  - progress marks as square pips, filled ink for done.
- **Tour:** the flat ink veil; the tour card as in §7; the lit dock tab ringed in madder.
- **You:** the greeting plate with its band; the Coach card; the chapters; the tailpiece (§9.1).
- **Coach:**
  - **sheet**: full, Oxford top. Rack's lines on square raised blocks; replies as ink blocks with knocked-out words; proposal rows plain; question and goal chips stamped, chosen inverted (goal chips 44 tall); ▾ ▴ drawn;
  - **live chip**: as `sessionChrome`;
  - **nudge**: a bar strip between two 0.5 ink hairlines, madder "Coach", ink text, the drawn saltire × at 44.
- **Train calendar:**
  - the masthead ("Training log" / "September 2026");
  - the ruled calendar, today in an ink keyline;
  - the folio stat line;
  - the Coach card (164), the screen's one red;
  - Start workout as a clean ink block;
  - the week-volume chart in print;
  - the Indian-club tailpiece.
- **Day sheet:** a full sheet whose date head sits on a rule; exercise lines plain.
- **Live session:** §9.2.
- **Recap:**
  - the lead plate with its photo band, then the masthead inside it (the kicker as written, the h1, the finish line, the italic date), all ink;
  - the feel chips stamped, 44 tall;
  - the Wins head on a viridian rule;
  - PB rows plain, the record value in madder beside "PR" (the screen's one red);
  - the session totals as the folio line **under the double rule**;
  - the globe bar-bell tailpiece.
- **Stats and exercise detail:** PageHead as a masthead with a drawn ‹ Back; the 3 × 3 stats as three folio lines; charts in print; rank rows plain, bold only on the ranked value.
- **Picker, manager, custom:** a square keyline search field; Movement chips stamped, 44 tall; exercise rows plain at 44 with the drawn ›; chosen = the ink .06 leaf plus a drawn tick.
- **Routines:** routine rows plain; the editor in the `setTable · ruled` idiom, **+ Drop** as a ghost word, drop sets grouped under the hooked arrow.
- **Fuel day:** §9.3.
- **Add food:**
  - the ruled grid of cuts, the Photo cut in madder;
  - Foods and Meals as ghost buttons with the ledger and dishes cuts at 16 (web);
  - the estimator notices as a keyline callout holding the printers' fist in warn and the sentence it points at. The yellow-washed box goes, and there is no sparkle anywhere.
- **Estimator:**
  - capture on black;
  - "Which one?" as stamped chips;
  - proposed rows plain, **the estimate's total under the double rule**;
  - the confidence dot as shape plus colour plus word;
  - portions in square fields; the − + steppers drawn in 44pt keyline squares;
  - the phase that cannot be dismissed unchanged.
- **Library and meals:** plain rows (name … kcal bold); edit with the drawn nib and delete with the drawn saltire, each at v1's hit size.
- **Barcode:** a black camera view; the result sheet on paper.
- **Water:**
  - the card draws the ink **carafe** (§12.4) with Prussian water and v1's waves, the level linear between the carafe's own lines;
  - the total as a Besley challenge figure, Prussian (viridian at goal);
  - presets plain with the drawn saltire;
  - the water sheet full.
- **Weight:**
  - the masthead;
  - **the log plate** with its photo band, "Weighed earlier?" and its note in their own roles on plate paper, the square field, the ink Log button;
  - the folio stat line;
  - the trend chart in print: the 2pt ochre line ("the yellow line"), the dashed ink trend;
  - the maintenance `≈ 2,450` challenge figure at 32 in ochre (large, 3.92);
  - recent rows plain;
  - the wooden-ring tailpiece.
- **Steps:**
  - the masthead;
  - **the today plate** with its photo band, the ring on plate paper, the big number in its role (good at goal) with "goal met" in words;
  - bars in print ("green = goal met" still true);
  - the heat strip; 2 × 3 folio lines; recent rows;
  - **no tailpiece.**
- **Settings hub:**
  - chapter heads on the Oxford rule, sentence case;
  - ledger rows, including **Look → Vibes**, reading "Vibes …… Iron Age ›";
  - profile and goal sheets with square fields and boxed segmented controls.
- **Vibes sheet** (native draws every card from the vibe's own `build()`):
  - Iron Age's card: the stock ground;
  - the 112 × 88 sample in `cardSkin` (bar, 1px collar, radius 0);
  - `315` in Besley ExtraBold (`loadNum(35)`), ink, over the naval-gym thumbnail under the stock .54 scrim (4.67 against its worst pixel);
  - the 4 × 44 madder bar.
- **Admin (owner):** youCard ruled; folio stat lines; plain rows; account and flag pills as stamped keylines in their role colours (≥ 5.4 on the grain); the AI-split and family bars as flat square segments; legible, not ornamented: no tailpiece.
- **Toasts, sync pip, trial bar:** as §7.

---

## 9. Three screens, in words

### 9.1 You (390pt)

1. **The top.** An ink strip under the status bar. Below it, a plate: a fine ink keyline round lighter paper.
   - Across its top, an 80pt band: a halftone photograph from a 1904 manual, printed ink-on-cream at full strength, no words on it.
   - Under the band, a round avatar "M", "Good evening, / Micah" in heavy Clarendon, one ink throughout, and a square paper button holding an engraved spur gear.
   - The date in a small italic serif.
2. **The Coach card.** No box, only a fine ink line above and below, 190 tall. A madder speech balloon and "COACH": the one red on the screen. The sentences in Archivo exactly as v1 sets them; "COACH ME ›" over a hairline. Under it, in italic: "Member since Aug 21, 2025 · 400 days".
3. **The chapters.**
   - "How you're doing" in a bold slab serif stands on a thick-and-thin rule across the page. "Doing well" in a smaller serif sits on a single viridian rule; "Could improve" on an amber one.
   - The goal: "0.9" in Besley ExtraBold, "lb / week down" small on its baseline, a rule under it, then "On pace: 0.9 lb a week against 1 planned." A folio line between two hairlines: "190.7 │ 182 │ Nov 30" over "trend now │ goal lb │ at this pace". A square-ended ochre bar on a tan track.
   - "This week": four figures in a two-by-two grid with no tiles. Each has its label with a small pill at the right ("↓ 0.9" on a pale green pill), the figure at 22, "last week 192.7", a word-sized line, and seven round dots with today ringed in ink.
   - "Rack noticed" and "Trends" follow the same way. The weight chart is a 2pt ochre line with the ink trend dashed across it and no fill under it.
4. **The end.** A small engraved globe dumbbell closes the page. Then the dock: paper under a 2pt ink rule, five engraved cuts (a bust, a globe bar-bell, a fork and tumbler, a dial scale, two soles). "You" carries a 3pt ink bar and a bolder label.

### 9.2 The live session

1. **The top bar.** Ink under the status bar, then paper ruled underneath: the name, the running clock in tabular steel figures, a square keyline chip with a madder balloon and "Coach" (the only red), a square plate with the engraved desk pad, and "Finish" as a solid ink block. A 3pt viridian line runs across the top while a rest counts, and turns Indian red when it runs over.
2. **An exercise.** "Barbell Back Squat" in Besley SemiBold with a 4 × 30 ochre tag at the left and a drawn dinkus at the right, on a single ruled line. "Last · 225 × 5, 5, 5" in steel.
3. **The set table.** Column heads in small Archivo over a ruled line; hairlines between rows.
   - Each row: a bare set number (or an amber W, an Indian-red F, a Prussian D); weight and reps on ruled blanks in bold tabular Archivo, last time's numbers grey until typed; a small grey e1RM; a square box at the right.
   - **Done**: the box fills viridian with a paper tick, and the row takes a faint green wash.
   - A drop set hangs under its parent behind a hooked arrow on a Prussian rail.
4. **Per side.** Square stamped plates, each outlined in its plate's ink (Indian red for 45, Prussian for 35, ochre for 25), the figures in ink.
5. **Resting.** A square plate with a keyline and no shadow, the time large in tabular Archivo, "+30" and "Skip". The peek bar above it is the same plate with "Resume" in solid ink.

### 9.3 The Fuel day

1. **The masthead.** Italic "Fuel", "Today" in Besley ExtraBold, the square gear plate and two chevron plates, the Oxford rule across the page.
2. **The summary plate**, the tab's one boxed thing, no photo:
   - "1,950" in Besley ExtraBold at 40, **in Prussian because today is in the cut band, as the guide promises**;
   - "kcal left today", then "1,200 eaten · target 1,950" in small Archivo, and a drawn dinkus;
   - the calorie bar: a square tan track with its three bands **printed as patterns in full-strength ink** (a Prussian diagonal, an ochre dot screen, an Indian-red cross-diagonal), the eaten part solid, the white head, ticks and dashed target white with an ink edge;
   - three macro rows: protein solid, carbs hatched, fat dotted, with matching swatches.
3. **The meals.** Each on its single rule: "Breakfast" in Besley, then plain rows, "Oatmeal, 1 cup" and "300" bold at the right. An empty meal is one line.
4. **Water.** The ink carafe with Prussian water to today's level, and the total as a Besley figure.
5. **The end.** A chest-expander tailpiece. Floating above the dock: a square ink block with the Greek cross and "Log food" knocked out, no shadow.

---

## 10. Image slots, band mode, scrims

**Band mode (graft 1).**
- In a chosen hero box the plate fills a strip **80pt tall across the top of the box**, and the box's own padding grows by the same 80. Every word, control and colour stays where it was, below, on plate paper. **No word is ever drawn on a photograph.**
- The plate keeps its full tone: ink `#1c1712` on stock `#e6dec9`, 13.26:1.
- The greeting's name, the zone colours, Steps' green and the ring keep their jobs.
- There is no run-time scrim and no iOS compositing question.
- A slot whose file is missing **closes up**: no band, no frame (C14).

**The declared scrim** (`STOCK_SCRIM`, stock .54, one stop) is what each slot falls back to if the engine does not draw bands (§15 E5). It is measured on the worst pixel any photo can have after the tone map: a solid ink dot under .54 stock becomes `#898275`, and ink text on it reads **4.67**, while the photo keeps 2.84. In the fallback:
- **every word over the photo is ink**;
- the Steps ring sits on its own paper disc;
- the field and buttons keep their fills.

| Slot | Plate (Tier A) | Why | Crop status |
|---|---|---|---|
| `youHero` | `sargent-1904-leaf0205-teamsters-warning` (Sargent, *Health, Strength & Power*, 1904; an unnamed model with his arms flung out level) | the manual's own opening pose, on the screen that gets advertised | **pending Q-Q2** on the band boxes. Fallback `gym-naval-academy` (verified for every box) |
| `summaryHero` | `anderson-pulleys-man-lunge-1897` (*Anderson's Physical Education*; unnamed) | a lunge at the wall pulleys: the effort just made | **pending Q-Q2**; fallback naval |
| `stepsToday` | `gym-naval-academy` (Detroit Publishing, 1890–1901; LoC LC-DIG-det-4a15039; no people), a crop of the ropes and trusses | verified; no likeness question | verified |
| `weightLog` | `anderson-pulleys-woman-front-1897` (unnamed; an ankle-length gymnasium dress) | a woman at the wall pulley: where the weigh-in is written | **pending Q-Q2**; fallback naval |
| `thumb` | `gym-naval-academy`, 336 × 264 | the Vibes card; `315` 4.67 over it | verified |
| `coachCard`, `startWorkout`, `fuelSummary` | **none** | §2.1's reasons | — |

**The band geometry.**
- The band is 80pt at every text size. The box widths are 288 / 343 / 358 / 398 on native and 288 / 358 on the web, so the band's aspect runs **3.6 to 5.0**.
- One asset per slot at **1170 × 235 px** (aspect 4.98, the widest box) is cover-cropped narrower on smaller phones round its centre.
- **The Q-Q2 gate:** run `r2-crops.mjs`'s face rule (a face box grown 15% of its height above and below and 10% of its width each side, wholly visible) on every band box. Any box that cuts a face sends the slot to the naval fallback. **No plate crops through a head or neck, and no lettering from a plate ("Fig. 21.") may enter any box.**

**The pipeline** (every step deterministic and recorded in `PROVENANCE.json` `transforms`) [T7 G.4.2; T8a H.3, H.9]:
1. `sips` crop to the tightened `crop_hint` (for Sargent, only the band that excludes every "Fig." label);
2. `sips -Z ≤ 1170`;
3. the ink-on-stock tone map on **`#e6dec9`**: Rec. 709 Y (linear) → L* → levels on the crop's own P0.5 / P99.5 → coverage a ∈ [0.04, 1.00], mixed from stock and ink in linear light. No sepia matrix: maximum chroma .033 against CSS `sepia(1)`'s .072;
4. **photographs only**: a 3.0pt halftone at 45°, dot area = a, no gain curve, 3 × 3 supersampled;
5. **4-bit indexed PNG**, never JPEG (ringing drops the worst run to 3.5).

No scrim is baked in band mode: nothing sits on the plate.

- **Every subject is unnamed or absent**, so no screenshot carries a likeness question [R9.4]. No named strongman is used.
- **Credits** go on the Licences screen only (Phase F), never beside Rack's name or in an ad.
- **Budget per client (estimated):**
  - four bands at 25–60 KB each (1170 × 235, 4-bit);
  - the thumbnail ≤ 30 KB;
  - the grain 24.6 KB @3x and 12.0 KB @2x;
  - the rule strips about 14 KB;
  - **≈ 0.3 MB**, against 1.5 MB. Q measures the real files.
- **If no plate can be cleared,** Iron Age still ships whole on texture, type and icons: every band closes up. `IRON-AGE-SHOPPING-LIST.md` and its placing script (Phase V) cover Micah's own downloads.

---

## 11. Textures (code-made, seeded, PNG on both clients)

| Texture | Recipe | Where | Numbers |
|---|---|---|---|
| **Paper grain, `manual`** | Track 7's `texproto.mjs grain` recipe: seeded mulberry32 octave noise, NNLS-fitted to the σ-by-scale profile measured off **Sandow's 1897 pages** (σ .744% per pixel; .666 / .564 / .400 / .263% at .25 / .5 / 1 / 2 mm), zero mean, clipped at 3.5σ, applied per channel to the stock. **Seed 1897.** A 72pt periodic tile: 216px @3x, 144px @2x | `rack` only: never on sheets, plates, fields, the dock, the status band or a photo band | Darkest pixel `#e0d8c4`, lightest `#ece4ce`; mean equals flat to .01. 24,574 B @3x, 11,980 B @2x. **Every text colour is checked against the darkest pixel** (§5.1): the accent 4.93 → 4.66 |
| **Ink bleed along rules** | T7 G.3.4 strips, **seed 1912**: ink at exact coverage, +0.10pt per edge on the 1.2 rule and the Oxford thin line only; edge wander .03pt rms (hairline class) or .015 (heavier), wavelengths 1.3–16pt; 144pt tiles repeated along x. The vector rule at the gained width draws until the strip loads | the four rules: hair, rule, double, Oxford | about 14 KB @3x for the set. No halo, pooling, breaks or "bite" |
| **Halftone / duotone** | §10's pipeline | the four bands and the thumbnail only | |
| **Hatches** | CSS `repeating-linear-gradient` (web); react-native-svg `<Pattern>` (native). No PNG | the calorie bands, the macro fills and legend swatches, the unfinished day in bar charts | pitch 2.75pt [T7 §7.3] |

Nothing is animated or regenerated at run time. Each seed is recorded beside its file.

---

## 12. Icons (`vibes/icons/iron-age.js`)

### 12.1 Style

- A 24-unit grid, `fill: 'none'`, one ink stroke, **square caps and miter joins**. v1 is round and round, in Feather's manner; the period cut has cut ends and sharp corners. This is the most visible difference between the two sets at 22pt.
- **Stroke:** 1.5 at the 19–22pt sites (the dock, the add tiles, the calendar), 1.75 at the 14–17pt sites (the gears, the Coach marks, the lock, every glyph). The sites that fix their own win: Log food's 2.6, the notices' 1.6 (spark), the dock's from the stylesheet.
- The object in profile or elevation, its silhouette plus one or two defining lines. No hatching at icon size.
- **No lettering, numerals or trade marks:** no date on the calendar, no digits on the barcode, no figures on the dial.
- **Drawn by hand, for now,** to each source's proportions (the file's `sources` names each one). Phase V traces the sourced forms from `research/iron-age/originals/` with imagetracerjs, simplifies each trace to this grid, stroke and element count, and records it in `PROVENANCE.json`. A trace may move a point, never the style.
- **The shape is exactly v1's icon shape:** `{ viewBox, stroke, fill, linecap, linejoin, els }` of path / circle / rect (checked). Imports nothing; frozen.

### 12.2 The set (19 keys, v1's names in v1's order)

| Key | The cut | Source |
|---|---|---|
| `you` | a generic bust on its cut: oval head, stand collar, shoulders, the rule it stands on | hand-drawn; never a likeness |
| `workout` | the globe bar-bell: two globes, **each with its centre band**, and a **double-ruled** bar | #29 Ravenstein & Hulley 1867 (Tier A); the band from #4 Spalding c. 1891 |
| `food` | a dessert fork upright and a plain tumbler with a heavy foot | #18, #19 Sears No. 112 |
| `weight` | **a dial platform scale:** dial, hand, three bare graduations, column, platform | Fairbanks, Morse & Co., *Fairbanks Dial Scales* (1919; IA `fairbanksdialsca00fair`). **Needs its own PROVENANCE entry before a trace.** Fallback #7 Spalding beam scale (it read as a crane) |
| `steps` | two insoles, the second offset | #25 Sears insole |
| `plus` | a Greek cross | hand-drawn |
| `camera` | a box camera, front: box, stiff strap, lens and rim, finder | #22 Sears |
| `pen` | a nib at 45°: shoulders, slit, breather hole | #21 Sears |
| `barcode` | six brass rules, thick and thin; no digits | hand-drawn (ATF 1912) |
| `keypad` | rimmed keys 3 × 2 over a bar, in a keyline | hand-drawn |
| `book` | an open ledger, its leaves ruled | #14 Sears |
| `stack` | **three dishes edge-on, rim and well** (three flat trapezoids read as a menu icon) | hand-drawn |
| **`spark`** | **the printers' fist**, pointing at the sentence. Never a sparkle, star, asterisk or bolt (R8.8) | #26 / #27 Polhemus 1895 |
| `gear`, `gearYou` | one spur gear, eight straight-flanked teeth, and its hub. One drawing for both. Traced from a PD source, so Iron Age's gear owes no MIT notice | #11 Grant 1893 |
| `calendar` | a desk pad on its two wire posts, a head rule; **no numerals, no month, no feet** (with feet it read as a stool) | #23 Sears |
| `bubble` | a speech balloon with a short tail; never the manicule | hand-drawn |
| `lock` / `unlock` | a heart-shaped padlock with a keyhole; only the shackle moves | #17 Mallory, Wheeler 1871 |

### 12.3 Glyphs (`glyphs`, stroke 1.75)

- `prev` / `back` ‹ and `next` / `go` ›: open chevrons.
- `close` ✕ and `dismiss` ×: a saltire, and the same a size smaller.
- `more` ⋯: a dinkus, three round points in a row (the copy calls them "the dots").
- `minus` − and `plus` +: a rule and a Greek cross.
- `check` ✓: a ledger tick.
- `drop` ↳: a hooked arrow.
- `edit` ✎: the nib.
- `gear` ⚙ (native Fuel): the gear.
- `expand` ▾ and `collapse` ▴: open chevrons.
- `warn` ⚠: a plain triangle with a rule and a point, for the sentence-leading site and native's dev banner only.
- **`up` / `down` / `flat` are null:** ↑ ↓ → are a number's direction and stay text in Archivo.
- **⚙ and ⚠ inside prose, "tap ⋯" and "a ✓ when" are copy** and are never routed.

### 12.4 The vessel and the tailpieces

- **`vessel`**, the carafe (#20 Sears p. 645, silhouette only):
  - viewBox `0 0 104 168` (v1's), stroke 3, in ink;
  - the outline doubles as the clip path;
  - **`insideBottom` 150, `insideTop` 58**: the level is linear in the day's fraction between the bowl's floor and its shoulder, so a full day fills the bowl and leaves the neck empty (R1.4);
  - no cap: a carafe has its lip;
  - Prussian water and v1's waves inside.
- **`ornaments`**, one tailpiece per screen, centred 32 under the last box, stroke 1.5, ink, hidden from assistive tech:

| Where | Ornament | Source |
|---|---|---|
| You | globe dumbbell (48 × 24) | #4 Spalding c. 1891 |
| Train | Indian club (24 × 48) | #6 Spalding c. 1891 |
| Fuel | chest expander: two handles, three cords (48 × 24) | #12 Sears |
| Weight | wooden ring (32 × 32) | #16 Dio Lewis 1866 |
| Recap | globe bar-bell at its own proportion (64 × 24) | #29 |
| Steps | **none**: a ring beside the step ring would read as data | — |

### 12.5 Legibility

`design/iron-age/final/icons-sheet.png` (`ia-final-raster.mjs`, code-made) draws every key at 66px (22pt @3x), 44px (@2x) and 22px (@1x), plus the tailpieces and the carafe.
- **Every dock cut reads as its object at 44 and 66.** The globe bar-bell reads as a bar-bell, not spectacles; the dial reads as a scale; the pad reads as a calendar.
- The manicule reads as a pointing hand at its 16px site.
- **Watch items for Q:** the dishes (`stack`) are the weakest at 16px. The dial's hand and graduations blur at 22px @1x, a density no phone uses.

---

## 13. What this vibe never does

1. **A card round every section.** Only the lead plate per tab is boxed [N8].
2. **Rules as a costume.** Oxford rules mark chapters only, single rules articles, the double rule totals only. Leaders live in Settings only [N12].
3. **Caps.** No caps role, no small caps, no tracked labels, never an uppercased unit [N13–N15]. 'COACH ME' stays as written.
4. **A cream from the AI band, a clay accent or a high-contrast Didone** [N3, R3.5].
5. **CSS `sepia()`, a brown filter or faked age:** no stains, foxing, torn edges, vignettes, fibres, specks, emboss, "bite", broken or pooled rules, or wander at 4× or more of the measured amplitude [never-do 30].
6. **Madder more than once a screen**, as a button fill, on a wash, on `raised`, on a pill or behind words.
7. **Besley on an arrow, a delta, a table value, a button, a chip, the dock or the Coach card,** or under 13pt.
8. **A third family** [R4.1].
9. **Ornament inside data, or more than one a screen.** No crossed dumbbells, "EST. 1897" badges, ribbons, laurels, scrollwork, drop caps or centred data.
10. **A word on a photograph.** Never a photo on the Coach card, Start workout, Fuel, set rows, food rows, charts or stat lines. No JPEG halftone. No empty frame [C14, C25, C27].
11. **AI-made or AI-touched imagery.** No colourised or restored photo, no named subject as a hero, no lettering from a plate ("Fig. 21.", "H. TRIAT", "SPALDING").
12. **The v1 sparkle, a star, an asterisk, a bolt, emoji, an icon in a tinted circle or square, SF Symbols or a stock icon set** [N22, N27].
13. **Glass, blur, glow, drop shadows or gradient washes.** The dock and the workout bar are opaque paper [N4–N6].
14. **A rounded corner** outside the pill, the dots, the rings, the avatar and the toggles.
15. **A wash that loses its named hue.** The calorie bands are hatched in full-strength ink; the white head is white.
16. **Tiles for stats, or a delta without its pill** (the copy names the pill).
17. **A date on the calendar icon, or a vessel without its own insideTop and insideBottom.**
18. **New motion:** no entrance, fade-up or count-up, no animated or regenerated grain [N25].
19. **A light band under the web's status bar,** or a cream flash before the account's vibe is known [R3.3].
20. **Colour alone for chosen, current, today, done or up and down.**
21. **A changed word:** no "lbs.", no full stops on heads, no £ d ¢, no lowercase transform. Every sentence about a pill, a box, the dots, a ring, a white head, a dashed mark or a yellow line stays true [R1.1].
22. **An underlined field, an ink-plate Start workout, or a stamped condensed figure.** Those belong to the losing concepts and would break a sentence or another vibe's world.

**The two tests (R10):** "a dark fitness tracker" produces none of this. **The AI-panel risks that remain, for Q:**
- the italic running meta on cream (a period device, kept);
- the pill (forced by the copy);
- serif heads on cream, fenced by the Clarendon, the grain, the photographs and the engraved cuts.

---

## 14. The engine requests (each named, with its fallback)

| # | Request | Why | If refused |
|---|---|---|---|
| E1 | `colors.band` (the web status strip) | R3.3 | the engine's light-vibe rule paints ink under `--safe-top` |
| E2 | none: the display faces ride native's existing `face.bands` (wdth 101 / 99). Web: `face.web.display / italic / num` (proposed) so the parity check reads one source | two families on native | the web stylesheet declares the stacks literally |
| E3 | `shape` into the contract (VOCAB §4), plus `rule.sub`, `rule.total`, `lead.keyline` | §2.11 | no `sub`: articles take the head rule and sections go `plain` (Besley 18 on no rule). No `total`: the totals take the single rule. No `lead`: the plate is bar on stock, all but invisible (1.06:1) |
| E4 | `setRow · ruled` inks the W / F / D letter from `tint.tag*.color` | ochre text is 3.92 | W in ink |
| E5 | **band mode:** `images.<slot>.band` (pt), accepted by native `build()` in place of drawing the scrim, and by the web stylesheet | §10 | the declared stock .54 scrim over the whole box, every word over it in ink, the Steps ring on a paper disc |
| E6 | the icon contract's `glyphs`, `vessel` and `ornaments` fields | §12 | glyphs stay text; v1's bottle drawn in ink; no tailpiece (on both clients, for parity) |
| E7 | a tailpiece site per tab (web: the screen's last block `::after` with content '' and the SVG; native: the ScrollView's footer) | the one ornament | no tailpiece |
| E8 | the ground-texture and rule-strip hooks (web `background-image` on the page; native `Image resizeMode="repeat"`) | §11 is required | vector rules at the gained widths. Dropping the grain drops a §11 requirement, which is Micah's |
| E9 | SVG `<pattern>` defs in the page for `chart · print` | hatched unfinished days, macro fills and swatches (`analytics.js` is pinned) | the unfinished day at .5 opacity as v1. **The calorie bands need no pattern on the web (CSS)** |
| E10 | a device-verified `minLh` for Besley | hhea 1.675 makes native heads tall | 1.675: taller lines, nothing clipped |
| E11 | native icon routing through the vibe | native routes no icon yet [T8b G6.2] | **must be granted**: without it native shows v1's icons, a parity failure |
| E12 | `inkOf` (§2.12) | ochre and pewter small text | every such site inks warn / steel in the stylesheet and a native switch |
| E13 | `kpi · word` draws the delta pill when `tint.pill*` > 0 | the copy names the pill | Iron Age names `kpi · plain` with `well` = the page, which keeps a collar-edged tile |
| E14 | `type.meta` (the italic running meta) as a preset | one source for both clients | the running meta set at each look's own site |
| E15 | **the calorie-band hatches, native** (CalMeter, a new `chart` switch site) | **required**: a wash on cream loses "blue" | **Iron Age does not ship on native until this exists.** "Blue — cut" would be untrue |
| E16 | the web picker prefetch reads `face.web.num`, not `face.web.font`'s first family (`vibe.js` THUMB comment) | Iron Age's text face is Archivo, but its card numeral is Besley | the card's number waits for the face on first open |

---

## 15. Decisions left to Micah

- **Band mode** (§10): photos in a band no word touches, and boxes 80pt taller. The alternative is the scrimmed full-box plate.
- **Q-P3:** the r2g stock `#e6dec9`. The swap to `#ede3cc` is: rack, well, tileHero and tileLit `#ede3cc`, bar `#f6efdd`; re-render the grain and the plates; recheck.
- **Q-I1 / Q-I2:** the grain preset `manual` (visible, gated at the darkest pixel). `book` leaves the accent a .02 margin on r2g; `fresh` is all but invisible.
- **Q-I3:** ink bleed as PNG strips, or vector at the gained widths.
- **Q-I4:** "sepia/duotone" read as the ink-on-stock tone map.
- **Q-I8 / Q-I9:** no photo on Fuel (the band sentence), Start workout or the Coach card.
- **Q-Q2:** the face rule on the band boxes for the three pending plates (naval is each one's verified fallback).
- **The Triat engraving** as a hero image: not used. Engravings are allowed as traced icons, not named as hero art.
- **Q-Q1:** caps heads. This spec drops them. A declared exception (Besley 600, 13pt, +.10em on the Oxford rule) would come back as one type role.
- **The inked-in done check** (B's): solid ink with a knocked-out tick, 13.99:1. This spec keeps viridian (5.74), because green has meant "done" in Rack since v1.
- **The dial scale** in place of the beam scale for `weight`: it needs a PROVENANCE entry and a trace.
- **Keeping the pill and the boxed field:** both are read from copy. A later copy change could free the look.
- **pYellow `#8b6600`** in place of research's `#90620b`.
- **`knurl` as a neutral grey** (§2.2).
- **The tour's flat ink veil** at .80, against v1's cream fog.

---

## 16. Risks and what is unverified

- **Three of the four band plates** wait on the face rule. Naval covers each, which would put one gymnasium on several screens.
- **Native line heights:** Besley's 1.675 floor makes heads and figures taller (loadNum(40) sets a 67pt line). Nothing clips; Q measures the page.
- **Italic** on native is a static face, already t5-checked; old-style figures are not used.
- **The hatches** are required on both clients (E15). The web can draw them in CSS tonight; native needs CalMeter's switch and a `<Pattern>`.
- **Chart text at 11pt** may crowd `analytics.js`'s fixed SVG geometry. Q fit-checks at 320.
- **The grain tile's 72pt repeat** is unverified on a phone (Q-D7). Its darkest pixel is concept A's measurement: re-measure the rendered tile.
- **Native onboarding's choice cards** keep v1's colour-only cue until a hook exists.
- **"Card" in copy:** You's notes say "this card". A ruled article is still a discrete block, but a strict reader could disagree. Logged for Q's truth pass.
- **The icons are hand-drawn**; a trace may move points.
- **`sectionHeader · rule` sets its title in `type.h3`**: that is this spec's reading, since VOCAB names the type only for `plain`. The vocab owner should confirm it for Ledger too.
- **VOCAB's "outermost first"** for a rule placed below its head is read here as "from the head outward". Flagged to the vocab owner.

---

## 17. The losing concepts (Micah may swap one in)

### B · "The Measurement Form" (117)

Rack as the ruled record a gymnasium kept about 1900: the 1898 *Measurement Form*'s dotted leaders wherever a name meets a value, a double rule over every total, ATF brass rules instead of cards, and Fairbanks-style stamped nameplates for the glanced-at numbers.

- **Tokens:** the same stock and ink, a madder rubric, and **plates rebuilt so every group colour is 4.5:1 as text**: `#772020`, `#2b6189`, `#785c00` (mustard), `#016d50`, `#181412`, `#3a4450`. CVD 12.94 deutan, 13.85 protan. dim `#5a554d`, grain `fresh`.
- **Type:** Besley (heads) + Archivo, with **condensed Archivo** (wdth 75) for the one stamped figure. No caps, no italic, 3 native TTFs.
- **Looks:**
  - `statRow`, `settingsRow` and `listRow` as ledgers;
  - `headline · stamp`, `field · underline`;
  - the done check inked solid black, the row a paper strip;
  - photos in three slots (Steps, Weight, recap) under hard-stop scrim bands (.54 under text rows, .30 free);
  - no ornament.
- **Its strengths:** the best readability engineering and the cheapest build.
- **Why it lost:**
  - It overlaps Ledger (leaders everywhere) and Meet Day (the condensed figure).
  - You has no photo.
  - It removes the delta pill and underlines "this box", which falsifies `you.js:802` and `food.js:3320`.
  - Its mustard sits 6.25 ΔE00 from warn.
  - Its blue and red zone washes go greige on cream.
- **Taken from it:** `rule.total`, the no-caps fence, dim's grey, the dial scale, the feetless calendar.

### C · "The Apparatus Catalogue" (112)

Rack set like a gymnasium-apparatus and scale catalogue of 1891–1919: every object an engraved cut, every bold word Clarendon and every plain word a Modern book roman.

- **Tokens:** research's plates unchanged (ochre `#90620b`), `inkOf`, knurl `#84775f`, calMark pure white.
- **Type:** Besley (bold, figures, Besley Condensed for heroes) + **Old Standard TT** for every plain word and the Coach card, with its own advance table.
- **Looks:**
  - `kpi · word` with bare deltas;
  - `statRow · line`, `listRow · plain`, leaders in Settings only;
  - hairline caption boxes;
  - **band mode** photos on You, the recap, Steps and Weight (the Triat engraving and the naval gym);
  - a traced tailpiece per tab;
  - hatched macros and the shaped confidence dot.
- **Its strengths:** the most distinctive concept, with the best single idea (band mode).
- **Why it lost:**
  - **Old Standard is static**, so the web face breaks the variable-with-wght rule.
  - The Coach card drops a reason in 2 of 640 cases.
  - A Modern at 11–13pt is the weakest read in gym light.
  - It removes the pill and underlines fields.
  - Besley Condensed was never checked.
  - It changes themeColor, and uses an engraving as a hero.
- **Taken from it:** band mode, `kpi · word`, the tailpieces, `inkOf`, the dishes icon, the confidence-dot shapes, hatched macros, leaders in Settings only.

**To swap one in,** the concept files are `design/iron-age/concept-B.md` and `concept-C.md`. C's fallback (Archivo as its text face, v1 metrics on the Coach card) is buildable tonight, and B is buildable as written.

---

## 18. Reproduce (read-only on both trees)

| Command | What it shows |
|---|---|
| `node ~/dev/vibes-night/tools/ia-final-check.mjs` | §2 and §5: every v1 leaf present, meta, 6-digit hex, no legacy spelling, fixed roles, tables follow, hue families, role references, 29 looks accepted, bands and face keys, frozen, no imports; every contrast pair; CVD; OKLCH and the guard; the icon set's shape. **99 checks, all pass** |
| `node ~/dev/vibes-night/tools/ia-final-probe.mjs` then `VIBES_CONTRACT_DEFS=~/dev/vibes-night/design/iron-age/final/probe node tools-check/vibes-contract.mjs` (in the web-design worktree) | the web contract verifier with Iron Age registered in a probe copy: **477 checks, all pass** |
| `node ~/dev/vibes-night/tools/ia-final-native-build.mjs` | native `build()` (rack-mobile HEAD's `theme.js`, its one import stubbed) takes the definition: each preset's face and line height, `fonts.keys`, the picker face `Besley_800`, the scrims, the tints, the tour veil, the chrome, the variants |
| `node ~/dev/vibes-night/tools/ia-final-fonts.mjs` | full sha256s, hhea, coverage, the widths in §2.5 |
| `node ~/dev/vibes-night/tools/ia-final-subset2.mjs` | the web woff2 sizes, each keeping its wght axis |
| `node ~/dev/vibes-night/tools/ia-final-raster.mjs <icons> <png>` | the legibility sheet (§12.5) |
| `node ~/dev/vibes-night/tools/t5-check.mjs <ttf>` | the three statics' tnum and names |

The web verifiers `vibes-contract`, `vibes-css` and `vibes-scope` also pass unchanged in the worktree with the two new files present (Iron Age is not registered there).
