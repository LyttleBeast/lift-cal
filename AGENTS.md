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

`rack.mjs` does the token dance, generates ids in the app's format, and
keeps the derived rollups correct. Prefer it.

```bash
node rack.mjs today
node rack.mjs food list 2026-08-19
node rack.mjs food add '{"name":"Chicken and rice","qty":"1 bowl","cal":650,"p":52,"c":78,"f":12,"meal":"lunch"}'
node rack.mjs food add '{"items":[…]}' --date=2026-08-18
node rack.mjs food rm 2026-08-19 f1a2b3c
node rack.mjs weigh 214.6
node rack.mjs workouts 2026-08
node rack.mjs get food/items
node rack.mjs patch <path> '<json>'
node rack.mjs del <path>
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

**Then update the rollup** (`rack.mjs` does this for you):

## `food/daySummaries/{YYYY-MM-DD}` → `{ cal, p, c, f }`

Integer sums of that day's log. The maintenance estimate reads this, not the
raw log, so a day whose summary is stale gets weighted wrong. Recompute and
`PUT` it after any change to `food/log/{date}`.

## `food/targets` → `{ cal, p, f, maint, auto }`

Daily goals. Carbs are the remainder: `(cal − p×4 − f×9) / 4`, never stored.
`maint` is the maintenance-calorie number that anchors the cut / maintain / gain
marks on the calorie bar — `null` means "estimate it from the weight trend".

`cal`, `p` and `f` are **always** the live numbers, whether they were typed in
or computed. Nothing downstream needs to know which.

```json
{ "cal": 2300, "p": 210, "f": 74, "maint": null,
  "auto": { "on": true, "rateWk": -1, "pPerLb": 1.0, "fPerLb": 0.35,
            "floor": 0, "lastAdj": 1756000000000 } }
```

`auto.on` means the app recomputes `cal` / `p` / `f` itself: protein and fat as
grams per pound of **trend** weight (not the last weigh-in), calories as the
maintenance estimate shifted by `rateWk × 500`. It moves at most once every 7
days and at most 100 kcal at a time.

**If you are writing targets while `auto.on` is true, set `auto.on` to false in
the same PATCH**, or the app will overwrite your numbers the next time the
weigh-ins move.

`floor` of 0 means "work it out": protein and fat plus 100 g of carbs. That
floor is load-bearing — carbs are the remainder and `carbsTarget()` clamps at
zero, so calories dropping below `p×4 + f×9` would silently produce a zero-carb
target rather than an error.

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

**`t` is not decoration.** The maintenance estimate normalises every weigh-in
back to a fasted-morning equivalent before it fits a trend, using the food and
water logged before that moment to work out how much of the reading is
breakfast. A weigh-in stamped with the wrong time is worse than a missing one:
it gets corrected by the wrong amount and then counted with confidence. If you
are back-filling a weigh-in, stamp it with when he actually stood on the scale.

Two weigh-ins on the same day are what let the model learn his personal
coefficients at all — the pair cancels the unknown true weight between them —
so several readings a day is a feature, not noise.

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

## `water/log/{YYYY-MM-DD}` → `{ entryId: entry }`

One node per calendar day, same shape as the food log. Ids are `wa` + base36
timestamp + 3 random chars.

```json
{ "wam3k9x2ab": { "ml": 500, "t": 1755600000000, "src": "preset" } }
```

| field | |
|---|---|
| `ml` | **millilitres, always.** The display unit is a setting; the log is never in it |
| `t` | ms epoch — the weight model uses this, so a plausible time matters |
| `src` | `preset` \| `manual` \| `agent` |

There is **no rollup node** for water and there should not be one. Sum the day
on read. `food/daySummaries` exists because the TDEE math needed it; house rule
3 exists because that rollup goes stale. One of those is enough.

To log: `PATCH water/log/{date}` with `{ "<newId>": { … } }`. 16.9 fl oz — the
supermarket flat-of-40 bottle — is 500 ml. A US gallon is 3785 ml.

## `settings/water` → `{ goalMl, unit, presets }`

```json
{ "goalMl": 3785, "unit": "floz",
  "presets": [ { "label": "Bottle", "ml": 500 } ] }
```

`unit` ∈ `floz` | `ml` | `L` | `cup`, display only. `presets` null means the
standard sizes; the first entry is the big button on the card.

## `routines/{routineId}` → one pre-planned workout

```json
{
  "id": "rm3k9x2",
  "name": "Push A",
  "note": "heavy bench, back off on incline",
  "exercises": [
    { "exId": "bench-press", "name": "Barbell Bench Press",
      "group": "chest", "equipment": "barbell",
      "sets": [ { "tw": 225, "tr": 5, "type": "N" } ] }
  ],
  "created": 1756000000000, "lastUsed": 1756400000000, "uses": 6
}
```

`tw` / `tr` are **target** weight and reps, both optional — a routine that says
"three sets of bench, figure out the weight there" is a legitimate routine.
They are deliberately not `w` / `r`: starting a routine puts them in as
placeholder text, never as pre-filled values, so a number you forgot to change
can't end up in the log as a number you lifted.

`groups` is not stored. Derive it from the exercises, the way sessions do.

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
