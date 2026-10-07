#!/usr/bin/env node
//
// Verifier for the bound on every COMPUTED calorie target (P5 C1; F02; XC X9).
//
//   node tools-check/computed-limits.mjs
//
// A typed target has always had to sit inside LIMITS.cal (500..15,000). A
// computed one did not: one typo weigh-in on a young account made the Goal
// sheet's target 45,860. goalNext (both branches), the Daily-targets sheet's
// auto preview and its Save now clamp to LIMITS.cal, and the preview's carbs
// are the carbs of the number it shows (XC X9), not of the unclamped one.
//
// What it proves, booting the REAL food.js against a fake database:
//   - maintenance 46,000 (pinned): previewGoal by hand and with auto on
//     both give 15,000;
//   - the sheet's auto preview (pinned 15,000, +2 lb a week, so 16,000
//     unclamped) shows 15,000 and the carbs of 15,000;
//   - its Save writes 15,000.

import { stage, harness, setNow, at, J, resetDb, fake, RealDate, mkEl } from './lib/stage.mjs';

const { check, section, done } = harness('computed-limits — a computed target meets the bound a typed one does');
const cleanups = [];
const Y = 2026, M = 10, D = 6;
setNow(at(Y, M, D, 9));
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js'];
async function boot(t) {
  const w = {}; for (let i = 0; i < 21; i++) w['w' + i] = { lb: 200, t: new RealDate(Y, M - 1, D - 20 + i, 7).getTime() };
  resetDb({ 'food/targets': t, 'weight/entries': w, profile: { sex: 'm', birthYear: 1990 } });
  const s = stage(REAL); cleanups.push(s.cleanup);
  const F = await s.load('food.js'), U = await s.load('ui.js');
  await F.initFood();
  return { F, U };
}
const walk = (n, f, out = []) => { (n.children || []).forEach(c => { if (f(c)) out.push(c); walk(c, f, out); }); return out; };

section('The Goal sheet (goalNext)');
{
  const { F } = await boot({ cal: 3000, p: 200, f: 70, maint: 46000, maintSrc: 'pinned', auto: { on: false, rateWk: -1 } });
  const pv = F.previewGoal('cut');
  check('by hand, maintenance 46,000: 15,000', pv && pv.cal === 15000, J(pv));
}
{
  const { F } = await boot({ cal: 3000, p: 200, f: 70, maint: 46000, maintSrc: 'pinned', auto: { on: true, rateWk: -1, pPerLb: 1, fPerLb: 0.35, floor: 0, lastAdj: at(Y, M, D, 8) } });
  const pv = F.previewGoal('cut');
  check('auto on, maintenance 46,000: 15,000', pv && pv.cal === 15000, J(pv));
}

section('The Daily-targets sheet');
{
  // The sheet's own Save refuses a typed maintenance over 15,000, so here the
  // pinned number is the highest it accepts and the rate (+2 lb a week) does
  // the rest: 15,000 + 1,000 = 16,000 unclamped.
  const T = { cal: 3000, p: 200, f: 70, maint: 15000, maintSrc: 'pinned', auto: { on: true, rateWk: 2, pPerLb: 1, fPerLb: 0.35, floor: 0, lastAdj: at(Y, M, D, 8) } };
  const { F } = await boot(T);
  document.body.children = [];
  F.openTargets();
  const big = walk(document.body, n => String(n.className).split(' ').includes('load-num'))[0];
  check('the auto preview shows 15,000', big && big.textContent === '15,000', J(big && big.textContent));
  const stats = walk(document.body, n => n.className === 'stat');
  const val = lbl => { const st = stats.find(x => x.children.some(c => c.className === 'stat-lbl' && c.textContent === lbl)); return st ? Number(st.children.find(c => String(c.className).includes('stat-val')).textContent) : NaN; };
  const p = val('Protein g'), f = val('Fat g'), c = val('Carbs g');
  check('and its carbs are the carbs of 15,000', Number.isFinite(c) && c === Math.max(0, Math.round((15000 - p * 4 - f * 9) / 4)), J({ p, f, c }));
  const save = walk(document.body, n => n.tagName === 'BUTTON' && n.textContent === 'Save')[0];
  fake.writes.length = 0;
  if (save) await save.onclick();
  const w = fake.writes.filter(x => x.path === 'food/targets').map(x => x.value);
  check('Save writes 15,000', w.length === 1 && w[0].cal === 15000, J(w.map(x => x.cal)));
}
void mkEl;

done(...cleanups);
