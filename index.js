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

// Pinned server-side. A photo gets the sharper eye; plain text is a fraction of
// the tokens and does not need it.
const MODEL_PHOTO = 'claude-sonnet-5';
const MODEL_TEXT  = 'claude-haiku-4-5-20251001';

// USD per token. Update these if Anthropic's prices move — they only feed the
// spend cap, so being slightly stale makes the cap slightly wrong, nothing else.
const PRICE = {
  'claude-sonnet-5':           { in: 2 / 1e6, out: 10 / 1e6 },
  'claude-haiku-4-5-20251001': { in: 1 / 1e6, out:  5 / 1e6 }
};

const MEDIA_TYPES   = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_B64 = 900000;    // ~675 KB of image. The app sends ~150 KB.
const MAX_TEXT      = 600;       // characters of description
const MAX_BODY      = 1400000;   // bytes on the wire, checked before parsing
const MAX_TOKENS    = 900;       // ceiling on what one answer can cost
const TIMEOUT_MS    = 45000;

// Defaults if the matching env var is unset. Per PERSON, per day — every
// account gets its own counters, so a second user cannot eat the first one's.
const LIMITS = { perMinute: 5, photoPerDay: 3, textPerDay: 3, monthUsd: 5 };

// Where the allowlist node lives. Reads of aiAllow/{uid} are public by rule —
// it holds two booleans keyed on an opaque id and nothing else — because this
// Worker has no Firebase credentials of its own and should not be given any.
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
            qty:   { type: 'string', description: 'The portion you assumed, e.g. "6 oz cooked" or "1 cup". Always fill this in.' },
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
        description: 'high = a packaged or clearly measured food. medium = a normal plate you can size by eye. low = hidden fats, unknown sauces, or a bad angle.'
      },
      note: {
        type: 'string',
        description: 'One short sentence, only if a specific assumption is worth correcting — the oil you assumed, the cut of beef, a portion you could not see. Skip it when the estimate is unremarkable.'
      }
    },
    required: ['items', 'confidence']
  }
};

/* ---------- the prompt ----------
   Personal defaults live here, not in the app, so changing "85/15 beef" is a
   redeploy of this Worker and not a new version of the PWA. */
const SYSTEM = [
  'You estimate nutrition for a training log. You are looking at one meal, logged by a lifter who tracks macros seriously and needs numbers he can act on, not a lecture about accuracy.',
  '',
  'Rules:',
  '- Always return an estimate. Never refuse, never ask a question back, never return an empty item list. A rough number beats nothing, and the flagged confidence is how you say you are unsure.',
  '- Break a plate into its components — the chicken, the rice, the sauce — each as its own item. That way one wrong guess can be fixed without redoing the meal.',
  '- Fill in qty with the portion you actually assumed. He checks that field first; it is what makes a wrong answer fixable.',
  '- Weights are cooked unless stated otherwise. Ground beef is 85/15, cheese is cheddar, milk is 2 percent, unless told otherwise or clearly something else.',
  '- Assume restaurant and takeaway food carries more oil, butter and sugar than a home kitchen version of the same dish.',
  '- Where the picture shows a brand or a package, use that brand’s published numbers.',
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
   beats `on`. Answers are cached in KV for a minute so a caller holding a valid
   token can't turn this into a load generator against Firebase — and the
   in-memory burst guard runs before it, so they can't get that far anyway.

   Returns true, false, or null for "couldn't tell". Null is not a denial: it
   hands the decision back to ALLOWED_UIDS, so a Firebase outage degrades to the
   old behaviour instead of locking the owner out of his own estimator. */
async function dbAllows(env, uid) {
  const key = 'allow:' + uid;
  try {
    const hit = await env.RACK_AI.get(key, 'json');
    if (hit && hit.until > Date.now()) return hit.ok;
  } catch {}

  let ok;
  try {
    const base = String(env.RTDB_URL || RTDB_URL).replace(/\/$/, '');
    const r = await fetch(base + '/aiAllow/' + encodeURIComponent(uid) + '.json',
                          { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const j = await r.json();
    ok = !!(j && j.on === true && j.blocked !== true);
  } catch {
    return null;
  }

  try {
    await env.RACK_AI.put(key, JSON.stringify({ ok, until: Date.now() + ALLOW_TTL_MS }),
                          { expirationTtl: 3600 });
  } catch {}
  return ok;
}

async function readState(env, uid) {
  const raw = await env.RACK_AI.get('q:' + uid, 'json');
  return roll(raw || {}, Date.now());
}

function saveState(env, uid, state) {
  // 70 days, so a key for someone who stopped using the app tidies itself away.
  return env.RACK_AI.put('q:' + uid, JSON.stringify(state), { expirationTtl: 60 * 60 * 24 * 70 });
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
      monthUsd:    num(env, 'MONTHLY_USD_CAP',  LIMITS.monthUsd)
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
    if (!allowed) {
      const db = await dbAllows(env, uid);
      allowed = db === true;
      if (db === null && !cfg.uids.length) allowed = false;
    }
    if (!allowed) {
      console.log('uid not allowed:', uid);
      return reply({ error: 'not_allowed',
        message: 'This account doesn\u2019t have the AI estimator switched on.' }, 403);
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
        spend: { monthUsd: Number((state.monthUsd || 0).toFixed(4)), capUsd: cfg.monthUsd },
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
    // Photos and words have their own daily budgets. A photo costs roughly ten
    // times what the same meal costs described, so one shared counter lets a run
    // of cheap text estimates quietly spend the expensive ones — and the person
    // finds out at dinner, holding a plate.
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

    const payload = {
      model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      tools: [LOG_FOOD_TOOL],
      tool_choice: { type: 'tool', name: 'log_food' },
      messages: [{ role: 'user', content }]
    };

    let res, data;
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
      const msg = res.status === 429 ? 'Claude is rate-limiting the account. Wait a minute.'
                : res.status === 400 ? 'That image or description was rejected. Try a clearer photo.'
                : res.status === 401 ? 'The API key on the server is wrong or revoked.'
                : 'Something went wrong upstream.';
      return reply({ error: 'upstream', status: res.status, message: msg }, 502);
    }

    /* ---- record what it cost ---- */
    const price = PRICE[model] || { in: 0, out: 0 };
    const used  = data.usage || {};
    const inTok = (used.input_tokens || 0) + (used.cache_read_input_tokens || 0);
    const usd   = inTok * price.in + (used.output_tokens || 0) * price.out;

    state = roll(state, Date.now());
    state.monthUsd = Number(((state.monthUsd || 0) + usd).toFixed(6));
    await saveState(env, uid, state);

    /* ---- unwrap the tool call ---- */
    const block = (data.content || []).find(b => b.type === 'tool_use' && b.name === 'log_food');
    if (!block || !block.input || !Array.isArray(block.input.items) || !block.input.items.length) {
      console.log('no tool_use in response:', JSON.stringify(data).slice(0, 400));
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
      usage: { in: inTok, out: used.output_tokens || 0, usd: Number(usd.toFixed(5)) },
      left: { minute: Math.max(0, cfg.perMinute - state.minCount),
              kind:   mode,
              photo:  Math.max(0, cfg.photoPerDay - dayUsed(state, 'photo')),
              text:   Math.max(0, cfg.textPerDay  - dayUsed(state, 'text')),
              day:    Math.max(0, dayLimit(cfg, mode) - dayUsed(state, mode)) },
      spend: { monthUsd: state.monthUsd, capUsd: cfg.monthUsd }
    }, 200);
  }
};
