// Concept C (iron-age): measure Old Standard TT (Regular, Bold) and Besley v4 against Archivo.
// Read-only on the font files. Kerning off, advances in 1000ths of an em (the coach-view.js convention).
// node iac-fonts.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const opentype = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js/dist/opentype.js');
import { readFileSync } from 'node:fs';

const R = '/Users/micahflunker/dev/vibes-night/research/fonts/';
const A = '/Users/micahflunker/dev/rack-mobile/node_modules/@expo-google-fonts/archivo/';
const files = {
  'OS-Regular': R + 'oldstandardtt/OldStandard-Regular.ttf',
  'OS-Bold': R + 'oldstandardtt/OldStandard-Bold.ttf',
  'Besley-ExtraBold': R + 'besley/upstream/Besley-ExtraBold.ttf',
  'Besley-VF': R + 'besley/upstream/Besley[wdth,wght].ttf',
  'Archivo-400': A + '400Regular/Archivo_400Regular.ttf',
  'Archivo-600': A + '600SemiBold/Archivo_600SemiBold.ttf',
  'Archivo-800': A + '800ExtraBold/Archivo_800ExtraBold.ttf'
};
const load = p => { const b = readFileSync(p); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const F = Object.fromEntries(Object.entries(files).map(([k, p]) => [k, load(p)]));

const CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~’‘“”—–…×·•°';
const TEST = '’—·–…×“”→⚙›✕⋯✓−‹↳↑↓÷±⚠✎▾▴';
const adv = (f, ch) => { const g = f.charToGlyph(ch); return g && g.index ? g.advanceWidth * 1000 / f.unitsPerEm : null; };
const width = (f, s) => [...s].reduce((t, ch) => t + (adv(f, ch) ?? 1000), 0);

for (const [k, f] of Object.entries(F)) {
  const hh = f.tables.hhea, os2 = f.tables.os2, n = f.names;
  const missing = [...TEST].filter(ch => !(f.charToGlyph(ch) && f.charToGlyph(ch).index));
  const missCard = [...CHARS].filter(ch => !(f.charToGlyph(ch) && f.charToGlyph(ch).index));
  const digits = [...'0123456789'].map(d => Math.round(adv(f, d)));
  const gsub = f.tables.gsub ? [...new Set(f.tables.gsub.features.map(x => x.tag))].join(' ') : '(none)';
  const fvar = f.tables.fvar ? f.tables.fvar.axes.map(a => `${a.tag} ${a.minValue}-${a.maxValue} (def ${a.defaultValue})`).join(', ') : 'static';
  console.log(`\n== ${k}`);
  console.log(`  ps name: ${n.postScriptName && n.postScriptName.en}  version: ${n.version && n.version.en}`);
  console.log(`  UPM ${f.unitsPerEm}  hhea asc ${hh.ascender} desc ${hh.descender} gap ${hh.lineGap} -> (asc-desc)/UPM ${((hh.ascender - hh.descender) / f.unitsPerEm).toFixed(3)}`);
  console.log(`  OS/2 sxHeight ${os2.sxHeight} (${(os2.sxHeight / f.unitsPerEm).toFixed(3)} em) capHeight ${os2.sCapHeight}`);
  console.log(`  axes: ${fvar}`);
  console.log(`  default digit advances: ${digits.join(' ')}  ${new Set(digits).size === 1 ? 'TABULAR by default' : 'proportional by default'}`);
  console.log(`  GSUB features: ${gsub}`);
  console.log(`  missing of the test set: ${missing.join(' ') || 'none'}`);
  console.log(`  missing of CARD_FACE.chars: ${missCard.join(' ') || 'none'}`);
}

// Width of Coach-like sentences against Archivo (line = 600, why = 400), kerning off.
const S = [
  'Bench press is up 5 lb since last month. Next time 185 × 5.',
  'Three sessions this week — legs twice, back once.',
  'You are eating about 2,150 kcal against 2,400 maintenance.',
  'Great workout. New best on Incline Dumbbell Bench Press.'
];
console.log('\n== Coach sample widths (sum of advances, 1/1000 em)');
for (const s of S) {
  const a6 = width(F['Archivo-600'], s), a4 = width(F['Archivo-400'], s);
  const ob = width(F['OS-Bold'], s), or = width(F['OS-Regular'], s);
  console.log(`  "${s.slice(0, 40)}…"  OS-Bold/Archivo600 ${(ob / a6).toFixed(3)}  OS-Regular/Archivo400 ${(or / a4).toFixed(3)}  OS-Regular/Archivo600 ${(or / a6).toFixed(3)}`);
}
// Card-table averages: mean advance over the table chars
const mean = (f) => { const v = [...CHARS].map(ch => adv(f, ch) ?? 0); return v.reduce((a, b) => a + b, 0) / v.length; };
console.log(`  mean advance over CARD_FACE.chars: Archivo600 ${mean(F['Archivo-600']).toFixed(0)}  Archivo400 ${mean(F['Archivo-400']).toFixed(0)}  OS-Bold ${mean(F['OS-Bold']).toFixed(0)}  OS-Regular ${mean(F['OS-Regular']).toFixed(0)}`);

// Picker sample 315 in each hero face
console.log('\n== "315" width: ' + ['Besley-ExtraBold', 'Archivo-800', 'OS-Bold'].map(k => `${k} ${width(F[k], '315').toFixed(0)}`).join('  '));
