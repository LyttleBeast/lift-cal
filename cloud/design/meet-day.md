# Meet Day — the final spec

V59 Phase D, the experimental slot, id `meet-day`. Written 2026-09-29 from the two concepts in `design/meet-day/` and the two judges' scores. Nothing here is approved.

**The files this spec is:**
- the pure definition: `wt/web-design2/vibes/defs/meet-day.js` (imports nothing, frozen, every v1 role key for key, every engine-v2 role);
- the icon set: `wt/web-design2/vibes/icons/meet-day.js` (v1's 19 icons re-cut, a neutral `spark`, 8 glyphs drawn);
- the checks, all read-only and all passing: `tools/mdF-check-def.mjs` (2,449 checks, 0 failed), `tools/mdF-colour.mjs` (0 failures; its report is `design/meet-day/mdF-colour-report.txt`), `tools/mdF-fonts.mjs`, `tools/mdF-widths.mjs`, `tools/mdF-webfont.mjs`, `tools/mdF-wdth-survey.mjs` (§21).

"(computed)" marks a number one of those scripts printed tonight. Research keys (C1–C30, R0–R10, `[T1]`–`[T10]`) are SYNTHESIS's. Code anchors are `file:line` in `wt/web-design2` (web, 58ac3be) and `rack-mobile` at 1cb6498 (native); line numbers drift, the code wins.

> **Which screens fall back to "same order, new shapes" (V59 §12.3, said first).**
> - **Weight: by design.** Concept A's swap (the reading above the Log input) is **off by default**: logging is the most frequent thing done there, and the swap would push the input down on every visit. It is written out in §8.5 for Micah to turn on.
> - **You, Train, Fuel, Steps, the workout summary and the live session rearrange** (§8). Each is gated by its own proofs (§8.9). A screen that fails any proof renders same order, new shapes, **alone**; the others keep theirs.
> - **Until Phase X merges, all seven render same order, new shapes.** The engine has no composition hooks yet (§9), so `meet-day.js` carries no `compose` key tonight and the vibe is complete without one.
> - **Every screen outside the seven is same order, new shapes by design:** every sheet, Stats, Settings, the day sheet, the picker and routines, onboarding and the tour, water, the add-food sheets and the estimator, sign-in and the gates (web only), and the owner's admin.

---

## 0. The pick

**Scoring.** Each judge's five marks, with "could an AI have made this?" inverted (10 − score) and counted twice:

| Concept | Judge 1 | Judge 2 | Total |
|---|---|---|---|
| **A · The board** | 8 + 12 + 7 + 8 + 6 = **41** | 8 + 12 + 6 + 8 + 5 = **39** | **80** |
| B · The loading room | 5 + 8 + 8 + 8 + 8 = 37 | 5 + 8 + 8 + 7 + 8 = 36 | 73 |

**A wins, with no tie, and both judges picked it.** Meet Day's colours sit almost on v1's (ground 3.65 ΔE00, panel 2.47, computed), so its identity has to come from structure, and only A supplies enough of it to pass the silhouette test (R10b) that this slot, alone, must pass. B is what A falls back to, screen by screen.

**What was grafted onto A.** Every graft was asked for by at least one judge, and each makes A truer or safer without blurring it.

| # | Graft | From | Why |
|---|---|---|---|
| 1 | **warn → amber `#ffa42e`** | B, both judges | index.js HUE_NAMED binds `colors.warn` to "amber" (you.js:1067, "amber the other way"). A's `#ffe14d` was lemon and was the legs and carbs hex (0.00 ΔE00). Amber is 21.06 off it. Good against warn: 47.30 / 13.33 / 13.02 (normal / deutan / protan, computed) |
| 2 | **The toggle's off knob in lamp white** | B, both judges | v1's steel knob on Meet Day's grip track is **1.80:1** (rack.css `.tog::after`, native coach/settings.jsx:139). Lamp on grip is 4.02. It needs a knob role (§15 E1) |
| 3 | **Every calorie mark ringed in board black; a target tick stands in a 1pt board notch** | B, both judges | A's bare lamp tick is 1.14 on the yellow fill and 1.02 on the arms white. Ringed: lamp on the ring 17.61, the ring on any plate fill 5.90 or better (computed) |
| 4 | **Steps' today stays an arc**, segmented into ten cells | B, judge 1 | steps.js:220: "Third distinct shape in the app on purpose: Fuel is a bar, Water is a filling vessel, this is an arc." Only You's half-tile Steps / Water pair turns its rings into bars |
| 5 | **A self-hosted, vibe-prefixed web face**: `meet-day-archivo` (61.5 KiB) and `meet-day-num` (8.8 KiB) | B's measure, judge 1 | v1's Google-hosted Archivo is not cached by the service worker (sw.js bypasses googleapis.com; VIBES-LOG's S-web review, listed-not-fixed item 1), so the condensed look would vanish offline and the Vibes card could not draw its "315". The brief also requires family names that start with the vibe id |
| 6 | **The exercise head's group tag drawn as the plate seen edge-on** (4 × 18), and the legend swatches as 3 × 10 slivers | B, judge 1 | One plate drawing then runs through the loading chart, the calendar, the tag and the legend |
| 7 | **The week card's KPI lanes**, a 4 × 7 board of day lamps | B, both judges | In place of A's `kpi · board`, which vocab.js has no look for. CSS only on the web (DOM, reading and focus order untouched). It removes A's last 1px tile border |
| 8 | **An honest caps list** | B, judge 1 | A's "no caps anywhere" was untrue as specified: `.you-since`, the add tile's tag and other v1 literals stay caps under v1- or shape-grade looks. §7 lists every one, and what re-sets it |
| 9 | **Weight's swap off by default** | B, both judges | Logging is the most frequent action (above) |
| 10 | **No lamp glow** | B, both judges | A lit lamp is 12.13:1 against an unlit one without it; a glow is the one thing a tell-hunter circles, and Android elevation cannot colour it |
| 11 | **The top bar's clock is not inverted** | judge 1 | Otherwise the clock, Finish and the current set are three lamp-white fills competing for the eye between sets. Only the rest pill's time is inverted (§15 E9) |
| 12 | **`spark` is a plug**, not A's bulb | B, judge 2 | A bulb reads as the stock "tip" icon. Both notices it marks are about the estimator's connection (food.js:1216-1225) |
| 13 | **`glyphs.check` stays text** | judge 2 | The lamp stands in for ✓ only in the set check, where `setRow · attempt` draws it. A disc at "✓ At goal" (you.js:1552) or native's food and verdict ticks reads as a bullet |
| 14 | **The coach pulse in warn**, never lamp white | both judges | A's lamp pulse at .38 half-lit the box — "a box that looks already ticked", which rack.css:661-672 warns against — and dropped the unlit lamp's ring to 1.18:1 |
| 15 | **No split-flap cell and no LED dot fill** | both judges' notes | Both judges named the flap and the dot matrix as stock scoreboard costume, and the flap's seam crossed the figures' waist. Headline figures stand bare; lines have no area fill (§15 E5, E6) |
| 16 | **B's per-screen reasons are the fallback text** | judge 2 | §8 quotes them wherever a screen falls back |

**Kept from A over B:** set inputs at wdth 75 / 700 (B's 62.5 at 15pt is too narrow mid-set); Google css2 static instances for native, the same Archivo v2.001 outline the web draws (72,780 B for two files); the panel lifted to `#16181d` so a 2px gutter reads (4.56 ΔE00 off the board); the square-cap icon re-cut; the section merges under Q-Q1; the board grid down the session.

**Not grafted:** B's rubber fleck (it cannot reach native and reads as noise in thin seams); B's 4pt seams (A's 2px gutter is its identity; the seam width is one token if the device check says otherwise, §17); B's ExtraCondensed set inputs; B's Omnibus upstream statics (they are not the instance the web draws, and the upstream Condensed "Bold" is usWeightClass 680 per A's probe).

---

## 1. The name and the idea

**Meet Day.** Feel line: "The platform on meet day." (25 characters, one line at 320). Shown in the picker with the plain-text tag "Experimental".

Rack becomes the board on competition day: a black board of square panels parted by 2px gutters, each card's head in a filled band, every word and figure in lamp white, the figures cut from Archivo's own extra-condensed end. "This one" — the primary action, the chosen chip, today, the active tab, the set he is on — is shown by **inverting a cell**, never by a hue; colour is left to the data. Every motif restyles something already on screen: the set badge is an attempt box, a done set lights a lamp, the plate strip is the loading chart, a stat row is a board strip, a record sits in the board's record cell, and each screen's boxes are regrouped the way a scoreboard groups a lifter's numbers [T6 §2, §3].

It is Iron Age's opposite pole and not a remix of it: no period, serif, photo, ornament or paper [T6 §2, §4]. It is not the 90s hardcore gym either: no hazard stripes, stencils, slogans or chalk dust.

**What a judge should picture:** a scoreboard-black page; square panels stacked on thin black gutters, each opening on a slightly lighter band that holds its title; tall, narrow, lamp-white figures; one lamp-white slab per screen for the thing to press; the plates drawn edge-on beside "Per side"; a lit disc in each done set's box.

---

## 2. Every token role

The definition holds every leaf path `v1.js` has (474, v1's 12 legacy `exact` strings excluded, computed) and every one of index.js's 298 ROLES resolves through `valueOf()` to a well-formed value (computed, §21). Every colour is 6-digit hex; no tint carries an `exact` string. Where v1 splits a value `{ web, native }` (`colors.onDanger`) the split is kept, one colour both sides.

### 2.1 Meta

| Key | Value | Why |
|---|---|---|
| `id` / `name` / `feel` | `meet-day` / Meet Day / "The platform on meet day." | |
| `experimental` | `true` | the picker's plain-text "Experimental" tag |
| `scheme` | `dark` | |
| `icons` | `'meet-day'` | §13 |
| `images` | `{}` | no photo anywhere: photos are Iron Age's alone. Every `images.<slot>.band` resolves to its `dflt` null |
| `themeColor` | `#07080a` | the board; the installed web app's status text stays white on it |

### 2.2 Colours (the 45 keys, plus `band`)

| Role | Hex | Job in Meet Day |
|---|---|---|
| `rack` | `#07080a` | scoreboard black: the page, every gutter. Track 4's checker-verified hex, not the tell `#0b0b0b` (C8). Neutral (OKLCH C 0.005), so R3.1 governs it |
| `bar` | `#16181d` | a panel, the sheet, a field. MD-1's `#111317` lifted one step so a 2px gutter reads: 1.13:1, 4.56 ΔE00 off the board (computed) |
| `collar` | `#26292f` | hairlines inside a panel; decorative, never a control's only edge |
| `knurl` | `#70767f` | control edges and every drawn rule: 3.88 on a panel, 4.38 on the board, 3.44 on the band |
| `chalk` | `#f5f0e3` | lamp white: every word and figure (15.61 on a panel) |
| `steel` | `#a8a295` | secondary: 6.99 on a panel, 6.20 on the band |
| `dim` = `faint` | `#9097a3` | tertiary: 6.04 on a panel, never under 4.5 where text sits. No fourth grey |
| `pRed` · chest · protein · gain · 45 lb | `#ff5a3c` | track 4's plates, re-toned for colour-blind men first (C6) |
| `pBlue` · back · fat · water · training · cut · drops · 35 lb | `#4d97ff` | |
| `pYellow` · legs · carbs · fuel · weight · maintain · 25 lb | `#ffe14d` | |
| `pGreen` · shoulders · steps · 10 lb | `#3cc4a0` | a bluish green |
| `pWhite` · arms · steps subject · 5 lb | `#f2f2f2` | always labelled, placed or edged in grip beside lamp white (6.00 ΔE00 from it) |
| `pChrome` · core · 2.5 lb | `#858c96` | |
| `good` | `#4be38a` | the green light: its own hue, 12.69 ΔE00 off the shoulders plate (C21) |
| `warn` | `#ffa42e` | **amber**, because the copy says amber (graft 1) |
| `bad` = `danger` | `#ff5a3c` | refused, destructive, over |
| `onYellow` = `onAccent`, `onGreen` = `onDone`, `white` = `onDanger`, `onPlate`, `onWarn`, `knockout`, `well` | `#07080a` | board ink cut out of a lit or plate fill (white on `#ff5a3c` is only 2.72); the recess inside a panel is the board |
| `pYellowPressed` = `accentPressed` | `#d9d3c4` | a pressed lit panel (board ink on it 13.42) |
| `fallback` | `#a8a295` | = `groups.fallback`, which follows steel |
| `accent` = `focus` = `inverse` = `done` = `calMark` | `#f5f0e3` | **the inversion.** The accent is the ink turned over, never a hue (C5). Current, chosen, primary, today and done are all "lit"; they are told apart by shape — an inverted cell is current, a filled disc is done. `calMark` is "the white head" (HUE_NAMED white) |
| `onDanger` | `{ web: '#07080a', native: '#07080a' }` | v1's split shape kept |
| `raised` | `#202329` | the band, the attempt box, a cell button: 1.13:1 off the panel, 1.27:1 off the board |
| `track` | `#2a2d33` | an unlit lamp's disc, a meter's empty part |
| `grip` | `#70767f` | the grab handle (3.88 on the sheet), a toggle's off track, the unlit lamp's ring |
| `shade` / `lift` | `#000000` / `#ffffff` | scrims / the pressed-row wash |
| `tileHero` / `tileLit` | `#1f1f20` / `#131415` | lamp at .10 and .05 over the well (computed); `addTile · flat` draws neither |
| `band` | `null` | a dark vibe: no status strip |

### 2.3 Alpha helpers

v1's map, unchanged in shape: `yellow → pYellow, red → pRed, blue → pBlue, green → pGreen, ground → rack, accent, danger, warn`.

### 2.4 Tints (all 30)

| Tint | Role · alpha | Why |
|---|---|---|
| `setDone` | done · 0 | no row wash: the lamp says done |
| `setFlash` | accent · .10 | v1's 600ms tick flash, in lamp white. At v1's .28 the row's steel and dim words would fall to 2.98 / 2.58 at the peak; at .10 they hold 5.36 / 4.63 (computed) |
| `tagW` / `tagF` / `tagD` | raised · 1 | the attempt box itself; the letter carries the type (`tagInk`) |
| `dropRail` | pBlue · 1 | the drop set's 2px rail at full strength: 6.08 on a panel |
| `dropAdd` | pBlue · .5 | + Drop's edge; the button carries words |
| `pickSel` | accent · .10 | a chosen row: chalk 11.97, steel 5.36, dim 4.63 on it |
| `block` | accent · 0 | a lifting block is a band, not a wash |
| `coachBase` / `coachLow` / `coachHigh` | **warn** · .10 / .05 / .24 | the first-workout pulse on the set check (graft 14) |
| `rowPress` | lift · .05 | |
| `pillBase` / `pillUp` / `pillDown` / `pillWarn` | lift / good / bad / warn · 0 | no delta pills (R6.6): a delta is bare signed text with its arrow |
| `zoneCut` / `zoneHold` / `zoneGain` | pBlue .16 / pYellow .18 / pRed .16 | v1's named zone hues |
| `dockGlass` | rack · 1 | the dock is an opaque board strip |
| `wkBarGlass` | bar · 1 | the score bug is an opaque slab |
| `backdrop` | shade · .65 | |
| `trajGood` / `trajWarn` / `trajBad` | good / warn / bad · .18 | |
| `reviewBg` / `reviewBorder` | accent · .07 / .18 | "Next week", the callout role: lamp words on it 13.11 |
| `runway` / `runwayEdge` | rack · .55 / .70 | v1's |

### 2.5 Type

Three widths, three jobs, and the same three cuts on both clients (§5.2). No preset is caps: the strings are authored in sentence case, so `upper: 0` and tracking 0. Nothing Meet Day sets is under 11pt. `tnum` on every figure, because the condensed statics' default digits are proportional (computed: default 429,365,420,… against `tnum` 432).

| Preset | v1 | Meet Day (size · wdth · wght · extra) | Ink |
|---|---|---|---|
| `body` | 15 · 100 · 400 · lh 1.45 | the same | chalk |
| `h1` | 26 · 78 · 800 · −.01 | **28 · 75 · 700** · ls 0 | chalk |
| `h2` | 18 · 78 · 800 | **20 · 75 · 700** | chalk |
| `h3` | 15 · 78 · 800 | **16 · 75 · 700** | chalk |
| `eyebrow` | 10 · 88 · 700 · caps .16 · dim | **13 · 75 · 700**, sentence, ls 0 | steel (band ink inside a band) |
| `btn` | 14 · 92 · 700 · .02 | **15 · 75 · 700** | chalk (knockout on a lit panel) |
| `btnLg` | 16 · 92 · 700 · caps .06 | **17 · 75 · 700**, sentence | |
| `dockLbl` | 10 · 88 · 600 · caps .07 · dim | **11 · 100 · 600**, sentence | steel |
| `fieldLbl` | 10 · 88 · 700 · caps .16 · dim | **13 · 100 · 600**, sentence | steel |
| `note` | 12 · 400 · lh 1.5 · dim | **13** · 400 · lh 1.5 | dim |
| `statVal` | 20 · 108 · 800 | **28 · 62.5 · 800** · tnum | the caller's colour or chalk |
| `statLbl` | 9 · 88 · 700 · caps .1 · dim | **12 · 100 · 600**, sentence | steel |
| `timer` | 22 · 112 · 800 | **22 · 62.5 · 800** · tnum | |
| `kpiVal` | 22 · 108 · 800 | **30 · 62.5 · 800** · tnum | |
| `headline` | 34 · 112 · 800 · −.02 | **34 · 62.5 · 800** · tnum | |
| `youGreet` | 27 · 100 · 800 · −.02 | **30 · 75 · 700** · lh 1.05 | both lines lamp: the name's accent is lamp white, so no word of the greeting stands apart (N17) |
| `chip` | 11 · 92 · 600 | **12 · 100 · 600** | steel |
| `segBtn` | 11 · 92 · 700 · caps .06 | **13 · 75 · 700**, sentence | steel |
| `setInput` | 15 · 100 · 700 | **15 · 75 · 700** · tnum | chalk. 15 keeps the web's iOS zoom-on-focus exactly as v1 has it |
| `mono` | 12 | the same | chalk |
| `meta` | (v1: its note) | **12 · 100 · 400** · lh 1.5 | steel |
| `loadNum` | 118 · 800 · −.02 · lh .95 | **62.5 · 800** · ls 0 · lh .95 · tnum (at the call site's own 26–48) | the site's role colour |

**Condensed is never a sentence** [T6 §3.4]. wdth 75 carries heads, button and segment words (at most four), the greeting and set inputs; wdth 62.5 carries only figures. Every sentence, label, chip, note and the Coach card stay at wdth 100.

### 2.6 Face

```js
face: {
  family: 'Archivo', keys: ['Archivo_400', 'Archivo_600', 'Archivo_700', 'Archivo_800'],
  snap: { 650: 700, 750: 800 }, step: 100, width: 100, minLh: 1.088,
  mono: { ios: 'Menlo', android: 'monospace' },
  web: {
    font:    "'meet-day-archivo', 'Archivo', system-ui, -apple-system, sans-serif",
    mono:    'ui-monospace, monospace',
    importUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap', // rack.css line 1, untouched
    display: "'meet-day-archivo', 'Archivo', system-ui, -apple-system, sans-serif",
    italic:  "'meet-day-archivo', 'Archivo', system-ui, -apple-system, sans-serif",
    num:     "'meet-day-num', 'meet-day-archivo', 'Archivo', system-ui, -apple-system, sans-serif"
  },
  bands: [
    { max: 64, family: 'ArchivoExtraCondensed', keys: ['ArchivoExtraCondensed_800'], snap: {}, weights: [800], minLh: 1.088 },
    { min: 74, max: 76, family: 'ArchivoCondensed', keys: ['ArchivoCondensed_700'], snap: {}, weights: [700], minLh: 1.088 }
  ]
}
```

Every web family name starts with the vibe id. v1's `'Archivo'` follows in each stack only as a last resort before the system face.

### 2.7 Radius

`r 2, sm 2, sheet 0, tile 2, pill 2, plate 0, chip 0, mark 0, idx 0, round '50%', hair 0, bubble 0, badge 0`. A square board: only lamps, dots, toggle knobs and the avatar stay round (`round`) — a round thing here is a light or a face. `pill` is 2, so nothing reachable through it stays a pill.

### 2.8 Shadows, rings, scrims

- **No shadow** on the FAB, the toast, the rest slab or the peek bar (web `[]`, native opacity 0, elevation 0). A lit cell stands off the board by value (17.61). The tour card keeps v1's (its scrim needs it).
- **No glow anywhere**, the lamps included (graft 10).
- `calTick`: board at full strength, spread 1 (v1's is board .55): every zone tick ringed.
- `calHead` / `calTarget`: board, spread 1 (native: a 1pt board border). The white head on the hold fill is 1.29 bare and 13.70 by its ring; every position the head can sit on reaches 5.88 or better by one of its two edges (computed, §4.2).
- `kpiDay` knurl 1.2 inset (an unlit day lamp's bezel); `kpiDayOn` none; `kpiToday` well 1.5 + steel 2.5; `kpiTodayOn` well 1.5 + chalk 2.5; `guideEaten` knurl 1 inset; `flame` accent .35 inset; `traj*` spread 4 at .18; `tourLit` accent spread 2 — all v1's shapes in Meet Day's roles.
- **Scrims**: the sheet keeps v1's backdrop recipe (`backdrop`, `blur(3px)`, no webkit twin, a fixed fact about rack.css). The dock and the workout bar are opaque (`filter: 'none'`; the dock's native intensity 40 is unused because the look draws no BlurView). The tour fogs to the board: v1's two stops, native locations `[0, 0.42, 1]`, no exact strings.

### 2.9 Native chrome

`statusBar light`, `keyboard dark`, `blurTint dark`, `shadow #000000`, `datePicker dark`, `camera #000000`, `systemFace null`; the fixed four are v1's (`appearance dark`, `launch #14161a`, `manifestTheme #14161a`, `webStatusBar black-translucent`); `colorScheme 'dark'`, so the web's own date and select controls draw on the board.

### 2.10 Sign-in, banners, web tokens

- `signIn`: v1's fifteen values, spelled 6-digit. Native sign-in only ever draws under v1 (the vibe is per account; native keeps no device key).
- `banner`: `devText`, `guardText`, `guardNote` are board `#07080a` (6.47 on the dev bar's pRed, 9.15 on the guard bar's pGreen).
- `web.rgb`: v1's fifteen channel names; `web.root`: v1's layout and motion, fixed.

### 2.11 Tables

`groups` / `groupPlates` / `plates` follow their roles (lowercase / UPPERCASE / lowercase, checked); `importGroups`, `mark`, `subjects`, `admin` and `conf` are v1's role names; `kpi` has every alpha at 0 (no corner tint, and a v1-look fallback paints none either).

### 2.12 `shape`, `tagInk`, `inkOf`

```js
shape: {
  rule:    { ink: 'knurl', hair: 1, head: [2], place: 'above', sub: [2], total: [1, 2, 1] }, // total: the score card's double rule
  leader:  { ink: 'knurl', dot: 1.5, pitch: 4, min: 16 },   // one step quieter than the words either side
  band:    { fill: 'raised', ink: 'chalk', height: 30 },    // the header band: lamp on it 13.84
  gutter:  2,                                               // 2px of board between panels, cells and strips
  keyline: { ink: 'chalk', width: 1 },                      // the record cell (15.61 on a panel)
  lead:    { keyline: false }
},
tagInk: { W: 'pYellow', F: 'pRed', D: 'pBlue' },            // on the attempt box: 12.09 / 5.08 / 5.39
inkOf:  { pRed: 'pRed', pBlue: 'pBlue', pYellow: 'pYellow', pGreen: 'pGreen', pWhite: 'pWhite', pChrome: 'pChrome' }
```

`inkOf` is the identity because every plate reaches 4.5:1 as small text on the panel (5.23 or better) and on the band (4.64 or better, pChrome the lowest).

---

## 3. Shape language

- **Square.** Panels, bands, buttons, chips, segments, fields, the sheet's top, the FAB, the toast, the calendar cells and the attempt box: radius 0–2. Only lamps, dots, toggle knobs and the avatar are round.
- **Gutters, not borders.** Panels in a section butt on 2px of board. A board strip divides its row into cells with the same gutters. No card has a 1px border; the one 1px edge left before §15 E3 lands is `kpi · plain`'s tile.
- **The header band.** Every card's head row is a 30pt `raised` band holding its own title left and its meta and ⋯ right. A section's title is a full-width band on the board. A section is one board: its band, then its panels 2px apart.
- **One numeral treatment:** wdth 62.5 / 800, `tnum`, lamp white or the figure's own role colour, standing bare. No frame, no flap, no glow.
- **Inversion is the only emphasis.** Primary, chosen, current, today, the active tab and the rest time: lamp ground, board ink. No hue ever says "this one".
- **The lamp.** A 12pt disc (9pt for a day lamp): lit is filled in `done`; unlit is a `track` disc inside a 1pt `grip` ring. One lamp per done thing. Never red, never three in a row as a unit [T6 §3.1].
- **The plate edge-on.** One drawing, four places: the loading chart (to scale), the calendar's slivers (3 × 10), the exercise head's tag (4 × 18), the legend's swatches (3 × 10).
- **Rhythm.** Three vertical steps by relationship: 2 (cells within a board), 14 (inside a panel, v1's padding, so no content reflows), 26 (between sections, v1's).
- **Motion.** None added. v1's 140 / 240ms ease-out, the tick flash (at .10) and the coach pulse (in warn) stay; nothing flips, counts or draws in.

---

## 4. Contrast and colour vision (computed, `mdF-colour.mjs`)

Every text ink over every surface a look puts it on, every ink on its own fill, every wash, every graphic that has to reach 3:1, the colour-vision simulation and the guards. **Result: no failure in any pair that occurs.** The full output is `design/meet-day/mdF-colour-report.txt`.

### 4.1 Text (4.5:1)

| Ink | board `#07080a` | panel `#16181d` | band / attempt box `#202329` | well `#07080a` | track `#2a2d33` (no text sits here) |
|---|---|---|---|---|---|
| chalk / accent (lamp) | 17.61 | 15.61 | 13.84 | 17.61 | 12.13 |
| steel | 7.89 | 6.99 | 6.20 | 7.89 | 5.43 |
| dim / faint | 6.81 | 6.04 | 5.35 | 6.81 | 4.69 |
| good | 12.07 | 10.70 | 9.49 | 12.07 | 8.32 |
| warn | 10.11 | 8.97 | 7.95 | 10.11 | 6.97 |
| bad / danger / pRed | 6.47 | 5.73 | 5.08 | 6.47 | (4.46) |
| pBlue | 6.86 | 6.08 | 5.39 | 6.86 | 4.72 |
| pYellow | 15.39 | 13.64 | 12.09 | 15.39 | 10.60 |
| pGreen | 9.15 | 8.11 | 7.19 | 9.15 | 6.31 |
| pWhite | 17.90 | 15.86 | 14.06 | 17.90 | 12.33 |
| pChrome | 5.90 | 5.23 | **4.64** (the lowest text pair) | 5.90 | (4.07) |

The `track` column is reported, not gated: meters, unlit lamps and the empty part of a bar carry no words (the calorie band labels sit under the track, food.js:817-833).

**Ink on its own fill:** knockout on the lit cell 17.61 (primary, FAB, chosen chip and segment, active dock cell, current attempt box, today's tab, toast); on the pressed lamp 13.42; onDanger on danger 6.47; onWarn on warn (native trial bar) 10.11; band ink on the band 13.84, steel meta in it 6.20, dim 5.35; `tagInk` on the attempt box W 12.09, F 5.08, D 5.39; the Coach mark on its band 13.84; the caution line 8.97; the add tile's tag, steel on raised, 6.20 (decision b); onPlate on the six plates 5.90–17.90.

**Over the washes:** tick flash peak chalk 11.97 / steel 5.36 / dim 4.63; picker selection the same; pressed row 13.66 / 6.12 / 5.29; "Next week" callout chalk 13.11, steel 5.87, dim 5.07, warn 7.53, good 8.99; the estimator's `.ai-warn` notice warn 7.97; the web trial bar warn 8.85.

### 4.2 Graphics (3:1)

- Control edges (knurl): 3.88 panel, 4.38 board, 3.44 band. Grab handle (grip) on the sheet 3.88 (decision c). Focus ring 15.61 / 17.61.
- Lit panel, active dock cell, current attempt box against their grounds: 15.61–17.61.
- Lamps: lit on a panel 15.61, lit against an unlit disc 12.13; the unlit ring 3.88 on a panel, 3.44 on the band (3.01 against its own disc, reported).
- Toggle, off: **lamp knob on the grip track 4.02** (needs §15 E1; v1's steel knob there is 1.80). On: lamp knob on its track 6.66.
- Drop rail 6.08. KPI day lamps: unlit bezel 4.38, today ring 7.89, lit 6.86–17.90.
- Every plate and status colour as a meter fill against the empty track: 4.07 (pChrome) to 12.33; as a mark on a panel 5.23–15.86; pChrome on a trained calendar cell 4.64.
- **The calorie meter's marks:** a lamp tick against its board notch 17.61; the notch against any plate fill 5.90 (pChrome) to 17.90. The white head's best edge on every place it can sit: bare track 12.13, cut wash 9.50, cut fill 6.26 (ring), hold wash 7.50, **hold fill 13.70 (ring; the bare head there is 1.29)**, gain wash 9.99, gain fill 5.88 (ring).
- **The coach pulse:** the check's edge in warn 8.97 on a panel, 7.53 on its own steady wash; the unlit lamp's ring 3.26 on the steady wash (`coachBase`, what Reduce Motion shows). At the pulse's low it is 3.58, at its peak (`coachHigh` .24) 2.35 — a moment of an animation, reported; the steady layer carries the cue.
- **Structure only, reported and never the only cue:** gutter (panel on board) 1.13 (4.56 ΔE00), band on panel 1.13 (3.47 ΔE00), track on panel 1.29, collar 1.22. Words and figures carry every meaning; a gutter never does.

### 4.3 Colour vision (Machado 2009, severity 1, linear RGB; CIEDE2000)

| Group | Normal | Deuteranopia | Protanopia |
|---|---|---|---|
| chest | `#ff5a3c` | `#b2a036` | `#897b37` |
| back | `#4d97ff` | `#488ffd` | `#66a0ff` |
| legs | `#ffe14d` | `#ffe656` | `#f7dc37` |
| shoulders | `#3cc4a0` | `#acaaa2` | `#beb79e` |
| arms | `#f2f2f2` | `#f2f2f2` | `#f2f2f2` |
| core | `#858c96` | `#878b96` | `#898c97` |

- **Worst pairwise ΔE00 of the six groups:** normal **19.01** (back / core), deuteranopia **14.09** (shoulders / core), protanopia **17.46** (shoulders / arms). All clear the ≥ 12 bar; v1's are 16.40 / 10.90 / 15.18. Tritanopia 11.73 (back / shoulders), information only.
- **Good / bad:** 71.77 / **13.86** / 25.63 (v1's deutan 10.90). **Good / warn** (the weight rate's "green … amber"): 47.30 / 13.33 / 13.02.
- **Warn / bad:** 26.00 / **9.95** / 18.40. They meet only at the estimator's confidence dot, which always carries its words ("a fair guess", "a rough guess"). Logged for Q.
- **Lit / unlit lamp:** 71.39 / 72.10 / 71.06. **Lamp white / arms white:** 6.00 / 6.34 / 5.99 — the arms plate is always labelled, placed or edged.
- **Nothing reads up or down by colour alone.** Every delta keeps its ↑ ↓ → and its sign; a lamp is never red.

### 4.4 Hues the copy names, and the guards

- HUE_NAMED holds (OKLCH): pBlue h 257 (blue), pYellow h 98 (yellow), pRed h 33 (red), calMark C 0.018 (white), good h 154 (green), bad h 33 (red), dim C 0.019 (grey), **warn h 67 (amber)**.
- **The grounds are neutral** (OKLCH C < 0.015), so R3.1 governs them and the Tailwind guard does not: board 0.45 from zinc-950, panel 1.64 from zinc-900, band 2.70 and track 2.85 from zinc-800.
- **The accent is the lamp**, 2.59 from amber-50. It passes R2.7 **only under the declared inversion exemption** (Q-P5, §16). The pressed lamp clears the guard (5.90 from stone-300). warn is status, not gated (3.03 from amber-500).
- **Distance from the lineup** (ΔE00, ground / panel / accent): v1 3.65 / 2.47 / 26.39; Oxblood 7.05 / 10.29 / 24.15; Navy 16.74 / 11.63 / 20.79; Chalk 89.04 / 87.54 / 62.53; Iron Age 82.91 / 83.33 / 52.29; Ledger (draft, being written beside this spec) 7.75 / 15.13 / 27.37; Clear sky (draft) 72.70 / 87.65 / 71.57. **v1 sits closest**, then Oxblood and Ledger, the other dark grounds, so identity comes from structure (§20).

---

## 5. Fonts

**One family: Archivo, v1's own face, pushed to the narrow end of its width axis** [T6 §3.4; C20]. The Coach card's Archivo counts as the same family, so R4.1's two-family limit is met with one.

### 5.1 Licence

- OFL 1.1, "Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo)" — `tools/fonts/archivo/OFL.txt` line 1 (computed). **No Reserved Font Name** in the copyright header, so a subset may keep the name.
- google/fonts `METADATA.pb`: `license: "OFL"`, source commit `b5d63988ce19d044d3e10362de730af00526b672`.
- Ship `OFL.txt` beside the files in both trees; `FONTS.json` carries the rows below (family, file, version "Version 2.001", source URL, OFL-1.1, the copyright line, RFN none, both sha256s, the subsetter).

### 5.2 Native: two static TTFs (2 of the 4 allowed; the picker face included)

Google's own css2 static instances of the same Archivo v2.001 the web draws, latin-subset with `subset-font` 2.4.0 (Google's latin range plus U+2190–2193, U+2212, U+2215, U+2248, U+2264–2265). Concept A fetched them; **Phase V re-fetches both through `tools/fetch.mjs`** and must get these hashes.

| Key (`useFonts`) | Source | Original bytes / sha256 | PostScript · class | Latin subset bytes / sha256 |
|---|---|---|---|---|
| `ArchivoExtraCondensed_800` (figures; the picker face) | `https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q-EsJaRE-NWIDdgffTTtDRp8A.ttf` (css2 `font-stretch: extra-condensed; font-weight: 800`) | 111,172 / `85847cc7d9d0a2d1b02d88251bb4de62985806e32e462868792a2d99bfa54e46` | `ArchivoExtraCondensed-ExtraBold` · wght 800, width class 2 | **36,400** / `784467070b729bda1a15e87487a2dcfc9e2125083a04d28a4fa2b21b097cafb9` |
| `ArchivoCondensed_700` (heads, buttons, set inputs) | `https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q9osJaRE-NWIDdgffTT0zRp8A.ttf` (css2 `font-stretch: condensed; font-weight: 700`) | 111,532 / `02c3400ee16a2bc7b2fc7ac7e8df156d9a2da7d836f4c0b6600d821f87c82d1d` | `ArchivoCondensed-Bold` · wght 700, width class 3 | **36,380** / `69416d482f54068e037c512a0a15ec32817868abb59ae911013e6c2ef90dcfae` |

- **Total native addition: 72,780 B** in two files. hhea 878 / −210 on 1000 in both, the package's own, so each band's `minLh` is 1.088. Cap height 686 in both.
- `tnum` survives the subset: every digit 432 (ExtraCondensed) and 482 (Condensed), uniform (computed). Default digits are proportional, so `tnum` is on at every figure: native `type()` already bakes `fontVariant: ['tabular-nums']` into every `tnum: 1` preset.
- Coverage: − → ← ↑ ↓ ≈ ± × · … ‹ › ’ “ ” ° ½ – — ≤ ≥ and the no-break space are all present; ✓ ✕ ⋯ ↳ ✎ ⚙ ⚠ ▾ ▴ are absent, **exactly v1's Archivo gaps** (computed). Those fall back as in v1, or are drawn through the glyph keys (§13).
- **Bands.** Native ignores `wdth` (theme.js:307), so `face.bands` sends each preset to a cut: ≤ 64 → ExtraCondensed 800 (statVal, timer, kpiVal, headline, loadNum); 74–76 → Condensed 700 (h1–h3, eyebrow, btn, btnLg, youGreet, segBtn, setInput); everything else stays on v1's four package files. A survey of every literal `wdth` in rack-mobile's `src/` and `app/` finds none at or under 64 or in 74–76 outside the vibe definitions themselves (`mdF-wdth-survey.mjs`: v1's one literal under 80 is ErrorScreen's 78, which stays in Archivo). theme.js `build()` registers both band keys with the family's (theme.js:707); app/_layout.jsx's `useFonts` map needs the two keys in Phase V.

### 5.3 Web: one self-hosted variable face, cut two ways

Source: `https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/Archivo%5Bwdth,wght%5D.ttf`, 658,596 B, sha256 `0e094a7d3c7c4c25cf1310c4b30014f1dae9332220b1c2c88f4fa996f0b05053` (the §7.1 pinned file, fetched through `fetch.mjs`, VIBES-LOG line 41). Subset with `subset-font` 2.4.0 (all layout features kept) by `tools/mdF-webfont.mjs`; the measured files are scratch in `design/meet-day/final/`, and Phase V rebuilds them into `vibes/meet-day/` with its own recorded script.

| Family (file) | Axes kept | Characters | woff2 bytes / sha256 |
|---|---|---|---|
| `'meet-day-archivo'` (`meet-day-archivo-latin.woff2`) | wdth 62–100, wght 400–800 | Google's latin range plus ← ↑ → ↓ − ∕ ≈ ≤ ≥ | **63,016 (61.5 KiB)** / `bda86b541b9d8a9a3a1209eab114c821d125b786b894ade9317b5d898718b0ec` |
| `'meet-day-num'` (`meet-day-num.woff2`) | wdth 62–75, wght 700–800 | `0–9` | **9,016 (8.8 KiB)** / `361c40c8bfea637fcb3313c76f270478681974af1070caefc3514ccf53b570cd` |

- Both under the 120 KB per-family budget (70.3 KiB together). Variable with a `wght` axis; weight is set **only** through `font-variation-settings`, zero `font-weight` rules in style rules; the ranges live in the descriptors:

```css
@font-face { font-family: 'meet-day-archivo'; src: url(meet-day/meet-day-archivo-latin.woff2) format('woff2');
  font-weight: 400 800; font-stretch: 62% 100%; font-style: normal; font-display: swap; }
@font-face { font-family: 'meet-day-num'; src: url(meet-day/meet-day-num.woff2) format('woff2');
  font-weight: 700 800; font-stretch: 62% 75%; font-style: normal; font-display: swap; }
[data-vibe="meet-day"] { font-synthesis: none; }
```

- Same-origin, so the service worker keeps both offline and `vibe.js` can prefetch `meet-day-num` for the Vibes card. Vibe-prefixed, so an installed Archivo never stands in. Nothing in the vibe can be drawn wider than a sentence (wdth capped at 100).
- **Parity with native** (harfbuzz, `tnum`, computed): at wdth 75 · 700 the web face and ArchivoCondensed-Bold advance identically on 9 of 13 test strings and within 2 units per 1000 on the rest; at wdth 62.5 · 800 the web face runs 3–12 units per 1000 wider than Google's ExtraCondensed instance (0.1–0.3 %; digits 433 against 432). That is why the figure presets say 62.5, not 62 (at 62 the gap is 7–37 units). At wdth 100 the subset advances **exactly** as the pinned source does (a Coach-card sample: 38,412 = 38,412 units at 400, 39,682 = 39,682 at 600), so the Coach card's fit is v1's.

### 5.4 Fit, and nothing wider than v1 where it matters (computed, `mdF-widths.mjs`)

Each preset's longest real strings, shaped at Meet Day's setting and at v1's, on the same pinned file:

| Where | Meet Day | v1 | |
|---|---|---|---|
| statVal "1h 00m" / "12,480" | 69.0 / 66.4 | 78.7 / 74.2 | narrower |
| kpiVal "12,480" | 71.2 | 80.3 | narrower |
| headline "191.2" / "12,350" | 66.0 / 80.7 | 103.3 / 126.4 | narrower |
| timer "1:02:33" | 57.3 | 90.5 | narrower |
| loadNum "12,350" at 40 / "24,000" at 48 | 94.9 / 113.9 | 156.4 / 187.7 | narrower |
| setInput "1025.5" | 39.8 | 49.5 | narrower |
| youGreet "Good afternoon," | 183.9 | 211.5 | narrower: it wraps no more often than v1's |
| btn "+ Add Lifting Block" / "Discard workout" / "Weighed earlier?" | 106.0 / 92.3 / 95.6 | 121.9 / 105.8 / 109.3 | **12–13 % narrower at every button**, which is why `btn` is the condensed cut (at wdth 100 it was 10 % wider) |
| btnLg "Start workout", segBtn, dockLbl, fieldLbl, eyebrow | | | narrower (caps and tracking gone) |
| h1 "September 2026" / "Session complete" | 173.3 / 188.0 | 168.9 / 183.5 | 2–3 % wider; room at 320 is 188 beside the month buttons, and the recap's h1 has the full 288 |
| h2 "Compared with sessions like this" | 244.9 | 231.6 | 6 % wider; a sheet title may wrap, and the band grows |
| chip "Last 30 days" | 69.0 | 59.0 | 17 % wider (12pt against 11); chip rows scroll sideways as v1's do; the 44-tall chip grids are a Q fit item |
| note / statLbl "7-day avg" | +8 % / +5 % | | wrap allowed (a label may wrap, a value never truncates) |

---

## 6. Every block in the vocabulary (VOCAB order, all 29)

Every name is one vocab.js accepts at a grade the experimental slot may use: 17 deep, 6 shape, 6 v1 (computed).

| Block | Look | What Meet Day draws |
|---|---|---|
| card | `panel` | `bar` ground, no border, square (`radius.plate` 0), panels in a section 2px apart on the board. The head row is a 30pt band (`raised`) holding the title (13 · 75 · 700, band ink chalk, 13.84) left, meta in `type.meta` steel (6.20) and ⋯ (drawn, §13) right. Padding 14, as v1, so nothing reflows. Fuel's empty meal card is only its band: one line, as v1 keeps it. Steps' today and Weight's log keep their photo slots inside their own box (Meet Day has no photo, so nothing draws there) |
| youCard | `panel` | As card. Wins and Improve: a **3pt rule under the band**, full width, in good / warn, never a side stripe (R6.4). "Doing well" / "Could improve" still say which is which. The owner's admin borrows `#view-you` and takes this look |
| eyebrow | `v1` | The type role does the work: 13 · 75 · 700, sentence case as authored, steel (6.99 on a panel). Inside a band it takes the band's ink. `.chart-sub`, a small head inside a card, the same |
| sectionHeader | `banner` | A full-width 30pt band on the board (1.27:1 off it) with the title in `h3` (16 · 75 · 700, lamp, 13.84) 12 in from the left. v1's trailing hairline becomes the 2px gutter to the first panel. 26 above, as v1. Settings' and the admin's sections the same |
| screenHeader | `v1` | The eyebrow (13 · 75 · 700 steel) over the h1 (28 · 75 · 700). The month and day buttons keep v1's look in Meet Day's tokens (bar ground, collar edge, radius 2), their 34 size and their place; ‹ › stay text (Archivo has them) |
| sheetHost | `full` | Edge to edge, square top corners, `shape.rule.head` (2pt knurl) along the top edge in place of the round shoulder. The grab handle stays: 36 × 4 in grip, plain, 3.88 on the sheet (decision c). Backdrop shade .65 plus v1's 3px blur. Maximum heights, dismissal and the keyboard behave as v1 |
| sheetTitle | `band` | The h2 (20 · 75 · 700) inside a band drawn to the sheet's edges; its eyebrow stays above it, floating, in steel. No smaller gap to the first content than v1's |
| statRow | `board` | One board strip: three cells butted on 2px gutters, no border, square, padding 10. **On the page** (Train's month stats, Weight's headline strip, the recap's totals) the cells are `bar` on the board. **Inside a card** the strip runs to the card's edges and cuts it into cells (§15 E7); until then, cells on `well` within the padding, 2px apart, so no box nests in its own fill. Value `statVal` 28 · 62.5 · 800 tabular, in its caller's colour where one is given; label `statLbl` 12 · 100 · 600 steel, sentence case, under it. Mini stats (You's half tiles): two cells, the value in the numeral cut at its site's size, the label at 11 · 600 steel sentence case (v1's 8.5pt caps), wrap allowed |
| kpi | `plain` → `lane` (§15 E3) | No corner tint (every `kpi` alpha 0). The delta pill's fill is 0, so a delta is bare signed text with its arrow at 800 in good / bad / warn / dim as v1's states pick. Value `kpiVal` 30 · 62.5 · 800; the unit in 13 steel on the baseline; "last week …" under it. Sparkline as `chart · board`. **Seven day lamps**, 9pt: lit in the subject's colour, unlit a knurl bezel, today ringed (well + steel, or well + chalk when lit). Until E3 lands the tile keeps v1's 1px collar edge (decorative) and its 2 × 2 grid. **With E3, four lanes** (§8.2) |
| headline | `v1` → `bare` (§15 E5) | The figure alone in the numeral cut: `headline` 34 · 62.5 · 800 on You, `loadNum` at the site's own 26–48 elsewhere. It keeps its colour role (Fuel's zone colour, the water blue, Weight's pYellow). No frame, no flap, no glow. Under `v1` the unit beside You's headline (`.headline-u`) stays v1's 11px tracked caps; E5 re-sets it in `type.meta`, sentence case as authored ("lb") |
| chip | `square` | Square (`radius.chip` 0), on the well with v1's collar edge (text-bearing, so no 3:1 boundary is owed); chosen = inverted (lamp ground, board words, lamp edge). 12 · 100 · 600 steel. Chips that are 44 tall in v1 stay 44 |
| segmented | `boxes` | Joined square cells with 1pt collar rules between; the chosen cell inverted. 13 · 75 · 700, sentence case. Options in order, equal widths, at least v1's height |
| btn | `panel` | Primary = **the lit panel**: lamp ground, board words, square, no glow; pressed = `accentPressed` (13.42), scale .97. Plain and ghost = a `raised` cell with lamp words and no border. Danger = a square 1.5pt danger keyline with danger words (5.73). Words 15 · 75 · 700; large 17 · 75 · 700, sentence case. Disabled .4; 44 at least. Start workout is a full-width lit panel |
| field | `square` | Square, a knurl border (3.88 on a panel, 4.38 on the well), bar ground in sheets and the well for in-card inputs; focus turns the border lamp. Label above in 13 · 100 · 600 steel, sentence case. Heights and the error line's room are v1's |
| note | `v1` | `type.note`: 13 · 400 dim (6.04 on a panel), line-height 1.5 |
| toast | `square` | Inverted: lamp ground, board words, square, no shadow, 16 above the dock. Native sets the words in `type.btn` (the condensed cut); the web toast keeps its literal 13px size under this shape look, in `meet-day-archivo` |
| settingsRow | `v1` | v1's rows in Meet Day's tokens: collar rules between rows, label 14 chalk, value 12 steel, the › chevron in dim (6.04), the press wash lift .05. A toggle's off knob is lamp white once §15 E1 lands. Settings is a sheet, and a sheet stays calm |
| listRow | `ledger` | Name … value rows (PR, PB, rank, session, food entry, recent steps): a drawn knurl leader (1.5 dots on a 4 pitch, at least 16 long) from the name to the value; the value alone at 800 in the numeral cut; no rules between rows, separators between groups only; rows of another shape draw plain. **Record rows** (the recap's PR hits, Stats' PR rows, You's Strongest lifts) draw their value in **the record cell**, a 1pt lamp keyline, square (§15 E8). Swipe to delete and tap targets unchanged. A leaderless `listRow · board` is asked for (E13), because leaders are Ledger's device |
| setTable | `panel` | The exercise card as a panel, cards 2px apart. Its head is a band holding **the group's plate seen edge-on** (4 × 18, its group colour; 5.23 or better on the band's panel), the name (16 · 75 · 700 lamp) and ⋯. Then "Last …" in `type.meta` steel, tabular. Then the column heads **as authored** (Set · lb · Reps · e1RM; a unit is never capitalised) in 12 · 75 · 700 steel on a `raised` sub-band. The rows; the hint; the loading chart; + Set as a `raised` cell. **A lifting block** is a band ("Block N", its check, Duplicate, ✕) over its cards, closed by `shape.rule.total` (1pt, 2pt gap, 1pt, knurl), and it does **not** inset its cards, so the columns (30 / 1fr / 1fr / 42 / 38, v1's) fall at the same x from the first set to the last |
| setRow | `attempt` | Rows parted by the panel's own gutters. **The attempt box:** 28 × 28, `raised`, the set number in chalk or W / F / D in `tagInk`. **The current set** — the session's first set not done, derived and never stored, the caller passes it — is the **inverted box**: lamp ground, the figure or letter in board ink whatever its type. The button keeps v1's 30-wide cell as its hit area. Inputs: square wells (the board) with a 2pt lamp focus outline; figures `setInput` 15 · 75 · 700; grey targets as placeholders in dim (6.81). e1RM at 11 in the numeral cut, steel (v1's 10 raised to the floor). **The check:** v1's 30 × 30 box with its 1.5pt knurl edge, holding a 12pt lamp: unlit a `track` disc in a 1pt grip ring; done lights it (filled `done`); no ✓ is painted and the checkbox's state stays in its accessible name and state. No row wash. The tick's 600ms flash at .10. Drops keep v1's indent and hang on a 2px pBlue rail; their badge draws `glyphs.drop`; + Drop is a `raised` cell with a pBlue .5 edge. **The coach state** (first workout): the check's edge in warn and its fill pulsing warn .05 ↔ .24 (steady .10 under Reduce Motion); the lamp stays unlit (§15 E10) |
| plateStrip | `loaded` | **The loading chart**, beside v1's words and chips, which stay: "Per side" (or "Per side · lb plates") re-set at 12 · 100 · 600 steel, then the `n×w` chips on their plate colours with board figures (5.90 or better), square; "bar only"; "+x left over". The drawing, left of the chips on the strip's line: a 6pt steel stub of bar, then the plates **heaviest innermost, one per count** (`2×45` draws two), 1pt apart, on a 3pt steel sleeve line running 10pt past the last plate. Heights keep the disc ratio: 45 → 36, 35 → 32, 25 → 26, 10 → 18, 5 → 15, 2.5 → 13; widths 8 / 7 / 6 / 5 / 4 / 4. The 5 and 2.5 are edged 1pt in grip. **No collar.** Exactly the list `renderPlates()` (workout.js:1404) returns, in its order, only where it shows today (a barbell at 45 lb or more, workout.js:1279) — never a second plate calculation. It draws while the plates fit 132pt; past that the chips alone say it, never a rescaled bar. `aria-hidden`; the words carry it |
| calCell | `edge` | Seven columns on 2px gutters, v1's 1 : 1.18 cell. A trained day is `raised`, an untrained day `bar`, pad cells have no ground. The day number in 13pt, numeral cut: dim untrained (6.04), lamp trained (13.84). **Today is its number in an inverted tab** (18 × 16, lamp ground, board figure at 800, 17.61): inversion and weight, never colour alone. Up to four plates as edge-on slivers, 3 × 10, 1pt apart, under the number. The weekday row 12 · 75 · 700 steel as authored. The legend's swatches are slivers, labels 12 · 100 · 600 steel as authored |
| chart | `board` | Square-topped columns (rx 0) 2 apart. The day that is not over is **hatched** in the knurl pattern (engine v2's `vibe-hatch-*`) in place of v1's dimming: a shape cue. Lines 2pt in their own colour with **no area fill** and no end glow; the end dot square, 5pt (§15 E6a). Sparklines the same, `.spark-glow` not drawn. Meters 6pt, square-ended, the fill in its data colour on `track`; **where v1 draws a target mark on a meter, it is a 2pt lamp tick standing in a 1pt board notch** (E6b) — the look adds no tick v1 doesn't draw. **Rings: ten cells**, 3° board gaps through the annulus only, square caps, each cell lit to the exact fraction by a hard stop (E6c); Steps' today stays an arc this way. Donuts: 2pt board gaps between segments, square caps. Heat strip: square cells (its colours are the pinned module's, PINNED_PAINT). Legends: 3 × 10 slivers. The calorie meter: square ends, v1's zone washes in their named hues, the white head and dashed target ringed in board (`calHead` / `calTarget`), the zone ticks ringed (`calTick` at full). Chart text the look re-sets to 11pt or more, sentence case as authored (`.donut-sub` 9px, `.ring-sub` 7.5px, `.cal-band-lab` 9.5px, `.ring-lbl` 9px) |
| dock | `board` | An opaque board strip (`dockGlass` rack · 1, no blur). Five `bar` cells on 2px board gutters. **The active cell is inverted**: lamp ground, board icon and label (17.61). The rest: steel icons (the set's re-cut, 22pt) and 11 · 100 · 600 steel labels, sentence case. v1's 26 × 2 mark goes; the inversion is the cue. Tabs, words, order, height (64), position and the tour's lit ring are v1's |
| fab | `inverse` | "Log food" as a lit square: lamp ground, the + (2.6) and the words in 15 · 75 · 700 board ink, sentence case as authored (food.js:567), no shadow. Pressed `accentPressed`, scale .955. v1's place (centred 14 above the dock) and size |
| addTile | `flat` | No washes and no border: tiles on the well, radius 2. The Photo tile is marked by its lamp icon well with a board icon (17.61). The lit tiles' icon well and "ai" tag sit on `raised` (steel tag 6.20, decision b); the tag is square. Its literal type stays v1's 8.5px tracked caps under this shape look (§7, §15 E11). An off tile stays visible, dimmed, readable and untappable |
| sessionChrome | `slab` | **The score bug.** The top bar is an opaque `bar` slab (`wkBarGlass` bar · 1, no blur) under a collar rule; its slots are parted by 1pt knurl rules. The clock in `timer` 22 · 62.5 · 800 lamp, **not inverted** (§15 E9). The Coach chip (38, square, collar edge; lamp mark and words) and the calendar button (38, square), then **Finish as the lit panel**. The rest line: 3pt across the top in `done` (lamp) while running, `danger` when over. The rest pill: a square `raised` slab with a knurl edge and no shadow: **the time inverted** · +30 · Skip as `raised` cells. The peek bar: a square `raised` slab with a knurl edge and no shadow: name · clock · Resume as the lit panel |
| youHero | `v1` → `joined` (§15 E4) | The avatar stays round (52, `raised`, the initial in lamp). "Good evening," / "Micah" in 30 · 75 · 700, **both lines lamp**. The gear a 36 square cell. The date line in steel. Under `v1` the "Member since …" line stays v1's 10px tracked caps under the Coach card; with E4 it is set in `type.meta` (12 · 400 steel, sentence case as authored) and the composition joins it to the greeting (§8.2) |
| coachCard | `panel` | `bar` ground, its 1pt border drawn in the ground's own colour so no edge shows, square; a band (`raised`) behind the header row, taking no layout. **Archivo on v1's metrics** (decision d): `CARD_TYPE`, 190 / 164, padding 14, border 1, every line's numberOfLines and lineHeight. The mark, COACH and the lock in lamp (13.84 on the band); the caution line in warn (8.97); the COACH ME row over a collar rule; COACH and COACH ME keep v1's type. No photo |

---

## 7. Caps and sizes: what Meet Day re-sets, and what stays v1

Meet Day names **no caps role** and sets nothing under 11pt. Its **deep** looks re-set every literal caps site inside their blocks to sentence case as authored, at 11pt or more (vocab.js: a deep look "re-sets type at literal sites"): the dock labels, `.btn-lg`, `.cal-dow`, `.stat-lbl`, `.mini-stat-l`, `.set-hd`, `.wk-block-title`, `.plate-strip .lbl`, `.ex-item .eq`, `.sess-e1lbl`, `.cal-legend-item`, `.donut-sub`, `.cal-band-lab`, `.ring-sub`, `.ring-lbl`, `.chart-sub`, `.you-sec-t`, `.fuel-fab`, `.meal-kcal`, `.swipe-del` on set and list rows, the live chip's label. The type roles carry `.eyebrow`, `.field label` / `.field-lbl`, `.seg-btn` and the KPI label.

**These v1 literals stay as v1 draws them** — they sit under a v1- or shape-grade look, or outside every block — and so the vibe does **not** claim "no caps anywhere" (graft 8):

| Site (rack.css at 58ac3be; native mirrors) | v1 | Why it stays | Route (§15) |
|---|---|---|---|
| `.you-since` :1503 / native Hero.jsx:154 | 10px .1em caps | `youHero · v1` | E4 |
| `.headline-u` :1961 (the unit "lb" beside You's headlines) | 11px .08em caps | `headline · v1` | E5 |
| `.add-tile .tag` :1732 ("ai") | 8.5px .14em caps | `addTile · flat` is shape grade | E11 |
| `.kpi-prev` (10.5px, not caps) | 10.5px | `kpi · plain` is shape grade | E3 |
| `.coach-ttl` :2246, `.coach-go-t` :2287 (COACH, COACH ME) | 10px caps | the Coach card's type is fixed (decision d); COACH ME is authored in capitals | none: declared |
| `.sync-pip` :813, `.trial-bar` :827, `.adm-flag` :1586, `.conf` :1809, `.ai-cost` :1854, `.group-pill` :1118 | 9–10.5px caps | outside every vocabulary block | E11 |
| auth.css's four caps rules (sign-in and the gates, web only) | caps | outside every block | E11 |

---

## 8. The composition

§12 lets this vibe reorder, merge and split boxes within a screen. Engine X (§9) gives each of seven screens' top-level blocks a name; the vibe supplies order and grouping; v1 is today's order with no grouping.

### 8.0 Rules every composition keeps

- **Nothing is added, removed or hidden.** Every control keeps its handler, accessible name, state and size. **The dock is never touched.**
- **Merges happen only where two strings are identical,** tested at render by string equality, never by id. The merged band is the card's heading for assistive tech; the text loses exactly one copy of a string equal to the one kept (Q-Q1).
- **Fixed boxes stay fixed:** the Coach card (190 / 164), the dock, the set table's columns.
- **Lists that are data keep their data order:** exercises, sets, meals, entries, rows.
- **Nothing moves above the row being edited,** and nothing that appears mid-entry lands above the thumb.

### 8.1 The data X reads

This is written here, not in `meet-day.js`, because the contract has no `compose` role yet (§15 E2). When X lands, it goes into the definition as is (and the definition is re-pinned).

```js
compose: {
  you: {
    order: ['hero', 'since', 'coach', 'doing', 'goal', 'week', 'noticed', 'trends', 'review', 'app'],
    join:  [['hero', 'since']],
    merge: ['goal', 'noticed', 'review'],        // a section with its only card, when the titles are equal
    within: { 'trends.weight': ['headline', 'stats', 'chart', 'legend', 'note'],
              'trends.pair':   { rings: 'bars' } }
  },
  workout: { order: ['head', 'dow', 'grid', 'monthStats', 'legend', 'weekVolume', 'coach', 'start', 'split', 'statistics'],
             join:  [['dow', 'grid', 'monthStats']] },
  food:    { order: ['head', 'summary.count', 'summary.macros', 'meals', 'water', 'micros', 'fab'],
             split: { summary: ['count', 'macros'] },
             join:  [['summary.count', 'summary.macros']] },
  weight:  {},                                    // v1's order by default (§8.5)
  steps:   { order: ['head', 'today', 'streaks', 'trend', 'stats', 'consistency', 'weekdays', 'recent'],
             join:  [['today', 'streaks']] },
  recap:   { order: ['hero', 'feel', 'prs', 'milestones', 'firsts', 'did', 'totals', 'compared', 'done', 'saveRoutine', 'seeStats'],
             join:  [['did', 'totals']] },
  session: { bar:      ['clock', 'name', 'coachChip', 'calendar', 'finish'],
             exercise: ['head', 'prev', 'columns', 'rows', 'plates', 'hint', 'actions'] }
}
```

`join` draws consecutive blocks as one board (no section gap between them, `shape.gutter` apart). `merge` names a section whose title equals its first card's title. `split` asks a builder for a block's parts as separate panels. `within` orders a block's own parts, or swaps one drawing for another (`rings: 'bars'`).

### 8.2 You

v1 order (you.js:558-637): hero · Coach · since · [How you're doing: Doing well, Could improve] · [Goal] · [This week] · [Rack noticed] · [Trends: Body weight, Against your targets, Training, Steps | Water] · [Weekly review] · [App].

| Move | Meet Day | Why | Fallback |
|---|---|---|---|
| **since joins the hero** | the greeting, the date and "Member since …" are one board row; the Coach card follows directly under it | the lifter's name card is one row of the board. Coach stays the lead, at its fixed 190; it moves down by one line, and nothing below it moves between days. Natively the since-line is already inside `Hero`, after `children` (Hero.jsx:151-157), so only those two swap | since-line under the Coach card (v1 order) |
| **Goal, Rack noticed, Weekly review merge** | one band per section: the card's meta ("losing", the review's date range) and ⋯ ride in the section's band | the section and card titles are identical strings: you.js:599 / :1517, :608 / :1595, :623 / :1611 | Q-Q1 says no: each draws both — a section band, then the card's band |
| **Body weight: the strip moves up** | headline · stat strip (Trend today · 7-day avg · lb swing) · chart · legend · note | on a board the figures come first and the picture after. v1 draws headline (you.js:1119), chart (:1160), legend (:1165), strip (:1187), note (:1190) | v1's order inside the card |
| **The Steps / Water pair: rings become ten-cell bars** | each half tile: "87%" and "of goal" (the ring's own words) over a ten-cell bar lit to the exact fraction (the ring's `min(1, frac)`; the cell it ends in lit to its fraction by a hard stop), `good` at or past the goal, else the subject colour; then "6,930 a day", the bars, "N of 7 days at goal", the two mini stats, in v1's order | a bar suits a half tile's width, and the pair loses its two rings, the strongest v1 silhouette cue on the tab | ten-cell segmented rings (`chart · board`), drawn by the look alone |
| **This week: four lanes** (§15 E3, a look rather than a move) | Calories, Weight, Training, Steps as four `well` lanes 2px apart, in v1's row-by-row order. Left: label and delta, value and unit, "last week …". Right: the sparkline over the seven day lamps. Every lane's lamps sit at the same x, so the four rows form **a 4 × 7 board of lamps**, today's column ringed | the week's consistency seen at once — the most human device either concept drew (judge 2). Web: CSS only (`grid-template-areas` placing the children in DOM order); native: a `Kpi` lane branch and the week card's two-column row as one column. Every lane holds v1's six children | `kpi · plain`, the 2 × 2 |

The Strongest lifts list (Training) is a scoresheet by its look alone: `listRow · ledger` with the record cell (E8), not a composition move.

### 8.3 Train (the calendar)

v1 order (workout.js:411-544): head · weekday row · grid · legend · month stats · week volume · Coach (tight) · Start workout · Routines | Exercises · Statistics.

**Meet Day moves the month stats (Sessions · Volume lb · Minutes) up from after the legend to directly under the grid, joined on a 2px gutter**: the weekday row, the days and the totals read as one scoresheet with its total row, and the legend follows the board. The swap changes no height above Start workout, so Coach stays directly above it and Start workout never drifts under the thumb (workout.js:473-477). **Fallback:** v1's order.

### 8.4 Fuel (the day)

v1 order (food.js:542-549): head · summary · Breakfast · Lunch · Dinner · Snacks · water · micros · the FAB. The summary is one card (food.js:572-630): ⋯ (the bar guide), the big figure and its two lines, the calorie meter, and three macro rows.

**Meet Day splits the summary into two panels on a 2px gutter:**
1. **The count:** ⋯, the figure (loadNum 40, its zone colour), "kcal left today" and "N eaten · target N", the calorie meter and its lines.
2. **The macros:** Protein, Carbs and Fat as a three-cell board strip: the name (12 steel), "142/200" in the numeral cut, and a square 6pt meter in the macro's plate colour. The meter's square end is the target (v1's fill is `min(100, val / target)`), so no tick is added.

The meals, water, micros and the FAB keep their order. **Fallback** (B's reason): one summary panel in v1's order; water stays below the meals, where the thumb learned its presets.

### 8.5 Weight — v1's order by default

v1 order (weight.js:82-222): head · log (input, Log, "Weighed earlier?", note) · headline strip (Latest · 7-day avg · rate) · chart · time of day · maintenance · recent.

**Meet Day keeps it** (graft 9, B's reason): logging is the most frequent action and v1 puts it first; moving the reading above it would push the input down on every visit.

**Micah's option (off):** `weight: { order: ['head', 'stats', 'log', 'chart', 'tod', 'tdee', 'recent'], join: [['stats', 'log']] }` — the reading first (the board's body-weight row), the log 2px under it. With no weigh-ins the strip does not exist and the log leads. The Log input would sit about 180pt down at 320 × 568, still in the first viewport.

### 8.6 Steps

v1 order (steps.js:167-175): head · today · trend · stats · streaks · consistency · by weekday · recent.

**Meet Day moves the streaks card up to join today** on a 2px gutter: the run it reports is today's run. Today's ring **stays an arc**, segmented into ten cells by `chart · board` (graft 4, steps.js:220). The trend's range chips stay directly above the stats card they control. **Fallback:** v1's order.

### 8.7 The workout summary (the recap)

v1 order (workout.js:2069-2215): hero · How did that feel? · PRs · milestones · first time · totals strip (Duration · Volume lb · Working sets) · What you did · Compared with sessions like this · Done · Save as routine · See statistics.

**Meet Day swaps the totals strip and "What you did", and joins them:** the exercises read as the score card's lift rows, then `shape.rule.total` (the double rule), then the totals strip as its total row. The feel card stays second, where the code puts it on purpose (workout.js:2072, "Second, under the win"); "Compared" stays below the fold (:2180). The swap changes no height above Done. PR figures sit in the record cell (E8). **Fallback:** v1's order.

### 8.8 The live session

- **The top-bar zone.** The same bar, sticky at the top, the same controls left to right. **Its left column swaps:** v1 draws the name input over the clock; Meet Day draws **the clock first** (timer 22, lamp, not inverted) and the name input under it in 13 steel. A score bug leads with the clock, which is what is glanced at between sets. The Coach chip (38), the calendar (38) and Finish (the lit panel) follow unchanged; in an edit, the date · duration line takes the clock's slot. **Fallback:** v1's name over clock.
- **The exercise-card stack stays in order, directly under the bar.** Exercises are never reordered: the done flash finds its row by DOM index (`document.querySelectorAll('.ex-block')[exIdx]`, workout.js:1372). What changes is by look (`setTable · panel`): cards butt on 2px gutters, a lifting block draws a band over its cards instead of insetting them, so the columns fall at the same x down the whole session — one board grid.
- **The plate strip moves up one place:** from after the hint (v1: rows · hint or Coach nudge · plates · + Set; native session.jsx:748-756) to directly under the last set row, as the grid's loading row. When it appears (a barbell at 45 lb or more), it pushes down only the hint and + Set, as v1's pushes down + Set; nothing above the row being edited moves, and the nudge still shares the hint's slot so nothing below it moves. **It never moves above the rows:** appearing mid-entry, it would shift the inputs under the thumb. **Fallback:** v1's place.

### 8.9 What each screen proves before its rearrangement ships (for Q)

For each of the seven, rendered in v1 and in Meet Day from the same fixture, on both clients:
1. **Controls:** the same multiset of controls, by role, accessible name, handler and size.
2. **Text:** the same multiset of text, except that each merged pair loses exactly one copy of a string equal to the one kept.
3. **Reading and focus order** follow the new visual order (web DOM order is the drawn order; the KPI lanes keep the DOM).
4. **Reach:** no control under the dock or the FAB at 320 and 390.
5. **Order-dependent code untouched:** the session flash's DOM index; You's scroll restore (you.js:551); the tour's targets (the dock); native Hero's children.
6. **v1 identical to the pixel** (the §7.1 harness, 0 / 0), because v1's `compose` is `{}` and draws no wrapper.
7. **A round trip holds:** into Meet Day and back mid-workout loses nothing, typed text included.

A screen that fails any of these renders same order, new shapes — that screen alone. **Risk, lowest first:** Train's swap; the recap's swap; the plate row; the session's clock; since; Steps' streaks; the Body weight strip; Fuel's split; the pair's bars; the three merges (Q-Q1).

---

## 9. The hooks X needs (exactly)

X adds these on its own branch; none exists at 58ac3be / 1cb6498.

| # | Hook | Web | Native |
|---|---|---|---|
| X1 | **The `compose` role** | index.js ROLES: `R('compose', 'compose', null, 'compose', { dflt: {} })`; vocab.js (or a sibling pure module) defines the grammar: the screens (`you`, `workout`, `food`, `weight`, `steps`, `recap`, `session`), each screen's block names (§8.1), and the primitives `order`, `join`, `merge`, `split`, `within`. A verifier holds every definition to it: known names only, `order` a full permutation (a name left out is appended in v1 order, never dropped), `join` only neighbours after ordering, `merge` only a section with its own first card | the same pure files, copied and pinned |
| X2 | **`compose(screen, blocks)`** | a non-pinned helper (`vibe.js` or `vibes/compose.js`): takes `[{ name, node, section?, title? }]` in v1 order and returns the nodes in the vibe's order. For `{}` it returns them as given with **no wrapper** (DOM identical). `join` wraps a run in a presentational `<div class="cmp-join">` (no role, not focusable). `merge` hides the section title only when it equals the card's title string, and gives the card head the section heading's semantics | `<Compose screen blocks>` / `compose()` in `src/ui/`: children in order; `join` a `View` with the vibe's gutter; `merge` as the web |
| X3 | **Call sites hand over named blocks** | you.js `build()` 558-637; workout.js `renderCalendar()` 411-544 and `renderSummary()` 2069-2215; food.js 542-549 | you/index.jsx 134-190; workout/index.jsx (the calendar); workout/summary.jsx; food.jsx (the day); steps.jsx |
| X4 | **Within-block order** | you.js `weightCard()` 1063-1195 names headline / chart / legend / stats / note; `renderSummary()` in food.js 572-630 can return `count` and `macros` as two panels when `split` asks; steps.js 167-175 | you/cards (Body weight); food.jsx summary card; Hero.jsx 151-157 orders greeting / since / children |
| X5 | **Rings to bars on You's pair** | the call at you.js:1334 (`goalCard`'s `ring()`, pinned analytics.js) sets `--frac` (the same clamp) on its cell; the vibe's CSS hides the arcs and draws ten cells from it; the ring's text elements stay the words shown. The pinned SVG is restyled, never rewritten | `Ring.jsx` (a chart switch exists) gains a `bars` branch fed the same `frac`, colour and texts, taken only where `within` asks |
| X6 | **The session** | the top bar's left column (workout.js ~1028) orders clock / name; the exercise block orders its plate strip against the hint (workout.js:1261-1279) | session.jsx `TopBar` (270) and `ExerciseBlock` (NudgeLine / SwipeHint 748-753 against PlateStrip 756) |
| X7 | **The current set** (for `setRow · attempt`, not composition) | the session renderer derives the first set not done and marks it (`.set-row.current`); nothing is stored | `SetRow` takes a `current` prop from the same derivation |

Merge X once each of Iron Age, the simple three and the deep two is committed or logged as abandoned (§12.1).

---

## 10. Every other screen (same order, new shapes)

- **Sign-in and the gates** (web only; native stays v1): the auth box a panel under a band; fields `square`; the six-plate mark in Meet Day's plate hues; the four auth.css caps rules stay (§7).
- **Onboarding (8 steps) and the tour:** step kickers are the eyebrow and titles the h1; choice cards (`.ob-choice`) are chosen by **inversion** as well as v1's border, which fixes their colour-only cue; the tour card is a panel (`T.cardSkin()`), its ring the lamp.
- **The Coach sheet, the live chip and the nudge:** the sheet `full` with `band` titles; the live chip a slab slot; the nudge stays in the hint's slot at the hint's height.
- **The add-food sheets, the estimator, the library, meals and the barcode:** add tiles `flat`; library and meal rows `ledger`; the estimator's notice carries the plug (`spark`) in warn; the estimate total sits over `shape.rule.total`.
- **Water:** v1's bottle (its level is a number, R1.4), the total bare in the numeral cut, the presets `raised` cells.
- **The rest pill and the peek bar:** slabs (§6). **Toasts:** `square`.
- **The Vibes sheet:** tile rules scoped `.vibe-in[data-vibe="meet-day"]` (decision e); the sample is "315" bare in `meet-day-num` (§19).
- **Stats:** its stat strips as board strips, rank and PR rows `ledger` with record cells, charts `board`.
- **Settings:** `full` sheets with `band` titles, `banner` sections, v1's rows.
- **The owner's admin:** legible in the same tokens, borrowing `#view-you`.

---

## 11. Three screens, in words (390pt, v1's own data)

### 11.1 You

The page is scoreboard black. Top left, the round avatar, a dark disc with "M" in lamp white; beside it "Good evening," over "Micah", both 30pt condensed bold in lamp white, one colour; the square gear cell top right. Under the greeting, "Friday, September 25" in steel and, once E4 and X land, "Member since Aug 21, 2025  ·  400 days" in 12pt steel. Then the Coach card: 190 tall, square, a panel with a slightly lighter band behind its header row (the bubble, COACH and the lock in lamp), its lines in v1's Archivo, COACH ME over its hairline.

26pt of bare black, then the first board: a full-width band reads "How you're doing"; 2px under it the "Doing well" panel opens on its own band with ⋯ at the right, a 3pt green-light rule under the band, its findings in regular Archivo; 2px of black, then "Could improve" with an amber rule. The Goal board is one band — "Goal", "losing", ⋯ — then "0.9" tall and narrow with "lb / week down", the reason, a strip of three cells (190.7 · 182 · Nov 30) and a square 6pt meter. "This week" is four black lanes; down their right-hand side the day lamps line up into a small light board of four rows and seven days, today's column ringed. Trends: Body weight's "191.2" with its arrows, the three-cell strip directly under it, then a 2pt yellow line with no fill and the trend dashed in lamp; square-topped columns with Friday hatched; the Strongest lifts scoresheet with its best figure in a thin lamp-framed cell; Steps and Water side by side, each "87%" / "28%" over a ten-cell bar. The dock: five dark cells on black gutters, You's cell a lamp-white square with a black icon and "You".

### 11.2 The live session

Across the top, the opaque score bug: **25:00** in lamp-white condensed figures, "Push day" under it in steel; a square Coach slot and a square calendar cell; **Finish** as the one lamp-white slab. Barbell Bench Press: a band holding a red plate seen edge-on, the name in condensed bold, ⋯; "Last · Sep 21 …" in steel; a slightly lighter strip of column heads, Set · lb · Reps · e1RM. The rows: a square grey box with a yellow "W", black wells reading 95 and 8, the check box with a filled lamp in it; "2", 185, 5, 216, lamp lit; **"3" is the set he is on — its box solid lamp white with a black "3"**, the wells holding grey targets, the check holding a dark disc in a grey ring. Directly under the rows, the loading row: "Per side", a short steel stub, one full-height red plate, a 1pt gap, a shorter yellow plate, the sleeve running on, and the chips "1×45" and "1×25". Then "Swipe a set left to delete it" and a wide "+ Set" cell. Barbell Curl follows 2px below, its columns at exactly Bench's x; a drop hangs 10pt in on a blue rail. At the foot, "+  Add exercise" and "+  Add Lifting Block" as two cells and "Discard workout" in a red keyline. When a rest runs, a 3pt lamp line crosses the top and a square slab above the dock reads **1:30** inverted · +30 · Skip.

### 11.3 The Fuel day

"Fuel" in 13pt condensed steel over "Today" at 28pt condensed bold; three square cells at the right, the gear, ‹ and ›. The count panel: **350** tall and narrow in the cut blue, "kcal left today" and "1,950 eaten  ·  target 2,300" beside it, ⋯ in the corner; the square-ended calorie bar with its blue, yellow and red zone washes, the white head and the dashed target each in a hairline of black, the ticks ringed; its two lines under it. 2px below, the macro strip: three cells, Protein · 142/200 · a red square meter, Carbs · yellow, Fat · blue. The meals: Breakfast's band reads "Breakfast", "520 kcal", ⋯; "Oats with whey" runs along a dotted leader to 520; an empty Dinner is just its band. The water bottle as v1's, blue; the micros as a strip. Above the dock, "Log food" in a lamp-white square with black words and no shadow.

---

## 12. Textures

Code-made, and only where they earn their place: **one**. The day that is not over is hatched in engine v2's `vibe-hatch-*` knurl pattern (45°, pitch 2.75, line 1) on the web, react-native-svg `<Pattern>` on native — a shape cue under a figure, never under body text. **No PNG ships.** Rejected: the rubber-floor fleck (B's; native has no slot and it reads as noise), the LED dot matrix and the split-flap seam (costume, graft 15), paper tooth (no paper).

---

## 13. Icons (`vibes/icons/meet-day.js`)

**Style: v1's own drawings, re-cut for a square board.** Every one of v1's 19 icons keeps its path data point for point and its stroke (1.9 dock and Coach marks, 1.8 add tiles, 1.7 calendar, 1.6 gear; sites that fix their own still win). What changes is the cut: **square caps and mitre joins** instead of v1's round-and-round, the Feather pen grammar research lists as a tell (T1 A20); the calendar's and lock's rects lose their 2-unit radius; the keypad's six dots become square LED points. Nothing he has learned to find on the dock is redrawn: the dock's identity is its inverted cell. Legibility at 22pt is v1's, because the geometry is v1's (checked: every re-cut icon's elements equal v1's with rect `rx: 0`).

**`spark` is a plug** (decision a, R8.8): two prongs 6 units apart, a flat-topped body closed by a half-round, and its cord, at the notices' fixed 1.6 and 16px, inked warn as v1's spark is. It is not a star, sparkle, asterisk, bolt or bulb.

**Glyphs** (drawn at 2, square caps, mitred, in the site's own colour at 1em; the accessible name stays the character, `vibe.js glyphed`):

| Key | Char | Drawing |
|---|---|---|
| `close` | ✕ | `M6 6l12 12M18 6L6 18` |
| `more` | ⋯ | three square LED points on the midline at stroke 3 |
| `drop` | ↳ | down, then along to the arrowhead: `M7 5v9h10`, `M14 11l3 3-3 3` |
| `edit` | ✎ | `M5 19h3.5L19 8.5 15.5 5 5 15.5z`, `M13 7.5l3.5 3.5` |
| `gear` | ⚙ | the gear at 2 (native Fuel's ⚙ button) |
| `expand` / `collapse` | ▾ / ▴ | `M7 10l5 5 5-5` / `M7 14l5-5 5 5` |
| `warn` | ⚠ | a triangle, its bar and a square point |
| `check` | ✓ | **null: stays text** (graft 13) |
| `prev` `next` `back` `go` `dismiss` `minus` `plus` `up` `down` `flat` | ‹ › ‹ › × − + ↑ ↓ → | null: Archivo has every one |

No vessel (v1's bottle; its level is a number) and no ornaments (a board has no fleurons); both fall back to v1 through `vibe.js`.

---

## 14. What Meet Day never does

1. **No hue accent.** "This one" is an inverted cell; no amber, orange or sodium lamp says it (C5).
2. **No red lamp, no three lamps as a unit, nothing that implies judging, a referee or failure.** In Rack, `F` means to failure [T6 §3.1].
3. **No federation, gym or equipment names or logos**, in the picker included.
4. **No hazard stripes, stencils, slogans, chalk dust, handprints or photos.**
5. **No period devices:** serif, engraving, ornament, cream paper, halftone.
6. **No caps role, no tracked caps it sets, no uppercased unit.** The v1 literals it cannot reach are listed (§7), never claimed away.
7. **No pills, no 1px card borders, no 12px radii, no delta pills, no corner glows, no gradient washes or area fills, no glow at all, no glass.**
8. **No boxed stat tiles floating apart.** A stat row is a strip of cells on gutters, one object.
9. **No condensed sentences.** Condensed is for figures, heads, button and segment words of at most four words.
10. **No proportional digits in any figure.** `tnum` always on, in the file that ships.
11. **No plate drawn anywhere `renderPlates` doesn't run, and no collar.**
12. **No texture behind body text; no split-flap; no LED dots.**
13. **No new motion:** no count-up, flip, draw-in or entrance.
14. **No Activity-like rings** (R8.6): rings are ten-cell rings or bars, single, never concentric.
15. **No sparkle, no bulb.** `spark` is a plug.
16. **No word, number or control added, removed, hidden or moved to another action.** No rearrangement touches the dock. No merge unless two strings are equal.
17. **No face but Archivo; no monospace figure.**
18. **Nothing fetched at run time.**

---

## 15. Asks of the engine and the contract (each with its fallback)

| # | Ask | Fallback if not granted |
|---|---|---|
| **E1 (blocking)** | **A knob role:** `R('colors.knob', 'color', '--knob', 'colors.knob', { or: 'colors.steel', at: { web: ['rack.css', '.tog::after', 'background'], native: 'src/ui/coach/settings.jsx:139' } })`. v1 and every earlier vibe resolve steel through `or`, unchanged; rack.css's `:root` holds v1's steel. Meet Day then sets `colors.knob: '#f5f0e3'` (4.02 on the grip track) | **None that passes Q**: the off knob is 1.80:1 on both clients. The web stylesheet alone could re-ink `.tog::after`, but native's `thumbColor` reads `T.colors.steel`. Meet Day cannot commit until E1 lands |
| E2 | **The composition:** X1–X7 (§9) and the `compose` data (§8.1) | Every screen same order, new shapes. The vibe ships complete without it |
| E3 | **`kpi · lane`** (deep) in vocab.js: "no tile tint; four lanes on the well, the subject's children in DOM order in two columns (hd, value, prev / spark, days), day lamps aligned into one board; `.kpi-prev` re-set to 12 steel". Native: a `Kpi` lane branch and the week card's row as one column | `kpi · plain`: the 2 × 2 with v1's 1px collar edge and 10.5px "last week" |
| E4 | **`youHero · joined`** (deep): "the since-line set in `type.meta`, sentence case as authored, directly under the greeting" (its move above Coach is `compose.you.join`) | `youHero · v1`: 10px tracked caps under the Coach card |
| E5 | **`headline · bare`** (deep): "the figure alone in its numeral type, its unit re-set in `type.meta`, sentence case as authored" | `headline · v1`: the figure is the same; `.headline-u` stays v1's caps "LB" |
| E6 | **`chart · board`'s wording:** (a) lines carry no area fill (strike "over an LED dot-matrix fill"); (b) "a tick at the target" becomes "the target mark v1 already draws, as a 2pt lamp tick in a 1pt board notch"; (c) "rings as ten cells with 3° board gaps through the annulus only, each lit to the exact fraction by a hard stop" | (a) the look as written, which draws the dots Meet Day rejects — so E6a is needed before V draws charts; (b)/(c) v1's ticks and rings with square caps |
| E7 | **`statRow · board` inside a card:** "the strip runs to the card's edges and cuts it into cells, its gutters in the page ground" | cells on `well` within the card's padding, 2px apart (no same-fill nesting) |
| E8 | **`listRow · ledger` names its record rows** (the recap's PR hits, Stats' PR rows, You's Strongest lifts), whose value takes `shape.keyline` | no record cell: the value at 800 with its leader |
| E9 | **`sessionChrome · slab`: which slot is inverted.** Meet Day: the rest pill's time only; the top bar's clock bare (graft 11). A param (`shape.slab.lit: 'rest'`) or the look's wording | the look as written inverts the clock too: three lamp fills on the session screen |
| E10 | **`setRow · attempt`: the coach state is warn** (the check's edge and the `tint.coach*` wash), never the lamp; and X7, the current set, passed by the caller | the coach state in `accent`, which here is the lamp: a half-lit box (1.18:1 ring at the peak) |
| E11 | **Routes for the v1-literal caps and sub-11pt sites** outside Meet Day's reach (§7): a small `type.tag` preset (or statLbl) that `.add-tile .tag`, `.sync-pip`, `.trial-bar`, `.adm-flag`, `.conf`, `.ai-cost`, `.group-pill` and auth.css's caps read, `or` v1's literal | they stay as v1 draws them, declared |
| E12 | **The inversion exemption** from R2.7 and R2.4 for an accent that is the ink inverted (Q-P5) | policy, not code: without it Meet Day cannot exist as specified |
| E13 | **`listRow · board`** (deep), for distinctness from Ledger: "name left, the value right in the numeral cut at 800, no leader; rows parted by the panel's gutters; record rows in `shape.keyline`". The Ledger draft (`wt/web-design2/vibes/defs/ledger.js`, written beside this spec) also names `listRow · ledger`, and drawn leaders are its signature device set (Iron Age dropped them for the same reason) | `listRow · ledger`, as tonight: the leaders in knurl at 1.5 against Ledger's 1, in a condensed figure against a serif, on black against club green |

---

## 16. Decisions left to Micah

1. **Q-P5, the inversion exemption, and the lamp's hex.** The lamp `#f5f0e3` is 2.59 from amber-50 and **0.55 ΔE00 from `#F7F1E4`, one of the AI creams R3.5 names** (judge 2); the board is 0.45 from zinc-950, so an adversarial reader may see "a cream primary on shadcn-dark". Lit fills are kept to cells (primary, FAB, dock cell, chosen chip, current set, today, rest time). Cooler options, computed:

   | Lamp | to `#F7F1E4` | to arms `#f2f2f2` | on a panel |
   |---|---|---|---|
   | `#f5f0e3` (tonight) | 0.55 | 6.00 | 15.61 |
   | `#f3f0e8` | 2.25 | 3.90 | 15.59 |
   | `#f0eee8` | 3.24 | 3.09 | 15.31 |
   | `#eeeeea` | 4.38 | 2.28 | 15.27 |

   Cooling the lamp moves it toward the arms plate; tonight keeps the warm lamp.
2. **Q-Q1, the three merges on You.** If no, each draws both labels.
3. **Weight's swap** (§8.5): off tonight.
4. **The name:** "Meet Day", or "Platform" [T6 §5].
5. **Set inputs at 15pt** (v1's iOS zoom-on-focus kept), or larger figures, which would stop the zoom — a behaviour change.
6. **The panel lifted** from MD-1's `#111317` to `#16181d`, so the 2px gutter reads.
7. **No glow** where track 6 allowed a 6px lamp glow.
8. **The "pill" in copy:** the week card's ⋯ sheet (you.js:802) says "The pill is the difference…"; with pill tints at 0 there is no pill shape, as in Chalk.
9. **Q-M5:** the set check stays 30 × 30.

---

## 17. Risks and what is unverified

- **The AI panel is a hard gate for this vibe.** The tells a sceptic may still circle: a band on every card head can read as a dashboard's panel heading (judge 1), and the lamp-on-black inversion as shadcn-dark (§16.1). The first revision, if needed, is one token: `shape.band.fill: 'bar'` (B's flush heads; section bands become bar-coloured strips on the board).
- **One look shared with Ledger:** both name `listRow · ledger` tonight (E13 asks for a leaderless board row). Nothing else overlaps: Ledger's cards are ruled, its type a serif, its ground club green.
- **The 2px gutter at 1.13:1** may merge in a bright gym. The revision is `shape.gutter` 2 → 3 or 4 (B's seam), one token.
- **E1 is blocking.** Without it the toggle fails 3:1 on both clients.
- **Composition is only as safe as its proofs** (§8.9); Fuel's split and the pair's bars are the likeliest fallbacks.
- **Square SVG bars** depend on CSS `rx: 0` reaching the pinned module's `rx` attribute (SVG2 geometry properties); Safari's support is unverified, and the residual is v1's bar radius.
- **Q's literal checks:** N21 ("`.stat` has no fill") will flag the board strip, which R6.3 sanctions; the drop rail is a 2px coloured vertical data mark that a naive N10 scan will flag; R6.5 (the sheet keeps the platform radius) is traded for `sheetHost · full`.
- **The coach pulse's peak** (2.35 on the unlit ring) is a moment of an animation; the steady layer (3.26) carries the cue.
- **Chips are 17 % wider** than v1's (12pt against 11): the 44-tall chip grids (feel, goal, movement) are a Q fit item at 320.
- **Device checks nobody can run tonight:** ArchivoCondensed on native at h1–h3 with `minLh` 1.088; RN `tabular-nums` on the two statics; whether ⚙ and ⚠ draw as colour emoji where they stay text (Q-D2); the gutter outdoors.
- **Carried from the synthesis:** the lb plate colours run one step off the loose lb convention (Q-M3). Meet Day draws plates prominently, so it makes that more visible; it is not a vibe change.
- **Provenance:** the two native statics were fetched by concept A with no fetch-log line; Phase V re-fetches them through `fetch.mjs` and must match §5.2's hashes.

---

## 18. The losing concept: B · "The loading room" (73; Micah may swap it in)

**The idea.** Meet Day seen from the warm-up room behind the platform: the loaded bar drawn as the loading chart, a lamp for each thing done, the current set in an inverted box, every figure tall and narrow in lamp white on scoreboard black. It moves as few boxes as it can.

**What it draws.** MD-1's palette on the same black, with the tile at `#111317`; borderless square tiles (radius 2) 4pt apart on "floor seams", whose heads sit flush in the tile's own colour (band fill = bar, so a head draws nothing); section strips on the floor; board strips on the well inside tiles; condensed figures at wdth 62.5 (set inputs too); B's own two Omnibus upstream statics (141,432 B); no glow, no flap; a rubber-fleck PNG (1,778 B) in the dock's seams, web only; v1's icons with a plug `spark`.

**Where it rearranges.** Only You, inside two blocks: the KPI lanes with their 4 × 7 lamp board, and the pair's rings as ten-cell bars. The other six composed screens fall back by choice, each with a reason from the code (Start workout's fixed position, the thumb's water presets, logging first on Weight, steps.js:220's arc, the feel card second, the plate strip below the rows).

**Why it lost.** Both judges scored it the most readable and most buildable (8 and 8), and lower on distinctness (5) and on "could an AI have made this?" (6 of 10: a uniform borderless dark tile on near-black is the one-card-recipe tell; its outline stays one column of rectangles, a real risk for the silhouette test; its cards match Oxblood's `card · flat` in another colour). Most of its careful colour work is grafted above (§0).

**To swap it in:** in `meet-day.js`, `shape.band.fill: 'bar'`, `shape.gutter: 4`, `colors.bar: '#111317'`, `colors.raised: '#1d2026'`, `colors.track: '#23262d'`, `colors.grip: '#6f7580'`, `colors.knurl: '#666c77'`, the figure presets at wdth 62.5 and `setInput` at 62.5 · 800, `sheetTitle: 'v1'`, `headline: 'v1'`; `compose` only `you.within` (lanes and bars); its own statics and the fleck (which needs a native texture slot). Its full definition is `design/meet-day/scratch-B/meet-day-B.js`.

---

## 19. Registry entry and picker data

```js
{ id: 'meet-day', name: 'Meet Day', feel: 'The platform on meet day.', experimental: true, scheme: 'dark' }
```

Picker tile (T10 §4.8), last in the registry order:

```js
pick: { ground: '#07080a', card: '#16181d', edge: null, edgeW: 0, radius: 0,
        text: '#f5f0e3', soft: '#a8a295', num: '#f5f0e3', accent: '#f5f0e3',
        numFace: { web: "'meet-day-num'", wdth: 62.5, wght: 800, native: 'ArchivoExtraCondensed_800' },
        numPt: 35, thumb: null, scrim: null }
```

- `numPt` 35: a 24pt cap height at cap height 686 / 1000 (computed). "315" measures 45.1pt there, well inside the tile's 92.
- The sample is "315" bare on the panel, no flap: lamp on the panel 15.61. The name and feel line in the current UI face: 15.61 and 6.99.
- "Experimental" is plain 12pt 600 text.
- Web: rules only under `.vibe-in[data-vibe="meet-day"]`; `vibe.js` prefetches `meet-day-num` (9,016 B, same-origin), so the figure is never hidden waiting on Google.

---

## 20. The two tests

**(a) The generic-prompt test** [T1 D18a]. "A dark fitness tracker" produces a near-black page with one neon or orange accent, rounded soft-shadow cards and ring gauges, gradient area charts, tracked-caps labels, pill badges, and big numbers in a geometric sans. Meet Day has none of these: no hue accent; square panels on 2px black gutters under filled bands; figures cut from Archivo's own extra-condensed width; lamps for done and an inverted cell for current; ten-cell rings and bars; lines with no fill; a drawn loading chart; no caps it sets, no glow, no gradient, no pill. Every device restyles something Rack already draws.

**(b) The silhouette test** [T1 D18b], You shrunk to 200px-wide black blocks. **v1**: an avatar and a gear flanking two lines; one tall rounded box; a thin line; about eleven separate rounded boxes 12px apart, each section announced by a small label and a trailing hairline; boxes with coloured left stripes, a 2 × 2 of inset tiles, three-tile rows, two rings in a mirrored pair. **Meet Day** (with X and E3): the hero with a third line under the greeting; the Coach box directly under it with no line between; then seven continuous slabs, each opening with a full-width filled band and cut inside by thin full-width gutters; three sections whose band and card head are one strip; the week slab four horizontal lanes with a 4 × 7 grid of dots down its right side; no rounded corners, no side stripes, no rings. The block count, the block sizes, the edge treatment and the since-line's position all differ. **Without X**, the bands, gutters, lanes-less 2 × 2 and rings-as-ten-cells still change the edges and the fill of every block, but the order is v1's; the full silhouette answer needs X.

---

## 21. Reproduce (read-only on both trees)

| Command | What it establishes |
|---|---|
| `node ~/dev/vibes-night/tools/mdF-check-def.mjs` | the definition against v1.js (474 leaf paths, 0 missing), index.js ROLES (298, every one through `valueOf()`; the 48 engine-v2 roles printed with where each value came from), LEGACY_EXACT (none held), vocab.js (29 of 29 looks accepted at an experimental grade), the tables following their roles, the aliases, the bands, the web family names, and the icon set: **2,449 checks, 0 failed** |
| `node ~/dev/vibes-night/tools/mdF-colour.mjs [--all]` | §4 in full (track 4's `colour-lib.mjs`: WCAG 2.2, Machado 2009, CIEDE2000; its Tailwind v3 table); writes `design/meet-day/mdF-colour-report.txt`. **No failure in any pair that occurs** |
| `node ~/dev/vibes-night/tools/mdF-fonts.mjs` | §5: hashes, PostScript names, versions, weight and width classes, hhea, `tnum`, coverage, web / native parity, fit at the spec's sizes, the OFL line (harfbuzzjs 0.4.15, opentype.js 1.3.4) |
| `node ~/dev/vibes-night/tools/mdF-widths.mjs` | §5.4: every preset's longest strings at Meet Day's and v1's settings |
| `node ~/dev/vibes-night/tools/mdF-webfont.mjs` | builds the two web woff2 into `design/meet-day/final/` (scratch) with `subset-font` 2.4.0 from the pinned source, and measures them |
| `node ~/dev/vibes-night/tools/mdF-wdth-survey.mjs` | every literal native `wdth`: none falls in a Meet Day band outside the vibe definitions |
| `node ~/dev/vibes-night/tools/mdF-find.mjs <file> <regex>` | the read-only line search behind the code anchors |

Code read, all with Read or read-only git: you.js 548-642, 1063-1195, 1318-1407; workout.js 344-548, 1261-1279, 1372, 1404, 2069-2215; food.js 542-630, 1196-1210; weight.js 82-222; steps.js 167-175, 220; rack.css (every `uppercase` rule; 655-686; 2427-2440); vibe.js 122-262; vibes/defs/v1.js, index.js, vocab.js; vibes/icons/v1.js; native Hero.jsx, theme.js 300-370 and 670-730, coach/settings.jsx 136-139, session.jsx 270 and 748-756. Nothing was written in either app tree; in the design worktree only the two new files.
