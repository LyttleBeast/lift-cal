// You — the tab the app opens on.
//
// Four tabs each answer one question well and none of them answers the first
// one. Train knows what you lifted, Fuel knows what you ate today, Weight knows
// what the scale said and Steps knows how far you walked — and at six in the
// morning the thing you actually want is "how did the week go, and what is my
// body doing about it". Landing on Fuel meant landing on an empty log for a day
// that hasn't happened yet. This tab is that first answer, and it is why the
// dock now has five buttons instead of four.
//
// It answers in pictures. The first cut of this screen was a wall of numbers —
// eight cells of averages with a delta under each — and it read like a
// spreadsheet. A number needs reading; a ring that is nearly closed, a line
// that slopes down, a bar that clears the dashed goal line, all land before
// the reader has decided to read anything. So every card leads with the shape
// and keeps at most one headline figure beside it, with an arrow for which way
// it moved. The prose under each is one or two sentences saying what the
// picture is of, never a second copy of the numbers in it.
//
// What it deliberately does not do: write. Nothing on this screen edits, logs
// or deletes anything. Every card is a read-out and every button either sends
// you to the tab that owns the number or opens the settings hub. That is not
// modesty, it is a safety property — this is the first thing that paints, often
// on a cold start with a half-warm mirror and no signal, and a screen that
// cannot write cannot corrupt anything while it is guessing.
//
// Why it re-derives everything from the database instead of importing food.js,
// workout.js, weight.js and steps.js and asking them: those four modules hold
// their own state, own live listeners, and — in weight.js's case — pull
// workout.js and its 250 ms session timer in behind them. Importing all four to
// read eight numbers would double the module graph sitting in the boot path and
// tie the opening screen to four tabs' initialisation order. store.read() is
// mirror-cached, so re-reading is nearly free on a warm device and correct on a
// cold one, and the coupling that remains is the shared math in tdee.js and
// analytics.js, which is where it belongs.
//
// The two numbers that must not be re-derived independently, because they are
// printed elsewhere too:
//
//   Maintenance follows Fuel's precedence exactly (food.js:565) — a pinned
//   targets.maint wins, otherwise the estimate. And refreshModel() is awaited
//   before it is read, or You would quote the legacy estimate while Weight
//   quotes the normalised one and the two would visibly disagree.
//
//   The thesis card's arithmetic is derived from its own total rather than
//   computed twice. Both maintenance paths round the RESULT to ten but not the
//   operands (tdee.js:128, weightmodel.js:374), so an independently computed
//   shift prints sums that don't close — "2,347 + 512 = 2,860" is off by five
//   and looks like a bug in the app rather than in the rounding.
//
// Never crashing matters more here than any single number being clever. Almost
// everything this file reads is legitimately absent on a real account: skipped
// onboarding writes only {name, createdAt} (onboarding.js:519-520), so there
// are no targets, no weigh-ins and no settings at all. weightStats().latest is
// null with nothing logged, dailyMeans() only contains days that have a
// weigh-in, topBy() is empty for a log with no barbell in it, and weight
// entries are keyed by weigh-in id rather than by date. Every one of those is
// guarded below, and build() runs into a detached node so a throw leaves the
// last good paint on screen instead of a blank box.
//
// Imports store.js, ui.js, analytics.js, tdee.js, water.js, usage.js,
// onboarding.js and the two new modules it owns the entry points to. Nothing
// imports back.

import { read, LS, todayKey, isOwner } from './store.js';
import { $, el, noteEl, trimNum, r1, parseKey, fmtDate, compact, fmtDuration } from './ui.js';
import { allSessions, exerciseIndex, filterByRange, groupSplit, topBy, weeklyVolume,
         lineChart, barChart, ring, sparkline, heatStrip, emptyChart, legend,
         groupColor } from './analytics.js';
import { weightStats, maintenance, trendRate, refreshModel, trendWeight, adjustedDays } from './tdee.js';
import { fmtWater } from './water.js';
import { isStandalone } from './usage.js';
import { openInstallGuide } from './onboarding.js';
import { openSettings, pickProfilePhoto } from './settings.js';
import { openAdmin, isAdminOpen } from './admin.js';

const DAY = 864e5;
// Exactly the two seven-day windows the week card compares, so the water reads
// cover both and no more. There is deliberately no water rollup node
// (water.js:10-13) — a day is a handful of entries, summed on read.
const WATER_DAYS = 14;
// Restated rather than imported: steps.js and water.js hold these as private
// module constants, and importing either module here would drag its listeners
// and its render loop into the boot path for one number.
const STEP_GOAL_DEFAULT  = 10000;
const WATER_GOAL_DEFAULT = 3785;

// One hue per subject, the same on every card that subject appears on, so a
// yellow line anywhere on this screen is food or the scale and a blue bar is
// water or training. Status colours (good / bad) are reserved for judgements
// and never stand in for a subject.
const C_FUEL   = 'var(--p-yellow)';
const C_WEIGHT = 'var(--p-yellow)';
const C_STEPS  = 'var(--p-white)';   // chrome reads as the muted "last week" stroke beside it
const C_WATER  = 'var(--p-blue)';
const C_TRAIN  = 'var(--p-blue)';
// The three macros wear the colours the Fuel tab's rows already gave them
// (food.js renderSummary), so a red segment is protein on both screens.
const C_PROT   = 'var(--p-red)';
const C_CARB   = 'var(--p-yellow)';
const C_FAT    = 'var(--p-blue)';

/* ================= STATE ================= */
let user       = null;
let goTab      = () => {};
let loaded     = false;   // the parallel reads have landed
let modelReady = false;   // refreshModel() has run over this account's weigh-ins

let profile   = null;
let targets   = null;     // absent entirely on a skipped-onboarding account
let summaries = {};
let entries   = {};
let stepSet   = null;
let stepDays  = {};
let waterSet  = null;
let onboard   = null;

let sessions  = null;     // null until allSessions() resolves — not the same as []
let waterDays = null;     // null until the day reads resolve; then { dateKey: ml }

/* ================= INIT ================= */
export async function initYou(ctx = {}) {
  user  = ctx.user || null;
  goTab = typeof ctx.go === 'function' ? ctx.go : () => {};

  // Synchronous, before the first await. #view-you is `active` in the markup,
  // so whatever is on screen at this moment is what somebody opening the app
  // sees. Every card knows the difference between "still reading" and "nothing
  // there", so the skeleton is the real screen with placeholders in it rather
  // than a separate thing to keep in sync.
  render();

  const [p, t, ds, we, ss, sd, ws, ob] = await Promise.all([
    read('profile',           null),
    read('food/targets',      null),
    read('food/daySummaries', null),
    read('weight/entries',    null),
    read('settings/steps',    null),
    read('steps',             null),
    read('settings/water',    null),
    read('onboarding',        null)
  ]);

  profile   = p  || null;
  targets   = t  || null;
  summaries = ds || {};
  entries   = we || {};
  stepSet   = ss || null;
  stepDays  = sd || {};
  waterSet  = ws || null;
  onboard   = ob || null;
  loaded    = true;
  render();

  // The fit is fingerprinted (weightmodel.js:210), so this costs nothing when
  // food.js has already run it over the same weigh-ins — which at boot it has.
  // The cards that quote a maintenance or rate number stay on placeholders
  // until it resolves rather than printing the legacy answer and swapping it.
  try { await refreshModel(entries); } catch {}
  modelReady = true;
  render();

  loadHeavy();
}

/* The two expensive reads, deliberately off the critical path: the whole
   workouts tree, and one node per day of water. Each re-renders when it lands,
   and each fails to an empty result rather than to a missing card. */
function loadHeavy() {
  allSessions()
    .then(list => { sessions = list || []; sessionsFp = fpOf(sessions); render(); })
    .catch(() => { sessions = []; sessionsFp = fpOf(sessions); render(); });

  const keys = keysBack(WATER_DAYS);
  Promise.all(keys.map(k => read('water/log/' + k, null)))
    .then(logs => {
      const by = {};
      keys.forEach((k, i) => {
        by[k] = Object.values(logs[i] || {}).reduce((s, e) => s + (Number(e && e.ml) || 0), 0);
      });
      waterDays = by;
      render();
    })
    .catch(() => { waterDays = {}; render(); });
}

/* Finishing a workout leaves this screen a session behind: app.js re-renders
   You on every switch to the tab, but a re-render of stale module state still
   draws the stale number. analytics.js caches the whole training tree and
   workout.js invalidates that cache when a session lands, so asking again costs
   nothing at all while the cache is warm and refetches exactly when it isn't.
   Guarded three ways — never before the first load, never twice at once, and it
   only repaints when the answer actually changed — because this is the app's
   opening screen and a render that can retrigger itself is the last thing it
   should have. */
let sessionsFp = '';
let refetching = false;

function fpOf(list) {
  return (list ? list.length : -1) + ':' + (list && list.length ? list[list.length - 1].startedAt : 0);
}

function refreshSessions() {
  if (refetching || sessions === null) return;
  refetching = true;
  allSessions()
    .then(list => {
      refetching = false;
      const next = list || [];
      const fp = fpOf(next);
      if (fp === sessionsFp) return;
      sessionsFp = fp;
      sessions = next;
      render();
    })
    .catch(() => { refetching = false; });
  refreshLogged();
}

/* The same problem as the sessions above, for the three nodes whose numbers
   this screen quotes alongside live module state. weightmodel.js refits on
   every weigh-in and trendWeight() reads that fit directly, so leaving `entries`
   frozen at boot prints yesterday's "Latest lb" directly above today's
   normalised trend; leaving `summaries` frozen lets the maintenance number here
   disagree with the one on Fuel, which is the single thing this file exists to
   prevent. read() answers from the localStorage mirror, so this is a local
   comparison and not a round trip per node per tab switch.

   The name, the step goal and the water goal are in here too. They do not move
   on their own, but they all move from the settings sheet — which opens over
   this tab, so the card being contradicted is still on screen behind it. The
   gear passes a callback for that case; this is what heals the number anyway on
   the next render if that callback ever stops being wired. */
let liveFp = '';
let reloading = false;

function refreshLogged() {
  if (reloading || !loaded) return;
  reloading = true;
  Promise.all([
    read('weight/entries',    null),
    read('food/targets',      null),
    read('food/daySummaries', null),
    read('steps',             null),
    read('profile',           null),
    read('settings/steps',    null),
    read('settings/water',    null)
  ])
    .then(async ([we, t, ds, sd, p, ss, ws]) => {
      reloading = false;
      const fp = JSON.stringify([we, t, ds, sd, p, ss, ws]);
      if (fp === liveFp) return;
      const first = !liveFp;
      liveFp = fp;
      if (first) return;              // the boot values; nothing has changed yet
      entries   = we || {};
      targets   = t  || null;
      summaries = ds || {};
      stepDays  = sd || {};
      // A failed read is a null, not an empty profile — keep what we had rather
      // than blanking the name on a flaky connection.
      if (p)  profile  = p;
      if (ss) stepSet  = ss;
      if (ws) waterSet = ws;
      try { await refreshModel(entries); } catch {}
      render();
    })
    .catch(() => { reloading = false; });
}

/* ================= SMALL HELPERS ================= */
function keysBack(n, endAgo = 0) {
  const out = [];
  for (let i = endAgo + n - 1; i >= endAgo; i--) out.push(todayKey(new Date(Date.now() - i * DAY)));
  return out;
}

// Coerces and drops anything that isn't a real number before it averages. One
// string or null in a node written by an older build is otherwise enough to
// print NaN on the screen the app opens on.
function mean(xs) {
  const v = xs.map(Number).filter(Number.isFinite);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

// Averages over the days in the window that actually have the thing, not over
// seven. Four logged days out of seven is a four-day average, not a week where
// you ate nothing on Thursday.
function meanBy(keys, pick) {
  return mean(keys.map(pick).filter(v => v != null && Number.isFinite(v)));
}

function fmtInt(v) { return Math.round(v).toLocaleString(); }

// The weekday's initial, for the axis under a seven-bar chart. One letter is
// all the room there is and all the reader needs: the bars are in order.
function dayLetter(k) { return 'SMTWTFS'[parseKey(k).getDay()]; }

// '…' while a read is still out, '–' once it has landed and there is genuinely
// nothing. The two look similar and mean completely different things — so
// `ready` has to be the readiness of the read this value came from, not the
// tab's. Sessions and water arrive well after the other eight, and printing
// their cells as '–' in the meantime tells a training user their week was empty.
function val(v, fmt, ready = loaded) {
  if (!ready) return '…';
  return v == null ? '–' : fmt(v);
}

function waterUnit() {
  // undefined on purpose: fmtWater's default parameter is water.js's own
  // display unit, which is the one every other water number on screen uses.
  return waterSet && waterSet.unit ? waterSet.unit : undefined;
}

function stepGoal()  { return stepSet  && stepSet.goal   > 0 ? stepSet.goal   : STEP_GOAL_DEFAULT; }
function waterGoal() { return waterSet && waterSet.goalMl > 0 ? waterSet.goalMl : WATER_GOAL_DEFAULT; }

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

function section(title) {
  const s = el('div', 'you-sec');
  s.appendChild(el('div', 'you-sec-t', title));
  return s;
}

function statRow(cells) {
  const row = el('div', 'stat-row');
  cells.forEach(([v, l, color]) => row.appendChild(statCell(v, l, null, color)));
  return row;
}

function statCell(v, label, deltaNode, color) {
  const s = el('div', 'stat');
  const n = el('div', 'stat-val num', String(v));
  if (color) n.style.color = color;
  s.appendChild(n);
  s.appendChild(el('div', 'stat-lbl', label));
  if (deltaNode) {
    const holder = el('div');
    holder.style.marginTop = '7px';
    holder.appendChild(deltaNode);
    s.appendChild(holder);
  }
  return s;
}

/* A delta is a judgement, not a subtraction. `.up` means it moved the way you
   would want it to — a trend weight that fell on a cut is `.up` — so the caller
   passes the class and nothing here ever reads the sign of the number. When it
   cannot tell which way is good, it says `flat` rather than guessing. */
function deltaEl(text, cls, unit) {
  const d = el('span', 'delta ' + (cls || 'flat'));
  d.appendChild(el('span', 'delta-v', text));
  if (unit) d.appendChild(el('span', 'delta-l', unit));
  return d;
}

/* The same thing with an arrow in front. The arrow IS the sign — it points the
   way the number went — and the class is still the judgement, so the two are
   set separately on purpose: a weight that fell on a cut is a down arrow
   painted green, and that is the whole point of drawing it this way. */
function arrowEl(diff, cls, text, unit) {
  const d = el('span', 'delta ' + (cls || 'flat'));
  d.appendChild(el('span', 'delta-a', diff > 0 ? '↑' : diff < 0 ? '↓' : '→'));
  d.appendChild(el('span', 'delta-v', text));
  if (unit) d.appendChild(el('span', 'delta-l', unit));
  return d;
}

/* One headline number, which way it moved against the week before, and the
   shape of the last fortnight under it — this week in colour, last week in
   grey, so the comparison the arrow is making is visible without a legend. */
function kpi({ label, now, prev, fmt, dfmt, unit, judge, series, color, ready = loaded }) {
  const t = el('div', 'kpi');
  t.appendChild(el('div', 'kpi-lbl', label));

  const v = el('div', 'kpi-val num');
  v.appendChild(el('span', null, val(now, fmt, ready)));
  if (unit && ready && now != null) v.appendChild(el('span', 'kpi-unit', unit));
  t.appendChild(v);

  let d;
  if (!ready) {
    d = deltaEl('…', 'flat', '');
  } else if (now == null || prev == null) {
    // No last week is not a delta of zero, and printing one would be a lie
    // about a week that never happened.
    d = deltaEl('–', 'flat', prev == null && now != null ? 'first week' : 'vs last week');
  } else {
    const diff = now - prev;
    d = arrowEl(diff, judge(now, prev), (dfmt || fmt)(Math.abs(diff)), 'vs last week');
  }
  t.appendChild(d);

  t.appendChild(sparkline(series || [], { color, accentFrom: 7 }));
  return t;
}

function goBtn(label, view) {
  const b = el('button', 'btn btn-ghost btn-block', label);
  b.style.marginTop = '12px';
  b.onclick = () => goTab(view);
  return b;
}

/* ================= ROOT ================= */
export function render() {
  const root = $('#view-you');
  if (!root) return;
  // The admin panel takes this element over the way stats.js takes over
  // #view-workout (admin.js:130-134). Repainting under it would pull the page
  // out from beneath the owner mid-tap — and the reads that land late are
  // exactly the ones that would do it. It restores the tab itself on close.
  if (isAdminOpen()) return;

  let wrap;
  try {
    wrap = build();
  } catch {
    // The screen the app opens on. If a derivation throws, keep the last good
    // paint rather than clearing to nothing, and only fall back to the bare
    // hero when there is nothing on screen to keep.
    if (root.firstChild) return;
    wrap = el('div', 'screen-pad');
    try { wrap.appendChild(hero()); } catch {}
    wrap.appendChild(noteEl('This summary couldn’t be put together. Every tab below still works — the numbers live there.'));
  }
  // Emptying the root collapses the page to nothing, and the browser clamps the
  // scroll position to the top on the way past. Four of the repaints here land
  // on their own schedule as the unawaited reads resolve, so without this a
  // person who starts reading a ten-card screen gets pulled back to the top
  // under their thumb. The first paint is left alone — there is nowhere to
  // return to, and forcing 0 there would fight a restored scroll position.
  const y = root.firstChild ? window.scrollY : null;
  root.innerHTML = '';
  root.appendChild(wrap);
  if (y) window.scrollTo(0, y);
  refreshSessions();
}

function build() {
  const wrap = el('div', 'screen-pad');

  wrap.appendChild(hero());
  wrap.appendChild(sinceLine());

  // One maintenance estimate for the whole paint. Calling it per card would
  // walk food/daySummaries three times and, worse, invites the two cards that
  // print it to drift apart.
  const est = modelReady ? maintenance(entries, summaries) : null;
  const maint = maintInfo(est);

  const s1 = section('This week');
  s1.appendChild(weekCard(maint));
  wrap.appendChild(s1);

  const s2 = section('Fuel');
  s2.appendChild(fuelCard(maint));
  wrap.appendChild(s2);

  const s3 = section('Body weight');
  s3.appendChild(weightCard(maint));
  wrap.appendChild(s3);

  const s4 = section('How it fits together');
  s4.appendChild(thesisCard(est, maint));
  wrap.appendChild(s4);

  const s5 = section('Training');
  s5.appendChild(trainingCard());
  wrap.appendChild(s5);

  const s6 = section('Steps and water');
  const pair = el('div', 'you-pair');
  pair.appendChild(stepsCard());
  pair.appendChild(waterCard());
  s6.appendChild(pair);
  s6.appendChild(noteEl('Each ring is the daily average over the days with a total, against the goal; the bars are the last seven days with the goal drawn across them. Steps deliberately don’t feed the calorie maths — that estimate already has your activity in it.'));
  wrap.appendChild(s6);

  const s7 = section('Consistency');
  s7.appendChild(consistencyCard());
  wrap.appendChild(s7);

  const showInstall = !isStandalone() && !LS.get('installDismissed', false);
  const owner = isOwner();
  if (showInstall || owner) {
    const s8 = section('App');
    if (showInstall) s8.appendChild(installCard());
    if (owner) s8.appendChild(adminRow());
    wrap.appendChild(s8);
  }

  return wrap;
}

/* ================= HERO ================= */
function nameOf() {
  if (profile && profile.name) return profile.name;
  if (user && user.displayName) return user.displayName;
  if (user && user.email) return user.email;
  return 'You';
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '–';
  const first = parts[0][0];
  const last  = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function hero() {
  const name = nameOf();
  const h = el('div', 'you-hero');

  // The avatar is the one control on this screen that leads to a write, and
  // the write still isn't here: settings.js owns the picker, the resize and
  // the profile merge, the same way the gear hands off to openSettings. A
  // photo is a small data URL on the profile node (AGENTS.md), so the mirror
  // has it on a cold start and the face paints with the name.
  const av = el('button', 'you-avatar');
  av.setAttribute('aria-label', 'Profile photo');
  if (profile && typeof profile.photo === 'string' && profile.photo.startsWith('data:image/')) {
    const img = el('img');
    img.src = profile.photo;
    img.alt = '';
    av.appendChild(img);
  } else {
    av.textContent = initials(name);
  }
  av.onclick = () => { if (loaded) pickProfilePhoto(() => { liveFp = ''; refreshLogged(); }); };
  h.appendChild(av);

  const mid = el('div');
  mid.appendChild(el('div', 'you-name', name));
  mid.appendChild(el('div', 'you-sub',
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })));
  h.appendChild(mid);

  // The app's only way into settings now — every control that used to live at
  // the bottom of the Weight tab is behind this.
  const gear = el('button', 'you-gear');
  gear.setAttribute('aria-label', 'Settings');
  gear.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/>' +
    '<path d="M19.5 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.5 1.5 0 0 0-2.6 1.1v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.5 1.5 0 0 0-2.6-1.1l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.5 1.5 0 0 0-1.1-2.6h-.2a1.9 1.9 0 1 1 0-3.8h.1a1.5 1.5 0 0 0 1.1-2.6l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.5 1.5 0 0 0 2.6-1.1v-.2a1.9 1.9 0 1 1 3.8 0v.1a1.5 1.5 0 0 0 2.6 1.1l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.5 1.5 0 0 0 1.1 2.6h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.5 1.5 0 0 0-1.4.9z"/>' +
    '</svg>';
  // The sheet opens over this tab, so a goal or a name changed inside it is
  // contradicting a card that is still on screen behind it. Re-read and repaint
  // the moment it lands rather than waiting for a tab switch.
  gear.onclick = () => openSettings(() => { liveFp = ''; refreshLogged(); });
  h.appendChild(gear);

  return h;
}

function sinceLine() {
  // profile.createdAt is the honest answer; the onboarding stamp is the fallback
  // for an account that skipped setup without typing a name, which writes no
  // profile at all.
  const at = (profile && profile.createdAt > 0) ? profile.createdAt
           : (onboard && onboard.at > 0)        ? onboard.at
           : null;
  if (!loaded) return el('div', 'you-since', 'Member since …');
  if (!at) return el('div', 'you-since', 'Welcome to Rack');
  const days = Math.max(0, Math.floor((Date.now() - at) / DAY));
  return el('div', 'you-since',
    'Member since ' + new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    (days > 0 ? '  ·  ' + days.toLocaleString() + ' day' + (days === 1 ? '' : 's') : ''));
}

/* ================= MAINTENANCE ================= */
/* Fuel's precedence, verbatim (food.js:565): a number you pinned always wins,
   otherwise the measured estimate, otherwise we genuinely don't know and say
   so. Two screens quoting different maintenance numbers is the single most
   confusing thing this app could do, so there is one rule and both follow it. */
function maintInfo(est) {
  if (targets && targets.maint > 0) return { cal: Math.round(targets.maint), pinned: true };
  if (est && est.tdee && Number.isFinite(est.tdee)) return { cal: est.tdee, pinned: false };
  return null;
}

/* ================= WEEK vs WEEK ================= */
function weighDayMap() {
  // weight/entries is keyed by weigh-in id (wt…), never by date, and several
  // readings a day is normal — so the day's mean is the day's number.
  const by = {};
  Object.values(entries || {}).forEach(e => {
    if (!e || !(e.lb > 0) || !Number.isFinite(e.t) || !(e.t > 0)) return;
    const k = todayKey(new Date(e.t));
    (by[k] = by[k] || []).push(e.lb);
  });
  const out = {};
  Object.keys(by).forEach(k => { out[k] = mean(by[k]); });
  return out;
}

function sessionsIn(keys) {
  if (!sessions) return null;
  const set = new Set(keys);
  return sessions.filter(s => s && set.has(s._date));
}

/* Which way is "better" for bodyweight. The goal the account stated at
   onboarding is written into targets.auto.rateWk whether or not auto targets
   are switched on, so that is the first answer; failing that, a calorie target
   that sits well below maintenance is a cut and one well above it is a gain.
   When neither is knowable the delta stays neutral rather than guessing. */
function goalDir(maint) {
  const a = targets && targets.auto;
  if (a && Number.isFinite(a.rateWk) && a.rateWk !== 0) return a.rateWk < 0 ? -1 : 1;
  if (maint && targets && targets.cal > 0) {
    if (targets.cal < maint.cal - 100) return -1;
    if (targets.cal > maint.cal + 100) return 1;
    return 0;
  }
  return null;
}

const higherBetter = (n, p) => n > p ? 'up' : n < p ? 'down' : 'flat';

/* Training volume by calendar week, the last `n` weeks, oldest first and with
   the empty weeks filled in as zero — a sparkline over only the weeks that had
   a session would hide the fortnight off, which is the thing it is there to show. */
function weeklySeries(n) {
  if (!sessions) return null;
  const by = {};
  weeklyVolume(sessions).forEach(w => { by[w.key] = w; });
  const sun = new Date();
  sun.setHours(12, 0, 0, 0);
  sun.setDate(sun.getDate() - sun.getDay());
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = todayKey(new Date(sun.getTime() - i * 7 * DAY));
    const w = by[k];
    out.push({ key: k, v: w ? w.volume : 0, n: w ? w.sessions : 0 });
  }
  return out;
}

function weekCard(maint) {
  const c = card('Against last week', 'rolling 7 days');

  const thisWk = keysBack(7, 0);
  const lastWk = keysBack(7, 7);
  const both   = keysBack(14);

  // Today is left out of both intake averages, for the reason tdee.js:75 gives:
  // a day you are still eating drags the mean down, and against a full week
  // behind it that reads as a deficit you did not run. The maintenance estimate
  // drops it the same way, so this keeps the two intake numbers on this screen
  // measuring the same days.
  const today   = todayKey();
  const kcal    = k => { const v = summaries[k]; return k !== today && v && v.cal > 0 ? v.cal : null; };
  const stepsOn = k => { const d = stepDays[k]; return d && d.steps > 0 ? d.steps : null; };
  const wmap    = weighDayMap();
  const weighOn = k => (wmap[k] != null ? wmap[k] : null);

  const sNow  = sessionsIn(thisWk);
  const sPrev = sessionsIn(lastWk);

  const anyOn = k => (kcal(k) != null) || (stepsOn(k) != null) || (weighOn(k) != null) ||
                     (sessions ? sessions.some(x => x && x._date === k) : false);
  const daysNow  = thisWk.filter(anyOn).length;
  const daysPrev = lastWk.filter(anyOn).length;

  // Four tiles of dashes is precisely the wall of nothing this screen exists to
  // avoid. With no fortnight behind it the card says so in one sentence instead.
  const anyWater = !!(waterDays && Object.keys(waterDays).some(k => waterDays[k] > 0));
  if (loaded && !daysNow && !daysPrev && !anyWater) {
    c.appendChild(noteEl('Nothing to compare yet. Log anything at all — a meal, a weigh-in, a workout, a step total — and a week from now this card is the first place you will see it move.'));
    return c;
  }

  const dir = goalDir(maint);
  const towardTarget = (n, p) => {
    if (!(targets && targets.cal > 0)) return 'flat';
    const dn = Math.abs(n - targets.cal), dp = Math.abs(p - targets.cal);
    return dn < dp - 20 ? 'up' : dn > dp + 20 ? 'down' : 'flat';
  };
  const towardGoal = (n, p) => {
    if (dir == null) return 'flat';
    if (dir === 0) return Math.abs(n - p) <= 0.5 ? 'up' : 'flat';
    return dir < 0 ? higherBetter(p, n) : higherBetter(n, p);
  };

  // Four subjects, one tile each. Protein, water and volume have their own
  // pictures further down; days logged is the consistency card. The training
  // tile's sparkline is calendar weeks rather than the fortnight of days the
  // other three draw — a day-by-day line of session volume is a comb, and the
  // shape worth seeing is whether the weeks are getting heavier.
  const weeks = weeklySeries(8);
  const grid = el('div', 'kpi-grid');
  grid.appendChild(kpi({
    label: 'Calories', unit: 'kcal / day',
    now: meanBy(thisWk, kcal), prev: meanBy(lastWk, kcal),
    fmt: fmtInt, judge: towardTarget, color: C_FUEL,
    series: both.map(kcal)
  }));
  grid.appendChild(kpi({
    label: 'Weight', unit: 'lb',
    now: meanBy(thisWk, weighOn), prev: meanBy(lastWk, weighOn),
    fmt: trimNum, judge: towardGoal, color: C_WEIGHT,
    series: both.map(weighOn)
  }));
  grid.appendChild(kpi({
    label: 'Training', unit: sNow && sNow.length === 1 ? 'session' : 'sessions',
    now: sNow ? sNow.length : null, prev: sPrev ? sPrev.length : null,
    fmt: String, judge: higherBetter, color: C_TRAIN,
    series: weeks ? weeks.map(w => w.v) : [], ready: sessions !== null
  }));
  grid.appendChild(kpi({
    label: 'Steps', unit: '/ day',
    now: meanBy(thisWk, stepsOn), prev: meanBy(lastWk, stepsOn),
    fmt: fmtInt, judge: higherBetter, color: C_STEPS,
    series: both.map(stepsOn)
  }));
  c.appendChild(grid);

  c.appendChild(noteEl(
    !loaded ? 'Pulling the last two weeks together…'
    : 'The arrow is which way it moved; green means the way you’d want, so weight falling on a cut is green. ' +
      'The line is the last two weeks, this week in colour — training’s is the last eight weeks of volume.'));
  return c;
}

/* ================= FUEL ================= */
function carbTarget() {
  if (!(targets && targets.cal > 0)) return null;
  return Math.max(0, Math.round((targets.cal - (targets.p || 0) * 4 - (targets.f || 0) * 9) / 4));
}

function fuelCard(maint) {
  const c = card('Against your targets', 'last 7 days');

  if (!loaded) {
    c.appendChild(noteEl('Reading your food log…'));
    return c;
  }
  // food.js survives an absent node by falling back to a module default
  // (food.js:49); a fresh read does not, and every number below would be NaN.
  if (!(targets && targets.cal > 0)) {
    c.appendChild(noteEl('No daily targets set yet. Setup writes a starting set from your height, weight and goal — if you skipped it, the gear at the top of this screen is where they live.'));
    const b = el('button', 'btn btn-ghost btn-block', 'Set your daily targets');
    b.style.marginTop = '12px';
    b.onclick = () => openSettings(() => { liveFp = ''; refreshLogged(); });
    c.appendChild(b);
    return c;
  }

  // Today is excluded here for the same reason as the week card and the
  // maintenance estimate: half a day of food averaged against whole ones is not
  // a smaller appetite, it is an unfinished day.
  const wk = keysBack(7, 1);
  const logged = wk.filter(k => summaries[k] && summaries[k].cal > 0);
  if (!logged.length) {
    c.appendChild(noteEl('Nothing logged in the last seven days. Your targets are ' +
      targets.cal.toLocaleString() + ' kcal and ' + Math.round(targets.p || 0) +
      ' g of protein — one logged day is enough to start drawing against them.'));
    c.appendChild(goBtn('Open Fuel', 'food'));
    return c;
  }

  const avg = key => mean(logged.map(k => summaries[k][key] || 0));
  const avgCal = avg('cal');

  // The headline is the week's average against the day's target, judged by
  // the goal: within a few percent is the point whichever way you are going;
  // over on a cut or under on a gain is a caution; the other side is neutral,
  // because a day under target on a cut is not a failure. Four rings of
  // percentages were the first cut of this card and read as four separate
  // verdicts — one number, one arrow, and the picture under it does the rest.
  const dir  = goalDir(maint);
  const diff = avgCal - targets.cal;
  const near = Math.abs(diff) <= targets.cal * 0.04;
  const cls  = near ? 'up'
    : dir == null || dir === 0 ? 'flat'
    : (dir < 0 && diff > 0) || (dir > 0 && diff < 0) ? 'warn' : 'flat';
  const hl = el('div', 'headline');
  hl.appendChild(el('span', 'headline-v num', fmtInt(avgCal)));
  hl.appendChild(el('span', 'headline-u', 'kcal / day'));
  hl.appendChild(arrowEl(diff, cls, fmtInt(Math.abs(diff)), near ? 'on target' : diff < 0 ? 'under target' : 'over target'));
  c.appendChild(hl);

  // Each day is one bar of calories, split into what the calories were made
  // of, so a 2,400 day of mostly carbs and a 2,400 day of mostly protein stop
  // looking like the same day. The macro kilocalories are scaled to the day's
  // logged total rather than summed on their own: an estimated entry's macros
  // rarely multiply out to exactly its calories, and the bar's height has to
  // be the number the Fuel tab prints. Today is drawn but faded — it isn't over.
  const today = todayKey();
  const bars = keysBack(7).map(k => {
    const s = summaries[k];
    const cal = s && s.cal > 0 ? s.cal : 0;
    const raw = [[(s && s.p) || 0, 4, C_PROT], [(s && s.c) || 0, 4, C_CARB], [(s && s.f) || 0, 9, C_FAT]];
    const sum = raw.reduce((a, [g, per]) => a + g * per, 0);
    const parts = sum > 0 ? raw.map(([g, per, color]) => ({ v: g * per / sum * cal, color })) : null;
    return { label: dayLetter(k), v: cal, parts, dim: k === today };
  });
  // Maintenance is the second line only when it is somewhere else than the
  // target — the two on top of each other is one line with two labels.
  const lines = [];
  if (maint && Math.abs(maint.cal - targets.cal) > targets.cal * 0.03) {
    lines.push({ v: maint.cal, label: 'maint', at: 'start' });
  }
  const chart = el('div');
  chart.style.marginTop = '10px';
  chart.appendChild(barChart(bars, { height: 128, color: C_FUEL, target: targets.cal, targetLabel: 'target', lines, showValues: false }));
  c.appendChild(chart);
  c.appendChild(legendRow([['protein', C_PROT], ['carbs', C_CARB], ['fat', C_FAT]]));

  // The same three, as the week's average against each target. Protein is a
  // floor and reads green from 95% up; carbs and fat are a band around the
  // number, and anything outside it stays the subject's colour rather than
  // going red.
  const rows = [
    ['Protein', avg('p'), Math.round(targets.p || 0), C_PROT, null],
    ['Carbs',   avg('c'), carbTarget(),               C_CARB, 110],
    ['Fat',     avg('f'), Math.round(targets.f || 0), C_FAT,  110]
  ];
  const list = el('div', 'macro-rows');
  rows.forEach(([name, v, tgt, color, band]) => {
    const pct = tgt > 0 && v != null ? Math.round(v / tgt * 100) : null;
    const good = pct != null && (band == null ? pct >= 95 : (pct >= 200 - band && pct <= band));
    const row = el('div', 'vol-row');
    row.appendChild(el('div', 'vol-name', name));
    const track = el('div', 'vol-track');
    const fill = el('div', 'vol-fill');
    fill.style.width = Math.min(100, pct || 0) + '%';
    fill.style.background = color;
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('div', 'vol-val num', tgt > 0 && v != null ? Math.round(v) + ' / ' + tgt + ' g' : '–'));
    const badge = el('div', 'macro-pct num' + (good ? ' good' : ''), pct != null ? pct + '%' : '–');
    row.appendChild(badge);
    list.appendChild(row);
  });
  c.appendChild(list);

  c.appendChild(noteEl('Averaged over the ' + logged.length + ' of the last 7 days you logged food, today left out because it isn’t over. ' +
    'The dashed line is your daily target' + (lines.length ? ', the dotted one your maintenance' : '') +
    '. Carbs are the remainder — calories left after protein and fat, never a number you set.'));
  return c;
}

/* A one-line legend for a chart with more than one series, so no colour is
   ever the only thing that says which is which. */
function legendRow(items) {
  const wrap = el('div', 'legend legend-inline');
  items.forEach(([label, color, shape]) => {
    const it = el('div', 'legend-item');
    const sw = el('i', shape ? 'sw-' + shape : null);
    sw.style.background = color;
    it.appendChild(sw);
    it.appendChild(el('span', 'legend-lbl', label));
    wrap.appendChild(it);
  });
  return wrap;
}

/* ================= WEIGHT ================= */
/* weightStats().latest is simply the last row after a sort, so an entry that
   lost its `lb` — a half-written offline queue, a hand-edited node — comes back
   as the latest weigh-in and prints NaN. Newest VALID reading, the same test
   food.js uses (food.js:155-160). */
function latestWeighIn() {
  let best = null;
  Object.values(entries || {}).forEach(e => {
    if (!e || !(e.lb > 0) || !Number.isFinite(e.t) || !(e.t > 0)) return;
    if (!best || e.t > best.t) best = e;
  });
  return best;
}

function weightCard(maint) {
  const c = card('Body weight', 'last 45 days');

  if (!loaded) {
    c.appendChild(noteEl('Reading your weigh-ins…'));
    return c;
  }

  const s = weightStats(entries);
  const latest = latestWeighIn();
  // Null with zero weigh-ins (tdee.js:63), which is exactly where a skipped
  // setup leaves an account.
  if (!latest) {
    c.appendChild(noteEl('No weigh-ins yet. One number today is all it takes — after a couple of weeks of them Rack can measure what you burn instead of estimating it, and the targets, the trend and the maintenance number on this screen all start working.'));
    c.appendChild(goBtn('Log your first weigh-in', 'weight'));
    return c;
  }

  const tr = modelReady ? trendRate(entries) : null;
  const rate = tr && Number.isFinite(tr.rateWk) ? tr.rateWk : null;

  // Losing is not good and gaining is not bad — it depends entirely on what the
  // account said it was doing, which is what goalDir() answers. Reading the sign
  // here would paint a deliberate bulk in the warning colour on the tab the app
  // opens on. When the direction is unknowable the arrow stays uncoloured.
  const dir = goalDir(maint);
  const judge = v => (dir == null) ? 'flat'
    : dir === 0 ? (Math.abs(v) <= 0.5 ? 'up' : 'warn')
    : dir < 0   ? (v <= 0 ? 'up' : 'warn')
    :             (v >= 0 ? 'up' : 'warn');

  // The newest reading is the headline; the rate and the month are its arrows.
  const hl = el('div', 'headline');
  hl.appendChild(el('span', 'headline-v num', trimNum(latest.lb)));
  hl.appendChild(el('span', 'headline-u', 'lb'));
  if (!modelReady)       hl.appendChild(deltaEl('…', 'flat', '/ week'));
  else if (rate != null) hl.appendChild(arrowEl(rate, judge(rate), r1(Math.abs(rate)) + ' lb', '/ week' + (tr.model ? ' ✓' : '')));
  else                   hl.appendChild(deltaEl('–', 'flat', '/ week'));
  if (Number.isFinite(s.change30)) {
    hl.appendChild(arrowEl(s.change30, judge(s.change30), r1(Math.abs(s.change30)) + ' lb', '30 days'));
  }
  c.appendChild(hl);

  // Day means, not the fitted line: this is the same series the Weight tab
  // charts raw, and it is the one that needs no explaining.
  const since = Date.now() - 45 * DAY;
  const pts = (s.days || [])
    .filter(p => p && Number.isFinite(p.lb) && parseKey(p.d).getTime() > since)
    .map(p => ({ t: parseKey(p.d).getTime(), v: p.lb }));

  // Every raw reading behind the day means, and the normalised trend through
  // them: the three together say what one line cannot — how noisy the scale
  // is, and what the noise averages out to.
  const scatter = Object.values(entries || {})
    .filter(e => e && e.lb > 0 && Number.isFinite(e.t) && e.t > since)
    .map(e => ({ t: e.t, v: e.lb }));
  // adjustedDays() is the day means with the food-and-water correction
  // applied, not a fitted line — on a quiet fortnight it sits on top of the
  // raw means, and a dashed copy of the yellow line says nothing. The trend
  // drawn here is an exponential average over those corrected days (a
  // quarter of each new day), which is the smooth shape the eye was trying
  // to find in the wobble; the number it ends on is close to, but not the
  // same as, trendWeight(), which is why that one is printed separately.
  const adj = modelReady ? adjustedDays() : null;
  const src = (adj && adj.length >= 2 ? adj : (s.days || []))
    .filter(p => p && Number.isFinite(p.lb))
    .map(p => ({ t: parseKey(p.d).getTime(), v: p.lb }))
    .sort((a, b) => a.t - b.t);
  const trend = [];
  let ema = null;
  src.forEach(p => {
    ema = ema == null ? p.v : ema + (p.v - ema) * 0.25;
    if (p.t > since) trend.push({ t: p.t, v: ema });
  });

  const chart = el('div');
  chart.style.marginTop = '12px';
  chart.appendChild(pts.length >= 2
    ? lineChart(pts, { color: C_WEIGHT, height: 148, unit: 'lb', dots: pts.length < 30, markMax: false,
                       scatter: scatter.length > pts.length ? scatter : null,
                       line2: trend.length >= 2 ? trend : null, yLabels: true })
    : emptyChart('Two days of weigh-ins draw the first line'));
  c.appendChild(chart);
  if (pts.length >= 2) {
    const items = [['daily average', C_WEIGHT]];
    if (trend.length >= 2) items.push(['trend', 'var(--chalk)', 'dash']);
    if (scatter.length > pts.length) items.push(['each weigh-in', 'var(--steel)', 'dot']);
    c.appendChild(legendRow(items));
  }

  const tw = modelReady ? trendWeight() : null;
  // Three more numbers, because a line has no scale worth reading without
  // them: where the trend sits today, the week's average, and how far the
  // window swung from its lowest day to its highest, so a 3 lb wobble can
  // be told from a 3 lb loss.
  if (pts.length >= 2) {
    const lows = pts.map(p => p.v);
    const lo = Math.min(...lows), hi = Math.max(...lows);
    const sr = statRow([
      [tw != null && Number.isFinite(tw) ? trimNum(tw) : '–', 'Trend today'],
      [Number.isFinite(s.avg7) ? trimNum(s.avg7) : '–', '7-day avg'],
      [trimNum(hi - lo), 'lb swing']
    ]);
    sr.style.marginTop = '12px';
    c.appendChild(sr);
  }
  if (tw != null && Number.isFinite(tw)) {
    c.appendChild(noteEl('The yellow line is the daily average of your weigh-ins, the dashed one the normalised trend — every reading corrected for what food and water were in you when you stood on the scale — and the dots are each time you weighed in.'));
  } else if (pts.length >= 2) {
    c.appendChild(noteEl('The daily average of every weigh-in. Weighing twice in a day is what lets Rack learn how much of a reading is breakfast.'));
  } else {
    c.appendChild(noteEl('One reading is a data point. A handful across a fortnight is a trend — and the trend is what the rate, the targets and your maintenance number are all built on.'));
  }
  return c;
}

/* ================= THE THESIS ================= */
/* The one card that says out loud how the four tabs are connected, by printing
   the arithmetic instead of asserting the answer. The shift is derived FROM the
   total rather than computed alongside it: both maintenance paths round the
   result to ten and neither rounds its operands, so a shift worked out
   independently gives sums that don't add up on screen. */
function thesisCard(est, maint) {
  const c = card('How it fits together');

  if (!loaded || !modelReady) {
    c.appendChild(noteEl('Working out where your numbers sit…'));
    return c;
  }

  const line = (op, big, why, eq) => {
    const row = el('div', 'thesis-line' + (eq ? ' thesis-eq' : ''));
    row.appendChild(el('span', 'thesis-op', op));
    row.appendChild(el('b', null, big));
    row.appendChild(el('span', null, why));
    return row;
  };

  const avg = est && Number.isFinite(est.avgIntake) ? Math.round(est.avgIntake) : null;

  if (!maint) {
    const need = est && est.need && est.need.length ? est.need.join(' and ') : 'a little more logging';
    c.appendChild(noteEl('This is where your intake, your scale and your maintenance number meet — and it needs ' +
      need + ' before it can show its working. Nothing here has to be set up; it arrives on its own.'));
    return c;
  }

  if (avg == null) {
    // A pinned maintenance number with nothing logged to weigh it against.
    c.appendChild(noteEl('Maintenance is pinned at ' + maint.cal.toLocaleString() +
      ' kcal. Log a week of food beside your weigh-ins and this card will check that number against what your body actually did with it.'));
    return c;
  }

  // Derived from the total, never computed alongside it — that is what makes
  // the three lines add up on screen.
  const shift = Math.abs(maint.cal - avg);
  const up    = maint.cal >= avg;
  const rate  = est && Number.isFinite(est.rateWk) ? est.rateWk : null;

  // Never "the number you pinned": setup writes a Mifflin-St Jeor estimate into
  // food/targets.maint for everybody who did not skip it (onboarding.js:507), so
  // a fixed number is the normal state and telling most people they chose it is
  // simply false. Nothing in the schema records who wrote it, so the copy stays
  // authorship-neutral and talks about the number instead of the author.
  const why = maint.pinned
    ? (up ? 'the gap between that and the maintenance number Rack is holding'
          : 'how far over that fixed maintenance number this sits')
    : rate == null || Math.abs(rate) < 0.05
      ? 'your weight held steady, so there is almost nothing to correct for'
      : up ? 'the deficit your scale says you were in, at ' + r1(Math.abs(rate)) + ' lb a week down'
           : 'the surplus your scale says you were in, at ' + r1(Math.abs(rate)) + ' lb a week up';

  const thesis = el('div', 'thesis');
  thesis.appendChild(line('', avg.toLocaleString(),
    'eaten per day, averaged over ' + (est.days || 0) + ' logged day' + (est.days === 1 ? '' : 's')));
  thesis.appendChild(line(up ? '+' : '−', shift.toLocaleString(), why));
  thesis.appendChild(line('=', maint.cal.toLocaleString(),
    maint.pinned ? 'maintenance — fixed, not measured' : 'maintenance — what holds you steady', true));
  c.appendChild(thesis);

  c.appendChild(noteEl(maint.pinned
    ? 'This maintenance number is fixed rather than measured — either setup worked it out from your height, weight, age and activity, or you typed it. Rack uses it everywhere instead of its own estimate until it is cleared. Clear the maintenance box under Daily targets in the gear and it goes back to measuring from your own data, which after a couple of weeks is the better number.'
    : 'Nobody typed any of this. Roughly 3,500 kcal is a pound, so a pound a week is 500 a day — average what you ate, correct it by which way the scale went, and what is left is what your body spends. Fuel draws the cut / maintain / gain marks off this same number.'));

  if (!maint.pinned && est && est.se) {
    const ci = Math.round(1.96 * est.se / 5) * 5;
    c.appendChild(noteEl('± ' + ci.toLocaleString() + ' kcal — the interval is the honest part. A single number invites chasing noise.'));
  }
  return c;
}

/* ================= TRAINING ================= */
function trainingCard() {
  const c = card('Training', 'last 30 days');

  if (sessions === null) {
    c.appendChild(noteEl('Reading your training history…'));
    return c;
  }
  if (!sessions.length) {
    c.appendChild(noteEl('Nothing logged yet. Finish one session and the charts, the muscle split and every personal record start deriving themselves — none of it is stored, so editing a session later can never leave a stale record behind.'));
    c.appendChild(goBtn('Start a workout', 'workout'));
    return c;
  }

  const inRange = filterByRange(sessions, 30);

  // The month in three numbers first, because "how much did I train" has
  // three honest answers — how often, how much, how long — and the pictures
  // under them each show one of the three over time.
  const vol = inRange.reduce((a, s) => a + (s.volume || 0), 0);
  const dur = mean(inRange.map(s => s.durationSec).filter(v => v > 0));
  c.appendChild(statRow([
    [inRange.length, inRange.length === 1 ? 'Session' : 'Sessions'],
    [vol > 0 ? compact(vol) : '–', 'lb lifted'],
    [dur != null ? fmtDuration(Math.round(dur)) : '–', 'Avg session']
  ]));

  // The weeks: is the work getting heavier. Calendar weeks, Sunday-first, the
  // same buckets the Train stats use, with the empty ones left standing and
  // the number of sessions written over each bar — three light sessions and
  // one heavy one can add up to the same volume, and that is worth knowing.
  const weeks = weeklySeries(8) || [];
  if (weeks.some(w => w.v > 0)) {
    c.appendChild(el('div', 'chart-sub', 'Volume by week · 8 weeks'));
    c.appendChild(barChart(
      weeks.map((w, i) => ({ label: fmtDate(w.key), v: w.v, note: w.n ? w.n + '×' : '', dim: i === weeks.length - 1 })),
      { height: 118, color: C_TRAIN, showValues: false }));
  }

  // Where the month's sets went, as one bar split by muscle group. The
  // segments are in the plate order the rest of the app uses, so the colours
  // mean the same thing they mean on the calendar.
  const split = groupSplit(inRange);
  if (split.length) {
    const totalSets = split.reduce((a, x) => a + x.sets, 0);
    c.appendChild(el('div', 'chart-sub', 'Working sets by muscle · ' + totalSets + ' sets'));
    const bar = el('div', 'split-bar');
    split.forEach(x => {
      const seg = el('div', 'split-seg');
      seg.style.flex = String(x.sets);
      seg.style.background = groupColor(x.group);
      bar.appendChild(seg);
    });
    c.appendChild(bar);
    c.appendChild(legendGrid(split.map(x => ({
      label: groupLabel(x.group),
      color: groupColor(x.group),
      value: Math.round(x.sets / totalSets * 100) + '%'
    }))));
  } else {
    c.appendChild(emptyChart('No working sets in the last 30 days'));
  }

  // topBy filters on e[key] > 0 and e1rm returns 0 without a weight
  // (analytics.js:59, 311), so a log made entirely of bodyweight work leaves
  // this empty rather than short. Each lift carries a bar scaled to the
  // strongest one, so the list has a shape and not just a column of numbers.
  const index = exerciseIndex(sessions);
  const best = topBy(index, 'bestE1rm', 3);
  c.appendChild(el('div', 'chart-sub', 'Strongest lifts · all time'));
  if (!best.length) {
    c.appendChild(noteEl('Nothing to rank yet — an estimated 1RM needs a weight on the bar, so bodyweight work doesn’t produce one.'));
  } else {
    const top = best[0].bestE1rm;
    best.forEach(e => {
      const row = el('div', 'pb-row');
      const body = el('div', 'pb-body');
      body.appendChild(el('div', 'pb-lbl', e.name));
      body.appendChild(el('div', 'pb-sub', e.bestE1rmSet
        ? e.bestE1rmSet.w + ' × ' + e.bestE1rmSet.r + '  ·  ' + (e.bestE1rmDate ? fmtDate(e.bestE1rmDate) : '')
        : e.sessions + ' sessions'));
      const track = el('div', 'pb-track');
      const fill = el('div', 'pb-fill');
      fill.style.width = Math.round(e.bestE1rm / top * 100) + '%';
      fill.style.background = groupColor(e.group);
      track.appendChild(fill);
      body.appendChild(track);
      row.appendChild(body);
      row.appendChild(el('div', 'pb-val num', Math.round(e.bestE1rm) + ' lb'));
      c.appendChild(row);
    });
  }
  c.appendChild(noteEl('The numbers and the split are the last 30 days, ' + inRange.length + ' session' + (inRange.length === 1 ? '' : 's') +
    '; the bars are total volume by calendar week, this week faded because it isn’t over. Lifts are ranked by estimated 1RM from your best working set — warm-ups never count.'));
  return c;
}

/* The shared legend is a single column, which is the right shape beside a
   donut and the wrong one under a full-width bar: six rows of one word each.
   Two columns, the same items. */
function legendGrid(items) {
  const l = legend(items);
  l.classList.add('legend-grid');
  return l;
}

// The six group keys are already their own labels once capitalised, which is
// why GROUPS is not imported for one word apiece.
function groupLabel(g) {
  const k = String(g || '');
  return k ? k.charAt(0).toUpperCase() + k.slice(1) : 'Other';
}

/* ================= STEPS AND WATER ================= */
/* The two cards share a shape because they are the same question — how did
   the week go against a daily goal — asked of two different logs. A ring for
   the average against the goal, seven bars with the goal drawn across them,
   and a count of the days that cleared it. They sit side by side, which is why
   every number in them is small: there is half a screen each. */
function goalCard(title, o) {
  const c = card(title, 'last 7 days');
  if (o.loading) {
    c.appendChild(noteEl(o.loading));
    return c;
  }
  if (!o.logged.length) {
    c.appendChild(noteEl(o.none));
    const b = goBtn(o.goLabel, o.view);
    b.style.marginTop = '8px';
    c.appendChild(b);
    return c;
  }

  const frac = o.avg / o.goal;
  const cell = el('div', 'ring-cell');
  cell.appendChild(ring(frac, {
    size: 84, thickness: 8, color: frac >= 1 ? 'var(--good)' : o.color,
    top: Math.round(frac * 100) + '%', sub: 'of goal'
  }));
  cell.appendChild(el('div', 'ring-of num', o.fmt(o.avg) + ' a day'));
  c.appendChild(cell);

  const bars = el('div');
  bars.style.marginTop = '8px';
  // The days that cleared the goal are drawn in the good colour and the rest
  // in the subject's, so "3 of 6 at goal" is visible in the bars before it is
  // read under them.
  bars.appendChild(barChart(o.bars.map(b => ({ ...b, color: b.v >= o.goal ? 'var(--good)' : o.color })),
    { width: 150, height: 96, color: o.color, target: o.goal, showValues: false }));
  c.appendChild(bars);

  c.appendChild(el('div', 'ring-lbl', o.hit + ' of ' + o.logged.length + ' days at goal'));

  // Two small numbers the ring and the bars cannot carry on their own: the
  // best day, and the week's total.
  if (o.stats && o.stats.length) {
    const row = el('div', 'mini-stats');
    o.stats.forEach(([v, l]) => {
      const cell = el('div', 'mini-stat');
      cell.appendChild(el('div', 'mini-stat-v num', String(v)));
      cell.appendChild(el('div', 'mini-stat-l', l));
      row.appendChild(cell);
    });
    c.appendChild(row);
  }
  return c;
}

function stepsCard() {
  if (!loaded) return goalCard('Steps', { loading: 'Reading your step log…' });

  const wk = keysBack(7);
  const g = stepGoal();
  const today = todayKey();
  const logged = wk.filter(k => stepDays[k] && stepDays[k].steps > 0);
  return goalCard('Steps', {
    logged, goal: g, color: C_STEPS,
    avg: logged.length ? mean(logged.map(k => stepDays[k].steps)) : 0,
    hit: logged.filter(k => stepDays[k].steps >= g).length,
    fmt: fmtInt,
    bars: wk.map(k => ({ label: dayLetter(k), v: stepDays[k] && stepDays[k].steps > 0 ? stepDays[k].steps : 0, dim: k === today })),
    stats: logged.length ? [
      [compact(Math.max(...logged.map(k => stepDays[k].steps))), 'best day'],
      [compact(logged.reduce((s, k) => s + stepDays[k].steps, 0)), 'this week']
    ] : null,
    none: 'Nothing this week. Your goal is ' + g.toLocaleString() + ' a day.',
    goLabel: 'Open Steps', view: 'steps'
  });
}

function waterCard() {
  if (waterDays === null) return goalCard('Water', { loading: 'Reading the last two weeks of water…' });

  const wk = keysBack(7);
  const g = waterGoal();
  const today = todayKey();
  const logged = wk.filter(k => waterDays[k] > 0);
  return goalCard('Water', {
    logged, goal: g, color: C_WATER,
    avg: logged.length ? mean(logged.map(k => waterDays[k])) : 0,
    hit: logged.filter(k => waterDays[k] >= g).length,
    fmt: v => fmtWater(v, waterUnit()),
    bars: wk.map(k => ({ label: dayLetter(k), v: waterDays[k] > 0 ? waterDays[k] : 0, dim: k === today })),
    // "600 fl oz" does not fit a half-card cell; "600 oz" does, and under a
    // water heading it is not ambiguous.
    stats: logged.length ? [
      [fmtWater(Math.max(...logged.map(k => waterDays[k])), waterUnit()).replace(' fl oz', ' oz'), 'best day'],
      [fmtWater(logged.reduce((s, k) => s + waterDays[k], 0), waterUnit()).replace(' fl oz', ' oz'), 'this week']
    ] : null,
    none: 'Nothing this week. Your goal is ' + fmtWater(g, waterUnit()) + ' a day.',
    goLabel: 'Open Fuel', view: 'food'
  });
}

/* ================= CONSISTENCY ================= */
function consistencyCard() {
  const c = card('Days on record', 'last 13 weeks');

  if (!loaded) {
    c.appendChild(noteEl('Counting…'));
    return c;
  }

  // Every day this account has anything for, weighted by how many kinds of
  // thing landed on it — that weight is what shades the heat map, so a day
  // with a meal, a weigh-in and a session is brighter than one with a step
  // total. weight/entries is keyed by weigh-in id, so its days only exist
  // after mapping the timestamps through todayKey. Water is left out on
  // purpose: only the last fourteen days of it are loaded, and a count that
  // grows when a background read lands is worse than a count that never
  // claimed to include it.
  const rec = {};
  const bump = k => { rec[k] = (rec[k] || 0) + 1; };
  Object.entries(summaries || {}).forEach(([k, v]) => { if (v && v.cal > 0) bump(k); });
  Object.keys(weighDayMap()).forEach(bump);
  Object.entries(stepDays || {}).forEach(([k, v]) => { if (v && v.steps > 0) bump(k); });
  new Set((sessions || []).map(s => s && s._date).filter(Boolean)).forEach(bump);

  const keys = Object.keys(rec);
  if (!keys.length) {
    c.appendChild(noteEl('Nothing on record yet. A meal, a weigh-in, a workout or a step count — any one of them puts a day on this list, and everything else on this screen is built out of them.'));
    return c;
  }

  const last30 = keysBack(30).filter(k => rec[k]).length;

  // Counted back from today, or from yesterday when today is still empty — you
  // shouldn't lose a streak at eight in the morning. Bounded because a streak
  // is only ever as long as the record behind it.
  let streak = 0;
  let d = new Date();
  if (!rec[todayKey(d)]) d = new Date(d.getTime() - DAY);
  for (let i = 0; i < keys.length + 2; i++) {
    if (!rec[todayKey(d)]) break;
    streak++;
    d = new Date(d.getTime() - DAY);
  }

  c.appendChild(heatStrip(rec, 91));

  c.appendChild(statRow([
    [streak, 'Day streak'],
    [last30 + ' / 30', 'Last 30 days'],
    [keys.length.toLocaleString(), 'All time']
  ]));

  // YYYY-MM-DD sorts as it dates. The year only earns its place once the record
  // reaches back past this one.
  const first = keys.sort()[0];
  const firstD = parseKey(first);
  const firstLbl = firstD.getFullYear() === new Date().getFullYear()
    ? fmtDate(first) : fmtDate(first) + ', ' + firstD.getFullYear();
  c.appendChild(noteEl('Since ' + firstLbl +
    '. A day lights up once anything at all landed on it, and brighter the more kinds of thing did — food, a weigh-in, a session, a step total.' +
    (sessions === null ? ' Training days are still loading.' : '')));
  return c;
}

/* ================= INSTALL ================= */
function installCard() {
  const c = el('div', 'card install-card');

  const x = el('button', 'install-x', '×');
  x.setAttribute('aria-label', 'Dismiss');
  x.onclick = () => { LS.set('installDismissed', true); render(); };
  c.appendChild(x);

  c.appendChild(el('div', 'eyebrow', 'App'));
  c.appendChild(el('h3', null, 'Put Rack on your home screen'));
  c.appendChild(noteEl('It opens from the icon, fills the screen with no browser bar, and keeps working when the signal doesn’t. Takes about four taps.'));

  const b = el('button', 'btn btn-primary btn-block', 'Show me how');
  b.style.marginTop = '14px';
  b.onclick = () => openInstallGuide();
  c.appendChild(b);
  return c;
}

/* ================= ADMIN ================= */
function adminRow() {
  const c = el('div', 'card');
  const list = el('div', 'set-list');

  const row = el('button', 'set-row-nav');
  row.appendChild(el('div', 'set-row-l', 'Admin'));
  row.appendChild(el('div', 'set-row-v', 'Owner'));
  row.appendChild(el('div', 'set-row-x', '›'));
  // isOwner() is the client-side check and nothing more — the rules are what
  // actually decide, and they check the same uid on the server. Closing puts
  // the parked DOM back on its own; the callback repaints it with whatever
  // landed while the panel was up.
  row.onclick = () => openAdmin(() => render());
  list.appendChild(row);

  c.appendChild(list);
  return c;
}
