#!/usr/bin/env node
/* r3-tokens — Pnat round-3 coverage reviewer's scratch tool.
 * For every call site the v1 proof never draws, the engine swapped one token
 * for another: this checks, in the engine's own T (build(V1), the booted
 * default), that each new token answers exactly what build 58's did.
 *   node r3-tokens.mjs <engineTree> <baseTree>
 */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const [ENG, BASE] = process.argv.slice(2);
const R = await import(pathToFileURL(join(ENG, 'tools/lib/rn-render.mjs')).href);
const T = R.load('src/ui/theme.js').default;
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x));
let bad = 0;
const eq = (label, a, b) => {
  const ok = canon(a) === canon(b);
  if (!ok) bad++;
  console.log((ok ? 'same ' : 'DIFF ') + label + '  ' + canon(a) + (ok ? '' : '  vs build 58  ' + canon(b)));
};
const c = T.colors;
// colour swaps at undrawn sites
eq('colors.accent == pYellow (steps StreakCard, goal chip, NudgeLine, SaveCheck)', c.accent, c.pYellow);
eq('colors.focus == pYellow (goal LiftTarget open)', c.focus, c.pYellow);
eq('colors.well == rack (goal chip off, SaveCheck off)', c.well, c.rack);
eq('colors.raised == collar (goal chip on, AndroidPane, steps streak)', c.raised, c.collar);
eq('colors.done == pGreen (LiftingBlock tick)', c.done, c.pGreen);
eq('colors.onDone == onGreen', c.onDone, c.onGreen);
eq('colors.onAccent == onYellow (SaveCheck tick)', c.onAccent, c.onYellow);
eq('colors.grip == knurl (trajectory dot)', c.grip, c.knurl);
eq('colors.track == collar', c.track, c.collar);
eq('colors.faint == knurl', c.faint, c.knurl);
eq('colors.danger == pRed', c.danger, c.pRed);
eq('colors.onDanger == white', c.onDanger, c.white);
eq('colors.onWarn == onYellow', c.onWarn, c.onYellow);
eq('colors.knockout == rack', c.knockout, c.rack);
eq('colors.inverse == chalk', c.inverse, c.chalk);
eq('colors.calMark == chalk', c.calMark, c.chalk);
eq('colors.accentPressed == pYellowPressed', c.accentPressed, c.pYellowPressed);
for (const a of [0.03, 0.07, 0.08, 0.12, 0.14, 0.16, 0.18, 0.2, 0.25, 0.28, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6])
  eq('alpha.accent(' + a + ') == alpha.yellow', T.alpha.accent(a), T.alpha.yellow(a));
for (const a of [0.08, 0.12, 0.16, 0.18, 0.35]) eq('alpha.danger(' + a + ') == alpha.red', T.alpha.danger(a), T.alpha.red(a));
eq('systemFace is null (spreads nothing)', T.systemFace, null);
eq('pickerTheme is null', T.pickerTheme, null);
eq('tint.trajGood', T.tint.trajGood, 'rgba(42,168,92,0.18)');
eq('tint.trajBad', T.tint.trajBad, 'rgba(214,37,43,0.18)');
eq('tint.trajWarn', T.tint.trajWarn, 'rgba(240,190,30,0.18)');
// T.fit.type vs T.type, over a grid (GoalChip draws T.fit.type)
let fitSame = 0, fitDiff = [];
for (const size of [9, 10, 11, 11.5, 12, 13, 14, 15, 16, 20, 28])
  for (const wdth of [undefined, 78, 88, 92, 100, 108, 112, 118])
    for (const wght of [undefined, 400, 500, 600, 650, 700, 750, 800, 900])
      for (const lh of [undefined, 0.95, 1, 1.2, 1.45])
        for (const color of [undefined, c.chalk, c.steel])
          for (const extra of [{}, { upper: 1, ls: 0.1 }, { tnum: 1 }]) {
            const args = { size, wdth, wght, lh, color, ...extra };
            Object.keys(args).forEach(k => args[k] === undefined && delete args[k]);
            if (canon(T.fit.type(args)) === canon(T.type(args))) fitSame++; else fitDiff.push(canon(args));
          }
console.log((fitDiff.length ? 'DIFF ' : 'same ') + 'T.fit.type(args) == T.type(args) over ' + (fitSame + fitDiff.length) + ' argument sets' + (fitDiff.length ? ': ' + fitDiff.slice(0, 5).join(' ') : ''));
if (fitDiff.length) bad++;
eq('T.fit.face == T.face (a grid)', [78, 92, 100, 118].flatMap(w => [400, 600, 650, 700, 750, 800].map(g => T.fit.face(w, g))),
                                   [78, 92, 100, 118].flatMap(w => [400, 600, 650, 700, 750, 800].map(g => T.face(w, g))));
eq('T.fit.archivo.type == T.type (one)', T.fit.archivo.type({ size: 11, wdth: 92, wght: 600 }), T.type({ size: 11, wdth: 92, wght: 600 }));
eq('T.fit.metrics is null in v1', T.fit.metrics, null);
// admin pill, as build 58's PILL
const PILL58 = { owner: c.good, pro: c.pYellow, custom: c.pYellow, trial: c.warn, locked: c.bad, basic: c.dim };
eq('T.admin.pill == build 58 PILL (own keys)', T.admin.pill, PILL58);
eq('T.admin.pill inherited names answer as a plain object does', ['constructor', 'toString', '__proto__', 'valueOf'].map(k => typeof T.admin.pill[k]),
   ['constructor', 'toString', '__proto__', 'valueOf'].map(k => typeof PILL58[k]));
// subjects: build 58's SUBJECT_COLOR || steel, and C_*
const SC58 = { fuel: c.pYellow, weight: c.pYellow, train: c.pBlue, steps: c.pWhite, water: c.pBlue, all: c.chalk };
const subj = ['fuel', 'weight', 'train', 'steps', 'water', 'all', 'prot', 'carb', 'fat', 'fallback', 'nope', 'constructor', 'toString', '__proto__'];
eq('verdicts subjectColor: T.subject(k) || T.subject(fallback)  vs  SUBJECT_COLOR[k] || steel',
   Object.fromEntries(subj.map(k => [k, String(T.subject(k) || T.subject('fallback'))])),
   Object.fromEntries(subj.map(k => [k, String(SC58[k] || c.steel)])));
eq('C_PROT/C_CARB/C_FAT/C_WEIGHT as T.subject', [T.subject('prot'), T.subject('carb'), T.subject('fat'), T.subject('weight')], [c.pRed, c.pYellow, c.pBlue, c.pYellow]);
// group plates, as exercises.js GROUPS[g].color || dim
const GROUPS58 = Object.fromEntries(Object.entries({ chest: '#D6252B', back: '#2E7FD9', legs: '#F0BE1E', shoulders: '#2AA85C', arms: '#E8E5DE', core: '#A8AEB8' })
  .map(([k, color]) => [k, { color }]));
const gs = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'fallback', 'other', 'full', '', 'constructor', 'toString', '__proto__', 'hasOwnProperty'];
eq('T.groupPlate(g) || dim  vs  (GROUPS[g] || {}).color || dim', gs.map(g => String(T.groupPlate(g) || c.dim)), gs.map(g => String((GROUPS58[g] || {}).color || c.dim)));
console.log('\n' + (bad ? bad + ' DIFFERENT' : 'all the same'));
