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
        ".read":  "$uid === auth.uid",
        ".write": "$uid === auth.uid"
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

- `users/{uid}` — all real data. Read and write locked to the owner account.
- `feed/wH7l…` — summary snapshot. World-readable, owner-write-only.
- Root defaults are `false`, so nothing else in the database is reachable.

The `firebaseConfig` values in `firebase-config.js` are public by design. They identify the
project; they authorize nothing. Security lives entirely in the rules above.

**Everything is per-account.** Workouts, weight, food logs, the saved-food library, saved
meals and macro targets all live under `users/{uid}/`. A second account sees none of it.
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
| `exercises.js` | Static 231-exercise library |
| `importer.js` | One-time Liftoff history migration |
| `rack.css` | The stylesheet |
| `404.html` | Branded not-found page |
| `sw.js` | Service worker, network-first, cache `rack-v3` |
| `app.css` | **Dead file** — the abandoned "IRONLOG" design, not referenced anywhere |

Import direction is strictly one-way, no cycles:

```
app.js → workout.js → stats.js → analytics.js → ui.js
      → food.js   ──────────────────────────→ ui.js
      → weight.js → importer.js ────────────→ ui.js
                  → workout.js (hasActiveSession only)
```

---

## Claude link

```
https://lift-cal-default-rtdb.firebaseio.com/feed/wH7lqHV7y15z4EMq9T2UZi.json
```

The feed carries three sections, each updated as its data changes:

- `workouts` — last 3 finished sessions with top sets
- `nutrition` — the day's kcal + macros vs targets, and every item logged
- `weight` — latest weigh-in, 7-day average, lb/week rate

Read-only for the world; writable only by the owner account. To revoke, change `FEED_TOKEN`
in `firebase-config.js` and update the rules to match.

## Claude food import

Claude can hand food to the app two ways; both end in an in-app confirmation card — nothing
logs without a tap on **Log it**.

1. **Link** — `https://lyttlebeast.github.io/lift-cal/#log=BASE64URL_JSON`
2. **Paste** — Fuel → ⚙ → Import from Claude → paste the JSON

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

---

## Train details

- **Swipe any set left** to delete it. Works with touch and a mouse; vertical scrolling is
  unaffected because the row only claims horizontal gestures.
- **Tap a past day → Edit** to reopen a finished session. Weights, reps, set types,
  exercises, the name, the duration and even the date are all editable; Delete removes the
  whole session. Editing rebuilds the per-exercise history index from the log, so records
  can never go stale.
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
  Targets and the Claude importer live behind the ⚙ in the Fuel header.
- **Tap any logged food → ×2 / ×3 / ×4 / Half** to scale it, or *Log this again separately*
  to add a second helping as its own entry. Library-linked foods scale by portion so the
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
  two weeks of weigh-ins).

---

## Notes

- Flat file layout — GitHub Pages serves it directly from the repo root.
- Timers are timestamp-based, so iOS background throttling doesn't cause drift.
- Writes queue in `localStorage` when offline and flush on reconnect.
- Service worker is network-first with cache fallback (`rack-v3`). Bump the cache name in
  `sw.js` when you need to force-evict old assets.
- If a deploy looks stuck, edit `.nojekyll` (bump the "redeploy N") and push — that forces
  GitHub Pages to rebuild.
