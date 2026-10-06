# Porting rack-v63 to rack-mobile

Web ships as `rack-v63`. The tree it mirrors is `~/dev/rack-mobile`.

**The number.** The P7 build brief called this ship `rack-v62`. Live web `main`
was already `rack-v62` (Ledger and Clear sky vibes, `590db05`) by the time it
was built, so this ship is `rack-v63` and every comment and doc line says so.
This file is the delta on top of V58's port note, **and it does not carry the
vibe ships** (v59 to v62, `cloud/VIBES-LOG.md`): native's Build 60 is level with
web v60, and nothing here ports Meet Day (v61) or Ledger and Clear sky (v62).

v63 is **five fixes to the food estimator** (P7 food-cost lockdown, the client
half). The Worker half is `~/dev/rack-worker`, deployed as `02b3aa9e` on
6 Oct 2026 with the cost guard.

- **A. Food memory answers only with the whole meal (P0, CL-01 + CLX-N1).**
  `recall.js`. Before: "Found in your log · exact match · this one cost
  nothing" could show a *different* meal of the account's own: the key keeps 150
  characters of a sentence, `cleanItems()` kept 12 rows of up to 20, and
  `normalize()` throws away signs, slashes and every non-Latin word ("1/2 tbsp"
  was "1-2 tbsp", "+guac -rice" was "-guac +rice", "2 банана" was "2 яйца").
  Now a row is written whole or not at all (`q` up to 600 characters, `items` up
  to 20, plus `w: 1`); an exact hit needs the row's own sentence **and** its
  `marks()` to match; older rows (no `w`) are trusted only under 190 characters
  and under 12 rows. The key, `normalize()`, FILLER and NUMWORD do not move.
  The cost, stated and pinned: "chick-fil-a" no longer finds "chick fil a" (D24).
- **B. Nothing is cut at 600 characters (CL-02).** New pure `estimate-limits.js`.
  A counter under the Describe and photo-note boxes from 450 characters; Estimate
  refuses over 600 with the reason and leaves the text in the box; `ai.js`
  refuses before any request as the backstop. No `maxLength` on the box, on
  purpose (React Native iOS cuts a paste to exactly `maxLength`, silently).
- **C. The app waits 150 s and says so (CL-03).** `WAIT_MS = 150000`. Web gains
  an `AbortController` (it had no timeout at all); native's was 60 s. Both throw
  `AiError('timeout', TIMED_OUT)`: "No answer after two and a half minutes, so
  Rack stopped waiting. It may still count as one of today's estimates."
  The rule is WAIT_MS >= the Worker's longest request + 25 s. Checked against
  the deployed Worker on 6 Oct: at most two model calls of `TIMEOUT_MS` 60 s
  each, search off, so about 125 s. If that changes, `WAIT_MS` changes in the
  same ship.
- **D. The dollar figure is the owner's (CL-06, F3-4).** `costLine(res, owner)`.
  Everyone sees "N describes left today"; the owner also sees "$0.0517 of
  credit"; never a "$" without a real number. An `AiError` now keeps the reply's
  `usage` and `left`, so a failed attempt can say what it used (inert until the
  Worker sends them on failures, which it does as of `02b3aa9e`).
- **E. One error contract for "too long" (C3-09).** The Worker replies 400
  `too_long` with `max`; the apps key on `error`, never on the status, and show
  `message` as sent (a Worker `too_long` on a text *under* 600 characters shows
  the Worker's words, never "longer than 600 characters": pinned).
- **O1. The busy sheet.** "Usually a few seconds. A long order can take a minute
  or two." Live search is off, so "longer when it has to look a brand up" was
  untrue.

**What is stored:** one new field, `w: 1`, on rows under `users/{uid}/food/recall`.
`database.rules.json` and the OPTIONAL-LOCK file are **byte-identical to
rack-v62**: `food` has only a `.write` rule, so the new field needs nothing.
Build 60 ignores `w` and drops it if it rewrites a row; the worst cost is one
extra estimate. **Build 60 keeps the food-memory bug for its own lookups until
Build 61 is installed.**

---

## THE PINS

```
estimate-limits.js  e6d4e94a3f0912ff377dfd1b87ce4272f76291719e83bb8c62fc06acc8c34153   new in v63, verbatim to src/pure/estimate-limits.js
```

`recall.js` is **not** copied whole (native's `src/pure/recall.js` is the port),
but the v63 blocks are identical text: the `+`/`-` lines this ship adds to web
`recall.js` and to native `src/pure/recall.js` are the same 106 lines in the
same order (`MAX_Q`, `MAX_ITEMS`, `sentenceOf()`, `marks()`, `whole()`, the exact
path, the near-miss marks gate, the 20-row slice, `remember()`). Re-prove it
with a script that diffs `git diff -U0 base HEAD` of the two files, line for
line; `tools-check/recall-whole.mjs` (web) and `tools/verify-recall-whole.mjs`
(native) are the behaviour check, 29 and 26 checks.

Unchanged since rack-v62 (not touched by this ship): everything else pinned in
`NEXT-NATIVE-V58.md`, plus the vibe files.

## Where each change lands

| Change | Web | Native |
|---|---|---|
| recall: whole or nothing | `recall.js` `MAX_ITEMS` `:23`, `sentenceOf` `:68`, `marks` `:88`, `whole` `:114`, exact path `:279`, marks gate `:292`, 20-row slice `:346` | `src/pure/recall.js` `:116`, `:161`, `:181`, `:207`, `:437`, `:450`, `:512` |
| limits, wait, cost line | `estimate-limits.js` (new, pure) | `src/pure/estimate-limits.js` (verbatim, sha above) |
| refuse, never cut; timeout; `AiError` keeps `usage`/`left` | `ai.js` `sendable` `:158`, `AbortController` `:121`, `AiError` `:43` | `src/data/ai.js` `sendable` `:254`, timer `:194`, `AiError` `:81`, `HEALTH_MS` `:62` |
| the counter, the refusal, the cost line, busy words | `food.js` `lengthCounter` `:1978`, `refuseTooLong` `:1992`, `costLine` `:2182` and `:2388`, busy text `:2143` | `src/ui/food/estimator.jsx` `LengthCount` `:136`, `refuseTooLong` `:147`, `costLine` `:698` and `:912`, busy text `:616` |

## What a native run still has to do

- **Guards that move with this port.** `tools/verify-estimate-ask.mjs` pins
  `estimatePhoto` to rack-v54's text: it must admit exactly CL-02's three changes
  (async, `sendable()`, no slice) and nothing else. Its result-screen check
  expects "$0.0000 of credit" for a free answer; the test account is not the
  owner, so it must now expect no dollar figure. In `tools/verify-vibe-v1.mjs`,
  four seeded scenes move on purpose (`Sheet — the estimate` high, medium, low
  lose the dollar line; `in flight` has the new busy words); re-baseline them
  with the verifier's own `--rebaseline '<scene>'`. `verify-vibe-fit` follows
  `verify-vibe-v1`.
- **Build number.** `app.json` `ios.buildNumber` is `"61"`. `src/data/usage.js`
  says the number names the WEB ship the client is level with. Native is
  level with web v60 for vibes, plus this ship's v63 fixes; "61" claims
  rack-v61. Micah's call; the build keeps 61.

## Not in this ship

- **T1 (device):** React Native's `fetch` never sets `xhr.timeout`, and what iOS
  does with a request value of 0 is undocumented (Apple documents a 60 s idle
  default for a session). If a Worker silence over 60 s fails on the phone as
  "check your connection", move native `call()` to `XMLHttpRequest` with
  `xhr.timeout = WAIT_MS`, or shorten `WAIT_MS` (D23 (b)).
- **T2 (device, both apps):** paste about 700 characters into Describe. The text
  stays, the counter reads red "700 / 600 — 100 over. Split it into two.",
  Estimate says so and sends nothing; about 460 characters reads "460 / 600".
- **O2:** show what the Worker dropped ("no rice"). Not built, on purpose: the
  Worker still counts a dropped bun (P7-015), so the line would be untrue.
- **P7-046 / P7-080:** the edit multiplier is rounded to one decimal, so a
  quarter of 400 kcal is saved as 120, and labels read "0.3 lb" for 1/4 lb.
  Needs its own verify-first run.
