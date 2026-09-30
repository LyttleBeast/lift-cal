#!/usr/bin/env node
/* rev1-vals — the v1 values at the call sites no verify-vibe-v1 scene reaches
 * (Pnat adversarial reviewer, coverage lens). Loads build 58's theme.js and the
 * engine's, compiled as rn-render compiles them, and compares each replaced
 * token / table / lookup with what the call site read before — exhaustively
 * over each table's keys plus stray keys, and over wide grids for the functions.
 *
 * usage: node rev1-vals.mjs <base tree> <engine tree>
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';

const [BASE, ENG] = process.argv.slice(2);
const req = createRequire(join(ENG, 'package.json'));
const babel = req('@babel/core');
const JSX_PLUGIN = req.resolve('@babel/plugin-transform-react-jsx');
const CJS_PLUGIN = req.resolve('@babel/plugin-transform-modules-commonjs');
const compile = (code, filename) => babel.transformSync(code, {
  filename, babelrc: false, configFile: false, sourceType: 'module',
  plugins: [[JSX_PLUGIN, { runtime: 'automatic' }], CJS_PLUGIN]
}).code;
const RN = { Platform: { OS: 'ios', select: o => (o.ios !== undefined ? o.ios : o.default) } };
function load(file, cache = new Map()) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = compile(readFileSync(file, 'utf8'), file);
  const r = spec => {
    if (spec === 'react-native') return RN;
    let p = join(dirname(file), spec);
    for (const ext of ['', '.js', '.jsx']) { try { readFileSync(p + ext); p = p + ext; break; } catch {} }
    return load(p, cache);
  };
  new Function('require', 'module', 'exports', code)(r, module, module.exports);
  return module.exports;
}

const B = load(join(BASE, 'src/ui/theme.js')).default;
const Emod = load(join(ENG, 'src/ui/theme.js'));
const E = Emod.default;
/* exercises.js:13-19 and analytics.js:651-655 at 1cb6498, verbatim (both are
   pinned; exercises.js pulls the data layer in, so it is not loaded here). */
const EX = { GROUPS: {
  chest:     { label: 'Chest',     color: '#D6252B', short: 'CH' },
  back:      { label: 'Back',      color: '#2E7FD9', short: 'BK' },
  legs:      { label: 'Legs',      color: '#F0BE1E', short: 'LG' },
  shoulders: { label: 'Shoulders', color: '#2AA85C', short: 'SH' },
  arms:      { label: 'Arms',      color: '#E8E5DE', short: 'AR' },
  core:      { label: 'Core',      color: '#A8AEB8', short: 'CO' }
} };
const PALETTE = {
  chest: '#d6252b', back: '#2e7fd9', legs: '#f0be1e',
  shoulders: '#2aa85c', arms: '#e8e5de', core: '#a8aeb8'
};
const AN = { groupColor: g => PALETTE[g] || '#8d939f' };

let ok = 0, bad = 0;
const rows = [];
const eq = (label, before, after) => {
  const same = JSON.stringify(before) === JSON.stringify(after) && typeof before === typeof after;
  if (same) ok++; else bad++;
  rows.push((same ? '  same  ' : '  DIFF  ') + label + '  before=' + JSON.stringify(before) + '  after=' + JSON.stringify(after));
};
const BC = B.colors, EC = E.colors;

// 1. role colours standing in for build 58's token at each changed call site
const PAIRS = [['accent', 'pYellow'], ['focus', 'pYellow'], ['raised', 'collar'], ['track', 'collar'], ['grip', 'knurl'],
  ['faint', 'knurl'], ['well', 'rack'], ['knockout', 'rack'], ['inverse', 'chalk'], ['done', 'pGreen'], ['onDone', 'onGreen'],
  ['onAccent', 'onYellow'], ['danger', 'pRed'], ['onWarn', 'onYellow'], ['calMark', 'chalk'], ['onDanger', 'white'],
  ['accentPressed', 'pYellowPressed'], ['good', 'pGreen']];
for (const [n, o] of PAIRS) eq('colors.' + n + ' vs build 58 colors.' + o, BC[o], EC[n]);
eq('colors.tileHero vs the literal', '#1e1f1e', EC.tileHero);
eq('colors.tileLit vs the literal', '#17181a', EC.tileLit);
for (const k of Object.keys(BC)) eq('colors.' + k + ' (build 58 key)', BC[k], EC[k]);

// 2. alpha roles over a grid
const AS = [0, 0.03, 0.05, 0.07, 0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.28, 0.3, 0.32, 0.35, 0.38, 0.4, 0.42, 0.45, 0.5, 0.6, 0.75, 0.82, 0.9, 1];
let alphaOk = true;
for (const a of AS) {
  for (const [n, o] of [['accent', 'yellow'], ['danger', 'red'], ['warn', 'yellow'], ['yellow', 'yellow'], ['red', 'red'], ['blue', 'blue'], ['green', 'green'], ['ground', 'ground']]) {
    if (B.alpha[o](a) !== E.alpha[n](a)) { alphaOk = false; eq('alpha.' + n + '(' + a + ') vs alpha.' + o, B.alpha[o](a), E.alpha[n](a)); }
  }
}
eq('alpha.{accent,danger,warn,…}(a) = build 58 alpha.{yellow,red,yellow,…}(a) over ' + AS.length + ' alphas', true, alphaOk);

// 3. tints: build 58's keys and the new ones against the literals they replaced
for (const k of Object.keys(B.tint)) eq('tint.' + k, B.tint[k], E.tint[k]);
eq('tint.trajGood', 'rgba(42,168,92,0.18)', E.tint.trajGood);
eq('tint.trajBad', 'rgba(214,37,43,0.18)', E.tint.trajBad);
eq('tint.trajWarn', 'rgba(240,190,30,0.18)', E.tint.trajWarn);
eq('tint.reviewBg', 'rgba(240,190,30,0.07)', E.tint.reviewBg);
eq('tint.reviewBorder', 'rgba(240,190,30,0.18)', E.tint.reviewBorder);

// 4. groupPlate / group vs exercises GROUPS / analytics groupColor
const STRAY = ['cardio', 'other', 'fallback', '', 'Chest', 'CHEST', undefined, null, 'constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf'];
for (const g of [...Object.keys(EX.GROUPS), ...STRAY]) {
  let before; try { before = (EX.GROUPS[g] || {}).color || BC.dim; } catch (e) { before = '$threw'; }
  let after; try { after = E.groupPlate(g) || EC.dim; } catch (e) { after = '$threw'; }
  eq('groupPlate(' + JSON.stringify(g) + ') || dim', typeof before === 'function' ? '$fn:' + before.name : before, typeof after === 'function' ? '$fn:' + after.name : after);
  let b2; try { b2 = EX.GROUPS[g] ? EX.GROUPS[g].color : '$absent'; } catch { b2 = '$threw'; }
  let a2; try { a2 = E.groupPlate(g); } catch { a2 = '$threw'; }
  if (EX.GROUPS[g] && Object.prototype.hasOwnProperty.call(EX.GROUPS, g)) eq('groupPlate(' + JSON.stringify(g) + ') vs GROUPS[g].color', b2, a2);
  let b3; try { b3 = AN.groupColor(g); } catch { b3 = '$threw'; }
  let a3; try { a3 = E.group(g); } catch { a3 = '$threw'; }
  eq('group(' + JSON.stringify(g) + ') vs groupColor(g)', typeof b3 === 'function' ? '$fn:' + b3.name : b3, typeof a3 === 'function' ? '$fn:' + a3.name : a3);
}

// 5. subjects: bits.jsx SUBJECT_COLOR and C_* at build 58
const SUBJECT_COLOR = { fuel: BC.pYellow, weight: BC.pYellow, train: BC.pBlue, steps: BC.pWhite, water: BC.pBlue, all: BC.chalk };
const C_ = { fuel: BC.pYellow, weight: BC.pYellow, steps: BC.pWhite, water: BC.pBlue, train: BC.pBlue, prot: BC.pRed, carb: BC.pYellow, fat: BC.pBlue };
for (const k of [...Object.keys(SUBJECT_COLOR), 'prot', 'carb', 'fat', 'fallback', 'constructor', undefined, 'unknown']) {
  const before = SUBJECT_COLOR[k] || BC.steel;
  const after = E.subject(k) || E.subject('fallback');
  eq('verdicts subjectColor for subject ' + JSON.stringify(k), typeof before === 'function' ? '$fn' : before, after);
}
for (const k of Object.keys(C_)) eq('C_' + k.toUpperCase() + ' vs T.subject(' + k + ')', C_[k], E.subject(k));

// 6. admin
const PILL = { owner: BC.good, pro: BC.pYellow, custom: BC.pYellow, trial: BC.warn, locked: BC.bad, basic: BC.dim };
for (const t of [...Object.keys(PILL), 'expired', undefined, 'constructor', 'toString']) {
  const before = PILL[t] || BC.dim, after = E.admin.pill[t] || EC.dim;
  eq('TypePill colour for ' + JSON.stringify(t), typeof before === 'function' ? '$fn' : before, typeof after === 'function' ? '$fn' : after);
}
const AI = { aiPhoto: BC.pYellow, aiPhotoText: BC.pRed, aiText: BC.pBlue, aiRecall: BC.pGreen };
for (const k of Object.keys(AI)) eq('admin.aiSplit.' + k, AI[k], E.admin.aiSplit[k]);
[BC.pBlue, BC.pYellow, BC.pGreen, BC.pChrome].forEach((c, i) => eq('admin.families[' + i + ']', c, E.admin.families[i]));
const CONF = { high: BC.good, medium: BC.warn, low: BC.bad };
for (const k of Object.keys(CONF)) eq('conf.' + k, CONF[k], E.conf[k]);

// 7. kpi, plates, mark
eq('kpi(fuel)', B.alpha.yellow(0.14), E.kpi('fuel'));
eq('kpi(weight)', B.alpha.yellow(0.14), E.kpi('weight'));
eq('kpi(train)', B.alpha.blue(0.14), E.kpi('train'));
eq('kpi(steps)', 'rgba(232,229,222,0.14)', E.kpi('steps'));
const PLATES = ['#d6252b', '#2e7fd9', '#f0be1e', '#2aa85c', '#e8e5de', '#a8aeb8'];
PLATES.forEach((c, i) => eq('plate(' + i + ')', c, E.plate(i)));
eq('mark', [BC.pRed, BC.pBlue, BC.pYellow, BC.pGreen, BC.pWhite, BC.pChrome], E.mark);

// 8. chrome, systemFace, pickerTheme, images, variants
eq('systemFace', null, E.systemFace);
eq('({...systemFace, fontSize: 10}) keys', ['fontSize'], Object.keys({ ...E.systemFace, fontSize: 10 }));
eq('pickerTheme', null, E.pickerTheme);
eq('chrome.statusBar', 'light', E.chrome.statusBar);
eq('chrome.keyboard', 'dark', E.chrome.keyboard);
eq('chrome.blurTint', 'dark', E.chrome.blurTint);
eq('chrome.blurIntensity', 40, E.chrome.blurIntensity);
eq('chrome.datePicker', 'dark', E.chrome.datePicker);
eq('chrome.camera', '#000', E.chrome.camera);
eq('chrome.shadow', '#000', E.chrome.shadow);
for (const s of Emod.HERO_SLOTS) eq('image(' + s + ')', null, E.image(s));
eq('images', {}, E.images);
eq('every variant is v1', true, Object.values(E.variant).every(v => v === 'v1'));
eq('banner', { devText: '#fff', guardText: '#fff', guardNote: '#fff' }, E.banner);

// 9. cardSkin vs the hand-rolled skins it replaced (key order too)
const skin = r => ({ backgroundColor: BC.bar, borderWidth: 1, borderColor: BC.collar, borderRadius: B.radius[r] });
eq('cardSkin()', skin('r'), E.cardSkin());
eq('cardSkin() key order', Object.keys(skin('r')), Object.keys(E.cardSkin()));
eq('cardSkin({radius:sm})', skin('sm'), E.cardSkin({ radius: 'sm' }));
eq('cardSkin({radius:pill})', skin('pill'), E.cardSkin({ radius: 'pill' }));

// 10. fit: metrics null, fit.type / fit.archivo = type / face
eq('fit.metrics', null, E.fit.metrics);
let fitOk = true, n = 0;
const WD = [undefined, 50, 78, 84, 88, 92, 94, 100, 104, 108, 112, 118, 125, 150];
const WG = [undefined, null, 0, 100, 150, 200, 250, 300, 350, 400, 449, 450, 500, 550, 551, 600, 649, 650, 651, 700, 749, 750, 751, 800, 850, 900, 950, 1000, '650', '750'];
for (const w of WD) for (const g of WG) {
  n++;
  const b = B.face(w, g);
  for (const [nm, f] of [['face', E.face], ['fit.face', E.fit.face], ['fit.archivo.face', E.fit.archivo.face]]) {
    if (f(w, g) !== b) { fitOk = false; eq(nm + '(' + w + ',' + g + ')', b, f(w, g)); }
  }
}
eq('face / fit.face / fit.archivo.face = build 58 face over ' + n + ' wdth×wght pairs', true, fitOk);
let typeOk = true; n = 0;
const SIZES = [8.5, 9, 10, 11, 11.5, 12, 13, 13.5, 14, 14.5, 15, 16, 17, 18, 20, 21, 22, 26, 27, 28, 32, 34, 40];
const LHS = [undefined, 0.95, 1, 1.05, 1.2, 1.3, 1.35, 1.4, 1.45, 1.5];
for (const size of SIZES) for (const lh of LHS) for (const wg of [400, 600, 650, 700, 750, 800]) for (const color of [undefined, null, '', '#010203', BC.chalk]) {
  for (const extra of [{}, { upper: 1, tnum: 1, ls: 0.16 }, { ls: -0.02, wdth: 118 }]) {
    n++;
    const args = { size, lh, wght: wg, color, ...extra };
    const b = JSON.stringify(B.type(args)), kb = Object.keys(B.type(args)).join();
    for (const [nm, f] of [['type', E.type], ['fit.type', E.fit.type], ['fit.archivo.type', E.fit.archivo.type]]) {
      const r = f(args);
      if (JSON.stringify(r) !== b || Object.keys(r).join() !== kb) { typeOk = false; if (bad < 40) eq(nm + JSON.stringify(args), JSON.parse(b), r); }
    }
  }
}
eq('type / fit.type / fit.archivo.type = build 58 type (values and key order) over ' + n + ' argument sets', true, typeOk);
let lnOk = true;
for (let s = 1; s <= 120; s += 0.5) if (JSON.stringify(B.loadNum(s)) !== JSON.stringify(E.loadNum(s))) { lnOk = false; eq('loadNum(' + s + ')', B.loadNum(s), E.loadNum(s)); }
eq('loadNum over 1..120 by 0.5', true, lnOk);
for (const k of Object.keys(B.text)) {
  eq('text.' + k + ' key order', Object.keys(B.text[k]), Object.keys(E.text[k]));
}
let layOk = true;
for (const top of [0, 20, 24, 44, 47, 48, 50, 59, 62]) for (const bottom of [0, 20, 34]) {
  const i = { top, bottom, left: 0, right: 0 };
  for (const k of ['appTop', 'appBottom', 'dockHeight', 'sheetPadBottom', 'syncPipTop']) if (B.layout[k](i) !== E.layout[k](i)) { layOk = false; eq('layout.' + k, B.layout[k](i), E.layout[k](i)); }
  for (const x of [0, 10, 12, 14, 16, 20]) if (B.layout.aboveDock(i, x) !== E.layout.aboveDock(i, x)) layOk = false;
  for (const h of [568, 667, 736, 812, 844, 852, 896, 926, 932]) for (const t of [true, false, undefined]) if (B.layout.sheetMaxH(h, i, t) !== E.layout.sheetMaxH(h, i, t)) layOk = false;
}
eq('layout functions over 27 insets × window heights', true, layOk);

console.log(rows.filter(r => r.startsWith('  DIFF')).join('\n') || '(no differences)');
console.log('\n' + ok + ' same, ' + bad + ' different');
console.log(rows.join('\n'));
