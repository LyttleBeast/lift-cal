// Coach in the gym — what to do next, read off the session in front of it.
//
// Ship one taught Coach to READ the log and ship two to BUILD from it. This is
// ship three, part one: during a live workout it can say what usually comes
// next, that one more set is in line with what he usually does, that a group
// has had its usual and another is waiting — or that he is probably done for
// the day. It speaks when he asks, or once, quietly, when a set has just
// finished an exercise. Never otherwise.
//
// MID-WORKOUT IS THE MOST SENSITIVE PLACE COACH WILL EVER SPEAK. He is under a
// bar, and three things follow from that, each of them a line in this file:
//
//   NO WEIGHT, EVER. Nothing here says heavier, lighter, or a number to put on
//   the bar. Progression is the builder's nudge and stays there. The one
//   weight this file may print is a quote of a set he logged — "Last time on
//   Cable Fly: 3 × 12 at 40 lb" — through units.js, the way every load on
//   every screen is printed.
//   NEVER A SET AFTER A FAILURE. An exercise with a set typed F today is never
//   told "one more set", and neither is one whose reps have fallen away.
//   WHEN THE SIGNALS DISAGREE, DONE WINS. Stopping one set early costs nothing;
//   Coach pushing a tired set is the one thing this ship must never do. So the
//   answers are tried in a fixed order and "you're probably good for today"
//   is tried first.
//
// A WRONG NUMBER IS WORSE THAN NO NUMBER, and silence is always an answer. Every
// rule below needs three of HIS sessions behind it before it says anything,
// and "usually" is only ever said of something that is true more often than
// not. Everything it knows about his habits comes from his own log; there is
// no programme in here and no population anywhere.
//
// FOUR ANSWERS, OR NONE (liveRead):
//
//   done     his usual length for a session of this shape, in working sets,
//            is reached, or the last two exercises both show fatigue. Tried
//            FIRST.
//   switch   the current exercise's group has had its usual sets for a
//            session, and the shape he usually trains has a group with nothing
//            in it yet today. Names the group, and the exercise his sessions
//            of this kind usually open it with.
//   another  one more set of the current exercise is in line with what he
//            usually does for it, and nothing in today's sets of it shows
//            fatigue.
//   next     the exercise that most often comes straight after the ones done
//            so far, in his own sessions of this shape — when it is not
//            already on today's list.
//
// FATIGUE, from what the log holds (there is no RIR, and there is not going to
// be a guess at one): a set typed F; or, on the same exercise at the same or a
// lighter weight, reps falling a quarter or more from that session's first
// working set. A warm-up is not a working set, so how many warm-ups there were
// is never fatigue.
//
// PURE, and copied into the native tree verbatim (src/pure/coach-live.js). No
// reads, no DOM, no clock, no module state. And it derives nothing about the
// log on its own: the twelve-week window and the recurring shapes (§3.3) are
// coach.js's, gathered by liveInput() there and handed in, so "what counts as
// a chest and arms day" still has exactly one definition in the tree.
//
// THE INPUT, as coach.js builds it:
//
//   now       the clock, an argument as everywhere in Coach
//   u         'lb' | 'kg', for the quote of a logged set and nothing else
//   session   the LIVE session: { startedAt, exercises: [{ exId, name, group,
//             equipment, block?, sets: [{ w, r, type, done, tw?, tr? }] }] }.
//             Read, never written — the workout screen edits it in place
//   current   the index in session.exercises of the exercise in hand (the one
//             whose set was just ticked), or null to work it out
//   sessions  coach.js's inWindow(): the last twelve weeks of sessions, oldest
//             first, each shaped { startedAt, date, daysAgo, signature,
//             session } with the raw record under `session`. Called what
//             builderInput calls the same list, and never `window`, which in a
//             module shadows the browser's global for the whole scope
//   shapes    session.shapes — the recurring shapes, each with the signature
//             keys merged into it (`members`) and the name Coach calls it by
//   lib       exId -> { name, group, equipment }: the library the picker
//             shows, hidden ones absent
//   hidden    the ids taken out of the picker
//
// The live facts see the ACTIVE session and nothing else. A second session on
// the same day — one already finished and saved this morning — is in the log
// as a session of its own, and nothing here adds its sets to today's. That is
// in BACKLOG.md rather than solved here.
//
// Imports exercises.js, units.js and the session MATH of analytics.js. coach.js
// imports this; nothing imports back.

import { GROUPS, GROUP_ORDER } from './exercises.js';
import { isWorking, mergeSessionExercises } from './analytics.js';
import { fmtSetLoad, unitW } from './units.js';

/* Three sessions before any habit is called one. Two is a coincidence and a
   median of two is the average of a coincidence. */
export const MIN_SESSIONS = 3;

/* "Usually" has to be true of the sentence it is in: the thing named happened
   in MORE than half of the sessions counted, or it is not said. Half and half
   is a coin, not a habit. */
export const USUALLY = 0.5;

/* A quarter of the reps gone at the same or a lighter load is the plainest sign
   in the log that a set cost more than the first one did; less than that is
   ordinary set-to-set noise that a lifter shrugs off. */
export const REP_DROP = 0.25;

/* The order the answers are tried in, and it is the stopping bias written down:
   done before anything, then the answer that moves him off a group that has
   had its usual, then one more set, then the next exercise. */
export const LIVE_KINDS = Object.freeze(['done', 'switch', 'another', 'next']);

/* What the sheet says when none of the four has earned a sentence. Here rather
   than in the view, so the same fences that read every other line in this file
   read this one. */
export const LIVE_NONE = Object.freeze({
  text: 'Nothing Coach can add from your log right now.',
  why: Object.freeze([
    'It answers from your own sessions of this kind, and wants three of them in the last twelve weeks ' +
    'before it calls anything usual.'
  ])
});

/* ---------- small words ----------
   "This session", never "today", for what has been ticked: a session started
   at eleven at night is still one session at one in the morning, and a right
   count under a wrong calendar word is the defect v45 fixed on the greeting.
   The one "today" is the brief's own — "you're probably good for today" —
   which is about stopping, not about counting. */
const plural = (n, word) => n + ' ' + word + (Number(n) === 1 ? '' : 's');
// One decimal, a trailing .0 dropped: a median of eight is "8", of eight and
// nine "8.5". The same treatment coach.js gives every count-ish average.
const one = n => String(Math.round(n * 10) / 10).replace(/\.0$/, '');
const Group = g => (GROUPS[g] && GROUPS[g].label) || String(g);
const groupWord = g => Group(g).toLowerCase();

function median(xs) {
  const v = xs.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function andList(names) {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

const reps = s => { const n = parseInt(s && s.r, 10); return Number.isFinite(n) && n > 0 ? n : 0; };
const load = s => parseFloat(s && s.w) || 0;

/* A set that counts: not a warm-up, and with reps in it. In a LOGGED session
   every set was ticked, because collectFrom keeps nothing else; in the live one
   it also has to be ticked — the same three things collectFrom needs before a
   set can reach the log at all. */
const loggedWorking = s => !!(s && isWorking(s) && reps(s) > 0);
const liveWorking = s => !!(s && s.done && loggedWorking(s));

/* ================================================================
   WHAT THE LIBRARY SAYS
   ================================================================
   The merged library wins, and the record's own fields stand in for an id
   that no longer resolves — the same fallback coach.js makes, for the same
   reason: a deleted exercise must not erase the session it was in. */
const libOf = (i, id) => (i.lib && i.lib[id]) || null;
const groupOf = (i, ex) => (libOf(i, ex.exId) && libOf(i, ex.exId).group) || ex.group || null;
const cardioOf = (i, ex) => ((libOf(i, ex.exId) && libOf(i, ex.exId).equipment) || ex.equipment) === 'cardio';
const nameOf = (i, ex) => String((libOf(i, ex.exId) && libOf(i, ex.exId).name) || ex.name || ex.exId);

/* Whether an exercise can be put in front of him: in the picker today, not
   hidden. Anything else is never suggested — a suggestion he cannot add is a
   suggestion that goes nowhere. */
function pickable(i, exId) {
  if (Array.isArray(i.hidden) && i.hidden.includes(exId)) return false;
  const x = libOf(i, exId);
  return !!(x && x.group && GROUPS[x.group]);
}

/* ================================================================
   TODAY
   ================================================================
   The live session, merged the way every reader of a session merges it (one
   logical entry per exId), with the positions that say what order things
   happened in. There is no timestamp on a set, so "the exercise in hand" is
   the one the caller names, or else the last one on the list that has a
   ticked working set in it. */
function todayOf(i) {
  const raw = i.session && Array.isArray(i.session.exercises) ? i.session.exercises : [];
  const entries = mergeSessionExercises(raw).filter(ex => ex && ex.exId).map(ex => {
    let last = -1;
    raw.forEach((e, k) => { if (e && e.exId === ex.exId && (e.sets || []).some(liveWorking)) last = k; });
    return {
      exId: ex.exId, name: nameOf(i, ex), group: groupOf(i, ex), cardio: cardioOf(i, ex),
      first: raw.findIndex(e => e && e.exId === ex.exId),
      last,
      sets: (ex.sets || []).filter(liveWorking)
    };
  });
  const worked = entries.filter(e => e.sets.length);
  const groupSets = {};
  worked.forEach(e => { if (!e.cardio && e.group) groupSets[e.group] = (groupSets[e.group] || 0) + e.sets.length; });

  let current = null;
  const hint = Number.isInteger(i.current) && raw[i.current] ? raw[i.current].exId : null;
  if (hint) current = entries.find(e => e.exId === hint) || null;
  if (!current && worked.length) current = worked.slice().sort((a, b) => b.last - a.last)[0];

  return {
    entries, worked, groupSets, current,
    ids: new Set(entries.map(e => e.exId)),
    total: worked.filter(e => !e.cardio).reduce((a, e) => a + e.sets.length, 0),
    // Planned counts too: a session started from a routine or the builder
    // already says what shape it is before a single set is ticked.
    planned: GROUP_ORDER.filter(g => entries.some(e => !e.cardio && e.group === g))
  };
}

/* ================================================================
   HIS LOG
   ================================================================
   Each session in the window, reduced to what the rules ask of it: the
   exercises in the order he did them, the working sets of each, the working
   sets per group and in total. Cardio counts toward nothing here, the way it
   counts toward no signature. */
function historyOf(i) {
  const list = Array.isArray(i.sessions) ? i.sessions : [];
  return list.filter(s => s && s.session).map(s => {
    const order = mergeSessionExercises(s.session.exercises).filter(ex => ex && ex.exId).map(ex => ({
      exId: ex.exId, name: nameOf(i, ex), group: groupOf(i, ex), cardio: cardioOf(i, ex),
      sets: (ex.sets || []).filter(loggedWorking)
    })).filter(ex => ex.sets.length);
    const groupSets = {};
    order.forEach(ex => { if (!ex.cardio && ex.group) groupSets[ex.group] = (groupSets[ex.group] || 0) + ex.sets.length; });
    return {
      startedAt: s.startedAt, date: s.date,
      key: Array.isArray(s.signature) ? s.signature.join('+') : '',
      order, groupSets,
      total: order.filter(ex => !ex.cardio).reduce((a, ex) => a + ex.sets.length, 0)
    };
  });
}

/* WHICH SHAPE THIS IS. The shapes are coach.js's clusters, and a session
   belongs to one when its signature is one of the cluster's members — the same
   test the builder uses, so there is still one definition of §3.3. Today is
   unfinished, so its signature is not known yet; what is known is which groups
   are on the list. The shape whose members include exactly those groups wins;
   failing that, the most-trained shape that contains them all; failing that,
   the one containing the groups actually worked so far. No shape, no answer
   that needs one. */
function shapeOf(i, t) {
  const shapes = Array.isArray(i.shapes) ? i.shapes : [];
  const covers = gs => sh => gs.every(g => (sh.groups || []).includes(g));
  const planned = t.planned;
  const worked = GROUP_ORDER.filter(g => t.groupSets[g] > 0);
  return (planned.length && shapes.find(sh => (sh.members || []).includes(planned.join('+')))) ||
         (planned.length && shapes.find(covers(planned))) ||
         (worked.length && shapes.find(covers(worked))) ||
         null;
}

// "chest and arms days", or "Push A sessions" when the shape is named by his
// own routine — a routine name is not a noun that takes an s. With a count,
// the count leads: "7 chest and arms days".
const kindOf = sh => (sh.routine ? String(sh.name) + ' sessions' : String(sh.name) + 's');
const kindsOf = (sh, n) => plural(n, sh.routine ? String(sh.name) + ' session' : String(sh.name));

/* The last time an exercise was in the log inside the window, as a quote: runs
   of identical working sets, the way somebody says them out loud. Every load
   through units.js, a bodyweight set said in words, and a unit word only ever
   from unitW. THIS IS A QUOTE, NEVER A SUGGESTION — it prints what he lifted,
   on the day he lifted it, and nothing here ever prints any other weight. */
function lastTime(i, history, exId, name) {
  for (let k = history.length - 1; k >= 0; k--) {
    const ex = history[k].order.find(e => e.exId === exId);
    if (!ex) continue;
    const u = i.u === 'kg' ? 'kg' : 'lb';
    const runs = [];
    ex.sets.forEach(s => {
      const key = s.type + '|' + String(s.w) + '|' + String(s.r);
      const prev = runs[runs.length - 1];
      if (prev && prev.key === key) { prev.n++; return; }
      runs.push({ key, n: 1, s });
    });
    const line = runs.map(x => {
      const shown = x.s.w === '' || x.s.w == null ? '' : fmtSetLoad(x.s.w, u);
      const at = shown === '' ? '' : shown === 'BW' ? ' at bodyweight' : ' at ' + shown + ' ' + unitW(u);
      return x.n + ' × ' + reps(x.s) + at + (x.s.type === 'F' ? ' to failure' : x.s.type === 'D' ? ' drop set' : '');
    }).join(', ');
    return line ? 'Last time on ' + name + ': ' + line + '.' : null;
  }
  return null;
}

/* ================================================================
   FATIGUE
   ================================================================
   Today's working sets of one exercise, in the order they were done. Returns
   what the log shows, or null when it shows nothing. */
function fatigueIn(sets) {
  if (!sets.length) return null;
  if (sets.some(s => s.type === 'F')) return { kind: 'failure' };
  const first = sets[0];
  for (let k = 1; k < sets.length; k++) {
    const s = sets[k];
    if (load(s) <= load(first) && reps(s) <= reps(first) * (1 - REP_DROP)) {
      return { kind: 'drop', from: reps(first), to: reps(s) };
    }
  }
  return null;
}
const fatigueWords = f => (f.kind === 'failure' ? 'a set taken to failure'
  : 'reps from ' + f.from + ' to ' + f.to + ' at the same or a lighter weight');

/* ================================================================
   THE FOUR
   ================================================================ */

function doneRead(i, t, history, shape) {
  /* The usual length of a session like this one, in working sets — his
     sessions of this SHAPE, and nothing else. Every session in the window was
     the first draft's fallback, and it pooled short leg days with long chest
     days: "7 working sets against a usual 5.5" to somebody half way through a
     chest day. A usual length is only a usual length among sessions of the
     same kind, so without three of them there is no length at all, and only
     fatigue can say stop. */
  const mine = shape ? history.filter(s => (shape.members || []).includes(s.key)) : [];
  const usual = mine.length >= MIN_SESSIONS ? median(mine.map(s => s.total)) : null;
  const long = usual != null && t.total > 0 && t.total >= usual;

  // The last two exercises worked, and what their sets show — said in the
  // order he did them.
  const lastTwo = t.worked.slice().sort((a, b) => b.last - a.last).slice(0, 2)
    .sort((a, b) => a.first - b.first)
    .map(e => ({ e, f: fatigueIn(e.sets) }));
  const tired = lastTwo.length === 2 && lastTwo.every(x => x.f);

  if (!long && !tired) return null;

  const why = [];
  if (long) {
    why.push(plural(t.total, 'working set') + ' so far this session. Across your ' + kindOf(shape) +
             ' in the last twelve weeks, the median is ' + one(usual) + '.');
  }
  if (tired) lastTwo.forEach(x => why.push(x.e.name + ': ' + fatigueWords(x.f) + '.'));
  why.push('Coach leans to stopping when the log points both ways: a set left undone costs nothing.');

  return {
    kind: 'done', exId: null, add: null,
    text: 'You’re probably good for today — ' + (long
      ? plural(t.total, 'working set') + ' against a usual ' + one(usual) + '.'
      : lastTwo.map(x => x.e.name + ', ' + fatigueWords(x.f)).join('; ') + '.'),
    short: long ? 'You’re probably good for today: ' + plural(t.total, 'working set') + '.'
                : 'You’re probably good for today.',
    why
  };
}

function switchRead(i, t, history, shape) {
  const cur = t.current;
  if (!cur || cur.cardio || !cur.group || !shape) return null;
  const g = cur.group;
  const had = t.groupSets[g] || 0;
  if (!had) return null;
  const counts = history.filter(s => s.groupSets[g] > 0).map(s => s.groupSets[g]);
  if (counts.length < MIN_SESSIONS) return null;
  const usual = median(counts);
  if (had < usual) return null;

  // What is left of the shape: its groups with no working set today, in the
  // order his sessions of this kind usually reach them.
  const members = history.filter(s => (shape.members || []).includes(s.key));
  const left = (shape.groups || []).filter(x => x !== g && !(t.groupSets[x] > 0)).map(x => {
    const at = members.map(s => s.order.findIndex(ex => !ex.cardio && ex.group === x)).filter(n => n >= 0);
    return { group: x, at: median(at) };
  }).filter(x => x.at != null)
    .sort((a, b) => a.at - b.at || GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  if (!left.length) return null;
  const next = left[0].group;

  // The exercise those sessions usually open that group with — his, pickable,
  // and not already on today's list. Without one the answer still stands; it
  // just has nothing to add.
  const firsts = {};
  let withGroup = 0;
  members.forEach(s => {
    const ex = s.order.find(e => !e.cardio && e.group === next);
    if (!ex) return;
    withGroup++;
    const f = firsts[ex.exId] || (firsts[ex.exId] = { exId: ex.exId, n: 0, at: 0 });
    f.n++;
    if (s.startedAt > f.at) f.at = s.startedAt;
  });
  const lead = Object.values(firsts)
    .filter(f => pickable(i, f.exId) && !t.ids.has(f.exId))
    .sort((a, b) => b.n - a.n || b.at - a.at || (a.exId < b.exId ? -1 : 1))[0] || null;
  const add = lead ? addOf(i, lead.exId) : null;

  return {
    kind: 'switch', exId: add ? add.id : null, group: next, add,
    text: Group(g) + ' has had its usual this session — ' + plural(had, 'working set') + ' against a median of ' +
          one(usual) + '. ' + Group(next) + ' is the part of your ' + String(shape.name) + ' with nothing in it yet' +
          (add ? ', and ' + add.name + ' is how you usually start it.' : '.'),
    short: 'Usual ' + groupWord(g) + ' reached: ' + had + ' sets. ' + Group(next) + ' is untouched.',
    why: [
      plural(had, 'working ' + groupWord(g) + ' set') + ' this session. Across your ' + plural(counts.length, 'session') +
        ' with ' + groupWord(g) + ' in the last twelve weeks, the median is ' + one(usual) + '.',
      Group(next) + ' is in your ' + String(shape.name) + ' and has no working set this session.',
      add ? add.name + ' came first for ' + groupWord(next) + ' in ' + lead.n + ' of those ' +
            plural(withGroup, 'session') + '.' : null,
      add ? lastTime(i, history, add.id, add.name) : null
    ].filter(Boolean)
  };
}

function anotherRead(i, t, history) {
  const cur = t.current;
  if (!cur || cur.cardio || !cur.sets.length) return null;
  // Never after a set typed F, and never once the reps have fallen away.
  if (fatigueIn(cur.sets)) return null;
  const counts = history.map(s => s.order.find(ex => ex.exId === cur.exId)).filter(Boolean).map(ex => ex.sets.length);
  if (counts.length < MIN_SESSIONS) return null;
  const now = cur.sets.length;
  const more = counts.filter(n => n > now).length;
  // A strict majority: more than half of his sessions of it went past today's
  // count. That is what "usually" means, and it is never weaker than the
  // median going past it.
  if (!(more > counts.length * USUALLY)) return null;

  return {
    kind: 'another', exId: cur.exId, add: null,
    text: 'One more set of ' + cur.name + ' is in line with what you usually do: ' + (now + 1) + ' or more in ' +
          more + ' of your ' + plural(counts.length, 'session') + ' of it.',
    short: 'One more set is usual here: ' + (now + 1) + ' or more in ' + more + ' of ' + counts.length + '.',
    why: [
      plural(now, 'working set') + ' of ' + cur.name + ' so far this session — warm-ups are not counted.',
      'Across your ' + plural(counts.length, 'session') + ' of it in the last twelve weeks, ' + more +
        ' had ' + (now + 1) + ' or more.',
      'Nothing in this session’s sets of it was taken to failure, and none came in a quarter or more under the ' +
        'first set’s reps at the same or a lighter weight.'
    ]
  };
}

function nextRead(i, t, history, shape) {
  if (!shape || !t.worked.length) return null;
  const done = t.worked.slice().sort((a, b) => a.first - b.first);
  const pool = history.filter(s => (shape.members || []).includes(s.key) &&
    done.every(d => s.order.some(ex => ex.exId === d.exId)));
  if (pool.length < MIN_SESSIONS) return null;

  // In each of those sessions, the exercise straight after the last of the
  // ones he has done today. If that is already on today's list, or cannot be
  // put in front of him, the session is counted and votes for nothing.
  const votes = {};
  pool.forEach(s => {
    const lastAt = Math.max(...done.map(d => s.order.findIndex(ex => ex.exId === d.exId)));
    const after = s.order[lastAt + 1];
    if (!after || t.ids.has(after.exId) || !pickable(i, after.exId)) return;
    const v = votes[after.exId] || (votes[after.exId] = { exId: after.exId, n: 0, at: 0 });
    v.n++;
    if (s.startedAt > v.at) v.at = s.startedAt;
  });
  const best = Object.values(votes).sort((a, b) => b.n - a.n || b.at - a.at || (a.exId < b.exId ? -1 : 1))[0];
  if (!best || !(best.n > pool.length * USUALLY)) return null;

  const add = addOf(i, best.exId);
  const names = done.length <= 3 ? andList(done.map(d => d.name)) : 'the ' + done.length + ' exercises so far';
  const others = pool.length - best.n;
  return {
    kind: 'next', exId: add.id, add,
    text: 'After ' + names + ' you usually go to ' + add.name + ' — ' + best.n + ' of ' + pool.length +
          ' times in the last twelve weeks.',
    short: 'Usually next: ' + add.name + ', ' + best.n + ' of ' + pool.length + ' times.',
    why: [
      'Counted over your ' + kindsOf(shape, pool.length) + ' in the last twelve weeks with ' +
        (done.length === 1 ? 'that' : done.length === 2 ? 'both of those' : 'all of those') + ' in them.',
      add.name + ' came straight after in ' + best.n + (others
        ? '; the other ' + others + ' went elsewhere or ended there.' : '.'),
      lastTime(i, history, add.id, add.name)
    ].filter(Boolean)
  };
}

// What the picker would have handed back for this exercise: the library row
// as it stands today, so "Add it" and the picker add the very same thing.
function addOf(i, exId) {
  const x = libOf(i, exId);
  return { id: exId, name: String(x.name || exId), group: x.group, equipment: x.equipment };
}

/* ================================================================
   THE ONE ENTRY POINT
   ================================================================
   liveRead(input) -> one answer of one of the four kinds, or null.

   NULL IS ALWAYS ALLOWED, and it is the answer before a single working set is
   ticked: nothing has happened yet that anything here could be read off. */
export function liveRead(input) {
  try {
    const i = input || {};
    const t = todayOf(i);
    if (!t.worked.length) return null;
    const history = historyOf(i);
    const shape = shapeOf(i, t);
    const tries = {
      done:    () => doneRead(i, t, history, shape),
      switch:  () => switchRead(i, t, history, shape),
      another: () => anotherRead(i, t, history),
      next:    () => nextRead(i, t, history, shape)
    };
    for (const kind of LIVE_KINDS) {
      const a = tries[kind]();
      if (a) return a;
    }
    return null;
  } catch {
    return null;
  }
}
