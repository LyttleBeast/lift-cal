import { GROUPS, GROUP_ORDER, EXERCISES, makeCustomExercise } from './exercises.js';
import { read, write, writeFeed, LS, todayKey, monthKey } from './store.js';

const $ = s => document.querySelector(s);
const el = (t, c, txt) => { const n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; };

let customEx   = [];
let monthCache = {};        // 'YYYY-MM' -> { 'DD': [workout,...] }
let viewMonth  = new Date();
let history    = {};        // exId -> [{date, sets}]
let session    = null;      // active workout
let restEnd    = null;
let restTotal  = 0;
let wakeLock   = null;
let tickHandle = null;

export function allExercises() { return [...EXERCISES, ...customEx]; }

/* ================= INIT ================= */
export async function initWorkout() {
  customEx = (await read('exercises/custom', null)) || [];
  history  = (await read('history', null)) || {};

  const saved = LS.get('activeSession', null);
  if (saved) { session = saved; }

  await loadMonth(monthKey(viewMonth));
  render();
  startTick();
}

function startTick() {
  if (tickHandle) return;
  // Timestamp-driven, never a counter. iOS throttles background JS;
  // recomputing from Date.now() means the clock is right on resume.
  tickHandle = setInterval(() => {
    if (session) paintClock();
    if (restEnd) paintRest();
  }, 250);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { if (session) paintClock(); if (restEnd) paintRest(); requestWakeLock(); }
  });
}

async function requestWakeLock() {
  if (!session || !('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch {}
}
function releaseWakeLock() { try { wakeLock && wakeLock.release(); } catch {} wakeLock = null; }

/* ================= DATA ================= */
async function loadMonth(mk) {
  if (monthCache[mk]) return monthCache[mk];
  const data = (await read(`workouts/${mk}`, null)) || {};
  monthCache[mk] = data;
  return data;
}

/* ================= RENDER ROOT ================= */
export function render() {
  const root = $('#view-workout');
  if (!root) return;
  root.innerHTML = '';
  if (session) root.appendChild(renderSession());
  else root.appendChild(renderCalendar());
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
  const prev = el('button', null, '\u2039'); prev.setAttribute('aria-label', 'Previous month');
  const next = el('button', null, '\u203A'); next.setAttribute('aria-label', 'Next month');
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
      cell.onclick = () => openDay(key, list);
    } else {
      cell.setAttribute('aria-label', `${d} — no training`);
      cell.onclick = () => {};
    }
    grid.appendChild(cell);
  }
  wrap.appendChild(grid);

  // legend
  const leg = el('div');
  leg.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 18px';
  GROUP_ORDER.forEach(g => {
    const it = el('div');
    it.style.cssText = 'display:flex;align-items:center;gap:5px;font-size:10px;color:var(--dim);letter-spacing:.06em;text-transform:uppercase';
    const sw = el('i');
    sw.style.cssText = `width:12px;height:3px;border-radius:1px;background:${GROUPS[g].color};display:block`;
    it.append(sw, document.createTextNode(GROUPS[g].label));
    leg.appendChild(it);
  });
  wrap.appendChild(leg);

  wrap.appendChild(renderMonthStats(days));
  wrap.appendChild(renderWeekVolume());

  const start = el('button', 'btn btn-primary btn-block btn-lg', 'Start workout');
  start.onclick = startWorkout;
  wrap.appendChild(start);

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
  hd.appendChild(el('div', 'eyebrow', 'Last 7 days \u2014 working sets'));
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

  if (!any) {
    const p = el('div');
    p.style.cssText = 'font-size:13px;color:var(--dim)';
    p.textContent = 'No sets logged this week yet.';
    card.appendChild(p);
  }
  return card;
}

/* ================= DAY SHEET ================= */
function openDay(dateKey, list) {
  const back = el('div', 'sheet-backdrop');
  const sh = el('div', 'sheet');
  sh.appendChild(el('div', 'sheet-grab'));

  const d = new Date(dateKey + 'T12:00:00');
  sh.appendChild(el('div', 'eyebrow', d.toLocaleDateString('en-US', { weekday: 'long' })));
  sh.appendChild(el('h2', null, d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })));

  list.forEach(w => {
    const c = el('div', 'card');
    c.style.marginTop = '12px';
    const hd = el('div', 'card-hd');
    hd.appendChild(el('div', null, w.name || 'Workout'));
    const meta = el('div', 'eyebrow', `${Math.round((w.durationSec || 0) / 60)} min \u00b7 ${(w.volume || 0).toLocaleString()} lb`);
    hd.appendChild(meta);
    c.appendChild(hd);

    (w.exercises || []).forEach(ex => {
      const r = el('div');
      r.style.cssText = 'display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-top:1px solid var(--collar)';
      const tag = el('i');
      tag.style.cssText = `width:3px;align-self:stretch;border-radius:2px;background:${(GROUPS[ex.group]||{}).color};flex-shrink:0`;
      const body = el('div');
      body.style.flex = '1';
      const nm = el('div', null, ex.name);
      nm.style.cssText = 'font-size:13px;font-variation-settings:"wdth" 90,"wght" 700';
      body.appendChild(nm);
      const sets = (ex.sets || []).filter(s => s.done)
        .map(s => `${s.w || 0}\u00d7${s.r || 0}${s.type !== 'N' ? s.type : ''}`).join('   ');
      const sd = el('div', 'num', sets);
      sd.style.cssText = 'font-size:11px;color:var(--steel);margin-top:2px';
      body.appendChild(sd);
      r.append(tag, body);
      c.appendChild(r);
    });
    sh.appendChild(c);
  });

  const close = () => { back.remove(); sh.remove(); };
  back.onclick = close;
  const btn = el('button', 'btn btn-ghost btn-block', 'Close');
  btn.onclick = close;
  btn.style.marginTop = '8px';
  sh.appendChild(btn);

  document.body.append(back, sh);
}

/* ================= SESSION ================= */
function startWorkout(preset) {
  session = {
    id: 'w' + Date.now().toString(36),
    name: defaultName(),
    startedAt: Date.now(),
    exercises: (preset && preset.exercises) || []
  };
  persistSession();
  requestWakeLock();
  render();
}

function defaultName() {
  const h = new Date().getHours();
  if (h < 11) return 'Morning session';
  if (h < 16) return 'Afternoon session';
  return 'Evening session';
}

function persistSession() { LS.set('activeSession', session); }

function renderSession() {
  const wrap = el('div');

  // sticky bar
  const bar = el('div', 'wk-bar');
  const lt = el('div');
  const nameIn = el('input');
  nameIn.value = session.name;
  nameIn.style.cssText = 'background:none;border:none;color:var(--chalk);font-size:14px;font-variation-settings:"wdth" 88,"wght" 700;padding:0;width:100%';
  nameIn.oninput = e => { session.name = e.target.value; persistSession(); };
  lt.appendChild(nameIn);
  const clock = el('div', 'timer num', '0:00');
  clock.id = 'wkClock';
  lt.appendChild(clock);
  bar.appendChild(lt);

  const fin = el('button', 'btn btn-primary', 'Finish');
  fin.onclick = finishWorkout;
  bar.appendChild(fin);
  wrap.appendChild(bar);

  const body = el('div', 'screen-pad');

  if (!session.exercises.length) {
    const es = el('div', 'empty-state');
    es.appendChild(el('h3', null, 'Empty session'));
    es.appendChild(el('p', null, 'Add your first exercise to start logging sets.'));
    body.appendChild(es);
  }

  session.exercises.forEach((ex, i) => body.appendChild(renderExercise(ex, i)));

  const add = el('button', 'btn btn-ghost btn-block', '+  Add exercise');
  add.onclick = () => openPicker(chosen => {
    chosen.forEach(x => session.exercises.push({
      exId: x.id, name: x.name, group: x.group, equipment: x.equipment,
      sets: [{ w: '', r: '', type: 'N', done: false }]
    }));
    persistSession(); render();
  });
  body.appendChild(add);

  const cancel = el('button', 'btn btn-danger btn-block', 'Discard workout');
  cancel.style.marginTop = '10px';
  cancel.onclick = () => {
    if (!confirm('Discard this workout? Nothing will be saved.')) return;
    session = null; LS.del('activeSession'); releaseWakeLock(); clearRest(); render();
  };
  body.appendChild(cancel);

  wrap.appendChild(body);
  setTimeout(paintClock, 0);
  return wrap;
}

function renderExercise(ex, exIdx) {
  const block = el('div', 'ex-block');
  const color = (GROUPS[ex.group] || {}).color || 'var(--dim)';

  const hd = el('div', 'ex-hd');
  const tag = el('i', 'ex-tag'); tag.style.background = color;
  hd.appendChild(tag);
  hd.appendChild(el('div', 'ex-name', ex.name));
  const menu = el('button', 'ex-menu', '\u22ef');
  menu.onclick = () => {
    if (confirm(`Remove ${ex.name} from this workout?`)) {
      session.exercises.splice(exIdx, 1); persistSession(); render();
    }
  };
  hd.appendChild(menu);
  block.appendChild(hd);

  // previous performance — the single most useful thing on the screen
  const prev = (history[ex.exId] || [])[0];
  if (prev) {
    const txt = prev.sets.map(s => `${s.w}\u00d7${s.r}`).join('  ');
    const p = el('div', 'ex-prev', `Last \u00b7 ${fmtDate(prev.date)}   ${txt}`);
    block.appendChild(p);
  } else {
    block.appendChild(el('div', 'ex-prev', 'No previous record'));
  }

  const shd = el('div', 'set-hd');
  ['Set', 'lb', 'Reps', 'e1RM', ''].forEach(t => shd.appendChild(el('span', null, t)));
  block.appendChild(shd);

  ex.sets.forEach((s, i) => block.appendChild(renderSet(ex, exIdx, s, i)));

  // plate math for the heaviest entered load
  const heaviest = Math.max(0, ...ex.sets.map(s => parseFloat(s.w) || 0));
  if (heaviest >= 45 && ex.equipment === 'barbell') {
    block.appendChild(renderPlates(heaviest));
  }

  const acts = el('div', 'ex-actions');
  const addSet = el('button', 'btn btn-ghost', '+ Set');
  addSet.onclick = () => {
    const last = ex.sets[ex.sets.length - 1] || {};
    ex.sets.push({ w: last.w || '', r: last.r || '', type: 'N', done: false });
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

  const w = el('input'); w.type = 'number'; w.inputMode = 'decimal'; w.placeholder = '\u2013';
  w.value = s.w; w.onchange = e => { s.w = e.target.value; persistSession(); render(); };
  row.appendChild(w);

  const r = el('input'); r.type = 'number'; r.inputMode = 'numeric'; r.placeholder = '\u2013';
  r.value = s.r; r.onchange = e => { s.r = e.target.value; persistSession(); render(); };
  row.appendChild(r);

  const e1 = e1rm(s.w, s.r);
  row.appendChild(el('div', 'set-e1rm num', s.type === 'W' || !e1 ? '' : String(e1)));

  const chk = el('button', 'set-check' + (s.done ? ' on' : ''), s.done ? '\u2713' : '');
  chk.setAttribute('aria-label', s.done ? 'Mark set incomplete' : 'Mark set complete');
  chk.onclick = () => {
    s.done = !s.done;
    persistSession();
    if (s.done) {
      startRest();
      const rows = document.querySelectorAll('.set-row');
      render();
      // flash the row that was just completed
      const all = document.querySelectorAll('.ex-block')[exIdx];
      if (all) {
        const target = all.querySelectorAll('.set-row')[i];
        if (target) { target.classList.add('flash'); setTimeout(() => target.classList.remove('flash'), 600); }
      }
    } else render();
  };
  row.appendChild(chk);

  return row;
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
    const chip = el('span', 'plate-chip', `${n}\u00d7${p.w}`);
    chip.style.background = p.c;
    strip.appendChild(chip);
  });
  if (side > 0.01) {
    const rem = el('span', 'lbl', `+${side} left over`);
    strip.appendChild(rem);
  }
  return strip;
}

/* ---------- math ---------- */
function e1rm(w, r) {
  const W = parseFloat(w), R = parseInt(r);
  if (!W || !R || R < 1) return 0;
  if (R === 1) return Math.round(W);
  return Math.round(W * (1 + R / 30)); // Epley
}

function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ---------- clock ---------- */
function paintClock() {
  const c = document.getElementById('wkClock');
  if (!c || !session) return;
  const s = Math.floor((Date.now() - session.startedAt) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  c.textContent = h ? `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
                    : `${m}:${String(ss).padStart(2,'0')}`;
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

/* ---------- finish ---------- */
async function finishWorkout() {
  const done = session.exercises
    .map(ex => ({ ...ex, sets: ex.sets.filter(s => s.done && s.w !== '' && s.r !== '') }))
    .filter(ex => ex.sets.length);

  if (!done.length) {
    if (!confirm('No completed sets. Discard this workout?')) return;
    session = null; LS.del('activeSession'); releaseWakeLock(); clearRest(); render(); return;
  }

  const volume = done.reduce((s, ex) =>
    s + ex.sets.filter(x => x.type !== 'W')
               .reduce((a, x) => a + (parseFloat(x.w) || 0) * (parseInt(x.r) || 0), 0), 0);

  const groups = [...new Set(done.map(e => e.group))];
  const dateK  = todayKey(new Date(session.startedAt));
  const mk     = dateK.slice(0, 7);
  const dd     = dateK.slice(8, 10);

  const record = {
    id: session.id,
    name: session.name,
    startedAt: session.startedAt,
    endedAt: Date.now(),
    durationSec: Math.round((Date.now() - session.startedAt) / 1000),
    volume: Math.round(volume),
    groups,
    exercises: done
  };

  await write(`workouts/${mk}/${dd}/${session.id}`, record);

  // update per-exercise history for the "last time" line
  done.forEach(ex => {
    const entry = { date: dateK, sets: ex.sets.filter(s => s.type !== 'W').map(s => ({ w: s.w, r: s.r, type: s.type })) };
    if (!entry.sets.length) return;
    history[ex.exId] = [entry, ...(history[ex.exId] || [])].slice(0, 20);
  });
  await write('history', history);

  monthCache[mk] = monthCache[mk] || {};
  monthCache[mk][dd] = monthCache[mk][dd] || {};
  monthCache[mk][dd][session.id] = record;

  await pushFeed(record);

  session = null; LS.del('activeSession'); releaseWakeLock(); clearRest();
  toast('Workout saved');
  render();
}

async function pushFeed(latest) {
  const recent = [];
  Object.keys(monthCache).sort().reverse().forEach(mk => {
    Object.keys(monthCache[mk]).sort().reverse().forEach(dd => {
      Object.values(monthCache[mk][dd]).forEach(w => recent.push(w));
    });
  });
  recent.sort((a, b) => b.startedAt - a.startedAt);

  await writeFeed({
    workouts: recent.slice(0, 3).map(w => ({
      date: todayKey(new Date(w.startedAt)),
      name: w.name,
      minutes: Math.round(w.durationSec / 60),
      volume: w.volume,
      groups: w.groups,
      topSets: (w.exercises || []).map(ex => {
        const best = ex.sets.filter(s => s.type !== 'W')
          .sort((a, b) => e1rm(b.w, b.r) - e1rm(a.w, a.r))[0];
        return best ? `${ex.name} ${best.w}x${best.r}` : null;
      }).filter(Boolean)
    }))
  });
}

/* ================= PICKER ================= */
function openPicker(onPick) {
  const back = el('div', 'sheet-backdrop');
  const sh   = el('div', 'sheet');
  sh.appendChild(el('div', 'sheet-grab'));

  const selected = [];
  let filter = 'all', q = '';

  const search = el('div', 'picker-search');
  const inp = el('input');
  inp.placeholder = 'Search exercises';
  inp.type = 'search';
  search.appendChild(inp);

  const chips = el('div', 'filter-row');
  const mkChip = (id, label) => {
    const c = el('button', 'chip' + (filter === id ? ' on' : ''), label);
    c.onclick = () => { filter = id; paint(); };
    return c;
  };
  search.appendChild(chips);
  sh.appendChild(search);

  const list = el('div');
  sh.appendChild(list);

  const foot = el('div');
  foot.style.cssText = 'position:sticky;bottom:0;background:var(--bar);padding-top:10px;display:flex;gap:8px';
  const custom = el('button', 'btn btn-ghost', 'New');
  custom.onclick = () => {
    const name = prompt('Exercise name');
    if (!name) return;
    const g = prompt('Muscle group — chest, back, legs, shoulders, arms, core', 'chest');
    if (!GROUPS[g]) { alert('Not a valid group.'); return; }
    const eq = prompt('Equipment — barbell, dumbbell, machine, cable, bodyweight', 'barbell') || 'barbell';
    const x = makeCustomExercise(name, g, eq);
    customEx.push(x);
    write('exercises/custom', customEx);
    selected.push(x); paint();
  };
  const addBtn = el('button', 'btn btn-primary', 'Add');
  addBtn.style.flex = '1';
  addBtn.onclick = () => { if (selected.length) { close(); onPick(selected); } };
  const closeBtn = el('button', 'btn btn-ghost', 'Cancel');
  closeBtn.onclick = () => close();
  foot.append(closeBtn, custom, addBtn);
  sh.appendChild(foot);

  function paint() {
    chips.innerHTML = '';
    chips.appendChild(mkChip('all', 'All'));
    GROUP_ORDER.forEach(g => chips.appendChild(mkChip(g, GROUPS[g].label)));

    list.innerHTML = '';
    const pool = allExercises()
      .filter(x => filter === 'all' || x.group === filter)
      .filter(x => !q || x.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));

    pool.slice(0, 260).forEach(x => {
      const on = selected.some(s => s.id === x.id);
      const b = el('button', 'ex-item' + (on ? ' sel' : ''));
      const dot = el('i', 'dot'); dot.style.background = GROUPS[x.group].color;
      b.appendChild(dot);
      b.appendChild(el('span', 'nm', x.name));
      b.appendChild(el('span', 'eq', x.equipment));
      b.onclick = () => {
        const i = selected.findIndex(s => s.id === x.id);
        if (i >= 0) selected.splice(i, 1); else selected.push(x);
        paint();
      };
      list.appendChild(b);
    });

    addBtn.textContent = selected.length ? `Add ${selected.length}` : 'Add';
    addBtn.disabled = !selected.length;
  }

  inp.oninput = e => { q = e.target.value.toLowerCase().trim(); paint(); };

  function close() { back.remove(); sh.remove(); }
  back.onclick = close;

  paint();
  document.body.append(back, sh);
}

/* ================= TOAST ================= */
export function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = el('div', 'toast', msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

export function hasActiveSession() { return !!session; }
