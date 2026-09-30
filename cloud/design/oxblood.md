# Oxblood: the spec

V59 Phase D, slot `simple-3` (id `oxblood`, name **Oxblood**, feel "Oxblood and ice blue.", scheme `dark`, not experimental). 2026-09-27.

**How this spec was made.** Micah's change of plan gives a simple vibe no concept panel. This spec is research's pick for the slot, **SYNTHESIS §5.3 S3-a "Oxblood × Schibsted Grotesk"**, with track 4's `oxblood` palette [T4 §3.1] and track 5's Schibsted Grotesk entry [T5 §5.1, §9]. It adopts S3-a's palette, face, shape tokens and per-block looks. It fills in what S3-a leaves out: the split roles, tints, type sizes, font files, a look for every block, and the icon. It changes a value only where a value fails a hard rule. There are **two such corrections**, both small (§2.2). One judge checks it (the orchestrator runs that step).

**Files**
- The definition: `~/dev/vibes-night/wt/web-design/vibes/defs/oxblood.js`. It is pure, imports nothing and is frozen. Every v1 leaf path is filled.
- The icon set: `~/dev/vibes-night/wt/web-design/vibes/icons/oxblood.js`. It holds `spark` only (§10).
- Neither file is registered or committed. `index.js`, `vibe.js` and the native copies belong to the orchestrator.

**Every number here was computed tonight** by the scripts under `~/dev/vibes-night/tools/oxblood/`:
- `palette.mjs` reads the definition itself, so the spec and the file cannot disagree. It computes every contrast pair (tints composited as CSS and React Native blend them), Machado 2009 colour vision with CIEDE2000, the 242-entry Tailwind v3 guard (v4 for information only), distances across the lineup, and the contract's hue families. It writes `tools/oxblood/contrast-table.md`.
- `check-def.mjs` walks v1.js's 568 leaf paths and repeats `vibes-contract.mjs`'s per-vibe checks. It also holds every look to `vocab.js`'s grades.
- `subset.mjs` builds the web woff2, the picker's digits-only face and the latin statics, and reports coverage and metrics.
- `measure.mjs` and the earlier `tools/oxA-measure.mjs` give HarfBuzz widths against v1's Archivo.
- `tools/t5-check.mjs` checks the four native statics and the variable file.

**Ratios are floored to two places, never rounded up.**

---

## 0. At a glance

| | |
|---|---|
| **Name / feel** | Oxblood · "Oxblood and ice blue." Name 7 characters (limit 16), feel 21 (limit 28), no "·". Working copy; Micah approves it. |
| **The idea** | The page is oxblood leather, the colour of the lifting belt and the lifting shoe, with bone-white ink. A single cold ice-blue mark does the accent's one job. Every word and figure is set in Schibsted Grotesk, a grotesk drawn from a newspaper house's "proud history of printed media". Warm ground, cold mark, newsprint type, and printed-plate corners on everything a thumb doesn't tap as a chip. |
| **Kind** | Simple: colour roles, one face, type-role tokens, radius tokens and `shape`-grade looks only. v1's layout, boxes, order, words and numbers are unchanged. |
| **Fonts** | Two families: **Schibsted Grotesk** for everything, and **Archivo on v1's metrics** on the five measured surfaces only (the Coach card, the goal and feel chips, the estimate row, the movement chips). Web: one variable woff2 of **48.2 KB** (`wght` 400–900). Native: **4 static TTFs**, one of them the picker face. OFL 1.1, no Reserved Font Name. |
| **Contrast** | 130 gated pairs, **0 failures**. Every text ink reaches 4.5:1 or better on every surface it sits on; the lowest is dim on `raised`, 4.57. The lit add tile's 8.5 px tag (steel on `grip`) is 4.67: `grip` is split from `knurl` and darkened to `#503a3e` (§3). The cost, logged: the grab handle is 1.68 on the sheet, not R8.5's 3:1, though still above v1's 1.40. |
| **Colour vision** | Worst muscle-group pair **12.68** ΔE00 across normal, deuteranopia and protanopia (v1: 10.9). Good against bad: 61.4 / 20.8 / 18.6. |
| **Guard** | Ground `#1a0f11`: 5.86 from `stone-900`. Accent `#a8d8ff`: 5.08 from `blue-200`. Pressed `#97bddc`: 5.42 from `blue-300`. All clear the 242 Tailwind v3 defaults (gate: 5). |

---

## 1. The idea, and where it came from

**The pick.** SYNTHESIS §5.3, "S3-a · Oxblood × Schibsted Grotesk. Recommended." Its terms are adopted here:
- **Palette** `oxblood`: ground `#1a0f11`, bar `#241518`, bone ink `#f3ece2`, ice accent `#a8d8ff`.
- **Face**: Schibsted Grotesk, OFL. Web variable `wght` 400–900. Native upstream Regular, SemiBold, Bold and ExtraBold. Picker face SchibstedGrotesk-ExtraBold.
- **Shape tokens**: "lead card radius 2 (the plate radius), filled; groups separated by space alone; pills only on chips."
- **Why**: "a warm ground with a cold accent is nothing like Navy or v1".
- **Risk**: "the accent and the data blue are both blues, told apart by lightness (L\* 84 against 68)" [T4 §3.2].

PLAN §3.4 angle 1 ("Newsprint grotesk") is the same pick, written out as a slot direction.

**Why the ground** (R3.1 asks for a reason from a material):
- It is oxblood leather: the belt and the lifting shoe (judgement, PLAN §3.4).
- It is a *chromatic* ground (OKLCH C 0.019, hue 7°), not a tinted stock grey. It sits 5.86 ΔE00 from its nearest Tailwind default. That keeps it out of track 1's cluster #2, "tinted near-black + one saturated accent" [T1 N1]: the page itself carries a warm colour, and the ink is warm bone rather than neutral.

**Why the accent**:
- Ice blue `#a8d8ff` is pale (OKLCH L 0.862) and quiet (C 0.074). It reads as a cold mark, not a neon.
- It is 50.1 ΔE00 from v1's yellow and 36.7 from Navy's pistachio.
- It is not in never-do 2's banned families (lime, cyan, vermilion, amber or orange on near-black; indigo or violet at 240–295° with S ≥ 35 %). Its HSL hue is 207°, a sky blue.
- A brass accent was tried and rejected: it sat ΔE00 1.6 from Navy's gold [T4 §3.2].

**Why the face.** Schibsted Grotesk's own description says it takes "cues from Schibsted's proud history of printed media" [T5 §5.1]. Its x-height is identical to Archivo's (0.527 against 0.526 em, measured), so body text keeps v1's colour and density. It is on neither the AI-default nor the Claude-steered list [R4.10].

**The shape language: the printed plate.**
- Cards, buttons, fields, segments, the toast and the FAB take radius 2–3, like a printed plate or a type slug. S3-a names the plate radius for the lead card; this spec extends it to everything that is not a chip.
- The one pill left is on chips (R6.5). The sheet keeps the platform radius (R6.5).
- Cards lose their borders and are told apart from the page by value alone (R3.2).

**How it differs from its neighbours** (ΔE00 between grounds / between accents; `palette.mjs`):

| Neighbour | Ground | Accent | What tells them apart |
|---|---|---|---|
| **v1** | 7.5 | 50.1 (deutan 48.8, protan 46.5) | The ground is close, so identity comes from the ice accent, the bone ink, the face, the square plates and sentence-case labels. No yellow accent, no tracked caps, no rounded bordered cards. |
| **Navy** (the other dark simple) | 16.5 | 36.7 | Warm maroon against cool navy. A cold blue mark against a pale green one. Square plates (2) against round sign blanks (10). Schibsted against Overpass. |
| **Chalk** | 87.6 | 60.4 | Light against dark. |
| **Ledger / Club** | 14.7 | 36.2 (protan 11.7) | Both are dark chromatic grounds. Oxblood keeps v1's cards and layout and has no rules or leaders. Its accent is cold, where Club's pink is warm. |
| **Iron Age's dark alternative** (IA ink) | 6.0 | 41.1 | No period faces, no caps heads, no rules, texture or photos. |
| **Meet Day** | 7.0 | 24.2 | A hue accent rather than an inversion. Chips stay pills. No panels, bands or condensed scoreboard figures: Schibsted runs at its only width. |
| **Clear sky**, **Iron Age** | 73.1, 82.1 | 61.9, 56.3 | Light vibes. |

**The generic-prompt test** (R10a). Would "a dark fitness tracker" produce this? The stock answer is a neutral near-black, one neon accent (lime, cyan or orange), tracked caps labels, rounded bordered cards and delta pills. Oxblood inverts each of those:
- a chromatic warm ground;
- a pale cold accent that marks only the action;
- sentence-case labels at 12–13 pt;
- borderless square plates;
- bare deltas;
- a newspaper grotesk.

What survives from the generic look is v1's layout, which a simple vibe must keep.

---

## 2. Colour: every role

### 2.1 `colors`: all 43 keys

**Surfaces**

| Role | Oxblood | v1 | Job and checks |
|---|---|---|---|
| `rack` | `#1a0f11` | `#14161a` | The page. HSL 349° 27% 8%. White status text on it: 18.74. |
| `bar` | `#241518` | `#1c1f26` | Card, sheet, field. 1.06:1 off the page, **ΔE00 3.78** (v1's step is 3.37 and leans on a border). |
| `well` | `#1a0f11` | `#14161a` | The recess inside a card (in-card inputs, chips, KPI tiles). Equal to the page, as in v1, so it never matches its parent's fill (N9). |
| `raised` | `#352125` | `#262a33` | A control up off a card: the plain button, the peek bar, the rest pill, set badges, a chosen option, the Coach bubble. 1.16:1 off a card. Equal to `collar`, as in v1. |
| `track` | `#352125` | `#262a33` | The empty part of a meter. Every plate clears 3:1 on it; the lowest is core at 5.20. |
| `grip` | `#503a3e` **(split from knurl, §3)** | `#333844` | The lit add tile's icon well and tag (steel **4.67**, v1 3.80; chalk icon 8.88), the grab handle (1.68 on the sheet; v1 1.40), a toggle's off track (1.79 on the page; v1 1.54), trajectory dots, the runway hatching, the importer's unknown-group segment. **Not** equal to `knurl`, unlike v1: a knurl-bright grip held R8.5's 3:1 handle but put the tag at 2.37. Text wins; the handle's 3:1 is given up and logged. |
| `tileHero`, `tileLit` | `#1a0f11`, `#1a0f11` | `#1e1f1e`, `#17181a` | Native only. `addTile · flat` draws no washes, so these are the well. |

**Lines**

| Role | Oxblood | v1 | Job |
|---|---|---|---|
| `collar` | `#352125` **(corrected, §2.2)** | `#262a33` | Decorative hairlines: dividers, chart grids, the section title's trailing rule, the box-score verticals. 1.16 on a card, 1.24 on the page. Never a control's only edge (R2.2). |
| `knurl` | `#846368` | `#333844` | The control edge: fields, the set check, the rest pill, the peek bar, the sheet's top. 3.53 on the page and the well, 3.31 on a card. A dusty rose-brown, the leather's own edge. |

**Ink** (L\*: chalk 93.7, steel 71.0, dim 58.9. Hierarchy comes mainly from size and weight, not fading [T4 R9].)

| Role | Oxblood | v1 | On page / card / well / raised | Job |
|---|---|---|---|---|
| `chalk` | `#f3ece2` | `#f2f0eb` | 15.98 / 14.97 / 15.98 / 12.83 | Bone. Body, heads, values. |
| `steel` | `#bcaaa4` | `#8d939f` | 8.41 / 7.88 / 8.41 / 6.75 | Every label (eyebrow, section title, field, stat and chip labels, segments) and secondary text. |
| `dim` | `#9c8a85` | `#5c6270` | 5.70 / 5.34 / 5.70 / 4.57 | Tertiary: notes, placeholders, grey targets, the e1RM, "last week …", dock labels at rest. HSL saturation 0.10: grey, as the copy calls `.delta.flat` (HUE_NAMED). |
| `faint` | `#9c8a85` | `#333844` | = dim | An optional field's label, a blank meal's kcal, link underlines, the dimmed spark line. **Equal to dim**: no fourth grey tier (never-do 5). |
| `inverse` | `#f3ece2` | `#f2f0eb` | — | The bright fill behind knockout ink: a chosen chip or segment, the toast. |
| `knockout` | `#1a0f11` | `#14161a` | 15.98 on inverse | Oxblood cut out of bone. |
| `calMark` | `#f5f1ea` | `#f2f0eb` | 13.36 on the track; 8.19–10.38 over the zones | "The white head" (HUE_NAMED white). Not chalk: bone `#f3ece2` has HSL saturation 0.414, over the contract's white limit of 0.40. `#f5f1ea` is 0.355, and 1.9 ΔE00 from the ink. |

**Accent and state**

| Role | Oxblood | v1 | Checks |
|---|---|---|---|
| `accent` | `#a8d8ff` ice blue | `#f0be1e` | HSL 207° 100% 83%. Text 12.43 on the page, 11.65 on a card, 9.98 on raised. 5.08 from `blue-200` (v3). |
| `focus` | `#a8d8ff` | `#f0be1e` | Ring 12.43 / 11.65 / 12.43 (page / card / well). The water preset row keeps `pBlue` (ROLES `except`). |
| `accentPressed` | `#97bddc` | `#d9a90f` | S3-a's own option for a guarded pressed state [T4 GF7]: 5.42 from `blue-300`, where the ungated `#8fc3f0` sits 2.42. Oxblood ink on it: 9.48. ΔE00 6.88 from the accent. |
| `onAccent` | `#1a0f11` | `#141414` | 12.43 on the accent. |
| `danger` | `#ff6b4a` | `#d6252b` | Vermilion, shared with pRed and bad as in v1. 6.23 as text on a card. |
| `onDanger` | `#1a0f11` | `{web:'#fff', native:'#ffffff'}` | 6.65 on danger (white would fail). One 6-digit value: only v1 keeps the split spelling. |
| `done` | `#3cc4a0` | `#2aa85c` | A set done, its tick, the rest line running. |
| `onDone` | `#1a0f11` | `#0d1a11` | 8.56 on done (the ✓ is a glyph; it needs 3). |
| `good` | `#3cc4a0` | `#2aa85c` | Bluish green, HSL 164° (HUE_NAMED green). 8.02 on a card. |
| `warn` | `#ffe07a` | `#f0be1e` | HSL 46°, amber and yellow both (HUE_NAMED amber). 13.54 on a card. |
| `bad` | `#ff6b4a` | `#d6252b` | HSL 11°, red (HUE_NAMED). 6.23 on a card. |
| `onWarn` | `#1a0f11` | `#141414` | 14.45 on warn (the native trial banner). |

**Data: the plates.** Re-toned, not swapped: red leans vermilion, green leans bluish, core is pulled cool [T4 R5].

| Role | Oxblood | Text on page / card | Fill on the track | Meaning |
|---|---|---|---|---|
| `pRed` | `#ff6b4a` | 6.65 / 6.23 | 5.34 | chest, protein, gain |
| `pBlue` | `#62a8ff` | 7.64 / 7.16 | 6.13 | back, fat, water, training, cut, drop sets |
| `pYellow` | `#ffe07a` | 14.45 / 13.54 | 11.60 | legs, carbs, the Fuel and Weight subject, maintain, the heat strip's trained day. ΔE00 10.0 from v1's yellow: paler. |
| `pGreen` | `#3cc4a0` | 8.56 / 8.02 | 6.87 | shoulders, steps |
| `pWhite` | `#efe8dc` | 15.39 / 14.42 | 12.35 | arms, the Steps subject |
| `pChrome` | `#8f99a5` **(corrected, §2.2)** | 6.48 / 6.07 | 5.20 | core |
| `onPlate` | `#1a0f11` | — | — | Every plate chip: 6.48 (core) to 15.39 (arms) |

**Shade and lift.** `shade` is `#000000`: every shadow and the sheet backdrop. On oxblood, black reads as depth and never as a coloured glow. `lift` is `#ffffff`: the pressed-row wash.

**Native legacy keys**, the aliases `build()` fills:
- `onYellow` `#1a0f11`, filled from onAccent. The trial banner's ink takes onWarn, also `#1a0f11`.
- `onGreen` `#1a0f11`, from onDone.
- `white` `#1a0f11`, from onDanger.
- `pYellowPressed` `#97bddc`, from accentPressed.
- `fallback` `#bcaaa4`, the same as steel and `groups.fallback`.

**`themeColor`** is `#1a0f11`. The fixed roles (`launch`, `manifestTheme`, `webStatusBar`, `appearance`) keep v1's values.

### 2.2 The two corrections (each for a hard rule the palette as printed misses by a hair)

| Role | Palette | Oxblood | Rule it failed | Measured |
|---|---|---|---|---|
| `pChrome` (core), with `groups.core`, `groupPlates.CORE` and `plates[5]` | `#8f99a3` | `#8f99a5` | **R2.5, the group gate of ≥ 12 ΔE00.** Shoulders against core under deuteranopia is **11.984**. Research printed it as "12.0", rounded up. | Two steps more blue moves it 1.01 ΔE00 and lifts the worst pair to **12.68** (protan, shoulders / arms). Every contrast it had, it keeps (text 6.07 on a card; onPlate 6.48). |
| `collar` (and `raised`, `track`, which v1 makes one value) | `#331f23` | `#352125` | **§13.1, "v1 pairs a vibe may not make worse"** (ROLES): collar on a card. v1 is 1.1477, the palette **1.1385**. | 1.1674 on a card, 0.62 ΔE00 from the palette's. F badge 5.34, D 6.13, dim on raised 4.57. |

S3-a's pressed-state option `#97bddc` is **adopted, not corrected**: research gives it for the case where pressed states are guarded. It costs nothing and takes one question off Micah's list.

**Tailwind v4 (information only; Q-P5 is Micah's).** The ground is 4.51 from `mauve-900` and the accent 4.87 from `blue-200`. If v4 binds, take GF11's options, rack `#1a0b0c` and accent `#a5d8ff` [T4 GF11], and re-run `palette.mjs`. Nothing else here depends on them.

### 2.3 `alpha` helpers

v1's mapping: yellow → pYellow, red → pRed, blue → pBlue, green → pGreen, ground → rack, accent → accent, danger → danger, warn → warn.

### 2.4 `tint`: all 28, each a role at an alpha (no `exact`; flattened over a card / over the page)

| Tint | Role, α | Over `bar` | Over `rack` | Why, and the ink on it |
|---|---|---|---|---|
| `setDone` | done **.10** | `#262726` | `#1d211f` | Up from .07, so a done set reads from the bench (do-instead 11). Chalk 12.78, steel 6.72, dim 4.56. |
| `setFlash` | accent .28 | `#494c59` | `#424754` | The tick flash. Chalk 7.27 at its peak. |
| `tagW` / `tagF` / `tagD` | pYellow / pRed / pBlue **0** | — | — | At v1's .16 over `raised`, F falls to 4.14 and D to 4.67 (on a letter that is text). Bare letters on raised: W 11.60, F 5.34, D 6.13. |
| `dropRail`, `dropAdd` | pBlue **.70** | `#4f7cba` | `#4c7ab8` | The drop rail and the + Drop edge carry structure, so they reach 3:1: **4.11** on a card. v1's .45 gives 2.42. |
| `pickSel` | accent .08 | `#2f252a` | `#251f24` | Chalk 12.62, ice 9.81. |
| `block` | accent .03 | `#281b1f` | `#1e1518` | A lifting block's wash. Its ice title: 10.99. |
| `coachBase` / `coachLow` / `coachHigh` | accent .14 / .07 / .38 | `#363038` / `#2d2328` / `#565f70` | — | The coach pulse. Chalk 5.48 on its strongest step. |
| `rowPress` | lift .04 | `#2d1e21` | `#23191b` | Chalk 13.57 / 14.60. |
| `pillBase` / `pillUp` / `pillDown` / `pillWarn` | lift / good / bad / warn **0** | — | — | **No delta pills** (R6.6). Deltas are bare signed text with their arrow, on the KPI well: good 8.56, bad 6.65, warn 14.45, flat (dim) 5.70. |
| `zoneCut` / `zoneHold` / `zoneGain` | pBlue .16 / pYellow .18 / pRed .16 | `#2e2d3d` / `#4b3a2a` / `#472320` | — | v1's alphas. The white head over them (on the track): 10.18 / 8.19 / 10.38. |
| `dockGlass` | rack .82 | `#1c1012` | — | Glass stays on the dock (D16). Dim label 5.64, active 15.81, the ice mark 12.30. |
| `wkBarGlass` | rack .90 | `#1b1012` | — | Glass stays on the live bar. Steel clock 8.34, ice COACH 12.33. |
| `backdrop` | shade .60 | — | `#0a0607` | The sheet stands 1.14:1 off the dimmed page, plus its knurl top edge. |
| `trajGood` / `trajWarn` / `trajBad` | good / warn / bad .18 | `#283530` / `#4b3a2a` / `#4b2421` | — | v1's halo. |
| `reviewBg` | accent **.10** | `#31292f` | — | "Next week" stops being a box in a box (N9) and becomes the vibe's **callout**: a flat ice-tinted band. Its ice head 9.35, takeaway 12.02. |
| `reviewBorder` | accent **0** | — | — | No border. The border keeps its width at 0 alpha, so nothing moves. |

---

## 3. Contrast

**Method.** WCAG 2.x ratios for every text role over every surface role it can sit on, tints composited, floored. Thresholds: 4.5:1 for text, 3:1 for large text (18 pt, or 14 pt bold), control edges and graphics. Where a `grip` fill sits under 3:1, it is gated instead at v1's own ratio for the same role pair (§13.1: a v1 pair a vibe may not make worse). The full table of 137 pairs (130 gated, 0 below need) is `tools/oxblood/contrast-table.md`.

**Text roles × surface roles** (need 4.5)

| Ink ↓ / surface → | page `rack` | card `bar` | `well` | `raised` |
|---|---|---|---|---|
| chalk | 15.98 | 14.97 | 15.98 | 12.83 |
| steel | 8.41 | 7.88 | 8.41 | 6.75 |
| dim = faint | 5.70 | 5.34 | 5.70 | 4.57 |
| accent | 12.43 | 11.65 | — | 9.98 |
| good = done = pGreen | 8.56 | 8.02 | — | 6.87 |
| warn = pYellow | 14.45 | 13.54 | — | 11.60 (W badge) |
| bad = danger = pRed | 6.65 | 6.23 | — | 5.34 (F badge) |
| pBlue | 7.64 | 7.16 | — | 6.13 (D badge) |
| pWhite | 15.39 | 14.42 | — | — |
| pChrome | 6.48 | 6.07 | — | — |

**Ink on fills.**
- onAccent: 12.43 on the accent, 9.48 on pressed.
- knockout: 15.98 on inverse, 12.43 on the accent (the hero tile tag).
- onDanger 6.65; onDone 8.56; onWarn 14.45.
- onPlate: 6.65 / 7.64 / 14.45 / 8.56 / 15.39 / 6.48 on the six plates.
- On `grip` (the lit add tile, v1 geometry): the tag, steel, **4.67** (v1's is 3.80); the icon, chalk, 8.88 (a graphic). The toggle's off knob, steel on grip, 4.67.

**Text over tints.** Done row: chalk 12.78, steel 6.72, dim 4.56. Flash 7.27; coach pulse 5.48; picked row 12.62; pressed row 13.57 / 14.60; the "Next week" band 9.35 / 12.02; the web trial bar (warn ink on a warn .12 wash) 10.98; dock labels over the glass 5.64 at rest and 15.81 active; the live clock 8.34.

**Graphics** (need 3).
- knurl: 3.53 / 3.31 / 3.53 (page / card / well). Focus 12.43 / 11.65. The dock mark 12.30.
- `grip`'s fills, gated at v1's own ratio (not 3:1; see below): the grab handle on the sheet 1.68 (v1 1.40); a toggle's off track 1.79 on the page, 1.68 on a card (v1 1.54 / 1.40); the trajectory dots 1.68 on a card (v1 1.40); the runway hatching, grip against track, 1.44 (v1 1.22); the lit tile's icon well on the well 1.79 (v1 1.54).
- Plates: 5.20–12.35 on the track, 6.07–14.42 on a card, 6.48–15.39 on the page. Done and danger on the track: 6.87 / 5.34.
- The pinned `analytics.js` paints: chalk (line 2's default) on the track 12.83; the heat strip's trained day against its untrained day 11.60; the unlit spark bars (knurl) on a KPI well 3.53.
- The dimmed spark line 5.34; the drop rail and + Drop edge 4.11.

**v1 pairs a vibe may not make worse** (ROLES):
- dim on a card: 2.70 → **5.34**;
- collar on a card: 1.1477 → **1.1674**;
- the grab handle: 1.40 → **1.68**;
- the lit add tile's tag, steel on grip: 3.80 → **4.67**;
- pRed as text on a card: 3.27 → **6.23**.

**No failures. The lit add tile's tag is fixed by the vibe on its own: `grip` is split from `knurl` and darkened** (revise, after the judge's must-fix).
- The first draft set `grip` = `knurl` `#846368` so the grab handle reached R8.5's 3:1 (3.31). That put the lit tile's 8.5 px tag (`.add-tile.lit .tag`, steel on grip, v1 geometry) at **2.37**, worse than v1's 3.80 and under 4.5. A dark vibe's `grip` cannot be mid-tone enough for a 3:1 handle and dark enough for 4.5:1 light text at once.
- The draft hung the fix on ask E3 (VOCAB/engine wording that would move the lit tiles' well and tag to `raised`). That is not in this vibe's hands, so the vibe takes the fallback instead: `grip` `#503a3e`, on knurl's hue line, 15.7 ΔE00 below it. Steel on it is **4.67**, chalk 8.88.
- **The cost, logged:** R8.5's 3:1 grab handle is lost. The handle is 1.68 on the sheet and a toggle's off track 1.79 on the page. Both are still above v1's own (1.40, 1.54), so no v1 pair gets worse. The toggle is still read by its steel knob (7.88–8.41 on the ground around it, 4.67 on its track) and the sheet by its knurl top edge (3.31).
- If E3 later lands for every vibe, `grip` could go back up toward `knurl` and win the 3:1 handle again. That is a re-tune for a later pass, not a condition on this commit.

**Reported, not gated.**
- Card off the page 1.06 (ΔE00 3.78). Raised off a card 1.16.
- A dock label at rest over a bright yellow chart scrolled under the glass: 3.60. That comes from v1's own .82 glass; v1's dim scores about 1.5 in the same spot.

---

## 4. Colour vision

Machado 2009 at severity 1.0, CIEDE2000, track 4's library.

| Vision | Worst group pair | The three lowest | Gate |
|---|---|---|---|
| Normal | **16.8** back / core | back/core 16.8, legs/arms 20.0, arms/core 24.5 | ≥ 12 |
| Deuteranopia | **12.8** shoulders / core | shoulders/core 12.8, shoulders/arms 15.7, chest/legs 16.1 | ≥ 12 |
| Protanopia | **12.7** shoulders / arms | shoulders/arms 12.7, back/core 18.5, chest/shoulders 18.6 | ≥ 12 |
| Tritanopia (information) | 8.8 back / shoulders | back/shoulders 8.8, legs/arms 10.6, back/core 17.8 | — |

**Worst across normal, deuteranopia and protanopia: 12.68 (floored).** The palette as printed is 11.98, which is why core was corrected (§2.2).

**The accent against every data and status colour** (R2.4: at least 10 in normal vision):

| Vision | Nearest data or status colours | L\* accent / pBlue |
|---|---|---|
| Normal | back 13.4, core 19.2, arms 23.6 | 84.3 / 67.9 |
| Deuteranopia | back 15.6, core 18.4, shoulders 23.7 | 83.0 / 65.9 |
| Protanopia | back 14.1, core 18.8, arms 22.2 | 86.3 / 71.1 |

**The known risk: two blues.** The accent and the data blue are told apart mainly by lightness (L\* 84 against 68). So the accent never sits beside back, fat or water as the only cue:
- it is always a filled button carrying words (Finish, the FAB, Start workout);
- or a ring or mark (focus, the dock bar, today's keyline, COACH's speech mark).

Data blue appears only as data: a plate, a bar, the D badge letter, the cut zone, water.

**Verdicts.** Good against bad: 61.4 normal, 20.8 deuteranopia (ΔL\* 1.6, so hue does it), 18.6 protanopia. Good against warn: 34.4 / 25.9 / 18.8. Warn against bad: 39.5 / 16.1 / 25.1. **Up and down never rely on red against green**: every delta keeps its ↑ ↓ → and its sign, and Schibsted Grotesk has all three arrows and the minus sign.

---

## 5. Type

### 5.1 One face, and the one exception

| Face | Sets | Why |
|---|---|---|
| **Schibsted Grotesk** | Every word and figure outside the measured surfaces: heads, the greeting, labels, buttons, chips, segments, the dock, notes, list and settings rows, body copy, every `statVal` / `kpiVal` / `timer` / `headline` / `setInput` / `loadNum`, every delta and arrowed string. | The newspaper grotesk. Tabular digits are **1300/2048 at every weight** (checked at 400, 600, 700, 800 and 900 on the web subset, and in all four statics). It has → ↑ ↓ − ≈ × ÷ ±. |
| **Archivo, on v1's metrics** | The five measured surfaces only: the Coach card, the goal chips, the recap's feel chips, the estimate row, the movement chips. | Native draws these in `MEASURED_FACE` (Archivo) in every vibe that hands in no fit table (rack-mobile `src/ui/theme.js:355-367, 687-713`). Their fit is Archivo's arithmetic. On the web, `vibes/oxblood.css` sets `font-family: 'Archivo', system-ui, -apple-system, sans-serif` on `.coach-card`, `.coach-goal-opt`, `.feel-grid .coach-chip`, `.move-opt` and the estimate row. |

**Why the Coach card keeps Archivo** (`oxA-measure.mjs`):
- Schibsted 600 at 14 runs **5.2–5.3 % wider** than Archivo 600 on real Coach lines. "Great workout. New best on Incline Dumbbell Bench Press." measures 396.5 px against 376.9; "Protein under target 6 of 6 days", 211.5 against 198.7.
- Its reason line at 400 / 12 runs 5.5–7 % wider.
- Its hhea ratio is 1.234, taller than the card's fixed 15 / 18 and 16 / 18 line boxes allow.
- Keeping Archivo costs 0 bytes and no advance table, and it keeps the two-family rule (R4.1).
- The card keeps 190 / 164, padding 14 and a 1 pt border (`coachCard · flat` draws the border in the card's own colour).

### 5.2 Every type role

- Schibsted has one axis, `wght` 400–900, so every `wdth` is 100. The web ignores an axis the face lacks, and native ignores width anyway.
- Weight is set **only through `font-variation-settings`**, with zero `font-weight` rules.
- **Heads are Bold (700) and figures ExtraBold (800)**: 800 on figures only.
- **No type role is caps** (`upper: 0`). Every such string is authored in sentence case, and `'COACH ME'` stays as typed.
- Labels are information: 12–13 pt, 600, steel at 7.88 on a card (R5.1).

| Preset | Oxblood | v1 | Ink |
|---|---|---|---|
| `body` | 15 / 400, lh 1.45 | 15 / wdth 100 / 400 | chalk |
| `h1` | **24 / 700**, ls −.01 | 26 / 78 / 800 | chalk |
| `h2` | 18 / **700**, ls −.01 | 18 / 78 / 800 | chalk |
| `h3` | **16 / 700**, ls −.01 | 15 / 78 / 800 | chalk |
| `eyebrow` | **13 / 600, sentence case, ls 0** | 10 / 88 / 700, caps .16 | **steel** |
| `fieldLbl` | 13 / 600, sentence case | 10 / 88 / 700, caps .16 | steel |
| `statLbl` | 12 / 600, sentence case | 9 / 88 / 700, caps .10 | steel |
| `dockLbl` | 11 / 600, sentence case | 10 / 88 / 600, caps .07 | dim (active: chalk) |
| `segBtn` | 12 / 700, sentence case | 11 / 92 / 700, caps .06 | steel (chosen: knockout) |
| `chip` | 12 / 600 | 11 / 92 / 600 | steel (chosen: knockout) |
| `note` | **13** / 400, lh 1.5 | 12 / 400 | dim (5.34 on a card) |
| `btn` | 14 / 700, ls 0 | 14 / 92 / 700, ls .02 | chalk |
| `btnLg` | 16 / 700, sentence case, ls 0 | 16 / 92 / 700, caps .06 | the button kind's |
| `youGreet` | 27 / 800, ls −.01, lh 1.05 | 27 / 100 / 800, ls −.02 | chalk |
| `statVal` | 20 / 800, lh 1, tnum | 20 / 108 / 800 | the caller's, or chalk |
| `kpiVal` | **21** / 800, ls −.01, lh 1, tnum | 22 / 108 / 800 | chalk |
| `timer` | **20** / 800, ls 0, tnum | 22 / 112 / 800 | chalk |
| `headline` | 34 / 800, ls −.01, lh 1, tnum | 34 / 112 / 800, ls −.02 | chalk |
| `setInput` | 15 / 700, tnum | 15 / 100 / 700 | chalk |
| `mono` | Menlo 12 / `monospace` (v1) | same | chalk |
| `loadNum` | wdth 100 / 800, ls −.01, lh .95, tnum | wdth 118 / 800, ls −.02 | the caller's |

**The one numeral treatment** (R6.7): Schibsted ExtraBold tabular figures, the results-table figure of a newspaper sports page, at every hero size.

**Literal sites** (VOCAB §8.1) keep v1's sizes and case in a simple vibe, and only their face changes. The five tracked-caps literals stay caps on both clients, for parity, until ask E5 points them at presets: ChartSub, the mini-stat labels, HeadlineU's unit line, the add-tile tag, and the FAB's "LOG FOOD". The same goes for the sub-11 pt literals v1 draws (the 9 pt mini-stat labels, the 10 pt e1RM and plate chips): they are v1-inherited and not type roles.

### 5.3 Fit (HarfBuzz, kerning on, tnum on figures; `measure.mjs`, `oxA-measure.mjs`)

| Role | String | Oxblood px | v1 web px (as drawn) | Room at 320 | Verdict |
|---|---|---|---|---|---|
| h1 (Train) | September 2026 | **194.8** at 24/700 | 172.6 (26, wdth 78) | 214: 320 − 2×16 pad − the two 34 nav buttons and their 6 gap (`workout.js:395-408`, `rack.css:361-372`) | fits. At 26/700 it is 210.5, 3.5 px spare: too tight, hence 24 |
| h1 (Fuel) | Wed, Sep 24 | 144.3 | 127.8 | ~174 with the gear | fits |
| Greeting | Good afternoon, | 218.1 at 27/800 | 219.6 | as v1 | narrower than v1 |
| Sheet h2 | Where this comes from | 203.5 at 18/700 | 166.4 | ~288 | fits |
| Eyebrow | Against your targets | 126.8 at 13/600 | 147.3 (caps + .16) | as v1 | narrower |
| Stat label | At this pace | 67.7 at 12/600 | 65.6 (caps) | ~85 in a line column | fits; may wrap (VOCAB allows) |
| Dock label | Weight | 36.5 at 11/600 | 40.7 (caps) | ~60 | narrower |
| Large button | Start workout | 108.5 at 16/700 | 144.2 (caps) | — | narrower |
| Segment | Month | 37.6 at 12/700 | 42.5 (caps) | — | narrower |
| Chip | Upper body | 67.7 at 12/600 | 54.5 | the row scrolls | wider; the row already scrolls |
| KPI value | 1,950 | **66.6** at 21 | 66.7 (22, wdth 108) | the tile | not wider than v1 (at 22 it would be 69.8) |
| Live clock | 1:32:05 | **88.9** at 20 | 92.0 (22, wdth 112) | the crowded live bar | not wider than v1 (at 22 it would be 97.8) |
| Stat value | 190.7 | 63.5 at 20 | 60.6 (wdth 108) | the line look drops the tile's 2×10 padding and border | fits |
| loadNum | 1,950 at 40 | 127.0 | 131.7 web / 113.0 native (wdth 100) | — | narrower than v1 web; wider than native's v1 (1.12×), which runs at 375+ pt |
| headline | 1,950 at 34 | 107.9 | 106.7 | You's goal line | +1 % |

**Line metrics.** UPM 2048; hhea 2000 / −528 / 0, so **`minLh` = 1.234** (Archivo 1.088). Typo metrics are equal, with USE_TYPO_METRICS set. Cap height 0.703, x-height 0.527 (Archivo 0.526).
- On native, single lines floor at 1.234× their size: the dock label is 13.6 pt tall against v1's 10.9. The height changes, the order does not. Q's fit list takes the 64 pt dock, the 44 pt buttons and chips, and the segmented control.
- Capitals sit within 0.01 em of centre in a centred line box (baseline at 0.977 of 1.234). Unlike a deep-descender face, controls centre as v1's do.
- On the web, any `line-height: normal` box grows by 1.234 / 1.088.

### 5.4 Glyph coverage (the variable file and all four statics)

- **Schibsted lacks** ⋯ ✓ ✕ ↳ ⚙ ⚠ ✎ ▾ ▴. **Archivo lacks** the same nine, so coverage is **no worse than Archivo's anywhere** [R4.6].
- It has − (U+2212), → ↑ ↓, ≈ × ÷ ± · – — ’ … ‹ › € £.
- The missing nine fall back exactly as they do in v1. No glyph key is drawn (§10).

---

## 6. Fonts: files, sources, licence, budgets

### 6.1 Web: one variable woff2, self-hosted, latin

- **Source.** google/fonts `ofl/schibstedgrotesk/SchibstedGrotesk[wght].ttf`, fetched from `https://raw.githubusercontent.com/google/fonts/main/ofl/schibstedgrotesk/SchibstedGrotesk%5Bwght%5D.ttf`.
  - 176,068 B, sha256 `6ceeadf6be8e1fd7687011c7fa38ed0edd1abe967a0b73d97caec183552e823d`.
  - Version "1.100; gftools 0.9.25". Its METADATA.pb names source `https://github.com/schibsted/schibsted-grotesk` at commit `d485f61f105e1b3935f4d21dfb4d371359798603`, file `fonts/variable/SchibstedGrotesk[wght].ttf`.
  - On disk at `research/fonts/schibstedgrotesk/`.
- **Subset.** `subset-font` 2.4.0 (hb-subset), to Google's latin range plus → ↑ ↓ ↳ ≈ × ÷ ± −, with every axis and layout feature kept.
  - Output `tools/oxblood/fonts/oxblood-SchibstedGrotesk-latin.woff2`: **49,348 B (48.2 KB)**, sha256 `934f3158a0eca8f8a33843de574d0fa6bdec2bfb40b9257200e9d50307dee9be`. The budget is 120 KB.
  - Checked on the subset: axis `wght` 400–900 (reaches 800, as R4.4 needs); `tnum` 1300 at 400 / 600 / 700 / 800 / 900; 226 code points.
- **The picker's numeral face** [T10 §4.9] is a digits-only subset, `oxblood-num.woff2`, **6,560 B**, sha256 `9e2d0e5810e93ef33d537a2cb7efdefd6c2f8d9e3acc13d28f3c52b81d638d9f`. It is declared under a vibe-prefixed family, `oxblood-num`. Until it loads, the tile's number is hidden.
- **`@font-face`:**
  ```
  font-family: 'Schibsted Grotesk';
  src: url(vibes/oxblood/SchibstedGrotesk-latin.woff2) format('woff2');
  font-weight: 400 900;
  font-display: swap
  ```
  - Ship `OFL.txt` beside it. The `font-weight` range is a descriptor, not a rule.
  - Weight is set only by `font-variation-settings: 'wght' N`. rack.css's own `'wdth' …, 'wght' …` settings keep working (the missing `wdth` axis is ignored), so Oxblood's CSS overrides only the roles whose weight changes: h1–h3 to 700.
- **`--font`** is `'Schibsted Grotesk', 'Archivo', system-ui, -apple-system, sans-serif`. Archivo stays loaded by rack.css line 1's import, for the measured surfaces: 0 new bytes, and `face.web.importUrl` is v1's unchanged.
- **Offline.** Both woff2 files ship in the bundle and the service worker's cache. Nothing is fetched at run time (R8.1).

### 6.2 Native: four static TTFs (limit 4; the picker face is one of them)

**Upstream `schibsted/schibsted-grotesk` at commit `d485f61f105e1b3935f4d21dfb4d371359798603`**, the same commit google/fonts built from. Each file was run through **`t5-check.mjs`** tonight. Regular, SemiBold and Bold were downloaded tonight through `fetch.mjs`; ExtraBold was already on disk from track 5.

| File (ship as) | Source URL | Full bytes / sha256 | Latin-subset bytes / sha256 | PostScript name | usWeightClass | `tnum` |
|---|---|---|---|---|---|---|
| SchibstedGrotesk-Regular.ttf | `https://raw.githubusercontent.com/schibsted/schibsted-grotesk/d485f61f105e1b3935f4d21dfb4d371359798603/fonts/ttf/SchibstedGrotesk-Regular.ttf` | 122,624 / `e2cc0926fd159816bd934df5875000077e5ec8b1f9cd18154fe4d3e482b03b42` | 75,956 / `6283877788f49bea585723dc018a779c0703c71f48ef60ad11f0edb6fda4c914` | `SchibstedGrotesk-Regular` | 400 | uniform 1300 |
| SchibstedGrotesk-SemiBold.ttf | `…/fonts/ttf/SchibstedGrotesk-SemiBold.ttf` | 123,064 / `b9d93d5f737a3afdc9ec47ce97968ca41450413f741900927c382b8707798854` | 75,908 / `b730051953a7b31d7991ae91e7f0e072317a10f894b3f62c358fa9aae185d5b8` | `SchibstedGrotesk-SemiBold` | 600 | uniform 1300 |
| SchibstedGrotesk-Bold.ttf | `…/fonts/ttf/SchibstedGrotesk-Bold.ttf` | 123,216 / `d1d1ed9301f19a994161b0b763db11cce356204477e81bf3434d2f5dd85905e0` | 76,304 / `2e125dd975790170ed8c9edea06c77c856d35465083e1eb0a473dee789c20866` | `SchibstedGrotesk-Bold` | 700 | uniform 1300 |
| SchibstedGrotesk-ExtraBold.ttf (**picker face**) | `…/fonts/ttf/SchibstedGrotesk-ExtraBold.ttf` | 123,428 / `2a00896fe6bf6507323f4028e157858c7ba3cb82b9ba009bbc058d5b10230b96` | 76,452 / `c8338357d0e8b8cd396ad4ab4afe72f59662a970d14a1940a21b196cff9fd7c9` | `SchibstedGrotesk-ExtraBold` | 800 | uniform 1300 |

- **Total 304,620 B** latin-subset (492,332 B unsubset). The whole-native budget is 6 MB.
- **PostScript names** are unique, differ from each other and from the four Archivo package files, and are the foundry's own instances, not hand-instanced [R4.5].
- **GSUB** in every static: `aalt calt case ccmp dlig dnom frac liga locl numr ordn pnum sups tnum zero`. Rack's native text uses `tnum` only.
- **Native `face`**:
  - family `SchibstedGrotesk`;
  - keys `SchibstedGrotesk_400`, `_600`, `_700` and `_800`;
  - snap `{650: 700, 750: 800}` (v1's), step 100, width 100, **`minLh` 1.234**;
  - mono is v1's.

  Every weight a role or a v1 site asks for resolves to one of the four keys (`check-def.mjs`: 400, 600, 700, 800).
- **Measured surfaces**: `MEASURED_FACE` (Archivo, v1's keys, minLh 1.088), automatically, because Oxblood hands in no fit table.

### 6.3 Licence (for `FONTS.json` and the Licences row)

- **SIL Open Font License 1.1.** METADATA.pb says `license: "OFL"`.
- **Copyright line** (OFL.txt line 1, identical in google/fonts and upstream): "Copyright 2023 The Schibsted-Grotesk Project Authors (https://github.com/schibsted/schibsted-grotesk)".
- **No Reserved Font Name.** The header before "This Font Software is licensed under…" names none, so subsetting under the family's own name is allowed [R4.7].
- **OFL.txt** is the same bytes in both places, sha256 `3b4f3063b6ac7c1e403e2c4a5e8ef3a58190ff83ed7b15af66511858699139ce`. Sources: `https://raw.githubusercontent.com/google/fonts/main/ofl/schibstedgrotesk/OFL.txt` and `https://raw.githubusercontent.com/schibsted/schibsted-grotesk/d485f61f105e1b3935f4d21dfb4d371359798603/OFL.txt`.
- Ship `OFL.txt` beside the woff2 files and the TTFs. The Phase F Licences row becomes mandatory once any new font is committed.
- **Designer**: Bakken & Bæck, Henrik Kongsvoll (METADATA.pb).
- **`FONTS.json` draft**:
  - family "Schibsted Grotesk";
  - files: the two woff2 and the four TTFs above, with their sha256;
  - version "1.100 (d485f61)";
  - source URLs: the google/fonts variable file, the four upstream statics, and OFL.txt;
  - licence "OFL-1.1", RFN "none", the copyright line above;
  - subset tool "subset-font 2.4.0".
- **Each family ships in one vibe only** [T5 §0]. Schibsted Grotesk is claimed by no other slot's recommended angle (PLAN §4). Track 5's "alternative Deep 2, Swiss grid" named it only "if Schibsted is not already taken by a simple slot".

---

## 7. Shape language: the plate

| Token | Oxblood | v1 | Where |
|---|---|---|---|
| `radius.r` | **2** | 12 | Cards, the exercise card, the Coach card (radius does not affect its fit), the peek bar. S3-a's "the plate radius". |
| `radius.sm` | **3** | 8 | KPI wells, set inputs, calendar cells, `.cal-nav` buttons. Buttons take `btn · square` (radius.plate). |
| `radius.sheet` | 18 | 18 | The sheet keeps the platform radius (R6.5). |
| `radius.tile` | **3** | 10 | Add tiles' icon wells. |
| `radius.pill` | 999 | 999 | **Chips only**, the one pill (R6.5). Segmented, toast and FAB take square looks. The rest pill keeps it (`sessionChrome · v1`). |
| `radius.plate` | 2 | 2 | Data marks, plate chips, and the square looks. |
| `radius.chip` | **2** | 3 | Add-tile tags, plate chips. |
| `radius.mark` / `idx` | **2** / **2** | 4 / 5 | Set badges and marks. |
| web `round` / `hair` / `bubble` / `badge` | 50% / 1 / **4** / **3** | 50% / 1 / 14 / 9 | The Coach bubble goes square to match its card. |

- **Borders.** Cards have **none** (`card · flat`, `coachCard · flat`). `collar` 1 px is for decorative hairlines only. `knurl` 1 px is the control edge: fields (`field · square`), the rest pill, the peek bar, the sheet's top. The set check keeps its 1.5 px. Wins and Improve carry a **2 pt top border** in good / warn, never a side stripe (`youCard · flat`).
- **Shadows** are v1's, unchanged: peek, rest, toast, FAB and its pressed layer, and the tour card, all in `shade` black. The rings keep v1's roles.
- **Scrims and glass** are v1's:
  - the sheet backdrop is black .60 plus `blur(3px)`, with no `-webkit-` twin (fixed);
  - the dock is rack .82 plus `blur(18px) saturate(140%)`, BlurView 40 on native;
  - the live bar is rack .90 plus `blur(16px)`;
  - the tour is rack .55 → .94 at 42 %, an oxblood fog.
- **Native chrome** (a dark vibe): `statusBar` light, `keyboard` dark, `datePicker` dark, `blurTint` dark, `shadow` and `camera` `#000000`, `systemFace` null. The fixed roles keep v1's values. Native sign-in and the banners stay v1's colours (§10 of the prompt), in 6-digit spellings.
- **Density and spacing** are v1's. A simple vibe keeps the layout.

**Container roles** (R6.1: at least three; at most one with both a fill and a border):
1. **card**: a filled plate, radius 2, no border.
2. **group**: lists and settings rows on their ground, parted by collar rules; the box-score line with no tiles.
3. **callout**: the "Next week" ice band (reviewBg .10, no border).
4. **sheet**: the platform sheet, `bar`, its knurl top edge. This is the one role with a fill and an edge, the edge on its top only.

The exercise card keeps v1's collar edge, because `setTable` has no `shape` look (§11, risk 6).

---

## 8. Per-block looks: all 29 blocks in VOCAB.md

Each block names `'v1'` or a `shape`-grade look (`check-def.mjs`: every look accepted by its block, at a grade a simple vibe may use). Eleven blocks take a shape look: `card · flat`, `youCard · flat`, `statRow · line`, `btn · square`, `segmented · boxes`, `kpi · plain`, `coachCard · flat`, `field · square`, `toast · square`, `fab · square`, `addTile · flat`.

The last twelve rows below are D.1's new blocks. The definition names them now, so the vibe is complete on the day the contract gains them; until then nothing reads them.

| Block | Look | What it draws in Oxblood |
|---|---|---|
| `card` | **flat** | An oxblood plate (`bar`) on the page. **No border**, radius 2, v1's padding. Head: the title in the eyebrow role (Schibsted 13/600 steel, sentence case), meta in dim, ⋯ in dim. |
| `youCard` | **flat** | As `card`. Wins and Improve lose v1's 3 pt side stripe; a **2 pt top border** in green `#3cc4a0` / pale yellow `#ffe07a` replaces it (8.02 / 13.54 on the card). Their titles still say which is which. |
| `eyebrow` | v1 | Type only: Schibsted 13/600, sentence case, steel (7.88 on a card). |
| `sectionHeader` | v1 | "How you're doing" in the eyebrow role (web by selector; native once Section and Sec are pointed at `type.eyebrow`, VOCAB §8.1), with v1's collar hairline running to the edge (1.24 on the page, decorative). |
| `screenHeader` | v1 | The eyebrow in steel over a Schibsted 24/700 h1 in bone. The nav buttons unchanged (34, collar edge, radius 3). |
| `sheetHost` | v1 | An oxblood sheet with 18 pt top corners and a knurl top edge. The grab handle in `grip` at 1.68 (v1 1.40; R8.5's 3:1 given up for the lit tag, §3). Black .60 backdrop plus a 3 px blur. |
| `sheetTitle` | v1 | Schibsted 18/700, left. |
| `statRow` | **line** | A box-score line: no tiles, no ground. The values on one baseline in Schibsted 20/800 tabular, 1 pt collar rules between columns, labels under them in 12/600 steel, sentence case. Mini stats follow once their switch site opens. |
| `kpi` | **plain** | The 2×2 grid of wells (`well` = the page, inside the card; collar edge; radius 3). **No corner tint** (`kpi` alphas 0). Label 12/600 steel once the engine points the KPI label's literal at `type.statLbl` (VOCAB §8.1: same arguments, no v1 change); until then it keeps v1's 9 pt caps in Schibsted. **The delta is bare**: Schibsted 800, signed, arrow kept, in good / bad / warn / dim (8.56 / 6.65 / 14.45 / 5.70 on the well), `pill*` at 0. Value 21/800 bone; unit steel; "last week …" dim. Sparkline lit bars in the subject colour, unlit in knurl (3.53). Day dots with knurl rings, today ringed in steel (chalk when done). |
| `headline` | v1 | Schibsted ExtraBold tabular figures at the sites' sizes, in their colour role (Fuel's zone colour; Weight's pale yellow, 13.54 on a card). |
| `chip` | v1 | **The one pill**: on the well, collar edge, Schibsted 12/600 steel. **Chosen is inverted**: a bone pill with oxblood words (15.98). Chips that are 44 tall stay 44. |
| `segmented` | **boxes** | Joined square cells (radius 2) with 1 pt collar rules between them, on `bar`. Segments in 12/700 sentence case, steel. **The chosen cell is inverted**: bone with oxblood words. At least v1's height. |
| `btn` | **square** | Every kind at radius 2. **Primary**: ice, oxblood words (12.43). **Plain**: raised `#352125`, bone words (12.83). **Ghost**: a 1.5 pt collar keyline, steel words (7.88); the visible text is its boundary (R2.2). **Danger**: a 1.5 pt vermilion keyline and words (6.23). Large buttons: 16/700 sentence case ("Start workout"). Pressed .97, disabled .4, 44 tall where v1 is. |
| `field` | **square** | A square write-in plate: radius 2, `bar` ground (the well for in-card inputs), a **knurl** edge at 3.31 / 3.53, so an empty field is findable (R2.2; v1's collar edge would be 1.16). Focus turns it ice (11.65). Label above in 13/600 steel. |
| `note` | v1 | Schibsted 13/400, lh 1.5, dim (5.34 on a card). |
| `toast` | **square** | An inverted plate: bone with oxblood words (15.98), radius 2, no shadow, centred above the dock, 2.2 s. |
| `settingsRow` | v1 | Full-width rows with collar rules between them. Label Schibsted 14/600 bone, value 12 steel tabular, › in dim. Pressed: white .04. The new **Look → Vibes** row is the same row. |
| `listRow` | v1 | Collar rules between rows. Name 13–14/600 bone, the line under it dim, the value right in Schibsted 15/800. PR and chosen states keep their non-colour cues. |
| `setTable` | v1 | The exercise card: `bar`, v1's 1 pt collar edge (the one bordered card, 1.16:1, quiet), radius 2, clipped. The 4×30 group tag in its plate colour, the name in Schibsted, ⋯, "Last …" in dim. Column heads in `statLbl` (12/600 steel, sentence case) where the head reads the role. A lifting block keeps its knurl keyline over an ice .03 wash, its title in ice (10.99). |
| `setRow` | v1 | The type badge on `raised`, radius 2, **no wash**: W pale yellow (11.60), F vermilion (5.34), D blue (6.13), a number in steel (6.75). Two well inputs (radius 3), values in Schibsted 15/700 bone, grey targets as dim placeholders. The e1RM in dim. **The check**: 30×30, 1.5 pt knurl edge (3.31). Done: the green fill with an oxblood ✓ (8.56), plus a green .10 row wash (chalk 12.78). The flash runs ice .28 into done. Drops hang on a blue rail at .70 (4.11). |
| `plateStrip` | v1 | "Per side" in `statLbl`, then chips on the six plate fills with oxblood Schibsted 800 figures (6.48–15.39), radius 2. "bar only" and "+x left over" word for word. |
| `calCell` | v1 | Cells at radius 3 (a `bar` ground on the web, none on native), raised when trained with bone numbers (12.83). Untrained numbers in dim (5.34). **Today**: ice at 800 with an ice edge (11.65). Up to four plate bars. |
| `chart` | v1 | v1's geometry in Oxblood's inks. Lines pale yellow (the pinned default), line 2 bone, bars blue, tracks `#352125`, grids collar. The heat strip pale yellow against collar (11.60). The calorie meter: the bone-white head (13.36 on the track), v1's zone alphas. The area wash and the end-dot glow belong to the pinned `analytics.js` and stay (§11, risk 4). |
| `dock` | v1 | Oxblood glass (rack .82 over an 18 px blur) under a collar rule. Five cells: v1's 22 pt icons over Schibsted 11/600 sentence-case labels ("You", "Train", "Fuel", "Weight", "Steps"), dim at rest (5.64), bone when active (15.81), with v1's 26×2 **ice mark** on the top edge (12.30). Same tabs, same order, same place, same height. |
| `fab` | **square** | An ice plate at radius 2, 14 above the dock: an oxblood + and "LOG FOOD" (literal caps until E5), v1's shadow. Pressed `#97bddc` (9.48), scale .955. At least v1's size. |
| `addTile` | **flat** | No washes, no borders: every tile sits on the well. The Photo tile is found by its ice icon well with an oxblood camera (12.43). Tags square (radius 2). The lit tiles' icon well and tag stay on `grip` (v1 geometry), which is dark enough to carry them: steel 4.67, chalk 8.88. No engine ask is needed. A tile that is off stays visible at v1's dimming. |
| `sessionChrome` | v1 | Glass stays on the live bar (D16). **Top bar**: oxblood glass under a collar rule; the session name in Schibsted; the clock in 20/800 tabular steel (8.34); the Coach chip (38, collar edge, ice "COACH", 12.33); the calendar button (38); Finish as an ice primary. **Rest line**: 3 pt, green running, vermilion over (6.87 / 5.34 on the track). **Rest pill**: raised, knurl edge, round (the pill radius), v1's shadow, the time in Schibsted 800 bone (12.83), +30 and Skip. **Peek bar**: raised, knurl edge, radius 2, v1's shadow. |
| `youHero` | v1 | A raised avatar (52, round) with its initial in steel (6.75). The greeting in Schibsted 27/800 bone; the name in ice until E4 lands, then bone (R5.4). The gear (36) on `bar` with a collar edge. The sub-line in steel, "Member since …" in dim. |
| `coachCard` | **flat** | `bar`, the 1 pt border drawn in the card's own colour, radius 2, **190 / 164, padding 14, Archivo on v1's metrics**. The ice speech mark and COACH (11.65); the lock ice when locked; the lines in bone and the reason in steel, all in Archivo; a caution line in warn (13.54); COACH ME over a collar rule; no photo. |

**Onboarding's choice cards** (`.ob-choice`, no block): chosen adds the raised fill as well as the accent border (auth.css:201), so chosen is not told by colour alone.

---

## 9. Tables

| Table | Oxblood |
|---|---|
| `groups` (lowercase) | chest `#ff6b4a`, back `#62a8ff`, legs `#ffe07a`, shoulders `#3cc4a0`, arms `#efe8dc`, core `#8f99a5`, fallback `#bcaaa4` (= steel) |
| `groupPlates` (UPPERCASE) | CHEST `#FF6B4A`, BACK `#62A8FF`, LEGS `#FFE07A`, SHOULDERS `#3CC4A0`, ARMS `#EFE8DC`, CORE `#8F99A5` |
| `plates` (45 / 35 / 25 / 10 / 5 / 2.5) | `#ff6b4a`, `#62a8ff`, `#ffe07a`, `#3cc4a0`, `#efe8dc`, `#8f99a5` |
| `importGroups` (web), `mark`, `subjects`, `admin`, `conf` | v1's roles, unchanged |
| `kpi` | every alpha **0** (default steel, fuel, weight, train, steps), so no path paints a corner wash |

---

## 10. Icons

- **The set** is `icons: 'oxblood'`, in `vibes/icons/oxblood.js`, and holds `spark` only. Every other key falls back to v1's through `vibe.js` `iconIn()` (`vibe.js:124-129`).
  - The orchestrator registers it in `vibe.js` `ICON_SETS` and in native.
  - Until then, `iconIn()` hands this vibe v1's sparkle. So registering the set is part of shipping the vibe, and a verifier that every non-v1 set defines `spark` (Q-E5) would catch the gap.
- **`spark`** must not be v1's four-point sparkle [R8.8, never-do 29].
  - Oxblood draws **≈, the approximately-equal sign, as two strokes**: `spark: icon(1.6, [path('M5 9.75c2.3-2.2 4.7-2.2 7 0s4.7 2.2 7 0'), path('M5 14.25c2.3-2.2 4.7-2.2 7 0s4.7 2.2 7 0')])`, on the 24 grid, round caps and joins, no fill.
  - Why this mark: Rack's copy marks an estimate with "≈", and the notice beside it says the numbers are approximate. It is not a star, sparkle, asterisk or bolt.
  - At the two notice sites (web `food.js:1234`, `:1239`; native `common.jsx:948`) the stroke is fixed at 1.6: at 16 px that is 1.07 px strokes with a 3 px gap. Drawn in warn (13.54 on a card).
  - **The paths are byte-identical to Navy's and Chalk's proposal**, so one shared simple set is a free merge (ask E6).
- **The dock, gear, calendar, Coach bubble, lock and add-tile icons** are v1's own hand-drawn paths, drawn in Oxblood's inks: dim at rest, bone when active, ice where lit.
- **Glyph keys**: none drawn. ‹ › ⋯ ✓ ✕ ↳ ✎ ⚙ ⚠ ▾ ▴ render as v1's do.
- **No images, no texture.** `images` is `{}`. A simple vibe draws no devices, textures or images, and nothing here would earn one: no leather grain, no stitching, no newsprint halftone.

---

## 11. The picker tile, and risks

**Picker entry** (registry order: v1, Iron Age, then the three simple vibes, so Oxblood is 5th):
- `{ id: 'oxblood', name: 'Oxblood', feel: 'Oxblood and ice blue.', experimental: false, scheme: 'dark' }`.
- **Tile data** (T10 §4.8): `pick: { ground: '#1a0f11', card: '#241518', edge: null, edgeW: 0, radius: 2, text: '#f3ece2', soft: '#bcaaa4', num: '#f3ece2', accent: '#a8d8ff', numFace: { web: 'oxblood-num', wdth: null, wght: 800, native: 'SchibstedGrotesk_800' }, numPt: 34.1, thumb: null, scrim: null }`.
- **numPt**: 34.1 gives a 24 pt cap height at cap 0.703. "315" measures 64.9 pt, inside the 92 pt box.
- **Readability on the tile**: name 15.98, feel 8.41, the number on its card 14.97, the ice bar 11.65.
- The `pick` key is not in the contract yet, so it is data for the registry, not a key in `oxblood.js`.

**Risks**
1. **The ground is 7.5 ΔE00 from v1's.** In a side-by-side screenshot the dark silhouette is v1's. The difference rests on the maroon cast, bone ink, the ice accent, the face, sentence-case labels, square borderless plates and no pills.
2. **Two blues** (§4): the accent and the data blue are 13.4 ΔE00 apart in normal vision, mostly by lightness.
3. **Flat cards sit 1.06:1 off the page** (ΔE00 3.78, above v1's own 3.37 step, but nothing outlines them). A `lead` surface (Navy's ask E1) would help here too. Oxblood proposes no value for it; if E1 lands, `palette.mjs` can search one.
4. **Charts**: the pinned `analytics.js` paints every line, ring and sparkline in pYellow with an area wash and an end-dot glow. A simple vibe cannot remove them (`chart · ink` is deep grade).
5. **Native heights**: `minLh` 1.234 makes single lines taller. Q checks the dock, buttons, chips and the segmented control.
6. **The exercise card keeps v1's collar edge** (`setTable` has no shape look), so it is the one bordered card.
7. **Web h1 at 320**: "September 2026" is 194.8 of 214 px. If the §13.3 harness clips it, h1 drops to 23/700 (186.7).
8. **Cold start**: native starts on v1's graphite launch screen (fixed), then turns oxblood once the account's vibe is read. The web's device hint paints oxblood on the first frame.

---

## 12. Engine asks and decisions left to Micah

**Engine asks** (for the orchestrator; each keeps v1 byte-identical; all are shared with Navy and Chalk):

| # | Ask | Without it |
|---|---|---|
| E3 (optional, no longer a condition) | `addTile · flat` draws the lit tiles' icon well and tag on `raised`, not `grip`. This is VOCAB wording only (a fill change, `shape` grade). | Nothing fails: Oxblood darkens `grip` to `#503a3e` on its own (steel on it 4.67). With E3, `grip` could return toward `knurl` and win back R8.5's 3:1 grab handle. |
| E4 | A colour role for the greeting's name (R5.4, never-do 17), which Oxblood sets to chalk. | The name stays ice blue: a P1 tell left in place. |
| E5 | Point the five literal caps sites at presets (ChartSub → eyebrow; the mini-stat labels and HeadlineU → statLbl; the add-tile tag and the FAB label to a preset of their own). | Those five stay v1's tracked caps on both clients. |
| E6 | One shared simple icon set (v1's icons plus the ≈ `spark`). | `vibes/icons/oxblood.js` as written, with the same paths. |
| E1 (optional) | A `lead` surface role for the tab's first box. | Every card on `bar`. |

**Decisions left to Micah**
- **The name and the feel line** ("Oxblood", "Oxblood and ice blue.") are working copy.
- **The grab handle's 3:1 (R8.5), given up (logged).** To keep the lit add tile's tag at 4.5:1 without an engine change, `grip` is `#503a3e`, not `knurl`. The handle is 1.68 on the sheet and a toggle's off track 1.79. Both beat v1's own (1.40 / 1.54) but miss R8.5's 3:1. If E3 lands, this can be re-tuned.
- **Q-P5, the guard's scope.** If Tailwind v4 binds, take rack `#1a0b0c` and accent `#a5d8ff` (GF11) and re-run the checks. The pressed state is already the guarded `#97bddc`.
- **Whether simple vibes may name `shape` looks at all** (VOCAB §9). Oxblood names eleven. Held to `'v1'` everywhere, it keeps only colour, type and radius: v1's shapes rounded to 2–3, with v1's bordered cards, stat tiles, KPI corner washes and pill toast and FAB.
- **The Coach card's face** is Archivo here. A Schibsted table would need the fixed line heights raised for `minLh` 1.234, plus a full verify-coach-surface run in this vibe.

---

## 13. What Oxblood never does

**Colour**
1. Never a second accent, and never ice on data, a verdict or a done set. Done is green and always carries its ✓.
2. Never ice beside back, fat or water as the only cue (the two-blues rule).
3. Never a yellow, gold, amber or brass accent: that is v1, and brass sat 1.6 from Navy's gold.
4. Never a neutral or stock-grey ground. The page is chromatic oxblood, cleared against all 242 Tailwind v3 defaults. Never drift a surface toward `stone-900` or `mauve-900`.
5. Never neon: the accent stays pale (OKLCH C 0.074). No cyan, lime or glow.
6. Never text under 4.5:1, and never a fourth grey (faint = dim).
7. Never up or down by red against green alone: the arrow and the sign are always there.

**Surfaces and containers**

8. Never a border on a card (the exercise card's inherited hairline excepted), and never a box inside a box of the same fill.
9. Never a coloured side stripe: Wins and Improve use a top border.
10. Never a delta pill, a tag wash or a KPI corner glow.
11. Never stat tiles: the box-score line.
12. Never a pill on anything but a chip (and v1's rest pill, whose look this vibe does not touch).
13. Never a gradient wash, a coloured glow, or glass beyond the dock, the live bar and the sheet backdrop.

**Type**

14. Never tracked caps on a type role, never an uppercased unit, never a lowercase transform. 'COACH ME' stays as authored.
15. Never a type role under 11 pt, and never a weight under 400.
16. Never a third family, and never a monospace for numbers or labels (Menlo stays only where v1 uses `mono`).
17. Never Schibsted on the measured surfaces: they keep Archivo on v1's metrics.
18. Never a `font-weight` rule on the web; weight only through `font-variation-settings`.

**Theme**

19. **Never leather or newsprint cosplay.** No leather grain or stitching, no belt buckles, no tooled borders, no newspaper mastheads, datelines, column rules, halftone or "EXTRA!" type, no Schibsted or newspaper names. The ground's colour and the face are the only references; everything else is Rack.
20. Never period faces, caps heads or rules (Iron Age's), and never condensed scoreboard figures, panels or inversions (Meet Day's).

**Art and platform**

21. Never v1's sparkle, emoji, SF Symbols or a stock icon library.
22. Never a texture or an image, and never an AI-made image.
23. Never new motion: v1's ease-out 140 / 240 ms only.
24. Never a change to the dock's tabs, order, labels, place or height. Never a gate, a Light / Dark switch, or the name "Dark mode".
25. Never a changed word or number: vibes change how Rack looks, never what it says or does.

---

## 14. Where the numbers come from

- **Colour**: `node ~/dev/vibes-night/tools/oxblood/palette.mjs` (set `QUIET=1` for the summary). It writes `tools/oxblood/contrast-table.md`.
- **The definition against the contract**: `node ~/dev/vibes-night/tools/oxblood/check-def.mjs`. All checks pass; it exits 0.
- **Fonts**: `node ~/dev/vibes-night/tools/oxblood/subset.mjs`, then `node ~/dev/vibes-night/tools/t5-check.mjs` on the four statics and the variable file.
- **Downloads**: three `node tools/fetch.mjs` calls, to `https://raw.githubusercontent.com/schibsted/schibsted-grotesk/d485f61f105e1b3935f4d21dfb4d371359798603/fonts/ttf/SchibstedGrotesk-{Regular,SemiBold,Bold}.ttf`. They are scratch files in `tools/oxblood/fonts/`, and nothing was committed.
- **Fit**: `node ~/dev/vibes-night/tools/oxblood/measure.mjs` and `node ~/dev/vibes-night/tools/oxA-measure.mjs`.
- **Sources read tonight**:
  - SYNTHESIS §0–§5.3, §5.8–§5.9, §6;
  - track 4 §3.1–§3.2 and its computed Oxblood table;
  - track 5's Schibsted entries and sources;
  - google/fonts `METADATA.pb` and `OFL.txt` for Schibsted Grotesk, and the upstream `OFL.txt` (on disk under `research/fonts/schibstedgrotesk/`);
  - PLAN §2 and §3.4; VOCAB and `vocab.js`; ROLES; `v1.js`, `index.js` and `vibes/icons/v1.js`;
  - web `vibe.js:36-129`, `rack.css:252-372, 1653-1694, 2120-2124`, `workout.js:392-413`;
  - native `src/ui/theme.js:355-367, 680-713` at rack-mobile `main`;
  - Navy concept A, as a sibling in the same run.
