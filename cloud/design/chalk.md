# Chalk: the final spec (simple-1)

V59 Phase D, slot `simple-1`, id `chalk`. Written 2026-09-27 from concept A, which won the panel, with grafts from B and C. Nothing here is approved, committed or deployed.

- **The definition** is `wt/web-design/vibes/defs/chalk.js` (pure, imports nothing, frozen, every v1 role filled). It is not registered: the orchestrator adds the `index.js` entry (§16).
- **Every number below was computed tonight from the files**, by the scripts in `~/dev/vibes-night/design/chalk/final/`. Colour numbers use track 4's library (`tools/colour/colour-lib.mjs`), and font numbers come from HarfBuzz and opentype.js run on the files that would ship. §19 lists the commands.
  - `check-def.mjs`: the definition's shape against `v1.js`, `index.js` and `vocab.js`. **133 of 133 checks pass.**
  - `check-colour.mjs`: every text ink on every surface, the named pairs, graphics, colour vision and the guard. **No unclassified failure.**
  - `build-native.mjs`: native's own `build()` (rack-mobile `src/ui/theme.js`, through the repo's `rn-render` stub) run on `chalk.js`. It builds and resolves the faces in §5.3.
  - `fonts.mjs`: font metrics, coverage, subsets, the Coach face table and widths against v1.

---

## 1. Name and idea

- **Name:** Chalk.
- **Feel line:** "Chalk-white page, dark ink." (27 characters, so it fits on one line at 375 pt.)
- **The idea.** Chalk is Rack printed in two inks on chalk-white stock.
  - Graphite carries every word, rule and chosen state. One mulberry is kept for the next thing to do.
  - Sofia Sans, an early-twentieth-century technical sans with softened corners, sets the words in sentence case. Its own Condensed ExtraBold cut carries the heads, the greeting and the one hero figure on each screen.
  - The look comes from type and tone, not from boxes, glows or tracked capitals.
- **Why a light ground.**
  - The ground is a material: chalk, cool and neutral (R−B = −3, well outside the AI-cream band, R3.5).
  - Positive polarity helps small text, and Rack's labels are small [T4 R13].
  - The page `#e8ebeb` is **85.7 ΔE00 from v1's ground**. The accent is **70.2** from v1's yellow.
- **What a lifter sees:**
  - it reads as the gym's printed programme card, not a dashboard;
  - graphite type on a pale grey-white page;
  - plates in the dark "print" colours a light page can carry;
  - one mulberry button per screen.

---

## 2. How the winner was picked, and what was grafted

### 2.1 The scores

The formula: distinct + 2 × (10 − "AI-made") + readability + fits Rack + buildable. The maximum is 60 per judge.

| Concept | Judge 1 | Judge 2 | Judge 3 | Total |
|---|---|---|---|---|
| **A: soft technical sans** (Sofia Sans + Condensed) | 42 | 40 | 42 | **124** |
| B: printed plan, square (Vollkorn) | 37 | 30 | 38 | 105 |
| C: legibility first (Atkinson Hyperlegible Next + Archivo figures) | 38 | 30 | 34 | 102 |

All three judges picked A. There was no tie.

### 2.2 Grafts taken (each re-checked by the scripts in §19)

| # | Graft | From | What it fixes, measured |
|---|---|---|---|
| 1 | Coach card type: `title` 11/14, `goT` 11/14, `goX` 15/18 | Judge 3 | Every slot still clears Sofia's minimum line height (1.20), and `cardLayout()` now gives **the same line budgets as v1 at every iOS text size**, 0.823× to 1.6×, on You and on Train (`judge-chalk3/coachfit.mjs fixed`). A's 11/15 and 16/20 lost Train's reason line at 1.235× and a headline line at 1.6× |
| 2 | A true SemiBold on native. The four files are Regular, SemiBold, ExtraBold and Condensed-ExtraBold; 700 snaps **up** to 800 | Judges 1–2, from B and C | The label sites at 600 (Judge 1 counts about 300) draw SemiBold on both clients, where A drew Bold on the phone. 700 → 800 keeps buttons, names and set inputs heavier than the 600 labels; 700 → 600 would merge the two |
| 3 | The Coach face table read from the SemiBold static (the line, wght 600) and Regular (the reason) | follows from 2 | Real Coach lines run 0.937–0.959× Archivo's width. A digit-heavy line ("185 × 8, then 135 × 6") runs **1.035×**, because tabular digits are 630 against Archivo's 576. Fit comes from the table, so wrapping stays exact |
| 4 | `warn` `#7a5a00` (A had `#735400`) | C; Judges 1–2 | warn against bad under deuteranopia goes from **5.00 to 7.22** ΔE00. Warn text: 6.09 on the card, 5.32 on the page, 4.85 on raised |
| 5 | W / F / D badges keep the plain badge's `raised` ground (`tint.tagW/F/D = { raised, 1 }`), and the letter carries the type | C's badge, built so it actually lands (Judge 3's objection) | W in warn is **4.85** whatever the row does; F in pRed 7.05, D in pBlue 6.15. A's .10 washes left W at 4.48 over a done row with C's warn. A 0-alpha wash would have been transparent (rack.css:584), not raised |
| 6 | `statLbl` 12/600, not 12/400 | B, C; Judges 2–3 | R5.1's label weight of 500–600 |
| 7 | No drop shadow on the FAB, toast, rest pill or peek bar; only the tour card keeps one | B, C; Judges 1, 3 | Removes A's last soft-floating tell. Surfaces part by value. The mulberry FAB is 7.96:1 on the page and lifts itself |
| 8 | The calorie runway hatch spends a role; in Chalk that role is `knurl` | C found it; Judge 2 picked the role | v1's hatch (rack .55 over the track) measures **1.06** on a light track and vanishes. knurl reaches 3.18; grip only 2.50 |
| 9 | `addTile · flat` puts the lit tag and icon well on `raised` | C; Judges 1, 3 | steel on grip is 3.16 and fails; steel on raised is **7.95**, and an ink icon on raised 14.04. The fix is VOCAB-level wording that serves every light vibe |
| 10 | `collar` `#cdd3d4` (chalk-r2 has `#d2d7d7`) | B; Judge 3 | The solid white dock's top rule still shows over a white card: 1.45 against 1.39. Decorative either way |
| 11 | `font-synthesis: none` on the vibe root; subset the source files ourselves rather than take Google's css2 woff2 | B; Judges 1–2 | Google's latin woff2 slice drops → ← ≈. Chalk's own subset keeps them, so arrows and "≈" stay in the vibe's face (§5.2) |
| 12 | Native statics from Google's css2 route (`fonts.gstatic.com`), not the lettersoup upstream repo | C's provenance fallback; Judge 2 | §14 names github hosts for "the google/fonts repo". These statics are Google's own instances of **the same v4.101** the web subsets, so both clients draw one version and the Coach table matches both. Q-Q3 no longer applies |
| 13 | The fixed-box fit list for Q, plus measured widths of the widest real strings at 320 | C, B; Judges 1–2 | §14 |
| 14 | Two untrue lines corrected | Judge 2 | (1) On native, the estimate row and the movement chips draw Archivo **in every vibe** (`T.fit.archivo`, theme.js:696–698), so Chalk does not "never draw Archivo". (2) The Coach table must pass verify-your-goal and verify-feel as well as the coach surface (theme.js:693–694) |
| 15 | The `spark`: C's two-wave ≈ as Chalk's neutral mark | C; all three judges | **Recorded, not shipped.** The orchestrator's call is `icons: 'v1'` for simple vibes (§10) |

### 2.3 Not grafted

- **B's darker plates** (chest / pRed / bad / danger `#860211`, legs / pYellow `#816100`). They are the recorded fallback (§3.6).
  - They would lift ochre text on the page from 4.19 to 4.81.
  - They cost worst-group CVD margin: 13.68 drops to 12.19, against a gate of 12.
  - PLAN §3.2 fixes `chalk-r2` for all three angles.
  - Judges 1 and 2 said keep them as a fallback, or skip them. Judge 3 would take them.
- **B's Vollkorn.**
  - Its default figures are old-style, so every number would depend on a new `lnum` engine ask. That ask is unverified in react-native-svg on iOS.
  - Its minLh is 1.393.
  - Its native files total 513 KB.
  - It is also the concept closest to Iron Age.
- **B's square-cap icon set.** A simple vibe keeps v1's icons.
- **C's Archivo figure face.** The biggest thing on each screen would stay v1's, and it adds a large engine ask.
- **C's `listRow · plain`.** It means 13 native row components for a simple vibe.
- **C's inks:** steel `#33383d`, dim `#4f545a`, and faint `#5f656b`, which is a fourth grey. A's steel and grip are what hold the toggle knob at 3:1.

---

## 3. Colour: every role

`chalk-r2` [T4 §3.1, GF4], with four changes:
- `steel` `#3b4045` (§3.3);
- `warn` `#7a5a00`;
- `collar` `#cdd3d4`;
- the roles E0 split out, filled for a light ground.

Every value is 6-digit hex. No `LEGACY_EXACT` spelling and no `exact` string appears anywhere.

### 3.1 The 43 `colors` keys

| Role | Chalk | v1 | Job in Chalk, and why this value |
|---|---|---|---|
| `rack` | `#e8ebeb` | `#14161a` | The page: chalk-dust grey-white. Neutral (OKLCH C < 0.015), so R3.1 governs it, not the Tailwind guard. Nearest default: `neutral-200`, 1.89 |
| `bar` | `#f8fafa` | `#1c1f26` | Card, sheet, field and the solid dock. 1.14:1 off the page: told apart by value, not outline |
| `well` | `#e8ebeb` | `#14161a` | The recess inside a card (KPI tiles, chips, in-card inputs, add tiles). It equals the page, as in v1, so it never nests a same-fill box |
| `raised` | `#dde1e2` | `#262a33` | A control up off the card: plain button, set badges (W / F / D included), rest pill, peek bar, a chosen option, the Coach bubble, the avatar, the lit add tile's tag and icon well. 1.26 against bar |
| `track` | `#dce0e1` | `#262a33` | The empty part of a meter. Every data fill clears 3:1 on it; core is weakest at 3.64 |
| `grip` | `#898e8f` | `#333844` | Grab handle (3.17 on bar), a toggle's off track under a steel knob (3.16), trajectory dots (ink icon on it 5.57), the importer's unknown group |
| `collar` | `#cdd3d4` | `#262a33` | Every decorative 1 pt rule: dividers, chart grids, the rule after a section title, the box-score verticals, the dock's top rule. 1.45 on bar and 1.26 on the page. Never the only edge of a control |
| `knurl` | `#767c80` | `#333844` | Control edges: fields, the set check, the sheet's top, the rest pill, the peek bar. Also the runway hatch (ask, §12). 4.04 on bar, 3.53 on the page, 3.21 on raised |
| `chalk` | `#111416` | `#f2f0eb` | The ink: body, heads, values. 17.65 on bar and 15.42 on the page. Graphite, never `#000000` |
| `steel` | `#3b4045` | `#8d939f` | Secondary text and every label. 10.00 on bar, 8.73 on the page, 7.95 on raised |
| `dim` | `#555a60` | `#5c6270` | Tertiary text: notes, placeholders, e1RM, the dock at rest. 6.64 on bar, 5.80 on the page, 5.28 on raised |
| `faint` | `#555a60` | `#333844` | Equal to `dim` on purpose. A fourth, fainter grey is never-do #5 |
| `inverse` | `#111416` | `#f2f0eb` | Chosen states are inked in: a chosen chip or segment, the toast |
| `knockout` | `#f8fafa` | `#14161a` | Ink cut out of `inverse`: 17.65 |
| `calMark` | `#ffffff` | `#f2f0eb` | The calorie bar's head, ticks and dashed target. **It stays white**, because the copy says "the white head" (`HUE_NAMED`). It needs an ink ring on a light track (§12, item 2) |
| `accent` | `#6c3058` | `#f0be1e` | Mulberry, with one job: primary, FAB, focus, today, the dock mark, Coach's voice, chosen and on states, the PR highlight. HSL 320°, 25° clear of the banned violet band. 9.56 from `pink-900`. 9.11 as text on bar, 7.96 on the page |
| `focus` | `#6c3058` | `#f0be1e` | The focus ring and focus borders. `.wpe-row input:focus` stays `pBlue` (ROLES `except`) |
| `accentPressed` | `#5d224a` | `#d9a90f` | The FAB when pressed. 8.89 from `fuchsia-950`. White on it: 11.71 |
| `onAccent` | `#ffffff` | `#141414` | White on mulberry: 9.54 |
| `danger` | `#8f1117` | `#d6252b` | Destructive and refused. Always a keyline plus words, never a fill that could pass for the primary |
| `onDanger` | `{ web: '#ffffff', native: '#ffffff' }` | `{ web: '#fff', native: '#ffffff' }` | The swipe-delete label: 9.29. One colour; v1's split shape is kept, so both clients read the same path |
| `done` | `#056a50` | `#2aa85c` | A set done, its tick, the rest line while it runs |
| `onDone` | `#ffffff` | `#0d1a11` | The ✓ on a done check: 6.60 |
| `good` | `#056a50` | `#2aa85c` | Verdicts and deltas. A bluish green (hue 164.6°), still green for `HUE_NAMED` |
| `warn` | `#7a5a00` | `#f0be1e` | A dark amber (hue 44.3°), amber for `HUE_NAMED`. 6.09 on bar, 5.32 on the page, 4.85 on raised |
| `bad` | `#8f1117` | `#d6252b` | 8.87 on bar, 7.75 on the page |
| `onWarn` | `#ffffff` | `#141414` | Native trial banner ink on its solid warn bar: 6.38 |
| `pRed` | `#8f1117` | `#d6252b` | Chest, protein, gain |
| `pBlue` | `#1c4aa8` | `#2e7fd9` | Back, fat, water, training, cut, drop sets. Cobalt, still blue (hue 220°) |
| `pYellow` | `#8a6b00` | `#f0be1e` | Legs, carbs, the Fuel and Weight subject, maintain. Ochre at hue 46.5°: the only yellow that works as text on a light card (4.79). Small ochre text belongs on cards; on the page it is 4.19, which is enough for large figures and graphics |
| `pGreen` | `#056a50` | `#2aa85c` | Shoulders, steps |
| `pWhite` | `#25272b` | `#e8e5de` | Arms, and the Steps subject. **It becomes ink**, because no white data colour reaches 3:1 on a light ground [T4 R3] |
| `pChrome` | `#6c727c` | `#a8aeb8` | Core. Slate: 4.62 on bar, 4.04 on the page (graphics only there) |
| `onPlate` | `#f8fafa` | `#14161a` | Figures on the plate chips: 4.62 or better on all six |
| `onYellow` | `#ffffff` | `#141414` | Alias of `onAccent`. The trial banner's exception takes `onWarn` |
| `onGreen` | `#ffffff` | `#0d1a11` | Alias of `onDone` |
| `white` | `#ffffff` | `#ffffff` | Alias of `onDanger` |
| `pYellowPressed` | `#5d224a` | `#d9a90f` | Alias of `accentPressed` |
| `fallback` | `#3b4045` | `#8d939f` | Alias of `groups.fallback`, which follows `steel` |
| `shade` | `#111416` | `#000000` | Under the one shadow and every scrim: graphite, not black |
| `lift` | `#111416` | `#ffffff` | On a light page a press **darkens**: ink at .05 |
| `tileHero` | `#dcd8dc` | `#1e1f1e` | Native only: accent .10 over the well, flattened. `addTile · flat` does not draw it; it is kept for a v1-look fallback |
| `tileLit` | `#e2e2e4` | `#17181a` | Accent .05 over the well. Same note |

### 3.2 Roles Chalk needs and the contract lacks

These are requests, not keys; the definition invents none.

- **`band`** `#111416` (**required**). The web status strip for light vibes. White on it: 18.49.
- **A ring for the calorie head and dashed target** (**required**). §12 item 2.
- **`greetName`** (optional). The name in the greeting, in `chalk`, so the greeting is one colour (R5.4). v1 = `accent`.

### 3.3 Why `steel` and `grip` sit exactly where they do

`grip` has to do two things at once:
- the sheet's grab handle must reach 3:1 on bar;
- the toggle's off state draws a **steel knob on a grip track** (rack.css:2370–2383), and the knob must reach 3:1 against the track.

With chalk-r2's steel `#41464b`, the best any grip can do is 3.01 / 3.02. Darkening steel to `#3b4045` opens the window: grip `#898e8f` gives 3.17 for the handle and 3.16 for the knob.
- Every steel text pair gains contrast.
- The ink-to-steel step narrows from 1.94 to 1.77.
- The steel-to-dim step widens from 1.37 to 1.50.

Grip cannot also carry 4.5:1 text, which is why the lit add tile's tag moves to `raised` (graft 9).

### 3.4 `alpha` (native helpers)

v1's mapping, unchanged: yellow → pYellow, red → pRed, blue → pBlue, green → pGreen, ground → rack, accent → accent, danger → danger, warn → warn.

### 3.5 `tint`: all 28, as role and alpha (flattened by `tints.mjs`)

| Tint | Role, α | Flattened | Why |
|---|---|---|---|
| `setDone` | done .12 | `#dbe9e6` over bar | Raised from v1's .07, so a done row can be seen from the bench. Ink on it 14.80, steel 8.38, dim 5.57 |
| `setFlash` | accent .28 | `#d1c1cd` | v1's alpha. Ink on the peak 10.76 |
| `tagW` / `tagF` / `tagD` | raised 1 | `#dde1e2` | Graft 5: the badge keeps its raised ground, and the letter carries the type |
| `dropRail` | pBlue .70 | `#5e7fc1` | Raised from .45, so the rail is a 3:1 graphic on white (3.80) |
| `dropAdd` | pBlue .45 | `#95abd5` | The + Drop border. The button carries words |
| `pickSel` | accent .08 | `#edeaed` | A chosen row. Ink 15.49, accent 7.99, dim 5.83 |
| `block` | accent .04 | `#f2f2f4` | A lifting block's wash. The knurl keyline carries the block |
| `coachBase` / `coachLow` / `coachHigh` | accent .14 / .07 / .38 | `#e4dee3` / `#eeecef` / `#c3adbc` | v1's pulse alphas. Ink on the peak 8.83 |
| `rowPress` | lift .05 | `#ecefef` | A darkening press. Ink 15.99, steel 9.06, dim 6.02 |
| `pillBase` / `pillUp` / `pillDown` / `pillWarn` | lift / good / bad / warn **0** | none | No delta pills (R6.6). A delta is bare signed text with its arrow |
| `zoneCut` / `zoneHold` / `zoneGain` | pBlue .16 / pYellow .18 / pRed .16 | `#bdc8d8` / `#cdcbb9` / `#d0bfc1` over track | v1's alphas: pale blue, khaki and rose bands |
| `dockGlass` / `wkBarGlass` | rack .82 / .90 | — | What a v1-look fallback would draw. `dock · solid` and `sessionChrome · flat` draw both bars opaque |
| `backdrop` | shade .40 | `#929596` over the page | Graphite .40 behind a sheet (R3.3). The sheet stands 2.88:1 off the dimmed page, with a knurl top edge |
| `trajGood` / `trajWarn` / `trajBad` | good / warn / bad .18 | `#cce0db` / `#e1ddcd` / `#e5d0d1` | v1's alphas |
| `reviewBg` / `reviewBorder` | accent .07 / .24 | `#eeecef` / `#d6cad3` | The border rises from .18 so it shows on white. It is decorative |

### 3.6 Data tables

- **`groups`** (lowercase): chest `#8f1117`, back `#1c4aa8`, legs `#8a6b00`, shoulders `#056a50`, arms `#25272b`, core `#6c727c`, fallback `#3b4045` (steel).
- **`groupPlates`**: the same six in uppercase.
- **`plates`**: `['#8f1117', '#1c4aa8', '#8a6b00', '#056a50', '#25272b', '#6c727c']`.
- **`importGroups`, `mark`, `subjects`, `admin` and `conf`**: v1's role names, unchanged.
- **`kpi`**: every corner tint at **a: 0**, so even a v1-look path paints no glow.
- **Recorded fallback plates** (not in the definition): chest / pRed / bad / danger `#860211` and legs / pYellow `#816100` (concept B).
  - When to use them: only if Q finds small ochre text on the page or the well.
  - What they give: ochre on the page 4.81.
  - What they cost: worst group pair 12.19.

---

## 4. Contrast and colour vision (`check-colour.mjs`, from `chalk.js` itself)

### 4.1 Every text ink on every surface

| Ink | page `rack` / `well` | card `bar` | `raised` | `track` (fills only) |
|---|---|---|---|---|
| chalk | 15.42 | 17.65 | 14.04 | 13.91 |
| steel | 8.73 | 10.00 | 7.95 | 7.88 |
| dim = faint | 5.80 | 6.64 | 5.28 | 5.23 |
| accent | 7.96 | 9.11 | 7.24 | 7.17 |
| good = pGreen = done | 5.50 | 6.30 | 5.01 | 4.96 |
| warn | 5.32 | 6.09 | 4.85 | 4.80 |
| bad = pRed = danger | 7.75 | 8.87 | 7.05 | 6.99 |
| pBlue | 6.75 | 7.73 | 6.15 | 6.09 |
| pYellow | **4.19** | 4.79 | **3.81** | 3.77 |
| pWhite | 12.48 | 14.28 | 11.36 | 11.25 |
| pChrome | **4.04** | 4.62 | **3.68** | 3.64 |

**Every cell under 4.5, and why it stands:**
- **pYellow on the page or well, 4.19.** Only large figures (Weight's and Fuel's headline, 26–40 pt) and graphics (the KPI sparkline, calendar plate bars) sit there, and both need 3:1. Small ochre text sits on cards (4.79). **Q greps for small ochre text on the page.** If it finds any, the §3.6 fallback plates go in.
- **pYellow on raised, 3.81.** Not a pair. The only ochre-on-raised site is the W badge letter, which maps to `warn` (§12 item 3).
- **pChrome on the page or well, 4.04; on raised, 3.68.** Core is a data mark on the page (3:1) and text only on cards (4.62). Nothing sets it on raised.
- **The track column** is the empty part of a meter. No text sits on it, and every fill clears 3:1.

### 4.2 Ink on its own fill, and text over the tints

All of these pass:

| Pair | Ratio |
|---|---|
| onAccent on accent / accentPressed | 9.54 / 11.71 |
| knockout on inverse (chosen chip and segment, toast) | 17.65 |
| knockout on accent (the Photo tile's tag) | 9.11 |
| onDanger on danger · onWarn on warn · onDone on done (✓, 3:1) | 9.29 · 6.38 · 6.60 |
| onPlate on red / blue / yellow / green / arms / core | 8.87 / 7.73 / 4.79 / 6.30 / 14.28 / 4.62 |
| white on band · on pRed · on pGreen (native banners) | 18.49 · 9.29 · 6.60 |
| set number (steel) on its raised badge | 7.95 |
| **W in warn / F in pRed / D in pBlue on their raised badges** | **4.85** / 7.05 / 6.15 |
| ink / steel / dim on a done row | 14.80 / 8.38 / 5.57 |
| ink on the set flash / the coach pulse peak | 10.76 / 8.83 |
| accent on the coach pulse base | 7.20 |
| ink / accent / dim on a chosen row | 15.49 / 7.99 / 5.83 |
| ink / steel / dim on a pressed row | 15.99 / 9.06 / 6.02 (ink 13.93 on the page) |
| ink / dim on the review box | 15.75 / 5.93 |
| accent block title / ink on the block wash | 8.53 / 16.54 |
| warn on the web trial bar (warn .10 over the page) | 4.67 |
| steel on the lit add tile's tag on raised | 7.95 |
| ink on collar · on tileHero · on tileLit | 12.21 · 13.12 · 14.30 |
| dim / ink dock labels on the solid dock | 6.64 / 17.65 |
| warn caution line on the Coach card | 6.09 |

**Pairs that fail and are not drawn:**
- **W left in pYellow on its badge, 3.81.** This is why §12 item 3, the W → warn mapping, is required.
- **Steel on grip, 3.16.** This is v1's lit tag. `addTile · flat` moves it to raised.

### 4.3 Graphics and control edges (3:1)

All pass unless marked.

| Graphic | Ratio |
|---|---|
| knurl edges on page / card / raised | 3.53 / 4.04 / 3.21 |
| focus ring on card / page | 9.11 / 7.96 |
| grab handle (grip) on the sheet | 3.17 |
| toggle off: steel knob on its grip track, and the track on the sheet | 3.16, 3.17 |
| toggle off: the grip track on the page | **2.77** (see below) |
| toggle on: accent knob on accent .28 | 5.55 |
| ink icon on grip | 5.57 |
| dock icon at rest / dock mark | 6.64 / 9.11 |
| done check fill / danger rest line on the card | 6.30 / 8.87 |
| drop rail | 3.80 |
| plates as marks on the card / page / track (worst: core) | 4.62 / 4.04 / 3.64 |
| heat strip, trained pYellow against untrained collar (both pinned) | 3.31 |
| unlit spark bars (knurl, pinned) on the KPI well | 3.53 |
| runway hatch in knurl (ask) | 3.18 |
| runway hatch as v1 draws it | **1.06** (why the ask exists) |
| white head on its gain / hold (.92) / cut (.92) fill | 9.29 / 4.46 / 6.91 |
| white target or tick with no ring, on the bare cut / hold / gain zone | **1.69 / 1.64 / 1.76** |
| white head with no ring on the bare track | **1.33** |
| calTick's ring (ink .7) against cut / hold / gain | 5.29 / 5.39 / 5.20 |
| the requested head and target ring (ink .9) against the zones | 9.02 / 9.30 / 8.70 |
| the requested ring against the bare track | 11.16 |

**About the toggle on the page (2.77).** Toggles sit in sheets: `settings.js` and `coach-ui.js` build them inside `sheet()`. There the track is 3.17 and the knob on the page would be 8.73. Q confirms that no toggle lands on the page.

**Decorative steps, for information:** bar / page 1.14, collar / bar 1.45, collar / page 1.26, raised / bar 1.26, track / bar 1.27.

### 4.4 Colour vision (Machado 2009, severity 1.0, linear RGB; CIEDE2000)

| Group | Chalk | L* | Deuteranopia | Protanopia |
|---|---|---|---|---|
| chest | `#8f1117` | 30.2 | `#5b5010` | `#3d3615` |
| back | `#1c4aa8` | 33.9 | `#004aa6` | `#0056ab` |
| legs | `#8a6b00` | 46.9 | `#81730b` | `#7a6a00` |
| shoulders | `#056a50` | 39.4 | `#5c5a52` | `#67624f` |
| arms | `#25272b` | 15.6 | `#25272b` | `#26272b` |
| core | `#6c727c` | 47.9 | `#6d717c` | `#6f727d` |

**Worst pairwise ΔE00** (gate 12; v1's worst is 10.9):
- normal: **21.06** (back / core);
- deuteranopia: **13.68** (chest / legs);
- protanopia: **16.05** (chest / shoulders).

The next closest pairs:
- shoulders / core: 25.24 / 13.87 / 17.03;
- chest / shoulders: 55.92 / 16.81 / 16.05.

**Status pairs** (normal / deuteranopia / protanopia):
- **good against bad:** 55.92 / 16.81 / 16.05. Under deuteranopia their L* differs by only 4.2, so up and down never rely on red against green. Every delta keeps its ↑ ↓ → and its sign, and Sofia Sans draws all three arrows.
- **warn against bad:** 31.43 / **7.22** / 15.57. A's warn gave 5.00 under deuteranopia.
- **warn against legs:** 6.53 / 6.61 / 6.16. In v1 they are one hex, so any gap is an improvement. They never carry the same job.

**The accent's nearest data or status colour:**
- normal: chest, 23.33;
- deuteranopia: arms, 11.96;
- protanopia: arms, 12.69.

All three clear the working threshold of 10.

### 4.5 Guard and lineup

- **Tailwind v3:**
  - accent: `pink-900`, 9.56;
  - accentPressed: `fuchsia-950`, 8.89;
  - the grounds are neutral (`neutral-200` 1.89, `gray-50` 0.83), so R3.1 governs them.
- **Cream band:** lowest channel `e8`, R−B −3, so outside it.
- **Against the lineup** (ground ΔE00; accent normal / deuteranopia / protanopia):

| Vibe | Ground | Accent |
|---|---|---|
| v1 | 85.7 | 70.2 |
| Clear sky | 13.2 | 24.9 / 15.4 / **7.2** |
| Iron Age | 10.3 (r2g 9.8) | 15.1 / 21.9 / 13.7 |
| Navy | 85.0 | 73.0 / 53.3 / 63.4 |
| Oxblood | 87.6 | 60.4 / 48.7 / 55.2 |

- **Clear sky under protanopia (7.2)** is the closest accent pair, as SYNTHESIS §5.0 reported. The two separate on ground, face and structure: Clear sky is a sky page, unboxed, in Archivo; Chalk is grey-white with flat boxes, in Sofia Sans.

---

## 5. Type

### 5.1 The family

**Sofia Sans**, by Lettersoup (Botio Nikoltchev and Ani Petrova), in two widths of one design: **Sofia Sans** for text and **Sofia Sans Condensed** for heads, the greeting and the hero figure. Both are Version 4.101.

- **Licence:** SIL OFL 1.1.
  - google/fonts `METADATA.pb` says `license: "OFL"` for both.
  - The `OFL.txt` header, read tonight, holds only "Copyright 2019 The Sofia Sans Project Authors (https://github.com/lettersoup/Sofia-Sans)". There is **no Reserved Font Name**, so subsetting is allowed.
  - The google/fonts `OFL.txt` (sha256 `3e824d50…`) is byte-identical for both families and upstream.
  - Ship it beside the files.
- **Metrics:**
  - hhea 900 / −300 on 1000 UPM, so **minLh 1.20** for both widths (Archivo: 1.088);
  - x-height 0.488 (Archivo 0.526, so 0.93×);
  - cap height 0.655 (Archivo 0.686).
- **Tabular figures:** uniform at **630** in every Sofia Sans file and **526** in Condensed, live in the variables and in every static and subset (t5-check). The default digits are proportional, so `tnum` stays on everywhere, as rack.css and the native presets already have it.
- **Glyph coverage:**
  - Present: − → ← ↑ ↓ ≈ ± × ÷ · • … ° ≤ ≥, the quotes and the dashes.
  - Missing: ↳ ⚙ ✕ ⋯ ✓ ⚠ ✎ ▾ ▴. **That is exactly Archivo's gap set**, so these fall back as they do in v1 (R4.6). ⚠ and ⚙ inside sentences stay text.
  - Also missing: ′ ″. Concept A's read-only grep of both trees found neither in use.
- **Where Archivo still draws:**
  - On native, the estimate row and the movement chips draw Archivo **in every vibe** (`T.fit.archivo`, theme.js:696–698), because their verifiers measure Archivo. That is an engine constant, not a Chalk choice.
  - rack.css line 1's Archivo `@import` stays byte-identical (`face.web.importUrl` records it), and Chalk's own rules never name Archivo.
  - Everything else Chalk draws is Sofia Sans.

### 5.2 Files: exact sources, sizes and hashes

**Web.** Self-hosted variable woff2, with `wght` 1–1000 kept. Subset tonight with `subset-font` 2.4.0 (all layout features kept) to Google's latin unicode-range plus U+2190–2193 (← ↑ → ↓), U+2248 ≈ and U+2264–2265 ≤ ≥. Google's own latin slice drops → ← ≈.

| File (ship as `vibes/chalk/…`) | Source | Source bytes / sha256 | woff2 bytes / sha256 |
|---|---|---|---|
| `SofiaSans-latin.woff2` (family `'chalk-sofia'`) | `https://raw.githubusercontent.com/google/fonts/main/ofl/sofiasans/SofiaSans%5Bwght%5D.ttf` | 345,684 / `a3e1019b8867e21b75d26a7b59d4eb2c81d1acf6b69b9ae6cedca269fb68e291` | **52,508 (51.3 KiB)** / `82badf4a33f0a63ded6fdd4c06c87ff4b7303797bc215a41e35f90abcb8443af` |
| `SofiaSansCondensed-latin.woff2` (family `'chalk-sofia-cond'`) | `https://raw.githubusercontent.com/google/fonts/main/ofl/sofiasanscondensed/SofiaSansCondensed%5Bwght%5D.ttf` | 346,828 / `3282c4e1a09d14e91c5fdb10aadee93048d017fa00f857f43fdcc29c989221fd` | **53,416 (52.2 KiB)** / `0f60aeffafb0a9289d2de9520f87fd3990abea3f2c7ced3f1838cfc209504c42` |
| picker digits (Condensed, `0–9` only) | the same | — | 6,972 |

- Both are under the 120 KB per-family budget.
- The two source files are the ones research fetched from google/fonts (`research/fonts/_fetchlog.jsonl`). They were subset again tonight.
- Outputs are in `design/chalk/final/fonts/`.
- Metadata sources: `https://raw.githubusercontent.com/google/fonts/main/ofl/sofiasans/METADATA.pb`, `…/sofiasanscondensed/METADATA.pb` and the two `OFL.txt` files beside them.

**`@font-face`** (in `vibes/chalk.css`):
```css
@font-face { font-family: 'chalk-sofia'; src: url(chalk/SofiaSans-latin.woff2) format('woff2');
  font-weight: 1 1000; font-style: normal; font-display: swap; }
@font-face { font-family: 'chalk-sofia-cond'; src: url(chalk/SofiaSansCondensed-latin.woff2) format('woff2');
  font-weight: 1 1000; font-style: normal; font-display: swap; }
[data-vibe="chalk"] { font-synthesis: none; }
```
- Weight is set **only** through `font-variation-settings: 'wght' N`, with zero `font-weight` rules in style rules. The range lives in the descriptor.
- Every `'wdth'` value rack.css writes is ignored, because Sofia Sans has no width axis and a missing axis is dropped.
- The names are vibe-prefixed, so a locally installed Sofia Sans can never stand in.
- The service worker must cache both files, so the vibe works offline.

**Native.** Four static TTFs: Google's own css2 instances of the same v4.101, latin-subset tonight with the same range.
- The request: `https://fonts.googleapis.com/css2?family=Sofia+Sans:wght@400;600;700;800&family=Sofia+Sans+Condensed:wght@800`, with a `node` user agent.

| Key (`useFonts`) | Source (`fonts.gstatic.com`) | Source bytes / sha256 | PostScript name | Latin subset bytes / sha256 |
|---|---|---|---|---|
| `SofiaSans_400` | `https://fonts.gstatic.com/s/sofiasans/v20/Yq6E-LCVXSLy9uPBwlAThu1SY8Cx8rlT69B6sK3t.ttf` | 110,624 / `928f8146f72b210bb6553c356ad5d007462da1bc63a483b73161de305a35a64b` | `SofiaSans-Regular` | 42,968 / `07ec8d9123d991a2cc1684a8e80c75da6addb8ef60a3a306700098a2196f8a18` |
| `SofiaSans_600` | `https://fonts.gstatic.com/s/sofiasans/v20/Yq6E-LCVXSLy9uPBwlAThu1SY8Cx8rlT69Ckt63t.ttf` | 110,740 / `360a4f02716e97884baff300ec00dca4c33ecf92b47ac8063aee08518171ee6b` | `SofiaSans-SemiBold` | 43,004 / `093077d9c06e4a917664b54d49ed91d92b1ba798789aa4fd140522f7e560a76e` |
| `SofiaSans_800` | `https://fonts.gstatic.com/s/sofiasans/v20/Yq6E-LCVXSLy9uPBwlAThu1SY8Cx8rlT69D6t63t.ttf` | 110,800 / `19f14468c66717d7af9306edf8aad762948163392c8d86563971035cf44f5e36` | `SofiaSans-ExtraBold` | 43,012 / `9b0ebb4ea04079e7df43f9cf46890dffed782cce87e18de29e61dc50aa2f27f8` |
| `SofiaSansCondensed_800` (also the picker face) | `https://fonts.gstatic.com/s/sofiasanscondensed/v6/r05xGKVS5aVKd567NYXawnFKJaTtoAuLnK0EjiAN5s9CZwUqB-aslw.ttf` | 110,256 / `dcbe466174ed70e7e0e4c2fbdd78c41e9ebd8add26e7ddc007e3e83221f8c321` | `SofiaSansCondensed-ExtraBold` | 42,996 / `0063555821d7abd4fb584251d8b78c3faa66f149a2ff5723bf05352a6e4c3438` |

- **Total: 171,980 B (167.9 KiB) in 4 files.** That is the whole ≤ 4 budget, the picker face included.
- The PostScript names are unique, none is an Archivo package name, and none is hand-instanced.
- Each subset keeps `tnum`: uniform at 630 in the three Sofia Sans files and 526 in Condensed.
- The Bold static (`…69Cdt63t.ttf`, `ddc84183…`) was fetched for comparison only and does not ship.

`FONTS.json` for Phase V takes the rows above: family, files, "Version 4.101 (google/fonts; css2 v20 / v6)", the source URLs, "OFL-1.1", the copyright line, RFN "none", both sha256s, and the subset tool (subset-font 2.4.0).

### 5.3 Weights, widths and the native face

```js
face: { family: 'SofiaSans', keys: ['SofiaSans_400', 'SofiaSans_600', 'SofiaSans_800', 'SofiaSansCondensed_800'],
        snap: { 500: 600, 650: 800, 700: 800, 750: 800, 900: 800 }, step: 100, width: 100, minLh: 1.2,
        bands: [{ max: 80, family: 'SofiaSansCondensed', keys: ['SofiaSansCondensed_800'], snap: {}, weights: [800], minLh: 1.2 }] }
```

- **`face.bands` is native theme.js's own width mechanism** (theme.js:323, :615–616). The first band whose range holds a preset's `wdth` draws it in that family.
  - Surveyed on native: the only sites at wdth ≤ 80 are h1–h3 (78, as in v1) and ErrorScreen's title (`ErrorScreen.jsx:79`, 20 / 78 / 800).
  - Chalk sets `youGreet`, `headline` and `loadNum` to 75.
  - So the Condensed band draws exactly h1–h3, the greeting, the headline, loadNum and ErrorScreen's title, all heads or hero figures. No sentence is set in Condensed.
  - `check-def.mjs` asserts this.
  - The band's own empty `snap` keeps the face's 500 → 600 from asking the band for a file it does not ship.
- **Native resolution** (`build-native.mjs`, from native's own `build()`):
  - 400 → `SofiaSans_400`;
  - 600 → `SofiaSans_600`;
  - 700 → `SofiaSans_800`;
  - 800 → `SofiaSans_800`;
  - wdth 78 or 75 → `SofiaSansCondensed_800`.
  - `build(chalk)` returns and asks for exactly the four keys.
- **Parity.** 600 is exact on both clients. 700 sites (buttons, the names at 15 / 700, set inputs) draw true 700 on the web and 800 on the phone. That is one step, like v1's own 650 → 700 snap; the device screenshot decides whether to keep it (§15).
- **Web.** `'chalk-sofia'` is the stack's first family: `--font: 'chalk-sofia', system-ui, -apple-system, sans-serif`. `vibes/chalk.css` names `'chalk-sofia-cond'` on the same selectors the band catches: `h1`, `.sheet h2`, `h3`, `.you-greet`, `.headline-v`, `.load-num`, and the picker sample.

### 5.4 Every type role

No role is caps. The strings are authored in sentence case, so `upper: 0` lowers them, and tracking is 0 wherever caps are dropped (N13–N14). Nothing is under 11 pt. "Cond" means Sofia Sans Condensed ExtraBold.

| Preset | v1 | Chalk | Ink | Note (widths: `fonts.mjs`, web px) |
|---|---|---|---|---|
| `body` | 15 / 100 / 400 / lh 1.45 | 15 / 400 / lh 1.45 | chalk | Size unchanged, so line breaks stay close to v1's |
| `h1` | 26 / 78 / 800 / −.01 | **Cond 30** / ls 0 | chalk | "September 2026": 180.7 against v1's 168.9 on the web (1.07×) and 210.0 on native |
| `h2` | 18 / 78 / 800 | **Cond 21** | chalk | "Where this comes from": 175.3 against 162.3 |
| `h3` | 15 / 78 / 800 | **Cond 17** | chalk | |
| `eyebrow` | 10 / 88 / 700 / caps .16 / dim | **13 / 600**, sentence, ls 0 | **steel** | "Against last week": 97.8 against 123.0 |
| `fieldLbl` | 10 / 88 / 700 / caps / dim | 13 / 600 / sentence | steel | |
| `statLbl` | 9 / 88 / 700 / caps .10 / dim | **12 / 600** / sentence | steel | Also the KPI label and the set-table column heads ("Set  lb  Reps  e1RM", as authored; the unit stays "lb"). "At this pace": 61.2 against 65.6 |
| `dockLbl` | 10 / 88 / 600 / caps .07 | **11** / 600 / sentence | dim, ink when active | "Weight": 33.8 against 40.7 |
| `segBtn` | 11 / 92 / 700 / caps .06 | 13 / 600 / sentence | steel (knockout when chosen) | "Month": 36.7 against 42.5 |
| `chip` | 11 / 92 / 600 | 12 / 600 | steel (knockout when chosen) | |
| `note` | 12 / 400 / lh 1.5 / dim | 13 / 400 / lh 1.5 | dim (6.64 on bar) | |
| `btn` | 14 / 92 / 700 / .02 | 15 / 700 / ls 0 | chalk | "Finish": 38.9 against 39.7 |
| `btnLg` | 16 / 92 / 700 / caps .06 | 17 / **800** / sentence | the button's kind | "Start workout": 104.7 against 144.2 |
| `statVal` | 20 / 108 / 800 / lh 1 / tnum | 22 / 800 / lh 1 / tnum | the caller's, or chalk | Text face: a row figure. "190.7": 61.7 against 60.6 |
| `kpiVal` | 22 / 108 / 800 / tnum | 24 / 800 / ls 0 / lh 1 / tnum | chalk | "12,450": 82.4 against 80.3 |
| `timer` | 22 / 112 / 800 / tnum | 22 / 800 / ls 0 / tnum | chalk | Text face: the clock is a row figure |
| `headline` | 34 / 112 / 800 / −.02 / lh 1 | **Cond 40** / −.01 / lh 1 / tnum | chalk, or the caller's | **Chalk's one numeral treatment.** "190.7": 92.0 against 103.3 |
| `youGreet` | 27 / 100 / 800 / −.02 / lh 1.05 | **Cond 30** / ls 0 / lh 1.1 | chalk (the name too, once `greetName` lands) | "Good afternoon,": 177.8 against 211.5 |
| `setInput` | 15 / 100 / 700 / tnum | 15 / 700 / tnum | chalk | Size unchanged, so iOS Safari's zoom-on-focus behaviour stays the same |
| `mono` | 12, face.mono | 12, face.mono (Menlo / monospace) | chalk | Never used for numbers or labels |
| `loadNum` (a function of size) | wdth 118 / 800 / −.02 / lh .95 / tnum | **Cond** / 800 / ls 0 / lh 1 / tnum | the caller's | At 40, "12,450" is 115.4 against 156.4: tall and narrow, not wide and stamped |

**Native line heights** (from native's own `build()`, floored at 1.2):
- body 15/22;
- statVal 22/27;
- kpiVal 24/29;
- headline 40/48;
- the greeting 30/36;
- loadNum(40) 40/48.

### 5.5 The one numeral treatment

**Tall, narrow and heavy.** Sofia Sans Condensed ExtraBold, tabular at 526 per digit. It is used at 40 for You's headline and at the call sites' own 26–40 for `.load-num`. It is v1's wide stamped plate figure turned on end:
- the same weight;
- about 72% of the width at equal size.

Every other number is normal-width Sofia Sans at 800 or 700, tabular: stat rows, KPI tiles, set inputs and the clock.

### 5.6 The Coach card (fixed 190 / 164)

- **Face:** Sofia Sans, through `T.fit.metrics` (native `assets.fit`, which vibe.js `VIBE_DEFS` carries; the pure definition cannot).
- **The table:** `design/chalk/final/coach-face-sofia.json` holds all 106 of `CARD_FACE.chars`, with none missing.
  - `line` comes from `SofiaSans-SemiBold`, the card's wght 600. `why` comes from `SofiaSans-Regular`.
  - Each character was shaped alone with `tnum` on. The widest advance is 997 in `line` and 1000 in `why`; digits are 630 in both.
  - Phase V regenerates it from the shipped statics with `tools/lib/ttf-advance.mjs`.
- **Type overrides** (only the slots that change):
  - `title` 10/14 → **11/14**;
  - `goT` 10/14 → **11/14**;
  - `goX` 16/18 → **15/18**;
  - `greet` 15/18, `line` 14/19, `why` 12/17 and `goQ` 12/17 stay.
  - Each clears minLh 1.2.
- **Budgets.** Every line height equals v1's, so `cardLayout()` gives **v1's budgets at every iOS size**. At scale 1:
  - You: 111 used of 114 (two lines, two reasons, the greeting);
  - Train: 84 of 88.
  - Checked at 0.823, 0.941, 1, 1.118, 1.235, 1.353 and 1.6.
- **Padding (14) and border (1)** are unchanged. `coachCard · flat` draws the border in `bar`.
- **The vibe must pass verify-coach-surface, verify-your-goal and verify-feel in Chalk** (theme.js:693–694). The goal chips and feel chips read the same table.
- **Web:** `vibes/chalk.css` mirrors the three sizes and line heights on `.coach-ttl`, `.coach-go-t` and `.coach-go-x`. The 320 / 390 harness checks for no clipping.
- **Fallback:** if `T.fit` cannot take the table in time, the card keeps Archivo on v1's metrics. That is logged as the weaker option: a second grotesque on the first card of two tabs.

### 5.7 Literal sites (VOCAB §8.1)

Changing a preset reaches about 300 native sites. Some sites are **literal**, with no preset behind them, and a simple vibe keeps v1's case, size and tracking there, drawn in Sofia Sans.
- **web:**
  - `.cal-band-lab`, `.coach-ttl`, `.coach-go-t`, `.headline-u` (a unit in caps);
  - `.you-since`, `.chart-sub`, `.mini-stat-l`, `.ring-lbl`, `.ring-sub`, `.donut-sub`;
  - `.wk-block-title`, `.plate-strip .lbl`, `.sess-e1lbl`, `.ex-item .eq`;
  - `.cal-dow`, `.cal-legend-item`, `.meal-blank .meal-kcal`;
  - `.add-tile .tag`, `.fuel-fab`, `.swipe-del`, `.ai-cost`, `.sync-pip`;
  - the auth and onboarding kickers.
- **native:** the matching inline `upper: 1` calls.

**What this costs:**
- Sofia's x-height is 0.93× Archivo's, so v1's 8.5–10 px literal labels look about 7% smaller.
- Their contrast rises from v1's 2.70 (dim) to 6.64 on bar.

`'COACH ME'` is typed in capitals, so it is copy and stays caps in every vibe. The fix for the literal sites is §12 item 7, which is optional. The web never lowers these sites alone, because the two clients must match.

---

## 6. Shape: radius, borders, shadows, scrims

**Radius: small, soft and never zero**, echoing Sofia's softened corners. v1 values are in brackets.

| Token | Chalk | Used for |
|---|---|---|
| `r` | **6** (12) | cards, the exercise card, the peek bar, the Coach card |
| `sm` | **4** (8) | buttons, inputs, KPI tiles, mini stats |
| `sheet` | 18 (18) | the platform sheet, unchanged |
| `tile` | **6** (10) | add tiles and their icon wells |
| `pill` | 999 | chips, segmented controls, the toast, the FAB, the rest pill and toggles, all of them tappable (R6.5) |
| `plate` | 2 | data marks, `field · square` |
| `chip` | 3 | plate chips, square tags |
| `mark` | **3** (4) | the calorie track |
| `idx` | **4** (5) | set badges |
| `round` / `hair` | 50% / 1 | avatar and dots / hairlines (web) |
| `bubble` | **10** (14) | Coach bubbles (web) |
| `badge` | **8** (9) | the auth badge (web) |

**Borders**
- Cards: none (`flat`).
- Fields: 1 pt knurl (`field · square`).
- The exercise card, chips and the gear / nav buttons: 1 pt collar, as in v1.
- The set check: 1.5 pt knurl.
- The sheet's top edge: 1 pt knurl.
- The rest pill and peek bar: knurl.
- A lifting block: a knurl keyline over mulberry .04.
- Wins / Improve: a **2 pt top border** in good / warn, replacing v1's 3 pt side stripe (N10).
- The stat line's column rules: 1 pt collar.

**Shadows.** One, on the tour card: 0 14 36 at shade .28 (native opacity .28, radius 24, y 14). Every other token:

| Token | Chalk |
|---|---|
| `peek`, `rest`, `toast`, `fab` | web `[]`; native opacity 0, radius 0, y 0, elevation 0 |
| `fabPressed` | `[]` |
| `calTick` | a 1 px ring in chalk .70 (v1: rack .55) |
| `flame` | accent .35, inset 1 |
| `kpiDay` | knurl, inset 1.2 |
| `kpiDayOn` | none |
| `kpiToday` | well 1.5, plus steel 2.5 |
| `kpiTodayOn` | well 1.5, plus chalk 2.5 |
| `guideEaten` | knurl, inset 1 |
| `trajGood` / `trajWarn` / `trajBad` | 4 px at .18 in good / warn / bad |
| `tourLit` | accent 2 |

No shadow is coloured, and none glows (R7.1).

**Scrims and glass**
- **The sheet:** backdrop graphite .40, plus `blur(3px)`, v1's filter. `webkit: false` is fixed, as in v1. This is the **only blur** left (R7.2).
- **The dock and workout bar:** `filter: 'none'`. `dock · solid` and `sessionChrome · flat` draw them opaque.
  - `scrim.dock.native.intensity` stays 40 but is not drawn.
  - The two glass tints stay v1's alphas in Chalk's rack, for a v1-look fallback.
- **The tour:** rack .55 → .94 at 42%, a chalk-white fog. Native builds its three stops from these two; there are no exact strings.
- **Textures:** none (§9).

---

## 7. Chrome and the light page

| Role | Chalk | Note |
|---|---|---|
| `scheme` | `light` | |
| `themeColor` | `#14161a` | Left as v1's (R3.3). It is already dark |
| `chrome.statusBar` | `dark` | Also used by ErrorScreen |
| `chrome.keyboard` | `light` | the 14 TextInputs |
| `chrome.datePicker` | `light` | both sites |
| `chrome.blurTint` | `light` | not drawn |
| `chrome.shadow` | `#111416` | the tour card's shadow |
| `chrome.camera` | `#000000` | |
| `chrome.systemFace` | `null` | as v1 |
| `chrome.colorScheme` | `light` | the web's own form controls, light like the page |
| Fixed: `appearance`, `launch`, `manifestTheme`, `webStatusBar` | v1's: `dark`, `#14161a`, `#14161a`, `black-translucent` | No vibe can change these |

**The web status band.** A fixed strip:
- `top: 0`, height `var(--safe-top)`;
- filled with `band` `#111416`;
- `pointer-events: none`;
- stacked above the workout bar and the sheets.

In a Safari tab the inset is 0, so the strip vanishes. In the installed app it is a graphite band under the always-white status text (18.49). The workout bar runs under it (VOCAB §8.11), so its top band stays dark too.

**Native.**
- A dark-text status bar over the page, with no band.
- System alerts stay dark, because `appearance` is fixed.
- Launch is graphite, then the page turns light once the account's vibe is read.

**No light flash before the vibe is known.** This is the engine's job:
- the web's first frame uses the device hint;
- native uses v1 until `settings/vibe` arrives.

**Native sign-in and banners stay v1** (spelled 6-digit). Sign-in only ever draws under v1, because the vibe is per account and native keeps no device key. The banners are white on the pRed / pGreen fills: 9.29 / 6.60.

**Web-only tokens.** `web.rgb` has v1's 15 channel names; `web.root` is v1's fixed layout and motion. No new motion.

---

## 8. Every block in the vocabulary

A simple vibe names `'v1'` or a `shape`-grade look (VOCAB §2). Layout is v1's everywhere.
- **The ten non-v1 looks:** `card · flat`, `youCard · flat`, `statRow · line`, `kpi · plain`, `field · square`, `calCell · open`, `dock · solid`, `addTile · flat`, `sessionChrome · flat`, `coachCard · flat`.
- **The other 19 blocks** are `'v1'`, drawn in Chalk's tokens and type.

| Block | Look | What Chalk draws |
|---|---|---|
| `card` | `flat` | A white `bar` card on the grey page, no visible edge, 6 pt corners, v1's padding. A tappable card shows a knurl edge when pressed. The head's title is the eyebrow role (13 / 600 steel); meta right; ⋯ in dim. No photo |
| `youCard` | `flat` | As `card`. The Wins / Improve colour moves to a 2 pt top border in good / warn; the titles still say which is which |
| `eyebrow` | `v1` | The type role does the work: 13 / 600, steel (10.00 on bar), sentence case, no tracking, no device |
| `sectionHeader` | `v1` | The title in the eyebrow's arguments (13 / 600 steel, once native points `Section` / `Sec` at the preset, VOCAB §8.1), with v1's collar hairline running to the edge, 26 above and 10 below |
| `screenHeader` | `v1` | The eyebrow over a **Cond 30** h1. The nav buttons keep their place and their 34 pt, with collar edges |
| `sheetHost` | `v1` | A white sheet, 18 pt top corners, a knurl top edge, a 36 × 4 grab handle in grip (3.17), a graphite .40 backdrop with a 3 px blur. Maximum heights and dismissal are v1's |
| `sheetTitle` | `v1` | h2 in **Cond 21**, left |
| `statRow` | `line` | **A box-score line:** no tile and no ground. Values in Sofia Sans 800 / 22 on one baseline, 1 pt collar rules between the columns, and labels under them at 12 / 600 steel, sentence case ("Trend now │ Goal lb │ At this pace", as authored). Mini stats take the same look (a switch site to open) |
| `kpi` | `plain` | The 2 × 2 grid of recess tiles (`well` in the white card, 1 pt collar edge, 4 pt corners) with no corner tint (`kpi` alphas 0). The label is 12 / 600 steel. **The delta is bare signed text with its arrow** in good / bad / warn / dim (5.50 / 7.75 / 5.32 / 5.80 on the well), with no pill. Value 24 / 800; "last week …" in dim. The sparkline's lit part is in the subject colour and its unlit bars in knurl (3.53, pinned). Seven day dots in knurl rings; today is ringed in steel (`kpiToday`), or in ink when today's dot is on (`kpiTodayOn`) |
| `headline` | `v1` | Face and weight come from the roles: **Cond 40** for You's headline, Cond at the call sites' 26–40 for `.load-num`, in the caller's colour. Fuel's zone colour and Weight's ochre are kept (4.79 on the card, and large). The unit stays a literal site (§5.7) |
| `chip` | `v1` | A pill on the well with a collar edge, 12 / 600 steel. **Chosen is inked in:** a graphite fill with white words (17.65). Chips that are 44 tall stay 44 |
| `segmented` | `v1` | A pill track on bar with a collar edge and pill segments, 13 / 600 sentence case, steel. The chosen segment is inked graphite |
| `btn` | `v1` (radius.sm 4) | **Primary:** mulberry with white 15 / 700 (9.54). **Plain:** raised grey with ink (14.04). **Ghost:** a collar keyline with steel words (10.00); the label identifies it (knurl edge is optional ask §12 item 9). **Danger:** a deep-red keyline with deep-red words (8.87). **Large:** 17 / 800, sentence case ("Start workout"). Pressed scale .97, disabled .4, 44 tall at least |
| `field` | `square` | Label 13 / 600 steel above a box on bar (on the well inside cards), with a **1 pt knurl edge** (4.04 / 3.53) and 2 pt corners. Focus turns the edge mulberry (9.11). The keyboard is light. Heights and error room are v1's |
| `note` | `v1` | 13 / 400 dim (6.64 on bar), line height 1.5 |
| `toast` | `v1` | An inked graphite pill with knockout 15 / 700 words, 16 above the dock, **no shadow** |
| `settingsRow` | `v1` | Full-width rows with collar rules between them, the label at 14 / 600 ink, the value at 12 steel tabular, and a › in dim. A press darkens the row (ink .05). Toggles: a grip track and steel knob (3.16), on: accent knob on accent .28 (5.55) |
| `listRow` | `v1` | v1's rows in the new inks. Name 13–14 / 600 ink; the line under it dim; the value right in Sofia Sans 800 tabular; collar rules between rows. PR and chosen keep their non-colour cues |
| `setTable` | `v1` | The exercise card: white, 1 pt collar edge, 6 pt corners, clipped. The 4 × 30 group tag in its print colour, the name at 15 / 700, "Last …" in steel (Sofia Sans has →, so drop-set strings stay in face), then the column heads in `statLbl`. A lifting block: a knurl keyline over mulberry .04 with its title in mulberry (8.53) |
| `setRow` | `v1` | Every badge is raised grey. The set number is steel (7.95); **W is in warn (4.85), F in deep red (7.05), D in cobalt (6.15)**. Inputs sit on the well with knurl edges and a mulberry focus; grey targets in dim; e1RM in dim. The 30 × 30 check has a 1.5 pt knurl edge. When done: a green fill with a white ✓ (6.60), and the row washes pale green (.12). The flash is mulberry .28 into done. Drops hang on a cobalt rail at .70 (3.80) |
| `plateStrip` | `v1` | "Per side" (the literal caps site keeps v1's case), then chips in the six print-dark plates with near-white figures (4.62–14.28). "bar only" and "+x left over" word for word |
| `calCell` | `open` | No cell grounds, like a printed calendar. Day numbers in dim; a trained day in ink with up to four 3 pt plate bars (every plate ≥ 4.04 on the page); **today** is 800 in mulberry with a mulberry keyline, so it is never told by colour alone. The weekday row is a literal site |
| `chart` | `v1` | v1's geometry in Chalk's inks: an ochre line (the pinned default), line2 in ink, bars in cobalt, rings and meters on the track, grids in collar, the heat strip ochre against collar (3.31). **The calorie meter:** white ticks with ink rings (5.20–5.39), the white head and dashed target (a ring requested, §12 item 2), the runway hatch (knurl requested, §12 item 5). The pinned `analytics.js` area gradient and end-dot glow remain, and on chalk they read as an ochre-brown fade: the one surface tell a simple vibe cannot remove (§11) |
| `dock` | `solid` | An opaque white bar with no blur and a collar top rule (1.45). Five cells: v1's 22 pt icons over 11 / 600 sentence-case labels ("You Train Fuel Weight Steps", as authored), dim at rest (6.64), ink when active, **plus v1's 26 × 2 mulberry mark** on the top edge (9.11). Same tabs, order, place and 64 pt height |
| `fab` | `v1` | A mulberry pill 14 above the dock, with a white + (2.6 stroke) and v1's literal "LOG FOOD" (§5.7) in white. **No shadow.** Pressed: `#5d224a` (11.71), scale .955 |
| `addTile` | `flat` | Every tile on the well, with no border and no washes, 6 pt corners. Photo is marked by its mulberry icon well with a white icon. **The lit tiles' tag and icon well sit on `raised`** (steel 7.95, ink icon 14.04), not grip. The Photo tile's tag is knockout on accent (9.11). An off tile stays visible at .42 |
| `sessionChrome` | `flat` | **No glass, no shadows.** The top bar is opaque `bar` under a collar rule, with the dark band above it on the web. It holds the name (15 / 700 ink), the clock (Sofia Sans 800 tabular, steel), the Coach chip (38, collar edge, mulberry), the calendar button (38) and **Finish** (mulberry). The rest line is 3 pt, done green or danger red. The rest pill (round) and the peek bar (radius 6) are raised grey with knurl edges (3.21) |
| `youHero` | `v1` | The avatar (52, raised, steel initial); the greeting in **Cond 30**, all ink once `greetName` lands (until then the name is mulberry, 7.96 on the page); the gear (36, bar, collar edge, steel). The sub-line is steel, "Member since" dim |
| `coachCard` | `flat` | A white card, its 1 pt border drawn in `bar`, 6 pt corners, 190 / 164, padding 14, in Sofia Sans on its own table (§5.6). The mulberry bubble mark and COACH (11 pt; 9.11); the lock in mulberry (steel when unlocked); lines in ink, the reason in steel; the caution line in warn (6.09); COACH ME over a collar rule. No photo |

**Parts no block covers:**
- the sync pip, the trial bar and the swipe-delete panel take tokens only:
  - web trial bar: warn on its .10 wash, 4.67;
  - native trial banner: onWarn on warn, 6.38;
  - swipe-delete: 9.29;
- **onboarding choice cards** (`.ob-choice.on`, auth.css:201): chosen is a mulberry border plus a raised fill. The fill is a faint second cue on a light page (raised against the page, 1.10). It is logged; a simple vibe cannot add a stronger one;
- web sign-in and the gates take Chalk's tokens on the web only;
- the admin is legible in the same tokens.

**Build notes for Phase V (web):**
- rack.css writes several tints as literal alphas, so `vibes/chalk.css` restates each one by selector:
  - `.set-idx.t-W/F/D` backgrounds become `var(--raised)`;
  - the delta pills get no fill;
  - `.kpi`'s radial wash is removed.
- Scope the set-table rules under `.ex-block` or `.rt-sets` (VOCAB §8.9).

---

## 9. Image slots, scrims and textures

- **No photos.** Photos belong to Iron Age alone. `images: {}`, so all seven hero slots stay empty and close up, as in v1.
- **No texture.** A chalk-grain texture was considered and rejected, for three reasons:
  - R0 keeps drawn devices and textures out of simple vibes;
  - "chalk dust" is never-do #34;
  - grain under small text costs contrast.
- The ground is a flat colour named for its material.
- **Scrims:** only the sheet backdrop (graphite .40) and the tour's chalk fog. The picker thumbnail and its scrim are `null`.

---

## 10. Icons

- **`icons: 'v1'`.** Simple vibes keep the v1 set (the orchestrator's call; PLAN §2 rule 14 left it open). v1's hand-drawn set keeps its shape (24-unit grid, round caps and joins, no fill, v1's strokes) and is recoloured through its roles:
  - dock: dim at rest, ink when active, mulberry mark;
  - FAB +: white;
  - add tiles: ink, with white on the mulberry Photo well;
  - gear and calendar: steel;
  - Coach bubble and lock: mulberry; unlock: steel.
- **The `spark` conflict, flagged.** With `icons: 'v1'`, the estimator notices draw v1's four-point sparkle in Chalk too (never-do #29; R8.8; SYNTHESIS finding 6).
  - Chalk's neutral mark, if a shared simple set lands, is C's **two-wave ≈**: `icon(1.6, [path('M5 9.75c2.3-2.2 4.7-2.2 7 0s4.7 2.2 7 0'), path('M5 14.25c2.3-2.2 4.7-2.2 7 0s4.7 2.2 7 0')])`, drawn in `warn` at the two sites.
  - It ties to Rack's own "≈" estimate copy, and it is not a star, sparkle, asterisk, bolt or stock icon.
  - A's note card was dropped as too close to Lucide's `file-text`.
- **Glyphs** (↳ ⚙ ✕ ⋯ ✓ ⚠ ✎ ▾ ▴) fall back exactly as v1's do, because Sofia Sans lacks the same set Archivo lacks.

---

## 11. Where a light page costs something

1. **Charts.**
   - The pinned `analytics.js` draws area fills as gradients and a 6.5 r glow, which becomes an ochre-brown fade under the weight line on chalk.
   - `chart · ink` would remove both by CSS only, with no new geometry: every change is `shape`-grade work, but VOCAB grades the look `deep`.
   - Requested (§12 item 8). Until then the wash is logged.
2. **The calorie marks.** The copy fixes the head as white.
   - On the fill it caps, the head reads 4.46–9.29.
   - On the bare zones and the track, the white target and ticks drop to 1.33–1.76.
   - The ticks already have `calTick` (ink .70, 5.20–5.39). The head and target need the same ring (required, §12 item 2), or "the dashed mark is your target" points at nothing.
3. **The W badge letter** needs `warn` at its call site (required, §12 item 3).
4. **The runway hatch** vanishes (1.06) until it spends a role (§12 item 5).
5. **Brightness at night.** v1 stays the default; Chalk is a choice.
6. **Literal caps sites, the 700 → 800 native snap, and the onboarding chosen cue** are small, and each is listed above.

---

## 12. What the contract must add or decide (for the orchestrator)

Each item keeps v1 byte-identical.

**Required: Chalk is not correct without these.**

1. **`colors.band`** `#111416` and the web status strip (§7). Shared by every light vibe.
2. **A ring for the calorie head and the dashed target**, and their guide swatches.
   - For example `shadow.calHead` and `shadow.calTarget` (v1 = none), with native `CalMeter` drawing a 1 pt border in the ring's role.
   - Chalk sets chalk at .9: 9.02–11.16 against the zones and the track.
3. **The W set badge's letter → `warn`** at `rack.css:584` and native `SetTypeBadge`. Track 4's E0 call-site mapping; v1 does not move, because warn = pYellow there.
4. **`addTile · flat` worded with the lit tag and icon well on `raised`**, not grip. VOCAB-level, for every light vibe.
5. **`.cal-runway`'s hatch and its right edge spend a role.** Chalk uses `knurl` (3.18); v1 keeps rack .55 / .70.
6. **`face.bands` into ROLES** (kind `face`, input `bands`). Native build() already reads it; the contract should cover it so `vibes-contract` and the native parity check see it. The web side is selector CSS.

**Optional, with fallbacks.**

7. **One engine switch for literal caps.** A vibe key that makes the literal sites drop `upper` and its tracking and floors their size at 11, on both clients. It includes pointing Section / Sec and the Kpi label at their presets (VOCAB §8.1). v1 = off.
   - *Fallback:* §5.7's sites keep v1's caps in Sofia Sans.
8. **Re-grade `chart · ink` to `shape`.**
   - *Fallback:* v1 charts, with the ochre wash logged.
9. **Ghost-button edge → `knurl`** in new vibes [T4 R8].
   - *Fallback:* a collar keyline; the label identifies the button.
10. **`greetName`** (v1 = accent).
    - *Fallback:* the name stays mulberry, one P1 tell left.
11. **A shared simple icon set with a neutral `spark`.**
    - *Fallback:* v1's sparkle stays at the two estimator notices (§10).

---

## 13. What Chalk never does

1. A warm cream or off-white ground (its R−B is −3), a clay or terracotta accent, Whiteboard's plum `#9c1f5e`, or any violet in the 240–295° band.
2. Tracked capitals on a type role, or an uppercased unit. Every preset is sentence case with tracking 0; the unit is "lb", never "LB". `'COACH ME'` is copy.
3. A type role under 11 pt. Labels are 12–13, dock labels 11.
4. Grey text under 4.5:1, or a fourth, fainter grey: `faint` = `dim`, 5.28 or better on every surface.
5. Stat tiles as boxes, delta pills, KPI corner glows, add-tile washes or tinted set badges.
6. A coloured side stripe. Wins and Improve take a 2 pt top rule.
7. Glass on content, or any drop shadow but the tour card's. The dock and session chrome are opaque; the only blur is the sheet backdrop's 3 px.
8. Mulberry off its job: never data, never status, never the greeting, never a plate's hex. Its nearest data colour is 23.3 ΔE00 away.
9. A coloured glow, or a black shadow.
10. v1's sparkle, a star, an asterisk, a bolt or a stock icon, in any icon Chalk draws (§10 records the inherited one).
11. A face from the AI-default or Claude-steered lists, a monospace for numbers or labels, a third family, or synthesised bold or italic (`font-synthesis: none`).
12. A sentence in Condensed. Condensed is for heads, the greeting and the hero figure only.
13. A light flash before the account's vibe is known, or a light web status band.
14. A pill on something that is not tappable.
15. Up or down, good or bad, the selected tab, today, chosen or a done set told by colour alone. Arrows, signs, the dock mark, the today keyline, the inversion and the ✓ stay.
16. Pure `#ffffff` as a surface or pure `#000000` as ink. White appears only as type on mulberry, red or green, and as the calorie head the copy calls white.
17. Chalk dust, handprints, marker or whiteboard faces, hazard stripes or any texture.
18. New motion. v1's 140 / 240 ms ease-out stays.
19. A new alarm colour on a food state v1 does not colour that way.
20. A changed word, number, control, gate or dock tab.

---

## 14. Phase Q checks specific to Chalk

- **Fit at 320 and 390** (web harness and a native screenshot).
  - **Train's h1:** "September 2026" is 180.7 px against about 214 px of room (288 less the two 34 pt nav buttons and their gap).
  - **Fuel's date h1:** "Wed, Sep 24" is 132.6 px against about 172 px of room (three nav buttons).
  - If the h1 clips, it drops to 28 (168.7 px, v1's web width).
  - **Fixed boxes under minLh 1.2:**
    - the dock (64): `dockLbl` sets no line height, so its natural line is 1.2 × 11 = 13.2 pt against v1's 1.088 × 10 = 10.9;
    - 44 pt buttons;
    - 44 pt chips (Movement, feel, goal);
    - the segmented control's height;
    - the Coach card (§5.6).
- **Colour:**
  - no small ochre text on the page or well (else take the §3.6 fallback plates);
  - no toggle on the page;
  - the calorie head and target ring in place before commit.
- **Native:**
  - `build(chalk)` resolves exactly the four keys;
  - verify-text-color holds for Chalk's presets;
  - verify-coach-surface, verify-your-goal and verify-feel pass on Chalk's table;
  - a device screenshot decides 700 → 800.
- **Parity:** rn-render's resolved faces, colours, radii and variants against this definition.
- **The "did an AI make this?" panel:** palette and type only, non-blocking for a simple vibe.

---

## 15. Decisions left to Micah

- **Whether Rack should have a light vibe at all:** the dark launch followed by a light app, dark system alerts, and brightness at night.
- **The mulberry `#6c3058`.** The gates chose it; it is the only accent family that cleared all of them [T4 GF4]. Judge it on the phone.
- **Whether ochre `#8a6b00` still reads as "yellow"** for "Yellow — hold", and dark amber `#7a5a00` as "amber". On a light page nothing lighter can be yellow text.
- **Native 700 → 800** (buttons, names, set inputs one step heavier than the web), or 700 → 600. Decide on a device screenshot.
- **The `spark`:** v1's sparkle inherited through `icons: 'v1'`, or a shared simple set with the ≈ (§10).
- **The fallback plates** (§3.6), if Q finds small ochre text on the page.
- **The picker name and feel line:** "Chalk" / "Chalk-white page, dark ink."

---

## 16. Registry entry and picker data

```js
{ id: 'chalk', name: 'Chalk', feel: 'Chalk-white page, dark ink.', experimental: false, scheme: 'light' }
```

Picker tile (T10 §4.8):
```js
pick: { ground: '#e8ebeb', card: '#f8fafa', edge: '#f8fafa', edgeW: 0, radius: 6,
        text: '#111416', soft: '#3b4045', num: '#111416', accent: '#6c3058',
        numFace: { web: "'chalk-sofia-cond'", wght: 800, native: 'SofiaSansCondensed_800' },
        numPt: 36.6, thumb: null, scrim: null }
```

- `315` at 36.6 pt (24 / 0.655, cap-height matched) is 57.8 pt wide, inside the 92 pt limit.
- The feel line in steel reads 8.73 on the tile's page.
- The web picker face is the 6,972-byte digits subset.

---

## 17. On the phone (390 pt; illustrative, every real word and number is v1's)

**You**
- **Top.** In the installed web app, a graphite band under the white status text. On native, dark status text over the grey-white page.
- **Hero.** The avatar is a raised grey disc. "Good evening," and the name stand tall and narrow in Condensed 30, all graphite once `greetName` lands. The gear sits in a small white square.
- **Coach card.** 190 tall, white, no visible edge, 6 pt corners: a mulberry mark and COACH, the line in ink and the reason in steel, and COACH ME over a hairline.
- **Wins / Improve.** "How you're doing" in 13 pt steel, then the two cards with a thin green or amber-brown rule along their top edges.
- **Trend.** The trend figure is the screen's one tall Condensed numeral. Under it, a box-score line of three values split by hairlines, with sentence-case labels in steel.
- **"Against last week."** Four recessed grey tiles, each with a bare signed delta and its arrow.
- **Dock.** A solid white bar with a hairline top. "You" is in ink under a short mulberry mark.

**Live session**
- **Top bar.** An opaque white bar: the name, the steel clock, a 38 pt Coach chip, and a mulberry **Finish**.
- **Exercise card.** White with a faint edge. A deep-red chest tag, the name, "Last …" in steel, and column heads in 12 pt steel.
- **Set rows.**
  - Every badge is a grey square, with a brown **W**, a red **F** or a blue **D** where the set type says.
  - A done set fills its check green with a white ✓, and its row washes pale green.
  - The rest pill is a flat grey pill with a graphite edge and no shadow.

**Fuel**
- **Header.** "Fuel" in steel over "Today" in Condensed 30, with ‹ › and the gear.
- **Summary card.** The day's number stands tall and narrow in the zone's colour. The calorie bar is a grey groove with pale blue, khaki and rose bands and an ochre fill. The head is white with a graphite edge (once the ring lands), and so are the ticks.
- **Meals.** White cards.
- **FAB.** A mulberry pill with no shadow.
- **The add sheet.** White, over a graphite-dimmed page, with flat grey tiles. Photo carries the only mulberry square.

---

## 18. Losing concepts (Micah may swap one in)

**B: "Printed plan, square". 105 points, second.**
- **The idea.**
  - Rack as a coach's printed training card: a cool chalk-white page, the log set in Vollkorn (a sturdy "bread and butter" book serif with dark, meaty serifs), printed in one black ink plus one mulberry spot colour, with every box cut square and ruled.
  - The Coach card is the one piece in Archivo on v1 metrics, like a typed slip clipped to the plan.
  - Looks: `card · plate` (radius 2, 2 pt knurl keyline), `btn · square`, `chip · square`, `segmented · boxes`, `field · square`, `toast · square`.
- **Its palette** is chalk-r2 with darker plates (`#860211`, `#816100`; worst group 12.19, ochre text 4.81 on the page, W badge 4.64 on a done row), collar `#cdd3d4`, steel `#41464b` and no drop shadows.
- **Strengths** (the judges):
  - the least AI-looking silhouette, with no shadows anywhere;
  - the best logbook metaphor;
  - it found Vollkorn's old-style figure trap itself.
- **Why it lost.**
  - Every number depends on a new `lnum` ask: 17 web selectors, native `type()`, about 84 direct `fontFamily` lines, and react-native-svg text unverified on iOS. A missed site drops 3 / 4 / 5 / 7 / 9 below the line in a numbers app.
  - minLh 1.393 is the tallest native line.
  - 513 KB of native statics.
  - Its toggle knob and lit tag measure 2.58, both unflagged.
  - It has the most Iron Age-like look of the three (serif, light page, red-violet, ruled boxes).
  - It would claim Vollkorn, which Oxblood's S3-b wants.
  - Its square-cap icon set breaks PLAN rule 14.
- **Grafted from it:** the collar, `font-synthesis: none`, subsetting the source files, statLbl at 600, and no shadows. Its plates are recorded as the fallback.

**C: "Legibility first". 102 points, third.**
- **The idea.**
  - A chalk-white page in near-black ink, set for reading at arm's length under gym lights.
  - Rack's words are in Atkinson Hyperlegible Next, the Braille Institute's low-vision face. Every number, arrow and Coach sentence stays in v1's measured Archivo.
  - Looks: `listRow · plain`, `field · square`, `calCell · open`, `dock · solid`, `addTile · flat`, `sessionChrome · flat`, no shadows.
- **Its inks:** steel `#33383d`, dim `#4f545a`, warn `#7a5a00`.
- **Strengths** (the judges):
  - the best readability, with every figure reproducing (steel 11.30, dim 7.29 on the card);
  - the cheapest fonts (33 KB web, 186 KB native in four css2 statics that pass t5-check);
  - the safest Coach card;
  - the only concept that caught the runway hatch.
- **Why it lost.**
  - The biggest thing on each screen stays v1's wide Archivo, which it also shares with Clear sky, so it is the least distinct.
  - Two grotesques side by side read as a fallback, not a decision.
  - Its white-panel look is "the most familiar light UI there is", by its own account.
  - The figure face is the largest engine ask of the three (about 20 arrow sites and every literal figure site).
  - Its W-badge claim did not hold: a 0-alpha wash is transparent, not raised.
  - `faint` is a fourth grey.
- **Grafted from it:** warn `#7a5a00`, the raised badge (built so it lands), the runway ask, the `addTile · flat` wording, css2 statics, the fixed-box fit list, and the ≈ spark (recorded).

---

## 19. How this was made

- **Read:**
  - VIBES-PROMPT §0–§2, §9–§14;
  - the three concepts in full (B at its headings and palette);
  - the three judges' reports;
  - VOCAB.md in full;
  - PLAN.md §2–§3.2;
  - SYNTHESIS §0–§5.1;
  - `v1.js`, `index.js`, `vocab.js`;
  - the rack.css, auth.css, settings.js, workout.js and food.js lines cited;
  - native `theme.js` (face, bands, fit) and `coach-view.js` (the card), read-only.
- **Scripts** (all in `~/dev/vibes-night/design/chalk/final/`):
  - `node check-def.mjs`: 133 / 133;
  - `node check-colour.mjs`;
  - `node build-native.mjs`;
  - `node fonts.mjs`;
  - `node tints.mjs`;
  - `node explore.mjs` (the graft numbers);
  - `node ~/dev/vibes-night/tools/judge-chalk3/coachfit.mjs fixed` (the Coach budgets);
  - `node ~/dev/vibes-night/tools/t5-check.mjs` on the four statics, the Bold and the two variables.
- **Downloads** (through `tools/fetch.mjs`, §14 hosts): the css2 listing plus five gstatic statics (400, 600, 700, 800, Condensed 800), in `design/chalk/final/fonts/`. The google/fonts variables and METADATA / OFL are research's copies, from its fetch log.
- **Installs:** none. **Refusals:** none.
