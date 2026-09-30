// Concept C: widths of likely header / hero strings in Besley v4 ExtraBold vs Archivo (native, wdth 100), in pt.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const opentype = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js/dist/opentype.js');
const load = p => { const b = readFileSync(p); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const B = load('/Users/micahflunker/dev/vibes-night/research/fonts/besley/upstream/Besley-ExtraBold.ttf');
const A8 = load('/Users/micahflunker/dev/rack-mobile/node_modules/@expo-google-fonts/archivo/800ExtraBold/Archivo_800ExtraBold.ttf');
const OB = load('/Users/micahflunker/dev/vibes-night/research/fonts/oldstandardtt/OldStandard-Bold.ttf');
const w = (f, s, size) => [...s].reduce((t, ch) => t + (f.charToGlyph(ch).advanceWidth || f.unitsPerEm), 0) / f.unitsPerEm * size;
const tn = (f, s, size) => { // tabular figures: Besley tnum digits are 1320/2000 in ExtraBold (research §0 item 6)
  return [...s].reduce((t, ch) => t + (/[0-9]/.test(ch) && f === B ? 1320 / 2000 : (f.charToGlyph(ch).advanceWidth || f.unitsPerEm) / f.unitsPerEm), 0) * size; };
for (const [s, sizes] of [['September 2026', [24, 26]], ['Wednesday', [24, 26]], ['Good evening,', [26, 27]], ['Micah', [26]], ['2,150', [34, 40]], ['12,480', [26, 34, 40]], ['182.4', [34, 40]], ['315', [40, 48]], ['Workout done', [26]]]) {
  for (const z of sizes) console.log(`${s.padEnd(16)} @${z}: Besley800 ${tn(B, s, z).toFixed(0)} pt | Archivo800 (native, wdth100) ${w(A8, s, z).toFixed(0)} pt | OldStd Bold ${w(OB, s, z).toFixed(0)} pt`);
}
