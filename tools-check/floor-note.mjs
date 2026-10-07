#!/usr/bin/env node
//
// Verifier for the note under a target a floor held (P5 C2; F14; XC X3, X7).
//
//   node tools-check/floor-note.mjs
//
// The Daily-targets sheet used to print "That rate would put you at −960,
// below the 1,477 floor … drop the fat grams if you want to go lower
// honestly": a negative calorie number, and advice on which box to empty to
// get under a floor. food.js floorNote(n, u) now names the number, which line
// holds it, and the rate it actually plans, in this order: a minor at the
// Dietary Guidelines line; a minor whose deficit was dropped; the safety
// floor; the person's own floor; the macro floor. Never a number under the
// floor, never how to get under it, no doctor wording.
//
// What it proves, driving the REAL tdee.js and food.js:
//   - over a grid of rates, maintenances, bodyweights and people: no note
//     prints the unfloored number, a minus sign or advice to change a box;
//   - the safety floor: "Held at 1,200, the lowest daily target Rack sets.";
//   - his own floor: "Held at 2,000, the floor you set under Daily targets.";
//   - the macros: "Held at N: your protein and fat plus 100 g of carbs need
//     that much.";
//   - girl 15, maintenance 2,000, cut: "Set at 2,000, your maintenance: under
//     18, Rack does not plan a deficit.";
//   - nothing held it: no note;
//   - the sheet shows floorNote, and the old sentence is gone.

import { stage, harness, setNow, at, J, readSrc } from './lib/stage.mjs';

const { check, section, done } = harness('floor-note — a held target says what holds it, never how to get under it');
const cleanups = [];
setNow(at(2026, 10, 6, 9));
const s = stage(['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js']); cleanups.push(s.cleanup);
const T = await s.load('tdee.js'), F = await s.load('food.js');
const has = typeof F.floorNote === 'function';
check('food.js exports floorNote', has);
const G = (o = {}) => ({ on: true, rateWk: -1, pPerLb: 1, fPerLb: 0.35, floor: 0, ...o });

if (has) {
  section('The grid');
  const bad = []; let notes = 0;
  const whos = [null, { sex: 'f', age: 30 }, { sex: 'm', age: 50 }, { sex: 'f', age: 15 }, { sex: 'm', age: 16 }, { sex: 'f', age: 72 }];
  for (const who of whos) for (const mc of [1300, 1480, 1800, 2200, 3000]) for (const r of [-5, -3, -2, -1, -0.5, 0, 0.5])
    for (const [pp, ff] of [[0, 0], [1, 0.35], [1.2, 0.5]]) for (const fl of [0, 2000]) for (const u of ['lb', 'kg']) {
      const n = T.autoTargets(G({ rateWk: r, pPerLb: pp, fPerLb: ff, floor: fl }), mc, 160, who);
      const t = F.floorNote(n, u);
      if (!t) continue;
      notes++;
      // The number standing alone (not "500" inside "1,500").
      const alone = new RegExp('(^|[^\\d,])' + n.wanted.toLocaleString().replace(/,/g, ',') + '(?![\\d,])');
      if (n.wanted < n.cal && alone.test(t)) bad.push('wanted printed: ' + t);
      if (/[−-]\s?\d/.test(t)) bad.push('a minus: ' + t);
      if (/drop the|ease the rate|empty|lower honestly|doctor/i.test(t)) bad.push('advice: ' + t);
    }
  check('no note (' + notes + ' of them) prints the unfloored number, a minus sign, advice, or doctor wording', notes > 0 && !bad.length, bad.slice(0, 3).join(' | '));

  section('Which line holds it');
  const sf = T.autoTargets(G({ rateWk: -5, pPerLb: 0, fPerLb: 0 }), 1800, 180, { sex: 'f', age: 30 });
  const sfn = F.floorNote(sf, 'lb');
  check('the safety floor: "Held at 1,200, the lowest daily target Rack sets." and the rate it plans',
    /^Held at 1,200, the lowest daily target Rack sets\. That works out to about 1\.2 lb a week down\.$/.test(sfn), sfn);
  const uf = T.autoTargets(G({ rateWk: -1, floor: 2000 }), 2200, 160, { sex: 'm', age: 40 });
  const ufn = F.floorNote(uf, 'lb');
  check('his own floor: "Held at 2,000, the floor you set under Daily targets."', /^Held at 2,000, the floor you set under Daily targets\. That works out to about 0\.4 lb a week down\.$/.test(ufn), ufn);
  const mf = T.autoTargets(G({ rateWk: -1 }), 1480, 150, { sex: 'f', age: 70 });
  const mfn = F.floorNote(mf, 'lb');
  check('the macros: "Held at 1,480: your protein and fat plus 100 g of carbs need that much. That works out to about maintenance."',
    mfn === 'Held at 1,480: your protein and fat plus 100 g of carbs need that much. That works out to about maintenance.', mfn);
  const g15 = T.autoTargets(G({ rateWk: -1 }), 2000, 120, { sex: 'f', age: 15 });
  const g15n = F.floorNote(g15, 'lb');
  check('girl 15, maintenance 2,000, cut: "Set at 2,000, your maintenance: under 18, Rack does not plan a deficit."',
    g15n === 'Set at 2,000, your maintenance: under 18, Rack does not plan a deficit.', g15n);
  const g14 = T.autoTargets(G({ rateWk: -1 }), 1690, 110, { sex: 'f', age: 14 });
  const g14n = F.floorNote(g14, 'lb');
  check('girl 14, maintenance 1,690, cut: held at the Dietary Guidelines line, said so',
    /^Held at 1,800\. Under 18, Rack does not plan a deficit; this is the least the Dietary Guidelines give for your age\. That works out to about 0\.2 lb a week up\.$/.test(g14n), g14n);
  check('nothing held it: no note', F.floorNote(T.autoTargets(G({ rateWk: -1 }), 2600, 180, { sex: 'm', age: 30 }), 'lb') === null);
  check('kilos: the rate in the account\'s unit', /kg a week down\.$/.test(F.floorNote(sf, 'kg')), F.floorNote(sf, 'kg'));
}

section('The sheet');
{
  const FOOD = readSrc('food.js');
  check('openTargets shows floorNote(n, u)', /const fl = floorNote\(n, u\);/.test(FOOD));
  check('and the old sentence is gone', !/That rate would put you at/.test(FOOD) && !/drop the fat grams/.test(FOOD));
}

done(...cleanups);
