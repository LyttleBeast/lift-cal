# Rack — the database, node by node

Everything the app knows lives in one Firebase Realtime Database tree.

**Nothing outside the app can read or write anybody's data.** That is new, and
it is the first thing to know if you have seen an older copy of this file. There
is no public read URL onto a log, no `feed/` node, and no agent account. (One
node is deliberately public by key, `aiAllow/{uid}`; it holds four small values
and no content, and the reason is below.) The REST recipes that
used to be here have been removed rather than corrected, because a half-working
recipe is worse than none.

What replaced them:

- Photograph or describe a meal **in the app**. That path goes out through the
  Cloudflare Worker with the phone's Firebase ID token, never through the
  database, and is unaffected by any of this.
- To get numbers in from a conversation, paste them: **Fuel → ⚙ → Paste food
  JSON** — the settings hub opens the same sheet under *Fuel* — or a `#log=`
  link. Format at the bottom of this file. Nothing is written until it is
  confirmed on screen.

This file is now a schema reference for working *on* the app.

```
BASE = https://lift-cal-default-rtdb.firebaseio.com
```

---

# Access — the part that decides everything else

Four trees at the root, and they do not overlap.

## `users/{uid}` — one account's data

Readable and writable by that uid alone, and only while
`access/approved/{uid}` exists. Not by the owner, not by an admin, not by an
unauthenticated GET. Everything in the schema section below hangs off here.

There is an owner's admin panel now, and it does not change that sentence. It
reads `access/*`, `aiAllow/{uid}` a uid at a time, and the `usage` counters —
there is no path from it into this subtree, and there is not meant to be one.

Write is granted per section, never at `users/{uid}` itself:

```
food  weight  workouts  history  water  steps  routines  exercises
settings  profile  onboarding
```

RTDB write rules only grant, and they always cascade downward — so a grant at
`users/{uid}` would make the whole subtree writable under any key at all, which
turns a fitness log into free file storage for anybody with an account. Granting
per section means an unrecognised key has no grant and the write fails. **If you
add a new top-level section, add it to the rules too, or it will silently fail
to save.**

## `access/*` — who is allowed in

```
access/approved/{uid}   { at, via: "invite"|"owner", code?, name?, email? }
access/invites/{CODE}   { at, note?, revoked?, usedBy?, usedAt? }
access/requests/{uid}   { at, name, email, note? }
```

`access/approved/{uid}` is the whole gate. Only the owner can write one — with
one exception, which is the invite flow:

An account with a valid code sends **one atomic multi-path update**:

```js
update(ref(db), {
  ['access/approved/' + uid]:            { at, via: 'invite', code, name, email },
  ['access/invites/' + code + '/usedBy']: uid,
  ['access/invites/' + code + '/usedAt']: Date.now()
});
```

The rules allow the approval only if, *before* the write, that code exists, is
unclaimed and is not revoked — and allow the used-stamp only if it is unset and
names the caller. Both paths pass or the whole update fails, so there is no
window where a code is spent without letting anyone in, or someone is let in
without spending the code.

`access/invites/{CODE}` is readable by any signed-in account that knows the
exact code, and the parent is not listable — the standard unguessable-child
pattern. Codes are ten characters from a 31-letter alphabet with no `0 O 1 I L`.

`access/requests/{uid}` is written by the account itself and read only by the
owner. Approving deletes the request and writes the approval in one update.

Removing somebody deletes `access/approved/{uid}` **and nothing else**. Their
data stays exactly where it is; adding them back restores all of it.

## `aiAllow/{uid}` — the AI estimator switch

```
aiAllow/{uid}  { on: bool, blocked?: bool,
                 photoPerDay?: number, textPerDay?: number }
```

Two booleans and two small integers, and nothing else. This one node is readable
**by key** without authentication, because the Cloudflare Worker has no Firebase
credentials and should not be given any — it does a plain GET on
`aiAllow/{uid}.json` and allows the call when `on === true && blocked !== true`.
The parent is not listable, and the value carries no personal data.

An approved account may set its own `on`; only the owner can set `blocked`, and
blocked wins. That split is what lets somebody who claimed an invite code get
the estimator immediately, while leaving the owner a switch they cannot flip
back.

`photoPerDay` and `textPerDay` are that account's daily allowance, and they are
owner-writable only. The reason the per-day limits were kept out of here still
stands — a client that can rewrite its own limit does not have one — so what
makes it safe is that the number is bounded twice and neither bound is in the
database's gift. The rules refuse anything above **12 photo or 30 describe**;
the Worker clamps whatever it reads to the same two ceilings again before it
uses it (`HARD_MAX` in `worker/src/index.js`), and treats a value it cannot read
as a number as no override at all, falling back to its configured default rather
than to zero. Absent means "use the Worker's default", which is 3 and 3. Zero is
a real value and it means none of that kind at all.

The count is not what protects the money; the monthly dollar cap in the Worker
is, and it is per account — the running spend lives in KV under `q:{uid}`, so
each person has their own. Raising an allowance without raising
`MONTHLY_USD_CAP` in `worker/wrangler.toml` only changes which refusal they get.

## `usage/{uid}` — counters, and nothing that is not a counter

```
usage/{uid}/who/firstSeen              ms epoch, write-once
usage/{uid}/who/lastSeen               ms epoch
usage/{uid}/who/platform               ios|android|mac|windows|linux|other
usage/{uid}/who/standalone             bool — installed to the home screen
usage/{uid}/who/version                'rack-v13' — the sw.js cache name
usage/{uid}/days/{YYYY-MM-DD}/{event}  a whole number
```

The owner wanted to know which features people actually use. He cannot learn
that from `users/{uid}` — that subtree is readable by its own account alone and
nothing about this widened it — so the answer is a second tree that holds no
content whatsoever. **Every value in it is a number, a boolean, one of six
platform tokens, or a version string of fixed shape**, and that is enforced by
the published rules rather than by good manners. There is no name and no email:
the owner already has both from `access/approved`, and a second copy would only
be a second thing to get wrong. There are no lifetime totals either — the admin
panel sums the days, so a total and its parts can never disagree.

Read: the account itself, and the owner, who can read the whole tree at once.
Write: the account itself, and only while `access/approved/{uid}` exists. **The
owner can write nobody's counters but his own** — there is no write grant for
him anywhere under `usage`, so he can read every number here and edit none of
them.

The write grant sits on `$day`, never on `usage/{uid}` or on `days`, for exactly
the reason the sections under `users/{uid}` are granted one at a time: a grant
cascades downward, and a grant on the container turns the subtree into free
storage. The `YYYY-MM-DD` shape is checked *in the write rule*, where `$day` is
in scope, so a junk key has no grant to begin with.

The event vocabulary is closed. It is exported as `EVENTS` from `usage.js`, it
is the list `admin.js` renders from, and anything not on it is dropped before it
can be written: opens and installs, one key per tab, five for the estimator
(photo, photo with a typed description, words alone, a cache hit that spent
nothing, and a failure), the ways food gets into the log, and one each for a
session started and finished, a set, a routine, a custom exercise, a weigh-in, a
water log and a step total. Keys match `^[a-zA-Z][a-zA-Z0-9]{0,23}$` and a
count is capped at 1,000,000, which is the ceiling the rules validate against.

**The numbers are approximate and have to be quoted that way.** There is no
`increment()`: counts live in a localStorage ledger namespaced by uid and are
flushed as absolute per-day values, which makes every write idempotent, so a
refused or half-sent flush costs a retry and nothing else. The price is that two
devices on the same day each write their own total and the later write wins;
init seeds today from `max(local, server)` so they converge instead of
sawtoothing. Read them as a shape, never as an audit — the admin panel says so
on screen and so should anything else that quotes them.

Retention is **120 days**. The account prunes its own history: the local ledger
forgets old day keys, and the same pass deletes the server's, because forgetting
a day locally is precisely what would otherwise guarantee the client never
touched that key again. A delete is a null and `.validate` is not evaluated for
a null, so the day rule permits it.

This module shipped before the rules that allow it were published, so for a
while every flush comes back permission-denied. Every failure is swallowed and
backed off — 1 minute, 5, 30, then 6 hours — the ledger is capped so a
permanently refused write cannot grow it without bound, and `window.__rackUsage`
is the one deliberate hatch, so "refused, or just not published yet?" is
answerable from the console instead of by guessing.

---

# The schema

Everything below is a path under `users/{uid}`.

## `profile` → `{ name, email, sex, heightIn, birthYear, createdAt, photo }`

Written by onboarding, and — since the settings hub — editable afterwards at
You → ⚙ → *Your details*. `sex` is `m` | `f` | `x` and feeds the Mifflin-St Jeor
starting estimate; nothing else reads it, and nothing recalculates when it
changes.

`photo` is the profile picture: a JPEG data URL, at most 24,000 characters,
and the rules check both the prefix and the length. There is no file storage
behind the app and this node is not one — the app shrinks the picture to a
144-pixel square before writing (settings.js `shrinkPhoto`), stepping the
quality and then the size down until it fits, so a full-size camera frame can
never reach the write. Tap the avatar on You, or You → ⚙ → *Your details*.

Two things to know before writing here. Setup that was skipped writes only
`{ name, createdAt }`, so every other key is legitimately absent and needs a
default rather than an empty box. And the node ends with
`"$other": { ".validate": false }` — spreading an old object forward carries any
stray key from an older version into the write and fails the whole thing, so
name the keys.

## `onboarding` → `{ done, at, version, skipped, tourDone }`

Why it is in the database and not localStorage: a new phone would otherwise
greet an existing account as a stranger. `done` gates the setup questions,
`tourDone` gates the walkthrough — five cards now, one per tab, You first — and
the walkthrough can be replayed from You → ⚙ → App → *Replay the walkthrough*.

`version` is written and never read. `onboardingState()` only ever tests `done`,
so raising `ONBOARDING_VERSION` re-runs nothing for anybody; it would only look
from the outside as though it had.

## `food/log/{YYYY-MM-DD}` → `{ entryId: entry }`

One node per calendar day. Entry ids are `f` + base36 timestamp + 3 random
chars.

```json
{
  "fm3k9x2ab": {
    "id":   "fm3k9x2ab",
    "t":    1755600000000,
    "name": "Chicken and rice",
    "qty":  "1 bowl",
    "cal":  650, "p": 52, "c": 78, "f": 12,
    "meal": "lunch",
    "src":  "manual",
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
| `src` | provenance — `manual`, `lib`, `barcode`, `meal`, `copy`, `repeat`, `claude` (pasted JSON), `ai-photo` and `ai-text` (the in-app estimator), `recall` (answered from `food/recall` without spending a request) |
| `micro` | optional, any subset of the six keys above |
| `itemId` `amt` `unit` | only on entries linked to the saved-food library |
| `baseN` `qtyBase` `mult` | portion bookkeeping for entries with no library item behind them: `baseN` is one portion's macros, `mult` what it was scaled by. If you rewrite `cal`/`p`/`c`/`f` on an existing entry, delete all three, or the next tap of a ×2 chip scales the numbers you replaced |

## `food/daySummaries/{YYYY-MM-DD}` → `{ cal, p, c, f }`

Integer sums of that day's log. The maintenance estimate reads this, not the raw
log, so a stale summary skews the TDEE number for two weeks. The app recomputes
it on every change to a day.

## `food/targets` → `{ cal, p, f, maint, auto }`

Daily goals. Carbs are the remainder: `(cal − p×4 − f×9) / 4`, never stored.
`maint` anchors the cut / maintain / gain marks on the calorie bar; `null` means
"estimate it from the weight trend". Onboarding writes a Mifflin-St Jeor number
here so day one is not a blank guess, and the measured estimate takes over on
its own once there are two weeks of real data.

```json
{ "cal": 2300, "p": 210, "f": 74, "maint": null,
  "auto": { "on": true, "rateWk": -1, "pPerLb": 1.0, "fPerLb": 0.35,
            "floor": 0, "lastAdj": 1756000000000 } }
```

`auto.on` means the app recomputes `cal` / `p` / `f` itself: protein and fat as
grams per pound of **trend** weight, calories as maintenance shifted by
`rateWk × 500`. At most once every 7 days, at most 100 kcal at a time.

`floor` of 0 means "work it out": protein and fat plus 100 g of carbs. That
floor is load-bearing — carbs are the remainder and `carbsTarget()` clamps at
zero, so calories below `p×4 + f×9` would silently produce a zero-carb target
rather than an error.

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

`base` is `serv` (the `n` numbers are per serving) or `100g`. `serv.grams` is
what lets the app convert between the two. Ids: `u` + base36 timestamp.

The half-dozen starter items are seeded **only** into the owner's account — they
are one person's reference values for a specific job's pizza dough, not a food
database. Everyone else starts empty and fills it from barcodes and estimates.

## `food/meals` → `{ mealId: { name, items, last } }`

A saved meal is an **ingredient list**, not a total — the builder reopens it and
each component can be re-portioned before it is logged. `items` are entry-shaped
objects without `id`/`t`.

## `food/recall` → `{ key: { q, kind, items, n, last } }`

The lookup cache in front of the AI estimator, so the same sentence is never
paid for twice. `key` is the question normalised (filler words dropped, number
words digitised) then slugged — that IS the deduplication. **Numbers in the key
are load-bearing**: "2 slices" and "3 slices" must never share a row. Capped at
400 rows; least-used and oldest go first. No image is ever stored.

## `weight/entries` → `{ id: { lb, t } }`

Flat list of every weigh-in, ids prefixed `wt`. `lb` is pounds to one decimal.

**`t` is not decoration.** The maintenance estimate normalises every weigh-in
back to a fasted-morning equivalent before fitting a trend, using the food and
water logged before that moment to work out how much of the reading is
breakfast. A weigh-in stamped with the wrong time is worse than a missing one.
Two weigh-ins on the same day are what let the model learn personal coefficients
at all — several readings a day is a feature, not noise.

## `workouts/{YYYY-MM}/{DD}/{sessionId}` → one finished session

```json
{
  "id": "wm3k9x2", "name": "Push day",
  "startedAt": 1755590000000, "endedAt": 1755595400000,
  "durationSec": 5400, "volume": 41250,
  "groups": ["chest", "shoulders", "arms"],
  "exercises": [
    { "exId": "barbell-bench-press", "name": "Barbell Bench Press",
      "group": "chest", "equipment": "barbell",
      "sets": [ { "w": 135, "r": 10, "type": "W", "done": true },
                { "w": 225, "r": 5,  "type": "N", "done": true } ] }
  ]
}
```

Set `type`: `W` warm-up, `N` normal, `F` failure, `D` drop. Warm-ups are excluded
from volume, records and history. `exId` must match an exercise in
`exercises.js` or one in `exercises/custom`. Personal records are **derived**,
never stored.

`history/{exId}` → `[ { date, sets: [ {w,r,type} ] }, … ]`, newest first, 20 max
— the per-exercise "last time" index.

## `water/log/{YYYY-MM-DD}` → `{ entryId: { ml, t, src } }`

Ids are `wa` + base36 timestamp + 3 random chars. `ml` is **millilitres,
always** — the display unit is a setting, the log never is. There is no rollup
node for water and there should not be one; sum the day on read.

## `settings/water` → `{ goalMl, unit, presets }`

`unit` ∈ `floz` | `ml` | `L` | `cup`, display only. `presets` null means the
standard sizes. Onboarding sets `goalMl` from bodyweight at half a fluid ounce
per pound, the same rule the settings screen suggests.

## `steps/{YYYY-MM-DD}` → `{ steps, mi, t, src }`

`steps` is the whole-day total as of `t`, not an increment. Steps are **not** an
input to the maintenance estimate and must not become one — that estimate is
empirical, reading intake against the real scale trend, so activity is already
inside it. A step term would count the same walking twice.

## `settings/steps` → `{ goal }`

## `routines/{routineId}` → one pre-planned workout

`tw` / `tr` are **target** weight and reps, both optional. They are deliberately
not `w` / `r`: starting a routine puts them in as placeholder text, never as
pre-filled values, so a number you forgot to change cannot end up in the log as
a number you lifted.

## The exercise library — three nodes

`exercises/custom` → `[ { id, name, group, equipment }, … ]`
`exercises/overrides` → `{ exId: { name, group, equipment } }` — a renamed or
refiled built-in. **The id never changes**, which is the whole point: history
and every logged set are keyed on it.
`exercises/hidden` → `[ exId, … ]` — built-ins taken out of the picker. Hidden
rather than deleted for the same reason; a missing id orphans history.

---

# Paste import format

Fuel → ⚙ → **Paste food JSON**, or a link of the form
`https://lyttlebeast.github.io/lift-cal/#log=BASE64URL_JSON`. Single item, an
array, or `{"items":[…]}`. Lands on **today**; nothing is written until **Log
it** is tapped.

```json
{
  "items": [
    { "name": "Chicken and rice", "qty": "1 bowl",
      "cal": 650, "p": 52, "c": 78, "f": 12, "meal": "lunch",
      "micro": { "fiber": 4, "sugar": 2, "satfat": 3,
                 "sodium": 900, "potassium": 800, "cholesterol": 150 } }
  ]
}
```

`meal` ∈ breakfast | lunch | dinner | snack (defaults by clock). `micro` is
optional. Any food already in the log produces this exact shape — tap it →
**Copy JSON**.

# House rules

1. **Confirm the numbers before logging.** A guessed macro silently poisons the
   maintenance estimate for two weeks.
2. **Never PUT a container node** (`food/log/{date}`, `weight/entries`,
   `workouts/{month}`). It erases everything else inside.
3. **Update `food/daySummaries/{date}`** after touching a day's food log.
4. **Don't invent library items or exercises** to make a log fit.
5. **New top-level section under `users/{uid}` → add it to the rules**, or it
   will fail to save with no error the user can see. The same is true of a new
   tree at the root — `usage` is the most recent one. And editing
   `database.rules.json` publishes nothing: it is a copy, and somebody has to
   paste it into the Firebase console before a single one of those writes
   lands.
