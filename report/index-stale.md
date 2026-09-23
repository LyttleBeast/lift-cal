# `index.html`'s ten-minute stale window — v47, Phase E (investigate only)

**Nothing shipped.** `sw.js` is unchanged by this phase. What follows is what the
spec says, what WebKit does and since when, what the current service worker
would actually do under each candidate change, and which one to ship first.

## The problem, exactly

`sw.js`'s network leg revalidates same-origin files with
`fetch(e.request, {cache: 'no-cache'})`, **except navigations**, which take a
plain `fetch(e.request)`. GitHub Pages serves `index.html` with
`cache-control: max-age=600` (checked 23 Sep 2026, along with an ETag and
Last-Modified), so for up to ten minutes after a ship a launch can be handed the
previous `index.html` out of the browser's HTTP cache. Every module it loads is
fresh, so this only bites a ship that changed `index.html` itself.

v44 left navigations out on purpose. Passing any init to `fetch()` rebuilds the
Request, "engines have historically thrown there", and BACKLOG's reasoning was
that a throw would become a blank screen on the first launch after a bump.

## What the spec says

Fetch Living Standard, as last updated 21 Sep 2026:

- **`new Request(input, init)`**, where input is a Request: *"If init is not
  empty, then: If request's mode is "navigate", then set it to
  "same-origin"."* Then it unsets the reload- and history-navigation flags and
  resets origin, referrer and URL list.
- The one throw is on the **init**: *"Let mode be init["mode"] if it exists,
  and fallbackMode otherwise. If mode is "navigate", then throw a TypeError."*
  For a Request input, fallbackMode is null. So `fetch(e.request, {cache:
  'no-cache'})` downgrades, and `fetch(e.request, {mode: 'navigate', …})` throws.
- **`fetch(input, init)`**: *"Let requestObject be the result of invoking the
  initial value of Request as constructor with input and init as arguments. If
  this throws an exception, reject p with it and return p."* A construction
  failure is a **rejected promise**, never a synchronous throw. WebIDL requires
  the same of every promise-returning operation.
- **What a navigation will accept from `respondWith`.** Among the responses
  that become a network error: *"request's redirect mode is not "follow" and
  response's URL list has more than one item"*. A navigation's redirect mode is
  `manual`, so a service worker that answers a navigation with a response that
  *followed* a redirect breaks it. This happens after `respondWith`, where no
  `.catch()` in the worker can see it. (It is the "Response served by service
  worker has redirections" failure Safari users hit.)

The spec change is [whatwg/fetch#377](https://github.com/whatwg/fetch/pull/377),
"Make Request constructor more forgiving", merged 27 Sep 2016. Its author filed
bugs against all three engines: WebKit
[168649](https://bugs.webkit.org/show_bug.cgi?id=168649), Chromium 694430,
Gecko 1341223.

## What engines did, and do

**WebKit, from its own history** (`Source/WebCore/Modules/fetch/FetchRequest.cpp`
on GitHub):

| file as of | behaviour for a navigate-mode Request with a non-empty init |
|---|---|
| 1 Jun 2017 (`f0a437f532eb`) | **throws**: *"Request constructor does not accept navigate fetch mode."* on the resulting mode |
| 12 Dec 2017, **r225796** (`196610@main`, `761afd301f32`, bug [179808](https://bugs.webkit.org/show_bug.cgi?id=179808), Youenn Fablet, reviewed by Chris Dumez) | *"buildOptions: Update to throw only if init.mode is Navigate"*: **downgrades to same-origin** |
| 1 Jan 2018, 1 Jun 2018, 1 Jan 2019, 1 Jan 2020, 1 Jan 2021 | downgrades (same code) |
| main, last touched 25 Aug 2026 (`e5961e3ed7e9`), lines 81–83 and 106–107 | downgrades; throws only for an explicit `init.mode` of navigate |

The same r225796 patch is the one that made WebKit's navigations
`mode: 'navigate'` in the first place (`DocumentLoader::loadMainResource`: "Set
fetch mode to navigate"). Safari Technology Preview 46 shipped it on 20 Dec 2017
([release notes](https://webkit.org/blog/8042/)). So in WebKit, a service worker
has never been handed a navigate-mode navigation by a build that threw on
rebuilding one. Service workers first shipped in Safari 11.1 / iOS 11.3 (March
2018), three months after the change reached trunk. I did not confirm r225796
was on 11.1's release branch. It doesn't matter in practice: nothing that runs
Rack today has a WebKit that old.

WebKit's separate referrer relaxation for the same spec change (bug 168649) is
r235025, 20 Aug 2018. It is unrelated to mode.

**Chromium** threw *"Cannot construct a Request with a Request whose mode is
'navigate' and a non-empty RequestInit"* until **Chrome 68**
([Workbox #1796](https://github.com/GoogleChrome/workbox/issues/1796), Dec
2018). That, and pre-Dec-2017 WebKit, is the "historically thrown" in BACKLOG.
**Firefox** nightly failed the matching WPT in January 2017; its current
behaviour was not checked.

Errors still reported in the wild are the **explicit** case: code that copies a
request's properties into a new init and so passes `mode: 'navigate'`. The spec
still throws on that. Neither candidate below does it, and neither may be
"improved" into doing it.

**What this does not establish:** nobody watched an iPhone do it. The record is
WebKit's source and changelog, unchanged on this path since 2017, and not a
test run on the Safari build on Micah's phone. I found no published WPT result
for this exact case on shipping Safari (a Request rebuilt from a real
navigation, inside a service worker).

## What the current `sw.js` would actually do

BACKLOG's blank-screen path doesn't survive the handler as it is now. v44 gave
the revalidating leg its own retry, `fetch(e.request, {cache:'no-cache'}).catch(()
=> fetch(e.request))`. So a rejected construction lands in that **inner** catch
and becomes today's plain navigation fetch. It never reaches the outer
cache-fallback `.catch()` that BACKLOG was reasoning about.

`report/index-stale/sim.mjs` runs the real `sw.js` fetch handler for a
navigation in three variants (today, candidate A, candidate B) against three
engines: spec, one that *rejects* the init (Chrome < 68 / pre-Dec-2017
WebKit), and one that *throws synchronously* (hypothetical; WebIDL forbids it).
Its "offline" is harsher than a phone, because nothing answers, not even the
HTTP cache.

| | spec engine, online | rejecting engine, online | offline, cache just emptied | offline, `index.html` cached |
|---|---|---|---|---|
| **v46, today** | previous `index.html` for ≤10 min | same | blank — **today's behaviour** | cached copy |
| **A**, navigations revalidate | **fresh `index.html`** | previous, exactly as today (the inner retry) | blank, as today | cached copy, as today |
| **B**, background revalidation | previous for this launch; the next launch fresh | same | blank, as today | cached copy, as today |

A synchronously-throwing engine is the only place A is ever worse than today.
The handler throws before `respondWith`, so the browser loads the page itself.
That's fine online, but offline it can't use the worker's cached copy. WebIDL
makes that engine impossible, and WebKit's bindings convert exceptions from
promise-returning operations into rejections.

## The candidates

### B — the safest: a background revalidation (recommended first)

Leave the navigation's own fetch exactly as it is. Alongside it, refresh the
browser's HTTP cache for that URL, so the next launch is fresh:

```js
// in the fetch handler, before e.respondWith(...)
if (e.request.mode === 'navigate' && u.origin === self.location.origin)
  e.waitUntil(fetch(e.request.url, { cache: 'no-cache' }).catch(() => {}));
```

- **What it fixes.** The ten-minute window becomes one launch. Micah's
  routine is already close, open, close, open, and the second launch would get
  the new `index.html`.
- **Its exact risk.** Nothing a navigation receives changes. It is a separate
  request, built from the URL string, so it never rebuilds the navigation
  Request and depends on nothing above. Its response is never handed to
  `respondWith`, so it following a redirect is harmless, and every failure is
  swallowed. The cost is one conditional GET per launch, which is a 304 given
  Pages' ETag.
- **The one assumption to check on a phone.** The background request and the
  next launch's plain fetch share one HTTP cache entry. It's the same URL, from
  the same service worker, and Pages varies only on `Accept-Encoding`, so they
  should, but that is WebKit's network process and it is not proven here. If
  they don't, B does nothing and harms nothing.
- `FetchEvent.waitUntil` keeps the worker alive for it. If iOS kills the app
  mid-request, that launch just doesn't refresh.

### A — the complete fix: navigations take the revalidating leg

Remove one condition from `fresh` in `sw.js`, `&& e.request.mode !== 'navigate'`,
so navigations get `fetch(e.request, {cache:'no-cache'}).catch(() => fetch(e.request))`
like every other same-origin file.

- **What it fixes.** The first launch after a ship gets the new `index.html`.
- **Its exact risk.** Not a throw. Per spec and WebKit since r225796 the
  Request is downgraded, and if an engine rejected, the inner retry is today's
  path. The unguarded risk is a response the navigation refuses after
  `respondWith`, which becomes a browser error page with no fallback:
  1. **A followed redirect.** Not possible in this form: rebuilding from
     `e.request` keeps its redirect mode (`manual`; WebKit copies the options),
     so a redirect comes back as an `opaqueredirect`, which a navigation
     accepts. The start URL (`./index.html`) doesn't redirect anyway, and the
     one Pages URL that does (`/lift-cal` → `/lift-cal/`) is outside the
     worker's scope. **This is why A must never be written as
     `fetch(e.request.url, …)`**, which follows redirects.
  2. **Something WebKit does differently with the downgraded request.** It
     arrives as `same-origin` instead of `navigate`, with the navigation flags
     cleared. Nothing in the spec or WebKit's source makes that a problem for a
     same-origin 200. It is also exactly what has never been watched on a phone.
- **Before shipping A:** one real-phone check. Ship a build whose `index.html`
  carries a visible marker. With Safari's Web Inspector attached to the phone,
  launch the installed PWA and confirm three things: the navigation shows as
  served by the worker with a conditional request (a 304 or a 200, not from
  cache), the console has no "redirections" or TypeError line, and an
  airplane-mode launch still opens.

### Not a candidate

- `fetch(e.request.url, {cache:'no-cache'})` **as the navigation's response.**
  It follows redirects, which a navigation rejects after `respondWith`.
- Anything that copies `e.request`'s fields into a new init, `mode` included.
  That is the one form the spec still throws on.
- `cache: 'reload'`. It would work, but it re-downloads `index.html` every
  launch, which is the cost v44 already declined for every other file.

## Recommendation

Ship **B** on its own. It cannot change what any launch receives, and it turns
"wait ten minutes" into "the second launch". Keep **A** as the follow-up, gated
on the one phone check above. Neither needs a rules change, and both need the
usual `sw.js`/`usage.js` version bump.

BACKLOG's premise ("engines have historically thrown there") is true of Chrome
before 68 and of WebKit before December 2017. It is not true of any WebKit that
has handed a service worker a navigate-mode navigation, and the blank-screen
mechanism it describes is caught by v44's own inner retry.

Sources: [Fetch Standard](https://fetch.spec.whatwg.org/) (21 Sep 2026) ·
[whatwg/fetch#377](https://github.com/whatwg/fetch/pull/377) ·
[WebKit bug 179808](https://bugs.webkit.org/show_bug.cgi?id=179808) /
r225796 (`761afd301f32`) · [WebKit bug 168649](https://bugs.webkit.org/show_bug.cgi?id=168649) /
r235025 · [STP 46 release notes](https://webkit.org/blog/8042/) ·
[Workbox #1796](https://github.com/GoogleChrome/workbox/issues/1796) ·
WebKit `FetchRequest.cpp` at `f0a437f532eb`, `761afd301f32`, `462a6698ee90`,
`f2c5e44a2e73`, `b85e5fd57aae` and `main` (`e5961e3ed7e9`).
