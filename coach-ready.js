// Coach's rest read — recovery, the big day, and what was different about a day.
//
// Stage four, the training half (v52). Three questions a trainer answers
// before a set is lifted, and one after:
//
//   "What should I train today?" learns to say REST, or GO LIGHTER, when the
//   log says so — and otherwise picks what is RECOVERED, never simply what has
//   waited longest. A group trained hard yesterday is not the group to train
//   today, however long the rest of the shape has waited.
//   "Should I rest or go lighter?" is readiness: a list of what is off his own
//   normal today, never a score.
//   "How did today compare?" lists what was DIFFERENT about the day — in both
//   directions, whether or not it fits the result — and never a cause.
//
// FOUR RULES, each a line in this file:
//
//   REST IS ADVICE, NEVER A LOCK. Every rest or caution answer leaves a way on
//   (coach.js adds "Train anyway" and "Build … anyway"); this file only reads.
//   DIFFERENCES, NEVER CAUSES. A session's rows are the components that sat
//   past his own spread either way, and nothing here says why.
//   A GROUP'S RECOVERY IS HIS OWN. Its window is the quick end of his own gaps
//   between training it, longer after a day big against HIS normal — never a
//   population's. Until four days of it are in the log the window is a
//   labelled common starting point (T3), and every sentence says so.
//   SILENCE IS ALWAYS A CORRECT ANSWER. Under every minimum, null.
//
// FOOD-BLIND BY CONSTRUCTION. This file never imports coach-fuel.js, so no
// rest call, window, pick or training row can move with what he ate. coach.js
// merges the two modules' rows; neither sees the other.
//
// RECOVERY COUNTS WHOLE LIFTING SETS (lsets): working sets from exercises
// whose equipment is not cardio. The shipped `sets` count files a treadmill
// under legs, and a walk is not a leg day. Everything else here that says
// "sets" — the fatigue flag, readiness, a session's week — reads the SHIPPED
// sets, so "sets this week" is one number on every screen.
//
// THE REPLAY REPORTS AND ADJUSTS NOTHING. It asks, of each of the last twelve
// weeks' mornings, whether the rest read would have said rest or lighter then,
// and what he did — and says so, with its counts, inside the rest answers. It
// never changes a window, a sign or a call: the card, the builder's default and
// the sheet must read the same call, and a learned adjustment would need a
// cache all three read (BACKLOG).
//
// PURE, and copied into the native tree verbatim. No reads, no DOM, no module
// state, no clock: `now` is an argument. A memo rides on the input as a
// non-enumerable property, the way coach-overlap.js's prepare() keeps one.
// It is handed what coach.js owns — the shaped sessions, today's recurring
// shapes, the performance log's lifts, the goal and energy context — and it
// never clusters shapes and never counts exposures of its own. Imports
// coach-prog.js (a lift's status), coach-overlap.js (the one weeks rule, the
// one quantile, a session compared, a target replayed), coach-goal.js
// (bodyweight at a moment), coach-live.js (REP_DROP, for the words that say
// it), units.js and exercises.js. coach.js imports this; nothing imports back.
//
// THE INPUT, as coach.js builds it (readyInput):
//
//   now       the clock of the coach() call
//   u         'lb' | 'kg'
//   overlap   coach-overlap.js's prepared input: `shaped` (every session, each
//             with sets, fsets, lsets, lfsets, ldrop, groups, signature, date
//             and the record under `session`), `lifts` (the performance log —
//             his marked sessions out — each with its exposures), weighIns,
//             energy, rateWk, targetsOn
//   shapes    today's recurring shapes, each carrying the shipped `stalest`
//             (session.shapeOverdue's reading of it), or null for none
//   overdue   the shipped overdue shape — what `.skipped` names — or null
//   marked    the Set of session ids he has marked

import { baselines } from './coach-prog.js';
import { quantile, blocksOf, lightOf, compareSession, targetsReplay } from './coach-overlap.js';
import { bwAt } from './coach-goal.js';
import { REP_DROP } from './coach-live.js';
import { labelW, labelRate } from './units.js';
import { GROUPS, GROUP_ORDER } from './exercises.js';

const DAY = 864e5;

/* ---------- the numbers, each with its reason ----------
   None of these is ever printed as a threshold. */

// The twelve weeks every Coach derivation reads.
const WINDOW_DAYS = 84;
// Six sessions in the window, the headline finding's own gate: fewer and
// there is no habit to recover against.
const MIN_SESSIONS = 6;
// Four training days of a group is three gaps, the fewest a median of them
// can be; eight is two months of a twice-a-week group — "yours".
const STAGE_LEARNING = 4;
const STAGE_YOURS = 8;
// The labelled starting windows (T3), until four days of a group are in: two
// days, and three after a big day.
const T3_WINDOW = 2;
const T3_BIG_WINDOW = 3;
// A big day, against HIS normal and above a floor: half as many sets again
// and four more (so three against a usual two is not big); twice his usual
// failures, two at least; a quarter's rep drop on twice his usual number of
// lifts, two at least. Someone who always takes three sets to failure has
// every day big without the "his usual" half.
const BIG_SETS_SHARE = 1.5;
const BIG_SETS_MORE = 4;
const BIG_FLOOR = 2;
const BIG_SHARE = 2;
// The window's quick end: the 25th percentile of his gaps.
const WINDOW_Q = 0.25;
// His usual longest run: the 90th percentile of his runs, which needs five
// runs and eight weeks of log before it is a habit.
const RUN_Q = 0.9;
const RUN_MIN = 5;
const RUN_HISTORY_DAYS = 56;
// The fatigue flag's signs: sets in seven days at 1.3× his usual week (four
// whole weeks); F sets at twice his usual share, three at least (eight whole
// weeks); two lifts declining; a run past his usual longest. Two signs, or
// no flag — one sign is a day, two are a pattern.
const LOAD_SHARE = 1.3;
const LOAD_WEEKS = 4;
const FAIL_SETS = 3;
const FAIL_SHARE = 2;
const FAIL_WEEKS = 8;
const DECLINE_DAYS = 28;
const FLAG_SIGNS = 2;
// Readiness: three rows with data, or it says nothing.
const READY_ROWS = 3;
const LIFTS_DAYS = 42;
const LIFTS_EXPOSURES = 4;
// A weigh-in 1.5% under his last week is a drop worth naming — and most often
// water, which the row says.
const WEIGH_SHARE = 0.985;
const WEIGH_PCT = 1.5;
// Start times: twelve sessions before there is a usual, read as his 10th to
// 90th percentile.
const TIME_SESSIONS = 12;
const TIME_LO = 0.1;
const TIME_HI = 0.9;
// What was different: a robust z past 1.5 either way, against eight or more
// of his own earlier sessions with some spread among them. Three kept.
const Z_BAR = 1.5;
const Z_MIN_REF = 8;
const MAD_K = 1.4826;
const SESSION_ROWS = 3;
// The replay: the last twelve weeks of mornings; three flagged days before
// the rested line, four trained through before either of the other two.
const REPLAY_DAYS = 84;
const REPLAY_FLAGGED = 3;
const REPLAY_THROUGH = 4;
const HELD_SHARE = 0.75;
const BELOW_SHARE = 0.5;

/* ================================================================
   SMALL THINGS
   ================================================================
   Private copies of coach.js's noon-anchored day count and date key, for the
   reason every Coach file keeps its own: this module is copied on its own. */
function noon(ms) { const d = new Date(ms); d.setHours(12, 0, 0, 0); return d.getTime(); }
function midnight(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
function daysBetween(fromMs, toMs) { return Math.round((noon(toMs) - noon(fromMs)) / DAY); }
function dayKey(ms) {
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
/* A date key's calendar day number, read in UTC off the key itself: the
   difference between two is the whole days between the two dates — exactly
   coach.js groupGap()'s noon-to-noon count, in every zone and across a clock
   change — without a Date parsed per key. A card paint reads a few hundred
   of them, and parsing each was most of what the rest read cost. */
const dnum = k => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / DAY;
const keyGap = (a, b) => dnum(b) - dnum(a);
const keyNoon = k => new Date(k + 'T12:00:00').getTime();
// Days back from `now` to a session: its own daysAgo when `now` is the input's
// (coach.js worked it out already), else counted.
const agoOf = (i, s, now) => (now === i.now && Number.isFinite(s.daysAgo) ? s.daysAgo : daysBetween(s.startedAt, now));
function median(xs) {
  const v = xs.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
const sum = xs => xs.reduce((a, x) => a + x, 0);
const ceil = x => Math.ceil(x - 1e-9);
const one = n => String(Math.round(n * 10) / 10).replace(/\.0$/, '');
const plural = (n, word) => n + ' ' + word + (Number(n) === 1 ? '' : 's');
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const Label = g => (GROUPS[g] && GROUPS[g].label) || String(g);
const label = g => Label(g).toLowerCase();
// Chest, back and core are "it"; legs, shoulders and arms are "them".
const THEM = Object.freeze(['legs', 'shoulders', 'arms']);
const them = gs => gs.length > 1 || THEM.includes(gs[0]);
function listOf(gs) {
  const o = GROUP_ORDER.filter(g => gs.includes(g)).map(label);
  if (o.length < 2) return o[0] || '';
  return o.slice(0, -1).join(', ') + ' and ' + o[o.length - 1];
}
const namesOf = xs => (xs.length < 2 ? xs[0] || '' : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);
// "today", "yesterday", "3 days ago" — and the "in the last 3 days" form.
const agoWord = n => (n === 0 ? 'today' : n === 1 ? 'yesterday' : plural(n, 'day') + ' ago');
const lastWord = n => (n === 0 ? 'today' : n === 1 ? 'yesterday' : 'in the last ' + plural(n, 'day'));
// REP_DROP, said in words — never restated as a number of its own.
const DROP_WORDS = REP_DROP === 0.25 ? 'a quarter' : Math.round(REP_DROP * 100) + '%';

/* A local hour, fractional, as a clock says it: "6:10 am", "3 pm". `dir`
   rounds a usual range's ends outward to five minutes, so the range printed
   never looks narrower than the one read. */
function clock(h, dir) {
  let m = h * 60;
  m = dir < 0 ? Math.floor(m / 5) * 5 : dir > 0 ? Math.ceil(m / 5) * 5 : Math.round(m);
  m = ((m % 1440) + 1440) % 1440;
  const H = Math.floor(m / 60), M = m % 60;
  const h12 = H % 12 === 0 ? 12 : H % 12;
  return h12 + (M ? ':' + String(M).padStart(2, '0') : '') + (H < 12 ? ' am' : ' pm');
}
const hourOf = ms => { const d = new Date(ms); return d.getHours() + d.getMinutes() / 60; };

// The memo that rides on the input. Not module state: it dies with the input.
function memo(i, k, fn) {
  if (!i || typeof i !== 'object') return fn();
  if (!i._ready) Object.defineProperty(i, '_ready', { value: new Map(), enumerable: false });
  if (!i._ready.has(k)) i._ready.set(k, fn());
  return i._ready.get(k);
}
const shapedOf = i => (i.overlap && Array.isArray(i.overlap.shaped) ? i.overlap.shaped : []);
const liftsOf = i => (i.overlap && Array.isArray(i.overlap.lifts) ? i.overlap.lifts : []);
const ctxOf = (i, now) => {
  const o = i.overlap || {};
  return { now, u: i.u === 'kg' ? 'kg' : 'lb', aim: o.aim || null, exp: o.exp || null,
           energy: o.energy || null, rateWk: Number.isFinite(o.rateWk) ? o.rateWk : null };
};

/* ================================================================
   1.  THE DAYS — one row per training date, the day's sessions added
   ================================================================
   Every session in the window up to `now` (and, for a past morning, before
   it). Two sessions on one date are one day with their sets added. */
function daysOf(i, shaped, now) {
  const by = new Map();
  shaped.forEach(s => {
    if (!s || !Number.isFinite(s.startedAt) || s.startedAt > now) return;
    const ago = agoOf(i, s, now);
    if (ago < 0 || ago >= WINDOW_DAYS) return;
    const k = s.date || dayKey(s.startedAt);
    const d = by.get(k) || { date: k, lsets: {}, lfsets: {}, ldrop: {} };
    ['lsets', 'lfsets', 'ldrop'].forEach(f => {
      const src = s[f] && typeof s[f] === 'object' ? s[f] : {};
      Object.keys(src).forEach(g => { d[f][g] = (d[f][g] || 0) + (Number(src[g]) || 0); });
    });
    by.set(k, d);
  });
  return [...by.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/* §4.2 ONE GROUP: its dates, its gaps, its stage, its normal, whether its
   last day was big, its window and how long since. */
function groupRead(days, g, today) {
  const on = days.filter(d => (d.lsets[g] || 0) >= 1);
  const n = on.length;
  const gaps = [];
  for (let k = 1; k < n; k++) gaps.push(keyGap(on[k - 1].date, on[k].date));
  const stage = n < STAGE_LEARNING ? 'none' : n < STAGE_YOURS ? 'learning' : 'yours';
  const q25 = gaps.length ? quantile(gaps, WINDOW_Q) : null;
  const med = gaps.length ? median(gaps) : null;
  const known = n >= STAGE_LEARNING;
  const normal = known ? median(on.map(d => d.lsets[g])) : null;
  const fNormal = known ? median(on.map(d => d.lfsets[g] || 0)) : null;
  const dNormal = known ? median(on.map(d => d.ldrop[g] || 0)) : null;
  if (!n) return { group: g, n, stage, q25, med, normal, since: null, win: T3_WINDOW, ready: true, big: null };
  const last = on[n - 1];
  const s = last.lsets[g], k = last.lfsets[g] || 0, dd = last.ldrop[g] || 0;
  const bySets = normal != null && s >= BIG_SETS_SHARE * normal && s >= normal + BIG_SETS_MORE;
  const byFail = k >= BIG_FLOOR && k >= BIG_SHARE * Math.max(1, fNormal == null ? 1 : fNormal);
  const byDrop = dd >= BIG_FLOOR && dd >= BIG_SHARE * Math.max(1, dNormal == null ? 1 : dNormal);
  const big = bySets || byFail || byDrop
    ? { sets: bySets, fail: byFail, drop: byDrop, s, k, d: dd, normal } : null;
  const base = stage === 'none' ? T3_WINDOW : Math.max(1, ceil(q25));
  // `win`, never `window`: in a browser a local `window` shadows the global.
  const win = !big ? base : stage === 'none' ? T3_BIG_WINDOW : Math.max(base + 1, ceil(med));
  const since = keyGap(last.date, today);
  return { group: g, n, stage, q25, med, normal, since, win, ready: since >= win, big, last: last.date };
}

/* ================================================================
   2.  STREAKS, AND THE FATIGUE FLAG (§4.3)
   ================================================================
   A trained date is a date with a session that holds a working set — the
   shipped trainedDays() rule, so a cardio session is a session and the
   streak here is the card's streak. */
// The trained dates, as day numbers.
function trainedOf(shaped, now) {
  return new Set(shaped.filter(s => s && Number.isFinite(s.startedAt) && s.startedAt <= now &&
    Array.isArray(s.groups) && s.groups.length).map(s => dnum(s.date || dayKey(s.startedAt))));
}
function runsOf(trained, now) {
  const today = dnum(dayKey(now));
  const inWin = [...trained].filter(n => today - n >= 0 && today - n < WINDOW_DAYS).sort((a, b) => a - b);
  const runs = [];
  inWin.forEach((n, j) => {
    if (j && n - inWin[j - 1] === 1) runs[runs.length - 1]++;
    else runs.push(1);
  });
  let streakNow = 0;
  let n = trained.has(today) ? today : trained.has(today - 1) ? today - 1 : null;
  while (n != null && trained.has(n)) { streakNow++; n--; }
  return { runs, streakNow };
}

/* His usual longest run: the 90th percentile of his runs in the window,
   rounded up — or null, under five runs or eight weeks of log. Exported: the
   card's recovery line reads it (a paint may). */
export function usualRun(input, now) {
  try {
    const i = input || {};
    return runsNow(i, now).usualRun;
  } catch {
    return null;
  }
}
// Today's runs, read once for the rest read, the recovery line and readiness.
const runsNow = (i, now) => memo(i, 'runs|' + now, () => runRead(i, shapedOf(i), now));
function runRead(i, shaped, now) {
  const trained = trainedOf(shaped, now);
  const { runs, streakNow } = runsOf(trained, now);
  const firsts = shaped.filter(s => s && Number.isFinite(s.startedAt) && s.startedAt <= now).map(s => s.startedAt);
  const history = firsts.length ? daysBetween(Math.min(...firsts), now) : 0;
  const usual = runs.length >= RUN_MIN && history >= RUN_HISTORY_DAYS ? ceil(quantile(runs, RUN_Q)) : null;
  return { runs, streakNow, usualRun: usual };
}

/* The weeks, from coach-overlap.js's blocksOf() and lightOf() — never a
   second weeks rule. A week before the log began is not a zero, a partly
   covered week is not a whole week, and a light week is out of every normal. */
function weeksAt(shaped, now) {
  const blocks = blocksOf(shaped, now);
  const { light } = lightOf(blocks);
  const whole = (from, to) => { for (let k = from; k <= to; k++) if (!blocks[k].full) return false; return true; };
  const normal = (from, to) => { const ks = []; for (let k = from; k <= to; k++) if (!light.has(k)) ks.push(k); return ks; };
  // load: this week's hard sets against the median of the four whole weeks before.
  const loadKnown = whole(1, LOAD_WEEKS);
  const loadKs = loadKnown ? normal(1, LOAD_WEEKS) : [];
  const usualLoad = loadKs.length ? median(loadKs.map(k => blocks[k].hard)) : null;
  const load = usualLoad != null && usualLoad > 0 && blocks[0].hard >= LOAD_SHARE * usualLoad;
  // failure: this week's F share against the eight whole weeks before.
  const failKnown = whole(1, FAIL_WEEKS);
  const failKs = failKnown ? normal(1, FAIL_WEEKS) : [];
  const nHard = sum(failKs.map(k => blocks[k].hard)), nF = sum(failKs.map(k => blocks[k].f));
  const shareNormal = nHard > 0 ? nF / nHard : null;
  const failure = shareNormal != null && blocks[0].f >= FAIL_SETS && blocks[0].hard > 0 &&
    blocks[0].f / blocks[0].hard >= FAIL_SHARE * shareNormal;
  return {
    hard: blocks[0].hard, f: blocks[0].f,
    loadKnown, usualLoad, load: !!load,
    failKnown: failKnown && failKs.length > 0, usualF: failKs.length ? nF / failKs.length : null, failure: !!failure
  };
}

/* Lifts coming down: two or more exposed in the last four weeks whose
   coach-prog.js status is declining — the performance log, so a marked
   session never makes a lift decline. As of `before` for a past morning. */
function decliningAt(i, now, before) {
  const ctx = ctxOf(i, now);
  const out = [];
  liftsOf(i).forEach(l => {
    if (!l || l.equipment === 'cardio') return;
    const ex = Number.isFinite(before) ? { ...l, exposures: (l.exposures || []).filter(e => e.startedAt < before) } : l;
    const xs = ex.exposures || [];
    if (!xs.some(e => { const a = daysBetween(e.startedAt, now); return a >= 0 && a < DECLINE_DAYS; })) return;
    const b = baselines(ex, ctx);
    if (b && !b.assisted && b.status === 'declining') out.push(String(l.name || l.exId));
  });
  return out.sort();
}

/* ================================================================
   3.  THE REST READ (§4.4)
   ================================================================
   restRead(input, now) -> null | { call, pick, groups, usual, notReady, … }

     null      fewer than six sessions in the window, or no usual groups
     usual     the groups of his recurring shapes; with none, the groups
               with four or more training days in the window
     pick      1. the recurring shapes whose every group is ready, the most
                  overdue of them by the SHIPPED stalest ratio (its group
                  furthest past its own median gap, ties by key). It carries
                  that `.stalest`, and `.skipped` — the shipped stalest shape,
                  when that one was left out as unrecovered
               2. else the ready usual groups, the most overdue by days since
                  against his median gap, ties in GROUP_ORDER
               3. else null
     call      'lighter' (the fatigue flag) | 'shape' | 'group' | 'rest'

   The pick is worked out whatever the call, so a lighter day can still say
   what is recovered if he trains anyway. Allowed on a card paint — it is per
   group arithmetic over the window — and it never reads the replay. */
export function restRead(input, now) {
  try {
    const i = input || {};
    return memo(i, 'rest|' + now, () => readRest(i, shapedOf(i), now, i.overdue || null, false));
  } catch {
    return null;
  }
}

function readRest(i, shaped, now, overdue, before) {
  if (!Number.isFinite(now)) return null;
  const n = shaped.filter(s => { if (!s || !Number.isFinite(s.startedAt) || s.startedAt > now) return false;
    const a = agoOf(i, s, now); return a >= 0 && a < WINDOW_DAYS; }).length;
  if (n < MIN_SESSIONS) return null;
  const today = dayKey(now);
  const days = daysOf(i, shaped, now);
  const groups = {};
  GROUP_ORDER.forEach(g => { groups[g] = groupRead(days, g, today); });
  const shapes = (Array.isArray(i.shapes) ? i.shapes : []).filter(sh => sh && Array.isArray(sh.groups));
  const usual = shapes.length ? GROUP_ORDER.filter(g => shapes.some(sh => sh.groups.includes(g)))
                              : GROUP_ORDER.filter(g => groups[g].n >= STAGE_LEARNING);
  if (!usual.length) return null;

  let pick = null;
  const ready = shapes.filter(sh => sh.stalest && sh.groups.every(g => groups[g].ready));
  if (ready.length) {
    const best = ready.reduce((a, b) => (b.stalest.ratio > a.stalest.ratio ||
      (b.stalest.ratio === a.stalest.ratio && b.key < a.key) ? b : a));
    const skipped = overdue && overdue.key !== best.key ? overdue : null;
    // The skipped line rides on the pick: a card paint renders the training
    // findings, and it may call nothing here but this and usualRun().
    pick = { ...best, kind: 'shape', skipped, skippedLine: skipped ? skippedText(groups, skipped) : null };
  } else {
    const cands = usual.filter(g => groups[g].ready && groups[g].since != null).map(g => {
      const r = groups[g];
      return { group: g, ratio: r.since / (r.med > 0 ? r.med : r.win) };
    });
    if (cands.length) {
      const best = cands.reduce((a, b) => (b.ratio > a.ratio ? b : a));
      const r = groups[best.group];
      pick = { kind: 'group', group: best.group, name: label(best.group), since: r.since, med: r.med, win: r.win };
    }
  }

  const run = before ? runRead(i, shaped, now) : runsNow(i, now);
  const w = weeksAt(shaped, now);
  const streak = run.usualRun != null && run.streakNow >= run.usualRun + 1;
  const cheap = [streak, w.failure, w.load].filter(Boolean).length;
  // Lifts declining is the one sign that reads every recent lift, so it is
  // read only when it decides the flag — never on a count it cannot change.
  const declining = cheap === FLAG_SIGNS - 1 ? decliningAt(i, now, before) : null;
  const up = cheap + (declining && declining.length >= 2 ? 1 : 0) >= FLAG_SIGNS;
  const call = up ? 'lighter' : pick ? pick.kind : 'rest';
  return {
    call, pick, groups, usual, notReady: usual.filter(g => !groups[g].ready),
    streakNow: run.streakNow, usualRun: run.usualRun,
    fatigue: { up, streak, failure: w.failure, load: w.load, declining: declining ? declining.length >= 2 : null }
  };
}

/* Every fatigue sign, each with its numbers — what the lighter answer and
   readiness say. Never on a paint. */
function signsOf(i, now) {
  return memo(i, 'signs|' + now, () => {
    const shaped = shapedOf(i);
    const run = runsNow(i, now);
    const w = weeksAt(shaped, now);
    const declining = decliningAt(i, now, null);
    return { run, w, declining, streak: run.usualRun != null && run.streakNow >= run.usualRun + 1 };
  });
}

/* ================================================================
   4.  THE ADHERENCE REPLAY (§4.5) — it reports, and adjusts nothing
   ================================================================
   For each of the last twelve weeks' mornings: the log as it stood before
   that day began, read at its noon with TODAY's recurring shapes (clustering
   is coach.js's, and a second copy of it would be a second definition), and
   everything else as of that morning. Flagged: the call was rest or lighter.
   Trained: a session is dated that day. Its outcome: compareSession() on
   that log, for the first unmarked session of the day — held (above or about
   usual) or below; a session with no lift to compare is not counted. */
export function replay(input, now) {
  try {
    const i = input || {};
    return memo(i, 'replay|' + now, () => runReplay(i, now));
  } catch {
    return null;
  }
}

function runReplay(i, now) {
  if (!Number.isFinite(now)) return null;
  const shaped = shapedOf(i).filter(s => s && Number.isFinite(s.startedAt)).slice().sort((a, b) => a.startedAt - b.startedAt);
  const marked = i.marked instanceof Set ? i.marked : new Set();
  let flagged = 0, rested = 0, through = 0, held = 0, below = 0;
  for (let k = 1; k <= REPLAY_DAYS; k++) {
    const at = noon(noon(now) - k * DAY);
    const key = dayKey(at);
    const start = midnight(at);
    const log = shaped.filter(s => s.startedAt < start);
    const r = readRest(i, log, at, null, start);
    if (!r || (r.call !== 'rest' && r.call !== 'lighter')) continue;
    flagged++;
    const that = shaped.filter(s => (s.date || dayKey(s.startedAt)) === key);
    if (!that.length) { rested++; continue; }
    const s = that.find(x => !marked.has(String((x.session && x.session.id) || '')));
    if (!s) continue;
    const c = compareSession(i.overlap, s, at);
    const v = c ? (c.summary || (c.rows.length === 1 ? c.rows[0].verdict : null)) : null;
    if (!v) continue;
    through++;
    if (v === 'below') below++; else held++;
  }
  const lines = [];
  if (flagged >= REPLAY_FLAGGED) {
    lines.push({ text: 'Of the ' + plural(flagged, 'day') + ' your log looked like this, you rested on ' + rested + '.',
                 reason: 'Each of the last twelve weeks’ mornings, read the way Coach reads today. Nothing about it is stored.' });
  }
  if (through >= REPLAY_THROUGH && held >= HELD_SHARE * through) {
    lines.push({ text: 'You’ve trained through days like this ' + plural(through, 'time') + ' and held your numbers on ' + held + '.',
                 reason: 'Each of those sessions against your usual as it stood that morning. Coach reports this; it changes nothing.' });
  } else if (through >= REPLAY_THROUGH && below >= BELOW_SHARE * through) {
    lines.push({ text: 'The last ' + through + ' times you trained through a day like this, your top sets came in under your usual on ' + below + '.',
                 reason: 'Each of those sessions against your usual as it stood that morning. Coach reports this; it changes nothing.' });
  }
  return { flagged, rested, through, held, below, lines };
}

/* ================================================================
   5.  THE REST ANSWERS' SENTENCES (§4.8)
   ================================================================ */

/* One group, inside its window: the big-day line (also the builder
   caution's headline), or the inside-the-window line. Only the clauses that
   made a day big are said. */
export function groupLine(read, g) {
  const r = read && read.groups && read.groups[g];
  if (!r || r.ready || r.since == null) return null;
  const pro = them([g]) ? 'them' : 'it';
  if (r.big) {
    const b = r.big, parts = [];
    if (b.sets) parts.push(b.s + ' sets against a usual ' + one(b.normal));
    if (b.fail) parts.push(b.sets ? b.k + ' of them taken to failure' : b.k + ' sets taken to failure');
    if (b.drop) parts.push((parts.length ? 'with ' : '') + 'reps down ' + DROP_WORDS + ' or more on ' + b.d + ' of ' +
                           (them([g]) ? 'their' : 'its') + ' lifts');
    return Label(g) + ' had a big day ' + agoWord(r.since) + ': ' + parts.join(', ') +
           '. Coach would give ' + pro + ' another day.';
  }
  // A starting point is never "his usual", so it is not said as one.
  return r.stage === 'none'
    ? Label(g) + ' was trained ' + agoWord(r.since) + '; Coach gives ' + pro + ' ' + plural(r.win, 'day') +
      ' or more (a common starting point until Coach knows your gaps).'
    : Label(g) + ' was trained ' + agoWord(r.since) + '; you usually give ' + pro + ' ' + plural(r.win, 'day') + ' or more.';
}

export const REST_REASON = 'Each group against its own recovery time: the quick end of your gaps between training it, and longer after a big day.';
const UNSEEN = 'Coach can’t see sleep, stress or soreness.';
const T3_LIGHTER = 'A common approach on a lighter day: the same weights, fewer sets.';

/* How recently several groups were trained, said so it is true of every one
   of them: "today", "yesterday", "today and yesterday", or "in the last N
   days" with N the longest ago. */
function recently(read, gs) {
  const ss = gs.map(g => read.groups[g].since);
  const hi = Math.max(...ss), lo = Math.min(...ss);
  return hi === 1 && lo === 0 ? 'today and yesterday' : lastWord(hi);
}

/* The rest call: nothing he usually trains is recovered. `rp` is the
   replay's result, handed in by coach.js, which resolves it only here. */
export function restAnswer(read, rp) {
  const r = read, gs = r.notReady;
  const were = gs.length > 2 ? 'were all' : gs.length === 2 ? 'were both' : 'was';
  const streak = r.streakNow >= 2 && r.usualRun != null
    ? ', and you’ve trained ' + r.streakNow + ' days straight (your usual longest run is ' + r.usualRun + ')' : '';
  const more = [];
  gs.forEach(g => { if (r.groups[g].big) more.push({ text: groupLine(r, g), reason: '' }); });
  (rp ? rp.lines : []).forEach(l => more.push(l));
  more.push({ text: UNSEEN, reason: 'It reads your log, and nothing about how you feel.' });
  return {
    text: 'Today looks like a rest day. ' + cap(listOf(gs)) + ' ' + were + ' trained ' + recently(r, gs) + streak + '.',
    reason: REST_REASON, more
  };
}

/* The lighter call: two or more fatigue signs, each with its numbers. */
export function lighterAnswer(input, now, read, rp) {
  const r = read;
  const more = signRows(input, now).filter(x => x.flag).map(x => ({ text: x.text, reason: '' }));
  more.push({ text: T3_LIGHTER, reason: 'A labelled starting point, not a rule.' });
  if (r.pick) more.push({ text: 'If you train, ' + pickName(r.pick) + ' is recovered.', reason: REST_REASON });
  (rp ? rp.lines : []).forEach(l => more.push(l));
  more.push({ text: UNSEEN, reason: 'It reads your log, and nothing about how you feel.' });
  return {
    text: 'Today looks like a lighter day, or a rest.',
    reason: 'Two or more of these, each against your own normal: your run of training days, lifts coming down, sets taken to failure, and sets in the last 7 days.',
    more
  };
}

/* The group call: a group he usually trains is recovered, no whole shape is. */
export function groupAnswer(read) {
  const r = read, g = r.pick.group;
  const others = r.notReady.filter(x => x !== g);
  const rest = others.length
    ? ' ' + cap(listOf(others)) + ' ' + (others.length > 1 ? 'were' : 'was') + ' trained ' + recently(r, others) + '.' : '';
  return { text: Label(g) + ' is recovered.' + rest,
           reason: 'The group you usually train that has waited longest against its own usual gap, of the ones outside their recovery time.' };
}

const pickName = p => (p.kind === 'group' ? label(p.group) : 'your ' + p.name);

/* When the pick left the shipped stalest shape out as unrecovered, the line
   that says so — every "waited longest" claim has to stay true. */
function skippedText(groups, sk) {
  const gs = (sk.groups || []).filter(g => groups[g] && !groups[g].ready);
  if (!gs.length) return null;
  const pl = them(gs);
  return cap('your ' + sk.name) + ' has waited longer, but ' + listOf(gs) + ' ' + (pl ? 'are' : 'is') +
         ' inside ' + (pl ? 'their' : 'its') + ' recovery time.';
}

/* ================================================================
   6.  READINESS, THE TRAINING ROWS (§4.6)
   ================================================================
   A list, not a score. Each row is { id, has, flag, text }; `has` is whether
   the log can read that component at all, and readinessHas() counts those
   with the `has` tests alone — no flag, no status, no replayed target — so
   the readiness bubble's gate is cheap. The full rows are built only while
   an answer is rendered. */
export function readinessHas(input, now) {
  try {
    const i = input || {};
    return memo(i, 'has|' + now, () => hasRows(i, now).filter(x => x.has).length);
  } catch {
    return 0;
  }
}

function hasRows(i, now) {
  const shaped = shapedOf(i);
  const read = restRead(i, now);
  const run = runsNow(i, now);
  const blocks = blocksOf(shaped, now);
  const whole = n => { for (let k = 1; k <= n; k++) if (!blocks[k].full) return false; return true; };
  const o = i.overlap || {};
  const lifts = liftsOf(i).some(l => (l.exposures || []).filter(e => {
    const a = daysBetween(e.startedAt, now); return a >= 0 && a < LIFTS_DAYS; }).length >= LIFTS_EXPOSURES);
  const wt = weighToday(o.weighIns, now);
  const inWin = shaped.filter(s => s && Number.isFinite(s.startedAt) && s.startedAt <= now && daysBetween(s.startedAt, now) < WINDOW_DAYS);
  return [
    { id: 'recovery', has: read != null },
    { id: 'streak',   has: run.usualRun != null },
    { id: 'load',     has: whole(LOAD_WEEKS) },
    { id: 'failure',  has: whole(FAIL_WEEKS) },
    { id: 'lifts',    has: lifts },
    { id: 'energy',   has: o.energy != null },
    { id: 'weighin',  has: wt != null },
    { id: 'time',     has: inWin.length >= TIME_SESSIONS }
  ];
}

// Today's lowest weigh-in so far, against his last week (the seven days
// before today, through bwAt()) — or null.
function weighToday(weighIns, now) {
  const ins = Array.isArray(weighIns) ? weighIns : [];
  const today = dayKey(now);
  const todays = ins.filter(w => w && Number.isFinite(w.lb) && w.lb > 0 && Number.isFinite(w.t) && w.t <= now && dayKey(w.t) === today);
  if (!todays.length) return null;
  const week = bwAt(ins, midnight(now) - 1);
  if (week == null) return null;
  return { low: Math.min(...todays.map(w => w.lb)), week };
}

// The rows the fatigue flag is made of, each with its numbers.
function signRows(i, now) {
  const s = signsOf(i, now);
  const rows = [];
  rows.push({ id: 'streak', flag: s.streak,
    text: s.run.streakNow + ' days straight; your usual longest run is ' + s.run.usualRun + '.' });
  rows.push({ id: 'lifts', flag: s.declining.length >= 2,
    text: namesOf(s.declining) + ' are coming down lately.' });
  rows.push({ id: 'failure', flag: s.w.failure,
    text: s.w.f + ' sets taken to failure in the last 7 days; usually ' +
          (s.w.usualF != null && one(s.w.usualF) !== '0' ? 'about ' + one(s.w.usualF) : 'none') + '.' });
  rows.push({ id: 'load', flag: s.w.load,
    text: s.w.hard + ' sets in the last 7 days; usually about ' + Math.round(s.w.usualLoad || 0) + ' a week.' });
  return rows;
}

/* readinessRows(input, now) -> the training rows, in the listed order. */
export function readinessRows(input, now) {
  try {
    const i = input || {};
    return memo(i, 'rows|' + now, () => buildRows(i, now));
  } catch {
    return [];
  }
}

function buildRows(i, now) {
  const has = Object.fromEntries(hasRows(i, now).map(x => [x.id, x.has]));
  const u = i.u === 'kg' ? 'kg' : 'lb';
  const o = i.overlap || {};
  const read = restRead(i, now);
  const shapes = Array.isArray(i.shapes) ? i.shapes : [];
  const s = signsOf(i, now);
  const rows = [];

  rows.push({ id: 'recovery', has: has.recovery,
    flag: !!read && (read.call === 'rest' || (shapes.length > 0 && !(read.pick && read.pick.kind === 'shape'))),
    text: 'None of your usual sessions is fully recovered today.' });
  rows.push({ id: 'streak', has: has.streak, flag: has.streak && s.streak,
    text: s.run.streakNow + ' days straight; your usual longest run is ' + s.run.usualRun + '.' });
  rows.push({ id: 'load', has: has.load, flag: has.load && s.w.load,
    text: s.w.hard + ' sets in the last 7 days; usually about ' + Math.round(s.w.usualLoad || 0) + ' a week.' });
  rows.push({ id: 'failure', has: has.failure, flag: has.failure && s.w.failure,
    text: s.w.f + ' sets taken to failure in the last 7 days; usually ' +
          (s.w.usualF != null && one(s.w.usualF) !== '0' ? 'about ' + one(s.w.usualF) : 'none') + '.' });

  // Lifts: two or more coming down, or two or more of the last session's
  // targets unreached — the last session in the performance log, so a marked
  // day is never held against him here either.
  let liftsFlag = false, liftsText = '';
  if (has.lifts) {
    if (s.declining.length >= 2) { liftsFlag = true; liftsText = namesOf(s.declining) + ' are coming down lately.'; }
    else if (o.targetsOn !== false) {
      const marked = i.marked instanceof Set ? i.marked : new Set();
      const last = shapedOf(i).filter(x => x && Number.isFinite(x.startedAt) && x.startedAt <= now &&
        !marked.has(String((x.session && x.session.id) || ''))).sort((a, b) => b.startedAt - a.startedAt)[0];
      const t = last ? targetsReplay(o, last) : null;
      const missed = t ? t.n - t.met : 0;
      if (missed >= 2) { liftsFlag = true; liftsText = missed + ' of your last session’s targets weren’t reached.'; }
    }
  }
  rows.push({ id: 'lifts', has: has.lifts, flag: liftsFlag, text: liftsText });

  const rate = Number.isFinite(o.rateWk) ? o.rateWk : null;
  rows.push({ id: 'energy', has: has.energy, flag: o.energy === 'deep' && rate != null && rate < 0,
    text: rate != null && rate < 0 ? 'Your weight is coming down about ' + labelRate(-rate, u) + ' a week.' : '' });

  const wt = weighToday(o.weighIns, now);
  rows.push({ id: 'weighin', has: has.weighin, flag: !!wt && wt.low < WEIGH_SHARE * wt.week,
    text: wt ? 'This morning’s weigh-in is ' + labelW(wt.week - wt.low, u) +
               ' under your last week. A drop that size is usually water, which Coach can’t see.' : '' });

  let timeFlag = false, timeText = '';
  if (has.time) {
    const hours = shapedOf(i).filter(x => x && Number.isFinite(x.startedAt) && x.startedAt <= now &&
      daysBetween(x.startedAt, now) < WINDOW_DAYS).map(x => hourOf(x.startedAt));
    const a = quantile(hours, TIME_LO), b = quantile(hours, TIME_HI), h = hourOf(now);
    timeFlag = h < a || h > b;
    timeText = 'It’s ' + clock(h, 0) + '; you usually start between ' + clock(a, -1) + ' and ' + clock(b, 1) + '.';
  }
  rows.push({ id: 'time', has: has.time, flag: timeFlag, text: timeText });
  return rows;
}

/* The readiness answer, from the merged rows (training first, then food):
   null under three rows with data — a bubble offered only when it answers. */
const SEVERAL = 3;
export function readinessAnswer(rows) {
  const all = Array.isArray(rows) ? rows : [];
  if (all.filter(x => x.has).length < READY_ROWS) return null;
  const flagged = mergeRows(all);
  const ids = new Set(flagged.map(x => x.id));
  const several = flagged.length >= SEVERAL || (ids.has('streak') && ids.has('failure'));
  const unseen = { text: 'Coach can’t see sleep, stress or soreness, and those count most on a day like this.',
                   reason: 'It reads your log, and nothing about how you feel.' };
  const reason = 'Each one against your own normal, read from your log.';
  if (!flagged.length) return { text: 'Nothing in your log is off your normal today.', reason, more: [unseen] };
  const more = flagged.map(x => ({ text: x.text, reason: '' }));
  if (several) {
    more.push({ text: T3_LIGHTER, reason: 'A labelled starting point, not a rule.' });
    return { text: 'Several things in your log point to a lighter day.', reason, more: more.concat(unseen) };
  }
  return { text: (flagged.length === 1 ? 'One thing is' : 'Two things are') + ' different today:', reason, more: more.concat(unseen) };
}

/* Several things off at once, among the rows given — what the targets
   answer reads, handed the TRAINING rows alone, so food never changes a
   training answer. */
export function readinessHeavy(rows) {
  const f = (Array.isArray(rows) ? rows : []).filter(x => x.has && x.flag);
  const ids = new Set(f.map(x => x.id));
  return f.length >= SEVERAL || (ids.has('streak') && ids.has('failure'));
}

/* ================================================================
   7.  WHAT WAS DIFFERENT ABOUT A SESSION (§4.7)
   ================================================================
   Each component measured for this session as of its start, and for each
   of his earlier sessions in the twelve weeks before it. A robust z,
   (x − median) / (1.4826 × MAD), past 1.5 in EITHER direction, against eight
   or more of them with some spread. The weigh-in is measured differently —
   against his week, past 1.5% — and ordered as if it were 1.5.

   Every component that could be MEASURED comes back, `kept` when it cleared
   its bar: "nothing in your log was off your normal" is a claim about what
   was measured, and with nothing measurable it is not made at all. */
export function sessionRows(input, session) {
  try {
    const i = input || {};
    if (!session || !Number.isFinite(session.startedAt)) return [];
    return rowsFor(i, session);
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

function rowsFor(i, S) {
  const u = i.u === 'kg' ? 'kg' : 'lb';
  const all = shapedOf(i).filter(s => s && Number.isFinite(s.startedAt)).slice().sort((a, b) => a.startedAt - b.startedAt);
  const ref = all.filter(s => s.startedAt < S.startedAt && daysBetween(s.startedAt, S.startedAt) < WINDOW_DAYS);
  const trained = new Set(all.filter(s => Array.isArray(s.groups) && s.groups.length).map(s => dnum(s.date || dayKey(s.startedAt))));
  const dateOf = s => s.date || dayKey(s.startedAt);
  const rows = [];

  // rest: days since each of its signature groups before it (lifting sets).
  const sinceG = (s, g) => {
    let last = null;
    all.forEach(x => { if (x.startedAt < s.startedAt && x.lsets && x.lsets[g] >= 1) last = x; });
    return last ? keyGap(dateOf(last), dateOf(s)) : null;
  };
  let bestRest = null;
  (Array.isArray(S.signature) ? S.signature : []).forEach(g => {
    const x = sinceG(S, g);
    const r = robust(x, ref.filter(s => (s.signature || []).includes(g)).map(s => sinceG(s, g)).filter(v => v != null));
    if (r && (!bestRest || Math.abs(r.z) > Math.abs(bestRest.z))) bestRest = { g, x, ...r };
  });
  if (bestRest) {
    const pro = them([bestRest.g]) ? 'them' : 'it';
    rows.push(row('rest', bestRest.z,
      Label(bestRest.g) + ' had ' + plural(bestRest.x, 'day') + ' of rest before it; you usually give ' + pro + ' ' + one(bestRest.med) + '.'));
  }

  // streak: consecutive trained days ending the day before it.
  const streakBefore = s => { let n = 0, k = dnum(dateOf(s)) - 1; while (trained.has(k)) { n++; k--; } return n; };
  const st = robust(streakBefore(S), ref.map(streakBefore));
  if (st) {
    const x = streakBefore(S), m = one(st.med);
    rows.push(row('streak', st.z, x > 0
      ? 'It came after ' + plural(x, 'day') + ' straight of training; usually after ' + (m === '0' ? 'a day off' : m) + '.'
      : 'It came after a day off; usually after ' + (m === '0' ? 'a day off' : m + ' days straight of training') + '.'));
  }

  // week: hard sets (the shipped count) in the seven days before it.
  const week = s => sum(all.filter(x => x.startedAt < s.startedAt && x.startedAt >= s.startedAt - 7 * DAY)
    .map(x => sum(Object.values(x.sets || {}).map(v => Number(v) || 0))));
  const wk = robust(week(S), ref.map(week));
  if (wk) rows.push(row('week', wk.z, week(S) + ' sets in the 7 days before it; usually about ' + Math.round(wk.med) + '.'));

  // start: the local hour it started.
  const hours = ref.map(s => hourOf(s.startedAt));
  const sh = robust(hourOf(S.startedAt), hours);
  if (sh) {
    rows.push(row('start', sh.z, 'It started at ' + clock(hourOf(S.startedAt), 0) + '; you usually start between ' +
      clock(quantile(hours, TIME_LO), -1) + ' and ' + clock(quantile(hours, TIME_HI), 1) + '.'));
  }

  // length: its duration in minutes.
  const mins = s => {
    const rec = s.session || s;
    if (Number.isFinite(rec.durationSec) && rec.durationSec > 0) return rec.durationSec / 60;
    if (Number.isFinite(rec.endedAt) && rec.endedAt > s.startedAt) return (rec.endedAt - s.startedAt) / 6e4;
    return null;
  };
  const ln = robust(mins(S), ref.map(mins).filter(v => v != null));
  if (ln) rows.push(row('length', ln.z, 'It ran ' + plural(Math.round(mins(S)), 'minute') + '; usually about ' + Math.round(ln.med) + '.'));

  // weighin: that morning's lowest reading before it, against his week.
  const ins = Array.isArray((i.overlap || {}).weighIns) ? i.overlap.weighIns : [];
  const mornings = ins.filter(w => w && Number.isFinite(w.lb) && w.lb > 0 && Number.isFinite(w.t) &&
    w.t <= S.startedAt && dayKey(w.t) === dateOf(S));
  const wkBw = mornings.length ? bwAt(ins, midnight(keyNoon(dateOf(S))) - 1) : null;
  if (mornings.length && wkBw != null) {
    const low = Math.min(...mornings.map(w => w.lb));
    const pct = (low - wkBw) / wkBw * 100;
    rows.push({ id: 'weighin', z: pct < 0 ? -Z_BAR : Z_BAR, kept: Math.abs(pct) > WEIGH_PCT,
      text: 'That morning’s weigh-in was ' + labelW(Math.abs(low - wkBw), u) + (pct < 0 ? ' under' : ' over') + ' your week.' });
  }
  return rows;
}
const row = (id, z, text) => ({ id, z, kept: Math.abs(z) >= Z_BAR, text });

/* ================================================================
   8.  MERGING ROWS (§6.5)
   ================================================================
   The two modules' rows, concatenated — training first, then food — and
   cut: readiness keeps its flagged rows in their listed order; of a
   session's rows, the ones that cleared their bar (`kept`) are sorted by |z|,
   largest first, ties in the listed order, and three are kept. coach.js
   calls this, and the two modules never see each other. */
export function mergeRows(...lists) {
  const all = [].concat(...lists.map(l => (Array.isArray(l) ? l : []))).filter(Boolean);
  if (all.some(x => 'flag' in x)) return all.filter(x => x.has !== false && x.flag && x.text);
  return all.map((x, k) => ({ x, k })).filter(({ x }) => x.kept && Number.isFinite(x.z) && x.text)
    .sort((a, b) => Math.abs(b.x.z) - Math.abs(a.x.z) || a.k - b.k)
    .slice(0, SESSION_ROWS).map(({ x }) => x);
}
