// Coach's fuel read — "Am I fueled?", and the food rows beside readiness and a
// session.
//
// Stage four, the food half (v52, Phase B). The one stage that reads food, the
// one with the weakest science behind it, and the one most at risk of saying
// more than the data supports. So:
//
//   COACH READS OUT FOOD AND NEVER PRESCRIBES IT. What he logged, against his
//   own normal, and nothing after it: never what or how much to eat, never a
//   food by name, never "fasted" as advice, never "carb-loaded" (Micah's
//   decision #11), and only his own data (#7). The strongest word here is
//   "lighter than usual".
//   UNLOGGED IS NEVER ZERO. A half-logged day is "not fully logged", never low;
//   a day that could not be read is left out, never guessed; and while the
//   day's summary says food was logged, nothing here says it was not.
//   DIFFERENCES, NEVER CAUSES. A session's food rows are what sat past his own
//   spread, either way, and nothing here says what they did.
//   `t` IS WHEN AN ENTRY WAS LOGGED, not when it was eaten. Every time-of-day
//   read uses only entries whose `t` falls on the log's own date — a dinner
//   logged the next morning still counts in its day's total, and in no time
//   read — and every one of them stands down for somebody who logs in batches:
//   "nothing logged before your 5 pm session" is false of a 10 pm logger.
//
// PURE, and copied into the native tree verbatim. No reads, no DOM, no module
// state, no clock: `now` is an argument. Imports coach-goal.js (bodyweight at a
// moment, and the energy bands) and units.js, and NOTHING ELSE — it never sees
// coach-ready.js, and coach-ready.js never sees it: coach.js merges their rows,
// so food can change no rest call, no window, no target and no lift reading.
//
// THE INPUT, as coach.js builds it (fuelInput):
//
//   now, u      the clock of the coach() call, and the display unit
//   summaries   food/daySummaries, already in memory: { date: { cal, p, c, f } }
//   foodLog     the dates read so far: { date: [{ t, cal, p, c }] | null }. Null
//               is read and unreadable; a date that is absent was not read
//   sessions    the shaped sessions: startedAt, date, and the record
//   weighIns    [{ lb, t }]
//   aim, aimSetAt, logTiming ('live' | 'later' | null), goalDir, rateWk, energy
//   patterns    the Patterns lines this file may quote, worded as Patterns words
//               them — { fedBeforeTop, caloriesBeforeTop } — or null (off)

import { bwAt, energyBand } from './coach-goal.js';
import { labelRate } from './units.js';

const DAY = 864e5;

/* ---------- the numbers, each with its reason ----------
   None of these is ever printed as a threshold. */

// The four weeks a food normal is read over, and the five days with food in
// them before a day can be called complete at all.
const RECENT_DAYS = 28;
const RECENT_MIN = 5;
// A complete day: half his usual day or more. A half-logged day would pull
// every average down and make an under-logged day read as an under-fed one;
// the cost — a real very light day left out as "partial" — is deliberate.
const COMPLETE_SHARE = 0.5;
// His day's normal: a week of complete days before it is one ("learning"),
// three weeks before it is his ("yours").
const DAY_LEARNING = 7;
const DAY_YOURS = 21;
// A new phase — his weight turned, or he changed his aim — is read on its own
// once it has a week of complete days, and is "new" until three.
const PHASE_MIN = 7;
const PHASE_NEW = 21;
const AIM_PHASE_DAYS = 28;
// The by-hour curve on training days: the bar Patterns puts under a
// comparison (eight), and fourteen before it is his.
const CURVE_LEARNING = 8;
const CURVE_YOURS = 14;
// Real-time logging spreads a day's entries over four hours or more; a batch
// puts them all in within the hour. Six such days before the account is
// called one or the other.
const REALTIME_MS = 4 * 36e5;
const BATCH_MS = 60 * 6e4;
const STYLE_MIN = 6;
// "Lighter than usual" needs both: under 70% of his usual by this hour AND
// under his own quicker quarter. "Heavier" the same the other way.
const LIGHTER = 0.7;
const HEAVIER = 1.3;
// Two days of carbs, against the usual on his training days: seven such
// days, and a fifth either way before it is said.
const CARBS48_MIN = 7;
const CARBS48_SHARE = 0.2;
// A session's food rows: a robust z past 1.5 either way, against eight or more
// of his earlier read training days with some spread among them.
const Z_BAR = 1.5;
const Z_MIN_REF = 8;
const MAD_K = 1.4826;

/* ================================================================
   SMALL THINGS
   ================================================================
   Private copies of the date helpers every Coach file keeps its own, and of
   the one quantile (coach-overlap.js's), because this file imports neither
   coach.js nor coach-overlap.js and is copied on its own. */
function noon(ms) { const d = new Date(ms); d.setHours(12, 0, 0, 0); return d.getTime(); }
function midnight(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
function daysBetween(fromMs, toMs) { return Math.round((noon(toMs) - noon(fromMs)) / DAY); }
function dayKey(ms) {
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
// Date keys as calendar day numbers, read in UTC off the key: whole days
// between two dates in every zone, without a Date parsed per key.
const dnum = k => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / DAY;
const nkey = n => { const d = new Date(n * DAY), p = x => String(x).padStart(2, '0');
                    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()); };
const back = (k, n) => nkey(dnum(k) - n);
function median(xs) {
  const v = xs.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
function quantile(xs, q) {
  const v = xs.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const pos = (v.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}
const sum = xs => xs.reduce((a, x) => a + x, 0);
const int = n => Math.round(n).toLocaleString();
const plural = (n, word) => n + ' ' + word + (Number(n) === 1 ? '' : 's');
// Where in its own day a moment falls, in ms since that day's midnight.
const tod = ms => ms - midnight(ms);

// The memo that rides on the input, as coach-ready.js's and
// coach-overlap.js's do: not module state — it dies with the input.
function memo(i, k, fn) {
  if (!i || typeof i !== 'object') return fn();
  if (!i._fuel) Object.defineProperty(i, '_fuel', { value: new Map(), enumerable: false });
  if (!i._fuel.has(k)) i._fuel.set(k, fn());
  return i._fuel.get(k);
}

// A read date's entries whose `t` falls on that date — the only ones any time
// read may use.
function sameDate(i, date) {
  const log = i.foodLog && Object.prototype.hasOwnProperty.call(i.foodLog, date) ? i.foodLog[date] : undefined;
  if (!Array.isArray(log)) return log;
  return log.filter(e => e && Number.isFinite(e.t) && dayKey(e.t) === date);
}
const kcal = es => sum(es.map(e => Number(e.cal) || 0));
const carbs = es => sum(es.map(e => Number(e.c) || 0));

/* ================================================================
   1.  WHAT HE LOGGED, AGAINST HIS OWN NORMAL (§8.1–8.4)
   ================================================================ */
function readAll(i, now) {
  const sums = i.summaries && typeof i.summaries === 'object' ? i.summaries : {};
  const today = dayKey(now);
  const cal = d => (sums[d] && Number.isFinite(sums[d].cal) ? sums[d].cal : 0);

  // §8.1 Complete days.
  const recent = [];
  for (let k = 1; k <= RECENT_DAYS; k++) { const d = back(today, k); if (cal(d) > 0) recent.push(d); }
  const bar = recent.length >= RECENT_MIN ? COMPLETE_SHARE * median(recent.map(cal)) : null;
  const complete = d => bar != null && d !== today && cal(d) >= bar;
  const partial = d => bar != null && cal(d) > 0 && cal(d) < bar;
  const days28 = recent.filter(complete);

  // §8.2 The food phase: his weight turned, or he changed his aim.
  const cls = [];
  for (let k = 0; k < 4; k++) {
    const end = now - 7 * k * DAY, start = end - 7 * DAY;
    const a = bwAt(i.weighIns, start), b = bwAt(i.weighIns, end);
    const band = a && b ? energyBand((b - a) / a * 100) : null;
    cls.push(band == null ? null : band === 'deep' || band === 'deficit' ? 'loss' : band === 'hold' ? 'hold' : 'gain');
  }
  let changedAt = cls[0] && cls[0] === cls[1] && cls[2] && cls[2] === cls[3] && cls[2] !== cls[0] ? now - 14 * DAY : null;
  // v53: and which change it was, so the line can name it — the later of
  // the two when both apply, his aim on a tie.
  let changedBy = changedAt == null ? null : 'weight';
  if (Number.isFinite(i.aimSetAt) && i.aimSetAt <= now && daysBetween(i.aimSetAt, now) <= AIM_PHASE_DAYS &&
      (changedAt == null || i.aimSetAt >= changedAt)) {
    changedAt = i.aimSetAt;
    changedBy = 'aim';
  }
  const phaseDays = changedAt == null ? null : days28.filter(d => dnum(d) > dnum(dayKey(changedAt)));
  const inPhase = !!phaseDays && phaseDays.length >= PHASE_MIN;
  const use = inPhase ? phaseDays : days28;
  const phase = changedAt == null ? null : inPhase ? (phaseDays.length < PHASE_NEW ? 'new' : null) : 'before';

  // §8.3 His day's normal.
  const dayStage = use.length < DAY_LEARNING ? 'none' : use.length < DAY_YOURS ? 'learning' : 'yours';
  const dayMed = { kcal: median(use.map(cal)), p: median(use.map(d => sums[d].p || 0)), c: median(use.map(d => sums[d].c || 0)),
                   q25: quantile(use.map(cal), 0.25), q75: quantile(use.map(cal), 0.75), n: use.length };

  // §8.4 How he logs.
  const training = new Set((Array.isArray(i.sessions) ? i.sessions : []).filter(s => s && Number.isFinite(s.startedAt) && s.startedAt <= now)
    .map(s => s.date || dayKey(s.startedAt)));
  const readDates = Object.keys(i.foodLog || {}).filter(d => Array.isArray(i.foodLog[d]));
  const styleOf = d => {
    if (!complete(d)) return null;
    const es = sameDate(i, d);
    if (!Array.isArray(es) || es.length < 2) return null;
    const ts = es.map(e => e.t), spread = Math.max(...ts) - Math.min(...ts);
    return spread >= REALTIME_MS ? 'real' : spread <= BATCH_MS ? 'batch' : 'neither';
  };
  const judged = readDates.map(styleOf).filter(Boolean);
  const style = i.logTiming === 'live' ? 'real' : i.logTiming === 'later' ? 'batch'
    : judged.length >= STYLE_MIN ? (judged.filter(x => x === 'batch').length * 2 >= judged.length ? 'batch' : 'real') : 'unknown';
  const detected = judged.length >= STYLE_MIN ? (judged.filter(x => x === 'batch').length * 2 >= judged.length ? 'batch' : 'real') : 'unknown';

  // §8.3 The by-hour curve: his read, complete, real-time training days, each
  // up to now's time of day.
  const at = tod(now);
  const curveDays = readDates.filter(d => d !== today && training.has(d) && styleOf(d) === 'real');
  const soFarOn = d => { const es = sameDate(i, d).filter(e => tod(e.t) <= at); return { k: kcal(es), c: carbs(es) }; };
  const curvePts = curveDays.map(soFarOn);
  const curve = { n: curvePts.length, stage: curvePts.length < CURVE_LEARNING ? 'none' : curvePts.length < CURVE_YOURS ? 'learning' : 'yours',
                  k: median(curvePts.map(x => x.k)), c: median(curvePts.map(x => x.c)),
                  q25: quantile(curvePts.map(x => x.k), 0.25), q75: quantile(curvePts.map(x => x.k), 0.75) };

  // §8.3 Two days of carbs before a date, both complete, and its usual over
  // his training days in the four weeks.
  const carbs48 = d => { const a = back(d, 1), b = back(d, 2);
    return complete(a) && complete(b) ? (sums[a].c || 0) + (sums[b].c || 0) : null; };
  const c48ref = [...training].filter(d => { const a = dnum(today) - dnum(d); return a >= 1 && a <= RECENT_DAYS; }).map(carbs48).filter(v => v != null);
  const c48 = { now: carbs48(today), med: c48ref.length >= CARBS48_MIN ? median(c48ref) : null, n: c48ref.length };

  const changedDays = changedAt == null ? null : daysBetween(changedAt, now);
  return { today, sums, cal, recent, bar, complete, partial, days28, changedAt, changedBy, changedDays, phase, phaseDays, dayStage, dayMed,
           training, readDates, style, detected, curve, curveDays, c48, carbs48, sameDate: d => sameDate(i, d) };
}

/* ================================================================
   2.  "AM I FUELED?" (§8.5)
   ================================================================
   fueledRead(input, now) -> { state, … }, first match wins:

     thin     fewer than five days with food in the four weeks
     empty    today's summary shows nothing, and today's log is not read,
              could not be read, or holds nothing logged today by now
     unread   today's summary shows food, and today's log is not read, could
              not be read, or holds nothing logged today — never "nothing
              logged" while the summary says something was
     day      he logs in batches, or Coach does not know yet, or the curve is
              too young: the day's totals, never the hour's
     read     so far today against the curve at this hour: lighter, heavier,
              or about his usual */
export function fueledRead(input, now) {
  try {
    const i = input || {};
    return memo(i, 'read|' + now, () => readFuel(i, now));
  } catch {
    return null;
  }
}

function readFuel(i, now) {
  if (!Number.isFinite(now)) return null;
  const a = readAll(i, now);
  const base = { a, n: a.recent.length };
  if (a.recent.length < RECENT_MIN) return { ...base, state: 'thin' };
  const log = a.sameDate(a.today);
  const byNow = Array.isArray(log) ? log.filter(e => e.t <= now) : [];
  const summed = a.cal(a.today) > 0;
  if (!summed && (!Array.isArray(log) || !byNow.length)) return { ...base, state: 'empty' };
  if (summed && (!Array.isArray(log) || !log.length)) return { ...base, state: 'unread' };
  if (a.style !== 'real' || a.curve.stage === 'none') return { ...base, state: 'day' };
  const k = kcal(byNow), c = carbs(byNow);
  const u = a.curve;
  const verdict = k < LIGHTER * u.k && k < u.q25 ? 'lighter' : k > HEAVIER * u.k && k > u.q75 ? 'heavier' : 'usual';
  return { ...base, state: 'read', verdict, k, c };
}

/* The answer's sentences. None of them trips the ban, "eat" or "low", and the
   strongest verdict is "lighter than usual" with no instruction after it. */
const REASON = 'Going by when you logged it. Coach reads what’s logged, and food advice isn’t part of what it does.';

// The day lines, each only when it has data. `cutWord`: "cut" is his word —
// aim Lose fat or Recomp, or food targets set to lose — and nobody else's.
export function dayLines(input, read) {
  const i = input || {}, a = read.a, u = i.u === 'kg' ? 'kg' : 'lb';
  const out = [];
  const y = back(a.today, 1);
  if (a.complete(y) && a.dayStage !== 'none') {
    out.push(a.cal(y) < a.dayMed.q25
      ? 'Yesterday was on the light side for you: ' + int(a.cal(y)) + ' kcal against a usual ' + int(a.dayMed.kcal) + '.'
      : 'Yesterday was in your usual range.');
  } else if (a.partial(y)) out.push('Yesterday wasn’t fully logged.');
  if (a.c48.now != null && a.c48.med != null && Math.abs(a.c48.now - a.c48.med) >= CARBS48_SHARE * a.c48.med) {
    out.push('The last two days were ' + (a.c48.now < a.c48.med ? 'lower' : 'higher') + '-carb than your usual: ' +
             int(a.c48.now) + ' g against about ' + int(a.c48.med) + ' g.');
  }
  const r = Number.isFinite(i.rateWk) ? i.rateWk : null;
  const cutWord = i.aim === 'cut' || i.aim === 'recomp' || i.goalDir === -1;
  if (i.energy === 'hold') out.push('Your weight is holding steady.');
  else if ((i.energy === 'deep' || i.energy === 'deficit') && r != null && r < 0) {
    out.push(cutWord ? 'You’re in a cut, and your weight is coming down about ' + labelRate(-r, u) + ' a week.'
                     : 'Your weight is coming down about ' + labelRate(-r, u) + ' a week.');
  } else if (i.energy === 'surplus' && r != null && r > 0) out.push('Your weight is going up about ' + labelRate(r, u) + ' a week.');
  /* v53: the change named — "your change" said nothing about which one. The
     weight turn is read two weeks each way, so its date is "about 2 weeks
     ago"; the aim's is the day he set it. */
  const since = a.changedBy === 'aim' ? 'you changed your goal' : 'your weight trend changed';
  if (a.phase === 'new') out.push('Coach is learning your new normal since ' + since + ', ' + plural(a.dayMed.n, 'day') + ' in.');
  else if (a.phase === 'before') {
    const n = a.changedDays;
    out.push('Your usual here is from before ' + since + (a.changedBy !== 'aim' ? ', about 2 weeks ago.'
      : n < 1 ? ' today.' : ', ' + plural(n, 'day') + ' ago.'));
  }
  else if (a.dayStage === 'learning') out.push('Coach is learning your normal (' + plural(a.dayMed.n, 'day') + ' so far).');
  const p = i.patterns || null;
  const t2 = p ? p.fedBeforeTop || p.caloriesBeforeTop || null : null;
  if (t2) out.push(t2);
  return out;
}

/* "Am I fueled?" — the state's line, then the day lines. */
export function fuelAnswer(input, read) {
  const r = read, a = r.a;
  const more = s => s.map(t => ({ text: t, reason: '' }));
  if (r.state === 'thin') {
    return { text: 'Coach reads fuel from your food log, and there isn’t enough in it yet (' + plural(r.n, 'day') + ').',
             reason: 'Five days with food logged in the last four weeks, before Coach can tell a fully logged day from a part-logged one.', more: [] };
  }
  if (r.state === 'empty') return { text: 'Nothing logged today yet.', reason: REASON, more: [] };
  if (r.state === 'unread') {
    return { text: 'Coach couldn’t read today’s food log just now.', reason: REASON, more: more(dayLines(input, r)) };
  }
  if (r.state === 'day') {
    const why = a.style === 'batch'
      ? 'Most of your entries go in together, later, so the hours they were logged say nothing about the day’s timing.'
      : 'Coach is learning when you usually log food on training days (' + a.curve.n + ' of ' + CURVE_LEARNING + ' days so far).';
    return { text: 'Coach reads your food by the day, not the hour.', reason: REASON,
             more: more(dayLines(input, r)).concat({ text: why, reason: '' }) };
  }
  const head = r.verdict === 'lighter' ? 'Lighter than usual' : r.verdict === 'heavier' ? 'Heavier than usual' : 'About usual';
  return {
    text: head + ' so far today. You’ve logged ' + int(r.k) + ' kcal and ' + int(r.c) + ' g of carbs; by now on a training day you usually have about ' +
          int(a.curve.k) + ' and ' + int(a.curve.c) + ' (' + plural(a.curve.n, 'day') + ').',
    reason: REASON, more: more(dayLines(input, r))
  };
}

/* The two follow-ups to "Nothing logged today yet." Nothing either says is
   stored: an answer about whether he has eaten is used once and dropped
   (Micah's decision #9). */
export function fedUnloggedAnswer(input, read) {
  return { text: 'Then today isn’t in your log yet, so Coach can’t read it.', reason: REASON,
           more: dayLines(input, read).map(t => ({ text: t, reason: '' })) };
}
export function fedNoneAnswer(input, read) {
  const i = input || {};
  const more = dayLines({ ...i, patterns: null }, read).filter(t => /^(Your weight|You’re in a cut)/.test(t));
  const p = i.patterns && i.patterns.fedBeforeTop;
  if (p) more.push(p);
  return { text: 'Noted. That’s for this answer; nothing is saved.', reason: REASON, more: more.map(t => ({ text: t, reason: '' })) };
}

/* WHICH DAYS' FOOD LOGS THE READ NEEDS (§9), newest first: today, the
   latest session's date, then the most recent complete training dates in the
   four weeks before today — fifteen at most. Here beside the completeness
   bar it reads, so the gatherer (coach-data.js, through coach.js's
   fuelDays) reads what this file asks for and nothing more. */
export const FUEL_DATES_MAX = 15;
export function fuelDates(input, now) {
  try {
    const i = input || {};
    const a = readAll(i, now);
    const out = [a.today];
    const ss = (Array.isArray(i.sessions) ? i.sessions : []).filter(s => s && Number.isFinite(s.startedAt) && s.startedAt <= now);
    if (ss.length) {
      const last = ss.reduce((x, y) => (y.startedAt > x.startedAt ? y : x));
      const d = last.date || dayKey(last.startedAt);
      if (!out.includes(d)) out.push(d);
    }
    [...a.training].filter(d => { const k = dnum(a.today) - dnum(d); return k >= 1 && k <= RECENT_DAYS && a.complete(d); })
      .sort().reverse().forEach(d => { if (!out.includes(d)) out.push(d); });
    return out.slice(0, FUEL_DATES_MAX);
  } catch {
    return [];
  }
}

/* ================================================================
   3.  THE FOOD ROWS (§8.6)
   ================================================================
   Readiness gains one row; a session gains up to five, in either direction.
   Their shapes are coach-ready.js's, so coach.js can merge the two without
   either module seeing the other. */
export function fuelRow(input, now) {
  const r = fueledRead(input, now);
  if (!r || r.state === 'thin' || r.state === 'empty' || r.state === 'unread') return null;
  const a = r.a;
  const y = back(a.today, 1);
  const yLight = a.complete(y) && a.dayStage !== 'none' && a.cal(y) < a.dayMed.q25;
  const has = r.state === 'read' || (r.state === 'day' && a.complete(y));
  const flag = has && (r.verdict === 'lighter' || yLight);
  const text = r.verdict === 'lighter'
    ? 'Less food logged by now than usual: ' + int(r.k) + ' kcal against about ' + int(a.curve.k) + '.'
    : yLight ? 'Yesterday was on the light side for you: ' + int(a.cal(y)) + ' kcal against a usual ' + int(a.dayMed.kcal) + '.' : '';
  return { id: 'fuel', has, flag, text };
}

export function sessionFoodRows(input, session, now) {
  try {
    const i = input || {};
    if (!session || !Number.isFinite(session.startedAt)) return [];
    const r = fueledRead(i, now);
    if (!r || r.state === 'thin') return [];
    return foodRows(i, r.a, session);
  } catch {
    return [];
  }
}

function robust(x, ref) {
  if (x == null || ref.length < Z_MIN_REF) return null;
  const med = median(ref);
  const mad = median(ref.map(v => Math.abs(v - med)));
  if (!(mad > 0)) return null;
  return { z: (x - med) / (MAD_K * mad), med };
}
const row = (id, z, text) => ({ id, z, kept: Math.abs(z) >= Z_BAR, text });

function foodRows(i, a, S) {
  const date = S.date || dayKey(S.startedAt);
  const firstOn = d => {
    const ss = (Array.isArray(i.sessions) ? i.sessions : []).filter(s => s && (s.date || dayKey(s.startedAt)) === d && Number.isFinite(s.startedAt));
    return ss.length ? Math.min(...ss.map(s => s.startedAt)) : null;
  };
  // What was logged on a date before a moment, that date's entries alone.
  const before = (d, at) => { const es = a.sameDate(d); return Array.isArray(es) ? es.filter(e => e.t < at) : null; };
  const measure = (d, at) => {
    const es = before(d, at);
    if (!es) return null;
    const last = es.length ? Math.max(...es.map(e => e.t)) : null;
    return { k: kcal(es), c: carbs(es), h: last == null ? null : (at - last) / 36e5 };
  };
  const rows = [];
  // Earlier read training dates, as of their first session.
  const ref = a.readDates.filter(d => d !== date && dnum(d) < dnum(date) && a.training.has(d) && a.complete(d))
    .map(d => { const at = firstOn(d); return at != null ? measure(d, at) : null; }).filter(Boolean);
  if (a.style === 'real') {
    const x = measure(date, S.startedAt);
    if (x) {
      const kz = robust(x.k, ref.map(m => m.k));
      if (kz) rows.push(row('before', kz.z, 'You’d logged about ' + int(x.k) + ' kcal before it; usually about ' + int(kz.med) + '.'));
      const cz = robust(x.c, ref.map(m => m.c));
      if (cz) rows.push(row('carbs', cz.z, 'About ' + int(x.c) + ' g of carbs logged before it; usually about ' + int(cz.med) + ' g.'));
      const hz = x.h != null ? robust(x.h, ref.map(m => m.h).filter(v => v != null)) : null;
      if (hz) rows.push(row('since', hz.z, 'About ' + plural(Math.round(x.h), 'hour') + ' since your last logged entry; usually about ' + Math.round(hz.med) + '.'));
    }
  }
  // The day before, complete only, against his complete days.
  const y = back(date, 1);
  if (a.complete(y)) {
    const refDays = [];
    for (let k = 2; k <= RECENT_DAYS + 1; k++) { const d = back(date, k); if (a.complete(d)) refDays.push(a.cal(d)); }
    const yz = robust(a.cal(y), refDays);
    if (yz) rows.push(row('yesterday', yz.z, 'The day before came to ' + int(a.cal(y)) + ' kcal; usually about ' + int(yz.med) + '.'));
  }
  // Two days of carbs before it, against his training days' own.
  const x48 = a.carbs48(date);
  if (x48 != null) {
    const ref48 = [...a.training].filter(d => d !== date && dnum(d) < dnum(date) && dnum(date) - dnum(d) <= RECENT_DAYS)
      .map(a.carbs48).filter(v => v != null);
    const z48 = robust(x48, ref48);
    if (z48) rows.push(row('carbs48', z48.z, 'The two days before had ' + int(x48) + ' g of carbs; usually about ' + int(z48.med) + ' g.'));
  }
  return rows;
}
