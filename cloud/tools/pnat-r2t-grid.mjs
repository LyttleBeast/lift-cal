// Pnat round-2 theme lens: build 58's theme.js against the engine's — the
// default export, build(defs/v1.js), and the fitted faces (T.fit.type/face,
// T.fit.archivo.*) — over argument grids far wider than the identity
// verifier's call-site sample. Each file is loaded with react-native's
// Platform stubbed as rn-render stubs it (ios). Writes only under tmp.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const TMP = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r2-theme/grid/';
mkdirSync(TMP, { recursive: true });
const IMPORT = "import { Platform } from 'react-native';";
const STUB = "const Platform = { OS: 'ios', select: o => (o.ios !== undefined ? o.ios : o.default) };";
const stage = (from, to) => {
  const s = readFileSync(from, 'utf8');
  if (s.split(IMPORT).length !== 2) throw new Error('import line not found once in ' + from);
  writeFileSync(TMP + to, s.replace(IMPORT, STUB));
  return pathToFileURL(TMP + to).href;
};
const B = await import(stage('/Users/micahflunker/dev/vibes-night/wt/nat-base/src/ui/theme.js', 'base-theme.mjs'));
const E = await import(stage('/Users/micahflunker/dev/vibes-night/wt/nat-engine/src/ui/theme.js', 'engine-theme.mjs'));
writeFileSync(TMP + 'v1.mjs', readFileSync('/Users/micahflunker/dev/vibes-night/wt/nat-engine/src/pure/vibes/defs/v1.js', 'utf8'));
const V1 = (await import(pathToFileURL(TMP + 'v1.mjs').href)).default;
const TB = B.default, TE = E.default, TD = E.build(V1);

const J = v => { try { return JSON.stringify(v, (k, x) => (typeof x === 'number' && !Number.isFinite(x) ? 'NUM:' + x : x === undefined ? '__undef' : x)); } catch (e) { return 'THREW ' + e.message; } };
const call = (f, args) => { try { return J(f(...args)); } catch (e) { return 'THREW ' + e.message; } };
let n = 0; const bad = [];
const cmp = (label, fb, fe, args) => {
  n++;
  const a = call(fb, args), b = call(fe, args);
  if (a !== b && bad.length < 40) bad.push(label + ' ' + J(args) + ': ' + a + '  vs  ' + b);
  else if (a !== b) bad.push('');
};

/* face */
const WDTH = [undefined, null, NaN, 0, 62, 75, 78, 86, 87.5, 88, 90, 92, 94, 96, 100, 104, 108, 110, 112, 118, 125, 150, '100', -1];
const WGHT = [undefined, null, NaN, -100, -0, '650', '750', '0650', 649.5, 650.0000001, 750, 650, true, false, [650], '', 'x', 1e6, 0.5];
for (let w = 0; w <= 1000; w++) WGHT.push(w);
for (let w = 0; w <= 1000; w += 0.25) WGHT.push(w);
const faces = [['T.face', TE.face], ['build(defs v1).face', TD.face], ['T.fit.face', TE.fit.face], ['T.fit.archivo.face', TE.fit.archivo.face],
               ['build(defs v1).fit.face', TD.fit.face], ['named face', E.face]];
for (const wd of WDTH) for (const wg of WGHT) for (const [lab, f] of faces) cmp(lab, TB.face, f, [wd, wg]);
cmp('T.face()', TB.face, TE.face, []);

/* type */
const types = [['T.type', TE.type], ['build(defs v1).type', TD.type], ['T.fit.type', TE.fit.type], ['T.fit.archivo.type', TE.fit.archivo.type],
               ['named type', E.type]];
const SIZES = [];
for (let s = 0; s <= 80; s += 0.25) SIZES.push(s);
SIZES.push(undefined, null, NaN, -5, 13.53, 27.06, 14.883, 1e3);
const LH = [undefined, null, 0, 0.9, 0.95, 1, 1.05, 1.088, 1.1, 1.2, 1.25, 1.3, 1.35, 1.4, 1.42, 1.45, 1.5, 1.6, 2, '1.45'];
for (const size of SIZES) for (const lh of LH) for (const wdth of [undefined, 78, 118]) for (const [lab, f] of types)
  cmp(lab, TB.type, f, [{ size, lh, wdth }]);
const COLORS = [undefined, null, '', 0, false, '#123456', 'transparent'];
const LS = [undefined, 0, -0.02, 0.06, 0.16, null, '0.1'];
for (const color of COLORS) for (const ls of LS) for (const upper of [undefined, 0, 1, true, 'x']) for (const tnum of [undefined, 0, 1])
  for (const wght of [undefined, 400, 600, 650, 700, 750, 800]) for (const [lab, f] of types)
    cmp(lab, TB.type, f, [{ size: 13, color, ls, upper, tnum, wght, lh: 1.45 }]);
for (const [lab, f] of types) { cmp(lab, TB.type, f, [{}]); cmp(lab, TB.type, f, [{ size: 12, extra: 1, fontFamily: 'X' }]); }

/* loadNum */
for (const [lab, f] of [['T.loadNum', TE.loadNum], ['build(defs v1).loadNum', TD.loadNum], ['named loadNum', E.loadNum]])
  for (let s = -2; s <= 120; s += 0.1) cmp(lab, TB.loadNum, f, [Math.round(s * 10) / 10]);

/* text presets, tint, colors, radius, space, motion */
for (const [lab, T] of [['T', TE], ['build(defs v1)', TD]]) {
  for (const k of Object.keys(TB.text)) cmp(lab + '.text.' + k, () => TB.text[k], () => T.text[k], []);
  cmp(lab + '.text keys', () => Object.keys(TB.text), () => Object.keys(T.text), []);
  for (const k of Object.keys(TB.tint)) cmp(lab + '.tint.' + k, () => TB.tint[k], () => T.tint[k], []);
  for (const k of Object.keys(TB.colors)) cmp(lab + '.colors.' + k, () => TB.colors[k], () => T.colors[k], []);
  cmp(lab + '.radius', () => TB.radius, () => T.radius, []);
  cmp(lab + '.space', () => TB.space, () => T.space, []);
  cmp(lab + '.motion', () => TB.motion, () => T.motion, []);
  /* alpha */
  for (const k of Object.keys(TB.alpha)) for (let a = -0.1; a <= 1.1; a += 0.01) cmp(lab + '.alpha.' + k, TB.alpha[k], T.alpha[k], [Math.round(a * 100) / 100]);
  for (const k of Object.keys(TB.alpha)) for (const a of [undefined, null, '0.5', NaN, 0.123456789]) cmp(lab + '.alpha.' + k, TB.alpha[k], T.alpha[k], [a]);
  /* layout */
  const INS = [];
  for (const top of [0, 20, 24, 44, 47, 48, 50, 54, 59, 62, -3, 0.5, NaN, undefined]) for (const bottom of [0, 20, 21, 34, -1, NaN, undefined])
    INS.push({ top, bottom, left: 0, right: 0 });
  for (const k of Object.keys(TB.layout)) {
    if (typeof TB.layout[k] !== 'function') { cmp(lab + '.layout.' + k, () => TB.layout[k], () => T.layout[k], []); continue; }
    for (const i of INS) for (const extra of [undefined, 0, 10, 12, 14, 16, -4]) for (const h of [0, 568, 667, 693, 812, 844, 926, 932, NaN])
      for (const tall of [undefined, false, true, 0, 1, 'x']) {
        if (k === 'sheetMaxH') cmp(lab + '.layout.' + k, TB.layout[k], T.layout[k], [h, i, tall]);
        else if (k === 'aboveDock') { if (h === 0 && tall === undefined) cmp(lab + '.layout.' + k, TB.layout[k], T.layout[k], [i, extra]); }
        else if (h === 0 && tall === undefined && extra === undefined) cmp(lab + '.layout.' + k, TB.layout[k], T.layout[k], [i]);
      }
  }
  cmp(lab + '.layout keys', () => Object.keys(TB.layout), () => Object.keys(T.layout), []);
}
console.log('comparisons', n, 'differences', bad.length);
for (const x of bad.filter(Boolean).slice(0, 40)) console.log('  ' + x);
