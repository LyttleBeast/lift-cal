# Clear sky: the final spec (deep-2)

V59 Phase D, slot `deep-2`, id `clear-sky`. Written 2026-09-29 from concept A ("the numeral"), which won the panel, with grafts from concept B ("the line"). Nothing here is approved, committed or deployed.

- **The definition** is `wt/web-design2/vibes/defs/clear-sky.js`: pure, imports nothing, frozen all the way down, and every v1 role filled. It is not registered; the orchestrator adds the `index.js` entry (§14).
- **The icon set** is `wt/web-design2/vibes/icons/clear-sky.js`. It holds v1's icons except `spark`, plus three glyph drawings. Everything else falls back to v1.
- **The one thing the contract cannot say yet is the concept's signature**: one huge Light numeral per screen (request **R1**, §13). Until R1 lands, the definition names `headline: 'v1'` and holds no key for the numeral. R1 is three edits to the definition and nothing else (§13, R1-f). Both judges made A conditional on it. **If R1 is refused, see §15 item 1 before building.**
- **Every number below was computed tonight from the files**, by the scripts in `~/dev/vibes-night/tools/clear-sky-final/` (§19). Their outputs are saved in `design/clear-sky/final/`.
  - Colour numbers use track 4's library (`tools/colour/colour-lib.mjs`). Ratios are **floored** to two places, never rounded.
  - Widths use opentype.js on the Archivo statics that native ships.

| Check | Result |
|---|---|
| `check-def.mjs`: every v1 leaf path, every ROLES entry through `valueOf()`, the contract's per-definition rules, faces, icons | **169 / 169 pass** |
| `contract-copy.mjs`: the real `tools-check/vibes-contract.mjs`, run over a scratch copy of `vibes/` whose registry lists `clear-sky` (the worktree's `index.js` is never edited) | **All 521 checks pass** |
| `contrast.mjs`: every text ink on every surface and every surface role, fills, graphics, colour vision, framework distance | **403 checks, 0 failures** |
| `build-native.mjs`: native's own `build()` (rack-mobile main, engine v2) run on `clear-sky.js` | **Builds; every resolved face is a registered key** |

---

## 1. Name and idea

- **Name:** Clear sky. **Feel line:** "Pale sky, open and calm." (24 characters, one line at 375 pt.) Both are Micah's to approve.
- **The idea, in two sentences.** Each screen is a pale sky with one number standing in it, huge and light, the way a forecast gives you the temperature before anything else: the Goal's pace, Weight's latest, Fuel's calories left, Steps' today. Everything else is quiet: words in the case they were written in, rows lying on the sky with nothing between them, one white slip per tab for the thing you touch, and one prussian blue for the thing to do next.
- **Why a sky page (R3.1: the ground's reason, written down).**
  - The slot's feel is "open and calm", and research built this palette for it [T4 GF6].
  - The ground is one flat hex, the colour of a clear morning. It carries no gradient, cloud, sun or live-sky imagery.
  - It is cool (R−B = −52), so it is far from the AI-cream band (R3.5). It is **70.6 ΔE00 from v1's ground**, 13.2 from Chalk's and 21.7 from Iron Age's.
  - The white slip stands 1.56:1 off it by value, so nothing needs an outline.
- **What a lifter sees.** It does not look like a dashboard. It is a blue page with almost nothing on it but the number that matters on this screen, set in a thin tall figure you can read from the bench, with the few lines that explain it underneath. The white slip holds the thing you do: log a weight, read the day's bar, add steps. Every list lies on the sky with no box around it.
- **Before R1 lands**, the same page draws the four figures at their call-site sizes in Archivo Regular. It is calm and well made, but it lacks its one surprise. That is why §15 item 1 exists.

---

## 2. How the winner was picked, and what was grafted

### 2.1 The scores

The formula: distinct + 2 × (10 − "AI-made") + readability + fits Rack + buildable. The maximum is 60 per judge.

| Concept | Judge 1 | Judge 2 | Total |
|---|---|---|---|
| **A: the numeral** (Archivo + Archivo Light hero, research pick D2-a) | 7 + 12 + 8 + 6 + 5 = **38** | 7 + 10 + 8 + 6 + 6 = **37** | **75** |
| B: the line (no hero; word-sized sparklines, ink primaries, outline plates) | 4 + 10 + 7 + 7 + 8 = 36 | 4 + 8 + 7 + 7 + 8 = 34 | 70 |

- There was no tie, so the tie-break (readability) was not needed. A also leads on readability (16 against 14).
- **Both judges picked A.** Judge 1's pick carries a condition: R1 must land in the vocabulary and the engine first. Until then the definition names `headline: 'v1'`, because `vibes-contract.mjs:1405` rejects a look its block does not accept. If R1 is refused, Judge 1 would build B with A's yellow instead. Judge 2 said a refusal must be reported, never quietly shipped as v1 headlines.
- **What decided it:** on a sky-and-navy palette, which is a common "calm health app" look, only A has a device no other vibe owns: a single huge *light* figure. Chalk's hero is Condensed ExtraBold, Iron Age's is Besley, and Meet Day's is split-flap. B's grammar is Iron Age's in sans on blue: ink blocks, outline plates, rule-hung cards and 0.5 pt hairlines. B's Fuel and Weight screens are Chalk's on blue.

### 2.2 Grafts taken (each re-checked by the scripts in §19)

| # | Graft | From | What it fixes, measured |
|---|---|---|---|
| 1 | Darker greys: `dim` `#404d5b`, `knurl` `#526578`, `grip` `#768ba0` | B; both judges | dim on the sky goes **4.70 → 5.31**. knurl, the input underline, goes **3.19 → 3.70** on the sky and **3.94 → 4.56** on a done row. The grab handle goes 3.17 → **3.38**. These are the margins a lifter reads in glare. No group colour moved, so colour vision is unchanged |
| 2 | Neutral `raised` = `track` `#d9e3ea` (OKLCH C 0.014) | B; Judge 2 | This settles A's own question about the R2.7 guard's scope: a neutral fill answers to R3.1. dim on it is 6.63. As fills on it, pYellow is 3.89 and pChrome 4.00. It steps 1.24 lighter than the sky and 1.25 darker than white |
| 3 | The `spark` as a **±**, "give or take", in place of A's hollow ring | B; both judges | At 16 px beside warn text, a ring reads as an empty status dot. The ± is re-centred on the grid (4.2 to 19.8 with its caps). The gap between plus and bar is 3.4 units (2.3 px at 16 px), where B's drawing closed to 1.6 px (§11) |
| 4 | **The caps tag**: strings *authored in lower case* keep v1's capitals, at 11 / 600, tracked .06 em | B; both judges | A said the calorie band labels would read "Cut / Hold / Target" in sentence case. **That was untrue:** `food.js:827` and `:830` author 'cut', 'hold', 'gain' and 'target' in lower case, and VOCAB rule 2 lowers caps only on strings written in sentence case. The audit (`case-audit.mjs`, finished by reading the sites) found 12 such sites. §5.5 lists them |
| 5 | Sizing discipline: body **15** (A's own fallback); buttons **14 / 600** | B; both judges | Every button label measured is **narrower** than v1 native's 14 / 700 +.02 em: "Finish" 39.5 against 42.2 pt, "Weighed earlier?" 109.4 against 117.1 (`widths.mjs`). So the session bar's Finish and Steps' quick-add row are no wider than they are today |
| 6 | The build notes for `kpi · word` and `chart · ink`, which the pinned `analytics.js` needs: hide the area path and `.spark-glow`, a non-scaling 1.5 stroke, and a 3.5 pt end dot | B; both judges | §14.3. The notes also cover stacked segments parted by 1 pt page-colour gaps, and legend keys drawn as 12 × 3 strokes (request R7) |
| 7 | Drop rail at pBlue **.85** (A had .70) | B | 3.06 → **4.03** on the sky, and **4.76** on a done row |
| 8 | Tabular figures at the Archivo 400 sites (the e1RM, "last week …") | Judge 2 | Archivo 400's default digits are not uniform ('1' is 521 wide). Both sites sit inside deep looks that re-set type (`setRow · ruled`, `kpi · word`) |
| 9 | Ratios floored, never rounded | Judge 2 | pYellow on the sky is 3.12, not the 3.13 A reported |
| 10 | Titles smaller than A's 34 | Judge 2 (who proposed 28) | 28 still wraps "September 2026" at web 320 (207.8 pt against 200 of room). **26 fits (192.9)** and keeps v1's h1 size. The hero at 76 is then 2.92× the title, the nearest the lineup gets to R6.9's 3× |

**Kept from A against B** (both judges agreed):
- pYellow `#8c6900`, OKLCH hue 85.5. B's `#966103` sits at hue 72.0 and reads orange next to "Yellow — hold" and "The yellow line is the daily average".
- The 4 pt slip, not B's radius-14 white card, which is the Weather-module silhouette.
- Square tags, not pills.
- No shadow on the FAB.
- A done row that **clears toward white**, not one washed green.

### 2.3 Not grafted

- **B's `btn · inverse` and `fab · inverse`** (ink primaries) and **`plateStrip · stamp`** (outline plates). These are Iron Age's signature devices. Taking them would make two light vibes siblings in the gallery.
- **B's done-row wash** (done at .10). It left dim, W, D, good and warn at 4.61–4.79 on the row a lifter reads between sets.
- **B's 700 figures everywhere with no scale jump** (the flat-scale tell), and its h2 at 20 / 700.
- **B's pill chips and its FAB and toast shadows** (the soft-float tell).
- **B's 0.5 pt hairline between set rows as a choice.** Clear sky holds 0.5 only because the contract accepts nothing smaller (R5).
- **A's body and buttons at 17.** They were unmeasured at 320 and would lengthen every sheet.

### 2.4 What the final build changed on its own, beyond both concepts

| Change | Why, measured |
|---|---|
| The white washes (`setDone`, `setFlash`, `reviewBg`) are spent on `lift` = the slip's white, not on `bar` | Same colours to the hex. On the web a vibe's tints are hand rules over `rack.css`'s literal `rgba(var(--x-rgb), a)`, and `--lift-rgb` is a channel where `bar` has none |
| `tint.setFlash` = white at .90, not accent .20 | An accent flash left dim at **3.80** and W at 3.76 for 600 ms. The white flash holds every ink a set row carries at **7.91 or better**, then settles into the cleared row |
| `tint.block` = 0: a lifting block has no wash | A said "no wash box". At 0 every ink keeps its sky ratio (dim 5.31). At .04 it was 4.99, with pGreen at 4.58 |
| `tileHero` = `tileLit` = the well (`#b1cfe5`) | `addTile · flat` draws no wash. Accent .10 over the well would leave a fallback's dim line at exactly 4.50 |
| `calCell · open`, not A's `ruled` | A wanted no lines between cells. `ruled` draws `shape.rule.hair`, and the contract accepts no 0 there. `open` draws no lines today. With R5 it becomes `ruled` with hair 0, as A drew it |
| `shape.rule.hair` 0.5 | The finest value `paramOk` accepts (> 0). R5 asks for 0 |
| h1, `headline`, `youGreet` at **26 / 400** | §2.2 row 10 |
| The heat strip, the day-not-over bar and the calorie ticks, re-drawn for a light page | §8 `chart`: the pinned paints were measured on the sky (`heat.mjs`) |
| `themeColor` stays v1's `#14161a` | R3.3: leave the meta alone. The `band` strip is what goes dark under the status text |

---

## 3. Colour: every role

This is track 4's `deep2-sky` [T4 GF6] with four hexes changed: `pYellow` (A), and `dim`, `knurl` and `grip` (B). Every role the palette never set is filled in. Every value is 6-digit hex. No `exact` string and no `LEGACY_EXACT` spelling appears.

### 3.1 The `colors` keys (43, plus `band`)

| Role | Clear sky | v1 | Job in Clear sky, and its key numbers |
|---|---|---|---|
| `rack` | `#b1cfe5` | `#14161a` | The page: sky. OKLCH 0.840 / 0.045 / 239.9. Nearest Tailwind v3 default is `blue-200` at **5.83** (R2.7 needs 5) |
| `bar` | `#f9fbfc` | `#1c1f26` | The lead slip, sheets, fields, the dock, the session bar. Neutral (C 0.003). 1.56 off the sky |
| `collar` | `#9bb8cf` | `#262a33` | Decorative hairlines only: the stat line's column rules, settings dividers, chart grids, the dock's top rule. 1.27 on the sky, 1.99 on white. Never a control's only edge |
| `knurl` | `#526578` | `#333844` | Structure and control edges: the 1 pt head line, input underlines, field borders, the check's edge, the rest pill and peek bar edges. **3.70** on the sky, 5.79 on white, 4.56 on a done row, 4.61 on raised |
| `chalk` | `#0f1a24` | `#f2f0eb` | The ink, blue-black, never `#000000`. 10.82 on the sky, 16.95 on white |
| `steel` | `#2c3b48` | `#8d939f` | Labels, units, secondary lines. 7.07 on the sky, 11.07 on white |
| `dim` | `#404d5b` | `#5c6270` | Notes, placeholders, the e1RM, the dock at rest. **5.31** on the sky, 6.56 on a done row, 8.32 on white |
| `faint` | `#404d5b` | `#333844` | Equal to `dim` on purpose: no fourth, fainter grey |
| `pRed` | `#6e0005` | `#d6252b` | Chest, protein, gain. 7.76 on the sky |
| `pBlue` | `#02507b` | `#2e7fd9` | Back, fat, water, training, cut, drop sets. 5.30 on the sky |
| `pYellow` | **`#8c6900`** | `#f0be1e` | Legs, carbs, the fuel and weight subject, hold. HSL 45°, OKLCH h 85.5. As a graphic on the sky 3.12; as text on white 4.89; small text inks as `warn` (`inkOf`) |
| `pGreen` | `#045d42` | `#2aa85c` | Shoulders, steps. 4.87 on the sky |
| `pWhite` | `#25272b` | `#e8e5de` | Arms, the steps subject. It is ink, because no white reaches 3:1 on a light page [T4 R3]. 9.20 on the sky |
| `pChrome` | `#676d77` | `#a8aeb8` | Core. As a graphic on the sky 3.20; small text inks as `dim` |
| `good` | `#03553c` | `#2aa85c` | A bluish green, still "green" for HUE_NAMED. 5.45 on the sky |
| `warn` | `#634800` | `#f0be1e` | A dark amber, darker than pYellow, so "amber the other way" (`you.js:1067`) stays true. 5.25 on the sky |
| `bad` | `#6e0005` | `#d6252b` | = pRed. Good against bad survives colour-vision deficiency on its own (§4.4) |
| `onYellow` | `#ffffff` | `#141414` | Alias of `onAccent` |
| `onGreen` | `#ffffff` | `#0d1a11` | Alias of `onDone` |
| `onPlate` | `#f9fbfc` | `#14161a` | Figures on a filled plate chip: 4.89 or better on all six |
| `white` | `#ffffff` | `#ffffff` | Alias of `onDanger` |
| `pYellowPressed` | `#00203e` | `#d9a90f` | Alias of `accentPressed` |
| `fallback` | `#2c3b48` | `#8d939f` | Alias of `groups.fallback`, which follows steel |
| `accent` | `#083366` | `#f0be1e` | Prussian. **One job:** the primary action, the FAB, focus, today, the dock mark, Coach's voice, links, the PR highlight, a toggle's on track. Never data, never status, never "chosen" (chosen is inked in). HSL 213°, outside the banned 240–295° band. **6.08** from `blue-900`. 7.71 on the sky, 12.07 on white |
| `focus` | `#083366` | `#f0be1e` | Focus rings and focus borders. `.wpe-row input:focus` stays pBlue (ROLES `except`) |
| `accentPressed` | `#00203e` | `#d9a90f` | The FAB pressed. 6.00 from `slate-800`; white on it 16.45 |
| `onAccent` | `#ffffff` | `#141414` | 12.53 on the accent |
| `danger` | `#6e0005` | `#d6252b` | A keyline and words; a fill only on the swipe-to-delete panel |
| `onDanger` | `{ web: '#ffffff', native: '#ffffff' }` | `{ web: '#fff', native: '#ffffff' }` | One colour, with v1's split shape kept (as Chalk does). 12.61 |
| `done` | `#045d42` | `#2aa85c` | The filled set check, the rest line while it runs. 4.87 on the sky, 6.01 against a done row |
| `onDone` | `#ffffff` | `#0d1a11` | The ✓ on the check: 7.92 |
| `well` | `#b1cfe5` | `#14161a` | The recess inside a white surface is the sky itself, as v1's well is its page. It is a window back to the page, never a box of the slip's own fill (N9) |
| `knockout` | `#f9fbfc` | `#14161a` | Words cut out of the ink fill: 16.95 |
| `inverse` | `#0f1a24` | `#f2f0eb` | Chosen tags, your answers in the Coach sheet and the toast are **inked in** |
| `calMark` | `#ffffff` | `#f2f0eb` | "The white head" (HUE_NAMED). Each mark carries a 1 pt ink ring (§6.5) |
| `raised` | `#d9e3ea` | `#262a33` | A control up off its ground: plain buttons, tags, the rest pill, the peek bar, the Coach bubble, a pressed row. Lighter than the sky (1.24) and darker than white (1.25), so it reads on both |
| `track` | `#d9e3ea` | `#262a33` | = raised: the empty part of a meter, and the heat strip's untrained day (§8 `chart`) |
| `grip` | `#768ba0` | `#333844` | The grab handle (**3.38** on white; v1's is 1.40), a toggle's off track under a steel knob (3.26), the trajectory dot with no verdict |
| `onWarn` | `#ffffff` | `#141414` | Native trial banner ink on its solid warn bar: 8.54 |
| `shade` | `#0f1a24` | `#000000` | Every shadow and scrim is the ink, never black |
| `lift` | `#f9fbfc` | `#ffffff` | The white wash, as in v1, here the slip's own white. It clears a done row, flashes a ticked set and pales the callout. It is also the one near-white the web can put an alpha on: `--lift-rgb` is a channel token, and `bar` has none (§14.3) |
| `tileHero` | `#b1cfe5` | `#1e1f1e` | = the well (§2.4) |
| `tileLit` | `#b1cfe5` | `#17181a` | = the well |
| `band` (engine v2) | `#0f1a24` | `null` | The strip under the installed web app's always-white status text. White on it 17.59 |

### 3.2 `alpha`

v1's eight helpers, unchanged: `yellow → pYellow`, `red → pRed`, `blue → pBlue`, `green → pGreen`, `ground → rack`, `accent`, `danger`, `warn`.

### 3.3 `tint`: all 30, as role and alpha

"Over" gives the flattened colour, from `contrast.mjs`.

| Tint | Clear sky | Result | Why |
|---|---|---|---|
| `setDone` | lift .45 | `#d1e3ef` over the sky | **A done row clears**: it lightens toward white. The filled green check carries "done" (6.01 against the row), so colour is never the only cue. On it: dim 6.56, W 6.48, D 6.54, the knurl underline 4.56 |
| `setFlash` | lift .90 | `#f2f7fa` | A white flash that settles into the cleared row. Every set-row ink is 7.91 or better at the peak |
| `tagW` / `tagF` / `tagD` | raised 0 | none | `setRow · ruled` draws the badge as a bare letter in `tagInk` |
| `dropRail` | pBlue .85 | 4.03 on the sky | A 3:1 graphic; 4.76 on a done row |
| `dropAdd` | pBlue .45 | — | + Drop's border. The button carries its words |
| `pickSel` | accent .08 | `#e6ebf0` over white | A chosen picker row: dim 7.20. Its check carries the state |
| `block` | accent **0** | transparent | A lifting block is a rule-framed group with no wash |
| `coachBase` / `coachLow` / `coachHigh` | accent .14 / .07 / .38 | — | v1's pulse on the set check, which holds no text at rest |
| `rowPress` | raised 1 | `#d9e3ea` | A pressed row lifts to raised: lighter on the sky, darker on white, visible on both. dim on it 6.63 |
| `pillBase` / `pillUp` / `pillDown` / `pillWarn` | lift / good / bad / warn at 0 | none | No delta pills (R6.6). `kpi · word` then draws each delta as bare signed text with its arrow |
| `zoneCut` / `zoneHold` / `zoneGain` | pBlue .24 / pYellow .40 / pRed .26 | `#a5c0cf` / `#bab28c` / `#bda8ae` over the track | Pale blue, khaki-yellow and rose, 1.46 / 1.63 / 1.71 off the track. They are muted, as v1's own bands are. "Blue — cut", "Yellow — hold" and "Red — gain" stay true |
| `dockGlass` / `wkBarGlass` | rack .82 / .90 | not drawn | `dock · solid` and `sessionChrome · flat` are opaque. These values exist for a v1-look fallback |
| `backdrop` | shade .40 | — | Light grounds dim at .40–.45 (R3.3). The sheet stands 3.60 off the dimmed sky |
| `trajGood` / `trajWarn` / `trajBad` | good / warn / bad .18 | — | v1's halo on the trajectory dot |
| `reviewBg` | lift .55 | `#d9e7f2` over the sky | **The callout**: the Weekly review's "Next week" is a paler band of sky. On it: chalk 13.96, steel 9.12, dim 6.85 |
| `reviewBorder` | lift 0 | none | The callout has no border. No container role has both a fill and an edge |
| `runway` (v2) | knurl .45 | 1.82 on the track | The calorie runway's hatch, decorative. v1's rack hatch would vanish on a white slip |
| `runwayEdge` (v2) | knurl 1 | **4.61** on the track | The runway's right edge, a mark |

### 3.4 Data tables and the v2 colour maps

- **`groups`, `groupPlates` (upper case), `plates`**: each entry is its role's hex (ROLES `follows`). Chest `#6e0005`, back `#02507b`, legs `#8c6900`, shoulders `#045d42`, arms `#25272b`, core `#676d77`. `groups.fallback` is `#2c3b48`, which is steel.
- **`importGroups`, `mark`, `subjects`**: v1's role maps, unchanged.
- **`kpi`**: every alpha is 0, because `kpi · word` draws no tile tint.
- **`admin`**: v1's maps, except that native's Pro and Custom pills take `pBlue` rather than `pYellow`. Mustard at 9 pt would be 3.12 on the sky; the data blue is 5.30. The web's `.adm-flag.lit` is already blue, so the two clients now agree.
- **`conf`**: good / warn / bad.
- **`tagInk`** (v2): W → `warn` (pYellow is a graphics-only ink here), F → `pRed`, D → `pBlue`.
- **`inkOf`** (v2): pYellow → `warn`, pChrome → `dim`. The other four ink themselves (4.87 or better on the sky).

---

## 4. Contrast and colour vision (`contrast.mjs`, read from `clear-sky.js` itself)

**403 checks, 0 failures.** Every pair under 4.5 in the full matrix (420 of them) is listed in `contrast.out.txt` with the reason it never carries text: an ink on its own colour, or a fill with no text on it.

### 4.1 Text (4.5:1) on every surface a word actually sits on

| Ink | sky | white | raised | done row | flash peak | callout | picker row |
|---|---|---|---|---|---|---|---|
| chalk | 10.82 | 16.95 | 13.51 | 13.35 | 16.30 | 13.96 | 14.66 |
| steel | 7.07 | 11.07 | 8.83 | 8.73 | 10.65 | 9.12 | 9.58 |
| dim / faint | 5.31 | 8.32 | 6.63 | 6.56 | 8.00 | 6.85 | 7.20 |
| accent | 7.71 | 12.07 | 9.62 | 9.51 | 11.61 | 9.94 | 10.44 |
| good | 5.45 | 8.54 | 6.80 | 6.73 | 8.21 | 7.03 | 7.39 |
| warn = inkOf.pYellow = W | 5.25 | 8.23 | 6.56 | 6.48 | 7.91 | 6.78 | 7.12 |
| bad = danger = pRed = F | 7.76 | 12.15 | 9.68 | 9.57 | 11.68 | 10.00 | 10.51 |
| pBlue = D | 5.30 | 8.30 | 6.61 | 6.54 | 7.98 | 6.84 | 7.18 |
| pGreen | **4.87** | 7.63 | 6.08 | 6.01 | 7.34 | 6.28 | 6.60 |
| pWhite | 9.20 | 14.41 | 11.48 | 11.35 | 13.86 | 11.87 | 12.47 |

- **Two surfaces carry only their own words:**
  - the estimator notice (warn .07 over white): warn text 7.36, ink 15.15;
  - the web trial bar (warn .10 over the sky): warn text **4.59**, the thinnest text margin in the vibe.
- **Ink on its own fill:** onAccent 12.53 (pressed 16.45); knockout on inverse 16.95; onDanger 12.61; onDone 7.92; onWarn 8.54; white on the band 17.59; the banner texts 12.61 on pRed and 7.92 on pGreen.
- **onPlate** on the six plates: 12.15 / 8.30 / 4.89 / 7.63 / 14.41 / 5.01.
- **Large-text-only pairs:** pYellow and pChrome on the sky, at 3.12 and 3.20. They are never set as small text there (`inkOf`). On white they reach 4.89 and 5.01, so Fuel's hold-zone figure on the lead slip is text-level.
- **The four hero figures (R1):**
  - the Goal's pace and Weight's latest: chalk on the sky, 10.82;
  - Steps' today: chalk on white 16.95, or good past the goal 8.54;
  - Fuel's figure in its zone colour on white: pBlue 8.30, pYellow 4.89, pRed 12.15, chalk 16.95, and bad with no zones 12.15.

### 4.2 Graphics and control edges (3:1)

| Graphic | Ratio |
|---|---|
| knurl on sky / white / raised / done row | 3.70 / 5.79 / 4.61 / 4.56 |
| grab handle (grip) on white; steel knob on grip; white knob on accent | 3.38; 3.26; 12.53 |
| accent on sky / white (focus, today, the dock mark) | 7.71 / 12.07 |
| done check on the sky; against a done row | 4.87; 6.01 |
| drop rail on the sky; on a done row | 4.03; 4.76 |
| dock icon at rest (dim) / active (chalk) on white | 8.32 / 16.95 |
| tab underline (chalk) on sky / white | 10.82 / 16.95 |
| plate marks on the sky: pRed / pBlue / pYellow / pGreen / pWhite / pChrome | 7.76 / 5.30 / **3.12** / 4.87 / 9.20 / **3.20** |
| plate fills on the track | 9.68 / 6.61 / 3.89 / 6.08 / 11.48 / 4.00 |
| the calorie marks' ink ring against the cut / hold / gain wash / bare track | 7.60 / 6.93 / 6.64 / 10.61 |
| the white head against the pBlue / pYellow / pRed fill | 8.62 / 5.07 / 12.61 |
| runway edge on the track; rest line done / danger on white | 4.61; 7.63 / 12.15 |
| trajectory dot good / warn / bad on the sky | 5.45 / 5.25 / 7.76 |

- **Decorative steps** (information; none carries meaning alone): white off the sky 1.56 (C17 asks for 1.25); raised off sky / white 1.24 / 1.25; done row off the sky 1.23; callout off the sky 1.28; collar on sky / white 1.27 / 1.99; the runway hatch 1.82.
- **The one sub-3 graphic with a job is the trajectory dot with no verdict**, grip on the sky at **2.16**. v1's is 1.40 on its card. The sentence beside it says the same thing, so the dot is not the only cue (WCAG 1.4.11).
- **v1 pairs made better:**
  - dim on the card 2.69 → 8.32;
  - dim on the page 2.96 → 5.31;
  - the grab handle 1.40 → 3.38;
  - bad as text on the card 3.26 → 12.15;
  - a control edge 1.40 → 5.79.

### 4.3 Chart paints on the sky (`heat.mjs`)

- **The heat strip.** v1's faint trained cell against an untrained one is 1.68.
  - Clear sky redraws it with `on: pYellow`, `off: track` and a lift of d .10 below .80.
  - Faint against untrained is **1.88**, full against untrained 3.89, and full against the sky 3.12.
  - Leaving the pinned collar gave 1.06.
- **Steps' heat map** (`steps.js:67`, not pinned) is the same grid in pGreen with the same collar cell. On the web the same two rules catch it; natively it is the same `HeatStrip` with `color={pGreen}`, so `off` and `lift` reach it too.
  - Faint against untrained is **2.13** (v1's is 1.34), full against untrained 6.08, and full against the sky 4.87.
- **The day-not-over bar** (the last bar of four You charts) is drawn at opacity **.66** on the sky.
  - The occurring colours reach pRed 4.31, pBlue 2.85, pWhite 3.95 and good 2.90, against v1's 1.39, 1.63, 3.05 and 1.85.
  - The carb segment in pYellow reaches **2.07 against v1's 2.49**. It is the one plate that falls short, because opacity high enough to reach v1's figure would erase the "not over" cue (full against dim would be 1.2). This is listed for Micah (§15).

### 4.4 Colour vision (Machado 2009, severity 1.0, linear RGB; CIEDE2000)

| | Worst pair |
|---|---|
| normal | **18.13** (back / core) |
| deuteranopia | **15.42** (shoulders / arms) |
| protanopia | **15.84** (back / core) |

- All 15 pairs in all three views are 15.42 or more. R2.5 asks for 12. This is the best set in the lineup.
- **Good against bad:** 51.39 normal, 15.31 deuteranopia, 14.34 protanopia.
- **Warn against bad:** 7.20 under deuteranopia (information). Nothing tells them apart by colour alone: the confidence pill carries its word, and the trajectory dot sits beside its sentence.
- **The accent against data and status** (normal / deut / prot): the closest is pBlue at 10.85 / 7.53 / 8.51, where the two part mainly by lightness. The rest are 17.36 or more. R2.4's 10 in normal vision holds. The accent is never a fill on data, so it never sits beside back, fat or water as the only cue.
- **Every up and down keeps its arrow or sign.**

### 4.5 Guard and lineup

| Hex | OKLCH L / C / h | Nearest Tailwind v3 | Gated by R2.7? |
|---|---|---|---|
| rack `#b1cfe5` | 0.840 / 0.045 / 239.9 | `blue-200` 5.83 | yes; passes |
| accent `#083366` | 0.325 / 0.100 / 256.0 | `blue-900` 6.08 | yes; passes |
| accentPressed `#00203e` | 0.240 / 0.068 / 250.2 | `slate-800` 6.00 | reported (Q-P5) |
| bar `#f9fbfc`, raised / track `#d9e3ea` | C 0.003 / 0.014 | `gray-50` 0.52, `slate-200` 2.38 | neutral (C < 0.015): R3.1 governs them |
| pYellow `#8c6900` | 0.541 / 0.111 / 85.5 | `yellow-700` 9.20 | plates are not gated (research's `#966103` was 3.23 from it) |

- **Ground distance:** v1 70.6, Chalk 13.2, Iron Age 21.7.
- **Accent distance:** v1 77.4, Chalk's mulberry 24.9, Iron Age's carmine 35.7.
- **Cream band:** R−B = −52, nowhere near it.

---

## 5. Type

### 5.1 The family: Archivo, and only Archivo

- **Archivo** (Omnibus-Type), v1's family. One family counts as one against R4.1's two, and it is on neither AI-default list.
- **Licence:** SIL OFL 1.1.
  - The installed package's `LICENSE_FONT` begins "Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo)", read tonight.
  - There is **no Reserved Font Name**, and nothing is subset, instanced or renamed.
  - It is the licence Rack already owes a notice for (the Licences row, prompt §1). Clear sky adds no new licence.
- **Metrics:** hhea 878 / −210 on 1000, in the Light file too, so `minLh` stays 1.088.
- **Coverage is exactly v1's.**
  - Archivo lacks ⚙ ✕ ⋯ ✓ ↳ ⚠ ✎ ▾ ▴ (`t5-check.mjs`).
  - Clear sky draws ⚙ (native Fuel's gear button), ⚠ (the glyph site) and ✎ through its icon set (§11). The others fall back exactly as in v1.
  - Archivo has ↑ ↓ and −. On the web, Google's latin slice lacks → (its unicode-range lists U+2191 and U+2193 only), which falls back as it does in v1.
- **Offline:** exactly v1. The same import and the same package files. `sw.js` caches the gstatic woff2 and never the css2 stylesheet, which is v1's behaviour and is unchanged.

### 5.2 Files: exact sources, sizes and hashes

**Web: no file of its own and no `@font-face`.** Clear sky spends v1's variable Archivo exactly as `rack.css` line 1 imports it.

| | |
|---|---|
| The import (`face.web.importUrl`, byte-identical) | `https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap` (response 1,338 B, sha256 `fa0a981c…`, fetched tonight) |
| Its latin woff2 slice | `https://fonts.gstatic.com/s/archivo/v25/k3kQo8UDI-1M0wlSfdnoLmvDIaI.woff2`: **90,096 B**, sha256 `4c98b9d490d1698ec95f2ff17a6c7d0e72691864c0c5d7bc2a2c161b45afe5ad`, variable `wdth` 62–125 and `wght` 300–900 |
| Budget | **0 extra bytes.** The Light weight the hero needs is inside the axis v1 already loads. Weight is set only through `font-variation-settings`, as in v1 |
| Family names | `face.web.display / italic / num` are the Archivo stack. Clear sky declares no family of its own, so the rule that a vibe's web family names start with its id never arises |

**Native: v1's four statics, plus one with R1.** All come from `@expo-google-fonts/archivo` 0.4.2, which is already a dependency (`package.json` untouched).

| Key | File | Bytes | sha256 | Status |
|---|---|---|---|---|
| `Archivo_400` | `400Regular/Archivo_400Regular.ttf` | 119,616 | `36ce8e83756505d014a7353ae332abc19740448fba9a67007b54923ed2899bfd` | boot face (v1) |
| `Archivo_600` | `600SemiBold/Archivo_600SemiBold.ttf` | 120,760 | `6e897cf60256b823bd1c69d62aab9c2950a5ad08ca4f4effd47cc911ce7b54c4` | boot face |
| `Archivo_700` | `700Bold/Archivo_700Bold.ttf` | 120,856 | `fb0d3a7cf205466ed1147911f81dc80788b8e42b8b3b7602f25937a9224654f6` | boot face (v1's literal sites) |
| `Archivo_800` | `800ExtraBold/Archivo_800ExtraBold.ttf` | 120,824 | `5c1ec76c6dfe0a41da6720bb0d26584cf59ee134aba61fa01e12736d2f2e94b8` | boot face (v1's literal sites) |
| `Archivo_300` (**R1 only**) | `300Light/Archivo_300Light.ttf` | **119,592** | `a3bed7dd8acff2490de05ab7235883ef12f7e904fe5f1370873ad07c036abb7f` | new: PostScript `Archivo-Light`, Version 2.001, 653 code points, GSUB with `tnum`, **tabular digits uniform at 563** (`t5-check.mjs`) |

- Licence file for all five: the package's `LICENSE_FONT` (4,388 B, sha256 `108b4e57…`), shipped as `OFL.txt` beside the vendored Light file.
- **Before R1:** 0 new native files, and `face.keys` is v1's four.
- **With R1:** +1 file, +119,592 B, and five registered faces. Whether that meets "≤ 4 static TTFs per vibe" is Micah's call (§15). Research read it as "+1"; a literal reading counts five. The R1-lite fallback keeps four (§13).

### 5.3 How native resolves the faces (`build-native.mjs`, native's own `build()`)

- 400 → `Archivo_400`: body, h1, `headline`, `youGreet`, note, meta, `loadNum`.
- 600 → `Archivo_600`: h2, h3, eyebrow, btn, btnLg, labels, `statVal`, `timer`, `kpiVal`, chip, segBtn, setInput.
- v1's literal sites keep their weights: 700 → `Archivo_700`, 800 → `Archivo_800`, 650 → 700.
- Native line heights, floored at 1.088:
  - body 15/22, note 13/19;
  - `statVal` and `kpiVal` 22/24;
  - `headline` and `youGreet` 26/29;
  - `loadNum(40)` 40/44.
- The Vibes card's numeral (native `pickerFace` = `loadNum(40)`) is `Archivo_400`, a boot face, so it never waits.
- `build(clear-sky)` asks for exactly v1's four keys, and every resolved face is registered.

### 5.4 Every type role

No role is caps and none is tracked. Nothing is under 11 pt. Weight is 400 or more at 15 pt and under. "wdth 100" is what the phone has always drawn, because native ignores `wdth`; the web now draws it too.

| Role | v1 | Clear sky | Ink | Note (widths from `widths.mjs`) |
|---|---|---|---|---|
| `body` | 15 / 100 / 400 / lh 1.45 | 15 / 100 / 400 / lh 1.45 | chalk | v1's size, so line breaks stay close to today's |
| `h1` | 26 / 78 / 800 / −.01 | **26 / 100 / 400** / −.01 | chalk | The title in Regular, quiet beside the hero. "September 2026" is 192.9 pt in 200 of room at web 320 |
| `h2` | 18 / 78 / 800 | 17 / 100 / 600 | chalk | Sheet titles: the text size, one weight up |
| `h3` | 15 / 78 / 800 | 17 / 100 / 600 | chalk | Section heads (`sectionHeader · plain`) |
| `eyebrow` | 10 / 88 / 700 / caps .16 / dim | **13 / 100 / 600, `upper: 0`, ls 0** | steel | The single largest anti-AI change [T3 C1]. §5.5 covers the lower-case exceptions |
| `btn` | 14 / 92 / 700 / .02 | **14 / 100 / 600** / ls 0 | chalk | Every label narrower than v1 native's (§2.2 row 5) |
| `btnLg` | 16 / 92 / 700 / caps .06 | 17 / 100 / 600, `upper: 0` | the kind's | "Start workout" is 104.9 pt, against 155.6 for v1's caps |
| `dockLbl` | 10 / 88 / 600 / caps .07 | 11 / 100 / 600, `upper: 0` | dim, chalk when active | The platform's tab-label size. 8.32 on white |
| `fieldLbl` | 10 / 88 / 700 / caps .16 / dim | 13 / 100 / 600, `upper: 0` | steel | |
| `note` | 12 / 400 / lh 1.5 / dim | 13 / 400 / lh 1.45 | dim | |
| `meta` (v2) | = note | 13 / 400 / lh 1.45 | steel | The running meta: "last 7 days", a date |
| `statVal` | 20 / 108 / 800 / tnum | **22 / 100 / 600** / lh 1 / tnum | the caller's | "112.2k" is 69.5 and "Nov 30" 70.8 in a 75 pt third at 320 |
| `statLbl` | 9 / 88 / 700 / caps .10 / dim | 13 / 100 / 600, `upper: 0` | steel | Also the KPI label and the set-table column heads. "At this pace" is 69.8 in 95 |
| `timer` | 22 / 112 / 800 / tnum | 22 / 100 / 600 / tnum | the site's (steel in the bar) | |
| `kpiVal` | 22 / 108 / 800 / tnum | 22 / 100 / 600 / lh 1 / tnum | chalk | |
| `headline` | 34 / 112 / 800 / −.02 | **26 / 100 / 400** / −.01 / lh 1 / tnum | chalk or the caller's | Every non-hero headline figure (You's "191.2 lb", "1,950 kcal / day") at the title's size |
| `youGreet` | 27 / 100 / 800 / −.02 / lh 1.05 | 26 / 100 / 400 / −.01 / lh 1.1 | chalk (the name: R2) | "Good afternoon," is 188.7 pt in 240 |
| `chip` | 11 / 92 / 600 | 13 / 100 / 600 | steel; knockout when chosen | |
| `segBtn` | 11 / 92 / 700 / caps .06 | 13 / 100 / 600, `upper: 0` | steel; chalk when chosen | |
| `setInput` | 15 / 100 / 700 / tnum | 15 / 100 / 600 / tnum | chalk | 15 keeps iOS Safari's zoom-on-focus behaviour as it is |
| `mono` | 12 | 13 | chalk | The paste box only; face.mono (Menlo / monospace) |
| `loadNum` | wdth 118 / 800 / −.02 / lh .95 | **wdth 100 / 400** / −.01 / lh 1 / tnum | the caller's | `.load-num` at its call sites' own 26–40, in Regular |
| **`hero` (R1)** | — | **76 / 100 / 300 / −.02 / lh 1 / tnum** | the caller's | The four hero sites only (§5.6). ROLES `or: 'type.headline'` |

**The scale:**
- 13 for labels and meta;
- 14 for buttons (v1's size);
- 15 for body and inputs;
- 17 for heads;
- 22 for figures in rows;
- 26 for titles and secondary figures;
- 76 for the one hero.

**Weights, one job each [T3 A4]:**
- 400: text, titles, secondary figures;
- 600: labels, heads, names, buttons, figures in rows;
- 300: the hero alone.

700 and 800 are loaded only for v1's literal sites. No Clear sky role spends them.

### 5.5 Case: the caps tag

- **The rule.** Caps come off every string authored in sentence case, through the roles' `upper: 0`. **A string authored all in lower case that v1 shows in capitals keeps its capitals**, as the **caps tag**: 11 / 600, tracked .06 em, the site's own ink.
  - VOCAB rule 2 lowers only what was written in sentence case. Showing "cut" or "to go" in lower case would be a case change the contract does not allow.
  - The caps tag is Clear sky's one caps treatment. The second is inherited: the Coach card's frozen "COACH" and "COACH ME" (§5.7). That is within R5.2's two.
- **The audit** (`case-audit.mjs`, a read-only heuristic over the web tree at `58ac3be`, which Phase V finishes by hand):

| Site | String(s) | Where v1 caps it | In Clear sky |
|---|---|---|---|
| `food.js:827`, `:830` | cut, hold, gain, target | `.cal-band-lab` (literal) | the caps tag in steel, inside `chart · ink` (deep: may re-set) |
| `food.js:908` | nothing yet | `.meal-kcal` (literal) | the caps tag in faint, inside `card · ruled` |
| `food.js:604` | kcal left today / kcal over target | `.eyebrow` (preset) | **With R6**, the caps tag (web by selector, `.fuel-top .eyebrow`; native through the role). **Before R6**, as authored on both clients |
| `food.js:3258` | kcal / day | `.eyebrow` (preset) | the same (the targets preview) |
| `steps.js:192` | to go / goal met | `.eyebrow` (preset) | the same (`.st-hero-side .eyebrow`) |
| `workout.js:1408` | bar only | `.plate-strip .lbl` (statLbl) | the same (`.plate-strip .lbl` when it holds it) |
| `you.js:971`, `you.js:1540` | kcal / day; lb / week down / up / flat | `.headline-u` (literal) | v1's literal caps under `headline · v1`; the caps tag under R1's `solo` |
| `access.js:418`, `:429` | or / or, if you have a code | `.gate-sep` (web only) | v1's literal |
| `admin.js:442`, `:1105` | action needed / removed | `.adm-flag` (literal) | v1's literal, in its flag colour |
| `index.html` sync pip | synced | `.sync-pip` (literal) | v1's literal |
| `food.js` estimator | the confidence words | `.conf` (literal) | v1's literal |
| add-tile tags | ai, … | `.add-tile .tag` (literal, 8.5 px) | v1's literal (R3 for the size) |

- **Units.** Four of these strings lead with a unit ("kcal …", "lb / week …"). R5.2 says never to uppercase a unit, while VOCAB rule 2 says not to change case on lower-case strings. Clear sky keeps v1's capitals, which is no worse than v1, and leaves "show units as authored" to Micah (§15).
- **Lineup note.** Chalk, Navy and Oxblood also set `eyebrow.upper: 0`, so their five eyebrow-preset sites above show lower case today. R6 serves all of them.

### 5.6 The one numeral treatment, and the hero (R1)

- **Figures are set in Archivo at normal width, tabular:**
  - Regular 400 at titles and secondary figures (26, and `.load-num`'s 26–40);
  - SemiBold 600 in rows (22);
  - **Light 300 for the one hero** (R1).
- v1's wide 800 "stamped plate" figure is v1's. Clear sky's figure is thin and tall, and it is never widened.
- **The hero sites, one per screen, four screens** (R1):

| Screen | The figure | Its words | Worst legal string at the smallest room | Fits |
|---|---|---|---|---|
| You | the Goal card's pace, after the trajectory dot | "lb / week down" on the same baseline (the caps tag), the reason under it | "0.45" (148.6) + 12 + "LB / WEEK DOWN" as the caps tag (100.6) = 261.2 pt of 266 at 320; `.headline` already wraps if a larger text size needs it | yes |
| Weight | the latest weight, the headline row's first stat, alone on its line | "Latest lb" under it; the other two stats on the line below (R1-d) | "699.9" (the lb limit is 700): 191.4 of 288 | yes |
| Fuel | kcal left or over, in its zone colour (v1's rule), inside the white slip | "kcal left today" (the caps tag), then the eaten / target line, **under** it (`.fuel-top` wraps) | "15,000" (an empty day at the target ceiling): **64** px below a 360 px web width, 197.2 of 208 (40 kept clear of the ⋯); 76 at 360 px, 234.2 of 248; native 76, 234.2 of 263 | yes |
| Steps | Today's figure (to go, or past the goal in `good`) | "to go" over it; "steps" and the source line under it. The ring stays first, **above** it (the row stacks in its own order) | "300,000" (the steps limit): 64 px at 320, 233.2 of 248; 76 at 360, 276.9 of 288; native 276.9 of 303 | yes |

- **Never clipped, never truncated.** A clipped figure is a wrong number.
  - Native: the hero Text carries `numberOfLines={1}`, `adjustsFontSizeToFit` and `minimumFontScale` .6, so an accessibility size or an outlandish value shrinks the figure rather than cutting it.
  - Web: 76 px from 360 px wide, 64 px below, one media rule. `font-size` needs `!important` over the inline sizes at `food.js:589` and `steps.js:194`. Colour stays inline (the zone colour, `good`).
- **Left-aligned, on its baseline, never centred.** Apple Weather centres a thin temperature. Clear sky's figure sits where v1's already sits, left, in a flat page with no translucent module around it.
- **One surprise per tab:** 76 against the 26 title is **2.92×**. Train, the session, the recap, Stats and every sheet have no hero; nothing there is over 26 but `.load-num`'s call sites.

### 5.7 The Coach card (fixed 190 / 164)

- **It keeps Archivo on v1's metrics.** There is no advance table, so `T.fit` stays null and native draws Archivo there by construction.
- Its type is frozen with its metrics, including v1's 10 pt caps "COACH" (.16 em) and "COACH ME" (authored in capitals). Both are inherited, listed in §12, and read 12.07 in prussian on white.
- **Only colours change:**
  - the bubble mark, "COACH", "COACH ME" and the lock in accent (12.07);
  - the line in chalk (16.95);
  - the reason in steel (11.07);
  - the caution line in warn (8.23);
  - loading in dim (8.32);
  - "COACH ME" over a collar rule;
  - unlocked in steel.
- 190 / 164, padding 14 and border 1 (drawn in `bar`, so no edge shows) are unchanged.

### 5.8 Other fits measured (`widths.mjs`, web 320 unless said)

| String | Width | Room | Result |
|---|---|---|---|
| h1 26/400 "September 2026" beside ‹ › | 192.9 | 200 | fits (native 375: 255) |
| h1 26/400 "Yesterday" beside the gear and ‹ › | 117.2 | 162 | fits |
| h1 26/400 "Conventional Deadlift", native 375 | 247.8 | 343 | fits; longer names wrap (no line limit), never clip |
| greeting 26/400 "Good afternoon," stacked | 188.7 | 240 | fits |
| statVal 22/600 "112.2k" / "Nov 30" in a third | 69.5 / 70.8 | 75 | fits |
| caps tag "CONFIDENT" / "TARGET" / "NOTHING YET" | 69.9 / 48.7 / 81.9 | — | measured for Q |
| the picker's `315` at 35 / 400 (Regular; 300 with R1) | 59.6 (59.1) | 92 | fits |

---

## 6. Shape language

### 6.1 Radius, by role (R6.5)

| Role | Clear sky | v1 | Where |
|---|---|---|---|
| `r` | **4** | 12 | the lead slip, the Coach card, the peek bar |
| `sm` | 4 | 8 | buttons, fields, wells, nav buttons, today's box |
| `sheet` | 18 | 18 | the platform sheet keeps its shoulder |
| `tile` | 4 | 10 | add tiles |
| `pill` | 999 | 999 | the toast and the rest pill only |
| `plate` | 4 | 2 | the FAB and square looks: one value with buttons |
| `chip` | 4 | 3 | tags, plate chips, the "ai" tag |
| `mark` | 2 | 4 | the dock mark |
| `idx` | 4 | 5 | set badges, where a fallback draws one |
| `round` | 50% | 50% | the avatar, dots |
| `hair` | 1 | 1 | calendar plate bars |
| `bubble` | 12 | 14 | Coach sheet bubbles |
| `badge` | 4 | 9 | |

A white slip with 4 pt corners reads as a sheet of paper laid on the sky, not as a Weather module.

### 6.2 Rules: the `shape` object

```js
shape: {
  rule: { ink: 'knurl', hair: 0.5, head: [1], place: 'below', sub: [1], total: [1] },
  leader: { ink: 'steel', dot: 1.5, pitch: 4, min: 16 },   // vocab default; no look Clear sky names reads it
  band: { fill: 'raised', ink: 'chalk', height: 30 },       // vocab default; unread
  gutter: 2,                                                // vocab default; unread
  keyline: { ink: 'chalk', width: 1 },                      // vocab default; unread
  lead: { keyline: false }                                  // the white slip needs no outline (1.56 off the sky)
}
```

- **One rule, one weight.** Every structural line is 1 pt knurl, 3.70 on the sky. There are no double, Oxford, 2 pt, dotted or leader rules.
- **`place: 'below'`: a head sits on its line**, like a horizon, and its rows lie under it on the sky.
- **`hair: 0.5`** is the only rule Clear sky did not choose. It draws between set rows, the one hairline in the vibe. R5 asks for 0.
- **`total: [1]`**: the rule over the recap's session totals and the estimator's total, drawn by the vibe's stylesheet until a block carries those sites.

### 6.3 Containers (R6.1: four roles)

| Role | What it is | Where |
|---|---|---|
| **Lead** | One white slip per tab: `bar`, radius 4, no border, padding 14 | the Coach card on You and Train, Fuel's summary, Weight's log card, Steps' today card |
| **Group** | No box: its head sits on a 1 pt knurl line, and its content lies on the sky | every other card |
| **Callout** | A paler band of sky (`reviewBg`, lift .55), no border, radius 4 | the Weekly review's "Next week" (`.review-take`) |
| **Sheet** | The platform sheet: white, 18 pt shoulders | every sheet |

- No role has both a fill and a border.
- **No same-fill nesting:** a well inside white is the sky; a tag is raised; a stat has no ground.
- **No coloured side stripe:**
  - Wins and Improve colour their head line (good / warn), never a side stripe.
  - The two stripes outside the blocks (the tour tip and the Coach sheet's asking bubble on native) are R4.
- **Spacing is the looks' own** (VOCAB: a look is geometry shared by every vibe that names it), not a Clear sky token. `card · ruled` parts cards by space, `listRow · plain` sits rows on a 44 pt pitch, and `sectionHeader · plain` gives a head its own air. That is three distinct spacings, by relationship (N24).

### 6.4 Shadows, scrims, motion

- **No shadow on the FAB, the toast, the rest pill or the peek bar.** On native these are opacity 0 and elevation 0.
- **The tour card keeps the vibe's one shadow**, in the ink: y 12, blur 32, .22 (native radius 16).
- **Glass:**
  - The only blur left is the sheet backdrop's 3 px, shade at .40. `webkit` stays v1's, a fixed fact about `rack.css`.
  - The dock and the workout bar are opaque (`filter: 'none'`).
  - The tour fogs to sky: rack at .55, then .94 (native stops at 0, .42 and 1).
- **Motion:** none added. v1's 140 / 240 ms ease-out, the FAB's settle and the 600 ms done flash stay.

### 6.5 Rings (engine v2)

- **`calTick`, `calHead`, `calTarget`**: a 1 pt ring in chalk at .90, as spread 1 on the web and a 1 pt border on native.
  - The rings measure 6.64–7.60 against the zone washes and 10.61 against the track.
  - The white marks stay white ("the white head").
- **Native rings the ticks only when the registry entry sets `chart.tickRing`** (theme.js T.ring.calTick), which Clear sky does (§14).
- **`kpiToday` / `kpiTodayOn`**: an inner ring in the well (the sky the dots sit on under `kpi · word`), then 2.5 in steel / chalk.
- `kpiDay`, `guideEaten`, `flame`, `traj*` and `tourLit` are v1's recipes in Clear sky's roles.

---

## 7. Chrome and the light page

| | Web | Native |
|---|---|---|
| Status area | A dark strip at `top: 0`, `--safe-top` tall, in `band` `#0f1a24` (white on it 17.59). The workout bar's top band stays dark under the status bar. The generator emits the strip for a vibe with a band | `chrome.statusBar: 'dark'` over the sky (ErrorScreen too) |
| Keyboards, date pickers | `color-scheme: light` (`chrome.colorScheme`) | `keyboard: 'light'`, `datePicker: 'light'` at both sites; system alerts stay dark |
| Dock blur tint | not drawn (solid) | `blurTint: 'light'`, not drawn |
| `themeColor` | `#14161a`, v1's (R3.3) | — |
| Fixed at build or install | `appearance` dark, `launch` `#14161a`, `manifestTheme` `#14161a`, `webStatusBar` `black-translucent`: v1's (ROLES `fixed`). A launch is graphite, then sky once the account's vibe is read | the same |
| Sign-in | On the theme (§9) | Stays v1: `signIn` holds v1's 14 values spelled 6-digit |
| Camera | `#000000` behind it | the same |

- **No light flash before the vibe is known.** The web's first frame uses the device hint; native paints v1 until `settings/vibe` arrives.

---

## 8. Every block in the vocabulary (29, in VOCAB order)

Grades: 9 deep, 10 shape and 10 v1. "Literal" means a size or case written at the site rather than taken from a role. A shape-grade look keeps it; a deep look may re-set it.

| Block | Look (grade) | What it draws in Clear sky |
|---|---|---|
| `card` | **`ruled`** (deep) | **No ground, border or radius.** The head (title left, meta and ⋯ right) sits on a full-width 1 pt knurl line (`rule.sub`, `place: 'below'`), and the content lies under it on the sky. Cards part by space. **The tab's lead card keeps its box:** Fuel's summary, Weight's log and Steps' today are white slips, radius 4, no border, no keyline. Fuel's empty meal card stays one line; the ⋯ still opens its sheet |
| `youCard` | **`ruled`** (deep) | As `card`. **Wins' line is `good` and Improve's is `warn`**: the only coloured lines in the vibe, and the title words still say which is which. The owner's admin cards take the same look, so they stay legible on the sky |
| `eyebrow` | `v1` | The role does the work: 13 / 600 steel, sentence case as authored. The lower-case strings keep the caps tag (§5.5). `.chart-sub` and ChartSub follow where they spend the role |
| `sectionHeader` | **`plain`** (deep) | The title alone as a real head in `type.h3`, 17 / 600 ink, with no hairline. Used on You, Settings and the admin panel. No other definition written so far names it |
| `screenHeader` | `v1` | The eyebrow (13 / 600 steel) over the h1 (26 / 400 ink). The nav buttons keep their place and v1's 34 pt, as white squares on the sky; their glyphs are ink (16.95). The recap's hero: "Session complete", the finish headline as h1, the line and the date, in the roles' inks |
| `sheetHost` | `v1` | A white sheet with 18 pt shoulders and a knurl top edge. The 36 × 4 grab handle is in grip (3.38). The backdrop is ink at .40 with v1's 3 px blur. Heights and dismissal are v1's |
| `sheetTitle` | `v1` | h2: 17 / 600 ink, left. Its eyebrow above at 13 / 600 steel |
| `statRow` | **`line`** (shape) | **A box-score line on the sky.** No ground and no outer border. Values sit on one baseline at 22 / 600, tabular, with 1 pt **collar** column rules; labels sit under them at 13 / 600 steel. A value keeps its caller's colour, and small ones ink through `inkOf`. MiniStats take the same look once their switch is opened; their literal labels keep v1's size. **With R1-d**, Weight's headline row puts its first stat alone at `type.hero` and the other two on the line below |
| `kpi` | **`word`** (deep) | **No tile and no corner tint**, with the 2 × 2 grid in its order. Each cell stacks: the label (13 / 600 steel); **the delta as bare signed text with its arrow** in good / bad / warn / dim (every `tint.pill*` is 0); the value (22 / 600) and its unit (13 / 400 steel); "last week …" (13 / 400 dim, tabular); the sparkline **word-sized** in its own place (72 × 22 pt, a 1.5 pt stroke in the subject colour, a 3.5 pt end dot, no area, glow or frame); and the seven day dots, today ringed |
| `headline` | **`v1` until R1, then `solo`** (deep) | **Now:** the figure alone as v1 draws it, in Clear sky's roles: You's headline at 26 / 400, `.load-num` at its call size in Regular, the unit in v1's literal caps. **With R1:** every headline figure's unit on the same baseline at the text size in steel (the caps tag where the unit is authored in lower case), and at the four hero sites the figure alone at `type.hero`, 76 Light (§5.6) |
| `chip` | **`tag`** (shape) | A filled tag: raised ground, no border, radius 4. Words are 13 / 600 steel (8.83). **Chosen is inked in** (ink ground, knockout words, 16.95). The 44-tall chips (Movement, feel, goal) stay 44. No other definition so far names it |
| `segmented` | **`tabs`** (deep) | **No track and no box:** the options as words at 13 / 600 steel, at equal widths. The chosen one is chalk over a **2 pt chalk underline**, and the underline is the cue. At least v1's height; a tap on the chosen one does nothing. "30d  90d  1y" reads like a timetable's column heads. No other definition so far names it |
| `btn` | `v1` | Radius 4, 14 / 600. **Primary:** prussian with white words (12.53). **Plain:** raised with ink words. **Ghost:** v1's collar keyline and steel words; the words are the affordance. **Danger:** a danger keyline and danger words, never a fill. **Large:** 17 / 600, sentence case. Press scale .97, disabled .4. Start workout is a full-width prussian block with no photo |
| `field` | **`square`** (shape) | Radius 4 and a **1 pt knurl border** (3.70 on the sky, 5.79 on white). A white ground in sheets and on the sky page; the sky well inside the white log slip. Focus turns the border prussian. Labels 13 / 600 steel above |
| `note` | `v1` | 13 / 400 dim, lh 1.45 (5.31 on the sky, 8.32 on white) |
| `toast` | `v1` | An inked-in pill (ink ground, knockout words in `type.btn`), 16 above the dock, **with no shadow** |
| `settingsRow` | `v1` | Full-width rows on the white sheet, with v1's collar rule between rows (1.99, faint: the platform's list idiom). The label is v1's literal 14 / 600 in ink, the value 12 steel, the chevron dim. Pressed = raised. Toggles: on = a prussian track with a white knob; off = a grip track with a steel knob (3.26) |
| `listRow` | **`plain`** (shape) | **No rule between rows**; separators come only where a group ends. Rows sit on a 44 pt pitch at least. Name, sub-line and value keep v1's literal sizes, in ink / dim / ink. Swipe to delete, PR and chosen cues are v1's |
| `setTable` | **`ruled`** (deep) | **No card.** The 4 × 30 group tag, the name at 17 / 600 and the ⋯ sit on a 1 pt knurl line. "Last …" is 13 / 400 steel. The column heads "Set  lb  Reps  e1RM" (statLbl, as authored) sit over a 1 pt knurl rule. v1's column widths are kept (30 / 1fr / 1fr / 42 / 38). A lifting block is a rule-framed group with **no wash** (`tint.block` 0) and its title on its own line |
| `setRow` | **`ruled`** (deep) | **The figure on its line.** The badge is a bare letter or number at 13 / 600: W in warn, F in pRed, D in pBlue, numbers in steel. The inputs lose their ground and sit on a 1 pt knurl underline (3.70; 4.56 on a done row); focus thickens it to 2 pt prussian. Grey targets are placeholders in dim. The e1RM is 13 / 400 dim, tabular. The 30 × 30 check has a 1.5 pt knurl edge. **Done = the check filled green with a white ✓, and the row clears** to `#d1e3ef`. Rows are parted by the 0.5 pt hairline (R5). Drops keep ↳, their indent and the pBlue .85 rail |
| `plateStrip` | `v1` | "Per side" through `statLbl` (13 / 600 steel); "bar only" keeps the caps tag. Chips are filled in their plate colours, radius 4, with onPlate figures (v1's literal 10 pt, R3). Exactly the plates `renderPlates` lists, only where it shows today |
| `calCell` | **`open`** (shape) | **A calendar with no lines and no grounds.** An untrained day's number is dim (5.31); a trained day's is chalk (10.82), with up to four 3 pt plate bars (3.12 or better). **Today** is accent at 800 with its accent edge (7.71). Day numbers, weekday letters and the legend keep v1's literal type (R3). **With R5** this becomes `ruled` with hair 0: day numbers re-set, and the legend in sentence case |
| `chart` | **`ink`** (deep) | **Single-ink strokes:** 1.5 pt lines with no area wash and no glow; dots dim; square-topped bars on a shared origin, stacked segments parted by 1 pt gaps in the page colour; rings with square caps, never concentric; collar hairline grids. Axis, ring and chart text is re-set to 11 or more (v1 has 7.5 and 9). Meters are square-ended bars on the track. **The calorie meter** keeps its zone washes (pale blue, khaki, rose), its zone-coloured fill and v1's geometry; the white head, ticks and dashed target each carry the 1 pt ink ring; its band labels take the caps tag. **The heat strip:** trained days pYellow with lift d .10 below .80, untrained days on the track; Steps' green heat map by the same two rules (§4.3). **The day not over:** opacity .66. Legend keys are 12 × 3 strokes (R7) |
| `dock` | **`solid`** (shape) | Opaque white, no blur, a collar top rule. v1's five icons (1.9 stroke) are dim at rest (8.32) and ink when active (16.95), **plus the 26 × 2 prussian mark** on the top edge (12.07): colour, mark and ink, never colour alone. Labels 11 / 600, sentence case. Same tabs, order, place and 64 pt height |
| `fab` | **`square`** (shape) | A prussian slab, radius 4, with a white + (2.6) and v1's literal "LOG FOOD" (its own caps rule at .09 em, which a shape look may not re-set; R3), centred 14 above the dock, with **no shadow**. Pressed: `#00203e` (16.45), scale .955 |
| `addTile` | **`flat`** (shape) | No washes and no borders. Every tile is the sky well on the white sheet, radius 4. **Photo is marked by its prussian icon well** with a white icon (12.53). The lit tiles' icon well and tag sit on raised (steel tag 8.83; decision b). Other wells are raised with ink icons. Titles, lines and tags are word for word. An off tile stays visible, dimmed and untappable |
| `sessionChrome` | **`flat`** (shape) | **No glass and no shadows.** The top bar is opaque white under a collar rule; on the web its top band stays dark. It holds the name, the clock (`timer` 22 / 600, steel, 11.07), the Coach chip (38 tall, collar edge, prussian mark, v1's literal caps), the calendar button (38) and **Finish** (primary). The rest line is 3 pt, done or danger. The rest pill is raised and round with a knurl edge (4.61). The peek bar is raised with a knurl edge and radius 4 |
| `youHero` | **`stacked`** (deep) | The avatar (52, round, raised, initials 17 / 600 steel) **above** the greeting, left; the gear (36, a white square) top right. The greeting is 26 / 400 ink, with the name in prussian until **R2** makes it one ink. The date line is 13 / 400 steel. "Member since …" is re-set to 13 / 400 steel, as authored. No other definition so far names it |
| `coachCard` | **`flat`** (shape) | The lead slip on You and Train: white, radius 4, its 1 pt border drawn in white so no edge shows, 190 / 164 tall, padding 14. Inside are v1's type and metrics exactly, in Clear sky's inks (§5.7) |

**Parts no block covers:**
- **The sync pip, the trial bar and the swipe-delete panel** take tokens:
  - the pip in dim (5.31) with its good / warn dot;
  - the trial bar a warn .10 wash with warn words (4.59), on native a solid warn bar with white (8.54);
  - the delete panel in danger with white words (12.61).
- **`.ob-choice.on`** (web): v1's colour-only border becomes a **2 pt ink keyline with the label at 600**, a thickness cue. Native's Choice already has a fill-plus-border cue and keeps it.
- **The tour card** keeps a box under `card · ruled` (R8).

---

## 9. Every screen, including the ones people forget

- **Web sign-in and the gates** (native stays v1):
  - the sky under the dark status band, and the six-plate mark in the plate colours (3.12 or better);
  - the title at 26 / 400, and email and password as white boxes with knurl borders;
  - **Sign in** as the prussian primary, "Forgot password" as prussian words, errors in danger (7.76);
  - "or" keeps v1's caps. The waiting, paused and trial screens follow the same rules, with notes in dim.
- **Onboarding (8 steps) and the tour:**
  - Each step's kicker is 13 / 600 steel and its title h1.
  - Choice cards are white slips on the sky; chosen is a 2 pt ink keyline plus 600. The numbers step uses `field · square`.
  - The tour fogs to sky, and the tour card is a white slip with the vibe's one shadow.
  - The lit dock button carries the 2 pt prussian ring (`tourLit`). The tip's 2 pt left stripe is R4.
- **You:**
  - The hero: avatar above, greeting, date. Then the Coach card as the one white slip, and "Member since …".
  - Plain section heads.
  - Wins and Improve hang on good and warn lines, with findings on the sky and no dividers.
  - Goal: its line, then **the pace at 76 Light** (R1), the reason, the stat line (190.7 │ 182 │ Nov 30) and a flat progress bar.
  - This week: the KPI grid with no tiles and word-sized lines. Trends: figures at 26 / 400 and ink charts.
  - The Weekly review ends in the callout band.
- **The Coach sheet (92 %):**
  - White. Coach's bubbles are raised, radius 12, with v1's 4 pt tail.
  - The asking bubble keeps v1's side stripe, in prussian, on both clients until R4 lets both draw a full 1 pt keyline instead.
  - Your answers are inked in. The quick-reply and goal chips are tags, chosen inked in, and the goal chips are 44 tall. ▾ ▴ stay text.
- **The live chip and the nudge:**
  - The chip is as `sessionChrome` says.
  - The nudge is one line on the sky: "Coach · " in prussian, the sentence in ink, and × in dim at v1's size and target.
- **Train calendar:**
  - The eyebrow and the month at 26 / 400 with ‹ ›, then the open calendar.
  - The month's stat line; the week-volume group with square bars on the track.
  - The Coach card (164) as the lead slip, and Start workout as a full-width prussian block.
  - The day sheet is white with plain rows.
- **The live session:**
  - The flat top bar, then each exercise on its line on the sky with set rows as in §8.
  - "Per side" and the filled plate chips, "+ Set" as a ghost, the rest pill and peek bar flat.
  - **No hero here.** The biggest figures are the set weights.
- **The recap:**
  - "Session complete" / the finish headline (h1, 26 / 400) / its line / the date.
  - "How did that feel?" as a group with Energy and Strength tags (44 tall), chosen inked in. Save is primary and Skip a ghost.
  - The new-record card (`.pr-card`) sits on its line like any group under `card · ruled`. Its accent-tinted border and gradient wash are not drawn (no gradient washes, R7.1); the record stays in prussian (the PR highlight, the accent's job) and its delta in good with its sign. PB rows are plain, and the totals sit over `rule.total`.
- **Stats and exercise detail:** PageHead with ‹ Back. Long names wrap at 26 / 400 and never clip. Stat lines, ink charts, the heat strip as §8, and plain rank rows.
- **Picker, manager, custom exercise, routines:**
  - White sheets. Search is `field · square`, filter chips are tags, and rows are plain.
  - The Movement chips are 44 tall.
  - The routine editor's set table is ruled like the session's, and "+ Drop" keeps its words.
- **Fuel day:**
  - The white summary slip: **the figure at 76 Light** in its zone colour (R1), then "kcal left today" (the caps tag once R6 lands) and the eaten / target line under it, then the calorie bar with its ringed marks and caps band labels, then the macro bars on the track.
  - Meals lie on the sky on their lines, with "NOTHING YET" as the caps tag on an empty meal.
  - Water sits on its line: v1's bottle in knurl, the sky inside, the water pBlue at .45 and .90, the level linear (unchanged), the total at `.load-num` 34 Regular in pBlue (good when met), − and + as plain buttons.
  - The FAB is the prussian slab.
- **Add food, estimator, library, meals, barcode:**
  - The add sheet: "Add to" in steel, meal chips as tags, the 2 × 2 flat tiles, then Foods and Meals as ghosts with their book and stack icons.
  - The estimator's notice (warn .07 wash, warn edge) carries **the ± spark** in warn (7.36) beside the sentence.
  - Proposed rows are plain, each confidence dot beside its word, and the estimator's total sits over `rule.total`.
  - The library: plain rows; ✎ drawn as v1's pen, ✕ as text. The barcode camera stays black.
- **Water sheet:** presets as plain rows with × to remove, and settings as square fields.
- **Weight:**
  - The eyebrow "Body weight" and "Weight" at 26 / 400.
  - The log slip (white): the input as the sky well with a knurl border and the latest as its placeholder, Log (primary), "Weighed earlier?" (ghost) and the note.
  - Then, on the sky, **the latest at 76 Light** (R1-d), "Latest lb" under it, and "7-day avg │ rate ✓" on the line below.
  - The trend: tabs, tags, a 1.5 pt pYellow line with no wash, and dots dim.
  - Then time of day, maintenance ("≈ 2,700" at 32 Regular) and plain recent rows.
- **Steps:**
  - "Movement" / "Steps" with the gear.
  - The Today slip: the ring (v1's 132, one arc, square caps) above **the figure at 76 Light** (R1), with "to go" over it (the caps tag once R6 lands) and "steps" and the source under it. +500 / +1k / +2.5k are ghosts, and Set total is primary.
  - Then trend bars (square-topped; green where the goal was met, so "green = goal met" stays true), the 30-day stat line, streaks, the heat map (green on the track, as §4.3; "darker is more" stays true), weekdays and recent rows.
- **Settings and profile:** a white sheet with plain section heads (You, Fuel, Train, Coach, Steps, **Look**, App) and v1 rows. **Look → Vibes** reads "Clear sky".
- **The Vibes sheet:**
  - The chrome is the worn vibe's.
  - Clear sky's own tile: the sky ground; the sample card white with radius 4 and **no edge** (a scoped rule sets `.vibe-sample`'s border to `bar`); `315` in Archivo at wdth 100, **wght 400** (300 with R1), in ink (16.95); a 44 × 4 prussian bar; "Clear sky" and "Pale sky, open and calm." (10.82, 7.07).
  - Every tile rule is scoped `.vibe-in[data-vibe="clear-sky"]` (decision e).
- **Admin (owner only), legible:** You's groups on the sky, stat lines and plain rows. The flags keep v1's classes, their words in good / bad / pBlue / warn on the sky (5.45 / 7.76 / 5.30 / 5.25), each with a border of the same colour at .45.
- **Toasts:** the inked-in pill with no shadow. **Install card and guide** (web only): a group on its line with a ghost dismiss.

---

## 10. Textures and images

- **No photos.** Photos are Iron Age's alone. `images` is `{}`, and every hero slot's `band` takes its null default. Slots close up as in v1.
- **No texture.** Nothing on the sky page earns one:
  - grain under 13 pt text on a mid-light ground would cost the thin margins in §4;
  - anything cloud-like is the Weather copy the slot forbids.
- The only pattern is the calorie runway's existing hatch, in knurl.

---

## 11. Icons (`vibes/icons/clear-sky.js`)

- **v1's hand-drawn set, recoloured through roles** (24 grid, round caps and joins, no fill). It has **no sun, cloud or weather mark anywhere**, because theming a sky vibe by motif is what a generator does. Every name the set leaves out falls back to v1's drawing.
- **`spark`: a ±, "give or take"**, which is what an estimate is.
  - Paths: `M12 5v9`, `M7.5 9.5h9`, `M7.5 19h9`, at the sites' fixed 1.6 stroke, inked in warn.
  - It is not a star, sparkle, asterisk or bolt. It differs from Chalk's, Navy's and Oxblood's ≈ and from Iron Age's manicule.
  - At 16 px the bars are 6 px long, with 2.3 px clear between the plus and the bar.
- **`glyphs`**: three characters Archivo lacks, each drawn at every site the contract lists for it. A character inside a sentence is copy and stays text.
  - `gear` ⚙ is native Fuel's gear button, drawn with v1's own `gear` so both clients show one gear. NavBtn keeps its label.
  - `warn` ⚠ leads the estimator's sentence and native's dev banner: a triangle with its mark, stroke 1.6.
  - `edit` ✎ is the library row's edit button, drawn with v1's own `pen`.
- The water vessel is v1's bottle. There are no tailpieces.
- The check (`check-def.mjs` J): every drawing is v1's icon shape on the 24 grid, every name is one of v1's, and the spark is defined, is not v1's sparkle, and is at 1.6.

---

## 12. What Clear sky never does

1. **Two hero figures on a screen**, or a hero anywhere but You, Weight, Fuel and Steps. It never uses Light 300 below 34 pt, and never Light on a word.
2. **A box around a list.** The only boxes are the tab's white slip, sheets and controls: no Weather-style module stack, no tile around a stat or a KPI, no box inside a box.
3. **A line between rows**, beyond the 0.5 pt set-row hairline the contract forces (R5). Separators run between groups, at one weight. It never draws a double, Oxford, 2 pt, dotted or leader rule.
4. **Tracked capitals in any role it sets, or caps on a string authored in sentence case.** It never shows a lower-case-authored string in lower case where v1 capitalises it (§5.5).
5. **A second accent, or the accent as data.** Prussian never marks a muscle group, a macro, a verdict or a chosen chip.
6. **A gradient, glow, glass or texture.** The sky is flat, the dock and the workout bar are opaque, and the only shadow is the tour card's.
7. **A sky picture or a weather motif.** No clouds, no sun, no weather glyph as an icon, no photo of any kind.
8. **Anything that reads as Activity rings or Apple Weather.** The Steps ring stays one arc with square caps. There are no concentric rings, no translucent modules and no centred temperature-style figure.
9. **A delta in a pill.** Deltas are bare signed text in their status colour, with their arrow.
10. **A coloured side stripe**, on a card, a bubble or a callout.
11. **v1's sparkle.** The spark is a ±.
12. **A second family, a monospace figure, a web font file, or a synthesised weight.**
13. **A changed word or number.** "COACH ME" stays as typed.
14. **New motion.**
15. **Pure `#000000` as ink.** The camera alone stays black.
16. **A light web status band, or a light flash before the account's vibe is known.**
17. **A new alarm colour** on a food state v1 doesn't colour that way.

**Inherited from v1, stated so nobody mistakes them for choices** (each no worse than v1):
- the Coach card's frozen "COACH" (10 pt caps .16 em) and "COACH ME";
- the live chip's and the FAB's literal caps;
- the literal sizes the shape looks cannot re-set: plate chip figures 10, the add tile's tag 8.5, the sync pip and admin flags 9, `.conf` 10.5, mini-stat labels 8.5, and the calendar's day numbers and legend (R3, R5);
- the four unit strings kept in caps (§5.5);
- the middle-dot strings and "→" fragments, which are copy.

---

## 13. Asks of the engine (what v2 cannot express), each with its fallback

### R1 · The hero figure (the concept depends on it)

- **R1-a · vocabulary.** `headline` gains a deep look, **`solo`**:
  - every headline figure's unit sits on the same baseline at the text size in steel, in the caps tag where the unit is authored in lower case;
  - at a site marked hero, the figure stands alone on its line at `type.hero`;
  - where the site's row cannot hold it (Fuel's `.fuel-top`, Steps' `.st-hero`), the row wraps or stacks **in its own order**. This is a deep look's "re-arranges inside the block without changing the order".
- **R1-b · a type role.** `type.hero`: `{ size, wdth, wght, ls, lh, tnum }`, kind `type`, native `text.hero`, with **`or: 'type.headline'`**, so every older definition means what it does today. v1 names no hero and no `solo`, so v1 cannot move.
- **R1-c · the mark, at three sites.**
  - **Web: no DOM change.** The sites are selectable: `.card.fuel-sum .load-num`, `#view-steps .st-hero-side .load-num`, and the Goal's `.headline-v` (the `.headline` holding `.traj-dot`).
  - **Native: one boolean prop, `hero`,** at food.jsx's summary `T.loadNum`, steps.jsx's Today `T.loadNum`, and `HeadlineV` in the trajectory card (you/bits.jsx). VOCAB already lists these as sites to open.
- **R1-d · Weight** (separable). `statRow` honours the hero mark on Weight's headline row (web `#view-weight .cal-hd + .card + .stat-row`; native weight.jsx's headline `StatRow`): the first stat alone at `type.hero`, the other two in the line look below.
  - **If R1-d alone is refused**, Weight's latest stays a 22 pt row figure and Weight's surprise is its white log slip.
- **R1-e · the picker.** Native `pickerFace()` reads `text.hero` when the vibe has one, else `loadNum(40)` as today. The web does it with the scoped `.vibe-num` rule.
- **R1-f · the definition patch, three edits and nothing else:**
  ```js
  variants.headline: 'solo',
  type.hero: { size: 76, wdth: 100, wght: 300, ls: -0.02, lh: 1, tnum: 1 },
  face.keys: ['Archivo_300', 'Archivo_400', 'Archivo_600', 'Archivo_700', 'Archivo_800']
  ```
  Native vendors `Archivo_300Light.ttf` (§5.2). The web's rule steps to 64 px below 360 px.
- **R1-lite, if a fifth native face is refused:** `type.hero` at `wght: 400` (Regular 76), with `face.keys` staying v1's four. The Light is lost but the idea is kept.
- **If R1 is refused outright**, `headline` stays `v1`, and the four figures stay at their call-site sizes in Regular with the units in v1's caps. Clear sky then has no surprise per tab; it is a calm, well-made light vibe without its idea. **Report it; do not ship it as if it were the concept.** §15 item 1 gives the choice.

### R2 · The greeting in one ink (N17)

- **The ask:** `colors.greetName`, with `ref: 'color'` and `dflt: 'accent'`. Clear sky sets `'chalk'`. Chalk and concept B asked for the same.
- **Fallback:** the name stays prussian, one P1 tell left in place, listed.

### R3 · A type floor at literal sites inside shape looks (Chalk's request 7)

- **The ask:** the add tile's 8.5 pt tag, the plate chip's 10 pt figures, the calendar's legend and day numbers, and the mini-stat labels reach 11 pt, with the calendar legend in sentence case.
- **Fallback:** v1's literal sizes, no worse than v1, listed in §12.

### R4 · Side stripes outside the blocks

- **The ask:** the tour tip (web `auth.css .ob-tip`, native `TourOverlay.jsx:105`) and the Coach sheet's asking bubble on native (`coach/sheets.jsx:468`). Each gets a full 1 pt prussian keyline or top line in place of its 2–3 pt left stripe, which needs a role or look that native can read.
- **Fallback:** both clients keep v1's stripes in prussian, logged against R6.4. The web never goes ahead alone, because the clients must match.

### R5 · `shape.rule.hair` may be 0

- **The ask:** `paramOk` accepts 0 for `hair`, and a look drawing a 0 hairline draws nothing. Then Clear sky sets `hair: 0` (set rows parted by space alone) and `calCell: 'ruled'` (A's printed calendar with no lines, day numbers re-set, the legend in sentence case).
- **Fallback:** hair 0.5 and `calCell · open`, as the definition holds now.

### R6 · A caps tag role

- **The ask:** `type.tag` (caps, 11 / 600, .06 em) with `dflt: null`. Null means each site keeps its own v1 type, so v1 is unchanged. The preset sites that show a string authored in lower case spend it when it is non-null: the five eyebrow sites and "bar only" (§5.5). This is lineup-wide: Chalk, Navy and Oxblood hit the same five sites.
- **Fallback:** on both clients those six strings show as authored, in lower case, logged against VOCAB rule 2 for Micah (§15). The web does not keep caps alone, because parity comes first.

### R7 · `chart · ink`'s legend keys as 12 × 3 strokes

- **The ask:** VOCAB-level wording. Ledger would share it.
- **Fallback:** v1's square swatches in the data colours.

### R8 · The shared `card · ruled` hooks

- **The ask:** the web hero-slot hooks (VOCAB §8.2), so the look knows Weight's log card and Steps' today card are the tab's lead. The tour card, which spends `T.cardSkin()`, must stay boxed under `card · ruled`. Iron Age and Ledger share this.
- **Fallback:** the tour card is treated as a lead box.

**Not asks, because they exist:**
- native `T.chart` (the heat strip, `dimOp` and `tickRing`), set in the registry entry (§14.2);
- `T.ring.calHead` / `calTarget`;
- `colors.band` and its generated strip;
- `tagInk` and `inkOf`.

---

## 14. Registry entry, native assets and the web stylesheet (build notes for Phase V)

### 14.1 Registry (`vibes/defs/index.js` VIBES, the orchestrator's edit)

```js
{ id: 'clear-sky', name: 'Clear sky', feel: 'Pale sky, open and calm.', experimental: false, scheme: 'light' }
```

### 14.2 Native `src/state/vibe.js` VIBE_DEFS entry

```js
'clear-sky': {
  def: clearSky, icons: clearSkyIcons, images: {},
  fonts: {},            // v1's four boot faces; with R1: { Archivo_300: require('../../assets/fonts/Archivo/Archivo_300.ttf') }
  // no `fit`: the Coach card keeps Archivo on v1's metrics
  chart: {              // theme.js T.chart, the native half of vibes/clear-sky.css's chart rules (heat.mjs)
    heat: { on: 'pYellow', off: 'track', lift: { d: 0.1, below: 0.8 } },
    dimOp: 0.66,
    tickRing: true
  }
}
```

### 14.3 `vibes/clear-sky.css`: the hand rules below the generated token block

Every selector is under `[data-vibe="clear-sky"]`. Pseudo-elements carry `content: ''`, and keyframes, if any, are named `clear-sky-…`.

- **Type presets at their web selectors**, each restating `'wdth' 100` and its `wght` through `font-variation-settings` with no `font-weight`. Web type roles are CSS rules, not tokens.
  - `h1`, `.sheet h2`, `h3`, `.eyebrow`, `.btn`, `.btn-lg`, `.dock button`, the field labels, `.note`, `.stat-val`, `.stat-lbl`, `.timer`, `.kpi-val`, `.headline-v`, `.you-greet`, `.chip`, `.seg-btn`, `.ex-block .set-row input`, `.paste-box`, `.load-num`.
  - `text-transform: none; letter-spacing: 0` only where the role's strings are authored in sentence case.
- **The caps tag** (11 px, `'wght' 600`, `.06em`, uppercase kept) on the §5.5 literal sites that a deep look re-sets now (the band labels, "nothing yet"), and on the preset sites only once R6 lands, when native can match.
- **The tints with no web token** (ROLES gives `tint.*` no custom property, so each is `rack.css`'s literal alpha, restated for Clear sky's value):
  - `.ex-block .set-row.done` / `.rt-sets …`: `rgba(var(--lift-rgb), .45)`;
  - `.set-row.flash` runs `clear-sky-setFlash`, from `rgba(var(--lift-rgb), .9)` to `.45`;
  - `.review-take`: `rgba(var(--lift-rgb), .55)` with no border;
  - `.set-row-nav:active`: `var(--raised)`;
  - `.set-idx.t-W/F/D` and `.delta-pill`: transparent;
  - `.wk-block`: no wash;
  - the drop rail at `rgba(var(--p-blue-rgb), .85)`;
  - the zones at pBlue .24, pYellow .40, pRed .26;
  - `.sheet-backdrop` at `rgba(var(--shade-rgb), .4)`.
  - Every other tint uses v1's alpha on a channel that already follows the role.
- **`kpi · word` and `chart · ink` over the pinned `analytics.js`:**
  - hide the area path (`fill="url(…)"`) and `.spark-glow` by selector;
  - `.spark-line` gets `vector-effect: non-scaling-stroke` at 1.5 px;
  - scale `.spark-end` 1.3 about its own centre (`transform-box: fill-box`) to reach 3.5 pt;
  - native draws its own 72 × 22 line with a 1.5 stroke and a 1.75 end radius.
- **The heat strip:** `.heat rect[fill="var(--collar)"]` becomes the track. Trained cells get the lift value by value on their `fill-opacity` attribute (.28 → .38 … .80 and up unchanged), as Chalk's stylesheet does. **The day not over:** `.chart-bar-dim { opacity: .66 }`.
- **Stacked segments** are parted by a 1 px page-colour gap.
- **R1 (once accepted):**
  - `font-size: 76px !important` at the three hero selectors, and 64 px below 360 px;
  - `.card.fuel-sum .fuel-top { flex-wrap: wrap }`;
  - `#view-steps .st-hero { flex-direction: column; align-items: flex-start }`.
- **The Vibes tile:**
  - `.vibe-in[data-vibe="clear-sky"] .vibe-num { font-variation-settings: 'wdth' 100, 'wght' 400 }` (300 with R1);
  - `.vibe-in[data-vibe="clear-sky"] .vibe-sample { border-color: var(--bar) }`.
- **Onboarding:** `.ob-choice.on` gets a 2 px `--chalk` border with its label at `'wght' 600`.
- **`rule.total`** over the recap's session totals and the estimator's total.

---

## 15. Decisions left to Micah

1. **If R1 is refused** (or the orchestrator will not open `headline · solo` tonight), choose one:
   - ship Clear sky without its numeral, as the definition stands, and say so;
   - hold Clear sky until R1 lands; or
   - swap in concept B with A's `#8c6900` yellow (Judge 1's fallback; §18).

   Both judges said a refusal must be reported, not quietly shipped.
2. **The fifth native face** (`Archivo_300Light.ttf`, +119,592 B, already installed): does "≤ 4 static TTFs per vibe" count v1's four boot faces? If yes, take R1-lite (hero at Regular 400).
3. **Q-P1: a sky-blue page at all.** Research's taste call [T4 GF9].
4. **Units in caps.** "kcal / day", "kcal left today" / "kcal over target" and "lb / week down" keep v1's capitals (VOCAB rule 2). R5.2 would show them as authored.
5. **Before R6**, the five eyebrow strings and "bar only" show in lower case on both clients. Accept that, or wait for R6.
6. **The day-not-over bar at .66.** The carb segment of today's Fuel bar dims to 2.07 against v1's 2.49. Raising the opacity to match erases the "not over" cue.
7. **The yellow's hue:** `#8c6900` (hue 85.5) over research's `#966103` (72.0), so "yellow" stays true on a blue page.
8. **Body 15 over Scale V's 17**, and titles at 26 (§2.2).
9. **The name and the feel line**, and brightness at night: v1 stays the default, and Clear sky is a choice.

---

## 16. Phase Q watch list (Clear sky specific)

- **Thin text margins:**
  - warn on the trial bar 4.59;
  - pGreen on the sky 4.87;
  - pBlue 5.30, warn 5.25 and dim 5.31 on the sky.
- **Thin graphics:**
  - pYellow 3.12 and pChrome 3.20 as marks on the sky;
  - the toggle knob 3.26 and the grab handle 3.38;
  - knurl 3.70 on the sky.

  Re-run `contrast.mjs` on the definition that ships.
- **Fit fixtures at 320 and 390:**
  - "September 2026" (192.9 of 200);
  - the session top bar with Finish at 14 / 600;
  - the hero's worst strings ("15,000" on Fuel, "300,000" on Steps, "699.9" on Weight);
  - the caps tags;
  - the 44-tall chips;
  - the paste box as a square field.
- **The "did an AI make this?" gate** (hard, 2 of 3). The honest risk is the palette: sky with navy is a common "clean health app" look. The identity rests on the numeral and on the absence of boxes. **A build that quietly adds cards back, or ships without R1, loses it.**
- **Native:**
  - `build(clear-sky)` resolves only registered faces (checked tonight);
  - `verify-text-color` holds;
  - the Coach surface checks pass on v1 metrics;
  - `rn-render` mounts every screen and the Vibes sheet.

---

## 17. Three screens in words (390 pt, as they look once R1 and R6 land; every real word and number is v1's)

**You.**
- A thin dark strip holds the status bar. Below it the page is a flat, pale sky blue.
- Top left is a round avatar in a lighter blue-grey; under it, "Good evening," and "Micah" in Regular Archivo at 26, blue-black, with the name in prussian until R2. The gear is a small white square at the top right.
- The only white slip on the screen is the Coach card, with barely rounded corners and no outline. "Member since …" sits under it in slate.
- "How you're doing" at 17, with no rule. A thin green line with "Doing well" on it, and the findings lying on the sky with no dividers.
- Then "Goal": a slate line, and beneath it the screen's one big thing, **0.9** in thin, tall figures 76 pt high, with "LB / WEEK DOWN" on its baseline.
- "This week" is four read-outs with no tiles, each with a word-sized line.
- The dock is a white strip: "You" in ink with a short prussian bar above its icon, the others in slate.

**The live session.**
- A white top bar under a faint line: "Push day", the clock "25:00" in slate, a white "COACH" chip, the calendar button, and a prussian "Finish".
- On the sky, "Barbell Bench Press" and its red group tag sit on a slate line, with "Set  lb  Reps  e1RM" over another.
- The rows are 44 apart. A done warm-up row has cleared to a paler sky, with "W" in dark amber, "95" and "8" on thin underlines, and a green check holding a white ✓.
- Filled plate chips follow, maroon "1×45" and mustard "1×25", then "+ Set" as a ghost. **No hero here.**

**The Fuel day.**
- "Fuel" and "Today" at 26 Regular, with the gear and ‹ › as white squares.
- The white slip: **350**, 76 pt and thin, in the cut zone's deep blue, with "KCAL LEFT TODAY" and "1,950 eaten · target 2,300" under it.
- The bar: pale blue, khaki and rose bands; the white head, ticks and dashed target each ringed in fine ink; "CUT HOLD GAIN" and "TARGET" as small caps tags.
- Meals lie on the sky on their lines, and the prussian slab "+ LOG FOOD" floats 14 above the dock with no shadow.

---

## 18. The losing concept (Micah may swap it in)

**B · "The line"** (70 points against A's 75).

- **The idea:** every figure you write stands on a line, and every figure Rack keeps is drawn as a line, a single 1.5 pt stroke with a dot at today. There is no hero numeral; figures are Archivo 700 at reading size.
- **Its devices:**
  - underline fields (`field · underline`);
  - ink primaries and a square ink FAB (`btn · inverse`, `fab · inverse`);
  - underlined ghost buttons;
  - outline plates (`plateStrip · stamp`);
  - rule-hung cards (`card · ruled`, `place: 'above'`);
  - 0.5 pt hairlines between set rows;
  - word-sized sparklines;
  - a radius-14 lead box;
  - pill chips.
- **Its palette** is `deep2-sky` with research's `#966103` yellow. It had the darker `dim` / `knurl` / `grip` and the neutral `raised` / `track` that Clear sky took.
- **Its strengths:**
  - the easiest build: all 29 looks already exist in v2, 0 new files, all 298 roles resolve;
  - the web made to draw what the phone draws (wdth 100);
  - better page margins than A as first written;
  - it caught the lower-case caps problem A missed.
- **Why it lost:**
  - about 7–10 of its 19 non-v1 looks are Iron Age's signature devices (ink blocks, outline plates, rule-hung cards, hairline set rows), set in sans on blue, and its Fuel and Weight screens are Chalk's on blue;
  - it shows bold figures everywhere with no scale jump, and many lines;
  - its done-row margins were 4.61–4.79;
  - its "yellow" reads orange.
- **To swap it in:** take `design/clear-sky/b-work/clear-sky.draft.mjs`, change pYellow and the three tables to `#8c6900` (Judge 1's condition), and re-run `check-def.mjs`, `contrast.mjs` and `contract-copy.mjs` against it. The spec is `design/clear-sky/concept-B.md`. Concept A's full text is `design/clear-sky/concept-A.md`.

---

## 19. How this was made

All scripts are under `~/dev/vibes-night/tools/clear-sky-final/`. They are read-only against both trees and run with plain `node`. **`node run-all.mjs` runs the seven checks below and writes each output, with its exit code, to `design/clear-sky/final/<name>.out.txt`**; all seven exit 0.

| Script | What it established |
|---|---|
| `check-def.mjs` | A imports nothing and is frozen; B has all 605 v1 leaf paths (legacy `exact` strings aside, and every key beyond v1 is one engine v2 reads); C colours are 6-digit, with no legacy spelling and no `exact`; D meta; E the 29 looks, each accepted, with grades; F the shape params (`paramOk`); G the per-definition contract rules (channels, alphas, the three hex tables, fixed roles, HUE_NAMED, colour references); H **all 298 ROLES through `valueOf()`** (285 own values, 13 by `dflt`: the 7 photo bands, which are null, and 6 list tails, which are 0) with every web custom property spelled; I type and faces; J icons. **169 / 169** |
| `contract-copy.mjs` | The real `tools-check/vibes-contract.mjs` over a scratch copy of `vibes/` whose registry lists clear-sky (`VIBES_CONTRACT_DEFS`). **All 521 checks pass** |
| `contrast.mjs` | §4. **403 checks, 0 failures**: 18 inks × 11 surfaces, every ink × every surface role, fills, large text, graphics, CVD, guard |
| `build-native.mjs` | Native `build()` from rack-mobile main (engine v2) on the definition: it builds; faces, line heights, tints, rings, shape, chrome, radius and variant map as §5.3 |
| `heat.mjs` | §4.3: the heat strip and the day-not-over bar, against v1 |
| `widths.mjs` | §5.6 and §5.8, on the Archivo statics (through concept A's `widths-A.mjs` measuring function) |
| `case-audit.mjs` | §5.5: caps classes in `rack.css` / `auth.css`, and the lower-case strings on lines that name them |
| `explore.mjs` | The wash, flash, drop-rail, runway and zone options before they went into the definition |
| `tools/t5-check.mjs` | Archivo Light: PostScript name, `tnum` 563, coverage |

**Network:** two downloads, both through `tools/fetch.mjs` (§14 hosts):
- the css2 stylesheet `rack.css` imports;
- its latin woff2 slice.

Both are kept in `design/clear-sky/final/` as the record of §5.2. No package was installed.

**Research used:** SYNTHESIS §0–§4 (the rules R0–R10, conflicts C1–C30, the never-do and do-instead lists) and §5.5 (Deep 2), read in this pass. The track keys cited above (T1, T3, T4, T5, T9, T10) are cited as SYNTHESIS and the two concepts cite them. The track files themselves were not re-read for this spec; every number here was recomputed from the files instead.

**Also read:** VIBES-PROMPT §1, §2, §9–§14; PLAN §1–§3.6; VOCAB and `vocab.js`; `v1.js`, `index.js` and `icons/v1.js` at `58ac3be`; both concepts and both judges' reports; the Chalk spec, for format. **Checked in code:** `rack.css`, `food.js`, `steps.js`, `you.js`, `workout.js` and `settings.js` at the sites quoted; native `theme.js` (T.ring, T.chart) and `src/state/vibe.js` (VIBE_DEFS, `pickerFace`) on rack-mobile main.
