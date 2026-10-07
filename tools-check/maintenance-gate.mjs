#!/usr/bin/env node
//
// Verifier for the quality gate on the MEASURED maintenance number (P5 A1).
//
//   node tools-check/maintenance-gate.mjs
//
// The audit (P5 F01) found that Rack showed a measured maintenance from as
// little as one week of weigh-ins: a week's slope times 3,500 is mostly water
// and scale noise, and for about four new accounts in five it was worse than
// the setup guess it replaced, shown as fact (30 kcal, 5,500 kcal). tdee.js
// maintenance() now holds a model answer back until the screened fit spans
// two weeks, has 4 day-points and 7 logged days, and the value is one a living
// adult can have [1,000, 6,000]. A held answer is { tdee: null, held, need }.
//
// What it proves, driving the REAL tdee.js and weightmodel.js:
//   - 4 weigh-ins over 6 days: no number, "N more days of weigh-ins", and
//     effectiveMaint keeps the setup number in force;
//   - 15 daily weigh-ins over 14 days: the number is identical to rack-v62's
//     (the gate only withholds, it never changes a passing number);
//   - a model answer of 400 or 6,500 is held with "a look at recent weigh-ins
//     and food entries";
//   - a held answer never falls back to the legacy arithmetic;
//   - 4 weigh-ins spread over 15 days with 7 logged days pass.

import { stage, stageAt, harness, setNow, at, dailyWeighIns, summariesBefore, J, RealDate } from './lib/stage.mjs';

const { check, section, done } = harness('maintenance-gate — the measured number earns its place');
const cleanups = [];
const fresh = () => { const s = stage(['ui.js', 'units.js', 'weightmodel.js', 'tdee.js']); cleanups.push(s.cleanup); return s; };

// rack-v62's tdee.js and weightmodel.js, the before, staged the same way.
const v62 = () => { const s = stageAt('590db05', ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js'], ['tdee.js', 'weightmodel.js']); cleanups.push(s.cleanup); return s; };

const Y = 2026, M = 10, D = 6;           // "today" is 6 Oct 2026, 09:00 local
setNow(at(Y, M, D, 9));

async function run(s, weighIns, sums) {
  const T = await s.load('tdee.js');
  await T.refreshModel(weighIns);
  return { T, r: T.maintenance(weighIns, sums) };
}

section('1. Four weigh-ins over six days: not yet');
{
  const s = fresh();
  const w = {}; [6, 4, 2, 0].forEach((ago, i) => { w['w' + i] = { lb: 185 - i * 0.2, t: new RealDate(Y, M - 1, D - ago, 7).getTime() }; });
  const sums = summariesBefore((await s.load('store.js')).todayKey, Y, M, D, 10, 2500);
  const { T, r } = await run(s, w, sums);
  check('no number is shown', r.tdee == null, J({ tdee: r.tdee, need: r.need }));
  check('the need names the missing weigh-in days ("N more days of weigh-ins")',
    Array.isArray(r.need) && r.need.some(n => /more days? of weigh-ins/.test(n)), J(r.need));
  const e = T.effectiveMaint({ maint: 2400, maintSrc: 'setup' }, r);
  check('effectiveMaint keeps the setup number in force meanwhile', e && e.source === 'setup' && e.cal === 2400, J(e));
}

section('2. Fifteen daily weigh-ins over fourteen days: the same number rack-v62 showed');
{
  const lb = i => 190 - i * 0.12 + [0.3, -0.2, 0.1, -0.4, 0.2, 0, -0.1][i % 7];
  const a = fresh(), b = v62();
  const tk = (await a.load('store.js')).todayKey;
  const w = dailyWeighIns(Y, M, D, 15, lb);
  const sums = summariesBefore(tk, Y, M, D, 14, i => 2300 + (i % 3) * 100);
  const now = (await run(a, w, sums)).r, then = (await run(b, w, sums)).r;
  check('rack-v62 shows a number here', Number.isFinite(then.tdee) && then.tdee > 0, J(then.tdee));
  check('and this build shows the identical number', now.tdee === then.tdee, now.tdee + ' vs ' + then.tdee);
}

section('3. A model answer outside [1,000, 6,000] is held');
for (const cal of [400, 6500]) {
  const s = fresh();
  const tk = (await s.load('store.js')).todayKey;
  const w = dailyWeighIns(Y, M, D, 21, 185);
  const sums = summariesBefore(tk, Y, M, D, 20, cal);
  const { r } = await run(s, w, sums);
  check(cal + ' a day logged, flat weight: no number', r.tdee == null, J({ tdee: r.tdee, held: r.held }));
  check(cal + ': the need is "a look at recent weigh-ins and food entries"',
    Array.isArray(r.need) && r.need.includes('a look at recent weigh-ins and food entries'), J(r.need));
  check(cal + ': the held value is kept for what reads it, never shown', r.held === cal, J(r.held));
  // 4. never the legacy arithmetic: the legacy path would answer this one
  // (7+ logged days and two weeks of weigh-ins), and must not be reached.
  check(cal + ': the answer is the model\'s, not the legacy fallback', r.model === true, J({ model: r.model }));
}

section('5. Four weigh-ins spread over fifteen days, seven logged days: shown');
{
  const s = fresh();
  const tk = (await s.load('store.js')).todayKey;
  const w = {}; [15, 10, 5, 0].forEach((ago, i) => { w['w' + i] = { lb: 186 - i * 0.5, t: new RealDate(Y, M - 1, D - ago, 7).getTime() }; });
  const sums = summariesBefore(tk, Y, M, D, 7, 2400);
  const { r } = await run(s, w, sums);
  check('a number is shown', Number.isFinite(r.tdee) && r.tdee >= 1000 && r.tdee <= 6000, J({ tdee: r.tdee, need: r.need }));
  check('and nothing is "needed"', !r.need || r.need.length === 0, J(r.need));
}

done(...cleanups);
