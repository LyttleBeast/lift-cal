#!/usr/bin/env node
//
// Verifier for when auto targets move, and the safety-floor lift that goes
// first (P5 B3; XC X8; DECISION D-e, "floor first", built as recommended).
//
//   node tools-check/auto-freeze.mjs
//
// Two rules, in this order, in food.js autoPlan():
//
//   1. A target under the safety floor is lifted to it FIRST — before the
//      held estimate, the missing maintenance number or the weekly clock,
//      any of which used to keep a 400 kcal target on screen for up to 14
//      days. Only the calories move; protein, fat and the weekly clock stay.
//   2. Then, while the measured maintenance is HELD by the gate (tdee.js A1),
//      auto does not plan at all: the setup guess standing in is not a number
//      to move a target toward. A pinned number is the person's own and is
//      never held.
//
// What it proves, booting the REAL food.js (initFood -> applyAuto) against a
// fake database:
//   - held estimate, auto on, target above the floor: nothing is written;
//   - held + a 400 target (a man): cal 1,500 is written, p / f and lastAdj
//     unchanged;
//   - the weekly gate closed + 400: lifted; no maintenance at all + 400:
//     lifted;
//   - a pinned account with the same held estimate still plans;
//   - autoPlan on a node with no calories is null, not NaN.

import { stage, harness, setNow, at, J, resetDb, fake, RealDate, summariesBefore, readSrc } from './lib/stage.mjs';

const { check, section, done } = harness('auto-freeze — the floor lift goes first; a held estimate plans nothing');
const cleanups = [];
const Y = 2026, M = 10, D = 6;
const NOW = at(Y, M, D, 9);
setNow(NOW);
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js'];
const DAY = 864e5;
const MAN = { sex: 'm', birthYear: 1986, heightIn: 70 };
const AUTO = { on: true, rateWk: -1, pPerLb: 1, fPerLb: 0.35, floor: 0, lastAdj: 0 };

// A held estimate: four weigh-ins over six days and ten logged days. The model
// answers 2,850, which the gate holds (span under two weeks).
function heldData(tk) {
  const w = {}; [6, 4, 2, 0].forEach((ago, i) => { w['w' + i] = { lb: 185 - i * 0.2, t: new RealDate(Y, M - 1, D - ago, 7).getTime() }; });
  return { 'weight/entries': w, 'food/daySummaries': summariesBefore(tk, Y, M, D, 10, 2500) };
}
async function boot(db) {
  resetDb(db);
  const s = stage(REAL); cleanups.push(s.cleanup);
  const tk = (await s.load('store.js')).todayKey;
  const F = await s.load('food.js');
  return { F, tk, run: async () => { await F.initFood(); return fake.writes.filter(w => w.path === 'food/targets').map(w => w.value); } };
}
const tkOf = async () => { const s = stage(['ui.js']); cleanups.push(s.cleanup); return (await s.load('store.js')).todayKey; };
const tk = await tkOf();

section('A held estimate');
{
  const { run } = await boot({ ...heldData(tk), profile: MAN,
    'food/targets': { cal: 2000, p: 185, f: 65, maint: 2400, maintSrc: 'setup', auto: { ...AUTO } } });
  const w = await run();
  check('auto on, target 2,000 (above the floor): nothing is written', w.length === 0, J(w));
}
{
  const { run } = await boot({ ...heldData(tk), profile: MAN,
    'food/targets': { cal: 400, p: 185, f: 65, maint: 2400, maintSrc: 'setup', auto: { ...AUTO, lastAdj: NOW - 30 * DAY } } });
  const w = await run();
  check('auto on, target 400 (a man): one write, cal 1,500', w.length === 1 && w[0].cal === 1500, J(w));
  check('protein and fat stay where they were', w.length === 1 && w[0].p === 185 && w[0].f === 65, J(w));
  check('and the weekly clock is not touched (lastAdj unchanged)', w.length === 1 && w[0].auto.lastAdj === NOW - 30 * DAY, J(w[0] && w[0].auto));
}

section('Nothing else holds the floor lift back');
{
  // A mature measured number, but the weekly gate closed two days ago.
  const wts = {}; for (let i = 0; i < 21; i++) wts['w' + i] = { lb: 185, t: new RealDate(Y, M - 1, D - 20 + i, 7).getTime() };
  const { run } = await boot({ 'weight/entries': wts, 'food/daySummaries': summariesBefore(tk, Y, M, D, 20, 2500), profile: MAN,
    'food/targets': { cal: 400, p: 185, f: 65, auto: { ...AUTO, lastAdj: NOW - 2 * DAY } } });
  const w = await run();
  check('the weekly gate closed (moved two days ago) + 400: lifted to 1,500', w.length === 1 && w[0].cal === 1500, J(w));
}
{
  const { run } = await boot({ profile: MAN, 'food/targets': { cal: 400, p: 185, f: 65, auto: { ...AUTO } } });
  const w = await run();
  check('no maintenance number at all + 400: lifted to 1,500', w.length === 1 && w[0].cal === 1500, J(w));
}

section('A pinned number is never held');
{
  const { run } = await boot({ ...heldData(tk), profile: MAN,
    'food/targets': { cal: 2400, p: 185, f: 65, maint: 2400, maintSrc: 'pinned', auto: { ...AUTO } } });
  const w = await run();
  check('pinned 2,400 with the same held estimate: auto still plans (one move toward 1,900)', w.length === 1 && w[0].cal === 2300, J(w));
}

section('A node with no calories');
{
  const s = stage(REAL); cleanups.push(s.cleanup);
  const F = await s.load('food.js');
  const p = F.autoPlan({ cal: undefined, p: 180, f: 60, auto: { ...AUTO } }, 2400, 180, NOW, null, false);
  check('autoPlan({ cal: undefined }) is null, not a NaN target', p === null, J(p));
}

section('The wiring');
{
  const FOOD = readSrc('food.js');
  check('applyAuto hands autoPlan the held flag from maintInfo()', /autoPlan\(targets, mi \? mi\.cal : 0, trendWeight\(\), Date\.now\(\), who, !!\(mi && mi\.held\)\)/.test(FOOD));
  check('and writes lastAdj only when the plan carries one', /plan\.lastAdj != null \? \{ \.\.\.targets\.auto, lastAdj: plan\.lastAdj \} : targets\.auto/.test(FOOD));
}

done(...cleanups);
