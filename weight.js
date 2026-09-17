// Weight — body-weight log and trend math.
//   weight/entries -> { id: { lb, t } }

import { read, readExact, write, watch, todayKey, wu } from './store.js';
import { weightStats, dailyMeans as meansOf, movingAvg, maintenance, effectiveMaint,
         refreshModel, modelState, adjustedDays, peakOffset, trendRate } from './tdee.js';
import { lineChart } from './analytics.js';
import { bump } from './usage.js';
import { $, el, toast, noteEl, confirmSheet, r1, parseKey, fmtDateFull, LIMITS, within } from './ui.js';
import { wOut, wIn, fmtW, labelW, unitW, fmtRate, limW } from './units.js';

let entries = {};      // id -> { lb, t }
let range   = 30;      // chart window, days
let adjusted = true;   // chart shows normalised weigh-ins, not raw ones
let summaries = {};    // dateKey -> {cal,...} for TDEE

export async function initWeight() {
  entries = (await read('weight/entries', null)) || {};
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
  // Read once per paint. Everything below is stored pounds until the expression
  // that puts it on screen, and everything typed is converted before it is
  // checked against a limit.
  const u = wu();
  const lim = limW(LIMITS.lb, u);

  // ---- log card ----
  const log = el('div', 'card');
  const row = el('div', 'qty-row');
  const inp = el('input');
  inp.type = 'number'; inp.inputMode = 'decimal'; inp.step = '0.1';
  inp.min = lim[0]; inp.max = lim[1];
  inp.placeholder = s.latest ? fmtW(s.latest.lb, u) : fmtW(208, u);
  const btn = el('button', 'btn btn-primary', 'Log');
  btn.style.flex = '0 0 auto';
  btn.onclick = async () => {
    // Convert, then clamp. Checking the typed number against a pound bound
    // would let a kilos account log 690 kg and refuse 20.
    const lb = wIn(parseFloat(inp.value), u);
    if (!within(lb, LIMITS.lb)) { toast('Enter a weight between ' + lim[0] + ' and ' + lim[1] + ' ' + unitW(u)); return; }
    const id = 'wt' + Date.now().toString(36);
    // Built and written before `entries` is changed, so a refusal leaves the
    // screen showing what the database actually holds rather than a weigh-in
    // that exists only here. write() has already said why on screen.
    const next = { ...entries, [id]: { lb: r1(lb), t: Date.now() } };
    try { await write('weight/entries', next); }
    catch { toast('Not saved \u2014 that weigh-in was refused.'); return; }
    entries = next;
    bump('weighIn');
    await refit();
    inp.value = '';
    toast('Logged ' + labelW(r1(lb), u));
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
    sr.appendChild(cell(fmtW(s.latest.lb, u), 'Latest ' + unitW(u)));
    sr.appendChild(cell(s.avg7 != null ? fmtW(s.avg7, u) : '–', '7-day avg'));
    const tr = trendRate(entries);
    const rate = tr.rateWk;
    sr.appendChild(cell(
      rate != null ? (rate > 0 ? '+' : '') + fmtRate(rate, u) : '–',
      unitW(u) + ' / week' + (tr.model ? ' ✓' : ''),
      rate != null ? (rate <= 0 ? 'var(--good)' : 'var(--warn)') : null
    ));
    sr.style.marginBottom = '12px';
    wrap.appendChild(sr);
  }

  wrap.appendChild(renderChart(s, u));
  wrap.appendChild(renderTOD(u));
  wrap.appendChild(await renderTDEE(s, u));
  wrap.appendChild(renderRecent(u));
  // The settings card that used to end this screen is now the You tab's gear.

  root.appendChild(wrap);
}

/* ---------- chart ---------- */
function renderChart(s, u) {
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

  card.appendChild(lineChart(
    avg.map(p => ({ t: parseKey(p.d).getTime(), v: wOut(p.lb, u) })),
    {
      color: 'var(--p-yellow)',
      height: 178,
      unit: unitW(u),
      dots: false,
      markMax: false,
      scatter: raw.map(e => ({ t: e.t, v: wOut(e.lb, u) }))
    }
  ));

  // lo and hi come off the stored pounds, not off the points above — those
  // have already been converted and running them through again is the one
  // mistake this whole ship is built to avoid.
  const lo = Math.min(...raw.map(e => e.lb), ...avg.map(a => a.lb));
  const hi = Math.max(...raw.map(e => e.lb), ...avg.map(a => a.lb));
  const foot = el('div', 'chart-foot');
  foot.appendChild(el('span', 'num', fmtW(hi, u) + ' – ' + labelW(lo, u)));
  foot.appendChild(el('span', null, useAdj
    ? 'dots normalised · line 7-day avg'
    : 'dots raw · line 7-day avg'));
  card.appendChild(foot);
  return card;
}

/* ---------- time of day ---------- */
function renderTOD(u) {
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
    const big = el('div', 'load-num num', '+' + fmtW(pk.lb, u));
    big.style.fontSize = '28px';
    big.style.color = 'var(--p-yellow)';
    card.appendChild(big);
    card.appendChild(el('div', 'eyebrow', unitW(u) + ' heavier by ' + hr));

    const parts = ['Every weigh-in is corrected by its own number before it counts toward the trend'];
    if (m.spread != null) parts.push('your readings span ' + labelW(m.spread, u) + ' within a day on average');
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
      ? fmtW(lbs.reduce((s, x) => s + x, 0) / lbs.length, u) : '–'));
    c.appendChild(el('div', 'stat-lbl', label + ' · ' + lbs.length));
    grid.appendChild(c);
  });
  card.appendChild(grid);
  card.appendChild(noteEl('Averages per window — expect evening to run heavier than morning. Compare like with like.'));
  return card;
}

/* ---------- TDEE ---------- */
async function renderTDEE(s, u) {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Maintenance estimate'));
  card.appendChild(hd);

  summaries = (await read('food/daySummaries', null)) || {};
  const m = maintenance(entries, summaries);
  // Which number the rest of the app is actually quoting, decided in one place
  // (tdee.js effectiveMaint) rather than guessed at here. This card used to say
  // "Fuel uses this" whenever nothing was pinned, and setup wrote a starting
  // number for everybody who did not skip it — so the sentence was false more
  // often than it was true. Now it reports what is in force and why.
  const t = (await read('food/targets', null)) || {};
  const eff = effectiveMaint(t, m);
  const stored = Number(t.maint) > 0 ? Math.round(Number(t.maint)) : null;

  if (m.tdee == null) {
    card.appendChild(noteEl('Needs ' + m.need.join(' and ') +
      '. Then the math does itself: average intake corrected by the scale\u2019s direction.'));
    // Until then something else is drawing Fuel's marks, and which one it is
    // decides what happens when this number finally arrives: a setup guess
    // steps aside for it, a number that was typed does not.
    if (eff && eff.source === 'setup') {
      card.appendChild(noteEl('In the meantime Fuel is using the ' + eff.cal.toLocaleString() +
        ' setup estimated from your height, weight, age and activity. It steps aside on its own once the number above exists.'));
    } else if (eff) {
      card.appendChild(noteEl('In the meantime Fuel is using a fixed maintenance of ' + eff.cal.toLocaleString() +
        ' kcal. That one is yours, so it stays until you clear it under Daily targets \u2014 the measured number will not replace it.'));
    }
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
    ' logged days and a ' + (m.rateWk > 0 ? '+' : '') + fmtRate(m.rateWk, u) + ' ' + unitW(u) + '/week trend' +
    (m.trendDays ? ' measured over ' + m.trendDays + ' days' : '') +
    // Past the early return there is an estimate, so effectiveMaint() can only
    // answer 'measured' or 'pinned' here — a setup number has already expired.
    (eff && eff.source === 'measured'
      ? '. Fuel uses this to place the cut / maintain / gain marks on the calorie bar.'
      : '. Fuel is holding a fixed maintenance of ' + (stored || 0).toLocaleString() +
        ' instead, so that is what its marks are drawn from. Clear it under Daily targets to use this measured number.')));

  /* ---------- the one-time question ----------
     The eight accounts that existed before maintSrc have a stored maintenance
     number and no way to tell whether setup wrote it or a person typed it.
     Guessing either way is wrong: assume setup and a number somebody chose
     gets overruled; assume typed and the promise the setup screen made is
     never kept. So they are asked, once, and only at the moment the answer
     changes anything \u2014 there is a stored number, nothing says where it came
     from, and Rack now has a measured one to offer.

     Neither answer needs a flag to remember it. "Use the measured one" clears
     maint, and "keep mine" writes maintSrc, and each of those breaks the
     condition above for good. Dismissing without answering writes nothing, so
     the card comes back \u2014 which is the right way round for a question nobody
     has answered yet.

     Fail-safe: anything unexpected \u2014 no targets, a target node that does not
     look like one, a read that failed \u2014 shows no card at all. */
  if (stored != null && t.maintSrc == null && Number(t.cal) > 0) {
    card.appendChild(maintAskEl(m.tdee, stored));
  }

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

function maintAskEl(measured, stored) {
  // No new CSS for one card: a rule and some space is what separates a question
  // from the numbers above it, and .qty-row would squash both buttons to the
  // 54px it reserves for a single-glyph one.
  const box = el('div');
  box.style.marginTop = '14px';
  box.style.paddingTop = '12px';
  box.style.borderTop = '1px solid var(--collar)';

  box.appendChild(el('div', 'eyebrow', 'Which number should Fuel use?'));
  box.appendChild(noteEl(
    'Rack has measured your maintenance at \u2248 ' + measured.toLocaleString() + ' kcal from your own weigh-ins and food. ' +
    'Fuel is still using ' + stored.toLocaleString() + ', which was either written by setup or typed in \u2014 nothing stored says which, ' +
    'so this is the one time you will be asked.'));

  const useIt = el('button', 'btn btn-primary btn-block', 'Use my measured number');
  useIt.style.marginTop = '10px';
  const keep = el('button', 'btn btn-ghost btn-block', 'Keep ' + stored.toLocaleString());
  keep.style.marginTop = '8px';
  // Disabled while it writes so a double tap cannot send two answers, and put
  // back if the write did not land \u2014 an unanswerable question with two dead
  // buttons is the worst of the three outcomes.
  const answer = k => async () => {
    useIt.disabled = keep.disabled = true;
    if (!await answerMaint(k)) useIt.disabled = keep.disabled = false;
  };
  useIt.onclick = answer(false);
  keep.onclick  = answer(true);
  box.append(useIt, keep);
  return box;
}

/* Re-read before writing rather than reusing what the render read. This is a
   whole-node PUT of food/targets, and the copy in scope came from read(),
   which folds "not there" and "could not be reached" into the same fallback \u2014
   so writing that copy back is how a pair of buttons erases somebody's
   calorie target. readExact() tells the two apart and throws on the second. */
async function answerMaint(keep) {
  let cur = null;
  try { cur = await readExact('food/targets'); } catch { cur = null; }
  if (!cur || !(Number(cur.cal) > 0)) {
    toast('Couldn\u2019t reach your targets \u2014 try again in a moment.');
    return false;
  }
  const next = keep ? { ...cur, maintSrc: 'pinned' }
                    : { ...cur, maint: null, maintSrc: null };
  // write() reports a refusal itself and throws; there is nothing to add here
  // beyond not claiming it worked.
  try { await write('food/targets', next); } catch { return false; }
  toast(keep ? 'Keeping your number \u2014 Fuel will go on using it.'
             : 'Fuel is now following your measured maintenance.');
  render();
  return true;
}

/* ---------- recent entries ---------- */
function renderRecent(u) {
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
    body.appendChild(el('div', 'fe-name num', labelW(e.lb, u)));
    body.appendChild(el('div', 'fe-sub', d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })));
    row.appendChild(body);
    row.appendChild(el('div', 'fe-cal', '✕'));
    row.onclick = () => {
      confirmSheet({
        title: 'Delete this weigh-in?',
        body: labelW(e.lb, u) + ' logged ' + fmtDateFull(todayKey(new Date(e.t))) + '.',
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
          const next = { ...entries };
          delete next[e.id];
          try { await write('weight/entries', next); }
          catch { toast('Not deleted \u2014 that write was refused.'); return; }
          entries = next;
          render();
        }
      });
    };
    card.appendChild(row);
  });
  return card;
}
