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
| `you.js` `insights.js` `settings.js` `admin.js` `usage.js` | The You tab, what Rack makes of the data (pure, no reads), the settings hub, the owner panel, usage counters |
| `accounts.js` | Account types — the pure tier table and the single entitlement choke point. Fails open; see AGENTS.md |
| `coach.js` `coach-build.js` `coach-live.js` `coach-tags.js` `coach-data.js` `coach-ui.js` | Coach — the deterministic engine that reads the log and says one true thing about it, (`coach-build.js`) the workout builder that turns it into a session he can start, and (`coach-live.js`) the in-session read that says what comes next during one. `coach.js`, `coach-build.js`, `coach-live.js` and `coach-tags.js` are **pure** and are copied into the native tree verbatim; `coach-data.js` is the impure gatherer the port rewrites; `coach-ui.js` is the card, the sheet, and the live session's chip and nudge. Settings live at `settings/coach`; the greeting counter is device storage, deliberately — see AGENTS.md |
| `food.js` `recall.js` `importer.js` `ai.js` `ai-config.js` | Fuel |
| `workout.js` `routines.js` `blocks.js` `exercises.js` `picker.js` | Train (`blocks.js` is the pure lifting-block model, shared by the session screen and the routine editor) |
| `weight.js` `weightmodel.js` `tdee.js` | Weight, trend, maintenance |
| `water.js` `steps.js` | Water and Steps |
| `stats.js` `analytics.js` `ui.js` | Shared stats, charts, UI helpers |
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
above. Then re-read your own diff. For anything touching Fuel, Train or Weight,
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
