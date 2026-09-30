# Navy: the spec

V59 Phase D, slot `simple-2`. Id `navy`, name **Navy**, feel "Deep navy ground, pale ink.", scheme `dark`, not experimental.
Kind: **simple** (new colours, one new face, small shape tokens, `shape`-grade looks). v1's layout, words and numbers.

**What this file is.** Micah's change of plan gives a simple vibe no concept panel. The spec is the concept already written for this slot, `design/navy/concept-A.md` ("Highway at night": research's pick S2-a, SYNTHESIS §5.2), adopted as written. This file keeps its palette, face, shape tokens and looks, fills in what it left out, and corrects only what fails a hard rule. Every correction is listed in §1.2.

**The definition:** `wt/web-design/vibes/defs/navy.js`. **The icon set:** `wt/web-design/vibes/icons/navy.js`. Neither is registered: the orchestrator adds them to `index.js` VIBES and to the engines' `DEFS` / `ICON_SETS`.

**How every number here was produced.** Scripts under `~/dev/vibes-night/tools/navy-spec/`, run tonight on the finished definition:
- `check.mjs` covers the contract shape, contrast, colour vision and the Tailwind guard. It ends **54/55**, and its full output is `check-out.md`. The one failure is its SHIP GATE E3 line, red by design until ask E3 lands (§3.3); every other check passes. Ratios are floored to two places.
- `cssgen.mjs` runs the real `tools-check/vibes-css.mjs` in a scratch copy with Navy registered. It passes 19/19 and writes the generated `:root[data-vibe="navy"]` block to `scratch-web/vibes/navy.css`.
- `contract-probe.mjs` runs the real `tools-check/vibes-contract.mjs` with Navy registered (see §15, finding F1).
- Font numbers come from `tools/t5-check.mjs` and `navy-spec/woff2check.mjs`, run on the files concept A built (`tools/navyA/fonts/`). Their sha256 was re-hashed tonight and matches.

---

## 0. At a glance

| | |
|---|---|
| **Idea** | Rack at night on the interstate. A deep navy ground and warm-white legends, with every word and figure set in Overpass, the open-source cut of the US highway-sign alphabet. One pale pistachio mark does the accent's one job. |
| **Registry entry** | `{ id: 'navy', name: 'Navy', feel: 'Deep navy ground, pale ink.', experimental: false, scheme: 'dark' }`. The feel line is 27 characters (limit 28) and has no "·". |
| **Ground / card / ink / accent** | `#0a183b` / `#0f223f` / `#f4f0e8` / pistachio `#acdc9c` |
| **Face** | Overpass (OFL 1.1, no RFN) for everything. Archivo on v1's metrics stays on the five measured surfaces, the Coach card among them. That makes two families. |
| **Web font** | One variable woff2 (`wght` 100–900), 44,540 B. The picker digits are a separate 6,516 B file. |
| **Native fonts** | Four static TTFs (400 / 600 / 700 / 800; the ExtraBold is the picker face), 168,216 B latin |
| **Looks** | `card · flat`, `youCard · flat`, `coachCard · flat`, `statRow · line`, `kpi · plain`, `field · square`, `addTile · flat`. The other 22 blocks are v1. |
| **Contrast** | Every text ink is 4.5:1 or better on every surface it sits on. There are three exceptions: <br>• `dim` on `raised` is exactly 4.50, on large-text sites only. <br>• The first frame of the 600 ms tick flash, which v1 also has and does worse. <br>• **Ship blocker:** the lit add tile's 8.5 px tag passes only once ask E3 lands (6.57 on `raised`). In v1's geometry it is 2.09. **If E3 does not land, Navy cannot ship** (§3.3). |
| **Colour vision** | Worst muscle-group pair **13.2** ΔE00 (v1 10.9). Good against bad **20.2** under deuteranopia (v1 10.9). |
| **Guard** | Ground 5.19 and card 5.09 from `blue-950`, accent 8.28 from `green-300`. That clears all 242 Tailwind v3 defaults. |

---

## 1. The idea, and where it came from

### 1.1 The idea
- **Ground: a night sky over the road.** Chromatic navy (OKLCH C 0.07), not a stock grey. The ground itself carries colour, and the ink is warm, not neutral. That is what separates Navy from v1's graphite and from the "tinted near-black + one saturated accent" cluster [T1 N1].
- **Ink: the retroreflective legend.** Warm white `#f4f0e8`, with blue-grey `#b3bfd6` for labels and `#8f9eb9` for tertiary text [T4 GF5 `navy-r2`].
- **Accent: one pale mark.** Pistachio `#acdc9c` is pale (L\* 83) and matte (OKLCH C 0.10). It sits 27.7 ΔE00 from v1's yellow. A gold would sit 6.5 away and read as "v1 on blue" [C4].
- **Face: a highway alphabet.** Overpass's letterforms are "an interpretation of the well-known 'Highway Gothic' letterforms from the Standard Alphabets for Traffic Control Devices published by the U.S. Federal Highway Administration" (google/fonts `ofl/overpass/DESCRIPTION.en_us.html`, on disk). It is a face built to be read at a glance, at distance and in bad light, which is how a set is read from the bench [T5 §5.1]. It has → ↑ ↓ ↳ − ≈ × ± ÷, so no delta or arrowed string ever has to leave it.
- **Shape: road-sign blanks.** Cards are filled panels with no border and radius 10. Fields are square write-in plates with a 3:1 edge. Nothing else changes shape.
- **The face is the only reference to the road.** There are no route shields, reflective stripes or lane markings (never-do 19).

### 1.2 Where it came from, and what this spec changed
- **Research:** SYNTHESIS §5.2 S2-a (`navy-r2` × Overpass, pistachio accent), from PLAN §3.3 angle 1.
- **The concept:** `design/navy/concept-A.md`, adopted in full. Its palette, face, type presets, radius, looks, contrast and colour-vision work, fonts, icons, never-do list and asks all stand, except for the corrections below.

**Corrections** (each fixes a hard rule, or a statement that did not match the code):

| # | Concept A | This spec | Why |
|---|---|---|---|
| C1 | `lead`, `shape.callout` and `pick` as keys in the definition | Named as asks E1, E2 and E7 (§15). The definition holds only v1.js's key paths. | PLAN §2 rule 15: roles v1.js lacks are named as requests, never as invented keys |
| C2 | `reviewBorder` `{ knurl, a: 1 }`, relying on E2 | `{ knurl, a: 0 }`. With E2 it becomes `a: 1`. | Without E2 the engine draws `reviewBorder` on all four sides, which is exactly the keyline the concept forbids. The concept's own fallback says `a: 0`. |
| C3 | `dockLbl` 11 pt | **12 pt** | R5.1 / PLAN rule 8: labels are 12–13 pt and up. "Weight" is 38.0 px at 12, in a cell of at least 64. |
| C4 | `segBtn` weight 700 | **600** | R5.1: labels weigh 500–600, and the concept itself counts segments as labels. The chosen segment is told by inversion, not weight. |
| C5 | `banner` text `#ffffff` | `devText` / `guardText` navy, `guardNote` `#000000` | White on Navy's coral is 2.6:1 and on its sea green 2.2:1. Navy text gives 6.52 / 7.95. The guard's note is drawn at opacity .75 (`app/_layout.jsx:93`), so navy would be 4.49; black gives 5.60. The concept missed these native banners. |
| C6 | "W / F / D badges bare on `raised`: 9.41 / 4.56 / 4.91" | The badges sit bare **on the row**: 12.29 / 5.95 / 6.40 on a card, 10.26 / 4.97 / 5.34 on a done row | The tag wash *replaces* the badge's raised fill (rack.css `.set-idx.t-W`, native `SetTypeBadge` TINT), so at `a: 0` the letter has no box. Numbered badges keep `raised`. Still no wash; the numbers are corrected. |
| C7 | `icons: 'navy'` or a shared set | `icons: 'navy'`, and `vibes/icons/navy.js` written. If the orchestrator makes one shared simple set (E6), this one string changes. | `iconIn()` falls back per name to v1, so a per-vibe set holding only `spark` is enough. PLAN rule 14 applies (SYNTHESIS finding 6). |
| C8 | `chrome`, `signIn`, `banner`: "v1's, 6-digit" | Written out in full | This fills in what the draft left as comments. |

---

## 2. Colour: every role

### 2.1 `colors`: all 43 keys

| Role | Navy | v1 | Job and check |
|---|---|---|---|
| `rack` | `#0a183b` | `#14161a` | The page. 5.19 from `blue-950`. |
| `bar` | `#0f223f` | `#1c1f26` | Cards, sheets, fields. 1.09:1 off the page, ΔE00 4.4 (v1's step is 3.4). |
| `well` | `#0a183b` | `#14161a` | The recess inside a card. It equals the page, as in v1. |
| `raised` | `#1d3463` | `#262a33` | The plain button, peek bar, rest pill, a numbered set badge, a chosen option, the Coach bubble. 1.30:1 off a card. |
| `track` | `#1d3463` | `#262a33` | A meter's empty part. Every plate fill is 3:1 or more on it (worst 4.56). |
| `grip` | `#6a80bb` | `#333844` | The grab handle (4.10 on the sheet; R8.5 asks 3), a toggle's off track (4.48), trajectory dots |
| `collar` | `#1d3463` | `#262a33` | Decorative hairlines only (1.30 on a card), never a control's only edge |
| `knurl` | `#6a80bb` | `#333844` | The control edge: 4.48 on the page and the well, 4.10 on a card (v1 1.54 / 1.40) |
| `chalk` | `#f4f0e8` | `#f2f0eb` | Body, headings, values |
| `steel` | `#b3bfd6` | `#8d939f` | Every label, and secondary text |
| `dim` | `#8f9eb9` | `#5c6270` | Tertiary text: 5.87 on a card (v1 2.69) |
| `faint` | `#8f9eb9` | `#333844` | = dim, so there is no fourth grey |
| `pRed` | `#ff7452` | `#d6252b` | chest, protein, gain. 5.95 as text on a card. |
| `pBlue` | `#66a6ff` | `#2e7fd9` | back, fat, water, training, cut, drop sets. 6.40. |
| `pYellow` | `#ffe16b` | `#f0be1e` | legs, carbs, the fuel and weight subject, maintain. Lemon, 9.5 ΔE00 from v1's gold. 12.29. |
| `pGreen` | `#3cc4a0` | `#2aa85c` | shoulders, steps. 7.26. |
| `pWhite` | `#eee9df` | `#e8e5de` | arms, the steps subject. 13.13. |
| `pChrome` | `#a9b4c6` | `#a8aeb8` | core. 7.59. |
| `good` | `#3cc4a0` | `#2aa85c` | = pGreen, as in v1 (HUE_NAMED green: h 164.1) |
| `warn` | `#ffe16b` | `#f0be1e` | = pYellow (HUE_NAMED amber: h 47.8) |
| `bad` | `#ff7452` | `#d6252b` | = pRed (HUE_NAMED red: h 11.8) |
| `onYellow` | `#0a183b` | `#141414` | Alias → onAccent |
| `onGreen` | `#0a183b` | `#0d1a11` | Alias → onDone |
| `onPlate` | `#0a183b` | `#14161a` | 6.52 (chest) to 14.38 (arms) |
| `white` | `#0a183b` | `#ffffff` | Alias → onDanger |
| `pYellowPressed` | `#9bca8b` | `#d9a90f` | Alias → accentPressed |
| `fallback` | `#b3bfd6` | `#8d939f` | Alias → groups.fallback = steel |
| `accent` | `#acdc9c` | `#f0be1e` | The primary action, focus, today, the dock mark, Coach's voice. Text 11.16 on the page, 10.19 on a card. |
| `focus` | `#acdc9c` | `#f0be1e` | The ring: 11.16 / 10.19. The water preset input keeps pBlue (ROLES `except`). |
| `accentPressed` | `#9bca8b` | `#d9a90f` | Navy on it is 9.29 |
| `onAccent` | `#0a183b` | `#141414` | 11.16 on the accent |
| `danger` | `#ff7452` | `#d6252b` | 5.95 as text on a card |
| `onDanger` | `#0a183b` | `{web:'#fff', native:'#ffffff'}` | 6.52. One 6-digit value: only v1 keeps the split spelling. |
| `done` | `#3cc4a0` | `#2aa85c` | A set done, its tick, the rest line |
| `onDone` | `#0a183b` | `#0d1a11` | The ✓: 7.95 |
| `knockout` | `#0a183b` | `#14161a` | 15.31 on inverse |
| `inverse` | `#f4f0e8` | `#f2f0eb` | Chosen chip or segment, the toast |
| `calMark` | `#f4f0e8` | `#f2f0eb` | "The white head" (HUE_NAMED white): 10.71 on the track |
| `onWarn` | `#0a183b` | `#141414` | The native trial banner: 13.45 |
| `shade` | `#000000` | `#000000` | Shadows and the sheet backdrop |
| `lift` | `#ffffff` | `#ffffff` | The pressed-row wash |
| `tileHero`, `tileLit` | `#0a183b` | `#1e1f1e`, `#17181a` | Native flat add tiles. `addTile · flat` draws no washes, so both equal the well. |

`themeColor` is `#0a183b`. The fixed roles (`chrome.launch`, `manifestTheme`, `webStatusBar`, `appearance`) keep v1's values.

### 2.2 `alpha`
v1's mapping: yellow → pYellow, red → pRed, blue → pBlue, green → pGreen, ground → rack, accent → accent, danger → danger, warn → warn.

### 2.3 `tint`: all 28
Each is a role at an alpha, with no legacy `exact` spelling. The flattened values below are over a card or over the page.

| Tint | Role, α | Flattened | Why it moved from v1 |
|---|---|---|---|
| `setDone` | done .10 | `#143249` | Was .07. A done row now reads from the bench. Chalk 11.67, steel 7.16, dim 4.90 on it. |
| `setFlash` | accent .28 | `#3b5659` | v1's alpha. It is the first frame of a 600 ms keyframe (§3.4). |
| `tagW` / `tagF` / `tagD` | pYellow / pRed / pBlue **0** | none | No tag washes (C6) |
| `dropRail` / `dropAdd` | pBlue **.70** | `#4c7ec5` | Were .45 / .35. At .70 they are real 3:1 graphics (3.85; v1's are 1.82 / 1.58). |
| `pickSel` | accent .08 | `#1c3146` | Chalk 11.71 on it |
| `block` | accent .03 | `#142842` | The pistachio block title is 9.54 on it |
| `coachBase` / `coachLow` / `coachHigh` | accent .14 / .07 / .38 | pulse | The coach set-check. No text is drawn on it (§3.4). |
| `rowPress` | lift .04 | `#192b47` | Chalk 12.50 |
| `pillBase` / `pillUp` / `pillDown` / `pillWarn` | **0** | none | No delta pills (R6.6). Deltas are bare signed Overpass with their arrow. |
| `zoneCut` / `zoneHold` / `zoneGain` | pBlue .16 / pYellow .18 / pRed .16 | over the track | The white head on them: 8.17 / 6.88 / 8.87 |
| `dockGlass` | rack .82 | glass | Glass stays on the dock (R7.2). The mark on it is 11.16. |
| `wkBarGlass` | rack .90 | glass | Glass stays on the live bar |
| `backdrop` | shade .60 | `#040a18` | The sheet stands 1.24:1 off it, plus its knurl top edge |
| `trajGood` / `trajWarn` / `trajBad` | good / warn / bad .18 | halo | v1's |
| `reviewBg` | accent **0** | none | "Next week" loses its box-in-a-box (N9) |
| `reviewBorder` | knurl **0** | none | Becomes `a: 1` when E2 lets the engine draw only the top rule (C2) |

### 2.4 Tables
| Table | Navy |
|---|---|
| `groups` (lower case) | chest `#ff7452`, back `#66a6ff`, legs `#ffe16b`, shoulders `#3cc4a0`, arms `#eee9df`, core `#a9b4c6`, fallback `#b3bfd6` |
| `groupPlates` (UPPER CASE) | `#FF7452`, `#66A6FF`, `#FFE16B`, `#3CC4A0`, `#EEE9DF`, `#A9B4C6` |
| `plates` (45 → 2.5 lb) | `#ff7452`, `#66a6ff`, `#ffe16b`, `#3cc4a0`, `#eee9df`, `#a9b4c6` |
| `importGroups`, `mark`, `subjects`, `admin`, `conf` | v1's roles, unchanged |
| `kpi` | every alpha **0** (`kpi · plain`: no corner glow by any path) |

All three hex tables follow their roles (checked).

---

## 3. Contrast

WCAG 2.x throughout. Tints are composited in gamma sRGB, the way CSS and React Native blend them, and every ratio is floored. Text needs 4.5:1; large text (18 pt, or 14 pt bold), control edges and graphics need 3:1.

### 3.1 Every text ink on every surface (from `check.mjs`)

| Ink | page | card | well | raised | done row | picked | block | pressed | dock / live-bar glass |
|---|---|---|---|---|---|---|---|---|---|
| chalk | 15.31 | 13.98 | 15.31 | 10.71 | 11.67 | 11.71 | 13.08 | 12.50 | 15.31 |
| steel | 9.39 | 8.58 | 9.39 | 6.57 | 7.16 | 7.19 | 8.03 | 7.67 | 9.39 |
| dim = faint | 6.43 | 5.87 | 6.43 | **4.50** | 4.90 | 4.91 | 5.49 | 5.25 | 6.43 |
| accent | 11.16 | 10.19 | 11.16 | 7.81 | 8.51 | 8.54 | 9.54 | 9.11 | 11.16 |
| good = pGreen | 7.95 | 7.26 | 7.95 | 5.56 | 6.06 | 6.08 | 6.79 | 6.49 | 7.95 |
| warn = pYellow | 13.45 | 12.29 | 13.45 | 9.41 | 10.26 | 10.29 | 11.49 | 10.98 | 13.45 |
| bad = pRed | 6.52 | 5.95 | 6.52 | 4.56 | 4.97 | 4.99 | 5.57 | 5.32 | 6.52 |
| pBlue | 7.01 | 6.40 | 7.01 | 4.91 | 5.34 | 5.36 | 5.99 | 5.72 | 7.01 |
| pWhite | 14.38 | 13.13 | 14.38 | 10.06 | 10.96 | 11.00 | 12.29 | 11.74 | 14.38 |
| pChrome | 8.31 | 7.59 | 8.31 | 5.81 | 6.33 | 6.36 | 7.10 | 6.78 | 8.31 |

- "Picked" is `pickSel` over a card (over the page it is higher). "Pressed" is `rowPress` over a card.
- **`dim` on `raised` = 4.50** meets 4.5 at the floor. Rack spends dim on raised only on large text (`.st-flame` 21 px / 800, the photo placeholder at 18 px), where 3 is needed.

### 3.2 Inks on fills, and graphics
- **Inks on fills** (4.5 needed):
  - onAccent on the accent 11.16 (v1 10.60), and on pressed 9.29.
  - knockout on inverse 15.31.
  - knockout on the accent (the hero tile's tag) 11.16.
  - onDanger on danger 6.52 (v1 5.04).
  - onWarn on warn 13.45.
  - onPlate on the six plates: 6.52 / 7.01 / 13.45 / 7.95 / 14.38 / 8.31 (v1's chest is 3.58).
  - chalk on raised (the plain button) 10.71.
  - steel on raised (a set number) 6.57.
  - warn on the web trial bar's wash 10.24.
  - The ✓ on done 7.95 (3 needed).
- **Set badges** (bare on the row, C6):
  - W 12.29 / 10.26, F 5.95 / 4.97, D 6.40 / 5.34 (card / done row).
  - v1's F is 2.93 / 2.73.
- **Native banners** (C5):
  - guard text on coral 6.52.
  - the guard note at .75: 5.60.
  - dev text on sea green 7.95, and on coral 6.52.
- **Graphics** (3 needed):
  - knurl 4.48 / 4.10 / 4.48 on page / card / well.
  - The grab handle 4.10 (v1 1.40), and a toggle's off track 4.48.
  - chalk on grip (the toggle knob) 3.41. Under E3 the lit tile's icon moves to `raised`: 10.71.
  - focus 11.16 / 10.19, and the dock mark over its glass 11.16.
  - The drop rail and + Drop edge 3.85.
  - Plate fills on the track 4.56–10.06. done and danger on the track 5.56 / 4.56.
  - The white head on the track 10.71, and over the zones 6.88–8.87.
  - The heat strip: pale yellow day against collar day, 9.41.
  - Line 2 (chalk) 13.98. The dimmed spark line 5.87.
  - The Wins and Improve top rules 7.26 / 12.29.
- **Decorative, reported only** (ΔE00 in brackets):
  - collar on a card 1.30 (7.3), on the page 1.42.
  - Card off the page 1.09 (4.4; v1 3.4).
  - raised off a card 1.30.
  - The sheet off the dimmed page 1.24.
- **v1 pairs a vibe may not make worse:** all improve.
  - dim on a card 2.69 → 5.87.
  - collar on a card 1.14 → 1.30.
  - The grab handle 1.40 → 4.10.
  - pRed on a card 3.26 → 5.95.

### 3.3 Ship blocker: the lit add tile's tag (ask E3 must land first)
- **The failure:** `.add-tile.lit .tag` is steel on `grip` (rack.css:1694; native `AddTile` in `src/ui/food/common.jsx` does the same), 8.5 px text in v1's geometry. In Navy that is **2.09:1**. v1's own pair is 3.80, which also fails, so in that geometry Navy makes a failing v1 pair worse, which §13.1 does not allow.
- **No token can fix it.** The grab handle needs grip ≥ 3:1 against the sheet (4.10 today), which means relative luminance ≥ 0.147. Light steel at 4.5:1 needs grip ≤ 0.075. No single `grip` can do both.
- **The fix belongs to the look, not the vibe.** Ask **E3**: `addTile · flat` draws the lit tiles' icon well and tag on `raised`, not `grip`: steel on it **6.57**, chalk **10.71**. It lands in the orchestrator's shared files, on web and native, and `vocab.js`'s `addTile · flat` look (line 689) says so. It is wording for the shared look, not a Navy special case, and Chalk relies on the same change.
- **E3 is a precondition of the Navy commit.** The order is: E3 lands (vocab.js line 689, the web `.add-tile.lit` rules under the flat look, native `AddTile` under the flat look), then Navy is committed. `tools/navy-spec/check.mjs` holds this as its **SHIP GATE E3** line, which reads the look's wording from `vocab.js` and fails until it names `raised` for the lit tiles. Today it fails (54/55), by design.
- **If E3 does not land, Navy cannot ship.** No fallback exists: `addTile: 'v1'` keeps the same steel-on-grip tag at 2.09, and no Navy `grip` fixes it (above). The orchestrator either lands E3 or holds Navy back and logs it.

### 3.4 Pairs under 4.5 that are not failures
- **The tick flash's first frame** (`setFlash`, accent .28 over a card):
  - It is the start of a 600 ms keyframe that eases into `setDone`, on the row itself. That puts the e1RM (dim) at 2.91 (v1 1.39), the bare F / D letters at 2.95 / 3.18 (v1 1.68 / 2.09), and steel at 4.26 (v1 2.76).
  - The flash is v1's, at v1's alpha, and every pair drawn on it is better than v1's (checked). pChrome and pWhite are not drawn in a set row.
  - Dropping the flash to about .08 would pass everything but leave no flash. Changing motion is not a simple vibe's job.
- **The coach set-check's pulse peak** (`coachHigh`):
  - No text or glyph is drawn on it (rack.css `.set-check.coach`: "Nothing draws a ✓").
  - Its pistachio edge is a graphic: 3.85 against the fill (v1 3.81), and 10.19 against the card.

### 3.5 Native sign-in (information)
- Native has no device key, so sign-in is drawn before any account's vibe is known. Navy keeps v1's sign-in palette, in 6 digits.
- On the navy page (if it ever shows there): sub / label / link 5.54, error 6.27, ok 9.15.

---

## 4. Colour vision

Machado 2009 at severity 1.0, in linear RGB, with CIEDE2000.

| Vision | Worst group pair | Next | v1 worst |
|---|---|---|---|
| Normal | back / core **15.8** | arms / core 19.2, legs / arms 22.2 | 16.4 |
| Deuteranopia | shoulders / core **13.9** | chest / legs 15.3, shoulders / arms 15.8 | **10.9** |
| Protanopia | shoulders / arms **13.2** | back / core 15.6, chest / shoulders 16.7 | 15.2 |
| Tritanopia (information) | back / shoulders 9.4 | legs / arms 11.8 | 12.0 |

- **The gate:** the minimum across normal, deuteranopia and protanopia is **13.2** ΔE00. The gate asks 12.
- **Good against bad:**

  | | Navy | v1 |
  |---|---|---|
  | Normal | 59.9 | 71.8 |
  | Deuteranopia | **20.2** | 10.9 |
  | Protanopia | 16.7 | 27.2 |

  Warn against bad is 39.9 / 15.3 / 24.3; good against warn 34.9 / 27.1 / 20.4.
- **The accent against data and status:**
  - In normal vision the nearest is 15.9 (pGreen, good, done). The gate (R2.4) asks 10.
  - Under deuteranopia the nearest is 13.0 (pRed); under protanopia 10.8 (pYellow). Both are for information.
  - Pistachio against sea-green "good": L\* 83.1 against 71.5.
  - The two never have to be told apart by hue alone:
    - the accent is always a fill carrying words, or a thin mark;
    - done always has its ✓;
    - good always has its arrow, or sits beside "Going well".
- **Up and down never rely on red against green alone:** every delta keeps its sign and its ↑ ↓ →, and Overpass has all three.

## 5. The Tailwind guard (R2.7)
All 242 v3 defaults are checked. The gate is 5 ΔE00 for the accent, focus, the accent's ink and the chromatic grounds.

| Role | v3 nearest | v4 nearest (information) |
|---|---|---|
| `rack` / `onAccent` `#0a183b` | `blue-950` 5.19 | `blue-950` 5.40 |
| `bar` `#0f223f` | `blue-950` 5.09 | **`slate-800` 4.25**. If Micah makes v4 bind (Q-P5), `bar` moves to `#041f3e` and E1 becomes required. |
| `accent` / `focus` `#acdc9c` | `green-300` 8.28 | `green-200` 9.23 |
| `accentPressed` (reported) | `green-300` 10.56 | `green-300` 11.35 |

The margins against `blue-950` are thin (0.09 and 0.19 above the gate), so **any hex move re-runs the guard**. Distance to the lineup: ground 14.4 ΔE00 from v1's, accent 27.7 (15.6 under deuteranopia, 14.8 under protanopia).

---

## 6. Type

### 6.1 Faces
| Face | Sets |
|---|---|
| **Overpass** | Every word and figure outside the measured surfaces: headings, the greeting, labels, buttons, chips, segments, the dock, notes, rows, body, every figure preset, every delta and arrowed string |
| **Archivo on v1's metrics** | The five measured surfaces: the Coach card, the goal chips, the recap's feel chips, the estimate row, the movement chips |

- **Why the Coach card keeps Archivo** (measured by concept A with HarfBuzz):
  - Overpass SemiBold / Regular run up to 4.3 % wider on real Coach lines.
  - Its line ratio of 1.266 is taller than two of the card's fixed line heights: the greeting (1.20) and the chevron row (1.125).
  - Keeping Archivo costs 0 bytes and keeps the fit v1 proved.
- **On native**, this is automatic: Navy hands in no `fit` table, so `MEASURED_FACE` draws those surfaces in Archivo.
- **On the web**, `vibes/navy.css` sets `font-family: 'Archivo', system-ui, -apple-system, sans-serif` on `.coach-card`, `.coach-goal-opt`, `.feel-grid .coach-chip`, `.move-opt` and the estimate row.
- **Two families** (R4.1). Overpass ships in no other vibe (PLAN rule 7).

### 6.2 Every preset (`type`)
Overpass has no width axis, so `wdth` is 100 everywhere. **No preset is caps.** Labels are sentence case as authored, 12–13 pt at 600 (R5.1).

| Preset | Navy | v1 | Ink |
|---|---|---|---|
| `body` | 15 / 400, lh 1.45 | 15 / 400 | chalk |
| `h1` | **24** / 800, ls −.01 | 26 / wdth 78 / 800 | chalk |
| `h2` | 18 / 800, ls −.01 | 18 / 78 / 800 | chalk |
| `h3` | **16** / 800, ls −.01 | 15 / 78 / 800 | chalk |
| `eyebrow` | **13 / 600, sentence case**, ls 0 | 10 / 88 / 700, caps .16 | **steel** |
| `fieldLbl` | 13 / 600, sentence case | 10 / 700 caps | steel |
| `statLbl` | 12 / 600, sentence case | 9 / 700 caps | steel |
| `dockLbl` | **12** / 600, sentence case (C3) | 10 / 600 caps | dim (active: chalk) |
| `segBtn` | 12 / **600**, sentence case (C4) | 11 / 700 caps | steel (chosen: knockout) |
| `chip` | 12 / 600 | 11 / 600 | steel |
| `note` | 13 / 400, lh 1.5 | 12 / 400 | dim |
| `btn` | 14 / 700, ls 0 | 14 / 700, ls .02 | chalk |
| `btnLg` | 16 / 700, sentence case, ls 0 | 16 / 700, caps .06 | the button kind's |
| `youGreet` | 26 / 800, ls −.01, lh 1.1 | 27 / 800, ls −.02, lh 1.05 | chalk |
| `statVal` | 20 / 800, lh 1, tnum | 20 / wdth 108 / 800 | the caller's |
| `kpiVal` | 22 / 800, ls −.01, lh 1, tnum | 22 / 108 / 800 | chalk |
| `timer` | 22 / 800, ls 0, tnum | 22 / 112 / 800 | chalk |
| `headline` | 34 / 800, ls −.01, lh 1, tnum | 34 / 112 / 800 | chalk |
| `setInput` | 15 / 700, tnum | 15 / 700 | chalk |
| `mono` | 12 (Menlo / monospace, v1's) | same | chalk |
| `loadNum` | 800, ls 0, lh .95, tnum | wdth 118 / 800, ls −.02 | the caller's |

- **The one numeral treatment:** Overpass ExtraBold tabular figures, the exit number on a sign, at every hero size.
  - They are about 15 % narrower than v1's wdth-118 stamp: "191.8" at 34 is 92.2 px against 103.3.
  - So no figure overflows where v1's fitted.
- **Literal sites** (VOCAB §8.1) keep v1's size and case and change only face.
  - Five are tracked caps in v1: ChartSub, the mini-stat labels, HeadlineU's unit line ("LB / WEEK DOWN"), the add-tile tag and the FAB's "LOG FOOD".
  - They stay caps until ask E5 points them at presets. `'COACH ME'` is authored in caps and stays so.

### 6.3 Fit (concept A, HarfBuzz, kerning on)

| Role | String | Navy px | v1 web px | Room at 320 |
|---|---|---|---|---|
| h1 | September 2026 | 190.0 at 24 | 168.9 | about 200: **tight** (at 26 it would be 205.8) |
| Greeting | Good afternoon, | 197.5 | 211.5 | narrower |
| Sheet h2 | Where this comes from | 194.1 | 162.3 | about 288 |
| Eyebrow | Against last week | 105.4 | 123.0 | about 200 |
| Stat label | At this pace | 65.9 | 65.6 | about 80 (may wrap; VOCAB allows it) |
| Dock label | Weight | **38.0 at 12** | 40.7 | about 64 |
| Large button | Start workout | 102.6 | 144.2 | about 256 |
| Chip | Upper body | 64.1 | 54.5 | the row scrolls |
| FAB | LOG FOOD (literal caps) | 69.4 | 80.5 | about 200 |

- **Line metrics:** UPM 2000, hhea 1766 / −766 / 0, so **`minLh` = 1.266** (Archivo 1.088). Cap height 0.700, x-height 0.511.
- **Heights, not order, change.** On native, single lines floor at 1.266× their size:
  - a dock label is 15.2 pt tall against v1's 10.9;
  - a segment 15.2 against 12.0.
  - Every fixed box goes on Q's fit list (§15 risk 4).

### 6.4 Glyphs
| Face | Lacks (measured on the shipped files) |
|---|---|
| Overpass | ⚙ ✕ ⋯ ✓ (and ⚠ ✎ ▾ ▴, per concept A) |
| Archivo | ⋯ ✓ ✕ ↳ ⚙ ⚠ ✎ ▾ ▴ |

- Overpass is no worse than Archivo anywhere, and better by ↳ [R4.6]. It has −, ≈, ×, ÷, ± and the arrows.
- The missing glyphs fall back exactly as they do in v1. No glyph key is drawn.

---

## 7. Fonts: files, sources, licence

### 7.1 Web (`vibes/navy/`)

| File | Bytes | sha256 | Made from |
|---|---|---|---|
| `Overpass-latin.woff2` (built as `tools/navyA/fonts/navy-Overpass-latin.woff2`) | **44,540** | `d0c83ace8df921626817f8274a64a2343d9925629882c15339883226ce559021` | `Overpass[wght].ttf`, subset |
| `navy-num.woff2` (the picker's digits) | 6,516 | `a341a410f023983be74ff57ddb80c066d303d0e0575e81d8f00e73c1295d47af` | same, digits 0–9 only |
| `OFL.txt` | 4,392 | `86e5ff25c701ec446d20b1a85b02ee6d36de8503a7288a4c948f5459809af1f0` | google/fonts |

- **Source:**
  - The font is `https://raw.githubusercontent.com/google/fonts/main/ofl/overpass/Overpass%5Bwght%5D.ttf`: 318,700 B, sha256 `970717df17a7f9911dee45f60695d05bfa9d745fa0a11fc5c348371fa21f0073`, on disk at `research/fonts/overpass/`.
  - METADATA.pb gives its upstream as RedHatOfficial/Overpass commit `c580d28bfab7f39013568e684a65eeb23eff588d`, Version 4.000.
  - google/fonts `main` is not pinned, so re-check the sha256 on any refetch.
  - `OFL.txt` comes from `https://raw.githubusercontent.com/google/fonts/main/ofl/overpass/OFL.txt`.
- **Subset:**
  - `subset-font` 2.4.0 to Google's latin range (U+0020–00FF, 0131, 0152–0153, 02BB–02BC, 02C6, 02DA, 02DC, 0304, 0308, 0329, 2000–206F, 20AC, 2122, 2191, 2193, 2212, 2215, FEFF, FFFD) plus → ↳ ≈ × ÷ ±.
  - Every axis and feature is kept: `tools/navyA/subset.mjs`.
- **Verified tonight** (`woff2check.mjs`, on the woff2 itself):
  - axis **wght 100–900**, which reaches 800 (R4.4);
  - hhea 1766 / −766 / 0;
  - GSUB includes `tnum`. Default digits are proportional, so every figure preset sets `tnum`.
  - The tabular advance is 1232 / 2000 at 400, 600, 700 and 800 (concept A, HarfBuzz on the subset). The budget is 120 KB, and the file is 43.5 KB.
- **The `@font-face` rules** go in `vibes/navy.css`, under the vibes-css marker block:

  ```
  @font-face { font-family: 'Overpass'; src: url(navy/Overpass-latin.woff2) format('woff2');
               font-weight: 100 900; font-display: swap; }
  @font-face { font-family: 'navy-num'; src: url(navy/navy-num.woff2) format('woff2');
               font-weight: 100 900; font-display: block; }
  ```

  - Weight is set only through `font-variation-settings: 'wght' N`, with zero `font-weight` rules.
  - rack.css's own `'wdth' …, 'wght' …` settings keep working, because a missing axis is ignored.
- **`--font`** is `'Overpass', 'Archivo', system-ui, -apple-system, sans-serif`. Archivo stays loaded by rack.css line 1, for the measured surfaces.
- **Offline:** both woff2 files ship in the bundle and in the service worker's cache. Nothing is fetched at run time.

### 7.2 Native: four static TTFs (the ExtraBold is the picker face)

Downloaded through Google's css2 static route, both hosts on §14's list:
- `https://fonts.googleapis.com/css2?family=Overpass:wght@400;600;700;800` (UA `node`; the response is saved as `tools/navyA/fonts/css2-static.css`). It lists:
  - 400 `https://fonts.gstatic.com/s/overpass/v19/qFda35WCmI96Ajtm83upeyoaX6QPnlo6_PPrOQ.ttf`
  - 600 `https://fonts.gstatic.com/s/overpass/v19/qFda35WCmI96Ajtm83upeyoaX6QPnlo6IvTrOQ.ttf`
  - 700 `https://fonts.gstatic.com/s/overpass/v19/qFda35WCmI96Ajtm83upeyoaX6QPnlo6G_TrOQ.ttf`
  - 800 `https://fonts.gstatic.com/s/overpass/v19/qFda35WCmI96Ajtm83upeyoaX6QPnlo6fPTrOQ.ttf`
- Each file is latin-subset with `subset-font` 2.4.0, the same range as the web. There is no instancing, and names and features are untouched.
- Re-checked tonight with `tools/t5-check.mjs`:

| Ship as | Key | Latin bytes | Latin sha256 | Full file bytes / sha256 | PostScript | wClass | tnum |
|---|---|---|---|---|---|---|---|
| `Overpass-Regular.ttf` | `Overpass_400` | 41,948 | `1c2e5fff46ca28a69266e1d4aa801065bff7748099b252d7dfaae48fc3b4ee54` | 164,136 / `bf262ab6f1e241f1942963655b32f5dadbf309e4be8930607f5cbf20ce8a7863` | `Overpass-Regular` | 400 | 1232 |
| `Overpass-SemiBold.ttf` | `Overpass_600` | 42,040 | `b2aa8a6cf5c618d362d85f0651b751ebe69fdcb8ed1588c8a3f73f957e94b7fa` | 164,012 / `da55b4868f78018727b87cd3668bb6fd52b62dd28813a47a53d856568347039d` | `Overpass-SemiBold` | 600 | 1232 |
| `Overpass-Bold.ttf` | `Overpass_700` | 42,016 | `2b71f457f8ba05f054e2cf811602bb7d9843f7668fb5ee7c0803385e8f1891cc` | 164,488 / `601f5c9bfabd52718bd1c6da7364514978e5bdea78be6ffbc53f4968e9cddeb4` | `Overpass-Bold` | 700 | 1232 |
| `Overpass-ExtraBold.ttf` (**picker face**) | `Overpass_800` | 42,212 | `f45688a9aa839e12e90da86997decc2bf79a8f8de4f77156c2a754bb5122d6fe` | 163,916 / `98ff76691082c5c44dcb00542fed7e4cc64cc5dd6d7f757ce9329f66d3d8bef7` | `Overpass-ExtraBold` | 800 | 1232 |

- **Total** 168,216 B (the whole-native budget is 6 MB).
- **PostScript names** are unique, Google's own instances, and unlike Archivo's four.
- **GSUB:** `calt ccmp dnom frac liga locl numr pnum tnum`.
- **What each preset resolves to:** `face.snap` `{650: 700, 750: 800}`, step 100. Every weight v1's sites ask for resolves to one of the four keys, and the Navy presets use only 400, 600, 700 and 800.
- **The upstream alternative** (Q-Q3):
  - RedHatOfficial statics at `https://github.com/RedHatOfficial/Overpass/raw/HEAD/fonts/ttf/Overpass-{Regular,SemiBold,Bold,ExtraBold}.ttf`, commit `c580d28bfab7f39013568e684a65eeb23eff588d`.
  - Only the ExtraBold was downloaded and checked: sha256 prefix `3b62903f98da7246`, and tnum passes.
  - The css2 files avoid the question.

### 7.3 Licence
- SIL Open Font License 1.1. METADATA.pb says `license: "OFL"`.
- **Copyright line:** "Copyright 2021 The Overpass Project Authors (https://github.com/RedHatOfficial/Overpass)". It is the same in the google/fonts and upstream OFL.txt.
- **Reserved Font Name: none.** Neither OFL.txt header names one, so subsetting under the family's own name is allowed [T5 rule 11].
- Ship `OFL.txt` beside the woff2 files and beside the TTFs. The Licences row (Phase F) becomes mandatory once any new font is committed.
- **`FONTS.json` draft:**
  - family "Overpass";
  - the six files above with their sha256;
  - version "4.000 (Google Fonts v19; RedHatOfficial c580d28)";
  - sources: the css2 request, the four gstatic files, google/fonts `ofl/overpass/Overpass[wght].ttf` and `OFL.txt`;
  - licence "OFL-1.1", RFN "none", the copyright line above;
  - tool "subset-font 2.4.0".

---

## 8. Shape tokens, shadows, scrims, chrome

**Radius** (px on the web, pt on native):

| Token | Navy | v1 | Where |
|---|---|---|---|
| `r` | **10** | 12 | Cards, the exercise card, the Coach card (the radius does not change its fit), the peek bar |
| `sm` | **6** | 8 | Buttons, KPI recesses, set inputs, calendar cells, the set check |
| `sheet` | 18 | 18 | The platform sheet |
| `tile` | **8** | 10 | Add-tile icon wells |
| `pill` | 999 | 999 | Chips, segmented controls, the rest pill and the toast only (R6.5) |
| `plate` | 2 | 2 | Data marks, plate chips, **square fields** |
| `chip` | 3 | 3 | Add-tile tags (square under `addTile · flat`) |
| `mark` | 4 | 4 | |
| `idx` | **4** | 5 | Set badges |
| `round` / `hair` / `bubble` / `badge` | 50% / 1 / **12** / **8** | 50% / 1 / 14 / 9 | |

- **Borders:**
  - collar 1 px for decorative hairlines only;
  - knurl 1 px on control edges (fields, the rest pill, the peek bar, the sheet's top) and 1.5 px on the set check.
  - Cards have **no** border (`card · flat`, `coachCard · flat`).
  - Wins and Improve carry a **2 pt top border** in place of v1's side stripe (`youCard · flat`).
  - The exercise card keeps v1's 1 px collar edge, because `setTable` is v1 (risk 7).
- **Shadows:** v1's, unchanged, all in `shade` black. None is coloured and none glows.
- **Rings:** v1's roles. The Navy colours land through them: `kpiDay` knurl, `kpiToday` well + steel, `flame` accent .35, `tourLit` accent.
- **Scrims and glass** (v1's, and only v1's):
  - the sheet backdrop is black .60 + `blur(3px)`, with no `-webkit-` twin (fixed);
  - the dock is rack .82 + `blur(18px) saturate(140%)` (native BlurView 40, tint dark);
  - the live bar is rack .90 + `blur(16px)`;
  - the tour is a navy fog, rack .55 → .94 at 42 %. Native builds it from the stops, so there are no legacy strings.
- **Native chrome:** `statusBar` light, `keyboard` dark, `datePicker` dark, `blurTint` dark, `shadow` `#000000`, `camera` `#000000`, `systemFace` null.
- **Fixed at v1's values:** `appearance` dark, `launch` `#14161a`, `manifestTheme` `#14161a`, `webStatusBar` black-translucent. `colorScheme` is null.
- **Not needed, because Navy is dark:** the web status band. The installed PWA's white status text sits on the navy page at 15+:1.
- **Cold start:** native opens on v1's graphite launch screen (fixed) and turns navy once the account's vibe is read, a 14.4 ΔE00 shift. The web's device hint paints navy on the first frame.

---

## 9. Every block (`variants`, all 29 in `vocab.js`)

| Block | Look | What it draws in Navy |
|---|---|---|
| `card` | **flat** (shape) | A navy blank (`bar`) on the navy page, no border, radius 10, v1's padding. The head title is Overpass 13 / 600 steel in sentence case (eyebrow), meta in dim. |
| `youCard` | **flat** (shape) | As `card`. Wins and Improve lose the side stripe. A 2 pt top border in sea green `#3cc4a0` (7.26) or pale yellow `#ffe16b` (12.29) takes its place, and the titles still say which is which. |
| `eyebrow` | v1 | Type only: Overpass 13 / 600, sentence case, steel (8.58 on a card) |
| `sectionHeader` | v1 | "How you're doing" in the eyebrow role, with v1's collar hairline running on (1.42, decorative) |
| `screenHeader` | v1 | The eyebrow in steel over an Overpass 24 / 800 h1 in warm white. The nav buttons are unchanged (34, collar edge). |
| `sheetHost` | v1 | A navy sheet with 18 pt top corners and a periwinkle top edge. The grab handle is `grip` at 4.10. Black .60 backdrop + 3 px blur. |
| `sheetTitle` | v1 | Overpass 18 / 800, left |
| `statRow` | **line** (shape) | A box-score line: no tiles, no ground. Values in Overpass 20 / 800 tabular on one baseline, 1 pt collar rules between columns, 12 / 600 steel labels under them. |
| `kpi` | **plain** (shape) | The 2×2 recesses (`well`, collar edge, radius 6) with no corner tint. The delta is bare: signed, arrow first, Overpass 800 in good / bad / dim (7.95 / 6.52 / 6.43 on the recess), `pill*` at 0. Value 22 / 800 warm white. Lit spark bars in the subject colour, unlit in knurl (4.48). Today ringed in steel, chalk when done. |
| `headline` | v1 | Overpass ExtraBold figures at the sites' sizes, in their role (Fuel's zone colour, Weight's pale yellow) |
| `chip` | v1 | A pill, collar edge, Overpass 12 / 600 steel. **Chosen is inverted:** warm white with navy words (15.31). Chips that are 44 tall stay 44. |
| `segmented` | v1 | A pill track (`bar`, collar edge). Segments 12 / 600 sentence case, steel. The chosen one is warm white with navy words. |
| `btn` | v1 | Radius 6. **Primary:** pistachio, navy words (11.16). **Plain:** raised, warm-white words (10.71). **Ghost:** collar keyline, steel words (8.58; the text is its boundary, R2.2). **Danger:** coral keyline and words (5.95). Pressed .97, disabled .4. |
| `field` | **square** (shape) | A square write-in plate: radius 2, `bar` ground (`well` in a card), a **knurl** edge at 4.10 / 4.48 (v1's collar edge is 1.30). Focus turns it pistachio (10.19). The 13 / 600 steel label sits above. |
| `note` | v1 | Overpass 13 / 400, lh 1.5, dim (5.87) |
| `toast` | v1 | An inverted pill: warm white, navy words (15.31), v1's shadow |
| `settingsRow` | v1 | Full-width rows with collar rules between them. Label 14 / 600 warm white, value steel tabular, › in dim. Pressed: white .04. |
| `listRow` | v1 | Collar rules between rows. Name 600 warm white, the line under it dim, the value in Overpass 800 |
| `setTable` | v1 | The exercise card: `bar`, v1's 1 px collar edge, radius 10. The 4×30 group tag in its plate colour, the name Overpass 15 / 700. "Last …" in dim. Column heads in their v1 literal size, Overpass. A lifting block keeps its keyline over a pistachio .03 wash, its title pistachio (9.54). |
| `setRow` | v1 | A numbered badge on `raised` (radius 4), its number steel (6.57). **W / F / D stand bare on the row, with no box** (C6): 12.29 / 5.95 / 6.40, or 10.26 / 4.97 / 5.34 when done. Two recessed inputs (radius 6) with warm-white Overpass 15 / 700 values and dim placeholders. The check is 30×30 with a 1.5 pt knurl edge (4.10). **Done:** a sea-green fill with a navy ✓ (7.95) plus a sea-green .10 row wash. The flash is pistachio .28 into done. Drops hang on a blue rail at .70 (3.85). |
| `plateStrip` | v1 | "Per side", then chips on the six plate fills with navy Overpass 800 figures (6.52–14.38) |
| `calCell` | v1 | Navy cells (radius 6): raised when trained, with warm-white numbers (10.71); untrained numbers dim (5.87). **Today** in pistachio at 800 with a pistachio edge (10.19). Up to four plate bars. |
| `chart` | v1 | v1 geometry in Navy's inks: lines pale yellow (the pinned default), line 2 warm white, bars blue, tracks `#1d3463`, grids collar. Heat strip 9.41. The calorie meter's warm-white head 10.71. The area wash and end-dot glow are the pinned module's (risk 6). |
| `dock` | v1 | Navy glass under a collar rule. v1's 22 pt icons over Overpass 12 / 600 sentence-case labels, dim at rest (6.43 over the page), warm white when active, v1's 26×2 **pistachio mark** (11.16). The same tabs, in the same order and the same place. |
| `fab` | v1 | A pistachio pill with a navy + and "LOG FOOD" (literal caps until E5), v1's shadow. Pressed `#9bca8b` (9.29). |
| `addTile` | **flat** (shape) | No washes and no borders: every tile a recess on the sheet. The Photo tile is found by its pistachio icon well with a navy camera (11.16). Tags are square (radius 3). **Lit tiles' icon wells and tags go on `raised` (E3, §3.3): rack.css:1693–1694 and native `AddTile` must draw that under the flat look before Navy is committed.** An off tile keeps v1's dimming. |
| `sessionChrome` | v1 | Navy glass on the live bar under a collar rule. The session name in Overpass, the clock steel tabular (9.39), the Coach chip (38, collar edge, pistachio "COACH"), the calendar button (38), Finish as a pistachio primary. The rest line is sea green, then coral when over. The rest pill is raised with a periwinkle edge and a warm-white 800 time. The peek bar is raised, periwinkle-edged, radius 10. |
| `youHero` | v1 | A raised disc (52, round) with its initial in steel (6.57). The greeting in Overpass 26 / 800 warm white; the name stays pistachio until E4 lands, then warm white (R5.4). The gear 36 on `bar` with a collar edge. |
| `coachCard` | **flat** (shape) | `bar` with its 1 pt border in the card's own colour, radius 10, **190 / 164, padding 14, Archivo on v1's metrics**. A pistachio speech mark and "COACH" (10.19). Lines in warm white, the reason in steel, a caution in warn (12.29). "COACH ME" over a collar rule. No photo. |

**Containers** (R6.1, at least three):
1. **Card:** a filled blank, radius 10, no border.
2. **Group:** settings rows and list rows parted by collar rules, and the box-score line.
3. **Callout:** "Next week" loses its box. With E2 it gains a 2 pt knurl top rule; without E2 its pistachio head alone carries it.
4. **Sheet:** `bar` with a knurl top edge. It is the one role with both a fill and an edge.

With E1 there is a fifth, **lead**. There is no same-fill nesting: the KPI recesses are `well` (the page colour) inside `bar`.

---

## 10. Icons
- **The set:** `vibes/icons/navy.js`, `{ id: 'navy', icons: { spark } }`. Every other name falls back to v1's hand-drawn paths through `iconIn()`.
  - The orchestrator registers it in `vibe.js` `ICON_SETS` and in native.
  - **Without that registration the fallback is v1's sparkle**, so registering it is required.
- **`spark` is ≈, two strokes:** `icon(1.6, [path('M5 9.75c2.3-2.2 4.7-2.2 7 0s4.7 2.2 7 0'), path('M5 14.25c2.3-2.2 4.7-2.2 7 0s4.7 2.2 7 0')])`, round caps, no fill, on the 24 grid.
  - Rack marks an estimate with "≈", so the icon says "approximate", not "magic" (R8.8; never a star, sparkle, asterisk or bolt).
  - At the notice sites (web `food.js:1234`, `:1239`; native `common.jsx:948`) the stroke is fixed at 1.6. At 16 px that is a 1.07 px line. It is drawn in the site's own colour role.
  - These are the same bytes as Chalk concept C's `spark`, so one shared simple set (E6) is a free merge.
- **Glyphs:** no glyph key is drawn. ‹ › ✕ ⋯ ✓ ↳ ✎ ⚙ ⚠ ▾ ▴ render as in v1.

## 11. Images and textures
- **None.** `images: {}`. Photos are Iron Age's alone.
- A simple vibe draws no textures or devices: no asphalt grain, reflective sheeting or lane lines.
- There is no AI imagery anywhere.

---

## 12. What Navy never does

**Colour**
1. Never a gold, yellow or amber accent: that is v1 on blue. Pistachio has one job.
2. Never pistachio on data, a verdict or a done set. Done is sea green and always carries its ✓.
3. Never a neutral or stock-grey ground. Every hex move re-runs the 242-default guard.
4. Never a surface past 240° into indigo: every surface stays at HSL 216–224°.
5. Never neon: no cyan, aqua, lime or mint glow, and the accent stays at OKLCH C 0.10.
6. Never text under 4.5:1, and never a fourth grey (faint = dim).
7. Never up or down by red against green alone: the arrow and the sign are always there.

**Surfaces and containers**

8. Never a border on a card (the exercise card's inherited hairline excepted), and never a box inside a box of the same fill.
9. Never a coloured side stripe.
10. Never a delta pill, a tag wash or a KPI corner glow.
11. Never stat tiles: the box-score line.
12. Never a pill on something that isn't tapped.
13. Never a gradient wash, a coloured glow, or glass beyond the dock, the live bar and the sheet backdrop.
14. Never a four-sided keyline on "Next week" (C2).

**Type**

15. Never tracked caps on a type role, an uppercased unit, or a lowercase transform. `'COACH ME'` stays as authored.
16. Never text under 11 pt in a type role, never a label under 12, and never a weight under 400 at 15 pt or below.
17. Never a third family, and never monospace for numbers or labels (not Overpass Mono either).
18. Never Overpass on the measured surfaces: they keep Archivo on v1's metrics.
19. Never one word of a headline in another colour, once E4 lands.

**Theme**

20. **Never highway cosplay:** no route shields, sign-green panels, reflective stripes, lane or road markings, chevrons or arrows as decoration, "EXIT" tags, mile markers or MUTCD symbols. The face is the only reference.

**Art and platform**

21. Never v1's sparkle, emoji, SF Symbols or a stock icon library.
22. Never a texture or an image.
23. Never new motion: v1's ease-out 140 / 240 ms only, and v1's flash and pulse as they are.
24. Never a change to the dock's tabs, order, labels or place; never a gate; never a Light / Dark switch or the name "Dark mode".

---

## 13. Three screens, in words (iPhone, 390 pt)
- **You:**
  - The navy page runs up under the white status text.
  - The hero: a raised disc with the initial in blue-grey, then "Good evening," and the name in heavy Overpass 26, warm white. The name is pistachio until E4.
  - The Coach card: a navy blank, no edge, 10 pt corners, exactly 190 tall, in Archivo.
  - "How you're doing" in Overpass 13 semibold blue-grey, sentence case, with a quiet hairline.
  - Going well carries a thin sea-green top line; Could improve a pale-yellow one.
  - The goal's **0.9** in Overpass ExtraBold is the one big figure.
  - Under it a box-score line (**190.7 │ 182 │ Nov 30**) with blue-grey labels.
  - Four KPI recesses with no corner glow and bare deltas ("↓ 0.9" in sea green).
  - The dock: navy glass, "You Train Fuel Weight Steps" in sentence-case Overpass 12, and a short pistachio bar on the active tab.
- **Live session:**
  - Navy glass up top, with a steel tabular clock and a pistachio **Finish** with a navy word.
  - Exercise cards are navy blanks with one hairline edge.
  - Numbered badges are small raised squares; W / F / D are bare coloured letters.
  - Inputs are recessed; the 30 pt check has a periwinkle edge.
  - A done set fills sea green with a navy ✓ and a visible sea-green row wash.
  - Plate chips are coral, blue, lemon and sea green, with navy figures.
- **Fuel:**
  - Overpass ExtraBold 24 title.
  - The summary's calories in ExtraBold figures in their zone colour.
  - The meter has a warm-white head and dashed target.
  - Meal cards are flat navy blanks with hairline rows.
  - The FAB is a pistachio "+ LOG FOOD".
  - The add sheet has a periwinkle top edge and flat recessed tiles, with the Photo tile found by its pistachio icon square.
  - The estimator notice leads with a two-stroke ≈.
  - The "Name" field is a square plate with a periwinkle edge that turns pistachio on focus.

---

## 14. Picker tile (for Phase F; values only, no key in the definition)

SYNTHESIS §6's proposed `pick` record, as request **E7**:

`{ ground: '#0a183b', card: '#0f223f', edge: null, edgeW: 0, radius: 10, text: '#f4f0e8', soft: '#b3bfd6', num: '#f4f0e8', accent: '#acdc9c', numFace: { web: 'navy-num', wdth: null, wght: 800, native: 'Overpass_800' }, numPt: 34.3, thumb: null, scrim: null }`

- `numPt` 34.3 gives a 24 pt cap height at Overpass's 0.700.
- "315" is 63.4 pt wide (3 × 0.616 em tabular), inside the 92 pt box.
- Name and feel on the tile ground: 15.31 / 9.39.

---

## 15. Engine asks, findings, decisions left to Micah, risks

### 15.1 Engine asks (for the orchestrator; each keeps v1 byte-identical)
| # | Ask | Without it |
|---|---|---|
| **E1** | A `lead` surface role (`#1b3153`: 1.33:1 off the page, chalk 11.46, steel 7.03, dim 4.81, knurl 3.36, v3 guard 5.20) and a lead-card hook on each tab's first box | Every card is on `bar`, 1.09:1 off the page. It becomes **required** if the v4 guard binds (§5). |
| **E2** | A callout param for "Next week" (`.review-take`, `verdicts.jsx:332`): no fill, and a top rule only | `reviewBorder` stays `a: 0`, leaving no box at all. The pistachio head carries it. |
| **E3** | **Required before the Navy commit.** `addTile · flat` draws the lit tiles' icon well and tag on `raised`, not `grip`, on web (`.add-tile.lit`) and native (`AddTile`), and `vocab.js` line 689 says so. Chalk relies on it too. | **Navy cannot ship.** The lit tag is 2.09 (v1 3.80), and no token fixes it (§3.3). |
| **E4** | A colour role for the greeting's name (R5.4). Navy sets it to chalk. | The name stays pistachio |
| **E5** | Point the five literal caps sites at presets | They stay v1's tracked caps |
| **E6** | One shared simple icon set (v1 + the ≈ `spark`) | `vibes/icons/navy.js`, the same bytes |
| **E7** | The picker's `pick` record (§14) | Phase F reads it from this spec |

### 15.2 Findings for the orchestrator
- **F1: `tools-check/vibes-contract.mjs` flags "navy" as a colour.**
  - With Navy registered, check B fails: "navy: every colour string is 6-digit hex — not: id=navy, name=Navy, icons=navy". `navy` is a CSS named colour, and `looksColour()` scans every leaf, meta included.
  - Probed with the scan skipping `id`, `name`, `feel` and `icons` (`tools/navy-spec/contract-probe.mjs`, a scratch copy, the worktree untouched): **all 478 checks pass** with Navy registered.
  - The fix is the verifier's, not the vibe's. The slot's id is fixed, and a meta string is not a colour. Nothing was edited.
- **F2:** the real `tools-check/vibes-css.mjs` passes 19/19 with Navy registered in a scratch copy. The generated `:root[data-vibe="navy"]` block is at `tools/navy-spec/scratch-web/vibes/navy.css`, ready to head `vibes/navy.css`.

### 15.3 Decisions left to Micah
- **Q-P2, the accent:** pistachio `#acdc9c` (this spec), camel `#bd977b`, old rose `#cb7b7e`, or gold `#e2b04a` (which reads as v1 on blue).
- **Q-P5, the guard's scope:** if Tailwind v4 binds, `bar` moves to `#041f3e` and E1 becomes required.
- **Q-Q3, the native files:** Google's css2 statics (chosen, verified) or upstream RedHatOfficial (only the ExtraBold is verified).
- **Whether a simple vibe may name `shape` looks at all** (vocab.js grades: "D.1's reading, not a decision"). Held to `'v1'` everywhere, Navy keeps only colour and type.
- **Whether the Coach card should move to Overpass.** Concept A's draft table is kept at `tools/navyA/coach-face-overpass.json`. It needs line-height changes and a full coach-surface run.

### 15.4 Risks
1. **The nearest ground to v1 (14.4 ΔE00).** Side by side, the dark silhouette is v1's. The face, the pale accent, sentence-case labels, borderless cards and no pills carry the difference.
2. **Yellow data.** The pinned `analytics.js` paints lines, rings and sparklines in pYellow (lemon `#ffe16b`), so a judge may read "v1 on blue" from the charts.
3. **Pistachio is 5° past the lime band**, and 15.9 from sea-green "good". It is matte, and each place the two meet carries a glyph or words. "Mint on navy" is a familiar fintech pairing, so the generic-prompt test should ask about it directly.
4. **Native heights:** `minLh` 1.266 makes single lines taller. A dock label is now 15.2 pt against 10.9 (12 pt at 1.266, C3). Q must check the 64 pt dock, the 44 pt buttons and chips, and the segmented control. On the web, any `line-height: normal` box grows by the same ratio.
5. **Optical centring:** Overpass's deep descender (0.383 em) sits capitals about 0.10 em above centre in fixed-height controls. It needs a device screenshot.
6. **Charts:** the area wash and end-dot glow are the pinned module's. A simple vibe cannot remove them.
7. **The exercise card keeps v1's collar edge**, so it is the one bordered card in the vibe.
8. **Web h1 is tight at 320:** "September 2026" is 190 px against about 200. If the §13.3 harness clips it, h1 drops to 23 (182 px).
9. **W / F / D without a box** (C6): the letter and its colour tell a typed set from a numbered one. Judges should look at a set table with a warm-up and a drop set.
10. **Thin guard margins:** 0.09 / 0.19 above the gate against `blue-950`.

---

## 16. Where the numbers come from
- `node ~/dev/vibes-night/tools/navy-spec/check.mjs --md ~/dev/vibes-night/tools/navy-spec/check-out.md` covers the contract shape, contrast, colour vision and the guard. It reports **54/55**: the one failure is the SHIP GATE E3 line, which stays red until `vocab.js`'s `addTile · flat` puts the lit tiles on `raised` (§3.3). Every other check passes.
- `node ~/dev/vibes-night/tools/navy-spec/cssgen.mjs` runs the real vibes-css verifier in scratch (19/19) and writes the generated block.
- `node ~/dev/vibes-night/tools/navy-spec/contract-probe.mjs` runs the real contract verifier in scratch, with the meta paths skipped (478/478; F1).
- `node ~/dev/vibes-night/tools/t5-check.mjs navyA/fonts/latin-{400,600,700,800}.ttf` and `node ~/dev/vibes-night/tools/navy-spec/woff2check.mjs navyA/fonts/navy-Overpass-latin.woff2` (run from `tools/`) cover the fonts.
- These were inherited from concept A and not re-run tonight:
  - the HarfBuzz fit table and metrics (`tools/navyA/measure.mjs`);
  - the `lead` search (`search2.mjs`);
  - the subset builds (`subset.mjs`);
  - the downloads (`fetch.mjs` against `fonts.googleapis.com` and `fonts.gstatic.com`).

  Their files were re-hashed tonight and match.
- Colour library: track 4's `tools/colour/colour-lib.mjs` (WCAG 2.2, Machado 2009, CIEDE2000, self-tested) and `tailwind.mjs` (242 v3 defaults).
