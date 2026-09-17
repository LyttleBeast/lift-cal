# Porting rack-v40 to rack-mobile

Web shipped as `rack-v40`. The tree it mirrors is `~/dev/rack-mobile`.

**Nothing in `rack-mobile` was touched by this ship.** It was read only, and
only through git at the fixed commit `85be276`, because a run was live in that
tree the night v40 was built. Every claim below about native is a claim about
that commit and nothing later. **Re-check each one before acting on it.**

The standing rule holds and this ship was built to it: the website is the guinea
pig, the real destination is native, and logic is written ONCE as a pure function
the port copies verbatim rather than re-deriving from a description. Every row
below names its web file and its native destination.

---

## What is actually left to port

v40 was four things. Two of them native already has or is getting from its own
run, so the port's job is smaller than the ship was.

| v40 phase | Port job |
|---|---|
| 1 — the maintenance model comes out of hiding | **All of it.** Nothing of this exists in native. |
| 2 — a ticked set with reps is never dropped | **Verify, then nothing.** See below — at `85be276` native still had the old rule. |
| 3 — a refused save stops looking saved | **Diff, don't port.** Native solved the first half on 14 Sep; the dead-letter half is a design decision the two trees have to make the same way on purpose. |
| 4a — a routine's target weight | **Nothing.** Native was already right; web was the one behind. |

---

## 1. `effectiveMaint` — the one function to copy verbatim

| | |
|---|---|
| Web | `tdee.js` → `effectiveMaint(targets, est)` |
| Native | `src/pure/tdee.js` |
| Port | **Verbatim.** Copy the function and its comment block. |

Confirmed open: `src/pure/tdee.js` at `85be276` contains no `effectiveMaint` and
no `maintSrc`.

```
effectiveMaint(targets, est) -> { cal, source: 'pinned'|'measured'|'setup', auto } | null
```

It is pure by construction — no I/O, no imports beyond what `tdee.js` already
has, and **no `Date.now()`** — precisely so it can be copied without a diff.

### The three things a copier must not lose

**An absent `maintSrc` reads as PINNED, not as setup.** This is the whole safety
property of the ship. Eight accounts have a stored `maint` and no `maintSrc`, and
nothing stored can tell a setup guess from a number somebody typed. If absent
read as "setup", every one of them would silently start quoting a different
maintenance number on the morning this lands — including anyone who chose theirs
deliberately. An unrecognised value reads as pinned for the same reason.

**A tdee of `0` is not an estimate.** The guard is `> 0`, not
`Number.isFinite()`. Both web readers this replaced tested truthiness, and
`calorieZones(0)` returns null, so a finite-only check would hand a zero
maintenance to the calorie bar.

**Expiry is a READ-SIDE decision. Nothing is rewritten in the database.** When
the model gains an estimate, the setup number stops being preferred; it is not
deleted. So if the model later loses its estimate — a fortnight without logging —
the setup number is what shows again, from the same stored record. That
reversibility is the property, and it comes for free from the function being
pure. Do not "tidy" it into a migration.

### The three readers

Each keeps its existing return shape as a thin adapter, so no call site
downstream changed. Do the same in native.

| Web | Shape it hands back | Native destination |
|---|---|---|
| `food.js` `maintInfo()` | `{ cal, auto, source }` | the Fuel store — whatever feeds the calorie bar under `src/state/` |
| `you.js` `maintInfo(est)` | `{ cal, pinned, source }` | the You cards' maintenance input, `src/ui/you/cards.jsx` + its store |
| `weight.js` `renderTDEE` | uses `eff` directly | the Weight tab's maintenance card, `src/ui/weight/` |

`pinned` is kept in the You shape because the cards read it, and it still means
"this was not measured". `source` is the finer answer, and it is what the
explain-yourself text needs: a setup guess is not a number anybody chose.

**Web's `maintInfo()` now computes `maintenance()` on every call** rather than
only when nothing is stored, because which number wins is no longer a question
that function is allowed to answer on its own. It is called a dozen times per
render and it is cheap — the model's answer is a filter over three weeks of day
keys. If native memoises it, memoise on the model's identity too, not on the
weigh-ins alone: `refreshModel()` changes the answer without changing the
entries.

### `maintSrc` is written in exactly one place at setup

| | |
|---|---|
| Web | `onboarding.js` — the `food/targets` write in `finish()` |
| Native | `src/state/onboarding.js` — the matching setup write |

```js
maint: a.maint || null,
maintSrc: a.maint > 0 ? 'setup' : null,
```

That key is what makes the promise the setup screen has always made ("after a
couple of weeks of weigh-ins Rack replaces it with a number measured from your
own data") true for the first time.

### The Daily-targets sheet — the trap that cost the most thought

| | |
|---|---|
| Web | `food.js` → `maintPatch(box, initial, prior)` |
| Native | the Fuel targets screen |
| Port | **Copy `maintPatch` verbatim.** The screen around it is a rework. |

The sheet used to PREFILL the maintenance box with `targets.maint`. The moment
`maintSrc` exists, that means somebody who opens Daily targets to change their
protein and taps Save has silently promoted a guess into a pin the app then
follows forever.

So: **the box is only ever prefilled with a number somebody CHOSE.** A setup
number is the PLACEHOLDER instead ("2,400 from setup", or the measured estimate
once there is one), and the patch is decided against what the box held when the
sheet opened:

```
untouched   -> both keys exactly as they were
a number    -> { maint: n, maintSrc: 'pinned' }
emptied     -> { maint: null, maintSrc: null }
```

`maintPatch` takes `initial` as an argument rather than reading
`input.defaultValue`, because setting `.value` on an element does not move
`defaultValue` and the comparison would never fire. In RN there is no
`defaultValue` at all, so hold the opening string in a ref.

### The one-time question

| | |
|---|---|
| Web | `weight.js` → `maintAskEl()` + `answerMaint()` |
| Native | the Weight tab's maintenance card |
| Port | Rework the view; copy the CONDITION and the two writes exactly. |

Shown only when all three are true, which is "there is a stored number, nothing
says where it came from, and Rack now has a measured one to offer":

```js
stored != null && t.maintSrc == null && Number(t.cal) > 0     // and m.tdee != null
```

- **Use my measured number** → `{ ...cur, maint: null, maintSrc: null }`
- **Keep N** → `{ ...cur, maintSrc: 'pinned' }`

**Neither answer needs a flag to remember it.** Each one breaks the condition
above for good — the first clears `maint`, the second sets `maintSrc`. Do not
add a `maintAsked` key; it would be a second record of one fact and the two
would eventually disagree.

Dismissing without answering writes nothing and the card comes back, which is
the right way round for a question nobody has answered.

Two things in `answerMaint` that are not decoration:

- It **re-reads with `readExact` before writing**, rather than reusing the copy
  the render read. This is a whole-node PUT of `food/targets`, and `read()` folds
  "not there" and "could not be reached" into the same fallback — so writing that
  copy back is how a pair of buttons erases somebody's calorie target. `readExact`
  tells the two apart and throws on the second.
- The buttons disable while it writes and come **back** if the write did not
  land. An unanswerable question with two dead buttons is the worst of the three
  outcomes.

### Auto targets — prove the gate, don't just keep it

| | |
|---|---|
| Web | `food.js` → `autoPlan(targets, maintCal, lb, now)` |
| Native | the auto-targets recompute in the Fuel store |
| Port | **Verbatim**, clock included as an argument. |

A setup number expiring can move maintenance by a few hundred kcal in one
render. The one thing that must not happen is the calorie target moving with it
there and then. The weekly gate (`auto.lastAdj`) is what stops that, and a gate
is only as good as the proof it is still in the path — which is why the decision
was pulled out of `applyAuto()` into a pure function that takes `now`.

`applyAuto` also assigns its module state **after** the write resolves now. That
matters more than it looks: `lastAdj` is the gate, so state holding a stamp the
database refused would close the gate for a week on an adjustment that never
happened.

---

## 2. A ticked set with reps is never dropped

THE RULE, and it is word for word the same sentence in both trees:

> A set is recorded when it is ticked and has reps. A blank weight on a recorded
> set is stored as the string `'0'`. A blank reps box is still an unfilled set
> and is dropped. The live session is not changed — the blank stays blank on
> screen; the `'0'` exists only in the record `collectDone` builds.

| | |
|---|---|
| Web | `workout.js` → `collectFrom(exercises)`, with `collectDone()` as the live session's one-line caller |
| Native | `src/state/workout.js` |

**Verify before porting.** The brief this ship was written from says native
already carries this rule from its own run. At `85be276` it did **not**:
`src/state/workout.js:692` still read `s.w !== '' && s.r !== ''`, and
`src/state/onboarding.js:271` still described the defect as open. If that run
landed, there is nothing to do here; if it did not, this is the change:

- the filter becomes `s.done && s.r !== ''`
- the map becomes `w: s.w === '' ? '0' : s.w`
- the block check box's fillable test becomes `s.r !== ''` — it promises to
  match `collectDone` character for character, and that promise is the reason
  the box can be trusted

**`w` STAYS A STRING.** Both clients read it as one, the rules expect one, and
~2,500 stored sets are strings. `'0'`, never `0`.

Three things the web ship also did that a port should carry:

- The tooltip on the block check box said "has a weight and reps in it". That
  described the old rule and is now simply wrong.
- The Train tour card and the coach-mark hint line — **two strings teaching one
  rule, which move together in both trees** — are deliberately UNCHANGED. Both
  still say to fill in the weight, and both are still right: that is the ordinary
  set. Only the comments around them changed.
- Nothing was taught to PRINT a `w: '0'` yet. It shows as `0×12` everywhere. The
  fix is one change to `fmtSetW` and it should be written once for both trees —
  it is logged in `BACKLOG.md` with the eight render sites.

---

## 3. A refused save — the diff, not a port

Native solved the first half on 14 Sep and web ported `isRefusal` / `refused`
from it **verbatim**, so the two trees agree on what counts as a refusal:
`PERMISSION_DENIED` in either `e.code` or `e.message`, uppercased and matched as
a substring, because the SDK builds the error two different ways and a failed
`.validate` arrives as that same code.

Do not let those two functions drift. Everything below is where the trees
deliberately differ, and each is a decision to make on purpose rather than a bug
to reconcile.

| | Native (`85be276`) | Web (v40) |
|---|---|---|
| `write()` on a refusal | reports, rolls the mirror back, **returns** | reports, rolls the mirror back, dead-letters, **throws** |
| Merge branch | none — `write()` is always a `set()` | the guard's merge branch behaves identically to the set branch |
| The partial-mirror mark | no such mark | captured before the write and restored with the value |
| `flushQueue` on a refusal | drops the item, deletes the mirror | drops the item, deletes the mirror, **dead-letters the payload** |
| Queue dedup on replay | last-write-wins per path | none |
| A kept payload | nothing kept | LS key `refused`, bounded at 50 |
| Recovery UI | none | one Settings row + a sheet with Try again / Discard |

**The throw-versus-return choice is the one that matters**, because it decides
whether every caller has to cope. Web threw because `write()`'s docstring has
promised `@throws if the write is refused` since v32 and the destructive-write
guard already threw — so the callers had to cope either way, and half of them
already did. If native returns instead, nothing above it can tell a refusal from
a save, which is the exact failure the ship was about. Pick one.

If native adopts the dead-letter list, three rules came out of building it:

- **The path stored is the full `users/{uid}/…`**, so the same `mine` prefix
  check `flushQueue` uses keeps one account from seeing or retrying another's.
  The storage key is already namespaced by uid; this is the second lock on the
  same door.
- **A `workouts/` payload is never evicted to make room for anything else.** It
  is the only thing in the list with no second copy on the device, because
  `runFinish` deletes the live session the moment the record write resolves. The
  oldest ordinary item goes first; a session is only dropped for another session.
- **It is never replayed automatically.** That is the entire difference between
  this list and the queue, and it is the point: replaying a rejected payload on a
  timer is how a too-strict rule becomes an infinite loop nobody can see.

### `runFinish`, which is the same shape in both trees

With a throwing `write()`, the record write is wrapped and the function returns
on a refusal. Everything below it is untouched: `activeSession` is still on the
device, history is unfolded, no recap exists, `finishing` is released by the
`finally`, and Finish can simply be tapped again — a second tap does the whole
thing once, not twice.

Everything after the record write is DERIVED. A refusal in the history fold or
the month cache is reported and must not fail the finish. And on both history
paths module state is assigned **after** the write resolves, because the fold is
not idempotent and state holding a folded index over a refused write is a
double-fold waiting for the next finish on the same day.

---

## 4a. A routine's target weight — already right in native

| | |
|---|---|
| Web | `routines.js` — the preview row in `openRoutine()` |
| Native | `src/ui/train/routines.jsx:227` |

Nothing to do. Native already reads

```js
sets.map(s => (s.tw ? fmtSetW(s.tw, u) + '×' : '') + (s.tr || '–')).join('  ')
```

Web was printing `s.tw` raw, so a metric account read its own routine in pounds
with no unit label anywhere near it. The web copy now matches native character
for character. **This is the one row in this file where the port direction was
backwards** — worth noticing, because it means the native tree is no longer
strictly behind and a blind copy web → native can now undo a fix.

---

## Traps hit while building this

- **`maintSrc: null` is safe to write.** RTDB drops a null child on a `set()`, so
  the key ends up absent; the local mirror keeps the literal `null`, and
  `effectiveMaint` reads `null !== 'setup'` as pinned. Both paths agree. If
  native's store serialises differently, check that one.
- **Every writer of `food/targets` must carry `maintSrc` forward.** There are six
  in web — onboarding, `applyAuto`, both branches of the targets sheet,
  `setGoal`, and the Weight tab's answer — and every one of them spreads the
  prior object. A writer that names its keys instead would silently clear the
  provenance on the next goal change.
- **`food/targets` has no `$other` validation block** in the published rules or
  in the PROPOSED set, so an unlisted key lands rather than being refused. That
  is why `maintSrc` works today and also why adding it to the PROPOSED rules is
  about getting it VALIDATED, not about making it work.
- **The Weight tab's "Fuel is using this" sentence was false more often than
  true** before this, and it is worth checking the native equivalent for the same
  claim. It said Fuel used the measured estimate whenever nothing was pinned, and
  setup wrote a starting number for everybody who did not skip it.
- **Three existing verifiers lift functions out of `workout.js` by text**
  (`blocks`, `merge-invariant`, `month-erasure`). Adding an `export` keyword to a
  lifted function broke all three, because the slice carried the keyword into a
  `new Function`. Their lifters tolerate and strip it now. If native grows the
  same kind of verifier, build that in from the start.

---

## What to run

The web tree has four verifiers that are relevant here, all of which drive the
real modules with Firebase stubbed and hold no copy of the logic they check:

```
tools-check/maintenance.mjs       45 checks — the precedence, expiry, the sheet, the gate
tools-check/bodyweight-sets.mjs   39 checks — the rule, and every consumer of a w:'0' set
tools-check/refused-write.mjs     73 checks — refusal vs network, on both write branches
tools-check/units.mjs            116 checks — including the double-conversion scan
```

The native tree has no equivalent of any of them. Sections of all four are pure
and would run against native's own copies with the imports repointed — which is
the same request `NEXT-NATIVE-UNITS.md` §11 has been making since v34.
