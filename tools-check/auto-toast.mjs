#!/usr/bin/env node
//
// Verifier for what the toast says after auto targets moved (P5 B4; XC X1).
//
//   node tools-check/auto-toast.mjs
//
// The biggest number change existing accounts get on the day this ships is
// the one-move lift to the safety floor (B3): autozero +1,100, a girl of 14
// +490. It was toasted "Targets moved with your trend", which is the wrong
// reason. food.js autoToast(plan) is pure and says which line did it.
//
// What it proves, driving the REAL food.js:
//   - lifted 'minor': "Raised to N kcal — under 18, Rack doesn't plan a
//     deficit";
//   - lifted 'safe': "Raised to your safety floor: N kcal";
//   - otherwise the trend sentence, as before;
//   - applyAuto shows autoToast(plan), and nothing else.

import { stage, harness, setNow, at, J, readSrc } from './lib/stage.mjs';

const { check, section, done } = harness('auto-toast — the toast says which line moved the target');
const cleanups = [];
setNow(at(2026, 10, 6, 9));
const s = stage(['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js']); cleanups.push(s.cleanup);
const F = await s.load('food.js');

section('The strings');
const ok = typeof F.autoToast === 'function';
check('food.js exports autoToast', ok);
if (ok) {
  check('a minor lifted: "Raised to 1,800 kcal — under 18, Rack doesn’t plan a deficit"',
    F.autoToast({ cal: 1800, p: 120, f: 42, lifted: 'minor' }) === 'Raised to 1,800 kcal — under 18, Rack doesn’t plan a deficit',
    F.autoToast({ cal: 1800, p: 120, f: 42, lifted: 'minor' }));
  check('the safety floor: "Raised to your safety floor: 1,500 kcal"',
    F.autoToast({ cal: 1500, p: 185, f: 65, lifted: 'safe' }) === 'Raised to your safety floor: 1,500 kcal',
    F.autoToast({ cal: 1500, p: 185, f: 65, lifted: 'safe' }));
  check('a trend move: the sentence it always was',
    F.autoToast({ cal: 2300, p: 185, f: 65, lifted: null }) === 'Targets moved with your trend — 2,300 kcal, 185g protein',
    F.autoToast({ cal: 2300, p: 185, f: 65, lifted: null }));
}

section('The wiring');
{
  const FOOD = readSrc('food.js');
  check('applyAuto toasts autoToast(plan), and the old fixed sentence is gone from it',
    /toast\(autoToast\(plan\)\);/.test(FOOD) && !/toast\('Targets moved with your trend \\u2014 ' \+ plan\.cal/.test(FOOD));
}

done(...cleanups);
