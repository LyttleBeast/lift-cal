#!/usr/bin/env node
//
// Verifier for the order Fuel writes and assigns its targets in, and for a
// malformed targets node (P5 D3 F40, D4 F41).
//
//   node tools-check/targets-write-order.mjs
//
// D3. setGoal and the Daily-targets sheet's two Saves assigned the module's
// `targets` BEFORE the write, so a refused write left the screen painting a
// target the database never took (a refused setGoal('cut') painted 1,900 /
// cut while the node stayed 2,400 / hold). They now build `next`, await the
// write, then assign — native's order.
// D4. A node without a finite cal > 0 and a finite p (hand-edited, half
// written) is treated as absent instead of being used: one without `cal`
// showed carbs NaN. With B3's guard, nothing writes defaults the person
// never set.
//
// What it proves, booting the REAL food.js against a fake database whose
// writes can be refused:
//   - a refused setGoal('cut') leaves foodTargets() at the stored values;
//   - a refused manual Save and a refused auto Save do the same;
//   - a node { p: 150 } (no cal) is treated as no targets: the defaults
//     stand, nothing is NaN, and nothing is written.

import { stage, harness, setNow, at, J, resetDb, fake, RealDate } from './lib/stage.mjs';

const { check, section, done } = harness('targets-write-order — write, then assign; a malformed node is no targets');
const cleanups = [];
const Y = 2026, M = 10, D = 6;
setNow(at(Y, M, D, 9));
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js'];
const walk = (n, f, out = []) => { (n.children || []).forEach(c => { if (f(c)) out.push(c); walk(c, f, out); }); return out; };
const STORED = { cal: 2400, p: 180, f: 63, maint: 2400, maintSrc: 'pinned', auto: { on: false, rateWk: 0, pPerLb: 1, fPerLb: 0.35, floor: 0 } };
async function boot(t, extra = {}) {
  resetDb({ 'food/targets': t, ...extra });
  const s = stage(REAL); cleanups.push(s.cleanup);
  const F = await s.load('food.js');
  await F.initFood();
  return F;
}

section('D3: a refused write leaves the screen at what the database holds');
{
  const F = await boot(STORED);
  fake.refuse = true;
  try { await F.setGoal('cut'); } catch { /* write() rejects; the screen must not have moved */ }
  fake.refuse = false;
  check('setGoal(\'cut\') refused: foodTargets() is still 2,400 / hold', F.foodTargets().cal === 2400 && F.goalId() === 'hold', J({ cal: F.foodTargets().cal, goal: F.goalId() }));
}
async function sheetSave(F, mode, edits) {
  document.body.children = [];
  F.openTargets();
  if (mode === 'auto') { const seg = walk(document.body, n => n.tagName === 'BUTTON' && n.textContent === 'Follow my weight')[0]; if (seg) seg.onclick(); }
  const fields = walk(document.body, n => n.className === 'field');
  for (const [label, v] of Object.entries(edits)) {
    const f = fields.find(x => x.children.some(c => c.tagName === 'LABEL' && c.textContent === label));
    const b = f && f.children.find(c => c.tagName === 'INPUT'); if (b) b.value = String(v);
  }
  fake.refuse = true;
  const save = walk(document.body, n => n.tagName === 'BUTTON' && n.textContent === 'Save')[0];
  try { await save.onclick(); } catch { /* refused */ }
  fake.refuse = false;
}
{
  const F = await boot(STORED);
  await sheetSave(F, 'manual', { Calories: 2000 });
  check('a refused manual Save: still 2,400', F.foodTargets().cal === 2400, J(F.foodTargets()));
}
{
  const w = {}; for (let i = 0; i < 21; i++) w['w' + i] = { lb: 180, t: new RealDate(Y, M - 1, D - 20 + i, 7).getTime() };
  const F = await boot(STORED, { 'weight/entries': w });
  await sheetSave(F, 'auto', { 'Goal lb / week': -1 });
  check('a refused auto Save: still 2,400, auto still off', F.foodTargets().cal === 2400 && F.foodTargets().auto.on === false, J(F.foodTargets()));
}

section('D4: a malformed node is no targets');
{
  const F = await boot({ p: 150, auto: { on: true, rateWk: -1, pPerLb: 1, fPerLb: 0.35, floor: 0, lastAdj: 0 } });
  const t = F.foodTargets();
  check('{ p: 150 } (no cal): not used — the defaults stand, with a real calorie number', Number.isFinite(t.cal) && t.cal > 0 && t.p !== 150, J(t));
  check('nothing on it is NaN (carbs come out a number)', Number.isFinite((t.cal - t.p * 4 - t.f * 9) / 4), J(t));
  check('and nothing was written', fake.writes.filter(x => x.path === 'food/targets').length === 0, J(fake.writes));
}
{
  const F = await boot({ cal: 'abc', p: 150 });
  check('a non-number cal is not used either', Number.isFinite(F.foodTargets().cal) && F.foodTargets().cal > 0, J(F.foodTargets()));
}

done(...cleanups);
