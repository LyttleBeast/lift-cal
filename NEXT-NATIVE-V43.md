# Porting rack-v43 to rack-mobile

Web shipped as `rack-v43`. The tree it mirrors is `~/dev/rack-mobile`.

**Amended at rack-v44**, which got no port note of its own: v44 changed two
things a port copies — the greeting rule in §1.1 and the recent-line cap that
goes with it — and the `coach.js` pin below. Both are stated here as rack-v44
rather than left as v43's and contradicted by a second file. Everything else in
this document is v43's and is unchanged.

**`rack-mobile` was not read at all by this ship, at any commit.** The run was
fenced to `~/dev/ship-v42` and nothing outside it was opened. So, as with v42,
this file makes **no claim about what native currently has**. Every "native
needs" below is a statement about what the feature requires, not about what is
missing. Check each against the tree before acting on it.

v43 is not a feature. It is the **fix run for Coach**, from defects found by
driving the live deployment where Coach has been running for nine accounts.
Read `NEXT-NATIVE-V42.md` first — it is still the port document. This file is
the delta, and everything in it is a correction to something v42 got wrong.

**Nothing in this ship changes what is stored, and one thing stops being
stored:** `settings/coach.lastGreet` is gone. See §2.

---

## ⚠ THE PINS

```
units.js      fa6f03c9b2a097821c194af2be8e9711da5f940f3a35850d17897c77da4f6da5   unchanged since rack-v41
exercises.js  74ac8a9885376b79940daa6a184dfed14bfa4e32d2226e4e367db53dfd9d9857   unchanged
coach-tags.js 846501595feb06fddc7d85fb19ed526bc6c6cc69cecc5b7e9494eb96bd8c8a06   unchanged since rack-v42
```

`coach.js` **changed** and its v42 pin is dead. The new hash is in §1.
`blocks.js`, `accounts.js` and `tdee.js` were not touched.

---

## 1. `coach.js` — still copy-verbatim, and re-pin it

```
coach.js   3875fdc4c170a812e5612d26bb2999e353c7d5aafe07f3028b8d44c0bfd09fbe
```

2,254 lines, still all of them copying. The hash and the count are rack-v44's —
the greeting rule below moved after this document was first written, and a pin
that names the wrong file fails a port that copied the right one.

Still three imports, still no clock, no randomness, no DOM, no module state —
and `tools-check/coach-pure.mjs` is stricter than it was. What changed inside:

### 1.1 THE ROTATION IS A COUNTER NOW, AND THIS IS THE HEADLINE

v42's `rotate(seed, n)` was `Math.abs(Math.floor(seed / 1000)) % n`, seeded on
`openMs`. **That is not a rotation.** It is the wall clock modulo the pool
size — a hash of the second somebody happened to open the app — and a hash
repeats freely. Reproduced on the live site: three consecutive reloads gave an
identical greeting *and* an identical lead question, then the fourth changed.

It is now:

```js
function rotate(counter, n) {
  if (!n) return 0;
  const c = Number.isFinite(counter) ? Math.floor(counter) : 0;
  return ((c % n) + n) % n;
}
```

`counter` is `d.input.opens`, a per-device integer that goes up by one each time
the app opens. **`openMs` is gone from the input entirely and nothing passes a
timestamp to `rotate` any more** — `coach-pure.mjs` refuses the identifier
outright, so a port that keeps feeding it a clock fails the fence.

Two supporting changes went with it, and without either the rotation still
stutters:

- **`pickGreeting` has had this pool wrong in both directions.** v42 did
  `const from = data.length ? data : pool;`, which reduced the pool to a single
  entry whenever exactly one data-aware line passed its gate — and `n % 1` is
  always 0, so that card said the same thing every open forever. v43 walked the
  **whole ordered pool** instead, and that is the version this document shipped
  with and the one not to port: it cannot repeat, but it spends what the line is
  for, because seven generics stand behind two or three data lines and a
  consecutive counter spends most of its lap among them. Five opens in a row on
  a live account came up generic on a log where several data lines qualified.
  The rule that holds both ends is a threshold of two: `data.length >= 2` and
  the walk stays inside the data-aware lines, fewer than two and it opens out to
  the whole ordered pool, data first and generics after. Two, because two is the
  smallest pool a counter can rotate without repeating.
- **The recent-line list is three ids, not one**, and it steps the index
  forward rather than filtering the pool. The counter is what makes consecutive
  opens differ; the list covers the case the counter cannot, which is an
  eligible pool that changed size between two opens because a gate stopped
  passing. **It is read one line short of the pool** —
  `recent.slice(0, Math.max(1, ordered.length - 1))` — and that cap is what
  keeps the threshold from being a second bug. A data-aware walk two or three
  lines wide against a memory of three leaves every candidate recent, so the
  loop finds nowhere forward to step and falls back on the counter's own index,
  which is exactly the index that collides when the pool changed size between
  two opens. On the verifier's fixtures that is 26 repeats on consecutive opens
  in 4,704 crossings uncapped and none capped, and capped the no-repeat
  guarantee is arithmetic rather than a sample: at most one line short of the
  pool is ever blocked, so a free candidate always exists and the line just
  shown is always among the blocked.

### 1.2 The stall finding is answer-only, and its sentence is a readout

`stalled_lift.surfaces` is `['sheet']`. It shipped on `['you','train','sheet']`
saying *"X hasn't moved: your best estimated max there is still 270lb"* —
unprompted, on the screen the app opens to, and characterising the lifter rather
than the log. It now states the figure and when it was last matched, and it
reads differently when the account's own goal direction is down: a flat
estimated max through a deficit is a lift held, not a lift stalled.

**The rule this produced is written into the response layer's contract** at the
head of `RESPONSES` and is worth porting as a rule, not just as a diff:

> An unprompted finding is neutral or actionable, never a judgement.
> Coach describes the numbers, never the person.

`tools-check/coach-voice.mjs` enforces it mechanically over every template a
card can reach, with **no exemption list** — the handful of sentences where a
banned word was doing honest temporal or scoping work were rewritten instead,
because a rule carrying five exceptions is a rule nobody keeps true.

### 1.3 New exports the surfaces need

| export | what it is |
|---|---|
| `TRAIN_TOPICS` | Train's own topic set — three ids the router already answers, promoted to bubbles. No new routes. |
| `PRO_ADDS` | What Pro adds, **derived from the intent table's own tiers**, not written out. The sheet's locked panel walks it. |
| `coach().topicsFor(surface)` | Replaces `coach().topics`. `'train'` gets `TRAIN_TOPICS` filtered to the ones that answer today; anything else gets the general three. Falls back to the general three when no Train bubble has an answer. |

`coach().topics` **no longer exists.** A port holding a reference to it breaks.

### 1.4 `normSettings` dropped `lastGreet`

The returned object is `{ v, mute, answers, asked }`. A `lastGreet` stored by a
v42 client is dropped on the way through, so nothing has to be migrated and
nothing has to be deleted from anybody's node.

---

## 2. THE GREETING COUNTER AND THE RECENT LIST ARE DEVICE STORAGE

**On both clients. `localStorage` on web, MMKV (or whatever the tree already
uses for `activeSession`-class state) on native. Not the database, not
`settings/coach`, and not a synced store.**

This is the one decision in v43 most likely to be quietly undone by a port that
thinks it is tidying up, so here is the whole argument:

1. **The write happens as the app opens** — Coach records the line it greeted
   with on the first paint — **and the app is routinely closed a second or two
   later.** That is not an edge case, it is the usage pattern: open, glance,
   close. An async database write fired at that moment dies with the page. In
   v42 it did, and the value the rotation needed was the value it kept losing.
2. **A network round trip for it is slower and less reliable than the thing it
   is buying**, which is a display nicety worth roughly nothing.
3. **Getting it wrong costs a repeated greeting, not a wrong number.** That is
   the whole reason it is allowed to be device-local at all. Every value Coach
   *prints* still comes from the log.
4. **Two devices legitimately disagree**, and that is correct rather than a bug.
   The counter is "how many times has the app been opened on this phone", which
   is a per-device fact.

Web's keys, for shape:

```
rack:{uid}:coachOpens    number     the open counter, bumped once per app open
rack:{uid}:coachGreets   string[]   the last three greeting ids, newest first
```

Namespaced by uid, so a shared device keeps two accounts apart. Native must do
the same — an unnamespaced key hands the previous account's counter to the next
one, which is harmless here but is the same mistake that was worth fixing for
the mirror.

**The counter is bumped exactly once per app open, before the first await, in
the equivalent of `initCoachData()` — never in the snapshot builder.** The
snapshot builder runs on every paint, and a counter that moved on a paint would
rotate the greeting under the reader's thumb as the loads land, which is the
exact defect the old clock seed had.

---

## 3. `coach-data.js` — the input contract changed, and so did the load

### 3.1 The object

```js
{
  now,                             // ms epoch. openMs is GONE
  opens,                           // integer, device storage, +1 per app open
  recentGreets,                    // string[], newest first, max 3, device storage
  u, log, sessions, lib, routines,
  live: { active }, tier: { pro },
  targets, targetsSet, summaries,
  steps: { days },
  weight: { latestLb, latestAt, rateWk, rateDays, goalDir, goalRateWk },
  settings                         // normSettings(settings/coach) — no lastGreet
}
```

Everything else is v42's contract unchanged, including the two three-valued
fields (`log` and `targetsSet`), which are still the hard part and are still
documented in `NEXT-NATIVE-V42.md` §3.

### 3.2 ONE WAVE, NOT FOUR — and start it before the first await

v42's `load()` awaited four reads **in series**: the whole `workouts` tree, then
`food/targets`, then `settings/coach`, then a `Promise.all` of four small nodes.
Not one of them needed an answer from the one before it. Every read in web's
`store.js` is a real round trip while online, so that was four latencies stacked
under the first card on the screen the app opens to.

Worse: **the load did not start until the end of `initYou()`** — after that
screen's own eight-node wave *and* after the weight model refit. So Coach's
reads left the device two awaited stages after the tab did.

Both are fixed. All seven reads go out together, and the load is started before
the first await in both tabs. **Native has the same two mistakes available to
it**, and the second one is the bigger of the two.

The load now flips readiness twice:

```
logKnown   <- workouts + settings/coach have settled
ready      <- everything has settled
```

and exposes a promise for the earlier boundary, because a tab that only hangs
its repaint off the full load never draws at the log phase at all.

**Be honest about what that staging buys.** In the ordinary online case the
`workouts` tree is the largest of the seven reads and therefore the last to come
home, so `logKnown` and `ready` flip in the same tick and the staging pays for
nothing. It is a cheap and correct tail guard for the case where a small node
stalls behind the tree — no more than that. **The three seconds were closed by
the parallelisation and by the earlier start.** If the native tree's store has a
different cost profile — a local database that answers the small nodes
instantly and streams the tree — the staging becomes the load-bearing half, and
it is there ready for that.

### 3.3 Two things the surface layer has to do with a two-phase load

Both were found by audit rather than by eye, and both are real:

1. **Pin the greeting for the app open.** Four of the greeting lines gate on
   weigh-ins, food or steps, which arrive after the log does, and the eligible
   pool does not merely grow between the log paint and the full one: crossing
   two qualifying data lines moves the walk out of the whole ordered pool and
   into the data-aware lines alone, so the counter can land somewhere entirely
   unrelated. Left alone the card rewrites its own top line half a second after
   somebody starts reading it — and records the line that flashed rather than
   the one they read, so the *next* open avoids the wrong id. Web pins the first
   line chosen in the view layer, which keeps `coach.js` pure. Pin it anyway,
   and name what that costs: at the paint that pins it fewer data lines have
   qualified, so an open that would have rotated inside them can lock a generic
   instead, and the card reads more generic on a cold start than the engine
   alone would make it. That is the smaller of the two wrongnesses.
2. **Do not print a count that can go up.** The "N more with Pro" figure counts
   Pro findings that actually fire, and three of the ten read food and weight,
   so at the log phase it is genuinely "at least N". Web holds it back until the
   full load. A number on a card that increments a moment after it is read is a
   small wrongness that makes the rest of the card harder to believe.

And one state must not be painted early at all: `card_state_clear` says
*"Nothing stands out today"*, which is a claim about every check Coach ran. Web
substitutes an honest short line for it until the full load. Every other state —
unreadable log, new account, live session, thin log, a real training finding —
reads only the log and is true the moment `logKnown` flips.

---

## 4. `coach-ui.js` — the two wiring bugs

Neither of these was visible to any engine-level verifier, because neither was
an engine bug. Both were found by driving the live site. **Native will have
written its own version of this file and can have made both independently.**

### 4.1 The tier gate was cosmetic

The lock in the card's corner rendered correctly from day one — grey open on
Pro, yellow shut on basic — and `openCoachSheet()` **never read `c.pro`**. A
basic account tapped the card and got the full sheet. Confirmed live by a basic
account.

The sheet now gives a basic account the one free finding plus a panel naming
what Pro adds, in place of the topic chips.

**There is no purchase flow and there must not be one.** Rack has no payment
path — RevenueCat and Apple IAP are phase three and are not built — and the app
is invite-only. A button that says Upgrade and goes nowhere is worse than none.
The panel states what Pro adds and that it is not on sale, and there is one
marked seam for the real flow to drop into later.

**It remains a display gate, defeatable by reading the JS on web.** That is
accepted for a feature with zero marginal cost, and it is said plainly in the
source rather than pretended otherwise. Native's bundle is not meaningfully
harder to read, so the same reasoning holds there.

### 4.2 The sheet did not know which card opened it

Both surfaces offered the same three topics, so the first thing under somebody's
thumb on the way into a workout was *"How's my food?"*. **The surface was
already travelling** — the card passes its whole `opts` into the sheet and
`opts.tight` is the Train form — it was simply never read. (v42's brief said it
"never travels into the sheet"; that was wrong about the code.)

Train's set is training-first: what to train today, what has waited longest, how
the week is going. Every id in it is one the router already answered, so there
are no new routes and no bubble can exist without a rule behind it. The You set
is unchanged.

**There is no "make me a workout" and no placeholder for one.** That is ship
two. A chip that promises the builder before the builder exists is the worst
kind of coming-soon.

### 4.3 The card's short-finding gap

Measured live at 44px of dead air between the reason line and the COACH ME row
when the finding and the reason were one line each. It read as a render that had
failed rather than as space.

Web's fix is one declaration: the card is a flex column with `margin-top: auto`
on the bottom row, which absorbed **all** the positive free space into one lump.
A second auto margin — `margin-bottom: auto` on the header — splits it, so the
greeting/finding/reason block sits centred in the space above a still-pinned
row. **The card's fixed height did not move and must not**: 190px on You, 164px
tight on Train, and the whole reason it exists is that Train's card sits
directly above Start workout.

Native's layout engine is not CSS flexbox and the mechanism will differ. The
requirement is the same: fixed height, row pinned to the floor, text block
centred in what is left, nothing resizes.

---

## 5. `settings/coach` — the PROPOSED-rules job, updated

**The published rules did not change and must not.** `database.rules.json` is
byte-identical to rack-v41.

`NEXT-NATIVE-V42.md` §5 gave a shape for
`web-patches/database.rules.PROPOSED.json`. **Drop `lastGreet` from it.** The
corrected shape:

```json
"coach": {
  "v":       { ".validate": "newData.isNumber()" },
  "mute":    { "$cat": { ".validate": "newData.isBoolean()" } },
  "answers": { "$q":   { ".validate": "newData.isString() && newData.val().length <= 20" } },
  "asked":   { "$q":   { ".validate": "newData.isNumber() && newData.val() >= 0" } },
  "$other":  { ".validate": false }
}
```

If the v42 shape was already pasted somewhere, a `lastGreet` left in the
validation is harmless — nothing writes it any more — but it is a line that
describes a field that does not exist, and those are how a schema document stops
being believed.

Everything else in v42 §5 stands: `settings` needs no new grant, an `$other`
deny must never be added at the `settings` level, and this node is never written
through a merge-update that swallows PERMISSION_DENIED.

---

## 6. The verifiers

Four new ones, on top of v42's six.

| | |
|---|---|
| `coach-rotation.mjs` | Two properties that pull against each other on purpose, and a port needs both: no two consecutive opens ever match, AND at least two thirds of a thirty-open run say something about the log, with never five generic lines running. Holding only the first is what let the card go generic while this file stayed green. Drives real opens through the real engine. **Ports as-is.** |
| `coach-voice.mjs` | The voice rule, mechanically, over every template and `because` string a card can reach — source text *and* rendered output, imperial and metric. **Ports as-is**, except for the part that sweeps `coach-ui.js`'s own hardcoded card strings, which is web-shaped. |
| `coach-surface.mjs` | Drives `coach-ui.js` through a DOM shim: the tier gate, the surface-scoped topics, and that there is no purchase control anywhere in the sheet. **Does not port** — it is a fence around a web view layer. Native wants its own equivalent, and it wants one: both bugs it catches were invisible to everything else. |
| `coach-boot.mjs` | Round-trip depth of the boot load. **Does not port** as written, but the property does. |

`coach-pure.mjs` gained the fence around the new contract: the counter is an
input, no timestamp reaches `rotate`, the rotation is device storage and not
`settings/coach`, `rememberGreeting` writes synchronously, and the load is one
wave. Sections A–D still port; section E is still web-shaped.

`coach-rank.mjs` gained a section for the surface-scoped topic sets. Ports as-is.

---

## 7. What to run

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Both clean at rack-v43: 23 verifiers, all exit 0.

---

## 8. If the port reads one thing in this file

§2. The greeting counter and the recent-line list are device storage on both
clients, and the argument for it is not "it is simpler" — it is that the write
happens at the moment the app is most likely to be closed, and a database write
fired then does not land. v42 put it in the database, the value was lost exactly
when it was needed, and the feature it existed for did not work for nine
accounts for as long as it shipped.
