#!/usr/bin/env node
//
// Verifier for the greeting rotation — a counter, and never the clock again.
//
//   node tools-check/coach-rotation.mjs
//
// The line at the top of the You card is the one thing in Coach that is meant
// to move. It used to be seeded off the wall clock — the open time in
// milliseconds, floored to the second, modulo the pool size — which is a hash
// of the moment somebody happened to open the app rather than a rotation, and
// a hash has no memory of what it said last time. On the live deployment three
// reloads in a row gave the identical greeting AND the identical lead
// question: the card's only moving part, sitting still, in the one place a
// person actually notices.
//
// It is a per-device open COUNTER now. coach-data.js bumps it once as the app
// opens and hands it to the engine the way it hands over the clock, and the
// last few lines come with it so a pool that changed size between two opens
// cannot land back on the line before it.
//
// What this file fences, all of it by driving the real engine:
//
//   THE PROPERTY.   No two consecutive opens ever match, on every pool this
//                   engine can be in — proved on six of them, because a
//                   rotation that only works on one pool is an accident rather
//                   than a rotation. N consecutive opens cover N distinct lines
//                   of whichever pool is in force.
//   THE OLD BUG.    The clock cannot move the line. Same counter, any time of
//                   day, same greeting — the four or five repaints the You tab
//                   makes as its reads land are one open, not five.
//   THE OTHER ONE.  Which pool is in force, and it has been wrong twice. The
//                   first version walked the data-aware lines whenever ANY of
//                   them passed a gate — a pool of one, and `n % 1` is always
//                   0, so one passing gate meant one line for ever. The second
//                   walked the whole ordered pool instead, and five live opens
//                   in a row came up generic on a log with several data lines
//                   eligible. Two or more is the line between them, and this
//                   file holds both ends of it: never a repeat, AND at least
//                   two thirds of a long run saying something about the log.
//   THE WITHHOLDING. A generic line the walk never offers is the rule working,
//                   not the walk shrinking — but only where two or more data
//                   lines qualify. Everywhere else it is still the old bug, so
//                   the file asserts which case each fixture is in first and
//                   reads everything else through that.
//   TOTALITY.       A counter that came back from device storage as null, NaN,
//                   negative or enormous still yields a line with words in it.
//   THE DEVICE.     The counter moves once per app OPEN and never per paint,
//                   and it lives in localStorage rather than in settings/coach
//                   — driven across real module instances, which is what an
//                   app open actually is.
//
// Nothing in here holds a copy of the greeting table, of the pool ordering or
// of the modulo. Which lines are eligible on a given log is DISCOVERED by
// driving the engine and then checked against the real GREETINGS table, so a
// line added to coach.js tomorrow changes what this file expects rather than
// breaking it.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

const dir  = mkdtempSync(join(tmpdir(), 'rack-coach-rotation-'));
const here = f => JSON.stringify(pathToFileURL(join(dir, f)).href);

/* One store stub for both halves. It is the device as well as the database:
   the LS shim is backed by a Map that outlives every module instance below,
   which is what lets an app OPEN be simulated honestly — a fresh copy of
   coach-data.js against storage that remembers. `writes` is recorded because
   one of the things worth proving is that the rotation never writes anything
   to the database at all. */
writeFileSync(join(dir, 'store-stub.mjs'), `
const mem = new Map();
export const writes = [];
export const LS = {
  get(k, fallback) { return mem.has(k) ? JSON.parse(mem.get(k)) : fallback; },
  set(k, v) { mem.set(k, JSON.stringify(v)); },
  del(k) { mem.delete(k); }
};
export function wu() { return 'lb'; }
export async function read(_p, fallback) { return fallback; }
export async function readExact(_p) { return null; }
export async function write(path, value) { writes.push([path, value]); return true; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`);
writeFileSync(join(dir, 'analytics.mjs'), src('analytics.js')
  .replace("from './store.js'", 'from ' + here('store-stub.mjs'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './ui.js'", 'from ' + real('ui.js'))
  .replace("from './units.js'", 'from ' + real('units.js')));
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './analytics.js'", 'from ' + here('analytics.mjs')));
const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 8).join(', ') + (xs.length > 8 ? ' … (' + xs.length + ')' : '');
const sameSet = (a, b) => a.length === b.length && a.slice().sort().join() === b.slice().sort().join();
const line = id => C.GREETINGS.find(g => g.id === id) || {};

/* ---------- the log every fixture is cut from ----------
   Local noon of a fixed day, because two checks below move the wall clock by
   an hour and a fixture pinned near midnight would cross into another day key
   — which would change the eligible pool and prove nothing about the clock. */
const DAY = 864e5;
const NOW = new Date(2026, 8, 15, 12, 0, 0, 0).getTime();
const key = ms => {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};
const NO_WEIGHT = { latestLb: null, latestAt: null, rateWk: null, rateDays: null,
                    goalDir: null, goalRateWk: null };

/* A brand-new account. Every data-aware line is gated on something and nothing
   here passes, so what is left is exactly the ungated pool — which is how this
   file gets a pool whose size it can state rather than assume. */
const QUIET = {
  now: NOW, opens: 0, recentGreets: [], u: 'lb', log: 'empty', sessions: [], lib: {},
  routines: [], live: { active: false }, tier: { pro: true },
  targets: null, targetsSet: false, summaries: {}, steps: { days: {} }, weight: NO_WEIGHT,
  settings: { v: 1, mute: {}, answers: {}, asked: {} }
};
// One data line, and the reason it is its own fixture is the collapse bug: a
// pool of one repeats forever, so this is the shape that used to break.
const ONE = { ...QUIET,
  weight: { latestLb: 186.4, latestAt: NOW - 2 * DAY, rateWk: -0.8, rateDays: 21,
            goalDir: null, goalRateWk: null } };
// Two, which is where the walk changes hands: one data line falls through to the
// whole ordered pool, two keeps the rotation inside them. So this fixture is
// watched for what it STOPS offering as much as for what the log added.
const TWO = { ...ONE, summaries: { [key(NOW)]: { cal: 1800, p: 120, c: 180, f: 60 } } };

const LIB = {
  bench: { group: 'chest', equipment: 'barbell' }, row: { group: 'back', equipment: 'barbell' },
  squat: { group: 'legs', equipment: 'barbell' }, press: { group: 'shoulders', equipment: 'barbell' },
  curl:  { group: 'arms', equipment: 'dumbbell' }
};
const sets = (n, w, r) => Array.from({ length: n }, () => ({ w: String(w), r: String(r), type: 'N', done: true }));
const sess = (ago, rows, tag) => ({
  id: 's' + ago + (tag || ''), startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY),
  exercises: rows.map(([ex, n, w, r]) => ({
    exId: ex, name: ex, group: LIB[ex].group, equipment: LIB[ex].equipment, sets: sets(n, w, r || 5)
  }))
});
const summaries = {};
for (let i = 1; i <= 8; i++) summaries[key(NOW - i * DAY)] = { cal: 2450, p: 110, c: 310, f: 95 };
summaries[key(NOW)] = { cal: 900, p: 70, c: 90, f: 30 };
const training = [];
for (let w = 0; w < 12; w++) {
  if (w > 1) training.push(sess(w * 7 + 2, [['bench', 3, 185 + w], ['press', 3, 95, 8]]));
  training.push(sess(w * 7 + 4, [['row', 3, 155, 8], ['curl', 3, 40, 10]]));
  training.push(sess(w * 7 + 6, [['squat', 3, 245]]));
}
// A full account, card showing an ordinary finding.
const FULL = { ...QUIET, log: 'readable',
  sessions: training.slice().sort((a, b) => a.startedAt - b.startedAt), lib: LIB,
  targets: { cal: 2300, p: 210, f: 74, auto: { rateWk: -1 } }, targetsSet: true, summaries,
  steps: { days: Object.fromEntries([0, 1, 2, 3, 4].map(i => [key(NOW - i * DAY), { steps: i ? 9100 : 4200 }])) },
  weight: { latestLb: 186.4, latestAt: NOW - 9 * DAY, rateWk: -0.8, rateDays: 21,
            goalDir: -1, goalRateWk: -1 } };
// The same account with the category on the card switched off, so a DIFFERENT
// finding takes the slot. Nothing about the log moves — which is what makes it
// a clean read on what the finding itself does to the pool.
const FULL_MUTED = { ...FULL, settings: { ...FULL.settings, mute: { recency: true } } };
// A fortnight of chest on top, which is the caution finding.
const CAUTION = { ...FULL,
  sessions: FULL.sessions.concat([0, 1, 3, 5, 7, 9, 11].map(d => sess(d, [['bench', 3, 185]], 'x')))
    .sort((a, b) => a.startedAt - b.startedAt) };
/* The log that has plenty to say: a heavy bench today on top of the full one,
   and a step count above its own trailing week. It is here because every other
   fixture with a CONFINED walk leaves two or three lines, and a walk that
   narrow can only ever promise "not the line before it" — the memory of three
   has nowhere to bite. This one is five wide, so the memory can be asked to
   work at its full depth on a walk the change actually produces. The
   fall-through fixtures are wide enough for that too, and section F uses one;
   what they cannot show is the confined case, which is the new one. */
const RICH = { ...FULL,
  sessions: FULL.sessions.concat([sess(0, [['bench', 3, 225]], 'pr')])
    .sort((a, b) => a.startedAt - b.startedAt),
  steps: { days: { ...FULL.steps.days, [key(NOW)]: { steps: 14000 } } } };

/* One simulated app open per step: the engine gets the counter this device is
   on and the lines it has already opened with, newest first, which is exactly
   what coach-data.js hands over. The history is NOT truncated here — how deep
   the memory goes is coach.js's own business and a second copy of that number
   in this file would be a copy of a rule. Nor is it de-duplicated, which
   coach-data.js does: a line repeating inside the window is the very thing
   under test, so the strict version is the one that has to pass. */
function opens(fx, from, count) {
  const out = [];
  let history = [];
  for (let k = from; k < from + count; k++) {
    const c = C.coach({ ...fx, opens: k, recentGreets: history });
    out.push(c);
    history = [c.greet.id].concat(history);
  }
  return out;
}
const greetsOver = (fx, from, count) => opens(fx, from, count).map(c => c.greet.id);

/* What a log leaves eligible, read two ways, and both readings are needed.

   FOUND is what the engine actually offered over a long run of opens. For the
   gated lines it is the only honest answer — nothing outside coach.js can say
   which gates passed on a given log.

   The FLOOR comes from the real table instead: a line with no gate has nothing
   to fail, and the only thing that withholds one is a cautioning card taking
   the warm ones away. It is here because a pool read off the engine ALONE
   would shrink to whatever the rotation happened to visit — which is precisely
   how the clock version would have walked past this file, by never offering
   three of the seven lines it was supposed to be rotating through and then
   being asked to prove it could manage four.

   The floor is CONDITIONAL now, and knowing when is the whole of what changed.
   The rotation stays inside the data-aware lines once two of them qualify, so
   on those logs the ungated generics are withheld on purpose and a floor built
   from them would be asserting the bug. Below two the walk falls through to the
   whole ordered pool and the floor is exactly what it always was.

   Which case a fixture is in is read off the engine — the walk's own kinds say
   it — and then asserted in section A before anything else leans on it, so a
   rotation that quietly stopped offering its data lines cannot pass itself off
   as a rotation that was confined to them.

   `walk` is what the rotation may visit, and it is what every check below
   measures against. `all` is the walk plus the floor where there is one, so on
   a confined fixture the two are the same set and on a fall-through one the
   floor is already inside the walk — which means `all` is an alias and NOT a
   way to ask what the log left eligible behind the withholding. Nothing here
   can answer that question, because nothing outside coach.js can evaluate a
   gate. Do not write a check that assumes otherwise; it would assert nothing. */
const UNGATED         = C.GREETINGS.filter(g => !g.gate).map(g => g.id);
const UNGATED_NEUTRAL = C.GREETINGS.filter(g => !g.gate && g.tone !== 'warm').map(g => g.id);
const poolOf = (fx, floor) => {
  const walk = [...new Set(greetsOver(fx, 0, 40))];   // long enough to walk any pool several times
  const data = walk.filter(id => line(id).kind === 'data');
  const confined = data.length >= 2 && walk.length === data.length;
  return { floor: confined ? [] : floor, found: walk, walk, data, confined,
           all: [...new Set((confined ? [] : floor).concat(walk))] };
};

const P_QUIET   = poolOf(QUIET, UNGATED);
const P_ONE     = poolOf(ONE, UNGATED);
const P_TWO     = poolOf(TWO, UNGATED);
const P_FULL    = poolOf(FULL, UNGATED);
const P_MUTED   = poolOf(FULL_MUTED, UNGATED);
const P_RICH    = poolOf(RICH, UNGATED);
const P_CAUTION = poolOf(CAUTION, UNGATED_NEUTRAL);   // a caution card withholds the warm ones

/* ================= A. WHAT EACH LOG LEAVES ELIGIBLE ================= */
section('A. the pool is the log’s, and the card’s — stated, not assumed');
{
  check('a brand-new log leaves exactly the ungated lines eligible, and that is a pool of ' + UNGATED.length,
        sameSet(P_QUIET.found, UNGATED), list(P_QUIET.found) + ' vs ' + list(UNGATED));

  /* Which pool each fixture puts the walk in, stated before anything else
     leans on it. Two or more data-aware lines qualifying is the whole of the
     rule, so a fixture whose walk is confined has to have at least two of them
     and nothing else in it, and a fixture that fell through has to have fewer
     than two. Asserting the equivalence in both directions is what stops a
     rotation that has quietly collapsed to one line passing itself off as one
     that was correctly confined. */
  const FIXTURES = [['a new log', P_QUIET, 0], ['one data line', P_ONE, 1],
                    ['two data lines', P_TWO, 2], ['a full log', P_FULL, 3],
                    ['the same log with the card muted', P_MUTED, 3],
                    ['a log with plenty to say', P_RICH, 5],
                    ['a caution card', P_CAUTION, 2]];
  const miscounted = FIXTURES.filter(([, p, n]) => p.data.length !== n)
    .map(([n, p, want]) => n + ': ' + p.data.length + ' not ' + want);
  check('each log admits the number of data-aware lines it was built to admit', !miscounted.length,
        list(miscounted));
  const misfiled = FIXTURES.filter(([, p]) => p.confined !== (p.data.length >= 2))
    .map(([n, p]) => n + ': ' + p.data.length + ' data lines, walk of ' + p.walk.length);
  check('and the walk is inside the data lines on exactly those with two or more of them, and nowhere else',
        !misfiled.length, list(misfiled));

  /* The floor is the fixture assumption every count below rests on, so it is
     asserted rather than trusted: a line nothing is withholding has to have
     been offered — on the logs the walk can still reach it on. Where two data
     lines qualify the generics are withheld deliberately and a run that never
     offers one is the rule working; everywhere else a skipped generic is still
     the pool quietly shrinking under a rotation it was about to be asked to
     cover. */
  const fell = FIXTURES.filter(([, p]) => !p.confined);
  const unoffered = fell
    .filter(([, p]) => !p.floor.every(id => p.walk.includes(id)))
    .map(([n, p]) => n + ': ' + list(p.floor.filter(id => !p.walk.includes(id))));
  check('and every line nothing can withhold was actually offered, on the ' + fell.length +
        ' fixtures whose walk falls through to it',
        fell.length > 0 && !unoffered.length,
        fell.length ? list(unoffered) : 'no fixture falls through — this check is proving nothing');
  check('while the ones confined to their data lines offer no generic at all — the withholding is the rule, not a gap',
        FIXTURES.filter(([, p]) => p.confined).length > 0 &&
        !FIXTURES.filter(([, p]) => p.confined).some(([, p]) => p.walk.some(id => line(id).kind !== 'data')),
        list(FIXTURES.filter(([, p]) => p.confined).map(([n, p]) => n + ': ' + p.walk.length + ' wide')));

  const oneExtra = P_ONE.found.filter(id => !P_QUIET.found.includes(id));
  check('a weight trend on the same log admits exactly one data-aware line',
        oneExtra.length === 1 && line(oneExtra[0]).kind === 'data', list(oneExtra));
  const twoExtra = P_TWO.found.filter(id => !P_QUIET.found.includes(id));
  check('a day of food on top of it admits a second, and both are about what was added',
        twoExtra.length === 2 && twoExtra.every(id => line(id).kind === 'data') &&
        sameSet(twoExtra.map(id => line(id).topic), ['weight', 'fuel']),
        list(twoExtra.map(id => id + '/' + line(id).topic)));

  /* The two things the FINDING does to the pool. Both are checked in the
     positive and the negative, because "the line is missing" is also what a
     gate that stopped passing looks like. */
  const warm = P_CAUTION.all.filter(id => line(id).tone === 'warm');
  check('a caution finding withholds every warm line — the greeting may not contradict the sentence under it',
        !warm.length && C.coach({ ...CAUTION, opens: 0, recentGreets: [] }).you.tone === 'caution',
        list(warm));
  check('and those warm lines are otherwise eligible on the very same log',
        P_FULL.found.some(id => line(id).tone === 'warm'),
        list(P_FULL.found.filter(id => line(id).tone === 'warm')));

  const cat = C.coach({ ...FULL, opens: 0, recentGreets: [] }).you.category;
  const catMuted = C.coach({ ...FULL_MUTED, opens: 0, recentGreets: [] }).you.category;
  check('no line in the pool is about the thing the card is already saying',
        cat !== catMuted &&
        !P_FULL.found.some(id => line(id).topic === cat) &&
        !P_MUTED.found.some(id => line(id).topic === catMuted),
        cat + ' / ' + catMuted);
  check('and the line that was dropped for it comes back when the card says something else',
        P_MUTED.found.some(id => line(id).topic === cat) && P_FULL.found.some(id => line(id).topic === catMuted),
        list(P_MUTED.found.filter(id => line(id).topic === cat)));
}

/* ================= B. THE PROPERTY ================= */
/* The pool each case is measured against is the WALK — what the rotation may
   visit on that log — because that is what the counter is taking its modulo
   of. Section A is what makes that honest: it has already asserted which pool
   each fixture puts the walk in and that the membership is what the log says
   it should be, so a walk of two here is a walk of two by the rule rather than
   a walk of nine with seven lines missing. Six cases, spanning walks two to
   eight wide. */
section('B. N opens on a pool of N give N different lines');
{
  const cases = [
    ['a brand-new account', QUIET, P_QUIET.walk],
    ['one data line and the generics', ONE, P_ONE.walk],
    ['two data lines, and the walk confined to them', TWO, P_TWO.walk],
    ['a full log, three of them', FULL, P_FULL.walk],
    ['a log with plenty to say, five', RICH, P_RICH.walk],
    ['a caution card, with the warm lines withheld', CAUTION, P_CAUTION.walk]
  ];
  cases.forEach(([name, fx, pool]) => {
    const n = pool.length;
    const run = greetsOver(fx, 0, n);
    check('a pool of ' + n + ' gives ' + n + ' distinct lines over ' + n + ' consecutive opens — ' + name,
          new Set(run).size === n, list(run));
    const long = greetsOver(fx, 0, n * 3);
    check('and no two consecutive opens match, over ' + (n * 3) + ' of them — ' + name,
          long.every((id, i) => i === 0 || id !== long[i - 1]),
          list(long.filter((id, i) => i > 0 && id === long[i - 1])));
    /* Every window, not just the first: a rotation that resets to the top of
       the pool whenever something else happens would pass the check above and
       still repeat under somebody's thumb. */
    const mid = greetsOver(fx, 1000003, n * 3);
    const bad = [];
    for (let i = 0; i + n <= mid.length; i++) {
      if (new Set(mid.slice(i, i + n)).size !== n) bad.push(i);
    }
    check('and it holds from a counter mid-life, in every window of ' + n + ' — ' + name,
          !bad.length, 'windows at ' + list(bad.map(String)));
  });
}

/* ================= C. THE CLOCK CANNOT MOVE IT ================= */
section('C. the clock is not the seed, and a repaint is not an open');
{
  const at = (fx, k, t) => C.coach({ ...fx, opens: k, now: t, recentGreets: [] }).greet.id;
  check('the same open with the clock 45 seconds on gives the same line — the You tab repaints four or five times as its reads land',
        at(QUIET, 5, NOW) === at(QUIET, 5, NOW + 45000),
        at(QUIET, 5, NOW) + ' vs ' + at(QUIET, 5, NOW + 45000));
  check('and an hour on, which is where the old seed always changed its mind',
        at(QUIET, 5, NOW) === at(QUIET, 5, NOW + 3600000) &&
        at(TWO, 5, NOW) === at(TWO, 5, NOW + 3600000),
        at(TWO, 5, NOW) + ' vs ' + at(TWO, 5, NOW + 3600000));
  const day = Array.from({ length: 24 }, (_, h) => at(QUIET, 11, NOW - 12 * 3600000 + h * 3600000));
  check('a whole day of clock values on one open is one line',
        new Set(day).size === 1, list([...new Set(day)]));

  // The guard on all three: a greeting frozen for good would pass them.
  const next = greetsOver(QUIET, 5, 2);
  check('and the next OPEN does move it, so none of the above is a line that simply never changes',
        next[0] !== next[1], next.join(' then '));

  /* The old input was a timestamp called openMs. Nothing reads it any more,
     and the honest way to say so is to hand one over and watch it not matter.
     coach-pure.mjs refuses the name; this refuses the behaviour. */
  const withSeed = k => C.coach({ ...QUIET, opens: k, recentGreets: [], openMs: k * 7919 }).greet.id;
  check('a leftover openMs on the input changes nothing — there is no clock left in the rotation',
        withSeed(3) === at(QUIET, 3, NOW) &&
        C.coach({ ...QUIET, opens: 3, recentGreets: [], openMs: 1 }).greet.id ===
        C.coach({ ...QUIET, opens: 3, recentGreets: [], openMs: 9e12 }).greet.id);
}

/* ================= D. THE LEAD QUESTION ================= */
section('D. the question under the card rotates on the same counter');
{
  const leadsOver = (fx, from, n) => opens(fx, from, n).map(c => c.lead && c.lead.id);

  const full = leadsOver(FULL, 0, 20);
  const fPool = [...new Set(full)];
  check('with more than one topic live, consecutive opens never repeat the lead question',
        fPool.length > 1 && full.every((id, i) => i === 0 || id !== full[i - 1]),
        list(full));
  /* How many questions there are to rotate through is asked of the engine
     rather than counted off what the rotation happened to offer — topicsFor()
     is the live set and it knows nothing about the counter. A caution card
     withholds none of them, because no topic is about safety, and that is
     asserted rather than assumed. */
  const cCard = C.coach({ ...CAUTION, opens: 0, recentGreets: [] });
  const cTopics = cCard.topicsFor('you').map(t => t.id);
  check('a caution card leaves every live topic to be asked about — a pool of ' + cTopics.length,
        cTopics.length > 1 && !cCard.topicsFor('you').some(t => t.category === cCard.you.category),
        list(cTopics) + ' against a card about ' + cCard.you.category);
  const caution = leadsOver(CAUTION, 0, cTopics.length);
  check('and ' + cTopics.length + ' consecutive opens ask about all ' + cTopics.length + ' of them',
        sameSet(caution, cTopics), list(caution.map(String)));

  const lead = (fx, k, t) => { const c = C.coach({ ...fx, opens: k, now: t, recentGreets: [] }); return c.lead && c.lead.id; };
  check('the lead does not move when only the clock does',
        lead(FULL, 4, NOW) === lead(FULL, 4, NOW + 3600000),
        lead(FULL, 4, NOW) + ' vs ' + lead(FULL, 4, NOW + 3600000));
  check('and the next open moves it', lead(FULL, 4, NOW) !== lead(FULL, 5, NOW),
        lead(FULL, 4, NOW) + ' then ' + lead(FULL, 5, NOW));

  // The rotation may not invent a topic to rotate through.
  check('an account with nothing behind any topic is offered no question at all, whatever the counter',
        greetsOver(QUIET, 0, 4).length === 4 &&
        leadsOver(QUIET, 0, 4).every(id => id == null), list(leadsOver(QUIET, 0, 4).map(String)));
}

/* ================= E. THE COUNTER IS TOTAL ================= */
section('E. whatever came back from storage, there is a line');
{
  /* The counter is read off a device. localStorage hands back strings, a
     half-written value, or nothing at all, and coach-data.js is not the only
     client any more — the native port has its own. So the engine has to be
     total in it, and in-range means "a line that was actually eligible". */
  const junk = [null, undefined, NaN, 'x', '4', Infinity, -Infinity, {}, [], true];
  const odd  = [-7, -1, -0.5, 2.5, 0.9];
  const huge = [1e15, 1e21, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER];
  const bad = [];
  [...junk, ...odd, ...huge].forEach(v => {
    const c = C.coach({ ...TWO, opens: v, recentGreets: [] });
    const ok = c.greet && P_TWO.all.includes(c.greet.id) && typeof c.greet.text === 'string' &&
               c.greet.text.trim().length > 0;
    if (!ok) bad.push(String(v) + ' -> ' + JSON.stringify(c.greet));
  });
  check('a counter of any shape still lands on a line that was eligible, with words in it', !bad.length, list(bad));

  const noLead = [...junk, ...odd, ...huge].filter(v => {
    const c = C.coach({ ...FULL, opens: v, recentGreets: [] });
    return !c.lead || !c.lead.id;
  });
  check('and the lead question survives the same counters', !noLead.length, list(noLead.map(String)));

  check('a missing counter is not a missing greeting either — the input arriving without one still says something',
        (() => { const { opens: _o, ...noCounter } = QUIET;
                 const c = C.coach(noCounter); return !!(c.greet && c.greet.text); })());
}

/* ================= F. THE RECENT LIST ONLY PUSHES FORWARD ================= */
section('F. the memory covers what the counter cannot, and never starves it');
{
  /* How deep the memory goes, discovered by driving it: block the first line,
     then the first two, and so on, until blocking one more stops changing the
     answer. That is the engine's own number rather than a copy of it. */
  let depth = 0;
  for (let k = 1; k <= P_QUIET.all.length; k++) {
    const a = C.coach({ ...QUIET, opens: 0, recentGreets: P_QUIET.all.slice(0, k) }).greet.id;
    const b = C.coach({ ...QUIET, opens: 0, recentGreets: P_QUIET.all.slice(0, k - 1) }).greet.id;
    if (a === b) break;
    depth = k;
  }
  check('the engine remembers the last ' + depth + ' lines it opened with', depth >= 1 && depth < P_QUIET.all.length,
        'depth ' + depth + ' of a pool of ' + P_QUIET.all.length);

  /* How many the engine will step past is emergent — it depends where in the
     pool the counter started — so the number the brief actually fixes is how
     many are KEPT, and that is a literal in two files. Read rather than
     copied: the check fails when the files disagree with each other, whatever
     the number is, and names it rather than asserting a three of its own. The
     two have to match or the engine truncates a memory the device is still
     paying to store, or worse, is handed more than it will look at. */
  const kept = src('coach-data.js').match(/recentGreets = \[id\][\s\S]{0,120}?\.slice\(0, (\d+)\)/);
  const takes = src('coach.js').match(/id: 'coach\.recentGreets'[\s\S]{0,400}?\.slice\(0, (\d+)\)/);
  check('and the device keeps exactly as many as the engine will take — ' + (kept && kept[1]) + ' either side',
        !!kept && !!takes && kept[1] === takes[1],
        'coach-data.js keeps ' + (kept ? kept[1] : '?') + ', coach.js takes ' + (takes ? takes[1] : '?'));

  /* The floor under the walk, and it is only under half of it. The ungated
     NEUTRAL lines are the ones no gate and no caution can take away, so while
     the walk is in the whole ordered pool there is always somewhere forward to
     step. Inside the data-aware lines there is not — two or three of them
     against a memory of three is a pool the memory can cover entirely — and
     what keeps the walk moving there is that the engine reads the memory one
     line short of the pool. Both are checked, because the second is the
     ordinary case rather than the corner. */
  const floor = C.GREETINGS.filter(g => !g.gate && g.tone !== 'warm').length;
  check('and the lines nothing can withhold outnumber that memory, so no gate failing can starve the fall-through walk',
        floor > depth, floor + ' always-eligible vs a memory of ' + depth);

  const narrow = [['two data lines', TWO, P_TWO], ['a full log', FULL, P_FULL],
                  ['a caution card', CAUTION, P_CAUTION]].filter(([, , p]) => p.walk.length <= depth);
  const starved = [];
  narrow.forEach(([name, fx, p]) => {
    // Every line in the walk already remembered, newest first — which on a walk
    // this narrow is what two or three ordinary opens leave behind — and the
    // newest is the one the reader is looking at. Stepping onto it is a repeat.
    p.walk.forEach(last => {
      const memory = [last].concat(p.walk.filter(id => id !== last));
      for (let k = 0; k < 12; k++) {
        const g = C.coach({ ...fx, opens: k, recentGreets: memory }).greet;
        if (!g || !g.text.trim().length || g.id === last) starved.push(name + ' @' + k + ' after ' + last);
      }
    });
  });
  check('and a walk the memory could cover entirely still steps off the line just shown, on all ' +
        narrow.length + ' of them — the engine remembers one line fewer than it has',
        narrow.length > 0 && !starved.length, list(starved));

  const everything = C.coach({ ...TWO, opens: 3, recentGreets: P_TWO.all });
  check('a recent list naming every line in the pool still gets a line rather than silence',
        !!everything.greet && P_TWO.all.includes(everything.greet.id) &&
        everything.greet.text.trim().length > 0, JSON.stringify(everything.greet));

  /* The case the counter alone cannot cover: the pool changed between two opens
     because a gate stopped passing, and the counter's own index lands back on
     the line before it. The pairs are logs that share lines and differ by one
     gate — a third session dropping "two sessions in already", a day rolling
     over and taking the food line with it — because a pool the counter did not
     walk makes its index meaningless. The ks where that WOULD happen are found
     by running the same two opens with no memory at all; if there were none of
     them, the check below would be proving nothing.

     This is the one that catches a memory too shallow for its pool. Confine
     the walk to the data lines and leave the memory uncapped and these pairs
     repeat: every candidate is recent, the walk finds nowhere to step and falls
     back on the index that collides. Measured on the shipped fixtures, 26
     crossings in 4,704 of them. */
  const shrinks = [['a full log losing a gate', FULL, TWO], ['a rich log losing two', RICH, FULL],
                   ['a caution card losing one', CAUTION, TWO],
                   ['a fall-through pool losing a line', ONE, QUIET]];
  const fewWould = [];
  const still = [];
  shrinks.forEach(([name, before, after]) => {
    let would = 0;
    for (let k = 0; k < 64; k++) {
      const first = C.coach({ ...before, opens: k, recentGreets: [] }).greet.id;
      const blind = C.coach({ ...after, opens: k + 1, recentGreets: [] }).greet.id;
      if (blind !== first) continue;
      would++;
      /* Two memories, because the shallow one is not the one a device carries.
         A phone that has been opened three times arrives with three ids, and on
         a walk of two or three that is the whole pool — which is the state an
         engine that reads its memory uncapped has no step left in. */
      const walked = greetsOver(before, k - 2, 3);
      [[first], [first].concat(walked.filter(id => id !== first)).slice(0, 3)].forEach(memory => {
        if (C.coach({ ...after, opens: k + 1, recentGreets: memory }).greet.id === first) {
          still.push(name + ' @' + k + ' remembering ' + memory.length);
        }
      });
    }
    if (!would) fewWould.push(name);
  });
  check('a pool that changed between two opens still cannot repeat the line before it, on all ' +
        shrinks.length + ' crossings', !still.length && !fewWould.length,
        list(still) + (fewWould.length ? '  [proving nothing on: ' + list(fewWould) + ']' : ''));

  /* And the memory never sends the walk backwards onto something it just used.
     How far back it can promise that is bounded by the walk itself: the engine
     reads one line fewer than the pool has, so a walk of two can only ever
     promise "not the line before it" and a walk wider than the memory promises
     the whole of it. Both ends are checked, and the width is read off the walk
     rather than assumed, so the promise stated is the one the pool can keep. */
  const tooSoon = [];
  [['two data lines', TWO, P_TWO], ['a full log', FULL, P_FULL], ['a log with plenty to say', RICH, P_RICH],
   ['one data line and the generics', ONE, P_ONE]].forEach(([name, fx, p]) => {
    const w = Math.min(depth, p.walk.length - 1);
    const long = greetsOver(fx, 7, 40);
    for (let i = w; i < long.length; i++) {
      if (long.slice(i - w, i).includes(long[i])) tooSoon.push(name + ' @' + i + ' within ' + w);
    }
  });
  check('and no line comes back inside the window the engine can remember on that walk', !tooSoon.length,
        list(tooSoon));
  check('and on a walk wider than the memory that window is the whole of it — ' + depth + ' deep',
        Math.min(depth, P_RICH.walk.length - 1) === depth && Math.min(depth, P_ONE.walk.length - 1) === depth,
        'rich walk ' + P_RICH.walk.length + ', one-data walk ' + P_ONE.walk.length);
}

/* ================= G. WHERE THE WALK OPENS OUT ================= */
/* The collapse to ONE line was the bug; a collapse to the data lines is the
   rule. What separates them is how many qualify, so this section works the
   boundary from the low side: one data line has to fall through to the whole
   ordered pool, generics and all. */
section('G. fewer than two data lines and the whole pool is the walk again');
{
  const first = C.coach({ ...TWO, opens: 0, recentGreets: [] }).greet.id;
  check('a card with a real number in its greeting is worth more than a warm one, so the walk starts on a data line',
        line(first).kind === 'data', first + ' is ' + line(first).kind);

  const kinds = new Set(greetsOver(ONE, 0, P_ONE.walk.length * 2).map(id => line(id).kind));
  check('with one data line eligible both kinds come up — the walk fell through rather than sitting on the one',
        kinds.has('data') && kinds.has('generic'), list([...kinds]));

  const confinedKinds = new Set(greetsOver(TWO, 0, 20).map(id => line(id).kind));
  check('and with two of them it never leaves them, which is the whole of the change',
        confinedKinds.has('data') && !confinedKinds.has('generic'), list([...confinedKinds]));

  /* The exact shape of the old bug. Exactly one data line passes its gate, the
     pool collapses to it, `n % 1` is 0 and that card says the same five words
     for ever. The fixture is built to be that one line, so the count of
     distinct lines over a full cycle is the whole check. */
  const dataOnly = P_ONE.walk.filter(id => line(id).kind === 'data');
  check('with exactly one data line eligible, the pool is still the whole ordered list',
        dataOnly.length === 1 && P_ONE.walk.length > 1,
        dataOnly.length + ' data line, pool of ' + P_ONE.walk.length);
  const run = greetsOver(ONE, 0, P_ONE.walk.length);
  check('and ' + P_ONE.walk.length + ' opens on it give ' + P_ONE.walk.length + ' different lines rather than one line ' +
        P_ONE.walk.length + ' times',
        new Set(run).size === P_ONE.walk.length, list(run));
}

/* ================= H. THE DEVICE HALF ================= */
section('H. driven across real app opens — the counter moves once, and only on an open');
{
  /* An app open is a fresh module graph against storage that remembers, so
     that is what this builds: a new copy of coach-data.js per open, all of
     them importing the ONE store stub, whose LS shim outlives them. It is the
     closest thing to closing the app and opening it again that a verifier can
     do, and it is the exact sequence that shipped broken — open, glance,
     close, open again, same greeting. */
  const DATA = src('coach-data.js')
    .replace("from './store.js'", 'from ' + here('store-stub.mjs'))
    .replace("from './exercises.js'", 'from ' + real('exercises.js'))
    .replace("from './picker.js'", 'from ' + here('picker-stub.mjs'))
    .replace("from './tdee.js'", 'from ' + here('tdee-stub.mjs'))
    .replace("from './insights.js'", 'from ' + here('insights-stub.mjs'))
    .replace("from './access.js'", 'from ' + here('access-stub.mjs'))
    .replace("from './coach.js'", 'from ' + here('coach.mjs'));
  writeFileSync(join(dir, 'picker-stub.mjs'), 'export function allExercises() { return []; }\n');
  writeFileSync(join(dir, 'tdee-stub.mjs'), `
export function maintenance() { return null; }
export function effectiveMaint() { return null; }
export function trendRate() { return { rateWk: null, days: null }; }
export function sortedEntries() { return []; }
`);
  writeFileSync(join(dir, 'insights-stub.mjs'), 'export function goalDirection() { return null; }\n');
  writeFileSync(join(dir, 'access-stub.mjs'), 'export function capabilities() { return { features: {} }; }\n');

  const leftover = [...DATA.matchAll(/from '(\.\/[^']+)'/g)].map(m => m[1]);
  check('coach-data.js still imports only the modules this file knows how to stand in for',
        !leftover.length, list(leftover));

  if (!leftover.length) {
    const store = await import(here('store-stub.mjs').slice(1, -1));
    let n = 0;
    // One app open: a fresh instance, the load awaited, then paints.
    const open = async () => {
      const f = 'coach-data-' + (++n) + '.mjs';
      writeFileSync(join(dir, f), DATA);
      const m = await import(pathToFileURL(join(dir, f)).href);
      await m.initCoachData();
      return m;
    };

    const seen = [];
    const counters = [];
    for (let i = 0; i < 3; i++) {
      const m = await open();
      const c = C.coach(m.coachInput());
      counters.push(m.coachInput().opens);
      seen.push(c.greet.id);
      m.rememberGreeting(c.greet.id);
    }
    check('three opens in a row give three different lines — the thing three reloads on the live site did not',
          new Set(seen).size === 3, list(seen));
    check('and the counter went up by exactly one each time',
          counters.every((v, i) => i === 0 || v === counters[i - 1] + 1), list(counters.map(String)));

    // The rest of the cycle, through the real storage half rather than a
    // hand-fed history: the pool here is the ungated one, so it is a pool of
    // a known size again.
    for (let i = seen.length; i < P_QUIET.all.length; i++) {
      const m = await open();
      const c = C.coach(m.coachInput());
      seen.push(c.greet.id);
      m.rememberGreeting(c.greet.id);
    }
    check(P_QUIET.all.length + ' opens on a device give ' + P_QUIET.all.length + ' distinct lines, end to end',
          new Set(seen).size === P_QUIET.all.length && sameSet(seen, P_QUIET.all), list(seen));

    /* A paint is not an open. coachInput() is called on every repaint the You
       tab makes, and the spin below carries the real clock past a second
       boundary — which is precisely the tick that used to change the answer. */
    const m = await open();
    const before = m.coachInput().opens;
    const a = C.coach(m.coachInput()).greet.id;
    const edge = Math.ceil(Date.now() / 1000) * 1000;
    while (Date.now() < edge) { /* spin into the next second of real time */ }
    const b = C.coach(m.coachInput()).greet.id;
    const c2 = C.coach(m.coachInput()).greet.id;
    check('a second repaint, on the far side of a tick of the real clock, is the same line',
          a === b && b === c2, [a, b, c2].join(' / '));
    check('and the counter did not move for any of those paints',
          m.coachInput().opens === before, before + ' -> ' + m.coachInput().opens);

    /* The line is recorded once, synchronously, to the device. The database
       version of this fired as the app opened and died with the page when
       somebody closed it a second later — which is the exact pattern that
       needs it. */
    m.rememberGreeting(a);
    m.rememberGreeting('g_something_else');
    const after = await open();
    check('the line the card showed survives the app closing, and only the first one per open is kept',
          after.coachInput().recentGreets[0] === a, list(after.coachInput().recentGreets));
    check('and the whole rotation never wrote to the database at all',
          !store.writes.length, list(store.writes.map(w => w[0])));
  }

  /* The source side of the same claim: where the two values live, and where
     they are read. A counter bumped from coachInput() would move on a paint,
     and one kept in settings/coach would be an async write fired at the one
     moment the page is most likely to close. */
  const D = src('coach-data.js').replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  const inputBody = (D.split('export function coachInput')[1] || '').split('\nfunction ')[0];
  check('the counter is read and bumped in initCoachData(), before the first await',
        /export function initCoachData\(\) \{[\s\S]{0,300}readRotation\(\);/.test(D) &&
        !/await[\s\S]{0,200}readRotation\(\)/.test(D));
  check('and coachInput() neither reads it nor moves it — it only passes on what the open settled',
        !/readRotation\(/.test(inputBody) && !/\bopens\s*=/.test(inputBody) && /\bopens,/.test(inputBody));
  check('both halves live in device storage under their own keys',
        /const LS_OPENS\s*=/.test(D) && /const LS_GREETS\s*=/.test(D) &&
        /LS\.get\(LS_OPENS/.test(D) && /LS\.set\(LS_OPENS/.test(D) && /LS\.set\(LS_GREETS/.test(D));
  check('and neither is written to settings/coach, which is the node that lost the old one',
        !/lastGreet/.test(D) && !/patch\(\{[^}]*opens/.test(D) && !/patch\(\{[^}]*recentGreets/.test(D));
  check('the engine’s settings shape has no room for them either, so a stale one cannot come back through the database',
        C.normSettings({ opens: 7, recentGreets: ['g_hello'], lastGreet: 'g_hello' }).opens === undefined &&
        C.normSettings({ opens: 7, recentGreets: ['g_hello'], lastGreet: 'g_hello' }).recentGreets === undefined &&
        C.normSettings({ lastGreet: 'g_hello' }).lastGreet === undefined);
  check('and the device keys are namespaced per account, so a shared phone keeps two counters apart',
        /function lsKey\(k\) \{ return 'rack:' \+ \(UID \|\| 'anon'\)/.test(src('store.js')));
}

/* ================= I. THE LINE IS STILL WORTH READING ================= */
/* The half rack-v43 lost, and the reason this file needed a second visit. Every
   check above it was green on a build whose card opened with five generic lines
   in a row on a real account — "Nothing here is a guess.", "Here's where you
   stand.", "Ready when you are.", "Read from your own log.", "Good to see you."
   — on a log where several data-aware lines qualified. A rotation can be proved
   never to repeat and still be allowed to go quietly generic, so both halves
   are asserted here on the same run: no two consecutive opens match, AND at
   least two thirds of a long one say something only this log could say.

   Both, or the fix regresses in whichever direction is not being watched.
   Neither is worth much alone: walking the whole pool passes the first and
   fails the second, and a pool of one passes the second and fails the first. */
section('I. where the log has several numbers to offer, the line is one of them');
{
  const N = 30;
  [['a full log', FULL, P_FULL], ['a log with plenty to say', RICH, P_RICH]].forEach(([name, fx, p]) => {
    check('the fixture qualifies — ' + p.data.length + ' data-aware lines pass their gates on ' + name +
          ', so there is something to rotate within', p.data.length >= 2, list(p.data));

    [['from a cold counter', 0], ['from a counter mid-life', 1000003]].forEach(([where, from]) => {
      const run = greetsOver(fx, from, N);

      const repeats = run.filter((id, i) => i > 0 && id === run[i - 1]);
      check('no two consecutive opens give the same line, over ' + N + ' of them — ' + name + ', ' + where,
            !repeats.length, list(repeats));

      const aware = run.filter(id => line(id).kind === 'data').length;
      check('and at least two thirds of them open with a number rather than a warm nothing — ' + name + ', ' + where,
            aware * 3 >= N * 2, aware + ' of ' + N + ': ' + list([...new Set(run)].map(id => id + '/' + line(id).kind)));

      /* The symptom itself, which is a run rather than a ratio: five in a row
         is what was actually seen, and a ratio can hide one inside a long
         enough sample. */
      let longest = 0, streak = 0;
      run.forEach(id => { streak = line(id).kind === 'data' ? 0 : streak + 1; longest = Math.max(longest, streak); });
      check('and never five generic lines running, which is what was seen live — ' + name + ', ' + where,
            longest < 5, 'longest generic run ' + longest);
    });
  });

  /* And the promise is bounded honestly: below the threshold it is not made at
     all. One data line cannot rotate against itself, so that account keeps the
     generics and this file says so rather than asserting something it would
     have to break the engine to deliver. */
  const thin = greetsOver(ONE, 0, N).filter(id => line(id).kind === 'data').length;
  check('and on a log with one data line the two-thirds promise is not made — it could only be kept by repeating',
        thin * 3 < N * 2, thin + ' of ' + N + ' data-aware, and one line cannot rotate against itself');
}

/* ---------- report ---------- */
console.log('\nthe greeting rotates on a counter, and a counter cannot repeat\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
