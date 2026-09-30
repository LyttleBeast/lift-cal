// Track 5: how tall do the glyphs Rack actually draws really get? (for native minLh per family)
// Draws each glyph with HarfBuzz at the given axis values and takes the bbox of all outline points
// (control points included, so the box is conservative: never smaller than the ink).
// Usage: node t5-extents.mjs <font> [wght]    -> JSON per font
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const hb = await require('/Users/micahflunker/dev/vibes-night/tools/node_modules/harfbuzzjs');
const [src, w = '800'] = process.argv.slice(2);
const buf = readFileSync(src);
const blob = hb.createBlob(buf), face = hb.createFace(blob, 0), font = hb.createFont(face);
const axes = face.getAxisInfos();
if (axes.wght) font.setVariations({ wght: Math.min(axes.wght.max, Math.max(axes.wght.min, +w)) });
const upem = face.upem;
function ext(chars) {
  let lo = Infinity, hi = -Infinity;
  for (const ch of chars) {
    const b = hb.createBuffer(); b.addText(ch); b.guessSegmentProperties(); hb.shape(font, b, '');
    for (const g of b.json()) {
      if (!g.g) continue;
      const nums = font.glyphToPath(g.g).match(/-?\d+(\.\d+)?/g) || [];
      for (let i = 1; i < nums.length; i += 2) { const y = +nums[i]; if (y < lo) lo = y; if (y > hi) hi = y; }
    }
    b.destroy();
  }
  return { top: +(hi / upem).toFixed(3), bottom: +(lo / upem).toFixed(3), ratio: +((hi - lo) / upem).toFixed(3) };
}
let ascii = ''; for (let c = 0x21; c <= 0x7e; c++) ascii += String.fromCharCode(c);
const res = {
  file: src.split('/').slice(-2).join('/'), wght: axes.wght ? +w : 'static',
  asciiPlusRack: ext(ascii + '’“”—–…×·−'), lettersDigits: ext('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'), digitsOnly: ext('0123456789.,−+%'),
};
console.log(JSON.stringify(res));
font.destroy(); face.destroy(); blob.destroy();
