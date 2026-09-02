# Rack — working on this repo

Rack is a phone-first training, nutrition and bodyweight log. It is a plain
static site served by GitHub Pages, backed by Firebase Realtime Database, with
one Cloudflare Worker standing in front of the Anthropic API for the food
estimator. There is no framework, no bundler and no build step: the browser
loads `app.js` as an ES module and that module graph is the whole app.

Read [AGENTS.md](AGENTS.md) before touching anything that reads or writes the
database. It is the schema, node by node, and the access model.

---

## Read this before you edit anything

**The Worker is not the app.** `worker/` is a separate Cloudflare Worker
project. `worker/src/index.js` is what holds the Anthropic key logic; it runs
on Cloudflare, not in the browser, and nothing in the app imports it. The app's
entry point is `app.js`, which is what `index.html` loads. Merging to `main`
does not deploy the Worker — that is `npx wrangler deploy`, run from inside
`worker/`.

*History, so older docs make sense:* until September 2026 the Worker's files sat
loose at the repo root as `index.js`, `wrangler.toml` and `package.json`, and
were copied by hand into a separate wrangler project on Micah's machine. That is
why `DEPLOY.md` talks about copying `index.js` into `src/index.js` somewhere
else. `worker/` is now the only copy.

**`DEPLOY.md` is history, not process.** It documents one specific past
deployment — the multi-account lockdown of August 2026 — down to files that have
since been deleted. Do not follow it as a checklist for new work. The current
process is the handoff at the bottom of this file.

## Layout

| | |
|---|---|
| `index.html` `app.js` | Entry point and boot order |
| `store.js` | Firebase read/write, auth, sign-up, password reset |
| `access.js` `onboarding.js` | Invite codes, approval, the waiting screen, first run |
| `you.js` `settings.js` `admin.js` `usage.js` | The You tab, the settings hub, the owner panel, usage counters |
| `food.js` `recall.js` `importer.js` `ai.js` `ai-config.js` | Fuel |
| `workout.js` `routines.js` `exercises.js` `picker.js` | Train |
| `weight.js` `weightmodel.js` `tdee.js` | Weight, trend, maintenance |
| `water.js` `steps.js` | Water and Steps |
| `stats.js` `analytics.js` `ui.js` | Shared stats, charts, UI helpers |
| `rack.css` `auth.css` | Styles (`app.css` is dead — the abandoned "IRONLOG" design) |
| `sw.js` `manifest.json` `.nojekyll` | PWA and Pages plumbing |
| `worker/` | The Cloudflare Worker — its own project, see above |
| `database.rules.json` | A **copy** of the published Firebase rules |

## Two rules that break the app silently

**1. Bump the service worker on any change to a file the phone loads.**

`sw.js` opens with `const CACHE='rack-v13'`. Increment it — `rack-v14`, then
`rack-v15` — in the same change as any edit to `*.js`, `*.css`, `index.html`
or `404.html`. The service worker caches under that name, so a change shipped
without a bump reaches nobody's phone and looks, from the outside, exactly like
a change that didn't work. State the new version in your summary. Changes
confined to `worker/` or to documentation do not need a bump.

`usage.js` holds the same string in its own `VERSION` constant, because it
reports which build an account is running and a service worker is not a module
the app can import. The two move together.

**2. A new top-level node under `users/{uid}` needs a rules change too.**

Writes to a node the published rules don't mention fail silently. No error on
screen, the data simply never arrives. Add it to `database.rules.json` *and*
raise it in the handoff, because editing that file does not publish it.

## What you can finish, and what you can't

| Change | Who finishes it |
|---|---|
| `*.js` `*.css` `index.html` `404.html` `sw.js` | You. Merging to `main` deploys it. |
| `database.rules.json` | You edit the file; **Micah pastes it into the Firebase console.** Nothing is live until he does. |
| `worker/**` | You edit; **Micah runs `npx wrangler deploy` from inside `worker/`.** Merging alone changes nothing. |
| Firebase or Cloudflare dashboards, API keys, KV namespaces | Micah only. You have no access and should not attempt it. |
| `README.md` `AGENTS.md` `ROADMAP.md` | You, whenever a change makes them wrong. Keep them true. |

Never commit a key. `worker/.dev.vars.example` is the template; a real
`.dev.vars` must never appear in a diff. The Anthropic key lives only in
Cloudflare's encrypted secret store, and the app on the phone has no key at all.

## House style

- Vanilla ES modules, no dependencies. The only `package.json` is
  `worker/package.json`, and it exists for `wrangler` alone. Do not add npm
  packages to the app — there is no bundler, so they cannot be loaded.
- Match the surrounding file. These files are long and hand-written; a reformat
  buries the actual change.
- Small diffs. Change what was asked and what it breaks, nothing else.
- The comments and docs here explain *why*, not *what*. Keep writing them that
  way.
- The house rules for touching data are at the bottom of `AGENTS.md`. They still
  apply: confirm numbers before logging, never PUT a container node, update
  `food/daySummaries` after touching a day, don't invent library items.

## Verifying

There is no test suite and no linter. Before you finish:

```bash
for f in *.js worker/src/*.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
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
