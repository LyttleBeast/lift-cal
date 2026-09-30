// Iron Age final spec (Phase D): the font facts the spec quotes, measured on the
// files, read-only. Full sha256, hhea metrics, glyph coverage for the strings the
// vibe sets in Besley, text widths at the chosen sizes, and the web woff2 sizes
// of the subsets the spec asks for (latin, wdth pinned at 100 so the web draws
// exactly the native statics' width).
// node ia-final-fonts.mjs
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const opentype = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js');
const subsetFont = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/subset-font');

const R = '/Users/micahflunker/dev/vibes-night/research/fonts/besley/upstream/';
const A = '/Users/micahflunker/dev/vibes-night/design/iron-age/scratch-a/fonts/';
const FILES = {
  var: R + 'Besley[wdth,wght].ttf',
  varItalic: A + 'Besley-Italic[wdth,wght].ttf',
  semibold: A + 'Besley-SemiBold.ttf',
  extrabold: R + 'Besley-ExtraBold.ttf',
  italic: A + 'Besley-Italic.ttf',
  ofl: R + 'OFL.txt'
};
const sha = b => createHash('sha256').update(b).digest('hex');
const buf = {};
for (const [k, f] of Object.entries(FILES)) { buf[k] = readFileSync(f); console.log(k.padEnd(10), buf[k].length, sha(buf[k])); }

const parse = b => opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
const fonts = { semibold: parse(buf.semibold), extrabold: parse(buf.extrabold), italic: parse(buf.italic) };
for (const [k, f] of Object.entries(fonts)) {
  const h = f.tables.hhea, o = f.tables.os2, upm = f.unitsPerEm;
  console.log(k, 'upm', upm, 'hhea', h.ascender, h.descender, h.lineGap, '->', ((h.ascender - h.descender) / upm).toFixed(3),
    'cap', (o.sCapHeight / upm).toFixed(3), 'x', (o.sxHeight / upm).toFixed(3), 'ps', f.names.postScriptName.en);
}
// OFL: any Reserved Font Name?
const oflText = buf.ofl.toString('utf8');
console.log('OFL first line:', oflText.split('\n')[0]);
console.log('OFL mentions "Reserved Font Name":', /Reserved Font Name/.test(oflText), '| a declared RFN line ("with Reserved Font Name"):', /with Reserved Font Name/i.test(oflText));

// Glyph coverage for what Besley may set
const needs = '0123456789,.−≈×%’“”—–… ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\'';
for (const [k, f] of Object.entries(fonts)) {
  const miss = [...needs].filter(c => f.charToGlyphIndex(c) === 0 && c !== ' ');
  console.log(k, 'missing of the needed set:', miss.join('') || 'none', '| arrows ↑↓→ present:', ['↑', '↓', '→'].map(c => f.charToGlyphIndex(c) !== 0).join(','));
}

// Widths (pt) at the spec's sizes, with tnum where figures are set
const width = (f, s, size, feats) => {
  const g = f.stringToGlyphs(s, { features: feats || {} });
  let w = 0; for (const x of g) w += x.advanceWidth;
  return +(w / f.unitsPerEm * size).toFixed(1);
};
const eb = fonts.extrabold, sb = fonts.semibold, it = fonts.italic;
const rows = [
  ['h1 24 ExtraBold', eb, 'September 2026', 24], ['h1 24 ExtraBold', eb, 'Training log', 24], ['h1 24', eb, 'Today', 24],
  ['youGreet 25', eb, 'Good afternoon,', 25], ['youGreet 25', eb, 'Good evening,', 25],
  ['h2 18', eb, 'Where this comes from', 18], ['h2 18', eb, 'Vibes', 18],
  ['h3 18', eb, "How you're doing", 18], ['h3 18', eb, 'Strongest lifts', 18],
  ['eyebrow 15 SemiBold', sb, 'Against last week', 15], ['eyebrow 15 SemiBold', sb, 'Barbell Back Squat', 16],
  ['meta 14 Italic', it, 'Friday, September 25', 14], ['meta 14 Italic', it, 'Member since Aug 21, 2025 · 400 days', 14],
  ['loadNum 40', eb, '1,950', 40], ['loadNum 40', eb, '12,480', 40], ['loadNum 32', eb, '≈ 2,450', 32], ['loadNum 34 water', eb, '128 fl oz', 34],
  ['headline 28', eb, '190.7', 28], ['headline 28', eb, '1,950', 28], ['picker 32', eb, '315', 32]
];
for (const [lbl, f, s, size] of rows) console.log(lbl.padEnd(22), JSON.stringify(s).padEnd(40), width(f, s, size, { tnum: true }));

// Web subsets (woff2). Google's latin range + ≈ (U+2248).
const ranges = [[0x20, 0x7e], [0xa0, 0xff], [0x131, 0x131], [0x152, 0x153], [0x2bb, 0x2bc], [0x2c6, 0x2c6], [0x2da, 0x2da], [0x2dc, 0x2dc],
  [0x304, 0x304], [0x308, 0x308], [0x329, 0x329], [0x2000, 0x206f], [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193],
  [0x2212, 0x2212], [0x2215, 0x2215], [0x2248, 0x2248], [0xfeff, 0xfeff], [0xfffd, 0xfffd]];
let latin = ''; for (const [a, b] of ranges) for (let c = a; c <= b; c++) latin += String.fromCodePoint(c);
const tries = [
  ['roman wght 600-800, wdth pinned 100', buf.var, latin, { wght: { min: 600, max: 800 }, wdth: 100 }],
  ['italic wght pinned 400, wdth pinned 100', buf.varItalic, latin, { wght: 400, wdth: 100 }],
  ['digits: 0-9 , . ≈ at wght 800, wdth 100', buf.var, '0123456789,.≈ ', { wght: 800, wdth: 100 }]
];
let total = 0;
for (const [lbl, b, text, axes] of tries) {
  try {
    const out = await subsetFont(b, text, { targetFormat: 'woff2', variationAxes: axes });
    total += out.length;
    console.log('woff2', lbl.padEnd(44), out.length, 'B', sha(out).slice(0, 16));
  } catch (e) { console.log('woff2', lbl, 'FAILED', e.message); }
}
console.log('web family total', total, 'B =', (total / 1024).toFixed(1), 'KiB (budget 120 KB)');
