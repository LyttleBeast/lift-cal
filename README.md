# Rack

Personal training, nutrition and body weight log. Phone-first, installs to the iPhone home screen, works offline.

Live at **https://lyttlebeast.github.io/lift-cal/**

Multi-account: every account holds its own training log, food, weight, water and
steps, and no account can see or touch another's. New people get in with an
invite code, or by asking the owner and being approved. See *Access* below.

- **You** — the tab the app opens on. A read-only summary of the other four and of how their numbers pull on each other: this week against the last, intake against targets, the scale against maintenance, printed as arithmetic rather than asserted. Nothing on it writes anything. The gear in its header is where every setting in the app now lives.
- **Coach** — a card at the top of You and above Start workout on Train that says one true thing about your own log and shows the arithmetic under it: which muscle group is furthest past its own usual gap, which of your recurring sessions has waited longest, how this week's sets compare with your own trailing normal. No AI, no network, no per-use cost — it is arithmetic over the log, and a rule whose data is thin stays silent. Tap it for **COACH ME** — from You a sheet you can ask about Train, Fuel or Weight, and from Train one that asks the training questions first. In a live workout a **Coach** chip answers *what should I do next?* from your own sessions — and a quiet line under a finished exercise says it once. **Targets**: for every lift in a workout Coach builds, the weight and reps for next time, worked out from your own sessions and your own jumps — never a percentage, never a plate combination you did not choose, and no number at all when it does not know your step. **Rest and recovery**: each muscle group's recovery time is read off your own gaps between training it. *What should I train today?* picks what has recovered, or says rest or go lighter when the log says so, and *Should I rest or go lighter?* lists what is off your normal today. It is always advice with a way on (*Train anyway*). A bad day can be **marked** so it never counts against your numbers. **Am I fueled?** reads your food log against your own normal and never tells you what to eat. **Patterns in your data**, off until you switch it on, sets two groups of your own days side by side as numbers. Part of Pro; the readouts are free.
- **Train** — full workout tracker: saved routines, plate-colored calendar, session timer, W/F/D set tags, 231-exercise library, last-time numbers, rest timer, per-side plate math, e1RM, swipe-to-delete sets, editable history, a post-workout recap that leads with the win — "Great workout." only when your log or your own rating backs it, otherwise "Good work." — with your personal records under it, asks how the session felt (energy and strength, saved with it), and compares it only with sessions like it, never as a percentage, and a full statistics page.
- **Fuel** — nutrition: **photograph a plate and Claude reads the macros off it**, or just describe what you ate. Plus macro targets, saved-food library, barcode scanning via Open Food Facts, manual entry, saved meals, one-tap portion multiplying, micronutrient floors, paste import.
- **Weight** — body-weight log: 7-day moving average chart, weekly rate, a learned time-of-day curve, and a maintenance (TDEE) estimate built on normalised weigh-ins with a stated confidence interval.
- **Pounds or kilos**, app-wide — body weight, set weights, volume, records, trend rates, goal weight, height and per-bodyweight macro targets, all of it. Picked at setup, changeable any time under ⚙ Units. Nothing in the database changes: pounds and inches are the stored unit and the setting converts at the edges.
- **Water** — daily intake against a goal, in the Fuel tab: a filling bottle, one-tap common sizes, any unit you like, stored in millilitres.
- **Steps** — its own tab: goal ring, 7-day / 30-day / 12-month trend, streaks, a 13-week heat map, day-of-week breakdown, and a typed daily total.

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
aiAllow/$uid         two booleans and three optional limits. Publicly
                     readable BY KEY so the Worker can check it without
                     credentials; `blocked`, `photoPerDay`, `textPerDay` and
                     `monthlyUsd` are owner-only, and are what an account's
                     TYPE derives into (see accounts.js)
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
| `insights.js` | What Rack makes of the data — wins, slips, insights, the weekly review, the goal pace. Pure functions over what `you.js` loaded |
| `coach.js` | **Coach's engine.** Facts, intents, responses, router — four tables and a sort. Pure: no clock, no DOM, no reads, no module state. Since v53 also `finishRead()`, the finish line the recap, the card and the sheet read after a workout ("Great workout." only with evidence, otherwise "Good work."), and the card's warm lines. Copied into the native tree verbatim |
| `coach-build.js` | **The workout builder** — "Make me a workout" on Train. Turns the shape that has waited longest into a workout made out of his own log: the most recent such session, its exercises, blocks and logged numbers, never an invented weight — and beside each exercise its target from `coach-prog.js`. Pure, and copied into the native tree verbatim like `coach.js` |
| `coach-prog.js` | **The targets** — per lift, the weight and reps for next time: his rep range learned from where he moves up, his step learned from his own jumps, a hold, a jump, a reduction or a way back after a layoff, each with its evidence. Every weight is one he logged or at most two of his own steps away (coming back, a whole number of steps below). Since v52 `targetFor()` is the one way a target is named: after a marked session it is the target from before it. Since v54 it reads his effort rating of a set (`rir`: too hard holds, way too easy at the target counts as the top), and `nextSet()` gives the next set mid-session. Pure; copied verbatim. `tools-check/coach-prog.mjs` is its battery |
| `coach-goal.js` | **The goal's dials** — the six aims and three experience answers, what each turns (confirm twice before a jump, one jump or two, the starting rep band), and the energy context read off the weight trend. Since v49 also bodyweight at a moment, the energy band, the volume floors, the lift target's shape (`normGoalLift`), its pace (`paceFor`) and the goal-change checks. Pure; imports nothing; copied verbatim |
| `coach-overlap.js` | **Plateau or cut?** (v49) — a flat lift read against the bodyweight, the frequency and the sets beside it: a real plateau and the rung of the stall ladder, a cut that is holding, a slide, trained too rarely to say, or "Coach needs weigh-ins". Also the lighter week, the record day, "How are my lifts moving?", and the stage-three reads that need a target replayed or a lift's series (how today compared, what's next time, the lift target's pace). Pure; copied verbatim. `tools-check/coach-overlap.mjs` is its battery |
| `coach-ready.js` | **Rest and recovery** (v52) — each group's recovery window from his own gaps, longer after a day big against his own normal (lifting sets only, cardio out); the rest read (rest, go lighter, a recovered group, or the recovered shape that has waited longest); the replayed "did you rest on days like this"; readiness, a list and never a score; what was different about a session, in both directions and never a cause. Never imports `coach-fuel.js`, so food moves no rest call. Pure; copied verbatim. `tools-check/coach-ready.mjs` is its battery |
| `coach-fuel.js` | **Am I fueled?** (v52) — his food against his own normal and never a prescription: complete days, the food phase, his by-hour curve on training days, whether he logs as he goes or later, and the food rows beside readiness and a session. A half-logged day is "not fully logged", never low. Imports `coach-goal.js` and `units.js` only. Pure; copied verbatim. `tools-check/coach-fuel.mjs` is its battery |
| `coach-volume.js` | **The whole week** (v54) — each muscle group's hard sets in the last 7 days against a common range for his goal and his own normal, the one group gone quiet (once in four weeks), and whether pushing and pulling, presses, pulls, knees and hips are lopsided over eight weeks. Counts only, never a reason about the body. Pure; copied verbatim. `tools-check/coach-volume.mjs` is its battery |
| `coach-tags.js` | Movement pattern, angle, load and side for every built-in exercise. A sidecar keyed on `exercises.js`'s ids, so a tagging mistake can never reach the picker. Pure; imports nothing. The builder reads it: pattern for "Swap one", load for "Fewer exercises" |
| `coach-live.js` | **Coach in the gym** — during a live workout, what usually comes next, one more set, the next group, or "you're probably good for today", read off the session in progress against his own sessions of that shape, and (v54) the sessions he finished earlier that day. It works out no weight itself: since v54 it says the next set `coach-prog.js` gives, and the effort chips' words. Pure, and copied into the native tree verbatim like `coach.js` |
| `coach-data.js` | The impure half — the one file the native port rewrites. Reads once per app open and never on a paint, except the food days *Am I fueled?* reads on an ask (v52: Pro, Food on, fifteen at most). Writes `settings/coach`, bad-day marks included. Since v53 `coachFinishRead()` for the recap and `noteCoachFood()`, which `food.js` calls after each day-summary write |
| `coach-ui.js` | Coach's card (since v49 one earned line from his own log — the sheet opens on the finding; since v53 the finish line after a workout, and a warm line when nothing is earned), the COACH ME sheet with "More", the builder's recovery caution and the bad-day mark's chips (v52), the Settings switches and Your goal (aim, experience, focus, Lift target), and the live session's chip, sheet (since v54 the next set and the effort chips) and one-line nudge |
| `settings.js` | The settings hub behind the You gear, and the profile editor |
| `admin.js` | Owner-only panel — feature usage, the Accounts page, People & access |
| `accounts.js` | Account types and what each one may do. Pure, and the single entitlement choke point — every limit and feature check goes through `capabilitiesFor()` |
| `usage.js` | Counters-only telemetry: the `usage/{uid}` ledger, and platform detection |
| `store.js` | Data layer — Firebase + per-account localStorage mirror + offline queue |
| `firebase-config.js` | Public project keys and the owner UID |
| `access.js` | Who is allowed in — invite codes, requests, approval; `admin.js` draws the People UI from it |
| `onboarding.js` | First run — setup questions, starting targets, add-to-home-screen, the five-tab tour |
| `database.rules.json` | **The security rules.** Paste into the Firebase console |
| `auth.css` | Styles for the sign-in box, waiting screen, onboarding and People |
| `ui.js` | Shared primitives — sheets, toasts, confirms, swipe, date/number helpers |
| `units.js` | Pounds/kilos and inches/centimetres. Pure, imports nothing, reads nothing — every function takes the unit as an argument |
| `analytics.js` | Training aggregates, personal-record detection, SVG chart builders — and (v53) the recap's comparison with sessions of the same kind, and `normFeel()`, the one reader of a session's rating |
| `stats.js` | The statistics page |
| `workout.js` | Train tab — calendar, live session, editing, post-workout recap (v53: the win first, "How did that feel?", no percentage; v54: last time's numbers in grey on an exercise added by hand, and a set's effort rating, `rir`) |
| `blocks.js` | Lifting blocks — the pure model, shared by the workout screen and the routine editor. Imports nothing, reads nothing |
| `picker.js` | Exercise library (static + custom) and the two picking sheets |
| `routines.js` | Pre-planned routines — list, editor, start, save-a-session-as |
| `food.js` | Fuel tab |
| `ai.js` | AI estimator client — photo shrinking, the two estimate calls, error shapes |
| `ai-config.js` | The Worker URL. A public address, not a credential. The Worker itself is **not in this repo** — it is `~/dev/rack-worker`, its own private repo |
| `water.js` | Water card, log sheet, goal and sizes |
| `weight.js` | Weight tab — log, trend chart, time-of-day curve, maintenance |
| `steps.js` | Steps tab — ring, trend, streaks, heat map, and the setup walkthrough |
| `tdee.js` | Public face of the weight math — trend, maintenance, calorie zones |
| `weightmodel.js` | Weigh-in normalisation: gut-load model, coefficient fit, robust slope |
| `exercises.js` | Static 231-exercise library |
| `importer.js` | One-time Liftoff history migration |
| `rack.css` | The stylesheet |
| `404.html` | Branded not-found page |
| `sw.js` | Service worker, network-first, and revalidating for our own files so a fresh ship is not re-cached stale. The cache name is the build version — read it out of the file, never out of here |
| `AGENTS.md` | The database schema, node by node |
| `rack.mjs` | **Dead file** — CLI for the removed agent account, kept as a record |

Import direction is strictly one-way, no cycles:

```
app.js → you.js       → coach-ui.js  → coach.js   → analytics.js ──→ ui.js
                                                 → coach-build.js → blocks.js  coach-tags.js
                                                                  → coach-prog.js → coach-goal.js
                                                 → coach-live.js
                                                 → coach-goal.js
                                                 → coach-overlap.js → coach-prog.js  coach-goal.js  coach-tags.js
                                                 → coach-ready.js → coach-overlap.js  coach-prog.js  coach-goal.js  coach-live.js
                                                 → coach-fuel.js  → coach-goal.js
                                                 → coach-volume.js → coach-goal.js  coach-tags.js
                                    → coach-data.js → picker.js
                                                    → tdee.js  insights.js
                                                    → access.js → store.js
                      → settings.js → food.js  water.js  steps.js  workout.js
                                    → picker.js  importer.js  ai.js
                                    → onboarding.js
                      → admin.js    → access.js ──────────────→ store.js
                                    → analytics.js
                                    → ai.js
                      → analytics.js ───────────────────────→ ui.js
                      → tdee.js → weightmodel.js ───────────→ ui.js
                      → water.js
                      → onboarding.js
      → workout.js    → coach-ui.js (as above)
                      → coach.js  coach-data.js (v53: the finish line; the check-in's words and gates)
                      → stats.js ──→ analytics.js ─────────→ ui.js
                      → picker.js ──────────────────────────→ ui.js
                      → blocks.js
                      → routines.js → picker.js
                                    → blocks.js
      → food.js       → water.js ───────────────────────────→ ui.js
                      → coach-data.js (v53: noteCoachFood, after each day summary)
                      → recall.js ──────────────────────────→ store.js
                      → ai.js → ai-config.js
                              → store.js (idToken only)
                      → tdee.js → weightmodel.js ───────────→ ui.js
      → steps.js      → analytics.js
      → weight.js     → tdee.js
                      → analytics.js
      → access.js     → store.js
      → onboarding.js → tdee.js
                      → coach.js  coach-data.js (the training-goal step)
      → usage.js ─────────────────────────────────────────→ store.js
```

`picker.js` exists so `routines.js` and `workout.js` can share the exercise
picker without importing each other. `workout.js` hands its `startWorkout` to
`routines.js` as a callback; routines never imports back.

`blocks.js` exists for the same reason and one more: a lifting block is drawn on
the workout screen and in the routine editor, and the two would otherwise each
carry their own idea of what a block is. It holds only the pure model — take a
`{ exercises, blocks }` pair, return the next one — and it never reads a set's
`w`, `r` or `done`, because a routine's sets are `tw`/`tr` instead. The native
port copies it across verbatim.

`usage.js` is imported by eleven modules — the eight that count something, plus
`you.js` and `onboarding.js` for its home-screen detection and `admin.js` for
its event list — and it imports nothing but `store.js`. That is what makes it
safe to import from anywhere: a module at the bottom of the graph can never
close a loop, and `bump()` is one line at a call site that already has real work
to do.

`coach.js` is at the bottom of the graph with `units.js` and `blocks.js`: it
imports `exercises.js`, `units.js`, `coach-build.js`, `coach-live.js`, `coach-goal.js`, `coach-overlap.js`, `coach-ready.js`, `coach-fuel.js`, `coach-volume.js` and the SESSION MATH from
`analytics.js` (`e1rm`, `isWorking`, `mergeSessionExercises`, `exerciseIndex`,
and since v53 `detectPRs`, `sessionMilestones` and `normFeel` for the finish line)
and nothing else — never `loadAll`/`allSessions`, which are that file's impure
half. It holds no state and takes its clock as an argument, so two renders
inside one app open cannot disagree about which greeting is showing.
`tools-check/coach-pure.mjs` is the fence around all of that.

`coach-build.js` sits under it and never imports it back. It derives nothing
about the log on its own — the recurring shapes, the window, the gate and the
layoff are `coach.js`'s facts, handed over by `builderInput()` — and it decides
everything that goes into a proposal — its targets through `coach-prog.js`,
which sits under it on the same terms and never imports it back. It writes
nothing either: the sheet's buttons end in `startWorkout(preset)` and
`saveSessionAsRoutine(record)`,
which the Train card hands to `coach-ui.js` as callbacks, the way it hands
`startWorkout` to Routines, because `coach-ui.js` cannot import `workout.js`
without closing a ring. The You card hands in neither, so the builder is on
Train alone.

`coach-live.js` sits beside it on the same terms: `coach.js` hands it the
window and the recurring shapes (`liveInput()`), and since v54 the live
session's date key and the next set as a function it may call (a
`coach-prog.js` target, reached through `coach-overlap.js`). It reads the live session it
is given and never writes to it, and what it says reaches the screen through
`coach-ui.js`. "Add it" in the live sheet is the picker's own callback, handed
in by `workout.js` — `addPicked`, the one function "+ Add exercise" hands
`openPicker` — so an exercise Coach adds lands exactly where the button puts one.

`coach-ready.js` and `coach-fuel.js` (v52) sit under `coach.js` on the same
terms, and **never import each other**. That is what makes "food moves no rest
call, no target and no lift reading" true by construction rather than by test.
`coach.js` merges their rows.

`coach-data.js` is the only half that reads. It does the gathering once per app
open and hands `coach.js` a plain object, which is what lets a card sit at the
top of the busiest screen in the app without adding a single read per paint.
The one exception is *Am I fueled?* (v52). Its food days are read on the ask,
for Pro with Food on, at most fifteen per app open (`loadFuel()`), and never on
a paint. It is also the one file the native port rewrites; `coach.js` is copied
byte for byte.

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

Coach did not change that. Its card needs to know whether a workout is running,
and `hasActiveSession()` is workout.js's module state — filled by
`initWorkout()`, which app.js starts AFTER `initYou()`. So the You card asks the
DEVICE instead (`activeSession` in localStorage, which is where a live session
lives until it is saved), and the Train card passes workout.js's own answer in,
because there that module is the authority. `coach-data.js` never imports
`workout.js`, which is also what keeps the ring between a tab and the card it
draws from ever closing.

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
Removing somebody deletes that node and resets their AI permissions: they lose
access immediately, and their own log is left untouched, so adding them back
restores everything.

Creating a Firebase Auth account is deliberately *not* the gate. It cannot be —
the API key is in this repo, and anyone can call Google's sign-up endpoint by
hand. An account with no approval record is a name in Authentication and nothing
else. That is why the gate is a database node the owner controls, checked by the
rules on every single read and write.

### The AI estimator, per person

`aiAllow/{uid}` decides who may spend the Anthropic balance. An approved account
switches its own `on` flag; only the owner can set `blocked`, and blocked wins —
that is **Turn their estimator off**, on that account's page under You → Admin →
Accounts. The default is **3 photo and 3 describe estimates per person per
day**, counted separately because a photo costs about ten times what the same
meal costs described. That default lives in the Worker's settings, where no
client can reach it.

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
`MONTHLY_USD_CAP` in the Worker's `wrangler.toml` only changes which refusal
they get.

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
| **You** | Your details — name, sex, height, birth year — **Units** (Imperial / Metric), and which tab the app opens on |
| **Fuel** | Daily targets · Water goal and sizes · AI estimator · Food memory · Paste food JSON |
| **Train** | Default rest · Exercise library · Import workout history |
| **Coach** | One switch per category of thing Coach may bring up, whatever it has been told, **Your goal** (Pro), and a way into the COACH ME sheet |
| **Steps** | Step goal |
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

## Coach

A card at the top of You, a tighter one above Start workout on Train, and a
sheet behind both of them. Part of Pro — the readouts are free and the
comparisons against your own history are what Pro adds; the lock in the card's
corner says which.

**There is no model behind it.** No network call, no API key, no per-use cost,
nothing generated. Every sentence is arithmetic over this account's own log with
the working attached underneath it, and every number in one is a number you
could go and check on another tab. `coach.js` is four tables and a sort:

```
FACTS      named values, each carrying the short "because" it contributes to a
           reason line, and how old the evidence behind it is
INTENTS    the facts they need, a min-data gate, a condition, a band, a
           severity, a category, and what they supersede
RESPONSES  templates, filled from resolved facts, split from the rules so one
           finding renders on a card, in a bubble, or later in a weekly review
           without its condition being written twice
ROUTER     a button id in, an answer out
```

### What it will not say unprompted

**An unprompted finding is neutral or actionable, never a judgement. Coach
describes the numbers, never the person.** A card arrives without being asked
for, on the screen the app opens to, and a sentence that is fair in answer to a
direct question is not automatically fair there — a reading about a lift that
has not gone up belongs in the sheet when somebody taps *Anything stalled?*,
not over the top of a training log at seven in the morning. A verdict is also
usually a guess: a flat estimated max on an account running a deficit is a lift
held, not a lift stalled, and the same words that judge are the words that get
the reading wrong. `tools-check/coach-voice.mjs` enforces it mechanically over
every sentence a card can reach.

### The house law

**A wrong number is worse than no number.** A rule whose data is thin stays
silent, a fact that cannot be computed honestly is absent rather than guessed,
and *Nothing stands out today* is a thing Coach says out loud rather than a
thing it fails to. `tools-check/coach-silence.mjs` drives every finding three
times — on an empty account, on a thin one, and on one with enough behind it —
because a rule that is silent on all three is broken rather than careful.

Three related promises:

- **Coach only ever compares you against a number you set, or against your own
  trailing average.** Never a population norm, never a healthy range, never a
  guideline. Where it quotes a comparison it names the denominator out loud:
  *2 sessions in the last 7 days, against 3.5 a week across the four weeks
  before.* **One exception since v54, in the sheet only:** *How's my weekly
  volume?* sets each group's hard sets beside "a common range" for your goal,
  from the research the spec cites (§6.2). It is named as that and always
  sits beside your own usual. The range alone flags nothing, except on the
  focus group you named, after four weeks under it.
- **A readout, not an instruction.** *Fat is 38% of your calories over the
  last seven full days, against the 30% your targets work out to* — never "eat
  less fat". It does not do injuries or pain, and it says so if it is asked.
  And a rolling window is never given a calendar word: "this week" over the last
  seven days is a right number under a wrong word.
- **Every sentence prints its weight through `units.js`**, and no sentence in it
  names a rounding or a step size. "Round it up to the nearest 5" is a false
  sentence on a metric account, and no conversion fixes that — only a different
  phrasing does. `tools-check/coach-units.mjs` renders every sentence twice,
  once imperial and once metric, and compares them.

### What it can and cannot see

The muscle-group vocabulary is `exercises.js`'s six — chest, back, legs,
shoulders, arms, core — and that is a hard ceiling. There is no biceps/triceps
split and no quads/hamstrings split, so *you're behind on chest* is computable
and *you never train hamstrings* is not. `coach-tags.js` is the sidecar that
makes movement pattern computable: the workout builder reads it to swap a press
for a press and to take an isolation lift out first.

A **recurring session shape** is derived over the last 84 days: the set of
primary groups in a session with two or more working sets, cardio excluded,
clustered where two differ by at most one group, and called a shape at three
sessions or more. It is named descriptively from the group labels — *your chest
and shoulders day* — never in programme jargon Rack has no way to know applies.
If one of your own saved routines covers exactly those groups, your name for it
wins.

Nothing derives from `session.groups` on the stored record. It counted
warm-ups until `884ddd9` (23 Sep 2026) and counts working sets now, but every
group Coach names is still derived fresh from the sets.

### Make me a workout

On Train, and on Pro, the second bubble in the sheet, after *What should I train
today?* It asks first — *What do you want to train?* — and offers **Tell me what
to train** (Coach's pick: the session that has waited longest), then your own
recurring sessions by their names, then the six muscle groups, each only if
there is something in your log to build it from. The answer to *What should I
train today?* offers **Build it**, which skips the question and builds what that
answer named. Either way it is built out of your own log: the most recent
session of that kind, its exercises in the order you did them (since v54, your
focus group's first, unless the session has lifting blocks), your lifting blocks, and the numbers
you actually lifted — never a weight you did not. It says which session it was
built from, offers your own routine for that shape by your name if you have one,
and says what it left out (an exercise you hid, one no longer in your library)
rather than quietly substituting. Under each exercise, its **target** for next
time (see *Targets* below). Then the buttons: **Start with Coach’s targets**
first and yellow whenever there are targets (Coach's numbers as ghost text),
**Start it** (your last numbers as ghost text), **Start with my last numbers**
(filled in, nothing ticked), **Save as routine**, and **Change something** —
train something else, fewer exercises, or swap one for another of yours in the
same group and movement, or for **Something else…** — the exercise picker,
opened on that lift's group, one tap to pick. With targets switched off, the
row is the four it always was.

Three refusals, each where the obvious answer would be a confident wrong one:
after a layoff there are no pre-filled numbers, only ghost text, and it says how
long it has been — never a percentage off; before your exercise library has
loaded there is no proposal, because a custom exercise would look deleted; and
during a live session there is none either, because starting one would replace
it. `coach-build.js` decides all of it and writes nothing: the buttons end in
the same `startWorkout` and `saveSessionAsRoutine` a routine and a finished
session already use. `tools-check/coach-build.mjs` is its fence.

### Targets

On Pro, every exercise in a workout Coach builds carries a line — *Target: 3 × 8
at 190 lb.* — and a tap on it shows the evidence: the reps every set reached
and the day, the jump Coach used and how many times it has seen you take it.
**Start with Coach’s targets** starts the workout with the targets as grey
ghost text; ticking a set adopts them, and nothing is logged until you tick.
*What should I lift today?* on Train's sheet lists them.

The rep range is learned from where you move up, and the jump from your own
jumps — the smallest one you have taken at least twice. Until your log shows
them, Coach uses a labelled starting range and, for barbells and pound
dumbbells, a labelled starting jump; with no jump it knows (a machine, a cable
stack, a kilo dumbbell rack) it says *the next setting up* and prints no
number. Every weight it names is one you have logged or at most two of your own
jumps away; coming back after time off, the muscle group's clock decides how
far back to start (a weight you have logged, or a whole number of your jumps
below your last top set), and a lift not done in twelve days gets no jump its
first time back. Singles and lone heavy top sets get no target, a set taken to
failure never earns two jumps, and a session that does not carry a safe answer
gets *No target this time* with last time quoted.

Since v54 your rating of a set (see *In the gym*) is read too, and no more
than this. A top set you rated **Too hard** holds the target: the same again,
not a miss. A session where every set you rated at the target was **Way too
easy**, none went to failure and every one reached its reps counts as reaching
the top: one jump at most, and still through the goal's confirm-twice rule. The
target's evidence says when your rating moved it. A session you never rated
gets exactly the target it always did.

Settings → Coach → **Your goal** sets what you are training for (*Get stronger*,
*Powerlifting*, *Build muscle*, *Lose fat, keep strength*, *Recomp*, *Stay
consistent*) and how long you have lifted; each turns how many times Coach wants to see the
top of your range and how big a jump it will suggest. Unset, the targets still
work. Settings → Coach → **Weight and rep targets** switches them off.
`coach-prog.js` decides; `tools-check/coach-prog.mjs` scores every case in the
brief ok / miss / wrong (wrong must be 0) and sweeps thousands of generated
histories in both units.

### In the gym

During a live workout, on Pro, a **Coach** chip sits in the session's header
row. Tapped, it answers *What should I do next?* from your own sessions of this
kind over the last twelve weeks — one of four answers, tried in this order:

```
done      you're probably good for today — your usual number of working sets
          for a session like this is reached, or your last two exercises both
          show fatigue: a set typed F, or reps down a quarter at the same or a
          lighter weight
switch    this group has had its usual sets, and your session of this kind has
          a group with nothing in it yet — named, with the exercise you usually
          open it with
another   one more set of this exercise is in line with what you usually do
next      what usually comes straight after what you've done so far
```

Done first, always: stopping one set early costs nothing, and Coach pushing a
tired set is the one thing it must never do. **Why?** shows the working; for
*next* and *switch*, **Add it** adds the exercise the way **+ Add exercise**
would, at the end of the session.

**Today is a day, not a session** (v54). A group or exercise you trained in a
session you already finished today counts as trained today: an evening
session's Coach never offers the chest you did this morning. When the morning
and the evening are one of your usual workouts split across two visits, their
sets count together toward *done*. A different workout is a different workout.

**The next set** (v54, spec §3.10). Under the answer, when the exercise in hand
has a Coach target, the sheet says the next set: "Next set: 190 lb × 8."

- Before your first working set of it, the next set is the session's target.
- It goes one of the lift's own steps up, once a session, after two reps past
  the target at its weight, or a set you rated way too easy.
- The same weight after a set to failure, a set you rated too hard, or reps
  down a quarter. Nothing heavier on that lift for the rest of the day.
- One step down, to a weight you have lifted, when your reps fall under your
  range.
- Otherwise, the same again.

Every figure is a quote of a set you logged or a `coach-prog.js` target. With
**Weight and rep targets** off, or on a lift Coach cannot target, there is no
number. The one line under a finished exercise never carries one.

**How was it?** (v54). Under the next set: "Set 3 · 185 lb × 8. How was it?"
and three chips, **Way too easy**, **About right** and **Too hard**. They rate
the last working set you ticked on the exercise in hand, and tapping the chosen chip
again clears it. Coach answers warm first ("Strong set. Next one: 195 lb × 8.")
and offers **Use it for my next set**, which puts that number in grey on your
next set. It never types into a box, and nothing is applied without the tap.
The rating is saved on the set (`rir`, see AGENTS.md), and next session's
target reads it (see *Targets*).

On a hand-added exercise, the grey numbers are **last time's**, from the
session the "Last ·" line quotes: set by set, and last time's final set again
past the end. Coach's number reaches a row only through *Use it*.

When a tick finishes an exercise, the answer can appear once as a single line
under it, in the slot the swipe hint uses — nothing pops up, no row moves, and
the rest timer is untouched. It never appears twice for the same exercise, and
never over an edit of a past session. A basic account sees none of it, and
Settings → Coach → **In the gym** switches the chip and the line off.
`coach-live.js` decides; `tools-check/coach-live.mjs`, `coach-surface.mjs` and
`effort.mjs` are its fences.

### Rest, readiness and the bad day

On Pro, *What should I train today?* picks what has recovered. Each muscle
group has its own recovery time: the quick end of your gaps between training
it, and longer after a day that was big against your own normal. Only
lifting sets count toward it, so a treadmill walk is not a leg day. Until a
group has four training days, Coach uses a labelled starting point of two days.
When nothing you usually train has recovered, it says *Today looks like a rest
day*. When two signs line up (a streak past your usual longest run, more sets
or failures than your usual, lifts coming down), it says *go lighter*, with the
numbers. It then says how often you rested on mornings like this across the
last twelve weeks, and how your sessions went when you didn't. Coach only
reports that; it changes nothing on its own.

**Rest is advice, never a lock.** Every rest answer offers *Train anyway*.
*Make me a workout* on a group that has not recovered shows the reason first,
with *Build … anyway* and *Train something recovered*.

**Should I rest or go lighter?** is readiness: a list of what in your log is
off your own normal today (recovery, your run of days, sets, failures, your
lifts, your weight, the time, and your food when Food is on). It never gives a
score, and it stays silent with fewer than three things to read.

**How did today compare?** lists what was *different* about the session, in
both directions, and says "These are differences, not causes." When a session
came in below your usual it asks *Anything Coach can’t see?*. Your answer is a
**mark** on that one session, kept six months. A marked session still counts
for when and how much you trained, but never against your numbers: the next
target is the one from before it. *Clear the mark* takes it back. Settings →
Coach → **Rest and lighter weeks** switches off the rest answers and the
caution, and **Readiness** switches off the list. The mark's question goes
quiet with **Questions**.

### Am I fueled?

On Pro with Food on, a bubble on Train's sheet. It reads today's food log
against what you usually have by this hour on a training day ("Lighter than
usual so far today", with both numbers). For somebody who logs in one go later
in the day, it reads the day's totals instead, and asks once which you do. A
half-logged day is *not fully logged*, never low. A day it could not read is
left out, never guessed. It never says what or how much to eat, and never
names a food. "I ate, it’s not logged" and "I haven’t eaten" are answers for
that moment only, and nothing is saved. The food days are read when you ask,
never when the card draws.

### The whole week

On Pro, two bubbles on Train's sheet, under **More** (v54, `coach-volume.js`).
Each is a sheet answer only: never the card, never the live sheet.

**How's my weekly volume?** One line per muscle group, your focus group first.
A hard set is a working set with reps, with cardio out and an obvious warm-up
you forgot to mark out. A set counts whole for its main group and half for each
group it works second.

- Each line: the hard sets in the last 7 days, against a common range for your
  goal. Building muscle is 10–20, strength 6–15 and staying consistent 6–12. A
  cut is two thirds of your usual from before it. Your focus group's range is
  up 30%.
- Then one flag:
  - **too little**: under the range and under 70% of your own usual, two weeks
    running, or on your focus group, four weeks under its range;
  - **more than your usual**: 1.3 times it, with a sign of fatigue in the log
    (sets to failure, or reps falling away). Volume alone is never "too much";
  - **about right**.
- Core is a number only.
- Once in four weeks, it names a group that has gone quiet against the others.

**Is my training balanced?** Over eight weeks, as counts:

- pushing against pulling, past two to one;
- presses flat against overhead, and rows against pulldowns, when one side is
  at zero;
- squats and lunges against hinges and bridges, past three to one.

Or "Nothing lopsided in the last 8 weeks.", with the counts. Custom exercises
are left out, and it says so.

Under three weeks of log, both say so and guess nothing. Neither ever gives a
reason about your body: no health, no posture, no injury. Counts only.

### Patterns in your data

**Off until you switch it on** (Settings → Coach), the reverse of every other
switch. Eleven comparisons, chosen in advance, each setting two groups of your
own days or sessions over the last 26 weeks side by side — the median or the
share on each side, and how many are in each — and only when there are eight or
more on both sides:

1. your top quarter of sessions by estimated max, and how many had food logged
   before you started, against the rest
2. working sets the day after you reached your protein target, against not
3. calories on days you trained, against rest days
4. your weekly weight change in weeks of three or more sessions, against fewer
5. your most-logged lift's top-set estimated max, morning against later
6. the same, three or fewer days since that group, against five or more
7. steps on days you trained, against rest days
8. the same estimated max after a day above your median calories, against below
9. your energy rating after a session (v53, from the recap's *How did that
   feel?*), on sessions with food logged before them, against none before
10. the same energy, with your median calories or more logged before a session,
    against less
11. the same energy, when your last logged food was your median hours or fewer
    before a session, against longer — only if you log food as you go

The last three are Micah's decision of 24 Sep 2026. They read the food logged
on your rated sessions' own days, and only with Patterns on.

They are readouts. Two groups that differ say nothing about why, and no
sentence says one thing helps, causes or leads to another. There is no search
for whatever happens to differ — that would find something every time.
`tools-check/coach-patterns.mjs` is the fence.

### Three states it will not be talked out of

```
the log could not be read  -> it says so, and nothing else answers at all
the log is empty           -> it says what it needs, with no placeholder number
a session is running       -> it points at Train and waits
```

The first of those is why `coach-data.js` reads `workouts` with `readExact()`
rather than through `analytics.allSessions()`: that path resolves to `[]` when
the read FAILS, so an unreadable log and a brand-new account come back as the
same answer, and one of the two cards would be a lie.

### Where its settings live

`settings/coach`, a small object written whole — **not** a new top-level node
under `users/{uid}`, which has no grant in the published rules and would fail
silently. It needs no rules change: `settings` carries a section-level `.write`
and the `$other` deny is nested inside `units`, not on `settings` itself. See
AGENTS.md. Switches are stored as `mute` (absent means on); Patterns alone is
stored as `on`, where absent means off. The bad-day marks (v52) live there too,
as `marks`, each one pruned after six months.

The one thing that is **not** there is the rotating greeting: the counter behind
it and the last few lines it used live on the device, because that value is
written as the app opens and the app is routinely closed a second later — which
is exactly when an async database write does not land. Getting it wrong costs a
repeated greeting and never a wrong number, which is what makes the device an
honest place to keep it.

---

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
  in the log. Ticking a set is the one thing that takes the target — "I did what it says":
  an empty box is filled from it as the set is ticked, a box you typed in never is, and a
  ticked set that still has no reps is named at Finish rather than dropped without a word.
  A lifting block's own check box does the same for every set in the block. Finishing any workout offers **Save as routine**, which is usually the fastest
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
| **Describe** | Type what you ate. Cheaper than a photo, and often *more* accurate for something you cooked yourself, because a picture cannot see the oil that went in the pan. Name a brand or a chain and it looks the official numbers up rather than recalling them — slower and dearer, and the only way a menu item comes back right |
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
key lives in a Cloudflare Worker — its own private repo, `~/dev/rack-worker`,
never deployed from here — which verifies the caller's Firebase ID token, checks
it against a uid allowlist, applies per-minute and per-day rate limits — the
per-day ones raisable per account, and ceilinged in code — and enforces a hard
per-account monthly dollar cap before it will call Anthropic at all. Setup lives
with the Worker. The Worker URL in `ai-config.js` is an address, not a secret —
a stranger who finds it gets a 401.

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
- Barcode scan uses the native `BarcodeDetector` where it exists and falls back to ZXing (plain JS, fetched from jsDelivr by a `<script>` tag carrying `crossorigin="anonymous"`). Until v47 the tag had no `crossorigin`, so the request was no-cors, the response opaque with status 0, and the service worker's `status === 200` guard never stored it — the scanner never opened offline on an iPhone. As a CORS request (jsDelivr sends `access-control-allow-origin: *`) it is an ordinary 200 and is cached like any other file, from the first online Fuel visit after each ship: `warmScanner` loads it four seconds in, and a version bump empties it with the rest of the cache. Cross-origin, so it sits outside the same-origin revalidation described under *Notes* — the URL pins a version and jsDelivr marks it immutable, so that costs nothing. The **lookup** after a scan is a separate request: it always goes to Open Food Facts first, even for a barcode already in the library, so offline it answers only for a product whose response the service worker cached on an earlier online scan; anything else falls to the manual entry sheet. `tools-check/scanner-offline.mjs`
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

- Tap **Set total** for the whole day's number, or `+500 / +1k / +2.5k` to nudge
  it. Any of the last 14 days is tappable to correct, swipe-left to clear.
- **The step-automation walkthrough is gone** (v40). It talked somebody through
  putting their Rack email and password into a third-party automation app, and
  printed the Firebase sign-in endpoint beside a Copy button. A password typed
  into MacroDroid is a password in MacroDroid, and no wording around it makes
  that something this app should be teaching.
- Days already pushed in that way still render, and still read *from your
  phone*: `steps/{date}` is unchanged, `src` is still `manual` / `shortcut` /
  `hae` / `agent`, and every reader of it stayed. Anyone who has an automation
  set up keeps it working. The REST door is Firebase's and is still open — the
  app just no longer hands out the instructions.
- Neither platform lets any app read health data while the phone is locked, so
  a pushed count lands on the next unlock. That is Apple and Google's rule, not
  a limitation of any particular approach.
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
- The public API lives in `tdee.js` because Fuel's calorie bar and the You tab's goal
  card need the same number, and three copies of it is how three screens start
  disagreeing. `weightmodel.js` holds the math.

---

## Units — pounds or kilos

One control, in the **You** section of settings: *Imperial* or *Metric*. Metric
means kilograms **and** centimetres together; setup asks before it asks for your
height or your weight, because both of those are asked in the unit you picked.

**Every number in the app that is a weight obeys it** — what you weigh, your
goal weight, what is on the bar, volume totals, e1RM, personal records, the
trend rate, the swing, the "3,500 kcal a pound" sentences, your height, and the
grams-per-pound macro targets, which a metric account reads as grams per kilo.
Switching re-renders everything already logged, records included; nothing needs
a reload and nothing is migrated.

**Pounds and inches stay the single stored unit, forever.** `settings/units` is
display and input only: the typed number is converted on the way in and the
stored number is converted on the way out, in the expression that reads the box
or builds the string, and nowhere else. `units.js` is the whole of it — pure, no
imports, every function takes the unit as an argument so the native port copies
it across verbatim.

Why not store both: 219 sessions predate the question and carry no unit tag, so
there is no honest migration; `computeVolume`, `detectPRs` and
`sessionMilestones` do arithmetic *across* that history; and the native client
has to agree byte for byte. Mixed-unit storage makes every consumer unit-aware
and makes the mixing permanent.

The cost is round-trip rounding — 100 kg stores as 220.5 lb and renders back as
100.0 — and at one decimal of display it is invisible.

Three things deliberately left in pounds, and labelled:

- **Per-side plate math.** Those are the plates on an American rack. A gym
  stocked in kilos has a different set on a 20 kg bar, not these six relabelled,
  so the strip says "Per side · lb plates" on a metric account and keeps working.
- **The workout importer.** Its file is already in Rack's storage format, so its
  weights are read as pounds and shown in your unit. The screen says so.
- **The half-an-ounce-per-pound water rule**, which is an imperial rule of thumb
  with no metric form. The bodyweight it is quoted against converts.

Water keeps its own unit and its own presets — setup defaults it to millilitres
for somebody who picks metric, and changing units afterwards never touches it.

---

## Notes

- Flat file layout — GitHub Pages serves it directly from the repo root.
- Timers are timestamp-based, so iOS background throttling doesn't cause drift.
- Writes queue in `localStorage` when offline and flush on reconnect.
- Service worker is network-first with cache fallback, and for our own files the network
  leg revalidates. A plain `fetch()` inside the worker is answered out of the browser's own
  HTTP cache, and Pages holds these assets about ten minutes, so for the first minutes after
  every ship the worker faithfully re-cached the build before this one — while `sw.js` itself,
  the one script browsers always revalidate, reported the new version. Navigations stay on a
  plain fetch deliberately, which leaves `index.html` alone up to ten minutes stale after a
  ship; every module it loads is fresh. If the revalidating leg fails it retries plainly before
  the cache leg, because a conditional request needs the network and the launch right after a
  bump is exactly when Cache Storage is empty — without the retry that launch is a blank app
  offline. Bumping the cache name does not force-evict anything
  online — once the network answers, the cached copy is only reachable through the offline
  `.catch()` — it renames the build and drops the offline copy of the last one. It bypasses
  `*.workers.dev` the same way it bypasses Firebase — an estimate must never come out of a
  cache. `usage.js` holds the same string a second time, because a service worker is not a
  module the app can import and the version is what each account reports as its own; move
  the two together.
- If a deploy looks stuck, edit `.nojekyll` (bump the "redeploy N") and push — that forces
  GitHub Pages to rebuild.
