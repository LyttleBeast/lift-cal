import { GROUPS, GROUP_ORDER } from './exercises.js';
// The pure block model, shared verbatim with the routine editor.
import {
  blockOrder, sessionBlocks, normalizeBlocks, addBlock, addToBlock,
  duplicateBlock, deleteBlock, sessionLayout
} from './blocks.js';
import { read, readExact, write, watch, LS, todayKey, monthKey, wu } from './store.js';
import {
  $, el, sheet, toast, noteEl, confirmSheet, swipeToDelete,
  fmtDate, fmtDateFull, fmtDuration, parseKey, clamp, setNum, LIMITS
} from './ui.js';
import {
  allSessions, invalidate, detectPRs, sessionMilestones, sessionComparison,
  sessionReps, isWorking, groupColor,
  mergeSessionExercises, prDetail
} from './analytics.js';
// One-way dependency: this file imports stats.js, stats.js never imports back.
import { openStats, isStatsOpen, renderStats, refresh as refreshStats } from './stats.js';
// The exercise library and its two sheets live in picker.js so routines.js can
// use them without importing this file back.
import { initPicker, allExercises, openPicker, openExerciseManager } from './picker.js';
import { initRoutines, openRoutines, saveSessionAsRoutine } from './routines.js';
import { coachCard } from './coach-ui.js';
import { initCoachData, coachLogReady, refreshCoachSessions } from './coach-data.js';
import { bump } from './usage.js';
import { wOut, wIn, fmtSetW, fmtSetLoad, fmtVol, volOut, unitW, limW } from './units.js';

// Volume is a sum of stored pounds, so it converts like a weight. Round to a
// whole number BEFORE the abbreviation, never after: "41.3k" is a string and
// there is no converting one of those.
const volDisp = v => Math.round(volOut(v || 0, wu()));

let monthCache = {};        // 'YYYY-MM' -> { 'DD': { sessionId: record } }
// The months this client has actually read from the database. monthCache alone
// cannot tell a month that came off the wire from one this file built locally
// out of a single session, and saveMonth() PUTs the WHOLE month — so without
// this mark a one-session synthesis gets written back as though it were the
// month, deleting every other day in it.
let hydrated   = new Set();
let viewMonth  = new Date();
let history    = {};        // exId -> [{date, sets}]
let session    = null;      // active workout (or a past one being edited)
let summary    = null;      // post-workout recap, shown once after finishing
let restEnd    = null;
let restTotal  = 0;
let wakeLock   = null;
let tickHandle = null;
let peek       = false;     // live session parked out of sight, calendar on top
// The first-workout coach mark. Several people never worked out that a set is
// completed by tapping its check box — one account added the exercise a second
// time instead of adding a set to it — so on a first workout the box says so
// itself. It remembers nothing anywhere: `coachNone` is read back off the
// training log, not stored, which is why it needs no flag under `onboarding`
// (whose published rules refuse an unrecognised key) and why the native port
// inherits the condition for free — both clients already load this history.
// `null` is "not looked yet" and only `true` shows the mark, so an answer that
// never arrives degrades to no hint rather than to a screen waiting on a read.
let coachNone   = null;
let coachTapped = false;

export { allExercises } from './picker.js';

/* ================= INIT ================= */
export async function initWorkout() {
  /* Train can be the tab the app opens on — a parked session always lands here
     — so this screen cannot assume You has already asked for Coach's snapshot.
     initCoachData() is idempotent, so whichever tab gets there first does the
     reads and the other one just waits for the same promise. The READS start
     here, before the first await, for the same reason they do in initYou():
     four awaited stages in front of them is how the card came to sit on a
     skeleton for three seconds. The repaint is attached further down, after
     this screen has drawn once — render() has nothing to draw until the month
     has loaded. */
  const coachLoaded = initCoachData();

  // Read once and handed on. picker.js needs the same node for the Frequent
  // chip's cold start and has no way to reach this file (the import only goes
  // one way), so reading it there as well meant every launch downloading the
  // whole index twice — store.js issues a fresh GET per call and does not
  // dedupe.
  history  = (await read('history', null)) || {};
  await initPicker(history);
  await initRoutines();

  const saved = LS.get('activeSession', null);
  if (saved) session = saved;

  await loadMonth(monthKey(viewMonth));
  render();
  coachLoaded.then(render).catch(() => {});
  // And once more the moment the LOG is known, which lands earlier than the
  // rest of the snapshot. This screen renders once and then only on a tap, so
  // without it the card's earlier readiness would never reach the paint.
  coachLogReady().then(render).catch(() => {});
  // Only for a workout restored mid-flight, and deliberately not awaited. The
  // calendar has no set row to mark, and this question costs a whole-tree read
  // that nobody who is not actually training should pay for.
  if (session) refreshCoachMark();
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
// The one hydrator. Nothing else may put a month into `hydrated`, because this
// is the only place that knows the value came from the database.
//
// Two things here are load-bearing. The early return tests `hydrated.has(mk)`
// as well as the cache: the old test was the cache alone, which is what made
// the bug permanent — finishWorkout built a cache for a month it had never
// read, and from then on every loadMonth saw a cache and returned it, so the
// month could never correct itself. And it reads through readExact() rather
// than read(): read() folds "the node isn't there" into "the node couldn't be
// reached", and a blank that came from a failed read is precisely the value
// that must not be trusted with a whole-month PUT.
async function loadMonth(mk) {
  if (monthCache[mk] && hydrated.has(mk)) { watchMonth(mk); return monthCache[mk]; }
  try {
    monthCache[mk] = (await readExact(`workouts/${mk}`)) || {};
    hydrated.add(mk);
  } catch {
    // Unreachable. Keep whatever is already on screen so the calendar still
    // renders, but do not mark it hydrated — a whole-month write built on this
    // would be a guess, and saveMonth refuses guesses.
    if (!monthCache[mk]) monthCache[mk] = (await read(`workouts/${mk}`, null)) || {};
  }
  watchMonth(mk);
  return monthCache[mk];
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
    // The subscription delivering IS a read from the database, so it hydrates
    // the month even when loadMonth could not. Above the equality check,
    // because what is being recorded is that the server answered at all, not
    // whether the answer differed from what is cached.
    hydrated.add(mk);
    const next = val || {};
    if (JSON.stringify(next) === JSON.stringify(monthCache[mk] || {})) return;
    monthCache[mk] = next;
    invalidate();
    if (!session && !summary) render();
  });
}

// Whole-month write. Used whenever a session is edited, moved or deleted,
// because store.write() replaces a node rather than merging into it.
//
// It refuses a month this client never read. Every caller below hydrates
// first, so the refusal is a backstop rather than a normal outcome — but
// failing closed is the only safe direction here, because the value it would
// otherwise send is `{}`, which RTDB stores as a delete of the whole node, and
// .validate is not evaluated for a delete. No rule on the server can catch
// this one; it has to be stopped here.
//
// On a refusal it also drops the cache, because by then the caller has already
// taken the session out of it and the in-memory copy is a lie. The next
// loadMonth re-reads.
async function saveMonth(mk) {
  if (!hydrated.has(mk)) {
    delete monthCache[mk];
    if (watchedMk === mk) {
      if (unwatchMonth) { try { unwatchMonth(); } catch {} unwatchMonth = null; }
      watchedMk = null;
    }
    refuseUnread(mk);
    throw new Error(`workouts/${mk} was never read on this device`);
  }
  await write(`workouts/${mk}`, monthCache[mk] || {});
  invalidate();
  // A session was edited, moved or deleted, and Coach's card is on this screen
  // quoting the log that just changed. Its snapshot is gathered once per app
  // open, so without this it keeps the old answer until the app is reopened.
  refreshCoachSessions().then(() => { if (!session && !summary) render(); }).catch(() => {});
}

function refuseUnread(mk) {
  toast(`Couldn’t load ${mk} — nothing was changed. Open that month online, then try again.`);
}

// Hydrate a month BEFORE its cache is mutated, so a refusal leaves nothing
// half-changed. Returns false, having said why, when the month cannot be read.
async function hydrateForWrite(mk) {
  if (!hydrated.has(mk)) await loadMonth(mk);
  if (hydrated.has(mk)) return true;
  refuseUnread(mk);
  return false;
}

// Returns true if the session was deleted, false if the write was refused —
// the caller must not claim success on false. The hydrate runs before a single
// key is removed: deleting the last session on a day drops the day key too,
// and on a month that was never read that empties the cache to `{}`, which is
// a delete of the entire month rather than an empty one.
async function deleteSession(mk, dd, id) {
  if (!monthCache[mk] || !monthCache[mk][dd]) return false;
  if (!(await hydrateForWrite(mk))) return false;
  if (!monthCache[mk] || !monthCache[mk][dd]) return false;   // the read may have moved it
  delete monthCache[mk][dd][id];
  if (!Object.keys(monthCache[mk][dd]).length) delete monthCache[mk][dd];
  await saveMonth(mk);
  await rebuildHistoryFromLog();
  return true;
}

// What one exercise's rows are, whatever shape the database hands back. RTDB
// returns an array as an object the moment its keys stop being contiguous from
// zero, and `history` is read straight off the wire — so a bare `.slice()` here
// throws inside finishWorkout, after the session has already been written to
// the log and before the live session is cleared, which would leave a saved
// workout on screen as though it were still in progress. Anything unreadable
// becomes no rows rather than an exception: history is derived, so the next
// edit or delete rebuilds it from the log in full.
function historyRows(v) {
  if (Array.isArray(v)) return v.slice();
  if (v && typeof v === 'object') return Object.values(v).filter(e => e && e.date);
  return [];
}

// The merge invariant, applied to the "last time" index: one entry per exId
// per DATE, that date's sets in session order. Both of this file's history
// writers fold through here, which is the entire reason it exists. They were
// two implementations of one rule and they disagreed about the same data —
// finishWorkout let each occurrence of an exId filter out the same-date entry
// the previous occurrence had just written, so only the last one survived,
// while rebuildHistoryFromLog pushed every occurrence and left one date on the
// index N times. Which answer "last time" gave you depended on whether the
// session had been edited since. The within-session half is
// mergeSessionExercises() from analytics.js, imported rather than restated: a
// second copy of the rule is precisely how the disagreement arose, and the
// native port copies that one function across rather than rewriting it.
//
// A second session on the same day extends that day's entry instead of
// replacing it, for the same reason a repeated block does — the work was
// really done, so only the duplicate row disappears, never any sets.
// Exported for the same reason computeVolume is: a bodyweight set has to reach
// the "last time" index like any other, and that is a claim a verifier should
// be able to make rather than a comment.
export function foldSessionIntoHistory(h, dateK, exercises) {
  const out = { ...h };
  mergeSessionExercises(exercises).forEach(ex => {
    if (!ex.exId) return;
    const sets = (ex.sets || []).filter(isWorking).map(s => ({ w: s.w, r: s.r, type: s.type }));
    if (!sets.length) return;
    const list = historyRows(out[ex.exId]);
    const at = list.findIndex(e => e.date === dateK);
    if (at === -1) list.push({ date: dateK, sets });
    else list[at] = { date: dateK, sets: list[at].sets.concat(sets) };
    out[ex.exId] = list;
  });
  return out;
}

// Newest first, 20 max — the shape AGENTS.md documents for history/{exId}.
// Ordering on the date rather than on startedAt is what lets both writers share
// this pass: one entry per date makes the two orderings the same, and the
// entries already on the index carry no timestamp to sort by. The rebuild feeds
// it sessions oldest first, so a day's own sets stay in session order inside
// the entry while the entries themselves come back newest first.
function trimHistory(h) {
  const out = {};
  Object.keys(h || {}).forEach(k => {
    const rows = historyRows(h[k])
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, 20)
      .map(({ date, sets }) => ({ date, sets }));
    if (rows.length) out[k] = rows;
  });
  return out;
}

// After an edit or delete the per-exercise "last time" index can be wrong, so
// it gets rebuilt from the log itself. Always correct, never incremental.
async function rebuildHistoryFromLog() {
  const sessions = await allSessions(true);
  let h = {};
  sessions.forEach(s => { h = foldSessionIntoHistory(h, s._date, s.exercises); });
  // Assigned after the write resolves, the same order runFinish uses. This one
  // is rebuilt from the log every time, so a stale `history` costs a wrong
  // "Last ·" line until the next edit rather than a wrong record — but module
  // state that claims a save the database refused is the thing being fixed,
  // and there is no version of it that is fine here and not there.
  const next = trimHistory(h);
  await write('history', next);
  history = next;
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

  /* Coach, directly above the primary button and in its tighter form — the You
     tab's card leads with a greeting and this one has no room for one, because
     what belongs here is the training answer and the button under it. Its
     height is fixed for exactly that reason: a card that grew by a line would
     push Start workout down under somebody's thumb.

     coach.js has already made sure this is not the finding the You card is
     showing, so opening one tab after the other reads as two things noticed
     rather than one thing said twice. */
  wrap.appendChild(coachCard({ tight: true, live: hasActiveSession() }));

  // While a session is parked the Resume bar above the dock is the way back in,
  // so a second button saying the same thing would just be noise.
  const parked = hasActiveSession() && peek;
  if (!parked) {
    const start = el('button', 'btn btn-primary btn-block btn-lg', 'Start workout');
    start.onclick = () => startWorkout();
    wrap.appendChild(start);
  }

  /* Routines and the library, side by side. Both are doors into a list rather
     than things you do, so they get half the width each and none of the weight
     of the primary button above them — the same .btn-split pair Fuel already
     uses for its two secondary actions. With a session parked, Routines is gone
     and Exercises fills the row on its own, which is what flex: 1 already does.

     Routines passes startWorkout in as a callback — routines.js never imports
     this file, so the dependency stays one-way. */
  const pair = el('div', 'btn-split');
  pair.style.marginTop = '10px';
  if (!parked) {
    const rt = el('button', 'btn btn-ghost', 'Routines');
    rt.onclick = () => openRoutines(preset => startWorkout(preset));
    pair.appendChild(rt);
  }
  // The library itself — what exists, what it is called, what should not be
  // in the picker at all. Deliberately not Statistics: nothing here is about
  // how much you lifted.
  const exBtn = el('button', 'btn btn-ghost', 'Exercises');
  exBtn.onclick = () => openExerciseManager(() => render());
  pair.appendChild(exBtn);
  wrap.appendChild(pair);

  // Full width and quieter than the pair above it. It is the least frequent
  // thing on this screen and the most expensive — it reads the whole history.
  const stats = el('button', 'btn btn-ghost btn-block', 'Statistics');
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
  const v = volDisp(vol);
  [[sessions, 'Sessions'], [v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v, 'Volume ' + unitW(wu())], [mins, 'Minutes']]
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
      fmtDuration(w.durationSec) + ' · ' + volDisp(w.volume || 0).toLocaleString() + ' ' + unitW(wu())));
    c.appendChild(hd);

    (w.exercises || []).forEach(ex => {
      const r = el('div', 'day-ex');
      const tag = el('i', 'day-ex-tag');
      tag.style.background = groupColor(ex.group);
      const body = el('div', 'day-ex-body');
      body.appendChild(el('div', 'day-ex-name', ex.name));
      const sets = (ex.sets || []).filter(s => s.done !== false)
        .map(s => `${fmtSetLoad(s.w || 0, wu())}×${s.r || 0}${s.type !== 'N' ? s.type : ''}`).join('   ');
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
          // deleteSession says no rather than erasing a month it never read,
          // and has already said why — so a refusal must not be reported as a
          // deletion that worked.
          const gone = await deleteSession(mk, dd, w.id).catch(() => false);
          close();
          if (gone) toast('Workout deleted');
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
// "Has this account finished a workout yet?", asked in the background and never
// awaited by a render: allSessions() goes to the network on a cold cache and the
// first paint of a live session must not wait on it. Once the answer is "there
// is history" it cannot go back on its own, so the question is asked at most
// until it answers that way — and it is asked as a workout starts rather than
// at boot, where finishWorkout would have had to pay for the same read anyway.
async function refreshCoachMark() {
  if (coachNone === false) return;
  let none;
  // Both sources, because neither alone can tell "nothing logged" from "the read
  // failed": allSessions() resolves [] rather than rejecting when read('workouts')
  // falls back, and an established account whose log was unreachable would
  // otherwise be taught how to complete a set. Any finished session leaves rows
  // on the per-exercise index, so requiring both to be empty puts the ambiguous
  // answer on the side of showing nothing — which is the direction the whole
  // feature is built to fail in.
  try {
    none = (await allSessions()).length === 0 && !Object.keys(history).length;
  } catch { return; }
  if (none === coachNone) return;
  const was = coachNone;
  coachNone = none;
  // Only `true` draws anything, so the usual answer — an established account
  // going from "not looked yet" to "there is history" — changes nothing on
  // screen and is not worth rebuilding a live session for.
  if (was !== true && none !== true) return;
  // A late answer repaints the session it belongs to — but never over a box
  // somebody is typing in, because a hint is not worth a half-entered weight.
  const typing = document.activeElement && document.activeElement.tagName === 'INPUT';
  if (session && !peek && !summary && !typing) render();
}

// Pure, and given everything it reads, so the native port copies the rule
// rather than rewriting it from the description. The mark belongs to the very
// first set row on screen and only while nothing at all has been ticked yet:
// tapping any check anywhere is the lesson landing, so there is nothing left to
// point at, and a relaunch mid-workout cannot restart it on a green box.
function showCoach(s, none, tapped) {
  return none === true && !tapped &&
    !(s.exercises || []).some(ex => (ex.sets || []).some(x => x.done));
}

// Which exercise carries it. Normally the first one, but an exercise whose only
// set has been swiped away renders no set row and no hint line, so anchoring on
// index 0 flatly would take the mark off the screen entirely while the lesson
// still has not landed. The array order is the order sessionLayout reads in, so
// the first exercise with a row is the first row on screen, block or not.
// Returns -1 when the session has no set rows at all, which matches no index.
function coachExIdx(s) {
  return ((s && s.exercises) || []).findIndex(ex => ex && (ex.sets || []).length);
}

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
  refreshCoachMark();
  render();
}

// Reopen a finished session for editing. Sets are marked done because a saved
// record only ever contains completed sets.
function editWorkout(record, mk, dd) {
  // The annotation on the exercises is the only trace a lifting block leaves in
  // the record, so the blocks are rebuilt from it here. collectDone already
  // renumbers 1..N on the way in, so this is normally the identity — it stays
  // because a record written by an older build, or by hand, is still allowed to
  // carry a gap, and a gap must not become "Block 2" sitting alone on screen.
  const grouped = normalizeBlocks(
    (record.exercises || []).map(ex => ({
      exId: ex.exId, name: ex.name, group: ex.group, equipment: ex.equipment,
      ...(ex.block ? { block: ex.block } : null),
      sets: (ex.sets || []).map(s => ({ w: s.w, r: s.r, type: s.type || 'N', done: true }))
    })),
    blockOrder(record.exercises)
  );
  session = {
    id: record.id,
    name: record.name || 'Workout',
    startedAt: record.startedAt,
    exercises: grouped.exercises,
    blocks: grouped.blocks,
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

/* ================= LIFTING BLOCKS =================
   The model itself — what a block is, how it is stored, and every pure
   operation on one — lives in blocks.js, because the routine editor draws the
   same containers from the same functions. Read the header there first.

   What is left here is the half that only a live workout has: the check box
   (it reads `done`), the container's DOM, and commitBlocks, which is the one
   impure step — it takes what the pure functions returned and puts it on the
   session. `session.blocks` rides along on the live session in localStorage
   only; collectDone builds the record from named keys, which is why an empty
   block simply vanishes at finish, which is what it should do. */

// The block check box, in three pure pieces.
//
// It only ever touches sets that are ready to be logged — which means reps, and
// reps alone. collectDone drops a set with a blank reps box, so ticking one
// would promise a set that never reaches the record, and the promise is the
// whole value of a check box. A blank WEIGHT is a bodyweight set and records
// fine, so requiring one here would leave the block box refusing to tick a
// perfectly good round of pull-ups. The test is collectDone's own test,
// character for character, so the two can never disagree about which sets
// those are.
function blockFillableSets(exercises, n) {
  const out = [];
  (exercises || []).forEach((ex, i) => {
    if (!ex || ex.block !== n) return;
    (ex.sets || []).forEach((s, j) => { if (s.r !== '') out.push([i, j]); });
  });
  return out;
}

// Ticked when there is something to tick and every bit of it is ticked. A block
// with nothing filled in yet is not ticked and is not tickable — the box is
// disabled rather than doing nothing, the same call the Duplicate button makes.
function blockTicked(exercises, n) {
  const at = blockFillableSets(exercises, n);
  return at.length > 0 && at.every(([i, j]) => !!exercises[i].sets[j].done);
}

// Ticking and unticking move the same rows, which is what makes the box a
// toggle rather than two different buttons wearing one face.
function setBlockDone(exercises, n, done) {
  const mark = new Set(blockFillableSets(exercises, n).map(([i, j]) => i + ':' + j));
  return (exercises || []).map((ex, i) => {
    if (!ex || ex.block !== n) return ex;
    return { ...ex, sets: (ex.sets || []).map((s, j) => mark.has(i + ':' + j) ? { ...s, done } : s) };
  });
}

// Only a block with something logged in it is worth interrupting for.
function blockHasLogged(exercises, n) {
  return (exercises || []).some(ex =>
    ex && ex.block === n && (ex.sets || []).some(x => x.done));
}


// The only impure one: takes what the functions above return and puts it on the
// session.
function commitBlocks(next) {
  session.exercises = next.exercises;
  session.blocks = next.blocks;
  persistSession();
  render();
}

// How a live session copies a set when its block is duplicated. This is the
// half of duplicateBlock that knows what a session's sets look like, which is
// why blocks.js takes it as an argument instead of holding it.
//
// `done` follows the mode rather than being flatly false, for the reason every
// other new set in this file does: collectDone keeps only sets marked done, so
// an unticked copy made while editing a past session would silently disappear
// on save. In a live workout `editing` is false and nothing is ticked, which is
// the case the feature is about. tw/tr are deliberately not carried: a repeat
// of a block is real work, not a plan for it.
function dupSet(editing) {
  return x => ({ w: x.w, r: x.r, type: x.type || 'N', done: !!editing });
}

// One shape for a new exercise, so one added inside a block is the same object
// as one added outside it and the annotation is the only difference.
function newExercise(x, editing) {
  return {
    exId: x.id, name: x.name, group: x.group, equipment: x.equipment,
    sets: [{ w: '', r: '', type: 'N', done: editing }]
  };
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

  // Renumbered on the way in as well as on every change, because the per-
  // exercise ⋯ menu can empty a block out and knows nothing about blocks.
  // normalizeBlocks is a fixed point, so on every other render this is a no-op.
  const laid = normalizeBlocks(session.exercises, sessionBlocks(session));
  session.exercises = laid.exercises;
  session.blocks = laid.blocks;
  const blocks = laid.blocks;

  // An empty block is something on screen, so the empty state would be a lie.
  if (!session.exercises.length && !blocks.length) {
    const es = el('div', 'empty-state');
    es.appendChild(el('h3', null, editing ? 'No exercises left' : 'Empty session'));
    es.appendChild(el('p', null, editing
      ? 'Add one back, or delete the workout from the calendar.'
      : 'Add your first exercise to start logging sets.'));
    body.appendChild(es);
  }

  sessionLayout(session.exercises, blocks).forEach(row => {
    if (row.kind === 'ex') {
      body.appendChild(renderExercise(session.exercises[row.index], row.index));
      return;
    }
    body.appendChild(renderBlock(row, editing));
  });

  // Half width each. An exercise added here is ungrouped and renders exactly as
  // it always has; a block is a box to put the repeated ones in.
  const addRow = el('div', 'add-row');
  const add = el('button', 'btn btn-ghost', '+  Add exercise');
  add.onclick = () => openPicker(chosen => {
    chosen.forEach(x => session.exercises.push(newExercise(x, editing)));
    persistSession(); render();
  });
  const addBlk = el('button', 'btn btn-ghost', '+  Add Lifting Block');
  addBlk.onclick = () => commitBlocks(addBlock(session));
  addRow.append(add, addBlk);
  body.appendChild(addRow);

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

// The container. Everything inside it is an ordinary exercise card — this
// function draws the box, the number and the two buttons, and nothing else.
function renderBlock(row, editing) {
  const n = row.block;
  const card = el('div', 'wk-block');

  const hd = el('div', 'wk-block-hd');
  hd.appendChild(el('div', 'wk-block-title', 'Block ' + n));

  const acts = el('div', 'wk-block-acts');

  // The block's own check box. This training style fills a whole block in and
  // then ticks it off, so ticking each row by hand is the one bit of friction
  // the container was supposed to remove. It reflects state rather than being a
  // button: if everything fillable is already ticked, it shows ticked, and
  // tapping it again unticks exactly the rows it ticked.
  const fillable = blockFillableSets(session.exercises, n);
  const ticked = blockTicked(session.exercises, n);
  const chk = el('button', 'set-check wk-block-chk' + (ticked ? ' on' : ''), ticked ? '\u2713' : '');
  chk.disabled = !fillable.length;
  chk.setAttribute('aria-label', ticked
    ? 'Mark Block ' + n + ' incomplete'
    : 'Complete every filled-in set in Block ' + n);
  chk.title = 'Tick every set in this block that has reps in it';
  chk.onclick = () => {
    const next = !ticked;
    // Count the sets this actually logs, not the ones that were already ticked.
    // No rest timer: a block has no round boundary for one to attach to, and
    // rest already fires per set exactly as it does outside a block.
    if (next) fillable.forEach(([i, j]) => { if (!session.exercises[i].sets[j].done) bump('setLogged'); });
    session.exercises = setBlockDone(session.exercises, n, next);
    persistSession();
    render();
  };
  acts.appendChild(chk);

  const dup = el('button', 'btn btn-ghost wk-block-btn', 'Duplicate');
  // There is nothing to repeat until the block holds an exercise, and a button
  // that quietly does nothing is worse than one that says it is not ready yet.
  dup.disabled = !row.items.length;
  dup.onclick = () => commitBlocks(duplicateBlock(session, n, { copySet: dupSet(editing) }));
  acts.appendChild(dup);

  const del = el('button', 'wk-block-x', '✕');
  del.setAttribute('aria-label', 'Delete Block ' + n);
  del.onclick = () => {
    // Logged sets are worth stopping for — the same bar as discarding a
    // workout. An empty block goes without a word.
    if (!blockHasLogged(session.exercises, n)) { commitBlocks(deleteBlock(session, n)); return; }
    confirmSheet({
      title: 'Delete Block ' + n + '?',
      body: 'Its exercises and the sets you have logged in them will be taken out of this workout.',
      confirmLabel: 'Delete block',
      danger: true,
      onConfirm: () => commitBlocks(deleteBlock(session, n))
    });
  };
  acts.appendChild(del);
  hd.appendChild(acts);
  card.appendChild(hd);

  const inner = el('div', 'wk-block-body');
  row.items.forEach(i => inner.appendChild(renderExercise(session.exercises[i], i)));
  if (!row.items.length) inner.appendChild(noteEl('Nothing in this block yet — add the exercises you will repeat.'));

  const add = el('button', 'btn btn-ghost btn-block wk-block-add', '+  Add exercise');
  add.onclick = () => openPicker(chosen =>
    commitBlocks(addToBlock(session, n, chosen.map(x => newExercise(x, editing)))));
  inner.appendChild(add);

  card.appendChild(inner);
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
    const txt = prev.sets.map(s => `${fmtSetLoad(s.w, wu())}×${s.r}`).join('  ');
    block.appendChild(el('div', 'ex-prev', `Last · ${fmtDate(prev.date)}   ${txt}`));
  } else {
    block.appendChild(el('div', 'ex-prev', 'No previous record'));
  }

  const shd = el('div', 'set-hd');
  ['Set', unitW(wu()), 'Reps', 'e1RM', ''].forEach(t => shd.appendChild(el('span', null, t)));
  block.appendChild(shd);

  ex.sets.forEach((s, i) => block.appendChild(renderSet(ex, exIdx, s, i)));

  // While the coach mark is up the first exercise's hint line says what the
  // pulsing box is for instead — the pulse draws the eye, the words say why.
  // Swiping to delete is the less urgent lesson and it comes back on the first
  // tick.
  //
  // The string stays as it is now that collectDone records a blank weight as
  // '0'. It teaches the ordinary set, which is still both boxes, and it is a
  // PAIR with the Train tour card in onboarding.js — the two say one rule and
  // move together, in this tree and in native. Change one and you have to
  // change three.
  if (ex.sets.length) block.appendChild(el('div', 'swipe-hint',
    exIdx === coachExIdx(session) && showCoach(session, coachNone, coachTapped)
      ? 'Fill in the weight and reps, then tap the box on the right to log the set'
      : 'Swipe a set left to delete it'));

  // plate math for the heaviest entered load. s.w is stored pounds and so is
  // every plate below it, so this stays in pounds end to end and says so on
  // screen when the rest of the app is in kilos.
  const heaviest = Math.max(0, ...ex.sets.map(s => parseFloat(s.w) || 0));
  if (heaviest >= 45 && ex.equipment === 'barbell') block.appendChild(renderPlates(heaviest, 45, wu()));

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
  //
  // s.w and s.tw are stored POUNDS held as strings, and '' has to survive both
  // ways — it is how an unfilled set is told from a logged zero. So the box
  // shows the weight converted and setW() converts it back before the clamp,
  // which means a kilos account is bounded at 2,267.96 kg rather than at 5,000
  // of something.
  //
  // fmtSetW here, NOT fmtSetLoad. This is an <input type=number>, and the
  // number 0 is what a re-opened bodyweight set is: "BW" in the box is a value
  // the browser drops, so Save reads back '' and the set stops being recorded.
  // The screens that only READ a set print BW instead — see units.js.
  const u = wu();
  const w = el('input'); w.type = 'number'; w.inputMode = 'decimal';
  const lim = limW(LIMITS.setW, u);
  w.min = lim[0]; w.max = lim[1];
  w.placeholder = s.tw ? fmtSetW(s.tw, u) : '–';
  w.value = fmtSetW(s.w, u);
  w.onchange = e => { s.w = setW(e.target.value, u); persistSession(); render(); };
  row.appendChild(w);

  const r = el('input'); r.type = 'number'; r.inputMode = 'numeric';
  r.placeholder = s.tr ? String(s.tr) : '–';
  r.value = s.r; r.onchange = e => { s.r = setNum(e.target.value, LIMITS.reps, true); persistSession(); render(); };
  row.appendChild(r);

  const e1 = e1rm(s.w, s.r);
  row.appendChild(el('div', 'set-e1rm num', s.type === 'W' || !e1 ? '' : String(Math.round(wOut(e1, u)))));

  const chk = el('button', 'set-check' + (s.done ? ' on' : ''), s.done ? '✓' : '');
  chk.setAttribute('aria-label', s.done ? 'Mark set incomplete' : 'Mark set complete');
  if (exIdx === coachExIdx(session) && i === 0 && showCoach(session, coachNone, coachTapped)) chk.classList.add('coach');
  chk.onclick = () => {
    coachTapped = true;
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

/* Deliberately NOT converted. These are the plates on an American rack — 45,
   35, 25, 10, 5, 2½ — and a gym stocked in kilos has a different set (25, 20,
   15, 10, 5, 2½, 1¼) on a 20 kg bar, not these six relabelled. Printing
   "2 × 20.4" would be a number nobody can find on a rack. Which plate set a
   kilo gym should get is an open question in BACKLOG.md and it is not answered
   here, so this keeps working in pounds and says which unit it is in whenever
   that is not the unit everything else on screen is in. */
function renderPlates(total, barWeight = 45, u = 'lb') {
  const strip = el('div', 'plate-strip');
  strip.appendChild(el('span', 'lbl', u === 'lb' ? 'Per side' : 'Per side · lb plates'));
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
// The one place a typed set weight becomes a stored one. setNum already keeps
// '' as '' and pulls anything else inside the limit; this wraps it so the
// conversion happens on the way in, before the clamp, and so the pounds that
// come out are rounded to two decimals rather than stored as
// "220.46226218" — the string form the published rules and the native port
// both have to accept.
function setW(v, u) {
  const n = setNum(v, limW(LIMITS.setW, u));
  return n === '' ? '' : String(wIn(parseFloat(n), u));
}

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

/* ---------- collect ----------

   THE RULE, and it is word for word the same one the native app builds to:

     A set is recorded when it is ticked and has reps. A blank weight on a
     recorded set is stored as the string '0'. A blank reps box is still an
     unfilled set and is dropped. The live session is not changed — the blank
     stays blank on screen; the '0' exists only in the record this builds.

   The weight box used to be required, which meant a pull-up, a dip, a plank,
   a push-up — every set somebody does at bodyweight — was ticked, counted on
   screen, and then silently absent from the saved session. A whole session of
   them finished with "No completed sets".

   `w` stays a STRING. Both clients read it as one, the published rules expect
   one, and there are ~2,500 stored sets that are strings; '0' rather than 0 is
   not a stylistic choice.

   The rule is a pure function over the exercises so that the native port copies
   it rather than restating it, and so that tools-check/bodyweight-sets.mjs
   drives the real one. collectDone() is the live session's one-line caller, and
   the edit path (saveEdit) goes through the same function, which is what makes
   open -> save -> open on a past session a no-op. */
export function collectFrom(exercises) {
  const kept = (exercises || [])
    .map(ex => ({
      ...ex,
      // tw/tr are routine targets — live-session scaffolding, not part of the record.
      sets: ex.sets.filter(s => s.done && s.r !== '')
                   .map(({ tw, tr, ...keep }) => ({ ...keep, w: keep.w === '' ? '0' : keep.w }))
    }))
    .filter(ex => ex.sets.length);
  // A block whose exercises all went unlogged never reaches the record, so the
  // annotations that survive can start at 2 or skip a number — and the stored
  // number is then not the number that was on screen. Renumbering on the way IN
  // is what keeps the record self-describing: a reader labels blocks straight
  // off the annotation, and re-opening the session for an edit and saving it
  // again changes nothing. Doing it on the way out instead would make the label
  // depend on whether the session had been edited since, which is the exact
  // failure the history merge exists to remove.
  return normalizeBlocks(kept, blockOrder(kept)).exercises;
}

function collectDone() { return collectFrom(session.exercises); }

// Exported for tools-check/bodyweight-sets.mjs, which has to prove that a set
// stored as w:'0' cannot inflate a volume. Nothing in the app imports it.
export function computeVolume(done) {
  return Math.round(done.reduce((s, ex) =>
    s + ex.sets.filter(isWorking).reduce((a, x) => a + (parseFloat(x.w) || 0) * (parseInt(x.r) || 0), 0), 0));
}

/* ---------- finish ---------- */
// Finish awaits the network twice before it touches the index, and the button
// stays live the whole time, so a second tap re-entered the whole function.
// That was harmless while the history write REPLACED the day's entry; folding
// onto it instead makes a second run concatenate the same sets again, and
// "Last ·" starts reading six sets where three were done. The flag is released
// in a finally, so a failed write cannot strand the session with a dead Finish.
// saveEdit needs no such guard: it rebuilds the index from the log, which is
// the same answer however many times it runs.
let finishing = false;

async function finishWorkout() {
  if (finishing) return;
  finishing = true;
  try { await runFinish(); } finally { finishing = false; }
}

async function runFinish() {
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
    milestones = sessionMilestones(record, priorSessions, wu());
  } catch {}

  /* The one write on this path that is not derived from something else. If the
     database REFUSES it, write() has already put the red bar up and kept the
     payload in the refused list — what this owes is to not pretend. Nothing
     below has run yet: activeSession is still on the device, history is
     unfolded, the month cache is untouched and no recap exists. So the session
     is exactly as it was, `finishing` is released by finishWorkout's finally,
     and Finish can simply be tapped again — a second tap does the whole thing
     once, not twice.

     A write that could not be SENT does not come through here at all: it is
     queued and write() resolves, which is the offline case and has always
     worked. */
  try {
    await write(`workouts/${mk}/${dd}/${session.id}`, record);
  } catch {
    toast('Not saved \u2014 your workout is still here. Nothing was lost.');
    return;
  }
  bump('workoutFinish');

  // The log is now the record of this session, so the localStorage copy is the
  // stale one — and it is what a relaunch after a kill would replay into a
  // second finish, folding this day's sets onto the index twice. Dropping it
  // the moment the record exists, rather than at the end of the function,
  // closes that window; everything after this point is derived and is rebuilt
  // from the log by the next edit or delete.
  LS.del('activeSession');

  // update per-exercise history for the "last time" line, through the same fold
  // rebuildHistoryFromLog uses — the two used to disagree about a session that
  // holds one exId more than once, so an edit could change what "last time" said
  // without changing a single set.
  //
  // Assigned AFTER the write resolves, which is what write()'s docstring has
  // asked for since v32: the fold is not idempotent, so module state holding a
  // folded index over a write that was refused is a double-fold waiting for the
  // next finish on the same day. And a refusal here must not fail the finish —
  // this index is derived, the session itself is already saved, and the next
  // edit or delete rebuilds the whole thing from the log.
  const nextHistory = trimHistory(foldSessionIntoHistory(history, dateK, done));
  try {
    await write('history', nextHistory);
    history = nextHistory;
  } catch { /* write() said so on screen; the log is still the truth */ }

  // Hydrate before touching the cache. A workout is filed under the day it
  // STARTED, so `mk` is not always the month on screen — a session begun on the
  // last evening of a month, or simply restored from localStorage after a
  // relaunch, lands in a month this client may never have read. Building a
  // cache for it makes a one-day object that claims to be the whole month, and
  // the next whole-month write then erases every other day. The record itself
  // is already safe by this point: the write above addresses one session and
  // cannot erase anything, so reading the month after it is idempotent. If the
  // read fails the month is left unhydrated and saveMonth refuses.
  try { await loadMonth(mk); } catch {}
  monthCache[mk] = monthCache[mk] || {};
  monthCache[mk][dd] = monthCache[mk][dd] || {};
  monthCache[mk][dd][session.id] = record;
  invalidate();
  /* The one moment a whole-tree re-read is worth paying for: a session has just
     landed, and the card sitting directly above Start workout is quoting the
     log it landed in. Unawaited — the recap is what the person is looking at
     and nothing about a card may stand between them and it. */
  refreshCoachSessions().catch(() => {});


  summary = { record, prs, firsts, milestones, prior: priorSessions };
  session = null;
  peek = false;
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

  // Both months, and before a single key of either cache is touched. The old
  // code hydrated only the destination, and did it after emptying the source —
  // so a refusal would have left the session out of a cache that never gets
  // written, and it would vanish from the calendar until the next launch.
  if (!(await hydrateForWrite(oldMk))) return;
  if (mk !== oldMk && !(await hydrateForWrite(mk))) return;

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
  // write into the new slot — both months were hydrated above
  monthCache[mk] = monthCache[mk] || {};
  monthCache[mk][dd] = monthCache[mk][dd] || {};
  monthCache[mk][dd][record.id] = record;

  /* saveMonth already threw for a month this device never read, so this path
     has coped with a rejection since v32 — but it did it by leaving the
     rejection to escape a click handler. Now that the database can refuse a
     write too, it is caught where the session is still on screen: `session`
     stays set, so the edit is still open and still holds everything typed, and
     the red bar says which write it was. */
  try {
    await saveMonth(oldMk);
    if (mk !== oldMk) await saveMonth(mk);
    await rebuildHistoryFromLog();
  } catch {
    toast('Not saved \u2014 the edit is still open.');
    return;
  }

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
  const totalReps = sessionReps(record);

  const row = el('div', 'stat-row');
  const u = wu();
  [[fmtDuration(record.durationSec), 'Duration'],
   [fmtVol(record.volume, u), 'Volume ' + unitW(u)],
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
        (prDetail(p, u) ? '  ·  ' + prDetail(p, u) : '') +
        (p.prev ? '  ·  previous ' + Math.round(wOut(p.prev, u)) : '')));
      r.appendChild(body);
      const right = el('div', 'pr-right');
      right.appendChild(el('div', 'pr-val num', Math.round(wOut(p.value, u)) + ''));
      // delta is a difference between two pound figures, so it converts the
      // same way. The volume PR's delta is a volume, which converts the same
      // way again — they are all sums of weights.
      right.appendChild(el('div', 'pr-delta num', '+' + Math.round(wOut(p.delta, u))));
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
      r.appendChild(el('div', 'pb-val num', f.set ? fmtSetLoad(f.set.w, u) + ' × ' + f.set.r : ''));
      card.appendChild(r);
    });
    wrap.appendChild(card);
  }

  /* ---- comparison ----
     Which of the two comparisons this session gets — and whether it gets one —
     is sessionComparison's decision, not this screen's. See analytics.js: a
     bodyweight session has no volume, and dividing by the average anyway is how
     a set of pull-ups came to read -100% in the failure colour. */
  const cmp = sessionComparison(record, prior, Date.now());
  if (cmp) {
    const card = el('div', 'card');
    const hd = el('div', 'card-hd');
    hd.appendChild(el('div', 'eyebrow', 'Against your last 4 weeks'));
    card.appendChild(hd);
    const big = el('div', 'load-num num',
      cmp.kind === 'volume' ? (cmp.pct >= 0 ? '+' : '') + cmp.pct + '%' : String(cmp.reps));
    big.style.fontSize = '34px';
    // The reps branch is uncoloured on purpose. Green-or-steel is a verdict,
    // and the verdict this card used to pass on a bodyweight session is the
    // thing that was wrong with it.
    if (cmp.kind === 'volume') big.style.color = cmp.pct >= 0 ? 'var(--good)' : 'var(--steel)';
    card.appendChild(big);
    card.appendChild(noteEl(cmp.kind === 'volume'
      ? fmtVol(cmp.volume, u) + ' ' + unitW(u) + ' today against a ' + fmtVol(Math.round(cmp.avg), u) +
        ' ' + unitW(u) + ' average across ' + cmp.n + ' sessions.'
      : cmp.reps + ' reps today against a ' + Math.round(cmp.avg) + '-rep average across ' +
        cmp.n + ' sessions.'));
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
      ex.sets.map(s => `${fmtSetLoad(s.w, u)}×${s.r}${s.type !== 'N' ? s.type : ''}`).join('   ')));
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
