#!/usr/bin/env node
//
// Verifier for lb/kg and in/cm.
//
//   node tools-check/units.mjs
//
// The rule this exists to protect is the one that outranks everything else in
// the units ship: A WRONG NUMBER IS WORSE THAN NO NUMBER. Every check below is
// a way for a wrong one to get on screen or into the database:
//
//   A  round trip        kg -> lb -> kg has to come back where it started
//   B  imperial identity every formatter must be the OLD expression, exactly,
//                        when the unit is pounds. Eight live accounts are
//                        imperial and this ship has to be invisible to them
//   C  clamp order       convert, THEN bound. Bounding a typed kilo figure
//                        against a pound limit lets 690 kg through and refuses
//                        20, and the browser's own min/max has to agree
//   D  the empty string  '' is how an unfilled set is told from a logged zero
//                        and it has to survive the conversion untouched
//   E  stored shape      a metric entry must write the same keys and the same
//                        magnitudes an imperial one would for the same body
//   F  double conversion the one bug that is silent — 100 becomes 220 becomes
//                        486 and all three look like a weight. Source scan
//   G  the sentences     insights.js is pure, so its ENTIRE output is diffed
//                        against the same file at 166455c under imperial
//   I  BW                a recorded set with no load reads BW on the screens
//                        that only READ it, and never in a box that is read
//                        back and saved. Table, and a source scan of the split
//
// Nothing here holds a copy of the code under test. units.js and ui.js are
// imported for real; setW() is read out of the real workout.js by source text
// the way blocks.mjs does it; insights.js and analytics.js are loaded twice,
// once as they are and once as `git show 166455c:` wrote them.

import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);
const src  = p => readFileSync(join(ROOT, p), 'utf8');

const U  = await import(pathToFileURL(join(ROOT, 'units.js')).href);
const UI = await import(pathToFileURL(join(ROOT, 'ui.js')).href);

const dir = mkdtempSync(join(tmpdir(), 'rack-units-'));

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }

// Grids wide enough to hit every branch of every formatter, including the
// negative rates and the zero that a blank box parses to.
const WEIGHTS = [0, 0.1, 1, 49.9, 50, 123.4, 185, 208, 220.5, 227.55, 699.9, 700, 1400, 5000];
const RATES   = [-5, -2.5, -1.4, -1, -0.3, -0.2, 0, 0.2, 0.3, 0.5, 1, 1.5, 5];
const PERS    = [0, 0.05, 0.35, 0.8, 1, 1.5, 2.2, 3];
const HEIGHTS = [36, 60, 68, 69, 70, 71, 75, 96];

/* ================= A. ROUND TRIP ================= */
section('A. round trip — in, then out, must come back within 0.05');
{
  let worst = 0, worstAt = '';
  const rt = (label, into, outOf, vals, unit) => {
    let bad = 0;
    vals.forEach(v => {
      const back = outOf(into(v, unit), unit);
      const drift = Math.abs(back - v);
      if (drift > worst) { worst = drift; worstAt = label + ' ' + v; }
      if (drift > 0.05) bad++;
    });
    check(label + ' (' + unit + ') round-trips within 0.05 across ' + vals.length + ' values', bad === 0, bad + ' drifted');
  };
  rt('wIn/wOut',       U.wIn,    U.wOut,    WEIGHTS, 'kg');
  rt('rateIn/rateOut', U.rateIn, U.rateOut, RATES,   'kg');
  rt('perIn/perOut',   U.perIn,  U.perOut,  PERS,    'kg');
  rt('hIn/hOut',       U.hIn,    U.hOut,    [91, 150, 175, 176, 180, 200, 243], 'cm');
  check('worst drift anywhere is under 0.05 (' + worst.toFixed(4) + ' at ' + worstAt + ')', worst <= 0.05);

  // And the other direction: a stored pound figure, shown in kilos and typed
  // straight back, must land on the same stored figure to one decimal — which
  // is the precision weight/entries keeps.
  // The property that matters on screen: open the app, read the number, type it
  // back, and the number you read does not move. It cannot be tighter than that
  // — one decimal of kilos is 0.22 lb, so the STORED pounds legitimately shift
  // by up to a tenth. What must not shift is what the person sees.
  const bad = WEIGHTS.filter(lb => {
    const shown = U.fmtW(lb, 'kg');
    return U.fmtW(UI.r1(U.wIn(parseFloat(shown), 'kg')), 'kg') !== shown;
  });
  check('a weigh-in read in kg and typed straight back reads the same in kg',
        bad.length === 0, JSON.stringify(bad));
}

/* ================= B. IMPERIAL IS THE OLD EXPRESSION ================= */
section('B. imperial identity — every formatter is what 166455c printed');
{
  // The expressions on the right are the ones that were in the app at
  // 166455c, taken from the ledger in the build prompt, evaluated with the
  // REAL ui.js helpers rather than a copy of them.
  const same = (label, f, g, vals) => {
    const bad = vals.filter(v => String(f(v)) !== String(g(v)));
    check(label, bad.length === 0, bad.length ? 'first: ' + bad[0] + ' -> ' + f(bad[0]) + ' vs ' + g(bad[0]) : '');
  };
  same('fmtW(x,"lb")   === trimNum(x)',        x => U.fmtW(x, 'lb'),   x => UI.trimNum(x), WEIGHTS);
  same('fmtW(x,"lb")   === String(r1(x))',     x => U.fmtW(x, 'lb'),   x => String(UI.r1(x)), WEIGHTS);
  same('fmtRate(x,"lb")=== String(r1(x))',     x => U.fmtRate(x, 'lb'), x => String(UI.r1(x)), RATES);
  same('fmtVol(x,"lb") === compact(x)',        x => U.fmtVol(x, 'lb'), x => UI.compact(x), [0, 12, 999, 1000, 41250, 1.2e6]);
  same('fmtSetW(w,"lb")=== String(w)',         w => U.fmtSetW(w, 'lb'), w => String(w), ['', '0', '135', '227.5', '227.55', 225]);
  same('fmtH(i,"in")   === trimNum(i)',        i => U.fmtH(i, 'in'),   i => UI.trimNum(i), HEIGHTS);
  same('labelW(x,"lb") === trimNum(x)+" lb"',  x => U.labelW(x, 'lb'), x => UI.trimNum(x) + ' lb', WEIGHTS);
  same('labelVol(x,"lb")=== compact(x)+" lb"', x => U.labelVol(x, 'lb'), x => UI.compact(x) + ' lb', [0, 999, 41250]);

  const ident = (label, f, vals, unit) => {
    const bad = vals.filter(v => f(v, unit) !== v);
    check(label, bad.length === 0, JSON.stringify(bad));
  };
  ident('wOut is identity on lb',    U.wOut,    WEIGHTS, 'lb');
  ident('wIn is identity on lb',     U.wIn,     WEIGHTS, 'lb');
  ident('volOut is identity on lb',  U.volOut,  WEIGHTS, 'lb');
  ident('rateOut is identity on lb', U.rateOut, RATES,   'lb');
  ident('rateIn is identity on lb',  U.rateIn,  RATES,   'lb');
  ident('perOut is identity on lb',  U.perOut,  PERS,    'lb');
  ident('perIn is identity on lb',   U.perIn,   PERS,    'lb');
  ident('boxW is identity on lb',    U.boxW,    WEIGHTS, 'lb');
  ident('boxRate is identity on lb', U.boxRate, RATES,   'lb');
  ident('boxPer is identity on lb',  U.boxPer,  PERS,    'lb');
  ident('hOut is identity on in',    U.hOut,    HEIGHTS, 'in');
  ident('hIn is identity on in',     U.hIn,     HEIGHTS, 'in');

  check('unitW/unitH say lb and in on imperial',
        U.unitW('lb') === 'lb' && U.unitH('in') === 'in');
  check('kcalPerUnit("lb") is still 3500',    U.kcalPerUnit('lb') === 3500);
  check('kcalPerUnit("kg") is 7716',          U.kcalPerUnit('kg') === 7716);

  const limsSame = [
    ['lb', UI.LIMITS.lb, U.limW],  ['setW', UI.LIMITS.setW, U.limW],
    ['rateWk', UI.LIMITS.rateWk, U.limRate], ['perLb', UI.LIMITS.perLb, U.limPer],
    ['height', [36, 96], U.limH]
  ].every(([, lim, f]) => JSON.stringify(f(lim, 'lb')) === JSON.stringify(lim));
  check('every limit is unchanged on imperial (limW/limRate/limPer/limH)', limsSame);

  // The default, from every direction a bad node can arrive.
  const imperial = JSON.stringify({ weight: 'lb', height: 'in' });
  const junk = [null, undefined, {}, 'kg', 0, [], { weight: 'stone' }, { weight: null, height: 'furlong' },
                { height: 'cm' }].map(v => JSON.stringify(U.normUnits(v)));
  check('absent, half-written and unrecognised units all read as imperial',
        junk.filter(x => x !== imperial).length === 1 &&
        JSON.stringify(U.normUnits({ height: 'cm' })) === JSON.stringify({ weight: 'lb', height: 'cm' }),
        JSON.stringify(junk));
}

/* ================= C. CLAMP IN THE RIGHT UNIT ================= */
section('C. clamp order — convert, then bound, and the browser agrees');
{
  const cases = [
    ['LIMITS.lb',     UI.LIMITS.lb,     U.limW,    U.wIn],
    ['LIMITS.setW',   UI.LIMITS.setW,   U.limW,    U.wIn],
    ['LIMITS.rateWk', UI.LIMITS.rateWk, U.limRate, U.rateIn],
    ['LIMITS.perLb',  UI.LIMITS.perLb,  U.limPer,  U.perIn]
  ];
  cases.forEach(([name, lim, limFn, inFn]) => {
    const [lo, hi] = limFn(lim, 'kg');
    // The display ceiling stores at or inside the pound ceiling...
    const atTop = inFn(hi, 'kg');
    const atBot = inFn(lo, 'kg');
    check(name + ': the metric ceiling (' + hi + ') stores inside the pound ceiling (' + lim[1] + ')',
          UI.within(atTop, lim), String(atTop));
    check(name + ': the metric floor (' + lo + ') stores inside the pound floor (' + lim[0] + ')',
          UI.within(atBot, lim), String(atBot));
    // ...and one step past it is refused rather than reinterpreted.
    const over = inFn(hi + 1, 'kg');
    check(name + ': one over the metric ceiling is out of bounds, not reinterpreted',
          !UI.within(over, lim), String(over));
    // The bound shown to the browser is never wider than the real one, so
    // nothing the input accepts can be pulled back by the clamp afterwards.
    check(name + ': input min/max is inside the clamp, never outside it',
          inFn(hi, 'kg') <= lim[1] + 1e-9 && inFn(lo, 'kg') >= lim[0] - 1e-9);
  });

  // The specific one the prompt names: a kilos account typing 2500 must be
  // stopped at the kilo equivalent of 5,000 lb, not at 5,000 of something.
  const setLim = U.limW(UI.LIMITS.setW, 'kg');
  check('a kilos account typing 2500 on the bar is clamped at ' + setLim[1] + ' kg, not 5000',
        setLim[1] > 2267 && setLim[1] < 2268 && U.wIn(setLim[1], 'kg') <= 5000, JSON.stringify(setLim));
  const lbLim = U.limW(UI.LIMITS.lb, 'kg');
  check('a kilos account cannot log 690 kg (it is past ' + lbLim[1] + ')',
        !UI.within(U.wIn(690, 'kg'), UI.LIMITS.lb));
  check('a kilos account CAN log 20 kg is false — the floor is ' + lbLim[0] + ' kg',
        !UI.within(U.wIn(20, 'kg'), UI.LIMITS.lb));
}

/* ================= D/E. THE REAL SET-ROW PATH ================= */
section('D. the empty string, through the real setW() out of workout.js');
{
  // Lifted, not copied — a verifier carrying its own copy of the thing it
  // verifies proves only that the copy agrees with itself.
  const WSRC = src('workout.js');
  const at = WSRC.indexOf('\nfunction setW(');
  if (at === -1) throw new Error('workout.js no longer declares function setW() — this verifier has nothing to drive');
  let depth = 0, end = -1;
  for (let j = WSRC.indexOf('{', at); j < WSRC.length; j++) {
    if (WSRC[j] === '{') depth++;
    else if (WSRC[j] === '}' && --depth === 0) { end = j; break; }
  }
  writeFileSync(join(dir, 'setw.mjs'),
    "import { setNum, LIMITS } from " + real('ui.js') + ";\n" +
    "import { wIn, limW } from " + real('units.js') + ";\n" +
    'export ' + WSRC.slice(at + 1, end + 1));
  const { setW } = await import(pathToFileURL(join(dir, 'setw.mjs')).href);

  // A blank target must come back blank, not as a 0 nobody typed: '' coerces to
  // 0 in the conversion and undefined to NaN, and both would read as a promise
  // of a weight. routines.js puts exactly these through fmtSetW.
  check('fmtSetW keeps a blank blank, in both units, however it arrives',
        ['', null, undefined].every(v => U.fmtSetW(v, 'lb') === '' && U.fmtSetW(v, 'kg') === ''),
        JSON.stringify(['', null, undefined].map(v => U.fmtSetW(v, 'kg'))));

  ['', ' ', '   '].forEach(v => {
    check('setW(' + JSON.stringify(v) + ', "lb") stays the empty string', setW(v, 'lb') === '');
    check('setW(' + JSON.stringify(v) + ', "kg") stays the empty string', setW(v, 'kg') === '');
  });
  check('a logged zero is still a zero, not a blank, in both units',
        setW('0', 'lb') === '0' && setW('0', 'kg') === '0',
        JSON.stringify([setW('0', 'lb'), setW('0', 'kg')]));
  check('setW on lb is byte-for-byte setNum(v, LIMITS.setW)',
        ['', '0', '135', '227.5', '227.55', '99999', 'abc', '-40']
          .every(v => setW(v, 'lb') === UI.setNum(v, UI.LIMITS.setW)));
  check('setW on kg never writes more than two decimals',
        ['100', '102.06', '1.005', '99.999', '227.55']
          .every(v => setW(v, 'kg') === '' || /^-?\d+(\.\d{1,2})?$/.test(setW(v, 'kg'))),
        JSON.stringify(['100', '102.06', '1.005', '99.999', '227.55'].map(v => setW(v, 'kg'))));
  check('setW("100","kg") stores 220.46 lb, a string, as it always has been',
        setW('100', 'kg') === '220.46' && typeof setW('100', 'kg') === 'string');
  check('a set typed as 100 kg reads back as 100 kg',
        U.fmtSetW(setW('100', 'kg'), 'kg') === '100', U.fmtSetW(setW('100', 'kg'), 'kg'));
  check('a set typed as 220.46 lb stores exactly what 100 kg stores — same key, same magnitude',
        setW('220.46', 'lb') === setW('100', 'kg'));

  section('E. stored shape — a metric entry writes what an imperial one would');
  // A SESSION SET. The record key is `w` and it holds a string of pounds.
  const metricSet = { w: setW('100', 'kg'), r: UI.setNum('5', UI.LIMITS.reps, true), type: 'N', done: true };
  const imperialSet = { w: setW('220.46', 'lb'), r: UI.setNum('5', UI.LIMITS.reps, true), type: 'N', done: true };
  check('session set: identical keys and values',
        JSON.stringify(metricSet) === JSON.stringify(imperialSet), JSON.stringify(metricSet));
  check('session set: keys are still exactly w, r, type, done',
        JSON.stringify(Object.keys(metricSet)) === '["w","r","type","done"]');

  // A WEIGH-IN. weight.js writes { lb: r1(lb), t }.
  const wMetric = { lb: UI.r1(U.wIn(100, 'kg')) };
  const wImperial = { lb: UI.r1(U.wIn(220.5, 'lb')) };
  check('weigh-in: 100 kg and 220.5 lb both store { lb: 220.5 }',
        JSON.stringify(wMetric) === JSON.stringify(wImperial) && wMetric.lb === 220.5,
        JSON.stringify(wMetric));
  // v41 let the weigh-in's time be corrected, so `t` is no longer written as a
  // bare Date.now(). The shape is the thing this check is about and the shape
  // did not move: two keys, `lb` holding converted pounds and `t` a timestamp.
  check('weigh-in: the key is still `lb`, never `kg`, and the shape is still { lb, t }',
        Object.keys(wMetric)[0] === 'lb' && src('weight.js').includes('{ lb: r1(lb), t: w.t }'));
  check('weigh-in: `t` is whatever weighTime allows, and nothing else reaches the write',
        /const w = weighTime\(when \? Date\.parse\(when\.value\) : null, Date\.now\(\)\);/.test(src('weight.js')));

  // A ROUTINE TARGET. routines.js writes `tw`, same string-of-pounds shape.
  const RSRC = src('routines.js');
  check('routine: the tw write is still the setNum -> wIn composition, in that order',
        RSRC.includes('const n = setNum(e.target.value, lim);') &&
        RSRC.includes("s.tw = n === '' ? '' : String(wIn(parseFloat(n), u));"));
  const tw = (v, u) => { const n = UI.setNum(v, U.limW(UI.LIMITS.setW, u)); return n === '' ? '' : String(U.wIn(parseFloat(n), u)); };
  check('routine: tw from 100 kg equals tw from 220.46 lb, and blank stays blank',
        tw('100', 'kg') === tw('220.46', 'lb') && tw('', 'kg') === '' && tw('', 'lb') === '');

  // A TARGETS NODE. food.js readAuto() converts, then clamps in pounds.
  const FSRC = src('food.js');
  check('targets: readAuto still converts before it clamps',
        FSRC.includes("rateWk: clamp(rateIn(parseFloat(ra.input.value) || 0, u), LIMITS.rateWk),") &&
        FSRC.includes("pPerLb: clamp(perIn(parseFloat(pl.input.value) || 0, u), LIMITS.perLb),") &&
        FSRC.includes("fPerLb: clamp(perIn(parseFloat(fl.input.value) || 0, u), LIMITS.perLb),"));
  const auto = (rate, p, f, u) => ({
    on: true,
    rateWk: UI.clamp(U.rateIn(rate, u), UI.LIMITS.rateWk),
    pPerLb: UI.clamp(U.perIn(p, u), UI.LIMITS.perLb),
    fPerLb: UI.clamp(U.perIn(f, u), UI.LIMITS.perLb),
    floor: 0, lastAdj: 0
  });
  const aImp = auto(-1, 1, 0.35, 'lb');
  const aMet = auto(U.rateOut(-1, 'kg'), U.perOut(1, 'kg'), U.perOut(0.35, 'kg'), 'kg');
  check('targets: the metric defaults store the same per-POUND numbers',
        JSON.stringify(Object.keys(aMet)) === JSON.stringify(Object.keys(aImp)) &&
        Math.abs(aMet.rateWk - aImp.rateWk) < 0.01 &&
        Math.abs(aMet.pPerLb - aImp.pPerLb) < 0.01 &&
        Math.abs(aMet.fPerLb - aImp.fPerLb) < 0.01,
        JSON.stringify(aMet));
  check('targets: keys are still rateWk / pPerLb / fPerLb, not rateWkKg or perKg',
        'rateWk' in aMet && 'pPerLb' in aMet && 'fPerLb' in aMet &&
        !Object.keys(aMet).some(k => /kg|Kg|cm|Cm/.test(k)));
  check('targets: a metric user asking for 2.2 g per kg stores 1.0 g per lb',
        Math.abs(U.perIn(2.2046226218, 'kg') - 1) < 0.005, String(U.perIn(2.2046226218, 'kg')));
  check('targets: goalLb from 100 kg is the same number as from 220.5 lb',
        Math.round(U.wIn(100, 'kg') * 10) / 10 === Math.round(U.wIn(220.5, 'lb') * 10) / 10);

  // HEIGHT. profile.heightIn stays inches, and a whole-cm entry survives.
  const cmTrip = [150, 165, 175, 176, 180, 183, 200].filter(cm => U.fmtH(U.hIn(cm, 'cm'), 'cm') !== String(cm));
  check('height: every whole centimetre round-trips through heightIn exactly',
        cmTrip.length === 0, JSON.stringify(cmTrip));
  check('height: imperial still stores whole inches from the ft + in pair',
        src('settings.js').includes('heightIn: metric ? inches : Math.round(inches)') &&
        src('onboarding.js').includes("heightIn: a.units === 'kg' ? a.heightIn : Math.round(a.heightIn),"));
  const hLim = U.limH([36, 96], 'cm');
  check('height: the 36–96 in sanity check is converted, not moved (' + hLim.join('–') + ' cm)',
        U.hIn(hLim[0], 'cm') >= 36 && U.hIn(hLim[1], 'cm') <= 96 &&
        hLim[0] < 92 && hLim[1] > 243, JSON.stringify(hLim));
}

/* ================= F. NO DOUBLE CONVERSION ================= */
section('F. no double conversion — source scan of every call site');
{
  // Anything that takes a POUND (or an inch) and returns something else. unitW,
  // unitH, kcalPerUnit, normUnits and the lim* family take a unit or a limit,
  // not a value, so they are not in the set and cannot be the inner call.
  const CONV = ['wOut', 'wIn', 'volOut', 'rateOut', 'rateIn', 'perOut', 'perIn',
                'hOut', 'hIn', 'fmtW', 'fmtSetW', 'fmtSetLoad', 'fmtVol', 'fmtRate', 'fmtPer',
                'fmtH', 'labelW', 'labelVol', 'labelRate', 'boxW', 'boxRate', 'boxPer'];
  const NAME = new RegExp('(?<![A-Za-z0-9_$.])(' + CONV.join('|') + ')\\s*\\(', 'g');

  // units.js is the one file where a converter legitimately calls another —
  // fmtW is trim1(wOut(...)) by definition — so it is the definition, not a
  // call site, and it is excluded.
  const FILES = readdirSync(ROOT).filter(f => f.endsWith('.js') && f !== 'units.js');
  let sites = 0;
  const offenders = [];
  FILES.forEach(f => {
    const text = src(f);
    NAME.lastIndex = 0;
    let m;
    while ((m = NAME.exec(text))) {
      sites++;
      // Walk to the matching close paren and look at the arguments.
      let depth = 0, i = m.index + m[0].length - 1, endAt = -1;
      for (; i < text.length; i++) {
        if (text[i] === '(') depth++;
        else if (text[i] === ')' && --depth === 0) { endAt = i; break; }
      }
      if (endAt === -1) continue;
      const args = text.slice(m.index + m[0].length, endAt);
      const inner = args.match(NAME);
      if (inner) offenders.push(f + ': ' + m[1] + '(' + args.trim().slice(0, 70) + ')');
      NAME.lastIndex = endAt;
    }
  });
  check(sites + ' converter call sites across ' + FILES.length + ' files, none feeding another converter',
        offenders.length === 0, offenders.join(' | '));
  check('the scan actually found the call sites (a silent zero would pass)', sites > 100, String(sites));

  // The other half of the same rule: convert before compacting, never after.
  check('nothing compacts a volume and then converts it',
        !/volOut\s*\(\s*(compact|fmtVol)\s*\(/.test(FILES.map(src).join('\n')));
}

/* ================= G. THE SENTENCES, AGAINST 166455c ================= */
section('G. imperial byte-identical — insights.js and analytics.js vs 166455c');
{
  const BASE = '166455c';
  const at = p => {
    try { return execFileSync('git', ['show', BASE + ':' + p], { cwd: ROOT, encoding: 'utf8' }); }
    catch { return null; }
  };
  const oldInsights = at('insights.js'), oldAnalytics = at('analytics.js');

  if (!oldInsights || !oldAnalytics) {
    check('baseline ' + BASE + ' is reachable with git show', false,
          'run this inside the repo, with ' + BASE + ' present');
  } else {
    // store.js pulls the Firebase SDK off gstatic and cannot load under Node,
    // so it is stubbed for both copies identically.
    writeFileSync(join(dir, 'store-stub.mjs'), `
export async function read(_p, fallback) { return fallback; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`);
    const load = async (name, text, extra = {}) => {
      let out = text
        .replace("from './store.js'", "from './store-stub.mjs'")
        .replace("from './exercises.js'", 'from ' + real('exercises.js'))
        .replace("from './ui.js'", 'from ' + real('ui.js'))
        .replace("from './units.js'", 'from ' + real('units.js'));
      Object.entries(extra).forEach(([k, v]) => { out = out.replace(k, v); });
      writeFileSync(join(dir, name), out);
      return import(pathToFileURL(join(dir, name)).href);
    };
    const oldA = await load('old-analytics.mjs', oldAnalytics);
    const newA = await load('new-analytics.mjs', src('analytics.js'));
    const oldI = await load('old-insights.mjs', oldInsights,
      { "from './analytics.js'": 'from ' + JSON.stringify(pathToFileURL(join(dir, 'old-analytics.mjs')).href) });
    // The baseline again with its three-win cut lifted, for the one declared
    // v47 difference below.
    const oldAll = await load('old-insights-all.mjs', oldInsights,
      { "from './analytics.js'": 'from ' + JSON.stringify(pathToFileURL(join(dir, 'old-analytics.mjs')).href),
        'wins: wins.slice(0, 3),': 'wins: wins.slice(0),' });
    const newI = await load('new-insights.mjs', src('insights.js'),
      { "from './analytics.js'": 'from ' + JSON.stringify(pathToFileURL(join(dir, 'new-analytics.mjs')).href) });

    /* ---- a fixture with something in every branch ---- */
    const DAY = 864e5;
    const key = back => {
      const d = new Date(Date.now() - back * DAY);
      const p = n => String(n).padStart(2, '0');
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    };
    const wmap = {}, summaries = {}, stepDays = {}, waterDays = {}, days = [];
    for (let i = 0; i < 30; i++) {
      const k = key(i);
      wmap[k] = 208 - i * 0.12;
      summaries[k] = { cal: 2300 + (i % 4) * 90, p: 190 + (i % 5) * 6, c: 210, f: 74 };
      stepDays[k] = { steps: 9000 + (i % 6) * 700 };
      waterDays[k] = 2800 + (i % 3) * 300;
      days.push({ d: key(29 - i), lb: 208 - (29 - i) * 0.12 });
    }
    const mkSession = (back, vol) => ({
      _date: key(back), id: 's' + back, name: 'Push', startedAt: Date.now() - back * DAY,
      durationSec: 4800, volume: vol, groups: ['chest'],
      exercises: [{
        exId: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell',
        sets: [{ w: '135', r: '10', type: 'W', done: true },
               { w: String(200 + back), r: '5', type: 'N', done: true },
               { w: String(205 + back), r: '3', type: 'N', done: true }]
      }]
    });
    const sessions = [20, 14, 9, 5, 3, 1].map((b, i) => mkSession(b, 30000 + i * 2500));
    const entries = {};
    Object.keys(wmap).forEach((k, i) => { entries['wt' + i] = { lb: wmap[k], t: Date.now() - i * DAY }; });

    const ctxBase = {
      targets: { cal: 2300, p: 210, f: 74, maint: null, goalLb: 190,
                 auto: { on: true, rateWk: -1, pPerLb: 1, fPerLb: 0.35, floor: 0, lastAdj: 0 } },
      maint: { cal: 2800, pinned: false }, dir: -1, summaries, wmap, entries,
      rate: { rateWk: -1.7, model: true }, tw: 204.2, sessions,
      stepDays, stepGoal: 10000, waterDays, waterGoal: 3785,
      est: { cal: 2800, avgIntake: 2450, rateWk: -1.7, days: 24, se: 62, need: [] },
      days
    };

    // trajectory().eta is `new Date(Date.now() + …)`, so two calls a
    // millisecond apart differ in the milliseconds and nothing else. Rounded to
    // the day, which is the only part that ever reaches a screen.
    const runAll = (mod, ctx) => JSON.stringify({
      assess: mod.assess(ctx),
      review: mod.weeklyReview(ctx),
      traj:   mod.trajectory(ctx, ctx.rate.rateWk, ctx.targets.auto.rateWk, ctx.tw)
    // assess() returns a trajectory of its own alongside the standalone one,
    // so there are two of these and the /g is not decoration.
    }).replace(/"eta":"(\d{4}-\d{2}-\d{2})T[^"]*"/g, '"eta":"$1"');

    // Three directions of travel, because the sentences differ per goal.
    [['a cut', -1, -1.7], ['a bulk', 1, 0.9], ['a hold', 0, 0.12], ['off pace', -1, 0.4],
     ['losing fast', -1, -2.4], ['losing slow', -1, -0.25]].forEach(([label, dir, rateWk]) => {
      const ctx = { ...ctxBase, dir, rate: { rateWk, model: true },
                    targets: { ...ctxBase.targets,
                               auto: { ...ctxBase.targets.auto, rateWk: dir === 0 ? 0 : dir * 1 } } };
      // v47 put Coach's band into insights.js: past RATE_BAND_LB a pace is not
      // a win, so "Losing N a week" leaves Doing well. That is the ONE
      // difference from the baseline this section allows, it is applied to the
      // baseline's own output, and only when the fixture's rate is past the
      // band — everything else still has to match byte for byte.
      // tools-check/rate-band.mjs is where the band itself is proven.
      // Wins are ranked and cut to three, so taking one out lets the fourth in:
      // the baseline is run a second time with its cut lifted, the pace win is
      // dropped from that full list, and it is cut to three here.
      const v47 = json => {
        if (!(Math.abs(rateWk) > newI.RATE_BAND_LB)) return json;
        const o = JSON.parse(json);
        const all = JSON.parse(runAll(oldAll, ctx)).assess.wins;
        o.assess.wins = all.filter(f => f.id !== 'pace-good').slice(0, 3);
        return JSON.stringify(o);
      };
      const before = v47(runAll(oldI, ctx));
      const absent = runAll(newI, ctx);                       // no `u` at all
      const explicit = runAll(newI, { ...ctx, u: 'lb' });      // and an explicit one
      check('insights on ' + label + ': identical to ' + BASE + ' with units absent',
            absent === before, diffOf(before, absent));
      check('insights on ' + label + ': identical to ' + BASE + ' with units = lb',
            explicit === before, diffOf(before, explicit));
      const metric = runAll(newI, { ...ctx, u: 'kg' });
      check('insights on ' + label + ': metric differs, and says kg not lb',
            metric !== before && !/ lb\b/.test(metric) && /\bkg\b/.test(metric),
            (metric.match(/[^"]* lb\b[^"]*/) || [''])[0].slice(0, 80));
    });

    // analytics: sessionMilestones is the whole of its printed output.
    const prior = sessions.slice(0, 4), rec = sessions[5];
    check('sessionMilestones: identical to ' + BASE + ' with units absent',
          JSON.stringify(newA.sessionMilestones(rec, prior)) ===
          JSON.stringify(oldA.sessionMilestones(rec, prior)));
    check('sessionMilestones: identical to ' + BASE + ' with units = lb',
          JSON.stringify(newA.sessionMilestones(rec, prior, 'lb')) ===
          JSON.stringify(oldA.sessionMilestones(rec, prior)));
    check('sessionMilestones: metric says kg',
          /\bkg\b/.test(JSON.stringify(newA.sessionMilestones(rec, prior, 'kg'))));

    // detectPRs deliberately changed shape: `unit` is gone (nothing read it)
    // and the e1RM set travels as `set` so a screen can print it in either
    // unit. Everything a screen actually shows has to be unchanged.
    const oldPRs = oldA.detectPRs(rec, prior).prs;
    const newPRs = newA.detectPRs(rec, prior).prs;
    check('detectPRs: same records, same values, same order',
          JSON.stringify(oldPRs.map(p => [p.kind, p.exId, p.value, p.prev, p.delta])) ===
          JSON.stringify(newPRs.map(p => [p.kind, p.exId, p.value, p.prev, p.delta])));
    check('detectPRs: prDetail on lb prints exactly the old `detail` string',
          newPRs.every((p, i) => newA.prDetail(p, 'lb') === oldPRs[i].detail),
          JSON.stringify(newPRs.map(p => newA.prDetail(p, 'lb'))) + ' vs ' +
          JSON.stringify(oldPRs.map(p => p.detail)));
    check('detectPRs: the dead `unit: "lb"` field is gone from every record',
          newPRs.every(p => !('unit' in p)));
    const oldTL = oldA.prTimeline(sessions), newTL = newA.prTimeline(sessions);
    check('prTimeline: same records, and prDetail on lb prints the old detail',
          oldTL.length === newTL.length &&
          newTL.every((p, i) => newA.prDetail(p, 'lb') === oldTL[i].detail &&
                                p.value === oldTL[i].value && p.date === oldTL[i].date));
  }
}

function diffOf(a, b) {
  if (a === b) return '';
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return '...' + a.slice(Math.max(0, i - 40), i + 40) + '  |||  ' + b.slice(Math.max(0, i - 40), i + 40);
  }
  return '';
}

/* ================= H. THE SITES ================= */
section('H. sites — the unit reaches the screen, and reaches it once');
{
  const S = f => src(f);
  check('store.js exposes the unit synchronously, with an imperial default',
        S('store.js').includes('let UNITS = normUnits(null);') &&
        S('store.js').includes('export function wu() { return UNITS.weight; }') &&
        S('store.js').includes('export function hu() { return UNITS.height; }'));
  const APP = S('app.js');
  check('app.js reads the unit before setup, before You and before the four tabs',
        APP.includes('await initUnits();') &&
        APP.indexOf('await initUnits();') < APP.indexOf('runSetup(user)') &&
        APP.indexOf('await initUnits();') < APP.indexOf('initYou({') &&
        APP.indexOf('await initUnits();') < APP.indexOf('await initWorkout()'));
  check('setUnits sets the cache BEFORE it writes, so an offline change still paints',
        /UNITS = normUnits\(next\);\s*\n\s*await write\('settings\/units', UNITS\);/.test(S('store.js')));
  check('settings/units is in the rules copy, with both values enumerated',
        S('database.rules.json').includes('"units"') &&
        S('database.rules.json').includes("newData.val() === 'lb' || newData.val() === 'kg'") &&
        S('database.rules.json').includes("newData.val() === 'in' || newData.val() === 'cm'"));
  check('the units setting never writes settings/water',
        !/setUnits[\s\S]{0,400}settings\/water/.test(S('settings.js')));
  check('setup asks for units BEFORE height and weight',
        /const steps = \[welcome, unitsStep, aboutYou, weighIn,/.test(S('onboarding.js')));
  check('setup defaults water to ml on metric and leaves it alone afterwards',
        S('onboarding.js').includes("unit: a.units === 'kg' ? 'ml' : 'floz',"));
  check('Settings has one Units control, in the You section, as a segmented',
        /unitsRow[\s\S]{0,400}segmented\(\s*\n?\s*\[\['lb', 'Imperial'\], \['kg', 'Metric'\]\]/.test(S('settings.js')) &&
        S('settings.js').indexOf("const unitsRow") > S('settings.js').indexOf("const you = section(sh, 'You')") &&
        S('settings.js').indexOf("const unitsRow") < S('settings.js').indexOf("const fuel = rowList"));
  check('changing units repaints the screen behind the sheet, with no reload',
        /await setUnits\([\s\S]{0,300}if \(onEdit\) onEdit\(\);/.test(S('settings.js')) &&
        !/setUnits[\s\S]{0,300}location\.reload/.test(S('settings.js')));
  // A pound word baked into a rendered string is the failure this whole ship is
  // about. Comments are stripped first and then every string LITERAL is looked
  // at on its own — `'lb'` exactly is a unit value and always fine; anything
  // longer that contains the word is text somebody will read, and there are
  // exactly two of those left, both deliberate and both named here.
  const ALLOWED = new Set([
    'Per side · lb plates',              // the plates really are pounds — BACKLOG.md
    'Imperial — lb and ft/in'            // the label of the imperial option itself
  ]);
  const stripComments = t => t
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  const LITERAL = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g;
  const strays = [];
  ['weight.js', 'you.js', 'stats.js', 'insights.js', 'analytics.js', 'workout.js',
   'routines.js', 'food.js', 'importer.js', 'settings.js', 'onboarding.js', 'water.js',
   'tdee.js', 'ui.js'].forEach(f => {
    (stripComments(S(f)).match(LITERAL) || []).forEach(lit => {
      const body = lit.slice(1, -1);
      if (body === 'lb' || body === 'kg' || body === 'in' || body === 'cm') return;
      if (ALLOWED.has(body)) return;
      if (/\blbs?\b/.test(body)) strays.push(f + ': ' + lit.slice(0, 80));
    });
  });
  check('no app file hard-codes a pound word into a rendered string', strays.length === 0, strays.join(' | '));
  check('plate math is still pounds and says so on kilos',
        S('workout.js').includes("u === 'lb' ? 'Per side' : 'Per side · lb plates'"));
}

/* ================= I. BW, AND ONLY WHERE IT IS SAFE ================= */
section('I. a recorded set with no load reads BW — on a screen, never in a box');
{
  // fmtSetLoad is fmtSetW plus exactly one case, so this is two questions:
  // did the one case fire, and did nothing else move.
  const BLANKS = ['', null, undefined];
  check('a blank stays blank in both units — an unfilled set is not a BW set',
        BLANKS.every(v => U.fmtSetLoad(v, 'lb') === '' && U.fmtSetLoad(v, 'kg') === ''),
        JSON.stringify(BLANKS.map(v => U.fmtSetLoad(v, 'kg'))));

  const ZEROS = ['0', 0, '0.0', '00', '0.00', '-0'];
  check('every way a zero can arrive reads BW, in both units',
        ZEROS.every(v => U.fmtSetLoad(v, 'lb') === 'BW' && U.fmtSetLoad(v, 'kg') === 'BW'),
        JSON.stringify(ZEROS.map(v => U.fmtSetLoad(v, 'lb'))));
  check("v40 stores the STRING '0', which is the case this whole function exists for",
        U.fmtSetLoad('0', 'lb') === 'BW' && U.fmtSetLoad('0', 'kg') === 'BW');

  const LOADS = ['1', '2.5', '45', '135', '225', '227.5', '227.55', 45, 0.5, 5000];
  check('every other load is fmtSetW character for character, on lb and on kg',
        LOADS.every(v => U.fmtSetLoad(v, 'lb') === U.fmtSetW(v, 'lb') &&
                         U.fmtSetLoad(v, 'kg') === U.fmtSetW(v, 'kg')),
        JSON.stringify(LOADS.filter(v => U.fmtSetLoad(v, 'kg') !== U.fmtSetW(v, 'kg'))));
  check('BW is decided on the stored POUNDS, not on the formatted string — a real ' +
        '0.1 lb load that rounds to "0" on kilos is still not bodyweight',
        U.fmtSetW('0.1', 'kg') === '0' && U.fmtSetLoad('0.1', 'kg') === '0',
        U.fmtSetLoad('0.1', 'kg'));
  check('rubbish is not laundered into BW — it comes out of fmtSetW unchanged',
        U.fmtSetLoad(NaN, 'lb') === U.fmtSetW(NaN, 'lb') &&
        U.fmtSetLoad('abc', 'lb') === U.fmtSetW('abc', 'lb'),
        U.fmtSetLoad('abc', 'lb'));
  check('no unit word is baked in — "BW lb" is nonsense and cannot be built here',
        !/lb|kg/.test(U.fmtSetLoad('0', 'lb') + U.fmtSetLoad('0', 'kg')));

  // THE SPLIT, scanned rather than trusted. An <input type=number> handed "BW"
  // drops its value, setW() reads back '' on Save and the set stops being
  // recorded as a zero — the exact defect v40 closed. So nothing that writes
  // into a box may call fmtSetLoad.
  const APPJS = readdirSync(ROOT).filter(f => f.endsWith('.js') && f !== 'units.js');
  const intoBox = [];
  APPJS.forEach(f => {
    src(f).split('\n').forEach((line, i) => {
      if (/fmtSetLoad\s*\(/.test(line) && /\.(value|placeholder|defaultValue)\s*=[^=]/.test(line))
        intoBox.push(f + ':' + (i + 1) + ' ' + line.trim().slice(0, 80));
    });
  });
  check('no input value, placeholder or defaultValue is built with fmtSetLoad',
        intoBox.length === 0, intoBox.join(' | '));

  // And the other direction: every call site is classified, so adding one
  // without deciding which of the two it is trips this rather than shipping.
  const calls = (f, name) => (src(f).match(new RegExp(name + '\\s*\\(', 'g')) || []).length;
  // coach-build.js is the workout builder's sheet line — "3 × 8 at 185 lb" —
  // which is a sentence, never a box. coach-live.js is the in-session read's
  // quote of the last time a suggested exercise was logged, the same kind of
  // sentence.
  const DISPLAY = { 'workout.js': 4, 'stats.js': 2, 'you.js': 1, 'analytics.js': 1, 'coach-build.js': 1,
                    'coach-live.js': 1 };
  const BOXES   = { 'workout.js': 2, 'routines.js': 3 };
  const wrong = [];
  APPJS.forEach(f => {
    const d = calls(f, 'fmtSetLoad'), b = calls(f, 'fmtSetW');
    if (d !== (DISPLAY[f] || 0)) wrong.push(f + ' has ' + d + ' fmtSetLoad calls, expected ' + (DISPLAY[f] || 0));
    if (b !== (BOXES[f] || 0))   wrong.push(f + ' has ' + b + ' fmtSetW calls, expected ' + (BOXES[f] || 0));
  });
  check('10 display sites on fmtSetLoad, 5 box sites on fmtSetW, and nothing unclassified',
        wrong.length === 0, wrong.join(' | ') +
        ' — a new call site is not a bug, but it has to be added here as display or as box');

  // The five that stay: two are the session weight box and its routine-target
  // placeholder, and three are the routine editor, where `tw` is a plan rather
  // than a record and a blank one already prints as nothing at all.
  check('the weight box on a re-opened session still prefills with fmtSetW',
        src('workout.js').includes('w.value = fmtSetW(s.w, u);'));
  check('the routine editor still writes fmtSetW into its box, both ways',
        src('routines.js').includes("w.value = s.tw != null ? fmtSetW(s.tw, u) : '';") &&
        src('routines.js').includes('e.target.value = fmtSetW(s.tw, u);'));
}

/* ---------- report ---------- */
console.log('\nlb/kg and in/cm — convert at the edges, never in storage\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
