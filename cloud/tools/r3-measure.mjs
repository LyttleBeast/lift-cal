// r3-measure.mjs — track 3 research helper: characters per 358pt line for Archivo body text,
// and the widths of a few Rack strings, on the static TTFs native ships (wdth 100).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/package.json');
const opentype = require('opentype.js');
const base = '/Users/micahflunker/dev/rack-mobile/node_modules/@expo-google-fonts/archivo';
const load = p => { const b = readFileSync(p); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const f400 = load(`${base}/400Regular/Archivo_400Regular.ttf`);
const f600 = load(`${base}/600SemiBold/Archivo_600SemiBold.ttf`);
const f800 = load(`${base}/800ExtraBold/Archivo_800ExtraBold.ttf`);
// Sentences Rack already shows (from the v1 You-tab screenshot), used only as a typical-text sample.
const sample = 'On pace: 0.9 lb a week against 1 planned. Averaged over the 7 of the last 7 days you logged food. Dashed is your target, dotted your maintenance.';
const em = f400.getAdvanceWidth(sample, 1, { kerning: true }) / sample.length;
console.log('Archivo 400 average advance per character (em):', em.toFixed(3));
for (const s of [13, 15, 17]) console.log(`  ${s}pt: ${(358 / (em * s)).toFixed(0)} characters per 358pt line`);
const rows = [
  ['Conventional Deadlift', f600, 17], ['Back Squat (High Bar)', f600, 17], ['362 lb', f800, 17],
  ['310 × 5 · Sep 23', f400, 13], ['AGAINST YOUR TARGETS', f600, 10], ['Against your targets', f600, 13],
  ['1,950', f800, 34], ['kcal / day', f400, 15]
];
for (const [t, f, s] of rows) console.log(`  "${t}" @${s}pt: ${(f.getAdvanceWidth(t, s, { kerning: true })).toFixed(1)}pt`);
