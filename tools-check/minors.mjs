#!/usr/bin/env node
//
// Verifier for minors: no deficit under 18, the Dietary Guidelines line as the
// floor, and Rack is 13 and over (P5 B2; F15; VD vd-b; XC X11; DECISIONS #2,
// #3, built as recommended).
//
//   node tools-check/minors.mjs
//
// A 14-year-old girl got a 1,190 kcal "cut" against the 1,800 the Dietary
// Guidelines give her, and an 11-year-old could sign up. Now, under 18
// (tdee.js ADULT_AGE), the goal rate cannot go below 0 and the floor is the
// DGA line (girls and 'x' 1,600 at 12-13 and 1,800 at 14-17; boys 1,800 /
// 2,000). Setup takes a birth year only up to this year - 14, which
// guarantees 13 and over by birth year; Settings applies that bound only when
// the year is CHANGED, so an existing account born in 2013 can still save a
// new name. Existing under-13 accounts are not blocked (DECISIONS #3 leaves
// that to Micah); the minors' floors reach them through who.age.
//
// What it proves, driving the REAL tdee.js, food.js and onboarding.js:
//   - girl 15, cut, maintenance 2,000: 2,000 (no deficit), minorHeld;
//   - girl 14, maintenance 1,690: 1,800; boy 16: at least 2,000;
//   - an adult is unchanged;
//   - goalNext's by-hand branch drops a minor's deficit too;
//   - setup refuses 2013 (in 2026) with the new wording and accepts 2012;
//   - Settings: an UNCHANGED stored 2013 saves; a CHANGED 2013 is refused.

import { stage, harness, setNow, at, J, resetDb, readSrc } from './lib/stage.mjs';

const { check, section, done } = harness('minors — no deficit under 18; Rack is 13 and over');
const cleanups = [];
setNow(at(2026, 10, 6, 9));
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js', 'onboarding.js'];
const fresh = () => { const s = stage(REAL); cleanups.push(s.cleanup); return s; };
const CUT = { on: true, rateWk: -1, pPerLb: 1, fPerLb: 0.35, floor: 0 };
const WORDS = 'Rack is for people 13 and over. It goes by birth year, so you can join from January of the year you turn 14.';

section('The floors');
{
  const T = await fresh().load('tdee.js');
  const g15 = T.autoTargets(CUT, 2000, 120, { sex: 'f', age: 15 });
  check('girl 15, cut, maintenance 2,000: 2,000 — no deficit', g15 && g15.cal === 2000, J(g15));
  check('and it says the deficit was dropped (minorHeld)', g15 && g15.minorHeld === true && g15.minor === true, J(g15));
  const g14 = T.autoTargets({ ...CUT, rateWk: 0 }, 1690, 110, { sex: 'f', age: 14 });
  check('girl 14, maintenance 1,690: 1,800, the DGA line', g14 && g14.cal === 1800, J(g14));
  const b16 = T.autoTargets(CUT, 1900, 150, { sex: 'm', age: 16 });
  check('boy 16, cut, maintenance 1,900: at least 2,000', b16 && b16.cal >= 2000, J(b16));
  const g12 = T.autoTargets(CUT, 1400, 90, { sex: 'f', age: 12 });
  check('girl 12 (an account older than the bound): 1,600', g12 && g12.cal === 1600, J(g12));
  const adult = T.autoTargets(CUT, 2000, 150, { sex: 'f', age: 30 });
  check('a woman of 30, cut, maintenance 2,000: 1,500, as before', adult && adult.cal === 1500 && !adult.minorHeld, J(adult));
  const a18 = T.autoTargets(CUT, 2400, 150, { sex: 'm', age: 18 });
  check('18 is an adult: 1,900', a18 && a18.cal === 1900, J(a18));
  check('ADULT_AGE is a named export, 18', T.ADULT_AGE === 18);
  check('a gain for a minor is untouched: girl 16, +0.5, maintenance 2,000: 2,250',
    T.autoTargets({ ...CUT, rateWk: 0.5 }, 2000, 120, { sex: 'f', age: 16 }).cal === 2250);
}

section('The Goal sheet\'s by-hand target');
{
  resetDb({ 'food/targets': { cal: 2000, p: 120, f: 42, maint: 2000, maintSrc: 'pinned', auto: { on: false, rateWk: 0 } },
            profile: { sex: 'f', birthYear: 2011 } });
  const F = await fresh().load('food.js');
  await F.initFood();
  const pv = F.previewGoal('cut');
  check('girl 15 asks for a cut by hand: maintenance, 2,000 — no deficit', pv && pv.cal === 2000, J(pv));
}

section('The birth-year line');
{
  const O = await fresh().load('onboarding.js');
  const ok = typeof O.birthYearProblem === 'function';
  check('onboarding.js exports birthYearProblem (setup and Settings share it)', ok);
  if (ok) {
    check('setup in 2026: 2013 is refused with the new wording', O.birthYearProblem(2013, 2026) === WORDS, O.birthYearProblem(2013, 2026));
    check('setup in 2026: 2012 is accepted', O.birthYearProblem(2012, 2026) === null);
    check('setup: 1919 and 2027 are "Check the birth year."',
      O.birthYearProblem(1919, 2026) === 'Check the birth year.' && O.birthYearProblem(2027, 2026) === 'Check the birth year.' && O.birthYearProblem(NaN, 2026) === 'Check the birth year.');
    check('Settings: an UNCHANGED stored 2013 saves (a name change goes through)', O.profileYearProblem(2013, 2013, 2026) === null);
    check('Settings: a year CHANGED to 2013 is refused with the same wording', O.profileYearProblem(2013, 1990, 2026) === WORDS);
    check('Settings: a year changed to 1995 saves', O.profileYearProblem(1995, 1990, 2026) === null);
    check('Settings with no stored year: the new bound applies', O.profileYearProblem(2013, null, 2026) === WORDS);
  }
  const OB = readSrc('onboarding.js'), ST = readSrc('settings.js');
  check('setup\'s step asks birthYearProblem, and its box stops at this year - 14',
    /birthYearProblem\(a\.birthYear, y\)/.test(OB) && /max: new Date\(\)\.getFullYear\(\) - 14/.test(OB) && !/a\.birthYear <= y - 12/.test(OB));
  check('Settings → Your details asks profileYearProblem with the stored year',
    /profileYearProblem\(year, /.test(ST) && !/year <= thisYear - 12\)\) \{ toast\('Check the birth year\.'\)/.test(ST));
}

done(...cleanups);
