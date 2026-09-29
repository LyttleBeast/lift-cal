// The component vocabulary: the shared building blocks a vibe may re-draw,
// the look each one accepts by name, and what a name may and may not change.
// V59 §9.1 (Phase D.1). It extends the contract beside v1.js and index.js.
//
// HOW A VIBE USES IT. A vibe definition names one look per block —
// `variants: { card: 'ruled', statRow: 'folio', … }` — and 'v1' is today's
// look in every block, which is all v1.js ever names. A name a block does not
// accept draws v1 (native src/ui/variant.js variantOf), so an undrawn or
// misspelt name is today's look, never a broken one.
//
//   native  each block opens with `switch (variantOf('<block>'))`; a look's
//           branch sits above v1's and v1 falls through to today's JSX. The
//           `switches` below exist at rack-mobile cb47196; `add` are the
//           switch sites the build phase still has to open.
//   web     nothing branches at run time. A vibe's own stylesheet
//           (vibes/<id>.css, every selector under [data-vibe="<id>"]) draws the
//           looks its definition names, on the `web` selectors below. The name
//           is what native branches on and what Phase Q compares (§13.5).
//
// THE RULES THIS FILE KEEPS, and why:
// - It imports nothing and is frozen all the way down, like index.js and
//   v1.js: it is copied byte for byte into rack-mobile's src/pure/vibes/defs/
//   and pinned, and every caller shares the one object.
// - Block keys are index.js VARIANTS' seventeen, never renamed (v1.js: "Phase
//   D extends this list; it never renames an entry"), plus twelve new ones.
//   Look names are plain words, /^[a-z][A-Za-z0-9]*$/, 'v1' first — the form
//   rack-mobile tools/verify-vibe-seams.mjs holds variant.js to.
// - A look is geometry, not a vibe: it is drawn from the vibe's own tokens and
//   its `shape` params (below), so two vibes that name the same look get the
//   same shapes in their own colours and faces. No branch reads a vibe's id.
// - Nothing here is a value v1 spends. v1 names 'v1' everywhere and draws no
//   look and reads no param, so nothing in this file can move a v1 pixel.
//
// Research keys in `for` (SYNTHESIS.md §5) are working names for the
// directions that ask for a look — not vibe ids, and not decided.

const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

export default deepFreeze({
  version: 1,

  /* Which vibes may name which looks. 'shape' is the prompt's "small shape
     tokens such as radius or border weight" (§2) as a bundle; that a simple
     vibe may name a shape look is D.1's reading, not a decision — Q or Micah
     may hold simple vibes to 'v1' everywhere. */
  grades: {
    v1: "today's look: the JSX and the CSS as they are",
    shape: 'fill (a surface role, or none), border weight and colour role, corner radius and shadow only: ' +
           'no new drawn device, nothing re-arranged inside the block, no literal type re-set',
    deep: 'adds drawn devices (rules, leaders, bands, keylines, inversions, hatching), re-sets type at literal ' +
          'sites, re-arranges inside the block without changing the order of what it holds'
  },
  allowed: {
    simple: ['v1', 'shape'],
    deep: ['v1', 'shape', 'deep'],
    ironAge: ['v1', 'shape', 'deep'],
    experimental: ['v1', 'shape', 'deep']
  },

  /* What no look in any block may change (§1, §2, §13; SYNTHESIS R1, R7, R8). */
  rules: [
    'Same boxes, same order, same children. A look re-draws its block; it never adds, removes, reorders, merges or ' +
      'splits what the block holds. Re-arranging boxes on a screen is the experimental vibe\'s composition (§12), not a look.',
    'Every word and number identical. Case changes only through a type role\'s `upper`, and only on strings authored ' +
      'in sentence case; never a lowercase transform; \'COACH ME\' is authored in capitals and stays so.',
    'Rules, leaders, dots, ticks and seams are drawn — borders, Views, SVG — never typed. On the web every ::before and ' +
      '::after a vibe writes has content \'\': a pseudo-element never carries a character.',
    'Every control stays where it is and does what it did: the same action, press feedback, accessibility role, label ' +
      'and state. A target v1 draws at 44 or more stays at 44 or more; one v1 draws smaller (the set check 30, the live ' +
      'chip and the calendar button 38, the You gear 36, the month and day buttons 34) keeps at least v1\'s size — ' +
      'enlarging one moves the touch-target snapshot and is Micah\'s call (Q-M5).',
    'Colour only through roles. Chosen, current, done, today, up and down, and danger are never told by colour alone: ' +
      'an inversion, a keyline or rule weight, a fill, a glyph, an arrow.',
    'Text at 4.5:1 (3:1 at 18pt, or 14pt bold) and control edges and graphics at 3:1 against what they sit on — ' +
      'measured on the look\'s own surfaces (a band, a panel, an inverted cell).',
    'No new motion: no entrance, draw-in, count-up or overshoot. A look may drop one of v1\'s animations, never add ' +
      'one. A vibe\'s keyframes are named "<id>-…" (tools-check/vibes-scope.mjs).',
    'No gradient washes, corner glows or glass beyond v1\'s dock, workout bar and sheet backdrop; hard-stop splits ' +
      'and repeating patterns only (SYNTHESIS C22). A texture sits under figures, never under body text.',
    'Photos only in the seven hero slots (native theme.js HERO_SLOTS); never behind set rows, food rows, charts, stat ' +
      'rows or dense numbers.',
    'Fixed boxes stay fixed: the Coach card\'s 190 / 164 with its padding, border and type (unless the vibe measured ' +
      'its own, T.fit, §6.6), the dock\'s height, the sheets\' maximum heights, the set table\'s column widths.',
    'Light vibes: on the web the top safe-area band stays dark, in colors.band (the installed PWA\'s status text is always white); a ' +
      'look drawn under the status bar — the workout bar is — keeps that band dark (§10).',
    'Native mechanics: a switch sits after the block\'s hooks; a colour spent in a reanimated worklet is hoisted as a ' +
      'plain string (SetRow, §6.3); every Text keeps its maxFontSizeMultiplier and explicit lineHeight, floored at the ' +
      'face\'s minLh; a host tree with no photo is v1\'s (§6.7).'
  ],

  /* The params a look reads: a vibe definition's `shape` object. Numbers are
     pt on native and px on the web, as radius is. Colour values name colour
     roles. These defaults apply to any key a definition leaves out; v1 names
     no look, so it reads none of them. index.js ROLES carries each one: native
     build() hands the object on as T.shape, and the web spends each param as a
     --shape-* token (a list as one token per entry, at most three: line, gap,
     line), generated from the definition by tools-check/vibes-css.mjs. */
  params: {
    rule: {
      ink: 'knurl',   // every drawn rule; 3:1 on its ground where it carries structure (R2.2)
      hair: 1,        // a hairline: row, cell and column dividers
      head: [2],      // the head rule, line and gap widths outermost first: [2] one 2pt rule, [3, 2, 1] an Oxford rule
      place: 'above', // the head rule above a head (the head hangs from it) or 'below' it (the head sits on it)
      // The single rule an article sits on — a card's head, an exercise's
      // name, a headline figure — where head is kept for chapters (section
      // heads, a masthead, a sheet's top edge). Its default is head's, so a
      // vibe that sets neither draws one 2pt rule at both.
      sub: [2],
      // The rule a form draws over a total (the recap's session totals, the
      // estimator's total). No block carries those sites yet: a vibe's own
      // stylesheet spends it until one does. Its default is head's.
      total: [2]
    },
    leader: { ink: 'steel', dot: 1.5, pitch: 4, min: 16 },   // drawn dots on the text baseline, name … value
    band: { fill: 'raised', ink: 'chalk', height: 30 },       // a filled strip holding a head's own words
    gutter: 2,                                                // the gap between panels, board cells and strips
    keyline: { ink: 'chalk', width: 1 },                      // a stamped outline: plates, stamps, record cells
    // The tab's lead card — its one kept box under card · ruled — also wears
    // the keyline (shape.keyline's ink and width), for a page its ground alone
    // would vanish on.
    lead: { keyline: false }
  },

  blocks: {
    card: {
      label: 'Card',
      web: ['.card outside #view-you (stats.js card() and the tab screens\' own cards; You\'s and the admin\'s are youCard)', '.card-hd', '.card-sub',
            '.card.fuel-sum (Fuel\'s summary: its tab\'s lead card)'],
      native: ['src/ui/Card.jsx Card, CardHead', 'T.cardSkin() — the hand-rolled card Views that are not <Card> (V59 §6.8)'],
      switches: ['src/ui/Card.jsx Card'],
      add: ['T.cardSkin(): the hand-rolled card Views follow this block, but Stat, Segmented and GroupPill call it for a tile, a track and a pill and follow their own blocks — cardSkin needs to know which it is drawing'],
      slots: ['stepsToday', 'weightLog'],
      reads: ['colors.bar', 'colors.collar', 'radius.r'],
      type: [],
      variants: ['v1', 'flat', 'ruled', 'plate', 'panel'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'bar ground, a 1pt collar border, radius.r, padding 14, 12 below; its head row is the title left, meta and ⋯ right' },
        flat: { grade: 'shape', look: 'the bar ground with no border, radius.r corners: surfaces told apart by value, not outline (R3.2)',
                for: ['chalk', 'navy', 'oxblood'] },
        ruled: { grade: 'deep', look: 'no ground, no border, no radius: the card sits on the page under its article rule (shape.rule.sub, placed by shape.rule.place) drawn full width, its content to the rule\'s width; cards part by space. The tab\'s lead card keeps a box (bar ground, radius.r, no border; the keyline, shape.keyline, when shape.lead.keyline), so the page is never boxes-nowhere (R6.1, R6.10): Fuel\'s summary always, and a hero-slot card (Weight\'s log, Steps\' today) while the vibe draws its photo. A hero-slot card with no photo in the vibe is the open lead: it stands on the page under the tab\'s title, no ground, no sides, no rule of its own',
                 for: ['ledger', 'iron-age', 'clear-sky'] },
        plate: { grade: 'shape', look: 'the bar ground, square corners (radius.plate) and a 2pt keyline in knurl: a stamped nameplate', for: [] },
        panel: { grade: 'deep', look: 'bar ground, no border, square corners (radius.plate), cards parted by shape.gutter; the head row drawn as a band (shape.band) across the top edge holding the title left and meta and ⋯ right in the band\'s ink',
                 for: ['meet-day'] }
      },
      keeps: ['what the card holds, in order; the head\'s title, meta and ⋯ where they are, the ⋯ still opening its sheet',
              'the photo slot on Steps\' today and Weight\'s log cards, drawn inside the look\'s own box',
              'the clearance between the last card and the dock', 'Fuel\'s empty meal card stays one line']
    },

    youCard: {
      label: 'You card',
      web: ['#view-you .card (you.js card(); the owner-only admin borrows #view-you, so its cards take this look too)',
            '.card-hd', '.card-right', '.card-sub', '.card-why', '.card-wins', '.card-improve'],
      native: ['src/ui/you/bits.jsx YouCard'],
      switches: ['src/ui/you/bits.jsx YouCard'],
      add: [],
      slots: [],
      reads: ['colors.bar', 'colors.collar', 'radius.r', 'type.eyebrow', 'colors.dim', 'colors.good', 'colors.warn'],
      type: ['eyebrow'],
      variants: ['v1', 'flat', 'ruled', 'plate', 'panel'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'as card, with the eyebrow title, the meta and ⋯ in its head; Wins and Improve carry a 3pt left rule in good / warn' },
        flat: { grade: 'shape', look: 'as card\'s flat; the Wins / Improve colour moves to a 2pt top border (no side stripe, R6.4)', for: ['chalk', 'navy', 'oxblood'] },
        ruled: { grade: 'deep', look: 'as card\'s ruled; the Wins / Improve colour inks the head rule instead of a side stripe', for: ['ledger', 'iron-age', 'clear-sky'] },
        plate: { grade: 'shape', look: 'as card\'s plate; the Wins / Improve colour inks the keyline', for: [] },
        panel: { grade: 'deep', look: 'as card\'s panel; the Wins / Improve colour fills a 3pt rule under the band', for: ['meet-day'] }
      },
      keeps: ['as card', 'the ⋯ opens the same "Where this comes from" sheet', 'which card is Wins and which Improve stays in its title words, not only its colour']
    },

    eyebrow: {
      label: 'Card head / eyebrow',
      web: ['.eyebrow (card heads, screen titles, sheet eyebrows)', '.chart-sub (a small head inside a card)'],
      native: ['src/ui/Card.jsx Eyebrow', 'the direct T.text.eyebrow sites', 'src/ui/you/bits.jsx ChartSub'],
      switches: ['src/ui/Card.jsx Eyebrow'],
      add: ['the direct T.text.eyebrow sites and ChartSub, which draw an eyebrow without <Eyebrow>, reading the same variant'],
      slots: [],
      reads: ['type.eyebrow', 'colors.dim'],
      type: ['eyebrow'],
      variants: ['v1', 'tag', 'rule'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: '10pt, wdth 88 / 700, caps tracked .16em, dim, no device. Case, size, tracking and ink are type.eyebrow\'s: a simple vibe changes them there (upper: 0 — the strings are authored in sentence case), with no look' },
        tag: { grade: 'deep', look: 'the words in a filled tag: raised ground, radius.chip, 2 × 6 padding', for: [] },
        rule: { grade: 'deep', look: 'a short 16pt rule (shape.rule.ink, 1pt) before the words, on their x-height', for: [] }
      },
      keeps: ['the words, above the title or inside the head row as today']
    },

    sectionHeader: {
      label: 'Section header',
      web: ['.you-sec', '.you-sec-t', '.you-sec-t::after (the hairline)', 'you.js section()', 'settings.js section()', 'admin.js section()'],
      native: ['src/ui/you/bits.jsx Section', 'src/ui/settings/index.jsx Sec'],
      switches: ['src/ui/you/bits.jsx Section', 'src/ui/settings/index.jsx Sec'],
      add: [],
      slots: [],
      reads: ['colors.dim', 'colors.collar'],
      type: ['literal — the same arguments as type.eyebrow at both native sites'],
      variants: ['v1', 'rule', 'banner', 'plain'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'the title (10pt caps .16em, dim) and a collar hairline running on to the edge; 26 above, 10 below' },
        rule: { grade: 'deep', look: 'the title with the head rule (shape.rule.head in shape.rule.ink) at full width, above it or below it by shape.rule.place; no trailing hairline',
                for: ['ledger', 'iron-age'] },
        banner: { grade: 'deep', look: 'a full-width band (shape.band) with the title inside it, left; the hairline becomes a shape.gutter gap', for: ['meet-day'] },
        plain: { grade: 'deep', look: 'the title alone, set as a real head in type.h3; no hairline', for: ['clear-sky'] }
      },
      keeps: ['the title\'s words', 'each section\'s cards under it, in order']
    },

    screenHeader: {
      label: 'Screen header',
      web: ['.cal-hd holding .eyebrow + h1 (workout.js calendar, food.js, weight.js, steps.js) with .cal-nav on the right',
            'stats.js and admin.js pageHead() (with .back-btn)', '.summary-hero (.eyebrow, h1, .summary-line, .summary-date)'],
      native: ['src/ui/Card.jsx ScreenTitle (Train, Fuel, Weight, Steps)', 'src/ui/train/stats.jsx PageHead',
               'app/(app)/(tabs)/workout/summary.jsx the recap\'s hero block'],
      switches: ['src/ui/Card.jsx ScreenTitle', 'src/ui/train/stats.jsx PageHead'],
      add: ['app/(app)/(tabs)/workout/summary.jsx draw.hero'],
      slots: ['summaryHero'],
      reads: ['type.eyebrow', 'type.h1'],
      type: ['eyebrow', 'h1'],
      variants: ['v1', 'masthead', 'inline'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'the eyebrow over a 26pt h1 (wdth 78 / 800); the nav buttons right of it' },
        masthead: { grade: 'deep', look: 'a larger title and a full-width head rule (shape.rule.head) placed by shape.rule.place — under the title, the eyebrow above both; or (\'above\') the page\'s running head: the eyebrow set small (type.statLbl) over a hairline (shape.rule.hair) across the title\'s column, the title standing clear under it on space, no head rule; the nav buttons keep their place', for: ['iron-age', 'ledger'] },
        inline: { grade: 'deep', look: 'the eyebrow and the title on one baseline, the eyebrow first', for: [] }
      },
      keeps: ['the nav buttons, their order, actions and size (the month and day buttons are 34 in v1 — never smaller); Back',
              'the recap\'s line and date under its headline', 'the title\'s words: a month, "Today", a date']
    },

    sheetHost: {
      label: 'Sheet',
      web: ['.sheet', '.sheet-grab', '.sheet-backdrop', '.sheet.coach-sheet', 'ui.js sheet(), confirmSheet()'],
      native: ['src/ui/Sheet.jsx SheetHost', 'src/ui/sheet.js sheet(), confirmSheet()'],
      switches: ['src/ui/Sheet.jsx SheetHost'],
      add: [],
      slots: [],
      reads: ['colors.bar', 'colors.knurl', 'colors.grip', 'radius.sheet', 'tint.backdrop', 'scrim.sheet'],
      type: [],
      variants: ['v1', 'inset', 'full'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'bar ground, 18pt top corners, a knurl top edge, a 36 × 4 grab handle in grip, up to 86% of the screen (92% tall) less the top inset; the backdrop is shade at .6 (and a 3px blur on the web)' },
        inset: { grade: 'deep', look: 'a floating panel 8 off both sides and the bottom, all four corners radius.sheet, the same maximum height', for: [] },
        full: { grade: 'deep', look: 'edge to edge with square top corners (radius.plate) and the head rule (shape.rule.head) along its top edge in place of the round shoulder; the grab handle stays',
                for: ['iron-age', 'meet-day'] }
      },
      keeps: ['the maximum heights (86 / 92, less the top inset)',
              'dismissal: a backdrop tap, a swipe down, the sheet\'s own Close or Cancel; the estimator\'s phase that cannot be dismissed',
              'the grab handle, at 3:1 against the sheet in any non-v1 vibe (R8.5)',
              'one sheet at a time; the body scrolls; the keyboard lifts the sheet and the Done bar rides it']
    },

    sheetTitle: {
      label: 'Sheet title',
      web: ['.sheet h2 (the eyebrow above it is the eyebrow block)'],
      native: ['src/ui/sheet.js SheetTitle'],
      switches: ['src/ui/sheet.js SheetTitle'],
      add: [],
      slots: [],
      reads: ['type.h2'],
      type: ['h2'],
      variants: ['v1', 'rule', 'centred', 'band'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'an 18pt h2 (wdth 78 / 800), left, no device' },
        rule: { grade: 'deep', look: 'the title over a hairline (shape.rule.hair in shape.rule.ink) at the sheet\'s full content width', for: ['iron-age', 'ledger'] },
        centred: { grade: 'deep', look: 'the title centred', for: [] },
        band: { grade: 'deep', look: 'the title inside a band (shape.band) drawn to the sheet\'s edges', for: ['meet-day'] }
      },
      keeps: ['the title\'s words; its eyebrow stays above it', 'no smaller gap to the first content than v1\'s']
    },

    statRow: {
      label: 'Stat row',
      web: ['.stat-row', '.stat', '.stat-val', '.stat-lbl', 'you.js, stats.js and admin.js statRow()', '.mini-stats', '.mini-stat', '.mini-stat-v', '.mini-stat-l'],
      native: ['src/ui/Stat.jsx StatRow, Stat', 'src/ui/you/bits.jsx MiniStats'],
      switches: ['src/ui/Stat.jsx StatRow', 'src/ui/Stat.jsx Stat'],
      add: ['src/ui/you/bits.jsx MiniStats'],
      slots: [],
      reads: ['colors.bar', 'colors.collar', 'radius.sm', 'type.statVal', 'type.statLbl', 'colors.well'],
      type: ['statVal', 'statLbl'],
      variants: ['v1', 'ledger', 'lead', 'line', 'folio', 'board', 'runin'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'three tiles 8 apart, each bar ground, collar border, radius.sm, padding 10: a 20pt value (wdth 108 / 800, tabular) over a 9pt caps label in dim. Mini stats: the same in small, on the well' },
        ledger: { grade: 'deep', look: 'one line per stat, in order: the label left, a drawn leader (shape.leader), the value right; lines on a 44pt pitch, no box', for: ['ledger'] },
        lead: { grade: 'deep', look: 'the first stat large and the other two small beside it (1 + 2), no boxes. A screen may have one hero figure (R6.7): a vibe naming lead gives up its headline there', for: [] },
        line: { grade: 'shape', look: 'a box-score line: no ground and no outer border; the values on one baseline with a 1pt rule (collar or knurl) between columns, labels under them', for: ['chalk', 'clear-sky', 'ledger'] },
        folio: { grade: 'deep', look: 'the line between two hairlines (shape.rule.hair) above and below it: the period folio line', for: ['iron-age'] },
        board: { grade: 'deep', look: 'one board strip: the cells butt together with shape.gutter gaps, bar ground, no border, square corners', for: ['meet-day'] },
        runin: { grade: 'deep', look: 'a run-in line of figures, as a page sets them in its text: each value with its label after it on the same baseline, the stats in order one after another, 18 apart, wrapping as a line of text wraps; no columns, no rules, no ground. A total sits under the double rule (shape.rule.total)', for: ['iron-age'] }
      },
      keeps: ['the stats and their order', 'a value\'s own colour where its caller gives one (a group or subject colour)',
              'tabular figures; a value never truncates (a label may wrap)']
    },

    kpi: {
      label: 'KPI tile',
      web: ['.kpi-grid', '.kpi', '.kpi-hd', '.kpi-lbl', '.kpi-val', '.kpi-unit', '.kpi-prev', '.kpi-days i', '.delta-pill', '.kpi .chart-spark', 'you.js kpi()'],
      native: ['src/ui/you/bits.jsx Kpi'],
      switches: ['src/ui/you/bits.jsx Kpi'],
      add: [],
      slots: [],
      reads: ['colors.well', 'colors.collar', 'radius.sm', 'kpi', 'tint.pillBase', 'tint.pillUp', 'tint.pillDown', 'tint.pillWarn',
              'colors.good', 'colors.bad', 'colors.warn', 'colors.dim', 'type.kpiVal', 'shadow.kpiDay', 'shadow.kpiToday'],
      type: ['kpiVal', 'literal label — the same arguments as type.statLbl'],
      variants: ['v1', 'plain', 'band', 'word'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'a well tile (collar border, radius.sm) with its subject\'s corner tint (a radial wash on the web, a flat corner block on native); the 9pt caps label and the delta in a tinted pill; the 22pt value and unit; "last week …"; a 46pt sparkline; seven day dots, today ringed' },
        plain: { grade: 'shape', look: 'the tile without its corner tint. The delta pill\'s fill is tint.pill*, which a vibe may set to 0 without a look', for: ['chalk', 'navy', 'oxblood'] },
        band: { grade: 'deep', look: 'no corner tint; a 3pt band of the subject colour across the tile\'s top edge', for: [] },
        word: { grade: 'deep', look: 'no tile: the sparkline drawn word-sized (17–22 tall, 60–90 wide, a 3–4pt end dot, no frame) in its own place; the delta in its pill while the vibe\'s tint.pill* are above 0, and as bare signed text with its arrow when they are 0', for: ['clear-sky', 'iron-age'] }
      },
      keeps: ['the 2 × 2 grid and its order', 'every figure; the arrow on each delta and its "…" / "–" states',
              'seven day dots, today ringed (a shape cue)', '"last week …" in its place']
    },

    headline: {
      label: 'Headline number',
      web: ['.load-num (food.js Fuel\'s summary and the targets preview, steps.js today, water.js total, weight.js peak and maintenance)', '.fuel-top',
            '.headline', '.headline-v', '.headline-u (you.js)'],
      native: ['T.loadNum(size) at app/(app)/(tabs)/food.jsx (3 sites), steps.jsx (1), weight.jsx (2)', 'src/ui/you/bits.jsx Headline, HeadlineV, HeadlineU'],
      switches: [],
      add: ['src/ui/you/bits.jsx HeadlineV', 'the six T.loadNum sites, which have no component (a wrapper that draws the same Text, or a switch at each)'],
      slots: ['fuelSummary'],
      reads: ['loadNum', 'type.headline'],
      type: ['headline', 'loadNum'],
      variants: ['v1', 'rule', 'stamp', 'flap'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'the figure alone: loadNum is wdth 118 / 800, tabular, -.02em, line-height .95, at 26–40; You\'s headline is 34pt wdth 112 / 800 with its unit beside it. Face, width and weight are type roles, with no look' },
        rule: { grade: 'deep', look: 'the challenge line: the figure over the article rule (shape.rule.sub), its unit on the same baseline', for: ['iron-age'] },
        stamp: { grade: 'deep', look: 'the figure inside a keyline plate (shape.keyline, square corners): a stamped scale plate, a record cell', for: ['iron-age', 'meet-day'] },
        flap: { grade: 'deep', look: 'a split-flap cell behind the figure: two flat halves meeting at 50% with no blend (C22) and a 1pt seam; only at 32pt and up', for: ['meet-day'] }
      },
      keeps: ['the figure\'s text, sign and "≈"', 'its colour role (Fuel\'s zone colour, Weight\'s pYellow) — except over a photo, where every word is one ink (R9.6)',
              'its unit and qualifier where they are']
    },

    chip: {
      label: 'Chip',
      web: ['.chip', '.chip.on', '.filter-row', '.chip-row', '.move-opt', '.coach-chip', '.coach-goal-opt'],
      native: ['src/ui/Chip.jsx Chip, ChipRow', 'src/ui/train/picker.jsx MoveChip', 'src/ui/coach/goal.jsx GoalChip', 'src/ui/coach/sheets.jsx Chips'],
      switches: ['src/ui/Chip.jsx Chip'],
      add: ['src/ui/train/picker.jsx MoveChip', 'src/ui/coach/goal.jsx GoalChip', 'src/ui/coach/sheets.jsx Chips'],
      slots: [],
      reads: ['colors.well', 'colors.collar', 'colors.inverse', 'colors.knockout', 'radius.pill', 'type.chip'],
      type: ['chip'],
      variants: ['v1', 'square', 'tag', 'stamp'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'a pill on the well with a collar border, 11pt steel; chosen = inverted (inverse ground, knockout words, inverse border)' },
        square: { grade: 'shape', look: 'square corners (radius.chip); otherwise v1', for: ['meet-day'] },
        tag: { grade: 'shape', look: 'a filled tag: raised ground, no border, radius.chip; chosen = inverted', for: [] },
        stamp: { grade: 'deep', look: 'a stamped plate: no ground, a keyline (shape.keyline), square; chosen = filled with inverse and knockout words', for: ['iron-age'] }
      },
      keeps: ['chosen shown by inversion or fill, never colour alone', 'the row scrolls sideways as v1\'s does; the labels',
              'chips that are 44 tall in v1 (Movement, the feel and goal chips) stay 44']
    },

    segmented: {
      label: 'Segmented control',
      web: ['.seg', '.seg-btn', '.seg-btn.on', 'ui.js segmented()'],
      native: ['src/ui/Segmented.jsx Segmented'],
      switches: ['src/ui/Segmented.jsx Segmented'],
      add: [],
      slots: [],
      reads: ['colors.bar', 'colors.collar', 'radius.pill', 'colors.inverse', 'colors.knockout', 'type.segBtn'],
      type: ['segBtn'],
      variants: ['v1', 'tabs', 'boxes'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'a pill track (bar ground, collar border) with pill segments; the chosen one inverted; 11pt caps .06em' },
        tabs: { grade: 'deep', look: 'no track: the options as words, the chosen one in chalk over a 2pt underline — the underline is the cue', for: [] },
        boxes: { grade: 'shape', look: 'joined square cells (radius.plate) with 1pt rules between them; the chosen cell inverted', for: ['iron-age', 'meet-day'] }
      },
      keeps: ['the options in order, at equal widths', 'a tap on the chosen option does nothing', 'chosen told by inversion or underline',
              'at least v1\'s height']
    },

    btn: {
      label: 'Buttons (primary, plain, ghost, danger; large; block)',
      web: ['.btn', '.btn-primary', '.btn-ghost', '.btn-danger', '.btn-lg', '.btn-block', '.btn-split',
            'local resizes: .peek-bar .btn, .ex-actions .btn, .add-row .btn, .qty-row .btn, .wk-block-btn, .drop-add'],
      native: ['src/ui/Btn.jsx Btn (kind primary | danger | ghost | plain; large; block)', 'src/ui/train/SetRow.jsx DropAdd',
               'src/ui/you/bits.jsx GoBtn (a ghost Btn)'],
      switches: ['src/ui/Btn.jsx Btn'],
      add: ['src/ui/train/SetRow.jsx DropAdd'],
      slots: ['startWorkout'],
      reads: ['colors.accent', 'colors.onAccent', 'colors.danger', 'colors.steel', 'colors.collar', 'colors.raised', 'colors.chalk', 'radius.sm', 'type.btn', 'type.btnLg'],
      type: ['btn', 'btnLg'],
      variants: ['v1', 'square', 'pill', 'outline', 'inverse', 'panel'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'radius.sm, 12 × 18 padding (large: 16 all round, 16pt caps .06em), 44 tall at least on the web; primary = accent ground, onAccent words; plain = raised, chalk; ghost = collar keyline, steel; danger = danger keyline and words; pressed scale .97; disabled at .4' },
        square: { grade: 'shape', look: 'every kind square-cornered (radius.plate); ghost and danger keylines 1.5pt', for: ['meet-day'] },
        pill: { grade: 'shape', look: 'every kind fully round (radius.pill). R6.5 keeps pills to chips, segmented controls and the toast: reserved, and no direction asks for it', for: [] },
        outline: { grade: 'shape', look: 'primary as an accent keyline with accent words and no ground; the other kinds as v1', for: [] },
        inverse: { grade: 'deep', look: 'the accent leaves the primary (T3 E1): primary = inverse ground, knockout words, square corners; plain = raised, square; ghost = no box, its words underlined 1pt in steel, the 44 hit area kept by padding; danger = a square danger keyline',
                   for: ['iron-age', 'ledger'] },
        panel: { grade: 'deep', look: 'the lit panel: square corners; primary = inverse ground, knockout words; plain and ghost = the raised ground ("a cell"), chalk words, no border; danger = a square danger keyline',
                 for: ['meet-day'] }
      },
      keeps: ['every button\'s words, kind and place', 'danger told apart by keyline and ink, not colour alone',
              'the primary stays the most prominent control on its screen', '44 at least where v1 is; block width; press scale; disabled at .4',
              'Start workout\'s photo slot']
    },

    field: {
      label: 'Text field',
      web: ['.field', '.field label', '.field input', '.field select', '.field-lbl', '.auth-err',
            'the recessed in-card inputs: .qty-row input, .picker-search input, .paste-box'],
      native: ['src/ui/Field.jsx Field, FieldError', 'src/ui/food/common.jsx FieldLbl, TextBox', 'src/ui/train/picker.jsx Search'],
      switches: [],
      add: ['src/ui/Field.jsx Field', 'src/ui/food/common.jsx TextBox', 'src/ui/train/picker.jsx Search'],
      slots: [],
      reads: ['colors.bar', 'colors.well', 'colors.collar', 'colors.focus', 'colors.chalk', 'colors.dim', 'colors.danger', 'radius.sm', 'type.fieldLbl', 'type.body', 'chrome.keyboard'],
      type: ['fieldLbl', 'body'],
      variants: ['v1', 'square', 'underline'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'a 10pt caps label (dim) over a box: bar ground (the well for in-card inputs), collar border, radius.sm, padding 12; focus turns the border to focus' },
        square: { grade: 'shape', look: 'square corners (radius.plate) and a knurl border, a 3:1 control edge (R2.2); focus as v1', for: ['meet-day'] },
        underline: { grade: 'deep', look: 'no box: the value on a 1pt rule (shape.rule.ink); focus thickens it to 2pt in focus — the thickness is the cue', for: ['iron-age', 'ledger'] }
      },
      keeps: ['the label above the field, its words', 'placeholders, keyboard type and appearance, commit rules', 'a focus cue at 3:1',
              'the field\'s height and the error line\'s reserved room']
    },

    note: {
      label: 'Note',
      web: ['.note', 'ui.js noteEl()'],
      native: ['src/ui/Note.jsx Note'],
      switches: [],
      add: ['src/ui/Note.jsx Note'],
      slots: [],
      reads: ['type.note'],
      type: ['note'],
      variants: ['v1', 'rule'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: '12pt dim, line-height 1.5, 8 above. Most of what a vibe wants here is type.note: 12pt or more, ink at 4.5:1 (v1\'s dim is 2.70:1 on bar)' },
        rule: { grade: 'deep', look: 'a footnote: a 16pt hairline (shape.rule.hair in shape.rule.ink) above the note', for: ['iron-age'] }
      },
      keeps: ['the words, where they are']
    },

    toast: {
      label: 'Toast',
      web: ['.toast', 'ui.js toast()'],
      native: ['src/ui/ToastHost.jsx ToastHost'],
      switches: [],
      add: ['src/ui/ToastHost.jsx ToastHost'],
      slots: [],
      reads: ['colors.inverse', 'colors.knockout', 'radius.pill', 'shadow.toast', 'type.btn'],
      type: ['btn'],
      variants: ['v1', 'square', 'strip'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'an inverted pill (inverse ground, knockout words, 13pt wdth 92 / 700), centred 16 above the dock, with the toast shadow' },
        square: { grade: 'shape', look: 'square corners (radius.plate), no shadow', for: ['iron-age', 'meet-day'] },
        strip: { grade: 'deep', look: 'an inverted strip the content\'s width, square, the words left', for: [] }
      },
      keeps: ['the message; one at a time; 2.2 seconds', 'above sheets, never tappable', 'its place above the dock']
    },

    settingsRow: {
      label: 'Settings row',
      web: ['.set-list', '.set-row-nav', '.set-row-l', '.set-row-v', '.set-row-x', '.set-row-tog', '.set-row-sub', 'settings.js navRow()'],
      native: ['src/ui/settings/Row.jsx SettingsRow, SettingsList', 'src/ui/coach/settings.jsx ToggleRow'],
      switches: ['src/ui/settings/Row.jsx SettingsList', 'src/ui/settings/Row.jsx SettingsRow'],
      add: ['src/ui/coach/settings.jsx ToggleRow'],
      slots: [],
      reads: ['colors.collar', 'colors.chalk', 'colors.steel', 'colors.dim', 'tint.rowPress'],
      type: ['literal: 14pt wdth 92 / 600 label, 12pt steel tabular value, 17pt chevron'],
      variants: ['v1', 'ledger', 'tile'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'full-width rows, 13 × 2 padding, a collar rule between rows (none above the first); the label 14pt chalk, the value 12pt steel, a › chevron in dim; pressed = the rowPress wash' },
        ledger: { grade: 'deep', look: 'a drawn leader (shape.leader) from the label to the value; no rules between rows, one hairline under the group', for: ['ledger', 'iron-age'] },
        tile: { grade: 'shape', look: 'each row its own tile: well ground, radius.sm, 6 apart, no rules', for: [] }
      },
      keeps: ['the chevron on every row that opens something — its only signal', 'label, value, chevron, in that order',
              'the full-width tap target, 44 tall', 'the toggle rows\' switches and sub-lines']
    },

    listRow: {
      label: 'List rows',
      web: ['.food-entry', '.pb-row', '.pr-hit', '.pr-row', '.rank-row', '.sess-row', '.ex-item', '.find-row', '.review-row', '.rt-item', '.rt-pv-row',
            '.day-ex', '.st-row', '.guide-row', '.person (auth.css; admin)'],
      native: ['app/(app)/(tabs)/food.jsx EntryRow', 'app/(app)/(tabs)/steps.jsx RecentRow', 'src/ui/train/stats.jsx PrRow, PbRow, SessRow, PickerRow',
               'src/ui/train/picker.jsx ExRow', 'src/ui/train/routines.jsx RoutineRow, PreviewRow', 'src/ui/train/DayEx.jsx DayEx',
               'src/ui/you/bits.jsx FindingRow', 'src/ui/food/common.jsx LibraryRow, ProposedRow'],
      switches: [],
      add: ['each row component above — a switch in each, or one row-skin fragment they spread, as the card Views spread T.cardSkin()'],
      slots: [],
      reads: ['colors.collar', 'colors.chalk', 'colors.steel', 'colors.dim', 'colors.accent', 'tint.pickSel'],
      type: ['literal at every row'],
      variants: ['v1', 'plain', 'ledger'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'rows 9–11 padded top and bottom, a collar rule between rows (none above the first); the name 13–14pt 600, an 11pt dim line under it, the value right at 15pt wdth 108 / 800' },
        plain: { grade: 'shape', look: 'no rules between rows — separators between groups only (T3 D2); rows at least on a 44pt pitch', for: ['clear-sky', 'ledger'] },
        ledger: { grade: 'deep', look: 'on name … value rows (PR, PB, rank, session, food entry, recent steps): a drawn leader (shape.leader) from the name to the value, the value alone at 800 (bold only the ranked column, T3 D5); rows of another shape draw as plain',
                  for: ['ledger', 'iron-age', 'meet-day'] }
      },
      keeps: ['every row, in order, with its tap target and swipe to delete', 'the chosen and PR states told by more than colour',
              'the name ellipsises; the value never truncates']
    },

    setTable: {
      label: 'Set table (the exercise card)',
      web: ['.ex-block', '.ex-hd', '.ex-tag', '.ex-name', '.ex-menu', '.ex-prev', '.ex-block .set-hd', '.ex-actions',
            '.wk-block, .wk-block-hd, .wk-block-title (a lifting block)', '.rt-sets .set-hd (the routine editor)'],
      native: ['app/(app)/(tabs)/workout/session.jsx ExerciseBlock', 'src/ui/train/SetRow.jsx SetTable', 'src/ui/train/routines.jsx EditorExercise, EditorBlock'],
      switches: [],
      add: ['app/(app)/(tabs)/workout/session.jsx ExerciseBlock', 'src/ui/train/SetRow.jsx SetTable', 'src/ui/train/routines.jsx EditorExercise'],
      slots: [],
      reads: ['colors.bar', 'colors.collar', 'radius.r', 'groupPlates', 'colors.dim', 'type.statLbl', 'colors.knurl', 'tint.block', 'colors.accent'],
      type: ['statLbl'],
      variants: ['v1', 'ruled', 'panel'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'the exercise card: bar ground, collar border, radius.r, clipped; a head of the 4 × 30 group tag, the name (15pt wdth 88 / 700) and ⋯; the grey "Last …" line; 9pt caps column heads; the rows; the action buttons. A lifting block wraps its cards in a knurl keyline over an accent .03 wash, under an accent caps title' },
        ruled: { grade: 'deep', look: 'no box: the name over the article rule (shape.rule.sub); the column heads over a 1pt rule; the rows parted by hairlines (setRow); a lifting block as a rule-framed group', for: ['iron-age', 'ledger'] },
        panel: { grade: 'deep', look: 'bar ground, no border, square corners, cards parted by shape.gutter; the head drawn as a band (shape.band) holding the group tag, the name and ⋯', for: ['meet-day'] }
      },
      keeps: ['the columns, in order, at v1\'s widths (30 / 1fr / 1fr / 42 / 38; the routine editor\'s 30 / 1fr / 1fr / 38)',
              'the group tag in the group\'s colour (it is data), the name, the ⋯ and what it opens', 'the "Last …" line under the head',
              '+ Set and the action buttons; drop sets\' indent', 'a lifting block holding its exercises']
    },

    setRow: {
      label: 'Set row',
      web: ['.ex-block .set-row and .rt-sets .set-row (scope it there: a class-prefix selector also catches the settings rows, .set-row-nav)',
            '.set-idx (.t-W, .t-F, .t-D)', '.set-row input', '.set-e1rm', '.set-check (.on, .coach)', '.set-row.done', '.set-row.flash',
            '.set-row.drop::before', '.drop-add-row'],
      native: ['src/ui/train/SetRow.jsx SetRow, SetTypeBadge, SetNumInput, CoachPulse'],
      switches: [],
      add: ['src/ui/train/SetRow.jsx SetRow (after its hooks)', 'src/ui/train/SetRow.jsx SetTypeBadge'],
      slots: [],
      reads: ['colors.collar', 'tint.setDone', 'tint.setFlash', 'colors.raised', 'colors.steel', 'tint.tagW', 'tint.tagF', 'tint.tagD',
              'tagInk', 'colors.pYellow', 'colors.pRed', 'colors.pBlue', 'colors.well', 'colors.focus', 'colors.dim', 'colors.knurl', 'colors.done',
              'colors.onDone', 'colors.accent', 'tint.coachBase', 'tint.coachLow', 'tint.coachHigh', 'tint.dropRail', 'radius.idx', 'radius.sm'],
      type: ['setInput', 'literal badge and e1RM'],
      variants: ['v1', 'ruled', 'attempt'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'five columns under a collar rule: the type badge (raised, radius.idx; W / F / D in their plate colour — tagInk — over a .16 wash, tint.tag*), two well inputs (radius.sm, a focus border), the e1RM (10pt dim), a 30 × 30 check (a 1.5pt knurl edge; done = the done ground with an onDone ✓). A done row washes done at .07; a tick flashes accent into done over 600ms; drops hang on a pBlue .45 rail' },
        ruled: { grade: 'deep', look: 'rows parted by hairlines (shape.rule.hair); the inputs lose their ground and sit on a 1pt rule; the badge a bare figure (W / F / D keep their letter, inked in tagInk); done = the filled check with its ✓, and the row wash',
                 for: ['iron-age', 'ledger'] },
        attempt: { grade: 'deep', look: 'the attempt card: the badge a 28 × 28 square box (raised; W / F / D inked in tagInk), the current set\'s box inverted; square inputs (radius.plate) with a 2pt focus outline; done = a 12pt lamp inside the unchanged 30 × 30 check, lit (done, filled) or unlit (track with a grip ring), in place of the row wash. "Current" is the session\'s first set not yet done — derived, never stored; the caller passes it',
                   for: ['meet-day'] }
      },
      keeps: ['the five columns, in order, at v1\'s widths', 'the inputs: typed text kept until blur, \'\' apart from 0, grey targets as placeholders',
              'the check: 30 × 30 or more, a checkbox, done told by a filled mark (a ✓ or a lit lamp), not by colour alone',
              'W / F / D and each drop\'s indent and rail', 'swipe to delete; the coach pulse\'s steady layer; no motion under Reduce Motion']
    },

    plateStrip: {
      label: 'Plate strip',
      web: ['.plate-strip', '.plate-strip .lbl', '.plate-chip', 'workout.js renderPlates()'],
      native: ['src/ui/train/SetRow.jsx PlateStrip'],
      switches: [],
      add: ['src/ui/train/SetRow.jsx PlateStrip'],
      slots: [],
      reads: ['plates', 'colors.onPlate', 'radius.chip', 'type.statLbl'],
      type: ['statLbl', 'literal chip figures'],
      variants: ['v1', 'stamp', 'loaded'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: '"Per side" (9pt caps), then an n×w chip per plate on its plate colour (radius.chip, onPlate 10pt wdth 92 / 800, tabular); "bar only" or "+x left over"' },
        stamp: { grade: 'deep', look: 'each chip a stamped plate: square, a 1pt keyline in the plate\'s colour, no ground, the figures in chalk', for: ['iron-age'] },
        loaded: { grade: 'deep', look: 'the loading chart: beside the same chips, the plates drawn edge-on, heaviest innermost, each sized by its plate, 1pt apart, on a short sleeve; no collar; the white and chrome plates edged in grip',
                  for: ['meet-day'] }
      },
      keeps: ['exactly the plates the strip lists today, in its order, and only where it shows today (a barbell at 45 lb or more) — never a second plate calculation',
              'its words: "Per side", "Per side · lb plates", "bar only", "+x left over"', 'each plate\'s colour from the plates table']
    },

    calCell: {
      label: 'Calendar cell',
      web: ['.cal-dow', '.cal-grid', '.cal-day (.empty, .pad, .today, .has-work)', '.cal-daynum', '.cal-plates i', '.cal-legend'],
      native: ['app/(app)/(tabs)/workout/index.jsx DayCell (and the weekday row over the grid)'],
      switches: [],
      add: ['app/(app)/(tabs)/workout/index.jsx DayCell'],
      slots: [],
      reads: ['colors.bar', 'colors.raised', 'colors.accent', 'colors.chalk', 'colors.dim', 'groupPlates', 'radius.sm', 'radius.hair'],
      type: ['literal'],
      variants: ['v1', 'open', 'ruled', 'edge'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'seven columns 4 apart; a 1 : 1.18 cell, radius.sm (a bar ground on the web, none on native), raised when trained; the 12pt day number (dim; chalk when trained; accent at 800 today, with an accent edge); up to four 3pt plate bars in group colours' },
        open: { grade: 'shape', look: 'no cell grounds: a trained day shown by its plates and chalk number, today by its keyline and weight', for: ['clear-sky'] },
        ruled: { grade: 'deep', look: 'a printed calendar: hairlines between cells (shape.rule.hair), no grounds; today boxed by a 2pt keyline', for: ['ledger', 'iron-age'] },
        edge: { grade: 'deep', look: 'the plates as edge-on slivers (3 × 10, side by side) under the number in place of stacked bars', for: ['meet-day'] }
      },
      keeps: ['the grid, its first weekday and its pad cells', 'the day numbers; at most four plates a day, in group colours',
              'today told by more than colour (a keyline and 800)', 'only trained days open the day sheet']
    },

    chart: {
      label: 'Charts and meters',
      web: ['the SVG the pinned analytics.js draws — .chart-grid, .chart-axis, .chart-line, .chart-dot, .chart-scatter, .chart-peak-ring, .chart-peak-lbl, ' +
              '.chart-bar, .chart-bar-bg, .chart-bar-dim, .chart-barval, .chart-target, .chart-ref, .chart-ring, .ring-track, .ring-fill, .ring-top, .ring-sub, ' +
              '.chart-spark, .spark-line, .spark-line-dim, .spark-glow, .spark-end, .spark-bar, .spark-ref, .spark-none, .chart-donut, .donut-seg, .donut-top, ' +
              '.donut-sub, .chart-empty, .legend-item, .legend-lbl, .legend-val',
            '.heat', 'you.js .legend-inline, .legend-grid, .ring-cell, .ring-lbl, .ring-of', 'steps.js .st-ring, .st-ring-n, .st-ring-s (the today ring), .chart-foot',
            'weight.js .wchart, .wc-dot, .wc-avg',
            'meters: .vol-row, .vol-track, .vol-fill, .macro-rows, .traj-bar, .traj-fill, and the calorie meter .cal-meter, .cal-track, .cal-zone, .cal-fill, .cal-tick, .cal-head, .cal-target'],
      native: ['src/ui/chart/LineChart.jsx', 'src/ui/chart/BarChart.jsx', 'src/ui/chart/Ring.jsx', 'src/ui/chart/Donut.jsx', 'src/ui/chart/Sparkline.jsx',
               'src/ui/chart/HeatStrip.jsx', 'src/ui/chart/Legend.jsx', 'src/ui/you/bits.jsx VolRow', 'app/(app)/(tabs)/food.jsx CalMeter',
               'app/(app)/(tabs)/steps.jsx StepRing'],
      switches: ['src/ui/chart/LineChart.jsx', 'src/ui/chart/BarChart.jsx', 'src/ui/chart/Ring.jsx', 'src/ui/chart/Donut.jsx', 'src/ui/chart/Sparkline.jsx',
                 'src/ui/chart/HeatStrip.jsx', 'src/ui/chart/Legend.jsx'],
      add: ['src/ui/you/bits.jsx VolRow', 'app/(app)/(tabs)/food.jsx CalMeter', 'app/(app)/(tabs)/steps.jsx StepRing'],
      slots: [],
      reads: ['colors.pYellow', 'colors.pBlue', 'colors.chalk', 'colors.collar', 'colors.knurl', 'colors.track', 'colors.steel', 'colors.dim', 'colors.faint', 'colors.grip', 'colors.calMark',
              'tint.zoneCut', 'tint.zoneHold', 'tint.zoneGain', 'tint.runway', 'tint.runwayEdge', 'shadow.calTick', 'shadow.calHead', 'shadow.calTarget'],
      type: ['literal'],
      variants: ['v1', 'ink', 'print', 'board'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'lines over an area wash with a glowing end dot, rounded bars on track, ring and donut arcs, a heat strip of cells, sparklines, dashed targets; meters are rounded bars on track' },
        ink: { grade: 'deep', look: 'single-ink strokes: 1.5pt lines with no area and no glow, flat square-topped bars, rings with square caps, hairline grids', for: ['ledger', 'clear-sky'] },
        print: { grade: 'deep', look: 'heavier 2pt lines, square-topped bars, the day that is not over hatched in place of dimmed (a shape cue), macro fills optionally hatched with matching legend swatches; no area wash. The calorie meter\'s bands (cut, hold, gain) hatched in their zone colours at full strength — a pattern each, CSS on the web and react-native-svg <Pattern> in CalMeter — where v1 washes them (tint.zone* stay the fallback); its head, ticks and target keep calMark, edged by shadow.calTick / calHead / calTarget',
                 for: ['iron-age'] },
        board: { grade: 'deep', look: 'square-topped columns 2 apart, the day that is not over hatched in the knurl pattern, 2pt lines over an LED dot-matrix fill under the line only, square-ended meters with a tick at the target',
                 for: ['meet-day'] }
      },
      keeps: ['every value where v1 draws it: scales, a shared origin for bars, axes and targets', 'every label and figure in and under a chart',
              'the colours the pinned analytics.js paints (index.js PINNED_PAINT) and every data colour\'s meaning',
              'the calorie meter\'s named hues: the white head, the blue / yellow / red zones (index.js HUE_NAMED)',
              'on the web, no new geometry: analytics.js is pinned, so a look restyles the elements it draws']
    },

    dock: {
      label: 'Dock',
      web: ['#dock / .dock (index.html)', '.dock button', '.dock button svg', '.dock button.active', '.dock button.active::before (the mark)',
            '#dock button.tour-lit::after (auth.css)'],
      native: ['src/ui/Dock.jsx Dock'],
      switches: ['src/ui/Dock.jsx Dock'],
      add: [],
      slots: [],
      reads: ['tint.dockGlass', 'scrim.dock', 'chrome.blurTint', 'colors.collar', 'colors.dim', 'colors.chalk', 'colors.accent', 'type.dockLbl', 'radius.plate', 'shadow.tourLit'],
      type: ['dockLbl'],
      variants: ['v1', 'solid', 'rail', 'board'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'glass: rack at .82 over an 18px blur (native: BlurView at 40) under a collar top rule; five cells, 22pt icons (1.9 stroke) over 10pt caps labels in dim; the active one chalk, with a 26 × 2 accent mark on the top edge' },
        solid: { grade: 'shape', look: 'an opaque bar ground, no blur, the collar rule; v1\'s cells and mark', for: ['chalk', 'clear-sky', 'iron-age'] },
        rail: { grade: 'deep', look: 'opaque, under a 2pt rule (shape.rule.ink); the active cell carries a 3pt bar its full width along that rule, and a heavier label', for: ['ledger', 'iron-age'] },
        board: { grade: 'deep', look: 'a board strip: five cells parted by shape.gutter, the active cell inverted (inverse ground, knockout icon and label)', for: ['meet-day'] }
      },
      keeps: ['five tabs — You, Train, Fuel, Weight, Steps — their words, order and place at the bottom',
              'the dock\'s height (--dock-h, T.layout.dockHeight) and each whole cell as its tap target', 'an icon over a label in every cell',
              'a selected cue that is not colour alone (a mark, a bar, an inversion)', 'the tour\'s lit ring, and the dock inert under the tour']
    },

    fab: {
      label: 'Floating button (Log food)',
      web: ['.fuel-fab', '.fuel-fab:active', '.fuel-fab svg'],
      native: ['app/(app)/(tabs)/food.jsx Fab'],
      switches: [],
      add: ['app/(app)/(tabs)/food.jsx Fab'],
      slots: [],
      reads: ['colors.accent', 'colors.accentPressed', 'colors.onAccent', 'radius.pill', 'shadow.fab', 'shadow.fabPressed'],
      type: ['literal'],
      variants: ['v1', 'square', 'inverse'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'an accent pill centred 14 above the dock: a + (2.6 stroke) and "Log food" set in 14pt caps .09em (wdth 92 / 800), onAccent; the fab shadow; pressed = accentPressed, scale .955, the pressed shadow' },
        square: { grade: 'shape', look: 'square corners (radius.plate); the vibe\'s shadow.fab', for: ['meet-day'] },
        inverse: { grade: 'deep', look: 'the accent leaves it: inverse ground, knockout words and +, square corners', for: ['iron-age', 'meet-day'] }
      },
      keeps: ['"Log food" and the +, centred above the dock at v1\'s distance', 'at least v1\'s size', 'press feedback']
    },

    addTile: {
      label: 'Add tiles',
      web: ['.add-grid', '.add-tile (.hero, .lit, :disabled)', '.add-tile .ic', '.add-tile .t', '.add-tile .d', '.add-tile .tag'],
      native: ['src/ui/food/common.jsx AddTile'],
      switches: [],
      add: ['src/ui/food/common.jsx AddTile'],
      slots: [],
      reads: ['colors.well', 'colors.collar', 'colors.knurl', 'radius.r', 'radius.tile', 'colors.raised', 'colors.grip', 'colors.accent', 'colors.onAccent',
              'colors.knockout', 'colors.steel', 'colors.chalk', 'colors.dim', 'colors.tileHero', 'colors.tileLit', 'alpha.accent'],
      type: ['literal'],
      variants: ['v1', 'flat', 'ruled'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'two columns of well tiles (collar border, radius.r): a 36pt icon well (raised; Photo\'s in accent with an onAccent icon; lit tiles\' in grip), the title, a dim line, and the AI tag pill; Photo and the lit tiles wear accent washes (gradients on the web, flat tileHero / tileLit on native)' },
        flat: { grade: 'shape', look: 'no washes and no border: every tile on the well; the Photo tile marked by its accent icon well alone; the lit tiles\' icon well and tag on raised, not grip; the tag square (radius.chip)', for: ['chalk', 'navy', 'oxblood'] },
        ruled: { grade: 'deep', look: 'no tiles: a two-column grid parted by hairlines (shape.rule.hair), each cell an index entry: the icon without its well inline before the title, the tag a note run in after the title, the line under both', for: ['iron-age', 'ledger'] }
      },
      keeps: ['the tiles, in order, in two columns', 'icons (the icon set\'s), titles, lines and tags word for word',
              'a tile that is off stays visible, dimmed, readable and untappable', 'the Photo tile stays the first the eye finds']
    },

    sessionChrome: {
      label: 'Live session chrome: the top bar, the live chip, the rest pill, the peek bar',
      web: ['.wk-bar', '.wk-bar-left', '.wk-name', '.timer', '.wk-coach (the live chip)', '.wk-cal-btn', '.rest-line', '.rest-pill', '.rest-pill .t',
            '.rest-pill button', '.peek-bar', '.peek-name', '.peek-bar .timer'],
      native: ['app/(app)/(tabs)/workout/session.jsx TopBar', 'src/ui/train/LiveChrome.jsx Clock', 'src/ui/coach/live.jsx LiveChip',
               'src/ui/train/RestOverlay.jsx RestOverlay', 'src/ui/train/PeekBar.jsx PeekBar'],
      switches: [],
      add: ['app/(app)/(tabs)/workout/session.jsx TopBar', 'src/ui/coach/live.jsx LiveChip (after its hook)', 'src/ui/train/RestOverlay.jsx RestOverlay (after its hooks)',
            'src/ui/train/PeekBar.jsx PeekBar (after its hooks)'],
      slots: [],
      reads: ['colors.bar', 'tint.wkBarGlass', 'scrim.wkBar', 'colors.collar', 'colors.chalk', 'colors.steel', 'colors.accent', 'colors.raised', 'colors.knurl',
              'colors.done', 'colors.danger', 'radius.pill', 'radius.r', 'radius.sm', 'shadow.rest', 'shadow.peek'],
      type: ['literal (the web top bar\'s clock is .timer: type.timer)'],
      variants: ['v1', 'flat', 'slab', 'plate'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'the top bar (native: bar ground; web: rack at .9 over a 16px blur) under a collar rule: the session name, the clock (tabular, steel), the Coach chip (38 tall, collar edge, accent caps), the calendar button (38, collar edge), Finish. The rest line, 3pt across the top in done (danger when over). The rest pill: raised, knurl edge, round, the rest shadow — time, +30, Skip. The peek bar: raised, knurl edge, radius.r, the peek shadow — name, clock, Resume' },
        flat: { grade: 'shape', look: 'no glass and no shadows: every piece on an opaque ground with its edge; shapes as v1', for: ['chalk', 'navy', 'oxblood', 'clear-sky'] },
        slab: { grade: 'deep', look: 'a score bug: square slabs (radius.plate) whose slots are parted by 1pt rules, figures in the vibe\'s timer type, one slot inverted (the running clock in the top bar, the time in the rest pill: inverse ground, knockout figures); no shadows',
                for: ['meet-day'] },
        plate: { grade: 'deep', look: 'stamped plates: square, a keyline (shape.keyline) on the bar ground, no shadow; figures tabular', for: ['iron-age'] }
      },
      keeps: ['every control and its place: name, clock, Coach chip, calendar button, Finish or Save; +30 and Skip; Resume',
              'the peek bar above the rest pill while a rest runs', 'the top bar owns the top inset; on the web it runs under the status bar, so in a light vibe its top band stays dark (§10)',
              'the rest line\'s done / danger meaning', 'the chip only for Pro and never in an edit; the clock right after a resume',
              'tap targets at least v1\'s (the chip and the calendar button are 38)']
    },

    youHero: {
      label: 'You hero (greeting)',
      web: ['.you-hero', '.you-avatar', '.you-greet', '.you-greet-name', '.you-sub', '.you-gear', '.you-since'],
      native: ['src/ui/you/Hero.jsx Hero'],
      switches: ['src/ui/you/Hero.jsx Hero'],
      add: [],
      slots: ['youHero'],
      reads: ['colors.raised', 'colors.steel', 'colors.accent', 'colors.bar', 'colors.collar', 'colors.dim', 'type.youGreet'],
      type: ['youGreet'],
      variants: ['v1', 'banner', 'stacked'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'avatar (52, round, raised) | the two-line greeting (27pt 800, the name in accent) | the gear (36, bar ground, collar edge), avatar and gear level with the greeting; the sub-line and the "member since" line' },
        banner: { grade: 'deep', look: 'the greeting set in a box over its photo (the youHero slot) under the vibe\'s scrim; every word over the photo one ink — the name loses the accent (R9.6)', for: ['iron-age'] },
        stacked: { grade: 'deep', look: 'the avatar above the greeting, left; the gear stays top right', for: [] }
      },
      keeps: ['the avatar (tap: a photo), the greeting and name, the gear (tap: settings) at the top right', 'the sub-line and "member since …"',
              'the name ellipsises; the gear never leaves the screen']
    },

    coachCard: {
      label: 'Coach card (skin only)',
      web: ['.coach-card', '.coach-card.tight', '.coach-card:active', '.coach-hd', '.coach-ttl', '.coach-go', '.coach-go-t', '.coach-go-q', '.coach-go-x'],
      native: ['src/ui/coach/Card.jsx CoachCardBody'],
      switches: ['src/ui/coach/Card.jsx CoachCardBody'],
      add: [],
      slots: ['coachCard'],
      reads: ['colors.bar', 'colors.collar', 'colors.knurl', 'radius.r', 'colors.accent', 'colors.warn', 'colors.chalk', 'colors.steel', 'colors.dim'],
      type: ['coach-view.js CARD_TYPE, or the vibe\'s T.fit.metrics'],
      variants: ['v1', 'flat', 'ruled', 'plate', 'panel'],
      v1: 'v1',
      looks: {
        v1: { grade: 'v1', look: 'bar ground, a 1pt collar border (knurl pressed), radius.r, padding 14, 190 tall on You and 164 on Train; the accent mark and COACH, the lock, the lines, and the COACH ME row over a collar rule' },
        flat: { grade: 'shape', look: 'the border drawn in the ground\'s colour, still 1pt, so no edge shows', for: ['chalk', 'navy'] },
        ruled: { grade: 'deep', look: 'no ground: only the top and bottom of the 1pt border drawn, in shape.rule.ink; square corners', for: ['ledger', 'iron-age'] },
        plate: { grade: 'shape', look: 'square corners (radius.plate), the border in knurl', for: [] },
        panel: { grade: 'deep', look: 'bar ground, the border in the ground\'s colour, square corners; a band (shape.band) behind the header row inside the card\'s own box, taking no layout', for: ['meet-day'] }
      },
      keeps: ['the height (190 / 164), the padding (14) and the border width (1) — cardLayout()\'s — unless the vibe measured its own face (T.fit, §6.6) and passes the Coach-surface checks in that vibe',
              'the face and type, and every line\'s numberOfLines and lineHeight', 'every word: COACH, the lines, the reason, COACH ME, the lead, the chevron; the lock and when it shows',
              'the whole card as one tap target; the caution line in warn', 'no photo unless its text stays legible at 190 / 164 (§11; research drops it, C27)']
    }
  }
});
