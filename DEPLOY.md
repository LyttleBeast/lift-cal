# Shipping Rack

Two things can be deployed from this repo, and they are separate. Most changes
need only the first.

| What you changed | What to deploy |
|---|---|
| Any `.js`, `.css`, `.html` in the repo root | **The app** — commit and push |
| `database.rules.json` | **The app** *and* **the rules** (paste into Firebase) |

Merging to GitHub does nothing for the rules. They live in Firebase and have to
be pasted there by hand. This is the single most common way a change appears to
have shipped and hasn't.

**The Worker is not deployed from here.** It is its own private repo,
`~/dev/rack-worker`, and nothing in this tree can ship it. Section 3 below is
what to do when it needs changing.

---

## 1. Ship the app

You work in a local clone at `C:\Users\micah\dev\lift-cal` and push. GitHub Pages
serves `main` and takes a minute or two.

```powershell
cd C:\Users\micah\dev\lift-cal
git add -A
git status --short          # read this before committing
git commit -m "what changed"
git push
```

**Before you commit, bump the version.** Two files carry it and they must match:

- `sw.js` — `const CACHE='rack-vN'`
- `usage.js` — `const VERSION = 'rack-vN'`

`sw.js` is what evicts the offline copy, and its cache name is the string each
account reports as its build. `usage.js` is what reports it to the admin panel —
which is how you find out that somebody's phone never took an update. If they
disagree, the panel lies to you. Bump both, every ship.

That report only means what it says from v44 onward. Before v44 the service
worker fetched app files through the browser's own HTTP cache, which holds Pages
assets about ten minutes, so for the first minutes after every ship it re-cached
the build before this one — while `sw.js` itself, the one script browsers always
revalidate, updated at once and reported the new version. rack-v43 was seen
reporting itself on an account still running rack-v42's code. v44 revalidates
its own files, so the version and the modules move together now.

### Two things that bite

**Line endings.** The repo stores LF; Windows writes CRLF. If `git status` shows
every file changed and a diff of thousands of lines, that is all it is. `git
config core.autocrlf input` is already set in this clone and fixes it on the way
in. Check the real size with `git diff --stat --ignore-all-space`.

**A stale lock.** If git refuses with *"another git process seems to be
running"*, delete `.git\index.lock` and retry. Nothing is wrong.

---

## 2. Publish the rules

Only when `database.rules.json` changed. Committing it to the repo is version
control, not deployment — Firebase never reads your repo.

```powershell
Get-Content C:\Users\micah\dev\lift-cal\database.rules.json -Raw | Set-Clipboard
```

Firebase Console → **Realtime Database** → **Rules** tab → click in the editor →
Ctrl+A, Delete → Ctrl+V → **Publish**.

It is a full replace, not an append. Publishing while the app is open on your
phone is safe.

**The failure is silent.** A write the rules don't allow is refused by the
server, and the app is built not to blink at it. If you add a field to a rules
file and forget this step, the feature simply does nothing and says nothing. That
is why the verification below checks the database and not the screen.

You cannot lock yourself out: your uid is exempt from the approval check inside
the rules text itself. If you ever break the file, re-paste it from the repo.

### There are two rules files, and only one is ever live

`database.rules.json` is the one to paste. `database.rules.OPTIONAL-LOCK.json`
is the **same file plus one thing**: it refuses `users/{uid}` *writes* while
that account's stored `type` is `'locked'`, which turns the app's access-paused
screen from a courtesy into a wall the database enforces. They are alternatives,
not halves — paste one or the other, never both, and whichever you paste
replaces everything.

Paste `database.rules.json` unless you have decided you want that. It is purely
additive: it names the four new account-type fields so the owner can write them,
and it locks nobody. The lock variant is fail-safe too — an absent type is
allowed, and your own uid short-circuits before the check — but it is the one
change here that can stop somebody writing their own data, so it is a decision
and not a default. `tools-check/accounts.mjs` proves the two files differ in
nothing else.

---

## 3. Deploy the Worker

Not from this repo. The Worker is `~/dev/rack-worker`, its own private repo, and
it is edited and deployed there. This repo carried a `worker/` copy until v40;
it had gone stale — it predated the food estimator — and a `wrangler deploy` run
from inside it would have shipped the old Worker over the live one. It is gone
for that reason and should not come back.

```bash
cd ~/dev/rack-worker
npx wrangler whoami          # expired login fails the next step confusingly
npx wrangler deploy
```

Read the bindings table it prints — that is the real proof your `wrangler.toml`
edit took. `MONTHLY_USD_CAP` and `GLOBAL_MONTHLY_USD_CAP` should show the values
you expect.

Your `ANTHROPIC_API_KEY` lives encrypted in Cloudflare and survives deploys. The
KV namespace id is in `wrangler.toml`, so counters are never reset by a deploy.

---

## 4. Verify — in this order

Each step proves a different thing, so a failure tells you where to look.

1. **Take the update.** Swipe Rack out of the app switcher, open it, swipe it out
   again, open it again. The first launch fetches the new files, the second runs
   them. Before v44 both launches could be handed the previous build, which is
   what the second half of step 2 now catches.
2. **Confirm the build.** Firebase → Realtime Database → Data →
   `usage/{your uid}/who/version`. It must read the version you just shipped. If
   it shows the old one, your phone is still on the old bundle. That number comes
   from `usage.js`, so it proves one module and not the graph — prove the rest
   too: from any browser, fetch a `.js` or `.css` file you changed twice, once
   plain and once with `?x=1` on the end, and confirm the two come back
   identical. Before v44 they routinely did not. This cannot see a stale
   `index.html`, which is the one file v44 deliberately left on the old path.
3. **Confirm the rules.** In the same place, `usage/{your uid}/days/{today}` has
   an `appOpen` count. If the whole `usage` node is missing, step 2 above didn't
   happen.
4. **Confirm the Worker.** Gear, top right of You or Fuel → **AI estimator** → **Test**. It reports your
   remaining estimates and your monthly cap. Then photograph a meal and log it,
   which exercises the whole path end to end.

Still looks old after two relaunches: before v44 that was ordinary in the first
ten minutes after a ship, and clearing storage never fixed it — the stale bytes
sat in the browser's HTTP cache, not the service worker's, and only a reload that
bypassed that cache helped. v44 removed that cause for every file the app loads,
with one exception it kept on purpose: `index.html` itself, which can still be
up to ten minutes behind. So if the ship changed `index.html`, wait ten minutes
and relaunch before doing anything else. Otherwise run step 2's file check —
a recurrence is now a real symptom rather than the ordinary case. Then Safari →
Settings → Clear History and Website Data, or delete the home-screen icon and
re-add it.

---

# Adding a person

Everything is in the app. No code changes, no redeploys.

**1. Make them a code.** You tab → **Admin** → People & access → **New invite
code**. It copies itself to the clipboard. Text it to them.

**2. They sign up** at `https://lyttlebeast.github.io/lift-cal/` — name, email,
password, paste the code. A valid code takes them straight into onboarding. If
they sign up without one they get a waiting screen holding no data, and their
request appears under Admin → People & access → Requests for you to **Approve**.
They are let in within a second, no reload.

Walk them through onboarding next to them the first time. Check the calorie and
protein numbers it lands on look sane for them.

**3. Set their allowance and their cap, together.** Admin → their name → **AI
allowance**. Three boxes:

| | |
|---|---|
| Photo estimates a day | max 12, default 3 |
| Describe estimates a day | max 30, default 3 |
| Monthly spending cap | max $10, default $2 |

Leave a box empty to use the default. Zero is a real value and means none of that
kind at all.

Set the counts and the cap together or they hit whichever wall comes first, and
the refusal will name the wrong one. For scale: a photo estimate costs about
**$0.006** and a typed description about **$0.002** — but either one that names
a brand or a chain costs **$0.03–$0.06**, because it goes and reads that brand's
published nutrition page instead of answering from memory. Ordinary use at 3
photos a day is roughly **$0.55 a month**; somebody who describes three
restaurant meals a day is closer to **$4**, which is over the default $2 cap.
Somebody at the 12-photo ceiling runs about **$2.20** — so 12 photos a day on
the default $2 cap runs out of money in ten days.

**4. Check the isolation once, with the first person.** On your phone: none of
their entries anywhere, no target moved, nothing in your saved foods. On theirs:
none of yours, and no Admin row at all.

---

# Living with it

**Every cap is per account.** The counters live in Cloudflare KV keyed `q:{uid}`.
Raising one person's cap gives nobody else a cent.

**There is also a group ceiling.** `GLOBAL_MONTHLY_USD_CAP` in the Worker's
`wrangler.toml` (`~/dev/rack-worker`), currently **$10**, counted in KV under
`spend:global`.
Cross it and the estimator refuses *everybody* with a message saying so, until
the 1st. It exists because per-account caps bound each person and say nothing
about their sum — seven people at $2 each is $14 in a bad month. Changing it is
one line and a `wrangler deploy`.

Seven people at ordinary use is about **$4 a month**. Watch the Anthropic balance
as you add people; the group ceiling is the last wall before the balance itself
is the wall, and that one fails as an API error rather than a clean message.

**Taking access away** is Admin → their name → **Remove**. It deletes one node.
Their data is untouched, so adding them back restores everything. To leave them
in the app but stop them spending your credit, use **Turn their estimator off**
instead — only you can set that, and it beats their own switch.

**The usage numbers are approximate.** Each phone counts its own and writes them
up. They are a picture of who uses what, not an audit. The panel says so on
screen.

**One known limitation.** Two people racing to claim the same invite code in the
same second could both succeed — Realtime Database rules can't compare-and-swap
across two paths. Hand out one code per person, which is what the People screen
does anyway.
