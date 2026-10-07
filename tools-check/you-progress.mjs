#!/usr/bin/env node
//
// Verifier for the You tab's goal progress (P5 D2; F29).
//
//   node tools-check/you-progress.mjs
//
// Progress toward a goal weight was (start - trend) / (start - goal), with the
// START the first RAW daily mean and the TREND the model's normalised weight:
// two different series. A flat 200 lb with a goal of 180 read "4 % there" for
// a morning weigher and "12 %" for an evening one, from nothing. insights.js
// trajectory now measures progress from the first NORMALISED day when the
// model is in use (ctx.adjDays, which you.js safeAssess passes from
// adjustedDays()); the printed start (the first recorded daily average) is
// unchanged.
//
// What it proves, driving the REAL insights.js:
//   - a flat weight, raw readings 2.5 lb heavy in the evening, normalised
//     200: progress is within 2 % of 0 for an evening weigher (it was 11 %),
//     and the printed start is still the raw 202.5;
//   - with no model (no adjDays), progress is as before;
//   - you.js passes adjustedDays() to assess.

import { stage, harness, setNow, at, J, readSrc } from './lib/stage.mjs';

const { check, section, done } = harness('you-progress — goal progress from one series');
const cleanups = [];
setNow(at(2026, 10, 6, 18));
const s = stage(['ui.js', 'units.js', 'insights.js']); cleanups.push(s.cleanup);
const I = await s.load('insights.js');
const keys = I.keysBack(21, 0);
const ctx = (raw, adj) => ({
  dir: -1, rate: { rateWk: 0, model: true }, tw: 200, wmap: Object.fromEntries(keys.map(k => [k, raw])),
  summaries: {}, sessions: [], stepDays: {}, u: 'lb',
  targets: { cal: 2200, p: 180, f: 70, goalLb: 180, auto: { on: false, rateWk: -1 } },
  days: keys.map(d => ({ d, lb: raw })), ...(adj ? { adjDays: keys.map(d => ({ d, lb: adj })) } : {})
});

section('A flat 200 lb, goal 180');
{
  const eve = I.trajectory(ctx(202.5, 200), 0, -1, 200);
  check('an evening weigher (raw 202.5, normalised 200): progress within 2 % of 0', eve && Math.abs(eve.progress) <= 0.02, J(eve && eve.progress));
  check('and the printed start is still the first recorded daily average, 202.5', eve && eve.start === 202.5, J(eve && eve.start));
  const morn = I.trajectory(ctx(200.8, 200), 0, -1, 200);
  check('a morning weigher (raw 200.8): within 2 % of 0 too', morn && Math.abs(morn.progress) <= 0.02, J(morn && morn.progress));
}
section('No model');
{
  const c = ctx(202.5, null); c.rate = { rateWk: 0, model: false };
  const t = I.trajectory(c, 0, -1, 200);
  check('without the model the start series is the only one: (202.5 - 200) / 22.5, as before', t && Math.abs(t.progress - 2.5 / 22.5) < 1e-9, J(t && t.progress));
}
section('The You tab passes the normalised days');
check('you.js safeAssess passes adjDays: adjustedDays()', /adjDays: adjustedDays\(\)/.test(readSrc('you.js')));

done(...cleanups);
