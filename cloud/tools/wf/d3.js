export const meta = {
  name: 'v59-design-simple',
  description: 'V59 §9 D for the simple vibes under the change of plan: spec from SYNTHESIS pick or an existing concept, 1 judge, one revise',
  phases: [{ title: 'Spec' }, { title: 'Judge' }, { title: 'Revise' }],
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
