// Round-3 theme lens: build 58's theme (nat-base) against the engine's default
// export T and build(src/pure/vibes/defs/v1.js), function by function, on
// argument grids far wider than verify-theme-identity samples. Key order,
// NaN, -0 and undefined all count. Read-only: copies each theme.js into a
// scratch dir with Platform stubbed and imports it.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = '/Users/micahflunker/dev/vibes-night/wt/nat-base';
const ENG = '/Users/micahflunker/dev/vibes-night/wt/nat-engine';
const TMP = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r3/grid';
mkdirSync(TMP, { recursive: true });
const OS = process.argv[2] || 'ios';
const stub = `const Platform = { OS: '${OS}', select: o => (o && ('${OS}' in o) ? o['${OS}'] : o && o.default) };`;
const LINE = "import { Platform } from 'react-native';";
const stage = (tree, name) => {
  const src = readFileSync(tree + '/src/ui/theme.js', 'utf8');
  if (!src.includes(LINE)) throw new Error('no Platform import in ' + tree);
  const p = TMP + '/' + name + '-' + OS + '.mjs';
  writeFileSync(p, src.replace(LINE, stub));
  return import(pathToFileURL(p).href);
};
const B = await stage(BASE, 'base');
const E = await stage(ENG, 'eng');
const V1 = (await import(pathToFileURL(ENG + '/src/pure/vibes/defs/v1.js').href)).default;
const tb = B.default;
const te = E.default;
const tv = E.build(V1);
const tvA = E.build(V1, { images: {}, fit: undefined });   // as vibe.js themeOf() calls it

const canon = v => {
  if (v === undefined) return 'undef';
  if (typeof v === 'number') return Object.is(v, -0) ? '-0' : Number.isNaN(v) ? 'NaN' : String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'function') return 'fn';
  if (v === null || typeof v !== 'object') return String(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
};
const run = (f, args) => { try { return canon(f(...args)); } catch (e) { return 'THREW ' + (e && e.constructor && e.constructor.name) + ': ' + (e && e.message); } };

let n = 0;
const diffs = [];
const cmp = (label, f0, fs, args) => {
  const want = run(f0, args);
  for (const [who, f] of fs) {
    n++;
    const got = run(f, args);
    if (got !== want) diffs.push(label + ' ' + who + ' args=' + canon(args) + '\n     base ' + want + '\n     ' + who + ' ' + got);
  }
};
const THREE = (pick) => [['T', pick(te)], ['build(v1)', pick(tv)], ['build(v1,assets)', pick(tvA)]];

// ---- tables (the base's keys; the engine may have more) ----
for (const table of ['colors', 'tint', 'space', 'radius', 'motion']) {
  for (const k of Object.keys(tb[table])) {
    cmp(table + '.' + k, () => tb[table][k], THREE(t => () => t[table][k]), []);
  }
}
for (const k of Object.keys(tb.text)) cmp('text.' + k, () => tb.text[k], THREE(t => () => t.text[k]), []);
cmp('text key order', () => Object.keys(tb.text), THREE(t => () => Object.keys(t.text)), []);
for (const k of Object.keys(tb.layout)) {
  if (typeof tb.layout[k] !== 'function') cmp('layout.' + k, () => tb.layout[k], THREE(t => () => t.layout[k]), []);
}

// ---- odd arguments ----
const odd = [undefined, null, 0, -0, -1, 0.5, 1, 1.5, 2, 10, 100, NaN, Infinity, -Infinity, '', '0', '10', '0.5', 'a', true, false, [], {}, [1], 1e21, 2 ** 31, -(2 ** 31)];

// alpha: every base helper over a dense grid and the odd values
const aGrid = [...Array.from({ length: 1001 }, (_, i) => i / 1000), ...odd, 0.14, 0.16, 0.28, 0.07, 0.45, 0.35, 0.03, 0.38, 0.12, 0.26, 0.1, 0.24, 0.42, 0.22, 0.32, 0.09];
for (const k of Object.keys(tb.alpha)) for (const a of aGrid) cmp('alpha.' + k, tb.alpha[k], THREE(t => t.alpha[k]), [a]);

// layout functions: insets grids, missing fields, strings
const ins = [];
const vals = [0, 20, 24, 34, 44, 47, 48, 50, 54, 59, 62, 0.5, 33.333, -10, 1000, NaN, undefined, null, '10', ''];
for (const top of vals) for (const bottom of vals) ins.push({ top, bottom, left: 0, right: 0 });
ins.push({}, { top: 59 }, { bottom: 34 }, Object.create({ top: 7, bottom: 9 }));
const extras = [0, 8, 10, 12, 14, 16, 18, -5, 2.5, undefined, null, '4', NaN];
const hs = [0, 568, 667, 736, 812, 844, 852, 874, 896, 926, 932, 956, 1366, 480.5, undefined, '800', NaN];
const talls = [undefined, null, 0, 1, true, false, '', 'x', NaN];
for (const k of Object.keys(tb.layout)) {
  if (typeof tb.layout[k] !== 'function') continue;
  const f0 = tb.layout[k];
  if (k === 'aboveDock') { for (const i of ins) for (const x of extras) cmp('layout.' + k, f0, THREE(t => t.layout[k]), [i, x]); }
  else if (k === 'sheetMaxH') { for (const h of hs) for (const i of ins.slice(0, 60)) for (const tl of talls) cmp('layout.' + k, f0, THREE(t => t.layout[k]), [h, i, tl]); }
  else for (const i of ins) cmp('layout.' + k, f0, THREE(t => t.layout[k]), [i]);
}
// the odd insets arguments themselves (not objects)
for (const k of Object.keys(tb.layout)) if (typeof tb.layout[k] === 'function') for (const a of odd) cmp('layout.' + k + ' (odd)', tb.layout[k], THREE(t => t.layout[k]), [a, a, a]);

// face: every wdth of interest x every wght 0..1000, then odd values
const wdths = [undefined, null, 0, 50, 62, 75, 78, 80, 85, 87.5, 88, 90, 92, 94, 96, 100, 104, 108, 110, 112, 115, 118, 120, 125, 150, NaN, '100', 'x'];
for (const w of wdths) for (let g = 0; g <= 1000; g++) cmp('face', tb.face, THREE(t => t.face), [w, g]);
for (const w of wdths) for (const g of [...odd, 649.5, 650.0000001, 749.9, 750, 650, '650', '750', '700', '0650', 1e3, 9e2, 650.5, -650]) cmp('face', tb.face, THREE(t => t.face), [w, g]);
cmp('face()', tb.face, THREE(t => t.face), []);
cmp('face.length', () => tb.face.length, THREE(t => () => t.face.length), []);

// loadNum: sizes 0..200 step 0.25, and odd
for (let s = 0; s <= 200; s += 0.25) cmp('loadNum', tb.loadNum, THREE(t => t.loadNum), [s]);
for (const s of odd) cmp('loadNum', tb.loadNum, THREE(t => t.loadNum), [s]);
cmp('loadNum()', tb.loadNum, THREE(t => t.loadNum), []);

// type: structured products, then a seeded random sweep
const sizes = [undefined, 0, 0.5, 1, 8, 9, 10, 10.5, 11, 11.5, 12, 13, 13.5, 14, 14.5, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 34, 36, 40, 44, 48, 56, 64, 72, 96, NaN, '15', -3];
const lhs = [undefined, null, 0, false, '', 0.9, 0.95, 1, 1.05, 1.088, 1.1, 1.15, 1.2, 1.3, 1.35, 1.4, 1.42, 1.45, 1.5, 1.6, 2, '1.5', NaN, -1];
const wd3 = [undefined, null, 78, 100, 118, NaN];
for (const size of sizes) for (const lh of lhs) for (const wdth of wd3) cmp('type', tb.type, THREE(t => t.type), [{ size, lh, wdth }]);
const colorsA = [undefined, null, '', 0, false, NaN, '#abcdef', 'red', 1, true, {}];
const flags = [undefined, 0, 1, true, false, '', 'x', null, NaN];
const lss = [undefined, null, 0, -0.02, -0.01, 0.02, 0.04, 0.06, 0.07, 0.1, 0.12, 0.14, 0.16, '0.1', NaN];
for (const color of colorsA) for (const upper of flags) for (const tnum of flags) for (const ls of lss)
  cmp('type', tb.type, THREE(t => t.type), [{ size: 13, color, upper, tnum, ls }]);
const wghts = [undefined, null, 100, 300, 400, 500, 600, 650, 700, 750, 800, 900, 450, 550, '700', NaN];
for (const wght of wghts) for (const wdth of wdths) cmp('type', tb.type, THREE(t => t.type), [{ size: 14, wght, wdth }]);
// extra keys, inherited keys, no argument, non-object argument
for (const a of [undefined, null, 0, 'x', [], {}, { size: 12, extra: 1 }, Object.create({ size: 20, color: '#123456', lh: 1.5 }), { __proto__: { wght: 650 }, size: 11 }])
  cmp('type (odd arg)', tb.type, THREE(t => t.type), [a]);
cmp('type()', tb.type, THREE(t => t.type), []);
let seed = 58;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = a => a[Math.floor(rnd() * a.length)];
for (let i = 0; i < 200000; i++) {
  const o = {};
  if (rnd() < 0.95) o.size = pick(sizes);
  if (rnd() < 0.8) o.wdth = pick(wdths);
  if (rnd() < 0.8) o.wght = pick(wghts);
  if (rnd() < 0.6) o.ls = pick(lss);
  if (rnd() < 0.5) o.lh = pick(lhs);
  if (rnd() < 0.6) o.color = pick(colorsA);
  if (rnd() < 0.4) o.upper = pick(flags);
  if (rnd() < 0.4) o.tnum = pick(flags);
  cmp('type (random)', tb.type, THREE(t => t.type), [o]);
}

// T.fit in v1 must be type()/face(): the measured surfaces draw exactly what build 58's type() drew
const fitPairs = [['T.fit.type', te.fit.type], ['T.fit.archivo.type', te.fit.archivo.type], ['build(v1).fit.type', tv.fit.type], ['build(v1).fit.archivo.type', tv.fit.archivo.type]];
seed = 59;
for (let i = 0; i < 50000; i++) {
  const o = { size: pick(sizes), wdth: pick(wdths), wght: pick(wghts), ls: pick(lss), lh: pick(lhs), color: pick(colorsA), upper: pick(flags), tnum: pick(flags) };
  cmp('fit type', tb.type, fitPairs, [o]);
}
const facePairs = [['T.fit.face', te.fit.face], ['T.fit.archivo.face', te.fit.archivo.face], ['build(v1).fit.face', tv.fit.face]];
for (const w of wdths) for (let g = 0; g <= 1000; g += 1) cmp('fit face', tb.face, facePairs, [w, g]);
for (const w of wdths) for (const g of odd) cmp('fit face', tb.face, facePairs, [w, g]);

// T.systemFace and T.pickerTheme spread to nothing in v1
cmp('{...systemFace}', () => ({}), [['T', () => ({ ...te.systemFace })], ['build(v1)', () => ({ ...tv.systemFace })]], []);
cmp('{...pickerTheme}', () => ({}), [['T', () => ({ ...te.pickerTheme })], ['build(v1)', () => ({ ...tv.pickerTheme })]], []);

// the named exports the verifiers load
for (const k of ['colors', 'space', 'radius', 'layout', 'motion']) {
  for (const kk of Object.keys(B[k])) if (typeof B[k][kk] !== 'function') cmp('named ' + k + '.' + kk, () => B[k][kk], [['named', () => E[k][kk]]], []);
}
for (const k of Object.keys(B.text)) cmp('named text.' + k, () => B.text[k], [['named', () => E.text[k]]], []);

// canaries: the comparator must see a one-step change, and a key-order change
const before = diffs.length;
cmp('CANARY face', tb.face, [['bent', (w, g) => tb.face(w, g === 800 ? 700 : g)]], [100, 800]);
cmp('CANARY type order', tb.type, [['reordered', a => { const o = tb.type(a); const { fontSize, ...r } = o; return { ...r, fontSize }; }]], [{ size: 12 }]);
const canaries = diffs.splice(before);
console.log('canaries caught:', canaries.length, 'of 2');
const out = TMP + '/../grid-' + OS + '.log';
writeFileSync(out, 'comparisons ' + n + ', differences ' + diffs.length + '\n' + diffs.slice(0, 400).join('\n') + '\n');
console.log('OS', OS, 'comparisons', n, 'differences', diffs.length, '->', out);
if (diffs.length) console.log(diffs.slice(0, 20).join('\n'));
