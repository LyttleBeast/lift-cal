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
/* coach-goal.js and coach-prog.js — v48's targets — are staged the same way:
   coach-build.js imports coach-prog.js, which takes the same session math
   through the stub, and coach-goal.js imports nothing at all. */
writeFileSync(join(dir, 'coach-prog.mjs'), src('coach-prog.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
writeFileSync(join(dir, 'coach-build.mjs'), src('coach-build.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './blocks.js'", 'from ' + real('blocks.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-prog.js'", 'from ' + at('coach-prog.mjs'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
writeFileSync(join(dir, 'coach-live.mjs'), src('coach-live.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
/* coach-overlap.js — v49's stage two, the plateau-or-cut call — is staged the
   same way: coach.js imports it, and it reads coach-prog.js's baselines and
   the same session math through the stub. */
writeFileSync(join(dir, 'coach-overlap.mjs'), src('coach-overlap.js')
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
// v52: coach-fuel.js, staged the same way (the staging edit the brief allows everywhere).
writeFileSync(join(dir, 'coach-fuel.mjs'), src('coach-fuel.js')
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
// v52: coach-ready.js, staged the same way (the staging edit the brief allows everywhere).
writeFileSync(join(dir, 'coach-ready.mjs'), src('coach-ready.js')
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href))
  .replace("from './coach-overlap.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-overlap.mjs')).href))
  .replace("from './coach-live.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-live.mjs')).href)));
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-build.js'", 'from ' + at('coach-build.mjs'))
  .replace("from './coach-live.js'", 'from ' + at('coach-live.mjs'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './coach-overlap.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-overlap.mjs')).href))
  .replace("from './coach-fuel.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-fuel.mjs')).href))
  .replace("from './coach-ready.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-ready.mjs')).href))
  .replace("from './coach-prog.js'", 'from ' + at('coach-prog.mjs'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);
const L = await import(pathToFileURL(join(dir, 'coach-live.mjs')).href);
const U = await import(real('units.js').slice(1, -1));
// v54: the real coach-prog.js, as staged for coach.js, for the targets the
// fence allows — worked out by the engine, never restated here.
const P = await import(pathToFileURL(join(dir, 'coach-prog.mjs')).href);
const EFFORT_RIRS = [4, 2, 0, null];

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

/* v54: THE NEXT SET'S FIXTURE. Eight weeks of four lifts climbing by his own
   steps, typed in the account's own unit — a kilo account's loads are kilos
   converted once, so they sit on the half-kilo grid and name targets there.
   Every lift ends two sessions at its top weight, so each has a target one of
   its steps up: bench 190 lb × 8 (87.5 kg), row 155 × 10 (70), squat 265 × 5
   (120), incline dumbbell 70 × 10 (30), and an assisted pull-up, which names
   no next set at all. The targets and steps below are coach-prog.js's own,
   through the overlap input coach.js builds — read, never typed. */
function fence(u) {
  const FL = {
    'barbell-bench-press': { name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell' },
    'incline-dumbbell-bench-press': { name: 'Incline Dumbbell Bench Press', group: 'chest', equipment: 'dumbbell' },
    'barbell-row': { name: 'Barbell Row', group: 'back', equipment: 'barbell' },
    'back-squat-high-bar': { name: 'Back Squat (High Bar)', group: 'legs', equipment: 'barbell' },
    'assisted-pull-up': { name: 'Assisted Pull-Up', group: 'back', equipment: 'machine' }
  };
  const PLAN = u === 'kg'
    ? { 'barbell-bench-press': [[77.5, 80, 80, 82.5, 82.5, 85, 85, 85], 8], 'incline-dumbbell-bench-press': [[22, 24, 24, 26, 26, 28, 28, 28], 10],
        'barbell-row': [[57.5, 60, 60, 62.5, 62.5, 65, 67.5, 67.5], 10], 'back-squat-high-bar': [[95, 100, 100, 105, 105, 110, 115, 115], 5],
        'assisted-pull-up': [[27.5, 25, 25, 22.5, 22.5, 20, 20, 20], 8] }
    : { 'barbell-bench-press': [[170, 175, 175, 180, 180, 185, 185, 185], 8], 'incline-dumbbell-bench-press': [[50, 55, 55, 60, 60, 65, 65, 65], 10],
        'barbell-row': [[135, 140, 140, 145, 145, 150, 150, 150], 10], 'back-squat-high-bar': [[225, 235, 235, 245, 245, 255, 255, 255], 5],
        'assisted-pull-up': [[60, 55, 55, 50, 50, 45, 45, 45], 8] };
  const store = L => (u === 'kg' ? String(U.wIn(L, 'kg')) : String(L));
  const ex = (id, sets) => ({ exId: id, ...FL[id], sets });
  const sessions = [];
  for (let k = 0; k < 8; k++) {
    const ago = 3 + 7 * (7 - k);
    const s3 = (id, sh) => ex(id, Array.from({ length: 3 }, () => ({ w: store(PLAN[id][0][k]), r: String(PLAN[id][1]), type: 'N', done: true })));
    sessions.push({ id: 'fp' + k, startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY),
                    exercises: [s3('barbell-bench-press'), s3('incline-dumbbell-bench-press')] });
    sessions.push({ id: 'fb' + k, startedAt: NOW - (ago + 2) * DAY, _date: key(NOW - (ago + 2) * DAY),
                    exercises: [s3('barbell-row'), s3('assisted-pull-up')] });
    sessions.push({ id: 'fl' + k, startedAt: NOW - (ago + 4) * DAY, _date: key(NOW - (ago + 4) * DAY),
                    exercises: [s3('back-squat-high-bar')] });
  }
  sessions.sort((a, b) => a.startedAt - b.startedAt);
  const inp = { ...input({ u, sessions, lib: FL }) };
  const OI = C.overlapInput(inp);
  const ctx = { now: NOW, u, aim: null, exp: null, energy: null, rateWk: null };
  const r2 = x => Math.round(x * 100) / 100;
  const target = {}, step = {}, logged = {}, reps = {};
  Object.keys(FL).forEach(id => {
    const l = OI.lifts.find(x => x.exId === id);
    const t = l ? P.targetFor(l, ctx, l.mark || null) : null;
    target[id] = t && t.loadLb != null ? r2(U.wOut(t.loadLb, u)) : null;
    const b = l ? P.baselines(l, ctx) : null;
    step[id] = b && b.step ? b.step.value : null;
    logged[id] = [...new Set(PLAN[id][0])];
    reps[id] = PLAN[id][1];
  });
  const allowed = (id, sets) => new Set(logged[id].concat(sets.filter(z => z.w !== '').map(z => r2(U.wOut(parseFloat(z.w) || 0, u))),
    target[id] != null ? [target[id]] : [], target[id] != null && step[id] ? [r2(target[id] + step[id])] : []));
  return { input: inp, ids: Object.keys(FL), target, step, logged, reps, store, ex, allowed, sessions, lib: FL };
}

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

/* ================= E. A NUMBER FOR THE BAR IS A QUOTE OR A TARGET =================
   Until v54 this section read "no weight suggested anywhere". Stage five
   REPLACED that fence rather than deleting it (spec §3.10, SHIP-V54-PROMPT
   §5.2): the live sheet now says the next set, and every number it prints is
   either a quote of a set he logged or a coach-prog.js target — the session's
   target, one of the lift's own steps above it, a load he has logged — with
   nothing heavier after a stop and no second step up in a session, in pounds
   and in kilos. The first half below is the shipped check, unchanged: the four
   habit answers still quote and never suggest. The second half is the new
   fence, over the next set (section H drives its rules one by one). */
section('E. a number for the bar is a quote of a logged set or a coach-prog.js target — nothing heavier after a stop, one step a session, both units');
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

  /* ---- v54: the next set, swept ----
     Generated live sessions, a seeded generator, both units — the kilo sweep
     on a log typed in kilos (fence(), section H's fixture), since a pound log
     read in kilos is off the half-kilo grid and names no target at all. For
     each, the sheet's next set and Coach's words after a tap on each chip. The
     allowed numbers are worked out by the REAL coach-prog.js, through the same
     overlap input coach.js builds: the lift's target, that plus one of its own
     steps, and every load logged — in the log or on the live session itself.
     Nothing here restates a rule. */
  const swept = { lb: 0, kg: 0 }, stops = { lb: 0, kg: 0 }, ups = { lb: 0, kg: 0 };
  const off = [], heavyAfterStop = [], twoSteps = [], pastStep = [];
  for (const u of ['lb', 'kg']) {
    const F = fence(u);
    let seed = u === 'kg' ? 91 : 17;
    const rnd = k => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 65536) % k; };
    for (let k = 0; k < 500; k++) {
      const id = F.ids[rnd(F.ids.length)];
      const T = F.target[id], S = F.step[id];
      if (T == null) continue;
      const loads = [T, T, T, S ? T + S : T, F.logged[id][rnd(F.logged[id].length)]];
      const count = rnd(5);
      const sets = [];
      for (let j = 0; j < count; j++) {
        const ld = loads[rnd(loads.length)];
        const r = Math.max(1, F.reps[id] + rnd(5) - 2);
        const type = rnd(9) === 0 ? 'F' : 'N';
        const rir = [null, null, 4, 2, 0][rnd(5)];
        sets.push({ w: F.store(ld), r: String(r), type, done: true, ...(rir == null ? null : { rir }) });
      }
      sets.push({ w: '', r: '', type: 'N', done: false });
      const s = { id: 'wsweep', name: 'Sweep', startedAt: NOW - 1800e3, exercises: [F.ex(id, sets)] };
      const got = C.coach(F.input).liveSet(s, { current: 0 });
      const nx = got && got.next;
      if (!nx) continue;
      swept[u]++;
      const said = [nx.text].concat(nx.why, EFFORT_RIRS.map(v => L.rateAnswer(v, nx, u)));
      const allowed = F.allowed(id, sets);
      said.forEach(t => { for (const m of t.matchAll(/(\d[\d.,]*)\s*(lb|kg)\b/g)) {
        const v = Number(m[1].replace(/,/g, ''));
        if (m[2] !== u || ![...allowed].some(a => Math.abs(a - v) < 0.06)) off.push(u + ': ' + m[0] + ' in: ' + t + ' · ' + J(sets.map(z => z.w + 'x' + z.r)));
      } });
      const lu = w => Math.round(U.wOut(parseFloat(w) || 0, u) * 100) / 100;
      const done = sets.filter(z => z.done);
      const next = lu(nx.tw);
      const first = done[0];
      const stop = done.some(z => z.type === 'F' || z.rir === 0) ||
        done.slice(1).some(z => lu(z.w) <= lu(first.w) && Number(z.r) <= Number(first.r) * (1 - L.REP_DROP));
      if (stop) {
        stops[u]++;
        if (nx.kind !== 'stop' || next > lu(done[done.length - 1].w) + 0.01) heavyAfterStop.push(u + ' ' + id + ': ' + J(sets.map(z => z.w + 'x' + z.r + (z.type === 'F' ? 'F' : '') + (z.rir != null ? '@' + z.rir : ''))) + ' → ' + nx.kind + ' ' + next);
      }
      if (nx.kind === 'up') ups[u]++;
      if (done.some(z => lu(z.w) > T + 0.01) && next > Math.max(...done.map(z => lu(z.w))) + 0.01) twoSteps.push(u + ' ' + id + ': ' + next);
      if (next > T + (S || 0) + 0.01) pastStep.push(u + ' ' + id + ': ' + next + ' over ' + T + ' + ' + S);
    }
  }
  check('the next set, swept over ' + (swept.lb + swept.kg) + ' live sessions (' + swept.lb + ' lb, ' + swept.kg + ' kg): every figure is a logged load or a coach-prog.js target, in the account’s unit',
        swept.lb > 150 && swept.kg > 150 && !off.length, list(off));
  check('nothing heavier after a stop — a set to failure, a set rated too hard, reps down a quarter (' + (stops.lb + stops.kg) + ' stops)',
        stops.lb > 20 && stops.kg > 20 && !heavyAfterStop.length, list(heavyAfterStop));
  check('no second step up on a lift in one session', !twoSteps.length, list(twoSteps));
  check('and never more than one of the lift’s own steps over its target (' + (ups.lb + ups.kg) + ' steps up swept)',
        ups.lb > 5 && ups.kg > 5 && !pastStep.length, list(pastStep));
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

/* ================= H. v54 — THE NEXT SET, AND HIS RATING OF THE LAST ONE ================= */
section('H. v54 — the next set (spec §3.10 with his rating), each rule by name, and the set the chips rate');
{
  /* Every rule of SHIP-V54-PROMPT §5.2, driven through c.liveSet — the call
     the live sheet makes — on fence()'s log: bench's target is 190 lb × 8
     (87.5 kg × 8), one of his 5 lb (2.5 kg) steps over the 185 he did twice. */
  const FL = fence('lb'), FK = fence('kg');
  check('the fixture’s targets are coach-prog.js’s: bench 190 lb / 87.5 kg, squat 265 / 120, row 155 / 70, incline 70 / 30, assisted none',
        FL.target['barbell-bench-press'] === 190 && FK.target['barbell-bench-press'] === 87.5 &&
        FL.target['back-squat-high-bar'] === 265 && FK.target['back-squat-high-bar'] === 120 &&
        FL.target['barbell-row'] === 155 && FK.target['barbell-row'] === 70 &&
        FL.target['incline-dumbbell-bench-press'] === 70 && FK.target['incline-dumbbell-bench-press'] === 30,
        J({ lb: FL.target, kg: FK.target }));
  const B = 'barbell-bench-press';
  const sess = (F, id, rows, extra) => ({ id: 'wh', name: 'H', startedAt: NOW - 1800e3, ...(extra || null),
    exercises: [F.ex(id, rows.map(([w, r, x]) => ({ w: w === '' ? '' : F.store(w), r: r === '' ? '' : String(r), type: (x && x.type) || 'N',
      done: !(x && x.open), ...(x && x.rir != null ? { rir: x.rir } : null) })))] });
  const nextOf = (F, s, extra, opts) => C.coach({ ...F.input, ...(extra || null) }).liveSet(s, opts || { current: 0 });
  const said = (F, rows, extra) => { const r = nextOf(F, sess(F, B, rows), extra); return r && r.next ? r.next.kind + ' · ' + r.next.text : r && r.next; };
  const rows = [
    ['nothing ticked yet: the session’s target', [['', '', { open: true }], ['', '', { open: true }]], 'target · Next set: 190 lb × 8.'],
    ['190 × 8, the target met: the same again', [[190, 8]], 'same · Next set: 190 lb × 8.'],
    ['190 × 10, two past the target at its weight: one step up', [[190, 10]], 'up · Next set: 195 lb × 8.'],
    ['190 × 8 rated way too easy: one step up', [[190, 8, { rir: 4 }]], 'up · Next set: 195 lb × 8.'],
    ['190 × 8 rated about right: nothing moves', [[190, 8, { rir: 2 }]], 'same · Next set: 190 lb × 8.'],
    ['190 × 8 rated too hard: stop — the same weight, nothing heavier', [[190, 8, { rir: 0 }]], 'stop · Next set: 190 lb × 8.'],
    ['190 × 10 then 195 × 10: the step is used — the same again, never a second', [[190, 10], [195, 10]], 'same · Next set: 195 lb × 8.'],
    ['195 × 8 rated way too easy after the step: the same again', [[190, 10], [195, 8, { rir: 4 }]], 'same · Next set: 195 lb × 8.'],
    ['190 × 8 to failure: stop', [[190, 8, { type: 'F' }]], 'stop · Next set: 190 lb × 8.'],
    ['190 × 8 then 190 × 6, reps down a quarter: stop', [[190, 8], [190, 6]], 'stop · Next set: 190 lb × 8.'],
    ['a stop, then a set rated way too easy: still nothing heavier', [[190, 8, { rir: 0 }], [190, 8, { rir: 4 }]], 'stop · Next set: 190 lb × 8.'],
    ['190 × 7, under the bottom of his range: one step down, to 185, a weight he has logged', [[190, 7]], 'down · Next set: 185 lb × 8.'],
    ['190 × 12 at a load he chose under the target (185): not the target’s weight, so no step — the same again', [[185, 12]], 'same · Next set: 185 lb × 8.']
  ];
  rows.forEach(([label, r, want]) => check(label, said(FL, r) === want, String(said(FL, r))));
  check('in kilos, the same rules on his own grid: 87.5 × 8 rated way too easy → 90 kg × 8, stored as pounds',
        said(FK, [[87.5, 8, { rir: 4 }]]) === 'up · Next set: 90 kg × 8.' &&
        nextOf(FK, sess(FK, B, [[87.5, 8, { rir: 4 }]])).next.tw === String(U.wIn(90, 'kg')), String(said(FK, [[87.5, 8, { rir: 4 }]])));
  check('and a kilo stop: 87.5 × 8 rated too hard → stay at 87.5', said(FK, [[87.5, 8, { rir: 0 }]]) === 'stop · Next set: 87.5 kg × 8.');
  check('a dumbbell in kilos steps by his own 2 kg: 30 × 12 → 32 kg × 10',
        (nextOf(FK, sess(FK, 'incline-dumbbell-bench-press', [[30, 12]])).next || {}).text === 'Next set: 32 kg × 10.');
  check('squat: 265 × 3, under his 5 — one step down to 255, logged', (nextOf(FL, sess(FL, 'back-squat-high-bar', [[265, 3]])).next || {}).text === 'Next set: 255 lb × 5.');
  check('an assisted lift: no next set, ever (less help is the heavier set, and Coach names none mid-session)',
        nextOf(FL, sess(FL, 'assisted-pull-up', [[45, 8]])).next === null);
  const tail = FL.sessions.map(s => ({ ...s, exercises: s.exercises.map(e => e.exId !== B || s !== FL.sessions.filter(x => x.exercises.some(z => z.exId === B)).pop() ? e
    : { ...e, sets: [{ w: '205', r: '5', type: 'N', done: true }, { w: '175', r: '8', type: 'N', done: true }, { w: '175', r: '8', type: 'N', done: true }] }) }));
  check('a lift Coach cannot target (a top set with back-offs after straight sets — a defer): no number, and the chips still rate',
        (() => { const r = nextOf(FL, sess(FL, B, [[185, 8]]), { sessions: tail }); return r && r.next === null && !!r.rated; })());

  // The gates.
  const one = sess(FL, B, [[190, 8]]);
  const off = nextOf(FL, one, { settings: { v: 1, mute: { targets: true }, answers: {}, asked: {} } });
  check('"Weight and rep targets" off: no next-set number — and the chips still rate the set', off && off.next === null && !!off.rated && off.rated.n === 1);
  check('an edit of a past session: nothing at all — no chips, no number', nextOf(FL, { ...one, _edit: { mk: '2026-09', dd: '01' } }) === null);
  check('Basic: nothing — the chips live in the sheet the Pro chip opens', nextOf(FL, one, { tier: { pro: false } }) === null);
  check('"In the gym" off: nothing — no chip, so no sheet', nextOf(FL, one, { settings: { v: 1, mute: { live: true }, answers: {}, asked: {} } }) === null);
  const unread = nextOf(FL, one, { log: 'unknown' });
  check('a log Coach could not read: no number off it, and the chips still rate', unread && unread.next === null && !!unread.rated);
  // DONE is still tried first: a session at its usual length has no next set.
  const s4 = live([['bench', n('bench', 4)], ['incline', n('incline', 3)], ['fly', n('fly', 3)], ['curl', n('curl', 3)], ['pushdown', n('pushdown', 3)]]);
  const d4 = C.coach(input()).liveSet(s4, { current: 0 });
  check('when the session reads "you’re probably good for today", no next-set number is shown',
        read(s4, {}, { current: 0 }).kind === 'done' && d4 && d4.next === null && !!d4.rated, J(d4 && d4.next));
  const s1 = live([['bench', n('bench', 1)]]);
  check('while one set into the same lift, on the same log, there is one — the gate is done, nothing else',
        !!(C.coach(input()).liveSet(s1, { current: 0 }) || {}).next);

  // The set the chips rate.
  const dup = { id: 'wd', name: 'D', startedAt: NOW - 1800e3, exercises: [
    FL.ex(B, [{ w: '190', r: '8', type: 'N', done: true }, { w: '190', r: '8', type: 'N', done: true }]),
    FL.ex('barbell-row', [{ w: '155', r: '10', type: 'N', done: true }]),
    FL.ex(B, [{ w: '190', r: '7', type: 'N', done: true, rir: 2 }, { w: '', r: '', type: 'N', done: false }])] };
  const rd = nextOf(FL, dup, null, { current: 2 });
  check('the last ticked working set of the exercise in hand, across a duplicated block: the second copy’s set 1',
        rd && rd.rated && rd.rated.exIdx === 2 && rd.rated.setIdx === 0 && rd.rated.n === 1 && rd.rated.rir === 2, J(rd && rd.rated));
  const warm = nextOf(FL, sess(FL, B, [[95, 10, { type: 'W' }]]));
  check('a warm-up is not a working set: nothing to rate yet, and the target stands', warm && warm.rated === null && warm.next && warm.next.kind === 'target');
  check('"Set 3 · 190 lb × 8. How was it?" — in kilos "Set 1 · 87.5 kg × 8.", at bodyweight "bodyweight × 10"',
        L.rateAsk({ n: 3, w: '190', r: 8 }, 'lb') === 'Set 3 · 190 lb × 8. How was it?' &&
        L.rateAsk({ n: 1, w: String(U.wIn(87.5, 'kg')), r: 8 }, 'kg') === 'Set 1 · 87.5 kg × 8. How was it?' &&
        L.rateAsk({ n: 1, w: '0', r: 10 }, 'lb') === 'Set 1 · bodyweight × 10. How was it?');
  check('the three chips, in his words, and the integer each stores', J(L.EFFORT) === J([{ rir: 4, label: 'Way too easy' }, { rir: 2, label: 'About right' }, { rir: 0, label: 'Too hard' }]));

  // What Coach says after a tap: warm first, then the number.
  const nx = rows_ => nextOf(FL, sess(FL, B, rows_)).next;
  const words = [
    [4, nx([[190, 8, { rir: 4 }]]), 'Strong set. Next one: 195 lb × 8.'],
    [4, nx([[190, 10], [195, 8, { rir: 4 }]]), 'Good. Stay at 195 lb for the next one.'],
    [2, nx([[190, 8, { rir: 2 }]]), 'Good. Same again: 190 lb × 8.'],
    [0, nx([[190, 8, { rir: 0 }]]), 'Noted. Stay at 190 lb, or call that the last set of this one.'],
    [2, nx([[190, 7, { rir: 2 }]]), 'Good. Next one: 185 lb × 8.'],
    [4, null, 'Strong set. Saved with the set.'],
    [0, null, 'Noted. Saved with the set.'],
    [null, nx([[190, 8]]), 'Cleared.']
  ];
  const wrongWords = words.filter(([v, n2, w]) => L.rateAnswer(v, n2, 'lb') !== w).map(([v, n2, w]) => v + ': ' + L.rateAnswer(v, n2, 'lb') + ' (want ' + w + ')');
  check('after a tap: "Strong set. Next one: 195 lb × 8." · "Good. Stay at 195 lb for the next one." · "Good. Same again: 190 lb × 8." · ' +
        '"Noted. Stay at 190 lb, or call that the last set of this one." · and with no next set, the rating saved',
        !wrongWords.length, list(wrongWords));
  check('and in kilos, through units.js', L.rateAnswer(4, nextOf(FK, sess(FK, B, [[87.5, 8, { rir: 4 }]])).next, 'kg') === 'Strong set. Next one: 90 kg × 8.');

  // The habit answers with a rating: exactly today's with no target in hand,
  // and "one more set" never above a stopped next set.
  const three = rir => live([['bench', n('bench', 3)]]).exercises.map(e => ({ ...e, sets: e.sets.map((s, i) => (i === 2 && rir != null ? { ...s, rir } : s)) }));
  const liveOf = rir => ({ id: 'wlive', name: 'Live', startedAt: NOW - 1800e3, exercises: three(rir) });
  const targetsOff = { settings: { v: 1, mute: { targets: true }, answers: {}, asked: {} } };
  check('targets off, the live answer is exactly today’s whatever the rating — "one more set" on three of bench, rated too hard or not',
        J(read(liveOf(0), targetsOff)) === J(read(liveOf(null), targetsOff)) && read(liveOf(0), targetsOff).kind === 'another');
  check('with a target in hand, a set rated too hard stops the lift: "one more set" is not said above "call that the last set"',
        (read(liveOf(0)) || {}).kind !== 'another' && (read(liveOf(null)) || {}).kind === 'another' &&
        C.coach(input()).liveSet(liveOf(0), { current: 0 }).next.kind === 'stop');
  check('and the one quiet line under a finished exercise never carries a number — its short answer is the habit answer’s',
        [liveOf(null), liveOf(0), s1, s4].every(s => { const a = read(s); return !a || !/\d\s*(lb|kg)\b/.test(a.short || ''); }));
}

/* ================= I. v54 — TODAY IS A DAY, NOT A SESSION ================= */
section('I. v54 — a second session on the same day: what he trained this morning counts as trained today');
{
  /* SHIP-V54-PROMPT §6 and decision 10. Until v54 the live read saw the
     active session and nothing else, so an evening session's Coach could call
     chest "nothing in it yet" hours after a chest day. The morning here starts
     at 00:20 on the live session's own day — the only hour that is earlier
     the same day in every zone this runs in (01:05 in Auckland) — and is in
     `sessions`, the window coach.js already hands in: nothing new is read. */
  const liveStart = NOW - 40 * 60 * 1000;
  const MORN = (() => { const d = new Date(liveStart); d.setHours(0, 20, 0, 0); return d.getTime(); })();
  const morning = rows => ({ id: 'am', startedAt: MORN, endedAt: MORN + 30 * 60e3, durationSec: 1800, _date: key(MORN), exercises: rows });
  const withAm = rows => ({ sessions: HISTORY.concat([morning(rows)]).sort((a, b) => a.startedAt - b.startedAt) });
  const chestAm = [logged('bench', 4), logged('incline', 3), logged('fly', 3)];
  const armsPm = live([['pushdown', n('pushdown', 3)], ['curl', n('curl', 3)]]);
  check('the fixture: the morning is on the live session’s own day and before it, in every zone',
        key(MORN) === key(liveStart) && MORN + 30 * 60e3 < liveStart);

  // Control: no morning — arms has had its usual, and chest is "untouched".
  const alone = read(armsPm);
  check('control, one session: arms at its usual, and chest is the part with nothing in it yet — the old read',
        alone && alone.kind === 'switch' && alone.group === 'chest', alone && alone.kind + ': ' + alone.text);

  // A. The same shape split across two visits: counted together for done.
  const split = read(armsPm, withAm(chestAm));
  check('the same shape across two visits (chest this morning, arms now): their sets count together — "done", 16 against a usual 16',
        split && split.kind === 'done' && split.text === 'You’re probably good for today — 16 working sets across today’s visits against a usual 16.',
        split && split.kind + ': ' + split.text);
  check('with the why saying where the sixteen came from',
        split && split.why[0] === '16 working sets today, 6 of them this session and 10 earlier. Across your chest and arms days in the last twelve weeks, the median is 16.',
        split && split.why[0]);
  check('and its short line says today', split && split.short === 'You’re probably good for today: 16 working sets today.', split && split.short);

  // B. Different shapes: two workouts are two workouts.
  const chestBackAm = [logged('bench', 4), logged('incline', 3), logged('row', 4)];
  const diff = read(armsPm, withAm(chestBackAm));
  check('a different shape this morning (chest and back): done stays per session — not "good for today" off 6 + 11 sets',
        !diff || diff.kind !== 'done', diff && diff.kind + ': ' + diff.text);
  check('and chest, trained this morning, is never "nothing in it yet": no switch to it, nothing of it added',
        !diff || (diff.group !== 'chest' && !(diff.add && diff.add.group === 'chest') && !/Chest is the part/.test(diff.text)),
        diff && diff.kind + ': ' + diff.text);
  const legs = read(live([['squat', n('squat', 4)], ['rdl', n('rdl', 3)]]), withAm(chestBackAm));
  const legsAlone = read(live([['squat', n('squat', 4)], ['rdl', n('rdl', 3)]]));
  check('a leg day this evening after a chest-and-back morning reads exactly as a leg day on its own would',
        J(legs) === J(legsAlone), J(legs) + ' / ' + J(legsAlone));

  // C. The sweep: an evening after a morning chest day never suggests chest.
  const mornings = [chestAm, [logged('bench', 4), logged('incline', 3)], [logged('bench', 4, { warm: true }), logged('fly', 3), logged('curl', 3)],
                    chestBackAm, [logged('fly', 3), logged('incline', 3), logged('pushdown', 3), logged('curl', 3)]];
  const pool = ['curl', 'pushdown', 'row', 'pulldown', 'squat', 'rdl'];
  const bad = [];
  let reads = 0, answered = 0;
  mornings.forEach((am, mi) => {
    for (let mask = 1; mask < 64; mask++) {
      const rows = pool.filter((_, b) => mask & (1 << b)).map(id => [id, n(id, 3)]);
      [null, 0, rows.length - 1].forEach(cur => {
        const a = read(live(rows), withAm(am), cur == null ? undefined : { current: cur });
        reads++;
        if (!a) return;
        answered++;
        const chesty = (a.group === 'chest') || (a.add && a.add.group === 'chest') || /\b(Chest is|chest with nothing)\b/.test(a.text);
        if (chesty) bad.push('morning ' + mi + ', ' + rows.map(r => r[0]).join('+') + ': ' + a.kind + ' — ' + a.text);
      });
    }
  });
  check('over ' + reads + ' evening reads after five kinds of chest morning (' + answered + ' answered): never a switch to chest, never a chest exercise put in front of him',
        reads > 900 && answered > 100 && !bad.length, list(bad));

  // D. Next never offers what he did this morning.
  const benchPm = live([['bench', n('bench', 4)]]);
  const nextAlone = read(benchPm, {}, { current: 0 });
  const nextAm = read(benchPm, withAm([logged('incline', 3), logged('fly', 3)]), { current: 0 });
  check('control: after bench, the next exercise is usually incline', nextAlone && nextAlone.kind === 'next' && nextAlone.exId === 'incline',
        nextAlone && nextAlone.kind + ': ' + nextAlone.text);
  check('with incline and fly done this morning, neither is offered next — an exercise done earlier today is done',
        !nextAm || !['incline', 'fly'].includes(nextAm.exId), nextAm && nextAm.kind + ': ' + nextAm.text);
  const setAm = C.coach(input(withAm(chestAm))).liveSet(armsPm, { current: 1 });
  check('and on a day read as done across its visits, no next-set number either', setAm && setAm.next === null && !!setAm.rated);

  // E. After the second session is finished.
  // No duration on it, like every session of this fixture — or it would be
  // "Longest session ever." against a log that records none.
  const eve = { id: 'pm', name: 'Evening session', startedAt: liveStart, endedAt: NOW - 5 * 60e3, _date: key(liveStart),
                exercises: [logged('pushdown', 3), logged('curl', 3)] };
  const day2 = { ...input({ live: { active: false } }), sessions: HISTORY.concat([morning(chestAm), eve]).sort((a, b) => a.startedAt - b.startedAt) };
  const c2 = C.coach(day2);
  const fin = C.finishRead(day2, eve);
  check('the state after the second finish is "post" — the card and the sheet speak of a workout just done', C.stateOf(day2, NOW) === 'post' && c2.state === 'post');
  check('the finish line is the evening’s: "Arms done: 6 sets." — never the morning’s chest',
        fin.headline === 'Good work.' && fin.line === 'Arms done: 6 sets.' && c2.opening.text === fin.headline + ' ' + fin.line, fin.headline + ' ' + fin.line + ' / ' + c2.opening.text);
  check('the card’s finish line is keyed to the evening session', c2.card.you.id === 'hype_finish' && c2.card.you.key === 'finish:pm', J(c2.card.you));
  const cmp = c2.ask('ask_compare');
  const cmpRows = [cmp.text].concat((cmp.more || []).map(m => m.text));
  check('"How did today compare?" reads the session just finished: its lifts, never the morning’s',
        cmp.id === 'session_compare' && cmpRows.some(t => /Barbell Curl|Triceps Pushdown/.test(t)) && !cmpRows.some(t => /Bench|Incline|Crossover/.test(t)),
        list(cmpRows));
  const later = { ...day2, now: NOW + 3.5 * 3600e3 };
  check('three and a half hours on, "done_today" — the day is still a training day, and wherever "What should I train today?" is offered it asks "…next?"',
        C.stateOf(later, later.now) === 'done_today' &&
        C.coach(later).topicsFor('train').some(t => t.id === 'ask_shape' && t.label === 'What should I train next?') ===
        C.coach(later).topicsFor('train').some(t => t.id === 'ask_shape'));
  const R = await import(pathToFileURL(join(dir, 'coach-ready.mjs')).href);
  const rr = R.restRead(C.readyInput(day2), NOW);
  check('the rest read has chest and arms both trained today — the morning’s group and the evening’s, one date, sets added',
        !!rr && rr.groups.chest.since === 0 && rr.groups.arms.since === 0 && !rr.groups.chest.ready && !rr.groups.arms.ready,
        rr && J({ chest: rr.groups.chest, arms: rr.groups.arms }));
  const rrOne = R.restRead(C.readyInput({ ...day2, sessions: HISTORY.concat([{ ...morning(chestAm.concat([logged('pushdown', 3), logged('curl', 3)])) }]).sort((a, b) => a.startedAt - b.startedAt) }), NOW);
  check('and a group’s day is the same whether its sets came in one visit or two — the chest day’s count, the arms day’s count',
        !!rrOne && ['chest', 'arms'].every(g => rrOne.groups[g].since === rr.groups[g].since && rrOne.groups[g].big === rr.groups[g].big));
}

/* ---------- report ---------- */
console.log('\nCoach in the gym says what it can back with his own log, and nothing about the bar\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
