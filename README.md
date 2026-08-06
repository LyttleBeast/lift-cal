# Rack

Personal training, nutrition and body weight log. Phone-first, installs to the iPhone home screen, works offline.

Live at **https://lyttlebeast.github.io/lift-cal/**

- **Phase 1 (built):** app shell, dock, Firebase auth, offline layer, full workout tracker.
- **Phase 2:** nutrition — barcode scan, manual entry, macro targets, micronutrients, Claude deep-link logging.
- **Phase 3:** body weight — charts, 7-day moving average, weekly rate, time-of-day breakdown.

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

Paste it into a chat and Claude can read recent workouts — and later macros and weight trend —
without anything being typed out. **Copy Claude link** under the Weight tab copies it.

Read-only for the world; writable only by the owner account. To revoke, change `FEED_TOKEN`
in `firebase-config.js` and update the rules to match. The old link dies immediately.

---

## Workout tracker

**Calendar.** Each day shows a stack of colored bars, one per muscle group trained — red chest,
blue back, yellow legs, green shoulders, white arms, chrome core. IPF competition plate colors.
Untrained days show just the number. Tap a trained day to expand it.

**Set types.** Tap the set number to cycle: normal → **W** (warm-up) → **F** (to failure) →
**D** (drop set). Warm-ups are excluded from volume, e1RM, and weekly set counts.

**Last time.** Every exercise shows the previous session's numbers above the inputs.

**Plate math.** Barbell lifts at 45 lb+ show what goes on each side, colored by plate.

**Rest timer.** Auto-starts on set completion. Thin line across the top, red when over.
Audio cue at zero — iOS Safari has no vibration API, so there is no buzz.

**Screen stays on** during a session, and the session survives a lock, crash, or refresh.

---

## Notes

- Flat file layout — GitHub Pages serves it directly from the repo root.
- Timers are timestamp-based, so iOS background throttling doesn't cause drift.
- Writes queue in `localStorage` when offline and flush on reconnect.
- 232 exercises built in, each tagged to a muscle group. Add custom ones via **New** in the picker.
