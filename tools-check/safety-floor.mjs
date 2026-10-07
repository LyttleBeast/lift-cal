#!/usr/bin/env node
//
// Verifier for the safety floor under every computed calorie target (P5 B1;
// F03, F31 part; VD vd-a-sex; DECISIONS-FOR-MICAH #1, built as recommended).
//
//   node tools-check/safety-floor.mjs
//
// With the per-pound boxes at 0, Rack computed, wrote and toasted 400 kcal a
// day: half the 800 line under which a diet needs medical supervision. Now
// nothing Rack computes goes under max(800, 1,200 for women and unknown,
// 1,500 for men) — tdee.js safeFloor(who), with who = whoOf(profile, year).
// A target somebody TYPES is theirs (the one-time card in B5 asks about it).
//
// What it proves, driving the REAL tdee.js and food.js:
//   - autoTargets with protein and fat at 0 g/lb, rate -5, maintenance 1,800:
//     1,200 with no profile, 1,500 for a man, and never under 800 for any who;
//   - autoPlan lifts an auto target under the floor at once;
//   - the Goal sheet's by-hand branch (goalNext, through previewGoal) with
//     p 1 / f 1 / rate -5: at least 1,200, and 1,500 once the profile says
//     male — read from a profile written AFTER Fuel loaded (the watch);
//   - whoOf's table;
//   - the sheet's preview and Save, and setup's numbers, pass who.

import { stage, harness, setNow, at, J, resetDb, readSrc } from './lib/stage.mjs';

const { check, section, done } = harness('safety-floor — no computed target under the safety line');
const cleanups = [];
const NOW = at(2026, 10, 6, 9);
setNow(NOW);
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js'];
const fresh = () => { const s = stage(REAL); cleanups.push(s.cleanup); return s; };
const ZERO = { on: true, rateWk: -5, pPerLb: 0, fPerLb: 0, floor: 0, lastAdj: 0 };

section('autoTargets');
{
  const T = await fresh().load('tdee.js');
  const a = T.autoTargets(ZERO, 1800, 180, null), m = T.autoTargets(ZERO, 1800, 180, { sex: 'm', age: 40 });
  check('no profile: 1,200', a && a.cal === 1200, J(a));
  check('a man: 1,500', m && m.cal === 1500, J(m));
  check('a woman: 1,200', T.autoTargets(ZERO, 1800, 180, { sex: 'f', age: 30 }).cal === 1200);
  const whos = [null, undefined, {}, { sex: 'f' }, { sex: 'm' }, { sex: 'x' }, { sex: 'f', age: 70 }, { sex: 'm', age: 90 }, { sex: '?', age: NaN }];
  const low = [];
  for (const who of whos) for (const mc of [600, 900, 1200, 1800, 2400]) for (const r of [-5, -2, -1, 0])
    { const n = T.autoTargets({ ...ZERO, rateWk: r }, mc, 120, who); if (!n || n.cal < 800) low.push(J({ who, mc, r, cal: n && n.cal })); }
  check('never under 800, for any who, maintenance or rate', !low.length, low.slice(0, 3).join(' | '));
  check('the named constants: SAFE_MIN_KCAL 800, SEX_MIN_KCAL {f 1,200, x 1,200, m 1,500}',
    T.SAFE_MIN_KCAL === 800 && J(T.SEX_MIN_KCAL) === J({ f: 1200, x: 1200, m: 1500 }), J([T.SAFE_MIN_KCAL, T.SEX_MIN_KCAL]));
  check('it says the safety floor held it (safeHeld), and which number that is', a.safeHeld === true && a.safe === 1200 && a.floored === true, J(a));
  check('a cut above the floor is untouched: 2,400 - 500 = 1,900', T.autoTargets({ ...ZERO, rateWk: -1 }, 2400, 180, { sex: 'm', age: 40 }).cal === 1900);
}

section('whoOf(profile, year)');
{
  const T = await fresh().load('tdee.js');
  if (typeof T.whoOf !== 'function') { check('tdee.js exports whoOf', false, 'absent'); }
  else {
  check('no profile: null', T.whoOf(null, 2026) === null && T.whoOf(undefined, 2026) === null);
  check('born 1990, in 2026: { sex, age 36 }', J(T.whoOf({ sex: 'm', birthYear: 1990 }, 2026)) === J({ sex: 'm', age: 36 }), J(T.whoOf({ sex: 'm', birthYear: 1990 }, 2026)));
  check('no birth year: age null', J(T.whoOf({ sex: 'f' }, 2026)) === J({ sex: 'f', age: null }) && J(T.whoOf({ sex: 'f', birthYear: 0 }, 2026)) === J({ sex: 'f', age: null }));
  }
}

section('autoPlan lifts an auto target under the floor at once');
{
  const F = await fresh().load('food.js');
  const p = F.autoPlan({ cal: 1300, p: 0, f: 0, auto: { ...ZERO } }, 1800, 180, NOW, { sex: 'm', age: 40 });
  check('a man at 1,300 with a plan due: 1,500', p && p.cal === 1500, J(p));
}

section('The Goal sheet\'s by-hand target (goalNext, auto off)');
async function boot(db) {
  resetDb(db);
  const s = fresh();
  const F = await s.load('food.js');
  await F.initFood();
  return F;
}
{
  const t = { cal: 2000, p: 1, f: 1, maint: 1800, maintSrc: 'pinned', auto: { on: false, rateWk: -5, pPerLb: 1, fPerLb: 0.35, floor: 0 } };
  const F = await boot({ 'food/targets': t });
  const pv = F.previewGoal('cut');
  check('p 1 / f 1 / rate -5 on a 1,800 maintenance, no profile: at least 1,200', pv && pv.cal >= 1200, J(pv));
  check('exactly 1,200 (the floor, not the 413 the macros allow)', pv && pv.cal === 1200, J(pv));
  // The profile arrives after Fuel loaded (Settings -> Your details): the watch rebuilds who.
  const { fake } = await import('./lib/stage.mjs');
  const cb = fake.watches.get('profile');
  if (cb) await cb({ sex: 'm', birthYear: 1990 });
  const pm = F.previewGoal('cut');
  check('a profile saying male, written after Fuel loaded, reaches the floor without a reload: 1,500', pm && pm.cal === 1500, J({ watched: !!cb, pm }));
}

section('Every place a target is computed passes who');
{
  const FOOD = readSrc('food.js'), OB = readSrc('onboarding.js');
  check('food.js: the sheet\'s preview and its Save, goalNext and autoPlan all pass who',
    (FOOD.match(/autoTargets\([^)]*,\s*who\)/g) || []).length >= 3 && /autoTargets\(a, maintCal, lb, who\)/.test(FOOD), J(FOOD.match(/autoTargets\([^)]*\)/g)));
  check('food.js builds who with whoOf, from the profile it reads and watches',
    /who = whoOf\(/.test(FOOD) && /watch\('profile'/.test(FOOD));
  check('onboarding.js: setup\'s numbers pass whoOf(...)', /autoTargets\([^;]*whoOf\(/.test(OB));
}

done(...cleanups);
