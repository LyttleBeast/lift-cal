#!/usr/bin/env node
//
// Verifier for the card line's character budget (rack-v77).
//
//   node tools-check/card-fit.mjs
//
// The Coach card draws its line in two lines at most. The native port
// measured every card-eligible line in its own card arithmetic (coach-view.js
// cardLayout() + textLines(), Archivo's advances) on a 320-point phone at an
// accessibility text size — native caps card text at 1.6×, so every
// accessibility size is one box, 258 points wide at 22.4 — and five lines ran
// to three, which iOS ends with "…" (PORT-V71-REPORT.md §5). v77 measured
// every rendering this file makes (2,227 lines) the same way: the longest that
// fitted was 47 characters, the shortest that did not was 45 (hype_week_best,
// which the report's sweep never drew), and nothing of 44 or fewer ran over.
// A count of characters is not a width, so the budget is the largest count
// with no overlap: coach.js CARD_LINE_CHARS, 44. This file holds every line
// THE WORDS FIX to it: the pools' rows, the warm lines, the card states, the
// hype lines that carry no lift name, and coach-ui.js's half-loaded line.
// Native's port of it should also measure each line in Archivo, which is the
// authority; this is the fence for the words.
//
// What it does not hold, on purpose: a line whose length is a lift's name
// (the finish line, hype_pr, hype_e1rm_trend, hype_holding_cut,
// hype_target_progress). A name is never cut; finishCard() here and native's
// finishFit() move the evidence to the reason line instead.
//
// Every line is RENDERED through the real tables over a sweep of the values
// it can be drawn with, so a row added to a pool tomorrow is held the day it
// lands, with no list here to forget.
//
//   A  the budget        exported, and the number the measurement gave
//   B  the pools         BACK_LINES, REST_LINES, WARM, every view the card draws
//   C  the card states   the blocked and fall-through responses
//   D  the hype lines    every one with no lift name, over its numbers
//   E  coach-ui.js       the half-loaded line, read out of the source
//   F  the v77 rewrites  the new words, literal by literal, and the old gone

import { stage, harness, J, readSrc } from './lib/stage.mjs';

const { check, section, done } = harness('coach.js CARD_LINE_CHARS — every card line the words fix fits two lines at 320 points (v77)');
const st = stage(['analytics.js', 'exercises.js', 'ui.js', 'units.js', 'coach-tags.js', 'coach-goal.js', 'coach-ramp.js', 'coach-ask.js',
  'coach-prog.js', 'coach-build.js', 'coach-live.js', 'coach-overlap.js', 'coach-ready.js', 'coach-fuel.js', 'coach-volume.js', 'coach.js', 'blocks.js']);
const C = await st.load('coach.js');
const B = C.CARD_LINE_CHARS;
const over = list => list.filter(x => [...x.text].length > B);
const show = list => over(list).map(x => x.id + ' (' + [...x.text].length + '): ' + x.text).join(' | ');
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const DAY = 864e5;
// A week of days, so every weekday name is rendered.
const WEEK = range(0, 6).map(i => new Date(2026, 9, 18 + i, 9, 0).getTime());
const dayKey = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };

section('A. the budget');
{
  check('coach.js exports CARD_LINE_CHARS, a positive integer', Number.isInteger(B) && B > 0, J(B));
  check('it is 44: the largest count with no line measured over two lines at 320 points (45 ran over, 47 fitted)', B === 44, J(B));
}

/* Render every row of a pool over every view, keeping what its gate lets
   through and what renders — exactly what pickLine() walks. */
function rows(pool, views, units) {
  const out = [], seen = new Set();
  for (const row of pool) for (const v of views) for (const u of units) {
    let ok = false, text = '';
    try { ok = row.gate ? !!row.gate(v) : true; } catch { ok = false; }
    if (!ok) continue;
    try { text = String(row.text(v, u) || ''); } catch { text = ''; }
    if (!text || seen.has(row.id + text)) continue;
    seen.add(row.id + text);
    out.push({ id: row.id, text });
  }
  return out;
}

section('B. the pools the card\'s warm slot draws from');
{
  const backViews = [];
  for (const n of range(12, 400)) for (const trained of [false, true]) for (const priorGap of [false, true]) backViews.push({ n, trained, priorGap });
  const back = rows(C.BACK_LINES, backViews, ['lb', 'kg']);
  check('BACK_LINES renders on the card', back.length >= C.BACK_LINES.length, back.length);
  check('every BACK_LINES row, away 12 to 400 days, before and after the session back, is ' + B + ' characters or fewer',
        over(back).length === 0, show(back));

  const restViews = [];
  for (const call of ['rest', 'lighter']) for (const streak of range(0, 30)) restViews.push({ call, streak });
  const rest = rows(C.REST_LINES, restViews, ['lb', 'kg']);
  check('REST_LINES renders on the card', rest.length >= C.REST_LINES.length, rest.length);
  check('every REST_LINES row, rest or lighter, a run of 0 to 30 days, is ' + B + ' characters or fewer', over(rest).length === 0, show(rest));

  const warm = rows(C.WARM, WEEK.map(now => ({ now })), ['lb']);
  check('WARM renders all seven weekdays', warm.length >= C.WARM.length, warm.length);
  check('every WARM line, every weekday, is ' + B + ' characters or fewer', over(warm).length === 0, show(warm));
}

section('C. the card states');
{
  const R = C.RESPONSES;
  const ids = ['resp_log_unreadable', 'resp_first_run', 'resp_live_session', 'resp_state_thin', 'resp_state_clear', 'resp_state_locked'];
  check('every card state has a response', ids.every(id => R[id] && typeof R[id].text === 'function'), ids.filter(id => !R[id]).join(','));
  const out = [];
  for (const id of ids) for (const n of range(0, 50)) {
    const d = { f: k => (k === 'session.count' ? n : null), lockedCount: n || 1 };
    try { out.push({ id, text: String(R[id].text(d, 'lb') || '') }); } catch { /* a state that cannot render is not drawn */ }
  }
  check('the card states render', out.length >= ids.length, out.length);
  check('every card state, 0 to 50 sessions and 1 to 50 locked findings, is ' + B + ' characters or fewer', over(out).length === 0, show(out));
}

section('D. the hype lines that carry no lift name');
{
  const NAMED = new Set(['hype_finish', 'hype_pr', 'hype_e1rm_trend', 'hype_holding_cut', 'hype_target_progress']);
  const mine = C.HYPE.filter(h => !NAMED.has(h.id));
  check('the named exceptions are real hype ids, and the rest is the larger part',
        [...NAMED].every(id => C.HYPE.some(h => h.id === id)) && mine.length >= 7, mine.map(h => h.id).join(','));
  const facts = [];
  for (const n of range(1, 400)) for (const now of WEEK) {
    const date = dayKey(now - 3 * DAY);
    for (const rate of [0.25, 0.5, 1, 1.5, 2]) for (const sign of [1, -1]) facts.push({
      now,
      'session.weekBest': { n: Math.min(n, 21), prev: [] },
      'session.targetsMet': { n: 3, met: 3, daysAgo: n % 4, date },
      'weight.rateWk': sign * rate, 'weight.goalRateWk': sign * rate,
      'fuel.proteinStreak': n, 'fuel.proteinTarget': 180, 'fuel.loggingStreak': n,
      'session.back': { daysAgo: 0, gap: 12 + n }, 'session.milestone': { n },
      'session.streak': Math.min(n, 60), 'session.usualRun': null
    });
  }
  const out = [], seen = new Set();
  for (const h of mine) for (const F of facts) for (const u of ['lb', 'kg']) {
    const d = { now: F.now, f: k => F[k], input: { settings: {} } };
    let text = '';
    try { text = String(h.text(d, u) || ''); } catch { continue; }
    if (!text || seen.has(h.id + text)) continue;
    seen.add(h.id + text); out.push({ id: h.id, text });
  }
  check('each of them renders', mine.every(h => out.some(x => x.id === h.id)), mine.filter(h => !out.some(x => x.id === h.id)).map(h => h.id).join(','));
  check('every one, over its numbers in both units, is ' + B + ' characters or fewer', over(out).length === 0, show(out));
}

section('E. coach-ui.js — the half-loaded line');
{
  const UI = readSrc('coach-ui.js');
  const m = /if \(!coachReady\(\)[^\n]*\n\s*view = \{[^}]*?text: '([^']+)'/.exec(UI);
  check('the half-loaded substitution is found in coach-ui.js', !!m);
  const t = m ? m[1] : '';
  check('it is ' + B + ' characters or fewer', !!t && [...t].length <= B, [...t].length + ': ' + t);
}

section('F. the v77 rewrites');
{
  const byId = (pool, id) => (pool.find(r => r.id === id) || {});
  const text = (pool, id, v) => { try { return byId(pool, id).text(v, 'lb'); } catch { return null; } };
  const NEW = {
    back_time_off: 'Time off is part of training. I know that.',
    back_here: 'Whatever the break was for, you’re here now.',
    back_rested: 'Your groups are fully rested. A good start.',
    back_before: 'You came back from a gap like this before.',
    back_first: 'The first one back reads as a first session.'
  };
  for (const [id, want] of Object.entries(NEW)) {
    check(id + ' says "' + want + '"', text(C.BACK_LINES, id, { n: 14, trained: false, priorGap: true }) === want,
          J(text(C.BACK_LINES, id, { n: 14, trained: false, priorGap: true })));
  }
  const gates = { back_time_off: [true, true], back_here: [true, true], back_rested: [true, false], back_before: [false, false], back_first: [true, false] };
  for (const [id, [beforeNoGap, afterNoGap]] of Object.entries(gates)) {
    const g = byId(C.BACK_LINES, id).gate;
    check(id + '\'s gate is what it was', !!g && g({ n: 14, trained: false, priorGap: false }) === beforeNoGap &&
          g({ n: 14, trained: true, priorGap: false }) === afterNoGap && g({ n: 14, trained: false, priorGap: true }) === true);
  }
  const REST = {
    rest_three: ['Three in a row. A rest day is well earned.', { call: 'rest', streak: 3 }],
    rest_asking: ['Nothing in your log asks for training today.', { call: 'rest', streak: 0 }]
  };
  for (const [id, [want, v]] of Object.entries(REST)) check(id + ' says "' + want + '"', text(C.REST_LINES, id, v) === want, J(text(C.REST_LINES, id, v)));
  check('back_page says "A fresh page. The old ones are all there."',
        text(C.BACK_LINES, 'back_page', { n: 14, trained: false, priorGap: false }) === 'A fresh page. The old ones are all there.');
  const H = id => C.HYPE.find(h => h.id === id);
  const hd = F => ({ now: 0, f: k => F[k], input: { settings: {} } });
  check('hype_week_best says "5 sessions in seven days, a five-week high."',
        H('hype_week_best').text(hd({ 'session.weekBest': { n: 5, prev: [2, 3, 3, 4] } })) === '5 sessions in seven days, a five-week high.');
  check('hype_recovery keeps decision #16\'s sentence: "Three days on. A rest day is well earned." and "12 days on. …"',
        H('hype_recovery').text(hd({ 'session.streak': 3 })) === 'Three days on. A rest day is well earned.' &&
        H('hype_recovery').text(hd({ 'session.streak': 12 })) === '12 days on. A rest day is well earned.');
  const UI = readSrc('coach-ui.js'), CO = readSrc('coach.js');
  check('the half-loaded line says "Training is in. Food and weight are loading."',
        UI.includes("text: 'Training is in. Food and weight are loading.',"));
  const OLD = ['Time off is part of training. The log knows that.', 'Whatever the break was for, it’s over, and you’re here.',
               'Your groups are fully rested. A good starting point.', 'You’ve come back from a gap before. It’s in the log.',
               'The first session back reads as a first session.', 'Your training is in. Food and weight have not landed yet.',
               'A fresh page, and the old ones are all there.', 'Three days straight. A rest day is well earned.',
               'Nothing in your log asks for a session today.', ' sessions in seven days, most in five weeks.',
               ' straight days. A rest day is well earned.'];
  check('none of the eleven old sentences is left in coach.js or coach-ui.js', OLD.every(s => !CO.includes(s) && !UI.includes(s)),
        OLD.filter(s => CO.includes(s) || UI.includes(s)).join(' | '));
}

done(st.cleanup);
