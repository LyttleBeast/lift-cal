# COACH — fix run (web only, rack-v43)

A short, surgical run in `~/dev/ship-v42`, branching from `main` (which now carries
rack-v42). Everything in `COACH-PROMPT.md` §1 still applies unchanged — house rules,
the two-file service-worker bump, the redirect-form syntax check, all verifiers green,
the five-line handoff, no push. Read it before starting; do not re-litigate anything
settled there or in §3.

Coach is LIVE for nine accounts. Every defect below was found on the real deployment,
most of them by driving the live site. Nothing here is speculative.

**Do not** touch `database.rules.json`. **Do not** start ship two (the builder) — the
bubbles below are wiring only.

---

## 1. THE ROTATION IS NOT A ROTATION  (the headline bug)

`rotate(seed, n)` in `coach.js` is `Math.abs(Math.floor(seed / 1000)) % n`, seeded on
`openMs` (= `Date.now()` at init, `coach-data.js:80`). That is the wall clock modulo the
pool size. It is a hash of *when you happened to open the app*, not a rotation, so it
repeats freely — reproduced live: three consecutive reloads gave an identical greeting
AND an identical lead question, then the fourth changed.

Both `pickGreeting` (coach.js:1627) and `leadQuestion` (coach.js:1899) use it.

**Fix — a real rotation.** A per-device counter that increments once per app open, with
the index being `counter % pool.length`. Consecutive opens then *cannot* repeat.

- The counter lives in **device storage** (`LS`, the same layer the app already uses),
  NOT in `settings/coach` and NOT in the database. It is a per-device display nicety;
  a network round trip for it is both slower and unreliable.
- `coach.js` stays pure: the counter arrives as an input on `d.input`, exactly as
  `openMs` does now. `coach-data.js` reads and increments it.
- `rotate()` keeps its name and signature but takes the counter. Delete the `/1000`
  clock arithmetic entirely — no caller should pass a timestamp again.

**Two supporting fixes, both required or the rotation still stutters:**

1. `pickGreeting` narrows the pool with `from = data.length ? data : pool`, which
   collapses it to a single item whenever exactly one data-aware line passes its gate —
   and `n % 1` is always 0. Keep the preference for data-aware lines without discarding
   the generics: put the data lines first and the generics after, and rotate across the
   **whole ordered pool**, so a data line is usually but not always what comes up.
2. `lastGreet` moves out of `settings/coach` into device storage beside the counter.
   `rememberGreeting` (coach-data.js:389) currently fires an async database write that
   dies with the page when the app is closed a second or two after opening — which is
   precisely the usage pattern that needs it. Keep remembering the last **three** ids,
   not one.

`settings/coach` keeps `mute` and `answers`. Remove `lastGreet` from it and from the
`coach.lastGreet` fact's source; the fact itself stays, reading the new input.

---

## 2. THE CARD IS BLANK FOR OVER THREE SECONDS

Measured live: reloading and reading the card after 1s and after 2s both still showed
the loading state. It is the first thing on the screen the app opens to.

Find what the boot path is waiting on and shorten it. `coachReady()` currently gates on
everything, including the whole-tree `readExact` that `log.confidence` needs. Render
what is available as soon as it is available, and let the parts that need the full read
arrive after — the card already has states for partial knowledge. Do not fabricate a
finding before the data is there; an honest short state beats a spinner.

Report the before/after timing in `COACH-REPORT.md`.

---

## 3. THE TIER GATE IS COSMETIC

Confirmed live by a basic account: the lock renders correctly, and tapping the card
still opens the full sheet. `openCoachSheet` (coach-ui.js:194) never reads `c.pro`.

- The sheet reads `c.pro`. A basic account gets the one free finding plus a panel
  naming what Pro adds, in place of the topic chips.
- **No purchase flow.** Rack has no payment path — RevenueCat and Apple IAP are Phase 3
  of the main roadmap and are not built. A button that says Upgrade and goes nowhere is
  worse than none. The panel states what Pro adds and that it is not on sale yet while
  the app is invite-only. Leave one obvious seam for the real flow to drop into.
- This remains a display gate, defeatable by reading the JS on web. That is accepted
  for a feature with zero marginal cost. Do not pretend otherwise in comments.

---

## 4. THE SHEET DOES NOT KNOW WHICH CARD OPENED IT

`TOPICS` (coach.js:1648) is three entries — "How's my training?", "How's my food?",
"Where's my weight going?" — and the same three are offered from both surfaces. The
card already knows the surface (`opts.tight`); it just never travels into the sheet.

- `openCoachSheet` takes the surface and asks the engine for a surface-scoped topic set.
- **Train's set is training-first**: what to hit today, what is overdue, how the week is
  going. Use intents that already exist and already have answers.
- The You set stays the general three.
- **"Make me a workout" is ship two.** Do not add it, and do not add a placeholder or a
  coming-soon chip. It becomes Train's top bubble when the builder lands.

---

## 5. THE STALL FINDING READS AS AN ACCUSATION

Shipped copy, seen live: *"Barbell Bench Press hasn't moved: your best estimated max
there is still 270lb."* Three things wrong with it.

1. It characterises the person, not the numbers. "hasn't moved", "still" — that is a
   verdict.
2. It is unprompted, on the screen the app opens to. A judgement about lack of progress
   belongs in the sheet when somebody asks for it.
3. It may be the wrong reading entirely. On a stated goal direction of *lose*, a flat
   estimated max while body weight falls is a good outcome, not a stall.

**Fix, all three parts:**
- The stall finding comes **off the You and Train cards** and becomes answer-only in the
  sheet. Change its surfaces; do not delete the intent.
- Reword to a readout with no verdict: state the number and when it was last matched.
  Never "hasn't", "still", "only", "failed to", "no progress".
- Gate it on the weight goal direction the user has already set. On a deficit it stays
  quiet, or says something different.

**And make it a rule, not a one-off edit.** Add to the response layer's contract:
*unprompted findings are neutral or actionable, never a judgement; Coach describes the
numbers, never the person.* Extend `tools-check/coach-units.mjs` (or add
`coach-voice.mjs`) to **fail** on those words appearing in any template reachable from
`you_card` or `train_card`. Sweep the existing templates for the same pattern — this one
was found by eye and there are likely siblings.

---

## 6. THE SHORT-FINDING GAP

Measured live at **44px** between the reason line and the COACH ME row when the finding
and reason are one line each. It reads as a failed render rather than as space.

Centre the greeting/finding/reason block in the area above the row. The card keeps its
fixed 190px (164px tight), the row stays pinned and tappable, and a short answer then
looks deliberate. Do not make the card resize — that guarantee is the whole point of it.

---

## 7. THINGS THAT ARE FINE. DO NOT CHANGE THEM.

- **The lead question never truncates.** All three labels fit: longest is 138px against
  247px available at 390px width. An earlier brief suggested capping them. It was wrong.
- **The card holds exactly 190px with zero overflow** on real content, in every state.
- **The Train pair is correct** — equal width, side by side, no label clipping.
- **The switches persist and filter correctly.**
- **The locks are right** — grey open on Pro, yellow shut on basic.

Log in BACKLOG.md, do not fix: `.btn` renders 41px tall against a 44px touch-target
minimum, so Routines/Exercises and Statistics are 3px under. `.btn` is used on every
screen; changing its padding for this is a bigger blast radius than the defect.

Still unverified anywhere: the sheet's `max-height: calc(92dvh - var(--safe-top))`
against real phone browser chrome. Needs a device. Leave it alone.

---

## 8. DEFINITION OF DONE

1. Both syntax loops clean; all verifiers exit 0, including the new voice check.
2. `sw.js` and `usage.js` both read `rack-v43`.
3. `database.rules.json` unchanged.
4. `coach.js` still passes `coach-pure.mjs` — no clock, no DOM, no impure import. The
   counter is an input, never read inside the engine.
5. A verifier proving the rotation: N consecutive opens with a pool of N produce N
   distinct lines, and no two consecutive opens ever match.
6. `NEXT-NATIVE-V43.md` updated — including that the greeting counter and `lastGreet`
   are device storage on both clients (MMKV on native), not database.
7. `COACH-REPORT.md` appended, not replaced: what you changed, what you disagreed with,
   the boot timing before and after, and anything here that was wrong about the code.
8. The five-line handoff.

Priority if you run short: §1 and §3 are the two that matter. §5 next. §2, §4 and §6
after that.
