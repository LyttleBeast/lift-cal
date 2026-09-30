// rpnavy: Overpass 600's middle dot and space — advance and side bearings,
// to see whether "2025 · 400" sits off-centre because of the glyph.
import opentype from 'opentype.js';
import { readFileSync } from 'node:fs';
for (const f of ['Overpass_600.ttf', 'Overpass_400.ttf']) {
  const b = readFileSync('/Users/micahflunker/dev/vibes-night/wt/nat-p-navy/assets/fonts/Overpass/' + f);
  const font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  for (const ch of ['·', ' ', '4', '5']) {
    const g = font.charToGlyph(ch), bb = g.getBoundingBox();
    console.log(f, JSON.stringify(ch), 'name', g.name, 'adv', g.advanceWidth, 'lsb', bb.x1, 'rsb', g.advanceWidth - bb.x2, 'upm', font.unitsPerEm);
  }
  const k = (a, c) => font.getKerningValue(font.charToGlyph(a), font.charToGlyph(c));
  console.log(f, 'kern space·', k(' ', '·'), '·space', k('·', ' '));
}
