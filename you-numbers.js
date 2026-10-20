// You's four number tiles — calories and protein against their targets,
// sessions, and steps (the October 2026 redesign, Option A).
//
// NOT A NEW READING OF THE LOG. Each number is one the cards behind the rows
// already print, worked out by their rule, so the tile and the card it
// summarises can never disagree:
//
//   calories, protein  the Fuel card's: the average over the last seven
//                      COMPLETE days that have food on them (today left out —
//                      a day still being eaten reads as a deficit you did not
//                      run), calories "on target" within 4%, protein on it
//                      from 95%
//   sessions           the week card's: finished sessions in the rolling seven
//                      days, against the seven before
//   steps              the week card's: the average over the days with a total,
//                      this seven days against the seven before
//
// Pure over the state object you.js hands it; returns what to print and draws
// nothing. Every weight here is untouched — none of the four is a weight, so
// there is no unit to convert. Kept apart from you.js so a verifier can hold
// each rule to its card (tools-check/you-structure.mjs) and so rack-mobile's
// src/ui/you/numbers.js, which this was taken from, can be compared line for
// line.

import { keysBack } from './insights.js';

const fmtInt = v => Math.round(v).toLocaleString();
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + fmtInt(Math.abs(n));

// Coerces and drops anything that isn't a real number before it averages — one
// string or null in a node written by an older build must not print NaN on the
// screen the app opens on.
function mean(xs) {
  const v = xs.map(Number).filter(Number.isFinite);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}
const meanBy = (keys, pick) => mean(keys.map(pick).filter(v => v != null && Number.isFinite(v)));

function sessionsIn(sessions, keys) {
  const set = new Set(keys);
  return (sessions || []).filter(s => s && set.has(s._date));
}

export function weekNumbers(st) {
  const s = st || {};
  const { targets, summaries = {}, stepDays = {}, sessions, loaded } = s;

  const wk = keysBack(7, 1);
  const logged = wk.filter(k => summaries[k] && summaries[k].cal > 0);
  const avg = key => (logged.length ? mean(logged.map(k => summaries[k][key] || 0)) : null);
  const hasT = !!(targets && targets.cal > 0);

  /* calories */
  let cal;
  if (!loaded) cal = { value: '…', note: '…' };
  else {
    const a = avg('cal');
    let note;
    if (!hasT) note = 'No daily target yet';
    else if (a == null) note = 'Target ' + fmtInt(targets.cal) + ' · nothing logged';
    else {
      const diff = a - targets.cal;
      note = 'Target ' + fmtInt(targets.cal) + ' · ' +
        (Math.abs(diff) <= targets.cal * 0.04 ? 'on target' : fmtInt(Math.abs(diff)) + (diff < 0 ? ' under' : ' over'));
    }
    cal = { value: a == null ? '–' : fmtInt(a), unit: a == null ? null : 'kcal', note };
  }

  /* protein */
  let prot;
  if (!loaded) prot = { value: '…', note: '…' };
  else {
    const a = avg('p');
    const tp = hasT ? Math.round(targets.p || 0) : 0;
    let note;
    if (!(tp > 0)) note = 'No protein target yet';
    else if (a == null) note = 'Target ' + fmtInt(tp) + ' · nothing logged';
    else note = 'Target ' + fmtInt(tp) + ' · ' + (a / tp >= 0.95 ? 'on it' : fmtInt(tp - a) + ' g short');
    prot = { value: a == null ? '–' : fmtInt(a), unit: a == null ? null : 'g', note };
  }

  /* sessions — null is "still reading", [] is "none" */
  let sess;
  if (sessions === null || sessions === undefined) sess = { value: '…', note: '…' };
  else {
    const now = sessionsIn(sessions, keysBack(7, 0)), prev = sessionsIn(sessions, keysBack(7, 7));
    const d = now.length - prev.length;
    sess = { value: String(now.length),
             note: 'Last 7 days · ' + (d === 0 ? 'same as before' : Math.abs(d) + (d > 0 ? ' more' : ' fewer') + ' than before') };
  }

  /* steps */
  let steps;
  if (!loaded) steps = { value: '…', note: '…' };
  else {
    const on = k => { const x = stepDays[k]; return x && x.steps > 0 ? x.steps : null; };
    const a = meanBy(keysBack(7, 0), on), b = meanBy(keysBack(7, 7), on);
    steps = { value: a == null ? '–' : fmtInt(a),
              note: a == null ? 'Nothing in 7 days' : 'Last 7 days' + (b != null ? ' · ' + signed(Math.round(a - b)) : '') };
  }

  return [
    { id: 'cal',   label: 'Calories / day', ...cal },
    { id: 'prot',  label: 'Protein / day',  ...prot },
    { id: 'sess',  label: 'Sessions',       ...sess },
    { id: 'steps', label: 'Steps / day',    ...steps }
  ];
}
