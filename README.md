# Rack

Personal training, nutrition and body weight log. Phone-first, installs to the iPhone home screen, works offline.

Live at **https://lyttlebeast.github.io/lift-cal/**

Multi-account: every account holds its own training log, food, weight, water and
steps, and no account can see or touch another's. New people get in with an
invite code, or by asking the owner and being approved. See *Access* below.

- **You** — the tab the app opens on. A read-only summary of the other four and of how their numbers pull on each other: this week against the last, intake against targets, the scale against maintenance, printed as arithmetic rather than asserted. Nothing on it writes anything. The gear in its header is where every setting in the app now lives.
- **Train** — full workout tracker: saved routines, plate-colored calendar, session timer, W/F/D set tags, 231-exercise library, last-time numbers, rest timer, per-side plate math, e1RM, swipe-to-delete sets, editable history, a post-workout recap with personal records, and a full statistics page.
- **Fuel** — nutrition: **photograph a plate and Claude reads the macros off it**, or just describe what you ate. Plus macro targets, saved-food library, barcode scanning via Open Food Facts, manual entry, saved meals, one-tap portion multiplying, micronutrient floors, paste import.
- **Weight** — body-weight log: 7-day moving average chart, weekly rate, a learned time-of-day curve, and a maintenance (TDEE) estimate built on normalised weigh-ins with a stated confidence interval.
- **Water** — daily intake against a goal, in the Fuel tab: a filling bottle, one-tap common sizes, any unit you like, stored in millilitres.
- **Steps** — its own tab: goal ring, 7-day / 30-day / 12-month trend, streaks, a 13-week heat map, day-of-week breakdown, and either manual entry or an automation pushing them from your phone.

---

## Backend

Firebase project **Lift-Cal** (`lift-cal`), Realtime Database in `us-central1`, Spark (free) plan.
Analytics, Gemini, and the Google Developer Program are all disabled.

Sign-in is Email/Password, and **sign-up is on** — it has to be, for a second
person to get an account at all. Creating an account is not what grants access;
see *Adding people* below.

### Published security rules

The full file is [`database.rules.json`](database.rules.json) — paste it into
Firebase Console → Realtime Database → Rules → **Publish**. The shape:

```
users/$uid          read:  own uid, and only while approved
                    write: same, and only under the eleven known sections
access/approved/$uid the allowlist. Owner writes it; a valid invite code lets
                     an account write its own, once, atomically with the claim
access/invites/$code owner-only, except the used-stamp the claimer sets
access/requests/$uid an account files its own; only the owner reads the queue
aiAllow/$uid         two booleans and two optional daily limits. Publicly
                     readable BY KEY so the Worker can check it without
                     credentials; `blocked`, `photoPerDay` and `textPerDay`
                     are owner-only
usage/$uid           counters, and nothing that isn't a counter. An account
                     writes its own day keys; the owner reads every account's
                     and can write nobody's but his own
everything else      denied at the root
```

Four properties worth stating plainly, because they are the point of the
release:

- **No public read anywhere.** An unauthenticated `curl` at any user path gets
  `Permission denied`. That includes the owner's subtree, which used to be open.
- **No account can reach another's data**, in either direction. There is no
  admin read of anybody's log: the owner cannot see the roommate's food,
  weigh-ins, workouts or steps through the app or over REST. What he can see is
  who has access, and — under `usage` — how often each account opened a screen
  or used a feature: whole numbers per day, a platform token, whether the app is
  installed to a home screen, an app version, and first- and last-seen stamps.
  Nothing logged is in that tree and neither is a name or an email; the names
  beside the counters in the admin panel come from `access/approved`, which is
  the allowlist he writes himself.
- **An unapproved account holds nothing.** It cannot write a byte, so a stranger
  who signs up costs a row in Authentication and nothing else.
- **The owner cannot lock himself out.** His uid is exempt from the approval
  check in the rules themselves, so wiping the whole `access` tree still leaves
  his app working.

`write` is granted per section (`food`, `weight`, `workouts`, `history`,
`water`, `steps`, `routines`, `exercises`, `settings`, `profile`, `onboarding`)
rather than at `users/$uid`. RTDB write rules only ever grant and always cascade
down, so granting at the parent would make the subtree free storage for anyone
with an account; granting per section means an unknown key has no grant at all.
`usage/$uid` is written the same way and for the same reason: the grant sits on
the day key, `usage/$uid/days/$day`, never on the container above it, and the
`YYYY-MM-DD` shape is checked in the write rule itself, where `$day` is in
scope — so a junk key has no grant to begin with.

### The agent account

Gone. `agent@lift-cal.app` (`HWwNbi0JPRbtTw0ODHxyq989UJj2`) has no write access
under the new rules — delete it in Authentication → Users. Same for the `feed/`
node in the database. See *Access* below for what replaced them, and why.

## Files

| File | What it is |
|---|---|
| `index.html` | The only markup: auth gate, five empty views, bottom dock |
| `app.js` | Shell — sign-in/sign-up, access gate, boot order, tab router, service worker |
| `you.js` | You tab — the screen the app opens on. Read-only; every number is re-derived |
| `settings.js` | The settings hub behind the You gear, and the profile editor |
| `admin.js` | Owner-only panel — feature usage, AI allowances, People & access |
| `usage.js` | Counters-only telemetry: the `usage/{uid}` ledger, and platform detection |
| `store.js` | Data layer — Firebase + per-account localStorage mirror + offline queue |
| `firebase-config.js` | Public project keys and the owner UID |
| `access.js` | Who is allowed in — invite codes, requests, approval; `admin.js` draws the People UI from it |
| `onboarding.js` | First run — setup questions, starting targets, add-to-home-screen, the five-tab tour |
| `database.rules.json` | **The security rules.** Paste into the Firebase console |
| `auth.css` | Styles for the sign-in box, waiting screen, onboarding and People |
| `ui.js` | Shared primitives — sheets, toasts, confirms, swipe, date/number helpers |
| `analytics.js` | Training aggregates, personal-record detection, SVG chart builders |
| `stats.js` | The statistics page |
| `workout.js` | Train tab — calendar, live session, editing, post-workout recap |
| `picker.js` | Exercise library (static + custom) and the two picking sheets |
| `routines.js` | Pre-planned routines — list, editor, start, save-a-session-as |
| `food.js` | Fuel tab |
| `ai.js` | AI estimator client — photo shrinking, the two estimate calls, error shapes |
| `ai-config.js` | The Worker URL. A public address, not a credential |
| `worker/` | Cloudflare Worker that holds the Anthropic key. **Read `worker/README.md` to set it up** |
| `water.js` | Water card, log sheet, goal and sizes |
| `weight.js` | Weight tab — log, trend chart, time-of-day curve, maintenance |
| `steps.js` | Steps tab — ring, trend, streaks, heat map, and the setup walkthrough |
| `tdee.js` | Public face of the weight math — trend, maintenance, calorie zones |
| `weightmodel.js` | Weigh-in normalisation: gut-load model, coefficient fit, robust slope |
| `exercises.js` | Static 231-exercise library |
| `importer.js` | One-time Liftoff history migration |
| `rack.css` | The stylesheet |
| `404.html` | Branded not-found page |
| `sw.js` | Service worker, network-first, cache `rack-v13` |
| `AGENTS.md` | The database schema, node by node |
| `rack.mjs` | **Dead file** — CLI for the removed agent account, kept as a record |
| `app.css` | **Dead file** — the abandoned "IRONLOG" design, not referenced anywhere |

Import direction is strictly one-way, no cycles:

```
app.js → you.js       → settings.js → food.js  water.js  steps.js  workout.js
                                    → picker.js  importer.js  ai.js
                                    → onboarding.js
                      → admin.js    → access.js ──────────────→ store.js
                                    → analytics.js
                                    → ai.js
                      → analytics.js ───────────────────────→ ui.js
                      → tdee.js → weightmodel.js ───────────→ ui.js
                      → water.js
                      → onboarding.js
      → workout.js    → stats.js ──→ analytics.js ─────────→ ui.js
                      → picker.js ──────────────────────────→ ui.js
                      → routines.js → picker.js
      → food.js       → water.js ───────────────────────────→ ui.js
                      → recall.js ──────────────────────────→ store.js
                      → ai.js → ai-config.js
                              → store.js (idToken only)
                      → tdee.js → weightmodel.js ───────────→ ui.js
      → steps.js      → analytics.js
      → weight.js     → tdee.js
                      → analytics.js
      → access.js     → store.js
      → onboarding.js → tdee.js
      → usage.js ─────────────────────────────────────────→ store.js
```

`picker.js` exists so `routines.js` and `workout.js` can share the exercise
picker without importing each other. `workout.js` hands its `startWorkout` to
`routines.js` as a callback; routines never imports back.

`usage.js` is imported by eleven modules — the eight that count something, plus
`you.js` and `onboarding.js` for its home-screen detection and `admin.js` for
its event list — and it imports nothing but `store.js`. That is what makes it
safe to import from anywhere: a module at the bottom of the graph can never
close a loop, and `bump()` is one line at a call site that already has real work
to do.

**`you.js` imports none of the four tab modules.** Every number on the opening
screen is re-derived from `store.read()` — which answers out of the per-account
localStorage mirror — and from the shared math in `tdee.js` and `analytics.js`.
The point is not a smaller graph: `settings.js` pulls Fuel, Train, Steps, Water
and the importer straight back in, because the settings hub opens the sheets
those files already own. The point is that nothing on the screen the app opens
on depends on another tab's module state, or on the order the four of them
initialised in. `initYou()` runs after all four and asks none of them anything.
Where a number has to agree with a tab — maintenance, which Fuel also prints —
both read the same precedence out of the same node rather than each deriving
their own.

---

## Access — who can read this database

Nothing outside the app can, and that is the whole change in this release.

The database used to be world-readable at one URL, with a second account
holding write credentials so Claude could log a meal from a phone conversation.
That worked because there was one person in it. It stops working the moment
there are two: a world-readable tree is world-readable for everybody in it, and
"the rules let the agent write only to Micah's subtree" is a sentence that has
to be re-proved every time a node is added.

So it is gone, replaced by one flat statement enforced in
[`database.rules.json`](database.rules.json):

> An account can read and write `users/{its own uid}`, and only while
> `access/approved/{its own uid}` exists.

Every byte of anybody's log lives under there. Outside it an account only ever
touches records *about* itself, never content: it files its own
`access/requests/{uid}`, claims an approval with a valid invite code, flips its
own `aiAllow/{uid}/on`, and writes its own counters under `usage/{uid}`.

Practically:

- `curl` against any user path returns `{"error":"Permission denied"}`. There is
  no token to add — no account has read access to another's subtree, including
  the owner's.
- The `feed/` node is gone. Delete it in the console; nothing writes it.
- The `agent@lift-cal.app` account can no longer write anywhere. Delete it in
  Authentication → Users.
- `rack.mjs` no longer works and is kept only as a record of the old shape.
- Food still goes in from a conversation the manual way, by paste — see below.

The in-app estimator is **not** affected: it never touched the database from the
outside. The phone proves who it is with its Firebase ID token, the Cloudflare
Worker holds the Anthropic key, and barcode lookups go to Open Food Facts. All
of that is untouched.

## Adding people

Two doors, one allowlist.

**Invite code.** You tab → **Admin** → *People & access* → *New invite code*.
Ten characters, `ABCDE-FGHJK`, no ambiguous letters, single use. They enter it on
the sign-up form and are in immediately. The Admin row is only drawn for the
owner, and the rules are what actually decide — that check is a courtesy, not a
gate.

**Request.** Anyone can create an account without a code. They land on a waiting
screen holding no data at all, their request appears under People & access, and
approving it lets them in — the waiting screen unlocks itself within a second,
no reload.

Both write `access/approved/{uid}`, which is the only node the rules check.
Removing somebody deletes that node: they lose access immediately and their own
log is left untouched, so adding them back restores everything.

Creating a Firebase Auth account is deliberately *not* the gate. It cannot be —
the API key is in this repo, and anyone can call Google's sign-up endpoint by
hand. An account with no approval record is a name in Authentication and nothing
else. That is why the gate is a database node the owner controls, checked by the
rules on every single read and write.

### The AI estimator, per person

`aiAllow/{uid}` decides who may spend the Anthropic balance. An approved account
switches its own `on` flag; only the owner can set `blocked`, and blocked wins —
that is the **AI…** button next to each person. The default is **3 photo and 3
describe estimates per person per day**, counted separately because a photo
costs about ten times what the same meal costs described. That default lives in
the Worker's settings, where no client can reach it.

One account at a time can be given more, from **You → Admin → AI allowance**,
which writes `photoPerDay` / `textPerDay` into that account's `aiAllow` node.
The reasoning that kept the numbers out of the database still holds — a client
that could rewrite its own limit does not have one — so the write is owner-only
and bounded twice: the rules refuse anything above **12 photo or 30 describe**,
and the Worker clamps whatever it reads to the same two ceilings before it uses
it. A value it cannot read as a number is not a limit at all, and it falls back
to the default rather than to zero.

The count is not what protects the money. The monthly dollar cap in the Worker
is, and it is **per account**, not shared: the running spend lives in KV under
`q:{uid}`, so everybody gets their own dollar. At the 12-photo ceiling a $1 cap
is gone inside a fortnight, so raising somebody's allowance without raising
`MONTHLY_USD_CAP` in `worker/wrangler.toml` only changes which refusal they get.

## Food import by paste

The manual route in, and now the only one from outside the app. Both forms end
in a confirmation card; nothing logs without a tap on **Log it**.

1. **Link** — `https://lyttlebeast.github.io/lift-cal/#log=BASE64URL_JSON`
2. **Paste** — Fuel → ⚙ → Paste food JSON, or You → ⚙ → Fuel → Paste food JSON

Payload format (single item, an array, or `{"items":[…]}`):

```json
{
  "items": [
    { "name": "Chicken and rice", "qty": "1 bowl", "cal": 650, "p": 52, "c": 78, "f": 12,
      "meal": "lunch",
      "micro": { "fiber": 4, "sugar": 2, "satfat": 3, "sodium": 900, "potassium": 800, "cholesterol": 150 } }
  ]
}
```

`meal` ∈ breakfast | lunch | dinner | snack (defaults by clock). `micro` is optional.
Imports always land on **today**.

Any food already in the log produces this exact shape: tap it → **Copy JSON**. That
is how you lift last Tuesday’s dinner onto today without retyping it — or, if
you’re already looking at last Tuesday, **Log on today** skips the clipboard
entirely.

## You details

- **It is the first thing that paints, and it never writes.** Every card is a
  read-out; every button either sends you to the tab that owns the number or
  opens the settings hub. `#view-you` is `active` in the markup and `initYou()`
  paints its skeleton before its first `await`, so the tab is never an empty
  box — and if it throws on the way up, the router lands you on Train instead.
- **What it shows**: this week against last week, intake against targets, the
  scale and its trend, the thesis card, training over 30 days, steps and water
  against their goals, and days on record with the current streak. Every card
  has a real empty state, because a one-weigh-in account should read as an
  invitation and not as a wall of dashes.
- **A delta is coloured by meaning, never by sign.** Weight falling on a cut is
  green. Which way is better comes from the goal rate set at setup, or failing
  that from where the calorie target sits against maintenance; when neither is
  knowable the delta stays neutral rather than guessing.
- **The thesis card prints the arithmetic** instead of asserting the answer:
  what you ate on average, the shift the scale implies, and the maintenance
  number the two add up to. The shift is derived *from* that total rather than
  computed alongside it — both maintenance paths round the result to ten and
  neither rounds its operands, so worked out independently the three lines
  would not close on screen, which looks like a bug in the app rather than in
  the rounding.
- **Maintenance follows Fuel's precedence exactly**: a number you pinned wins,
  otherwise the measured estimate. Two screens quoting different maintenance
  numbers is the most confusing thing this app could do.
- **Today is left out of every intake average**, the same way the maintenance
  estimate leaves it out. A day you are still eating is an unfinished day, not
  a small appetite.
- Until the app is running from the home screen there is a dismissible card
  offering the install walkthrough — the same one setup now shows as a step,
  and the same one the settings hub opens.
- Which tab the app opens on is a setting: You, Train, or the one you closed on.
  A live workout outranks all three.

### Settings

One sheet, behind the gear in the You header, and the only settings surface in
the app. The card at the bottom of the Weight tab is gone.

| | |
|---|---|
| **You** | Your details — name, sex, height, birth year — and which tab the app opens on |
| **Fuel** | Daily targets · Water goal and sizes · AI estimator · Food memory · Paste food JSON |
| **Train** | Default rest · Exercise library · Import workout history |
| **Steps** | Step goal · Step automation: the exact settings |
| **App** | Add to Home Screen · Replay the walkthrough · Sign out · Sign out and erase this device's copy |

Almost none of it is implemented there. The hub is a table of contents that
knows where Fuel's, Water's, Steps' and Train's own sheets live and opens them,
and the gears on the Fuel and Steps headers still open the same sheets directly —
the hub is a second door, not a replacement. The two exceptions are the ones
that had nowhere else to be: the profile editor, which is the first code that
has ever written `profile` after onboarding, and the two sign-out paths, the
only controls in the app that can lose anything.

Rows show a live value — targets, water goal, step goal — from the owning
module's own copy, never from a fresh read. Fuel moves its targets in memory
when the weight trend says it should, so a re-read would sometimes quote a
number the Fuel tab has already stopped using.

### The owner's panel

An **Admin** row, drawn only for the owner, takes the You tab over: accounts,
requests waiting and live invite codes; charts of which tabs get opened and how
food actually gets logged; a per-account breakdown; the AI allowance editor; and
People & access folded in whole.

Everything on it is something the owner is allowed to read — `access/*`,
`aiAllow/{uid}` a uid at a time, and the `usage` counters. There is no path from
it to anybody's food log, weigh-ins or workouts, and there is not meant to be
one.

It is also careful about what it does not know. The counters are written by each
phone and flushed as absolute per-day values, so two devices on one day converge
on the larger count rather than the true one — that is a shape, not an audit,
and the panel says so on screen. The Worker's `/quota` answers for whoever's
token asked, so the spend card is the owner's own and is labelled as his own.
And a permission refusal and an empty node arrive as the same `null`, so before
drawing zeros the panel checks a read it is known to be allowed: if the access
list came back and the usage tree did not, it says the rules have not been
published yet rather than reporting that nobody uses the app.

## Train details

- **Swipe any set left** to delete it. Works with touch and a mouse; vertical scrolling is
  unaffected because the row only claims horizontal gestures.
- **Tap a past day → Edit** to reopen a finished session. Weights, reps, set types,
  exercises, the name, the duration and even the date are all editable; Delete removes the
  whole session. Editing rebuilds the per-exercise history index from the log, so records
  can never go stale.
- **The calendar button in the session bar** parks a live workout out of sight and puts the
  calendar back — check what you did last Wednesday mid-set. Nothing is paused and nothing is
  lost; a bar above the dock holds the running clock and takes you back, from any tab. Editing
  a past session is blocked while a live one is parked, because they share the same slot.
- **Finishing a workout** shows a recap: duration, volume, working sets, every personal
  record you beat, session milestones, first-time exercises, and how the session compares to
  your last four weeks.
- **Statistics** (below Start workout) covers volume per week, consistency heat map and week
  streaks, muscle-group split, sessions per week, strongest lifts, most trained, most volume,
  a PR timeline, and a per-exercise breakdown with e1RM and heaviest-set trends.
- New exercises are created with a proper sheet — muscle group and equipment are chips, so
  there is no spelling or capitalisation to get wrong.
- **Routines** (below Start workout) are pre-planned workouts — name, exercises, target
  weight and reps per set. Starting one fills the session out, but targets appear as
  *placeholder* text and never as pre-filled values: a number you forgot to change is a lie
  in the log. Finishing any workout offers **Save as routine**, which is usually the fastest
  way to make one, because it captures what you actually did.
- Records are **derived from the log**, never stored. There is no `records` node in the
  database; every statistic is computed from the workouts themselves.

## Fuel details

### Logging food

One button floats above the dock on the Fuel tab, and everything that puts food
in the log lives behind it, ordered by how often it actually gets used:

| | |
|---|---|
| **Photo** | Camera → optional one-line description → Claude estimates → you check and edit → log |
| **Describe** | Type what you ate. Roughly a tenth of the cost of a photo, and often *more* accurate for something you cooked yourself, because a picture cannot see the oil that went in the pan |
| **Barcode** | Open Food Facts lookup, as before |
| **Manual** | The numbers, typed, as before |

The per-meal **+ Add food** buttons are gone with it — one button does that job
now, and four copies of the same action down the page were three too many. Meal
cards are pure read-outs, and an empty meal collapses to a single header line so
a fresh morning is four tidy rows instead of a wall of hollow boxes.

Saved **Foods** and **Meals** sit below a rule in the same menu — still there,
deliberately quieter, and both can now be deleted. Deleting a saved food does
not touch anything already logged with it; those entries carry their own
numbers.

Every estimate lands on a review screen before anything is written. Each line is
tappable to fix the name, the portion or any macro, has a ✕ to drop it, and can
be kept in your saved foods on the way past. Nothing is logged until you press
the button.

**The API key is not in the app**, and cannot be. GitHub Pages serves every file
in this repo to every visitor; there is no private half of a static site. The
key lives in a Cloudflare Worker (`worker/`) which verifies the caller's
Firebase ID token, checks it against a uid allowlist, applies per-minute and
per-day rate limits — the per-day ones raisable per account, and ceilinged in
code — and enforces a hard per-account monthly dollar cap before it will call
Anthropic at all. Setup: **`worker/README.md`**. The Worker URL in
`ai-config.js` is an address, not a secret — a stranger who finds it gets a 401.

Photos are shrunk to a 1024 px long edge on the phone before upload. That is not
politeness about bandwidth: Claude charges by the 28×28 patch, so a full iPhone
photo costs roughly twenty times as much and reads no better. Shrinking through
a canvas also drops the EXIF block, so the GPS coordinates of where you ate
never leave the phone.

### Targets and the day

- Targets default 2,700 kcal / 215 g protein / 80 g fat; **carbs are the remainder**.
  Targets, maintenance and the JSON paste box live behind the ⚙ in the Fuel header,
  and under *Fuel* in the settings hub — the same sheets, two doors.
- **Targets can follow the scale.** Daily targets has a switch: *Set them*
  keeps the old behaviour, *Follow my weight* means you set a goal rate and grams-per-pound
  instead of numbers. Protein and fat then track your **trend** bodyweight — normalised, not
  the last weigh-in — and calories track the live maintenance estimate, so a cut doesn't
  quietly stall as maintenance falls toward a target you set six weeks ago. Carbs stay the
  remainder. It moves at most once a week and at most 100 kcal at a time, and it floors
  itself at protein + fat + 100 g of carbs, because carbs being the remainder means calories
  falling too low produces zero carbs rather than a warning.
- **The big number is the deficit**, not calories left. The whole point of a cut is how
  far under maintenance the day is; the daily target is a number you typed into settings
  once. So `633 under maintenance` gets the 40px and `893 left · 1,807 / 2,700` gets the
  small print. With no maintenance number pinned and not enough logged to estimate one,
  there is no deficit to show and it falls back to calories-left.
- **The calorie bar** is the one that matters, so it's the big one. Two ticks cut it into
  three bands: left of the first is a deficit, between them is holding, right of the second
  you're gaining — and the fill takes the colour of the band you're standing in. The ticks sit
  a collar of ~8% either side of maintenance (call it 200 kcal, under half a pound a week),
  anchored on the number you pinned in Daily targets if you've set one, otherwise the
  estimate off your weight trend. With neither, the bar falls back to plain progress against target and says so. A
  blowout day pins the bar full rather than stretching the axis until the bands are slivers.
- **Tap any logged food → ×2 / ×3 / ×4 / Half** to scale it, or *Log this again separately*
  to add a second helping as its own entry. **Copy JSON** lifts it out in the shape the paste
  box eats; on a past day, **Log on today** does the same trip without the clipboard. Library-linked foods scale by portion so the
  gram maths stays honest; everything else scales its macros directly.
- Barcode scan uses the native `BarcodeDetector` where it exists and falls back to ZXing (WASM)
  on iOS Safari. Lookups hit Open Food Facts; misses drop into manual entry.
- Starter foods (Body Fortress scoop 44 g, work pizza crusts S–XL dough only, wings per oz)
  are seeded for the owner account only, once. Delete one and it stays deleted.
- Micronutrient sums only count foods that report each value, and the card says how many did —
  floors, not truth.
- Per-day rollups are written to `food/daySummaries/{date}` to power the TDEE estimate.

## Water details

- Goal, display unit and the quick-add sizes live behind the ⚙ in the Fuel header, and
  under *Fuel* in the settings hub. The goal can be suggested from bodyweight at roughly
  half an ounce per pound.
- The card sits above Micronutrients: a bottle that fills, one pip per standard bottle, and
  a fat button for your default size. `⋯` opens every size, a custom amount in any unit,
  and today's entries with swipe-to-delete.
- **Millilitres are the only thing stored.** A log that stores whichever unit was on screen
  is a log you cannot sum. 16.9 fl oz — the supermarket flat-of-40 bottle — is 500 ml.
- Water is also the cleanest input the maintenance model gets: 500 ml is exactly 1.1 lb,
  known to the millilitre, with none of the guesswork food mass carries.

## Steps details

- **Manual is the floor, automatic is an upgrade.** Both write the same
  `steps/{date}` node, so there is nothing to migrate when someone sets up an
  automation later, and nothing breaks when it misses a day.
- Tap **Set total** for the whole day's number, or `+500 / +1k / +2.5k` to nudge
  it. Any of the last 14 days is tappable to correct, swipe-left to clear.
- **Steps → ⚙ → Log steps automatically** is a walkthrough built into the app, with
  an iPhone / Android switch, so a new tester can set themselves up without being
  talked through it. It ends on a card showing the two exact requests. The settings
  hub reaches the walkthrough through *Step goal*, and opens that last card on its
  own as *Step automation: the exact settings*.
- The automation signs in **as that person**, and the sign-in response carries
  their own `localId`, so the same recipe works for every account unmodified —
  nobody types an account id and no shared credential exists anywhere.
- Neither platform lets any app read health data while the phone is locked. The
  count lands on the next unlock. That is Apple and Google's rule, not a
  limitation of this approach — a paid app hits exactly the same wall.
- The ring is an arc, Fuel is a bar, Water is a filling vessel. Three different
  shapes on purpose: you should know which screen you're on at a glance.

## Weight details

- Dots are weigh-ins, the yellow line is the trailing 7-day average. **Adjusted / Raw**
  switches between normalised readings and what the scale actually said.
- **Weigh-ins are normalised before anything is fitted.** A 7am fasted reading and a 9pm
  post-dinner one differ by pounds, so averaging them together means the daily number
  depends on what time you happened to stand on the scale — and a change in *weighing
  habit* becomes indistinguishable from a change in *body weight*, then gets multiplied by
  500 on its way into the maintenance estimate. Simulated over 120 runs, the old
  arithmetic was off by an average of 378 kcal/day and by 752 when the habit shifted
  inside a fortnight; normalised, that average is 47.
- The model treats each reading as true weight plus **gut load** — food and water eaten and
  not yet cleared, on an exponential decay, from the timestamps already in the food and
  water logs. Its two coefficients are fitted on **within-day pairs**: two weigh-ins from
  the same day share the same true weight, so differencing them cancels it exactly. Fitting
  against a smoothed trend instead does not work — the smoother absorbs the average gut
  load and the coefficient collapses (measured at 0.00087 against a true 0.00160). It is
  the one thing in `weightmodel.js` not to "simplify" later.
- Weekly rate is a Huber-weighted least-squares slope over 21 days of normalised dailies,
  not this week's mean minus last week's, and it carries its standard error — which is why
  maintenance reads **≈ 2,850 ± 95** rather than a number with false precision.
- Until there are 30 same-day pairs across 14 days it uses physical defaults and says so,
  and if it can't answer at all it falls back to the original arithmetic. Degrading to the
  old answer is fine; a confident wrong answer is not.
- **Time of day** is the learned curve, not bucket averages: "+3.8 lb heavier by 8pm" is the
  correction the model is applying, stated back to you.
- Steps are deliberately **not** an input. This estimator is empirical — activity is already
  inside the scale trend, and adding a step term would double-count it.
- The public API lives in `tdee.js` because Fuel's calorie bar and the You tab's thesis
  card need the same number, and three copies of it is how three screens start
  disagreeing. `weightmodel.js` holds the math.

---

## Notes

- Flat file layout — GitHub Pages serves it directly from the repo root.
- Timers are timestamp-based, so iOS background throttling doesn't cause drift.
- Writes queue in `localStorage` when offline and flush on reconnect.
- Service worker is network-first with cache fallback (`rack-v13`). Bump the cache name in
  `sw.js` when you need to force-evict old assets. It bypasses `*.workers.dev` the same way
  it bypasses Firebase — an estimate must never come out of a cache. `usage.js` holds the
  same string a second time, because a service worker is not a module the app can import
  and the version is what each account reports as its own; move the two together.
- If a deploy looks stuck, edit `.nojekyll` (bump the "redeploy N") and push — that forces
  GitHub Pages to rebuild.
