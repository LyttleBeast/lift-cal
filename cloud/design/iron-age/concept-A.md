# Iron Age, concept A: "The manual page"

V59 Phase D, iron-age slot, concept agent A. 2026-09-27. Nothing here is approved; every photo and icon pick is `micah_approved: false`.

**Angle:** the manual page. The models are the *Physical Culture* 1908 editorial page and the body pages of Sandow's 1897 manual [T7 §1, §6.1, §8], read together with the plates of Sargent's *Health, Strength & Power* (1904) and Anderson's *Physical Education* (1897), two real exercise manuals whose halftone plates are Tier A [T8a G2].

**How to read the numbers.** Every ratio, ΔE00 and byte count below was computed tonight by a script under `~/dev/vibes-night/tools/` (listed in §17), using track 4's colour library (WCAG 2.x contrast, sRGB-encoded alpha blending, Machado 2009 CVD at severity 1, CIEDE2000) and track 5's font checker. "(computed)" marks them. Research numbers carry their track key.

---

## 1. The idea in two sentences

Rack becomes a physical-culture manual printed in 1904: warm ink on a matte book stock, each section opening on a caps Clarendon head that sits on a thick-and-thin brass rule, each figure set like a manual's challenge line, and each tab opening on a halftone plate from a real manual of the period. Nothing is boxed except the one thing a page would box, and the only colour is the rubric red that marks Coach's voice, plus the plate inks where the numbers are data.

## 2. What a judge should picture

- **The page:** stock `#e6dec9` with a faint mottle measured off Sandow's own 1897 pages, ink `#1c1712`, no cards. Sections open on caps Besley over an Oxford rule; articles open on Besley sentence-case heads over a single ruled line; tables are ruled; name-and-value lists run on drawn leaders.
- **One red:** madder carmine `#a1374f` is the rubric. On You and Train it appears only on the Coach card. The primary button is solid ink, the FAB is solid ink, today is an ink keyline.
- **The plates:** five hero boxes carry real halftone plates from 1897–1904 manuals and catalogues, each an unnamed model or an empty gymnasium, printed ink-on-stock with no sepia, under a stock scrim that keeps every word at 4.5:1.
- **The figures:** one numeral voice, Besley ExtraBold with lining tabular figures, set as a challenge line with its unit on the baseline. Every table value, delta and arrowed string stays in Archivo.
- **The icons:** a 24-unit engraved set with square caps. Its signature pieces are a globe barbell, a gymnasium beam scale, a heart-shield padlock, a desk calendar on its stand, and a printer's fist in place of the AI sparkle.

## 3. The calls this concept makes (with the evidence)

1. **Stock `r2g #e6dec9`, not `#ede3cc`.** It passes the full Tailwind guard as written: `orange-100` 5.62 on v3, 5.71 on v4 (computed). `#ede3cc` sits 4.30 from `orange-100` and needs an exemption [T4 GF3]. The cost is thinner accent margins: 4.93 on flat stock and 4.66 on the grain's darkest pixel (computed). Q-P3 stays Micah's; §4.10 gives the one-line swap.
2. **The paper grain is a third preset, `manual`, measured off Sandow 1897 itself** (n12: σ 0.744 % per pixel, 0.666 / 0.564 / 0.400 / 0.263 % at 0.25 / 0.5 / 1 / 2 mm) [T7 G.2.1]. It is the angle's own model. It is visible as a soft mottle, unlike `fresh`. On `r2g` it keeps the accent at 4.66 on the darkest pixel, where `book` leaves 4.52, a 0.02 margin (computed). §11.
3. **Fuel's summary gets no photo.** The bar guide says in so many words: "The big number … its colour is the band you are in right now" (`food.js:3582`). Single-ink photo slots [C27] would make that sentence untrue, and keeping the zone colour over a photo needs a stock scrim of α 0.867 for the ochre, which leaves the photo at 1.28:1 (computed). A true sentence beats a picture. The slot closes up (C14).
4. **The KPI delta stays a pill.** You's "Where this comes from" sheet says "The pill is the difference between the two weeks. Green means … red the other way, grey when …" (`you.js:802`). So `kpi · band` keeps the pill shape (radius.pill), filled at α .10 with signed Archivo text and its arrow. This is the only rounded, tinted thing in the vibe; research's "no delta pills" [R6.6] yields to a true sentence. Green, red and grey stay those hues: good viridian, bad Indian red, neutral steel.
5. **Fields stay boxes (`field · square`), not underlines.** Copy calls the maintenance input "this box" and says "Clear the box" (`food.js:3320`). A square box with a 1pt knurl keyline is also the 1898 *Measurement Form*'s blank. Set inputs, which no copy calls boxes, sit on ruled lines (`setRow · ruled`). The set check stays a box: "tap the box on the right to log the set" (`workout.js:1270`).
6. **The calorie bands are hatched in full-strength ink colours, not washed.** On cream, a prussian wash at any alpha from .14 to .35 comes out grey, at OKLCH C 0.010–0.016 (computed). Copy names "Blue — cut", "Yellow — hold" and "Red — gain" (`food.js:3596-3600`). A 45° hatch of full-strength prussian, a dot screen of ochre and a 135° hatch of Indian red keep each band its named hue, and tell them apart by pattern for colour-blind users [T7 §7.3]. The white head, the ticks and the dashed mark stay white (`calMark #fffaf2`) with a 1pt ink edge, the period's way to print white [T7 §3.2].
7. **pYellow moves from `#90620b` to `#8b6600`.** The copy says "the yellow line" and "Yellow — hold". The new hex is yellower (OKLCH h 84 against 76), keeps 3.92:1 as a graphic on the stock, and leaves the worst CVD pair unchanged at 12.6 (computed). Plates are not guard-gated [R2.7].
8. **Italic running meta on both clients.** Upstream Besley-Italic (static) passes `t5-check`: uniform `tnum` at 1100 and a unique PostScript name (computed). It is the third of four native files, so native gets the same look as the web and Q's parity check has one answer.
9. **Two rule weights, not one.** Chapters (section headers, the masthead, the top edge of a sheet) sit on the Oxford rule, 3 / 2 / 1.2 pt. Articles (card heads, exercise names, the challenge line) sit on a single `rule`, 1.2 pt. Without that split every card on You would stack two thick-thin rules 26 pt apart. This needs one small contract addition, `shape.rule.sub` (§15, E3), with a fallback.

## 4. Every token role

Roles are `design/ROLES.md`'s. Colours are 6-digit hex. "v1" in the Note column gives v1's value where the change matters.

### 4.1 Meta

| Role | Iron Age A | Note |
|---|---|---|
| `id` / `name` | `iron-age` / `Iron Age` | |
| `feel` | "Ink on cream, circa 1900." | the slot's working line (23 characters) |
| `experimental` | `false` | |
| `scheme` | `light` | |
| `icons` | `iron-age` (`vibes/icons/iron-age.js`) | §12 |
| `images` | 5 slots, §10 | `coachCard` and `fuelSummary` carry none |
| `themeColor` | `#14161a` | left as v1's: light vibes leave the meta tags and `theme-color` alone [R3.3] |
| `variants` | §8 | all 29 blocks named |

### 4.2 Colours (all 43 keys)

**Surfaces**

| Role | Hex | Note |
|---|---|---|
| `rack` | `#e6dec9` | stock (r2g). OKLCH L 0.901, C 0.029, h 90. Outside the AI-cream band: lowest channel 0xC9, and 4.83–9.33 ΔE00 from the five named creams (computed). 81.3 ΔE00 from v1's ground |
| `bar` | `#ebe4ce` | sheets, fields, the three lead boxes, the dock. Never a card behind stock: IA has no cards |
| `well` | `#e6dec9` | = rack. Its sites draw as keyline boxes on the page (KPI tiles, choice rows) |
| `raised` | `#d2cab7` | ink at 10 % over stock: plain buttons, set and step badges, a chosen option, Coach's chat bubbles. 1.22:1 on rack |
| `grip` | `#7b6c52` | grab handle (4.02:1 on bar), a toggle's off track, trajectory dots |
| `track` | `#d6c8a8` | the empty part of a meter |
| `tileHero`, `tileLit` | `#e6dec9`, `#e6dec9` | native washes, unused by `addTile · ruled` |

**Lines**

| Role | Hex | Note |
|---|---|---|
| `collar` | `#c4b79b` | 1px borders and chart grids that no look re-draws: 1.48:1 on rack, decorative. Rules drawn by the looks are ink (`shape.rule.ink`) |
| `knurl` | `#7b6c52` | control edges: 3.81 on rack, 4.02 on bar |

**Ink**

| Role | Hex | Note |
|---|---|---|
| `chalk` | `#1c1712` | ink: warm near-black, OKLCH L 0.209 C 0.012 h 67, not brown and not sepia [T7 §3.1] |
| `steel` | `#4a3f31` | secondary |
| `dim` | `#5f5343` | tertiary, ≥ 4.5 everywhere text sits (5.27 on the darkest grain pixel) |
| `faint` | `#5f5343` | = dim. v1's `faint` is text at 1.41:1; a changed colour must reach 4.5 |
| `inverse` | `#1c1712` | the fill behind knockout words: chosen chip or cell, toast, primary button, FAB |
| `knockout` | `#ebe4ce` | 13.99:1 on inverse |
| `calMark` | `#fffaf2` | paper white, always with a 1pt ink edge (`chart · print`), so "the white head" stays white and visible |

**Accent and state**

| Role | Hex | Note |
|---|---|---|
| `accent` | `#a1374f` | madder carmine, the rubric [C12]. One job: Rack's voice (the Coach mark, labels and chevron, the live chip), focus, the toggle's on state, the PR highlight, the tour's lit ring |
| `accentPressed` | `#8e3548` | |
| `onAccent` | `#f6efdd` | 5.77 on accent, 6.65 on pressed |
| `focus` | `#a1374f` | 4.93 on rack, 5.20 on bar |
| `danger` | `#82180c` | Indian red, the danger keyline and words, swipe to delete, errors, the rest run over |
| `onDanger` | `#f6efdd` | one value (only v1 keeps the legacy split); 8.78 on danger |
| `done` | `#0e5f40` | viridian: a set done, its tick, the rest line running |
| `onDone` | `#f6efdd` | 6.71 on done |
| `good` / `warn` / `bad` | `#0e5f40` / `#6e4d08` / `#82180c` | green, amber, red as the copy names them |
| `onWarn` | `#f6efdd` | native trial bar, 6.71 |

**Data: the plates** (CVD-built, track 4 [C30], with the yellow re-toned, §3.7)

| Role | Hex | Meaning | On rack |
|---|---|---|---|
| `pRed` | `#82180c` | chest, protein, gain | 7.51 |
| `pBlue` | `#1f4a72` | back, fat, water, training, cut, drops | 6.86 |
| `pYellow` | `#8b6600` | legs, carbs, fuel and weight, hold | 3.92, graphics and large text only |
| `pGreen` | `#0e5f40` | shoulders, steps | 5.74 |
| `pWhite` | `#2a241d` | arms, the steps subject (a light ground can't carry white data at 3:1 [T4 R3]) | 11.44 |
| `pChrome` | `#6a6d6c` | core (pewter) | 3.90, graphics only |
| `onPlate` | `#f6efdd` | a figure on a filled plate | 4.56–13.38 on all six |

**Shade and lift**

| Role | Hex | Note |
|---|---|---|
| `shade` | `#1c1712` | the sheet backdrop is ink at .45 [R3.3]. IA draws no shadows |
| `lift` | `#1c1712` | on a light page a pressed row darkens: `rowPress` ink .04 |

**Native legacy keys** (filled by `build()` from the semantic role): `onYellow` `#f6efdd` (from onAccent; the trial banner's ink takes onWarn `#f6efdd`), `onGreen` `#f6efdd`, `white` `#f6efdd`, `pYellowPressed` `#8e3548`, `fallback` `#4a3f31`.

**Requested, not in `v1.js`:** `band` `#1c1712`, the web's status-bar strip for a light vibe (white on it 17.79). See §15, E1.

### 4.3 Alpha helpers (native `T.alpha`)

These are unchanged as a map: yellow → pYellow, red → pRed, blue → pBlue, green → pGreen, ground → rack, accent, danger, warn. The `.ai-warn` notice box is warn at .10 over bar, `#dfd5ba`; chalk on it is 12.17 and warn 5.27.

### 4.4 Tints (28)

| Tint | Role, α | Why |
|---|---|---|
| `setDone` | done .07 | the done row's wash (chalk 11.99 on it over rack) |
| `setFlash` | accent .14 | the tick flash; dim stays 4.60 at its peak |
| `tagW` / `tagF` / `tagD` | **warn** / pRed / pBlue, .10 | W's letter in warn, because ochre text fails at 3.92 (E4) |
| `dropRail` / `dropAdd` | pBlue .75 / .75 | rail 3.93:1 on rack (at .45 it would be 2.14) |
| `pickSel` | **chalk** .06 | a chosen row is a darker leaf, never a pink one: accent text on a madder wash drops to 4.18 on the grain |
| `block` | accent 0 | a lifting block is framed by rules, not washed |
| `coachBase` / `coachLow` / `coachHigh` | accent .14 / .07 / .30 | the pulse around the set check (a graphic) |
| `reviewBg` / `reviewBorder` | chalk .04 / chalk 1 | "Next week" becomes a keyline box, the period's boxed note; its madder label is 4.57 on it |
| `rowPress` / `pillBase` | lift .04 / lift .06 | |
| `pillUp` / `pillDown` / `pillWarn` | good / bad / warn, .10 | the one pill (§3.4): 4.96 / 6.33 / 5.02 on it |
| `zoneCut` / `zoneHold` / `zoneGain` | pBlue .18 / pYellow .20 / pRed .16 | a fallback only; `chart · print` draws hatches (§3.6) |
| `dockGlass` / `wkBarGlass` | bar 1 / bar 1 | opaque paper, no glass |
| `backdrop` | shade .45 | → `#8b8477` over the page |
| `trajGood` / `trajWarn` / `trajBad` | good / warn / bad, .15 | |

No `exact` strings: only v1 may hold legacy spellings.

### 4.5 Type

Besley is **B** and Archivo is **A**. Weight on the web is only `font-variation-settings`. Native Besley weights snap to the three statics: 600 → SemiBold, 800 → ExtraBold, italic 400 → Italic.

| Preset | Face | Size | wdth / wght | Case, tracking | lh | Ink |
|---|---|---|---|---|---|---|
| `body` | A | 15 | 100 / 400 | as authored | 1.45 | chalk |
| `h1` | B | 26 | 80 (web) / 800 | as authored, 0 | 1.10 | chalk |
| `h2` | B | 18 | 88 / 800 | 0 | 1.15 | chalk |
| `h3` | B | 16 | 90 / 600 | 0 | 1.20 | chalk |
| `eyebrow` | B | 15 | 95 / 600 | **sentence case** (upper 0), 0 | 1.20 | chalk |
| `fieldLbl` | A | 12 | 100 / 600 | sentence case | — | steel |
| `statLbl` | A | 12 | 100 / 500 | sentence case | — | steel |
| `dockLbl` | A | 11 | 100 / 600 (active 700) | sentence case, .01 | — | dim (active chalk) |
| `segBtn` | A | 12 | 100 / 600 | sentence case | — | steel (chosen knockout) |
| `chip` | A | 12 | 100 / 600 | | — | chalk |
| `note` | A | 13 | 100 / 400 | | 1.5 | dim |
| `btn` | A | 14 | 100 / 700 | .01 | — | chalk |
| `btnLg` | A | 16 | 100 / 700 | sentence case (upper 0), .01 | — | the kind's |
| `statVal` | A | 20 | 100 / 800 | `tnum lnum` | 1 | the caller's, or chalk |
| `kpiVal` | A | 22 | 100 / 800 | `tnum` | 1 | chalk |
| `timer` | A | 22 | 100 / 700 | `tnum` | — | chalk |
| `headline` | **B** | 28 | 100 / 800 | `tnum lnum`, 0 | 1 | chalk |
| `youGreet` | **B** | 25 | 90 (web) / 800 | 0 | 1.08 | chalk, all one colour |
| `setInput` | A | 15 | 100 / 700 | `tnum` | — | chalk |
| `mono` | Menlo / monospace | 12 | — | — | — | chalk |
| `loadNum` | **B** | the site's (26–40) | 100 / 800 | `tnum lnum`, 0 | 1.0 | the site's |

**Roles set by a look at its own site** (deep looks may re-set type at literal sites):
- **Section head** (`sectionHeader · rule`): B 600, 13, **caps +0.10 em**, chalk. This is the declared caps exception (Q-Q1, C10): 13 pt, ink at 13.26:1, one line. The longest, "HOW YOU'RE DOING", is 175 pt wide (computed).
- **Running meta** (card meta such as "last 7 days"; the greeting's date; "Member since …"; the masthead's eyebrow; the recap date): **B Italic** 400, 14, steel, `onum`.
- **Set-table column heads** (`setTable · ruled`): A 600, 12, sentence case, steel. They are not caps, because the weight column's head is the unit "lb" or "kg" [R5.2].
- **Exercise name** (`setTable · ruled`): B 600, 16.

**Case and caps.** One caps role: section heads. `'COACH ME'` stays caps because it is copy. The Coach card's "COACH" title keeps v1's type (caps, .16 em, 10 pt), because the card's type is frozen by §6.6; it is logged as an inherited v1 pair, not a new role.

**Sizes.** Nothing new is under 11 pt. Chart SVG text is raised to 11 by `chart · print` (Q must fit-check it). The inherited exceptions are the Coach card's 10 pt labels and v1 chart sites that Q finds under 11 and cannot raise without clipping.

### 4.6 Face

| | Iron Age A |
|---|---|
| Text face (native `face.family`) | Archivo, unchanged: `Archivo_400/600/700/800`, snap {650 → 700, 750 → 800}, `minLh` 1.088 |
| **Display face** (request E2) | Besley v4 upstream. Native keys `Besley-SemiBold`, `Besley-ExtraBold`, `Besley-Italic`. `minLh` 1.675 (hhea) until a device-verified clamp exists (Q-D4; ink extents are 1.104 [T5 rule 9]) |
| Web text stack | `'Archivo', system-ui, -apple-system, sans-serif` (unchanged) |
| Web display stack | `'IA Besley', 'Archivo', system-ui, -apple-system, sans-serif`. Archivo draws any ↑ ↓ − that reach a Besley run |
| Mono | Menlo / monospace (unchanged) |
| Picker numeral | `Besley-ExtraBold` (native); web `'IA Besley Digits'`, a digits-only subset |

### 4.7 Radius

`r` 0, `sm` 0, `sheet` 0, `tile` 0, `plate` 0, `chip` 0, `mark` 0, `idx` 0, `hair` 0, `bubble` 0, `badge` 0, `round` '50%', **`pill` 999**.

- `pill` survives only where no look squares it: the KPI delta pill (§3.4), the web toggles and the sync pip.
- `round` keeps the avatar, the KPI day dots ("The dots are this week's seven days", `you.js:803`), the legend and status dots, the Steps ring and the chart peak ring ("The ring marks your peak", `stats.js:422`).

### 4.8 Shadows, scrims, glass

- **Shadows:** `peek`, `rest`, `toast`, `fab`, `fabPressed` and `tourCard` are none: web `[]`, native `{ opacity: 0, radius: 0, x: 0, y: 0, elevation: 0 }`. Print has no shadows; each of these surfaces carries a 1pt ink keyline instead (§8).
- **Rings (web):**
  - `calTick`: rack .55 at 1px, as v1;
  - `flame`: accent .35, inset 1;
  - `kpiDay`: knurl, inset 1.2;
  - `kpiToday`: well 1.5 + **chalk** 2.5 (today ringed in ink);
  - `kpiTodayOn`: well 1.5 + chalk 2.5;
  - `guideEaten`: knurl, inset 1;
  - `trajGood` / `trajWarn` / `trajBad`: 4px at .15;
  - `tourLit`: accent 2 (5.20:1 on the dock's bar).
- **Scrims:**
  - `sheet`: `{ tint: 'backdrop', filter: 'none' }`, ink .45 with no blur. A page does not blur;
  - `dock`: `{ tint: 'dockGlass', filter: 'none', native: { intensity: 0 } }`, opaque;
  - `wkBar`: `{ tint: 'wkBarGlass', filter: 'none' }`, opaque;
  - `tour`: flat ink .80 (three stops, all .80), not a gradient. The tour card on it (bar) is 8.21:1.

### 4.9 Native chrome

| Role | Value |
|---|---|
| `statusBar` | `dark` |
| `keyboard` | `light` |
| `datePicker` | `light` |
| `blurTint` | `light` (the dock doesn't blur, but the BlurView prop stays valid) |
| `shadow` | `#1c1712` |
| `camera` | `#000000` (the camera letterbox stays black) |
| `systemFace` | `null` |

Fixed as v1, as in every vibe: `appearance` dark, `launch` `#14161a`, `manifestTheme` `#14161a`, `webStatusBar` black-translucent, `colorScheme` null.

**signIn, banner:** native sign-in and the root banners stay v1 (§10 of the prompt), so these keys hold v1's values.

**Web channels (15):** generated from the colours above. Layout and motion are fixed.

### 4.10 Tables

| Table | Iron Age A |
|---|---|
| `groups` | chest `#82180c`, back `#1f4a72`, legs `#8b6600`, shoulders `#0e5f40`, arms `#2a241d`, core `#6a6d6c`, fallback `#4a3f31` (follows steel) |
| `groupPlates` | the same six in UPPERCASE: `#82180C`, `#1F4A72`, `#8B6600`, `#0E5F40`, `#2A241D`, `#6A6D6C` |
| `plates` | PLATES order 45 / 35 / 25 / 10 / 5 / 2.5 lb: `#82180c`, `#1f4a72`, `#8b6600`, `#0e5f40`, `#2a241d`, `#6a6d6c` |
| `importGroups` | the roles as v1, fallback `grip` |
| `mark` | pRed, pBlue, pYellow, pGreen, pWhite, pChrome (the six-plate mark in plate inks on stock) |
| `subjects` | as v1: fuel and weight pYellow; train and water pBlue; steps pWhite; prot pRed; carb pYellow; fat pBlue; all chalk; fallback steel |
| `kpi` | corner tints are unused by `kpi · band`; the band takes the subject role at full strength. Values as v1's roles at .14 for any fallback |
| `admin` | as v1's roles (aiSplit, families, pill `web` / `native`, flag on good, off bad, lit pBlue, warn warn). All four flag inks are ≥ 5.4:1 on the darkest grain pixel |
| `conf` | high good, medium warn, low bad |

**To swap to `#ede3cc`** (if Micah grants the exemption, Q-P3), change rack, well, tileHero and tileLit to `#ede3cc` and bar to `#f6efdd`. Then re-render the grain tile and the halftones, and move the photo scrim to 0.513 baked / 0.523 runtime [T8a H.2, H.6]. The accent rises to 5.18 on flat stock.

### 4.11 `shape` params (VOCAB §4)

| Param | Iron Age A |
|---|---|
| `shape.rule.ink` | `chalk`: every drawn rule is ink, and weight makes it light [T7 §4.3] |
| `shape.rule.hair` | `0.5` |
| `shape.rule.head` | `[3, 2, 1.2]`: the Oxford rule (the thin line gained +0.10 per edge [T7 G.3.4]) |
| `shape.rule.place` | `below`: the head sits on the rule |
| `shape.rule.sub` (request E3) | `[1.2]`: the single `rule`, read by `card`, `youCard`, `setTable` and `headline` |
| `shape.leader` | `{ ink: 'dim', dot: 1.5, pitch: 4.5, min: 16 }`: round 1.5 dots at about 0.3 em [T7 §4.3] |
| `shape.keyline` | `{ ink: 'chalk', width: 1 }` |
| `shape.band`, `shape.gutter` | defaults (unused) |

## 5. Contrast and colour vision (computed, `ia-a-palette.mjs stock=r2g`)

### 5.1 Text on every surface it lands on (needs 4.5)

| Text | rack | bar | raised | pressed `#e2d7c7` | done row | chosen row (ink .06 / bar) | Next-week box | **grain darkest `#e0d8c4`** |
|---|---|---|---|---|---|---|---|---|
| chalk | 13.26 | 13.99 | 10.90 | 12.52 | 11.99 | 12.49 | 12.28 | 12.53 |
| steel | 7.65 | 8.07 | 6.29 | 7.22 | 6.92 | 7.21 | 7.09 | 7.23 |
| dim / faint | 5.58 | 5.89 | 4.59 | 5.27 | 5.05 | 5.26 | 5.17 | 5.27 |
| accent | 4.93 | 5.20 | **4.05 ✗** | 4.65 | **4.46 ✗** | 4.65 | 4.57 | 4.66 |
| good | 5.74 | 6.05 | 4.72 | 5.41 | 5.19 | 5.40 | 5.31 | 5.42 |
| warn | 5.74 | 6.06 | 4.72 | 5.42 | 5.19 | 5.41 | 5.32 | 5.42 |
| bad / pRed / danger | 7.51 | 7.92 | 6.17 | 7.09 | 6.79 | 7.07 | 6.96 | 7.09 |
| pBlue | 6.86 | 7.24 | 5.64 | 6.48 | 6.21 | 6.47 | 6.36 | 6.48 |
| pWhite | 11.44 | 12.07 | 9.41 | 10.80 | 10.35 | 10.78 | 10.60 | 10.81 |

**Rule that follows:** madder is never set as text on `raised`, in a done row or on a wash. Where v1 puts accent text on one of those, the IA stylesheet inks it chalk and keeps a non-colour cue. Q walks the pairs from the code; these two are the ones to watch.

**Ink on fills:**
- knockout on inverse: 13.99;
- onAccent on accent / pressed: 5.77 / 6.65;
- onDanger: 8.78;
- onDone: 6.71;
- onWarn: 6.71;
- onPlate on the plates: 8.78, 8.03, 4.58, 6.71, 13.38, 4.56;
- chalk on calMark: 17.12;
- white on the band: 17.79.

**Large text only** (≥ 18 pt, or 14 pt bold; needs 3:1): pYellow 3.92 on rack and 4.13 on bar. Fuel's hold-zone number is 40 pt and Weight's big number is 28–32 pt, so both pass.

### 5.2 Graphics (need 3:1)

- **Controls and marks:** knurl 3.81 (rack) and 4.02 (bar); grab handle 4.02; focus 4.93 / 5.20; ink rules 13.26.
- **Plates as marks on rack:** 7.51, 6.86, 3.92, 5.74, 11.44, 3.90.
- **Drop rail:** 3.93.
- **Dock:** icons 5.89 at rest and 13.99 active; the tour's madder ring 5.20 on the dock.
- **Decorative** (no minimum): collar 1.48; track 1.23; calMark 1.29 against the page, which is why it always carries its ink edge.

### 5.3 v1 pairs this vibe inherits unchanged

- The Coach card's 10 pt caps "COACH" and "COACH ME". Their size is frozen, and their colour is now madder at 4.93 (4.66 on the grain), so they are no worse than v1.
- Chart text that Q finds under 11 pt, if raising it clips.

### 5.4 Colour-vision deficiency (Machado 2009, severity 1)

| | Worst group pairs (ΔE00) | Min pairwise | Good vs bad | Accent's nearest |
|---|---|---|---|---|
| Normal | back/core 21.7, shoulders/core 22.8, legs/core 24.7 | **21.7** | 51.9 | chest 17.3 |
| Deuteranopia | shoulders/core 12.6, shoulders/arms 14.2, chest/legs 14.3 | **12.6** | 14.5 | shoulders 8.5 |
| Protanopia | chest/shoulders 13.3, chest/arms 13.4, shoulders/core 13.7 | **13.3** | 13.3 (ΔL* 15.8) | core 10.9 |

- **Worst group ΔE00 across all three: 12.6** (≥ 12, R2.5).
- Every up/down keeps its arrow or sign. The calorie bands add pattern.
- Chosen, current, done and today never rest on colour alone: inversion, 2pt keylines, weight 800, filled ticks.
- Tritanopia (information only) puts back/shoulders at 7.4.

### 5.5 Tailwind guard (R2.7)

| Colour | Nearest v3 default | ΔE00 | Nearest v4 | ΔE00 |
|---|---|---|---|---|
| rack `#e6dec9` | `orange-100` | 5.62 | `orange-100` | 5.71 |
| bar `#ebe4ce` | `amber-50` | 5.34 | `amber-50` | 5.28 |
| accent `#a1374f` | `rose-800` | 5.97 | `pink-800` | 6.94 |
| pressed `#8e3548` | `rose-900` | 5.86 | | |

All pass on both lists. The accent is 26.9 ΔE00 from Claude's clay `#D97757` and 57.9 from v1's yellow.

## 6. Fonts

| | Besley v4 (upstream, indestructible-type) | Archivo (v1's) |
|---|---|---|
| Licence | OFL 1.1, no RFN (upstream `OFL.txt`; the name table's licence string says OFL 1.1) [T5 §7] | OFL [T6 §3.4] |
| Commit | `99d5b97fcb863c4a667571ac8f86f745c345d3ab` | unchanged |
| **Web** | `Besley[wdth,wght]` subset to latin with the wght axis trimmed to 600–800 and wdth to 85–100: **59.0 KB** woff2. `Besley-Italic[wdth,wght]` with wght 400–500 and wdth pinned at 100: **41.8 KB**. Digits-only picker subset about 3 KB. **Family total ≈ 104 KB ≤ 120** (computed, `ia-a-subset.mjs`, `subset-font`, all layout features kept, text = Google's latin range + ≈) | already loaded; 0 bytes |
| **Native** (3 of 4) | `Besley-SemiBold.ttf` (155,648 B, sha256 `3e9ef08c…`), `Besley-ExtraBold.ttf` (167,244 B, `11304ee2…`; also the picker face), `Besley-Italic.ttf` (163,512 B, `8300f5f6…`). **All three pass `t5-check`:** uniform `tnum` digits (1190 / 1320 / 1100), GSUB `c2sc calt liga onum smcp ss01 tnum`, unique PostScript names `Besley-SemiBold` / `Besley-ExtraBold` / `Besley-Italic`, none equal to an Archivo package name (computed tonight; this closes Q-Q3's SemiBold check). About 0.49 MB in full, or latin subsets keeping names and features | package files, unchanged |
| Tabular | live on the variable fonts [T5 §3] and in all three statics (above) | as v1 |
| Missing | → ↑ ↓ ✓ ✕ ⋯ ⚙ ↳ ✎ ⚠ ▾ ▴. It has − × ≈ · % ’ “ ” — – … ½ (computed, `ia-a-fontprobe.mjs`) | ⚙ ✕ ⋯ ✓ ↳ ⚠ ✎ ▾ ▴ |
| Metrics | UPM 2000, hhea 2500 / −850 → 1.675, cap height 0.750, x-height 0.520 | 1.088 |
| Coach card | **keeps Archivo on v1 metrics.** No advance table is needed; the card's text fitting is v1's | |

**Where Besley goes:**
- h1, h2, h3;
- card and sheet heads (`eyebrow`);
- the section caps;
- the exercise name;
- the greeting;
- the challenge figure (`headline`, `loadNum`);
- the running meta (italic);
- the picker's `315`.

**Where it never goes:** body text, labels, table values, deltas, any string with an arrow, the Coach card, buttons, chips, the dock, the timer.

**Fit** (computed widths on the native statics at wdth 100, the worst case):
- "Good afternoon," at 25 pt is 226.5 pt, inside the 231 pt the greeting has on a 375 phone;
- "September 2026" at 26 pt is 235 pt against 257 on a 375 phone. It wraps at web 320 unless the web's wdth 80 narrows it to about 195;
- the longest sheet title, "Where this comes from", at 18 pt is 236 pt, inside 256 at 320;
- `1,950` at 40 pt is 112.8 pt.

Q must re-measure on the rendered pages.

## 7. Shape language

- **Radius 0.** Pages are cut square. The only round things are what the copy calls dots, rings and the pill (§4.7), the avatar, and the toggle.
- **Rules carry structure; weight makes them light** [T7 §4]:
  - hairline 0.5;
  - `rule` 1.2 (1 nominal, gained);
  - double 1 / 2 / 1;
  - Oxford 3 / 2 / 1.2;
  - frame 1 / 2 / 2.5 / 2 / 1, once per screen at most: the PR callout on the recap;
  - leaders of round dots.
- **Container roles** (R6.1):
  - **lead**: one boxed paper panel per tab, bar ground, square, no border: Fuel's summary, Weight's log, Steps' today;
  - **group**: everything else sits on the page under its head rule;
  - **callout**: the boxed note ("Next week"), a 1pt ink keyline;
  - **plate**: stamped square keylines for chips, the plate strip, the rest pill, the peek bar and the live chip;
  - **sheet**: a full-width leaf with an Oxford rule along its top.
  
  Only the callout has both a fill (ink .04) and a border.
- **Spacing rhythm:** 4–8 within a group, 16–20 between articles, 32–40 before a chapter (section) head. Lead padding 20; list rows on a 44 pitch.
- **One ornament per screen:** the tailpiece, placed only after the last box of a long scroll (You, Weight, Steps, the stats pages). Never inside data. §12.4.
- **Stamped, never embossed:** keylines are flat 1pt ink. No bevels, no "bite".

## 8. Per-component treatments (VOCAB order, all 29 blocks)

| Block | Look | Iron Age A treatment |
|---|---|---|
| `card` | `ruled` | No ground or box. The head row (Besley 15/600 title left; italic steel meta and a drawn ⋯ dinkus right) sits on the 1.2 pt `rule` (sub) at full width, and the content runs to the rule's width. Cards part by 20 pt of space. The **lead box** (Fuel summary, Weight log, Steps today) keeps a bar-ground panel, square, no border; Steps and Weight carry their plates inside it. Fuel's empty meal stays one line |
| `youCard` | `ruled` | As card. "Doing well" sits on a viridian (good) rule and "Could improve" on an amber (warn) rule, replacing v1's 3pt left stripes: the colour moves to the head rule [R6.4]. Which card is which is still in the title words |
| `eyebrow` | `v1` | The geometry is v1's. The type is the new `eyebrow` role: Besley 15/600, sentence case, ink, with no tracking and no caps. `.chart-sub` sub-heads read "Volume by week · 8 weeks" in the same face |
| `sectionHeader` | `rule` | The chapter head: Besley 600, 13 pt caps +0.10 em, ink, sitting on the full-width Oxford rule, 36 pt above and 12 below. No trailing hairline |
| `screenHeader` | `masthead` | The eyebrow becomes the running head in Besley Italic 14 steel ("Training log", "Fuel"). Below it, the title in Besley 800 at 26 (web wdth 80), then the Oxford rule across the full measure. The nav buttons keep their place and size (34) as square keyline plates with drawn chevrons. The recap's hero is the same masthead over its plate (§10) |
| `sheetHost` | `full` | Edge to edge, square top corners, the Oxford rule along the top edge in place of the rounded shoulder. The grab handle stays: 36 × 4 grip, 4.02:1. Ink .45 backdrop, no blur. Maximum heights unchanged |
| `sheetTitle` | `rule` | The h2 (Besley 800, 18) over a 0.5 hairline at the sheet's full content width. The eyebrow above it is Besley 15/600 |
| `statRow` | `folio` | The period folio line: a 0.5 hairline above and below; three columns on one baseline, parted by 0.5 ink verticals; values Archivo 20/800 `tnum`, left-aligned; labels under them Archivo 12/500 steel, sentence case ("trend today", "7-day avg", "lb swing"). No fill, no box. MiniStats the same, at 16 |
| `kpi` | `band` | A square keyline tile (collar 1px) with a 3 pt band of the subject colour across its top edge: fuel and weight ochre, train prussian, steps ink. There is no corner tint. The label is Archivo 12 steel. The delta is **the pill, kept** (§3.4): radius 999, tint .10, signed Archivo 800 text with its arrow in good / bad / steel. The 22 pt value; "last week …" in steel; the 46 pt sparkline in print strokes (this week in colour, last week in dim); seven round day dots, today ringed in ink |
| `headline` | `rule` | **The challenge line.** The figure in Besley ExtraBold with `lnum tnum`, its unit on the same baseline in Archivo 13/400 steel, sentence case ("lb / week down", "kcal / day"), the way "4,300 LBS." sits on the Cyr poster [T7 §6.3]. Under it runs the 1.2 `rule` (sub). Deltas beside it stay Archivo with their arrows. Sizes: You's statement figures 28; `loadNum` sites keep v1's 26–40. At most one figure of 32 pt or more per screen: Fuel's 40, Weight's maintenance 32, water's 34 in its sheet |
| `chip` | `stamp` | Square, a 1pt ink keyline, no ground, Archivo 12/600 ink. **Chosen = filled ink with knockout words.** Chips that are 44 tall in v1 stay 44; rows scroll as v1's do |
| `segmented` | `boxes` | Joined square cells with 1pt ink rules between them and round the outside; the chosen cell inverted. Sentence case 12/600 |
| `btn` | `inverse` | **Primary** = solid ink block, knockout words, square: "the solid ink block with stock text knocked out" (Saxon 1908 cover) [T7 §8]. **Plain** = raised paper (`#d2cab7`), square, ink words. **Ghost** = no box: steel words underlined 1pt, the 44 hit area kept by padding. **Danger** = square 1.5pt Indian-red keyline and Indian-red words. Large buttons are sentence case 16/700. Press scale .97; disabled .4 |
| `field` | `square` | Bar ground, square, 1pt knurl keyline (3.81:1), padding 12. Focus turns the keyline to a 2pt madder (4.93:1). Label above in Archivo 12/600 steel, sentence case. It stays a box because copy says "this box" (§3.5) |
| `note` | `rule` | A footnote: a 16 pt hairline (0.5 ink) above the note, then Archivo 13 dim, lh 1.5 |
| `toast` | `square` | Inverted ink strip, square, no shadow, knockout words, Archivo 13/700. Its place above the dock is kept |
| `settingsRow` | `ledger` | Label (Archivo 14/600 ink) … drawn leader dots (dim) … value (Archivo 12 steel, `tnum`) and the drawn › chevron. No rules between rows; one 0.5 hairline under the group. Pressed = ink .04. Toggle rows keep their switches: off grip, on madder, plus the knob's position |
| `listRow` | `ledger` | Name … leader … value, with only the value at 800: PR, PB, rank ("bold only the ranked column"), session, food entry, recent steps. Rows of another shape draw as `plain`: no rules between rows, 44 pitch. Swipe to delete keeps an Indian-red panel with knockout words |
| `setTable` | `ruled` | No box. The group tag (4 × 30 in the group colour) and the exercise name (Besley 600/16), with ⋯ at the right, sit on the 1.2 rule. Then the "Last …" line in Archivo 13 steel, then the column heads (Archivo 12/600 steel, sentence case) over a 1.2 ink rule. The rows follow, then the actions. A lifting block is framed by the double rule (1 / 2 / 1) above and below its exercises, under a Besley 600 title. Widths stay v1's 30 / 1fr / 1fr / 42 / 38 |
| `setRow` | `ruled` | Rows parted by 0.5 ink hairlines. The badge is a bare figure: the set number in steel, or W in warn, F in Indian red, D in prussian (request E4 for W's colour). The two inputs lose their ground and sit on a 1pt ink rule, Archivo 15/700 `tnum`, with grey (dim) targets as placeholders. The e1RM is Archivo 12 dim. The check is a 30 × 30 square with a 1.5pt ink edge; **done = viridian fill with a knockout ledger tick**, plus the .07 row wash. A drop hangs on a prussian rail (.75) behind a drawn hooked arrow |
| `plateStrip` | `stamp` | "Per side" (Archivo 12 steel), then each plate as a stamped square: a 1pt keyline in that plate's ink, no fill, Archivo 12/800 ink `tnum` figures ("2×45"). "bar only" and "+x left over" stay word for word |
| `calCell` | `ruled` | A printed calendar: 0.5 ink hairlines between cells, no grounds. The day number is Archivo 12: dim when untrained, ink 700 when trained, with up to four 3pt plate bars. **Today: a 2pt ink keyline and 800 weight**, not madder: on Train the Coach card is the rubric. Weekday heads in Archivo 11/600 steel, sentence case as authored |
| `chart` | `print` | 2pt lines with square caps and no area wash or glow; square-topped bars; the day that isn't over hatched at 45° in its own colour (request E9); dashed and dotted targets kept dashed and dotted in ink; collar grid; rings with square caps; donuts flat. **Calorie meter:** a square tan track; bands as full-strength hatches (§3.6), drawn with CSS `repeating-linear-gradient` on the web and a react-native-svg `<Pattern>` on native; the eaten fill solid; the head, ticks and dashed mark in paper white with a 1pt ink edge. **Steps ring:** drawn on its own round bar-ground disc, so its arc is measured against paper, not the photo (pGreen 6.05:1). Chart text ≥ 11 |
| `dock` | `rail` | Opaque bar paper under a 2pt ink rule. Five cells with the engraved icons at 22 pt (stroke 1.5 via CSS) over Archivo 11/600 sentence-case labels in dim. **Active:** a 3pt ink bar across the cell's full width, along the rule; icon and label in ink, label 700. No blur. Height 64 |
| `fab` | `inverse` | A square ink block centred 14 above the dock: the + (2.6, square caps) and "Log food" in Archivo 14/700 sentence case, knockout. No shadow. Pressed = scale .955 |
| `addTile` | `ruled` | No tiles: a two-column grid parted by 0.5 ink hairlines. Engraved icons at 22 with no wells. Title Archivo 15/700; the line Archivo 13 dim; the "ai" tag a stamped keyline in steel, Archivo 11/600, as authored. **The Photo tile is found first** because its camera sits on a 36 pt ink plate with a knockout icon, the only filled mark in the grid. An off tile stays visible at .4 |
| `sessionChrome` | `plate` | Stamped plates, square, 1pt ink keyline, bar ground, no shadow. Top bar: the name (Archivo 15/700), the clock (Archivo 700 `tnum`, steel), the **live chip** (38 tall, square keyline plate, madder bubble and "Coach" in madder, the screen's one red), the calendar button (38, square plate, engraved desk calendar), Finish (ink primary). The rest line runs 3pt across the top in viridian, Indian red when over. **Rest pill:** a square plate with time Archivo 800/22 `tnum`, and +30 and Skip as underlined words. **Peek bar:** a square plate with name, clock and Resume (ink primary). On the web the bar's top safe-area band is ink (§10) |
| `youHero` | `banner` | The greeting set in a square box with a 1pt ink keyline over its plate (§10), under the stock scrim. Every word is ink: "Good evening," and the name in Besley 800/25, one colour; the date in Besley Italic 14. The avatar (52, round, raised) and the gear (36, square bar plate, knurl edge, engraved gear) sit on their own fills. "Member since …" in italic steel below the box. With no photo the block renders v1's structure in IA's tokens |
| `coachCard` | `ruled` | No ground: only the top and bottom of the 1pt border, in ink; square corners; 190 / 164 tall, padding 14, border 1, all unchanged. **Archivo and v1's metrics, lines and `numberOfLines` unchanged.** The madder bubble, "COACH", "COACH ME" and the chevron are the rubric; the caution line is warn. No photo |

**Blocks not in the vocabulary, restyled by tokens or the web stylesheet:**
- the sync pip (ink dot, madder when syncing fails? no: v1's roles as mapped);
- the trial bar: warn .12 wash with warn words, 4.87;
- the swipe-to-delete panel;
- onboarding's choice cards: square collar keyline; **chosen = 2pt ink keyline plus a drawn ledger tick at the right** (web, via `::after` with `content: ''`). Native keeps v1's colour-only cue until a hook exists (logged);
- the tour card: bar, 1pt ink keyline, Oxford rule on top, on the flat ink scrim.

## 9. Every screen

- **Web sign-in and gates** (native stays v1):
  - the stock page with the ink status band;
  - the six-plate mark in plate inks;
  - "Rack" as a Besley 800 masthead over the Oxford rule;
  - square keyline fields, the ink primary, links as underlined steel words;
  - the invite, waiting and paused gates are the same page; errors in Indian red, success in viridian, each with its words.
- **Onboarding** (8 steps):
  - the step kicker is the italic running head, the title is Besley 800;
  - choice cards as in §8, with the tick on the chosen one;
  - the numbers step uses square fields;
  - the progress marks are square pips, filled ink for done.
- **Tour:** a flat ink .80 scrim, the lit dock tab ringed in madder, the tour card as in §8.
- **You:** §13.1.
- **Coach:**
  - card as in §8;
  - **sheet**: full, Oxford top; Rack's lines on square raised paper blocks; replies as ink blocks with knockout words; proposal rows as ledger rows; question and goal chips stamped, chosen inverted; the ▾ ▴ expanders as drawn chevrons;
  - **live chip** as in `sessionChrome`;
  - **nudge**: a bar-ground strip between two 0.5 ink hairlines, madder "Coach", ink text, the drawn saltire × at 44.
- **Train calendar:**
  - masthead ("Training log" / "September 2026") over the Oxford rule;
  - the ruled calendar, today in an ink keyline;
  - the three-stat folio line;
  - the Coach card (tight, 164), carrying the screen's one red;
  - **Start workout** on its ink plate (§10); the week-volume chart in print.
- **Day sheet:** a full sheet whose date head sits on a rule, with ledger lines per exercise.
- **Live session:** §13.2.
- **Recap:**
  - the recap masthead over its plate (§10): the italic "Workout complete"-style kicker as authored, the h1, the finish line and the italic date;
  - the Wins head on a viridian rule;
  - PB rows as ledger rows;
  - the folio stat line;
  - **one** `rule-frame` (1 / 2 / 2.5 / 2 / 1) around the record callout if a PR is shown, as the screen's framed piece.
- **Stats and exercise detail:** PageHead as a masthead with a drawn ‹ Back; 3 × 3 stats as three stacked folio lines; charts in print; rank rows as ledger rows, bold only on the ranked value.
- **Picker, manager, custom:** a square keyline search field; movement chips stamped; exercise rows plain at 44, each with the drawn › chevron; chosen = ink .06 row plus a drawn tick.
- **Routines:** routine rows as ledger rows; the editor uses the `setTable · ruled` idiom with **+ Drop** as a ghost word; drop sets grouped under the hooked arrow.
- **Fuel:** §13.3.
- **Add-food sheets:**
  - the ruled add grid (§8), the Photo tile first;
  - the Foods / Meals ghost buttons with engraved book and stack icons at 16;
  - the estimator notices: a warn .10 box with the **manicule** (spark) pointing at the sentence.
- **Estimator:**
  - the capture step (camera letterbox black);
  - "Which one?" as stamped chips;
  - proposal rows as ledger rows;
  - the confidence dot kept round in good / warn / bad, beside its words;
  - the non-dismissable phase unchanged.
- **Library and meals:** ledger rows (name … kcal); edit with the drawn nib, delete with the drawn saltire, each at v1's hit size.
- **Barcode:** black camera view; the result sheet ledger.
- **Water:**
  - card: the **carafe** outline in ink (request E6; else v1's bottle drawn in ink at IA's stroke), filled prussian with v1's waves;
  - the total as a Besley challenge figure at 34 (prussian, or viridian at goal);
  - the − + steppers as drawn rules;
  - presets as ledger rows with the drawn saltire.
- **Weight:**
  - masthead;
  - the **log lead box** with its plate (§10), a square field and the ink Log button;
  - the 3-stat folio;
  - the trend chart in print (the yellow line 2pt ochre, the dashed trend in ink);
  - the maintenance block's `≈ 2,450` challenge figure at 32 in ochre (large text, 3.92);
  - recent rows as ledger rows; the tailpiece.
- **Steps:**
  - masthead;
  - the **today lead box** with its engraved plate (§10), the ring on its paper disc, and the big number in ink (the words "goal met" carry the state);
  - bars in print with "green = goal met" still true (good = pGreen = viridian);
  - the heat strip; 2 × 3 stats as folio lines; recent rows as ledger rows; the tailpiece.
- **Settings hub:**
  - chapter heads in caps Besley on the Oxford rule;
  - ledger rows, including **Look → Vibes** showing "Iron Age" … ›;
  - profile and goal sheets with square fields and boxed segmented controls.
- **Vibes sheet:**
  - full sheet, eyebrow "Look" and h2 "Vibes" over a hairline;
  - IA's own tile: ground stock; the 112 × 88 sample card in bar with a 1pt ink edge and radius 0; `315` in Besley ExtraBold 32 pt (cap height 24; 57.2 pt wide), ink; a 4 × 44 madder bar; the thumbnail is a 336 × 264 4-bit halftone crop of the naval gym under a stock scrim of .536 (`315` against its worst pixel is 4.65:1);
  - name and feel in the current UI face;
  - the ring and the drawn check follow T10.
- **Admin (owner):**
  - youCard ruled; statRow folio; ledger rows;
  - account and flag pills as stamped keylines in their role colour (all ≥ 5.4:1 on the grain);
  - the AI-split and family bars as flat square segments;
  - legible, not ornamented: no tailpiece.
- **Toasts, sync pip, trial bar:** as in §8.

## 10. Image slots and scrims

**Pipeline** (every step deterministic and recorded in `PROVENANCE.json` `transforms`) [T7 G.4.2, T8a H.3, H.9]:
1. `sips` crop to the tightened `crop_hint` (for the Sargent plate, only the band that excludes every "Fig." label);
2. `sips -Z ≤ 1170`;
3. the ink-on-stock tone map (Rec. 709 Y → L*, levels on the crop's own P0.5 / P99.5, coverage a ∈ [0.04, 1.00], mixed from `#e6dec9` and `#1c1712` in linear light; no sepia matrix);
4. **photographs only**: a 3.0 pt halftone at 45° with dot area = a and no gain curve. **Engravings are printed as line**, with no screen;
5. the scrim, baked;
6. 4-bit indexed PNG.

**Scrims** (computed on `r2g`; T8a's method):
- **Stock scrim** `#e6dec9`: baked at α **0.526** (ink text against the worst pixel 4.53) or at runtime **0.536** (4.65; the +.01 is Chrome's measured blending margin [T8a H.6]). The photo keeps 2.82 baked, 2.75 at runtime. In linear light the threshold is only .285, so the text is safe whichever model iOS uses.
- **Ink plate** (Start workout): baked at α **0.60**, with the label in knockout `#ebe4ce` at 4.67. The photo keeps 3.00. It must be baked: at runtime, linear blending would give 2.53.

Every word over a photo is ink, or knockout on the ink plate.

| Slot | Photo (Tier A) | Why this plate | Focal | Scrim | What changes over it | Crop status |
|---|---|---|---|---|---|---|
| `youHero` | `sargent-1904-leaf0205-teamsters-warning`, Fig. 21 only (unnamed model; *Health, Strength & Power*, 1904) | arms flung out level: the manual's own opening pose | (.433, .095); crop hint tightened to y .03–.2565 so no "Fig." label can enter any box | stock .536 | the name loses the accent (also R5.4); the date goes from dim to ink | **pending Q-Q2** (`r2-crops.mjs` face rule over all 10 boxes). Fallback `gym-naval-academy` (verified) |
| `coachCard` | none | 4.5:1 needs α ≥ 0.856–0.953 and the photo would keep 1.07–1.22 [C27] (computed on r2g: accent .953) | — | — | — | — |
| `startWorkout` | `gym-naval-academy` (no people, 1890–1901, Detroit Publishing) | the empty gymnasium waiting: the only frame verified for every Start box [T8a H.4] | (.45, .60) | **ink plate, baked .60** (request E5) | the label is knockout on ink, as the IA primary is | verified |
| `summaryHero` | `anderson-pulleys-man-lunge-1897` (unnamed; *Anderson's Physical Education*) | a diagonal lunge at the wall pulleys: the effort just made | (.43, .31) | stock .536 | the eyebrow and date go from dim to ink | **pending Q-Q2**; fallback naval |
| `fuelSummary` | **none** (§3.3) | the bar guide says the number's colour is the band; single ink would falsify it | — | — | — | closes up |
| `stepsToday` | `gymnase-triat-desbonnet-1911` (anonymous prospectus engraving, reproduced by Desbonnet) | a wide gymnasium hall with small walking figures and no identifiable face; the picture box is about 1.41:1, which fits Steps' 1.3–1.9 | (.50, .42), crop hint .175–.88 × .205–.58 (drops "H. TRIAT", "GYMNASE TRIAT" and the timetable) | stock .536; **line, no halftone** | all words ink; the ring sits on its own paper disc | **pending Q-Q2** (no faces to cut, so the risk is the lettering only) |
| `weightLog` | `anderson-pulleys-woman-front-1897` (unnamed; ankle-length gymnasium dress) | a woman at the wall pulley, arm raised: the log card is where the weigh-in is written | (.49, .26) | stock .536 | "Weighed earlier?" and the note go from steel and dim to ink; the square field and the ink Log button are opaque | **pending Q-Q2**; fallback naval |

- **Every subject is unnamed or absent**, so App Store screenshots carry no likeness question [R9.4; T8a G3].
- No named strongman is used, so Q-I5 does not bind this concept.
- The empty-slot rule holds: a slot without a cleared photo closes up (C14).
- **Frontispiece keyline:** the greeting box draws a 1pt ink keyline (the `youHero · banner` box). The lead boxes may read `shape.keyline` if E12 is granted; otherwise the plate's own edge defines it.
- **Budgets:**
  - five PNGs at 25–96 KB each [T8a H.6], about 0.35–0.48 MB per client;
  - picker thumbnail ≤ 30 KB;
  - grain 36.5 KB;
  - rule strips about 24 KB;
  - **≈ 0.6 MB of imagery per client** (≤ 1.5 MB).
- **Credits:** each plate's `credit_line` goes on the Licences / credits screen (Phase F), never beside Rack's name or in an ad.

## 11. Textures (code-made, seeded, PNG on both clients)

| Texture | Recipe | Where | Numbers |
|---|---|---|---|
| **Paper grain `manual`** | Track 7's `texproto.mjs grain` recipe, unchanged (seeded mulberry32 octave noise, NNLS fit to the σ-by-scale profile, zero mean, clip at 3.5σ, applied per channel to the stock's code values), with the target from Sandow 1897 (n12). Seed **1897**. 72 pt periodic tile: 216 px @3x, 144 px @2x | `rack` only: never on sheets, insets, lead boxes, the dock, the status band or under a photo. Gated: every text colour is checked against the darkest pixel [T7 G.2.4] | Achieved σ px 0.768 / 0.25 mm 0.668 / 1 mm 0.426 % (@3x). Mean luma equals flat to 0.01. Darkest `#e0d8c4`, lightest `#ece4ce`. **24,574 B @3x, 11,980 B @2x.** Accent 4.93 → 4.66; dim 5.58 → 5.27 (computed, `ia-a-grain.mjs manual 3 1897`) |
| **Ink bleed along rules** | T7 G.3.4 strips, seed 1912: ink `#1c1712` at exact coverage; +0.10 pt per edge on `rule` and the Oxford thin line only; wander 0.03 pt rms (hairline class) or 0.015 pt (heavier), wavelengths 1.3–16 pt; 144 pt tiles repeated along x. The vector rule at the gained width draws until the strip loads | every drawn rule token: hair, rule, double, Oxford, frame | 13.8 KB @3x, 10.1 KB @2x for all five [T7 G.3.5]. No halo, no pooling, no breaks, no "bite" |
| **Halftone / duotone** | §10's pipeline | the five hero plates and the picker thumbnail only | max chroma 0.033 against CSS `sepia(1)`'s 0.072 [T7 G.4.4] |
| **Hatches** | CSS `repeating-linear-gradient` (web); react-native-svg `<Pattern>` (native) | the calorie bands; the unfinished day in bar charts (E9) | pitch 2.75 pt [T7 §7.3] |

Nothing is animated or regenerated at run time. The seeds are recorded beside each file.

## 12. Icons

### 12.1 Style

- 24-unit grid, `fill: 'none'`, ink stroke, **`linecap: 'square'`, `linejoin: 'miter'`**. Stroke 1.5 at 19–22 pt (dock, add tiles, book and stack); 1.75 at 14–17 pt (gear, calendar, bubble, lock and the glyphs). The FAB's + keeps its 2.6 and the spark sites keep their 1.6.
- The period model is the catalogue "cut": an object in profile or frontal elevation, outline only, with no engraved hatching at icon size (it turns to mud) [T8b G2].
- **Traced forms** are drafts here, drawn by hand to the proportions of their source. Phase V traces each source (imagetracerjs), then simplifies it to these strokes and records the source in the icon file's comment and `PROVENANCE`.
- **Hand-drawn forms** say "hand-drawn, no source".
- **Legibility:** all 35 were rasterised at 66 px (22 pt @3x), 44 px (22 pt @2x) and 48 px (16 pt @3x) on the stock (`ia-a-icons.mjs` → `scratch-a/icons-66.png`, `icons-44.png`, `icons-16pt-3x.png`). Each reads as its object at 22 pt. Watch items for Q: the beam scale and the desk calendar are the least familiar shapes at 44 px, and the globe barbell can read as spectacles at 44 px.

### 12.2 The set (path data, final as drafted)

| Key | Form | Source | Elements |
|---|---|---|---|
| `you` | a generic bust on its cut: head, neck, shoulders, a stand collar | hand-drawn, no source (never a likeness) | `circle(12,7.4,3.4)`; `M10.4 10.5 V13.2 M13.6 10.5 V13.2`; `M4.5 20.5 C4.9 16.4 7.4 14.3 10.2 13.8 L12 15.8 L13.8 13.8 C16.6 14.3 19.1 16.4 19.5 20.5 Z` |
| `workout` | globe barbell in profile: two globes with a highlight arc, collars, a bar shortened to fit | #29 Ravenstein & Hulley 1867 (Tier A) | `circle(5,12,3.6)`; `circle(19,12,3.6)`; `M8.6 12 H15.4`; `M9.6 10.2 V13.8 M14.4 10.2 V13.8`; `M3.3 10.6 C3.7 9.7 4.4 9.2 5.2 9.2 M17.3 10.6 C17.7 9.7 18.4 9.2 19.2 9.2` |
| `food` | dessert fork upright + plain tumbler (v1's composition) | #18 + #19, Sears No. 112 | `M4.5 3 V8 M7 3 V8 M9.5 3 V8`; `M4.5 8 C4.5 10 5.6 10.8 7 10.8 C8.4 10.8 9.5 10 9.5 8`; `M7 10.8 V21`; `M13.8 6.5 H20.5 L19.4 20.5 H14.9 Z`; `M14.4 16.5 H19.9` |
| `weight` | gymnasium beam scale: platform, column, beam, poise, hanging weight | #7 Spalding c. 1891, proportions from #8 Fairbanks 1867 | `M3.5 17.5 H20.5 V20.5 H3.5 Z`; `M7 17.5 V4`; `M5.6 4 H8.4`; `M7 6 H20.5 V8.2`; `rect(11.8,4.6,2.8,2.8)`; `circle(20.5,10,1.4)` |
| `steps` | two insole outlines, mirrored and offset | #25 Sears insole (outline only) | `M6.2 5.2 L4.2 5.7 L3.1 7.6 L3.2 10 L4 12.2 L4.4 14 L4.1 15.8 L3.8 17.8 L4.1 19.8 L5.2 21 L6.6 21.2 L7.9 20.6 L8.5 19 L8.3 17 L8.1 15 L8.7 12.8 L9.4 10.4 L9.1 7.5 L7.9 5.8 Z`; `M16.7 3 L18.7 3.5 L19.8 5.4 L19.7 7.8 L18.9 10 L18.5 11.8 L18.8 13.6 L19.1 15.6 L18.8 17.6 L17.7 18.8 L16.3 19 L15 18.4 L14.4 16.8 L14.6 14.8 L14.8 12.8 L14.2 10.6 L13.5 8.2 L13.8 5.3 L15 3.6 Z` (Phase V smooths these to cubics from the trace) |
| `plus` | Greek cross | hand-drawn | `M12 5 V19`; `M5 12 H19` |
| `camera` | box camera, front: box, lens, finder window, handle | #22 Sears p. 233 | `M4 7 H20 V19.5 H4 Z`; `circle(12,13.6,3.6)`; `M5.8 8.8 H8.8 V11 H5.8 Z`; `M9.6 7 V4.8 H14.4 V7` |
| `pen` | a nib at 45°: shoulders, slit, vent hole | #21 Sears p. 99 | `M5.49 18.51 L9.24 9.95 L13.98 5.21 L18.79 10.02 L14.05 14.76 Z`; `M5.49 18.51 L10.44 13.56`; `circle(11.29,12.71,0.9)` |
| `barcode` | six rules, thick and thin (ATF brass rule), no digits | hand-drawn (no period form) | `rect(3,6,1.4,12)`; `M7.3 6 V18`; `M10.3 6 V14`; `rect(12.9,6,1.4,12)`; `M17.3 6 V14`; `M20.4 6 V18` |
| `keypad` | keyline box, 3 × 2 rimmed keys, a bar | hand-drawn | `M3.5 4.5 H20.5 V19.5 H3.5 Z`; circles r 1.1 at (8,9) (12,9) (16,9) (8,12.6) (12,12.6) (16,12.6); `M8 16.4 H16` |
| `book` | open ledger, pages ruled | #14 Sears p. 155 (inside redrawn as rules) | `M12 6.2 C10 5 7 4.6 3.5 5 V19 C7 18.6 10 19 12 20.2 C14 19 17 18.6 20.5 19 V5 C17 4.6 14 5 12 6.2 Z`; `M12 6.2 V20.2`; `M5.8 9.5 H9.6 M5.8 13 H9.6 M14.4 9.5 H18.2 M14.4 13 H18.2` |
| `stack` | three dinner plates stacked, side elevation | hand-drawn (not the database cylinder, which was tried and dropped) | `M3 6.5 H21 L18.6 9 H5.4 Z`; `M3 11.5 H21 L18.6 14 H5.4 Z`; `M3 16.5 H21 L18.6 19 H5.4 Z` |
| **`spark`** | **a manicule pointing right at the sentence**, the cuff a plain band. Never a star, asterisk or bolt [R8.8] | #26 / #27 Polhemus 1895 | stroke 1.6: `M2.5 8.2 H6.2 V16.8 H2.5 Z`; `M6.2 9.3 C7.8 8.4 9.6 8.2 11.2 8.6 H20.3 C21.3 8.6 21.9 9.2 21.9 10 C21.9 10.8 21.3 11.4 20.3 11.4 H13.4`; `M13.4 11.4 C14.3 11.8 14.3 13.2 13.3 13.5 C14.1 14 13.9 15.3 12.9 15.5 C13.3 16.2 12.9 16.9 12 16.9 H6.2`; `M10 11.4 H13.4` |
| `gear` / `gearYou` | one spur gear, 8 square-shouldered teeth (outer 9.6, root 7.2), hub; no spokes | #11 Grant 1893 | `circle(12,12,2.6)`; `M10.53 4.95 L10.65 2.5 L13.35 2.5 L13.47 4.95 L15.95 5.98 L17.76 4.32 L19.68 6.24 L18.02 8.05 L19.05 10.53 L21.5 10.65 L21.5 13.35 L19.05 13.47 L18.02 15.95 L19.68 17.76 L17.76 19.68 L15.95 18.02 L13.47 19.05 L13.35 21.5 L10.65 21.5 L10.53 19.05 L8.05 18.02 L6.24 19.68 L4.32 17.76 L5.98 15.95 L4.95 13.47 L2.5 13.35 L2.5 10.65 L4.95 10.53 L5.98 8.05 L4.32 6.24 L6.24 4.32 L8.05 5.98 Z`. Traced from a PD source, so no MIT notice is owed for IA's gear |
| `calendar` | desk-calendar leaf on its wire stand; a header rule; **no numerals, no month** | #23 Sears p. 158 | `M4.5 5.5 H19.5 V17.5 H4.5 Z`; `M4.5 9.5 H19.5`; `M8.5 3 V7.5 M15.5 3 V7.5`; `M8 17.5 L6.5 21 M16 17.5 L17.5 21`; `M4.5 21 H19.5` |
| `bubble` | an oval speech balloon with a straight tail. Never the manicule | hand-drawn | `M12 4 C16.8 4 20.5 6.9 20.5 10.5 C20.5 14.1 16.8 17 12 17 C11.2 17 10.4 16.9 9.7 16.8 L5 20.4 L6.6 15.6 C4.7 14.4 3.5 12.6 3.5 10.5 C3.5 6.9 7.2 4 12 4 Z` |
| `lock` | heart-shield padlock, keyhole, shackle down | #17 Mallory No. 10 (1871) | `M5 10.5 H19 V13.5 C19 17.3 15.9 20.1 12 21 C8.1 20.1 5 17.3 5 13.5 Z`; `circle(12,14.4,1.2)`; `M12 15.6 V17.6`; `M8 10.5 V7.4 C8 5.2 9.8 3.4 12 3.4 C14.2 3.4 16 5.2 16 7.4 V10.5` |
| `unlock` | the same, shackle lifted one unit, right leg out: only the shackle moves | derived from #17 | body and keyhole as `lock`; `M8 10.5 V6.4 C8 4.2 9.8 2.4 12 2.4 C14.2 2.4 16 4.2 16 6.4 V7.4` |

### 12.3 Glyph keys (drawn; stroke 1.75, square caps, miter joins)

| Key | Char | Form | Path |
|---|---|---|---|
| `prev`, `back` | ‹ | open chevron | `M14.5 5.5 L8 12 L14.5 18.5` |
| `next`, `go` | › | open chevron | `M9.5 5.5 L16 12 L9.5 18.5` |
| `close` | ✕ | saltire | `M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5` |
| `dismiss` | × | smaller saltire | `M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5` |
| `more` | ⋯ | three spaced points in a row (copy calls it "the dots") | circles r 1.05 at (5.5,12) (12,12) (18.5,12) |
| `check` | ✓ | ledger tick | `M5 12.8 L9.6 17.2 L19 6.8` |
| `drop` | ↳ | hooked arrow | `M7.5 4.5 V12.5 C7.5 14.1 8.7 15.3 10.3 15.3 H18`; `M14.6 11.9 L18 15.3 L14.6 18.7` |
| `edit` | ✎ | the nib, without its vent | `pen`'s outline and slit |
| `gear` | ⚙ (native Fuel control) | the gear | as `gear` |
| `minus` / `plus` | − / + | one rule / Greek cross | `M5.5 12 H18.5` / `M12 5.5 V18.5`, `M5.5 12 H18.5` |
| `expand` / `collapse` | ▾ / ▴ | open chevrons | `M6 9.5 L12 15.5 L18 9.5` / `M6 14.5 L12 8.5 L18 14.5` |
| `warn` | ⚠ (the sentence-leading site and the dev banner) | a plain triangle with a rule and a point | `M12 4 L21 19.5 H3 Z`; `M12 9.5 V14`; `circle(12,16.7,0.55)` |
| `up`, `down`, `flat` | ↑ ↓ → | **stay text in Archivo**: they are a number's direction | — |

**⚙ and ⚠ inside prose, "tap ⋯" and "a ✓ when" stay text** [T8b G3]. They are copy.

### 12.4 The water vessel and the tailpiece

- **Carafe** (request E6; #20 Sears p. 645):
  - viewBox 104 × 168, stroke 3;
  - outline `M30 6 H74 L64 16 V50 C64 54 70 57 76 61 C90 70 98 86 98 106 C98 127 86 143 70 150 L72 160 H32 L34 150 C18 143 6 127 6 106 C6 86 14 70 28 61 C34 57 40 54 40 50 V16 Z`;
  - **insideBottom 150, insideTop 58**: water fills the bowl to the shoulder at 100 %, and the level stays linear in the day's fraction [R1.4];
  - the outline doubles as the clip path, as v1's does;
  - the waves and prussian fill are v1's.
- **Tailpiece**, the one ornament:
  - viewBox 96 × 12, stroke 1, ink;
  - `M0 6 H38 M58 6 H96` plus three points in a triangle at (48,3.2), (44.6,8.6), (51.4,8.6), r 1.25;
  - drawn at 96 × 12 pt, centred, 32 pt below the last box, only at the end of a long scroll;
  - its triangle can't be mistaken for the ⋯ control, whose points run in a row.

## 13. Three screens, in words

### 13.1 You (390 pt)

1. **Top.** An ink strip sits under the status bar. Below it is a plate, not a card: Sargent's model from 1904, arms flung out level, printed as a halftone on the cream stock, pale under the paper scrim and framed by a 1pt ink keyline.
   - On the plate: a round raised avatar "M" on the left, and "Good evening, / Micah" in Besley ExtraBold, one ink throughout. Under it, in Besley italic, "Friday, September 25".
   - Top right: a square paper plate with the engraved spur gear.
2. **The Coach card.** No box, only a hairline of ink above and below it, 190 tall. The one red on the screen is here: a madder speech balloon and "COACH". The lines are in Archivo exactly as v1 sets them, and "COACH ME" sits over a hairline with a madder chevron. Under it, in italic steel: "Member since Aug 21, 2025 · 400 days".
3. **The chapters.**
   - "HOW YOU'RE DOING" in Besley caps sits on a thick-and-thin rule across the page. "Doing well" in Besley sits on a single viridian rule; "Could improve" on an amber one. The findings list below, each led by its subject's coloured point.
   - The goal article gives "0.9" in Besley ExtraBold with "lb / week down" on its baseline in small steel Archivo, a ruled line under it, and "On pace: 0.9 lb a week against 1 planned." Then a folio line between two hairlines, "190.7 │ 182 │ Nov 30" over "trend now │ goal lb │ at this pace". Then a square-ended ochre progress bar on a tan track.
   - "THIS WEEK" opens on the Oxford rule. "Against last week", with italic "rolling 7 days" and a drawn ⋯, leads to four keyline boxes, each with a 3pt top band: ochre, ochre, prussian, ink. Each holds a small steel label, a pill with a signed arrow ("↓ 0.9" in viridian), a 22-point Archivo figure, "last week 192.7", a word-sized 2-point line and seven round dots with today ringed in ink.
   - "RACK NOTICED" and "TRENDS" follow the same way. The weight chart is a 2-point ochre line with the ink trend dashed across it, with no fill under it. Macro bars are square-ended. The day that isn't over is hatched.
4. **The end.** A small tailpiece closes the page: a short rule, three points in a triangle, a short rule. Then the dock: a paper strip under a 2-point ink rule, five engraved cuts (bust, globe barbell, fork and tumbler, beam scale, soles). "You" carries a 3-point ink bar along the rule and a bolder label.

### 13.2 Live session

1. **The top bar.** On the web, ink runs under the status bar. Then a stamped plate: paper with a 1pt ink keyline, holding:
   - the session name in Archivo;
   - the running clock in tabular steel figures;
   - a square keyline chip with a madder balloon and "Coach", the only red;
   - a square plate with the engraved desk calendar;
   - "Finish", a solid ink block.
   
   A 3-point viridian line runs across the top while a rest counts; it turns Indian red when the rest runs over.
2. **The exercise.** "Back Squat" in Besley SemiBold, with a 4 × 30 ochre tag at the left and a drawn ⋯ at the right, sits on a ruled line. Under it, in steel Archivo: "Last · 225 × 5, 5, 5".
3. **The set table.** Column heads in small Archivo ("Set", "lb", "Reps", "e1RM") over a ruled line; hairlines between the rows.
   - Each row: a bare set number (or an amber W, an Indian-red F, a prussian D). Weight and reps on underlined blanks in bold tabular Archivo, with last time's numbers in grey where nothing is typed yet. A small dim e1RM. A square box with an ink edge at the right.
   - A done set's box is filled viridian with a paper tick, and the row takes a faint green wash.
   - A drop set hangs under its parent behind a hooked arrow, on a prussian rail.
4. **Under the table.** "+ Set" and the other actions are underlined words or square plates. Under the bar-loaded lifts, "Per side" is followed by stamped square plates, each outlined in its plate's ink with its figures in ink: an Indian-red keyline for 45, prussian for 35, ochre for 25.
5. **Resting.** The rest pill floats as a square plate with a keyline and no shadow: the time large in tabular Archivo, then "+30" and "Skip" as underlined words. If he leaves the screen, the peek bar sits above it as the same kind of plate, with "Resume" in solid ink.

### 13.3 Fuel day

1. **The masthead.** In italic, "Fuel"; under it, "Today" in Besley ExtraBold. To the right: a square plate with the engraved gear and two drawn chevrons. A thick-and-thin rule runs across the page.
2. **The summary.** A plain paper panel, the one boxed thing on the tab, with no photo.
   - The challenge figure "1,950" in Besley ExtraBold at 40, in prussian because today sits in the cut band, as the bar guide promises.
   - Under it, "kcal left today" in Besley, and "1,200 eaten · target 1,950" in small Archivo. A drawn ⋯ in the corner.
   - **The calorie bar:** a square tan track with its three bands printed as patterns in full-strength ink (a prussian diagonal, an ochre dot screen, an Indian-red cross-diagonal). The eaten part is solid. The white head, the two solid ticks and the dashed target mark are white with an ink edge. Band labels sit underneath in small Archivo.
   - Three macro rows: "Protein", an Indian-red square-ended bar on a tan track, "142/200".
3. **The meals.** Each is an article: "Breakfast" in Besley on a ruled line, then leader rows, "Oatmeal, 1 cup ……… 300", the value bold. An empty meal is one line.
4. **Water.** The ink carafe with prussian water to today's level, and the total as a Besley figure.
5. **Micronutrients.** A ledger.
6. **Log food.** Floating above the dock: a square ink block with a square-capped + and "Log food" knocked out in paper. It carries no shadow. The dock shows Fuel with its ink bar.

## 14. What this vibe never does

1. **A card around every section.** Only the one lead panel per tab is boxed. The rest sits on the page under its rule [N8].
2. **Rules on every screen as a costume.** Rules mark chapters, articles, tables and totals. Stamps, the ink primary, the keyline KPI boxes and the plates vary the page [N12].
3. **A cream from the AI band, a clay accent or a high-contrast Didone.** Stock `#e6dec9`, madder carmine, a Clarendon [N3, R3.5].
4. **CSS `sepia()`, a brown filter or faked age.** No stains, foxing, torn edges, vignettes, fibres, specks, emboss, letterpress "bite", broken or pooled rules, or wander at 4× or more of the measured amplitude [never-do 30].
5. **Madder more than once per screen, on a wash, on `raised`, or behind words** (outside its one fill, the toggle).
6. **Tracked caps on eyebrows, labels, field labels, stat labels, set-table heads or units.** Caps only on section heads, at +0.10 em; never tracked lowercase; never "LB" or "KCAL" [N13–N15].
7. **Besley on an arrow, a delta, a table value, a button, a chip, the dock or the Coach card.** Besley under 13 pt [R4.6].
8. **A third family.** No Old Standard, League Gothic, Bodoni, wood type, Rye, Tuscans, blackletter, or Victorian face mixing [T7 §9].
9. **Ornament inside data, or more than one ornament per screen.** No crossed dumbbells, "EST. 1897" badges, ribbons, laurels, scrollwork, drop caps or centred data.
10. **A photo behind the Coach card, Fuel's number, set rows, food rows, charts, stat rows or dense numbers.** No coloured or grey text over a photo. No JPEG halftone. No empty frame [C14, C25, C27].
11. **AI-made or AI-touched imagery.** No colourised or restored photo, no named subject as a hero, no lettering from a plate ("Fig. 21.", "H. TRIAT", "SPALDING").
12. **The v1 sparkle, a star, an asterisk, a bolt, emoji, an icon in a tinted circle, SF Symbols or a stock icon set** [N22, N27].
13. **Glass, blur, glow, drop shadows or gradient washes.** The dock and the workout bar are opaque paper. Hatches are `repeating-*` only [N4–N6].
14. **A rounded corner outside the dots, rings, avatar, toggle and the one KPI pill.**
15. **A wash that loses its named hue.** The calorie bands are hatched in full-strength ink.
16. **A date on the calendar icon, or a new vessel outline without its insideTop and insideBottom.**
17. **New motion.** No entrance, fade-up or count-up. No animated or regenerated grain, and no per-render seed [N25].
18. **A light band under the web's status bar, or a cream flash before the account's vibe is known** [R3.3].
19. **Colour alone for chosen, current, today, done or up and down.** Keylines, weight 800, fills, ticks and arrows carry them.
20. **A changed word.** No "lbs.", "No.", full stops on heads, £ d ¢, no lowercase transform; 'COACH ME' stays caps; a sentence about a pill, a box, the dots, a ring, a white head, a dashed mark or a yellow band stays true [R1.1].

## 15. What this concept asks the engine for (named requests, each with a fallback)

| # | Request | Why | Fallback if refused |
|---|---|---|---|
| E1 | `band` colour role (web status strip, light vibes) | R3.3; the installed PWA's status text is white | the engine's light-vibe rule paints ink under `--safe-top` |
| E2 | a **display face**: `face.display` with its native keys and snap, and a per-preset face choice | two families on native (Archivo text, Besley heads and figures); Q-E3 | none: Iron Age can't be Iron Age without its display face |
| E3 | `shape.rule.sub` (default = `shape.rule.head`), read by `card`, `youCard`, `setTable`, `headline` | chapters on the Oxford rule, articles on a single rule (§3.9) | `sectionHeader · plain` (Besley 800/18 sentence case, no rule) over Oxford-ruled cards; no caps role at all |
| E4 | `setRow · ruled` inks the W / F / D letter from `tint.tag*.color` | ochre text is 3.92:1; W needs warn (5.74) | W in ink |
| E5 | a baked-scrim allowance on hero images (`scrim: { baked: true, … }`) | the ink plate must be baked: at runtime, linear blending gives 2.53 (§10) | Start workout without a photo, a plain ink primary |
| E6 | a water-vessel field in the icon contract (outline, insideTop, insideBottom) | the carafe; R1.4 | v1's bottle outline, stroked in ink |
| E7 | a native tailpiece hook (the tab ScrollView's footer) | the one ornament | no tailpiece on either client (parity) |
| E8 | ground texture and rule-strip hooks (web `background-image` on the page; native `Image resizeMode="repeat"`) | §11's textures are required | vector rules at the gained widths; grain dropped. That drops a §11 requirement, so it goes to Micah |
| E9 | SVG `<pattern>` defs in the page for `chart · print` | hatched unfinished days and legend swatches; `analytics.js` is pinned | the unfinished day drawn at .5 opacity, as v1 dims it. The calorie bands need no pattern (CSS) |
| E10 | a per-family `minLh` clamp for Besley after a device check | hhea 1.675 inflates heads on native | 1.675: taller head lines, which is allowed |
| E11 | native icon routing through the vibe | native routes no icon yet [T8b G6.2] | native IA shows v1's icons, a parity failure; must be granted |
| E12 | `card · ruled`'s lead box may draw `shape.keyline` | the frontispiece keyline on Steps' and Weight's plates | no keyline; the plate's own edge |

## 16. Decisions left to Micah (from this concept)

- **Q-P3:** `r2g` (this concept) or `#ede3cc` with an exemption. The swap is one line (§4.10).
- **Q-I1 / Q-I2:** the grain preset. This concept picks `manual` (Sandow 1897, σ 0.74 %), gated. `book` is 0.02 from failing on `r2g`; `fresh` is all but invisible.
- **Q-I3:** ink bleed as PNG strips (this concept, §11 to the letter) or vector at the gained widths.
- **Q-I4:** "sepia/duotone" read as the ink-on-stock tone map.
- **Q-I8 / D-H6:** Fuel keeps its colour and gets no photo (§3.3). The evidence is the bar guide's own sentence.
- **Q-I9 / D-H3:** Start workout as a baked ink plate (E5).
- **Q-I10:** 4-bit PNG plates; baked .526 or runtime .536 stock scrims on `r2g`.
- **Q-I12:** the Train icon (#29 now); the carafe (E6); v1's sparkle.
- **Q-Q1:** caps on section heads (the declared exception).
- **Q-Q2:** the crop face-rule runs for the four pending plates (Sargent 0205, Anderson lunge, Anderson woman, Triat).
- **New:** keeping the KPI delta pill (§3.4), and `field · square` over underline (§3.5). Both are read from copy; Micah may prefer to change a word in a later release and free the look.
- **New:** pYellow `#8b6600` in place of `#90620b` (§3.7).

## 17. Risks and what is unverified

- **Four of the five plates are not yet crop-checked** (Q-Q2). Each has `gym-naval-academy` as a verified fallback, which would put the same gymnasium on several tabs.
- **"Card" in copy.** You's notes say "this card" and "the card is not drawn at all". A ruled article is still a discrete block, but a strict reader could say it is no longer a card. The lead boxes are cards. Logged for Q's truth pass.
- **Accent headroom is thin on `r2g`:** 4.93 flat, 4.66 on the grain, 4.65 on a pressed leaf. Every madder text site must be walked by Q (§5.1's two failing pairs are policed by the no-madder-on-washes rule).
- **iOS compositing** of the runtime stock scrim is unknown (Q-D6). The linear threshold is .285, so text is safe either way; only how much of the photo shows moves (2.75 encoded against 1.7 linear).
- **Besley's 1.675 hhea on native** inflates head lines until E10 (Q-D4). Heads are never in fixed boxes, so nothing clips; the page just gets taller.
- **Italic `onum` in running meta on native** (`fontVariant: ['oldstyle-nums']`) is typed but unverified on a device (Q-D3). If it fails, the figures print lining; nothing breaks.
- **Chart text at 11 pt** may crowd analytics.js's fixed SVG geometry. Q fit-checks at 320.
- **Native onboarding's choice cards** keep v1's colour-only chosen cue until a hook exists.
- **The icon drafts are hand-drawn to their sources' proportions.** Phase V traces and may adjust them. The beam scale and the desk calendar are the weakest reads at 44 px.
- **The grain tile's 72 pt repeat** is invisible in a 4 × 4 preview at 1:1 (`scratch-a/view-grain-manual.png`); on the phone it is unverified (Q-D7).

## 18. Reproduce (all read-only on both trees; outputs under `~/dev/vibes-night/design/iron-age/scratch-a/`)

| Command | What it produced |
|---|---|
| `node tools/ia-a-palette.mjs stock=r2g` (and `stock=orig`) | §4–§5: contrast on every surface, fills, graphics, tints, CVD, the Tailwind v3/v4 guard, the photo-scrim thresholds in both compositing models |
| `node tools/ia-a-extra.mjs` | the KPI pill, drop rail, collar, picker, tour and callout pairs |
| `node tools/ia-a-yellow.mjs` | the pYellow candidates and zone-wash hue loss (§3.6, §3.7) |
| `node tools/ia-a-grain.mjs manual 3 1897` / `manual 2 1897` / `book 3 1889` / `fresh 3 1908` | the grain tiles on `r2g` and their darkest pixels (§11) |
| `node tools/ia-a-fontprobe.mjs <ttf>` and `node tools/t5-check.mjs <ttf>` | Besley coverage, metrics, and the three statics' `tnum` and names (§6) |
| `node tools/ia-a-subset.mjs` | the web woff2 sizes (§6) |
| `node tools/ia-a-widths.mjs` | the fit widths (§6) |
| `node tools/ia-a-icons.mjs` | `icons-a.json` and the legibility sheets (§12) |
| `node tools/fetch.mjs …` | downloaded tonight to `scratch-a/fonts/`: upstream Besley-SemiBold (`3e9ef08c…`), Besley-Italic (`8300f5f6…`), Besley-Italic[wdth,wght] (`304fb2bb…`), all at commit `99d5b97` |
