#!/usr/bin/env node
//
// Verifier for how far auto targets move in one step, and the floors that
// still bind at once (P5 C1; F02, F17; XC d1; CMB2 OPEN 1; F47).
//
//   node tools-check/auto-step.mjs
//
// One tap after a typo weigh-in stored a 4,000-45,000 kcal target, and the
// macros jumped 112 g in one weekly move. food.js autoPlan() now moves the
// calories at most AUTO_MAX_STEP (100) and protein and fat at most
// AUTO_MAX_GRAMS (10 g) a step, and clamps to LIMITS.cal. But the floors
// still bind at once: the safety floor, the person's own "Never go below",
// and the macro floor of the step-limited grams (protein x 4 + fat x 9 +
// 100 g of carbs, to the next 10). The prototype let a user's own 2,000 floor
// sit at 1,700 for a week and carbs at 84-93 g (CMB2 OPEN 1); this pins that
// it does not. A jump past the step says which floor did it (`lifted`), and
// the toast says so (auto-toast.mjs).
//
// What it proves, driving the REAL food.js:
//   - calories move ±100 a step; protein and fat ±10 g;
//   - a user floor of 2,000 binds at once (lifted 'user');
//   - the macro floor of the step-limited grams binds at once, carbs >= 100 g
//     (lifted 'macro');
//   - a move DOWN that a floor stops short is not called "raised";
//   - the result never passes LIMITS.cal;
//   - the toasts for 'user' and 'macro';
//   - the sheet's promise says the floor exception.

import { stage, harness, setNow, at, J, readSrc } from './lib/stage.mjs';

const { check, section, done } = harness('auto-step — bounded steps, floors at once');
const cleanups = [];
const NOW = at(2026, 10, 6, 9);
setNow(NOW);
const s = stage(['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js']); cleanups.push(s.cleanup);
const F = await s.load('food.js'), U = await s.load('ui.js');
const AUTO = (o = {}) => ({ on: true, rateWk: -1, pPerLb: 1, fPerLb: 0.35, floor: 0, lastAdj: 0, ...o });
const plan = (t, maint, lb, who = null) => F.autoPlan(t, maint, lb, NOW, who, false);
const carbs = p => (p.cal - p.p * 4 - p.f * 9) / 4;

section('The step');
{
  const up = plan({ cal: 2000, p: 180, f: 63, auto: AUTO({ rateWk: 0 }) }, 3000, 180);
  check('maintenance 3,000, target 2,000, hold: +100 to 2,100', up && up.cal === 2100 && !up.lifted, J(up));
  const down = plan({ cal: 2500, p: 180, f: 63, auto: AUTO() }, 2000, 180);
  check('maintenance 2,000, target 2,500, cut: -100 to 2,400', down && down.cal === 2400 && !down.lifted, J(down));
  const g = plan({ cal: 2600, p: 100, f: 30, auto: AUTO({ rateWk: 0 }) }, 2600, 200);
  check('protein 100 -> wants 200: 110; fat 30 -> wants 70: 40 (±10 g a step)', g && g.p === 110 && g.f === 40, J(g));
  const gd = plan({ cal: 2600, p: 250, f: 100, auto: AUTO({ rateWk: 0 }) }, 2600, 180);
  check('and down: protein 250 -> 240, fat 100 -> 90', gd && gd.p === 240 && gd.f === 90, J(gd));
}

section('The floors bind at once');
{
  const u = plan({ cal: 1700, p: 160, f: 56, auto: AUTO({ floor: 2000 }) }, 2200, 160);
  check('his own "Never go below 2,000", target 1,700: 2,000 at once', u && u.cal === 2000, J(u));
  check('and it says his floor did it (lifted \'user\')', u && u.lifted === 'user', J(u));
  const m = plan({ cal: 1500, p: 190, f: 70, auto: AUTO() }, 1900, 200);
  check('the macro floor of the step-limited grams (200 g / 70 g -> 1,830): 1,830 at once', m && m.cal === 1830, J(m));
  check('so carbs are at least 100 g', m && carbs(m) >= 100, J(m && carbs(m)));
  check('and it says the macros did it (lifted \'macro\')', m && m.lifted === 'macro', J(m));
  const sf = plan({ cal: 1250, p: 100, f: 35, auto: AUTO() }, 1300, 100, { sex: 'f', age: 40 });
  check('a cut that the safety floor stops short (1,250 -> 1,200, a move DOWN): not called "raised"', sf && sf.cal === 1200 && !sf.lifted, J(sf));
}

section('LIMITS.cal');
{
  const hi = plan({ cal: U.LIMITS.cal[1], p: 300, f: 100, auto: AUTO({ rateWk: 0 }) }, 46000, 300);
  check('maintenance 46,000 with the target already at the limit: it stays at ' + U.LIMITS.cal[1].toLocaleString(), hi === null || hi.cal <= U.LIMITS.cal[1], J(hi));
}

section('The words');
{
  check('autoToast \'user\': "Raised to the floor you set: 2,000 kcal"',
    typeof F.autoToast === 'function' && F.autoToast({ cal: 2000, p: 160, f: 56, lifted: 'user' }) === 'Raised to the floor you set: 2,000 kcal');
  check('autoToast \'macro\': "Raised to 1,830 kcal: your protein and fat plus 100 g of carbs need that much"',
    typeof F.autoToast === 'function' && F.autoToast({ cal: 1830, p: 200, f: 70, lifted: 'macro' }) === 'Raised to 1,830 kcal: your protein and fat plus 100 g of carbs need that much');
  const FOOD = readSrc('food.js');
  check('the sheet promises the exception: "…never more than 100 kcal at a time, except straight up to a floor."',
    /'Re-checked when you weigh in, moves at most once a week and never more than ' \+\s*AUTO_MAX_STEP \+ ' kcal at a time, except straight up to a floor\.'/.test(FOOD));
  check('AUTO_MAX_GRAMS is 10', /const AUTO_MAX_GRAMS\s*=\s*10;/.test(FOOD));
}

done(...cleanups);
