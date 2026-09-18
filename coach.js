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
// Imports units.js, exercises.js and the pure half of analytics.js. Nothing
// imports back.

import { GROUPS, GROUP_ORDER } from './exercises.js';
import { e1rm, isWorking, mergeSessionExercises, exerciseIndex } from './analytics.js';
import { labelW, labelRate, unitW, fmtW } from './units.js';

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
   converts. See §5.1 of the brief: insights.js `rateVerdict` returns 'good' for
   any rate in the goal's direction, unbounded, and Coach must not inherit that.
   Nothing in a Coach sentence ever names this number. */
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
  { id: 'progression', label: 'Stalls and records',  mutable: true,  note: 'Where your best estimated maxes sit, and records as they land.' },
  { id: 'fuel',        label: 'Food',                mutable: true,  note: 'Calories and macros against your own targets.' },
  { id: 'weight',      label: 'Weight',              mutable: true,  note: 'Rate of change, and days since a weigh-in.' },
  { id: 'steps',       label: 'Steps',               mutable: true,  note: 'Today against your own trailing average.' },
  { id: 'questions',   label: 'Questions',           mutable: true,  note: 'Whether Coach may ask you anything at all.' }
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
    const sig = new Set();  // the signature: groups with >= 2 working sets, cardio out
    rows.forEach(ex => {
      const g = groupOf(ex);
      if (!g || !GROUPS[g]) return;
      const n = (ex.sets || []).filter(isWorking).length;
      if (!n) return;
      sets[g] = (sets[g] || 0) + n;
      if (n >= 2 && equipOf(ex) !== 'cardio') sig.add(g);
    });
    return {
      startedAt: s.startedAt,
      date: s._date || dayKey(s.startedAt),
      daysAgo: daysBetween(s.startedAt, now),
      sets,
      groups: Object.keys(sets),
      signature: GROUP_ORDER.filter(g => sig.has(g))
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
        name: shapeName(c.groups, input.routines, lib)
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

  return {
    now, lib, input,
    all, inWindow, shapes, groupDays, groupGap,
    setsThisWeek, setsTrailing, sessionsIn, sessionGap, index,
    groupOf, equipOf
  };
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
   what this person already calls this session, so it wins. */
function shapeName(groups, routines, lib) {
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
    if ([...gs].sort().join('+') === want) return String(r.name);
  }
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
       day. */
    id: 'fuel.loggedDays', unit: 'count', requires: [],
    compute: d => {
      const sums = d.input.summaries || {};
      return keysBack(d.now - DAY, 7).filter(k => sums[k] && sums[k].cal > 0).length;
    },
    because: v => 'from the ' + plural(v, 'day') + ' you logged food in the last complete week',
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
    because: (v, d) => 'across ' + plural(d.f('fuel.loggedDays'), 'logged day') + ' in the last complete week',
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
    because: (v, d) => 'averaged over ' + plural(d.f('fuel.loggedDays'), 'logged day') + ' in the last complete week',
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
  }
]);

const FACT_BY_ID = Object.freeze(Object.fromEntries(FACTS.map(f => [f.id, f])));

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
   means to go. */
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
    // Only worth asking when the answer would really unlock something: there is
    // a rate to read and no direction to read it against.
    when: d => d.f('weight.rateWk') != null && d.f('weight.goalDir') == null
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
    factsNeeded: ['lift.stalled'], supersedes: ['pr_proximity'],
    minData: d => d.f('session.windowCount') >= 4,
    when: d => d.f('lift.stalled') != null,
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
   the Settings switches use. */
export const PRO_ADDS = Object.freeze(
  CATEGORIES
    .filter(c => INTENTS.some(i => i.kind === 'finding' && i.tier === 'pro' && i.category === c.id))
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
  /* The sentence this ship rewrote. It shipped as "X hasn't moved: your best
     estimated max there is still N" — which characterises the lifter rather
     than the log, and did it unprompted on the screen the app opens to. Both
     halves are fixed: the surface is the sheet (see stalled_lift) and the
     sentence is a figure and a date.

     The direction branch is the third half of the same defect. A flat
     estimated max on an account whose stated goal is DOWN is not a stall, it
     is a lift held through a deficit, and Coach reading it the other way is a
     wrong number about the most sensitive thing it looks at. `weight.goalDir`
     is the account's own stated direction and nothing else (§FACTS); when
     there is no direction to read against, the plain figure stands on its own. */
  resp_stalled: {
    text: (d, u) => {
      const v = d.f('lift.stalled');
      const when = v.matchedDaysAgo == null ? null
        : v.matchedDaysAgo === 0 ? 'today'
        : v.matchedDaysAgo === 1 ? 'yesterday'
        : plural(v.matchedDaysAgo, 'day') + ' ago';
      const head = 'Your best estimated max on ' + v.name + ' is ' + labelW(v.best, u) +
                   (when ? ', last matched ' + when : '') + '.';
      // The direction is the account's stated goal; the rate is what actually
      // happened. Both, or neither — a goal nobody has moved toward is not a
      // thing to mention, and a rate with no stated direction is not Coach's
      // to characterise.
      const down = d.f('weight.goalDir') === -1 && d.f('weight.rateWk') != null && d.f('weight.rateWk') < 0;
      return down ? head + ' Your body weight has been coming down over that stretch.' : head;
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
      return name + ' is ' + Math.round(got) + '% of your calories this week, against the ' +
             Math.round(aim) + '% your targets work out to.';
    }
  },
  resp_protein: {
    text: d => {
      const got = d.f('fuel.proteinTrailing'), want = d.f('fuel.proteinTarget');
      return 'Protein averaged ' + int(got) + ' g a day last week, against your ' + int(want) + ' g target.';
    }
  },

  resp_weight_rate: {
    /* The magnitude guard, in the one place it matters. insights.js's
       rateVerdict calls any rate in the goal's direction 'good', unbounded, and
       LIMITS.rateWk allows five a week — so an account dropping weight very
       fast currently gets a green number and an approving sentence. Coach
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

  resp_greet:    { text: () => '' },
  resp_lead:     { text: () => '' },
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
    id: 'g_in_a_row', kind: 'data', tone: 'warm', topic: 'volume',
    gate: d => d.f('session.last7') >= 3,
    text: d => d.f('session.last7') + ' sessions this week.'
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

/* Train's set, and every id in it is one the router already answers — these are
   promotions, not new routes, so nothing here can offer a bubble with no rule
   behind it. Training-first and in the order somebody standing in a gym would
   want them: what to train, what has waited longest, how the week is going.

   There is deliberately no "make me a workout". That is the builder, it is the
   next ship, and a chip that says it and cannot do it is worse than no chip. */
export const TRAIN_TOPICS = Object.freeze([
  { id: 'ask_shape',   label: 'What should I train today?', category: 'recency' },
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
  ask_shape:    ['ask_overdue', 'ask_rest'],
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
  injury:       []
});

/* Every id the router answers, exported so that a verifier can drive all of
   them and so that ship three's text matcher has one list to map a sentence
   onto rather than a second copy of this table. */
export const ROUTE_IDS = Object.freeze(Object.keys(ROUTES));

const ASK_LABELS = Object.freeze({
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

  return d;
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
    text, reason
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
  const muted = (d.input.settings && d.input.settings.mute) || {};
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
    const cat = CATEGORIES.find(c => c.id === i.category);
    if (cat && cat.mutable && muted[i.category] === true) return;
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
  if (surface !== 'train') return general;
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
    if (answers[q.id] != null) continue;
    let ok = false;
    try { ok = !!q.when(d); } catch { ok = false; }
    if (ok) return q;
  }
  return null;
}

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
    question: question ? { id: question.id, text: question.text, options: question.options } : null,
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
    ask: id => (d.f('log.confidence') === 'unknown'
      ? { ...renderIntent(INTENT_BY_ID.guard_log_unreadable, d, u), followups: [] }
      : ask(d, u, id))
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
    if (v) return { ...v, followups: followupsFor(d, u, id) };
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
  return 'Nothing to say about your training yet.';
}

// Only offer a follow-up that has an answer behind it.
function followupsFor(d, u, id) {
  const list = FOLLOWUPS[id] || [];
  return list.filter(next => answerable(d, next))
             .map(next => ({ id: next, label: ASK_LABELS[next] || next }));
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
  CATEGORIES.forEach(c => { if (c.mutable && rawMute[c.id] === true) mute[c.id] = true; });
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
    mute, answers, asked
  };
}

export function isMuted(settings, categoryId) {
  const c = CATEGORIES.find(x => x.id === categoryId);
  if (!c || !c.mutable) return false;
  return !!(settings && settings.mute && settings.mute[categoryId] === true);
}
