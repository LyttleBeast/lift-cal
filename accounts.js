// What an account is allowed to do — the one file that answers it.
//
// Rack has had exactly two kinds of account since it grew past one person: the
// owner, and everybody the owner let in. This adds a third dimension to the
// second half — a TYPE, stored on the record that already gates access — and
// puts every question about limits and entitlements through one function so
// that when a paid tier arrives there is a single place for a subscription to
// feed into. That function is capabilitiesFor(). Nothing else in the app is
// allowed to decide what a tier may do.
//
// Three things matter more than anything else here, in this order:
//
//   1. IT FAILS OPEN. An absent type, an unknown type, a record that failed to
//      read, a malformed customCaps, a clock that came back NaN — every one of
//      those resolves to `basic`, which is today's behaviour exactly. Nothing
//      in this file can lock somebody out because a field was missing. The only
//      way to a locked account is an explicit stored type of 'locked', or a
//      trial with a real end date that has really passed.
//
//   2. THE OWNER IS NOT A TYPE. OWNER_UID decides who the owner is, and the
//      security rules are what make that stick. 'owner' is a value this module
//      RETURNS and never a value anybody STORES — there is no in-app path that
//      writes it, because being able to promote an account from a phone is a
//      much worse failure than not being able to. Adding an owner is an edit to
//      firebase-config.js and a re-publish of the rules, on purpose.
//
//   3. IT IS PURE. No DOM, no Firebase, no clock of its own — `nowMs` is always
//      an argument so a verifier can stand on a boundary and a native client
//      can hold a different clock. The one import is the owner's uid, which is
//      a string constant. The native port copies this file to
//      src/pure/accounts.js and changes that single import line, nothing else.
//
// WHERE THE NUMBERS GO. A type does not reach the Worker on its own: the Worker
// has no idea this file exists. It reads aiAllow/{uid} over plain HTTPS and
// enforces whatever it finds there. So derivedAllowance() turns a type into
// exactly the aiAllow shape the Worker already understands, and the admin panel
// writes it in the same atomic update as the type. That is what lets a whole
// tier system ship without touching worker/ at all.

import { OWNER_UID } from './firebase-config.js';

/* ================= the tiers =================

   PLACEHOLDER NUMBERS. Every value in this table is Micah's to tune and this
   is the only place any of them appear — nothing downstream hard-codes a limit.

   `basic` is the one row that is not free to move: its numbers ARE the Worker's
   own defaults (3 photo, 3 describe, and no monthly override), because an
   account with no type is a basic account and must behave exactly as it does
   today. Change basic here and you have changed what every existing account
   gets the moment the owner touches its type.

   null means "no override" — leave the key off aiAllow entirely and let the
   Worker's own default stand. It is not zero. Zero is a real value and it means
   none of that kind at all.

   The per-day numbers can never usefully exceed the ceilings the database rules
   enforce (12 photo, 30 describe, $10 a month); derivedAllowance() clamps to
   them so a mis-typed number here becomes a smaller number rather than a write
   the rules refuse in silence. */

export const FEATURES = Object.freeze(['advanced']);

const ALL_FEATURES = Object.freeze({ advanced: true });
const NO_FEATURES  = Object.freeze({});

export const TIERS = Object.freeze({
  basic: Object.freeze({
    label: 'Basic',
    aiPhotoPerDay: 3, aiTextPerDay: 3, monthlyUsd: null,
    aiAccess: true, appAccess: true, features: NO_FEATURES
  }),
  pro: Object.freeze({
    label: 'Pro',
    aiPhotoPerDay: 10, aiTextPerDay: 20, monthlyUsd: 5,
    aiAccess: true, appAccess: true, features: ALL_FEATURES
  }),
  // A trial IS Pro, with an end date. Keeping the numbers identical rather than
  // "Pro minus something" is what makes the trial worth having: the thing being
  // tried is the thing being sold.
  trial: Object.freeze({
    label: 'Trial',
    aiPhotoPerDay: 10, aiTextPerDay: 20, monthlyUsd: 5,
    aiAccess: true, appAccess: true, features: ALL_FEATURES
  }),
  // The row the owner fills in by hand. The numbers below are only the base an
  // unset field falls back to — see capabilitiesFor(). Pro's numbers, not
  // basic's: a custom account is one the owner made an exception for, and an
  // exception that silently came out stingier than the tier above it is a
  // support conversation.
  custom: Object.freeze({
    label: 'Custom',
    aiPhotoPerDay: 10, aiTextPerDay: 20, monthlyUsd: 5,
    aiAccess: true, appAccess: true, features: ALL_FEATURES
  }),
  locked: Object.freeze({
    label: 'Locked',
    aiPhotoPerDay: 0, aiTextPerDay: 0, monthlyUsd: 0,
    aiAccess: false, appAccess: false, features: NO_FEATURES
  }),
  // Returned, never stored. See the header.
  owner: Object.freeze({
    label: 'Owner',
    aiPhotoPerDay: null, aiTextPerDay: null, monthlyUsd: null,
    aiAccess: true, appAccess: true, features: ALL_FEATURES
  })
});

/* The types a human may set, in the order they belong on screen. 'owner' is
   deliberately absent and the admin UI iterates THIS list, so there is no
   version of the control that offers it. */
export const SETTABLE_TYPES = Object.freeze(['basic', 'pro', 'trial', 'custom', 'locked']);

/* Placeholder, display only. No payment code exists and none is implied by a
   value here — see the PAID SEAMS block at the foot of this file. */
export const SUB_STATUSES = Object.freeze(['none', 'active', 'past_due', 'canceled']);

// How long a trial runs when the owner starts one without picking a date.
export const TRIAL_DAYS = 14;

/* The ceilings in database.rules.json, mirrored. They are here so that a tier
   number this file cannot honour comes out clamped rather than refused: a write
   the rules reject fails silently, and a silently unchanged limit is the worst
   possible outcome for a screen whose whole job is to say what the limit is. */
export const RULE_MAX = Object.freeze({ photoPerDay: 12, textPerDay: 30, monthlyUsd: 10 });

const DAY_MS = 864e5;

/* ================= the questions ================= */

export function isOwnerUid(u) { return !!u && u === OWNER_UID; }

export function typeLabel(t) {
  const tier = TIERS[t];
  return tier ? tier.label : TIERS.basic.label;
}

/* The type an account is ACTUALLY on right now, which is not always the type
   stored on it: the owner is the owner whatever the record says, and a trial
   that has run out is locked without anybody having written anything.

   Everything that is not a recognised type comes back 'basic'. That is the
   whole fail-open promise in one line — see the header. */
export function effectiveType(u, record, nowMs) {
  try {
    if (isOwnerUid(u)) return 'owner';
    const rec = plain(record);
    if (!rec) return 'basic';
    const t = typeof rec.type === 'string' ? rec.type : '';
    if (!SETTABLE_TYPES.includes(t)) return 'basic';
    if (t === 'trial' && trialExpired(rec, nowMs)) return 'locked';
    return t;
  } catch {
    return 'basic';
  }
}

/* THE ENTITLEMENT CHOKE POINT.
   Every limit and every feature check in the app goes through here or through a
   thin wrapper over it (access.js holds the live one for the signed-in
   account). When a subscription eventually decides what somebody gets, this is
   the function it feeds — one place, not thirty call sites. */
export function capabilitiesFor(u, record, nowMs) {
  try {
    const t = effectiveType(u, record, nowMs);
    if (t === 'custom') return customCapabilities(record);
    return capsOf(t);
  } catch {
    // Unreachable by construction; here because the promise in the header is
    // absolute and an unforeseen throw must not read as "no access".
    return capsOf('basic');
  }
}

/* What to write into aiAllow/{uid} so the EXISTING Worker enforces this tier.
   This is the whole bridge between a type and the money.

   null (the return value, not a field) means WRITE NOTHING: that is the owner,
   whose allowance this machinery never rewrites. A null FIELD means remove that
   key and let the Worker's own default stand. */
export function derivedAllowance(u, record, nowMs) {
  if (isOwnerUid(u)) return null;
  const caps = capabilitiesFor(u, record, nowMs);
  return Object.freeze({
    photoPerDay: whole(caps.aiPhotoPerDay, RULE_MAX.photoPerDay),
    textPerDay:  whole(caps.aiTextPerDay,  RULE_MAX.textPerDay),
    monthlyUsd:  money(caps.monthlyUsd,    RULE_MAX.monthlyUsd),
    blocked:     caps.aiAccess === false
  });
}

/* ---------- helpers the UI and the gate ask for ---------- */

export function isEffectivelyLocked(u, record, nowMs) {
  return effectiveType(u, record, nowMs) === 'locked';
}

export function isTrial(u, record, nowMs) {
  return effectiveType(u, record, nowMs) === 'trial';
}

/* Whole days left, rounded up so the last part-day still reads as a day.
   null when there is no usable end date — which is also the case where the
   trial never expires, so a caller printing this must say nothing rather than
   print a zero. */
export function trialDaysLeft(record, nowMs) {
  const rec = plain(record);
  if (!rec) return null;
  const end = num(rec.trialEndsAt);
  const now = num(nowMs);
  if (end === null || end <= 0 || now === null || now <= 0) return null;
  return Math.max(0, Math.ceil((end - now) / DAY_MS));
}

export function trialEndFromNow(nowMs, days) {
  const now = num(nowMs);
  const d   = num(days);
  const base = now === null || now <= 0 ? 0 : now;
  return base + (d === null ? TRIAL_DAYS : d) * DAY_MS;
}

/* The fields to put on access/approved/{uid} for a type change, as one object,
   so the shape lives beside the table that defines it rather than in the sheet
   that happens to draw the buttons. A null value means "remove this key" — the
   same thing it means to a Firebase multi-path update.

   Note what is NOT here: `at`, `via`, `name`, `email`. A type change must never
   rewrite how somebody got in or what they are called. */
export function typePatch(type, opts) {
  const o = plain(opts) || {};
  const t = SETTABLE_TYPES.includes(type) ? type : 'basic';
  return {
    type: t,
    trialEndsAt: t === 'trial' ? Math.round(num(o.trialEndsAt) ?? trialEndFromNow(o.nowMs, TRIAL_DAYS)) : null,
    customCaps:  t === 'custom' ? normalizeCustomCaps(o.customCaps) : null,
    subStatus:   SUB_STATUSES.includes(o.subStatus) ? o.subStatus : 'none'
  };
}

/* An owner-typed customCaps, reduced to the keys the rules accept and the
   ranges they allow. An empty object comes back null so the key is removed
   rather than written as an empty node — RTDB does not store one anyway, and a
   present-but-empty customCaps would read as "the owner set no limits" when it
   means "the owner set nothing". */
export function normalizeCustomCaps(raw) {
  const cc = plain(raw);
  if (!cc) return null;
  const out = {};
  const p = whole(cc.photoPerDay, RULE_MAX.photoPerDay);
  const t = whole(cc.textPerDay,  RULE_MAX.textPerDay);
  const m = money(cc.monthlyUsd,  RULE_MAX.monthlyUsd);
  if (p !== null) out.photoPerDay = p;
  if (t !== null) out.textPerDay  = t;
  if (m !== null) out.monthlyUsd  = m;
  const f = plain(cc.features);
  if (f) {
    const keep = {};
    for (const k of FEATURES) if (f[k] === true) keep[k] = true;
    if (Object.keys(keep).length) out.features = keep;
  }
  return Object.keys(out).length ? out : null;
}

/* ================= the small print ================= */

function plain(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : null; }

function num(v) { return typeof v === 'number' && Number.isFinite(v) ? v : null; }

/* A trial with no end date does not expire. That is deliberate and it is the
   fail-open rule again: the owner setting a trial and the date failing to write
   must leave somebody using the app, not locked out of it. */
function trialExpired(rec, nowMs) {
  const end = num(rec.trialEndsAt);
  const now = num(nowMs);
  if (end === null || end <= 0) return false;
  if (now === null || now <= 0) return false;
  return now >= end;                       // exactly at the end date, it is over
}

function capsOf(t) {
  const tier = TIERS[t] || TIERS.basic;
  return Object.freeze({
    type: TIERS[t] ? t : 'basic',
    aiPhotoPerDay: tier.aiPhotoPerDay,
    aiTextPerDay:  tier.aiTextPerDay,
    monthlyUsd:    tier.monthlyUsd,
    aiAccess:      tier.aiAccess !== false,
    appAccess:     tier.appAccess !== false,
    features:      tier.features || NO_FEATURES
  });
}

/* custom = the owner's numbers over the Custom row's base. An unset field is
   not a zero and not a lock — it falls back to the base, which is the most
   generous set this app can actually express. (There is no true "unlimited" to
   fall back to: the rules cap every one of these at 12 / 30 / $10, so the
   highest expressible limit IS the ceiling, and pretending otherwise would put
   a number on screen the database would refuse.) */
function customCapabilities(record) {
  const base = TIERS.custom;
  const cc   = plain(plain(record) ? record.customCaps : null) || {};
  return Object.freeze({
    type: 'custom',
    aiPhotoPerDay: pick(cc.photoPerDay, base.aiPhotoPerDay),
    aiTextPerDay:  pick(cc.textPerDay,  base.aiTextPerDay),
    monthlyUsd:    pick(cc.monthlyUsd,  base.monthlyUsd),
    aiAccess:  true,
    appAccess: true,
    features:  mergeFeatures(base.features, cc.features)
  });
}

// A number the owner really typed wins; anything else defers to the base.
function pick(v, fallback) {
  const n = num(v);
  return n === null || n < 0 ? fallback : n;
}

function mergeFeatures(base, extra) {
  const e = plain(extra);
  if (!e) return base;
  const out = {};
  for (const k of FEATURES) if (base[k] === true || e[k] === true) out[k] = true;
  return Object.freeze(out);
}

// A count for aiAllow: a whole number inside the rules' ceiling, or null for
// "no override". Floor rather than round, so 3.9 is three estimates and not
// four — the smaller of two readings is the one that cannot overspend.
function whole(v, max) {
  const n = num(v);
  if (n === null) return null;
  return Math.max(0, Math.min(max, Math.floor(n)));
}

// Money, to the cent, inside the rules' ceiling, or null for "no override".
function money(v, max) {
  const n = num(v);
  if (n === null) return null;
  return Number(Math.max(0, Math.min(max, n)).toFixed(2));
}

/* ================= PAID SEAMS — nothing below this line runs =================

   There is no payment code in Rack and this round adds none: no SDK, no
   network call, no store product, no webhook. What follows is where each of
   those lands, written down while the shape is fresh, so that the later round
   is an edit and not an archaeology exercise.

   The path is the one SCALING-BRIEF.md states: the Worker's ALLOWED_UIDS
   allowlist stops being "uids Micah typed into wrangler.toml" and becomes
   "accounts with an active paid subscription". Every step below is a step along
   that line.

   TODO (paid, later round) — Apple IAP / RevenueCat, native only.
     The store transaction happens in the native client. RevenueCat is the
     receipt broker; nothing in this repo talks to Apple. The web app never sees
     a purchase and must keep working when it cannot see one.

   TODO (paid, later round) — the entitlement write.
     A RevenueCat webhook hits a NEW Worker endpoint, which verifies the event
     and writes access/approved/{uid}.type + .subStatus with the Firebase admin
     credential the Worker does not currently have. That write must stay
     owner-or-server only: the rules in database.rules.json already refuse it
     from any client, and that must not be relaxed to make a client-side
     purchase flow easier.

   TODO (paid, later round) — server-side enforcement.
     Trial expiry is evaluated CLIENT-SIDE today (see effectiveType). That is a
     UX answer, not a money answer: a client decides what it shows itself. The
     money gate is the Worker, which already reads aiAllow/{uid} — so the
     honest version is the Worker reading access/approved/{uid}.type and
     .trialEndsAt itself, and refusing on its own clock.

   TODO (paid, later round) — subStatus becomes real.
     It is display-only now and nothing branches on it. When it stops being a
     placeholder, it feeds capabilitiesFor() and NOTHING ELSE reads it, for the
     same reason everything else routes through there. */
