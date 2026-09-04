// Steps — daily step count, however it gets there.
//
//   users/{uid}/steps/{YYYY-MM-DD} -> { steps, mi, t, src }
//   users/{uid}/settings/steps     -> { goal }
//
// Per-account for free: store.js prefixes every path with users/{uid}/, so
// nothing here needs to know more than one person exists.
//
// `src` says where a day came from — `manual` when typed in, `shortcut` /
// `hae` / `agent` when something pushed it. A pushed number always wins over
// nothing, but a number typed by hand is never silently overwritten: the
// automation writes the whole day node, so the last writer wins, and the card
// says which it was.
//
// Imports store.js, ui.js and analytics.js. Nothing imports back.

import { read, write, watch, todayKey } from './store.js';
import { firebaseConfig } from './firebase-config.js';
// Only long-standing exports are imported from analytics.js. A brand-new
// module must never depend on a brand-new export in an OLD shared file: if a
// browser is holding even one stale file, the import fails and this whole tab
// renders blank with no error the user can see. That is exactly what happened
// on the first deploy of this tab. The heat map below is therefore local.
import { barChart, emptyChart } from './analytics.js';
import { bump } from './usage.js';
import { $, el, svgEl, sheet, toast, noteEl, confirmSheet, swipeToDelete,
         segmented, compact, copyText, parseKey, fmtDate, fmtDateFull, LIMITS, within } from './ui.js';

const DAY = 864e5;
const DEFAULTS = { goal: 10000 };

let settings = { ...DEFAULTS };
let days     = {};      // dateKey -> { steps, mi, t, src }
let range    = 30;      // 7 | 30 | 365
let unwatch  = null;

/* ================= INIT ================= */
export async function initSteps() {
  settings = { ...DEFAULTS, ...((await read('settings/steps', null)) || {}) };
  days = (await read('steps', null)) || {};
  if (unwatch) unwatch();
  // A whole year of days is a few tens of kilobytes, so the entire node stays
  // subscribed. That is also what makes an outside write — a phone automation
  // pushing today's count — land on screen without a refresh.
  unwatch = watch('steps', val => {
    const next = val || {};
    if (JSON.stringify(next) === JSON.stringify(days)) return;
    days = next;
    render();
  });
  render();
}

/* ---------- heat map ----------
   Same grid as the training one in analytics.js, over any {dateKey: number}.
   Deliberately duplicated rather than shared — see the import note above. */
function heatMap(byDay, opts = {}) {
  const { days = 91, color = 'var(--p-green)' } = opts;
  const max = Math.max(1, ...Object.values(byDay));
  const cols = Math.ceil(days / 7);
  const CELL = 9, GAP = 2.5;
  const W = cols * (CELL + GAP), H = 7 * (CELL + GAP);
  const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart heat' });

  const start = new Date();
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  start.setDate(start.getDate() - start.getDay());   // align to a Sunday

  for (let c = 0; c < cols; c++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(start);
      d.setDate(d.getDate() + c * 7 + row);
      if (d.getTime() > Date.now() + DAY) continue;
      const v = byDay[todayKey(d)] || 0;
      const op = v ? (0.28 + 0.72 * Math.min(1, v / max)) : 0;
      svg.appendChild(svgEl('rect', {
        x: (c * (CELL + GAP)).toFixed(1), y: (row * (CELL + GAP)).toFixed(1),
        width: CELL, height: CELL, rx: 2.5,
        fill: v ? color : 'var(--collar)',
        'fill-opacity': v ? op.toFixed(2) : '1'
      }));
    }
  }
  return svg;
}

/* ================= HELPERS ================= */
function stepsOn(k) { const d = days[k]; return d && d.steps > 0 ? d.steps : 0; }
function goal() { return settings.goal > 0 ? settings.goal : DEFAULTS.goal; }

// For the settings hub's live value pill — the number this tab is drawing
// with, so the two can never quote different goals.
export function stepGoal() { return goal(); }

function keysBack(n, from = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(todayKey(new Date(from.getTime() - i * DAY)));
  return out;
}

function loggedKeys() {
  return Object.keys(days).filter(k => stepsOn(k) > 0).sort();
}

function mean(xs) { return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0; }

/* Consecutive days meeting the goal, counted back from today. A day that
   hasn't happened yet shouldn't break a streak, so if today is short we start
   from yesterday and let today be the one still in play. */
function currentStreak() {
  const g = goal();
  let d = new Date();
  if (stepsOn(todayKey(d)) < g) d = new Date(d.getTime() - DAY);
  let n = 0;
  for (;;) {
    if (stepsOn(todayKey(d)) < g) break;
    n++;
    d = new Date(d.getTime() - DAY);
  }
  return n;
}

function longestStreak() {
  const g = goal();
  const ks = loggedKeys().filter(k => days[k].steps >= g);
  let best = 0, run = 0, prev = null;
  ks.forEach(k => {
    const t = parseKey(k).getTime();
    run = (prev != null && Math.round((t - prev) / DAY) === 1) ? run + 1 : 1;
    prev = t;
    if (run > best) best = run;
  });
  return best;
}

/* ================= RENDER ================= */
export function render() {
  const root = $('#view-steps');
  if (!root) return;
  root.innerHTML = '';
  const wrap = el('div', 'screen-pad');

  const hd = el('div', 'cal-hd');
  const left = el('div');
  left.appendChild(el('div', 'eyebrow', 'Movement'));
  left.appendChild(el('h1', null, 'Steps'));
  hd.appendChild(left);

  const nav = el('div', 'cal-nav');
  const gear = el('button', 'gear-btn');
  gear.setAttribute('aria-label', 'Step settings');
  gear.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  gear.onclick = openStepSettings;
  nav.appendChild(gear);
  hd.appendChild(nav);
  wrap.appendChild(hd);

  wrap.appendChild(renderToday());
  wrap.appendChild(renderTrend());
  wrap.appendChild(renderStats());
  wrap.appendChild(renderStreaks());
  wrap.appendChild(renderConsistency());
  wrap.appendChild(renderWeekdays());
  wrap.appendChild(renderRecent());

  root.appendChild(wrap);
}

/* ---------- today ---------- */
function renderToday() {
  const k = todayKey();
  const n = stepsOn(k);
  const g = goal();
  const card = el('div', 'card');

  const row = el('div', 'st-hero');
  row.appendChild(ring(n / g, n, g));

  const side = el('div', 'st-hero-side');
  const left = Math.max(0, g - n);
  side.appendChild(el('div', 'eyebrow', n >= g ? 'goal met' : 'to go'));
  const big = el('div', 'load-num num', (n >= g ? n - g : left).toLocaleString());
  big.style.fontSize = '26px';
  big.style.color = n >= g ? 'var(--ok)' : 'var(--chalk)';
  side.appendChild(big);
  side.appendChild(el('div', 'st-side-lbl', n >= g ? 'steps past goal' : 'steps'));

  const d = days[k];
  side.appendChild(el('div', 'st-src', !d ? 'nothing logged yet'
    : d.src === 'manual' ? 'entered by hand'
    : 'from your phone' + (d.t ? ' · ' + new Date(d.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '')));
  row.appendChild(side);
  card.appendChild(row);

  const ctl = el('div', 'st-ctl');
  [500, 1000, 2500].forEach(inc => {
    const b = el('button', 'btn btn-ghost st-inc', '+' + compact(inc));
    b.onclick = () => addSteps(k, inc);
    ctl.appendChild(b);
  });
  const set = el('button', 'btn btn-primary st-set', 'Set total');
  set.onclick = () => openSetSteps(k);
  ctl.appendChild(set);
  card.appendChild(ctl);
  return card;
}

/* ---------- the ring ----------
   Third distinct shape in the app on purpose: Fuel is a bar, Water is a
   filling vessel, this is an arc. You should know which screen you're on from
   across the room. */
function ring(frac, n, g) {
  const S = 132, R = 54, C = 2 * Math.PI * R, mid = S / 2;
  const svg = svgEl('svg', { viewBox: `0 0 ${S} ${S}`, class: 'st-ring' });

  svg.appendChild(svgEl('circle', {
    cx: mid, cy: mid, r: R, fill: 'none',
    stroke: 'var(--collar)', 'stroke-width': 11
  }));

  const over = frac > 1;
  const shown = Math.max(0, Math.min(1, frac));
  if (shown > 0) {
    svg.appendChild(svgEl('circle', {
      cx: mid, cy: mid, r: R, fill: 'none',
      stroke: over ? 'var(--ok)' : 'var(--p-green)',
      'stroke-width': 11, 'stroke-linecap': 'round',
      'stroke-dasharray': `${(C * shown).toFixed(1)} ${C.toFixed(1)}`,
      transform: `rotate(-90 ${mid} ${mid})`
    }));
  }
  // A second, brighter arc for the part past the goal.
  if (over) {
    const extra = Math.min(1, frac - 1);
    svg.appendChild(svgEl('circle', {
      cx: mid, cy: mid, r: R, fill: 'none',
      stroke: 'var(--p-yellow)', 'stroke-width': 11, 'stroke-linecap': 'round',
      'stroke-dasharray': `${(C * extra).toFixed(1)} ${C.toFixed(1)}`,
      transform: `rotate(-90 ${mid} ${mid})`
    }));
  }

  const t1 = svgEl('text', { x: mid, y: mid - 2, class: 'st-ring-n', 'text-anchor': 'middle' });
  t1.textContent = n.toLocaleString();
  svg.appendChild(t1);
  const t2 = svgEl('text', { x: mid, y: mid + 16, class: 'st-ring-s', 'text-anchor': 'middle' });
  t2.textContent = Math.round(frac * 100) + '% of ' + compact(g);
  svg.appendChild(t2);
  return svg;
}

/* ---------- trend ---------- */
function renderTrend() {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Trend'));
  const chips = el('div', 'chip-row');
  [[7, '7d'], [30, '30d'], [365, '1y']].forEach(([n, label]) => {
    const c = el('button', 'chip' + (range === n ? ' on' : ''), label);
    c.onclick = () => { range = n; render(); };
    chips.appendChild(c);
  });
  hd.appendChild(chips);
  card.appendChild(hd);

  if (!loggedKeys().length) {
    card.appendChild(noteEl('Log a day and this fills in. Tap Set total above, or set your phone up to push it — ⚙ has the walkthrough.'));
    return card;
  }

  let bars;
  if (range === 365) {
    // A year of daily bars is 365 slivers. Months are the honest unit here.
    const now = new Date();
    bars = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pre = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const vals = Object.keys(days).filter(k => k.startsWith(pre)).map(stepsOn).filter(v => v > 0);
      bars.push({
        label: d.toLocaleDateString('en-US', { month: 'narrow' }),
        v: Math.round(mean(vals)),
        color: mean(vals) >= goal() ? 'var(--ok)' : 'var(--p-green)'
      });
    }
  } else {
    bars = keysBack(range).map(k => ({
      label: range <= 7 ? parseKey(k).toLocaleDateString('en-US', { weekday: 'narrow' }) : '',
      v: stepsOn(k),
      color: stepsOn(k) >= goal() ? 'var(--ok)' : 'var(--p-green)'
    }));
  }
  card.appendChild(barChart(bars, { height: 170, color: 'var(--p-green)', showValues: range <= 7 }));

  const foot = el('div', 'chart-foot');
  foot.appendChild(el('span', 'num', range === 365 ? 'monthly average' : 'daily'));
  foot.appendChild(el('span', null, 'green = goal met'));
  card.appendChild(foot);
  return card;
}

/* ---------- headline stats ---------- */
function renderStats() {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', range === 7 ? 'This week' : range === 30 ? 'Last 30 days' : 'Last year'));
  card.appendChild(hd);

  const ks = range === 365 ? loggedKeys() : keysBack(range);
  const vals = ks.map(stepsOn).filter(v => v > 0);
  const hit = ks.filter(k => stepsOn(k) >= goal()).length;

  const cell = (v, l, color) => {
    const c = el('div', 'stat');
    const val = el('div', 'stat-val num', v);
    if (color) val.style.color = color;
    c.appendChild(val);
    c.appendChild(el('div', 'stat-lbl', l));
    return c;
  };

  const r1 = el('div', 'stat-row');
  r1.append(
    cell(vals.length ? compact(Math.round(mean(vals))) : '–', 'Daily avg'),
    cell(vals.length ? compact(vals.reduce((s, x) => s + x, 0)) : '–', 'Total'),
    cell(String(hit), 'Goal days', hit ? 'var(--ok)' : null)
  );
  card.appendChild(r1);

  // All-time best, and how this week compares with last.
  const all = loggedKeys();
  const bestK = all.reduce((b, k) => (!b || stepsOn(k) > stepsOn(b)) ? k : b, null);
  const thisWk = mean(keysBack(7).map(stepsOn).filter(v => v > 0));
  const lastWk = mean(keysBack(7, new Date(Date.now() - 7 * DAY)).map(stepsOn).filter(v => v > 0));
  const delta = lastWk > 0 ? (thisWk - lastWk) / lastWk * 100 : null;

  const r2 = el('div', 'stat-row');
  r2.style.marginTop = '10px';
  r2.append(
    cell(bestK ? compact(stepsOn(bestK)) : '–', bestK ? 'Best · ' + fmtDate(bestK) : 'Best day'),
    cell(all.length ? compact(Math.round(mean(all.map(stepsOn)))) : '–', 'All-time avg'),
    cell(delta == null ? '–' : (delta > 0 ? '+' : '') + Math.round(delta) + '%', 'vs last week',
         delta == null ? null : delta >= 0 ? 'var(--ok)' : 'var(--caution)')
  );
  card.appendChild(r2);
  return card;
}

/* ---------- streaks ---------- */
function renderStreaks() {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Streak'));
  card.appendChild(hd);

  const cur = currentStreak(), best = longestStreak();
  const row = el('div', 'st-streak');
  const flame = el('div', 'st-flame' + (cur > 0 ? ' on' : ''));
  flame.textContent = cur > 0 ? String(cur) : '0';
  row.appendChild(flame);

  const side = el('div');
  side.appendChild(el('div', 'st-streak-t',
    cur === 0 ? 'No streak going' : cur === 1 ? '1 day at goal' : cur + ' days at goal'));
  side.appendChild(el('div', 'st-streak-s',
    best > 0 ? 'Best run: ' + best + (best === 1 ? ' day' : ' days') : 'Hit your goal to start one'));
  row.appendChild(side);
  card.appendChild(row);

  const k = todayKey();
  if (stepsOn(k) < goal()) {
    const need = goal() - stepsOn(k);
    card.appendChild(noteEl(cur > 0
      ? need.toLocaleString() + ' more today keeps the run alive.'
      : need.toLocaleString() + ' more today starts one.'));
  }
  return card;
}

/* ---------- consistency ---------- */
function renderConsistency() {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Consistency'));
  card.appendChild(hd);
  const byDay = {};
  loggedKeys().forEach(k => { byDay[k] = stepsOn(k); });
  if (!Object.keys(byDay).length) {
    card.appendChild(noteEl('Thirteen weeks of days, darker where you walked more.'));
    return card;
  }
  card.appendChild(heatMap(byDay, { days: 91, color: 'var(--p-green)' }));
  card.appendChild(noteEl('Thirteen weeks — darker is more. Same grid as your training heat map, so the two read the same way.'));
  return card;
}

/* ---------- day of week ---------- */
function renderWeekdays() {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'By day of week'));
  card.appendChild(hd);

  const buckets = [[], [], [], [], [], [], []];
  loggedKeys().forEach(k => buckets[parseKey(k).getDay()].push(stepsOn(k)));
  if (!buckets.some(b => b.length)) {
    card.appendChild(noteEl('Which days you actually move. Needs a couple of weeks.'));
    return card;
  }
  const names = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const bars = buckets.map((b, i) => ({
    label: names[i],
    v: Math.round(mean(b)),
    color: mean(b) >= goal() ? 'var(--ok)' : 'var(--p-green)'
  }));
  card.appendChild(barChart(bars, { height: 140, color: 'var(--p-green)', showValues: true }));

  const top = bars.reduce((b, x, i) => x.v > bars[b].v ? i : b, 0);
  const low = bars.reduce((b, x, i) => (x.v > 0 && x.v < bars[b].v) || bars[b].v === 0 ? i : b, 0);
  const full = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  card.appendChild(noteEl(bars[top].v > 0
    ? full[top] + ' is your biggest day' + (bars[low].v > 0 && low !== top ? ', ' + full[low] + ' your quietest' : '') + '.'
    : 'Averages per weekday.'));
  return card;
}

/* ---------- recent, editable ---------- */
function renderRecent() {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Recent'));
  card.appendChild(hd);

  const ks = keysBack(14).reverse().filter(k => stepsOn(k) > 0 || k === todayKey());
  if (!ks.length) { card.appendChild(noteEl('Nothing logged in the last two weeks.')); return card; }

  ks.forEach(k => {
    const n = stepsOn(k);
    const row = el('div', 'st-row');
    row.appendChild(el('span', 'st-row-d', k === todayKey() ? 'Today' : fmtDateFull(k)));
    const v = el('span', 'st-row-n num', n ? n.toLocaleString() : '–');
    if (n >= goal()) v.style.color = 'var(--ok)';
    row.appendChild(v);
    const pct = el('span', 'st-row-p', n ? Math.round(n / goal() * 100) + '%' : '');
    row.appendChild(pct);
    row.onclick = () => openSetSteps(k);
    card.appendChild(n ? swipeToDelete(row, { onDelete: () => removeDay(k) }) : row);
  });
  card.appendChild(noteEl('Tap a day to correct it. Swipe left to clear it.'));
  return card;
}

/* ================= WRITES ================= */
async function setSteps(k, n, src = 'manual') {
  if (!(n >= 0)) return;
  const prev = days[k] || {};
  days[k] = { steps: Math.round(n), t: Date.now(), src, ...(prev.mi ? { mi: prev.mi } : {}) };
  await write('steps/' + k, days[k]);
  render();
}

async function addSteps(k, inc) {
  const n = stepsOn(k) + inc;
  await setSteps(k, n);
  toast('+' + inc.toLocaleString() + ' · ' + n.toLocaleString() + ' today');
}

async function removeDay(k) {
  delete days[k];
  await write('steps/' + k, null);
  render();
  toast('Cleared ' + fmtDate(k));
}

function openSetSteps(k) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', k === todayKey() ? 'Today' : fmtDateFull(k)));
  sh.appendChild(el('h2', null, 'Set step total'));
  sh.appendChild(noteEl('The whole day’s number, not an amount to add. If your phone pushes steps later it will overwrite this.'));

  const row = el('div', 'qty-row');
  const inp = el('input');
  inp.type = 'number'; inp.inputMode = 'numeric'; inp.min = '0'; inp.max = LIMITS.steps[1];
  inp.placeholder = String(goal());
  if (stepsOn(k)) inp.value = String(stepsOn(k));
  const go = el('button', 'btn btn-primary', 'Save');
  go.style.flex = '0 0 auto';
  go.onclick = async () => {
    const n = parseInt(inp.value);
    if (!within(n, LIMITS.steps)) { toast(n > 0 ? 'That’s more than ' + LIMITS.steps[1].toLocaleString() + ' steps in a day' : 'Enter a step count'); return; }
    close();
    bump('stepsSet');
    await setSteps(k, n);
    toast(n.toLocaleString() + ' steps · ' + (k === todayKey() ? 'today' : fmtDate(k)));
  };
  row.append(inp, go);
  sh.appendChild(row);
  setTimeout(() => { inp.focus(); inp.select(); }, 80);

  if (stepsOn(k)) {
    const del = el('button', 'btn btn-danger btn-block', 'Clear this day');
    del.style.marginTop = '12px';
    del.onclick = () => { close(); removeDay(k); };
    sh.appendChild(del);
  }

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ================= SETTINGS ================= */
// `onSaved` is for whoever opened this from somewhere other than the Steps tab
// — the You tab quotes the goal too, and a goal saved here has to reach it.
export function openStepSettings(onSaved) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Steps'));
  sh.appendChild(el('h2', null, 'Settings'));

  const gf = el('div', 'field');
  gf.style.marginTop = '12px';
  gf.appendChild(el('label', null, 'Daily goal'));
  const gi = el('input');
  gi.type = 'number'; gi.inputMode = 'numeric';
  gi.min = LIMITS.stepGoal[0]; gi.max = LIMITS.stepGoal[1];
  gi.value = String(goal());
  gf.appendChild(gi);
  sh.appendChild(gf);

  const quick = el('div', 'filter-row');
  quick.style.marginTop = '8px';
  [6000, 8000, 10000, 12000, 15000].forEach(n => {
    const c = el('button', 'chip', compact(n));
    c.onclick = () => { gi.value = String(n); };
    quick.appendChild(c);
  });
  sh.appendChild(quick);

  const auto = el('button', 'btn btn-ghost btn-block', 'Log steps automatically');
  auto.style.marginTop = '14px';
  auto.onclick = () => { close(); openAutoGuide(); };
  sh.appendChild(auto);

  const save = el('button', 'btn btn-primary btn-block', 'Save');
  save.style.marginTop = '10px';
  save.onclick = async () => {
    // Blank falls back to the default; a number has to be one a person could walk.
    const g = gi.value.trim() ? parseInt(gi.value) : DEFAULTS.goal;
    if (!within(g, LIMITS.stepGoal)) {
      toast('Pick a goal between ' + LIMITS.stepGoal[0].toLocaleString() + ' and ' + LIMITS.stepGoal[1].toLocaleString());
      return;
    }
    settings = { ...settings, goal: g };
    await write('settings/steps', settings);
    close(); render();
    if (onSaved) onSaved();
    toast('Goal saved');
  };
  sh.appendChild(save);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ---------- the automatic-logging walkthrough ----------
   Written to be readable by someone who has never opened Shortcuts. Both
   platforms, because not everybody testing this is on an iPhone. */
function openAutoGuide() {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Steps'));
  sh.appendChild(el('h2', null, 'Log them automatically'));
  sh.appendChild(noteEl(
    'Your phone already counts your steps. It cannot hand them to a web page ' +
    'on its own, so a small automation on the phone pushes the number here ' +
    'once a day. You set it up once and then forget about it.'));

  let os = /android/i.test(navigator.userAgent) ? 'android' : 'ios';
  const body = el('div');

  const paint = () => {
    body.innerHTML = '';
    const steps = os === 'ios' ? [
      ['Open the Shortcuts app', 'It comes with every iPhone. If it was deleted, get it free from the App Store.'],
      ['New shortcut → add "Find Health Samples"', 'Set Type to Step Count, filter to Today, and turn on the option to add all the numbers together.'],
      ['Add "Get Contents of URL" — sign in', 'This trades your Rack email and password for a one-hour pass. The exact address and settings are on the card below.'],
      ['Add a second "Get Contents of URL" — send', 'This is the one that writes your steps. It uses the pass from the step before.'],
      ['Automation tab → new → Time of Day', 'Pick something like 10pm, choose Run Immediately, and point it at the shortcut.']
    ] : [
      ['Install a task app', 'Android has no built-in Shortcuts. MacroDroid is free; Tasker is paid and more capable. Either can read Health Connect and send a web request.'],
      ['Give it Health Connect access', 'Settings → Health Connect → permissions. Your step data lives there, whether it comes from the phone or a watch.'],
      ['Read today’s step total', 'Both apps have a Health Connect action for daily steps.'],
      ['Add two HTTP requests', 'One to sign in, one to send — same two addresses as the card below.'],
      ['Trigger it on a daily timer', 'Around 10pm works. Your phone has to be unlocked for it to read health data.']
    ];
    steps.forEach(([t, d], i) => {
      const r = el('div', 'st-guide');
      r.appendChild(el('span', 'st-guide-n num', String(i + 1)));
      const c = el('div');
      c.appendChild(el('div', 'st-guide-t', t));
      c.appendChild(el('div', 'st-guide-d', d));
      r.appendChild(c);
      body.appendChild(r);
    });
  };

  sh.appendChild(segmented([['ios', 'iPhone'], ['android', 'Android']], os, v => { os = v; paint(); }));
  paint();
  sh.appendChild(body);

  sh.appendChild(noteEl(
    'One thing no app can get around: Apple and Android both lock health data ' +
    'away while the phone is locked. The automation runs the next time you ' +
    'unlock, so steps land within minutes of you picking up your phone — not ' +
    'the instant you take them.'));

  const copy = el('button', 'btn btn-ghost btn-block', 'Show me the exact settings');
  copy.style.marginTop = '12px';
  copy.onclick = () => { close(); openAutoDetails(); };
  sh.appendChild(copy);

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '8px';
  done.onclick = close;
  sh.appendChild(done);
}

export function openAutoDetails() {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Steps'));
  sh.appendChild(el('h2', null, 'The exact settings'));
  sh.appendChild(noteEl(
    'Two web requests. The first one signs you in and hands back a pass plus ' +
    'your account id; the second uses both to write today’s steps. Nobody ' +
    'needs to look up an id — the first request tells the second what it is.'));

  const HOST = (firebaseConfig.databaseURL || '').replace(/\/$/, '');
  const SIGNIN = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' +
                 firebaseConfig.apiKey;
  const WRITE  = HOST + '/users/[localId]/steps/[YYYY-MM-DD].json?auth=[idToken]';

  const block = (title, lines, copyVal) => {
    const c = el('div', 'card');
    c.style.marginTop = '10px';
    c.appendChild(el('div', 'eyebrow', title));
    lines.forEach(([k, v]) => {
      const r = el('div', 'st-kv');
      r.appendChild(el('span', 'st-kv-k', k));
      r.appendChild(el('span', 'st-kv-v num', v));
      c.appendChild(r);
    });
    if (copyVal) {
      const b = el('button', 'btn btn-ghost btn-block', 'Copy the address');
      b.style.marginTop = '10px';
      b.onclick = () => copyText(copyVal, 'Address copied');
      c.appendChild(b);
    }
    sh.appendChild(c);
  };

  block('Request 1 — sign in', [
    ['Method', 'POST'],
    ['URL', SIGNIN],
    ['Body', '{"email":"…","password":"…","returnSecureToken":true}'],
    ['Hands back', 'idToken  ·  localId']
  ], SIGNIN);

  block('Request 2 — send the steps', [
    ['Method', 'PUT'],
    ['URL', WRITE],
    ['Body', '{"steps":1234,"src":"shortcut"}'],
    ['Date', 'YYYY-MM-DD, e.g. ' + todayKey()]
  ], WRITE);

  sh.appendChild(noteEl(
    'Square brackets are placeholders. [localId] and [idToken] come straight ' +
    'out of the first request — your automation app can pass them through, so ' +
    'you never have to look up an account id or keep a token fresh.'));

  sh.appendChild(noteEl(
    'Use your own Rack email and password — the same ones you signed in with. ' +
    'They only ever reach your own account. Don’t share a shortcut you’ve ' +
    'already filled in: share the empty one and let each person type their own.'));

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '14px';
  done.onclick = close;
  sh.appendChild(done);
}
