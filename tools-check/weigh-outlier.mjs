#!/usr/bin/env node
//
// Verifier for the outlier screen in front of the trend slope (P5 A3; F19,
// F04's model side).
//
//   node tools-check/weigh-outlier.mjs
//
// A typo as today's reading (185 typed as 85) bent the robust line, because
// Huber down-weights a bad day in the MIDDLE of the window but not one at
// either end. Maintenance moved by hundreds on entry, and by hundreds the
// other way three weeks later as the typo left the window. weightmodel.js now
// screens each day against a repeated-median line first; a day off it by more
// than 5 % of bodyweight is left out of the fit. It stays on the chart.
//
// What it proves, driving the REAL weightmodel.js and tdee.js:
//   - 21 daily readings at 185 with 85 (or 518) as TODAY: maintenance within
//     ±30 of the no-typo value, and trendWeight within 0.3 lb of 185;
//   - the same with the typo 20 days back (the end of the window);
//   - genuine changes are not screened: a real 3 lb refeed today, a 4 % day,
//     a real step down, and a fit with only four day-points (too few to
//     judge) give exactly rack-v62's numbers.

import { stage, stageAt, harness, setNow, at, summariesBefore, J, RealDate } from './lib/stage.mjs';

const { check, section, done } = harness('weigh-outlier — a typo weigh-in does not move maintenance');
const cleanups = [];
const Y = 2026, M = 10, D = 6;
setNow(at(Y, M, D, 9));
const noise = [0.3, -0.4, 0.1, 0.5, -0.2, 0.0, -0.5, 0.4, 0.2, -0.3, 0.1, -0.1, 0.3, -0.4, 0.2, 0.0, -0.2, 0.4, -0.3, 0.1, 0.2, -0.1];

// 22 daily 07:00 readings, index 0 = 21 days ago ... 21 = today.
function series(edit) {
  const list = [];
  for (let i = 0; i < 22; i++) list.push({ lb: 185 + noise[i], t: new RealDate(Y, M - 1, D - 21 + i, 7).getTime() });
  if (edit) edit(list);
  const o = {}; list.forEach((e, i) => { o['w' + i] = e; }); return o;
}
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js'];
async function measure(w, before) {
  // before: rack-v62's weightmodel.js and tdee.js, to show what did NOT change.
  const s = before ? stageAt('590db05', REAL, ['weightmodel.js', 'tdee.js']) : stage(REAL); cleanups.push(s.cleanup);
  const T = await s.load('tdee.js'), tk = (await s.load('store.js')).todayKey;
  const sums = summariesBefore(tk, Y, M, D, 21, 2500);
  await T.refreshModel(w);
  const r = T.maintenance(w, sums);
  return { tdee: r.tdee != null ? r.tdee : r.held, tw: T.trendWeight() };
}

const clean = await measure(series());
section('The clean series (the reference)');
check('the clean series measures about 2,500', Math.abs(clean.tdee - 2500) <= 60, J(clean));

section('A typo as today\'s reading');
for (const typo of [85, 518]) {
  const r = await measure(series(l => { l[21].lb = typo; }));
  check(typo + ' as today: maintenance within ±30 of the clean value', Math.abs(r.tdee - clean.tdee) <= 30, r.tdee + ' vs ' + clean.tdee);
  check(typo + ' as today: trendWeight within 0.3 lb of 185', Math.abs(r.tw - 185) <= 0.3, r.tw && r.tw.toFixed(2));
}

section('A typo twenty days back, at the old end of the window');
for (const typo of [85, 518]) {
  const r = await measure(series(l => { l[1].lb = typo; }));
  check(typo + ' 20 days back: maintenance within ±30 of the clean value', Math.abs(r.tdee - clean.tdee) <= 30, r.tdee + ' vs ' + clean.tdee);
}

section('Genuine changes are not screened: the same numbers as rack-v62');
const same = async (name, edit) => {
  const now = await measure(series(edit)), then = await measure(series(edit), true);
  check(name + ': ' + then.tdee + ', as before', now.tdee === then.tdee && Math.abs(now.tw - then.tw) < 1e-9, J({ now, then }));
};
await same('a real +3 lb refeed today (1.6 % of bodyweight, inside the 5 % line)', l => { l[21].lb += 3; });
await same('a 4 % reading today (still inside the line)', l => { l[21].lb = 185 * 0.96; });
await same('a real step down of 1.5 lb a week', l => l.forEach((e, i) => { e.lb -= i * 1.5 / 7; }));
{
  // Four day-points with a typo among them: too few to judge, nothing dropped.
  const four = () => { const o = {}; [9, 6, 3, 0].forEach((ago, i) => { o['w' + i] = { lb: i === 3 ? 85 : 185, t: new RealDate(Y, M - 1, D - ago, 7).getTime() }; }); return o; };
  const now = await measure(four()), then = await measure(four(), true);
  check('only four day-points (one a typo): too few to judge, the same numbers as before', now.tw === then.tw, J({ now, then }));
}

done(...cleanups);
