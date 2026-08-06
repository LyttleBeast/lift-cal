# Rack

Personal training, nutrition and body weight log. Phone-first, installs to the iPhone home screen, works offline.

Live at **https://lyttlebeast.github.io/lift-cal/**

- **Train** — full workout tracker: plate-colored calendar, session timer, W/F/D set tags, 232-exercise library, last-time numbers, rest timer, per-side plate math, e1RM.
- **Fuel** — nutrition: macro targets, saved-food library, barcode scanning via Open Food Facts, manual entry, saved meals, copy-yesterday, micronutrient floors, Claude import.
- **Weight** — body-weight log: 7-day moving average chart, weekly rate, time-of-day breakdown, maintenance (TDEE) estimate.

---

## Backend

Firebase project **Lift-Cal** (`lift-cal`), Realtime Database in `us-central1`, Spark (free) plan.
Analytics, Gemini, and the Google Developer Program are all disabled.

Sign-in is Email/Password with exactly one account. Sign-up is not enabled anywhere, so no
other account can ever be created.

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

---

## Claude link

```
https://lift-cal-default-rtdb.firebaseio.com/feed/wH7lqHV7y15z4EMq9T2UZi.json
```

The feed now carries three sections, each updated as its data changes:

- `workouts` — last 3 finished sessions with top sets
- `nutrition` — the day's kcal + macros vs targets, and every item logged
- `weight` — latest weigh-in, 7-day average, lb/week rate

Read-only for the world; writable only by the owner account. To revoke, change `FEED_TOKEN`
in `firebase-config.js` and update the rules to match.

## Claude food import

Claude can hand food to the app two ways; both end in an in-app confirmation card — nothing
logs without a tap on **Log it**.

1. **Link** — `https://lyttlebeast.github.io/lift-cal/#log=BASE64URL_JSON`
2. **Paste** — Fuel → Import → paste the JSON

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

## Fuel details

- Targets default 2,700 kcal / 215 g protein / 80 g fat; **carbs are the remainder**. Edit under Targets.
- Barcode scan uses the native `BarcodeDetector` where it exists and falls back to ZXing (WASM)
  on iOS Safari. Lookups hit Open Food Facts; misses drop into manual entry.
- Pre-seeded foods: Body Fortress scoop (44 g), work pizza crusts S–XL (dough only), wings per oz.
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
- Service worker is network-first with cache fallback (`rack-v2`).
