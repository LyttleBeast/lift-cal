// Coach's overlap — the part only Rack can do: a lift that has gone flat, read
// against the bodyweight, the frequency and the sets beside it, before anything
// is said about it.
//
// Stage one (coach-prog.js) says what to put on the bar next time. This is
// stage two, and it answers the question a flat estimated max raises: is this a
// real plateau, or the dip a cut brings? Only Rack has both halves of the data
// to tell — the training log and the weigh-ins — and the most emotionally
// loaded thing Coach says is which one it is. So:
//
//   A WRONG READING IS WORSE THAN NO READING. When the causes cannot be
//   separated — too few sessions in the window, no weigh-ins at one end of it
//   — the call says so and stops. Silence is always a correct answer.
//
//   RELATIVE STRENGTH DECIDES THE CUT. An estimated max down 2% while
//   bodyweight is down 4% is strength per pound GAINED, and calling it a
//   plateau would be a wrong reading about exactly the thing a cut protects.
//   Past a 5% drop in the estimated max it is a slide, whatever per-pound says:
//   an 8% drop is never good news to anybody.
//
//   "CUT" IS HIS WORD, NOT COACH'S. A weight that is falling reads as a cut in
//   a sentence only when his aim is Lose fat or Recomp, or his food targets are
//   set to lose. Otherwise it is "your weight has come down", and whether that
//   was meant is the goal-change question's to ask, not this file's to assume.
//
//   COACH KEEPS NO MEMORY OF ITS ADVICE. The stall ladder's rung — wait, reset,
//   more sets, a variation — is worked out from how long the lift has been
//   flat, which is in the log, and never from what Coach said last week.
//
//   A RECORD DAY IS A REP RECORD AT A WEIGHT HE HAS LIFTED. One more rep than
//   his best at a load from the last four weeks, three reps or more. Never a
//   single, never a double, never a max attempt: Coach cannot see readiness,
//   technique or a spotter, and a rep record carries the same signal at a
//   fraction of the risk.
//
// "HARD SETS" ARE THE SHIPPED COUNT. coach.js's shapeSession() counts working
// sets by the exercise's primary group, warm-ups out, and hands its shaped
// sessions in here as an argument — this file cannot import coach.js (it is
// imported by it) — so "chest sets" is the same number in every answer on the
// sheet. Its F sets ride along on the same shape (`fsets`).
//
// STAGE THREE lives here too (section 5), for one reason: coach.js reaches
// coach-prog.js only through this file and the builder, and "How did today
// compare?", "What's next time?", the card's "every Coach target met" and the
// lift target's pace all need a target replayed or a lift's series.
//
// Every threshold below carries its reason, and none of them is ever printed.
// Every weight goes through units.js; every sentence and its evidence are
// fenced by tools-check/coach-overlap.mjs and coach-voice.mjs.
//
// v52: THE PERFORMANCE LOG. coach.js hands each lift over with its exposures
// read from the performance log — sessions he marked as a bad day left out —
// and its marks beside them (`mark`), while `shaped` stays every session, so
// "how strong" is read without the marked days and "when" and "how much" with
// them. Every target this file names goes through coach-prog.js's
// targetFor(), which honours a mark exactly as the builder does. quantile,
// blocksOf, lightOf and groupDaysAt are exported for coach-ready.js, their
// bodies unchanged: one weeks rule, one group clock.
//
// PURE, and copied into the native tree verbatim (src/pure/coach-overlap.js).
// No reads, no DOM, no module state, no clock: `now` is an argument. Imports
// coach-prog.js (baselines and the target it describes), coach-goal.js (the
// energy bars, bodyweight at a moment, the volume floors), units.js,
// exercises.js (group words), coach-tags.js (a variation's pattern) and the
// session MATH of analytics.js (the e1rm the set row prints). coach.js imports
// this; nothing imports back.

import { baselines, exposuresFor, targetFor } from './coach-prog.js';
import { bwAt, energyBand, volumeFloor, paceFor } from './coach-goal.js';
import { labelW, labelRate, wOut } from './units.js';
import { GROUPS, GROUP_ORDER } from './exercises.js';
import { tagsFor } from './coach-tags.js';
import { e1rm } from './analytics.js';

const DAY = 864e5;

/* ---------- the numbers, each with its reason ----------
   None of these is ever printed as a threshold. */

// The read window: the six weeks up to the lift's last session. Long enough
// that a cut has had time to show in the scale, short enough to be "lately".
const READ_DAYS = 42;
// Four sessions across three weeks, or there is nothing to call — the same
// bar coach-prog.js puts under a status.
const READ_POINTS = 4;
const READ_SPAN_DAYS = 21;
// No new best in three weeks is what "flat" means for a lift trained twice a
// week or more, which coach-prog.js's status can never call stalled.
const FLAT_BEST_DAYS = 21;
// Trained well under his own habit: a flat lift nobody has been doing is not a
// plateau. 60% of his twelve-week frequency, and only once that frequency is
// weekly or more — a lift done every fortnight has no habit to fall short of.
const IRREGULAR_SHARE = 0.6;
const IRREGULAR_MIN_WEEKLY = 1;
// Per pound of bodyweight, anything from 1% down counts as held: inside a
// session's noise for a ratio of two noisy numbers.
const HOLD_RS = -0.01;
// Past a 5% drop in the estimated max it is a slide, whatever per-pound says.
const SLIDE_ABS = -0.05;
// "Level" is only said inside 2% or his own session-to-session noise.
const LEVEL_PCT = 2;
// Group fatigue: two weeks at 30% over his own normal (on a normal of four
// sets a week or more), or F sets at twice his usual share (three at least).
// The 2% floor keeps someone who never goes to failure from tripping it on
// the first one.
const FATIGUE_SETS = 1.3;
const FATIGUE_MIN_NORMAL = 4;
const FATIGUE_F_SETS = 3;
const FATIGUE_F_SHARE = 2;
const FATIGUE_F_FLOOR = 0.02;
// A light week in the log: a week with a session in it and 60% or less of his
// usual sets. His usual is the median of weeks three to ten with a session in
// them, and it needs four such weeks before it is a usual at all.
const LIGHT_SHARE = 0.6;
const LIGHT_MIN_WEEKS = 4;
// A lighter week is offered six weeks or more after the last one (Bell 2023:
// deloads typically come every four to six weeks).
const LIGHT_GAP_DAYS = 42;
// The ladder: under five weeks flat, wait (or reset a grind); five to eight,
// more sets if they are low; eight and past, a variation from his own log.
const PLATEAU_WEEKS = 5;
const VARIATION_WEEKS = 8;
const VARIATION_DAYS = 182;
// A record day. Six sessions behind the lift, a load from the last four weeks,
// three reps or more, the lift done inside twelve days (the layoff clock
// coach-prog.js holds a first session back on), no three-week gap in its last
// three (not a comeback), and the group rested at least two days — or his own
// quickest quarter of gaps, if that is longer.
const RECORD_MIN_EXPOSURES = 6;
const RECORD_WINDOW_DAYS = 28;
const RECORD_MIN_REPS = 3;
const RECORD_DROP = 0.25;
const RECORD_LIFT_DAYS = 12;
const RECORD_GAP_DAYS = 21;
const RECORD_REST_DAYS = 2;
const RECORD_REST_Q = 0.25;
// The same cap coach-prog.js puts on the estimated-max series.
const E1RM_MAX_REPS = 12;
// The twelve-week window every Coach derivation reads, and its weeks.
const WINDOW_DAYS = 84;
const BLOCKS = 13;
const TOL = 0.01;

/* ================================================================
   SMALL THINGS
   ================================================================
   A private copy of coach.js's noon-anchored day count, for the reason every
   Coach file keeps its own: this module is copied on its own. */
function noon(ms) { const d = new Date(ms); d.setHours(12, 0, 0, 0); return d.getTime(); }
function daysBetween(fromMs, toMs) { return Math.round((noon(toMs) - noon(fromMs)) / DAY); }
function dayKey(ms) {
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function median(xs) {
  const v = xs.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
export function quantile(xs, q) {
  const v = xs.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const pos = (v.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}
const sum = xs => xs.reduce((a, x) => a + x, 0);
const one = n => String(Math.round(n * 10) / 10).replace(/\.0$/, '');
const plural = (n, word) => n + ' ' + word + (Number(n) === 1 ? '' : 's');
const groupWord = g => (GROUPS[g] && GROUPS[g].label ? GROUPS[g].label.toLowerCase() : null);
const isCardio = ex => ex && ex.equipment === 'cardio';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/* How often, in words: "about twice a week", "about once every 10 days". */
function perWeek(f) {
  if (!(f > 0)) return null;
  if (Math.abs(f - 1) < 0.25) return 'about once a week';
  if (Math.abs(f - 2) < 0.25) return 'about twice a week';
  if (f < 0.75) return 'about once every ' + Math.round(7 / f) + ' days';
  return 'about ' + one(f) + ' times a week';
}

/* The overlap input with every lift's exposures counted once, by
   coach-prog.js's exposuresFor() over the shaped sessions — the merge
   invariant and "what an exposure is" stay that file's. coach.js calls this
   once per coach() call; a lift handed in with its exposures keeps them. */
export function prepare(input) {
  const i = input && typeof input === 'object' ? input : {};
  if (i._memo) return i;
  const shaped = Array.isArray(i.shaped) ? i.shaped : [];
  // Each lift counted over only the sessions that hold it — the same answer
  // exposuresFor() gives over every session, at a fraction of the merges.
  const holding = new Map();
  shaped.forEach(s => {
    const rec = s && s.session && typeof s.session === 'object' ? s.session : s;
    ((rec && rec.exercises) || []).forEach(e => {
      if (!e || !e.exId) return;
      const list = holding.get(e.exId) || [];
      if (list[list.length - 1] !== s) list.push(s);
      holding.set(e.exId, list);
    });
  });
  const lifts = (Array.isArray(i.lifts) ? i.lifts : []).filter(l => l && l.exId)
    .map(l => (Array.isArray(l.exposures) ? l : { ...l, exposures: exposuresFor(holding.get(l.exId) || [], l.exId) }));
  const out = { ...i, shaped, lifts };
  /* A memo that rides on this one prepared input and dies with it: the
     readers below ask for the same lift's baselines and the same weeks many
     times over in one coach() call. Not module state — nothing outlives the
     argument, and a fresh input is a fresh memo. Not enumerable, so the
     input still serialises as it always did. */
  Object.defineProperty(out, '_memo', { value: new Map(), enumerable: false });
  return out;
}

// Memoised on the prepared input, when there is one.
function memo(i, k, fn) {
  const m = i && i._memo;
  if (!m) return fn();
  if (!m.has(k)) m.set(k, fn());
  return m.get(k);
}
const ctxKey = c => [c.now, c.u, c.aim, c.exp, c.energy].join('|');
// A lift's baselines, memoised when the lift is the prepared input's own.
function baselinesOf(i, ex, c) {
  const own = i && Array.isArray(i.lifts) && i.lifts.find(l => l.exId === ex.exId) === ex;
  return own ? memo(i, 'b|' + ex.exId + '|' + ctxKey(c), () => baselines(ex, c)) : baselines(ex, c);
}
// The weeks and the light ones, once per moment.
function weeksOf(i, now) {
  return memo(i, 'w|' + now, () => { const blocks = blocksOf(i.shaped, now); return { blocks, ...lightOf(blocks) }; });
}

/* ================================================================
   1.  THE WEEKS — sets, F sets and light weeks, from the shipped count
   ================================================================
   Seven-day blocks back from today: block 0 is today and the six days before
   it, block 1 the week before that. Each carries its sessions, its hard sets
   (coach.js's sets[g], summed) and its F sets, overall and per group — and
   whether the log covers the whole of it. A week before his first session is
   not a week off, and a week the log only reaches part of is not a whole
   week: neither is ever counted into a normal or called light. Counted as
   zeros, an eight-week-old log divided by eight weeks of "normal" reads every
   ordinary fortnight as a spike. */
export function blocksOf(shaped, now) {
  const out = Array.from({ length: BLOCKS }, () => ({ sessions: 0, hard: 0, f: 0, by: {}, fBy: {}, full: false }));
  let first = -1;
  (Array.isArray(shaped) ? shaped : []).forEach(s => {
    if (!s || !Number.isFinite(s.startedAt)) return;
    const ago = daysBetween(s.startedAt, now);
    if (ago < 0) return;
    if (ago > first) first = ago;
    const k = Math.floor(ago / 7);
    if (k >= BLOCKS) return;
    const b = out[k];
    b.sessions++;
    const sets = s.sets && typeof s.sets === 'object' ? s.sets : {};
    const fs = s.fsets && typeof s.fsets === 'object' ? s.fsets : {};
    Object.keys(sets).forEach(g => { const v = Number(sets[g]) || 0; b.hard += v; b.by[g] = (b.by[g] || 0) + v; });
    Object.keys(fs).forEach(g => { const v = Number(fs[g]) || 0; b.f += v; b.fBy[g] = (b.fBy[g] || 0) + v; });
  });
  out.forEach((b, k) => { b.full = 7 * k + 6 <= first; });
  return out;
}

/* Which weeks were light: a whole week with a session in it, and hard sets
   at 60% or less of his usual week (the median of weeks three to ten that had
   a session). A light week is left out of every normal below and never counts
   as a decline. */
export function lightOf(blocks) {
  const ref = blocks.slice(2, 10).filter(b => b.full && b.sessions > 0).map(b => b.hard);
  if (ref.length < LIGHT_MIN_WEEKS) return { usual: null, light: new Set() };
  const usual = median(ref);
  const light = new Set();
  blocks.forEach((b, k) => { if (b.full && b.sessions > 0 && b.hard <= LIGHT_SHARE * usual) light.add(k); });
  return { usual, light };
}

// The weeks a normal is read over: whole weeks, light ones left out. Empty
// whole weeks stay in — a week off is part of what his weeks look like.
function normalWeeks(blocks, light, from, to) {
  const ks = [];
  for (let k = from; k <= to && k < blocks.length; k++) if (blocks[k].full && !light.has(k)) ks.push(k);
  return ks;
}
// A group's weekly normal over those weeks (every group, with g null).
function weeklyOf(blocks, light, from, to, g) {
  const ks = normalWeeks(blocks, light, from, to);
  if (!ks.length) return null;
  return sum(ks.map(k => (g ? blocks[k].by[g] || 0 : blocks[k].hard))) / ks.length;
}

/* §3.4 GROUP FATIGUE. The last two weeks against weeks three to ten. */
function fatigueOf(blocks, light, g) {
  if (!g) return null;
  const recentSets = (blocks[0].by[g] || 0) + (blocks[1].by[g] || 0);
  const recentF = (blocks[0].fBy[g] || 0) + (blocks[1].fBy[g] || 0);
  const normal = weeklyOf(blocks, light, 2, 9, g);
  const ks = normalWeeks(blocks, light, 2, 9);
  const normSets = sum(ks.map(k => blocks[k].by[g] || 0));
  const normF = sum(ks.map(k => blocks[k].fBy[g] || 0));
  const recent = recentSets / 2;
  const shareRecent = recentSets > 0 ? recentF / recentSets : 0;
  const shareNormal = normSets > 0 ? normF / normSets : 0;
  const bySets = normal != null && normal >= FATIGUE_MIN_NORMAL && recent >= FATIGUE_SETS * normal;
  const byF = recentF >= FATIGUE_F_SETS && shareRecent >= FATIGUE_F_SHARE * Math.max(shareNormal, FATIGUE_F_FLOOR);
  return { group: g, recent, normal, recentF, shareRecent, shareNormal, bySets, byF, fatigued: bySets || byF };
}

/* ================================================================
   2.  readLift — plateau, or cut?
   ================================================================
   readLift(ex, ctx, input) -> { call, ... }

     ex     { exId, name, group, equipment, exposures, groupDaysSince } — the
            shape coach-prog.js's prescribe() takes
     ctx    { now, u, aim, exp, energy, rateWk } — prescribe()'s context
     input  { shaped, weighIns, lifts, hidden, goalDir, goalRateWk, targetsOn }
            shaped: coach.js's shaped sessions (sets and fsets per group)
            weighIns: [{ lb, t }]
            lifts: every lift he has logged, for a variation from his own log

   `call` is one of irregular, fatigue, holding_cut, small_slide, sliding,
   plateau, unknown — each with a sentence and its evidence — or none, with
   `because`: nobase, progressing, thin (too few sessions to read), recent (a
   new best inside three weeks) or rising (moving up across the window,
   whatever the status says); `thin` is too few sessions in the window to read. */
export function readLift(ex, ctx, input) {
  try {
    const i = input || {}, e = ex || {}, c = ctx || {};
    const own = Array.isArray(i.lifts) && i.lifts.find(l => l.exId === e.exId) === e;
    return own ? memo(i, 'r|' + e.exId + '|' + ctxKey(c) + '|' + i.goalDir + '|' + i.goalRateWk + '|' + i.targetsOn,
                      () => readOne(e, c, i)) : readOne(e, c, i);
  } catch {
    return { call: 'none', because: 'nobase' };
  }
}

function readOne(ex0, c, i) {
  const ex = Array.isArray(ex0.exposures) ? ex0 : { ...ex0, exposures: exposuresFor(i.shaped || [], ex0.exId) };
  const now = c.now;
  const u = c.u === 'kg' ? 'kg' : 'lb';
  const none = (because, extra) => ({ call: 'none', because, exId: ex.exId || null, ...(extra || null) });
  if (!Number.isFinite(now) || isCardio(ex)) return none('nobase');
  const b = ex === ex0 ? baselinesOf(i, ex0, c) : baselines(ex, c);
  // Assistance runs backwards: an assisted lift's estimated max means nothing.
  if (!b || b.assisted || !b.series.length) return none('nobase');
  if (b.status === 'progressing') return none('progressing', { b });

  const { blocks, light } = weeksOf(i, now);
  const inLight = ms => light.has(Math.floor(daysBetween(ms, now) / 7));

  const S = b.series;
  const lastAt = S[S.length - 1].startedAt;
  // The read window, with any light week's sessions taken out: a week he
  // meant to go easy is never read as a decline.
  const W = S.filter(p => p.startedAt >= lastAt - READ_DAYS * DAY && !inLight(p.startedAt));
  const span = W.length ? daysBetween(W[0].startedAt, W[W.length - 1].startedAt) : 0;
  if (W.length < READ_POINTS || span < READ_SPAN_DAYS) return none('thin', { b, points: W.length });

  const flat = b.status === 'stalled' || b.status === 'declining' ||
    b.lastBestAt == null || daysBetween(b.lastBestAt, now) > FLAT_BEST_DAYS;
  if (!flat) return none('recent', { b });

  const start = W[0].startedAt, end = W[W.length - 1].startedAt;
  const weeks = span / 7;
  // Whole pounds, like every estimated max the app prints (analytics.js's
  // e1rm rounds): a median of two can land on a half, and 263.5 is a
  // precision the estimate does not have.
  const e1F = Math.round(median([W[0].y, W[1].y]));
  const e1L = Math.round(median([W[W.length - 2].y, W[W.length - 1].y]));
  const abs = e1L / e1F - 1;
  const noise = Math.max(LEVEL_PCT, Number.isFinite(b.sigma) ? b.sigma : 0);
  // Moving up across the window by more than his own noise is not flat,
  // whatever the status says — and not a thing to read as a plateau.
  if (abs * 100 >= noise) return none('rising', { b, e1F, e1L, weeks });

  const weighIns = Array.isArray(i.weighIns) ? i.weighIns : [];
  const bwS = bwAt(weighIns, start), bwE = bwAt(weighIns, end);
  const ctxW = bwS && bwE && weeks >= 3 ? energyBand((bwE - bwS) / bwS / weeks * 100) : null;
  const rs = bwS && bwE ? (e1L / bwE) / (e1F / bwS) - 1 : null;
  const irregular = b.freq.normal >= IRREGULAR_MIN_WEEKLY && b.freq.recent < IRREGULAR_SHARE * b.freq.normal;
  const fat = fatigueOf(blocks, light, ex.group);

  let call;
  const cutting = ctxW === 'deficit' || ctxW === 'deep';
  if (irregular) call = 'irregular';
  else if (fat && fat.fatigued) call = 'fatigue';
  else if (cutting && rs >= HOLD_RS && abs >= SLIDE_ABS) call = 'holding_cut';
  else if (cutting && abs >= SLIDE_ABS) call = 'small_slide';
  else if (cutting) call = 'sliding';
  else if (ctxW === 'hold' || ctxW === 'surplus') call = 'plateau';
  else call = 'unknown';

  const weeksFlat = daysBetween(Math.max(b.lastBestAt == null ? -Infinity : b.lastBestAt, S[0].startedAt), now) / 7;
  const r = {
    call, exId: ex.exId, name: String(ex.name || ex.exId || ''), group: ex.group || null,
    start, end, weeks, weeksFlat, abs, rs, bwS, bwE, ctxW, e1F, e1L, points: W.length,
    // How often, over the stretch being read: the sessions in it, across its span.
    often: (W.length - 1) / weeks,
    freq: b.freq, status: b.status, fatigue: fat, level: Math.abs(abs * 100) < noise
  };
  if (call === 'plateau') Object.assign(r, rungOf(ex, c, i, b, blocks, light, weeksFlat));
  return Object.assign(r, words(r, ex, c, i, u, b));
}

/* §3.5 THE LADDER, for a real plateau only. */
function rungOf(ex, c, i, b, blocks, light, weeksFlat) {
  const g = ex.group;
  // His group's sets over the last four weeks against weeks five to twelve.
  const recent4 = g ? sum([0, 1, 2, 3].map(k => blocks[k].by[g] || 0)) / 4 : null;
  const normal12 = g ? weeklyOf(blocks, light, 4, 11, g) : null;
  const floor = volumeFloor(c.aim, normal12);
  const volume = recent4 != null && normal12 != null && floor != null && recent4 < normal12 && recent4 < floor
    ? { recent4, normal12, floor, more: Math.max(1, Math.ceil(floor - recent4 - 1e-9)) } : null;
  const variation = weeksFlat >= PLATEAU_WEEKS ? variationOf(ex, c, i) : null;

  if (weeksFlat < PLATEAU_WEEKS) {
    // Grinding: the top load's reps under the bottom of his range in two of
    // the last three sessions. Reset only says what the target already does.
    const lastLoad = b.topReps.length ? b.topReps[b.topReps.length - 1].load : null;
    const grinding = b.range && b.topReps.filter(t => Math.abs(t.load - lastLoad) < TOL &&
      Math.min(...t.reps) < b.range.lo).length >= 2;
    if (grinding && i.targetsOn !== false) {
      // v52: what Coach's target does, so the target — marks honoured.
      const t = targetFor(ex, c, ex.mark || null);
      if (t && (t.mode === 'reduce' || t.mode === 'hold')) return { rung: 'reset', targetMode: t.mode, volume, variation: null };
    }
    return { rung: 'wait', volume, variation: null };
  }
  if (weeksFlat < VARIATION_WEEKS && volume) return { rung: 'volume', volume, variation: null };
  if (variation) return { rung: 'variation', volume, variation };
  if (volume) return { rung: 'volume', volume, variation: null };
  return { rung: 'none', volume: null, variation: null };
}

/* A variation from HIS OWN LOG: the last six months, the same primary group
   and movement pattern, a different angle or different equipment, not hidden,
   not this lift. Never a lift he has never logged. A custom exercise has no
   pattern, so it neither offers nor receives one. */
function variationOf(ex, c, i) {
  const tag = tagsFor(ex.exId);
  if (!tag || !tag.pattern || tag.pattern === 'cardio') return null;
  const hidden = new Set(Array.isArray(i.hidden) ? i.hidden : []);
  const cands = (Array.isArray(i.lifts) ? i.lifts : []).filter(l => {
    if (!l || l.exId === ex.exId || hidden.has(l.exId) || l.group !== ex.group) return false;
    if (!Number.isFinite(l.lastAt) || daysBetween(l.lastAt, c.now) >= VARIATION_DAYS || daysBetween(l.lastAt, c.now) < 0) return false;
    const t = tagsFor(l.exId);
    return !!t && t.pattern === tag.pattern && (t.angle !== tag.angle || l.equipment !== ex.equipment);
  }).sort((a, b) => b.lastAt - a.lastAt || (a.exId < b.exId ? -1 : a.exId > b.exId ? 1 : 0));
  return cands.length ? { exId: cands[0].exId, name: String(cands[0].name || cands[0].exId), lastAt: cands[0].lastAt } : null;
}

/* §3.9 THE SENTENCES. Every call says what actually happened: "level" only
   inside his noise, "down 7%" past it; "at steady bodyweight" only when the
   weight held; "a real plateau" only past five weeks. "Cut" only under the
   rule at the top of this file. Every weight through units.js. */
function words(r, ex, c, i, u, b) {
  const name = r.name;
  const gw = groupWord(r.group);
  const W = x => labelW(x, u);
  const down = Math.max(1, Math.round(-r.abs * 100));
  const wks = Math.max(3, Math.round(r.weeks));
  const flatWks = Math.max(1, Math.floor(r.weeksFlat + 1e-9));
  const cutWord = c.aim === 'cut' || c.aim === 'recomp' || i.goalDir === -1;
  const lost = r.bwS != null && r.bwE != null ? r.bwS - r.bwE : null;
  const lead = r.level ? name + ' has been level at about ' + W(r.e1L) + ' for ' + plural(flatWks, 'week')
                       : name + ' is down ' + down + '% over ' + plural(wks, 'week');
  const evidence = 'Estimated max ' + W(r.e1F) + ' at the start of that stretch and ' + W(r.e1L) +
    ' at the end, across ' + plural(r.points, 'session') + ' over ' + plural(wks, 'week') + '.';
  const bodyEvidence = r.bwS != null && r.bwE != null
    ? ' Bodyweight ' + W(r.bwS) + ' then ' + W(r.bwE) + ', the middle of your weigh-ins in the week to each end.' : '';

  if (r.call === 'irregular') {
    const k = Math.round(r.freq.recent * 4);
    return {
      text: name + ' is ' + (r.level ? 'level' : 'down ' + down + '%') + ', and you’ve done it ' + plural(k, 'time') +
            ' in the last 4 weeks against your usual ' + perWeek(r.freq.normal).replace(/^about /, '') + '.',
      reason: 'A lift done less often than your own habit isn’t a plateau: the sessions aren’t there to read. ' + evidence
    };
  }
  if (r.call === 'fatigue') {
    const f = r.fatigue;
    const why = f.bySets
      ? ' while your ' + gw + ' sets ran ' + Math.round((f.recent / f.normal - 1) * 100) + '% over your usual'
      : ' while ' + f.recentF + ' of your ' + gw + ' sets in the last two weeks were taken to failure, more than your usual share';
    const half = f.normal != null ? Math.floor(f.normal / 2) : 0;
    return {
      text: (r.level ? name + ' has been level for ' + plural(flatWks, 'week') : name + ' is down ' + down + '% over ' + plural(wks, 'week')) +
            why + '.' + (half >= 1
              ? ' A lighter week is a common way through: about ' + half + ' ' + gw + ' sets instead of your usual ' + one(f.normal) +
                ', the same weights, then back to normal.' : ''),
      reason: 'Your ' + gw + ' sets: about ' + one(f.recent) + ' a week over the last two weeks, against ' +
              (f.normal != null ? one(f.normal) : 'none') + ' a week in the eight before. ' + evidence
    };
  }
  if (r.call === 'holding_cut') {
    const rsPct = Math.round(r.rs * 100);
    const rsWord = rsPct >= 1 ? 'up ' + rsPct + '%' : rsPct <= -1 ? 'down ' + -rsPct + '%' : 'level';
    const est = r.level ? 'level at ' + W(r.e1L) : 'down ' + down + '%, at ' + W(r.e1L);
    return {
      text: 'Your estimated max on ' + name + ' is ' + est + ', and for your bodyweight it’s ' + rsWord +
            (cutWord ? ' while you’ve lost ' + W(lost) + '. In a cut, that’s ' + (c.aim === 'cut' ? 'the win.' : 'holding.')
                     : ' while your weight has come down about ' + W(lost) + '. Per pound of bodyweight, that’s holding.'),
      reason: evidence + bodyEvidence
    };
  }
  if (r.call === 'small_slide') {
    return {
      text: name + ' is down ' + down + '% over ' + plural(wks, 'week') +
            (cutWord ? ' of cutting' : ' while your weight has come down about ' + W(lost)) +
            ', a small slide. Coach will say if it speeds up.',
      reason: evidence + bodyEvidence
    };
  }
  if (r.call === 'sliding') {
    const lossWk = lost / r.weeks;
    const goal = Number.isFinite(i.goalRateWk) && i.goalRateWk < 0 ? -i.goalRateWk : null;
    const vs = goal == null ? '' : lossWk > goal * 1.0 + 1e-9
      ? ', faster than the ' + labelRate(goal, u) + ' a week you set' : ', against the ' + labelRate(goal, u) + ' a week you set';
    const { blocks, light } = weeksOf(i, c.now);
    const g = r.group;
    const recent4 = g ? sum([0, 1, 2, 3].map(k => blocks[k].by[g] || 0)) / 4 : null;
    const normal12 = g ? weeklyOf(blocks, light, 4, 11, g) : null;
    const opts = [];
    if (goal != null) opts.push('your rate against the one you set');
    if (recent4 != null && normal12 != null && normal12 > 0) {
      opts.push('your ' + gw + ' sets against your usual (' + one(recent4) + ' a week lately, ' + one(normal12) + ' before)');
    }
    opts.push('a lighter week');
    return {
      text: name + ' is down ' + down + '% over ' + plural(wks, 'week') + ' while you’ve lost about ' +
            labelRate(lossWk, u) + ' a week' + vs + '.',
      reason: 'Things worth comparing: ' + (opts.length > 1 ? opts.slice(0, -1).join(', ') + ', or ' + opts[opts.length - 1] : opts[0]) +
              '. ' + evidence + bodyEvidence
    };
  }
  if (r.call === 'plateau') {
    const body = r.ctxW === 'hold' ? ' at steady bodyweight'
      : ' while your weight has gone up about ' + W(r.bwE - r.bwS);
    const often = perWeek(r.often);
    let rung = '';
    if (r.rung === 'reset') {
      rung = r.targetMode === 'reduce' ? ' Coach’s target steps the weight back, and you build from there.'
        : ' Coach’s target keeps the weight until your reps are back in range.';
    } else if (r.rung === 'wait') {
      rung = ' Stalls under five weeks often break on their own' + (i.targetsOn !== false ? ', so the targets stay.' : '.');
    } else if (r.rung === 'volume') {
      const v = r.volume;
      rung = ' +' + v.more + ' ' + (v.more === 1 ? 'set' : 'sets') + ' a week for ' + gw + ' would reach ' +
             (c.aim === 'cut' ? v.floor + ', two thirds of your usual ' + one(v.normal12) + '.' : 'a common starting point of ' + v.floor + '.');
    } else if (r.rung === 'variation') {
      rung = ' You’ve done ' + r.variation.name + ' before. A few weeks of it is a common way through a flat stretch.';
    }
    const volEvidence = r.volume && (r.rung === 'volume')
      ? ' Your ' + gw + ' sets: about ' + one(r.volume.recent4) + ' a week over the last 4 weeks, against ' +
        one(r.volume.normal12) + ' a week in the eight before.' : '';
    return {
      text: lead + body + (often ? ', training it ' + often : '') + '.' +
            (r.weeksFlat >= PLATEAU_WEEKS ? ' That’s a real plateau.' : '') + rung,
      reason: evidence + bodyEvidence + volEvidence
    };
  }
  // unknown
  return {
    text: 'Your estimated max on ' + (r.level ? name + ' has been level at about ' + W(r.e1L) + ' for ' + plural(flatWks, 'week')
                                              : name + ' is down ' + down + '% over ' + plural(wks, 'week') + ', to ' + W(r.e1L)) +
          '. Coach needs a couple of weigh-ins near the start and the end of that stretch to tell whether your weight is part of it.',
    reason: evidence
  };
}

/* ================================================================
   2b. liftsMoving — "How are my lifts moving?"
   ================================================================
   Up to five lifts, the ones with the most sessions in twelve weeks, one line
   each and every line true: a climbing lift says by how much, a flat one says
   what readLift() makes of it, a lift with too few sessions in the window says
   so, and anything else is level lately. Assisted lifts (whose estimated max
   runs backwards), bodyweight lifts (which have none) and cardio are left out:
   a line about them would be a number that means nothing. */
const MOVING_MAX = 5;
export function liftsMoving(input, now) {
  try {
    return moving(input || {}, now);
  } catch {
    return [];
  }
}

function moving(i0, now) {
  if (!Number.isFinite(now)) return [];
  const i = prepare(i0);
  const u = i.u === 'kg' ? 'kg' : 'lb';
  const ctx = ctxOf(i, now);
  const rows = [];
  i.lifts.forEach(ex => {
    if (isCardio(ex)) return;
    const b = baselinesOf(i, ex, ctx);
    if (!b || b.assisted || !b.series.length) return;
    const n84 = b.tops.filter(t => t.daysAgo >= 0 && t.daysAgo < WINDOW_DAYS).length;
    if (!n84) return;
    rows.push({ ex, b, n84 });
  });
  rows.sort((a, b) => b.n84 - a.n84 || (a.ex.exId < b.ex.exId ? -1 : a.ex.exId > b.ex.exId ? 1 : 0));
  return rows.slice(0, MOVING_MAX).map(({ ex, b }) => ({ exId: ex.exId, ...lineOf(ex, b, ctx, i, u, now) }));
}

function lineOf(ex, b, ctx, i, u, now) {
  const name = String(ex.name || ex.exId);
  const upBy = (lb, days) => {
    const wks = Math.max(1, Math.round(days / 7));
    return name + ': up about ' + labelW(lb, u) + ' on your estimated max over ' + plural(wks, 'week') + '.';
  };
  const bestOn = ms => dayLabel(dayKey(ms));
  if (b.status === 'progressing') {
    const win = b.series.slice(-8);
    const days = win.length > 1 ? daysBetween(win[0].startedAt, win[win.length - 1].startedAt) : 0;
    const shown = Number.isFinite(b.moveLb) ? Math.round(wOut(b.moveLb, u)) : 0;
    if (shown >= 1 && days >= 7) {
      return { text: upBy(b.moveLb, days), reason: 'The fitted line through the best set of each of your last ' +
               plural(win.length, 'session') + ', so one great day or one bad one doesn’t bend it.' };
    }
    if (b.lastBestAt != null) {
      return { text: name + ': a new best on ' + bestOn(b.lastBestAt) + '.',
               reason: 'Your best estimated max on it, 1% or more over every session before it.' };
    }
    return { text: name + ': climbing lately.', reason: 'Its best set has been rising across your last few sessions.' };
  }
  const r = readLift(ex, ctx, i);
  if (r.call !== 'none') return { text: r.text, reason: r.reason };
  if (r.because === 'rising') {
    return { text: upBy(r.e1L - r.e1F, r.weeks * 7),
             reason: 'From the best set of your first two and last two sessions of it in that stretch.' };
  }
  if (r.because === 'thin') {
    return { text: name + ': too soon to call (' + plural(r.points, 'session') + ').',
             reason: 'Coach wants four sessions across three weeks before it says whether a lift is moving.' };
  }
  if (r.because === 'recent' && b.lastBestAt != null) {
    return { text: name + ': level lately, after a new best on ' + bestOn(b.lastBestAt) + '.',
             reason: 'Your best estimated max on it, 1% or more over every session before it.' };
  }
  return { text: name + ': level lately.', reason: 'No new best in the last three weeks, and nothing Coach reads as a plateau or a slide.' };
}

/* v50: ONE SHORT WORD FOR A LIFT, for the lines that name several at once —
   the focus group and the big three under "How am I tracking toward my goal?".
   v49 printed coach-prog.js's raw status there, and v48's rule is that a
   status is never printed: `holding` is its word for "too few sessions spread
   wide enough to call", which a reader takes as "keeping its strength", and a
   lift trained twice a week reads `holding` for months while it is flat or
   falling. On Micah's phone: "Barbell Bench Press is holding." This says what
   lineOf() says, short, from the same two readings. */
function wordOf(ex, b, ctx, i) {
  if (b.status === 'progressing') return 'climbing';
  const r = readLift(ex, ctx, i);
  if (r.call === 'none') {
    if (r.because === 'rising') return 'climbing';
    if (r.because === 'thin') return 'too soon to call';
    return 'level lately';
  }
  // Level through a loss of bodyweight, strength for its weight held. Never
  // "cut" here: this line has no room for §3.3's rule on when Coach may say so.
  if (r.call === 'holding_cut') return 'holding steady';
  // Not rising (readLift answered that above), so outside his noise is down.
  return r.level ? 'level' : 'coming down';
}

/* A session's date the way the app prints one ("Tue, Sep 16"), worked out in
   UTC from the date KEY, so the day it was filed under is the day this names
   in every time zone — the spelling coach-prog.js and coach-build.js use. */
const DAY_NAMES = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const MONTH_NAMES = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
function dayLabel(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!m) return 'a recent session';
  const y = Number(m[1]), mo = Number(m[2]), dd = Number(m[3]);
  return DAY_NAMES[new Date(Date.UTC(y, mo - 1, dd)).getUTCDay()] + ', ' + MONTH_NAMES[mo - 1] + ' ' + dd;
}

/* ================================================================
   3.  lighterWeek — account-wide, and only ever reactive
   ================================================================
   Offered when two or more of these hold:
     1  two or more lifts declining (coach-prog.js's status)
     2  F share over the last two weeks at twice his usual, three F sets at least
     3  each of the last two weeks at 30% over his usual week's hard sets
     4  six weeks or more since his last light week, and 1 or 2 holds
   What it says is the Delphi consensus on deloading (Bell et al. 2023) with
   his own numbers in it: about half his usual sets per group, the same
   weights, about a week — labelled a common approach. Coach doesn't plan
   training blocks; this is only ever an answer to what the log shows. */
export function lighterWeek(input, now) {
  try {
    return lighter(prepare(input || {}), now);
  } catch {
    return null;
  }
}

function lighter(i, now) {
  if (!Number.isFinite(now)) return null;
  const u = i.u === 'kg' ? 'kg' : 'lb';
  const ctx = ctxOf(i, now);
  const { blocks, usual, light } = weeksOf(i, now);

  // 1. Lifts declining, among those with a session in the last twelve weeks.
  const declining = [];
  i.lifts.forEach(ex => {
    if (!ex || isCardio(ex) || !Number.isFinite(ex.lastAt) || daysBetween(ex.lastAt, now) >= WINDOW_DAYS) return;
    const b = baselinesOf(i, ex, ctx);
    if (b && !b.assisted && b.status === 'declining') declining.push(String(ex.name || ex.exId));
  });
  const c1 = declining.length >= 2;

  // 2. F share, account-wide, against weeks three to ten (light weeks out).
  const recentHard = blocks[0].hard + blocks[1].hard, recentF = blocks[0].f + blocks[1].f;
  const ks = normalWeeks(blocks, light, 2, 9);
  const normHard = sum(ks.map(k => blocks[k].hard)), normF = sum(ks.map(k => blocks[k].f));
  const shareRecent = recentHard > 0 ? recentF / recentHard : 0;
  const shareNormal = normHard > 0 ? normF / normHard : 0;
  const c2 = recentF >= FATIGUE_F_SETS && shareRecent >= FATIGUE_F_SHARE * Math.max(shareNormal, FATIGUE_F_FLOOR);

  // 3. Both of the last two weeks well over his usual week — light weeks out
  //    of the usual here too, so a deload does not make an ordinary week look big.
  const usualN = median(normalWeeks(blocks, light, 2, 9).filter(k => blocks[k].sessions > 0).map(k => blocks[k].hard));
  const c3 = usual != null && usualN != null && usualN > 0 &&
    blocks[0].hard >= FATIGUE_SETS * usualN && blocks[1].hard >= FATIGUE_SETS * usualN;

  // 4. Six weeks since the last light week — or none in the log, on a log
  //    that goes back that far — and 1 or 2.
  const lastLight = [...light].sort((a, b) => a - b)[0];
  const reaches = (Array.isArray(i.shaped) ? i.shaped : []).some(s => s && Number.isFinite(s.startedAt) &&
    daysBetween(s.startedAt, now) >= LIGHT_GAP_DAYS);
  const sinceLight = lastLight == null ? (reaches ? Infinity : 0) : lastLight * 7;
  const c4 = sinceLight >= LIGHT_GAP_DAYS && (c1 || c2);

  const held = [c1, c2, c3, c4].filter(Boolean).length;
  if (held < 2) return null;

  // His usual weekly sets per group, weeks three to twelve, light weeks out:
  // halved and rounded down, for the groups he trains twice a week or more.
  const groups = GROUP_ORDER.map(g => ({ group: g, normal: weeklyOf(blocks, light, 2, 11, g) }))
    .filter(x => x.normal != null && x.normal >= 2)
    .map(x => ({ ...x, half: Math.floor(x.normal / 2) }));
  const list = groups.map(x => x.half + ' for ' + groupWord(x.group));
  const named = list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : list[0];

  const ev = [];
  if (c1) ev.push(plural(declining.length, 'lift') + ' are down on their estimated max: ' +
    (declining.length > 1 ? declining.slice(0, -1).join(', ') + ' and ' + declining[declining.length - 1] : declining[0]) + '.');
  if (c2) ev.push(recentF + ' of your ' + recentHard + ' sets in the last two weeks were taken to failure, against about ' +
    Math.round(shareNormal * 100) + '% of your sets before.');
  if (c3) ev.push('Your sets ran ' + Math.round((blocks[1].hard / usualN - 1) * 100) + '% and ' +
    Math.round((blocks[0].hard / usualN - 1) * 100) + '% over your usual week, in each of the last two weeks.');
  if (c4) ev.push(lastLight == null ? 'No lighter week in your log in the last twelve weeks.'
    : 'Your last lighter week was ' + plural(lastLight, 'week') + ' ago.');
  return {
    conds: { declining: c1, failure: c2, volume: c3, sinceLight: c4 },
    declining, groups,
    text: 'A lighter week is a common approach here: about half your usual sets' +
          (named ? ' (for you, about ' + named + ')' : '') +
          ', the same weights you’ve been using, then back to normal.',
    reason: ev.join(' ') + ' Volume comes down, the weights can stay, for about a week.',
    u
  };
}

/* ================================================================
   4.  recordDay — "Good day for a record?"
   ================================================================
   A rep record at a weight he has already lifted, on a day the log gives no
   reason against it. Every gate must pass; see the constants above. */
export function recordDay(input, now) {
  try {
    return record(prepare(input || {}), now);
  } catch {
    return null;
  }
}

function record(i, now) {
  if (!Number.isFinite(now)) return null;
  const u = i.u === 'kg' ? 'kg' : 'lb';
  // A hard cut squeezes recovery hardest: no record prompt at all.
  if (i.energy === 'deep') return null;
  const ctx = ctxOf(i, now);
  const { light } = weeksOf(i, now);
  if (light.has(0)) return null;

  const cands = [];
  i.lifts.forEach(ex => {
    if (!ex || isCardio(ex)) return;
    const b = baselinesOf(i, ex, ctx);
    if (!b || b.assisted || b.exposures < RECORD_MIN_EXPOSURES || b.status === 'declining') return;
    const tops = b.tops;
    const last = tops[tops.length - 1];
    if (!(last.daysAgo >= 0 && last.daysAgo < RECORD_LIFT_DAYS)) return;
    const tail = tops.slice(-3);
    for (let k = 1; k < tail.length; k++) if (daysBetween(tail[k - 1].startedAt, tail[k].startedAt) > RECORD_GAP_DAYS) return;
    // The last session: no set to failure, and no set 25% or more under the
    // first at the same weight or lighter.
    if (last.sets.some(s => s.type === 'F')) return;
    const first = last.sets[0];
    if (!first) return;
    if (last.sets.slice(1).some(s => s.load <= first.load + TOL && s.reps <= first.reps * (1 - RECORD_DROP))) return;
    // The group rested: two days, or his quickest quarter of gaps if longer.
    const gDays = Number.isFinite(ex.groupDaysSince) ? ex.groupDaysSince : null;
    if (gDays == null || gDays < restOf(i.shaped, ex.group, now)) return;
    const read = readLift(ex, ctx, i);
    if (['sliding', 'small_slide', 'fatigue'].includes(read.call)) return;

    // The heaviest on-grid top load of the last four weeks where one more
    // rep than his best there sets a new best estimated max, at three reps or more.
    const best = b.best;
    const loads = [];
    tops.forEach(t => {
      if (t.daysAgo < 0 || t.daysAgo >= RECORD_WINDOW_DAYS || !t.grid || !(t.load > 0)) return;
      if (!loads.some(x => Math.abs(x.load - t.load) < TOL)) loads.push({ load: t.load, w: t.w });
    });
    loads.sort((a, b2) => b2.load - a.load);
    for (const L of loads) {
      let bestReps = 0, bestAt = null;
      tops.forEach(t => t.sets.forEach(s => {
        if (s.type === 'D' || Math.abs(s.load - L.load) >= TOL) return;
        if (s.reps >= bestReps) { bestReps = s.reps; bestAt = t; }
      }));
      const reps = bestReps + 1;
      if (reps < RECORD_MIN_REPS) continue;
      const would = e1rm(L.w, Math.min(reps, E1RM_MAX_REPS));
      if (!(would > best)) continue;
      cands.push({
        exId: ex.exId, name: String(ex.name || ex.exId), group: ex.group || null,
        load: L.load, w: L.w, reps, bestReps, bestDate: bestAt ? bestAt.date : null, would, best,
        groupDays: gDays, n84: tops.filter(t => t.daysAgo >= 0 && t.daysAgo < WINDOW_DAYS).length
      });
      return;
    }
  });
  if (!cands.length) return null;
  cands.sort((a, b) => b.n84 - a.n84 || (a.exId < b.exId ? -1 : a.exId > b.exId ? 1 : 0));
  const p = cands[0];
  // The load is on the half-unit grid by construction, where labelW() prints
  // exactly what the set row's own formatter does — in both units.
  const at = labelW(parseFloat(p.w), u);
  const gw = groupWord(p.group);
  return {
    ...p,
    text: 'Good day for ' + p.reps + ' at ' + at + ' on ' + p.name + ', one more rep than your best there.',
    reason: 'Your best at ' + at + ' is ' + plural(p.bestReps, 'rep') + '. ' + p.reps + ' there would be a new best estimated max: ' +
            labelW(p.would, u) + ' against ' + labelW(p.best, u) + '.' +
            (gw ? ' ' + cap(gw) + ' last trained ' + (p.groupDays === 1 ? 'yesterday' : plural(p.groupDays, 'day') + ' ago') + '.' : ''),
    unseen: 'Coach can’t see how you slept or how you feel, and those matter most on a record day.'
  };
}

// How long his group usually rests, at the quick end: the 25th percentile of
// his gaps between days training it in twelve weeks (four such days at
// least), never under two days.
function restOf(shaped, g, now) {
  if (!g) return RECORD_REST_DAYS;
  const days = [...new Set((Array.isArray(shaped) ? shaped : [])
    .filter(s => s && Number.isFinite(s.startedAt) && daysBetween(s.startedAt, now) >= 0 &&
      daysBetween(s.startedAt, now) < WINDOW_DAYS && s.sets && s.sets[g] > 0)
    .map(s => s.date || dayKey(s.startedAt)))].sort();
  if (days.length < 4) return RECORD_REST_DAYS;
  const gaps = [];
  for (let k = 1; k < days.length; k++) {
    gaps.push(Math.round((new Date(days[k] + 'T12:00:00') - new Date(days[k - 1] + 'T12:00:00')) / DAY));
  }
  return Math.max(RECORD_REST_DAYS, Math.ceil(quantile(gaps, RECORD_REST_Q) - 1e-9));
}

// prescribe()'s context, out of the overlap input.
function ctxOf(i, now) {
  return { now, u: i.u === 'kg' ? 'kg' : 'lb', aim: i.aim || null, exp: i.exp || null,
           energy: i.energy || null, rateWk: Number.isFinite(i.rateWk) ? i.rateWk : null };
}

/* ================================================================
   5.  STAGE THREE (v49) — after a workout, and the goal
   ================================================================
   The reads that need coach-prog.js — a target replayed as it stood before a
   session, a lift's status, its estimated-max series — live here beside the
   stage-two reads, because coach.js reaches coach-prog.js only through this
   file and the builder. Same rules: pure, the clock an argument, every weight
   through units.js. */

// The lifts in one shaped session, the way coach-prog.js counts an exposure
// (the merge invariant, working sets only), as the lift entries coach.js
// handed over — so each has its library name and group.
function liftsIn(i, session) {
  return i.lifts.filter(l => !isCardio(l) && exposuresFor([session], l.exId).length);
}

/* v52: a lift's marks as they stood before a moment, for a target replayed
   as of a session. coach.js decides which sessions are marked and hands the
   answer over on each lift (`mark`: every marked exposure's startedAt, the
   exposures themselves, and `byAt`, the target-from-before record for each);
   this only reads which of them came before `at`, and whether the latest of
   the lift's exposures before `at` is one of them. The lift's own exposures
   here are the performance log, the marked ones already out. */
function markBefore(l, at) {
  const m = l && l.mark;
  if (!m || !(m.markedAt instanceof Set)) return null;
  const markedAt = new Set([...m.markedAt].filter(t => t < at));
  if (!markedAt.size) return null;
  const kept = (l.exposures || []).filter(e => e.startedAt < at).map(e => e.startedAt);
  const lastKept = kept.length ? Math.max(...kept) : -Infinity;
  const lastMarked = Math.max(...markedAt);
  const latest = lastMarked > lastKept && m.byAt instanceof Map ? m.byAt.get(lastMarked) || null : null;
  return { markedAt, exposures: (m.exposures || []).filter(e => e.startedAt < at), latest };
}

// A group's days since as of a moment: the last session BEFORE it with a
// working set for the group. What coach.js's group.daysSince would have said
// that morning.
export function groupDaysAt(shaped, g, at) {
  if (!g) return null;
  let last = null;
  shaped.forEach(s => {
    if (s && Number.isFinite(s.startedAt) && s.startedAt < at && s.sets && s.sets[g] > 0 &&
        (last == null || s.startedAt > last)) last = s.startedAt;
  });
  return last == null ? null : daysBetween(last, at);
}

/* THE TARGETS, REPLAYED. Targets are stripped from the record when a session
   is saved, so the only way to know what Coach would have set before a
   session is to ask prescribe() again as it stood then: that lift's
   exposures before it, `now` at its start, its group's days-since as of that
   morning (miss that and a comeback replays as a re-entry while the builder
   showed a hold), and today's aim, experience and energy — three days is too
   short for any of them to move. A lift counts when its target named a
   number, and is met when its top sets reached the target's load and reps.
   v52: through coach-prog.js's targetFor(), with his marks as they stood
   before that session (markBefore, below) — so a session after a marked one
   is held to the target from before the marked one, the target he was shown. */
export function targetsReplay(input, session) {
  try {
    const i = prepare(input || {});
    if (!session || !Number.isFinite(session.startedAt)) return null;
    const at = session.startedAt;
    const ctx = { ...ctxOf(i, at) };
    const lifts = [];
    liftsIn(i, session).forEach(l => {
      // Its exposures before the session: the same as exposuresFor() over
      // every earlier session, without merging them all again.
      const exposures = l.exposures.filter(e => e.startedAt < at);
      const ex = { ...l, exposures, groupDaysSince: groupDaysAt(i.shaped, l.group, at) };
      const b = baselines(ex, ctx);
      if (b && b.assisted) return;
      const t = targetFor(ex, ctx, markBefore(l, at));
      if (!t || t.loadLb == null) return;
      const want = t.sets.filter(x => x.type !== 'W' && Math.abs(parseFloat(x.tw) - t.loadLb) < TOL)
        .map(x => parseInt(x.tr, 10)).filter(Number.isFinite).sort((a, b2) => b2 - a);
      if (!want.length) return;
      const did = exposuresFor([session], l.exId)[0].sets
        .filter(x => x.type !== 'D' && parseFloat(x.w) >= t.loadLb - TOL)
        .map(x => parseInt(x.r, 10)).sort((a, b2) => b2 - a);
      const met = did.length >= want.length && want.every((r, k) => did[k] >= r);
      lifts.push({ exId: l.exId, name: String(l.name || l.exId), met, line: t.line });
    });
    return { n: lifts.length, met: lifts.filter(x => x.met).length, lifts };
  } catch {
    return null;
  }
}

/* "HOW DID TODAY COMPARE?" — each lift with three sessions behind it: the
   session's best estimated max against the middle of its last three, in the
   lift's own session-to-session swing (σ, as coach-prog.js measures it).
   A whole swing or more either way is above or below; inside it is his usual.
   No attribution: Coach cannot see sleep, stress or soreness, and says so.
   If the numbers were usual, it says they were usual, whatever the day felt. */
const COMPARE_MIN_PRIOR = 3;
export function compareSession(input, session, now) {
  try {
    const i = prepare(input || {});
    if (!session || !Number.isFinite(session.startedAt)) return null;
    const u = i.u === 'kg' ? 'kg' : 'lb';
    const at = session.startedAt;
    const ctx = ctxOf(i, at);
    const rows = [];
    liftsIn(i, session).forEach(l => {
      const b0 = baselines({ ...l, exposures: l.exposures.filter(e => e.startedAt < at) }, ctx);
      if (!b0 || b0.assisted || b0.series.length < COMPARE_MIN_PRIOR) return;
      const b1 = baselines({ ...l, exposures: exposuresFor([session], l.exId) }, ctx);
      if (!b1 || !(b1.best > 0)) return;
      const usual = Math.round(median(b0.series.slice(-COMPARE_MIN_PRIOR).map(p => p.y)));
      const sigma = Number.isFinite(b0.sigma) && b0.sigma > 0 ? b0.sigma : 3;
      const z = (b1.best - usual) / usual * 100 / sigma;
      const verdict = z >= 1 ? 'above' : z <= -1 ? 'below' : 'usual';
      const name = String(l.name || l.exId);
      rows.push({ exId: l.exId, name, verdict, now: b1.best, usual,
        text: name + ': ' + (verdict === 'usual' ? 'about your usual' : verdict + ' your usual') + ', an estimated max of ' +
              labelW(b1.best, u) + ' against ' + labelW(usual, u) + '.' });
    });
    if (!rows.length) return null;
    const above = rows.filter(r => r.verdict === 'above').length, below = rows.filter(r => r.verdict === 'below').length;
    const summary = rows.length < 2 ? null
      : above * 2 > rows.length ? 'above' : below * 2 > rows.length ? 'below' : 'usual';
    return { summary, above, below, rows, day: daysBetween(at, now) };
  } catch {
    return null;
  }
}

/* "WHAT'S NEXT TIME?" — for each lift in the session, the target as it
   stands now, exactly as the builder would ask it: the lift's exposures, its
   group's days-since today, today's aim and energy — and (v52) his marks,
   through targetFor(), which coach.js hands over on each lift as `mark`. */
export function nextTargets(input, session, now) {
  try {
    const i = prepare(input || {});
    if (!session || !Number.isFinite(now)) return [];
    const ctx = ctxOf(i, now);
    const out = [];
    liftsIn(i, session).forEach(l => {
      const t = targetFor(l, ctx, l.mark || null);
      if (!t) return;
      const what = t.line.replace(/^Target: /, '');
      out.push({ exId: l.exId, mode: t.mode, text: 'Next time on ' + String(l.name || l.exId) + ': ' +
        what.charAt(0).toLowerCase() + what.slice(1), reason: (t.why && t.why[0]) || '' });
    });
    return out;
  } catch {
    return [];
  }
}

/* A LIFT THAT HAS CLIMBED, for the card: progressing, a series six weeks long
   at least, and up by twice his own session-to-session swing or more — well
   past noise. The biggest climb in its own terms wins; ties by id. */
const TREND_DAYS = 42;
export function liftTrend(input, now) {
  try {
    const i = prepare(input || {});
    const ctx = ctxOf(i, now);
    let best = null;
    i.lifts.forEach(l => {
      if (isCardio(l)) return;
      const b = baselinesOf(i, l, ctx);
      if (!b || b.assisted || b.status !== 'progressing' || b.series.length < 4) return;
      const S = b.series;
      const days = daysBetween(S[0].startedAt, S[S.length - 1].startedAt);
      if (days < TREND_DAYS) return;
      const first = median([S[0].y, S[1].y]), last = median([S[S.length - 2].y, S[S.length - 1].y]);
      const gain = last - first, mid = median(S.map(p => p.y));
      const sigma = Number.isFinite(b.sigma) ? b.sigma : 3;
      if (!(gain >= 2 * sigma / 100 * mid)) return;
      const cand = { exId: l.exId, name: String(l.name || l.exId), gainLb: Math.round(gain), share: gain / first,
                     weeks: Math.round(days / 7), lastAt: S[S.length - 1].startedAt };
      if (!best || cand.share > best.share || (cand.share === best.share && cand.exId < best.exId)) best = cand;
    });
    return best;
  } catch {
    return null;
  }
}

/* THE LIFT TARGET, read. Its estimated max (reps capped at twelve, like every
   estimated max Coach reads, so a 225 × 15 target is reached when 225 × 15 is
   logged), where he is now, his pace over the window, and how far the gap has
   closed since the target was set. The pace maths is coach-goal.js's. */
export function goalLiftRead(input, goalLift, now) {
  try {
    const i = prepare(input || {});
    const g = goalLift;
    if (!g || !g.exId || !(g.lb > 0)) return null;
    const ex = i.lifts.find(l => l.exId === g.exId);
    const target = e1rm(g.lb, Math.min(g.reps || 1, E1RM_MAX_REPS));
    if (!ex) return { exId: g.exId, target, logged: false };
    const ctx = ctxOf(i, now);
    const b = baselines(ex, ctx);
    if (!b || b.assisted || !b.series.length) return { exId: g.exId, name: ex.name, target, logged: false };
    const pace = paceForLift(b, target);
    // Where he stood when the target was set: the middle of his last two
    // sessions before it.
    const then = baselines({ ...ex, exposures: ex.exposures.filter(e => e.startedAt <= g.at) }, ctxOf(i, g.at));
    const e0 = then && then.series.length ? median(then.series.slice(-2).map(p => p.y)) : null;
    const closed = e0 != null && target > e0 && pace ? (pace.current - e0) / (target - e0) : null;
    return { exId: g.exId, name: String(ex.name || ex.exId), target, logged: true, pace, e0, closed,
             read: readLift(ex, ctx, i) };
  } catch {
    return null;
  }
}
function paceForLift(b, target) {
  return paceFor(b.series.map(p => ({ t: p.startedAt, y: p.y })), target);
}

/* POWERLIFTING'S BIG THREE, estimated: the most-logged squat, bench and
   deadlift variant each (twelve weeks), its estimated max now — the middle of
   its last two sessions — and its status; and the total when all three are
   there. */
const BIG_THREE = Object.freeze([
  ['squat', ['back-squat-low-bar', 'back-squat-high-bar']],
  ['bench', ['barbell-bench-press', 'barbell-bench-press-paused']],
  ['deadlift', ['conventional-deadlift', 'sumo-deadlift']]
]);
export function bigThree(input, now) {
  try {
    const i = prepare(input || {});
    const ctx = ctxOf(i, now);
    const out = BIG_THREE.map(([which, ids]) => {
      let pick = null;
      ids.forEach(id => {
        const l = i.lifts.find(x => x.exId === id);
        if (!l) return;
        const b = baselines(l, ctx);
        if (!b || !b.series.length) return;
        const n = b.tops.filter(t => t.daysAgo >= 0 && t.daysAgo < WINDOW_DAYS).length;
        if (!n) return;
        if (!pick || n > pick.n) pick = { which, exId: id, name: String(l.name || id), n, b };
      });
      if (!pick) return { which, lift: null };
      const S = pick.b.series;
      const l = i.lifts.find(x => x.exId === pick.exId);
      return { which, lift: { exId: pick.exId, name: pick.name, status: pick.b.status, word: wordOf(l, pick.b, ctx, i),
        e1: Math.round(median(S.slice(-2).map(p => p.y))) } };
    });
    const total = out.every(x => x.lift) ? out.reduce((a, x) => a + x.lift.e1, 0) : null;
    return { lifts: out, total };
  } catch {
    return null;
  }
}

/* THE FOCUS GROUP, read: its weekly hard sets over the last four weeks
   against weeks five to twelve (the shipped count, light weeks out), and its
   two most-logged lifts' statuses. */
export function focusRead(input, group, now) {
  try {
    const i = prepare(input || {});
    if (!GROUPS[group]) return null;
    const blocks = blocksOf(i.shaped, now);
    const { light } = lightOf(blocks);
    const recent4 = sum([0, 1, 2, 3].map(k => blocks[k].by[group] || 0)) / 4;
    const normal = weeklyOf(blocks, light, 4, 11, group);
    const ctx = ctxOf(i, now);
    const lifts = i.lifts.filter(l => l.group === group && !isCardio(l)).map(l => {
      const b = baselines(l, ctx);
      const n = b ? b.tops.filter(t => t.daysAgo >= 0 && t.daysAgo < WINDOW_DAYS).length : 0;
      const ok = b && !b.assisted && b.series.length;
      return { exId: l.exId, name: String(l.name || l.exId), n, status: ok ? b.status : null,
               word: ok ? wordOf(l, b, ctx, i) : null };
    }).filter(x => x.n > 0 && x.status)
      .sort((a, b) => b.n - a.n || (a.exId < b.exId ? -1 : a.exId > b.exId ? 1 : 0)).slice(0, 2);
    return { group, recent4, normal, lifts };
  } catch {
    return null;
  }
}
