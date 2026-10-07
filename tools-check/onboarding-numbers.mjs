#!/usr/bin/env node
//
// Verifier for Setup's numbers screen (P5 C5; F09, F43, F50).
//
//   node tools-check/onboarding-numbers.mjs
//
// Setup filled its calorie / protein / fat boxes once, on the first visit to
// the numbers screen. Going Back to fix a weight typo (285 for 185) and
// coming forward again kept the typo's numbers (a cut 120 above true
// maintenance, labelled -1 lb/wk). An emptied box wrote a number the box did
// not show, and an impossible setup maintenance (50 lb, 36 in, age 100) was
// written as fact. Now, onboarding.js applySetupNumbers(a, year) — the first
// thing numbers() does — recomputes calories, protein and fat from the
// current answers on every visit until the person edits a box (a.edited),
// always recomputes the setup maintenance, and writes a maintenance outside
// LIMITS.cal as null (Rack waits for a measurement). The boxes store what
// they hold (boxNumber: empty or junk is NaN, which Next refuses).
//
// What it proves, driving the REAL onboarding.js and tdee.js:
//   - 285 -> Back -> 185: the numbers are 185's, not 285's;
//   - an edited 1,800 survives Back; the maintenance still follows;
//   - Cutting -> Bulking on a revisit moves the calories;
//   - an emptied box is NaN and Next's check refuses it;
//   - 50 lb / 36 in / age 100: maintenance null;
//   - numbers() calls applySetupNumbers first, the boxes mark a.edited, and
//     finish() writes maint / maintSrc null for a null maintenance.

import { stage, harness, setNow, at, J, readSrc } from './lib/stage.mjs';

const { check, section, done } = harness('onboarding-numbers — Setup\'s numbers follow the answers until edited');
const cleanups = [];
setNow(at(2026, 10, 6, 9));
const s = stage(['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'onboarding.js']); cleanups.push(s.cleanup);
const O = await s.load('onboarding.js'), U = await s.load('ui.js');
const ok = typeof O.applySetupNumbers === 'function' && typeof O.setupNumbers === 'function' && typeof O.boxNumber === 'function';
check('onboarding.js exports setupNumbers, applySetupNumbers and boxNumber', ok);
const Y = 2026;
const answers = o => ({ name: 'T', sex: 'm', heightIn: 70, birthYear: 1996, lb: 285, goal: 'cut', activity: 'light', units: 'lb', cal: 0, p: 0, f: 0, maint: 0, ...o });

if (ok) {
  section('Back, fix the weight, forward');
  {
    const a = answers();
    O.applySetupNumbers(a, Y);
    const typo = { cal: a.cal, p: a.p, maint: a.maint };
    a.lb = 185;                        // Back to the weight step, fixed
    O.applySetupNumbers(a, Y);
    const want = O.setupNumbers(answers({ lb: 185 }), Y);
    check('285 then 185: the calories are 185\'s (' + want.cal + '), not 285\'s (' + typo.cal + ')', a.cal === want.cal && a.cal !== typo.cal, J({ a, typo }));
    check('and protein (185 g) and maintenance (' + want.maint + ') too', a.p === 185 && a.maint === want.maint, J({ p: a.p, maint: a.maint }));
  }
  section('An edited number survives');
  {
    const a = answers({ lb: 185 });
    O.applySetupNumbers(a, Y);
    a.edited = true; a.cal = 1800;    // typed into the box
    a.lb = 190;
    O.applySetupNumbers(a, Y);
    check('the typed 1,800 survives Back and forward', a.cal === 1800, J(a.cal));
    check('the setup maintenance still follows the answers', a.maint === O.setupNumbers(answers({ lb: 190 }), Y).maint, J(a.maint));
  }
  section('The goal');
  {
    const a = answers({ lb: 185 });
    O.applySetupNumbers(a, Y);
    const cut = a.cal;
    a.goal = 'gain';
    O.applySetupNumbers(a, Y);
    check('Cutting -> Bulking: the calories move (' + cut + ' -> ' + a.cal + ')', a.cal > cut && a.cal === O.setupNumbers(answers({ lb: 185, goal: 'gain' }), Y).cal);
  }
  section('The boxes store what they hold');
  check('an emptied box is NaN, junk is NaN, "1800" is 1,800', Number.isNaN(O.boxNumber('')) && Number.isNaN(O.boxNumber('abc')) && O.boxNumber('1800') === 1800);
  check('and Next\'s check (within LIMITS.cal) refuses NaN', U.within(O.boxNumber(''), U.LIMITS.cal) === false);
  section('An impossible setup maintenance');
  {
    const n = O.setupNumbers(answers({ lb: 50, heightIn: 36, birthYear: 1926 }), Y);
    check('50 lb, 36 in, age 100: maintenance null (Rack waits for a measurement)', n.maint === null, J(n));
    check('ordinary answers: a maintenance inside LIMITS.cal', O.setupNumbers(answers({ lb: 185 }), Y).maint > 1500);
  }
}

section('The wiring');
{
  const OB = readSrc('onboarding.js');
  check('numbers() starts from applySetupNumbers(a, …)', /function numbers\(\) \{\s*const n = applySetupNumbers\(a, new Date\(\)\.getFullYear\(\)\);/.test(OB));
  check('the three boxes mark the answers edited and store what they hold',
    (OB.match(/a\.edited = true; a\.(cal|p|f) = boxNumber\(e\.target\.value\)/g) || []).length === 3);
  check('finish() writes a null maintenance as maint null, maintSrc null', /maint: a\.maint \|\| null,/.test(OB) && /maintSrc: a\.maint > 0 \? 'setup' : null,/.test(OB));
}

done(...cleanups);
