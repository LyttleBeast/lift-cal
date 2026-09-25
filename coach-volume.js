// Coach's weekly volume and balance — stage five, the whole week (v54).
//
// Spec §6 (COACH-TRAINER-SPEC.md §6.1–§6.5), built as written wherever the
// code let it be, and said where it did not: how many hard sets each muscle
// group got this week against a common range for his goal and against his own
// normal, which group has gone quiet, and whether his pushing and pulling, his
// presses and his pulls, his knees and his hips, are lopsided. Two answers in
// the sheet — "How's my weekly volume?" and "Is my training balanced?" — and
// nowhere else: never the card, never the live sheet.
//
// A WRONG NUMBER IS WORSE THAN NO NUMBER. Under three weeks of log each answer
// says so and guesses nothing. A group's normal needs four weeks with sessions
// behind it before anything is compared with it. And the four flags are the
// spec's, each needing more than one thing to be true:
//
//   too little       under the goal's range AND under 70% of his own normal,
//                    two weeks running — or, on the group he named his focus,
//                    under its range four weeks running. Someone who has
//                    always done six sets of arms and is happy is not "behind"
//   about right      inside the range, or within 30% of his own normal
//   more than usual  1.3× his normal or more AND a fatigue sign in the log
//                    this week (sets taken to failure at twice his share, or
//                    reps down a quarter on two of the group's lifts). Volume
//                    alone is never "too much"
//   core             readouts only, never a flag: plenty of people never train
//                    it directly, and the evidence for a core range is thin
//
// COUNTS ONLY, NEVER A REASON ABOUT THE BODY (Micah's decision 12). No "for
// shoulder health", no posture, no injury, in any sentence this file can
// build: the balance readout is two numbers and the split between them, and
// only a lopsided split is worth saying at all. tools-check/coach-volume.mjs
// scans every sentence for it, in both units.
//
// HOW A SET IS COUNTED (§6.1). A hard set is a working set (analytics.js
// isWorking) with reps, of an exercise that is not cardio, less the warm-up in
// disguise: a set typed N at half the session's top load or less, before the
// first top set, with no more reps than the top set's plus two — all three
// together, so a light high-rep working set still counts. The primary group
// counts it whole; each secondary group (exercises.js's fourth field) half. A
// custom exercise has no secondaries and no movement tag: primary only, and
// out of the balance split, which says so. The shipped
// `group_under_weekly_normal` (coach.js) keeps its own primary-only count;
// nothing here moves it.
//
// v56, THE WEEK READ RIGHT. Get stronger's and Powerlifting's 6–15 is for the
// groups carrying the main lifts (coach-goal.js MAIN_LIFTS, through
// exercises.js: chest, back and legs); every other group gets 10–20, and the
// line says which. And a group skipped for its customs is left out of push
// against pull — its sets, not the whole split — which says so; the two
// direction splits and knees against hips are skipped whole, as before.
//
// PURE, and copied into the native tree verbatim (src/pure/coach-volume.js).
// No reads, no DOM, no module state; the clock is `now`. Imports exercises.js
// (groups, secondaries), analytics.js's session math, coach-tags.js (movement
// patterns and angles) and coach-goal.js (the floor each aim sets, and the
// main lifts). coach.js imports this; nothing imports back.

import { GROUPS, GROUP_ORDER, EXERCISE_BY_ID } from './exercises.js';
import { isWorking, mergeSessionExercises } from './analytics.js';
import { tagsFor } from './coach-tags.js';
import { AIMS, volumeFloor, MAIN_LIFTS, MAIN_LIFT_AIMS, mainLiftGroups } from './coach-goal.js';

const DAY = 864e5;

/* ---------- the numbers, each with its reason ---------- */
// Three weeks of log before either answer says anything about it.
export const MIN_LOG_DAYS = 21;
// His normal: the median week of the eight before this one, weeks with no
// session at all left out (a week off is not a light week of training), and
// four such weeks at least.
export const NORMAL_WEEKS = 8;
export const NORMAL_MIN_WEEKS = 4;
// Under four hard sets a week is under the smallest doses the research
// measured (§6.2). Fixed: it does not move with the goal.
export const VERY_LOW = 4;
// A set counts half for each group it works second (Pelland 2024's
// fractional counting, §6.1).
export const SECONDARY = 0.5;
// The warm-up in disguise: half the top load or less, and the top set's reps
// plus two at most.
export const DISGUISE_SHARE = 0.5;
export const DISGUISE_REPS = 2;
// Too little: under 70% of his normal. About right: within 30% of it. More
// than usual: 1.3× it or more. The focus group's range goes up by 30%.
export const LITTLE_SHARE = 0.7;
export const USUAL_WITHIN = 0.3;
export const MORE_SHARE = 1.3;
export const FOCUS_RAISE = 1.3;
export const FOCUS_WEEKS = 4;
// The fatigue signs (§6.4) this file can read off a week of sets: failures at
// twice his own eight-week share and three at least; reps down a quarter on
// two of the group's lifts. REP_DROP itself is coach-live.js's, handed in.
export const F_SHARE = 2;
export const F_MIN = 3;
export const DROP_LIFTS = 2;
// Neglect (§6.3): under 30% of the middle of his other groups over four
// weeks, or nothing at all in eight. Said once in four weeks, and only here.
export const NEGLECT_SHARE = 0.3;
export const NEGLECT_WEEKS = 4;
export const NEGLECT_ZERO_WEEKS = 8;
export const NEGLECT_EVERY_DAYS = 28;
// Balance (§6.5), over eight weeks: push and pull past two to one, knees and
// hips past three to one, a pressing or pulling direction at zero. And a
// split with fewer than eight sets in it — one a week — says nothing: that is
// a coincidence, not a split.
export const BALANCE_WEEKS = 8;
export const PUSH_PULL = 2;
export const KNEE_HIP = 3;
export const BALANCE_MIN = 8;
// Customs over a quarter of a group's sets: its ratios are skipped.
export const CUSTOM_SHARE = 0.25;

/* THE TOP OF EACH AIM'S RANGE (§6.2, §8.2): building muscle and the middle
   road 10–20, strength 6–15, staying consistent 6–12, a cut no top at all
   (it keeps what he has: two thirds of his usual before the cut, and more is
   fine). The floors are coach-goal.js volumeFloor()'s — the stall ladder's
   own, so the two can never disagree. v56: strength's and powerlifting's
   6–15 is for the groups carrying the main lifts, as the spec wrote it; every
   other group gets the middle road's 10–20 (`none`), floor and top. */
const TOP = Object.freeze({ muscle: 20, recomp: 20, none: 20, strength: 15, powerlifting: 15, maintain: 12, cut: null });
// The groups carrying a main lift — legs, chest and back.
const MAIN_GROUPS = mainLiftGroups(EXERCISE_BY_ID);
// The row of the table a group reads: on a main-lift aim, a group with no
// main lift reads the middle road's.
const bandAim = (aim, g) => (MAIN_LIFT_AIMS.includes(aim) && !MAIN_GROUPS.includes(g) ? 'none' : aim);
const AIM_WORDS = Object.freeze({
  muscle: 'for building muscle', strength: 'for strength', powerlifting: 'for powerlifting',
  maintain: 'for staying consistent', recomp: 'for a recomp', none: ''
});

/* ---------- small things ---------- */
function noon(ms) { const d = new Date(ms); d.setHours(12, 0, 0, 0); return d.getTime(); }
function daysBetween(a, b) { return Math.round((noon(b) - noon(a)) / DAY); }
function median(xs) {
  const v = xs.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
const sum = xs => xs.reduce((a, x) => a + x, 0);
// Half-set precision: fractional counting deals in halves, and a normal is a
// median of them, so it is said to the nearest half — never "12.75 sets".
const half = x => { const h = Math.round(x * 2) / 2; return String(h).replace(/\.0$/, ''); };
const plural = (n, w) => n + ' ' + w + (Number(n) === 1 ? '' : 's');
const setsOf = n => half(n) + ' hard ' + (Number(half(n)) === 1 ? 'set' : 'sets');
const Label = g => (GROUPS[g] ? GROUPS[g].label : String(g));
const label = g => Label(g).toLowerCase();
const add = (o, k, n) => { o[k] = (o[k] || 0) + n; };
// "chest", "chest and arms", "chest, shoulders and arms".
const joined = xs => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1] : xs.join(''));
// The movement counts the balance split reads, one set of them per group.
const PAT_KEYS = Object.freeze(['push', 'pull', 'hPress', 'vPress', 'hPull', 'vPull', 'knee', 'hip']);
const noPat = () => Object.fromEntries(PAT_KEYS.map(k => [k, 0]));

/* THE HARD SETS OF ONE EXERCISE IN ONE SESSION, warm-ups in disguise out.
   Exported for the battery, which drives the three conditions one at a time.
   An assisted lift's load is the help, so nothing about it is a disguise. */
export function hardSets(sets, assisted) {
  const work = (Array.isArray(sets) ? sets : []).filter(s => s && isWorking(s) && parseInt(s.r, 10) >= 1);
  if (assisted) return work;
  const load = s => parseFloat(s.w) || 0;
  const main = work.filter(s => s.type !== 'D');
  const T = main.length ? Math.max(...main.map(load)) : 0;
  if (!(T > 0)) return work;
  const first = work.findIndex(s => s.type !== 'D' && load(s) >= T - 0.01);
  const topReps = parseInt(work[first].r, 10);
  return work.filter((s, k) => !(s.type === 'N' && k < first && load(s) <= T * DISGUISE_SHARE &&
                                 parseInt(s.r, 10) <= topReps + DISGUISE_REPS));
}

// A rep drop in one exercise's working sets: a later set at the same or a
// lighter load, reps down by REP_DROP or more from the first. coach.js's
// repDrop() and coach-live.js's fatigue test, with the constant handed in.
// v55: a drop set's sets ('D') are not read for it, as in both of those.
function dropped(sets, repDrop) {
  const w = (sets || []).filter(s => s && isWorking(s) && s.type !== 'D' && parseInt(s.r, 10) >= 1);
  if (w.length < 2 || !(repDrop > 0)) return false;
  const load = s => parseFloat(s.w) || 0, reps = s => parseInt(s.r, 10);
  return w.slice(1).some(s => load(s) <= load(w[0]) && reps(s) <= reps(w[0]) * (1 - repDrop));
}

/* One session, counted: fractional sets per group; whole sets per primary
   group, and of them the ones typed F and the ones on customs; lifts with a
   rep drop per group; and the movement counts the balance split reads — v56,
   per primary group, so a group can be left out of one split and not the
   rest. */
function countSession(rec, lib, repDrop) {
  const out = { groups: {}, prim: {}, f: {}, drops: {}, custom: {}, pat: {}, customSets: 0 };
  mergeSessionExercises(rec && rec.exercises).forEach(ex => {
    if (!ex || !ex.exId) return;
    const row = lib[ex.exId] || null;
    const g = (row && row.group) || ex.group;
    if (!g || !GROUPS[g]) return;
    if (((row && row.equipment) || ex.equipment) === 'cardio') return;
    const assisted = ex.exId === 'assisted-pull-up' || /assist/i.test(String((row && row.name) || ex.name || ''));
    const hard = hardSets(ex.sets, assisted);
    if (!hard.length) return;
    const n = hard.length;
    const built = EXERCISE_BY_ID[ex.exId];
    add(out.groups, g, n);
    add(out.prim, g, n);
    add(out.f, g, hard.filter(s => s.type === 'F').length);
    if (dropped(ex.sets, repDrop)) add(out.drops, g, 1);
    if (!built) { add(out.custom, g, n); out.customSets += n; return; }
    (built.secondary || []).forEach(s => { if (s !== g && GROUPS[s]) add(out.groups, s, n * SECONDARY); });
    const t = tagsFor(ex.exId);
    if (!t) return;
    const P = out.pat[g] || (out.pat[g] = noPat());
    if (['press', 'fly', 'extension'].includes(t.pattern) && ['chest', 'shoulders', 'arms'].includes(g)) P.push += n;
    if (t.pattern === 'row' || t.pattern === 'pulldown') P.pull += n;
    if (t.pattern === 'press' && ['flat', 'incline', 'decline'].includes(t.angle)) P.hPress += n;
    if (t.pattern === 'press' && t.angle === 'overhead') P.vPress += n;
    if (t.pattern === 'row') P.hPull += n;
    if (t.pattern === 'pulldown') P.vPull += n;
    if (t.pattern === 'squat' || t.pattern === 'lunge') P.knee += n;
    if (t.pattern === 'hinge' || t.pattern === 'bridge') P.hip += n;
  });
  return out;
}

/* THE WEEKS. Week 0 is the last seven days, today in it (the shipped
   setsThisWeek's window); week k the seven before that, and so on. Sessions
   arrive as coach.js shapes them, each with its `daysAgo` on the noon-
   anchored day count every Coach file shares. */
function weeksOf(i) {
  const lib = i.lib || {};
  const sessions = (Array.isArray(i.sessions) ? i.sessions : [])
    .filter(s => s && Number.isFinite(s.daysAgo) && s.daysAgo >= 0 && (s.session || s.exercises));
  const weeks = [];
  const at = k => weeks[k] || (weeks[k] = { n: 0, groups: {}, prim: {}, f: {}, drops: {}, custom: {}, pat: {}, customSets: 0 });
  sessions.forEach(s => {
    const w = at(Math.floor(s.daysAgo / 7));
    w.n++;
    const c = countSession(s.session || s, lib, i.repDrop);
    ['groups', 'prim', 'f', 'drops', 'custom'].forEach(k => Object.keys(c[k]).forEach(g => add(w[k], g, c[k][g])));
    Object.keys(c.pat).forEach(g => { const P = w.pat[g] || (w.pat[g] = noPat()); PAT_KEYS.forEach(k => { P[k] += c.pat[g][k]; }); });
    w.customSets += c.customSets;
  });
  const age = sessions.length ? Math.max(...sessions.map(s => s.daysAgo)) : null;
  return { weeks, age, week: k => weeks[k] || at(k) };
}

/* ================================================================
   HOW'S MY WEEKLY VOLUME?
   ================================================================
   volumeRead(input) -> { state: 'thin', days } | { state: 'read', aim, focus,
     groups: [{ group, sets, last, normal, band: { lo, hi }, zone, flag, why }],
     neglect: null | { group, sets4, median4, zero8, weeks } }

     input  { now, sessions (coach.js's shaped sessions), lib, aim, focus,
              aimSetAt (when the aim was set), asked (settings/coach.asked,
              for the neglect line's stamp), repDrop }

   `zone` is §6.2's band, moved by the goal: 'very low' under four, 'low end'
   under the goal's floor, 'common' inside its range, 'high' over its top.
   The focus group comes first. */
export function volumeRead(input) {
  try {
    const i = input || {};
    const W = weeksOf(i);
    if (W.age == null || W.age < MIN_LOG_DAYS) return { state: 'thin', days: W.age == null ? 0 : W.age };
    const aim = AIMS.includes(i.aim) ? i.aim : 'none';
    const focus = GROUP_ORDER.includes(i.focus) ? i.focus : null;
    const wk = (g, k, key) => ((W.week(k)[key || 'groups'] || {})[g] || 0);
    const trained = k => W.week(k).n > 0;
    const normalOf = (g, from) => {
      const ks = [];
      for (let k = from; k < from + NORMAL_WEEKS; k++) if (trained(k)) ks.push(wk(g, k));
      return ks.length >= NORMAL_MIN_WEEKS ? median(ks) : null;
    };
    // A cut's floor is two thirds of his normal BEFORE the cut: the eight
    // weeks before the aim was set, when that far back holds four weeks of
    // sessions; failing that, the normal he has now.
    const cutAgo = aim === 'cut' && Number.isFinite(i.aimSetAt) && Number.isFinite(i.now) ? daysBetween(i.aimSetAt, i.now) : null;
    const preCut = g => (cutAgo != null && cutAgo >= 7 ? normalOf(g, Math.floor(cutAgo / 7)) : null);

    const order = (focus ? [focus] : []).concat(GROUP_ORDER.filter(g => g !== focus));
    const groups = order.map(g => {
      const sets = wk(g, 0), last = wk(g, 1), normal = normalOf(g, 1);
      if (g === 'core') return { group: g, sets, last, normal, band: null, zone: null, flag: null, why: null };
      // v56: the floor and the top for THIS group — on Get stronger and
      // Powerlifting, 6–15 where a main lift is and 10–20 everywhere else.
      let lo = aim === 'cut' ? volumeFloor('cut', preCut(g) != null ? preCut(g) : normal) : volumeFloor(aim, null, MAIN_GROUPS.includes(g));
      let hi = TOP[bandAim(aim, g)];
      const raised = g === focus;
      if (raised) { lo = lo != null ? Math.round(lo * FOCUS_RAISE) : null; hi = hi != null ? Math.round(hi * FOCUS_RAISE) : null; }
      const zone = lo != null && sets >= lo && (hi == null || sets <= hi) ? 'common'
        : sets < VERY_LOW ? 'very low'
        : lo != null && sets < lo ? 'low end'
        : hi != null && sets > hi ? 'high' : null;
      // The flags, first match wins.
      const under = k => lo != null && normal != null && wk(g, k) < lo && wk(g, k) < LITTLE_SHARE * normal;
      const focusLow = raised && lo != null && [0, 1, 2, 3].every(k => wk(g, k) < lo);
      let flag = null, why = null;
      if ((under(0) && under(1)) || focusLow) {
        flag = 'little'; why = focusLow && !(under(0) && under(1)) ? 'focus' : 'two';
      } else if (normal != null && normal > 0 && sets >= MORE_SHARE * normal) {
        const prim = wk(g, 0, 'prim'), f = wk(g, 0, 'f');
        let fPrim = 0, fAll = 0;
        for (let k = 1; k <= NORMAL_WEEKS; k++) { fPrim += wk(g, k, 'f'); fAll += wk(g, k, 'prim'); }
        const share = fAll > 0 ? fPrim / fAll : 0;
        const failing = f >= F_MIN && prim > 0 && f / prim >= F_SHARE * share;
        const drops = wk(g, 0, 'drops');
        if (failing || drops >= DROP_LIFTS) {
          flag = 'more';
          why = failing ? { f, usual: share > 0 ? Math.round(share * prim) : 0 } : { drops };
        }
      }
      if (!flag && (zone === 'common' || (normal != null && normal > 0 && Math.abs(sets - normal) <= USUAL_WITHIN * normal))) flag = 'right';
      return { group: g, sets, last, normal, band: { lo, hi, raised, cut: aim === 'cut' }, zone, flag, why };
    });

    /* NEGLECT: the non-core group whose four weeks are under 30% of the
       middle of the others' — or, with eight weeks of log, nothing at all in
       eight — the furthest under first. Said once in 28 days: the sheet
       stamps settings/coach.asked.vol_neglect when it draws the line, and
       until then this reads it and stays quiet. */
    const nonCore = GROUP_ORDER.filter(g => g !== 'core');
    const four = g => sum([0, 1, 2, 3].map(k => wk(g, k)));
    const eight = g => sum([0, 1, 2, 3, 4, 5, 6, 7].map(k => wk(g, k)));
    const cands = nonCore.map(g => {
      const med = median(nonCore.filter(x => x !== g).map(four));
      const zero8 = W.age >= NEGLECT_ZERO_WEEKS * 7 - 1 && eight(g) === 0;
      const low = med > 0 && four(g) < NEGLECT_SHARE * med;
      return zero8 || low ? { group: g, sets4: four(g), median4: med, zero8, ratio: med > 0 ? four(g) / med : 0 } : null;
    }).filter(Boolean).sort((a, b) => (b.zero8 - a.zero8) || a.ratio - b.ratio || GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
    const stamp = i.asked && Number.isFinite(i.asked.vol_neglect) ? i.asked.vol_neglect : null;
    const quiet = stamp != null && Number.isFinite(i.now) && daysBetween(stamp, i.now) < NEGLECT_EVERY_DAYS;
    return { state: 'read', aim, focus, groups, neglect: !quiet && cands.length ? cands[0] : null, neglectHeld: quiet && cands.length > 0 };
  } catch {
    return null;
  }
}

/* The words. One line per group, focus first: the number, the range it sits
   in for his goal, and the flag — in plain numbers, and never a reason about
   the body. */
export function volumeAnswer(read) {
  if (!read) return null;
  if (read.state === 'thin') {
    return { text: 'Coach reads weekly volume from three weeks of your log or more, and yours has ' + plural(read.days, 'day') + ' so far.',
             reason: 'It won’t guess at a week from less.', more: [], once: null };
  }
  const aimWords = AIM_WORDS[read.aim] != null ? AIM_WORDS[read.aim] : '';
  // v56: a group with no main lift on Get stronger or Powerlifting reads the
  // middle road's range, and says why it is not the aim's.
  const whose = g => (bandAim(read.aim, g) !== read.aim ? ' for a group with no main lift' : aimWords ? ' ' + aimWords : '');
  const rangeSaid = (b, g) => (b.cut
    ? (b.lo != null ? half(b.lo) + ' or more, two thirds of your usual before your cut' : null)
    : b.lo + '–' + b.hi + ', a common range' + whose(g)) + (b.raised && b.lo != null ? ' raised 30% for your focus' : '');
  // And which groups those are, once, under the first line.
  const mainSaid = MAIN_LIFT_AIMS.includes(read.aim)
    ? ' ' + aimWords.charAt(0).toUpperCase() + aimWords.slice(1) + ', ' + volumeFloor(read.aim, null, true) + '–' + TOP[read.aim] +
      ' is for the groups with a main lift in them (' + joined(MAIN_LIFTS.map(([w]) => w)) + '): ' +
      joined(GROUP_ORDER.filter(g => MAIN_GROUPS.includes(g)).map(label)) + '. The rest get ' + volumeFloor('none', null) + '–' + TOP.none + '.'
    : '';
  // "In the last 7 days", never "this week": the window rolls, and a calendar
  // word on a rolling count is the defect v43 fixed on the greeting.
  const lines = read.groups.map(r => {
    const head = Label(r.group) + ': ' + setsOf(r.sets) + ' in the last 7 days';
    if (r.group === 'core') return head + '.';
    const range = rangeSaid(r.band, r.group);
    const where = !range ? ''
      : r.zone === 'common' ? ', inside ' + range
      : r.zone === 'very low' ? ', very low against ' + range
      : r.zone === 'low end' ? ', the low end, under ' + range
      : r.zone === 'high' ? ', above ' + range : '';
    let flag = '';
    if (r.flag === 'little') {
      flag = r.why === 'focus' ? ' Four weeks under that range on your focus group.'
        : ' Two weeks running under that range and under 70% of your usual ' + half(r.normal) + ' (' + half(r.last) + ' the 7 days before).';
    } else if (r.flag === 'more') {
      flag = ' More than your usual ' + half(r.normal) + (r.why && r.why.f != null
        ? ', with ' + plural(r.why.f, 'set') + ' taken to failure against a usual ' + r.why.usual + '.'
        : ', with reps down a quarter on ' + r.why.drops + ' of its lifts.');
    } else if (r.flag === 'right') {
      flag = r.zone === 'common' || r.normal == null ? ' About right.' : ' About your usual ' + half(r.normal) + '.';
    }
    return head + where + '.' + flag;
  });
  const more = lines.slice(1).map(t => ({ text: t, reason: '' }));
  const n = read.neglect;
  if (n) {
    more.push({ text: n.zero8 ? Label(n.group) + ': no hard sets in the last 8 weeks.'
                              : Label(n.group) + ': ' + setsOf(n.sets4) + ' in the last 4 weeks, against a middle of ' + half(n.median4) +
                                ' across your other groups.',
                reason: 'Coach mentions this once in four weeks.' });
  }
  return {
    text: lines[0],
    reason: 'Working sets from the last 7 days, warm-ups out, and a set counts half for each group it works second. ' +
            'Each range is a common starting point for your goal; your usual is the middle of your 8 weeks before this one.' + mainSaid,
    more,
    once: n ? 'vol_neglect' : null
  };
}

/* ================================================================
   IS MY TRAINING BALANCED?
   ================================================================
   balanceRead(input) -> { state: 'thin', days } | { state: 'read', ratios:
     [{ id, a, b, flagged, skipped, left }], custom, skipped: [groups],
     heavy: [groups] }

   Four splits over eight weeks of hard sets, by movement, from the tags:
   pushing (presses, flyes and extensions on chest, shoulders and arms) against
   pulling (rows and pulldowns), past two to one either way; flat, incline and
   decline presses against overhead, and rows against pulldowns, when one side
   is zero; knees (squats and lunges) against hips (hinges and bridges), past
   three to one. A set is one set of its movement here: fractional counting
   shares a set between muscle groups, and a set has one movement. Customs
   have no movement tag and are left out, and said to be; a group whose sets
   are over a quarter customs — `heavy` — has its splits skipped. Hidden
   exercises count — hiding only takes one out of the picker — and nothing
   here suggests one.

   v56: PUSH AGAINST PULL IS READ ACROSS GROUPS — its pushing comes from chest,
   shoulders and arms, its pulling from back — so a heavy group is left out of
   it by its sets (`left`), never the whole split: pushing without the arms is
   still a count of pushing, said with the arms named as not in it, and the two
   to one is on what is counted. It is skipped whole only when every group
   carrying one of its sides (`sides`) is out, since a side with nothing left
   in it would read as a lopsided split. The other three each read inside one
   or two groups and are skipped whole, as they always were. `skipped` is the
   heavy groups that did skip a split. */
const SPLITS = Object.freeze([
  Object.freeze({ id: 'pushPull', groups: ['chest', 'shoulders', 'arms', 'back'], a: 'push', b: 'pull', ratio: PUSH_PULL,
                  sides: Object.freeze({ a: ['chest', 'shoulders', 'arms'], b: ['back'] }) }),
  Object.freeze({ id: 'press', groups: ['chest', 'shoulders'], a: 'hPress', b: 'vPress', ratio: null }),
  Object.freeze({ id: 'pull', groups: ['back'], a: 'hPull', b: 'vPull', ratio: null }),
  Object.freeze({ id: 'kneeHip', groups: ['legs'], a: 'knee', b: 'hip', ratio: KNEE_HIP })
]);

export function balanceRead(input) {
  try {
    const i = input || {};
    const W = weeksOf(i);
    if (W.age == null || W.age < MIN_LOG_DAYS) return { state: 'thin', days: W.age == null ? 0 : W.age };
    const focus = GROUP_ORDER.includes(i.focus) ? i.focus : null;
    const pat = {};   // group -> the eight weeks' movement counts
    const prim = {}, custom = {};
    let customSets = 0;
    for (let k = 0; k < BALANCE_WEEKS; k++) {
      const w = W.week(k);
      Object.keys(w.pat).forEach(g => { const P = pat[g] || (pat[g] = noPat()); PAT_KEYS.forEach(x => { P[x] += w.pat[g][x]; }); });
      Object.keys(w.prim).forEach(g => add(prim, g, w.prim[g]));
      Object.keys(w.custom).forEach(g => add(custom, g, w.custom[g]));
      customSets += w.customSets;
    }
    const heavy = GROUP_ORDER.filter(g => prim[g] > 0 && (custom[g] || 0) / prim[g] > CUSTOM_SHARE);
    const ratios = SPLITS.map(s => {
      const out = s.groups.filter(g => heavy.includes(g));
      const skipped = s.sides ? ['a', 'b'].some(k => s.sides[k].every(g => out.includes(g))) : out.length > 0;
      // What is counted: every group's sets, less the ones left out of a
      // split read across groups. A skipped split counts everything, as before.
      const left = s.sides && !skipped ? out : [];
      const tally = key => Object.keys(pat).filter(g => !left.includes(g)).reduce((n, g) => n + pat[g][key], 0);
      const a = tally(s.a), b = tally(s.b);
      const enough = a + b >= BALANCE_MIN;
      const flagged = !skipped && enough && (s.ratio == null
        ? (a === 0) !== (b === 0)
        : (a === 0 || b === 0) || Math.max(a, b) / Math.min(a, b) > s.ratio);
      return { id: s.id, groups: s.groups, a, b, flagged, skipped, enough, left };
    });
    // His focus first: the splits his focus group is in rank above the rest.
    const rank = r => (focus && r.groups.includes(focus) ? 0 : 1);
    ratios.sort((x, y) => rank(x) - rank(y) || SPLITS.findIndex(s => s.id === x.id) - SPLITS.findIndex(s => s.id === y.id));
    const skipped = heavy.filter(g => ratios.some(r => r.skipped && r.groups.includes(g)));
    return { state: 'read', focus, ratios, custom: customSets, skipped, heavy };
  } catch {
    return null;
  }
}

/* v56: two counts are joined by a comma, never an "and" — "37 squat and lunge
   sets, 36 hinge and bridge sets" — because a movement's own name can carry
   one, and two of them in a row read as one list. tools-check/coach-voice.mjs
   O holds every readout to it. */
const SPLIT_WORDS = Object.freeze({
  pushPull: (a, b) => (a >= b ? a + ' pushing sets, ' + b + ' pulling sets' : b + ' pulling sets, ' + a + ' pushing sets'),
  press: (a, b) => (b === 0 ? a + ' flat, incline or decline pressing sets, none overhead'
                            : b + ' overhead pressing sets, no flat, incline or decline ones'),
  pull: (a, b) => (b === 0 ? a + ' rowing sets, none on a pulldown' : b + ' pulldown sets, no rows'),
  kneeHip: (a, b) => (a >= b ? a + ' squat and lunge sets, ' + b + ' hinge and bridge sets' : b + ' hinge and bridge sets, ' + a + ' squat and lunge sets')
});
const SPLIT_TAIL = Object.freeze({ pushPull: ', more than two to one.', kneeHip: ', more than three to one.', press: '.', pull: '.' });
// With nothing lopsided, the two big splits in their own order.
const COUNT_WORDS = Object.freeze({
  pushPull: (a, b) => a + ' pushing sets, ' + b + ' pulling sets',
  kneeHip: (a, b) => a + ' squat and lunge sets, ' + b + ' hinge and bridge sets'
});
// What a split read across groups left out, said after its counts.
const leftSaid = r => (r.left && r.left.length
  ? ' Your ' + joined(r.left.map(label)) + ' work isn’t in this: more than a quarter of ' + (r.left.length > 1 ? 'each' : 'it') + ' is custom exercises.'
  : '');

export function balanceAnswer(read) {
  if (!read) return null;
  if (read.state === 'thin') {
    return { text: 'Coach reads balance from three weeks of your log or more, and yours has ' + plural(read.days, 'day') + ' so far.',
             reason: 'It won’t guess at a split from less.', more: [] };
  }
  const flagged = read.ratios.filter(r => r.flagged);
  const lines = flagged.map(r => 'Over 8 weeks: ' + SPLIT_WORDS[r.id](r.a, r.b) + SPLIT_TAIL[r.id] + leftSaid(r));
  // With nothing lopsided, the two big splits' counts, so "nothing" is a
  // number he can check rather than a shrug — v56, a line each.
  const counts = read.ratios.filter(r => !r.skipped && r.a + r.b > 0 && COUNT_WORDS[r.id])
    .map(r => ({ text: 'Over 8 weeks: ' + COUNT_WORDS[r.id](r.a, r.b) + '.' + leftSaid(r), reason: '' }));
  const notes = [];
  if (read.custom > 0) {
    notes.push({ text: plural(half(read.custom), 'set') + ' on your custom exercises aren’t in this split: Coach doesn’t know their movement.',
                 reason: '' });
  }
  read.skipped.forEach(g => notes.push({ text: 'Your ' + label(g) + ' work is more than a quarter custom exercises, so Coach leaves its split out.',
                                         reason: '' }));
  const reason = 'Hard sets from the last 8 weeks, sorted by movement. A split is worth saying when it’s lopsided; there is no exact ratio to aim for.';
  if (!flagged.length) {
    return { text: 'Nothing lopsided in the last 8 weeks.', reason, more: counts.concat(notes) };
  }
  return { text: lines[0], reason, more: lines.slice(1).map(t => ({ text: t, reason: '' })).concat(notes) };
}
