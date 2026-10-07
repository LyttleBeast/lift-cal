#!/usr/bin/env node
//
// Verifier for which within-day pairs train the gut-content coefficients
// (P5 A4; F37).
//
//   node tools-check/weigh-pairgap.mjs
//
// bK and bW are fitted on two weigh-ins from the same day (weightmodel.js,
// "the one thing to not simplify later"). Stepping off the scale and back on a
// minute later makes a "pair" that carries scale noise and no gut content,
// and thirty of them passed the learned gate. weightmodel.js now skips a pair
// closer than MIN_PAIR_GAP (30 minutes), and a day with no pair left does not
// count toward pairDays.
//
// What it proves, driving the REAL weightmodel.js:
//   - 40 days of doubled readings one minute apart: coef.learned is false and
//     no pair is counted;
//   - the same days with the second reading two hours later: learned.

import { stage, harness, setNow, at, J, RealDate } from './lib/stage.mjs';

const { check, section, done } = harness('weigh-pairgap — two readings minutes apart are one reading twice');
const cleanups = [];
const Y = 2026, M = 10, D = 6;
setNow(at(Y, M, D, 21));

async function coefFor(gapMs) {
  const s = stage(['ui.js', 'units.js', 'weightmodel.js', 'tdee.js']); cleanups.push(s.cleanup);
  const W = await s.load('weightmodel.js');
  const w = {};
  for (let i = 0; i < 40; i++) {
    const t = new RealDate(Y, M - 1, D - 39 + i, 7).getTime();
    w['a' + i] = { lb: 185 + (i % 3) * 0.1, t };
    w['b' + i] = { lb: 185.2 + (i % 2) * 0.1, t: t + gapMs };
  }
  const m = await W.refreshModel(w);
  return m && m.coef;
}

section('Doubled readings one minute apart');
{
  const c = await coefFor(60000);
  check('the coefficients are not "learned"', c && c.learned === false, J(c));
  check('and no pair was counted', c && c.pairs === 0 && c.pairDays === 0, J(c && { pairs: c.pairs, pairDays: c.pairDays }));
}

section('The same with the second reading two hours later');
{
  const c = await coefFor(2 * 3600e3);
  check('learned: 40 pairs over 40 days', c && c.learned === true && c.pairs === 40 && c.pairDays === 40, J(c));
}

done(...cleanups);
