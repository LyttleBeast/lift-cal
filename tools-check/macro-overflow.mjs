#!/usr/bin/env node
//
// Verifier for protein and fat that already pass the calorie target (P5 D6;
// F48).
//
//   node tools-check/macro-overflow.mjs
//
// Carbs are the remainder and clamp at 0, so a typed { cal 1,500, p 300,
// f 100 } (2,100 kcal of protein and fat) silently gave a 0 g carb target.
// The Daily-targets manual Save now asks once: "Protein and fat alone come to
// N kcal, more than your M target, so carbs will show 0 g. Save anyway?"
//
// What it proves, booting the REAL food.js and pressing the REAL sheet's
// buttons:
//   - 1,500 / 300 / 100: Save writes nothing and asks, with the numbers;
//   - "Save anyway" then writes the typed numbers;
//   - 2,500 / 180 / 70 (fits): Save writes at once, no question.

import { stage, harness, setNow, at, J, resetDb, fake } from './lib/stage.mjs';

const { check, section, done } = harness('macro-overflow — protein and fat over the calories ask once');
const cleanups = [];
setNow(at(2026, 10, 6, 9));
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js'];
const walk = (n, f, out = []) => { (n.children || []).forEach(c => { if (f(c)) out.push(c); walk(c, f, out); }); return out; };
async function typeAndSave(edits) {
  resetDb({ 'food/targets': { cal: 2400, p: 180, f: 63, maint: 2400, maintSrc: 'pinned', auto: { on: false, rateWk: -1 } } });
  const s = stage(REAL); cleanups.push(s.cleanup);
  const F = await s.load('food.js');
  await F.initFood();
  document.body.children = [];
  F.openTargets();
  const fields = walk(document.body, n => n.className === 'field');
  for (const [label, v] of Object.entries(edits)) {
    const f = fields.find(x => x.children.some(c => c.tagName === 'LABEL' && c.textContent === label));
    f.children.find(c => c.tagName === 'INPUT').value = String(v);
  }
  fake.writes.length = 0;
  await walk(document.body, n => n.tagName === 'BUTTON' && n.textContent === 'Save')[0].onclick();
  return F;
}
const tWrites = () => fake.writes.filter(x => x.path === 'food/targets').map(x => x.value);

section('Protein and fat past the calories');
{
  await typeAndSave({ Calories: 1500, 'Protein g': 300, 'Fat g': 100 });
  check('Save writes nothing yet', tWrites().length === 0, J(tWrites()));
  const want = 'Protein and fat alone come to 2,100 kcal, more than your 1,500 target, so carbs will show 0 g. Save anyway?';
  const said = walk(document.body, n => n.textContent === want);
  check('and asks: "' + want + '"', said.length === 1, J(walk(document.body, n => /Protein and fat alone/.test(n.textContent || '')).map(n => n.textContent)));
  const go = walk(document.body, n => n.tagName === 'BUTTON' && n.textContent === 'Save anyway')[0];
  if (go) { go.onclick(); await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0)); }
  check('"Save anyway" writes the typed numbers', tWrites().length === 1 && tWrites()[0].cal === 1500 && tWrites()[0].p === 300 && tWrites()[0].f === 100, J(tWrites()));
}
section('Numbers that fit');
{
  await typeAndSave({ Calories: 2500, 'Protein g': 180, 'Fat g': 70 });
  check('2,500 / 180 / 70: written at once, no question', tWrites().length === 1 && tWrites()[0].cal === 2500 &&
    walk(document.body, n => /Protein and fat alone/.test(n.textContent || '')).length === 0, J(tWrites()));
}

done(...cleanups);
