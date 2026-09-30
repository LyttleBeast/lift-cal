// mdF-fonts.mjs — Meet Day final (Phase D), read-only: the font facts the spec
// quotes. Web/native parity of the figure and head cuts, the files' hashes,
// names, glyph coverage, tnum, and the OFL's Reserved Font Name line.
//   web:    design/meet-day/final/meet-day-archivo-latin.woff2 and
//           meet-day-num.woff2 (built by mdF-webfont.mjs from the pinned
//           google/fonts Archivo[wdth,wght].ttf, tools/fonts/archivo/)
//   native: design/meet-day/scratch-A/*.gstatic.ttf (Google css2 instances,
//           concept A) and their latin subsets *.latin.ttf
// Usage: node mdF-fonts.mjs
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const subsetFont = require('subset-font');
const hb = await require('harfbuzzjs');
const opentype = require('opentype.js');
const sha = b => createHash('sha256').update(b).digest('hex');

const T = '/Users/micahflunker/dev/vibes-night/';
const SRC = readFileSync(T + 'tools/fonts/archivo/Archivo-wdth-wght.ttf');
const NAT = T + 'design/meet-day/scratch-A/';
const WEB = T + 'design/meet-day/final/';

const shape = (buf, text, feats, vars) => {
  const blob = hb.createBlob(buf), face = hb.createFace(blob, 0), font = hb.createFont(face);
  if (vars) font.setVariations(vars);
  const b = hb.createBuffer(); b.addText(text); b.guessSegmentProperties(); hb.shape(font, b, feats);
  const j = b.json();
  b.destroy(); font.destroy(); face.destroy(); blob.destroy();
  return j;
};
const width = (buf, text, feats, vars) => shape(buf, text, feats, vars).reduce((s, g) => s + g.ax, 0);

console.log('== files ==');
for (const f of ['ArchivoExtraCondensed-ExtraBold.gstatic.ttf', 'ArchivoCondensed-Bold.gstatic.ttf',
  'ArchivoExtraCondensed-ExtraBold.latin.ttf', 'ArchivoCondensed-Bold.latin.ttf']) {
  const b = readFileSync(NAT + f);
  const ot = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const n = ot.names;
  const get = k => (n[k] && (n[k].en || Object.values(n[k])[0])) || '';
  console.log(`${f}: ${b.length} B sha256 ${sha(b)}; PS ${get('postScriptName')}; version "${get('version')}"; ` +
    `usWeightClass ${ot.tables.os2.usWeightClass}, usWidthClass ${ot.tables.os2.usWidthClass}; hhea ${ot.tables.hhea.ascender}/${ot.tables.hhea.descender} on ${ot.unitsPerEm}`);
}
for (const f of ['meet-day-archivo-latin.woff2', 'meet-day-num.woff2']) {
  const b = readFileSync(WEB + f);
  console.log(`${f}: ${b.length} B (${(b.length / 1024).toFixed(1)} KiB) sha256 ${sha(b)}`);
}
console.log(`source Archivo[wdth,wght].ttf: ${SRC.length} B sha256 ${sha(SRC)}`);

// The web faces as sfnt, so harfbuzz can shape them (same subsetter, same axes)
const RANGES = [[0x20, 0xff], [0x131, 0x131], [0x152, 0x153], [0x2bb, 0x2bc], [0x2c6, 0x2c6], [0x2da, 0x2da], [0x2dc, 0x2dc],
  [0x304, 0x304], [0x308, 0x308], [0x329, 0x329], [0x2000, 0x206f], [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2190, 0x2193],
  [0x2212, 0x2212], [0x2215, 0x2215], [0x2248, 0x2248], [0x2264, 0x2265], [0xfeff, 0xfeff], [0xfffd, 0xfffd]];
let TEXT = ''; for (const [a, b] of RANGES) for (let c = a; c <= b; c++) TEXT += String.fromCodePoint(c);
const lat = await subsetFont(SRC, TEXT, { targetFormat: 'sfnt', variationAxes: { wdth: { min: 62, max: 100 }, wght: { min: 400, max: 800 } } });
const num = await subsetFont(SRC, '0123456789', { targetFormat: 'sfnt', variationAxes: { wdth: { min: 62, max: 75 }, wght: { min: 700, max: 800 } } });

console.log('\n== parity: the web variable face at the native instance\'s coordinates ==');
const xc = readFileSync(NAT + 'ArchivoExtraCondensed-ExtraBold.latin.ttf');
const cd = readFileSync(NAT + 'ArchivoCondensed-Bold.latin.ttf');
const samples = ['0123456789', '12,480', '1:02:33', '1025.5', '1h 00m', '−0.9', '↓ 2,170', '≈ 2,700', '315',
  'September 2026', 'Good afternoon,', 'Barbell Bench Press', 'Against last week'];
for (const [label, nat, vars] of [['ExtraCondensed-ExtraBold vs web wdth 62 · 800', xc, { wdth: 62, wght: 800 }],
  ['ExtraCondensed-ExtraBold vs web wdth 62.5 · 800', xc, { wdth: 62.5, wght: 800 }],
  ['Condensed-Bold vs web wdth 75 · 700', cd, { wdth: 75, wght: 700 }]]) {
  let same = 0, diff = [];
  for (const s of samples) {
    const a = width(lat, s, 'tnum', vars), b = width(nat, s, 'tnum');
    if (a === b) same++; else diff.push(`${s} web ${a} / native ${b}`);
  }
  console.log(`${label}: ${same}/${samples.length} strings advance identically${diff.length ? '; differ: ' + diff.join('; ') : ''}`);
}
for (const [label, buf, vars] of [['web num @ 62 · 800', num, { wdth: 62, wght: 800 }], ['web latin @ 62 · 800', lat, { wdth: 62, wght: 800 }],
  ['native ExtraCondensed-ExtraBold', xc, null], ['web latin @ 75 · 700', lat, { wdth: 75, wght: 700 }], ['native Condensed-Bold', cd, null]]) {
  const t = shape(buf, '0123456789', 'tnum', vars).map(g => g.ax), p = shape(buf, '0123456789', '', vars).map(g => g.ax);
  console.log(`${label}: tnum ${[...new Set(t)].join('/')} (uniform ${new Set(t).size === 1}); default digits ${p.join(',')}`);
}

console.log('\n== glyph coverage (the signs Rack prints in figures, deltas and heads) ==');
const need = ['−', '→', '←', '↑', '↓', '≈', '±', '×', '·', '…', '‹', '›', '’', '“', '”', '°', '½', '–', '—', '≤', '≥', ' '];
const lacks = ['✓', '✕', '⋯', '↳', '✎', '⚙', '⚠', '▾', '▴'];
for (const [label, buf, vars] of [['web latin', lat, { wdth: 62, wght: 800 }], ['native ExtraCondensed', xc, null], ['native Condensed', cd, null]]) {
  const has = ch => shape(buf, ch, '', vars)[0].g !== 0;
  const miss = need.filter(ch => !has(ch));
  const gap = lacks.filter(ch => has(ch));
  console.log(`${label}: missing of the needed set: ${miss.length ? miss.join(' ') : 'none'}; of v1's gap set ${lacks.join('')} present: ${gap.length ? gap.join(' ') : 'none (same gaps as v1\'s Archivo)'}`);
}

console.log('\n== fit at the spec\'s sizes (tnum; pt = em × size) ==');
const em = (buf, s, vars) => width(buf, s, 'tnum', vars) / 1000;
const fit = [
  ['statVal 24 (a board strip cell)', '1h 00m', 24, { wdth: 62, wght: 800 }],
  ['statVal 24', '12,480', 24, { wdth: 62, wght: 800 }],
  ['statVal 24', '58,340', 24, { wdth: 62, wght: 800 }],
  ['kpiVal 30', '12,480', 30, { wdth: 62, wght: 800 }],
  ['headline 34 (You)', '191.2', 34, { wdth: 62, wght: 800 }],
  ['loadNum 40 (Fuel)', '12,350', 40, { wdth: 62, wght: 800 }],
  ['loadNum 48 (Steps today)', '24,000', 48, { wdth: 62, wght: 800 }],
  ['timer 22', '1:02:33', 22, { wdth: 62, wght: 800 }],
  ['setInput 15 (75 · 700)', '1025.5', 15, { wdth: 75, wght: 700 }],
  ['h1 28 (75 · 700)', 'September 2026', 28, { wdth: 75, wght: 700 }],
  ['youGreet 30 (75 · 700)', 'Good afternoon,', 30, { wdth: 75, wght: 700 }],
  ['picker numPt 35', '315', 35, { wdth: 62, wght: 800 }]
];
for (const [role, s, size, vars] of fit) console.log(`${role}: "${s}" ${(em(lat, s, vars) * size).toFixed(1)}pt`);
// v1's own greeting, for the "wraps no more than v1" claim
console.log(`v1 youGreet 27 (100 · 800): "Good afternoon," ${(em(SRC, 'Good afternoon,', { wdth: 100, wght: 800 }) * 27).toFixed(1)}pt`);
console.log(`v1 statVal 20 (108 · 800): "1h 00m" ${(em(SRC, '1h 00m', { wdth: 108, wght: 800 }) * 20).toFixed(1)}pt`);

console.log('\n== licence ==');
const ofl = readFileSync(T + 'tools/fonts/archivo/OFL.txt', 'utf8').split('\n');
console.log('OFL.txt line 1: ' + ofl[0]);
console.log('Reserved Font Name clause: ' + (/Reserved Font Name/i.test(ofl.slice(0, 4).join(' ')) ? 'PRESENT' : 'none in the copyright header'));
const meta = readFileSync(T + 'tools/fonts/archivo/METADATA.pb', 'utf8');
console.log('METADATA.pb: ' + (meta.match(/license: "[^"]+"/) || ['?'])[0] + ', ' + (meta.match(/commit: "[^"]+"/) || ['?'])[0]);
