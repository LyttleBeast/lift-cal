export const meta = {
  name: 'v59-design-2',
  description: 'V59 §9 D, resumed per slot: reuse concepts on disk, run the missing ones, 3 judges, winner-and-graft spec + pure def + icons; optional cross-slot check',
  phases: [
    { title: 'Vocab', detail: 'extend the contract with the component variant list' },
    { title: 'Plan', detail: 'assign each of the 7 slots a distinct direction, id and 3 concept angles' },
    { title: 'Concepts', detail: '3 independent concepts per slot' },
    { title: 'Judges', detail: '3 judges per slot score all 3 concepts' },
    { title: 'Spec', detail: 'winner + graft → design/<id>.md, vibes/defs/<id>.js, vibes/icons/<set>.js' },
    { title: 'Cross', detail: 'the simple three differ clearly; nothing collides; compile VIBES-DESIGN.md' },
  ],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const WT = `${NIGHT}/wt/web-design`
const DES = `${NIGHT}/design`
const RES = `${NIGHT}/research`
const PROMPT = `${NIGHT}/VIBES-PROMPT.md`
const CODEMAP = `${NIGHT}/VIBES-CODEMAP.md`

const CONTEXT = `
===== PHASE D (V59 §9): design, from research to seven specs =====
Read: ${PROMPT} §1 (lines 124-189: Micah's words and decisions — don't reopen them), §2 (191-233: the lineup and the layout rules), §9 (961-998), §10 (1001-1045), §11 (1048-1096) for Iron Age, §12 (1099-1122) for the experimental vibe, §13 (1125-1176: the gates your spec must pass — contrast, colour-vision, fit, the "did an AI make this?" panel), §14 (1179-1247: art, fonts, provenance, budgets). Research: ${RES}/SYNTHESIS.md first, then the track files it cites (${RES}/01-ai-tells.md, 02-fitness-apps.md, 03-beyond-fitness.md, 04-colour.md, 05-typography.md, 06-gym-visual.md, 07-iron-age-period.md, iron-age/08a-photos.md, iron-age/08b-engravings.md, 09-apple-rules.md, 10-menus-settings.md). The contract: ${WT}/vibes/defs/v1.js (every role a vibe must fill), ${WT}/vibes/defs/index.js (ROLES, LEGACY_EXACT), ${WT}/vibes/icons/v1.js. Codemap ${CODEMAP} Screens §3 (lines 794-841: the shared vocabulary) and §6 (887-917: hero vs dense boxes). A v1 screenshot: ${NIGHT}/proof/smoke/smoke-you-390.png (very tall; Read it).
Hard rules: vibes change how Rack looks, never what it says or does; every number and word identical; touch targets ≥ 44; text contrast 4.5:1 (3:1 for large text ≥18pt or 14pt bold, and for UI graphics) for every colour a vibe changes or adds; the six muscle-group colours stay distinguishable under deuteranopia and protanopia and nothing reads up/down by red vs green alone; the Coach card is fixed 190/164 and its text must fit (a vibe that changes the Coach card's font/padding/border/type must supply its own advance table — or keep Archivo + v1 metrics on the Coach card); works offline; web fonts must be VARIABLE with a wght axis (weight is set only through font-variation-settings; zero font-weight rules), self-hosted latin woff2, ≤ 120 KB per family; native fonts are static TTFs, ≤ 4 per vibe (picker face included); OFL 1.1 only (check the RFN); no AI-generated imagery ever; photos only real pre-1931 (Iron Age only), behind hero boxes only; light vibes allowed (web: keep the top safe-area band dark because the installed PWA's status bar text is always white; native: StatusBar dark, keyboards/date pickers light); all colours 6-digit hex; the dock's tabs, order and position never change (its skin may).`

const SLOT_SCHEMA = {
  type: 'object',
  properties: {
    slots: { type: 'array', items: { type: 'object', properties: {
      slot: { type: 'string', enum: ['iron-age', 'simple-1', 'simple-2', 'simple-3', 'deep-1', 'deep-2', 'experimental'] },
      id: { type: 'string', description: 'final id: lowercase ^[a-z0-9][a-z0-9-]*$, ≤32, not v1/defs/icons; iron-age is "iron-age"' },
      name: { type: 'string' }, feel: { type: 'string', description: 'one line on its feel, for the picker' },
      kind: { type: 'string', enum: ['deep+art', 'simple', 'deep', 'experimental'] },
      scheme: { type: 'string', enum: ['dark', 'light'] },
      direction: { type: 'string', description: '2-4 sentences: the direction research chose and why' },
      angles: { type: 'array', items: { type: 'string' }, description: 'exactly 3 distinct concept angles' },
      must_differ_from: { type: 'string' },
    }, required: ['slot', 'id', 'name', 'feel', 'kind', 'scheme', 'direction', 'angles', 'must_differ_from'] } },
    notes: { type: 'string' },
  },
  required: ['slots', 'notes'],
}
const CONCEPT_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string', description: 'the concept file you wrote' },
    name: { type: 'string' }, idea: { type: 'string', description: 'two sentences' },
    fonts: { type: 'string' }, palette_summary: { type: 'string' },
    never: { type: 'array', items: { type: 'string' } },
  },
  required: ['file', 'name', 'idea', 'fonts', 'palette_summary', 'never'],
}
const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    scores: { type: 'array', items: { type: 'object', properties: {
      concept: { type: 'string', description: 'A, B or C' },
      distinct: { type: 'number' }, ai_made: { type: 'number', description: '1 = no AI tool would make this, 10 = obviously AI' },
      readability: { type: 'number' }, fits_rack: { type: 'number' }, buildable: { type: 'number' },
      reasons: { type: 'string' },
    }, required: ['concept', 'distinct', 'ai_made', 'readability', 'fits_rack', 'buildable', 'reasons'] } },
    pick: { type: 'string' }, graft: { type: 'string', description: 'the best ideas from the runners-up worth grafting onto the pick' },
  },
  required: ['scores', 'pick', 'graft'],
}
const SPEC_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' }, winner: { type: 'string' }, grafted: { type: 'string' },
    spec_file: { type: 'string' }, def_file: { type: 'string' }, icons_file: { type: 'string', description: 'or "v1" if it keeps v1 icons' },
    registry_entry: { type: 'object', description: '{id, name, feel, experimental, scheme} for index.js VIBES (the orchestrator adds it)' },
    fonts: { type: 'array', items: { type: 'object' }, description: '[{family, web_woff2_source, native_static_ttfs:[...], licence, rfn}]' },
    contrast: { type: 'string', description: 'min text-on-surface ratio and any pair under 4.5' },
    cvd: { type: 'string', description: 'min pairwise ΔE of the six group colours under deutan/protan' },
    coach_card: { type: 'string', description: 'keeps Archivo+v1 metrics, or its own advance table' },
    variants: { type: 'object', description: 'block -> variant name' },
    assets_needed: { type: 'array', items: { type: 'string' } },
    open: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'winner', 'grafted', 'spec_file', 'def_file', 'icons_file', 'registry_entry', 'fonts', 'contrast', 'cvd', 'coach_card', 'variants', 'assets_needed', 'open'],
}


// D2: the vocabulary and the slot plan are done (design/VOCAB.md, design/PLAN.md, design/plan.json).
// args.slots: plan entries to run now; args.existing: { id: [conceptA, conceptB, conceptC] } files already complete on disk; args.cross: run the cross-slot check.
const EXIST = (args && args.existing) || {}
const slots = (args && args.slots) || []
log(`D2 slots: ${slots.map(s => s.id).join(", ")}; reusing ${Object.entries(EXIST).map(([k, v]) => k + ":" + v.filter(Boolean).length).join(" ")}`)
const perSlot = await pipeline(slots,
  // Concepts
  (s) => parallel(s.angles.slice(0, 3).map((angle, i) => () => (EXIST[s.id] && EXIST[s.id][i]) ? Promise.resolve({ file: EXIST[s.id][i], name: 'concept ' + 'ABC'[i] + ' (written in an earlier run, complete on disk)', idea: '', fonts: '', palette_summary: '', never: [] }) : agent(`${PREAMBLE}${CONTEXT}
===== YOUR JOB: concept ${'ABC'[i]} for the "${s.slot}" slot (id ${s.id}) =====
The slot: ${JSON.stringify(s, null, 1)}
Your angle: ${angle}
Work independently (two other agents are designing the same slot from other angles). Propose a COMPLETE spec and write it to ${DES}/${s.id}/concept-${'ABC'[i]}.md (mkdir -p): name; the idea in two sentences; EVERY token role (use ${DES}/ROLES.md; all colours 6-digit hex; compute the text-on-surface contrast ratios with a node script and list them; simulate deuteranopia/protanopia for the six group colours (Machado 2009) and give the min pairwise ΔE); fonts (from research track 5: family, OFL confirmed, variable wght axis for web, static TTFs for native, glyph coverage gaps, whether the Coach card keeps Archivo); shape language; per-component treatments across the vocabulary in ${DES}/VOCAB.md (${s.kind === 'simple' ? 'simple vibes: tokens + fonts + at most small shape tokens such as radius or border weight; layout identical' : s.kind === 'experimental' ? 'experimental: its own component variants AND a composition per screen — which boxes it reorders, merges or splits on the five tab landings, the workout summary and the live session (top-bar zone, exercise-card stack position, plate strip position), never touching the dock' : 'deep: component variants across the whole vocabulary, same order, new shapes; every screen covered incl. sign-in/gates (web), onboarding + tour, Coach sheet/chip/nudge, add-food sheets, estimator, library, meals, water, rest pill + peek bar, toasts, the Vibes sheet, admin (legible)'}); image slots and scrims (${s.slot === 'iron-age' ? 'Iron Age: real pre-1931 photos behind the hero boxes only — You greeting, Coach card (only if legible at 190/164), Start workout, summary headline, Fuel big number, Steps today, Weight log card — each with a focal point and a code-made scrim that keeps text at 4.5:1; sepia/duotone by deterministic ops; plus paper grain / ink bleed / halftone textures made by code; a complete engraved icon set (dock 5, gears, calendar, Coach bubble + lock, 8 add-food, water vessel if feasible, and SVG replacements for ‹ › ✕ ⋯ ✓ ↳ ✎ ⚙) as 24×24 path data with a consistent stroke that reads at 22pt; research track 8b lists traceable engravings' : 'no photos (photos are Iron Age only); textures made by code are allowed if they earn their place'}); icon style; and a list of what it NEVER does (use research track 1's tells). Show three example screens in words (You, live session, Fuel day) so a judge can picture it.`,
    { label: `D:${s.id}:concept-${'ABC'[i]}`, phase: 'Concepts', schema: CONCEPT_SCHEMA }))),
  // Judges
  (concepts, s) => parallel([0, 1, 2].map(j => () => agent(`${PREAMBLE}${CONTEXT}
===== YOUR JOB: judge ${j + 1} of 3 for the "${s.slot}" slot (id ${s.id}) =====
Three concepts: ${concepts.filter(Boolean).map((c, i) => `${'ABC'[i]}: ${c.file}`).join(', ')} — read each in full. The slot: ${JSON.stringify(s)}. Score EACH concept 1-10 on: (1) distinct from v1 and from the other vibes (the plan: ${DES}/PLAN.md); (2) "could an AI tool have made this?" — 1 = no AI tool would make this, 10 = obviously AI (use research track 1's tells; be harsh; generic dark-graphite-plus-one-accent, pill badges everywhere, uniform rounded cards, tiny letter-spaced eyebrows everywhere, three-tile stat rows, glassmorphism and gradients score badly); (3) readability and contrast (check the numbers they give; recompute any you doubt with a node script); (4) fits Rack — plates, chalk, numbers, a lifter's logbook; (5) buildable on the engine without breaking its layout rule (${s.kind === 'simple' ? 'same layout' : s.kind === 'experimental' ? 'may rearrange within a screen, never the dock, never hide or add a control' : 'same order, new shapes'}), within the font/asset budgets, and on BOTH clients (native is the destination: judge by how it lands on a phone). ${j === 0 ? 'Lens: a senior product designer who ships iOS apps.' : j === 1 ? 'Lens: a sceptic hunting AI-made tells — answer "AI-made" if unsure.' : 'Lens: a strength coach and lifter who logs every session on his phone at the gym, under bad light, sweaty, between sets.'} Pick one and name the best ideas from the others worth grafting.`,
    { label: `D:${s.id}:judge-${j + 1}`, phase: 'Judges', schema: JUDGE_SCHEMA }))).then(judges => ({ concepts, judges })),
  // Spec
  ({ concepts, judges }, s) => agent(`${PREAMBLE}${CONTEXT}
===== YOUR JOB: the "${s.slot}" spec, its pure definition and its icons (id ${s.id}) =====
The concepts: ${concepts.filter(Boolean).map((c, i) => `${'ABC'[i]}: ${c.file}`).join(', ')}. The judges' scores: ${JSON.stringify(judges.filter(Boolean), null, 1)}
Pick the winner (highest total, with (2) "AI-made" counted inverted and weighted double; break ties by (3)), graft the best of the runners-up where it strengthens the winner without muddying it, and produce:
1. ${DES}/${s.id}.md — the final spec: name, idea, every token role, fonts (exact source URLs for the web latin woff2 or the OFL TTF to subset, and the static TTFs for native, each with licence/RFN), shape language, per-component treatments for EVERY block in ${DES}/VOCAB.md, image slots + scrims (Iron Age), textures, icon style, the never-do list, and a "Losing concepts" section summarising the two others (Micah may swap one in).
2. ${WT}/vibes/defs/${s.id}.js — its PURE definition: the same shape as vibes/defs/v1.js with EVERY role filled (write a node check that walks v1.js's leaf key paths and asserts yours has each; all colours 6-digit hex; no LEGACY_EXACT spellings; id/name/feel/experimental/scheme/icons/images/variants/themeColor set; ${s.kind === 'experimental' ? 'experimental: true and a composition map per screen' : 'experimental: false'}). Imports nothing. Hand-written with WHY comments.
3. ${s.slot === 'iron-age' || s.kind === 'deep' || s.kind === 'experimental' ? `${WT}/vibes/icons/${s.id}.js if the vibe has its own icon set (Iron Age must: a complete set as 24×24 path data with stroke widths, the same icon names as v1's set plus the glyph replacements; draw by hand in code to a consistent engraved style for now — tracing from the period engravings in ${RES}/iron-age/originals/ happens in the build phase and may replace individual paths). Every icon must read at 22pt.` : 'simple vibes keep the v1 icon set: icons "v1".'}
4. Run a contrast check over every text role on every surface role in your def (node script; list any pair under 4.5:1 and fix it unless it is a large-text-only or v1-inherited pair) and a deutan/protan ΔE check of the six group colours. Report the numbers.
Do not edit index.js (the orchestrator adds the registry entry you return). Do not commit.`,
    { label: `D:${s.id}:spec`, phase: 'Spec', schema: SPEC_SCHEMA }).then(spec => ({ slot: s, concepts, judges, spec }))
)

if (!args.cross) return { specs: perSlot.filter(Boolean).map(p => ({ slot: p.slot, spec: p.spec, judges: p.judges })) }
phase('Cross')
const specs = perSlot.filter(Boolean)
const cross = await agent(`${PREAMBLE}${CONTEXT}
===== YOUR JOB: the cross-slot check and VIBES-DESIGN.md =====
Specs (this wave, plus any already on disk in ${DES}/<id>.md and ${WT}/vibes/defs/<id>.js — read them all, all seven slots in ${DES}/plan.json): ${specs.map(p => `${p.slot.slot} → ${p.spec ? p.spec.spec_file + ' / ' + p.spec.def_file : 'FAILED'}`).join('; ')}. Check: (1) the three simple vibes differ CLEARLY from each other and from v1 (ground, accent, type — if two are close, change the weaker one's def and spec and say what you changed); (2) no two vibes share a picker name or id, and ids are valid; (3) every def fills every v1 role (run the key-path check on all seven) and passes the contrast and CVD thresholds; (4) the fonts across all vibes fit the budgets (web ≤120 KB/family latin woff2; native ≤4 static TTFs per vibe; total native asset addition ≤6 MB with Iron Age imagery ≤1.5 MB/client). Then compile ${DES}/VIBES-DESIGN.md: the rules every vibe follows, the never-do list, one section per vibe (from its spec), and the losing concepts per slot. Do not commit.`,
  { label: 'D:cross', phase: 'Cross', schema: { type: 'object', properties: { design_md: { type: 'string' }, changes: { type: 'array', items: { type: 'string' } }, problems: { type: 'array', items: { type: 'string' } } }, required: ['design_md', 'changes', 'problems'] } })

return { specs: specs.map(p => ({ slot: p.slot, spec: p.spec, judges: p.judges })), cross }
