// Re-prove Navy polish r1: does the web's Overpass subset carry U+00B7 (the
// "Member since … · N days" separator), and what are its side bearings
// against the space's advance? Archivo (v1's face) beside it.
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/package.json');
const fontkit = require('fontkit');
const files = [
  '/Users/micahflunker/dev/vibes-night/wt/web-p-navy/vibes/navy/fonts/Overpass-latin.woff2',
  '/Users/micahflunker/dev/vibes-night/tools/fonts/archivo/Archivo-wdth-wght.ttf'
];
const { readFileSync } = require('node:fs');
const wawoff2 = require('wawoff2');
for (const f of files) {
  let buf = readFileSync(f);
  if (f.endsWith('.woff2')) buf = Buffer.from(await wawoff2.decompress(buf));
  let font = fontkit.create(buf);
  if (font.variationAxes && font.variationAxes.wght) font = font.getVariation({ wght: 600, ...(font.variationAxes.wdth ? { wdth: 100 } : {}) });
  const upm = font.unitsPerEm;
  for (const ch of [' ', '·', '4', ',']) {
    const g = font.glyphForCodePoint(ch.codePointAt(0));
    if (!g || g.id === 0) { console.log(f.split('/').pop(), JSON.stringify(ch), 'MISSING'); continue; }
    const bb = g.bbox;
    console.log(f.split('/').pop(), JSON.stringify(ch), 'adv', g.advanceWidth, '/', upm,
      isFinite(bb.minX) ? 'lsb ' + bb.minX + ' rsb ' + (g.advanceWidth - bb.maxX) : '');
  }
}
