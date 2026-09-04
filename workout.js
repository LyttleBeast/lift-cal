import { GROUPS, GROUP_ORDER } from './exercises.js';
import { read, write, watch, LS, todayKey, monthKey } from './store.js';
import {
  $, el, sheet, toast, noteEl, confirmSheet, swipeToDelete,
  fmtDate, fmtDateFull, fmtDuration, compact, parseKey, clamp, setNum, LIMITS
} from './ui.js';
import {
  allSessions, invalidate, detectPRs, sessionMilestones, isWorking, groupColor
} from './analytics.js';
// One-way dependency: this file imports stats.js, stats.js never imports back.
import { openStats, isStatsOpen, renderStats, refresh as refreshStats } from './stats.js';
// The exercise library and its two sheets live in picker.js so routines.js can
// use them without importing this file back.
import { initPicker, allExercises, openPicker, openExerciseManager } from './picker.js';
import { initRoutines, openRoutines, saveSessionAsRoutine } from './routines.js';
import { bump } from './usage.js';

let monthCache = {};        // 'YYYY-MM' -> { 'DD': { sessionId: record } }
let viewMonth  = new Date();
let history    = {};        // exId -> [{date, sets}]
let session    = null;      // active workout (or a past one being edited)
let summary    = null;      // post-workout recap, shown once after finishing
let restEnd    = null;
let restTotal  = 0;
let wakeLock   = null;
let tickHandle = null;
let peek       = false;     // live session parked out of sight, calendar on top
let weekLoading = false;    // renderWeekVolume is fetching a month it found missing

export { allExercises } from './picker.js';

/* ================= INIT ================= */
export async function initWorkout() {
  await initPicker();
  await initRoutines();
  history  = (await read('history', null)) || {};

  const saved = LS.get('activeSession', null);
  if (saved) session = saved;

  await loadMonth(monthKey(viewMonth));
  await weekMonths();
  render();
  startTick();
}

function startTick() {
  if (tickHandle) return;
  // Timestamp-driven, never a counter. iOS throttles background JS;
  // recomputing from Date.now() means the clock is right on resume.
  tickHandle = setInterval(() => {
    if (session && !session._edit) paintClock();
    if (restEnd) paintRest();
  }, 250);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (session && !session._edit) paintClock();
      if (restEnd) paintRest();
      requestWakeLock();
    }
  });
}

async function requestWakeLock() {
  if (!session || session._edit || !('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch {}
}
function releaseWakeLock() { try { wakeLock && wakeLock.release(); } catch {} wakeLock = null; }

/* ================= DATA ================= */
// Fills the cache for a month and nothing else. Split out of loadMonth because
// the live subscription below follows whatever loadMonth was last asked for,
// and the "last 7 days" card needs a second month in memory without stealing
// the watch from the month the calendar is actually showing.
async function fetchMonth(mk) {
  if (!monthCache[mk]) monthCache[mk] = (await read(`workouts/${mk}`, null)) || {};
  return monthCache[mk];
}

async function loadMonth(mk) {
  await fetchMonth(mk);
  watchMonth(mk);
  return monthCache[mk];
}

// The months the trailing seven days touch: two of them for the first six
// days of every month. The card used to sum only what happened to be cached,
// which on those days was the current month alone, so it undercounted and
// disagreed with You, which reads the whole tree.
function weekMonths() {
  const mks = [...new Set([monthKey(new Date(Date.now() - 7 * 864e5)), monthKey()])];
  return Promise.all(mks.map(fetchMonth));
}

// Keep the month on screen subscribed, so a session written straight to the
// database (an agent over REST, or this app on another device) shows up without
// a refresh — and, more importantly, so the whole-month writes below never
// overwrite it from a stale cache.
let unwatchMonth = null;
let watchedMk = null;
function watchMonth(mk) {
  if (watchedMk === mk) return;
  if (unwatchMonth) unwatchMonth();
  watchedMk = mk;
  unwatchMonth = watch(`workouts/${mk}`, val => {
    const next = val || {};
    if (JSON.stringify(next) === JSON.stringify(monthCache[mk] || {})) return;
    monthCache[mk] = next;
    invalidate();
    if (!session && !summary) render();
  });
}

// Whole-month write. Used whenever a session is edited, moved or deleted,
// because store.write() replaces a node rather than merging into it.
async function saveMonth(mk) {
  await write(`workouts/${mk}`, monthCache[mk] || {});
  invalidate();
}

// After an edit or delete the per-exercise "last time" index can be wrong, so
// it gets rebuilt from the log itself. Always correct, never incremental.
async function rebuildHistoryFromLog() {
  const sessions = await allSessions(true);
  const h = {};
  sessions.forEach(s => {
    (s.exercises || []).forEach(ex => {
      if (!ex.exId) return;
      const sets = (ex.sets || []).filter(isWorking).map(x => ({ w: x.w, r: x.r, type: x.type }));
      if (!sets.length) return;
      (h[ex.exId] = h[ex.exId] || []).push({ date: s._date, sets, _t: s.startedAt });
    });
  });
  Object.keys(h).forEach(k => {
    h[k].sort((a, b) => b._t - a._t);
    h[k] = h[k].slice(0, 20).map(({ date, sets }) => ({ date, sets }));
  });
  history = h;
  await write('history', history);
}

/* ================= RENDER ROOT ================= */
export function render() {
  const root = $('#view-workout');
  if (!root) return;
  paintPeekBar();
  if (summary)              { root.innerHTML = ''; root.appendChild(renderSummary()); return; }
  if (session && !peek)     { root.innerHTML = ''; root.appendChild(renderSession()); return; }
  if (isStatsOpen())        { renderStats(); return; }
  root.innerHTML = '';
  root.appendChild(renderCalendar());
}

/* ================= PEEK ================= */
// A workout in progress used to own the Train tab outright — the calendar was
// unreachable until you finished or discarded. Peeking parks the session
// (nothing is lost; it's still in memory and in localStorage) and puts the
// calendar back, with a bar pinned above the dock to climb back in.
export function setPeek(on) {
  if (!session || session._edit) return;
  peek = !!on;
  if (!peek) {
    const dock = document.getElementById('dock');
    const btn = dock && dock.querySelector('button[data-view="workout"]');
    if (btn && !btn.classList.contains('active')) btn.click();
  }
  render();
}

function paintPeekBar() {
  const want = !!session && !session._edit && peek && !summary;
  let bar = document.getElementById('peekBar');
  document.body.classList.toggle('peeking', want);
  if (!want) { bar && bar.remove(); return; }
  if (!bar) {
    bar = el('div', 'peek-bar');
    bar.id = 'peekBar';
    const lt = el('div', 'peek-left');
    lt.appendChild(el('div', 'peek-name', ''));
    const cl = el('div', 'timer num', '0:00');
    cl.id = 'peekClock';
    lt.appendChild(cl);
    bar.appendChild(lt);
    const back = el('button', 'btn btn-primary', 'Resume');
    back.onclick = () => setPeek(false);
    bar.appendChild(back);
    document.body.appendChild(bar);
  }
  bar.querySelector('.peek-name').textContent = session.name || 'Workout';
  paintClock();
}

/* ================= CALENDAR ================= */
function renderCalendar() {
  const wrap = el('div', 'screen-pad');
  const mk   = monthKey(viewMonth);
  const days = monthCache[mk] || {};

  // header
  const hd = el('div', 'cal-hd');
  const left = el('div');
  left.appendChild(el('div', 'eyebrow', 'Training log'));
  const h = el('h1', null, viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  left.appendChild(h);
  hd.appendChild(left);

  const nav = el('div', 'cal-nav');
  const prev = el('button', null, '‹'); prev.setAttribute('aria-label', 'Previous month');
  const next = el('button', null, '›'); next.setAttribute('aria-label', 'Next month');
  prev.onclick = async () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1); await loadMonth(monthKey(viewMonth)); render(); };
  next.onclick = async () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1); await loadMonth(monthKey(viewMonth)); render(); };
  nav.append(prev, next);
  hd.appendChild(nav);
  wrap.appendChild(hd);

  // day-of-week strip
  const dow = el('div', 'cal-dow');
  ['S','M','T','W','T','F','S'].forEach(d => dow.appendChild(el('span', null, d)));
  wrap.appendChild(dow);

  // grid
  const grid = el('div', 'cal-grid');
  const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysIn   = new Date(y, m + 1, 0).getDate();
  const tk = todayKey();

  for (let i = 0; i < firstDow; i++) grid.appendChild(el('div', 'cal-day pad'));

  for (let d = 1; d <= daysIn; d++) {
    const dd  = String(d).padStart(2, '0');
    const key = `${mk}-${dd}`;
    const list = days[dd] ? Object.values(days[dd]) : [];
    const cell = el('button', 'cal-day' + (list.length ? ' has-work' : ' empty') + (key === tk ? ' today' : ''));

    cell.appendChild(el('div', 'cal-daynum', String(d)));

    if (list.length) {
      const groups = [...new Set(list.flatMap(w => w.groups || []))]
        .sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
      const plates = el('div', 'cal-plates');
      groups.slice(0, 4).forEach((g, i) => {
        const p = el('i');
        p.style.background = (GROUPS[g] || {}).color || 'var(--dim)';
        p.style.animationDelay = (i * 40) + 'ms';
        plates.appendChild(p);
      });
      cell.appendChild(plates);
      cell.setAttribute('aria-label', `${d} — ${groups.map(g => GROUPS[g].label).join(', ')}`);
      cell.onclick = () => openDay(mk, dd);
    } else {
      cell.setAttribute('aria-label', `${d} — no training`);
      cell.onclick = () => {};
    }
    grid.appendChild(cell);
  }
  wrap.appendChild(grid);

  // legend
  const leg = el('div', 'cal-legend');
  GROUP_ORDER.forEach(g => {
    const it = el('div', 'cal-legend-item');
    const sw = el('i');
    sw.style.background = GROUPS[g].color;
    it.append(sw, document.createTextNode(GROUPS[g].label));
    leg.appendChild(it);
  });
  wrap.appendChild(leg);

  wrap.appendChild(renderMonthStats(days));
  wrap.appendChild(renderWeekVolume());

  // While a session is parked the Resume bar above the dock is the way back in,
  // so a second button saying the same thing would just be noise.
  if (!(hasActiveSession() && peek)) {
    const start = el('button', 'btn btn-primary btn-block btn-lg', 'Start workout');
    start.onclick = () => startWorkout();
    wrap.appendChild(start);

    // Routines pass startWorkout in as a callback — routines.js never imports
    // this file, so the dependency stays one-way.
    const rt = el('button', 'btn btn-ghost btn-block btn-lg', 'Routines');
    rt.style.marginTop = '10px';
    rt.onclick = () => openRoutines(preset => startWorkout(preset));
    wrap.appendChild(rt);
  }

  // The library itself — what exists, what it is called, what should not be
  // in the picker at all. Deliberately not Statistics: nothing here is about
  // how much you lifted.
  const exBtn = el('button', 'btn btn-ghost btn-block btn-lg', 'Exercises');
  exBtn.style.marginTop = '10px';
  exBtn.onclick = () => openExerciseManager(() => render());
  wrap.appendChild(exBtn);

  const stats = el('button', 'btn btn-ghost btn-block btn-lg', 'Statistics');
  stats.style.marginTop = '10px';
  stats.onclick = async () => {
    toast('Crunching your history…');
    await openStats(() => { render(); });
  };
  wrap.appendChild(stats);

  return wrap;
}

function renderMonthStats(days) {
  const all = Object.values(days).flatMap(d => Object.values(d));
  const sessions = all.length;
  const vol = all.reduce((s, w) => s + (w.volume || 0), 0);
  const mins = Math.round(all.reduce((s, w) => s + (w.durationSec || 0), 0) / 60);

  const row = el('div', 'stat-row');
  [[sessions, 'Sessions'], [vol >= 1000 ? (vol / 1000).toFixed(1) + 'k' : vol, 'Volume lb'], [mins, 'Minutes']]
    .forEach(([v, l]) => {
      const s = el('div', 'stat');
      s.appendChild(el('div', 'stat-val num', String(v)));
      s.appendChild(el('div', 'stat-lbl', l));
      row.appendChild(s);
    });
  const card = el('div');
  card.appendChild(row);
  card.style.marginBottom = '14px';
  return card;
}

function renderWeekVolume() {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Last 7 days — working sets'));
  card.appendChild(hd);

  const since = Date.now() - 7 * 864e5;

  // initWorkout fetched both months, but a phone keeps this tab alive for
  // days, so the window can cross into a month nobody has fetched yet. Fetch
  // it and repaint once; fetchMonth leaves an empty month as {}, so a month
  // with no training cannot trigger this twice.
  const missing = [...new Set([monthKey(new Date(since)), monthKey()])].filter(mk => !monthCache[mk]);
  if (missing.length && !weekLoading) {
    weekLoading = true;
    Promise.all(missing.map(fetchMonth))
      .then(() => { weekLoading = false; if (!session && !summary && !isStatsOpen()) render(); })
      .catch(() => { weekLoading = false; });
  }

  const counts = {};
  Object.values(monthCache).forEach(month => {
    Object.values(month).forEach(day => {
      Object.values(day).forEach(w => {
        if ((w.startedAt || 0) < since) return;
        (w.exercises || []).forEach(ex => {
          const working = (ex.sets || []).filter(s => s.done && s.type !== 'W').length;
          if (!working) return;
          counts[ex.group] = (counts[ex.group] || 0) + working;
        });
      });
    });
  });

  const max = Math.max(1, ...Object.values(counts));
  let any = false;
  GROUP_ORDER.forEach(g => {
    const n = counts[g] || 0;
    if (!n) return;
    any = true;
    const row = el('div', 'vol-row');
    row.appendChild(el('div', 'vol-name', GROUPS[g].label));
    const track = el('div', 'vol-track');
    const fill = el('div', 'vol-fill');
    fill.style.width = (n / max * 100) + '%';
    fill.style.background = GROUPS[g].color;
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('div', 'vol-val num', String(n)));
    card.appendChild(row);
  });

  if (!any) card.appendChild(noteEl('No sets logged this week yet.'));
  return card;
}

/* ================= DAY SHEET ================= */
// Now an editing surface: rename, edit, or delete any session on the day.
function openDay(mk, dd) {
  const dateKey = `${mk}-${dd}`;
  const dayObj = (monthCache[mk] || {})[dd] || {};
  const list = Object.values(dayObj);
  if (!list.length) return;

  const { sh, close } = sheet();

  sh.appendChild(el('div', 'eyebrow', parseKey(dateKey).toLocaleDateString('en-US', { weekday: 'long' })));
  sh.appendChild(el('h2', null, parseKey(dateKey).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })));

  list.sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0)).forEach(w => {
    const c = el('div', 'card');
    c.style.marginTop = '12px';

    const hd = el('div', 'card-hd');
    hd.appendChild(el('div', 'day-title', w.name || 'Workout'));
    hd.appendChild(el('div', 'eyebrow',
      fmtDuration(w.durationSec) + ' · ' + (w.volume || 0).toLocaleString() + ' lb'));
    c.appendChild(hd);

    (w.exercises || []).forEach(ex => {
      const r = el('div', 'day-ex');
      const tag = el('i', 'day-ex-tag');
      tag.style.background = groupColor(ex.group);
      const body = el('div', 'day-ex-body');
      body.appendChild(el('div', 'day-ex-name', ex.name));
      const sets = (ex.sets || []).filter(s => s.done !== false)
        .map(s => `${s.w || 0}×${s.r || 0}${s.type !== 'N' ? s.type : ''}`).join('   ');
      body.appendChild(el('div', 'day-ex-sets num', sets));
      r.append(tag, body);
      c.appendChild(r);
    });

    const acts = el('div', 'day-actions');
    const edit = el('button', 'btn btn-ghost', 'Edit');
    edit.onclick = () => {
      // Editing reuses the session slot, and there's a live one parked.
      if (hasActiveSession()) { toast('Finish your workout first'); return; }
      close();
      editWorkout(w, mk, dd);
    };
    const del = el('button', 'btn btn-danger', 'Delete');
    del.onclick = () => {
      confirmSheet({
        title: 'Delete this workout?',
        body: `“${w.name || 'Workout'}” from ${fmtDateFull(dateKey)} will be removed from your log. This cannot be undone.`,
        confirmLabel: 'Delete workout',
        danger: true,
        onConfirm: async () => {
          delete monthCache[mk][dd][w.id];
          if (!Object.keys(monthCache[mk][dd]).length) delete monthCache[mk][dd];
          await saveMonth(mk);
          await rebuildHistoryFromLog();
          close();
          toast('Workout deleted');
          render();
        }
      });
    };
    acts.append(edit, del);
    c.appendChild(acts);

    sh.appendChild(c);
  });

  const btn = el('button', 'btn btn-ghost btn-block', 'Close');
  btn.style.marginTop = '12px';
  btn.onclick = close;
  sh.appendChild(btn);
}

/* ================= SESSION ================= */
function startWorkout(preset) {
  session = {
    id: 'w' + Date.now().toString(36),
    name: (preset && preset.name) || defaultName(),
    startedAt: Date.now(),
    exercises: (preset && preset.exercises) || []
  };
  bump('workoutStart');
  persistSession();
  requestWakeLock();
  render();
}

// Reopen a finished session for editing. Sets are marked done because a saved
// record only ever contains completed sets.
function editWorkout(record, mk, dd) {
  session = {
    id: record.id,
    name: record.name || 'Workout',
    startedAt: record.startedAt,
    exercises: (record.exercises || []).map(ex => ({
      exId: ex.exId, name: ex.name, group: ex.group, equipment: ex.equipment,
      sets: (ex.sets || []).map(s => ({ w: s.w, r: s.r, type: s.type || 'N', done: true }))
    })),
    _edit: {
      mk, dd,
      dateKey: `${mk}-${dd}`,
      endedAt: record.endedAt || record.startedAt,
      durationSec: record.durationSec || 0
    }
  };
  // Deliberately NOT persisted to fit:activeSession — an edit in progress
  // should not be mistaken for a live workout after a refresh.
  render();
}

function defaultName() {
  const h = new Date().getHours();
  if (h < 11) return 'Morning session';
  if (h < 16) return 'Afternoon session';
  return 'Evening session';
}

function persistSession() {
  if (session && session._edit) return;
  LS.set('activeSession', session);
}

function renderSession() {
  const editing = !!session._edit;
  const wrap = el('div');

  // sticky bar
  const bar = el('div', 'wk-bar');
  const lt = el('div', 'wk-bar-left');
  const nameIn = el('input', 'wk-name');
  nameIn.value = session.name;
  nameIn.oninput = e => { session.name = e.target.value; persistSession(); };
  lt.appendChild(nameIn);

  if (editing) {
    lt.appendChild(el('div', 'timer num', fmtDateFull(session._edit.dateKey) + ' · ' + fmtDuration(session._edit.durationSec)));
  } else {
    const clock = el('div', 'timer num', '0:00');
    clock.id = 'wkClock';
    lt.appendChild(clock);
  }
  bar.appendChild(lt);

  if (!editing) {
    const cal = el('button', 'wk-cal-btn');
    cal.setAttribute('aria-label', 'Look at the calendar');
    cal.title = 'Calendar';
    cal.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
    cal.onclick = () => setPeek(true);
    bar.appendChild(cal);
  }

  const fin = el('button', 'btn btn-primary', editing ? 'Save' : 'Finish');
  fin.onclick = editing ? saveEdit : finishWorkout;
  bar.appendChild(fin);
  wrap.appendChild(bar);

  const body = el('div', 'screen-pad');

  if (editing) body.appendChild(renderEditMeta());

  if (!session.exercises.length) {
    const es = el('div', 'empty-state');
    es.appendChild(el('h3', null, editing ? 'No exercises left' : 'Empty session'));
    es.appendChild(el('p', null, editing
      ? 'Add one back, or delete the workout from the calendar.'
      : 'Add your first exercise to start logging sets.'));
    body.appendChild(es);
  }

  session.exercises.forEach((ex, i) => body.appendChild(renderExercise(ex, i)));

  const add = el('button', 'btn btn-ghost btn-block', '+  Add exercise');
  add.onclick = () => openPicker(chosen => {
    chosen.forEach(x => session.exercises.push({
      exId: x.id, name: x.name, group: x.group, equipment: x.equipment,
      sets: [{ w: '', r: '', type: 'N', done: editing }]
    }));
    persistSession(); render();
  });
  body.appendChild(add);

  const cancel = el('button', 'btn btn-danger btn-block', editing ? 'Cancel editing' : 'Discard workout');
  cancel.style.marginTop = '10px';
  cancel.onclick = () => {
    if (editing) { session = null; render(); return; }
    confirmSheet({
      title: 'Discard this workout?',
      body: 'Nothing will be saved.',
      confirmLabel: 'Discard',
      danger: true,
      onConfirm: () => {
        session = null; peek = false; LS.del('activeSession'); releaseWakeLock(); clearRest(); render();
      }
    });
  };
  body.appendChild(cancel);

  wrap.appendChild(body);
  if (!editing) setTimeout(paintClock, 0);
  return wrap;
}

// Date + duration editor, shown only when reworking a past session.
function renderEditMeta() {
  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Editing a past workout'));
  card.appendChild(hd);

  const grid = el('div', 'row-split');

  const dWrap = el('div', 'field');
  dWrap.appendChild(el('label', null, 'Date'));
  const dIn = el('input');
  dIn.type = 'date';
  dIn.value = session._edit.dateKey;
  dIn.onchange = e => {
    const v = e.target.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { e.target.value = session._edit.dateKey; return; }
    session._edit.newDateKey = v;
  };
  dWrap.appendChild(dIn);

  const tWrap = el('div', 'field');
  tWrap.appendChild(el('label', null, 'Duration (min)'));
  const tIn = el('input');
  tIn.type = 'number'; tIn.inputMode = 'numeric';
  tIn.value = Math.round((session._edit.durationSec || 0) / 60);
  tIn.onchange = e => {
    const m = clamp(parseInt(e.target.value) || 0, LIMITS.durMin);
    session._edit.durationSec = m * 60;
    e.target.value = m;
  };
  tWrap.appendChild(tIn);

  grid.append(dWrap, tWrap);
  card.appendChild(grid);
  card.appendChild(noteEl('Changing the date moves this workout to a different day on the calendar.'));
  return card;
}

function renderExercise(ex, exIdx) {
  const block = el('div', 'ex-block');
  const color = (GROUPS[ex.group] || {}).color || 'var(--dim)';

  const hd = el('div', 'ex-hd');
  const tag = el('i', 'ex-tag'); tag.style.background = color;
  hd.appendChild(tag);
  hd.appendChild(el('div', 'ex-name', ex.name));
  const menu = el('button', 'ex-menu', '⋯');
  menu.setAttribute('aria-label', 'Remove ' + ex.name);
  menu.onclick = () => {
    confirmSheet({
      title: 'Remove ' + ex.name + '?',
      body: 'It will be taken out of this workout along with its sets.',
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: () => { session.exercises.splice(exIdx, 1); persistSession(); render(); }
    });
  };
  hd.appendChild(menu);
  block.appendChild(hd);

  // previous performance — the single most useful thing on the screen
  const prev = (history[ex.exId] || []).find(h => !session._edit || h.date !== session._edit.dateKey);
  if (prev) {
    const txt = prev.sets.map(s => `${s.w}×${s.r}`).join('  ');
    block.appendChild(el('div', 'ex-prev', `Last · ${fmtDate(prev.date)}   ${txt}`));
  } else {
    block.appendChild(el('div', 'ex-prev', 'No previous record'));
  }

  const shd = el('div', 'set-hd');
  ['Set', 'lb', 'Reps', 'e1RM', ''].forEach(t => shd.appendChild(el('span', null, t)));
  block.appendChild(shd);

  ex.sets.forEach((s, i) => block.appendChild(renderSet(ex, exIdx, s, i)));

  if (ex.sets.length) block.appendChild(el('div', 'swipe-hint', 'Swipe a set left to delete it'));

  // plate math for the heaviest entered load
  const heaviest = Math.max(0, ...ex.sets.map(s => parseFloat(s.w) || 0));
  if (heaviest >= 45 && ex.equipment === 'barbell') block.appendChild(renderPlates(heaviest));

  const acts = el('div', 'ex-actions');
  const addSet = el('button', 'btn btn-ghost', '+ Set');
  addSet.onclick = () => {
    const last = ex.sets[ex.sets.length - 1] || {};
    ex.sets.push({ w: last.w || '', r: last.r || '', type: 'N', done: !!session._edit });
    persistSession(); render();
  };
  acts.appendChild(addSet);
  block.appendChild(acts);

  return block;
}

function renderSet(ex, exIdx, s, i) {
  const row = el('div', 'set-row' + (s.done ? ' done' : ''));

  // set type cycles N → W → F → D
  const idx = el('button', 'set-idx t-' + s.type, s.type === 'N' ? String(i + 1) : s.type);
  idx.title = 'Tap to cycle: normal, warm-up, failure, drop set';
  idx.onclick = () => {
    const order = ['N', 'W', 'F', 'D'];
    s.type = order[(order.indexOf(s.type) + 1) % 4];
    persistSession(); render();
  };
  row.appendChild(idx);

  // A set carried in from a routine shows its target greyed out. Filling the
  // box in would be a number you forgot to change reading as a number you lifted.
  const w = el('input'); w.type = 'number'; w.inputMode = 'decimal';
  w.placeholder = s.tw ? String(s.tw) : '–';
  w.value = s.w; w.onchange = e => { s.w = setNum(e.target.value, LIMITS.setW); persistSession(); render(); };
  row.appendChild(w);

  const r = el('input'); r.type = 'number'; r.inputMode = 'numeric';
  r.placeholder = s.tr ? String(s.tr) : '–';
  r.value = s.r; r.onchange = e => { s.r = setNum(e.target.value, LIMITS.reps, true); persistSession(); render(); };
  row.appendChild(r);

  const e1 = e1rm(s.w, s.r);
  row.appendChild(el('div', 'set-e1rm num', s.type === 'W' || !e1 ? '' : String(e1)));

  const chk = el('button', 'set-check' + (s.done ? ' on' : ''), s.done ? '✓' : '');
  chk.setAttribute('aria-label', s.done ? 'Mark set incomplete' : 'Mark set complete');
  chk.onclick = () => {
    s.done = !s.done;
    if (s.done) bump('setLogged');
    persistSession();
    const wasDone = s.done;
    render();
    if (wasDone && !session._edit) {
      startRest();
      const block = document.querySelectorAll('.ex-block')[exIdx];
      const target = block && block.querySelectorAll('.set-row')[i];
      if (target) { target.classList.add('flash'); setTimeout(() => target.classList.remove('flash'), 600); }
    }
  };
  row.appendChild(chk);

  // Drag the row left to reveal a delete action. Solves overshooting when you
  // add sets before knowing how many you'll actually do.
  return swipeToDelete(row, {
    label: 'Delete',
    onDelete: () => { ex.sets.splice(i, 1); persistSession(); render(); }
  });
}

/* ---------- plate math ---------- */
const PLATES = [
  { w: 45, c: '#d6252b' }, { w: 35, c: '#2e7fd9' }, { w: 25, c: '#f0be1e' },
  { w: 10, c: '#2aa85c' }, { w: 5, c: '#e8e5de' }, { w: 2.5, c: '#a8aeb8' }
];

function renderPlates(total, barWeight = 45) {
  const strip = el('div', 'plate-strip');
  strip.appendChild(el('span', 'lbl', 'Per side'));
  let side = (total - barWeight) / 2;
  if (side <= 0) { strip.appendChild(el('span', 'lbl', 'bar only')); return strip; }
  PLATES.forEach(p => {
    let n = Math.floor(side / p.w);
    if (n <= 0) return;
    side = +(side - n * p.w).toFixed(2);
    const chip = el('span', 'plate-chip', `${n}×${p.w}`);
    chip.style.background = p.c;
    strip.appendChild(chip);
  });
  if (side > 0.01) strip.appendChild(el('span', 'lbl', `+${side} left over`));
  return strip;
}

/* ---------- math ---------- */
function e1rm(w, r) {
  const W = parseFloat(w), R = parseInt(r);
  if (!W || !R || R < 1) return 0;
  if (R === 1) return Math.round(W);
  return Math.round(W * (1 + R / 30)); // Epley
}

/* ---------- clock ---------- */
function paintClock() {
  if (!session) return;
  const targets = [document.getElementById('wkClock'), document.getElementById('peekClock')].filter(Boolean);
  if (!targets.length) return;
  const s = Math.floor((Date.now() - session.startedAt) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  const txt = h ? `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
                : `${m}:${String(ss).padStart(2,'0')}`;
  targets.forEach(c => c.textContent = txt);
}

/* ---------- rest timer ---------- */
function startRest(sec) {
  restTotal = sec || LS.get('restDefault', 150);
  restEnd = Date.now() + restTotal * 1000;
  paintRest();
}
function clearRest() {
  restEnd = null;
  document.getElementById('restLine')?.remove();
  document.getElementById('restPill')?.remove();
}
function paintRest() {
  if (!restEnd) return;
  const left = Math.round((restEnd - Date.now()) / 1000);

  let line = document.getElementById('restLine');
  if (!line) { line = el('div', 'rest-line'); line.id = 'restLine'; document.body.appendChild(line); }
  const pct = Math.max(0, Math.min(1, left / restTotal));
  line.style.width = (pct * 100) + '%';
  line.classList.toggle('over', left <= 0);

  let pill = document.getElementById('restPill');
  if (!pill) {
    pill = el('div', 'rest-pill'); pill.id = 'restPill';
    const t = el('span', 't'); t.id = 'restT';
    const plus = el('button', null, '+30');
    plus.onclick = () => { restEnd += 30000; restTotal += 30; paintRest(); };
    const skip = el('button', null, 'Skip');
    skip.onclick = clearRest;
    pill.append(t, plus, skip);
    document.body.appendChild(pill);
  }
  const mm = Math.floor(Math.abs(left) / 60), ssx = Math.abs(left) % 60;
  document.getElementById('restT').textContent = (left < 0 ? '+' : '') + `${mm}:${String(ssx).padStart(2,'0')}`;

  if (left === 0) beep();
  if (left < -60) clearRest();
}

let audioCtx;
function beep() {
  // iOS Safari has no Vibration API, so rest alerts are audio + the color flip.
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value = 760; o.type = 'sine';
    g.gain.setValueAtTime(.001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.25, audioCtx.currentTime + .02);
    g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + .4);
    o.start(); o.stop(audioCtx.currentTime + .4);
  } catch {}
}

/* ---------- collect ---------- */
// Keeps only sets that are marked done and carry reps. A blank weight is a
// bodyweight set — pull-ups, dips, planks — and this used to drop it, which
// took the whole exercise out of the record when every set was blank. It is
// kept as 0 lb: still a working set for the sets-by-muscle counts and the
// "last time" line, while 0 lb adds nothing to volume and e1rm() returns 0 for
// a zero load, so it can never surface as a record or a strongest lift.
function collectDone() {
  return session.exercises
    .map(ex => ({
      ...ex,
      // tw/tr are routine targets — live-session scaffolding, not part of the record.
      sets: ex.sets.filter(s => s.done && s.r !== '' && s.r != null)
                   .map(({ tw, tr, ...keep }) => ({ ...keep, w: keep.w === '' || keep.w == null ? '0' : keep.w }))
    }))
    .filter(ex => ex.sets.length);
}

function computeVolume(done) {
  return Math.round(done.reduce((s, ex) =>
    s + ex.sets.filter(isWorking).reduce((a, x) => a + (parseFloat(x.w) || 0) * (parseInt(x.r) || 0), 0), 0));
}

/* ---------- finish ---------- */
async function finishWorkout() {
  const done = collectDone();

  if (!done.length) {
    confirmSheet({
      title: 'No completed sets',
      body: 'There is nothing to save. Discard this workout?',
      confirmLabel: 'Discard',
      danger: true,
      onConfirm: () => {
        session = null; peek = false; LS.del('activeSession'); releaseWakeLock(); clearRest(); render();
      }
    });
    return;
  }

  const dateK = todayKey(new Date(session.startedAt));
  const mk    = dateK.slice(0, 7);
  const dd    = dateK.slice(8, 10);

  const record = {
    id: session.id,
    name: session.name,
    startedAt: session.startedAt,
    endedAt: Date.now(),
    durationSec: Math.round((Date.now() - session.startedAt) / 1000),
    volume: computeVolume(done),
    groups: [...new Set(done.map(e => e.group))],
    exercises: done
  };

  // Records are judged against everything logged BEFORE this session.
  let prs = [], firsts = [], milestones = [], priorSessions = [];
  try {
    const all = await allSessions();
    priorSessions = all.filter(s => s.startedAt < record.startedAt);
    const found = detectPRs(record, priorSessions);
    prs = found.prs; firsts = found.firsts;
    milestones = sessionMilestones(record, priorSessions);
  } catch {}

  await write(`workouts/${mk}/${dd}/${session.id}`, record);
  bump('workoutFinish');

  // update per-exercise history for the "last time" line
  done.forEach(ex => {
    const entry = { date: dateK, sets: ex.sets.filter(isWorking).map(s => ({ w: s.w, r: s.r, type: s.type })) };
    if (!entry.sets.length) return;
    history[ex.exId] = [entry, ...(history[ex.exId] || []).filter(h => h.date !== dateK)].slice(0, 20);
  });
  await write('history', history);

  monthCache[mk] = monthCache[mk] || {};
  monthCache[mk][dd] = monthCache[mk][dd] || {};
  monthCache[mk][dd][session.id] = record;
  invalidate();


  summary = { record, prs, firsts, milestones, prior: priorSessions };
  session = null;
  peek = false;
  LS.del('activeSession');
  releaseWakeLock();
  clearRest();
  render();
}

/* ---------- save an edit ---------- */
async function saveEdit() {
  const meta = session._edit;
  const done = collectDone();

  if (!done.length) {
    toast('Add at least one completed set, or delete the workout');
    return;
  }

  const oldMk = meta.mk, oldDd = meta.dd;
  let startedAt = session.startedAt;
  let dateK = meta.dateKey;

  if (meta.newDateKey && meta.newDateKey !== meta.dateKey) {
    dateK = meta.newDateKey;
    const old = new Date(session.startedAt);
    const [Y, M, D] = dateK.split('-').map(Number);
    startedAt = new Date(Y, M - 1, D, old.getHours(), old.getMinutes(), old.getSeconds()).getTime();
  }

  const mk = dateK.slice(0, 7), dd = dateK.slice(8, 10);

  const record = {
    id: session.id,
    name: session.name || 'Workout',
    startedAt,
    endedAt: startedAt + (meta.durationSec || 0) * 1000,
    durationSec: meta.durationSec || 0,
    volume: computeVolume(done),
    groups: [...new Set(done.map(e => e.group))],
    exercises: done
  };

  // remove from the old slot
  if (monthCache[oldMk] && monthCache[oldMk][oldDd]) {
    delete monthCache[oldMk][oldDd][session.id];
    if (!Object.keys(monthCache[oldMk][oldDd]).length) delete monthCache[oldMk][oldDd];
  }
  // write into the new slot
  await loadMonth(mk);
  monthCache[mk] = monthCache[mk] || {};
  monthCache[mk][dd] = monthCache[mk][dd] || {};
  monthCache[mk][dd][record.id] = record;

  await saveMonth(oldMk);
  if (mk !== oldMk) await saveMonth(mk);

  await rebuildHistoryFromLog();
  session = null;
  toast('Workout updated');
  render();
}


/* ================= POST-WORKOUT SUMMARY ================= */
function renderSummary() {
  const { record, prs, firsts, milestones, prior } = summary;
  const wrap = el('div', 'screen-pad summary-page');

  const hero = el('div', 'summary-hero');
  hero.appendChild(el('div', 'eyebrow', 'Session complete'));
  hero.appendChild(el('h1', null, record.name || 'Workout'));
  hero.appendChild(el('div', 'summary-date', fmtDateFull(todayKey(new Date(record.startedAt)))));
  wrap.appendChild(hero);

  const workingSets = record.exercises.reduce((a, ex) => a + ex.sets.filter(isWorking).length, 0);
  const totalReps = record.exercises.reduce((a, ex) =>
    a + ex.sets.filter(isWorking).reduce((b, s) => b + (parseInt(s.r) || 0), 0), 0);

  const row = el('div', 'stat-row');
  [[fmtDuration(record.durationSec), 'Duration'],
   [compact(record.volume), 'Volume lb'],
   [workingSets, 'Working sets']].forEach(([v, l]) => {
    const s = el('div', 'stat');
    s.appendChild(el('div', 'stat-val num', String(v)));
    s.appendChild(el('div', 'stat-lbl', l));
    row.appendChild(s);
  });
  wrap.appendChild(row);

  /* ---- PRs ---- */
  if (prs.length) {
    const card = el('div', 'card pr-card');
    const hd = el('div', 'card-hd');
    hd.appendChild(el('div', 'eyebrow', prs.length === 1 ? 'New personal record' : prs.length + ' new personal records'));
    card.appendChild(hd);
    prs.forEach(p => {
      const r = el('div', 'pr-hit');
      const tag = el('i', 'pr-tag');
      tag.style.background = groupColor(p.group);
      r.appendChild(tag);
      const body = el('div', 'pr-body');
      body.appendChild(el('div', 'pr-name', p.name));
      body.appendChild(el('div', 'pr-sub',
        (p.kind === 'e1rm' ? 'Estimated 1RM' : p.kind === 'weight' ? 'Heaviest ever' : 'Best session volume') +
        (p.detail ? '  ·  ' + p.detail : '') +
        (p.prev ? '  ·  previous ' + Math.round(p.prev) : '')));
      r.appendChild(body);
      const right = el('div', 'pr-right');
      right.appendChild(el('div', 'pr-val num', Math.round(p.value) + ''));
      right.appendChild(el('div', 'pr-delta num', '+' + Math.round(p.delta)));
      r.appendChild(right);
      card.appendChild(r);
    });
    wrap.appendChild(card);
  }

  /* ---- session milestones ---- */
  if (milestones.length) {
    const card = el('div', 'card');
    const hd = el('div', 'card-hd');
    hd.appendChild(el('div', 'eyebrow', 'Session milestones'));
    card.appendChild(hd);
    milestones.forEach(m => {
      const r = el('div', 'pb-row');
      const body = el('div');
      body.appendChild(el('div', 'pb-lbl', m.label));
      body.appendChild(el('div', 'pb-sub', 'previous best ' + m.prev));
      r.appendChild(body);
      r.appendChild(el('div', 'pb-val num', m.value));
      card.appendChild(r);
    });
    wrap.appendChild(card);
  }

  /* ---- first time ---- */
  if (firsts.length) {
    const card = el('div', 'card');
    const hd = el('div', 'card-hd');
    hd.appendChild(el('div', 'eyebrow', 'First time logged'));
    card.appendChild(hd);
    firsts.forEach(f => {
      const r = el('div', 'pb-row');
      const body = el('div');
      body.appendChild(el('div', 'pb-lbl', f.name));
      body.appendChild(el('div', 'pb-sub', 'baseline set — beat it next time'));
      r.appendChild(body);
      r.appendChild(el('div', 'pb-val num', f.set ? f.set.w + ' × ' + f.set.r : ''));
      card.appendChild(r);
    });
    wrap.appendChild(card);
  }

  /* ---- comparison ---- */
  const recent = prior.filter(s => s.startedAt > Date.now() - 28 * 864e5);
  if (recent.length >= 2) {
    const avg = recent.reduce((a, s) => a + (s.volume || 0), 0) / recent.length;
    const diff = record.volume - avg;
    const pct = avg ? Math.round(diff / avg * 100) : 0;
    const card = el('div', 'card');
    const hd = el('div', 'card-hd');
    hd.appendChild(el('div', 'eyebrow', 'Against your last 4 weeks'));
    card.appendChild(hd);
    const big = el('div', 'load-num num', (pct >= 0 ? '+' : '') + pct + '%');
    big.style.fontSize = '34px';
    big.style.color = pct >= 0 ? 'var(--good)' : 'var(--steel)';
    card.appendChild(big);
    card.appendChild(noteEl(
      compact(record.volume) + ' lb today against a ' + compact(Math.round(avg)) +
      ' lb average across ' + recent.length + ' sessions.'));
    wrap.appendChild(card);
  }

  /* ---- what you did ---- */
  const recap = el('div', 'card');
  const rhd = el('div', 'card-hd');
  rhd.appendChild(el('div', 'eyebrow', 'What you did'));
  rhd.appendChild(el('div', 'card-sub num', totalReps + ' reps'));
  recap.appendChild(rhd);
  record.exercises.forEach(ex => {
    const r = el('div', 'day-ex');
    const tag = el('i', 'day-ex-tag');
    tag.style.background = groupColor(ex.group);
    const body = el('div', 'day-ex-body');
    body.appendChild(el('div', 'day-ex-name', ex.name));
    body.appendChild(el('div', 'day-ex-sets num',
      ex.sets.map(s => `${s.w}×${s.r}${s.type !== 'N' ? s.type : ''}`).join('   ')));
    r.append(tag, body);
    recap.appendChild(r);
  });
  wrap.appendChild(recap);

  const done = el('button', 'btn btn-primary btn-block btn-lg', 'Done');
  done.onclick = () => { summary = null; render(); };
  wrap.appendChild(done);

  const asRt = el('button', 'btn btn-ghost btn-block', 'Save as routine');
  asRt.style.marginTop = '10px';
  asRt.onclick = () => saveSessionAsRoutine(record);
  wrap.appendChild(asRt);

  const toStats = el('button', 'btn btn-ghost btn-block', 'See statistics');
  toStats.style.marginTop = '10px';
  toStats.onclick = async () => {
    summary = null;
    await refreshStats();
    await openStats(() => { render(); });
  };
  wrap.appendChild(toStats);

  return wrap;
}

/* ================= EXPORTS ================= */
// Re-exported so older imports of `toast` from this module keep working.
export { toast } from './ui.js';
export function hasActiveSession() { return !!session && !session._edit; }
