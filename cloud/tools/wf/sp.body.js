export const meta = {
  name: 'v59-simple-polish',
  description: 'Micah\'s panel decision for the simple vibes on main (Chalk, Navy, Oxblood): fix the judges\' cheap and safe giveaways, log the rest; then re-prove v1, contrast, fit and parity per vibe',
  phases: [{ title: 'Fix' }, { title: 'Prove' }],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const HARNESS = `${NIGHT}/wt/web-harness/report/btn-44/prove.mjs`
const REF = `${NIGHT}/wt/web-mainref`
const JUDGES = `${NIGHT}/tmp/resume9/simple-judges.json`
const IDS = [{ id: 'chalk', name: 'Chalk' }, { id: 'navy', name: 'Navy' }, { id: 'oxblood', name: 'Oxblood' }]
const CTX = `
MICAH'S DECISION ON THE PANEL (30 Sep): "The goal is how it looks to real people, not whether an AI detector can tell." For Chalk, Navy and Oxblood the panel is ADVISORY: fix the concrete giveaways the judges list where it's CHEAP and SAFE, and log the rest. It never blocks a merge. Micah is the final judge from the gallery.
MICAH'S CHANGE OF PLAN: high effort; UTC-only suites on branches (\`node ${NIGHT}/tools/run-verifiers.mjs <web|nat> <wt> <outDir> UTC\`). No race hunts.
CURRENT MAINS (the session facts are older): web main a78ec39, native main ba4a447 — engine v2 + v3, Settings → Look → Vibes, Chalk, Navy, Oxblood. Engine v3 gave roles that answer several giveaways cheaply: colors.greetName (the greeting name's ink — a HEX role), type.tag (the small literal-caps sites: sync pip, section heads outside presets, legends, add-tile tag…; web --type-tag-* tokens), colors.knob, shape.stripe, chart·ink (web: a vibe CSS rule path[fill^="url(#"] { fill: none } drops the pinned charts' area wash). Read vibes/defs/vocab.js and index.js ROLES on main for exact names. ${REF} is a clean detached checkout of web main a78ec39. Other vibes are being built on vibes/iron-age, vibes/ledger, vibes/clear-sky — never touch their worktrees; the Chalk/Navy/Oxblood polish branches below are separate worktrees and each job touches only its own.
Commit via Write under ${NIGHT}/tmp/ + \`git -C <wt> commit -F <file>\`, ending "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"; explicit paths; never node_modules. RESUMING: if the worktrees show earlier work for this job, continue from it.`
const HARD = v => `the hard rules — contrast and colour vision (every colour ${v} changes: 4.5:1 text, 3:1 large text and graphics, no worse than v1 where v1 itself fails; the six group colours ΔE00 ≥ 12 under deutan/protan), fit and 44pt targets, every word and number identical, SAME LAYOUT (a simple vibe: colours, faces and small shape tokens only), the dock untouched, v1 byte-identical (every change in ${v}'s own stylesheet, its own definition, or its own branch of a native look switch — no shared file), web and native in step (definition byte-identical across the trees; re-copy + re-pin in native tools/verify-vibes-verbatim.mjs; native parity)`
const GIVE_SCHEMA = { type: 'object', properties: {
  web_commit: { type: 'string' }, native_commit: { type: 'string' }, fixed: { type: 'array', items: { type: 'string' } },
  logged: { type: 'array', items: { type: 'object', properties: { giveaway: { type: 'string' }, reason: { type: 'string' } }, required: ['giveaway', 'reason'] } },
  suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } },
}, required: ['web_commit', 'native_commit', 'fixed', 'logged', 'suite_utc', 'left'] }
const PROOF_SCHEMA = { type: 'object', properties: { must_fix: { type: 'array', items: { type: 'string' } }, numbers: { type: 'string' }, listed_not_fixed: { type: 'array', items: { type: 'string' } } }, required: ['must_fix', 'numbers', 'listed_not_fixed'] }

const prove = (v, web, nat, fx, round) => agent(`${PREAMBLE}${CTX}
===== YOUR JOB: re-prove ${v.name} after its giveaway pass (round ${round}; read-only on the worktrees; independent of the fixer) =====
Worktrees: web ${web} (branch vibes/${v.id}-polish), native ${nat}. The fixer reported: ${JSON.stringify(fx)}
1. v1 UNCHANGED (web): \`node ${HARNESS} --a ${REF} --b ${web} …\` on EVERY scene at 390 and 320, data-vibe absent and --data-vibe v1 (read the harness header for the flags; both trees serve /vibe.js): 0 in every class except the vibe's own stylesheet/definition text (cssDiffs/fileDiffs) and the rules fixture's chains for rules the vibe added or removed (realign with ${NIGHT}/tools/ev3x-fixture-realign.mjs) and the known dock raster flake (a PNG the A tree produces). Native: verify-vibe-v1 byte-identical, theme identity --require-build.
2. ${v.name} STILL SAME LAYOUT and the same words: the same A/B with --vibe ${v.id}: TEXT and VALUE differences 0 and STRUCTURE 0 against A=${REF} worn in ${v.id} (\`--vibe\` applies to both) apart from the fixture — style/rect/pixel differences are the polish itself. Native: verify-vibe-fit (words and controls equal v1's).
3. CONTRAST/CVD for every colour the pass changed (reuse ${NIGHT}/tools/vibe-contrast/: web.mjs / native.mjs / compare.mjs / cvd.mjs), native verify-vibe-parity, verify-vibes-verbatim, both UTC suites.
Report must_fix (with a reproduction) and listed_not_fixed.`, { label: `SP:${v.id}:prove-r${round}`, phase: 'Prove', schema: PROOF_SCHEMA, effort: 'high' })

const results = await pipeline(IDS,
  v => agent(`${PREAMBLE}${CTX}
===== YOUR JOB: ${v.name}'s giveaway pass =====
Worktrees: web ${NIGHT}/wt/web-p-${v.id} (branch vibes/${v.id}-polish, from web main a78ec39), native ${NIGHT}/wt/nat-p-${v.id} (branch vibes/${v.id}-polish, from native main ba4a447; node_modules is a symlink — never stage it). ${v.name}'s spec: ${NIGHT}/design/${v.id}.md. Its judge (the old adversarial brief) listed these tells and fixes — the entry "${v.id}" in ${JUDGES} (Read it). Go through EVERY tell: fix it where it is cheap and safe (a value in vibes/defs/${v.id}.js, a rule in vibes/${v.id}.css, ${v.name}'s own native look branch), true to the spec; LOG the rest with a concrete reason (it is v1's own layout, which a simple vibe keeps; it needs a shared file; it would break a hard rule — e.g. a light vibe's dark status band is required on the web; or you disagree and why). Stay within ${HARD(v.name)}. Re-run both UTC suites, regenerate the token block if the definition changed (\`node tools-check/vibes-css.mjs --write\`), re-shoot the gallery (\`node ${HARNESS} shoot --repo <web wt> --out ${NIGHT}/proof/sp-${v.id}/shoot --vibe ${v.id}\`) and Read the PNGs. Commit on both branches ("Vibe: ${v.name} — the judges' giveaways" / "vibe: ${v.name} — the judges' giveaways (V59 §10)").`,
    { label: `SP:${v.id}:fix`, phase: 'Fix', schema: GIVE_SCHEMA, effort: 'high' }),
  async (fx, v) => {
    if (!fx) return { id: v.id, error: 'fix agent died' }
    const web = `${NIGHT}/wt/web-p-${v.id}`, nat = `${NIGHT}/wt/nat-p-${v.id}`
    let p = await prove(v, web, nat, fx, 1)
    let fix2 = null
    if (p && p.must_fix.length) {
      fix2 = await agent(`${PREAMBLE}${CTX}
===== YOUR JOB: fix what ${v.name}'s re-proof found =====
Worktrees: web ${web}, native ${nat}. Items: ${JSON.stringify(p.must_fix)}. For each: reproduce, fix (or revert the polish change that caused it), show the check passes. Stay within ${HARD(v.name)}. Both UTC suites. Commit ("Vibe: ${v.name} — what the re-proof found" / "vibe: ${v.name} — what the re-proof found (V59 §10)").`,
        { label: `SP:${v.id}:fix2`, phase: 'Fix', schema: GIVE_SCHEMA, effort: 'high' })
      if (fix2) p = await prove(v, web, nat, fix2, 2)
    }
    return { id: v.id, fix: fx, fix2, proof: p, ready: !!p && p.must_fix.length === 0 }
  })
return { results }
