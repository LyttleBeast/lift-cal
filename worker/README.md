# Rack AI estimator — the Worker

This folder is the small server that stands between Rack and Anthropic. It
exists for one reason: **an API key cannot live in a web app.**

Rack is served by GitHub Pages, which means every file in this repo is
downloaded to the phone of anyone who opens it. There is no "hidden" part of a
static site. Minifying a key, splitting it into three strings, fetching it from
another file, base64-ing it — all of it takes about ten seconds to undo in the
browser's Network tab. The Firebase key in `firebase-config.js` is fine there
because it is an *identifier*, not a credential: it says which project you are
talking to, and the database rules decide what you may do. An Anthropic key is
the opposite. It is a bearer credential. Whoever holds it spends your money.

So the key lives here instead, in Cloudflare's encrypted secret store, and the
app proves who it is with the Firebase ID token it already has from signing in.

```
  phone                     Cloudflare Worker                  Anthropic
  ─────                     ─────────────────                  ─────────
  photo ───── ID token ───▶  verify the token
                             is this uid allowed?
                             under the rate limit?
                             under the spend cap?
                             ───── x-api-key ──────────────▶  claude-sonnet-5
                        ◀─── macros ─────────────────────────
```

---

## Part 1 — the Anthropic key

1. Go to **console.anthropic.com** and sign in with the account that has your
   credits on it.
2. Left sidebar → **API keys** → **Create Key**. Name it `rack-ai` so you can
   revoke exactly this one later without breaking anything else.
3. **Copy it now.** The console shows the full key once and never again. It
   starts `sk-ant-api03-`.
Better still, make a **Workspace** for this first (Settings → Workspaces →
Create workspace, call it `Rack`) and create the key inside it. A workspace has
its own **Spend limits** tab, so you can cap what this key can ever cost at the
Anthropic end — which the Default Workspace cannot do. That is a limit Anthropic
enforces, not one you are trusting your own code to get right.

Where that key must never go: a file in this repo, a chat message, a screenshot,
`ai-config.js`, or anything the phone downloads. It goes in exactly one place,
in step 4 below. If it ever lands somewhere else, revoke it in the console and
make a new one — revoking is instant and free, and a leaked key is usually found
by a bot scraping GitHub within minutes.

## Part 2 — a Cloudflare account

Free, no credit card. **dash.cloudflare.com/sign-up**, verify the email, done.
You do not need a domain and you do not need to move any DNS. The Worker gets a
`*.workers.dev` address of its own.

The free plan covers 100,000 requests a day. You will use maybe thirty.

## Part 3 — the counter storage

From this `worker/` folder:

```bash
npx wrangler login                        # opens a browser, click Allow
npx wrangler kv namespace create RACK_AI  # older wrangler: kv:namespace create
```

It prints something like:

```
[[kv_namespaces]]
binding = "RACK_AI"
id = "8f3c1d2e4b5a6789..."
```

Copy that `id` into `wrangler.toml`, replacing `PASTE_YOUR_KV_NAMESPACE_ID_HERE`.
This is where the rate-limit counters and the running monthly total live. The id
is not a secret.

## Part 4 — the key, and the deploy

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

Paste the key when it asks. It is encrypted at rest by Cloudflare, it is not
written to any file on your machine, it never appears in `wrangler.toml`, and
you cannot read it back afterwards — only overwrite it. That is the whole point.

```bash
npx wrangler deploy
```

It prints the URL:

```
https://rack-ai.<your-subdomain>.workers.dev
```

## Part 5 — point the app at it

On your phone, in Rack: **Fuel → ⚙ → AI estimator**, paste that URL, tap
**Save and test**. You should get back something like *"Connected. 60 of 60
estimates left today · $0.000 of $5 used this month."*

That setting lives in the browser, so it only applies to the phone you typed it
on. To make it the default everywhere, put the same URL in `ai-config.js`:

```js
export const AI_PROXY_URL = 'https://rack-ai.your-subdomain.workers.dev';
```

and push. That file is safe in a public repo — the URL is an address, not a
credential. A stranger who finds it gets a 401.

---

## What each gate actually stops

| Gate | Stops |
|---|---|
| CORS origin allowlist | another website calling your Worker from a visitor's browser |
| Firebase ID token, verified | anybody without a real Rack sign-in — signature, issuer, audience and expiry are all checked, so a hand-written token fails |
| uid allowlist | someone who signs up for their own Rack account and points it at your Worker |
| per-minute limit | a render loop or a stuck finger |
| per-day limit | a bad day turning into a bad month |
| monthly spend cap | everything else, in dollars |

The layers are deliberate. CORS alone is worthless — `curl` ignores it entirely,
and anyone who has opened DevTools knows that. Token verification alone would
let any Rack account spend your credits. The spend cap alone would let someone
burn the whole cap every month. Together they mean a stranger gets a 401, and
the worst *you* can do to yourself is $5.

Tune them in `wrangler.toml` (`RATE_PER_MINUTE`, `RATE_PER_DAY`,
`MONTHLY_USD_CAP`, `ALLOWED_UIDS`, `ALLOWED_ORIGINS`), then `npx wrangler deploy`
again. Changing a var takes seconds and does not touch the secret.

## What it costs

Charged per token, plus $10 per thousand web searches. A photo shrunk to
1024 px is about 1,370 input tokens.

| | model | roughly |
|---|---|---|
| Photo | `claude-sonnet-5` | $0.006 |
| Description | `claude-sonnet-5` | $0.002 |
| Either, when it looks a brand up | `claude-sonnet-5` + web search | $0.03–$0.06 |

The third row is the one to plan around. A named chain or packaged product sends
the model to that brand's published nutrition page instead of its own memory —
which is the only way the numbers come back right — and a search plus the page
it returns costs an order of magnitude more than answering from memory did. Home
cooking does not trigger it: the prompt is explicit that "two eggs and toast"
needs no lookup.

At two or three photos a day and the odd branded lookup that is roughly
**$1 a month**. A month of nothing but branded lookups at the 3-a-day default
would be about **$4**, which is above the default $2 per-account cap — raise
`MONTHLY_USD_CAP` if that is the way it actually gets used.

The app shrinks every photo before it uploads. That is not politeness about
bandwidth: an untouched iPhone photo costs roughly twenty times as much and
reads no better, because a bowl of rice does not get more legible past a point.

## Day-to-day

```bash
npx wrangler tail        # live log of every request, and why any were refused
npx wrangler deploy      # ship a change
npx wrangler secret put ANTHROPIC_API_KEY   # rotate the key
```

`wrangler tail` is the one to remember. Refusals are logged with the reason;
the reason is deliberately *not* sent back to the caller, because telling an
attacker which check they failed tells them what to fix.

## If something breaks

| What you see | What it is |
|---|---|
| *"Your session expired — sign in again"* | the ID token is stale; sign out and back in |
| *"This account is not allowed"* | the uid in `ALLOWED_UIDS` doesn't match the account you signed in as |
| *"That Worker URL doesn't answer"* | typo in the URL, or the deploy hasn't finished |
| *"The API key on the server is wrong or revoked"* | re-run `wrangler secret put` |
| *"Daily limit reached"* | working as designed; raise `RATE_PER_DAY` if you meant it |
| Requests refused with `origin_not_allowed` | add the origin to `ALLOWED_ORIGINS` |

## What this does not fix

Worth saying plainly, since it is the next thing to look at: the Firebase
database behind Rack is **world-readable by design** — `AGENTS.md` documents the
public REST paths, and anyone with the project URL can read your entire training
log, food log and weigh-ins. That is a deliberate trade for letting agents read
your data without credentials, and it is unrelated to the API key. But it is
worth knowing it is true, rather than discovering it later.
