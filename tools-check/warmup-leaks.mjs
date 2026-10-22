#!/usr/bin/env node
//
// Verifier for the one thing v68 must not break: a warm-up counts for nothing.
//
//   node tools-check/warmup-leaks.mjs
//
// v68 puts his warm-ups on the "last time" index (workout.js
// foldSessionIntoHistory) so the grey rows can start with his ramp. That makes
// warm-ups more visible than they have ever been, and the property worth
// holding is the old one: every number Rack works out — volume, e1RM, records,
// the groups a record claims, the stats, the recap's comparison, the friends'
// record board, Coach's targets, its live read, its volume read and every
// sentence on its card and sheet — is the same with the warm-ups as without.
//
// HOW. One log, built twice: once with working sets only, and once with a
// warm-up ramp in front of every lift — including warm-ups HEAVIER than the
// working sets and with more reps, which is the shape that would win a best
// set, a top weight or a record if anything read them. Every consumer below is
// the real module, run over both; each check is "the two answers are
// identical". A consumer that started reading 'W' sets fails here.
//
// It also holds the index's own rule: the warm-ups ride in, typed W, in order,
// and a day of nothing but warm-ups is still nobody's "last time".

import { readFileSync } from 'node:fs';
import { stage, harness, J, setNow } from './lib/stage.mjs';

const { check, section, done } = harness('Warm-ups count for nothing (v68)');
const st = stage(['analytics.js', 'exercises.js', 'ui.js', 'units.js', 'coach.js', 'coach-build.js', 'coach-live.js',
  'coach-prog.js', 'coach-goal.js', 'coach-overlap.js', 'coach-ready.js', 'coach-fuel.js', 'coach-volume.js',
  'coach-tags.js', 'coach-ramp.js', 'coach-ask.js', 'blocks.js', 'friends-summary.js']);
const A  = await st.load('analytics.js');
const C  = await st.load('coach.js');
const P  = await st.load('coach-prog.js');
const V  = await st.load('coach-volume.js');
const L  = await st.load('coach-live.js');
const FS = await st.load('friends-summary.js');

/* The workout.js functions a record is built with, lifted by text. */
const WSRC = readFileSync(new URL('../workout.js', import.meta.url), 'utf8');
function lift(name) {
  const m = new RegExp('^(?:export )?function ' + name + '\\(', 'm').exec(WSRC);
  if (!m) throw new Error('warmup-leaks: ' + name + '() is gone from workout.js');
  return WSRC.slice(m.index, WSRC.indexOf('\n}\n', m.index) + 2).replace(/^export /, '');
}
const W = new Function('isWorking', 'mergeSessionExercises', 'keepSets', `
${['computeVolume', 'recordGroups', 'historyRows', 'foldSessionIntoHistory', 'trimHistory'].map(lift).join('\n')}
return { computeVolume, recordGroups, foldSessionIntoHistory, trimHistory };`)(A.isWorking, A.mergeSessionExercises, A.keepSets);

/* ================= THE LOG, TWICE ================= */
const DAY = 864e5;
const NOW = 1789307130123;
setNow(NOW);
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const LIB = {
  'back-squat-low-bar':  { name: 'Back Squat (Low Bar)', group: 'legs',  equipment: 'barbell' },
  'barbell-bench-press': { name: 'Barbell Bench Press',  group: 'chest', equipment: 'barbell' },
  'barbell-row':         { name: 'Barbell Row',          group: 'back',  equipment: 'barbell' }
};
// His squat ramp, and two that would break things if read: a warm-up heavier
// than any working set, and one with many reps.
const RAMP = {
  'back-squat-low-bar':  [[45, 10], [45, 8], [135, 5], [135, 3], [225, 2], [900, 12]],
  'barbell-bench-press': [[45, 15], [135, 8], [600, 20]],
  'barbell-row':         [[95, 10], [500, 30]]
};
const S = (w, r, type = 'N') => ({ w: String(w), r: String(r), type, done: true });
function build(withWarm) {
  const out = [];
  for (let k = 0; k < 12; k++) {
    const day = (exId, work) => ({
      exId, name: LIB[exId].name, group: LIB[exId].group, equipment: LIB[exId].equipment,
      sets: (withWarm ? RAMP[exId].map(([w, r]) => S(w, r, 'W')) : []).concat(work)
    });
    const at = NOW - (k * 7 + 2) * DAY;
    out.push({ id: 'a' + k, name: 'Legs', startedAt: at, durationSec: 3600, _date: key(at),
      exercises: [day('back-squat-low-bar', [S(315 + 5 * (11 - k), 5), S(365, 2), S(365, 2)])] });
    const bt = NOW - (k * 7 + 4) * DAY;
    out.push({ id: 'b' + k, name: 'Upper', startedAt: bt, durationSec: 3600, _date: key(bt),
      exercises: [day('barbell-bench-press', [S(185 + (11 - k), 8), S(185, 7), S(175, 9, 'F')]),
                  day('barbell-row', [S(155, 8), S(155, 8)])] });
  }
  // A day of nothing but warm-ups.
  if (withWarm) {
    const wt = NOW - 1 * DAY;
    out.push({ id: 'w', name: 'Warm-ups', startedAt: wt, durationSec: 600, _date: key(wt),
      exercises: [{ exId: 'barbell-row', name: 'Barbell Row', group: 'back', equipment: 'barbell', sets: [S(95, 10, 'W')] }] });
  }
  out.forEach(s => { s.volume = W.computeVolume(s.exercises); s.groups = W.recordGroups(s.exercises); });
  return out.sort((a, b) => a.startedAt - b.startedAt);
}
const plain = build(false), warm = build(true);
const warmNoW = warm.filter(s => s.id !== 'w');   // same sessions, same ids, warm-ups in front

/* ================= A. THE RECORD ================= */
section('A. the record: volume and groups');
check('volume of every session is the same with the warm-ups', J(plain.map(s => s.volume)) === J(warmNoW.map(s => s.volume)));
check('groups of every session are the same with the warm-ups', J(plain.map(s => s.groups)) === J(warmNoW.map(s => s.groups)));
check('a session of nothing but warm-ups: volume 0, no group', warm.find(s => s.id === 'w').volume === 0 && J(warm.find(s => s.id === 'w').groups) === '[]');

/* ================= B. ANALYTICS ================= */
section('B. analytics.js: e1RM, records, stats, the recap');
const idxP = A.exerciseIndex(plain), idxW = A.exerciseIndex(warm);
const pick = i => Object.fromEntries(Object.entries(i).map(([k, e]) => [k, [e.sessions, e.totalVolume, e.totalSets, e.totalReps,
  e.bestE1rm, e.bestWeight, e.bestVolume, J(e.entries.map(x => [x.volume, x.e1rm, x.topWeight, x.sets, x.reps, x.best]))]]));
check('exerciseIndex: sessions, volume, sets, reps, best e1RM, best weight, best volume, every entry — identical',
  J(pick(idxP)) === J(pick(idxW)), J(pick(idxW)['back-squat-low-bar']).slice(0, 200));
check('best e1RM is a working set’s, never the 900 × 12 warm-up', idxW['back-squat-low-bar'].bestE1rm === A.e1rm(370, 5));
check('prTimeline (the friends’ record board reads it): identical', J(A.prTimeline(plain)) === J(A.prTimeline(warm)));
const last = s => s[s.length - 1];
const lastW = warmNoW[warmNoW.length - 1];
check('detectPRs on the newest session against the rest: identical',
  J(A.detectPRs(last(plain), plain.slice(0, -1))) === J(A.detectPRs(lastW, warmNoW.slice(0, -1))));
check('sessionMilestones: identical', J(A.sessionMilestones(last(plain), plain.slice(0, -1), 'lb')) === J(A.sessionMilestones(lastW, warmNoW.slice(0, -1), 'lb')));
check('sessionReps: identical on every session', J(plain.map(A.sessionReps)) === J(warmNoW.map(A.sessionReps)));
check('groupSplit: identical', J(A.groupSplit(plain)) === J(A.groupSplit(warmNoW)));
check('weeklyVolume: volume and set counts identical', J(A.weeklyVolume(plain).map(w => [w.volume, w.sets])) === J(A.weeklyVolume(warmNoW).map(w => [w.volume, w.sets])));
check('sameKindComparison (the recap): identical',
  J(A.sameKindComparison(last(plain), plain.slice(0, -1), NOW)) === J(A.sameKindComparison(lastW, warmNoW.slice(0, -1), NOW)));
check('the friends’ record board summary: identical', J(FS.prPart(A.prTimeline(plain), key(NOW))) === J(FS.prPart(A.prTimeline(warm), key(NOW))));

/* ================= C. COACH ================= */
section('C. Coach: targets, the volume read, the live read, and every sentence');
const coachSessions = list => list.map(s => ({ ...s }));
const input = list => ({
  now: NOW, opens: 0, recentGreets: [], u: 'lb', log: 'readable', sessions: coachSessions(list),
  lib: Object.fromEntries(Object.entries(LIB).map(([k, v]) => [k, { group: v.group, equipment: v.equipment }])),
  routines: [], live: { active: false }, tier: { pro: true },
  targets: { cal: 2300, p: 210, f: 74, auto: { rateWk: -1 } }, targetsSet: true,
  summaries: {}, steps: { days: {} },
  weight: { latestLb: 186.4, latestAt: NOW - 3 * DAY, rateWk: -0.8, rateDays: 21, goalDir: -1, goalRateWk: -1 },
  settings: { v: 1, mute: {}, answers: {}, asked: {}, lastGreet: '' }
});
const shot = i => {
  const c = C.coach(i);
  return J({
    you: [c.you.id, c.you.text, c.you.reason], train: [c.train.id, c.train.text], greet: c.greet,
    asks: ['topic_train', 'topic_fuel', 'topic_weight', 'topic_steps'].map(x => c.ask(x).text)
  });
};
check('the engine says something on this log', shot(input(plain)).length > 50);
check('Coach’s card and sheet: every line identical with the warm-ups', shot(input(plain)) === shot(input(warmNoW)));
const ctx = { now: NOW, u: 'lb', aim: 'strength', exp: 'intermediate', energy: 'maintain', repDrop: 0.25 };
['back-squat-low-bar', 'barbell-bench-press'].forEach(id => {
  const ex = list => ({ exId: id, name: LIB[id].name, group: LIB[id].group, equipment: 'barbell', exposures: P.exposuresFor(list, id) });
  const tgt = list => { const t = P.targetFor(ex(list), ctx, null); return t ? J([t.loadLb, t.line, t.mode]) : 'null'; };
  check(LIB[id].name + ': Coach’s target is the same with the warm-ups (and there is one: ' + tgt(plain) + ')', tgt(plain) !== 'null' && tgt(plain) === tgt(warmNoW), tgt(warmNoW));
  check(LIB[id].name + ': its working exposures are the same', J(P.exposuresFor(plain, id).map(e => e.sets)) === J(P.exposuresFor(warmNoW, id).map(e => e.sets.filter(s => s.type !== 'W'))));
});
const vi = list => J(V.volumeRead ? (() => { try { return V.volumeRead(C.volumeInput(input(list))); } catch (e) { return String(e); } })() : null);
check('the volume read (stage five) is identical, and is a real read', vi(plain) === vi(warmNoW) && !/thin|null/.test(vi(plain).slice(0, 30)), vi(plain).slice(0, 120));
const liveOf = sets => ({ ...input(plain), live: { active: true },
  session: { id: 'live', startedAt: NOW, exercises: [{ exId: 'back-squat-low-bar', name: 'Back Squat (Low Bar)', group: 'legs', equipment: 'barbell', sets }] } });
const liveWork = [S(315, 5), S(365, 2)];
const liveWarm = RAMP['back-squat-low-bar'].map(([w, r]) => S(w, r, 'W')).concat(liveWork);
// The rated set's row position (setIdx, n — "Set 8") is where it sits on
// screen and moves with the rows in front of it, by design; everything it
// says about the set and what comes next must not.
const liveShot = i => { const r = L.setRead(i); const { setIdx, n, ...rated } = (r && r.rated) || {}; return J([L.liveRead(i), rated, r && r.next]); };
check('the live read mid-session is the same with his ramp ticked in front', liveShot(liveOf(liveWork)) === liveShot(liveOf(liveWarm)), liveShot(liveOf(liveWork)) + '\n   vs ' + liveShot(liveOf(liveWarm)));
check('a live session of only warm-ups ticked reads as nothing done yet', L.liveRead(liveOf(RAMP['back-squat-low-bar'].map(([w, r]) => S(w, r, 'W')))) === null);

/* ================= D. THE INDEX ================= */
section('D. the "last time" index: warm-ups ride in, typed W, in order');
let h = {};
warm.forEach(s => { h = W.foldSessionIntoHistory(h, s._date, s.exercises); });
h = W.trimHistory(h);
const sq = h['back-squat-low-bar'][0].sets;
check('the newest squat day: the six warm-ups first, in order, typed W, then the three working sets',
  J(sq.map(s => [s.type, s.w])) === J([['W', '45'], ['W', '45'], ['W', '135'], ['W', '135'], ['W', '225'], ['W', '900'], ['N', '370'], ['N', '365'], ['N', '365']]), J(sq));
check('a day of nothing but warm-ups is nobody’s "last time": the row’s newest entry is a working day',
  h['barbell-row'][0].sets.some(A.isWorking) && h['barbell-row'][0].date !== warm.find(s => s.id === 'w')._date);
check('set aside the W rows and the index is exactly the pre-v68 index',
  J(Object.fromEntries(Object.entries(h).map(([k, r]) => [k, r.map(e => ({ date: e.date, sets: e.sets.filter(s => s.type !== 'W') }))]))) ===
  J((() => { let p = {}; plain.forEach(s => { p = W.foldSessionIntoHistory(p, s._date, s.exercises); }); return W.trimHistory(p); })()));

/* ================= E. WHO READS THE INDEX ================= */
section('E. the index has no reader that counts');
const files = ['analytics.js', 'coach.js', 'coach-data.js', 'coach-prog.js', 'coach-live.js', 'coach-overlap.js', 'coach-ready.js',
  'coach-volume.js', 'coach-build.js', 'stats.js', 'you.js', 'you-numbers.js', 'you-rows.js', 'insights.js',
  'friends-data.js', 'friends-summary.js'];
const touches = files.filter(f => /read\(\s*'history'|readExact\(\s*'history'|'history\//.test(readFileSync(new URL('../' + f, import.meta.url), 'utf8')));
check('no volume, record, stats, You, Friends or Coach module reads `history`', touches.length === 0, J(touches));

done(st.cleanup);
