# Vibes: the component vocabulary

V59 §9.1, Phase D.1 — 2026-09-27. For the concept agents, the judges, and the native engine's N4 agent.

This is the list of shared building blocks a vibe may re-draw, the looks each block accepts by name, what each look changes, and what no look may change. Together with the token roles (`design/ROLES.md`), it is the contract every vibe fills.

- **The machine copy** is `vibes/defs/vocab.js` in the `web-design` worktree. It imports nothing and is frozen, like `v1.js` and `index.js`, so it can be copied byte for byte into rack-mobile's `src/pure/vibes/defs/` and pinned.
- **This page's block sections are generated from `vocab.js`** by `~/dev/vibes-night/tools/d1-vocab-md.mjs`, so the two cannot disagree. The prose around them is hand-written.
- **It was checked against both trees:** web `64303c7` and native `cb47196`. `~/dev/vibes-night/tools/d1-vocab-check.mjs` confirms that:
  - every native file named here exists;
  - every switch listed as existing is in its file;
  - every web class named here is in the stylesheets or the code;
  - every role a block "reads" resolves in `v1.js`;
  - every name the native engine already accepts is kept.

Words used below:
- A **block** is a shared component.
- A **look** is one of a block's accepted names. The code calls it a *variant*: `variants: { card: 'ruled' }`.
- **v1** is today's look, and it is named `'v1'` in every block.

---

## 1. How a vibe names a look

- **The definition names one look per block.** It does this in `variants: { <block>: '<look>' }`. v1 names `'v1'` everywhere. A name a block does not accept draws v1, never a broken box (native `src/ui/variant.js` `variantOf`).
- **Native branches on the name.** Each block opens with `switch (variantOf('<block>'))`. A look's branch sits above v1's, and v1 falls through to today's JSX. Each block below says which switches exist at `cb47196` and which switch sites the build phase still has to open.
- **The web does not branch at all.** The vibe's own stylesheet (`vibes/<id>.css`, every selector under `[data-vibe="<id>"]`) draws the looks its definition names, on the selectors listed per block. The name is what native branches on, and what Phase Q's parity check compares (§13.5).
- **A look is geometry, not a vibe.** It is drawn from the vibe's own tokens and its `shape` params (§4), so two vibes that name `ruled` get the same shapes in their own colours and faces. No native branch reads a vibe's id.
  - *Recommendation for the web:* generate each look's CSS from one template per look (for example in `tools-check/vibes-css.mjs`, which already writes each vibe's token block). If each vibe's file writes its looks by hand, only Q's parity check holds two vibes' `ruled` together.
- **v1 cannot move.** v1 names `'v1'` everywhere and reads no param. Nothing in `vocab.js` is a value v1 spends.

## 2. Grades, and who may use them

| Grade | What it may change | Who may name it |
|---|---|---|
| `v1` | nothing: today's JSX and CSS | everyone |
| `shape` | only:<br>• fill (a surface role, or none)<br>• border weight and colour role<br>• corner radius<br>• shadow<br>No new drawn device, nothing re-arranged inside the block, no literal type re-set | simple vibes, and everyone else |
| `deep` | adds drawn devices: rules, leaders, bands, keylines, inversions, hatching.<br>Re-sets type at literal sites.<br>Re-arranges inside the block without changing the order of what it holds | the deep vibes, Iron Age, the experimental vibe |

- **Letting a simple vibe name a `shape` look is D.1's reading of §2** ("plus at most small shape tokens such as radius or border weight"). A `shape` look is exactly such a bundle. Q or Micah may hold simple vibes to `'v1'` everywhere instead; nothing else in this file depends on it.
- **A simple vibe gets most of its change without any look:**
  - every colour role;
  - its faces;
  - the type roles, including `upper: 0` on the caps presets (the strings are authored in sentence case);
  - radius per role;
  - the tint alphas. Setting `tint.pillUp` and its siblings to 0 removes the delta pills' fill.

## 3. What no look may change

These come from `vocab.js` `rules`, drawn from §1, §2, §13 and SYNTHESIS R1, R7 and R8.

1. Same boxes, same order, same children. A look re-draws its block; it never adds, removes, reorders, merges or splits what the block holds. Re-arranging boxes on a screen is the experimental vibe's composition (§12), not a look.
2. Every word and number identical. Case changes only through a type role's `upper`, and only on strings authored in sentence case; never a lowercase transform; 'COACH ME' is authored in capitals and stays so.
3. Rules, leaders, dots, ticks and seams are drawn — borders, Views, SVG — never typed. On the web every ::before and ::after a vibe writes has content '': a pseudo-element never carries a character.
4. Every control stays where it is and does what it did: the same action, press feedback, accessibility role, label and state. A target v1 draws at 44 or more stays at 44 or more; one v1 draws smaller (the set check 30, the live chip and the calendar button 38, the You gear 36, the month and day buttons 34) keeps at least v1's size — enlarging one moves the touch-target snapshot and is Micah's call (Q-M5).
5. Colour only through roles. Chosen, current, done, today, up and down, and danger are never told by colour alone: an inversion, a keyline or rule weight, a fill, a glyph, an arrow.
6. Text at 4.5:1 (3:1 at 18pt, or 14pt bold) and control edges and graphics at 3:1 against what they sit on — measured on the look's own surfaces (a band, a panel, an inverted cell).
7. No new motion: no entrance, draw-in, count-up or overshoot. A look may drop one of v1's animations, never add one. A vibe's keyframes are named "&lt;id>-…" (tools-check/vibes-scope.mjs).
8. No gradient washes, corner glows or glass beyond v1's dock, workout bar and sheet backdrop; hard-stop splits and repeating patterns only (SYNTHESIS C22). A texture sits under figures, never under body text.
9. Photos only in the seven hero slots (native theme.js HERO_SLOTS); never behind set rows, food rows, charts, stat rows or dense numbers.
10. Fixed boxes stay fixed: the Coach card's 190 / 164 with its padding, border and type (unless the vibe measured its own, T.fit, §6.6), the dock's height, the sheets' maximum heights, the set table's column widths.
11. Light vibes: on the web the top safe-area band stays dark (the installed PWA's status text is always white); a look drawn under the status bar — the workout bar is — keeps that band dark (§10).
12. Native mechanics: a switch sits after the block's hooks; a colour spent in a reanimated worklet is hoisted as a plain string (SetRow, §6.3); every Text keeps its maxFontSizeMultiplier and explicit lineHeight, floored at the face's minLh; a host tree with no photo is v1's (§6.7).

## 4. The `shape` params (proposed)

A look that draws a rule, a leader, a band, a gutter or a keyline reads these from a vibe definition's `shape` object. Any key the definition leaves out takes the default below.

- **Units:** numbers are pt on native and px on the web, as radius is.
- **Colours:** a colour value names a colour role, never a hex.
- **Not in the contract yet.** Neither `v1.js` nor `index.js` `ROLES` has `shape`; §9 says why that is the orchestrator's call.
- **v1 reads none of them.** It names no look.

| Param | Default | Meaning | Looks that read it |
|---|---|---|---|
| `shape.rule.ink` | `"knurl"` | the colour role of every drawn rule; 3:1 on its ground where it carries structure (R2.2) | eyebrow · rule, sectionHeader · rule, sheetTitle · rule, field · underline, note · rule, dock · rail, coachCard · ruled |
| `shape.rule.hair` | `1` | a hairline: row, cell and column dividers | sheetTitle · rule, statRow · folio, note · rule, setRow · ruled, calCell · ruled, addTile · ruled |
| `shape.rule.head` | `[2]` | the head rule, line and gap widths outermost first: [2] is one 2pt rule, [3, 2, 1] an Oxford rule | card · ruled, sectionHeader · rule, screenHeader · masthead, sheetHost · full, headline · rule, setTable · ruled |
| `shape.rule.place` | `"above"` | 'above': the head hangs from the rule. 'below': the head sits on it | card · ruled, sectionHeader · rule |
| `shape.leader` | `{"ink":"steel","dot":1.5,"pitch":4,"min":16}` | drawn dots on the text baseline between a name and its value (ink role, dot size, pitch, shortest leader) | statRow · ledger, settingsRow · ledger, listRow · ledger |
| `shape.band` | `{"fill":"raised","ink":"chalk","height":30}` | a filled strip holding a head's own words (ground role, ink role, height) | card · panel, sectionHeader · banner, sheetTitle · band, setTable · panel, coachCard · panel |
| `shape.gutter` | `2` | the gap between panels, board cells and strips | card · panel, sectionHeader · banner, statRow · board, setTable · panel, dock · board |
| `shape.keyline` | `{"ink":"chalk","width":1}` | a stamped outline: plates, stamps, record cells (ink role, width) | headline · stamp, chip · stamp, addTile · ruled, sessionChrome · plate |

## 5. The blocks at a glance

The blocks are in `vocab.js` order. "(new)" marks the 12 that D.1 adds to the 17 the contract has today.

- **"Switch today"** says whether native `cb47196` already branches on the block.
- **"Photo slots"** names the hero slots the block carries (native `theme.js` `HERO_SLOTS`).

| Block | What it is | Looks | Switch today | Photo slots |
|---|---|---|---|---|
| `card` | Card | `v1` `flat` `ruled` `plate` `panel` | yes (1) | `stepsToday`, `weightLog` |
| `youCard` | You card | `v1` `flat` `ruled` `plate` `panel` | yes (1) | — |
| `eyebrow` | Card head / eyebrow | `v1` `tag` `rule` | yes (1) | — |
| `sectionHeader` | Section header | `v1` `rule` `banner` `plain` | yes (2) | — |
| `screenHeader` | Screen header | `v1` `masthead` `inline` | yes (2) | `summaryHero` |
| `sheetHost` | Sheet | `v1` `inset` `full` | yes (1) | — |
| `sheetTitle` | Sheet title | `v1` `rule` `centred` `band` | yes (1) | — |
| `statRow` | Stat row | `v1` `ledger` `lead` `line` `folio` `board` | yes (2) | — |
| `kpi` | KPI tile | `v1` `plain` `band` `word` | yes (1) | — |
| `headline` (new) | Headline number | `v1` `rule` `stamp` `flap` | no | `fuelSummary` |
| `chip` | Chip | `v1` `square` `tag` `stamp` | yes (1) | — |
| `segmented` | Segmented control | `v1` `tabs` `boxes` | yes (1) | — |
| `btn` | Buttons (primary, plain, ghost, danger; large; block) | `v1` `square` `pill` `outline` `inverse` `panel` | yes (1) | `startWorkout` |
| `field` (new) | Text field | `v1` `square` `underline` | no | — |
| `note` (new) | Note | `v1` `rule` | no | — |
| `toast` (new) | Toast | `v1` `square` `strip` | no | — |
| `settingsRow` | Settings row | `v1` `ledger` `tile` | yes (2) | — |
| `listRow` (new) | List rows | `v1` `plain` `ledger` | no | — |
| `setTable` (new) | Set table (the exercise card) | `v1` `ruled` `panel` | no | — |
| `setRow` (new) | Set row | `v1` `ruled` `attempt` | no | — |
| `plateStrip` (new) | Plate strip | `v1` `stamp` `loaded` | no | — |
| `calCell` (new) | Calendar cell | `v1` `open` `ruled` `edge` | no | — |
| `chart` | Charts and meters | `v1` `ink` `print` `board` | yes (7) | — |
| `dock` | Dock | `v1` `solid` `rail` `board` | yes (1) | — |
| `fab` (new) | Floating button (Log food) | `v1` `square` `inverse` | no | — |
| `addTile` (new) | Add tiles | `v1` `flat` `ruled` | no | — |
| `sessionChrome` (new) | Live session chrome: the top bar, the live chip, the rest pill, the peek bar | `v1` `flat` `slab` `plate` | no | — |
| `youHero` | You hero (greeting) | `v1` `banner` `stacked` | yes (1) | `youHero` |
| `coachCard` | Coach card (skin only) | `v1` `flat` `ruled` `plate` `panel` | yes (1) | `coachCard` |

## 6. Block by block

For each block:
- where it is drawn on each client;
- the v1 roles it spends (its main ones, each checked against `v1.js`);
- its looks;
- what it keeps whatever the look, on top of §3.

"Asked for by" names the research directions that want a look (SYNTHESIS §5). These are working names, not vibe ids.

### `card`: Card

- **Web:** .card outside #view-you (stats.js card() and the tab screens' own cards; You's and the admin's are youCard); .card-hd; .card-sub; .card.fuel-sum (Fuel's summary: its tab's lead card)
- **Native:** src/ui/Card.jsx Card, CardHead; T.cardSkin() — the hand-rolled card Views that are not &lt;Card> (V59 §6.8)
- **Native switches today:** src/ui/Card.jsx Card
- **Switch sites to open:** T.cardSkin(): the hand-rolled card Views follow this block, but Stat, Segmented and GroupPill call it for a tile, a track and a pill and follow their own blocks — cardSkin needs to know which it is drawing
- **Photo slots:** `stepsToday`, `weightLog`
- **v1 roles it spends:** `colors.bar`, `colors.collar`, `radius.r`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | bar ground, a 1pt collar border, radius.r, padding 14, 12 below; its head row is the title left, meta and ⋯ right | today |
| `flat` | shape | the bar ground with no border, radius.r corners: surfaces told apart by value, not outline (R3.2) | chalk, navy, oxblood |
| `ruled` | deep | no ground, no border, no radius: the card sits on the page under the head rule (shape.rule.head, placed by shape.rule.place) drawn full width, its content to the rule's width; cards part by space. The tab's lead card — its one hero box: Fuel's summary, Weight's log, Steps' today — keeps a box (bar ground, radius.r, no border), so the page is never boxes-nowhere (R6.1, R6.10) | ledger, iron-age, clear-sky |
| `plate` | shape | the bar ground, square corners (radius.plate) and a 2pt keyline in knurl: a stamped nameplate | reserved |
| `panel` | deep | bar ground, no border, square corners (radius.plate), cards parted by shape.gutter; the head row drawn as a band (shape.band) across the top edge holding the title left and meta and ⋯ right in the band's ink | meet-day |

Keeps, whatever the look:
- what the card holds, in order; the head's title, meta and ⋯ where they are, the ⋯ still opening its sheet
- the photo slot on Steps' today and Weight's log cards, drawn inside the look's own box
- the clearance between the last card and the dock
- Fuel's empty meal card stays one line

### `youCard`: You card

- **Web:** #view-you .card (you.js card(); the owner-only admin borrows #view-you, so its cards take this look too); .card-hd; .card-right; .card-sub; .card-why; .card-wins; .card-improve
- **Native:** src/ui/you/bits.jsx YouCard
- **Native switches today:** src/ui/you/bits.jsx YouCard
- **Type:** eyebrow
- **v1 roles it spends:** `colors.bar`, `colors.collar`, `radius.r`, `type.eyebrow`, `colors.dim`, `colors.good`, `colors.warn`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | as card, with the eyebrow title, the meta and ⋯ in its head; Wins and Improve carry a 3pt left rule in good / warn | today |
| `flat` | shape | as card's flat; the Wins / Improve colour moves to a 2pt top border (no side stripe, R6.4) | chalk, navy, oxblood |
| `ruled` | deep | as card's ruled; the Wins / Improve colour inks the head rule instead of a side stripe | ledger, iron-age, clear-sky |
| `plate` | shape | as card's plate; the Wins / Improve colour inks the keyline | reserved |
| `panel` | deep | as card's panel; the Wins / Improve colour fills a 3pt rule under the band | meet-day |

Keeps, whatever the look:
- as card
- the ⋯ opens the same "Where this comes from" sheet
- which card is Wins and which Improve stays in its title words, not only its colour

### `eyebrow`: Card head / eyebrow

- **Web:** .eyebrow (card heads, screen titles, sheet eyebrows); .chart-sub (a small head inside a card)
- **Native:** src/ui/Card.jsx Eyebrow; the direct T.text.eyebrow sites; src/ui/you/bits.jsx ChartSub
- **Native switches today:** src/ui/Card.jsx Eyebrow
- **Switch sites to open:** the direct T.text.eyebrow sites and ChartSub, which draw an eyebrow without &lt;Eyebrow>, reading the same variant
- **Type:** eyebrow
- **v1 roles it spends:** `type.eyebrow`, `colors.dim`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | 10pt, wdth 88 / 700, caps tracked .16em, dim, no device. Case, size, tracking and ink are type.eyebrow's: a simple vibe changes them there (upper: 0 — the strings are authored in sentence case), with no look | today |
| `tag` | deep | the words in a filled tag: raised ground, radius.chip, 2 × 6 padding | reserved |
| `rule` | deep | a short 16pt rule (shape.rule.ink, 1pt) before the words, on their x-height | reserved |

Keeps, whatever the look:
- the words, above the title or inside the head row as today

### `sectionHeader`: Section header

- **Web:** .you-sec; .you-sec-t; .you-sec-t::after (the hairline); you.js section(); settings.js section(); admin.js section()
- **Native:** src/ui/you/bits.jsx Section; src/ui/settings/index.jsx Sec
- **Native switches today:** src/ui/you/bits.jsx Section; src/ui/settings/index.jsx Sec
- **Type:** literal — the same arguments as type.eyebrow at both native sites
- **v1 roles it spends:** `colors.dim`, `colors.collar`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | the title (10pt caps .16em, dim) and a collar hairline running on to the edge; 26 above, 10 below | today |
| `rule` | deep | the title with the head rule (shape.rule.head in shape.rule.ink) at full width, above it or below it by shape.rule.place; no trailing hairline | ledger, iron-age |
| `banner` | deep | a full-width band (shape.band) with the title inside it, left; the hairline becomes a shape.gutter gap | meet-day |
| `plain` | deep | the title alone, set as a real head in type.h3; no hairline | clear-sky |

Keeps, whatever the look:
- the title's words
- each section's cards under it, in order

### `screenHeader`: Screen header

- **Web:** .cal-hd holding .eyebrow + h1 (workout.js calendar, food.js, weight.js, steps.js) with .cal-nav on the right; stats.js and admin.js pageHead() (with .back-btn); .summary-hero (.eyebrow, h1, .summary-line, .summary-date)
- **Native:** src/ui/Card.jsx ScreenTitle (Train, Fuel, Weight, Steps); src/ui/train/stats.jsx PageHead; app/(app)/(tabs)/workout/summary.jsx the recap's hero block
- **Native switches today:** src/ui/Card.jsx ScreenTitle; src/ui/train/stats.jsx PageHead
- **Switch sites to open:** app/(app)/(tabs)/workout/summary.jsx draw.hero
- **Photo slots:** `summaryHero`
- **Type:** eyebrow; h1
- **v1 roles it spends:** `type.eyebrow`, `type.h1`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | the eyebrow over a 26pt h1 (wdth 78 / 800); the nav buttons right of it | today |
| `masthead` | deep | a larger title over a full-width head rule (shape.rule.head), the eyebrow above it; the nav buttons keep their place | iron-age, ledger |
| `inline` | deep | the eyebrow and the title on one baseline, the eyebrow first | reserved |

Keeps, whatever the look:
- the nav buttons, their order, actions and size (the month and day buttons are 34 in v1 — never smaller); Back
- the recap's line and date under its headline
- the title's words: a month, "Today", a date

### `sheetHost`: Sheet

- **Web:** .sheet; .sheet-grab; .sheet-backdrop; .sheet.coach-sheet; ui.js sheet(), confirmSheet()
- **Native:** src/ui/Sheet.jsx SheetHost; src/ui/sheet.js sheet(), confirmSheet()
- **Native switches today:** src/ui/Sheet.jsx SheetHost
- **v1 roles it spends:** `colors.bar`, `colors.knurl`, `colors.grip`, `radius.sheet`, `tint.backdrop`, `scrim.sheet`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | bar ground, 18pt top corners, a knurl top edge, a 36 × 4 grab handle in grip, up to 86% of the screen (92% tall) less the top inset; the backdrop is shade at .6 (and a 3px blur on the web) | today |
| `inset` | deep | a floating panel 8 off both sides and the bottom, all four corners radius.sheet, the same maximum height | reserved |
| `full` | deep | edge to edge with square top corners (radius.plate) and the head rule (shape.rule.head) along its top edge in place of the round shoulder; the grab handle stays | iron-age, meet-day |

Keeps, whatever the look:
- the maximum heights (86 / 92, less the top inset)
- dismissal: a backdrop tap, a swipe down, the sheet's own Close or Cancel; the estimator's phase that cannot be dismissed
- the grab handle, at 3:1 against the sheet in any non-v1 vibe (R8.5)
- one sheet at a time; the body scrolls; the keyboard lifts the sheet and the Done bar rides it

### `sheetTitle`: Sheet title

- **Web:** .sheet h2 (the eyebrow above it is the eyebrow block)
- **Native:** src/ui/sheet.js SheetTitle
- **Native switches today:** src/ui/sheet.js SheetTitle
- **Type:** h2
- **v1 roles it spends:** `type.h2`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | an 18pt h2 (wdth 78 / 800), left, no device | today |
| `rule` | deep | the title over a hairline (shape.rule.hair in shape.rule.ink) at the sheet's full content width | iron-age, ledger |
| `centred` | deep | the title centred | reserved |
| `band` | deep | the title inside a band (shape.band) drawn to the sheet's edges | meet-day |

Keeps, whatever the look:
- the title's words; its eyebrow stays above it
- no smaller gap to the first content than v1's

### `statRow`: Stat row

- **Web:** .stat-row; .stat; .stat-val; .stat-lbl; you.js, stats.js and admin.js statRow(); .mini-stats; .mini-stat; .mini-stat-v; .mini-stat-l
- **Native:** src/ui/Stat.jsx StatRow, Stat; src/ui/you/bits.jsx MiniStats
- **Native switches today:** src/ui/Stat.jsx StatRow; src/ui/Stat.jsx Stat
- **Switch sites to open:** src/ui/you/bits.jsx MiniStats
- **Type:** statVal; statLbl
- **v1 roles it spends:** `colors.bar`, `colors.collar`, `radius.sm`, `type.statVal`, `type.statLbl`, `colors.well`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | three tiles 8 apart, each bar ground, collar border, radius.sm, padding 10: a 20pt value (wdth 108 / 800, tabular) over a 9pt caps label in dim. Mini stats: the same in small, on the well | today |
| `ledger` | deep | one line per stat, in order: the label left, a drawn leader (shape.leader), the value right; lines on a 44pt pitch, no box | ledger |
| `lead` | deep | the first stat large and the other two small beside it (1 + 2), no boxes. A screen may have one hero figure (R6.7): a vibe naming lead gives up its headline there | reserved |
| `line` | shape | a box-score line: no ground and no outer border; the values on one baseline with a 1pt rule (collar or knurl) between columns, labels under them | chalk, clear-sky, ledger |
| `folio` | deep | the line between two hairlines (shape.rule.hair) above and below it: the period folio line | iron-age |
| `board` | deep | one board strip: the cells butt together with shape.gutter gaps, bar ground, no border, square corners | meet-day |

Keeps, whatever the look:
- the stats and their order
- a value's own colour where its caller gives one (a group or subject colour)
- tabular figures; a value never truncates (a label may wrap)

### `kpi`: KPI tile

- **Web:** .kpi-grid; .kpi; .kpi-hd; .kpi-lbl; .kpi-val; .kpi-unit; .kpi-prev; .kpi-days i; .delta-pill; .kpi .chart-spark; you.js kpi()
- **Native:** src/ui/you/bits.jsx Kpi
- **Native switches today:** src/ui/you/bits.jsx Kpi
- **Type:** kpiVal; literal label — the same arguments as type.statLbl
- **v1 roles it spends:** `colors.well`, `colors.collar`, `radius.sm`, `kpi`, `tint.pillBase`, `tint.pillUp`, `tint.pillDown`, `tint.pillWarn`, `colors.good`, `colors.bad`, `colors.warn`, `colors.dim`, `type.kpiVal`, `shadow.kpiDay`, `shadow.kpiToday`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | a well tile (collar border, radius.sm) with its subject's corner tint (a radial wash on the web, a flat corner block on native); the 9pt caps label and the delta in a tinted pill; the 22pt value and unit; "last week …"; a 46pt sparkline; seven day dots, today ringed | today |
| `plain` | shape | the tile without its corner tint. The delta pill's fill is tint.pill*, which a vibe may set to 0 without a look | chalk, navy, oxblood |
| `band` | deep | no corner tint; a 3pt band of the subject colour across the tile's top edge | reserved |
| `word` | deep | no tile: the sparkline drawn word-sized (17–22 tall, 60–90 wide, a 3–4pt end dot, no frame) in its own place; the delta as bare signed text with its arrow | clear-sky |

Keeps, whatever the look:
- the 2 × 2 grid and its order
- every figure; the arrow on each delta and its "…" / "–" states
- seven day dots, today ringed (a shape cue)
- "last week …" in its place

### `headline`: Headline number

- **Web:** .load-num (food.js Fuel's summary and the targets preview, steps.js today, water.js total, weight.js peak and maintenance); .fuel-top; .headline; .headline-v; .headline-u (you.js)
- **Native:** T.loadNum(size) at app/(app)/(tabs)/food.jsx (3 sites), steps.jsx (1), weight.jsx (2); src/ui/you/bits.jsx Headline, HeadlineV, HeadlineU
- **Native switches today:** none
- **Switch sites to open:** src/ui/you/bits.jsx HeadlineV; the six T.loadNum sites, which have no component (a wrapper that draws the same Text, or a switch at each)
- **Photo slots:** `fuelSummary`
- **Type:** headline; loadNum
- **v1 roles it spends:** `loadNum`, `type.headline`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | the figure alone: loadNum is wdth 118 / 800, tabular, -.02em, line-height .95, at 26–40; You's headline is 34pt wdth 112 / 800 with its unit beside it. Face, width and weight are type roles, with no look | today |
| `rule` | deep | the challenge line: the figure over the head rule (shape.rule.head), its unit on the same baseline | iron-age |
| `stamp` | deep | the figure inside a keyline plate (shape.keyline, square corners): a stamped scale plate, a record cell | iron-age, meet-day |
| `flap` | deep | a split-flap cell behind the figure: two flat halves meeting at 50% with no blend (C22) and a 1pt seam; only at 32pt and up | meet-day |

Keeps, whatever the look:
- the figure's text, sign and "≈"
- its colour role (Fuel's zone colour, Weight's pYellow) — except over a photo, where every word is one ink (R9.6)
- its unit and qualifier where they are

### `chip`: Chip

- **Web:** .chip; .chip.on; .filter-row; .chip-row; .move-opt; .coach-chip; .coach-goal-opt
- **Native:** src/ui/Chip.jsx Chip, ChipRow; src/ui/train/picker.jsx MoveChip; src/ui/coach/goal.jsx GoalChip; src/ui/coach/sheets.jsx Chips
- **Native switches today:** src/ui/Chip.jsx Chip
- **Switch sites to open:** src/ui/train/picker.jsx MoveChip; src/ui/coach/goal.jsx GoalChip; src/ui/coach/sheets.jsx Chips
- **Type:** chip
- **v1 roles it spends:** `colors.well`, `colors.collar`, `colors.inverse`, `colors.knockout`, `radius.pill`, `type.chip`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | a pill on the well with a collar border, 11pt steel; chosen = inverted (inverse ground, knockout words, inverse border) | today |
| `square` | shape | square corners (radius.chip); otherwise v1 | meet-day |
| `tag` | shape | a filled tag: raised ground, no border, radius.chip; chosen = inverted | reserved |
| `stamp` | deep | a stamped plate: no ground, a keyline (shape.keyline), square; chosen = filled with inverse and knockout words | iron-age |

Keeps, whatever the look:
- chosen shown by inversion or fill, never colour alone
- the row scrolls sideways as v1's does; the labels
- chips that are 44 tall in v1 (Movement, the feel and goal chips) stay 44

### `segmented`: Segmented control

- **Web:** .seg; .seg-btn; .seg-btn.on; ui.js segmented()
- **Native:** src/ui/Segmented.jsx Segmented
- **Native switches today:** src/ui/Segmented.jsx Segmented
- **Type:** segBtn
- **v1 roles it spends:** `colors.bar`, `colors.collar`, `radius.pill`, `colors.inverse`, `colors.knockout`, `type.segBtn`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | a pill track (bar ground, collar border) with pill segments; the chosen one inverted; 11pt caps .06em | today |
| `tabs` | deep | no track: the options as words, the chosen one in chalk over a 2pt underline — the underline is the cue | reserved |
| `boxes` | shape | joined square cells (radius.plate) with 1pt rules between them; the chosen cell inverted | iron-age, meet-day |

Keeps, whatever the look:
- the options in order, at equal widths
- a tap on the chosen option does nothing
- chosen told by inversion or underline
- at least v1's height

### `btn`: Buttons (primary, plain, ghost, danger; large; block)

- **Web:** .btn; .btn-primary; .btn-ghost; .btn-danger; .btn-lg; .btn-block; .btn-split; local resizes: .peek-bar .btn, .ex-actions .btn, .add-row .btn, .qty-row .btn, .wk-block-btn, .drop-add
- **Native:** src/ui/Btn.jsx Btn (kind primary | danger | ghost | plain; large; block); src/ui/train/SetRow.jsx DropAdd; src/ui/you/bits.jsx GoBtn (a ghost Btn)
- **Native switches today:** src/ui/Btn.jsx Btn
- **Switch sites to open:** src/ui/train/SetRow.jsx DropAdd
- **Photo slots:** `startWorkout`
- **Type:** btn; btnLg
- **v1 roles it spends:** `colors.accent`, `colors.onAccent`, `colors.danger`, `colors.steel`, `colors.collar`, `colors.raised`, `colors.chalk`, `radius.sm`, `type.btn`, `type.btnLg`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | radius.sm, 12 × 18 padding (large: 16 all round, 16pt caps .06em), 44 tall at least on the web; primary = accent ground, onAccent words; plain = raised, chalk; ghost = collar keyline, steel; danger = danger keyline and words; pressed scale .97; disabled at .4 | today |
| `square` | shape | every kind square-cornered (radius.plate); ghost and danger keylines 1.5pt | meet-day |
| `pill` | shape | every kind fully round (radius.pill). R6.5 keeps pills to chips, segmented controls and the toast: reserved, and no direction asks for it | reserved |
| `outline` | shape | primary as an accent keyline with accent words and no ground; the other kinds as v1 | reserved |
| `inverse` | deep | the accent leaves the primary (T3 E1): primary = inverse ground, knockout words, square corners; plain = raised, square; ghost = no box, its words underlined 1pt in steel, the 44 hit area kept by padding; danger = a square danger keyline | iron-age, ledger |
| `panel` | deep | the lit panel: square corners; primary = inverse ground, knockout words; plain and ghost = the raised ground ("a cell"), chalk words, no border; danger = a square danger keyline | meet-day |

Keeps, whatever the look:
- every button's words, kind and place
- danger told apart by keyline and ink, not colour alone
- the primary stays the most prominent control on its screen
- 44 at least where v1 is; block width; press scale; disabled at .4
- Start workout's photo slot

### `field`: Text field

- **Web:** .field; .field label; .field input; .field select; .field-lbl; .auth-err; the recessed in-card inputs: .qty-row input, .picker-search input, .paste-box
- **Native:** src/ui/Field.jsx Field, FieldError; src/ui/food/common.jsx FieldLbl, TextBox; src/ui/train/picker.jsx Search
- **Native switches today:** none
- **Switch sites to open:** src/ui/Field.jsx Field; src/ui/food/common.jsx TextBox; src/ui/train/picker.jsx Search
- **Type:** fieldLbl; body
- **v1 roles it spends:** `colors.bar`, `colors.well`, `colors.collar`, `colors.focus`, `colors.chalk`, `colors.dim`, `colors.danger`, `radius.sm`, `type.fieldLbl`, `type.body`, `chrome.keyboard`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | a 10pt caps label (dim) over a box: bar ground (the well for in-card inputs), collar border, radius.sm, padding 12; focus turns the border to focus | today |
| `square` | shape | square corners (radius.plate) and a knurl border, a 3:1 control edge (R2.2); focus as v1 | meet-day |
| `underline` | deep | no box: the value on a 1pt rule (shape.rule.ink); focus thickens it to 2pt in focus — the thickness is the cue | iron-age, ledger |

Keeps, whatever the look:
- the label above the field, its words
- placeholders, keyboard type and appearance, commit rules
- a focus cue at 3:1
- the field's height and the error line's reserved room

### `note`: Note

- **Web:** .note; ui.js noteEl()
- **Native:** src/ui/Note.jsx Note
- **Native switches today:** none
- **Switch sites to open:** src/ui/Note.jsx Note
- **Type:** note
- **v1 roles it spends:** `type.note`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | 12pt dim, line-height 1.5, 8 above. Most of what a vibe wants here is type.note: 12pt or more, ink at 4.5:1 (v1's dim is 2.70:1 on bar) | today |
| `rule` | deep | a footnote: a 16pt hairline (shape.rule.hair in shape.rule.ink) above the note | iron-age |

Keeps, whatever the look:
- the words, where they are

### `toast`: Toast

- **Web:** .toast; ui.js toast()
- **Native:** src/ui/ToastHost.jsx ToastHost
- **Native switches today:** none
- **Switch sites to open:** src/ui/ToastHost.jsx ToastHost
- **Type:** btn
- **v1 roles it spends:** `colors.inverse`, `colors.knockout`, `radius.pill`, `shadow.toast`, `type.btn`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | an inverted pill (inverse ground, knockout words, 13pt wdth 92 / 700), centred 16 above the dock, with the toast shadow | today |
| `square` | shape | square corners (radius.plate), no shadow | iron-age, meet-day |
| `strip` | deep | an inverted strip the content's width, square, the words left | reserved |

Keeps, whatever the look:
- the message; one at a time; 2.2 seconds
- above sheets, never tappable
- its place above the dock

### `settingsRow`: Settings row

- **Web:** .set-list; .set-row-nav; .set-row-l; .set-row-v; .set-row-x; .set-row-tog; .set-row-sub; settings.js navRow()
- **Native:** src/ui/settings/Row.jsx SettingsRow, SettingsList; src/ui/coach/settings.jsx ToggleRow
- **Native switches today:** src/ui/settings/Row.jsx SettingsList; src/ui/settings/Row.jsx SettingsRow
- **Switch sites to open:** src/ui/coach/settings.jsx ToggleRow
- **Type:** literal: 14pt wdth 92 / 600 label, 12pt steel tabular value, 17pt chevron
- **v1 roles it spends:** `colors.collar`, `colors.chalk`, `colors.steel`, `colors.dim`, `tint.rowPress`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | full-width rows, 13 × 2 padding, a collar rule between rows (none above the first); the label 14pt chalk, the value 12pt steel, a › chevron in dim; pressed = the rowPress wash | today |
| `ledger` | deep | a drawn leader (shape.leader) from the label to the value; no rules between rows, one hairline under the group | ledger, iron-age |
| `tile` | shape | each row its own tile: well ground, radius.sm, 6 apart, no rules | reserved |

Keeps, whatever the look:
- the chevron on every row that opens something — its only signal
- label, value, chevron, in that order
- the full-width tap target, 44 tall
- the toggle rows' switches and sub-lines

### `listRow`: List rows

- **Web:** .food-entry; .pb-row; .pr-hit; .pr-row; .rank-row; .sess-row; .ex-item; .find-row; .review-row; .rt-item; .rt-pv-row; .day-ex; .st-row; .guide-row; .person (auth.css; admin)
- **Native:** app/(app)/(tabs)/food.jsx EntryRow; app/(app)/(tabs)/steps.jsx RecentRow; src/ui/train/stats.jsx PrRow, PbRow, SessRow, PickerRow; src/ui/train/picker.jsx ExRow; src/ui/train/routines.jsx RoutineRow, PreviewRow; src/ui/train/DayEx.jsx DayEx; src/ui/you/bits.jsx FindingRow; src/ui/food/common.jsx LibraryRow, ProposedRow
- **Native switches today:** none
- **Switch sites to open:** each row component above — a switch in each, or one row-skin fragment they spread, as the card Views spread T.cardSkin()
- **Type:** literal at every row
- **v1 roles it spends:** `colors.collar`, `colors.chalk`, `colors.steel`, `colors.dim`, `colors.accent`, `tint.pickSel`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | rows 9–11 padded top and bottom, a collar rule between rows (none above the first); the name 13–14pt 600, an 11pt dim line under it, the value right at 15pt wdth 108 / 800 | today |
| `plain` | shape | no rules between rows — separators between groups only (T3 D2); rows at least on a 44pt pitch | clear-sky, ledger |
| `ledger` | deep | on name … value rows (PR, PB, rank, session, food entry, recent steps): a drawn leader (shape.leader) from the name to the value, the value alone at 800 (bold only the ranked column, T3 D5); rows of another shape draw as plain | ledger, iron-age, meet-day |

Keeps, whatever the look:
- every row, in order, with its tap target and swipe to delete
- the chosen and PR states told by more than colour
- the name ellipsises; the value never truncates

### `setTable`: Set table (the exercise card)

- **Web:** .ex-block; .ex-hd; .ex-tag; .ex-name; .ex-menu; .ex-prev; .ex-block .set-hd; .ex-actions; .wk-block, .wk-block-hd, .wk-block-title (a lifting block); .rt-sets .set-hd (the routine editor)
- **Native:** app/(app)/(tabs)/workout/session.jsx ExerciseBlock; src/ui/train/SetRow.jsx SetTable; src/ui/train/routines.jsx EditorExercise, EditorBlock
- **Native switches today:** none
- **Switch sites to open:** app/(app)/(tabs)/workout/session.jsx ExerciseBlock; src/ui/train/SetRow.jsx SetTable; src/ui/train/routines.jsx EditorExercise
- **Type:** statLbl
- **v1 roles it spends:** `colors.bar`, `colors.collar`, `radius.r`, `groupPlates`, `colors.dim`, `type.statLbl`, `colors.knurl`, `tint.block`, `colors.accent`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | the exercise card: bar ground, collar border, radius.r, clipped; a head of the 4 × 30 group tag, the name (15pt wdth 88 / 700) and ⋯; the grey "Last …" line; 9pt caps column heads; the rows; the action buttons. A lifting block wraps its cards in a knurl keyline over an accent .03 wash, under an accent caps title | today |
| `ruled` | deep | no box: the name over the head rule (shape.rule.head); the column heads over a 1pt rule; the rows parted by hairlines (setRow); a lifting block as a rule-framed group | iron-age, ledger |
| `panel` | deep | bar ground, no border, square corners, cards parted by shape.gutter; the head drawn as a band (shape.band) holding the group tag, the name and ⋯ | meet-day |

Keeps, whatever the look:
- the columns, in order, at v1's widths (30 / 1fr / 1fr / 42 / 38; the routine editor's 30 / 1fr / 1fr / 38)
- the group tag in the group's colour (it is data), the name, the ⋯ and what it opens
- the "Last …" line under the head
- + Set and the action buttons; drop sets' indent
- a lifting block holding its exercises

### `setRow`: Set row

- **Web:** .ex-block .set-row and .rt-sets .set-row (scope it there: a class-prefix selector also catches the settings rows, .set-row-nav); .set-idx (.t-W, .t-F, .t-D); .set-row input; .set-e1rm; .set-check (.on, .coach); .set-row.done; .set-row.flash; .set-row.drop::before; .drop-add-row
- **Native:** src/ui/train/SetRow.jsx SetRow, SetTypeBadge, SetNumInput, CoachPulse
- **Native switches today:** none
- **Switch sites to open:** src/ui/train/SetRow.jsx SetRow (after its hooks); src/ui/train/SetRow.jsx SetTypeBadge
- **Type:** setInput; literal badge and e1RM
- **v1 roles it spends:** `colors.collar`, `tint.setDone`, `tint.setFlash`, `colors.raised`, `colors.steel`, `tint.tagW`, `tint.tagF`, `tint.tagD`, `colors.pYellow`, `colors.pRed`, `colors.pBlue`, `colors.well`, `colors.focus`, `colors.dim`, `colors.knurl`, `colors.done`, `colors.onDone`, `colors.accent`, `tint.coachBase`, `tint.coachLow`, `tint.coachHigh`, `tint.dropRail`, `radius.idx`, `radius.sm`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | five columns under a collar rule: the type badge (raised, radius.idx; W / F / D in their plate colour over a .16 wash), two well inputs (radius.sm, a focus border), the e1RM (10pt dim), a 30 × 30 check (a 1.5pt knurl edge; done = the done ground with an onDone ✓). A done row washes done at .07; a tick flashes accent into done over 600ms; drops hang on a pBlue .45 rail | today |
| `ruled` | deep | rows parted by hairlines (shape.rule.hair); the inputs lose their ground and sit on a 1pt rule; the badge a bare figure (W / F / D keep their letter and colour); done = the filled check with its ✓, and the row wash | iron-age, ledger |
| `attempt` | deep | the attempt card: the badge a 28 × 28 square box (raised; W / F / D as letter colour), the current set's box inverted; square inputs (radius.plate) with a 2pt focus outline; done = a 12pt lamp inside the unchanged 30 × 30 check, lit (done, filled) or unlit (track with a grip ring), in place of the row wash. "Current" is the session's first set not yet done — derived, never stored; the caller passes it | meet-day |

Keeps, whatever the look:
- the five columns, in order, at v1's widths
- the inputs: typed text kept until blur, '' apart from 0, grey targets as placeholders
- the check: 30 × 30 or more, a checkbox, done told by a filled mark (a ✓ or a lit lamp), not by colour alone
- W / F / D and each drop's indent and rail
- swipe to delete; the coach pulse's steady layer; no motion under Reduce Motion

### `plateStrip`: Plate strip

- **Web:** .plate-strip; .plate-strip .lbl; .plate-chip; workout.js renderPlates()
- **Native:** src/ui/train/SetRow.jsx PlateStrip
- **Native switches today:** none
- **Switch sites to open:** src/ui/train/SetRow.jsx PlateStrip
- **Type:** statLbl; literal chip figures
- **v1 roles it spends:** `plates`, `colors.onPlate`, `radius.chip`, `type.statLbl`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | "Per side" (9pt caps), then an n×w chip per plate on its plate colour (radius.chip, onPlate 10pt wdth 92 / 800, tabular); "bar only" or "+x left over" | today |
| `stamp` | deep | each chip a stamped plate: square, a 1pt keyline in the plate's colour, no ground, the figures in chalk | iron-age |
| `loaded` | deep | the loading chart: beside the same chips, the plates drawn edge-on, heaviest innermost, each sized by its plate, 1pt apart, on a short sleeve; no collar; the white and chrome plates edged in grip | meet-day |

Keeps, whatever the look:
- exactly the plates the strip lists today, in its order, and only where it shows today (a barbell at 45 lb or more) — never a second plate calculation
- its words: "Per side", "Per side · lb plates", "bar only", "+x left over"
- each plate's colour from the plates table

### `calCell`: Calendar cell

- **Web:** .cal-dow; .cal-grid; .cal-day (.empty, .pad, .today, .has-work); .cal-daynum; .cal-plates i; .cal-legend
- **Native:** app/(app)/(tabs)/workout/index.jsx DayCell (and the weekday row over the grid)
- **Native switches today:** none
- **Switch sites to open:** app/(app)/(tabs)/workout/index.jsx DayCell
- **Type:** literal
- **v1 roles it spends:** `colors.bar`, `colors.raised`, `colors.accent`, `colors.chalk`, `colors.dim`, `groupPlates`, `radius.sm`, `radius.hair`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | seven columns 4 apart; a 1 : 1.18 cell, radius.sm (a bar ground on the web, none on native), raised when trained; the 12pt day number (dim; chalk when trained; accent at 800 today, with an accent edge); up to four 3pt plate bars in group colours | today |
| `open` | shape | no cell grounds: a trained day shown by its plates and chalk number, today by its keyline and weight | clear-sky |
| `ruled` | deep | a printed calendar: hairlines between cells (shape.rule.hair), no grounds; today boxed by a 2pt keyline | ledger, iron-age |
| `edge` | deep | the plates as edge-on slivers (3 × 10, side by side) under the number in place of stacked bars | meet-day |

Keeps, whatever the look:
- the grid, its first weekday and its pad cells
- the day numbers; at most four plates a day, in group colours
- today told by more than colour (a keyline and 800)
- only trained days open the day sheet

### `chart`: Charts and meters

- **Web:** the SVG the pinned analytics.js draws — .chart-grid, .chart-axis, .chart-line, .chart-dot, .chart-scatter, .chart-peak-ring, .chart-peak-lbl, .chart-bar, .chart-bar-bg, .chart-bar-dim, .chart-barval, .chart-target, .chart-ref, .chart-ring, .ring-track, .ring-fill, .ring-top, .ring-sub, .chart-spark, .spark-line, .spark-line-dim, .spark-glow, .spark-end, .spark-bar, .spark-ref, .spark-none, .chart-donut, .donut-seg, .donut-top, .donut-sub, .chart-empty, .legend-item, .legend-lbl, .legend-val; .heat; you.js .legend-inline, .legend-grid, .ring-cell, .ring-lbl, .ring-of; steps.js .st-ring, .st-ring-n, .st-ring-s (the today ring), .chart-foot; weight.js .wchart, .wc-dot, .wc-avg; meters: .vol-row, .vol-track, .vol-fill, .macro-rows, .traj-bar, .traj-fill, and the calorie meter .cal-meter, .cal-track, .cal-zone, .cal-fill, .cal-tick, .cal-head, .cal-target
- **Native:** src/ui/chart/LineChart.jsx; src/ui/chart/BarChart.jsx; src/ui/chart/Ring.jsx; src/ui/chart/Donut.jsx; src/ui/chart/Sparkline.jsx; src/ui/chart/HeatStrip.jsx; src/ui/chart/Legend.jsx; src/ui/you/bits.jsx VolRow; app/(app)/(tabs)/food.jsx CalMeter; app/(app)/(tabs)/steps.jsx StepRing
- **Native switches today:** src/ui/chart/LineChart.jsx; src/ui/chart/BarChart.jsx; src/ui/chart/Ring.jsx; src/ui/chart/Donut.jsx; src/ui/chart/Sparkline.jsx; src/ui/chart/HeatStrip.jsx; src/ui/chart/Legend.jsx
- **Switch sites to open:** src/ui/you/bits.jsx VolRow; app/(app)/(tabs)/food.jsx CalMeter; app/(app)/(tabs)/steps.jsx StepRing
- **Type:** literal
- **v1 roles it spends:** `colors.pYellow`, `colors.pBlue`, `colors.chalk`, `colors.collar`, `colors.knurl`, `colors.track`, `colors.steel`, `colors.dim`, `colors.faint`, `colors.grip`, `colors.calMark`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | lines over an area wash with a glowing end dot, rounded bars on track, ring and donut arcs, a heat strip of cells, sparklines, dashed targets; meters are rounded bars on track | today |
| `ink` | deep | single-ink strokes: 1.5pt lines with no area and no glow, flat square-topped bars, rings with square caps, hairline grids | ledger, clear-sky |
| `print` | deep | heavier 2pt lines, square-topped bars, the day that is not over hatched in place of dimmed (a shape cue), macro fills optionally hatched with matching legend swatches; no area wash | iron-age |
| `board` | deep | square-topped columns 2 apart, the day that is not over hatched in the knurl pattern, 2pt lines over an LED dot-matrix fill under the line only, square-ended meters with a tick at the target | meet-day |

Keeps, whatever the look:
- every value where v1 draws it: scales, a shared origin for bars, axes and targets
- every label and figure in and under a chart
- the colours the pinned analytics.js paints (index.js PINNED_PAINT) and every data colour's meaning
- the calorie meter's named hues: the white head, the blue / yellow / red zones (index.js HUE_NAMED)
- on the web, no new geometry: analytics.js is pinned, so a look restyles the elements it draws

### `dock`: Dock

- **Web:** #dock / .dock (index.html); .dock button; .dock button svg; .dock button.active; .dock button.active::before (the mark); #dock button.tour-lit::after (auth.css)
- **Native:** src/ui/Dock.jsx Dock
- **Native switches today:** src/ui/Dock.jsx Dock
- **Type:** dockLbl
- **v1 roles it spends:** `tint.dockGlass`, `scrim.dock`, `chrome.blurTint`, `colors.collar`, `colors.dim`, `colors.chalk`, `colors.accent`, `type.dockLbl`, `radius.plate`, `shadow.tourLit`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | glass: rack at .82 over an 18px blur (native: BlurView at 40) under a collar top rule; five cells, 22pt icons (1.9 stroke) over 10pt caps labels in dim; the active one chalk, with a 26 × 2 accent mark on the top edge | today |
| `solid` | shape | an opaque bar ground, no blur, the collar rule; v1's cells and mark | chalk, clear-sky, iron-age |
| `rail` | deep | opaque, under a 2pt rule (shape.rule.ink); the active cell carries a 3pt bar its full width along that rule, and a heavier label | ledger, iron-age |
| `board` | deep | a board strip: five cells parted by shape.gutter, the active cell inverted (inverse ground, knockout icon and label) | meet-day |

Keeps, whatever the look:
- five tabs — You, Train, Fuel, Weight, Steps — their words, order and place at the bottom
- the dock's height (--dock-h, T.layout.dockHeight) and each whole cell as its tap target
- an icon over a label in every cell
- a selected cue that is not colour alone (a mark, a bar, an inversion)
- the tour's lit ring, and the dock inert under the tour

### `fab`: Floating button (Log food)

- **Web:** .fuel-fab; .fuel-fab:active; .fuel-fab svg
- **Native:** app/(app)/(tabs)/food.jsx Fab
- **Native switches today:** none
- **Switch sites to open:** app/(app)/(tabs)/food.jsx Fab
- **Type:** literal
- **v1 roles it spends:** `colors.accent`, `colors.accentPressed`, `colors.onAccent`, `radius.pill`, `shadow.fab`, `shadow.fabPressed`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | an accent pill centred 14 above the dock: a + (2.6 stroke) and "Log food" set in 14pt caps .09em (wdth 92 / 800), onAccent; the fab shadow; pressed = accentPressed, scale .955, the pressed shadow | today |
| `square` | shape | square corners (radius.plate); the vibe's shadow.fab | meet-day |
| `inverse` | deep | the accent leaves it: inverse ground, knockout words and +, square corners | iron-age, meet-day |

Keeps, whatever the look:
- "Log food" and the +, centred above the dock at v1's distance
- at least v1's size
- press feedback

### `addTile`: Add tiles

- **Web:** .add-grid; .add-tile (.hero, .lit, :disabled); .add-tile .ic; .add-tile .t; .add-tile .d; .add-tile .tag
- **Native:** src/ui/food/common.jsx AddTile
- **Native switches today:** none
- **Switch sites to open:** src/ui/food/common.jsx AddTile
- **Type:** literal
- **v1 roles it spends:** `colors.well`, `colors.collar`, `colors.knurl`, `radius.r`, `radius.tile`, `colors.raised`, `colors.grip`, `colors.accent`, `colors.onAccent`, `colors.knockout`, `colors.steel`, `colors.chalk`, `colors.dim`, `colors.tileHero`, `colors.tileLit`, `alpha.accent`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | two columns of well tiles (collar border, radius.r): a 36pt icon well (raised; Photo's in accent with an onAccent icon; lit tiles' in grip), the title, a dim line, and the AI tag pill; Photo and the lit tiles wear accent washes (gradients on the web, flat tileHero / tileLit on native) | today |
| `flat` | shape | no washes and no border: every tile on the well; the Photo tile marked by its accent icon well alone; the tag square (radius.chip) | chalk, navy, oxblood |
| `ruled` | deep | no tiles: a two-column grid parted by hairlines (shape.rule.hair), the icon without its well, the tag a stamped keyline (shape.keyline) | iron-age, ledger |

Keeps, whatever the look:
- the tiles, in order, in two columns
- icons (the icon set's), titles, lines and tags word for word
- a tile that is off stays visible, dimmed, readable and untappable
- the Photo tile stays the first the eye finds

### `sessionChrome`: Live session chrome: the top bar, the live chip, the rest pill, the peek bar

- **Web:** .wk-bar; .wk-bar-left; .wk-name; .timer; .wk-coach (the live chip); .wk-cal-btn; .rest-line; .rest-pill; .rest-pill .t; .rest-pill button; .peek-bar; .peek-name; .peek-bar .timer
- **Native:** app/(app)/(tabs)/workout/session.jsx TopBar; src/ui/train/LiveChrome.jsx Clock; src/ui/coach/live.jsx LiveChip; src/ui/train/RestOverlay.jsx RestOverlay; src/ui/train/PeekBar.jsx PeekBar
- **Native switches today:** none
- **Switch sites to open:** app/(app)/(tabs)/workout/session.jsx TopBar; src/ui/coach/live.jsx LiveChip (after its hook); src/ui/train/RestOverlay.jsx RestOverlay (after its hooks); src/ui/train/PeekBar.jsx PeekBar (after its hooks)
- **Type:** literal (the web top bar's clock is .timer: type.timer)
- **v1 roles it spends:** `colors.bar`, `tint.wkBarGlass`, `scrim.wkBar`, `colors.collar`, `colors.chalk`, `colors.steel`, `colors.accent`, `colors.raised`, `colors.knurl`, `colors.done`, `colors.danger`, `radius.pill`, `radius.r`, `radius.sm`, `shadow.rest`, `shadow.peek`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | the top bar (native: bar ground; web: rack at .9 over a 16px blur) under a collar rule: the session name, the clock (tabular, steel), the Coach chip (38 tall, collar edge, accent caps), the calendar button (38, collar edge), Finish. The rest line, 3pt across the top in done (danger when over). The rest pill: raised, knurl edge, round, the rest shadow — time, +30, Skip. The peek bar: raised, knurl edge, radius.r, the peek shadow — name, clock, Resume | today |
| `flat` | shape | no glass and no shadows: every piece on an opaque ground with its edge; shapes as v1 | chalk, navy, oxblood, clear-sky |
| `slab` | deep | a score bug: square slabs (radius.plate) whose slots are parted by 1pt rules, figures in the vibe's timer type, one slot inverted (the running clock in the top bar, the time in the rest pill: inverse ground, knockout figures); no shadows | meet-day |
| `plate` | deep | stamped plates: square, a keyline (shape.keyline) on the bar ground, no shadow; figures tabular | iron-age |

Keeps, whatever the look:
- every control and its place: name, clock, Coach chip, calendar button, Finish or Save; +30 and Skip; Resume
- the peek bar above the rest pill while a rest runs
- the top bar owns the top inset; on the web it runs under the status bar, so in a light vibe its top band stays dark (§10)
- the rest line's done / danger meaning
- the chip only for Pro and never in an edit; the clock right after a resume
- tap targets at least v1's (the chip and the calendar button are 38)

### `youHero`: You hero (greeting)

- **Web:** .you-hero; .you-avatar; .you-greet; .you-greet-name; .you-sub; .you-gear; .you-since
- **Native:** src/ui/you/Hero.jsx Hero
- **Native switches today:** src/ui/you/Hero.jsx Hero
- **Photo slots:** `youHero`
- **Type:** youGreet
- **v1 roles it spends:** `colors.raised`, `colors.steel`, `colors.accent`, `colors.bar`, `colors.collar`, `colors.dim`, `type.youGreet`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | avatar (52, round, raised) \| the two-line greeting (27pt 800, the name in accent) \| the gear (36, bar ground, collar edge), avatar and gear level with the greeting; the sub-line and the "member since" line | today |
| `banner` | deep | the greeting set in a box over its photo (the youHero slot) under the vibe's scrim; every word over the photo one ink — the name loses the accent (R9.6) | iron-age |
| `stacked` | deep | the avatar above the greeting, left; the gear stays top right | reserved |

Keeps, whatever the look:
- the avatar (tap: a photo), the greeting and name, the gear (tap: settings) at the top right
- the sub-line and "member since …"
- the name ellipsises; the gear never leaves the screen

### `coachCard`: Coach card (skin only)

- **Web:** .coach-card; .coach-card.tight; .coach-card:active; .coach-hd; .coach-ttl; .coach-go; .coach-go-t; .coach-go-q; .coach-go-x
- **Native:** src/ui/coach/Card.jsx CoachCardBody
- **Native switches today:** src/ui/coach/Card.jsx CoachCardBody
- **Photo slots:** `coachCard`
- **Type:** coach-view.js CARD_TYPE, or the vibe's T.fit.metrics
- **v1 roles it spends:** `colors.bar`, `colors.collar`, `colors.knurl`, `radius.r`, `colors.accent`, `colors.warn`, `colors.chalk`, `colors.steel`, `colors.dim`

| Look | Grade | What it draws | Asked for by |
|---|---|---|---|
| `v1` | v1 | bar ground, a 1pt collar border (knurl pressed), radius.r, padding 14, 190 tall on You and 164 on Train; the accent mark and COACH, the lock, the lines, and the COACH ME row over a collar rule | today |
| `flat` | shape | the border drawn in the ground's colour, still 1pt, so no edge shows | chalk, navy |
| `ruled` | deep | no ground: only the top and bottom of the 1pt border drawn, in shape.rule.ink; square corners | ledger, iron-age |
| `plate` | shape | square corners (radius.plate), the border in knurl | reserved |
| `panel` | deep | bar ground, the border in the ground's colour, square corners; a band (shape.band) behind the header row inside the card's own box, taking no layout | meet-day |

Keeps, whatever the look:
- the height (190 / 164), the padding (14) and the border width (1) — cardLayout()'s — unless the vibe measured its own face (T.fit, §6.6) and passes the Coach-surface checks in that vibe
- the face and type, and every line's numberOfLines and lineHeight
- every word: COACH, the lines, the reason, COACH ME, the lead, the chevron; the lock and when it shows
- the whole card as one tap target; the caution line in warn
- no photo unless its text stays legible at 190 / 164 (§11; research drops it, C27)

---

## 7. Renames against `src/ui/variant.js`

No block is renamed. `v1.js` says the list "never renames an entry", and all 17 keys stay as they are.

The changes below are to look names and meanings, plus 12 new blocks. The build phase moves all of these together:
- `src/ui/variant.js` `VARIANTS` and its header table;
- the `// accepts v1 | …` line at every switch;
- `src/ui/theme.js` `VARIANTS`;
- `tools/verify-vibe-seams.mjs`.

**Looks added to existing blocks.** These need 17 `// accepts` lines changed. The other 10 switches keep theirs.

| Block | Adds | Switches whose `// accepts` line changes |
|---|---|---|
| `card` | `panel` | `src/ui/Card.jsx` Card |
| `youCard` | `panel` | `src/ui/you/bits.jsx` YouCard |
| `statRow` | `line`, `folio`, `board` | `src/ui/Stat.jsx` StatRow and Stat (2) |
| `btn` | `inverse`, `panel` | `src/ui/Btn.jsx` |
| `chip` | `stamp` | `src/ui/Chip.jsx` |
| `sheetTitle` | `band` | `src/ui/sheet.js` SheetTitle |
| `dock` | `board` | `src/ui/Dock.jsx` |
| `kpi` | `word` | `src/ui/you/bits.jsx` Kpi |
| `coachCard` | `panel` | `src/ui/coach/Card.jsx` |
| `chart` | `board` | the seven `src/ui/chart/` switches (7) |

**Names kept, meaning changed.** No vibe draws any of these yet, so nothing on screen moves.

| Block · look | `variant.js` said | D.1 says | Why |
|---|---|---|---|
| `sheetHost` · `full` | "edge to edge, no grab handle" | Edge to edge with square top corners and a head rule along the top edge. **The grab handle stays.** | R8.5: the grabber stays, at 3:1 |
| `sectionHeader` · `rule` | "the title between two rules" | The title with **one** head rule, above it or below it by `shape.rule.place` | One rule idiom serves Ledger (a head hanging from a rule) and Iron Age (a head sitting on the Oxford rule) |
| `sectionHeader` · `plain` | "caps alone" | The title alone, set in `type.h3`, with no hairline | A real heading: a size step, not caps (R5, T3 C1) |

**Names kept, meaning spelled out.** `variant.js` gave these a word or less; the look text below is now binding:
- `card`, `youCard`, `coachCard` · `flat`, `ruled`, `plate`;
- `eyebrow` · `tag`, `rule`;
- `statRow` · `ledger`, `lead`;
- `btn` · `square`, `pill`, `outline`;
- `chip` · `square`, `tag`;
- `segmented` · `tabs`, `boxes`;
- `settingsRow` · `ledger`, `tile`;
- `sheetHost` · `inset`;
- `sheetTitle` · `rule`, `centred`;
- `dock` · `solid`, `rail`;
- `screenHeader` · `masthead`, `inline`;
- `kpi` · `plain`, `band`;
- `youHero` · `banner`, `stacked`;
- `chart` · `ink`, `print`.

**Twelve new blocks.** Each needs a key in several places:
- `v1.js` `variants`, with the value `'v1'`;
- `index.js` `VARIANTS`;
- native `theme.js` `VARIANTS`;
- `variant.js` `VARIANTS` and its table;
- and a switch at each site below.

| Block | Looks | Native switch sites to open |
|---|---|---|
| `headline` | v1, rule, stamp, flap | • `src/ui/you/bits.jsx` HeadlineV<br>• the six `T.loadNum()` sites: `food.jsx` ×3, `steps.jsx` ×1, `weight.jsx` ×2. These have no component, so a wrapper that draws the same Text, or a switch at each |
| `field` | v1, square, underline | • `src/ui/Field.jsx` Field<br>• `src/ui/food/common.jsx` TextBox<br>• `src/ui/train/picker.jsx` Search |
| `note` | v1, rule | `src/ui/Note.jsx` Note |
| `toast` | v1, square, strip | `src/ui/ToastHost.jsx` |
| `listRow` | v1, plain, ledger | 13 row components (EntryRow, RecentRow, PrRow, PbRow, SessRow, PickerRow, ExRow, RoutineRow, PreviewRow, DayEx, FindingRow, LibraryRow, ProposedRow). A shared row-skin fragment, as the card Views share `T.cardSkin()`, is the lighter way |
| `setTable` | v1, ruled, panel | • `app/(app)/(tabs)/workout/session.jsx` ExerciseBlock<br>• `src/ui/train/SetRow.jsx` SetTable<br>• `src/ui/train/routines.jsx` EditorExercise |
| `setRow` | v1, ruled, attempt | `src/ui/train/SetRow.jsx`: SetRow (after its hooks) and SetTypeBadge |
| `plateStrip` | v1, stamp, loaded | `src/ui/train/SetRow.jsx` PlateStrip |
| `calCell` | v1, open, ruled, edge | `app/(app)/(tabs)/workout/index.jsx` DayCell |
| `fab` | v1, square, inverse | `app/(app)/(tabs)/food.jsx` Fab |
| `addTile` | v1, flat, ruled | `src/ui/food/common.jsx` AddTile |
| `sessionChrome` | v1, flat, slab, plate | • `app/(app)/(tabs)/workout/session.jsx` TopBar<br>• `src/ui/coach/live.jsx` LiveChip<br>• `src/ui/train/RestOverlay.jsx`<br>• `src/ui/train/PeekBar.jsx`<br>The last three after their hooks |

**New switch sites for blocks that already exist:**
- `screenHeader`: `app/(app)/(tabs)/workout/summary.jsx` draw.hero, the recap's hero (slot `summaryHero`).
- `statRow`: `src/ui/you/bits.jsx` MiniStats.
- `chip`: `src/ui/train/picker.jsx` MoveChip, `src/ui/coach/goal.jsx` GoalChip, `src/ui/coach/sheets.jsx` Chips.
- `btn`: `src/ui/train/SetRow.jsx` DropAdd.
- `settingsRow`: `src/ui/coach/settings.jsx` ToggleRow.
- `chart`: `src/ui/you/bits.jsx` VolRow, `app/(app)/(tabs)/food.jsx` CalMeter, `app/(app)/(tabs)/steps.jsx` StepRing.
- `eyebrow`: the direct `T.text.eyebrow` sites and ChartSub, reading the same variant.
- `card`: `T.cardSkin()`. See finding 5.

**Verifier knock-ons**, read at `cb47196` and `64303c7`:
- **`tools/verify-vibe-seams.mjs` A.**
  - It checks `CONTRACT.length === 17`, which becomes 29.
  - It requires each block's line in `variant.js`'s table to read `<block>  src/…`. `fab` and `calCell` live only under `app/`, so the table's line or the regex has to allow `app/`.
- **`tools/verify-vibe-seams.mjs` B.** Every new switch must have the shape it checks:
  - after its hooks;
  - `case 'v1': default: break;`;
  - an `// accepts` line.
- **Web `tools-check/vibes-contract.mjs`** reads the block list from `index.js` ROLES and holds `v1.js` `variants` to it. It follows once both gain the 12 keys.
- **The native verbatim-copy verifiers** must re-pin `v1.js`, `index.js` and the new `vocab.js`.

## 8. What the engines should know (read from the code)

1. **Type reach.** Two native literal sites pass exactly a preset's arguments. The engine can point them at the preset with no change to v1, and then a vibe's type role reaches them:
   - You's `Section` and Settings' `Sec` title `{10, wdth 88, 700, .16em, caps, dim}` are `type.eyebrow`'s arguments;
   - the KPI tile's label `{9, 88, 700, .1em, caps, dim}` is `type.statLbl`'s.

   Every other literal site keeps v1's sizes and case in a simple vibe; only its face changes. Those sites are:
   - the settings row;
   - ChartSub, HeadlineU and the mini-stat labels;
   - the list rows;
   - DayCell, Fab and AddTile;
   - the rest pill, the peek bar, the top bar and the live chip;
   - the set badge, the e1RM, the plate chips.

   On the web every type rule is literal CSS, and a vibe's stylesheet overrides it by selector.
2. **The web has no hero-slot hooks.**
   - Steps' today card and Weight's log card are plain `.card`s (`steps.js:185`, `weight.js:91`), and no element carries a slot name. Both photos (§6.7) and `card` · `ruled`'s lead card need a hook. That is an attribute or a class, which changes v1's DOM but no pixel; the §7 harness decides whether that is allowed.
   - Fuel's summary already has `.fuel-sum`.
   - On native, Fuel's summary is a plain `<Card>` with the photo inside its first row (`food.jsx:1634`). A `lead` marker is needed there too.
3. **The headline number has no native component.** `T.loadNum(size)` is spent at six sites.
4. **List rows are 13 native components with nothing shared.** See the `listRow` row in §7.
5. **`T.cardSkin()` is shared with blocks that are not cards.**
   - It serves the hand-rolled card Views (`card`).
   - It also serves the stat tile (`statRow`), the segmented track (`segmented`), and GroupPill.
   - A `card` look that reaches the card Views through `cardSkin` must not reach those three.
6. **Web charts are CSS only.** `analytics.js` is pinned, so a look can restyle what it draws (stroke, fill, opacity, dash, caps) but adds no geometry.
   - Hatched and dot-matrix fills need an SVG `<pattern>` in the page, and `vibe.js` provides none yet.
   - Native charts can draw them with react-native-svg `<Pattern>`, already installed.
7. **`setRow` · `attempt` needs the current set.**
   - That is the session's first set not yet done: derived, never stored.
   - The caller passes it.
   - It is a look only. It changes no data and no action.
8. **Meet Day's paper attempt-card sheets are not a look.** They need a per-surface palette, where the sheet's colours differ from the page's (SYNTHESIS Q-E3; track 6 §3.6). Without one, Meet Day ships `sheetHost` · `v1` or `full`, with `sheetTitle` · `band`.
9. **The `.set-row` / `.set-row-nav` name clash.** Scope set-table rules under `.ex-block` or `.rt-sets`, and settings rules under `.set-list` (`tools-check/vibes-scope.mjs` header).
10. **Touch targets v1 draws under 44 stay at least v1's size:**
    - the set check, 30;
    - the live chip and the calendar button, 38;
    - the You gear, 36;
    - the month and day buttons, 34.

    Enlarging them is Micah's (Q-M5).
11. **Light vibes and the workout bar.** On the web, `.wk-bar` runs under the status bar (`margin-top: calc(-1 * var(--app-top))`). In a light vibe its top band stays dark, whatever `sessionChrome` look it wears.
12. **Things no block covers:**
    - **Onboarding's choice cards** (`.ob-choice`) show their chosen state by border colour alone (track 10 §1.3). A deep vibe's stylesheet should add a non-colour cue, but they are neither chip nor card, so they are left out of the vocabulary.
    - **The sync pip, the trial bar and the swipe-to-delete panel** are tokens only.
    - **The tour card** spends `T.cardSkin()`, so it follows `card` if finding 5 is settled that way.
    - **The water vessel and the gear, ⋯ and ‹ › buttons** belong to the icon contract (the vessel encodes a number, R1.4).
    - **Web sign-in and the gates** are restyled by a vibe's CSS on the web only; native keeps them v1 (§10).
13. **`sessionChrome` goes past the brief's "rest pill / peek bar / live chip".** It also takes the session's top bar, because the live chip sits in it and the research wants the live session to read as one thing (SYNTHESIS do-instead 20; track 3 F1).

## 9. Decisions left to Micah (from this job)

- **May a simple vibe name `shape` looks?** D.1 says yes (§2). The alternative is `'v1'` everywhere for simple vibes.
- **Reserved looks that no research direction asks for.** Each costs nothing until drawn. Prune them, or keep them for the concept agents:
  - `btn` · `pill`: research R6.5 keeps pills off buttons.
  - `statRow` · `lead`: R6.7 allows one hero figure per screen.
  - the rest: `card` / `youCard` / `coachCard` · `plate`, `eyebrow` · `tag` / `rule`, `screenHeader` · `inline`, `sheetHost` · `inset`, `sheetTitle` · `centred`, `segmented` · `tabs`, `settingsRow` · `tile`, `kpi` · `band`, `toast` · `strip`, `btn` · `outline`, `chip` · `tag`, `youHero` · `stacked`.
- **The `shape` params** (§4) need a home in the contract. Either:
  - a `shape` object in each definition, plus `ROLES` entries of a new kind; or
  - fixed look geometry with colours only.

  D.1 proposes the first, with v1 holding none. That is an orchestrator call, because `vibes-contract` walks `ROLES` against `v1.js`.
