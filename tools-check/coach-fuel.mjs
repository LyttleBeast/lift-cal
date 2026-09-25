#!/usr/bin/env node
//
// Verifier for stage four, the food half — coach-fuel.js (v52, Phase B).
//
//   node tools-check/coach-fuel.mjs
//
// "Am I fueled?" is the one Coach answer that reads food, the one with the
// weakest science behind it, and the one most at risk of saying more than the
// data supports. So it is held to four things, row by row and over generated
// histories, and scored ok / miss / wrong with WRONG MUST BE 0:
//
//   IT READS OUT FOOD AND NEVER PRESCRIBES IT — his log against his own
//   normal, and nothing after it.
//   UNLOGGED IS NEVER ZERO — a half-logged day is not a low one, a day Coach
//   could not read is not an empty one, and a summary that shows food is
//   never contradicted.
//   TIME READS ONLY FOR A REAL-TIME LOGGER, and only from entries logged on
//   their own day.
//   FOOD NEVER CHANGES TRAINING — no rest call, no target, no lift reading,
//   no line of the targets answer.
//
// Then SHIP-V52-PROMPT §11's must-never scan over every string both new
// modules and every new response can say, across every fixture, both units.
//
// NO COPY OF ANY RULE LIVES HERE: coach.js, coach-fuel.js and coach-ready.js
// are staged and driven for real, the fuel input through the engine itself.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

/* ================= STAGING ================= */
// v54: and coach-volume.js, which coach.js imports (the staging edit).
const FILES = ['analytics.js', 'coach-goal.js', 'coach-prog.js', 'coach-overlap.js', 'coach-build.js', 'coach-live.js',
               'coach-ready.js', 'coach-fuel.js', 'coach-volume.js', 'coach.js'];
const dir = mkdtempSync(join(tmpdir(), 'rack-coach-fuel-'));
const at = f => JSON.stringify(pathToFileURL(join(dir, f)).href);
writeFileSync(join(dir, 'store-stub.mjs'), `
export async function read(_p, fallback) { return fallback; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`);
FILES.forEach(f => writeFileSync(join(dir, f.replace(/\.js$/, '.mjs')), src(f)
  .replace("from './store.js'", "from './store-stub.mjs'")
  .replace(/from '\.\/([\w-]+)\.js'/g, (w, n) => 'from ' + (FILES.includes(n + '.js') ? at(n + '.mjs') : real(n + '.js')))));
const C = await import(JSON.parse(at('coach.mjs')));
const F = await import(JSON.parse(at('coach-fuel.mjs')));
const R = await import(JSON.parse(at('coach-ready.mjs')));
const { EXERCISES } = await import(JSON.parse(real('exercises.js')));
const U8 = await import(JSON.parse(real('units.js')));

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 6).join(' | ') + (xs.length > 6 ? ' … (' + xs.length + ')' : '');
const battery = [];
function row(id, fn) {
  let r;
  try { r = fn(); } catch (e) { r = { v: 'wrong', said: 'threw: ' + (e && e.stack || e) }; }
  battery.push({ id, ...r });
}
const grade = (ok, silent, said) => ({ v: ok ? 'ok' : silent ? 'miss' : 'wrong', said: String(said) });

/* ================= FIXTURES =================
   A fixed epoch; sessions at five in the afternoon; food on a clock. */
const DAY = 864e5;
const NOW = 1789307130123;
const HOUR = new Date(NOW).getHours();
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const localAt = (ago, hour, min) => { const d = new Date(NOW - ago * DAY); d.setHours(hour, min || 0, 0, 0); return d.getTime(); };
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const set = (w, r) => ({ w: String(w), r: String(r), type: 'N', done: true });
const UPPER = [['barbell-bench-press', 185, 8], ['barbell-row', 155, 8], ['overhead-press', 95, 8]];
const LOWER = [['back-squat-high-bar', 245, 5], ['leg-press', 300, 10], ['leg-extension', 100, 12]];
let sid = 0;
function sess(ago, rows, o) {
  const opt = o || {};
  const t = opt.at != null ? opt.at : localAt(ago, opt.hour == null ? 17 : opt.hour);
  return { id: opt.id || 'f' + (++sid), startedAt: t, endedAt: t + 3600e3, durationSec: 3600, _date: key(t),
    exercises: rows.map(([id, w, r]) => ({ exId: id, name: LIB[id].name, group: LIB[id].group, equipment: LIB[id].equipment,
      sets: [1, 2, 3].map(() => set(Math.round(w * (opt.scale || 1) / 5) * 5, r)) })) };
}
/* Food on a clock. REAL: four entries across a day — 8 am, noon, 3 pm and
   8 pm. BATCH: every entry between half past nine and quarter past ten at
   night. Each day's summary is its entries' total, as food.js keeps it. */
const REAL = [[8, 0, 600, 60], [12, 0, 800, 90], [15, 0, 400, 50], [20, 0, 700, 80]];
const BATCH = [[21, 30, 600, 60], [21, 45, 800, 90], [22, 0, 400, 50], [22, 15, 700, 80]];
function day(ago, pattern, scale = 1) {
  return pattern.map(([h, m, cal, c]) => ({ t: localAt(ago, h, m), cal: Math.round(cal * scale), p: 30, c: Math.round(c * scale) }));
}
function input(extra) {
  return { now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions: [], lib: LIB, hidden: [],
           libReady: true, routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null,
           summaries: {}, steps: { days: {} }, weighIns: [], foodLog: {},
           weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
           settings: { v: 1, mute: {}, answers: {}, asked: {} }, ...extra };
}
/* A month of it: a session every other day (upper and lower) at four, five
   or six in the afternoon, food logged every day to the pattern given — a
   little more or less each day, as a real month is (a robust z has nothing
   to read in a month with no spread) — each training day's log read, what
   loadFuel() would have read, and today's so far at the scale given, up to
   an hour before now. Now is half past one in every zone, so "so far" is
   the same two entries wherever this runs. */
const T13 = localAt(0, 13, 30);
const wobble = a => 0.9 + ((a * 7) % 5) * 0.05;
function month(o = {}) {
  const sessions = [], summaries = {}, foodLog = {};
  const now = o.now || T13;
  (o.sessions || (() => { const ss = []; for (let a = 1; a <= 60; a += 2) ss.push(sess(a, (a >> 1) % 2 ? LOWER : UPPER, { hour: 16 + (a % 3) })); return ss; })())
    .forEach(x => sessions.push(x));
  for (let a = 1; a <= 30; a++) {
    const es = day(a, o.pattern || REAL, o.scaleOf ? o.scaleOf(a) : wobble(a));
    const cal = es.reduce((x, e) => x + e.cal, 0), c = es.reduce((x, e) => x + e.c, 0);
    summaries[key(localAt(a, 12))] = { cal: o.partial && o.partial.includes(a) ? Math.round(cal * 0.35) : cal, p: 120, c, f: 80 };
    if (a % 2 === 1 && a <= 27) foodLog[key(localAt(a, 12))] = es;
  }
  if (o.today !== false) {
    const upTo = now - 3600e3;
    const es = (o.todayPattern || REAL).filter(([h, m]) => localAt(0, h, m) <= upTo)
      .map(([h, m, cal, c]) => ({ t: localAt(0, h, m), cal: Math.round(cal * (o.todayScale || 1)), p: 30, c: Math.round(c * (o.todayScale || 1)) }));
    if (es.length) {
      summaries[key(NOW)] = { cal: es.reduce((x, e) => x + e.cal, 0), p: 60, c: es.reduce((x, e) => x + e.c, 0), f: 20 };
      foodLog[key(NOW)] = es;
    } else if (o.todayEmptyLog) foodLog[key(NOW)] = [];
  }
  return input({ now, sessions: sessions.sort((a, b) => a.startedAt - b.startedAt), summaries, foodLog, ...(o.extra || {}) });
}
const ask = (inp, id) => C.coach(inp).ask(id);
const said = a => [a.text].concat((a.more || []).map(m => m.text)).join(' / ');
// coach-fuel.js's input exactly as coach.js builds it (its fuelInput()).
const fuelIn = inp => C.fuelInput(inp);
const hasFoodByNow = true;

/* ================= F. THE ROWS ================= */
section('F. "Am I fueled?" — his food against his own normal, never a prescription');

row('F1', () => {
  const inp = input({ sessions: [sess(2, UPPER), sess(4, LOWER)] });
  const a = ask(inp, 'ask_fueled');
  const ok = a.id === 'fuel_fueled' && a.text === 'Coach reads fuel from your food log, and there isn’t enough in it yet (0 days).' &&
             !/kcal| g of|Nothing logged/.test(said(a));
  return grade(ok, a.id === 'ask_fueled', said(a));
});
row('F2', () => {
  // Eleven at night: a batch logger's day is in by then.
  const inp = month({ pattern: BATCH, todayPattern: BATCH, now: localAt(0, 23) });
  const a = ask(inp, 'ask_fueled');
  const q = a.question;
  // the question is put once: asked (its stamp) and not answered, it is not put again
  const again = ask({ ...inp, settings: { ...inp.settings, asked: { q_log_timing: NOW - 3600e3 } } }, 'ask_fueled').question;
  const live = month({ pattern: BATCH, todayPattern: BATCH, now: localAt(0, 23), extra: { settings: { v: 1, mute: {}, answers: { q_log_timing: 'live' }, asked: {} } } });
  const r0 = F.fueledRead(fuelIn(inp), inp.now), r1 = F.fueledRead(fuelIn(live), live.now);
  const ok = r0 && r0.state === 'day' && r0.a.style === 'batch' && !/so far|by now/.test(said(a)) &&
             (a.more || []).some(m => m.text === 'Most of your entries go in together, later, so the hours they were logged say nothing about the day’s timing.') &&
             q && q.id === 'q_log_timing' && q.text === 'Do you usually log food as you go, or later in the day?' &&
             q.options.map(o => o.label).join('|') === 'As I go|Later' && !again &&
             r1 && r1.a.style === 'real';
  return grade(ok, !q, (r0 && r0.state + '/' + r0.a.style) + ' · ' + said(a) + ' · Q ' + (q && q.text) + ' · again ' + !!again + ' · as I go: ' + (r1 && r1.a.style));
});
row('F3', () => {
  const inp = month({ todayScale: 0.4 });
  const a = ask(inp, 'ask_fueled');
  const r = F.fueledRead(fuelIn(inp), inp.now);
  if (!hasFoodByNow) return grade(a.id === 'fuel_empty' || r.state !== 'read', true, 'no food by this hour in this zone: ' + a.text);
  const ok = r.state === 'read' && r.verdict === 'lighter' &&
             /^Lighter than usual so far today\. You’ve logged [\d,]+ kcal and [\d,]+ g of carbs; by now on a training day you usually have about [\d,]+ and [\d,]+ \(\d+ days\)\.$/.test(a.text);
  return grade(ok, r.state !== 'read', a.text);
});
row('F4', () => {
  // Yesterday: 900 kcal against a usual 2,600 — not fully logged, never low.
  const inp = month({ scaleOf: a => (a === 1 ? 900 / 2500 : 2600 / 2500) });
  const a = ask(inp, 'ask_fueled');
  const ok = (a.more || []).some(m => m.text === 'Yesterday wasn’t fully logged.') && !/\blow\b/i.test(said(a));
  return grade(ok, false, said(a));
});
row('F5', () => {
  const inp = month({ today: false });
  const a = ask(inp, 'ask_fueled');
  const ok = a.id === 'fuel_empty' && a.text === 'Nothing logged today yet.' && !(a.more || []).length &&
             (a.followups || []).map(f => f.label).join('|') === 'I ate, it’s not logged|I haven’t eaten' &&
             ask(inp, 'ask_fed_unlogged').text === 'Then today isn’t in your log yet, so Coach can’t read it.' &&
             ask(inp, 'ask_fed_none').text === 'Noted. That’s for this answer; nothing is saved.';
  return grade(ok, a.id === 'ask_fueled', said(a) + ' · ' + (a.followups || []).map(f => f.label).join('|'));
});
/* F6/F7: a session today, and the food before it. The month's training days
   all logged a real-time day; today, before a 5 pm session, either the usual
   or a third of it. */
function postLog(o) {
  const inp = month({ today: false });
  const t = localAt(0, 17);
  const s = sess(0, UPPER, { at: t, id: 'today', scale: o.scale });
  const es = day(0, REAL, o.food).filter(e => e.t < t);
  const fl = { ...inp.foodLog, [key(t)]: es };
  const sums = { ...inp.summaries, [key(t)]: { cal: es.reduce((x, e) => x + e.cal, 0), p: 60, c: es.reduce((x, e) => x + e.c, 0), f: 20 } };
  return { ...inp, sessions: inp.sessions.concat([s]).sort((a, b) => a.startedAt - b.startedAt), foodLog: fl, summaries: sums, now: t + 2 * 3600e3 };
}
row('F6', () => {
  const inp = postLog({ scale: 1.1, food: 0.3 });
  const a = ask(inp, 'ask_compare');
  const more = (a.more || []).map(m => m.text);
  const ok = /^Above your usual/.test(a.text) && more.some(t => /^You’d logged about [\d,]+ kcal before it; usually about [\d,]+\.$/.test(t)) &&
             more.includes('These are differences, not causes.') && !/despite|even though|because|due to|led to|made you|that'?s why/i.test(said(a));
  return grade(ok, !/^Above/.test(a.text), said(a));
});
row('F7', () => {
  const inp = postLog({ scale: 0.85, food: 1 });
  const a = ask(inp, 'ask_compare');
  const more = (a.more || []).map(m => m.text);
  const ok = /^Below your usual/.test(a.text) && more.includes('Nothing in your log was off your normal.') && !!a.mark;
  return grade(ok, !/^Below/.test(a.text), said(a) + ' · mark ' + !!a.mark);
});
row('F8', () => {
  const inp = { ...postLog({ scale: 1.1, food: 0.3 }), settings: { v: 1, mute: { fuel: true }, answers: {}, asked: {} } };
  const c = C.coach(inp);
  const words = ['ask_fueled', 'ask_lighter', 'ask_compare', 'ask_fed_none'].map(id => said(c.ask(id))).join(' / ');
  const ok = C.fuelDays(inp).length === 0 && c.ask('ask_fueled').id === 'ask_fueled' &&
             !/kcal|carbs|food|logged about|fully logged/i.test(words.replace(/Nothing to say about your food yet\./, '')) &&
             !c.topicsFor('train').some(t => t.id === 'ask_fueled');
  return grade(ok, false, C.fuelDays(inp).length + ' days · ' + words.slice(0, 300));
});
row('F9', () => {
  const inp = { ...month(), tier: { pro: false } };
  const ok = C.fuelDays(inp).length === 0 && C.PRO_ADDS.some(a => a.id === 'fuel') && C.PRO_ADDS.some(a => a.id === 'readiness');
  return grade(ok, false, C.fuelDays(inp).length + ' · ' + C.PRO_ADDS.map(a => a.id).join(','));
});
/* F10/F11: a new phase. Weigh-ins losing for the last eighteen days, gaining
   for the three weeks before — the latest turn §8.2's rule can see (it reads
   two weeks each way, through bwAt()'s seven-day median) — and food that
   moved with it: 2,200 a day since the turn, 2,800 before. */
function phaseLog(o) {
  const inp = month({ scaleOf: a => (a <= (o.turn || 18) ? 2200 / 2500 : 2800 / 2500) });
  const ins = [];
  for (let a = 42; a >= 0; a--) ins.push({ lb: a > 18 ? 180 + (42 - a) * 0.12 : 180 + 24 * 0.12 - (18 - a) * 0.12, t: localAt(a, 6) });
  return { ...inp, weighIns: o.weigh === false ? [] : ins, ...(o.extra || {}) };
}
row('F10', () => {
  const inp = phaseLog({});
  const r = F.fueledRead(fuelIn(inp), inp.now);
  const a = ask(inp, 'ask_fueled');
  const line = (a.more || []).find(m => /new normal/.test(m.text));
  // v53 (on purpose, SHIP-V53-PROMPT §3.4): the line names the change — here the weight trend's turn.
  const ok = r && r.a.phase === 'new' && Math.abs(r.a.dayMed.kcal - 2200) < 1 && !!line &&
             /^Coach is learning your new normal since your weight trend changed, \d+ days in\.$/.test(line.text);
  return grade(ok, !line, (r && r.a.phase + ' ' + r.a.dayMed.kcal) + ' · ' + said(a));
});
row('F11', () => {
  const inp = phaseLog({ weigh: false, turn: 10, extra: { settings: { v: 1, mute: {}, answers: { q_goal_aim: 'cut' }, asked: { q_goal_aim: NOW - 10 * DAY } } } });
  const r = F.fueledRead(fuelIn(inp), inp.now);
  const a = ask(inp, 'ask_fueled');
  // v53 (on purpose, SHIP-V53-PROMPT §3.4): the line names the change — here his goal, set ten days ago.
  const ok = r && r.a.phase === 'new' && Math.abs(r.a.dayMed.kcal - 2200) < 1 && (a.more || []).some(m => /^Coach is learning your new normal since you changed your goal, \d+ days in\.$/.test(m.text));
  return grade(ok, !r || r.a.phase !== 'new', (r && r.a.phase + ' ' + r.a.dayMed.kcal) + ' · ' + said(a));
});
row('F12', () => {
  const inp = month({ todayScale: 1.5 });
  const r = F.fueledRead(fuelIn(inp), inp.now);
  const a = ask(inp, 'ask_fueled');
  if (!hasFoodByNow) return grade(true, true, 'no food by this hour in this zone');
  // One entry by this hour in some zones: 1.5 times one entry is not past
  // q75 of a curve whose spread is that entry — then it is "about usual".
  const ok = r.state === 'read' && (r.verdict === 'heavier' ? /^Heavier than usual so far today\./.test(a.text) : /^About usual so far today\./.test(a.text));
  return grade(ok, r.state !== 'read', r.verdict + ' · ' + a.text);
});
row('F13', () => {
  const base = month();
  const failed = { ...base, foodLog: { ...base.foodLog, [key(NOW)]: null } };
  const stale = { ...base, foodLog: { ...base.foodLog, [key(NOW)]: [] } };
  const notRead = { ...base, foodLog: Object.fromEntries(Object.entries(base.foodLog).filter(([k]) => k !== key(NOW))) };
  const outs = [failed, stale, notRead].map(x => ask(x, 'ask_fueled'));
  const ok = !hasFoodByNow || outs.every(a => a.text === 'Coach couldn’t read today’s food log just now.' && !/Nothing logged today/.test(said(a)));
  return grade(ok, false, outs.map(a => a.text).join(' | '));
});
row('F14', () => {
  // Yesterday's dinner, logged at 7 this morning into yesterday's log.
  const base = month();
  const y = key(localAt(1, 12));
  const late = { t: localAt(0, 7), cal: 900, p: 40, c: 100 };
  const inp = { ...base, foodLog: { ...base.foodLog, [y]: base.foodLog[y].concat([late]) },
                summaries: { ...base.summaries, [y]: { ...base.summaries[y], cal: base.summaries[y].cal + 900 } } };
  const r0 = F.fueledRead(fuelIn(base), base.now), r1 = F.fueledRead(fuelIn(inp), inp.now);
  const ok = r0 && r1 && r1.a.cal(y) === r0.a.cal(y) + 900 && r1.a.curve.k === r0.a.curve.k &&
             (r1.state !== 'read' || r1.k === r0.k);
  return grade(ok, false, 'total ' + (r1 && r1.a.cal(y)) + ' (was ' + (r0 && r0.a.cal(y)) + ') · curve ' + (r1 && r1.a.curve.k) + ' / ' + (r0 && r0.a.curve.k) +
               ' · so far ' + (r1 && r1.k) + ' / ' + (r0 && r0.k));
});
row('F15', () => {
  const lb = month({ extra: { weight: { latestLb: 180, latestAt: NOW, rateWk: -1, rateDays: 30, goalDir: null, goalRateWk: null } } });
  const kg = { ...lb, u: 'kg' };
  const a = ask(lb, 'ask_fueled'), b = ask(kg, 'ask_fueled');
  const nums = t => (t.match(/[\d,]+ (kcal|g)\b/g) || []).join(',');
  const ok = nums(said(a)) === nums(said(b)) && !/\d ?lb\b/.test(said(b)) && (/\bkg\b/.test(said(b)) || !/\blb\b/.test(said(a)));
  return grade(ok, false, said(a) + ' ‖ ' + said(b));
});
row('F16', () => {
  /* A light morning's food makes readiness's fuel row the third of three
     flags — and the targets answer, which reads the TRAINING rows alone,
     says nothing about it. The two training flags: his start hour (five in
     the afternoon, and it is half past one) and the last session's targets,
     unmet (he never adds the weight). An arms day six days back is
     recovered, so the rest read picks it and recovery is not a flag. */
  const ARMS = [['barbell-curl', 65, 10], ['triceps-pushdown-rope', 50, 12], ['cable-crunch', 60, 15]];
  const ss = [];
  for (let a = 1; a <= 60; a += 6) ss.push(sess(a, UPPER), sess(a + 2, LOWER), sess(a + 5, ARMS));
  const inp = month({ todayScale: 0.3, sessions: ss });
  const c = C.coach(inp);
  const all = c.ask('ask_lighter');
  const readyRows = R.readinessRows(C.readyInput(inp), inp.now);
  const flags = readyRows.filter(x => x.flag).map(x => x.id);
  const fuelRow = F.fuelRow(fuelIn(inp), inp.now);
  const withFood = R.readinessAnswer(readyRows.concat(fuelRow ? [fuelRow] : []));
  const t = c.ask('ask_targets');
  const ok = flags.length === 2 && !R.readinessHeavy(readyRows) && fuelRow && fuelRow.flag && withFood &&
             withFood.text === 'Several things in your log point to a lighter day.' &&
             t.id === 'lift_targets' && !(t.more || []).some(m => /^Several things/.test(m.text));
  return grade(ok, !fuelRow || !fuelRow.flag, 'training flags ' + flags.join(',') + ' · fuel ' + (fuelRow && fuelRow.flag) + ' · readiness: ' +
               (withFood && withFood.text) + ' · targets: ' + said(t).slice(0, 160) + ' · asked: ' + all.id);
});

/* ================= PROPERTIES =================
   Generated months, seeded so every run reads the same ones: real-time,
   batch and mixed loggers, days a little over or under, part-logged days,
   days not logged, days that could not be read, weigh-ins or none, and now at
   any hour from eight in the morning to eleven at night — both units. */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                 return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gen(seed) {
  const r = rng(seed);
  const pattern = r() < 0.6 ? REAL : r() < 0.5 ? BATCH : REAL.map(([h, m, c, g], k) => (k % 2 ? [21, 30 + k, c, g] : [h, m, c, g]));
  const now = localAt(0, 8 + Math.floor(r() * 16), Math.floor(r() * 60));
  const sessions = [];
  const every = 1 + Math.floor(r() * 3);
  for (let a = 1; a <= 60; a += every) sessions.push(sess(a, r() < 0.5 ? UPPER : LOWER, { hour: 7 + Math.floor(r() * 13) }));
  if (r() < 0.4) sessions.push(sess(0, UPPER, { at: now - (1 + Math.floor(r() * 3)) * 3600e3 }));
  const summaries = {}, foodLog = {};
  const days = r() < 0.15 ? 3 : 30;
  for (let a = 1; a <= days; a++) {
    if (r() < 0.1) continue;                                  // not logged at all
    const es = day(a, pattern, 0.6 + r() * 0.8);
    const cal = es.reduce((x, e) => x + e.cal, 0);
    summaries[key(localAt(a, 12))] = { cal: r() < 0.1 ? Math.round(cal * 0.3) : cal, p: 120, c: es.reduce((x, e) => x + e.c, 0), f: 70 };
    if (sessions.some(x => x._date === key(localAt(a, 12))) && r() < 0.85) foodLog[key(localAt(a, 12))] = r() < 0.07 ? null : es;
  }
  const today = day(0, pattern, 0.3 + r() * 1.2).filter(e => e.t <= now);
  if (today.length && r() < 0.9) {
    summaries[key(now)] = { cal: today.reduce((x, e) => x + e.cal, 0), p: 50, c: today.reduce((x, e) => x + e.c, 0), f: 20 };
    foodLog[key(now)] = r() < 0.1 ? null : today;
  }
  const weighIns = [];
  if (r() < 0.6) for (let a = 40; a >= 0; a--) weighIns.push({ lb: 185 + (r() < 0.5 ? -1 : 1) * a * 0.05 + r() * 0.5, t: localAt(a, 6) });
  return input({ now, sessions: sessions.sort((a, b) => a.startedAt - b.startedAt), summaries, foodLog, weighIns, u: seed % 2 ? 'kg' : 'lb',
                 weight: { latestLb: 185, latestAt: now, rateWk: r() < 0.5 ? -0.8 : 0.4, rateDays: 30, goalDir: null, goalRateWk: null },
                 settings: { v: 1, mute: {}, answers: r() < 0.2 ? { q_log_timing: r() < 0.5 ? 'live' : 'later' } : {}, asked: {},
                             ...(r() < 0.3 ? { on: { patterns: true } } : {}) } });
}
const shuffle = (xs, seed) => { const r = rng(seed * 3 + 1), a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const N_GEN = 1500;
/* ================= v53: THE PHASE LINE NAMES ITS CHANGE =================
   SHIP-V53-PROMPT §3.4. Not rows — the battery stays sixteen — but each of
   the four sentences driven, and the later change named when both apply. */
section('F+. v53 — "your change" says which change');
{
  const aimAt = ago => ({ settings: { v: 1, mute: {}, answers: { q_goal_aim: 'cut' }, asked: { q_goal_aim: T13 - ago } } });
  const linesOf = inp => { const r = F.fueledRead(fuelIn(inp), inp.now); return r ? { r, ls: F.dayLines(fuelIn(inp), r) } : { r: null, ls: [] }; };
  const has = (x, re) => x.ls.some(t => re.test(t));
  const aimBefore = linesOf(phaseLog({ weigh: false, extra: aimAt(3 * DAY) }));
  check('his goal changed three days ago: "Your usual here is from before you changed your goal, 3 days ago."',
        aimBefore.r && aimBefore.r.a.phase === 'before' && has(aimBefore, /^Your usual here is from before you changed your goal, 3 days ago\.$/),
        aimBefore.ls.join(' / '));
  const aimToday = linesOf(phaseLog({ weigh: false, extra: aimAt(0) }));
  check('changed today: "… before you changed your goal today."', has(aimToday, /^Your usual here is from before you changed your goal today\.$/),
        aimToday.ls.join(' / '));
  // The weight turn with too few complete days after it to read a new normal.
  const thinAfter = (() => { const x = phaseLog({}); const sums = { ...x.summaries };
    for (let a = 1; a <= 12; a++) delete sums[key(localAt(a, 12))];
    return { ...x, summaries: sums }; })();
  const wBefore = linesOf(thinAfter);
  check('his weight turned, and too little is logged since: "… before your weight trend changed, about 2 weeks ago."',
        wBefore.r && wBefore.r.a.phase === 'before' && has(wBefore, /^Your usual here is from before your weight trend changed, about 2 weeks ago\.$/),
        (wBefore.r && wBefore.r.a.phase) + ' · ' + wBefore.ls.join(' / '));
  const both = linesOf(phaseLog({ extra: aimAt(3 * DAY) }));
  check('both apply: the later one is named — the goal, three days after the turn was read',
        both.r && both.r.a.changedBy === 'aim' && has(both, /you changed your goal, 3 days ago\.$/), both.ls.join(' / '));
  const bothOld = linesOf(phaseLog({ extra: aimAt(20 * DAY) }));
  check('and a goal set before the turn: the turn is named',
        bothOld.r && bothOld.r.a.changedBy === 'weight' && has(bothOld, /since your weight trend changed, \d+ days in\.$/), bothOld.ls.join(' / '));
  check('no line says "your change" any more', ![aimBefore, aimToday, wBefore, both, bothOld].some(x => has(x, /your change\b/)));
}

section('P. properties — ' + N_GEN + ' generated months, both units');
{
  const broke = { deterministic: [], order: [], partial: [], noRead: [], training: [] };
  const states = {};
  const t0 = Date.now();
  for (let seed = 1; seed <= N_GEN; seed++) {
    const h = gen(seed);
    const shot = x => { const c = C.coach(x); const r = F.fueledRead(C.fuelInput(x), x.now);
      return JSON.stringify({ r: r && { state: r.state, verdict: r.verdict, k: r.k, c: r.c, med: r.a.dayMed, curve: r.a.curve, style: r.a.style },
                              a: c.ask('ask_fueled').text, more: (c.ask('ask_fueled').more || []).map(m => m.text) }); };
    const a = shot(h);
    const st = JSON.parse(a).r;
    if (st) states[st.state] = (states[st.state] || 0) + 1;
    if (a !== shot(JSON.parse(JSON.stringify(h)))) broke.deterministic.push(seed);
    // Entries and days in another order.
    const fl = Object.fromEntries(shuffle(Object.keys(h.foodLog), seed).map(k => [k, Array.isArray(h.foodLog[k]) ? shuffle(h.foodLog[k], seed + 1) : h.foodLog[k]]));
    const sm = Object.fromEntries(shuffle(Object.keys(h.summaries), seed + 2).map(k => [k, h.summaries[k]]));
    if (a !== shot({ ...h, foodLog: fl, summaries: sm, sessions: shuffle(h.sessions, seed + 3) })) broke.order.push(seed);
    // A part-logged day added moves no day median.
    if (st && st.med && st.med.n) {
      const empty = [];
      for (let k = 1; k <= 28; k++) { const d = key(localAt(k, 12)); if (!h.summaries[d]) empty.push(d); }
      if (empty.length) {
        const bar = F.fueledRead(C.fuelInput(h), h.now).a.bar;
        const withPart = { ...h, summaries: { ...h.summaries, [empty[0]]: { cal: Math.max(1, Math.floor(bar * 0.6)), p: 10, c: 10, f: 5 } } };
        const r2 = F.fueledRead(C.fuelInput(withPart), withPart.now);
        if (bar && r2 && r2.a.bar === bar && JSON.stringify(r2.a.dayMed) !== JSON.stringify(st.med)) broke.partial.push(seed);
      }
    }
    // Every log absent: no time sentence.
    if (seed % 3 === 0) {
      const none = { ...h, foodLog: {} };
      const c = C.coach(none);
      const words = ['ask_fueled', 'ask_lighter', 'ask_fed_unlogged', 'ask_fed_none'].map(id => said(c.ask(id))).join(' / ');
      if (/so far today|by now|before it;|since your last logged/i.test(words)) broke.noRead.push(seed + ': ' + words.slice(0, 120));
    }
    // Deleting all food changes no target, no rest call, no lift reading.
    if (seed % 5 === 0) {
      const noFood = { ...h, summaries: {}, foodLog: {}, foodFirst: {} };
      const c1 = C.coach({ ...h, settings: { ...h.settings, on: {} } }), c2 = C.coach({ ...noFood, settings: { ...h.settings, on: {} } });
      const targets = c => JSON.stringify((c.build({}) || { exercises: [] }).exercises.map(e => e.target));
      const lines = c => JSON.stringify(c.ask('ask_targets'));
      const rest = x => JSON.stringify(R.restRead(C.readyInput(x), x.now));
      const lifts = c => JSON.stringify(c.ask('ask_lifts'));
      if (targets(c1) !== targets(c2) || lines(c1) !== lines(c2) || rest(h) !== rest(noFood) || lifts(c1) !== lifts(c2)) broke.training.push(seed);
    }
  }
  check('the sweep reaches every state (' + JSON.stringify(states) + ', ' + (Date.now() - t0) + ' ms)',
        ['thin', 'empty', 'unread', 'day', 'read'].every(k => states[k] > 0), JSON.stringify(states));
  check('deterministic: the same month twice is the same read and the same words', !broke.deterministic.length, list(broke.deterministic));
  check('order: entries, days and sessions in any order change nothing', !broke.order.length, list(broke.order));
  check('a part-logged day never moves a day median — it is not a day of his normal', !broke.partial.length, list(broke.partial));
  check('no food log read: not one "so far", "by now" or before-a-session sentence', !broke.noRead.length, list(broke.noRead));
  check('food never changes training: with every day of food gone, the same targets, rest read, lifts and targets answer',
        !broke.training.length, list(broke.training));
}

/* ================= S. THE MUST-NEVER SCAN (SHIP-V52-PROMPT §11) ================= */
section('S. the must-never scan — every string the food half can say, every fixture and month, both units');
{
  const MUST_NEVER = {
    'max attempt': /\b(1\s*rm|one[- ]rep max) (test|attempt)|\bmax(ing)? out\b|\bgo for a (single|max)\b|\btest your max\b/i,
    'causal': /\b(because (you|your)|caused|due to (your|the)|led to|made you|that'?s why|despite|even though)\b/i,
    'body norm': /\b(healthy (weight|range)|bmi|body ?fat|safe rate|too (fat|thin))\b/i,
    'eating': /\beat\b|\b(cut (your )?calories|skip (a )?meal|fast(ed|ing)?\b|carb[- ]?load(ed|ing)?|supplement|under-?fuel)/i,
    'medical': /\b(injur(y|ed)|diagnos|pain\b|push through)\b/i,
    'guilt': /\b(you should have|you missed|slacking|lazy)\b/i,
    'AI': /\b(ai|artificial intelligence|machine learning)\b/i,
    'banned': /\b(hasn[’']t|haven[’']t|didn[’']t|still|only|failed|no progress|stopped moving)\b/i,
    'should': /\bshould\b/i
  };
  const FOODISH = /kcal|carbs|food|logged|fuel|lighter|heavier|usual range|weigh|weight|Noted|Then today|log food/i;
  const said = [];
  const collect = (where, x) => {
    const c = C.coach(x);
    ['ask_fueled', 'ask_fed_unlogged', 'ask_fed_none', 'ask_lighter', 'ask_compare'].forEach(id => {
      const a = c.ask(id);
      if (a.id === id) return;
      [a.text, a.reason].concat((a.more || []).flatMap(m => [m.text, m.reason])).filter(Boolean).forEach(t => said.push({ where: where + '/' + id, u: x.u, t }));
      if (a.question) { said.push({ where: where + '/q', u: x.u, t: a.question.text }); said.push({ where: where + '/q', u: x.u, t: a.question.ack }); }
    });
    const fi = C.fuelInput(x), r = F.fueledRead(fi, x.now);
    if (r && r.state !== 'thin') {
      F.dayLines(fi, r).forEach(t => said.push({ where: where + '/day', u: x.u, t }));
      const fr = F.fuelRow(fi, x.now); if (fr && fr.text) said.push({ where: where + '/row', u: x.u, t: fr.text });
      const last = C.overlapInput(x).shaped.slice(-1)[0];
      if (last) F.sessionFoodRows(fi, last, x.now).forEach(rw => said.push({ where: where + '/diff', u: x.u, t: rw.text }));
    }
  };
  const fixtures = { month: month(), light: month({ todayScale: 0.4 }), heavy: month({ todayScale: 1.5 }), empty: month({ today: false }),
                     batch: month({ pattern: BATCH, todayPattern: BATCH, now: localAt(0, 23) }), phase: phaseLog({}),
                     post: postLog({ scale: 1.1, food: 0.3 }), postBelow: postLog({ scale: 0.85, food: 1 }),
                     thin: input({ sessions: [sess(2, UPPER)] }), partial: month({ scaleOf: a => (a === 1 ? 900 / 2500 : 1) }) };
  Object.entries(fixtures).forEach(([n, x]) => ['lb', 'kg'].forEach(u => collect(n, { ...x, u })));
  for (let seed = 1; seed <= 300; seed++) collect('gen' + seed, gen(seed));
  const hits = [];
  said.forEach(x => {
    Object.entries(MUST_NEVER).forEach(([name, re]) => { if (re.test(x.t)) hits.push(x.where + ' [' + name + '] ' + x.t); });
    if (/\blow\b/i.test(x.t) && FOODISH.test(x.t)) hits.push(x.where + ' [low food] ' + x.t);
    if (x.u === 'kg' && /\b\d+(\.\d+)? ?lb\b/.test(x.t)) hits.push(x.where + ' [stray pounds] ' + x.t);
    if (/'/.test(x.t)) hits.push(x.where + ' [straight apostrophe] ' + x.t);
    if (/!/.test(x.t)) hits.push(x.where + ' [exclamation] ' + x.t);
  });
  check('the scan read ' + said.length + ' strings, both units, every state of the read', said.length > 2000 && said.some(x => x.u === 'kg'), String(said.length));
  check('not one says what or how much to eat, names a cause, a body norm, a medical word, "low" of food, "AI", "should" or a pound on kilos',
        !hits.length, list(hits));
  const FSRC = src('coach-fuel.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const lits = [...FSRC.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(m => m[1]).filter(t => / /.test(t));
  const srcHits = lits.filter(t => Object.values(MUST_NEVER).some(re => re.test(t)) || /\blow\b/i.test(t));
  check('and the same in every sentence written into coach-fuel.js, reached or not', !srcHits.length, list(srcHits));
  check('no food is ever named: coach-fuel.js reads kcal, protein and carbs, and never an entry’s name',
        !/\.name\b|\bname:/.test(FSRC));
}

/* ---------- the battery, scored ---------- */
section('the battery — ok / miss / wrong');
{
  battery.forEach(b => results.push('  ' + (b.v === 'ok' ? '✓' : b.v === 'miss' ? '·' : '✗') + ' ' + b.id + ' [' + b.v + '] ' + b.said.slice(0, 360)));
  const n = v => battery.filter(b => b.v === v).length;
  results.push('\n  ok: ' + n('ok') + '   miss: ' + n('miss') + '   wrong: ' + n('wrong'));
  check('wrong: 0 — no row reads food the row does not, prescribes, or says unlogged is zero', n('wrong') === 0,
        battery.filter(b => b.v === 'wrong').map(b => b.id).join(', '));
}

console.log('\nfood read out against his own normal, and never prescribed\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
