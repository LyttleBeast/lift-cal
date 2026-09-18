# Porting rack-v42 to rack-mobile

Web shipped as `rack-v42`. The tree it mirrors is `~/dev/rack-mobile`.

**`rack-mobile` was not read at all by this ship, at any commit.** The run was
fenced to `~/dev/ship-v42` and nothing outside it was opened — not the native
tree, not the Worker. So unlike the v40 and v41 handoffs, this file makes **no
claim whatsoever about what native currently has**. Every "native needs" below
is a statement about what the feature requires, not about what is missing.
Check each one against the tree before acting on it.

v42 adds **Coach**: a deterministic engine that reads the account's own
training, food and weight data and says one true thing about it, with the
arithmetic attached. No model call, no network, no per-use cost. It is the first
of three ships. Ship two is the workout builder (and is the only thing that will
read `coach-tags.js`); ship three is the mid-session read and the free-text box.

**Nothing in this ship changes what is stored**, with one addition: a new child
of an already-granted node, `settings/coach`. See §5.

---

## ⚠ NOTHING ALREADY PINNED CHANGED. EVERY EXISTING PIN HOLDS.

```
units.js      fa6f03c9b2a097821c194af2be8e9711da5f940f3a35850d17897c77da4f6da5   unchanged since rack-v41
exercises.js  74ac8a9885376b79940daa6a184dfed14bfa4e32d2226e4e367db53dfd9d9857   unchanged
```

`units.js`, `exercises.js`, `blocks.js`, `accounts.js` and `tdee.js` were not
touched. This was deliberate and it is worth saying why, because the pressure to
touch two of them was real:

- **`exercises.js` was not edited**, even though Coach wants a movement pattern
  per exercise and that is obviously a column in `RAW`. It is copied verbatim
  into the native tree and every logged set in the database is keyed on the ids
  it mints, so editing it means re-copying and re-verifying a file both clients
  depend on — and a slipped comma in a 231-row tagging pass would reach the
  picker, the calendar plate colours and the history index. The tags went into a
  **sidecar** (`coach-tags.js`) keyed on the same ids instead. Nothing in it can
  break anything but Coach.
- **`insights.js` was not edited**, even though `rateVerdict()` has a real bug
  in it — it calls any rate in the goal's direction `'good'`, unbounded, and
  `LIMITS.rateWk` allows ±5 a week. Coach does not inherit it (see §2), and
  fixing `rateVerdict` is Micah's separate change. If native has its own copy of
  that function, it has the same bug, and the same note applies.

---

## What is left to port

| | |
|---|---|
| **1** | `coach.js` — **copy verbatim.** The engine. Pure. |
| **2** | `coach-tags.js` — **copy verbatim.** The sidecar. Pure, inert until ship two. |
| **3** | `coach-data.js` — **rewrite.** The impure gatherer. This is the only file that changes shape. |
| **4** | `coach-ui.js` — **rebuild.** DOM; native draws its own. The contract it consumes is §4. |
| **5** | `settings/coach` — a new child of an already-granted node, and a PROPOSED-rules job. |
| **6** | The six verifiers under `tools-check/`. Five of them port as-is; one does not. |
| **7** | The surfaces — the You card, the Train landing, the sheet, the Settings section. |

---

## 1. `coach.js` — copy verbatim, and pin it

```
coach.js   d04e5926912ef378a3ac8f302792b820cec450f8f8b72c38562b0e48a021d4e6
```

2,053 lines, and every one of them copies. Put it at `src/pure/coach.js` beside
`units.js`, `blocks.js` and `accounts.js`, and add it to whatever
`tools/verify-*-verbatim.mjs` pattern those three use — same two halves,
byte-for-byte against `web/main:coach.js` and against a SHA written into the
verifier.

**The import line is the only thing that may differ**, and only in its paths:

```js
import { GROUPS, GROUP_ORDER } from './exercises.js';
import { e1rm, isWorking, mergeSessionExercises, exerciseIndex } from './analytics.js';
import { labelW, labelRate, unitW, fmtW } from './units.js';
```

Three imports and no more. `tools-check/coach-pure.mjs` refuses a fourth, and it
refuses any name from `analytics.js` outside that list — `loadAll` and
`allSessions` are that file's impure half and coach.js must never reach them.

### The four things the purity buys, and what would cost them

1. **No clock.** `now` is an argument and so is `openMs`, the moment the app
   opened. The second one is not fussiness: the You tab repaints four or five
   times as its loads land, and a greeting seeded on the clock would rotate
   under the reader's thumb between paints. Native has the same problem for the
   same reason.
2. **No module state.** Not one top-level `let` in the file. Two calls with the
   same input are the same sentence, on both of somebody's devices.
3. **No randomness.** The greeting rotates on a hash of `openMs`, never
   `Math.random()`, so two devices reading one account agree.
4. **No reads and no DOM.** Which is what makes §3 the only file that changes.

If the native tree cannot supply `exerciseIndex` and `e1rm` from its own
analytics port, **do not restate them in `coach.js`**. e1rm is the number the
set row prints, and two copies of it drift; `mergeSessionExercises` is the merge
invariant (one logical entry per exId per session) and two copies of THAT report
duplicated lifting blocks as extra training days. Port the analytics math first.

---

## 2. `coach-tags.js` — copy verbatim, and do not "finish" it

```
coach-tags.js   846501595feb06fddc7d85fb19ed526bc6c6cc69cecc5b7e9494eb96bd8c8a06
```

231 exercises on four closed dimensions — `pattern`, `angle`, `load`, `side` —
keyed on `exercises.js`'s ids. It imports nothing and reads nothing.

**Nothing reads it yet, in either tree.** That is correct. Ship two is the
workout builder and it is what consumes it; it was built now so that ship starts
without a preparation run of its own. A native port that "wires it up" to
something is inventing a feature.

Two things not to change:

- **Equipment is NOT in it.** It is carried from `exercises.js`. Two records of
  one fact is one too many and the sidecar would be the one that goes stale.
- **Custom exercises get no tags,** and `tagsFor()` returns `null` for them.
  They are classified by the primary group their owner already assigned, and
  they stay fully usable everywhere. Nothing in Rack may exclude somebody's own
  exercise from anything.

The agreement table (`PATTERN_GROUPS`) allows `hinge` on **back as well as legs**
and that is deliberate, not an oversight: `exercises.js` files every deadlift,
good morning and back extension under back. A stricter table would fail
seventeen correct rows to keep a tidier rule.

---

## 3. `coach-data.js` — the one file that is rewritten

333 lines, and native writes its own. What it has to produce is a plain object,
and that object is the whole contract between the two halves:

```js
{
  now, openMs,                     // ms epoch. openMs is the app open, not the paint
  u,                               // 'lb' | 'kg'
  log,                             // 'readable' | 'empty' | 'unknown'   <- see below
  sessions,                        // analytics shape, oldest first, each with _date
  lib,                             // { exId: { group, equipment } } — the MERGED library
  routines,                        // [{ id, name, exercises }] — for naming a shape
  live:    { active },             // a workout running on THIS DEVICE
  tier:    { pro },                // capabilitiesFor(...).features.advanced === true
  targets, targetsSet,             // targetsSet is TRUE | FALSE | NULL   <- see below
  summaries,                       // food/daySummaries
  steps:   { days },               // the steps node
  weight:  { latestLb, latestAt, rateWk, rateDays, goalDir, goalRateWk },
  settings                         // normSettings(settings/coach)
}
```

### THE TWO THREE-VALUED FIELDS, AND WHY THEY ARE THE HARD PART

**`log`.** `analytics.allSessions()` resolves to `[]` when the read FAILS — it
falls back through `read()`, which folds "the node isn't there" into "the node
couldn't be reached". So through that path, an unreadable log and a brand-new
account are the same answer. They are not the same thing to Coach: one means
*say nothing at all*, the other means *say hello and explain what you need*, and
getting it wrong shows the first-run card to somebody with two hundred sessions
the first time a GET times out.

`store.readExact()` is the only read in the web store that tells them apart:
it rejects on a failed read and resolves `null` only when the database itself
said nothing. **Native needs an equivalent before it can port Coach honestly.**
If it has one, use it. If it does not, that is the first thing to build, and it
is worth building anyway — the profile editor has the same problem.

```
unknown   the read REJECTED. Nothing else answers; every route in the router
          returns guard_log_unreadable, and that reach is deliberate — every
          other node came back through a possibly-stale mirror, and quoting a
          calorie total off one while saying the log cannot be read is a mixture
          of confidences with a wrong one in it
empty     the read resolved and there was nothing there
readable  anything else
```

**`targetsSet`.** Same shape, same reason, different node. Web's `food.js`
leaves a MODULE DEFAULT of 2,700 kcal in memory when onboarding is skipped, so
the number being present proves nothing — only the node's absence answers the
question. And a read that FAILED is not an absent node: it is `null`, and every
fuel rule stays silent on `null` rather than announcing that nobody set any
targets. If native's food layer has the same default, it has the same trap.

### The other four things it must get right

- **Gather ONCE per app open, never on a paint.** Web's You tab already issues
  around seven live GETs per render; a card at the top of it that read anything
  would multiply that by every unawaited load that repaints it. `coachInput()`
  is synchronous.
- **`initCoachData()` is idempotent.** Two screens want the snapshot and both
  repaint when it lands; the first caller does the work and every later one gets
  the same promise.
- **`lib` is the MERGED effective library** — built-ins, the account's customs,
  its renames and refiles. Rebuilt on every `coachInput()` rather than cached,
  because a Coach sentence naming a group the user refiled last week would be
  quoting a library that no longer exists. It is a couple of hundred
  assignments; it is not worth caching.
- **`live.active` is answered by the CALLER, not reached for.** `coach-data.js`
  must not import the workout module: that edge closes a ring between a tab and
  the card it draws. On web the You card asks the device (`activeSession` in
  localStorage) because the workout module's state is filled by an init that
  runs after You's, and the Train card passes its own answer in because there
  that module is the authority. Native has the same ordering question; answer it
  the same way.

### And the one thing it does that it should not have to

It reads the `workouts` tree a SECOND time, because `readExact` is needed for
`log` and there is no way to hand the already-read tree to `analytics.js`. One
extra whole-tree GET per app open. If the native analytics port has a
`loadAll(tree)` seam, use it and skip the duplicate. Noted in BACKLOG.md.

---

## 4. `coach-ui.js` — what native has to draw

Web's is 380 lines of DOM. Native draws its own; this is the contract.

`coach(input)` returns:

```js
{
  u, pro, lockedCount,
  you:   { id, state, text, reason, tone, category, … },   // the You card
  train: { …same },                                        // the Train card
  greet: { id, text },                                     // the rotating line
  lead:  { id, label, category } | null,                   // the bottom row
  topics:   [{ id, label }],                               // the sheet's bubbles
  question: { id, text, options } | null,                  // Coach's one question
  opening:  { …same as you },                              // the sheet's first bubble
  ask(id) -> { id, text, reason, followups: [{ id, label }] }
}
```

### THE CARD'S HEIGHT IS FIXED AND IT IS LOAD-BEARING

190 px on You, 164 px on Train, `box-sizing: border-box`, everything inside
clamped, and **the box cannot resize**. This is not a style preference. What it
says changes every day — a one-line finding today, a two-line one with a
two-line reason tomorrow — and on Train it sits directly above Start workout. A
card that grew by a line would move the app's primary button under somebody's
thumb between one morning and the next. Whatever the native layout system is,
the constraint is the same: clamp and truncate, never reflow.

Anatomy, top to bottom: a speech-bubble mark and the word COACH, both in the
yellow; a lock in the top right — grey and OPEN on Pro, yellow and SHUT without
it; the rotating line (You only); the finding, two lines; the reason, two lines;
and a bottom row reading COACH ME with the lead question after it and a chevron.
No `pro` wordmark — the corner lock carries the tier on its own.

The whole card is the tap target, not just the bottom row. A 190-pixel box with
one live corner is a box most people never tap.

### The sheet

A bottom sheet like Log food, **not** a route like Start workout — Coach is
something you glance at and close, and a route puts it in the back stack where
it does not belong. Taller than Log food.

- The opening bubble is already on screen when it opens, and it is the same
  finding the card that opened it is showing. The two cannot disagree.
- One preset bubble per tab: Train, Fuel, Weight. **Steps gets none** and still
  answers when it is reached as a follow-up off Weight — which is why the router
  is keyed on ids rather than on a menu.
- A tap answers IMMEDIATELY. There is no submenu anywhere in it. Two or three
  follow-ups are generated from the answer, and one with nothing behind it is
  never offered: a button that opens on "Coach can't tell yet" is worse than one
  fewer button.
- A not-medical-advice line at the bottom.
- **Nothing in it persists.** It rebuilds from the engine every time it opens.
  Coach keeps no history of its own output — the log is the only state there is.

### The Settings section

One switch per mutable category, walked from `CATEGORIES`. `core` and `safety`
are declared not mutable and must not be offered: the first is how the card says
it cannot read the log, and the second is anything that counsels rest or care.
ON is the ABSENCE of a stored key, so a fresh account sees every switch on
without a byte having been written. Flip first, write second, and flip BACK if
the write comes home refused.

---

## 5. `settings/coach` — the PROPOSED-rules job

**The published rules did not change and must not.** `database.rules.json` is
byte-identical to rack-v41. Coach's state lives at
`users/{uid}/settings/coach`, and it needs no grant of its own because
`settings` already carries a section-level `.write` and the
`$other: { ".validate": false }` deny is nested inside `units` rather than on
`settings` itself. Any other child of `settings` lands today.

That is exactly the kind of thing that stops being true quietly.

**`web-patches/database.rules.PROPOSED.json` in the native tree is the file to
check.** It validates node by node. If it grows an `$other` deny at the
`settings` level — or simply never learns about `coach` — then the first Coach
write after that publish fails SILENTLY, and every switch in Settings → Coach
goes back to its default on the next open with no error anywhere.

Shape, and the validation it wants:

```json
"coach": {
  "v":         { ".validate": "newData.isNumber()" },
  "lastGreet": { ".validate": "newData.isString() && newData.val().length <= 40" },
  "mute":    { "$cat": { ".validate": "newData.isBoolean()" } },
  "answers": { "$q":   { ".validate": "newData.isString() && newData.val().length <= 20" } },
  "asked":   { "$q":   { ".validate": "newData.isNumber() && newData.val() >= 0" } },
  "$other":  { ".validate": false }
}
```

Nothing in it is a weight, a date key or a piece of content. `normSettings()` in
`coach.js` already refuses an unknown category, an answer outside its question's
own options and a half-written node, so the rules are a second bound rather than
the only one.

**Never write this node through a merge-update that swallows errors.** Web's
`store.mergeUpdate()` eats every failure including PERMISSION_DENIED, which is
precisely the failure an unpublished rule produces. Read, merge, write, and
assign module state only after the write resolves.

---

## 6. The verifiers

Five of the six port directly. They import `coach.js` and `analytics.js` for
real with the store stubbed underneath, so the only thing that changes is the
stub and the paths.

| | |
|---|---|
| `coach-tags.mjs` | Ports as-is. It imports `exercises.js` and `coach-tags.js`, both pure. |
| `coach-registry.mjs` | Ports as-is. |
| `coach-rank.mjs` | Ports as-is. |
| `coach-units.mjs` | Ports as-is, and **port it first**. It renders every sentence twice and compares. |
| `coach-silence.mjs` | Ports as-is. |
| `coach-pure.mjs` | **Section E does not port.** It reads `coach-data.js`'s source to check the split — which file reads, which file writes, and that the write is not a merge-update. Native's equivalent file has a different name and a different store, so that section has to be rewritten against it. Sections A–D are the fence around `coach.js` and port unchanged. |

---

## 7. What to run

In the web tree, before anything is copied out of it:

```bash
for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done
for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done
```

Both are clean at rack-v42: 19 verifiers, all exit 0.

---

## Traps hit while building this

Written down while they are fresh, because every one of them is a thing the
native port will meet too.

- **`window` is a legal identifier in a module and shadows the global.** A
  private derivation was called `window()` and worked perfectly. It is called
  `inWindow()` now, and `coach-pure.mjs` refuses the word outright.
- **A `because` string can leak stored pounds into a reason line.** The reason
  line is as visible as the finding above it and it was the one place the units
  discipline had no habit behind it. Two of them printed raw pounds. Both are
  through `labelW()` now and `coach-units.mjs` checks the fact bodies, not just
  the response templates.
- **A finding whose number is only in its reason is not carrying its number.**
  The training headline read *"your chest and shoulders day has waited
  longest"* with the days underneath it. `coach-silence.mjs` failed it, and it
  was right to.
- **`plural(n, word)` on a pre-formatted string always pluralises.** `one(1)`
  returns the STRING `'1'`, and `'1' === 1` is false, so a median gap of one day
  read "1 days". Coerce.
- **Greedy signature clustering chains.** Merging a session signature against
  any MEMBER of a cluster lets A merge with B and B with C where A and C are two
  groups apart; three hops and every session in the window is one blob called
  "a whole-body day". Merge against the cluster's REPRESENTATIVE — the most
  common signature in it, which is also what names it.
- **A verifier can assert something false to look stricter.** "Every pulldown is
  compound" failed on the Straight-Arm Pulldown, which is shoulder extension
  with a locked elbow and genuinely is isolation. The tag was right and the
  check was wrong. The exception is now named in the verifier so that a later
  pass which tidies it has to argue with a line rather than with a silent rule.
- **A verifier that flags its own subject's comments teaches people to delete
  the comments.** Three checks in `coach-pure.mjs` failed on `coach.js`'s header
  explaining why it does NOT import `store.js`. Strip comments first.
