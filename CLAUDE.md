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

**`index.js` is the Cloudflare Worker, not the app.** Nothing in the app
imports it. It sits at the repo root for historical reasons and it is the
easiest mistake to make here. The app's entry point is `app.js`, which is what
`index.html` loads.

`wrangler.toml` says `main = "src/index.js"` and there is no `src/` in this
repo — the Worker is deployed from a separate local wrangler project. So
`npx wrangler deploy` run from a clone of this repo will fail. Editing
`index.js` here updates the file of record; it does not change what is running.

**`DEPLOY.md` is history, not process.** It documents one specific past
deployment — the multi-account lockdown of August 2026 — down to files that
have since been deleted. Do not follow it as a checklist for new work. The
current process is the handoff at the bottom of this file.

## Layout

| | |
|---|---|
| `index.html` `app.js` | Entry point and boot order |
| `store.js` | Firebase read/write, auth, sign-up, password reset |
| `access.js` `onboarding.js` | Invite codes, approval, People sheet, first run |
| `food.js` `recall.js` `importer.js` `ai.js` `ai-config.js` | Fuel |
| `workout.js` `routines.js` `exercises.js` `picker.js` | Train |
| `weight.js` `weightmodel.js` `tdee.js` | Weight, trend, maintenance |
| `water.js` `steps.js` | Water and Steps |
| `stats.js` `analytics.js` `ui.js` | Shared stats, charts, UI helpers |
| `rack.css` `app.css` `auth.css` | Styles |
| `sw.js` `manifest.json` `.nojekyll` | PWA and Pages plumbing |
| `index.js` `wrangler.toml` | The Worker — see above |
| `database.rules.json` | A **copy** of the published Firebase rules |

## Two rules that break the app silently

**1. Bump the service worker on any change to a file the phone loads.**

`sw.js` opens with `const CACHE='rack-v12'`. Increment it — `rack-v13`, then
`rack-v14` — in the same change as any edit to `*.js`, `*.css`, `index.html`
or `404.html`. The service worker caches under that name, so a change shipped
without a bump reaches nobody's phone and looks, from the outside, exactly like
a change that didn't work. State the new version in your summary.

**2. A new top-level node under `users/{uid}` needs a rules change too.**

Writes to a node the published rules don't mention fail silently. No error on
screen, the data simply never arrives. Add it to `database.rules.json` *and*
raise it in the handoff, because editing that file does not publish it.

## What you can finish, and what you can't

| Change | Who finishes it |
|---|---|
| `*.js` `*.css` `index.html` `404.html` `sw.js` | You. Merging to `main` deploys it. |
| `database.rules.json` | You edit the file; **Micah pastes it into the Firebase console.** Nothing is live until he does. |
| `index.js`, `wrangler.toml` | You edit; **Micah runs `npx wrangler deploy`** from his local wrangler project. |
| Firebase or Cloudflare dashboards, API keys, KV namespaces | Micah only. You have no access and should not attempt it. |
| `README.md` `AGENTS.md` `ROADMAP.md` | You, whenever a change makes them wrong. Keep them true. |

Never commit a key. `dev.vars.example` is the template; a real `.dev.vars` must
never appear in a diff. The Anthropic key lives only in Cloudflare's encrypted
secret store, and the app on the phone has no key at all.

## House style

- Vanilla ES modules, no dependencies. `package.json` exists for `wrangler` and
  nothing else. Do not add npm packages to the app — there is no bundler, so
  they cannot be loaded.
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
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
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
