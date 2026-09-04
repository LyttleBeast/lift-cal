// Statistics page. Lives inside the Train tab, above the calendar.
//
// Import direction is one-way: workout.js imports this file, this file does
// NOT import workout.js. The "back" behaviour is handed in as a callback so
// there is no circular dependency.

import {
  allSessions, exerciseIndex, filterByRange, weeklyVolume, groupSplit,
  topBy, prTimeline, isWorking, lineChart, barChart, splitBar, heatStrip,
  legend, emptyChart, groupColor, GROUPS, GROUP_ORDER
} from './analytics.js';
import { todayKey } from './store.js';
import {
  $, el, sheet, noteEl, compact, trimNum, fmtDate, fmtDateFull, parseKey,
  segmented
} from './ui.js';

let open      = false;
let backFn    = null;
let range     = 90;        // days, or null for all time
let sessions  = [];        // every session, oldest first
let index     = {};        // exercise index over ALL sessions
let detailEx  = null;      // exId when the per-exercise page is showing
let loading   = false;

export function isStatsOpen() { return open; }

export async function openStats(onBack) {
  open = true;
  backFn = onBack;
  detailEx = null;
  await refresh();
  renderStats();
}

export function closeStats() {
  open = false;
  detailEx = null;
}

export async function refresh() {
  loading = true;
  sessions = await allSessions(true);
  index = exerciseIndex(sessions);
  loading = false;
}

/* ================= ROOT ================= */
export function renderStats() {
  const root = $('#view-workout');
  if (!root) return;
  root.innerHTML = '';
  root.appendChild(detailEx ? renderDetail(detailEx) : renderOverview());
  root.scrollTop = 0;
  window.scrollTo(0, 0);
}

function pageHead(eyebrow, title, onBack) {
  const hd = el('div', 'cal-hd');
  const left = el('div');
  const back = el('button', 'back-btn');
  back.innerHTML = '<span aria-hidden="true">&#8249;</span> Back';
  back.onclick = onBack;
  left.appendChild(back);
  left.appendChild(el('div', 'eyebrow', eyebrow));
  left.appendChild(el('h1', null, title));
  hd.appendChild(left);
  return hd;
}

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

function statRow(cells) {
  const row = el('div', 'stat-row');
  cells.forEach(([v, l, color]) => {
    const s = el('div', 'stat');
    const val = el('div', 'stat-val num', String(v));
    if (color) val.style.color = color;
    s.appendChild(val);
    s.appendChild(el('div', 'stat-lbl', l));
    row.appendChild(s);
  });
  return row;
}

/* ================= OVERVIEW ================= */
function renderOverview() {
  const wrap = el('div', 'screen-pad');
  wrap.appendChild(pageHead('Training', 'Statistics', () => { closeStats(); backFn && backFn(); }));

  if (loading) {
    wrap.appendChild(noteEl('Loading your history…'));
    return wrap;
  }
  if (!sessions.length) {
    const es = el('div', 'empty-state');
    es.appendChild(el('h3', null, 'No training logged yet'));
    es.appendChild(el('p', null, 'Finish a workout and the charts will start filling in.'));
    wrap.appendChild(es);
    return wrap;
  }

  wrap.appendChild(segmented(
    [[30, '30d'], [90, '90d'], [365, '1y'], [0, 'All']],
    range,
    v => { range = v || null; renderStats(); }
  ));

  const inRange = filterByRange(sessions, range);
  const idxRange = exerciseIndex(inRange);

  /* ---- headline ---- */
  const totalVol = inRange.reduce((a, s) => a + (s.volume || 0), 0);
  const totalSets = inRange.reduce((a, s) =>
    a + (s.exercises || []).reduce((b, ex) => b + (ex.sets || []).filter(isWorking).length, 0), 0);
  const totalMin = Math.round(inRange.reduce((a, s) => a + (s.durationSec || 0), 0) / 60);

  wrap.appendChild(statRow([
    [inRange.length, 'Sessions'],
    [compact(totalVol), 'Volume lb'],
    [totalSets, 'Working sets']
  ]));
  wrap.appendChild(statRow([
    [totalMin >= 60 ? Math.round(totalMin / 60) + 'h' : totalMin + 'm', 'Time under bar'],
    [inRange.length ? compact(Math.round(totalVol / inRange.length)) : '0', 'Avg session lb'],
    [inRange.length ? Math.round(totalSets / inRange.length) : '0', 'Avg sets']
  ]));

  /* ---- volume per week ---- */
  const weeks = weeklyVolume(inRange).slice(-14);
  const volCard = card('Volume per week', weeks.length ? compact(totalVol) + ' lb total' : '');
  volCard.appendChild(barChart(
    weeks.map(w => ({ label: fmtDate(w.key).replace(/ /, ' '), v: w.volume })),
    { color: 'var(--p-blue)', height: 158, label: 'Volume per week' }
  ));
  volCard.appendChild(noteEl('Working sets only — warm-ups never count toward volume.'));
  wrap.appendChild(volCard);

  /* ---- consistency ---- */
  const consist = card('Consistency', trainedDays(inRange) + ' training days');
  consist.appendChild(heatStrip(sessions, 91, 'Training days'));
  const streakInfo = streaks(sessions);
  consist.appendChild(statRow([
    [streakInfo.currentWeeks, 'Week streak'],
    [streakInfo.bestWeeks, 'Best streak'],
    [streakInfo.daysSince == null ? '–' : streakInfo.daysSince, 'Days since']
  ]));
  consist.appendChild(noteEl('Last 13 weeks. Brighter squares are heavier days.'));
  wrap.appendChild(consist);

  /* ---- muscle group split ---- */
  const split = groupSplit(inRange);
  if (split.length) {
    const totalSplitSets = split.reduce((a, s) => a + s.sets, 0);
    const gc = card('Muscle group split', totalSplitSets + ' sets');
    // The same bar You draws for the same data. It was a donut here, and a
    // wedge is read far less accurately than a length (analytics.js splitBar).
    gc.appendChild(splitBar(
      split.map(s => ({ label: GROUPS[s.group].label, v: s.sets, color: groupColor(s.group) })),
      { label: 'Muscle group split' }
    ));
    const lg = legend(split.map(s => ({
      label: GROUPS[s.group].label,
      color: groupColor(s.group),
      value: s.sets + '  ' + Math.round(s.sets / totalSplitSets * 100) + '%'
    })));
    lg.classList.add('legend-grid');
    gc.appendChild(lg);
    gc.appendChild(noteEl('Counted by each exercise’s primary group.'));
    wrap.appendChild(gc);
  }

  /* ---- sessions per week ---- */
  const freqCard = card('Sessions per week');
  freqCard.appendChild(barChart(
    weeks.map(w => ({ label: fmtDate(w.key).replace(/ /, ' '), v: w.sessions })),
    { color: 'var(--s-train)', height: 132, label: 'Sessions per week' }
  ));
  wrap.appendChild(freqCard);

  /* ---- leaderboards ---- */
  wrap.appendChild(rankCard('Strongest lifts', topBy(index, 'bestE1rm', 5), e => ({
    primary: Math.round(e.bestE1rm) + ' lb',
    secondary: e.bestE1rmSet ? e.bestE1rmSet.w + ' × ' + e.bestE1rmSet.r + ' · ' + fmtDate(e.bestE1rmDate) : ''
  }), 'All-time estimated 1RM.'));

  wrap.appendChild(rankCard('Most trained', topBy(idxRange, 'sessions', 5), e => ({
    primary: e.sessions + '×',
    secondary: e.totalSets + ' sets · ' + compact(e.totalVolume) + ' lb'
  }), 'Within the selected range.'));

  wrap.appendChild(rankCard('Most volume', topBy(idxRange, 'totalVolume', 5), e => ({
    primary: compact(e.totalVolume) + ' lb',
    secondary: e.sessions + ' sessions'
  }), 'Within the selected range.'));

  /* ---- PR timeline ---- */
  const prs = prTimeline(sessions).slice(0, 12);
  const prCard = card('Recent personal records');
  if (!prs.length) {
    prCard.appendChild(noteEl('No records yet — they start appearing once you repeat an exercise and beat it.'));
  } else {
    prs.forEach(p => {
      const row = el('button', 'pr-row');
      const tag = el('i', 'pr-tag');
      tag.style.background = groupColor(p.group);
      row.appendChild(tag);
      const body = el('div', 'pr-body');
      body.appendChild(el('div', 'pr-name', p.name));
      body.appendChild(el('div', 'pr-sub', fmtDate(p.date) + '  ·  ' +
        (p.kind === 'e1rm' ? 'e1RM ' + p.detail : 'heaviest set') +
        (p.prev ? '  ·  was ' + Math.round(p.prev) : '')));
      row.appendChild(body);
      row.appendChild(el('div', 'pr-val num', Math.round(p.value)));
      row.onclick = () => { detailEx = p.exId; renderStats(); };
      prCard.appendChild(row);
    });
  }
  wrap.appendChild(prCard);

  /* ---- per-exercise entry point ---- */
  const go = el('button', 'btn btn-primary btn-block btn-lg', 'Exercise breakdown');
  go.onclick = openExercisePicker;
  wrap.appendChild(go);
  wrap.appendChild(noteEl('Pick any exercise you’ve logged to see its own charts.'));

  return wrap;
}

function rankCard(title, rows, fmt, note) {
  const c = card(title);
  if (!rows.length) {
    c.appendChild(noteEl('Not enough data yet.'));
    return c;
  }
  rows.forEach((e, i) => {
    const row = el('button', 'rank-row');
    row.appendChild(el('div', 'rank-no num', String(i + 1)));
    const tag = el('i', 'rank-tag');
    tag.style.background = groupColor(e.group);
    row.appendChild(tag);
    const body = el('div', 'rank-body');
    body.appendChild(el('div', 'rank-name', e.name));
    const f = fmt(e);
    body.appendChild(el('div', 'rank-sub', f.secondary));
    row.appendChild(body);
    row.appendChild(el('div', 'rank-val num', f.primary));
    row.onclick = () => { detailEx = e.exId; renderStats(); };
    c.appendChild(row);
  });
  if (note) c.appendChild(noteEl(note));
  return c;
}

function trainedDays(list) {
  return new Set(list.map(s => s._date)).size;
}

function streaks(list) {
  if (!list.length) return { currentWeeks: 0, bestWeeks: 0, daysSince: null };
  const weeks = new Set();
  list.forEach(s => {
    const d = new Date(s.startedAt);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    weeks.add(todayKey(d));
  });
  const sortedWeeks = [...weeks].sort();

  let best = 1, run = 1;
  for (let i = 1; i < sortedWeeks.length; i++) {
    const prev = parseKey(sortedWeeks[i - 1]).getTime();
    const cur  = parseKey(sortedWeeks[i]).getTime();
    if (Math.round((cur - prev) / 864e5) === 7) { run++; best = Math.max(best, run); }
    else run = 1;
  }

  // current streak counts back from this week (or last week if this week is
  // still empty — you shouldn't lose a streak on a Monday morning).
  const thisWeek = new Date();
  thisWeek.setHours(12, 0, 0, 0);
  thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
  let cursor = weeks.has(todayKey(thisWeek))
    ? thisWeek
    : new Date(thisWeek.getTime() - 7 * 864e5);
  let current = 0;
  while (weeks.has(todayKey(cursor))) {
    current++;
    cursor = new Date(cursor.getTime() - 7 * 864e5);
  }

  const last = list[list.length - 1];
  const daysSince = Math.floor((Date.now() - last.startedAt) / 864e5);
  return { currentWeeks: current, bestWeeks: Math.max(best, current), daysSince };
}

/* ================= EXERCISE PICKER ================= */
// Built from the training data rather than the exercise library, so every row
// is guaranteed to have something to chart.
function openExercisePicker() {
  const { sh, close } = sheet();
  let q = '', filter = 'all';

  const search = el('div', 'picker-search');
  const inp = el('input');
  inp.type = 'search';
  inp.placeholder = 'Search your exercises';
  search.appendChild(inp);
  const chips = el('div', 'filter-row');
  search.appendChild(chips);
  sh.appendChild(search);

  const list = el('div', 'ex-list');
  sh.appendChild(list);

  const usedGroups = [...new Set(Object.values(index).map(e => e.group))]
    .sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));

  function paint() {
    chips.innerHTML = '';
    const mk = (id, label) => {
      const c = el('button', 'chip' + (filter === id ? ' on' : ''), label);
      c.onclick = () => { filter = id; paint(); };
      return c;
    };
    chips.appendChild(mk('all', 'All'));
    usedGroups.forEach(g => chips.appendChild(mk(g, GROUPS[g] ? GROUPS[g].label : g)));

    list.innerHTML = '';
    const pool = Object.values(index)
      .filter(e => e.sessions > 0)
      .filter(e => filter === 'all' || e.group === filter)
      .filter(e => !q || e.name.toLowerCase().includes(q))
      .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));

    if (!pool.length) {
      list.appendChild(noteEl('Nothing logged matches that.'));
      return;
    }
    pool.forEach(e => {
      const b = el('button', 'ex-item');
      const dot = el('i', 'dot');
      dot.style.background = groupColor(e.group);
      b.appendChild(dot);
      const nm = el('span', 'nm', e.name);
      b.appendChild(nm);
      b.appendChild(el('span', 'eq num', e.sessions + '× · ' + Math.round(e.bestE1rm) + ' lb'));
      b.onclick = () => { close(); detailEx = e.exId; renderStats(); };
      list.appendChild(b);
    });
  }
  inp.oninput = ev => { q = ev.target.value.toLowerCase().trim(); paint(); };
  paint();

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '10px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ================= EXERCISE DETAIL ================= */
function renderDetail(exId) {
  const e = index[exId];
  const wrap = el('div', 'screen-pad');
  wrap.appendChild(pageHead('Exercise', e ? e.name : 'Unknown', () => { detailEx = null; renderStats(); }));

  if (!e || !e.entries.length) {
    wrap.appendChild(noteEl('No sessions recorded for this exercise.'));
    return wrap;
  }

  const gtag = el('div', 'group-pill');
  const dot = el('i');
  dot.style.background = groupColor(e.group);
  gtag.append(dot, document.createTextNode(
    (GROUPS[e.group] ? GROUPS[e.group].label : e.group) + '  ·  ' + (e.equipment || '')));
  wrap.appendChild(gtag);

  /* ---- headline ---- */
  wrap.appendChild(statRow([
    [Math.round(e.bestE1rm), 'Best e1RM', 'var(--p-yellow)'],
    [trimNum(e.bestWeight), 'Heaviest lb'],
    [e.sessions, 'Sessions']
  ]));
  wrap.appendChild(statRow([
    [compact(e.totalVolume), 'Total lb'],
    [e.totalSets, 'Working sets'],
    [e.totalReps, 'Total reps']
  ]));

  const entries = filterEntries(e.entries, range);

  wrap.appendChild(segmented(
    [[30, '30d'], [90, '90d'], [365, '1y'], [0, 'All']],
    range,
    v => { range = v || null; renderStats(); }
  ));

  /* ---- e1RM trend ---- */
  const trend = card('Estimated 1RM', entries.length + ' sessions');
  if (entries.length < 2) {
    trend.appendChild(emptyChart('Two sessions draw the first line'));
  } else {
    trend.appendChild(lineChart(
      entries.map(x => ({ t: x.startedAt, v: x.e1rm })),
      { color: 'var(--p-yellow)', unit: 'lb', height: 176, label: 'Estimated one-rep max, ' + e.name }
    ));
    trend.appendChild(noteEl('Epley estimate from your best working set each session. The ring marks your peak.'));
  }
  wrap.appendChild(trend);

  /* ---- heaviest weight trend ---- */
  if (entries.length >= 2) {
    const wt = card('Heaviest set');
    wt.appendChild(lineChart(
      entries.map(x => ({ t: x.startedAt, v: x.topWeight })),
      { color: 'var(--p-red)', unit: 'lb', height: 152, label: 'Heaviest set, ' + e.name }
    ));
    wrap.appendChild(wt);
  }

  /* ---- volume per session ---- */
  const volCard = card('Volume per session');
  volCard.appendChild(barChart(
    entries.slice(-12).map(x => ({ label: fmtDate(x.date).replace(/ /, ' '), v: x.volume })),
    { color: 'var(--p-blue)', height: 150, label: 'Volume per session, ' + e.name }
  ));
  wrap.appendChild(volCard);

  /* ---- personal bests ---- */
  const pb = card('Personal bests');
  [
    ['Estimated 1RM', Math.round(e.bestE1rm) + ' lb',
      e.bestE1rmSet ? e.bestE1rmSet.w + ' × ' + e.bestE1rmSet.r + ' on ' + fmtDateFull(e.bestE1rmDate) : ''],
    ['Heaviest weight', trimNum(e.bestWeight) + ' lb', fmtDateFull(e.bestWeightDate)],
    ['Best session volume', compact(e.bestVolume) + ' lb', fmtDateFull(e.bestVolumeDate)]
  ].forEach(([label, value, sub]) => {
    const row = el('div', 'pb-row');
    const body = el('div');
    body.appendChild(el('div', 'pb-lbl', label));
    body.appendChild(el('div', 'pb-sub', sub));
    row.appendChild(body);
    row.appendChild(el('div', 'pb-val num', value));
    pb.appendChild(row);
  });
  wrap.appendChild(pb);

  /* ---- session list ---- */
  const hist = card('Every session', e.entries.length + ' logged');
  e.entries.slice().reverse().slice(0, 30).forEach(x => {
    const row = el('div', 'sess-row');
    const body = el('div');
    body.appendChild(el('div', 'sess-date', fmtDateFull(x.date)));
    body.appendChild(el('div', 'sess-sub num',
      x.sets + ' sets · ' + x.reps + ' reps · ' + compact(x.volume) + ' lb'));
    row.appendChild(body);
    const right = el('div', 'sess-right');
    right.appendChild(el('div', 'sess-e1 num', String(x.e1rm)));
    right.appendChild(el('div', 'sess-e1lbl', 'e1RM'));
    row.appendChild(right);
    if (x.date === e.bestE1rmDate) row.classList.add('is-pr');
    hist.appendChild(row);
  });
  if (e.entries.length > 30) hist.appendChild(noteEl('Showing the 30 most recent.'));
  wrap.appendChild(hist);

  return wrap;
}

function filterEntries(entries, days) {
  if (!days) return entries;
  const since = Date.now() - days * 864e5;
  const out = entries.filter(x => x.startedAt >= since);
  // Never show an empty chart just because the range is tight.
  return out.length >= 2 ? out : entries.slice(-8);
}
