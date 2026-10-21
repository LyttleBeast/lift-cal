# rack-v68: the overnight report

Branch **`v68-friends-warmups`**, on top of `rack-v67` (`82fd37d`). It is not
merged: merging to `main` is the ship. Service worker and `usage.js` are both
**`rack-v68`**.

| commit | what |
|---|---|
| `816bfe4` | Warm-ups in the grey "last time" rows, and the "Last ·" line says them (rack-v68) |
| `7e98904` | Settings: every row's screen has a back arrow to the hub |
| `6c5d578` | Friends: a friend's face beside their name, and a Nudge button |
| `86199e4` | PUSH-NUDGE-CONTRACT.md: how phone notifications plug into nudges later |
| `d0c6dc2` | Backlog: index.html's stale window, and the picker's 40px rows |
| (last) | docs: NEXT-NATIVE-V68.md, AGENTS/CLAUDE/BACKLOG/DEPLOY/README, this file |

---

## 1. The warm-up pre-fill bug

**What was wrong.** The grey rows don't read the session log. They read the
per-exercise "last time" index, `history/{exId}`, and
`foldSessionIntoHistory()` dropped every `W` set when it wrote that index
(`keepSets(ex.sets, isWorking)`). The warm-ups were never there to copy. So
Back Squat (Low Bar) offered 315 × 5, then 365 × 2, and the 45, 45, 135, 135,
225 ramp was gone.

**What changed (`workout.js`).**

- **The index keeps every set,** typed as logged, in order. An exercise is
  indexed only if it has a working set, which is the rule `record.groups`
  follows.
- **`nextGrey(prevSets, todaySets)`**, pure, beside `lastTargets`:
  - While today has no working set yet, the next grey row is last time's next
    warm-up, typed `W`.
  - After that, the v54 rule is unchanged: set n takes last time's n-th
    working set, and past the end it repeats the final one.
  - It counts by kind, so a warm-up he types himself doesn't push the working
    sets along.
  - An entry with no warm-ups reads exactly as v54.
- **"+ Set" continues the sequence:**
  - Grey rows are still grey, `tl`, and adopted only by a tick under the same
    `tickSet` rule as the builder's targets.
  - After a grey row ticked unchanged, "+ Set" offers the next row (45 × 10 W,
    then 45 × 8 W) instead of copying the one above.
  - A row he changed is copied as typed, as before.
- **"Last ·" line:** `Last · Oct 17   warm-ups 45 to 225 · 315×5  365×2  365×2`
  (`warmupsText`, through `units.js`).
- **One-time rebuild.** `upgradeHistory()` rebuilds the index from the log
  once per device, so his existing squat days get their warm-ups without
  waiting for the next session. It is online only, uses `readExact`, never
  runs during a workout, and sets the flag only after the write lands.

**Warm-up leak audit.** I checked every consumer of sets for warm-ups:

- volume (`computeVolume`, `exerciseVolume`, `weeklyVolume`)
- e1RM, best set and top weight
- `exerciseIndex`, `detectPRs`, `prTimeline` (which feeds the friends' record
  board), `sessionMilestones`, `sessionReps`
- `groupSplit`, `sameKindComparison` (the recap), `recordGroups`
- the week-volume card
- Coach: targets (`exposuresFor`, `readExposure`, `nextSet`), the live read,
  the volume read, `repDrop`, fatigue, and the card and sheet text

**No leak found.** Every one filters with `isWorking` or `type !== 'W'`, and
none of them reads `history`.

`tools-check/warmup-leaks.mjs` (new, 26 checks) runs the real modules over one
log twice, with and without a ramp in front of every lift. The ramp includes
warm-ups heavier and longer than the working sets (900 × 12 on squat), which
would win a best set or a record if anything read them. Every answer is
identical, including every Coach line. The only difference in the live read
is the rated set's row number ("Set 8" instead of "Set 2"), which is
supposed to move.

**Checked in Chrome.** I seeded a v67-shaped index, booted the app,
watched the upgrade add the warm-ups, added Back Squat (Low Bar), and tapped
+ Set seven times. The rows were W45 × 10, W45 × 8, W135 × 5, W135 × 3,
W225 × 2, then 315 × 5, 365 × 2, 365 × 2. The line read "warm-ups 45 to 225 ·
315×5 365×2 365×2".

## 2. The Settings back arrow

Only four of the hub's rows (Units, Open the app on, Default rest, Coach) had
a "‹ Settings". Every other row's sheet is drawn in its own module, and its
Close closed Settings altogether.

**How it works now.**

- Every row opens its screen as a child of the hub: `settings.js` `kid()` and
  `ui.js` `asChildSheet()`, a one-shot hook that decorates only the first
  sheet opened during that row's action.
- That puts a 44px "‹ Settings" at the top, which goes back to the hub with
  the search kept.
- Admin's "‹ Back" also returns to the hub.
- `.back-btn` is now 44px tall everywhere: Settings, You's screens,
  Statistics and Admin. You's sub-screens already went back to You, so they
  behave the same way and needed nothing more.

**Checked in Chrome.** All 16 sheet rows: each opens with exactly one 44px
arrow, the arrow lands on the hub with its search, and only one sheet is
open. Admin back returns to the hub. The Coach sheet opened from inside
Coach settings gets no arrow, so the hook does not leak.
`tools-check/settings-back.mjs` (new, 18 checks) reads the real registry, so a
new row can't ship without a way back.

## 3. Friends: profile pictures

**The design.**

- **Node:** `social/shared/{uid}/av` = `{ p, at }`.
- **Shape:** `p` is a JPEG data string, at most **6,000 characters**. The rules
  allow only `data:image/jpeg;base64,` followed by base64, so no PNG, SVG, URL
  or markup can get in. `at` is server time.
- **Who reads it:** exactly the rule that reads `me` — approved, and both
  sides of the connection standing.
- **Size:** each phone redraws its own photo at 72 px and steps the quality
  down until it fits. A picture that can't fit is never sent. Measured on
  real JPEGs: about 1.9–2.7k characters.

**Consent decision: covered by the existing friendship, not a new switch.**
The face is who you are, the same as the name a friend already sees. It is
not anything you logged. It goes only to confirmed friends, ends the instant
the connection does, and removing your photo removes it. A switch would
default to on and protect nothing the name doesn't already show.

**Before the rules are published.** The face is published in its own write,
so a refusal costs only the face. The summaries still land, and the face
retries on the next publish. Friends fall back to the letters.

**Checked in Chrome.** Bob's face showed on the board, his row and the nudge
card. Jo, with no photo, showed her letter. The owner's own face was
published 6 s after boot (1,899 characters).

## 4. Friends: the nudge

**The button.**

- Every friend row has a 44px **Nudge** button. It reads "Nudged" once used
  today, and keeps its size.
- It sends `{ v: 0|1|2, at }` to `social/nudge/{to}/{from}`.
- The three wordings rotate per friend:
  - "Bob says you are slacking off. Get in there."
  - "Bob thinks the bar misses you. Time for a session."
  - "Bob is checking in: go get a workout in today."
- No text travels. The name comes from the receiver's own list.

**Safeguards.** The rules enforce each one (`friends-rules.mjs` M):

- **Friends only:** both sides of the connection, the receiver approved,
  never yourself.
- **One a day, by the server's clock.** The nudge is allowed only in the same
  write as the sender's own stamp, `people/{from}/nudged/{to}`. That stamp
  can't be written again, moved or deleted for 24 h, so dismissing a nudge
  doesn't open the door to the next one.
- **Allow nudges from <friend>** (on by default) is `people/{me}/nonudge/{fid}`.
- **Mute all nudges** is `people/{me}/quiet`. A nudge blocked by either switch
  is refused.
- **Fixed words only:** `v` must be 0, 1 or 2, and `$other` is false.
- **Expiry:** the app hides nudges over 7 days old and deletes them.
- **Dismiss:** the receiver deletes it, and the sender can take one back.
  Removing a friend deletes the nudges between them.

**Delivery.** The Friends tab shows an "A nudge" card at the top with a
Dismiss, and the dock's dot shows. The usage counter is `nudgeSend`.

**Push.** `PUSH-NUDGE-CONTRACT.md` covers it: the private token path
`users/{uid}/push/{deviceId}` and its rules, the Worker route
`POST /nudge/push` (it re-reads the nudge the rules accepted and trusts
nothing in the body), the APNs payload, and the one fire-and-forget line the
client adds later. Nothing v68 ships changes when push arrives. Nothing is
built.

**Checked in Chrome.** Bob's nudge showed with the dock dot. Tapping Nudge on
Jo wrote the nudge and the stamp in one update and toasted. Dismiss deleted
it. The "Allow nudges from Bob" switch wrote `nonudge/uBob: true`.

## 5. Small backlog fixes

| item | state | what I did |
|---|---|---|
| Lift target over 2,000 lb says Saved and deletes the target | **already fixed in v53** (`coach-ui.js` validates first; `coach-surface.mjs` tests 2,001 lb, 908 kg, 907.18 kg) | skipped; re-read the code and the test |
| Coach card repeats the same earned line every open (24 h rule) | **already built in v53** (`pickHype` with `key`, `coach-hype.mjs` G: "a fact value shown once in 24 hours under any id") | skipped |
| Web buttons under 44px | `.btn` **already 44 since v47**. A Chrome sweep of every button on every tab and the hub at 390 and 320 found no `.btn` under 44. The 40px pair was really the picker and library rows (`.ex-item`). | `.ex-item` is now `min-height: 44px`; `touch-target.mjs` I |
| Stale ~10-minute window after a ship | **still open** (v44 fixed modules; `index.html` navigations still used the HTTP cache) | shipped `report/index-stale.md`'s recommended option B: a background conditional request beside each navigation; the window becomes one launch. New `tools-check/sw-navigate.mjs` (20) |
| ZXing not cached offline | **already fixed** (`crossOrigin = 'anonymous'`, `scanner-offline.mjs`) | skipped |
| You tab about 7 extra reads per render | **already fixed in v57** | skipped; measured in Chrome on this build: **0** `users/` GETs per switch to You |

I left some Chrome under-44 findings alone, because each is a separate design
pass and none was on the list. They are in the run, not in this ship:

- the calendar ‹ › arrows (34px)
- filter chips (28px)
- the ⋯ menus (29px) and You's "why" ⋯ (17px)
- the You and Fuel gears (36px and 34px)
- the live session's calendar and Coach buttons (38px)

---

## Rules Micah must publish

Paste the whole `database.rules.json` (Firebase → Realtime Database → Rules →
replace all → Publish). It only adds inside `social`, and changes nothing
else:

```
social/shared/$uid/av            { p ≤ 6000 chars, JPEG data string; at = now }   .read = same as `me`
social/nudge/$to                 .read: the receiver
social/nudge/$to/$from           .read: the sender; .write: delete by either, or the sender while
                                 both are friends, receiver approved, not nonudge/$from, not quiet,
                                 and only beside people/$from/nudged/$to = now (not already now)
                                 { v ∈ 0,1,2 ; at = now }
social/people/$uid/nonudge/$fid  owner only; true
social/people/$uid/quiet         owner only; true
social/people/$uid/nudged/$to    owner only; = now; only when the last is ≥ 24 h old, and only
                                 in the same write as the nudge
```

`database.rules.OPTIONAL-LOCK.json` got the identical change (`friends-rules.mjs`
K holds that). DEPLOY.md's "v68" section has the Rules Playground checks.
**Either order is safe.** Before the publish, faces show as letters and a
nudge says it didn't go through. Everything else works exactly as in v67
(`friends-v68.mjs` §2 runs the real app against v67's rules).

## Tests

- **All 100 verifiers exit 0.** That's 5,349 checks across the 89 that print
  a pass count.
- One environment note: the working clone was shallow, so the 24 verifiers
  that compare against old commits failed at baseline. Unshallowing the clone
  (`git fetch --unshallow`) fixed that. Nothing in the repo changed.
- **New verifiers:**
  - `warmup-leaks.mjs` (26)
  - `settings-back.mjs` (18)
  - `friends-v68.mjs` (57)
  - `sw-navigate.mjs` (20)
- **Extended:**
  - `grey-last.mjs`: 36 → 55 (G and H)
  - `friends-rules.mjs`: 197 → 252 (L and M)
  - `touch-target.mjs`: 384 → 389 (I)
- **Updated to the new rule, each commented "v68, on purpose":**
  - `merge-invariant`, `bodyweight-sets`, `blocks`: the index has warm-ups
  - `units`: one more display site
  - `you-structure`: kid()
  - `friends-structure`: 9 stamps, rack-v68
- **In Chrome (Playwright over `report/btn-44/fakes`):**
  - the warm-up flow
  - all 16 Settings rows and Admin
  - the Friends tab with faces and nudges
  - a button-height sweep at two widths
  - You's reads

## Risks

- **The index shape changed.** Native, until it ports this, writes
  `history/{exId}` without warm-ups. Each device's next finish or edit
  rewrites the whole index its own way, so on a phone that alternates web and
  native the grey warm-ups come and go until native ports §1.1. It never
  costs a number: nothing that counts reads the index.
- **The one-time upgrade** writes the whole `history` node once per device.
  It is guarded in four ways: online only, `readExact`, skipped during a
  workout, and skipped if the rebuild is empty.
- **The nudge's 24 h cap and the face's checks** are proved against the repo's
  rules model, not Google's evaluator. Run DEPLOY.md's Playground checks.
- **sw.js option B** assumes the background request and the next launch
  share one WebKit HTTP cache entry. If they don't, B does nothing and harms
  nothing (`report/index-stale.md`).
- **`.ex-item` and `.back-btn` got taller,** by 4 and 11 px. Lists are a
  little longer, and nothing else moves (`min-height` only adds).

## What the native port must copy

`NEXT-NATIVE-V68.md`, file by file. In short:

- **Warm-ups:**
  - `foldSessionIntoHistory` keeps warm-ups (skipping an exercise with no
    working set)
  - `nextGrey`, `blankOrAdopted` and `warmupsText`, verbatim
  - the one-time index rebuild
- **Settings:** rows push onto the Settings stack so back returns to the
  list, with a 44 pt back control.
- **Friends:**
  - `friends-core.js` verbatim (avatar bounds, nudge model, paths, the
    `readPeople` additions)
  - `friends-data.js` rewritten for publishing and reading the face (its own
    write), and for sending, dismissing and switching nudges
  - the screen: faces over letters, a Nudge button beside each row, the nudge
    card, and the two switches on a friend's page
- **Rules:** the five `social` nodes, in native's PROPOSED rules if it keeps
  one.
