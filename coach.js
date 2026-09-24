// Coach — what Rack makes of your log, and why it thinks so.
//
// Every sentence in here is arithmetic over the account's own data with its
// working attached. There is no model call, no network, no per-use cost and
// nothing generated: a finding is a number the reader could go and check on
// another tab, and a finding that cannot be backed by a number is not made.
//
// THE HOUSE LAW, and it governs every line below: A WRONG NUMBER IS WORSE THAN
// NO NUMBER. A rule whose data is thin stays silent. A fact that cannot be
// computed honestly is absent rather than guessed. Silence is always an
// available answer here and it is never a bug — `card_state_clear` exists
// precisely so that "nothing stands out" is a thing Coach can say out loud.
//
// Four layers, deliberately separate, because adding to Coach has to mean
// adding a fact, a rule, a template or a phrasing — never editing a function
// that grows:
//
//   FACTS      named values, each carrying the short "because" string it
//              contributes to a reason line, and the age of the evidence
//   INTENTS    registered objects: the facts they need, a min-data gate, a
//              condition, a band, a severity, a category, what they supersede
//   RESPONSES  templates keyed by id, filled from resolved facts. Split from
//              the rules so one finding renders on a card, in a bubble, or
//              later in a weekly review without the condition being written
//              twice
//   ROUTER     (button id | intent id) -> intent -> rules -> response. It
//              exists now with only buttons feeding it so that ship three can
//              put text matching in front of it and change nothing else
//
// PURE, and the purity is the native port's whole plan. No DOM, no reads, no
// module state, no clock — `now` is an argument, and so is the rotation seed,
// so two renders inside one app open cannot disagree about which greeting is
// showing. analytics.js is imported for its SESSION MATH only (e1rm and the
// merge invariant, which must not be restated here or the two will drift);
// loadAll/allSessions are the impure half and are never touched. coach-data.js
// is the impure gatherer and is the one file the native port rewrites.
//
// Imports units.js, exercises.js, the pure half of analytics.js, coach-build.js
// — the workout builder, which decides what goes into a proposal — and
// coach-live.js, which reads a workout in progress. Both take everything they
// know about the log from here. And coach-goal.js, whose aims and energy
// context the goal's facts read (the targets themselves are coach-prog.js's,
// reached through the builder). Nothing imports back.

import { GROUPS, GROUP_ORDER } from './exercises.js';
import { e1rm, isWorking, mergeSessionExercises, exerciseIndex } from './analytics.js';
import { labelW, labelRate, unitW, fmtW } from './units.js';
import { propose, liveRefusal, buildMenu, swapTo, BUILD_ASK } from './coach-build.js';
import { liveRead, LIVE_NONE } from './coach-live.js';
import { AIMS, EXPERIENCE, energyContext } from './coach-goal.js';
import { readLift, lighterWeek, recordDay, liftsMoving, prepare } from './coach-overlap.js';

const DAY = 864e5;

/* The window every recurring-shape, median-gap and trailing-normal derivation
   below reads. Twelve weeks: long enough that a four-week block and a week off
   both sit inside it, short enough that a training habit from the spring is not
   still voting on what today looks like. */
export const WINDOW_DAYS = 84;

/* A rate of body-weight change beyond which Coach reports the number and
   declines to call it anything. POUNDS, and it stays pounds — it is a bar, and
   a bar that moved when somebody switched to kilos would mean two accounts
   changing at the same speed got different readings. Only the printed number
   converts. See §5.1 of the brief: insights.js `rateVerdict` returned 'good' for
   any rate in the goal's direction, unbounded, and Coach must not inherit that.
   Since v47 it carries this same band (its own RATE_BAND_LB, held equal to this
   one by tools-check/rate-band.mjs). Nothing in a Coach sentence ever names
   this number. */
const RATE_BAND_LB = 1.5;

/* How far past its own median gap a group has to be before Coach calls it
   overdue. Both halves are needed: the ratio alone makes a group trained every
   other day "overdue" at three, and the margin alone makes a group trained
   monthly overdue every month. Neither number is ever printed. */
const OVERDUE_MARGIN_DAYS = 2;
const OVERDUE_RATIO = 1.4;

/* How long a question that was put and not answered stays put. Somebody who
   opened the sheet, saw the question and closed it has not refused it — they
   were looking for something else — so asking again later is right and asking
   again tomorrow is nagging. A week. */
const ASK_COOLDOWN_DAYS = 7;

/* PATTERNS (ship three). Half a year rather than twelve weeks, because each of
   the eight checks needs eight on BOTH sides and several of them count weeks
   — twelve weeks cannot hold sixteen of anything, and twenty-six still
   describe the habits he has now rather than the ones he had last year. */
export const PATTERN_DAYS = 182;
/* Eight on each side, or the comparison is not made. With fewer, one odd day
   moves a median, and a pattern one day can make is not a pattern. */
export const PATTERN_MIN = 8;
/* "Morning" is a session started before noon, on the account's own clock. */
const PATTERN_NOON = 12;
/* A busy week against a quieter one, counted in sessions. */
const PATTERN_BUSY_WEEK = 3;
/* A group trained within three days against one rested five or more. The day
   between belongs to neither side, so the two groups cannot share a session. */
const PATTERN_CLOSE = 3;
const PATTERN_RESTED = 5;

/* ================================================================
   0.  DATES
   ================================================================
   A private copy of store.js's todayKey, for the same reason units.js keeps a
   private copy of ui.js's compact(): this module cannot import from the app and
   stay portable. If one of the two ever changes, change both — a Coach sentence
   and a Fuel total that disagree about which day it is would be the worst kind
   of wrong number.

   Everything whole-day is measured between NOON anchors, the way ui.js
   parseKey() anchors a date key, so a clock change does not turn a seven-day
   gap into six and three quarters. */
function dayKey(ms) {
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function noon(ms) { const d = new Date(ms); d.setHours(12, 0, 0, 0); return d.getTime(); }
function daysBetween(fromMs, toMs) { return Math.round((noon(toMs) - noon(fromMs)) / DAY); }
function keysBack(now, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(now - i * DAY));
  return out;
}

/* ---------- small numbers ---------- */
function median(xs) {
  const v = xs.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
function mean(xs) {
  const v = xs.filter(Number.isFinite);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}
const int = n => Math.round(n).toLocaleString();
// One decimal, trailing .0 dropped — the same treatment every other count-ish
// average in the app gets.
const one = n => String(Math.round(n * 10) / 10).replace(/\.0$/, '');
// `n` is sometimes already a formatted string (one() drops a trailing .0), so
// the singular test coerces. Without it a median gap of 1 reads "1 days".
const plural = (n, word) => n + ' ' + word + (Number(n) === 1 ? '' : 's');

/* Group labels, and never program jargon. "chest and arms" is a description of
   what was trained; "Push A" is a claim about a programme Rack has never seen.
   Six groups is the entire vocabulary (exercises.js GROUPS) and there is no
   finer one — no biceps/triceps split, no quads/hamstrings split — so every
   volume, recency and balance sentence in this file is at six-group grain. */
function groupLabel(g) { return (GROUPS[g] || {}).label ? GROUPS[g].label.toLowerCase() : g; }

// The unit, for the handful of `because` strings that print a weight. They are
// handed the whole derive object, so the unit is reachable without every fact
// growing an argument it does not use — and a because that prints a load has to
// route through units.js exactly as a response does.
const uOf = d => (d && d.input && d.input.u === 'kg' ? 'kg' : 'lb');
function groupList(gs) {
  const o = GROUP_ORDER.filter(g => gs.includes(g)).map(groupLabel);
  if (!o.length) return 'nothing';
  if (o.length === 1) return o[0];
  if (o.length >= 5) return 'a whole-body day';
  return o.slice(0, -1).join(', ') + ' and ' + o[o.length - 1];
}

/* ================================================================
   1.  CATEGORIES — the one toggle table
   ================================================================
   Every intent names exactly one of these, and a verifier fails on an intent
   whose category is not here. The ORDER is load-bearing twice over: it is the
   order the toggles appear in Settings, and it is `categoryIndex`, the fourth
   key of the ranking tuple (§6). Moving a row reorders findings.

   `core` and `safety` are not mutable. The card's own state machine lives in
   core, and switching it off would leave a card that cannot say anything at
   all — including that it cannot read the log. */
export const CATEGORIES = Object.freeze([
  { id: 'core',        label: 'Coach itself',        mutable: false, note: 'The card and what it can and cannot see.' },
  { id: 'safety',      label: 'Caution',             mutable: false, note: 'Anything that counsels rest or care.' },
  { id: 'volume',      label: 'Balance and volume',  mutable: true,  note: 'Sets for a group against your own normal.' },
  { id: 'recency',     label: 'Overdue and layoffs', mutable: true,  note: 'How long since a group, and since a session.' },
  /* v49's, directly after recency because it is the other half of "when":
     when Coach suggests a lighter week or a rest. Every later category moves
     down one and keeps its order relative to the others, so no finding's rank
     moves — its one finding is sheet-only and never competes for a card. */
  { id: 'rest',        label: 'Rest and lighter weeks', mutable: true, note: 'When Coach suggests a lighter week or a rest.' },
  { id: 'progression', label: 'Stalls and records',  mutable: true,  note: 'Where your best estimated maxes sit, and records as they land.' },
  /* Ship two's. After the training rows because it is one, and it moves no
     existing finding: the builder is a selector, it never competes for a card,
     and every category that does keeps its order relative to the others. */
  { id: 'build',       label: 'Workout builder',     mutable: true,  note: 'Offering to put a workout together from your log.' },
  /* v48's, directly after the builder because it lives on the builder's
     proposal. Every later category moves down one and keeps its order, so no
     finding's rank moves — nothing in this one competes for a card. Absent
     means on, like every switch but Patterns. */
  { id: 'targets',     label: 'Weight and rep targets', mutable: true,
    note: 'What to put on the bar next time, worked out from your own sessions.' },
  /* Ship three's in-session read: the chip in a live workout's header row and
     the one quiet line under a finished exercise. On unless switched off, like
     every category but Patterns. After the builder because it is the other
     thing Coach does with a workout, and it moves no finding's rank: nothing in
     it competes for a card. */
  { id: 'live',        label: 'In the gym',          mutable: true,  note: 'During a workout: the Coach chip, and one quiet line under a finished exercise.' },
  { id: 'fuel',        label: 'Food',                mutable: true,  note: 'Calories and macros against your own targets.' },
  { id: 'weight',      label: 'Weight',              mutable: true,  note: 'Rate of change, and days since a weigh-in.' },
  { id: 'steps',       label: 'Steps',               mutable: true,  note: 'Today against your own trailing average.' },
  { id: 'questions',   label: 'Questions',           mutable: true,  note: 'Whether Coach may ask you anything at all.' },
  /* Ship three's, and the one category that is OFF until it is switched on
     (`optIn`): a comparison between two groups of somebody's own days is a
     thing they ask for, not a thing Coach volunteers. Last, so it moves no
     other category's place in the ranking. */
  { id: 'patterns',    label: 'Patterns in your data', mutable: true, optIn: true,
    note: 'Off until you switch it on. Two groups of your own days or sessions side by side, as numbers — never as advice.' }
]);

export const CATEGORY_IDS = Object.freeze(CATEGORIES.map(c => c.id));
const categoryIndex = id => CATEGORY_IDS.indexOf(id);

/* ================================================================
   2.  THE DERIVATIONS
   ================================================================
   Private, memoised once per coach() call, and the only place any of these is
   worked out. The FACTS table below reads from here; nothing else does.

   Two things the brief is emphatic about and that are honoured here:

   `record.groups` is NEVER read. workout.js builds it from sets filtered on
   `done && r !== ''` rather than on isWorking(), so it counts warm-ups — a
   session of nothing but warm-up bench would claim chest. Every group in this
   file is derived fresh from the sets.

   An exercise logged with warm-ups only leaves an exerciseIndex entry with
   `sessions: 0` and every best at 0 (analytics.js:166). Those are skipped
   rather than reported as a lift with a zero-pound record. */

function derive(input) {
  const now = input.now;
  const sessions = Array.isArray(input.sessions) ? input.sessions : [];
  const lib = input.lib || {};
  const memo = {};
  const once = (k, fn) => (k in memo ? memo[k] : (memo[k] = fn()));

  /* The effective primary group and equipment for one logged exercise row.
     The merged library wins — a built-in refiled from arms to chest is refiled
     everywhere, history included, because the id never changes. When the id no
     longer resolves at all (a deleted custom exercise; picker.js removes the
     row outright) the record's own fields stand: they are what the app wrote at
     the time, and using them keeps a deleted exercise from silently erasing the
     session it was in. */
  const groupOf = ex => (lib[ex.exId] && lib[ex.exId].group) || ex.group || null;
  const equipOf = ex => (lib[ex.exId] && lib[ex.exId].equipment) || ex.equipment || null;

  /* One session, reduced to what every rule below actually asks of it. */
  function shapeSession(s) {
    const rows = mergeSessionExercises(s.exercises).filter(ex => ex && ex.exId);
    const sets = {};        // group -> working sets, warm-ups excluded
    const fsets = {};       // group -> the working sets typed F among them (v49)
    const sig = new Set();  // the signature: groups with >= 2 working sets, cardio out
    rows.forEach(ex => {
      const g = groupOf(ex);
      if (!g || !GROUPS[g]) return;
      const n = (ex.sets || []).filter(isWorking).length;
      if (!n) return;
      sets[g] = (sets[g] || 0) + n;
      const nf = (ex.sets || []).filter(x => isWorking(x) && x.type === 'F').length;
      if (nf) fsets[g] = (fsets[g] || 0) + nf;
      if (n >= 2 && equipOf(ex) !== 'cardio') sig.add(g);
    });
    return {
      startedAt: s.startedAt,
      date: s._date || dayKey(s.startedAt),
      daysAgo: daysBetween(s.startedAt, now),
      /* "Hard sets" everywhere on the sheet, v49's fatigue and lighter-week
         reads included: coach-overlap.js is handed these shaped sessions
         rather than counting sets its own way, so "chest sets" is one number
         in every answer. */
      sets,
      fsets,
      groups: Object.keys(sets),
      signature: GROUP_ORDER.filter(g => sig.has(g)),
      // The record itself, untouched. Nothing in this file reads it; the
      // builder does, because a proposal is that session's own exercises.
      session: s
    };
  }

  const all = () => once('all', () =>
    sessions.filter(s => s && Number.isFinite(s.startedAt)).map(shapeSession)
      .sort((a, b) => a.startedAt - b.startedAt));

  /* Everything inside the twelve-week window, by startedAt. Named inWindow and
     not window: in a browser this file runs in module scope, where a local
     `window` shadows the global one for the whole function — it would have
     worked, and it is the kind of thing that stops working the day somebody
     adds a line that meant the other one. */
  const inWindow = () => once('inWindow', () => all().filter(s => s.daysAgo < WINDOW_DAYS));

  /* ---------- the recurring shapes (§3.3) ----------
     Signatures are clustered against a cluster's REPRESENTATIVE rather than
     against any member. Merging against any member chains — A merges with B and
     B with C, and A and C are two groups apart — and three hops of that turns
     every session in the window into one shapeless blob called "a whole-body
     day". The representative is the most common signature in the cluster, which
     is also what gives the cluster its name.

     Every tie in the ordering is broken on a total key, so two devices reading
     the same log name the same shape. */
  const shapes = () => once('shapes', () => {
    const by = new Map();
    inWindow().forEach(s => {
      if (!s.signature.length) return;              // a session with no group at two sets says nothing
      const key = s.signature.join('+');
      const e = by.get(key) || { key, groups: s.signature, count: 0, lastAt: 0, dates: [] };
      e.count++;
      e.dates.push(s.date);
      if (s.startedAt > e.lastAt) e.lastAt = s.startedAt;
      by.set(key, e);
    });
    const uniq = [...by.values()].sort((a, b) =>
      b.count - a.count || b.lastAt - a.lastAt || (a.key < b.key ? -1 : 1));

    const clusters = [];
    uniq.forEach(u => {
      const hit = clusters.find(c => symDiff(c.groups, u.groups) <= 1);
      if (hit) {
        hit.count += u.count;
        hit.lastAt = Math.max(hit.lastAt, u.lastAt);
        hit.members.push(u.key);
        return;
      }
      clusters.push({ key: u.key, groups: u.groups.slice(), count: u.count, lastAt: u.lastAt, members: [u.key] });
    });

    return clusters
      .filter(c => c.count >= 3)                    // the recurrence bar
      .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt || (a.key < b.key ? -1 : 1))
      .map(c => ({
        key: c.key,
        groups: c.groups,
        count: c.count,
        members: c.members,
        daysAgo: daysBetween(c.lastAt, now),
        name: shapeName(c.groups, input.routines, lib),
        routine: routineRef(shapeRoutine(c.groups, input.routines, lib))
      }));
  });

  /* ---------- per group ---------- */
  // Days since a group was last trained at all — one working set counts, because
  // a group you touched three days ago is not a group you have not trained.
  const groupDays = () => once('groupDays', () => {
    const out = {};
    GROUP_ORDER.forEach(g => { out[g] = null; });
    all().forEach(s => {
      s.groups.forEach(g => {
        if (out[g] === null || s.daysAgo < out[g]) out[g] = s.daysAgo;
      });
    });
    return out;
  });

  // The account's own median gap between training days for each group, inside
  // the window. Four training days is three gaps, which is the fewest a median
  // can be taken of without describing one session.
  const groupGap = () => once('groupGap', () => {
    const out = {};
    GROUP_ORDER.forEach(g => {
      const days = [...new Set(inWindow().filter(s => s.groups.includes(g)).map(s => s.date))].sort();
      if (days.length < 4) { out[g] = null; return; }
      const gaps = [];
      for (let i = 1; i < days.length; i++) {
        gaps.push(Math.round((new Date(days[i] + 'T12:00:00') - new Date(days[i - 1] + 'T12:00:00')) / DAY));
      }
      out[g] = median(gaps);
    });
    return out;
  });

  // Working sets per group over a run of days ending `endAgo` days back.
  const setsIn = (fromAgo, toAgo) => {
    const out = {};
    GROUP_ORDER.forEach(g => { out[g] = 0; });
    all().filter(s => s.daysAgo >= toAgo && s.daysAgo < fromAgo)
      .forEach(s => Object.keys(s.sets).forEach(g => { if (g in out) out[g] += s.sets[g]; }));
    return out;
  };

  const setsThisWeek = () => once('setsWeek', () => setsIn(7, 0));
  // The trailing normal: the four weeks BEFORE this one, per week. Stated as
  // the denominator in every sentence that quotes it, because a comparison
  // whose denominator is unnamed is a number nobody can check.
  const setsTrailing = () => once('setsTrail', () => {
    const covered = all().some(s => s.daysAgo >= 7 && s.daysAgo < 35);
    if (!covered) return null;
    const raw = setsIn(35, 7);
    const out = {};
    GROUP_ORDER.forEach(g => { out[g] = raw[g] / 4; });
    return out;
  });

  /* ---------- sessions, counted ---------- */
  const sessionsIn = (fromAgo, toAgo) =>
    all().filter(s => s.daysAgo >= toAgo && s.daysAgo < fromAgo).length;

  const sessionGap = () => once('sessionGap', () => {
    const days = [...new Set(inWindow().map(s => s.date))].sort();
    if (days.length < 5) return null;               // four gaps, the fewest worth a median
    const gaps = [];
    for (let i = 1; i < days.length; i++) {
      gaps.push(Math.round((new Date(days[i] + 'T12:00:00') - new Date(days[i - 1] + 'T12:00:00')) / DAY));
    }
    return median(gaps);
  });

  /* ---------- per lift ----------
     exerciseIndex is analytics.js's, not a second copy: it holds the merge
     invariant (one logical entry per exId per session) and the same e1rm the
     set row prints. Entries with no working set at all are dropped here rather
     than reported as a lift whose every record is zero. */
  const index = () => once('index', () => {
    const idx = exerciseIndex(sessions);
    const out = {};
    Object.keys(idx).forEach(id => {
      const e = idx[id];
      if (!e || e.sessions < 1 || !e.entries.length) return;
      const rows = e.entries.filter(r => r.e1rm > 0);
      if (!rows.length) return;
      out[id] = { ...e, entries: rows };
    });
    return out;
  });

  /* ---------- patterns ----------
     The pieces the eight PATTERN_FACTS share. Their window is PATTERN_DAYS,
     not WINDOW_DAYS (see the constant), and every day-based count is over
     COMPLETE days — today is unfinished, so it sits in neither group. */
  const pDays = () => once('pDays', () => keysBack(now - DAY, PATTERN_DAYS));
  const pSessions = () => once('pSessions', () => all().filter(s => s.daysAgo >= 0 && s.daysAgo < PATTERN_DAYS));
  const trainedDays = () => once('trainedDays', () => new Set(all().filter(s => s.groups.length).map(s => s.date)));
  /* The lift four of the eight are about: the one logged in the most sessions
     in the window with a real estimated max — a bodyweight lift has none — and
     cardio never. Ties go to the one done most recently, then to the id. Its
     rows carry each session's TOP-SET estimated max: exerciseIndex's own e1rm
     of the session's best set, never a second copy of the formula. */
  const pLift = () => once('pLift', () => {
    const idx = index();
    let best = null;
    Object.keys(idx).sort().forEach(id => {
      const e = idx[id];
      if (((lib[id] && lib[id].equipment) || e.equipment) === 'cardio') return;
      const rows = e.entries.filter(r => { const a = daysBetween(r.startedAt, now); return a >= 0 && a < PATTERN_DAYS; })
        .slice().sort((a, b) => a.startedAt - b.startedAt);
      if (!rows.length) return;
      const last = rows[rows.length - 1].startedAt;
      if (!best || rows.length > best.rows.length || (rows.length === best.rows.length && last > best.last)) {
        best = { exId: id, name: String((lib[id] && lib[id].name) || e.name || id),
                 group: (lib[id] && lib[id].group) || e.group || null, rows, last };
      }
    });
    return best ? {
      exId: best.exId, name: best.name, group: best.group,
      rows: best.rows.map(r => ({ startedAt: r.startedAt, date: r.date || dayKey(r.startedAt), top: r.e1rm }))
    } : null;
  });

  /* ---------- the lifts, for the overlap (v49) ----------
     Every exercise with a working set in the last half year, once, named as
     the picker names it today and filed where the library files it — the
     same two rules the builder uses — with its group's days since. What
     coach-overlap.js reads a lift's plateau-or-cut call, a record day and a
     variation from his own log off. Its exposures are coach-prog.js's to
     count (coach-overlap.js's prepare()), never a second copy here. */
  const lifts = () => once('lifts', () => {
    const by = new Map();
    all().forEach(s => {
      if (s.daysAgo < 0 || s.daysAgo >= PATTERN_DAYS) return;
      mergeSessionExercises((s.session && s.session.exercises) || []).forEach(ex => {
        if (!ex || !ex.exId || !(ex.sets || []).some(isWorking)) return;
        const was = by.get(ex.exId);
        if (was && was.lastAt >= s.startedAt) return;
        by.set(ex.exId, {
          exId: ex.exId, name: String((lib[ex.exId] && lib[ex.exId].name) || ex.name || ex.exId),
          group: groupOf(ex), equipment: equipOf(ex), lastAt: s.startedAt
        });
      });
    });
    const days = groupDays();
    return [...by.values()].sort((a, b) => (a.exId < b.exId ? -1 : a.exId > b.exId ? 1 : 0))
      .map(l => ({ ...l, groupDaysSince: l.group && days[l.group] != null ? days[l.group] : null }));
  });

  return {
    now, lib, input,
    all, inWindow, shapes, groupDays, groupGap,
    setsThisWeek, setsTrailing, sessionsIn, sessionGap, index,
    pDays, pSessions, trainedDays, pLift, lifts,
    groupOf, equipOf
  };
}

/* Two groups of numbers, and whether they may be compared at all: eight on
   each side or nothing. Both sides carry their size, because a median with no
   count beside it is a number nobody can weigh. */
function sides(a, b) {
  if (a.length < PATTERN_MIN || b.length < PATTERN_MIN) return null;
  return { a: { n: a.length, med: median(a) }, b: { n: b.length, med: median(b) } };
}
// The calendar day before a date key, anchored at noon so a clock change
// cannot land it two days back.
const prevDay = k => dayKey(new Date(k + 'T12:00:00').getTime() - DAY);
// A session's working sets, cardio left out: what a session holds, counted the
// way every set count in this file is — isWorking, warm-ups excluded.
function workingSets(d, s) {
  return mergeSessionExercises((s.session && s.session.exercises) || []).reduce((a, ex) =>
    (!ex || d.equipOf(ex) === 'cardio') ? a : a + (ex.sets || []).filter(isWorking).length, 0);
}

function symDiff(a, b) {
  const A = new Set(a), B = new Set(b);
  let n = 0;
  A.forEach(x => { if (!B.has(x)) n++; });
  B.forEach(x => { if (!A.has(x)) n++; });
  return n;
}

/* A shape is named descriptively, from the group labels — never from programme
   jargon Rack has no way to know applies. The one exception is the account's
   own vocabulary: a saved routine whose exercises cover exactly these groups is
   what this person already calls this session, so it wins. The builder offers
   that routine by the same test, which is why the test is its own function
   rather than a second loop over the routines somewhere else. */
function shapeRoutine(groups, routines, lib) {
  const want = groups.slice().sort().join('+');
  const saved = Array.isArray(routines) ? routines : [];
  for (const r of saved) {
    if (!r || !r.name) continue;
    const gs = new Set();
    (r.exercises || []).forEach(ex => {
      if (!ex || !ex.exId) return;
      const g = (lib[ex.exId] && lib[ex.exId].group) || ex.group || null;
      if (g && GROUPS[g] && (ex.equipment !== 'cardio')) gs.add(g);
    });
    if ([...gs].sort().join('+') === want) return r;
  }
  return null;
}
const routineRef = r => (r ? { id: r.id || null, name: String(r.name) } : null);

function shapeName(groups, routines, lib) {
  const mine = shapeRoutine(groups, routines, lib);
  if (mine) return String(mine.name);
  /* A descriptive name needs the noun, because it is used as one: "your chest
     and shoulders day", not "your chest and shoulders". A routine's own name
     does not — somebody who called it Upper A did not mean Upper A day. */
  const list = groupList(groups);
  return list === 'a whole-body day' ? 'whole-body day' : list + ' day';
}

/* ================================================================
   3.  THE FACT REGISTRY
   ================================================================
   One table, unique ids, dot-namespaced. Each fact computes a value or null —
   and null means "cannot be computed honestly", which is how silence actually
   happens: a rule whose facts are null never gets as far as its condition.

   `because` is the short clause the fact contributes to a reason line, so that
   a finding's working is assembled from the facts it quoted rather than typed
   out a second time underneath it. `age` is how old the newest evidence behind
   the value is, in days — the third key of the ranking tuple.

   `unit` is not decoration. 'lb' and 'lbWk' mark the facts whose values are
   POUNDS, and tools-check/coach-units.mjs uses it to prove that every response
   quoting one of them routes through units.js. */
export const FACTS = Object.freeze([

  /* ---------- log ---------- */
  {
    id: 'log.confidence', unit: null, requires: [],
    compute: d => {
      const v = d.input.log;
      return v === 'readable' || v === 'empty' || v === 'unknown' ? v : 'unknown';
    },
    because: v => v === 'readable' ? 'read from your training log'
             : v === 'empty' ? 'there is nothing in your training log yet'
             : 'your training log could not be read'
  },
  {
    id: 'live.active', unit: null, requires: [],
    compute: d => !!(d.input.live && d.input.live.active),
    because: v => v ? 'a session is running now' : 'no session is running'
  },
  {
    id: 'meta.tierPro', unit: null, requires: [],
    compute: d => !!(d.input.tier && d.input.tier.pro),
    because: v => v ? 'this account has Pro' : 'this account does not have Pro'
  },

  /* ---------- sessions ---------- */
  {
    id: 'session.count', unit: 'count', requires: [],
    compute: d => d.all().length,
    because: v => plural(v, 'session') + ' in your log'
  },
  {
    id: 'session.windowCount', unit: 'count', requires: [],
    compute: d => d.inWindow().length,
    because: v => plural(v, 'session') + ' in the last twelve weeks'
  },
  {
    id: 'session.lastDaysAgo', unit: 'days', requires: [],
    compute: d => { const a = d.all(); return a.length ? a[a.length - 1].daysAgo : null; },
    because: v => v === 0 ? 'you trained today' : 'your last session was ' + plural(v, 'day') + ' ago',
    age: v => v
  },
  {
    id: 'session.lastGroups', unit: null, requires: ['session.lastDaysAgo'],
    compute: d => { const a = d.all(); return a.length ? a[a.length - 1].groups : null; },
    because: v => v && v.length ? 'it was ' + groupList(v) : 'it had no working sets',
    age: (v, d) => d.f('session.lastDaysAgo')
  },
  {
    id: 'session.last7', unit: 'count', requires: [],
    compute: d => d.sessionsIn(7, 0),
    because: v => plural(v, 'session') + ' in the last 7 days',
    age: () => 0
  },
  {
    id: 'session.trailingPerWeek', unit: 'count', requires: [],
    compute: d => {
      // The four weeks before this one. Not a window that includes this week,
      // or the thing being compared is inside its own denominator.
      const covered = d.all().some(s => s.daysAgo >= 7 && s.daysAgo < 35);
      return covered ? d.sessionsIn(35, 7) / 4 : null;
    },
    because: v => 'you averaged ' + one(v) + ' a week over the four weeks before this one',
    age: () => 7
  },
  {
    id: 'session.medianGapDays', unit: 'days', requires: [],
    compute: d => d.sessionGap(),
    because: v => 'your usual gap between sessions is ' + plural(v, 'day')
  },
  {
    id: 'session.shapes', unit: null, requires: [],
    compute: d => { const s = d.shapes(); return s.length ? s : null; },
    because: v => v.length === 1
      ? 'one session shape recurs for you in the last twelve weeks'
      : v.length + ' session shapes recur for you in the last twelve weeks'
  },
  {
    /* The recurring shape whose groups have waited longest. Stalest is measured
       on the group inside the shape that is furthest past its OWN median gap,
       not on days alone — a shape containing core, which everybody trains
       rarely, would otherwise always be the stale one. */
    id: 'session.shapeOverdue', unit: null, requires: ['session.shapes'],
    compute: d => {
      const shapes = d.f('session.shapes');
      if (!shapes) return null;
      const days = d.groupDays(), gap = d.groupGap();
      let best = null;
      shapes.forEach(sh => {
        let worst = null;
        sh.groups.forEach(g => {
          const since = days[g], med = gap[g];
          if (since == null || med == null || med <= 0) return;
          const ratio = since / med;
          if (!worst || ratio > worst.ratio) worst = { group: g, since, med, ratio };
        });
        if (!worst) return;
        const cand = { ...sh, stalest: worst };
        if (!best || cand.stalest.ratio > best.stalest.ratio ||
            (cand.stalest.ratio === best.stalest.ratio && cand.key < best.key)) best = cand;
      });
      return best;
    },
    because: v => groupLabel(v.stalest.group) + ' is ' + plural(v.stalest.since, 'day') +
                  ' back against a usual ' + one(v.stalest.med),
    age: v => v.stalest.since
  },

  /* ---------- groups ---------- */
  {
    id: 'group.daysSince', unit: null, requires: [],
    compute: d => d.groupDays(),
    because: () => 'counted from every session with a working set for that group'
  },
  {
    id: 'group.medianGap', unit: null, requires: [],
    compute: d => d.groupGap(),
    because: () => 'each group measured against its own gap over the last twelve weeks'
  },
  {
    id: 'group.overdue', unit: null, requires: ['group.daysSince', 'group.medianGap'],
    compute: d => {
      const days = d.f('group.daysSince'), gap = d.f('group.medianGap');
      let best = null;
      GROUP_ORDER.forEach(g => {
        const since = days[g], med = gap[g];
        if (since == null || med == null || med <= 0) return;
        if (since < med + OVERDUE_MARGIN_DAYS) return;
        if (since < med * OVERDUE_RATIO) return;
        const cand = { group: g, days: since, median: med, ratio: since / med };
        if (!best || cand.ratio > best.ratio || (cand.ratio === best.ratio && cand.group < best.group)) best = cand;
      });
      return best;
    },
    because: v => 'your median gap on ' + groupLabel(v.group) + ' over the last twelve weeks is ' +
                  plural(one(v.median), 'day'),
    age: v => v.days
  },
  {
    id: 'group.setsThisWeek', unit: 'count', requires: [],
    compute: d => d.setsThisWeek(),
    because: () => 'working sets alone — warm-ups are not counted',
    age: () => 0
  },
  {
    id: 'group.trailingSets', unit: 'count', requires: [],
    compute: d => d.setsTrailing(),
    because: () => 'measured over the four weeks before this one',
    age: () => 7
  },
  {
    id: 'group.underWeekly', unit: null, requires: ['group.setsThisWeek', 'group.trailingSets'],
    compute: d => {
      const now = d.f('group.setsThisWeek'), was = d.f('group.trailingSets');
      if (!was) return null;
      let best = null;
      GROUP_ORDER.forEach(g => {
        // A group with no trailing history is not behind on anything.
        if (!(was[g] >= 3)) return;
        if (now[g] >= was[g] * 0.6) return;
        const cand = { group: g, sets: now[g], normal: was[g], short: was[g] - now[g] };
        if (!best || cand.short > best.short || (cand.short === best.short && cand.group < best.group)) best = cand;
      });
      return best;
    },
    because: () => 'counted from working sets alone, over the four weeks before this one — ' +
                   'your own normal rather than a bar Coach picked',
    age: () => 0
  },
  {
    /* The rest-day finding, and the only one that counsels caution. It fires on
       a group being trained far above THIS account's own normal frequency and
       on nothing else — there is no population bar behind it and there is not
       going to be one. */
    id: 'group.overused', unit: null, requires: ['group.medianGap'],
    compute: d => {
      const gap = d.f('group.medianGap');
      let best = null;
      GROUP_ORDER.forEach(g => {
        const med = gap[g];
        if (med == null || med < 2) return;                  // no normal to be above
        const recent = [...new Set(d.all().filter(s => s.daysAgo < 14 && s.groups.includes(g)).map(s => s.date))];
        if (recent.length < 5) return;
        const expected = 14 / med;
        if (recent.length < expected * 2) return;
        const cand = { group: g, days: recent.length, expected, ratio: recent.length / expected };
        if (!best || cand.ratio > best.ratio || (cand.ratio === best.ratio && cand.group < best.group)) best = cand;
      });
      return best;
    },
    because: v => 'over the twelve weeks behind it, ' + groupLabel(v.group) +
                  ' came round about every ' + plural(one(v.expected > 0 ? 14 / v.expected : 0), 'day'),
    age: () => 0
  },

  /* ---------- lifts ---------- */
  {
    /* A READOUT, NOT A VERDICT. What this fact holds is a figure and the day it
       was last matched — never a characterisation of the person who lifted it.
       `matchedDaysAgo` scans with `>=` on purpose: it wants the LAST session
       that hit the figure, not the first one that set it, because "last
       matched" is the honest thing to print and "set" would name a date the
       lifter has equalled since. */
    id: 'lift.stalled', unit: 'lb', requires: [],
    compute: d => {
      const idx = d.index();
      let best = null;
      Object.keys(idx).sort().forEach(id => {
        const e = idx[id];
        if (e.entries.length < 4) return;
        const last = e.entries[e.entries.length - 1];
        if (daysBetween(last.startedAt, d.now) > 42) return;   // a lift nobody has touched is not stalling
        const recent = e.entries.slice(-3);
        const prior  = e.entries.slice(0, -3);
        if (!prior.length) return;
        const bestRecent = Math.max(...recent.map(r => r.e1rm));
        const bestPrior  = Math.max(...prior.map(r => r.e1rm));
        if (bestRecent > bestPrior) return;
        let matched = null;
        e.entries.forEach(r => { if (r.e1rm >= bestPrior) matched = r; });
        const cand = {
          exId: id, name: e.name, group: e.group,
          best: bestPrior, sessions: recent.length,
          daysAgo: daysBetween(last.startedAt, d.now),
          matchedDaysAgo: matched ? daysBetween(matched.startedAt, d.now) : null,
          bestDate: e.bestE1rmDate, entries: e.entries.length
        };
        if (!best || cand.entries > best.entries) best = cand;
      });
      return best;
    },
    because: v => 'its last ' + plural(v.sessions, 'session') + ' are logged at or below that figure',
    age: v => v.daysAgo
  },
  {
    /* Derived from the index rather than by running detectPRs over every
       session: the index already holds the same three bests detectPRs compares
       against, keyed the same way, and walking it once is the difference
       between one pass and one per session. The kinds are detectPRs' kinds. */
    id: 'lift.recentPr', unit: 'lb', requires: [],
    compute: d => {
      const idx = d.index();
      let best = null;
      Object.keys(idx).sort().forEach(id => {
        const e = idx[id];
        if (e.entries.length < 3) return;
        const last = e.entries[e.entries.length - 1];
        const days = daysBetween(last.startedAt, d.now);
        if (days > 7) return;
        const prior = e.entries.slice(0, -1);
        const priorE1 = Math.max(...prior.map(r => r.e1rm));
        const priorW  = Math.max(...prior.map(r => r.topWeight));
        const priorV  = Math.max(...prior.map(r => r.volume));
        let kind = null, value = 0, prev = 0;
        if (last.e1rm > priorE1)          { kind = 'e1rm';   value = last.e1rm;      prev = priorE1; }
        else if (last.topWeight > priorW) { kind = 'weight'; value = last.topWeight; prev = priorW; }
        else if (last.volume > priorV)    { kind = 'volume'; value = last.volume;    prev = priorV; }
        if (!kind) return;
        const cand = { exId: id, name: e.name, group: e.group, kind, value, prev, daysAgo: days };
        if (!best || cand.daysAgo < best.daysAgo ||
            (cand.daysAgo === best.daysAgo && cand.value - cand.prev > best.value - best.prev)) best = cand;
      });
      return best;
    },
    because: (v, d) => v.kind === 'volume'
      ? 'measured against every earlier session of that lift'
      : 'the best before it was ' + labelW(v.prev, uOf(d)) + ', so this is the new one',
    age: v => v.daysAgo
  },
  {
    /* One more rep at the weight already on the bar. Computed with the SAME
       e1rm analytics.js prints on the set row — never by inverting the formula,
       which would produce a number the app has no other way to reach. */
    id: 'lift.proximity', unit: 'lb', requires: [],
    compute: d => {
      const idx = d.index();
      let best = null;
      Object.keys(idx).sort().forEach(id => {
        const e = idx[id];
        if (e.entries.length < 3) return;
        const last = e.entries[e.entries.length - 1];
        const days = daysBetween(last.startedAt, d.now);
        if (days > 14) return;
        if (!last.best || last.best.w === '' || last.best.w == null) return;
        const w = last.best.w, r = parseInt(last.best.r);
        if (!Number.isFinite(r) || r < 1) return;
        const at = e1rm(w, r), up = e1rm(w, r + 1);
        if (!(at > 0) || !(up > e.bestE1rm) || at > e.bestE1rm) return;
        const cand = {
          exId: id, name: e.name, group: e.group,
          lb: parseFloat(w), reps: r, need: r + 1,
          best: e.bestE1rm, would: up, daysAgo: days
        };
        if (!best || cand.daysAgo < best.daysAgo || (cand.daysAgo === best.daysAgo && cand.exId < best.exId)) best = cand;
      });
      return best;
    },
    because: (v, d) => 'your best there is an estimated ' + labelW(v.best, uOf(d)) +
                       ', from ' + plural(v.reps, 'rep') + ' at that load',
    age: v => v.daysAgo
  },
  {
    /* The targets on the default proposal — the workout "Build it" would
       make — one per exercise that has one, as coach-prog.js wrote them.
       d.build({}) is memoised, so reading them costs no second proposal. Null
       while there is no proposal, and while targets are switched off. */
    id: 'lift.targets', unit: null, requires: [],
    compute: d => {
      const p = d.build({});
      const list = p ? p.exercises.map(e => e.target).filter(Boolean) : [];
      return list.length ? list : null;
    },
    because: v => 'each of ' + plural(v.length, 'target') + ' worked out from your own sessions of that lift'
  },
  /* STAGE TWO (v49): coach-overlap.js's readings. Every word of them is that
     file's, through units.js, and fenced by tools-check/coach-overlap.mjs;
     these facts only hold what it said. */
  {
    /* The lift lift.stalled names, read against its bodyweight, frequency and
       sets — or null when coach-overlap.js has nothing to call. A stall
       readout with no reading beside it is not said at all any more: a flat
       lift through a cut that is holding is never called a stall. */
    id: 'lift.stallRead', unit: null, requires: ['lift.stalled'],
    compute: d => {
      const r = d.readLift(d.f('lift.stalled').exId);
      return r && r.call !== 'none' ? r : null;
    },
    because: () => 'read against your bodyweight, how often you train it and your sets'
  },
  {
    // "How are my lifts moving?": one line for each of up to five lifts.
    id: 'lift.moving', unit: null, requires: [],
    compute: d => { const v = liftsMoving(d.overlap(), d.now); return v.length ? v : null; },
    because: v => 'your ' + plural(v.length, 'lift') + ' with the most sessions in the last twelve weeks'
  },
  {
    // "Good day for a record?": a rep record at a weight he has lifted, or null.
    id: 'lift.recordDay', unit: null, requires: [],
    compute: d => d.recordDay(),
    because: () => 'one more rep than your best at a weight from the last four weeks'
  },
  {
    // The lighter week, when two or more of its signs line up; null otherwise.
    id: 'session.lighterWeek', unit: null, requires: [],
    compute: d => d.lighterWeek(),
    because: () => 'your own sets, failures and estimated maxes against your own normal'
  },

  /* ---------- fuel ----------
     The guard comes first in this family and it is not optional. Onboarding is
     skippable, and food.js then leaves a MODULE DEFAULT of 2,700 kcal sitting
     in memory where a target should be — so a Coach finding measured against
     `targets.cal` on an account that never set one would be reporting against a
     number nobody chose. `fuel.targetsSet` is the absence of the node itself,
     read by coach-data.js, not the presence of a number. */
  {
    /* THREE-VALUED, and the third value is the whole point. `true` is a node
       that is really there, `false` is a node the database really said was
       absent, and `null` is a read that failed — which is neither. Folding null
       into false would make Coach announce "no daily targets set" to somebody
       who has had targets for a year and a flaky connection for a minute. */
    id: 'fuel.targetsSet', unit: null, requires: [],
    compute: d => {
      const v = d.input.targetsSet;
      return v === true ? true : v === false ? false : null;
    },
    because: v => v ? 'measured against the daily targets you set' : 'no daily targets are set on this account'
  },
  {
    id: 'fuel.calTarget', unit: 'kcal', requires: ['fuel.targetsSet'],
    compute: d => {
      if (!d.f('fuel.targetsSet')) return null;
      const t = d.input.targets || {};
      return Number.isFinite(t.cal) && t.cal > 0 ? t.cal : null;
    },
    because: v => 'your daily target is ' + int(v) + ' kcal'
  },
  {
    id: 'fuel.calToday', unit: 'kcal', requires: [],
    compute: d => {
      const s = (d.input.summaries || {})[dayKey(d.now)];
      return s && Number.isFinite(s.cal) ? s.cal : null;
    },
    because: v => int(v) + ' kcal logged so far today',
    age: () => 0
  },
  {
    id: 'fuel.calLeft', unit: 'kcal', requires: ['fuel.calTarget', 'fuel.calToday'],
    compute: d => {
      const t = d.f('fuel.calTarget'), c = d.f('fuel.calToday');
      return t == null || c == null ? null : t - c;
    },
    because: (v, d) => int(d.f('fuel.calToday')) + ' kcal logged against a ' + int(d.f('fuel.calTarget')) + ' target',
    age: () => 0
  },
  {
    /* The last seven COMPLETE days. Today is excluded for the reason every
       other intake average in the app gives (tdee.js:75): half a day of food
       read against whole ones is not a smaller appetite, it is an unfinished
       day. Said as "the last seven full days" in every sentence that quotes
       it, and never "this week" or "last week": those are calendar words, and
       this is a rolling window that is last week only on a Monday. */
    id: 'fuel.loggedDays', unit: 'count', requires: [],
    compute: d => {
      const sums = d.input.summaries || {};
      return keysBack(d.now - DAY, 7).filter(k => sums[k] && sums[k].cal > 0).length;
    },
    because: v => 'from the ' + plural(v, 'day') + ' you logged food in the last seven full days',
    age: () => 1
  },
  {
    id: 'fuel.macroShare', unit: 'pct', requires: ['fuel.loggedDays'],
    compute: d => {
      if (d.f('fuel.loggedDays') < 4) return null;
      const sums = d.input.summaries || {};
      const days = keysBack(d.now - DAY, 7).map(k => sums[k]).filter(s => s && s.cal > 0);
      const cal = days.reduce((a, s) => a + s.cal, 0);
      if (!(cal > 0)) return null;
      const p = days.reduce((a, s) => a + (s.p || 0), 0) * 4;
      const f = days.reduce((a, s) => a + (s.f || 0), 0) * 9;
      const c = Math.max(0, cal - p - f);
      return { p: p / cal * 100, c: c / cal * 100, f: f / cal * 100 };
    },
    because: (v, d) => 'across ' + plural(d.f('fuel.loggedDays'), 'logged day') + ' in the last seven full days',
    age: () => 1
  },
  {
    id: 'fuel.targetShare', unit: 'pct', requires: ['fuel.targetsSet'],
    compute: d => {
      if (!d.f('fuel.targetsSet')) return null;
      const t = d.input.targets || {};
      const cal = t.cal, p = (t.p || 0) * 4, f = (t.f || 0) * 9;
      if (!(cal > 0) || p + f > cal) return null;
      return { p: p / cal * 100, c: (cal - p - f) / cal * 100, f: f / cal * 100 };
    },
    because: () => 'what your own calorie, protein and fat targets work out to'
  },
  {
    id: 'fuel.proteinTarget', unit: 'g', requires: ['fuel.targetsSet'],
    compute: d => {
      if (!d.f('fuel.targetsSet')) return null;
      const p = (d.input.targets || {}).p;
      return Number.isFinite(p) && p > 0 ? p : null;
    },
    because: v => 'your protein target is ' + int(v) + ' g a day'
  },
  {
    id: 'fuel.proteinTrailing', unit: 'g', requires: ['fuel.loggedDays'],
    compute: d => {
      if (d.f('fuel.loggedDays') < 4) return null;
      const sums = d.input.summaries || {};
      return mean(keysBack(d.now - DAY, 7).map(k => sums[k]).filter(s => s && s.cal > 0).map(s => s.p || 0));
    },
    because: (v, d) => 'averaged over ' + plural(d.f('fuel.loggedDays'), 'logged day') + ' in the last seven full days',
    age: () => 1
  },

  /* ---------- weight ---------- */
  {
    id: 'weight.latestLb', unit: 'lb', requires: [],
    compute: d => {
      const w = d.input.weight || {};
      return Number.isFinite(w.latestLb) ? w.latestLb : null;
    },
    because: () => 'the last reading on your log',
    age: (v, d) => d.f('weight.daysSinceWeighIn')
  },
  {
    id: 'weight.daysSinceWeighIn', unit: 'days', requires: [],
    compute: d => {
      const w = d.input.weight || {};
      return Number.isFinite(w.latestAt) ? daysBetween(w.latestAt, d.now) : null;
    },
    because: v => v === 0 ? 'you weighed in today' : 'your last weigh-in was ' + plural(v, 'day') + ' ago',
    age: v => v
  },
  {
    id: 'weight.rateWk', unit: 'lbWk', requires: [],
    compute: d => {
      const w = d.input.weight || {};
      return Number.isFinite(w.rateWk) ? w.rateWk : null;
    },
    because: (v, d) => {
      const n = (d.input.weight || {}).rateDays;
      return Number.isFinite(n) ? 'fitted across your last ' + plural(n, 'day') + ' of weigh-ins'
                                : 'from the difference between your last two weekly averages';
    },
    age: (v, d) => d.f('weight.daysSinceWeighIn')
  },
  {
    /* Direction is the account's, never the app's. The stated goal comes first;
       the answer to Coach's own question is the fallback and is the ONLY thing
       that question exists to change. Unknown stays unknown — a rate coloured
       by a direction nobody stated is a verdict on a goal nobody set. */
    id: 'weight.goalDir', unit: null, requires: [],
    compute: d => {
      const w = d.input.weight || {};
      if (w.goalDir === -1 || w.goalDir === 0 || w.goalDir === 1) return w.goalDir;
      const a = (d.input.settings && d.input.settings.answers) || {};
      const said = a.q_goal_direction;
      if (said === 'down') return -1;
      if (said === 'hold') return 0;
      if (said === 'up')   return 1;
      return null;
    },
    because: (v, d) => {
      const w = d.input.weight || {};
      const own = w.goalDir === -1 || w.goalDir === 0 || w.goalDir === 1;
      return own ? 'the direction your own goal points' : 'the direction you told Coach you were going';
    },
    usesAnswers: ['q_goal_direction']
  },
  {
    id: 'weight.goalRateWk', unit: 'lbWk', requires: [],
    compute: d => {
      const r = (d.input.weight || {}).goalRateWk;
      return Number.isFinite(r) && r !== 0 ? r : null;
    },
    because: () => 'the weekly rate your own goal is set to'
  },
  {
    /* The energy context: the weight trend as a share of bodyweight a week —
       a hard cut, a deficit, holding or a surplus — read by coach-goal.js and
       handed to the targets, which confirm twice and jump once in a hard cut.
       From the trend alone: no food is read for it. Null when the trend cannot
       carry a reading, which is also what the targets do without. */
    id: 'weight.energy', unit: null, requires: [],
    compute: d => energyContext(d.input.weight || {}),
    because: (v, d) => {
      const n = (d.input.weight || {}).rateDays;
      return 'your weight trend against your bodyweight' +
             (Number.isFinite(n) ? ', over your last ' + plural(n, 'day') + ' of weigh-ins' : '');
    }
  },

  /* ---------- steps ---------- */
  {
    id: 'steps.today', unit: 'count', requires: [],
    compute: d => {
      const days = (d.input.steps || {}).days || {};
      const t = days[dayKey(d.now)];
      const n = t && Number.isFinite(t.steps) ? t.steps : null;
      return n != null && n > 0 ? n : null;
    },
    because: v => int(v) + ' logged today',
    age: () => 0
  },
  {
    id: 'steps.trailing', unit: 'count', requires: [],
    compute: d => {
      const days = (d.input.steps || {}).days || {};
      const vals = keysBack(d.now - DAY, 14).map(k => days[k]).filter(s => s && s.steps > 0).map(s => s.steps);
      return vals.length >= 4 ? mean(vals) : null;
    },
    because: () => 'averaged over the days you logged steps in the last two weeks',
    age: () => 1
  },

  /* ---------- patterns ----------
     EIGHT, PRE-REGISTERED, AND NO OTHERS. Each compares two groups of his own
     days or sessions, needs PATTERN_MIN on each side, and yields both numbers
     and both sample sizes — or null. There is no search here for whatever
     happens to differ: an open search across a log this size finds something
     every time, and the something is noise that reads like a finding. So the
     eight were chosen before any log was looked at (SHIP-V46-PROMPT, Phase 3)
     and none of them has a bar for how BIG a difference must be — printing
     every one that clears its sample gate is the honest version; printing
     only the ones that look interesting would be the search by another name.

     DESCRIPTIVE, NEVER CAUSAL. Two groups side by side say that they differ,
     not why. Nothing in their sentences says one thing helps, makes, boosts
     or leads to another, and tools-check/coach-voice.mjs holds them to it.
     Off unless the account has switched the `patterns` category on. */
  {
    // 1. His top quarter of sessions by estimated max, against the rest: how
    //    many had food logged before the session started.
    id: 'lift.fedBeforeTop', unit: 'pct', requires: [],
    compute: d => {
      const L = d.pLift(), first = d.input.foodFirst || {};
      if (!L) return null;
      // Only days whose food log has been read and has an entry in it: a day
      // with nothing logged says nothing about whether he ate.
      const known = L.rows.filter(r => Number.isFinite(first[r.date]));
      const ranked = known.slice().sort((a, b) => b.top - a.top || b.startedAt - a.startedAt);
      const q = Math.floor(ranked.length / 4);
      const top = ranked.slice(0, q), rest = ranked.slice(q);
      if (top.length < PATTERN_MIN || rest.length < PATTERN_MIN) return null;
      const fed = rows => rows.filter(r => first[r.date] < r.startedAt).length;
      return { lift: L.name, a: { n: top.length, k: fed(top) }, b: { n: rest.length, k: fed(rest) } };
    },
    because: () => 'sessions of your most-logged lift on days with food logged, over the last 26 weeks'
  },
  {
    // 2. Working sets in a session the day after the protein target was
    //    reached, against the day after it was not.
    id: 'session.setsAfterProtein', unit: 'count', requires: ['fuel.proteinTarget'],
    compute: d => {
      const want = d.f('fuel.proteinTarget'), sums = d.input.summaries || {};
      const hit = [], under = [];
      d.pSessions().forEach(s => {
        const y = sums[prevDay(s.date)];
        if (!y || !(y.cal > 0)) return;
        const n = workingSets(d, s);
        if (!n) return;
        ((y.p || 0) >= want ? hit : under).push(n);
      });
      const sd = sides(hit, under);
      return sd ? { target: want, ...sd } : null;
    },
    because: () => 'sessions after a day with food logged, over the last 26 weeks'
  },
  {
    // 3. Calories on days he trained, against days he did not.
    id: 'fuel.trainingDayCalories', unit: 'kcal', requires: [],
    compute: d => {
      const sums = d.input.summaries || {}, trained = d.trainedDays();
      const on = [], off = [];
      d.pDays().forEach(k => {
        const x = sums[k];
        if (x && x.cal > 0) (trained.has(k) ? on : off).push(x.cal);
      });
      return sides(on, off);
    },
    because: () => 'complete days with food logged, over the last 26 weeks'
  },
  {
    // 4. The weekly change in weight, in weeks of three or more sessions
    //    against weeks of fewer. A week is seven complete days back from
    //    yesterday, its weight the average of its weigh-ins, and its change
    //    that average against the week before's.
    id: 'weight.rateBySessions', unit: 'lbWk', requires: [],
    compute: d => {
      const ins = Array.isArray(d.input.weighIns) ? d.input.weighIns : [];
      const byDay = {};
      ins.forEach(w => {
        if (w && Number.isFinite(w.lb) && Number.isFinite(w.t)) (byDay[dayKey(w.t)] = byDay[dayKey(w.t)] || []).push(w.lb);
      });
      const weeks = [];
      for (let k = 0; k < Math.floor(PATTERN_DAYS / 7); k++) {
        const keys = new Set(keysBack(d.now - DAY - k * 7 * DAY, 7));
        const lbs = [...keys].flatMap(x => byDay[x] || []);
        weeks.push({ mean: lbs.length ? mean(lbs) : null, sessions: d.all().filter(s => keys.has(s.date)).length });
      }
      const busy = [], quiet = [];
      for (let k = 0; k + 1 < weeks.length; k++) {
        if (weeks[k].mean == null || weeks[k + 1].mean == null) continue;
        (weeks[k].sessions >= PATTERN_BUSY_WEEK ? busy : quiet).push(weeks[k].mean - weeks[k + 1].mean);
      }
      return sides(busy, quiet);
    },
    because: () => 'each week against the week before it, from the average of its weigh-ins'
  },
  {
    // 5. The lift's top-set estimated max in sessions started before noon,
    //    against sessions started later.
    id: 'lift.morningTop', unit: 'lb', requires: [],
    compute: d => {
      const L = d.pLift();
      if (!L) return null;
      const am = [], pm = [];
      L.rows.forEach(r => (new Date(r.startedAt).getHours() < PATTERN_NOON ? am : pm).push(r.top));
      const sd = sides(am, pm);
      return sd ? { lift: L.name, ...sd } : null;
    },
    because: () => 'your most-logged lift over the last 26 weeks, by the hour each session started'
  },
  {
    // 6. The lift's top-set estimated max when its group had been trained three
    //    or fewer days before, against five or more.
    id: 'lift.restGapTop', unit: 'lb', requires: [],
    compute: d => {
      const L = d.pLift();
      if (!L || !L.group) return null;
      const before = d.all().filter(s => s.groups.includes(L.group));
      const close = [], rested = [];
      L.rows.forEach(r => {
        let prev = null;
        before.forEach(s => { if (s.startedAt < r.startedAt) prev = s; });
        if (!prev) return;
        const gap = daysBetween(prev.startedAt, r.startedAt);
        if (gap <= PATTERN_CLOSE) close.push(r.top);
        else if (gap >= PATTERN_RESTED) rested.push(r.top);
      });
      const sd = sides(close, rested);
      return sd ? { lift: L.name, group: L.group, ...sd } : null;
    },
    because: v => 'counted back to the last session with a working set for ' + groupLabel(v.group)
  },
  {
    // 7. Steps on days he trained, against days he did not.
    id: 'steps.trainingDays', unit: 'count', requires: [],
    compute: d => {
      const days = (d.input.steps || {}).days || {}, trained = d.trainedDays();
      const on = [], off = [];
      d.pDays().forEach(k => {
        const x = days[k];
        if (x && Number.isFinite(x.steps) && x.steps > 0) (trained.has(k) ? on : off).push(x.steps);
      });
      return sides(on, off);
    },
    because: () => 'complete days with steps logged, over the last 26 weeks'
  },
  {
    // 8. The lift's top-set estimated max after a day above his median daily
    //    calories, against after a day below it.
    id: 'lift.caloriesBeforeTop', unit: 'lb', requires: [],
    compute: d => {
      const L = d.pLift();
      if (!L) return null;
      const sums = d.input.summaries || {};
      const cals = d.pDays().map(k => sums[k]).filter(x => x && x.cal > 0).map(x => x.cal);
      if (cals.length < PATTERN_MIN * 2) return null;
      const mid = median(cals);
      const above = [], below = [];
      L.rows.forEach(r => {
        const y = sums[prevDay(r.date)];
        if (!y || !(y.cal > 0)) return;
        if (y.cal > mid) above.push(r.top);
        else if (y.cal < mid) below.push(r.top);
      });
      const sd = sides(above, below);
      return sd ? { lift: L.name, median: mid, ...sd } : null;
    },
    because: v => 'calories the day before each session of ' + v.lift + ', over the last 26 weeks'
  },

  /* ---------- coach's own state ---------- */
  {
    /* The last few lines Coach opened with, newest first. It arrives on the
       INPUT from device storage rather than out of settings/coach: the write
       that records it happens as the app opens and the app is very often
       closed a second or two later, which is precisely the pattern an async
       database write does not survive. A per-device display nicety is worth
       neither the round trip nor the unreliability. The engine stays pure and
       does not care which side of that line the value came from.

       Three rather than one, because the eligible pool changes size between
       opens — a gate that passed yesterday may not today — and a counter
       modulo a pool that shrank can land back on the line before it. */
    id: 'coach.recentGreets', unit: null, requires: [],
    compute: d => {
      const list = d.input.recentGreets;
      if (!Array.isArray(list)) return [];
      return list.filter(x => typeof x === 'string' && x).slice(0, 3);
    },
    because: () => 'the lines Coach opened with last time'
  },
  {
    /* A question already put and not yet answered. It expires: see
       ASK_COOLDOWN_DAYS. Null is the common case and it is what lets a new
       question be asked at all. */
    id: 'coach.openQuestion', unit: null, requires: [],
    compute: d => {
      const s = d.input.settings || {};
      const asked = s.asked || {}, answers = s.answers || {};
      const live = QUESTIONS.filter(q => {
        const at = asked[q.id];
        if (!Number.isFinite(at) || answers[q.id] != null) return false;
        return daysBetween(at, d.now) < ASK_COOLDOWN_DAYS;
      });
      return live.length ? live[0].id : null;
    },
    because: () => 'Coach already has a question waiting'
  },
  /* THE GOAL, as the answers to Coach's own two questions and nothing else —
     no `goal` key, because a second record of the same fact is the one that
     goes stale. Each reads its answer straight off settings/coach, so the
     registry's drive (write the answer, watch the fact move) proves the link.
     Unanswered is null, and the targets then use the no-aim dials: the aim
     turns them, it never gates them. */
  {
    id: 'coach.aim', unit: null, requires: [],
    compute: d => {
      const a = ((d.input.settings && d.input.settings.answers) || {}).q_goal_aim;
      return AIMS.includes(a) ? a : null;
    },
    because: () => 'what you told Coach you are training for',
    usesAnswers: ['q_goal_aim']
  },
  {
    id: 'coach.experience', unit: null, requires: [],
    compute: d => {
      const a = ((d.input.settings && d.input.settings.answers) || {}).q_experience;
      return EXPERIENCE.includes(a) ? a : null;
    },
    because: () => 'how long you told Coach you have been lifting',
    usesAnswers: ['q_experience']
  }
]);

const FACT_BY_ID = Object.freeze(Object.fromEntries(FACTS.map(f => [f.id, f])));

/* The eight, in the order they were registered in, which is the order they
   are said in. A ninth is a decision, not a line of code, and
   tools-check/coach-patterns.mjs fails on anything but eight. */
export const PATTERN_FACTS = Object.freeze([
  'lift.fedBeforeTop', 'session.setsAfterProtein', 'fuel.trainingDayCalories', 'weight.rateBySessions',
  'lift.morningTop', 'lift.restGapTop', 'steps.trainingDays', 'lift.caloriesBeforeTop'
]);

/* ================================================================
   4.  THE QUESTIONS
   ================================================================
   Coach asks at most one thing, and only a thing whose answer changes what a
   registered rule does. `changes` names those rules, and
   tools-check/coach-registry.mjs fails on a question nothing references — a
   question that alters nothing is a survey, and Rack is not running one.

   Ship one has exactly one. weight_rate_vs_goal is silent when the direction is
   unknown (a rate with no stated direction has no reading), and this is the one
   thing the data genuinely cannot supply: an account with no auto goal and a
   calorie target within a rounding of maintenance has not said which way it
   means to go.

   v48 adds the goal's two, and they are asked somewhere else. A question with
   a `where` is never the sheet's opening question — pendingQuestion() skips it
   — and is asked instead under the answer it refines: `where: 'targets'` under
   "What should I lift today?", the moment the answer changes something he can
   see, behind the Pro gate and the targets switch by construction. `always`
   is what Settings reads: those rows are shown before they are answered, under
   Your goal. `ack` is what the sheet says once an answer is in — each question
   its own, because "that changes how Coach reads your weight" is false of an
   aim. */
export const QUESTIONS = Object.freeze([
  {
    id: 'q_goal_direction',
    text: 'Which way are you trying to go right now?',
    options: Object.freeze([
      { value: 'down', label: 'Down' },
      { value: 'hold', label: 'Holding' },
      { value: 'up',   label: 'Up' }
    ]),
    // Two rules now, not one: the stall readout reads differently through a
    // deficit, and a question that unlocks something has to say everything it
    // unlocks or the list stops being true.
    changes: Object.freeze(['weight_rate_vs_goal', 'stalled_lift']),
    fact: 'weight.goalDir',
    ack: 'Noted. That changes how Coach reads your weight.',
    // Only worth asking when the answer would really unlock something: there is
    // a rate to read and no direction to read it against.
    when: d => d.f('weight.rateWk') != null && d.f('weight.goalDir') == null
  },
  {
    id: 'q_goal_aim',
    text: 'What are you training for right now?',
    options: Object.freeze([
      { value: 'strength',     label: 'Get stronger' },
      { value: 'powerlifting', label: 'Powerlifting' },
      { value: 'muscle',       label: 'Build muscle' },
      { value: 'cut',          label: 'Lose fat, keep strength' },
      { value: 'recomp',       label: 'Recomp' },
      { value: 'maintain',     label: 'Stay consistent' }
    ]),
    changes: Object.freeze(['lift_targets']),
    fact: 'coach.aim',
    always: true,
    where: 'targets',
    ack: 'Noted. Coach sets your targets with that in mind.',
    when: d => d.f('coach.aim') == null
  },
  {
    id: 'q_experience',
    text: 'How long have you been lifting consistently?',
    // Spelled out: every figure in this file's copy is computed from the log,
    // and tools-check/coach-units.mjs refuses a typed one.
    options: Object.freeze([
      { value: 'new',   label: 'Under six months' },
      { value: 'some',  label: 'Six months to two years' },
      { value: 'years', label: 'Two years or more' }
    ]),
    changes: Object.freeze(['lift_targets']),
    fact: 'coach.experience',
    always: true,
    where: 'targets',
    ack: 'Noted. That sets how big a jump Coach will suggest.',
    when: d => d.f('coach.aim') != null && d.f('coach.experience') == null
  }
]);

const QUESTION_BY_ID = Object.freeze(Object.fromEntries(QUESTIONS.map(q => [q.id, q])));

/* ================================================================
   5.  THE INTENT REGISTRY
   ================================================================
   kind          guard    never ranked; it suppresses, and it answers in the
                          sheet. The three band-1 blocking states are guards and
                          states that DO render, and they are handled by step 0
                          of the ranking rule rather than by ranking at all
                 state    the card's own state machine
                 finding  the only kind that competes for the finding slot
                 selector picks something rather than saying something

   priorityBand  2-5 for content. Band 1 belongs to step 0 and nothing else may
                 occupy it, which is what makes "a live session outranks every
                 finding" a property of the table rather than of an if.

   supersedes    the stopping bias, written down: the findings that counsel rest
                 or caution take the top severities and name the do-more
                 findings here, so a card can never say "you are behind on
                 chest" underneath "you have trained chest six times this
                 fortnight".

   tier          which findings a free account sees. The readouts are free; the
                 comparisons against your own history are what Pro adds. */
export const INTENTS = Object.freeze([

  /* ---------- band 1: the blocking states ---------- */
  {
    id: 'guard_log_unreadable', kind: 'guard', priorityBand: 1, severity: 99,
    category: 'core', tier: 'free', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['log.confidence'], supersedes: [],
    minData: () => true,
    when: d => d.f('log.confidence') === 'unknown',
    response: 'resp_log_unreadable'
  },
  {
    id: 'card_first_run', kind: 'state', priorityBand: 1, severity: 98,
    category: 'core', tier: 'free', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['log.confidence'], supersedes: [],
    minData: () => true,
    when: d => d.f('log.confidence') === 'empty',
    response: 'resp_first_run'
  },
  {
    id: 'card_live_session', kind: 'state', priorityBand: 1, severity: 97,
    category: 'core', tier: 'free', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['live.active'], supersedes: [],
    minData: () => true,
    when: d => d.f('live.active') === true,
    response: 'resp_live_session'
  },

  /* ---------- the fall-through states ---------- */
  {
    id: 'card_state_thin', kind: 'state', priorityBand: 1, severity: 10,
    category: 'core', tier: 'free', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['session.count'], supersedes: [],
    minData: () => true, when: () => false,
    response: 'resp_state_thin'
  },
  {
    id: 'card_state_clear', kind: 'state', priorityBand: 1, severity: 9,
    category: 'core', tier: 'free', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['session.windowCount'], supersedes: [],
    minData: () => true, when: () => false,
    response: 'resp_state_clear'
  },
  {
    id: 'card_state_locked', kind: 'state', priorityBand: 1, severity: 8,
    category: 'core', tier: 'free', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['meta.tierPro'], supersedes: [],
    minData: () => true, when: () => false,
    response: 'resp_state_locked'
  },

  /* ---------- band 2: caution. The stopping bias lives here ---------- */
  {
    id: 'same_group_overused', kind: 'finding', priorityBand: 2, severity: 90,
    category: 'safety', tier: 'pro', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['group.overused', 'group.medianGap'],
    supersedes: ['train_today_recommendation', 'session_shape_most_overdue',
                 'group_overdue', 'group_under_weekly_normal', 'weekly_sessions_vs_trailing'],
    minData: d => d.f('group.medianGap') != null && d.f('session.windowCount') >= 8,
    when: d => d.f('group.overused') != null,
    tone: 'caution',
    response: 'resp_group_overused'
  },
  {
    id: 'returning_from_layoff', kind: 'finding', priorityBand: 2, severity: 80,
    category: 'recency', tier: 'free', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['session.lastDaysAgo', 'session.medianGapDays', 'session.lastGroups'],
    supersedes: ['group_overdue', 'session_shape_most_overdue', 'stalled_lift',
                 'group_under_weekly_normal', 'weekly_sessions_vs_trailing'],
    minData: d => d.f('session.medianGapDays') != null && d.f('session.lastDaysAgo') != null,
    when: d => {
      const gap = d.f('session.lastDaysAgo'), med = d.f('session.medianGapDays');
      return med > 0 && gap >= 10 && gap >= med * 3;
    },
    tone: 'neutral',
    response: 'resp_returning'
  },

  /* ---------- band 3: the training headline ---------- */
  {
    id: 'train_today_recommendation', kind: 'finding', priorityBand: 3, severity: 70,
    category: 'recency', tier: 'pro', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['session.shapeOverdue', 'session.windowCount'],
    // Both of these are the same observation in fewer words. When the headline
    // fires it IS the shape sentence and it IS the group sentence, and a Train
    // card repeating the You card in other words is the thing the dedupe across
    // surfaces exists to prevent.
    supersedes: ['session_shape_most_overdue', 'group_overdue'],
    minData: d => d.f('session.windowCount') >= 6 && d.f('session.shapes') != null,
    when: d => d.f('session.shapeOverdue') != null && d.f('session.shapeOverdue').stalest.ratio >= OVERDUE_RATIO,
    tone: 'neutral',
    response: 'resp_train_today'
  },
  {
    id: 'session_shape_most_overdue', kind: 'finding', priorityBand: 3, severity: 62,
    category: 'recency', tier: 'pro', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['session.shapeOverdue', 'session.shapes'],
    supersedes: [],
    minData: d => { const s = d.f('session.shapes'); return s != null && s.length >= 2; },
    when: d => d.f('session.shapeOverdue') != null,
    tone: 'neutral',
    response: 'resp_shape_overdue'
  },
  {
    id: 'group_overdue', kind: 'finding', priorityBand: 3, severity: 58,
    category: 'recency', tier: 'pro', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['group.overdue'],
    supersedes: [],
    minData: d => d.f('session.windowCount') >= 6 && d.f('group.medianGap') != null,
    when: d => d.f('group.overdue') != null,
    tone: 'neutral',
    response: 'resp_group_overdue'
  },

  /* ---------- band 4: progression and volume ---------- */
  {
    /* ANSWER-ONLY, AND THAT IS THE POINT OF IT. A reading about a lift that has
       not gone up is a fair thing to hand somebody who asked "anything
       stalled?" and the wrong thing to put on the screen the app opens to. It
       shipped on both cards and read as a verdict delivered unprompted; the
       sentence is a readout now (§RESPONSES) and the surface is the sheet.
       The intent itself stays — the question it answers is a good one. */
    id: 'stalled_lift', kind: 'finding', priorityBand: 4, severity: 55,
    category: 'progression', tier: 'pro', surfaces: ['sheet'],
    factsNeeded: ['lift.stalled', 'lift.stallRead'], supersedes: ['pr_proximity'],
    minData: d => d.f('session.windowCount') >= 4,
    // v49: and only when stage two has a reading of that same lift. A flat
    // figure with no context beside it is what stage two exists to replace.
    when: d => d.f('lift.stalled') != null && d.f('lift.stallRead') != null,
    tone: 'neutral',
    response: 'resp_stalled'
  },
  {
    id: 'recent_pr', kind: 'finding', priorityBand: 4, severity: 52,
    category: 'progression', tier: 'free', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['lift.recentPr'], supersedes: [],
    minData: d => d.f('session.count') >= 3,
    when: d => d.f('lift.recentPr') != null,
    tone: 'good',
    response: 'resp_recent_pr'
  },
  {
    id: 'pr_proximity', kind: 'finding', priorityBand: 4, severity: 48,
    category: 'progression', tier: 'pro', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['lift.proximity'], supersedes: [],
    minData: d => d.f('session.count') >= 3,
    when: d => d.f('lift.proximity') != null,
    tone: 'good',
    response: 'resp_proximity'
  },
  {
    /* THE LIGHTER WEEK (v49): account-wide, reactive, sheet-only. Two or more
       of its signs — lifts declining, failures well over his usual share, two
       big weeks running, six weeks since his last light one — and it answers
       "Should I go lighter?". It never reaches a card, but it is a finding, so
       its supersedes is the stopping bias: while it fires, no card cheers a
       record or a near-record. */
    id: 'lighter_week', kind: 'finding', priorityBand: 2, severity: 75,
    category: 'rest', tier: 'pro', surfaces: ['sheet'],
    factsNeeded: ['session.lighterWeek'], supersedes: ['recent_pr', 'pr_proximity'],
    minData: d => !isMuted(d.input.settings, 'rest') && d.f('session.windowCount') >= 6,
    when: d => d.f('session.lighterWeek') != null,
    tone: 'caution',
    response: 'resp_lighter_week'
  },
  {
    id: 'group_under_weekly_normal', kind: 'finding', priorityBand: 4, severity: 45,
    category: 'volume', tier: 'pro', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['group.underWeekly'], supersedes: [],
    minData: d => d.f('group.trailingSets') != null,
    when: d => d.f('group.underWeekly') != null,
    tone: 'neutral',
    response: 'resp_under_weekly'
  },
  {
    id: 'weekly_sessions_vs_trailing', kind: 'finding', priorityBand: 4, severity: 40,
    category: 'volume', tier: 'free', surfaces: ['you', 'train', 'sheet'],
    factsNeeded: ['session.last7', 'session.trailingPerWeek'], supersedes: [],
    minData: d => { const t = d.f('session.trailingPerWeek'); return t != null && t >= 1; },
    when: d => {
      const now = d.f('session.last7'), was = d.f('session.trailingPerWeek');
      return Math.abs(now - was) >= 1;
    },
    tone: 'neutral',
    response: 'resp_weekly_sessions'
  },

  /* ---------- the fuel guard, and band 5: the readouts ---------- */
  {
    /* First in this family and not rankable. Every fuel finding below is gated
       on fuel.targetsSet, so an account that skipped onboarding gets silence
       from them; this is what says so out loud when the Fuel bubble is tapped. */
    id: 'fuel_no_targets_set', kind: 'guard', priorityBand: 2, severity: 60,
    category: 'fuel', tier: 'free', surfaces: ['sheet'],
    factsNeeded: ['fuel.targetsSet'],
    supersedes: ['fuel_calories_left_today', 'fuel_macro_share_vs_targets', 'fuel_protein_vs_trailing'],
    minData: () => true,
    when: d => d.f('fuel.targetsSet') === false,
    response: 'resp_no_targets'
  },
  {
    id: 'fuel_calories_left_today', kind: 'finding', priorityBand: 5, severity: 34,
    category: 'fuel', tier: 'free', surfaces: ['you', 'sheet'],
    factsNeeded: ['fuel.calLeft', 'fuel.calTarget', 'fuel.calToday'], supersedes: [],
    minData: d => d.f('fuel.targetsSet') === true,
    when: d => d.f('fuel.calLeft') != null,
    tone: 'neutral',
    response: 'resp_cal_left'
  },
  {
    id: 'fuel_macro_share_vs_targets', kind: 'finding', priorityBand: 5, severity: 32,
    category: 'fuel', tier: 'pro', surfaces: ['you', 'sheet'],
    factsNeeded: ['fuel.macroShare', 'fuel.targetShare'], supersedes: [],
    minData: d => d.f('fuel.targetsSet') === true && d.f('fuel.loggedDays') >= 4,
    when: d => {
      const now = d.f('fuel.macroShare'), want = d.f('fuel.targetShare');
      if (!now || !want) return false;
      return Math.max(Math.abs(now.p - want.p), Math.abs(now.c - want.c), Math.abs(now.f - want.f)) >= 6;
    },
    tone: 'neutral',
    response: 'resp_macro_share'
  },
  {
    id: 'fuel_protein_vs_trailing', kind: 'finding', priorityBand: 5, severity: 30,
    category: 'fuel', tier: 'pro', surfaces: ['you', 'sheet'],
    factsNeeded: ['fuel.proteinTrailing', 'fuel.proteinTarget'], supersedes: [],
    minData: d => d.f('fuel.targetsSet') === true && d.f('fuel.loggedDays') >= 4,
    when: d => {
      const got = d.f('fuel.proteinTrailing'), want = d.f('fuel.proteinTarget');
      return got != null && want != null && Math.abs(got - want) >= want * 0.12;
    },
    tone: 'neutral',
    response: 'resp_protein'
  },

  /* ---------- weight and steps ---------- */
  {
    id: 'weight_rate_vs_goal', kind: 'finding', priorityBand: 5, severity: 36,
    category: 'weight', tier: 'pro', surfaces: ['you', 'sheet'],
    factsNeeded: ['weight.rateWk', 'weight.goalDir', 'weight.goalRateWk'], supersedes: [],
    minData: d => d.f('weight.rateWk') != null && d.f('weight.goalDir') != null,
    when: d => d.f('weight.rateWk') != null && d.f('weight.goalDir') != null,
    tone: d => Math.abs(d.f('weight.rateWk')) > RATE_BAND_LB ? 'caution' : 'neutral',
    response: 'resp_weight_rate'
  },
  {
    id: 'weight_no_recent_weighin', kind: 'finding', priorityBand: 5, severity: 28,
    category: 'weight', tier: 'free', surfaces: ['you', 'sheet'],
    factsNeeded: ['weight.daysSinceWeighIn', 'weight.latestLb'], supersedes: [],
    minData: d => d.f('weight.daysSinceWeighIn') != null,
    when: d => d.f('weight.daysSinceWeighIn') >= 5,
    tone: 'neutral',
    response: 'resp_no_weighin'
  },
  {
    /* No bubble of its own in the sheet — it is reachable as a follow-up off
       Weight, and as a card finding. Steps is a readout and the tab already
       draws it; a preset bubble for it would be a fourth button competing with
       three that have more to say. */
    id: 'steps_today_vs_trailing', kind: 'finding', priorityBand: 5, severity: 22,
    category: 'steps', tier: 'free', surfaces: ['you', 'sheet'],
    factsNeeded: ['steps.today', 'steps.trailing'], supersedes: [],
    minData: d => d.f('steps.trailing') != null,
    when: d => {
      const t = d.f('steps.today'), was = d.f('steps.trailing');
      return t != null && was != null && Math.abs(t - was) >= was * 0.2;
    },
    tone: 'neutral',
    response: 'resp_steps'
  },

  /* ---------- meta ---------- */
  {
    id: 'greet_select', kind: 'selector', priorityBand: 5, severity: 1,
    category: 'core', tier: 'free', surfaces: [],
    factsNeeded: ['coach.recentGreets'], supersedes: [],
    minData: () => true, when: () => false,
    response: 'resp_greet'
  },
  {
    id: 'card_lead_question', kind: 'selector', priorityBand: 5, severity: 1,
    category: 'core', tier: 'free', surfaces: [],
    factsNeeded: ['session.count'], supersedes: [],
    minData: () => true, when: () => false,
    response: 'resp_lead'
  },
  {
    id: 'coach_ask_question', kind: 'selector', priorityBand: 5, severity: 1,
    category: 'questions', tier: 'free', surfaces: ['sheet'],
    factsNeeded: ['coach.openQuestion'], supersedes: [],
    minData: () => true, when: () => false,
    response: 'resp_question'
  },
  {
    /* THE WORKOUT BUILDER — the answer to "Build it", which comes after an
       answer that has already named what to train, so it goes straight to the
       proposal (v46; "Make me a workout" asks first, build_menu below). A
       selector: it picks something rather than saying
       something, so it never competes for a card and is never counted in "N
       more with Pro". What it picks is coach-build.js's to decide; what it
       takes from here is the log, read the way every other rule reads it (see
       builderInput). It is offered only when that proposal exists — the same
       rule every Train bubble follows — and not at all when the account has
       switched the category off. Absent means on, so every account that
       predates it has it without a byte written. */
    id: 'build_workout', kind: 'selector', priorityBand: 5, severity: 1,
    category: 'build', tier: 'pro', surfaces: ['sheet'],
    factsNeeded: ['session.shapeOverdue', 'session.windowCount'], supersedes: [],
    minData: d => !isMuted(d.input.settings, 'build'),
    when: d => d.build({}) != null,
    response: 'resp_build'
  },
  {
    /* "Make me a workout" ASKS FIRST: what does he want to train? The answer
       is the question, and the chips under it are coach-build.js's buildMenu()
       — Coach's own pick first, then his shapes, then the six groups, each
       only if it builds. "Build it", which follows an answer that has already
       named what to train, skips the question: that is build_workout above.
       Offered under exactly the builder's own conditions, so the two can never
       disagree about whether there is a workout to be had. */
    id: 'build_menu', kind: 'selector', priorityBand: 5, severity: 1,
    category: 'build', tier: 'pro', surfaces: ['sheet'],
    factsNeeded: ['session.shapeOverdue', 'session.windowCount'], supersedes: [],
    minData: d => !isMuted(d.input.settings, 'build'),
    when: d => d.build({}) != null && d.buildMenu().length > 0,
    response: 'resp_build_menu'
  },
  {
    /* WHAT TO LIFT — v48. The targets on the workout "Build it" would make,
       one bubble per lift, each worked out by coach-prog.js from his own
       sessions. A selector: it picks the workout's targets rather than finding
       something, so it never competes for a card. Pro, because the builder is.
       Switched off in Settings → Coach → Weight and rep targets, and then the
       proposal carries none either (builderInput's targetsOn). */
    id: 'lift_targets', kind: 'selector', priorityBand: 5, severity: 1,
    category: 'targets', tier: 'pro', surfaces: ['sheet'],
    factsNeeded: ['lift.targets'], supersedes: [],
    minData: d => !isMuted(d.input.settings, 'targets'),
    when: d => (d.f('lift.targets') || []).length > 0,
    response: 'resp_lift_targets'
  },
  {
    /* HOW ARE MY LIFTS MOVING? (v49) One line per lift, up to five, each
       coach-overlap.js's: how much a climbing lift is up, what a flat one's
       reading is, or that it is too soon to say. A selector — it picks the
       lifts and says each — so it never competes for a card. */
    id: 'lift_status', kind: 'selector', priorityBand: 5, severity: 1,
    category: 'progression', tier: 'pro', surfaces: ['sheet'],
    factsNeeded: ['lift.moving'], supersedes: [],
    minData: d => !isMuted(d.input.settings, 'progression'),
    when: d => d.f('lift.moving') != null,
    response: 'resp_lift_status'
  },
  {
    /* GOOD DAY FOR A RECORD? (v49) Only when asked, never on a card, never
       pushed, and only offered on a day one qualifies: a rep record at a
       weight he has already lifted. */
    id: 'record_day', kind: 'selector', priorityBand: 5, severity: 1,
    category: 'progression', tier: 'pro', surfaces: ['sheet'],
    factsNeeded: ['lift.recordDay'], supersedes: [],
    minData: d => !isMuted(d.input.settings, 'progression'),
    when: d => d.f('lift.recordDay') != null,
    response: 'resp_record_day'
  },
  {
    /* THE IN-SESSION READ, registered so its switch is a category like any
       other and so the Pro panel names it. It is never answered through the
       router — it needs the live session, which only the caller has — so its
       condition is never true here; c.live() is the way in, and it reads the
       same switch. */
    id: 'live_read', kind: 'selector', priorityBand: 5, severity: 1,
    category: 'live', tier: 'pro', surfaces: [],
    factsNeeded: ['live.active'], supersedes: [],
    minData: d => !isMuted(d.input.settings, 'live'), when: () => false,
    response: 'resp_live'
  },
  {
    /* PATTERNS IN YOUR DATA. Sheet-only and answer-only: it reaches no card,
       it is never the lead question, and there is no bubble for it unless the
       account has switched the category ON — absent means off for this one —
       and at least one of the eight clears its gate. The answer says every one
       that does, first to last, and nothing about what to do with them. */
    id: 'patterns_in_data', kind: 'finding', priorityBand: 5, severity: 5,
    category: 'patterns', tier: 'pro', surfaces: ['sheet'],
    factsNeeded: PATTERN_FACTS.slice(), supersedes: [],
    minData: d => !isMuted(d.input.settings, 'patterns'),
    when: d => PATTERN_FACTS.some(id => d.f(id) != null),
    tone: 'neutral',
    response: 'resp_patterns'
  },
  {
    /* Registered, and deliberately unreachable from any button tonight. Coach
       does not do injuries, and the seam where ship three's text box routes a
       question about pain has to exist before the box does — otherwise the
       first thing anybody types into it falls through to a training answer. */
    id: 'coach_not_injuries', kind: 'guard', priorityBand: 2, severity: 95,
    category: 'safety', tier: 'free', surfaces: ['sheet'],
    factsNeeded: [], supersedes: [],
    // Always true, and that is not a mistake: its CONDITION is that somebody
    // asked, and the router is what asks. It is a guard with an empty
    // supersedes and no card surface, so being permanently firing costs
    // nothing — it can never reach a card and can never suppress anything.
    minData: () => true, when: () => true,
    response: 'resp_not_injuries'
  }
]);

const INTENT_BY_ID = Object.freeze(Object.fromEntries(INTENTS.map(i => [i.id, i])));

/* What Pro actually adds to Coach, derived from the table above rather than
   written out beside it. The sheet names these to a basic account, and a list
   typed by hand is a list that goes stale the first time an intent changes
   tier — which is the kind of untrue sentence this whole ship exists to avoid.
   Categories, in the order of the toggle table, with the same labels and notes
   the Settings switches use.

   Findings AND selectors. The first version counted findings alone, which was
   right while every selector was free — and would have left the builder, the
   largest thing Pro adds, off the list of what Pro adds. A guard or a state is
   the card's own machinery and is never something one tier has and the other
   does not. */
/* The in-session read's own words for "nothing to add", handed on to the view
   so the sheet says what the pure layer says rather than a second copy. */
export { LIVE_NONE };

export const PRO_ADDS = Object.freeze(
  CATEGORIES
    .filter(c => INTENTS.some(i => (i.kind === 'finding' || i.kind === 'selector') &&
                                   i.tier === 'pro' && i.category === c.id))
    .map(c => Object.freeze({ id: c.id, label: c.label, note: c.note })));

/* ================================================================
   6.  THE RESPONSES
   ================================================================
   Templates, keyed by id, filled from resolved facts. Split from the rules so
   the same finding renders on a card, in a bubble and (later) in a weekly
   review without its condition being written twice.

   THE UNITS RULE, which is the single most likely defect in this file: every
   sentence that prints a weight routes through units.js. Nothing below builds a
   pound figure by hand, nothing below writes the word lb or kg, and nothing
   below names a rounding or a step size — "the next 5 up" is a false sentence
   on a metric account, because five pounds is not a round number of kilos.
   tools-check/coach-units.mjs renders every one of these twice, once imperial
   and once metric, and fails on any that comes out the same.

   `reason` is optional. When it is absent the reason line is assembled from the
   `because` strings of the facts the intent quoted, which is what keeps those
   strings load-bearing rather than documentation.

   THE VOICE RULE, and it is a rule rather than a style note:

       AN UNPROMPTED FINDING IS NEUTRAL OR ACTIONABLE, NEVER A JUDGEMENT.
       COACH DESCRIBES THE NUMBERS, NEVER THE PERSON.

   Anything that can reach the You card or the Train card arrives without being
   asked for, on the screen the app opens to, and a sentence that is fair in
   answer to a direct question is not automatically fair there. This ship
   learned it the expensive way: "X hasn't moved: your best estimated max there
   is still N" shipped on both cards and read as a verdict delivered to somebody
   who had asked for nothing. A verdict also has a way of being the wrong
   reading — a flat estimated max through a deficit is a lift held, not a lift
   stalled — so the same words that judge are usually the words that guess.

   Mechanically: no "hasn't", no "still", no "only", no "failed", no "stopped
   moving", no "no progress", in any template a card can reach or in any
   `because` string a card-reachable intent quotes. tools-check/coach-voice.mjs
   renders every one and refuses them, with NO exemption list — a rule carrying
   five exceptions is a rule nobody keeps true, so where one of those words was
   doing honest temporal or scoping work the sentence was rewritten instead.
   Sheet-only templates are not bound by it: somebody who tapped "Anything
   stalled?" has asked a question and is owed its answer. */
export const RESPONSES = Object.freeze({

  resp_log_unreadable: {
    text: () => 'Can’t read your training log right now.',
    reason: () => 'Coach says nothing rather than guess from a read it could not finish. Every other tab draws from its own data.'
  },
  resp_first_run: {
    text: () => 'Nothing in your training log yet.',
    reason: () => 'Coach reads your own sessions, food and weigh-ins. Finish one session and it has something to compare.'
  },
  resp_live_session: {
    text: () => 'You’re mid-session.',
    reason: () => 'A workout in progress isn’t in the log yet, so Coach waits until you save it.'
  },
  resp_state_thin: {
    text: d => plural(d.f('session.count'), 'session') + ' logged so far.',
    reason: () => 'Most of what Coach looks at wants three or four sessions inside the last twelve weeks before it will say anything.'
  },
  resp_state_clear: {
    text: () => 'Nothing stands out today.',
    reason: () => 'Checked how long since each group, sets against your own weekly normal, where your best estimated maxes sit, and records.'
  },
  resp_state_locked: {
    text: d => {
      const n = d.lockedCount || 0;
      return n === 1 ? 'Coach has one more thing to say about your log.'
                     : 'Coach has ' + n + ' more things to say about your log.';
    },
    reason: () => 'Comparisons against your own history are part of Pro. The readouts stay here either way.'
  },

  resp_group_overused: {
    text: d => {
      const v = d.f('group.overused');
      return 'You’ve trained ' + groupLabel(v.group) + ' on ' + plural(v.days, 'day') +
             ' in the last two weeks.';
    }
  },
  resp_returning: {
    text: d => {
      const gap = d.f('session.lastDaysAgo'), med = d.f('session.medianGapDays');
      return 'Back after ' + plural(gap, 'day') + '. Your usual gap is ' + plural(one(med), 'day') + '.';
    },
    reason: d => {
      const g = d.f('session.lastGroups');
      return (g && g.length ? 'Your last session was ' + groupList(g) + '. ' : '') +
             'Nothing here is behind — Coach starts its windows again from whatever you log next.';
    }
  },
  resp_train_today: {
    /* Soft framing, deliberately: "if you train today", never "today is chest
       day". Rack has not seen a programme and is not going to pretend it has.
       And the number rides in the headline rather than only in the reason
       underneath, because a finding that cannot be backed by a number in its
       own sentence is not a finding. */
    text: d => {
      const v = d.f('session.shapeOverdue');
      return 'If you train today, your ' + v.name + ' has waited longest — ' +
             groupLabel(v.stalest.group) + ' is ' + plural(v.stalest.since, 'day') + ' back.';
    },
    reason: d => {
      const v = d.f('session.shapeOverdue');
      return 'Against a usual ' + plural(one(v.stalest.med), 'day') + ' between them, and this shape has come round ' +
             plural(v.count, 'time') + ' in the last twelve weeks.';
    }
  },
  resp_shape_overdue: {
    text: d => {
      const v = d.f('session.shapeOverdue'), n = d.f('session.shapes').length;
      return 'Of the ' + (n === 1 ? 'one session shape' : n + ' session shapes') +
             ' that recur for you, ' + v.name + ' has waited longest.';
    }
  },
  resp_group_overdue: {
    text: d => {
      const v = d.f('group.overdue');
      return plural(v.days, 'day') + ' since your last working set for ' + groupLabel(v.group) + '.';
    }
  },
  /* The sentence this ship rewrote, twice. It shipped as "X hasn't moved:
     your best estimated max there is still N" — a characterisation of the
     lifter, unprompted, on the screen the app opens to — and became a figure
     and a date on the sheet. v49 goes the rest of the way: a flat figure with
     nothing beside it was still a guess about the most sensitive thing Coach
     reads, because a flat estimated max through a cut is a lift held. So the
     answer is stage two's reading of that lift (coach-overlap.js): plateau,
     holding through a cut, a slide, trained too rarely to say, or "Coach
     needs weigh-ins to tell". The standing best rides in the evidence, as a
     figure through units.js, so the old readout is still there to check. */
  resp_stalled: {
    text: d => d.f('lift.stallRead').text,
    reason: (d, u) => {
      const v = d.f('lift.stalled'), r = d.f('lift.stallRead');
      return r.reason + ' Your best estimated max on it is ' + labelW(v.best, u) + '.';
    }
  },
  resp_recent_pr: {
    text: (d, u) => {
      const v = d.f('lift.recentPr');
      const when = v.daysAgo === 0 ? 'today' : v.daysAgo === 1 ? 'yesterday' : plural(v.daysAgo, 'day') + ' ago';
      if (v.kind === 'volume') {
        return v.name + ' took its biggest session ' + when + ' — ' + labelW(v.value, u) + ' of working volume.';
      }
      const what = v.kind === 'weight' ? 'heaviest set' : 'best estimated max';
      return v.name + ' set a new ' + what + ' ' + when + ' at ' + labelW(v.value, u) + '.';
    }
  },
  resp_proximity: {
    text: (d, u) => {
      const v = d.f('lift.proximity');
      return 'One more rep at ' + labelW(v.lb, u) + ' on ' + v.name +
             ' would beat your best estimated max there.';
    }
  },
  resp_under_weekly: {
    text: d => {
      const v = d.f('group.underWeekly');
      return plural(v.sets, 'working ' + groupLabel(v.group) + ' set') + ' in the last 7 days, against about ' +
             one(v.normal) + ' a week before that.';
    }
  },
  resp_weekly_sessions: {
    text: d => {
      const now = d.f('session.last7'), was = d.f('session.trailingPerWeek');
      return plural(now, 'session') + ' in the last 7 days, against ' + one(was) +
             ' a week across the four weeks before.';
    },
    // Naming the denominator out loud, because the denominator IS the finding:
    // Rack has no opinion about how many sessions a week is right and is not
    // going to grow one. The bar is whatever this account has been doing.
    reason: () => 'Your own trailing average, not a number Coach picked. The four weeks before this one, nothing else.'
  },

  resp_no_targets: {
    text: () => 'No daily targets set on this account.',
    reason: () => 'Coach won’t measure your food against a number nobody chose. Set them under Settings → Daily targets and it will start.'
  },
  resp_cal_left: {
    text: d => {
      const left = d.f('fuel.calLeft'), t = d.f('fuel.calTarget');
      return left >= 0
        ? int(left) + ' kcal left today against your ' + int(t) + ' target.'
        : int(-left) + ' kcal past your ' + int(t) + ' target today.';
    }
  },
  resp_macro_share: {
    text: d => {
      const now = d.f('fuel.macroShare'), want = d.f('fuel.targetShare');
      const rows = [['Protein', now.p, want.p], ['Carbs', now.c, want.c], ['Fat', now.f, want.f]];
      rows.sort((a, b) => Math.abs(b[1] - b[2]) - Math.abs(a[1] - a[2]));
      const [name, got, aim] = rows[0];
      return name + ' is ' + Math.round(got) + '% of your calories over the last seven full days, against the ' +
             Math.round(aim) + '% your targets work out to.';
    }
  },
  resp_protein: {
    text: d => {
      const got = d.f('fuel.proteinTrailing'), want = d.f('fuel.proteinTarget');
      return 'Protein averaged ' + int(got) + ' g a day over the last seven full days, against your ' + int(want) + ' g target.';
    }
  },

  resp_weight_rate: {
    /* The magnitude guard. Until v47 insights.js's rateVerdict called any rate
       in the goal's direction 'good', unbounded, while LIMITS.rateWk allows
       five a week — so an account dropping weight very fast got a green number
       and an approving sentence; it carries this band now too. Coach
       reports the number and, past the band, declines to call it anything. The
       band itself is never printed: it is a pound figure, and a pound figure
       named in a sentence is a false sentence on a metric account. */
    text: (d, u) => {
      const r = d.f('weight.rateWk'), dir = d.f('weight.goalDir');
      const goal = d.f('weight.goalRateWk');
      const way = r < 0 ? 'Down ' : r > 0 ? 'Up ' : 'Holding at ';
      const size = labelRate(Math.abs(r), u) + ' a week';
      if (Math.abs(r) > RATE_BAND_LB) {
        return way + size + (goal != null ? ', against the ' + labelRate(Math.abs(goal), u) + ' you set.'
                                          : '. Coach reports the number and leaves the reading to you.');
      }
      const agrees = dir === 0 ? Math.abs(r) <= 0.5 : dir < 0 ? r <= 0 : r >= 0;
      if (r === 0) return 'Holding — no change a week.';
      return way + size + (agrees ? ', which is the way your goal points.' : '; your goal points the other way.');
    },
    reason: (d, u) => {
      const r = d.f('weight.rateWk');
      const base = FACT_BY_ID['weight.rateWk'].because(r, d);
      return Math.abs(r) > RATE_BAND_LB
        ? base.charAt(0).toUpperCase() + base.slice(1) + '. Coach won’t call a rate that size on track, whichever way it points.'
        : base.charAt(0).toUpperCase() + base.slice(1) + '.';
    }
  },
  resp_no_weighin: {
    text: (d, u) => {
      const n = d.f('weight.daysSinceWeighIn'), lb = d.f('weight.latestLb');
      return plural(n, 'day') + ' since your last weigh-in' +
             (lb != null ? '. It read ' + labelW(lb, u) + '.' : '.');
    },
    // Not a telling-off, and it says so: this is the one number every other
    // number on the Weight tab is fitted from, and the fit gets less sure the
    // older it is. That is the whole reason the sentence exists.
    reason: () => 'Nothing is overdue. The trend and the maintenance estimate are both fitted from these, so they get less sure the older the last one is.'
  },
  resp_steps: {
    text: d => {
      const t = d.f('steps.today'), was = d.f('steps.trailing');
      return int(t) + ' steps today, against ' + int(was) + ' a day over the last two weeks.';
    },
    reason: () => 'Averaged over the days you logged steps, not over fourteen — four logged days is a four-day average.'
  },

  /* Every pattern that clears its gate, as a readout: the lift or the days it
     is about, both medians or both shares, and both sample sizes. The first is
     the answer and the rest follow it in the thread (`more`). No sentence here
     says what to do, and none says why the two groups differ — see
     PATTERN_FACTS. Every weight goes through units.js. */
  resp_patterns: {
    lines: (d, u) => {
      const out = [];
      const say = (id, text, reason) => { const v = d.f(id); if (v != null) out.push({ id, text: text(v), reason }); };
      const pct = x => Math.round(x.k / x.n * 100) + '%';
      const way = r => (r < 0 ? 'down ' + labelRate(-r, u) : r > 0 ? 'up ' + labelRate(r, u) : 'level');
      say('lift.fedBeforeTop', v =>
        v.lift + ': food was logged before the session started in ' + v.a.k + ' of your ' + v.a.n +
        ' top-quarter sessions by estimated max (' + pct(v.a) + '), and in ' + v.b.k + ' of the other ' +
        v.b.n + ' (' + pct(v.b) + ').',
        'Sessions on days with food logged, over the last 26 weeks, ranked by the best estimated max of each.');
      say('session.setsAfterProtein', v =>
        'Sessions the day after you reached your ' + int(v.target) + ' g protein target: a median of ' + one(v.a.med) +
        ' working sets across ' + plural(v.a.n, 'session') + '. After days under it: ' + one(v.b.med) +
        ' across ' + plural(v.b.n, 'session') + '.',
        'Against the protein target you have now, over the last 26 weeks. A day with no food logged is left out.');
      say('fuel.trainingDayCalories', v =>
        'Calories on days you trained: a median of ' + int(v.a.med) + ' kcal across ' + plural(v.a.n, 'day') +
        '. On rest days: ' + int(v.b.med) + ' kcal across ' + plural(v.b.n, 'day') + '.',
        'Complete days with food logged, over the last 26 weeks.');
      say('weight.rateBySessions', v =>
        'Weeks with ' + PATTERN_BUSY_WEEK + ' or more sessions: weight ' + way(v.a.med) + ' a week at the median, across ' +
        plural(v.a.n, 'week') + '. Weeks with fewer: ' + way(v.b.med) + ' a week, across ' + plural(v.b.n, 'week') + '.',
        'Each week against the week before it, from the average of its weigh-ins, over the last 26 weeks.');
      say('lift.morningTop', v =>
        v.lift + ', median top-set estimated max: ' + labelW(v.a.med, u) + ' across ' + plural(v.a.n, 'session') +
        ' started before noon, and ' + labelW(v.b.med, u) + ' across ' + v.b.n + ' started later.',
        'Your most-logged lift over the last 26 weeks, by the hour each session started.');
      say('lift.restGapTop', v =>
        v.lift + ' with ' + groupLabel(v.group) + ' last trained ' + PATTERN_CLOSE + ' or fewer days before: a median ' +
        'top-set estimated max of ' + labelW(v.a.med, u) + ' across ' + plural(v.a.n, 'session') + '. After ' +
        PATTERN_RESTED + ' or more days: ' + labelW(v.b.med, u) + ' across ' + v.b.n + '.',
        'Counted back to the last session with a working set for that group. A gap between the two belongs to neither side.');
      say('steps.trainingDays', v =>
        'Steps on days you trained: a median of ' + int(v.a.med) + ' across ' + plural(v.a.n, 'day') +
        '. On rest days: ' + int(v.b.med) + ' across ' + plural(v.b.n, 'day') + '.',
        'Complete days with steps logged, over the last 26 weeks.');
      say('lift.caloriesBeforeTop', v =>
        v.lift + ' after a day above your median ' + int(v.median) + ' kcal: a median top-set estimated max of ' +
        labelW(v.a.med, u) + ' across ' + plural(v.a.n, 'session') + '. After a day below it: ' +
        labelW(v.b.med, u) + ' across ' + v.b.n + '.',
        'Calories the day before each session of your most-logged lift, over the last 26 weeks. A day at the median itself is left out.');
      return out;
    },
    text: (d, u) => { const l = RESPONSES.resp_patterns.lines(d, u); return l.length ? l[0].text : ''; },
    reason: (d, u) => { const l = RESPONSES.resp_patterns.lines(d, u); return l.length ? l[0].reason : ''; },
    more: (d, u) => RESPONSES.resp_patterns.lines(d, u).slice(1).map(l => ({ text: l.text, reason: l.reason }))
  },

  /* v49's three. Every sentence is coach-overlap.js's, through units.js. */
  resp_lift_status: {
    text: d => d.f('lift.moving')[0].text,
    reason: d => d.f('lift.moving')[0].reason,
    more: d => d.f('lift.moving').slice(1).map(l => ({ text: l.text, reason: l.reason }))
  },
  resp_record_day: {
    text: d => d.f('lift.recordDay').text,
    reason: d => d.f('lift.recordDay').reason,
    // What Coach cannot see matters most here, so it is its own bubble.
    more: d => [{ text: d.f('lift.recordDay').unseen, reason: '' }]
  },
  resp_lighter_week: {
    text: d => d.f('session.lighterWeek').text,
    reason: d => d.f('session.lighterWeek').reason
  },

  resp_greet:    { text: () => '' },
  resp_lead:     { text: () => '' },
  /* The builder's answer is the proposal's own first line and its reason —
     coach-build.js writes both, and every word of it is fenced by
     coach-units.mjs and coach-voice.mjs section G. What the sheet draws
     underneath (the exercises, the four ways out) is the proposal itself. */
  resp_build: {
    text: d => { const p = d.build({}); return p ? p.headline : ''; },
    reason: d => { const p = d.build({}); return p ? p.reason.join(' ') : ''; }
  },
  // The question itself; the choices are buildMenu()'s, drawn under it.
  resp_build_menu: {
    text: () => BUILD_ASK,
    reason: () => 'Every choice here is built from a session in your log.'
  },
  /* The targets, one lift to a bubble: its line and, underneath, the first
     piece of its evidence. Every word of both is coach-prog.js's and is fenced
     there (tools-check/coach-prog.mjs) and in coach-voice.mjs. A lift in a
     duplicated block is one lift with one target, so it is said once. Six at
     most: past that it is the proposal, which is one tap away. */
  resp_lift_targets: {
    text: d => {
      const v = d.f('session.shapeOverdue');
      return v ? 'Targets for your ' + v.name + '.' : '';
    },
    reason: () => 'Each one is worked out from your own sessions of that lift. Nothing is logged until you tick a set.',
    more: d => {
      const p = d.build({});
      const seen = new Set();
      return (p ? p.exercises : []).filter(e => e.target && !seen.has(e.exId) && seen.add(e.exId))
        .slice(0, 6)
        .map(e => ({ text: e.name + ' — ' + e.target.line, reason: e.target.why[0] || '' }));
    }
  },
  // Never rendered through the router — see live_read.
  resp_live:     { text: () => '' },
  resp_question: {
    text: d => {
      const q = QUESTION_BY_ID[d.askQuestionId || ''];
      return q ? q.text : '';
    },
    reason: () => 'Coach asks at most one thing, and only something that changes what it can tell you.'
  },
  resp_not_injuries: {
    text: () => 'Coach doesn’t do injuries or pain.',
    reason: () => 'It reads your log and nothing else. If something hurts, that’s a conversation for a person, not an app.'
  }
});

/* ================================================================
   7.  THE ROTATING LINE
   ================================================================
   Short, five words at the outside, never an exclamation mark, and it sits
   BELOW the You tab's own four-bucket greeting rather than replacing it.

   Two kinds in one pool. A data-aware line that passes its gate is worth more
   than a generic one — a card that opens with a real number beats one that
   opens warmly — so once two of them qualify the rotation never leaves them,
   and only a log offering fewer than two sends the walk out into the generics.
   The last three lines Coach opened with come in with the counter, and the
   walk steps PAST them rather than removing them, so the same line does not
   run twice. How many of the three it consults depends on how wide the walk
   is — see pickGreeting, where the cap is the thing that keeps a narrow walk
   from having nowhere to step.

   `tone: 'warm'` lines are cheerful and are withheld entirely when the finding
   underneath counsels caution. The greeting must never contradict the sentence
   it is sitting on top of.

   `topic` is the category the line is about, and a line whose topic matches the
   finding's category is dropped too: a greeting that says the same thing as the
   line beneath it makes the card stutter.

   THE ROTATION IS A COUNTER, NOT A CLOCK. It used to be the wall clock modulo
   the pool size, which is a hash of the moment somebody happened to open the
   app rather than a rotation — three opens in a row could and did produce the
   same line. `opens` is a per-device integer that goes up by one each time the
   app opens, so consecutive opens land on consecutive entries of whichever
   pool is in force — the data-aware lines when two or more qualify, the whole
   ordered list when fewer do — and cannot repeat inside it. A gate that starts
   or stops passing moves the walk from one pool to the other between two
   opens, and covering that is the whole job of the memory. It is an input for
   the same reason `now` is: this file has no clock and no storage of its own. */
export const GREETINGS = Object.freeze([
  // generic
  { id: 'g_hello',   kind: 'generic', tone: 'warm',    topic: null, text: () => 'Good to see you.' },
  { id: 'g_ready',   kind: 'generic', tone: 'warm',    topic: null, text: () => 'Ready when you are.' },
  { id: 'g_look',    kind: 'generic', tone: 'neutral', topic: null, text: () => 'Here’s where you stand.' },
  { id: 'g_read',    kind: 'generic', tone: 'neutral', topic: null, text: () => 'Read from your own log.' },
  { id: 'g_noguess', kind: 'generic', tone: 'neutral', topic: null, text: () => 'Nothing here is a guess.' },
  { id: 'g_again',   kind: 'generic', tone: 'neutral', topic: null, text: () => 'Same numbers, read again.' },
  { id: 'g_back',    kind: 'generic', tone: 'warm',    topic: null, text: () => 'Back at it.' },

  // data-aware
  {
    id: 'g_since_group', kind: 'data', tone: 'neutral', topic: 'recency',
    gate: d => { const v = d.f('group.overdue'); return v != null && v.days <= 60; },
    text: d => { const v = d.f('group.overdue'); return v.days + ' days since ' + groupLabel(v.group) + '.'; }
  },
  {
    /* A ROLLING count under a rolling word. It said "this week", which on a
       Tuesday could be three sessions that all happened last week — a right
       number under a wrong word. "In the last seven days" is the brief's
       phrase and is two words past this pool's five, so it says the same fact
       in five: session.last7 is today and the six days before it, which is
       exactly seven days. */
    id: 'g_in_a_row', kind: 'data', tone: 'warm', topic: 'volume',
    gate: d => d.f('session.last7') >= 3,
    text: d => d.f('session.last7') + ' sessions in seven days.'
  },
  {
    id: 'g_moving', kind: 'data', tone: 'warm', topic: 'progression',
    gate: d => {
      const v = d.f('lift.recentPr');
      return v != null && String(v.name || '').trim().split(/\s+/).length <= 3;
    },
    text: d => d.f('lift.recentPr').name + ' is moving.'
  },
  {
    id: 'g_trained_today', kind: 'data', tone: 'warm', topic: 'recency',
    gate: d => d.f('session.lastDaysAgo') === 0,
    text: () => 'Logged already today.'
  },
  {
    id: 'g_away', kind: 'data', tone: 'neutral', topic: 'recency',
    gate: d => { const n = d.f('session.lastDaysAgo'); return n != null && n >= 7 && n <= 120; },
    text: d => d.f('session.lastDaysAgo') + ' days since a session.'
  },
  /* Deliberately unit-free. A greeting is five words at the outside and there
     is no room in it for a number and its unit word, so the lines that touch
     weight name a DIRECTION and leave the figure to the sentence below. A
     greeting that printed a bare pound number would be a wrong number on a
     metric account, which is the one thing nothing in Coach may be. */
  {
    id: 'g_trend_down', kind: 'data', tone: 'neutral', topic: 'weight',
    gate: d => { const r = d.f('weight.rateWk'); return r != null && r < -0.25; },
    text: () => 'The trend is pointing down.'
  },
  {
    id: 'g_trend_up', kind: 'data', tone: 'neutral', topic: 'weight',
    gate: d => { const r = d.f('weight.rateWk'); return r != null && r > 0.25; },
    text: () => 'The trend is pointing up.'
  },
  {
    id: 'g_fed', kind: 'data', tone: 'warm', topic: 'fuel',
    gate: d => d.f('fuel.calToday') != null,
    text: () => 'Food already logged today.'
  },
  {
    id: 'g_two_this_week', kind: 'data', tone: 'warm', topic: 'volume',
    gate: d => d.f('session.last7') === 2,
    text: () => 'Two sessions in already.'
  },
  {
    id: 'g_walked', kind: 'data', tone: 'warm', topic: 'steps',
    gate: d => { const t = d.f('steps.today'), w = d.f('steps.trailing'); return t != null && w != null && t > w; },
    text: () => 'Ahead on steps today.'
  }
]);

/* The one place a greeting is chosen. Deterministic: same log, same open
   count, same line.

   WHAT THE COUNTER WALKS has now been wrong in both directions, and the rule
   here is the line between them. The first version walked the data-aware lines
   alone whenever ANY of them passed a gate, which on the ordinary account is a
   pool of one — `n % 1` is always 0, so that card said the same five words for
   ever. The second walked the whole ordered pool instead. That cannot repeat,
   and it spent the thing the line is for: there are seven generics standing
   behind two or three data lines, so a consecutive counter spends most of its
   lap among them, and five opens in a row on a live account came up generic on
   a log where several data lines qualified.

   So the walk stays inside the data-aware lines when two or more of them pass,
   and opens out to the whole ordered pool — data first, generics after — only
   when fewer do. Two is the threshold because two is the smallest pool a
   counter can rotate without repeating; one is the collapse, and one data line
   is better read as an account with nothing much to say yet than as a line to
   say twice. */
function pickGreeting(d, finding) {
  const recent = d.f('coach.recentGreets') || [];
  const caution = finding && finding.tone === 'caution';
  const topic = finding ? finding.category : null;

  const ok = GREETINGS.filter(g => {
    if (caution && g.tone === 'warm') return false;
    if (topic && g.topic === topic) return false;
    if (!g.gate) return true;
    try { return !!g.gate(d); } catch { return false; }
  });

  const data = ok.filter(g => g.kind === 'data');
  const ordered = data.length >= 2 ? data : data.concat(ok.filter(g => g.kind !== 'data'));
  if (!ordered.length) return { id: 'g_look', text: 'Here’s where you stand.' };

  /* The counter walks the pool; the recent list only ever pushes it forward.
     Both are needed. The counter is what makes consecutive opens different;
     the recent list is what covers the case the counter cannot, which is a
     pool that changed size between two opens because a gate stopped passing —
     the counter's index means nothing across a pool it did not walk.

     The memory is read one line short of the pool, and that cap is doing the
     real work now. Three lines are remembered and the data-aware walk is often
     two or three wide, so without it every candidate is recent, the loop finds
     nowhere forward to step and falls back on the counter's own index — which
     is exactly the index that repeats when the pool changed underneath it.
     Driven against the log fixtures, that is a line repeating on consecutive
     opens 26 times in 4,704 crossings; capped, none. Capped, the argument is
     arithmetic rather than a sample: at most one short of the pool is ever
     blocked, so on any pool of two or more there is always a free candidate and
     the fall-through is unreachable, and the line just shown is always among
     the blocked. Nothing can follow itself. Two or more is every pool the table
     can produce — four generics carry no topic and no warm tone, which are the
     only two things either filter removes, so nothing can withhold them and the
     fall-through pool never drops below four. */
  const memory = recent.slice(0, Math.max(1, ordered.length - 1));
  const start = rotate(d.input.opens, ordered.length);
  let i = start;
  for (let step = 0; step < ordered.length; step++) {
    const cand = ordered[(start + step) % ordered.length];
    if (!memory.includes(cand.id)) { i = (start + step) % ordered.length; break; }
  }

  const g = ordered[i];
  let text = '';
  try { text = g.text(d); } catch { text = ''; }
  return { id: g.id, text: text || 'Here’s where you stand.' };
}

/* The rotation, and the whole of it: a per-device open counter modulo the pool
   size. Not Math.random() — this file is pure and the same input has to give
   the same sentence twice. Not the clock either, which is what it used to be:
   `Math.floor(Date.now() / 1000) % n` is a hash of the second somebody opened
   the app, and a hash repeats freely. A counter cannot. */
function rotate(counter, n) {
  if (!n) return 0;
  const c = Number.isFinite(counter) ? Math.floor(counter) : 0;
  return ((c % n) + n) % n;
}

/* ================================================================
   8.  THE SHEET'S TOPICS
   ================================================================
   One bubble per tab that has something to answer — Train, Fuel, Weight. Steps
   gets no bubble and still answers when it is reached as a follow-up off
   Weight, which is the shape the brief asks for and the reason the router is
   keyed on ids rather than on a menu.

   THE SET DEPENDS ON THE CARD THAT OPENED THE SHEET. Both cards used to offer
   the same three, which on Train meant the first thing under somebody's thumb
   on the way into a workout was "How's my food?". The sheet takes a surface
   now and the engine answers with a set that fits it. */
export const TOPICS = Object.freeze([
  { id: 'topic_train',  label: 'How’s my training?',  category: 'recency' },
  { id: 'topic_fuel',   label: 'How’s my food?',      category: 'fuel' },
  { id: 'topic_weight', label: 'Where’s my weight going?', category: 'weight' }
]);

/* The Patterns bubble. Not one of TOPICS, because TOPICS is also what the You
   card's lead question is drawn from, and a pattern is never volunteered — it
   is offered in the sheet, on the general set, only when the category is on
   and a check clears its gate (topicsFor). */
export const PATTERN_TOPIC = Object.freeze({ id: 'ask_patterns', label: 'Patterns', category: 'patterns' });

/* Train's set, and every id in it is one the router already answers, so
   nothing here can offer a bubble with no rule behind it. Training-first and in
   the order somebody standing in a gym would want them: what to train, a
   workout, what has waited longest, how the week is going.

   "What should I train today?" is first and "Make me a workout" second — the
   order Micah asked for after walking the builder (v46). The question is the
   one most people come in with, and its answer offers "Build it" straight
   away; "Make me a workout" asks what to train and builds from the choice.
   Like every other bubble here the builder is offered only when its route
   answers — a proposal really exists — so the chip that says it is never a
   chip that cannot do it.

   "What should I lift today?" is third (v48): the targets on that same
   workout. His decided order keeps the first two places. The label is his
   voice, beside "What should I train today?", and is not bound by the ban on
   Coach's own sentences. */
export const TRAIN_TOPICS = Object.freeze([
  { id: 'ask_shape',   label: 'What should I train today?', category: 'recency' },
  { id: 'ask_build',   label: 'Make me a workout',          category: 'build' },
  { id: 'ask_targets', label: 'What should I lift today?',  category: 'targets' },
  // v49: stage two's three, each offered only when it has an answer.
  { id: 'ask_record_day', label: 'Good day for a record?',  category: 'progression' },
  { id: 'ask_lighter', label: 'Should I go lighter?',       category: 'rest' },
  { id: 'ask_lifts',   label: 'How are my lifts moving?',   category: 'progression' },
  { id: 'ask_overdue', label: 'What’s waited longest?',     category: 'recency' },
  { id: 'ask_volume',  label: 'How’s my week going?',       category: 'volume' }
]);

// The router's whole map: a button id to the ordered intents it will try. The
// first one whose gate passes and whose condition fires is the answer.
const ROUTES = Object.freeze({
  topic_train:  ['same_group_overused', 'returning_from_layoff', 'train_today_recommendation',
                 'session_shape_most_overdue', 'group_overdue', 'stalled_lift',
                 'recent_pr', 'pr_proximity', 'group_under_weekly_normal', 'weekly_sessions_vs_trailing'],
  topic_fuel:   ['fuel_no_targets_set', 'fuel_calories_left_today',
                 'fuel_protein_vs_trailing', 'fuel_macro_share_vs_targets'],
  topic_weight: ['weight_rate_vs_goal', 'weight_no_recent_weighin'],
  topic_steps:  ['steps_today_vs_trailing'],

  ask_overdue:  ['group_overdue'],
  ask_shape:    ['session_shape_most_overdue', 'train_today_recommendation'],
  ask_build:    ['build_menu'],
  ask_build_now: ['build_workout'],
  ask_targets:  ['lift_targets'],
  ask_lifts:    ['lift_status'],
  ask_record_day: ['record_day'],
  ask_lighter:  ['lighter_week'],
  ask_stall:    ['stalled_lift', 'pr_proximity'],
  ask_records:  ['recent_pr', 'pr_proximity'],
  ask_volume:   ['group_under_weekly_normal', 'weekly_sessions_vs_trailing'],
  ask_rest:     ['same_group_overused'],
  ask_calories: ['fuel_calories_left_today'],
  ask_macros:   ['fuel_macro_share_vs_targets'],
  ask_protein:  ['fuel_protein_vs_trailing'],
  ask_rate:     ['weight_rate_vs_goal'],
  ask_weighin:  ['weight_no_recent_weighin'],
  ask_steps:    ['steps_today_vs_trailing'],
  ask_patterns: ['patterns_in_data'],
  injury:       ['coach_not_injuries']
});

// What Coach offers next after each answer. Two or three, generated from the
// answer rather than from a fixed menu, and filtered at render time to the ones
// that can actually answer — a follow-up that opens on "Coach can't tell yet"
// is worse than one fewer button.
const FOLLOWUPS = Object.freeze({
  topic_train:  ['ask_overdue', 'ask_volume', 'ask_stall'],
  topic_fuel:   ['ask_calories', 'ask_protein', 'ask_macros'],
  topic_weight: ['ask_rate', 'ask_weighin', 'ask_steps'],
  topic_steps:  ['ask_rate', 'ask_weighin'],
  ask_overdue:  ['ask_shape', 'ask_volume'],
  ask_shape:    ['ask_build_now', 'ask_targets', 'ask_overdue', 'ask_rest'],
  ask_stall:    ['ask_records', 'ask_volume'],
  ask_records:  ['ask_stall', 'ask_overdue'],
  ask_volume:   ['ask_overdue', 'ask_rest'],
  ask_rest:     ['ask_overdue', 'ask_volume'],
  ask_calories: ['ask_protein', 'ask_macros'],
  ask_macros:   ['ask_protein', 'ask_calories'],
  ask_protein:  ['ask_macros', 'ask_calories'],
  ask_rate:     ['ask_weighin', 'ask_steps'],
  ask_weighin:  ['ask_rate', 'ask_steps'],
  ask_steps:    ['ask_rate', 'ask_weighin'],
  // Nothing: the question's chips are the way on from "Make me a workout",
  // and the proposal carries its own four ways on from "Build it" — a row of
  // chips under either would be one too many.
  ask_build:    [],
  ask_build_now: [],
  // The workout the targets are on, one tap away.
  ask_targets:  ['ask_build_now'],
  ask_lifts:    ['ask_record_day', 'ask_targets', 'ask_lighter'],
  ask_record_day: ['ask_targets', 'ask_lifts'],
  ask_lighter:  ['ask_volume', 'ask_lifts'],
  // Nothing: the answer is already every pattern that clears its bar.
  ask_patterns: [],
  injury:       []
});

/* What an ANSWER offers next, over and above the button's own list — for the
   one finding whose next step is the same whichever button reached it. "If you
   train today, your chest and arms day has waited longest" is answered by
   "Build it" whether it came up under "How's my training?" or "What should I
   train today?". Filtered like every other follow-up: no proposal, no chip. */
const FOLLOWUPS_AFTER = Object.freeze({
  train_today_recommendation: ['ask_build_now']
});

/* A follow-up that stands for a topic: while "Build it" is offered, "Make me a
   workout" is not drawn beside it. They are two routes now — one asks what to
   train, the other already knows — but side by side they are two chips for
   one thing, and the sheet has never drawn that. */
const STANDS_FOR = Object.freeze({ ask_build_now: 'ask_build' });

/* Every id the router answers, exported so that a verifier can drive all of
   them and so that ship three's text matcher has one list to map a sentence
   onto rather than a second copy of this table. */
export const ROUTE_IDS = Object.freeze(Object.keys(ROUTES));

const ASK_LABELS = Object.freeze({
  ask_build:    'Make me a workout',
  ask_build_now: 'Build it',
  ask_targets:  'What should I lift today?',
  ask_lifts:    'How are my lifts moving?',
  ask_record_day: 'Good day for a record?',
  ask_lighter:  'Should I go lighter?',
  ask_overdue:  'What’s overdue?',
  ask_shape:    'Which session is due?',
  ask_stall:    'Anything stalled?',
  ask_records:  'Any records lately?',
  ask_volume:   'How are my sets?',
  ask_rest:     'Am I overdoing one?',
  ask_calories: 'Calories left today?',
  ask_macros:   'How’s my macro split?',
  ask_protein:  'How’s my protein?',
  ask_rate:     'How fast am I moving?',
  ask_weighin:  'When did I last weigh in?',
  ask_steps:    'How are my steps?',
  ask_patterns: 'Patterns',
  injury:       'Something hurts'
});

/* ================================================================
   9.  THE ENGINE
   ================================================================ */

// A resolved fact store: lazy, memoised, cycle-proof, and the only way anything
// in this file reads a fact.
function factStore(input) {
  const d = derive(input);
  const cache = new Map();
  const onStack = new Set();

  d.f = id => {
    if (cache.has(id)) return cache.get(id);
    const fact = FACT_BY_ID[id];
    if (!fact) return null;
    if (onStack.has(id)) return null;              // a cycle answers null rather than blowing the stack
    onStack.add(id);
    let v = null;
    try {
      // A fact whose requirement could not be computed cannot be computed
      // either. This is where silence propagates.
      const missing = (fact.requires || []).some(r => d.f(r) == null);
      v = missing ? null : fact.compute(d);
      if (v === undefined) v = null;
    } catch {
      v = null;
    }
    onStack.delete(id);
    cache.set(id, v);
    return v;
  };

  d.because = id => {
    const fact = FACT_BY_ID[id];
    const v = d.f(id);
    if (!fact || v == null || !fact.because) return null;
    try { const s = fact.because(v, d); return s ? String(s) : null; } catch { return null; }
  };

  d.age = id => {
    const fact = FACT_BY_ID[id];
    const v = d.f(id);
    if (!fact || v == null || !fact.age) return null;
    try { const n = fact.age(v, d); return Number.isFinite(n) ? n : null; } catch { return null; }
  };

  /* The workout builder, memoised per set of options. The same opts on the
     same log is the same proposal, and the sheet asks for it more than once —
     to decide whether to offer it, and then to draw it. */
  const built = new Map();
  let buildIn = null;
  d.build = opts => {
    const k = JSON.stringify(opts || {});
    if (!built.has(k)) {
      if (!buildIn) buildIn = builderInput(d);
      built.set(k, propose(buildIn, opts || {}));
    }
    return built.get(k);
  };
  d.buildLive = () => {
    if (!buildIn) buildIn = builderInput(d);
    return liveRefusal(buildIn);
  };
  d.swapTo = (opts, from, to) => {
    if (!buildIn) buildIn = builderInput(d);
    return swapTo(buildIn, opts, from, to);
  };
  let menu = null;
  d.buildMenu = () => {
    if (!buildIn) buildIn = builderInput(d);
    if (!menu) menu = buildMenu(buildIn);
    return menu;
  };

  /* THE OVERLAP (v49), memoised like the builder: one input per coach()
     call, and one reading per lift however many answers ask for it. */
  let overlapIn = null;
  const reads = new Map();
  d.overlap = () => {
    if (!overlapIn) overlapIn = overlapOf(d);
    return overlapIn;
  };
  d.readLift = exId => {
    if (!reads.has(exId)) {
      const i = d.overlap();
      const ex = i.lifts.find(l => l.exId === exId);
      reads.set(exId, ex ? readLift(ex, overlapCtx(i), i) : null);
    }
    return reads.get(exId);
  };
  let lighterV, recordV;
  d.lighterWeek = () => (lighterV !== undefined ? lighterV : (lighterV = lighterWeek(d.overlap(), d.now)));
  d.recordDay = () => (recordV !== undefined ? recordV : (recordV = recordDay(d.overlap(), d.now)));

  return d;
}

/* Everything coach-overlap.js is allowed to know, and — as with the builder —
   every piece of it is a fact or a derivation this file already owns: the
   shaped sessions (so "hard sets" is the shipped count), the lifts, the goal,
   the energy context, his stated direction and goal rate, and the weigh-ins
   the gatherer already hands over for Patterns. */
function overlapOf(d) {
  return prepare({
    now: d.now,
    u: d.input.u === 'kg' ? 'kg' : 'lb',
    aim: d.f('coach.aim'),
    exp: d.f('coach.experience'),
    energy: d.f('weight.energy'),
    rateWk: d.f('weight.rateWk'),
    goalDir: d.f('weight.goalDir'),
    goalRateWk: d.f('weight.goalRateWk'),
    targetsOn: !isMuted(d.input.settings, 'targets'),
    shaped: d.all(),
    weighIns: Array.isArray(d.input.weighIns) ? d.input.weighIns : [],
    lifts: d.lifts(),
    hidden: Array.isArray(d.input.hidden) ? d.input.hidden : []
  });
}
// prescribe()'s context, which readLift() takes beside the input.
const overlapCtx = i => ({ now: i.now, u: i.u, aim: i.aim, exp: i.exp, energy: i.energy, rateWk: i.rateWk });

/* Exported for tools-check/coach-overlap.mjs, so its battery drives
   coach-overlap.js with exactly what this file hands it — the shaped sessions
   above all — rather than a second copy of shapeSession(). Pure. */
export function overlapInput(input) {
  try {
    return factStore(input || {}).overlap();
  } catch {
    return null;
  }
}

/* Everything the builder is allowed to know, and every piece of it is a fact
   or a gate this file already owns. The builder derives nothing about the log
   itself: the shapes, the window, the gate and the layoff are read here and
   handed over, so that each of them has exactly one definition.

   Two of them are INTENTS' own functions, called rather than copied. `ready`
   is train_today_recommendation's min-data gate, because the brief's rule is
   "the same gate", and a restated gate is a gate that stops being the same the
   first time one of them is tuned. `layoffDays` is set exactly when
   returning_from_layoff would fire.

   And v48's three, which the builder hands straight to coach-prog.js: the
   goal (his two answers), the energy context with the rate it was read from
   (the sentence that quotes it needs the number), and whether targets are on
   at all — off, every row's target is null and there is no targets view. */
function builderInput(d) {
  const back = INTENT_BY_ID.returning_from_layoff;
  return {
    now: d.now,
    u: d.input.u === 'kg' ? 'kg' : 'lb',
    live: d.f('live.active') === true,
    ready: gate(INTENT_BY_ID.train_today_recommendation, d),
    overdue: d.f('session.shapeOverdue'),
    overdueWhy: d.because('session.shapeOverdue'),
    shapes: d.f('session.shapes') || [],
    sessions: d.inWindow(),
    log: d.all(),
    groupDays: d.groupDays(),
    layoffDays: gate(back, d) && fires(back, d) ? d.f('session.lastDaysAgo') : null,
    lib: d.lib,
    hidden: Array.isArray(d.input.hidden) ? d.input.hidden : [],
    libReady: d.input.libReady === true,
    goal: { aim: d.f('coach.aim'), exp: d.f('coach.experience') },
    energy: { context: d.f('weight.energy'), rateWk: d.f('weight.rateWk') },
    targetsOn: !isMuted(d.input.settings, 'targets')
  };
}

/* Everything the in-session read is allowed to know about the log, and — as
   with the builder — every piece of it is something this file already owns:
   the twelve-week window and the recurring shapes, each defined once, here.
   The session itself is the LIVE one the workout screen holds, handed in by
   the caller; it is read and never written. `current` is the index of the
   exercise in hand, when the caller knows it. */
function liveInput(d, session, current) {
  return {
    now: d.now,
    u: d.input.u === 'kg' ? 'kg' : 'lb',
    session,
    current: Number.isInteger(current) ? current : null,
    sessions: d.inWindow(),
    shapes: d.f('session.shapes') || [],
    lib: d.lib,
    hidden: Array.isArray(d.input.hidden) ? d.input.hidden : []
  };
}

function toneOf(intent, d) {
  if (typeof intent.tone === 'function') {
    try { return intent.tone(d); } catch { return 'neutral'; }
  }
  return intent.tone || 'neutral';
}

function gate(intent, d) {
  try { return !!intent.minData(d); } catch { return false; }
}
function fires(intent, d) {
  try { return !!intent.when(d); } catch { return false; }
}

// Everything a rendered sentence needs, in one place. `text` never throws: a
// template that cannot build its sentence yields nothing rather than a card
// with the word undefined on it.
function renderIntent(intent, d, u) {
  const r = RESPONSES[intent.response];
  if (!r) return null;
  let text = '';
  try { text = String(r.text(d, u) || ''); } catch { return null; }
  if (!text) return null;

  let reason = '';
  if (r.reason) {
    try { reason = String(r.reason(d, u) || ''); } catch { reason = ''; }
  }
  /* The composed reason is ONE clause, from the first fact the intent quoted
     that could be computed. Two read as a stutter far more often than they read
     as evidence — the second fact is usually the denominator the sentence above
     has already named — so an intent that genuinely wants two writes its own
     `reason` and says exactly which two. The order of factsNeeded is therefore
     load-bearing: the first entry is the one that becomes the reason line. */
  if (!reason) {
    const first = (intent.factsNeeded || []).map(id => d.because(id)).find(Boolean);
    reason = first ? first.replace(/^./, c => c.toUpperCase()) + '.' : '';
  }

  // A response may say more than one thing — Patterns says every check that
  // clears — and the rest ride along to follow the first in the thread.
  let more = [];
  if (r.more) {
    try { more = (r.more(d, u) || []).filter(m => m && m.text); } catch { more = []; }
  }

  const ages = (intent.factsNeeded || []).map(id => d.age(id)).filter(n => n != null);
  return {
    id: intent.id,
    kind: intent.kind,
    category: intent.category,
    tier: intent.tier,
    tone: toneOf(intent, d),
    band: intent.priorityBand,
    severity: intent.severity,
    evidenceRecencyDays: ages.length ? Math.min(...ages) : 999,
    text, reason,
    ...(more.length ? { more } : null)
  };
}

/* THE RANKING RULE (§6), in one function, with every key total.

   Step 0  the three blocking states, mutually exclusive, evaluated before
           anything else. Nothing but these may occupy band 1.
   Step 1  candidates are findings and findings only. Guards never render here;
           they suppress. Muted categories go, the wrong tier goes and is
           counted, a failed min-data gate goes, and anything a survivor
           supersedes goes.
   Step 2  sort on five keys, the last of which is a unique id, so a tie is
           impossible and two devices agree.
   Step 3  the head fills the slot. */
function rank(d, u) {
  const pro = d.f('meta.tierPro') === true;

  // --- step 0 ---
  const blocking = ['guard_log_unreadable', 'card_first_run', 'card_live_session'];
  for (const id of blocking) {
    const it = INTENT_BY_ID[id];
    if (fires(it, d)) return { blocked: renderIntent(it, d, u), candidates: [], lockedCount: 0 };
  }

  // --- step 1 ---
  const firing = INTENTS.filter(i => (i.kind === 'finding' || i.kind === 'guard') && gate(i, d) && fires(i, d));

  // Everything any firing intent supersedes, guards included: a guard's whole
  // job is to take something else off the board.
  const beaten = new Set();
  firing.forEach(i => (i.supersedes || []).forEach(x => beaten.add(x)));

  let lockedCount = 0;
  const candidates = [];
  firing.forEach(i => {
    if (i.kind !== 'finding') return;
    if (beaten.has(i.id)) return;
    // isMuted, not the mute map: an opt-in category is off until switched on.
    if (isMuted(d.input.settings, i.category)) return;
    if (i.tier === 'pro' && !pro) { lockedCount++; return; }
    const v = renderIntent(i, d, u);
    if (v) candidates.push(v);
  });

  // --- step 2 ---
  candidates.sort((a, b) =>
    a.band - b.band ||
    b.severity - a.severity ||
    a.evidenceRecencyDays - b.evidenceRecencyDays ||
    categoryIndex(a.category) - categoryIndex(b.category) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return { blocked: null, candidates, lockedCount };
}

/* Which topics the lead question may draw on: only the ones that have data
   behind them. A card that invites somebody to ask about their weight when
   nothing has ever been weighed is a card that lies about what it can do. */
function liveTopics(d) {
  const out = [];
  if (d.all().length) out.push('topic_train');
  if (d.f('fuel.calToday') != null || d.f('fuel.loggedDays') > 0) out.push('topic_fuel');
  if (d.f('weight.daysSinceWeighIn') != null) out.push('topic_weight');
  return out;
}

/* The same question the follow-up filter asks, because it is the same
   question: is there a rule behind this button that would actually fire. The
   three tab-level topics are gated on whether the DOMAIN has any data — they
   are broad and always have a fallback sentence — but a promoted ask_* id is
   narrow, so it is offered only when its own route answers. */
function answerable(d, routeId) {
  const route = ROUTES[routeId] || [];
  return route.some(intentId => {
    const it = INTENT_BY_ID[intentId];
    return it && gate(it, d) && fires(it, d);
  });
}

/* The surface's own set. Train gets the training-first promotions and falls
   back to the general three when none of them has an answer today — a sheet
   with no way to ask anything is a worse answer than a broader question. */
function topicsFor(d, surface) {
  const general = TOPICS.filter(t => liveTopics(d).includes(t.id));
  if (surface !== 'train') return answerable(d, PATTERN_TOPIC.id) ? general.concat(PATTERN_TOPIC) : general;
  const mine = TRAIN_TOPICS.filter(t => answerable(d, t.id));
  return mine.length ? mine : general;
}

function leadQuestion(d, finding) {
  const live = liveTopics(d);
  if (!live.length) return null;
  const topics = TOPICS.filter(t => live.includes(t.id));
  if (!topics.length) return null;
  // Offer something the card is not already showing.
  const other = finding ? topics.filter(t => t.category !== finding.category) : topics;
  const pool = other.length ? other : topics;
  return pool[rotate(d.input.opens, pool.length)];
}

/* Coach's own question, if it may ask one at all. Three gates, and all three
   have to pass: the category is not muted, there is no unanswered question
   already waiting, and the answer would change what a registered rule does. */
function pendingQuestion(d) {
  const muted = (d.input.settings && d.input.settings.mute) || {};
  if (muted.questions === true) return null;
  if (d.f('coach.openQuestion')) return null;
  const answers = (d.input.settings && d.input.settings.answers) || {};
  for (const q of QUESTIONS) {
    // Asked somewhere else — under the answer it refines — and never here.
    if (q.where) continue;
    if (answers[q.id] != null) continue;
    let ok = false;
    try { ok = !!q.when(d); } catch { ok = false; }
    if (ok) return q;
  }
  return null;
}

/* The question asked UNDER an answer rather than as the sheet's opener: the
   first unanswered one whose `where` is that answer's, under the same three
   gates as the opener — questions not switched off, nothing already waiting
   (the shipped week's cooldown, which is what makes them one at a time), and
   an answer that would change something. Never a gate on the answer itself:
   the targets are there either way. */
function questionUnder(d, where) {
  if (isMuted(d.input.settings, 'questions')) return null;
  if (d.f('coach.openQuestion')) return null;
  const answers = (d.input.settings && d.input.settings.answers) || {};
  for (const q of QUESTIONS) {
    if (q.where !== where || answers[q.id] != null) continue;
    let ok = false;
    try { ok = !!q.when(d); } catch { ok = false; }
    if (ok) return q;
  }
  return null;
}

// What the sheet is handed of a question: its words, its chips, and what it
// says once answered.
const questionView = q => (q ? { id: q.id, text: q.text, options: q.options, ack: q.ack || null } : null);

/* ---------- the public face ----------

   One evaluation, three views. The You card claims the top finding first and
   the Train card takes the best TRAINING finding that is left, so a finding
   cannot appear twice in one paint — and because both come out of the same
   deterministic ranking, the two tabs agree with each other whichever order
   somebody opens them in. */
export function coach(input) {
  const u = input && input.u === 'kg' ? 'kg' : 'lb';
  const d = factStore(input || {});
  const { blocked, candidates, lockedCount } = rank(d, u);
  d.lockedCount = lockedCount;

  const pro = d.f('meta.tierPro') === true;

  function view(surface, claimed) {
    if (blocked) {
      return INTENT_BY_ID[blocked.id].surfaces.includes(surface)
        ? { ...blocked, state: blocked.id }
        : { ...blocked, state: blocked.id };
    }
    const mine = candidates.filter(c =>
      INTENT_BY_ID[c.id].surfaces.includes(surface) && !claimed.includes(c.id));
    if (mine.length) return { ...mine[0], state: 'finding' };

    // Nothing to say. Which silence it is depends on why.
    if (!pro && lockedCount > 0) {
      const it = INTENT_BY_ID.card_state_locked;
      return { ...renderIntent(it, d, u), state: it.id };
    }
    const thin = d.f('session.count') < 3 || d.f('session.windowCount') < 3;
    const it = INTENT_BY_ID[thin ? 'card_state_thin' : 'card_state_clear'];
    return { ...renderIntent(it, d, u), state: it.id };
  }

  const you = view('you', []);
  const train = view('train', you.state === 'finding' ? [you.id] : []);
  /* An answer that would say, word for word, what the sheet's opening bubble
     already says is marked `repeats`. The sheet opens on the You card's
     finding, and on Train "What should I train today?" is often answered by
     that same finding — so it printed the same sentence twice, one above the
     other. Marked here, decided here; the sheet shows the answer's follow-ups
     under the opening bubble instead of printing it again. */
  const withRepeat = a => (a && a.text && you && a.text === you.text ? { ...a, repeats: true } : a);
  const greet = pickGreeting(d, you.state === 'finding' ? you : null);
  const lead = leadQuestion(d, you.state === 'finding' ? you : null);
  const question = pendingQuestion(d);

  return {
    u,
    you, train, greet, lead,
    pro, lockedCount,
    /* The sheet asks for the set belonging to the card that opened it. It is a
       function rather than an array because the two surfaces draw the same
       component and the card is the only thing that knows which one it is. */
    topicsFor: surface => topicsFor(d, surface === 'train' ? 'train' : 'you'),
    question: questionView(question),
    // The opening bubble: the same finding the You card is showing, so the
    // sheet does not contradict the card that opened it.
    opening: you,
    /* An unreadable log silences the ROUTER as well as the card, and the reach
       of that is deliberate: it takes the fuel and weight readouts down with it.
       They are not wrong in themselves — those nodes read fine — but when
       readExact('workouts') rejects, the device is offline or has lost access,
       and everything else coach-data.js gathered came back through read(),
       which answers from a possibly stale mirror. Quoting a calorie total off a
       mirror while saying in the same sheet that the log cannot be read is a
       mixture of confidences, and one of them is wrong. Silence is always an
       available answer. */
    ask: id => withRepeat(d.f('log.confidence') === 'unknown'
      ? { ...renderIntent(INTENT_BY_ID.guard_log_unreadable, d, u), followups: [] }
      : ask(d, u, id)),
    /* The workout builder, behind the same silence. `build(opts)` is a
       proposal or null — coach-build.js decides, this only refuses on an
       unreadable log, for the same reason the router does. `buildLive()` is
       the one line the sheet shows instead while a session is running, and
       only when there would otherwise have been a proposal — and not at all
       when the account has switched the builder off, since it is the
       builder's line. Both are functions so that a card paint, which asks for
       neither, pays for neither. */
    build: opts => (d.f('log.confidence') === 'unknown' ? null : d.build(opts)),
    buildLive: () => (d.f('log.confidence') === 'unknown' || isMuted(d.input.settings, 'build')
      ? null : d.buildLive()),
    /* The chips under "What do you want to train?" — decided in coach-build.js,
       drawn by the sheet. Empty behind the same silences as build(). */
    buildMenu: () => (d.f('log.confidence') === 'unknown' || isMuted(d.input.settings, 'build')
      ? [] : d.buildMenu()),
    /* "Something else…" under Swap one: the exercise he picked, as the next
       opts, or the reason it cannot stand in (coach-build.js swapTo). */
    swapTo: (opts, from, to) => (d.f('log.confidence') === 'unknown'
      ? { opts: null, why: null } : d.swapTo(opts, from, to)),
    /* THE IN-SESSION READ (ship three): one answer of four kinds, or null —
       coach-live.js decides which. Four gates in front of it, and all four
       are the engine's rather than the screen's, so a caller cannot draw one
       by forgetting to check: a log that has really been read (an unreadable
       one silences everything, and an empty one has no habits to read); Pro,
       because a basic account sees nothing new mid-session, not even a lock;
       the "In the gym" switch; and a LIVE session — an edit of a past one is
       not a workout in progress, and nothing is said over it. */
    live: (session, opts) => (d.f('log.confidence') !== 'readable' || !pro ||
      isMuted(d.input.settings, 'live') ||
      !session || typeof session !== 'object' || session._edit
      ? null : liveRead(liveInput(d, session, opts && opts.current)))
  };
}

/* THE ROUTER. A button id in, an answer out. The whole of ship three's text box
   lands in front of this function and nothing behind it changes: match a
   sentence to an id, call this, render what comes back. */
function ask(d, u, id) {
  const route = ROUTES[id];
  if (!route) {
    return {
      id, text: 'Coach can’t answer that one.',
      reason: 'It only reads your training, food, weight and steps — and only what it can back with a number.',
      followups: followupsFor(d, u, 'topic_train')
    };
  }
  for (const intentId of route) {
    const it = INTENT_BY_ID[intentId];
    if (!it) continue;
    if (!gate(it, d)) continue;
    if (!fires(it, d)) continue;
    const v = renderIntent(it, d, u);
    // The targets answer carries the goal question it refines — this route only.
    if (v) {
      return { ...v, followups: followupsFor(d, u, id, v.id),
               ...(v.id === 'lift_targets' ? { question: questionView(questionUnder(d, 'targets')) } : null) };
    }
  }
  return {
    id,
    text: nothingFor(id),
    reason: 'A rule with thin data stays quiet rather than guessing. It starts once there is enough logged to compare.',
    followups: followupsFor(d, u, id)
  };
}

function nothingFor(id) {
  if (id.startsWith('topic_fuel') || id.startsWith('ask_cal') || id.startsWith('ask_macro') || id.startsWith('ask_prot')) {
    return 'Nothing to say about your food yet.';
  }
  if (id.startsWith('topic_weight') || id.startsWith('ask_rate') || id.startsWith('ask_weighin')) {
    return 'Nothing to say about your weight yet.';
  }
  if (id.startsWith('ask_steps')) return 'Nothing to say about your steps yet.';
  if (id === 'ask_patterns') return 'Nothing to say about patterns in your data yet.';
  return 'Nothing to say about your training yet.';
}

// Only offer a follow-up that has an answer behind it. The answer's own
// follow-ups come first, then the button's, each id once.
function followupsFor(d, u, id, answeredBy) {
  const list = [...new Set((FOLLOWUPS_AFTER[answeredBy] || []).concat(FOLLOWUPS[id] || []))];
  return list.filter(next => answerable(d, next))
             .map(next => ({ id: next, label: ASK_LABELS[next] || next,
                             ...(STANDS_FOR[next] ? { stands: STANDS_FOR[next] } : null) }));
}

/* ---------- what settings/coach looks like ----------
   Exported so coach-data.js and the Settings section agree on the shape without
   either of them holding a second copy of it. A small object, written whole,
   never PUT from stale module state. */
export const COACH_SETTINGS_VERSION = 1;

export function normSettings(v) {
  const o = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const mute = {};
  const rawMute = o.mute && typeof o.mute === 'object' ? o.mute : {};
  CATEGORIES.forEach(c => { if (c.mutable && !c.optIn && rawMute[c.id] === true) mute[c.id] = true; });
  /* `on` is `mute` turned over, for the categories that are OFF by default —
     Patterns, and only Patterns. ABSENT MEANS OFF here, the reverse of every
     other category: a fresh account has every switch on without a byte
     written, except this one, which is off without a byte written. Only `true`
     survives, and only for a category the table declares optIn. */
  const on = {};
  const rawOn = o.on && typeof o.on === 'object' ? o.on : {};
  CATEGORIES.forEach(c => { if (c.optIn && rawOn[c.id] === true) on[c.id] = true; });
  const answers = {};
  const rawA = o.answers && typeof o.answers === 'object' ? o.answers : {};
  QUESTIONS.forEach(q => {
    const v2 = rawA[q.id];
    if (q.options.some(op => op.value === v2)) answers[q.id] = v2;
  });
  const asked = {};
  const rawAsk = o.asked && typeof o.asked === 'object' ? o.asked : {};
  QUESTIONS.forEach(q => { if (Number.isFinite(rawAsk[q.id])) asked[q.id] = rawAsk[q.id]; });
  /* No `lastGreet`. It used to live here and it was the wrong node for it: the
     write fires as the app opens and the app is routinely closed a second or
     two later, so the one usage pattern that needed the value remembered was
     the one that lost it. It is device storage now — see coach-data.js — and a
     stored key left over from v42 is simply dropped on the way through here. */
  return {
    v: COACH_SETTINGS_VERSION,
    mute, on, answers, asked
  };
}

// Off, whichever way round the category's switch is stored.
export function isMuted(settings, categoryId) {
  const c = CATEGORIES.find(x => x.id === categoryId);
  if (!c || !c.mutable) return false;
  if (c.optIn) return !(settings && settings.on && settings.on[categoryId] === true);
  return !!(settings && settings.mute && settings.mute[categoryId] === true);
}

/* Which days' food logs the first pattern needs: the days of the sessions it
   would count, where that day's summary says food was logged. Exported for
   coach-data.js, so the gatherer reads what the pure layer asks for and
   nothing more — and nothing at all while Patterns is off. */
export function patternFoodDays(input) {
  try {
    const d = factStore(input || {});
    if (isMuted(d.input.settings, 'patterns')) return [];
    const L = d.pLift();
    const sums = d.input.summaries || {};
    return L ? [...new Set(L.rows.map(r => r.date))].filter(k => sums[k] && sums[k].cal > 0).sort() : [];
  } catch {
    return [];
  }
}
