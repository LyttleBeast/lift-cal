#!/usr/bin/env node
//
// Verifier for the legacy weight maths' reading of weigh-ins (P5 A9; F39).
//
//   node tools-check/legacy-entries.mjs
//
// tdee.js sortedEntries() fed `lb` straight into sums, so a string lb ("200")
// concatenated: a daily mean of 90,090.5 in the audit's fixture. No writer
// makes one today; an importer one day might, and that would be a wrong
// number on the Weight tab. lb is now coerced with Number() and an entry whose
// lb is not a finite number above 0 is left out. Stored entries are untouched.
//
// What it proves, driving the REAL tdee.js:
//   - { lb: '200' } reads as 200 in dailyMeans and weightStats;
//   - { lb: 0 } and { lb: -5 } are ignored (avg7 is the real readings' mean);
//   - ordinary numeric entries give exactly what they gave before.

import { stage, harness, setNow, at, J, RealDate } from './lib/stage.mjs';

const { check, section, done } = harness('legacy-entries — the legacy weight maths read numbers');
const cleanups = [];
const Y = 2026, M = 10, D = 6;
setNow(at(Y, M, D, 18));   // evening, so today's noon day-point is inside avg7's window
const s = stage(['ui.js', 'units.js', 'weightmodel.js', 'tdee.js']); cleanups.push(s.cleanup);
const T = await s.load('tdee.js');
const t = ago => new RealDate(Y, M - 1, D - ago, 7).getTime();

section('A string lb');
{
  const w = { a: { lb: '200', t: t(2) }, b: { lb: 201, t: t(1) }, c: { lb: '199', t: t(0) } };
  const means = T.dailyMeans(w);
  check('every daily mean is a number', means.every(p => typeof p.lb === 'number'), J(means));
  check('and they are 200, 201, 199', J(means.map(p => p.lb)) === J([200, 201, 199]), J(means.map(p => p.lb)));
  check('weightStats().latest.lb is the number 199', T.weightStats(w).latest.lb === 199, J(T.weightStats(w).latest));
  check('avg7 is 200', Math.abs(T.weightStats(w).avg7 - 200) < 1e-9, J(T.weightStats(w).avg7));
}

section('A zero or negative lb');
{
  const w = { a: { lb: 200, t: t(3) }, b: { lb: 0, t: t(2) }, c: { lb: -5, t: t(1) }, d: { lb: 202, t: t(1) }, e: { lb: 201, t: t(0) } };
  const st = T.weightStats(w);
  check('avg7 is the real readings\' mean, 201', Math.abs(st.avg7 - 201) < 1e-9, J(st.avg7));
  check('no daily mean is 0 or negative', st.days.every(p => p.lb > 0), J(st.days));
  check('sortedEntries leaves them out', T.sortedEntries(w).length === 3, J(T.sortedEntries(w)));
}

section('Ordinary entries: unchanged');
{
  const w = { a: { lb: 200.4, t: t(2) }, b: { lb: 200.0, t: t(1) }, c: { lb: 199.6, t: t(0) } };
  check('sortedEntries keeps every field and the order by time', J(T.sortedEntries(w)) === J([{ id: 'a', lb: 200.4, t: t(2) }, { id: 'b', lb: 200, t: t(1) }, { id: 'c', lb: 199.6, t: t(0) }]), J(T.sortedEntries(w)));
}

done(...cleanups);
