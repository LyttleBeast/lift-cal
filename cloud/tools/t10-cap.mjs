// t10-cap.mjs — track 10 research helper. Reads a TTF's OS/2 cap height, x-height and
// the advance of the digits "315" so the picker can size its sample by cap height.
// Usage: node t10-cap.mjs <font.ttf> [sample]
import { readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const opentype = require('opentype.js');
const [f, sample = '315'] = process.argv.slice(2);
if (!f) {
  const d = '/Users/micahflunker/dev/rack-mobile/node_modules/@expo-google-fonts/archivo';
  if (existsSync(d)) for (const x of readdirSync(d, { recursive: true })) if (/\.ttf$/.test(x)) console.log(d + '/' + x);
  process.exit(0);
}
const font = opentype.loadSync(f);
const upm = font.unitsPerEm, os2 = font.tables.os2;
const adv = font.getAdvanceWidth(sample, upm);
console.log(JSON.stringify({ upm, capHeight: os2.sCapHeight, xHeight: os2.sxHeight,
  capRatio: +(os2.sCapHeight / upm).toFixed(3), sampleAdvanceEm: +(adv / upm).toFixed(3),
  sizeFor24ptCaps: +(24 / (os2.sCapHeight / upm)).toFixed(1) }));
