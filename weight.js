// Weight — body-weight log, trend math, and the app's settings card.
//   weight/entries -> { id: { lb, t } }

import { read, write, writeFeed, watch, LS, todayKey, feedUrl, logout } from './store.js';
import { hasActiveSession } from './workout.js';
import { weightStats, dailyMeans as meansOf, movingAvg, maintenance } from './tdee.js';
import { openImport } from './importer.js';
import { lineChart } from './analytics.js';
import { $, el, toast, noteEl, confirmSheet, r1, parseKey, fmtDateFull } from './ui.js';

let entries = {};      // id -> { lb, t }
let range   = 30;      // chart window, days
let summaries = {};    // dateKey -> {cal,...} for TDEE

export async function initWeight() {
  entries = (await read('weight/entries', null)) || {};
  // Stay subscribed: this node is written whole, so a stale copy in memory
  // would silently drop a weigh-in logged elsewhere (another device, or an
  // agent writing over REST) the next time you stepped on the scale.
  watch('weight/entries', val => {
    const next = val || {};
    if (JSON.stringify(next) === JSON.stringify(entries)) return;
    entries = next;
    pushWeightFeed();
    render();
  });
  render();
}

/* ================= MATH ================= */
// The arithmetic lives in tdee.js so Fuel's calorie bar and this screen can
// never disagree about what "maintenance" means.
function sorted() {
  return Object.entries(entries)
    .map(([id, e]) => ({ id, ...e }))
    .sort((a, b) => a.t - b.t);
}
function dailyMeans() { return meansOf(entries); }
function stats() { return weightStats(entries); }

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
  log.appendChild(noteEl('Same scale, same time of day makes the trend honest. Morning after waking is the classic.'));
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
    sr.appendChild(cell(s.avg7 != null ? String(r1(s.avg7)) : '–', '7-day avg'));
    const rate = s.rateWk;
    sr.appendChild(cell(
      rate != null ? (rate > 0 ? '+' : '') + r1(rate) : '–',
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
  const chips = el('div', 'chip-row');
  [30, 90, 365].forEach(n => {
    const c = el('button', 'chip' + (range === n ? ' on' : ''), n === 365 ? '1y' : n + 'd');
    c.onclick = () => { range = n; render(); };
    chips.appendChild(c);
  });
  hd.appendChild(chips);
  card.appendChild(hd);

  const since = Date.now() - range * 864e5;
  const days = s.days.filter(p => parseKey(p.d).getTime() > since);
  const raw = sorted().filter(e => e.t > since);

  if (days.length < 2) {
    card.appendChild(noteEl('Two days of data draws the first line. Keep logging.'));
    return card;
  }

  const avg = movingAvg(s.days).filter(p => parseKey(p.d).getTime() > since);

  card.appendChild(lineChart(
    avg.map(p => ({ t: parseKey(p.d).getTime(), v: p.lb })),
    {
      color: 'var(--p-yellow)',
      height: 178,
      unit: 'lb',
      dots: false,
      markMax: false,
      scatter: raw.map(e => ({ t: e.t, v: e.lb }))
    }
  ));

  const lo = Math.min(...raw.map(e => e.lb), ...avg.map(a => a.lb));
  const hi = Math.max(...raw.map(e => e.lb), ...avg.map(a => a.lb));
  const foot = el('div', 'chart-foot');
  foot.appendChild(el('span', 'num', r1(hi) + ' – ' + r1(lo) + ' lb'));
  foot.appendChild(el('span', null, 'dots raw · line 7-day avg'));
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
      ? String(r1(lbs.reduce((s, x) => s + x, 0) / lbs.length)) : '–'));
    c.appendChild(el('div', 'stat-lbl', label + ' · ' + lbs.length));
    grid.appendChild(c);
  });
  card.appendChild(grid);
  card.appendChild(noteEl('Averages per window — expect evening to run heavier than morning. Compare like with like.'));
  return card;
}

/* ---------- TDEE ---------- */
async function renderTDEE(s) {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Maintenance estimate'));
  card.appendChild(hd);

  summaries = (await read('food/daySummaries', null)) || {};
  const m = maintenance(entries, summaries);

  if (m.tdee == null) {
    card.appendChild(noteEl('Needs ' + m.need.join(' and ') +
      '. Then the math does itself: average intake corrected by the scale\u2019s direction.'));
    return card;
  }

  const big = el('div', 'load-num num', '\u2248 ' + m.tdee.toLocaleString());
  big.style.fontSize = '32px';
  card.appendChild(big);
  card.appendChild(noteEl(
    'kcal/day to hold steady \u2014 from ' + Math.round(m.avgIntake).toLocaleString() + ' avg intake over ' + m.days +
    ' logged days and a ' + (m.rateWk > 0 ? '+' : '') + r1(m.rateWk) + ' lb/week trend. Fuel uses this to place the cut / maintain / gain marks on the calorie bar.'));
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
    const body = el('div', 'fe-body');
    const d = new Date(e.t);
    body.appendChild(el('div', 'fe-name num', r1(e.lb) + ' lb'));
    body.appendChild(el('div', 'fe-sub', d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })));
    row.appendChild(body);
    row.appendChild(el('div', 'fe-cal', '✕'));
    row.onclick = () => {
      confirmSheet({
        title: 'Delete this weigh-in?',
        body: r1(e.lb) + ' lb logged ' + fmtDateFull(todayKey(new Date(e.t))) + '.',
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
          delete entries[e.id];
          await write('weight/entries', entries);
          await pushWeightFeed();
          render();
        }
      });
    };
    card.appendChild(row);
  });
  return card;
}

/* ---------- settings ---------- */
function renderSettings() {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Settings'));
  card.appendChild(hd);

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

  const imp = el('button', 'btn btn-ghost btn-block', 'Import workout history');
  imp.style.marginTop = '12px';
  imp.onclick = openImport;
  card.appendChild(imp);

  const out = el('button', 'btn btn-danger btn-block', 'Sign out');
  out.style.marginTop = '12px';
  out.onclick = () => {
    if (hasActiveSession()) {
      confirmSheet({
        title: 'Workout in progress',
        body: 'You have a live session. Signing out keeps it saved on this device, but you’ll need to sign back in to finish it.',
        confirmLabel: 'Sign out anyway',
        danger: true,
        onConfirm: () => logout()
      });
      return;
    }
    logout();
  };
  card.appendChild(out);
  return card;
}
