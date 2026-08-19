// Shared body-weight trend + maintenance math.
//
// This used to live entirely inside weight.js. Fuel needs the same maintenance
// number to draw the cut / maintain / gain zones on the calorie bar, and two
// copies of the same arithmetic is exactly how two screens start disagreeing
// with each other. So it lives here, as pure functions over the raw nodes.
//
// Imports nothing but store.js (date keys) and ui.js (number helpers), so it
// can never create a cycle.

import { todayKey } from './store.js';
import { parseKey } from './ui.js';

/* ---------- weight trend ---------- */

export function sortedEntries(entries) {
  return Object.entries(entries || {})
    .map(([id, e]) => ({ id, ...e }))
    .sort((a, b) => a.t - b.t);
}

// mean weight per calendar day
export function dailyMeans(entries) {
  const by = {};
  sortedEntries(entries).forEach(e => {
    const k = todayKey(new Date(e.t));
    (by[k] = by[k] || []).push(e.lb);
  });
  return Object.entries(by)
    .map(([d, lbs]) => ({ d, lb: lbs.reduce((s, x) => s + x, 0) / lbs.length }))
    .sort((a, b) => a.d < b.d ? -1 : 1);
}

// trailing 7-day moving average at each day
export function movingAvg(days) {
  return days.map((pt, i) => {
    const t0 = parseKey(pt.d).getTime() - 6.5 * 864e5;
    const win = days.filter((q, j) => j <= i && parseKey(q.d).getTime() >= t0);
    return { d: pt.d, lb: win.reduce((s, x) => s + x.lb, 0) / win.length };
  });
}

export function windowAvg(days, fromAgo, toAgo) {
  const now = Date.now();
  const win = days.filter(p => {
    const t = parseKey(p.d).getTime();
    return t <= now - toAgo * 864e5 && t > now - fromAgo * 864e5;
  });
  if (win.length < 3) return null;
  return win.reduce((s, x) => s + x.lb, 0) / win.length;
}

export function weightStats(entries) {
  const list = sortedEntries(entries);
  const days = dailyMeans(entries);
  const latest = list[list.length - 1] || null;
  const avg7 = windowAvg(days, 7, 0);
  const prev7 = windowAvg(days, 14, 7);
  const rateWk = avg7 != null && prev7 != null ? avg7 - prev7 : null;
  const d30 = days.filter(p => parseKey(p.d).getTime() > Date.now() - 30 * 864e5);
  const change30 = d30.length >= 2 ? d30[d30.length - 1].lb - d30[0].lb : null;
  return { latest, avg7, rateWk, change30, days };
}

/* ---------- maintenance (TDEE) ----------
   Average logged intake, corrected by which way the scale is moving.
   ~3500 kcal per pound, so a pound a week is ~500 kcal/day.
   Today is excluded — a half-logged day drags the average down. */

export const TDEE_MIN_DAYS = 7;

export function maintenance(weightEntries, daySummaries) {
  const s = weightStats(weightEntries);
  const today = todayKey();
  const calDays = Object.entries(daySummaries || {})
    .filter(([d, v]) => d !== today && v && v.cal > 0)
    .filter(([d]) => parseKey(d).getTime() > Date.now() - 15 * 864e5);

  const out = {
    tdee: null,
    avgIntake: null,
    days: calDays.length,
    rateWk: s.rateWk,
    need: []
  };

  if (calDays.length < TDEE_MIN_DAYS) {
    const n = TDEE_MIN_DAYS - calDays.length;
    out.need.push(n + ' more day' + (n === 1 ? '' : 's') + ' of food logging');
  }
  if (s.rateWk == null) out.need.push('two weeks of weigh-ins');
  if (out.need.length) return out;

  out.avgIntake = calDays.reduce((sum, [, v]) => sum + v.cal, 0) / calDays.length;
  out.tdee = Math.round((out.avgIntake - s.rateWk * 500) / 10) * 10;
  return out;
}

/* ---------- calorie zones ----------
   One maintenance number turns into three bands: under it you're cutting,
   within a collar of it you're holding, over it you're gaining.
   The collar is ~8% of maintenance, clamped so it never gets silly. Roughly
   200 kcal a day either way is under half a pound a week — that really is
   holding, and a narrower band would draw as a sliver you can't read. */

export function calorieZones(maint) {
  if (!maint || maint <= 0) return null;
  const band = Math.min(250, Math.max(150, Math.round(maint * 0.08 / 25) * 25));
  return {
    maint,
    band,
    cutTop: maint - band,      // first tick: top of the deficit
    gainFrom: maint + band     // second tick: gaining past here
  };
}

export function zoneOf(cal, z) {
  if (!z) return null;
  if (cal < z.cutTop) return 'cut';
  if (cal <= z.gainFrom) return 'maintain';
  return 'gain';
}
