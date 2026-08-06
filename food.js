// Fuel — nutrition tracking.
// Data lives under users/{uid}/food/*, mirrored to localStorage by store.js.
//   food/log/{YYYY-MM-DD}  -> { entryId: entry }
//   food/items             -> { itemId: item }      saved-food library
//   food/meals             -> { mealId: meal }      saved multi-item meals
//   food/targets           -> { cal, p, f }         carbs = remainder
//   food/daySummaries/{d}  -> { cal, p, c, f }      tiny per-day rollup (TDEE math)

import { read, write, writeFeed, LS, todayKey } from './store.js';
import { toast } from './workout.js';

const $  = s => document.querySelector(s);
const el = (t, c, txt) => { const n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; };

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
let targets  = { cal: 2700, p: 215, f: 80 };
let feedTimer = null;

/* ================= INIT ================= */
export async function initFood() {
  targets = (await read('food/targets', null)) || targets;
  items   = (await read('food/items',   null)) || {};
  meals   = (await read('food/meals',   null)) || {};
  await seedItems();
  await loadDay();

  window.addEventListener('hashchange', handleHash);
  handleHash();
  render();
}

async function loadDay() {
  dayLog = (await read('food/log/' + dk(viewDate), null)) || {};
}

function dk(d) { return todayKey(d); }
function isToday() { return dk(viewDate) === todayKey(); }

/* ---------- pre-seeded items from Micah's reference data ---------- */
async function seedItems() {
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
  let changed = false;
  for (const id of Object.keys(seeds)) {
    if (!items[id]) { items[id] = { id, ...seeds[id] }; changed = true; }
  }
  if (changed) await write('food/items', items);
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
  return trimNum(amt) + ' \u00d7 ' + lbl + (item.serv && item.serv.grams ? ' (' + trimNum(amt * item.serv.grams) + ' g)' : '');
}

function r1(x) { return Math.round(x * 10) / 10; }
function trimNum(x) { return String(r1(x)).replace(/\.0$/, ''); }
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

function addEntry(entry) {
  const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
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
  const prev = el('button', null, '\u2039'); prev.setAttribute('aria-label', 'Previous day');
  const next = el('button', null, '\u203A'); next.setAttribute('aria-label', 'Next day');
  prev.onclick = async () => { viewDate = new Date(viewDate.getTime() - 864e5); await loadDay(); render(); };
  next.onclick = async () => { viewDate = new Date(viewDate.getTime() + 864e5); await loadDay(); render(); };
  next.disabled = isToday();
  nav.append(prev, next);
  hd.appendChild(nav);
  wrap.appendChild(hd);

  wrap.appendChild(renderSummary());

  // tool row
  const tools = el('div', 'tool-row');
  const mk = (label, fn) => { const b = el('button', 'chip', label); b.onclick = fn; return b; };
  tools.appendChild(mk('Copy yesterday', copyYesterday));
  tools.appendChild(mk('Targets', openTargets));
  tools.appendChild(mk('Import', () => openImportPaste()));
  wrap.appendChild(tools);

  MEALS.forEach(([id, label]) => wrap.appendChild(renderMeal(id, label)));

  wrap.appendChild(renderMicros());
  root.appendChild(wrap);
}

function renderSummary() {
  const t = totals();
  const card = el('div', 'card');

  const top = el('div');
  top.style.cssText = 'display:flex;align-items:baseline;gap:10px;margin-bottom:12px';
  const remain = targets.cal - t.cal;
  const big = el('div', 'load-num num', String(Math.abs(remain).toLocaleString()));
  big.style.fontSize = '40px';
  big.style.color = remain < 0 ? 'var(--bad)' : 'var(--chalk)';
  top.appendChild(big);
  const sub = el('div');
  sub.appendChild(el('div', 'eyebrow', remain < 0 ? 'kcal over' : 'kcal left'));
  const eaten = el('div', 'num', t.cal.toLocaleString() + ' / ' + targets.cal.toLocaleString());
  eaten.style.cssText = 'font-size:12px;color:var(--dim)';
  sub.appendChild(eaten);
  top.appendChild(sub);
  card.appendChild(top);

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

function renderMeal(mealId, label) {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', label));

  const entries = Object.values(dayLog).filter(e => e.meal === mealId).sort((a, b) => (a.t || 0) - (b.t || 0));
  const kcal = entries.reduce((s, e) => s + (e.cal || 0), 0);

  const right = el('div');
  right.style.cssText = 'display:flex;align-items:center;gap:8px';
  if (entries.length) right.appendChild(el('div', 'num', kcal + ' kcal')).style.cssText += ';font-size:11px;color:var(--dim)';
  if (entries.length) {
    const save = el('button', 'ex-menu', '\u22ef');
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
  const body = el('div');
  body.style.minWidth = '0';
  const nm = el('div', 'fe-name', e.name);
  body.appendChild(nm);
  const sub = el('div', 'fe-sub num',
    (e.qty ? e.qty + '  \u00b7  ' : '') + 'P ' + trimNum(e.p || 0) + '  C ' + trimNum(e.c || 0) + '  F ' + trimNum(e.f || 0));
  body.appendChild(sub);
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
  if (!t.n) {
    card.appendChild(noteEl('Nothing logged yet.'));
    return card;
  }
  if (!withData) {
    card.appendChild(noteEl('None of today\u2019s foods carry micronutrient data.'));
    return card;
  }

  const grid = el('div', 'micro-grid');
  MICROS.forEach(([k, label, unit]) => {
    if (t.micro[k] == null) return;
    const cell = el('div');
    cell.appendChild(el('div', 'stat-val num', trimNum(t.micro[k]) + ' ' + unit));
    cell.appendChild(el('div', 'stat-lbl', label));
    const cov = el('div', 'stat-lbl', t.microCount[k] + ' of ' + t.n + ' foods');
    cov.style.color = 'var(--knurl)';
    cell.appendChild(cov);
    grid.appendChild(cell);
  });
  card.appendChild(grid);
  card.appendChild(noteEl('Sums cover only foods that report each value \u2014 treat these as floors, not truth.'));
  return card;
}

function noteEl(txt) {
  const p = el('div', null, txt);
  p.style.cssText = 'font-size:12px;color:var(--dim);line-height:1.5';
  return p;
}

/* ================= ENTRY SHEET (edit / delete) ================= */
function openEntry(e) {
  const { back, sh, close } = sheet();
  sh.appendChild(el('h2', null, e.name));
  if (e.qty) sh.appendChild(el('div', 'eyebrow', e.qty));

  // linked to a library item -> quantity is re-computable
  const item = e.itemId ? items[e.itemId] : null;

  if (item) {
    sh.appendChild(portionControl(item, e.amt || 1, e.unit || 'serv', (amt, unit, m) => {
      Object.assign(e, m, { amt, unit, qty: qtyLabel(item, amt, unit) });
      saveDay();
    }));
  } else {
    const grid = el('div', 'row-split');
    const mkNum = (key, label) => {
      const f = el('div', 'field');
      f.appendChild(el('label', null, label));
      const i = el('input'); i.type = 'number'; i.inputMode = 'decimal'; i.value = e[key] || 0;
      i.onchange = ev => { e[key] = parseFloat(ev.target.value) || 0; saveDay(); };
      f.appendChild(i);
      return f;
    };
    grid.append(mkNum('cal', 'kcal'), mkNum('p', 'Protein'));
    sh.appendChild(grid);
    const grid2 = el('div', 'row-split');
    grid2.append(mkNum('c', 'Carbs'), mkNum('f', 'Fat'));
    sh.appendChild(grid2);
  }

  // meal mover
  const mealRow = el('div', 'filter-row');
  MEALS.forEach(([id, label]) => {
    const c = el('button', 'chip' + (e.meal === id ? ' on' : ''), label);
    c.onclick = () => { e.meal = id; saveDay(); close(); render(); };
    mealRow.appendChild(c);
  });
  sh.appendChild(mealRow);

  const del = el('button', 'btn btn-danger btn-block', 'Delete entry');
  del.style.marginTop = '12px';
  del.onclick = () => { delete dayLog[e.id]; saveDay(); close(); render(); };
  sh.appendChild(del);

  const done = el('button', 'btn btn-ghost btn-block', 'Done');
  done.style.marginTop = '8px';
  done.onclick = () => { close(); render(); };
  sh.appendChild(done);
}

/* ================= ADD FLOW ================= */
function openAdd(mealId) {
  const { back, sh, close } = sheet();

  const search = el('div', 'picker-search');
  const inp = el('input');
  inp.placeholder = 'Search foods';
  inp.type = 'search';
  search.appendChild(inp);

  const actions = el('div', 'filter-row');
  const scanBtn = el('button', 'chip', '\u25a3 Scan barcode');
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

  const list = el('div');
  list.className = 'ex-list';
  sh.appendChild(list);

  let q = '';
  inp.oninput = ev => { q = ev.target.value.toLowerCase().trim(); paint(); };

  function paint() {
    list.innerHTML = '';
    if (tab === 'meals') {
      const pool = Object.values(meals).filter(m => !q || m.name.toLowerCase().includes(q));
      if (!pool.length) list.appendChild(noteEl(q ? 'No saved meals match.' : 'No saved meals yet. Log a meal, then \u22ef \u2192 save.'));
      pool.forEach(m => {
        const kcal = m.items.reduce((s, i) => s + (i.cal || 0), 0);
        const b = el('button', 'ex-item');
        b.appendChild(el('span', 'nm', m.name));
        b.appendChild(el('span', 'eq num', m.items.length + ' items \u00b7 ' + kcal + ' kcal'));
        b.onclick = () => {
          m.items.forEach(i => addEntry({ ...i, meal: mealId, src: 'meal' }));
          close(); toast('Added ' + m.name);
        };
        const x = el('span', 'eq', '\u2715');
        x.style.marginLeft = '8px';
        x.onclick = ev => {
          ev.stopPropagation();
          if (!confirm('Delete saved meal \u201c' + m.name + '\u201d?')) return;
          delete meals[m.id]; write('food/meals', meals); paint();
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
      const body = el('span', 'nm');
      body.textContent = it.name;
      b.appendChild(body);
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

  const preview = el('div', 'num');
  preview.style.cssText = 'font-size:13px;color:var(--steel);margin:6px 0 12px';

  const stepRow = el('div', 'qty-row');
  const minus = el('button', 'btn btn-ghost', '\u2212');
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
      preview.textContent = m.cal + ' kcal   \u00b7   P ' + trimNum(m.p) + '   C ' + trimNum(m.c) + '   F ' + trimNum(m.f);
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
  const { back, sh, close } = sheet();
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
  const { back, sh, close } = sheet();
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
  const qty  = f('Amount (label only \u2014 e.g. \u201c2 slices\u201d)', prefill && prefill.qty, 'text');
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
  const status = el('div', 'eyebrow', 'Starting camera\u2026');
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
        status.textContent = 'Loading scanner\u2026';
        const ZX = await loadZXing();
        const reader = new ZX.BrowserMultiFormatReader();
        status.textContent = 'Point at the barcode';
        const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          if (result) finish(result.getText());
        });
        stopFns.push(() => controls.stop());
      }
    } catch (err) {
      status.textContent = 'Camera unavailable \u2014 check permission in Settings.';
    }
  })();
}

async function lookupBarcode(code, mealId) {
  toast('Looking up ' + code + '\u2026');
  try {
    const r = await fetch('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) + '.json');
    const j = await r.json();
    if (!j || j.status !== 1 || !j.product) {
      toast('Not in Open Food Facts \u2014 add it manually');
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
    toast('Lookup failed \u2014 no connection?');
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
  const name = prompt('Name this meal', defaultLabel + ' \u2014 ' + todayKey());
  if (!name) return;
  const id = 'm' + Date.now().toString(36);
  meals[id] = {
    id, name,
    items: entries.map(e => ({
      name: e.name, qty: e.qty || '', cal: e.cal || 0, p: e.p || 0, c: e.c || 0, f: e.f || 0,
      micro: e.micro || null, itemId: e.itemId || null, amt: e.amt || null, unit: e.unit || null
    }))
  };
  write('food/meals', meals);
  toast('Meal saved');
}

/* ================= COPY YESTERDAY ================= */
async function copyYesterday() {
  const y = new Date(viewDate.getTime() - 864e5);
  const src = (await read('food/log/' + dk(y), null)) || {};
  const list = Object.values(src);
  if (!list.length) { toast('Nothing logged ' + (isToday() ? 'yesterday' : 'the day before')); return; }
  list.forEach(e => {
    const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    dayLog[id] = { ...e, id, t: Date.now(), src: 'copy' };
  });
  await saveDay();
  toast('Copied ' + list.length + ' foods');
  render();
}

/* ================= TARGETS ================= */
function openTargets() {
  const { back, sh, close } = sheet();
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
    carbs.textContent = 'Carbs \u2192 ' + Math.max(0, Math.round((cal - p * 4 - f * 9) / 4)) + ' g';
  };
  [tc, tp, tf].forEach(w => w.input.oninput = paintCarbs);
  paintCarbs();
  sh.appendChild(carbs);

  const save = el('button', 'btn btn-primary btn-block', 'Save');
  save.style.marginTop = '14px';
  save.onclick = async () => {
    targets = {
      cal: parseInt(tc.input.value) || 2700,
      p: parseInt(tp.input.value) || 215,
      f: parseInt(tf.input.value) || 80
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
    toast('Couldn\u2019t read that log link');
  }
  history.replaceState(null, '', location.pathname + location.search);
  if (payload) confirmImport(normalizeImport(payload), 'From Claude');
}

function openImportPaste() {
  const { back, sh, close } = sheet();
  sh.appendChild(el('h2', null, 'Import from Claude'));
  sh.appendChild(noteEl('Paste the JSON Claude gave you. Nothing is logged until you confirm.'));

  const ta = document.createElement('textarea');
  ta.className = 'paste-box';
  ta.placeholder = '{"items":[{"name":"Chicken and rice","cal":650,"p":52,"c":78,"f":12}]}';
  sh.appendChild(ta);

  const go = el('button', 'btn btn-primary btn-block', 'Preview');
  go.style.marginTop = '10px';
  go.onclick = () => {
    let data = null;
    try { data = JSON.parse(ta.value); } catch { toast('That isn\u2019t valid JSON'); return; }
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
  const { back, sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', sourceLabel));
  sh.appendChild(el('h2', null, 'Log ' + entries.length + ' food' + (entries.length > 1 ? 's' : '') + '?'));

  const tot = entries.reduce((s, e) => ({ cal: s.cal + e.cal, p: s.p + e.p, c: s.c + e.c, f: s.f + e.f }),
    { cal: 0, p: 0, c: 0, f: 0 });
  sh.appendChild(noteEl(tot.cal + ' kcal \u00b7 P ' + trimNum(tot.p) + ' \u00b7 C ' + trimNum(tot.c) + ' \u00b7 F ' + trimNum(tot.f) + ' \u2014 logging to today'));

  const list = el('div');
  list.style.marginTop = '8px';
  entries.forEach(e => {
    const row = el('div', 'food-entry');
    const body = el('div');
    body.appendChild(el('div', 'fe-name', e.name));
    body.appendChild(el('div', 'fe-sub num', (e.qty ? e.qty + '  \u00b7  ' : '') + 'P ' + trimNum(e.p) + '  C ' + trimNum(e.c) + '  F ' + trimNum(e.f) + '  \u00b7  ' + e.meal));
    row.appendChild(body);
    row.appendChild(el('div', 'fe-cal num', String(e.cal)));
    list.appendChild(row);
  });
  sh.appendChild(list);

  const go = el('button', 'btn btn-primary btn-block btn-lg', 'Log it');
  go.style.marginTop = '12px';
  go.onclick = async () => {
    // imports always land on TODAY regardless of the day being viewed
    if (!isToday()) { viewDate = new Date(); await loadDay(); }
    entries.forEach(e => {
      const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      dayLog[id] = { id, t: Date.now(), ...e };
    });
    await saveDay();
    close(); render();
    toast('Logged ' + entries.length + ' food' + (entries.length > 1 ? 's' : ''));
  };
  sh.appendChild(go);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ================= SHEET HELPER ================= */
function sheet() {
  const back = el('div', 'sheet-backdrop');
  const sh = el('div', 'sheet');
  sh.appendChild(el('div', 'sheet-grab'));
  const close = () => { back.remove(); sh.remove(); };
  back.onclick = close;
  document.body.append(back, sh);
  return { back, sh, close };
}
