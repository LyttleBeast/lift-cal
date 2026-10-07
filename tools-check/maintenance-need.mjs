#!/usr/bin/env node
//
// Verifier for whose "Needs …" sentence the Weight card prints, and for the
// range check on the legacy path (P5 A6; F45, XC gate bypass).
//
//   node tools-check/maintenance-need.mjs
//
// A model short of logged days used to return null, so maintenance() fell to
// the legacy arithmetic and printed ITS sentence, which can say "two weeks of
// weigh-ins" to somebody with three weeks of them and a fitted trend. And a
// legacy answer had no plausibility check at all. Now the model answers for
// itself whenever it has a rate (tdee null, the model's own need), and a
// legacy number outside [1,000, 6,000] is held like a model one.
//
// What it proves, driving the REAL tdee.js and weightmodel.js:
//   - 21 daily weigh-ins and 5 logged days: the need is exactly
//     ["2 more days of food logging"];
//   - weigh-ins every third day for three weeks and 5 logged days: the same
//     (the legacy sentence added "two weeks of weigh-ins", which was false);
//   - with no number to hold, `held` is null, not a number;
//   - before the first fit (the legacy path), 14 days of 450 kcal and a flat
//     weight is held with "a look at recent weigh-ins and food entries".

import { stage, harness, setNow, at, dailyWeighIns, summariesBefore, J, RealDate } from './lib/stage.mjs';

const { check, section, done } = harness('maintenance-need — the need comes from the path that answered');
const cleanups = [];
const Y = 2026, M = 10, D = 6;
setNow(at(Y, M, D, 9));
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js'];

async function measure(w, calDays, cal, { fit = true } = {}) {
  const s = stage(REAL); cleanups.push(s.cleanup);
  const T = await s.load('tdee.js'), tk = (await s.load('store.js')).todayKey;
  const sums = summariesBefore(tk, Y, M, D, calDays, cal);
  if (fit) await T.refreshModel(w);
  return T.maintenance(w, sums);
}

section('A fitted trend, five logged days');
{
  const r = await measure(dailyWeighIns(Y, M, D, 21, i => 190 - i * 0.14), 5, 2100);
  check('21 daily weigh-ins: the need is exactly ["2 more days of food logging"]',
    J(r.need) === J(['2 more days of food logging']) && r.tdee == null, J({ tdee: r.tdee, need: r.need }));
  check('it is the model\'s answer', r.model === true, J(r.model));
  check('and with no number to hold, `held` is null', r.held === null, J(r.held));
}
{
  const w = {}; for (let ago = 21, i = 0; ago >= 0; ago -= 3, i++) w['w' + i] = { lb: 190 - i * 0.4, t: new RealDate(Y, M - 1, D - ago, 7).getTime() };
  const r = await measure(w, 5, 2100);
  check('weigh-ins every third day for three weeks: exactly ["2 more days of food logging"] (no false "two weeks of weigh-ins")',
    J(r.need) === J(['2 more days of food logging']), J(r.need));
}

section('The legacy path meets the same range check');
{
  const r = await measure(dailyWeighIns(Y, M, D, 15, 185), 14, 450, { fit: false });
  check('before the first fit, 14 days of 450 kcal: no number', r.tdee == null, J({ tdee: r.tdee, held: r.held }));
  check('held, with "a look at recent weigh-ins and food entries"',
    r.held === 450 && Array.isArray(r.need) && r.need.includes('a look at recent weigh-ins and food entries'), J(r));
  const ok = await measure(dailyWeighIns(Y, M, D, 15, 185), 14, 2450, { fit: false });
  check('a legacy 2,450 inside the range is shown as before', ok.tdee === 2450 && ok.model === false, J(ok));
}

done(...cleanups);
