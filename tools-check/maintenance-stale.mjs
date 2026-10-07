#!/usr/bin/env node
//
// Verifier for the stale rule on the measured maintenance number (P5 A2, A7).
//
//   node tools-check/maintenance-stale.mjs
//
// When weighing stops, the last slope used to be run on to today: weeks of
// numbers off by 500-2,000 kcal, shown as measured (P5 F11, F22). Now no
// measured number is shown once the newest fitted weigh-in day is more than
// STALE_DAYS (4) whole calendar days old, counted on the date keys themselves
// (weightmodel.js keyDaysBetween), so a 23- or 25-hour DST day counts one and
// the number does not flip at local noon (XC X6). And the trend weight is
// never read more than STALE_DAYS past the newest point.
//
// What it proves, driving the REAL tdee.js and weightmodel.js:
//   - 21 daily weigh-ins to 24 Sep, then the clock moves: 28 Sep 23:59 still
//     shown; 29 Sep 00:01 held, "a weigh-in (the last one was 5 days ago)";
//   - the same over the 1 Nov DST change: one per date;
//   - keyDaysBetween('2026-10-31', '2026-11-02') === 2;
//   - trendWeight ten days after the last weigh-in is within |slope| x 4 days
//     of the line's value at the newest point.

import { stage, harness, setNow, at, dailyWeighIns, summariesBefore, J, RealDate } from './lib/stage.mjs';

const { check, section, done } = harness('maintenance-stale — no measured number once weighing has stopped');
const cleanups = [];
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js'];

// 21 daily 07:00 weigh-ins ending (y, m, d), losing 0.15 lb a day, and food
// logged every day up to the day before `now`.
async function readAt(y, m, d, nowMs) {
  setNow(nowMs);
  const s = stage(REAL); cleanups.push(s.cleanup);
  const T = await s.load('tdee.js'), W = await s.load('weightmodel.js'), tk = (await s.load('store.js')).todayKey;
  const w = dailyWeighIns(y, m, d, 21, i => 190 - i * 0.15);
  const now = new RealDate(nowMs);
  const sums = summariesBefore(tk, now.getFullYear(), now.getMonth() + 1, now.getDate(), 21, 2200);
  await T.refreshModel(w);
  return { r: T.maintenance(w, sums), T, W, w };
}

section('Weighing stopped on 24 Sep (07:00)');
{
  const a = (await readAt(2026, 9, 24, at(2026, 9, 28, 23, 59))).r;
  check('28 Sep at 23:59 (four days on): still shown', Number.isFinite(a.tdee) && a.tdee > 0, J({ tdee: a.tdee, need: a.need }));
  const b = (await readAt(2026, 9, 24, at(2026, 9, 29, 0, 1))).r;
  check('29 Sep at 00:01 (five days on): held', b.tdee == null && b.held > 0, J({ tdee: b.tdee, held: b.held }));
  check('and the need says "a weigh-in (the last one was 5 days ago)"',
    Array.isArray(b.need) && b.need.includes('a weigh-in (the last one was 5 days ago)'), J(b.need));
}

section('Across the 1 Nov DST change: one per date');
{
  const a = (await readAt(2026, 10, 29, at(2026, 11, 2, 23, 59))).r;
  check('last weigh-in 29 Oct; 2 Nov at 23:59: shown', Number.isFinite(a.tdee) && a.tdee > 0, J({ tdee: a.tdee, need: a.need }));
  const b = (await readAt(2026, 10, 29, at(2026, 11, 3, 0, 1))).r;
  check('3 Nov at 00:01: held, "5 days ago"', b.tdee == null && Array.isArray(b.need) && b.need.includes('a weigh-in (the last one was 5 days ago)'), J(b.need));
  const { W } = await readAt(2026, 10, 29, at(2026, 11, 3, 0, 1));
  check('keyDaysBetween(\'2026-10-31\', \'2026-11-02\') === 2', W.keyDaysBetween && W.keyDaysBetween('2026-10-31', '2026-11-02') === 2,
    W.keyDaysBetween ? W.keyDaysBetween('2026-10-31', '2026-11-02') : 'not exported');
  check('keyDaysBetween across the spring change too (2026-03-07 to 2026-03-09) === 2',
    W.keyDaysBetween && W.keyDaysBetween('2026-03-07', '2026-03-09') === 2);
}

section('The trend weight is not run on past the data');
{
  const { T, W, w } = await readAt(2026, 9, 24, at(2026, 10, 4, 9));
  const m = W.modelState(), lastLb = w['w20'].lb;
  const tw = T.trendWeight();
  const slack = Math.abs(m.ratePerDay) * 4 + 0.01;
  check('ten days after the last weigh-in, trendWeight is within |slope| x 4 days of the line at the newest point',
    Math.abs(tw - lastLb) <= slack, J({ tw, lastLb, slack }));
}

done(...cleanups);
