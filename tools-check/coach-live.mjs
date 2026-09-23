#!/usr/bin/env node
//
// Verifier for Coach in the gym — the in-session read.
//
//   node tools-check/coach-live.mjs
//
// Mid-workout is the most sensitive place Coach will ever speak. He is under a
// bar, and the four things this file fences are the four ways that goes wrong:
//
//   A WRONG ANSWER. Each of the four answers — done, switch, another, next — is
//     driven from a fixture built so that one of them, and only that one, is
//     true of it, and the sentence has to be the true one with the true count.
//   A PUSH WHEN HE IS TIRED. When the signals disagree DONE wins: a session at
//     its usual length, or two tired exercises, is "you're probably good for
//     today" even where one more set would otherwise be in line. And a set
//     typed F never yields "one more set" on that exercise — driven across a
//     sweep of generated sessions, not only the one fixture that says so.
//   A NUMBER TO PUT ON THE BAR. The read suggests no weight. Every string it can
//     produce, in both units, is scanned for a figure with a unit on it, and
//     every one found has to be a quote of a set in the log. And the words that
//     would make a quote into a suggestion — heavier, lighter, go up — never
//     appear at all.
//   A GUESS. Thin history is silence: under three sessions of the kind, under
//     half of them agreeing, nothing is said. So is an unreadable log, a basic
//     account, an edit of a past session and a session with nothing ticked.
//
// And the ordinary pure-module guarantees: the same session read twice is the
// same answer, and the live session handed in is never written to.
//
// Everything is driven through the real engine — coach.js and coach-live.js,
// staged against a stubbed store the way coach-rank.mjs stages them — and
// `c.live(session, { current })` is the call the workout screen makes.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

const dir = mkdtempSync(join(tmpdir(), 'rack-coach-live-'));
const at  = f => JSON.stringify(pathToFileURL(join(dir, f)).href);
writeFileSync(join(dir, 'store-stub.mjs'), `
export async function read(_p, fallback) { return fallback; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`);
writeFileSync(join(dir, 'analytics.mjs'), src('analytics.js')
  .replace("from './store.js'", "from './store-stub.mjs'")
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './ui.js'", 'from ' + real('ui.js'))
  .replace("from './units.js'", 'from ' + real('units.js')));
writeFileSync(join(dir, 'coach-build.mjs'), src('coach-build.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './blocks.js'", 'from ' + real('blocks.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
writeFileSync(join(dir, 'coach-live.mjs'), src('coach-live.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-build.js'", 'from ' + at('coach-build.mjs'))
  .replace("from './coach-live.js'", 'from ' + at('coach-live.mjs'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);
const L = await import(pathToFileURL(join(dir, 'coach-live.mjs')).href);
const U = await import(real('units.js').slice(1, -1));

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const J = v => JSON.stringify(v);
const clone = v => JSON.parse(J(v));
const list = xs => xs.slice(0, 5).join('\n         ') + (xs.length > 5 ? '\n         … (' + xs.length + ')' : '');

/* ================= THE FIXTURE =================
   Twelve weeks of three recurring sessions, every one an offset from a fixed
   epoch so this file answers the same in any time zone:

     a chest-and-arms day   bench 4, incline 3, cable fly 3, curl 3, pushdown 3
                            — seven times in that order; twice with no fly and
                            the pushdown before the curl; once with the fly
                            before the incline
     a back-and-arms day    row 4, pulldown 3, curl 3
     a leg day              squat 4, romanian deadlift 3

   So, derived rather than asserted: after bench and incline the next exercise
   was the fly 7 times in 10; a chest day holds a median of 10 chest sets and
   16 working sets in all; bench is done for 4 sets every time; and when the
   arms come after the chest they open with the curl 8 times in 10. */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};
const LIB = {
  bench:    { name: 'Barbell Bench Press',          group: 'chest', equipment: 'barbell' },
  incline:  { name: 'Incline Dumbbell Bench Press', group: 'chest', equipment: 'dumbbell' },
  fly:      { name: 'Cable Crossover',              group: 'chest', equipment: 'cable' },
  dips:     { name: 'Chest Dip',                    group: 'chest', equipment: 'bodyweight' },
  curl:     { name: 'Barbell Curl',                 group: 'arms',  equipment: 'barbell' },
  pushdown: { name: 'Triceps Pushdown (Rope)',      group: 'arms',  equipment: 'cable' },
  row:      { name: 'Barbell Row',                  group: 'back',  equipment: 'barbell' },
  pulldown: { name: 'Lat Pulldown',                 group: 'back',  equipment: 'cable' },
  squat:    { name: 'Back Squat (High Bar)',        group: 'legs',  equipment: 'barbell' },
  rdl:      { name: 'Romanian Deadlift',            group: 'back',  equipment: 'barbell' },
  tread:    { name: 'Treadmill Run',                group: 'legs',  equipment: 'cardio' }
};
// The loads each lift is logged at. Every weight a quote may print comes out of
// here, which is what section E scans against.
const LOAD = { bench: '185', incline: '65', fly: '40', dips: '0', curl: '75', pushdown: '50',
               row: '155', pulldown: '140', squat: '245', rdl: '205', tread: '' };
const REPS = { bench: 8, incline: 10, fly: 12, dips: 10, curl: 10, pushdown: 12, row: 8, pulldown: 10,
               squat: 5, rdl: 8, tread: 1 };
const logged = (id, n, extra) => ({
  exId: id, name: LIB[id].name, group: LIB[id].group, equipment: LIB[id].equipment,
  sets: (extra && extra.warm ? [{ w: '95', r: '10', type: 'W', done: true }] : [])
    .concat(Array.from({ length: n }, () => ({ w: LOAD[id], r: String(REPS[id]), type: 'N', done: true })))
});
const sess = (tag, ago, rows) => ({ id: tag + ago, startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY), exercises: rows });

const PUSH = k => {
  if (k === 4 || k === 7) return [logged('bench', 4, { warm: true }), logged('incline', 3), logged('pushdown', 3), logged('curl', 3)];
  if (k === 9) return [logged('bench', 4, { warm: true }), logged('fly', 3), logged('incline', 3), logged('curl', 3)];
  return [logged('bench', 4, { warm: true }), logged('incline', 3), logged('fly', 3), logged('curl', 3), logged('pushdown', 3)];
};
const HISTORY = [];
for (let k = 0; k < 10; k++) {
  HISTORY.push(sess('push', 3 + 7 * k, PUSH(k)));
  HISTORY.push(sess('pull', 5 + 7 * k, [logged('row', 4), logged('pulldown', 3), logged('curl', 3)]));
  HISTORY.push(sess('legs', 1 + 7 * k, [logged('squat', 4), logged('rdl', 3)]));
}
HISTORY.sort((a, b) => a.startedAt - b.startedAt);

const input = extra => ({
  now: NOW, opens: 0, recentGreets: [], u: 'lb', log: 'readable',
  sessions: HISTORY, lib: LIB, hidden: [], libReady: true, routines: [],
  live: { active: true }, tier: { pro: true },
  targets: null, targetsSet: false, summaries: {}, steps: { days: {} },
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
  settings: { v: 1, mute: {}, answers: {}, asked: {} },
  ...extra
});

/* A live session, as the workout screen holds it: sets with w/r as the boxes
   hold them, and `done` for the tick. Rows are [exId, [[w, r, type?, done?], …]]. */
const live = rows => ({
  id: 'wlive', name: 'Live', startedAt: NOW - 40 * 60 * 1000,
  exercises: rows.map(([id, sets]) => ({
    exId: id, name: LIB[id].name, group: LIB[id].group, equipment: LIB[id].equipment,
    sets: sets.map(([w, r, type, done]) => ({ w: String(w), r: String(r), type: type || 'N', done: done !== false }))
  }))
});
const n = (id, count, r) => Array.from({ length: count }, () => [LOAD[id], r || REPS[id]]);
const read = (session, extra, opts) => C.coach(input(extra)).live(session, opts);

/* ================= A. EACH OF THE FOUR ================= */
section('A. each answer, from a session it is true of');
{
  // NEXT — bench and incline done, nothing else on the list.
  const s1 = live([['bench', n('bench', 4)], ['incline', n('incline', 3)]]);
  const a1 = read(s1);
  check('next: after bench and incline, the fly — the one that followed 7 times in 10',
        a1 && a1.kind === 'next' && a1.exId === 'fly' &&
        a1.text === 'After Barbell Bench Press and Incline Dumbbell Bench Press you usually go to Cable Crossover — 7 of 10 times in the last twelve weeks.',
        a1 && a1.kind + ': ' + a1.text);
  check('with the why: which sessions were counted, and what the other three did',
        a1 && a1.why.some(w => /Counted over your 10 chest and arms days/.test(w)) &&
        a1.why.some(w => /came straight after in 7; the other 3 went elsewhere or ended there\./.test(w)), a1 && a1.why.join(' / '));
  check('and an Add it that is the library row the picker would have handed back',
        a1 && J(a1.add) === J({ id: 'fly', name: 'Cable Crossover', group: 'chest', equipment: 'cable' }), a1 && J(a1.add));

  // ANOTHER — three sets of bench, every one at the same reps.
  const s2 = live([['bench', n('bench', 3)]]);
  const a2 = read(s2);
  check('another: three sets of bench against four in every one of ten sessions',
        a2 && a2.kind === 'another' && a2.exId === 'bench' &&
        a2.text === 'One more set of Barbell Bench Press is in line with what you usually do: 4 or more in 10 of your 10 sessions of it.',
        a2 && a2.kind + ': ' + a2.text);
  check('and it offers nothing to add — it is the exercise already in hand', a2 && a2.add === null);

  // SWITCH — the chest has had its ten sets.
  const s3 = live([['bench', n('bench', 4)], ['incline', n('incline', 3)], ['fly', n('fly', 3)]]);
  const a3 = read(s3);
  check('switch: ten chest sets is the chest day’s usual, and arms is untouched',
        a3 && a3.kind === 'switch' && a3.group === 'arms' &&
        a3.text === 'Chest has had its usual this session — 10 working sets against a median of 10. Arms is the part of your chest and arms day with nothing in it yet, and Barbell Curl is how you usually start it.',
        a3 && a3.kind + ': ' + a3.text);
  check('opening the arms the way those sessions did — the curl, 8 of 10',
        a3 && a3.exId === 'curl' && a3.why.some(w => w === 'Barbell Curl came first for arms in 8 of those 10 sessions.'),
        a3 && a3.why.join(' / '));

  // DONE — sixteen working sets, the chest day's median.
  const s4 = live([['bench', n('bench', 4)], ['incline', n('incline', 3)], ['fly', n('fly', 3)],
                   ['curl', n('curl', 3)], ['pushdown', n('pushdown', 3)]]);
  const a4 = read(s4);
  check('done: sixteen working sets against the chest day’s usual sixteen',
        a4 && a4.kind === 'done' && a4.text === 'You’re probably good for today — 16 working sets against a usual 16.',
        a4 && a4.kind + ': ' + a4.text);
  check('and done offers nothing to add', a4 && a4.add === null && a4.exId === null);

  // DONE — by fatigue: the last two exercises both show it.
  const s5 = live([['bench', [[185, 8], [185, 8], [185, 6, 'F']]], ['incline', [[65, 10], [65, 10], [65, 7]]]]);
  const a5 = read(s5);
  check('done: a set to failure on bench and incline reps from 10 to 7 at the same weight',
        a5 && a5.kind === 'done' &&
        a5.text === 'You’re probably good for today — Barbell Bench Press, a set taken to failure; Incline Dumbbell Bench Press, reps from 10 to 7 at the same or a lighter weight.',
        a5 && a5.kind + ': ' + a5.text);
}

/* ================= B. DONE WINS ================= */
section('B. when the signals disagree, DONE wins');
{
  // A session one short of bench's usual four sets — so "one more set" is in
  // line for it — and at the chest day's usual length. The hint says bench is
  // the exercise in hand, which is the question the chip asks after bench.
  const rows = [['bench', n('bench', 3)], ['incline', n('incline', 3)], ['fly', n('fly', 3)],
                ['curl', n('curl', 4)], ['pushdown', n('pushdown', 3)]];
  const control = read(live(rows.slice(0, 1)), {}, { current: 0 });
  check('control: on its own, three sets of bench is "one more set"', control && control.kind === 'another', control && control.kind);
  const both = read(live(rows), {}, { current: 0 });
  check('the same bench, in a session at its usual length: done, not another',
        both && both.kind === 'done', both && both.kind + ': ' + both.text);

  // Two tired exercises where the next-exercise read would otherwise speak.
  const tiredRows = [['bench', [[185, 8], [185, 8], [185, 5]]], ['incline', [[65, 10], [65, 10], [65, 6]]]];
  const t = read(live(tiredRows));
  const fresh = read(live([['bench', n('bench', 3)], ['incline', n('incline', 3)]]));
  check('control: the same two exercises, reps held, are answered by what comes next',
        fresh && fresh.kind === 'next', fresh && fresh.kind);
  check('reps down a quarter on both: done, not next', t && t.kind === 'done', t && t.kind + ': ' + t.text);

  check('and the order the four are tried in is written down, done first',
        J(L.LIVE_KINDS) === J(['done', 'switch', 'another', 'next']), J(L.LIVE_KINDS));
}

/* ================= C. NEVER A SET AFTER A FAILURE ================= */
section('C. a set typed F never yields "one more set" on that exercise');
{
  const f1 = read(live([['bench', [[185, 8], [185, 8], [185, 8, 'F']]]]));
  check('three sets of bench, the last to failure: not another', f1 && f1.kind !== 'another' || f1 === null,
        f1 && f1.kind + ': ' + f1.text);
  const f2 = read(live([['bench', [[185, 8, 'F'], [185, 8], [185, 8]]]]));
  check('the failure early, reps held after it: still not another — any F on the exercise counts',
        !f2 || f2.kind !== 'another', f2 && f2.kind);
  const drop = read(live([['bench', [[185, 8], [185, 8], [185, 5]]]]));
  check('reps from 8 to 5 at the same weight is fatigue, and not another', !drop || drop.kind !== 'another', drop && drop.kind);
  const lighter = read(live([['bench', [[185, 8], [175, 6]]]]));
  check('at a lighter weight too', !lighter || lighter.kind !== 'another', lighter && lighter.kind);
  const heavier = read(live([['bench', [[185, 8], [205, 5]]]]));
  check('but fewer reps at a HEAVIER weight is not fatigue — the load went up', heavier && heavier.kind === 'another',
        heavier && heavier.kind);
  const warm = read(live([['bench', [[95, 12, 'W'], [135, 10, 'W'], [185, 8], [185, 7]]]]));
  check('and a warm-up is never the set the drop is measured from — nor is how many there were',
        warm && warm.kind === 'another', warm && warm.kind);

  /* The sweep. Generated sessions, a deterministic generator so every run is
     the same run: whatever else is true of a session, when the exercise in
     hand has a set typed F, the answer is not "one more set". */
  let seed = 7;
  // The high bits: an LCG's low bits cycle with a tiny period, which is how a
  // first draft of this sweep came to put an F on 85% of its sessions.
  const rnd = k => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 65536) % k; };
  const ids = ['bench', 'incline', 'fly', 'curl', 'pushdown', 'row', 'pulldown', 'squat'];
  let swept = 0, withF = 0, freshAnother = 0;
  const bad = [];
  for (let k = 0; k < 400; k++) {
    const rows = [];
    const count = 1 + rnd(5);
    for (let e = 0; e < count; e++) {
      const id = ids[rnd(ids.length)];
      const sets = Array.from({ length: 1 + rnd(5) }, () =>
        // Reps within one of the usual, so a drop of a quarter is rare and the
        // sessions with no F are mostly untired ones — which is what makes the
        // second check below mean something.
        [LOAD[id], Math.max(1, REPS[id] - rnd(2)), rnd(6) === 0 ? 'F' : rnd(8) === 0 ? 'W' : 'N', rnd(10) !== 0]);
      rows.push([id, sets]);
    }
    const s = live(rows);
    const cur = rnd(rows.length);
    const a = read(s, {}, { current: cur });
    swept++;
    const inHand = s.exercises[cur].exId;
    const failed = s.exercises.filter(e => e.exId === inHand).some(e => e.sets.some(x => x.done && x.type === 'F'));
    if (failed) withF++;
    if (!failed && a && a.kind === 'another') freshAnother++;
    if (failed && a && a.kind === 'another' && a.exId === inHand) bad.push(J(rows) + ' -> ' + a.text);
  }
  check('across ' + swept + ' generated sessions, ' + withF + ' with an F on the exercise in hand: never another on it',
        withF > 50 && !bad.length, list(bad));
  // And the sweep is not vacuous: where nothing was typed F, "one more set"
  // does come up — so its absence above is the rule, not a generator that
  // could never have produced it.
  check('while the sessions with no F in hand do get "one more set" (' + freshAnother + ' of them)', freshAnother > 5);
}

/* ================= D. SILENCE ================= */
section('D. thin history, and every gate, is silence');
{
  const s = live([['bench', n('bench', 3)], ['incline', n('incline', 3)]]);
  const thin = HISTORY.filter(x => x.id.startsWith('push')).slice(-2);
  check('two chest days in the log: nothing at all', read(s, { sessions: thin }) === null,
        J(read(s, { sessions: thin })));
  // The boundary itself, on the one answer that needs no shape: three sets of
  // bench against two sessions of it is a coincidence; against three it is a
  // habit, and it is said.
  const bench3 = live([['bench', n('bench', 3)]]);
  const pushes = HISTORY.filter(x => x.id.startsWith('push'));
  check('bench three sets in, two sessions of it in the log: nothing',
        read(bench3, { sessions: pushes.slice(-2) }) === null, J(read(bench3, { sessions: pushes.slice(-2) })));
  const three = read(bench3, { sessions: pushes.slice(-3) });
  check('and with three it speaks — the bar is three sessions, not more',
        three && three.kind === 'another' && /4 or more in 3 of your 3 sessions of it/.test(three.text),
        three && three.text);
  check('an empty log: nothing', read(s, { sessions: [], log: 'empty' }) === null);
  check('an unreadable log: nothing', read(s, { log: 'unknown' }) === null);
  check('a basic account: nothing — not a lock, not a teaser', read(s, { tier: { pro: false } }) === null);
  check('"In the gym" switched off in Settings → Coach: nothing',
        read(s, { settings: { v: 1, mute: { live: true }, answers: {}, asked: {} } }) === null && !!read(s));
  check('an edit of a past session: nothing', read({ ...s, _edit: { mk: '2026-09', dd: '01' } }) === null);
  check('a session with nothing ticked yet: nothing',
        read(live([['bench', [[185, 8, 'N', false], [185, 8, 'N', false]]]])) === null);
  check('no session at all: nothing', read(null) === null && read(undefined) === null);

  // A usual length is a usual length among sessions of the same kind. With no
  // recurring shape in the log — one of each — a chest day half done is not
  // "good for today" because leg days are short.
  // Built so the median of the WHOLE window is 7 — three short leg days, a pull
  // day and a push day — which is exactly the seven sets on the list: pooled,
  // it would call this chest day done.
  const mixed = [HISTORY.filter(x => x.id.startsWith('push')).slice(-1)[0],
                 ...HISTORY.filter(x => x.id.startsWith('pull')).slice(-1),
                 ...HISTORY.filter(x => x.id.startsWith('legs')).slice(-3)];
  const half = read(live([['bench', n('bench', 4)], ['incline', n('incline', 3)]]), { sessions: mixed.sort((a, b) => a.startedAt - b.startedAt) });
  check('no shape of its own in the log: never "good for today" off a median of other kinds of session',
        !half || half.kind !== 'done', half && half.text);

  // "Usually" has to be true. Five chest days go to the fly after bench and
  // incline and five to the pushdown: half and half is not a habit.
  const split = [];
  for (let k = 0; k < 10; k++) {
    split.push(sess('sp', 3 + 7 * k, k % 2
      ? [logged('bench', 4), logged('incline', 3), logged('fly', 3), logged('curl', 3)]
      : [logged('bench', 4), logged('incline', 3), logged('pushdown', 3), logged('curl', 3)]));
  }
  const coin = read(live([['bench', n('bench', 4)], ['incline', n('incline', 3)]]), { sessions: split });
  check('five and five is a coin, not a habit: no "usually go to"', !coin || coin.kind !== 'next', coin && coin.text);

  // Next never names what is already on today's list, or what he hid.
  const planned = read(live([['bench', n('bench', 4)], ['incline', n('incline', 3)], ['fly', [[40, 12, 'N', false]]]]));
  check('the fly already on the list: next does not tell him to go to it', !planned || planned.exId !== 'fly',
        planned && planned.kind + ': ' + planned.text);
  // Hidden twice over: out of the library the way web's picker hands it over,
  // and IN the library but on the hidden list, the way native's libIndex keeps
  // it (COACH-REPORT §28). The second is the one that proves the hidden list is
  // read rather than the lookup merely failing.
  const hiddenWeb = read(live([['bench', n('bench', 4)], ['incline', n('incline', 3)]]),
    { hidden: ['fly'], lib: Object.fromEntries(Object.entries(LIB).filter(([k]) => k !== 'fly')) });
  const hiddenNative = read(live([['bench', n('bench', 4)], ['incline', n('incline', 3)]]), { hidden: ['fly'] });
  check('the fly hidden from the picker: never suggested, and no other lift claimed in its place',
        [hiddenWeb, hiddenNative].every(h => !h || (h.exId !== 'fly' && h.kind !== 'next')),
        [hiddenWeb, hiddenNative].map(h => h && h.kind + ': ' + h.text).join(' | '));
}

/* ================= E. NO NUMBER TO PUT ON THE BAR ================= */
section('E. no weight suggested anywhere — a figure with a unit is a quote of a logged set or it is a failure');
{
  // Every answer the sessions above and a spread of others can produce, in
  // both units, with every string in it: text, the short nudge, and the why.
  const sessions = [
    live([['bench', n('bench', 4)], ['incline', n('incline', 3)]]),
    live([['bench', n('bench', 3)]]),
    live([['bench', n('bench', 4)], ['incline', n('incline', 3)], ['fly', n('fly', 3)]]),
    live([['bench', n('bench', 4)], ['incline', n('incline', 3)], ['fly', n('fly', 3)], ['curl', n('curl', 3)], ['pushdown', n('pushdown', 3)]]),
    live([['bench', [[185, 8], [185, 8], [185, 6, 'F']]], ['incline', [[65, 10], [65, 10], [65, 7]]]]),
    live([['row', n('row', 4)]]),
    live([['row', n('row', 4)], ['pulldown', n('pulldown', 3)]]),
    live([['squat', n('squat', 4)]]),
    live([['curl', n('curl', 2)]]),
    live([['bench', n('bench', 1)], ['dips', [[0, 10]]]])
  ];
  const out = [];
  const kinds = new Set();
  ['lb', 'kg'].forEach(u => sessions.forEach((s, k) => [null, 0].forEach(cur => {
    const a = read(s, { u }, cur === null ? undefined : { current: cur });
    if (!a) return;
    kinds.add(a.kind);
    [a.text, a.short].concat(a.why).forEach(t => out.push({ u, t: String(t) }));
  })));
  out.push({ u: 'lb', t: L.LIVE_NONE.text }, ...L.LIVE_NONE.why.map(t => ({ u: 'lb', t })));
  check('the sweep reached all four answers (' + out.length + ' strings)', kinds.size === 4 && out.length > 60,
        [...kinds].join(', '));

  const allowed = { lb: new Set(), kg: new Set() };
  HISTORY.forEach(s => s.exercises.forEach(ex => ex.sets.forEach(x => {
    ['lb', 'kg'].forEach(u => { const f = U.fmtSetLoad(x.w, u); if (f && f !== 'BW') allowed[u].add(f); });
  })));
  const figures = [];
  out.forEach(({ u, t }) => {
    for (const m of t.matchAll(/(\d[\d.,]*)\s*(lb|kg)\b/g)) {
      figures.push(m[1]);
      const ok = m[2] === u && allowed[u].has(m[1]);
      if (!ok) figures.bad = (figures.bad || []).concat(u + ': ' + m[0] + ' in: ' + t);
    }
  });
  check('every figure with a unit on it is the load of a set in the log, in the account’s own unit',
        figures.length > 0 && !(figures.bad || []).length, list(figures.bad || []) || figures.length + ' figures');
  check('and figures WERE printed — the quote of the suggested exercise’s last session is on the sheet',
        out.some(x => /^Last time on Cable Crossover: 3 × 12 at 40 lb\.$/.test(x.t)) &&
        out.some(x => /^Last time on Cable Crossover: 3 × 12 at 18\.1 kg\.$/.test(x.t)),
        out.filter(x => /Last time/.test(x.t)).map(x => x.t).slice(0, 2).join(' | '));
  const WORDS = [/\bheavier\b/i, /\blighter (load|weight) next\b/i, /\bgo up\b/i, /\bincrease\b/i, /\badd (weight|\d)/i,
                 /\bmore weight\b/i, /\btry\b/i, /\bmax\b/i, /\bPR\b/, /\brecord\b/i, /\bpush (it|harder|through)\b/i,
                 /\bpain\b/i, /\binjur/i, /\bhurt/i];
  const pushy = out.filter(x => WORDS.some(re => re.test(x.t)) &&
    // "at the same or a lighter weight" is the fatigue rule stated, not advice.
    !/at the same or a lighter weight/.test(x.t));
  check('no word that would turn a quote into a suggestion — heavier, go up, try, max, and nothing about pain',
        !pushy.length, list(pushy.map(x => x.t)));
  check('and nothing in coach-live.js writes a unit word itself — unitW() is the only source of one',
        !/'[^']*\b(lb|lbs|kg|kgs|pounds?|kilos?)\b[^']*'/i.test(src('coach-live.js')
          .replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n')
          .replace(/=== 'kg' \? 'kg' : 'lb'/g, '')));
}

/* ================= F. THE EXERCISE IN HAND ================= */
section('F. the exercise in hand is the one the caller names');
{
  const s = live([['bench', n('bench', 3)], ['incline', n('incline', 3)]]);
  const onBench = read(s, {}, { current: 0 });
  const onIncline = read(s, {}, { current: 1 });
  check('named bench, three sets in: one more set of bench', onBench && onBench.kind === 'another' && onBench.exId === 'bench',
        onBench && onBench.kind);
  check('named incline, at its usual three: what comes next, not one more',
        onIncline && onIncline.kind === 'next' && onIncline.exId === 'fly', onIncline && onIncline.kind);
  check('unnamed, it is the last exercise on the list with a ticked set — incline here',
        J(read(s)) === J(onIncline));
  const dup = live([['bench', n('bench', 2)], ['incline', n('incline', 3)], ['bench', n('bench', 1)]]);
  const merged = read(dup, {}, { current: 2 });
  check('the same exercise twice in one session is one exercise — merged, as every reader of a session merges it',
        merged && merged.kind === 'another' && /4 or more in 10/.test(merged.text), merged && merged.text);
}

/* ================= G. PURE ================= */
section('G. the same session, read twice, is the same answer — and is never written to');
{
  const s = live([['bench', n('bench', 4)], ['incline', n('incline', 3)]]);
  const before = J(s);
  const a = J(read(s)), b = J(read(s));
  check('read twice: identical', a === b && a !== 'null');
  check('read on a deep copy: identical', a === J(read(clone(s))));
  check('the live session is byte-for-byte what it was handed in as', J(s) === before);
  const t0 = Date.now();
  while (Date.now() === t0) { /* past a millisecond of real time */ }
  check('and the wall clock moving moves nothing — `now` is the only clock', a === J(read(s)));
  const later = J(read(s, { now: NOW + 80 * DAY }));
  check('while moving `now` past the window does — the habits it read have aged out', later !== a, later);
  check('liveRead survives junk without throwing',
        [null, undefined, {}, { session: 5 }, { session: { exercises: 'x' } }, { session: { exercises: [null, {}] } }]
          .every(x => L.liveRead(x) === null));
}

/* ---------- report ---------- */
console.log('\nCoach in the gym says what it can back with his own log, and nothing about the bar\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
