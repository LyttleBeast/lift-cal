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
import { $, el, noteEl, trimNum, r1, parseKey, fmtDate, compact, fmtDuration, sheet } from './ui.js';
import { assess, keysBack as keysBackI, streakOf, fmtRange } from './insights.js';
import { allSessions, exerciseIndex, filterByRange, groupSplit, topBy, weeklyVolume,
         lineChart, barChart, ring, sparkline, heatStrip, emptyChart, legend,
         groupColor } from './analytics.js';
import { weightStats, maintenance, trendRate, refreshModel, trendWeight, adjustedDays,
         goalDir as goalDirOf } from './tdee.js';
import { fmtWater } from './water.js';
import { isStandalone } from './usage.js';
import { openInstallGuide } from './onboarding.js';
import { openSettings, openGoal, openDailyTargets, pickProfilePhoto } from './settings.js';
import { openAdmin, isAdminOpen } from './admin.js';

const DAY = 864e5;
// Exactly the two seven-day windows the week card compares, so the water reads
// cover both and no more. There is deliberately no water rollup node
// (water.js:10-13) — a day is a handful of entries, summed on read.
const WATER_DAYS = 15;   // the review's two complete weeks reach back to day 14
// Restated rather than imported: steps.js and water.js hold these as private
// module constants, and importing either module here would drag its listeners
// and its render loop into the boot path for one number.
const STEP_GOAL_DEFAULT  = 10000;
const WATER_GOAL_DEFAULT = 3785;

// One hue per subject, the same on every card that subject appears on, so a
// yellow line anywhere on this screen is food or the scale and a blue bar is
// water or training. Status colours (good / bad) are reserved for judgements
// and never stand in for a subject.
// The subject tokens in rack.css, one per log, so this screen agrees with
// the tab each picture points at. Weight is chrome because it is a
// measurement the goal decides the meaning of, not a subject with a mood.
const C_FUEL   = 'var(--s-fuel)';
const C_WEIGHT = 'var(--s-weight)';
const C_STEPS  = 'var(--s-steps)';
const C_WATER  = 'var(--s-water)';
const C_TRAIN  = 'var(--s-train)';
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
// The same helper insights.js walks its windows with, so the two can never
// disagree about which seven days "this week" is.
const keysBack = keysBackI;

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

/* `why` is the dots in the corner — the same ⋯ Fuel's summary card uses —
   and it opens a short sheet saying where the card's numbers come from. It
   is given to the cards whose number a person might reasonably doubt
   (maintenance, a pace, a verdict) and withheld from the ones that are just
   a picture of the log. Pass { title, body: string | string[] }. */
function card(title, sub, why) {
  const c = el('div', 'card');
  if (title) {
    const hd = el('div', 'card-hd');
    hd.appendChild(el('div', 'eyebrow', title));
    const right = el('div', 'card-right');
    if (sub) right.appendChild(el('div', 'card-sub num', sub));
    if (why) {
      const b = el('button', 'ex-menu card-why', '⋯');
      b.setAttribute('aria-label', 'Where this comes from');
      b.onclick = () => whySheet(why);
      right.appendChild(b);
    }
    hd.appendChild(right);
    c.appendChild(hd);
  }
  return c;
}

function whySheet({ title, body, eyebrow = 'Where this comes from' }) {
  const { sh } = sheet();
  sh.appendChild(el('div', 'eyebrow', eyebrow));
  sh.appendChild(el('h2', null, title));
  (Array.isArray(body) ? body : [body]).forEach(p => {
    if (typeof p === 'string') sh.appendChild(noteEl(p));
    else if (p) sh.appendChild(p);
  });
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
/* This is the first thing on the first screen, so every element earns its
   place twice — once as a shape and once as a fact. Top row: the subject and
   a tinted pill with how far it moved. The number, then last week's number
   in small print, so the pill has something to be measured against without
   a second glance. The picture: last week muted, this week in colour with an
   area under it and a glow on today, and the target dashed across both so
   "near the line" is visible before anything is read. The dots: the seven
   days of this week, filled where something landed — the consistency the
   average is built on, in the same tile as the average. `rgb` is the subject
   colour as bare channels for the tile's corner tint; CSS variables cannot be
   given an alpha, so the channels are passed rather than the variable. */
function kpi({ label, now, prev, fmt, dfmt, unit, judge, series, color, rgb, ref, kind, days, ready = loaded }) {
  const t = el('div', 'kpi');
  if (rgb) t.style.setProperty('--kpi-rgb', rgb);

  const hd = el('div', 'kpi-hd');
  hd.appendChild(el('div', 'kpi-lbl', label));
  let d;
  if (!ready) {
    d = deltaEl('…', 'flat');
  } else if (now == null || prev == null) {
    // No last week is not a delta of zero, and printing one would be a lie
    // about a week that never happened.
    d = deltaEl('–', 'flat');
  } else {
    const diff = now - prev;
    d = arrowEl(diff, judge(now, prev), (dfmt || fmt)(Math.abs(diff)));
  }
  d.classList.add('delta-pill');
  hd.appendChild(d);
  t.appendChild(hd);

  const v = el('div', 'kpi-val num');
  v.appendChild(el('span', null, val(now, fmt, ready)));
  if (unit && ready && now != null) v.appendChild(el('span', 'kpi-unit', unit));
  t.appendChild(v);

  t.appendChild(el('div', 'kpi-prev num',
    !ready ? '…'
    : prev != null ? 'last week ' + fmt(prev)
    : now != null  ? 'first week on record'
    :                'nothing this week'));

  t.appendChild(sparkline(series || [], {
    color, accentFrom: 7, height: 46, area: kind !== 'bars', glow: kind !== 'bars',
    ref: ref > 0 ? ref : null, kind: kind || 'line'
  }));

  if (days && days.length) {
    const row = el('div', 'kpi-days');
    days.forEach((on, i) => {
      const dot = el('i', (on ? 'on' : '') + (i === days.length - 1 ? ' today' : ''));
      if (on) dot.style.background = color;
      row.appendChild(dot);
    });
    t.appendChild(row);
  }
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

  // One reading of the data for the whole paint. Everything the verdict
  // cards say is derived here from the same numbers the charts draw, so a
  // "protein on target 5 of 6 days" line and the macro rows under the fuel
  // chart can never be counting different days.
  const found = loaded && modelReady ? safeAssess(est, maint) : null;

  // The order is the order a person wants the answers in: how am I doing,
  // where is it heading, what happened this week, what did Rack notice, then
  // the pictures, then the week written up. Nothing here is a wall of stats
  // first and a meaning second.
  const s1 = section('How you’re doing');
  s1.appendChild(assessCard(found, 'wins'));
  s1.appendChild(assessCard(found, 'improve'));
  wrap.appendChild(s1);

  const s2 = section('Goal');
  s2.appendChild(trajectoryCard(found, est, maint));
  wrap.appendChild(s2);

  const s3 = section('This week');
  s3.appendChild(weekCard(maint));
  wrap.appendChild(s3);

  if (found && found.insights.length) {
    const s4 = section('Rack noticed');
    s4.appendChild(insightsCard(found));
    wrap.appendChild(s4);
  }

  const s5 = section('Trends');
  s5.appendChild(weightCard(maint));
  s5.appendChild(fuelCard(maint));
  s5.appendChild(trainingCard());
  const pair = el('div', 'you-pair');
  pair.appendChild(stepsCard());
  pair.appendChild(waterCard());
  s5.appendChild(pair);
  wrap.appendChild(s5);

  const s6 = section('Weekly review');
  s6.appendChild(reviewCard(found));
  wrap.appendChild(s6);

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

  // The greeting is the headline and the name rides in it, so the first
  // words on the first screen are about the person and the time of day,
  // not a label. First name only: "Good morning, Micah Flunker" is a letter.
  const hr = new Date().getHours();
  const greet = hr < 5 ? 'Good night' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const first = name === 'You' ? '' : String(name).trim().split(/\s+/)[0];
  // Two deliberate lines — the greeting, then the name — rather than one
  // line that wraps wherever it runs out of room. The point is that the app
  // greets you when it opens, so it gets to be large.
  const mid = el('div');
  const g = el('div', 'you-greet');
  g.appendChild(el('span', null, greet + (first ? ',' : '')));
  if (first) g.appendChild(el('span', 'you-greet-name', first));
  mid.appendChild(g);
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

/* Which way is "better" for bodyweight. The rule lives in tdee.js now, because
   the Weight tab colours the same rate and used to assume a cut; this is just
   that rule fed this module's targets and maintenance. */
function goalDir(maint) {
  return goalDirOf(targets, maint ? maint.cal : null);
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
  const c = card('Against last week', 'rolling 7 days', {
    title: 'Against last week',
    body: [
      'Each tile is the last seven days against the seven before them. Calories and steps are averaged over the days that have a total; weight is the average of the days you weighed in; training is finished sessions. Today’s food is left out of the calorie average because the day isn’t over.',
      'The pill is the difference between the two weeks. Green means it moved the way your goal wants — so on a cut, weight falling is green — red the other way, grey when the move is too small to matter or the goal is unknown. Calories are judged by whether the week landed nearer your target than last week did.',
      'The line under each is the same fortnight, this week in colour, with your target dashed across it. The dots are this week’s seven days, filled where something was logged.'
    ]
  });

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
    // Sixty kilocalories a day of drift either way is one apple, and the
    // first pill on the first screen should not go red over an apple.
    const dn = Math.abs(n - targets.cal), dp = Math.abs(p - targets.cal);
    return dn < dp - 60 ? 'up' : dn > dp + 60 ? 'down' : 'flat';
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
  // The day dots include today where the averages leave it out: an average
  // over a half-eaten day is wrong, but "you logged today" is simply true.
  const trainOn = new Set((sessions || []).map(x => x && x._date));
  const grid = el('div', 'kpi-grid');
  grid.appendChild(kpi({
    label: 'Calories', unit: 'kcal / day',
    now: meanBy(thisWk, kcal), prev: meanBy(lastWk, kcal),
    fmt: fmtInt, judge: towardTarget, color: C_FUEL, rgb: '240,190,30',
    series: both.map(kcal), ref: targets && targets.cal > 0 ? targets.cal : null,
    days: thisWk.map(k => !!(summaries[k] && summaries[k].cal > 0))
  }));
  grid.appendChild(kpi({
    label: 'Weight', unit: 'lb',
    now: meanBy(thisWk, weighOn), prev: meanBy(lastWk, weighOn),
    fmt: trimNum, judge: towardGoal, color: C_WEIGHT, rgb: '232,229,222',
    series: both.map(weighOn),
    days: thisWk.map(k => weighOn(k) != null)
  }));
  grid.appendChild(kpi({
    label: 'Training', unit: sNow && sNow.length === 1 ? 'session' : 'sessions',
    now: sNow ? sNow.length : null, prev: sPrev ? sPrev.length : null,
    fmt: String, judge: higherBetter, color: C_TRAIN, rgb: '46,127,217',
    series: weeks ? weeks.map(w => w.v) : [], kind: 'bars', ready: sessions !== null,
    days: sessions ? thisWk.map(k => trainOn.has(k)) : null
  }));
  grid.appendChild(kpi({
    label: 'Steps', unit: '/ day',
    now: meanBy(thisWk, stepsOn), prev: meanBy(lastWk, stepsOn),
    fmt: fmtInt, judge: higherBetter, color: C_STEPS, rgb: '42,168,92',
    series: both.map(stepsOn), ref: stepGoal(),
    days: thisWk.map(k => stepsOn(k) != null)
  }));
  c.appendChild(grid);

  if (!loaded) c.appendChild(noteEl('Pulling the last two weeks together…'));
  return c;
}

/* ================= FUEL ================= */
function carbTarget() {
  if (!(targets && targets.cal > 0)) return null;
  return Math.max(0, Math.round((targets.cal - (targets.p || 0) * 4 - (targets.f || 0) * 9) / 4));
}

function fuelCard(maint) {
  const c = card('Against your targets', 'last 7 days', {
    title: 'Your targets',
    body: [
      targets && targets.cal > 0
        ? 'Your daily target is ' + fmtInt(targets.cal) + ' kcal, ' + Math.round(targets.p || 0) + ' g protein and ' + Math.round(targets.f || 0) + ' g fat. Carbs are whatever is left — ' + (carbTarget() || 0) + ' g — never a number you set. ' +
          (targets.auto && targets.auto.on ? 'The targets follow your weight: protein and fat are grams per pound of trend weight and calories are maintenance shifted by your goal rate, re-checked at most once a week.'
                                          : 'They were set by hand, or by setup from your height, weight, age and goal, and stay where they are until you change them under ⚙ Daily targets.')
        : 'No targets are set yet. Setup writes a starting set; the gear at the top of this screen is where they live.',
      maint ? 'Maintenance — what holds your weight steady — is ' + fmtInt(maint.cal) + ' kcal' + (maint.pinned ? ', a fixed number rather than a measured one.' : ', measured from what you ate against what the scale did.') + ' Your target sits ' + fmtInt(Math.abs(targets.cal - maint.cal)) + ' ' + (targets.cal < maint.cal ? 'under' : 'over') + ' it.' : 'Maintenance is not known yet, so the chart shows only the target.',
      'The bars are each day’s calories split into what they were made of; the rows are the week’s average against each target, today left out because it isn’t over. Protein reads green from 95% of target; carbs and fat within 10% either side.'
    ]
  });

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

  c.appendChild(noteEl('Averaged over the ' + logged.length + ' of the last 7 days you logged food. Dashed is your target' + (lines.length ? ', dotted your maintenance' : '') + '.'));
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
  const c = card('Body weight', 'last 45 days', {
    title: 'The weight trend',
    body: [
      'The white line is the daily average of your weigh-ins. The dashed line is the trend: every reading first corrected for the food and water that were in you when you stood on the scale — a weigh-in after dinner runs pounds heavier than one before breakfast, and the model learns your own numbers for that from the log — then smoothed so a week of wobble reads as one slope.',
      'The rate beside the headline is that slope in pounds a week, with a ✓ when it comes from the fitted model rather than the plain seven-day averages. The 30-day arrow is the first and last daily average in the window. Both are green when they move the way your goal wants and amber the other way.',
      'Weighing more than once a day is a feature: two readings a day is what lets the model learn how much of a reading is breakfast.'
    ]
  });

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
                       line2: trend.length >= 2 ? trend : null, color2: 'var(--p-chrome)', yLabels: true })
    : emptyChart('Two days of weigh-ins draw the first line'));
  c.appendChild(chart);
  if (pts.length >= 2) {
    const items = [['daily average', C_WEIGHT]];
    if (trend.length >= 2) items.push(['trend', 'var(--p-chrome)', 'dash']);
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
  if (pts.length < 2) {
    c.appendChild(noteEl('One reading is a data point. A handful across a fortnight is a trend — and the trend is what the rate, the targets and your maintenance number are all built on.'));
  }
  return c;
}

/* ================= TRAINING ================= */
function trainingCard() {
  const c = card('Training', 'last 30 days', {
    title: 'Training numbers',
    body: [
      'Volume is weight × reps over working sets — warm-ups never count, on this screen or anywhere else. The three numbers and the muscle split are the last 30 days; the bars are total volume by calendar week, Sunday to Saturday, with the session count over each and this week faded because it isn’t over.',
      'Strongest lifts are ranked by estimated one-rep max from your best working set, using the Epley formula (weight × (1 + reps ÷ 30)). It is an estimate, and a better one for sets of eight or fewer. Records are derived from the log every time, never stored, so editing a session can never leave a stale one behind.'
    ]
  });

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
    size: 84, thickness: 8, color: frac >= 1 ? 'var(--ok)' : o.color,
    top: Math.round(frac * 100) + '%', sub: 'of goal'
  }));
  cell.appendChild(el('div', 'ring-of num', o.fmt(o.avg) + ' a day'));
  c.appendChild(cell);

  const bars = el('div');
  bars.style.marginTop = '8px';
  // The days that cleared the goal are drawn in the good colour and the rest
  // in the subject's, so "3 of 6 at goal" is visible in the bars before it is
  // read under them.
  bars.appendChild(barChart(o.bars.map(b => ({ ...b, color: b.v >= o.goal ? 'var(--ok)' : o.color })),
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

/* ================= WHAT RACK MAKES OF IT =================
   The verdict cards. All four read from one assess() over the same numbers
   the charts draw, done once per paint in build(). The context handed to it
   is exactly this module's state plus the two model outputs, so there is no
   second copy of anything to drift. */
function safeAssess(est, maint) {
  try {
    const tr = trendRate(entries);
    const tw = trendWeight();
    const s  = weightStats(entries);
    return assess({
      targets, maint, dir: goalDir(maint), summaries, wmap: weighDayMap(), entries,
      rate: tr && Number.isFinite(tr.rateWk) ? tr : null,
      tw: tw != null && Number.isFinite(tw) ? tw : null,
      sessions, stepDays, stepGoal: stepGoal(), waterDays, waterGoal: waterGoal(),
      est, days: s.days || []
    });
  } catch {
    return null;
  }
}

const SUBJECT_COLOR = {
  fuel: C_FUEL, weight: C_WEIGHT, train: C_TRAIN, steps: C_STEPS, water: C_WATER, all: 'var(--chalk)'
};

/* One line per finding: a coloured mark for the subject, the finding, and
   the detail under it. Tapping a row opens its `why` — the rule it was made
   by, in plain words — because a verdict with no working is the one thing
   this screen refuses to be. */
function findingRow(f, tone) {
  const row = el('button', 'find-row' + (tone ? ' ' + tone : ''));
  const mark = el('i', 'find-mark');
  mark.style.background = SUBJECT_COLOR[f.subject] || 'var(--steel)';
  row.appendChild(mark);
  const body = el('div', 'find-body');
  body.appendChild(el('div', 'find-t', f.title));
  if (f.detail) body.appendChild(el('div', 'find-d', f.detail));
  row.appendChild(body);
  row.onclick = () => whySheet({ eyebrow: 'How Rack decided', title: f.title, body: [f.why] });
  return row;
}

function assessCard(found, kind) {
  const wins = kind === 'wins';
  const c = card(wins ? 'Doing well' : 'Could improve', null, {
    title: 'How these are chosen',
    body: [
      'Every time this screen paints, Rack checks about a dozen things over the last seven days against the same targets the other tabs use: how many days were logged, protein and calories against target, which way the trend weight is moving for your goal, sessions, steps, water, and the streak.',
      'Each check has a plain bar — “protein on at least four of five logged days”, “trend down at least 0.3 lb a week on a cut” — and only the ones clearly on one side of their bar make the lists. The three that matter most are shown; tap any line for the exact rule behind it.',
      'Nothing here is generated. If a line cannot be checked against a number on another tab, it is not made.'
    ]
  });
  c.classList.add(wins ? 'card-wins' : 'card-improve');

  if (!found) {
    c.appendChild(noteEl(loaded ? 'Working out where your numbers sit…' : 'Reading your log…'));
    return c;
  }
  const list = found[kind];
  if (!list.length) {
    c.appendChild(noteEl(wins
      ? 'Nothing has cleared the bar yet this week. A few logged days is usually all it takes.'
      : 'Nothing is slipping that Rack can see. Keep going.'));
    return c;
  }
  const wrap = el('div', 'find-list');
  list.forEach(f => wrap.appendChild(findingRow(f, wins ? 'good' : 'warn')));
  c.appendChild(wrap);
  return c;
}

/* ================= GOAL TRAJECTORY ================= */
function trajectoryCard(found, est, maint) {
  const t = found ? found.trajectory : null;
  const dirWord = d => d < 0 ? 'Cutting' : d > 0 ? 'Bulking' : 'Maintaining';

  // The card's ⋯ is where the old "how it fits together" card went: the
  // arithmetic behind maintenance and the pace, with the reader's numbers in
  // it, derived from the estimate's own total so the sums close on screen.
  const why = { title: 'Where this is heading', body: [] };
  if (maint) {
    const avg = est && Number.isFinite(est.avgIntake) ? Math.round(est.avgIntake) : null;
    if (maint.pinned) {
      why.body.push('Maintenance is fixed at ' + fmtInt(maint.cal) + ' kcal — either setup worked it out from your height, weight, age and activity, or you typed it. Rack uses it everywhere instead of its own estimate until it is cleared under ⚙ Daily targets, and after a couple of weeks of weigh-ins the measured number is the better one.');
    } else if (avg != null) {
      const shift = Math.abs(maint.cal - avg);
      const rate  = est && Number.isFinite(est.rateWk) ? est.rateWk : null;
      why.body.push('Nobody typed your maintenance. You averaged ' + fmtInt(avg) + ' kcal a day over ' + (est.days || 0) + ' logged days; the scale ' +
        (rate == null || Math.abs(rate) < 0.05 ? 'held steady, so that is about what you spend' :
         'went ' + (rate < 0 ? 'down' : 'up') + ' ' + r1(Math.abs(rate)) + ' lb a week, which at roughly 3,500 kcal a pound is ' + fmtInt(shift) + ' a day ' + (rate < 0 ? 'more' : 'less') + ' than you ate') +
        ' — so maintenance is ' + fmtInt(maint.cal) + ' kcal' + (est && est.se ? ', give or take ' + fmtInt(Math.round(1.96 * est.se / 5) * 5) : '') + '.');
    }
  } else {
    why.body.push('Maintenance is not known yet. It needs ' + (est && est.need && est.need.length ? est.need.join(' and ') : 'a couple of weeks of food and weigh-ins') + ', and it arrives on its own.');
  }
  why.body.push('The pace is the slope of your trend weight — every weigh-in corrected for the food and water in you at the time, then smoothed. It is not projected from fewer than two weeks of weigh-ins, and no finish date is printed more than two years out, because a slope over a handful of readings is noise dressed as a plan.');
  if (t && t.goalLb && t.start != null) {
    why.body.push('Progress runs from your first recorded daily average, ' + trimNum(t.start) + ' lb on ' + fmtDate(t.startDate) + ', to your goal of ' + trimNum(t.goalLb) + '. The finish date is the distance left divided by the current pace, and it moves as the pace does.');
  }

  const c = card('Goal', t ? dirWord(t.dir).toLowerCase() : null, why);

  if (!loaded || !modelReady) {
    c.appendChild(noteEl('Working out where your numbers sit…'));
    return c;
  }
  if (!t) {
    c.appendChild(noteEl('No goal is set. Setup asks whether you are cutting, maintaining or bulking; the rate under ⚙ Daily targets is where it lives now.'));
    c.appendChild(goalBtn('Set a goal'));
    return c;
  }

  // Headline: the pace, judged. Then the goal weight and the finish date
  // when there is one, then the progress bar when there is a start and an
  // end to run it between.
  const hl = el('div', 'headline');
  const dot = el('i', 'traj-dot ' + (t.status === 'on' || t.status === 'ahead' ? 'good' : t.status === 'wrong' || t.status === 'drift' ? 'bad' : t.status ? 'warn' : ''));
  hl.appendChild(dot);
  if (t.enough && t.rate != null) {
    hl.appendChild(el('span', 'headline-v num', r1(Math.abs(t.rate)) + ''));
    hl.appendChild(el('span', 'headline-u', 'lb / week ' + (t.rate < 0 ? 'down' : t.rate > 0 ? 'up' : 'flat')));
  } else {
    hl.appendChild(el('span', 'headline-v num', '–'));
    hl.appendChild(el('span', 'headline-u', 'lb / week'));
  }
  c.appendChild(hl);
  c.appendChild(el('div', 'traj-reason', t.reason));

  if (t.goalLb) {
    const cells = [
      [t.tw != null ? trimNum(t.tw) : '–', 'Trend now'],
      [trimNum(t.goalLb), 'Goal lb']
    ];
    if (t.weeks === 0) cells.push(['✓', 'At goal']);
    else if (t.eta) cells.push([t.eta.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + (t.eta.getFullYear() !== new Date().getFullYear() ? ' ’' + String(t.eta.getFullYear()).slice(2) : ''), 'At this pace']);
    else if (t.weeks != null) cells.push(['2 yr +', 'At this pace']);
    else cells.push(['–', 'At this pace']);
    const sr = statRow(cells);
    sr.style.marginTop = '12px';
    c.appendChild(sr);

    if (t.progress != null) {
      const bar = el('div', 'traj-bar');
      const fill = el('div', 'traj-fill');
      fill.style.width = Math.round(t.progress * 100) + '%';
      fill.style.background = t.status === 'wrong' || t.status === 'drift' ? 'var(--caution)' : C_WEIGHT;
      bar.appendChild(fill);
      c.appendChild(bar);
      const ends = el('div', 'traj-ends');
      ends.appendChild(el('span', 'num', trimNum(t.start) + ' lb · ' + fmtDate(t.startDate)));
      ends.appendChild(el('span', 'num', Math.round(t.progress * 100) + '% there'));
      ends.appendChild(el('span', 'num', trimNum(t.goalLb) + ' lb'));
      c.appendChild(ends);
    }
  } else if (t.dir !== 0) {
    c.appendChild(noteEl('Set a goal weight and this card works out when you would reach it at the current pace.'));
    c.appendChild(goalBtn('Set a goal weight', 'targets'));
  }
  return c;
}

/* `where` is 'goal' for the cut / hold / bulk sheet and 'targets' for Daily
   targets, which is where the goal weight lives. Both repaint this tab
   behind them the moment they save. */
function goalBtn(label, where = 'goal') {
  const b = el('button', 'btn btn-ghost btn-block', label);
  b.style.marginTop = '12px';
  const back = () => { liveFp = ''; refreshLogged(); };
  b.onclick = () => (where === 'targets' ? openDailyTargets(back) : openGoal(back));
  return b;
}

/* ================= INSIGHTS ================= */
function insightsCard(found) {
  const c = card('Rack noticed', null, {
    title: 'What counts as noticing',
    body: [
      'These are patterns over time rather than the state of the week: volume up or down a quarter on last week, a new record, a muscle group missed for four weeks, weekends running higher than weekdays, a pace well off the plan, steps changing by a quarter, a month mostly on record.',
      'Each has a plain bar, written on the line itself when you tap it. Only what clears the bar is shown, four at most, and nothing is padded out to fill the card — most weeks there will be one or two, some weeks none, and then the card is not drawn at all.'
    ]
  });
  const wrap = el('div', 'find-list');
  found.insights.forEach(f => wrap.appendChild(findingRow(f, 'note')));
  c.appendChild(wrap);
  return c;
}

/* ================= WEEKLY REVIEW ================= */
function reviewCard(found) {
  const r = found ? found.review : null;
  const c = card('Weekly review', r ? fmtRange(r.from, r.to) : null, {
    title: 'The weekly review',
    body: [
      'The last seven complete days — yesterday and the six before it — against the seven before those. Complete days on purpose: a review that included today would change every time you read it.',
      'Each line is judged against the same targets the other tabs use: at least two sessions; five of seven days logged; calories within 6% of target (or not more than 10% the wrong way for your goal); protein on at least seven in ten logged days; weight moving the way your goal wants; steps at 95% of goal; water at goal on four days. Lines that fall clearly short go under attention, lines clearly over go under going well, and the rest are simply reported.',
      'The takeaway is chosen by leverage, not size: logging comes before protein, protein before training, training before calories — because fixing the earlier one is what makes the later ones measurable.'
    ]
  });

  if (!r) {
    c.appendChild(noteEl(loaded ? 'Writing the week up…' : 'Reading your log…'));
    return c;
  }

  c.appendChild(el('div', 'review-verdict', r.verdict));

  const block = (title, items, tone) => {
    if (!items.length) return;
    c.appendChild(el('div', 'chart-sub', title));
    const list = el('div', 'review-list');
    items.forEach(i => {
      const row = el('div', 'review-row ' + tone);
      const mark = el('i', 'find-mark');
      mark.style.background = SUBJECT_COLOR[i.subject] || 'var(--steel)';
      row.appendChild(mark);
      const body = el('div', 'find-body');
      body.appendChild(el('div', 'find-t', i.label + ' · ' + i.value));
      body.appendChild(el('div', 'find-d', i.text));
      row.appendChild(body);
      list.appendChild(row);
    });
    c.appendChild(list);
  };
  block('Going well', r.positives, 'good');
  block('Needs attention', r.attention, 'warn');
  block('Also this week', r.items.filter(i => i.ok == null), 'flat');

  const tk = el('div', 'review-take');
  tk.appendChild(el('div', 'chart-sub', 'Next week'));
  tk.appendChild(el('div', 'review-take-t', r.takeaway));
  c.appendChild(tk);

  // Days on record, as the picture under the write-up: everything the
  // account has anything for, brighter the more kinds of thing landed on a
  // day. weight/entries is keyed by weigh-in id, so its days only exist
  // after mapping through todayKey; water is left out on purpose, because
  // only a fortnight of it is loaded.
  const rec = {};
  const bump = k => { rec[k] = (rec[k] || 0) + 1; };
  Object.entries(summaries || {}).forEach(([k, v]) => { if (v && v.cal > 0) bump(k); });
  Object.keys(weighDayMap()).forEach(bump);
  Object.entries(stepDays || {}).forEach(([k, v]) => { if (v && v.steps > 0) bump(k); });
  new Set((sessions || []).map(s => s && s._date).filter(Boolean)).forEach(bump);
  const keys = Object.keys(rec);
  if (keys.length) {
    c.appendChild(el('div', 'chart-sub', 'Days on record · 13 weeks'));
    c.appendChild(heatStrip(rec, 91));
    const streak = streakOf({ summaries, wmap: weighDayMap(), stepDays, sessions });
    const sr = statRow([
      [streak, 'Day streak'],
      [keysBack(30).filter(k => rec[k]).length + ' / 30', 'Last 30 days'],
      [keys.length.toLocaleString(), 'All time']
    ]);
    c.appendChild(sr);
  }
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
