# The You tab's GETs — v47, Phase F (investigate and scope only)

**Nothing shipped.** No read the You tab makes is dead: every one has a
consumer. What follows is the measurement, which reads repeat data already in
hand, one real bug found while measuring, and a plan in steps, each with the
file:lines it would touch.

## How it was measured

`report/you-gets/profile.mjs` boots the real app in headless Chrome on the
Phase C harness (`report/btn-44/`). The fake database there is swapped for a
tracing copy (`firebase-database.traced.js`) that records every `get()` with
its path and the file:line chain that asked for it. The account is the
harness's seed: eight weeks of training, 21 days of food, 41 weigh-ins and 14
of steps. The profiler runs a cold boot, a sequence of tab switches, the ⚙
sheet, 10 s idle, then a **warm** reload with the mirror and caches kept, which
is what a phone normally sees.

```
node report/btn-44/seed.mjs && node report/you-gets/profile.mjs
```

The counts are exact. The timing is not a phone's: the fake answers
instantly, so which reads overlap in flight will differ.

## What it found

| | GETs | of which the You tab |
|---|---|---|
| cold boot, landing on You | 119 | 37, plus 44 from the weight model it awaits |
| **warm boot**, landing on You | **77** | **37** (the weight model: 2) |
| **every switch to You** | **7** | 7 — the same seven, every time |
| switch to Train, Fuel | 0 | — |
| open ⚙ and close it | 0 | — |
| 10 s idle on You | 0 | — |

**The seven are `refreshLogged()`** (`you.js:267`, reads at `:270–277`):
`weight/entries`, `food/targets`, `food/daySummaries`, `steps`, `profile`,
`settings/steps` and `settings/water`. Three of them are whole growing nodes.
`render()` calls `refreshSessions()` (`you.js:537`), which calls it
(`:247`), and `app.js:264` re-renders You on every switch to the tab. The
comment at `you.js:256` says *"read() answers from the localStorage mirror,
so this is a local comparison and not a round trip"*. That is not true online:
`store.js:706` `read()` always does a network `get()` and only falls back to
the mirror offline or on failure. BACKLOG's "around seven live GETs per
render" is right.

**The You tab's 37 at boot, warm:**

| where | GETs | what |
|---|---|---|
| `you.js:152–161` | 8 | the boot wave: profile, targets, daySummaries, entries, settings/steps, steps, settings/water, onboarding |
| `you.js:200` | 15 | one `water/log/{day}` per day for the water card |
| `you.js:195` → `analytics.js:29` | 1 | the whole `workouts` tree (`allSessions`, memoised after) |
| `you.js:270–277`, render from `:196` | 7 | `refreshLogged()` wave 1, when sessions land: **7 of the 8 nodes read a moment earlier. Discarded by design** — `if (first) return;` at `:285` keeps only the fingerprint |
| `you.js:270–277`, render from `app.js:264` | 7 | wave 2, boot's own `restoreView()` switch to You: the same 7 again, unchanged |

Plus `you.js:147` → `coach-data.js` (10), and `you.js:178` → `weightmodel.js`
(2 warm, 44 cold, because past days are cached forever at `weightmodel.js:107`).

**Re-reads of data already in hand, whole app, warm boot.** 33 of the 77 fetch
a path this boot has already fetched:

| path | times | who |
|---|---|---|
| `food/targets` | 6 | `coach-data.js:183` (readExact), `you.js:154`, `you.js:272` ×2, `food.js:67`, `weight.js:179` |
| `food/daySummaries` | 6 | `coach-data.js:201`, `you.js:155`, `you.js:273` ×2, `food.js:125`, `weight.js:177` |
| `weight/entries` | 6 | `coach-data.js:202`, `you.js:156`, `you.js:271` ×2, `food.js:124`, `weight.js:24` |
| `steps` | 5 | `coach-data.js:203`, `you.js:158`, `you.js:274` ×2, `steps.js:46` |
| `settings/steps` · `settings/water` | 4 · 4 | You ×3 each, plus `steps.js:45` · `water.js:55` |
| `profile` | 3 | `you.js:153`, `you.js:275` ×2 |
| `water/log/{today}` · `food/log/{today}` | 3 · 2 | `you.js:200`, `weightmodel.js:113–114`, `water.js:66` / `food.js:94` |
| `workouts` · `routines` · `onboarding` | 2 · 2 · 2 | `coach-data.js:173` + `analytics.js:29` (BACKLOG v42) · `coach-data.js:204` + `routines.js:39` · `app.js:208` + `you.js:160` |

14 of the 33 are You's two `refreshLogged()` waves.

## Found while measuring: settings edited from You don't reach You

**This is a wrong number on screen, confirmed in the harness.** Set the step
goal from You → ⚙ → Step goal → 12k → Save. The database holds 12,000 and the
Steps tab shows 12k. The You tab still says **"87% of goal"** and **"against a
8,000 goal"**, and it still does after switching to Train and back, and to Fuel
and back.

The cause: every "repaint You after this sheet saves" callback does
`liveFp = ''; refreshLogged();`: the avatar (`you.js:656`), the ⚙ (`:690`),
"Set your daily targets" (`:919`) and the Goal / Daily targets buttons (`:1570`,
commented *"Both repaint this tab behind them the moment they save"*). Clearing
`liveFp` makes that wave look like the boot wave, so `refreshLogged()` records
the new fingerprint and returns **without applying anything** (`:283–285`).
Every later wave then matches that fingerprint and applies nothing either.
You stays wrong until one of the seven nodes changes for some other reason, or
the app restarts.

The same thing happens to the goal, daily targets, name, photo and water goal
when they're edited from You. Edited from Fuel's ⚙ instead, the next switch to
You does pick them up. **Not fixed**: it isn't a read removal, and this phase
ships nothing else. The fix is small. Give `refreshLogged` a force flag that
skips both the "first" early return and the fingerprint comparison, and have
the four callbacks pass it, for example `refreshLogged({ force: true })`. A
fixture would change a setting through the callback and assert the next paint
uses it.

## Why nothing shipped

The brief allowed one thing: a provably-safe dead read. There isn't one. The
boot wave's eight nodes all have consumers (`onboarding`, the least obvious, is
the date fallback at `you.js:701`). Every `refreshLogged()` value is assigned or
fingerprinted. Wave 1 is discarded, but it is not dead: it sets the baseline
fingerprint, and removing it changes what the next wave does. That is a
behaviour change, so it belongs to the plan and not to this phase.

## The plan, in steps

Each step stands alone and can be measured with `profile.mjs` before the next
one starts. The numbers are warm boot / every switch to You, from 77 / 7.

### Step 0 — the bug above (first, whatever else happens)

`you.js:267–301` (`refreshLogged` gains a `force` flag) and the four callbacks
at `:656`, `:690`, `:919`, `:1570`. It adds no GETs, since the callbacks already
read. It needs a fixture.

### Step 1 — re-read on show, not on paint

`render()` stops calling `refreshSessions()` (`you.js:537`). `you.js` exports a
`refresh()` that does what `refreshSessions()` does now, and `app.js:264` calls
it beside `renderYou()` when the user switches to You. `initYou` sets `liveFp`
from its own boot values (`you.js:162–171`: the same seven nodes, fingerprinted
in `refreshLogged`'s order, which is not the boot wave's) and marks itself fresh, so boot's own `restoreView()` switch
(`app.js:235`) doesn't re-read what it read a second before.

- Saves **both boot waves: 77 → 63**. Every switch stays at 7, so freshness
  after logging on another tab is exactly as now.
- **Risk.** A repaint caused by something landing (Coach's snapshot, the
  sessions, the water days, the model, all `render()` calls inside `you.js`)
  would no longer check the seven nodes. Those checks never found anything,
  because the values were seconds old. The one path that needs a re-read on a
  repaint is Step 0's callbacks, and they call `refreshLogged` directly. The
  workout-finished case (`refreshSessions` comment, `you.js:212`) is a switch
  to the tab, which still refreshes.

### Step 2 — skip the re-read when nothing can have changed

On show, re-read only if something could have moved: a `write()` on this device
touched one of the seven paths since the last read, **or** the last read is
older than about 60 s (another device). `store.js:654` `write()` gains one line
that records the time of the last write per path prefix, exported for
`you.js`. Re-read only the dirty nodes where that is all it is.

- A quick back-and-forth goes **7 → 0**. After logging a weigh-in on Weight it
  becomes 1 (`weight/entries`). After a minute away it is 7, as now.
- **Risk.** A change from a second device shows up after at most a minute on
  You rather than on the very next switch. Rack is mostly one phone per
  account, but AGENTS.md is explicit that two devices happen.

### Step 2′ — the alternative: listen instead of asking

`watch()` (`store.js:743`, which `workout.js` already uses for the month) on the
seven nodes, once, in `initYou`. That means **zero GETs per switch** and live
updates across devices. The cost: seven permanent listeners on nodes that grow
for as long as the account exists, and pushes that repaint the opening screen
under the reader's thumb. `you.js` keeps the scroll position, but the content
under it moves. It is a bigger change to the screen the app opens on, so it is
not recommended before Step 2 has been tried.

### Step 3 — across modules, separately: coalesce reads in flight

`store.js:706` `read()` hands a second caller of the same path the promise
already in flight. At the same instant the answer is the same, so it is safe
in meaning. It is also the most-used function in the app, and every screen
leans on it, so it is its own ship with its own verifier. How much it saves
depends on which of the 33 repeats actually overlap on a phone, which this
harness cannot tell (its answers are instant). Measure it there.

### Not proposed

- **One `loadAll`-style read of `users/{uid}`.** It would pull the whole
  training and food history, the two largest trees, on every refresh: more
  bytes, not fewer.
- **Answering from the mirror while online.** That is what the comment at
  `you.js:256` believes happens. It would make You blind to anything written by
  another device until that device's write happened to come back through a read
  somewhere else.
- **Sharing the water days with the weight model** (`you.js:200` and
  `weightmodel.js:114` both read `water/log/{day}`). It ties You to the model's
  private cache format, the same trade BACKLOG v46 declined for Coach.

## Files each step would touch

| step | files and lines |
|---|---|
| 0 | `you.js:267–301`, `:656`, `:690`, `:919`, `:1570`, plus a new `tools-check` fixture |
| 1 | `you.js:162–171`, `:228–248`, `:537`, new export · `app.js:264` |
| 2 | `store.js:654` (`write()`, one line and an export) · `you.js:228–301` |
| 2′ | `you.js:129–183` (init), `:228–301` · uses `store.js:743` as is |
| 3 | `store.js:706–719` only, plus its own verifier |

Also fix the comment at `you.js:256` in whichever step touches it: it describes
a mirror answer that `read()` doesn't give online.
