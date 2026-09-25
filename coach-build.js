// Coach builds — "what should I train today" as a workout he can start.
//
// Ship one taught Coach to READ the log. This is ship two: the same reading,
// turned into a session he can start in one tap and made entirely out of his
// own log. Not a template and not a programme. The most recent session of the
// kind that has waited longest, with the exercises he did, in the order he did
// them, in the blocks he built, and the numbers he actually lifted.
//
// A WRONG NUMBER IS WORSE THAN NO NUMBER, and here the house law has one sharp
// edge: THE BUILDER NEVER INVENTS A WEIGHT ITSELF. Every number it pre-fills is
// one he lifted, and the proposal says when. The one moment a gym app reaches
// for a percentage — coming back after a layoff — is a refusal here: the
// pre-filled view is withheld and his last numbers stay as ghost text.
//
// What to put on the bar NEXT time is a separate field, each row's `target`,
// and its only author is coach-prog.js (v48). It names a load he has logged,
// or one at most two of his own steps from his last top set — and coming back
// after a layoff, a load he has logged or a whole number of his own steps
// BELOW his last top set. Never a percentage, and on a metric account never a
// rounding rule nobody chose. Targets travel as ghost text in a view of their
// own (`targets`); nothing is pre-filled from them, and only a tick turns one
// into a logged set.
//
// PURE, and copied into the native tree verbatim (src/pure/coach-build.js). No
// reads, no DOM, no clock, no module state. It derives nothing about the log
// on its own, either: the recurring shapes, the twelve-week window, the gate
// the headline finding uses and the layoff gate are all coach.js's facts,
// gathered by builderInput() there and handed in — so "what counts as a chest
// and arms day" has one definition in the tree rather than two that drift.
// What lives HERE is everything that decides what goes into a proposal.
//
// THE INPUT, as coach.js builds it:
//
//   now         the clock, as everywhere in Coach — an argument
//   u           'lb' | 'kg', for the lines that print a load
//   live        a session is running on this device
//   ready       train_today_recommendation's own min-data gate, evaluated
//   overdue     the default focus when it is a shape (v52: session.buildFocus,
//               the rest read's pick, or the shipped overdue shape), or null
//   defaultGroup the default focus when it is a group (v52), or null — only
//               one of the two is ever set
//   overdueWhy  that fact's `because`, so the reason reads as Coach reads it
//   overdueSkipped the pick left the shipped stalest shape out as unrecovered
//               (v52), so "waited longest" is said of what is recovered
//   marks       exId -> that lift's bad-day mark (v52), for targetFor()
//   shapes      session.shapes — every recurring shape, with its members
//   sessions    the window's sessions, oldest first, each carrying its
//               signature and the raw record it was shaped from
//   log         every session, the same way, for "the last time you did X"
//   groupDays   group.daysSince
//   layoffDays  session.lastDaysAgo WHEN returning_from_layoff fires, else null
//   lib         exId -> { name, group, equipment }: the library the picker
//               shows, renames applied, hidden ones absent
//   hidden      the ids taken out of the picker
//   libReady    whether that library has really been read. Until it has, a
//               custom exercise is indistinguishable from a deleted one, and
//               the builder would drop somebody's own lift and call it gone
//   goal        { aim, exp }: his answers to Coach's two goal questions
//   energy      { context, rateWk }: the weight trend, read by coach-goal.js
//   targetsOn   whether the targets category is on. Off, no row has a target
//
// Imports exercises.js, units.js, blocks.js, coach-tags.js and coach-prog.js
// (the targets), and the session MATH of analytics.js (the merge invariant and
// what a working set is, which must not be restated here). coach.js imports
// this; nothing imports back.

import { GROUPS, GROUP_ORDER } from './exercises.js';
import { isWorking, mergeSessionExercises, dropRuns, setsText } from './analytics.js';
import { fmtSetLoad, unitW } from './units.js';
import { normalizeBlocks, blockOrder } from './blocks.js';
import { tagsFor } from './coach-tags.js';
import { exposuresFor, sessionDay, targetFor } from './coach-prog.js';

/* How many alternatives "Swap one" offers. Five is a thumb's worth of chips;
   past that it is a picker, and the app already has one. */
export const SWAP_MAX = 5;

/* The one thing the sheet says when a session is running. Starting a second
   one would clobber the first — startWorkout replaces the session outright —
   so there is no proposal at all, and this is why. */
export const LIVE_LINE = 'A workout is running. Coach builds the next one once it is saved or discarded.';

/* Dates, printed the way the app prints a session's date everywhere else
   (ui.js fmtDateFull: "Tue, Sep 16"). Spelled out rather than asked of Intl,
   because a pure module cannot lean on a locale and a native runtime may not
   have one — and the weekday is worked out in UTC from the date KEY, so the
   day a session was filed under is the day this names, in every time zone. */
const DAY_NAMES = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const MONTH_NAMES = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);

function dayLabel(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), dd = Number(m[3]);
  const wd = new Date(Date.UTC(y, mo - 1, dd)).getUTCDay();
  return DAY_NAMES[wd] + ', ' + MONTH_NAMES[mo - 1] + ' ' + dd;
}

// "today’s session", "yesterday’s session", or "your Tue, Sep 16 session".
function sessionWhen(daysAgo, key) {
  if (daysAgo === 0) return 'today’s session';
  if (daysAgo === 1) return 'yesterday’s session';
  const label = dayLabel(key);
  return label ? 'your ' + label + ' session' : 'your last one';
}

/* ---------- small words ---------- */
const plural = (n, word) => n + ' ' + word + (Number(n) === 1 ? '' : 's');
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const groupWord = g => (GROUPS[g] && GROUPS[g].label ? GROUPS[g].label.toLowerCase() : String(g));

/* ================================================================
   THE OPTIONS
   ================================================================
   Every adjustment is a new set of opts and a fresh call, never an edit to a
   proposal already on screen. That is what makes "Change something" a
   follow-up rather than an interview, and it is what makes the answer
   deterministic: the same opts on the same log is the same proposal, byte for
   byte, however many taps it took to get there.

     focus  'shape:<key>' for one of his recurring shapes, 'group:<id>' for one
            of the six groups, absent for the default — the shape
            session.shapeOverdue names
     drop   base-session positions taken out by "Fewer exercises". Positions,
            not a count: a count re-derived after a swap can drop a different
            exercise from the one somebody watched go
     swap   original exId -> the one standing in for it. Keyed by exId rather
            than position, so a duplicated block swaps as one thing */
function normOpts(o) {
  const x = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  const focus = typeof x.focus === 'string' && x.focus ? x.focus : null;
  const drop = Array.isArray(x.drop)
    ? [...new Set(x.drop.filter(n => Number.isInteger(n) && n >= 0))].sort((a, b) => a - b)
    : [];
  const swap = {};
  const raw = x.swap && typeof x.swap === 'object' && !Array.isArray(x.swap) ? x.swap : {};
  Object.keys(raw).sort().forEach(k => {
    if (typeof raw[k] === 'string' && raw[k] && raw[k] !== k) swap[k] = raw[k];
  });
  return { focus, drop, swap };
}

// The next tap's opts as a plain object, with no key that means nothing.
function optsOut(o) {
  const out = {};
  if (o.focus) out.focus = o.focus;
  if (o.drop.length) out.drop = o.drop.slice();
  if (Object.keys(o.swap).length) out.swap = { ...o.swap };
  return out;
}

/* ================================================================
   WHAT TO TRAIN
   ================================================================ */
function shapeFocus(sh, overdue) {
  return {
    kind: 'shape', id: 'shape:' + sh.key, key: sh.key,
    groups: (sh.groups || []).slice(), members: (sh.members || []).slice(),
    count: sh.count, name: String(sh.name || ''), routine: sh.routine || null,
    overdue: !!overdue
  };
}

function focusOf(i, id) {
  const shapes = Array.isArray(i.shapes) ? i.shapes : [];
  const due = i.overdue && i.overdue.key ? i.overdue : null;
  // v52: the default is the overdue shape, then — on a group call from the
  // rest read — that group; coach.js sets one of the two at most.
  if (!id) return due ? shapeFocus(due, true) : i.defaultGroup ? focusOf(i, 'group:' + i.defaultGroup) : null;
  if (id.startsWith('shape:')) {
    const key = id.slice(6);
    const sh = shapes.find(s => s && s.key === key);
    return sh ? shapeFocus(sh, !!due && due.key === key) : null;
  }
  if (id.startsWith('group:')) {
    const g = id.slice(6);
    if (!GROUP_ORDER.includes(g)) return null;
    return { kind: 'group', id: 'group:' + g, group: g, groups: [g],
             name: GROUPS[g].label + ' day', routine: null, overdue: false };
  }
  return null;
}

/* WHAT IT IS BUILT FROM. The most recent session in the window that belongs to
   the focus shape — and "belongs" is read off the shape's own cluster, the
   signatures coach.js merged into it, rather than re-running the merge here.
   Re-running it would be a second definition of §3.3, and a session sitting
   one group from two representatives would be claimed by whichever copy ran.

   A group is not a shape, so a group focus takes the most recent session that
   trained that group at two working sets or more: the same bar a session's
   signature uses, cardio out, which is what keeps a treadmill walk from being
   anybody's leg day. */
function baseFor(i, focus) {
  const list = Array.isArray(i.sessions) ? i.sessions : [];
  for (let k = list.length - 1; k >= 0; k--) {
    const s = list[k];
    if (!s || !s.session || !Array.isArray(s.signature) || !s.signature.length) continue;
    const hit = focus.kind === 'shape'
      ? focus.members.includes(s.signature.join('+'))
      : s.signature.includes(focus.group);
    if (hit) return s;
  }
  return null;
}

/* Where an exercise stands in the library right now. HIDDEN wins over
   everything, a custom one included: he took it out of the picker, and a
   proposal is a picker that fills itself in. An id the library cannot resolve
   is gone — a custom exercise deleted outright — and is said to be "not in
   your library", which is true whether it was deleted or this device simply
   could not read it. */
function standing(i, exId) {
  if (Array.isArray(i.hidden) && i.hidden.includes(exId)) return 'hidden';
  return i.lib && i.lib[exId] ? 'live' : 'gone';
}

/* The last time each exercise was logged, merged the way every other reader
   of a session merges it (one logical entry per exId per session). What "Swap
   one" orders by, and where a swapped-in exercise's numbers come from. */
function lastSeenIndex(i) {
  const out = {};
  (Array.isArray(i.log) ? i.log : []).forEach(s => {
    if (!s || !s.session) return;
    mergeSessionExercises(s.session.exercises).forEach(ex => {
      if (!ex || !ex.exId) return;
      out[ex.exId] = { at: s.startedAt, date: s.date, daysAgo: s.daysAgo, sets: ex.sets || [] };
    });
  });
  return out;
}

// A logged set as the builder carries it: the three fields that matter, EXACTLY
// as stored. A bodyweight set is w:'0' in the record and it stays '0' here —
// "fixing" it to blank would turn a logged set into an unfilled one. v55: and
// a drop's `dp` (analytics.js), so a drop set he did is proposed as one group;
// nothing here reads it. dpOf is how every view below carries it.
const dpOf = s => (s && s.dp === 1 ? { dp: 1 } : null);
const copySet = s => ({
  w: s && s.w != null ? s.w : '',
  r: s && s.r != null ? s.r : '',
  type: (s && s.type) || 'N',
  ...dpOf(s)
});

/* ================================================================
   HOW IT READS
   ================================================================ */

/* One exercise's sets as a line: runs of identical sets, the way somebody
   says them out loud — "warm-up 1 × 10 at 95 lb, 3 × 8 at 185 lb". Every load
   goes through units.js and nothing here writes a unit word, a rounding or a
   step. fmtSetLoad rather than a label that rounds: on pounds it prints the
   stored string back to the digit, which is what makes "every weight on it is
   one he lifted" true of the sheet as well as of the pre-filled boxes — and a
   load of zero is a bodyweight set, said in words. This is a DISPLAY site
   (tools-check/units.mjs keeps the list); nothing here fills an input. */
function loadText(w, u) {
  const s = fmtSetLoad(w, u);
  if (s === '') return '';
  return s === 'BW' ? 'bodyweight' : s + ' ' + unitW(u);
}

function setsLine(sets, u) {
  if (!sets.length) return '';
  // A swapped-in exercise he has never logged has sets with nothing in them,
  // and "3 × –" is a row of blanks dressed as a plan.
  if (sets.every(s => s.w === '' && s.r === '')) return plural(sets.length, 'set');
  const runs = [];
  // v56: a drop set with drops in it is said once, as a group — "185 lb × 8 →
  // 135 lb × 6, a drop set" — through analytics.js setsText, the rule every
  // screen draws one by. A 'D' with no drops is said as it was.
  dropRuns(sets).forEach(run => {
    if (run.length > 1) {
      runs.push({ drop: setsText(run, s => (loadText(s.w, u) || '–') + ' × ' + (s.r === '' ? '–' : String(s.r)), '') });
      return;
    }
    const s = run[0];
    const k = s.type + '|' + String(s.w) + '|' + String(s.r);
    const last = runs[runs.length - 1];
    if (last && last.k === k) { last.n++; return; }
    runs.push({ k, n: 1, type: s.type, w: s.w, r: s.r });
  });
  return runs.map(x => {
    if (x.drop) return x.drop + ', a drop set';
    const load = loadText(x.w, u);
    return (x.type === 'W' ? 'warm-up ' : '') + x.n + ' × ' + (x.r === '' ? '–' : String(x.r)) +
           (load ? ' at ' + load : '') +
           (x.type === 'F' ? ' to failure' : x.type === 'D' ? ' drop set' : '');
  }).join(', ');
}

/* THE NUDGE IS A READOUT. What the last session shows, said once and
   descriptively, and never what to do about it: no next weight, no step, no
   "try". A set taken to failure is said plainly rather than answered with a
   suggestion to do more — it is the one place a builder would be most tempted
   to push, and the log is the only thing Coach knows. When the sets cannot
   carry a sentence, there is none.

   What to do next time is not this line's job and never becomes it. Since v48
   it is the row's `target`, beside this note rather than inside it, written by
   coach-prog.js under a battery of its own — so this sentence keeps its voice
   check exactly as it was. */
function nudge(sets) {
  const working = sets.filter(isWorking);
  if (!working.length) return null;
  const failed = working.filter(s => s.type === 'F').length;
  if (failed) {
    return failed === 1 ? 'One set was taken to failure last time.'
                        : failed + ' sets were taken to failure last time.';
  }
  if (working.length < 2) return null;
  const reps = working.map(s => parseInt(s.r, 10));
  if (!reps.every(n => Number.isFinite(n) && n > 0 && n === reps[0])) return null;
  return 'Every working set reached ' + plural(reps[0], 'rep') + ' last time.';
}

/* ================================================================
   THE CHANGES ON OFFER
   ================================================================ */

/* "Swap one". Same primary group, always; the same movement pattern as well
   when both exercises carry a tag. A custom exercise has no tag, so it swaps
   within its group — and it is a candidate everywhere a built-in of its group
   is, because it is his. His own logged exercises come first, most recent
   first; then the rest of the library, his customs ahead of the built-ins.
   Never a hidden one, never one already on the list, and never across the
   line between cardio and lifting, which the group alone does not draw for an
   untagged exercise. */
function swapOptions(i, o, laid, e, seen) {
  const lib = i.lib || {};
  const me = lib[e.exId];
  if (!me || !me.group) return [];
  const mine = tagsFor(e.exId);
  const cardio = me.equipment === 'cardio';
  const here = new Set(laid.map(x => x.exId));
  const ok = id => {
    if (here.has(id) || standing(i, id) !== 'live') return false;
    const x = lib[id];
    if (!x || x.group !== me.group) return false;
    if ((x.equipment === 'cardio') !== cardio) return false;
    const t = tagsFor(id);
    return !(mine && t && t.pattern !== mine.pattern);
  };
  const ids = Object.keys(lib).filter(ok);
  const logged = ids.filter(id => seen[id])
    .sort((a, b) => seen[b].at - seen[a].at || (a < b ? -1 : 1));
  const rest = ids.filter(id => !seen[id]);
  return logged
    .concat(rest.filter(id => !tagsFor(id)), rest.filter(id => tagsFor(id)))
    .slice(0, SWAP_MAX)
    .map(id => {
      const swap = { ...o.swap };
      if (id === e.from) delete swap[e.from];
      else swap[e.from] = id;
      return { exId: id, name: String(lib[id].name || id), opts: optsOut({ ...o, swap }) };
    });
}

/* "Something else…": the picker, for the exercise he wants that "Swap one" did
   not list. What it opens on is decided here — the slot's own muscle group —
   and so is what it must not offer: every exercise already on the list, and
   every hidden one (web's picker leaves hidden ones out already; native's
   library keeps them, so the list is handed over either way). */
function otherFor(i, laid, e) {
  const lib = i.lib || {};
  const me = lib[e.from] || lib[e.exId] || {};
  const exclude = [...new Set(laid.map(x => x.exId).concat(Array.isArray(i.hidden) ? i.hidden : []))];
  return me.group ? { group: me.group, exclude } : null;
}

/* The exercise he picked, swapped in EXACTLY as a listed alternative is: the
   same opts, so the same build — it brings its own last numbers or none, and
   says which. Refused, with the reason, when it cannot stand in: hidden or not
   in the library, already on the list, or across the line between cardio and
   lifting, which a listed alternative never crosses either. Picking the
   exercise the slot started with takes the swap off. */
export function swapTo(input, opts, from, to) {
  try {
    const i = input || {};
    const o = normOpts(opts);
    if (typeof from !== 'string' || !from || typeof to !== 'string' || !to) return { opts: null, why: SWAP_WHY.gone };
    const p = build(i, o, false);
    const slot = p && p.exercises.find(e => e.from === from);
    if (!slot) return { opts: null, why: SWAP_WHY.gone };
    if (to === from) {
      const swap = { ...o.swap };
      delete swap[from];
      return { opts: optsOut({ ...o, swap }), why: null };
    }
    if (standing(i, to) !== 'live') return { opts: null, why: SWAP_WHY.gone };
    if (p.exercises.some(e => e.exId === to)) return { opts: null, why: SWAP_WHY.listed };
    const lib = i.lib || {};
    const was = lib[from] || {}, now = lib[to] || {};
    if ((was.equipment === 'cardio') !== (now.equipment === 'cardio')) return { opts: null, why: SWAP_WHY.cardio };
    return { opts: optsOut({ ...o, swap: { ...o.swap, [from]: to } }), why: null };
  } catch {
    return { opts: null, why: SWAP_WHY.gone };
  }
}

export const SWAP_WHY = Object.freeze({
  gone:   'That exercise is not in your library.',
  listed: 'That exercise is already on this workout.',
  cardio: 'A swap stays on its own side of the line between cardio and lifting.'
});

/* "Fewer exercises": the last isolation lift by coach-tags' `load`, and only
   when there is none, the last exercise. A custom exercise has no load, so it
   is never taken for an isolation lift — it goes only as the last one. */
function fewerOpts(o, laid) {
  if (laid.length < 2) return null;
  let at = -1;
  for (let k = laid.length - 1; k >= 0; k--) {
    const t = tagsFor(laid[k].exId);
    if (t && t.load === 'isolation') { at = k; break; }
  }
  const out = laid[at === -1 ? laid.length - 1 : at];
  return optsOut({ ...o, drop: o.drop.concat(out.slot).sort((a, b) => a - b) });
}

/* "Train something else": his other recurring shapes, then the six groups —
   each only if it builds, and each only once. Two options that would build
   from the same session are the same option wearing two names, so the second
   is dropped, and so is anything built from the session already on screen. */
function focusOptions(i, focus, base) {
  const out = [];
  const used = new Set([baseId(base)]);
  const offer = (id, label) => {
    const p = build(i, normOpts({ focus: id }), false);
    if (!p || used.has(p.base.id)) return;
    used.add(p.base.id);
    out.push({ label, opts: { focus: id } });
  };
  (Array.isArray(i.shapes) ? i.shapes : []).forEach(sh => {
    if (sh && 'shape:' + sh.key !== focus.id) offer('shape:' + sh.key, cap(String(sh.name || '')));
  });
  GROUP_ORDER.forEach(g => { if ('group:' + g !== focus.id) offer('group:' + g, GROUPS[g].label); });
  return out;
}

const baseId = s => String((s.session && s.session.id) || s.startedAt);

/* ================================================================
   WHAT TO TRAIN — the question "Make me a workout" asks first
   ================================================================
   "Make me a workout" asks before it builds, and these are the answers it
   offers, decided here and nowhere else — the sheet only draws them. First
   Coach's own pick: the DEFAULT focus, which is the shape session.shapeOverdue
   names — the same focus the answer to "What should I train today?" is about,
   so "Tell me what to train" and "Build it" build the same workout. Then his
   recurring shapes, named by the rule every other sentence uses (his routine's
   name when he has one), then the six groups in their usual order.

   EACH ONE ONLY IF propose() REALLY ANSWERS IT. A chip that opens on "Coach
   can't build that one" is worse than one fewer chip. Nothing is merged away:
   a shape's chip and a group's can build from the same session, and each is
   still the answer to its own question. */
export const BUILD_ASK = 'What do you want to train?';
export const BUILD_PICK = 'Tell me what to train';

export function buildMenu(input) {
  try {
    const i = input || {};
    const out = [];
    const offer = (id, label, opts) => {
      if (build(i, normOpts(opts), false)) out.push({ id, label, opts });
    };
    offer('pick', BUILD_PICK, {});
    (Array.isArray(i.shapes) ? i.shapes : []).forEach(sh => {
      if (sh && sh.key) offer('shape:' + sh.key, cap(String(sh.name || '')), { focus: 'shape:' + sh.key });
    });
    GROUP_ORDER.forEach(g => offer('group:' + g, GROUPS[g].label, { focus: 'group:' + g }));
    return out;
  } catch {
    return [];
  }
}

/* ================================================================
   THE PROPOSAL
   ================================================================ */

/* propose(input, opts) -> a proposal, or null.

   NULL IS ALWAYS ALLOWED. Silence over a guess, as everywhere else in Coach:
   a live session, a library not yet read, a log below the headline finding's
   own gate, a focus with nothing behind it, a base session whose every
   exercise has left the library — each of them is null rather than a
   workout assembled from what was left. */
export function propose(input, opts) {
  try {
    return build(input || {}, normOpts(opts), true);
  } catch {
    return null;
  }
}

/* The sentence the sheet shows in place of a proposal while a session is
   running — and only when there would otherwise have been one, so it never
   promises a workout the log could not build. */
export function liveRefusal(input) {
  const i = input || {};
  if (i.live !== true) return null;
  try {
    return build({ ...i, live: false }, normOpts({}), false) ? LIVE_LINE : null;
  } catch {
    return null;
  }
}

function build(i, o, top) {
  // NOT DURING A LIVE SESSION. startWorkout replaces the session outright.
  if (i.live === true) return null;
  if (i.libReady !== true) return null;

  const focus = focusOf(i, o.focus);
  if (!focus) return null;
  // The headline finding's own gate, evaluated by coach.js and not restated:
  // twelve weeks holding six sessions and a recurring shape. A group needs
  // one session that qualifies, which baseFor() is the test of.
  if (focus.kind === 'shape' && i.ready !== true) return null;

  const base = baseFor(i, focus);
  if (!base) return null;

  const lib = i.lib || {};
  const seen = lastSeenIndex(i);

  /* WHAT IS LEFT OUT. Hidden, or no longer in the library — said once, by
     name, and never replaced with something Coach picked instead. Everything
     else stands, a custom exercise above all: it is his. */
  const rows = [];
  const leftOut = [];
  (base.session.exercises || []).forEach((ex, slot) => {
    if (!ex || !ex.exId) return;
    const st = standing(i, ex.exId);
    if (st !== 'live') {
      if (!leftOut.some(x => x.exId === ex.exId)) {
        leftOut.push({ exId: ex.exId, name: String(ex.name || ex.exId), why: st });
      }
      return;
    }
    if (o.drop.includes(slot)) return;
    rows.push({ slot, from: ex.exId, ex });
  });

  const chosen = rows.map(r => {
    const to = o.swap[r.from];
    const swapped = !!to && standing(i, to) === 'live';
    const exId = swapped ? to : r.from;
    const row = lib[exId] || {};
    /* A swapped-in exercise brings its OWN last numbers, from the last
       session it was in, and says which session that was. Carrying the
       replaced exercise's numbers across would be a weight he lifted on
       something else. Never logged at all, it takes the replaced exercise's
       shape — how many sets, of which types — and no numbers whatever. */
    let sets, source = null;
    if (swapped && seen[exId]) {
      sets = seen[exId].sets.map(copySet);
      source = seen[exId];
    } else if (swapped) {
      sets = (r.ex.sets || []).map(s => ({ w: '', r: '', type: copySet(s).type, ...dpOf(s) }));
    } else {
      sets = (r.ex.sets || []).map(copySet);
    }
    return {
      slot: r.slot, from: r.from, exId, swapped, source,
      name: String(row.name || (swapped ? exId : r.ex.name || exId)),
      group: row.group || (swapped ? null : r.ex.group) || null,
      equipment: row.equipment || (swapped ? null : r.ex.equipment) || null,
      ...(r.ex.block ? { block: r.ex.block } : null),
      sets
    };
  });

  /* v54: HIS FOCUS COMES FIRST (spec §6.5, SHIP-V54-PROMPT §7). With a focus
     group set (Settings → Coach → Your goal), the proposal's exercises of
     that group move to the top, and everything else follows — each side in
     the order he did it. Nothing is added or dropped, no set changes, and a
     session with lifting blocks keeps his order whole: a block's order is his
     structure, and it is never split to move one exercise. A proposal with
     none of the group, or nothing else, is as it was. */
  const fg = typeof i.focusGroup === 'string' && GROUPS[i.focusGroup] ? i.focusGroup : null;
  const mine = fg ? chosen.filter(e => e.group === fg) : [];
  const ordered = fg && !chosen.some(e => e.block) && mine.length && mine.length < chosen.length
    ? mine.concat(chosen.filter(e => e.group !== fg)) : chosen;
  const focusMoved = ordered.some((e, k) => e !== chosen[k]);

  // The block annotations come across exactly as he recorded them; a drop
  // that empties a block renumbers the rest the way every other editor of a
  // block does, through the shared pure model rather than a copy of it.
  const laid = normalizeBlocks(ordered, blockOrder(ordered)).exercises;
  if (!laid.length) return null;

  const u = i.u === 'kg' ? 'kg' : 'lb';
  const layoff = Number.isFinite(i.layoffDays) ? { days: i.layoffDays } : null;
  const name = focus.kind === 'shape' && focus.routine ? focus.name : cap(focus.name);
  const bid = baseId(base);

  /* THE TARGETS (v48), one per row, from that lift's own history across the
     whole log — not only the base session — so a bench done more recently on
     another day is the bench it is built from. Cardio and a switched-off
     category have none. Exposures are read once per lift per proposal: a
     duplicated block is one lift. */
  const expo = new Map();
  const exposures = id => {
    if (!expo.has(id)) expo.set(id, exposuresFor(i.log, id));
    return expo.get(id);
  };
  const goal = i.goal || {}, energy = i.energy || {};
  const ctx = { now: i.now, u, aim: goal.aim || null, exp: goal.exp || null,
                energy: energy.context || null, rateWk: Number.isFinite(energy.rateWk) ? energy.rateWk : null };
  const targetOf = e => {
    if (i.targetsOn !== true) return null;
    const days = (i.groupDays || {})[e.group];
    // v52: targetFor(), with his bad-day mark on this lift — prescribe()
    // itself, byte for byte, when there is none.
    const t = targetFor({ exId: e.exId, name: e.name, group: e.group, equipment: e.equipment,
                          exposures: exposures(e.exId), groupDaysSince: Number.isFinite(days) ? days : null }, ctx,
                        (i.marks && i.marks[e.exId]) || null);
    if (!t) return null;
    /* Built from a different day than the numbers on this row? Then say which,
       before the line about how much Coach has seen of the lift. A target
       from before a marked session names no day: the last time he did this
       lift IS the marked session. */
    const shown = e.source ? e.source.date : base.date;
    if (!t.from || t.from.date === shown) return t;
    const why = t.why.slice();
    const at = why.findIndex(w => /^Coach is learning/.test(w));
    why.splice(at === -1 ? why.length : at, 0, t.marked ? 'Worked out from before your marked session.'
      : 'Worked out from ' + sessionDay(t.from.date, t.from.daysAgo) + ', the last time you did this lift.');
    return { ...t, why };
  };
  const targets = laid.map(targetOf);

  /* THE THREE VIEWS OF THE NUMBERS, one proposal.

     `placeholders` is exactly what routines.js toSession() makes of a routine
     saved from this session — empty boxes with the logged numbers as ghost
     text — so "Start it" and "Save as routine, then start it" are the same
     workout. `lastNumbers` is the same sets with the boxes filled and nothing
     ticked: a number he forgot to change still cannot become a set he did,
     because a set is only logged once he ticks it.

     THE LAYOFF STEP-DOWN IS A REFUSAL, NOT A PERCENTAGE. When
     returning_from_layoff fires, the pre-filled view does not exist. */
  const shell = e => ({
    exId: e.exId, name: e.name, group: e.group, equipment: e.equipment,
    ...(e.block ? { block: e.block } : null)
  });
  const placeholders = {
    name,
    exercises: laid.map(e => ({
      ...shell(e),
      sets: e.sets.map(s => ({ w: '', r: '', type: s.type, done: false, tw: s.w || '', tr: s.r || '', ...dpOf(s) }))
    }))
  };
  const lastNumbers = layoff ? null : {
    name,
    exercises: laid.map(e => ({
      ...shell(e),
      sets: e.sets.map(s => ({ w: s.w, r: s.r, type: s.type, done: false, tw: s.w || '', tr: s.r || '', ...dpOf(s) }))
    }))
  };
  // What saveSessionAsRoutine() is handed: a record's shape, whose weights it
  // turns into targets. Its `name` is what the name box opens holding.
  const record = {
    name,
    exercises: laid.map(e => ({
      ...shell(e),
      sets: e.sets.map(s => ({ w: s.w || '', r: s.r || '', type: s.type, ...dpOf(s) }))
    }))
  };

  /* `targets` is the placeholders' shape — empty boxes, nothing ticked — with
     Coach's targets as the ghost text: what "Start with Coach’s targets"
     starts. A row whose target carries sets takes them (they are the lift's
     last session, which may not be this one); a row with none keeps its
     placeholder sets untouched. A lift in a duplicated block is ONE exposure
     with its sets concatenated, so its target's sets are split back across
     the rows in order — only when they add up exactly, and otherwise every
     row of it keeps its placeholders rather than guess which set is whose.
     Null when no row has a target with sets. */
  const ghost = s => ({ w: '', r: '', type: s.type, done: false, tw: s.tw, tr: s.tr, ...dpOf(s) });
  const offset = new Map();
  const targetSets = laid.map((e, n) => {
    const t = targets[n];
    if (!t || !t.sets.length) return null;
    const rows = laid.map((x, k) => [x, k]).filter(([x]) => x.exId === e.exId);
    if (rows.length === 1) return t.sets.map(ghost);
    if (rows.reduce((a, [x]) => a + x.sets.length, 0) !== t.sets.length) return null;
    const from = offset.get(e.exId) || 0;
    offset.set(e.exId, from + e.sets.length);
    return t.sets.slice(from, from + e.sets.length).map(ghost);
  });
  const targetsView = targetSets.some(Boolean) ? {
    name,
    exercises: laid.map((e, n) => ({
      ...shell(e),
      sets: targetSets[n] || e.sets.map(s => ({ w: '', r: '', type: s.type, done: false, tw: s.w || '', tr: s.r || '', ...dpOf(s) }))
    }))
  } : null;

  /* THE WORDS. Every one of them built from a fact, and every number in them
     read off the log or counted from it. */
  const headline = 'Built from ' + sessionWhen(base.daysAgo, base.date) + ' — ' +
    (focus.kind === 'shape'
      ? 'your most recent ' + focus.name + '.'
      : 'the most recent with two or more working sets for ' + groupWord(focus.group) + '.');

  const reason = [];
  if (focus.kind === 'shape' && focus.overdue && i.overdueWhy) {
    reason.push((i.overdueSkipped ? 'It has waited longest of what’s recovered: '
                                  : 'It has waited longest of the sessions you repeat: ') + i.overdueWhy + '.');
  } else if (focus.kind === 'shape' && Number.isFinite(focus.count)) {
    reason.push('It has come round ' + plural(focus.count, 'time') + ' in the last twelve weeks.');
  } else if (focus.kind === 'group') {
    const n = (i.groupDays || {})[focus.group];
    if (Number.isFinite(n)) {
      reason.push(n === 0 ? 'You trained ' + groupWord(focus.group) + ' today.'
                          : plural(n, 'day') + ' since your last working set for ' + groupWord(focus.group) + '.');
    }
  }
  // v54: and when his focus moved anything, it says so.
  if (focusMoved) reason.push('Your focus, ' + groupWord(fg) + ', comes first.');

  const routineLine = focus.routine && focus.routine.name
    ? 'You have a routine for this: ' + focus.routine.name + '.' : null;
  const layoffLine = layoff
    ? 'Your last session was ' + plural(layoff.days, 'day') + ' ago — targets are there as a guide.' : null;
  const leftOutLine = leftOut.length
    ? 'Left out: ' + leftOut.map(x => x.name + ' — ' +
        (x.why === 'hidden' ? 'hidden in your library' : 'not in your library')).join('; ') + '.'
    : null;

  const key = 'build:' + focus.id + '@' + bid +
    (o.drop.length ? '|drop:' + o.drop.join(',') : '') +
    (Object.keys(o.swap).length ? '|swap:' + Object.keys(o.swap).map(k => k + '>' + o.swap[k]).join(',') : '');

  return {
    key,
    focus: { kind: focus.kind, id: focus.id, groups: focus.groups, label: cap(focus.name) },
    name,
    base: { id: bid, date: base.date, daysAgo: base.daysAgo, startedAt: base.startedAt },
    routine: focus.routine ? { id: focus.routine.id || null, name: String(focus.routine.name) } : null,
    headline, reason, routineLine, layoffLine, leftOutLine,
    layoff,
    leftOut,
    exercises: laid.map((e, n) => {
      const said = nudge(e.sets);
      const note = !e.swapped ? said
        : e.source ? 'Numbers from ' + sessionWhen(e.source.daysAgo, e.source.date) + '.' + (said ? ' ' + said : '')
        : 'Not in your log yet, so there are no numbers to show.';
      return {
        slot: e.slot, exId: e.exId, from: e.from, name: e.name, group: e.group,
        block: e.block || null, swapped: e.swapped,
        line: setsLine(e.sets, u), note,
        // What to put on the bar, beside the note and never inside it.
        target: targets[n],
        swaps: top ? swapOptions(i, o, laid, e, seen) : [],
        other: top ? otherFor(i, laid, e) : null
      };
    }),
    placeholders, lastNumbers, record,
    targets: targetsView,
    fewer: top ? fewerOpts(o, laid) : null,
    focuses: top ? focusOptions(i, focus, base) : []
  };
}
