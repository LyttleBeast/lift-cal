# rack-v71 — Coach speaks in the first person

Shipped 22 Oct 2026 on branch `ship-v71`, from `rack-v70` (`68038c5`). Coach v2
ship 3 of six (`COACH-V2-SPEC.md` §7; `BUILD-PLAN.md` ship 3;
`/home/claude/coach-v2/SHIP-V71-PROMPT.md`). Words only: every diff is a string
literal, a pool table, the finish line's evidence order, or a verifier. No
engine rule moves, no stored field, no node, no rule, no Worker change.

## What changed

**Phase A — the fence first.** `tools-check/coach-voice.mjs` gains
`VOICE_BANNED` and `LABELS` beside the shipped `BANNED` / `CARD_BANNED` (both
unchanged), and a section P that reads every prose literal — a quoted run with
a space and three letters in it, not a class name, an id or an import path,
comments stripped — out of the twelve files that carry Coach's words
(`coach.js`, `coach-prog.js`, `coach-live.js`, `coach-overlap.js`,
`coach-ready.js`, `coach-fuel.js`, `coach-volume.js`, `coach-build.js`,
`coach-ui.js`, `coach-data.js`, `workout.js`, `settings.js`) and fails on any
that has "Coach" as a subject, "Coach’s", "for/to/from/by/with/told Coach",
"Coach target", "we", "let’s", "our", "AI", or a word from 03 §5.2's register
ban. The labels are an exact-match set and the whole exemption: `Coach`,
`Coach · `, `Coach: `, `COACH`, `COACH ME`, `Ask Coach`, `Coach me`, `Coach
settings`, `Ask Coach something`, `Ask Coach what to do next`, `Coach itself`.
The list is wider than the spec's §7.3 by the verbs after `treats` (may,
suggests, mentions, reports, lists, tracks, takes, builds, couldn’t, already,
starts, looks, picked, itself, gives, steps, measures …) and by `told|tell|
ask|asked|asking Coach`, because those are what the actual literals used; the
spec's list alone would have passed "What Coach may bring up" and "you told
Coach". Run before any word moved, it failed on **131 prose literals** (the
brief's ≈250 counted comments): coach.js 55, coach-prog.js 20, coach-ui.js
20, coach-ready.js 9, coach-fuel.js 9, coach-overlap.js 7, coach-volume.js 6,
coach-live.js 2, coach-build.js 1, settings.js 2, coach-data.js 0,
workout.js 0. The battery's `scoring.mjs` `BANNED` carries the first four
rows (the third-person rows), so a sentence assembled from fragments is
caught in the rendered text (`T_TEXT` / `N_TEXT` / `L_TEXT`).

**Phase B — the migration, file by file, one commit each.** 131 → 0
offences. The rewrite table in the prompt was followed where the sentence
matched; where it did not, the sense. Three sentences lost a verb Micah bans
("need"): `Coach needs a couple of weigh-ins … to tell` → "A couple of
weigh-ins near the start and the end of that stretch would let me tell
whether your weight is part of it."; `Coach needs a few more sessions of this
lift to know your rep range.` → "A few more sessions of this lift and I’ll
know your rep range."; `Coach needs six sessions of it in twelve weeks to put
a pace on it.` → "Six sessions of it in twelve weeks would let me put a pace
on it.". `Still reading Coach’s settings.` → "My settings are loading." (no
*still*). Every `because` that said "you told Coach" says "you told me".
`Every Coach target met` → "Every target met" (the card, the finish line and
the compare answer's "2 of 2 targets met."). `OPENER[0]` (`coach-live.js`,
after *Too hard*) → "Good call rating it."; `OPENER[2]` "Good." and
`OPENER[4]` "Strong set." kept. Settings row titles kept ("Coach", "Coach
itself", "Ask Coach something"); the notes under them moved ("When I suggest
a lighter week or a rest.", "Whether I may ask you anything at all.", "The
card, and what I can and cannot see."); `settings.js`'s sheet note and "What
you’ve told me". `coach-build.js`'s one logic line that keyed off a literal
(`/^Coach is learning/`, which places "Worked out from …" before it) now keys
off `/^I’m learning/`. `coach-data.js` and `workout.js` had no prose literal
with "Coach" in it — the recap's words come from `coach.js`.

Verifier snapshots that held the old words were changed one literal at a
time: `coach-surface.mjs`, `coach-ready.mjs`, `coach-state.mjs`,
`coach-fuel.mjs`, `coach-volume.mjs`, `custom-movement.mjs`, `coach-prog.mjs`,
`coach-live.mjs`, `effort.mjs`, `finish.mjs`, `feel.mjs`, `coach-pace.mjs`,
`coach-goal.mjs`, `coach-registry.mjs`, `coach-hype.mjs`, `touch-target.mjs`
and two keys of `touch-target.snapshot.json`. `coach-volume.mjs` M0 keeps
rack-v55's own words on purpose: it compares a module read out of git.

The byte-for-byte checks against older engines (`coach-prog.mjs` D and the
rating section against rack-v48/v51/v53; `coach-ready.mjs` R6, R7, R18, M7
against rack-v51; `drop-sets.mjs` F2 and the sweep against rack-v54) now read
the old engine's `why` strings through a small `VOICE` map (`voiced()`) before
comparing — the promise is still byte for byte, up to exactly the documented
sentence pairs, and a number, a mode or a set that moved still fails.
`coach-ready.mjs` R6 names the first differing string when it fails.

**Phase C — the pools.** `coach.js` §7d, after the warm lines: `BAD_DAY`,
`PR_LINES`, `BACK_LINES`, `REST_LINES` — frozen rows `{ id, gate(view),
text(view, u) }`, a `pickLine()` that walks the eligible rows on the shipped
`rotate(opens, n)` with the card's memory pushing it forward (pickHype's cap),
`backView()` (away ≥ 12 days before training, or `session.back` after),
`prView()` (the record's fields plus the shipped facts a line may quote) and
`bestRepsAt()` (lifted out of `prWhy`). Where they draw:

- `finishOf()`: rated harder or marked → headline "Good work.", `line` one
  bad-day line, `short` still "Showing up on a harder day counts." (so the
  card's form is the shipped one); a record → `line` one PR line (line 1 is
  the shipped "New best on {lift}: {w} x {r}.", so open 0 is unchanged),
  `short` "New best on {lift}."; a comeback → `line` one back line, `short`
  "First session in N days.".
- **Evidence order**: `pr` (e1rm, weight) → `rating` → `targets` →
  `milestone` → `compare` → `pr` (volume) → `back`. A volume record no
  longer outranks his rating.
- The card's warm slot: away ≥ 12 days → a back line (≤ 9 words, the card's
  rule); a rest or lighter day with the switch on → a rest line; otherwise
  the shipped `WARM` pool. Train walks one step ahead, as before. None is
  written to the card's memory (no line quotes a fact value).
- The sheet's opener is unchanged in source and so inherits all three.

Verifiers: `coach-hype.mjs` I (every line through a passing view in both
units under BANNED + VOICE_BANNED, + CARD_BANNED for the two card pools; no
`!`, no pound in kilos, no typed unit word; where each pool draws; the
rotation over 200 opens; the three surfaces agree; the evidence order) and
`coach-rotation.mjs` K (the pools on the counter: no consecutive repeat, N
opens show N lines, a repaint is the same line, a memory of earned lines
starves nothing and moves no greeting). `finish.mjs` N5/N7 and `feel.mjs`
read the pool rather than one sentence. `units.mjs` classifies the one new
`fmtSetLoad` call site (display). `friends-structure.mjs` pins `rack-v71`.

**Phase D — the gate.** `node --check` clean; 101 verifiers exit 0 in
`UTC`, `Pacific/Auckland`, `America/New_York`; `coach-voice.mjs` P reports
zero offences; the battery at `GATE=all`: wrong 0 (see the handoff for the
run). `sw.js` → `rack-v71`, `usage.js` → `rack-v71`. `CLAUDE.md`,
`AGENTS.md`, `README.md`, `BACKLOG.md` updated where the old words were
quoted. `NEXT-NATIVE-V71.md` written.

## The pools as shipped, and what was left out

A line is in a pool only when every word of it is true of his log at the
moment it is drawn — Micah's rule, an untrue sentence is worse than none. So
the pools are smaller than 03's 42-line lists: **bad day 26, record 16,
missed time 27, rest 8.** The brief's rotation check ("no repeat inside seven
days with the pool 40+ deep") holds on the counter for any pool of seven or
more, and the verifiers hold it at that floor. Every dropped line, by pool:

*Bad day (03 §5.4; 15 of 41 out; 2 reworded; 3 gated)*
- 5 "You came in on a day you didn’t have to…" — *didn’t* (BANNED).
- 7 "That one’s behind you." — *behind* (CARD_BANNED).
- 10 "…The work still happened." — *still*.
- 11 "Flat days happen to every lifter in every log I’ve read…" — a claim about other people's logs; I read only his.
- 14 "The next good day is coming…" — a promise the log cannot back.
- 16 "Showing up tired beats not showing up…" — claims he was tired.
- 19 "The plan survives a bad day…" — assumes a plan.
- 20 "…The output just didn’t match…" — *just*, *didn’t*.
- 22 "Call it, rest, come back…" — an instruction.
- 23 "…is still a bar you moved." — *still*.
- 25 "That’s a session I’d expect after a week like yours." — a claim about his week with no fact behind it.
- 32 "One rough session in {n} logged this month." — no shipped fact for a calendar month's count.
- 35 "…it’s because you showed up heavy." — *because* (causal).
- 41 "…than a perfect week of nothing." — *perfect*.
- "A day like this says nothing about next week." — *next week* is a calendar word on a rolling read (`coach-units.mjs`); dropped during the gate.
- Reworded for a banned word, sense kept: 21 "needs more" → "has to be more"; 36 "Just the next one." → "On to the next one."
- Gated on a fact: 13 (`session.count ≥ 30` — "Thirty do"), 18 and 30 (a mark — "not counting it against you" / "Set it aside. I will." are true only of a marked session), 37 (`session.count ≥ 10` — "I’ve seen your good days").

*Record (03 §5.5; 26 of 42 out)* — kept 1, 2, 3, 4, 5, 6, 9, 12, 15, 16, 22,
26, 31, 38, 41, 42, each gated on the record's own fields (`set`, `kind`,
his best reps at that weight, a second record, no set to failure, the lift
target on this lift, his session count, the sessions holding the lift, his
word for a cut). Out: 7 (every other set held — no fact), 8 (since {month}),
10 ("You’ve never…" — *never* of him), 11 (coming for three sessions), 13
(same weight six weeks), 14 (top of your range), 17 ({shape} day — needs the
session's shape name, awkward and unneeded), 18 (12-week pace), 19 ("Rep
record" is not what an e1RM record is; "I’ll read the next target" is Pro),
20 (claims a hold rule that applies only under the confirm dial), 21 (third
this month), 23 (before the break), 24 (first on a custom lift), 25 (reps to
spare by rating — the record set's `rir` is not carried), 27, 28 (accessory
work — causal), 29 (shorter than usual), 30, 32 (big three's weakest), 33
(records list — not a surface I can name), 34 (*just*), 35 (a percentage on
the recap), 36 (top single in {month}), 37 (targets claim), 39 (first of the
week), 40 (a double last month).

*Missed time (03 §5.6; 15 of 42 out; 5 trimmed to nine words; 03's three "ships
as" corrections applied to 17, 26, 36)* — out: 3 ("First open in a while" —
I cannot tell a first open), 5 (*we*; 03 missed it), 8 ("Your plan’s waiting"),
13 (*lighter*, and a targets claim), 16 (*lighter*), 19 (*still*), 22 (a
promise), 23 (a targets claim), 24 ("the second one counts" — a claim about
how I read), 25 (*just*), 27 (*only*), 30 ("I’ve kept it light" — a claim),
39 ("the numbers came with you" — no fact), 40, 41 (two sessions / first
week back — no fact). Trimmed, sense kept, so they fit the card (their only
surface before he trains): 7, 9, 17, 31, 35. Gated: 6 and 38 on the gap, 18
on a gap of exactly twelve days, 20 and 38 on the session back being logged,
34 on an earlier gap this long in the log.

*Rest (03 §5.7; 34 of 42 out; 1 trimmed)* — the card's warm slot is the only
surface, and it holds a line to nine words, so every line that names
specific groups, a count this week, a rating, a target or a plan is out
(2, 5, 6, 8, 9, 10, 12–21, 23–26, 28, 29, 31, 34–36, 38–40, 42), as are the
lines with *overdue* (17, 38), *under* (12), *below* (39), *missed* (40),
*just* (26), "this week" (9, 34), and the two over nine words (4, 27, 30,
32). Kept: 1 (gated on a run of exactly three — the recovery line already
says the longer runs), 3, 7 (trimmed: "Nothing in your log asks for a
session today."), 11, 22, 33, 37, 41.

## Decisions for Micah

1. **The pools are honest, not deep.** 26 / 16 / 27 / 8 against 03's 42
   each. Every line out has a reason above; several of 03's lines could come
   back in v72+ when the fact they quote exists (a calendar-month count, a
   rep-record kind, the record set's own rating). Say if you want any of the
   dropped ones back as written — each is one row.
2. **The voice ban is wider than the spec's.** §7.3's verb list would have
   let "What Coach may bring up" and "you told Coach" through; the shipped
   list adds the verbs and prepositions the real literals used. Native's
   `verify-coach-voice.mjs` should take the list in `NEXT-NATIVE-V71.md` §3,
   not the spec's.
3. **"Coach itself" stays as a Settings row label**, and its note is first
   person. If the label reads oddly beside "What I may bring up", "The card"
   is the alternative; it is one string.
4. **Three "need" sentences changed shape** (listed under Phase B) because
   "need" is on your no-list for the card and sheet. The brief's own
   rewrite table kept "Coach needs" → "I need"; I did not.
5. **The card's harder-day short stays "Showing up on a harder day counts."**
   while the recap and sheet read a bad-day pool line — the card's nine-word
   limit would have dropped most pool lines to the reason slot. The three
   surfaces still read one `finishRead()`; the sentence differs, the meaning
   does not.
6. **The `GUARDTEST` canary echoed** in this session (the deny rules live in
   `.claude/settings.json` of the mobile and worker repos, not in a fresh
   lift-cal clone). Nothing here needed `wrangler`, `firebase`, `eas`, `gh`
   or a push to `main`, and none was run; the branch is `ship-v71` and only
   it was pushed.

## Handoff

- **Shipped** — Coach speaks in the first person everywhere (131 literals,
  zero left; "Coach" survives as a label), a fence that keeps it so, four
  encouragement pools drawn on the recap, the sheet and the card, the finish
  line ranking a weight record above his rating above a volume record, and
  "Good call rating it." after *Too hard*.
- **Service worker** — `rack-v71` (`sw.js` and `usage.js` together).
- **Before it's live** — nothing, merging `ship-v71` is enough. No rules
  change, no Worker change.
- **To check it worked** — after merging, close Rack from the app switcher,
  open it, close and open once more. Open the Coach sheet on You, on Train
  and in a live session: no sentence says "Coach is/can/wants"; the eyebrow
  still says Coach. Finish a workout and rate strength 80%: the recap says
  "Good work." with one bad-day line under it, then asks "Anything I can’t
  see?". In the gym, rate a set *Too hard*: "Good call rating it. Stay at …".
  Settings → Coach: the note under the title starts "What I may bring up".
- **Risk** — a sentence built from fragments that the literal extraction
  does not see as one string. Two were found and covered: the finish line's
  "Every Coach target met: m of n." (built from three pieces — rewritten and
  held by `finish.mjs`, `coach-hype.mjs` C) and the compare answer's "m of n
  Coach targets met." (held by `coach-hype.mjs` C, `finish.mjs`). The
  battery's `scoring.mjs` now carries the third-person rows, so any other
  fragment-built sentence trips `T_TEXT` / `N_TEXT` / `L_TEXT` in the
  rendered output: 0 across the gate run. `coach-ready.mjs`'s replay-budget
  check (150 ms) flaked once under load during this run and passed alone and
  in the three-zone sweep; it is a timing check, not a voice one.
