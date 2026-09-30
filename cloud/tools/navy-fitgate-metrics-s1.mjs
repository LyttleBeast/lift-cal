// Font vertical metrics (navy fit gate, s1): Overpass vs Archivo, and ink bounds of digits.
import opentype from 'opentype.js';
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
for (const f of files) {
  const b = readFileSync(f); const font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const u = font.unitsPerEm, h = font.tables.hhea, o = font.tables.os2;
  let yMax = -1e9, yMin = 1e9;
  for (const ch of '0123456789,.lbABCMWgjpqy›⋯') { const g = font.charToGlyph(ch); const bb = g.getBoundingBox(); if (g.index) { yMax = Math.max(yMax, bb.y2); yMin = Math.min(yMin, bb.y1); } }
  const r = v => (v / u).toFixed(3);
  console.log(f.split('/').pop(), 'upm', u, 'hhea asc/desc/gap', r(h.ascender), r(h.descender), r(h.lineGap), 'typo', r(o.sTypoAscender), r(o.sTypoDescender), r(o.sTypoLineGap), 'win', r(o.usWinAscent), r(o.usWinDescent), 'useTypo', !!(o.fsSelection & 128), 'content(hhea)', r(h.ascender - h.descender), 'ink digits etc', r(yMax), r(yMin));
}
