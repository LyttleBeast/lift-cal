// The owner's panel — accounts, feature usage, and how much AI each person is
// allowed. Two facts decide the shape of everything below.
//
// First, it can only show what the owner is actually allowed to read:
// access/approved, access/requests, access/invites, aiAllow/{uid} one uid at a
// time, and the usage counters tree. users/{uid} is self-only by rule and this
// screen does not widen it — there is no path from here to anybody's food log,
// weigh-ins or workouts, and there is not meant to be one.
//
// Second, it has to say how much of what it shows is a guess, because two of
// the three numbers on it are:
//
//   The usage counters are written by each phone and flushed as absolute
//   per-day values (see the header of usage.js). Two devices on one day
//   converge on the larger count rather than the true one. They are a shape,
//   not an audit.
//
//   The Worker's /quota derives its uid from the caller's own bearer token, so
//   the owner can read his own spend and nobody else's. There is no admin view
//   of somebody else's dollars and this file does not pretend otherwise.
//
// Both are one line each on screen. An admin panel that overstates its own
// accuracy is worse than none: it is a number you would act on.
//
// The People section replaces access.js's openPeople(), which was reachable only
// from the Weight tab's old settings card and went with it. access.js still owns
// every action — approve, decline, revoke, the invite codes — and this file
// imports those primitives and draws the rows. One People screen, not two: the
// second copy would only have been the one somebody edited by mistake.

import { readShared, writeShared, removeShared, updateShared, isOwner, uid, todayKey } from './store.js';
import { listRequests, listApproved, listInvites, approve, decline, revoke,
         createInvite, revokeInvite, deleteInvite, setAiBlocked } from './access.js';
import { EVENTS } from './usage.js';
import { quota, hasProxy } from './ai.js';
import { OWNER_UID } from './firebase-config.js';
import { TIERS, SETTABLE_TYPES, RULE_MAX, TRIAL_DAYS,
         effectiveType, derivedAllowance, typeLabel,
         trialDaysLeft, trialEndFromNow, typePatch } from './accounts.js';
import { $, el, sheet, toast, noteEl, confirmSheet, copyText, compact,
         fmtDate, parseKey, segmented } from './ui.js';
import { lineChart, barChart, donut, legend, emptyChart } from './analytics.js';

const P_AI = 'aiAllow/';
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Rendered from usage.js's list rather than from whatever keys happen to be in
// the database, so a stray key on one phone cannot invent a category here.
const KNOWN = new Set(EVENTS);

// The estimator, split the way the owner asked for it: photo, photo WITH a
// typed description, and words alone are three different costs. aiRecall is the
// fourth slice because a cache hit is a use of the feature that spent nothing —
// leaving it out would make the paid slices look like the whole story.
// aiFail is not a slice: it is a failure, not a way in, and it gets its own line.
const AI_SPLIT = [
  ['aiPhoto',     'Photo',           'var(--p-yellow)'],
  ['aiPhotoText', 'Photo + words',   'var(--p-red)'],
  ['aiText',      'Words only',      'var(--p-blue)'],
  ['aiRecall',    'Cache (free)',    'var(--p-green)']
];

// Everything else, in families of at most fourteen. Past fourteen bars
// barChart stops drawing labels and values, and a chart of unlabelled bars is
// decoration. Short labels for the same reason — they have ~40px each.
//
// The third field is where the family is DRAWN, not whether it is kept. Micah
// asked for a shorter screen, and two of these four are charts he reads once a
// month — so they moved to the More Info expander at the foot of the page
// rather than being deleted. Nothing here is gone; some of it is one tap away.
const FAMILIES = [
  ['Where people go', 'var(--p-blue)', 'main', [
    ['tabYou', 'You'], ['tabTrain', 'Train'], ['tabFuel', 'Fuel'],
    ['tabWeight', 'Weight'], ['tabSteps', 'Steps']
  ]],
  ['How food gets in', 'var(--p-yellow)', 'main', [
    ['barcode', 'Scan'], ['barcodeHit', 'Hit'], ['barcodeMiss', 'Miss'],
    ['foodManual', 'Manual'], ['foodLib', 'Library'], ['foodMeal', 'Meal'],
    ['foodCopy', 'Copy'], ['foodRepeat', 'Repeat'], ['foodPaste', 'Paste']
  ]],
  ['Training, weight and the rest', 'var(--p-green)', 'more', [
    ['workoutStart', 'Start'], ['workoutFinish', 'Finish'], ['setLogged', 'Sets'],
    ['routineStart', 'Routine'], ['exerciseCustom', 'Custom'],
    ['weighIn', 'Weigh-in'], ['waterLog', 'Water'], ['stepsSet', 'Steps']
  ]],
  ['The shell', 'var(--p-chrome)', 'more', [
    ['appOpen', 'Opens'], ['install', 'Installs']
  ]]
];

/* The type filter's options. 'all' first because it is the answer nine times
   out of ten, then the tiers in the order they appear in the type control, so
   the two lists never disagree about what a tier is called. 'owner' is offered
   as a FILTER — it is a thing an account can be — and never as a SETTING. */
const TYPE_FILTERS = ['all', 'owner', ...SETTABLE_TYPES];

// Past this many matches the list stops drawing and says how many it did not
// show. A list of two hundred rows on a phone is not a list, it is a scroll,
// and the search box above it is the answer. Never a silent truncation.
const SHOW_MAX = 25;

/* ================= state ================= */

// The admin page borrows #view-you the way stats.js borrows #view-workout. It
// is a page and not a sheet because it is a screenful of tables and charts, and
// a sheet that tall is a scroll trap on a phone.
let open    = false;
let parked  = null;      // the You tab's own nodes, put back on Back
let backFn  = null;

let loading  = true;
let diag     = null;     // null | 'rules' | 'blind' — see diagnose()
let approved = {};
let requests = {};
let invites  = {};
let usage    = {};       // uid -> { who, days }
let allow    = {};       // uid -> aiAllow record
let range    = 30;       // days of history the charts cover; 0 is everything

// Fetched once per opening rather than per render: it is a network round trip
// and re-rendering happens on every range tap.
let quotaState = { status: 'idle', data: null, message: '' };
let quotaBox   = null;

/* The Accounts list filters itself without redrawing the page. It has to: a
   full render() rebuilds #view-you from scratch, which throws away the search
   box along with the focus and the keyboard, and a search field that closes the
   keyboard after every letter is not a search field. So the list body is held
   here and repainted on its own. */
let acctQuery  = '';
let acctFilter = 'all';
let acctBox    = null;
let acctNote   = null;

// More Info renders only once it is opened — it holds two charts, a table of
// every counter and a whole line chart, and none of that is worth building for
// a screen nobody has asked to see.
let moreOpen = false;

/* ================= open / close ================= */

export function openAdmin(onBack) {
  // The client check. The gate is the rules — every read below is refused for
  // anyone else, and this only stops a wrong screen being drawn.
  if (!isOwner()) return;
  const root = $('#view-you');
  if (!root) return;

  // Park the You tab's own DOM rather than throwing it away and asking you.js
  // to rebuild: put the same nodes back and every handler it hung on them is
  // still attached. Parked unconditionally, because if something repainted the
  // tab underneath us the fragment we are holding is already stale.
  parked = document.createDocumentFragment();
  while (root.firstChild) parked.appendChild(root.firstChild);

  open = true;
  backFn = typeof onBack === 'function' ? onBack : null;
  loading = true;
  diag = null;
  quotaState = { status: 'idle', data: null, message: '' };
  // A fresh open is a fresh screen: last week's search term still in the box,
  // over a filter set to Locked, is a panel that looks like it has lost everyone.
  acctQuery = '';
  acctFilter = 'all';
  moreOpen = false;

  render();
  loadQuota();
  load().then(() => render());
}

/* The same shape as isStatsOpen() (stats.js:26), and for the same reason:
   workout.js asks it before repainting the view stats has taken over. you.js
   repaints #view-you whenever one of its unawaited reads lands, and this page
   is sitting in that element — so a slow allSessions() can land after the owner
   has tapped through and quietly take the panel away. One guard there fixes it;
   this is the answer that guard needs. */
export function isAdminOpen() { return open; }

function closeAdmin() {
  const root = $('#view-you');
  open = false;
  quotaBox = null;
  acctBox = null;
  acctNote = null;
  if (root && parked) {
    root.innerHTML = '';
    root.appendChild(parked);
  }
  parked = null;
  const back = backFn;
  backFn = null;
  if (back) back();
}

function render(keepScroll) {
  if (!open) return;
  const root = $('#view-you');
  if (!root) return;
  const y = window.scrollY;
  root.innerHTML = '';
  root.appendChild(page());
  // Approving somebody at the bottom of a long page and being thrown back to
  // the top is how you approve the wrong person next. Only a fresh open starts
  // at the top; a redraw after an action stays where it was.
  if (keepScroll) window.scrollTo(0, y);
  else { root.scrollTop = 0; window.scrollTo(0, 0); }
}

// Every action redraws from the database rather than patching the row it just
// changed: the writes are small and one source of truth is worth the read.
function reload() {
  return load().then(() => render(true));
}

/* ================= loading ================= */

async function load() {
  try {
    // One read of the whole usage tree: the owner has read at its root, and the
    // alternative is a read per account for a node that is a few KB in total.
    const [reqs, appr, inv, use] = await Promise.all([
      listRequests(), listApproved(), listInvites(), readShared('usage', null)
    ]);
    requests = obj(reqs);
    approved = obj(appr);
    invites  = obj(inv);
    usage    = obj(use);

    // aiAllow is readable per uid and NOT at the root — the parent is closed on
    // purpose so the list of who has the estimator is not enumerable by anyone
    // holding the base URL. So: one read each, which is a handful of accounts.
    const next = {};
    await Promise.all(Object.keys(approved).map(async u => {
      next[u] = obj(await readShared(P_AI + u, null));
    }));
    allow = next;

    diagnose();
  } catch {
    diag = 'blind';
  }
  loading = false;
}

/* readShared swallows a permission refusal and hands back the fallback
   (store.js:242), so "the rules refused this" and "the node is empty" arrive
   here as the same null. That distinction is the whole difference between
   "nobody has used the app" and "you haven't pasted the rules yet", and
   rendering the second one as a wall of zeros would be a lie the owner acts on.
   So: compare against a read he is known to be allowed. access/approved always
   holds at least his own record — accessState() writes it on every boot — so if
   that came back and usage did not, usage is being refused or has never been
   written by a device that could write it, and both of those end at the same
   instruction. */
function diagnose() {
  if (!Object.keys(approved).length) { diag = 'blind'; return; }
  diag = Object.keys(usage).length ? null : 'rules';
}

function loadQuota() {
  if (quotaState.status !== 'idle') return;
  if (!hasProxy()) {
    quotaState = { status: 'err', data: null,
      message: 'No Worker URL is set on this device — Settings › AI estimator.' };
    return;
  }
  quotaState = { status: 'loading', data: null, message: '' };
  quota().then(q => {
    quotaState = { status: 'ok', data: q, message: '' };
    paintQuota();
  }).catch(e => {
    quotaState = { status: 'err', data: null, message: (e && e.message) || 'Couldn’t reach the Worker.' };
    paintQuota();
  });
}

/* ================= aggregation ================= */

function obj(v) { return v && typeof v === 'object' ? v : {}; }

function sinceKey() {
  if (!range) return null;
  return todayKey(new Date(Date.now() - (range - 1) * 864e5));
}

function inRange(day, since) {
  return DAY_RE.test(day) && (!since || day >= since);   // YYYY-MM-DD sorts as it dates
}

// One account's days, summed per event. Unknown keys are dropped rather than
// counted into a total the charts never show.
function sumDays(rec, since) {
  const out = {};
  for (const [day, evs] of Object.entries(obj(rec).days || {})) {
    if (!inRange(day, since)) continue;
    for (const [ev, v] of Object.entries(obj(evs))) {
      if (!KNOWN.has(ev) || typeof v !== 'number' || !(v > 0)) continue;
      out[ev] = (out[ev] || 0) + v;
    }
  }
  return out;
}

function sumAll(since) {
  const out = {};
  for (const rec of Object.values(usage)) {
    for (const [ev, v] of Object.entries(sumDays(rec, since))) out[ev] = (out[ev] || 0) + v;
  }
  return out;
}

function totalOf(sums) {
  return Object.values(sums).reduce((a, b) => a + b, 0);
}

function activeDays(rec, since) {
  return Object.keys(obj(rec).days || {}).filter(d => inRange(d, since)).length;
}

/* A day's node under usage/{uid}/days is an OBJECT of counters. lineChart wants
   [{ t, v }] with v a NUMBER — hand it the object and Math.min/Math.max return
   NaN (analytics.js:381), every point lands at NaN coordinates, and the chart
   comes out blank with nothing in the console. Sum the day first. */
function dailyTotals(since) {
  const by = {};
  for (const rec of Object.values(usage)) {
    for (const [day, evs] of Object.entries(obj(rec).days || {})) {
      if (!inRange(day, since)) continue;
      let n = 0;
      for (const [ev, v] of Object.entries(obj(evs))) {
        if (KNOWN.has(ev) && typeof v === 'number' && v > 0) n += v;
      }
      if (n > 0) by[day] = (by[day] || 0) + n;
    }
  }
  return Object.keys(by).sort().map(day => ({ t: parseKey(day).getTime(), v: by[day] }));
}

// who.lastSeen is the honest answer when it is there; a day key is the fallback
// for an account whose `who` write was refused but whose counters landed.
function lastSeenOf(rec) {
  const who = obj(obj(rec).who);
  if (typeof who.lastSeen === 'number' && who.lastSeen > 0) return who.lastSeen;
  const days = Object.keys(obj(rec).days || {}).filter(d => DAY_RE.test(d)).sort();
  return days.length ? parseKey(days[days.length - 1]).getTime() : 0;
}

// Every uid worth a row: everyone with access, plus anyone whose counters are
// still in the tree after being removed. Their data is not deleted by a revoke
// (access.js:198) and neither is this, so say so rather than quietly dropping
// numbers the totals already include.
function accountUids() {
  const seen = new Set([...Object.keys(approved), ...Object.keys(usage)]);
  return [...seen];
}

function nameOf(u) {
  const rec = obj(approved[u]);
  return (rec.name || rec.email || u.slice(0, 10)) + (u === uid() ? ' (you)' : '');
}

function ago(ms) {
  if (!ms || typeof ms !== 'number') return 'not seen yet';
  const d = Math.floor((Date.now() - ms) / 864e5);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return d + ' days ago';
  return fmtDate(todayKey(new Date(ms)));
}

/* ================= page ================= */

function page() {
  const wrap = el('div', 'screen-pad');
  wrap.appendChild(pageHead('Owner only', 'Admin', closeAdmin));

  if (loading) {
    wrap.appendChild(noteEl('Loading…'));
    return wrap;
  }

  if (diag === 'blind') {
    const es = el('div', 'empty-state');
    es.appendChild(el('h3', null, 'Nothing came back'));
    es.appendChild(el('p', null,
      'The access list didn’t read. You may be offline, or Firebase refused it. Nothing below would be true, so none of it is shown.'));
    const again = el('button', 'btn btn-primary', 'Try again');
    again.onclick = () => reload();
    es.appendChild(again);
    wrap.appendChild(es);
    return wrap;
  }

  /* The order is the order Micah reads it in: how much is being used, then who
     is using it, then who is waiting to. Everything he looks at occasionally
     rather than daily is behind More Info at the foot — moved, not deleted. */
  wrap.appendChild(glance());
  wrap.appendChild(usageSection());
  wrap.appendChild(accountsSection());
  wrap.appendChild(peopleSection());
  wrap.appendChild(moreInfo());
  return wrap;
}

/* ---------- 1. at a glance ---------- */
function glance() {
  const s = section('At a glance');
  const since = sinceKey();
  const sums = sumAll(since);
  const week = todayKey(new Date(Date.now() - 6 * 864e5));

  const live = Object.values(invites).filter(i => i && !i.usedBy && !i.revoked).length;
  const activeWeek = accountUids().filter(u => activeDays(usage[u], week) > 0).length;
  const ai = AI_SPLIT.reduce((a, [k]) => a + (sums[k] || 0), 0);
  // A dash, never a zero: "nothing came back" and "nobody did it" are different
  // answers and only one of them is something to act on.
  const noCounters = diag === 'rules';

  s.appendChild(statRow([
    [Object.keys(approved).length, 'Accounts'],
    [noCounters ? '–' : activeWeek, 'Active this week'],
    [Object.keys(requests).length, 'Waiting']
  ]));
  s.appendChild(gap(statRow([
    [live, 'Live codes'],
    [noCounters ? '–' : compact(totalOf(sums)), 'Events ' + rangeLabel()],
    [noCounters ? '–' : compact(ai), 'AI calls ' + rangeLabel()]
  ])));

  if (noCounters) s.appendChild(rulesBanner());
  return s;
}

/* The one screen where "no data" and "no permission" have to be told apart, and
   the only honest way to tell them apart from here is to say what was tried. */
function rulesBanner() {
  const c = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Usage rules not published'));
  hd.appendChild(el('span', 'adm-flag off', 'action needed'));
  c.appendChild(hd);
  c.appendChild(noteEl(
    'The access list read fine and the usage tree came back with nothing at all — not even this account’s own counters, which this phone writes every time you open the app. That is what it looks like when the usage rules haven’t been published yet.'));
  c.appendChild(noteEl(
    'Paste database.rules.json into the Firebase console → Realtime Database → Rules → Publish. Until then every phone’s counters are being refused and kept on the device, and they go out on the next open.'));
  return c;
}

/* ---------- 2. feature usage ---------- */
function usageSection() {
  const s = section('Feature usage, all accounts');

  s.appendChild(segmented(
    [[7, '7d'], [30, '30d'], [90, '90d'], [0, 'All']],
    range,
    v => { range = v; render(true); }
  ));
  s.appendChild(noteEl(
    'Counted by each phone, not by the Worker. A day’s number is whatever the last device to write it said, so read these as a shape and not as an audit.'));

  // The banner is already up beside the dashed tiles at the top of the page,
  // where it explains the empty numbers it sits next to. Saying it twice on one
  // screen reads as two different problems.
  if (diag === 'rules') return s;

  const since = sinceKey();
  const sums = sumAll(since);

  /* ---- the AI split ---- */
  const aiTotal = AI_SPLIT.reduce((a, [k]) => a + (sums[k] || 0), 0);
  const aiCard = card('The estimator', rangeLabel());
  if (!aiTotal) {
    aiCard.appendChild(emptyChart('No estimates in this range'));
  } else {
    const holder = el('div', 'donut-wrap');
    holder.appendChild(donut(
      AI_SPLIT.map(([k, label, color]) => ({ label, v: sums[k] || 0, color })),
      { centerTop: compact(aiTotal), centerSub: 'calls' }
    ));
    // The numbers go beside the ring on purpose: donut() silently skips any
    // segment thinner than about half a percent (analytics.js:525), so a real
    // but small category would otherwise vanish rather than read as small.
    holder.appendChild(legend(AI_SPLIT.map(([k, label, color]) => ({
      label, color,
      value: (sums[k] || 0) + '  ' + Math.round((sums[k] || 0) / aiTotal * 100) + '%'
    }))));
    aiCard.appendChild(holder);
  }
  aiCard.appendChild(noteEl(
    'Photo, photo with a typed description, and words alone are three different costs. Cache hits answered from food/recall and spent nothing. Failed calls in this range: ' +
    (sums.aiFail || 0) + '.'));
  s.appendChild(aiCard);

  /* ---- the two families that earn a place on the main screen ---- */
  FAMILIES.filter(f => f[2] === 'main').forEach(f => s.appendChild(familyCard(f, sums)));

  // The other two families, the every-counter table and the whole of Usage over
  // time are in More Info at the foot of the page.
  return s;
}

// One family, one card. Shared by the main screen and More Info so the two can
// never drift into drawing the same numbers two different ways.
function familyCard([title, color, , keys], sums) {
  const bars = keys.map(([k, label]) => ({ label, v: sums[k] || 0 }));
  const c = card(title);
  if (!bars.some(b => b.v > 0)) c.appendChild(noteEl('Nothing counted in this range.'));
  else c.appendChild(barChart(bars, { color, height: 148 }));
  return c;
}

/* The exact numbers. Built from EVENTS itself, so a counter that no chart
   happens to cover still shows up here with its real number — which is the
   reason this table exists and the reason it moved rather than went. */
function counterTable(sums) {
  const table = card('Every counter', rangeLabel());
  const t = el('div', 'adm-table');
  EVENTS.forEach(ev => {
    const row = el('div', 'adm-r');
    row.appendChild(el('div', 'adm-who', ev));
    row.appendChild(el('div', 'adm-n', String(sums[ev] || 0)));
    t.appendChild(row);
  });
  table.appendChild(t);
  return table;
}

/* ---------- More Info ----------
   The foot of the page. Everything here used to be on the main screen and is
   still exactly the code that drew it there — the charts were relocated, not
   rewritten and not removed, so nothing that was ever on this page has been
   lost. Closed by default and built only when it is opened. */
function moreInfo() {
  const s = section('More info');

  const tog = el('button', 'btn btn-ghost btn-block',
    moreOpen ? 'Hide the rest' : 'The rest of the numbers');
  tog.onclick = () => { moreOpen = !moreOpen; render(true); };
  s.appendChild(tog);

  if (!moreOpen) {
    s.appendChild(noteEl(
      'Training and shell usage, every counter with its exact number, and the per-day line. Kept off the main screen, not thrown away.'));
    return s;
  }

  if (diag === 'rules') {
    s.appendChild(noteEl('Nothing to show until the usage rules are published.'));
    return s;
  }

  const sums = sumAll(sinceKey());
  FAMILIES.filter(f => f[2] === 'more').forEach(f => s.appendChild(familyCard(f, sums)));
  s.appendChild(counterTable(sums));
  s.appendChild(overTime());
  return s;
}

/* ---------- 3. usage over time ---------- */
function overTime() {
  const s = section('Usage over time');
  if (diag === 'rules') { s.appendChild(noteEl('Nothing to plot until the rules are published.')); return s; }

  const pts = dailyTotals(sinceKey());
  const c = card('Everything, per day', pts.length ? pts.length + ' days' : '');
  if (pts.length < 2) {
    c.appendChild(emptyChart(pts.length ? 'One day so far' : 'Nothing logged yet'));
  } else {
    c.appendChild(lineChart(pts, { color: 'var(--p-yellow)', height: 168, unit: '' }));
  }
  c.appendChild(noteEl('Every counter from every account, added up by day. The ring marks the busiest one.'));
  s.appendChild(c);
  return s;
}

/* ---------- 4. accounts ----------
   One list, one account page. Before this there were two flat lists — "Per
   account" for the counters and "AI allowance" for the limits — which meant two
   rows per person, two taps to answer one question, and a screen that got
   longer every time somebody joined. This is the one that scales: search it,
   filter it by type, open one account and everything about that account is on
   the page in front of you.

   It draws only what matches, and never more than SHOW_MAX of those. */
function accountsSection() {
  const s = section('Accounts');

  const search = el('div', 'picker-search');
  const inp = el('input');
  inp.type = 'search';
  inp.placeholder = 'Search name, email or uid';
  inp.value = acctQuery;
  // Repaints the list body alone. render() would rebuild this input and take
  // the focus and the keyboard with it — see the note on acctQuery.
  inp.oninput = () => { acctQuery = inp.value; paintAccounts(); };
  search.appendChild(inp);
  s.appendChild(search);

  const chips = el('div', 'filter-row');
  TYPE_FILTERS.forEach(t => {
    const b = el('button', 'chip' + (t === acctFilter ? ' on' : ''),
      t === 'all' ? 'All' : typeLabel(t));
    b.onclick = () => {
      acctFilter = t;
      chips.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      paintAccounts();
    };
    chips.appendChild(b);
  });
  s.appendChild(chips);

  acctBox = el('div', 'set-list');
  s.appendChild(acctBox);

  acctNote = noteEl('');
  s.appendChild(acctNote);
  paintAccounts();

  s.appendChild(noteEl(
    'Tap an account for its type, its limits and everything it has done. A removed account keeps its counters — revoking deletes the access record and nothing else.'));

  if (diag === 'rules') s.appendChild(noteEl(
    'Counters are dashed because the usage tree read back empty — types and limits below are still true.'));

  // Not per-account data: it is the owner's own spend, and it says so. It sits
  // here because this is the money section of the page and because More Info
  // renders on demand, which would leave paintQuota() painting a node nobody
  // is holding.
  s.appendChild(quotaCard());
  return s;
}

/* Everybody worth a row, with their type worked out and their limits beside it.
   Built fresh on every repaint rather than cached: a repaint costs nothing next
   to the reads that already happened, and a cache here is a list that disagrees
   with the account page one tap away. */
function accountRows() {
  const now   = Date.now();
  const since = sinceKey();
  return accountUids().map(u => {
    const rec  = approved[u] || null;
    const urec = usage[u];
    const sums = sumDays(urec, since);
    return {
      u, rec,
      type:    effectiveType(u, rec, now),
      derived: derivedAllowance(u, rec, now),
      live:    obj(allow[u]),
      total:   totalOf(sums),
      days:    activeDays(urec, since),
      last:    lastSeenOf(urec),
      gone:    !approved[u]
    };
  });
}

function paintAccounts() {
  if (!acctBox) return;
  acctBox.innerHTML = '';
  if (acctNote) acctNote.textContent = '';

  const rows = accountRows();
  if (!rows.length) { acctBox.appendChild(noteEl('No accounts yet.')); return; }

  const q = acctQuery.trim().toLowerCase();
  const hits = rows
    .filter(r => acctFilter === 'all' || r.type === acctFilter)
    .filter(r => matchesQuery(r, q))
    .sort((a, b) => b.total - a.total || b.last - a.last);

  if (!hits.length) {
    acctBox.appendChild(noteEl(
      q ? 'Nothing matches “' + acctQuery.trim() + '”.'
        : 'No ' + typeLabel(acctFilter).toLowerCase() + ' accounts.'));
    return;
  }

  hits.slice(0, SHOW_MAX).forEach(r => acctBox.appendChild(accountRow(r)));

  // Said out loud, never silently. A list that stopped at twenty-five and did
  // not mention it reads as a complete list of twenty-five people.
  if (hits.length > SHOW_MAX && acctNote) {
    acctNote.textContent =
      (hits.length - SHOW_MAX) + ' more match — search to narrow it down.';
  }
}

function matchesQuery(r, q) {
  if (!q) return true;
  const rec = obj(r.rec);
  return ((rec.name || '') + ' ' + (rec.email || '') + ' ' + r.u).toLowerCase().includes(q);
}

function accountRow(r) {
  const row = el('button', 'set-row-nav');
  const left = el('div', 'set-row-l', nameOf(r.u) + (r.gone ? ' · removed' : ''));
  left.appendChild(el('div', 'adm-uid', obj(r.rec).email || r.u.slice(0, 12) + '…'));
  left.appendChild(el('div', 'adm-uid', ago(r.last) + ' · ' + glanceLimits(r)));
  row.appendChild(left);
  row.appendChild(typePill(r));
  row.appendChild(el('div', 'set-row-v', r.total ? String(r.total) : '–'));
  row.appendChild(el('div', 'set-row-x', '›'));
  row.onclick = () => openAccount(r.u);
  return row;
}

// Tier colours, deliberately the same three the rest of the panel uses: green
// is fine, yellow is running out, red is stopped.
const PILL = { owner: 'on', pro: 'lit', custom: 'lit', trial: 'warn', locked: 'off', basic: '' };

function typePill(r) {
  const extra = r.type === 'trial' ? trialSuffix(r.rec) : '';
  return el('span', ('adm-flag ' + (PILL[r.type] || '')).trim(), typeLabel(r.type) + extra);
}

function trialSuffix(rec) {
  const d = trialDaysLeft(rec, Date.now());
  return d === null ? '' : ' · ' + d + 'd';
}

/* What the WORKER is enforcing, which is what aiAllow actually says — not what
   the type implies it should say. Those two can disagree, and when they do the
   difference is the whole story (almost always: the new rules have not been
   pasted into the console yet, so the type write landed and the limit write did
   not, or neither did). Saying the implied number here would hide exactly the
   failure this line is best placed to catch. */
function glanceLimits(r) {
  const a = r.live;
  // The owner's own numbers are real numbers and the Worker reads them like
  // anybody's. Printing "no limit set" over a live monthly cap of $5 is the one
  // kind of wrong this panel exists not to be. He has no DERIVED limits, which
  // is a different sentence, and it is the one the account page gives.
  if (r.type === 'owner') {
    return limitText(a.photoPerDay) + '/' + limitText(a.textPerDay) + ' ' + usdText(a.monthlyUsd);
  }
  const head = a.blocked === true ? 'AI off · ' : a.on !== true ? 'AI not on · ' : '';
  return head + limitText(a.photoPerDay) + '/' + limitText(a.textPerDay) + ' ' +
         usdText(a.monthlyUsd) + (isDrifted(r) ? ' · out of step' : '');
}

/* True when an account has an explicit type whose derived limits are NOT what
   aiAllow currently holds. Only for an explicit type: an account with no type
   is a basic account that the owner may also have hand-tuned, and calling that
   "out of step" would be calling today's behaviour a fault. */
function isDrifted(r) {
  if (!r.derived) return false;                       // the owner; nothing derived
  const rec = obj(r.rec);
  if (!SETTABLE_TYPES.includes(rec.type)) return false;
  const a = r.live;
  const n = v => (typeof v === 'number' ? v : null);
  return n(a.photoPerDay) !== r.derived.photoPerDay ||
         n(a.textPerDay)  !== r.derived.textPerDay  ||
         n(a.monthlyUsd)  !== r.derived.monthlyUsd  ||
         // One direction only. A tier that means "no estimator" and an account
         // that still has one is a fault worth a warning. An account the owner
         // blocked BY HAND on a tier that allows the estimator is not a fault,
         // it is the switch working — and flagging it would put a button on
         // screen whose one effect is to undo a decision he made on purpose.
         (r.derived.blocked && a.blocked !== true);
}

/* ---------- 5. setting an account's type ----------
   One atomic multi-path update writes BOTH halves: the type onto the record the
   rules already gate access with, and the limits it implies onto aiAllow, where
   the Worker will find them. The Worker is not changed this round and does not
   know any of this exists — deriving into the node it already reads is the
   whole reason it does not have to.

   Atomic matters here more than usual. Half of this landing means an account
   labelled Pro with Basic's limits, or worse, an account labelled Basic still
   spending at Pro's. Either both or neither. */
async function applyType(u, type, opts) {
  // Belt and braces with the UI, which does not offer the control at all for
  // the owner. revoke() refuses him the same way (access.js:202).
  if (u === OWNER_UID) { toast('The owner’s type isn’t set from here'); return false; }

  const rec   = obj(approved[u]);
  const now   = Date.now();
  const patch = typePatch(type,
    { nowMs: now, subStatus: rec.subStatus, ...keepFromRecord(rec, type, now), ...(opts || {}) });

  // Derive from what the record will BE after this write, not from what it is.
  const next  = { ...rec, ...patch };
  const d     = derivedAllowance(u, next, now);

  const paths = {
    ['access/approved/' + u + '/type']:        patch.type,
    ['access/approved/' + u + '/trialEndsAt']: patch.trialEndsAt,
    ['access/approved/' + u + '/customCaps']:  patch.customCaps,
    ['access/approved/' + u + '/subStatus']:   patch.subStatus
  };
  if (d) {
    paths[P_AI + u + '/photoPerDay'] = d.photoPerDay;
    paths[P_AI + u + '/textPerDay']  = d.textPerDay;
    paths[P_AI + u + '/monthlyUsd']  = d.monthlyUsd;

    /* aiAllow/{uid}/blocked is TWO switches sharing one key, and only one of
       them belongs to the tier. The other is "Turn their estimator off" — the
       owner's own, deliberate, aimed at somebody burning credit — and a type
       change must never quietly undo it. So the tier may SET the flag, and may
       clear the one IT set (leaving a locked account), and may do nothing else
       to it. Writing d.blocked unconditionally would mean promoting a blocked
       account to Pro silently handed the estimator back. */
    if (d.blocked) paths[P_AI + u + '/blocked'] = true;
    else if (effectiveType(u, rec, now) === 'locked') paths[P_AI + u + '/blocked'] = false;
  }

  try {
    await updateShared(paths);
    toast(typeLabel(patch.type) + ' — saved');
    return true;
  } catch {
    // The likeliest cause by far, and the one nothing on screen would otherwise
    // reveal: access/approved refuses any key its rules do not name, and the
    // rules naming these four have to be pasted into the console by hand.
    toast('Refused — publish the new rules first');
    return false;
  }
}

/* Re-applying the type an account is already on must not quietly restart its
   trial or forget the numbers somebody typed into it. Writing the limits again
   after a refused write is exactly that case, and it is the one where a silently
   extended trial would go unnoticed for a fortnight. */
function keepFromRecord(rec, type, now) {
  if (rec.type !== type) return {};
  const out = {};
  // A date that has already passed is NOT worth preserving: keeping it would
  // make "set them back to Trial" write yesterday, derive a locked account from
  // it, and report success while changing nothing. An expired trial re-set as a
  // trial is a NEW trial, which is the only reading of that tap.
  if (type === 'trial' && typeof rec.trialEndsAt === 'number' && rec.trialEndsAt > now) {
    out.trialEndsAt = rec.trialEndsAt;
  }
  if (type === 'custom' && rec.customCaps) out.customCaps = rec.customCaps;
  return out;
}

/* ---------- OWNER / ADMIN: why there is no control for it ----------
   There is no in-app path to owner and this is the deliberate part of the
   design, not an omission. The owner is OWNER_UID in firebase-config.js, and
   that same uid is written into database.rules.json, which is where it actually
   carries weight — the rules do not consult any field in the database to decide
   who the owner is, so no write from any client can make one. The type control
   iterates SETTABLE_TYPES, which does not contain 'owner'; typePatch() refuses
   the string outright; capabilitiesFor() answers 'owner' for exactly one uid.
   Four independent places, none of which the UI can reach.

   Making a new owner is therefore an edit to firebase-config.js, a re-publish
   of the rules in the Firebase console, and a deploy — three deliberate acts by
   somebody with the console open. That is the point. An app that can promote an
   account from a phone is an app where one mis-tap hands over the database.

   SCAFFOLD ONLY, DISABLED, WIRED TO NOTHING. If elevation ever does belong in
   an app, the shape below is what it would have to be. None of it is built,
   none of it runs, and the constant is false so that nothing can call it by
   accident. Do NOT enable this without the rules change that would have to come
   with it — without that, every step here is theatre over a database that still
   only recognises one uid. */
const OWNER_ELEVATION_ENABLED = false;

// Called by the account page for its refusal sentence, which is the only thing
// this function will ever return. It is here so the scaffold is live code that
// says no, rather than a comment somebody could mistake for a missing feature.
function elevateToOwner() {
  if (!OWNER_ELEVATION_ENABLED) {
    return { ok: false, reason: 'not implemented, and disabled in code' };
  }
  // Step 1 — reauthenticateWithCredential(): the password, typed again, now.
  //          Firebase exposes it; store.js does not re-export it yet.
  // Step 2 — TODO: an email approval step through a FUTURE Worker endpoint.
  //          No email system exists in this project. Building one is the
  //          prerequisite, not a detail of this flow.
  // Step 3 — a typed confirmation, then a SECOND confirmation after a delay
  //          long enough that it cannot be part of the same mistake.
  // Step 4 — and even then: the rules still name one uid, so the write would
  //          change nothing until firebase-config.js and the rules both move.
  return { ok: false, reason: 'unreachable' };
}

function limitText(v) { return typeof v === 'number' ? String(v) : '–'; }
function usdText(v)   { return typeof v === 'number' ? '$' + v.toFixed(2).replace(/\.00$/, '') : '$–'; }

/* The owner's own quota, labelled as his own. /quota answers for whoever's
   token asked for it, so there is no version of this card that shows somebody
   else's spend, and saying "your" is the whole point of it. */
function quotaCard() {
  const c = card('Your Worker quota');
  quotaBox = el('div');
  c.appendChild(quotaBox);
  paintQuota();
  c.appendChild(noteEl(
    'Yours only. The Worker works out whose quota to answer with from the token that asked, so another account’s spend can’t be read from here — theirs lives in the Worker’s own counters and the app never sees it.'));
  c.appendChild(noteEl(
    'Your own cap is ' + capText() + ', and it is the wall that actually protects the money. Every account has its own — set by its type, or by hand on its account page above; the Worker default applies to anyone you have not given a number.'));
  return c;
}

// A cap the Worker has not told us is not a cap we may print. It now varies by
// account, so a guess here would not just be stale, it would be somebody else's
// number -- and it is the one figure on this screen a person would act on.
function capText() {
  const q = quotaState.data;
  const cap = q && q.spend && q.spend.capUsd;
  return cap != null ? '$' + cap : 'whatever the Worker is set to';
}

// What an empty cap box should show as its placeholder: the Worker default that
// would apply if you leave it empty. Vague when the Worker has not answered yet.
function defaultCapText() {
  const q = quotaState.data;
  const cap = q && q.spend && q.spend.capUsd;
  return cap != null ? '$' + cap : 'Worker default';
}

function paintQuota() {
  if (!quotaBox) return;
  quotaBox.innerHTML = '';
  if (quotaState.status === 'loading' || quotaState.status === 'idle') {
    quotaBox.appendChild(noteEl('Checking…'));
    return;
  }
  if (quotaState.status === 'err') {
    const n = noteEl(quotaState.message);
    n.style.color = 'var(--bad)';
    quotaBox.appendChild(n);
    return;
  }
  const q = quotaState.data || {};
  const left = obj(q.left), limits = obj(q.limits), spend = obj(q.spend);
  // Photo and describe have had their own budgets since the Worker split them;
  // `day` is what an older deploy answers with, and a dash is what a Worker
  // answering with neither deserves. A missing number must not print as one.
  const n = v => (v == null ? '–' : v);
  const photo = n(left.photo != null ? left.photo : left.day);
  const text  = n(left.text  != null ? left.text  : left.day);
  const pMax  = n(limits.photoPerDay != null ? limits.photoPerDay : limits.perDay);
  const tMax  = n(limits.textPerDay  != null ? limits.textPerDay  : limits.perDay);
  quotaBox.appendChild(statRow([
    [photo + '/' + pMax, 'Photos left'],
    [text + '/' + tMax, 'Describes left'],
    ['$' + Number(spend.monthUsd || 0).toFixed(2), 'This month']
  ]));
}

/* ---------- 6. people and access ---------- */
function peopleSection() {
  const s = section('People & access');

  /* ---- requests waiting ---- */
  const reqs = Object.entries(requests).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
  const rh = el('div', 'people-head');
  rh.appendChild(el('div', 'eyebrow', 'Requests'));
  if (reqs.length) rh.appendChild(el('span', 'badge', String(reqs.length)));
  s.appendChild(rh);

  if (!reqs.length) {
    s.appendChild(noteEl('Nobody waiting.'));
  } else {
    reqs.forEach(([u, r]) => {
      const row = el('div', 'person');
      const main = el('div', 'person-main');
      main.appendChild(el('div', 'person-name', r.name || '(no name)'));
      main.appendChild(el('div', 'person-sub', r.email || ''));
      if (r.note) main.appendChild(el('div', 'person-note', '“' + r.note + '”'));
      row.appendChild(main);

      const acts = el('div', 'person-acts');
      const yes = el('button', 'btn btn-primary btn-sm', 'Approve');
      yes.onclick = async () => {
        yes.disabled = true;
        try { await approve(u, r); toast((r.name || 'They') + ' can get in now'); }
        catch { toast('Couldn’t approve — try again'); }
        reload();
      };
      const no = el('button', 'btn btn-ghost btn-sm', 'Decline');
      no.onclick = () => confirmSheet({
        title: 'Decline this request?',
        body: 'They can ask again later. Nothing is created for them.',
        confirmLabel: 'Decline', danger: true,
        onConfirm: async () => { await decline(u); reload(); }
      });
      acts.append(yes, no);
      row.appendChild(acts);
      s.appendChild(row);
    });
  }

  /* ---- who is in ---- */
  s.appendChild(el('div', 'eyebrow people-gap', 'Has access'));
  const people = Object.entries(approved).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
  if (!people.length) s.appendChild(noteEl('Nobody yet.'));

  people.forEach(([u, rec]) => {
    const row = el('div', 'person');
    const main = el('div', 'person-main');
    main.appendChild(el('div', 'person-name', nameOf(u)));
    main.appendChild(el('div', 'person-sub',
      (rec.email ? rec.email + ' · ' : '') +
      (rec.via === 'invite' ? 'used a code' : 'approved by you')));
    row.appendChild(main);

    const acts = el('div', 'person-acts');
    // The owner is the one account revoke() refuses outright (access.js:203).
    // Not offering the button is the same answer without the error.
    if (u !== uid()) {
      const ai = el('button', 'btn btn-ghost btn-sm', 'AI…');
      ai.onclick = () => openAllowance(u);
      acts.appendChild(ai);

      const rev = el('button', 'btn btn-danger btn-sm', 'Remove');
      rev.onclick = () => confirmSheet({
        title: 'Remove ' + (rec.name || 'this person') + '?',
        body: 'They lose access immediately. Their own log is not deleted — if you add them back it is all still there.',
        confirmLabel: 'Remove', danger: true,
        onConfirm: async () => {
          try { await revoke(u); toast('Removed'); }
          catch { toast('Couldn’t remove that account'); }
          reload();
        }
      });
      acts.appendChild(rev);
    }
    row.appendChild(acts);
    s.appendChild(row);
  });

  /* ---- invite codes ---- */
  s.appendChild(el('div', 'eyebrow people-gap', 'Invite codes'));
  s.appendChild(noteEl('A code lets somebody in without waiting on you. Each one works once.'));

  Object.entries(invites).sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).forEach(([code, inv]) => {
    const row = el('div', 'person');
    const main = el('div', 'person-main');
    main.appendChild(el('div', 'person-name code-input', code));
    const state = inv.revoked ? 'turned off' : inv.usedBy ? 'used' : 'ready';
    main.appendChild(el('div', 'person-sub' + (state === 'ready' ? ' live' : ''),
      state + (inv.note ? ' · ' + inv.note : '')));
    row.appendChild(main);

    const acts = el('div', 'person-acts');
    if (!inv.usedBy && !inv.revoked) {
      const cp = el('button', 'btn btn-ghost btn-sm', 'Copy');
      cp.onclick = () => copyText(code, 'Code copied');
      const rv = el('button', 'btn btn-ghost btn-sm', 'Turn off');
      rv.onclick = () => confirmSheet({
        title: 'Turn this code off?',
        body: 'Nobody can claim it after this. Make another one any time.',
        confirmLabel: 'Turn off', danger: true,
        onConfirm: async () => { await revokeInvite(code); reload(); }
      });
      acts.append(cp, rv);
    } else {
      const del = el('button', 'btn btn-ghost btn-sm', 'Clear');
      del.onclick = () => confirmSheet({
        title: 'Clear this code?',
        body: 'It only removes the row. Anyone who already used it keeps their access.',
        confirmLabel: 'Clear', danger: true,
        onConfirm: async () => { await deleteInvite(code); reload(); }
      });
      acts.appendChild(del);
    }
    row.appendChild(acts);
    s.appendChild(row);
  });

  const mk = el('button', 'btn btn-primary btn-block', 'New invite code');
  mk.style.marginTop = '10px';
  mk.onclick = async () => {
    mk.disabled = true;
    try {
      const code = await createInvite('');
      await copyText(code, 'Code copied — ' + code);
    } catch { toast('Couldn’t make a code'); }
    mk.disabled = false;
    reload();
  };
  s.appendChild(mk);
  return s;
}

/* ================= sheets ================= */

/* One account, all of it. This used to be two sheets — the counters in one, the
   limits in another, and no way from either to the person's type because there
   were no types. It is one page now: what they are, what they may spend, what
   they have done, and the two buttons that change any of it.

   Every action here closes the sheet, re-reads, and reopens. Patching the row
   in place would be faster and would eventually show the owner a number the
   database does not hold — and on this screen that number is somebody's access
   or somebody's money. */
function openAccount(u) {
  const { sh, close } = sheet();
  const rec  = approved[u] || null;
  const urec = usage[u];
  const who  = obj(obj(urec).who);
  const sums = sumDays(urec, sinceKey());
  const now  = Date.now();
  const type = effectiveType(u, rec, now);
  const d    = derivedAllowance(u, rec, now);
  const live = obj(allow[u]);
  const isMe = u === OWNER_UID;

  // Reopen on the fresh read rather than trust what is on screen. Guarded on
  // `open` the way render() is: the owner can tap Back while a write is still
  // in flight, and a sheet reopening over the You tab he went back to is a
  // panel that will not go away.
  const again = async () => { close(); await reload(); if (open) openAccount(u); };

  sh.appendChild(el('div', 'eyebrow', 'Account'));
  sh.appendChild(el('h2', null, nameOf(u)));
  sh.appendChild(noteEl(obj(rec).email || 'no email on file'));
  sh.appendChild(el('div', 'adm-uid', u));

  const pill = el('div', 'chip-row');
  pill.style.marginTop = '10px';
  pill.appendChild(typePill({ u, rec, type }));
  if (!approved[u]) pill.appendChild(el('span', 'adm-flag off', 'removed'));
  if (live.blocked === true) pill.appendChild(el('span', 'adm-flag off', 'AI blocked'));
  sh.appendChild(pill);

  sh.appendChild(gap(statRow([
    [totalOf(sums) || '–', 'Events ' + rangeLabel()],
    [activeDays(urec, sinceKey()) || '–', 'Days active'],
    [AI_SPLIT.reduce((a, [k]) => a + (sums[k] || 0), 0) || '–', 'AI calls']
  ])));

  /* ---- the type ---- */
  sh.appendChild(subHead('Account type'));

  if (!approved[u]) {
    /* Counters without an access record: somebody who was removed. There is
       nothing to set a type ON — access/approved/{uid} does not exist, and the
       rules require `at` and `via` on that node before any child of it will
       validate, so the write would come back refused. Say so instead of
       offering a control that cannot work. */
    sh.appendChild(noteEl(
      'This account was removed, so it has no access record to carry a type. Its counters are still here because revoking deletes the approval and nothing else — add them back from People & access and the type control comes with it.'));
  } else if (isMe) {
    // See the OWNER / ADMIN block above applyType(). There is no control here
    // because there is no control anywhere, on purpose.
    sh.appendChild(noteEl(
      'This is the owner account, and its type is not something the app can set. The owner is OWNER_UID in firebase-config.js and the same uid written into the security rules — nothing stored in the database decides it, so no screen can change it. Making a new owner means editing that file, re-publishing the rules and deploying.'));
    // Asked at runtime rather than asserted in a comment.
    sh.appendChild(el('div', 'adm-uid', 'in-app elevation: ' + elevateToOwner().reason));
  } else {
    const chips = el('div', 'filter-row');
    SETTABLE_TYPES.forEach(t => {
      const b = el('button', 'chip' + (t === type ? ' on' : ''), TIERS[t].label);
      b.onclick = () => {
        if (t === type) return;
        // Sheets never stack: close this one before the confirm opens on top.
        close();
        confirmSheet({
          title: 'Make ' + (obj(rec).name || 'this account') + ' ' + TIERS[t].label + '?',
          body: typeBlurb(t),
          confirmLabel: 'Set ' + TIERS[t].label,
          danger: t === 'locked',
          onConfirm: async () => { await applyType(u, t); await again(); }
        });
      };
      chips.appendChild(b);
    });
    sh.appendChild(chips);
    sh.appendChild(noteEl(typeBlurb(type)));

    /* The trial controls follow the STORED type, not the effective one. An
       expired trial IS locked, and the one screen that should be able to give
       it another week is this one — gating these on the effective type would
       hide the +7 days button at exactly the moment it is wanted. */
    if (obj(rec).type === 'trial') sh.appendChild(trialControls(u, rec, close, again));
    if (type === 'custom') sh.appendChild(customLink(u, close));
    if (type === 'locked') sh.appendChild(unlockButton(u, close, again));
  }

  /* ---- what the Worker will actually enforce ---- */
  sh.appendChild(subHead('AI allowance'));
  const t2 = el('div', 'adm-table');
  [
    ['Photo a day',    limitText(live.photoPerDay)],
    ['Describe a day', limitText(live.textPerDay)],
    ['Monthly cap',    usdText(live.monthlyUsd)],
    ['Estimator',      live.blocked === true ? 'blocked by you' : live.on === true ? 'on' : 'not switched on']
  ].forEach(([k, v]) => {
    const row = el('div', 'adm-r');
    row.appendChild(el('div', 'adm-who', k));
    row.appendChild(el('div', 'set-row-v', v));
    t2.appendChild(row);
  });
  sh.appendChild(t2);
  sh.appendChild(noteEl(
    isMe ? 'Yours, and the type machinery never rewrites it. A dash is the Worker’s own default.'
         : 'What aiAllow/' + u.slice(0, 8) + '… holds right now, which is what the Worker reads. A dash is the Worker’s own default.'));

  // The one disagreement worth a button. Almost always: the type write landed
  // and the aiAllow write did not, or the rules that name these keys have not
  // been published, so nothing landed at all.
  if (d && isDrifted({ u, rec, derived: d, live })) {
    const warn = card('Out of step');
    warn.appendChild(noteEl(
      'This account is ' + typeLabel(type) + ', which means ' +
      limitText(d.photoPerDay) + ' photo / ' + limitText(d.textPerDay) + ' describe and ' +
      usdText(d.monthlyUsd) + (d.blocked ? ', estimator off' : '') +
      ' — but the node the Worker reads says something else. If the type was set before the new rules were published, this is what that looks like.'));
    // The STORED type, not the effective one: an expired trial reads as locked
    // here, and re-writing it as 'locked' would throw away the trial record
    // that made it so.
    const stored = SETTABLE_TYPES.includes(obj(rec).type) ? obj(rec).type : 'basic';
    const fix = el('button', 'btn btn-primary btn-block', 'Write the limits again');
    fix.onclick = async () => { await applyType(u, stored); await again(); };
    warn.appendChild(fix);
    sh.appendChild(warn);
  }

  if (!isMe) {
    const blocked = live.blocked === true;
    const blk = el('button', 'btn btn-ghost btn-block',
      blocked ? 'Give them the estimator back' : 'Turn their estimator off');
    blk.style.marginTop = '10px';
    // Sheets never stack: close this one before the confirm opens on top of it.
    blk.onclick = () => { close(); confirmSheet({
      title: blocked ? 'Give them the AI estimator back?' : 'Turn off their AI estimator?',
      body: blocked
        ? 'They’ll be able to photograph and describe meals again.'
        : 'They keep the whole app — they just lose photo and describe, and stop spending your Anthropic credit.',
      confirmLabel: blocked ? 'Turn back on' : 'Turn off',
      danger: !blocked,
      onConfirm: async () => {
        try { await setAiBlocked(u, !blocked); toast(blocked ? 'AI back on for them' : 'AI off for them'); }
        catch { toast('That didn’t save'); }
        await reload();
      }
    }); };
    sh.appendChild(blk);

  }

  /* Offered for the owner too, and that is not an oversight. Before this ship
     his own row sat in the AI allowance list and he could raise his own photo
     limit before a heavy week of testing the estimator; the reorganisation
     would otherwise have left the one account guaranteed to be ABLE to write an
     allowance as the one account with no screen to write it from. The type
     machinery still never touches his numbers — derivedAllowance returns null
     for him — so these are his and nothing overwrites them. */
  {
    const man = el('button', 'btn btn-ghost btn-block', 'Set the numbers by hand');
    man.style.marginTop = '8px';
    man.onclick = () => { close(); openAllowance(u); };
    sh.appendChild(man);
  }

  /* ---- who and what ---- */
  sh.appendChild(subHead('Device'));
  const meta = el('div', 'adm-table');
  [
    ['Last seen', ago(lastSeenOf(urec))],
    ['First seen', who.firstSeen ? fmtDate(todayKey(new Date(who.firstSeen))) : '–'],
    ['Platform', who.platform || '–'],
    ['Installed', who.standalone === true ? 'yes' : who.standalone === false ? 'no' : '–'],
    ['App version', who.version || '–'],
    ['Got in', obj(rec).via === 'invite' ? 'used a code' : approved[u] ? 'approved by you' : '–'],
    ['Subscription', obj(rec).subStatus || 'none']
  ].forEach(([k, v]) => {
    const row = el('div', 'adm-r');
    row.appendChild(el('div', 'adm-who', k));
    row.appendChild(el('div', 'set-row-v', v));
    meta.appendChild(row);
  });
  sh.appendChild(meta);
  sh.appendChild(noteEl('Subscription is a placeholder — nothing in Rack takes payment yet and nothing reads this field.'));

  /* ---- counters ---- */
  sh.appendChild(subHead('Counters ' + rangeLabel()));
  const t = el('div', 'adm-table');
  EVENTS.forEach(ev => {
    if (!sums[ev]) return;                    // a list of zeros tells you nothing
    const row = el('div', 'adm-r');
    row.appendChild(el('div', 'adm-who', ev));
    row.appendChild(el('div', 'adm-n', String(sums[ev])));
    t.appendChild(row);
  });
  if (!t.childNodes.length) t.appendChild(noteEl('No counters in this range.'));
  sh.appendChild(t);

  /* ---- the way out ---- */
  // The owner is the one account revoke() refuses outright (access.js:202).
  // Not offering the button is the same answer without the error.
  if (!isMe && approved[u]) {
    const rev = el('button', 'btn btn-danger btn-block', 'Remove this account');
    rev.style.marginTop = '16px';
    rev.onclick = () => { close(); confirmSheet({
      title: 'Remove ' + (obj(rec).name || 'this person') + '?',
      body: 'They lose access immediately. Their own log is not deleted — if you add them back it is all still there.',
      confirmLabel: 'Remove', danger: true,
      onConfirm: async () => {
        try { await revoke(u); toast('Removed'); }
        catch { toast('Couldn’t remove that account'); }
        reload();
      }
    }); };
    sh.appendChild(rev);
  }

  const done = el('button', 'btn btn-ghost btn-block', 'Done');
  done.style.marginTop = '8px';
  done.onclick = close;
  sh.appendChild(done);
}

// One sentence per type, in the same words on the chip row and in the confirm,
// so nobody has to guess what they just changed.
function typeBlurb(t) {
  const tier = TIERS[t] || TIERS.basic;
  if (t === 'locked') return 'The app stops opening for them and the estimator is switched off. Nothing they have logged is touched or deleted.';
  if (t === 'trial')  return 'Pro until the end date, then locked. ' + tier.aiPhotoPerDay + ' photo and ' + tier.aiTextPerDay + ' describe estimates a day while it runs.';
  if (t === 'custom') return 'Whatever you type in. Starts from Pro’s numbers and takes yours over the top of them.';
  if (t === 'owner')  return 'The account that runs this install.';
  return tier.aiPhotoPerDay + ' photo and ' + tier.aiTextPerDay + ' describe estimates a day' +
         (tier.monthlyUsd === null ? ', on the Worker’s own monthly cap.' : ', up to $' + tier.monthlyUsd + ' a month.');
}

/* The trial's end date, and the three ways to move it. A trial is the one type
   that changes on its own, so this is the one control that has to say when. */
function trialControls(u, rec, close, again) {
  const box = el('div', 'card');
  const now = Date.now();
  const end = typeof obj(rec).trialEndsAt === 'number' ? obj(rec).trialEndsAt : null;
  const left = trialDaysLeft(rec, now);
  const over = end !== null && end <= now;

  box.appendChild(noteEl(
    end === null
      ? 'No end date on this trial, so it does not expire. Set one below.'
      : over
        ? 'Ended ' + fmtDate(todayKey(new Date(end))) + '. Extending it from here starts the clock again from today.'
        : (left === 0 ? 'Ends today' : left + ' day' + (left === 1 ? '' : 's') + ' left') +
          ' — ends ' + fmtDate(todayKey(new Date(end))) + '.'));

  /* Extending measures from TODAY when the trial has already ended, and from
     the end date when it has not. Seven days added to a date three weeks gone
     is still three weeks gone: the write would succeed, the toast would say so,
     and the person would still be locked out. */
  const from = sign => {
    if (end === null) return trialEndFromNow(now, TRIAL_DAYS);
    return sign > 0 ? Math.max(end, now) : end;
  };

  const move = async days => {
    const next = Math.max(0, from(days) + days * 864e5);
    close();
    await applyType(u, 'trial', { trialEndsAt: next });
    await again();
  };

  const row = el('div', 'chip-row');
  row.style.marginTop = '8px';
  const plus = el('button', 'btn btn-ghost btn-sm', '+7 days');
  plus.onclick = () => move(7);
  const minus = el('button', 'btn btn-ghost btn-sm', '−7 days');
  minus.onclick = () => {
    const next = from(-1) - 7 * 864e5;
    // Shortening past today locks the account. That is a real thing to want and
    // a terrible thing to do by accident, so it asks first and nothing else does.
    if (next <= Date.now()) {
      close();
      confirmSheet({
        title: 'End the trial now?',
        body: 'Seven days earlier is already in the past, so this locks the account — the app stops opening for them. Nothing they have logged is touched.',
        confirmLabel: 'End it', danger: true,
        onConfirm: async () => { await applyType(u, 'trial', { trialEndsAt: Math.max(0, next) }); await again(); }
      });
      return;
    }
    move(-7);
  };
  row.append(plus, minus);
  box.appendChild(row);

  const f = el('div', 'field');
  f.style.marginTop = '10px';
  f.appendChild(el('label', null, 'Or pick the day it ends'));
  const di = el('input');
  di.type = 'date';
  if (end !== null) di.value = todayKey(new Date(end));
  di.onchange = async () => {
    if (!DAY_RE.test(di.value)) return;
    close();
    await applyType(u, 'trial', { trialEndsAt: parseKey(di.value).getTime() });
    await again();
  };
  f.appendChild(di);
  box.appendChild(f);
  return box;
}

function customLink(u, close) {
  const b = el('button', 'btn btn-primary btn-block', 'Edit this account’s numbers');
  b.style.marginTop = '10px';
  b.onclick = () => { close(); openAllowance(u); };
  return b;
}

function unlockButton(u, close, again) {
  const b = el('button', 'btn btn-primary btn-block', 'Unlock — back to Basic');
  b.style.marginTop = '10px';
  b.onclick = async () => { close(); await applyType(u, 'basic'); await again(); };
  return b;
}

/* The numbers, by hand. aiAllow/{uid}/photoPerDay and textPerDay are
   owner-writable only and ceilinged in the rules at 12 and 30, so a bad number
   here is refused by the database rather than accepted and clamped later. The
   Worker clamps again at the same two, and treats "not a number" as "use the
   default" — which is why leaving a box empty removes the key rather than
   writing a zero. Zero is a real value and it means none of that kind at all.

   This editor now has two modes and it says which one it is in:

     A CUSTOM account — the numbers ARE the account's definition. They are saved
     to customCaps on the access record and derived onto aiAllow in the same
     atomic write, so the type and the limits can never disagree.

     Anything else — the numbers are a straight manual override of aiAllow,
     exactly as this sheet has always worked. It is kept for two reasons: it is
     the only way to nudge an account that has no type at all, and it still
     works before the new rules are published, when every type write is refused.
     A later type change overwrites whatever is set here, and the sheet says so. */
function openAllowance(u) {
  const { sh, close } = sheet();
  const a    = obj(allow[u]);
  const rec  = approved[u] || null;
  const type = effectiveType(u, rec, Date.now());
  const isCustom = type === 'custom';
  const base = TIERS.custom;

  sh.appendChild(el('div', 'eyebrow', isCustom ? 'Custom limits' : 'AI allowance'));
  sh.appendChild(el('h2', null, nameOf(u)));
  sh.appendChild(noteEl(
    isCustom
      ? 'This account is Custom, so these numbers are what it is. An empty box falls back to ' + base.aiPhotoPerDay + ' / ' + base.aiTextPerDay + ' and $' + base.monthlyUsd + ' \u2014 the base Custom starts from \u2014 not to zero.'
      : 'Estimates a day, counted separately. Leave a box empty for the Worker\u2019s default. Zero photos means none of that kind at all.'));
  if (!isCustom && u !== OWNER_UID) sh.appendChild(noteEl(
    'A manual override on ' + typeLabel(type) + '. Setting this account\u2019s type later will write the type\u2019s own numbers over these.'));

  const pf = el('div', 'field');
  pf.style.marginTop = '14px';
  pf.appendChild(el('label', null, 'Photo estimates a day (max ' + RULE_MAX.photoPerDay + ')'));
  const pi = el('input');
  pi.type = 'number'; pi.inputMode = 'numeric'; pi.min = '0'; pi.max = String(RULE_MAX.photoPerDay);
  pi.placeholder = isCustom ? 'base (' + base.aiPhotoPerDay + ')' : 'default (' + TIERS.basic.aiPhotoPerDay + ')';
  pi.value = typeof a.photoPerDay === 'number' ? String(a.photoPerDay) : '';
  pf.appendChild(pi);
  sh.appendChild(pf);

  const tf = el('div', 'field');
  tf.appendChild(el('label', null, 'Describe estimates a day (max ' + RULE_MAX.textPerDay + ')'));
  const ti = el('input');
  ti.type = 'number'; ti.inputMode = 'numeric'; ti.min = '0'; ti.max = String(RULE_MAX.textPerDay);
  ti.placeholder = isCustom ? 'base (' + base.aiTextPerDay + ')' : 'default (' + TIERS.basic.aiTextPerDay + ')';
  ti.value = typeof a.textPerDay === 'number' ? String(a.textPerDay) : '';
  tf.appendChild(ti);
  sh.appendChild(tf);

  // The money. Separate from the counts because it is a different kind of
  // limit: the counts stop somebody using the estimator a lot, this stops them
  // costing a lot, and at 12 photos a day those are two weeks apart.
  const mf = el('div', 'field');
  mf.appendChild(el('label', null, 'Monthly spending cap (max $' + RULE_MAX.monthlyUsd + ')'));
  const mi = el('input');
  mi.type = 'number'; mi.inputMode = 'decimal'; mi.min = '0'; mi.max = String(RULE_MAX.monthlyUsd); mi.step = '0.25';
  mi.placeholder = isCustom ? 'base ($' + base.monthlyUsd + ')' : 'default (' + defaultCapText() + ')';
  mi.value = typeof a.monthlyUsd === 'number' ? String(a.monthlyUsd) : '';
  mf.appendChild(mi);
  sh.appendChild(mf);

  sh.appendChild(noteEl(
    'The cap is this account\u2019s alone \u2014 raising it gives nobody else a cent. It is also the limit that actually protects the money: a photo costs about $0.006, so ordinary use at 3 a day is roughly $0.55 a month, and somebody at the 12-photo ceiling would run about $2.20. Set the count and the cap together, or they hit whichever wall comes first.'));
  sh.appendChild(noteEl(
    'Everyone combined is capped too, and that number lives in GLOBAL_MONTHLY_USD_CAP in worker/wrangler.toml \u2014 no per-person cap can spend past it.'));

  const save = el('button', 'btn btn-primary btn-block', isCustom ? 'Save these limits' : 'Save allowance');
  save.style.marginTop = '14px';
  save.onclick = async () => {
    const p = parseLimit(pi.value), t = parseLimit(ti.value), m = parseUsd(mi.value);
    if (p === undefined || t === undefined) { toast('Whole numbers only'); return; }
    if (p !== null && (p < 0 || p > RULE_MAX.photoPerDay)) { toast('Photo tops out at ' + RULE_MAX.photoPerDay + ' a day'); return; }
    if (t !== null && (t < 0 || t > RULE_MAX.textPerDay))  { toast('Describe tops out at ' + RULE_MAX.textPerDay + ' a day'); return; }
    if (m === undefined) { toast('Cap must be a dollar amount'); return; }
    if (m !== null && (m < 0 || m > RULE_MAX.monthlyUsd)) { toast('The cap tops out at $' + RULE_MAX.monthlyUsd + ' a month'); return; }
    save.disabled = true;

    // A Custom account's numbers live on the access record, and aiAllow is
    // derived from them in the same atomic write. Everything else is the manual
    // override this sheet has always been.
    if (isCustom) {
      const ok = await applyType(u, 'custom',
        { customCaps: { photoPerDay: p, textPerDay: t, monthlyUsd: m } });
      if (!ok) { save.disabled = false; return; }
      close();
      reload();
      return;
    }

    try {
      await (p === null ? removeShared(P_AI + u + '/photoPerDay') : writeShared(P_AI + u + '/photoPerDay', p));
      await (t === null ? removeShared(P_AI + u + '/textPerDay')  : writeShared(P_AI + u + '/textPerDay', t));
      await (m === null ? removeShared(P_AI + u + '/monthlyUsd')  : writeShared(P_AI + u + '/monthlyUsd', m));
      toast('Allowance saved');
      close();
      reload();
    } catch {
      save.disabled = false;
      toast('That write was refused');
    }
  };
  sh.appendChild(save);

  // The switch that was already in People. Blocked beats `on`, and only the
  // owner can set it, which is what makes it a switch the other person cannot
  // flip back (access.js:117-124).
  if (u !== uid()) {
    const blocked = a.blocked === true;
    const blk = el('button', 'btn btn-ghost btn-block',
      blocked ? 'Give them the estimator back' : 'Turn their estimator off');
    blk.style.marginTop = '8px';
    // Sheets never stack: close this one before the confirm opens on top of it.
    blk.onclick = () => { close(); confirmSheet({
      title: blocked ? 'Give them the AI estimator back?' : 'Turn off their AI estimator?',
      body: blocked
        ? 'They’ll be able to photograph and describe meals again.'
        : 'They keep the whole app — they just lose photo and describe, and stop spending your Anthropic credit.',
      confirmLabel: blocked ? 'Turn back on' : 'Turn off',
      danger: !blocked,
      onConfirm: async () => {
        try { await setAiBlocked(u, !blocked); toast(blocked ? 'AI back on for them' : 'AI off for them'); }
        catch { toast('That didn’t save'); }
        reload();
      }
    }); };
    sh.appendChild(blk);
  }

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

// '' is "no override"; anything that isn't a whole number is an error, never a
// silent zero — a zero here takes the estimator away.
function parseLimit(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n !== Math.floor(n)) return undefined;
  return n;
}

// Money, so decimals are allowed where the counts refuse them. Rounded to the
// cent before it is written: the rules accept any number in range, and a cap of
// 1.9999999 would be a number nobody typed and nobody could read back.
function parseUsd(raw) {
  const s = String(raw || '').trim().replace(/^\$/, '');
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  return Number(n.toFixed(2));
}

/* ================= small pieces ================= */

function pageHead(eyebrow, title, onBack) {
  const hd = el('div', 'cal-hd');
  const left = el('div');
  const back = el('button', 'back-btn');
  back.innerHTML = '<span aria-hidden="true">&#8249;</span> Back';
  back.onclick = onBack;
  left.appendChild(back);
  left.appendChild(el('div', 'eyebrow', eyebrow));
  left.appendChild(el('h1', null, title));
  hd.appendChild(left);
  return hd;
}

function section(title) {
  const s = el('div', 'you-sec');
  s.appendChild(el('div', 'you-sec-t', title));
  return s;
}

// The account page is long enough to need its own headings. Same eyebrow the
// cards use, with the air above it that a new subject needs.
function subHead(title) {
  const h = el('div', 'eyebrow', title);
  h.style.marginTop = '18px';
  return h;
}

function card(title, sub) {
  const c = el('div', 'card');
  if (title) {
    const hd = el('div', 'card-hd');
    hd.appendChild(el('div', 'eyebrow', title));
    if (sub) hd.appendChild(el('div', 'card-sub num', sub));
    c.appendChild(hd);
  }
  return c;
}

function statRow(cells) {
  const row = el('div', 'stat-row');
  cells.forEach(([v, l]) => {
    const s = el('div', 'stat');
    s.appendChild(el('div', 'stat-val num', String(v)));
    s.appendChild(el('div', 'stat-lbl', l));
    row.appendChild(s);
  });
  return row;
}

function gap(node) { node.style.marginTop = '8px'; return node; }

function rangeLabel() { return range ? 'last ' + range + 'd' : 'all time'; }
