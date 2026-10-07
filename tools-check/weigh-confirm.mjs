#!/usr/bin/env node
//
// Verifier for the one question a far-off weigh-in gets (P5 C4; F04; VB rule
// R2; DECISIONS-FOR-MICAH #11, built as recommended).
//
//   node tools-check/weigh-confirm.mjs
//
// 185 typed as 85, 158 or 83.9 (kilos in a pounds account) was accepted
// silently, and fed every typo-driven wrong number in the audit. The model now
// screens such a day out of the slope (A3), but it stays in the log and on the
// chart. So the Weight tab asks once, before it writes: "185.2 lb? Your trend
// is 184.1." with "Log it" and "Fix it" ("Fix it" writes nothing and keeps the
// box). The rule is weightmodel.js needsConfirm(typed, trend, last), VB's R2:
// far = more than max(5 lb, 3 % of the reference) away; ask only when the
// reading is far from the trend AND far from the last reading; the first
// weigh-in never asks. Counted in the sim: 164 of 164 typos asked, 1 genuine
// reading in 485.
//
// What it proves, driving the REAL weightmodel.js:
//   - (85, 185, 185), (158.2, 185, 185), (83.9, 185, 185), (407.9, 185, 185):
//     ask;
//   - (189, 185, 186) an evening reading, (190, 184, 189) near the last one,
//     (85, null, null) the first weigh-in: do not;
//   - (85, null, 185): ask (no trend yet, far from the last);
//   - weight.js asks before the write, with "Log it" / "Fix it".

import { stage, harness, setNow, at, readSrc } from './lib/stage.mjs';

const { check, section, done } = harness('weigh-confirm — a far-off weigh-in asks once');
const cleanups = [];
setNow(at(2026, 10, 6, 9));
const s = stage(['ui.js', 'units.js', 'weightmodel.js']); cleanups.push(s.cleanup);
const W = await s.load('weightmodel.js');
const ok = typeof W.needsConfirm === 'function';
check('weightmodel.js exports needsConfirm', ok);

section('The rule (R2)');
if (ok) {
  for (const [a, b, c] of [[85, 185, 185], [158.2, 185, 185], [83.9, 185, 185], [407.9, 185, 185], [85, null, 185]])
    check('(' + a + ', ' + b + ', ' + c + '): asks', W.needsConfirm(a, b, c) === true);
  for (const [a, b, c, why] of [[189, 185, 186, 'an evening reading'], [190, 184, 189, 'near the last reading'], [85, null, null, 'the first weigh-in'], [185.4, 185, 184.6, 'an ordinary morning']])
    check('(' + a + ', ' + b + ', ' + c + '), ' + why + ': does not ask', W.needsConfirm(a, b, c) === false);
  check('the line is max(5 lb, 3 %): 300 lb, 9 lb off asks nothing; 9.1 asks',
    W.needsConfirm(309, 300, 300) === false && W.needsConfirm(309.1, 300, 300) === true);
}

section('Where it asks');
{
  const WT = readSrc('weight.js');
  check('weight.js asks needsConfirm(lb, trendWeight(), the last reading) after the LIMITS check and before the write',
    /const tw = trendWeight\(\), last = s\.latest \? s\.latest\.lb : null;/.test(WT) && /needsConfirm\(lb, tw, last\)/.test(WT) &&
    WT.indexOf('needsConfirm(lb,') > WT.indexOf("if (!within(lb, LIMITS.lb))") &&
    WT.indexOf('needsConfirm(lb,') < WT.indexOf("try { await write('weight/entries', next); }"));
  check('one confirm sheet: "Log it" / "Fix it", and the question in the account\'s unit',
    /confirmLabel: 'Log it'/.test(WT) && /cancelLabel: 'Fix it'/.test(WT) && /labelW\(r1\(lb\), u\) \+ '\?'/.test(WT) && /'Your trend is ' \+ fmtW\(/.test(WT));
}

done(...cleanups);
