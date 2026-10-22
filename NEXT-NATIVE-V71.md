# Porting rack-v71 to rack-mobile

Web ships as `rack-v71`, built on `rack-v70` (`68038c5`). The tree it mirrors is
`~/dev/rack-mobile`.

v71 is **the first-person voice** — Coach v2 ship 3 (`COACH-V2-SPEC.md` §7,
`BUILD-PLAN.md` ship 3). Every sentence Coach says is in the first person
singular; "Coach" survives only as a label. Four encouragement pools ship as
data in `coach.js`, the finish line draws them and ranks its evidence in a new
order, and the card's warm slot draws two of them. **No engine rule moves, no
stored field is added or changed, no node, no database rule, no migration.**
Nothing in `database.rules.json` or the Worker moves. Every diff on the web is
a string literal, a pool table, the finish line's evidence order, or a verifier.

---

## 1. The pure files, verbatim

Copy the ten across byte for byte and re-pin their hashes in
`tools/verify-coach-*-verbatim.mjs` in the same commit. `coach-goal.js`,
`coach-tags.js` and `coach-ramp.js` are unchanged from rack-v70 and are listed
so the pin list is complete. No file gains or loses an import.

| file | sha256 (web, rack-v71) | changed in v71 |
|---|---|---|
| `coach.js` | `c8d5e8bcfb044af3cca796ba68acb5926b4112fb5aeeee2aab34e9a9c47c8bf7` | yes — strings, four pools, `pickLine`, `backView`, `prView`, `bestRepsAt`, the finish line's order, the card's warm slot |
| `coach-build.js` | `4a48d9432e1c18356d9fb138a4828b6eb02e7bab06bb3bd6108bc1b6ccad7763` | yes — `LIVE_LINE`, and the regex that finds the "learning" why line (`/^I’m learning/`) |
| `coach-live.js` | `5a2d4a0e817103e9057a9dcc173c394370144e3847a525c41fc890dbb4565e8a` | yes — `LIVE_NONE`, one why line, `OPENER[0]` |
| `coach-prog.js` | `49a3c702ef63c31afec4449219b896e8ba87bbe52d2e5961599d789e29bb860a` | yes — strings only |
| `coach-overlap.js` | `28c2a27fe8fb41815f9e5ace24f86b4939e6d007e9819af60a685a8cabec39d1` | yes — strings only |
| `coach-ready.js` | `e0e58432ffbe1c55edca682f68f9ecf26b9c9f94702b11050bd11d4088f10a1d` | yes — strings only |
| `coach-fuel.js` | `66d6941d1fb3967f85de402b41d699cf3578a2029e2f2a4e784a93f3958d2dd0` | yes — strings only |
| `coach-volume.js` | `579b702e7d058546d7061e1c10e7fb2b74b96fe0de23622358578bccbab7d91d` | yes — strings only |
| `coach-goal.js` | `139e04b0750c884e803e553ebda9931dc8ccdf8400b581b8919f50decfaff411` | no |
| `coach-tags.js` | `4bffed387010c0d6ebcf8850bb1f3b25a8943cdd5c6b483d2413dc31d6f6ec29` | no |
| `coach-ramp.js` | `b4d5dbc9726b867922b62e27f5fe5c2a812fe0df1dd3b293bfe0e48d7d798e79` | no |

(`sha256sum` on the file bytes.)

### What the copy carries, so the port's verifiers know what to hold

- **New exports of `coach.js`**: `BAD_DAY`, `PR_LINES`, `BACK_LINES`,
  `REST_LINES` — frozen arrays of `{ id, gate(view), text(view, u) }`. They
  port by copy; nothing native draws them directly. `finishRead()`'s result
  shape is unchanged (`headline, line, why, earned, evidence, short, id`);
  what changed is which words `line` carries:
  - rated harder or marked: `headline` `'Good work.'`, `line` one bad-day pool
    line, `short` still `'Showing up on a harder day counts.'`;
  - a record: `line` one PR pool line (line 1 of the pool is the shipped
    `'New best on {lift}: {w} x {r}.'`, so at open 0 nothing changes),
    `short` still `'New best on {lift}.'`;
  - a comeback (gap ≥ 12 days): `line` one missed-time pool line, `short`
    still `'First session in N days.'`.
  - The pools rotate on `input.opens` and are pushed forward by
    `input.recentHype` ids — the same two inputs the card's earned line
    reads. Native's `coachInput()` already hands both in.
- **`finishRead()` evidence order** is now `pr` (kinds `e1rm`, `weight`) →
  `rating` → `targets` → `milestone` → `compare` → `pr` (kind `volume`) →
  `back`. Until v71 a volume record outranked his rating.
- **The card's warm slot** (`card.you` / `card.train` with `state: 'warm'`):
  while `session.lastDaysAgo ≥ 12` (or `session.back` is set) the line is a
  `back_*` id from `BACK_LINES`; on a day `session.rest` says rest or lighter
  (switch on) a `rest_*` id from `REST_LINES`; otherwise the shipped `WARM`
  `w_*` ids. Native's card reads `text` and `state` and never the id, so
  nothing to draw — but a native verifier that pins `w_*` ids on a warm card
  needs the two new prefixes.
- **`coach-live.js` `OPENER`**: `{ 4: 'Strong set.', 2: 'Good.', 0: 'Good call rating it.' }`
  — `rateAnswer(0, …)` now opens with `'Good call rating it.'`; a native test
  that expects `'Noted. Stay at …'` changes to `'Good call rating it. Stay at …'`.
- **`coach.js` `WARM`** rows `w_here`, `w_day_ready`, `w_one_tap` changed
  words (`'I’m here whenever you want me.'`, `'{Weekday}. I’m ready when you
  are.'`, `'I’m one tap away.'`).
- **`MARK_ASK.text`** is `'Anything I can’t see?'`; the *Didn’t feel well* ack
  ends `'… Rest is always an option. I don’t do health, so I’ll leave it there.'`.
- **`CATEGORIES`** notes: `rest` → `'When I suggest a lighter week or a rest.'`,
  `questions` → `'Whether I may ask you anything at all.'`, `core` →
  `'The card, and what I can and cannot see.'`. The label `'Coach itself'` stays.
- Every `because`, `ack`, `reason` and answer that said "Coach …" now says
  "I …" / "me" / "my" — the pure copy carries them all. The one that moved a
  verb: `'Coach needs a couple of weigh-ins … to tell whether …'` is now `'A
  couple of weigh-ins near the start and the end of that stretch would let me
  tell whether your weight is part of it.'` (no "need"), and
  `'Coach needs a few more sessions of this lift to know your rep range.'` is
  `'A few more sessions of this lift and I’ll know your rep range.'`,
  `'Coach needs six sessions of it in twelve weeks to put a pace on it.'` is
  `'Six sessions of it in twelve weeks would let me put a pace on it.'`.

## 2. The impure strings to rewrite — quote these, do not improvise

`src/pure/coach-view.js` (web `coach-ui.js`'s words, as native keeps them):

| key | shipped | becomes |
|---|---|---|
| `card.threwLine` | `Coach couldn’t read your log just now.` | `I couldn’t read your log just now.` |
| `card.halfWhy` | `Coach would rather say nothing than read half a number.` | `I’d rather say nothing than read half a number.` |
| `sheet.threw` | `Coach couldn’t read your log just now. Every tab draws from its own data.` | `I couldn’t read your log just now. Every tab draws from its own data.` |
| `sheet.cantAnswer` | `Coach can’t answer that one.` | `I can’t answer that one.` |
| the reason under it (web: `It only says things it can back with a number from your own log.`) | | `I say what I can back with a number from your own log, and nothing else.` |
| `sheet.askWhy` | `Coach asks at most one thing, and only something that changes what it can tell you.` | `I ask at most one thing, and only something that changes what I can tell you.` |
| `sheet.noted` | `Noted. That changes how Coach reads your weight.` | `Noted. That changes how I read your weight.` |
| `sheet.notedWhy` | unchanged — `Settings → Coach` is a path, a label | |
| `sheet.proTitle` | `What else Coach reads on Pro` | `What else I read on Pro` |
| `sheet.notMedical` | `Coach reads your own log and nothing else — your sessions, your food, your weigh-ins and your steps, against the targets you set. It is not medical or nutritional advice, it does not know anything about you that you have not logged, and it will say nothing rather than guess.` | `I read your own log and nothing else — your sessions, your food, your weigh-ins and your steps, against the targets you set. I am not medical or nutritional advice, I know nothing about you that you have not logged, and I will say nothing rather than guess.` |
| `build.targets` | `Start with Coach’s targets` | `Start with my targets` |
| `build.none` | `Coach can’t build that one.` | `I can’t build that one.` |
| `build.noneWhy` | `Nothing in your log fits it, and Coach would rather say so than guess.` | `Nothing in your log fits it, and I’d rather say so than guess.` |
| `build.swapNone` | `Coach can’t swap that one in.` | `I can’t swap that one in.` |
| `live.wait` | `Coach is reading your log — ask again in a moment.` | `I’m reading your log — ask again in a moment.` |
| `live.chip` `live.chipLabel` `live.nudge` `live.nudgeLabel` `live.eyebrow` | `Coach` / `Ask Coach what to do next` / `Coach · ` / `Coach: ` / `Coach` | unchanged — labels |
| `settings.intro` | `What Coach may bring up. It only ever compares you against numbers you set or against your own trailing average, and a rule with thin data stays quiet rather than guessing.` | `What I may bring up. I compare you against numbers you set or against your own trailing average, nothing else, and a rule with thin data stays quiet rather than guessing.` |
| `settings.reading` | `Still reading Coach’s settings. Give it a moment and reopen this.` | `My settings are loading. Give it a moment and reopen this.` |
| `settings.defaults` | `Coach’s settings couldn’t be read from this device just now. These are the defaults — a change made here won’t save until it can reach the database.` | `My settings couldn’t be read from this device just now. These are the defaults — a change made here won’t save until it can reach the database.` |
| `settings.section` `settings.ask` `goal.goalEyebrow` | `Coach` / `Ask Coach something` / `Coach` | unchanged — labels |
| `goal.rowNotes.q_focus_group` | `Coach reports this group’s weekly sets and its main lifts when you ask how you’re tracking toward your goal.` | `I report this group’s weekly sets and its main lifts when you ask how you’re tracking toward your goal.` |
| `goal.limit` | `Coach takes lift targets up to ` | `I take lift targets up to ` |
| `goal.foot` | `Coach tracks your estimated max on it against the target’s, as a range of weeks — never a date.` | `I track your estimated max on it against the target’s, as a range of weeks — never a date.` |

`src/ui/coach/settings.jsx`: the `<Head title="What you’ve told Coach" />`
becomes `What you’ve told me`. The hub row title `Coach` stays.

`src/pure/recap-view.js`: no literal of its own says "Coach" — the recap's
question and acks come from `coach.js` `MARK_ASK` and the finish line from
`finishRead()`; both port by copy. Check the comment at line 196 only if the
porter wants the docs true (`"Anything I can’t see?"`).

`src/ui/coach/*.jsx`: no prose literal says "Coach" as a subject; the imports
and comments are not copy.

Comments are not copy and are left alone, on the web too.

## 3. The fence — `tools/verify-coach-voice.mjs`

Add beside the shipped `BANNED` / `CARD_BANNED` (both unchanged) and apply to
every prose literal (a quoted run with a space and three letters, not a class
name, id or import path) in the pure files and in `src/pure/coach-view.js`,
`src/pure/recap-view.js`, `src/ui/coach/*.jsx`, skipping an exact `LABELS`
member; comments stripped first, as the web does:

```js
const VOICE_BANNED = [
  /\bCoach (is|isn[’']t|can|can[’']t|cannot|will|won[’']t|does|doesn[’']t|wants|reads|keeps|has|sets|leans|needs|goes|learns|stores|would|says|thinks|knows|calls|puts|holds|waits|won|asks|counts|treats|may|suggests|mentions|reports|lists|tracks|takes|builds|couldn[’']t|already|starts|looks|picked|itself|gives|steps|measures|wouldn[’']t|adds|sees|saw|was|were|did|had|should|could|must)\b/i,
  /\bCoach[’']s\b/i, /\b(for|to|from|by|with|told|tell|ask|asked|asking) Coach\b/i, /\bCoach target/i,
  /\bwe\b/i, /\blet[’']s\b/i, /\bour\b/i,
  /\byou[’']re getting (stronger|fitter|leaner)\b/i,
  /\b(crush|beast mode|grind|no excuses|no days off|push through|warrior)\b/i,
  /\blisten to your body\b/i, /\b(proud of you|told you)\b/i, /\b(streak|keep it up)\b/i,
  /\b(perfect|amazing|incredible|insane|unreal)\b/i, /\bAI\b/
];
const LABELS = new Set(['Coach', 'Coach · ', 'Coach: ', 'COACH', 'COACH ME', 'Ask Coach', 'Coach me', 'Coach settings',
                        'Ask Coach something', 'Ask Coach what to do next', 'Coach itself']);
```

The web's list is wider than the spec's (§7.3) by the verbs after `treats`
and the `told|tell|ask…` prepositions: they are what the actual literals
needed. The battery's `scoring.mjs` `BANNED` carries the first four rows too
(the third-person rows), so a sentence built from fragments is caught in the
rendered text; port that with `tools-check/battery/scoring.mjs`.

## 4. The verifier cases to port

| native verifier | cases (from the web file of the same name) |
|---|---|
| `tools/verify-coach-voice.mjs` | section P: the twelve-file sweep under `VOICE_BANNED` with `LABELS` exact-match only; the pools are frozen rows `{ id, gate, text }`, each seven or more deep. Section N: every answer after a tap opens "Strong set.", "Good." or "Good call rating it." — never "Noted." |
| `tools/verify-coach-hype.mjs` | section I: every pool line rendered through a view that passes its gate, in both units, under BANNED + VOICE_BANNED (+ CARD_BANNED for `BACK_LINES` and `REST_LINES`), no `!`, no pound in kilos, no typed unit word in a pool's quoted runs; rated 80% → "Good work." + a bad-day line + the shipped short; a comeback → a back line + the shipped short; a record → a PR line, line 1 the shipped sentence at open 0; rotation over 200 opens (no repeat inside seven consecutive opens, every eligible line reached, deterministic, the three surfaces agree); the card away eighteen days draws `BACK_LINES` ≤ 9 words; a rest day with every earned line shown draws `REST_LINES`, switch off → `WARM`; e1RM record > rating > volume record |
| `tools/verify-coach-rotation.mjs` | section K: the missed-time pool on the card walks the counter (no consecutive repeat, N opens show N lines, a repaint is the same line, a memory of earned lines starves nothing and moves no greeting, Train a step ahead); the bad-day pool on the finish line across opens, the short constant |
| `tools/verify-finish.mjs` | N5 (a bad-day pool line, `short` the shipped sentence, same line for s:90 and e:3), N7 (a back pool line with the gap, `short` the shipped sentence), the generated sweep counts harder days by `short` |
| `tools/verify-feel.mjs` | rated 90%: "Good work." + a `BAD_DAY` text, `short` the shipped sentence |
| `tools/verify-coach-prog.mjs`, `tools/verify-coach-ready.mjs` | the byte-identity checks against older engines read the old `why` strings through the ship's rewrite map (`VOICE` + `voiced()` in each file) before comparing |
| snapshot literals | every `'Coach …'` sentence in a native verifier changes to the words in §1–§2 above; `coach-volume.mjs` M0 keeps rack-v55's own words because it compares an old module read out of git |
| the version pin | `rack-v71` |

## 5. The schema

None. No field, node, rule or migration. `web-patches/database.rules.PROPOSED.json`
does not change for this ship.
