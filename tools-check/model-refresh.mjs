#!/usr/bin/env node
//
// Verifier for when the fitted weight model is refitted, and which fit stands
// (P5 A8; F22, F38).
//
//   node tools-check/model-refresh.mjs
//
// refreshModel() skips a refit when nothing changed. "Nothing changed" used to
// mean the same count and the same newest time, so a PWA left open kept a
// model fitted days ago (the trend window and the intake average move with the
// date), and an edited OLD weigh-in was never refitted. Its fingerprint now
// includes today's key and a numeric hash over every (lb, t). And two
// overlapping fits could land out of order, the slower older one last; a
// generation counter now drops a fit that a newer one started after.
//
// What it proves, driving the REAL weightmodel.js:
//   - the same entries with the clock moved past midnight: a refit;
//   - the same count and newest time with one OLD lb edited: a refit;
//   - the same entries the same day: no refit (the cache still works);
//   - two overlapping calls, the first slower: the second's model stands.

import { stage, harness, setNow, at, J, RealDate, fake, resetDb } from './lib/stage.mjs';

const { check, section, done } = harness('model-refresh — a new day or an edited weigh-in refits; the newest fit stands');
const cleanups = [];
const Y = 2026, M = 10, D = 6;
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js'];
const weighIns = (n, endD, lbAt) => { const o = {}; for (let i = 0; i < n; i++) o['w' + i] = { lb: lbAt(i), t: new RealDate(Y, M - 1, endD - (n - 1 - i), 7).getTime() }; return o; };

section('The clock and the data');
{
  setNow(at(Y, M, D, 23, 30));
  const s = stage(REAL); cleanups.push(s.cleanup);
  const W = await s.load('weightmodel.js');
  const w = weighIns(21, D, i => 190 - i * 0.2);
  const m1 = await W.refreshModel(w);
  const m1b = await W.refreshModel(w);
  check('the same entries the same evening: the cached model, no refit', m1b === m1);
  setNow(at(Y, M, D + 1, 0, 30));
  const m2 = await W.refreshModel(w);
  check('the same entries after midnight: refitted', m2 !== m1, 'the cached model was returned');
  const edited = JSON.parse(JSON.stringify(w)); edited.w3.lb += 4;
  const m3 = await W.refreshModel(edited);
  check('one OLD weigh-in edited (same count, same newest time): refitted', m3 !== m2 && m3.rateWk !== m2.rateWk, J({ before: m2.rateWk, after: m3 && m3.rateWk }));
}

section('Two overlapping fits: the newer one stands');
{
  resetDb();
  setNow(at(Y, M, D, 7, 5));
  const s = stage(REAL); cleanups.push(s.cleanup);
  const W = await s.load('weightmodel.js');
  const old = weighIns(21, D - 1, i => 180 + (i % 2) * 0.2);
  let first = true;
  fake.delay = () => (first ? 300 : 5);          // boot: cold reads; later: fast
  const boot = W.refreshModel(old);              // started at boot
  await new Promise(r => setTimeout(r, 20));
  first = false;
  const now = { ...old, wNew: { lb: 176.0, t: at(Y, M, D, 7, 4) } };
  const add = await W.refreshModel(now);         // a weigh-in logged meanwhile
  await boot;
  fake.delay = null;
  const after = W.modelState();
  check('the fit over 22 entries is in force after the slower 21-entry fit resolves',
    after && after.entries.length === 22 && after === add, J({ entries: after && after.entries.length }));
}

done(...cleanups);
