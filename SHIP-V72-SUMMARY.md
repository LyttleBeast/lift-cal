# rack-v72 — the end-of-workout check-in and the knowledge store

Shipped 22 Oct 2026 on branch `ship-v72`, from `rack-v71` (`99623bd`). Coach v2
ship 4 of six (`COACH-V2-SPEC.md` §3 and §4; `BUILD-PLAN.md` ship 4;
`/home/claude/coach-v2/SHIP-V72-PROMPT.md`). Micah: "coach can read the numbers
but it can't read you unless it asks questions." This is the question machinery
and the first three questions that need it: the warm-up confirmation on the
recap, "did that record have more in it?", and the store every later question
writes to.

**Nothing in the published rules moves.** `database.rules.json` and
`database.rules.OPTIONAL-LOCK.json` are byte-identical to rack-v71 (checked
against `99623bd`). Everything this ship stores is a child of the already
granted `settings/coach` (section-level `.write`, no `$other` on `settings`) or
a field on a session record under `workouts`. No Worker change.

## What changed

**Phase A — `coach-ask.js`, new pure module (725 lines).** Imports `units.js`
(`labelW`, `labelRate`, `fmtW`) and `coach-ramp.js` (`rampOf`) and nothing else;
`now` is always an argument; `dayKey`/`noon`/`daysBetween`/`rotate` are
coach.js's five lines written again and held byte-for-byte equal by
`coach-pure.mjs` P (the fence forbids the import the other way). It holds:

- **The facts.** `KNOW_KEYS` (`back`; `warm`, `step`, `hold` by exId;
  `wantNext` by shape key — bounds and TTLs as the brief lists them; `step` in
  pounds), `normKnow()` (the one reader of the stored shape: junk dropped, never
  thrown, ≤ 60 ids per key with the oldest `at` going, stored order kept),
  `knowOf()` (the one read path; past its TTL a fact keeps `v` as a prior and
  reads `c: 1`, `expired: true`), `nextFact()` (1 → 2 → 3, `n` to 9, a changed
  answer starts over), `warmStyle()` (≥ 3 yes and no no → `ramp`; ≥ 3 no and
  no yes → `none`; else `mixed`/null), and `warmAnswer()` — the unexpired value
  or null, which is what every engine reader takes.
- **The budget.** `budgetOf()`: two D-questions a day, six an ISO week (Monday
  first, local day keys), from the `asked` stamps alone — a row's id **and** its
  per-item stamps. See decision 2.
- **The catalog.** `ASK_QUESTIONS`: the shipped seven moved here by moving the
  array (`moments: ['open']` or `['under:targets']`/`['under:goal']`/
  `['under:fuel']`, `writes: 'answers'`, `cooldownDays: 7`, `budget: 'D'`, every
  `fact`/`when`/`stale`/`always`/`settings`/`where`/`ack` field kept) and the
  recap's two: `q_warm_confirm` ("Were 45, 135 and 225 lb your warm-ups on Back
  Squat?"; with more than three sets "Were 45 to 315 lb (6 sets) …"; *Yes, tag
  them* / *No, working sets* / *Not now*; `writes: 'record'`, `key: 'warm'`,
  cooldown 28 per lift under `asked['warm:<exId>']`, budget C, the three acks)
  and `q_pr_how` ("New best on {lift}. Did it feel like there was more in it?";
  *Plenty left* 4 / *Just about* 2 / *That was everything* 0; `writes:
  'record'`, cooldown 0, budget D, stamped per record). `coach.js` `QUESTIONS`
  is `ASK_QUESTIONS.filter(q => q.writes === 'answers')`, so Settings,
  `normSettings()`, onboarding and the registry verifier keep reading one list.
- **The engine.** `pickQuestion(d, moment, settings, now, opens, ctx)` — the
  brief's score (value + urgency + staleness + momentFit − repeat − fatigue),
  ties on `rotate(opens, n)`, null under `mute.questions`, null for every lane
  for the rest of a day on which a session is marked (03 §1.2). `warmRamp()`
  over the **raw** exercises (a duplicated block is read alone, so `exIdx` maps
  back to the stored row). `prSetOf()` finds the record set in the raw record
  (the e1RM record's set by reference, the weight record's by its load).
  `debriefPlan()` → `{ confirm, feel, question }` with every skip rule of
  §4.2: fewer than three working sets after the split or cardio alone, the
  second session of its day, a harder rating or a mark (MARK_ASK owns the
  slot), `mute.questions` (the confirm row stays — it is logging), `warmStyle`
  `none` (no confirm) and `ramp` (`oneTap: true`); `q_warm_confirm` is never
  the question slot, so the two are never both drawn.

**Phase B — the store.** `coach.js`: `COACH_SETTINGS_VERSION = 2`;
`normSettings()` calls `normKnow()` and spreads `know`/`knowBy`/`tally` only when
non-empty; `asked` keeps every catalog id, `ONCE_LINES`, and `warm:<id>` /
`q_pr_how:<id>` stamps whose id part matches `ID_RE`; `coach.openQuestion` is
**per lane** (`{ lane: id } | null` over each `answers` row's first-choice
moment), so an unanswered `q_log_timing` no longer silences the recap or the
opener; `pendingQuestion()` and `questionUnder()` keep their gates and call
`pickQuestion()` for `'open'` / `'under:<where>'`; `questionView()` resolves
`text(d, u, ctx)`; `coach()` returns `debrief(record, extras)` →
`debriefRead()`, which puts the record among the sessions exactly as
`finishRead()` does and hands `debriefPlan` `{ prs, harder: feelHarder(feel),
marked, u }`; the feel card alone on an unreadable log, an `_edit`, or a throw.
`coach-data.js`: `learn()`, `learnBy()`, `learnTally()` as `patch({}, fresh =>
…)` wrappers — `patch()` gains an optional function of the fresh node, because
the ladder climbs from what is **stored**; `patchNow()` merges `know` one
level, each `knowBy.<key>` one level, `tally` one level, beside `marks`, and
prunes `warm:*` and `q_pr_how:*` stamps older than 56 days on every write.

**His answer reaches the engine.** `knowBy.warm` `no` on a lift switches the
ramp model's detection off for it everywhere a working set is counted:
`coach.js` (`warmOf()` on `shapeSession`, `workingSets`, `workingSetsOf`,
`rampLoads`; each lift handed to the overlap carries `warm` only when he said
something; `liveInput` and `volumeOf` carry a `warm` map), `coach-prog.js`
(`liftOf()` reads `ex.warm`; `readAll`/`readExposure`/`rampLoads`/`rampOf`/
`rampProfile` take it — the targets, the baselines and `nextSet`),
`coach-live.js` and `coach-volume.js` (`i.warm`). `yes` and nothing said read
exactly as v70 did, so no shipped output moves for an account that has never
answered (every byte-identity verifier against rack-v48/v51/v53/v54 still
passes). This is what makes "No, working sets" an answer rather than a note,
and what the battery's `T_CONTRADICT` holds.

**Phase C — the recap.** `workout.js` `renderSummary()` asks
`coachDebrief(record, { prs })` — coach-data.js, `coach().debrief()` on its own
snapshot like `coachFinishRead()`, so the screen reads nothing for Coach (the
`coach-pure.mjs` guard) — once when the recap first
draws (the plan is kept on the summary; an answer removes its row and a repaint
never re-asks; `saveFeel()` drops the plan so a harder rating hands the slot to
MARK_ASK). `debriefCard()` draws the three rows in one `card debrief-card` —
eyebrow "Quick one before you go." / "One thing I want to get right." by `opens
% 2`, the question, the chips; the shipped `feelCard()` as the second row
(behind `isMuted(coachSettings(), 'feel')` as before); the question row — and a
small **Not now** that stamps the warm-up question as put and removes the card.
The writers: `rewriteRecord(next)` (the whole session node, `volume` and
`groups` recomputed by `computeVolume`/`recordGroups`, written as `saveEdit`
writes it; on refusal "Not saved — the question is still here." and nothing in
memory moves; on success the cache, `invalidate()`, `refreshCoachSessions()`,
the records re-detected, `summary.finish` re-read), `retagWarmups(exIdx, idx)`
(`retypeSet` per set, then `retagHistory` and a tolerated `history` write),
`retagHistory(h, exId, dateK, idx, nSets)` (pure, exported; `h` itself when the
row's count does not match) and `setRirOnRecord(exIdx, setIdx, rir)`. The
`feel` block name on the recap is kept (vibes compose by it); `rack.css` gains
the card's rows and strips the nested feel card's chrome.

**Phase D — verifiers.** New: `tools-check/coach-ask.mjs` (68 checks, §5 of the
brief: the catalog, the facts, the 10,000-day budget walk, the picker,
`warmRamp`, `debriefPlan` through `coach().debrief` and direct) and
`tools-check/warmup-retag.mjs` (33: the retag, the index, a refused write
byte-identical, the rating, warmup-leaks' property after a retag). Extended:
`coach-state.mjs` E (v1 → v2, the §3.5 node round-trips, junk, the stamps),
`coach-registry.mjs` F over `ASK_QUESTIONS` and L (`knowBy.warm` no through
`coach().debrief` and the targets: 8 rows and none marked `ramp`, the finish
line counts 11 sets not 6), `recap.mjs` F (18 checks on the drawn card: order,
nothing on paint, Yes/No/Not now, `q_pr_how`, a refused write, Not now on the
card, a 90% rating → MARK_ASK and the open lane silent for the day after a
mark, an ordinary day, kilos), `feel.mjs`, `refused-write.mjs` 12 (the retag's
whole-node write refused by the real `store.js`), `coach-pure.mjs` P and
`ALLOWED`, `blocks.mjs`'s write-nodes guard (the rewrite of the one session
node), `touch-target.mjs` (reads the catalog from `coach-ask.js`),
`friends-structure.mjs` (`rack-v72`), and every verifier that stages `coach.js`
now stages `coach-ask.js` (29 files; `lib/stage.mjs` and `battery/stage.mjs`
take it in their lists). Battery: `generator.mjs` draws `knowBy.warm` from
`R.fork()` **at the very end** of a lifter (every seed keeps its lifter; the
regressions are byte-identical) — `yes` on one or two `tags_everything` lifts,
`no` on one bodybuilder-based lift with the truth made true of it (that lift's
ramp sets removed from its sessions and truth rows, `warmNo` on the truth);
`harness.mjs` hands `warmNo` to the scorer; `scoring.mjs` `T_CONTRADICT`: a
target on a `no` lift with a row marked `ramp`, or fewer rows than last time's
sets. `sw.js` → `rack-v72`, `usage.js` → `rack-v72`.

## Decisions for Micah

1. **`changes` on the new rows name intent ids, not the response id the brief
   wrote.** The registry's check is `intentSet.has(x)`, and `resp_live_session`
   is a response. `q_warm_confirm` names `lift_targets`, `week_volume`,
   `live_read` — the three readers of the split a retag moves.
2. **`q_pr_how` is stamped per record** (`asked['q_pr_how:<recordId>']`), not
   under its id. The brief counts the budget from the stamps alone, and one
   stamp per id undercounts a question asked on three records in a week (the
   10,000-day walk breached the week 922 times with one stamp; 0 with
   per-record stamps). `normSettings()` keeps them like `warm:*`, `patchNow()`
   prunes them at 56 days. Native's `asked` rule, if enumerated, needs the
   extra alternative (NEXT-NATIVE-V72.md §5).
3. **An expired `warm` answer reads as nothing said.** The brief handed
   `knowOf(...)?.v` to `rampOf` (a `no` would then switch detection off for
   ever, and he would never be asked again on that lift); the spec's §4.3 asks
   per lift again after a while. `warmAnswer()` reads the value only inside its
   180-day TTL, so after six months a `no` lift is read by its shape again and
   the recap asks once more. The answered stamp itself keeps a lift quiet for 28
   days (prompt) and is pruned at 56.
4. **The shipped seven count against the budget** (`budget: 'D'`), as the spec
   has it ("the existing seven questions move onto the same scorer and the same
   budget"). The observable change: after the aim and experience are answered
   on one day, the focus group under "How am I tracking?" waits for the next.
   No verifier depended on three in a day. Say if you want the profile
   questions outside the budget — it is one letter per row.
5. **After a mark today, no question in any lane for the rest of the day**
   (`pickQuestion` reads `settings.marks` by date). The brief asked the recap
   verifier to assert it; nothing in the engine did it, so it does now. A
   harder rating answered *Nothing* stores no mark and does not silence the
   day — only a kept mark does.
6. **`debriefPlan` takes a sixth argument** (`ctx = { prs, harder, marked, u }`)
   and `warmRamp` takes `now` and the merged library, `retagHistory` the record
   exercise's set count. The pure fence forbids `coach-ask.js` importing
   `coach.js` (`feelHarder`, the marks, the library names), so `coach.js`'s
   `debriefRead()` hands them in. Native's `recap-view.js` does the same.
7. **The recap card has two "Not now"s** when a confirm row is drawn: the
   confirm chip (that lift, 28 days) and the card's link (everything). Both are
   the brief's words. If it reads doubled on the phone, the card's link could
   say "Skip" — one string in `workout.js` and the verifiers find it by class.
8. **`T_CONTRADICT` is a fence, not a drive.** A bodybuilder's `no` lift is
   straight sets at one load, which the tiers never read as a ramp, so the code
   fires only on a regression (a target that strips rows on a `no` lift). The
   rule is driven where it bites — `coach-registry.mjs` L: Micah's untagged
   squat day with `no` on the squat gives a target of eight rows and none
   marked `ramp`, and the finish line counts eleven sets. Battery: wrong 0,
   `GATE=all`, 300 × 8; nextSet and live decisions fall by 35 (the `no` lifts'
   ramp sets are no longer ticked), every other count unchanged.
9. **The `GUARDTEST` canary echoed** in this session, as in v71 — the deny
   rules live in the mobile and worker repos, not a fresh lift-cal clone.
   Nothing here needed `wrangler`, `firebase`, `eas`, `gh` or a push to
   `main`, and none was run; the branch is `ship-v72` and only it was pushed.
10. **Not built, by the brief:** `q_want_next`, `q_equipment_step`,
    `q_drop_why`, `q_back_what` (v74) — their keys are in `KNOW_KEYS` so the
    native rules block is written once; `tally` has a writer and no reader yet
    (v73's "another set" counts).

## The gate

- `node --check` clean on every module; the verifiers — 103 files — exit 0 in
  `UTC`, `Pacific/Auckland` and `America/New_York` (see the handoff for the
  run); `coach-voice.mjs` P reports zero offences (every new literal is first
  person; "Coach" survives only as a label).
- The battery at `GATE=all`: **wrong 0** (engine 0, untagged-warmup 0,
  needs-answer 0), 15 regressions pass, properties pass; `T_CONTRADICT` 0.

## Handoff

- **Shipped** — Coach asks: the knowledge store (`settings/coach` v2 — `know`,
  `knowBy`, `tally`, the per-item stamps), the question engine (`coach-ask.js`:
  the catalog with the shipped seven moved onto one scorer and a budget of two
  stored answers a day and six a week), and the recap's check-in — "Were 45, 135
  and 225 lb your warm-ups on Back Squat?" with *Yes, tag them* rewriting the
  session, the shipped feel card, and "Did it feel like there was more in it?"
  after a record — plus his "No" switching the ramp model off for that lift in
  every reader.
- **Service worker** — `rack-v72` (`sw.js` and `usage.js` together).
- **Before it's live** — nothing for the website: merging `ship-v72` is enough.
  `database.rules.json` is unchanged by one byte; no Worker change. For the
  **native port only**: `web-patches/database.rules.PROPOSED.json` needs the
  `know`/`knowBy`/`tally` block in `NEXT-NATIVE-V72.md` §5 before the phone can
  write `settings/coach` at all (`$other: false` there).
- **To check it worked** — after merging, close Rack from the app switcher,
  open it, close and open once more. Finish a squat day with the ramp typed N
  (45, 45, 135, 135, 225, then 3 × 5 at 315): the recap shows the headline,
  then "Quick one before you go." and "Were 45 to 225 lb (5 sets) your warm-ups
  on Back Squat (Low Bar)?" → *Yes, tag them* → the row reads "Tagged. They
  won’t count as working sets.", the Volume tile drops, "What you did" shows
  the five with W, and the session on the calendar shows them W. Set a record
  (335 × 5): under the feel card, "New best on Back Squat (Low Bar). Did it feel
  like there was more in it?" → one tap → "Noted. I’ll read the next target
  from that." Settings → Coach still shows his answers; a rest-day open puts no
  question on the card. Rate a session 90%: "Anything I can’t see?" and no other
  question that day.
- **Risk** — the whole-record rewrite on the recap: one session node, the
  `saveEdit` path, verified against a refused write (`warmup-retag.mjs` C,
  `recap.mjs` F, `refused-write.mjs` 12) — a refusal leaves the record, cache
  and index byte-identical and the chips in place. The `history` write after a
  retag is tolerated on refusal and corrected by the next fold. The recap now
  runs `coach()` on its snapshot once on first draw (the full ranking, not only
  `finishRead`); on a long log that is a paint's worth of work on the one
  screen he is reading, not a boot cost.
