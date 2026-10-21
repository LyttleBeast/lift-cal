# Porting rack-v68 to rack-mobile

Web ships as `rack-v68`, built on `rack-v67` (`82fd37d`). The tree it mirrors is
`~/dev/rack-mobile`.

v68 is four things, in this order:

1. **Warm-ups in the grey "last time" rows.** An exercise added by hand now
   offers last time's whole ramp (the `W` sets, in order, still typed `W`) and
   then the working sets. The "Last ·" line says the warm-ups compactly. This
   changes **one stored shape**: `history/{exId}` keeps warm-ups now.
2. **Settings has a back arrow.** Every sheet a Settings row opens carries
   "‹ Settings", which goes back to the hub. Back no longer closes Settings.
3. **Friends: faces.** A friend's profile picture, published small at
   `social/shared/{uid}/av`, is shown instead of their letters.
4. **Friends: the nudge.** A Nudge button on each friend row. It is in-app
   only for now (`PUSH-NUDGE-CONTRACT.md` covers phone notifications later).
   It adds rules under `social/`.

Plus two backlog fixes on web that native may already have: the picker's rows
at 44px, and sw.js's background refresh of `index.html` (web only; native has
no service worker).

**Rules:** v68 changes `database.rules.json` under `social/` only, and it is
**Micah's to publish** (section 6). Nothing under `users/` changes in the rules.
The Worker does not move.

---

## 1. Warm-ups in the grey rows (workout screen)

### 1.1 `history/{exId}` keeps warm-ups: a stored-shape change

`workout.js` `foldSessionIntoHistory()` used to keep only working sets
(`keepSets(ex.sets, isWorking)`). It now keeps **every** set of an exercise,
typed as it was:

```
history/{exId} → [ { date, sets: [ { w, r, type, dp? } ] }, … ]   newest first, 20 max
                                     ^ 'W' rows now included, in session order
```

- An exercise is indexed only when it has **at least one working set**
  (`sets.some(isWorking)`), the rule `recordGroups` follows. A day of only
  warm-ups is never anybody's "last time".
- The index's only readers are the "Last ·" line, the grey rows and the
  picker's row count (`picker.js` `historyCounts`, a length). **None of them
  is a volume, record, stats or Coach read.** Every one of those reads
  `workouts` and filters with `isWorking`. `tools-check/warmup-leaks.mjs`
  holds this: it runs the real analytics, Coach, recap and friends-board code
  over one log, with and without a heavy warm-up ramp (warm-ups heavier and
  longer than the working sets), and requires identical answers. Port it
  pointed at native's verbatim copies.
- **Native's index writer must change the same way.** Wherever native folds a
  finished session into `history` (its `foldSessionIntoHistory` equivalent),
  replace the `isWorking` filter with "keep every set, but skip an exercise
  with no working set". The rebuild-from-log path folds through the same
  function, so it changes with it.

### 1.2 The one-time upgrade

An index folded before v68 has no warm-ups, so Micah's last squat day would
keep starting at 315 until he squatted again. Web rebuilds the index once per
account per device: `workout.js` `upgradeHistory()`, run from `initWorkout()`
when no session is open.

- It is **online only** (offline, `readExact` answers from the mirror, which is
  not the log).
- It reads `workouts` with `readExact`, never `allSessions()` (that resolves
  `[]` on a failed read, and an index rebuilt from `[]` is an erased one).
- It aborts if a workout is opened mid-way.
- It writes through the same `foldSessionIntoHistory` and `trimHistory`, and
  sets the device flag `historyWarmups` only after the write lands.

Native: the same, once, behind its own device flag. Web and native writing the
same rebuilt index is harmless, because both are the log folded the same way.

### 1.3 The grey rows: `nextGrey()` (pure, beside `lastTargets`)

```js
export function nextGrey(prevSets, todaySets)  // → { tw, tr, type?: 'W' } | null
```

**The rule.** Copy it from `workout.js`, don't re-describe it.

- Last time's rows are filtered to `r >= 1`. The warm-ups are those **before
  the first working set**.
- While today's sets of this exercise hold **no working set**, and fewer
  warm-ups than last time had, the next row is last time's next warm-up,
  returned with `type: 'W'`.
- Otherwise it is `lastTargets(rows, <today's working-set count>)`, the v54
  rule unchanged: set n takes last time's n-th working set, and past the end
  it repeats the final one.
- A bodyweight row (`w` `'0'`) has a `tw` of `''`, never a printed "0".
- An index entry with no `W` rows (anything folded before the upgrade) reads
  exactly as v54 did.

`greyFor(ex)` now calls `nextGrey(prev.sets, ex.sets)` instead of
`lastTargets(prev.sets, <non-W count>)`. Its spread puts `type: 'W'` on the
new row, so it is drawn as a warm-up. Everything else about a grey row is
unchanged:

- `tl: true`.
- Empty `w`/`r`.
- A tick adopts the grey numbers (`tickSet`): an empty box takes the target,
  and a typed box is never overwritten.
- `collectFrom` strips `tw`, `tr` and `tl`.
- Only in a LIVE session, never in an edit of a past one.
- Never on an exercise carrying a routine's or the builder's targets.

### 1.4 "+ Set" continues the sequence: `blankOrAdopted()`

`addSetTo(ex)` used to offer grey only when the set above had both boxes
blank. Now it also does so when the set above is **a grey row he ticked
without changing it**: `tl` set, and each box equal to its target. Ticking
45 × 10 and tapping "+ Set" means "the next one" (45 × 8 W), not "45 × 10
again". A row he typed a different number into is his, and "+ Set" copies it
exactly as it always did.

When grey applies, the new row is `{ w: '', r: '', type: 'N', done, ...grey }`
(grey's `type` wins). Otherwise it is the old copy. Port both functions
verbatim.

### 1.5 The "Last ·" line: `warmupsText()` (pure)

```
Last · Oct 17   warm-ups 45 to 225 · 315×5  365×2  365×2
```

- `warmupsText(sets, one)` returns `''` for none, `"warm-up 135"` for one, or
  `"warm-ups <lightest> to <heaviest>"`. `one` is the caller's load printer
  (`fmtSetLoad(w, wu())`, so kilos convert at the screen).
- The working sets after it are `setsText(keepSets(prev.sets, isWorking), …)`.
  That is the old line, so a drop set still reads as one group.
- Native's line is built the same way. Count the warm-up text as one more
  display site of `fmtSetLoad` (web's `tools-check/units.mjs` count went from
  4 to 5 in `workout.js`).

### 1.6 Verifiers to port

- `tools-check/grey-last.mjs` G and H: Micah's squat (45, 45, 135, 135, 225,
  then 315 × 5, 365 × 2, 365 × 2), adoption row by row, a changed row, counting
  by kind, the old-shape entry, bodyweight, and the line in both units.
- `tools-check/warmup-leaks.mjs`, whole.
- `merge-invariant.mjs`, `bodyweight-sets.mjs` and `blocks.mjs` were updated
  for the new index shape. Read their v68 comments.

---

## 2. Settings: a back arrow on every sub-screen

**Web.** `settings.js`'s hub opens every row's screen through `kid(open)`:

- `kid` closes the hub, then runs `open()` inside `ui.js`
  `asChildSheet(backArrow(onEdit, who, q), open)`.
- `asChildSheet` is a one-shot hook. The **first** sheet opened while `open()`
  runs gets the decoration, put directly under the grab, before the opener
  draws anything. A sheet opened later, or by anything else, gets none.
- `backArrow` draws a "‹ Settings" button (aria-label "Back to Settings") that
  closes the sheet and calls `openSettings(onEdit, who, { q })`. The hub puts
  the search text back in its box before it draws.
- Admin is a page, so `openAdmin` is handed a back that does the same.
- The four small sheets (Units, Open the app on, Default rest, Coach) no
  longer draw their own arrow.
- Tour, Sign out and Erase are actions, not screens, so they get no arrow.

**Native.** This is a navigation change, not a data change. Every Settings row
pushes its screen **onto the Settings stack**, so the platform back (header
back button and edge swipe) returns to the Settings list with its search
kept. It must never pop to the tab or dismiss the Settings modal. If native
presents Settings rows as separate modals, change them to pushes, or add the
same "‹ Settings" header button that dismisses one and re-presents the list.
The 17 rows:

- profile
- goal
- targets
- water
- steps
- rest
- library
- coach
- vibes
- units
- openOn
- ai
- recall
- paste
- import
- install
- refused

Admin returns to the list as well. You's sub-screens (Weekly review, Trends,
Rack noticed) already go back to You. Keep them that way.

**Sizes.** `.back-btn` is 44px tall on web everywhere it is drawn (Settings,
You's screens, Statistics, Admin). Native's back control must be a 44 pt
target.

Verifier: `tools-check/settings-back.mjs`. Section B reads the real
`settings-registry.js`, so a new row cannot ship without a way back. Port that
idea: a native test that every registry row opens through the stack.

---

## 3. Friends: a friend's face

### 3.1 The node

```
social/shared/{uid}/av   { p: "data:image/jpeg;base64,…", at: <server time> }
```

- `p` is at most **6,000** characters, and must match
  `/^data:image\/jpeg;base64,[A-Za-z0-9+\/]+=*$/`. It is JPEG only: no PNG, no
  SVG, no URL, nothing but base64 after the prefix.
- `at` is a server timestamp.
- `$other` is false.
- Its `.read` is **exactly `me`'s**: approved, both sides of the connection
  standing. **There is no switch.** It is who you are, like your name. It
  goes only to confirmed friends, ends the instant the connection does, and
  removing your photo removes it.

### 3.2 Pure, verbatim (`friends-core.js`)

- `AV_MAX` (6000)
- `AV_PX` (72)
- `AV_RE`
- `avatarOk(p)`
- `readAvatar(av)`, which returns the picture or null

`tools-check/friends-v68.mjs` section 0 holds `AV_MAX` and `AV_RE` to the
rules' own text.

### 3.3 Publishing (the gatherer, `friends-data.js`): port it

- The source is `users/{me}/profile/photo` (144 px, ≤ 24,000 characters, as
  since the October redesign).
- It is redrawn on the device at **72 px square**. The quality steps
  0.7 → 0.55 → 0.4, then the size ×0.8 down to 32 px, until
  `avatarOk(d) && d.length <= 6000`. **A picture that cannot fit is never
  sent**, because the write would be refused. Native does this with the
  platform image API, JPEG.
- It is written in **its own** `updateShared({ 'social/shared/{me}/av': … })`
  after the summaries' write, never inside it. Under rules published before
  v68 it is refused, and that refusal must cost nothing but the face.
- Device fingerprint `friendsAv`: `{ key: <length:last 48 chars>, day }`. It is
  saved only when the write lands, so it retries on the next publish and
  rewrites at most once a day.
- With no friends, or no photo, it is deleted.

### 3.4 Reading and drawing

- `loadFriends()` adds `d.av = readAvatar(await readShared(…/av))`. A refused
  read is null.
- The avatar draws the picture over the initials. Web uses `<img>` with
  `object-fit: cover` inside `.fr-av` and keeps the initials underneath. If the
  image fails to decode, it is removed and the letters show.
- It is drawn on: a friend's row, the board rows, a friend's page, the nudge
  card, and the request and found rows when the data is there. The user's own
  "You" chip stays the word "You".
- **Draw it only as an image source**, never as markup.

---

## 4. Friends: the nudge

### 4.1 The nodes (all under `social/`)

```
social/nudge/{to}/{from}            { v: 0|1|2, at: <server time> }
social/people/{from}/nudged/{to}    <server time>        sender's own stamp
social/people/{to}/nonudge/{from}   true                 receiver: no nudges from this friend
social/people/{to}/quiet            true                 receiver: no nudges from anybody
```

**Who may do what.** The rules are in `database.rules.json`, and
`tools-check/friends-rules.mjs` section M holds each item below.

- **Sending** is one multi-path update:
  `{ nudge/{to}/{me}: { v, at: TS }, people/{me}/nudged/{to}: TS }`.
  - It is allowed only if both list entries stand and `{to}` is approved.
  - It is refused if `nonudge/{me}` or `quiet` is set on `{to}`.
  - It is allowed only beside a stamp that is `now` in the same write, and only
    if the previous stamp is ≥ 24 h old **by the server's clock**.
  - The stamp cannot be moved or deleted for a day, so a dismissed nudge does
    not open the door to the next.
  - A nudge without the stamp is refused.
- **Content** is `v` ∈ {0, 1, 2} and `at`. That's all: no text travels.
- **Reading.** `{to}` reads the whole box, and `{from}` reads only their own
  slot.
- **Deleting.** `{to}` dismisses, and `{from}` can take one back.
- **The switches** are written by the owner only. `true` or absent.

### 4.2 Pure, verbatim (`friends-core.js`)

- `NUDGE_LINES`, the three wordings with `{n}`:
  - "{n} says you are slacking off. Get in there."
  - "{n} thinks the bar misses you. Time for a session."
  - "{n} is checking in: go get a workout in today."
- `NUDGE_GAP` (24 h)
- `NUDGE_TTL` (7 days)
- `nudgeText(v, name)`, which uses the first name **from the receiver's own
  list**, never anything the sender wrote
- `nextVariant(prev)`: 0 → 1 → 2 → 0, per friend, as device state `nudgeV:{fid}`
- `readNudges(node, peopleNode, now)` → `{ live, stale }`. Live means from a
  current friend, a known `v`, and under a week old.
- `nudgeWait(sentAt, now)`
- `PATH.nudges`, `PATH.nudge`, `PATH.nudged`, `PATH.noNudge`, `PATH.quiet`
- `readPeople()` now adds `nudges` (allowed?) and `nudgedAt` to each friend,
  plus `quiet` and `orphanNoNudge` to the result

### 4.3 The gatherer (`friends-data.js`): port it

- Watch `social/nudge/{me}`. A refused watch is no nudges.
- `tidyNudges()` deletes `stale`.
- `friendsState()` adds `nudges` (live) and `quiet`.
- `waiting()` counts nudges, which drives the dock's dot.
- `canNudge(f)`, `sendNudge(f)`, `dismissNudge(from)`, `setNudgesFrom(f, on)`
  (off also deletes what that friend sent) and `setQuiet(on)` (on also
  deletes the box). Each resolves false or `{ ok: false, why }` on a refusal,
  and the screen flips the switch back.
- `removeFriend` and `tidy()` clear nudges and `nonudge` in **separate**
  best-effort writes, so a refusal under pre-v68 rules cannot block the
  removal itself.
- The usage counter is `nudgeSend`. It is on `usage.js`'s list, and the
  owner panel labels it "Nudge". The usage rules take any event name, so no
  rules change.

### 4.4 The screen (`friends.js`)

- **The friend row.** The row and a **Nudge** button sit side by side (a
  button cannot hold a button). The button is 44 pt tall and at least 76 wide.
  It reads "Nudged", dashed, once used today, and keeps its size.
- **The tap.** A tap sends the nudge and toasts "Nudged Jo. They'll see it on
  their Friends tab." A refusal toasts the reason in words.
- **"A nudge" card** at the top (after requests, before routines). It shows
  the face, the line, "20 min ago" and **Dismiss**, plus a note that nudges
  switch off on the friend's page.
- **The friend's page** gets a "Nudges" section:
  - "Allow nudges from Jo" (on by default)
  - "Mute all nudges"
  - a **Nudge Jo** button, disabled once used today

### 4.5 Push, later

`PUSH-NUDGE-CONTRACT.md`. Native owns the token half
(`users/{uid}/push/{deviceId}`, with its PROPOSED rules there). None of it
is built.

---

## 5. Small things

- **Picker and library rows (`.ex-item`) are 44px tall**, up from 40, measured
  in Chrome. Native's exercise-list rows: check they are ≥ 44 pt.
- **sw.js** has a background `no-cache` request beside each navigation
  (web only; `tools-check/sw-navigate.mjs`). Native has nothing to port.
- **The tile glyph `bell`** is new in `tile-icons.js` (native keeps its own
  copy of that table).

## 6. The rules Micah publishes

`database.rules.json` (and the same in `database.rules.OPTIONAL-LOCK.json`;
`tools-check/friends-rules.mjs` K holds them identical under `social`) adds,
and changes nothing else:

- `social/shared/$uid/av`
- `social/nudge/$to/$from`
- `social/people/$uid/nonudge/$fid`
- `social/people/$uid/nudged/$to`
- `social/people/$uid/quiet`

Until they are pasted, every v68 Friends write is refused:

- Faces fall back to the letters.
- A nudge says it did not go.
- Everything v67 did still works (`tools-check/friends-v68.mjs` section 2 runs
  the app against v67's rules).

If native has its own PROPOSED rules file, add the same five nodes there.
