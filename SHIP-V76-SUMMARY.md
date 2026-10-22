# rack-v76 (Coach v2 ship 6, the last) — "bubbles that read the day"

Built 22 Oct 2026 on branch `ship-v74c`, from `rack-v74` as shipped (`main` =
`92dd00f`). Not merged; nothing deployed. The brief is `SHIP-V74-PROMPT.md`,
written when this ship was numbered v74; v74b shipped in between (the
dead-end fallback and `q_want_next`), and `rack-v75` ("replace exercise") is
being built in parallel elsewhere, so this one is **`rack-v76`** — `sw.js`
and `usage.js` both say so. The earlier, unfinished `ship-v74` branch was read
for ideas and not merged.

**Nothing in the published rules moves.** `database.rules.json` and
`database.rules.OPTIONAL-LOCK.json` are byte-identical to rack-v74. Every new
fact is a child of the already granted `settings/coach` (`knowBy.hold`,
`know.back`, both declared in v72's `KNOW_KEYS`); the tap memory is device
storage. No Worker change. Coach still never runs on the network.

## What changed

### 1. The starter bubbles read the day (`coach.js` `topicsFor`)

The sheet's bubbles used to be a fixed list per state. They are scored now
(COACH-V2-SPEC §8): the state's list is the base (5, 4, 3, 2, 1, 1 … by
position) and the day moves it —

| | |
|---|---|
| +2 | *How's my food?* / *Am I fueled?* between 11:00 and 16:00 |
| +2 | *What should I train today?* before a session, before 11:00 |
| +3 / +2 | *How did today compare?* / *What's next time?* just after a session |
| +3 | *What should I train today?* before a session, two days or more since the last |
| +3 | *Any records lately?* / *Good day for a record?* with a record in the last three days |
| +4 | the one question bubble (the opener's question, labelled by its new `short`) |
| +1 | the aim's own: cut → weight; strength, powerlifting → lifts, records; muscle → weekly volume, balance |
| +1 | *Am I fueled?* before a session with nothing logged today (Food on) |
| −3 | the record bubbles when the rest read says rest or lighter, or a lighter week is on |
| −2 | any of the last five bubbles he tapped on this phone |
| −∞ | a muted category |

Picked: the top (never a question before a session — the first bubble is
always something he can ask), then the next highest of a category not taken
yet, to three; a fourth only at 60% of the top's score; at most one question;
the rest behind **More** in score order. Ties go round on the open counter.
Every bubble still has to answer (the shipped filter). The You card's lead
question is unchanged (it reads the set, not the order).

On **Pro** the opener's question is no longer drawn the moment the sheet
opens — it is one of the bubbles, drawn (and stamped) when he taps it. On a
rest or lighter day there is no question bubble at all. **Basic**, which sees
no bubbles, still gets the opener drawn as before.

The tap memory is `rack:{uid}:coachTaps` (`coach-data.js` `rememberTap`,
synchronous, five deep, beside `coachGreets`); `coachInput()` hands it on as
`recentTaps`.

A new bubble, **Any records lately?** (`ask_records`, the shipped records route
`recent_pr` → `pr_proximity`), sits at the end of Train's after-a-session list
with its own category, so a record can stand beside *How did today compare?*
instead of being crowded out by it (decision 3).

### 2. "Came in 15% under — on purpose?" (`q_drop_why`, `knowBy.hold`)

When a lift's top load falls more than 15% under the session before (same
scheme, the two under twelve days apart, neither a heavy single nor
bodyweight — `coach-prog.js` `dropOf()`), the recap asks — or, if the recap
did not, the question rides under *What should I lift today?*:

> **Barbell Bench Press came in 16% under last time. On purpose?**
> *Building back up — hold it* · *Lighter week* · *Just that day*

That percentage is a share of his own two logged loads and is the only `%`
Coach prints (`coach-voice.mjs` Q, `recap.mjs` B hold it to that one sentence).
Nothing medical is asked or said. Any answer stops the question on that lift
for 42 days.

- **Hold it** — "Noted. I'll hold Barbell Bench Press at 155 lb until you take
  it higher yourself." Every target holds last time's weight and reps (mode
  `hold`, code `held`): "Holding Barbell Bench Press at 155 lb while you build
  back, as you asked." / "That stands for six weeks from when you told me, or
  until you go heavier yourself." The shape defer the drop used to cause is
  answered; a session that reaches the top is held, never stepped; the live
  next set never says *heavier* ("You said you're building back on this one, so
  I'd stay here."). It ends after 42 days, or the moment he logs heavier than
  the held session himself — then the shipped rules read from his new load. No
  record day on a held lift.
- **Lighter week** — "Noted. I'll read that as a lighter week, not a new
  programme." While that session is the newest the shipped defer stands (the
  recap already asked); from the next session on it is not `prev` for the
  shape test, no range or step is learned across it, and `coach-overlap.js`
  reads its week as light for that lift (no plateau read off it, no record
  day that week).
- **Just that day** — "Noted." Nothing else changes.

### 3. "Good to have you back" (`q_back_what`, `know.back`)

Twelve days or more since a session: under *What should I train today?* and
*Should I rest or go lighter?* —

> **Good to have you back. Training somewhere I can't see, or time off?**
> *Training elsewhere* · *Time off*

Once per gap (an answer given after his last session is this gap's; a shown,
unanswered one waits twelve days). **Training elsewhere** → "Noted. I'll start
you a little under where you were, not a lot." — until his next session,
every lift re-enters at 90% whatever the gap (never the far 80%), and the why
says "You said you kept training, so a small step back rather than a big
one." At a 40-day gap that is 165 lb off a 185 bench, where *Time off* (the
shipped ladder) is "lighter than last time" with no number. **Time off** →
"Noted. I'll start the weights lighter and work back up with you." and the
shipped ladder.

### 4. The battery's last gate

`generator.mjs` gives every `injured_lighter` lifter the answer he would give
— `knowBy.hold.<exId> = hold` on each loaded lift of the injured group, a few
minutes after the drop session (a third fork, so every seed keeps its lifter);
`harness.mjs` hands a fact to the engine only from its `at`; `scoring.mjs`
drops `needsAnswer` from `T_INJURED` and `R_INJURED`. No code carries it now,
so `GATE=all` fails on every wrong.

## Scope against the brief, and what I skipped

| brief | here |
|---|---|
| `q_want_next` keyed by shape, on the recap; `push`/`ease` in `decide()` | **skipped** — shipped in v74b, keyed by the lift, asked in the gym (its decision 1) |
| the builder drops a set per lift on `ease` | **skipped** — v74b's *Ease off* told him "Nothing heavier than last time on it today", not fewer sets; dropping one would contradict the words he tapped (decision 2) |
| `q_drop_why`, its rules, `light` as a light week | built (`lightMarks` became `lightAt` on the lift: the same lift-only light week, with no second input to thread) |
| `q_back_what`, `elsewhere` → 90% | built; its cooldown is 12 days, not 0 (decision 4) |
| scored starter bubbles, `recentTaps`, `rememberTap` | built |
| Settings → Coach rows for the new facts (BUILD-PLAN) | **skipped** — there are no rows for any stored fact yet (v72–v74 added none); a Settings ship of its own |

## Decisions for Micah

1. **The hold lasts 42 days and is not renewed.** OPEN-QUESTIONS #5's
   default. A full sweep of every session of the battery's injured lifters
   (not the gate's 8 cut-offs) found one heavier target in 271 reads inside an
   injury window, on a lift where the answer had run past 42 days — a
   56-day injury in the simulator. The gate's cut-offs do not land there, so
   the battery reads 0. If you want it to last until you are back at the
   weight you dropped from, or to ask again near the end, say so.
2. **No set dropped by *Ease off*** — see the table. Say if you want the
   builder to propose one fewer set per lift after it.
3. **"Any records lately?" is its own category for the bubble pick.** Under
   the one-per-category rule, *How did today compare?* (a progression read)
   would always push the records bubble behind More after a session with a
   record — the opposite of the spec's worked example.
4. **`q_back_what`'s cooldown is 12 days** (one gap), so a question you saw and
   closed is not put again on every open while you are still away, and the
   week's budget never loses a stamp to its own re-ask.
5. **On a rest or lighter day there is no question bubble.** The spec's
   worked example says "no question"; the formula had no rule for it, so I
   added one: a day I'm telling you to rest is not a day to ask you things.
6. **"Before a workout, What should I train today? first, Make me a workout
   second"** (your v46 order) now holds only for the first place; the second is
   the day's (at midday *Am I fueled?* can come second).

## The gate

- `node --check` clean on every module. Every verifier exits 0 in
  `America/New_York`, `UTC` and `Pacific/Auckland` (`coach-ready.mjs`'s 150 ms
  check flaked once under the load of a parallel run and passed alone).
  Because the bubbles read the local hour and several verifiers take their
  clock from the wall, the sixteen that touch the sheet were also run in nine
  `Etc/GMT±N` zones, three hours apart — every local hour band: all pass
  except `coach-patterns.mjs` (Etc/GMT−6, −9) and `coach-live.mjs`
  (Etc/GMT−9), which **fail identically on rack-v74 itself** (checked on a
  worktree of `92dd00f`): wall-clock fixtures, nothing this ship touched.
- New: `tools-check/coach-bubbles.mjs` (720 sheets swept — deterministic,
  never muted, only what answers, never a question first before a session,
  one question at most, three categories first; the five worked examples; the
  tap memory), `coach-ask.mjs` H (the drop and the gap: text, chips, acks in
  both units, the 15% line, no layoff, never after an answer, mark or harder
  day, once per gap, the facts on the lifts), `coach-prog.mjs` M (`dropOf`,
  hold / reaches the top / goes heavier himself / a replay never reads it /
  the next set; lighter week now and next time, no step across it;
  elsewhere at 40 days → 165), `coach-voice.mjs` Q (coach-ask.js under the
  voice ban; exactly one `%`), `recap.mjs` B (the drop question is the page's
  one `%`; *Hold it* writes `knowBy.hold` through `learnBy` with the load in
  its ack). Updated deliberately, literal by literal: `coach-state.mjs`,
  `coach-surface.mjs`, `coach-rank.mjs` (the set, not the order; the engine's
  first shown; the question bubble; "More" tapped where the day put a
  bubble), `coach-goal.mjs` (five routes may carry a question),
  `friends-structure.mjs` (the build string).
- **The battery at `GATE=all`: wrong 0 — engine 0, untagged-warmup 0,
  needs-answer 0, with `needsAnswer` gone from every code**; 15 regressions
  pass; properties pass; `run-all.sh` exit 0. 300 lifters, 25,179 sessions,
  2,400 cut-offs; every count is identical to rack-v74 (target 8,389 / 1,556
  miss; nextSet 38,245 / 326; live 87,978 / 288; plateau 21,152 / 184); dead
  ends 0 of 56,637 and 0 of 8,171. The 8 cut-offs a lifter rarely land on an
  injury window, so I also read **every** session of the 14 injured lifters'
  injured-group lifts: 271 targets, 26 of them the new held target, and one
  heavier than his last top — 43 days after the answer, past the 42 (decision
  1).
- `database.rules.json` and `database.rules.OPTIONAL-LOCK.json`: byte-identical
  to rack-v74.
- Pure files as committed (sha256): `NEXT-NATIVE-V76.md` §1.
- `echo GUARDTEST ping` echoed in this session: this cloud clone carries no
  deny rules. I ran no `wrangler`, `firebase`, `eas` or `gh`, and pushed only
  the branch.

## Handoff

- **Shipped** — Coach's starter bubbles are scored from the day (at most one question, never first before a workout), and two new questions — a lift 15% under ("On purpose?") and the first answers after twelve days away ("Training somewhere I can't see?") — feed holds, lighter weeks and a 90% re-entry.
- **Service worker** — `rack-v76` (`sw.js` and `usage.js` together).
- **Before it's live** — nothing, merging is enough (no rules change; native is its own port, `NEXT-NATIVE-V76.md`).
- **To check it worked** — close Rack from the app switcher, open it, close and open once more. Tuesday morning with no session: Coach on Train leads with *What should I train today?*, shows at most one question bubble and never first. After a session: *How did today compare?* first. After a lift comes in 15% under: the recap asks "… came in 16% under last time. On purpose?" → *Building back up — hold it* → the next target reads "Holding … while you build back, as you asked." First open after two weeks away: the card's back line, and under *What should I train today?* the question about where you trained.
- **Risk** — the hold cap lasts 42 days from the answer and is not renewed (decision 1); the why says so every time. The bubbles' order changes from the fixed lists you are used to.
