export const meta = {
  name: 'v59-design-simple',
  description: 'V59 §9 D for the simple vibes under the change of plan: spec from SYNTHESIS pick or an existing concept, 1 judge, one revise',
  phases: [{ title: 'Spec' }, { title: 'Judge' }, { title: 'Revise' }],
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


// D3 (Micah's change of plan): simple vibes get NO concept panel. The spec is SYNTHESIS.md's pick (or a concept
// file already written for the slot), checked by ONE judge; one revise pass on must-fix. Effort: high.
const slots = (args && args.slots) || []
const PICK = (args && args.pick) || {}
const JUDGE1_SCHEMA = { type: 'object', properties: {
  must_fix: { type: 'array', items: { type: 'string' } }, should: { type: 'array', items: { type: 'string' } },
  scores: { type: 'object', description: 'distinct, ai_made (1 none - 10 obvious), readability, fits_rack, buildable' },
  verdict: { type: 'string' } }, required: ['must_fix', 'should', 'scores', 'verdict'] }
const specPrompt = (s, extra) => `${PREAMBLE}${CONTEXT}
===== YOUR JOB: the "${s.slot}" spec, its pure definition (id ${s.id}) — simple vibe, no concept panel =====
The slot (from ${DES}/PLAN.md / plan.json): ${JSON.stringify(s)}
Micah's change of plan: a simple vibe gets no concept panel. Its spec IS ${PICK[s.id]} — adopt it (its palette, face, shape tokens and per-block looks), completing whatever it leaves out, correcting only what fails a hard rule. Simple = new colours and/or fonts plus at most small shape tokens (radius, border weight); layout identical; VOCAB.md's 'shape'-grade looks at most. It must differ clearly from v1 and from the other simple vibes (${DES}/PLAN.md; Chalk's spec is being written in ${DES}/chalk.md, Navy/Oxblood in this same run).
Produce:
1. ${DES}/${s.id}.md — the final spec: name, idea, every token role, fonts (exact source URLs for the web latin woff2 or the OFL TTF to subset, and the static TTFs for native — ≤ 4, picker face included — each with licence/RFN), shape tokens, per-block look for EVERY block in ${DES}/VOCAB.md ('v1' or a shape-grade look), the never-do list, and where it came from (the pick).
2. ${WT}/vibes/defs/${s.id}.js — its PURE definition: the same shape as vibes/defs/v1.js with EVERY role filled (write a node check that walks v1.js's leaf key paths and asserts yours has each; all colours 6-digit hex; no LEGACY_EXACT spellings; id/name/feel/experimental:false/scheme/icons:'v1' (but redefine 'spark' per SYNTHESIS finding 6 if the icon set allows a per-vibe override; otherwise note it)/images:{}/variants/themeColor). Imports nothing. Hand-written with WHY comments.
3. A contrast check over every text role on every surface role (node; list any pair under 4.5:1 and fix it unless large-text-only or v1-inherited) and a deutan/protan ΔE check of the six group colours. Report the numbers.
Do not edit index.js (the orchestrator registers the vibe). Do not commit. Run tools at high effort; read narrowly.${extra || ''}`
const SPEC_SCHEMA_S = { type: 'object', properties: { id: { type: 'string' }, spec_file: { type: 'string' }, def_file: { type: 'string' }, registry_entry: { type: 'object' }, fonts: { type: 'array', items: { type: 'object' } }, contrast: { type: 'string' }, cvd: { type: 'string' }, variants: { type: 'object' }, open: { type: 'array', items: { type: 'string' } } }, required: ['id', 'spec_file', 'def_file', 'registry_entry', 'fonts', 'contrast', 'cvd', 'variants', 'open'] }
const out = await pipeline(slots,
  s => agent(specPrompt(s), { label: `D3:${s.id}:spec`, phase: 'Spec', schema: SPEC_SCHEMA_S, effort: 'high' }),
  async (spec, s) => {
    if (!spec) return { slot: s.id, spec: null }
    const j = await agent(`${PREAMBLE}${CONTEXT}
===== YOUR JOB: the one judge for the simple vibe "${s.id}" =====
Read ${spec.spec_file} and ${spec.def_file} in full, and ${DES}/PLAN.md. Score 1-10: distinct from v1 and from the other simple vibes (Chalk ${DES}/chalk.md if present; Navy/Oxblood ${DES}/navy.md, ${DES}/oxblood.md if present); "could an AI tool have made this?" (palette and type only — the layout is v1's by definition; 1 none, 10 obvious; research/01-ai-tells.md's tells); readability and contrast (recompute any number you doubt with a node script); fits Rack; buildable (tokens + fonts + small shape tokens only; font budgets). List MUST-FIX items only for hard-rule failures (a text pair under 4.5:1 that the vibe introduced, a group-colour pair that CVD merges, a missing role, a font that is not OFL or lacks a wght axis on web or static TTFs on native, a budget breach, not clearly different from another simple vibe). Everything else goes under "should".`, { label: `D3:${s.id}:judge`, phase: 'Judge', schema: JUDGE1_SCHEMA, effort: 'high' })
    let final = spec
    if (j && j.must_fix.length) final = await agent(specPrompt(s, `\n\nREVISE: your spec and def are already written (${spec.spec_file}, ${spec.def_file}). The judge's must-fix items: ${JSON.stringify(j.must_fix)}. Fix exactly those, re-run the checks, and report.`), { label: `D3:${s.id}:revise`, phase: 'Revise', schema: SPEC_SCHEMA_S, effort: 'high' }) || spec
    return { slot: s.id, spec: final, judge: j }
  })
return out
