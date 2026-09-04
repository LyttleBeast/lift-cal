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

import { readShared, writeShared, removeShared, isOwner, uid, todayKey } from './store.js';
import { listRequests, listApproved, listInvites, approve, decline, revoke,
         createInvite, revokeInvite, deleteInvite, setAiBlocked } from './access.js';
import { EVENTS } from './usage.js';
import { quota, hasProxy } from './ai.js';
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
const FAMILIES = [
  ['Where people go', 'var(--p-blue)', [
    ['tabYou', 'You'], ['tabTrain', 'Train'], ['tabFuel', 'Fuel'],
    ['tabWeight', 'Weight'], ['tabSteps', 'Steps']
  ]],
  ['How food gets in', 'var(--p-yellow)', [
    ['barcode', 'Scan'], ['barcodeHit', 'Hit'], ['barcodeMiss', 'Miss'],
    ['foodManual', 'Manual'], ['foodLib', 'Library'], ['foodMeal', 'Meal'],
    ['foodCopy', 'Copy'], ['foodRepeat', 'Repeat'], ['foodPaste', 'Paste']
  ]],
  ['Training, weight and the rest', 'var(--p-green)', [
    ['workoutStart', 'Start'], ['workoutFinish', 'Finish'], ['setLogged', 'Sets'],
    ['routineStart', 'Routine'], ['exerciseCustom', 'Custom'],
    ['weighIn', 'Weigh-in'], ['waterLog', 'Water'], ['stepsSet', 'Steps']
  ]],
  ['The shell', 'var(--p-chrome)', [
    ['appOpen', 'Opens'], ['install', 'Installs']
  ]]
];

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

  wrap.appendChild(glance());
  wrap.appendChild(usageSection());
  wrap.appendChild(overTime());
  wrap.appendChild(perAccount());
  wrap.appendChild(allowanceSection());
  wrap.appendChild(peopleSection());
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

  /* ---- everything else ---- */
  FAMILIES.forEach(([title, color, keys]) => {
    const bars = keys.map(([k, label]) => ({ label, v: sums[k] || 0 }));
    const c = card(title);
    if (!bars.some(b => b.v > 0)) c.appendChild(noteEl('Nothing counted in this range.'));
    else c.appendChild(barChart(bars, { color, height: 148 }));
    s.appendChild(c);
  });

  /* ---- the exact numbers ---- */
  // Built from EVENTS itself, so a counter that no chart above happens to cover
  // still shows up here with its real number.
  const table = card('Every counter', rangeLabel());
  const t = el('div', 'adm-table');
  EVENTS.forEach(ev => {
    const row = el('div', 'adm-r');
    row.appendChild(el('div', 'adm-who', ev));
    row.appendChild(el('div', 'adm-n', String(sums[ev] || 0)));
    t.appendChild(row);
  });
  table.appendChild(t);
  s.appendChild(table);

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

/* ---------- 4. per account ---------- */
function perAccount() {
  const s = section('Per account');
  if (diag === 'rules') { s.appendChild(noteEl('Per-account counts need the same rules published.')); return s; }

  const since = sinceKey();
  const rows = accountUids().map(u => {
    const rec = usage[u];
    const sums = sumDays(rec, since);
    return {
      u, sums,
      total: totalOf(sums),
      days: activeDays(rec, since),
      last: lastSeenOf(rec),
      gone: !approved[u]
    };
  }).sort((a, b) => b.total - a.total || b.last - a.last);

  if (!rows.length) { s.appendChild(noteEl('No accounts yet.')); return s; }

  const list = el('div', 'set-list');
  rows.forEach(r => {
    const row = el('button', 'set-row-nav');
    const left = el('div', 'set-row-l', nameOf(r.u) + (r.gone ? ' · removed' : ''));
    // Name and email come from access/approved — there is deliberately neither
    // in the usage tree, so this is the only place they can come from.
    left.appendChild(el('div', 'adm-uid', obj(approved[r.u]).email || r.u.slice(0, 12) + '…'));
    left.appendChild(el('div', 'adm-uid',
      ago(r.last) + ' · ' + r.days + (r.days === 1 ? ' day' : ' days') + ' active ' + rangeLabel()));
    row.appendChild(left);
    row.appendChild(el('div', 'set-row-v', r.total ? String(r.total) : '–'));
    row.appendChild(el('div', 'set-row-x', '›'));
    row.onclick = () => openAccount(r.u);
    list.appendChild(row);
  });
  s.appendChild(list);
  s.appendChild(noteEl(
    'Tap an account for its own breakdown. A removed account keeps its counters — revoking deletes the access record and nothing else.'));
  return s;
}

/* ---------- 5. AI allowance ---------- */
function allowanceSection() {
  const s = section('AI allowance');
  s.appendChild(noteEl(
    'The Worker’s default is 3 photo and 3 describe estimates a day, each. A number set here replaces the default for that account alone; the rules refuse anything over 12 photo or 30 describe, and the Worker clamps it again at the same two numbers.'));

  const list = el('div', 'set-list');
  Object.keys(approved).forEach(u => {
    const a = obj(allow[u]);
    const row = el('button', 'set-row-nav');
    const left = el('div', 'set-row-l', nameOf(u));
    left.appendChild(el('div', 'adm-uid', u.slice(0, 12) + '…'));
    row.appendChild(left);
    if (a.blocked === true) row.appendChild(el('span', 'adm-flag off', 'blocked'));
    else if (a.on !== true) row.appendChild(el('span', 'adm-flag', 'off'));
    row.appendChild(el('div', 'set-row-v',
      limitText(a.photoPerDay) + ' / ' + limitText(a.textPerDay) + '  ' + usdText(a.monthlyUsd)));
    row.appendChild(el('div', 'set-row-x', '›'));
    row.onclick = () => openAllowance(u);
    list.appendChild(row);
  });
  if (!Object.keys(approved).length) list.appendChild(noteEl('Nobody has access yet.'));
  s.appendChild(list);
  s.appendChild(noteEl('Photo / describe per day, then that account\u2019s own monthly spending cap. A dash is the Worker\u2019s default.'));

  s.appendChild(quotaCard());
  return s;
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
    'Your own cap is ' + capText() + ', and it is the wall that actually protects the money. Every account has its own, set in AI allowance above; the Worker default applies to anyone you have not given a number.'));
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
    n.style.color = 'var(--miss)';
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

/* One account's own counters. Same numbers as the page above, filtered to one
   uid — this is the breakdown, not a second source. */
function openAccount(u) {
  const { sh, close } = sheet();
  const rec = usage[u];
  const who = obj(obj(rec).who);
  const sums = sumDays(rec, sinceKey());

  sh.appendChild(el('div', 'eyebrow', 'Account'));
  sh.appendChild(el('h2', null, nameOf(u)));
  sh.appendChild(noteEl(
    (obj(approved[u]).email || 'no email on file') + ' · ' + u));

  sh.appendChild(statRow([
    [totalOf(sums) || '–', 'Events ' + rangeLabel()],
    [activeDays(rec, sinceKey()) || '–', 'Days active'],
    [AI_SPLIT.reduce((a, [k]) => a + (sums[k] || 0), 0) || '–', 'AI calls']
  ]));

  const meta = el('div', 'adm-table');
  meta.style.marginTop = '14px';
  [
    ['Last seen', ago(lastSeenOf(rec))],
    ['First seen', who.firstSeen ? fmtDate(todayKey(new Date(who.firstSeen))) : '–'],
    ['Platform', who.platform || '–'],
    ['Installed', who.standalone === true ? 'yes' : who.standalone === false ? 'no' : '–'],
    ['App version', who.version || '–']
  ].forEach(([k, v]) => {
    const row = el('div', 'adm-r');
    row.appendChild(el('div', 'adm-who', k));
    row.appendChild(el('div', 'set-row-v', v));
    meta.appendChild(row);
  });
  sh.appendChild(meta);

  const t = el('div', 'adm-table');
  t.style.marginTop = '14px';
  EVENTS.forEach(ev => {
    if (!sums[ev]) return;                    // a list of zeros tells you nothing
    const row = el('div', 'adm-r');
    row.appendChild(el('div', 'adm-who', ev));
    row.appendChild(el('div', 'adm-n', String(sums[ev])));
    t.appendChild(row);
  });
  if (!t.childNodes.length) t.appendChild(noteEl('No counters in this range.'));
  sh.appendChild(t);

  const allowBtn = el('button', 'btn btn-ghost btn-block', 'AI allowance');
  allowBtn.style.marginTop = '14px';
  allowBtn.onclick = () => { close(); openAllowance(u); };
  sh.appendChild(allowBtn);

  const done = el('button', 'btn btn-ghost btn-block', 'Done');
  done.style.marginTop = '8px';
  done.onclick = close;
  sh.appendChild(done);
}

/* The allowance editor. aiAllow/{uid}/photoPerDay and textPerDay are
   owner-writable only and ceilinged in the rules at 12 and 30, so a bad number
   here is refused by the database rather than accepted and clamped later. The
   Worker clamps again at the same two, and treats "not a number" as "use the
   default" — which is why leaving a box empty removes the key rather than
   writing a zero. Zero is a real value and it means none of that kind at all. */
function openAllowance(u) {
  const { sh, close } = sheet();
  const a = obj(allow[u]);

  sh.appendChild(el('div', 'eyebrow', 'AI allowance'));
  sh.appendChild(el('h2', null, nameOf(u)));
  sh.appendChild(noteEl(
    'Estimates a day, counted separately. Leave a box empty for the Worker\u2019s default. Zero photos means none of that kind at all.'));

  const pf = el('div', 'field');
  pf.style.marginTop = '14px';
  pf.appendChild(el('label', null, 'Photo estimates a day (max 12)'));
  const pi = el('input');
  pi.type = 'number'; pi.inputMode = 'numeric'; pi.min = '0'; pi.max = '12';
  pi.placeholder = 'default (3)';
  pi.value = typeof a.photoPerDay === 'number' ? String(a.photoPerDay) : '';
  pf.appendChild(pi);
  sh.appendChild(pf);

  const tf = el('div', 'field');
  tf.appendChild(el('label', null, 'Describe estimates a day (max 30)'));
  const ti = el('input');
  ti.type = 'number'; ti.inputMode = 'numeric'; ti.min = '0'; ti.max = '30';
  ti.placeholder = 'default (3)';
  ti.value = typeof a.textPerDay === 'number' ? String(a.textPerDay) : '';
  tf.appendChild(ti);
  sh.appendChild(tf);

  // The money. Separate from the counts because it is a different kind of
  // limit: the counts stop somebody using the estimator a lot, this stops them
  // costing a lot, and at 12 photos a day those are two weeks apart.
  const mf = el('div', 'field');
  mf.appendChild(el('label', null, 'Monthly spending cap (max $10)'));
  const mi = el('input');
  mi.type = 'number'; mi.inputMode = 'decimal'; mi.min = '0'; mi.max = '10'; mi.step = '0.25';
  mi.placeholder = 'default (' + defaultCapText() + ')';
  mi.value = typeof a.monthlyUsd === 'number' ? String(a.monthlyUsd) : '';
  mf.appendChild(mi);
  sh.appendChild(mf);

  sh.appendChild(noteEl(
    'The cap is this account\u2019s alone \u2014 raising it gives nobody else a cent. It is also the limit that actually protects the money: a photo costs about $0.006, so ordinary use at 3 a day is roughly $0.55 a month, and somebody at the 12-photo ceiling would run about $2.20. Set the count and the cap together, or they hit whichever wall comes first.'));
  sh.appendChild(noteEl(
    'Everyone combined is capped too, and that number lives in GLOBAL_MONTHLY_USD_CAP in worker/wrangler.toml \u2014 no per-person cap can spend past it.'));

  const save = el('button', 'btn btn-primary btn-block', 'Save allowance');
  save.style.marginTop = '14px';
  save.onclick = async () => {
    const p = parseLimit(pi.value), t = parseLimit(ti.value), m = parseUsd(mi.value);
    if (p === undefined || t === undefined) { toast('Whole numbers only'); return; }
    if (p !== null && (p < 0 || p > 12)) { toast('Photo tops out at 12 a day'); return; }
    if (t !== null && (t < 0 || t > 30)) { toast('Describe tops out at 30 a day'); return; }
    if (m === undefined) { toast('Cap must be a dollar amount'); return; }
    if (m !== null && (m < 0 || m > 10)) { toast('The cap tops out at $10 a month'); return; }
    save.disabled = true;
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
