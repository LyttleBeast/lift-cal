// Usage — a counters-only ledger, one node per account.
//
//   usage/{uid}/who/{firstSeen,lastSeen,platform,standalone,version}
//   usage/{uid}/days/{YYYY-MM-DD}/{event} -> a whole number
//
// The owner wanted to know which features people actually use. He cannot learn
// that from users/{uid}: that subtree is readable by its own account alone, and
// nothing in this change widens it. So the answer is a second tree holding no
// content whatsoever — no food, no weigh-ins, no sets, and no name or email
// either. The names and emails he needs are already in access/approved, and a
// second copy here would only be a second thing to get wrong. There are no
// lifetime totals for the same reason: the admin panel sums the days, so a
// total and its parts can never disagree.
//
// What the published rules enforce — and this comment claims nothing beyond it
// — is that every value under usage/ is a number, a boolean, one of six
// platform tokens, or a version string of fixed shape; that firstSeen cannot be
// rewritten once it is set; and that an account may only write under its own
// uid, and only while access/approved lists it.
//
// No increment(). Counts live in a localStorage ledger namespaced by uid (two
// accounts on one phone must never pool their numbers) and are flushed as
// ABSOLUTE per-day values. That makes every write idempotent, so a refused or
// half-sent flush costs a retry and nothing else. The price is that the numbers
// are approximate: two devices logging on the same day each write their own
// total and the later write wins. init seeds today from max(local, server) so
// they converge instead of sawtoothing — but nobody should read these counts as
// an audit, and the admin panel says so on screen.
//
// This module ships BEFORE the rules that allow it are published, so for a
// while every flush comes back permission-denied. That is why every failure is
// swallowed and backed off, why the ledger is capped at 200 day keys of known
// events — a permanently refused write must not grow it without bound — and why
// window.__rackUsage exists. It is the one deliberate dev hatch, and it is what
// turns "refused, or just not published yet?" into a question answerable from
// the console instead of by guessing.
//
// Imports store.js only. Nothing here may throw into a caller: a bump is one
// line at a call site that has real work to do.

import { LS, uid, todayKey, readShared, updateShared } from './store.js';

// Must be bumped alongside CACHE in sw.js. It is duplicated rather than
// imported because sw.js is a service worker, not a module the app can load.
const VERSION = 'rack-v27';
// For the About sheet in settings, which shows this beside the build the
// service worker is actually serving — the two disagreeing is what an update
// that never took looks like.
export function appVersion() { return VERSION; }

/* ---------- the vocabulary ----------
   Closed, and exported so admin.js renders from this list rather than from
   whatever keys happen to be in the database. Anything not in here is dropped
   by bump() and stripped from the ledger on load. */
export const EVENTS = Object.freeze([
  // shell
  'appOpen', 'install',
  // tabs — which screen people actually spend time on
  'tabYou', 'tabTrain', 'tabFuel', 'tabWeight', 'tabSteps',
  // the estimator. Three keys for the three ways in, because "photo", "photo
  // with a description" and "description alone" cost differently and the owner
  // asked to tell them apart. aiRecall spent nothing; aiFail came back an error.
  'aiPhoto', 'aiPhotoText', 'aiText', 'aiRecall', 'aiFail',
  // other ways food gets in
  'barcode', 'barcodeHit', 'barcodeMiss',
  'foodManual', 'foodLib', 'foodMeal', 'foodCopy', 'foodRepeat', 'foodPaste',
  // the rest
  'workoutStart', 'workoutFinish', 'setLogged', 'routineStart', 'exerciseCustom',
  'weighIn', 'waterLog', 'stepsSet'
]);
const KNOWN = new Set(EVENTS);

const LKEY      = 'usage';        // uid-namespaced by store.js's LS
const DAY       = 864e5;
const DAY_RE    = /^\d{4}-\d{2}-\d{2}$/;
const KEEP_DAYS = 120;            // retention: the account prunes its own history
const MAX_DAYS  = 200;            // hard cap, in case pruning never gets a chance
const MAX_COUNT = 1000000;        // the ceiling the rules validate against
const FLUSH_MS  = 20000;
// 1m, 5m, 30m, 6h. Long enough that an unpublished rule set costs a handful of
// refused writes a day rather than one every twenty seconds.
const BACKOFF   = [60e3, 300e3, 1800e3, 21600e3];

/* ---------- state ---------- */
let days      = {};               // dateKey -> { event: n }
let dirty     = new Set();        // day keys not yet accepted by the server
let firstSeen = null;
let pendingFirstSeen = true;      // false once the server is known to hold one
let loadedFor = null;
let sentOnce  = false;
let flushing  = false;
let seq       = 0;                // bump counter, so an in-flight write knows if it went stale
let timer     = null;
let fails     = 0;
let quietUntil = 0;
let lastError = null;

/* ---------- platform ----------
   Exported because onboarding.js's install walkthrough needs the same answer
   and two copies of this would drift. navigator.standalone is the iOS-only
   truth; matchMedia('(display-mode: standalone)') is the standard and is what
   Android answers. Ask both, in that order. */
export function isStandalone() {
  try {
    if (navigator.standalone === true) return true;
    return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  } catch { return false; }
}

export function platform() {
  try {
    const ua = navigator.userAgent || '';
    const pf = navigator.platform || '';
    // An iPad on iPadOS 13+ calls itself a Mac. The touch points are what still
    // separate the two, so this test has to come before the Mac one.
    if (/iPhone|iPad|iPod/.test(ua) || (/Mac/.test(pf) && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/.test(ua)) return 'android';                 // before Linux: Android says both
    if (/Mac/.test(ua) || /Mac/.test(pf)) return 'mac';
    if (/Win/.test(ua) || /Win/.test(pf)) return 'windows';
    if (/Linux|X11|CrOS/.test(ua)) return 'linux';
    return 'other';
  } catch { return 'other'; }
}

/* ---------- the ledger ---------- */
function load() {
  days = {}; dirty = new Set(); firstSeen = null;
  const raw = LS.get(LKEY, null);
  if (!raw || typeof raw !== 'object') return;
  // Rebuilt key by key rather than adopted wholesale: this is the only thing
  // standing between a mangled localStorage value and a write the rules refuse
  // — and a refused write takes the whole atomic update down with it.
  const src = raw.days && typeof raw.days === 'object' ? raw.days : {};
  for (const [day, evs] of Object.entries(src)) {
    if (!DAY_RE.test(day) || !evs || typeof evs !== 'object') continue;
    const clean = {};
    for (const [ev, v] of Object.entries(evs)) {
      if (KNOWN.has(ev) && typeof v === 'number' && v > 0) clean[ev] = Math.min(Math.round(v), MAX_COUNT);
    }
    if (Object.keys(clean).length) days[day] = clean;
  }
  if (Array.isArray(raw.dirty)) raw.dirty.forEach(d => { if (days[d]) dirty.add(d); });
  if (typeof raw.firstSeen === 'number' && raw.firstSeen > 0) firstSeen = raw.firstSeen;
}

function save() {
  LS.set(LKEY, { days, dirty: [...dirty], firstSeen });
}

function prune() {
  const cutoff = todayKey(new Date(Date.now() - KEEP_DAYS * DAY));
  for (const day of Object.keys(days)) {
    if (day < cutoff) { delete days[day]; dirty.delete(day); }   // YYYY-MM-DD sorts as it dates
  }
  trim();
}

function trim() {
  const keys = Object.keys(days);
  if (keys.length <= MAX_DAYS) return;   // the common case, and bump() calls this on every count
  keys.sort();
  while (keys.length > MAX_DAYS) {
    const old = keys.shift();
    delete days[old];
    dirty.delete(old);
  }
}

/* Every entry point comes through here. It also handles the account changing
   under us: the ledger is per-uid, so signing in as somebody else starts a new
   one rather than flushing this device's counts into their node. */
function ensure() {
  const u = uid();
  if (!u) return null;
  if (u !== loadedFor) {
    loadedFor = u;
    load();
    pendingFirstSeen = true; sentOnce = false;
    fails = 0; quietUntil = 0; lastError = null;
  }
  return u;
}

/* ================= INIT ================= */
export async function initUsage(user) {
  try {
    if (!user) return;
    const u = ensure();
    if (!u) return;
    prune();
    // Recorded before the reads, so a slow or refused read cannot cost the open.
    bump('appOpen');
    // Nothing else in the app is positioned to notice an install: the manifest
    // prompt is the browser's, and this module already owns the detection. One
    // per device, which is what the number is meant to mean.
    if (isStandalone() && !LS.get('installSeen', false)) { LS.set('installSeen', true); bump('install'); }
    save();

    const [fs, today, serverDays] = await Promise.all([
      readShared('usage/' + u + '/who/firstSeen', null),
      readShared('usage/' + u + '/days/' + todayKey(), null),
      readShared('usage/' + u + '/days', null)
    ]);
    if (uid() !== u) return;              // signed out or switched while the reads were in flight

    // readShared swallows every error and returns the fallback (store.js:242),
    // so null here means "absent, or refused, and there is no telling which".
    // It is therefore never treated as a reading: a null leaves the local
    // ledger exactly as it was, and seedToday only ever raises a count.
    if (typeof fs === 'number' && fs > 0) { firstSeen = fs; pendingFirstSeen = false; }
    else if (!firstSeen) firstSeen = Date.now();
    seedToday(today);
    save();
    flushUsage();
    pruneServer(u, serverDays);
  } catch {}
}

/* The local ledger forgets a day at KEEP_DAYS, which on its own would mean the
   server keeps every day forever — and forgetting it locally is exactly what
   guarantees the client never touches that key again. So the account tidies its
   own row, once per open. Deleting is a null, and `.validate` is not evaluated
   for a null, so the published day rule permits it. Failure is ignored like
   every other write here: an untidied row is not worth a word on screen. */
async function pruneServer(u, serverDays) {
  if (!serverDays || typeof serverDays !== 'object') return;
  const cutoff = todayKey(new Date(Date.now() - KEEP_DAYS * DAY));
  const out = {};
  for (const day of Object.keys(serverDays)) {
    if (day < cutoff) out['usage/' + u + '/days/' + day] = null;   // YYYY-MM-DD sorts as it dates
  }
  if (!Object.keys(out).length) return;
  try { await updateShared(out); } catch {}
}

/* Two devices, one day: each holds its own total and each writes it absolutely,
   so without this the smaller device would keep stamping the day back down.
   max() makes them converge on the larger count instead. It still under-counts
   whatever the other device logged after this read — that is the approximation
   the header warns about. */
function seedToday(server) {
  if (!server || typeof server !== 'object') return;
  const day = todayKey();
  const d = days[day] || (days[day] = {});
  for (const [ev, v] of Object.entries(server)) {
    if (!KNOWN.has(ev) || typeof v !== 'number' || !(v > 0)) continue;
    if (v > (d[ev] || 0)) d[ev] = Math.min(Math.round(v), MAX_COUNT);
  }
}

/* ================= BUMP ================= */
export function bump(event, n = 1) {
  try {
    const u = ensure();
    if (!u) return;                      // signed out: nothing to attribute a count to
    if (!KNOWN.has(event)) return;
    const k = Math.round(n);
    if (!(k > 0)) return;
    const day = todayKey();
    const d = days[day] || (days[day] = {});
    // Clamped at the ceiling the rules validate against. One runaway counter
    // would otherwise fail validation and take every other path in the same
    // atomic update down with it.
    d[event] = Math.min((d[event] || 0) + k, MAX_COUNT);
    dirty.add(day);
    trim();
    seq++;
    save();
    schedule();
  } catch {}
}

/* Coalescing, not resetting: the first bump starts the clock and the ones after
   it ride along. A true debounce would let a busy workout — a set logged every
   thirty seconds — push the flush back indefinitely. */
function schedule() {
  if (timer) return;
  timer = setTimeout(() => { timer = null; flushUsage(); }, FLUSH_MS);
}

/* ================= FLUSH ================= */
function payload(u) {
  const base = 'usage/' + u + '/';
  const out = {};
  // Sent only until the server is known to hold one. firstSeen is write-once in
  // the rules, so re-sending a value that disagrees with the stored one would
  // fail validation and take the day counters with it.
  if (pendingFirstSeen && firstSeen) out[base + 'who/firstSeen'] = firstSeen;
  out[base + 'who/lastSeen']   = Date.now();
  out[base + 'who/platform']   = platform();
  out[base + 'who/standalone'] = isStandalone();
  out[base + 'who/version']    = VERSION;
  for (const day of dirty) {
    const d = days[day];
    if (!d) continue;
    for (const ev of Object.keys(d)) out[base + 'days/' + day + '/' + ev] = d[ev];
  }
  return out;
}

export async function flushUsage() {
  const u = ensure();
  if (!u || flushing) return;
  if (!dirty.size && sentOnce) return;   // nothing new; lastSeen alone is not worth a write
  if (Date.now() < quietUntil) return;
  if (timer) { clearTimeout(timer); timer = null; }

  flushing = true;
  const mark = seq;
  try {
    await updateShared(payload(u));
    // Sign-out and sign-in can both happen while that write is in flight, and
    // ensure() has already swapped every one of these to the new account by the
    // time we get here. Landing the old account's result on them would clear a
    // dirty list that is not ours and mark a first flush that never happened.
    if (uid() !== u) return;
    fails = 0; quietUntil = 0; lastError = null;
    pendingFirstSeen = false; sentOnce = true;
    // A bump landed while the write was in flight, so its day is a count behind
    // what is now local. Leave it dirty — that bump has already scheduled the
    // flush that resends it, and the values are absolute, so resending a day
    // that was already accepted costs nothing.
    if (seq === mark) { dirty.clear(); save(); }
  } catch (e) {
    fails++;
    quietUntil = Date.now() + BACKOFF[Math.min(fails - 1, BACKOFF.length - 1)];
    lastError = String((e && e.message) || e);
  } finally {
    flushing = false;
  }
}

/* On a phone the app is backgrounded far more often than it is closed, so
   visibilitychange is the one that matters and pagehide is the belt. Neither
   can promise the write survives the page dying mid-flight — which is exactly
   why the dirty list is on disk beside the ledger and an unsent day goes out
   again on the next open. */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushUsage();
});
window.addEventListener('pagehide', () => { flushUsage(); });

/* The dev hatch, and the only one. Getters rather than a snapshot, so reading
   it in the console gives the live state instead of whatever was true at import
   time: __rackUsage.lastError says whether the rules are published yet, and
   __rackUsage.flush() answers it without waiting out the backoff. */
window.__rackUsage = {
  get ledger()     { return days; },
  get dirty()      { return [...dirty]; },
  get fails()      { return fails; },
  get quietUntil() { return quietUntil; },
  get lastError()  { return lastError; },
  version: VERSION,
  flush: () => { quietUntil = 0; return flushUsage(); }
};
