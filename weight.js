// Weight — body-weight log, trend math, and the app's settings card.
//   weight/entries -> { id: { lb, t } }

import { read, write, writeFeed, LS, todayKey, feedUrl, logout } from './store.js';
import { toast, hasActiveSession } from './workout.js';

const $  = s => document.querySelector(s);
const el = (t, c, txt) => { const n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; };

let entries = {};      // id -> { lb, t }
let range   = 30;      // chart window, days
let summaries = {};    // dateKey -> {cal,...} for TDEE

export async function initWeight() {
  entries = (await read('weight/entries', null)) || {};
  render();
}

/* ================= MATH ================= */
function sorted() {
  return Object.entries(entries)
    .map(([id, e]) => ({ id, ...e }))
    .sort((a, b) => a.t - b.t);
}

// mean weight per calendar day
function dailyMeans() {
  const by = {};
  sorted().forEach(e => {
    const k = todayKey(new Date(e.t));
    (by[k] = by[k] || []).push(e.lb);
  });
  return Object.entries(by)
    .map(([d, lbs]) => ({ d, lb: lbs.reduce((s, x) => s + x, 0) / lbs.length }))
    .sort((a, b) => a.d < b.d ? -1 : 1);
}

// trailing 7-day moving average at each day
function movingAvg(days) {
  return days.map((pt, i) => {
    const t0 = new Date(pt.d + 'T12:00:00').getTime() - 6.5 * 864e5;
    const win = days.filter((q, j) => j <= i && new Date(q.d + 'T12:00:00').getTime() >= t0);
    return { d: pt.d, lb: win.reduce((s, x) => s + x.lb, 0) / win.length };
  });
}

function windowAvg(days, fromAgo, toAgo) {
  const now = Date.now();
  const win = days.filter(p => {
    const t = new Date(p.d + 'T12:00:00').getTime();
    return t <= now - toAgo * 864e5 && t > now - fromAgo * 864e5;
  });
  if (win.length < 3) return null;
  return win.reduce((s, x) => s + x.lb, 0) / win.length;
}

function stats() {
  const list = sorted();
  const days = dailyMeans();
  const latest = list[list.length - 1] || null;
  const avg7 = windowAvg(days, 7, 0);
  const prev7 = windowAvg(days, 14, 7);
  const rateWk = avg7 != null && prev7 != null ? avg7 - prev7 : null;
  const d30 = days.filter(p => new Date(p.d + 'T12:00:00').getTime() > Date.now() - 30 * 864e5);
  const change30 = d30.length >= 2 ? d30[d30.length - 1].lb - d30[0].lb : null;
  return { latest, avg7, rateWk, change30, days };
}

/* ================= FEED ================= */
async function pushWeightFeed() {
  const s = stats();
  if (!s.latest) return;
  await writeFeed({
    weight: {
      lb: r1(s.latest.lb),
      date: todayKey(new Date(s.latest.t)),
      avg7: s.avg7 != null ? r1(s.avg7) : null,
      rateWk: s.rateWk != null ? r1(s.rateWk) : null
    }
  });
}

function r1(x) { return Math.round(x * 10) / 10; }

/* ================= RENDER ================= */
export async function render() {
  const root = $('#view-weight');
  if (!root) return;
  root.innerHTML = '';
  const wrap = el('div', 'screen-pad');

  const hd = el('div', 'cal-hd');
  const left = el('div');
  left.appendChild(el('div', 'eyebrow', 'Body weight'));
  left.appendChild(el('h1', null, 'Weight'));
  hd.appendChild(left);
  wrap.appendChild(hd);

  const s = stats();

  // ---- log card ----
  const log = el('div', 'card');
  const row = el('div', 'qty-row');
  const inp = el('input');
  inp.type = 'number'; inp.inputMode = 'decimal'; inp.step = '0.1';
  inp.placeholder = s.latest ? String(r1(s.latest.lb)) : '208.0';
  const btn = el('button', 'btn btn-primary', 'Log');
  btn.style.flex = '0 0 auto';
  btn.onclick = async () => {
    const lb = parseFloat(inp.value);
    if (!lb || lb < 60 || lb > 600) { toast('Enter a weight in pounds'); return; }
    const id = 'wt' + Date.now().toString(36);
    entries[id] = { lb: r1(lb), t: Date.now() };
    await write('weight/entries', entries);
    await pushWeightFeed();
    inp.value = '';
    toast('Logged ' + r1(lb) + ' lb');
    render();
  };
  row.append(inp, btn);
  log.appendChild(row);
  const hint = el('div', null, 'Same scale, same time of day makes the trend honest. Morning after waking is the classic.');
  hint.style.cssText = 'font-size:11px;color:var(--dim);margin-top:8px;line-height:1.5';
  log.appendChild(hint);
  wrap.appendChild(log);

  // ---- headline stats ----
  if (s.latest) {
    const sr = el('div', 'stat-row');
    const cell = (v, l, color) => {
      const c = el('div', 'stat');
      const val = el('div', 'stat-val num', v);
      if (color) val.style.color = color;
      c.appendChild(val);
      c.appendChild(el('div', 'stat-lbl', l));
      return c;
    };
    sr.appendChild(cell(r1(s.latest.lb) + '', 'Latest lb'));
    sr.appendChild(cell(s.avg7 != null ? String(r1(s.avg7)) : '\u2013', '7-day avg'));
    const rate = s.rateWk;
    sr.appendChild(cell(
      rate != null ? (rate > 0 ? '+' : '') + r1(rate) : '\u2013',
      'lb / week',
      rate != null ? (rate <= 0 ? 'var(--good)' : 'var(--warn)') : null
    ));
    sr.style.marginBottom = '12px';
    wrap.appendChild(sr);
  }

  wrap.appendChild(renderChart(s));
  wrap.appendChild(renderTOD());
  wrap.appendChild(await renderTDEE(s));
  wrap.appendChild(renderRecent());
  wrap.appendChild(renderSettings());

  root.appendChild(wrap);
}

/* ---------- chart ---------- */
function renderChart(s) {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Trend'));
  const chips = el('div');
  chips.style.cssText = 'display:flex;gap:6px';
  [30, 90].forEach(n => {
    const c = el('button', 'chip' + (range === n ? ' on' : ''), n + 'd');
    c.onclick = () => { range = n; render(); };
    chips.appendChild(c);
  });
  hd.appendChild(chips);
  card.appendChild(hd);

  const since = Date.now() - range * 864e5;
  const days = s.days.filter(p => new Date(p.d + 'T12:00:00').getTime() > since);
  const raw = sorted().filter(e => e.t > since);

  if (days.length < 2) {
    const p = el('div', null, 'Two days of data draws the first line. Keep logging.');
    p.style.cssText = 'font-size:13px;color:var(--dim)';
    card.appendChild(p);
    return card;
  }

  const avg = movingAvg(s.days).filter(p => new Date(p.d + 'T12:00:00').getTime() > since);

  const W = 340, H = 150, PAD = 8;
  const lbs = raw.map(e => e.lb).concat(avg.map(a => a.lb));
  let lo = Math.min(...lbs), hi = Math.max(...lbs);
  if (hi - lo < 2) { const m = (hi + lo) / 2; lo = m - 1; hi = m + 1; }
  const t0 = since, t1 = Date.now();
  const X = t => PAD + (t - t0) / (t1 - t0) * (W - PAD * 2);
  const Y = lb => PAD + (1 - (lb - lo) / (hi - lo)) * (H - PAD * 2);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.classList.add('wchart');

  // raw dots
  raw.forEach(e => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', X(e.t).toFixed(1));
    c.setAttribute('cy', Y(e.lb).toFixed(1));
    c.setAttribute('r', '2.4');
    c.setAttribute('class', 'wc-dot');
    svg.appendChild(c);
  });

  // moving average line
  if (avg.length >= 2) {
    const d = avg.map((p, i) =>
      (i ? 'L' : 'M') + X(new Date(p.d + 'T12:00:00').getTime()).toFixed(1) + ' ' + Y(p.lb).toFixed(1)
    ).join(' ');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'wc-avg');
    svg.appendChild(path);
  }

  card.appendChild(svg);

  const foot = el('div');
  foot.style.cssText = 'display:flex;justify-content:space-between;font-size:10px;color:var(--dim);margin-top:4px';
  foot.appendChild(el('span', 'num', r1(hi) + ' \u2013 ' + r1(lo) + ' lb'));
  foot.appendChild(el('span', null, 'dots raw \u00b7 line 7-day avg'));
  card.appendChild(foot);
  return card;
}

/* ---------- time of day ---------- */
function renderTOD() {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Time of day'));
  card.appendChild(hd);

  const buckets = { Morning: [], Afternoon: [], Evening: [] };
  sorted().forEach(e => {
    const h = new Date(e.t).getHours();
    (h < 11 ? buckets.Morning : h < 16 ? buckets.Afternoon : buckets.Evening).push(e.lb);
  });

  const any = Object.values(buckets).some(b => b.length);
  if (!any) {
    card.appendChild(noteEl('Weigh-ins will sort themselves here by clock time.'));
    return card;
  }

  const grid = el('div', 'stat-row');
  Object.entries(buckets).forEach(([label, lbs]) => {
    const c = el('div', 'stat');
    c.appendChild(el('div', 'stat-val num', lbs.length
      ? String(r1(lbs.reduce((s, x) => s + x, 0) / lbs.length)) : '\u2013'));
    c.appendChild(el('div', 'stat-lbl', label + ' \u00b7 ' + lbs.length));
    grid.appendChild(c);
  });
  card.appendChild(grid);
  card.appendChild(noteEl('Averages per window \u2014 expect evening to run heavier than morning. Compare like with like.'));
  return card;
}

/* ---------- TDEE ---------- */
async function renderTDEE(s) {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Maintenance estimate'));
  card.appendChild(hd);

  summaries = (await read('food/daySummaries', null)) || {};
  const today = todayKey();
  const calDays = Object.entries(summaries)
    .filter(([d, v]) => d !== today && v && v.cal > 0)
    .filter(([d]) => new Date(d + 'T12:00:00').getTime() > Date.now() - 15 * 864e5);

  if (s.rateWk == null || calDays.length < 7) {
    const need = [];
    if (calDays.length < 7) need.push((7 - calDays.length) + ' more day' + (7 - calDays.length === 1 ? '' : 's') + ' of food logging');
    if (s.rateWk == null) need.push('two weeks of weigh-ins');
    card.appendChild(noteEl('Needs ' + need.join(' and ') + '. Then the math does itself: average intake corrected by the scale\u2019s direction.'));
    return card;
  }

  const avgIntake = calDays.reduce((sum, [, v]) => sum + v.cal, 0) / calDays.length;
  const tdee = Math.round((avgIntake - s.rateWk * 500) / 10) * 10;

  const big = el('div', 'load-num num', '\u2248 ' + tdee.toLocaleString());
  big.style.fontSize = '32px';
  card.appendChild(big);
  card.appendChild(noteEl(
    'kcal/day to hold steady \u2014 from ' + Math.round(avgIntake).toLocaleString() + ' avg intake over ' + calDays.length +
    ' logged days and a ' + (s.rateWk > 0 ? '+' : '') + r1(s.rateWk) + ' lb/week trend.'));
  return card;
}

/* ---------- recent entries ---------- */
function renderRecent() {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Recent weigh-ins'));
  card.appendChild(hd);

  const list = sorted().slice(-8).reverse();
  if (!list.length) {
    card.appendChild(noteEl('None yet.'));
    return card;
  }
  list.forEach(e => {
    const row = el('button', 'food-entry');
    const body = el('div');
    const d = new Date(e.t);
    body.appendChild(el('div', 'fe-name num', r1(e.lb) + ' lb'));
    body.appendChild(el('div', 'fe-sub', d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      + ' \u00b7 ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })));
    row.appendChild(body);
    row.appendChild(el('div', 'fe-cal', '\u2715'));
    row.onclick = async () => {
      if (!confirm('Delete this ' + r1(e.lb) + ' lb entry?')) return;
      delete entries[e.id];
      await write('weight/entries', entries);
      await pushWeightFeed();
      render();
    };
    card.appendChild(row);
  });
  return card;
}

/* ---------- settings ---------- */
function renderSettings() {
  const card = el('div', 'card');
  card.appendChild(el('div', 'card-hd')).appendChild(el('div', 'eyebrow', 'Settings'));

  const linkBtn = el('button', 'btn btn-ghost btn-block', 'Copy Claude link');
  linkBtn.onclick = async () => {
    try { await navigator.clipboard.writeText(feedUrl()); toast('Link copied'); }
    catch { prompt('Copy this:', feedUrl()); }
  };
  card.appendChild(linkBtn);

  const restRow = el('div', 'field');
  restRow.style.marginTop = '12px';
  const lab = el('label', null, 'Default rest (seconds)');
  lab.setAttribute('for', 'restDef');
  restRow.appendChild(lab);
  const restIn = el('input');
  restIn.id = 'restDef'; restIn.type = 'number'; restIn.inputMode = 'numeric';
  restIn.value = LS.get('restDefault', 150);
  restIn.onchange = e => { LS.set('restDefault', parseInt(e.target.value) || 150); toast('Rest updated'); };
  restRow.appendChild(restIn);
  card.appendChild(restRow);

  const out = el('button', 'btn btn-danger btn-block', 'Sign out');
  out.style.marginTop = '12px';
  out.onclick = () => {
    if (hasActiveSession() && !confirm('You have a workout in progress. Sign out anyway?')) return;
    logout();
  };
  card.appendChild(out);
  return card;
}

function noteEl(txt) {
  const p = el('div', null, txt);
  p.style.cssText = 'font-size:12px;color:var(--dim);line-height:1.5';
  return p;
}
