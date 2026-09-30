export const meta = {
  name: 'v59-engine-web',
  description: 'V59 §5 E: the web engine on vibes/engine — tokenised rack.css/auth.css, vibe.js, paint()/icon() call sites, head script, lints — v1 identical',
  phases: [
    { title: 'E1 CSS', detail: 'rack.css/auth.css tokens, accent split, generator + scoping + literal lints' },
    { title: 'E2 JS', detail: 'vibe.js, paint() at hex call sites, icon(), head script, verifier import lists' },
    { title: 'Check', detail: 'suite in three zones + a quick A/B pixel check' },
  ],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const WT = `${NIGHT}/wt/web-engine`
const PROMPT = `${NIGHT}/VIBES-PROMPT.md`
const CODEMAP = `${NIGHT}/VIBES-CODEMAP.md`

const COMMON = `
===== THE WEB ENGINE (V59 §5 E) =====
You are one engine agent in a RELAY: exactly one engine agent writes this branch at a time. Worktree: ${WT} (branch vibes/engine, which already contains E0's contract commit(s): vibes/defs/v1.js, vibes/defs/index.js, vibes/icons/v1.js, tools-check/vibes-contract.mjs).
FIRST THING: the contract is still under adversarial review on branch vibes/contract; review fixes may land there while you work. If \`git -C ${WT} log --oneline vibes/engine..vibes/contract\` lists commits, make your tree clean (commit your WIP) and \`git -C ${WT} rebase vibes/contract\`. Check again before your final commit. Never edit the contract files yourself — if one is wrong, say so in your report.
COMMIT OFTEN: the account has a usage limit that can end your session mid-work without warning; anything uncommitted is lost to the next agent's understanding. Commit a WIP after every coherent sub-step (it may be red on this branch), with a body that says what is done and what is next. Commit your work on vibes/engine as WIP commits (subject "Engine (WIP): <what>"; body = what and why; end with "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"); the orchestrator squashes the branch into one commit on main after the proof gate. Never touch main, never merge.
Read: ${PROMPT} §5 "E: the web engine" (lines 543-648) in full, §7.1-7.2 and §7.5 (lines 795-842, 870-876), §8.1 web bullets (lines 895-905: the engine must leave room for store.js's initVibe/setVibe, which Phase S writes — do NOT write storage now), §12.1 (lines 1101-1112: a later phase adds a composition extension). Codemap ${CODEMAP} Web styling (lines 17-350) and Tooling §3 (lines 1343-1371). The contract files in the worktree. ship-v59 CLAUDE.md house style (you already have it).
THE BAR: with v1 active the site renders PIXEL-IDENTICAL and COMPUTED-STYLE-IDENTICAL to rack-v58 (928a65e), with data-vibe absent and with data-vibe="v1". A later gate proves it with a two-tree Chrome harness over 60 scenes × 2 widths; build for that bar. Do not change any word on screen, any behaviour, or any size.
Base tree for comparison (read-only): ${NIGHT}/wt/web-base (detached 928a65e).
Quick A/B check you may run while working (full proof is a later gate): if ${NIGHT}/wt/web-harness/report/btn-44/prove.mjs exists and \`git -C ${NIGHT}/wt/web-harness log --oneline -3\` shows the harness commit, read its header for usage and run it with REPO_A=${NIGHT}/wt/web-base, REPO_B=${WT} on a handful of scenes (it holds ${NIGHT}/harness.lock — if the lock is held, wait and retry later; never two at once). Otherwise use ${NIGHT}/tools/harness-smoke.mjs as a model for a quick two-tree screenshot comparison of a few scenes (take the lock the same way). Note: expected /vibe.js status is 404 on base, 200 on your tree once vibe.js exists.
Verifiers: run single ones as \`TZ=UTC node tools-check/<x>.mjs\` from ${WT}; full suites only via \`node ${NIGHT}/tools/run-verifiers.mjs web ${WT} ${NIGHT}/proof/<run-name>\`. touch-target must stay 408/408 against its CURRENT snapshot — never regenerate touch-target.snapshot.json. Pinned pure modules are untouchable (the fence denies edits); map their colours at the call sites.`

const E1 = `${COMMON}
===== YOUR SHARE: E1 — the stylesheets =====
1. rack.css :root: tokenise with IDENTICAL spellings (single-level literals in :root; a token holds one value, never a multi-value shorthand; no border width as a token; don't tokenise font-variation-settings, spacing, sizes, padding, border widths or motion):
   - channel tokens --rack-rgb, --accent-rgb, --p-red-rgb, --p-blue-rgb, --p-green-rgb, --p-white-rgb, --p-yellow-rgb, --shade-rgb (0,0,0), --lift-rgb (255,255,255) (and any other channel the literals need), values from hexToRgb of the contract's colours; rewrite EVERY raw rgba()/rgb() colour literal outside :root (≈79 in rack.css) as rgba(var(--x-rgb), a) — the pattern .kpi already uses at rack.css ~1913-1915 — keeping each alpha spelled exactly as before;
   - name the one-off hexes (--ink, --ink-plate, --ink-go, --accent-press, --on-danger, --video-bg — check each against the code and the contract) and point their uses at them;
   - split --p-yellow: add --accent and --focus (and --accent-rgb) as literal copies; point EVERY accent use at them (btn-primary, focus ring, dock mark, today, input focus, FAB, accent-color, the accent tints — go through each --p-yellow / 240,190,30 use and decide accent vs data (legs, carbs, fuel/weight subject, maintain zone); list your decisions in the commit body); --p-yellow stays the data colour. Do the same for any other double-duty value (e.g. #14161a as page and as ink-on-plate → --ink-plate);
   - radius tokens, shadow and scrim tokens, --font and --font-mono (as the contract's roles name them).
   - rack.css line 1 (the Archivo @import) byte-identical. No [data-vibe] rule in rack.css or auth.css. Leave these verifier-asserted lines textually intact: \`.set-row.drop .set-idx { margin-left: 10px; }\`; \`.qty-row .btn { flex: 0 0 54px; padding: 0; }\`; the .ask-opt min-height 44px and .ask-opt .ob-choice-t overflow-wrap; .coach-nudge-t nowrap/ellipsis; auth.css .ob-choice width: 100%; index.html's Train dock button markup.
2. auth.css: its 4 colour literals become tokens (auth.css only spends tokens rack.css owns).
3. tools-check/vibes-css.mjs (new): the single source of truth for vibe tokens. For every vibe def other than v1 (none yet — handle zero gracefully), the committed vibes/<id>.css must begin with a GENERATED block \`:root[data-vibe="<id>"] { … }\` between marker comments, generated from the def via the contract's ROLES map; check mode (default) fails if the committed block differs; \`--write\` regenerates it. It is not a runtime build step. For v1 it checks that rack.css :root's token values equal what the contract says (normalised: hex case-insensitive, whitespace in channel lists ignored) — tying v1.js to rack.css.
4. tools-check/vibes-scope.mjs (new, scoping lint): every selector in vibes/<id>.css starts with :root[data-vibe="<id>"] or [data-vibe="<id>"]; every @font-face family name is prefixed with the vibe id and never "Archivo"; rack.css and auth.css contain no [data-vibe]; mind the .set-row / .set-row-nav clash (a vibe rule for set rows must not catch settings rows — the lint can't know intent, so document it in the file header for vibe authors).
5. tools-check/colour-literals.mjs (new, static lint §7.5 web): no colour literal (hex, rgb/rgba/hsl, named colours except transparent/currentColor/inherit) outside the theme/vibe files. Allowed: rack.css inside :root only; vibes/<id>.css; vibes/defs/**, vibes/icons/**; vibe.js's paint map; the pinned pure files; store.js's refusal banner (name the exact lines); 404.html; index.html's <meta name="theme-color"> and the head script's per-vibe theme-color map (E2 adds it). It will be RED until E2 finishes the JS side — that's expected on this WIP branch; make it report a precise list.
Run touch-target, drop-sets, tick-targets, estimate-ask, recap, coach-surface (the CSS readers) in UTC as you go. Before handing over, do a quick A/B pixel check on a few scenes (see above) if the harness is available. Commit "Engine (WIP): the stylesheets — every colour through a token, the accent split from the legs yellow". Return what you did, every accent-vs-data decision, the counts (literals rewritten, tokens added), what is left for E2, and any risk.`

const E2 = `${COMMON}
===== YOUR SHARE: E2 — vibe.js, the JS call sites, index.html, icons =====

KNOWN PRE-EXISTING RED (not yours to fix; don't touch it): the rate-band verifier (native tools/verify-rate-band.mjs, web tools-check/rate-band.mjs) currently FAILS under TZ=Pacific/Auckland on the UNTOUCHED base trees (1cb6498 / 928a65e) — New Zealand's daylight saving starts 27 Sep 2026. Treat an Auckland rate-band failure as acceptable ONLY if the base tree (/Users/micahflunker/dev/vibes-night/wt/nat-base or wt/web-base) fails it the same way when run right after, in the same zone; report both results.

RESUMING: a previous E2 agent hit the account's usage limit mid-work. It committed 70fec3c "Engine (WIP): vibe.js — paint(), icon(), iconHtml() and the switch", e694434 "Engine (WIP): the call sites — paint(), icon(), the head script, app.js" and 2647d8f "Engine (WIP): vibePaint, and the verifiers that stage modules taught vibe.js", and left an untracked tools-check/vibe-js.mjs. Read those commits (git show --stat, then the diffs) and the untracked file first; keep what is right, and finish everything below that is not yet done. Don't redo finished work.
E1 has finished the stylesheets (its report is below). Now:
1. vibe.js (new, root): imports ONLY the pure vibes/defs and vibes/icons modules. Holds: current() (the active id), applyVibe(id) (normVibe; set or remove documentElement.dataset.vibe — absent for v1; localStorage['rack:vibe'] in try/catch; the theme-color meta; swap the dock SVGs via JS only when the vibe's icon set isn't v1 — keep the original dock markup so switching back restores it byte-for-byte; then re-render the current view through a registered callback — app.js registers switchView(current); NEVER location.reload(), it trips the live-workout beforeunload prompt; open sheets repaint through CSS variables), onVibeChange(fn), paint(c) (maps the plate hexes in ANY case — exercises.js uses uppercase — and #8d939f to var(--…) tokens; anything else passes through unchanged), icon(name, opts) (reads the current vibe's icon set, falling back to v1's; for v1 it must produce exactly today's markup at each site).
2. Hex baked into JS goes through paint() without touching the pinned files: wrap every call site that bakes GROUPS[g].color / groupColor(g) / PLATES into a style or SVG attribute — access.js, workout.js, picker.js, routines.js, coach-ui.js, stats.js, you.js (codemap Web §9.5 lists the lines at 928a65e: access.js:315,389; workout.js:434,457,595,632,1204,1407,2078,2158; picker.js:285,397; routines.js:136,186,385; coach-ui.js:803; stats.js:168,173,214,248,351,382; you.js:1250,1256,1284 — re-verify, find any others with a git grep for groupColor/GROUPS/PLATES/.color). SVG presentation attributes (fill="…") do not resolve var(): where a painted colour lands in an SVG attribute, move it to a style property (style="fill:var(--p-red)") so the computed value is identical. you.js's RGB channel strings for --kpi-rgb become var(--…-rgb). index.html's auth-mark inline hexes become var(--p-…).
3. Several verifiers copy modules to a tmpdir and rewrite a named list of imports (e.g. drop-sets, coach-surface — find them all: git grep for the import-rewrite pattern in tools-check). Adding ./vibe.js (and the vibes/ modules) to those lists is expected, in this commit. List every verifier you touch and why.
4. index.html: a classic inline <script> in <head>, BEFORE the stylesheet links (a script after a pending stylesheet waits for it): reads localStorage['rack:vibe'] inside try/catch; if it is a valid-looking id (^[a-z0-9][a-z0-9-]*$, ≤32) and not 'v1', sets document.documentElement.dataset.vibe; sets the theme-color meta from an inline {id: colour} map (empty for now — each vibe adds its entry later). Follow the rack:migrated precedent (store.js ~131) for a key outside the per-account namespace, and check purgeDevice/lsKey never touch it. Leave the dock markup in index.html BYTE-IDENTICAL (dock swaps are JS-only).
5. Icons: route food.js ICON_PATHS/icon(), the gear/calendar innerHTML sites (food.js ~529, steps.js ~159, you.js ~694, workout.js ~1013) and coach-ui.js's bubble/lock (~37, ~54) through vibe.js icon() — identical markup in v1. Glyph icons (‹ › ✕ ⋯ ✓ ↳ ✎ ⚙) stay text in v1.
6. Inline sizes (food.js fontSize 591/3272, steps 192, water 152, weight 336/396, ~180 inline marginTops) stay as they are. No element.style.height/minHeight/maxHeight anywhere touch-target's section D scans.
7. app.js: import vibe.js; register the re-render callback; at boot, if the head script set a non-v1 vibe, let vibe.js finish applying it (icons). For v1 nothing may change.
8. Make tools-check/colour-literals.mjs pass (E1 wrote it); keep vibes-css and vibes-scope green.
9. The whole web suite in three zones via run-verifiers (all green; touch-target 408/408), and a quick A/B pixel check on a few scenes including one with a plate strip, the calendar, stats bars, the auth screen and the dock (see above). Commit "Engine (WIP): vibe.js — paint(), icon() and the switch; the head script". Return: every call site you changed (file:line), every verifier you touched, suite results per zone, A/B check results, and anything not done.

E1's report:
`

const REPORT = {
  type: 'object',
  properties: {
    commit: { type: 'string' },
    done: { type: 'array', items: { type: 'string' } },
    decisions: { type: 'array', items: { type: 'string' } },
    counts: { type: 'object' },
    verifiers_touched: { type: 'array', items: { type: 'string' } },
    suite: { type: 'string' },
    ab_check: { type: 'string' },
    left: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['commit', 'done', 'decisions', 'counts', 'verifiers_touched', 'suite', 'ab_check', 'left', 'risks'],
}

phase('E1 CSS')
const e1 = await agent(`${PREAMBLE}${E1}`, { label: 'E1:css', phase: 'E1 CSS', schema: REPORT })
if (!e1) return { error: 'E1 failed' }
phase('E2 JS')
const e2 = await agent(`${PREAMBLE}${E2}${JSON.stringify(e1, null, 1)}`, { label: 'E2:js', phase: 'E2 JS', schema: REPORT })
if (!e2) return { e1, error: 'E2 failed' }
phase('Check')
const leftover = [...(e2.left || [])]
let e3 = null
if (leftover.length) {
  e3 = await agent(`${PREAMBLE}${COMMON}\n===== YOUR SHARE: E3 — finish what E1/E2 left =====\nKNOWN PRE-EXISTING RED (not yours to fix; don't touch it): the rate-band verifier (native tools/verify-rate-band.mjs, web tools-check/rate-band.mjs) currently FAILS under TZ=Pacific/Auckland on the UNTOUCHED base trees (1cb6498 / 928a65e) — New Zealand's daylight saving starts 27 Sep 2026. Treat an Auckland rate-band failure as acceptable ONLY if the base tree (/Users/micahflunker/dev/vibes-night/wt/nat-base or wt/web-base) fails it the same way when run right after, in the same zone; report both results.\n\nE1 and E2 reported (below). Finish everything in "left" that belongs to the engine (§5 E items 1-10), then run the full suite in three zones and a quick A/B check, and commit "Engine (WIP): the rest". Reports:\nE1: ${JSON.stringify(e1, null, 1)}\nE2: ${JSON.stringify(e2, null, 1)}`, { label: 'E3:finish', phase: 'Check', schema: REPORT })
}
return { e1, e2, e3 }
