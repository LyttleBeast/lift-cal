#!/usr/bin/env node
//
// Verifier for Fuel following the day summaries (P5 D1; F13).
//
//   node tools-check/fuel-summaries.mjs
//
// Fuel read food/daySummaries once at boot. A PWA left open never saw its own
// logged days arrive, so its maintenance stayed on setup (or nothing) while
// Weight and You moved on: in the audit's resident batteries, 0 measured
// opens against about 94 % with the watch. food.js loadMaintInputs now
// watches food/daySummaries the way it watches weight/entries: assign, skip
// an unchanged node, and re-plan or repaint.
//
// What it proves, booting the REAL food.js against a fake database:
//   - three weeks of weigh-ins and five logged days: Fuel has no measured
//     number (setup in force);
//   - the summaries node then gains three weeks of days, delivered by the
//     live listener after boot: Fuel's maintenance is now the measured one.

import { stage, harness, setNow, at, J, resetDb, fake, RealDate, summariesBefore } from './lib/stage.mjs';

const { check, section, done } = harness('fuel-summaries — Fuel follows the day summaries');
const cleanups = [];
const Y = 2026, M = 10, D = 6;
setNow(at(Y, M, D, 9));
const s = stage(['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js']); cleanups.push(s.cleanup);
const tk = (await s.load('store.js')).todayKey;
const w = {}; for (let i = 0; i < 21; i++) w['w' + i] = { lb: 190 - i * 0.1, t: new RealDate(Y, M - 1, D - 20 + i, 7).getTime() };
resetDb({ 'weight/entries': w, 'food/daySummaries': summariesBefore(tk, Y, M, D, 5, 2400),
          'food/targets': { cal: 2200, p: 180, f: 60, maint: 2600, maintSrc: 'setup', auto: { on: false, rateWk: -1 } } });
const F = await s.load('food.js');
await F.initFood();

section('Before: five logged days');
const before = F.previewGoal('hold');
check('Fuel is on the setup number, 2,600', before.maint === 2600, J(before));

section('A summary node delivered after boot');
const cb = fake.watches.get('food/daySummaries');
check('Fuel listens to food/daySummaries', typeof cb === 'function');
if (cb) await cb(summariesBefore(tk, Y, M, D, 21, 2400));
const after = F.previewGoal('hold');
check('Fuel\'s maintenance is now the measured one (about 2,400 + 0.7 lb/wk x 500)', after.maint !== 2600 && after.maint > 2600 && after.maint < 3000, J(after));

done(...cleanups);
