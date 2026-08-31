# Shipping this update

Twelve steps, about twenty minutes. **Do them in this order** — the reasons are
under each one.

Two things to know before you start:

- **Publishing the rules first is safe.** The version of Rack running on your
  phone right now keeps working under the new rules. The only thing it does that
  they refuse is writing the public feed, and that write is already inside a
  `try/catch` that swallows failures. Nothing breaks while you're mid-upload.
- **You cannot lock yourself out.** Your uid is exempt from the approval check
  inside the rules themselves. Even if the whole `access` tree were empty or
  deleted, your app opens.

---

## 1. Publish the security rules

Firebase Console → your project → **Realtime Database** → **Rules** tab.
Select everything in the box, delete it, paste all of `database.rules.json`,
**Publish**.

This is the step that actually does the thing you asked for. From the second it
publishes:

- the tree stops being world-readable — try
  `curl "https://lift-cal-default-rtdb.firebaseio.com/users/aXSDfnZK8IMT9wRVhBbEgkDHpsj2.json"`
  before and after; you should get your data, then `Permission denied`
- no account can reach another's data, in either direction
- an account with no approval record can't write a byte

Do this first so everything after it lands on a database that is already locked.

## 2. Turn on sign-up

Authentication → **Settings** → *User actions* → make sure **"Enable create
(sign-up)"** is ticked. Also check Authentication → **Sign-in method** →
Email/Password is Enabled.

Your roommate cannot make an account while this is off. This is safe now and was
not before: creating an account no longer grants access to anything. Someone who
signs up without a code gets a waiting screen holding no data, and costs you one
row in the user list.

## 3. Delete the agent account

Authentication → **Users** → find `agent@lift-cal.app`
(`HWwNbi0JPRbtTw0ODHxyq989UJj2`) → **Delete account**.

The rules already stop it writing anywhere. Deleting it means the password
that's been sitting in a documentation file stops mattering at all.

## 4. Delete the feed node

Realtime Database → **Data** → find `feed` at the root → **×** → delete.

It was a world-readable summary of your day. Nothing writes it any more, and
leaving it there leaves a stale copy of your macros on the internet.

## 5. Upload the app files

GitHub → `LyttleBeast/lift-cal` → **Add file → Upload files** → drop all of
these in at once → Commit.

**New files** — the app will not run without all four:

| | |
|---|---|
| `access.js` | Invite codes, requests, approval, the People sheet |
| `onboarding.js` | First-run setup and the tour |
| `auth.css` | Styles for all of the above |
| `database.rules.json` | A copy of what you pasted in step 1, so it's in version control |

**Changed files:**

| | |
|---|---|
| `index.html` | Sign-in / create-account form, gate and onboarding containers |
| `app.js` | Sign-up, the access gate, onboarding in the boot order |
| `store.js` | Sign-up + password reset, shared-node access, feed removed |
| `firebase-config.js` | Feed token removed |
| `food.js` | Feed writes removed, split photo/describe quota display |
| `weight.js` | Feed removed; People & access, replay tour, device wipe in settings |
| `workout.js` | Feed writes removed |
| `sw.js` | Cache bumped to `rack-v12` so phones actually pick this up |
| `AGENTS.md` `CLAUDE.md` `README.md` | Rewritten for the locked-down multi-account model |
| `wrangler.toml` | New per-person AI limits |

**Delete from the repo while you're in there** (all three are junk):

- `README (1).md` — an older copy of the README uploaded by accident
- `download` — actually your `.gitignore`, uploaded under the wrong name.
  Re-upload its contents as `.gitignore` if you want it working
- `rack.mjs` — the CLI for the agent account. It cannot work any more. Delete it,
  or keep it as a record; it's inert either way

GitHub Pages takes a minute or two.

## 6. Redeploy the Worker

`index.js` in this bundle is the **Worker**, not the app — that's the layout
your repo already uses, so uploading it to the repo root in step 5 is correct.
It also has to go into your actual wrangler project, where `wrangler.toml` says
`main = "src/index.js"` — so `src/index.js` there, not the root. Copy
`wrangler.toml` across too, then:

```bash
npx wrangler deploy
```

What changed: photo and describe now have **separate** daily counters, 3 each,
per person. And the uid allowlist now reads `aiAllow/{uid}` out of the database,
so approving somebody in the app gives them the estimator without a redeploy —
`ALLOWED_UIDS` stays as an override and as the fallback if Firebase is
unreachable, which is why your own uid should stay in it.

## 7. Force your phone to take the update

Rack is a PWA with a service worker. Close it fully (swipe it out of the app
switcher), open it, then close and open once more. The first launch fetches the
new files, the second runs them.

If it still looks old: Safari → Settings → Clear History and Website Data, or
delete the home-screen icon and re-add it.

---

# Testing it — twenty minutes, worth every one

## 8. Check yourself first

Open Rack. You should land straight in, exactly as before — no onboarding, no
waiting screen, all your data there. If you get the setup questions, something
is wrong; stop and tell me.

Then Weight tab → Settings. You should see **People & access**, **Replay the
walkthrough**, and **Sign out and erase this device's copy**. The old *Copy
Claude link* button should be gone.

Fuel → ⚙ → AI estimator → **Test**. It should say something like
*"Today: 3 of 3 photos, 3 of 3 describes left"*. Take a photo of something and
log it, to prove the estimator still works end to end.

## 9. Prove the lockdown

```bash
curl "https://lift-cal-default-rtdb.firebaseio.com/users/aXSDfnZK8IMT9wRVhBbEgkDHpsj2/food/targets.json"
curl "https://lift-cal-default-rtdb.firebaseio.com/feed/wH7lqHV7y15z4EMq9T2UZi.json"
```

Both should answer `{"error" : "Permission denied"}`. If either returns data,
the rules didn't publish — go back to step 1.

## 10. Make your roommate a code

Weight → Settings → **People & access** → **New invite code**. It copies itself
to the clipboard. Text it to him.

## 11. Watch him sign up

Do this next to him, on his phone, at `https://lyttlebeast.github.io/lift-cal/`:

1. **Create an account** → name, email, password, paste the code → *Create
   account*
2. He should go straight into onboarding — no waiting screen
3. Walk through it: basics, weight, goal, activity. Check the calorie and
   protein numbers look sane for him
4. Let the four-card tour run
5. Have him log a food and a weigh-in

Then, on **your** phone: your data should be completely unchanged. Not one
entry of his, no target moved, nothing in your saved foods. Then check the
reverse on his — he should see none of yours, and no *People & access* button
at all.

That's the test that matters. Everything else is convenience.

## 12. Try the other door

Worth doing once so you know it works before you need it. On a laptop, in a
private window, create an account with **no code**. You should get the waiting
screen. Send the request. On your phone: People & access → the request is there
→ **Approve**. Watch the laptop — it should let itself in within a second, with
no reload. Then remove that test account with **Remove**, and delete it from
Firebase Authentication → Users.

---

# Living with it

**Adding a third person** is the same two doors, no code changes. If the AI
starts costing more than you like, raise `MONTHLY_USD_CAP` deliberately rather
than letting it bite — it's set to $1 against a $5 balance, and three people at
3 photos a day would push against that.

**Taking access away** is People & access → **Remove**. It deletes one node.
Their data is untouched, so adding them back restores everything. If you only
want to stop them spending your Anthropic credit but keep them in the app, use
**AI…** instead.

**If you ever break the rules file** and lock everyone out, your uid is exempt
from the approval check in the rules text, so your own app keeps working while
you fix it. Re-paste `database.rules.json` from the repo.

**One known limitation, stated plainly.** Two people racing to claim the *same*
invite code in the same second could both succeed — Realtime Database rules
can't do a true compare-and-swap across two paths. Codes are single-use in every
realistic case; if it ever mattered, the fix is to hand out one code per person,
which is what the People screen does anyway.
