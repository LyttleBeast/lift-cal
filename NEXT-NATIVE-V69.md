# Porting rack-v69 to rack-mobile

Web ships as `rack-v69`, built on `rack-v68` (`93d9ca4`). The tree it mirrors is
`~/dev/rack-mobile`.

v69 is **Coach's engine fences, and the battery in the repo** — the first ship
of Coach v2 (`COACH-V2-SPEC.md` §6, `BUILD-PLAN.md` ship 1). Three pure Coach
files change and nothing else that native mirrors does. **No stored field is
added or changed, no node, no database rule, no migration.** Nothing in
`database.rules.json` or the Worker moves. Every word Coach says stays in the
third person (the voice is rack-v71).

---

## 1. The pure files, verbatim

Copy the three across byte for byte and re-pin their hashes in
`tools/verify-coach-*-verbatim.mjs` in the same commit:

| file | sha256 (web, rack-v69) |
|---|---|
| `coach-prog.js` | `0a30108265842297f9f20c49dec92e76c70e80b9b1f8f57983f528832a482956` |
| `coach-live.js` | `800cdfafd6efd3e5b030cc66698ee9bcc3f16d5f1913c9f89619a7d6e6b55dc9` |
| `coach-overlap.js` | `ae1f822ae1b1ef3d374aa56e0f1eba423764a436815d435bc379d2490e019960` |

(`node -e` over `createHash('sha256')` on the file bytes.) Their imports are
unchanged — `src/pure/` needs no new file — and `coach.js`, `coach-build.js`,
`coach-volume.js`, `coach-goal.js`, `coach-tags.js`, `coach-ready.js`,
`coach-fuel.js` are untouched.

What changed, so the port's own verifiers know what to hold:

### `coach-live.js` — a set rated too hard stops "one more set"

`fatigueIn(sets)` reads `rir === 0` (the integer zero, the same test
`coach-prog.js rirOf()` makes) beside a set typed `F` and the rep drop, as
`{ kind: 'hard' }`; `fatigueWords` says "a set you rated too hard"; the "one
more set" why-line says ", none rated too hard,". Until v69 the four answers
learned of a too-hard rating only through the next set's stop, which needs a
target in hand, so with no target Coach said "one more set is usual" over a
set he had just called too hard.

### `coach-prog.js` — never a heavier single or double; the held-load range

- `isHeavy(e)` — top sets of two reps or fewer, or a lone top set of three or
  fewer. `decide()` refuses such a day a target (doubles too, now); `rangeOf()`
  reads no pair with a heavy member and skips heavy exposures in the fixed-rep
  tally; `stepOf()` skips those pairs. A range whose bottom is two is refused
  with the same `defer('heavy')`; a last fence in the `add` branch refuses any
  target with a top set of two or fewer above last time's load.
- `stepOf()`: on a barbell lift a jump bigger than twice the default step
  needs three sightings, not two.
- The held-load range (spec §6.5): the three newest regime sessions before the
  one being judged, all straight sets at one load, none heavy, teach the band
  they ran over when it is no wider than four and bottoms at three or more —
  `{ …, source: 'yours', stage: 'learning', held: 3, heldT }`; the target's
  `range` carries `held: 3`. Words: "Inside the 8–10 you’ve held 185 lb at
  for three sessions, and 9, 9, 8 at 185 lb last time." / ", the top of the
  8–10 you’ve shown there." The default band's micro stretch (two more reps
  before a jump over a tenth of the load) applies to a held band too.
- New constants: `HEAVY_REPS 2`, `HEAVY_TOP_REPS 3`, `BIG_STEP_SEEN 3`,
  `HELD_SESSIONS 3`, `HELD_SPREAD 4`, `HELD_MIN_REPS 3`.

### `coach-overlap.js` — no record day after a marked or failed session, or across a layoff

`record()`: a lift whose `ex.mark.latest` exists (coach.js `liftsOf()` sets it
exactly when the newest exposure is marked) gets no record day; the best to
beat, and the best reps at each load, are read over the tops since the last
gap of more than `RECORD_GAP_DAYS` between consecutive ones, three of them at
least (`RECORD_SINCE_GAP 3`), never the whole log.

## 2. The verifier cases to port

Add the same cases to native's own verifiers, importing the verbatim files:

| native verifier | cases (from the web file of the same name) |
|---|---|
| `tools/verify-coach-live.mjs` | `tools-check/coach-live.mjs` section C2: one set rated too hard with no next-set function handed in is never "one more set"; ratings 2 and 4 change nothing; the done read names "a set you rated too hard"; only the integer zero counts. The v54 "targets off, whatever the rating" check is rewritten to the new rule. |
| `tools/verify-coach-prog.mjs` | `tools-check/coach-prog.mjs` section J (a)–(e): twelve single-plus-back-off days never bottom a range at two and are `defer('heavy')`; 5 × 2 four sessions running is `defer('heavy')` while 5 × 3 keeps its target; a sweep finds no `add` with a top set ≤ 2 above last time's top and every heavy last day a heavy defer; 10,10,9 → 9,8,8 → 8,8,8 at 185 reads 8–10 held and 8,7,7 after it is `hold('miss')`; 135 → 155 → 175 keeps the default 5 until the 20 is seen three times; a rise into a heavy day teaches no step; kilo mirrors. Row A34b expects 8, 8, 8 at 190 (the held band), not 6. If native pins byte-identity against an older engine the way section D/H do, it must allow the histories a v69 rule touches (range or step baseline moved, a held range, a heavy defer) — see the web file. |
| `tools/verify-coach-overlap.mjs` | `tools-check/coach-overlap.mjs` section A2: marked newest → null; a mark on an older session leaves the candidate; an F in the newest, marked or not → null; a 60-day gap with two sessions since → null; three since → 7 at 225 against the post-gap best (225 × 6), never 9; the no-gap control reads the whole log. |
| `tools/verify-drop-sets.mjs` (if it has the v54 identity sweep) | a log with a gap of more than three weeks may name a different record day than v54; leave the record day out of the comparison on those (web `drop-sets.mjs`). |
| the version pin (web: `friends-structure.mjs` G) | `rack-v69`. |

## 3. The battery

Copy `tools-check/battery/` whole into `tools/battery/` — `generator.mjs`,
`scoring.mjs`, `harness.mjs`, `properties.mjs`, `regress.mjs`,
`regress/*.json` (13 cases), `repro.mjs`, `stage.mjs`, `rng.mjs`,
`run-all.sh`, `README.md` — and point `stage.mjs` at `src/pure/`: its
`stageCoach(root)` reads `coach*.js`, `analytics.js`, `units.js`,
`exercises.js`, `ui.js`, `coach-tags.js`, `coach-goal.js`, `blocks.js` from
`root`; its import repointing already handles `./x.js`, and the stub list is
unchanged because `src/pure/analytics.js` has the same imports. `run-all.sh`
defaults `--repo` to `tools/battery/../..`; pass the `src/pure` path instead,
or change that one line. Add `tools/battery/out/` to `.gitignore`.

The gate for native is the web's: `bash tools/battery/run-all.sh` with
`GATE=engine` (the default) — properties pass, the nine engine-code regression
cases pass (the four `N_STOPPED` / `L_ANOTHER_DROP` / `N_WARMUP` / `V_OVER`
cases are rack-v70's and still fail), **engine wrongs 0**. On the web at this
ship: 0 engine wrongs, 5,513 untagged-warmup wrongs, `T_DEFER` on
`intermediate_double` 18.8% (37.1% before). The generator's one rule: a draw
order is never changed in place (`R.fork()` for new draws).

## 4. The impure seams

None. `coach-data.js` / `src/state/coachData.js` are untouched; `coach-ui.js`
and the native Coach screens draw the same fields (`range`, `step`, `line`,
`why`, the live read's `kind` / `text` / `short` / `why`) — `range.held` is new
and read by nothing on a screen.

## 5. The schema

None. No field, node, rule or migration. `web-patches/database.rules.PROPOSED.json`
does not change for this ship.
