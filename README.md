# Rack

Personal training, nutrition and body weight log. Phone-first, installs to the iPhone home screen, works offline.

Live at **https://lyttlebeast.github.io/lift-cal/**

- **Train** — full workout tracker: plate-colored calendar, session timer, W/F/D set tags, 231-exercise library, last-time numbers, rest timer, per-side plate math, e1RM, swipe-to-delete sets, editable history, a post-workout recap with personal records, and a full statistics page.
- **Fuel** — nutrition: macro targets, saved-food library, barcode scanning via Open Food Facts, manual entry, saved meals, one-tap portion multiplying, micronutrient floors, Claude import.
- **Weight** — body-weight log: 7-day moving average chart, weekly rate, time-of-day breakdown, maintenance (TDEE) estimate.

---

## Backend

Firebase project **Lift-Cal** (`lift-cal`), Realtime Database in `us-central1`, Spark (free) plan.
Analytics, Gemini, and the Google Developer Program are all disabled.

Sign-in is Email/Password. Sign-up is not enabled anywhere, so no other account can be
created from inside the app.

### Published security rules

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read":  "$uid === auth.uid || $uid === 'aXSDfnZK8IMT9wRVhBbEgkDHpsj2'",
        ".write": "$uid === auth.uid || ($uid === 'aXSDfnZK8IMT9wRVhBbEgkDHpsj2' && auth.uid === 'HWwNbi0JPRbtTw0ODHxyq989UJj2')"
      }
    },
    "feed": {
      "wH7lqHV7y15z4EMq9T2UZi": {
        ".read":  true,
        ".write": "auth.uid === 'aXSDfnZK8IMT9wRVhBbEgkDHpsj2'"
      }
    },
    ".read": false,
    ".write": false
  }
}
```

- `users/{uid}` — every account reads and writes its own subtree, as before.
- `users/aXSD…` — this install's data, and the two extra clauses. Read is open
  to the world **on purpose** (see *Claude link* below). Write adds exactly one
  account: the agent, and only against this one subtree.
- `feed/wH7l…` — summary snapshot. World-readable, owner-write-only.
- Root defaults are `false`, so nothing else in the database is reachable.

Public read is a deliberate trade: it makes every screen in this app readable
by an AI with one unauthenticated GET, and the data is a list of what one
person ate and lifted. Write is *not* public — it needs one of two accounts.

### The agent account

`agent@lift-cal.app`, UID `HWwNbi0JPRbtTw0ODHxyq989UJj2` — one extra
Email/Password user, created in the console (sign-up is off in the app, so that
is the only way an account comes into existence). It exists so Claude can log a
food or a weigh-in without a paste-JSON round trip.

Its password lives wherever the writing happens, as `RACK_AGENT_EMAIL` /
`RACK_AGENT_PASSWORD` — an environment, never this repo.

To make another one: Authentication → Users → **Add user**, then add its UID to
the `.write` clause above and republish.

To revoke: delete the user in the console, or drop the `|| auth.uid === …`
clause and republish. Nothing else changes.

The `firebaseConfig` values in `firebase-config.js` are public by design. They identify the
project; they authorize nothing. Security lives entirely in the rules above.

**Everything is per-account.** Workouts, weight, food logs, the saved-food library, saved
meals and macro targets all live under `users/{uid}/`. A second signed-in account writes to
its own subtree and sees none of this one's.
The only thing that used to cross accounts was the hard-coded starter foods (the work pizza
crusts, the wings, the whey); those are now seeded only for `OWNER_UID`.

---

## Files

| File | What it is |
|---|---|
| `index.html` | The only markup: auth gate, three empty views, bottom dock |
| `app.js` | Shell — sign-in, boot order, tab router, service worker |
| `store.js` | Data layer — Firebase + localStorage mirror + offline queue + feed |
| `firebase-config.js` | Public project keys, feed token, owner UID |
| `ui.js` | Shared primitives — sheets, toasts, confirms, swipe, date/number helpers |
| `analytics.js` | Training aggregates, personal-record detection, SVG chart builders |
| `stats.js` | The statistics page |
| `workout.js` | Train tab — calendar, live session, editing, post-workout recap |
| `food.js` | Fuel tab |
| `weight.js` | Weight tab and app settings |
| `tdee.js` | Shared weight-trend + maintenance math, used by Weight and Fuel |
| `exercises.js` | Static 231-exercise library |
| `importer.js` | One-time Liftoff history migration |
| `rack.css` | The stylesheet |
| `404.html` | Branded not-found page |
| `sw.js` | Service worker, network-first, cache `rack-v4` |
| `AGENTS.md` | The database schema and REST recipes, written for Claude |
| `tools/rack.mjs` | CLI over the same endpoints — read, log, edit, delete |
| `app.css` | **Dead file** — the abandoned "IRONLOG" design, not referenced anywhere |

Import direction is strictly one-way, no cycles:

```
app.js → workout.js → stats.js → analytics.js → ui.js
      → food.js   ────────────→ tdee.js ────→ ui.js
      → weight.js → importer.js ────────────→ ui.js
                  → tdee.js
                  → workout.js (hasActiveSession only)
```

---

## Claude link

The whole tree is one unauthenticated GET:

```
https://lift-cal-default-rtdb.firebaseio.com/users/aXSDfnZK8IMT9wRVhBbEgkDHpsj2.json
```

Narrower is usually better — `…/food/log/2026-08-19.json`, `…/weight/entries.json`,
`…/workouts/2026-08.json`. **[AGENTS.md](AGENTS.md) is the map**: every path, every
field, and the REST calls to add, edit and delete. `tools/rack.mjs` wraps the same
endpoints so an agent doesn’t have to hand-roll tokens or ids:

```bash
node tools/rack.mjs today
node tools/rack.mjs food add '{"name":"Chicken and rice","cal":650,"p":52,"c":78,"f":12,"meal":"lunch"}'
node tools/rack.mjs weigh 214.6
```

The app keeps live listeners on the day’s food log, the month of workouts and the
weigh-in list, so an outside write lands on the phone in about a second, and the
whole-node writes the app makes can never overwrite it from a stale cache.

There is still a small summary feed at

```
https://lift-cal-default-rtdb.firebaseio.com/feed/wH7lqHV7y15z4EMq9T2UZi.json
```

carrying the last 3 sessions, today’s macros against target, and the latest
weigh-in. It predates the public read and is kept because it is cheap to fetch.

## Claude food import

Still there, and still the offline path — both routes end in a confirmation card,
nothing logs without a tap on **Log it**.

1. **Link** — `https://lyttlebeast.github.io/lift-cal/#log=BASE64URL_JSON`
2. **Paste** — Fuel → ⚙ → Paste food JSON

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
- Records are **derived from the log**, never stored. There is no `records` node in the
  database; every statistic is computed from the workouts themselves.

## Fuel details

- Targets default 2,700 kcal / 215 g protein / 80 g fat; **carbs are the remainder**.
  Targets, maintenance and the JSON paste box live behind the ⚙ in the Fuel header.
- **The calorie bar** is the one that matters, so it's the big one. Two ticks cut it into
  three bands: left of the first is a deficit, between them is holding, right of the second
  you're gaining — and the fill takes the colour of the band you're standing in. The ticks sit
  a collar of ~8% either side of maintenance (call it 200 kcal, under half a pound a week),
  anchored on your number from ⚙ if you've set one, otherwise the estimate off your weight
  trend. With neither, the bar falls back to plain progress against target and says so. A
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

## Weight details

- Dots are raw weigh-ins; the yellow line is the trailing 7-day average of daily means.
- Weekly rate = this week's average minus last week's.
- TDEE ≈ average logged intake corrected by the scale trend (needs 7+ logged food days and
  two weeks of weigh-ins). The arithmetic lives in `tdee.js` because Fuel's calorie bar needs
  the same number, and two copies of it is how two screens start disagreeing.

---

## Notes

- Flat file layout — GitHub Pages serves it directly from the repo root.
- Timers are timestamp-based, so iOS background throttling doesn't cause drift.
- Writes queue in `localStorage` when offline and flush on reconnect.
- Service worker is network-first with cache fallback (`rack-v3`). Bump the cache name in
  `sw.js` when you need to force-evict old assets.
- If a deploy looks stuck, edit `.nojekyll` (bump the "redeploy N") and push — that forces
  GitHub Pages to rebuild.
