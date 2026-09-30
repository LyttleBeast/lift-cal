// A TTF's own line: (hhea ascender - descender + lineGap) / unitsPerEm, and the OS/2 win metrics iOS may use.
import opentype from 'opentype.js';
import { readFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const b = readFileSync(f);
  const font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const h = font.tables.hhea, o = font.tables.os2, u = font.unitsPerEm;
  console.log(f.split('/').slice(-1)[0], 'upm', u, 'hhea', h.ascender, h.descender, h.lineGap, '→', ((h.ascender - h.descender + h.lineGap) / u).toFixed(3),
    'win', o.usWinAscent, o.usWinDescent, '→', ((o.usWinAscent + o.usWinDescent) / u).toFixed(3), 'typo', o.sTypoAscender, o.sTypoDescender, o.sTypoLineGap, 'useTypo', !!(o.fsSelection & 128));
}
