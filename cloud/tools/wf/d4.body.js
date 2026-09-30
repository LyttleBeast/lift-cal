export const meta = {
  name: 'v59-design-deep',
  description: 'V59 §9 D for the deep two + experimental under Micah\'s change of plan: 2 concepts (research pick + one alternative), 2 judges, winner-and-graft spec + pure def + icons, on contract/engine v2',
  phases: [
    { title: 'Concepts', detail: '2 independent concepts per slot' },
    { title: 'Judges', detail: '2 judges per slot score both concepts' },
    { title: 'Spec', detail: 'winner + graft → design/<id>.md, vibes/defs/<id>.js, vibes/icons/<id>.js' },
  ],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const WT = `${NIGHT}/wt/web-design2`
const DES = `${NIGHT}/design`
const RES = `${NIGHT}/research`
const PROMPT = `${NIGHT}/VIBES-PROMPT.md`
const CODEMAP = `${NIGHT}/VIBES-CODEMAP.md`

const CONTEXT = `
===== PHASE D (V59 §9): design for the deep two and the experimental slot =====
MICAH'S CHANGE OF PLAN (overrides the prompt): deep + experimental design = 2 concepts (the research pick + one alternative) and 2 judges; design agents run at xhigh.
Read: ${PROMPT} §1 (lines 124-189: Micah's words and decisions — don't reopen them), §2 (191-233: the lineup and the layout rules), §9 (961-998), §10 (1001-1045), §12 (1099-1122) for the experimental vibe, §13 (1125-1176: the gates your spec must pass — contrast, colour-vision, fit, the "did an AI make this?" panel, which for these three is 3 judges and a HARD gate), §14 (1179-1247: art, fonts, provenance, budgets). Research: ${RES}/SYNTHESIS.md first, then the track files it cites (${RES}/01-ai-tells.md, 02-fitness-apps.md, 03-beyond-fitness.md, 04-colour.md, 05-typography.md, 06-gym-visual.md, 09-apple-rules.md, 10-menus-settings.md). The plan: ${DES}/PLAN.md and ${DES}/plan.json.
THE CONTRACT IS v2 AND THE ENGINE IS v2 (web main 58ac3be; the design worktree ${WT} is a clean checkout of it): ${WT}/vibes/defs/v1.js (every role a vibe must fill), ${WT}/vibes/defs/index.js (ROLES, LEGACY_EXACT, valueOf() fallbacks), ${WT}/vibes/defs/vocab.js + ${DES}/VOCAB.md (29 blocks and their looks), ${WT}/vibes/icons/v1.js. ${DES}/ROLES.md predates v2 — where it and index.js differ, index.js wins. Engine v2 added roles the four earlier specs had to retrofit; fill them from the start: tagInk (the W/F/D badge letters), colors.band (the dark strip under the web status text for a light vibe), shadow.calHead / calTarget (calorie head/target ring), face.bands (native condensed cut if any), face.web.display / italic / num (web @font-face family names MUST start with the vibe id, e.g. '<id> Sans'), type.meta, inkOf, images.<slot>.band, and a \`shape\` object (rule.sub, rule.total, lead.keyline … — may be {}).
Earlier specs, for reference and for "must differ": ${DES}/iron-age.md, ${DES}/chalk.md, ${DES}/navy.md, ${DES}/oxblood.md (defs in ${NIGHT}/wt/web-design/vibes/defs/<id>.js; Chalk and Iron Age are being built now).
Decisions already made that bind you: (a) every non-v1 icon set must redefine 'spark' (v1's AI-sparkle, used at the estimator) as a neutral mark (SYNTHESIS finding 6); (b) the addTile 'flat' look = lit tiles draw their icon well and tag on \`raised\` (the lit tile's 8.5px tag must reach 4.5:1); (c) the sheet grab handle keeps 3:1 against the sheet; (d) the Coach card keeps Archivo on v1 metrics unless the spec supplies its own advance table from the shipped TTFs (tools/lib/ttf-advance.mjs in the native tree) — prefer keeping it; (e) the web's Vibes-sheet tile rules are scoped .vibe-in[data-vibe="<id>"].
Codemap ${CODEMAP} Screens §3 (lines 794-841: the shared vocabulary) and §6 (887-917: hero vs dense boxes). v1 screenshots: ${NIGHT}/proof/smoke/smoke-you-390.png (very tall) and the gallery shots under ${NIGHT}/proof/v-chalk/shoot*/ (Chalk, a simple light vibe, for scale).
Hard rules: vibes change how Rack looks, never what it says or does; every number and word identical; touch targets ≥ 44; text contrast 4.5:1 (3:1 for large text ≥18pt or 14pt bold, and for UI graphics) for every colour a vibe changes or adds; the six muscle-group colours stay distinguishable under deuteranopia and protanopia (pairwise ΔE00 ≥ 12, Machado 2009) and nothing reads up/down by red vs green alone; the Coach card is fixed 190/164 and its text must fit; works offline; web fonts must be VARIABLE with a wght axis (weight only through font-variation-settings), self-hosted latin woff2, ≤ 120 KB per family; native fonts are static TTFs, ≤ 4 per vibe (picker face included); OFL 1.1 only (check the RFN); no AI-generated imagery ever; no photos (photos are Iron Age's alone); textures made by code only if they earn their place; light vibes allowed (web: keep the top safe-area band dark; native: StatusBar dark, keyboards/date pickers light); all colours 6-digit hex; the dock's tabs, order and position never change (its skin may).`

const CONCEPT_SCHEMA = { type: 'object', properties: {
  file: { type: 'string' }, name: { type: 'string' }, idea: { type: 'string' }, fonts: { type: 'string' }, palette_summary: { type: 'string' }, never: { type: 'array', items: { type: 'string' } },
}, required: ['file', 'name', 'idea', 'fonts', 'palette_summary', 'never'] }
const JUDGE_SCHEMA = { type: 'object', properties: {
  scores: { type: 'array', items: { type: 'object', properties: {
    concept: { type: 'string', description: 'A or B' },
    distinct: { type: 'number' }, ai_made: { type: 'number', description: '1 = no AI tool would make this, 10 = obviously AI' },
    readability: { type: 'number' }, fits_rack: { type: 'number' }, buildable: { type: 'number' }, reasons: { type: 'string' },
  }, required: ['concept', 'distinct', 'ai_made', 'readability', 'fits_rack', 'buildable', 'reasons'] } },
  pick: { type: 'string' }, graft: { type: 'string' },
}, required: ['scores', 'pick', 'graft'] }
const SPEC_SCHEMA = { type: 'object', properties: {
  id: { type: 'string' }, winner: { type: 'string' }, grafted: { type: 'string' },
  spec_file: { type: 'string' }, def_file: { type: 'string' }, icons_file: { type: 'string' },
  registry_entry: { type: 'object', description: '{id, name, feel, experimental, scheme}' },
  fonts: { type: 'array', items: { type: 'object' } }, contrast: { type: 'string' }, cvd: { type: 'string' }, coach_card: { type: 'string' },
  variants: { type: 'object' }, composition: { type: 'string', description: 'experimental only: per-screen composition moves and fallbacks; else ""' },
  engine_asks: { type: 'array', items: { type: 'string' }, description: 'anything the engine/contract v2 cannot yet express (roles, switch sites, composition hooks) — for the orchestrator' },
  assets_needed: { type: 'array', items: { type: 'string' } }, open: { type: 'array', items: { type: 'string' } },
}, required: ['id', 'winner', 'grafted', 'spec_file', 'def_file', 'icons_file', 'registry_entry', 'fonts', 'contrast', 'cvd', 'coach_card', 'variants', 'composition', 'engine_asks', 'assets_needed', 'open'] }

// args.slots: [{ ...plan.json entry, pick: [angleIndexA, angleIndexB] }]
const slots = (args && args.slots) || []
log(`D4 slots: ${slots.map(s => s.id + ' angles ' + s.pick.join('+')).join(', ')}`)
const L = 'AB'
const perSlot = await pipeline(slots,
  (s) => parallel(s.pick.map((ai, i) => () => agent(`${PREAMBLE}${CONTEXT}
===== YOUR JOB: concept ${L[i]} for the "${s.slot}" slot (id ${s.id}) =====
The slot: ${JSON.stringify({ ...s, angles: undefined, pick: undefined }, null, 1)}
Your angle: ${s.angles[ai]}
${i === 0 ? 'This is the research pick.' : 'This is the alternative to the research pick; make it a real contender, not a straw man.'} Work independently (one other agent is designing the same slot from another angle). Propose a COMPLETE spec and write it to ${DES}/${s.id}/concept-${L[i]}.md (mkdir -p via node): name; the idea in two sentences; EVERY token role of the v2 contract (all colours 6-digit hex; compute the text-on-surface contrast ratios with a node script and list them; simulate deuteranopia/protanopia for the six group colours (Machado 2009) and give the min pairwise ΔE00); fonts (from research track 5: family, OFL confirmed, variable wght axis for web, static TTFs for native, glyph coverage gaps, whether the Coach card keeps Archivo); shape language; per-component treatments across every block in ${DES}/VOCAB.md (${s.kind === 'experimental' ? 'experimental: its own component variants AND a composition per screen — which boxes it reorders, merges or splits on the five tab landings, the workout summary and the live session (top-bar zone, exercise-card stack position, plate strip position), never touching the dock, never hiding or adding a control, every word and number kept; name each screen that falls back to same-order-new-shapes' : 'deep: component variants across the whole vocabulary, same order, new shapes; every screen covered incl. sign-in/gates (web), onboarding + tour, Coach sheet/chip/nudge, add-food sheets, estimator, library, meals, water, rest pill + peek bar, toasts, the Vibes sheet, admin (legible)'}); icon style (its own set or v1's with a neutral 'spark'); textures if any (code-made); and a list of what it NEVER does (research track 1's tells). Show three example screens in words (You, live session, Fuel day) so a judge can picture it.`,
    { label: `D:${s.id}:concept-${L[i]}`, phase: 'Concepts', schema: CONCEPT_SCHEMA }))),
  (concepts, s) => parallel([0, 1].map(j => () => agent(`${PREAMBLE}${CONTEXT}
===== YOUR JOB: judge ${j + 1} of 2 for the "${s.slot}" slot (id ${s.id}) =====
Two concepts: ${concepts.map((c, i) => c ? `${L[i]}: ${c.file}` : `${L[i]}: FAILED`).join(', ')} — read each in full. The slot: ${JSON.stringify({ ...s, angles: undefined, pick: undefined })}. Score EACH concept 1-10 on: (1) distinct from v1 and from the other vibes (${DES}/PLAN.md; the earlier specs listed above); (2) "could an AI tool have made this?" — 1 = no AI tool would make this, 10 = obviously AI (research track 1's tells; be harsh: generic dark-graphite-plus-one-accent, pill badges everywhere, uniform rounded cards, tiny letter-spaced eyebrows, three-tile stat rows, glassmorphism and gradients score badly); (3) readability and contrast (recompute any number you doubt with a node script); (4) fits Rack — plates, chalk, numbers, a lifter's logbook; (5) buildable on engine v2 without breaking its layout rule (${s.kind === 'experimental' ? 'may rearrange within a screen, never the dock, never hide or add a control' : 'same order, new shapes'}), within the font/asset budgets, and on BOTH clients (native is the destination: judge by how it lands on a phone). ${j === 0 ? 'Lens: a senior product designer who ships iOS apps AND lifts — picture it at the gym under bad light, sweaty, between sets.' : 'Lens: a sceptic hunting AI-made tells — score "AI-made" high if unsure. The built vibe must later convince 2 of 3 adversarial judges it is human-designed; pick the concept most likely to survive that.'} Pick one and name the best ideas from the other worth grafting.`,
    { label: `D:${s.id}:judge-${j + 1}`, phase: 'Judges', schema: JUDGE_SCHEMA }))).then(judges => ({ concepts, judges })),
  ({ concepts, judges }, s) => agent(`${PREAMBLE}${CONTEXT}
===== YOUR JOB: the "${s.slot}" spec, its pure definition and its icons (id ${s.id}) =====
The concepts: ${concepts.map((c, i) => c ? `${L[i]}: ${c.file}` : `${L[i]}: FAILED`).join(', ')}. The judges' scores: ${JSON.stringify(judges.filter(Boolean), null, 1)}
Pick the winner (highest total, with (2) "AI-made" counted inverted and weighted double; break ties by (3)), graft the best of the runner-up where it strengthens the winner without muddying it, and produce:
1. ${DES}/${s.id}.md — the final spec: name, idea, every token role, fonts (exact source URLs for the web latin woff2 or the OFL TTF to subset, and the static TTFs for native, each with licence/RFN), shape language, per-component treatments for EVERY block in ${DES}/VOCAB.md${s.kind === 'experimental' ? ', the composition per screen with its fallbacks (the engine has NO composition hooks yet — Phase X adds them on its own branch after this spec; say exactly which hooks it needs)' : ''}, textures if any, icon style, the never-do list, a "Losing concept" section summarising the other (Micah may swap it in), and "Asks of the engine" (anything v2 cannot express).
2. ${WT}/vibes/defs/${s.id}.js — its PURE definition: the same shape as vibes/defs/v1.js with EVERY role filled (write a node check that walks v1.js's leaf key paths and asserts yours has each; all colours 6-digit hex; no LEGACY_EXACT spellings; id/name/feel/experimental/scheme/icons/images/variants/themeColor/shape set; ${s.kind === 'experimental' ? 'experimental: true' : 'experimental: false'}). Imports nothing. Hand-written with WHY comments. Also check it against the contract itself: a node script (under ${NIGHT}/tools/) that imports ${WT}/vibes/defs/index.js and your def and checks every ROLES entry and what valueOf() resolves — without editing index.js.
3. ${WT}/vibes/icons/${s.id}.js if the vibe has its own icon set (24×24 path data, v1's icon names, consistent stroke, reads at 22pt), OR a spark-only set (the neutral mark) with icons falling back to v1. Pure module, imports nothing.
4. Run a contrast check over every text role on every surface role in your def (node script; list any pair under 4.5:1 and fix it unless it is a large-text-only or v1-inherited pair) and a deutan/protan ΔE00 check of the six group colours. Report the numbers.
Do not edit index.js or anything else in ${WT} except the two new files. Do not commit.`,
    { label: `D:${s.id}:spec`, phase: 'Spec', schema: SPEC_SCHEMA }).then(spec => ({ slot: s.id, concepts, judges, spec }))
)
return { specs: perSlot.filter(Boolean).map(p => ({ slot: p.slot, spec: p.spec, judges: p.judges, concepts: p.concepts })) }
