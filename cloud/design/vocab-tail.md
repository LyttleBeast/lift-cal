
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
