export const meta = {
  name: 'v59-design-deep',
  description: 'V59 §9 D for the deep two + experimental under Micah\'s change of plan: 2 concepts (research pick + one alternative), 2 judges, winner-and-graft spec + pure def + icons, on contract/engine v2',
  phases: [
    { title: 'Concepts', detail: '2 independent concepts per slot' },
    { title: 'Judges', detail: '2 judges per slot score both concepts' },
    { title: 'Spec', detail: 'winner + graft → design/<id>.md, vibes/defs/<id>.js, vibes/icons/<id>.js' },
  ],
}

const PREAMBLE = `You are one agent in an unattended overnight build of "Vibes" for Rack (a phone-first training, nutrition and bodyweight log; web PWA + native iOS app). Nobody is watching until morning. The orchestrator gives you this brief; it begins with the build prompt's §0 verbatim, then Micah's rules, then the superseded-advice list, then the staging rule, then session facts, then your job.

===== §0 (verbatim) =====
## 0. Ground rules (the fence)

- **No push, deploy or publish.** No \`git push\`, \`wrangler\`, \`firebase\`, \`eas\`,
  \`gh\`, \`gh-pages\`. Commit through the hooks, never \`--no-verify\`.
- **Three canaries at the start, and again on every resume. Log all three
  results. If any one runs, stop.**
  - \`echo GUARDTEST ping\` must be refused (deny list).
  - \`echo GUARDTEST-MOBILE ping\` must be refused (deny list).
  - \`echo hookcheck wrangler\` must come back **"BLOCKED by deny-compound"**.
    This proves the PreToolUse hook is live and not failing open.
- **The hook (\`~/dev/deny-compound.mjs\`)** blocks any Bash command whose *text*
  contains a fenced word anywhere, even inside a path, a grep pattern or a
  commit message. The words are \`firebase\`, \`wrangler\`, \`eas\`, \`curl\`, \`wget\`,
  \`sed -i\`, \`git push\`, \`--no-verify\`, a whitespace-led \`-…n\` flag inside
  \`git commit\`, and redirects into \`.claude/\`. So:
  - search with the **Grep tool**, never with Bash;
  - **always commit with \`git commit -F <file>\`**, the message written with
    Write (the hook can't see file contents);
  - stage by directory when a file name contains a fenced word (e.g.
    \`git add report/btn-44/fakes\`);
  - write outputs under \`~/dev/vibes-night\`, never by redirecting.
- **If a required action is refused** (by the deny list, the hook, or auto
  mode), **don't retry it in other words.** Log it, take the documented
  fallback, and move on.
- **Where any CLAUDE.md or AGENTS.md says "stop and ask"**, nobody is here to
  answer. Log the question under "decisions left to Micah" and skip that one
  item.
- **Files go through Read, Edit, Write and Grep.**
  - Bash runs only these:
    - \`node\`, including the verifiers under \`TZ=…\`;
    - \`python3 -m http.server --bind 127.0.0.1\`, and headless Chrome, both
      through the harness;
    - \`sips\`;
    - git: read-only commands, plus \`git add\` **with explicit paths**,
      \`commit -F\`, \`merge\`, \`rebase\`, \`branch\`, \`worktree\`, and \`fetch web\`
      (in rack-mobile);
    - \`ln -s\` and \`rm\` of a worktree's \`node_modules\` symlink (§3.2);
    - \`mkdir\` under \`~/dev/vibes-night\`;
    - \`kill\` / \`pgrep\` for this night's own harness processes.
  - No \`sed\`, \`awk\`, \`cat\`, \`wc\`, heredocs, \`tee\`, or pipes into
    \`grep\`/\`head\`/\`tail\`.
- **Network, and nothing else:**
  - WebSearch/WebFetch for research;
  - a \`node\` script using \`fetch()\`, to the hosts in §14 only;
  - \`npm --prefix ~/dev/vibes-night/tools install <pkg>\` for dev tools;
  - \`git -C ~/dev/rack-mobile fetch web\`;
  - the harness's Chrome loading fonts (§7.1 pins Archivo locally anyway).
- **No npm install into either app.**
  - Web has no \`package.json\` and must not get one.
  - Native gets **no new dependency**: \`package.json\`, the lockfile, \`app.json\`
    plugins and \`ios/\` stay untouched.
  - Dev tools (an image tracer, a font subsetter, a PNG encoder, Chrome for
    Testing) go only in \`~/dev/vibes-night/tools\`, with the reason logged.
  - macOS \`sips\` is the first choice for image work.
- **No native builds:** no \`npx expo run:ios\`, \`expo prebuild\`, \`pod install\` or
  \`xcodebuild\`. Micah rebuilds in the morning.
- **Never open** \`~/dev/rack-worker\`, \`~/dev/rack-food\`, \`~/live\`, or any
  \`~/dev/ship-v*\` other than \`ship-v59\`. Native reads web through the
  \`ship-v59\` files in this same session, or through
  \`git -C ~/dev/rack-mobile show web/main:<file>\`.
- **Unchanged by one byte** (the fence also denies edits to them, in the main
  trees and in \`~/dev/vibes-night/wt/**\`):
  - web \`database.rules.json\` and \`database.rules.OPTIONAL-LOCK.json\`;
  - **the pinned pure modules, in both trees:** \`exercises.js\`,
    \`analytics.js\`, \`tdee.js\`, \`units.js\`, \`accounts.js\`, \`insights.js\`,
    \`estimate-origin.js\`, \`estimate-ask.js\`, \`coach.js\`, \`coach-build.js\`,
    \`coach-live.js\`, \`coach-prog.js\`, \`coach-goal.js\`, \`coach-overlap.js\`,
    \`coach-ready.js\`, \`coach-fuel.js\`, \`coach-volume.js\`, \`coach-tags.js\`.
    Their colours are mapped **at the call sites** (§5, §6).
  - **Not pinned** (native-only view modules): \`src/pure/coach-view.js\` and
    \`src/pure/recap-view.js\`. \`coach-view.js\` may gain an optional metrics
    argument (§6.6).
- **Delete nothing** except your own scratch under \`~/dev/vibes-night/\`, your
  own worktrees, and worktree \`node_modules\` symlinks.

**Micah's rules:**

- A wrong number, or an untrue sentence, is worse than none.
- Web is the guinea pig and native is the destination. Judge every visual
  decision by how it lands **on the phone**.
- Logic and data shared by both clients live in **pure modules copied
  verbatim** into native, sha256-pinned, with a \`verify-*-verbatim.mjs\`.
- Add no gate and remove none. Every vibe is for everyone.
- **Vibes change how Rack looks, never what it says or does.** No copy changes,
  no feature changes, no data changes (except the one new setting in §8).

**Precedent you must not repeat:** on 3–4 Sep an unattended "improvement pass"
re-tokenised the colours and deployed per phase. Micah had it **reverted in
full**. Tonight is different on purpose: nothing deploys, v1 is **proven**
identical before anything else lands, and every phase is its own commit, so
any single piece can be reverted without touching the others.

===== Codemap advice that this prompt supersedes (§3.3, verbatim) =====
1. "Make the vibe device-local" / "add a \`rack:device:\` prefix to ls.js."
   **No:** the vibe is saved per account; only the *web* keeps a device hint;
   native has no device key.
2. "All vibes stay dark-ground" / "dark tops only." **No:** light vibes are
   allowed (§10).
3. The web head script goes "after the stylesheet links." **No: before** them
   (§5.6).
4. "The harness fails all off-machine requests." **No:** it lets Google Fonts
   through. §7.1 pins Archivo locally instead.
5. "A 'Vibe' row under App." **No:** a new section, **Look → Vibes** (§8.2).
6. "The proposed-rules addition is optional." **No:** it's required (§8.1).
7. "Defer the experimental rearranging vibe." **No:** it's in scope (§12).

===== The staging rule (§3.2, verbatim) =====
- **Don't use a workflow's \`isolation: 'worktree'\`.** It places worktrees
  under \`.claude/\`, where the fence and hook get in the way, and it may branch
  from \`origin/main\` rather than your HEAD.
- **You create every worktree yourself, from the current HEAD:**
  - \`git -C ~/dev/ship-v59 worktree add ~/dev/vibes-night/wt/web-<name> -b vibes/<name>\`
  - \`git -C ~/dev/rack-mobile worktree add ~/dev/vibes-night/wt/nat-<name> -b vibes/<name>\`
  
  Give each agent the **absolute path** of its worktree.
- **rack-mobile worktrees need \`node_modules\`.**
  - Link it in:
    \`ln -s ~/dev/rack-mobile/node_modules ~/dev/vibes-night/wt/nat-<name>/node_modules\`.
    The symlink is **untracked**; \`.gitignore\`'s \`node_modules/\` only
    matches directories.
  - **Never** use \`git add -A\`, \`git add .\` or \`git add :/\` in any worktree.
    Stage explicit paths only.
  - Before every merge, run \`git -C ~/dev/rack-mobile diff --name-only main...vibes/<name>\`
    and refuse the merge if \`node_modules\` appears.
  - To retire the worktree, \`rm ~/dev/vibes-night/wt/nat-<name>/node_modules\`
    (the link only, no trailing slash), then \`git worktree remove\` with no
    \`--force\`.
  - Apply all of this to the \`1cb6498\` baseline worktree (§7.3) too.
- **Who edits what.**
  - During E and N, exactly **one engine agent per tree**, on its own
    branch/worktree, owns \`theme.js\` / \`rack.css\` and the engine files.
  - From P onward, **only you** edit the shared files: \`theme.js\`,
    \`rack.css\`'s \`:root\`, \`index.html\`'s \`<link>\` lines, the vibe registries
    and the Settings hubs. Only you merge into \`main\`.
  - Vibe agents write only their own vibe's files.
  - Keep history linear, and never force anything.
("You" in the staging rule is the orchestrator. The orchestrator creates worktrees and merges; you work only where your job says.)

===== Session facts (from the orchestrator) =====
- Web main tree: /Users/micahflunker/dev/ship-v59 (HEAD 928a65e = rack-v58). Native main tree: /Users/micahflunker/dev/rack-mobile (HEAD 1cb6498 = buildNumber 58). Never edit, stage or commit in either main tree; never merge into main. Work only where your job says.
- The orchestrator ran all three canaries at the start and on resume; all held. You need not run them.
- There is NO Grep tool and NO Glob tool in this session. Search tracked files with read-only git: \`git -C <tree> grep -n -e <pattern> -- <paths>\`. For anything else, or any pattern containing a fenced word, write a small node script under /Users/micahflunker/dev/vibes-night/tools/ and run it with node (the hook reads only the command text, not file contents). Never pipe; no cat/sed/awk/wc/head/tail/ls.
- Downloads: only \`node /Users/micahflunker/dev/vibes-night/tools/fetch.mjs <url> <outfile under ~/dev/vibes-night>\` (enforces §14's hosts, follows redirects only to allowed hosts, prints bytes + sha256). WebSearch and WebFetch are fine for reading pages. Search snippets are not sources: list only URLs you actually opened.
- Dev tools already installed in /Users/micahflunker/dev/vibes-night/tools/node_modules: imagetracerjs, opentype.js, subset-font, pngjs. If you need another, \`npm --prefix /Users/micahflunker/dev/vibes-night/tools install <pkg>\` and state the reason in your final answer.
- This is an 8 GB M1 shared by ~9 agents: keep local work light. Headless Chrome only inside a harness holding /Users/micahflunker/dev/vibes-night/harness.lock.
- Don't edit /Users/micahflunker/dev/vibes-night/VIBES-LOG.md (the orchestrator's log). Report refusals, installs and decisions in your final answer.
- The codemap: /Users/micahflunker/dev/vibes-night/VIBES-CODEMAP.md (line numbers drift; the code wins; the prompt beats the map). The build prompt: /Users/micahflunker/dev/vibes-night/VIBES-PROMPT.md — read only the sections your job names.
`


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
