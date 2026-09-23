# Rack — backlog

Everything still open, in one place. It replaces `ROADMAP.md`, which had become
a record of eight shipped features with a handful of live items buried in it.

Two things this file is not. It is not a design document — where a shape was
already decided, the decision stays where it was written and this only points at
it. And it is not a port brief: `NEXT-NATIVE.md`, `NEXT-NATIVE-UNITS.md`,
`NEXT-NATIVE-V40.md`, `NEXT-NATIVE-V41.md`, `NEXT-NATIVE-V42.md`,
`NEXT-NATIVE-V43.md`, `NEXT-NATIVE-V45.md` and `NEXT-NATIVE-V46.md` are the instructions for copying
work into `~/dev/rack-mobile`, and they stay. What is below is the list of
things nobody has done yet.

Read [AGENTS.md](AGENTS.md) for what exists and [CLAUDE.md](CLAUDE.md) for how
to work on it.

Native-tree claims below were checked against `~/dev/rack-mobile` at a fixed
commit — `85be276` where the line says so, `695d996` for everything v41 checked.
That tree moves on its own, so verify before acting on one.

---

## Waiting on Micah, not on code

- **The PROPOSED rules need `food/targets/maintSrc`.** v40 added one optional
  key to `food/targets`: `'setup' | 'pinned'`. The published rules
  (`database.rules.json`) do not mention `food/targets` at all, so it lands
  today. `web-patches/database.rules.PROPOSED.json` in the native tree validates
  that node key by key and has no `$other` deny inside it, so an un-added
  `maintSrc` would land there too — **unvalidated**, which is the thing worth
  fixing before those rules are published. Enum of the two strings.
- **The PROPOSED rules are still missing `settings/units`** —
  `NEXT-NATIVE-UNITS.md` §12, zero occurrences at `85be276`. The first units
  write after that publish fails silently without it.
- **The PROPOSED rules need `settings/coach`.** v42 added it, and it needs
  nothing from the PUBLISHED rules — `settings` carries a section-level
  `.write` and the `$other: { ".validate": false }` deny is nested inside
  `units` rather than on `settings` itself, so any other child of `settings`
  lands. `database.rules.json` is unchanged and must stay that way. But
  `web-patches/database.rules.PROPOSED.json` in the native tree is the one that
  validates node by node, and if it grows an `$other` deny at the `settings`
  level — or simply never learns about `coach` — the first Coach write after
  that publish fails silently and every switch in Settings → Coach goes back to
  its default on the next open. Shape is in AGENTS.md.
- **The PROPOSED rules need `settings/coach/on`.** v46 added it — the Patterns
  switch, `{ patterns: true }` or absent — and the PUBLISHED rules take it as
  they are (they never mention `coach`). But the PROPOSED `coach` shape in
  `NEXT-NATIVE-V43.md` §5 ends in `"$other": { ".validate": false }` and has no
  `on`: published as it stands, every settings/coach write from an account with
  Patterns on is refused silently and the switch flips back. Add
  `"on": { "$cat": { ".validate": "newData.isBoolean()" } }`
  (`NEXT-NATIVE-V46.md` §6). v46's second switch, "In the gym", is
  `settings/coach/mute/live`: the V43 shape's `mute.$cat` accepts it, but if
  the PROPOSED file has since enumerated the categories, `live` must join them.
- **The stricter `.validate` rules themselves.** They were the reason v40's
  Phase 3 existed: until a refused write said so on screen and kept its payload,
  publishing them turned a too-strict rule into silent data loss. That half is
  done. Publishing is a decision, not a code change.

---

## Open features

### A kilo plate set, and a bar-weight setting

`workout.js:1162 renderPlates` computes an American rack — 45/35/25/10/5/2½ on a
45 lb bar. A gym stocked in kilos has 25/20/15/10/5/2½/1¼ on a 20 kg bar, which
is a different set and not these six relabelled: "2 × 20.4" is a number nobody
can find on a rack. So a metric account's strip says **"Per side · lb plates"**
(`workout.js:1164`) and keeps working, deliberately.

The real answer is a second plate set plus a bar-weight setting, and it is a
small ship of its own. Carried from ROADMAP §8; the same note is in
`NEXT-NATIVE-UNITS.md` §9, which tells the native tree not to "finish" it either.

### Steps — questions never answered

From ROADMAP §1, minus the ones the world overtook:

- Is the tab worth its slot at one number a day?
- Backfill: Health holds years of step history. Worth a one-time bulk import the
  way `importer.js` does Liftoff?
- Should a training day suppress the step goal, or is that over-thinking it?

Not carried: "does the feed node start carrying steps too" — there is no feed
node any more.

Note that v40 removed the *walkthrough* that told people how to push steps in
from a phone automation, because it talked them through putting their Rack
password into a third-party app. Every reader of `src` stayed, and days already
logged that way still render (`steps.js:199`). Anyone wanting to build one can
still use Firebase's REST API; the app no longer writes the recipe down.

### Routines — two deferred ideas

From ROADMAP §3, the two that were never decided:

- Should a routine remember progression — "last time you did this routine you
  benched 225, try 230"? Real value, and a second feature.
- Folders or tags once there are more than about eight routines?

The third open question in that section is closed: targets are placeholders, not
prefilled values, and `AGENTS.md` (`routines/{routineId}`) documents why.

### The maintenance model's honest limits

From ROADMAP §5. One of the three is a to-do rather than a limitation:

- **Down-weight days whose logged intake is implausibly low.** A half-entered
  food log makes that day's adjusted weight read heavy, and the confidence
  weighting does not currently look at whether a day's intake is credible.

The other two are limits to live with, not work: 3,500 kcal/lb is a fat figure
and lies over a few days (the 21-day window is what carries that), and a sodium
swing, a new creatine dose or an illness moves water weight in ways no
food-timestamp model can see.

**And the rule that goes with all of it: this never becomes an activity model.**
Steps are deliberately not an input — the estimate is empirical, so activity is
already inside the scale trend, and a step term would count the same walking
twice. `AGENTS.md` (`steps/{date}`) says the same thing.

---

## The native port

`~/dev/rack-mobile`. Four briefs, each still partly open, plus Coach's:

- **`NEXT-NATIVE-V45.md`** — the workout builder, all of it open. At `13f6b80`
  native has Coach (`src/pure/coach.js`, `src/ui/coach/`) and no
  `src/pure/coach-build.js`. Read it with `NEXT-NATIVE-V42.md` and
  `NEXT-NATIVE-V43.md`, which are still the Coach port documents. Its one trap:
  native's `startWorkout` mints no React keys, and the builder's presets carry
  none (§4.1 there).

- **`NEXT-NATIVE-V41.md`** — the newest, and all of it is open at `695d996`:
  every one of v41's six phases was checked against that tree and none of them
  has landed. It also carries a bug that is NATIVE's to fix rather than a port
  job — `retryRefused` reports "Saved" for a retry that only went into the
  offline queue.
- **`NEXT-NATIVE-V40.md`** — Phase 1 (the maintenance model coming
  out of hiding) and Phase 4a. Confirmed open at `85be276`: `src/pure/tdee.js`
  has no `effectiveMaint`.
- **`NEXT-NATIVE.md`** — the Train overhaul. §1 (the merge invariant) and §3
  (lifting blocks) are in: `src/pure/analytics.js` has `mergeSessionExercises`
  and `src/pure/blocks.js` exists. **§4, the Frequent chip, is not** —
  `frequentOrder` / `frequentDefault` (`picker.js:125`, `:136`) have no native
  counterpart. §2, §5 and §6 were not verified.
- **`NEXT-NATIVE-UNITS.md`** — `src/pure/units.js` exists, so the module itself
  is across. §10's rework rows (the settings control, the setup screens, the
  render sites) were not verified.

Two notes that belong with the port rather than in it:

- The native tree has its own verifiers (`tools/verify-*.mjs`, twenty-odd of
  them) but no equivalent of the pure-function tables in this tree's.
  `NEXT-NATIVE-UNITS.md` §11 asks for that — sections A–F of
  `tools-check/units.mjs` are pure and run against the native copy with the
  imports repointed. The same is true of `maintenance.mjs`,
  `bodyweight-sets.mjs`, `refused-write.mjs`, and of both files v41 added:
  `estimate-origin.mjs` and `weigh-time.mjs`.
- The two dead-letter designs will differ. Web's `write()` **throws** on a
  refusal; native's `write()` at `85be276` reports and **returns**. Neither is
  wrong, but the port has to pick one on purpose. `NEXT-NATIVE-V40.md` has the
  diff. v41 closed two rows of it in web's favour — eviction and the item id,
  both adopted from native word for word — and left the third, `retryRefused`
  on an offline retry, where native is the one that is wrong.

---

## Known, accepted, not bugs

Carried from `NEXT-NATIVE.md` §7 so it survives that file. Do not "fix" these:

- An exercise whose whole history is one blocked session draws no 1RM trend line
  (`stats.js:410` needs two entries). It used to draw a line between two blocks
  of the same day — a fabricated progression on one date.
- `bestVolume` / `bestVolumeDate` on the exercise index are per-session, not
  per-occurrence, because the PR string is literally "best session volume".
- The Most-trained card and the Frequent chip are not the same number and never
  were. Most trained is range-scoped and skips an exercise logged with warm-ups
  only; the picker's list is all-time and counts it.
- **Bodyweight work produces no estimated 1RM**, because an e1RM needs a weight
  on the bar. `you.js:1203` says so on screen rather than ranking a zero. Since
  v41 those sets print as `BW × 12` (`units.js fmtSetLoad`), and the recap
  compares them by REPS rather than by volume (`analytics.js
  sessionComparison`) — a bodyweight session has no volume, and "-100%" was the
  old answer to that.
- Three things are left in **pounds on purpose** and labelled as pounds on
  screen, because a wrong number is worse than no number: the plate strip above,
  the workout importer (`importer.js:18` — its file is already in Rack's storage
  format, so its weights *are* pounds), and the half-a-fluid-ounce-per-pound
  water rule (`onboarding.js:135`), which has no metric form. The bodyweight that
  last one is quoted against does convert.

---

## What v46 left open in its own work

v46 is Coach ship three, part one — Coach in the gym (the live session's chip,
its compact sheet, the one-line nudge) and Patterns in your data — plus three
fixes Micah found walking v45 (0a–0c), and a second round from walking the
builder before the push (§38). Everything below is written up in
`COACH-REPORT.md` §30–§38. Three items this section first listed were closed in
that round: Steps' Save and Water's Add have their room, the block check box
ticks through `tickSet`, and the in-session read has a switch (Settings →
Coach → In the gym).

- **Nothing in this ship has been seen on a screen.** The chip in the session's
  header row (beside the name, the clock, the calendar button and Finish — on a
  320-pixel phone the name box is what gives way), the one-line nudge in the
  swipe hint's slot, the compact sheet, the Patterns bubbles, and Weight's Log
  at 54px. The nudge keeps the hint's height by construction (same 10px type,
  one clipped line, the × given a larger target by padding it hands back as
  negative margin) — arithmetic, not a measurement.
- **Editing a past session has no unsaved-sets warning.** Every set of an edit
  starts ticked with its reps, so the only way to make one is to clear a reps box
  and save — close to deleting it on purpose. `saveEdit` drops it as it always
  has.
- **The "In the gym" switch is one switch for two things** — the chip and the
  line. If the line turns out unwanted and the chip wanted, splitting them is a
  second category, and a second key under `mute`.
- **An answer that repeats the opening and has no follow-ups prints nothing at
  all** — its chip goes, and the sentence it would have said is the one already
  at the top. By decision: printing it again is what v46 stopped doing. If it
  reads as a tap that did nothing, a one-word acknowledgement is the change.
- **"Something else…" opens the picker on the lift's group, not locked to it.**
  The picker's chips still work, so he can pick from another group, and the
  engine allows it (his explicit choice) — it refuses only what is hidden, on
  the workout already, or across the cardio line. Locking the picker to the
  group is a small change in `openPicker` if cross-group swaps turn out wrong.
- **"Make me a workout" shows every choice that builds, merging none.** Coach's
  pick and the shape it picked, or a shape and one of its groups, can build the
  same workout under two labels. Each is still the answer to its own question,
  which is why nothing is merged; if the list reads long on a phone, the
  builder's own "Train something else" dedupes by base session and is the
  model.
- **"The exercise in hand" is a guess when no line is up.** A set has no
  timestamp, so the chip's answer is about the last exercise on the list with a
  ticked working set; somebody who jumps back to an earlier exercise gets an
  answer about the later one. It only changes "one more set" and "switch".
- **"Next" is rare in a routine- or builder-started session**, by design: the
  exercise that usually comes next is usually already on the list, and "next"
  never names what is already planned.
- **DONE-by-length needs three sessions of the same shape.** An account whose
  sessions do not recur gets "you're probably good for today" only from the
  fatigue route.
- **The sheet covers the rest pill while it is open** (every sheet is modal).
  The timer keeps running and still beeps; nothing about it is stopped.
- **Patterns reads up to one `food/log/{date}` per session day of his most-logged
  lift, once per app open, when switched on.** The maintenance model already
  caches past days under `intake:{date}` on the device; sharing that cache would
  save the reads and would tie coach-data.js to weightmodel.js's private format.
  Not done.
- **Patterns reads every past day against the protein target he has NOW**, and
  its weekly weight change is the raw weekly mean of weigh-ins, not the
  fasted-normalised trend the Weight tab fits. Both are said in the reason line.
  There is no significance test, deliberately — both sample sizes are printed so
  the reader can weigh them — and no bar on how big a difference must be.
- **Nothing counts use of the chip, the nudge or Patterns.** A usage event
  would be a new stored key, and this ship added one only.
- **The free-text box (ship three part two) is not built.** When it is, the
  in-session read is not a route: `c.live(session, { current })` takes the live
  session, so the matcher needs a way to call it rather than an id in
  `ROUTE_IDS`.
- **Native was not read** — the run was fenced — so every native path in
  `NEXT-NATIVE-V46.md` is V45's, unverified.

## What v45 left open in its own work

v45 is Coach ship two — the workout builder, "Make me a workout" on Train — plus
four small ones (4a–4d). Everything below is written up in `COACH-REPORT.md`
§23–§29. (One more was closed by v46: a routine saved from the builder is named
by it at once now — routines.js hands its list to `noteCoachData()` whenever it
changes.)

- **Nothing in this ship has been seen on a screen.** The proposal block, the
  Weighed-at box (4c) and the recap gap (4d) are CSS reasoned from the source
  and driven through a DOM shim with no box model. 4c in particular rests on a
  mechanism — WebKit sizing a `datetime-local` control from its value, then iOS
  shrinking the page to fit the overflow — that could not be reproduced here.
  If the box is still past the card's edge on a phone, doubt that mechanism
  first (`COACH-REPORT.md` §26.2).
- **A group focus ("Legs" under Train something else) builds the WHOLE base
  session**, not that group's exercises alone — by decision, because the brief
  names the session and a filtered one is a session he never did. If that reads
  wrong in use, filtering it is a small, isolated change in `coach-build.js`.
- **"Swap one" ranks his logged lifts by recency, then the rest in library
  order.** Nothing prefers a flat press for a flat press or the same equipment;
  the pattern tag is the whole of the similarity it knows. Angle and equipment
  are both available if that turns out to matter.
- **`libReady` means the picker has RUN its reads, not that they succeeded.**
  picker.js reads through `read()`, which folds "absent" into "unreachable", so
  on a first launch offline on a new device with no mirror his custom exercises
  would look deleted. The builder then leaves them out and says "not in your
  library" — true from that device, and said rather than silent — but it is
  still a proposal missing his lifts. Closing it means the picker distinguishing
  a failed read, which is its own change.
- **Nothing counts builder use.** A usage event would be a new stored key, which
  this ship was told to add none of. `workoutStart` counts every start, so the
  admin panel sees starts and not whether the builder made them.
- **"Save as routine" can save a second routine for a shape that already has
  one** — the name box opens on his routine's name when the shape is named by
  it. Visible, harmless, and his to delete.
- **The proposal sits in the 92dvh sheet** and a long one — ten exercises and a
  row of swap chips — scrolls. Like v43's note on the sheet height, not known to
  be wrong, known to be unseen.

## What v44 left open in its own work

v44 is the stale-asset fix — the service worker's network leg revalidates now,
so a ship reaches the phone instead of being re-cached one build behind — plus a
second pass over the greeting rotation. One cost it took on purpose, and one
case the fix deliberately does not reach. (Two more were closed by v45: the
`CACHE`/`VERSION` verifier is `tools-check/version-match.mjs`, and `g_in_a_row`
says "in seven days" now.)

- **`index.html` is still served from the browser's HTTP cache for up to ten
  minutes after a ship.** The revalidating leg is same-origin and
  non-navigation, and the second half of that is the cost: passing any init at
  all to `fetch()` makes it rebuild the Request, and while the Fetch spec says
  a navigate-mode rebuild is downgraded to same-origin rather than thrown on,
  engines have historically thrown there. A throw becomes a rejected promise in
  the handler's `.catch()`, which on the first launch after a bump — with the
  cache just emptied by `activate` — is a blank screen rather than a stale
  file. Every module `index.html` loads is fresh, so this only bites on a ship
  where `index.html` itself changed. Closing it starts with establishing what
  current iOS Safari actually does with a navigate-mode Request and a non-empty
  init, which is not a thing to guess at with a blank screen on the other side.
- **The card pins its greeting before food, weight and steps have landed, so
  the rotation fix reaches it only when two LOG-gated lines qualify.**
  `coach-ui.js` pins at the `logKnown` paint, which `coach-data.js` reaches
  after `Promise.all([pLog, pSettings])` and before `pRest`. Four of the ten
  data-aware lines gate on the late reads; the other six gate on the training
  log and are live at the pin. Measured at that paint, two of the verifier's
  fixtures go from 27% data-aware to 100% and three do not move at all. The pin
  itself is right — a card that rewrites its own top line under the reader's
  thumb is worse than a generic one, and the boot path was on v44's do-not-touch
  list — so the two ways out are to pin later (and pay that cost) or to give the
  late-gated lines a cheap log-only sibling. Neither was in scope. Until then,
  a generic line on a cold start is not evidence the rotation is broken.
- **ZXing has never been cached by the service worker, and the README said it
  was until v44.** `food.js` loads it with a `<script>` tag, so the request is
  no-cors, the response is opaque with `status === 0`, and the handler's
  `r.status===200` guard never writes it. Barcode scanning therefore does not
  work offline on an iPhone, where it is the only scanner there is. Fixable by
  adding `crossorigin` to the script tag — jsDelivr does send the header — but
  that is a change to the food path and wants testing on a real phone.
- **An account where only one data-aware greeting line passes its gates still
  opens with a generic line roughly seven opens in eight.** That is not a bug —
  one line cannot rotate against itself, and saying it twice running is the
  collapse v43 fixed — but it means v44's change does nothing for a thin log,
  and the last check in `tools-check/coach-rotation.mjs` says so rather than
  asserting a floor the engine would have to break to deliver. Anyone reading a
  live card should know which of the two cases it is in before reading anything
  into the line it opened with.

---

## What v43 left open in its own work

v43 is the Coach fix run — the rotation, the boot path, the tier gate, the
sheet's surface, the stall's voice and the short-finding gap. Two things it
found and deliberately did not touch, plus one it could not check.

- **`.btn` renders 41px tall against a 44px touch-target minimum.** Routines,
  Exercises and Statistics on Train are therefore 3px under. It is real and it
  is small, and `.btn` is used on every screen in the app — changing its padding
  for this moves every button in Rack, which is a far bigger blast radius than
  the defect. It wants a deliberate pass over the whole button scale, not a
  patch from a Coach run.
- **The sheet's `max-height: calc(92dvh - var(--safe-top))` has never been seen
  against real phone browser chrome.** Nothing in this tree can check it: there
  is no device and no layout engine in any verifier. It is not known to be
  wrong; it is known to be unverified.
- **The card's geometry is not fenced by anything.** `tools-check/` drives
  `coach-ui.js` through a DOM shim now, so the tier gate and the surface-scoped
  topics are checked — but the shim never loads `rack.css` and has no box model,
  so the fixed 190px, the 164px tight form and the auto-margin centring are
  verified by arithmetic and by eye only. A regression that made the card resize
  would ship green.

---

## What v42 left open in its own work

Coach is deterministic, reads a great deal, and writes almost nothing, so most
of what it turned up is in other files. None of it was touched — a run that
wanders into a neighbouring bug has scope-crept — and all of it is here.

### Found while building Coach, deliberately not fixed

- **`insights.js` `rateVerdict()` has no magnitude guard.** It returns `'good'`
  for ANY rate in the goal's direction, unbounded, and `LIMITS.rateWk` allows
  ±5 a week — so an account shedding weight very fast gets a green number and an
  approving sentence today. Coach does not reproduce it: its weight-rate finding
  bands the magnitude and, past the band, reports the figure and declines to
  call it anything. Changing `rateVerdict` itself is Micah's call and a separate
  change, because the You tab's colours and the Weight tab's both hang off it.
- **`insights.js:284` is a physiological generalisation, not a comparison to the
  reader's own data** — *"past about 1.5 lb a week more of it is muscle"*. Coach
  says nothing like it and nothing new extends the pattern. The shipped copy is
  untouched.
- **`insights.js:541-551`, the weekly-review takeaways, are openly prescriptive**
  — *"Get protein to N g…"*, *"Bring the daily average back under N"*. Coach is a
  readout and never phrases this way. Again: shipped copy untouched, pattern not
  extended.
- **`store.js` `read()` folds "absent" and "unreachable" into one fallback.**
  Right for every screen that just wants a number; wrong for the one question
  Coach has to answer before it says anything, which is why `coach-data.js` uses
  `readExact()` for `workouts` and for `food/targets`. The cost is one extra
  whole-tree GET at boot — see below.
- **`store.js` `mergeUpdate()` swallows every error including
  PERMISSION_DENIED.** Nothing in Coach goes through it, by rule and by
  verifier.
- **`analytics.js` `exerciseIndex()` gives an exercise logged with warm-ups only
  an entry with `sessions: 0` and every best at 0.** Coach skips those rather
  than reporting a lift whose record is zero pounds. Do not change
  `analytics.js` for this — several screens depend on the current shape.
- **`record.groups` counts warm-ups.** `workout.js` builds it from
  `collectFrom` output filtered on `s.done && s.r !== ''`, not on `isWorking()`,
  so a session of nothing but warm-up bench claims chest. Coach never reads it;
  every group it names is derived fresh from the sets. The calendar plate colours
  still read it, which is where a fix would have to start.
- **A second session on the same day is invisible to the live-session facts.**
  `activeSession` in localStorage holds one, and finishing one and starting
  another inside a day is not something Coach can see the shape of. Ship three
  part one (v46) did not solve it, by instruction: `coach-live.js` reads the
  active session and nothing else, so a morning session's sets count toward
  neither "your usual" for today nor "done". See v46 below.
- **The You tab issues around seven live GETs per render.** Coach adds none per
  paint — `coach-data.js` gathers once per app open — but the underlying number
  is unchanged and is the thing worth attacking before anything else is added to
  that screen.
- **Water is a whole domain Coach does not cover.** Its own node, its own unit,
  its own card. Deliberate, and out of scope for all three Coach ships until
  somebody asks.

### v42's own loose ends

- **`coach-data.js` reads `workouts` a second time at boot.** It has to:
  `allSessions()` resolves `[]` on a FAILED read, so an unreadable log and a
  brand-new account are the same answer through that path, and telling those two
  apart is the whole of `log.confidence`. The honest fix is a way to hand
  `analytics.js` a tree it has already been given — `loadAll()` would take one —
  but that is an edit to the file every training screen depends on and was not
  worth making blind. Until then, one extra whole-tree GET per app open.
- **`log.confidence === 'empty'` does not cross-check the `history` index.** The
  brief asked for `readExact` resolving null/`{}` **and** an empty history
  index; only the first half is implemented, because the second costs a whole
  extra node read and cannot change an outcome — with no sessions, every rule
  downstream is gated silent either way, and the only difference is which of two
  states gets named.
- **Coach keeps no history of its own output.** Deliberate, and it means the
  sheet cannot say "as I mentioned yesterday" and never will. The log is the
  only state.
- **No text input.** The router is keyed on ids and is exercised by every button
  in the sheet, so ship three's box is a matcher in front of it. `ROUTE_IDS` is
  exported for exactly that. The injury refusal (`coach_not_injuries`) is
  registered and reachable by id today, unreachable by any button, and waiting
  for the box.
- **The You / Train dedupe is per `coach()` call, not per session.** Both cards
  come out of one deterministic ranking, so the two tabs agree whichever order
  they are opened in — but a finding the You card showed this morning can be the
  Train card's this afternoon if the ranking moved. That is right; it is noted
  because it looks like a bug the first time it happens.

---

## What v41 left open in its own work

- **The estimate sheet's provenance now keys on `src.kind`, checked against the
  Worker's source.** The risk noted here on 17 Sep — that the residual heading
  was guesswork, but "fails toward estimate when it recognises nothing", so the
  worst case was modesty — was itself wrong, and was the one bug v41 shipped.
  Model rows have never been `src`-less (`rack-worker/src/index.js:752`,
  `:1434`), so testing the object for PRESENCE headed a pure model answer "From
  published nutrition" and put "published nutrition" on the estimated half of a
  Panda answer. Only `kind === 'curated'` may claim a source now; every other
  kind, and every kind this build does not know, is an estimate. Each fixture in
  `tools-check/estimate-origin.mjs` names the Worker line it came from. **What
  is still open: a new tier added to the Worker reads as an estimate until this
  client learns its kind** — the safe direction, but it does mean a genuinely
  published number can under-claim until the two are shipped together.
- **`asOf` is whatever the Worker writes.** `YYYY-MM` and `YYYY-MM-DD` become
  "Sep 2026"; anything else is printed through unchanged. That is deliberate —
  guessing at a date format is how a wrong date gets on screen — but it means a
  Worker that starts sending epoch milliseconds would print a ten-digit number
  on the row.
- **Nothing tells you a weigh-in was backdated after the fact.** The recent list
  shows the stored time, which is the honest thing, but a weigh-in typed in for
  Tuesday looks exactly like one logged on Tuesday. Editing an existing
  weigh-in's time is still not possible at all.
- **The estimate sheet's provenance is not stored, by design.** Re-open a logged
  entry and there is nothing to say Panda priced it; only the sheet knew. The
  stored `src` string still says `food-db`, which is the coarse version of the
  same fact. Making the finer answer durable is a schema change and a decision,
  not a bug.

---

## What v40 left open in its own work

- **Not every `write()` caller was audited to the end.** v40 fixed Train, Fuel
  logging, Weight and onboarding, so that a refusal can neither leave module
  state claiming a save nor escape a click handler as an unhandled rejection.
  These were listed rather than fixed, and each has the same two questions to
  answer:

  `routines.js:41` · `picker.js:69, 454, 464, 478, 499, 505, 506` ·
  `importer.js:145, 157, 171` · `settings.js:504, 600` ·
  `steps.js:467, 479, 559` · `water.js:103, 437` ·
  `food.js:235, 1278, 1406, 1424, 1519, 1673, 2752, 3161, 3186, 3476`

  None of them is new exposure — `write()` has thrown from the destructive-write
  guard since v32 — and the food/items and food/meals sites in particular leave
  the in-memory library holding an item the database refused until the next
  read.

- **A malformed payload is still queued forever.** `isRefusal` catches
  `PERMISSION_DENIED`, which is what a rules rejection and a failed `.validate`
  both arrive as. A client-side SDK error — a `NaN` in the payload, an
  `undefined`, a path too deep — is not that, so it still goes to the queue and
  replays on every reconnect. `settings.js:375` describes the NaN case and
  guards against it by range-checking before the write; nothing generic does.

- **Daily targets' auto preview does not read the maintenance box.**
  `food.js` wires `mi.oninput = paintAuto`, but `paintAuto` reads `maintInfo()`,
  which reads stored `targets` — so typing a maintenance number repaints the
  preview with the old one until Save. Pre-existing; v40 did not make it worse
  and did not fix it.

- **`food/daySummaries` can go stale on a refusal.** The day's log write and its
  rollup are two writes. If the log lands and the rollup is refused, the rollup
  is wrong until the next change to that day — and `AGENTS.md` warns that a
  stale summary skews the maintenance estimate for two weeks. The red bar fires;
  nothing repairs it automatically.
