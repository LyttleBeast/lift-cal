# Porting rack-v74 (ship v74b) to rack-mobile

rack-v74 is "Coach never answers with nothing" (`SHIP-V74B-SUMMARY.md` for
what shipped and why). Read `NEXT-NATIVE-V73.md` first — the live sheet, the
chip row and the step question are v73's and this ship builds on them. Nothing
here is published to the database rules: `database.rules.json` is
byte-identical to rack-v73. The build string is `rack-v74`.

## 1. The pure files, verbatim

Five pinned files moved. Copy them byte for byte into `src/pure/` and re-pin;
the sha256 of each as committed on `ship-v74b`:

| file | sha256 | what changed |
|---|---|---|
| `coach-live.js` | `c162045d190418145da2a5d26da79c9df50f62a442f49ea87a726099695ec58d` | `fallbackRead(input, exId)` (new export) and its helpers `lastOf`, `quoteOf`, `blocked`, `reasonOf`, `steerWords`; `anotherSetRead()`'s defer branch quotes last time and carries `steer`/`exId`/`name` (only when a steer rides); `LIVE_NONE` reworded |
| `coach-prog.js` | `b5d1ac0b883db081af6cc9652078a82aebd90a04f3b43972e208cc170e40ed21` | `targetSaid(t)` (new export); a defer carries `last` (its why's last row); `liftOf()` reads `ex.wantNext` and `ex.roughTold`; `decide()`: the first-time `told` target, the `ease` hold, the `push` confirm; `nextOf()`: no `up` on `ease` |
| `coach.js` | `9b57b3cc4364efdb90aab33c3c434f8fd929172233b355a94e3d2f38e0b7eeb1` | `coach()` gains `fallback(session, opts)`; `another()` goes through `steered()`; `liveInput` gains `targetOf`, `older`, `want`, `rough`, `asks`; `liftSeen()`, `unseenLift()`, `steered()`; `lifts()` puts `wantNext` on a lift; `resp_lift_targets` draws `targetSaid()`; `normSettings()` keeps `asked.q_want_next:<exId>` and `asked.q_rough_weight:<exId>`; re-exports `targetSaid` |
| `coach-ask.js` | `8641eb8ba84623734ffb63373daad337fde6d262c24047a2aab39b940f15e3dd` | `q_want_next` and `q_rough_weight` in the catalog (twelve rows); `KNOW_KEYS.wantNext.by` `'lift'`, `KNOW_KEYS.rough`; `wantOf()`, `roughOf()`, `wantStamp`, `roughStamp`, `WANT_SESSION_MS` |
| `coach-overlap.js` | `6e5d3c1266454f4e618d7cbd86196b81c38cd6904c28bd516d7cb29c068182a3` | `targetOfLift(input, exId, now, unseen)` (new export); re-exports `targetSaid` from `coach-prog.js` |

### What `fallback()` returns

```
null | { answer: 'none',
         kind: 'warmup' | 'idle' | 'first' | 'cardio' | 'empty',
         exId, name, text, short, why: [],
         tw: null, tr: null, loadLb: null, usual: null,
         chips: [{ id, label, tw?, tr? }],   // 'last_time' (a quote of last time's set k+1), 'last', 'done'
         steer: 'want' | 'rough' | null,
         question: null | questionView }      // coach.js steered(); `input: 'weight'` on q_rough_weight
```

`another()` now carries `steer`, `exId`, `name` and `question` on the defer
answer only (absent otherwise, so every other answer is the v73 shape).

## 2. The impure half

### `src/ui/coach/live.jsx` — the sheet (web `openLiveSheet`, `tools-check/coach-surface.mjs` O)

1. Read `another`, the habit read and `liveSet().next` as in v73. **When all
   three are null** (and the log is known), read `coach().fallback(session,
   { current })` and draw its `text` as Coach's answer bubble — never
   `LIVE_NONE`, which is now the last resort for a null fallback and reads
   "Tick a set and I’ll read it against your log."
2. **Why?** — the fallback's `why` (or `another.why`) then the habit read's.
3. The chip row from the fallback's `chips` exactly as from `another`'s: a
   `last_time` chip carries `tw`/`tr` → the native `useNext` with the last
   ticked row of the exercise in hand (`setIdx` −1 when none) and close.
4. **One question row a sheet:** the live lane's step question when it is put;
   otherwise the answer's own `question` (`another.question` or
   `fallback.question`). Stamp it (`markAsked(question.stamp)`) when drawn.
5. A question with `input: 'weight'` draws a number box (decimal keypad, his
   unit as the placeholder) between its words and its chips. *Save*
   (`value: 'input'`) reads the box: a positive number → pounds through
   `units.js` `wIn(v, u)`, rounded to two decimals, 1–2000 or nothing happens
   (focus the box); his bubble is `fmtW(lb, u) + ' ' + unitW(u)`. *I’ll log a
   set first* (`value: null`) stores nothing beyond the stamp and says its ack.
6. On a tap: his bubble, the ack, `learnBy(question.key, question.by, value)`
   (the shipped writer), and **when the row was the answer's own and a value
   was stored, read the answer again once the write resolves** — replace the
   answer bubble's text, the Why list and the chip row with the fresh read's.
7. The quiet line (`noteLiveTick`) is unchanged: it never raises the fallback.

### `src/state/coachData.js` — `patchNow`

Prune `asked.q_want_next:<exId>` and `asked.q_rough_weight:<exId>` past 56
days beside `warm:`, `q_pr_how:` and `q_equipment_step:` (web `coach-data.js`).
`learnBy` is unchanged.

### The targets sheet

Wherever native draws "What should I lift today?" bubbles, draw
`name + ' — ' + targetSaid(target)` (re-exported from `coach.js`), not
`target.line`.

### The battery (`tools/battery/`)

Copy `tools-check/battery/harness.mjs`, `scoring.mjs` and `README.md`
(`deadEndOf`, `deadTarget`, `scoreFallback`, `F_QUOTE`, `F_AFTER_STOP`, the
`dead ends (v74)` lines, `--no-dead-gate`). Under `--gate all` a dead end in
the live sheet fails the run.

## 3. The strings, exactly

- Micah's case: `Warm-ups on Barbell Bench Press so far. Last time you worked at 225 lb × 4, then 225 lb × 2. I don’t have a number for today yet, so tell me what you’re going for.`
- Untyped warm-up lead: `That reads as a warm-up on {name}. `; nothing ticked: `Next up, {name}. `
- Defer tail: `Last time you worked at {quote}. I don’t have a number for this one yet — what are you going for?`
- Questions off: `{quote}. I don’t have a number for this one yet.`
- After an answer: ` You said match last time, so last time’s sets are the plan.` · ` You said ease off, so nothing heavier than that today.` · ` You said you’re going for more. Put on what you’re going for and rate the set — I’ll read the rest of today from there.`
- Quote chip: `Last time’s set {k}, {load} × {reps}`
- First time: `This is the first time I’ve seen {name} in your log. Log a first set at a weight you could do a couple more times with, and I’ll set targets from it — or tell me roughly what you work at.`
- Told weight: `You told me you work at about {load} on {name}. Start around there, and I’ll set targets from what you log.`
- Cardio: `I don’t set numbers for cardio. Log it as you go, and I’ll read the lifting around it.` · Empty list: `Add an exercise and I’ll read it against your log.`
- `q_want_next`: `What are you going for on {name} today?` — `Go for more` (push) · `Match last time` (same) · `Ease off` (ease); acks `Noted. I’ll put no number on it that your log can’t back, and one good session at the top is enough for me to step it up.` · `Noted. Last time’s sets are the plan.` · `Noted. Nothing heavier than last time on it today.`
- `q_rough_weight`: `Roughly what do you work at on {name}?` — `Save` · `I’ll log a set first` (ack `Sounds good. I’ll set targets from the first one.`); Save's ack `Noted. I’ll start you there and set targets from what you log.`
- Targets: `No target yet: you told me you work at about {load} here.`; `You said ease off on this one, so the same weight as last time.`; `You said you’re going for more, so once at the top is enough this time.`; next set `You said ease off on this one, so I’d stay here.`

## 4. Rules

Published: nothing. Native PROPOSED: the v72 `know`/`knowBy` block already
takes both new facts (`v` a string ≤ 12 or a number ≤ 100000; `$id`
`/^[A-Za-z0-9_+-]{1,40}$/`). If `asked` is enumerated, its `$id` rule needs
`q_want_next:[A-Za-z0-9_-]{1,40}` and `q_rough_weight:[A-Za-z0-9_-]{1,40}` as
two more alternatives.
