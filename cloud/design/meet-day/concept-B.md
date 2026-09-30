# Meet Day, concept B: the loading room

V59 Phase D, experimental slot (`meet-day`), concept B of 2. Written 2026-09-29. It is for the two judges and the orchestrator. Nothing here is approved, and every name and feel line is working copy for Micah.

**Where the fallback applies (§12.3 asks for this first).** B rearranges boxes on **one screen, You**. Two changes happen inside blocks there: the week card's four KPI tiles become four lanes, and the two rings in the Steps/Water pair become ten-cell bars. The other six screens the composition list covers **fall back to "same order, new shapes"**: the Train calendar, the Fuel day, Weight, Steps, the workout summary and the live session. Each one's reason is given in §8. The dock is untouched everywhere.

| | |
|---|---|
| id / name / feel | `meet-day` / Meet Day / "The platform on meet day." (25 characters; the slot's line, which still holds for this angle) |
| Kind | experimental, dark. The picker shows it with the plain-text tag "Experimental" |
| The idea | Meet Day as the warm-up room behind the platform sees it: the bar being loaded, the loading chart on the wall, and the lamps. Figures are set tall and narrow in lamp white on scoreboard black, a done set lights a lamp, and the current set's box is inverted. It moves as few boxes as it can. |
| Palette | MD-1: board `#07080a`, tile `#111317`, lamp `#f5f0e3`, the green light `#4be38a`, track 4's plates. Warn moves to amber `#ffa42e`, because the copy calls it amber (§3.2). 0 text failures. The worst group pair is 14.1 ΔE00 (deuteranopia); v1's is 10.9 |
| Type | Archivo only. **Three widths, three jobs**: wdth 62.5 at 800 for every figure, 75 at 700 for every head and button word, 100 for every sentence. Those are exactly the three cuts native draws. **No caps role.** The web adds 0 bytes; native adds two statics (141,432 B together, latin-subset). The Coach card stays in Archivo on v1 metrics |
| Signature | the loading chart (`plateStrip · loaded`), the lamp (a done set; day lamps lined up into one board), edge-on plate slivers (calendar, exercise tag, legend), square 6pt meters with a lamp tick at the target, and tiles on a rubber floor with 4pt seams (the only texture is on the dock) |
| Contract | `meet-day-B.js` passes the v2 contract: 298 roles resolve, 29 of 29 blocks name a look they accept, and every colour is 6-digit hex (`tools/check-def.mjs`, §15) |

---

## 1. The idea

**Two sentences.** Meet Day seen from the warm-up room behind the platform: the loaded bar drawn as the loading chart, a lamp for each thing done, the current set in an inverted box, and every figure set tall and narrow in lamp white on scoreboard black. It moves as few boxes as it can: the week's four tiles become four lanes whose day lamps line up into one light board, the You tab's two rings become ten-cell bars, and every other screen keeps v1's order in new shapes.

**The world.** Track 6 names four objects of meet day: the board, the lights, the attempt card and the loaded bar [T6 §3]. Concept A is built on the board. B is built on the other two things a lifter sees before walking out: the **bar being loaded** and the **lamps**.

- The loading chart is the one meet object that already exists in Rack: `renderPlates()` prints "Per side 1×45 1×25". B draws that same list as the plates themselves, heaviest innermost and to scale, because the rule says discs are "loaded in the sequence of heavier discs innermost" (IPF 2026 2.3(b)7-8, via [T6 §1.1]).
- The lamp is the "good lift" white light (IPF 2026 2.8, via [T6 §1.3]). In Rack it means one thing: done. There is only ever one lamp, never red, and never three [T6 §3.1].
- The room around them is a warm-up room. Its black rubber floor is the ground, the square tiles laid on it are the panels, and the seams between tiles are the gutters. Rubber fleck is visible only where the floor shows, which is the dock (§11).

**Why this angle is a contender, not a straw man.** Its risk is the lowest of any Meet Day. Both of its box moves on You are proven by construction, and the web needs no composition engine for the lanes (§8.1). If X slips, or cannot prove a rearrangement, B still ships whole, because it asks X for nothing more than one hook with its own fallback. Its identity comes from objects Rack already draws: plates, set boxes, day dots, meters and figures. A judge who asks "what would a lifter recognise?" gets the loaded bar and the lamps on the screens he uses mid-set.

## 2. How B differs from A, and from everything else

| | B does | B does not |
|---|---|---|
| vs concept A (the board) | tiles whose heads sit flush in the tile's own colour. Tiles are 4pt apart, "floor seams" | no header band on every card, no split-flap seams, no section merges, no scoresheet table, no board grid down the session, no inverted clock slot, no lamp glow |
| vs v1 | no border, square corners, 4pt seams, no accent hue, no caps, condensed figures, lamps, loading chart, KPI lanes | v1's graphite `#14161a` / `#1c1f26` (ΔE00 3.65 / 4.20 away), its yellow, its tracked caps, its 12px radius, its glass |
| vs Iron Age (opposite pole) | modern competition, a black board, a condensed grotesque, cells and seams, no pictures at all | no period cue, serif, photo, ornament or paper [T6 §2, §4] |
| vs Ledger and Clear sky | a meet board's objects | no ruled-column ledger, no sky, no serif (C19 binds the deep slots, and Meet Day owns the board) |
| vs the 90s hardcore gym | plates, lamps and a rubber floor | no hazard stripes, stencils, slogans, chalk dust, red lamps, federation names or logos [T6 §3.10] |

---

## 3. Palette (every colour role)

### 3.1 The roles

Start from MD-1 [SYNTHESIS §5.7, §5.8; T4 GF-B]. Roles MD-1 did not define (the engine's split roles) are derived and checked here. "Moved" marks a change from MD-1, with its reason.

| Role | Hex | Job in B |
|---|---|---|
| `rack` | `#07080a` | scoreboard black: the floor. Neutral (OKLCH C 0.005), so R3.1 governs it, not the guard. The reason for this black is that track 4's checker verified it (C8). |
| `bar` | `#111317` | a tile, the sheet, a field |
| `collar` | `#1d2026` | hairlines, chart grids, row rules |
| `knurl` | `#666c77` | control edges, leader dots, the sheet's top rule |
| `chalk` | `#f5f0e3` | lamp white: primary ink and every figure |
| `steel` | `#a8a295` | secondary ink: labels, meta, units |
| `dim` = `faint` | `#9097a3` | tertiary ink, never under 4.5. There is no fourth grey. |
| `pRed` · chest · protein · 45 lb | `#ff5a3c` | data |
| `pBlue` · back · fat · water · 35 lb | `#4d97ff` | data |
| `pYellow` · legs · carbs · 25 lb | `#ffe14d` | data |
| `pGreen` · shoulders · steps · 10 lb | `#3cc4a0` | data |
| `pWhite` · arms · 5 lb | `#f2f2f2` | data. Edged in `grip` wherever it is drawn next to lamp white |
| `pChrome` · core · 2.5 lb | `#858c96` | data |
| `good` | `#4be38a` | the green light, apart from the shoulders plate |
| `warn` | **`#ffa42e`** (moved from `#ffe14d`) | amber. you.js:1068 says the weight rate is "green when they move the way your goal wants and amber the other way". MD-1's warn equals the legs yellow, a lemon (OKLCH h 100). `#ffa42e` is amber (h 67), 21.1 ΔE00 from the legs yellow, and 3.03 from Tailwind `amber-500`. Status is not guard-gated (R2.7). |
| `bad` = `danger` | `#ff5a3c` | the refused, the destructive, "no" |
| `accent` = `focus` | `#f5f0e3` | **the inversion.** Current, chosen, primary, today and the focus ring are lamp white, told apart by shape. Needs the R2.7 inversion exemption (2.59 from `amber-50`; Q-P5) |
| `accentPressed` = `pYellowPressed` | `#d9d3c4` | a pressed lit panel |
| `onAccent` = `onYellow` = `knockout` = `onDone` = `onDanger` = `white` = `onWarn` = `onPlate` = `onGreen` | `#07080a` | board ink cut out of a lit surface. White on `#ff5a3c` is only 2.72, so the swipe-delete panel and the banners take board ink. |
| `inverse` | `#f5f0e3` | the lit fill behind knockout ink |
| `done` | `#f5f0e3` | a lit lamp. The rest line also runs in it. |
| `calMark` | `#f5f0e3` | "the white head" (HUE_NAMED white), ringed in board black (`shadow.calHead`) |
| `well` | `#07080a` | a recess in a tile is the floor: board strips, lanes, in-card inputs |
| `raised` | `#1d2026` | a cell standing on a tile: plain and ghost buttons, the attempt box, the rest and peek slabs, a chosen option |
| `track` | `#23262d` | a meter's empty part, and an unlit lamp's fill |
| `grip` | `#6f7580` | the grab handle, an unlit lamp's bezel, a toggle's off track, the trajectory dots, the plate-edge keyline |
| `shade` / `lift` | `#000000` / `#ffffff` | shadows and scrims / the pressed-row wash |
| `tileHero` / `tileLit` | `#1f1f20` / `#131415` | accent at .10 and .05 over the floor. Only a v1-look fallback draws them, because `addTile · flat` draws neither. |
| `band` | `null` | a dark vibe: no status strip |
| `fallback` = `groups.fallback` | `#a8a295` | an unknown group is steel, as in v1 |
| `tagInk` | W `pYellow`, F `pRed`, D `pBlue` | the set badge's letter, on the raised attempt box |
| `inkOf` | identity | every plate reaches 4.5 as small text on every surface it sits on (§3.3) |

### 3.2 What B changed from MD-1, and why

1. **warn becomes amber `#ffa42e`**, because the copy names it amber (above). Good against warn is 47.3 / 13.3 / 13.0 ΔE00 (normal / deuteranopia / protanopia). MD-1's lemon warn gave 31.2 / 15.7 / 10.5, so protanopia improves and deuteranopia gives a little back.
2. **The split roles are defined** (`raised`, `track`, `grip`, `well`, `inverse`, `knockout`, `done`, `calMark`). MD-1 predates them.
3. **`tint.dropRail` goes from .45 to .70.** At .45 the drop rail reaches only 2.22 on a tile; at .70 it reaches 3.68 as a UI graphic.
4. **No glow at all.** Track 6 allows a 6px lamp glow [T6 §3.7e]. B declines it: a lamp here is lit by value (16.34:1 on a tile), and a glow is the neon tell (never-do 28). This is Micah's call if he wants it back.
5. **The toggle's off knob is lamp white, not steel.** Steel on the `grip` track is 1.82. Lamp white on `grip` is 4.07, and native's system Switch thumb, which is white, is 4.63. The grab handle's 3:1 against the sheet and a steel knob's 3:1 against the track cannot both hold with one `grip`, so B takes the knob out of steel. Chalk solved the same bind by darkening steel instead.

### 3.3 Contrast, measured

Run by `scratch-B/tools/palette-b.mjs`, which uses track 4's `colour-lib.mjs` (WCAG 2.2). Nothing is rounded up.

**Text, 4.5:1 minimum** (on `rack` / `bar` / `raised`; `track` where text sits on a meter slab):

| Ink | on rack | on bar | on raised | on track |
|---|---|---|---|---|
| chalk | 17.61 | 16.34 | 14.34 | 13.31 |
| steel | 7.89 | 7.32 | 6.42 | 5.96 |
| dim / faint | 6.81 | 6.32 | 5.55 | — |
| good | 12.07 | 11.20 | 9.83 | — |
| warn `#ffa42e` | 10.11 | 9.39 | 8.24 | — |
| bad / pRed / danger | 6.47 | 6.00 | 5.27 | — |
| pBlue | 6.86 | 6.36 | 5.58 | — |
| pYellow | 15.39 | 14.28 | 12.53 | — |
| pGreen | 9.15 | 8.50 | 7.46 | — |
| pWhite | 17.90 | 16.61 | 14.58 | — |
| pChrome | 5.90 | 5.48 | 4.81 | — |

**Text on lit and tinted surfaces:**
- knockout on inverse (lit panel, current box, active dock tile, chosen chip, toast): 17.61;
- onAccent on accentPressed: 13.42;
- onDanger on danger: 6.47;
- onWarn on warn (the native trial bar): 10.11;
- onPlate on each plate chip, red / blue / yellow / green / white / chrome: 6.47 / 6.86 / 15.39 / 9.15 / 17.90 / 5.90;
- tag letters on the raised attempt box: W 12.53, F 5.27, D 5.58;
- on the pick selection (accent .08 over a tile): chalk 13.52, steel 6.05;
- on a pressed row (lift .05): chalk 14.50, dim 5.61;
- on the "Next week" callout (accent .07): chalk 13.98, warn 8.03;
- steel labels on the calorie zone washes over a tile: cut 5.84, hold 4.65, gain 6.05.

**UI graphics, 3:1 minimum:**
- knurl control edge on bar / rack / raised: 3.52 / 3.79 / 3.09;
- grab handle (grip) on the sheet: 4.01;
- unlit-lamp bezel (grip) on bar / rack / raised: 4.01 / 4.32 / 3.52;
- lit lamp on a tile: 16.34; lit against the unlit bezel: 4.07;
- focus ring on bar / rack: 16.34 / 17.61;
- lit panel against the tile: 16.34; active dock tile against the floor: 17.61;
- toggle: knob on the lit track 17.61, lamp-white knob on the grip track 4.07;
- **plate fills against a meter's track**: red 4.89, blue 5.18, yellow 11.63, green 6.92, white 13.53, chrome 4.46, good 9.13;
- plates on bar / raised / rack:
  - red 6.00 / 5.27 / 6.47
  - blue 6.36 / 5.58 / 6.86
  - yellow 14.28 / 12.53 / 15.39
  - green 8.50 / 7.46 / 9.15
  - white 16.61 / 14.58 / 17.90
  - chrome 5.48 / 4.81 / 5.90
- **the lamp tick** against the track: 13.31. Against a plate fill it would fail (red 2.72, blue 2.57, green 1.92, chrome 2.98, yellow 1.14), so the tick stands in a **1pt board notch** either side and only ever meets board: 17.61;
- the white calorie head against the bare track: 13.31. Against the yellow zone and fill it would be 1.14, so it is ringed in board black: the ring against the head is 17.61;
- drop rail (pBlue .70 over a tile): 3.68.

**Decorative, and not the only edge of anything** (reported, not gated, R2.2):
- a floor seam against a tile: 1.08. This is v1's own card-to-ground step: `#1c1f26` on `#14161a` is 1.10;
- a raised cell against a tile: 1.14, and the cell always carries words;
- a track against a tile: 1.23, and the fill against the track carries the value.

**Pairs inherited from v1:** none. B sets every colour role, so no v1 pair (such as v1's 2.70 dim) carries over.

### 3.4 Colour vision (Machado 2009, severity 1.0, linear RGB)

| Six muscle groups | worst pair | next two |
|---|---|---|
| normal | back / core 19.0 | arms / core 27.4, legs / arms 27.8 |
| deuteranopia | **shoulders / core 14.1** | shoulders / arms 18.0, chest / legs 18.3 |
| protanopia | shoulders / arms 17.5 | back / core 21.3, shoulders / core 21.4 |
| tritanopia (information only) | back / shoulders 11.7 | legs / arms 16.9 |

**Minimum pairwise ΔE00 across normal, deuteranopia and protanopia: 14.1.** That clears the working threshold of 12 (R2.5). v1's is 10.9.

| Pair | normal / deutan / protan | v1 for reference |
|---|---|---|
| good / bad | 71.8 / **13.9** / 25.6 | 71.8 / 10.9 / 27.2 |
| good / warn (the weight rate's "green … amber") | 47.3 / 13.3 / 13.0 | 37.2 / 22.5 / 15.2 |
| warn / bad | 26.0 / 10.0 / 18.4 | 49.1 / 24.6 / 39.9 |
| lit lamp / unlit bezel | 36.8 / 37.3 / 36.4 | — (state by fill, too) |
| lamp white / pWhite (arms) | 6.0 / 6.3 / 6.0 | v1's chalk and arms plate are as close; arms is always labelled or keylined |

- **Up and down** keep their arrows (↑ ↓ → are in every B face, §4.3). Good against bad now survives deuteranopia better than v1's did (13.9 against 10.9).
- **warn against bad** is weaker than v1's under deuteranopia (10.0). Its only shared site is the estimator's confidence dot (food.js:2139), and that dot always carries its words ("a fair guess", "a rough guess"). So colour is never alone there.
- **Nothing reads up or down by red against green alone.**

### 3.5 The guard (R2.7), and where the grounds sit

| Role | OKLCH L / C / h | Nearest Tailwind v3 default | Reading |
|---|---|---|---|
| rack | 0.134 / 0.005 / 262 | zinc-950 0.45 | neutral, so R3.1, not the guard (C8) |
| bar | 0.186 / 0.009 / 264 | zinc-900 1.94 | neutral |
| accent `#f5f0e3` | 0.955 / 0.018 / 89 | amber-50 **2.59** | **needs the inversion exemption (Q-P5)**, as MD-1 did |
| accentPressed `#d9d3c4` | 0.868 / 0.021 / 89 | stone-300 5.90 | passes |
| good / warn / bad | — | green-400 1.59 / amber-500 3.03 / red-500 7.99 | status is not gated |

- **Distance from v1**: grounds 3.65 (rack) and 4.20 (bar). The identity cannot come from the ground [T4 §3.3]. It comes from what §5–§8 draw.
- **Hue named by copy (index.js HUE_NAMED)**, every one still its family:
  - pBlue is blue, pYellow yellow, pRed red (vermilion, as track 4 set it);
  - calMark is white (warm lamp white);
  - good is green, bad red, dim grey;
  - warn is amber, now true where MD-1's lemon was not.

---

## 4. Type

### 4.1 The family

**Archivo, and nothing else** [T6 §3.4; C20]. It is v1's family, and the Coach card's.

| | Web | Native |
|---|---|---|
| Files | none new. v1's variable Archivo already loads through rack.css line 1 (`wdth 62..125, wght 300..900`); google/fonts METADATA gives axes wdth 62–125 and wght 100–900 (`tools/fonts/archivo/METADATA.pb`, commit `b5d63988…`) | v1's four package statics, **plus two**: `ArchivoExtraCondensed-ExtraBold.ttf` (figures; the picker face) and `ArchivoCondensed-Bold.ttf` (heads, buttons), both upstream Omnibus-Type v2.001 |
| Weight and width | only through `font-variation-settings`; zero `font-weight` rules | `face.bands` routes by `wdth` (§4.4) |
| Bytes | **0** | 70,760 + 70,672 = **141,432 B** as latin subsets (`subset-font`; sources 188,616 and 186,648 B). With the dock's fleck (1,778 B), the native addition is 143,210 B. **2 of the 4** TTFs allowed |
| Licence | OFL 1.1, "Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo)", **no Reserved Font Name** (the upstream `OFL.txt`, checked: no "with Reserved Font Name" clause), so a subset may keep the name | same file |
| `tnum` | on at every figure site (`font-variant-numeric: tabular-nums`) | `fontVariant: ['tabular-nums']` from every preset with `tnum: 1`. **Mandatory**: the ExtraCondensed static's default digits are proportional [T6 §3.4]. `t5-check.mjs` on the latin subset: all ten `tnum` digits are 430 units in ExtraCondensed-ExtraBold and 480 in Condensed-Bold. The subset keeps `tnum`; `subset-font` retains every GSUB feature, and this was checked by building the subset both ways |
| PostScript names | — | `ArchivoExtraCondensed-ExtraBold`, `ArchivoCondensed-Bold`: unique, and unlike the package's `Archivo_…` keys |
| hhea | — | 878 / −210 on 1000 in both, the same as the package's, so every band's `minLh` is 1.088 |

**Provenance.**
- The ExtraCondensed file is the one track 6 fetched (sha256 `08fcd3eba05b0ff78d9ee1873046f59408faa52c8748d2de0a3667d779cdf68e`).
- The Condensed file was placed in `scratch-B` by an earlier pass of this concept (sha256 `8e2e9499adb31d79a5f50079c4a350dc4083f16a9b4826a3f464eebbfdcf7fc3`, version 2.001, PostScript name `ArchivoCondensed-Bold`). No fetch log for it was found in this pass. **Phase V re-fetches both through `fetch.mjs`** from `github.com/Omnibus-Type/Archivo/raw/master/fonts/ttf/…` and records the URL in `FONTS.json`.

**If Q requires a self-hosted, vibe-prefixed web face** (for the Vibes card's prefetch, or so an installed Archivo can never stand in):
- a digits-only variable subset `meet-day-num` of `Archivo[wdth,wght]` at wdth 62–75 and wght 700–800 is **8,864 B** woff2;
- a whole latin subset `meet-day-archivo` at wdth 62–100 and wght 400–800 is **58,884 B**, under the 120 KB cap.

Both were measured with `subset-font` on the pinned file. B proposes neither, because it adds no family.

### 4.2 Three widths, three jobs

| Width · weight | Web | Native file | Sets |
|---|---|---|---|
| **62.5 · 800** | `'wdth' 62.5, 'wght' 800` | ArchivoExtraCondensed-ExtraBold | **every figure**: stat values, KPI values, headlines, `.load-num`, the clock, set inputs, list values, the e1RM, calendar day numbers, plate-chip figures |
| **75 · 700** | `'wdth' 75, 'wght' 700` | ArchivoCondensed-Bold | **every head and button word**: h1–h3, card and section titles, eyebrows, buttons, segments, dock labels, exercise names, column heads, the greeting |
| **100 · 400 / 600 / 700 / 800** | v1's | the package's four | **every sentence**: body, notes, meta, labels, field labels, chips, list names and sub-lines, the Coach card |

- **Condensed is never a sentence** [T6 §3.4, from NN/g via MIT AgeLab]. The one head that can be a sentence is the recap's h1, which is Coach's `finishRead` headline. It sits at wdth 75, which is almost v1's own 78 for h1.
- The widths are chosen so that web and native draw the same cut. v1 itself does not do this: native ignores width, and the web sets h1 at 78 [v1.js face note].

### 4.3 Glyph coverage

- Both statics hold every sign Rack prints in a figure or a head: − ↑ ↓ → ← × ± ≈ · – — … ’ “ ” ° ½ ′ ‹ › and the no-break space (checked with opentype.js).
- Both lack ✓ ⚙ ⚠ ✎ ↳ ⋯ ✕, exactly as Archivo does [T5 §9; SYNTHESIS §0 item 5]. Those glyphs fall back as they do in v1: B draws none of them, and they stay text.
- The set check's ✓ is not painted in `setRow · attempt`, where the lamp stands for it (§7).

### 4.4 Every type role

| Role | size · wdth · wght · extra | Ink |
|---|---|---|
| body | 15 · 100 · 400 · lh 1.45 | chalk |
| h1 | 32 · 75 · 700 | chalk |
| h2 | 20 · 75 · 700 | chalk |
| h3 | 16 · 75 · 700 | chalk |
| eyebrow | 13 · 75 · 700 · ls .01 · **upper 0** | steel. Under `card · panel` the title takes the band's ink, which is chalk |
| btn | 15 · 75 · 700 · ls .01 | chalk (knockout on a lit panel) |
| btnLg | 18 · 75 · 700 · **upper 0** | as btn |
| dockLbl | 11 · 75 · 700 · ls .02 · upper 0 | steel; knockout on the active tile |
| fieldLbl | 13 · 100 · 600 · upper 0 | steel |
| note | 13 · 400 · lh 1.5 | dim |
| statVal | 26 · 62.5 · 800 · lh 1 · tnum | chalk, or the caller's colour |
| statLbl | 12 · 100 · 600 · upper 0 | steel |
| timer | 24 · 62.5 · 800 · tnum | chalk |
| kpiVal | 30 · 62.5 · 800 · lh 1 · tnum | chalk |
| headline | 40 · 62.5 · 800 · ls −.01 · lh .95 · tnum | chalk, or the site's role colour |
| youGreet | 30 · 75 · 700 · lh 1.05 | chalk. The name takes the accent, which is lamp white, so the greeting is one colour (R5.4) with no extra work |
| chip | 12 · 100 · 600 | steel |
| segBtn | 13 · 75 · 700 · upper 0 | steel |
| setInput | **15** · 62.5 · 800 · tnum | chalk. It stays at 15 so the web's iOS zoom-on-focus behaves as it does today: at 16 or more the zoom would stop, which is behaviour, not look |
| mono | 12 | chalk |
| meta | 12 · 400 · lh 1.45 | steel |
| loadNum | (the site's own 26–40) · 62.5 · 800 · ls −.01 · lh .95 · tnum | the site's role colour |

**Native bands.**

```js
bands: [{ max: 64, family: 'ArchivoExtraCondensed', keys: ['ArchivoExtraCondensed_800'], snap: {}, weights: [800], minLh: 1.088 },
        { min: 74, max: 76, family: 'ArchivoCondensed', keys: ['ArchivoCondensed_700'], snap: {}, weights: [700], minLh: 1.088 }]
```

The ranges are drawn tight on purpose. A survey of the native tree (`git grep` for `wdth: 60–79`) found only one literal site in that range, ErrorScreen's title at 78, so it stays in Archivo. v1's presets (78, 88, 92, 108, 112, 118) fall in no band. `check-def.mjs` asserts all of this.

**Caps.** B names **no caps role**. Case is lowered only where the string is authored in sentence case. Caps survive only where v1's literal CSS or JSX draws them under a v1-grade or shape-grade look, which B cannot re-set:
- the Coach card's COACH and COACH ME (fixed; COACH ME is authored in capitals);
- the live chip's label (`sessionChrome · flat`);
- the "Member since" line (`youHero · v1`);
- the add tile's small AI tag (`addTile · flat`).

§14 asks for one small route for the last three.

**The Coach card** keeps Archivo on v1's `CARD_FACE` metrics, at 190 / 164, padding 14 and border 1 (`coachCard · panel`, with the border in the ground's colour). No advance table is needed; decision (d).

**The Vibes card.**
- `pick.numFace` is `{ web: "'Archivo'", wdth: 62.5, wght: 800, native: 'ArchivoExtraCondensed_800' }`.
- The size for a 24pt cap height is 34.9pt, rounded to **`numPt` 35**. "315" measures 45.1pt at 35, well inside 92.
- On the web the number draws the moment the page's Archivo has loaded, which it already has for v1.

---

## 5. Shape language

- **Tiles on a floor.** Every card is a tile: `bar` ground, no border, radius 2, v1's padding 14. Tiles in one section sit **4pt apart**, as floor seams (`shape.gutter` 4), so a section reads as one run of tiles and sections part by v1's 26pt. Gutter 4 rather than track 6's 2, because a 2pt seam at 1.08:1 disappears; 4pt reads at arm's length.
- **A head needs no band.** `shape.band.fill` is `bar`: on a tile the band draws nothing and only sets the head row (30pt, title left, meta and ⋯ right, in lamp white). On the floor, the same band is a **section strip**: 30pt of tile with the section title in it.
- **Recesses are the floor.** A board strip, a KPI lane or an in-card input inside a tile draws on `well`, which is the floor black. That keeps B from ever nesting same-fill boxes (R6.2).
- **Radius**: 2 on everything rectangular. 0 on the attempt box, the sheet's shoulders and the dock mark. **Circles only for lamps, the avatar and toggle knobs.** Pills never: `radius.pill` is 2, so nothing reachable by `pill` stays round.
- **The lamp.**
  - Set-done lamps are 12pt, KPI day lamps 9pt.
  - Lit is filled. A done lamp is lamp white; a day lamp takes its subject's colour, as v1's dot does. No KPI subject is red, so no red lamp can occur.
  - Unlit is a hollow bezel: a 1.2–1.5pt grip ring on `track`.
  - There is never a glow.
  - The state is carried by fill, not by colour.
- **The attempt box**: a 28 × 28 square on `raised` holding the set number or W / F / D. The session's current set is **inverted** (lamp ground, board figure).
- **Meters** are 6pt, square-ended, the fill in its data colour on `track`. Where a target exists there is a 2 × 10pt **lamp tick** in a 1pt board notch.
- **Plates edge-on** is one drawing used three times:
  - the loading chart (to scale);
  - calendar slivers (3 × 12);
  - the exercise head's group tag (4 × 18 in place of v1's 4 × 30 bar), so a lift carries its plate.
- **No shadows** anywhere except the tour card (v1's, for the scrim). **No glass**: the dock and the workout bar are opaque. **No gradients**: the two chart textures are patterns, hard-stop only (C22).
- **Spacing rhythm** (R6.8): 4 (seams and within a strip), 14 (tile padding), 26 (between sections): three distinct steps.

---

## 6. Every token role (the whole definition)

The full definition is `scratch-B/meet-day-B.js`, a v2-shaped file that imports nothing and is frozen, like `chalk.js`. The judges read it there. Its values, grouped:

- **meta**:
  - `id` `meet-day`, `name` Meet Day, `feel` "The platform on meet day.";
  - `experimental` true, `scheme` dark;
  - `icons` `meet-day`, `images` {} (no photos), `themeColor` `#07080a`.
- **variants**: see §7 (all 29 blocks).
- **shape**:
  - `rule` { ink `knurl`, hair 1, head [2], place `above`, sub [2], total [2] };
  - `leader` { ink `knurl`, dot 1.5, pitch 4, min 16 };
  - `band` { fill `bar`, ink `chalk`, height 30 };
  - `gutter` 4;
  - `keyline` { ink `chalk`, width 1 };
  - `lead` { keyline false }.
- **colors**: §3.1, every key v1 has, `band` null.
- **alpha**: v1's map (yellow→pYellow, red→pRed, blue→pBlue, green→pGreen, ground→rack, accent, danger, warn).
- **tint**:
  - `setDone` done 0 (the lamp replaces the row wash);
  - `setFlash` accent .28;
  - `tagW` / `tagF` / `tagD` raised 1;
  - `dropRail` pBlue .70; `dropAdd` pBlue .45;
  - `pickSel` accent .08; `block` accent .03;
  - `coachBase` / `coachLow` / `coachHigh` accent .14 / .07 / .38;
  - `rowPress` lift .05;
  - `pillBase` / `pillUp` / `pillDown` / `pillWarn` all 0 (no delta pills);
  - `zoneCut` pBlue .16, `zoneHold` pYellow .18, `zoneGain` pRed .16;
  - `dockGlass` rack 1, `wkBarGlass` bar 1 (both opaque);
  - `backdrop` shade .65;
  - `trajGood` / `trajWarn` / `trajBad` .18;
  - `reviewBg` accent .07, `reviewBorder` accent .18;
  - `runway` rack .55, `runwayEdge` rack .70.
- **type** and **loadNum**: §4.4.
- **face**:
  - family Archivo, keys v1's four, snap {650: 700, 750: 800}, step 100, width 100, minLh 1.088;
  - bands as §4.4;
  - mono v1's;
  - web font / display / italic / num are v1's Archivo stack, and importUrl is v1's.
- **radius**: r 2, sm 2, sheet 0, tile 2, pill 2, plate 2, chip 2, mark 0, idx 0, round 50%, hair 1, bubble 2, badge 2.
- **shadow**:
  - peek, rest, toast and fab are none on the web and opacity 0 on native; fabPressed none;
  - tourCard is v1's;
  - calTick is rack .55 at spread 1;
  - flame is accent .35 inset;
  - kpiDay is knurl 1.2 inset (the unlit bezel); kpiDayOn none;
  - kpiToday is well 1.5 + steel 2.5; kpiTodayOn is well 1.5 + chalk 2.5;
  - guideEaten is knurl 1 inset;
  - traj* are spread 4 at .18;
  - tourLit is accent 2;
  - **calHead and calTarget are rack at spread 1** (native: a 1pt board border).
- **scrim**:
  - sheet: backdrop, 3px blur, webkit false;
  - dock: dockGlass, filter none, webkit true, native intensity 40 (unused; the dock is opaque);
  - wkBar: wkBarGlass, filter none;
  - tour: v1's two stops, with native locations [0, .42, 1].
- **chrome**:
  - statusBar light, keyboard dark, blurTint dark, shadow `#000000`, datePicker dark, camera `#000000`, systemFace null;
  - fixed values are v1's (appearance dark, launch `#14161a`, manifestTheme `#14161a`, webStatusBar black-translucent);
  - **colorScheme `dark`**, so the web's own date and time pickers draw on the board.
- **signIn**: v1's values, spelled 6-digit. Native sign-in only ever draws under v1.
- **banner**: devText, guardText and guardNote are `#07080a` (6.47 on pRed, 9.15 on pGreen).
- **web**: v1's `rgb` channel names and `root` layout and motion.
- **tables**:
  - `groups` / `groupPlates` / `plates` follow their roles (lowercase / UPPERCASE / lowercase);
  - `importGroups`, `mark` and `subjects` are v1's names;
  - `kpi` has every alpha at 0 (`kpi · plain` draws no corner wash);
  - `admin` and `conf` are v1's;
  - `tagInk` W pYellow, F pRed, D pBlue;
  - `inkOf` is the identity.

Engine-v2 roles filled from the start: `tagInk`, `colors.band` (null), `shadow.calHead` / `calTarget`, `face.bands`, `face.web.display` / `italic` / `num`, `type.meta`, `inkOf`, `images.<slot>.band` (none; no images) and `shape`. **B invents no key.** Its asks are §14's requests.

---

## 7. Per-component treatments (all 29 blocks)

| Block | Look | What B draws |
|---|---|---|
| `card` | **panel** | A tile: bar, no border, radius 2, padding 14. The head row is 30pt, flush in the tile's own colour: the title in 13 · 75 · 700 lamp white left; meta (12 · 400 steel) and ⋯ right. Tiles in a section sit 4pt apart. Fuel's empty meal tile stays one line. Steps' today and Weight's log keep their (empty) photo slots inside their own box |
| `youCard` | **panel** | as card. Wins and Improve draw a **3pt good / warn rule under the head row**, full width, never a side stripe. The title words still say which is which |
| `eyebrow` | v1 | the type role: sentence case, 13 · 75 · 700, steel |
| `sectionHeader` | **banner** | a 30pt floor strip (bar) with the title in 15 · 75 · 700 lamp white, sentence case, 12 in from the left. 26 above as v1; a 4pt seam to the first tile. Settings' and the admin's sections the same |
| `screenHeader` | v1 | eyebrow (13 · 75 · 700 steel) over h1 (32 · 75 · 700). The nav buttons stay 34, square (radius 2), bar ground with a knurl edge (3.52) |
| `sheetHost` | **full** | edge to edge, square shoulders (radius.sheet 0), a 2pt knurl rule along the top edge. The 36 × 4 grab handle stays, in grip (4.01 on the sheet). Backdrop shade .65 plus v1's 3px blur. Same maximum heights, same dismissal |
| `sheetTitle` | v1 | h2 in the Condensed cut, 20 · 75 · 700. A band in the sheet's own colour would draw nothing, so B names none |
| `statRow` | **board** | one strip: three cells butted on 4pt gutters, square, padding 10. **On the floor** the cells are bar. **Inside a tile** they are `well` (request §14.1). Value 26 · 62.5 · 800 (or its caller's colour), label under it in 12 · 100 · 600 steel, sentence case. Mini stats: two cells, value 18 · 62.5 · 800 |
| `kpi` | **plain** + lanes (§8.1) | no corner wash. Label 12 · 100 · 600 steel. The delta as **bare signed text with its arrow**, at 800 in good / bad / warn / dim as v1's states pick (pill tints 0). Value 30 · 62.5 · 800 with its unit in 13 steel on the baseline. "last week …" in 12 dim. Sparkline as `chart · board`. Seven **day lamps** at 9pt, lit in the subject's colour, unlit as a knurl bezel, today ringed (well 1.5 + steel 2.5) |
| `headline` | v1 | the figure alone in 62.5 · 800, lamp white or its role colour (Fuel's zone colour, Weight's pYellow). No frame, no flap. At the same literal size it is narrower than v1's wide figure; the You headlines grow from 34 to 40, about v1's width but 18% taller |
| `chip` | **square** | radius 2, on the well with v1's collar edge (text-bearing, so no 3:1 boundary is owed). Chosen is inverted (lamp ground, board words). 12 · 100 · 600. Chips v1 draws 44 tall stay 44 |
| `segmented` | **boxes** | joined square cells with 1pt collar rules between. The chosen cell is inverted. 13 · 75 · 700, sentence case, v1's height at least |
| `btn` | **panel** | Primary is a lit panel: lamp ground, board words, 15 · 75 · 700 (large 18), radius 2. Plain and ghost are a raised cell with lamp-white words and no border. Danger is a square 1.5pt danger keyline with danger words (6.00). Pressed .97, and primary pressed goes to `accentPressed`. Disabled .4. 44 at least |
| `field` | **square** | radius 2, a knurl edge (3.52 on bar), bar ground (well for in-card inputs). Focus is a 2pt lamp outline. Label above in 13 · 100 · 600 steel |
| `note` | v1 | 13 · 400 dim (6.32 on bar) |
| `toast` | **square** | inverted: lamp ground, board words, 15 · 75 · 700, square, no shadow, 16 above the dock |
| `settingsRow` | v1 | v1's rows and collar rules. Literal type as v1 (only the face and colours change). The chevron stays |
| `listRow` | **ledger** | name (14 · 100 · 600 chalk) and sub-line (12 dim); a drawn leader in knurl dots (1.5 at pitch 4); the value alone at 17 · 62.5 · 800. Rows of another shape draw plain. Swipe-to-delete and tap targets unchanged |
| `setTable` | **panel** | The exercise tile. Head row: the group's **plate edge-on** (4 × 18 in its plate colour), the name in 16 · 75 · 700 lamp white, ⋯. Then "Last · Sep 21 …" in 13 steel (tnum); the column heads Set / lb / Reps / e1RM **as authored** (a unit is never capitalised), 12 · 75 · 700 steel; the rows; the hint; the loading chart; + Set as a raised cell. Tiles 4pt apart. A lifting block is framed by a 1.5pt knurl keyline, with its title "Block 1" set as a strip head. v1's column widths are kept |
| `setRow` | **attempt** | See the attempt box (§5); the **current set** (the session's first set not done, derived and passed by the caller) is inverted. Inputs are square wells with a 1pt knurl edge and a 2pt lamp focus outline; figures 15 · 62.5 · 800; targets as grey placeholders. e1RM 13 · 62.5 · 800 steel. The check stays **30 × 30**, square, with a 1.5pt knurl edge. Inside it: unlit is a 12pt grip bezel on track; lit is a filled 12pt lamp with a lamp-white edge, and the ✓ is not painted (the aria label carries the state). **No row wash.** The tick's 600ms flash stays (accent .28). Drops keep their indent and a pBlue .70 rail; + Drop is a raised cell with a pBlue .45 edge. The coach pulse is in lamp tints, and still under Reduce Motion |
| `plateStrip` | **loaded** | **The loading chart** (§7.1) beside v1's words and chips, which stay: "Per side" (or "Per side · lb plates"), `n×w` chips on their plate colour in board figures (5.90 or better), "bar only", "+x left over" |
| `calCell` | **edge** | v1's grid, gaps and grounds (cell bar, trained raised). The day number in 13 · 62.5 · 800: dim, chalk when trained, **today** in 800 with a 1.5pt lamp keyline. Up to four **edge-on slivers** (3 × 12, 1pt apart) centred under the number, in group colours. Weekday row 12 · 75 · 700 steel. The legend's swatches are slivers too, with labels as authored in 12 · 100 · 600 steel |
| `chart` | **board** | See §7.2 |
| `dock` | **board** | Five tiles (bar), each drawn 6pt in from the dock's top and bottom and 4pt apart. Every button still spans its whole column, so the tap target is unchanged. The floor between tiles is the rubber-fleck texture (§11). Icons are v1's at 22 / 1.9 and labels 11 · 75 · 700, both steel. **The active tile is inverted**: lamp ground, board icon and label. That is a cue beyond colour. The tabs, words, order, height and position are unchanged. The tour's lit ring stays (accent spread 2) |
| `fab` | **inverse** | a lamp-white slab (radius 2) holding the + (2.6 stroke) and "Log food" in 15 · 75 · 700 board ink, sentence case as authored. No shadow: it stands off the tiles at 16:1 by value alone. Pressed goes to `accentPressed`, scale .955. Centred 14 above the dock |
| `addTile` | **flat** | tiles on the well, no border, radius 2, no washes. Photo's icon well is lamp (board icon); the lit tiles' icon well and tag sit on raised (decision b; the tag in steel reaches 6.42). The tag is square |
| `sessionChrome` | **flat** | Opaque, no shadow, square by B's radii (§8.7). The top bar is a bar-coloured slab under a collar rule: name, the clock in 24 · 62.5 · 800 lamp, the live chip (38, square, v1's collar edge; lamp-white mark and label), the calendar button (38, square), Finish as a lit panel. The rest line is 3pt lamp white while running and vermilion when over. The rest slab is raised with a knurl edge, the time in 24 · 62.5 · 800, and +30 and Skip as raised cells. The peek bar is raised with a knurl edge: name, clock, Resume (lit) |
| `youHero` | v1 | avatar 52, round, raised; the greeting in 30 · 75 · 700, all lamp white; the gear 36, square; the sub-line 13 steel |
| `coachCard` | **panel** | a tile, the border in the ground's colour, square. The band is the tile's colour, so it draws nothing. **Archivo on v1 metrics.** 190 / 164, padding 14, border 1. The mark, COACH and the lock in lamp white; the caution line in warn (amber, 9.39); the COACH ME row over a collar rule. No photo |

### 7.1 The loading chart (`plateStrip · loaded`)

- **Only where the strip shows today**: a barbell exercise whose heaviest entered set is 45 lb or more (workout.js:1278-1279). It uses **exactly the plates `renderPlates()` lists**, in its order, and never a second calculation.
- **The drawing** sits left of the words, on the strip's line, which wraps as v1's does. From the inside out:
  1. a 6pt stub of bar (2pt tall, steel);
  2. the plates, **heaviest innermost** as the list already runs, one per count (`2×45` draws two), 1pt apart, on a 3pt chrome sleeve line that runs 10pt past the last plate;
  3. **no collar**, because Rack's plate maths has none (T6 §3.5).
- **Plate size** is a drawing ratio [T6 §1.1, marked unsourced there as a lb spec], by nearest mass to the IPF disc table. The heights keep the ratio exactly:

| Plate | 45 | 35 | 25 | 10 | 5 | 2.5 |
|---|---|---|---|---|---|---|
| Height (pt) | 36 | 32 | 26 | 18 | 15 | 13 |
| Width (pt) | 8 | 7 | 6 | 5 | 4 | 4 |

- **Colours** come from the `plates` table. The 5 and 2.5 are edged 1pt in grip, so they part from lamp white and from each other.
- **Fit.** It draws while the plates fit 132pt, which is ten 45s plus change a side, past any real sleeve. Beyond that the drawing is left out and the chips alone say it: never a partial or rescaled bar.
- The drawing is `aria-hidden`; the words carry it for VoiceOver.
- **Heights**: the strip's line grows from about 22 to 40pt.
- **Where it sits**: v1's place in the card (§8.7).

### 7.2 Charts and meters (`chart · board`)

- **Bar charts**: square tops (rx 0). The partial day is **hatched** in the knurl pattern (`url(#meet-day-knurl)`: two 1px diagonals on a 4 × 4 tile, rgba lift .06 and shade .40), in place of v1's dimming. That is a shape cue. The web restyles analytics.js's rects only; no new geometry.
- **Line charts**: a 2pt line with no glow. The area's gradient becomes an **LED dot matrix** (`url(#meet-day-dots)`: a 0.9px lamp-white dot at .16 on a 4px pitch), clipped to the area path analytics.js already draws. Target dashed and maintenance dotted, as v1's footnote says. The end dot is square, 5pt.
- **Sparklines**: the same line and dots, the end mark square, `.spark-glow` not drawn.
- **Rings**: the You pair becomes **ten-cell bars** (§8.1). Every other ring is a **ten-cell segmented ring**: 3° board gaps cut through the annulus only, never through the ring's centre text, with square caps. A partly lit cell is lit to its exact fraction with a hard edge, so the shape keeps its number (R1.4).
- **Donut**: 2pt board gaps between segments, square caps.
- **Heat strip**: square cells.
- **Legends**: swatches as 3 × 10 slivers.
- **Meters** (macro rows, working-set volume, goal progress, trajectory): 6pt, square ends, fill in its data colour on track. Where a target exists (macro rows at 100%, the goal's end) a 2 × 10 lamp tick stands in a 1pt board notch.
- **The calorie meter**: square ends. v1's zone washes stay (blue cut, yellow hold, red gain: the named hues). The white head and the dashed target are each ringed 1pt in board black.
- **Pinned colours** (index.js PINNED_PAINT) are untouched; their roles simply hold B's values.

---

## 8. Composition, per screen

B's rule is to **move a box only where the move can be shown to change no reading order, no control position and no number.** Where it cannot be shown, the screen keeps v1's order in B's shapes. Block names below are descriptive; X assigns its own. Each is anchored to the web builder.

### 8.1 You: **rearranged** (inside two blocks)

v1 order, kept exactly (you.js:558-637):

`hero` · `coach` · `since` · [How you're doing: `wins`, `improve`] · [Goal: `trajectory`] · [This week: `week`] · [Rack noticed: `insights`] · [Trends: `weight`, `fuel`, `training`, `pair`(`steps`, `water`)] · [Weekly review: `review`] · [App: `install`, `admin`]

**Change 1, `week`: the 2 × 2 KPI grid becomes four lanes, and their day lamps line up into one light board.**
- **Lanes, in reading order**: Calories, Weight, Training, Steps. That is v1's row-by-row order, unchanged. Each lane is a `well` strip, 4pt apart, padding 10.
- **Left column**: label and delta, then value and unit, then "last week …".
- **Right column** (150pt at 390, 112 at 320): the sparkline (46 tall, as v1), and under it the seven day lamps. Every lane's lamps sit at the same x, so the four rows form a **4 × 7 board of lamps**, the week's consistency seen at once. Today's column is ringed in every lane.
- **Nothing is added or dropped.** Every lane holds the same six children as v1's tile, and every figure, arrow and "…" / "–" state is kept.
- **Proof, web**: CSS only. `.kpi-grid` becomes one column, and each `.kpi` is a two-column grid with `grid-template-areas` placing children in their DOM order (hd, val, prev | spark, days). **The DOM, the reading order and the focus order are untouched.** No child is a control, and the week card's ⋯ stays in its head.
- **Proof, native**: the `Kpi` switch gains the lane branch, and the week card's two-column row becomes one column. The same children in the same order.
- **Fit**: at 320 the left column is 116pt. "1,950" at 30 · 62.5 · 800 is 58pt, and its unit wraps under it as v1's already does at 320. The value never truncates.
- **Height**: four lanes of about 96pt plus seams is about 400pt, against v1's two rows of about 390pt. Nothing below moves materially.
- **The one copy note**: the card's ⋯ sheet says "Each tile is …" and "The pill is the difference …". A lane is still one subject's box, but the delta has no pill fill in B, as in Chalk. §14 lists this for Micah.

**Change 2, `pair`: the Steps and Water rings become ten-cell bars.**
- Each half tile shows "87%" (26 · 62.5 · 800, in the ring's colour: `good` at goal, else the subject's) with "of goal" beside it in 12 steel.
- Under it, a **ten-cell bar**: 10pt tall, 3pt board gaps, cells lit to the exact fraction, square. Then "6,930 a day", the seven columns, "0 of 7 days at goal", and the two-cell strip. Order unchanged.
- The ring's 84pt square becomes about 40pt, so each half tile is about 44pt shorter.
- **Proof**:
  - native `Ring.jsx` already switches, and gains a bar branch fed the same `frac`, colour and texts;
  - the web ring is the **pinned** `analytics.js ring()`, so the bar needs X to route goalCard's one call (you.js:1334) through a vibe renderer given the same arguments;
  - **per-block fallback**: if X cannot prove that, the pair keeps its rings as **ten-cell segmented rings**, drawn by CSS alone (§7.2), and only this block falls back.
- **Why a bar here and an arc on Steps**: this is a half tile, and a bar suits its width. The Steps tab keeps an arc for v1's own stated reason (§8.5).

**Unchanged on You**: every section, card and control in order. Stat rows are board strips (a look, not a move). The doubled labels ("Rack noticed" and "Weekly review" as both section and card title) stay doubled. Merging them is concept A's move and a graft candidate; B hides no label.

### 8.2 Train calendar: **falls back** (same order, new shapes)

Order kept (workout.js:391-546): `head` (Training log / month, ‹ ›) · `dow` · `grid` · `legend` · `monthStats` · `weekVolume` · `coach` (tight) · `start` · `split` (Routines, Exercises) · `statistics`.

- **Why no move.** v1 fixes the Coach card's height so that Start workout never drifts "under somebody's thumb" (workout.js:473-477). Any reorder above Start workout moves the buttons, and any reorder below it moves nothing worth moving.
- **New shapes**: the grid's edge-on slivers and today keyline; the month strip as one board strip (Sessions / Volume lb / Minutes); the week-volume tile's square meters; Coach as a tile; **Start workout as a full-width lit panel** in 18 · 75 · 700; Routines, Exercises and Statistics as raised cells.

### 8.3 Fuel day: **falls back**

Order kept (food.js:512-551): `head` (Fuel / Today, gear ‹ ›) · `summary` (the tab's lead) · `meal` × 4 · `water` · `micros` · `tail` · `fab`.

- **Why no move.** Water sits below the meals in v1, and moving it up would move its preset buttons away from where a lifter's thumb learned them. The FAB is already the thumb's.
- **New shapes**:
  - summary: the 40pt ExtraCondensed figure in its zone colour, the calorie meter's square ends and ringed head, square macro meters with lamp ticks;
  - meals: tiles 4pt apart, with leader rows;
  - micros: the three-up grid drawn as board strips on the well, cells in their order;
  - water: v1's vessel shape, unchanged, because its fill level is a number (R1.4), in knurl and pBlue;
  - the lit FAB.

### 8.4 Weight: **falls back**

Order kept (weight.js:71-225): `head` · `log` · `stats` (Latest / 7-day avg / rate) · `chart` · `tod` · `tdee` · `recent` · `tail`.

- **Why no move.** Logging is the most frequent action and v1 puts it first. Moving the figures above it would push the input down on every visit.
- **New shapes**: the log tile's square field and lit Log; the headline stats as one board strip on the floor, the rate in good or warn (never red, as v1 decided); the 2pt trend line over LED dots; leader rows in Recent.

### 8.5 Steps: **falls back**

Order kept (steps.js:148-178): `head` (Movement / Steps, gear) · `today` · `trend` · `stats` · `streaks` · `consistency` · `weekdays` · `recent` · `tail`.

- **Why no move, and why the ring stays an arc.** v1 says it outright at steps.js:219-222: "Third distinct shape in the app on purpose: Fuel is a bar, Water is a filling vessel, this is an arc. You should know which screen you're on from across the room."
- B keeps the arc and segments it into ten lamp cells:
  - web: a CSS mask of hard-stop conic cells on the annulus only;
  - native: `StepRing` draws ten arcs.
- **New shapes**: "to go" 26 · 62.5 · 800; the four step buttons (+500, +1k, +2.5k raised cells; Set total lit); square columns; the stats as board strips; the heat strip's square cells.

### 8.6 Workout summary: **falls back**

Order kept (workout.js:2052 on): `hero` (Session complete / the finish headline / line / date) · `feel` · `prs` · `milestones` · `firsts` · `totals` (Duration / Volume / Working sets) · `did` · `compared` · the rest as v1.

- **Why no move.** v1 puts the feel question "second, under the win … while the session is fresh" (workout.js:2071-2073), and "compared" is "never at the top of the page" (:2179). Pulling the totals up under the headline would push the feel chips down.
- **New shapes**: the h1 in 32 · 75 · 700; the totals as one board strip; PR rows as leader rows with the value in 62.5 · 800 and the "+n" in the colour v1 gives it; "What you did" rows with plate slivers as their group tags.

### 8.7 Live session: **falls back**

- **Top-bar zone**: v1's single row, kept in order: name and clock · Coach chip · calendar · Finish (Save in an edit). Opaque, square slabs, no glass. A second row would take height from the sets on every lift.
- **Exercise-card stack**: directly under the top bar, in session order, as v1: blocks and loose exercises through `sessionLayout()`, then + Add exercise / + Add Lifting Block, then Discard.
- **Where the plate strip sits**: **v1's place**, after the hint or Coach nudge and before + Set, drawn as the loading chart.
  - **Why it does not move up.** The strip appears only once a weight of 45 lb or more has been typed (workout.js:1278). Anywhere above the rows, its arrival would push the next input down under the thumb mid-entry.
  - Below the rows it moves only + Set, as v1's does. And Coach's nudge shares the hint's slot "so nothing below it moves" (:1261-1264), which B keeps.
- **New shapes**: attempt boxes and the one inverted current set; square wells; lamps in the checks; the loading chart; tiles 4pt apart; the rest slab and line; the peek bar.

**Screens outside the composition list** (sheets, Settings, Stats, the picker, routines, onboarding, sign-in and the gates on the web, and the admin) keep v1's order in B's shapes by definition. In particular:
- the Vibes sheet: v1's structure;
- sign-in and the gates: web only;
- onboarding's choice cards: B adds an inverted chosen state, so choice is no longer border colour alone [VOCAB §8.12].

**Every screen**: no control is added, hidden or moved to a different action. Every word and number is v1's. The dock's tabs, order and position never change.

---

## 9. The silhouette test (R10b)

Shrunk to black blocks 200px wide:

- **v1's You** is a column of about fifteen separate rounded cards 6px apart, with near-empty gaps where the section labels float (small grey text and a hairline).
- **B's You**:
  - about **eight tall slabs**. Each section fuses into one: its 30pt strip plus its tiles, whose 4pt seams scale to 2px;
  - the gaps fall only between sections;
  - the week slab's inside is **four horizontal lanes with a 4 × 7 lamp grid** where v1 shows a 2 × 2 of squares;
  - the Steps/Water pair loses its two round rings.

**Honest limit.** The outer outline is still one column of rectangles, because B moves no section. If the panel reads fused slabs and lanes as "the same silhouette", the graft is concept A's section-band merge and scoresheet (§13).

**The generic-prompt test (R10a).** "A dark fitness tracker" produces a saturated accent on near-black, rounded glass cards, gradient rings and tracked caps. B has:
- no accent hue;
- square tiles on floor seams;
- colour only in data;
- plates drawn edge-on from the app's own plate list;
- a board of day lamps;
- condensed figures and sentence-case condensed heads;
- no caps, glow, gradient or pill.

---

## 10. Icons

**v1's set, and one redrawn** (`vibes/icons/meet-day.js`). The dock, gears, calendar, bubble, lock and add-tile icons stay v1's, in B's roles.

**`spark` becomes a plug** (decision a; R8.8). Both notices it marks are about the estimator's connection: "Photo and Describe are off for this account …" and "… need the estimator connected — set it up" (food.js:1216-1225). So a plug is the neutral mark that says what they are about. It is not a star, sparkle, asterisk or bolt.

```js
spark: icon(1.6, [path('M9 3.5V8'), path('M15 3.5V8'), path('M6.5 8h11v3a5.5 5.5 0 0 1-11 0z'), path('M12 16.5v4')])
```

It sits on the 24 grid with round caps and joins and no fill, at the sites' fixed 1.6 stroke, 16px, inked in warn as v1's spark is. The two prongs are 4.5 units apart, so they stay distinct at 16px.

**Glyphs** (‹ › ✕ ⋯ ✓ ↳ ✎ ⚙) stay text and fall back as in v1. The set check's ✓ is not painted in `setRow · attempt`, where the lamp stands for it.

---

## 11. Texture (code-made)

**One texture: the rubber-floor fleck, under the dock only** [T6 §3.7d; SYNTHESIS do-instead 9].

- **Recipe** (`scratch-B/tools/fleck.mjs`, deterministic, mulberry32):
  - seed `0x6d640b17`, a 128 × 128 tile;
  - base `#07080a`;
  - 874 grey chips of 1–2px in `#15171b` / `#1c1e23`;
  - 73 chips in the four plate hues (red, blue, yellow, green) pre-mixed at 35% over the base;
  - 12.37% coverage;
  - chips wrap modulo 128, so there is no seam.
- **Output**: a **4-bit indexed PNG, 1,778 bytes** (sha256 `6f574f34…04cd0`). A pngjs decode matches every pixel. The RGB encode was 6,888 B, so the indexed form is what meets track 6's 4 KB.
- **Luminance**: the brightest chip is 2.64:1 against the base; the mean is 1.028.
- **It is never under text.**
  - The dock's labels and icons sit on solid tiles.
  - The fleck shows only in the 6pt margins and 4pt seams around them.
  - Drawn at 1 image px = 1pt on both clients: web `background-repeat`, native `ImageBackground resizeMode="repeat"`.
- **Static.** It is never animated or generated at run time.

**Two chart patterns**, as SVG `<pattern>`s, hard-stop, under figures only (§7.2):
- `meet-day-knurl`, the partial-day hatch;
- `meet-day-dots`, the LED matrix under line areas.

There is no split-flap seam, no paper tooth and no glow.

---

## 12. Three screens in words

### You (390pt, dark phone at night)

**Top of the screen.**
- The top of the screen is scoreboard black.
- Left, the round grey avatar. Beside it, "Good evening," over "Micah" in Archivo Condensed Bold at 30pt, both lamp white, the name no brighter than the greeting.
- Right, the square gear tile. "Friday, September 25" in steel.

**The Coach card.** A 190pt tile, a shade lighter than the floor, square, with no edge. Inside it, exactly v1's Archivo:
- the lamp-white bubble and COACH, and the lock;
- "The trend is pointing down.", "New best on Conventional Deadlift", "estimated max 362 lb";
- the COACH ME row over a hairline.

Under it, the "Member since Aug 21, 2025 · 400 days" line, still in v1's small tracked capitals. It is a v1 literal under `youHero · v1` until §14 request 5 routes it to `type.meta`.

**How you're doing.** A 30pt strip of tile reads "How you're doing" in Condensed Bold. 4pt below it the Wins tile starts, with a 3pt green-light rule under its head row and its sentences in regular Archivo. 4pt below that, the Improve tile has an amber rule.

**Goal.**
- A green dot, "0.9" in ExtraCondensed at 40pt, lamp white, with "lb / week down" in steel beside it.
- Then the sentence.
- Then three cells cut into the tile's floor, 4pt apart: "190.7 / Trend now", "182 / Goal lb", "Nov 30 / At this pace", the figures tall and narrow.
- Then a 6pt square meter, yellow to 39%, ending in a white tick at 182 lb, with "196.3 lb · Aug 16", "39% there", "182 lb" under it.

**This week.** "Against last week" with "rolling 7 days ⋯". Four black lanes stacked:
- "Calories → 0" with the arrow grey; "1,950" at 30pt; "kcal / day"; "last week 1,950"; to the right its yellow sparkline over a field of faint lamp dots, and seven lit yellow lamps;
- Weight, lit yellow all week, "↓ 0.9" in green;
- Training, "↓ 1" in red, two blue lamps lit and five hollow;
- Steps, "↓ 2,170" in red, white lamps.

Down the right-hand side the lamps line up into a small light board of four rows and seven days, with today's column ringed.

**Trends.** One run of tiles:
- Body weight: "191.2" at 40pt, "lb", "↓ 0.9 lb / week ✓" and "↓ 4.1 lb 30 days" in green. A 2pt yellow line over lamp dots, with the trend dashed. A board strip: 190.7 Trend today, 191.8 7-day avg, 5.2 lb swing.
- Against your targets: square-topped red / yellow / blue columns, Friday hatched because the day isn't over. Square macro meters, each ending in a notched white tick.
- Training.
- Steps and Water side by side. "87% of goal" over ten white cells, 8.7 of them lit; "28% of goal" over ten blue cells, 2.8 lit.

**Weekly review** as one tile.

**The dock.** Five dark tiles sit on a strip of black rubber floor flecked grey, red, blue, yellow and green. "You" is the one lit tile, board-black icon and label on lamp white.

### Live session (390pt, mid-bench)

**The top bar.** An opaque tile under a hairline:
- "Push day", and under it "25:00" in lamp-white ExtraCondensed;
- a square Coach chip, a square calendar button;
- a lamp-white Finish slab with board-black words.

**Barbell Bench Press.**
- The tile's head carries a red plate seen edge-on, the name in Condensed Bold lamp white, and ⋯.
- "Last · Sep 21  220×5  220×5  220×5" in steel.
- "Set  lb  Reps  e1RM" in small Condensed Bold, "lb" lowercase as written.

**The rows.**
- A grey square box with a yellow "W"; black square wells reading "95" and "8" in tall narrow figures; a square check with a filled white lamp in it.
- The same for "2", "185", "5", "216", lamp lit.
- Row "3" is the set he is on: **its box is solid lamp white with a black "3"**, the wells show grey targets "185" and "5", and the check holds a hollow grey bezel.
- No green wash on any row.

**Under the rows.**
- "Swipe a set left to delete it" in grey.
- The loading chart: a short steel stub of bar, a red 45 plate 36pt tall, a 1pt gap, a yellow 25 plate 26pt tall, the chrome sleeve running on. Beside it "Per side" and two square chips, "1×45" on red and "1×25" on yellow.
- "+ Set" as a wide grey cell.

**Barbell Curl**, 4pt below, is the next tile with a white arms plate edge-on. Its "D" drop hangs from a blue rail.

**Resting.** A 3pt white line runs across the top of the bar, and the rest slab above the dock reads "1:30" with "+30" and "Skip".

### Fuel day (390pt)

**Header.** "Fuel" in steel over "Today" at 32pt Condensed Bold; square gear, ‹ and › tiles on the right.

**The summary tile, the tab's lead.**
- "350" in ExtraCondensed at 40pt, cut blue. Beside it "kcal left today" and "1,950 eaten · target 2,300"; ⋯ in the corner.
- The calorie meter: an 18pt square-ended bar. The eaten fill is blue through the blue cut wash. The white head and the dashed white target each have a hairline of black around them, so they stand clear of the yellow hold band. "cut", "target" and "hold" sit under it in lowercase, as food.js:793-830 writes them; v1 capitalises them with CSS.
- "● In a deficit · 750 under maintenance" and "maint 2,700".
- Three square 6pt meters: Protein red to 71%, Carbs yellow to 95%, Fat blue to 76%. Each ends in a white tick in a black notch, with "142/200", "208/218", "53/70".

**Meals.**
- Breakfast is its own tile 4pt below: "Breakfast" in Condensed Bold, "520 kcal ⋯". "Oats with whey" / "1 bowl · P 42 C 60 F 11", with grey dots running to "520" in tall figures.
- Lunch and Dinner follow the same way.

**Below the meals.**
- Water: v1's bottle, its level true, in blue.
- Micronutrients: strips of black cells three across.

**The FAB.** A lamp-white slab, "+ Log food" in board ink, sits over the tiles 14pt above the dock with no shadow. The Fuel tile is the lit one in the dock.

---

## 13. What B never does

These come from SYNTHESIS §4.1 (numbers in brackets) and track 6 §3.10.

- **Colour**:
  - no hue accent (the accent is an inversion);
  - no amber, orange or yellow *accent* on the black, although warn is amber as a status (never-do 2);
  - no share of the accent with a plate [3];
  - no grey under 4.5 and no fourth grey [5];
  - nothing told by colour alone: current by inversion, done by fill, chosen by inversion, up and down by arrow [6];
  - **no red lamp, no three lamps, nothing that implies a referee or failure** [7];
  - no Tailwind-default accent without the declared exemption [8].
- **Containers**:
  - no 1px card border, no 12px radius, no pill anywhere (radius.pill is 2) [9, 12];
  - no same-fill nesting (recesses are the floor) [10];
  - no coloured side stripe (Wins and Improve rule under the head) [11];
  - no boxed row of three identical tiles (board strips) [13];
  - no "hairlines everywhere" broadsheet (tiles, strips and lanes) [14].
- **Type**:
  - no tracked caps role [15]; nothing under 11pt that B sets (the v1-literal AI tag excepted, §14) [16];
  - no accented headline word [17];
  - no face but Archivo, no monospace figure [18, 19];
  - no condensed sentence;
  - no proportional digits (`tnum` everywhere, in the file that ships) [20];
  - no rotated, outlined or glowing text [21];
  - no arrow in a face without it (all B faces have them) [22].
- **Numbers**:
  - no count-up; no fake, sample or filler figure (the Vibes card's 315 excepted, never read aloud) [24];
  - **no plate drawn anywhere `renderPlates` doesn't run, and no collar** [25];
  - no figure Rack doesn't print [26];
  - no reshaped water vessel [27].
- **Surface and motion**:
  - no gradient wash, corner glow, lamp glow or glass (dock and workout bar opaque) [28];
  - no sparkle (a plug), no emoji, no icon library [29];
  - no photo or found image [30–32];
  - **no federation name or logo; no hazard stripe, stencil, slogan, chalk dust or handprint** [33, 34];
  - no new motion; v1's flash, pulse and meter transitions only [35];
  - no split-flap seam (concept A's device).
- **Platform**:
  - no change to the dock's tabs, order, words, height or place [36];
  - no Light / Dark switch [37], no gate [38], no run-time fetch [39];
  - no concentric rings or Activity look (single segmented rings and bars) [40].

---

## 14. Requests, decisions left to Micah, risks

**Requests to the engine and the vocabulary.** These are named as requests; no key is invented.
1. `statRow · board` inside a card draws its cells on `well`, not `bar`, so the strip never nests same fill (R6.2). On the page it draws on `bar` as written.
2. `chart · board` needs the two `<pattern>` defs on the web (`vibe.js` provides none yet, VOCAB §8.6). Native uses react-native-svg `<Pattern>`, already installed. The meters' lamp tick needs its 1pt board notch, a detail the look's text ("a tick at the target") does not yet say.
3. `dock · board` draws each tile inset by 6pt from the dock's top and bottom inside a full-height button. It also needs **a texture the native branch can read**: the look reads no vibe id, and the contract has no texture slot. Until one exists, native ships the dock without fleck (solid `rack` floor), and only the web's stylesheet paints it.
4. The You composition (§8.1): X names `you.week` layout `lanes` and `you.pair` rings `bars`. The web lanes need no X, only CSS. The web bars need a hook at you.js:1334. If X wants it as a look instead, the request is `kpi · lane` added to the vocabulary.
5. The three v1-literal caps sites under v1 or shape looks (the live chip, the since line, the add tile's tag), and the tag's 8.5px size, route to `type.meta` / `type.chip`. Otherwise B keeps them as v1 draws them.
6. The record cell: track 6 wants PR figures in a lamp keyline. No `listRow` look carries a keyline, so B **does not draw it**. If wanted, it is a `listRow · ledger` extension.

**Decisions left to Micah.**
- **Q-P5**: the inversion exemption for lamp white (2.59 from `amber-50`), as MD-1 needs.
- **warn as amber `#ffa42e`** (so the copy's "amber" is true), or MD-1's lemon `#ffe14d`.
- **No glow**, where track 6 allowed a 6px lamp glow.
- **The "pill" in copy**: the week card's ⋯ sheet (you.js:802) says "The pill is the difference…". With pill tints at 0 there is no pill shape, as in Chalk.
- **setInput at 15**: raising it ends the web's iOS zoom-on-focus, which is a behaviour change.
- **The name**: "Meet Day", or "Platform" [T6 §5 item 5].
- **Q-M5**: the 30 × 30 set check stays 30. B does not enlarge it.

**Risks.**
- **The judges' "one card recipe" reading.** Every card is the same tile, with no border and square corners. B's answer is floor seams, section strips, recessed strips and lanes, and lit panels, but a strict panel could still call the tiles uniform.
- **The seams are 1.08:1.** They separate by width, and by value only as much as v1's cards do. On a dim screen at night a section may read as one slab, which B wants, but the judges may not.
- **Device checks nobody could run tonight**: RN `tabular-nums` on the ExtraCondensed static (Q-D), and whether the dock fleck's 1pt chips read on a @3x screen or turn to noise.
- **The silhouette** differs by fusion and lanes, not by outline (§9).
- **The Condensed static's provenance** must be re-fetched and logged in Phase V (§4.1).

---

## 15. Checks run for this concept (re-runnable, read-only)

| Command | What it showed |
|---|---|
| `node ~/dev/vibes-night/design/meet-day/scratch-B/tools/check-def.mjs` | `meet-day-B.js` against web-design2's `vibes/defs/index.js` ROLES and `vocab.js`. **OK**: 298 roles resolve; every colour is 6-digit hex; no legacy spelling; 29 of 29 looks accepted at an allowed grade; the tables follow their roles; the aliases equal their roles; B's presets land in the right bands, and no v1 preset or literal width does |
| `node …/scratch-B/tools/palette-b.mjs` | every contrast and CVD figure in §3 (track 4's `colour-lib.mjs`, WCAG 2.2, Machado 2009, CIEDE2000) and the Tailwind v3 distances |
| `node …/scratch-B/tools/fleck.mjs <out.png>` | the dock tile: 1,778 B, 4-bit indexed, pixel round trip verified, the luminance figures in §11 |
| `node …/scratch-B/fontmeasure.mjs` | hhea, cap height and string widths of both statics (harfbuzzjs, `tnum`) |
| `node ~/dev/vibes-night/tools/t5-check.mjs <file>` | `tnum` uniform (430 / 480) in both statics and in the latin subset; PostScript names; missing ⚙ ✕ ⋯ ✓ ↳ only |
| `subset-font` one-liners (in this concept's log) | latin subsets 70,760 / 70,672 B; web options 8,864 / 58,884 B |
| `git -C ~/dev/rack-mobile grep` for literal `wdth` 60–79 | only ErrorScreen's 78 outside the presets |

**Files** (all under `~/dev/vibes-night/design/meet-day/`):
- `concept-B.md` (this file);
- `scratch-B/meet-day-B.js` (the definition);
- `scratch-B/tools/check-def.mjs`, `palette-b.mjs`, `fleck.mjs`;
- `scratch-B/fleck-128.png`;
- `scratch-B/ArchivoCondensed-Bold.ttf` and `OFL-omnibus-archivo.txt` (from the earlier pass);
- `scratch-B/xc800-*.ttf` (subset tests);
- `scratch-B/shots/` (v1 crops for reading layout).

Nothing was written in either app tree or any worktree.
