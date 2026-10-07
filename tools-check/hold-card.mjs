#!/usr/bin/env node
//
// Verifier for "Maintaining" accounts whose typed target is off the hold plan
// (P5 C3 write side; XR R2, XC X2; DECISION D-VEb, key-free, DECISIONS #12
// option A as the FIX run builds it).
//
//   node tools-check/hold-card.mjs
//
// C3's read side makes a stated rate of 0 final. That would mis-read somebody
// who chose Maintaining at setup and later TYPED a cut: told they are off
// goal while on plan. So:
//
//   - write side: the Daily-targets manual Save drops the stated 0
//     (auto.rateWk: null, which the database stores as absent: "no stated
//     rate") when the stored rate is 0, the typed calories differ from the
//     stored ones, and the new target is off the hold plan by more than 100
//     (food.js holdKept, compared with the STORED maintenance being saved —
//     the measured one in force drifts, and CMB2 measured that rule firing
//     on 21-26 of 30 hold-off people);
//   - existing accounts: a one-time card on Fuel, v40 pattern, no new key:
//     "Still maintaining?" with "I'm cutting" / "I'm bulking" (writes the
//     goal's rate) or "Move target to M" (writes cal = M). Each answer breaks
//     the condition; dismissing writes nothing.
//
// The hold plan M is goalNext('hold')'s by-hand number: max(protein x 4 +
// fat x 9 + 400, the safety floor, maintenance to the nearest ten), so a
// heavy person whose macro floor lifts the hold target over maintenance is
// NOT asked (ORCH-D-VEb-CHECK: the read-side alternative mis-read her as
// bulking on 3,974 of 5,040 opens).
//
// What it proves, booting the REAL food.js against a fake database:
//   - a typed cut 500 under the stored maintenance on { auto: { on: false,
//     rateWk: 0 } }: Save writes no stated rate, and goalDirection reads -1;
//   - a Save at the plan keeps 0; a protein-only Save keeps 0;
//   - the card: false for a macro-floor-held target 30 over the raw
//     maintenance (s5-bigf-hold-off), true for xr-hold-manualcut's shape;
//   - each button's write, and a missing re-read writes nothing;
//   - holdKept's plan is previewGoal('hold')'s number.

import { stage, harness, setNow, at, J, resetDb, fake, readSrc, toasts, clearToasts } from './lib/stage.mjs';

const { check, section, done } = harness('hold-card — a typed cut on a "Maintaining" account stops claiming to be a hold');
const cleanups = [];
setNow(at(2026, 10, 6, 9));
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js'];
const fresh = () => { const s = stage(REAL); cleanups.push(s.cleanup); return s; };
const HOLD = { on: false, rateWk: 0, pPerLb: 1, fPerLb: 0.35, floor: 0 };
const ADULT = { sex: 'f', birthYear: 1986 };
const walk = (n, f, out = []) => { (n.children || []).forEach(c => { if (f(c)) out.push(c); walk(c, f, out); }); return out; };

async function boot(t, prof = ADULT) {
  resetDb({ 'food/targets': t, profile: prof });
  const s = fresh();
  const F = await s.load('food.js'), I = await s.load('insights.js');
  await F.initFood();
  return { F, I };
}
// Open Daily targets in its manual pane, type into the boxes, press Save.
async function manualSave(t, edits) {
  const { F, I } = await boot(t);
  document.body.children = [];
  F.openTargets();
  const fields = walk(document.body, n => n.className === 'field');
  const box = label => { const f = fields.find(x => x.children.some(c => c.tagName === 'LABEL' && c.textContent === label)); return f && f.children.find(c => c.tagName === 'INPUT'); };
  for (const [label, v] of Object.entries(edits)) { const b = box(label); if (b) b.value = String(v); }
  fake.writes.length = 0;
  const save = walk(document.body, n => n.tagName === 'BUTTON' && n.textContent === 'Save')[0];
  await save.onclick();
  const w = fake.writes.filter(x => x.path === 'food/targets').map(x => x.value);
  return { w: w[w.length - 1], I };
}

const F0 = await fresh().load('food.js');
const has = typeof F0.holdKept === 'function' && typeof F0.holdCard === 'function';
check('food.js exports holdKept and holdCard', has);

section('The write side: the manual Save');
{
  const T = { cal: 2500, p: 160, f: 56, maint: 2500, maintSrc: 'pinned', auto: { ...HOLD } };
  const { w, I } = await manualSave(T, { Calories: 2000 });
  check('a typed cut 500 under the stored 2,500: the Save writes no stated rate', w && w.auto && (w.auto.rateWk === null || !('rateWk' in w.auto)) && w.auto.on === false && w.cal === 2000, J(w));
  check('and goalDirection then reads it as a cut (-1)', w && I.goalDirection(w, 2500) === -1, J(w && I.goalDirection(w, 2500)));
}
{
  const T = { cal: 2300, p: 160, f: 56, maint: 2500, maintSrc: 'pinned', auto: { ...HOLD } };
  const { w } = await manualSave(T, { Calories: 2500 });
  check('a Save AT the plan (2,500) keeps the stated 0', w && w.auto.rateWk === 0, J(w));
}
{
  const T = { cal: 2000, p: 160, f: 56, maint: 2500, maintSrc: 'pinned', auto: { ...HOLD } };
  const { w } = await manualSave(T, { 'Protein g': 170 });
  check('a protein-only Save (calories unchanged) keeps the stated 0', w && w.auto.rateWk === 0 && w.p === 170, J(w));
}
{
  const T = { cal: 2500, p: 160, f: 56, maint: null, auto: { ...HOLD } };
  const { w } = await manualSave(T, { Calories: 2000 });
  check('no stored maintenance: nothing to compare with, the 0 is kept', w && w.auto.rateWk === 0, J(w));
}

if (has) {
  section('The card: when it shows');
  const C = (t, who = { sex: 'f', age: 40 }) => F0.holdCard(t, who);
  const cut = C({ cal: 2000, p: 160, f: 56, maint: 2500, auto: { ...HOLD } });
  check('xr-hold-manualcut\'s shape (hold, typed 500 under): the card', !!cut && cut.dir === 'cut' && cut.plan === 2500, J(cut));
  check('its words: "Still maintaining?" / "Your goal says Maintaining, but your target of 2,000 is 500 kcal under 2,500, the target Rack plans for maintaining. Which is it?"',
    cut && cut.eyebrow === 'Still maintaining?' && cut.note === 'Your goal says Maintaining, but your target of 2,000 is 500 kcal under 2,500, the target Rack plans for maintaining. Which is it?', J(cut));
  const big = { cal: 2545, p: 300, f: 105, maint: 2515, auto: { ...HOLD } };
  check('s5-bigf-hold-off: a macro-floor-held target 30 over the raw maintenance — no card', C(big) === null && F0.holdKept(big, 2515, { sex: 'f', age: 40 }) === true, J(C(big)));
  const over = C({ cal: 2900, p: 160, f: 56, maint: 2500, auto: { ...HOLD } });
  check('a typed target 400 over: the card, "I\'m bulking"', !!over && over.dir === 'gain' && /400 kcal over 2,500/.test(over.note), J(over));
  check('within 100 of the plan: no card', C({ cal: 2580, p: 160, f: 56, maint: 2500, auto: { ...HOLD } }) === null);
  check('a target under the safety floor is not asked here (that is the floor question; one at a time)',
    C({ cal: 1100, p: 100, f: 35, maint: 2000, auto: { ...HOLD } }) === null);
  check('auto on, a stated cut, no stored maintenance, no target: no card',
    C({ cal: 2000, p: 160, f: 56, maint: 2500, auto: { ...HOLD, on: true } }) === null && C({ cal: 2000, maint: 2500, auto: { ...HOLD, rateWk: -1 } }) === null &&
    C({ cal: 2000, maint: null, auto: { ...HOLD } }) === null && C({ cal: 0, maint: 2500, auto: { ...HOLD } }) === null);

  section('The card: what each button writes');
  async function answer(t, kind, opts = {}) {
    const { F } = await boot(t);
    if (opts.after) opts.after();
    fake.writes.length = 0; clearToasts();
    await F.answerHoldCard(kind);
    return { w: fake.writes.filter(x => x.path === 'food/targets').map(x => x.value), t: toasts() };
  }
  const T = { cal: 2000, p: 160, f: 56, maint: 2500, maintSrc: 'pinned', goalLb: 150, auto: { ...HOLD } };
  const a1 = await answer(T, 'goal');
  check('"I\'m cutting": auto.rateWk = -1, calories left alone', a1.w.length === 1 && J(a1.w[0]) === J({ ...T, auto: { ...HOLD, rateWk: -1 } }), J(a1.w));
  const To = { ...T, cal: 2900 };
  const a2 = await answer(To, 'goal');
  check('"I\'m bulking": auto.rateWk = +0.5', a2.w.length === 1 && J(a2.w[0]) === J({ ...To, auto: { ...HOLD, rateWk: 0.5 } }), J(a2.w));
  const a3 = await answer(T, 'move');
  check('"Move target to 2,500": cal = 2,500, the stated 0 kept', a3.w.length === 1 && J(a3.w[0]) === J({ ...T, cal: 2500 }), J(a3.w));
  const a4 = await answer(T, 'move', { after: () => fake.db.delete('food/targets') });
  check('a missing re-read writes nothing', a4.w.length === 0 && a4.t.includes('Couldn’t reach your targets — try again in a moment.'), J(a4));

  section('The plan is the Goal sheet\'s hold');
  {
    const t = { cal: 2000, p: 160, f: 56, maint: 2500, maintSrc: 'pinned', auto: { ...HOLD } };
    const { F } = await boot(t);
    const card = F.holdCard(t, { sex: 'f', age: 40 });
    check('holdKept\'s plan is previewGoal(\'hold\')\'s number', card && card.plan === F.previewGoal('hold').cal, J({ card: card && card.plan, pv: F.previewGoal('hold') }));
  }
}

section('Where it is drawn');
check('Fuel draws holdCard(targets, who) under the bar', /holdCard\(targets, who\)/.test(readSrc('food.js')));

done(...cleanups);
