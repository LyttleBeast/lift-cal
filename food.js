// Fuel — nutrition tracking.
// Data lives under users/{uid}/food/*, mirrored to localStorage by store.js.
//   food/log/{YYYY-MM-DD}  -> { entryId: entry }
//   food/items             -> { itemId: item }      saved-food library
//   food/meals             -> { mealId: meal }      saved multi-item meals
//   food/targets           -> { cal, p, f }         carbs = remainder
//   food/daySummaries/{d}  -> { cal, p, c, f }      tiny per-day rollup (TDEE math)
//
// Every one of those paths is already per-account — store.js prefixes them
// with users/{uid}/ and the database rules refuse anything else. The only
// thing that ever crossed accounts was the hard-coded starter foods, which are
// owner-only (see seedItems): they are one person's reference values for a
// specific job's pizza dough, not a food database.

import { read, write, watch, LS, todayKey, uid } from './store.js';
import { maintenance, calorieZones, zoneOf, refreshModel,
         autoTargets, trendWeight, MIN_CARB_G, goalDir } from './tdee.js';
import { initWater, loadWaterDay, renderWater, renderWaterStrip, openWaterSettings } from './water.js';
import { OWNER_UID } from './firebase-config.js';
import { $, el, svgEl, sheet, toast, noteEl, confirmSheet, copyText, readClipboard,
         segmented, r1, trimNum, LIMITS, clamp, within } from './ui.js';
import { shrinkImage, estimatePhoto, estimateText, quota,
         proxyUrl, setProxyUrl, hasProxy } from './ai.js';
import { initRecall, lookup as recallLookup, remember as recallRemember,
         rememberEntry, recallList, recallCount,
         forget as recallForget, forgetAll as recallForgetAll } from './recall.js';
import { bump } from './usage.js';

const MEALS = [
  ['breakfast', 'Breakfast'],
  ['lunch',     'Lunch'],
  ['dinner',    'Dinner'],
  ['snack',     'Snacks']
];

const MICROS = [
  ['fiber',       'Fiber',       'g'],
  ['sugar',       'Sugar',       'g'],
  ['satfat',      'Sat fat',     'g'],
  ['sodium',      'Sodium',      'mg'],
  ['potassium',   'Potassium',   'mg'],
  ['cholesterol', 'Cholesterol', 'mg']
];

let viewDate = new Date();
let dayLog   = {};      // entryId -> entry for viewDate
let prevLog  = {};      // the day before viewDate, for "copy yesterday's"
let items    = {};      // itemId  -> library item
let meals    = {};      // mealId  -> saved meal
let targets  = { cal: 2700, p: 215, f: 80, maint: null, auto: null };

// Auto targets: macros that follow the scale instead of sitting where you last
// typed them. Off by default — nothing changes for anyone who doesn't turn it on.
const AUTO_DEFAULTS = { on: false, rateWk: -1, pPerLb: 1, fPerLb: 0.35, floor: 0, lastAdj: 0 };
const AUTO_EVERY_DAYS = 7;    // how often it may move at all
const AUTO_MAX_STEP   = 100;  // biggest single calorie change
let weighIns = {};      // weight/entries — only for the maintenance estimate
let summaries = {};     // food/daySummaries — ditto
let unwatchDay = null;  // live listener on the day being viewed

/* ================= INIT ================= */
export async function initFood() {
  targets = (await read('food/targets', null)) || targets;
  items   = (await read('food/items',   null)) || {};
  meals   = (await read('food/meals',   null)) || {};
  await initWater(() => render());
  await initRecall();
  await loadMaintInputs();
  await applyAuto();
  await seedItems();
  await loadDay();

  window.addEventListener('hashchange', handleHash);
  handleHash();
  render();
}

async function loadDay() {
  const prev = new Date(viewDate.getTime() - 864e5);
  const [cur, before] = await Promise.all([
    read('food/log/' + dk(viewDate), null),
    read('food/log/' + dk(prev), null)
  ]);
  dayLog = cur || {};
  prevLog = before || {};
  await loadWaterDay(dk(viewDate));
  watchDay();
}

/* ---------- copying forward ----------
   "Same as yesterday" is the commonest meal there is, and it used to be a
   search or a saved meal away. Copies are new entries — fresh ids, stamped
   now, src 'copy' — so editing one later never touches the day it came from. */
function copyOf(e, meal) {
  return { ...cleanIng(e), meal: meal || e.meal || defaultMeal(), src: 'copy' };
}
function copyFromPrev(mealId) {
  const list = Object.values(prevLog).filter(e => e && e.meal === mealId).sort((a, b) => (a.t || 0) - (b.t || 0));
  if (!list.length) return;
  bump('foodCopy');
  addEntries(list.map(e => copyOf(e, mealId)));
  toast('Copied ' + list.length + (list.length === 1 ? ' entry' : ' entries') + ' from yesterday');
}
async function copyToToday(list) {
  if (!list.length) return;
  bump('foodCopy');
  await logOnToday(list.map(e => copyOf(e, e.meal)));
  toast('Copied ' + list.length + (list.length === 1 ? ' entry' : ' entries') + ' to today');
}

// Live listener on whichever day is on screen. It keeps a second device — the
// phone and the laptop open at once — from drifting apart, and it is what makes
// an estimate accepted on one of them appear on the other. Nothing outside the
// app can write here any more, so this is now purely about your own devices.
// The rollup is still recomputed locally on every change, because the
// maintenance estimate reads the rollup rather than the raw log.
function watchDay() {
  if (unwatchDay) { unwatchDay(); unwatchDay = null; }
  const key = dk(viewDate);
  unwatchDay = watch('food/log/' + key, val => {
    const next = val || {};
    if (JSON.stringify(next) === JSON.stringify(dayLog)) return;
    dayLog = next;
    render();
    write('food/daySummaries/' + key, daySummary());
  });
}

async function loadMaintInputs() {
  weighIns  = (await read('weight/entries',     null)) || {};
  summaries = (await read('food/daySummaries',  null)) || {};
  // Stay subscribed. This used to be read once at boot, so a weigh-in logged
  // on the Weight tab left Fuel drawing its cut / maintain / gain marks off a
  // stale maintenance number until the app was reloaded.
  watch('weight/entries', async val => {
    const next = val || {};
    if (JSON.stringify(next) === JSON.stringify(weighIns)) return;
    weighIns = next;
    try { await refreshModel(weighIns); } catch {}
    if (!(await applyAuto())) render();
  });
  // The normalised model is async (it reads back the food and water logs to
  // work out what was in you at each weigh-in). Fit it once here so every
  // synchronous render can just read the cached answer.
  try { await refreshModel(weighIns); } catch {}
}

/* ---------- auto targets ----------
   Recompute against the trend weight and the live maintenance estimate, and
   write only if the move is worth making. Rate-limited two ways: no more than
   once a week, and no more than AUTO_MAX_STEP kcal at a time — one bad
   fortnight of data should never yank the target somewhere silly.
   Returns true if it wrote (and re-rendered). */
async function applyAuto() {
  const a = targets.auto;
  if (!a || !a.on) return false;

  const mi = maintInfo();
  const lb = trendWeight();
  if (!mi || !(lb > 0)) return false;

  const next = autoTargets(a, mi.cal, lb);
  if (!next) return false;

  const moved = Math.abs(next.cal - targets.cal) >= 25 ||
                Math.abs(next.p - targets.p) >= 4 ||
                Math.abs(next.f - targets.f) >= 3;
  if (!moved) return false;
  if (a.lastAdj && Date.now() - a.lastAdj < AUTO_EVERY_DAYS * 864e5) return false;

  const step = Math.max(-AUTO_MAX_STEP, Math.min(AUTO_MAX_STEP, next.cal - targets.cal));
  const cal  = Math.max(next.floor, targets.cal + step);

  targets = { ...targets, cal, p: next.p, f: next.f,
              auto: { ...a, lastAdj: Date.now() } };
  await write('food/targets', targets);
  render();
  toast('Targets moved with your trend \u2014 ' + cal.toLocaleString() + ' kcal, ' + next.p + 'g protein');
  return true;
}

export function latestLb() {
  let best = null;
  Object.values(weighIns || {}).forEach(e => {
    if (e && e.lb > 0 && e.t > 0 && (!best || e.t > best.t)) best = e;
  });
  return best ? best.lb : 0;
}

// For the settings hub's live value pill. Deliberately the copy in memory
// rather than another read of food/targets: this is the object Fuel itself
// draws from, and applyAuto() moves it whenever the trend does, so the pill and
// the tab can never end up quoting different numbers.
export function foodTargets() { return targets; }

function dk(d) { return todayKey(d); }
function isToday() { return dk(viewDate) === todayKey(); }
function isFuture() { return dk(viewDate) > todayKey(); }

/* ---------- starter foods ----------
   These are personal reference values (work pizza crusts, the wings, the
   tub of whey). They are seeded ONLY into the owner's account — anybody else
   who signs up starts with an empty library, the same way they start with an
   empty training log. */
async function seedItems() {
  if (uid() !== OWNER_UID) return;

  const seeds = {
    'seed-bf-scoop': mkItem('Body Fortress whey (vanilla)', 'Body Fortress', 'serv',
      { label: 'scoop', grams: 44 }, { cal: 180, p: 30, c: 7, f: 3 },
      { sugar: 3, sodium: 190, potassium: 170, cholesterol: 105 }),
    'seed-crust-s':  mkItem('Pizza crust — small (dough only)',  'Work', 'serv', { label: 'crust' }, { cal: 640,  p: 21, c: 115, f: 10 }),
    'seed-crust-m':  mkItem('Pizza crust — medium (dough only)', 'Work', 'serv', { label: 'crust' }, { cal: 1070, p: 35, c: 191, f: 17 }),
    'seed-crust-l':  mkItem('Pizza crust — large (dough only)',  'Work', 'serv', { label: 'crust' }, { cal: 1500, p: 48, c: 268, f: 24 }),
    'seed-crust-xl': mkItem('Pizza crust — x-large (dough only)','Work', 'serv', { label: 'crust' }, { cal: 1855, p: 60, c: 331, f: 30 }),
    'seed-wings-oz': mkItem('Wings (per oz)', 'Work', 'serv', { label: 'oz', grams: 28 }, { cal: 60, p: 5, c: 5, f: 2 })
  };

  // A one-time flag, so deleting a starter food makes it stay deleted.
  const seeded = LS.get('seededV1', false);
  let changed = false;
  for (const id of Object.keys(seeds)) {
    if (!items[id] && !seeded) { items[id] = { id, ...seeds[id] }; changed = true; }
  }
  if (changed) await write('food/items', items);
  if (!seeded) LS.set('seededV1', true);
}

function mkItem(name, brand, base, serv, n, micro) {
  return { name, brand: brand || '', base, serv: serv || null, n, micro: micro || null, uses: 0, last: 0 };
}

/* ================= MACRO MATH ================= */
// Every item reduces to: base 'serv' (n is per serving) or '100g' (n is per 100 g).
// gramsPerServ (serv.grams) makes the two interconvertible when present.

function macrosFor(item, amt, unit) {
  // unit: 'serv' | 'g'
  let factor;
  if (unit === 'g') {
    const perGram = item.base === '100g' ? 1 / 100
      : (item.serv && item.serv.grams ? 1 / item.serv.grams : null);
    if (perGram == null) return null;
    factor = amt * perGram;
  } else {
    factor = item.base === 'serv' ? amt
      : (item.serv && item.serv.grams ? amt * item.serv.grams / 100 : null);
    if (factor == null) return null;
  }
  const out = {
    cal: Math.round((item.n.cal || 0) * factor),
    p: r1((item.n.p || 0) * factor),
    c: r1((item.n.c || 0) * factor),
    f: r1((item.n.f || 0) * factor)
  };
  if (item.micro) {
    out.micro = {};
    for (const [k] of MICROS) if (item.micro[k] != null) out.micro[k] = r1(item.micro[k] * factor);
  }
  return out;
}

function qtyLabel(item, amt, unit) {
  if (unit === 'g') return trimNum(amt) + ' g';
  const lbl = item.serv ? item.serv.label : 'serving';
  return trimNum(amt) + ' × ' + lbl + (item.serv && item.serv.grams ? ' (' + trimNum(amt * item.serv.grams) + ' g)' : '');
}

function carbsTarget() { return Math.max(0, Math.round((targets.cal - targets.p * 4 - targets.f * 9) / 4)); }

function defaultMeal() {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

/* ================= PERSIST ================= */
async function saveDay() {
  const key = dk(viewDate);
  await write('food/log/' + key, dayLog);
  await write('food/daySummaries/' + key, daySummary());
}

// The rollup the maintenance estimate and You read. `q` is only present when
// some of the day's calories were quick-logged with no macros: You and
// insights.js leave such a day out of the macro averages rather than read it
// as a low-protein day, while the calorie averages keep it.
function daySummary() {
  const t = totals();
  const s = { cal: t.cal, p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f) };
  if (t.q > 0) s.q = t.q;
  return s;
}

function totals() {
  // `q` is the calories logged as quick entries — a number and nothing else.
  // They count toward the day's calories like any other, and they are the
  // reason the macro sums below can be honest zeros rather than guesses.
  const t = { cal: 0, p: 0, c: 0, f: 0, q: 0, micro: {}, microCount: {}, n: 0 };
  Object.values(dayLog).forEach(e => {
    t.cal += e.cal || 0; t.p += e.p || 0; t.c += e.c || 0; t.f += e.f || 0; t.n++;
    if (e.src === 'quick') t.q += e.cal || 0;
    if (e.micro) for (const [k] of MICROS) {
      if (e.micro[k] != null) {
        t.micro[k] = (t.micro[k] || 0) + e.micro[k];
        t.microCount[k] = (t.microCount[k] || 0) + 1;
      }
    }
  });
  t.p = r1(t.p); t.c = r1(t.c); t.f = r1(t.f);
  return t;
}

function newEntryId() {
  return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

/* ---------- entry <-> JSON ----------
   The shape the paste importer already understands, so anything you copy out
   of the log can go straight back in on another day. */
function entryJson(e) {
  const o = {
    name: e.name,
    qty: e.qty || '',
    cal: e.cal || 0,
    p: r1(e.p || 0), c: r1(e.c || 0), f: r1(e.f || 0),
    meal: e.meal || defaultMeal()
  };
  if (e.micro && Object.keys(e.micro).length) o.micro = e.micro;
  return JSON.stringify({ items: [o] }, null, 2);
}

// Write entries onto today's log whatever day is on screen, then land there.
async function logOnToday(entries) {
  if (!isToday()) { viewDate = new Date(); await loadDay(); }
  entries.forEach(e => {
    const id = newEntryId();
    dayLog[id] = { id, t: Date.now(), ...e };
    rememberEntry(e);
  });
  await saveDay();
  render();
}

function addEntries(list) {
  const now = Date.now();
  list.forEach((entry, i) => {
    const id = newEntryId();
    // The offset keeps a six-ingredient meal in the order it was built rather
    // than in whatever order equal timestamps happen to sort.
    dayLog[id] = { id, t: now + i, ...entry };
    rememberEntry(entry);
  });
  saveDay();
  render();
}

function addEntry(entry) { addEntries([entry]); }

function touchItem(id) {
  if (!items[id]) return;
  items[id].uses = (items[id].uses || 0) + 1;
  items[id].last = Date.now();
  write('food/items', items);
}

/* ---------- portion maths on an already-logged entry ----------
   Two kinds of entry, two kinds of arithmetic. One linked to a saved food
   scales by amount, so 1.5 scoops is recomputed from the item and the gram
   maths stays honest. Anything else scales against the numbers it was logged
   with — which means the original has to be remembered, or ×2 then ×0.5
   quietly rounds the entry away from where it started. `baseN` is that memory:
   one portion's worth, whatever the entry currently shows. */
function stripMult(qty) {
  return String(qty || '').replace(/\s*×\s*[\d.]+\s*$/, '').trim();
}

function entryBase(e) {
  if (!e.baseN) {
    // An entry scaled by the old chips carries `mult` but no base. Unwind it
    // rather than treating the doubled numbers as one portion.
    const m = e.mult || 1;
    e.baseN = {
      cal: Math.round((e.cal || 0) / m),
      p: r1((e.p || 0) / m), c: r1((e.c || 0) / m), f: r1((e.f || 0) / m)
    };
    if (e.micro) {
      e.baseN.micro = {};
      for (const k of Object.keys(e.micro)) e.baseN.micro[k] = r1(e.micro[k] / m);
    }
    if (e.qtyBase == null) e.qtyBase = stripMult(e.qty);
  }
  return e.baseN;
}

// Absolute, not relative. setEntryMult(e, 2) means twice the original however
// many times it has already been scaled.
function setEntryMult(e, mult) {
  const b = entryBase(e);
  const m = Math.max(0, r1(mult));
  e.cal = Math.round(b.cal * m);
  e.p = r1(b.p * m); e.c = r1(b.c * m); e.f = r1(b.f * m);
  if (b.micro) {
    e.micro = {};
    for (const k of Object.keys(b.micro)) e.micro[k] = r1(b.micro[k] * m);
  }
  e.mult = m;
  e.qty = m === 1 ? (e.qtyBase || '')
    : (e.qtyBase ? e.qtyBase + ' × ' + trimNum(m) : '× ' + trimNum(m));
}

// Relative, for the ×2 / ×3 / ×4 / Half chips.
function scaleEntry(e, factor) {
  const item = e.itemId ? items[e.itemId] : null;

  if (item && e.amt) {
    const amt = r1(e.amt * factor);
    const m = macrosFor(item, amt, e.unit || 'serv');
    if (m) {
      Object.assign(e, m, { amt, qty: qtyLabel(item, amt, e.unit || 'serv') });
      return;
    }
  }
  setEntryMult(e, (e.mult || 1) * factor);
}

function macroLine(e) {
  return (e.cal || 0) + ' kcal   ·   P ' + trimNum(e.p || 0) +
    '   C ' + trimNum(e.c || 0) + '   F ' + trimNum(e.f || 0);
}

function macroTotals(list) {
  return list.reduce((s, e) => ({
    cal: s.cal + (e.cal || 0), p: r1(s.p + (e.p || 0)),
    c: r1(s.c + (e.c || 0)), f: r1(s.f + (e.f || 0))
  }), { cal: 0, p: 0, c: 0, f: 0 });
}

/* A food already in the library under this exact name. What makes "save this"
   an update rather than a second copy of the same thing. */
function libraryMatch(name) {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return null;
  return Object.values(items).find(it => (it.name || '').trim().toLowerCase() === n) || null;
}

/* One tap from a logged food to a saved one. The serving IS the portion that
   was eaten — the entry's numbers are already for that much — so the label
   carries the portion text and logging it again at ×1 needs no arithmetic.
   The entry is then linked to the new item, which upgrades its amount control
   from a multiplier to a real portion picker. */
function saveEntryAsItem(e) {
  const base = entryBase(e);
  const mult = e.mult || 1;
  const id = 'u' + Date.now().toString(36);
  items[id] = {
    id,
    ...mkItem(e.name, '', 'serv', { label: stripMult(e.qty) || 'serving' },
      { cal: base.cal, p: base.p, c: base.c, f: base.f }, base.micro || null),
    uses: 1, last: Date.now()
  };
  write('food/items', items);

  e.itemId = id; e.amt = mult; e.unit = 'serv';
  e.qty = qtyLabel(items[id], mult, 'serv');
  delete e.baseN; delete e.qtyBase; delete e.mult;
  return items[id];
}

/* ================= RENDER ================= */
export function render() {
  const root = $('#view-food');
  if (!root) return;
  warmScanner();
  root.innerHTML = '';
  const wrap = el('div', 'screen-pad');

  // header + date nav
  const hd = el('div', 'cal-hd');
  const left = el('div');
  left.appendChild(el('div', 'eyebrow', 'Fuel'));
  const title = isToday() ? 'Today'
    : viewDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const h1 = el('h1', isToday() ? null : 'h1-link', title);
  if (!isToday()) {
    // Browsing back a week is one tap a day; getting home used to be the same
    // again. The date itself is the way back.
    h1.setAttribute('role', 'button');
    h1.setAttribute('aria-label', 'Back to today');
    h1.tabIndex = 0;
    h1.onclick = async () => { viewDate = new Date(); await loadDay(); render(); };
    h1.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); h1.onclick(); } };
  }
  left.appendChild(h1);
  hd.appendChild(left);

  const nav = el('div', 'cal-nav');
  const gear = el('button', 'gear-btn');
  gear.setAttribute('aria-label', 'Fuel settings');
  gear.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' +
    '</svg>';
  gear.onclick = openFuelSettings;
  nav.appendChild(gear);

  const prev = el('button', null, '‹'); prev.setAttribute('aria-label', 'Previous day');
  const next = el('button', null, '›'); next.setAttribute('aria-label', 'Next day');
  prev.onclick = async () => { viewDate = new Date(viewDate.getTime() - 864e5); await loadDay(); render(); };
  next.onclick = async () => { viewDate = new Date(viewDate.getTime() + 864e5); await loadDay(); render(); };
  next.disabled = isToday();
  nav.append(prev, next);
  hd.appendChild(nav);
  wrap.appendChild(hd);

  wrap.appendChild(renderSummary());
  wrap.appendChild(renderWaterStrip(!isFuture()));

  MEALS.forEach(([id, label]) => wrap.appendChild(renderMeal(id, label)));

  // A whole past day, forward in one go: the same breakfast, lunch and dinner
  // as the day you are looking at.
  const all = Object.values(dayLog).filter(e => e && e.name);
  if (!isToday() && all.length) {
    const b = el('button', 'btn btn-ghost btn-block', 'Copy this whole day to today');
    b.style.marginBottom = '12px';
    b.onclick = () => copyToToday(all.sort((a, b) => (a.t || 0) - (b.t || 0)));
    wrap.appendChild(b);
  }

  wrap.appendChild(renderWater(!isFuture()));
  wrap.appendChild(renderMicros());
  root.appendChild(wrap);
  root.appendChild(renderFab());
}

/* ---------- the button ----------
   Logging food is the thing this tab exists for, and it used to be four taps
   down inside a meal card. It floats above the dock now, at thumb height, so it
   is reachable one-handed with a fork in the other. Fixed rather than in the
   flow, so it is still there at the bottom of a long day. */
let fabSeen = false;
function renderFab() {
  // render() rebuilds the whole tab on every edit, so the entrance animation
  // would replay each time a number changed. It plays once a session instead.
  const fab = el('button', 'fuel-fab' + (fabSeen ? ' settled' : ''));
  fabSeen = true;
  fab.setAttribute('aria-label', 'Log food');
  fab.appendChild(icon('plus', '2.6'));
  fab.appendChild(el('span', null, 'Log food'));
  fab.onclick = () => openAdd(null);
  return fab;
}

function renderSummary() {
  const t = totals();
  const card = el('div', 'card fuel-sum');

  // The bar is the most information on the tab in the least space, and none
  // of it is labelled with more than one word. The dots open the key.
  const more = el('button', 'ex-menu fuel-more', '⋯');
  more.setAttribute('aria-label', 'What the bar means');
  more.onclick = () => openBarGuide(t);
  card.appendChild(more);

  const top = el('div', 'fuel-top');
  const remain = targets.cal - t.cal;
  const mi = maintInfo();
  const z  = mi ? calorieZones(mi.cal) : null;

  const big = el('div', 'load-num num');
  big.style.fontSize = '40px';
  const sub = el('div');

  // One number, one meaning. This used to headline the distance from
  // maintenance with "N left" in small print under it, and on an empty
  // morning those were two different four-digit numbers with nothing between
  // them saying why — maintenance is measured, the target is the number you
  // eat to, and they are rarely the same. The big number is now what is left
  // to today's target, which is the one you act on; the distance from
  // maintenance moves under the bar, beside the bands it is measured against.
  // The colour is still the maintenance zone, so a day that is under target
  // but over maintenance reads red before the small print is read at all.
  const zone = z ? zoneOf(t.cal, z) : null;
  big.textContent = Math.abs(remain).toLocaleString();
  big.style.color = z ? zoneColor(zone) : (remain < 0 ? 'var(--miss)' : 'var(--chalk)');
  sub.appendChild(el('div', 'eyebrow', remain < 0 ? 'kcal over target' : 'kcal left today'));
  sub.appendChild(el('div', 'num fuel-eaten',
    t.cal.toLocaleString() + ' eaten  ·  target ' + targets.cal.toLocaleString()));
  top.append(big, sub);
  card.appendChild(top);

  card.appendChild(renderCalMeter(t.cal));

  const rows = [
    ['Protein', t.p, targets.p,      'var(--p-red)'],
    ['Carbs',   t.c, carbsTarget(),  'var(--p-yellow)'],
    ['Fat',     t.f, targets.f,      'var(--p-blue)']
  ];
  rows.forEach(([name, val, tgt, color]) => {
    const row = el('div', 'vol-row');
    row.appendChild(el('div', 'vol-name', name));
    const track = el('div', 'vol-track');
    const fill = el('div', 'vol-fill');
    fill.style.width = Math.min(100, tgt ? val / tgt * 100 : 0) + '%';
    fill.style.background = color;
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('div', 'vol-val num', trimNum(val) + '/' + tgt));
    card.appendChild(row);
  });
  if (t.q > 0) {
    card.appendChild(el('div', 'note quick-note',
      t.q.toLocaleString() + ' kcal of today was quick-logged with no macros, so the rows above are missing it.'));
  }
  return card;
}

function zoneColor(zone) {
  return zone === 'cut'      ? 'var(--p-blue)'
       : zone === 'maintain' ? 'var(--p-yellow)'
       : zone === 'gain'     ? 'var(--p-red)'
       :                       'var(--p-white)';
}

/* ---------- maintenance ----------
   A number you typed always wins; otherwise the estimate off the weight
   trend. Null means we genuinely don't know yet and shouldn't pretend. */
function maintInfo() {
  if (targets.maint > 0) return { cal: Math.round(targets.maint), auto: false };
  const m = maintenance(weighIns, summaries);
  if (m.tdee) return { cal: m.tdee, auto: true };
  return null;
}

/* ---------- the calorie bar ----------
   Bigger than the macro rows because it matters more. Two ticks split it into
   three bands: everything left of the first tick is a deficit, between the two
   is holding, past the second you're gaining. The dashed mark is the day's
   calorie target, wherever you've set it. */
/* Which way the account said it was going. The rule is tdee.js goalDir — the
   one You and Weight read too, so the three screens lean the same way; this
   only folds its "unknown" into "hold", which is what the bar draws for both. */
function goalSign(maintCal) {
  return goalDir(targets, maintCal) || 0;
}

function renderCalMeter(cal) {
  const wrap = el('div', 'cal-meter');
  const mi = maintInfo();
  const z  = mi ? calorieZones(mi.cal) : null;

  // A plain ruler from zero. For a while this was a window that started
  // well above zero with the morning squeezed into a striped runway at the
  // left, so that the goal's band could be the widest — and 960 kcal of
  // breakfast moved the head a few pixels and looked like nothing. What you
  // ate has to show as what you ate. So the scale is linear from nothing to
  // a top that leans with the goal instead: a cut stops just past the gain
  // tick so the blue is most of the bar, a bulk runs well into the red so
  // there is room to land there, and maintaining sits between. The top
  // always clears the target, so the dashed mark is always on the bar, and a
  // day past the top just pins full — the number above it says how far.
  let hi;
  if (z) {
    const b = z.band, g = goalSign(z.maint);
    hi = g < 0 ? z.gainFrom + 0.5 * b : g > 0 ? z.gainFrom + 3 * b : z.gainFrom + 1.5 * b;
    hi = Math.max(hi, targets.cal + b / 2);
  } else {
    hi = Math.max(targets.cal * 1.15, 1);
  }
  hi = Math.ceil(hi / 50) * 50;
  const pct = v => (v > 0 ? Math.min(100, v / hi * 100) : 0);

  const track = el('div', 'cal-track');
  if (z) {
    const band = (cls, from, to) => {
      const d = el('div', 'cal-zone ' + cls);
      d.style.left = pct(from) + '%';
      d.style.width = (pct(to) - pct(from)) + '%';
      return d;
    };
    track.append(band('cut', 0, z.cutTop), band('hold', z.cutTop, z.gainFrom), band('gain', z.gainFrom, hi));
  }
  const zone = zoneOf(cal, z);
  const fill = el('div', 'cal-fill');
  fill.style.width = pct(cal) + '%';
  fill.style.background = zoneColor(z ? zone : null);
  track.appendChild(fill);

  if (z) [z.cutTop, z.gainFrom].forEach(v => {
    const tk = el('div', 'cal-tick');
    tk.style.left = pct(v) + '%';
    track.appendChild(tk);
  });

  // The day's target, dashed so it is never mistaken for a band edge. This is
  // the number the headline counts down to, and it is drawn here so the
  // reader can see where it falls against maintenance without doing the sum.
  const tgt = el('div', 'cal-target');
  tgt.style.left = pct(targets.cal) + '%';
  track.appendChild(tgt);

  const head = el('div', 'cal-head');
  head.style.left = pct(cal) + '%';
  track.appendChild(head);
  wrap.appendChild(track);

  const legend = el('div', 'cal-bands');
  const lab = (txt, from, to) => {
    const w = pct(to) - pct(from);
    const d = el('div', 'cal-band-lab', w < 9 ? '' : txt);   // too narrow to read
    d.style.left = pct(from) + '%';
    d.style.width = w + '%';
    return d;
  };
  if (z) legend.append(lab('cut', 0, z.cutTop), lab('hold', z.cutTop, z.gainFrom), lab('gain', z.gainFrom, hi));
  // "target" is centred on its mark and sits on its own line below the band
  // words, so the two never collide whichever band the target falls in.
  const tl = el('div', 'cal-band-lab cal-target-lab', 'target');
  tl.style.left = pct(targets.cal) + '%';
  legend.appendChild(tl);
  wrap.appendChild(legend);

  if (z) {
    // The word for the zone and the distance from maintenance, together:
    // this is where the "N under maintenance" number went when the headline
    // became calories left to target.
    const gap = Math.round(cal - z.maint);
    const msg = (zone === 'cut'  ? 'In a deficit'
              :  zone === 'gain' ? 'Gaining'
              :                    'Holding') +
      ' · ' + Math.abs(gap).toLocaleString() + (gap <= 0 ? ' under' : ' over') + ' maintenance';
    const line = el('div', 'cal-status');
    const dot = el('i');
    dot.style.background = fill.style.background;
    line.append(dot, el('span', null, msg));
    line.appendChild(el('span', 'cal-maint num',
      'maint ' + z.maint.toLocaleString() + (mi.auto ? ' est.' : '')));
    wrap.appendChild(line);

    // The one case the two numbers genuinely disagree: a target that sits
    // on the wrong side of the measured maintenance for the stated goal.
    // Eating to it will not do what the goal says, and nothing else on the
    // screen would ever say so.
    const g = goalSign(z.maint);
    if ((g < 0 && targets.cal >= z.cutTop) || (g > 0 && targets.cal <= z.gainFrom)) {
      // Setup wrote a calorie target off a formula; the measured maintenance
      // then came in lower, and the target ended up in the wrong band while
      // the goal word stayed right. The word being right is exactly why the
      // goal sheet had nothing to change — so the fix is offered here, where
      // the problem is visible, as one button that moves the number.
      wrap.appendChild(noteEl('Your target is ' + (g < 0 ? 'at or above' : 'at or below') + ' your ' + (mi.auto ? 'measured ' : '') +
        'maintenance, so eating to it holds rather than ' + (g < 0 ? 'cuts' : 'bulks') + '.'));
      const p = previewGoal(g < 0 ? 'cut' : 'gain');
      if (p.changed && p.cal > 0) {
        const fixBtn = el('button', 'btn btn-ghost btn-block', 'Move target to ' + p.cal.toLocaleString() + ' kcal');
        fixBtn.style.marginTop = '8px';
        fixBtn.onclick = async () => {
          const cal = await setGoal(g < 0 ? 'cut' : 'gain');
          toast('Target is now ' + cal.toLocaleString() + ' kcal a day');
        };
        wrap.appendChild(fixBtn);
      }
    }
  } else {
    wrap.appendChild(noteEl('Set your maintenance calories in ⚙ Settings — or log a week of food alongside your weigh-ins — to mark the cut / maintain / gain lines on this bar.'));
  }
  return wrap;
}

/* A meal card is a read-out, nothing more. The per-meal "+ Add food" button
   left with the redesign — one Log food button does that job now, and four
   copies of the same action down the page were three too many. An empty meal
   collapses to a single header line rather than sitting there as a hollow box,
   so a fresh morning is four tidy rows instead of a wall of empty cards. */
function renderMeal(mealId, label) {
  const entries = Object.values(dayLog).filter(e => e.meal === mealId).sort((a, b) => (a.t || 0) - (b.t || 0));
  const kcal = entries.reduce((s, e) => s + (e.cal || 0), 0);

  const card = el('div', 'card' + (entries.length ? '' : ' meal-blank'));
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', label));

  const right = el('div', 'meal-right');
  if (entries.length) {
    right.appendChild(el('div', 'num meal-kcal', kcal + ' kcal'));
    if (!isToday()) {
      // Looking back at a day: bring this meal forward as it was.
      const fwd = el('button', 'meal-copy', 'to today ›');
      fwd.title = 'Copy this meal to today';
      fwd.setAttribute('aria-label', 'Copy ' + label + ' to today');
      fwd.onclick = () => copyToToday(entries);
      right.appendChild(fwd);
    }
    const save = el('button', 'ex-menu', '⋯');
    save.title = 'Turn this into a meal';
    save.onclick = () => openMealBuilder({
      id: 'm' + Date.now().toString(36),
      name: label + ' — ' + fmtViewDate(),
      items: entries.map(e => ({ ...cleanIng(e) })),
      saved: false
    }, mealId);
    right.appendChild(save);
  } else if (isToday() && !isFuture() && Object.values(prevLog).some(e => e && e.meal === mealId)) {
    // Nothing here yet, and yesterday had this meal: one tap repeats it.
    const again = el('button', 'meal-copy', 'copy yesterday’s ›');
    again.setAttribute('aria-label', 'Copy yesterday’s ' + label);
    again.onclick = () => copyFromPrev(mealId);
    right.appendChild(again);
  } else {
    right.appendChild(el('div', 'meal-kcal', 'nothing yet'));
  }
  hd.appendChild(right);
  card.appendChild(hd);

  entries.forEach(e => card.appendChild(renderEntry(e)));
  return card;
}

function renderEntry(e) {
  const row = el('button', 'food-entry');
  const body = el('div', 'fe-body');
  body.appendChild(el('div', 'fe-name', e.name));
  body.appendChild(el('div', 'fe-sub num', e.src === 'quick' ? 'calories only'
    : (e.qty ? e.qty + '  ·  ' : '') + 'P ' + trimNum(e.p || 0) + '  C ' + trimNum(e.c || 0) + '  F ' + trimNum(e.f || 0)));
  row.appendChild(body);
  row.appendChild(el('div', 'fe-cal num', String(e.cal || 0)));
  row.onclick = () => openEntry(e);
  return row;
}

function renderMicros() {
  const t = totals();
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Micronutrients'));
  card.appendChild(hd);

  const withData = Object.keys(t.micro).length;
  if (!t.n) { card.appendChild(noteEl('Nothing logged yet.')); return card; }
  if (!withData) { card.appendChild(noteEl('None of today’s foods carry micronutrient data.')); return card; }

  const grid = el('div', 'micro-grid');
  MICROS.forEach(([k, label, unit]) => {
    if (t.micro[k] == null) return;
    const cell = el('div');
    cell.appendChild(el('div', 'stat-val num', trimNum(t.micro[k]) + ' ' + unit));
    cell.appendChild(el('div', 'stat-lbl', label));
    const cov = el('div', 'stat-lbl micro-cov', t.microCount[k] + ' of ' + t.n + ' foods');
    cell.appendChild(cov);
    grid.appendChild(cell);
  });
  card.appendChild(grid);
  card.appendChild(noteEl('Sums cover only foods that report each value — treat these as floors, not truth.'));
  return card;
}

/* ================= ENTRY SHEET (edit / multiply / delete) ================= */
// Rebuilt wholesale on every change so the quick-multiply chips, the portion
// control and the raw number fields can never drift out of sync with each other.
function openEntry(e) {
  const { sh, close } = sheet(() => render());
  const body = el('div');
  sh.appendChild(body);

  function paint() {
    body.innerHTML = '';
    const item = e.itemId ? items[e.itemId] : null;

    body.appendChild(el('h2', null, e.name));
    body.appendChild(el('div', 'eyebrow', e.qty || ''));

    const readout = el('div', 'entry-readout num', macroLine(e));
    body.appendChild(readout);
    const repaint = () => { readout.textContent = macroLine(e); };

    /* ---- amount ----
       The chips are the fast path, because most corrections really are “I ate
       two of those”. The selector under them is the exact one, for the times it
       was a serving and a half, or 180 g, and no multiple of the original
       comes close. */
    body.appendChild(el('div', 'field-lbl', 'Amount'));

    const multRow = el('div', 'filter-row');
    [['\u00d72', 2], ['\u00d73', 3], ['\u00d74', 4], ['Half', 0.5]].forEach(([label, factor]) => {
      const c = el('button', 'chip', label);
      c.onclick = () => {
        scaleEntry(e, factor);
        saveDay();
        paint();
        toast(factor === 0.5 ? 'Halved' : 'Multiplied by ' + factor);
      };
      multRow.appendChild(c);
    });
    body.appendChild(multRow);

    if (item) {
      let first = true;
      body.appendChild(portionControl(item, e.amt || 1, e.unit || 'serv', (amt, unit, m) => {
        if (first) { first = false; return; }   // the control paints once on build
        Object.assign(e, m, { amt, unit, qty: qtyLabel(item, amt, unit) });
        delete e.qtyBase; delete e.mult; delete e.baseN;
        saveDay();
        repaint();
      }));
    } else {
      body.appendChild(multControl(e, () => { saveDay(); repaint(); }));
    }

    /* ---- keep it ----
       Saving is one tap from here rather than something you have to have
       thought about at the moment you logged it. */
    const known = item || libraryMatch(e.name);
    const keep = el('button', 'btn btn-ghost btn-block',
      known ? 'Edit “' + known.name + '” in my foods' : 'Save to my foods');
    keep.style.marginTop = '12px';
    keep.onclick = () => {
      if (known) { close(); openItemEdit(known, () => render()); return; }
      saveEntryAsItem(e);
      saveDay();
      paint();
      toast('Saved to my foods');
    };
    body.appendChild(keep);

    const again = el('button', 'btn btn-ghost btn-block', 'Log this again separately');
    again.style.marginTop = '8px';
    again.onclick = () => {
      const copy = { ...e };
      delete copy.id; delete copy.t;
      bump('foodCopy');
      addEntry({ ...copy, src: 'copy' });
      close();
      toast('Logged again');
    };
    body.appendChild(again);

    /* ---- reuse this food on another day ----
       Copy hands you the same JSON shape the paste importer eats, so an old
       entry can be lifted onto today (or into a chat with Claude). If you're
       looking at a past day the direct route is right there too. */
    const reuse = el('div', 'btn-split');
    reuse.style.marginTop = '8px';

    const cp = el('button', 'btn btn-ghost', 'Copy JSON');
    cp.onclick = () => copyText(entryJson(e), 'JSON copied \u2014 paste it in \u2699 \u203a Paste food JSON');
    reuse.appendChild(cp);

    if (!isToday()) {
      const toToday = el('button', 'btn btn-ghost', 'Log on today');
      toToday.onclick = async () => {
        const copy = { ...e };
        delete copy.id; delete copy.t;
        bump('foodRepeat');
        await logOnToday([{ ...copy, src: 'repeat' }]);
        close();
        toast('Logged on today');
      };
      reuse.appendChild(toToday);
    }
    body.appendChild(reuse);

    /* ---- raw numbers ----
       Only for an entry with no saved food behind it. When there is one, the
       portion picker above is already the exact control and typing a fifth
       number here would just contradict it. */
    if (!item) {
      body.appendChild(el('div', 'field-lbl', 'Exact numbers'));
      const mkNum = (key, label) => {
        const f = el('div', 'field');
        f.appendChild(el('label', null, label));
        const i = el('input'); i.type = 'number'; i.inputMode = 'decimal'; i.value = e[key] || 0;
        i.onchange = ev => {
          e[key] = key === 'cal'
            ? Math.round(clamp(parseFloat(ev.target.value) || 0, LIMITS.entryCal))
            : r1(clamp(parseFloat(ev.target.value) || 0, LIMITS.entryG));
          // A typed number is the new truth, so the multiplier bookkeeping
          // that was tracking the old one has to go.
          delete e.qtyBase; delete e.mult; delete e.baseN;
          saveDay();
          paint();
        };
        f.appendChild(i);
        return f;
      };
      const g1 = el('div', 'row-split');
      g1.append(mkNum('cal', 'kcal'), mkNum('p', 'Protein'));
      body.appendChild(g1);
      const g2 = el('div', 'row-split');
      g2.append(mkNum('c', 'Carbs'), mkNum('f', 'Fat'));
      body.appendChild(g2);
    }

    /* ---- meal mover ---- */
    body.appendChild(el('div', 'field-lbl', 'Meal'));
    const mealRow = el('div', 'filter-row');
    MEALS.forEach(([id, label]) => {
      const c = el('button', 'chip' + (e.meal === id ? ' on' : ''), label);
      c.onclick = () => { e.meal = id; saveDay(); paint(); };
      mealRow.appendChild(c);
    });
    body.appendChild(mealRow);

    const del = el('button', 'btn btn-danger btn-block', 'Delete entry');
    del.style.marginTop = '14px';
    del.onclick = () => { delete dayLog[e.id]; saveDay(); close(); };
    body.appendChild(del);

    const done = el('button', 'btn btn-ghost btn-block', 'Done');
    done.style.marginTop = '8px';
    done.onclick = close;
    body.appendChild(done);
  }

  paint();
}

/* The exact-amount control for a food with nothing saved behind it. There is
   no serving size to count in, so it counts in multiples of what was logged —
   0.5, 1.5, 2.25 — and shows what that comes to in calories. Typing 1.75 is
   the whole reason this exists; the stepper is there for thumbs. */
function multControl(e, onChange) {
  const box = el('div');
  entryBase(e);
  let m = e.mult || 1;

  const row = el('div', 'qty-row');
  const minus = el('button', 'btn btn-ghost', '\u2212');
  const inp = el('input');
  inp.type = 'number'; inp.inputMode = 'decimal'; inp.step = '0.25'; inp.min = '0';
  const plus = el('button', 'btn btn-ghost', '+');
  row.append(minus, inp, plus);

  const preview = el('div', 'num portion-preview');

  const show = () => {
    inp.value = trimNum(m);
    preview.textContent = '\u00d7 ' + trimNum(m) + ' of what you logged   \u00b7   ' +
      (e.cal || 0) + ' kcal';
  };
  const apply = () => { setEntryMult(e, m); show(); onChange(); };

  minus.onclick = () => { m = Math.max(0.25, r1(m - 0.25)); apply(); };
  plus.onclick  = () => { m = Math.min(LIMITS.mult[1], r1(m + 0.25)); apply(); };
  inp.onchange  = ev => { m = clamp(parseFloat(ev.target.value) || 1, LIMITS.mult); apply(); };

  box.append(row, preview);
  show();   // opening the sheet changes nothing, so don't write on build
  return box;
}

/* ================= ADD FLOW =================
   One button on the tab opens this. Everything that puts food in the log starts
   here, ordered by how often it actually gets reached for rather than by the
   order it was built: photo, words, barcode, typed numbers. The saved library
   and saved meals sit below a rule — genuinely useful, but not what you want in
   front of you while a plate goes cold. */

const ICON_PATHS = {
  plus:    ['M12 5v14', 'M5 12h14'],
  camera:  ['M4 9a2 2 0 0 1 2-2h1.5l1.2-2h6.6l1.2 2H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z',
            'M12 16.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z'],
  pen:     ['M4 20h4L18.5 9.5a2.6 2.6 0 0 0-3.7-3.7L4 16.3z', 'M13.6 7.1l3.7 3.7'],
  barcode: ['M3 6v12', 'M6.5 6v12', 'M10 6v8', 'M13.5 6v12', 'M17 6v8', 'M20.5 6v12'],
  keypad:  ['M4 5h16v14H4z', 'M8 9h.01', 'M12 9h.01', 'M16 9h.01', 'M8 13h.01', 'M12 13h.01', 'M16 13h.01', 'M8.5 17h7'],
  book:    ['M5 5a2 2 0 0 1 2-2h12v18H7a2 2 0 0 1-2-2z', 'M5 17h14'],
  stack:   ['M12 3l8 4.3-8 4.3-8-4.3z', 'M4 11.8L12 16l8-4.2', 'M4 16.2L12 20.5l8-4.3'],
  spark:   ['M12 3.5l1.7 4.6 4.6 1.7-4.6 1.7L12 16.1l-1.7-4.6L5.7 9.8l4.6-1.7z']
};

function icon(name, width) {
  const svg = svgEl('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': width || '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
  });
  (ICON_PATHS[name] || []).forEach(d => svg.appendChild(svgEl('path', { d })));
  return svg;
}

function mealChips(current, onPick) {
  const row = el('div', 'filter-row');
  MEALS.forEach(([id, label]) => {
    const c = el('button', 'chip' + (current === id ? ' on' : ''), label);
    c.onclick = () => {
      row.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
      onPick(id);
    };
    row.appendChild(c);
  });
  return row;
}

function fmtViewDate() {
  return viewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function openAdd(mealId) {
  const { sh, close } = sheet();
  let meal = mealId || defaultMeal();

  sh.appendChild(el('div', 'eyebrow', isToday() ? 'Add to' : 'Add to ' + fmtViewDate()));
  sh.appendChild(mealChips(meal, v => { meal = v; }));

  /* ---- recent ----
     The last ten distinct things logged, out of the last fortnight. Food
     memory holds these and more but sits in settings, two layers away, and
     the things you eat every week belong at the top of the sheet you log
     from. Painted when the reads land so the sheet never waits on them. */
  const recentWrap = el('div', 'recent-wrap');
  sh.appendChild(recentWrap);
  recentEntries().then(list => {
    if (!list.length || !sh.isConnected) return;
    recentWrap.appendChild(el('div', 'field-lbl', 'Recent'));
    const row = el('div', 'recent-row');
    list.forEach(e => {
      const b = el('button', 'recent-chip');
      b.appendChild(el('span', 'rc-name', e.name));
      b.appendChild(el('span', 'rc-cal num', (e.cal || 0) + ' kcal' + (e.qty ? ' · ' + e.qty : '')));
      b.onclick = () => {
        close();
        bump('foodRepeat');
        addEntry({ ...cleanIng(e), meal, src: 'repeat' });
        toast('Logged ' + e.name);
      };
      row.appendChild(b);
    });
    recentWrap.appendChild(row);
  }).catch(() => {});

  const grid = el('div', 'add-grid');
  const tile = (cls, ic, title, desc, tag, fn) => {
    const b = el('button', 'add-tile' + (cls ? ' ' + cls : ''));
    const box = el('div', 'ic');
    box.appendChild(icon(ic));
    b.append(box, el('div', 't', title), el('div', 'd', desc));
    if (tag) b.appendChild(el('div', 'tag', tag));
    b.onclick = () => { close(); fn(meal); };
    grid.appendChild(b);
  };

  tile('hero', 'camera',  'Photo',    'Snap the plate. Claude reads the macros off it.', 'ai', openPhotoFlow);
  tile('lit',  'pen',     'Describe', 'Just say what you ate. Cheapest way in.',         'ai', openDescribeFlow);
  tile(null,   'barcode', 'Barcode',  'Scan a package label.',                           null, m => openScanner(code => lookupBarcode(code, m)));
  tile(null,   'keypad',  'Manual',   'You already know the numbers.',                   null, m => openManual(m));
  sh.appendChild(grid);

  /* ---- quick log ----
     Calories only: no name, no macros, one number and Log. Self-monitoring
     frequency is what predicts outcomes and an abbreviated log does nearly as
     well as a full one, so the cheapest possible entry belongs on this sheet.
     It saves as src 'quick' with zero macros, and daySummary() records how
     many of the day's calories came in this way so You can leave the day out
     of the macro averages instead of reading it as a zero-protein day. */
  sh.appendChild(el('div', 'field-lbl', 'Just the calories'));
  const quick = el('div', 'quick-log');
  const qin = el('input');
  qin.type = 'number'; qin.inputMode = 'numeric'; qin.placeholder = 'kcal';
  qin.min = 1; qin.max = LIMITS.entryCal[1];
  qin.setAttribute('aria-label', 'Calories to quick-log');
  const qbtn = el('button', 'btn btn-primary', 'Quick log');
  qbtn.onclick = () => {
    const cal = Math.round(parseFloat(qin.value));
    if (!(cal > 0) || !within(cal, LIMITS.entryCal)) { toast('Enter the calories'); qin.focus(); return; }
    close();
    bump('foodManual');
    addEntry({ name: 'Quick log', qty: '', cal, p: 0, c: 0, f: 0, meal, src: 'quick' });
    toast(cal.toLocaleString() + ' kcal logged');
  };
  qin.onkeydown = e => { if (e.key === 'Enter') qbtn.onclick(); };
  quick.append(qin, qbtn);
  sh.appendChild(quick);

  if (!hasProxy()) {
    const warn = el('button', 'ai-warn');
    warn.append(icon('spark', '1.6'), el('span', null, 'Photo and Describe need the estimator connected — set it up'));
    warn.onclick = () => { close(); openAiSettings(); };
    sh.appendChild(warn);
  }

  sh.appendChild(el('div', 'add-rule'));
  sh.appendChild(el('div', 'field-lbl', 'Saved'));

  const sec = el('div', 'add-secondary');

  const foodsBtn = el('button', 'btn btn-ghost');
  foodsBtn.append(icon('book'), el('span', null, 'Foods'), el('span', 'cnt num', String(Object.keys(items).length)));
  foodsBtn.onclick = () => { close(); openLibrary(meal); };

  const mealsBtn = el('button', 'btn btn-ghost');
  mealsBtn.append(icon('stack'), el('span', null, 'Meals'), el('span', 'cnt num', String(Object.keys(meals).length)));
  mealsBtn.onclick = () => { close(); openMealsSheet(meal); };

  sec.append(foodsBtn, mealsBtn);
  sh.appendChild(sec);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '12px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

// The home-screen shortcut's way in (app.js restoreView): Fuel, with the log
// sheet already up.
export function openLogFood() { openAdd(null); }

/* The most recent distinct entries across the last fortnight, newest first,
   by name. Quick logs are left out — there is nothing to repeat. store.read()
   is mirror-cached, so this is fourteen cheap reads on a warm device. */
async function recentEntries(n = 10, days = 14) {
  const keys = [];
  for (let i = 0; i < days; i++) keys.push(todayKey(new Date(Date.now() - i * 864e5)));
  const logs = await Promise.all(keys.map(k => k === dk(viewDate) ? dayLog : read('food/log/' + k, null)));
  const all = [];
  logs.forEach(l => Object.values(l || {}).forEach(e => { if (e && e.name && e.src !== 'quick') all.push(e); }));
  all.sort((a, b) => (b.t || 0) - (a.t || 0));
  const seen = new Set(), out = [];
  for (const e of all) {
    const k = String(e.name).trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
    if (out.length >= n) break;
  }
  return out;
}

/* ---------- saved foods ----------
   Deleting was the missing half of this screen: everything scanned or typed
   piled up here forever, including the one-off protein bar from a gas station
   in March. A food leaves the library without touching anything already logged
   with it — those entries carry their own numbers. */
function openLibrary(mealId, onPick) {
  const { sh, close } = sheet();
  sh.appendChild(el('h2', null, 'My foods'));

  const search = el('div', 'picker-search');
  const inp = el('input');
  inp.type = 'search';
  inp.placeholder = 'Search saved foods';
  search.appendChild(inp);
  sh.appendChild(search);

  const list = el('div', 'ex-list');
  sh.appendChild(list);

  let q = '';
  inp.oninput = ev => { q = ev.target.value.toLowerCase().trim(); paint(); };

  const reopen = () => openLibrary(mealId, onPick);

  function paint() {
    list.innerHTML = '';
    const pool = Object.values(items)
      .filter(it => !q || it.name.toLowerCase().includes(q) || (it.brand || '').toLowerCase().includes(q))
      .sort((a, b) => (b.last || 0) - (a.last || 0) || (b.uses || 0) - (a.uses || 0) || a.name.localeCompare(b.name));

    if (!pool.length) {
      list.appendChild(noteEl(q
        ? 'Nothing saved matches that.'
        : 'Nothing saved yet. Anything you scan, type by hand, or keep off an estimate lands here \u2014 or build one below.'));
      return;
    }

    pool.slice(0, 120).forEach(it => {
      const b = el('button', 'ex-item');
      b.appendChild(el('span', 'nm', it.name));
      const per = it.base === '100g' ? 'per 100 g' : 'per ' + ((it.serv && it.serv.label) || 'serving');
      b.appendChild(el('span', 'eq num', it.n.cal + ' kcal ' + per));
      b.onclick = () => { close(); openPortion(it, mealId, onPick); };

      // Editing lives on the row rather than one level down, because the
      // reason you came here is usually that the numbers are wrong.
      const ed = el('span', 'eq ex-del ex-edit', '\u270e');
      ed.setAttribute('aria-label', 'Edit ' + it.name);
      ed.onclick = ev => {
        ev.stopPropagation();
        close();
        openItemEdit(it, reopen);
      };
      b.appendChild(ed);

      const x = el('span', 'eq ex-del', '\u2715');
      x.setAttribute('aria-label', 'Delete ' + it.name);
      x.onclick = ev => {
        ev.stopPropagation();
        confirmSheet({
          title: 'Delete this food?',
          body: '\u201c' + it.name + '\u201d leaves your library. Anything already logged with it stays exactly as it is.',
          confirmLabel: 'Delete',
          danger: true,
          onConfirm: async () => {
            delete items[it.id];
            await write('food/items', items);
            paint();
            toast('Deleted');
          }
        });
      };
      b.appendChild(x);
      list.appendChild(b);
    });
  }
  paint();

  const add = el('button', 'btn btn-primary btn-block', '+  New food');
  add.style.marginTop = '12px';
  add.onclick = () => { close(); openItemEdit(null, reopen); };
  sh.appendChild(add);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Close');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ---------- one saved food ----------
   The library used to be write-once: whatever a barcode or an estimate put in
   was what it said forever. This is the other half of it \u2014 the name was
   wrong, the serving is 44 g and not 40, the brand quietly changed the recipe.

   Editing here never rewrites history. Every logged entry carries its own
   numbers, and going back to correct days that have already been summed would
   move the maintenance estimate under you without saying so. */
function openItemEdit(item, onDone) {
  const isNew = !item;
  const draft = item
    ? JSON.parse(JSON.stringify(item))
    : {
        id: 'u' + Date.now().toString(36), name: '', brand: '', base: 'serv',
        serv: { label: 'serving', grams: null },
        n: { cal: 0, p: 0, c: 0, f: 0 }, micro: null, uses: 0, last: 0
      };

  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', isNew ? 'My foods' : 'Saved food'));
  sh.appendChild(el('h2', null, isNew ? 'New food' : draft.name));

  const f = (label, val, type) => {
    const w = el('div', 'field');
    w.appendChild(el('label', null, label));
    const i = el('input');
    i.type = type || 'number';
    if (i.type === 'number') i.inputMode = 'decimal';
    if (val != null && val !== '') i.value = val;
    w.appendChild(i);
    w.input = i;
    return w;
  };

  const name  = f('Name', draft.name, 'text');
  const brand = f('Brand (optional)', draft.brand, 'text');
  sh.append(name, brand);

  /* What the four numbers below are FOR. Per serving is how a package reads;
     per 100 g is how a scale reads. Both convert, as long as the grams are in. */
  let base = draft.base === '100g' ? '100g' : 'serv';
  sh.appendChild(el('div', 'field-lbl', 'The numbers are'));
  sh.appendChild(segmented([['serv', 'Per serving'], ['100g', 'Per 100 g']], base, v => { base = v; }));

  const servRow = el('div', 'row-split');
  servRow.style.marginTop = '10px';
  const label = f('Serving is called', (draft.serv && draft.serv.label) || '', 'text');
  const grams = f('Grams per serving', draft.serv && draft.serv.grams);
  servRow.append(label, grams);
  sh.appendChild(servRow);
  sh.appendChild(noteEl('Grams per serving is what lets the portion picker switch between servings and the scale. Leave it blank if you don\u2019t know it.'));

  sh.appendChild(el('div', 'field-lbl', 'Macros'));
  const g1 = el('div', 'row-split');
  const cal = f('kcal', draft.n.cal), pr = f('Protein g', draft.n.p);
  g1.append(cal, pr); sh.appendChild(g1);
  const g2 = el('div', 'row-split');
  const cb = f('Carbs g', draft.n.c), ft = f('Fat g', draft.n.f);
  g2.append(cb, ft); sh.appendChild(g2);

  sh.appendChild(el('div', 'field-lbl', 'Micronutrients (optional)'));
  const microIn = {};
  for (let i = 0; i < MICROS.length; i += 2) {
    const row = el('div', 'row-split');
    MICROS.slice(i, i + 2).forEach(([k, lbl, unit]) => {
      const w = f(lbl + ' ' + unit, draft.micro && draft.micro[k] != null ? draft.micro[k] : '');
      microIn[k] = w.input;
      row.appendChild(w);
    });
    sh.appendChild(row);
  }

  const go = el('button', 'btn btn-primary btn-block btn-lg', isNew ? 'Save food' : 'Save changes');
  go.style.marginTop = '16px';
  go.onclick = async () => {
    const nm = name.input.value.trim();
    if (!nm) { toast('Give it a name'); name.input.focus(); return; }

    const mac = readMacros(cal.input, pr.input, cb.input, ft.input);
    if (!mac) return;
    if (!mac.cal) { toast('It needs calories'); cal.input.focus(); return; }

    const gramsVal = parseFloat(grams.input.value);
    if (gramsVal > LIMITS.servG[1]) { toast('A serving can’t be more than ' + LIMITS.servG[1].toLocaleString() + ' g'); grams.input.focus(); return; }
    const lbl = label.input.value.trim();

    const micro = {};
    MICROS.forEach(([k]) => {
      const v = parseFloat(microIn[k].value);
      if (!isNaN(v)) micro[k] = r1(clamp(v, LIMITS.micro));
    });

    items[draft.id] = {
      ...draft,
      id: draft.id,
      name: nm,
      brand: brand.input.value.trim(),
      base,
      serv: (lbl || gramsVal > 0)
        ? { label: lbl || 'serving', grams: gramsVal > 0 ? gramsVal : null }
        : null,
      n: mac,
      micro: Object.keys(micro).length ? micro : null,
      last: draft.last || Date.now()
    };
    await write('food/items', items);
    close();
    toast(isNew ? 'Saved to my foods' : 'Updated');
    if (onDone) onDone();
  };
  sh.appendChild(go);

  if (!isNew) {
    const del = el('button', 'btn btn-danger btn-block', 'Delete food');
    del.style.marginTop = '8px';
    del.onclick = () => {
      confirmSheet({
        title: 'Delete this food?',
        body: '\u201c' + draft.name + '\u201d leaves your library. Anything already logged with it stays exactly as it is.',
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
          delete items[draft.id];
          await write('food/items', items);
          close();
          toast('Deleted');
          if (onDone) onDone();
        }
      });
    };
    sh.appendChild(del);
  }

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);

  if (isNew) setTimeout(() => name.input.focus(), 80);
}

/* ================= MEALS =================
   Chick-fil-A, Panda Express, the build-your-own-bowl place: the same short
   list of components every time, in different amounts. So a meal here is an
   ingredient list you can re-price, not a frozen total — open it, change the
   rice from one scoop to two, log it.

   Saving is opt-out, not opt-in. Most meals are eaten once and the library
   should not fill up with them; the ones worth keeping get the tick. */

function blankMeal() {
  return { id: 'm' + Date.now().toString(36), name: '', items: [], saved: false };
}

// What goes into food/meals: the ingredient as it stands, without the
// multiplier bookkeeping. Saving means "keep it at these amounts", and the
// stored numbers become the baseline the next time it is opened.
function cleanIng(i) {
  const o = {
    name: i.name, qty: i.qty || '',
    cal: i.cal || 0, p: r1(i.p || 0), c: r1(i.c || 0), f: r1(i.f || 0)
  };
  if (i.micro && Object.keys(i.micro).length) o.micro = i.micro;
  if (i.itemId) { o.itemId = i.itemId; o.amt = i.amt; o.unit = i.unit || 'serv'; }
  return o;
}

function openMealsSheet(mealId) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Fuel'));
  sh.appendChild(el('h2', null, 'My meals'));

  const list = el('div', 'rt-list');
  sh.appendChild(list);

  function paint() {
    list.innerHTML = '';
    const pool = Object.values(meals).filter(m => m && m.id);
    if (!pool.length) {
      const es = el('div', 'empty-state');
      es.appendChild(el('h3', null, 'No meals yet'));
      es.appendChild(el('p', null,
        'A meal is an ingredient list with amounts you can change before you log it. Build one below, or tap \u22ef on a meal card to keep what you already ate.'));
      list.appendChild(es);
      return;
    }

    pool.sort((a, b) => (b.last || 0) - (a.last || 0) || (a.name || '').localeCompare(b.name || ''));
    pool.forEach(m => {
      const t = macroTotals(m.items || []);
      const row = el('button', 'rt-item');
      const mid = el('div', 'rt-mid');
      mid.appendChild(el('div', 'rt-name', m.name || 'Untitled meal'));
      const n = (m.items || []).length;
      mid.appendChild(el('div', 'rt-meta num',
        n + (n === 1 ? ' ingredient' : ' ingredients') + '  \u00b7  ' + t.cal + ' kcal  \u00b7  P ' + trimNum(t.p)));
      row.appendChild(mid);
      row.appendChild(el('span', 'rt-go', '\u203a'));
      row.onclick = () => {
        close();
        openMealBuilder({
          id: m.id, name: m.name,
          items: (m.items || []).map(i => ({ ...i })),
          saved: true
        }, mealId);
      };

      const x = el('span', 'ex-del', '\u2715');
      x.setAttribute('aria-label', 'Delete ' + m.name);
      x.onclick = ev => {
        ev.stopPropagation();
        confirmSheet({
          title: 'Delete saved meal?',
          body: '\u201c' + m.name + '\u201d is removed from your meals. Days you already logged it on keep their food.',
          confirmLabel: 'Delete',
          danger: true,
          onConfirm: async () => {
            delete meals[m.id];
            await write('food/meals', meals);
            paint();
            toast('Deleted');
          }
        });
      };
      row.appendChild(x);
      list.appendChild(row);
    });
  }
  paint();

  const add = el('button', 'btn btn-primary btn-block btn-lg', '+  New meal');
  add.style.marginTop = '12px';
  add.onclick = () => { close(); openMealBuilder(blankMeal(), mealId); };
  sh.appendChild(add);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Close');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ---------- the builder ---------- */
function openMealBuilder(draft, mealId) {
  const { sh, close } = sheet();
  let meal = mealId || defaultMeal();
  let asOne = false;
  let keep = !!draft.saved;

  const body = el('div');
  sh.appendChild(body);

  const rebuild = () => paint();

  function paint() {
    body.innerHTML = '';
    const t = macroTotals(draft.items);

    body.appendChild(el('div', 'eyebrow', draft.saved ? 'Saved meal' : 'New meal'));

    const nameWrap = el('div', 'field');
    nameWrap.appendChild(el('label', null, 'Name'));
    const nameIn = el('input');
    nameIn.type = 'text';
    nameIn.placeholder = 'Chick-fil-A, bowl, Sunday breakfast\u2026';
    nameIn.autocapitalize = 'words';
    nameIn.value = draft.name || '';
    nameIn.oninput = ev => { draft.name = ev.target.value; };
    nameWrap.appendChild(nameIn);
    body.appendChild(nameWrap);

    body.appendChild(el('div', 'entry-readout num',
      t.cal.toLocaleString() + ' kcal   \u00b7   P ' + trimNum(t.p) +
      '   C ' + trimNum(t.c) + '   F ' + trimNum(t.f)));

    /* ---- ingredients ---- */
    body.appendChild(el('div', 'field-lbl',
      draft.items.length ? draft.items.length + ' ingredients' : 'Ingredients'));

    if (!draft.items.length) {
      body.appendChild(noteEl('Add the components one at a time \u2014 from your saved foods, a barcode, a description, or straight off the receipt. Amounts are adjustable afterwards.'));
    }

    const list = el('div', 'import-list');
    draft.items.forEach((ing, idx) => {
      const row = el('div', 'food-entry pe-row');
      const b = el('button', 'pe-body');
      b.appendChild(el('div', 'fe-name', ing.name));
      b.appendChild(el('div', 'fe-sub num',
        (ing.qty ? ing.qty + '  \u00b7  ' : '') +
        'P ' + trimNum(ing.p || 0) + '  C ' + trimNum(ing.c || 0) + '  F ' + trimNum(ing.f || 0)));
      b.onclick = () => openIngredient(ing, rebuild, () => { draft.items.splice(idx, 1); rebuild(); });
      row.appendChild(b);
      row.appendChild(el('div', 'fe-cal num', String(ing.cal || 0)));

      const x = el('button', 'ex-del pe-x', '\u2715');
      x.setAttribute('aria-label', 'Remove ' + ing.name);
      x.onclick = () => { draft.items.splice(idx, 1); rebuild(); };
      row.appendChild(x);
      list.appendChild(row);
    });
    body.appendChild(list);

    const add = el('button', 'btn btn-ghost btn-block', '+  Add ingredient');
    add.style.marginTop = '10px';
    add.onclick = () => openIngredientSource(ing => { draft.items.push(ing); rebuild(); });
    body.appendChild(add);

    if (draft.items.length) {
      body.appendChild(el('div', 'field-lbl', 'Meal'));
      body.appendChild(mealChips(meal, v => { meal = v; }));

      /* One bowl is one thing you ate, and four lines in the log for it is
         four lines of noise. Six separate components you might correct one by
         one is the opposite. So it's a choice, defaulting to how the app has
         always logged a saved meal. */
      body.appendChild(el('div', 'field-lbl', 'Log it as'));
      body.appendChild(segmented(
        [['items', 'Separate items'], ['one', 'One entry']],
        asOne ? 'one' : 'items',
        v => { asOne = v === 'one'; }
      ));

      const keepWrap = el('label', 'save-check');
      keepWrap.style.marginTop = '14px';
      const chk = el('input');
      chk.type = 'checkbox';
      chk.checked = keep;
      chk.onchange = ev => { keep = ev.target.checked; };
      keepWrap.append(chk, document.createTextNode(
        draft.saved ? ' Keep these changes in my meals' : ' Also save this to my meals'));
      body.appendChild(keepWrap);

      const go = el('button', 'btn btn-primary btn-block btn-lg',
        'Log meal' + (isToday() ? '' : ' on ' + fmtViewDate()));
      go.style.marginTop = '4px';
      go.onclick = async () => {
        if (keep) await persistMeal(draft);
        logMeal(draft, meal, asOne);
        close();
        toast('Logged ' + (draft.name || 'meal'));
      };
      body.appendChild(go);

      const only = el('button', 'btn btn-ghost btn-block', 'Save without logging');
      only.style.marginTop = '8px';
      only.onclick = async () => {
        if (!draft.name.trim()) { toast('Give it a name first'); nameIn.focus(); return; }
        await persistMeal(draft);
        close();
        toast('Saved to my meals');
      };
      body.appendChild(only);
    }

    const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
    cancel.style.marginTop = '8px';
    cancel.onclick = close;
    body.appendChild(cancel);
  }

  paint();
}

async function persistMeal(draft) {
  const name = (draft.name || '').trim() || 'Meal — ' + todayKey();
  draft.name = name;
  draft.saved = true;
  meals[draft.id] = {
    id: draft.id, name,
    items: draft.items.map(cleanIng),
    last: Date.now()
  };
  await write('food/meals', meals);
}

function logMeal(draft, meal, asOne) {
  const name = (draft.name || '').trim() || 'Meal';
  bump('foodMeal');
  if (asOne) {
    const t = macroTotals(draft.items);
    const micro = {};
    draft.items.forEach(i => {
      if (!i.micro) return;
      for (const [k] of MICROS) if (i.micro[k] != null) micro[k] = r1((micro[k] || 0) + i.micro[k]);
    });
    const one = {
      name, qty: draft.items.length + ' ingredients',
      cal: t.cal, p: t.p, c: t.c, f: t.f, meal, src: 'meal'
    };
    if (Object.keys(micro).length) one.micro = micro;
    addEntries([one]);
  } else {
    addEntries(draft.items.map(i => ({ ...cleanIng(i), meal, src: 'meal' })));
  }
  // The whole meal under its own name, so describing it next time is free.
  if (draft.name.trim()) recallRemember(draft.name, draft.items.map(cleanIng), 'log');
}

/* ---------- where an ingredient comes from ---------- */
function openIngredientSource(onPick) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Add to meal'));
  sh.appendChild(el('h2', null, 'What went in?'));

  const grid = el('div', 'add-grid');
  const tile = (cls, ic, title, desc, tag, fn) => {
    const b = el('button', 'add-tile' + (cls ? ' ' + cls : ''));
    const box = el('div', 'ic');
    box.appendChild(icon(ic));
    b.append(box, el('div', 't', title), el('div', 'd', desc));
    if (tag) b.appendChild(el('div', 'tag', tag));
    b.onclick = () => { close(); fn(); };
    grid.appendChild(b);
  };

  tile('hero', 'book',    'My foods',  'The things you eat over and over.', null,
    () => openLibrary(null, onPick));
  tile('lit',  'pen',     'Describe',  'One line, Claude does the macros.', 'ai',
    () => openDescribeFlow(null, '', onPick));
  tile(null,   'barcode', 'Barcode',   'Scan the package.', null,
    () => openScanner(code => lookupBarcode(code, null, onPick)));
  tile(null,   'keypad',  'By hand',   'Numbers off the menu board.', null,
    () => openManual(null, null, onPick));
  sh.appendChild(grid);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '12px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ---------- one ingredient's amount ----------
   The same two controls the entry sheet uses, because it is the same question:
   a saved food scales by portion, everything else by multiple. */
function openIngredient(ing, onDone, onRemove) {
  const { sh, close } = sheet(onDone);
  const body = el('div');
  sh.appendChild(body);

  function paint() {
    body.innerHTML = '';
    const item = ing.itemId ? items[ing.itemId] : null;

    body.appendChild(el('h2', null, ing.name));
    body.appendChild(el('div', 'eyebrow', ing.qty || ''));
    const readout = el('div', 'entry-readout num', macroLine(ing));
    body.appendChild(readout);
    const repaint = () => { readout.textContent = macroLine(ing); };

    body.appendChild(el('div', 'field-lbl', 'Amount'));
    const chips = el('div', 'filter-row');
    [['\u00d72', 2], ['\u00d73', 3], ['\u00d74', 4], ['Half', 0.5]].forEach(([label, factor]) => {
      const c = el('button', 'chip', label);
      c.onclick = () => { scaleEntry(ing, factor); paint(); };
      chips.appendChild(c);
    });
    body.appendChild(chips);

    if (item) {
      let first = true;
      body.appendChild(portionControl(item, ing.amt || 1, ing.unit || 'serv', (amt, unit, m) => {
        if (first) { first = false; return; }
        Object.assign(ing, m, { amt, unit, qty: qtyLabel(item, amt, unit) });
        delete ing.qtyBase; delete ing.mult; delete ing.baseN;
        repaint();
      }));
    } else {
      body.appendChild(multControl(ing, repaint));
    }

    const nameWrap = el('div', 'field');
    nameWrap.style.marginTop = '14px';
    nameWrap.appendChild(el('label', null, 'Name'));
    const nameIn = el('input');
    nameIn.type = 'text';
    nameIn.value = ing.name;
    nameIn.oninput = ev => { ing.name = ev.target.value; };
    nameWrap.appendChild(nameIn);
    body.appendChild(nameWrap);

    const rm = el('button', 'btn btn-danger btn-block', 'Remove from meal');
    rm.style.marginTop = '10px';
    rm.onclick = () => { close(); onRemove(); };
    body.appendChild(rm);

    const done = el('button', 'btn btn-ghost btn-block', 'Done');
    done.style.marginTop = '8px';
    done.onclick = close;
    body.appendChild(done);
  }

  paint();
}

/* ================= AI ESTIMATOR =================
   The whole point of this update: no more photographing a plate in one app,
   copying JSON out of a chat, and pasting it into this one. Picture goes in
   here, macros come back, you check them, you log.

   The app holds no API key. It sends the picture to the Worker in worker/,
   which holds the key and decides whether this sign-in is allowed to spend
   anything. worker/src/index.js is where the security actually lives. */

/* A file input, not getUserMedia. On iOS this opens the real camera app with
   the real capture UI and hands back a proper still; a hand-rolled viewfinder
   gets a worse picture and an extra permission prompt. Without `capture` the
   same input offers the photo library instead. */
function pickImage(useCamera) {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    if (useCamera) inp.capture = 'environment';
    inp.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(inp);

    let settled = false;
    const finish = f => { if (settled) return; settled = true; inp.remove(); resolve(f || null); };

    inp.onchange = () => finish(inp.files && inp.files[0]);
    // There is no cross-browser "picker cancelled" event. Coming back to the
    // window with nothing chosen is the only signal we get.
    window.addEventListener('focus', () => {
      setTimeout(() => { if (!(inp.files && inp.files.length)) finish(null); }, 900);
    }, { once: true });

    inp.click();
  });
}

async function openPhotoFlow(mealId) {
  const file = await pickImage(true);
  if (!file) return;
  let shot;
  try { shot = await shrinkImage(file); }
  catch (e) { toast(e.message || 'Couldn’t read that picture.'); return; }
  openShotSheet(shot, mealId, '');
}

/* The picture is taken; this is the "want to tell it anything?" step. The
   sentence is worth more than the megapixels — it is what turns "some kind of
   beef bowl" into the right cut, the right rice and the right amount of oil. */
function openShotSheet(shot, mealId, prefill) {
  const { sh, close } = sheet();
  let meal = mealId || defaultMeal();

  sh.appendChild(el('div', 'eyebrow', 'Photo'));
  sh.appendChild(el('h2', null, 'Anything to add?'));

  const img = document.createElement('img');
  img.className = 'ai-shot';
  img.src = shot.dataUrl;
  img.alt = 'The food you photographed';
  sh.appendChild(img);

  const ta = document.createElement('textarea');
  ta.className = 'paste-box ai-text';
  ta.rows = 3;
  ta.placeholder = 'Optional — “6 oz sirloin, jasmine rice, cooked in butter”';
  ta.value = prefill || '';
  sh.appendChild(ta);
  sh.appendChild(noteEl('Skip it and it guesses from the picture alone. One line about portions or how it was cooked is usually the difference between close and right.'));

  sh.appendChild(el('div', 'field-lbl', 'Meal'));
  sh.appendChild(mealChips(meal, v => { meal = v; }));

  const go = el('button', 'btn btn-primary btn-block btn-lg', 'Estimate macros');
  go.style.marginTop = '12px';
  go.onclick = () => {
    const note = ta.value.trim();
    close();
    runEstimate({
      meal,
      busy: 'Reading your plate…',
      run: () => estimatePhoto(shot, note),
      retry: text => openShotSheet(shot, meal, text),
      text: note
    });
  };
  sh.appendChild(go);

  const other = el('button', 'btn btn-ghost btn-block', 'Use a different picture');
  other.style.marginTop = '8px';
  other.onclick = async () => {
    const f = await pickImage(false);
    if (!f) return;
    let next;
    try { next = await shrinkImage(f); }
    catch (e) { toast(e.message || 'Couldn’t read that picture.'); return; }
    close();
    openShotSheet(next, meal, ta.value.trim());
  };
  sh.appendChild(other);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* Words only. Roughly a tenth of what a photo costs, and for anything you
   cooked yourself and can describe precisely it is often the better answer —
   a picture cannot see the oil that already went into the pan. */
function openDescribeFlow(mealId, prefill, onPick) {
  const { sh, close } = sheet();
  let meal = mealId || defaultMeal();

  sh.appendChild(el('div', 'eyebrow', 'Describe'));
  sh.appendChild(el('h2', null, onPick ? 'What went in?' : 'What did you eat?'));

  const ta = document.createElement('textarea');
  ta.className = 'paste-box ai-text';
  ta.rows = 4;
  ta.placeholder = 'Two eggs fried in butter, three strips of bacon, a slice of sourdough';
  ta.value = prefill || '';
  sh.appendChild(ta);
  sh.appendChild(noteEl('Portions help most — “a cup”, “two palms”, “half the box”. Weights beat guesses, but a guess beats not logging it.'));

  if (!onPick) {
    sh.appendChild(el('div', 'field-lbl', 'Meal'));
    sh.appendChild(mealChips(meal, v => { meal = v; }));
  }

  const go = el('button', 'btn btn-primary btn-block btn-lg', 'Estimate macros');
  go.style.marginTop = '12px';
  go.onclick = () => {
    const text = ta.value.trim();
    if (!text) { toast('Tell it what you ate'); ta.focus(); return; }
    const ctx = {
      meal, onPick, mode: 'text',
      busy: 'Working out the macros…',
      run: () => estimateText(text),
      retry: t => openDescribeFlow(meal, t, onPick),
      text
    };
    close();
    // Your own log is free and instant. Check it before spending a request on
    // a sentence you have already paid to have read once.
    const hit = recallLookup(text);
    if (hit) { openRecallHit(hit, ctx); return; }
    runEstimate(ctx);
  };
  sh.appendChild(go);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

async function runEstimate(ctx) {
  // Every estimate the app pays for comes through here. A photo with a
  // sentence attached costs and reads differently from either half alone, so
  // it is counted as its own thing rather than folded into the photo number.
  bump(ctx.mode === 'text' ? 'aiText' : ctx.text ? 'aiPhotoText' : 'aiPhoto');
  const done = openEstimating(ctx.busy);
  let res;
  try {
    res = await ctx.run();
  } catch (e) {
    bump('aiFail');
    done();
    openAiError(e, ctx);
    return;
  }
  done();
  openAiReview(res, ctx);
}

function openEstimating(label) {
  const { back, sh, close } = sheet();
  back.onclick = null;   // a stray tap on the backdrop shouldn't abandon a paid call
  const row = el('div', 'ai-busy');
  row.appendChild(el('div', 'ai-spin'));
  const txt = el('div');
  txt.appendChild(el('div', 'ai-busy-t', label));
  txt.appendChild(el('div', 'note', 'A couple of seconds.'));
  row.appendChild(txt);
  sh.appendChild(row);
  return close;
}

/* Never a dead end. Whatever went wrong, there is still a way to get the food
   into the log from this screen. */
function openAiError(e, ctx) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Estimate failed'));
  sh.appendChild(el('h2', null, e.message || 'That didn’t work.'));

  if (e.code === 'no_proxy') {
    const set = el('button', 'btn btn-primary btn-block btn-lg', 'Set it up');
    set.style.marginTop = '14px';
    set.onclick = () => { close(); openAiSettings(); };
    sh.appendChild(set);
  } else if (ctx && ctx.retry) {
    const again = el('button', 'btn btn-primary btn-block btn-lg', 'Try again');
    again.style.marginTop = '14px';
    again.onclick = () => { close(); ctx.retry(ctx.text || ''); };
    sh.appendChild(again);
  }

  const manual = el('button', 'btn btn-ghost btn-block', 'Enter it by hand instead');
  manual.style.marginTop = '8px';
  manual.onclick = () => { close(); openManual(ctx && ctx.meal); };
  sh.appendChild(manual);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Close');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

const CONF = {
  high:   ['var(--ok)', 'confident'],
  medium: ['var(--caution)', 'a fair guess'],
  low:    ['var(--miss)',  'a rough guess']
};

/* The check-before-you-log screen. Every row is editable and removable, because
   an estimate you cannot correct is an estimate you stop trusting — and one
   wrong item shouldn't mean redoing the whole meal. */
function openAiReview(res, ctx) {
  const src = /haiku/.test(res.model || '') ? 'ai-text' : 'ai-photo';
  const entries = normalizeImport({ items: res.items }).map(e => ({ ...e, src }));
  if (!entries.length) { openAiError({ message: 'Nothing came back for that one.' }, ctx); return; }

  const { sh, close } = sheet();
  let meal = ctx.meal || defaultMeal();
  entries.forEach(e => { e.meal = meal; });

  const body = el('div');
  sh.appendChild(body);

  function paint() {
    body.innerHTML = '';
    const tot = entries.reduce((s, e) => ({
      cal: s.cal + (e.cal || 0), p: s.p + (e.p || 0), c: s.c + (e.c || 0), f: s.f + (e.f || 0)
    }), { cal: 0, p: 0, c: 0, f: 0 });

    body.appendChild(el('div', 'eyebrow', 'Claude’s estimate'));
    body.appendChild(el('h2', null, tot.cal.toLocaleString() + ' kcal  ·  ' +
      entries.length + ' item' + (entries.length > 1 ? 's' : '')));
    body.appendChild(el('div', 'entry-readout num',
      'P ' + trimNum(tot.p) + '   C ' + trimNum(tot.c) + '   F ' + trimNum(tot.f)));

    const conf = CONF[res.confidence] || CONF.medium;
    const pill = el('div', 'conf');
    const dot = el('i');
    dot.style.background = conf[0];
    pill.append(dot, el('span', null, conf[1]));
    body.appendChild(pill);

    if (res.note) body.appendChild(noteEl(res.note));

    const list = el('div', 'import-list');
    entries.forEach((e, i) => {
      const row = el('div', 'food-entry pe-row');
      const b = el('button', 'pe-body');
      b.appendChild(el('div', 'fe-name', e.name));
      b.appendChild(el('div', 'fe-sub num',
        (e.qty ? e.qty + '  ·  ' : '') + 'P ' + trimNum(e.p) + '  C ' + trimNum(e.c) + '  F ' + trimNum(e.f)));
      b.onclick = () => openProposedEdit(e, paint);
      row.appendChild(b);
      row.appendChild(el('div', 'fe-cal num', String(e.cal)));

      const x = el('button', 'ex-del pe-x', '✕');
      x.setAttribute('aria-label', 'Remove ' + e.name);
      x.onclick = () => {
        entries.splice(i, 1);
        if (!entries.length) { close(); toast('Nothing left to log'); return; }
        paint();
      };
      row.appendChild(x);
      list.appendChild(row);
    });
    body.appendChild(list);
    body.appendChild(noteEl('Tap any line to fix the numbers or the portion before it goes in.'));

    body.appendChild(el('div', 'field-lbl', 'Meal'));
    body.appendChild(mealChips(meal, v => { meal = v; entries.forEach(e => { e.meal = v; }); }));

    const go = el('button', 'btn btn-primary btn-block btn-lg',
      ctx.onPick ? 'Add to meal' : 'Log ' + (isToday() ? 'it' : 'on ' + fmtViewDate()));
    go.style.marginTop = '12px';
    go.onclick = async () => {
      // Whatever it did with them, this question has now been answered once.
      // Only the words are kept — the picture never goes anywhere.
      if (ctx.mode === 'text' && ctx.text) recallRemember(ctx.text, entries, 'ai');

      if (ctx.onPick) {
        close();
        entries.forEach(e => ctx.onPick({ ...e }));
        return;
      }
      addEntries(entries);
      close();
      toast('Logged ' + entries.length + ' food' + (entries.length > 1 ? 's' : ''));
    };
    body.appendChild(go);

    if (ctx.retry) {
      const again = el('button', 'btn btn-ghost btn-block', 'Not right — add detail and retry');
      again.style.marginTop = '8px';
      again.onclick = () => { close(); ctx.retry(ctx.text || ''); };
      body.appendChild(again);
    }

    const cancel = el('button', 'btn btn-ghost btn-block', 'Discard');
    cancel.style.marginTop = '8px';
    cancel.onclick = close;
    body.appendChild(cancel);

    if (res.usage) {
      const bits = ['$' + Number(res.usage.usd || 0).toFixed(4) + ' of credit'];
      if (res.left && res.left.day != null) {
        const kind = res.left.kind === 'photo' ? 'photo' : 'describe';
        bits.push(res.left.day + ' ' + kind + (res.left.day === 1 ? '' : 's') + ' left today');
      }
      body.appendChild(el('div', 'ai-cost num', bits.join('   ·   ')));
    }
  }

  paint();
}

/* ---------- the free answer ----------
   Shown instead of an estimate when the same thing has already been through
   here. It says so plainly, because a number that appears without being asked
   for is a number nobody trusts — and the way to the paid answer is right
   there, one tap, for the times it really is a different plate. */
function openRecallHit(hit, ctx) {
  const entries = normalizeImport({ items: hit.items })
    .map(e => ({ ...e, src: 'recall', meal: ctx.meal }));
  if (!entries.length) { runEstimate(ctx); return; }

  const { sh, close } = sheet();
  const body = el('div');
  sh.appendChild(body);

  function paint() {
    body.innerHTML = '';
    const t = macroTotals(entries);

    body.appendChild(el('div', 'eyebrow', 'Found in your log'));
    body.appendChild(el('h2', null, t.cal.toLocaleString() + ' kcal  ·  ' +
      entries.length + ' item' + (entries.length > 1 ? 's' : '')));
    body.appendChild(el('div', 'entry-readout num',
      'P ' + trimNum(t.p) + '   C ' + trimNum(t.c) + '   F ' + trimNum(t.f)));

    const when = hit.last ? new Date(hit.last).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const pill = el('div', 'conf');
    const dot = el('i');
    dot.style.background = hit.exact ? 'var(--ok)' : 'var(--caution)';
    pill.append(dot, el('span', null,
      (hit.exact ? 'exact match' : 'close match') +
      (hit.n > 1 ? ' · logged ' + hit.n + ' times' : '') +
      (when ? ' · last ' + when : '')));
    body.appendChild(pill);

    body.appendChild(noteEl('Searched what you have already logged before asking Claude — this one cost nothing. It came from “' + hit.q + '”.'));

    const list = el('div', 'import-list');
    entries.forEach((e, i) => {
      const row = el('div', 'food-entry pe-row');
      const b = el('button', 'pe-body');
      b.appendChild(el('div', 'fe-name', e.name));
      b.appendChild(el('div', 'fe-sub num',
        (e.qty ? e.qty + '  ·  ' : '') + 'P ' + trimNum(e.p) + '  C ' + trimNum(e.c) + '  F ' + trimNum(e.f)));
      b.onclick = () => openProposedEdit(e, paint);
      row.appendChild(b);
      row.appendChild(el('div', 'fe-cal num', String(e.cal)));

      const x = el('button', 'ex-del pe-x', '✕');
      x.setAttribute('aria-label', 'Remove ' + e.name);
      x.onclick = () => {
        entries.splice(i, 1);
        if (!entries.length) { close(); toast('Nothing left to log'); return; }
        paint();
      };
      row.appendChild(x);
      list.appendChild(row);
    });
    body.appendChild(list);
    body.appendChild(noteEl('Tap a line to fix it before it goes in.'));

    if (!ctx.onPick) {
      body.appendChild(el('div', 'field-lbl', 'Meal'));
      body.appendChild(mealChips(ctx.meal, v => { entries.forEach(e => { e.meal = v; }); }));
    }

    const go = el('button', 'btn btn-primary btn-block btn-lg',
      ctx.onPick ? 'Add to meal' : 'Log ' + (isToday() ? 'it' : 'on ' + fmtViewDate()));
    go.style.marginTop = '12px';
    go.onclick = () => {
      // Counted here rather than where the hit was found, because finding one
      // is not using one: "Not this — ask Claude" below falls through to a paid
      // estimate, and counting both would make a recall look free and paid at
      // once. This is also the only point the Food memory browser passes through.
      bump('aiRecall');
      // Using the answer counts as asking the question again: it keeps the row
      // fresh so it survives the prune, and if any line was corrected on the
      // way past, the correction is what gets remembered.
      recallRemember(hit.q, entries, hit.kind);
      if (ctx.onPick) { close(); entries.forEach(e => ctx.onPick({ ...e })); return; }
      addEntries(entries);
      close();
      toast('Logged from your log — no request used');
    };
    body.appendChild(go);

    const ask = el('button', 'btn btn-ghost btn-block', 'Not this — ask Claude');
    ask.style.marginTop = '8px';
    ask.onclick = () => { close(); runEstimate(ctx); };
    body.appendChild(ask);

    const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
    cancel.style.marginTop = '8px';
    cancel.onclick = close;
    body.appendChild(cancel);
  }

  paint();
}

/* Correcting one line of an estimate, plus the option to keep it as a saved
   food so the same thing never has to be guessed at twice. */
function openProposedEdit(e, onDone) {
  const { sh, close } = sheet(onDone);
  sh.appendChild(el('h2', null, 'Fix this item'));

  const f = (label, val, type) => {
    const w = el('div', 'field');
    w.appendChild(el('label', null, label));
    const i = el('input');
    i.type = type || 'number';
    if (i.type === 'number') i.inputMode = 'decimal';
    if (val != null) i.value = val;
    w.appendChild(i);
    w.input = i;
    return w;
  };

  const name = f('Name', e.name, 'text');
  const qty  = f('Amount', e.qty, 'text');
  sh.append(name, qty);

  const g1 = el('div', 'row-split');
  const cal = f('kcal', e.cal), p = f('Protein g', e.p);
  g1.append(cal, p); sh.appendChild(g1);

  const g2 = el('div', 'row-split');
  const c = f('Carbs g', e.c), fat = f('Fat g', e.f);
  g2.append(c, fat); sh.appendChild(g2);

  const saveWrap = el('label', 'save-check');
  const chk = el('input'); chk.type = 'checkbox';
  saveWrap.append(chk, document.createTextNode(' Also keep this in my foods'));
  sh.appendChild(saveWrap);

  const done = el('button', 'btn btn-primary btn-block btn-lg', 'Done');
  done.style.marginTop = '12px';
  done.onclick = () => {
    const mac = readMacros(cal.input, p.input, c.input, fat.input);
    if (!mac) return;
    e.name = name.input.value.trim() || e.name;
    e.qty  = qty.input.value.trim();
    e.cal = mac.cal; e.p = mac.p; e.c = mac.c; e.f = mac.f;
    if (chk.checked) {
      const id = 'u' + Date.now().toString(36);
      items[id] = { id, ...mkItem(e.name, '', 'serv', { label: e.qty || 'serving' },
        { cal: e.cal, p: e.p, c: e.c, f: e.f }, e.micro || null), uses: 1, last: Date.now() };
      write('food/items', items);
      toast('Kept in your foods');
    }
    close();
  };
  sh.appendChild(done);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ---------- estimator setup ----------
   The Worker URL is not a secret — the Worker verifies your sign-in before it
   spends anything, so knowing the address gets a stranger a 401 and nothing
   else. Keeping it settable from the phone means the estimator can be pointed
   somewhere new without shipping a new version of the app. */
export function openAiSettings() {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Fuel'));
  sh.appendChild(el('h2', null, 'AI estimator'));
  sh.appendChild(noteEl('Photos and descriptions go to your own Cloudflare Worker, which holds the Anthropic key and enforces the rate limits and the monthly spend cap. The app itself never sees the key.'));

  const w = el('div', 'field');
  w.style.marginTop = '14px';
  w.appendChild(el('label', null, 'Worker URL'));
  const i = el('input');
  i.type = 'url';
  i.autocapitalize = 'off';
  i.spellcheck = false;
  i.placeholder = 'https://rack-ai.you.workers.dev';
  i.value = proxyUrl();
  w.appendChild(i);
  sh.appendChild(w);

  const status = el('div', 'note');
  sh.appendChild(status);

  const test = el('button', 'btn btn-ghost btn-block', 'Save and test');
  test.style.marginTop = '10px';
  test.onclick = async () => {
    setProxyUrl(i.value);
    if (!proxyUrl()) { status.style.color = ''; status.textContent = 'Paste the URL wrangler printed when you deployed.'; return; }
    status.style.color = '';
    status.textContent = 'Checking…';
    test.disabled = true;
    try {
      const q = await quota();
      status.style.color = 'var(--ok)';
      // Photo and describe have separate daily budgets — showing one combined
      // number would say "4 left" to somebody who has no photos left at all.
      const photo = q.left.photo != null ? q.left.photo : q.left.day;
      const text  = q.left.text  != null ? q.left.text  : q.left.day;
      const pMax  = q.limits.photoPerDay != null ? q.limits.photoPerDay : q.limits.perDay;
      const tMax  = q.limits.textPerDay  != null ? q.limits.textPerDay  : q.limits.perDay;
      status.textContent = 'Connected. Today: ' + photo + ' of ' + pMax + ' photos, ' +
        text + ' of ' + tMax + ' describes left · $' + Number(q.spend.monthUsd).toFixed(3) +
        ' of $' + q.spend.capUsd + ' used this month.';
    } catch (err) {
      status.style.color = 'var(--miss)';
      status.textContent = err.message || 'Could not reach it.';
    }
    test.disabled = false;
  };
  sh.appendChild(test);

  sh.appendChild(noteEl('Limits are per person, per day, and reset at midnight UTC. Setup is in the Worker README \u2014 create the key, deploy the Worker, paste the URL it prints here.'));

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '14px';
  done.onclick = close;
  sh.appendChild(done);
}

/* ---------- portion picker ---------- */
function portionControl(item, startAmt, startUnit, onChange) {
  const box = el('div');
  const canGrams = item.base === '100g' || (item.serv && item.serv.grams);
  const canServ  = item.base === 'serv' || (item.serv && item.serv.grams);
  let unit = startUnit;
  if (unit === 'g' && !canGrams) unit = 'serv';
  if (unit === 'serv' && !canServ) unit = 'g';
  let amt = startAmt;

  const preview = el('div', 'num portion-preview');

  const stepRow = el('div', 'qty-row');
  const minus = el('button', 'btn btn-ghost', '−');
  const amtIn = el('input'); amtIn.type = 'number'; amtIn.inputMode = 'decimal';
  const plus  = el('button', 'btn btn-ghost', '+');
  stepRow.append(minus, amtIn, plus);

  const unitRow = el('div', 'filter-row');
  const servChip = el('button', 'chip', (item.serv && item.serv.label) || 'serving');
  const gChip    = el('button', 'chip', 'grams');
  if (canServ)  unitRow.appendChild(servChip);
  if (canGrams) unitRow.appendChild(gChip);
  servChip.onclick = () => setUnit('serv');
  gChip.onclick    = () => setUnit('g');

  function step() { return unit === 'g' ? 5 : 0.25; }
  function setUnit(u) {
    if (u === unit) return;
    // convert amount across units when grams-per-serving is known
    if (item.serv && item.serv.grams) {
      amt = u === 'g' ? r1(amt * item.serv.grams) : r1(amt / item.serv.grams * 4) / 4;
    } else amt = u === 'g' ? 100 : 1;
    unit = u;
    paint();
  }
  function paint() {
    servChip.classList.toggle('on', unit === 'serv');
    gChip.classList.toggle('on', unit === 'g');
    amtIn.value = trimNum(amt);
    const m = macrosFor(item, amt, unit);
    if (m) {
      preview.textContent = m.cal + ' kcal   ·   P ' + trimNum(m.p) + '   C ' + trimNum(m.c) + '   F ' + trimNum(m.f);
      onChange(amt, unit, m);
    }
  }
  minus.onclick = () => { amt = Math.max(step(), r1(amt - step())); paint(); };
  plus.onclick  = () => { amt = Math.min(LIMITS.amount[1], r1(amt + step())); paint(); };
  amtIn.onchange = ev => { amt = clamp(parseFloat(ev.target.value) || 0, LIMITS.amount); paint(); };

  box.append(unitRow, stepRow, preview);
  paint();
  return box;
}

function openPortion(item, mealId, onPick) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', item.brand || 'Food'));
  sh.appendChild(el('h2', null, item.name));

  let current = { amt: 1, unit: item.base === '100g' ? 'g' : 'serv', m: null };
  if (current.unit === 'g') current.amt = (item.serv && item.serv.grams) || 100;

  sh.appendChild(portionControl(item, current.amt, current.unit, (amt, unit, m) => {
    current = { amt, unit, m };
  }));

  // Building a meal? The meal it belongs to was chosen on the builder, so
  // asking again here would be a second answer to the same question.
  let meal = mealId || defaultMeal();
  if (!onPick) {
    const mealRow = el('div', 'filter-row');
    MEALS.forEach(([id, label]) => {
      const c = el('button', 'chip' + (meal === id ? ' on' : ''), label);
      c.onclick = () => { meal = id; mealRow.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); c.classList.add('on'); };
      mealRow.appendChild(c);
    });
    sh.appendChild(mealRow);
  }

  const addBtn = el('button', 'btn btn-primary btn-block btn-lg', onPick ? 'Add to meal' : 'Add');
  addBtn.style.marginTop = '12px';
  addBtn.onclick = () => {
    if (!current.m) return;
    const ing = {
      name: item.name, itemId: item.id, amt: current.amt, unit: current.unit,
      qty: qtyLabel(item, current.amt, current.unit),
      ...current.m
    };
    touchItem(item.id);
    close();
    if (onPick) { onPick(ing); return; }
    bump('foodLib');
    addEntry({ ...ing, meal, src: 'lib' });
  };
  sh.appendChild(addBtn);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ---------- manual entry ---------- */
function openManual(mealId, prefill, onPick) {
  const { sh, close } = sheet();
  sh.appendChild(el('h2', null, onPick ? 'Add an ingredient' : (prefill ? 'Confirm food' : 'Manual entry')));

  const f = (label, val, type) => {
    const w = el('div', 'field');
    w.appendChild(el('label', null, label));
    const i = el('input');
    i.type = type || 'number';
    if (i.type === 'number') i.inputMode = 'decimal';
    if (val != null) i.value = val;
    w.appendChild(i);
    w.input = i;
    return w;
  };

  const name = f('Name', prefill && prefill.name, 'text');
  const qty  = f('Amount (label only — e.g. “2 slices”)', prefill && prefill.qty, 'text');
  sh.append(name, qty);

  const g1 = el('div', 'row-split');
  const cal = f('kcal', prefill && prefill.cal), p = f('Protein g', prefill && prefill.p);
  g1.append(cal, p); sh.appendChild(g1);
  const g2 = el('div', 'row-split');
  const c = f('Carbs g', prefill && prefill.c), fat = f('Fat g', prefill && prefill.f);
  g2.append(c, fat); sh.appendChild(g2);

  const saveWrap = el('label', 'save-check');
  const chk = el('input'); chk.type = 'checkbox'; chk.checked = !prefill;
  saveWrap.append(chk, document.createTextNode(' Save to my foods (per serving)'));
  sh.appendChild(saveWrap);

  let meal = mealId || defaultMeal();
  if (!onPick) {
    const mealRow = el('div', 'filter-row');
    MEALS.forEach(([id, label]) => {
      const ch = el('button', 'chip' + (meal === id ? ' on' : ''), label);
      ch.onclick = () => { meal = id; mealRow.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); ch.classList.add('on'); };
      mealRow.appendChild(ch);
    });
    sh.appendChild(mealRow);
  }

  const add = el('button', 'btn btn-primary btn-block btn-lg', onPick ? 'Add to meal' : 'Add');
  add.style.marginTop = '12px';
  add.onclick = () => {
    const nm = name.input.value.trim();
    if (!nm) { toast('Give it a name'); return; }
    const mac = readMacros(cal.input, p.input, c.input, fat.input);
    if (!mac) return;
    const entry = {
      name: nm, qty: qty.input.value.trim(), ...mac,
      meal, src: prefill ? prefill.src || 'manual' : 'manual'
    };
    if (prefill && prefill.micro) entry.micro = prefill.micro;
    if (chk.checked) {
      const id = 'u' + Date.now().toString(36);
      items[id] = { id, ...mkItem(nm, '', 'serv', { label: qty.input.value.trim() || 'serving' },
        { cal: entry.cal, p: entry.p, c: entry.c, f: entry.f }, entry.micro || null), uses: 1, last: Date.now() };
      write('food/items', items);
      entry.itemId = id; entry.amt = 1; entry.unit = 'serv';
    }
    close();
    if (onPick) { onPick(entry); return; }
    bump('foodManual');
    addEntry(entry);
  };
  sh.appendChild(add);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ================= BARCODE ================= */
let zxingPromise = null;
function loadZXing() {
  zxingPromise = zxingPromise || new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js';
    s.onload = () => res(window.ZXingBrowser);
    s.onerror = () => { zxingPromise = null; rej(new Error('scanner load failed')); };
    document.head.appendChild(s);
  });
  return zxingPromise;
}

/* Chrome on Windows and Linux exposes BarcodeDetector but supports no formats,
   so testing `'BarcodeDetector' in window` alone left the scanner staring at a
   live feed that would never decode. Ask what it can actually read, once. */
let nativeDetectorPromise = null;
function nativeDetector() {
  nativeDetectorPromise = nativeDetectorPromise || (async () => {
    try {
      if (!('BarcodeDetector' in window)) return null;
      const fmts = await window.BarcodeDetector.getSupportedFormats();
      if (!fmts.includes('ean_13')) return null;
      return new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    } catch { return null; }
  })();
  return nativeDetectorPromise;
}

/* iPhone Safari has no native detector, so every iPhone scan runs on ZXing.
   Fetching it when the scanner opened put a "Loading scanner…" stall in front
   of a person's first scan; fetch it while Fuel is idle instead. The service
   worker keeps it after that, and phones with a native detector never need it. */
let scannerWarmed = false;
function warmScanner() {
  if (scannerWarmed) return;
  scannerWarmed = true;
  setTimeout(() => nativeDetector().then(det => {
    if (!det) loadZXing().catch(() => { scannerWarmed = false; });
  }), 4000);
}

/* No resolution used to be asked for, and the browser default (640×480 on
   iOS) meant a UPC's bars only resolved with the package nearly touching the
   lens — inside the camera's focus range, so it was blurry there too. Ask for
   a full-HD frame. `ideal` is a preference: a camera that can't do it still
   opens at whatever it has. */
const SCAN_VIDEO = { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } };

/* Best effort: continuous autofocus where the browser lets us ask, and whether
   a torch exists. iOS exposes neither and ignores unsupported advanced
   constraints rather than throwing, but wrap it anyway. */
function tuneTrack(stream) {
  const track = stream.getVideoTracks()[0];
  let torch = false;
  try {
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    if ((caps.focusMode || []).includes('continuous'))
      track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
    torch = !!caps.torch;
  } catch {}
  return { track, torch };
}

function openScanner(onCode) {
  bump('barcode');
  const { back, sh, close } = sheet();
  sh.appendChild(el('h2', null, 'Scan barcode'));
  const status = el('div', 'eyebrow', 'Starting camera…');
  sh.appendChild(status);

  const video = document.createElement('video');
  video.className = 'scan-video';
  video.setAttribute('playsinline', '');
  video.muted = true;
  sh.appendChild(video);

  let stream = null, stopFns = [], done = false;

  function finish(code) {
    if (done) return;
    done = true;
    cleanup();
    close();
    if (code) onCode(code);
  }
  function cleanup() {
    stopFns.forEach(fn => { try { fn(); } catch {} });
    if (stream) stream.getTracks().forEach(t => t.stop());
  }

  // Android only in practice; stays hidden unless the camera reports a torch.
  const light = el('button', 'btn btn-ghost btn-block', 'Light on');
  light.style.marginTop = '10px';
  light.style.display = 'none';   // `.btn` sets display, so [hidden] alone wouldn't hide it
  sh.appendChild(light);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '10px';
  cancel.onclick = () => finish(null);
  sh.appendChild(cancel);
  back.onclick = () => finish(null);

  (async () => {
    try {
      const det = await nativeDetector();
      if (!det) status.textContent = 'Loading scanner…';
      const ZX = det ? null : await loadZXing();

      stream = await navigator.mediaDevices.getUserMedia({ video: SCAN_VIDEO });
      // Cancelled while the permission prompt was up: the old code left the
      // camera running because `stream` was assigned after cleanup ran.
      if (done) { cleanup(); return; }

      const { track, torch } = tuneTrack(stream);
      if (torch) {
        let on = false;
        light.style.display = '';
        light.onclick = () => {
          on = !on;
          light.textContent = on ? 'Light off' : 'Light on';
          track.applyConstraints({ advanced: [{ torch: on }] }).catch(() => {});
        };
      }
      status.textContent = 'Point at the barcode \u00b7 hold steady, a hand\u2019s width away';

      if (det) {
        video.srcObject = stream;
        await video.play();
        if (done) return;
        let busy = false;
        const iv = setInterval(async () => {
          if (done || busy) return;
          busy = true;
          try {
            const codes = await det.detect(video);
            if (codes.length) finish(codes[0].rawValue);
          } catch {}
          busy = false;
        }, 150);
        stopFns.push(() => clearInterval(iv));
      } else {
        // Out of the box ZXing hunted every frame for QR, PDF417, Aztec and
        // the rest, paused 500 ms between tries, and only sampled every 32nd
        // row. Food labels are EAN/UPC, so tell it that; TRY_HARDER reads
        // every row and retries the frame rotated, which is what makes a
        // slightly tilted or vertical label go. The UMD build doesn't export
        // DecodeHintType, so its TRY_HARDER key (3) is spelt out here.
        const F = ZX.BarcodeFormat;
        const reader = new ZX.BrowserMultiFormatReader(undefined,
          { delayBetweenScanAttempts: 100, delayBetweenScanSuccess: 100 });
        reader.possibleFormats = [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E];
        reader.hints.set(3, true);
        reader.setHints(reader.hints);
        const controls = await reader.decodeFromStream(stream, video, (result) => {
          if (result) finish(result.getText());
        });
        // ZXing decodes the first frame synchronously inside that call, so a
        // label already in frame can finish() before `controls` exists and the
        // loop would run on with nothing to stop it. Catch up here.
        if (done) controls.stop(); else stopFns.push(() => controls.stop());
      }
    } catch (err) {
      status.textContent = err && err.message === 'scanner load failed'
        ? 'Scanner failed to load \u2014 check your connection and try again.'
        : 'Camera unavailable \u2014 check permission in Settings.';
    }
  })();
}

async function lookupBarcode(code, mealId, onPick) {
  toast('Looking up ' + code + '…');
  try {
    const r = await fetch('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) + '.json');
    const j = await r.json();
    if (!j || j.status !== 1 || !j.product) {
      toast('Not in Open Food Facts — add it manually');
      bump('barcodeMiss');
      openManual(mealId, { name: '', qty: '', src: 'barcode' }, onPick);
      return;
    }
    const item = itemFromOFF(j.product, code);
    if (!item) {
      toast('Product found but no nutrition data');
      // A row with no macros on it is a miss as far as the log is concerned.
      bump('barcodeMiss');
      openManual(mealId, { name: j.product.product_name || '', src: 'barcode' }, onPick);
      return;
    }
    // upsert into library keyed by barcode
    const existing = Object.values(items).find(i => i.barcode === code);
    const id = existing ? existing.id : 'b' + code;
    items[id] = { ...(existing || {}), id, ...item, uses: (existing && existing.uses) || 0, last: Date.now() };
    await write('food/items', items);
    bump('barcodeHit');
    openPortion(items[id], mealId, onPick);
  } catch {
    toast('Lookup failed — no connection?');
    bump('barcodeMiss');
    openManual(mealId, { name: '', src: 'barcode' }, onPick);
  }
}

function itemFromOFF(prod, code) {
  const nut = prod.nutriments || {};
  const kcal100 = nut['energy-kcal_100g'] != null ? nut['energy-kcal_100g']
    : (nut.energy_100g != null ? nut.energy_100g / 4.184 : null);
  if (kcal100 == null) return null;

  const micro = {};
  if (nut.fiber_100g != null)             micro.fiber = r1(nut.fiber_100g);
  if (nut.sugars_100g != null)            micro.sugar = r1(nut.sugars_100g);
  if (nut['saturated-fat_100g'] != null)  micro.satfat = r1(nut['saturated-fat_100g']);
  if (nut.sodium_100g != null)            micro.sodium = Math.round(nut.sodium_100g * 1000);
  if (nut.potassium_100g != null)         micro.potassium = Math.round(nut.potassium_100g * 1000);
  if (nut.cholesterol_100g != null)       micro.cholesterol = Math.round(nut.cholesterol_100g * 1000);

  const name = (prod.product_name || 'Unknown product').trim();
  const servG = parseFloat(prod.serving_quantity);
  return {
    name,
    brand: (prod.brands || '').split(',')[0].trim(),
    base: '100g',
    serv: servG ? { label: (prod.serving_size || servG + ' g').trim(), grams: servG } : null,
    n: {
      cal: Math.round(kcal100),
      p: r1(nut.proteins_100g || 0),
      c: r1(nut.carbohydrates_100g || 0),
      f: r1(nut.fat_100g || 0)
    },
    micro: Object.keys(micro).length ? micro : null,
    barcode: code
  };
}

/* ================= FUEL SETTINGS ================= */
// Targets and the Claude importer used to sit as chips above the meal cards.
// They are one-off setup actions, not daily controls, so they live behind the
// gear in the header now.
function openFuelSettings() {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Fuel'));
  sh.appendChild(el('h2', null, 'Settings'));

  const summary = el('div', 'settings-summary num');
  const mNow = maintInfo();
  summary.textContent = targets.cal.toLocaleString() + ' kcal  ·  P ' + targets.p +
    '  ·  C ' + carbsTarget() + '  ·  F ' + targets.f +
    (mNow ? '   ·   maint ' + mNow.cal.toLocaleString() + (mNow.auto ? ' est.' : '') : '');
  sh.appendChild(summary);

  const tBtn = el('button', 'btn btn-ghost btn-block', 'Daily targets');
  tBtn.style.marginTop = '14px';
  tBtn.onclick = () => { close(); openTargets(); };
  sh.appendChild(tBtn);

  const wBtn = el('button', 'btn btn-ghost btn-block', 'Water goal and sizes');
  wBtn.style.marginTop = '10px';
  wBtn.onclick = () => { close(); openWaterSettings(latestLb(), () => render()); };
  sh.appendChild(wBtn);

  const aBtn = el('button', 'btn btn-ghost btn-block', 'AI estimator');
  aBtn.style.marginTop = '10px';
  aBtn.onclick = () => { close(); openAiSettings(); };
  sh.appendChild(aBtn);

  const mBtn = el('button', 'btn btn-ghost btn-block');
  mBtn.style.marginTop = '10px';
  mBtn.append(el('span', null, 'Food memory'), el('span', 'cnt num', String(recallCount())));
  mBtn.onclick = () => { close(); openRecallList(); };
  sh.appendChild(mBtn);

  const iBtn = el('button', 'btn btn-ghost btn-block', 'Paste food JSON');
  iBtn.style.marginTop = '10px';
  iBtn.onclick = () => { close(); openImportPaste(); };
  sh.appendChild(iBtn);

  sh.appendChild(noteEl('Saved foods, meals and targets belong to your account only — a second sign-in starts with an empty library.'));

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '14px';
  done.onclick = close;
  sh.appendChild(done);
}

/* ================= FOOD MEMORY =================
   Everything already logged or already estimated, kept so the same question
   never gets asked twice. It is a cache, so it is allowed to be wrong — which
   is why it is browsable and every row can be thrown away. */
export function openRecallList() {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Fuel'));
  sh.appendChild(el('h2', null, 'Food memory'));
  sh.appendChild(noteEl('Every food you log and every description Claude works out is kept here. The next time you describe the same thing the answer comes from this list instead of costing a request. Pictures are never stored.'));

  const search = el('div', 'picker-search');
  const inp = el('input');
  inp.type = 'search';
  inp.placeholder = 'Search what you have logged';
  search.appendChild(inp);
  sh.appendChild(search);

  const list = el('div', 'ex-list');
  sh.appendChild(list);

  let q = '';
  inp.oninput = ev => { q = ev.target.value.toLowerCase().trim(); paint(); };

  function paint() {
    list.innerHTML = '';
    const pool = recallList().filter(r => !q || r.q.toLowerCase().includes(q));

    if (!pool.length) {
      list.appendChild(noteEl(q ? 'Nothing here matches that.'
        : 'Nothing remembered yet. It fills itself up as you log.'));
      return;
    }

    pool.slice(0, 150).forEach(r => {
      const t = macroTotals(r.items || []);
      const b = el('button', 'ex-item');
      const dot = el('i', 'dot');
      dot.style.background = r.kind === 'ai' ? 'var(--p-yellow)' : 'var(--dim)';
      b.appendChild(dot);
      b.appendChild(el('span', 'nm', r.q));
      b.appendChild(el('span', 'eq num', t.cal + ' kcal' + (r.n > 1 ? '  ·  ×' + r.n : '')));
      b.onclick = () => {
        close();
        openRecallHit({ ...r, exact: true }, { meal: defaultMeal(), mode: 'text', text: r.q,
          busy: 'Working out the macros…',
          run: () => estimateText(r.q),
          retry: t2 => openDescribeFlow(defaultMeal(), t2) });
      };

      const x = el('span', 'eq ex-del', '✕');
      x.setAttribute('aria-label', 'Forget ' + r.q);
      x.onclick = ev => {
        ev.stopPropagation();
        recallForget(r.key);
        paint();
        toast('Forgotten');
      };
      b.appendChild(x);
      list.appendChild(b);
    });
  }
  paint();

  const clear = el('button', 'btn btn-danger btn-block', 'Forget everything');
  clear.style.marginTop = '12px';
  clear.onclick = () => confirmSheet({
    title: 'Clear the food memory?',
    body: 'Nothing you have logged is deleted — only the shortcuts. Descriptions will go to Claude again until it fills back up.',
    confirmLabel: 'Clear it',
    danger: true,
    onConfirm: () => { recallForgetAll(); paint(); toast('Cleared'); }
  });
  sh.appendChild(clear);

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '8px';
  done.onclick = close;
  sh.appendChild(done);
}

/* ================= TARGETS ================= */
/* `onSaved` is for the screen behind the sheet — You's goal card quotes the
   goal weight and the rate — so it can repaint the moment they change. */
export function openTargets(onSaved) {
  const { sh, close } = sheet();
  sh.appendChild(el('h2', null, 'Daily targets'));

  let auto = { ...AUTO_DEFAULTS, ...(targets.auto || {}) };
  let mode = auto.on ? 'auto' : 'manual';

  sh.appendChild(segmented([['manual', 'Set them'], ['auto', 'Follow my weight']], mode, v => {
    mode = v;
    manualPane.style.display = v === 'manual' ? '' : 'none';
    autoPane.style.display   = v === 'auto'   ? '' : 'none';
    paintAuto();
  }));

  const field = (label, value, opts = {}) => {
    const w = el('div', 'field');
    w.style.marginTop = '10px';
    w.appendChild(el('label', null, label));
    const i = el('input');
    i.type = 'number';
    i.inputMode = opts.decimal ? 'decimal' : 'numeric';
    if (opts.step) i.step = opts.step;
    if (opts.placeholder) i.placeholder = opts.placeholder;
    i.value = value;
    w.appendChild(i);
    w.input = i;
    return w;
  };

  /* ---------- manual ---------- */
  const manualPane = el('div', 'tg-manual');
  const tc = field('Calories', targets.cal);
  const tp = field('Protein g', targets.p);
  const tf = field('Fat g', targets.f);
  manualPane.append(tc, tp, tf);
  const carbs = el('div', 'eyebrow');
  carbs.style.marginTop = '8px';
  const paintCarbs = () => {
    const cal = parseInt(tc.input.value) || 0,
          pp  = parseInt(tp.input.value) || 0,
          ff  = parseInt(tf.input.value) || 0;
    carbs.textContent = 'Carbs \u2192 ' + Math.max(0, Math.round((cal - pp * 4 - ff * 9) / 4)) + ' g';
  };
  [tc, tp, tf].forEach(w => w.input.oninput = paintCarbs);
  paintCarbs();
  manualPane.appendChild(carbs);
  manualPane.appendChild(noteEl('Carbs are whatever calories remain after protein and fat.'));
  sh.appendChild(manualPane);

  /* ---------- auto ---------- */
  const autoPane = el('div', 'tg-auto');
  autoPane.appendChild(noteEl(
    'You set the goal; the numbers follow the scale. Protein and fat are grams ' +
    'per pound of bodyweight, so they track your weight down as you cut. Calories ' +
    'are your maintenance estimate shifted by the rate you pick. Carbs stay the remainder.'));

  const ra = field('Goal lb / week', auto.rateWk, { decimal: true, step: '0.25' });
  const pl = field('Protein g per lb', auto.pPerLb, { decimal: true, step: '0.05' });
  const fl = field('Fat g per lb', auto.fPerLb, { decimal: true, step: '0.05' });
  const fo = field('Never go below (kcal)', auto.floor > 0 ? auto.floor : '',
                   { placeholder: 'auto' });
  autoPane.append(ra, pl, fl, fo);
  autoPane.appendChild(noteEl('Negative loses weight, positive gains. Leave the floor blank and it protects itself \u2014 protein and fat plus 100 g of carbs, so carbs can never be squeezed to nothing.'));

  const preview = el('div', 'card');
  preview.style.marginTop = '12px';
  autoPane.appendChild(preview);

  const readAuto = () => ({
    on: true,
    rateWk: clamp(parseFloat(ra.input.value) || 0, LIMITS.rateWk),
    pPerLb: clamp(parseFloat(pl.input.value) || 0, LIMITS.perLb),
    fPerLb: clamp(parseFloat(fl.input.value) || 0, LIMITS.perLb),
    floor:  parseInt(fo.input.value) > 0 ? clamp(parseInt(fo.input.value), LIMITS.cal) : 0,
    lastAdj: auto.lastAdj || 0
  });

  function paintAuto() {
    if (mode !== 'auto') return;
    preview.innerHTML = '';
    preview.appendChild(el('div', 'eyebrow', 'What that works out to'));

    const mi = maintInfo();
    const lb = trendWeight();
    if (!mi || !(lb > 0)) {
      preview.appendChild(noteEl(
        !mi ? 'Needs a maintenance number first \u2014 either type one below, or log a week of food alongside your weigh-ins and it estimates itself.'
            : 'Needs enough weigh-ins to fit a trend. Your bodyweight has to come off the trend line, not the last reading \u2014 that one swings by pounds depending on the time of day.'));
      return;
    }
    const n = autoTargets(readAuto(), mi.cal, lb);
    if (!n) { preview.appendChild(noteEl('Not enough to compute yet.')); return; }

    const big = el('div', 'load-num num', n.cal.toLocaleString());
    big.style.fontSize = '30px';
    preview.appendChild(big);
    preview.appendChild(el('div', 'eyebrow', 'kcal / day'));

    const row = el('div', 'stat-row');
    row.style.marginTop = '10px';
    [[n.p, 'Protein g'], [n.c, 'Carbs g'], [n.f, 'Fat g']].forEach(([v, l]) => {
      const c = el('div', 'stat');
      c.appendChild(el('div', 'stat-val num', String(v)));
      c.appendChild(el('div', 'stat-lbl', l));
      row.appendChild(c);
    });
    preview.appendChild(row);

    preview.appendChild(noteEl(
      'From maintenance ' + mi.cal.toLocaleString() + (mi.auto ? ' (estimated)' : ' (pinned)') +
      ' at a trend weight of ' + n.lb + ' lb.'));

    if (n.floored) {
      preview.appendChild(noteEl(
        '\u26a0 That rate would put you at ' + n.wanted.toLocaleString() +
        ', below the ' + n.floor.toLocaleString() + ' floor, so it holds at the floor instead. ' +
        'Ease the rate off, or drop the fat grams if you want to go lower honestly.'));
    }
    preview.appendChild(noteEl(
      'Re-checked when you weigh in, moves at most once a week and never more than ' +
      AUTO_MAX_STEP + ' kcal at a time.'));
  }
  [ra, pl, fl, fo].forEach(w => w.input.oninput = paintAuto);
  sh.appendChild(autoPane);

  manualPane.style.display = mode === 'manual' ? '' : 'none';
  autoPane.style.display   = mode === 'auto'   ? '' : 'none';
  paintAuto();

  /* ---------- maintenance (shared) ---------- */
  const est = maintenance(weighIns, summaries);
  const tm = el('div', 'field');
  tm.style.marginTop = '14px';
  tm.appendChild(el('label', null, 'Maintenance kcal'));
  const mi = el('input');
  mi.type = 'number'; mi.inputMode = 'numeric';
  mi.value = targets.maint > 0 ? targets.maint : '';
  mi.placeholder = est.tdee ? String(est.tdee) + ' (estimated)' : 'leave blank to estimate';
  tm.appendChild(mi);
  sh.appendChild(tm);
  mi.oninput = paintAuto;
  sh.appendChild(noteEl(est.tdee
    ? 'Your weight trend puts maintenance around ' + est.tdee.toLocaleString() +
      ' kcal' + (est.se ? ' \u00b1 ' + Math.round(1.96 * est.se / 5) * 5 : '') +
      '. Leave this blank to keep following that estimate, or type your own number to pin the cut / maintain / gain marks.'
    : 'The estimate needs ' + est.need.join(' and ') + '. Type a number here to draw the zones in the meantime.'));

  /* ---------- goal weight (shared) ----------
     Read by nothing on this tab. It is the finish line for the goal card on
     You, which works out a date from the trend's pace; it lives here because
     this is where the goal's rate already lives, and a goal is one thing. */
  const tg = el('div', 'field');
  tg.style.marginTop = '14px';
  tg.appendChild(el('label', null, 'Goal weight (lb)'));
  const gw = el('input');
  gw.type = 'number'; gw.inputMode = 'decimal'; gw.step = '0.5';
  gw.value = targets.goalLb > 0 ? targets.goalLb : '';
  gw.placeholder = 'optional';
  tg.appendChild(gw);
  sh.appendChild(tg);
  sh.appendChild(noteEl('Optional. With a goal weight, the You tab shows how far along you are and roughly when you would get there at your current pace.'));

  /* ---------- save ---------- */
  const save = el('button', 'btn btn-primary btn-block', 'Save');
  save.style.marginTop = '14px';
  save.onclick = async () => {
    const maint = parseInt(mi.value) > 0 ? parseInt(mi.value) : null;
    if (maint != null && !within(maint, LIMITS.cal)) {
      toast('Maintenance should be between ' + LIMITS.cal[0].toLocaleString() + ' and ' + LIMITS.cal[1].toLocaleString() + ' kcal');
      return;
    }
    const g = parseFloat(gw.value);
    if (gw.value.trim() && !within(g, LIMITS.lb)) {
      toast('Goal weight should be between ' + LIMITS.lb[0] + ' and ' + LIMITS.lb[1] + ' lb');
      return;
    }
    const goalLb = within(g, LIMITS.lb) ? Math.round(g * 10) / 10 : null;

    if (mode === 'auto') {
      const a = readAuto();
      targets = { ...targets, maint, goalLb, auto: a };
      // Apply straight away rather than waiting out the weekly gate — he just
      // asked for these numbers.
      const m2 = maintInfo();
      const lb = trendWeight();
      const n  = m2 && lb > 0 ? autoTargets(a, m2.cal, lb) : null;
      if (n) {
        targets = { ...targets, cal: n.cal, p: n.p, f: n.f,
                    auto: { ...a, lastAdj: Date.now() } };
      }
      await write('food/targets', targets);
      close(); render();
      if (onSaved) onSaved();
      toast(n ? 'Following your weight \u2014 ' + n.cal.toLocaleString() + ' kcal, ' + n.p + 'g protein'
              : 'Saved \u2014 targets will follow once there is enough data');
      return;
    }

    const tCal = parseInt(tc.input.value) || 2700,
          tP   = parseInt(tp.input.value) || 215,
          tF   = parseInt(tf.input.value) || 80;
    if (!within(tCal, LIMITS.cal)) {
      toast('Calories should be between ' + LIMITS.cal[0].toLocaleString() + ' and ' + LIMITS.cal[1].toLocaleString());
      return;
    }
    if (!within(tP, LIMITS.targetG) || !within(tF, LIMITS.targetG)) {
      toast('Protein and fat can’t be more than ' + LIMITS.targetG[1].toLocaleString() + ' g');
      return;
    }
    targets = {
      ...targets,
      cal: tCal, p: tP, f: tF,
      maint, goalLb,
      auto: { ...auto, on: false }
    };
    await write('food/targets', targets);
    close(); render(); toast('Targets saved');
    if (onSaved) onSaved();
  };
  sh.appendChild(save);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ================= CLAUDE IMPORT ================= */
function handleHash() {
  const h = location.hash || '';
  if (!h.startsWith('#log=')) return;
  let payload = null;
  try {
    let b64 = decodeURIComponent(h.slice(5)).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    payload = JSON.parse(decodeURIComponent(escape(atob(b64))));
  } catch {
    toast('Couldn’t read that log link');
  }
  window.history.replaceState(null, '', location.pathname + location.search);
  if (payload) confirmImport(normalizeImport(payload), 'From Claude');
}

export function openImportPaste() {
  const { sh, close } = sheet();
  sh.appendChild(el('h2', null, 'Paste food JSON'));
  sh.appendChild(noteEl('From Claude, or copied off any food already in your log \u2014 tap an entry \u203a Copy JSON. Lands on today. Nothing is logged until you confirm.'));

  const ta = document.createElement('textarea');
  ta.className = 'paste-box';
  ta.placeholder = '{"items":[{"name":"Chicken and rice","cal":650,"p":52,"c":78,"f":12}]}';
  sh.appendChild(ta);

  const paste = el('button', 'btn btn-ghost btn-block', 'Paste from clipboard');
  paste.style.marginTop = '8px';
  paste.onclick = async () => {
    const txt = await readClipboard();
    if (txt == null) { toast('Your browser won\u2019t share the clipboard \u2014 long-press the box'); ta.focus(); return; }
    ta.value = txt.trim();
  };
  sh.appendChild(paste);

  const go = el('button', 'btn btn-primary btn-block', 'Preview');
  go.style.marginTop = '10px';
  go.onclick = () => {
    let data = null;
    try { data = JSON.parse(ta.value); } catch { toast('That isn’t valid JSON'); return; }
    const entries = normalizeImport(data);
    if (!entries.length) { toast('No foods found in that JSON'); return; }
    close();
    confirmImport(entries, 'Pasted from Claude');
  };
  sh.appendChild(go);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* The four macro inputs every food sheet shares, read as one. A number past
   the ceiling stops the save with a toast instead of being trimmed quietly: a
   typed 25,000 is a slipped digit far more often than a meal, and trimming it
   would log 20,000 without a word. Below zero is simply zero. Imports from the
   estimator go through normalizeImport instead, which does trim — there is no
   input to send anyone back to. */
function readMacros(cal, p, c, f) {
  const num = (i, whole) => { const v = Math.max(0, parseFloat(i.value) || 0); return whole ? Math.round(v) : r1(v); };
  const mac = { cal: num(cal, true), p: num(p), c: num(c), f: num(f) };
  if (!within(mac.cal, LIMITS.entryCal)) {
    toast('One food can’t be more than ' + LIMITS.entryCal[1].toLocaleString() + ' kcal'); cal.focus(); return null;
  }
  const over = [p, c, f].find(i => !within(num(i), LIMITS.entryG));
  if (over) {
    toast('A macro can’t be more than ' + LIMITS.entryG[1].toLocaleString() + ' g'); over.focus(); return null;
  }
  return mac;
}

function normalizeImport(data) {
  let list = [];
  if (Array.isArray(data)) list = data;
  else if (data && Array.isArray(data.items)) list = data.items;
  else if (data && data.name) list = [data];
  return list.filter(x => x && x.name).map(x => {
    const e = {
      name: String(x.name).slice(0, 80),
      qty: x.qty ? String(x.qty).slice(0, 40) : '',
      cal: Math.round(clamp(parseFloat(x.cal) || 0, LIMITS.entryCal)),
      p: r1(clamp(parseFloat(x.p) || 0, LIMITS.entryG)),
      c: r1(clamp(parseFloat(x.c) || 0, LIMITS.entryG)),
      f: r1(clamp(parseFloat(x.f) || 0, LIMITS.entryG)),
      meal: MEALS.some(m => m[0] === x.meal) ? x.meal : defaultMeal(),
      src: 'claude'
    };
    if (x.micro && typeof x.micro === 'object') {
      const mo = {};
      MICROS.forEach(([k]) => { if (x.micro[k] != null) mo[k] = r1(clamp(parseFloat(x.micro[k]) || 0, LIMITS.micro)); });
      if (Object.keys(mo).length) e.micro = mo;
    }
    return e;
  });
}

function confirmImport(entries, sourceLabel) {
  if (!entries.length) return;
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', sourceLabel));
  sh.appendChild(el('h2', null, 'Log ' + entries.length + ' food' + (entries.length > 1 ? 's' : '') + '?'));

  const tot = entries.reduce((s, e) => ({ cal: s.cal + e.cal, p: s.p + e.p, c: s.c + e.c, f: s.f + e.f }),
    { cal: 0, p: 0, c: 0, f: 0 });
  sh.appendChild(noteEl(tot.cal + ' kcal · P ' + trimNum(tot.p) + ' · C ' + trimNum(tot.c) + ' · F ' + trimNum(tot.f) + ' — logging to today'));

  const list = el('div', 'import-list');
  entries.forEach(e => {
    const row = el('div', 'food-entry');
    const body = el('div', 'fe-body');
    body.appendChild(el('div', 'fe-name', e.name));
    body.appendChild(el('div', 'fe-sub num', (e.qty ? e.qty + '  ·  ' : '') + 'P ' + trimNum(e.p) + '  C ' + trimNum(e.c) + '  F ' + trimNum(e.f) + '  ·  ' + e.meal));
    row.appendChild(body);
    row.appendChild(el('div', 'fe-cal num', String(e.cal)));
    list.appendChild(row);
  });
  sh.appendChild(list);

  const go = el('button', 'btn btn-primary btn-block btn-lg', 'Log it');
  go.style.marginTop = '12px';
  go.onclick = async () => {
    // imports always land on TODAY regardless of the day being viewed
    bump('foodPaste');
    await logOnToday(entries);
    close();
    toast('Logged ' + entries.length + ' food' + (entries.length > 1 ? 's' : ''));
  };
  sh.appendChild(go);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ================= THE BAR, EXPLAINED =================
   Opened from the dots on the summary card. Every row is one thing on the
   card, with the reader's own numbers in it: "below 2,510" is a fact they can
   check against the bar behind the sheet, "below maintenance minus the band"
   is homework. The rows are built from the same maintInfo() / calorieZones()
   the bar is drawn from, so the two can never disagree. */
function openBarGuide(t) {
  const { sh } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Fuel'));
  sh.appendChild(el('h2', null, 'Reading the bar'));

  const mi = maintInfo();
  const z  = mi ? calorieZones(mi.cal) : null;
  const remain = targets.cal - t.cal;
  const n = v => Math.round(v).toLocaleString();

  const list = el('div', 'guide');
  const row = (swCls, title, text) => {
    const r = el('div', 'guide-row');
    r.appendChild(el('i', 'guide-sw ' + swCls));
    const body = el('div', 'guide-body');
    body.appendChild(el('div', 'guide-t', title));
    body.appendChild(el('div', 'guide-d', text));
    r.appendChild(body);
    list.appendChild(r);
  };

  row('big', 'The big number',
    (remain < 0 ? n(-remain) + ' over your target' : n(remain) + ' kcal left') +
    ' today. It counts down from your daily target, ' + n(targets.cal) + ', as you log food' +
    (z ? ', and its colour is the band you are in right now.' : '.'));

  row('eaten', 'Eaten · target',
    'What you have logged so far, ' + n(t.cal) + ', and the number you eat to, ' + n(targets.cal) +
    '. The target is yours to set under ⚙ Daily targets; it is not the same thing as maintenance.');

  if (z) {
    const g = goalSign(z.maint);
    row('head', 'The bar',
      'The day’s calories from zero, filled to what you have eaten; the white head is where you are now and moves right with every meal. ' +
      'The far end leans with your goal — ' +
      (g < 0 ? 'you are cutting, so it stops just past the gain line and the blue is most of the bar.'
      : g > 0 ? 'you are bulking, so it runs well into the red so there is room to land there.'
      :         'you are maintaining, so it stops a little past the gain line.'));
    row('cut', 'Blue — cut',
      'Below ' + n(z.cutTop) + ' kcal. Finish the day here and you are in a deficit: your body makes up the difference from stored fat.');
    row('hold', 'Yellow — hold',
      n(z.cutTop) + ' to ' + n(z.gainFrom) + ' kcal. Within ' + n(z.band) + ' either side of maintenance, ' +
      'which is close enough that the scale will not move in any direction that matters.');
    row('gain', 'Red — gain',
      'Above ' + n(z.gainFrom) + ' kcal. A surplus; what the body cannot use it stores, as muscle if you are training for it and as fat otherwise.');
    row('tick', 'The two solid ticks',
      'The edges of the yellow band — ' + n(z.cutTop) + ' and ' + n(z.gainFrom) + '. Maintenance itself is the middle of the band, ' + n(z.maint) + '.');
    row('target', 'The dashed mark',
      'Your daily target, ' + n(targets.cal) + '. Where it falls tells you what eating to it does: ' +
      (targets.cal < z.cutTop ? 'it is in the blue, so hitting it every day is a cut.'
      : targets.cal > z.gainFrom ? 'it is in the red, so hitting it every day is a bulk.'
      :                            'it is in the yellow, so hitting it every day holds your weight.'));
    row('status', 'The line under the bar',
      'The word for the band you are in, and how far you sit from maintenance right now. ' +
      '“maint ' + n(z.maint) + (mi.auto
        ? ' est.” means Rack measured that number from your weigh-ins against what you ate — it moves as it learns.'
        : '” is a number that was typed in or set at setup; clear it under ⚙ Daily targets and Rack measures its own.'));
  } else {
    row('head', 'The bar',
      'The white head is where you are now and moves right as you eat; the dashed mark is your target. ' +
      'The blue, yellow and red bands appear once Rack knows your maintenance — either type one under ⚙ Daily targets, or log a week of food alongside daily weigh-ins and it measures its own.');
  }

  row('macro', 'Protein · Carbs · Fat',
    'Grams so far against each target. Protein is a floor — at or above it is the point. Carbs are whatever is left after protein and fat, never a number you set: ' +
    n(targets.p) + ' g protein and ' + n(targets.f) + ' g fat leave ' + n(carbsTarget()) + ' g of carbs inside ' + n(targets.cal) + ' kcal.');

  sh.appendChild(list);
  sh.appendChild(noteEl('Roughly 3,500 kcal is a pound, so a pound a week is about 500 a day. Every number on this sheet is live — open it again tomorrow and it will have moved with you.'));
}

/* ================= THE GOAL, AS ONE WORD =================
   Cutting, maintaining or bulking. The goal has always lived as the sign of
   targets.auto.rateWk — onboarding writes it, the calorie bar and the You
   tab read it back — but the only place to change it was the rate box in
   the auto pane of Daily targets, which is not where anybody looks for
   "I want to cut now". This is the one-word switch: Your details calls it.

   Changing the word also moves the calorie target, because a cut whose
   target still sits at maintenance is not a cut, and the bar would say so
   in a note under itself forever. With auto targets on, the auto maths does
   the moving; by hand, calories become maintenance shifted by the rate
   (3,500 kcal a pound, so a pound a week is 500 a day), never below protein
   and fat plus 100 g of carbs. Without a maintenance number the word is
   saved and the calories are left alone. */
const GOAL_RATE = { cut: -1, hold: 0, gain: 0.5 };

export function goalId() {
  const a = targets.auto;
  if (a && Number.isFinite(a.rateWk) && a.rateWk !== 0) return a.rateWk < 0 ? 'cut' : 'gain';
  const mi = maintInfo();
  if (mi && targets.cal > 0) {
    if (targets.cal < mi.cal - 100) return 'cut';
    if (targets.cal > mi.cal + 100) return 'gain';
  }
  return 'hold';
}

function goalNext(id) {
  const cur = targets.auto && Number.isFinite(targets.auto.rateWk) ? targets.auto.rateWk : 0;
  // Keep a rate the person already chose when it points the same way, so
  // switching cut → hold → cut does not quietly reset a ½ lb cut to 1 lb.
  const rate = (id === 'cut' && cur < 0) || (id === 'gain' && cur > 0) ? cur : GOAL_RATE[id];
  const a = { ...AUTO_DEFAULTS, ...(targets.auto || {}), rateWk: rate };
  let next = { ...targets, auto: a };
  const mi = maintInfo();
  if (mi) {
    if (a.on) {
      const lb = trendWeight();
      const n = lb > 0 ? autoTargets(a, mi.cal, lb) : null;
      if (n) next = { ...next, cal: n.cal, p: n.p, f: n.f, auto: { ...a, lastAdj: Date.now() } };
    } else {
      const floor = (targets.p || 0) * 4 + (targets.f || 0) * 9 + MIN_CARB_G * 4;
      next.cal = Math.max(floor, Math.round((mi.cal + rate * 500) / 10) * 10);
    }
  }
  return { next, maint: mi ? mi.cal : null, rate };
}

export function previewGoal(id) {
  const { next, maint, rate } = goalNext(id);
  return { cal: next.cal, maint, rate, changed: next.cal !== targets.cal };
}

export async function setGoal(id) {
  const { next } = goalNext(id);
  targets = next;
  await write('food/targets', targets);
  render();
  return targets.cal;
}

/* Whether the calorie target sits in the band the goal word says. Null when
   maintenance is not known, because then there are no bands to sit in. */
export function goalFits(id = goalId()) {
  const mi = maintInfo();
  if (!mi || !(targets.cal > 0)) return null;
  const z = calorieZones(mi.cal);
  return id === 'cut' ? targets.cal < z.cutTop
       : id === 'gain' ? targets.cal > z.gainFrom
       : targets.cal >= z.cutTop && targets.cal <= z.gainFrom;
}
