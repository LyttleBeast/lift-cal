# Vibes: the slot plan

V59 Phase D, slot plan — 2026-09-27. For the concept agents (three per slot), the judges, and the orchestrator.

This page assigns the seven new slots. For each slot it gives the final id, the working picker name and feel line, light or dark, the direction research chose, three concept angles (one per concept agent), and what the slot must differ from. It rests on:

- `research/SYNTHESIS.md` (cited as C1–C30, R0–R10, Q-…), and the tracks it cites (cited `[T1]`–`[T10]`);
- `design/VOCAB.md` (the blocks and looks: `card · ruled` means the `ruled` look of the `card` block) and `design/ROLES.md` (every token role);
- the prompt's §1, §2, §9–§14.

Nothing here is approved. Names and feel lines are working copy for Micah. Hex values are research's, already run through track 4's checker; a concept that changes one re-runs `tools/colour/try.mjs` and says so.

---

## 1. The lineup

Registry and picker order: v1 first, then Iron Age, the three simple vibes, the two deep vibes, and the experimental vibe last [T10 §4.8].

| # | Slot | id | Picker name | Feel line (≤ 28 chars) | Kind | Ground | Research base |
|---|---|---|---|---|---|---|---|
| 1 | — | `v1` | v1 | The original Rack look. | — | dark | unchanged |
| 2 | iron-age | `iron-age` | Iron Age | Ink on cream, circa 1900. | deep + art | **light** | IA-1, cream stock, madder carmine, Besley v4 + Archivo |
| 3 | simple-1 | `chalk` | Chalk | Chalk-white page, dark ink. | simple | **light** | S1-a, `chalk-r2`, Sofia Sans |
| 4 | simple-2 | `navy` | Navy | Deep navy ground, pale ink. | simple | dark | S2-a, `navy-r2`, Overpass |
| 5 | simple-3 | `oxblood` | Oxblood | Oxblood and ice blue. | simple | dark | S3-a, `oxblood`, Schibsted Grotesk |
| 6 | deep-1 | `ledger` | Ledger | Ruled columns on club green. | deep | dark | D1-a, Ledger on `club` |
| 7 | deep-2 | `clear-sky` | Clear sky | Pale sky, open and calm. | deep | **light** | D2-a, Clear sky on `deep2-sky` |
| 8 | experimental | `meet-day` | Meet Day | The platform on meet day. | experimental | dark | MD-1 |

- **3 light, 5 dark**, as research built it [T4 GF6]. Light is allowed (§1 decision 5).
- **Ids name the design, not the palette,** where the palette is still Micah's call: `ledger` survives a swap of Club's pink (Q-P4), and `clear-sky` is track 3's name for the device set as much as for the page [T3 §7].
- **Names**: ≤ 16 characters, no "·", never "Dark mode" or "Light mode", no "New" [T10 §4.10, §5; T9 I1]. Each is one or two plain words from the vibe's material or object, like "v1" is plain.
- **Feel lines** are re-cut after the panel if a runner-up angle wins and the line stops being true (a wrong sentence is worse than none). Chalk, Oxblood, Ledger and Meet Day hold for all three of their angles; Navy's and Clear sky's were written to hold too.

---

## 2. Rules every concept agent works inside

These are not choices. They come from the prompt, SYNTHESIS §3–§4, VOCAB §3 and ROLES.

1. **Look, never content.** Every word and number identical; `text-transform` may only lower caps on strings authored in sentence case; `'COACH ME'` stays caps; no lowercase transform [R1.1; T1 §0.2].
2. **What a kind may touch** [R0; VOCAB §2]:
   - **simple**: colour roles, faces, type-role tokens (size, weight, width, case, tracking), radius and border weight per role, fill per surface, and `shape`-grade looks only (`flat`, `plate`, `line`, `plain`, `square`, `tag`, `boxes`, `outline`, `solid`, `open`, `tile`). No drawn devices, textures or images.
   - **deep / Iron Age**: everything, plus `deep`-grade looks, rules, leaders, bands, textures and an icon set. Same boxes in the same order. Iron Age adds images.
   - **experimental**: everything deep may, plus reordering, merging and splitting boxes within a screen. Never the dock's tabs, order or position; never a feature or control added or hidden.
3. **Contrast** 4.5:1 for text (3:1 at ≥ 18pt or 14pt bold) and 3:1 for control edges and graphics, on every surface a colour actually sits on, including a look's own bands and inverted cells [R2.1–R2.3; prompt §13.1]. Never round up.
4. **Colour-vision**: six group colours with worst pairwise ΔE00 ≥ 12 under normal, deuteranopia and protanopia; good against bad survives CVD on its own; every up/down keeps its arrow or sign [R2.5–R2.6].
5. **The accent has one job** and sits ≥ ΔE00 10 from every data and status colour; accent and chromatic grounds sit ≥ 5 from all 242 Tailwind v3 defaults [R2.4, R2.7]. No indigo/violet 240–295°, clay, emerald/teal, or lime/cyan/vermilion/amber/orange on near-black [never-do 2].
6. **Type**: at most two families per vibe, counting Archivo if the Coach card keeps it [R4.1]. Nothing under 11pt [R4.2]. Tabular figures proven in the file that ships (`tools/t5-check.mjs`) [R4.3]. Web: variable with `wght` reaching ≥ 800, weight only through `font-variation-settings`, self-hosted latin woff2 ≤ 120 KB per family. Native: ≤ 4 static TTFs per vibe, picker face included, unique PostScript names. OFL with no RFN on anything subset [R4.4–R4.7]. A face without → ↑ ↓ never sets an arrowed string [R4.6]. No face from the AI-default or Claude-steered lists, no monospace for numbers or labels [R4.10].
7. **Each face family ships in one vibe only** [T5 §0]. Archivo is the exception, because it is the Coach card's face. If two slots' winners claim one family, the orchestrator gives it to the slot whose panel scored it higher on "fits Rack" and readability, and the other slot takes its best runner-up face.
8. **Labels and case**: sentence case as authored, 12–13pt and up, weight 500–600, ink at 4.5:1; caps in at most 2 roles, tracked 0.05–0.12em, never on a unit [R5].
9. **Containers**: at least 3 container roles (lead, group, callout, sheet); no same-fill nesting; stat rows never boxed tiles (in deep vibes; in simple vibes `statRow · line` or v1); no coloured side stripes; no delta pills; one hero numeral per screen [R6].
10. **Surface and motion**: no gradient washes, glows (Meet Day's 6px lamp glow excepted) or glass beyond the dock, the workout bar and the sheet backdrop; textures static and code-made from a recorded seeded script, never under body text; no new motion [R7].
11. **The Coach card** stays 190 / 164 with padding 14 and border 1; a vibe that changes its face supplies an advance table generated from the native TTF that ships, otherwise it keeps Archivo on v1 metrics [prompt §6.6; R4.1; VOCAB coachCard].
12. **Touch targets** stay ≥ 44, and those v1 draws smaller keep at least v1's size (set check 30, live chip and calendar button 38, You gear 36, month and day buttons 34); enlarging one is Micah's (Q-M5) [VOCAB §3 rule 4].
13. **Light vibes**: web paints a dark `band` strip under the status bar (white on it ≥ 4.5) and the workout bar's top band stays dark; native sets `StatusBar` dark and keyboards and date pickers light; system alerts stay dark [R3.3; prompt §10; T4 §4].
14. **Icons**: every non-v1 icon set defines `spark` as a neutral mark — not a star, sparkle, asterisk or bolt — readable at 16px with a 1.6 stroke [R8.8; T1 N27]. **This binds the simple vibes too**, because `iconIn()` falls back to v1's sparkle. A simple vibe's set is v1's icons plus a neutral `spark` and nothing else; one shared set (for example `vibes/icons/plain.js`) can serve all of them (judgement; orchestrator's call).
15. **Roles research asked for that v1.js lacks** — `lead`, `band`, `caution`, a figure face, the `shape` params — a concept that needs one names it as a request, never as an invented key [ROLES "What binds"; VOCAB §9].
16. **The two tests** before a spec is final: the generic-prompt test for every slot, and the silhouette test for the experimental slot [R10].

---

## 3. The slots

### 3.1 iron-age — Iron Age (deep + art, light)

**Direction.** Light cream, not dark ink: every 1880–1930 reading and recording surface track 7 opened is ink on cream, halftones and engravings are ink on paper, and the ground sits 84 ΔE00 from v1's [T7 §10; SYNTHESIS §5.6]. Palette `iron-age-cream-r2`: stock `#ede3cc` (or r2g `#e6dec9`, Q-P3), ink `#1c1712`, madder carmine `#a1374f` once per screen, and CVD-built plates (Indian red, Prussian, ochre, viridian; worst group 12.6) [T4 GF2–GF3; C12, C13, C30]. Type is upstream Besley v4 for heads and the one hero figure, and Archivo for body, table values, every arrowed string and the Coach card on v1 metrics [C11, C28]. Structure comes from measured brass rules rather than cards, the §11 textures from measured recipes (grain, rule bleed, the ink-on-stock duotone), and photos are Tier A only, single-ink, under a stock scrim, as 4-bit PNG, with none on the Coach card [T7 G.2–G.4; T8a H.2–H.7; C24, C25, C27].

**Fixed for all three angles.** Cream stock, ink, madder once per screen, radius 0, the icon set on a 24 grid with a 1.5 ink stroke and the Polhemus manicule as `spark` [T8b G3], no photo on the Coach card, empty photo slots close up [C14], no CSS `sepia()`, no faked age, no wood type, no "EST." badges, no drop caps, no centred data [T7 §9; never-do 30]. Caps heads are a declared exception (Q-Q1): ≤ +0.12em, 13pt+, ink at 7:1 [C10].

**Angles.**
1. **The manual page.** Model: the *Physical Culture* 1908 editorial page and Sandow's 1897 manual body pages [T7 §1, §6.1, §8]. Besley caps section heads sitting on the Oxford rule (`card · ruled` with `shape.rule.head [3, 2, 1]`, place below; `sectionHeader · rule`), a masthead screen header, stat rows as folio lines between hairlines (`statRow · folio`), the one hero figure as a challenge line with its unit on the baseline (`headline · rule`), italic running meta on the web, a dinkus tailpiece as the one ornament. Photos lead: every hero slot the crop rules allow, as halftone plates like a frontispiece. Faces: Besley v4 + Archivo (IA-1).
2. **The measurement form.** Model: the 1898 *Measurement Form*, ATF 1912's brass-rule series, the Fairbanks 1919 nameplate [T7 §4, §8; T3 D4]. The app as a ruled record: leader rows everywhere a name meets a value (`listRow · ledger`, `settingsRow · ledger`, `statRow · ledger` or `folio`), caps or web small-caps column heads over a rule, a double rule above totals, stamped nameplates for chips, the plate strip and the hero figure (`chip · stamp`, `plateStrip · stamp`, `headline · stamp`), a printed calendar (`calCell · ruled`), underlined fields. The challenge figure in Archivo wdth 62–75, track 7's alternative, which costs one condensed native static [T7 §6.3]. Photos in the fewest slots that carry the most room; grain `fresh`.
3. **The apparatus catalogue.** Model: the gymnasium-apparatus and scale catalogues (Spalding c. 1891, Sears, Fairbanks 1867 and 1919) whose engraved "cuts" of objects in profile are the traced icon sources [T8b §1, G3; T7 §7.3]. The engraved icon set is the signature: add tiles as a ruled grid of cuts (`addTile · ruled`), one traced object (dumbbell, club, rings, expander) as the screen's single ornament, hairline-boxed captions as the period's caption idiom, engraved and no-people frames first among the photos (`gym-naval-academy`, `gymnase-triat-desbonnet-1911`). Faces: Besley v4 + Old Standard TT as the reading face (IA-2), so the Coach card moves to Old Standard with its own advance table [T5 §5.3; R4.1].

**Must differ from.** v1 (graphite, one yellow, rounded bordered cards). Meet Day, its opposite pole: they share only the plate hues and the Coach card's Archivo [T6 §2, §4]. Ledger, which also uses rules and leaders: Iron Age owns the period faces, thick-thin Oxford rules, caps and small-caps heads, ornament, textures, photos and engraved icons. Chalk and Clear sky, the other light vibes: cream stock, never a cool page. The AI cream cluster: stock outside the R3.5 band, no clay accent, no high-contrast Didone display [R3.5; C13].

**Micah's calls in this slot.** Q-P3 (stock r2g or an exemption), Q-P6 (madder or a louder red), Q-I1–Q-I13 (grain preset, gating, bleed as PNG or vector, the tone map as "sepia/duotone", named subjects, delivery as PNG, the Coach and Start-workout photos, Tier B items, icon picks), Q-Q1 (caps heads).

### 3.2 simple-1 — Chalk (simple, light)

**Direction.** The lineup's one light simple vibe: a cool chalk-white page (`#e8ebeb`, card `#f8fafa`, ink `#111416`), 86 ΔE00 from v1's ground, where positive polarity helps small labels [T4 R13, §3.2; SYNTHESIS §5.1]. Palette `chalk-r2`: print-dark plates (chest `#8f1117`, back `#1c4aa8`, legs `#8a6b00`, shoulders `#056a50`, arms ink, core slate) and mulberry `#6c3058`, the one accent family that cleared every gate (9.56 from `pink-900`, 23.3 from its nearest data colour; 0 failures, worst group 13.7) [T4 GF4; C3]. Its distance from the AI look comes from sentence-case labels at 13pt and up, a box-score stat line in place of tiles, surfaces told apart by value, and a face that is not Archivo [T1 §0.5, D5–D6; T3 C1]. Web keeps a dark `band` (`#111416`, white on it 18.49) under the status bar; native goes dark-status-bar with light keyboards [T4 §4].

**Fixed for all three angles.** `chalk-r2` and mulberry (the rejected families, deep green, olive, blue and violet, stay rejected [T4 GF4]); the near-white grounds sit 0.8–1.9 from Tailwind greys, so type and accent carry the identity [T4 §3.2].

**Angles.**
1. **Soft technical sans.** Sofia Sans for everything, Sofia Sans Condensed for h1–h3; "early-twentieth-century technical sans … soft round corners" [T5 §5.1]. The lead card flat at radius 6 (`card · flat`), groups on the ground with 1px collar separators, `statRow · line`, `kpi · plain`, pills kept on chips and segmented controls, knurl input and ghost borders. Web 48.8 + 49.7 KB; native SofiaSans-Regular, -Bold, -ExtraBold, SofiaSansCondensed-ExtraBold (picker face SofiaSans-ExtraBold). Research's pick (S1-a).
2. **Printed plan, square.** Vollkorn ("dark and meaty serifs"), web `wght` 400–900 at 68.8 KB, native Regular / SemiBold / Bold / ExtraBold [T5 §5.1]. Square shape tokens throughout: `card · plate` (radius 2, knurl keyline), `btn · square`, `chip · square`, `segmented · boxes`, `field · square`, `toast · square`. The cool ground is what keeps a light serif out of the cream-plus-serif cluster; it must never drift warm, and no clay [T1 N3]. Web headings run 18% wider: check fit at 320 [T5 §5.1]. Vollkorn may win here or in Oxblood, not both (§2 rule 7).
3. **Legibility first.** Atkinson Hyperlegible Next for text and labels, Archivo for figures, deltas and every arrowed string (the new face lacks → ↑ ↓) and the Coach card on v1 metrics: two families [T5 §5.1 rank 8; R4.6]. The reason is the page: chalk-white in gym glare, labels at 13–14pt 600, the highest label contrast in the lineup. Open shapes: `calCell · open`, `dock · solid`, `sessionChrome · flat`, `addTile · flat`, no fill on anything but the lead card. Its native statics are unverified: they must pass `t5-check.mjs` and the PostScript-name check before the spec is final [R4.3, R4.5].

**Must differ from.** Clear sky, the other cool light vibe: Chalk is near-white with a red-violet accent and keeps v1's boxes; Clear sky is sky-blue, prussian and unboxed. Iron Age: cream, serif caps, ruled. v1. Meet Day's paper attempt cards, if Meet Day angle 2 wins: they borrow Whiteboard's surfaces, about 1 ΔE00 from Chalk's (C9) [T4 §3.3].

**Micah's calls.** Q-P1's swap (mulberry to Clear sky, deep green here, with its "good" collision).

### 3.3 simple-2 — Navy (simple, dark)

**Direction.** A dark chromatic ground instead of a stock grey: navy `#0a183b` with bar `#0f223f` (`navy-r2`), which clears all 242 Tailwind v3 defaults (5.19 / 5.09), with warm-white ink and bright re-toned plates, worst group 13.2 [T4 GF5, §3.2; T2 §1 item 5]. The accent is open (Q-P2): pistachio `#acdc9c` is the checker's proposal, camel `#bd977b` and old rose `#cb7b7e` the alternatives, and gold is out because it reads as "v1 on blue" [C4; T4 GF5]. Overpass, the US highway-sign alphabet, is research's face [T5 §5.1]. Its main risk is sitting only 15 ΔE00 from v1's ground, so the face, the accent and the label typography carry the difference [T4 §3.3].

**Fixed for all three angles.** `navy-r2` ground, bar and inks; no gold, yellow or amber accent; margins against `blue-950` are thin (0.1–0.2), so any hex move re-runs the guard. If the guard binds Tailwind v4, the bar moves to `#041f3e` or `#1d2340` [T4 GF11].

**Angles.**
1. **Highway at night.** Overpass for everything [T5 §5.1], pistachio `#acdc9c` (pressed `#9bca8b`): the reflective-sign read of a pale bright mark on a dark field (judgement). Lead card radius 10, filled, no border (`card · flat`); groups on the ground; the "Next week" callout loses its box for a 2pt knurl top border [T1 D4]; bold Overpass heads, labels sentence case 13pt SemiBold. Watch pistachio beside sea-green "good" (15.9 / 15.3 / 10.9 apart). Research's proposal (S2-a).
2. **Kit bag, squared.** Overpass with camel `#bd977b` (13.17 from its nearest default, text 6.53 / 5.96): a quiet, tailored accent (judgement). Square tokens: radius 2 on cards and buttons, `card · plate` in knurl, `chip · square`, `segmented · boxes`. The concept must prove camel reads as an accent at OKLCH C 0.06, or step its chroma up with the checker and report the move [T4 GF5].
3. **Width-true.** Saira, whose width axis the web honours, so headings stay exactly in their boxes (h1 0.87×A, load-num 0.94×A) [T5 §5.1]; old rose `#cb7b7e` (text 5.53 / 5.05 on r2, 17.2 from Club's pink). Native: Saira-Regular, Saira-SemiBold, SairaCondensed-ExtraBold, SairaSemiExpanded-ExtraBold from **upstream** (the google/fonts condensed directories carry a 2016 RFN) [SYNTHESIS §5.9]. hhea 1.574 inflates line boxes: the concept states its `minLh` and checks the Coach card [R4.9]. Saira here is not a scoreboard (C19 binds only deep slots, and Meet Day owns the board).

**Must differ from.** v1 (the nearest ground in the lineup; no yellow family). Oxblood, the other dark simple: cool chromatic against warm. Clear sky: both blue families, but navy is dark with a pale accent and the sky is light with a dark accent. Ledger's Club green: both dark chromatic grounds; Navy keeps v1's layout.

**Micah's calls.** Q-P2 (the accent), Q-P5 (whether the guard binds v4).

### 3.4 simple-3 — Oxblood (simple, dark)

**Direction.** A warm maroon-black ground (`#1a0f11`, bar `#241518`, bone ink `#f3ece2`) with a cold ice-blue accent `#a8d8ff`: unlike Navy or v1, its accent sits 37 ΔE00 from Navy's and 50 from v1's [T4 §3.2, GF-A G4; SYNTHESIS §5.3]. Palette `oxblood` is clean on the full v3 list (0 failures, worst group 12.0); if the guard binds Tailwind v4 or pressed states, take rack `#1a0b0c`, accent `#a5d8ff` and pressed `#97bddc` [T4 GF7, GF11]. Schibsted Grotesk, drawn from "Schibsted's proud history of printed media", is research's face, with Archivo's x-height so the layout holds [T5 §5.1]. The known risk is two blues, accent and data, told apart only by lightness (L* 84 against 68), so the accent never sits beside back, fat or water as its only cue [T4 §3.2].

**Fixed for all three angles.** The oxblood ground and ice accent; the ground names a material (oxblood leather: the lifting belt and the lifting shoe; judgement) as R3.1 asks [T1 D1].

**Angles.**
1. **Newsprint grotesk.** Schibsted Grotesk for everything (web `wght` 400–900, 47.2 KB; native Regular / SemiBold / Bold / ExtraBold) [T5 §5.1]. The lead card filled at radius 2, the plate radius; groups parted by space alone; pills only on chips; headings wider on the web (1.21×A), so check fit at 320. Research's pick (S3-a).
2. **Belt leather, serif.** Vollkorn on the dark ground, where a serif carries no cream-cluster risk [SYNTHESIS S3-b; T5 §0]. Soft radius 8 flat cards, sentence-case SemiBold serif labels, the Coach card on Archivo. Vollkorn may win here or in Chalk, not both (§2 rule 7).
3. **Archivo, re-cut.** No new family: Archivo set against v1's grain — heads condensed (web wdth 75; native ArchivoCondensed-Bold from Omnibus-Type upstream, +1 TTF [T6 §3.4]), figures at wdth 100 instead of v1's 108–118, labels sentence case at 13pt 600, 800 on figures only [T3 A3–A4]. 0 web bytes and coverage exactly as today; the test of whether palette plus label typography alone escape the AI look [T1 §0.5]. It must not borrow Meet Day's wdth 62 figures.

**Must differ from.** Navy, the other dark simple. Ledger's Club green (grounds 15 apart, both dark chromatic): Oxblood keeps v1's layout and a cold light accent. Iron Age's recorded dark alternative (grounds 6 apart): no period faces or caps heads. v1, only 8 apart in ground: identity comes from the accent and the face.

**Micah's calls.** Q-P5 (pressed states guarded; Tailwind v4).

### 3.5 deep-1 — Ledger (deep, dark)

**Direction.** The Ledger: rules, drawn leaders and ranked columns instead of cards, the most complete "does not look AI-made" device set in the research; its core devices (labels as authored, rules for boxes, bare coloured values, a two-size scale, one colour one meaning) answer the friend's tell directly [T3 §7; SYNTHESIS §5.4]. It sits on `club`: bottle green `#0e1813`, bar `#15231b`, cream ink `#f1ead8`, pink accent `#ffb3c8` — the only palette clean on Tailwind v3 and v4 as written, 0 failures, worst group 13.6 — and one `lead` surface per tab keeps a fill and radius 4, so it is never broadsheet cosplay [T4 §3.2, GF11; T1 N12, D4; C17]. Research's type is Source Serif 4 (opsz pinned at 16) with Alumni Sans heads, and Archivo alone is the cheap alternative [T5 §5.2; C18; D1-b]. Pink for Rack's audience is Micah's call (Q-P4): the palette may change, the device set is the slot.

**Fixed for all three angles.** `club` and its pink; `card · ruled` with one boxed lead per tab; hairlines between groups, never between rows [T3 D1–D2]; bold only on the ranked column [T3 D5]; bars share an origin [T3 G2]; no monospace (Chivo Mono dropped, C18); no ornament, texture, photo or period device.

**Angles.**
1. **The record book.** Model: *Spalding's Official Base Ball Record* 1910 [T3 §4]. Source Serif 4 for text and figures (web opsz 16, 80.0 KB or 57.9 KB at `wght` 400–800) with Alumni Sans for condensed heads (23.8 KB; tabular; has arrows); the Coach card moves to Source Serif 4 with an advance table from the native statics, which are unverified and have no ExtraBold (Q-Q4) [T5 §5.2]. Devices: drawn leaders (`listRow · ledger`, `settingsRow · ledger`, `statRow · ledger`), hanging date numerals in a 28pt column (D7), week bands where Rack already groups by week (D6), old-style figures in coach sentences only (B6), heads hanging from a 2pt rule (C3). Watch: Source Serif is Source Sans 3's sibling, and Source Sans 3 is on the Claude-steered list, so the judges will look hard [R4.10]. Research's pick (D1-a).
2. **The Swiss programme.** Model: *The Vignelli Canon* and Gerstner's 58-module grid [T3 A1–A4, D1, D8–D9]. Sans only: Archivo for text and figures, heads condensed (native ArchivoCondensed-Bold, +1 TTF), the Coach card on v1 metrics; 0 web bytes [D1-b]. Devices: the two-size scale 13 / 17 / 34 / 68, 800 on figures only, a 2pt rule opening each section and ½pt between items, a 108pt label column with values flush left (`statRow · line` on a three-column 108pt grid), flush left, ragged right. The furthest of the three from Iron Age.
3. **The timetable.** Model: the departure board ("one line per flight") and Things' group heads [T3 D2–D3, B1, B7, G3, E2]. Every row one 44pt line; figures decimal-aligned in fixed slots; figure strings set in mixed weight (the figures at 600 in chalk, "×" and "·" at 400 in steel; figure strings only, never a sentence); bold mixed-case group heads over a hairline; a line-score total column set apart by a gap and 800; status colour on a few words only. Faces: Alumni Sans for figures (condensed, tabular) and Archivo for text and the Coach card. Native mixed-weight runs need explicit colours per run and a `verify-text-color` update: the concept states that cost [T3 B7].

**Must differ from.** Iron Age, which shares the ruled and leader vocabulary: Ledger is modern and dark — single rules above heads, never thick-thin or Oxford rules, no caps or small-caps heads, no italic running heads, no ornament, texture, photo or engraved icon. Meet Day: no scoreboard, board strip or inversion accent in a deep slot (C19). Oxblood, the other warm-leaning dark chromatic ground. Clear sky, the other deep vibe: dense ruled columns against open calm.

**Micah's calls.** Q-P4 (pink; if rejected, D1-c or Espresso, both with lineup risks).

### 3.6 deep-2 — Clear sky (deep, light)

**Direction.** Clear sky is the calm counterweight to the Ledger's density: one surprise per tab, rows on the ground at a 44pt pitch, separators between groups only, and no boxes except one lead, because on a flat ground Weather-style cards are the tell [T3 §4, §7; T1 D13; SYNTHESIS §5.5]. Palette `deep2-sky`: sky `#b1cfe5`, a neutral near-white lead `#f9fbfc` (a 1.57 step), blue-black inks, prussian accent `#083366`, and the best colour-vision numbers in the lineup (worst group 15.4, 0 failures, red and blue readable on the page itself) [T4 GF6]. Type stays Archivo, plus the packaged Archivo Light 300 where a hero numeral is used: 0 web bytes, +1 native TTF, Coach card on v1 metrics [T3 B4; T5 §0]. Whether a sky-blue page suits Rack is Micah's call (Q-P1).

**Fixed for all three angles.** `deep2-sky`; the `band` is `#0f1a24` (white on it 17.59); no cards but the lead; no rings styled like Activity, no live-sky imagery, no translucent Weather modules [T9 K; T3 §4]; a light vibe's native chrome (§2 rule 13).

**Angles.**
1. **The numeral.** Model: Apple Weather's one huge light numeral [T3 B4]. One hero figure per screen at 68–88pt, Archivo Light 300–400 at wdth 100, everything else ≤ 34pt; the Goal card's "0.9", the Weight tab's latest, Fuel's kcal and Steps' today each get it on their screens. Scale V (13 / 17 / 34 / 68) [T3 A2], `sectionHeader · plain`, `listRow · plain`, `statRow · line`, `chart · ink`. Picker face: Archivo Light. Research's pick (D2-a).
2. **The line.** Model: Tufte's sparkline, "word-sized … with typographic resolution" [T3 G1–G2]. No hero numeral; the data graphic is each block's surprise: word-sized sparklines beside their figures (`kpi · word`, 17–22pt tall, 60–90pt wide, a 3–4pt end dot, no frame), single-ink 1.5pt chart strokes with no area wash (`chart · ink`), bars on a shared origin at every text size, deltas as bare signed text with their arrows [T3 B2]. Figures at text size, 600–800; the lead card holds the tab's one large element to meet R6.9.
3. **The space.** Model: Things' "clear white piece of paper" and Vignelli's "white space provides the silence" [T3 A1, D2, E2]. The quietest spec: bold mixed-case group heads over a hairline, no dividers between rows, a grey secondary line under each title, one colour for exactly one meaning on each screen, two sizes per block. The one surprise is the lead card itself, stepped off the sky and sized 3× the next element. Must still redraw every block (a deep vibe), not only drop borders.

**Must differ from.** Chalk, the other cool light vibe (sky page, no boxes, prussian). Ledger (open calm against ruled density). Iron Age (no rules as costume, no serif, no texture, no warm stock). Apple's Weather and Fitness (no copying, no rings) [T9 C5, K].

**Micah's calls.** Q-P1 (the sky page, or the accent swap with Chalk).

### 3.7 experimental — Meet Day (experimental, dark)

**Direction.** Meet Day, track 6's pick at 28 of 30: the platform on competition day, where every motif restyles something already on screen — the set index becomes an attempt box, done a lit lamp, the plate strip the loading chart, three-tile rows a board strip, records the board's current-record cell [T6 §2, §3]. Palette MD-1: scoreboard black `#07080a` (checker-verified, not the tell hex `#0b0b0b`), cells `#111317`, header bands `#1d2026`, lamp white `#f5f0e3`, a separate good `#4be38a`, and track 4's CVD plates (worst group 14.1); the accent is an inversion, never a hue, which needs a declared R2.7 exemption (Q-P5) [C5, C6, C8; T4 GF-B]. Type is Archivo only, pushed to wdth 62–87 for figures and heads, with ArchivoExtraCondensed-ExtraBold and ArchivoCondensed-Bold as its 2 native statics and `tnum` always on [T6 §3.4]. It may rearrange boxes within a screen (board strips, segmented bars, scoresheet tables, one board grid down the session), never the dock, and any screen whose rearrangement can't be proven safe falls back to same order, new shapes [prompt §12; T6 §3.9].

**Fixed for all three angles.** MD-1; the "Experimental" tag in the picker as plain text; caps only on header bands and column heads at 0.05–0.12em (Q-Q1); the Coach card's text in Archivo on v1 metrics (`coachCard · panel`); a Meet Day `spark`; never a red lamp, three lamps, anything that implies judging, federation names or logos, hazard stripes, stencils, slogans, chalk dust, pills, 1px card borders, 12px radii, a hue accent, condensed sentences, or plates drawn anywhere `renderPlates` doesn't run [T6 §3.10]. It must pass the silhouette test [R10b].

**Angles.**
1. **The board.** The scoreboard leads, and it rearranges the most: every card a panel with a header band on 2px gutters (`card · panel`, `sectionHeader · banner`, `sheetTitle · band`); all five of track 6's rearrangements — three-tile rows into one board strip, rings into 10-cell segmented bars with the "%" text unchanged, a section band merged with its first card's header only where the two strings are identical, Strongest lifts as a scoresheet, and the session's set rows as one board grid down the whole screen [T6 §3.9]. Split-flap seams on hero figures of 32px and up (`headline · flap`), the dock a board strip with the active cell inverted.
2. **The score card.** The attempt card and score card lead [T6 §1.4, §3.6]. Sheets become cool-paper attempt cards (Whiteboard's `#fdfdfd` / `#eef0f0` with its inks, C9): a header band, fields on rules, a grid, a total rule. On the board, lists become score-card rows (label, drawn leader, figure) rather than strips. This needs a per-surface palette slot (Q-E3); the concept states the dark fallback for every sheet if the engine has none, and answers track 6's night-brightness question [T6 §5 item 3].
3. **The loading room.** The loaded bar and the lamps lead, with the least rearrangement that still passes the silhouette test: the plate strip drawn as the loading chart, heaviest innermost, to scale (`plateStrip · loaded`), calendar days with edge-on plate slivers (`calCell · edge`), 12px lamps for done sets and day dots (`setRow · attempt`), the current set's box inverted, square 6px meters with a lamp tick at the target, the rubber-fleck texture on the dock only [T6 §3.5, §3.7]. Rearranges only stat rows into board strips and rings into segmented bars. This is the per-screen fallback's natural home.

**Must differ from.** Iron Age, its opposite pole and never a remix: no period, serif, photo or ornament [T6 §2, §4]. v1: the black ground is only 4 ΔE00 from v1's, so identity comes from panels, gutters, inversion, condensed figures and lamps, and from the silhouette [T4 §3.3; R10b]. Ledger and Clear sky (C19). The 90s-hardcore gym [T6 §2].

**Micah's calls.** Q-P5 (the inversion exemption), Q-Q1 (header-band caps and the merge rule), Q-E3 (per-surface palette), the name ("Meet Day", or "Platform") [T6 §5 item 5].

---

## 4. Checks this plan ran on itself

- **Ids**: all match `^[a-z0-9][a-z0-9-]*$`, all ≤ 32, none is `v1`, `defs` or `icons`; `iron-age` as required.
- **Names** ≤ 16 characters; **feel lines** ≤ 28 characters (longest: "Ruled columns on club green." at 28); none uses "·".
- **Faces by slot, recommended angles**: Besley v4 (Iron Age), Sofia Sans (Chalk), Overpass (Navy), Schibsted Grotesk (Oxblood), Source Serif 4 + Alumni Sans (Ledger), Archivo + Archivo Light (Clear sky), Archivo condensed (Meet Day): no family in two vibes except Archivo. Runner-up collisions: Vollkorn (Chalk 2, Oxblood 2), Alumni Sans (Ledger 1 and 3, the same slot), Archivo condensed statics (Oxblood 3, Ledger 2, Meet Day), resolved by §2 rule 7.
- **Every palette named** is one research ran through `check.mjs` with 0 contrast failures [SYNTHESIS §5.8]. The accents that remain open are open because research left them to Micah, not because they failed.

## 5. Decisions left to Micah (from this plan)

- The working names and feel lines, all of them.
- Q-P1 (Clear sky's page), Q-P2 (Navy's accent), Q-P3 (Iron Age's stock), Q-P4 (Ledger's pink), Q-P5 (the guard's scope, including Meet Day's inversion), Q-P6 (Iron Age's red).
- Whether simple vibes may name `shape`-grade looks at all (VOCAB §9); every simple angle here uses some.
- Whether simple vibes get a v1-plus-neutral-`spark` icon set (§2 rule 14), which is the only way they avoid inheriting the sparkle.
- The picker's middle order (Q-M4).
