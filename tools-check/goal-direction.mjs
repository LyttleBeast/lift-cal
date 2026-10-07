#!/usr/bin/env node
//
// Verifier for what a stated "hold" means (P5 C3, read side; F07; XR R2).
//
//   node tools-check/goal-direction.mjs
//
// A stated goal rate of 0 is "Maintaining", and it is final. It used to fall
// through to the target-vs-maintenance test, which is harmless while
// maintenance is the setup guess the target was built from; once maintenance
// is MEASURED it is intake minus the scale's rate, so a hold account eating to
// target sat rate x 500 away from it, and a drift of half a pound a week turned
// "holding" into a cut or a bulk and was coloured as the right way (G7: 30 of
// 30 people). insights.js goalDirection and food.js goalId now return 0 /
// 'hold' for a finite stated rate of 0. With no stated rate, the test against
// maintenance is unchanged.
//
// What it proves, driving the REAL insights.js and food.js:
//   - stated 0 with a target 500 under or 200 over maintenance: 0;
//   - stated -1 / +0.5: -1 / +1, as before;
//   - no stated rate: the target against maintenance, as before;
//   - goalId() of a stated 0 is 'hold'.

import { stage, harness, setNow, at, J, resetDb } from './lib/stage.mjs';

const { check, section, done } = harness('goal-direction — a stated hold stays hold');
const cleanups = [];
setNow(at(2026, 10, 6, 9));
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js'];
const s = stage(REAL); cleanups.push(s.cleanup);
const I = await s.load('insights.js');
const gd = I.goalDirection;

section('insights.js goalDirection');
check('stated 0, target 500 under maintenance: 0 (hold), not a cut', gd({ cal: 2000, auto: { rateWk: 0 } }, 2500) === 0, String(gd({ cal: 2000, auto: { rateWk: 0 } }, 2500)));
check('stated 0, target 200 over: 0, not a bulk', gd({ cal: 2600, auto: { on: false, rateWk: 0 } }, 2400) === 0);
check('stated 0 with no maintenance known: 0 (the goal is known)', gd({ cal: 2600, auto: { rateWk: 0 } }, null) === 0);
check('stated -1: -1; stated +0.5: +1, as before', gd({ cal: 2600, auto: { rateWk: -1 } }, 2400) === -1 && gd({ cal: 2000, auto: { rateWk: 0.5 } }, 2400) === 1);
check('no stated rate: the target against maintenance, as before',
  gd({ cal: 2000 }, 2500) === -1 && gd({ cal: 2450 }, 2500) === 0 && gd({ cal: 3000 }, 2500) === 1 &&
  gd({ cal: 2000, auto: { rateWk: null } }, 2500) === -1 && gd({ cal: 2000, auto: { rateWk: NaN } }, 2500) === -1);
check('nothing known is still null', gd({ cal: 2000 }, null) === null && gd(null, 2500) === null);

section('food.js goalId');
async function goalIdOf(t) {
  resetDb({ 'food/targets': t });
  const st = stage(REAL); cleanups.push(st.cleanup);
  const F = await st.load('food.js');
  await F.initFood();
  return F.goalId();
}
check('stated 0, target 500 under a pinned 2,500: \'hold\'',
  (await goalIdOf({ cal: 2000, p: 180, f: 60, maint: 2500, maintSrc: 'pinned', auto: { on: false, rateWk: 0 } })) === 'hold');
check('no stated rate, the same target: \'cut\', as before',
  (await goalIdOf({ cal: 2000, p: 180, f: 60, maint: 2500, maintSrc: 'pinned' })) === 'cut');
check('stated -1: \'cut\'; stated +0.5: \'gain\'',
  (await goalIdOf({ cal: 2600, p: 180, f: 60, maint: 2500, maintSrc: 'pinned', auto: { on: false, rateWk: -1 } })) === 'cut' &&
  (await goalIdOf({ cal: 2000, p: 180, f: 60, maint: 2500, maintSrc: 'pinned', auto: { on: false, rateWk: 0.5 } })) === 'gain');

done(...cleanups);
