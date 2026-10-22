#!/usr/bin/env node
//
// Verifier for coach-ask.js — the questions and the facts (rack-v72,
// COACH-V2-SPEC.md §3, §4).
//
//   node tools-check/coach-ask.mjs
//
// What it holds:
//   A  the catalog: every row's `changes` names a rule registered in coach.js
//      (an intent id), the shipped seven are the `answers` subset coach.js
//      exports as QUESTIONS, the recap's two are 'debrief' rows
//   B  normKnow: every option value and every integer in range round-trips;
//      junk (c: 7, v: 'maybe', an id with a slash, a 61st id) is dropped,
//      never thrown; nextFact ladders 1 → 2 → 3 and resets on a change;
//      knowOf expires by TTL and reads c: 1 past it
//   C  budgetOf over 10,000 generated days with random moments never lets a
//      D-question through past 2 a day or 6 a week
//   D  pickQuestion is deterministic, null under mute.questions, and never a
//      question whose gate fails
//   E  warmRamp on Micah's untagged squat day: the squat, idx [0..4]; nothing
//      when he said 'no' on the lift, or asked 10 days ago, or 'yes' and the
//      ramp is tagged already
//   F  debriefPlan never has both the confirm row and a warm-up question;
//      no question on a < 3-set record or cardio alone; none on the day's
//      second session; q_pr_how only with a record set and no rir; warmStyle
//      'ramp' makes the confirm a one-tap, 'none' removes it

import { stage, harness, J } from './lib/stage.mjs';

const { check, section, done } = harness('coach-ask.js — the questions and the facts (v72)');
const st = stage(['analytics.js', 'exercises.js', 'ui.js', 'units.js', 'coach-tags.js', 'coach-goal.js', 'coach-ramp.js', 'coach-ask.js',
  'coach-prog.js', 'coach-build.js', 'coach-live.js', 'coach-overlap.js', 'coach-ready.js', 'coach-fuel.js', 'coach-volume.js', 'coach.js', 'blocks.js']);
const Q = await st.load('coach-ask.js');
const C = await st.load('coach.js');
const A = await st.load('analytics.js');
const { EXERCISES } = await st.load('exercises.js');

const DAY = 864e5;
const NOW = new Date(2026, 9, 22, 19, 30).getTime();      // a Thursday evening, local
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const S = (w, r, type = 'N', extra) => ({ w: String(w), r: String(r), type, done: true, ...(extra || null) });
const xN = (n, w, r, type) => Array.from({ length: n }, () => S(w, r, type));
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const ex = (id, sets) => ({ exId: id, name: LIB[id].name, group: LIB[id].group, equipment: LIB[id].equipment, sets });
let sid = 0;
const rec = (ago, rows, extra) => {
  const t = NOW - ago * DAY - 3 * 3600e3;
  return { id: 'r' + (++sid), name: 'Legs', startedAt: t, endedAt: t + 3600e3, durationSec: 3600, _date: key(t),
           exercises: rows, volume: 0, groups: [], ...(extra || {}) };
};
const SQUAT = 'back-squat-low-bar';
// Micah's untagged squat day: 45, 45, 135, 135, 225 up to 3 × 5 at 315.
const RAMP = [S(45, 10), S(45, 8), S(135, 5), S(135, 5), S(225, 3)];
const squatDay = (ago, extra) => rec(ago, [ex(SQUAT, RAMP.concat(xN(3, 315, 5))), ex('leg-press', xN(3, 400, 10))], extra);
const taggedDay = ago => rec(ago, [ex(SQUAT, RAMP.map(s => ({ ...s, type: 'W' })).concat(xN(3, 310, 5))), ex('leg-press', xN(3, 400, 10))]);
const SETTINGS = extra => ({ v: 2, mute: {}, on: {}, answers: {}, asked: {}, ...(extra || {}) });
const inputOf = (sessions, settings, extra) => ({
  now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions: sessions.slice().sort((a, b) => a.startedAt - b.startedAt),
  lib: LIB, hidden: [], libReady: true, routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null,
  summaries: {}, steps: { days: {} }, weighIns: [],
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
  settings: settings || SETTINGS(), ...(extra || {})
});
// A fact store the way coach.js hands one to pickQuestion: coach() builds it;
// the sheet's opener is pickQuestion for the lane 'open'.
const fakeD = facts => ({ f: id => (facts && id in facts ? facts[id] : null), now: NOW, input: { settings: SETTINGS(), opens: 0, u: 'lb', lib: LIB }, all: () => [] });

/* ================= A. THE CATALOG ================= */
section('A. the catalog: every question changes a registered rule, and coach.js reads its QUESTIONS off it');
{
  const ids = new Set(C.INTENTS.map(i => i.id));
  const bad = Q.ASK_QUESTIONS.filter(q => !Array.isArray(q.changes) || !q.changes.length || !q.changes.every(x => ids.has(x))).map(q => q.id);
  check('every row names at least one registered intent in `changes`: ' + Q.ASK_QUESTIONS.map(q => q.id + ' → ' + q.changes.join('/')).join(', '),
        !bad.length, J(bad));
  check('nine rows: the shipped seven and the recap’s two', Q.ASK_QUESTIONS.length === 9 &&
        Q.ASK_QUESTIONS.filter(q => q.writes === 'answers').length === 7 &&
        Q.ASK_QUESTIONS.filter(q => q.moments[0] === 'debrief').map(q => q.id).join(',') === 'q_warm_confirm,q_pr_how');
  check('coach.js QUESTIONS is the `answers` subset, the same objects, in the same order',
        C.QUESTIONS.length === 7 && C.QUESTIONS.every((q, i) => q === Q.ASK_QUESTIONS.filter(x => x.writes === 'answers')[i]));
  check('every row has moments, options (two or more), a gate, a budget letter and a cooldown',
        Q.ASK_QUESTIONS.every(q => Array.isArray(q.moments) && q.moments.length && Array.isArray(q.options) && q.options.length >= 2 &&
          typeof q.when === 'function' && ['C', 'D'].includes(q.budget) && Number.isInteger(q.cooldownDays) && q.cooldownDays >= 0));
  check('the shipped rows keep fact, where, always, settings, stale and ack as they were',
        C.QUESTIONS.every(q => typeof q.fact === 'string' && typeof q.ack === 'string') &&
        C.QUESTIONS.find(q => q.id === 'q_goal_aim').always === true && C.QUESTIONS.find(q => q.id === 'q_goal_aim').where === 'targets' &&
        C.QUESTIONS.find(q => q.id === 'q_goal_check_weight').settings === false && typeof C.QUESTIONS.find(q => q.id === 'q_goal_check_weight').stale === 'function' &&
        C.QUESTIONS.find(q => q.id === 'q_log_timing').moments[0] === 'under:fuel');
  check('the warm-up confirmation is a C (logging, uncounted) with a 28-day per-lift stamp; the record question is a D with no cooldown',
        Q.askQuestion('q_warm_confirm').budget === 'C' && Q.askQuestion('q_warm_confirm').cooldownDays === 28 &&
        Q.askQuestion('q_warm_confirm').stampOf({ ramp: { exId: SQUAT } }) === 'warm:' + SQUAT &&
        Q.askQuestion('q_pr_how').budget === 'D' && Q.askQuestion('q_pr_how').cooldownDays === 0);
  const t = Q.askQuestion('q_warm_confirm').text(fakeD(), 'lb', { ramp: { name: 'Back Squat', loads: ['45', '135', '225'] } });
  check('its words: "Were 45, 135 and 225 lb your warm-ups on Back Squat?"', t === 'Were 45, 135 and 225 lb your warm-ups on Back Squat?', t);
  const six = Q.askQuestion('q_warm_confirm').text(fakeD(), 'lb', { ramp: { name: 'Back Squat', loads: ['45', '45', '135', '135', '225', '315'] } });
  check('six sets: "Were 45 to 315 lb (6 sets) your warm-ups on Back Squat?"', six === 'Were 45 to 315 lb (6 sets) your warm-ups on Back Squat?', six);
  const kg = Q.askQuestion('q_warm_confirm').text(fakeD(), 'kg', { ramp: { name: 'Back Squat', loads: ['44.09', '88.18'] } });
  check('on kilos, through units.js: "Were 20 and 40 kg …"', kg === 'Were 20 and 40 kg your warm-ups on Back Squat?', kg);
  const pr = Q.askQuestion('q_pr_how').text(fakeD(), 'lb', { pr: { name: 'Back Squat' } });
  check('and the record’s: "New best on Back Squat. Did it feel like there was more in it?"', pr === 'New best on Back Squat. Did it feel like there was more in it?', pr);
  check('its chips store 4, 2 and 0 — the live sheet’s three', J(Q.askQuestion('q_pr_how').options.map(o => o.value)) === '[4,2,0]');
  const banned = /\bCoach (is|can|will|reads|wants)\b|\bwe\b|\bAI\b|!/;
  const words = Q.ASK_QUESTIONS.flatMap(q => [typeof q.text === 'string' ? q.text : t, q.ack || ''].concat(q.options.map(o => o.label + ' ' + (o.ack || ''))));
  check('first person throughout, no exclamation', !words.some(w => banned.test(w)), J(words.filter(w => banned.test(w))));
}

/* ================= B. THE FACTS ================= */
section('B. normKnow round-trips every value, drops junk and never throws; nextFact ladders; knowOf expires');
{
  const at = NOW - DAY;
  const good = { know: { back: { v: 'elsewhere', c: 1, at, n: 1 } },
                 knowBy: { warm: { [SQUAT]: { v: 'yes', c: 2, at, n: 2 } }, step: { 'lat-pulldown': { v: 10, c: 1, at, n: 1 } },
                           hold: { 'front-squat': { v: 'hold', c: 1, at, n: 1 } }, wantNext: { 'legs': { v: 'push', c: 1, at, n: 1 }, 'chest+arms': { v: 'ease', c: 3, at, n: 5 } } },
                 tally: { extraOffered: 14, extraTaken: 9 } };
  check('the spec’s node round-trips byte for byte', J(Q.normKnow(good)) === J(good), J(Q.normKnow(good)));
  // every option value
  // `legs` is both an exercise id's shape and a shape key's.
  const allOpts = Object.entries(Q.KNOW_KEYS).filter(([k, s]) => s.options).every(([k, s]) => s.options.every(v => {
    const node = s.by ? { knowBy: { [k]: { legs: { v, c: 1, at, n: 1 } } } } : { know: { [k]: { v, c: 1, at, n: 1 } } };
    const out = Q.normKnow(node);
    return s.by ? out.knowBy[k] && out.knowBy[k].legs && out.knowBy[k].legs.v === v : out.know[k] && out.know[k].v === v;
  }));
  check('every option value of every key round-trips', allOpts);
  const ints = [1, 2, 3, 5, 10, 25, 100, 99999, 100000, 1].every(v => Q.normKnow({ knowBy: { step: { x: { v, c: 1, at, n: 1 } } } }).knowBy.step.x.v === v);
  check('every integer in step’s range round-trips; 0.5 is below it and 100001 above', ints &&
        !Q.normKnow({ knowBy: { step: { x: { v: 0.4, c: 1, at, n: 1 } } } }).knowBy.step &&
        !Q.normKnow({ knowBy: { step: { x: { v: 100001, c: 1, at, n: 1 } } } }).knowBy.step);
  const junk = { know: { back: { v: 'maybe', c: 1, at, n: 1 }, warm: { v: 'yes', c: 1, at, n: 1 }, 'bad key': { v: 'off', c: 1, at, n: 1 } },
                 knowBy: { warm: { [SQUAT]: { v: 'yes', c: 7, at, n: 2 }, 'a/b': { v: 'yes', c: 1, at, n: 1 }, ok: { v: 'no', c: 1, at, n: 1 }, nn: { v: 'no', c: 1, at, n: 12 }, nat: { v: 'no', c: 1, at: -5, n: 1 } },
                           back: { x: { v: 'off', c: 1, at, n: 1 } }, nope: { x: { v: 1, c: 1, at, n: 1 } } },
                 tally: { extraOffered: 1000, ok: 3, 'bad key': 1, neg: -1, frac: 1.5 } };
  const n = Q.normKnow(junk);
  check('junk dropped, the good kept: v off its options, c 7, n 12, at ≤ 0, an id with a slash, a keyed key under know, a scalar under knowBy, an unknown key, a tally over 999',
        J(n) === J({ know: {}, knowBy: { warm: { ok: { v: 'no', c: 1, at, n: 1 } } }, tally: { ok: 3 } }), J(n));
  const many = {};
  for (let i = 0; i < 61; i++) many['ex' + i] = { v: 'yes', c: 1, at: at - i * 1000, n: 1 };
  const cut = Q.normKnow({ knowBy: { warm: many } }).knowBy.warm;
  check('a 61st id: the oldest `at` is dropped, sixty kept', Object.keys(cut).length === 60 && !cut.ex60 && !!cut.ex0 && !!cut.ex59, Object.keys(cut).length);
  let threw = false;
  [null, undefined, 1, 'x', [], { know: 1 }, { knowBy: [] }, { knowBy: { warm: 1 } }, { knowBy: { warm: { x: null } } }, { tally: 'no' }].forEach(v => { try { Q.normKnow(v); } catch { threw = true; } });
  check('never throws on anything', !threw);
  check('nothing survives → three empty objects, and normSettings adds no key',
        J(Q.normKnow({})) === '{"know":{},"knowBy":{},"tally":{}}' && !('know' in C.normSettings({ v: 2 })) && !('knowBy' in C.normSettings({ v: 2 })) && !('tally' in C.normSettings({ v: 2 })));
  // nextFact
  const f1 = Q.nextFact(null, 'yes', 1000), f2 = Q.nextFact(f1, 'yes', 2000), f3 = Q.nextFact(f2, 'yes', 3000), f4 = Q.nextFact(f3, 'yes', 4000), f5 = Q.nextFact(f4, 'no', 5000);
  check('nextFact: 1 → 2 → 3 (c caps at 3, n keeps counting), and a changed answer starts over',
        J([f1, f2, f3, f4, f5]) === J([{ v: 'yes', c: 1, at: 1000, n: 1 }, { v: 'yes', c: 2, at: 2000, n: 2 }, { v: 'yes', c: 3, at: 3000, n: 3 },
                                       { v: 'yes', c: 3, at: 4000, n: 4 }, { v: 'no', c: 1, at: 5000, n: 1 }]), J([f1, f2, f3, f4, f5]));
  let f = null; for (let i = 0; i < 20; i++) f = Q.nextFact(f, 'yes', i);
  check('n never passes 9', f.n === 9 && f.c === 3);
  // knowOf
  const s = SETTINGS({ knowBy: { warm: { [SQUAT]: { v: 'no', c: 2, at: NOW - 100 * DAY, n: 2 } } }, know: { back: { v: 'off', c: 2, at: NOW - 20 * DAY, n: 2 } } });
  check('knowOf: a 100-day-old warm answer is inside its 180 days — c 2, not expired',
        J(Q.knowOf(s, 'warm', SQUAT, NOW)) === J({ v: 'no', c: 2, n: 2, at: NOW - 100 * DAY, expired: false }));
  check('a 20-day-old `back` is past its 14: the value stands as a prior, c reads 1, expired true',
        J(Q.knowOf(s, 'back', null, NOW)) === J({ v: 'off', c: 1, n: 2, at: NOW - 20 * DAY, expired: true }));
  check('an unknown key, a bad id, a missing fact: null', Q.knowOf(s, 'nope', 'x', NOW) === null && Q.knowOf(s, 'warm', 'a/b', NOW) === null && Q.knowOf(s, 'warm', 'bench', NOW) === null);
  check('warmAnswer: the value while it stands, null once expired',
        Q.warmAnswer(s, SQUAT, NOW) === 'no' && Q.warmAnswer(s, SQUAT, NOW + 100 * DAY) === null && Q.warmAnswer(s, 'bench', NOW) === null);
  // warmStyle
  const by = (ys, ns) => ({ knowBy: { warm: Object.fromEntries([...Array(ys)].map((_, i) => ['y' + i, { v: 'yes', c: 1, at, n: 1 }]).concat([...Array(ns)].map((_, i) => ['n' + i, { v: 'no', c: 1, at, n: 1 }]))) } });
  check('warmStyle: nothing said → null; 3 yes → ramp; 3 no → none; 2 yes → mixed; 3 yes and 1 no → mixed',
        Q.warmStyle(SETTINGS()) === null && Q.warmStyle(by(3, 0)) === 'ramp' && Q.warmStyle(by(0, 3)) === 'none' && Q.warmStyle(by(2, 0)) === 'mixed' && Q.warmStyle(by(3, 1)) === 'mixed');
}

/* ================= C. THE BUDGET ================= */
section('C. budgetOf over 10,000 generated days: never past 2 a day or 6 a week');
{
  // A tiny LCG so the walk is the same every run.
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const D = Q.ASK_QUESTIONS.filter(q => q.budget === 'D');
  const asked = {};
  const byDay = {}, byWeek = {};
  const wk = ms => { const d = new Date(ms); d.setHours(12, 0, 0, 0); const back = (d.getDay() + 6) % 7; return key(d.getTime() - back * DAY); };
  /* The walk asks the way the app does: a random moment one to five times a
     day, a D-question only when budgetOf() says there is room, and never a
     question inside its own cooldown (the shipped rows' seven days; q_pr_how
     has none and is asked at most once a day — the recap's second session of
     a day draws no question). The count is of real asks, not stamps. */
  let over = 0, asks = 0;
  const start = new Date(2026, 0, 5, 9).getTime();
  for (let day = 0; day < 10000; day++) {
    const t0 = start + day * DAY;
    const tries = 1 + Math.floor(rnd() * 5);
    for (let k = 0; k < tries; k++) {
      const now = t0 + Math.floor(rnd() * 14) * 3600e3;
      const b = Q.budgetOf({ asked }, now);
      if (b.dayLeft <= 0 || b.weekLeft <= 0) continue;
      const q = D[Math.floor(rnd() * D.length)];
      const at = asked[q.id];
      if (Number.isFinite(at) && (key(at) === key(now) || (q.cooldownDays > 0 && (now - at) / DAY < q.cooldownDays))) continue;
      // a per-record question is stamped per record (q_pr_how:<recordId>), as
      // the recap stamps it, and once a day at most
      const stamp = typeof q.stampOf === 'function' ? q.stampOf({ pr: { recId: 'r' + day } }) : q.id;
      if (stamp !== q.id && Object.keys(asked).some(k => k.startsWith(q.id + ':') && key(asked[k]) === key(now))) continue;
      asked[stamp] = now; asks++;
      const dk = key(now), wkk = wk(now);
      byDay[dk] = (byDay[dk] || 0) + 1; byWeek[wkk] = (byWeek[wkk] || 0) + 1;
      if (byDay[dk] > 2 || byWeek[wkk] > 6) over++;
    }
  }
  check('10,000 days, ' + asks + ' questions asked: no day over 2, no week over 6 (' + over + ' breaches)', over === 0 && asks > 1000);
  check('budgetOf is { dayLeft, weekLeft } from the stamps alone: a C row stamped today counts for nothing',
        J(Q.budgetOf({ asked: { 'warm:x': NOW, q_warm_confirm: NOW } }, NOW)) === J({ dayLeft: 2, weekLeft: 6 }));
  check('two D stamps today → dayLeft 0; six this week → weekLeft 0',
        Q.budgetOf({ asked: { q_pr_how: NOW, q_goal_direction: NOW - 3600e3 } }, NOW).dayLeft === 0 &&
        Q.budgetOf({ asked: { q_pr_how: NOW, q_goal_direction: NOW - DAY, q_goal_aim: NOW - 2 * DAY, q_experience: NOW - 3 * DAY, q_focus_group: NOW - 3 * DAY, q_log_timing: NOW - DAY } }, NOW).weekLeft === 0);
  check('a stamp from last week counts for the week no more', Q.budgetOf({ asked: { q_pr_how: NOW - 8 * DAY } }, NOW).weekLeft === 6);
}

/* ================= D. pickQuestion ================= */
section('D. pickQuestion: deterministic, silent under mute.questions, never a question whose gate fails');
{
  const d = fakeD({ 'weight.rateWk': -0.5, 'weight.goalDir': null, 'meta.tierPro': true });
  const a = Q.pickQuestion(d, 'open', SETTINGS(), NOW, 0), b = Q.pickQuestion(d, 'open', SETTINGS(), NOW, 0);
  check('the opener on a log with a rate and no direction is q_goal_direction, the same object twice', !!a && a.id === 'q_goal_direction' && a === b);
  check('null under mute.questions', Q.pickQuestion(d, 'open', SETTINGS({ mute: { questions: true } }), NOW, 0) === null);
  check('null for a lane nothing is in', Q.pickQuestion(d, 'live', SETTINGS(), NOW, 0) === null && Q.pickQuestion(d, 'under:goal', fakeD({ 'coach.aim': null }), SETTINGS(), NOW, 0) === null);
  check('answered → not asked again; stamped and unanswered inside its cooldown → not asked again',
        Q.pickQuestion(d, 'open', SETTINGS({ answers: { q_goal_direction: 'down' } }), NOW, 0) === null &&
        Q.pickQuestion(d, 'open', SETTINGS({ asked: { q_goal_direction: NOW - 2 * DAY } }), NOW, 0) === null &&
        !!Q.pickQuestion(d, 'open', SETTINGS({ asked: { q_goal_direction: NOW - 8 * DAY } }), NOW, 0));
  check('the day budget spent: a D question is not asked', Q.pickQuestion(d, 'open', SETTINGS({ asked: { q_pr_how: NOW, q_log_timing: NOW - 3600e3 } }), NOW, 0) === null);
  check('the gate decides: no rate, no direction question', Q.pickQuestion(fakeD({ 'weight.rateWk': null }), 'open', SETTINGS(), NOW, 0) === null);
  const g = fakeD({ 'coach.aim': null, 'coach.experience': null });
  check('under the targets answer: the aim first (its gate), then experience once the aim is in',
        Q.pickQuestion(g, 'under:targets', SETTINGS(), NOW, 0).id === 'q_goal_aim' &&
        Q.pickQuestion(fakeD({ 'coach.aim': 'strength', 'coach.experience': null }), 'under:targets', SETTINGS(), NOW, 0).id === 'q_experience');
  const dd = fakeD({});
  check('on the recap with a record set: q_pr_how; with nothing in the context: null',
        Q.pickQuestion(dd, 'debrief', SETTINGS(), NOW, 0, { pr: { exIdx: 0, setIdx: 5, name: 'x' } }).id === 'q_pr_how' &&
        Q.pickQuestion(dd, 'debrief', SETTINGS(), NOW, 0, {}) === null);
  const two = fakeD({ 'weight.rateWk': -0.5, 'weight.goalDir': null, 'meta.tierPro': true, 'coach.aim': 'cut',
                      'coach.goalChecks': { weight: true, targets: false, weeks: [{ from: 190, to: 189 }, { from: 189, to: 188 }, { from: 188, to: 186 }] } });
  const s2 = SETTINGS({ answers: { q_goal_aim: 'cut' }, asked: { q_goal_aim: NOW - 20 * DAY } });
  const picks = [0, 1, 2, 3].map(o => Q.pickQuestion(two, 'open', s2, NOW, o).id);
  check('two openers eligible: the one that changes more rules wins at every open (no rotation on an unequal score): ' + picks.join(','),
        picks.every(p => p === 'q_goal_direction'));
}

/* ================= E. warmRamp ================= */
section('E. warmRamp on his untagged squat day');
{
  const day = squatDay(0);
  const r = Q.warmRamp(day, SETTINGS(), NOW, LIB);
  check('the squat, exIdx 0, idx [0,1,2,3,4], loads 45, 45, 135, 135, 225', r.length === 1 && r[0].exIdx === 0 && r[0].exId === SQUAT &&
        J(r[0].idx) === '[0,1,2,3,4]' && J(r[0].loads) === J(['45', '45', '135', '135', '225']) && r[0].name === LIB[SQUAT].name, J(r));
  check('nothing when knowBy.warm on the squat is no', Q.warmRamp(day, SETTINGS({ knowBy: { warm: { [SQUAT]: { v: 'no', c: 1, at: NOW - DAY, n: 1 } } } }), NOW, LIB).length === 0);
  check('nothing when asked 10 days ago; asked again at 28', Q.warmRamp(day, SETTINGS({ asked: { ['warm:' + SQUAT]: NOW - 10 * DAY } }), NOW, LIB).length === 0 &&
        Q.warmRamp(day, SETTINGS({ asked: { ['warm:' + SQUAT]: NOW - 28 * DAY } }), NOW, LIB).length === 1);
  check('nothing on a day whose ramp is tagged W already', Q.warmRamp(taggedDay(0), SETTINGS(), NOW, LIB).length === 0);
  check('a no that expired (181 days) is asked again', Q.warmRamp(day, SETTINGS({ knowBy: { warm: { [SQUAT]: { v: 'no', c: 1, at: NOW - 181 * DAY, n: 1 } } } }), NOW, LIB).length === 1);
  const twice = rec(0, [ex(SQUAT, RAMP.slice(0, 2).concat(xN(3, 315, 5))), ex('leg-press', xN(3, 400, 10)), { ...ex(SQUAT, RAMP.slice(2).concat(xN(2, 315, 5))), block: 2 }]);
  const t = Q.warmRamp(twice, SETTINGS(), NOW, LIB);
  check('a duplicated block is read alone: the block with the most probable sets, its own exIdx (2) and its own indices', t.length === 1 && t[0].exIdx === 2 && J(t[0].idx) === '[0,1,2]', J(t));
  check('an assisted lift is never a ramp', Q.warmRamp(rec(0, [ex('assisted-pull-up', [S(60, 8), S(40, 8), S(20, 6)])]), SETTINGS(), NOW, LIB).length === 0);
  check('never throws on junk', (() => { try { Q.warmRamp(null, null, NOW, null); Q.warmRamp({ exercises: [null, {}, { exId: 'x' }] }, {}, NOW, {}); return true; } catch { return false; } })());
}

/* ================= F. debriefPlan ================= */
section('F. debriefPlan — through coach().debrief(record)');
{
  const prior = [7, 14, 21, 28, 35].map(a => squatDay(a));
  const plan = (today, settings, extra, inputExtra) => {
    const input = inputOf(prior, settings, inputExtra);
    const found = A.detectPRs(today, prior);
    return { p: C.coach(input).debrief(today, { prs: found.prs, ...(extra || {}) }), prs: found.prs };
  };
  const today = squatDay(0);
  const { p } = plan(today);
  check('his squat day: the confirm row is the squat with its words, the feel row on, and no question (no record)',
        !!p.confirm && p.confirm.exId === SQUAT && J(p.confirm.idx) === '[0,1,2,3,4]' && p.confirm.text === 'Were 45 to 225 lb (5 sets) your warm-ups on ' + LIB[SQUAT].name + '?' &&
        !p.confirm.oneTap && p.confirm.options.length === 3 && p.feel === true && p.question === null, J(p));
  check('never both the confirm row and a question about warm-ups', !(p.question && p.question.id === 'q_warm_confirm'));
  const prDay = rec(0, [ex(SQUAT, RAMP.concat(xN(3, 335, 5))), ex('leg-press', xN(3, 400, 10))]);
  const pr = plan(prDay);
  check('a record set, unrated: the question is q_pr_how with the set to rate (exIdx 0, the first 335)',
        pr.prs.length >= 1 && !!pr.p.question && pr.p.question.id === 'q_pr_how' && pr.p.question.pr.exIdx === 0 && pr.p.question.pr.setIdx === 5 &&
        pr.p.question.text === 'New best on ' + LIB[SQUAT].name + '. Did it feel like there was more in it?', J(pr.p.question));
  check('and the confirm row beside it — the two slots are two rows', !!pr.p.confirm && pr.p.confirm.exId === SQUAT);
  const rated = rec(0, [ex(SQUAT, RAMP.concat([S(335, 5, 'N', { rir: 2 }), S(335, 5), S(335, 5)])), ex('leg-press', xN(3, 400, 10))]);
  check('the record set rated already: no question', plan(rated).p.question === null);
  check('the day budget spent: no question, the confirm row stays',
        (() => { const r = plan(prDay, SETTINGS({ asked: { q_goal_direction: NOW - 3600e3, q_log_timing: NOW - 7200e3 } })).p; return r.question === null && !!r.confirm; })());
  check('rated harder (strength 90%): no question', plan({ ...prDay, feel: { s: 90, at: NOW } }).p.question === null);
  check('marked: no question', plan(prDay, SETTINGS({ marks: { [prDay.id]: { r: 'sleep', d: prDay._date } } })).p.question === null);
  const small = rec(0, [ex(SQUAT, RAMP.concat(xN(2, 335, 5)))]);
  check('under three working sets after the split (five ramp sets, two work): no question, the confirm row stays',
        (() => { const r = plan(small).p; return r.question === null && !!r.confirm; })());
  const cardio = rec(0, [ex('treadmill-run', [S(0, 30), S(0, 20), S(0, 25)])]);
  check('cardio alone: nothing but the feel row', (() => { const r = plan(cardio).p; return r.question === null && r.confirm === null && r.feel === true; })());
  const first = rec(0, [ex('leg-press', xN(4, 420, 10))]);
  const second = rec(0, [ex(SQUAT, RAMP.concat(xN(3, 335, 5)))]);
  const two = C.coach(inputOf(prior.concat([first]))).debrief(second, { prs: A.detectPRs(second, prior.concat([first])).prs });
  check('the second session of its day: feel only — no question, and the confirm row too', two.question === null && two.feel === true, J(two));
  check('mute.feel: the feel row gone, the others as they were', (() => { const r = plan(prDay, SETTINGS({ mute: { feel: true } })).p; return r.feel === false && !!r.confirm && !!r.question; })());
  check('mute.questions: the question gone, the confirm row stays (it is logging)',
        (() => { const r = plan(prDay, SETTINGS({ mute: { questions: true } })).p; return r.question === null && !!r.confirm; })());
  const three = { knowBy: { warm: { a: { v: 'yes', c: 1, at: NOW - DAY, n: 1 }, b: { v: 'yes', c: 1, at: NOW - DAY, n: 1 }, c: { v: 'yes', c: 1, at: NOW - DAY, n: 1 } } } };
  check('warmStyle ramp (three lifts yes): the confirm row is one tap', plan(today, SETTINGS(three)).p.confirm.oneTap === true);
  const none = { knowBy: { warm: { a: { v: 'no', c: 1, at: NOW - DAY, n: 1 }, b: { v: 'no', c: 1, at: NOW - DAY, n: 1 }, c: { v: 'no', c: 1, at: NOW - DAY, n: 1 } } } };
  check('warmStyle none (three lifts no): no confirm row at all', plan(today, SETTINGS(none)).p.confirm === null);
  check('warm no on the squat itself: no confirm row, and the working count reads every set', plan(today, SETTINGS({ knowBy: { warm: { [SQUAT]: { v: 'no', c: 1, at: NOW - DAY, n: 1 } } } })).p.confirm === null);
  check('an edit of a past session: the feel row alone', (() => { const r = plan({ ...prDay, _edit: { mk: '2026-10' } }).p; return r.confirm === null && r.question === null && r.feel === true; })());
  check('an unreadable log: the feel row alone', (() => { const r = plan(prDay, null, null, { log: 'unknown' }).p; return r.confirm === null && r.question === null; })());
  check('the same input twice is the same plan', J(plan(prDay).p) === J(plan(prDay).p));
  // The pure function on a stub store, the way native's recap-view calls it.
  const d = { ...fakeD({}), all: () => [] };
  const direct = Q.debriefPlan(d, prDay, SETTINGS(), NOW, 0, { prs: pr.prs, harder: false, marked: false, u: 'lb' });
  check('debriefPlan direct, with the context handed in: the same three slots', !!direct.confirm && direct.feel === true && !!direct.question && direct.question.id === 'q_pr_how');
  check('and q_pr_how is never drawn without a record in the context', Q.debriefPlan(d, prDay, SETTINGS(), NOW, 0, { prs: [] }).question === null);
}

done(st.cleanup);
