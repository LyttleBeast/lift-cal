# Ledger: the final spec (deep-1)

V59 Phase D, slot `deep-1`, id `ledger`. Written 2026-09-29 against contract and engine v2 (web `58ac3be`, design worktree `wt/web-design2`; native `main` `f3382d3`). It merges two concepts: concept A, "The Record Book", the winner, and grafts from concept B, "The Swiss programme". Two judges scored them.

Every number below was measured tonight by a script listed in §17, unless it carries another source. Nothing here is approved.

**Files this spec ships with:**
- the pure definition: `wt/web-design2/vibes/defs/ledger.js`
- the icon set: `wt/web-design2/vibes/icons/ledger.js`
- the checks: `tools/ledger-spec/*.mjs`
- the prepared fonts: `design/ledger/final/fonts/out/`
- the icon contact sheet: `design/ledger/final/icons-contact.png`
- the full contrast report: `design/ledger/final/contrast.txt`

---

## 0. The decision in brief

| | |
|---|---|
| **Winner** | **Concept A, The Record Book**: 77 points against B's 69 (see below) |
| **Name / feel** | **Ledger** / "Ruled columns on club green." (28 characters) |
| **Kind** | Deep, **dark**, "same order, new shapes" |
| **The idea** | Rack set as a sports club's record book. Every name runs along a drawn leader to its figure, only the ranked column is bold, and heads hang from rules instead of sitting in boxes. Cream ink on bottle-green book cloth, a sturdy text serif for every word and figure, condensed gothic heads, and one pink ribbon that marks "here, now". |
| **Faces** | **Manuale** (Omnibus-Type, OFL 1.1, **no RFN**) for text, labels, buttons and every figure. **Archivo** (v1's) for the heads, at wdth 75 / 700, and for the Coach card, kept on v1's metrics. That is two families under R4.1. |
| **Palette** | Research's `club` (bottle green `#0e1813`, cream `#f1ead8`, pink `#ffb3c8`), with B's four measured moves and a stronger lead step |
| **Icons** | A set of its own, drawn by rule: square caps, mitre joins, square corners. `spark` is a tucked slip of paper |
| **Textures, photos, ornament** | None |
| **Checks** | Web contract verifier with Ledger registered: **521 / 521**. My own contract walk: **719 / 719**. v1 leaf-path walk: **612 / 612**. Contrast: **0 failures**. Worst group ΔE00 across normal vision, deuteranopia and protanopia: **13.60** |

### How the winner was picked

The formula: total of the five scores, with "could an AI have made this?" inverted (10 − x) and weighted double.

| | Distinct | AI-made (inverted ×2) | Readability | Fits Rack | Buildable | Total |
|---|---|---|---|---|---|---|
| A, judge 1 | 8 | 3 → 14 | 6 | 7 | 5 | 40 |
| A, judge 2 | 8 | 5 → 10 | 6 | 8 | 5 | 37 |
| B, judge 1 | 5 | 5 → 10 | 7 | 6 | 9 | 37 |
| B, judge 2 | 5 | 7 → 6 | 7 | 6 | 8 | 32 |
| **A** | | | | | | **77** |
| **B** | | | | | | **69** |

Both judges also picked A outright. Their reasons: A is the only one likely to pass the slot's hard gate (2 of 3 adversarial judges must say "human"). It has drawn leaders, ranked bold, a serif record figure on green, and one lead box per tab. B would ship the two tells a sceptic spots first: rules with no box on You and Train, and v1's own face on a Swiss grid.

### What changed from concept A, and why (read before judging)

1. **Source Serif 4 is out, and Manuale is in.**
   - Source Serif 4 carries the Reserved Font Name "Source". Upstream `LICENSE.md` says so, and so does name ID 0 of every file. Both judges confirmed it in `METADATA.pb`.
   - A Latin subset is a Modified Version. PLAN rule 6 (R4.7) says "no RFN on anything subset", and the §13.7 checker "rejects if a test can't be confirmed".
   - Nobody is awake to rule on A's renamed "Ledger Text", so the build must not depend on it.
   - **Manuale keeps A's whole premise**: a sturdy serif for every word and figure on dark green.
     - It has no RFN (checked in `OFL.txt`, `METADATA.pb` and name ID 0 of all four files).
     - Its default figures are tabular lining at every weight.
     - Its variable `wght` axis runs 300–800, so it meets R4.4's ≥ 800, which Source Serif at 400–700 did not.
     - Its web cut is 38.9 KB; Source Serif's was 56.1 KB.
     - It is by Omnibus-Type, the foundry that drew Archivo, so the pair is a family resemblance, not a mash-up.
   - The renamed Source Serif route stays open as **D-1** for Micah (§15).
2. **The heads are Archivo Condensed, not Alumni Sans, and the Coach card stays Archivo on v1's metrics.**
   - This is the type fallback both judges named: "Archivo Condensed Bold heads, 0 web bytes, +1 TTF, the Coach card on v1 metrics".
   - It is also the orchestrator's decision (d): keep the Coach card on v1's metrics.
   - With the card on Archivo, R4.1's two-family limit leaves room for exactly one more family. That is the serif. So the heads must be Archivo.
   - The native file is the css2 static **Meet Day already ships under the same key** (`ArchivoCondensed_700`): one asset, two vibes.
   - Ledger's heads differ from Meet Day's in use, not face. Here they are sentence case, 22–34 pt, hanging from a knurl rule. Meet Day's are caps in bands.
3. **`eyebrow` stays a label (13 / 600 steel), not a 17 pt head.**
   - A turned `type.eyebrow` into Alumni 17 chalk "real heads". But `type.eyebrow` is the app's small-label role at about 90 native sites:
     - "kcal left today" under Fuel's big figure;
     - "to go" and "goal met" on Steps;
     - the weekday letters;
     - quantity labels;
     - "± 25 kcal".
     
     (`git grep` over rack-mobile.) A 17 pt condensed head in chalk there would be wrong.
   - The real heads come from h1, h2 and h3 instead:
     - screen titles at 34;
     - sheet titles at 26;
     - section heads at 22.
4. **Old-style figures are dropped.**
   - A used them only in Coach sentences.
   - The Coach card now keeps v1's Archivo metrics, so they would appear in the sheet but not the card.
   - R6.7 asks for one numeral treatment per vibe.
5. **The icons are Ledger's own, not v1's re-capped.**
   - Meet Day already ships v1's paths with square caps (`wt/web-design2/vibes/icons/meet-day.js`), so A's re-capped set would have matched Meet Day's.
   - Judge 1 flagged v1's Feather-derived drawings as a residual tell.
   - The set is drawn by rule and answers judge 2's objections to B's set:
     - the soles no longer read "00";
     - `spark` is neither a pilcrow nor an "info" i;
     - the gear and the Coach balloon are no longer Feather's.

---

## 1. Why these choices: the material and the model

- **The model.** *Spalding's Official Base Ball Record* (1910) is a sports record book [T3 §4]. It has name columns running on dot leaders to figures, only the ranked column in bold, and ruled tables [T3 D4, D5]. A lifter's log is the same kind of object: names, figures, a ranking, dates. That is the "fits Rack" argument, and it invents no content.
- **The ground: bottle green, `#0e1813`.** It comes from a record book's cloth binding and a club's records board, lettered in cream [T4 §3.2; T1 D1].
  - It is a dark *chromatic* ground: 6.89 ΔE00 from its nearest Tailwind v3 default (`neutral-900`) and 5.76 from v4's (`olive-900`).
  - It is neither v1's graphite nor "tinted near-black plus one accent".
- **The ink: cream, `#f1ead8`.** It is the colour of the page stock and the gilt: 15.10:1 on the ground.
- **The accent: pink `#ffb3c8`, a silk place-ribbon.**
  - Its one job is "here, now": today, the tab you are on, the focused field, the chosen tab of a control, and the Coach's voice.
  - **It never fills a button and never washes behind words.** The thing to do is a cream slab with green words (`btn · inverse`), so no colour does two jobs [T3 E1].
  - It sits 5.58 from `rose-300` (v3) and 23.93 from its nearest data colour (chest).
  - Whether pink suits Rack's audience is Micah's call (Q-P4).
- **Why serif figures on dark.** A dark serif is outside track 1's cream-plus-serif cluster [SYNTHESIS §5.4]. A record book's figures are its text face's figures, not a scoreboard's condensed digits, which C19 keeps away from a deep slot.
- **Why Manuale.** It is a compact, sturdy book serif with robust serifs and open counters. Its x-height is 0.93× Archivo's, and its text runs 0.96× Archivo's width at 400 and 0.91× at 700.
  - It is on neither the AI-default nor the Claude-steered lists [R4.10].
  - No other vibe in the lineup uses it. The lineup uses Sofia Sans, Overpass, Schibsted Grotesk, Besley and Archivo (`tools/ledger-spec/lineup.mjs`).
  - It is not Source Serif, so it avoids track 1's "Source Serif is Source Sans 3's sibling" worry.
  - **It is a spec-stage pick, not one of research track 5's**: it was measured tonight with track 5's own checks (`t5-check.mjs`, tnum, coverage, hhea, parity).

---

## 2. Rules this spec keeps (checked, not assumed)

- **Words and numbers.** Every word and number is identical, and no `text-transform` lowers anything.
  - Every label shows as authored: `upper: 0` wherever v1 had caps.
  - Strings typed in capitals (`COACH`, `COACH ME`, TDEE, RIR, e1RM, the weekday letters) stay capitals.
- **Boxes.** The same boxes, in the same order. Every look named is one `vocab.js` v2 accepts, at a grade a deep vibe may name (checked).
- **Colours.**
  - All are 6-digit hex, with no `LEGACY_EXACT` spelling.
  - Text is at 4.5:1 or better on every surface it lands on, and graphics at 3:1 (§3.4).
  - The six groups keep a worst ΔE00 of 13.60 across normal vision, deuteranopia and protanopia (§3.5).
  - Every up/down keeps its arrow.
- **Fonts.**
  - Two families.
  - Web: variable with `wght`, self-hosted Latin woff2, all under 120 KB.
  - Native: 4 static TTFs, the picker face included.
  - All OFL 1.1 with no RFN (§4).
- **Touch.**
  - Targets are at least v1's everywhere.
  - No motion is added.
  - The dock's tabs, order, position and 64 pt height are untouched.
- **v1.** Nothing in the definition is a value v1 spends. The web contract verifier reads v1 as rack-v58 with Ledger registered beside it (521 checks).

---

## 3. Colour: every role

### 3.1 `colors`

Changes from track 4's `club` are marked **Δ**, each with its reason.

| Role | Hex | Its job in Ledger, and why |
|---|---|---|
| `rack` | `#0e1813` | The page: bottle-green cloth |
| `bar` | `#1c2e23` **Δ** from `#15231b` | The lead box, the Coach card, sheets and the live top bar. **1.26:1 off the page**: club's 1.07 made the one kept box vanish (C17) |
| `collar` | `#2a3f33` **Δ** | Decorative lines only: chart grids, the Coach go row, the heat strip's empty day (pinned). Never a control's only edge |
| `knurl` | `#6b8876` **Δ** | **Every drawn rule, leader and control edge**: 4.67 on the page, 3.69 on bar, 3.28 on raised |
| `chalk` | `#f1ead8` | Primary ink: 15.10 on the page, 11.95 on bar |
| `steel` | `#b8bda7` | Labels and secondary lines: 9.39 / 7.43 |
| `dim` | `#9ca38d` **Δ** (B) | Tertiary: notes, meta, dock labels. 6.94 / 5.49; 4.87 on raised; 4.54 on a chosen row in a sheet. HSL s .11, so grey |
| `faint` | `#9ca38d` | = dim: no fourth, fainter grey |
| `pRed` | `#ff7856` **Δ** (B) | Chest, protein, gain. Lifted from `#ff6b4a` so red text holds 4.56 on a chosen row in a sheet (A's was 4.10). HSL 12, so still red |
| `pBlue` | `#6aaaf8` | Back, fat, water, training, cut, drop sets |
| `pYellow` | `#ffe07a` | Legs, carbs, fuel and weight, maintain |
| `pGreen` | `#36bf9c` | Shoulders, steps (a bluish green for deuteranopes, T4 R5) |
| `pWhite` | `#efe9dc` | Arms, the steps subject |
| `pChrome` | `#7f878e` | Core. Graphics and large text; small core text inks steel (`inkOf`) |
| `good` / `warn` / `bad` | `#36bf9c` / `#ffe07a` / `#ff7856` | Green, amber, red, as the copy names them |
| `accent`, `focus` | `#ffb3c8` | The ribbon: 10.82 on the page, 8.56 on bar |
| `accentPressed` | `#f09ab2` | `onAccent` on it is 8.60. v3 `rose-300` 5.07 (reported, not gated) |
| `onAccent` | `#0e1813` | 10.82 on the accent (the count badge, a toggle on) |
| `danger` | `#ff7856` | A keyline and words; the swipe panel's fill |
| `onDanger` | `#0e1813` | One value on both clients (v1's `{web, native}` split is only a spelling). Page green on the red panel: 6.97; white would be 2.60 |
| `done` / `onDone` | `#36bf9c` / `#0e1813` | The set check's fill and its drawn tick: 7.84 |
| `well` | `#0e1813` | = rack. A recess inside a sheet is the page (never a same-fill recess, N9) |
| `knockout` | `#0e1813` | Green words cut from the cream slab: 15.10 |
| `inverse` | `#f1ead8` | The primary slab, the FAB, the toast, a chosen tag |
| `calMark` | `#fcfcfa` **Δ** (B) | "The white head", the ticks and the dashed target: HSL s .25, l .98. **12.41 on the track** |
| `raised` | `#22372b` | Tags, plain buttons, the rest pill, the peek bar, Coach bubbles. 1.42 on the page, 1.13 on bar |
| `track` | `#2d3431` **Δ** (B) | Empty meters. **Near-neutral, so the calorie zones keep the hues the guide names** (§3.5). Every plate as a fill on it: 3.50–10.54 |
| `grip` | `#6b8876` | = knurl: the grab handle **3.69 on the sheet** (decision c), and the toggle's off track |
| `onWarn` | `#0e1813` | Native's solid trial bar: 13.98 |
| `onYellow`, `onGreen`, `onPlate`, `white` | `#0e1813` | Legacy aliases. `onPlate` on the six plates: 4.97 (core) to 14.98 (arms) |
| `pYellowPressed` | `#f09ab2` | Alias of `accentPressed` |
| `fallback` | `#b8bda7` | = steel, as `groups.fallback` follows it |
| `shade` / `lift` | `#000000` / `#ffffff` | Under the sheet backdrop and the tour card / the pressed wash and the resting pill |
| `tileHero`, `tileLit` | `#1c2e23` | `addTile · ruled` draws no tile or wash: the sheet itself |
| `band` | `null` | A dark vibe: no web status strip |

- `themeColor` is `#0e1813`: the `<meta>` follows the page, as v1's does.
- **Tailwind guards**, computed with `tools/colour/tailwind.mjs` and `tailwind4.mjs`:

  | Role | v3 nearest | v4 nearest |
  |---|---|---|
  | rack | 6.89 | 5.76 |
  | bar | 5.84 (`emerald-950`) | 6.19 |
  | raised | 6.23 | 6.52 |
  | accent | 5.58 (`rose-300`) | 6.12 |

  All are ≥ 5. The track is near-neutral, a meter and not a ground: 6.38 on v3 and 4.79 on v4 (v4 is information only).

### 3.2 `alpha`, `tagInk`, `inkOf`

- `alpha`: v1's map (yellow → pYellow, red → pRed, blue → pBlue, green → pGreen, ground → rack, accent, danger, warn).
- `tagInk`: `{ W: pYellow, F: pRed, D: pBlue }`. The letter *is* the badge (`setRow · ruled`):
  - on the page: 13.98 / 6.97 / 7.52;
  - on a done row: 11.87 / 5.91 / 6.39.
- `inkOf`: identity, except **`pChrome → steel`**. Core is 4.97 on the page but 3.93 on bar, so small core-coloured text inks steel. Graphics and large text keep core; as large text on bar it is 3.93, which is ≥ 3.

### 3.3 `tint` (a role at an alpha; no `exact`)

| Tint | Value | Why |
|---|---|---|
| `setDone` | done .10 | A done row you can see from the bench: 1.18 off the page (v1's .07 gives 1.10) |
| `setFlash` | accent **.16** (B) | Down from .28. At the flash's peak, dim holds 4.92 and red 4.94 |
| `tagW` / `tagF` / `tagD` | their plates at **0** | No tinted square behind the letter |
| `dropRail` | pBlue **.70** | Structure: 4.28 on the page (v1's .45 gives 2.51) |
| `dropAdd` | pBlue .45 | + Drop's edge; its words carry the control |
| `pickSel` | **chalk .07** (B) | A chosen row is a lighter leaf, never a pink wash. Dim on it in a sheet: 4.54 |
| `block` | accent **0** | A lifting block is framed by rules, not washed |
| `coachBase` / `coachLow` / `coachHigh` | accent .14 / .07 / .38 | v1's: the Coach pulse round a set check is the Coach's pink |
| `rowPress` | lift .05 | A touch more than v1's .04 on the green |
| `pillBase` / `pillUp` / `pillDown` / `pillWarn` | lift .06 / good .16 / bad .16 / warn .16 (B) | **The delta pill stays**: you.js:802 says "The pill is the difference between the two weeks". Its words: good on up 5.92, bad on down 5.53, warn on warn 9.30, dim on base 5.96 |
| `zoneCut` / `zoneHold` / `zoneGain` | pBlue / pYellow / pRed at **.32** (B) | Over the near-neutral track, each band keeps its named hue (§3.5) |
| `dockGlass` | rack **1** | `dock · rail` is opaque, on the page's own green |
| `wkBarGlass` | **bar 1** | The live session's top bar on bar, as native draws it: the session gets its own header [T2 B17] |
| `backdrop` | shade .6 | v1's |
| `trajGood` / `trajWarn` / `trajBad` | .18 each | v1's |
| `reviewBg` / `reviewBorder` | **chalk .06 / chalk 0** (B) | "Next week" is the callout: a faint cream band with no border and no pink wash |
| `runway` / `runwayEdge` | rack .55 / .7 | v1's (a dark vibe) |

### 3.4 Contrast: every text role on every surface it meets

All of this comes from `tools/ledger-spec/contrast.mjs` (WCAG 2.x, track 4's library), which reads the colours from `ledger.js` itself. The full report is in `design/ledger/final/contrast.txt`.

**The surfaces:**

| Key | Surface | Hex |
|---|---|---|
| S1 | the page | `#0e1813` |
| S2 | bar | `#1c2e23` |
| S3 | raised | `#22372b` |
| S4 | done row | `#122921` |
| S5 | flash peak | `#353130` |
| S6 | chosen row on the page | `#1e2721` |
| S7 | chosen row in a sheet | `#2b3b30` |
| S8 | pressed row on the page | `#1a241f` |
| S9 | pressed row in a sheet | `#27382e` |
| S10 | pill base | `#1c2621` |
| S11 | pill up | `#143329` |
| S12 | pill down | `#35271e` |
| S13 | pill warn | `#353823` |
| S14 | "Next week" callout on the page | `#1c251f` |
| S15 | "Next week" callout on bar | `#29392e` |
| S16 | the estimator notice (warn .07) in its sheet | `#2c3a29` |
| S17 | the trial bar | `#262c1d` |

**Text:**

| Ink | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | S11 | S12 | S13 | S14 | S15 | S16 | S17 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| chalk | 15.10 | 11.95 | 10.61 | 12.82 | 10.71 | 12.80 | 9.88 | 13.30 | 10.35 | 12.98 | 11.40 | 11.98 | 10.05 | 13.12 | 10.18 | 10.03 | 11.98 |
| steel | 9.39 | 7.43 | 6.59 | 7.97 | 6.66 | 7.95 | 6.14 | 8.26 | 6.43 | 8.06 | 7.08 | 7.45 | 6.25 | 8.15 | 6.33 | 6.23 | 7.45 |
| dim = faint | 6.94 | 5.49 | 4.87 | 5.89 | 4.92 | 5.88 | **4.54** | 6.11 | 4.75 | 5.96 | 5.23 | 5.50 | 4.62 | 6.03 | 4.68 | 4.61 | 5.50 |
| accent | 10.82 | 8.56 | 7.60 | 9.18 | 7.67 | 9.17 | 7.08 | 9.52 | 7.41 | 9.29 | 8.16 | 8.58 | 7.20 | 9.40 | 7.29 | 7.19 | 8.58 |
| good | 7.84 | 6.21 | 5.51 | 6.66 | 5.56 | 6.65 | 5.13 | 6.91 | 5.37 | 6.74 | 5.92 | 6.22 | 5.22 | 6.81 | 5.29 | 5.21 | 6.22 |
| warn / pYellow | 13.98 | 11.06 | 9.82 | 11.87 | 9.92 | 11.84 | 9.14 | 12.31 | 9.58 | 12.01 | 10.55 | 11.09 | 9.30 | 12.14 | 9.42 | 9.28 | 11.09 |
| bad / danger / pRed | 6.97 | 5.51 | 4.89 | 5.91 | 4.94 | 5.90 | **4.56** | 6.13 | 4.77 | 5.99 | 5.26 | 5.53 | 4.64 | 6.05 | 4.70 | 4.63 | 5.53 |
| pBlue | 7.52 | 5.95 | 5.29 | 6.39 | 5.34 | 6.38 | 4.92 | 6.62 | 5.15 | 6.46 | 5.68 | 5.97 | 5.01 | 6.54 | 5.07 | 5.00 | 5.97 |
| pWhite | 14.98 | 11.85 | 10.52 | 12.72 | 10.63 | 12.70 | 9.80 | 13.19 | 10.26 | 12.87 | 11.31 | 11.89 | 9.97 | 13.01 | 10.10 | 9.95 | 11.89 |
| pChrome as small text → steel | 9.39 | 7.43 | 6.59 | … | | | | | | | | | | | | | |

**Every cell is 4.5 or better.** The lowest are:
- dim on a chosen row in a sheet: 4.54;
- red there: 4.56;
- dim on the estimator notice: 4.61.

No pair needs a "large text only" or "never produced" exemption.

**Inks on fills:**

| Ink on fill | Ratio |
|---|---|
| knockout on inverse (the primary slab, FAB, toast, chosen tag) | 15.10 |
| onAccent on accent | 10.82 |
| onAccent on accentPressed | 8.60 |
| onDanger on danger | 6.97 |
| onDone on done | 7.84 |
| onWarn on warn | 13.98 |
| banner ink on pRed | 6.97 (white would be 2.60) |
| banner ink on pGreen | 7.84 (white would be 2.31) |
| onPlate on the plates | 4.97–14.98 |

**Graphics (3:1):**

| Graphic | Ratio |
|---|---|
| knurl rules, leaders, control edges | 4.67 page / 3.69 bar / 3.28 raised |
| grab handle on the sheet | 3.69 (v1's is 1.41) |
| focus, the dock rail, the tab underline, today's keyline | 10.82 / 8.56 / 7.60 |
| done check | 7.84 page / 6.21 bar |
| drop rail | 4.28 |
| steel "ai" keyline | 7.43 |
| calMark on the track | 12.41 |
| dock icons at rest (dim) / active (chalk) | 6.94 / 15.10 |
| plates as marks | 4.97–14.98 on the page, 3.93–11.85 on bar |
| plates on the track | 3.50–10.54 |

**One pair needs the engine.** v1's toggle draws a **steel knob on grip**. In Ledger that pair is **2.01**, against v1's 3.80: a regression on a colour Ledger changes.
- No grip can hold both the grab handle (3:1 on bar) and a steel knob (3:1 on grip): the ceiling is 2.43.
- So the off knob is **chalk: 3.24**. The on knob is accent over accent .28: 4.46.
- The web stylesheet can do this today (`.tog::after`, scoped).
- Native needs **ask R-3** (§14). Until it lands, native's off knob is 2.01: a known gap for Q.

### 3.5 Colour vision and the named hues

Machado 2009 severity 1; CIEDE2000.

| Vision | Worst three group pairs | Good vs bad | Accent's nearest |
|---|---|---|---|
| normal | legs/arms 19.72, back/core 20.18, shoulders/core 27.15 | 59.05 | chest 23.93 |
| deuteranopia | **shoulders/core 13.60**, chest/legs 14.49, shoulders/arms 17.44 | 20.33 | arms 7.20 |
| protanopia | shoulders/arms 13.86, chest/shoulders 14.91, legs/shoulders 19.67 | 14.91 | arms 14.30 |
| tritanopia (information) | back/shoulders 7.93, legs/arms 11.04, back/core 21.50 | 65.68 | legs 11.99 |

- **The worst group pair across the three gated visions is 13.60**, against a gate of 12. v1's is 10.90 under deuteranopia.
- Good against bad survives colour-vision deficiency on its own (14.91 at worst), and every delta keeps its arrow. Manuale has ↑ ↓ →.
- The accent sits 7.20 from arms under deuteranopia. The accent is never data: it is always a rail, a keyline, an underline, a ring or words. R2.4 gates normal vision only.
- **The calorie zones over the track** (the guide says "Blue — cut", "Yellow — hold", "Red — gain", "the white head"):
  - cut is `#415a71`, HSL h 209 (v1's wash is 214);
  - hold is `#706b48`, h 53 (v1's 49);
  - gain is `#704a3d`, h 15 (v1's 338);
  - the white head on them: 6.99 / 5.26 / 7.47.
  - Over A's green track the bands went cyan, yellow-green and olive. The near-neutral track is what keeps them honest.
- **HUE_NAMED** (checked by `contract-check.mjs` and the web verifier):
  - pBlue: blue;
  - pYellow: yellow;
  - pRed and bad: red;
  - calMark: white;
  - good: green;
  - dim: grey;
  - warn: amber.

---

## 4. Type

### 4.1 Faces, licences, sources, files

| | **Manuale** (text, labels, buttons, every figure) | **Archivo** at wdth 75 / 700 (heads) — and v1's Archivo (Coach card) |
|---|---|---|
| Licence | OFL 1.1. `OFL.txt` line 1 reads "Copyright 2019 The Manuale Project Authors (https://github.com/Omnibus-Type/Manuale)". **No Reserved Font Name.** No trademark record (name ID 7 is absent). Name ID 0 in all four files is the same line | OFL 1.1. "Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo)". **No RFN** |
| `OFL.txt` | `https://raw.githubusercontent.com/google/fonts/main/ofl/manuale/OFL.txt` (4,388 B, sha256 `6f5869d0…fce71`) | `…/ofl/archivo/OFL.txt` (4,388 B, `108b4e57…b716b`) |
| `METADATA.pb` | `…/ofl/manuale/METADATA.pb` (924 B, `1b3cf239…3208c`). Repository Omnibus-Type/Manuale @ `20a5ab6a`; axes wght 300–800 | `…/ofl/archivo/METADATA.pb` (1,339 B, `a2e8f63f…2231d`) |
| **Web source** | `https://raw.githubusercontent.com/google/fonts/main/ofl/manuale/Manuale%5Bwght%5D.ttf` (185,992 B, `19ea09ad…17ded6`) | `https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/Archivo%5Bwdth,wght%5D.ttf` (658,596 B, `0e094a7d…05053`) |
| **Web files** | `ledger-manuale.woff2`: Latin + → ≈, **wght 400–800**. **38,936 B**, `8223c6af…ae9db0`. `ledger-num.woff2`: digits only, wght 700 (the Vibes card's figure). **3,192 B**, `e0b8eab8…ffa4` | `ledger-heads.woff2`: Latin + → ≈, **wdth pinned 75, wght 600–800**. **25,404 B**, `f48956d6…55d4` |
| Why not Google's Latin woff2 | `fonts.gstatic.com/s/manuale/v31/f0X20eas_8Z-TFZdNPHOwuvF-ac.woff2` (43,088 B) follows Google's `latin` range, which **leaves out → (U+2192), the flat delta, and ≈ (U+2248), Weight's maintenance**. The cut keeps both | as left |
| **Native statics** | Google css2's static instances (`https://fonts.googleapis.com/css2?family=Manuale:wght@400;600;700`), Manuale v1.002: `fonts.gstatic.com/s/manuale/v31/f0Xp0eas_8Z-TFZdHv3mMxFaSqASeeHke7wD.ttf` (400, 74,808 B, `90d04523…0f90e`), `…SeeE6fLwD.ttf` (600, 75,556 B, `ec3c1826…dd04`), `…SeeEDfLwD.ttf` (700, 75,400 B, `c76c4bb2…e639`). Cut to Latin + → ≈: **`Manuale_400` 33,032 B** (`388ca3c7…d122`), **`Manuale_600` 33,576 B** (`de7c42c2…21e8`), **`Manuale_700` 33,476 B** (`bd0ebece…1621`) | `ArchivoCondensed_700`: css2 (`family=Archivo:wdth,wght@75,700`) → `https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q9osJaRE-NWIDdgffTT0zRp8A.ttf` (111,532 B, `02c3400e…2d1d`), cut to Latin: **37,688 B** (`0c031db5…97df`). **The same key and file Meet Day ships**: one asset under `assets/fonts/ArchivoCondensed/`, counted in each vibe's budget |
| PostScript names | `Manuale-Regular`, `Manuale-SemiBold`, `Manuale-Bold`: unique, never an Archivo package name | `ArchivoCondensed-Bold` |
| hhea → native `minLh` | 980 / −236, lineGap 221 → **1.216** | 878 / −210 → **1.088** |
| Figures | **Default figures are tabular lining**: 502 / 507 / 510 / 513 at 400 / 600 / 700 / 800, live and in every static. No feature is needed to set a number | tnum uniform 482 (never sets a figure here) |
| Glyphs Rack sets | Has ’ — · – … × “ ” → › − ‹ ↑ ↓ ≈ ± ÷. Lacks ✓ ⚙ ✕ ⋯ ↳ ⚠ ✎ ▾ ▴, like Archivo; those are drawn (§9) | the same |
| Parity | Web variable at 400 / 600 / 700 against each native static: **identical** advances on 18 strings (`subset.mjs`, `webcut-check.mjs`) | Within 1–2 thousandths of an em over a whole string (0.07 pt at 34). That is instancing rounding (`heads-cut.mjs`) |
| Budget | Web 38.9 + 3.2 KB. Native 3 TTFs, 100.1 KB | Web 25.4 KB. Native 1 TTF, 37.7 KB |

- **Totals.**
  - Web: 67.5 KB across three files. Every family is under the 120 KB limit.
  - Native: **4 static TTFs**, 137,772 B. `Manuale_700` is the picker face.
- **Build notes.**
  - `FONTS.json` per vibe folder records, for each file: family, source URL, version, sha256 of the source and the shipped file, the licence, the copyright line and "RFN: none".
  - `OFL.txt` for Manuale and for Archivo goes beside the files.
  - The cut commands are recorded: `tools/ledger-final/subset.mjs` (Manuale) and `tools/ledger-spec/heads-cut.mjs` (heads).
  - Today's re-fetch reproduced the source sha256 the earlier cut recorded.
  - @font-face families are vibe-prefixed: `'ledger-manuale'`, `'ledger-heads'`, `'ledger-num'`. An installed face can never stand in, and the files are same-origin, so the service worker keeps them offline.
  - Weight goes only through `font-variation-settings`, with no `font-weight` rules. rack.css line 1's @import stays byte-identical.

### 4.2 `type` presets

Weights have one job each: 400 running text, 600 labels and names, 700 figures, buttons and heads. **Nothing is under 11**; the dock label is the one 11. **No caps role.**

The sizes follow Manuale's metrics:
- its x-height is 0.93× Archivo's, so running text at 16 matches v1's 15;
- its lining figures are 0.63 em tall against Archivo's taller, wider 800s, so figures are set a step up.

| Preset | Setting | Note (widths from `measure.mjs`, native files) |
|---|---|---|
| `body` | 16 / 400 / lh 1.45 / chalk | "Losing 0.9 lb a week. Your plan is 1 lb a week." is 309.0 against v1's 297.8 at 15 (+4 %) |
| `h1` | **34 / wdth 75 / 700** / ls 0 / lh 1.1 / chalk | Condensed. Train's "September 2026" is **211.1 in the 214 its header leaves at 320**; v1's own 26 pt Archivo 800 is 210.8. Fuel's widest date, "Wed, May 20", is 164.2 in 174 |
| `h2` | 26 / 75 / 700 | Sheet titles: "Where this comes from" is 224 |
| `h3` | 22 / 75 / 700 | Section heads (`sectionHeader · rule`, ask R-7): "How you're doing" is 142.4 |
| `eyebrow` | 13 / 600 / **steel** / upper 0 | A label, not a head (§0 item 3) |
| `btn` | 16 / 600 / chalk | "Resume" 56.0 against v1's 56.6 |
| `btnLg` | 17 / 700 / upper 0 | "Start workout" as authored: 103.4 against v1's caps 155.6 |
| `dockLbl` | 11 / 600 / dim / upper 0 | "Weight" 33.9 in a 78 pt cell. Active: chalk at 700 (`dock · rail`). The cell is 22 + 3 + 13.4 = 38.4 of 63 |
| `fieldLbl` | 13 / 600 / steel / upper 0 | |
| `note` | 13 / 400 / lh 1.5 / dim | A record book's footnote is simply smaller type |
| `statVal` | **22** / 700 / lh 1 / tnum | "12,480" 60.6 against v1's 68.9 at 20 |
| `statLbl` | 13 / 600 / steel / upper 0 | Also the KPI label and "Per side" |
| `timer` | 22 / 700 / tnum | "1:32:05" 66.1 against v1's 82.1 |
| `kpiVal` | 22 / 700 / lh 1 / tnum | "1,950" 49.4 against v1's 61.1 |
| `headline` | **32** / 700 / ls −0.01 / tnum | You prints three (calories, weight, goal rate), so none is at hero size (R6.7) |
| `youGreet` | **34 / 75 / 700** / lh 1.1 | "Good afternoon," 208.4 against v1's 212.0: nothing new wraps |
| `chip`, `segBtn` | 13 / 600 / steel | |
| `setInput` | **17** / 700 / tnum / chalk (B) | A step up, to read between sets. 17 ≥ the web's 16, so iOS never zooms. The same on both clients |
| `mono` | 12 / chalk | `face.mono`, the paste box only |
| `meta` | 13 / 400 / lh 1.45 / dim | "Member since …", "last 7 days": roman, never italic |
| `loadNum` | wdth 100 / 700 / ls −0.01 / lh 1 / tnum | At the call sites' own 26–40. "1,950" at 40 is 88.3 against v1's 109.5. No box outgrows v1's |

Native literal sites no look re-sets keep v1's sizes, drawn in Manuale (their 800s snap to Bold).

### 4.3 `face`

```js
face: {
  family: 'Manuale', keys: ['Manuale_400', 'Manuale_600', 'Manuale_700'],
  snap: { 300: 400, 500: 600, 650: 700, 750: 700, 800: 700, 900: 700 },
  step: 100, width: 100, minLh: 1.216,
  bands: [{ min: 74, max: 76, family: 'ArchivoCondensed', keys: ['ArchivoCondensed_700'], snap: {}, weights: [700], minLh: 1.088 }],
  mono: { ios: 'Menlo', android: 'monospace' },
  web: { font: "'ledger-manuale', ui-serif, Georgia, serif",
         display: "'ledger-heads', 'Archivo', system-ui, -apple-system, sans-serif",
         italic: "'ledger-manuale', ui-serif, Georgia, serif",   // no italic anywhere
         num: "'ledger-num', 'ledger-manuale', ui-serif, Georgia, serif",
         mono: 'ui-monospace, monospace', importUrl: /* v1's, byte-identical */ }
}
```

- **The band is Meet Day's, entry for entry.** It catches exactly the presets set at wdth 75: h1, h2, h3 and youGreet.
- **No native literal site passes a width in 74–76** (Meet Day's survey). ErrorScreen's 78 falls to Manuale Bold.
- `contract-check.mjs` resolves every preset, loadNum, and a literal at every weight from 300 to 900 to a registered key.

### 4.4 The Coach card: Archivo on v1's metrics

- **The card is unchanged in face, sizes, line heights, numberOfLines and budget.** `T.fit` is null, as the orchestrator's decision (d) prefers, and as both judges' fallback said.
- verify-vibe-fit reports "measured no face of its own: the card draws in Archivo on v1's table".
- The goal and feel chips draw through the same table.
- The card's *skin* is Ledger's (`coachCard · flat`, §6).
  - In Ledger, `COACH` / `COACH ME` in accent read 8.56 on the card, where v1's read at v1's colours.
  - The line is chalk and the reason steel.
- **The alternative, not built:** the card in Manuale with its own advance table (T.fit, like Chalk's `vibeFit/chalk.json`).
  - It would put the lead box in the vibe's face.
  - It costs a measurement pass with `coach-view.js` `cardLayout()` and verify-vibe-fit on the shipped TTFs.
  - Manuale's hhea (1.216) and narrow set make it likely to keep v1's budget, but that is **unmeasured**. Logged in §15.

### 4.5 Glyphs

- Manuale covers ‹ › × − + → ↑ ↓, so those stay type in the vibe's own face.
- ✓ ⚙ ✕ ⋯ ↳ ⚠ ✎ ▾ ▴ are drawn through the icon set's glyph keys at their glyph-only sites (§9). That also removes the iOS colour-emoji risk for ⚙ and ⚠ at those sites (Q-D2).
- In prose they stay text, as v1's do.

---

## 5. Radius, shape, shadows, scrims, chrome, tables

- **`radius`:** `{ r 4, sm 2, sheet 18, tile 2, pill 999, plate 2, chip 2, mark 2, idx 2, round '50%', hair 1, bubble 2, badge 2 }`.
  - 4 is the lead box's corner: soft enough not to be broadsheet cosplay (N12), square enough to be a book's.
  - Everything tapped is 2.
  - The sheet keeps the platform's 18 (R6.5).
  - 999 survives only where a round thing is round: **the delta pill the copy names**, the rest pill, the toggle track, the day dots.
- **`shape`:**
  - `rule { ink: 'knurl', hair: 1, head: [2], place: 'above', sub: [1], total: [1] }`:
    - 2 pt opens a chapter (a section, the masthead, the dock); 1 pt opens an article (a card, an exercise).
    - A head **hangs** from its rule (T3 C3).
    - Never a double, thick-thin or Oxford rule: those are Iron Age's.
  - `leader { ink: 'knurl', dot: 1, pitch: 4, min: 16 }`: 1 pt dots on a 4 pt pitch (D4).
  - `keyline { ink: 'steel', width: 1 }`: the "ai" tag.
  - `lead { keyline: false }`: the lead is told by value.
  - `band` and `gutter` are the vocab's defaults, unused.
- **`shadow`:**
  - `peek`, `rest`, `toast`, `fab` and `fabPressed` are none: surfaces part by value and rule.
  - `tourCard` is v1's (black, on a dark ground), so the tour card lifts off the veil.
  - The rings are v1's roles: `calTick`, `flame`, `kpiDay`, `kpiDayOn`, `kpiToday`, `kpiTodayOn`, `guideEaten`, `traj*`, `tourLit`.
  - `calHead` and `calTarget` are `[]`: the white head stands at 12.41 on the track.
- **`scrim`:**
  - `sheet`: backdrop and `blur(3px)`, webkit false (fixed, v1's).
  - `dock`: dockGlass, `filter: 'none'`, webkit true (fixed), native intensity 0.
  - `wkBar`: wkBarGlass, `none`.
  - `tour`: **a flat veil**, rack .92 at both stops (B); native locations `[0, .42, 1]` and no `exact`.
- **`chrome`:** v1's, in 6 digits.
  - statusBar light, keyboard dark, blurTint dark (not drawn), shadow `#000000`, datePicker dark, camera `#000000`, systemFace null.
  - The fixed roles hold v1's values: appearance dark, launch and manifestTheme `#14161a`, webStatusBar `black-translucent`, colorScheme null.
- **`signIn`:** v1's 14 values, spelled in 6 digits. Native sign-in draws before any vibe is known.
- **`banner`:** `#0e1813` ×3.
- **`web.rgb`, `web.root`:** v1's.
- **`images`:** `{}`. Every `images.<slot>.band` takes its default, null. There are no photos, and every slot closes up.
- **Tables:**
  - `groups`, `groupPlates` (uppercase) and `plates` follow pRed, pBlue, pYellow, pGreen, pWhite and pChrome entry for entry.
  - `importGroups`, `mark`, `subjects`, `admin` and `conf` are v1's role maps.
  - `kpi` has every `a` at 0: `kpi · word` draws no tile and no corner tint.
- **Registry entry:** `{ id: 'ledger', name: 'Ledger', feel: 'Ruled columns on club green.', experimental: false, scheme: 'dark' }`.
- **Picker tile** (T10). Tile rules are scoped `.vibe-in[data-vibe="ledger"]` (decision e).
  - Page green.
  - The sample card in bar, with 4 pt corners.
  - **`315` in Manuale Bold**: web `ledger-num`; native `pickerFace()` → `loadNum(40)` → `Manuale_700`. It is 60.4 pt wide at 40, in cream: 11.95 on bar.
  - The 4 × 44 pink bar: 8.56.
  - The name in chalk: 15.10. The feel line in steel: 9.39.

---

## 6. The looks, block by block (all 29, VOCAB order)

| Block | Look | Ledger's treatment |
|---|---|---|
| `card` | **ruled** | **Structure.** No ground, border or radius. Each card hangs 6 pt below a full-width **1 pt knurl rule** (`rule.sub`, `place: 'above'`). Cards part by 24.<br>**Head row.** The title in `eyebrow` (13 / 600 steel); meta 13 steel and the drawn ⋯ at the right, with its 44 pt hit area.<br>**The tab's lead keeps a box.** Fuel's summary, Weight's log and Steps' today: bar ground, radius 4, no border, no keyline, v1's padding.<br>**Fuel's empty meal card** stays one line.<br>**Fuel's meal cards read as ruled periods:** "Breakfast … 520 kcal" on its rule.<br>**The PR card** loses v1's accent gradient and border. Its head rule is inked **accent**, like Wins below |
| `youCard` | **ruled** | As card. **Wins and Improve ink their head rule** in good / warn, never a side stripe (R6.4); which is which stays in the title words. The admin's cards take this look |
| `eyebrow` | v1 | Type only: 13 / 600 steel, sentence case, no tracking. `.chart-sub` and ChartSub keep v1's literal caps until ask R-6 |
| `sectionHeader` | **rule** | A **2 pt knurl rule** at full width, 32 above it. The title hangs 6 below it in `h3`, **Archivo Condensed 22 chalk**, sentence case: "How you're doing". 12 to the first card. No trailing hairline |
| `screenHeader` | **masthead** | The kicker in `eyebrow` (13 / 600 steel: "Training log", "Fuel") over the title in `h1`, **Archivo Condensed 34**. A **2 pt knurl rule** runs full width under both: the record book's running-head rule, the one rule *under* a head.<br>The month, day and gear buttons keep their place and **34 pt** size: square (radius 2), bar ground, knurl edge, with the drawn gear and Manuale ‹ ›.<br>The recap's line and date sit under its title. PageHead (stats, admin) is the same, with ‹ Back as text |
| `sheetHost` | v1 | The platform sheet in Ledger's tokens: bar ground, 18 pt top corners, a knurl top edge, the 36 × 4 grab handle in grip (**3.69**), heights 86 / 92 %. The backdrop is shade .6 with a 3 px blur |
| `sheetTitle` | **rule** | The title in `h2` (**Archivo Condensed 26**) over a **1 pt knurl hairline** at the sheet's content width. Its eyebrow (13 / 600 steel) sits above, as authored |
| `statRow` | **line** | A box-score line: no ground, no outer border. **Values on one baseline** (Manuale Bold 22, tabular, in the caller's colour), 1 pt collar rules between the columns, labels under them in `statLbl` (13 / 600 steel, sentence case: "trend now", "goal lb", "at this pace").<br>**Mini stats** are the same at their literal sizes; their 8.5 pt caps labels wait on ask R-6.<br>**Height is v1's**, so Start workout stays where it is.<br>Not `ledger`: three 44 pt lines per row would push You down about 300 pt |
| `kpi` | **word** | **No tiles**, no corner tint. The 2 × 2 grid in its order. Each cell has:<br>• the label (`statLbl` 13 / 600 steel);<br>• **the delta in its pill**, radius 999, `tint.pill*` .06 / .16, its signed text and arrow at **13 / 700** (the look re-sets v1's literal 11.5 / 10 px, ask R-11) in good / bad / warn / dim;<br>• the figure 22 / 700 with its unit 13 / 400 steel on the baseline;<br>• "last week …" 13 dim;<br>• the sparkline **word-sized** (72 × 20, 1.5 pt, a 3 pt square end mark, no frame);<br>• seven round day dots, today ringed in steel |
| `headline` | v1 | The figure alone, set by type: Manuale Bold 32 on You (the calorie, weight and goal-rate figures), and `loadNum` at the call sites' 26–40 on the tabs. Its unit sits beside it as v1 places it. Fuel's figure keeps its zone colour, Weight's pYellow |
| `chip` | **tag** | Raised ground, no border, radius 2, 13 / 600 steel. **Chosen = inverted**: cream ground, green words (15.10). The row scrolls as v1's. The 44 pt chips (Movement, feel, goal) stay 44 |
| `segmented` | **tabs** | No track. The options as words (13 / 600 steel) at equal widths. **The chosen one in chalk at 700 over a 2 pt accent underline**: the underline is the cue (ask R-8). At least v1's height; a tap on the chosen option does nothing |
| `btn` | **inverse** | **Primary:** a **cream slab, green words**, radius 2 (15.10), the most prominent control on its screen.<br>**Plain:** raised, radius 2, chalk words.<br>**Ghost:** no box, its words underlined 1 pt in steel, the 44 hit area kept by padding.<br>**Danger:** a square pRed keyline and pRed words.<br>**Sizes:** regular 16 / 600, large 17 / 700, sentence case as authored.<br>**States:** pressed .97, disabled .4 |
| `field` | **square** | **A box, because the copy says "this box"** (food.js:3320: "in this box … Clear the box").<br>Radius 2 and a **knurl edge**: 4.67 on the page, 3.69 on bar. Inside a sheet the ground is the well (the page); on the page, bar.<br>**Focus** turns the edge accent (8.56).<br>The label above in `fieldLbl`. Height and error room as v1's |
| `note` | v1 | 13 / 400 dim (6.94 on the page, 5.49 on bar), lh 1.5 |
| `toast` | **strip** | A **cream slip** the content's width, square, the words flush left in knockout (15.10), no shadow, in its place 16 above the dock. One at a time, 2.2 s |
| `settingsRow` | **ledger** | The label (Manuale 16 / 400 chalk), a **drawn leader** (knurl dots, 1 on a 4 pitch), the value (13 / 400 steel, tabular), the chevron › (Manuale, dim). No rules between rows; **one 1 pt hairline under the group**. 44 tall, full-width taps, pressed = the lift .05 wash.<br>**The toggle rows** keep their switch and sub-line: off = a **chalk knob** on grip (ask R-3), on = the accent knob on accent .28 |
| `listRow` | **ledger** | **On name … value rows** (PR, PB, rank, session, food entry, recent steps):<br>• the name 16 / 400 chalk (ellipsised), its sub-line 13 dim under it;<br>• a drawn leader to the value;<br>• the value **Manuale 16 / 700**, alone bold: **bold only the ranked column** (D5), never truncated.<br>**Rows of other shapes** draw as `plain`, on a 44 pitch with no rules between rows.<br>**A PR row** carries a 2 pt accent rule under its value, and its word "PR"; no wash, no gradient.<br>**Chosen** = the chalk .07 leaf plus the drawn tick.<br>**Swipe to delete** reveals the red panel with green-black words (6.97) |
| `setTable` | **ruled** | **No card.** The exercise hangs from a **1 pt knurl rule**. Its head: the 4 × 30 group tag in the group's colour (it is data), the name in **Manuale 17 / 700**, the drawn ⋯.<br>"Last …" in 13 dim. Column heads in `statLbl` (13 / 600 steel, as written: "Set", "lb", "Reps", "e1RM") over a 1 pt knurl rule. Widths v1's (30 / 1fr / 1fr / 42 / 38; the editor's 30 / 1fr / 1fr / 38).<br>**A lifting block** is a rule-framed group under its title in 13 / 600 steel: no wash (`tint.block` 0), no keyline.<br>+ Set and the action buttons as `btn · inverse` |
| `setRow` | **ruled** | **Rows** parted by 1 pt knurl hairlines: a ledger's ruled lines.<br>**The badge** is a bare figure in its 30 pt column, the hanging set numeral (D7): numbers steel, W / F / D in `tagInk` (13.98 / 6.97 / 7.52).<br>**The inputs** lose their ground and sit on a 1 pt knurl rule: **Manuale 17 / 700**, tabular, last time's numbers in dim at 400 as placeholders. **Focus** thickens the rule to 2 pt accent.<br>**e1RM** 13 dim.<br>**The check** is 30 × 30 with a 1.5 pt knurl edge. **Done = the green fill with the drawn tick** (7.84) plus the done .10 row wash.<br>**The flash** is accent .16. The Coach pulse is v1's. **The drop rail** is pBlue .70 behind the drawn hook |
| `plateStrip` | v1 | "Per side" in `statLbl` (13 / 600 steel). Each plate a flat field in its plate colour, radius 2, its figures in page green, Manuale Bold (4.97–14.98), at v1's literal 10 pt until R-6 floors them at 11. "bar only" and "+x left over" as written |
| `calCell` | **ruled** | **A printed month:** 1 pt knurl hairlines between cells, no grounds.<br>**Day numbers** in Manuale 13: dim untrained, chalk 600 trained, with up to four 3 pt plate bars.<br>**Today** is boxed by a **2 pt accent keyline**, its number accent at 700: keyline and weight, never colour alone (ask R-8).<br>**The weekday letters** ("S M T W T F S", authored capitals) sit in `eyebrow` 13 steel |
| `chart` | **ink** | **Strokes:** single-ink, 1.5 pt lines, **no area wash and no glow** (ask R-9 on the web), square-topped bars on a shared origin, square-capped ring arcs, collar grids, dashed targets in chalk. Every chart label is 11 or more (steel).<br>**The calorie meter:** a square track (radius 2, `#2d3431`), the zones at .32, the eaten fill solid, the white head, ticks and dashed target (12.41).<br>The pinned module's paint and every data colour are kept |
| `dock` | **rail** | Opaque, **on the page's own green** (dockGlass rack 1), under a **2 pt knurl rule**. Five cells, Ledger's icons at 22 over 11 / 600 labels in dim.<br>**Active:** a **3 pt accent bar** across the cell's full width along the rule (ask R-8), icon and label chalk, the label at 700.<br>No blur. Height 64. The tabs, order and place never change |
| `fab` | **inverse** | A **cream slab**, radius 2, the + (2.6) and "Log food" as authored, in knockout Manuale 16 / 700, no shadow, at v1's place and size. Pressed keeps the cream and v1's .955 scale; the pink stays off it |
| `addTile` | **ruled** | **No tiles:** a two-column grid parted by 1 pt knurl hairlines.<br>**Icons** at 19 without wells, chalk; **Photo's camera in accent**, the sheet's one pink, so it stays the first the eye finds. The lit tiles' tag sits on raised (decision b).<br>**Text:** the title 16 / 600 chalk, the line 13 steel, the "ai" tag a 1 pt steel keyline with steel words (7.43).<br>**An off tile** stays visible at .4 |
| `sessionChrome` | **flat** | No glass, no shadows.<br>**The top bar** is opaque **bar** under a collar rule. It holds: the session name 16 / 600; the clock (`timer`, Manuale Bold 22, steel, tabular); the Coach chip (38, knurl edge, the drawn balloon and `COACH` in accent); the calendar button (38, knurl edge, the ruled leaf); Finish as the cream slab.<br>**The rest line** runs 3 pt, done, turning danger when over.<br>**The rest pill:** raised, knurl edge (3.28), round, no shadow. The time, +30, Skip.<br>**The peek bar:** raised, knurl edge, radius 4. Name, clock, Resume.<br>Every target is at least v1's |
| `youHero` | v1 | Avatar (52, round, raised) \| greeting \| gear, as v1 places them.<br>**The greeting** "Good evening, / Micah" is set in `youGreet`, **Archivo Condensed 34 chalk**. The name stays pink until ask R-1.<br>**The gear** is square (radius 2, bar ground, knurl edge, 36), drawn from Ledger's gear.<br>The sub-line 13 steel; "Member since …" 13 dim (a literal caps site until R-6) |
| `coachCard` | **flat** | **The lead box on You and Train:** bar ground, the 1 pt border in the ground's own colour, radius 4, **190 / 164, padding 14**. Its text in **Archivo on v1's metrics**. The drawn balloon and `COACH` in accent, the line chalk (warn for caution), the reason steel, the go row over a collar hairline, the lock drawn |

**Container roles (R6.1):**

| Role | What it is | How it is drawn |
|---|---|---|
| **lead** | the Coach card on You and Train; Fuel's summary, Weight's log and Steps' today | bar, radius 4 |
| **group** | the ruled cards on the page | rules, no fill |
| **callout** | "Next week" | the chalk .06 band |
| **sheet** | the platform sheet | bar, 18 pt top corners |

Only the lead has a fill; nothing has both a fill and a border. There is no same-fill nesting: every recess is the page.

---

## 7. The record-book devices: where each lands, and where it can't

| Device | Lands on | Honest limit |
|---|---|---|
| Drawn leaders (D4) | `settingsRow` and `listRow · ledger`: every name … value line | Drawn (SVG or View dots), never typed; a pseudo-element carries no character. **Not on stat rows** (`line`, for height) |
| Bold only the ranked column (D5) | Strongest lifts, rank, PR and PB rows: the figure 700, the name 400 | |
| Hanging numerals (D7) | The set number in the set table's 30 pt column, bare | A rank numeral hanging in a 28 pt column is an optional ask (R-10). `listRow · ledger` is also Meet Day's look. A date inside a string is never split |
| Heads hang from a rule (C3) | Sections (2 pt), cards (1 pt), exercises (1 pt) | The masthead is the one rule under a head: the book's running-head rule |
| Ruled lines | Set rows, the printed month, the add grid | Hairlines are knurl (muted), not cream, so the page reads as a ledger, not a newspaper (N12). One lead box per tab keeps it out of broadsheet cosplay |
| One colour, one meaning (E1) | Pink = here and now; cream slab = the thing to do; plates = data; green / amber / red = verdicts with their words or arrows | |
| Two sizes per block (A1) | Ledger lines 16 / 13; KPI 22 / 13; stat line 22 / 13; set table 17 / 13 | |

---

## 8. Every screen, covered

- **Sign-in and the gates** (web only; native keeps v1's sign-in):
  - the page green;
  - the six-plate mark in plate colours, radius 2;
  - "Rack" in Archivo Condensed 34 over a 2 pt knurl rule;
  - square knurl-edged fields;
  - "Sign in" as the cream slab;
  - links as underlined steel words;
  - errors in pRed (6.97) and success in green (7.84), each with its words.
  
  The invite, waiting and paused gates take the same: an h1 over its rule.
- **Onboarding (8 steps):**
  - the step kicker in `eyebrow` over the title in `h1` and its rule;
  - numbers steps in square fields;
  - progress as square pips, cream when done.
  - **Choice cards** (`.ob-choice`, no block): on the page with a knurl keyline.
    - **Web:** chosen = the cream inversion plus a drawn tick (`::after`, content '').
    - **Native** keeps v1's colour-only cue until ask R-5.
- **The tour:**
  - the flat veil (rack .92);
  - the tour card is a lead box (bar, radius 4) with v1's shadow;
  - the lit dock tab ringed in accent (`tourLit`).
  - The tip's 2 px stripe is v1 geometry no block reaches (R-4).
- **You:** §11.
- **Coach:**
  - **The sheet:** 92 % tall, "Coach" in h2 over its hairline. Rack's bubbles on raised, radius 2, chalk words; the ask bubble's 3 px accent stripe is v1 geometry (R-4). Topic and goal chips as `chip · tag`, the goal chips 44 tall; ▾ ▴ drawn.
  - **The live chip:** `sessionChrome · flat`.
  - **The nudge:** raised, radius 4, the drawn balloon and "Coach" in accent, chalk text, "×" as Manuale text at a 44 hit area.
- **Train calendar:**
  - the masthead ("Training log" / "September 2026", 2 pt rule, the two 34 pt plates);
  - the printed month;
  - the stat line;
  - the Coach card (164) as the lead;
  - Start workout as the full-width cream slab (17 / 700);
  - the week-volume chart in single ink.
- **Day sheet:** the date as the sheet title; exercise lines `plain`.
- **Live session:** §11.
- **Recap:**
  - the masthead (kicker, headline h1, line, date);
  - feel chips as tags, 44 tall;
  - Wins on its green rule;
  - PB rows as ledger lines, bold figures;
  - the session totals as a stat line;
  - the Wins head on its rule.
  - `rule.total` is drawn on neither client until native has a site (R-12).
- **Stats and exercise detail:**
  - PageHead as the masthead, with ‹ Back as text;
  - the 3 × 3 stats as three stat lines;
  - charts in single ink;
  - rank rows as ledger lines, bold only on the ranked value.
- **Picker, manager, custom:**
  - a square knurl search field;
  - Movement chips as tags, 44 tall;
  - exercise rows plain at 44 with ›;
  - chosen = the chalk .07 leaf plus the drawn tick.
- **Routines:**
  - routine rows plain;
  - the editor in the `setTable · ruled` idiom;
  - **+ Drop** as a ghost word;
  - drop sets under the drawn hook on the blue rail.
- **Fuel day:** §11.
- **Add food:**
  - "Add to" meal chips as tags;
  - the ruled add grid, with Photo's camera in accent;
  - Foods and Meals as underlined ghosts with the drawn book and cloche (web) and square count badges (accent, onAccent 10.82);
  - Cancel as an underlined ghost;
  - **the estimator notices** keep their warn wash and edge, with the **slip** `spark` (16 px, 1.6) in warn and the sentence as written. **No sparkle anywhere.**
- **Estimator:**
  - capture on black;
  - "Which one?" as tags;
  - proposed rows as ledger lines ("Chicken breast ……… 280");
  - the confidence dot with its word;
  - portions in square fields;
  - the − + steppers as Manuale glyphs;
  - the phase that cannot be dismissed, unchanged;
  - the estimate row stays in **Archivo**, as the engine pins it (`T.fit.archivo`).
- **Library and meals:**
  - library rows plain (name, per-serving line, the drawn ✎ and ✕ at v1's hit sizes);
  - the meal builder and ingredient sheet, whose add grid has the book as its accent icon;
  - totals as a stat line.
- **Barcode:** the camera on black; the result sheet in the vibe.
- **Water:**
  - a ruled card;
  - **v1's bottle** (knurl outline, pBlue water at .45 / .9, grip cap), whose level is a number (R1.4);
  - the total as a `loadNum` figure in blue (green at goal);
  - presets plain;
  - the web's × and native's drawn ✕ as each client has them today.
- **Weight:**
  - the masthead;
  - **the log lead box** ("Weighed earlier?" and its note, the square field, the cream Log button);
  - the stat line;
  - the trend chart ("the yellow line" is the 1.5 pt pYellow line, the dashed trend chalk);
  - maintenance "≈ 2,450" in `loadNum` (Manuale has ≈), chalk;
  - recent rows as ledger lines.
- **Steps:**
  - the masthead;
  - **the today lead box**: the ring with square caps, the big number green at goal with "goal met" in words;
  - bars in single ink;
  - the heat strip;
  - the 2 × 3 stat lines;
  - recent rows as ledger lines.
- **Settings hub:**
  - section heads in h3 on 2 pt rules;
  - ledger rows ("Units ……… lb ›");
  - **Look → Vibes** reading "Vibes ……… Ledger ›".
- **The Vibes sheet:** the sheet in the current vibe's tokens: "Look" (`eyebrow`) over "Vibes" (h2) on its hairline. Ledger's tile is as §5.
- **Admin (owner only):**
  - ruled You cards;
  - stat lines;
  - person rows plain;
  - flags in their roles (every flag ink ≥ 6.97 on the page, ≥ 5.51 on bar);
  - the AI-split and family bars as flat square segments;
  - ‹ Back as text.
  
  Legible, not dressed.
- **Toasts, the sync pip, the trial bar:**
  - toasts as §6;
  - the pip in its roles;
  - the trial bar a warn .10 wash with warn words (11.09).
  - Both keep v1's literal 9 px caps until R-6: a listed residual.

---

## 9. Icons (`vibes/icons/ledger.js`)

**The grammar is the ruling pen.**
- **Square caps and mitre joins.** Strokes are ruled straight or turned on a circle, every corner is square (rx 0), and nothing is filled.
- **v1's grid and v1's stroke per site:** 1.9 on the dock and the Coach marks, 1.8 on the add tiles, 1.7 on the calendar, 1.6 on the gear. The sites that fix their own stroke keep it: the FAB's + at 2.6, the notices' 1.6, and the web dock from its stylesheet.
- **No numeral, letter or date** inside any icon.
- **Every drawing is Ledger's own.** Meet Day ships v1's paths re-capped, and v1's gear and balloon are Feather's.
- **The contact sheet** (`design/ledger/final/icons-contact.png`, rendered by `icons-sheet.mjs`) shows every icon at 16, 22 and 48 px in chalk on the page green, and at 22 in dim as the dock sits at rest. It was read tonight.

| Key | Drawing |
|---|---|
| `you` | A head (a circle) over shoulders squared at 45° |
| `workout` | **A kettlebell**: a round bell, the handle squared at 45° and meeting the bell where its legs cross the circle. Judge 2 liked B's. A barbell would repeat v1's |
| `food` | A three-tined fork and a knife with a 45° point |
| `weight` | A platform scale from above: the body, the dial window as a half-disc on its rule, the needle |
| `steps` | Two soles a stride apart, each one outline: the ball on a circle, the sides ruled in to a narrower heel. **Not B's heel-ruled soles**, which read "00" at 16 px |
| `plus` | A Greek cross |
| `camera` | A square body, a square hump, a round lens |
| `pen` | A pencil at 45°, its ferrule ruled across |
| `barcode` | Six bars, two short |
| `keypad` | A square with nine square keys (square-capped points) |
| `book` | An open book, its gutter ruled |
| `stack` (Meals) | A cloche on its tray. Never three stacked lines (a menu icon) |
| **`spark`** | **A slip of paper tucked in the book**: corner folded, two lines ruled on it.<br>Both notices it marks are notes about the estimator. It reads at 16 px with the sites' 1.6 stroke.<br>Never a star, sparkle, asterisk or bolt (R8.8). Not a pilcrow (judge 2: "a pilcrow marks a paragraph … affected"), and not a circled i (judge 1: "reads as info") |
| `gear`, `gearYou` | One drawing: eight square teeth on an octagonal ring over a hub. **It replaces Feather's two gears** (the prompt §1 notes v1's gear is Feather's) |
| `calendar` | A leaf ruled like a ledger page: header rule, two rings, two ruled lines. **No date** |
| `bubble` | A square speech balloon with a 45° tail. **It replaces Feather's message-circle** |
| `lock`, `unlock` | A square body; the shackle squared at 45°. Only the shackle moves |
| glyphs drawn | `close` (a saltire), `more` (three square points), `check` (a ruled tick), `drop` (the hook), `edit` (the pencil), `gear`, `expand` / `collapse` (open chevrons), `warn` (a triangle, its bar and a square point) |
| glyphs as text (null) | `prev`, `next`, `back`, `go`, `dismiss`, `minus`, `plus`, `up`, `down`, `flat`: Manuale has every one |
| `vessel`, `ornaments` | None. v1's bottle stays (its level is a number), and a record book has no fleurons |

The shape was checked by `icons-sheet.mjs`:
- all 19 of v1's icon keys, and no extra;
- every v1 glyph key named;
- every element a path, circle or rect;
- square caps and mitre joins throughout;
- `spark` differs from v1's;
- frozen, and it imports nothing.

---

## 10. Textures

**None.** The look comes from rules, leaders and type. A texture would be costume (N12, and this slot's "no ornament, texture, photo"). There is no new motion: v1's ease-out 140 / 240 ms only.

---

## 11. Three screens, in words (390 pt, default text size)

**You.**
- **The top.** Bottle green; the sync pip at the top right. A round raised avatar "M". "Good evening," and "Micah" in tall, narrow Archivo Condensed 34, cream (the name pink until R-1). A small square gear edged in the rule green, drawn with eight square teeth. "Friday, September 25" in 13 steel.
- **The Coach card** is the screen's one box: a slightly lighter green slab with 4 pt corners and no outline. It holds:
  - the balloon mark and `COACH` in pink, with the lock at the right;
  - the finding in cream and the reason in steel, exactly as v1 fits them;
  - a faint line, then `COACH ME` in pink and a small ›.
  
  Under it: "Member since Aug 21, 2025 · 400 days".
- **How you're doing.** A 2 pt green-grey rule runs edge to edge, and "How you're doing" hangs under it in Archivo Condensed 22.
  - **Doing well** hangs from a 1 pt **green** rule, with its title in 13 steel and the ⋯ at the right. Its findings follow as text on the page: "Losing 0.9 lb a week" in Manuale 16 cream.
  - **Could improve** hangs from an amber rule.
- **Goal.** "0.9" in Manuale Bold 32, "lb / week down" beside it. Then a box-score line: "190.7 │ 182 │ Nov 30" in Manuale Bold 22, over "trend now │ goal lb │ at this pace" in 13 steel.
- **This week.** Four figures on a grid with no tiles. Each has:
  - "Calories" in 13 steel with a small round pill at the right, "↓ 350" in green;
  - "1,950" in Manuale Bold 22 with "kcal / day" in steel on its baseline;
  - "last week 2,300";
  - a line the width of a word, ending in a small square;
  - seven small dots with today ringed.
- **Strongest lifts** reads like the back of a record book: "Conventional Deadlift ……… **362 lb**", names in roman, figures bold, the leaders fine green dots.
- **The dock.** An opaque band of the page's green under a 2 pt rule. Over "You", a pink bar the width of the cell lies along that rule; its icon and label are cream, the label bold. The other four sit in grey-green: a kettlebell, a fork and knife, a scale, two soles.

**The live session.**
- **The top bar.** Opaque, one step lighter than the page. "Push day" in 16 / 600. "25:00" in Manuale Bold 22, steel, tabular. A square `COACH` chip with the pink balloon, the calendar button, and **Finish as a cream slab**.
- **Barbell Bench Press** has no card. A thin red group tag and the name in Manuale Bold 17 hang from a 1 pt rule, with the ⋯ at the right. Under it:
  - "Last · Sep 21 220×5 220×5 220×5" in 13 grey;
  - "Set lb Reps e1RM" in 13 steel over a rule.
- **Each row is a ruled line:**
  - a bare yellow "W", or "2" in steel, hanging in its column;
  - "95" and "8" in Manuale Bold 17, each sitting on a short green rule;
  - "216" in grey;
  - a square check box with a green-grey edge.
  
  **A done set** fills the check green with the drawn tick, and the row takes a faint green wash.
- **Per side.** "1×45" on vermilion and "1×25" on yellow, in page-green figures.
- **Resting.** A raised pill with a green-grey edge above the dock: "1:32", "+30", "Skip". Above it, the peek bar with the exercise name, the clock and a cream "Resume".

**Fuel, today.**
- **The masthead.** "Fuel" in 13 steel over "Today" in Archivo Condensed 34, a 2 pt rule under both, and the square gear, ‹ and › plates at the right.
- **The lead box**, a lighter green slab, holds:
  - "**350**" in Manuale Bold 40 in the cut blue, with "kcal left today" in 13 steel;
  - the calorie bar on a near-neutral track: the blue zone, pale ticks, the white head and the dashed target;
  - "Cut", "Target" and "Hold" under it, as typed;
  - three macro lines, each a name, a square-ended meter in its plate colour, and "142/200" in tabular figures.
- **Meals** follow as ruled periods. A 1 pt rule, then "Breakfast" in 13 steel and "520 kcal" at the right with the ⋯. Then "Oats with whey ……… **520**", with "1 bowl · P 42 C 60 F 11" in 13 grey under the name.
- **Log food.** A square cream slab holding "+ Log food" in green, 14 above the dock. No shadow, no pink.

---

## 12. What it never does

**From research track 1 and the synthesis:**
1. No tracked ALL-CAPS label, eyebrow, stat label, field label, dock label, set head or unit. The only capitals are strings typed that way. The literal caps sites no look reaches wait on R-6: they are listed residuals, never new ones.
2. No text under 11 pt that a Ledger preset or look sets, chart labels included. v1's literal sub-11 sites that no Ledger look reaches (the plate chip's 10 pt figures, the literal caps labels) are listed under R-6 as residuals.
3. No grey text under 4.5:1, and no fourth, fainter grey.
4. No box around every section. One lead per tab, and never a box inside a box.
5. No stat tiles, and no row of three identical tiles.
6. No new pill. The KPI delta keeps its pill only because the copy names it (you.js:802). Every delta keeps its sign and its arrow.
7. No coloured side stripe that a block reaches. Wins, Improve and PR move to the head rule. The two v1 stripes no block reaches wait on R-4.
8. No gradient wash, corner glow, coloured glow, area fill under a line, or glass beyond the sheet backdrop.
9. No gradient on a PR card or row.
10. No accent on a button, on data, or as a wash behind words. No hue shared by the accent and a data or status colour.
11. No one word of a headline in another colour or weight. The greeting's name stays pink only until R-1.
12. No sparkle: `spark` is a slip. No emoji, no icon in a tinted circle, no stock icon set, no Feather drawing.
13. No monospace for figures or labels, and no face from the AI-default or Claude-steered lists.
14. No count-up, entrance, fade or overshoot.
15. No typed leader characters: every leader and rule is drawn.
16. No split date string, no added month head, no added figure.

**From the slot's "must differ" list (Iron Age, Meet Day):**

17. No thick-thin, double or Oxford rule.
18. No caps or small-caps heads.
19. No italic, running heads included.
20. No ornament, tailpiece, dinkus, manicule or engraved icon.
21. No paper grain, halftone or photo.
22. No stamped keyline plates for chips, figures or the live bar.
23. No scoreboard, board strip, panel band, inversion used *as* the accent, condensed figures or split-flap. The condensed cut sets heads only, never a figure.
24. No cream page.

**From Micah's rules:**

25. No changed word or number; no gate; no data change.
26. No face with a Reserved Font Name, subset or renamed, unless Micah approves D-1.

---

## 13. How it differs

| From | Ledger is… |
|---|---|
| **v1** | Graphite, one yellow, bordered 12-radius cards and a wide stamped sans, against green and cream, a serif for every word and figure, one lead box per tab, and heads hanging from rules. v1's labels are tiny tracked caps; Ledger's are sentence case at 13. v1 has three-tile stat rows; Ledger has a box-score line and leader rows. v1's primary is yellow; Ledger's is a cream slab. v1's icons are round-capped Feather-style; Ledger's are ruled. The ground is a different hue family |
| **Iron Age** | It shares `card · ruled`, `settingsRow · ledger`, `calCell · ruled`, `dock · rail`, `btn · inverse`, `fab · inverse` and `addTile · ruled` as geometry, in opposite materials. Iron Age is ink on cream; Ledger is cream on green. Iron Age sets Besley heads with small caps; Ledger sets sans heads in sentence case. Iron Age's Oxford rules sit below heads; Ledger's single rules sit above them. Ledger has no texture, photo, ornament, italic, stamps or engraved icons. The rest differs: statRow (line against folio), chip (tag against stamp), segmented (tabs against boxes), chart (ink against print), sessionChrome (flat against plate), plateStrip (v1 against stamp), coachCard (flat against ruled), toast (strip against square), sheetHost (the platform's against full) |
| **Meet Day** | No board, panels, bands, lamps, gutters, condensed figures, rearranging or inversion accent. They share the ArchivoCondensed-Bold file, for heads here and bands there. Ledger's icons are its own, not v1's re-capped |
| **Oxblood** (dark, warm chromatic) | Oxblood keeps v1's layout, with a cold light accent on maroon. Ledger redraws every block on green |
| **Navy** (dark, chromatic) | v1's layout on blue in Overpass, against ruled green in a serif |
| **Clear sky** (the other deep) | Light, open and calm, with Archivo and no rules, against dark ruled columns with leaders and a serif. They share `kpi · word`, `setTable` / `setRow · ruled` and `card · ruled` geometry, in opposite palettes and faces |
| **Chalk** | Light, v1's layout, sans; Ledger is none of those |

**The generic-prompt test (R10a).** Would "a dark fitness tracker" produce this? No. Nothing in it is what that prompt returns:
- green book cloth;
- a serif record figure;
- condensed heads hanging from rules;
- drawn leaders;
- ranked bold;
- one pink ribbon;
- a cream primary;
- no cards.

**The Claude-look risk, named.** Claude's own dark UI is a serif on a warm near-black with a clay accent.
- Ledger is a serif on a *green* ground with a *pink* accent.
- It has no italic and no editorial display serif; its display type is a condensed gothic.
- A judge may still read "serif on dark" as editorial. The leaders, the ranked columns, the ruled set rows and the one lead box per tab are what should break that.

---

## 14. Asks of the engine (what v2 cannot express)

Nothing in the definition depends on these to be correct. Each ask names what Ledger does until it lands.

| # | Ask | Until then |
|---|---|---|
| **R-1** | A role for the greeting name's ink (`youHero`), defaulting to `accent` so v1 is unchanged. Ledger sets `chalk`: one ink in a headline (N17, R5.4). Clear sky and B asked the same | The name stays pink on both clients: a P1 tell for Q |
| **R-3** | **A toggle-knob role**, e.g. `colors.knob` with `or: 'colors.steel'` so v1 is unchanged, spent at native `coach/settings.jsx:139` (`thumbColor` when off) and web `.tog::after`. Ledger sets `chalk`: 3.24 on grip, where steel is 2.01 against v1's 3.80 | The web stylesheet re-inks `.tog::after` (scoped). Native's off knob is 2.01: a known gap for Q |
| **R-4** | A hook for the two side stripes no block reaches: the Coach ask bubble (web `rack.css` `.coach-bub`, native `coach/sheets.jsx:468`) and the tour tip (`auth.css:239`, native `TourOverlay.jsx:105`). Ledger would draw a 1 pt accent rule above the bubble or tip | v1's stripes, in Ledger's accent: a listed residual |
| **R-5** | A non-colour chosen cue for onboarding's choice cards on native | Web: the cream inversion plus a drawn tick. Native: v1's colour-only cue |
| **R-6** | **The literal-caps switch** (Chalk's §739 ask, shared). Where a vibe's presets carry `upper: 0`, the literal caps sites drop their transform and tracking and floor at 11: MiniStats' labels (8.5 pt under `statRow · line`), ChartSub / `.chart-sub`, `.you-since`, the sync pip, the trial bar. It also points Section / Sec and the KPI label at their presets, and floors the plate chip's literal 10 pt figures at 11. v1 is off | Those sites keep v1's case and size in Manuale on both clients (parity over flourish). The worst residual is the 8.5 pt mini-stat labels. (`statRow · folio` is deep-graded and, as Iron Age specified it, re-sets them. It would cure them if the engine's folio does, at the price of two more hairlines per row. Not chosen, for rule density) |
| **R-7** | Confirm that `sectionHeader · rule` sets its title in `type.h3`: Iron Age's and B's reading, and Clear sky's `plain` literally | If the engine uses the eyebrow's literal arguments, section heads are 13 / 600 steel under their 2 pt rule. Still true, but less of a head |
| **R-8** | Confirm that the drawn cues are in `accent`: `dock · rail`'s 3 pt bar, `segmented · tabs`' underline and `calCell · ruled`'s today keyline. The vocab names their shape, not their colour | If the engine picks chalk, each is still a non-colour cue, and still true |
| **R-9** | `chart · ink` on the web hides the pinned `lineChart` area (analytics.js paints it) with a scoped stylesheet `fill: none`, and draws square caps | The web keeps an area wash: a parity gap Q will see |
| **R-10** (optional) | `listRow · ledger` hangs a leading rank numeral in a 28 pt tabular column (D7). **Meet Day names the same look**, so it changes Meet Day's rank rows too | Rank numerals stay where v1 prints them |
| **R-11** | `kpi · word`, with its pills kept, re-sets the pill's literal 11.5 / 10 px delta type to 13 / 700 (the deep grade allows it; R4.2's floor is 11) | The pill text is v1's 11.5 / 10 px in Manuale: the arrow under the 11 floor |
| **R-12** | A native site for `shape.rule.total` (the recap's session totals, the estimator's total; B's E8) | Drawn on neither client (Ledger sets `total: [1]`) |

---

## 15. Decisions left to Micah

- **D-1 · The text serif.**
  - Built: **Manuale** (no RFN; measured tonight, but a spec-stage pick, not one of research track 5's).
  - A's original: **Source Serif 4, shipped renamed "Ledger Text"** under OFL §3.
    - Its RFN "Source" is confirmed in upstream `LICENSE.md`, `METADATA.pb` and name ID 0.
    - A's `rename.mjs` rewrote the name table; the rename is written and checked in `design/ledger/scratch-A2/`.
    - It needs his ruling on PLAN rule 6 / R4.7 ("no RFN on anything subset") and a §13.7 checker told to accept it.
  - Either way, the device set is the same.
- **The Coach card's face.** Built: Archivo on v1's metrics (decision d). The alternative is Manuale with its own advance table from the shipped TTFs (§4.4). That puts the lead box in the vibe's face, but it is unmeasured.
- **Q-P4 · Pink for Rack.** The devices are the slot; the ribbon can change. Any replacement must re-run `contrast.mjs`: guard ≥ 5 on v3, ≥ 10 ΔE00 from data, group CVD ≥ 12.
- **The kettlebell for Train** (and the scale for Weight) in place of v1's barbell and trend line.
- **Judge 1's "square radius 2" pill.** Not taken: a radius-2 tag is not a pill, and you.js:802 calls it one. Ledger keeps the pill round.
- **The name and feel line** ("Ledger", "Ruled columns on club green.") are working copy.

---

## 16. The losing concept: B, "The Swiss programme" (Micah may swap it in)

- **The idea.** Rack as a modernist club programme:
  - Archivo only (v1's face), heads in Archivo Condensed Bold;
  - a Gerstner 58-module grid, flush left and ragged right;
  - a 2 pt **cream** rule opening each section and a ½ pt rule opening each item;
  - two type sizes to a block (13 / 17 / 34, with 68 on request);
  - 800 on figures only.
- **The palette.** The same club palette, with the four measured moves this spec grafted: bar `#1c2d23`, dim `#9ca38d`, pRed `#ff7856`, and the near-neutral track `#2d3431`.
- **The blocks.**
  - `coachCard · ruled`: no ground, only cream rules above and below. So You and Train have no box at all.
  - `statRow · line`, `listRow · plain`, `settingsRow · v1`, `calCell · open`, `youHero · stacked`, `headline · rule`.
  - No leaders anywhere.
- **The icons.** Its own set, generated on a 0 / 45 / 90° grid: a kettlebell, a dial scale, heel-ruled soles, a cloche, and a circled-i `spark`.
- **Scores.** 69 against A's 77.
  - **For it:** the most buildable (0 web bytes, +1 TTF, the Coach card on v1's metrics, a passing contract probe of 521 checks) and the most careful colour work. It kept every copy guard.
  - **Against it:** distinctness 5 (v1's face, with condensed heads shared with Meet Day), and an "AI-made" score of 5–7. Both judges named the tells: boxless You and Train tabs (broadsheet cosplay, R6.10), v1's face on a Swiss grid, and 8.5 pt tracked caps left in place.
- **Where it lives.**
  - Its pure definition and icon set: `design/ledger/concept-B/probe/vibes/`.
  - Its checks: `tools/ledgerB/`.
  - Its spec: `design/ledger/concept-B.md`.
  - To swap it in, publish its definition as `ledger.js` and its icons as `vibes/icons/ledger.js`. The registry entry is the same.

---

## 17. Checks run, files, sources

All the scripts are read-only on both app trees. They live in `~/dev/vibes-night/tools/ledger-spec/` unless noted.

| Command | What it established |
|---|---|
| `node def-check.mjs` | Every one of v1's 486 leaf paths (a list counted as one leaf) is set in `ledger.js`. No LEGACY_EXACT spelling. Every colour 6-digit. The meta roles set. Frozen, and imports nothing. **612 / 612** |
| `node contract-check.mjs` | All 298 ROLES entries resolve through `valueOf()` to a value of their kind, with references naming colour roles. Every look is accepted by its block at a deep-allowed grade. Fixed roles are v1's. Every `follows` table equals its role. Every preset, and a literal at every weight, draws a registered face (4 TTFs). The web font families start with "ledger". HUE_NAMED holds. **719 / 719**. A canary (pBlue made pink) fails 4 |
| `node probe.mjs` then `VIBES_CONTRACT_DEFS=~/dev/vibes-night/design/ledger/final/probe node wt/web-design2/tools-check/vibes-contract.mjs` | The web contract verifier with Ledger registered in a **probe copy** (the worktree's `index.js` untouched): **"All checks passed. 521 checks."** The canary probe fails 4 of 521 |
| `node contrast.mjs` | §3.4–3.5, written to `design/ledger/final/contrast.txt`. 0 failures |
| `node measure.mjs` | §4.2: every width against v1's at the same site, the header rooms at 320, the dock cell, glyph coverage, hhea |
| `node heads-cut.mjs` | The `ledger-heads.woff2` cut and its parity with the native static |
| `node ../ledger-final/webcut-check.mjs` | The Manuale web cut: wght 400–800, Rack's characters all present, tabular digits at 400–800, parity with the statics |
| `node ../t5-check.mjs <ttf…>` | The four native statics: PostScript names, weight class, tnum uniform (502 / 507 / 510; 482) |
| `node icons-sheet.mjs` | The icon set's shape against v1's, and `design/ledger/final/icons-contact.png` |
| `node lineup.mjs` | The faces, grounds and looks the rest of the lineup has claimed |

**URLs downloaded tonight** (with `tools/fetch.mjs`, all on §14's hosts):
- `https://raw.githubusercontent.com/google/fonts/main/ofl/manuale/Manuale%5Bwght%5D.ttf`, `…/OFL.txt`, `…/METADATA.pb`
- `https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/Archivo%5Bwdth,wght%5D.ttf`, `…/OFL.txt`, `…/METADATA.pb`
- `https://fonts.googleapis.com/css2?family=Manuale:wght@400;600;700` (a TrueType user agent) and the three `fonts.gstatic.com/s/manuale/v31/…ttf` files it names
- `https://fonts.googleapis.com/css2?family=Manuale:wght@300..800&display=swap` and its Latin woff2 (for reference)
- `https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75,700`: its `fonts.gstatic.com/s/archivo/v25/…` URL matches the one B downloaded and cut

**Provenance note.** The Manuale cut and its specimen were made by an earlier, interrupted run of this same job (`tools/ledger-final/`, `design/ledger/final/`). Tonight's re-fetch reproduced every source sha256 it recorded, and `webcut-check.mjs` re-proved the parity.
