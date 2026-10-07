#!/usr/bin/env node
//
// Verifier for the intake average under the measured maintenance number
// (P5 A5; F36, DECISION D-F12).
//
//   node tools-check/maintenance-intake.mjs
//
// Two things, one of each kind:
//
//   - FINISHED DAYS ONLY. Both intake filters (weightmodel.js
//     maintenanceFromModel, tdee.js legacyMaintenance) used to drop only
//     today's key, so food filed under TOMORROW's date by a second device on
//     another time zone counted in the average. Now `d < today`.
//   - THE PLAIN MEAN, NO CAP. An earlier prototype capped big days (median x
//     2.5); it broke alternate-day fasters (P5 VC, |err| 325 -> 536), so it is
//     DECISION D-F12 and its default is "no cap". This pins the plain mean, so
//     a cap cannot arrive by accident.
//
// What it proves, driving the REAL tdee.js and weightmodel.js:
//   - a tomorrow key (9,000 kcal) leaves tdee and `days` unchanged, on the
//     model path and on the legacy path;
//   - 11 x 600 + 10 x 4,000, a 5:2 window, and 20 x 2,000 + one 4,900 all
//     give the plain mean (flat weight, so tdee is the mean rounded to 10);
//   - no `cappedIntake` / `INTAKE_CAP` export exists.

import { stage, harness, setNow, at, dailyWeighIns, J, RealDate } from './lib/stage.mjs';

const { check, section, done } = harness('maintenance-intake — finished days only, and the plain mean');
const cleanups = [];
const Y = 2026, M = 10, D = 6;
setNow(at(Y, M, D, 9));
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js'];

async function measure(calAt, { tomorrow = null, legacy = false } = {}) {
  const s = stage(REAL); cleanups.push(s.cleanup);
  const T = await s.load('tdee.js'), tk = (await s.load('store.js')).todayKey;
  // Flat 185 every morning for three weeks: the slope is 0, so tdee is the
  // intake mean itself, rounded to 10.
  const w = dailyWeighIns(Y, M, D, 22, 185);
  const sums = {};
  for (let i = 1; i <= 21; i++) sums[tk(new RealDate(Y, M - 1, D - i, 12))] = { cal: calAt(i) };
  if (tomorrow != null) sums[tk(new RealDate(Y, M - 1, D + 1, 12))] = { cal: tomorrow };
  if (!legacy) await T.refreshModel(w);
  const r = T.maintenance(w, sums);
  const W = await s.load('weightmodel.js');
  return { r, T, W };
}
const mean = (n, f) => { let s = 0; for (let i = 1; i <= n; i++) s += f(i); return s / n; };
const r10 = x => Math.round(x / 10) * 10;

section('Food filed under tomorrow\'s date does not count');
for (const legacy of [false, true]) {
  const path = legacy ? 'legacy path (before the first fit)' : 'model path';
  const flat = i => 2300 + (i % 4) * 50;
  const a = (await measure(flat, { legacy })).r, b = (await measure(flat, { legacy, tomorrow: 9000 })).r;
  check(path + ': tdee unchanged by a 9,000 kcal tomorrow', a.tdee === b.tdee && a.tdee > 0, a.tdee + ' vs ' + b.tdee);
  check(path + ': `days` unchanged', a.days === b.days, a.days + ' vs ' + b.days);
}

section('The plain mean, whatever the eating pattern');
{
  const cases = [
    ['11 days of 600 and 10 of 4,000', i => (i <= 11 ? 600 : 4000)],
    ['a 5:2 week, three times over', i => ((i % 7) < 2 ? 600 : 2500)],
    ['20 days of 2,000 and one of 4,900', i => (i === 3 ? 4900 : 2000)]
  ];
  for (const [name, f] of cases) {
    const { r } = await measure(f);
    const want = r10(mean(21, f));
    check(name + ': ' + want + ', the plain mean', r.tdee === want && r.days === 21, J({ tdee: r.tdee, held: r.held, avgIntake: r.avgIntake, days: r.days }));
  }
}

section('No intake cap exists to be switched on by accident');
{
  const { T, W } = await measure(() => 2400);
  const names = [...Object.keys(T), ...Object.keys(W)];
  check('no cappedIntake / INTAKE_CAP / cap export in tdee.js or weightmodel.js',
    !names.some(n => /cappedIntake|INTAKE_CAP|^cap$/i.test(n)), J(names.filter(n => /cap/i.test(n))));
}

done(...cleanups);
