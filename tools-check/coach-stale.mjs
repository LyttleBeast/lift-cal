#!/usr/bin/env node
//
// Verifier for what Coach's energy read is handed about the weight trend
// (P5 A10; F28, F44).
//
//   node tools-check/coach-stale.mjs
//
// coach-goal.js energyContext() now asks for two weeks of trend SPAN and is
// silent when the trend's newest weigh-in is more than 4 days old. Those two
// numbers come from tdee.js trendRate() (spanDays, ageDays) through
// coach-data.js coachInput() (rateSpanDays, rateAgeDays). And the legacy
// weekly difference, read before the model is fitted, is not a trend Coach
// may read energy from at all (F44: "+3 lb/wk, surplus" before the fit), so
// coach-data hands it on with rateSpanDays 0.
//
// What it proves, driving the REAL tdee.js, weightmodel.js, coach-data.js and
// coach-goal.js:
//   - trendRate().ageDays is the whole-day difference of the date keys: 3 at
//     09:00 and still 3 at 23:59, three days after the last weigh-in;
//   - trendRate().spanDays is the fitted points' span in days;
//   - coachInput().weight carries them as rateSpanDays / rateAgeDays;
//   - with a legacy rate (no fitted model), rateSpanDays is 0 and
//     energyContext of that weight is null.

import { stage, harness, setNow, at, dailyWeighIns, J } from './lib/stage.mjs';

const { check, section, done } = harness('coach-stale — Coach reads energy only off a two-week, fresh trend');
const cleanups = [];
const Y = 2026, M = 10, D = 6;
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'coach-goal.js', 'coach-data.js', 'exercises.js'];

section('trendRate(): span and age');
for (const [h, mi] of [[9, 0], [23, 59]]) {
  setNow(at(Y, M, D, h, mi));
  const s = stage(REAL); cleanups.push(s.cleanup);
  const T = await s.load('tdee.js');
  const w = dailyWeighIns(Y, M, D - 3, 15, i => 190 - i * 0.2);
  await T.refreshModel(w);
  const r = T.trendRate(w);
  check(h + ':' + String(mi).padStart(2, '0') + ', last weigh-in three days ago: ageDays is the integer 3', r.ageDays === 3, J(r));
  check(h + ':' + String(mi).padStart(2, '0') + ': spanDays is the fitted span, 14', r.spanDays === 14, J(r));
}

section('coachInput(): what Coach is handed');
{
  setNow(at(Y, M, D, 9));
  const s = stage(REAL); cleanups.push(s.cleanup);
  const T = await s.load('tdee.js'), C = await s.load('coach-data.js'), G = await s.load('coach-goal.js');
  const w = dailyWeighIns(Y, M, D, 21, i => 190 - i * 0.2);
  await T.refreshModel(w);
  C.noteCoachData({ entries: w, summaries: {} });
  const wt = C.coachInput().weight;
  check('a fitted trend: rateSpanDays 20 and rateAgeDays 0', wt.rateSpanDays === 20 && wt.rateAgeDays === 0, J(wt));
  check('and energyContext reads it', G.energyContext(wt) != null, J(G.energyContext(wt)));
}
{
  // Before the model is fitted: trendRate() falls back to the legacy weekly
  // difference of two 7-day means. 14 daily weigh-ins gaining 3 lb a week.
  setNow(at(Y, M, D, 18));
  const s = stage(REAL); cleanups.push(s.cleanup);
  const C = await s.load('coach-data.js'), G = await s.load('coach-goal.js');
  const w = dailyWeighIns(Y, M, D, 15, i => 180 + i * 3 / 7);
  C.noteCoachData({ entries: w, summaries: {} });
  const wt = C.coachInput().weight;
  check('a legacy rate is there (the weekly difference)', Number.isFinite(wt.rateWk) && wt.rateWk > 2, J(wt));
  check('it is handed on with rateSpanDays 0', wt.rateSpanDays === 0, J(wt));
  check('so energyContext reads no "surplus" off it', G.energyContext(wt) === null, J(G.energyContext(wt)));
}

done(...cleanups);
