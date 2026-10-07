#!/usr/bin/env node
//
// Verifier for two sentence defects in insights.js (P5 D5; F46 a, c).
//
//   node tools-check/insights-words.mjs
//
//   (a) "Past about 0.68 a week more of it is muscle" — the rate had no unit.
//       It now carries one (labelRate). The sentence's content is D19's and
//       unchanged.
//   (c) The weekly review printed "0 over target" when the week's average
//       was the target. It now says "on target".
//   (b), whether an exact 0 on a cut is "good", is a design call and is left.
//
// What it proves, driving the REAL insights.js:
//   - the faster-than-planned note reads "Past about 1.5 lb a week" in pounds
//     and "Past about 0.68 kg a week" in kilos;
//   - a week averaging exactly the target reads "…a day, on target" and
//     never "0 over target"; 30 over still reads "30 over target".

import { stage, harness, setNow, at, J } from './lib/stage.mjs';

const { check, section, done } = harness('insights-words — a rate with its unit, and "on target"');
const cleanups = [];
setNow(at(2026, 10, 6, 18));
const s = stage(['ui.js', 'units.js', 'insights.js']); cleanups.push(s.cleanup);
const I = await s.load('insights.js');
const keys = I.keysBack(14, 0);

section('(a) the unit');
for (const [u, want] of [['lb', 'Past about 1.5 lb a week'], ['kg', 'Past about 0.68 kg a week']]) {
  const ctx = { dir: -1, rate: { rateWk: -3, model: true }, tw: 200, wmap: Object.fromEntries(keys.map(k => [k, 200])), summaries: {}, sessions: [],
                targets: { cal: 2200, p: 180, f: 70, auto: { on: true, rateWk: -1 } }, stepDays: {}, days: keys.map(d => ({ d, lb: 200 })), u };
  const a = I.assess(ctx);
  const f = a.insights.find(x => x.id === 'pace-fast');
  check(u + ': "' + want + '"', f && f.detail.includes(want + ' more of it is muscle'), J(f && f.detail));
}

section('(c) "on target"');
const review = (avg) => {
  const sums = {}; I.keysBack(7, 1).forEach(k => { sums[k] = { cal: avg, p: 180 }; });
  const ctx = { dir: -1, rate: null, tw: null, wmap: {}, summaries: sums, sessions: null, stepDays: {}, u: 'lb',
                targets: { cal: 2200, p: 180, f: 70 }, days: [] };
  const r = I.weeklyReview(ctx);
  const it = (r.items || r).find ? (r.items || r).find(x => x.label === 'Calories') : null;
  return it && it.text;
};
{
  const t = review(2200);
  check('a week at exactly 2,200 against 2,200: "2,200 a day, on target."', t === '2,200 a day, on target.', J(t));
  check('never "0 over target"', !/\b0 over target/.test(t || ''), J(t));
  check('30 over still says "30 over target"', /^2,230 a day, 30 over target\.$/.test(review(2230) || ''), J(review(2230)));
}

done(...cleanups);
