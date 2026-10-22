# Rack — working on this repo

Rack is a phone-first training, nutrition and bodyweight log. It is a plain
static site served by GitHub Pages, backed by Firebase Realtime Database, with
one Cloudflare Worker standing in front of the Anthropic API for the food
estimator. There is no framework, no bundler and no build step: the browser
loads `app.js` as an ES module and that module graph is the whole app.

Read [AGENTS.md](AGENTS.md) before touching anything that reads or writes the
database. It is the schema, node by node, and the access model. It is also 20KB,
so read it when the change actually touches data — not for a CSS fix.

---

## Read this before you edit anything

**The Worker is not in this repo.** The Cloudflare Worker that holds the
Anthropic key is its own private repo, `~/dev/rack-worker`, and it is built and
deployed from there. Nothing in this tree deploys it, and nothing in the app
imports it — the app's entry point is `app.js`, which is what `index.html`
loads. If a change is needed on the Worker side, it is made in `~/dev/rack-worker`
and deployed with `npx wrangler deploy` from inside that repo.

*History, so older docs make sense:* the Worker's files sat loose at this repo's
root until September 2026, then moved to a `worker/` subdirectory here. That
copy went stale — it predates the food estimator — and was removed in v40,
because a stale copy of a deployable is a rollback footgun: a `wrangler deploy`
run from the wrong directory ships it. Git history still has it.

**`DEPLOY.md` is the current checklist — read it before shipping anything.** It
covers the three separate deploy targets (app, Firebase rules, Worker), the
version-bump rule, how to verify a ship, and how Micah adds a person. It was
rewritten in September 2026; older sessions and older docs describe it as stale
history, and that is no longer true. The handoff below is still how you end.

## Layout

| | |
|---|---|
| `index.html` `app.js` | Entry point and boot order |
| `store.js` | Firebase read/write, auth, sign-up, password reset |
| `access.js` `onboarding.js` | Invite codes, approval, the waiting screen, first run |
| `you.js` `insights.js` `settings.js` `admin.js` `usage.js` | The You tab, what Rack makes of the data (pure, no reads), the settings hub, the owner panel, usage counters. **October 2026:** You is the goal as one number, four number tiles and three rows (Weekly review, Trends, Rack noticed) that open screens of the same tab (`you.js` `sub`); every card it drew before is still drawn behind a row (`you-rows.js`, `you-numbers.js`, held by `tools-check/you-structure.mjs`). Settings is one searchable list of grouped rows with icon tiles (`settings-registry.js`, `tiles.js`, `tile-icons.js`; `tools-check/settings-registry.mjs`), and since v68 every row's sheet carries ‹ Settings back to the hub (`settings.js` `kid`, `ui.js` `asChildSheet`; `tools-check/settings-back.mjs`); Admin lives under Settings → Help (owner only) and the install card under Settings → Help too. There is no Steps tab: since v67 the dock is You, Train, Fuel, Weight, Friends |
| `accounts.js` | Account types — the pure tier table and the single entitlement choke point. Fails open; see AGENTS.md |
| `coach.js` `coach-build.js` `coach-live.js` `coach-prog.js` `coach-goal.js` `coach-overlap.js` `coach-ready.js` `coach-fuel.js` `coach-volume.js` `coach-tags.js` `coach-ramp.js` `coach-ask.js` `coach-data.js` `coach-ui.js` | Coach — the deterministic engine that reads the log and says one true thing about it, (`coach-build.js`) the workout builder that turns it into a session he can start, (`coach-live.js`) the in-session read that says what comes next during one — since v54 counting the sessions finished earlier that day, and saying the next set and the effort chips' words — (`coach-prog.js`) the targets — per lift, the weight and reps for next time, from his own history, and since v52 `targetFor()`, which gives a marked session's lift the target from before it, and since v54 his per-set effort rating and `nextSet()`, the next set mid-session — (`coach-goal.js`) the goal's dials, the energy context, bodyweight at a moment and the goal's pace, and (`coach-overlap.js`) stage two: plateau or cut, the stall ladder, the lighter week, the record day, and the stage-three reads that replay a target or read a lift's series, (`coach-ready.js`) stage four's training half: recovery windows, the rest read, readiness, what was different about a session, and (`coach-fuel.js`) its food half, "Am I fueled?" — the two never import each other — and (`coach-volume.js`, v54) stage five's whole week: each group's hard sets against a common range and his own normal (since v56 strength's 6–15 only on the main lifts' groups, `coach-goal.js` `MAIN_LIFTS`), the neglected group, and balance, counts only — since v56 counting a custom exercise by the movement he sets on it (`coach-tags.js` `ownMovement()`). `coach.js`, `coach-build.js`, `coach-live.js`, `coach-prog.js`, `coach-goal.js`, `coach-overlap.js`, `coach-ready.js`, `coach-fuel.js`, `coach-volume.js`, `coach-tags.js`, (v70) `coach-ramp.js` — the ramp model: which of a lift's sets were the warm-up, tagged W or read from their shape, the one word every engine reader takes for "a working set"; where the live next set cannot tell the two apart it says nothing (`nextSet()` returns null) rather than guess — and (v72) `coach-ask.js` — the questions and what he answered: the catalog of every question Coach may ask (coach.js's `QUESTIONS` is its `answers` subset), the facts he told it (`{ v, c, at, n }` at `settings/coach` `know` / `knowBy` / `tally`), a budget of two stored answers a day and six a week counted from the `asked` stamps alone, `pickQuestion()` for a moment, and `debriefPlan()`, the recap's three slots — are **pure** and are copied into the native tree verbatim; `coach-data.js` is the impure gatherer the port rewrites; `coach-ui.js` is the card (an earned line, since v49; after a workout, since v53, the finish line — `finishRead()` in `coach.js`, which the recap and the sheet read too — and a warm line when nothing is earned), the sheet, the target line, Your goal and the live session's chip and nudge. **Since v71 every sentence Coach says is in the first person** — "Coach" survives only as a label (the eyebrow, `Coach · `, COACH ME, Ask Coach, a Settings row title); `tools-check/coach-voice.mjs` P (`VOICE_BANNED`, `LABELS`) fences every prose literal in the twelve files that carry Coach's words, and the battery's `scoring.mjs` carries the third-person rows — and four first-person pools (`coach.js` §7d: `BAD_DAY`, `PR_LINES`, `BACK_LINES`, `REST_LINES`, data rows with a gate) feed the finish line (a bad day, a record, a comeback) and the card's warm slot (away twelve days or more, a rest day); a line is in a pool only when every word is true of his log when drawn. Settings live at `settings/coach` (the goal is answers there plus one `goalLift` key, the bad-day `marks` since v52, since v54 the neglect line's `asked.vol_neglect` stamp, since v56 the balance answer's `asked.bal_custom`, and since v72 — `v: 2` — the facts `know` / `knowBy` / `tally` and the per-item stamps `asked.warm:<exId>` and `asked.q_pr_how:<recordId>`, children of the granted node, no rules change); **the recap (v72)** draws three slots under the finish line from `coach().debrief(record)` — the warm-up confirmation ("Were 45, 135 and 225 lb your warm-ups on Back Squat?", *Yes, tag them* retypes the sets W on the record through `workout.js` `retagWarmups`, the whole session node rewritten as `saveEdit` writes it), the shipped feel card, and one question ("did that record have more in it?" writes `rir` on the record set); `knowBy.warm` `no` on a lift switches the ramp model off for it everywhere; **in the gym (v73)**, the live sheet answers the literal question — `coach-live.js` `anotherSetRead()`, "another set, and at what weight?", one answer with a chip row (*Yes, 185 lb × 8* / *Heavier* only when `nextSet()` says `up` / *Same again* as a quote / *That's the last one* / *Done for today*), every chip's number `nextSet()`'s or a quote of the set he ticked, through the shipped `useNext` path; the quiet line under a finished exercise is its `short`; `coach-ask.js` `q_equipment_step` asks the step on a machine in the live lane and under the targets, written to `knowBy.step` (pounds), and `coach-prog.js` `stepOf()` reads it only where the log has no step seen twice — the log wins; `tally.extraOffered`/`extraTaken` count the offers and the Yes taps; **when I have no number (v74)** the live sheet never says "nothing" — `coach-live.js` `fallbackRead()` (and `anotherSetRead()`'s defer) quotes his last logged session of the lift ("Last time you worked at 225 lb × 4, then 225 lb × 2.") and carries one question so he can steer, `q_want_next` (*Go for more* / *Match last time* / *Ease off*, `knowBy.wantNext.<exId>`, read by `coach-prog.js` only as COACH-V2-SPEC §3.4 says) or, on a lift the log has never seen, `q_rough_weight` (`knowBy.rough`, pounds, the log wins); a defer target is drawn with last time beside it (`coach-prog.js` `targetSaid()`); the battery counts dead ends and gates them at zero; the food days "Am I fueled?" reads are read on an ask, Pro only, never on a paint; the greeting counter and the card's line memory are device storage, deliberately — see AGENTS.md |
| `food.js` `recall.js` `importer.js` `ai.js` `ai-config.js` `estimate-origin.js` `estimate-ask.js` `estimate-limits.js` | Fuel (`estimate-origin.js` says where each estimated number came from and, since v55, names a meal saved off the estimate sheet; `estimate-ask.js`, v55, is the pure client half of the estimator's "Which one?" question; `estimate-limits.js`, v63, is how long a description may be — refused over 600, never cut — how long the app waits for the Worker, and the line under an answer. All three import nothing and are copied into the native tree verbatim) |
| `workout.js` `routines.js` `blocks.js` `exercises.js` `picker.js` | Train (`blocks.js` is the pure lifting-block model, shared by the session screen and the routine editor; since v53 the recap leads with the finish line and asks "How did that feel?", which writes a session's `feel`; since v54 a hand-added exercise shows last time's numbers in grey, and a set can carry his effort rating, `rir`; since v55 a drop set's drops sit under it, each a `'D'` with `dp: 1`, and every edit to a list of sets goes through `analytics.js`'s four drop-set edits — see AGENTS.md; since v56 `+ Set` after a drop set copies its first set, the routine editor draws drop sets grouped with **+ Drop**, and a custom exercise can carry its movement, `exercises/custom[i].pattern` and `.angle`, set in `picker.js`; since v68 `history/{exId}` keeps warm-ups and the grey rows offer last time's ramp first — `nextGrey`, `warmupsText`, and nothing that counts reads the index, `tools-check/warmup-leaks.mjs`) |
| `weight.js` `weightmodel.js` `tdee.js` | Weight, trend, maintenance |
| `water.js` `steps.js` | Water, and the Steps data (no tab since v67 — its listener, the goal, and the two sheets; You's Habits card opens *Log today's steps*) |
| `friends.js` `friends-data.js` `friends-core.js` `friends-summary.js` | **Friends** (v67), the tab in Steps' slot: codes, the confirm handshake, per-friend switches, the boards, and routines sent to an inbox; since v68 a friend's face (`social/shared/{uid}/av`) and the in-app nudge (`social/nudge`, one a day, fixed words; phone push is `PUSH-NUDGE-CONTRACT.md`, not built). `friends-core.js` (the model, every `social/` path, the routine payload) and `friends-summary.js` (the summaries a friend reads and the boards) are **pure** and copied into the native tree verbatim; `friends-data.js` is the impure gatherer the port rewrites; `friends.js` is the screen. It lives in a new root tree, `social/`, whose rules are in `database.rules.json` — see AGENTS.md, and `tools-check/friends-rules.mjs`, which runs the real rules file through `tools-check/lib/rules-engine.mjs`. Nothing a friend reads is under `users/` |
| `stats.js` `analytics.js` `ui.js` | Shared stats, charts, UI helpers (`analytics.js` holds the drop-set rule since v55, and since v56 `repeatOf()`, the set `+ Set` copies) |
| `vibe.js` `vibes/` `vibes-sheet.js` | Vibes (V59) — how Rack looks, never what it says or does. `vibes/defs/` (the registry, `normVibe()`, `ROLES` and each vibe's definition) and `vibes/icons/` are **pure** and copied into the native tree verbatim; a vibe's stylesheet is `vibes/<id>.css`, its token block generated by `tools-check/vibes-css.mjs`. `vibe.js` is the web engine: the `<html data-vibe>` switch, `paint()` for the colours the pinned modules bake, `icon()`, the offline prefetch, and (V59 §12) composition — `blk()` tags a screen's blocks and `composeScreen()` moves the DOM nodes to the order `vibes/defs/index.js` `arrange()` reads from an experimental vibe's `compose` (the blocks of the ten composable screens are named in `vibes/defs/vocab.js` `compose`; v1's is `{}` and adds no attribute and no wrapper), plus `markCurrentSet()` and `plateArt()`, the two drawings Meet Day's looks ask of the session screen. `vibes-sheet.js` is Settings → Look → Vibes. The account's choice is `settings/vibe`, in `store.js` — see AGENTS.md |
| `rack.css` `auth.css` | Styles — the only two, both loaded by `index.html` |
| `sw.js` `manifest.json` `.nojekyll` | PWA and Pages plumbing |
| `database.rules.json` | A **copy** of the published Firebase rules |
| `database.rules.OPTIONAL-LOCK.json` | The same rules plus a real write-deny for `type: 'locked'`. An **alternative** to paste, not an addition |

## Two rules that break the app silently

**1. Bump the service worker on any change to a file the phone loads.**

`sw.js` opens with `const CACHE='rack-vNN'`. Read the current number and
increment it — in the same change as any edit to `*.js`, `*.css`, `index.html`
or `404.html`. The handler is network-first, so the cache name never gated what
a connected phone runs. A bump does two other things: it evicts the stale
offline copy, because the activate handler deletes every cache not named
`CACHE`, and it is the string each account reports as its build. Ship without
one and you leave a stale offline copy behind and a version number naming the
wrong build. State the new version in your summary. Changes confined to
documentation do not need a bump.

`usage.js` holds the same string in its own `VERSION` constant, because a
service worker is not a module the app can import. It reports which build an
account is running, and that only became true in v44: browsers always
revalidate `sw.js` itself but not the files it fetches, so before v44 a phone
could be running modules from two deploys at once and the number named only the
one `usage.js` came from. The two move together.

**2. A new top-level node under `users/{uid}` needs a rules change too.**

Writes to a node the published rules don't mention fail silently. No error on
screen, the data simply never arrives. Add it to `database.rules.json` *and*
raise it in the handoff, because editing that file does not publish it.

## What you can finish, and what you can't

| Change | Who finishes it |
|---|---|
| `*.js` `*.css` `index.html` `404.html` `sw.js` | You. Merging to `main` deploys it. |
| `database.rules.json` | You edit the file; **Micah pastes it into the Firebase console.** Nothing is live until he does. |
| The Worker | Not here. It lives in `~/dev/rack-worker` and is deployed from there. |
| Firebase or Cloudflare dashboards, API keys, KV namespaces | Micah only. You have no access and should not attempt it. |
| `README.md` `AGENTS.md` `BACKLOG.md` | You, whenever a change makes them wrong. Keep them true. |

Never commit a key. There is no key in this repo and no file that should ever
hold one — the Anthropic key lives only in Cloudflare's encrypted secret store,
reachable from `~/dev/rack-worker`, and the app on the phone has no key at all.

## House style

- Vanilla ES modules, no dependencies. There is no `package.json` in this repo
  at all. Do not add npm packages to the app — there is no bundler, so they
  cannot be loaded.
- Match the surrounding file. These files are long and hand-written; a reformat
  buries the actual change.
- Small diffs. Change what was asked and what it breaks, nothing else.
- Read narrowly. `food.js` is 116KB and `rack.css` 62KB — reading either whole
  costs a sixth of the context window. Grep for the symbol and read the range
  around it, and prefer a targeted edit over rewriting a file.
- The comments and docs here explain *why*, not *what*. Keep writing them that
  way.
- The house rules for touching data are at the bottom of `AGENTS.md`. They still
  apply: confirm numbers before logging, never PUT a container node, update
  `food/daySummaries` after touching a day, don't invent library items.

## Verifying

There is no test suite and no linter, but there are verifiers. Everything under
`tools-check/` drives the real modules against a stubbed Firebase — no copy of
any rule lives in them, which is the only way they stay true when a file
changes. All of them must exit 0 before you finish.

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Plain `node --check file.js` silently passes broken ES modules, so use the form
above. Then re-read your own diff.

**The Coach battery** (`tools-check/battery/`, since v69) is the other gate for
anything that touches `coach*.js`: a seeded simulator of 300 lifters whose
truth is known, driven through Coach's real pure modules and scored
ok / miss / wrong per decision. `bash tools-check/battery/run-all.sh` must
pass before a Coach ship finishes — wrong must be 0 for the gate it runs
(`all` since v70; `GATE=engine` is v69's engine-only gate), every regression
case must pass, and a bug fixed gets a `regress.mjs --add` case. `tools-check/battery/README.md` has
the commands, the codes and the generator's one rule. For anything touching Fuel, Train or Weight,
walk the change against the schema in `AGENTS.md` and confirm every node you
write to is one the published rules allow.

## Finish every session with a handoff

Micah reviews on a phone as often as on a laptop, and some steps are his alone.
End with exactly these five lines, and nothing in them that isn't true:

- **Shipped** — one line on what changed and why.
- **Service worker** — the new cache version, or "not needed, no app files changed".
- **Before it's live** — the numbered steps only he can do (publish rules, deploy
  the Worker), or "nothing, merging is enough".
- **To check it worked** — what to open and what he should see. Rack is a PWA:
  after merging he closes it from the app switcher, opens it, then closes and
  opens once more. The first launch fetches the new files, the second runs them.
- **Risk** — anything you were unsure about, or "none".

If merging is all that's needed, say so plainly. The point of the handoff is
that the human steps are never the ones he has to remember on his own.
