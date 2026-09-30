// Sample a tree's theme far beyond the identity verifier's grid, to JSON.
// Usage: node pnat-rev-sample.mjs <root> <default|defs|defsAfterSwitch> <outfile>
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [root, mode, out] = process.argv.slice(2);
const R = await import(pathToFileURL(join(root, 'tools/lib/rn-render.mjs')).href);
R.restoreConsole();
const TH = R.load('src/ui/theme.js');
let T = TH.default;
if (mode === 'defs') T = TH.build(R.load('src/pure/vibes/defs/v1.js').default);
if (mode === 'defsAfterSwitch') {
  // v1 -> something else -> v1 again through applyTheme, then read T
  const v1 = R.load('src/pure/vibes/defs/v1.js').default;
  const other = JSON.parse(JSON.stringify(v1)); other.id = 'x'; other.colors.chalk = '#010101';
  TH.applyTheme(TH.build(other)); TH.applyTheme(TH.build(v1)); T = TH.default;
}
const canon = v => {
  if (v === undefined) return '"$u"';
  if (typeof v === 'function') return '"$fn"';
  if (typeof v === 'number' && !Number.isFinite(v)) return JSON.stringify(String(v));
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';   // key ORDER kept
};
const call = (f, ...a) => { try { return canon(f(...a)); } catch (e) { return 'THREW ' + (e && e.message); } };
const res = {};
// tables, restricted to build 58's keys, key order kept
const BASEKEYS = {
  colors: ['rack', 'bar', 'collar', 'knurl', 'chalk', 'steel', 'dim', 'pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome', 'good', 'warn', 'bad', 'onYellow', 'onGreen', 'onPlate', 'white', 'pYellowPressed', 'fallback'],
  tint: ['setDone', 'setFlash', 'tagW', 'tagF', 'tagD', 'dropRail', 'dropAdd', 'pickSel', 'block', 'coachBase', 'coachLow', 'coachHigh', 'rowPress', 'pillBase', 'pillUp', 'pillDown', 'pillWarn', 'zoneCut', 'zoneHold', 'zoneGain', 'dockGlass', 'wkBarGlass', 'backdrop']
};
for (const k of ['colors', 'tint']) res[k] = canon(Object.fromEntries(BASEKEYS[k].map(x => [x, T[k][x]])));
for (const k of ['space', 'radius', 'motion', 'text']) res[k] = canon(T[k]);
res.layoutConst = canon(Object.fromEntries(Object.entries(T.layout).filter(([, v]) => typeof v !== 'function')));
res.layoutKeys = canon(Object.keys(T.layout));
res.alphaKeys = canon(Object.keys(T.alpha));
// face
const W = [undefined, null, NaN, -10, 0, 50, 62, 75, 78, 84, 88, 90, 92, 94, 96, 100, 104, 108, 110, 112, 118, 125, 200, '100', '78'];
const G = [undefined, null, NaN, 0, 49, 50, 51, 99, 100, 149, 150, 151, 200, 250, 300, 349, 350, 351, 400, 449, 450, 451, 500, 549, 550, 551, 600, 649, 649.999, 650, 650.001, 651, 700, 749, 750, 751, 800, 849, 850, 851, 900, 950, 1000, '650', '750', '700', -100];
res.face0 = call(T.face);
res.face = W.flatMap(w => G.map(g => canon([w, g]) + '=' + call(T.face, w, g)));
// type
const SIZES = [0, 1, 7.5, 8, 8.5, 9, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 27, 28, 30, 32, 34, 36, 40, 44, 60, 100, undefined, NaN];
const LHS = [undefined, null, 0, 0.5, 0.95, 1, 1.05, 1.088, 1.1, 1.2, 1.3, 1.4, 1.42, 1.45, 1.5, 2];
const COLORS = [undefined, null, '', false, '#123456', 0];
const MISC = [{}, { upper: 1 }, { tnum: 1 }, { upper: true, tnum: true }, { upper: 0, tnum: 0 }, { ls: -0.02 }, { ls: 0.16 }, { wdth: 78, wght: 800 }, { wdth: 118, wght: 750 }, { wght: 650 }];
res.type = [];
for (const size of SIZES) for (const lh of LHS) for (const color of COLORS) for (const m of MISC) {
  const a = { size, ...(lh === undefined ? null : { lh }), ...(color === undefined ? null : { color }), ...m };
  res.type.push(canon(a) + '=' + call(T.type, a));
}
res.type0 = call(T.type, {});
// loadNum
res.loadNum = [];
for (let s = 0; s <= 100; s += 0.5) res.loadNum.push(s + '=' + call(T.loadNum, s));
for (const s of [undefined, null, NaN, '28', -5]) res.loadNum.push(canon(s) + '=' + call(T.loadNum, s));
// alpha (build 58's five helpers)
res.alpha = [];
for (const k of ['yellow', 'red', 'blue', 'green', 'ground']) {
  for (let i = 0; i <= 100; i++) res.alpha.push(k + ' ' + i / 100 + '=' + call(T.alpha[k], i / 100));
  for (const a of [undefined, null, '0.5', 1.5, -1, 0.333333, 1e-7]) res.alpha.push(k + ' ' + canon(a) + '=' + call(T.alpha[k], a));
}
// layout
res.layout = [];
const E = [];
for (let t = 0; t <= 70; t += 1) E.push(t);
E.push(-1, 0.5, 100);
for (const top of E) for (const bottom of [0, 20, 21, 34, 47, 59, 0.5]) {
  const i = { top, bottom, left: 0, right: 0 };
  for (const f of ['appTop', 'appBottom', 'dockHeight', 'sheetPadBottom', 'syncPipTop']) res.layout.push(f + canon(i) + '=' + call(T.layout[f], i));
  for (const x of [-5, 0, 10, 12, 14, 16, 100, undefined]) res.layout.push('aboveDock' + canon([i, x]) + '=' + call(T.layout.aboveDock, i, x));
  for (const h of [0, 400, 568, 667, 700, 812, 844, 852, 874, 926, 932, 956, 1024, 1366]) for (const tall of [true, false, undefined, 1, 0])
    res.layout.push('sheetMaxH' + canon([h, i, tall]) + '=' + call(T.layout.sheetMaxH, h, i, tall));
}
writeFileSync(out, JSON.stringify(res));
console.log(mode, 'face', res.face.length, 'type', res.type.length, 'loadNum', res.loadNum.length, 'alpha', res.alpha.length, 'layout', res.layout.length);
