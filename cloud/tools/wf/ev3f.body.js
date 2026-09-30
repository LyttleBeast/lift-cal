export const meta = {
  name: 'v59-engine-3-fix',
  description: 'Engine v3: make two contract sentences true (Chalk cue.ink, native hero props), then re-prove the branch (with Navy merged in) against main: v1, Chalk and Navy unchanged',
  phases: [{ title: 'Fix' }, { title: 'Prove' }],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const WEB = `${NIGHT}/wt/web-ev3`
const NAT = `${NIGHT}/wt/nat-ev3`
const REF = `${NIGHT}/wt/web-mainref`
const HARNESS = `${NIGHT}/wt/web-harness/report/btn-44/prove.mjs`
const CTX = `
MICAH'S CHANGE OF PLAN: high effort; UTC-only suites on branches (\`node ${NIGHT}/tools/run-verifiers.mjs <web|nat> <wt> <outDir> UTC\`). No race hunts.
CURRENT MAINS (the session facts are older): web main 10fe73b, native main d2af836 — engine v2, Settings → Look → Vibes, Chalk and Navy. Engine v3 is on branch vibes/engine3: web ${WEB} (HEAD 87009ff: the contract 39d0605, the web engine up to c8a66c5, main merged in a80df3f, Navy's regenerated tokens 87009ff), native ${NAT} (HEAD 1eb0232: contract ee932af, engine up to 2c90055, main merged in with the pin table resolved). ${REF} is a clean detached checkout of web main 10fe73b (v1 + Chalk + Navy, no engine v3). Engine v3's full report and its check: the journal of run wf_2575fb3f-ed1 (~/.claude/projects/-Users-micahflunker-dev-ship-v59/a17eac98-c779-495e-b9f2-54be1cf67d7a/subagents/workflows/wf_2575fb3f-ed1/journal.jsonl; labels ev3:contract, ev3:web, ev3:native, ev3:check). Other vibes are being built on vibes/oxblood and vibes/iron-age — never touch their worktrees.
Commit via Write under ${NIGHT}/tmp/ + \`git -C <wt> commit -F <file>\`, ending "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"; explicit paths; never node_modules. RESUMING: if the worktrees show earlier work for this job, continue from it.`

phase('Fix')
const fix = await agent(`${PREAMBLE}${CTX}
===== YOUR JOB: make two sentences of the pinned contract (vibes/defs/vocab.js) TRUE — "an untrue sentence is worse than none" =====
1. vocab.js ~651, calCell · open: "today by its keyline (in shape.cue.ink)". Chalk (registered, calCell 'open') sets no cue.ink, so build(chalk).shape.cue.ink is chalk #111416 and chalk.css's --shape-cue-ink is #111416, while Chalk actually draws today's keyline in its accent #6c3058 (chalk.css ~338; chalk.js ~127 "Mulberry, one job: … today"). FIX: set shape.cue.ink 'accent' in Chalk's definition (web vibes/defs/chalk.js; copy byte for byte to native src/pure/vibes/defs/chalk.js; re-pin in native tools/verify-vibes-verbatim.mjs), regenerate the token blocks (\`node tools-check/vibes-css.mjs --write\` in ${WEB}). Show that no pixel of Chalk moves (the literal in chalk.css already draws the accent; if a site now reads --shape-cue-ink under Chalk, it must resolve to the same colour it drew before). Check Navy the same way if Navy uses a look that reads cue.ink.
2. vocab.js ~374, headline's native list: "the \`hero\` prop … at the same three: food.jsx's summary figure, steps.jsx's today figure, HeadlineV". Only HeadlineV has it. FIX: add the \`hero\` prop at native food.jsx's Fuel summary figure and steps.jsx's today figure, exactly as HeadlineV does (inert unless a vibe's headline look is 'solo'/'bare' — v1, Chalk and Navy draw byte-identical hosts), and add both sites to verify-vibe-seams' SITES if the others are there. If for a reason you find the prop cannot be inert, reword the sentence to what is true instead and say why.
Then: web UTC suite, native UTC suite, native verify-vibe-v1 byte-identical (re-baseline NOTHING), theme identity --require-build, verify-vibe-parity + verify-vibe-fit (Chalk and Navy registered), contract verifiers both trees, pure files byte-identical across trees. Commit on both branches ("Engine v3 (WIP): two contract sentences made true" / "engine3(wip): two contract sentences made true (V59 §9-§12)").`,
  { label: 'ev3f:fix', phase: 'Fix', schema: { type: 'object', properties: { web_commit: { type: 'string' }, native_commit: { type: 'string' }, done: { type: 'array', items: { type: 'string' } }, pins: { type: 'object' }, suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['web_commit', 'native_commit', 'done', 'pins', 'suite_utc', 'left'] }, effort: 'high' })
if (!fix) return { error: 'fix agent died' }

phase('Prove')
const proof = await agent(`${PREAMBLE}${CTX}
===== YOUR JOB: the merge-readiness proof of engine v3 (read-only on the worktrees; you are independent of the builders) =====
The fixer reported: ${JSON.stringify(fix)}
Prove on the CURRENT heads of vibes/engine3 (both trees):
1. WEB v1 and the registered vibes unchanged: \`node ${HARNESS} --a ${REF} --b ${WEB} …\` on EVERY scene at 390 and 320 — (a) data-vibe absent, (b) --data-vibe v1, (c) --vibe chalk, (d) --vibe navy. Read the harness header for the flags (both trees serve /vibe.js). Expected: 0 in every class except (i) attrDiffs that are only engine v3's own data-* hooks (data-hero, data-lead, data-tag) absent on A, (ii) cssDiffs/fileDiffs that are only the regenerated token text in chalk.css/navy.css and the pure files, (iii) the known dock raster flake (a PNG that the A tree itself produces). Account for EVERY difference; anything else is a must-fix. Under (c), Chalk's today keyline must still be #6c3058.
2. NATIVE: verify-vibe-v1 byte-identical (213 scenes / 25,586 hosts vs the 1cb6498 baseline + the committed Settings-hub overlay only), theme identity --require-build, verify-vibe-parity and verify-vibe-fit with Chalk and Navy, verify-vibe-switch, verify-vibes-verbatim (pins = the actual sha256 of each pure file; web and native copies identical), the full native suite in UTC.
3. The web suite in UTC; touch-target 408/408.
4. The two contract sentences (vocab.js calCell · open, headline's native list) are now true in the code.
Report must_fix (with a reproduction) and listed_not_fixed.`,
  { label: 'ev3f:prove', phase: 'Prove', schema: { type: 'object', properties: { must_fix: { type: 'array', items: { type: 'string' } }, numbers: { type: 'string' }, listed_not_fixed: { type: 'array', items: { type: 'string' } } }, required: ['must_fix', 'numbers', 'listed_not_fixed'] }, effort: 'high' })
return { fix, proof }
