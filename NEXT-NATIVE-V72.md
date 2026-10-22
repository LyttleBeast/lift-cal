# Porting rack-v72 to rack-mobile

Web ships as `rack-v72`, built on `rack-v71` (`99623bd`). The tree it mirrors is
`~/dev/rack-mobile`.

v72 is **the end-of-workout check-in and the knowledge store** — Coach v2 ship 4
(`COACH-V2-SPEC.md` §3 and §4, `BUILD-PLAN.md` ship 4). Coach asks questions now,
and keeps what he answers. One new pure module, `coach-ask.js`; `settings/coach`
goes to `v: 2` with three new keys (`know`, `knowBy`, `tally`) and two kinds of
per-item `asked` stamp; the recap draws three slots under the finish line; two
answers rewrite the session record. **Nothing in the published rules moves**
(`database.rules.json` is byte-identical to rack-v71). **The native PROPOSED
rules must gain §5's block before the phone can write `settings/coach` at all**
— they end in `$other: false`, and the first `learnBy()` would be refused.

---

## 1. The pure files, verbatim

Copy across byte for byte and re-pin the hashes in `tools/verify-coach-*-verbatim.mjs`
in the same commit. `coach-ask.js` is new and gets its own pin.

| file | sha256 (web, rack-v72) | changed in v72 |
|---|---|---|
| `coach-ask.js` | `dd337f9ed2b5564e5458885f44181783ff69b9552c7174c20fe3e2742902e1a5` | **new** |
| `coach.js` | `af14f169cda3035bc88fc1f3026d0c45740c96f2a450c753ddc37b808d1aaedf` | yes — imports `coach-ask.js`; `QUESTIONS` is the catalog's `answers` subset; `normSettings` v2; `coach.openQuestion` per lane; `pendingQuestion`/`questionUnder` on `pickQuestion`; `coach().debrief(record, extras)`; `warmOf()` on every working-set count, `warm` on each lift, `warm` maps on the live and volume inputs |
| `coach-prog.js` | `30076737e7bac81f486927c54da4cb0dc1f20aea0bf80e7e6343c03dac1e8905` | yes — `liftOf()` reads `ex.warm`; `readAll`/`readExposure`/`rampLoads`/`rampOf`/`rampProfile` take it |
| `coach-live.js` | `37a5f68ce62f36058c96a076fa6af035c43f92606481a5f989fa5a579b416aef` | yes — `i.warm` (exId → 'yes' \| 'no') into `workingOf`/`knownOf` |
| `coach-volume.js` | `a2286478abac8c30ff8a272f24cead6e45ccef8d5c8d8697413c0081bf65c8bc` | yes — `i.warm` into `hardSets`/`dropped`/`knownOf`/`countSession`; `hardSets(sets, assisted, known, warm)` |
| `coach-ramp.js` | `b4d5dbc9726b867922b62e27f5fe5c2a812fe0df1dd3b293bfe0e48d7d798e79` | no (its `warm: 'no'` switch was there since v70; v72 is the first to pass it) |
| `coach-build.js` | `4a48d9432e1c18356d9fb138a4828b6eb02e7bab06bb3bd6108bc1b6ccad7763` | no |
| `coach-overlap.js` | `28c2a27fe8fb41815f9e5ace24f86b4939e6d007e9819af60a685a8cabec39d1` | no |
| `coach-ready.js` | `e0e58432ffbe1c55edca682f68f9ecf26b9c9f94702b11050bd11d4088f10a1d` | no |
| `coach-fuel.js` | `66d6941d1fb3967f85de402b41d699cf3578a2029e2f2a4e784a93f3958d2dd0` | no |
| `coach-goal.js` | `139e04b0750c884e803e553ebda9931dc8ccdf8400b581b8919f50decfaff411` | no |
| `coach-tags.js` | `4bffed387010c0d6ebcf8850bb1f3b25a8943cdd5c6b483d2413dc31d6f6ec29` | no |

(`sha256sum` on the file bytes.)

### What `coach-ask.js` exports, so the port knows what to hold

- `KNOW_KEYS` — the five facts and their bounds (`back`; `warm`, `step`, `hold`
  by `exId`; `wantNext` by shape key). v72 writes `knowBy.warm` only.
- `ID_RE`, `SHAPE_RE`; `DAY_BUDGET` 2, `WEEK_BUDGET` 6; `WARM_ASK_DAYS` 28;
  `warmStamp(exId)` → `'warm:' + exId`.
- `normKnow(raw)` → `{ know, knowBy, tally }` (each `{}` when empty — the caller
  adds the key only when something survives); `knowOf(settings, key, id, now)`
  → `{ v, c, n, at, expired } | null`; `nextFact(prev, v, now)`;
  `warmStyle(settings)` → `'ramp' | 'none' | 'mixed' | null`;
  `warmAnswer(settings, exId, now)` → the unexpired value or null.
- `budgetOf(settings, now)` → `{ dayLeft, weekLeft }` from the `asked` stamps
  of D-rows — a row's own id **and** its per-item stamps (`q_pr_how:<recordId>`).
- `ASK_QUESTIONS` (nine rows), `askQuestion(id)`, `aimLabel(aim)`,
  `rampLoadsText(loads, u)`.
- `pickQuestion(d, moment, settings, now, opens, ctx)`,
  `warmRamp(record, settings, now, lib)`, `prSetOf(record, prs)`,
  `debriefPlan(d, record, settings, now, opens, ctx)`.

### Two things that differ from the prompt's sketch, deliberately

- `debriefPlan` takes a sixth argument, `ctx = { prs, harder, marked, u }`:
  `feelHarder()` and the marks live in `coach.js`, which the pure fence forbids
  `coach-ask.js` from importing, so `coach.js`'s `debriefRead()` works them
  out and hands them in. Native's `recap-view.js` does the same (§3).
- `warmRamp` takes `now` and the merged `lib` (the question names the lift the
  way the picker does, and the 28-day stamp needs the clock).

## 2. The store — `src/state/coachData.js`

`patchNow` (574–597) merges three more keys beside `marks`, one level each:

```js
know:   { ...(fresh.know || {}),  ...(change.know || {}) },
knowBy: mergeBy(fresh.knowBy, change.knowBy),          // each knowBy.<key> one level
tally:  { ...(fresh.tally || {}), ...(change.tally || {}) }
```

and, after `normSettings()`, prunes every `asked` key that starts `warm:` or
`q_pr_how:` whose stamp is more than 56 days old (whole days, noon to noon —
the `staleMarks` pattern). `patch(change, more)` gains an optional second
argument, a function of the fresh node whose result is merged into the change,
because the facts' ladder has to climb from what is **stored**:

```js
export function learn(key, v)        // KNOW_KEYS[key] scalar → patch({}, fresh => ({ know: { [key]: nextFact((fresh.know || {})[key], v, Date.now()) } }))
export function learnBy(key, id, v)  // keyed → patch({}, fresh => ({ knowBy: { [key]: { [id]: nextFact(((fresh.knowBy || {})[key] || {})[id], v, Date.now()) } } }))
export function learnTally(delta)    // patch({}, fresh => ({ tally: { k: min(999, max(0, (fresh.tally?.[k] || 0) + delta[k])) } }))
```

Each resolves `false` when the key is not in `KNOW_KEYS` (or the wrong kind).
`markAsked` is the recap's door, beside ; the plan carries  for the eyebrow.  is unchanged and is what stamps `warm:<exId>` and
`q_pr_how:<recordId>`. `answerQuestion` is unchanged.

## 3. The recap — `src/pure/recap-view.js` decides, the screen draws

The web's `renderSummary()` asks `coachDebrief(record, { prs })` (coach-data.js:
`coach(coachInput({})).debrief(record, extras)`, the feel row alone on a throw) once, when the recap first draws, and keeps the plan on the summary (an answer
removes its row; a repaint never re-asks). `saveFeel()` drops the cached plan
so a harder rating hands the question slot to `MARK_ASK`. The plan:

```js
{ confirm: { exIdx, exId, name, idx: [...], loads: [...], text, options, oneTap? } | null,
  feel: boolean,                     // !mute.feel — AND the screen keeps isMuted(settings, 'feel')
  question: { id, text, options, ack, writes, stamp, pr? } | null }
```

Three rows in one card, then a small **Not now**:

1. **Confirm** — eyebrow `'Quick one before you go.'` or `'One thing I want to
   get right.'` by `opens % 2`; `confirm.text`; chips from `confirm.options`
   (*Yes, tag them* `'yes'`, *No, working sets* `'no'`, *Not now* `null`), or
   with `oneTap` one chip `'Tag ' + n + ' warm-ups'` with the *Yes* behaviour.
   Yes → `retagWarmups(exIdx, idx)`; on success `learnBy('warm', exId, 'yes')`,
   `markAsked('warm:' + exId)`, the row becomes the option's `ack`. No →
   `learnBy('warm', exId, 'no')`, `markAsked(...)`, ack. Not now →
   `markAsked(...)`, the row goes. A refused retag re-enables the chip and
   changes nothing else.
2. **Feel** — the shipped card, unchanged (it owns `MARK_ASK` after a harder
   rating).
3. **Question** — `question.text` and chips. `q_pr_how` → `setRirOnRecord(
   question.pr.exIdx, question.pr.setIdx, value)`; a `writes: 'answers'` row →
   `answerQuestion(id, value)` as the sheet does. Then `markAsked(question.stamp)`
   (the per-record stamp for `q_pr_how`) and the `ack`.

**Not now** on the card: `markAsked('warm:' + exId)` when a confirm row was
drawn and not answered, every slot marked done, the card removed. Nothing is
written on paint — every write is behind a chip (`tools-check/recap.mjs` F).

## 4. The writers — `src/state/workout.js`

One helper, two writers, the `saveEdit` path (the whole session node, never a
container):

- `rewriteRecord(next)` — `hydrateForWrite(mk)`; `record = { ...next, volume:
  computeVolume(exercises), groups: recordGroups(exercises) }`; `write(
  'workouts/{mk}/{dd}/{id}', record)`; on failure toast
  `'Not saved — the question is still here.'` and return `false` with nothing
  in memory moved. On success: the month cache, `invalidate()`,
  `refreshCoachSessions()`, `summary.record`, `detectPRs` and
  `sessionMilestones` over the new record, `summary.finish =
  coachFinishRead(...)`.
- `retagWarmups(exIdx, idx)` — `sets = idx.reduce((s, j) => retypeSet(s, j,
  'W'), ex.sets)` (analytics.js, so a drop set stays linked), `rewriteRecord`,
  then `history = retagHistory(history, exId, dateK, idx, ex.sets.length)` and
  `write('history', history)` — a refusal here is tolerated (the next fold or
  rebuild corrects the index).
- `retagHistory(h, exId, dateK, idx, nSets)` — pure, exported: the row of
  `h[exId]` whose `date === dateK` gets `type: 'W'` at `idx`, **only when the
  row holds exactly `nSets` sets**; otherwise `h` itself comes back.
- `setRirOnRecord(exIdx, setIdx, rir)` — `sets[setIdx].rir = rir` (an integer),
  `rewriteRecord`.

`tools-check/warmup-retag.mjs` is the web's verifier of all four.

## 5. The schema — `web-patches/database.rules.PROPOSED.json`

`settings/coach` ends in `$other: false` there, so **every native write of
`settings/coach` is refused until this block is added** beside `marks`. The
`v` key's `.validate` must accept `2`. Verbatim (AGENTS.md `settings/coach`
v72, `COACH-V2-SPEC.md` §3.5):

```json
"know":   { "$k": { ".validate": "$k.matches(/^[a-z][A-Za-z0-9]{0,23}$/) && newData.hasChildren(['v','c','at','n'])",
            "v": { ".validate": "(newData.isString() && newData.val().length <= 12) || newData.isBoolean() || (newData.isNumber() && newData.val() >= 0 && newData.val() <= 100000)" },
            "c": { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 3" },
            "n": { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 9" },
            "at": { ".validate": "newData.isNumber() && newData.val() > 0" },
            "$other": { ".validate": false } } },
"knowBy": { "$k": { ".validate": "$k.matches(/^[a-z][A-Za-z0-9]{0,23}$/)",
            "$id": { ".validate": "$id.matches(/^[A-Za-z0-9_+-]{1,40}$/) && newData.hasChildren(['v','c','at','n'])",
              "v": { ".validate": "(newData.isString() && newData.val().length <= 12) || newData.isBoolean() || (newData.isNumber() && newData.val() >= 0 && newData.val() <= 100000)" },
              "c": { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 3" },
              "n": { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 9" },
              "at": { ".validate": "newData.isNumber() && newData.val() > 0" },
              "$other": { ".validate": false } } } },
"tally":  { "$k": { ".validate": "$k.matches(/^[a-z][A-Za-z0-9]{0,23}$/) && newData.isNumber() && newData.val() >= 0 && newData.val() <= 999" } }
```

If `asked` is enumerated there, its `$id` rule becomes
`/^(q_[a-z_]{1,40}|vol_neglect|bal_custom|warm:[A-Za-z0-9_-]{1,40}|q_pr_how:[A-Za-z0-9_-]{1,40})$/`.
Add it through `tools/rules/build.mjs`, never by hand in the generated file.
The web's published rules need nothing: `settings` has a section-level
`.write` and no `$other`.

## 6. The verifiers to port

| native verifier | cases (from the web file of the same name) |
|---|---|
| `tools/verify-coach-ask.mjs` (new) | A the catalog (nine rows, `changes` name registered intents, `QUESTIONS` is the `answers` subset, the words in both units); B `normKnow` round-trips every option value and every integer in range, drops junk (`c: 7`, `v: 'maybe'`, an id with a slash, a 61st id — oldest `at`), never throws; `nextFact` 1 → 2 → 3 and the reset; `knowOf` expiry; `warmStyle`; C `budgetOf` over 10,000 generated days — no day over 2, no week over 6 — with per-record stamps; D `pickQuestion` deterministic, null under `mute.questions`, the gate decides; E `warmRamp` on his untagged squat day (idx [0..4]), nothing on `no`, on a 10-day stamp, on a tagged day; a duplicated block read alone; F `debriefPlan` through `coach().debrief` — never both confirm and a warm-up question, none under three working sets or cardio alone, none on the day's second session, `q_pr_how` only with an unrated record set, the budget, a harder rating, a mark, `mute.feel`, `mute.questions`, `warmStyle` ramp/none, an edit, an unreadable log |
| `tools/verify-warmup-retag.mjs` (new) | A–E above, §4 |
| the recap cases (`verify-recap`-equivalent) | F: the three rows in order, nothing written on paint, Yes → one whole-node write with `WWWWWNNN` and the volume down, the fact and the stamp, the ack on a repaint; No → the fact and the stamp, no record write; Not now on the row → the stamp alone; `q_pr_how` → `rir` on the set and a `q_pr_how:<id>` stamp; a refused write leaves everything and the chips; Not now on the card; a 90% rating → `MARK_ASK` and no question row, and the open lane silent for the day after a mark; an ordinary day → the feel row alone; kilos |
| `tools/verify-coach-state.mjs` | E: a v1 node → v2 with no `know`; the §3.5 node round-trips; junk dropped; `warm:x` kept, `warm:bad/id` dropped |
| `tools/verify-coach-registry.mjs` | F over `ASK_QUESTIONS`; L: `knowBy.warm` no stops the confirm row and gives the target every row (`ramp` on none), the finish line counts 11 sets not 6 |
| `tools/verify-coach-pure.mjs` | P: `coach-ask.js` imports units.js and coach-ramp.js only, no clock, no state; its `dayKey`/`noon`/`daysBetween`/`rotate` byte for byte coach.js's |
| the battery | `generator.mjs` `knowBy.warm` from a fork at the end; `harness.mjs` `warmNo`; `scoring.mjs` `T_CONTRADICT` |
| the version pin | `rack-v72` |

## 7. The settings screen

Nothing new is drawn: Settings → Coach reads `QUESTIONS` (the seven) as before.
`q_warm_confirm` and `q_pr_how` are never Settings rows (`writes: 'record'`).
`src/ui/settings/registry.js` and `src/pure/settings-registry.js` are unchanged
on the web.
