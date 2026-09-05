# Shipping Rack

Three things can be deployed, and they are separate. Most changes need only the
first.

| What you changed | What to deploy |
|---|---|
| Any `.js`, `.css`, `.html` in the repo root | **The app** — commit and push |
| `database.rules.json` | **The app** *and* **the rules** (paste into Firebase) |
| Anything under `worker/` | **The Worker** — `npx wrangler deploy` |

Merging to GitHub does nothing for the rules or the Worker. They live in Firebase
and Cloudflare, and each has to be pushed there by hand. This is the single most
common way a change appears to have shipped and hasn't.

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

`sw.js` is what makes phones fetch the new bundle instead of serving the cached
one. `usage.js` is what reports to the admin panel which build each person is
actually running — which is how you find out that somebody's phone never took an
update. If they disagree, the panel lies to you. Bump both, every ship.

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

---

## 3. Deploy the Worker

Only when something under `worker/` changed.

```powershell
cd C:\Users\micah\dev\lift-cal\worker
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
   them.
2. **Confirm the build.** Firebase → Realtime Database → Data →
   `usage/{your uid}/who/version`. It must read the version you just shipped. If
   it shows the old one, your phone is still on the old bundle.
3. **Confirm the rules.** In the same place, `usage/{your uid}/days/{today}` has
   an `appOpen` count. If the whole `usage` node is missing, step 2 above didn't
   happen.
4. **Confirm the Worker.** Gear, top right of You or Fuel → **AI estimator** → **Test**. It reports your
   remaining estimates and your monthly cap. Then photograph a meal and log it,
   which exercises the whole path end to end.

Still looks old after two relaunches: Safari → Settings → Clear History and
Website Data, or delete the home-screen icon and re-add it.

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

**There is also a group ceiling.** `GLOBAL_MONTHLY_USD_CAP` in
`worker/wrangler.toml`, currently **$10**, counted in KV under `spend:global`.
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
