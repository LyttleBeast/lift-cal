#!/usr/bin/env node
//
// Verifier for labels that state what the WRITTEN number plans (P5 C2; F06,
// F14; XC X3, X7, X9).
//
//   node tools-check/planned-label.mjs
//
// Setup printed "−1 lb/wk" under a cut the protein floor held at maintenance,
// and the goal sheet said "maintenance 1,480 minus 500" of a 1,258 target.
// tdee.js plannedRate(cal, maint) reads the rate back off the two numbers on
// screen (3,500 kcal a pound, to the nearest 0.05 lb, never "−0"); setup's
// label uses it, and the Settings goal sentence prints the gap between the
// two numbers it shows, gives the under-18 reason when the deficit was
// dropped, and says "Protein and fat follow your weight." when auto is on.
//
// What it proves, driving the REAL tdee.js, food.js and settings.js:
//   - plannedRate's table, and no "−0";
//   - a 70-year-old woman, maintenance 1,480, cut: the planned rate is not
//     the goal's −1;
//   - setup's label is plannedRate's;
//   - the goal sheet (openGoal) prints "minus 222", not "minus 500"; a girl of
//     15 gets the under-18 reason; auto on says protein and fat follow.

import { stage, harness, setNow, at, J, resetDb, readSrc, RealDate } from './lib/stage.mjs';

const { check, section, done } = harness('planned-label — a label states what the number plans');
const cleanups = [];
const Y = 2026, M = 10, D = 6;
setNow(at(Y, M, D, 9));
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js', 'settings.js'];
const fresh = () => { const s = stage(REAL); cleanups.push(s.cleanup); return s; };
const T = await fresh().load('tdee.js');
const has = typeof T.plannedRate === 'function';
check('tdee.js exports plannedRate', has);

section('plannedRate(cal, maint)');
if (has) {
  check('1,480 against 1,480: 0', T.plannedRate(1480, 1480) === 0);
  check('1,479 against 1,480: 0, and not −0', Object.is(T.plannedRate(1479, 1480), 0), String(T.plannedRate(1479, 1480)));
  check('1,260 against 1,480: −0.45 (to the nearest 0.05 lb)', T.plannedRate(1260, 1480) === -0.45, String(T.plannedRate(1260, 1480)));
  check('2,400 against 2,900: −1; 3,150 against 2,900: +0.5', T.plannedRate(2400, 2900) === -1 && T.plannedRate(3150, 2900) === 0.5);
  check('no maintenance or no target: null', T.plannedRate(2000, 0) === null && T.plannedRate(0, 2000) === null);
  const n = T.autoTargets({ rateWk: -1, pPerLb: 1, fPerLb: 0.35, floor: 0 }, 1480, 120, { sex: 'f', age: 70 });
  const r = T.plannedRate(n.cal, 1480);
  check('a 70-year-old woman, maintenance 1,480, Setup\'s cut: ' + n.cal + ' plans ' + r + ' lb a week, not −1', r !== -1 && r > -1, J({ cal: n.cal, r }));
}

section('Setup\'s label');
{
  const OB = readSrc('onboarding.js');
  check('the cell under the calories is plannedRate(a.cal, maint), not the goal\'s rate',
    /const pr = plannedRate\(a\.cal, maint\);/.test(OB) && /!pr \? 'maintenance' : \(pr < 0 \? '−' : '\+'\) \+ fmtRate\(Math\.abs\(pr\), a\.units\)/.test(OB) &&
    !/rate === 0 \? 'maintenance' : \(rate < 0 \? '−' : '\+'\) \+ fmtRate\(Math\.abs\(rate\)/.test(OB));
}

section('The goal sheet\'s sentence (Settings → Goal)');
const walk = (n, f, out = []) => { (n.children || []).forEach(c => { if (f(c)) out.push(c); walk(c, f, out); }); return out; };
async function goalSentence(db, pick) {
  resetDb(db);
  const s = fresh();
  const F = await s.load('food.js'), S = await s.load('settings.js');
  await F.initFood();
  document.body.children = [];
  S.openGoal();
  const b = walk(document.body, n => n.dataset && n.dataset.id === pick)[0];
  if (b) b.onclick();
  const notes = walk(document.body, n => typeof n.textContent === 'string' && /^Calories will move|^Your calorie target already/.test(n.textContent));
  return notes.length ? notes[0].textContent : '(no sentence)';
}
{
  const t = await goalSentence({ 'food/targets': { cal: 1480, p: 120, f: 42, maint: 1480, maintSrc: 'pinned', auto: { on: false, rateWk: 0 } },
                                 profile: { sex: 'f', birthYear: 1956 } }, 'cut');
  check('a 70-year-old woman picks Cutting: the gap printed is the one between the two numbers ("minus 222"), not "minus 500"',
    /^Calories will move to 1,258 a day — maintenance 1,480 minus 222/.test(t) && !/minus 500/.test(t), t);
  check('and it says the floors hold it there', /the lowest the floors allow/.test(t), t);
}
{
  const t = await goalSentence({ 'food/targets': { cal: 2250, p: 120, f: 42, maint: 2000, maintSrc: 'pinned', auto: { on: false, rateWk: 0.5 } },
                                 profile: { sex: 'f', birthYear: 2011 } }, 'cut');
  check('a girl of 15 picks Cutting: "… your maintenance: under 18, Rack does not plan a deficit."',
    t === 'Calories will move to 2,000 a day — your maintenance: under 18, Rack does not plan a deficit. Protein and fat stay where they are.', t);
}
{
  const w = {}; for (let i = 0; i < 21; i++) w['w' + i] = { lb: 180, t: new RealDate(Y, M - 1, D - 20 + i, 7).getTime() };
  const t = await goalSentence({ 'food/targets': { cal: 2400, p: 180, f: 63, maint: 2400, maintSrc: 'pinned',
                                                   auto: { on: true, rateWk: 0, pPerLb: 1, fPerLb: 0.35, floor: 0, lastAdj: at(Y, M, D, 8) } },
                                 'weight/entries': w, profile: { sex: 'm', birthYear: 1990 } }, 'cut');
  check('auto on: "Protein and fat follow your weight."', /Protein and fat follow your weight\.$/.test(t) && /minus 500/.test(t), t);
}

done(...cleanups);
