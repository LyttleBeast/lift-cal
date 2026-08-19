# Rack — for Claude (and any other agent)

Everything the app knows lives in one Firebase Realtime Database tree. It is
readable by anyone, writable by two accounts: Micah's, and an agent account.
So you can read the training log, the food log and the weigh-ins directly, and —
once the agent credentials are in your environment — log, edit and delete
without going anywhere near the paste-JSON flow.

The app keeps live listeners on the day's food log, the month of workouts and
the weigh-in list, so anything you write shows up on his phone within a second,
no refresh.

```
BASE = https://lift-cal-default-rtdb.firebaseio.com
ROOT = users/aXSDfnZK8IMT9wRVhBbEgkDHpsj2
```

Everything below is a path under `ROOT`. Append `.json` to any of them to get a
REST URL: `$BASE/$ROOT/food/log/2026-08-19.json`.

## Reading — no credentials at all

```bash
BASE=https://lift-cal-default-rtdb.firebaseio.com
ROOT=users/aXSDfnZK8IMT9wRVhBbEgkDHpsj2

curl -s "$BASE/$ROOT/food/log/2026-08-19.json"     # one day of food
curl -s "$BASE/$ROOT/food/targets.json"            # calorie + macro targets
curl -s "$BASE/$ROOT/weight/entries.json"          # every weigh-in
curl -s "$BASE/$ROOT/workouts/2026-08.json"        # one month of training
curl -s "$BASE/$ROOT.json?shallow=true"            # what top-level nodes exist
```

`curl -s "$BASE/$ROOT.json"` is the whole thing in one response — every workout
since the beginning, every food, every weigh-in. It is a few megabytes. Prefer a
narrower path unless you actually want all of it.

## Writing — needs the agent account

Two environment variables carry the credentials. They are never committed:

```bash
export RACK_AGENT_EMAIL='…'
export RACK_AGENT_PASSWORD='…'
```

Trade them for a one-hour ID token, then hang `?auth=$TOKEN` off any write:

```bash
TOKEN=$(curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBzDbv7fNVWFDw2Wdfgshyts3y8q61voS8" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$RACK_AGENT_EMAIL\",\"password\":\"$RACK_AGENT_PASSWORD\",\"returnSecureToken\":true}" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["idToken"])')
```

- `PATCH` merges keys into a node — use it to **add** without disturbing what is
  already there.
- `PUT` replaces a node outright — only for nodes you mean to overwrite whole.
- `DELETE` removes a node.

**Never `PUT` a container node** (`food/log/{date}`, `weight/entries`,
`workouts/{month}`). You will erase everything else inside it. `PATCH` the
container, or `PUT` the individual child.

## Use the helper instead

`tools/rack.mjs` does the token dance, generates ids in the app's format, and
keeps the derived rollups correct. Prefer it.

```bash
node tools/rack.mjs today
node tools/rack.mjs food list 2026-08-19
node tools/rack.mjs food add '{"name":"Chicken and rice","qty":"1 bowl","cal":650,"p":52,"c":78,"f":12,"meal":"lunch"}'
node tools/rack.mjs food add '{"items":[…]}' --date=2026-08-18
node tools/rack.mjs food rm 2026-08-19 f1a2b3c
node tools/rack.mjs weigh 214.6
node tools/rack.mjs workouts 2026-08
node tools/rack.mjs get food/items
node tools/rack.mjs patch <path> '<json>'
node tools/rack.mjs del <path>
```

---

# The schema

## `food/log/{YYYY-MM-DD}` → `{ entryId: entry }`

One node per calendar day. Entry ids look like `f` + base36 timestamp + 3 random
chars; any unique string works, but keep the `f` prefix.

```json
{
  "fm3k9x2ab": {
    "id":   "fm3k9x2ab",
    "t":    1755600000000,
    "name": "Chicken and rice",
    "qty":  "1 bowl",
    "cal":  650,
    "p":    52,
    "c":    78,
    "f":    12,
    "meal": "lunch",
    "src":  "agent",
    "micro": { "fiber": 4, "sugar": 2, "satfat": 3,
               "sodium": 900, "potassium": 800, "cholesterol": 150 }
  }
}
```

| field | |
|---|---|
| `id` | must equal the key |
| `t` | ms epoch, orders the entry within its meal |
| `name` | required |
| `qty` | free text — "1 bowl", "150 g", "2 × scoop (88 g)" |
| `cal` `p` `c` `f` | kcal and grams, for the amount actually eaten |
| `meal` | `breakfast` \| `lunch` \| `dinner` \| `snack` |
| `src` | provenance — use `agent` |
| `micro` | optional, any subset of the six keys above |
| `itemId` `amt` `unit` | only on entries linked to the saved-food library — leave off |

To log a food: `PATCH food/log/{date}` with `{ "<newId>": { … } }`.
To remove one: `DELETE food/log/{date}/{entryId}`.
To correct one: `PATCH food/log/{date}/{entryId}` with just the changed fields.

**Then update the rollup** (`tools/rack.mjs` does this for you):

## `food/daySummaries/{YYYY-MM-DD}` → `{ cal, p, c, f }`

Integer sums of that day's log. The maintenance estimate reads this, not the
raw log, so a day whose summary is stale gets weighted wrong. Recompute and
`PUT` it after any change to `food/log/{date}`.

## `food/targets` → `{ cal, p, f, maint }`

Daily goals. Carbs are the remainder: `(cal − p×4 − f×9) / 4`, never stored.
`maint` is the maintenance-calorie number that anchors the cut / maintain / gain
marks on the calorie bar — `null` means "estimate it from the weight trend".

## `food/items` → `{ itemId: item }` — the saved-food library

```json
{ "u1a2b3": {
    "name": "Body Fortress whey (vanilla)", "brand": "Body Fortress",
    "base": "serv",
    "serv": { "label": "scoop", "grams": 44 },
    "n": { "cal": 180, "p": 30, "c": 7, "f": 3 },
    "micro": { "sugar": 3, "sodium": 190 },
    "uses": 12, "last": 1755600000000, "barcode": "0074312222221"
} }
```

`base` is `serv` (the `n` numbers are per serving) or `100g` (per 100 grams).
`serv.grams` is what lets the app convert between the two — include it when you
know it. Ids: `u` + base36 timestamp for hand-made items.

Only add to the library when he asks for a food he'll log repeatedly. A one-off
meal belongs in the day's log, not the library.

## `food/meals` → `{ mealId: { name, items: [ … ] } }`

Saved multi-item meals. `items` are entry-shaped objects without `id`/`t`.

## `weight/entries` → `{ id: { lb, t } }`

Flat list of every weigh-in, ids prefixed `wt`. `lb` is pounds to one decimal,
`t` is ms epoch — the time of day matters, the app breaks weigh-ins down by it.

`PATCH weight/entries` with `{ "wtNEW": { "lb": 214.6, "t": … } }` to add.
`DELETE weight/entries/{id}` to remove.

## `workouts/{YYYY-MM}/{DD}/{sessionId}` → one finished session

```json
{
  "id": "wm3k9x2",
  "name": "Push day",
  "startedAt": 1755590000000,
  "endedAt":   1755595400000,
  "durationSec": 5400,
  "volume": 41250,
  "groups": ["chest", "shoulders", "arms"],
  "exercises": [
    { "exId": "bench-press", "name": "Barbell Bench Press",
      "group": "chest", "equipment": "barbell",
      "sets": [ { "w": 135, "r": 10, "type": "W", "done": true },
                { "w": 225, "r": 5,  "type": "N", "done": true } ] }
  ]
}
```

Set `type`: `W` warm-up, `N` normal, `F` failure, `D` drop. Warm-ups are excluded
from volume, records and history. `volume` is the sum of `w × r` over non-warm-up
sets. `exId` must match an exercise in `exercises.js` or one in
`exercises/custom` — a mismatched id breaks the "last time" line.

Writing a workout by hand is the fiddliest thing here. Prefer letting the app
record it. If you must, also update:

- `history/{exId}` → `[ { date, sets: [ {w,r,type} ] }, … ]`, newest first, 20
  max — this is the per-exercise "last time" index.
- Personal records are **derived**, never stored. Don't look for a records node.

## `exercises/custom` → `[ { id, name, group, equipment }, … ]`

Exercises beyond the built-in 231 in `exercises.js`. `group` is one of
`chest` `back` `legs` `shoulders` `arms` `core`.

## `feed/wH7lqHV7y15z4EMq9T2UZi` (outside `ROOT`)

A small world-readable summary the app maintains — last three workouts, today's
nutrition, latest weight. Handy for a quick glance without pulling the tree.
The app writes it; you don't need to.

---

# House rules

1. **Confirm the numbers before you log them.** A guessed macro is worse than no
   entry — it silently poisons the maintenance estimate for two weeks.
2. **Log to today unless told otherwise**, and say which date you wrote to.
3. **Update `food/daySummaries/{date}`** after touching a day's food log.
4. **PATCH to add, DELETE to remove.** Never PUT a container.
5. **Don't invent library items or exercises** to make a log fit. Log the food
   as a plain entry; make a custom exercise only when he asks.
6. **Tell him what you wrote**, with the entry id, so it can be undone.

If a write returns `Permission denied`, the token expired (one hour) or the
credentials are missing. Re-run the sign-in step.

If a request is blocked by a network allowlist, the two hosts that need to be
reachable are `lift-cal-default-rtdb.firebaseio.com` and
`identitytoolkit.googleapis.com`.
