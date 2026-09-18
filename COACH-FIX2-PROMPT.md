# rack-v44 — the deploy actually reaching clients, and the greeting's character back

Two changes in `~/dev/ship-v42`, branched from `main` (now at rack-v43). `COACH-PROMPT.md`
§1 still governs — house rules, the two-file service-worker bump, the redirect-form
syntax check, every verifier green, the five-line handoff, no push.

Item 1 is small, load-bearing and affects every future ship. Item 2 is a tuning change.
Nothing else is in scope. Do not start ship two.

---

## 1. A DEPLOY DOES NOT REACH A BROWSER FOR ~10 MINUTES, AND THE VERSION NUMBER LIES

**Observed live**, minutes after rack-v43 went up, on a real signed-in account:

- `sw.js` served `CACHE='rack-v43'` — correct.
- The app was still executing **rack-v42's `coach-data.js`**.
- Proof: `fetch('./coach-data.js?cb=<random>')` returned 23,348 bytes containing
  `readRotation`; `fetch('./coach-data.js')` returned 17,837 bytes without it.
- Deleting the Cache Storage entry and unregistering the service worker did **not**
  fix it. Only a hard reload (cache bypass) did.

**Cause.** `sw.js`'s fetch handler is network-first:
`e.respondWith(fetch(e.request).then(...))`. That `fetch` is itself served from the
browser's own HTTP cache, and GitHub Pages sets a max-age of roughly ten minutes on
these assets. So the service worker faithfully re-caches whatever the HTTP cache hands
it — which, for the first several minutes after a deploy, is the previous build.

**Why the version looked right the whole time.** Browsers deliberately bypass the HTTP
cache when checking `sw.js` itself. So the service-worker script updates promptly while
every asset it fetches stays stale. The version number was telling the truth about the
service worker and lying about the app.

**Why this matters beyond Coach.** The standard walkthrough — bump the version, close
and reopen the app, confirm the version, test the change — can confirm a new version
while running old code. Every ship has had this window. A walkthrough that "passed" or
"failed" inside it was testing the wrong build.

**The fix.** In `sw.js`'s fetch handler, make the network leg revalidate for same-origin
app assets: `fetch(e.request, { cache: 'no-cache' })`.

- `no-cache`, NOT `reload`. `no-cache` sends a conditional request and takes a 304 when
  nothing changed, which is one cheap round trip. `reload` forces a full re-download of
  every asset on every request.
- Same-origin only. The handler already returns early for Firebase, googleapis and
  workers.dev; keep those untouched, and do not apply it to cross-origin requests.
- **The offline fallback must survive unchanged.** The `.catch(() => caches.match(...))`
  path and the navigate-to-`index.html` fallback are what make Rack work in a basement
  gym. A revalidating request fails the same way a plain one does when there is no
  network, so the catch still fires — confirm that by reading the handler, and say so in
  the report.
- Bump `sw.js` and `usage.js` to `rack-v44` as usual.

**This change cannot be proven by a verifier** — it is observable only against a real
deploy. Do not invent a test that pretends otherwise. State plainly in the handoff that
it needs checking live, and how: after deploying, fetch an app file twice, once with a
cache-busting query and once without, and confirm the two are identical.

---

## 2. THE GREETING LOST ITS CHARACTER

rack-v43 correctly stopped `pickGreeting` collapsing its pool to the data-aware lines
only. It over-corrected: the counter now walks the whole ordered pool, so long runs land
entirely on generics. **Five consecutive opens observed live gave five generic lines** —
"Nothing here is a guess.", "Here's where you stand.", "Ready when you are.", "Read from
your own log.", "Good to see you." — and not one data-aware line, on an account where
several qualify.

The repeat bug was fixed by diluting the thing that made the line worth reading. Both
properties have to hold at once:

- consecutive opens never repeat (rack-v43's counter does this — keep it), AND
- a data-aware line comes up most of the time when several qualify.

**Suggested shape, but use your judgement:** when two or more data-aware lines pass their
gates, rotate within the data lines alone — the counter still guarantees no repeat,
because the pool has two or more members. Fall through to the full pool only when fewer
than two qualify, which is exactly the single-line-collapse case rack-v43 was fixing.
Keep the `recentGreets` memory of three either way.

Add to `tools-check/coach-rotation.mjs`: across N simulated consecutive opens on a
fixture where several data lines qualify, no two consecutive greetings match AND at
least two thirds are data-aware. Both assertions, or the fix can regress in either
direction without anything going red.

---

## 3. DO NOT TOUCH

- Everything verified working live on rack-v43: the rotation counter, the lead question
  alternating, Train's surface-specific chips, the card at 190px/164px with zero
  overflow, the short-finding centring, and the boot path (ready at ~1s with a real
  finding, down from ~3s).
- `database.rules.json`. Unchanged, as always.
- `.btn`'s 41px height. Still logged in BACKLOG.md, still not being fixed.
- The Pro panel and the sheet's `dvh` height — both still unverified, both needing a
  real account or a real phone. Leave them alone.

## 4. DONE

1. Both syntax loops clean; every verifier exits 0, including the extended rotation one.
2. `sw.js` and `usage.js` both read `rack-v44`.
3. The offline fallback path in `sw.js` is unchanged in behaviour — argued in the report.
4. `COACH-REPORT.md` appended: what you changed, and the before/after you could and
   could not measure.
5. The five-line handoff, naming the service-worker change as needing a live check.
