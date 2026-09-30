export const meta = {
  name: 'v59-compose-X',
  description: 'V59 §12.1 Phase X: the composition extension — named top-level blocks per screen, a compose role (v1 = today\'s order, no grouping), render order from the vibe on both clients; v1 proven identical',
  phases: [{ title: 'Contract' }, { title: 'Engines' }, { title: 'Check' }],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const WEB = `${NIGHT}/wt/web-compose`
const NAT = `${NIGHT}/wt/nat-compose`
const REF = `${NIGHT}/wt/web-mainref`
const HARNESS = `${NIGHT}/wt/web-harness/report/btn-44/prove.mjs`
const CTX = `
MICAH'S CHANGE OF PLAN: high effort; UTC-only suites on branches (\`node ${NIGHT}/tools/run-verifiers.mjs <web|nat> <wt> <outDir> UTC\`). No race hunts.
CURRENT MAINS (the session facts are older): web main a78ec39, native main ba4a447 — engine v2 + v3, Settings → Look → Vibes, Chalk, Navy, Oxblood registered. ${REF} is a clean detached checkout of web main a78ec39 (the v1 reference). Other vibes are being built on vibes/iron-age, vibes/ledger, vibes/clear-sky and polished on vibes/{chalk,navy,oxblood}-polish — never touch those worktrees. Phase X is its OWN branch (vibes/compose): web ${WEB}, native ${NAT} (node_modules is a symlink — never stage it). It merges only after the other vibes land; later vibes will merge over it, so keep the change small and additive.
Commit via Write under ${NIGHT}/tmp/ + \`git -C <wt> commit -F <file>\`, ending "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"; explicit paths; never node_modules. A usage limit can end your session: commit WIP often. RESUMING: if the worktrees show earlier work for this job, continue from it.`
const X = `
===== PHASE X (V59 §12.1): THE COMPOSITION EXTENSION =====
Read ${NIGHT}/VIBES-PROMPT.md §12 (lines 1099-1122) and §2 (191-233: the layout rules — the experimental vibe MAY rearrange within a screen, NEVER the dock; per-screen fallback to "same order, new shapes"). The one vibe that will use it is Meet Day: its spec ${NIGHT}/design/meet-day.md — §8.1 (its compose data, per screen) and §9 (the hooks it needs, X1-X7) — and its asks in ${NIGHT}/tmp/resume9/d4-specs.json (meet-day, engine_asks E2).
Build:
 (1) NAMES: each top-level block of these screens gets a stable name, the same on both clients: the five tab landings (You, Train calendar, Fuel day, Weight, Steps), the workout summary, and the live workout session (its top-bar zone, the position of the exercise-card stack, where the plate strip sits). Only top-level blocks; a block's inside is untouched.
 (2) CONTRACT: a \`compose\` role (dflt {}; v1 = {} = today's order, no grouping) in vibes/defs/{v1,index,vocab}.js — per screen: an ordered list of block names, optional groups (blocks drawn together under one head where the vibe merges them), and an explicit fallback flag per screen. A compose entry must name every block of its screen exactly once (nothing removed, nothing added, nothing hidden), may not touch the dock, and may only group blocks whose own heads/controls all survive. The contract verifiers (web tools-check/vibes-contract.mjs, native tools/verify-vibes-contract.mjs) enforce the grammar, each with a canary that fails. Pure files copied byte for byte to native src/pure/vibes/ and pinned.
 (3) ENGINES: render order (and grouping) comes from the active vibe's compose; with {} every screen renders exactly as today — the same DOM/host tree, order, attributes (a data-block="<name>" hook on the web is fine, as engine v3's data-* hooks were), styles, props. Reorder the DOM (web) / the element list (native), not CSS order, so reading order and focus order follow what is seen. Switching vibes re-renders into the new order without losing state (a live session, its sets, the rest timer, an open sheet).
 (4) Implement ONLY the hooks X1-X7 Meet Day needs if they are cheap and safe; the rest as listed-not-built with the reason.`
const REPORT = { type: 'object', properties: { commit: { type: 'string' }, done: { type: 'array', items: { type: 'string' } }, proof: { type: 'string' }, suite_utc: { type: 'string' }, left: { type: 'array', items: { type: 'string' } } }, required: ['commit', 'done', 'proof', 'suite_utc', 'left'] }
const CHECK = { type: 'object', properties: { must_fix: { type: 'array', items: { type: 'string' } }, listed_not_fixed: { type: 'array', items: { type: 'string' } }, numbers: { type: 'string' } }, required: ['must_fix', 'listed_not_fixed', 'numbers'] }
const PROOF = `Prove v1 unchanged: \`node ${HARNESS} --a ${REF} --b ${WEB} …\` on EVERY scene at 390 and 320 — data-vibe absent, --data-vibe v1, and --vibe chalk / navy / oxblood: 0 differences in every class except the data-block hooks (attrDiffs absent on A) and the pure files; native verify-vibe-v1 byte-identical (re-baseline NOTHING), theme identity --require-build, verify-vibe-parity/-fit/-switch/-seams; both UTC suites. Then prove the engine works: a SCRATCH vibe under ${NIGHT}/tmp (never registered) whose compose reverses/groups blocks on each screen renders every block and every control once (web: the harness's text/struct in that scratch order; native: verify-vibe-fit's words and controls), the dock unchanged, and switching into it and back mid-session loses nothing.`

phase('Contract')
const contract = await agent(`${PREAMBLE}${CTX}${X}
===== YOUR JOB: the NAMES and the CONTRACT part of Phase X =====
Survey both clients' seven screens and fix the block names (one table, written into vocab.js's compose wording and into ${NIGHT}/design/COMPOSE.md with each name's web selector/function and native component/site). Then the contract change (2) in the web tree, copied byte for byte to native and pinned; both contract verifiers green with their new canaries; both UTC suites. Commit ("Compose (WIP): the names and the contract" / "compose(wip): the names and the contract (V59 §12)").`,
  { label: 'X:contract', phase: 'Contract', schema: REPORT, effort: 'high' })
if (!contract) return { error: 'contract agent died' }

phase('Engines')
const engines = await parallel([
  () => agent(`${PREAMBLE}${CTX}${X}\nThe contract agent reported: ${JSON.stringify(contract)}\n===== YOUR JOB: the WEB engine part of Phase X =====\nWorktree ${WEB}. Implement (3) on the web (the page modules draw each screen's top-level blocks through one small helper that orders/groups them by the active vibe's compose; v1 = today's code path and output) and the cheap, safe hooks of (4). ${PROOF} Commit "Compose (WIP): the web engine".`, { label: 'X:web', phase: 'Engines', schema: REPORT, effort: 'high' }),
  () => agent(`${PREAMBLE}${CTX}${X}\nThe contract agent reported: ${JSON.stringify(contract)}\n===== YOUR JOB: the NATIVE engine part of Phase X =====\nWorktree ${NAT}. Implement (3) natively (each screen's top-level elements go through one small helper ordering/grouping them by T's compose; v1 = today's JSX output, host for host) and the cheap, safe hooks of (4); every new switch site in verify-vibe-seams. ${PROOF} Commit "compose(wip): the native engine (V59 §12)".`, { label: 'X:native', phase: 'Engines', schema: REPORT, effort: 'high' }),
])
phase('Check')
const check = await agent(`${PREAMBLE}${CTX}${X}\nReports: contract ${JSON.stringify(contract)}; engines ${JSON.stringify(engines)}\n===== YOUR JOB: check Phase X (read-only; findings need a reproduction) =====\nRe-run the proofs the builders claim (at least the native snapshot and 14 web scenes — the seven screens at both widths — absent + --data-vibe v1 + --vibe chalk), the scratch-vibe reorder proof, and the grammar canaries. Confirm the block names are the same on both clients and cover every top-level block of the seven screens. Classify must-fix (v1 or a registered vibe moved, a block or control lost under a reorder, a proof red) vs listed-not-fixed.`,
  { label: 'X:check', phase: 'Check', schema: CHECK, effort: 'high' })
let fix = null, recheck = null
if (check && check.must_fix.length) {
  fix = await agent(`${PREAMBLE}${CTX}${X}\n===== YOUR JOB: fix Phase X's must-fix items =====\nItems: ${JSON.stringify(check.must_fix)}. Reproduce, fix, show the check passes; keep v1 and the registered vibes unchanged. Commit on the branch(es) touched.`, { label: 'X:fix', phase: 'Engines', schema: REPORT, effort: 'high' })
  if (fix) recheck = await agent(`${PREAMBLE}${CTX}${X}\n===== YOUR JOB: re-check Phase X after its fix =====\nThe check found ${JSON.stringify(check.must_fix)}; the fixer reported ${JSON.stringify(fix)}. Re-run in full: native verify-vibe-v1 + theme identity + suite; web prove A=${REF} B=${WEB} on EVERY scene at both widths, absent / --data-vibe v1 / --vibe chalk / navy / oxblood; the scratch reorder proof. Report must_fix and listed_not_fixed.`, { label: 'X:recheck', phase: 'Check', schema: CHECK, effort: 'high' })
}
return { contract, engines, check, fix, recheck }
