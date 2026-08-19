// Fuel — nutrition tracking.
// Data lives under users/{uid}/food/*, mirrored to localStorage by store.js.
//   food/log/{YYYY-MM-DD}  -> { entryId: entry }
//   food/items             -> { itemId: item }      saved-food library
//   food/meals             -> { mealId: meal }      saved multi-item meals
//   food/targets           -> { cal, p, f }         carbs = remainder
//   food/daySummaries/{d}  -> { cal, p, c, f }      tiny per-day rollup (TDEE math)
//
// Every one of those paths is already per-account — store.js prefixes them
// with users/{uid}/. The only thing that used to leak between accounts was
// the hard-coded starter foods, which are now owner-only (see seedItems).

import { read, write, writeFeed, watch, LS, todayKey, uid } from './store.js';
import { maintenance, calorieZones, zoneOf } from './tdee.js';
import { OWNER_UID } from './firebase-config.js';
import { $, el, sheet, toast, noteEl, confirmSheet, copyText, readClipboard, r1, trimNum } from './ui.js';

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
let items    = {};      // itemId  -> library item
let meals    = {};      // mealId  -> saved meal
let targets  = { cal: 2700, p: 215, f: 80, maint: null };
let feedTimer = null;
let weighIns = {};      // weight/entries — only for the maintenance estimate
let summaries = {};     // food/daySummaries — ditto
let unwatchDay = null;  // live listener on the day being viewed

/* ================= INIT ================= */
export async function initFood() {
  targets = (await read('food/targets', null)) || targets;
  items   = (await read('food/items',   null)) || {};
  meals   = (await read('food/meals',   null)) || {};
  await loadMaintInputs();
  await seedItems();
  await loadDay();

  window.addEventListener('hashchange', handleHash);
  handleHash();
  render();
}

async function loadDay() {
  dayLog = (await read('food/log/' + dk(viewDate), null)) || {};
  watchDay();
}

// Live listener on whichever day is on screen. Anything that edits the log
// from outside the app — Claude writing straight to the database — shows up
// here without a refresh. Rollups are recomputed locally so the TDEE math and
// the public feed stay honest no matter who did the writing.
function watchDay() {
  if (unwatchDay) { unwatchDay(); unwatchDay = null; }
  const key = dk(viewDate);
  unwatchDay = watch('food/log/' + key, val => {
    const next = val || {};
    if (JSON.stringify(next) === JSON.stringify(dayLog)) return;
    dayLog = next;
    render();
    const t = totals();
    write('food/daySummaries/' + key, { cal: t.cal, p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f) });
    queueFeed();
  });
}

async function loadMaintInputs() {
  weighIns  = (await read('weight/entries',     null)) || {};
  summaries = (await read('food/daySummaries',  null)) || {};
}

function dk(d) { return todayKey(d); }
function isToday() { return dk(viewDate) === todayKey(); }

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
  const t = totals();
  await write('food/daySummaries/' + key, { cal: t.cal, p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f) });
  queueFeed();
}

function totals() {
  const t = { cal: 0, p: 0, c: 0, f: 0, micro: {}, microCount: {}, n: 0 };
  Object.values(dayLog).forEach(e => {
    t.cal += e.cal || 0; t.p += e.p || 0; t.c += e.c || 0; t.f += e.f || 0; t.n++;
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

function queueFeed() {
  clearTimeout(feedTimer);
  feedTimer = setTimeout(pushFoodFeed, 600);
}

async function pushFoodFeed() {
  const t = totals();
  await writeFeed({
    nutrition: {
      date: dk(viewDate),
      cal: t.cal, p: t.p, c: t.c, f: t.f,
      targetCal: targets.cal, targetP: targets.p, targetC: carbsTarget(), targetF: targets.f,
      items: Object.values(dayLog)
        .sort((a, b) => (a.t || 0) - (b.t || 0))
        .map(e => ({ n: e.name, q: e.qty || '', cal: e.cal, meal: e.meal }))
    }
  });
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
  });
  await saveDay();
  render();
}

function addEntry(entry) {
  const id = newEntryId();
  dayLog[id] = { id, t: Date.now(), ...entry };
  saveDay();
  render();
}

function touchItem(id) {
  if (!items[id]) return;
  items[id].uses = (items[id].uses || 0) + 1;
  items[id].last = Date.now();
  write('food/items', items);
}

/* ---------- portion scaling on an already-logged entry ----------
   "I ate that twice" shouldn't mean re-typing four numbers. `factor` is
   relative to what is currently showing, so tapping ×2 twice gives 4×. */
function scaleEntry(e, factor) {
  const item = e.itemId ? items[e.itemId] : null;

  // Library-linked entries scale by amount so the gram maths stays honest.
  if (item && e.amt) {
    const amt = r1(e.amt * factor);
    const m = macrosFor(item, amt, e.unit || 'serv');
    if (m) {
      Object.assign(e, m, { amt, qty: qtyLabel(item, amt, e.unit || 'serv') });
      return;
    }
  }

  e.cal = Math.round((e.cal || 0) * factor);
  e.p = r1((e.p || 0) * factor);
  e.c = r1((e.c || 0) * factor);
  e.f = r1((e.f || 0) * factor);
  if (e.micro) for (const k of Object.keys(e.micro)) e.micro[k] = r1(e.micro[k] * factor);

  if (e.qtyBase == null) { e.qtyBase = e.qty || ''; e.mult = 1; }
  e.mult = r1((e.mult || 1) * factor);
  e.qty = e.mult === 1
    ? e.qtyBase
    : (e.qtyBase ? e.qtyBase + ' × ' + trimNum(e.mult) : '× ' + trimNum(e.mult));
}

/* ================= RENDER ================= */
export function render() {
  const root = $('#view-food');
  if (!root) return;
  root.innerHTML = '';
  const wrap = el('div', 'screen-pad');

  // header + date nav
  const hd = el('div', 'cal-hd');
  const left = el('div');
  left.appendChild(el('div', 'eyebrow', 'Fuel'));
  const title = isToday() ? 'Today'
    : viewDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  left.appendChild(el('h1', null, title));
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

  MEALS.forEach(([id, label]) => wrap.appendChild(renderMeal(id, label)));

  wrap.appendChild(renderMicros());
  root.appendChild(wrap);
}

function renderSummary() {
  const t = totals();
  const card = el('div', 'card');

  const top = el('div', 'fuel-top');
  const remain = targets.cal - t.cal;
  const big = el('div', 'load-num num', String(Math.abs(remain).toLocaleString()));
  big.style.fontSize = '40px';
  big.style.color = remain < 0 ? 'var(--bad)' : 'var(--chalk)';
  top.appendChild(big);
  const sub = el('div');
  sub.appendChild(el('div', 'eyebrow', remain < 0 ? 'kcal over' : 'kcal left'));
  const eaten = el('div', 'num fuel-eaten', t.cal.toLocaleString() + ' / ' + targets.cal.toLocaleString());
  sub.appendChild(eaten);
  top.appendChild(sub);
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
  return card;
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
function renderCalMeter(cal) {
  const wrap = el('div', 'cal-meter');
  const mi = maintInfo();
  const z  = mi ? calorieZones(mi.cal) : null;

  // Scale: always leave headroom past the gain tick so the third band is real
  // estate you can actually land in, and never clip the day you overshot.
  const headroom = z ? Math.max(350, z.gainFrom * 0.12) : targets.cal * 0.15;
  const top = (z ? z.gainFrom : targets.cal) + headroom;
  // A wild day would otherwise stretch the axis until the three bands are
  // slivers, so the scale stops growing well before that. Past the end the bar
  // just pins full — the number above it says how far over you went.
  const ceiling = (z ? z.gainFrom : targets.cal) * 1.35;
  const max = Math.ceil(Math.min(Math.max(top, targets.cal * 1.08, cal * 1.06, 1), ceiling) / 100) * 100;
  const pct = v => Math.max(0, Math.min(100, v / max * 100));

  const track = el('div', 'cal-track');
  if (z) {
    const band = (cls, from, to) => {
      const d = el('div', 'cal-zone ' + cls);
      d.style.left = pct(from) + '%';
      d.style.width = (pct(to) - pct(from)) + '%';
      return d;
    };
    track.append(band('cut', 0, z.cutTop), band('hold', z.cutTop, z.gainFrom), band('gain', z.gainFrom, max));
  }

  const zone = zoneOf(cal, z);
  const fill = el('div', 'cal-fill');
  fill.style.width = pct(cal) + '%';
  fill.style.background = !z ? 'var(--p-white)'
    : zone === 'cut' ? 'var(--p-blue)'
    : zone === 'maintain' ? 'var(--p-yellow)' : 'var(--p-red)';
  track.appendChild(fill);

  if (z) [z.cutTop, z.gainFrom].forEach(v => {
    const tk = el('div', 'cal-tick');
    tk.style.left = pct(v) + '%';
    track.appendChild(tk);
  });

  const head = el('div', 'cal-head');
  head.style.left = pct(cal) + '%';
  track.appendChild(head);
  wrap.appendChild(track);

  if (z) {
    const legend = el('div', 'cal-bands');
    const lab = (txt, from, to) => {
      const w = pct(to) - pct(from);
      const d = el('div', 'cal-band-lab', w < 9 ? '' : txt);   // too narrow to read
      d.style.left = pct(from) + '%';
      d.style.width = w + '%';
      return d;
    };
    legend.append(lab('cut', 0, z.cutTop), lab('hold', z.cutTop, z.gainFrom), lab('gain', z.gainFrom, max));
    wrap.appendChild(legend);

    const gap = Math.round(cal - z.maint);
    const msg = zone === 'cut'   ? 'In a deficit \u00b7 ' + Math.abs(gap).toLocaleString() + ' under maintenance'
              : zone === 'gain'  ? 'Gaining \u00b7 ' + gap.toLocaleString() + ' over maintenance'
              :                    'Holding \u00b7 within ' + z.band + ' of maintenance';
    const line = el('div', 'cal-status');
    const dot = el('i');
    dot.style.background = fill.style.background;
    line.append(dot, el('span', null, msg));
    line.appendChild(el('span', 'cal-maint num',
      'maint ' + z.maint.toLocaleString() + (mi.auto ? ' est.' : '')));
    wrap.appendChild(line);
  } else {
    wrap.appendChild(noteEl('Set your maintenance calories in \u2699 Settings \u2014 or log a week of food alongside your weigh-ins \u2014 to mark the cut / maintain / gain lines on this bar.'));
  }
  return wrap;
}

function renderMeal(mealId, label) {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', label));

  const entries = Object.values(dayLog).filter(e => e.meal === mealId).sort((a, b) => (a.t || 0) - (b.t || 0));
  const kcal = entries.reduce((s, e) => s + (e.cal || 0), 0);

  const right = el('div', 'meal-right');
  if (entries.length) {
    right.appendChild(el('div', 'num meal-kcal', kcal + ' kcal'));
    const save = el('button', 'ex-menu', '⋯');
    save.title = 'Save as meal';
    save.onclick = () => saveAsMeal(label, entries);
    right.appendChild(save);
  }
  hd.appendChild(right);
  card.appendChild(hd);

  entries.forEach(e => card.appendChild(renderEntry(e)));

  const add = el('button', 'btn btn-ghost btn-block', '+ Add food');
  add.style.marginTop = entries.length ? '10px' : '0';
  add.onclick = () => openAdd(mealId);
  card.appendChild(add);
  return card;
}

function renderEntry(e) {
  const row = el('button', 'food-entry');
  const body = el('div', 'fe-body');
  body.appendChild(el('div', 'fe-name', e.name));
  body.appendChild(el('div', 'fe-sub num',
    (e.qty ? e.qty + '  ·  ' : '') + 'P ' + trimNum(e.p || 0) + '  C ' + trimNum(e.c || 0) + '  F ' + trimNum(e.f || 0)));
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

    const readout = el('div', 'entry-readout num',
      (e.cal || 0) + ' kcal   ·   P ' + trimNum(e.p || 0) +
      '   C ' + trimNum(e.c || 0) + '   F ' + trimNum(e.f || 0));
    body.appendChild(readout);

    /* ---- ate more than one? ---- */
    body.appendChild(el('div', 'field-lbl', 'Ate more than one?'));
    const multRow = el('div', 'filter-row');
    [['×2', 2], ['×3', 3], ['×4', 4], ['Half', 0.5]].forEach(([label, factor]) => {
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

    const again = el('button', 'btn btn-ghost btn-block', 'Log this again separately');
    again.style.marginTop = '10px';
    again.onclick = () => {
      const copy = { ...e };
      delete copy.id; delete copy.t;
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
        await logOnToday([{ ...copy, src: 'repeat' }]);
        close();
        toast('Logged on today');
      };
      reuse.appendChild(toToday);
    }
    body.appendChild(reuse);

    /* ---- precise editing ---- */
    body.appendChild(el('div', 'field-lbl', item ? 'Exact portion' : 'Exact numbers'));

    if (item) {
      let first = true;
      body.appendChild(portionControl(item, e.amt || 1, e.unit || 'serv', (amt, unit, m) => {
        if (first) { first = false; return; }   // the control paints once on build
        Object.assign(e, m, { amt, unit, qty: qtyLabel(item, amt, unit) });
        delete e.qtyBase; delete e.mult;
        saveDay();
        readout.textContent = (e.cal || 0) + ' kcal   ·   P ' + trimNum(e.p || 0) +
          '   C ' + trimNum(e.c || 0) + '   F ' + trimNum(e.f || 0);
      }));
    } else {
      const mkNum = (key, label) => {
        const f = el('div', 'field');
        f.appendChild(el('label', null, label));
        const i = el('input'); i.type = 'number'; i.inputMode = 'decimal'; i.value = e[key] || 0;
        i.onchange = ev => {
          e[key] = key === 'cal'
            ? Math.round(parseFloat(ev.target.value) || 0)
            : r1(parseFloat(ev.target.value) || 0);
          // a manual override invalidates the multiplier bookkeeping
          delete e.qtyBase; delete e.mult;
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

/* ================= ADD FLOW ================= */
function openAdd(mealId) {
  const { sh, close } = sheet();

  const search = el('div', 'picker-search');
  const inp = el('input');
  inp.placeholder = 'Search foods';
  inp.type = 'search';
  search.appendChild(inp);

  const actions = el('div', 'filter-row');
  const scanBtn = el('button', 'chip', '▣ Scan barcode');
  scanBtn.onclick = () => { close(); openScanner(code => lookupBarcode(code, mealId)); };
  const manBtn = el('button', 'chip', '+ Manual');
  manBtn.onclick = () => { close(); openManual(mealId); };
  actions.append(scanBtn, manBtn);

  let tab = 'foods';
  const foodsChip = el('button', 'chip on', 'Foods');
  const mealsChip = el('button', 'chip', 'Meals');
  foodsChip.onclick = () => { tab = 'foods'; foodsChip.classList.add('on'); mealsChip.classList.remove('on'); paint(); };
  mealsChip.onclick = () => { tab = 'meals'; mealsChip.classList.add('on'); foodsChip.classList.remove('on'); paint(); };
  actions.append(foodsChip, mealsChip);
  search.appendChild(actions);
  sh.appendChild(search);

  const list = el('div', 'ex-list');
  sh.appendChild(list);

  let q = '';
  inp.oninput = ev => { q = ev.target.value.toLowerCase().trim(); paint(); };

  function paint() {
    list.innerHTML = '';
    if (tab === 'meals') {
      const pool = Object.values(meals).filter(m => !q || m.name.toLowerCase().includes(q));
      if (!pool.length) list.appendChild(noteEl(q ? 'No saved meals match.' : 'No saved meals yet. Log a meal, then ⋯ → save.'));
      pool.forEach(m => {
        const kcal = m.items.reduce((s, i) => s + (i.cal || 0), 0);
        const b = el('button', 'ex-item');
        b.appendChild(el('span', 'nm', m.name));
        b.appendChild(el('span', 'eq num', m.items.length + ' items · ' + kcal + ' kcal'));
        b.onclick = () => {
          m.items.forEach(i => addEntry({ ...i, meal: mealId, src: 'meal' }));
          close(); toast('Added ' + m.name);
        };
        const x = el('span', 'eq ex-del', '✕');
        x.onclick = ev => {
          ev.stopPropagation();
          confirmSheet({
            title: 'Delete saved meal?',
            body: '“' + m.name + '” will be removed from your meal library.',
            confirmLabel: 'Delete',
            danger: true,
            onConfirm: () => { delete meals[m.id]; write('food/meals', meals); paint(); }
          });
        };
        b.appendChild(x);
        list.appendChild(b);
      });
      return;
    }
    const pool = Object.values(items)
      .filter(it => !q || it.name.toLowerCase().includes(q) || (it.brand || '').toLowerCase().includes(q))
      .sort((a, b) => (b.last || 0) - (a.last || 0) || (b.uses || 0) - (a.uses || 0) || a.name.localeCompare(b.name));

    if (!pool.length) list.appendChild(noteEl('Nothing saved matches. Scan it or add it manually.'));
    pool.slice(0, 80).forEach(it => {
      const b = el('button', 'ex-item');
      b.appendChild(el('span', 'nm', it.name));
      const per = it.base === '100g' ? 'per 100 g' : 'per ' + ((it.serv && it.serv.label) || 'serving');
      b.appendChild(el('span', 'eq num', it.n.cal + ' kcal ' + per));
      b.onclick = () => { close(); openPortion(it, mealId); };
      list.appendChild(b);
    });
  }

  paint();

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '10px';
  cancel.onclick = close;
  sh.appendChild(cancel);
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
  plus.onclick  = () => { amt = r1(amt + step()); paint(); };
  amtIn.onchange = ev => { amt = Math.max(0, parseFloat(ev.target.value) || 0); paint(); };

  box.append(unitRow, stepRow, preview);
  paint();
  return box;
}

function openPortion(item, mealId) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', item.brand || 'Food'));
  sh.appendChild(el('h2', null, item.name));

  let current = { amt: 1, unit: item.base === '100g' ? 'g' : 'serv', m: null };
  if (current.unit === 'g') current.amt = (item.serv && item.serv.grams) || 100;

  sh.appendChild(portionControl(item, current.amt, current.unit, (amt, unit, m) => {
    current = { amt, unit, m };
  }));

  let meal = mealId || defaultMeal();
  const mealRow = el('div', 'filter-row');
  MEALS.forEach(([id, label]) => {
    const c = el('button', 'chip' + (meal === id ? ' on' : ''), label);
    c.onclick = () => { meal = id; mealRow.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); c.classList.add('on'); };
    mealRow.appendChild(c);
  });
  sh.appendChild(mealRow);

  const addBtn = el('button', 'btn btn-primary btn-block btn-lg', 'Add');
  addBtn.style.marginTop = '12px';
  addBtn.onclick = () => {
    if (!current.m) return;
    addEntry({
      name: item.name, itemId: item.id, amt: current.amt, unit: current.unit,
      qty: qtyLabel(item, current.amt, current.unit),
      ...current.m, meal, src: 'lib'
    });
    touchItem(item.id);
    close();
  };
  sh.appendChild(addBtn);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ---------- manual entry ---------- */
function openManual(mealId, prefill) {
  const { sh, close } = sheet();
  sh.appendChild(el('h2', null, prefill ? 'Confirm food' : 'Manual entry'));

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
  const mealRow = el('div', 'filter-row');
  MEALS.forEach(([id, label]) => {
    const ch = el('button', 'chip' + (meal === id ? ' on' : ''), label);
    ch.onclick = () => { meal = id; mealRow.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); ch.classList.add('on'); };
    mealRow.appendChild(ch);
  });
  sh.appendChild(mealRow);

  const add = el('button', 'btn btn-primary btn-block btn-lg', 'Add');
  add.style.marginTop = '12px';
  add.onclick = () => {
    const nm = name.input.value.trim();
    if (!nm) { toast('Give it a name'); return; }
    const entry = {
      name: nm, qty: qty.input.value.trim(),
      cal: Math.round(parseFloat(cal.input.value) || 0),
      p: r1(parseFloat(p.input.value) || 0),
      c: r1(parseFloat(c.input.value) || 0),
      f: r1(parseFloat(fat.input.value) || 0),
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
    addEntry(entry);
    close();
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

function openScanner(onCode) {
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

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '10px';
  cancel.onclick = () => finish(null);
  sh.appendChild(cancel);
  back.onclick = () => finish(null);

  (async () => {
    try {
      if ('BarcodeDetector' in window) {
        const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        await video.play();
        status.textContent = 'Point at the barcode';
        const iv = setInterval(async () => {
          if (done) return;
          try {
            const codes = await det.detect(video);
            if (codes.length) finish(codes[0].rawValue);
          } catch {}
        }, 280);
        stopFns.push(() => clearInterval(iv));
      } else {
        status.textContent = 'Loading scanner…';
        const ZX = await loadZXing();
        const reader = new ZX.BrowserMultiFormatReader();
        status.textContent = 'Point at the barcode';
        const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          if (result) finish(result.getText());
        });
        stopFns.push(() => controls.stop());
      }
    } catch (err) {
      status.textContent = 'Camera unavailable — check permission in Settings.';
    }
  })();
}

async function lookupBarcode(code, mealId) {
  toast('Looking up ' + code + '…');
  try {
    const r = await fetch('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) + '.json');
    const j = await r.json();
    if (!j || j.status !== 1 || !j.product) {
      toast('Not in Open Food Facts — add it manually');
      openManual(mealId, { name: '', qty: '', src: 'barcode' });
      return;
    }
    const item = itemFromOFF(j.product, code);
    if (!item) {
      toast('Product found but no nutrition data');
      openManual(mealId, { name: j.product.product_name || '', src: 'barcode' });
      return;
    }
    // upsert into library keyed by barcode
    const existing = Object.values(items).find(i => i.barcode === code);
    const id = existing ? existing.id : 'b' + code;
    items[id] = { ...(existing || {}), id, ...item, uses: (existing && existing.uses) || 0, last: Date.now() };
    await write('food/items', items);
    openPortion(items[id], mealId);
  } catch {
    toast('Lookup failed — no connection?');
    openManual(mealId, { name: '', src: 'barcode' });
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

/* ================= SAVED MEALS ================= */
function saveAsMeal(defaultLabel, entries) {
  const { sh, close } = sheet();
  sh.appendChild(el('h2', null, 'Save as a meal'));
  sh.appendChild(noteEl('These ' + entries.length + ' items become one entry you can add in a single tap.'));

  const w = el('div', 'field');
  w.style.marginTop = '14px';
  w.appendChild(el('label', null, 'Name'));
  const i = el('input');
  i.type = 'text';
  i.value = defaultLabel + ' — ' + todayKey();
  w.appendChild(i);
  sh.appendChild(w);

  const go = el('button', 'btn btn-primary btn-block btn-lg', 'Save meal');
  go.style.marginTop = '14px';
  go.onclick = () => {
    const name = i.value.trim();
    if (!name) { toast('Give it a name'); return; }
    const id = 'm' + Date.now().toString(36);
    meals[id] = {
      id, name,
      items: entries.map(e => ({
        name: e.name, qty: e.qty || '', cal: e.cal || 0, p: e.p || 0, c: e.c || 0, f: e.f || 0,
        micro: e.micro || null, itemId: e.itemId || null, amt: e.amt || null, unit: e.unit || null
      }))
    };
    write('food/meals', meals);
    close();
    toast('Meal saved');
  };
  sh.appendChild(go);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
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

/* ================= TARGETS ================= */
function openTargets() {
  const { sh, close } = sheet();
  sh.appendChild(el('h2', null, 'Daily targets'));
  sh.appendChild(noteEl('Carbs are whatever calories remain after protein and fat.'));

  const mkT = (key, label) => {
    const w = el('div', 'field');
    w.style.marginTop = '10px';
    w.appendChild(el('label', null, label));
    const i = el('input'); i.type = 'number'; i.inputMode = 'numeric'; i.value = targets[key];
    w.appendChild(i);
    w.input = i;
    return w;
  };
  const tc = mkT('cal', 'Calories'), tp = mkT('p', 'Protein g'), tf = mkT('f', 'Fat g');
  sh.append(tc, tp, tf);


  const carbs = el('div', 'eyebrow');
  const paintCarbs = () => {
    const cal = parseInt(tc.input.value) || 0, p = parseInt(tp.input.value) || 0, f = parseInt(tf.input.value) || 0;
    carbs.textContent = 'Carbs → ' + Math.max(0, Math.round((cal - p * 4 - f * 9) / 4)) + ' g';
  };
  [tc, tp, tf].forEach(w => w.input.oninput = paintCarbs);
  paintCarbs();
  sh.appendChild(carbs);
  // Maintenance: optional. Blank means "use the estimate off my weight trend".
  const est = maintenance(weighIns, summaries);
  const tm = el('div', 'field');
  tm.style.marginTop = '10px';
  tm.appendChild(el('label', null, 'Maintenance kcal'));
  const mi = el('input');
  mi.type = 'number'; mi.inputMode = 'numeric';
  mi.value = targets.maint > 0 ? targets.maint : '';
  mi.placeholder = est.tdee ? String(est.tdee) + ' (estimated)' : 'leave blank to estimate';
  tm.appendChild(mi);
  sh.appendChild(tm);
  sh.appendChild(noteEl(est.tdee
    ? 'Your weight trend puts maintenance around ' + est.tdee.toLocaleString() + ' kcal. Leave this blank to keep following that estimate, or type your own number to pin the cut / maintain / gain marks.'
    : 'The estimate needs ' + est.need.join(' and ') + '. Type a number here to draw the zones in the meantime.'));

  const save = el('button', 'btn btn-primary btn-block', 'Save');
  save.style.marginTop = '14px';
  save.onclick = async () => {
    targets = {
      cal: parseInt(tc.input.value) || 2700,
      p: parseInt(tp.input.value) || 215,
      f: parseInt(tf.input.value) || 80,
      maint: parseInt(mi.value) > 0 ? parseInt(mi.value) : null
    };
    await write('food/targets', targets);
    queueFeed();
    close(); render(); toast('Targets saved');
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

function openImportPaste() {
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

function normalizeImport(data) {
  let list = [];
  if (Array.isArray(data)) list = data;
  else if (data && Array.isArray(data.items)) list = data.items;
  else if (data && data.name) list = [data];
  return list.filter(x => x && x.name).map(x => {
    const e = {
      name: String(x.name).slice(0, 80),
      qty: x.qty ? String(x.qty).slice(0, 40) : '',
      cal: Math.round(parseFloat(x.cal) || 0),
      p: r1(parseFloat(x.p) || 0),
      c: r1(parseFloat(x.c) || 0),
      f: r1(parseFloat(x.f) || 0),
      meal: MEALS.some(m => m[0] === x.meal) ? x.meal : defaultMeal(),
      src: 'claude'
    };
    if (x.micro && typeof x.micro === 'object') {
      const mo = {};
      MICROS.forEach(([k]) => { if (x.micro[k] != null) mo[k] = r1(parseFloat(x.micro[k]) || 0); });
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
