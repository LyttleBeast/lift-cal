#!/usr/bin/env node
//
// Verifier for what the trend's SPAN and its newest point are read off (P5 A3).
//
//   node tools-check/span-screened.mjs
//
// The measured-maintenance gate (tdee.js, two weeks of weigh-ins), the stale
// rule (no number past STALE_DAYS since the newest weigh-in) and Coach's
// two-week energy read all ask how long the trend has been watched and how old
// its newest point is. Both are read off the points the slope was FITTED to,
// after the outlier screen, so a typo'd day neither stretches the span nor
// freshens the edge.
//
// What it proves, driving the REAL weightmodel.js:
//   - 15 clean daily readings: the span is 14 days and the newest point is
//     today;
//   - a typo on the NEWEST day: the span is the genuine days' 13 and the
//     newest fitted point is yesterday, and trendAge counts from there;
//   - a typo on the OLDEST day: the span is the genuine days' 13 and the
//     newest point is still today.

import { stage, harness, setNow, at, J, RealDate } from './lib/stage.mjs';

const { check, section, done } = harness('span-screened — span and newest point come from the screened points');
const cleanups = [];
const Y = 2026, M = 10, D = 6;
setNow(at(Y, M, D, 9));

function series(edit) {
  const list = [];
  for (let i = 0; i < 15; i++) list.push({ lb: 185 + (i % 3) * 0.2, t: new RealDate(Y, M - 1, D - 14 + i, 7).getTime() });
  if (edit) edit(list);
  const o = {}; list.forEach((e, i) => { o['w' + i] = e; }); return o;
}
async function fit(w) {
  const s = stage(['ui.js', 'units.js', 'weightmodel.js', 'tdee.js']); cleanups.push(s.cleanup);
  const W = await s.load('weightmodel.js'), tk = (await s.load('store.js')).todayKey;
  const m = await W.refreshModel(w);
  return { m, W, tk };
}

section('Clean readings');
{
  const { m, tk } = await fit(series());
  check('the span is 14 days', m && Math.round(m.trendSpan) === 14 && m.trendSpanDays === 14, J(m && { trendSpan: m.trendSpan, trendSpanDays: m.trendSpanDays }));
  check('the newest fitted point is today', m && m.trendLastKey === tk(), J(m && m.trendLastKey));
}

section('A typo on the newest day (85 for 185)');
{
  const { m, tk, W } = await fit(series(l => { l[14].lb = 85; }));
  check('the span is the genuine days\', 13', m && Math.round(m.trendSpan) === 13 && m.trendSpanDays === 13, J(m && { trendSpan: m.trendSpan, trendSpanDays: m.trendSpanDays }));
  check('the newest fitted point is yesterday', m && m.trendLastKey === tk(new RealDate(Y, M - 1, D - 1, 12)), J(m && m.trendLastKey));
  check('and trendLastX sits on that same day', m && m.trendLastX != null && Math.abs(m.trendLastX * 864e5 - new RealDate(Y, M - 1, D - 1, 12).getTime()) < 1, J(m && m.trendLastX));
  check('the typo still counts as a reading on the chart (adjustedDays keeps it)', m && m.daily.length === 15, J(m && m.daily.length));
  // A2: the age is measured to the newest GENUINE day, so a typo cannot freshen it.
  const sums = {}; for (let i = 1; i <= 10; i++) sums[tk(new RealDate(Y, M - 1, D - i, 12))] = { cal: 2400 };
  const r = W.maintenanceFromModel(sums);
  check('trendAge is measured to that newest genuine day: 1', r && r.trendAge === 1, J(r && r.trendAge));
}

section('A typo on the oldest day');
{
  const { m, tk } = await fit(series(l => { l[0].lb = 85; }));
  check('the span is the genuine days\', 13', m && Math.round(m.trendSpan) === 13 && m.trendSpanDays === 13, J(m && { trendSpan: m.trendSpan, trendSpanDays: m.trendSpanDays }));
  check('the newest fitted point is still today', m && m.trendLastKey === tk(), J(m && m.trendLastKey));
}

done(...cleanups);
