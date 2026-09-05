/**
 * Rack — AI food estimator proxy
 * =============================================================================
 * The Anthropic API key lives HERE, in Cloudflare's encrypted secret store, and
 * never anywhere else. The app on your phone has no key at all; it proves who it
 * is with the Firebase ID token it already holds from signing in, and this
 * Worker decides whether that caller is allowed to spend your credits.
 *
 * Everything in this file is safe to publish. That is the point: the security
 * is in where the key is stored and what this code checks, not in hiding the
 * code. Read it — if you can see how it works and still can't spend my credits,
 * it works.
 *
 * The gates a request passes through, in order:
 *
 *   1. Origin      — CORS allowlist. Stops another website from using your
 *                    Worker from a user's browser. (Does NOT stop curl, which
 *                    is why it is only gate one of six.)
 *   2. Size        — the body is read with a hard byte ceiling before it is
 *                    parsed, so a huge payload can't be used to burn CPU.
 *   3. Identity    — the Firebase ID token is verified properly: RS256
 *                    signature against Google's published keys, plus issuer,
 *                    audience and expiry. A forged or expired token dies here.
 *   4. Allowlist   — the verified uid must be switched on. That switch is a
 *                    node in the database (aiAllow/{uid}) that only the owner
 *                    can set, so approving somebody in the app grants them the
 *                    estimator without a redeploy — and blocking them takes it
 *                    away the same way. ALLOWED_UIDS in the settings still
 *                    works as an override and as the answer of last resort if
 *                    the database can't be reached.
 *   5. Rate limit  — per-minute, and separate per-day counters for photos and
 *                    for text, per uid, so a bug in a render loop costs pennies
 *                    instead of your balance. Photo and text have their own
 *                    daily budgets: they cost an order of magnitude apart, and
 *                    one shared counter means a run of cheap text estimates
 *                    silently eats the expensive ones.
 *   6. Spend cap   — a running monthly dollar total from Anthropic's own usage
 *                    numbers. When it hits the cap the Worker stops calling out
 *                    entirely. This is the backstop that actually protects the
 *                    money, and it is the one to trust.
 *
 * The model is pinned in this file. The client sends what you ate, never which
 * model to use or how many tokens to spend — otherwise "cheap little text call"
 * becomes whatever an attacker types.
 * =============================================================================
 */

/* ============ constants ============ */

const ANTHROPIC_URL     = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Google's public keys for Firebase ID tokens, in JWK form so WebCrypto can
// import them directly (the x509 endpoint would need DER parsing by hand).
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// Pinned server-side. Both paths run the same model now. A typed order from a
// chain is not a recall question — it is a lookup and some arithmetic off the
// published listing — and the cheap model was answering it from memory, which
// is how "chick fil a 30ct grilled nugget" came back with a fraction of the
// protein Chick-fil-A publishes. Words are still a fraction of what a photo
// costs: the image is the expensive part, not the model.
const MODEL_PHOTO = 'claude-sonnet-5';
const MODEL_TEXT  = 'claude-sonnet-5';

// USD per token. Update these if Anthropic's prices move — they only feed the
// spend cap, so being slightly stale makes the cap slightly wrong, nothing else.
// The Haiku row is unused now; it stays so that swapping a model back into the
// lines above still gets counted instead of silently costing nothing.
const PRICE = {
  'claude-sonnet-5':           { in: 2 / 1e6, out: 10 / 1e6 },
  'claude-haiku-4-5-20251001': { in: 1 / 1e6, out:  5 / 1e6 }
};

// Web search is billed per search — $10 per thousand — on top of the tokens the
// results then add to the input. A branded lookup runs around $0.03–$0.06
// against $0.006 for a plain estimate, which is why the prompt is explicit that
// home cooking is not worth searching for.
const WEB_SEARCH_USD = 10 / 1000;

const MEDIA_TYPES   = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_B64 = 900000;    // ~675 KB of image. The app sends ~150 KB.
const MAX_TEXT      = 600;       // characters of description
const MAX_BODY      = 1400000;   // bytes on the wire, checked before parsing
const MAX_TOKENS    = 2200;      // ceiling on what one answer can cost. Higher
                                 // than it was: a search query, the reading of
                                 // the result and the numbers all come out of
                                 // this one budget.
const TIMEOUT_MS    = 75000;     // a lookup is several round trips inside the
                                 // one call, so it takes noticeably longer than
                                 // an answer from memory did
const MAX_ROUNDS    = 3;         // attempts before log_food is forced. The model
                                 // may search on the first two; the last one has
                                 // to produce numbers.
const OVERALL_MS    = 110000;    // total wall clock across those rounds. Somebody
                                 // is standing there holding a plate; past this
                                 // it is better to fail than to keep them there.

// Defaults if the matching env var is unset. Per PERSON, per day — every
// account gets its own counters, so a second user cannot eat the first one's.
const LIMITS = { perMinute: 5, photoPerDay: 3, textPerDay: 3, monthUsd: 2, globalMonthUsd: 10 };

// A per-account override can raise these, but never past here. The override is a
// database node the owner writes; a ceiling in code is what makes a bad or hostile
// write bounded rather than a blank cheque.
//
// Be honest about what this protects: HARD_MAX bounds the COUNT per day. What
// bounds the money is MONTHLY_USD_CAP, and that cap is per account — the counters
// live in KV under q:{uid}. At this ceiling one account would reach a $1 monthly
// cap in a few days and get 402 for the rest of the month. Raise the cap in
// wrangler.toml when you raise somebody's allowance, or they will just hit the
// other wall.
const HARD_MAX = { photoPerDay: 12, textPerDay: 30, monthlyUsd: 10 };

// The whole group's ceiling, not one person's. Per-account caps bound each
// person and say nothing about their sum: seven people at $2 each is $14 in the
// month something goes wrong. This is one shared counter in KV, checked after
// the per-account cap so the common refusal still names the person's own limit.
const GLOBAL_KEY = 'spend:global';

// Where the allowlist node lives. Reads of aiAllow/{uid} are public by rule —
// it holds two booleans and two small numbers keyed on an opaque id, and nothing
// else — because this Worker has no Firebase credentials of its own and should
// not be given any.
const RTDB_URL = 'https://lift-cal-default-rtdb.firebaseio.com';
const ALLOW_TTL_MS = 60000;

/* ============ the tool ============
   Asking for "JSON only" in a prompt gets JSON almost every time. A tool with a
   schema gets it every time, because the API validates the shape before it ever
   reaches us. Worth it when the next step is JSON.parse on a phone. */

const MICRO_PROPS = {
  fiber:       { type: 'number', description: 'grams' },
  sugar:       { type: 'number', description: 'grams' },
  satfat:      { type: 'number', description: 'grams' },
  sodium:      { type: 'number', description: 'milligrams' },
  potassium:   { type: 'number', description: 'milligrams' },
  cholesterol: { type: 'number', description: 'milligrams' }
};

const LOG_FOOD_TOOL = {
  name: 'log_food',
  description: 'Report the estimated nutrition for everything eaten. Call this exactly once.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'One entry per distinct food. Split a plate into its components rather than returning one blended row.',
        items: {
          type: 'object',
          properties: {
            name:  { type: 'string', description: 'Short specific name, e.g. "Grilled chicken breast", not "Meat".' },
            qty:   { type: 'string', description: 'The portion you assumed, e.g. "6 oz cooked" or "1 cup". When you scaled a published serving, show the arithmetic: "30 pieces = 3.75 x 8-ct serving". Always fill this in.' },
            cal:   { type: 'number', description: 'Calories (kcal).' },
            p:     { type: 'number', description: 'Protein, grams.' },
            c:     { type: 'number', description: 'Carbohydrate, grams.' },
            f:     { type: 'number', description: 'Fat, grams.' },
            micro: { type: 'object', description: 'Optional micronutrients. Omit any you are guessing wildly at.', properties: MICRO_PROPS }
          },
          required: ['name', 'qty', 'cal', 'p', 'c', 'f']
        }
      },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'high = official published numbers you looked up or read off a label, or a weighed portion. medium = a normal plate you can size by eye, or a brand whose official figures you could not find. low = hidden fats, unknown sauces, or a bad angle.'
      },
      note: {
        type: 'string',
        description: 'One short sentence. Name the source when you looked the numbers up ("Chick-fil-A published values, scaled from the 8-count"), and say so when you searched and could not find them and are estimating instead. Otherwise use it only for an assumption worth correcting — the oil you assumed, the cut of beef, a portion you could not see.'
      }
    },
    required: ['items', 'confidence']
  }
};

/* ============ the lookup ============
   The reason this Worker got slower and dearer. A chain menu item, a protein
   bar, a supermarket ready meal — all of those have numbers somebody published,
   and a model answering from memory gets them plausibly, confidently wrong. It
   is a server-side tool: Anthropic runs the search inside the same API call, so
   there is nothing to execute here, only a bill to count (see WEB_SEARCH_USD).

   max_uses is per request, and each round below is its own request, so the real
   ceiling is this times MAX_ROUNDS. Two is enough for "find the official page,
   then read the right line of it". */
const WEB_SEARCH_TOOL = {
  type: 'web_search_20260209',
  name: 'web_search',
  max_uses: 2
};

/* ---------- the prompt ----------
   Personal defaults live here, not in the app, so changing "85/15 beef" is a
   redeploy of this Worker and not a new version of the PWA. */
const SYSTEM = [
  'You estimate nutrition for a training log. You are looking at one meal, logged by a lifter who tracks macros seriously and needs numbers he can act on, not a lecture about accuracy.',
  '',
  'Rules:',
  '- Always return an estimate. Never refuse, never ask a question back, never return an empty item list. A lookup that found nothing is not a reason to stop — fall back on your own estimate and say so. A rough number beats nothing, and the flagged confidence is how you say you are unsure.',
  '- Break a plate into its components — the chicken, the rice, the sauce — each as its own item. That way one wrong guess can be fixed without redoing the meal.',
  '- Fill in qty with the portion you actually assumed. He checks that field first; it is what makes a wrong answer fixable.',
  '- Weights are cooked unless stated otherwise. Ground beef is 85/15, cheese is cheddar, milk is 2 percent, unless told otherwise or clearly something else.',
  '- Assume restaurant and takeaway food carries more oil, butter and sugar than a home kitchen version of the same dish.',
  '- Brands, restaurant chains and packaged products publish their own numbers, and those are the ones he wants — not your recollection of them, which is reliably wrong on menu items. Use web_search and get the official figure before you answer.',
  '- Search the chain’s or manufacturer’s own nutrition page, or the nutrition PDF it publishes. Aggregator and user-submitted sites (MyFitnessPal, Nutritionix, FatSecret, Eat This Much) copy each other’s mistakes: use one only when nothing official turns up, and drop confidence to medium when you do.',
  '- Menu items are published per unit, not per order. Take the official per-piece or per-serving figure and multiply it out for the count or the size he actually gave — a 30-count of something listed per 8-count is 3.75 servings, not one — and put that arithmetic in qty so a wrong assumption is visible on screen.',
  '- Do not search for home cooking or generic food. "Two eggs and toast", "a chicken breast and rice" — you already know those, and every search costs him money. Search when a name, a brand, a chain or a package is what makes the numbers knowable.',
  '- Where a picture shows a brand or a package, the same rule holds: read the label if it is legible, and look the product up if it is not.',
  '- Calories should roughly reconcile with the macros (4/4/9). If they cannot, trust the macros and adjust calories.',
  '- If the user’s description and the photo disagree, the description wins — he was there.'
].join('\n');

/* ============ tiny helpers ============ */

const enc = new TextEncoder();
const dec = new TextDecoder();

function corsHeaders(origin, allowed) {
  const h = {
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
  if (origin && allowed.includes(origin)) {
    h['Access-Control-Allow-Origin']  = origin;
    h['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    h['Access-Control-Max-Age']       = '86400';
  }
  return h;
}

function json(body, status, origin, allowed, extra) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, allowed), ...(extra || {}) }
  });
}

function list(env, key, fallback) {
  return String(env[key] ?? fallback ?? '')
    .split(',').map(s => s.trim()).filter(Boolean);
}

function num(env, key, fallback) {
  const v = Number(env[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function b64urlBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ============ gate 3: is this really a Rack sign-in? ============
   A Firebase ID token is a JWT signed by Google with a rotating key. Verifying
   it means: fetch the public keys, check the signature, then check the claims.
   Skip any one of those and the token is decoration — the payload is plain
   base64 that anyone can type by hand. */

let jwks = { keys: null, until: 0 };

async function publicKey(kid) {
  const now = Date.now();
  if (!jwks.keys || now > jwks.until) await refreshJwks();
  let k = jwks.keys.find(x => x.kid === kid);
  // Google rotates keys. An unknown kid means our cache is behind, not that the
  // token is bad — refresh once before calling it forged.
  if (!k && now > jwks.until - 300000) { await refreshJwks(); k = jwks.keys.find(x => x.kid === kid); }
  return k || null;
}

async function refreshJwks() {
  const r = await fetch(JWKS_URL);
  if (!r.ok) throw new Error('jwks fetch failed');
  const j = await r.json();
  const m = /max-age=(\d+)/.exec(r.headers.get('cache-control') || '');
  jwks = { keys: j.keys || [], until: Date.now() + (m ? Number(m[1]) : 3600) * 1000 };
}

async function verifyIdToken(token, projectId) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('malformed token');

  const header = JSON.parse(dec.decode(b64urlBytes(parts[0])));
  if (header.alg !== 'RS256') throw new Error('bad alg');   // never trust alg:none

  const jwk = await publicKey(header.kid);
  if (!jwk) throw new Error('unknown key');

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['verify']
  );

  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key,
    b64urlBytes(parts[2]),
    enc.encode(parts[0] + '.' + parts[1])
  );
  if (!ok) throw new Error('bad signature');

  const p   = JSON.parse(dec.decode(b64urlBytes(parts[1])));
  const now = Math.floor(Date.now() / 1000);
  const skew = 60;

  if (p.aud !== projectId)                                        throw new Error('wrong audience');
  if (p.iss !== 'https://securetoken.google.com/' + projectId)    throw new Error('wrong issuer');
  if (!(Number(p.exp) > now - skew))                              throw new Error('expired');
  if (!(Number(p.iat) < now + skew))                              throw new Error('issued in the future');
  if (!p.sub)                                                     throw new Error('no subject');

  return p;
}

/* ============ gates 5 and 6: counters ============
   One KV key per user holds the minute, day and month counters together, so a
   request costs one read and one write instead of six. KV is eventually
   consistent — two requests landing in different Cloudflare locations in the
   same second can both see the old count. For one person logging lunch that is
   irrelevant; if this ever served real traffic, a Durable Object is the version
   that counts exactly. The monthly dollar cap is the limit that actually
   protects the money, and it fails closed. */

function periods(now) {
  const d = new Date(now);
  return {
    minute: Math.floor(now / 60000),
    day:    d.toISOString().slice(0, 10),
    month:  d.toISOString().slice(0, 7)
  };
}

function roll(state, now) {
  const p = periods(now);
  const s = { ...state };
  if (s.minute !== p.minute) { s.minute = p.minute; s.minCount = 0; }
  if (s.day    !== p.day)    { s.day    = p.day;    s.dayCount = 0; s.photoDay = 0; s.textDay = 0; }
  if (s.month  !== p.month)  { s.month  = p.month;  s.monthUsd = 0; }
  return s;
}

const dayUsed  = (st, mode) => (mode === 'photo' ? st.photoDay : st.textDay) || 0;
const dayLimit = (cfg, mode) => mode === 'photo' ? cfg.photoPerDay : cfg.textPerDay;

// Number(null) is 0, which is finite and not negative — so a plain coercion here
// would turn "no override set" into a limit of zero and take the estimator away
// from everybody. Check the type first.
function capDay(v, fallback, ceiling) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return fallback;
  return Math.min(Math.floor(v), ceiling);
}

// The same rule for money, without the flooring. Math.floor here would turn a
// deliberate $0.50 into $0, which does not mean "half a dollar" to anyone --
// it means the estimator is off. Two decimals, because that is money.
function capUsd(v, fallback, ceiling) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return fallback;
  return Math.min(Number(v.toFixed(2)), ceiling);
}

// A second, instant guard inside this isolate. KV needs a round trip; a runaway
// loop in the app can fire a hundred times before the first write lands. This
// catches that in memory, for free, before anything else runs.
const burst = new Map();
function burstOk(uid, perMinute) {
  const now = Date.now();
  const hits = (burst.get(uid) || []).filter(t => now - t < 60000);
  if (hits.length >= perMinute) { burst.set(uid, hits); return false; }
  hits.push(now);
  burst.set(uid, hits);
  if (burst.size > 500) burst.clear();   // this is a cache, not a ledger
  return true;
}

/* ============ gate 4: is this account switched on? ============
   One unauthenticated GET for aiAllow/{uid}.json. `on` is set by the account
   itself the moment it is approved; `blocked` can only be set by the owner and
   beats `on`. The same node optionally carries that account's daily allowance,
   which only the owner can write. Answers are cached in KV for a minute so a
   caller holding a valid token can't turn this into a load generator against
   Firebase — and the in-memory burst guard runs before it, so they can't get
   that far anyway.

   Returns { ok, photoPerDay, textPerDay } — the two limits null when the node
   does not set them — or null for "couldn't tell". Null is not a denial: it
   hands the decision back to ALLOWED_UIDS, so a Firebase outage degrades to the
   old behaviour instead of locking the owner out of his own estimator. */
async function dbAllows(env, uid) {
  // allow2:, not allow: — the cached value changed shape here, and a minute-old
  // entry of the old bare boolean would read as an object with no limits at all.
  const key = 'allow2:' + uid;
  try {
    const hit = await env.RACK_AI.get(key, 'json');
    if (hit && hit.val && hit.until > Date.now()) return hit.val;
  } catch {}

  let val;
  try {
    const base = String(env.RTDB_URL || RTDB_URL).replace(/\/$/, '');
    const r = await fetch(base + '/aiAllow/' + encodeURIComponent(uid) + '.json',
                          { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const j = await r.json();
    // Absent stays absent. Anything that is not already a number is not a limit,
    // and capDay() is what turns "not a limit" into the configured default.
    val = {
      ok:          !!(j && j.on === true && j.blocked !== true),
      photoPerDay: j && typeof j.photoPerDay === 'number' ? j.photoPerDay : null,
      textPerDay:  j && typeof j.textPerDay  === 'number' ? j.textPerDay  : null,
      monthlyUsd:  j && typeof j.monthlyUsd  === 'number' ? j.monthlyUsd  : null
    };
  } catch {
    return null;
  }

  try {
    await env.RACK_AI.put(key, JSON.stringify({ val, until: Date.now() + ALLOW_TTL_MS }),
                          { expirationTtl: 3600 });
  } catch {}
  return val;
}

async function readState(env, uid) {
  const raw = await env.RACK_AI.get('q:' + uid, 'json');
  return roll(raw || {}, Date.now());
}

function saveState(env, uid, state) {
  // 70 days, so a key for someone who stopped using the app tidies itself away.
  return env.RACK_AI.put('q:' + uid, JSON.stringify(state), { expirationTtl: 60 * 60 * 24 * 70 });
}

/* The group counter. Same month string as the per-account one, so the two roll
   over together on the 1st. Read lazily, only after a request has already
   cleared its own cap, so the ordinary path still costs one KV read and not
   two. A month it has never seen reads as zero rather than as an error. */
async function readGlobal(env) {
  let g = null;
  try { g = await env.RACK_AI.get(GLOBAL_KEY, 'json'); } catch {}
  const month = periods(Date.now()).month;
  if (!g || g.month !== month) return { month, usd: 0 };
  return { month, usd: Number(g.usd) || 0 };
}

function saveGlobal(env, g) {
  return env.RACK_AI.put(GLOBAL_KEY, JSON.stringify(g), { expirationTtl: 60 * 60 * 24 * 70 });
}

/* ============ handler ============ */

export default {
  async fetch(request, env) {
    const cfg = {
      allowed:   list(env, 'ALLOWED_ORIGINS', 'https://lyttlebeast.github.io'),
      uids:      list(env, 'ALLOWED_UIDS', ''),
      projectId: String(env.FIREBASE_PROJECT_ID || 'lift-cal'),
      perMinute:   num(env, 'RATE_PER_MINUTE',  LIMITS.perMinute),
      photoPerDay: num(env, 'AI_PHOTO_PER_DAY', LIMITS.photoPerDay),
      textPerDay:  num(env, 'AI_TEXT_PER_DAY',  LIMITS.textPerDay),
      monthUsd:    num(env, 'MONTHLY_USD_CAP',  LIMITS.monthUsd),
      globalMonthUsd: num(env, 'GLOBAL_MONTHLY_USD_CAP', LIMITS.globalMonthUsd)
    };
    const origin = request.headers.get('Origin');
    const url    = new URL(request.url);
    const reply  = (b, s, extra) => json(b, s, origin, cfg.allowed, extra);

    /* ---- gate 1: origin ---- */
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin, cfg.allowed) });
    }
    // A browser from an unlisted site would be blocked by the missing CORS
    // header anyway; refusing outright saves the round trip and says why.
    if (origin && !cfg.allowed.includes(origin)) {
      return json({ error: 'origin_not_allowed' }, 403, null, cfg.allowed);
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return reply({ ok: true, service: 'rack-ai' }, 200);
    }

    const wantsQuota = url.pathname === '/quota' && request.method === 'GET';
    const wantsEstimate = request.method === 'POST' && (url.pathname === '/estimate' || url.pathname === '/');
    if (!wantsQuota && !wantsEstimate) {
      return reply({ error: 'not_found', message: 'POST /estimate or GET /quota.' }, 404);
    }

    /* ---- gates 3 and 4: identity ---- */
    const bearer = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!bearer) return reply({ error: 'no_token', message: 'Sign in to Rack first.' }, 401);

    let claims;
    try {
      claims = await verifyIdToken(bearer, cfg.projectId);
    } catch (e) {
      // Deliberately vague to the caller, specific in the logs. Telling an
      // attacker which check failed is telling them what to fix.
      console.log('token rejected:', e.message);
      return reply({ error: 'bad_token', message: 'Your session expired — sign in again.' }, 401);
    }

    const uid = claims.sub;

    // In memory, before anything that costs a round trip. A runaway loop or a
    // deliberate hammer stops here rather than turning into Firebase reads.
    if (!burstOk(uid, cfg.perMinute)) {
      return reply({ error: 'rate_limited', message: 'Slow down a second.' }, 429, { 'Retry-After': '60' });
    }

    // Named in the settings = always allowed, no lookup. Otherwise ask the
    // database. A null answer (Firebase unreachable) falls back to the list.
    let allowed = cfg.uids.includes(uid);
    let override = null;
    if (!allowed) {
      override = await dbAllows(env, uid);
      allowed = override !== null && override.ok === true;
      if (override === null && !cfg.uids.length) allowed = false;
    }
    if (!allowed) {
      console.log('uid not allowed:', uid);
      return reply({ error: 'not_allowed',
        message: 'This account doesn\u2019t have the AI estimator switched on.' }, 403);
    }

    // A uid named in the settings skipped the lookup above \u2014 which would leave the
    // one account guaranteed to be able to WRITE an allowance, the owner's, as the
    // one account that could never receive it. He would set his own number in the
    // app, the rules would accept it, and this Worker would ignore it forever.
    // Access is already decided by here, so a Firebase outage costs a default
    // limit and never the estimator itself.
    if (!override && cfg.uids.includes(uid)) override = await dbAllows(env, uid);

    // The owner can raise one account's daily allowance from the app, and only
    // his own writes are accepted for it. It is still bounded here: HARD_MAX is
    // the most any database write can ever buy, and cfg is built fresh for every
    // request, so this lasts exactly as long as this one does.
    if (override) {
      cfg.photoPerDay = capDay(override.photoPerDay, cfg.photoPerDay, HARD_MAX.photoPerDay);
      cfg.textPerDay  = capDay(override.textPerDay,  cfg.textPerDay,  HARD_MAX.textPerDay);
      cfg.monthUsd    = capUsd(override.monthlyUsd,  cfg.monthUsd,    HARD_MAX.monthlyUsd);
    }

    /* ---- quota probe: what the app shows on the setup screen ---- */
    let state = await readState(env, uid);
    if (wantsQuota) {
      const photoLeft = Math.max(0, cfg.photoPerDay - dayUsed(state, 'photo'));
      const textLeft  = Math.max(0, cfg.textPerDay  - dayUsed(state, 'text'));
      return reply({
        ok: true,
        uid,
        left:  { minute: Math.max(0, cfg.perMinute - (state.minCount || 0)),
                 photo:  photoLeft,
                 text:   textLeft,
                 // Kept for older clients that only knew about one number.
                 day:    photoLeft + textLeft },
        spend: { monthUsd: Number((state.monthUsd || 0).toFixed(4)), capUsd: cfg.monthUsd,
                 globalUsd: Number((await readGlobal(env)).usd.toFixed(4)),
                 globalCapUsd: cfg.globalMonthUsd },
        limits: { perMinute: cfg.perMinute,
                  photoPerDay: cfg.photoPerDay,
                  textPerDay:  cfg.textPerDay,
                  perDay: cfg.photoPerDay + cfg.textPerDay }
      }, 200);
    }

    /* ---- gate 2: size, before we parse anything ---- */
    const declared = Number(request.headers.get('Content-Length') || 0);
    if (declared > MAX_BODY) return reply({ error: 'too_large', message: 'That photo is too big — the app should have shrunk it.' }, 413);

    let body;
    try {
      const buf = await request.arrayBuffer();
      if (buf.byteLength > MAX_BODY) return reply({ error: 'too_large' }, 413);
      body = JSON.parse(dec.decode(buf));
    } catch {
      return reply({ error: 'bad_json' }, 400);
    }

    const mode = body.mode === 'photo' ? 'photo' : body.mode === 'text' ? 'text' : null;
    if (!mode) return reply({ error: 'bad_mode' }, 400);

    const note = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : '';

    let image = null;
    if (mode === 'photo') {
      image = body.image || {};
      if (!MEDIA_TYPES.includes(image.media_type)) return reply({ error: 'bad_media_type' }, 400);
      if (typeof image.data !== 'string' || !image.data.length) return reply({ error: 'no_image' }, 400);
      if (image.data.length > MAX_IMAGE_B64) return reply({ error: 'too_large', message: 'That photo is too big.' }, 413);
      if (!/^[A-Za-z0-9+/=]+$/.test(image.data)) return reply({ error: 'bad_image' }, 400);
    } else if (!note) {
      return reply({ error: 'no_text', message: 'Tell it what you ate.' }, 400);
    }

    /* ---- gates 5 and 6: rate limit and spend cap ----
       Longest window first, so the refusal says the most useful thing. Hitting
       the monthly cap and being told "slow down" would send you looking in
       entirely the wrong place. */
    if ((state.monthUsd || 0) >= cfg.monthUsd) {
      return reply({ error: 'spend_cap', message: 'This month’s $' + cfg.monthUsd + ' cap is used up. Raise it in the Worker settings if that was on purpose.' }, 402);
    }
    // The group's ceiling. Checked second on purpose: somebody who has blown
    // their own cap should be told about their own cap, because that is the one
    // a message can usefully name.
    if ((await readGlobal(env)).usd >= cfg.globalMonthUsd) {
      return reply({ error: 'global_spend_cap',
        message: 'Rack\u2019s $' + cfg.globalMonthUsd + ' AI budget for this month is used up across everyone. It resets on the 1st.' }, 402);
    }
    // Photos and words have their own daily budgets, because they cost
    // differently: a photo more than a described home-cooked meal, a described
    // chain order more than either, since that one gets looked up. One shared
    // counter would let a run of one kind quietly spend the other — and the
    // person finds out at dinner, holding a plate.
    if (dayUsed(state, mode) >= dayLimit(cfg, mode)) {
      const other = mode === 'photo' ? 'text' : 'photo';
      const spare = Math.max(0, dayLimit(cfg, other) - dayUsed(state, other));
      return reply({ error: 'rate_limited',
        message: 'That is your ' + dayLimit(cfg, mode) + ' ' + mode + ' estimates for today.' +
                 (spare ? ' You still have ' + spare + ' ' + other + ' ' +
                          (spare === 1 ? 'estimate' : 'estimates') + '.' : '') +
                 ' Resets at midnight UTC.'
      }, 429, { 'Retry-After': '3600' });
    }
    if ((state.minCount || 0) >= cfg.perMinute) {
      return reply({ error: 'rate_limited', message: 'That is ' + cfg.perMinute + ' in a minute — give it a moment.' }, 429, { 'Retry-After': '60' });
    }

    // Count the attempt BEFORE spending anything. A call that fails still used a
    // slot; the alternative is a failing call you can retry infinitely fast.
    state.minCount = (state.minCount || 0) + 1;
    state.dayCount = (state.dayCount || 0) + 1;
    if (mode === 'photo') state.photoDay = (state.photoDay || 0) + 1;
    else                  state.textDay  = (state.textDay  || 0) + 1;
    await saveState(env, uid, state);

    /* ---- the actual call ---- */
    const model   = mode === 'photo' ? MODEL_PHOTO : MODEL_TEXT;
    const content = [];

    if (mode === 'photo') {
      content.push({ type: 'image', source: { type: 'base64', media_type: image.media_type, data: image.data } });
      content.push({ type: 'text', text: note
        ? 'Here is what I ate. My description: ' + note + '\n\nEstimate the nutrition and call log_food.'
        : 'Here is what I ate. Estimate the nutrition and call log_food.' });
    } else {
      content.push({ type: 'text', text: 'Here is what I ate: ' + note + '\n\nEstimate the nutrition and call log_food.' });
    }

    /* ---- the rounds ----
       One call used to be enough, because the model answered out of memory.
       Looking something up is a conversation: it searches, reads what came
       back, and only then has numbers. So the turn can end without log_food in
       it, and that is not an error — it is a turn that needs handing back.

       tool_choice cannot be the forced log_food it used to be while any of that
       is happening: forcing a custom tool makes the model answer immediately,
       which is exactly the guess this change exists to stop. So it is `auto`
       while searching is still allowed and forced on the final round, where the
       only acceptable outcome is numbers. */
    const messages = [{ role: 'user', content }];

    const started = Date.now();
    let res = null, data = null, block = null;
    let inTok = 0, outTok = 0, searches = 0;
    let useSearch = true, droppedSearch = false;

    for (let round = 0; round < MAX_ROUNDS; ) {
      const payload = {
        model,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        tools: useSearch ? [WEB_SEARCH_TOOL, LOG_FOOD_TOOL] : [LOG_FOOD_TOOL],
        tool_choice: round === MAX_ROUNDS - 1 ? { type: 'tool', name: 'log_food' } : { type: 'auto' },
        messages
      };

      try {
        res = await fetch(ANTHROPIC_URL, {
          method: 'POST',
          headers: {
            'Content-Type':      'application/json',
            'x-api-key':         env.ANTHROPIC_API_KEY,
            'anthropic-version': ANTHROPIC_VERSION
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(TIMEOUT_MS)
        });
        data = await res.json();
      } catch (e) {
        console.log('upstream error:', e.message);
        return reply({ error: 'upstream', message: 'Claude did not answer in time. Try again.' }, 502);
      }

      if (!res.ok) {
        // Anthropic's error text can name the key, the org and the account state.
        // It goes to the log, never to the phone.
        console.log('anthropic ' + res.status + ':', JSON.stringify(data).slice(0, 500));

        // A 400 while the search tool is attached is most likely the search tool
        // itself — web search switched off for the account, or a tool version
        // this model no longer takes. Losing the lookup is a far smaller loss
        // than losing the estimator, so drop it and ask the old way once. This
        // can only happen once per request: droppedSearch latches.
        if (res.status === 400 && useSearch && !droppedSearch) {
          console.log('dropping web_search and retrying without it');
          useSearch = false;
          droppedSearch = true;
          messages.length = 1;
          continue;
        }

        const msg = res.status === 429 ? 'Claude is rate-limiting the account. Wait a minute.'
                  : res.status === 400 ? 'That image or description was rejected. Try a clearer photo.'
                  : res.status === 401 ? 'The API key on the server is wrong or revoked.'
                  : 'Something went wrong upstream.';
        return reply({ error: 'upstream', status: res.status, message: msg }, 502);
      }

      // Count every round, including the ones that only searched. The bill is
      // the sum of them and so is the spend cap.
      const used = data.usage || {};
      inTok    += (used.input_tokens || 0) + (used.cache_read_input_tokens || 0);
      outTok   += used.output_tokens || 0;
      searches += (used.server_tool_use && used.server_tool_use.web_search_requests) || 0;

      block = (data.content || []).find(b => b.type === 'tool_use' && b.name === 'log_food');
      if (block) break;

      round++;
      if (round >= MAX_ROUNDS || !Array.isArray(data.content) || !data.content.length) break;
      if (Date.now() - started > OVERALL_MS) { console.log('out of time after round ' + round); break; }

      // It searched, or it talked, without answering. Hand its own turn back
      // verbatim — the search results live in those blocks and dropping them
      // would mean paying for the lookup twice — and ask for the numbers.
      messages.push({ role: 'assistant', content: data.content });
      messages.push({ role: 'user', content: [{ type: 'text',
        text: 'Now call log_food with your final numbers, using the official figures if you found them.' }] });
    }

    /* ---- record what it cost ---- */
    const price = PRICE[model] || { in: 0, out: 0 };
    const usd   = inTok * price.in + outTok * price.out + searches * WEB_SEARCH_USD;

    state = roll(state, Date.now());
    state.monthUsd = Number(((state.monthUsd || 0) + usd).toFixed(6));
    await saveState(env, uid, state);

    // And the group total. Re-read instead of trusting the value the gate saw:
    // two calls can be in flight at once and the later write should not erase
    // the earlier one. KV has no transaction, so this is not a ledger -- worst
    // case it loses one call's worth of drift, and the number it feeds is a
    // backstop rather than an invoice.
    try {
      const g = await readGlobal(env);
      g.usd = Number((g.usd + usd).toFixed(6));
      await saveGlobal(env, g);
    } catch {}

    /* ---- unwrap the tool call ---- */
    if (!block || !block.input || !Array.isArray(block.input.items) || !block.input.items.length) {
      console.log('no log_food after ' + MAX_ROUNDS + ' rounds:', JSON.stringify(data).slice(0, 400));
      return reply({ error: 'no_result', message: 'Could not read that one. Try again, or describe it in words.' }, 502);
    }

    const items = block.input.items.slice(0, 20).map(it => ({
      name: String(it.name || 'Food').slice(0, 80),
      qty:  String(it.qty || '').slice(0, 40),
      cal:  Math.max(0, Math.round(Number(it.cal) || 0)),
      p:    Math.max(0, Number(it.p) || 0),
      c:    Math.max(0, Number(it.c) || 0),
      f:    Math.max(0, Number(it.f) || 0),
      micro: it.micro && typeof it.micro === 'object' ? it.micro : undefined
    }));

    return reply({
      ok: true,
      items,
      confidence: block.input.confidence || 'medium',
      note: String(block.input.note || '').slice(0, 240),
      model,
      // `mode` so the app can tell a described meal from a photographed one
      // without inferring it from the model name — both paths run the same
      // model now, so that inference no longer works.
      mode,
      usage: { in: inTok, out: outTok, searches, usd: Number(usd.toFixed(5)) },
      left: { minute: Math.max(0, cfg.perMinute - state.minCount),
              kind:   mode,
              photo:  Math.max(0, cfg.photoPerDay - dayUsed(state, 'photo')),
              text:   Math.max(0, cfg.textPerDay  - dayUsed(state, 'text')),
              day:    Math.max(0, dayLimit(cfg, mode) - dayUsed(state, mode)) },
      spend: { monthUsd: state.monthUsd, capUsd: cfg.monthUsd }
    }, 200);
  }
};
