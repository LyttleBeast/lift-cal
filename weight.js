// Weight — body-weight log and trend math.
//   weight/entries -> { id: { lb, t } }

import { read, write, watch, todayKey } from './store.js';
import { weightStats, dailyMeans as meansOf, movingAvg, maintenance,
         refreshModel, modelState, adjustedDays, peakOffset, trendRate, trendWeight, goalDir } from './tdee.js';
import { lineChart } from './analytics.js';
import { bump } from './usage.js';
import { $, el, toast, noteEl, confirmSheet, r1, parseKey, fmtDateFull, LIMITS, within } from './ui.js';

let entries = {};      // id -> { lb, t }
let range   = 30;      // chart window, days
let adjusted = true;   // chart shows normalised weigh-ins, not raw ones
let summaries = {};    // dateKey -> {cal,...} for TDEE
let targets   = {};    // food/targets — the stated goal, and a pinned maintenance if any

export async function initWeight() {
  // The rate's colour needs the goal direction on the first paint, and that
  // reads targets and, failing a stated goal, maintenance — so both come in
  // with the weigh-ins rather than trailing them by a render.
  const [we, ds, tg] = await Promise.all([
    read('weight/entries', null), read('food/daySummaries', null), read('food/targets', null)
  ]);
  entries = we || {}; summaries = ds || {}; targets = tg || {};
  await refit();
  // Stay subscribed: this node is written whole, so a stale copy in memory
  // would silently drop a weigh-in logged on another device the next time you
  // stepped on the scale.
  watch('weight/entries', val => {
    const next = val || {};
    if (JSON.stringify(next) === JSON.stringify(entries)) return;
    entries = next;
    refit().then(render);
  });
  render();
}

// The normalisation model reads the food and water logs back, so it is async.
// Fit it whenever the weigh-ins change; every render then reads the cache.
async function refit() {
  try { await refreshModel(entries); } catch {}
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

/* ---------- when a weigh-in happened ----------
   Every weigh-in used to be stamped with the moment it was typed in, so this
   morning's number logged at lunch carried a lunchtime clock — and the
   time-of-day correction (weightmodel.js) then subtracted a lunch that was
   not in you when you stood on the scale. Three choices: now, this morning,
   or a time you pick. Resets to "now" after each log. */
let whenMode = 'now';   // 'now' | 'morning' | 'custom'

// The clock time this account's morning weigh-ins usually carry (the median
// of every reading before 11am), so "This morning" lands where the scale
// actually gets stepped on. 7:00 until there is anything to go on.
function morningMinutes() {
  const mins = sorted()
    .map(e => new Date(e.t)).filter(d => d.getHours() < 11)
    .map(d => d.getHours() * 60 + d.getMinutes()).sort((a, b) => a - b);
  return mins.length ? mins[Math.floor(mins.length / 2)] : 7 * 60;
}

// The timestamp a log would carry right now. NaN for an unparseable custom
// value; never in the future for the morning chip, which just means "now" if
// it is still before the usual time.
function whenStamp(customValue) {
  const now = Date.now();
  if (whenMode === 'morning') {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return Math.min(now, d.getTime() + morningMinutes() * 60e3);
  }
  if (whenMode === 'custom') {
    const t = customValue ? new Date(customValue).getTime() : NaN;
    return Number.isFinite(t) ? t : NaN;
  }
  return now;
}

const pad2 = n => String(n).padStart(2, '0');
// What a datetime-local input wants: local time, no zone, to the minute.
function localIso(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
         'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function fmtClock(t) {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Same precedence as Fuel and You: a pinned number wins, then the estimate.
function maintCal() {
  if (Number(targets.maint) > 0) return Math.round(Number(targets.maint));
  const m = maintenance(entries, summaries);
  return m.tdee > 0 ? m.tdee : null;
}

/* ================= RENDER ================= */
// Synchronous, the way you.js paints. This used to be async: it emptied the
// view and then awaited the maintenance card's two reads, so every visit to
// the tab flashed blank for as long as the database took to answer. Now the
// whole screen goes up in one swap with a placeholder where the estimate will
// be, and fillTDEE() replaces that card when the reads land.
let renderSeq = 0;

export function render() {
  const root = $('#view-weight');
  if (!root) return;
  const seq = ++renderSeq;
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
  inp.min = LIMITS.lb[0]; inp.max = LIMITS.lb[1];
  inp.placeholder = s.latest ? String(r1(s.latest.lb)) : '208.0';
  // The chips repaint themselves rather than calling render(), because a full
  // repaint would throw away the number already typed in the box above.
  const whenRow = el('div', 'chip-row');
  whenRow.style.marginTop = '10px';
  const customWrap = el('div', 'field');
  customWrap.style.marginTop = '10px';
  const custom = el('input');
  custom.type = 'datetime-local';
  custom.max = localIso(new Date());
  custom.value = localIso(new Date());
  custom.style.background = 'var(--rack)';
  custom.setAttribute('aria-label', 'Date and time of the weigh-in');
  customWrap.appendChild(custom);
  const whenNote = noteEl('');
  const paintWhen = () => {
    whenRow.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.id === whenMode));
    customWrap.style.display = whenMode === 'custom' ? '' : 'none';
    whenNote.style.display = whenMode === 'now' ? 'none' : '';
    const usual = new Date(); usual.setHours(0, 0, 0, 0);
    const usualT = usual.getTime() + morningMinutes() * 60e3;
    whenNote.textContent = whenMode === 'morning'
      ? (Date.now() < usualT
          ? 'Your morning weigh-ins usually land around ' + fmtClock(usualT) + '. It is earlier than that, so this one is stamped now.'
          : 'Stamped ' + fmtClock(usualT) + ' today, when your morning weigh-ins usually happen.')
      : whenMode === 'custom' ? 'Stamped with the time you pick, so the correction knows what was in you.' : '';
  };
  [['now', 'Now'], ['morning', 'This morning'], ['custom', 'Custom']].forEach(([id, label]) => {
    const c = el('button', 'chip', label);
    c.dataset.id = id;
    c.onclick = () => { whenMode = id; paintWhen(); };
    whenRow.appendChild(c);
  });

  const btn = el('button', 'btn btn-primary', 'Log');
  btn.style.flex = '0 0 auto';
  btn.onclick = async () => {
    const lb = parseFloat(inp.value);
    if (!within(lb, LIMITS.lb)) { toast('Enter a weight between ' + LIMITS.lb[0] + ' and ' + LIMITS.lb[1] + ' lb'); return; }
    const t = whenStamp(custom.value);
    if (!Number.isFinite(t)) { toast('Pick a date and time first'); return; }
    if (t > Date.now() + 60e3) { toast('That time hasn’t happened yet'); return; }
    const id = 'wt' + Date.now().toString(36);
    entries[id] = { lb: r1(lb), t };
    await write('weight/entries', entries);
    bump('weighIn');
    await refit();
    inp.value = '';
    const day = todayKey(new Date(t));
    toast('Logged ' + r1(lb) + ' lb' + (whenMode === 'now' ? ''
      : ' at ' + fmtClock(t) + (day === todayKey() ? '' : ', ' + fmtDateFull(day))));
    whenMode = 'now';
    render();
  };
  row.append(inp, btn);
  log.appendChild(row);
  log.appendChild(whenRow);
  log.appendChild(customWrap);
  log.appendChild(whenNote);
  paintWhen();
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
    const tr = trendRate(entries);
    const rate = tr.rateWk;
    // Losing is only good on a cut. This used to colour any fall green and any
    // rise amber, which contradicted You for anybody bulking; both tabs now ask
    // tdee.js goalDir, and stay uncoloured when the goal is unknown.
    const dir = goalDir(targets, maintCal());
    const right = dir == null || rate == null ? null
      : dir === 0 ? Math.abs(rate) <= 0.5 : dir < 0 ? rate <= 0 : rate >= 0;
    sr.appendChild(cell(
      rate != null ? (rate > 0 ? '+' : '') + r1(rate) : '–',
      tr.model ? 'lb / week ✓' : 'lb / week',
      right == null ? null : right ? 'var(--ok)' : 'var(--caution)'
    ));
    sr.style.marginBottom = '12px';
    wrap.appendChild(sr);

    // The finish line, beside the headline: the goal from Daily targets and
    // how far the trend is from it. You's goal card does the date arithmetic;
    // this is just the distance, on the tab where the number gets logged.
    const goalLb = Number(targets.goalLb);
    if (goalLb > 0) {
      const tw = trendWeight();
      const from = Number.isFinite(tw) && tw > 0 ? tw : s.latest.lb;
      const gap = r1(from - goalLb);
      const dir = goalDir(targets, maintCal());
      // On a cut the goal is below you, so being under it is past it; on a bulk
      // the other way round. Holding has no "past".
      const passed = dir != null && dir !== 0 && gap !== 0 && Math.sign(gap) === dir;
      const line = el('div', 'you-sub num goal-gap');
      line.textContent = 'Goal ' + r1(goalLb) + ' lb  ·  ' +
        (gap === 0 ? 'on it' : passed ? Math.abs(gap) + ' lb past it' : Math.abs(gap) + ' lb to go');
      wrap.appendChild(line);
    }
  }

  wrap.appendChild(renderChart(s));
  wrap.appendChild(renderTOD());

  const pending = el('div', 'card');
  const phd = el('div', 'card-hd');
  phd.appendChild(el('div', 'eyebrow', 'Maintenance estimate'));
  pending.appendChild(phd);
  pending.appendChild(noteEl('Reading your food log…'));
  wrap.appendChild(pending);

  wrap.appendChild(renderRecent());
  // The settings card that used to end this screen is now the You tab's gear.

  root.replaceChildren(wrap);
  fillTDEE(pending, s, seq);
}

// A render that started after this one owns the screen; a read landing late
// must not swap a stale card into it.
async function fillTDEE(placeholder, s, seq) {
  let card;
  try { card = await renderTDEE(s); } catch { return; }
  if (seq !== renderSeq || !placeholder.isConnected) return;
  placeholder.replaceWith(card);
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

  const m = modelState();
  const adj = adjustedDays();
  const useAdj = adjusted && adj && adj.length >= 2;

  if (adj && adj.length >= 2) {
    const t = el('div', 'chip-row');
    t.style.marginBottom = '8px';
    [['Adjusted', true], ['Raw', false]].forEach(([label, val]) => {
      const c = el('button', 'chip' + (adjusted === val ? ' on' : ''), label);
      c.onclick = () => { adjusted = val; render(); };
      t.appendChild(c);
    });
    card.appendChild(t);
  }

  const since = Date.now() - range * 864e5;
  const source = useAdj ? adj : s.days;
  const days = source.filter(p => parseKey(p.d).getTime() > since);
  const raw = useAdj
    ? (m ? m.entries.filter(e => e.t > since).map(e => ({ t: e.t, lb: e.adj })) : [])
    : sorted().filter(e => e.t > since);

  if (days.length < 2) {
    card.appendChild(noteEl('Two days of data draws the first line. Keep logging.'));
    return card;
  }

  const avg = movingAvg(source).filter(p => parseKey(p.d).getTime() > since);

  const tr = trendRate(entries);
  card.appendChild(lineChart(
    avg.map(p => ({ t: parseKey(p.d).getTime(), v: p.lb })),
    {
      color: 'var(--s-weight)',
      height: 178,
      unit: 'lb',
      minSpan: 4,
      dots: false,
      markMax: false,
      scatter: raw.map(e => ({ t: e.t, v: e.lb })),
      scrub: { line: '7-day avg', scatter: useAdj ? 'normalised' : 'weigh-ins' },
      refs: Number(targets.goalLb) > 0 ? [{ v: Number(targets.goalLb), label: 'goal ' + r1(Number(targets.goalLb)) }] : [],
      label: 'Body weight, last ' + (range === 365 ? 'year' : range + ' days'),
      describe: tr.rateWk != null ? 'Trending ' + (tr.rateWk < 0 ? 'down ' : 'up ') + r1(Math.abs(tr.rateWk)) + ' pounds a week' : ''
    }
  ));

  const lo = Math.min(...raw.map(e => e.lb), ...avg.map(a => a.lb));
  const hi = Math.max(...raw.map(e => e.lb), ...avg.map(a => a.lb));
  const foot = el('div', 'chart-foot');
  foot.appendChild(el('span', 'num', r1(hi) + ' – ' + r1(lo) + ' lb'));
  foot.appendChild(el('span', null, useAdj
    ? 'dots normalised · line 7-day avg'
    : 'dots raw · line 7-day avg'));
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

  // Once the model has fitted, this stops being "averages per window" and
  // becomes the actual learned curve: how much heavier the scale reads at each
  // hour because of what is still inside you.
  const m = modelState();
  const pk = peakOffset();
  if (m && pk && m.hourly.length >= 3) {
    const peakMax = Math.max(...m.hourly.map(x => x.lb), 0.1);
    const strip = el('div', 'tod-strip');
    for (let h = 0; h < 24; h++) {
      const pt = m.hourly.find(x => x.h === h);
      const col = el('div', 'tod-col' + (pt ? '' : ' empty'));
      const bar = el('i');
      bar.style.height = pt ? Math.max(3, pt.lb / peakMax * 100) + '%' : '2px';
      col.appendChild(bar);
      if (h % 6 === 0) col.appendChild(el('span', 'tod-h', h === 0 ? '12a' : h === 12 ? '12p' : (h % 12) + (h < 12 ? 'a' : 'p')));
      strip.appendChild(col);
    }
    card.appendChild(strip);

    const hr = pk.h === 0 ? '12am' : pk.h === 12 ? '12pm' : (pk.h % 12) + (pk.h < 12 ? 'am' : 'pm');
    const big = el('div', 'load-num num', '+' + r1(pk.lb));
    big.style.fontSize = '28px';
    big.style.color = 'var(--s-weight)';
    card.appendChild(big);
    card.appendChild(el('div', 'eyebrow', 'lb heavier by ' + hr));

    const parts = ['Every weigh-in is corrected by its own number before it counts toward the trend'];
    if (m.spread != null) parts.push('your readings span ' + r1(m.spread) + ' lb within a day on average');
    card.appendChild(noteEl(parts.join(' — ') + '.'));

    if (m.anchorDays < 5) {
      card.appendChild(noteEl(m.anchorDays + ' of the last 7 days has a fasted morning weigh-in. Those need the least correction, so they carry the most weight — one before breakfast is worth several after dinner.'));
    }
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
  // Fuel only draws its marks off this estimate when nothing is pinned
  // (food.js:565) — and setup writes a starting number there for everybody who
  // did not skip it, so "Fuel uses this" is false more often than it is true.
  targets = (await read('food/targets', null)) || {};
  const pinned = Number(targets.maint) > 0 ? Math.round(Number(targets.maint)) : null;

  if (m.tdee == null) {
    card.appendChild(noteEl('Needs ' + m.need.join(' and ') +
      '. Then the math does itself: average intake corrected by the scale\u2019s direction.'));
    return card;
  }

  const big = el('div', 'load-num num', '\u2248 ' + m.tdee.toLocaleString());
  big.style.fontSize = '32px';
  card.appendChild(big);

  // The interval is the feature. A single number invites chasing 40 kcal of
  // noise; \u00b1 95 says plainly how much of this is measurement.
  if (m.se) {
    const ci = Math.round(1.96 * m.se / 5) * 5;
    card.appendChild(el('div', 'eyebrow', '\u00b1 ' + ci.toLocaleString() + ' kcal'));
  }

  card.appendChild(noteEl(
    'kcal/day to hold steady \u2014 from ' + Math.round(m.avgIntake).toLocaleString() + ' avg intake over ' + m.days +
    ' logged days and a ' + (m.rateWk > 0 ? '+' : '') + r1(m.rateWk) + ' lb/week trend' +
    (m.trendDays ? ' measured over ' + m.trendDays + ' days' : '') +
    (pinned == null
      ? '. Fuel uses this to place the cut / maintain / gain marks on the calorie bar.'
      : '. Fuel is holding a fixed maintenance of ' + pinned.toLocaleString() +
        ' instead, so that is what its marks are drawn from. Clear it under Daily targets to use this measured number.')));

  if (m.model && m.coef) {
    card.appendChild(noteEl(m.coef.learned
      ? 'Weigh-ins are normalised before the trend is fitted, using ' + m.coef.pairs +
        ' same-day pairs across ' + m.coef.pairDays + ' days to learn what food and water do to your scale.'
      : 'Still on the default correction — ' + m.coef.pairs + ' same-day pairs so far, and it takes ' +
        '30 across 14 days to learn your own. Weighing twice in a day is what builds that up.'));
  } else {
    card.appendChild(noteEl('Using the older estimate: this one averages every weigh-in in a day together, so it moves when your weighing habit does. It sharpens up once there are enough same-day weigh-ins to normalise them.'));
  }
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
          render();
        }
      });
    };
    card.appendChild(row);
  });
  return card;
}
